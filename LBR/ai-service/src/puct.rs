//! Multiplayer PUCT agent with heuristic priors, a domain-specific leaf
//! evaluator and per-player (multiplayer-aware) value backup.
//!
//! Includes repetition handling (PRD 003 follow-up): a tree-level penalty for
//! revisiting an ancestor state, plus game-history avoidance so the agent does
//! not steer the real game back into a previously seen position. This keeps the
//! agent making progress instead of cycling in degenerate leader loops.
//!
//! PRD refs: 003 §4–§7.

use crate::eval::{self, DomainEvaluator};
use crate::game::{Action, Player, PlayerAction, Rng, TnEGame};
use crate::solver::Lbr;
use minimax::{Game, Strategy};

/// Extra plies the search may run past a depth cap to finish an in-progress
/// turn (PRD-AI-STRENGTH A1). Real turns are a couple of plies plus any
/// conflict/treasure/monument resolution; this is only a pathological-loop
/// safety valve, not a normal horizon.
const TURN_EXTENSION_SLACK: u32 = 32;

/// True while the player who just acted still has moves left this turn (their
/// second action, or pending conflict/treasure/monument resolution). Shared
/// with legacy Negamax so both searches agree on what a turn is.
fn turn_continues(state: &TnEGame) -> bool {
    <Lbr as Game>::same_player_continues(state)
}

/// Search configuration.
#[derive(Clone, Copy, Debug)]
pub struct PuctConfig {
    /// Fixed simulation budget (shared across the whole search).
    pub sims: u32,
    /// Exploration constant `c_puct`.
    pub c_puct: f32,
    /// Prior probability floor so the search can discover moves priors miss.
    pub epsilon: f32,
    /// Rollout length in plies (`0` = evaluate each leaf with a single static
    /// evaluation, i.e. no sampling at all).
    ///
    /// This used to ALSO cap tree depth inside the descent loop, which
    /// confounded "how deep do we sample" with "how deep is the tree" — separate
    /// concerns, and `max_depth` already bounds the tree. Coupled, any A/B on
    /// rollouts would have been uninterpretable.
    pub depth_cap: u32,
    /// Regret-mixing weight for 3–4 players (`0` = pure max-n backup).
    pub regret_lambda: f32,
    /// Optional wall-clock budget; search stops early if exceeded.
    pub max_time_ms: Option<u64>,
    /// Score penalty applied to a child that revisits an ancestor state.
    pub repetition_penalty: f32,
    /// Hard tree-depth cap (plies). Bounds memory even on non-terminating lines.
    pub max_depth: u32,
    /// Keep only the top-K children by prior at each node (large action space).
    pub max_children: usize,
    /// Use one-ply lookahead (raw evaluator) priors instead of the hand-tuned
    /// weights (PRD-AI-STRENGTH C1). `Some(k)` applies them for nodes at depth
    /// `<= k` (root is depth 0); `None` disables. Depth-limiting is essential:
    /// a full-board lookahead at every node is too slow to search with.
    pub shallow_depth: Option<u32>,
    /// Utility squash scale passed to the default domain evaluator (PRD E2).
    pub value_scale: f32,
    /// Leaf-evaluation coefficients. `None` keeps the incumbent
    /// `PlayerState::get_eval` path exactly as it was; `Some(w)` evaluates
    /// leaves with `eval::tuned_value` under `w`, which is what the tuner
    /// searches over.
    pub leaf_weights: Option<crate::eval::LeafWeights>,
}

impl Default for PuctConfig {
    fn default() -> Self {
        PuctConfig {
            sims: 200,
            c_puct: 1.5,
            epsilon: 0.05,
            depth_cap: 0,
            regret_lambda: 0.0,
            max_time_ms: None,
            repetition_penalty: 0.5,
            max_depth: 6,
            max_children: 150,
            shallow_depth: None,
            value_scale: 100.0,
            leaf_weights: None,
        }
    }
}

impl PuctConfig {
    pub fn with_sims(mut self, sims: u32) -> Self {
        self.sims = sims;
        self
    }
    pub fn with_depth_cap(mut self, cap: u32) -> Self {
        self.depth_cap = cap;
        self
    }
    pub fn with_regret_lambda(mut self, lambda: f32) -> Self {
        self.regret_lambda = lambda;
        self
    }
    pub fn with_time_ms(mut self, ms: u64) -> Self {
        self.max_time_ms = Some(ms);
        self
    }
}

