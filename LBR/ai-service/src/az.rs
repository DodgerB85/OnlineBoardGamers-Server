//! MCTS-maxⁿ with a learned policy and value.
//!
//! Three things separate this from the hand-tuned PUCT in `puct.rs`, and each is
//! a response to a measured limitation of that search:
//!
//! 1. **Values and priors come from a network**, blended with the hand-written
//!    evaluator by `alpha_value` / `alpha_policy`. The heuristic agent is the
//!    only thing stronger than nothing available at the start, so the blend
//!    makes the first checkpoint at least as strong as its bootstrap and
//!    improves monotonically from there.
//! 2. **The tree survives between moves.** A fresh tree per move throws away
//!    every simulation spent on the part of the position that has not changed.
//! 3. **maxⁿ backup with a per-seat value vector.** Alpha-beta negates on each
//!    seat change, which asserts zero-sum; in a 3–4 player game every seat
//!    maximises its own score, so each seat backs up its own component.
//!
//! Chance (the tile bag) is handled by determinization: the draw is resolved
//! one ply before the player acts, so a node's children are the placements of a
//! tile the mover already holds, and repeated simulations sample different
//! future draws down the tree.

use crate::eval::{self, DomainEvaluator};
use crate::features::{self, ActionSlot, NFEAT};
use crate::game::{Action, Player, Rng, TnEGame};
use crate::nn::{Net, NetOut, Scratch};
use std::time::Instant;

/// Which head of the network feeds the search.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ValueSource {
    /// Graded final-margin estimate.
    Utility,
    /// Probability of finishing first.
    Win,
}


/// Value used for a node that revisits a state already on its own path. Zero for
/// everyone: the mover has wasted the turn.
const REPEAT_VALUE: [f32; 4] = [0.0; 4];

/// Shared with the legacy searches so both agree on what a turn is.
#[inline]
fn turn_continues(state: &TnEGame) -> bool {
    <crate::solver::TigrisAndEuphrates as minimax::Game>::same_player_continues(state)
}

#[derive(Clone, Copy, Debug)]
pub struct AzConfig {
    pub sims: u32,
    /// PUCT exploration constant.
    pub c_puct: f32,
    /// Second-order term; keeps exploring moves the priors rank low. The search
    /// is a sampler of a several-hundred-way move set, and a single `c_puct * P`
    /// term spends its budget on the top few.
    ///
    /// The scale matters more than it looks. This term is `cb * sqrt(P) * N/(n+1)`,
    /// and `N` is the *cumulative* visit count — which, because the tree is reused
    /// between plies, is already in the hundreds when the search starts. At the
    /// old default of 25 000 the first term below was arithmetic dust: every
    /// unvisited child outscored every visited one, so the search went
    /// breadth-first and spent ~48 node expansions per simulation instead of ~1.
    /// 242 µs/sim, versus 50 µs for the old PUCT on a shallower tree.
    pub c_puct_base: f32,
    /// Keep at most this many children per node, chosen by blended prior, with
    /// the best move of every action kind force-included so leaders, treasures,
    /// catastrophes and monument decisions are never crowded out by tile drops.
    pub max_children: usize,
    /// Blend weight on the network policy (1 = pure network).
    pub alpha_policy: f32,
    /// Blend weight on the network value (1 = pure network).
    pub alpha_value: f32,
    /// Dirichlet noise mixed into the root priors, for self-play exploration.
    pub dirichlet_alpha: f32,
    pub dirichlet_eps: f32,
    /// Move-selection temperature: >0 samples from the visit distribution.
    pub temperature: f32,
    /// Hard tree-depth cap. A safety bound, not a horizon — the value network is
    /// meant to be used at any depth, so this should be comfortably beyond the
    /// point where extra depth stops paying.
    pub max_depth: u32,
    pub max_time_ms: Option<u64>,
    /// Floor added to priors so a move the priors dislike can still be found.
    pub epsilon: f32,
    /// Safety valve on the node arena.
    pub max_nodes: usize,
    /// Walk each fresh path all the way to `max_depth` before evaluating it,
    /// instead of evaluating one ply past the newest node.
    pub descend_to_horizon: bool,
    /// Which network head supplies the search value.
    ///
    /// `Utility` is the graded final-margin estimate; `Win` is the probability
    /// of finishing first, which is the objective itself. Measured: `Utility`
    /// had r = 0.72 against the realised margin and played *worse* than no
    /// network at all (3.4 vs 4.1 mean score against the legacy agent), because
    /// an MSE fit to a compressed target shrinks the differences between
    /// sibling positions toward zero and the search stops seeing them.
    pub value_source: ValueSource,
    /// Multiplier on `(value − 0.5)`. A search compares values within one node,
    /// so the contrast between siblings is what matters, and a regression fit
    /// systematically under-states it.
    pub value_gain: f32,
    /// Tunable prior weights for the hand-written heuristic. Override
    /// individual fields via the `--priors` CLI flag.
    pub prior_weights: crate::eval::PriorWeights,
    /// Number of threads to run for the simulate loop within one search.
    /// 1 = original sequential behaviour. >1 splits `sims` across N workers,
    /// each with its own arena clone, and merges visit counts at the end. The
    /// main thread's arena is the one retained for tree reuse across plies;
    /// worker arenas are discarded.
    pub parallel: usize,
    /// Search on a re-dealt copy of the opponents' hands instead of the true
    /// ones, so the agent only uses what a human player could know.
    pub hide_hands: bool,
}

