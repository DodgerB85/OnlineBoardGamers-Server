//! Domain-specific evaluation, heuristic action priors and the factorized
//! action view used by the PUCT agent.
//!
//! PRD refs: 003 §2 (factorization), §3 (priors), §6 (evaluator).

use crate::game::{Action, Bitboard, Leader, Player, Pos, TileType, Tiles, TnEGame, W, H};

/// Index into the `[red, blue, green, black]` arrays the game stores scores in.
fn colour_index(l: Leader) -> usize {
    match l {
        Leader::Red => 0,
        Leader::Blue => 1,
        Leader::Green => 2,
        Leader::Black => 3,
        Leader::None => usize::MAX,
    }
}

/// Empty, non-river, uncatastrophed spaces touching `mine`.
///
/// This is the player's remaining *scoring capacity*: every future tile they
/// bank has to go on one of these, because a tile only scores if it lands in a
/// kingdom holding a matching leader. Walking the dilated bitboard touches only
/// the set bits, so this stays cheap enough for a leaf evaluation.
fn frontier_spaces(state: &TnEGame, mine: Bitboard) -> u32 {
    let mut n = 0;
    for p in mine.dilate().iter() {
        if state.board.get_tile_type(p) == TileType::Empty
            && !state.board.river.get(p)
            && !state.board.get_catastrophe(p)
        {
            n += 1;
        }
    }
    n
}

/// Bag-aware expected final score for `player`, in raw victory points.
///
/// This is the quantity the game actually rewards. A player's score at the end
/// is the VP in their *fewest* colour (rulebook Goal), after treasures are
/// dealt to the then-lowest colour. [`PlayerState::calculate_score`] only
/// counts VP banked so far, so it cannot see tiles still in hand, tiles still
/// in the bag, or a colour unlocked by a leader that is not on the board yet.
///
/// For each colour we take the VP already scored plus every tile of that
/// colour the player could still realistically bank — their hand, plus roughly
/// their share of the remaining bag — but only for colours they can score with
/// (a matching leader, or a black leader, which collects every colour in its
/// kingdom). The claim is capped by remaining frontier, because tiles with
/// nowhere to go are worth nothing.
///
/// The bag is shared, so `supply / num_players` is the neutral expectation
/// early and shrinks to nothing as the bag empties, which correctly makes banked
/// VP dominate late. Treasures are wild and go to the then-lowest colour,
/// exactly as `calculate_score` does.
///
/// The result is a first-order upper bound, not an exact forecast, but it is
/// monotone in the right things and comparable across seats and player counts,
/// which is what a search actually needs.
pub fn expected_final_score(state: &TnEGame, player: Player) -> i32 {
    let ps = state.players.get(player);
    let bag = state.bag();

    let mut colour = [
        ps.score_red as i32,
        ps.score_blue as i32,
        ps.score_green as i32,
        ps.score_black as i32,
    ];
    let hand = [
        ps.hand_red as i32,
        ps.hand_blue as i32,
        ps.hand_green as i32,
        ps.hand_black as i32,
    ];
    let supply = [
        bag.red as i32,
        bag.blue as i32,
        bag.green as i32,
        bag.black as i32,
    ];

    // Union this player's kingdoms and note which colours they can score.
    let connectable = state.board.connectable_bitboard();
    let mut mine = Bitboard::new();
    let mut can_score = [false; 4];
    for l in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
        if let Some(pos) = ps.get_leader(l) {
            if l == Leader::Black {
                // A black leader collects points of any colour in its kingdom.
                can_score = [true; 4];
            }
            can_score[colour_index(l)] = true;
            if !mine.get(pos) {
                mine |= state.board.find_kingdom_map_fast(pos, connectable);
            }
        }
    }

    let capacity = frontier_spaces(state, mine) as i32;
    let seats = state.num_players.max(1) as i32;

    for i in 0..4 {
        if can_score[i] {
            colour[i] += (hand[i] + supply[i] / seats).min(capacity);
        }
    }

    let mut treasures = ps.score_treasure as i32;
    while treasures > 0 {
        let mut lowest = 0;
        for i in 1..4 {
            if colour[i] < colour[lowest] {
                lowest = i;
            }
        }
        colour[lowest] += 1;
        treasures -= 1;
    }

    *colour.iter().min().unwrap_or(&0)
}

/// Positional detail [`expected_final_score`] deliberately ignores, but which a
/// search needs in the opening and midgame.
struct Position {
    /// Leaders currently on the board. Each one unlocks a colour for scoring.
    leaders: u32,
    /// Tiles sitting inside the player's own kingdoms.
    kingdom_tiles: u32,
    /// Red tiles beside the player's leaders: keeps the leader on the board
    /// and is exactly the ammunition a revolt needs.
    temple_support: u32,
    /// Treasures reachable inside the player's kingdoms with a green leader —
    /// the rule fires automatically, so this is VP already coming.
    pending_treasures: u32,
}

fn position_of(state: &TnEGame, player: Player) -> Position {
    let ps = state.players.get(player);
    let connectable = state.board.connectable_bitboard();
    let mut mine = Bitboard::new();
    let mut p = Position {
        leaders: 0,
        kingdom_tiles: 0,
        temple_support: 0,
        pending_treasures: 0,
    };

    for l in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
        if let Some(pos) = ps.get_leader(l) {
            p.leaders += 1;
            p.temple_support += (pos.neighbors() & state.board.red_tiles).count_ones() as u32;
            if !mine.get(pos) {
                let k = state.board.find_kingdom_map_fast(pos, connectable);
                mine |= k;
                p.kingdom_tiles += k.count_ones() as u32;
            }
        }
    }

    // Rulebook: a kingdom with more than one treasure and a green leader hands
    // all but one of them over, so those are points already committed.
    if ps.get_leader(Leader::Green).is_some() {
        let reachable = (mine & state.board.treasures).count_ones() as u32;
        p.pending_treasures += reachable.saturating_sub(1);
    }

    p
}

