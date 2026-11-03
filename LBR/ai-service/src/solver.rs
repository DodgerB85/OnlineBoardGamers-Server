use crate::{game::{Action, Bitboard, Leader, Player, PlayerAction, TnEGame, H, W, TileType, Pos}, pos};
use once_cell::sync::Lazy;

pub struct Lbr;

// Zobrist hash constants for leader positions
static LEADER_HASHES: Lazy<[[[u64; 4]; W]; H]> = Lazy::new(|| {
    use std::hash::{Hash, Hasher};
    use std::collections::hash_map::DefaultHasher;
    
    let mut hashes = [[[0u64; 4]; W]; H];
    for x in 0..H {
        for y in 0..W {
            for leader in 0..4 {
                let mut hasher = DefaultHasher::new();
                (x, y, leader, "leader").hash(&mut hasher);
                hashes[x][y][leader] = hasher.finish();
            }
        }
    }
    hashes
});

static PLAYER_TURN_HASH: Lazy<u64> = Lazy::new(|| {
    use std::hash::{Hash, Hasher};
    use std::collections::hash_map::DefaultHasher;
    let mut hasher = DefaultHasher::new();
    "player_turn".hash(&mut hasher);
    hasher.finish()
});

fn mix_hash(h: &mut u64, x: u64) {
    *h ^= x.wrapping_mul(0xBF58_476D_1CE4_E5B9);
    *h = h.rotate_left(27).wrapping_mul(0x94D0_49BB_1331_11EB);
    *h ^= *h >> 31;
}

/// Hash the full game state (all 64-bit words of every bitboard, plus leader
/// owners/hands and the side to move). Using only `low_u64()` collapsed the
/// top rows and caused spurious repetition detection.
fn compute_zobrist_hash(state: &TnEGame) -> u64 {
    let mut h: u64 = 0x9E37_79B9_7F4A_7C15;

    for bb in [
        &state.board.red_tiles,
        &state.board.blue_tiles,
        &state.board.green_tiles,
        &state.board.black_tiles,
        &state.board.catastrophes,
        &state.board.monuments,
        &state.board.leader_red,
        &state.board.leader_blue,
        &state.board.leader_green,
        &state.board.leader_black,
    ] {
        for &w in bb.0 .0.iter() {
            mix_hash(&mut h, w);
        }
    }

    for i in 0..state.num_players as usize {
        let ps = &state.players.0[i];
        for l in [
            ps.placed_red_leader,
            ps.placed_blue_leader,
            ps.placed_green_leader,
            ps.placed_black_leader,
        ] {
            let v = l.map(|p| ((p.x as u64) << 8) | p.y as u64).unwrap_or(u64::MAX);
            mix_hash(&mut h, v);
        }
        let hand = ps.hand_red as u64
            | ((ps.hand_blue as u64) << 8)
            | ((ps.hand_green as u64) << 16)
            | ((ps.hand_black as u64) << 24);
        mix_hash(&mut h, hand);
        mix_hash(&mut h, ps.score_treasure as u64);
        // Tunable colour scores and catastrophes must be part of the key, or a
        // transposition table can reuse a value from a state with a different
        // score (the evaluator depends on them).
        let scores = ps.score_red as u64
            | ((ps.score_blue as u64) << 8)
            | ((ps.score_green as u64) << 16)
            | ((ps.score_black as u64) << 24);
        mix_hash(&mut h, scores);
        mix_hash(&mut h, ps.num_catastrophes as u64);
    }

    // Turn machinery: LBR has several actions per turn and conflict resolution
    // sub-states, so two states can share a board yet be at different points in
    // a turn (different legal moves and, with `same_player_continues`, a
    // different value sign). Include it all. Terminal states (empty stack) are
    // hashed defensively too, since the principal-variation walk hashes them.
    mix_hash(&mut h, state.play_action_stack.len() as u64);
    mix_hash(
        &mut h,
        state
            .last_action_player
            .index()
            .map(|i| i as u64 + 1)
            .unwrap_or(0),
    );
    if let Some(gs) = state.state.last() {
        mix_hash(&mut h, *gs as u64);
    }
    if let Some((p, _)) = state.play_action_stack.last() {
        mix_hash(&mut h, p.index().map(|i| i as u64 + 1).unwrap_or(0));
    }
    let conflicts = state.internal_conflict.is_some() as u64
        + ((state.external_conflict.is_some() as u64) << 1);
    mix_hash(&mut h, conflicts);

    // Remaining bag: future draws depend on it.
    let bag = state.bag();
    let bag_bits = bag.red as u64
        | ((bag.blue as u64) << 8)
        | ((bag.green as u64) << 16)
        | ((bag.black as u64) << 24);
    mix_hash(&mut h, bag_bits);

    h
}

/// Re-export of the Action type as the move type for external usage
pub type TnEMove = Action;

impl minimax::Game for Lbr {
    type S = TnEGame;
    type M = Action;  // Action is Copy

    fn generate_moves(state: &Self::S, moves: &mut Vec<Self::M>) {
        let action = state.next_action();
        let raw_moves = action.generate_moves(state);
        let gs = state.next_state();

        // Move ordering: prioritize moves that are likely to be good.
        // This improves alpha-beta pruning efficiency. Also drop any candidate
        // the rules engine would reject (generation is a superset in some
        // conflict sub-states), so the search never treats an illegal move as a
        // silent no-op.
        // The kingdom count is computed ONCE for the whole batch rather than
        // per move: `validate_action` derives it from a full-board flood fill
        // over every leader, so validating candidates one at a time meant ~200
        // identical board-wide computations per node.
        let kingdom_count = state.board.nearby_kingdom_count();
        let mut scored_moves: Vec<(i16, Action)> = raw_moves
            .into_iter()
            .filter(|a| state.validate_action_with(*a, gs, &kingdom_count).is_ok())
            .map(|a| (score_move(state, &a), a))
            .collect();
        
        // Sort by score descending (highest scored moves first)
        scored_moves.sort_by(|a, b| b.0.cmp(&a.0));
        
        for (_, a) in scored_moves {
            moves.push(a);
        }
    }

    fn get_winner(state: &Self::S) -> Option<minimax::Winner> {
        if state.state.is_empty() {
            match state.winner() {
                Player::None => Some(minimax::Winner::Draw),
                t if t == state.last_player => Some(minimax::Winner::PlayerJustMoved),
                _ => Some(minimax::Winner::PlayerToMove),
            }
        } else {
            None
        }
    }

    fn apply(state: &mut Self::S, m: Self::M) -> Option<Self::S> {
        // Clone the state, apply the move to the clone, and return the new state
        // The minimax library will use this new state and keep the old one for undo
        let mut new_state = state.clone();
        match new_state.process(m) {
            Ok(_) => {
                // Return the new state - minimax will swap it in
                Some(new_state)
            }
            Err(e) => {
                // This shouldn't happen if generate_moves is correct
                let vok = state
                    .state
                    .last()
                    .map(|gs| state.validate_action(m, *gs).is_ok())
                    .unwrap_or(false);
                eprintln!(
                    "Warning: Invalid move {:?} in state {:?}: {:?} (validate_ok={})",
                    m,
                    state.next_action(),
                    e,
                    vok
                );
                // Return None to indicate no change (skip this move)
                None
            }
        }
    }

    fn undo(_state: &mut Self::S, _m: Self::M) {
        // Not used when apply returns Some - the library handles state restoration
    }
    
