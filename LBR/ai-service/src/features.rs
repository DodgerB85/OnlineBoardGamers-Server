//! State feature extraction for the neural agent.
//!
//! The feature vector is always written from the point of view of the player to
//! move (`me`). Everything is scaled into roughly `[-1, 1]` so a small MLP sees
//! inputs of comparable magnitude — with raw counts the network spends its first
//! layers undoing the scale of whichever feature happens to be largest.
//!
//! Features are computed **only here**. The trainer consumes the raw `f32`
//! vectors out of the replay buffer, so Rust and Python can never disagree about
//! what a feature means; only the architecture has to be mirrored, and that is
//! written into the weight file header.

use crate::game::{
    Leader, MonumentType, Player, PlayerAction, Pos, TnEGame, TileType, H, W,
};

/// Board cells, plus one slot for "this action has no position".
pub const NPOS: usize = W * H + 1;
/// Colour slot count: `Empty` plus the four colours.
pub const NCOL: usize = 5;
/// Action kinds, matching `eval::ActionKind` ordering.
pub const NKIND: usize = 11;
/// Bucket for action magnitudes (tile counts, support counts).
pub const NMAG: usize = 8;

/// Head sizes. The policy head is a *factorised* decomposition — the full action
/// space is ~700 at a mid-game node and the product of kind x pos x colour would
/// need ~10^4 outputs, so instead a move scores as the sum of three small terms:
///
/// ```text
/// logit(a) = kind[k] + poscolour[pos*5 + c] + kindcolour[k*5 + c] + mag[m]
/// ```
///
/// `poscolour` carries the interaction that actually matters ("a black leader
/// on *this* square"), which an additive kind+position model cannot express.
pub const POLICY_KIND: usize = NKIND;
pub const POLICY_POSCOL: usize = NPOS * NCOL;
pub const POLICY_KINDCOL: usize = NKIND * NCOL;
pub const POLICY_MAG: usize = NMAG;
pub const POLICY_OUT: usize = POLICY_KIND + POLICY_POSCOL + POLICY_KINDCOL + POLICY_MAG;

pub const KIND_OFF: usize = 0;
pub const POSCOL_OFF: usize = KIND_OFF + POLICY_KIND;
pub const KINDCOL_OFF: usize = POSCOL_OFF + POLICY_POSCOL;
pub const MAG_OFF: usize = KINDCOL_OFF + POLICY_KINDCOL;

/// Number of scalar features. Fixed; asserted by a unit test so a silent change
/// cannot desynchronise a trained checkpoint.
pub const NFEAT: usize = 193;

/// Saturating scale: `x` divided by `scale`, clipped to `[-1, 1]`.
#[inline]
fn sc(x: f32, scale: f32) -> f32 {
    (x / scale).clamp(-1.0, 1.0)
}

#[inline]
fn pos_idx(p: Option<Pos>) -> usize {
    match p {
        Some(p) if (p.x as usize) < W && (p.y as usize) < H => p.x as usize * W + p.y as usize,
        // Out-of-board or absent: the dedicated "no position" slot.
        _ => W * H,
    }
}

#[inline]
fn colour_idx(t: Option<TileType>) -> usize {
    match t {
        Some(TileType::Blue) => 1,
        Some(TileType::Green) => 2,
        Some(TileType::Red) => 3,
        Some(TileType::Black) => 4,
        _ => 0,
    }
}

/// Precomputed per-node action description: the factorised head slots and a
/// back-pointer to the real action. Building these once per node (rather than
/// once per simulation) is what makes the factorised head affordable.
#[derive(Clone, Copy, Debug)]
pub struct ActionSlot {
    pub kind: usize,
    pub pos: usize,
    pub colour: usize,
    pub mag: usize,
}