impl Default for AzConfig {
    fn default() -> Self {
        AzConfig {
            sims: 400,
            c_puct: 1.5,
            c_puct_base: 0.0,
            max_children: 48,
            alpha_policy: 0.0,
            alpha_value: 0.0,
            dirichlet_alpha: 0.3,
            dirichlet_eps: 0.25,
            temperature: 0.0,
            max_depth: 12,
            max_time_ms: None,
            epsilon: 0.02,
            max_nodes: 400_000,
            descend_to_horizon: true,
            value_source: ValueSource::Win,
            value_gain: 1.0,
            prior_weights: crate::eval::PriorWeights::default(),
            parallel: 1,
            hide_hands: true,
        }
    }
}

pub static EXPANSIONS: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
pub static LEAF_EVALS: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

#[derive(Clone)]
struct AzNode {
    state: TnEGame,
    actor: usize,
    actions: Vec<Action>,
    slots: Vec<ActionSlot>,
    prior: Vec<f32>,
    children: Vec<usize>,
    n: Vec<u32>,
    w: Vec<[f32; 4]>,
    total_n: u32,
    leaf_value: Option<[f32; 4]>,
    expanded: bool,
    /// The game is over here, or the position is a cycle, or it sits past the
    /// horizon. Distinguished from `expanded` because an evaluated leaf is still
    /// descended through on the next simulation.
    terminal: bool,
    depth: u32,
}

impl AzNode {
    fn new(state: TnEGame, actor: usize, depth: u32) -> Self {
        AzNode {
            state,
            actor,
            actions: Vec::new(),
            slots: Vec::new(),
            prior: Vec::new(),
            children: Vec::new(),
            n: Vec::new(),
            w: Vec::new(),
            total_n: 0,
            leaf_value: None,
            expanded: false,
            terminal: false,
            depth,
        }
    }

    /// A cheap placeholder used while a node is moved out of the old arena.
    fn empty() -> Self {
        AzNode {
            state: TnEGame::with_start(2, 0, Player::Player1),
            actor: 0,
            actions: Vec::new(),
            slots: Vec::new(),
            prior: Vec::new(),
            children: Vec::new(),
            n: Vec::new(),
            w: Vec::new(),
            total_n: 0,
            leaf_value: None,
            expanded: false,
            terminal: false,
            depth: 0,
        }
    }
}

/// What one search produced: the move, plus the visit distribution that is the
/// policy training target.
#[derive(Clone)]
pub struct SearchResult {
    pub action: Action,
    pub root_actions: Vec<Action>,
    pub visits: Vec<u32>,
    /// Visit fraction per root action, after temperature.
    pub target: Vec<f32>,
    /// The search's own value estimate for every seat: the visit-weighted mean
    /// of the leaf values it backed up. This is the training target's
    /// bootstrapping term (see `train/train.py`) and a far lower-variance
    /// estimate of the position than any single leaf evaluation.
    pub value: [f32; 4],
    pub sims: u32,
    pub elapsed_ms: u128,
}

/// Snapshot of the root node that workers clone before doing their own
/// independent subtree search. Carries the bits needed to start the descent —
/// the state, the legal actions, their slot factors, and the (possibly
/// Dirichlet-mixed) priors — without paying for cloning the whole prior arena.
struct RootContext {
    state: TnEGame,
    actor: usize,
    actions: Vec<Action>,
    slots: Vec<ActionSlot>,
    prior: Vec<f32>,
}

#[derive(Clone)]
pub struct AzAgent {
    pub cfg: AzConfig,
    pub net: Option<Net>,
    pub evaluator: DomainEvaluator,
    pub rng: Rng,
    scratch: Scratch,
    feats: [f32; NFEAT],
    /// Dirichlet samples, drawn once per search.
    noise: Vec<f32>,
    pub root_value: [f32; 4],
    /// Subtree carried between plies. Index 0 is the root it was taken from, and
    /// `tree_hash` is that node's identity hash.
    tree: Option<Vec<AzNode>>,
    tree_hash: u64,
    /// Number of searches that actually reused a subtree, for reporting.
    pub reuse_hits: u32,
    pub searches: u32,
}

impl AzAgent {
    pub fn new(cfg: AzConfig, net: Option<Net>, seed: u64) -> Self {
        AzAgent {
            cfg,
            net,
            evaluator: DomainEvaluator::new(),
            rng: Rng::new(seed),
            scratch: Scratch::default(),
            feats: [0.0; NFEAT],
            noise: Vec::new(),
            root_value: [0.5; 4],
            tree: None,
            tree_hash: 0,
            reuse_hits: 0,
            searches: 0,
        }
    }

    /// Forget the retained subtree (used when an opponent has moved).
    pub fn reset_tree(&mut self) {
        self.tree = None;
    }