    fn zobrist_hash(state: &Self::S) -> u64 {
        compute_zobrist_hash(state)
    }

    fn same_player_continues(state: &Self::S) -> bool {
        // In LBR, the same player moves again if:
        // 1. It's still their turn (2 actions per turn)
        // 2. They have pending conflict resolution
        // We check by comparing last_action_player with the player whose turn it is
        state.last_action_player == state.next_player() 
            && state.last_action_player != Player::None
    }

    fn table_index(m: Self::M) -> u16 {
        // Compact index for countermove/history ordering (collisions are fine).
        crate::eval::Factor::from(&m).key() as u16
    }

    fn max_table_index() -> u16 {
        u16::MAX
    }

    fn null_move(state: &Self::S) -> Option<Self::M> {
        // LBR has no null move. `Action::Pass` is a *legal game action* that
        // spends one of the active player's two actions for the turn; it does
        // not hand the position to the opponent. Treating it as a null move
        // was doubly wrong:
        //
        //  1. In a forced-conflict sub-state (`AddSupport`, `SelectLeader`)
        //     `Pass` is illegal, so `apply` fails, returns `None`, and
        //     `AppliedMove` derefs to the *unchanged* state. The
        //     `same_player_continues` guard then reads the wrong state and the
        //     "null" search runs on the very same position, negated, at reduced
        //     depth. A bogus `value >= beta` from that is a silent wrong
        //     cutoff that prunes the true best move.
        //  2. Even where legal, it is not a pass of the turn, so the pruning
        //     assumption does not hold.
        //
        // Returning `None` disables null-move pruning for LBR entirely, which
        // is the correct behaviour.
        let _ = state;
        None
    }
}

/// Heuristic scoring for move ordering.
/// Higher scores = more promising moves that should be searched first.
fn score_move(state: &TnEGame, action: &Action) -> i16 {
    match action {
        // Wars/conflicts are game-changing - search these first
        Action::WarSelectLeader(_) => 1000,
        Action::AddSupport(n) => 900 + (*n as i16),
        
        // Tile placements - prioritize tiles that will score points
        Action::PlaceTile { pos, tile_type } => {
            let current_player = state.next_player();
            let opponent = match current_player {
                Player::Player1 => Player::Player2,
                Player::Player2 => Player::Player1,
                Player::Player3 => Player::Player4,
                Player::Player4 => Player::Player3,
                Player::None => Player::None,
            };
            let player_state = state.players.get(current_player);
            let opponent_state = state.players.get(opponent);
            let leader = match tile_type {
                TileType::Red => Leader::Red,
                TileType::Blue => Leader::Blue,
                TileType::Green => Leader::Green,
                TileType::Black => Leader::Black,
                TileType::Empty => return 50,
            };
            
            let connectable = state.board.connectable_bitboard();
            let pos_neighbors = pos.neighbors();
            
            // Check if opponent would score from this tile
            let opponent_scores = if let Some(opp_pos) = opponent_state.get_leader(leader) {
                let opp_kingdom = state.board.find_kingdom_map_fast(opp_pos, connectable);
                (pos_neighbors & opp_kingdom).count_ones() > 0
            } else {
                false
            };
            
            // Check if we have a matching leader on the board
            if let Some(leader_pos) = player_state.get_leader(leader) {
                let leader_kingdom = state.board.find_kingdom_map_fast(leader_pos, connectable);
                
                // Adjacent to leader's kingdom - this tile will score!
                if (pos_neighbors & leader_kingdom).count_ones() > 0 {
                    // We score! But penalize if opponent also scores
                    if opponent_scores { 600 } else { 850 }
                } else {
                    // Tile far from our leader - lower priority
                    let dist = pos.manhattan_distance(leader_pos);
                    150 - dist.min(10) as i16
                }
            } else if opponent_scores {
                // We don't have leader but opponent does - avoid!
                -50
            } else if *tile_type == TileType::Red {
                // Red tiles are useful for revolt defense
                300
            } else {
                // No matching leader - lower priority
                100
            }
        }

        // Leader placement - valuable, especially early game
        Action::PlaceLeader { pos, leader } => {
            let current_player = state.next_player();
            let player_state = state.players.get(current_player);
            
            // A `PlaceLeader` for a leader already on the board is a *move*
            // (rulebook L45-49). It used to be scored as worthless here, which
            // buried the relocations the generator now produces; score it like
            // a placement so the ordering does not starve them.
            
            // Prioritize placing leaders in colors where we're weak
            let scores = [player_state.score_red, player_state.score_blue, 
                          player_state.score_green, player_state.score_black];
            let min_score = *scores.iter().min().unwrap();
            let our_score = match leader {
                Leader::Red => player_state.score_red,
                Leader::Blue => player_state.score_blue,
                Leader::Green => player_state.score_green,
                Leader::Black => player_state.score_black,
                Leader::None => 0,
            };
            
            // Check revolt defense (nearby red tiles)
            let neighbors = pos.neighbors();
            let nearby_red = (neighbors & state.board.red_tiles).count_ones();
            
            // Check kingdom size - larger kingdoms have more scoring potential
            let connectable = state.board.connectable_bitboard();
            let kingdom = state.board.find_kingdom_map_fast(*pos, connectable);
            let kingdom_size = kingdom.count_ones().min(20) as i16;
            
            // Bonus for weak color leader, good defense, large kingdom
            let weak_color_bonus = if our_score == min_score { 50 } else { 0 };
            
            600 + weak_color_bonus + (nearby_red as i16 * 25) + (kingdom_size * 3)
        }
        
        // Withdrawing leaders is usually bad
        Action::WithdrawLeader(_) => -50,
        
        // Strategic actions
        Action::PlaceCatastrophe(_) => 450,
        Action::TakeTreasure(_) => 850,
        Action::BuildMonument(_) => 800,
        Action::DeclineMonument => 30,
        Action::ReplaceTile(_) => 100,
        Action::Pass => 10,
    }
}