/// Decompose an action into its factorised head slots.
///
/// Mirrors `eval::Factor::from`, which is the canonical action view.
pub fn slot_of(a: &crate::game::Action) -> ActionSlot {
    use crate::game::Action;
    match *a {
        Action::PlaceTile { pos, tile_type } => ActionSlot {
            kind: 0,
            pos: pos_idx(Some(pos)),
            colour: colour_idx(Some(tile_type)),
            mag: 0,
        },
        Action::PlaceLeader { pos, leader } => ActionSlot {
            kind: 1,
            pos: pos_idx(Some(pos)),
            colour: colour_idx(Some(leader.as_tile_type())),
            mag: 0,
        },
        Action::WithdrawLeader(pos) => ActionSlot {
            kind: 2,
            pos: pos_idx(Some(pos)),
            colour: 0,
            mag: 0,
        },
        Action::PlaceCatastrophe(pos) => ActionSlot {
            kind: 3,
            pos: pos_idx(Some(pos)),
            colour: 0,
            mag: 0,
        },
        Action::TakeTreasure(pos) => ActionSlot {
            kind: 4,
            pos: pos_idx(Some(pos)),
            colour: 0,
            mag: 0,
        },
        Action::BuildMonument(m) => ActionSlot {
            kind: 5,
            pos: NPOS - 1,
            colour: 0,
            mag: (m as usize).min(NMAG - 1),
        },
        Action::DeclineMonument => ActionSlot {
            kind: 6,
            pos: NPOS - 1,
            colour: 0,
            mag: 0,
        },
        Action::WarSelectLeader(l) => ActionSlot {
            kind: 7,
            pos: NPOS - 1,
            colour: colour_idx(Some(l.as_tile_type())),
            mag: 0,
        },
        Action::AddSupport(n) => ActionSlot {
            kind: 8,
            pos: NPOS - 1,
            colour: 0,
            mag: (n as usize).min(NMAG - 1),
        },
        Action::ReplaceTile(t) => {
            let singles = [
                (TileType::Red, t.red),
                (TileType::Blue, t.blue),
                (TileType::Green, t.green),
                (TileType::Black, t.black),
            ];
            let nz: Vec<(TileType, u8)> = singles.iter().filter(|(_, n)| *n > 0).map(|(c, n)| (*c, *n)).collect();
            let (c, m) = match nz.as_slice() {
                [(c, n)] => (Some(*c), *n),
                _ => (None, t.red + t.blue + t.green + t.black),
            };
            ActionSlot {
                kind: 9,
                pos: NPOS - 1,
                colour: colour_idx(c),
                mag: (m as usize).min(NMAG - 1),
            }
        }
        Action::Pass => ActionSlot {
            kind: 10,
            pos: NPOS - 1,
            colour: 0,
            mag: 0,
        },
    }
}

/// The flat policy-logit indices summed to score one action.
#[derive(Clone, Copy, Debug)]
pub struct SlotIndices {
    pub kind: usize,
    pub poscol: usize,
    pub kindcol: usize,
    pub mag: usize,
}

#[inline]
pub fn slot_indices(s: &ActionSlot) -> SlotIndices {
    SlotIndices {
        kind: KIND_OFF + s.kind,
        poscol: POSCOL_OFF + s.pos * NCOL + s.colour,
        kindcol: KINDCOL_OFF + s.kind * NCOL + s.colour,
        mag: MAG_OFF + s.mag,
    }
}

/// `logit(a)` from the flat policy head.
#[inline]
pub fn slot_logit(logits: &[f32], s: &ActionSlot) -> f32 {
    let i = slot_indices(s);
    logits[i.kind] + logits[i.poscol] + logits[i.kindcol] + logits[i.mag]
}

/// Per-leader, per-seat summary of everything the network needs about one
/// leader's local position. Computed once and reused across the feature vector.
struct LeaderInfo {
    present: bool,
    adj_own: f32,
    adj_temples: f32,
    adj_enemy_leaders: f32,
    kingdom_size: f32,
    own_tiles: f32,
    treasures: f32,
    enemy_leaders: f32,
    in_monument: f32,
}

/// Cached board analysis shared by every seat's feature block.
struct BoardCache {
    kingdoms: Vec<crate::game::Kingdom>,
    /// `kingdom_of[pos]` = index into `kingdoms`, or `usize::MAX`.
    kingdom_of: [usize; W * H],
    /// Precomputed monument kingdoms, so the per-leader loop does not re-flood.
    monument_kingdoms: Vec<(MonumentType, crate::game::Bitboard)>,
}