/// Per-move search report (PRD A17/A27).
#[derive(Clone, Copy, Debug, Default)]
pub struct SearchReport {
    pub sims: u32,
    pub depth_cap: u32,
    pub max_depth: u32,
    pub cap_hits: u32,
    pub elapsed_ms: u128,
    pub root_value: [f32; 4],
}

/// Root search result handed to move selection.
struct RootInfo {
    actions: Vec<Action>,
    visits: Vec<u32>,
    priors: Vec<f32>,
    q: Vec<f32>,
}

struct Node {
    state: TnEGame,
    actor: Player,
    actions: Vec<Action>,
    priors: Vec<f32>,
    children: Vec<usize>,
    n: Vec<u32>,
    w: Vec<[f32; 4]>,
    total_n: u32,
    value: [f32; 4],
    expanded: bool,
    terminal: bool,
    depth: u32,
    parent: usize,
    hash: u64,
    repetition: bool,
}

const NO_PARENT: usize = usize::MAX;

impl Node {
    fn new(state: TnEGame, actor: Player, depth: u32, parent: usize, hash: u64) -> Self {
        Node {
            state,
            actor,
            actions: Vec::new(),
            priors: Vec::new(),
            children: Vec::new(),
            n: Vec::new(),
            w: Vec::new(),
            total_n: 0,
            value: [0.5; 4],
            expanded: false,
            terminal: false,
            depth,
            parent,
            hash,
            repetition: false,
        }
    }
}

fn state_hash(state: &TnEGame) -> u64 {
    <Lbr as Game>::zobrist_hash(state)
}

/// PUCT search agent.
pub struct Puct {
    config: PuctConfig,
    evaluator: DomainEvaluator,
    rng: Rng,
    report: SearchReport,
    seed: u64,
    /// Hashes of states already reached in the real game (bounded).
    history: Vec<u64>,
}

impl Puct {
    pub fn new(config: PuctConfig, seed: u64) -> Self {
        let mut evaluator = DomainEvaluator::new();
        evaluator.weights.scale = config.value_scale.max(1.0);
        // Without this the tuner's weights are silently dropped and every
        // candidate scores identically to the incumbent.
        if config.leaf_weights.is_some() {
            evaluator.leaf_weights = config.leaf_weights;
        }
        Puct {
            config,
            evaluator,
            rng: Rng::new(seed),
            report: SearchReport::default(),
            seed,
            history: Vec::new(),
        }
    }

    pub fn with_evaluator(mut self, evaluator: DomainEvaluator) -> Self {
        self.evaluator = evaluator;
        self
    }

    pub fn config(&self) -> PuctConfig {
        self.config
    }

    /// Absolute ply ceiling while a turn is still in progress (A1). Normal play
    /// finishes a turn within a couple of plies; this only bounds pathological
    /// lines so a never-ending turn cannot grow the tree without limit.
    fn horizon_ceiling(&self) -> u32 {
        self.config
            .max_depth
            .max(self.config.depth_cap)
            .saturating_add(TURN_EXTENSION_SLACK)
    }

    pub fn report(&self) -> SearchReport {
        self.report
    }