/// Value of one player under the bag-aware evaluator, in the same rough units
/// as [`PlayerState::get_eval`] so the two can be blended or A/B'd.
///
/// [`expected_final_score`] carries the endgame, but it is flat at zero while
/// no leaders are down — every seat looks identical at the start. The
/// positional terms supply the gradient that opens the game, and they fade into
/// irrelevance once the score term starts moving.
pub fn modern_value(state: &TnEGame, player: Player) -> f32 {
    let pos = position_of(state, player);
    let frontier = {
        let connectable = state.board.connectable_bitboard();
        let ps = state.players.get(player);
        let mut mine = Bitboard::new();
        for l in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
            if let Some(p) = ps.get_leader(l) {
                if !mine.get(p) {
                    mine |= state.board.find_kingdom_map_fast(p, connectable);
                }
            }
        }
        frontier_spaces(state, mine) as f32
    };

    100.0 * expected_final_score(state, player) as f32
        + 15.0 * pos.leaders as f32
        + 4.0 * pos.kingdom_tiles as f32
        + 3.0 * frontier
        + 6.0 * pos.temple_support as f32
        + 30.0 * pos.pending_treasures as f32
}

/// Coefficients of the domain evaluator.
///
/// These are the numbers that were previously hard-coded inside
/// `PlayerState::get_eval`. Extracting them costs nothing at runtime and makes
/// the one thing every agent is saturating against — the leaf value — actually
/// fittable. The defaults reproduce the incumbent formula exactly, so switching
/// to weights is behaviour-preserving.
#[derive(Clone, Copy, Debug)]
pub struct LeafWeights {
    /// Per point of final (minimum-colour) score. The single dominant term:
    /// this is what the game rewards.
    pub min_score: f32,
    /// Penalty per point of spread between best and worst colour.
    pub imbalance: f32,
    pub treasure: f32,
    /// Having a leader on the board at all (per leader).
    pub leader_present: f32,
    /// Separate multiplier on the raw count of leaders placed.
    pub leaders_placed: f32,
    /// Extra for a leader in the colour you are weakest in.
    pub leader_weak: f32,
    /// Penalty for having no leader in your weakest colour.
    pub no_leader_weak: f32,
    pub hand_red: f32,
    /// Hand tiles matching a leader you already have on the board (war ammo).
    pub hand_leader_colour: f32,
    /// Red tiles beside your leaders: revolt defence, and keeps leaders legal.
    pub nearby_red: f32,
    pub kingdom_size: f32,
    /// Tiles of the leader's own colour inside its kingdom.
    pub colour_tiles: f32,
    /// Treasures inside a green leader's kingdom: they get taken automatically.
    pub green_treasure: f32,
    pub catastrophe: f32,
    pub score_sum: f32,
    /// Value of holding tiles whose colour is running out in the bag.
    pub scarcity: f32,
    /// Penalty for being weakest in a colour the bag has nearly drained.
    pub weak_scarce: f32,
    /// Extra pull of banked score once the bag is nearly empty.
    pub endgame: f32,
    /// Your leader standing inside a monument's kingdom.
    pub monument: f32,
}

impl Default for LeafWeights {
    fn default() -> Self {
        LeafWeights {
            min_score: 150.0,
            imbalance: 5.0,
            treasure: 30.0,
            leader_present: 35.0,
            leaders_placed: 30.0,
            leader_weak: 40.0,
            no_leader_weak: 25.0,
            hand_red: 10.0,
            hand_leader_colour: 5.0,
            nearby_red: 10.0,
            kingdom_size: 2.0,
            colour_tiles: 4.0,
            green_treasure: 20.0,
            catastrophe: 5.0,
            score_sum: 2.0,
            scarcity: 1.0,
            weak_scarce: 3.0,
            endgame: 20.0,
            monument: 40.0,
        }
    }
}

/// Field-level access to [`LeafWeights`], generated so the tuner can walk the
/// coefficients by name without hand-written plumbing (and without the
/// transcription slips that hand-writing invites).
macro_rules! leaf_fields {
    ($($variant:ident => $field:ident),* $(,)?) => {
        #[derive(Clone, Copy, Debug, PartialEq, Eq)]
        pub enum LeafField { $($variant),* }

        impl LeafField {
            pub fn all() -> Vec<LeafField> { vec![$(LeafField::$variant),*] }
            pub fn name(self) -> &'static str {
                match self { $(LeafField::$variant => stringify!($field)),* }
            }
        }

        pub fn leaf_get(w: &LeafWeights, f: LeafField) -> f32 {
            match f { $(LeafField::$variant => w.$field),* }
        }

        pub fn leaf_set(w: &mut LeafWeights, f: LeafField, v: f32) {
            match f { $(LeafField::$variant => w.$field = v),* }
        }
    };
}

leaf_fields! {
    MinScore => min_score,
    Imbalance => imbalance,
    Treasure => treasure,
    LeaderPresent => leader_present,
    LeadersPlaced => leaders_placed,
    LeaderWeak => leader_weak,
    NoLeaderWeak => no_leader_weak,
    HandRed => hand_red,
    HandLeaderColour => hand_leader_colour,
    NearbyRed => nearby_red,
    KingdomSize => kingdom_size,
    ColourTiles => colour_tiles,
    GreenTreasure => green_treasure,
    Catastrophe => catastrophe,
    ScoreSum => score_sum,
    Scarcity => scarcity,
    WeakScarce => weak_scarce,
    Endgame => endgame,
    Monument => monument,
}

/// Serialise weights as a copy-pasteable Rust literal.
pub fn leaf_weights_literal(w: &LeafWeights) -> String {
    let mut s = String::from("LeafWeights {\n");
    for f in LeafField::all() {
        s.push_str(&format!("    {}: {:?},\n", f.name(), leaf_get(w, f)));
    }
    s.push('}');
    s
}

/// Leaf weights produced by `tune --games 40 --seed 7` — **REJECTED, kept only
/// so the failure is reproducible**.
///
/// The tuner moved `min_score` 150→255, `leader_weak` 40→68 and `kingdom_size`
/// 2.0→0.6, each accepted against a `--min-gain` floor that sat far below the
/// objective's own noise (the baseline swung 3.6 points between a 12-game and a
/// 40-game run of identical code). Held-out check on seed 999, 120 games:
/// tuned 3.26 mean score vs incumbent **3.88** — the tuned weights are worse.
///
/// Conclusion: coordinate descent against 40-game 4p matches is not
/// statistically viable at this budget. Effect sizes are under 1 point while
/// run-to-run noise is ~2 points and each evaluation costs ~2 minutes, so
/// resolving a real gain would take on the order of 10^4 games per candidate.
/// Deliberately not the `Default`.
pub const TUNED: LeafWeights = LeafWeights {
    min_score: 255.0,
    imbalance: 5.0,
    treasure: 30.0,
    leader_present: 35.0,
    leaders_placed: 30.0,
    leader_weak: 68.0,
    no_leader_weak: 25.0,
    hand_red: 10.0,
    hand_leader_colour: 5.0,
    nearby_red: 10.0,
    kingdom_size: 0.6,
    colour_tiles: 4.0,
    green_treasure: 20.0,
    catastrophe: 5.0,
    score_sum: 2.0,
    scarcity: 1.0,
    weak_scarce: 3.0,
    endgame: 20.0,
    monument: 40.0,
};

