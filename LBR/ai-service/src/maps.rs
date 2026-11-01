//! Procedural map generation with playability constraints.
//!
//! PRD refs: 004 §1–§2 (E1–E6).
//!
//! Design decisions (locked):
//! - variable size: width ∈ [13,16], height ∈ [8,11]
//! - 2–4 random river walks, walk length scaled to map size
//! - starting temples scaled with area, 6 (smallest) → 14 (largest)
//! - a guarantee of ≥1 reachable 2×2 river square (for a blue/water monument)
//!   that touches at least one land cell
//! - opening leader slots ≥ num_players

use crate::game::{Bitboard, Board, Player, Pos, Rng, TnEGame, H, W};
use crate::game::RIVER as DEFAULT_RIVER;
use crate::pos;
use serde::{Deserialize, Serialize};

/// A playable map layout.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MapSpec {
    pub name: String,
    /// River cells (blue tiles may only be placed here).
    pub river: Bitboard,
    /// Starting treasure+temple cells.
    pub temples: Bitboard,
    pub width: u8,
    pub height: u8,
}

/// Smallest/largest supported playable dimensions.
pub const MIN_WIDTH: u8 = 13;
pub const MAX_WIDTH: u8 = 16;
pub const MIN_HEIGHT: u8 = 8;
pub const MAX_HEIGHT: u8 = 11;
pub const MIN_TEMPLES: u8 = 6;
pub const MAX_TEMPLES: u8 = 14;

impl MapSpec {
    pub fn to_board(&self) -> Board {
        Board::from_layout(self.river, self.temples, self.width, self.height)
    }

    pub fn start_game(&self, num_players: u8, seed: u64) -> TnEGame {
        TnEGame::with_map(self.to_board(), num_players, seed)
    }

    /// The canonical rulebook map (E2).
    pub fn default_map() -> Self {
        MapSpec {
            name: "default".to_string(),
            river: *DEFAULT_RIVER,
            temples: default_temples(),
            width: W as u8,
            height: H as u8,
        }
    }

    pub fn temple_positions(&self) -> Vec<Pos> {
        self.temples.iter().collect()
    }

    /// Count empty non-river cells adjacent to a temple: legal opening leader
    /// slots.
    pub fn opening_leader_slots(&self) -> u8 {
        let mut slots = Bitboard::new();
        for t in self.temples.iter() {
            for n in t.neighbors().iter() {
                if n.x < self.height && n.y < self.width && !self.river.get(n) {
                    slots.set(n);
                }
            }
        }
        slots.reset_overlap(&self.temples);
        slots.count_ones()
    }

    /// True if `river` contains a 2×2 block that also touches a land cell.
    pub fn has_reachable_water_square(&self) -> bool {
        for x in 0..self.height.saturating_sub(1) {
            for y in 0..self.width.saturating_sub(1) {
                let tl = pos!(x, y);
                let block = [
                    tl,
                    pos!(x + 1, y),
                    pos!(x, y + 1),
                    pos!(x + 1, y + 1),
                ];
                if !block.iter().all(|p| self.river.get(*p)) {
                    continue;
                }
                // Touching land: at least one perimeter cell in bounds and
                // non-river.
                let touches_land = block.iter().any(|p| {
                    p.neighbors().iter().any(|n| {
                        n.x < self.height
                            && n.y < self.width
                            && !self.river.get(n)
                    })
                });
                if touches_land {
                    return true;
                }
            }
        }
        false
    }

    /// Playability constraints (E5 + locked decisions).
    pub fn is_playable(&self, num_players: u8) -> Result<(), String> {
        if self.width < MIN_WIDTH || self.width > MAX_WIDTH {
            return Err("width out of range".into());
        }
        if self.height < MIN_HEIGHT || self.height > MAX_HEIGHT {
            return Err("height out of range".into());
        }
        let temples = self.temple_positions();
        if temples.len() < MIN_TEMPLES as usize {
            return Err("too few temples".into());
        }
        if (self.river & self.temples).count_ones() != 0 {
            return Err("river overlaps temple".into());
        }
        if self.river.count_ones() == 0 {
            return Err("no river".into());
        }
        if self.opening_leader_slots() < num_players.max(2) {
            return Err("not enough opening leader slots".into());
        }
        if !self.has_reachable_water_square() {
            return Err("no reachable 2x2 water square".into());
        }
        Ok(())
    }
}

fn default_temples() -> Bitboard {
    // Mirrors the 't' cells in game.rs::BOARD.
    const LAYOUT: [&str; 11] = [
        "....xxxxx.t.x...",
        ".t..x.......x..t",
        "...xxt......xx..",
        "xxxx.........xxx",
        ".............txx",
        "..............x.",
        "xxxx.....t..xxx.",
        ".t.xxxxx....x...",
        ".......xxxxxx.t.",
        "......t.........",
        "..........t.....",
    ];
    let mut temples = Bitboard::new();
    for (x, row) in LAYOUT.iter().enumerate() {
        for (y, c) in row.chars().enumerate() {
            if c == 't' {
                temples.set(pos!(x as u8, y as u8));
            }
        }
    }
    temples
}

/// Number of starting temples for a map of the given size: linearly from
/// `MIN_TEMPLES` (smallest area) to `MAX_TEMPLES` (largest area).
pub fn scaled_temples(width: u8, height: u8) -> usize {
    let area = width as f64 * height as f64;
    let min_area = MIN_WIDTH as f64 * MIN_HEIGHT as f64; // 104
    let max_area = MAX_WIDTH as f64 * MAX_HEIGHT as f64; // 176
    let t = ((area - min_area) / (max_area - min_area)).clamp(0.0, 1.0);
    let n = MIN_TEMPLES as f64 + t * (MAX_TEMPLES - MIN_TEMPLES) as f64;
    n.round() as usize
}