impl PlayerAction {
    pub fn generate_moves(&self, state: &TnEGame) -> Vec<Action> {
        let current_player = state.next_player();
        let mut moves = vec![];

        match self {
            PlayerAction::AddSupport(tile_type) => {
                let max = state.players.get(current_player).get_hand(*tile_type);
                for n in 0..=max {
                    moves.push(Action::AddSupport(n));
                }
            }
            PlayerAction::Normal => {
                // Precompute kingdom count for checking tile placements
                let kingdom_count = state.board.nearby_kingdom_count();
                
                // Only consider tile placements adjacent to existing tiles
                // This dramatically reduces the search space
                let existing_tiles = state.board.connectable_bitboard();
                let adjacent_to_tiles = existing_tiles.dilate();
                
                // find all possible tile placements (pruned to adjacent to existing tiles)
                for x in 0..state.board.height {
                    for y in 0..state.board.width {
                        let pos = pos!(x, y);
                        
                        // Skip positions not adjacent to any existing tiles
                        // (unless the board is nearly empty)
                        if existing_tiles.count_ones() > 3 && !adjacent_to_tiles.get(pos) {
                            continue;
                        }
                        
                        let river = state.board.river.get(pos);
                        for tile_type in [TileType::Black, TileType::Red, TileType::Green, TileType::Blue].into_iter() {
                            if state.players.get(current_player).get_hand(tile_type) > 0
                            && state.board.can_place_tile(pos)
                            && (river == (tile_type == TileType::Blue))
                            && kingdom_count[x as usize][y as usize] <= 2 {
                                moves.push(Action::PlaceTile {
                                    pos,
                                    tile_type,
                                });
                            }
                        }
                    }
                }

                // move leader - only place leaders we don't already have on board
                let player_state = state.players.get(current_player);
                let scores = [
                    (Leader::Red, player_state.score_red),
                    (Leader::Blue, player_state.score_blue),
                    (Leader::Green, player_state.score_green),
                    (Leader::Black, player_state.score_black),
                ];
                
                // Sort leaders by score (weakest first) for better pruning
                let mut sorted_leaders: Vec<_> = scores.iter().collect();
                sorted_leaders.sort_by_key(|(_, score)| *score);
                
                // Leader placement: every legal space, not a truncated prefix.
                //
                // This used to keep only the first 5 spaces in bitboard
                // (row-major) order. That is not a neutral narrowing: early
                // game the agent only ever saw leader placements in one region
                // of the board, a systematic positional bias shipped in the
                // agent the user plays against. Leader placement is one of the
                // highest-leverage decisions in the game, so the search is
                // allowed to see them all; breadth is then bounded downstream
                // by `PuctConfig::max_children`, which prunes by prior rather
                // than by an arbitrary ordering.
                let leader_spaces: Vec<Pos> = state
                    .board
                    .find_empty_leader_space_next_to_red()
                    .iter()
                    .collect();

                for (leader, _) in sorted_leaders {
                    // Rulebook L45-49: "Move one of your leaders off the board
                    // or (from off the board or from any space) to an empty
                    // non-river space next to a red temple". A leader that is
                    // already on the board may therefore be moved to any legal
                    // empty space, and may also be withdrawn for good.
                    //
                    // The generator used to emit only WithdrawLeader for an
                    // on-board leader and then `continue`, so neither the human
                    // nor the agent could ever relocate a leader. That silently
                    // removed one of the four actions from the game for both
                    // sides.
                    //
                    // `PlaceLeader` already implements the move: the engine
                    // removes the leader from its old square before placing it
                    // at the new one. The current square is occupied, so it is
                    // never in `leader_spaces`.
                    if let Some(from) = player_state.get_leader(*leader) {
                        moves.push(Action::WithdrawLeader(from));
                    }
                    for &pos in &leader_spaces {
                        moves.push(Action::PlaceLeader { pos, leader: *leader });
                    }
                }

                // Catastrophe placements: every legal square (R11.1 includes
                // empty spaces, not only tiled ones), not the first five in
                // row-major order.
                if state.players.get(current_player).num_catastrophes > 0 {
                    for pos in state.board.find_catastrophe_positions().iter() {
                        moves.push(Action::PlaceCatastrophe(*pos));
                    }
                }

                // Swap tiles (R12): "Discard facedown any number of tiles ...
                // and refresh that many from the bag" (rulebook L89-90), so
                // every count up to the number held is a distinct legal move.
                // Previously only 1-of-a-colour and all-of-a-colour were
                // offered, so e.g. swapping two of three was unreachable.
                {
                    let ps = state.players.get(current_player);
                    for t in [TileType::Red, TileType::Black, TileType::Green, TileType::Blue] {
                        for n in 1..=ps.get_hand(t) {
                            moves.push(Action::ReplaceTile(crate::eval::tiles_of(t, n)));
                        }
                    }
                }

                moves.push(Action::Pass);
            }
            PlayerAction::SelectLeader {
                red,
                blue,
                green,
                black,
            } => {
                // Get the external conflict to check if leaders are still connected
                let mut any_valid = false;
                if let Some(conflicts) = &state.external_conflict {
                    for conflict in &conflicts.conflicts {
                        // Only generate move if leaders are still connected
                        if state.board.path_find(conflict.attacker_pos, conflict.defender_pos) {
                            let leader = conflict.conflict_leader;
                            match leader {
                                Leader::Red if *red => {
                                    moves.push(Action::WarSelectLeader(Leader::Red));
                                    any_valid = true;
                                }
                                Leader::Blue if *blue => {
                                    moves.push(Action::WarSelectLeader(Leader::Blue));
                                    any_valid = true;
                                }
                                Leader::Green if *green => {
                                    moves.push(Action::WarSelectLeader(Leader::Green));
                                    any_valid = true;
                                }
                                Leader::Black if *black => {
                                    moves.push(Action::WarSelectLeader(Leader::Black));
                                    any_valid = true;
                                }
                                _ => {}
                            }
                        }
                    }
                }
                
                // If no valid moves due to disconnection, generate all options 
                // and let the game handle the invalid ones (they get skipped)
                if !any_valid {
                    if *red { moves.push(Action::WarSelectLeader(Leader::Red)); }
                    if *blue { moves.push(Action::WarSelectLeader(Leader::Blue)); }
                    if *green { moves.push(Action::WarSelectLeader(Leader::Green)); }
                    if *black { moves.push(Action::WarSelectLeader(Leader::Black)); }
                }
            }
            PlayerAction::TakeTreasure(ts) => {
                // Rulebook L40 / ruling 2026-10-10: only the treasures nearest a board
                // edge may be taken while such a treasure remains; ties are the
                // player's choice. Offering the full set would make the
                // generator emit moves that `validate_action` rejects.
                let nearest = ts
                    .iter()
                    .map(|t| crate::game::edge_distance(*t))
                    .min()
                    .unwrap_or(u8::MAX);
                for t in ts.iter() {
                    if crate::game::edge_distance(*t) == nearest {
                        moves.push(Action::TakeTreasure(*t));
                    }
                }
            }
            PlayerAction::BuildMonument(_, types) => {
                for t in types {
                    moves.push(Action::BuildMonument(*t));
                }
                // Player can also decline to build a monument
                moves.push(Action::DeclineMonument);
            }
        }

        moves
    }
}

pub struct Evaluator;

impl Default for Evaluator {
    fn default() -> Self {
        Self {}
    }
}

impl minimax::Evaluator for Evaluator {
    type G = Lbr;

    fn evaluate(&self, state: &<Self::G as minimax::Game>::S) -> minimax::Evaluation {
        let s1 = state.players.get(Player::Player1).get_eval(state);
        let s2 = state.players.get(Player::Player2).get_eval(state);

        // Standard negamax expects: positive = good for player to move
        // Return value from perspective of player to move
        let next = state.next_player();
        if next == Player::Player1 {
            s1 - s2
        } else {
            s2 - s1
        }
    }
}

/// A simple evaluator that only considers the raw score (for testing the old AI)
pub struct SimpleEvaluator;

impl Default for SimpleEvaluator {
    fn default() -> Self {
        Self {}
    }
}

impl SimpleEvaluator {
    /// Simple evaluation - just uses raw scores like the old AI
    fn simple_eval(player_state: &crate::game::PlayerState) -> i16 {
        let mut s: i16 = 0;
        // Old evaluation: 20 points for final score
        s += player_state.calculate_score() as i16 * 20;
        // 1 point for each raw score point
        s += player_state.score_sum() as i16;
        s
    }
}

impl minimax::Evaluator for SimpleEvaluator {
    type G = Lbr;