/// The domain evaluator as a pure function of `(state, seat, weights)`.
///
/// This is the form the tuner drives. It is a transcription of
/// `PlayerState::get_eval`, which now delegates here with the default weights.
pub fn tuned_value(state: &TnEGame, player: Player, w: &LeafWeights) -> f32 {
    let ps = state.players.get(player);
    let min_colour = *[
        ps.score_red, ps.score_blue, ps.score_green, ps.score_black,
    ]
    .iter()
    .min()
    .unwrap_or(&0);
    let max_colour = *[
        ps.score_red, ps.score_blue, ps.score_green, ps.score_black,
    ]
    .iter()
    .max()
    .unwrap_or(&0);

    let min_score = ps.calculate_score() as f32;
    let mut s = w.min_score * min_score;
    s -= w.imbalance * (max_colour as f32 - min_colour as f32);
    s += w.treasure * ps.score_treasure as f32;

    // Leader presence, weighted toward the colour you are weakest in.
    let mut leaders_placed = 0.0f32;
    let mut leader_bonus = 0.0f32;
    for (leader, score) in [
        (Leader::Red, ps.score_red),
        (Leader::Blue, ps.score_blue),
        (Leader::Green, ps.score_green),
        (Leader::Black, ps.score_black),
    ] {
        if ps.get_leader(leader).is_some() {
            leaders_placed += 1.0;
            if score == min_colour {
                leader_bonus += w.leader_weak;
            }
            leader_bonus += w.leader_present;
        } else if score == min_colour {
            s -= w.no_leader_weak;
        }
    }
    s += leaders_placed * w.leaders_placed;
    s += leader_bonus;

    // Red in hand is revolt ammunition.
    s += w.hand_red * ps.hand_red.min(4) as f32;
    for l in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
        if ps.get_leader(l).is_some() {
            s += w.hand_leader_colour * ps.get_hand(l.as_tile_type()).min(3) as f32;
        }
    }

    // Kingdom shape, computed once per distinct kingdom.
    let connectable = state.board.connectable_bitboard();
    let mut visited = Bitboard::new();
    for leader in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
        if let Some(pos) = ps.get_leader(leader) {
            s += w.nearby_red * (pos.neighbors() & state.board.red_tiles).count_ones() as f32;
            if !visited.get(pos) {
                let kingdom = state.board.find_kingdom_map_fast(pos, connectable);
                visited |= kingdom;
                s += w.kingdom_size * kingdom.count_ones().min(15) as f32;
                let tiles = match leader {
                    Leader::Red => (kingdom & state.board.red_tiles).count_ones(),
                    Leader::Blue => (kingdom & state.board.blue_tiles).count_ones(),
                    Leader::Green => (kingdom & state.board.green_tiles).count_ones(),
                    Leader::Black => (kingdom & state.board.black_tiles).count_ones(),
                    Leader::None => 0,
                };
                s += w.colour_tiles * tiles as f32;
                if leader == Leader::Green {
                    s += w.green_treasure
                        * (kingdom & state.board.treasures).count_ones() as f32;
                }
            }
        }
    }

    s += w.catastrophe * ps.num_catastrophes as f32;
    s += w.score_sum * ps.score_sum() as f32;

    // Bag scarcity: tiles of a colour that is running out are worth more, and
    // being weakest in a drained colour is close to unrecoverable.
    let bag = state.bag();
    let bag_total = bag.sum() as f32;
    if bag_total > 0.0 {
        let scarcity = |bag_c: u8| if bag_c < 10 { (10 - bag_c) as f32 } else { 0.0 };
        s += w.scarcity * ps.hand_red as f32 * scarcity(bag.red);
        s += w.scarcity * ps.hand_blue as f32 * scarcity(bag.blue);
        s += w.scarcity * ps.hand_green as f32 * scarcity(bag.green);
        s += w.scarcity * ps.hand_black as f32 * scarcity(bag.black);

        for (score, bag_c) in [
            (ps.score_red, bag.red),
            (ps.score_blue, bag.blue),
            (ps.score_green, bag.green),
            (ps.score_black, bag.black),
        ] {
            if score == min_colour && bag_c < 5 {
                s -= w.weak_scarce * (5 - bag_c) as f32;
            }
        }
    }

    if bag_total < 20.0 {
        s += w.endgame * min_score;
    }

    for m in &state.monuments {
        let kingdom = state.board.find_kingdom_map_fast(m.pos_top_left, connectable);
        for l in m.monument_type.unpack() {
            if let Some(pos) = ps.get_leader(l) {
                if kingdom.get(pos) {
                    s += w.monument;
                }
            }
        }
    }

    s
}

/// Factorized view of an action: `(kind, position, colour, magnitude)`.
///
/// The engine consumes `Action`; the agent scores/priors actions through this
/// view so priors can be grouped and ties broken deterministically.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Factor {
    pub kind: ActionKind,
    pub pos: Option<Pos>,
    pub colour: Option<TileType>,
    pub magnitude: u8,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum ActionKind {
    PlaceTile,
    PlaceLeader,
    WithdrawLeader,
    PlaceCatastrophe,
    TakeTreasure,
    BuildMonument,
    DeclineMonument,
    WarSelectLeader,
    AddSupport,
    ReplaceTile,
    Pass,
}

impl Factor {
    /// Deterministic key for tie-breaking and indexing.
    pub fn key(&self) -> u32 {
        let kind = self.kind as u32;
        let pos = self
            .pos
            .map(|p| (p.x as u32) * W as u32 + p.y as u32)
            .unwrap_or(0);
        let colour = match self.colour {
            Some(TileType::Blue) => 1,
            Some(TileType::Green) => 2,
            Some(TileType::Red) => 3,
            Some(TileType::Black) => 4,
            _ => 0,
        };
        ((kind * (H as u32 * W as u32 + 1) + pos) * 5 + colour) * 8 + self.magnitude as u32
    }
}