/// River walk length range for a map of the given size: `(w+h)/2 .. (w+h)`.
pub fn river_walk_len_range(width: u8, height: u8) -> (u64, u64) {
    let span = width as u64 + height as u64;
    ((span + 1) / 2, span)
}

/// Generate `count` playable candidate maps (E4–E6). Deterministic given seed.
pub fn generate_maps(count: usize, num_players: u8, seed: u64) -> Vec<MapSpec> {
    let mut rng = Rng::new(seed);
    let mut out = Vec::with_capacity(count);
    let mut attempts = 0;
    while out.len() < count && attempts < count * 400 + 2000 {
        attempts += 1;
        let spec = generate_one(&mut rng, out.len());
        if spec.is_playable(num_players).is_ok() {
            out.push(spec);
        }
    }
    out
}

fn generate_one(rng: &mut Rng, idx: usize) -> MapSpec {
    let width = MIN_WIDTH + rng.below((MAX_WIDTH - MIN_WIDTH + 1) as u64) as u8;
    let height = MIN_HEIGHT + rng.below((MAX_HEIGHT - MIN_HEIGHT + 1) as u64) as u8;

    let mut river = generate_river(rng, width, height);
    ensure_water_square(rng, &mut river, width, height);

    let target = scaled_temples(width, height);
    let temples = generate_temples(rng, &river, width, height, target);

    MapSpec {
        name: format!("map-{idx}-{seedtag:04x}-{width}x{height}", seedtag = rng.below(0xFFFF)),
        river,
        temples,
        width,
        height,
    }
}

/// Random rivers formed by 2–4 connected random walks.
fn generate_river(rng: &mut Rng, width: u8, height: u8) -> Bitboard {
    let mut river = Bitboard::new();
    let walks = 2 + rng.below(3) as usize; // 2..=4
    let (lo, hi) = river_walk_len_range(width, height);
    for _ in 0..walks {
        let mut x = rng.below(height as u64) as u8;
        let mut y = rng.below(width as u64) as u8;
        let len = lo + rng.below(hi - lo + 1);
        for _ in 0..len {
            river.set(pos!(x, y));
            let horiz = rng.below(2) == 0;
            if horiz {
                if rng.below(2) == 0 && y > 0 {
                    y -= 1;
                } else if y < width - 1 {
                    y += 1;
                }
            } else if rng.below(2) == 0 && x > 0 {
                x -= 1;
            } else if x < height - 1 {
                x += 1;
            }
        }
    }
    river
}

/// Guarantee at least one 2×2 all-river block that touches land.
fn ensure_water_square(rng: &mut Rng, river: &mut Bitboard, width: u8, height: u8) {
    let spec_like = |r: &Bitboard| {
        for x in 0..height.saturating_sub(1) {
            for y in 0..width.saturating_sub(1) {
                let block = [
                    pos!(x, y),
                    pos!(x + 1, y),
                    pos!(x, y + 1),
                    pos!(x + 1, y + 1),
                ];
                if !block.iter().all(|p| r.get(*p)) {
                    continue;
                }
                let touches_land = block.iter().any(|p| {
                    p.neighbors().iter().any(|n| {
                        n.x < height && n.y < width && !r.get(n)
                    })
                });
                if touches_land {
                    return true;
                }
            }
        }
        false
    };

    if spec_like(river) {
        return;
    }
    // Carve a random 2×2 block; retry until it touches land.
    for _ in 0..64 {
        if height < 2 || width < 2 {
            return;
        }
        let x = rng.below((height - 1) as u64) as u8;
        let y = rng.below((width - 1) as u64) as u8;
        let block = [
            pos!(x, y),
            pos!(x + 1, y),
            pos!(x, y + 1),
            pos!(x + 1, y + 1),
        ];
        for p in block.iter() {
            river.set(*p);
        }
        if spec_like(river) {
            return;
        }
    }
}

/// Spread temples on non-river cells with a minimum spacing.
fn generate_temples(
    rng: &mut Rng,
    river: &Bitboard,
    width: u8,
    height: u8,
    target: usize,
) -> Bitboard {
    let mut temples = Bitboard::new();
    let mut positions: Vec<Pos> = Vec::new();
    // Try with min spacing 2 first; relax to 1 if the map is small.
    for &min_spacing in &[2u8, 1u8] {
        let mut attempts = 0;
        while positions.len() < target && attempts < 8000 {
            attempts += 1;
            let x = rng.below(height as u64) as u8;
            let y = rng.below(width as u64) as u8;
            let p = pos!(x, y);
            if river.get(p) || temples.get(p) {
                continue;
            }
            if positions.iter().any(|q| q.manhattan_distance(p) < min_spacing) {
                continue;
            }
            temples.set(p);
            positions.push(p);
        }
        if positions.len() >= target {
            break;
        }
    }
    temples
}

/// Rotate the starting player / seat assignment for a game (used by the
/// self-play harness, E8). Returns the agent index that should sit in each
/// seat for game `g`.
pub fn seat_rotation(agent: usize, seat: usize, num_agents: usize, g: usize) -> usize {
    (agent + seat + g) % num_agents.max(1)
}

/// Convert a seat to a player.
pub fn seat_player(seat: usize) -> Player {
    Player::from_index(seat)
}

impl Bitboard {
    /// Remove all bits present in `other` from `self`.
    pub fn reset_overlap(&mut self, other: &Bitboard) {
        *self &= !*other;
    }
}