fn build_cache(state: &TnEGame) -> BoardCache {
    let kingdoms = state.board.kingdoms();
    let mut kingdom_of = [usize::MAX; W * H];
    for (i, k) in kingdoms.iter().enumerate() {
        for p in k.map.iter() {
            kingdom_of[p.x as usize * W + p.y as usize] = i;
        }
    }
    let connectable = state.board.connectable_bitboard();
    let monument_kingdoms = state
        .monuments
        .iter()
        .map(|m| {
            (
                m.monument_type,
                state.board.find_kingdom_map_fast(m.pos_top_left, connectable),
            )
        })
        .collect();
    BoardCache {
        kingdoms,
        kingdom_of,
        monument_kingdoms,
    }
}

fn leader_info_for(state: &TnEGame, cache: &BoardCache, seat: usize, leader: Leader) -> LeaderInfo {
    let mut info = LeaderInfo {
        present: false,
        adj_own: 0.0,
        adj_temples: 0.0,
        adj_enemy_leaders: 0.0,
        kingdom_size: 0.0,
        own_tiles: 0.0,
        treasures: 0.0,
        enemy_leaders: 0.0,
        in_monument: 0.0,
    };
    let ps = &state.players.0[seat];
    let pos = match ps.get_leader(leader) {
        Some(p) => p,
        None => return info,
    };
    info.present = true;
    let nbrs = pos.neighbors();
    let own_bitboard = match leader {
        Leader::Red => state.board.red_tiles,
        Leader::Blue => state.board.blue_tiles,
        Leader::Green => state.board.green_tiles,
        Leader::Black => state.board.black_tiles,
        Leader::None => return info,
    };
    info.adj_own = (nbrs & own_bitboard).count_ones() as f32;
    info.adj_temples = (nbrs & state.board.red_tiles).count_ones() as f32;
    let all_leaders = state.board.leader_red
        | state.board.leader_blue
        | state.board.leader_green
        | state.board.leader_black;
    for other in (nbrs & all_leaders).iter() {
        if state.board.get_player(other) != Player::from_index(seat) {
            info.adj_enemy_leaders += 1.0;
        }
    }
    let ki = cache.kingdom_of[pos.x as usize * W + pos.y as usize];
    if ki != usize::MAX {
        let k = &cache.kingdoms[ki];
        info.kingdom_size = k.map.count_ones() as f32;
        info.own_tiles = (k.map & own_bitboard).count_ones() as f32;
        info.treasures = (k.map & state.board.treasures).count_ones() as f32;
        for holder in [
            k.red_leader,
            k.blue_leader,
            k.green_leader,
            k.black_leader,
        ]
        .into_iter()
        .flatten()
        {
            if holder.0.index() != Some(seat) {
                info.enemy_leaders += 1.0;
            }
        }
    }
    // Standing inside any monument's kingdom that this colour scores from.
    for (mt, km) in cache.monument_kingdoms.iter() {
        if km.get(pos) && monument_matches(*mt, leader) {
            info.in_monument = 1.0;
        }
    }
    info
}

#[inline]
fn monument_matches(m: MonumentType, l: Leader) -> bool {
    use MonumentType::*;
    let (a, b) = match m {
        RedGreen => (Leader::Red, Leader::Green),
        RedBlue => (Leader::Red, Leader::Blue),
        GreenBlue => (Leader::Green, Leader::Blue),
        BlackRed => (Leader::Black, Leader::Red),
        BlackGreen => (Leader::Black, Leader::Green),
        BlackBlue => (Leader::Black, Leader::Blue),
    };
    l == a || l == b
}