impl From<&Action> for Factor {
    fn from(a: &Action) -> Self {
        match *a {
            Action::PlaceTile { pos, tile_type } => Factor {
                kind: ActionKind::PlaceTile,
                pos: Some(pos),
                colour: Some(tile_type),
                magnitude: 0,
            },
            Action::PlaceLeader { pos, leader } => Factor {
                kind: ActionKind::PlaceLeader,
                pos: Some(pos),
                colour: Some(leader.as_tile_type()),
                magnitude: 0,
            },
            Action::WithdrawLeader(pos) => Factor {
                kind: ActionKind::WithdrawLeader,
                pos: Some(pos),
                colour: None,
                magnitude: 0,
            },
            Action::PlaceCatastrophe(pos) => Factor {
                kind: ActionKind::PlaceCatastrophe,
                pos: Some(pos),
                colour: None,
                magnitude: 0,
            },
            Action::TakeTreasure(pos) => Factor {
                kind: ActionKind::TakeTreasure,
                pos: Some(pos),
                colour: None,
                magnitude: 0,
            },
            Action::BuildMonument(m) => Factor {
                kind: ActionKind::BuildMonument,
                pos: None,
                colour: None,
                magnitude: m as u8,
            },
            Action::DeclineMonument => Factor {
                kind: ActionKind::DeclineMonument,
                pos: None,
                colour: None,
                magnitude: 0,
            },
            Action::WarSelectLeader(l) => Factor {
                kind: ActionKind::WarSelectLeader,
                pos: None,
                colour: Some(l.as_tile_type()),
                magnitude: 0,
            },
            Action::AddSupport(n) => Factor {
                kind: ActionKind::AddSupport,
                pos: None,
                colour: None,
                magnitude: n,
            },
            // The payload matters: every swap was previously mapped to the
            // same key, so after sorting they clustered together and the
            // following `dedup()` silently discarded every distinct swap —
            // replacing one red tile and replacing two black tiles collapsed
            // into a single action.
            Action::ReplaceTile(t) => {
                let singles = [
                    (TileType::Red, t.red),
                    (TileType::Blue, t.blue),
                    (TileType::Green, t.green),
                    (TileType::Black, t.black),
                ];
                let non_zero: Vec<(TileType, u8)> =
                    singles.iter().filter(|(_, n)| *n > 0).map(|(c, n)| (*c, *n)).collect();
                match non_zero.as_slice() {
                    [(c, n)] => Factor {
                        kind: ActionKind::ReplaceTile,
                        pos: None,
                        colour: Some(*c),
                        magnitude: *n,
                    },
                    // Multi-colour swaps (not produced by the generator, but a
                    // legal action) keep a stable, distinct key.
                    _ => Factor {
                        kind: ActionKind::ReplaceTile,
                        pos: None,
                        colour: None,
                        magnitude: (t.red as u16
                            + t.blue as u16 * 2
                            + t.green as u16 * 4
                            + t.black as u16 * 8) as u8,
                    },
                }
            }
            Action::Pass => Factor {
                kind: ActionKind::Pass,
                pos: None,
                colour: None,
                magnitude: 0,
            },
        }
    }
}

/// Weights for the domain evaluator. Kept plain so callers can build
/// alternate "personalities" for map validation (PRD 004 §7).
#[derive(Clone, Copy, Debug)]
pub struct EvalWeights {
    pub min_score: f32,
    pub score_sum: f32,
    pub treasure: f32,
    pub leaders: f32,
    pub balance: f32,
    pub kingdom: f32,
    pub monument: f32,
    pub conflict: f32,
    pub endgame: f32,
    pub scale: f32,
}

impl Default for EvalWeights {
    fn default() -> Self {
        EvalWeights {
            min_score: 8.0,
            score_sum: 0.6,
            treasure: 1.5,
            leaders: 0.6,
            balance: 0.8,
            kingdom: 0.2,
            monument: 2.0,
            conflict: 0.4,
            endgame: 2.0,
            scale: 100.0,
        }
    }
}

/// Domain-specific evaluator producing a per-player utility vector in `[0,1]`.
#[derive(Clone, Copy, Debug, Default)]
pub struct DomainEvaluator {
    pub weights: EvalWeights,
    /// Leaf coefficients under tuning. `None` = use `PlayerState::get_eval`
    /// unchanged.
    pub leaf_weights: Option<LeafWeights>,
}

impl DomainEvaluator {
    pub fn new() -> Self {
        Self {
            weights: EvalWeights::default(),
            leaf_weights: None,
        }
    }

    pub fn with_weights(weights: EvalWeights) -> Self {
        Self {
            weights,
            leaf_weights: None,
        }
    }

    /// Raw (unnormalised) heuristic value for one player.
    ///
    /// Delegates to the engine's tuned per-player heuristic
    /// (`PlayerState::get_eval`), which is stronger than a hand-rolled blend.
    /// `EvalWeights.min_score` scales overall sharpness so alternate
    /// "personalities" remain possible.
    fn raw_utility(&self, state: &TnEGame, player: Player) -> f32 {
        let ps = state.players.get(player);
        match self.leaf_weights {
            Some(w) => crate::eval::tuned_value(state, player, &w),
            None => {
                let base = ps.get_eval(state) as f32;
                base * (self.weights.min_score / 8.0).max(0.1)
            }
        }
    }

    #[allow(dead_code)]
    fn raw_utility_domain(&self, state: &TnEGame, player: Player) -> f32 {
        let w = &self.weights;
        let ps = state.players.get(player);
        let mut s = 0.0;

        let min_score = ps.calculate_score() as f32;
        let scores = [ps.score_red, ps.score_blue, ps.score_green, ps.score_black];
        let max_c = scores.iter().copied().max().unwrap_or(0) as f32;

        s += min_score * w.min_score;
        s += ps.score_sum() as f32 * w.score_sum;
        s += ps.score_treasure as f32 * w.treasure;

        // Balance: penalise a wide spread between best and worst colour.
        s -= (max_c - min_score) * w.balance;

        // Leaders: presence + adjacency to temples (revolt defence).
        let connectable = state.board.connectable_bitboard();
        let mut visited = crate::game::Bitboard::new();
        for leader in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
            if let Some(pos) = ps.get_leader(leader) {
                s += w.leaders;
                let nearby_red = (pos.neighbors() & state.board.red_tiles).count_ones();
                s += nearby_red as f32 * w.conflict;
                if !visited.get(pos) {
                    let kmap = state.board.find_kingdom_map_fast(pos, connectable);
                    visited |= kmap;
                    s += kmap.count_ones() as f32 * w.kingdom;
                    if leader == Leader::Green {
                        let treasures = (kmap & state.board.treasures).count_ones();
                        s += treasures as f32 * w.treasure * 2.0;
                    }
                }
            }
        }