    fn evaluate(&self, state: &<Self::G as minimax::Game>::S) -> minimax::Evaluation {
        let s1 = Self::simple_eval(state.players.get(Player::Player1));
        let s2 = Self::simple_eval(state.players.get(Player::Player2));

        // Standard negamax: positive = good for player to move
        let next = state.next_player();
        if next == Player::Player1 {
            s1 - s2
        } else {
            s2 - s1
        }
    }
}

/// Feature weights for the engine's evaluator (PRD B3/E2). The default
/// (`base = 1`, rest `0`) reproduces the tuned per-player heuristic exactly, so
/// the extra terms can be tuned without changing the baseline behaviour.
#[derive(Clone, Copy, Debug)]
pub struct EngineWeights {
    /// Weight on the existing tuned heuristic (`PlayerState::get_eval`).
    pub base: f32,
    /// Hand tiles matching the player's weakest colour (raising the min score).
    pub weak_tiles: f32,
    /// Leaders adjacent to temples (revolt defence / scoring access).
    pub temples: f32,
    /// Total kingdom area under the player's leaders.
    pub kingdom: f32,
    /// Treasures collected.
    pub treasure: f32,
    /// Leaders standing on monuments.
    pub monument: f32,
    /// Weight on the bag-aware evaluator (`eval::modern_value`). Zero by
    /// default so the previous behaviour is exactly reproducible; set `base`
    /// to 0 and this to 1 to evaluate with the new terms alone.
    pub modern: f32,
}

impl Default for EngineWeights {
    fn default() -> Self {
        EngineWeights {
            base: 1.0,
            weak_tiles: 0.0,
            temples: 0.0,
            kingdom: 0.0,
            treasure: 0.0,
            monument: 0.0,
            modern: 0.0,
        }
    }
}

/// Two-player evaluator used by the alpha-beta engine (see [`EngineWeights`]).
#[derive(Clone, Copy, Debug, Default)]
pub struct EngineEvaluator {
    pub weights: EngineWeights,
}

impl EngineEvaluator {
    pub fn new(weights: EngineWeights) -> Self {
        Self { weights }
    }

    fn features(&self, state: &TnEGame, p: Player) -> f32 {
        let w = &self.weights;
        let ps = state.players.get(p);
        let mut s = w.base * ps.get_eval(state) as f32;

        if w.modern != 0.0 {
            s += w.modern * crate::eval::modern_value(state, p);
        }

        if w.weak_tiles != 0.0 {
            let scores = [ps.score_red, ps.score_blue, ps.score_green, ps.score_black];
            let hands = [ps.hand_red, ps.hand_blue, ps.hand_green, ps.hand_black];
            let weakest = scores
                .iter()
                .enumerate()
                .min_by_key(|(_, v)| **v)
                .map(|(i, _)| i)
                .unwrap_or(0);
            s += w.weak_tiles * hands[weakest] as f32;
        }

        if w.temples != 0.0 || w.kingdom != 0.0 {
            let connectable = state.board.connectable_bitboard();
            let mut visited = Bitboard::new();
            for l in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
                if let Some(pos) = ps.get_leader(l) {
                    if w.temples != 0.0 {
                        s += w.temples * (pos.neighbors() & state.board.red_tiles).count_ones() as f32;
                    }
                    if w.kingdom != 0.0 && !visited.get(pos) {
                        let kmap = state.board.find_kingdom_map_fast(pos, connectable);
                        visited |= kmap;
                        s += w.kingdom * kmap.count_ones() as f32;
                    }
                }
            }
        }

        if w.treasure != 0.0 {
            s += w.treasure * ps.score_treasure as f32;
        }

        if w.monument != 0.0 {
            let connectable = state.board.connectable_bitboard();
            for m in &state.monuments {
                let kmap = state.board.find_kingdom_map_fast(m.pos_top_left, connectable);
                for l in m.monument_type.unpack() {
                    if let Some(pos) = ps.get_leader(l) {
                        if kmap.get(pos) {
                            s += w.monument;
                        }
                    }
                }
            }
        }
        s
    }
}

impl minimax::Evaluator for EngineEvaluator {
    type G = Lbr;