    /// One network evaluation for a node, shared by its priors and its value.
    ///
    /// The obvious implementation evaluates the network twice per node — once
    /// for the policy in `expand`, once for the value when the search reaches
    /// the leaf — and the trunk is 95% of the cost, so that doubles the price of
    /// the whole search for nothing. The state is the same both times.
    fn net_out<'s>(
        net: Option<&'s Net>,
        cfg: &AzConfig,
        scratch: &'s mut Scratch,
        feats: &'s mut [f32; NFEAT],
        state: &TnEGame,
    ) -> Option<NetOut<'s>> {
        if cfg.alpha_value <= 0.0 && cfg.alpha_policy <= 0.0 {
            return None;
        }
        let net = net?;
        features::extract(state, feats);
        Some(net.forward(feats, scratch))
    }

    /// Priors for one node's legal moves, before the child cap is applied.
    fn blend_priors(cfg: &AzConfig, state: &TnEGame, actions: &[Action], net: Option<&NetOut>) -> Vec<f32> {
        let n = actions.len();
        let heuristic = {
            let w = eval::prior_weights(state, actions, &cfg.prior_weights);
            let mut p = eval::normalize_priors(&w, cfg.epsilon);
            let s: f32 = p.iter().sum();
            if s > 0.0 {
                for v in p.iter_mut() {
                    *v /= s;
                }
            }
            p
        };
        let a = cfg.alpha_policy.clamp(0.0, 1.0);
        let mut out = heuristic.clone();
        if let (true, Some(o)) = (a > 0.0, net) {
            // Masked softmax over the legal set only: an unmasked softmax would
            // spend capacity on the several hundred moves that are not on offer.
            let mut logits = vec![0.0f32; n];
            let mut max = f32::NEG_INFINITY;
            for (i, act) in actions.iter().enumerate() {
                let l = features::slot_logit(o.policy, &features::slot_of(act));
                logits[i] = l;
                if l > max {
                    max = l;
                }
            }
            let mut sum = 0f32;
            for l in logits.iter_mut() {
                *l = (*l - max).exp();
                sum += *l;
            }
            if sum > 0.0 {
                for i in 0..n {
                    out[i] = a * (logits[i] / sum) + (1.0 - a) * heuristic[i];
                }
            }
        }
        let s: f32 = out.iter().sum();
        if s > 0.0 {
            for v in out.iter_mut() {
                *v /= s;
            }
        }
        out
    }

    /// Leaf value: network and hand-written evaluator, blended.
    fn blend_value(cfg: &AzConfig, evaluator: &DomainEvaluator, state: &TnEGame, net: Option<&NetOut>) -> [f32; 4] {
        LEAF_EVALS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let heur = evaluator.utility_vector(state);
        let a = cfg.alpha_value.clamp(0.0, 1.0);
        if a <= 0.0 {
            return heur;
        }
        match net {
            Some(o) => {
                let np = state.num_players as usize;
                let mut v = [0.5f32; 4];
                for i in 0..4 {
                    v[i] = if i < np {
                        let raw = match cfg.value_source {
                            ValueSource::Utility => o.utility[i],
                            ValueSource::Win => o.win[i],
                        };
                        // Sharpen about 0.5 before blending; see `value_gain`.
                        let raw = 0.5 + cfg.value_gain * (raw - 0.5);
                        a * raw + (1.0 - a) * heur[i]
                    } else {
                        0.5
                    };
                }
                v
            }
            None => heur,
        }
    }

    /// Value of a node whose network output is not otherwise available. Every
    /// node expanded by the search already has its value cached, so this is the
    /// cold path only.
    fn leaf_value(&mut self, state: &TnEGame) -> [f32; 4] {
        let cfg = self.cfg;
        let o = Self::net_out(self.net.as_ref(), &cfg, &mut self.scratch, &mut self.feats, state);
        Self::blend_value(&cfg, &self.evaluator, state, o.as_ref())
    }

    fn expand(&mut self, arena: &mut Vec<AzNode>, idx: usize) {
        EXPANSIONS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        if arena[idx].expanded {
            return;
        }
        arena[idx].expanded = true;
        // Terminal states clear `state` but keep the action stack, so they must
        // be caught here: `legal_actions` reads `next_state()` and unwraps.
        if arena[idx].state.state.is_empty() {
            arena[idx].terminal = true;
            arena[idx].leaf_value = Some(DomainEvaluator::terminal_vector(&arena[idx].state));
            return;
        }
        let actions = crate::puct::legal_actions(&arena[idx].state);
        if actions.is_empty() {
            arena[idx].terminal = true;
            arena[idx].leaf_value = Some(crate::eval::DomainEvaluator::terminal_vector(
                &arena[idx].state,
            ));
            return;
        }
        // One network call serves both the priors and this node's value.
        let cfg = self.cfg;
        let o = Self::net_out(
            self.net.as_ref(),
            &cfg,
            &mut self.scratch,
            &mut self.feats,
            &arena[idx].state,
        );
        if arena[idx].leaf_value.is_none() {
            let v = Self::blend_value(&cfg, &self.evaluator, &arena[idx].state, o.as_ref());
            arena[idx].leaf_value = Some(v);
        }
        let priors = Self::blend_priors(&cfg, &arena[idx].state, &actions, o.as_ref());
        let slots: Vec<ActionSlot> = actions.iter().map(features::slot_of).collect();

        // Cap the branching factor, but force the best move of every action kind
        // through: with ~700 candidate placements, a pure top-K drops every
        // leader, treasure and monument decision.
        let k = self.cfg.max_children.max(1).min(actions.len());
        let keep: Vec<usize> = if k >= actions.len() {
            (0..actions.len()).collect()
        } else {
            let mut best_by_kind = [usize::MAX; features::NKIND];
            for i in 0..actions.len() {
                let kind = slots[i].kind;
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
            let mut order: Vec<usize> = (0..actions.len()).collect();
            order.sort_by(|&x, &y| {
                priors[y]
                    .partial_cmp(&priors[x])
                    .unwrap_or(std::cmp::Ordering::Equal)
                    .then(slots[x].kind.cmp(&slots[y].kind))
                    .then(slots[x].pos.cmp(&slots[y].pos))
            });
            let mut taken = vec![false; actions.len()];
            for &c in chosen.iter() {
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
            chosen
        };

        let mut kept_actions = Vec::with_capacity(keep.len());
        let mut kept_slots = Vec::with_capacity(keep.len());
        let mut kept_prior = Vec::with_capacity(keep.len());
        for &i in &keep {
            kept_actions.push(actions[i]);
            kept_slots.push(slots[i]);
            kept_prior.push(priors[i]);
        }
        let s: f32 = kept_prior.iter().sum();
        if s > 0.0 {
            for p in kept_prior.iter_mut() {
                *p /= s;
            }
        }
        let n = kept_actions.len();
        arena[idx].actions = kept_actions;
        arena[idx].slots = kept_slots;
        arena[idx].prior = kept_prior;
        arena[idx].children = vec![usize::MAX; n];
        arena[idx].n = vec![0; n];
        arena[idx].w = vec![[0.0; 4]; n];
    }

    #[inline]
    fn select_child(&self, arena: &[AzNode], idx: usize, total: f32) -> usize {
        let node = &arena[idx];
        let mut best = 0usize;
        let mut best_score = f32::NEG_INFINITY;
        let c = self.cfg.c_puct;
        let cb = self.cfg.c_puct_base;
        for i in 0..node.actions.len() {
            let n = node.n[i] as f32;
            let q = if node.n[i] > 0 {
                node.w[i][node.actor] / n
            } else {
                node.leaf_value.map(|v| v[node.actor]).unwrap_or(0.5)
            };
            let p = node.prior[i];
            let pb = node.prior[i].sqrt();
            let score = q + c * p * total.sqrt() / (1.0 + n) + cb * pb * total / (n + 1.0);
            if score > best_score {
                best_score = score;
                best = i;
            }
        }
        best
    }

    fn simulate(&mut self, arena: &mut Vec<AzNode>) {
        let mut idx = 0usize;
        let mut path: Vec<(usize, usize)> = Vec::new();
        let mut path_hash: Vec<u64> = vec![arena[0].state.identity_hash()];

        let value = loop {
            if arena[idx].terminal {
                break arena[idx].leaf_value.unwrap_or(REPEAT_VALUE);
            }
            if !arena[idx].expanded {
                self.expand(arena, idx);
            }
            if arena[idx].terminal {
                break arena[idx].leaf_value.unwrap_or(REPEAT_VALUE);
            }
            // Never cut mid-turn. A turn is the atomic unit the game moves in: a
            // position where the mover still has their second action available is
            // not a position the game ever rests in, and evaluating one gives the
            // search a cheaper-looking leaf to aim at. `same_player_continues` is
            // the same predicate the legacy searches use.
            if arena[idx].depth >= self.horizon()
                && !turn_continues(&arena[idx].state)
            {
                break self.evaluate(arena, idx);
            }
            let total = arena[idx].total_n as f32;
            let slot = self.select_child(arena, idx, total);
            path.push((idx, slot));
            let child = arena[idx].children[slot];
            if child == usize::MAX {
                if arena.len() >= self.cfg.max_nodes {
                    break self.evaluate(arena, idx);
                }
                let mut st = arena[idx].state.clone();
                if st.process(arena[idx].actions[slot]).is_err() {
                    // A legal-move generator bug, not a strategy: back up the
                    // parent's own evaluation rather than corrupting the tree.
                    break self.evaluate(arena, idx);
                }
                let actor = st.next_player().index().unwrap_or(0);
                let depth = arena[idx].depth + 1;
                let ci = arena.len();
                arena.push(AzNode::new(st, actor, depth));
                arena[idx].children[slot] = ci;
                // A state already on this path is a cycle, not progress. T&E has
                // real two-cycles (a leader shuttling between two squares) and
                // without this the tree fills with positions the game never rests
                // in.
                let h = arena[ci].state.identity_hash();
                if path_hash.contains(&h) {
                    arena[ci].terminal = true;
                    arena[ci].leaf_value = Some(REPEAT_VALUE);
                    break REPEAT_VALUE;
                }
                if self.cfg.descend_to_horizon {
                    // Keep walking the fresh path to the horizon rather than
                    // evaluating one ply down.
                    //
                    // This is not how an AlphaZero search runs, but it is how
                    // this one has to run while the value function is still the
                    // hand-written one. That evaluation is only worth anything a
                    // few plies deep — measured, the same search evaluating one
                    // ply down scored 3.8 while evaluating six down scored 5.4 —
                    // so "expand one node, stop" throws away the only signal
                    // there is. Once the network carries the value the trade
                    // reverses: a deep path per simulation buys far less than the
                    // breadth it costs.
                    path_hash.push(h);
                    idx = ci;
                    continue;
                }
                if depth >= self.horizon() && !turn_continues(&arena[ci].state) {
                    arena[ci].terminal = true;
                    let v = self.evaluate(arena, ci);
                    break v;
                }
                break self.evaluate(arena, ci);
            } else {
                let h = arena[child].state.identity_hash();
                if path_hash.contains(&h) {
                    arena[child].terminal = true;
                    arena[child].leaf_value = Some(REPEAT_VALUE);
                    break REPEAT_VALUE;
                }
                path_hash.push(h);
                idx = child;
            }
        };
        self.backup(arena, &path, value);
    }

    /// Value of a node, cached. The state is fixed, so caching is exact — and it
    /// is what gives `select_child` a sensible prior `q` for an unvisited child,
    /// instead of a constant.
    fn evaluate(&mut self, arena: &mut Vec<AzNode>, idx: usize) -> [f32; 4] {
        if let Some(v) = arena[idx].leaf_value {
            return v;
        }
        let v = self.leaf_value(&arena[idx].state);
        arena[idx].leaf_value = Some(v);
        v
    }

    /// Absolute ply ceiling while a turn is still in progress. Only a guard
    /// against a pathological never-ending turn; `max_depth` is the horizon.
    fn horizon(&self) -> u32 {
        self.cfg.max_depth
    }

    fn backup(&mut self, arena: &mut [AzNode], path: &[(usize, usize)], value: [f32; 4]) {
        for &(parent, slot) in path.iter().rev() {
            // All four components, not just the actor's. Selection only ever
            // reads the actor's component (max-n), so this changes no decision —
            // but it makes `Σ w[seat] / n` the search's value estimate for every
            // seat, which is what the training target needs.
            for k in 0..4 {
                arena[parent].w[slot][k] += value[k];
            }
            arena[parent].n[slot] += 1;
            arena[parent].total_n += 1;
        }
        let _ = self;
    }

    /// Run `n_sims` simulations against `arena`, optionally bounded by
    /// `time_limit_ms`. Caller owns `arena`; the function only borrows it.
    fn run_sims(
        &mut self,
        arena: &mut Vec<AzNode>,
        n_sims: u32,
        time_limit_ms: Option<u64>,
        start: Instant,
    ) -> u32 {
        let mut done = 0u32;
        for _ in 0..n_sims {
            if let Some(limit) = time_limit_ms {
                if start.elapsed().as_millis() as u64 >= limit {
                    break;
                }
            }
            self.simulate(arena);
            done += 1;
        }
        done
    }

    /// Worker entry point: build a fresh arena seeded with the supplied root
    /// (state + actions/slots/prior already on hand, no need to re-expand), run
    /// `n_sims` simulations against it, and return the root's per-action visit
    /// counts and value sums so the main thread can fold them in. The worker
    /// arena is discarded after the call.
    fn run_from_root(
        &mut self,
        ctx: &RootContext,
        n_sims: u32,
        time_limit_ms: Option<u64>,
        start: Instant,
    ) -> (Vec<u32>, Vec<[f32; 4]>, u32) {
        let n_actions = ctx.actions.len();
        let mut arena: Vec<AzNode> = Vec::with_capacity(1024);
        let mut root = AzNode::new(ctx.state.clone(), ctx.actor, 0);
        root.actions = ctx.actions.clone();
        root.slots = ctx.slots.clone();
        root.prior = ctx.prior.clone();
        root.children = vec![usize::MAX; n_actions];
        root.n = vec![0; n_actions];
        root.w = vec![[0.0; 4]; n_actions];
        // The root's own value: a leaf eval, same as the main thread.
        root.leaf_value = Some(self.leaf_value(&root.state));
        root.expanded = true;
        arena.push(root);
        let done = self.run_sims(&mut arena, n_sims, time_limit_ms, start);
        let visits = arena[0].n.clone();
        let wsum = arena[0].w.clone();
        (visits, wsum, done)
    }

    /// Run the search and pick a move.
    ///
    /// If the state passed in is exactly the position a retained subtree is
    /// rooted at — which happens on the second action of a seat's own turn — that
    /// subtree is reused and only the new simulations are spent. Otherwise the
    /// tree is rebuilt, which is what must happen after an opponent has moved:
    /// their half of the tree describes a position that no longer exists.
    ///
    /// When `cfg.parallel > 1`, the simulate loop is split across `parallel`
    /// worker threads. Each worker gets its own arena clone and runs
    /// `sims / parallel` simulations independently; their root-level visit
    /// counts and value totals are folded into the main arena at the end so the
    /// retained subtree is consistent with the aggregated search.
    pub fn search(&mut self, state: &TnEGame) -> Option<SearchResult> {
        if state.state.is_empty() {
            return None;
        }
        let start = Instant::now();
        // Forced move: play it without a network call or a single simulation.
        let legal = crate::puct::legal_actions(state);
        if legal.len() == 1 {
            self.tree = None;
            return Some(SearchResult {
                action: legal[0],
                root_actions: legal,
                visits: vec![0],
                target: vec![1.0],
                value: self.root_value,
                sims: 0,
                elapsed_ms: start.elapsed().as_millis(),
            });
        }
        let actor = state.next_player().index().unwrap_or(0);
        self.searches += 1;
        self.root_value = self.leaf_value(state);

        // The real state carries the game's RNG, i.e. the true future bag
        // draws. Searching on it lets every simulation see the tiles that will
        // actually be drawn, so the root gets a private seed. A retained tree
        // already has its own seed: compare with that one swapped in.
        let mut arena: Vec<AzNode> = match self.tree.take() {
            Some(t) if !t.is_empty() && t[0].actor == actor && {
                let mut probe = state.clone();
                if self.cfg.hide_hands {
                    probe.copy_hidden_from(&t[0].state, state.next_player());
                } else {
                    probe.rng = t[0].state.rng;
                }
                probe.identity_hash() == self.tree_hash
            } => {
                self.reuse_hits += 1;
                t
            }
            _ => {
                let mut root = state.clone();
                root.rng = Rng(self.rng.next_u64());
                if self.cfg.hide_hands {
                    root.redeal_hidden(state.next_player(), &mut self.rng);
                }
                vec![AzNode::new(root, actor, 0)]
            }
        };
        self.expand(&mut arena, 0);
        if arena[0].actions.is_empty() {
            self.tree = None;
            return None;
        }
        if self.cfg.dirichlet_eps > 0.0 && self.cfg.dirichlet_alpha > 0.0 {
            self.sample_dirichlet(arena[0].actions.len());
            for i in 0..arena[0].prior.len() {
                arena[0].prior[i] =
                    (1.0 - self.cfg.dirichlet_eps) * arena[0].prior[i]
                        + self.cfg.dirichlet_eps * self.noise[i];
            }
        }

        let time_limit_ms = self.cfg.max_time_ms;
        let parallel = self.cfg.parallel.max(1);
        let done: u32 = if parallel <= 1 {
            self.run_sims(&mut arena, self.cfg.sims, time_limit_ms, start)
        } else {
            // Split the simulate budget. Each worker gets a *fresh* single-node
            // arena plus a clone of the root's actions/slots/prior — the only
            // data needed to start. Cloning the whole prior arena was the
            // single biggest non-simulate cost in the parallel path; with this
            // approach each worker pays O(actions) for setup and O(sim) for its
            // own subtree, with no shared arena to copy.
            let per = self.cfg.sims / parallel as u32;
            let extra = self.cfg.sims % parallel as u32;

            let root_ctx = RootContext {
                state: arena[0].state.clone(),
                actor: arena[0].actor,
                actions: arena[0].actions.clone(),
                slots: arena[0].slots.clone(),
                prior: arena[0].prior.clone(),
            };

            let cfg_template = self.cfg;
            // Spawn N-1 workers AND run the main thread's own budget inside the
            // same scope, so all `parallel` searches happen concurrently. The
            // main thread's own arena is the persistent one retained for tree
            // reuse between plies; workers' arenas are discarded after their
            // root counts are folded in below.
            let results: Vec<(Vec<u32>, Vec<[f32; 4]>, u32)> = std::thread::scope(|scope| {
                let mut handles = Vec::with_capacity(parallel - 1);
                for w in 0..parallel - 1 {
                    let cfg = cfg_template;
                    let net = self.net.clone();
                    let evaluator = self.evaluator;
                    let rng_seed = self.rng.next_u64()
                        ^ 0x9E37_79B9_7F4A_7C15
                        ^ ((w as u64 + 1).wrapping_mul(0xA5A5_A5A5_A5A5_A5A5));
                    // Each worker searches its own sample of what the actor
                    // cannot see, so the merged root averages over several.
                    let mut wstate = root_ctx.state.clone();
                    wstate.rng = Rng(rng_seed ^ 0x5851_F42D_4C95_7F2D);
                    if cfg.hide_hands {
                        wstate.redeal_hidden(state.next_player(), &mut Rng(rng_seed));
                    }
                    let worker_ctx = RootContext {
                        state: wstate,
                        actor: root_ctx.actor,
                        actions: root_ctx.actions.clone(),
                        slots: root_ctx.slots.clone(),
                        prior: root_ctx.prior.clone(),
                    };
                    let budget = per;
                    let limit = time_limit_ms;
                    let now = start;
                    handles.push(scope.spawn(move || {
                        let mut agent = AzAgent {
                            cfg,
                            net,
                            evaluator,
                            rng: Rng(rng_seed),
                            scratch: Scratch::default(),
                            feats: [0.0; NFEAT],
                            noise: Vec::new(),
                            root_value: [0.5; 4],
                            tree: None,
                            tree_hash: 0,
                            reuse_hits: 0,
                            searches: 0,
                        };
                        let (visits, wsum, wdone) = agent.run_from_root(&worker_ctx, budget, limit, now);
                        (visits, wsum, wdone)
                    }));
                }
                // Main thread does its share concurrently with the workers.
                let main_done = self.run_sims(&mut arena, per + extra, time_limit_ms, start);
                let mut out: Vec<(Vec<u32>, Vec<[f32; 4]>, u32)> =
                    Vec::with_capacity(handles.len() + 1);
                out.push((arena[0].n.clone(), arena[0].w.clone(), main_done));
                for h in handles {
                    out.push(h.join().expect("parallel mcts worker panicked"));
                }
                out
            });

            // Fold worker root statistics into the main arena so the retained
            // subtree's root visit counts reflect the full search budget.
            // Workers started from empty arenas so we can sum their root
            // counts directly into the main arena without subtracting a
            // pre-clone baseline.
            let mut done: u32 = 0;
            for (_visits, _wsum, wdone) in &results {
                done = done.saturating_add(*wdone);
            }
            let na = arena[0].n.len();
            for (visits, wsum, _wdone) in results {
                for (i, v) in visits.iter().enumerate() {
                    if i < na {
                        arena[0].n[i] = arena[0].n[i].saturating_add(*v);
                    }
                }
                let wa = arena[0].w.len();
                for (i, ws) in wsum.iter().enumerate() {
                    if i < wa {
                        for k in 0..4 {
                            arena[0].w[i][k] += ws[k];
                        }
                    }
                }
            }
            done
        };

        let root_actions = arena[0].actions.clone();
        let visits = arena[0].n.clone();
        let mut order: Vec<usize> = (0..root_actions.len()).collect();
        order.sort_by(|&a, &b| {
            visits[b].cmp(&visits[a]).then(
                arena[0].w[b][actor]
                    .partial_cmp(&arena[0].w[a][actor])
                    .unwrap_or(std::cmp::Ordering::Equal),
            )
        });
        let best = order[0];
        let action = root_actions[best];

        let total: u32 = visits.iter().sum::<u32>().max(1);
        let mut target = vec![0f32; root_actions.len()];
        if self.cfg.temperature > 0.0 {
            let tau = self.cfg.temperature;
            let mut denom = 0f32;
            for i in 0..root_actions.len() {
                let w = (visits[i] as f32).powf(1.0 / tau);
                target[i] = w;
                denom += w;
            }
            if denom > 0.0 {
                for t in target.iter_mut() {
                    *t /= denom;
                }
            }
        } else {
            for i in 0..root_actions.len() {
                target[i] = visits[i] as f32 / total as f32;
            }
        }

        // Search value for every seat: the visit-weighted mean of the leaf
        // values the simulations backed up through the root's children.
        let mut value = [0.5f32; 4];
        let root_total: u32 = visits.iter().sum::<u32>().max(1);
        for slot in 0..root_actions.len() {
            for k in 0..4 {
                value[k] += arena[0].w[slot][k];
            }
        }
        for v in value.iter_mut() {
            *v /= root_total as f32;
        }

        // Carry the subtree under the move we are about to make. If that move
        // fails to apply, or the caller ignores it, the next search simply fails
        // the identity check and starts fresh.
        let child = arena[0].children[best];
        if child != usize::MAX {
            let kept = compact(arena, child);
            self.tree = Some(kept);
            self.tree_hash = self.tree.as_ref().unwrap()[0].state.identity_hash();
        } else {
            self.tree = None;
        }

        Some(SearchResult {
            action,
            root_actions,
            visits,
            target,
            value,
            sims: done,
            elapsed_ms: start.elapsed().as_millis(),
        })
    }

    /// Per-seat value of the position as last evaluated at a search root.
    pub fn identity_of(&self, state: &TnEGame) -> u64 {
        state.identity_hash()
    }

    fn sample_dirichlet(&mut self, n: usize) {
        // Gamma(alpha) via the sum of `k = ceil(alpha)` exponentials, which is
        // exact for integer alpha and a good approximation just above it. Then
        // centre, clip and renormalise. Drawing one gamma per category is the
        // textbook formulation and it showed up in the profile next to the
        // network itself, so it is worth doing cheaply.
        let alpha = self.cfg.dirichlet_alpha;
        let k = (alpha + 2.0) as usize;
        let mut g = vec![0f32; n];
        for slot in g.iter_mut() {
            let mut s = 0f32;
            for _ in 0..k {
                let u = self.rng.next_u64() as f32 / u64::MAX as f32;
                s += -(1.0 - u.min(0.999_999)).max(1e-7).ln();
            }
            *slot = s;
        }
        let m: f32 = g.iter().sum::<f32>() / n as f32;
        let mut var = 0f32;
        for x in g.iter_mut() {
            *x = (*x - m).max(0.0);
            var += *x * *x;
        }
        var /= n as f32;
        self.noise.clear();
        self.noise.reserve(n);
        for x in g.iter() {
            self.noise
                .push(if var > 1e-12 { *x / var.sqrt() } else { 0.0 });
        }
        let s: f32 = self.noise.iter().sum();
        if s > 0.0 {
            for v in self.noise.iter_mut() {
                *v /= s;
            }
        } else {
            for v in self.noise.iter_mut() {
                *v = 1.0 / n as f32;
            }
        }
    }
}

/// A network shared between seats and between arena threads without copying
/// ~700 kB per hand.
pub type SharedNet = std::sync::Arc<Net>;

/// Evaluate the network, or return `None` when no weights are loaded. Used by
/// the training loop, which alternates between a pure-heuristic agent (before
/// the first checkpoint) and a blended one.
pub fn load_net(path: &str) -> Result<SharedNet, String> {
    Net::load(path)
        .map(std::sync::Arc::new)
        .map_err(|e| format!("could not load {path}: {e}"))
}

impl minimax::Strategy<crate::solver::TigrisAndEuphrates> for AzAgent {
    fn choose_move(
        &mut self,
        state: &<crate::solver::TigrisAndEuphrates as minimax::Game>::S,
    ) -> Option<<crate::solver::TigrisAndEuphrates as minimax::Game>::M> {
        self.search(state).map(|r| r.action)
    }
}

/// Rebuild the arena keeping only what is reachable from `root`, renumbering
/// child indices and resetting depth. Without this the arena grows by the whole
/// tree every ply and a single game would exhaust memory.
///
/// Node visit statistics are deliberately kept: the subtree is still valid
/// evidence about the position it covers.
fn compact(mut arena: Vec<AzNode>, root: usize) -> Vec<AzNode> {
    if root == 0 && arena.len() == 1 {
        return arena;
    }
    let mut order: Vec<usize> = Vec::new();
    let mut stack = vec![root];
    let mut seen = vec![false; arena.len()];
    while let Some(i) = stack.pop() {
        if seen[i] {
            continue;
        }
        seen[i] = true;
        order.push(i);
        for &c in arena[i].children.iter() {
            if c != usize::MAX {
                stack.push(c);
            }
        }
    }
    let mut remap = vec![usize::MAX; arena.len()];
    for (new, &old) in order.iter().enumerate() {
        remap[old] = new;
    }
    let mut kept: Vec<AzNode> = Vec::with_capacity(order.len());
    for &old in order.iter() {
        let mut node = std::mem::replace(&mut arena[old], AzNode::empty());
        for c in node.children.iter_mut() {
            *c = if *c == usize::MAX { usize::MAX } else { remap[*c] };
        }
        kept.push(node);
    }
    // Re-root the depths so `max_depth` measures from the new root.
    let mut frontier = vec![(0usize, 0u32)];
    while let Some((i, d)) = frontier.pop() {
        kept[i].depth = d;
        for &c in kept[i].children.iter() {
            if c != usize::MAX {
                frontier.push((c, d + 1));
            }
        }
    }
    kept
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::maps::MapSpec;

    /// The configuration `play` hands to a human opponent must actually finish a
    /// game. This caught nothing, but it is the only test that traverses the
    /// exact code path the shipped agent uses — the ladder tests use their own
    /// configs, so a default that produced an illegal move or failed to
    /// terminate would otherwise only show up in the middle of a game someone
    /// was playing.
    #[test]
    fn play_config_finishes_a_game_legally() {
        let cfg = AzConfig {
            sims: 60,
            dirichlet_alpha: 0.0,
            dirichlet_eps: 0.0,
            temperature: 0.0,
            max_depth: 12,
            max_children: 100,
            descend_to_horizon: true,
            ..AzConfig::default()
        };
        let mut game = MapSpec::default_map().start_game(4, 4242);
        let mut agents: Vec<AzAgent> = (0..4)
            .map(|i| AzAgent::new(cfg, None, 0x5EED ^ i as u64))
            .collect();
        let mut plies = 0;
        while !game.state.is_empty() && plies < 2000 {
            let seat = game.next_player().index().expect("active seat");
            let r = agents[seat].search(&game).expect("a move exists");
            game.process(r.action).expect("the search returned an illegal move");
            plies += 1;
        }
        assert!(game.state.is_empty(), "game did not terminate in {plies} plies");
        assert!(plies > 60, "game ended implausibly fast: {plies} plies");
    }

    /// Reusing a subtree must not change the move the search would have made
    /// from scratch. This is the check that the retained tree is actually the
    /// same position — the hash could agree while the tree meant something else,
    /// and the symptom (a slow strength regression) is invisible without it.
    ///
    /// The two searches are not identical by construction: reuse is a warm start
    /// (retained visit counts survive), so agreement is only guaranteed once the
    /// search has converged. 120 simulations used to be enough; now that move
    /// generation emits leader *relocations* as well as placements (rulebook
    /// L45-49), the move set is larger and the two need a bigger budget to
    /// settle on the same best child. The budget is raised rather than the
    /// assertion weakened: a disagreement here would still be a real defect.
    #[test]
    fn tree_reuse_agrees_with_a_fresh_search() {
        let cfg = AzConfig {
            sims: 400,
            dirichlet_alpha: 0.0,
            dirichlet_eps: 0.0,
            temperature: 0.0,
            max_depth: 8,
            max_children: 100,
            ..AzConfig::default()
        };
        let mut game = MapSpec::default_map().start_game(4, 7);
        let mut reused = AzAgent::new(cfg, None, 1);
        let mut fresh = AzAgent::new(cfg, None, 1);

        // Play one action, then search from the resulting position with the tree
        // carried over and with a cold agent; both must agree.
        let first = reused.search(&game).expect("move").action;
        game.process(first).unwrap();
        let a = reused.search(&game).expect("move").action;
        let b = fresh.search(&game).expect("move").action;
        assert_eq!(a, b, "retained subtree changed the chosen move");
        assert!(reused.reuse_hits > 0, "the tree was never actually reused");
    }

    /// Parallel root-parallelism must not change the chosen move compared with a
    /// single-threaded search at the same budget. Same seed ⇒ identical RNG
    /// stream on the main thread, and the worker RNGs only see sims they would
    /// have seen anyway, so a converged search picks the same action.
    #[test]
    fn parallel_picks_same_move_as_sequential() {
        let cfg_seq = AzConfig {
            sims: 400,
            dirichlet_alpha: 0.0,
            dirichlet_eps: 0.0,
            temperature: 0.0,
            max_depth: 8,
            max_children: 100,
            parallel: 1,
            ..AzConfig::default()
        };
        let cfg_par = AzConfig {
            parallel: 4,
            ..cfg_seq
        };
        let game = MapSpec::default_map().start_game(4, 7);
        let a = AzAgent::new(cfg_seq, None, 1).search(&game).expect("move").action;
        let b = AzAgent::new(cfg_par, None, 1).search(&game).expect("move").action;
        assert_eq!(a, b, "parallel search diverged from sequential");
    }

    /// Parallel search should also keep the same move-selection under Dirichlet
    /// noise: the noise is drawn by the main thread and applied to the main
    /// arena before workers clone, so workers see the noisy root priors.
    #[test]
    fn parallel_picks_same_move_under_dirichlet() {
        let cfg_seq = AzConfig {
            sims: 800,
            dirichlet_alpha: 0.3,
            dirichlet_eps: 0.25,
            temperature: 0.0,
            max_depth: 8,
            max_children: 100,
            parallel: 1,
            ..AzConfig::default()
        };
        let cfg_par = AzConfig { parallel: 4, ..cfg_seq };
        let game = MapSpec::default_map().start_game(4, 99);
        let a = AzAgent::new(cfg_seq, None, 1).search(&game).expect("move").action;
        let b = AzAgent::new(cfg_par, None, 1).search(&game).expect("move").action;
        assert_eq!(a, b, "parallel diverged under Dirichlet");
    }
}