        // Monument control: matching leaders inside the monument kingdom.
        for m in &state.monuments {
            let kmap = state
                .board
                .find_kingdom_map_fast(m.pos_top_left, connectable);
            for leader in m.monument_type.unpack() {
                if let Some(pos) = ps.get_leader(leader) {
                    if kmap.get(pos) {
                        s += w.monument;
                    }
                }
            }
        }

        // Conflict readiness: same-colour tiles in hand (red for revolts).
        s += (ps.hand_red.min(4) as f32) * w.conflict;
        for leader in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
            if ps.get_leader(leader).is_some() {
                s += (ps.get_hand(leader.as_tile_type()).min(4) as f32) * w.conflict * 0.5;
            }
        }

        // Endgame: bag scarcity sharpens the value of final scoring.
        let bag_total = state.bag().sum() as f32;
        if bag_total < 24.0 {
            s += min_score * w.endgame;
        }

        s
    }

    /// Per-player utility vector in `[0,1]`, indexed by seat.
    ///
    /// Uses a logistic squash of each player's value against the field mean, so
    /// values are comparable across player counts.
    ///
    /// The squash scale is **fixed** (`weights.scale`, in raw-eval units). A
    /// data-dependent normalisation is a trap: with `mean` and a MAD divisor,
    /// two players reduce to `(raw_i - mean)/|raw_i - raw_j| = ±0.5`, so every
    /// non-tied leaf collapses to the same two values (≈0.12/0.88). The search
    /// then has no gradient and picks moves essentially at random. Fixing the
    /// scale keeps the signal monotone and graded in the actual margin, which
    /// is what makes the tree search useful.
    pub fn utility_vector(&self, state: &TnEGame) -> [f32; 4] {
        let n = state.num_players as usize;
        if n == 0 {
            return [0.0; 4];
        }
        let raw: Vec<f32> = (0..n)
            .map(|i| self.raw_utility(state, Player::from_index(i)))
            .collect();
        let mean = raw.iter().sum::<f32>() / n as f32;
        let k = self.weights.scale.max(1.0);
        let mut u = [0.5f32; 4];
        for i in 0..n {
            u[i] = 0.5 + 0.5 * ((raw[i] - mean) / k).tanh();
        }
        u
    }

    /// Terminal utility vector: winner 1.0, losers 0.0, ties split evenly.
    pub fn terminal_vector(state: &TnEGame) -> [f32; 4] {
        let n = state.num_players as usize;
        let mut u = [0.0f32; 4];
        if n == 0 {
            return u;
        }
        let standings = state.standings();
        let top = standings.first().map(|(_, s)| *s).unwrap_or(0);
        let winners: Vec<Player> = standings
            .iter()
            .filter(|(_, s)| *s == top)
            .map(|(p, _)| *p)
            .collect();
        let share = 1.0 / winners.len() as f32;
        for w in winners {
            if let Some(i) = w.index() {
                u[i] = share;
            }
        }
        u
    }

    /// One-ply lookahead prior weights (PRD-AI-STRENGTH C1).
    ///
    /// Ranks each child by the acting player's raw evaluator score after the
    /// move. This strictly dominates the hand-tuned [`prior_weights`]: it is
    /// the same signal a 1-ply negamax baseline uses, so top-K pruning keeps
    /// genuinely strong moves (rather than whatever the hand weights fancy)
    /// and the tree search refines them. Weights are shifted positive and
    /// unnormalised.
    pub fn shallow_prior_weights(&self, state: &TnEGame, actions: &[Action]) -> Vec<f32> {
        let actor = state.next_player();
        let raw: Vec<Option<f32>> = actions
            .iter()
            .map(|a| {
                let mut child = state.clone();
                if child.process(*a).is_err() {
                    return None;
                }
                Some(self.raw_utility(&child, actor))
            })
            .collect();
        let min = raw
            .iter()
            .flatten()
            .copied()
            .fold(f32::INFINITY, f32::min);
        let min = if min.is_finite() { min } else { 0.0 };
        raw.into_iter()
            .map(|r| match r {
                Some(v) => (v - min) + 1.0,
                None => 0.001,
            })
            .collect()
    }
}

/// Tunable prior weights for the hand-written action heuristic.
///
/// All numbers map directly to the magic constants in [`prior_weights`].
/// Defaults preserve the pre-tunable behaviour; override individual fields via
/// the CLI (`--priors key=value,...`) or programmatically by constructing a
/// non-default value and passing it through `AzConfig`.
#[derive(Clone, Copy, Debug)]
pub struct PriorWeights {
    // PlaceTile
    pub tile_base: f32,             // 10.0
    pub tile_our_kingdom: f32,      // 8.0
    pub tile_weak_color: f32,       // 8.0
    pub tile_opp_denial: f32,       // 1.0
    pub tile_red_bonus: f32,        // 1.0 (temple utility)

    // PlaceLeader
    pub leader_base: f32,           // 4.0
    pub leader_already_placed: f32, // -2.0
    pub leader_weak_color: f32,     // 3.0
    pub leader_red_nearby: f32,     // 1.0
    pub leader_kingdom_size: f32,   // 0.2 per cell

    // WithdrawLeader
    pub withdraw: f32,              // -5.0

    // PlaceCatastrophe
    pub catastrophe_base: f32,           // 3.0
    pub catastrophe_monument: f32,       // 4.0 (near a monument)
    /// Breaking the last temple supporting a leader removes that leader.
    /// Applied positively to an opponent's leader and negatively to our own.
    pub catastrophe_leader_kill: f32,    // 10.0
    /// Per opposing kingdom whose frontier this square removes.
    pub catastrophe_enemy_frontier: f32, // 1.0
    /// Penalty for wasting a square our own kingdom could still score on.
    pub catastrophe_own_frontier: f32,   // -0.5

    // Treasures & monuments
    pub take_treasure: f32,         // 8.0
    pub build_monument: f32,        // 5.0
    pub decline_monument: f32,      // -1.0

    // Catch-alls
    pub replace_tile: f32,          // 0.5
    pub pass_value: f32,            // -2.0

    // Prior on moves that start a conflict, per point of expected margin
    // (base + matching tiles in hand, mine minus theirs). 0 = off.
    pub attack_odds: f32,           // 0.0
}