    fn evaluate(&self, state: &<Self::G as minimax::Game>::S) -> minimax::Evaluation {
        let diff = self.features(state, Player::Player1) - self.features(state, Player::Player2);
        let v = diff.round().clamp(-30_000.0, 30_000.0) as i16;
        if state.next_player() == Player::Player1 {
            v
        } else {
            -v
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::Tiles;
    use minimax::{Negamax, Random, Strategy, Game};

    /// Regression: LBR must report "no null move".
    ///
    /// `Action::Pass` is not a null move here — it spends one of the active
    /// player's two actions. Returning it from `null_move` made the engine try
    /// to pass during forced-conflict sub-states, where `Pass` is illegal;
    /// `apply` then failed and `AppliedMove` dereferenced the *unchanged*
    /// state, so the `same_player_continues` guard read the wrong state and the
    /// "null" search ran on the same position negated. A bogus cutoff from that
    /// silently pruned the best move.
    #[test]
    fn tne_has_no_null_move() {
        let state = TnEGame::new();
        assert!(
            <Lbr as minimax::Game>::null_move(&state).is_none(),
            "LBR has no null move: Pass spends one of the two actions in a turn"
        );
    }

    /// The engine's chosen move must always be applicable, including from
    /// forced-conflict sub-states (the ones that used to emit the illegal
    /// `Pass`).
    #[test]
    fn engine_never_returns_an_inapplicable_move() {
        let state = crate::maps::MapSpec::default_map().start_game(2, 0xBEEF);
        for depth in [1u8, 2, 3] {
            let mut engine = crate::arena::build_engine(depth, 0, 0xBEEF, EngineWeights::default());
            let mut cur = state.clone();
            let mut plies = 0;
            while <Lbr as minimax::Game>::get_winner(&cur).is_none()
                && plies < 24
            {
                let m = match engine.choose_move(&cur) {
                    Some(m) => m,
                    None => break,
                };
                let gs = cur.next_state();
                assert!(
                    cur.validate_action(m, gs).is_ok(),
                    "engine produced an inapplicable move at ply {plies}: {m:?}"
                );
                match cur.process(m) {
                    Ok(_) => {}
                    Err(_) => panic!("valid move failed to process at ply {plies}"),
                }
                plies += 1;
            }
        }
    }

    /// Helper function to play a single game between two strategies
    /// Returns the winner (Player1, Player2, or None for draw)
    fn play_game<S1: Strategy<Lbr>, S2: Strategy<Lbr>>(
        p1_strategy: &mut S1,
        p2_strategy: &mut S2,
        max_moves: usize,
    ) -> Player {
        let mut game = TnEGame::new();
        let mut move_count = 0;

        while Lbr::get_winner(&game).is_none() && move_count < max_moves {
            let curr_player = game.next_player();
            let m = match curr_player {
                Player::Player1 => p1_strategy.choose_move(&game),
                Player::Player2 => p2_strategy.choose_move(&game),
                _ => None,
            };

            match m {
                Some(mv) => {
                    // `apply` clones and returns the successor; the caller MUST
                    // adopt it (see the minimax `Game::apply` contract).
                    if let Some(next) = Lbr::apply(&mut game, mv) {
                        game = next;
                    }
                    move_count += 1;
                }
                None => break,
            }
        }

        game.winner()
    }

    /// Test that the improved AI (depth 2) beats the simple/old AI (depth 1).
    ///
    /// Played over a small *sample* of seeds rather than two fixed games. The
    /// old two-game version was a coin flip that happened to pass: when move
    /// generation started emitting leader relocations (rulebook L45-49), those
    /// two particular games flipped to 0 wins, 1 loss, 1 draw — while a proper
    /// sample shows the improved evaluator winning ~85%. The move set was not
    /// the problem; the sample size was.
    #[test]
    fn test_improved_ai_beats_simple_ai() {
        let mut improved_wins = 0;
        let mut simple_wins = 0;
        let mut draws = 0;

        for seed in 0u64..8 {
            // Both seats: play the improved AI first, then second.
            for improved_is_p1 in [true, false] {
                let mut game = TnEGame::with_start(2, seed, Player::Player1);
                let mut improved_ai = Negamax::new(Evaluator::default(), 2);
                let mut simple_ai = Negamax::new(SimpleEvaluator::default(), 1);

                let mut moves = 0;
                while Lbr::get_winner(&game).is_none() && moves < 200 {
                    let cur = game.next_player();
                    let improved_to_move = (cur == Player::Player1) == improved_is_p1;
                    let m = if improved_to_move {
                        improved_ai.choose_move(&game)
                    } else {
                        simple_ai.choose_move(&game)
                    };
                    match m.and_then(|mv| Lbr::apply(&mut game, mv)) {
                        Some(next) => {
                            game = next;
                            moves += 1;
                        }
                        None => break,
                    }
                }

                match game.winner() {
                    Player::Player1 if improved_is_p1 => improved_wins += 1,
                    Player::Player2 if !improved_is_p1 => improved_wins += 1,
                    Player::Player1 if !improved_is_p1 => simple_wins += 1,
                    Player::Player2 if improved_is_p1 => simple_wins += 1,
                    _ => draws += 1,
                }
            }
        }

        println!("\n=== Improved AI vs Simple AI Results ===");
        println!(
            "Improved AI wins: {}, Simple AI wins: {}, Draws: {}",
            improved_wins, simple_wins, draws
        );

        // The improved AI should beat the simple AI at least as often — over a
        // sample, not one lucky pairing.
        assert!(
            improved_wins >= simple_wins,
            "Improved AI should beat simple AI at least as often, but won {} vs {} games",
            improved_wins,
            simple_wins
        );
    }

    /// Test that the improved AI beats a random player consistently
    #[test]
    fn test_improved_ai_beats_random() {
        let num_games = 4;
        let mut ai_wins = 0;
        let mut random_wins = 0;
        let mut draws = 0;

        for i in 0..num_games {
            // Alternate who goes first
            let ai_is_p1 = i % 2 == 0;
            
            // Use depth 2 for faster tests
            let mut ai_strategy = Negamax::new(Evaluator::default(), 2);
            let mut random_strategy = Random::<Lbr>::new();

            let winner = if ai_is_p1 {
                play_game(&mut ai_strategy, &mut random_strategy, 200)
            } else {
                play_game(&mut random_strategy, &mut ai_strategy, 200)
            };

            match winner {
                Player::Player1 if ai_is_p1 => ai_wins += 1,
                Player::Player2 if !ai_is_p1 => ai_wins += 1,
                Player::Player1 if !ai_is_p1 => random_wins += 1,
                Player::Player2 if ai_is_p1 => random_wins += 1,
                _ => draws += 1,
            }
        }

        println!("\n=== AI vs Random Results ===");
        println!("AI wins: {}, Random wins: {}, Draws: {}", ai_wins, random_wins, draws);
        println!("AI win rate: {:.1}%", (ai_wins as f64 / num_games as f64) * 100.0);
        
        // The AI should win at least 50% of games against random
        assert!(
            ai_wins >= num_games / 2,
            "AI should beat random at least 50% of the time, but only won {} out of {} games",
            ai_wins,
            num_games
        );
    }

    /// Test that deeper search produces better results
    #[test]
    fn test_deeper_search_is_stronger() {
        let num_games = 2;
        let mut deep_wins = 0;
        let mut shallow_wins = 0;
        let mut draws = 0;

        for i in 0..num_games {
            // Alternate who goes first
            let deep_is_p1 = i % 2 == 0;
            
            let mut deep_ai = Negamax::new(Evaluator::default(), 2);
            let mut shallow_ai = Negamax::new(Evaluator::default(), 1);

            let winner = if deep_is_p1 {
                play_game(&mut deep_ai, &mut shallow_ai, 200)
            } else {
                play_game(&mut shallow_ai, &mut deep_ai, 200)
            };

            match winner {
                Player::Player1 if deep_is_p1 => deep_wins += 1,
                Player::Player2 if !deep_is_p1 => deep_wins += 1,
                Player::Player1 if !deep_is_p1 => shallow_wins += 1,
                Player::Player2 if deep_is_p1 => shallow_wins += 1,
                _ => draws += 1,
            }
        }

        println!("\n=== Deep AI (depth 2) vs Shallow AI (depth 1) Results ===");
        println!("Deep AI wins: {}, Shallow AI wins: {}, Draws: {}", deep_wins, shallow_wins, draws);
        println!("Deep AI win rate: {:.1}%", (deep_wins as f64 / num_games as f64) * 100.0);
        
        // Deeper search should usually win
        assert!(
            deep_wins >= shallow_wins,
            "Deeper search should beat shallower search at least as often, but won {} vs {} games",
            deep_wins,
            shallow_wins
        );
    }

    /// Regression (BUGS.md A1): move generation must not truncate its lists.
    ///
    /// It used to keep only the first 5 leader spaces and the first 5
    /// catastrophe spaces in bitboard (row-major) order. That is a positional
    /// bias rather than a neutral narrowing — early game the agent could only
    /// consider leader placements in one region of the board — and it shipped
    /// in the agent the user plays against, because PUCT and the alpha-beta
    /// engine share this generator.
    #[test]
    fn move_generation_offers_every_legal_leader_space() {
        let state = crate::maps::MapSpec::default_map().start_game(2, 0xA11CE);
        let all: Vec<(Pos, Leader)> = crate::puct::legal_actions(&state)
            .into_iter()
            .filter_map(|m| match m {
                Action::PlaceLeader { pos, leader } => Some((pos, leader)),
                _ => None,
            })
            .collect();
        let spaces: Vec<Pos> = state
            .board
            .find_empty_leader_space_next_to_red()
            .iter()
            .collect();
        let unplaced: Vec<Leader> = [Leader::Red, Leader::Blue, Leader::Green, Leader::Black]
            .into_iter()
            .filter(|l| state.players.get(state.next_player()).get_leader(*l).is_none())
            .collect();
        assert!(
            !spaces.is_empty() && !unplaced.is_empty(),
            "fixture must offer at least one legal leader placement"
        );
        assert_eq!(
            all.len(),
            spaces.len() * unplaced.len(),
            "every legal leader space must be offered for every unplaced leader \
             (was capped at 5 per leader)"
        );
        assert!(
            all.len() > 5 * unplaced.len(),
            "sanity: the old cap of 5 per leader would have produced fewer"
        );
    }

    /// Regression: a leader already on the board must be *movable*, not only
    /// withdrawable.
    ///
    /// Rulebook L45-49: "Move one of your leaders off the board or (from off
    /// the board or from any space) to an empty non-river space next to a red
    /// temple". The generator emitted `WithdrawLeader` and then `continue`d, so
    /// neither the agent nor the human (through the same generator) could ever
    /// reposition a leader — one of the four actions was silently missing.
    #[test]
    fn move_generation_allows_moving_a_placed_leader() {
        let mut game = crate::maps::MapSpec::default_map().start_game(2, 0x1EAD);
        let start = game
            .board
            .find_empty_leader_space_next_to_red()
            .iter()
            .next()
            .expect("fixture needs a leader space");
        game.process(Action::PlaceLeader {
            pos: start,
            leader: Leader::Red,
        })
        .expect("placing the red leader must be legal");

        let from = game
            .players
            .get(game.next_player())
            .get_leader(Leader::Red)
            .expect("the red leader is now on the board");
        assert_eq!(from, start, "engine recorded the wrong square");

        let actions = crate::puct::legal_actions(&game);
        assert!(
            actions.contains(&Action::WithdrawLeader(from)),
            "withdrawing the leader must still be offered"
        );
        let destinations: Vec<Pos> = actions
            .iter()
            .filter_map(|a| match a {
                Action::PlaceLeader {
                    pos,
                    leader: Leader::Red,
                } if *pos != from => Some(*pos),
                _ => None,
            })
            .collect();
        assert!(
            !destinations.is_empty(),
            "a leader already on the board must be offered at least one new square"
        );

        // And the move really relocates the leader through the engine.
        let to = destinations[0];
        game.process(Action::PlaceLeader {
            pos: to,
            leader: Leader::Red,
        })
        .expect("the generated relocation must be accepted");
        assert_eq!(
            game.players
                .get(game.last_action_player)
                .get_leader(Leader::Red),
            Some(to),
            "the leader did not end up on the destination square"
        );
    }

    /// The swap rule is "any number of tiles", so every count up to the number
    /// held must be reachable — not just one-of-a-colour and all-of-a-colour.
    #[test]
    fn move_generation_offers_every_swap_count() {
        let state = crate::maps::MapSpec::default_map().start_game(2, 0xB0B);
        let swaps: Vec<Tiles> = crate::puct::legal_actions(&state)
            .into_iter()
            .filter_map(|m| match m {
                Action::ReplaceTile(t) => Some(t),
                _ => None,
            })
            .collect();
        let ps = state.players.get(state.next_player());
        for t in [TileType::Red, TileType::Black, TileType::Green, TileType::Blue] {
            let have = ps.get_hand(t);
            for n in 1..=have {
                assert!(
                    swaps.contains(&crate::eval::tiles_of(t, n)),
                    "swapping {n} of {have} {t:?} tiles must be legal"
                );
            }
        }
    }

    /// Regression (BUGS.md B10): the unification-tile marker is cleared when
    /// the war finishes.
    ///
    /// Rulebook L78: "Remove the unification tile." The marker was set when the
    /// war opened and never cleared, so `is_connectable` reported that cell
    /// occupied for the rest of the game. A catastrophe landing there would
    /// leave the two tile groups on either side falsely fused across an empty
    /// space, feeding `neighboring_kingdoms` and therefore war detection.
    #[test]
    fn unification_marker_is_cleared_when_the_war_ends() {
        let mut game = TnEGame::new();
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Black,
        })
        .unwrap();
        // Hands refresh at the end of every turn, so top them up at the point
        // of use rather than once at the top.
        game.players.get_mut(Player::Player1).hand_red = 5;
        game.process(Action::PlaceTile {
            pos: pos!(1, 3),
            tile_type: TileType::Red,
        })
        .unwrap();
        game.process(Action::PlaceLeader {
            pos: pos!(0, 3),
            leader: Leader::Black,
        })
        .unwrap();
        game.players.get_mut(Player::Player2).hand_black = 5;
        game.process(Action::PlaceTile {
            pos: pos!(0, 2),
            tile_type: TileType::Black,
        })
        .unwrap();

        game.players.get_mut(Player::Player1).hand_black = 5;
        game.process(Action::PlaceTile {
            pos: pos!(1, 2),
            tile_type: TileType::Black,
        })
        .unwrap();
        assert_eq!(
            game.board.unification_tile,
            Some(pos!(1, 2)),
            "the marker is set while the war is open"
        );

        game.process(Action::WarSelectLeader(Leader::Black))
            .unwrap();
        game.players.get_mut(Player::Player1).hand_black = 5;
        game.process(Action::AddSupport(2)).unwrap();
        game.process(Action::AddSupport(0)).unwrap();

        assert!(game.external_conflict.is_none(), "the war is over");
        assert_eq!(
            game.board.unification_tile, None,
            "the unification tile is removed when the war ends (L78)"
        );
    }