/// Full feature vector for the player to move.
pub fn extract(state: &TnEGame, out: &mut [f32; NFEAT]) {
    out.fill(0.0);
    let n = state.num_players as usize;
    let me = state.next_player();
    let me_i = me.index().unwrap_or(0);
    let cache = build_cache(state);

    let bag = state.bag();
    let bag_total = bag.sum().max(1) as f32;
    // Tiles `me` cannot see, in hand-feature order (red, blue, green, black).
    let mut unseen = [bag.red as f32, bag.blue as f32, bag.green as f32, bag.black as f32];
    for i in (0..n).filter(|&i| i != me_i) {
        let p = &state.players.0[i];
        for (u, h) in unseen.iter_mut().zip([p.hand_red, p.hand_blue, p.hand_green, p.hand_black]) {
            *u += h as f32;
        }
    }
    let unseen_total = unseen.iter().sum::<f32>().max(1.0);

    let mut k = 0usize;
    let push = |v: f32, out: &mut [f32; NFEAT], k: &mut usize| {
        if *k < NFEAT {
            out[*k] = v;
        }
        *k += 1;
    };

    // --- block 1: my hand -------------------------------------------------
    let my = &state.players.0[me_i];
    for c in [my.hand_red, my.hand_blue, my.hand_green, my.hand_black] {
        push(sc(c as f32, 6.0), out, &mut k);
    }
    push(sc(my.hand_sum() as f32, 24.0), out, &mut k);
    push((state.state.len() as f32 / 200.0).clamp(0.0, 1.0), out, &mut k);

    // --- block 2: my score ------------------------------------------------
    let my_scores = [my.score_red, my.score_blue, my.score_green, my.score_black];
    for s in my_scores {
        push(sc(s as f32, 20.0), out, &mut k);
    }
    push(sc(my.score_sum() as f32, 60.0), out, &mut k);
    let my_min = *my_scores.iter().min().unwrap_or(&0);
    let my_max = *my_scores.iter().max().unwrap_or(&0);
    push(sc(my_min as f32, 20.0), out, &mut k);
    push(sc(my_max as f32, 20.0), out, &mut k);
    push(sc(my.calculate_score() as f32, 20.0), out, &mut k);
    push(sc(my.score_treasure as f32, 10.0), out, &mut k);
    push(sc(my.num_catastrophes as f32, 2.0), out, &mut k);

    // --- block 3: my leaders ---------------------------------------------
    let my_leader_info: [LeaderInfo; 4] = [
        leader_info_for(state, &cache, me_i, Leader::Red),
        leader_info_for(state, &cache, me_i, Leader::Blue),
        leader_info_for(state, &cache, me_i, Leader::Green),
        leader_info_for(state, &cache, me_i, Leader::Black),
    ];
    for i in 0..4 {
        push(if my_leader_info[i].present { 1.0 } else { -1.0 }, out, &mut k);
    }
    for i in 0..4 {
        push(sc(my_leader_info[i].adj_own, 4.0), out, &mut k);
        push(sc(my_leader_info[i].adj_temples, 4.0), out, &mut k);
        push(sc(my_leader_info[i].adj_enemy_leaders, 2.0), out, &mut k);
    }
    for i in 0..4 {
        push(sc(my_leader_info[i].kingdom_size, 15.0), out, &mut k);
        push(sc(my_leader_info[i].own_tiles, 15.0), out, &mut k);
        push(sc(my_leader_info[i].treasures, 5.0), out, &mut k);
        push(sc(my_leader_info[i].enemy_leaders, 4.0), out, &mut k);
        push(my_leader_info[i].in_monument, out, &mut k);
    }

    // --- block 4: my margin over the field -------------------------------
    for c in 0..4 {
        let mut sum = 0f32;
        let mut best = i16::MIN;
        for q in 0..n {
            if q == me_i {
                continue;
            }
            let s = opponent_colour_score(state, q, c) as f32;
            sum += s;
            if (s as i16) > best {
                best = s as i16;
            }
        }
        let others = if n > 1 { n - 1 } else { 1 };
        push(sc((my_scores[c] as f32 - sum / others as f32) / 6.0, 1.0), out, &mut k);
        push(sc((my_scores[c] as f32 - best as f32) / 6.0, 1.0), out, &mut k);
    }
    let mut best_opp_calc = i16::MIN;
    let mut best_opp_min = i16::MIN;
    for q in 0..n {
        if q == me_i {
            continue;
        }
        let c = opponent_calc_score(state, q) as i16;
        if c > best_opp_calc {
            best_opp_calc = c;
        }
        let m = opponent_min_colour(state, q) as i16;
        if m > best_opp_min {
            best_opp_min = m;
        }
    }
    push(sc((my.calculate_score() as i16 - best_opp_calc) as f32 / 4.0, 1.0), out, &mut k);
    push(sc((my_min as i16 - best_opp_min) as f32 / 4.0, 1.0), out, &mut k);
    push(sc((my_max - my_min) as f32, 12.0), out, &mut k);

    // --- block 5: opponents ----------------------------------------------
    for q in 0..4 {
        let opp = if q < n && q != me_i { q } else { usize::MAX };
        if opp == usize::MAX {
            // Same width as a live opponent below, so the vector length does not
            // depend on which seat happens to be to move. (It once did: the
            // padding branch was one element wider than the live one, silently
            // shifting every feature after this block for some seats.)
            for _ in 0..13 {
                push(0.0, out, &mut k);
            }
            for _ in 0..4 {
                push(-1.0, out, &mut k);
            }
            for _ in 0..4 {
                push(0.0, out, &mut k);
            }
            continue;
        }
        let ps = &state.players.0[opp];
        let scores = [ps.score_red, ps.score_blue, ps.score_green, ps.score_black];
        for s in scores {
            push(sc(s as f32, 20.0), out, &mut k);
        }
        push(sc(ps.score_sum() as f32, 60.0), out, &mut k);
        push(sc(ps.calculate_score() as f32, 20.0), out, &mut k);
        push(sc(ps.score_treasure as f32, 10.0), out, &mut k);
        push(sc(ps.num_catastrophes as f32, 2.0), out, &mut k);
        // Opponent hand colours are hidden: feed the expected count given the
        // tiles `me` cannot see, so the net never learns to rely on them.
        for c in unseen {
            push(sc(ps.hand_sum() as f32 * c / unseen_total, 6.0), out, &mut k);
        }
        push(sc(ps.hand_sum() as f32, 24.0), out, &mut k);
        let infos: [LeaderInfo; 4] = [
            leader_info_for(state, &cache, opp, Leader::Red),
            leader_info_for(state, &cache, opp, Leader::Blue),
            leader_info_for(state, &cache, opp, Leader::Green),
            leader_info_for(state, &cache, opp, Leader::Black),
        ];
        for i in 0..4 {
            push(if infos[i].present { 1.0 } else { -1.0 }, out, &mut k);
        }
        for i in 0..4 {
            push(sc(infos[i].own_tiles, 15.0), out, &mut k);
        }
    }

    // --- block 6: bag -----------------------------------------------------
    push(sc(bag.red as f32, 153.0), out, &mut k);
    push(sc(bag.blue as f32, 153.0), out, &mut k);
    push(sc(bag.green as f32, 153.0), out, &mut k);
    push(sc(bag.black as f32, 153.0), out, &mut k);
    push(sc(bag_total, 153.0), out, &mut k);
    push(bag.red as f32 / bag_total, out, &mut k);
    push(bag.blue as f32 / bag_total, out, &mut k);
    push(bag.green as f32 / bag_total, out, &mut k);
    push(bag.black as f32 / bag_total, out, &mut k);

    // --- block 7: board ---------------------------------------------------
    push(sc(state.board.treasures.count_ones() as f32, 10.0), out, &mut k);
    push(sc(state.board.red_tiles.count_ones() as f32, 70.0), out, &mut k);
    push(sc(state.board.blue_tiles.count_ones() as f32, 45.0), out, &mut k);
    push(sc(state.board.green_tiles.count_ones() as f32, 40.0), out, &mut k);
    push(sc(state.board.black_tiles.count_ones() as f32, 40.0), out, &mut k);
    push(sc(state.monuments.len() as f32, 6.0), out, &mut k);
    push(sc(state.available_monuments.len() as f32, 6.0), out, &mut k);
    push(sc(state.board.river.count_ones() as f32, 60.0), out, &mut k);

    // --- block 8: phase ---------------------------------------------------
    let pa = state.next_action();
    let phase = match pa {
        PlayerAction::Normal => 0,
        PlayerAction::TakeTreasure(_) => 1,
        PlayerAction::AddSupport(_) => 2,
        PlayerAction::SelectLeader { .. } => 3,
        PlayerAction::BuildMonument(_, _) => 4,
    };
    for i in 0..5 {
        push(if i == phase { 1.0 } else { 0.0 }, out, &mut k);
    }

    // Pending revolt: is the decision mine, and who is stronger.
    if let Some(c) = state.internal_conflict {
        let i_am_attacker = c.attacker == me;
        push(if i_am_attacker { 1.0 } else { -1.0 }, out, &mut k);
        let mine = if i_am_attacker {
            c.attacker_support
        } else {
            c.defender_support
        };
        let theirs = if i_am_attacker {
            c.defender_support
        } else {
            c.attacker_support
        };
        push(sc(mine as f32, 10.0), out, &mut k);
        push(sc(theirs as f32, 10.0), out, &mut k);
        push(sc(mine as f32 - theirs as f32, 6.0), out, &mut k);
        push(if mine > theirs { 1.0 } else { -1.0 }, out, &mut k);
        push(colour_idx(Some(c.conflict_leader.as_tile_type())) as f32 / 4.0 - 0.5, out, &mut k);
    } else {
        for _ in 0..6 {
            push(0.0, out, &mut k);
        }
    }

    // Pending war: how many colours are contested and what am I fighting over.
    if let Some(ref ec) = state.external_conflict {
        push(ec.conflicts.len().min(4) as f32 / 4.0, out, &mut k);
        let mut mine = 0f32;
        let mut theirs = 0f32;
        for c in ec.conflicts.iter() {
            if c.attacker == me {
                mine += 1.0;
            } else if c.defender == me {
                theirs += 1.0;
            }
        }
        push(sc(mine, 4.0), out, &mut k);
        push(sc(theirs, 4.0), out, &mut k);
        push(sc(mine - theirs, 4.0), out, &mut k);
        push(colour_idx(Some(ec.unification_tile_type)) as f32 / 4.0 - 0.5, out, &mut k);
    } else {
        for _ in 0..5 {
            push(0.0, out, &mut k);
        }
    }

    // --- block 9: seat identity ------------------------------------------
    for i in 0..4 {
        push(if i == n { 1.0 } else { 0.0 }, out, &mut k);
    }
    for i in 0..4 {
        push(if i == me_i { 1.0 } else { 0.0 }, out, &mut k);
    }
    push(if me == state.start_player { 1.0 } else { -1.0 }, out, &mut k);
    let standings = state.standings();
    let rank = standings
        .iter()
        .position(|(p, _)| *p == me)
        .unwrap_or(0)
        .min(3);
    for i in 0..4 {
        push(if i == rank { 1.0 } else { 0.0 }, out, &mut k);
    }

    assert_eq!(k, NFEAT, "feature vector size drifted from NFEAT");
}