impl Default for PriorWeights {
    fn default() -> Self {
        Self {
            tile_base: 10.0,
            tile_our_kingdom: 8.0,
            tile_weak_color: 8.0,
            tile_opp_denial: 1.0,
            tile_red_bonus: 1.0,

            leader_base: 4.0,
            leader_already_placed: -2.0,
            leader_weak_color: 3.0,
            leader_red_nearby: 1.0,
            leader_kingdom_size: 0.2,

            withdraw: -5.0,

            catastrophe_base: 3.0,
            catastrophe_monument: 4.0,
            catastrophe_leader_kill: 10.0,
            catastrophe_enemy_frontier: 1.0,
            catastrophe_own_frontier: -0.5,

            take_treasure: 8.0,
            build_monument: 5.0,
            decline_monument: -1.0,

            replace_tile: 0.5,
            pass_value: -2.0,

            attack_odds: 0.0,
        }
    }
}

impl PriorWeights {
    /// Parse a `key=value,key=value,...` override string. Unknown keys are
    /// rejected with an error listing the valid keys.
    pub fn parse_overrides(s: &str) -> Result<Self, String> {
        let mut out = Self::default();
        for pair in s.split(',') {
            let pair = pair.trim();
            if pair.is_empty() {
                continue;
            }
            let (k, v) = pair.split_once('=').ok_or_else(|| {
                format!("expected key=value, got '{pair}'")
            })?;
            let k = k.trim();
            let v: f32 = v.trim().parse().map_err(|_| {
                format!("invalid f32 for key '{k}': '{v}'")
            })?;
            let slot = match k {
                "tile_base" => &mut out.tile_base,
                "tile_our_kingdom" => &mut out.tile_our_kingdom,
                "tile_weak_color" => &mut out.tile_weak_color,
                "tile_opp_denial" => &mut out.tile_opp_denial,
                "tile_red_bonus" => &mut out.tile_red_bonus,

                "leader_base" => &mut out.leader_base,
                "leader_already_placed" => &mut out.leader_already_placed,
                "leader_weak_color" => &mut out.leader_weak_color,
                "leader_red_nearby" => &mut out.leader_red_nearby,
                "leader_kingdom_size" => &mut out.leader_kingdom_size,

                "withdraw" => &mut out.withdraw,

                "catastrophe_base" => &mut out.catastrophe_base,
                "catastrophe_monument" => &mut out.catastrophe_monument,
                "catastrophe_leader_kill" => &mut out.catastrophe_leader_kill,
                "catastrophe_enemy_frontier" => &mut out.catastrophe_enemy_frontier,
                "catastrophe_own_frontier" => &mut out.catastrophe_own_frontier,

                "take_treasure" => &mut out.take_treasure,
                "build_monument" => &mut out.build_monument,
                "decline_monument" => &mut out.decline_monument,

                "replace_tile" => &mut out.replace_tile,
                "pass" => &mut out.pass_value,
                "attack_odds" => &mut out.attack_odds,

                other => {
                    return Err(format!(
                        "unknown prior key '{other}'; valid keys: \
                         tile_base, tile_our_kingdom, tile_weak_color, \
                         tile_opp_denial, tile_red_bonus, leader_base, \
                         leader_already_placed, leader_weak_color, \
                         leader_red_nearby, leader_kingdom_size, withdraw, \
                         catastrophe_base, catastrophe_monument, \
                         catastrophe_leader_kill, catastrophe_enemy_frontier, \
                         catastrophe_own_frontier, \
                         take_treasure, build_monument, decline_monument, \
                         replace_tile, pass, attack_odds"
                    ));
                }
            };
            *slot = v;
        }
        Ok(out)
    }
}