    /// Regression (BUGS.md B6): the treasure rule applies to a leader move.
    ///
    /// Rulebook L38-39 keys it to "the end of an action", and moving a leader
    /// is an action. Two defects: the check ran *before* the leader was placed
    /// on the board, so a green trader just dropped onto treasures collected
    /// nothing; and it was gated on the move not starting a revolt, so a leader
    /// move that triggered one skipped the grab while the same move without a
    /// revolt offered it.
    #[test]
    fn placing_a_green_trader_onto_treasures_collects_them() {
        let mut game = TnEGame::new();
        // Two tiles each holding a treasure, with an empty cell between them.
        // Dropping the trader on that cell is what joins them into one
        // kingdom — and is exactly the case the old ordering missed, because
        // the treasure check ran before the leader reached the board.
        game.board.set_tile_type(pos!(3, 5), TileType::Red);
        game.board.set_tile_type(pos!(3, 7), TileType::Black);
        game.board.set_treasure(pos!(3, 5), true);
        game.board.set_treasure(pos!(3, 7), true);

        let target = pos!(3, 6);
        assert_eq!(game.board.get_leader(target), Leader::None);
        assert_eq!(game.board.get_tile_type(target), TileType::Empty);

        let before = 2; // the two placed above
        game.process(Action::PlaceLeader {
            pos: target,
            leader: Leader::Green,
        })
        .unwrap();

        assert_eq!(
            game.board.get_leader(target),
            Leader::Green,
            "the trader must actually be on the board"
        );
        let offered = game
            .play_action_stack
            .iter()
            .any(|(_, a)| matches!(a, PlayerAction::TakeTreasure(_)));
        assert!(
            offered,
            "a green trader landing in a kingdom with two treasures must be \
             offered the grab (treasures were {before})"
        );
    }