#[inline]
fn opponent_colour_score(state: &TnEGame, seat: usize, c: usize) -> u8 {
    let ps = &state.players.0[seat];
    [ps.score_red, ps.score_blue, ps.score_green, ps.score_black][c]
}

#[inline]
fn opponent_calc_score(state: &TnEGame, seat: usize) -> u8 {
    state.players.0[seat].calculate_score()
}

#[inline]
fn opponent_min_colour(state: &TnEGame, seat: usize) -> u8 {
    let ps = &state.players.0[seat];
    *[
        ps.score_red,
        ps.score_blue,
        ps.score_green,
        ps.score_black,
    ]
    .iter()
    .min()
    .unwrap_or(&0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::maps::MapSpec;

    #[test]
    fn feature_size_is_stable() {
        let g = MapSpec::default_map().start_game(4, 11);
        let mut f = [0f32; NFEAT];
        extract(&g, &mut f);
        assert!(f.iter().all(|v| v.is_finite()));
    }

    #[test]
    fn slot_indices_are_in_range() {
        let g = MapSpec::default_map().start_game(4, 12);
        for a in crate::puct::legal_actions(&g) {
            let s = slot_of(&a);
            let i = slot_indices(&s);
            assert!(i.kind < POLICY_OUT);
            assert!(i.poscol < POLICY_OUT);
            assert!(i.kindcol < POLICY_OUT);
            assert!(i.mag < POLICY_OUT);
        }
    }
}