/// Heuristic prior weights for candidate actions, from the perspective of the
/// player to move. Higher = more promising. Unnormalised.
pub fn prior_weights(state: &TnEGame, actions: &[Action], pw: &PriorWeights) -> Vec<f32> {
    let actor = state.next_player();
    let ps = state.players.get(actor);
    let scores = [ps.score_red, ps.score_blue, ps.score_green, ps.score_black];
    let min_color = *scores.iter().min().unwrap();
    let connectable = state.board.connectable_bitboard();

    // Every leader's kingdom, computed ONCE. The previous version called
    // `find_kingdom_map_fast` inside the per-action loop — twice for tile
    // placements (own leader, then every opponent's every leader) — so a node
    // with ~150 tile actions ran on the order of 1800 identical flood fills.
    let mut kingdoms: Vec<(Player, Vec<(Leader, Bitboard)>)> = Vec::new();
    for i in 0..state.num_players as usize {
        let p = Player::from_index(i);
        let owner = state.players.get(p);
        let mut ks = Vec::new();
        for l in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
            if let Some(lp) = owner.get_leader(l) {
                if !ks.iter().any(|(kl, _)| *kl == l) {
                    ks.push((l, state.board.find_kingdom_map_fast(lp, connectable)));
                }
            }
        }
        kingdoms.push((p, ks));
    }

    // One union per player. Frontier denial is measured against each player's
    // whole territory, matching `expected_final_score`'s capacity model.
    let kingdom_unions: Vec<(Player, Bitboard)> = kingdoms
        .iter()
        .map(|(p, ks)| {
            let mut union = Bitboard::new();
            for (_, k) in ks {
                union |= *k;
            }
            (*p, union)
        })
        .collect();

    let kingdom_of = |p: Player, l: Leader| -> Option<Bitboard> {
        kingdoms
            .iter()
            .find(|(kp, _)| *kp == p)
            .and_then(|(_, ks)| ks.iter().find(|(kl, _)| *kl == l).map(|(_, k)| *k))
    };
    let opponent_kingdom_touching =
        |_pos: Pos, neigh: Bitboard| -> Option<Player> {
            kingdoms
                .iter()
                .filter(|(kp, _)| *kp != actor)
                .find(|(_, ks)| {
                    ks.iter().any(|(_, k)| (neigh & *k).count_ones() > 0)
                })
                .map(|(kp, _)| *kp)
        };

    let mut placement_cache: Vec<(Pos, Bitboard)> = Vec::new();
    actions
        .iter()
        .map(|a| {
            let mut w: f32 = 1.0;
            match *a {
                Action::PlaceTile { pos, tile_type } => {
                    // Does this tile fall into a kingdom led by us / by an
                    // opponent? Reward scoring our weakest colour; reward
                    // denial of an opponent's score.
                    let leader = tile_type.as_leader_via_type();
                    let neighbours = pos.neighbors();
                    let our_kingdom = kingdom_of(actor, leader)
                        .filter(|k| (neighbours & *k).count_ones() > 0);

                    let our_score = leader_score(ps, tile_type);
                    w += pw.tile_base;
                    if our_kingdom.is_some() {
                        w += pw.tile_our_kingdom;
                        if our_score == min_color {
                            w += pw.tile_weak_color; // improves weakest colour
                        }
                    }
                    // Denial: tile lands next to an opponent kingdom.
                    if let Some(opp) = opponent_kingdom_touching(pos, neighbours) {
                        let _ = opp;
                        w += pw.tile_opp_denial;
                        if pw.attack_odds != 0.0 { w += pw.attack_odds * attack_margin(state, *a, actor); }
                    }
                    if tile_type == TileType::Red {
                        w += pw.tile_red_bonus; // temple utility (leader support/defence)
                    }
                }
                Action::PlaceLeader { pos, leader } => {
                    if pw.attack_odds != 0.0 { w += pw.attack_odds * attack_margin(state, *a, actor); }
                    if ps.get_leader(leader).is_some() {
                        w += pw.leader_already_placed;
                    } else {
                        w += pw.leader_base;
                        if leader_score(ps, leader.as_tile_type()) == min_color {
                            w += pw.leader_weak_color; // shore up weakest colour
                        }
                        let nearby_red = (pos.neighbors() & state.board.red_tiles).count_ones();
                        w += nearby_red as f32 * pw.leader_red_nearby;
                        // The kingdom here is the one the leader WOULD land
                        // in — flooded from the candidate square `pos`, not
                        // from wherever that leader currently sits. Memoised
                        // per square because each candidate position is offered
                        // once per unplaced leader.
                        let kmap = match placement_cache.iter().find(|(cp, _)| *cp == pos) {
                            Some((_, k)) => *k,
                            None => {
                                let k = state.board.find_kingdom_map_fast(pos, connectable);
                                placement_cache.push((pos, k));
                                k
                            }
                        };
                        w += kmap.count_ones() as f32 * pw.leader_kingdom_size;
                    }
                }
                Action::WithdrawLeader(_) => w += pw.withdraw,
                Action::PlaceCatastrophe(pos) => {
                    w += pw.catastrophe_base;
                    // Disrupting a monument is valuable.
                    for m in &state.monuments {
                        if m.pos_top_left.manhattan_distance(pos) <= 2 {
                            w += pw.catastrophe_monument;
                        }
                    }

                    // A catastrophe on a red tile that is a leader's *only*
                    // adjacent temple removes that leader (R11.3/L88). Reward
                    // killing an opponent, penalise killing one of our own.
                    if state.board.get_tile_type(pos) == TileType::Red {
                        for i in 0..state.num_players as usize {
                            let owner = Player::from_index(i);
                            let owner_state = state.players.get(owner);
                            for l in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
                                let Some(leader_pos) = owner_state.get_leader(l) else {
                                    continue;
                                };
                                let adjacent = leader_pos.neighbors().get(pos);
                                if adjacent
                                    && (leader_pos.neighbors() & state.board.red_tiles).count_ones() == 1
                                {
                                    if owner == actor {
                                        w -= pw.catastrophe_leader_kill;
                                    } else {
                                        w += pw.catastrophe_leader_kill;
                                    }
                                }
                            }
                        }
                    }

                    // A catastrophe on an empty non-river square next to a
                    // kingdom permanently removes a space that kingdom could
                    // have scored on. Denying an opponent is good; wasting our
                    // own capacity is bad.
                    if state.board.get_tile_type(pos) == TileType::Empty
                        && !state.board.river.get(pos)
                    {
                        let neighbours = pos.neighbors();
                        for (owner, kingdom) in &kingdom_unions {
                            if (neighbours & *kingdom).count_ones() == 0 {
                                continue;
                            }
                            if *owner == actor {
                                w += pw.catastrophe_own_frontier;
                            } else {
                                w += pw.catastrophe_enemy_frontier;
                            }
                        }
                    }
                }
                Action::TakeTreasure(_) => w += pw.take_treasure,
                Action::BuildMonument(_) => w += pw.build_monument,
                Action::DeclineMonument => w += pw.decline_monument,
                Action::WarSelectLeader(_) | Action::AddSupport(_) => {
                    // Conflict actions: weight by local material swing.
                    w += conflict_prior(state, actor);
                }
                Action::ReplaceTile(_) => w += pw.replace_tile,
                Action::Pass => w += pw.pass_value,
            }
            w.max(0.001)
        })
        .collect()
}

/// Simple estimate of how favourable an ongoing conflict is for `actor`.
fn conflict_prior(state: &TnEGame, actor: Player) -> f32 {
    let c = if let Some(c) = state.internal_conflict.as_ref() {
        c
    } else if let Some(ext) = state.external_conflict.as_ref() {
        // Use the most relevant conflict for the actor, else the first.
        ext.conflicts
            .iter()
            .find(|c| c.attacker == actor || c.defender == actor)
            .or_else(|| ext.conflicts.first())
            .unwrap_or(&ext.conflicts[0])
    } else {
        return 0.0;
    };
    let (mine, theirs) = if c.attacker == actor {
        (c.attacker_base_strength, c.defender_base_strength)
    } else {
        (c.defender_base_strength, c.attacker_base_strength)
    };
    let swing = mine as f32 - theirs as f32;
    (2.0 + swing).max(0.0)
}

/// Expected margin of a conflict `a` would start, from `actor`'s side: base
/// strength plus matching tiles in hand, mine minus theirs. Ties go to the
/// defender, so an attacker's margin is shifted down by one. 0 if `a` starts
/// no conflict involving `actor`. Clamped so one fight can't swamp the prior.
fn attack_margin(state: &TnEGame, a: Action, actor: Player) -> f32 {
    let mut child = state.clone();
    if child.process(a).is_err() {
        return 0.0;
    }
    let c = match (&child.internal_conflict, &child.external_conflict) {
        (Some(c), _) => *c,
        (None, Some(e)) => match e.conflicts.iter().find(|c| c.attacker == actor || c.defender == actor) {
            Some(c) => *c,
            None => return 0.0,
        },
        _ => return 0.0,
    };
    let hand = |p: Player| {
        let ps = child.players.get(p);
        (match (c.is_internal, c.conflict_leader) {
            (true, _) | (false, Leader::Red) => ps.hand_red,
            (false, Leader::Blue) => ps.hand_blue,
            (false, Leader::Green) => ps.hand_green,
            (false, Leader::Black) => ps.hand_black,
            (false, Leader::None) => 0,
        }) as f32
    };
    let att = c.attacker_base_strength as f32 + hand(c.attacker);
    let def = c.defender_base_strength as f32 + hand(c.defender);
    let m = if c.attacker == actor { att - def - 1.0 } else { def - att };
    m.clamp(-4.0, 4.0)
}