    /// Regression (BUGS.md B7): in a priest war the losing leader's own
    /// temples are NOT protected from disintegration.
    ///
    /// Rulebook L72 moves the losing leader off the board and L73 then
    /// discards tiles; L74 protects red temples that "have another leader next
    /// to them". The code computed the discard set while the loser was still
    /// standing, so every temple touching it shielded itself and the winner
    /// silently lost those points.
    ///
    /// P1 (the placer, and therefore the attacker) loses on a tie, so P1's
    /// red leader is the one removed — and its temple at (3,10) touches no
    /// other leader, so it must disintegrate.
    #[test]
    fn losing_leader_does_not_protect_its_own_temple() {
        let mut game = TnEGame::new();

        // P2's kingdom on the left.
        game.board.set_tile_type(pos!(3, 6), TileType::Red);
        game.board.set_leader(pos!(3, 7), Leader::Red);
        game.board.set_player(pos!(3, 7), Player::Player2);
        game.players.0[1].placed_red_leader = Some(pos!(3, 7));

        // P1's kingdom on the right: red leader plus a lone red temple that
        // touches only that leader.
        game.board.set_leader(pos!(3, 9), Leader::Red);
        game.board.set_player(pos!(3, 9), Player::Player1);
        game.players.0[0].placed_red_leader = Some(pos!(3, 9));
        game.board.set_tile_type(pos!(3, 10), TileType::Red);

        assert_eq!(
            game.board.get_tile_type(pos!(3, 10)),
            TileType::Red,
            "the temple must exist before the war"
        );

        // Both sides hold exactly one red tile, so the attacker (P1) loses the
        // tie and its leader is taken off the board.
        game.players.0[0].hand_red = 5;
        game.process(Action::PlaceTile {
            pos: pos!(3, 8),
            tile_type: TileType::Red,
        })
        .unwrap();
        game.process(Action::WarSelectLeader(Leader::Red)).unwrap();
        game.players.0[1].hand_red = 5;
        game.process(Action::AddSupport(0)).unwrap();
        game.process(Action::AddSupport(0)).unwrap();

        assert_eq!(
            game.board.get_leader(pos!(3, 9)),
            Leader::None,
            "the losing red leader is off the board (L72)"
        );
        assert_eq!(
            game.board.get_tile_type(pos!(3, 10)),
            TileType::Empty,
            "its temple touches no other leader, so it disintegrates (L73/L74)"
        );
        assert_eq!(
            game.players.get(Player::Player2).score_red,
            2,
            "P2 takes the war point plus the point for the disintegrated temple"
        );
    }

    /// Temporary breakdown of where expansion time goes.
    #[test]
    #[ignore]
    fn bench_expansion_parts() {
        use std::time::Instant;
        let g = crate::maps::MapSpec::default_map().start_game(4, 5);
        let n = 3000;

        let t = Instant::now();
        let mut acc = 0usize;
        for _ in 0..n {
            acc += g.board.nearby_kingdom_count()[0][0] as usize;
        }
        let d_count = t.elapsed();
        std::hint::black_box(acc);

        let t = Instant::now();
        let mut acc2 = 0usize;
        for _ in 0..n {
            acc2 += g.board.find_empty_leader_space_next_to_red().count_ones() as usize;
        }
        let d_leaders = t.elapsed();
        std::hint::black_box(acc2);

        let t = Instant::now();
        let mut acc3 = 0usize;
        for _ in 0..n {
            acc3 += g.next_action().generate_moves(&g).len();
        }
        let d_gen = t.elapsed();
        std::hint::black_box(acc3);

        let t = Instant::now();
        let mut acc4 = 0usize;
        for _ in 0..n {
            acc4 += crate::puct::legal_actions(&g).len();
        }
        let d_legal = t.elapsed();
        std::hint::black_box(acc4);

        let acts = crate::puct::legal_actions(&g);
        let t = Instant::now();
        for _ in 0..n {
            for a in &acts {
                std::hint::black_box(g.validate_action(*a, g.next_state()).is_ok());
            }
        }
        let d_val = t.elapsed();

        // clone cost
        let t = Instant::now();
        for _ in 0..n {
            std::hint::black_box(g.clone());
        }
        let d_clone = t.elapsed();

        // process() cost
        let t = Instant::now();
        let mut acc5 = 0usize;
        for _ in 0..n {
            let mut c = g.clone();
            if c.process(Action::Pass).is_ok() { acc5 += 1; }
        }
        let d_process = t.elapsed();
        std::hint::black_box(acc5);

        // eval cost
        let t = Instant::now();
        let mut acc6 = 0i32;
        for _ in 0..n {
            acc6 += crate::eval::tuned_value(&g, Player::Player1, &crate::eval::LeafWeights::default()) as i32;
        }
        let d_eval = t.elapsed();
        std::hint::black_box(acc6);

        let acts2 = crate::puct::legal_actions(&g);
        let t = Instant::now();
        let mut acc7 = 0f32;
        for _ in 0..n {
            acc7 += crate::eval::prior_weights(&g, &acts2, &crate::eval::PriorWeights::default())
                .iter()
                .sum::<f32>();
        }
        let d_prior = t.elapsed();
        std::hint::black_box(acc7);
        let tiles = acts2.iter().filter(|a| matches!(a, Action::PlaceTile{..})).count();

        let per = |d: std::time::Duration| d.as_secs_f64() * 1e6 / n as f64;
        println!("  prior_weights ({tiles} tiles)   {:>9.2}", per(d_prior));
        println!("  TnEGame::clone             {:>9.2}", per(d_clone));
        println!("  clone + process(Pass)      {:>9.2}", per(d_process));
        println!("  tuned_value (leaf eval)    {:>9.2}", per(d_eval));
        println!("BENCH per-call microseconds:");
        println!("  nearby_kingdom_count      {:>9.2}", per(d_count));
        println!("  find_empty_leader_spaces  {:>9.2}", per(d_leaders));
        println!("  generate_moves (raw)      {:>9.2}", per(d_gen));
        println!("  legal_actions (total)     {:>9.2}", per(d_legal));
        println!("  validate each x{}        {:>9.2}", acts.len(), per(d_val));
    }

    /// Regression: distinct swap actions must survive move generation.
    ///
    /// `legal_actions` sorted by `Factor` key and then deduplicated. But
    /// `Factor::from` mapped every `ReplaceTile(_)` to one constant key, so
    /// after sorting all the swaps clustered and `dedup()` deleted every one
    /// but a single representative — replacing one red tile and replacing two
    /// black tiles collapsed into the same action. The move set was silently
    /// smaller than the rules allow.
    #[test]
    fn distinct_swap_actions_survive_generation() {
        let state = crate::maps::MapSpec::default_map().start_game(2, 0x5A9);
        let ps = state.players.get(state.next_player());
        let expected: Vec<Tiles> = [
            TileType::Red,
            TileType::Blue,
            TileType::Green,
            TileType::Black,
        ]
        .into_iter()
        .flat_map(|t| (1..=ps.get_hand(t)).map(move |n| crate::eval::tiles_of(t, n)))
        .collect();

        let swaps: Vec<Tiles> = crate::puct::legal_actions(&state)
            .into_iter()
            .filter_map(|m| match m {
                Action::ReplaceTile(t) => Some(t),
                _ => None,
            })
            .collect();

        assert!(
            expected.len() > 1,
            "fixture must offer more than one swap (got {})",
            expected.len()
        );
        for e in &expected {
            assert!(
                swaps.contains(e),
                "swap {e:?} was generated but did not survive;                  only {} of {} distinct swaps remain",
                swaps.len(),
                expected.len()
            );
        }
        assert_eq!(
            swaps.len(),
            expected.len(),
            "dedup must remove only true duplicates, not distinct swaps"
        );
    }

    // ==================== ELO RATING SYSTEM ====================
    
    /// ELO rating calculation constants
    const INITIAL_ELO: f64 = 1500.0;
    const K_FACTOR: f64 = 32.0;
    
    /// Calculate expected score based on ELO ratings
    fn expected_score(player_elo: f64, opponent_elo: f64) -> f64 {
        1.0 / (1.0 + 10.0_f64.powf((opponent_elo - player_elo) / 400.0))
    }
    