    /// Diagnostic: run the search and return the top root actions by mean value.
    pub fn root_debug(&mut self, state: &TnEGame, top: usize) -> Vec<(Action, u32, f32, f32)> {
        match self.run(state.clone()) {
            Some(info) => {
                let mut idx: Vec<usize> = (0..info.actions.len()).collect();
                idx.sort_by(|&a, &b| {
                    info.q[b]
                        .partial_cmp(&info.q[a])
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
                idx.truncate(top);
                idx.into_iter()
                    .map(|i| (info.actions[i], info.visits[i], info.q[i], info.priors[i]))
                    .collect()
            }
            None => Vec::new(),
        }
    }

    fn terminal(&self, state: &TnEGame) -> bool {
        state.state.is_empty()
    }

    fn leaf_value(&self, state: &TnEGame) -> [f32; 4] {
        if self.terminal(state) {
            DomainEvaluator::terminal_vector(state)
        } else {
            self.evaluator.utility_vector(state)
        }
    }

    fn expand(&mut self, arena: &mut [Node], node_idx: usize) {
        #[cfg(test)]
        EXPANSIONS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        if arena[node_idx].expanded {
            return;
        }
        arena[node_idx].expanded = true;
        if self.terminal(&arena[node_idx].state) {
            arena[node_idx].terminal = true;
            arena[node_idx].value = DomainEvaluator::terminal_vector(&arena[node_idx].state);
            return;
        }
        let mut actions = legal_actions(&arena[node_idx].state);
        if actions.is_empty() {
            arena[node_idx].terminal = true;
            arena[node_idx].value = DomainEvaluator::terminal_vector(&arena[node_idx].state);
            return;
        }
        let use_shallow = matches!(
            self.config.shallow_depth,
            Some(k) if arena[node_idx].depth <= k
        );
        let weights = if use_shallow {
            self.evaluator
                .shallow_prior_weights(&arena[node_idx].state, &actions)
        } else {
            eval::prior_weights(&arena[node_idx].state, &actions, &eval::PriorWeights::default())
        };
        let mut priors = eval::normalize_priors(&weights, self.config.epsilon);

        // Large action space: prune to top-K, but guarantee the best move of
        // *every* action kind survives (otherwise the ~100 tile moves crowd
        // out leaders/treasures/monuments and the agent is crippled).
        let k = self.config.max_children.max(1).min(actions.len());
        if k < actions.len() {
            // Fixed-size best-per-kind table. This was a `HashMap` built fresh
            // on every expansion — an allocation plus hashing per action, for a
            // key space of exactly eleven kinds.
            const KINDS: usize = 11;
            let mut best_by_kind = [usize::MAX; KINDS];
            for i in 0..actions.len() {
                let kind = eval::Factor::from(&actions[i]).kind as usize;
                let cur = best_by_kind[kind];
                if cur == usize::MAX || priors[i] > priors[cur] {
                    best_by_kind[kind] = i;
                }
            }
            let mut chosen: Vec<usize> = best_by_kind
                .iter()
                .filter(|&&v| v != usize::MAX)
                .copied()
                .collect();

            // Keys computed once. The comparator used to rebuild a `Factor`
            // and hash it on *both* sides of every one of ~2000 comparisons.
            let keys: Vec<u32> = actions.iter().map(|a| eval::Factor::from(a).key()).collect();
            let mut order: Vec<usize> = (0..actions.len()).collect();
            order.sort_by(|&a, &b| {
                priors[b]
                    .partial_cmp(&priors[a])
                    .unwrap_or(std::cmp::Ordering::Equal)
                    .then(keys[a].cmp(&keys[b]))
            });
            // Membership via a mask: `chosen.contains(&i)` inside the loop was
            // quadratic in the child count.
            let mut taken = vec![false; actions.len()];
            for &c in &chosen {
                taken[c] = true;
            }
            for i in order {
                if chosen.len() >= k {
                    break;
                }
                if !taken[i] {
                    taken[i] = true;
                    chosen.push(i);
                }
            }
            chosen.sort_unstable();

            let mut new_actions = Vec::with_capacity(chosen.len());
            let mut new_priors = Vec::with_capacity(chosen.len());
            for &i in &chosen {
                new_actions.push(actions[i]);
                new_priors.push(priors[i]);
            }
            actions = new_actions;
            priors = new_priors;
            let s: f32 = priors.iter().sum();
            if s > 0.0 {
                for p in priors.iter_mut() {
                    *p /= s;
                }
            }
        }

        let n_children = actions.len();
        arena[node_idx].actions = actions;
        arena[node_idx].priors = priors;
        arena[node_idx].children = vec![usize::MAX; n_children];
        arena[node_idx].n = vec![0; n_children];
        arena[node_idx].w = vec![[0.0; 4]; n_children];
    }

    fn select_child(&self, arena: &[Node], node_idx: usize) -> usize {
        let node = &arena[node_idx];
        let actor_idx = node.actor.index().unwrap_or(0);
        let sqrt_total = (node.total_n as f32).sqrt();
        let mut best = 0usize;
        let mut best_score = f32::NEG_INFINITY;
        for i in 0..node.actions.len() {
            let n = node.n[i] as f32;
            let mut q = if node.n[i] > 0 {
                node.w[i][actor_idx] / n
            } else {
                node.value[actor_idx]
            };
            // Penalise children that lead back to an ancestor state.
            let child = node.children[i];
            if child != usize::MAX && arena[child].repetition {
                q -= self.config.repetition_penalty;
            }
            let u = self.config.c_puct * node.priors[i] * sqrt_total / (1.0 + n);
            let score = q + u;
            if score > best_score + 1e-6 {
                best_score = score;
                best = i;
            }
        }
        best
    }

    fn simulate(&mut self, arena: &mut Vec<Node>, cap_hits: &mut u32) -> u32 {
        let mut node_idx = 0usize;
        let mut path: Vec<(usize, usize)> = Vec::new();

        loop {
            if arena[node_idx].terminal {
                break;
            }
            if !arena[node_idx].expanded {
                self.expand(arena, node_idx);
                if arena[node_idx].terminal || arena[node_idx].actions.is_empty() {
                    break;
                }
            }

            let slot = self.select_child(arena, node_idx);
            path.push((node_idx, slot));
            let child_idx = arena[node_idx].children[slot];

            if child_idx == usize::MAX {
                let action = arena[node_idx].actions[slot];
                let depth = arena[node_idx].depth + 1;
                let mut child_state = arena[node_idx].state.clone();
                let ok = child_state.process(action).is_ok();
                let actor = if ok {
                    child_state.next_player()
                } else {
                    arena[node_idx].actor
                };
                let hash = if ok { state_hash(&child_state) } else { 0 };
                let parent = node_idx;
                let mut child = Node::new(child_state, actor, depth, parent, hash);
                if !ok {
                    child.terminal = true;
                    child.value = [0.0; 4];
                } else {
                    child.repetition = ancestor_has_hash(arena, node_idx, hash);
                }
                let idx = arena.len();
                arena.push(child);
                arena[node_idx].children[slot] = idx;
                node_idx = idx;
            } else {
                node_idx = child_idx;
            }

            if arena[node_idx].repetition {
                // Treat a repeated state as a dead-end leaf: do not descend.
                break;
            }
            // A1 (PRD-AI-STRENGTH): never cut the horizon mid-turn. A turn is
            // the atomic unit the horizon is measured in: if the player who
            // just acted gets to move again (their second action, or pending
            // conflict/treasure/monument resolution) the depth caps do not
            // apply until the turn ends. `same_player_continues` is the same
            // predicate legacy Negamax uses, so both searches share one
            // definition of a turn.
            if !turn_continues(&arena[node_idx].state) {
                // Hard tree-depth cap: bounds the search tree (and memory) even
                // when a line never reaches a terminal position.
                if arena[node_idx].depth >= self.config.max_depth {
                    break;
                }
            } else if arena[node_idx].depth >= self.horizon_ceiling() {
                // Safety valve: a pathological never-ending turn cannot extend
                // the search without bound.
                break;
            }
        }

        let depth = arena[node_idx].depth;

        let mut value = if arena[node_idx].terminal {
            if arena[node_idx].value == [0.5; 4] {
                let v = DomainEvaluator::terminal_vector(&arena[node_idx].state);
                arena[node_idx].value = v;
            }
            arena[node_idx].value
        } else if arena[node_idx].repetition {
            // Revisiting a state is treated as a dead end for the mover.
            [0.0; 4]
        } else if self.config.depth_cap > 0 {
            *cap_hits += 1;
            let v = self.rollout(arena[node_idx].state.clone());
            arena[node_idx].value = v;
            v
        } else {
            let v = self.leaf_value(&arena[node_idx].state);
            arena[node_idx].value = v;
            v
        };
        if arena[node_idx].repetition {
            value = [0.0; 4];
        }

        if !arena[node_idx].expanded && !arena[node_idx].repetition {
            self.expand(arena, node_idx);
        }

        self.backup(arena, &path, value);
        depth
    }

    fn rollout(&mut self, mut state: TnEGame) -> [f32; 4] {
        let target = self.config.depth_cap.max(1);
        let ceiling = target.saturating_add(TURN_EXTENSION_SLACK);
        let mut plies = 0u32;
        while plies < ceiling {
            if state.state.is_empty() {
                break;
            }
            // A1: only stop at a turn boundary once the target length is met,
            // so the rollout value is never taken mid-turn.
            if plies >= target && !turn_continues(&state) {
                break;
            }
            let actions = legal_actions(&state);
            if actions.is_empty() {
                break;
            }
            let weights = eval::prior_weights(&state, &actions, &eval::PriorWeights::default());
            let total: f32 = weights.iter().sum();
            let r = (self.rng.below(1_000_000) as f32 / 1_000_000.0) * total;
            let mut acc = 0.0;
            let mut pick = actions.len() - 1;
            for (i, w) in weights.iter().enumerate() {
                acc += w;
                if r <= acc {
                    pick = i;
                    break;
                }
            }
            if state.process(actions[pick]).is_err() {
                break;
            }
            plies += 1;
        }
        self.leaf_value(&state)
    }

    fn backup(&mut self, arena: &mut [Node], path: &[(usize, usize)], mut value: [f32; 4]) {
        for &(parent, slot) in path.iter().rev() {
            let actor = arena[parent].actor;
            if self.config.regret_lambda > 0.0 {
                if let Some(ai) = actor.index() {
                    let n = arena[parent].state.num_players as usize;
                    let sum: f32 = value.iter().take(n).sum();
                    if sum > 0.0 {
                        let regret = value[ai] / sum;
                        value[ai] = (1.0 - self.config.regret_lambda) * value[ai]
                            + self.config.regret_lambda * regret;
                    }
                }
            }
            let w = &mut arena[parent].w[slot];
            for k in 0..4 {
                w[k] += value[k];
            }
            arena[parent].n[slot] += 1;
            arena[parent].total_n += 1;
        }
    }

    fn run(&mut self, root: TnEGame) -> Option<RootInfo> {
        let start = std::time::Instant::now();
        self.rng = Rng::new(self.seed); // deterministic fixed-simulation mode
        let actor = root.next_player();
        let root_hash = state_hash(&root);
        let mut arena: Vec<Node> = vec![Node::new(root, actor, 0, NO_PARENT, root_hash)];
        let mut cap_hits = 0u32;
        let mut max_depth = 0u32;

        if arena[0].state.state.is_empty() {
            self.report = SearchReport::default();
            return None;
        }

        let v = self.leaf_value(&arena[0].state);
        arena[0].value = v;
        self.expand(&mut arena, 0);
        if arena[0].actions.is_empty() {
            self.report = SearchReport::default();
            return None;
        }

        for _ in 0..self.config.sims {
            if let Some(limit) = self.config.max_time_ms {
                if start.elapsed().as_millis() as u64 >= limit {
                    break;
                }
            }
            // Defensive: never let the arena grow without bound.
            if arena.len() > 300_000 {
                break;
            }
            let d = self.simulate(&mut arena, &mut cap_hits);
            max_depth = max_depth.max(d);
        }

        self.report = SearchReport {
            sims: arena[0].total_n,
            depth_cap: self.config.depth_cap,
            max_depth,
            cap_hits,
            elapsed_ms: start.elapsed().as_millis(),
            root_value: arena[0].value,
        };

        let actor_idx = arena[0].actor.index().unwrap_or(0);
        let q: Vec<f32> = (0..arena[0].actions.len())
            .map(|i| {
                if arena[0].n[i] > 0 {
                    arena[0].w[i][actor_idx] / arena[0].n[i] as f32
                } else {
                    arena[0].value[actor_idx]
                }
            })
            .collect();

        Some(RootInfo {
            actions: arena[0].actions.clone(),
            visits: arena[0].n.clone(),
            priors: arena[0].priors.clone(),
            q,
        })
    }

    /// Pick the best root child for the *real* game, avoiding states already
    /// seen in this game (repetition avoidance).
    fn pick(&self, info: &RootInfo, state: &TnEGame) -> Option<Action> {
        let n = info.actions.len();
        if n == 0 {
            return None;
        }
        // Robust PUCT move selection: prefer the most-visited child, breaking
        // ties by mean value, prior and factor key. (Selecting by a noisy mean
        // value alone picks lucky low-visit outliers.)
        let mut order: Vec<usize> = (0..n).collect();
        order.sort_by(|&a, &b| {
            info.visits[b]
                .cmp(&info.visits[a])
                .then(
                    info.q[b]
                        .partial_cmp(&info.q[a])
                        .unwrap_or(std::cmp::Ordering::Equal),
                )
                .then(
                    info.priors[b]
                        .partial_cmp(&info.priors[a])
                        .unwrap_or(std::cmp::Ordering::Equal),
                )
                .then(
                    eval::Factor::from(&info.actions[a])
                        .key()
                        .cmp(&eval::Factor::from(&info.actions[b]).key()),
                )
        });

        // First non-repeating candidate.
        for &i in &order {
            let mut child = state.clone();
            if child.process(info.actions[i]).is_err() {
                continue;
            }
            let h = state_hash(&child);
            if !self.history.contains(&h) {
                return Some(info.actions[i]);
            }
        }
        // All repeat: fall back to the best-value action.
        Some(info.actions[order[0]])
    }
}

fn ancestor_has_hash(arena: &[Node], node_idx: usize, hash: u64) -> bool {
    let mut p = node_idx;
    while p != NO_PARENT {
        if arena[p].hash == hash {
            return true;
        }
        p = arena[p].parent;
    }
    false
}

impl Strategy<Lbr> for Puct {
    fn choose_move(
        &mut self,
        state: &<Lbr as Game>::S,
    ) -> Option<<Lbr as Game>::M> {
        if state.state.is_empty() {
            return None;
        }
        let info = self.run(state.clone())?;
        let chosen = self.pick(&info, state);
        // Record the current state in history (bounded).
        let h = state_hash(state);
        self.history.push(h);
        if self.history.len() > 64 {
            self.history.remove(0);
        }
        chosen
    }
}

/// Deterministic legal-action generation for the agent.
pub fn legal_actions(state: &TnEGame) -> Vec<Action> {
    let pa = state.next_action();
    let mut actions = match pa {
        PlayerAction::Normal => {
            let mut v = pa.generate_moves(state);
            let ps = state.players.get(state.next_player());
            for t in [
                crate::game::TileType::Red,
                crate::game::TileType::Black,
                crate::game::TileType::Green,
                crate::game::TileType::Blue,
            ] {
                let have = ps.get_hand(t);
                if have > 0 {
                    v.push(Action::ReplaceTile(eval::tiles_of(t, 1)));
                    if have > 1 {
                        v.push(Action::ReplaceTile(eval::tiles_of(t, have)));
                    }
                }
            }
            v
        }
        other => other.generate_moves(state),
    };
    // Drop candidates the rules engine would reject, so the search never treats
    // an illegal move as a silent no-op.
    //
    // The kingdom count is computed ONCE here. `validate_action` derives it from
    // a full-board flood fill over every leader, and validating ~200 candidate
    // moves one at a time meant ~200 identical board-wide computations per tree
    // expansion — by far the hottest thing in the search.
    let gs = state.next_state();
    if !actions.is_empty() {
        let kingdom_count = state.board.nearby_kingdom_count();
        actions.retain(|a| state.validate_action_with(*a, gs, &kingdom_count).is_ok());
    }
    // `sort_by_key` recomputes the key on every comparison — and the key builds
    // a `Factor` and hashes it. For ~250 actions that is thousands of redundant
    // constructions per node expansion. `sort_by_cached_key` evaluates it once
    // per element.
    actions.sort_by_cached_key(|a| eval::Factor::from(a).key());
    // Deduplicate the ACTIONS, not their sort keys. Deduping on `Factor` keys
    // removes every action that shares a key, and two distinct legal swaps can
    // legitimately share one — that silently deleted most of the swap move set.
    actions.dedup_by(|a, b| a == b);
    actions
}

#[cfg(test)]
static EXPANSIONS: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

#[cfg(test)]
mod bench {
    use super::*;
    use std::time::Instant;

    /// Where a simulation's time actually goes.
    ///
    /// Stands in for a sampling profiler: `perf` needs
    /// `kernel.perf_event_paranoid <= 1` (it is 4 here and not writable) and
    /// valgrind is not installed, so the loop is instrumented directly. Guessing
    /// at this twice already produced two wrong answers.
    #[test]
    #[ignore]
    fn profile_search() {
        let g = crate::maps::MapSpec::default_map().start_game(4, 5);
        let actions = legal_actions(&g);
        let reps = 20000;

        let t = Instant::now();
        let mut a = 0f32;
        for _ in 0..reps {
            a += crate::eval::prior_weights(&g, &actions, &crate::eval::PriorWeights::default())
                .iter()
                .sum::<f32>();
        }
        let d_prior = t.elapsed();
        std::hint::black_box(a);

        let t = Instant::now();
        let mut b = 0f32;
        for _ in 0..reps {
            b += crate::eval::normalize_priors(
                &crate::eval::prior_weights(&g, &actions, &crate::eval::PriorWeights::default()),
                0.05,
            )
            .iter()
            .sum::<f32>();
        }
        let d_norm = t.elapsed();
        std::hint::black_box(b);

        // Whole-move cost, and sims/second.
        for sims in [400u32, 1500] {
            EXPANSIONS.store(0, std::sync::atomic::Ordering::Relaxed);
            let mut p = Puct::new(
                PuctConfig { sims, max_depth: 6, max_children: 150, ..Default::default() },
                7,
            );
            let moves = 12;
            let t = Instant::now();
            for _ in 0..moves {
                let _ = p.choose_move(&g);
            }
            let d = t.elapsed();
            let exp = EXPANSIONS.load(std::sync::atomic::Ordering::Relaxed);
            let per_sim = d.as_secs_f64() * 1e6 / (moves as f64 * sims as f64);
            println!(
                "PROFILE sims={sims}: {:.2} ms/move, {per_sim:.2} us/sim, \
                 {:.2} expansions/sim, {exp} total",
                d.as_secs_f64() * 1e3 / moves as f64,
                exp as f64 / (moves * sims) as f64
            );
        }

        // select_child in isolation, on a synthetic tree.
        let mut p2 = Puct::new(
            PuctConfig { sims: 8, max_depth: 6, max_children: 150, ..Default::default() },
            7,
        );
        let n_nodes = 400usize;
        let n_kids = 150usize;
        let mut arena: Vec<Node> = Vec::with_capacity(n_nodes);
        for i in 0..n_nodes {
            let mut nd = Node::new(g.clone(), Player::Player1, i as u32 / n_kids as u32, NO_PARENT, i as u64);
            nd.actions = vec![Action::Pass; n_kids];
            nd.priors = vec![1.0 / n_kids as f32; n_kids];
            nd.children = vec![usize::MAX; n_kids];
            nd.n = vec![0; n_kids];
            nd.w = vec![[0.0; 4]; n_kids];
            arena.push(nd);
        }
        for i in 0..n_nodes {
            let base = i * n_kids;
            for j in 0..n_kids {
                if base + j + 1 < n_nodes {
                    arena[i].children[j] = base + j + 1;
                }
            }
        }
        let sel_reps = 2_000_000usize;
        let t = Instant::now();
        let mut acc = 0usize;
        for r in 0..sel_reps {
            acc += p2.select_child(&arena, r % n_nodes);
        }
        let d_sel = t.elapsed();
        std::hint::black_box(acc);

        // expand() in isolation
        let exp_reps = 20000usize;
        let t = Instant::now();
        let mut acc = 0usize;
        for _ in 0..exp_reps {
            let mut a2: Vec<Node> = vec![Node::new(g.clone(), g.next_player(), 0, NO_PARENT, 0)];
            p2.expand(&mut a2, 0);
            acc += a2[0].actions.len();
        }
        let d_exp = t.elapsed();
        std::hint::black_box(acc);

        // state_hash in isolation
        let t = Instant::now();
        let mut acc2 = 0u64;
        for _ in 0..exp_reps {
            acc2 = acc2.wrapping_add(state_hash(&g));
        }
        let d_hash = t.elapsed();
        std::hint::black_box(acc2);

        println!("PROFILE expand()           {:>8.2} us", d_exp.as_secs_f64() * 1e6 / exp_reps as f64);
        println!("PROFILE state_hash()       {:>8.2} us", d_hash.as_secs_f64() * 1e6 / exp_reps as f64);

        let per = |d: std::time::Duration| d.as_secs_f64() * 1e6 / reps as f64;
        let per_sel = d_sel.as_secs_f64() * 1e6 / sel_reps as f64;
        println!("PROFILE prior_weights      {:>8.2} us", per(d_prior));
        println!("PROFILE +normalize        {:>8.2} us", per(d_norm));
        println!("PROFILE select_child(150)  {:>8.3} us  x~3 levels = {:.2} us/sim", per_sel, per_sel * 3.0);
    }
}