/// True if any opponent leader's kingdom touches `pos`.
fn any_opponent_kingdom_adjacent(state: &TnEGame, pos: Pos) -> Option<Player> {
    let connectable = state.board.connectable_bitboard();
    let neighbours = pos.neighbors();
    for i in 0..state.num_players as usize {
        let p = Player::from_index(i);
        if p == state.next_player() {
            continue;
        }
        let ops = state.players.get(p);
        for leader in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
            if let Some(lp) = ops.get_leader(leader) {
                let kmap = state.board.find_kingdom_map_fast(lp, connectable);
                if (neighbours & kmap).count_ones() > 0 {
                    return Some(p);
                }
            }
        }
    }
    None
}

fn leader_score(ps: &crate::game::PlayerState, t: TileType) -> u8 {
    match t {
        TileType::Red => ps.score_red,
        TileType::Blue => ps.score_blue,
        TileType::Green => ps.score_green,
        TileType::Black => ps.score_black,
        TileType::Empty => 0,
    }
}

/// Normalise prior weights into a distribution with a probability floor
/// `epsilon` so the search can still discover moves the priors underestimate.
pub fn normalize_priors(weights: &[f32], epsilon: f32) -> Vec<f32> {
    let n = weights.len();
    if n == 0 {
        return vec![];
    }
    let total: f32 = weights.iter().sum();
    let mut out: Vec<f32> = if total > 0.0 {
        weights.iter().map(|w| w / total).collect()
    } else {
        vec![1.0 / n as f32; n]
    };
    let floor = epsilon / n as f32;
    // Blend: (1-eps) * p + floor.
    for p in out.iter_mut() {
        *p = (1.0 - epsilon) * *p + floor;
    }
    // Re-normalise to guard against float drift.
    let s: f32 = out.iter().sum();
    if s > 0.0 {
        for p in out.iter_mut() {
            *p /= s;
        }
    }
    out
}

/// Compatibility helper: build a `Tiles` from a single colour count.
pub fn tiles_of(t: TileType, n: u8) -> Tiles {
    match t {
        TileType::Red => Tiles { red: n, black: 0, green: 0, blue: 0 },
        TileType::Black => Tiles { red: 0, black: n, green: 0, blue: 0 },
        TileType::Green => Tiles { red: 0, black: 0, green: n, blue: 0 },
        TileType::Blue => Tiles { red: 0, black: 0, green: 0, blue: n },
        TileType::Empty => Tiles { red: 0, black: 0, green: 0, blue: 0 },
    }
}

/// Helper used by priors: convert a tile colour to its leader colour.
trait TileLeader {
    fn as_leader_via_type(&self) -> Leader;
}
impl TileLeader for TileType {
    fn as_leader_via_type(&self) -> Leader {
        match self {
            TileType::Red => Leader::Red,
            TileType::Blue => Leader::Blue,
            TileType::Green => Leader::Green,
            TileType::Black => Leader::Black,
            TileType::Empty => Leader::None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::maps::MapSpec;
    use crate::pos;

    /// Regression (PRD-AI-STRENGTH A/B): the two-player utility must stay a
    /// graded, monotone function of the score margin. The old MAD-normalised
    /// squash collapsed every non-tied 2p position to the same pair of values
    /// (≈0.12/0.88), so the search had no gradient and played at random.
    #[test]
    fn two_player_utility_is_graded_in_margin() {
        let ev = DomainEvaluator::new();
        let base = MapSpec::default_map().start_game(2, 1);

        let mut prev_gap = {
            let u = ev.utility_vector(&base);
            assert!((u[0] + u[1] - 1.0).abs() < 1e-4, "2p utilities sum to 1");
            u[0] - u[1]
        };

        for extra in [1u8, 2, 3, 4] {
            let mut h = base.clone();
            let ps = &mut h.players.0[0];
            ps.score_red += extra;
            ps.score_blue += extra;
            ps.score_green += extra;
            ps.score_black += extra;
            let u = ev.utility_vector(&h);
            let gap = u[0] - u[1];
            assert!(
                gap > prev_gap,
                "utility gap must grow with the margin (extra={extra})"
            );
            assert!((u[0] + u[1] - 1.0).abs() < 1e-4, "2p utilities sum to 1");
            prev_gap = gap;
        }
    }

    /// Catastrophes used to be a flat prior, so every square tied and the
    /// search only ever saw the first one in row-major order. These two
    /// positional terms must make an opponent's weak-temple square outrank a
    /// frontier square, which must in turn outrank an irrelevant one.
    #[test]
    fn catastrophe_prior_prefers_leader_kills_and_frontier_denial() {
        let mut game = MapSpec::default_map().start_game(2, 0);
        let actor = game.next_player();
        let enemy = if actor == Player::Player1 {
            Player::Player2
        } else {
            Player::Player1
        };

        // A red temple at (5,4) is the enemy leader's only adjacent temple.
        let temple = pos!(5, 4);
        let leader = pos!(5, 5);
        game.board.set_tile_type(temple, TileType::Red);
        game.board.set_leader(leader, Leader::Red);
        game.board.set_player(leader, enemy);
        game.players.0[enemy.index().unwrap()].placed_red_leader = Some(leader);

        let pw = PriorWeights::default();
        let kill = Action::PlaceCatastrophe(temple);
        let deny = Action::PlaceCatastrophe(pos!(5, 6)); // frontier, not a temple
        let neutral = Action::PlaceCatastrophe(pos!(0, 0));
        let w = prior_weights(&game, &[kill, deny, neutral], &pw);

        assert!(
            w[0] > w[1],
            "killing the leader must outrank denying one square: {w:?}"
        );
        assert!(
            w[1] > w[2],
            "denying an enemy frontier square must outrank a neutral square: {w:?}"
        );
        // `prior_weights` starts every action at 1.0.
        let base = 1.0 + pw.catastrophe_base;
        assert!((w[0] - (base + pw.catastrophe_leader_kill)).abs() < 1e-6);
        assert!((w[1] - (base + pw.catastrophe_enemy_frontier)).abs() < 1e-6);
        assert!((w[2] - base).abs() < 1e-6);
    }
}