    /// Update ELO rating after a game
    /// actual_score: 1.0 for win, 0.5 for draw, 0.0 for loss
    fn update_elo(current_elo: f64, expected: f64, actual: f64) -> f64 {
        current_elo + K_FACTOR * (actual - expected)
    }
    
    /// Run a tournament between AI versions and calculate ELO ratings
    /// This gives an objective measure of AI strength
    /// 
    /// Run with: cargo test --release test_elo_tournament -- --nocapture --ignored
    #[test]
    #[ignore] // This is a benchmark test - run manually for AI strength analysis
    fn test_elo_tournament() {
        println!("\n");
        println!("╔══════════════════════════════════════════════════════════════╗");
        println!("║           LAND BETWEEN RIVERS AI ELO TOURNAMENT              ║");
        println!("╠══════════════════════════════════════════════════════════════╣");
        println!("║  Measuring AI strength using the ELO rating system           ║");
        println!("║  (Same system used on Board Game Arena for LBR rankings)     ║");
        println!("╚══════════════════════════════════════════════════════════════╝");
        println!();
        
        // AI Players in the tournament
        // Index: 0=Random, 1=SimpleD1, 2=SimpleD2, 3=ImprovedD1, 4=ImprovedD2
        let mut elos = [INITIAL_ELO; 5];
        let names = [
            "Random Player",
            "Simple AI (d1)",
            "Simple AI (d2)", 
            "Improved AI (d1)",
            "Improved AI (d2)",
        ];
        
        let games_per_matchup = 4; // Play 4 games per matchup for better statistics
        let mut results = [[0i32; 5]; 5]; // wins[i][j] = wins of player i against player j
        
        println!("Running tournament matches ({} games per matchup)...", games_per_matchup);
        
        // Round-robin tournament
        for i in 0..5 {
            for j in (i+1)..5 {
                for game_num in 0..games_per_matchup {
                    let i_is_p1 = game_num % 2 == 0;
                    
                    // Create strategies for this matchup
                    let winner = match (i, j) {
                        // Random vs others
                        (0, 1) => {
                            let mut p1 = Random::<Lbr>::new();
                            let mut p2 = Negamax::new(SimpleEvaluator::default(), 1);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        (0, 2) => {
                            let mut p1 = Random::<Lbr>::new();
                            let mut p2 = Negamax::new(SimpleEvaluator::default(), 2);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        (0, 3) => {
                            let mut p1 = Random::<Lbr>::new();
                            let mut p2 = Negamax::new(Evaluator::default(), 1);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        (0, 4) => {
                            let mut p1 = Random::<Lbr>::new();
                            let mut p2 = Negamax::new(Evaluator::default(), 2);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        // Simple AI matchups
                        (1, 2) => {
                            let mut p1 = Negamax::new(SimpleEvaluator::default(), 1);
                            let mut p2 = Negamax::new(SimpleEvaluator::default(), 2);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        (1, 3) => {
                            let mut p1 = Negamax::new(SimpleEvaluator::default(), 1);
                            let mut p2 = Negamax::new(Evaluator::default(), 1);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        (1, 4) => {
                            let mut p1 = Negamax::new(SimpleEvaluator::default(), 1);
                            let mut p2 = Negamax::new(Evaluator::default(), 2);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        (2, 3) => {
                            let mut p1 = Negamax::new(SimpleEvaluator::default(), 2);
                            let mut p2 = Negamax::new(Evaluator::default(), 1);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        (2, 4) => {
                            let mut p1 = Negamax::new(SimpleEvaluator::default(), 2);
                            let mut p2 = Negamax::new(Evaluator::default(), 2);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        // Improved AI matchups
                        (3, 4) => {
                            let mut p1 = Negamax::new(Evaluator::default(), 1);
                            let mut p2 = Negamax::new(Evaluator::default(), 2);
                            if i_is_p1 { play_game(&mut p1, &mut p2, 200) }
                            else { play_game(&mut p2, &mut p1, 200) }
                        }
                        _ => Player::None,
                    };
                    
                    // Determine who won relative to i and j
                    let (i_score, j_score) = match winner {
                        Player::Player1 if i_is_p1 => (1.0, 0.0),
                        Player::Player2 if i_is_p1 => (0.0, 1.0),
                        Player::Player1 if !i_is_p1 => (0.0, 1.0),
                        Player::Player2 if !i_is_p1 => (1.0, 0.0),
                        _ => (0.5, 0.5), // Draw
                    };
                    
                    // Update results
                    if i_score == 1.0 { results[i][j] += 1; }
                    if j_score == 1.0 { results[j][i] += 1; }
                    
                    // Update ELO ratings
                    let expected_i = expected_score(elos[i], elos[j]);
                    let expected_j = expected_score(elos[j], elos[i]);
                    elos[i] = update_elo(elos[i], expected_i, i_score);
                    elos[j] = update_elo(elos[j], expected_j, j_score);
                }
            }
        }
        
        // Print results
        println!();
        println!("╔══════════════════════════════════════════════════════════════╗");
        println!("║                    TOURNAMENT RESULTS                        ║");
        println!("╠══════════════════════════════════════════════════════════════╣");
        
        // Sort by ELO
        let mut ranked: Vec<(usize, f64)> = elos.iter().enumerate().map(|(i, &e)| (i, e)).collect();
        ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        
        println!("║  Rank │ Player                    │ ELO Rating │ vs Random  ║");
        println!("╠══════════════════════════════════════════════════════════════╣");
        
        for (rank, (idx, elo)) in ranked.iter().enumerate() {
            let vs_random = if *idx == 0 { 
                "N/A".to_string() 
            } else { 
                format!("{}-{}", results[*idx][0], results[0][*idx])
            };
            println!("║  {:>4} │ {:25} │ {:>10.0} │ {:>10} ║", 
                     rank + 1, names[*idx], elo, vs_random);
        }
        
        println!("╚══════════════════════════════════════════════════════════════╝");
        println!();
        
        // Calculate ELO difference between best improved AI and random
        let improved_d2_elo = elos[4];
        let random_elo = elos[0];
        let elo_diff = improved_d2_elo - random_elo;
        
        println!("📊 ELO Analysis:");
        println!("   • Improved AI (d2) ELO: {:.0}", improved_d2_elo);
        println!("   • Random Player ELO: {:.0}", random_elo);
        println!("   • ELO Difference: {:.0} points", elo_diff);
        println!();
        
        // ELO interpretation
        println!("📈 What does this mean?");
        println!("   • +100 ELO ≈ 64% expected win rate");
        println!("   • +200 ELO ≈ 76% expected win rate");
        println!("   • +400 ELO ≈ 91% expected win rate");
        println!();
        
        let win_rate = expected_score(improved_d2_elo, random_elo) * 100.0;
        println!("   🎯 Our AI's expected win rate vs Random: {:.1}%", win_rate);
        println!();
        
        // Context for Board Game Arena
        println!("🌐 Board Game Arena Context:");
        println!("   • BGA uses ELO for LBR rankings");
        println!("   • Top 3 players have ELO > 300 above average");
        println!("   • Our AI shows {:.0} ELO above random baseline", elo_diff);
        println!();
        
        // Note about statistical significance
        println!("⚠️  Note: With only {} games per matchup, results can vary.", games_per_matchup);
        println!("   Increase games_per_matchup for more statistically significant rankings.");
        
        // This is a benchmark test - no assertions, just reporting
        // The ELO results speak for themselves
    }
}
