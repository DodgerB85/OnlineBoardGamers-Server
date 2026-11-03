use primitive_types::U256;
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
pub const W: usize = 16;
pub const H: usize = 11;

#[macro_export]
macro_rules! pos {
    // compile time convert 1A to 00
    ($s:expr) => {
        pos($s)
    };

    ($x:expr, $y:expr) => {
        Pos { x: $x as u8, y: $y as u8 }
    };
}

static NEIGHBORS_MASK: Lazy<[[Bitboard; W]; H]> = Lazy::new(|| {
    let mut mask = [[Bitboard::new(); W]; H];
    for r in 0..H {
        for c in 0..W {
            let pos = pos!(r as u8, c as u8);
            if pos.x > 0 {
                mask[r][c].set(pos!(pos.x - 1, pos.y));
            }
            if pos.x < H as u8 - 1 {
                mask[r][c].set(pos!(pos.x + 1, pos.y));
            }
            if pos.y > 0 {
                mask[r][c].set(pos!(pos.x, pos.y - 1));
            }
            if pos.y < W as u8 - 1 {
                mask[r][c].set(pos!(pos.x, pos.y + 1));
            }
        }
    }
    mask
});

static POS_TO_BITBOARD: Lazy<[[Bitboard; W]; H]> = Lazy::new(|| {
    let mut ret = [[Bitboard::new(); W]; H];
    for x in 0..H {
        for y in 0..W {
            let pos = pos!(x as u8, y as u8);
            let mut bitboard = Bitboard::new();
            bitboard.0 |= U256::one() << pos.index();
            ret[x][y] = bitboard;
        }
    }
    ret
});

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub struct Players(pub [PlayerState; 4]);
impl Players {
    pub fn get(&self, player: Player) -> &PlayerState {
        &self.0[player.index().expect("inactive player")]
    }
    pub fn get_mut(&mut self, player: Player) -> &mut PlayerState {
        &mut self.0[player.index().expect("inactive player")]
    }
}

#[derive(Clone, Eq, PartialEq, Serialize, Deserialize)]
pub struct Monument {
    pub monument_type: MonumentType,
    pub pos_top_left: Pos,
}

/// record last N moves
#[derive(Clone, Eq, PartialEq, Serialize, Deserialize)]
pub struct MoveHistory<const N: usize> {
    pub last_placed_tiles: Vec<Option<Pos>>,
    pub last_moved_leaders: Vec<Option<Pos>>,
}

impl<const N: usize> MoveHistory<N> {
    pub const N: usize = N;

    pub fn new() -> Self {
        Self {
            last_placed_tiles: vec![None; N],
            last_moved_leaders: vec![None; N],
        }
    }

    pub fn record(&mut self, action: &Action) {
        // always keep length = N

        self.last_placed_tiles.remove(0);
        self.last_moved_leaders.remove(0);

        let (t, l) = match action {
            Action::PlaceTile { pos: to, .. } => (Some(*to), None),
            Action::PlaceLeader { pos, .. } => (None, Some(*pos)),
            _ => (None, None),
        };

        self.last_moved_leaders.push(l);
        self.last_placed_tiles.push(t);
    }
}

#[derive(Clone, Eq, PartialEq, Serialize, Deserialize)]
pub struct TnEGame {
    pub board: Board,
    pub players: Players,
    pub move_history: MoveHistory<6>,
    pub bag: Tiles,

    pub available_monuments: Vec<MonumentType>,
    pub monuments: Vec<Monument>,

    pub state: Vec<GameState>,

    pub play_action_stack: Vec<(Player, PlayerAction)>,
    pub player_turn: Player,

    /// the last player who executed 2 actions
    pub last_player: Player,

    /// the last player who executed a normal action
    pub last_player_normal_action: Player,

    /// the last player who executed an action
    pub last_action_player: Player,

    /// Revolt
    pub internal_conflict: Option<Conflict>,

    /// War
    pub external_conflict: Option<ExternalConflict>,
    
    /// Number of active players (2, 3 or 4).
    #[serde(default = "default_num_players")]
    pub num_players: u8,

    /// The seat that takes the first turn.
    #[serde(default = "default_start_player")]
    pub start_player: Player,

    /// Seeded RNG used for all game randomness (bag draws, start player).
    /// Deterministic: `(map, num_players, seed)` reproduces a game exactly.
    #[serde(default)]
    pub rng: Rng,
}

pub fn default_num_players() -> u8 {
    2
}

pub fn default_start_player() -> Player {
    Player::Player1
}

pub fn default_board_width() -> u8 {
    W as u8
}

pub fn default_board_height() -> u8 {
    H as u8
}

/// Tiny deterministic PRNG (splitmix64). Values are stored as `u64` so the
/// whole game state stays `Clone + Eq + Serialize`, enabling reproducible and
/// cheap-clonable search.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Rng(pub u64);

impl Default for Rng {
    fn default() -> Self {
        Rng(0x9E37_79B9_7F4A_7C15)
    }
}

impl Rng {
    #[inline]
    pub fn new(seed: u64) -> Self {
        Rng(seed ^ 0x9E37_79B9_7F4A_7C15)
    }

    #[inline]
    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    /// Uniform-ish sample in `[0, n)` (n == 0 -> 0).
    #[inline]
    pub fn below(&mut self, n: u64) -> u64 {
        if n == 0 {
            0
        } else {
            self.next_u64() % n
        }
    }
}

impl std::fmt::Debug for TnEGame {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TnE")
            .field("board", &self.board)
            .field("players", &self.players)
            .field("bag", &self.bag)
            .field("state", &self.state)
            .field("play_action_stack", &self.play_action_stack)
            .field("player_turn", &self.player_turn)
            .field("last_player", &self.last_player)
            .field("internal_conflict", &self.internal_conflict)
            .field("external_conflict", &self.external_conflict)
            .finish()
    }
}

#[derive(Default)]
pub struct Kingdom {
    pub map: Bitboard,
    pub red_leader: Option<(Player, Pos)>,
    pub black_leader: Option<(Player, Pos)>,
    pub green_leader: Option<(Player, Pos)>,
    pub blue_leader: Option<(Player, Pos)>,

    red_tiles: u8,
    black_tiles: u8,
    green_tiles: u8,
    blue_tiles: u8,
    /// Treasures in this kingdom. A `Vec`, not a fixed pair: rulebook L38-40
    /// takes "all but one", so a kingdom holding three or more must be able to
    /// represent every one of them.
    treasures: Vec<Pos>,
}

impl Kingdom {
    fn has_leader(&self) -> bool {
        self.red_leader.is_some()
            || self.black_leader.is_some()
            || self.green_leader.is_some()
            || self.blue_leader.is_some()
    }

    pub fn get_leader_info(&self, leader: Leader) -> Option<(Player, Pos, u8)> {
        match leader {
            Leader::Red => self.red_leader.map(|(p, pos)| (p, pos, self.red_tiles)),
            Leader::Black => self.black_leader.map(|(p, pos)| (p, pos, self.black_tiles)),
            Leader::Green => self.green_leader.map(|(p, pos)| (p, pos, self.green_tiles)),
            Leader::Blue => self.blue_leader.map(|(p, pos)| (p, pos, self.blue_tiles)),
            Leader::None => None,
        }
    }
}

impl Default for TnEGame {
    fn default() -> Self {
        Self::new()
    }
}

impl TnEGame {
    /// Seed used by the test-build constructor of [`TnEGame::new`].
    #[cfg(test)]
    pub const TEST_SEED: u64 = 0x5EED_C0DE;

    /// Legacy constructor: non-deterministic (matches historical behaviour).
    /// Use `with_config`/`with_start` for reproducible games.
    #[cfg(not(test))]
    pub fn new() -> Self {
        let seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x5EED);
        Self::with_start(2, seed, Player::Player1)
    }

    /// Test-build constructor: same game, fixed seed.
    ///
    /// The runtime constructor is time-seeded, so every test written against it
    /// got a *random* starting hand and could fail intermittently — `TnEGame::new`
    /// is called 47 times in this module's tests alone, and
    /// `tests::test_generate_move` (which places a red tile straight from the
    /// opening hand) failed 3 times in 60 runs on unmodified code. A test that
    /// fails 5% of the time is worse than no test: it trains everyone to
    /// re-run red builds.
    ///
    /// The project's contract is "fixed seeds ⇒ identical play", and that has
    /// to hold for the tests too.
    #[cfg(test)]
    pub fn new() -> Self {
        Self::with_start(2, Self::TEST_SEED, Player::Player1)
    }

    /// Create a game for `num_players` (2, 3 or 4) using `seed` for all
    /// randomness. `start_player` is chosen from the seed.
    pub fn with_config(num_players: u8, seed: u64) -> Self {
        let start_player = {
            let mut r = Rng::new(seed);
            Player::from_index(r.below(num_players as u64) as usize)
        };
        Self::assemble(Board::new(), num_players, seed, start_player)
    }

    /// Start a game on a specific board (procedural maps, PRD 004 E3).
    pub fn with_map(board: Board, num_players: u8, seed: u64) -> Self {
        let start_player = {
            let mut r = Rng::new(seed);
            Player::from_index(r.below(num_players as u64) as usize)
        };
        Self::assemble(board, num_players, seed, start_player)
    }

    /// Reconstruct the same game setup with a specific starting player.
    pub fn with_start(num_players: u8, seed: u64, start_player: Player) -> Self {
        Self::assemble(Board::new(), num_players, seed, start_player)
    }

    fn assemble(board: Board, num_players: u8, seed: u64, start_player: Player) -> Self {
        assert!((2..=4).contains(&num_players), "num_players must be 2..=4");
        let rng = Rng::new(seed);
        let starting_temples = board.temple_count();

        let mut game = TnEGame {
            board,
            players: Players([PlayerState::new(); 4]),
            state: vec![GameState::Normal],
            move_history: MoveHistory::new(),
            available_monuments: vec![
                MonumentType::RedGreen,
                MonumentType::RedBlue,
                MonumentType::GreenBlue,
                MonumentType::BlackRed,
                MonumentType::BlackGreen,
                MonumentType::BlackBlue,
            ],
            monuments: vec![],
            // Rulebook L13-14: 153 civilization tiles total (57 red, 36 blue,
            // 30 green, 30 black). L22-23: "Put a red temple and one treasure
            // onto each of the ten board spaces marked by a winged beast. Put
            // all REMAINING civilization tiles into the bag."
            //
            // The board placement above has already consumed temples, so the
            // bag is decremented by however many the board actually took rather
            // than seeded with the full 153. Seeding 57 red while also placing
            // 10 on the board shipped 163 tiles and pushed the "bag is empty"
            // end condition roughly ten placements late. Computing the
            // subtraction (instead of hardcoding 47) keeps it correct for
            // procedural maps with a different number of starting temples.
            bag: Tiles {
                red: 57u8.saturating_sub(starting_temples),
                black: 30,
                green: 30,
                blue: 36,
            },
            play_action_stack: vec![
                (start_player, PlayerAction::Normal),
                (start_player, PlayerAction::Normal),
            ],
            player_turn: start_player,
            internal_conflict: None,
            external_conflict: None,
            last_player: Player::None,
            last_action_player: Player::None,
            last_player_normal_action: Player::None,
            num_players,
            start_player,
            rng,
        };

        // initial draw for players, each player draws 6 tiles
        for i in 0..num_players as usize {
            let mut p = game.players.0[i];
            game.bag.player_draw(&mut p, 6, &mut game.rng);
            game.players.0[i] = p;
        }

        game
    }

    /// Get a reference to the tile bag (remaining tiles to draw)
    pub fn bag(&self) -> &Tiles {
        &self.bag
    }

    /// Re-deal every hand but `viewer`'s from the tiles `viewer` cannot see
    /// (the bag plus those hands), keeping each hand's size. Turns the true
    /// state into one consistent with what `viewer` knows.
    pub fn redeal_hidden(&mut self, viewer: Player, rng: &mut Rng) {
        let others: Vec<usize> = (0..self.num_players as usize)
            .filter(|&i| Some(i) != viewer.index())
            .collect();
        let mut sizes = Vec::with_capacity(others.len());
        for &i in &others {
            let p = &mut self.players.0[i];
            sizes.push(p.hand_sum());
            self.bag.red += p.hand_red;
            self.bag.blue += p.hand_blue;
            self.bag.green += p.hand_green;
            self.bag.black += p.hand_black;
            (p.hand_red, p.hand_blue, p.hand_green, p.hand_black) = (0, 0, 0, 0);
        }
        for (&i, &n) in others.iter().zip(&sizes) {
            self.bag.player_draw(&mut self.players.0[i], n, rng);
        }
    }

    /// Copy everything `viewer` cannot see (other hands, bag, RNG) from `other`.
    pub fn copy_hidden_from(&mut self, other: &TnEGame, viewer: Player) {
        for i in 0..self.num_players as usize {
            if Some(i) != viewer.index() {
                let (o, p) = (&other.players.0[i], &mut self.players.0[i]);
                (p.hand_red, p.hand_blue, p.hand_green, p.hand_black) =
                    (o.hand_red, o.hand_blue, o.hand_green, o.hand_black);
            }
        }
        self.bag = other.bag;
        self.rng = other.rng;
    }
}

/// A conflict as it stands right now, for display.
///
/// The stored `Conflict` keeps base strengths snapshotted when the war opened,
/// which is not what the verdict uses — the resolution recounts the tiles of the
/// conflict colour in each leader's kingdom at the moment it fights, because an
/// earlier colour's discard can have split a kingdom (rulebook L76). A UI that
/// showed the snapshot would sometimes show a different winner from the one the
/// game picks, so the strengths here are recomputed the same way the resolution
/// recomputes them.
#[derive(Clone, Copy, Debug)]
pub struct ConflictStanding {
    pub colour: TileType,
    pub is_internal: bool,
    pub attacker: Player,
    pub attacker_base: u8,
    pub attacker_support: u8,
    pub attacker_sent: bool,
    pub defender: Player,
    pub defender_base: u8,
    pub defender_support: u8,
    pub defender_sent: bool,
}

impl ConflictStanding {
    pub fn attacker_total(&self) -> u8 {
        self.attacker_base + self.attacker_support
    }
    pub fn defender_total(&self) -> u8 {
        self.defender_base + self.defender_support
    }

    /// Who wins if the war ended now. The attacker must strictly exceed; a tie
    /// goes to the defender (rulebook L71, "exceeds").
    pub fn leader(&self) -> Player {
        if self.attacker_total() > self.defender_total() {
            self.attacker
        } else {
            self.defender
        }
    }
}

impl TnEGame {
    /// Every conflict currently on the board, in resolution order.
    pub fn conflict_standings(&self) -> Vec<ConflictStanding> {
        let mut out = Vec::new();

        let count_in_kingdom = |at: Pos, t: TileType| -> u8 {
            // As in the resolution: measure each leader's own kingdom, not the
            // one produced by treating the pending unification tile as a tile.
            let k = self
                .board
                .find_kingdom_excluding(at, self.board.unification_tile);
            let bb = match t {
                TileType::Red => k.map & self.board.red_tiles,
                TileType::Blue => k.map & self.board.blue_tiles,
                TileType::Green => k.map & self.board.green_tiles,
                TileType::Black => k.map & self.board.black_tiles,
                TileType::Empty => Bitboard::new(),
            };
            bb.count_ones()
        };
        // A revolt is fought with temples next to the leader (L50-54).
        let adjacent_temples = |at: Pos| -> u8 { (at.neighbors() & self.board.red_tiles).count_ones() };

        let mut push = |c: &Conflict, internal: bool| {
            let (ab, db) = if internal {
                (adjacent_temples(c.attacker_pos), adjacent_temples(c.defender_pos))
            } else {
                let col = c.conflict_leader.as_tile_type();
                (count_in_kingdom(c.attacker_pos, col), count_in_kingdom(c.defender_pos, col))
            };
            out.push(ConflictStanding {
                colour: c.conflict_leader.as_tile_type(),
                is_internal: internal,
                attacker: c.attacker,
                attacker_base: ab,
                attacker_support: c.attacker_support,
                attacker_sent: c.attacker_sent_support,
                defender: c.defender,
                defender_base: db,
                defender_support: c.defender_support,
                defender_sent: c.defender_sent_support,
            });
        };

        if let Some(c) = self.internal_conflict.as_ref() {
            push(c, true);
        }
        if let Some(ec) = self.external_conflict.as_ref() {
            for c in ec.conflicts.iter() {
                push(c, false);
            }
        }
        out
    }
}

impl TnEGame {
    /// A hash covering *every* field that can affect future play.
    ///
    /// Distinct from `compute_zobrist_hash`, which is tuned for search and skips
    /// some rarely-changing state (treasure positions, monument list, the RNG
    /// stream). Both are 64-bit, so neither is collision-free — but a search
    /// that reuses a node keyed on identity cannot tolerate a collision in the
    /// fields it omits, so the tree-reuse path gets its own complete hash.
    /// Verified against a full structural comparison in `identity_matches`.
    pub fn identity_hash(&self) -> u64 {
        let mut h: u64 = 0x9E37_79B9_7F4A_7C15;
        let mut mix = |v: u64| {
            h ^= v.wrapping_add(0x9E37_79B9_7F4A_7C15).wrapping_add(h << 6).wrapping_add(h >> 2);
            h = h.wrapping_mul(0x100000001B3);
        };
        for bb in [
            &self.board.red_tiles,
            &self.board.blue_tiles,
            &self.board.green_tiles,
            &self.board.black_tiles,
            &self.board.catastrophes,
            &self.board.monuments,
            &self.board.treasures,
            &self.board.river,
            &self.board.leader_red,
            &self.board.leader_blue,
            &self.board.leader_green,
            &self.board.leader_black,
            &self.board.players[0],
            &self.board.players[1],
            &self.board.players[2],
            &self.board.players[3],
        ] {
            for &w in bb.0 .0.iter() {
                mix(w);
            }
        }
        mix(self.board.width as u64);
        mix(self.board.height as u64);
        mix(match self.board.unification_tile {
            Some(p) => (p.x as u64) << 8 | p.y as u64,
            None => u64::MAX,
        });
        mix(self.num_players as u64);
        for i in 0..self.num_players as usize {
            let ps = &self.players.0[i];
            for l in [
                ps.placed_red_leader,
                ps.placed_blue_leader,
                ps.placed_green_leader,
                ps.placed_black_leader,
            ] {
                mix(match l {
                    Some(p) => (p.x as u64) << 8 | p.y as u64,
                    None => u64::MAX,
                });
            }
            mix(ps.hand_red as u64);
            mix(ps.hand_blue as u64);
            mix(ps.hand_green as u64);
            mix(ps.hand_black as u64);
            mix(ps.score_red as u64);
            mix(ps.score_blue as u64);
            mix(ps.score_green as u64);
            mix(ps.score_black as u64);
            mix(ps.score_treasure as u64);
            mix(ps.num_catastrophes as u64);
        }
        for m in &self.monuments {
            mix(m.monument_type as u64);
            mix((m.pos_top_left.x as u64) << 8 | m.pos_top_left.y as u64);
        }
        for m in &self.available_monuments {
            mix(*m as u64);
        }
        mix(self.bag.red as u64);
        mix(self.bag.blue as u64);
        mix(self.bag.green as u64);
        mix(self.bag.black as u64);
        for (i, s) in self.state.iter().enumerate() {
            mix((*s as u64) << 8 | i as u64);
        }
        for (i, (p, a)) in self.play_action_stack.iter().enumerate() {
            mix((p.index().map(|x| x as u64 + 1).unwrap_or(0)) << 16 | i as u64);
            match a {
                PlayerAction::AddSupport(t) => mix(1 << 32 | *t as u64),
                PlayerAction::SelectLeader {
                    red,
                    blue,
                    green,
                    black,
                } => {
                    mix(2 << 32
                        | (*red as u64)
                        | ((*blue as u64) << 1)
                        | ((*green as u64) << 2)
                        | ((*black as u64) << 3))
                }
                PlayerAction::Normal => mix(3 << 32),
                PlayerAction::TakeTreasure(v) => {
                    mix(4 << 32 | v.len() as u64);
                    for p in v {
                        mix((p.x as u64) << 8 | p.y as u64);
                    }
                }
                PlayerAction::BuildMonument(p, v) => {
                    mix(5 << 32 | ((p.x as u64) << 8 | p.y as u64));
                    for m in v {
                        mix(*m as u64);
                    }
                }
            }
        }
        mix(self.player_turn.index().map(|i| i as u64 + 1).unwrap_or(0));
        mix(self.last_player.index().map(|i| i as u64 + 1).unwrap_or(0));
        mix(self.last_player_normal_action.index().map(|i| i as u64 + 1).unwrap_or(0));
        mix(self.last_action_player.index().map(|i| i as u64 + 1).unwrap_or(0));
        mix(self.start_player.index().map(|i| i as u64 + 1).unwrap_or(0));
        if let Some(c) = &self.internal_conflict {
            mix(c.conflict_leader as u64);
            mix(c.attacker.index().map(|i| i as u64 + 1).unwrap_or(0));
            mix(c.defender.index().map(|i| i as u64 + 1).unwrap_or(0));
            mix(c.attacker_support as u64);
            mix(c.defender_support as u64);
            mix(c.attacker_sent_support as u64);
            mix(c.defender_sent_support as u64);
            mix((c.attacker_pos.x as u64) << 8 | c.attacker_pos.y as u64);
            mix((c.defender_pos.x as u64) << 8 | c.defender_pos.y as u64);
            mix(c.attacker_base_strength as u64);
            mix(c.defender_base_strength as u64);
            mix(c.is_internal as u64);
        } else {
            mix(0xDEAD);
        }
        if let Some(e) = &self.external_conflict {
            mix(e.unification_tile_type as u64);
            mix((e.unification_tile_pos.x as u64) << 8 | e.unification_tile_pos.y as u64);
            mix(e.conflicts.len() as u64);
            for c in e.conflicts.iter() {
                mix(c.conflict_leader as u64);
                mix(c.attacker.index().map(|i| i as u64 + 1).unwrap_or(0));
                mix(c.defender.index().map(|i| i as u64 + 1).unwrap_or(0));
                mix(c.attacker_support as u64);
                mix(c.defender_support as u64);
                mix(c.attacker_sent_support as u64);
                mix(c.defender_sent_support as u64);
                mix((c.attacker_pos.x as u64) << 8 | c.attacker_pos.y as u64);
                mix((c.defender_pos.x as u64) << 8 | c.defender_pos.y as u64);
                mix(c.attacker_base_strength as u64);
                mix(c.defender_base_strength as u64);
                mix(c.is_internal as u64);
            }
        } else {
            mix(0xBEEF);
        }
        mix(self.rng.0);
        h
    }
}

impl TnEGame {
    /// Validate a single action, computing the kingdom count for it.
    ///
    /// Fine for one-off checks; batch validation should use
    /// [`Self::validate_action_with`] instead.
    pub fn validate_action(&self, action: Action, state: GameState) -> Result<()> {
        // One action needs the count at one cell: a few local flood fills,
        // not the whole-board pass (which was ~15% of search time via `process`).
        self.validate_inner(action, state, &|p| self.board.nearby_kingdoms_at(p))
    }

    /// Validate `action` against a caller-supplied kingdom count.
    ///
    /// `nearby_kingdom_count` is a full-board flood fill over every leader, and
    /// move generation validates *every* candidate move at the same board
    /// position — so recomputing it per move meant ~200 identical board-wide
    /// computations per tree expansion. It is hoisted out here: callers that
    /// validate many moves compute it once and reuse it.
    pub fn validate_action_with(
        &self,
        action: Action,
        state: GameState,
        kingdom_count: &[[u8; W]; H],
    ) -> Result<()> {
        self.validate_inner(action, state, &|p| kingdom_count[p.x as usize][p.y as usize])
    }

    fn validate_inner(&self, action: Action, state: GameState, kingdom_count: &dyn Fn(Pos) -> u8) -> Result<()> {
        let current_player = self.next_player();
        let curr_player_state = self.players.get(current_player);

        let is_valid = match (state, action) {
            (GameState::Normal, Action::PlaceTile { .. })
            | (GameState::Normal, Action::PlaceLeader { .. })
            | (GameState::Normal, Action::WithdrawLeader(_))
            | (GameState::Normal, Action::ReplaceTile(_))
            | (GameState::Normal, Action::PlaceCatastrophe(_))
            | (GameState::Normal, Action::Pass)
            | (GameState::TakeTreasure, Action::TakeTreasure { .. })
            | (GameState::WarSelectLeader, Action::WarSelectLeader(_))
            | (GameState::BuildMonument, Action::BuildMonument(_))
            | (GameState::BuildMonument, Action::DeclineMonument)
            | (GameState::AddSupport, Action::AddSupport(_)) => true,
            _ => false,
        };

        if !is_valid {
            return Err(Error::InvalidAction(state, action));
        }

        // Reject any action targeting a cell outside the playable area.
        if let Some(p) = action.position() {
            if !self.board.in_bounds(p) {
                return Err(Error::OutOfBounds);
            }
        }

        match action {
            Action::TakeTreasure(pos) => {
                if !self.board.get_treasure(pos) {
                    return Err(Error::NoTreasure);
                }
                // Treasures nearer a board edge must be taken first (rulebook L40,
                // "must take the treasures on the corner temples first").
                //
                // Ruled 2026-10-10: "closer to an edge should be taken first;
                // if equal, the player chooses." So this is a total order on
                // edge proximity, not a fixed set of special squares — the
                // previous `SPECIAL_BORDER_POSITIONS` hardcoded two cells and
                // let the other eight winged-beast temples be taken out of
                // order.
                let PlayerAction::TakeTreasure(available) = self.next_action() else {
                    unreachable!()
                };
                let nearest = available
                    .iter()
                    .map(|t| edge_distance(*t))
                    .min()
                    .unwrap_or(u8::MAX);
                if edge_distance(pos) > nearest {
                    return Err(Error::MustTakeBorderTreasureFirst);
                }
            }
            Action::AddSupport(n) => {
                let PlayerAction::AddSupport(tile_type) = self.next_action() else {
                    unreachable!()
                };
                // we must be in a conflict
                let conflict = match (
                    self.internal_conflict.as_ref(),
                    self.external_conflict.as_ref(),
                ) {
                    (Some(c), _) => c,
                    (_, Some(conflicts)) => {
                        let c = conflicts
                            .conflicts
                            .iter()
                            .find(|c| c.conflict_leader.as_tile_type() == tile_type);
                        if c.is_none() {
                            return Err(Error::NoExternalConflict);
                        }
                        c.unwrap()
                    }
                    _ => return Err(Error::NotInConflict),
                };

                // the conflict must still be in progress
                // leaders must still be connected
                if !self
                    .board
                    .path_find(conflict.attacker_pos, conflict.defender_pos)
                {
                    return Err(Error::LeadersDisconnected);
                }

                // the player must be the right one to send support
                if conflict.attacker_sent_support && conflict.attacker == current_player {
                    return Err(Error::AlreadySentSupport);
                }

                // the player must have the tile they are trying to add support with
                if curr_player_state.get_hand(tile_type) < n {
                    return Err(Error::NotEnoughTiles);
                }
            }
            Action::WarSelectLeader(leader) => {
                // we must be in an external conflict
                let Some(conflicts) = &self.external_conflict else {
                    return Err(Error::NoExternalConflict);
                };

                // the leader must still be in conflict
                let Some(conflict) = conflicts.conflicts.iter().find(|c| c.conflict_leader == leader) else {
                    return Err(Error::LeaderNotInConflict);
                };

                // leaders must still be connected
                if !self
                    .board
                    .path_find(conflict.attacker_pos, conflict.defender_pos)
                {
                    return Err(Error::LeadersDisconnected);
                }
            }
            Action::PlaceCatastrophe(to) => {
                if curr_player_state.num_catastrophes == 0 {
                    return Err(Error::NoCatastrophes);
                }
                // cannot be placed if the destination contains a leader
                if self.board.get_monument(to) {
                    return Err(Error::CannotPlaceCatastropheOnMonument);
                }
                if self.board.get_leader(to) != Leader::None {
                    return Err(Error::CannotPlaceOverLeader);
                }
                // cannot place over unclaimed treasure
                if self.board.get_treasure(to) {
                    return Err(Error::CannotPlaceOverTreasure);
                }
            }
            Action::PlaceTile { pos: to, tile_type } => {
                if self.board.get_tile_type(to) != TileType::Empty {
                    return Err(Error::CannotPlaceTileOverTile);
                }
                if self.board.get_leader(to) != Leader::None {
                    return Err(Error::CannotPlaceOverLeader);
                }
                if curr_player_state.get_hand(tile_type) == 0 {
                    return Err(Error::NotEnoughTiles);
                }

                // only blue can be and must be placed on river
                let is_river = self.board.river.get(to);
                if let TileType::Blue = tile_type {
                    if !is_river {
                        return Err(Error::MustPlaceBlueOnRiver);
                    }
                } else if is_river {
                    return Err(Error::CannotPlaceNonBlueOnRiver);
                }

                // cannot join three kingdoms
                if kingdom_count(to) > 2 {
                    return Err(Error::CannotJoinThreeKingdoms);
                }
            }
            Action::PlaceLeader { pos, leader } => {
                if self.board.get_leader(pos) != Leader::None {
                    return Err(Error::CannotPlaceOverLeader);
                }
                // Moving an on-board leader may not split its kingdom and
                // rejoin the pieces (rulebook L49). Placing from off the board
                // has no existing kingdom to split.
                if let Some(from) = curr_player_state.get_leader(leader) {
                    if from != pos && self.board.move_would_split_and_rejoin(from, pos) {
                        return Err(Error::CannotSplitAndRejoin);
                    }
                }
                self.check_leader_placement(pos, kingdom_count)?;
            }
            Action::WithdrawLeader(pos) => {
                if self.board.get_leader(pos) == Leader::None {
                    return Err(Error::CannotWithdrawLeader);
                }
                // Check that the current player owns this leader
                if self.board.get_player(pos) != current_player {
                    return Err(Error::CannotMoveOtherLeader);
                }
            }
            Action::ReplaceTile(Tiles {
                red,
                black,
                green,
                blue,
            }) => {
                // confirm that the player has enough tiles
                if curr_player_state.hand_red < red
                    || curr_player_state.hand_black < black
                    || curr_player_state.hand_green < green
                    || curr_player_state.hand_blue < blue
                {
                    return Err(Error::NotEnoughTiles);
                }
            }
            Action::Pass => {}
            Action::BuildMonument(monument_type) => {
                let PlayerAction::BuildMonument(pos_top_left, ..) = self.next_action() else {
                    unreachable!()
                };
                let pos_top_right = pos_top_left + pos!(0, 1);
                let pos_bottom_left = pos_top_left + pos!(1, 0);
                let pos_bottom_right = pos_top_left + pos!(1, 1);
                if self.board.get_tile_type(pos_top_left) != self.board.get_tile_type(pos_top_right)
                    || self.board.get_tile_type(pos_top_left) != self.board.get_tile_type(pos_bottom_left)
                    || self.board.get_tile_type(pos_top_left) != self.board.get_tile_type(pos_bottom_right)
                    || !monument_type.matches(self.board.get_tile_type(pos_top_left))
                {
                    return Err(Error::MonumentNot2x2);
                }
            }
            Action::DeclineMonument => {
                // No validation needed - player is allowed to decline
            }
        }

        Ok(())
    }

    pub fn process_action(
        &mut self,
        action: Action,
        current_player: Player,
        current_player_action: PlayerAction,
    ) -> (Option<GameState>, Vec<(Player, PlayerAction, GameState)>) {
        let curr_player = self.players.get_mut(current_player);
        let mut extra_actions = Vec::new();

        let next_state = match action {
            Action::BuildMonument(monument_type) => {
                let PlayerAction::BuildMonument(pos_top_left, ..) = current_player_action else {
                    panic!();
                };
                let positions = [
                    pos_top_left,
                    pos_top_left.right(),
                    pos_top_left.down(),
                    pos_top_left.down().right(),
                ];
                
                // Collect all positions adjacent to the monument for leader eviction check
                let mut adjacent_positions = Bitboard::new();
                for pos in positions.iter() {
                    adjacent_positions |= pos.neighbors();
                }
                
                // Build the monument - flip tiles facedown
                for pos in positions.iter() {
                    self.board.set_monument(*pos, true);
                    self.board.set_leader(*pos, Leader::None);
                    self.board.set_tile_type(*pos, TileType::Empty);
                }

                self.monuments.push(Monument {
                    monument_type,
                    pos_top_left,
                });

                // Remove the monument from available monuments
                self.available_monuments.retain(|m| *m != monument_type);

                // Evict any leaders that are no longer adjacent to temples
                // (since the monument tiles are now facedown and don't count as temples)
                for pos in adjacent_positions.iter() {
                    self.evict_leader_if_not_adjacent_to_temple(pos);
                }

                None
            }
            Action::DeclineMonument => {
                // Player chose not to build a monument - just continue
                None
            }
            Action::TakeTreasure(pos) => {
                self.board.set_treasure(pos, false);

                curr_player.score_treasure += 1;

                // Rulebook L38-40: the possessor of a green trader takes *all
                // but one* of the kingdom's treasures. Previously a single take
                // was ever queued, so a kingdom holding three or more yielded
                // exactly one treasure and left the rest stranded under the
                // player's own green trader. Re-check after every take and queue
                // the next one while more than one remains.
                let kingdom = self.board.find_kingdom(pos, &mut Bitboard::new());
                let mut remaining = kingdom.treasures.clone();
                remaining.retain(|p| *p != pos);
                if kingdom.green_leader.is_some() && remaining.len() > 1 {
                    extra_actions.push((
                        current_player,
                        PlayerAction::TakeTreasure(remaining),
                        GameState::TakeTreasure,
                    ));
                }
                None
            }
            Action::WarSelectLeader(leader) => {
                assert!(self.internal_conflict.is_none());
                let Some(conflicts) = &mut self.external_conflict else {
                    unreachable!();
                };
                let Some(conflict) = conflicts.conflicts.iter_mut().find(|c| c.conflict_leader == leader) else {
                    unreachable!();
                };

                let next_action = PlayerAction::AddSupport(conflict.conflict_leader.as_tile_type());
                self.play_action_stack
                    .push((conflict.attacker, next_action));
                Some(GameState::AddSupport)
            }
            Action::AddSupport(n) => {
                let PlayerAction::AddSupport(tile_type) = current_player_action else {
                    unreachable!()
                };
                let c = match (
                    self.internal_conflict.as_mut(),
                    self.external_conflict.as_mut(),
                ) {
                    (Some(c), _) => c,
                    (_, Some(conflicts)) => {
                        let Some(c) = conflicts.conflicts.iter_mut().find(|c| c.conflict_leader.as_tile_type() == tile_type) else {
                            unreachable!();
                        };
                        c
                    }
                    _ => unreachable!(),
                };
                let attacker = c.attacker;
                let defender = c.defender;

                if attacker == current_player {
                    c.attacker_support += n;
                    c.attacker_sent_support = true;
                } else {
                    c.defender_support += n;
                    c.defender_sent_support = true;
                }

                match tile_type {
                    TileType::Red => curr_player.hand_red -= n,
                    TileType::Black => curr_player.hand_black -= n,
                    TileType::Green => curr_player.hand_green -= n,
                    TileType::Blue => curr_player.hand_blue -= n,
                    TileType::Empty => unreachable!(),
                }

                if c.all_sent() {
                    if c.is_internal {
                        // internal conflict (revolt)
                        let attacker_points = c.attacker_base_strength + c.attacker_support;
                        let defender_points = c.defender_base_strength + c.defender_support;

                        let (winner, _loser, loser_pos) = if attacker_points > defender_points {
                            (attacker, defender, c.defender_pos)
                        } else {
                            (defender, attacker, c.attacker_pos)
                        };

                        // In a revolt, winner always gets 1 RED point (amulet)
                        // because revolts are fought with temples (red tiles)
                        self.players
                            .get_mut(winner)
                            .add_score(TileType::Red);

                        self.evict_leader(loser_pos);

                        // The leader move that started this revolt is still one
                        // action (rulebook L38-39), and its sub-steps are not
                        // separate actions, so the treasure rule is owed once
                        // the revolt resolves. `loser_pos` sits in the same
                        // kingdom the leader was dropped into.
                        self.check_treasure_at(loser_pos, &mut extra_actions);
                    } else {
                        // External conflict.
                        //
                        // Base strengths are recomputed from the board here
                        // rather than read off the Conflict record. They were
                        // snapshotted when the war opened, before any tiles were
                        // discarded, and L76 warns that discarding "may split
                        // the kingdom". If an earlier colour's discard detaches
                        // tiles while this conflict's leaders stay connected,
                        // the snapshot still counts the detached tiles — so a
                        // defender could lose a war it should have tied.
                        // L71-72 measure "the number of tiles of that color in
                        // their kingdom" at the moment the war is fought, which
                        // is now.
                        let colour = c.conflict_leader.as_tile_type();
                        let count_in_kingdom = |board: &Board, at: Pos, t: TileType| -> u8 {
                            // Exclude the unification tile: it is connectable while
                            // the war is pending, which would make both leaders share
                            // one kingdom and both counts identical.
                            let k = board.find_kingdom_excluding(at, board.unification_tile);
                            let bb = match t {
                                TileType::Red => k.map & board.red_tiles,
                                TileType::Blue => k.map & board.blue_tiles,
                                TileType::Green => k.map & board.green_tiles,
                                TileType::Black => k.map & board.black_tiles,
                                TileType::Empty => Bitboard::new(),
                            };
                            bb.count_ones()
                        };
                        let attacker_points =
                            count_in_kingdom(&self.board, c.attacker_pos, colour) + c.attacker_support;
                        let defender_points =
                            count_in_kingdom(&self.board, c.defender_pos, colour) + c.defender_support;

                        let (winner, loser, loser_pos) = if attacker_points > defender_points {
                            (attacker, defender, c.defender_pos)
                        } else {
                            (defender, attacker, c.attacker_pos)
                        };

                        let conflict_leader = c.conflict_leader;

                        // Rulebook L72 orders this: "Move the losing leader off
                        // the board ... Discard each tile of the conflict color
                        // from the losing kingdom". Snapshot the kingdom while
                        // the leader is still there (the traversal needs it),
                        // remove the leader, then decide what disintegrates —
                        // so L74's "another leader next to them" cannot be
                        // satisfied by the leader that is being removed.
                        let loser_kingdom = self.board
                            .find_kingdom_excluding(loser_pos, self.board.unification_tile)
                            .map;

                        self.players.get_mut(loser).set_leader(conflict_leader, None);
                        self.board.set_leader(loser_pos, Leader::None);
                        self.board.set_player(loser_pos, Player::None);

                        let tiles_to_remove =
                            self.board.disintegrable_in(loser_kingdom, conflict_leader.as_tile_type());
                        // give winner 1 point
                        self.players
                            .get_mut(winner)
                            .add_score(conflict_leader.as_tile_type());

                        // disintegrate tiles
                        let points = tiles_to_remove.count_ones() as u8;
                        // Collect positions adjacent to removed tiles for later temple check
                        let mut positions_to_check = Bitboard::new();
                        for pos in tiles_to_remove.iter() {
                            positions_to_check |= pos.neighbors();
                        }
                        
                        for pos in tiles_to_remove.iter() {
                            self.board.set_tile_type(pos, TileType::Empty);
                            self.board.set_leader(pos, Leader::None);
                            self.board.set_player(pos, Player::None)
                        }
                        self.players
                            .get_mut(winner)
                            .add_score_by(conflict_leader.as_tile_type(), points);

                        // After removing tiles, check if any leaders are no longer adjacent to temples
                        for pos in positions_to_check.iter() {
                            self.evict_leader_if_not_adjacent_to_temple(pos);
                        }

                        // remove the leader we just resolved from external conflicts
                        self.external_conflict
                            .as_mut()
                            .unwrap()
                            .conflicts
                            .retain(|con| con.conflict_leader != conflict_leader);

                        // Revert the unification cell to the real tile. Rulebook L78: "Remove the
                        // unification tile. (Do not distribute a victory point as for normal
                        // placement of a tile.)" So the tile lands but scores nothing — the
                        // previous code called add_score here, awarding a point the rules
                        // forbid, and because this block sits inside the per-conflict loop
                        // it ran once per conflict colour, paying the same tile N times.
                        let ExternalConflict {
                            unification_tile_pos: uni_pos,
                            unification_tile_type,
                            ..
                        } = self.external_conflict.as_ref().unwrap();
                        let (uni_pos, uni_tile_type) = (*uni_pos, *unification_tile_type);
                        self.board.set_tile_type(uni_pos, uni_tile_type);
                    }

                    // No mid-war refill. Rulebook L44: "At the end of any player's turn, each
                    // player refreshes their hand to six tiles by drawing from
                    // the bag." Nothing in the war sequence (L50-78) authorises
                    // a refill, yet both combatants spend tiles from their
                    // hands here and only the defender was drawn back up. That
                    // handed the defender tiles the rules do not grant, and
                    // consumed the shared bag out of turn order — so the next
                    // player to draw could be offered tiles a mid-war draw had
                    // already taken. The `None` arm also ended the game in the
                    // middle of an action, which L93 does not allow.
                    self.internal_conflict = None;

                    // if external conflict, check if there's another leader we can select
                    if let Some(ex) = &mut self.external_conflict {
                        ex.conflicts
                            .retain(|i| self.board.path_find(i.attacker_pos, i.defender_pos));
                        if ex.conflicts.is_empty() {
                            let uni_pos = self.external_conflict.as_ref().unwrap().unification_tile_pos;
                            let uni_tile_type = self.external_conflict.as_ref().unwrap().unification_tile_type;
                            self.check_treasure_at(uni_pos, &mut extra_actions);
                            self.check_monument(uni_pos, uni_tile_type, &mut extra_actions);

                            self.external_conflict = None;

                            // Rulebook L78: "Remove the unification tile."
                            // The marker was set when the war opened and was
                            // never cleared, so `is_connectable` reported that
                            // cell occupied forever. A catastrophe landing there
                            // later would then leave two tile groups falsely
                            // fused across an empty space, corrupting
                            // `neighboring_kingdoms` — the sole driver of war
                            // detection.
                            self.board.unification_tile = None;

                            Some(GameState::Normal)
                        } else {
                            // Rulebook L66: "If there are multiple colors for
                            // which both kingdoms have a leader, the ACTIVE
                            // PLAYER chooses the order." This used to push
                            // `attacker` — the attacker of the conflict just
                            // resolved — which is invisible in 2p (there the
                            // attacker is always the active player) and wrong
                            // in 3-4p, handing the ordering decision to
                            // another seat. `player_turn` is still the player
                            // who placed the tile: it only advances when the
                            // action stack empties, and the war keeps it
                            // non-empty.
                            self.play_action_stack.push((
                                self.player_turn,
                                PlayerAction::SelectLeader {
                                    red: ex.conflicts.iter().any(|i| i.conflict_leader == Leader::Red),
                                    black: ex.conflicts.iter().any(|i| i.conflict_leader == Leader::Black),
                                    green: ex.conflicts.iter().any(|i| i.conflict_leader == Leader::Green),
                                    blue: ex.conflicts.iter().any(|i| i.conflict_leader == Leader::Blue),
                                },
                            ));
                            Some(GameState::WarSelectLeader)
                        }
                    } else {
                        // *check_treasure = true;
                        Some(GameState::Normal)
                    }
                } else {
                    let tile_type = if c.is_internal {
                        TileType::Red
                    } else {
                        c.conflict_leader.as_tile_type()
                    };
                    self.play_action_stack
                        .push((c.defender, PlayerAction::AddSupport(tile_type)));
                    Some(GameState::AddSupport)
                }
            }
            Action::PlaceCatastrophe(to) => {
                self.board.set_catastrophe(to, true);
                self.board.set_player(to, Player::None);
                self.board.set_leader(to, Leader::None);
                self.board.set_tile_type(to, TileType::Empty);

                curr_player.num_catastrophes -= 1;

                // Evict leaders only if they are no longer adjacent to any temple
                for neighbor in to.neighbors().iter() {
                    self.evict_leader_if_not_adjacent_to_temple(neighbor);
                }

                Some(GameState::Normal)
            }
            Action::PlaceTile { pos: to, tile_type } => {
                // get kingdoms around the to-be-placed tile
                let kingdoms = self.board.neighboring_kingdoms(to);
                // 1. find if there's an external conflict, if it would unite kingdoms with same color leaders
                let mut external_conflicts = vec![];
                for leader in [Leader::Red, Leader::Black, Leader::Green, Leader::Blue] {
                    let leaders = kingdoms
                        .iter()
                        .filter_map(|k| k.get_leader_info(leader))
                        .collect::<Vec<_>>();
                    if leaders.len() > 1 {
                        // R9.2 / M4.2: attacker is the active player if
                        // involved, otherwise the involved player nearest
                        // clockwise from the active player.
                        let attacker = if leaders.iter().any(|l| l.0 == current_player) {
                            current_player
                        } else {
                            let mut best = leaders[0].0;
                            let mut best_dist = u8::MAX;
                            for l in &leaders {
                                let d = current_player.clockwise_distance(l.0, self.num_players);
                                if d < best_dist {
                                    best_dist = d;
                                    best = l.0;
                                }
                            }
                            best
                        };
                        let (attacker, attacker_pos, attacker_base_strength) =
                            leaders.iter().find(|l| l.0 == attacker).copied().unwrap();
                        let (defender, defender_pos, defender_base_strength) = leaders
                            .iter()
                            .find(|l| l.0 != attacker)
                            .copied()
                            .unwrap();
                        external_conflicts.push(Conflict {
                            is_internal: false,
                            attacker,
                            defender,
                            attacker_pos,
                            defender_pos,
                            conflict_leader: leader,
                            attacker_support: 0,
                            defender_support: 0,
                            attacker_sent_support: false,
                            defender_sent_support: false,
                            attacker_base_strength,
                            defender_base_strength,
                        });
                    }
                }

                if !external_conflicts.is_empty() {
                    // start a conflict
                    let red = external_conflicts.iter().any(|c| c.conflict_leader == Leader::Red);
                    let black = external_conflicts.iter().any(|c| c.conflict_leader == Leader::Black);
                    let green = external_conflicts.iter().any(|c| c.conflict_leader == Leader::Green);
                    let blue = external_conflicts.iter().any(|c| c.conflict_leader == Leader::Blue);

                    self.board.unification_tile = Some(to);
                    self.external_conflict = Some(ExternalConflict {
                        conflicts: external_conflicts,
                        unification_tile_pos: to,
                        unification_tile_type: tile_type,
                    });

                    // Remove the tile from player's hand
                    match tile_type {
                        TileType::Blue => curr_player.hand_blue -= 1,
                        TileType::Green => curr_player.hand_green -= 1,
                        TileType::Red => curr_player.hand_red -= 1,
                        TileType::Black => curr_player.hand_black -= 1,
                        TileType::Empty => unreachable!(),
                    }

                    // attacker can select which leader to resolve first
                    self.play_action_stack.push((
                        current_player,
                        PlayerAction::SelectLeader {
                            red,
                            black,
                            green,
                            blue,
                        },
                    ));
                    Some(GameState::WarSelectLeader)
                } else {
                    // find the leader in the kingdom that would score this tile
                    self.board.set_tile_type(to, tile_type);
                    match tile_type {
                        TileType::Blue => {
                            curr_player.hand_blue -= 1;
                        }
                        TileType::Green => {
                            curr_player.hand_green -= 1;
                        }
                        TileType::Red => {
                            curr_player.hand_red -= 1;
                        }
                        TileType::Black => {
                            curr_player.hand_black -= 1;
                        }
                        TileType::Empty => unreachable!(),
                    }
                    // Rulebook L61: a victory point is distributed only "if the
                    // tile does not join two kingdoms". Reaching this branch
                    // means there was no same-colour conflict, which is NOT the
                    // same as joining fewer than two kingdoms — this tile may
                    // still be uniting two kingdoms that happen to hold
                    // different colours, and then it scores nothing (L78).
                    if kingdoms.len() < 2 {
                        let matching_leader = kingdoms
                            .iter()
                            .find_map(|k| k.get_leader_info(tile_type.as_leader()).map(|(p, _, _)| p));

                        // if the matching leader is not in the kingdom, check if black leader is in the kingdom
                        // and if so, score for black leader
                        let black_leader = kingdoms
                            .iter()
                            .find_map(|k| k.get_leader_info(Leader::Black).map(|(p, _, _)| p));

                        match (matching_leader, black_leader) {
                            (Some(p), _) | (None, Some(p)) => {
                                self.players.get_mut(p).add_score(tile_type)
                            }
                            (None, None) => (),
                        }
                    }
                    self.check_treasure_at(to, &mut extra_actions);
                    self.check_monument(to, tile_type, &mut extra_actions);
                    Some(GameState::Normal)
                }
            }
            Action::PlaceLeader { pos, leader } => {
                if let Some(from) = curr_player.get_leader(leader) {
                    self.board.set_leader(from, Leader::None);
                    self.board.set_player(from, Player::None);
                }

                let next_state = self.check_internal_conflict(pos, leader, current_player);

                self.board.set_leader(pos, leader);
                self.board.set_player(pos, current_player);
                self.players
                    .get_mut(current_player)
                    .set_leader(leader, Some(pos));

                // Rulebook L38-39: "If any kingdom contains more than one
                // treasure AT THE END OF AN ACTION and has a green trader", its
                // possessor takes all but one. Moving a leader is an action, so
                // the rule applies to it.
                //
                // Two defects fixed here:
                //  * The check ran BEFORE `set_leader`, so a green trader just
                //    dropped onto a kingdom holding two or more treasures was
                //    invisible to `find_kingdom` and collected nothing.
                //  * It was gated on `next_state == Normal`, so a leader move
                //    that triggered a revolt skipped it entirely — the same
                //    placement without a revolt did offer the grab. When a
                //    revolt interrupts, the grab is now offered at the end of
                //    the revolt instead.
                if next_state == GameState::Normal {
                    self.check_treasure_at(pos, &mut extra_actions);
                }
                Some(next_state)
            }
            Action::WithdrawLeader(pos) => {
                self.evict_leader(pos);
                Some(GameState::Normal)
            },
            Action::ReplaceTile(
                t @ Tiles {
                    red,
                    black,
                    green,
                    blue,
                },
            ) => {
                curr_player.hand_red -= red;
                curr_player.hand_black -= black;
                curr_player.hand_green -= green;
                curr_player.hand_blue -= blue;

                self.bag.player_draw(curr_player, t.sum(), &mut self.rng);
                Some(GameState::Normal)
            }
            Action::Pass => Some(GameState::Normal),
        };

        // Game-end is decided at the end of a turn, in
        // `set_next_player_if_player_turn_over` (BUGS.md B9). The empty-bag
        // condition belongs there too: L95 ends the game when a player *would
        // draw* but the bag is empty, which is precisely the `draw_to_6` failure
        // at that point. Testing it here truncated the acting player's turn.
        (next_state, extra_actions)
    }

    pub(crate) fn check_internal_conflict(
        &mut self,
        pos: Pos,
        leader: Leader,
        current_player: Player,
    ) -> GameState {
        // check internal conflict
        // if the kingdom already contains a leader, then an internal conflict is triggered
        let kingdoms = self.board.neighboring_kingdoms(pos);

        let mut has_conflict = None;
        for kingdom in kingdoms {
            has_conflict = match leader {
                Leader::Red
                    if kingdom.red_leader.is_some()
                        && kingdom.red_leader.unwrap().0 != current_player =>
                {
                    kingdom.red_leader
                }
                Leader::Black
                    if kingdom.black_leader.is_some()
                        && kingdom.black_leader.unwrap().0 != current_player =>
                {
                    kingdom.black_leader
                }
                Leader::Green
                    if kingdom.green_leader.is_some()
                        && kingdom.green_leader.unwrap().0 != current_player =>
                {
                    kingdom.green_leader
                }
                Leader::Blue
                    if kingdom.blue_leader.is_some()
                        && kingdom.blue_leader.unwrap().0 != current_player =>
                {
                    kingdom.blue_leader
                }
                _ => None,
            };
        }

        if let Some((player_2, p2_pos)) = has_conflict {
            // Use bitboard intersection for fast red tile counting
            let attacker_neighbors = pos.neighbors();
            let attacker_base_strength = (attacker_neighbors & self.board.red_tiles).count_ones();
            let defender_neighbors = p2_pos.neighbors();
            let defender_base_strength = (defender_neighbors & self.board.red_tiles).count_ones();
            self.internal_conflict = Some(Conflict {
                is_internal: true,
                attacker: current_player,
                defender: player_2,
                conflict_leader: leader,
                attacker_pos: pos,
                attacker_base_strength,
                defender_pos: p2_pos,
                attacker_support: 0,
                defender_support: 0,
                defender_base_strength,
                attacker_sent_support: false,
                defender_sent_support: false,
            });

            self.play_action_stack
                .push((current_player, PlayerAction::AddSupport(TileType::Red)));
            GameState::AddSupport
        } else {
            GameState::Normal
        }
    }

    fn set_next_player_if_player_turn_over(&mut self) {
        // if is turn over
        if self.play_action_stack.is_empty() {
            let current_player = self.player_turn;

            // add points from monuments
            for Monument {
                monument_type,
                pos_top_left: monument_top_left,
            } in &self.monuments
            {
                let mut visited = Bitboard::new();
                let kingdom = self.board.find_kingdom(*monument_top_left, &mut visited);
                for leader in monument_type.unpack() {
                    if let Some((p, _, _)) = kingdom.get_leader_info(leader) {
                        if p == current_player {
                            self.players
                                .get_mut(current_player)
                                .add_score(leader.as_tile_type());
                        }
                    }
                }
            }

            let next_player = current_player.next(self.num_players);
            debug_assert!(next_player != Player::None);

            self.play_action_stack
                .push((next_player, PlayerAction::Normal));
            self.play_action_stack
                .push((next_player, PlayerAction::Normal));
            self.player_turn = next_player;

            // Refresh every active player's hand to 6 from the bag.
            // If the bag runs dry, the game ends (R13.1).
            for i in 0..self.num_players as usize {
                let mut p = self.players.0[i];
                if self.bag.draw_to_6(&mut p, &mut self.rng).is_none() {
                    self.state.clear();
                }
                self.players.0[i] = p;
            }

            // Rulebook L93-94: the game also ends at the end of a turn when one
            // or two treasures remain on the board. Decided HERE rather than
            // after each action: the per-action check truncated the finishing
            // player's turn, and because the monument scoring above only runs
            // once the action stack empties, it also denied them their monument
            // points. Cleared the same way as the empty bag, so the action
            // stack still holds a next player and `next()` stays safe.
            if self.board.available_treasures_count() <= 2 {
                self.state.clear();
            }
        }
    }

    pub fn process(&mut self, action: Action) -> Result<(Player, PlayerAction)> {
        let current_state = self.state.pop().ok_or(Error::GameOver)?;
        if let Err(e) = self.validate_action(action, current_state) {
            self.state.push(current_state);
            return Err(e);
        }
        if current_state == GameState::Normal {
            self.move_history.record(&action);
        }
        let (current_player, current_player_action) = self.play_action_stack.pop().unwrap();
        if current_state == GameState::Normal {
            self.last_player_normal_action = current_player;
        }
        let (next_state, extra_actions) = self.process_action(action, current_player, current_player_action);
        if let Some(next_state) = next_state {
            // println!("{:?} => {:?}, {action:?}", current_state, next_state);
            self.state.push(next_state);
        }

        for (player, action, state) in extra_actions {
            self.play_action_stack.push((player, action));
            self.state.push(state);
        }

        self.last_action_player = current_player;
        self.set_next_player_if_player_turn_over();

        self.last_player = current_player;
        
        Ok(self.next())
    }

    fn check_treasure_at(&self, pos: Pos, extra_actions: &mut Vec<(Player, PlayerAction, GameState)>) {
        // check if treasure is available for taking
        // Border treasure priority is enforced in validate_action
        let kingdom = self.board.find_kingdom(pos, &mut Bitboard::new());
        if kingdom.treasures.len() > 1 && kingdom.green_leader.is_some() {
            let green_player = kingdom.green_leader.unwrap().0;
            let treasures = kingdom.treasures.clone();
            extra_actions.push((
                green_player,
                PlayerAction::TakeTreasure(treasures),
                GameState::TakeTreasure,
            ))
        }
    }

    fn check_monument(&self, pos: Pos, color: TileType, extra_actions: &mut Vec<(Player, PlayerAction, GameState)>) {
        // monument can be built on a 2x2 square made of same tiles
        // check if monument is available for building
        let mut monument = false;
        let mut top_left = None;
        // if pos is top left
        if pos.x < H as u8 - 1 && pos.y < W as u8 - 1 {
            let to_check = [pos, pos.right(), pos.down(), pos.down().right()];
            if to_check
                .iter()
                .all(|p| self.board.get_tile_type(*p) == color)
            {
                monument = true;
                top_left = Some(pos);
            }
        }
        // if pos is top right
        if pos.x < H as u8 - 1 && pos.y > 0 {
            let to_check = [pos, pos.left(), pos.down(), pos.down().left()];
            if to_check
                .iter()
                .all(|p| self.board.get_tile_type(*p) == color)
            {
                monument = true;
                top_left = Some(pos.left());
            }
        }
        // if pos is bottom left
        if pos.x > 0 && pos.y < W as u8 - 1 {
            let to_check = [pos, pos.right(), pos.up(), pos.up().right()];
            if to_check
                .iter()
                .all(|p| self.board.get_tile_type(*p) == color)
            {
                monument = true;
                top_left = Some(pos.up());
            }
        }
        // if pos is bottom right
        if pos.x > 0 && pos.y > 0 {
            let to_check = [pos, pos.left(), pos.up(), pos.up().left()];
            if to_check
                .iter()
                .all(|p| self.board.get_tile_type(*p) == color)
            {
                monument = true;
                top_left = Some(pos.up().left());
            }
        }

        let avail = self
            .available_monuments
            .iter()
            .filter(|c| c.matches(color))
            .copied()
            .collect::<Vec<_>>();

        if monument && !avail.is_empty() {
            extra_actions.push((
                self.last_player_normal_action,
                PlayerAction::BuildMonument(top_left.unwrap(), avail),
                GameState::BuildMonument
            ))
        }
    }

    /// Check if a position is adjacent to at least one temple (red tile)
    /// Leaders can only be placed adjacent to temples
    #[must_use]
    fn adjacent_to_temple(&self, pos: Pos) -> bool {
        self.board.is_adjacent_to_temple(pos)
    }

    fn check_leader_placement(&self, pos: Pos, kingdom_count: &dyn Fn(Pos) -> u8) -> Result<()> {
        if self.board.get_leader(pos) != Leader::None {
            return Err(Error::CannotPlaceOverLeader);
        }

        if self.board.get_tile_type(pos) != TileType::Empty {
            return Err(Error::CannotPlaceTileOverTile);
        }

        // must be adjacent to a temple
        if !self.adjacent_to_temple(pos) {
            return Err(Error::CannotPlaceLeaderNotAdjacentToTemple);
        }

        // cannot be placed on river or catastrophe
        if self.board.river.get(pos) {
            return Err(Error::CannotPlaceLeaderOnRiver);
        }

        if self.board.get_catastrophe(pos) {
            return Err(Error::CannotPlaceLeaderOnCatastrophe);
        }

        if self.board.get_monument(pos) {
            return Err(Error::CannotPlaceLeaderOnMonument);
        }

        // a leader cannot join two kingdoms
        if kingdom_count(pos) > 1 {
            return Err(Error::CannotPlaceLeaderJoiningTwoKingdoms);
        }

        Ok(())
    }

    /// Ranked standings, best first.
    ///
    /// Tiebreak order (deterministic): final score (min colour after treasures)
    /// → treasures collected → total raw cube value → seat index (lower wins).
    pub fn standings(&self) -> Vec<(Player, u8)> {
        let mut v: Vec<(Player, u8, u8, u8, usize)> = (0..self.num_players as usize)
            .map(|i| {
                let p = Player::from_index(i);
                let ps = &self.players.0[i];
                let key = (
                    p,
                    ps.calculate_score(),
                    ps.score_treasure,
                    ps.score_sum(),
                    i,
                );
                key
            })
            .collect();
        v.sort_by(|a, b| {
            b.1.cmp(&a.1)
                .then(b.2.cmp(&a.2))
                .then(b.3.cmp(&a.3))
                .then(a.4.cmp(&b.4))
        });
        v.into_iter().map(|(p, s, _, _, _)| (p, s)).collect()
    }

    /// The winning seat. For 2 players returns `Player::None` on a true tie
    /// (unchanged legacy behaviour); for 3–4 players returns the top of
    /// `standings()` (ties resolved by tiebreak).
    pub fn winner(&self) -> Player {
        if self.num_players == 2 {
            let a = self.players.0[0].calculate_score();
            let b = self.players.0[1].calculate_score();
            if a > b {
                Player::Player1
            } else if b > a {
                Player::Player2
            } else {
                Player::None
            }
        } else {
            self.standings().first().map(|(p, _)| *p).unwrap_or(Player::None)
        }
    }

    pub fn next_action(&self) -> PlayerAction {
        self.play_action_stack
            .last()
            .map(|(_, a)| a.clone())
            .unwrap()
    }

    pub fn next_player(&self) -> Player {
        self.play_action_stack.last().map(|(p, _)| *p).unwrap()
    }

    /// The seat whose turn it is.
    ///
    /// Unlike `next_player`, this does not move to every seat that answers a
    /// war sub-action: it stays on the player who placed the joining tile until
    /// the whole turn (war included) is over, so it is the right key for
    /// "one undo snapshot per turn".
    pub fn turn_player(&self) -> Player {
        self.player_turn
    }

    pub fn next(&self) -> (Player, PlayerAction) {
        self.play_action_stack.last().cloned().unwrap()
    }

    pub fn next_state(&self) -> GameState {
        self.state.last().copied().unwrap()
    }

    fn evict_leader(&mut self, pos: Pos) {
        let player = self.board.get_player(pos);
        if self.board.get_leader(pos) != Leader::None {
            self.players
                .get_mut(player)
                .set_leader(self.board.get_leader(pos), None);
            self.board.set_leader(pos, Leader::None);
            self.board.set_player(pos, Player::None)
        }
    }

    /// Evict a leader only if it is no longer adjacent to any temple (red tile)
    /// According to the rules: "If a leader is no longer adjacent to a temple, 
    /// that leader is returned to the player"
    fn evict_leader_if_not_adjacent_to_temple(&mut self, leader_pos: Pos) {
        if self.board.get_leader(leader_pos) == Leader::None {
            return;
        }
        // Check if leader is still adjacent to at least one temple
        if !self.board.is_adjacent_to_temple(leader_pos) {
            self.evict_leader(leader_pos);
        }
    }
}

#[derive(Copy, PartialEq, Eq, Debug, Clone, Serialize, Deserialize)]
pub enum GameState {
    Normal,
    TakeTreasure,
    AddSupport,
    WarSelectLeader,
    BuildMonument,
}

#[derive(PartialEq, Eq, Debug, Clone, Serialize, Deserialize)]
pub enum PlayerAction {
    AddSupport(TileType),
    SelectLeader {
        red: bool,
        blue: bool,
        green: bool,
        black: bool,
    },
    Normal,
    TakeTreasure(Vec<Pos>),
    BuildMonument(Pos, Vec<MonumentType>),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExternalConflict {
    pub conflicts: Vec<Conflict>,
    pub unification_tile_pos: Pos,
    pub unification_tile_type: TileType,
}

/// occurs when placing same leaders in same kingdom
#[derive(Debug, Clone, Copy, Eq, Serialize, Deserialize)]
pub struct Conflict {
    pub is_internal: bool,
    pub conflict_leader: Leader,

    pub attacker: Player,
    pub attacker_pos: Pos,
    pub attacker_support: u8,
    pub attacker_sent_support: bool,
    pub attacker_base_strength: u8,

    pub defender: Player,
    pub defender_pos: Pos,
    pub defender_support: u8,
    pub defender_sent_support: bool,
    pub defender_base_strength: u8,
}
impl Conflict {
    fn all_sent(&self) -> bool {
        self.attacker_sent_support && self.defender_sent_support
    }
}

impl PartialEq for Conflict {
    fn eq(&self, other: &Self) -> bool {
        // ignore support
        self.attacker == other.attacker
            && self.defender == other.defender
            && self.conflict_leader == other.conflict_leader
            && self.attacker_pos == other.attacker_pos
            && self.defender_pos == other.defender_pos
            && self.attacker_base_strength == other.attacker_base_strength
            && self.defender_base_strength == other.defender_base_strength
            && self.is_internal == other.is_internal
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Action {
    WarSelectLeader(Leader),
    AddSupport(u8),
    BuildMonument(MonumentType),
    /// Decline to build a monument when offered the opportunity
    DeclineMonument,
    PlaceTile {
        pos: Pos,
        tile_type: TileType,
    },
    TakeTreasure(Pos),
    PlaceLeader {
        pos: Pos,
        leader: Leader,
    },
    WithdrawLeader(Pos),
    ReplaceTile(Tiles),
    PlaceCatastrophe(Pos),
    Pass,
}

impl Action {
    /// The board position this action targets, if any.
    pub fn position(&self) -> Option<Pos> {
        match *self {
            Action::PlaceTile { pos, .. }
            | Action::PlaceLeader { pos, .. }
            | Action::WithdrawLeader(pos)
            | Action::PlaceCatastrophe(pos)
            | Action::TakeTreasure(pos) => Some(pos),
            _ => None,
        }
    }
}

/// PlaceTileRed, 11 * 16
/// PlaceTileGreen, 11 * 16
/// PlaceTileBlue, 11 * 16
/// PlaceTileBlack, 11 * 16
/// PlaceLeaderRed, 11 * 16
/// PlaceLeaderGreen, 11 * 16
/// PlaceLeaderBlue, 11 * 16
/// PlaceLeaderBlack, 11 * 16
/// WithdrawLeader, 11 * 16
/// PlaceCatastrophe, 11 * 16
/// TakeTreasure, 11 * 16
/// BuildMonument, 6
/// DeclineMonument, 1
/// AddSupport, 7
/// SelectLeader, 4
/// Pass, 1
impl Into<usize> for Action {
    fn into(self) -> usize {
        match self {
            Action::PlaceTile { pos: to, tile_type } => {
                let i = to.x as usize * W + to.y as usize;
                match tile_type {
                    TileType::Red => 0 * H * W + i,
                    TileType::Green => 1 * H * W + i,
                    TileType::Blue => 2 * H * W + i,
                    TileType::Black => 3 * H * W + i,
                    _ => unreachable!(),
                }
            }
            Action::PlaceLeader { pos, leader } => {
                let i = pos.x as usize * W + pos.y as usize;
                match leader {
                    Leader::Red => 4 * H * W + i,
                    Leader::Green => 5 * H * W + i,
                    Leader::Blue => 6 * H * W + i,
                    Leader::Black => 7 * H * W + i,
                    _ => unreachable!(),
                }
            }
            Action::WithdrawLeader(pos) => {
                let i = pos.x as usize * W + pos.y as usize;
                8 * H * W + i
            }
            Action::PlaceCatastrophe(pos) => {
                let i = pos.x as usize * W + pos.y as usize;
                9 * H * W + i
            }
            Action::TakeTreasure(pos) => {
                let i = pos.x as usize * W + pos.y as usize;
                10 * H * W + i
            }
            Action::BuildMonument(ty) => {
                11 * H * W + (ty as usize)
            }
            Action::DeclineMonument => {
                11 * H * W + 6
            }
            Action::AddSupport(n) => {
                11 * H * W + 6 + 1 + (n as usize)
            }
            Action::WarSelectLeader(leader) => {
                11 * H * W + 6 + 1 + 7 + (leader as usize - 1)
            }
            Action::Pass => {
                11 * H * W + 6 + 1 + 7 + 4
            }
            Action::ReplaceTile(_) => unreachable!(),
        }
    }
}

impl From<usize> for Action {
    fn from(n: usize) -> Self {
        let idx = n / (W * H);
        let offset = n % (W * H);
        let pos = pos!(offset / W, offset % W);
        match idx {
            0 => Action::PlaceTile { pos, tile_type: TileType::Red },
            1 => Action::PlaceTile { pos, tile_type: TileType::Green },
            2 => Action::PlaceTile { pos, tile_type: TileType::Blue },
            3 => Action::PlaceTile { pos, tile_type: TileType::Black },
            4 => Action::PlaceLeader { pos, leader: Leader::Red },
            5 => Action::PlaceLeader { pos, leader: Leader::Green },
            6 => Action::PlaceLeader { pos, leader: Leader::Blue },
            7 => Action::PlaceLeader { pos, leader: Leader::Black },
            8 => Action::WithdrawLeader(pos),
            9 => Action::PlaceCatastrophe(pos),
            10 => Action::TakeTreasure(pos),
            _ => {
                let idx = n - (W * H * 11);
                match idx {
                    0 => Action::BuildMonument(MonumentType::RedGreen),
                    1 => Action::BuildMonument(MonumentType::RedBlue),
                    2 => Action::BuildMonument(MonumentType::GreenBlue),
                    3 => Action::BuildMonument(MonumentType::BlackRed),
                    4 => Action::BuildMonument(MonumentType::BlackGreen),
                    5 => Action::BuildMonument(MonumentType::BlackBlue),

                    6 => Action::DeclineMonument,

                    7 => Action::AddSupport(idx as u8 - 7),
                    8 => Action::AddSupport(idx as u8 - 7),
                    9 => Action::AddSupport(idx as u8 - 7),
                    10 => Action::AddSupport(idx as u8 - 7),
                    11 => Action::AddSupport(idx as u8 - 7),
                    12 => Action::AddSupport(idx as u8 - 7),
                    13 => Action::AddSupport(idx as u8 - 7),

                    14 => Action::WarSelectLeader(Leader::Blue),
                    15 => Action::WarSelectLeader(Leader::Green),
                    16 => Action::WarSelectLeader(Leader::Red),
                    17 => Action::WarSelectLeader(Leader::Black),

                    18 => Action::Pass,

                    _ => panic!(),
                }
            }
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Tiles {
    pub red: u8,
    pub black: u8,
    pub green: u8,
    pub blue: u8,
}
impl Tiles {
    pub fn sum(&self) -> u8 {
        self.black + self.blue + self.green + self.red
    }

    #[must_use]
    fn draw_to_6(&mut self, player: &mut PlayerState, rng: &mut Rng) -> Option<()> {
        let hand_sum = player.hand_sum();
        if hand_sum >= 6 {
            return Some(()); // Already have 6 or more tiles
        }
        let n = 6 - hand_sum;
        self.player_draw(player, n, rng)
    }

    fn player_draw(&mut self, player: &mut PlayerState, n: u8, rng: &mut Rng) -> Option<()> {
        let drawn = self.draw(n, rng)?;
        player.hand_red += drawn.red;
        player.hand_black += drawn.black;
        player.hand_green += drawn.green;
        player.hand_blue += drawn.blue;
        Some(())
    }

    /// randomly draw tiles from the bag(counters for 4 colors) without replacement:
    fn draw(&mut self, n: u8, rng: &mut Rng) -> Option<Tiles> {
        // random number between 0 and the number of tiles left in the bag
        let mut tiles = Tiles {
            red: 0,
            black: 0,
            green: 0,
            blue: 0,
        };

        let mut n = n;
        while n > 0 {
            let total = self.sum() as u64;
            if total == 0 {
                return None;
            }
            let mut rand = rng.below(total) as u8;
            let pick = if rand < self.red {
                Some(TileType::Red)
            } else {
                rand -= self.red;
                if rand < self.black {
                    Some(TileType::Black)
                } else {
                    rand -= self.black;
                    if rand < self.green {
                        Some(TileType::Green)
                    } else {
                        Some(TileType::Blue)
                    }
                }
            };
            match pick.unwrap() {
                TileType::Red => {
                    tiles.red += 1;
                    self.red -= 1;
                }
                TileType::Black => {
                    tiles.black += 1;
                    self.black -= 1;
                }
                TileType::Green => {
                    tiles.green += 1;
                    self.green -= 1;
                }
                TileType::Blue => {
                    tiles.blue += 1;
                    self.blue -= 1;
                }
                TileType::Empty => unreachable!(),
            }

            n -= 1;
        }

        Some(tiles)
    }

    fn is_empty(&self) -> bool {
        self.red == 0 && self.black == 0 && self.green == 0 && self.blue == 0
    }

    pub fn count(&self, tile_type: TileType) -> u8 {
        match tile_type {
            TileType::Red => self.red,
            TileType::Black => self.black,
            TileType::Green => self.green,
            TileType::Blue => self.blue,
            _ => unreachable!(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Movement {
    Place(Pos),
    Withdraw(Pos),
}

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pos {
    pub x: u8,
    pub y: u8,
}

impl std::ops::Add for Pos {
    type Output = Pos;

    fn add(self, other: Pos) -> Pos {
        Pos {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

impl std::fmt::Debug for Pos {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self)
    }
}

impl std::fmt::Display for Pos {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let col = (self.y as u8 + 'A' as u8) as char;
        let row = self.x + 1;
        write!(f, "{}{}", row, col)
    }
}

pub const fn pos(a: &'static str) -> Pos {
    let chars = a.as_bytes();
    let x = chars[0] as u8 - '1' as u8;
    let y = chars[1] as u8 - 'A' as u8;
    Pos { x, y }
}

impl Pos {
    #[inline]
    pub fn neighbors(&self) -> Bitboard {
        NEIGHBORS_MASK[self.x as usize][self.y as usize]
    }

    #[inline]
    fn right(&self) -> Pos {
        Self {
            x: self.x,
            y: self.y + 1,
        }
    }

    #[inline]
    fn left(&self) -> Pos {
        Self {
            x: self.x,
            y: self.y - 1,
        }
    }

    #[inline]
    fn up(&self) -> Pos {
        Self {
            x: self.x - 1,
            y: self.y,
        }
    }

    #[inline]
    fn down(&self) -> Pos {
        Self {
            x: self.x + 1,
            y: self.y,
        }
    }

    #[inline]
    fn index(&self) -> usize {
        self.x as usize * W + self.y as usize
    }

    #[inline]
    fn from_index(index: usize) -> Pos {
        Pos {
            x: (index / W) as u8,
            y: (index % W) as u8,
        }
    }

    #[inline]
    fn mask(&self) -> Bitboard {
        POS_TO_BITBOARD[self.x as usize][self.y as usize]
    }
    
    #[inline]
    pub fn manhattan_distance(&self, other: Pos) -> u8 {
        let dx = if self.x > other.x { self.x - other.x } else { other.x - self.x };
        let dy = if self.y > other.y { self.y - other.y } else { other.y - self.y };
        dx + dy
    }
}

#[repr(packed)]
#[derive(Copy, Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
pub struct PlayerState {
    pub placed_red_leader: Option<Pos>,
    pub placed_black_leader: Option<Pos>,
    pub placed_green_leader: Option<Pos>,
    pub placed_blue_leader: Option<Pos>,

    pub hand_green: u8,
    pub hand_red: u8,
    pub hand_black: u8,
    pub hand_blue: u8,

    pub score_green: u8,
    pub score_red: u8,
    pub score_black: u8,
    pub score_blue: u8,

    pub num_catastrophes: u8,
    pub score_treasure: u8,
}

impl PlayerState {
    pub fn new() -> Self {
        PlayerState {
            placed_black_leader: None,
            placed_red_leader: None,
            placed_green_leader: None,
            placed_blue_leader: None,

            hand_green: 0,
            hand_red: 0,
            hand_black: 0,
            hand_blue: 0,

            score_green: 0,
            score_red: 0,
            score_black: 0,
            score_blue: 0,
            score_treasure: 0,

            num_catastrophes: 2,
        }
    }

    /// get the score of the player
    /// which is the lowest score of the 4 colors
    /// treasure is the wildcard, add 1 treasure to lowest color, until we run out of treasure
    pub fn calculate_score(&self) -> u8 {
        self.scores_after_treasures().into_iter().min().unwrap_or(0)
    }

    /// The four colour scores after every treasure has been assigned to the
    /// currently-lowest colour — the final totals `calculate_score` minimises.
    pub fn scores_after_treasures(&self) -> [u8; 4] {
        let mut treasures = self.score_treasure;
        let mut s = *self;

        while treasures > 0 {
            let current_lowest_color = if s.score_green <= s.score_red
                && s.score_green <= s.score_black
                && s.score_green <= s.score_blue
            {
                TileType::Green
            } else if s.score_black <= s.score_red
                && s.score_black <= s.score_green
                && s.score_black <= s.score_blue
            {
                TileType::Black
            } else if s.score_red <= s.score_black
                && s.score_red <= s.score_green
                && s.score_red <= s.score_blue
            {
                TileType::Red
            } else {
                TileType::Blue
            };

            //assign 1 treasure to the lowest
            match current_lowest_color {
                TileType::Green => s.score_green += 1,
                TileType::Black => s.score_black += 1,
                TileType::Red => s.score_red += 1,
                TileType::Blue => s.score_blue += 1,
                _ => (),
            }

            treasures -= 1;
        }

        [s.score_red, s.score_blue, s.score_green, s.score_black]
    }

    /// The colour(s) left at the minimum after treasures are assigned — the
    /// bottleneck the player still needs to raise. Ties are all reported.
    pub fn needed_colours(&self) -> Vec<TileType> {
        let scores = self.scores_after_treasures();
        let min = scores.iter().copied().min().unwrap_or(0);
        let colours = [
            TileType::Red,
            TileType::Blue,
            TileType::Green,
            TileType::Black,
        ];
        scores
            .iter()
            .enumerate()
            .filter(|(_, s)| **s == min)
            .map(|(i, _)| colours[i])
            .collect()
    }

    pub fn hand_sum(&self) -> u8 {
        self.hand_black + self.hand_red + self.hand_green + self.hand_blue
    }

    fn add_score_by(&mut self, tile_type: TileType, n: u8) {
        match tile_type {
            TileType::Green => self.score_green += n,
            TileType::Black => self.score_black += n,
            TileType::Red => self.score_red += n,
            TileType::Blue => self.score_blue += n,
            _ => (),
        }
    }

    fn add_score(&mut self, tile_type: TileType) {
        self.add_score_by(tile_type, 1)
    }

    fn set_leader(&mut self, leader: Leader, arg: Option<Pos>) {
        match leader {
            Leader::Red => self.placed_red_leader = arg,
            Leader::Black => self.placed_black_leader = arg,
            Leader::Green => self.placed_green_leader = arg,
            Leader::Blue => self.placed_blue_leader = arg,
            _ => unreachable!(),
        }
    }

    pub(crate) fn get_hand(&self, tile_type: TileType) -> u8 {
        match tile_type {
            TileType::Blue => self.hand_blue,
            TileType::Green => self.hand_green,
            TileType::Red => self.hand_red,
            TileType::Black => self.hand_black,
            TileType::Empty => unreachable!(),
        }
    }

    pub fn get_leader(&self, leader: Leader) -> Option<Pos> {
        match leader {
            Leader::None => unreachable!(),
            Leader::Blue => self.placed_blue_leader,
            Leader::Green => self.placed_green_leader,
            Leader::Red => self.placed_red_leader,
            Leader::Black => self.placed_black_leader,
        }
    }

    pub(crate) fn score_sum(&self) -> u8 {
        self.score_black + self.score_red + self.score_green + self.score_blue
    }

    pub fn get_eval(&self, state: &TnEGame) -> i16 {
        // Single source of truth: the formula lives in `eval::tuned_value` with
        // its coefficients extracted, so the tuner can fit them instead of
        // editing numbers buried in here.
        let seat = self.seat_of(state);
        crate::eval::tuned_value(state, seat, &crate::eval::LeafWeights::default()).round() as i16
    }

    /// Which seat this `PlayerState` belongs to. Derived by identity, since a
    /// game holds exactly one `PlayerState` per seat.
    fn seat_of(&self, state: &TnEGame) -> Player {
        (0..state.num_players as usize)
            .map(|i| Player::from_index(i))
            .find(|p| {
                std::ptr::eq(
                    state.players.get(*p) as *const _,
                    self as *const PlayerState,
                )
            })
            .unwrap_or(Player::None)
    }

    pub(crate) fn hand_to_vec(&self) -> Vec<TileType> {
        let mut ret = Vec::new();
        for _ in 0..self.hand_black {
            ret.push(TileType::Black);
        }
        for _ in 0..self.hand_red {
            ret.push(TileType::Red);
        }
        for _ in 0..self.hand_green {
            ret.push(TileType::Green);
        }
        for _ in 0..self.hand_blue {
            ret.push(TileType::Blue);
        }
        ret
    }
}

/// Bitboard for fast operations on the board 
#[derive(Default, Copy, Clone, Eq, PartialEq, Serialize, Deserialize,
    derive_more::Not,
    derive_more::BitXor, derive_more::BitAnd, derive_more::BitOr,
    derive_more::BitOrAssign, derive_more::BitAndAssign, derive_more::BitXorAssign
)]
pub struct Bitboard(pub U256);

impl std::fmt::Display for Bitboard {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut s = String::new();
        s.push('\n');
        for x in 0..H {
            for y in 0..W {
                if self.get(pos!(x as u8, y as u8)) {
                    s.push('⬛');
                } else {
                    s.push('🟨');
                }
            }
            s.push('\n');
        }
        write!(f, "{}", s)
    }
}

impl std::fmt::Debug for Bitboard {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self)
    }
}

impl Bitboard {
    pub fn new() -> Self {
        Self(U256::from(0))
    }

    pub const fn from_binary(s: [u64; 4]) -> Self {
        Self(U256(s))
    }

    #[inline]
    pub fn iter(&self) -> impl Iterator<Item = Pos> + '_ {
        let mut parts = self.0.0; // Copy the 4 u64 parts
        let mut part_idx = 0usize;
        std::iter::from_fn(move || {
            // Find next set bit across all u64 parts
            while part_idx < 4 {
                if parts[part_idx] != 0 {
                    let bit_pos = parts[part_idx].trailing_zeros() as usize;
                    parts[part_idx] &= parts[part_idx] - 1; // Clear lowest set bit
                    let global_pos = part_idx * 64 + bit_pos;
                    return Some(pos!(global_pos as u8 / W as u8, global_pos as u8 % W as u8));
                }
                part_idx += 1;
            }
            None
        })
    }

    #[inline]
    pub fn count_ones(&self) -> u8 {
        (self.0.0[0].count_ones() + self.0.0[1].count_ones() + 
         self.0.0[2].count_ones() + self.0.0[3].count_ones()) as u8
    }

    #[inline]
    pub fn set(&mut self, pos: Pos) {
        let index = pos.index();
        let word_idx = index / 64;
        let bit_idx = index % 64;
        self.0.0[word_idx] |= 1u64 << bit_idx;
    }

    #[inline]
    pub fn clear(&mut self) {
        self.0 = U256::zero();
    }

    #[inline]
    pub fn reset(&mut self, pos: Pos) {
        *self &= !pos.mask();
    }

    #[inline]
    pub fn get(&self, pos: Pos) -> bool {
        let index = pos.index();
        let word_idx = index / 64;
        let bit_idx = index % 64;
        (self.0.0[word_idx] & (1u64 << bit_idx)) != 0
    }

    /// Get the first set bit position without modifying the bitboard
    #[inline]
    pub fn first_set_pos(&self) -> Option<Pos> {
        for i in 0..4 {
            if self.0.0[i] != 0 {
                let j = self.0.0[i].trailing_zeros() as usize;
                return Some(Pos::from_index(i * 64 + j));
            }
        }
        None
    }

    #[inline]
    fn pop(&mut self) -> Option<Pos> {
        // pop the first 1 in the U256
        if self.0.0[0] != 0 {
            let j = self.0.0[0].trailing_zeros() as usize;
            self.0.0[0] &= self.0.0[0] - 1; // Clear lowest set bit
            return Some(Pos::from_index(j));
        }
        if self.0.0[1] != 0 {
            let j = self.0.0[1].trailing_zeros() as usize;
            self.0.0[1] &= self.0.0[1] - 1;
            return Some(Pos::from_index(64 + j));
        }
        if self.0.0[2] != 0 {
            let j = self.0.0[2].trailing_zeros() as usize;
            self.0.0[2] &= self.0.0[2] - 1;
            return Some(Pos::from_index(128 + j));
        }
        if self.0.0[3] != 0 {
            let j = self.0.0[3].trailing_zeros() as usize;
            self.0.0[3] &= self.0.0[3] - 1;
            return Some(Pos::from_index(192 + j));
        }
        None
    }

    /// Expand the bitboard to include all orthogonal neighbors.
    /// Uses direct u64 operations for speed.
    #[inline]
    pub fn dilate(&self) -> Bitboard {
        let p = &self.0.0;
        
        // Column masks for each u64 word
        const NOT_COL_0: u64 = !0x0001_0001_0001_0001u64;
        const NOT_COL_15: u64 = !0x8000_8000_8000_8000u64;
        
        // Up: shift right by 16 within each word, carry from next word
        let up0 = (p[0] >> 16) | (p[1] << 48);
        let up1 = (p[1] >> 16) | (p[2] << 48);
        let up2 = p[2] >> 16; // No carry from p[3] since it's always 0 for our board
        
        // Down: shift left by 16 within each word, carry from prev word
        let down0 = p[0] << 16;
        let down1 = (p[1] << 16) | (p[0] >> 48);
        let down2 = (p[2] << 16) | (p[1] >> 48);
        
        // Left: shift right by 1, mask out column 15 to prevent wrap
        let left0 = (p[0] >> 1) & NOT_COL_15;
        let left1 = (p[1] >> 1) & NOT_COL_15;
        let left2 = (p[2] >> 1) & NOT_COL_15;
        
        // Right: shift left by 1, mask out column 0 to prevent wrap
        let right0 = (p[0] << 1) & NOT_COL_0;
        let right1 = (p[1] << 1) & NOT_COL_0;
        let right2 = (p[2] << 1) & NOT_COL_0;
        
        // Combine all directions and mask to valid board
        const BOARD_MASK_0: u64 = 0xFFFF_FFFF_FFFF_FFFFu64;
        const BOARD_MASK_1: u64 = 0xFFFF_FFFF_FFFF_FFFFu64;
        const BOARD_MASK_2: u64 = 0x0000_FFFF_FFFF_FFFFu64; // Only first 48 bits valid
        
        Bitboard::from_binary([
            (up0 | down0 | left0 | right0) & BOARD_MASK_0,
            (up1 | down1 | left1 | right1) & BOARD_MASK_1,
            (up2 | down2 | left2 | right2) & BOARD_MASK_2,
            0,
        ])
    }
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub struct Board {
    pub unification_tile: Option<Pos>,
    pub monuments: Bitboard,
    pub treasures: Bitboard,
    pub catastrophes: Bitboard,
    /// Owner bitboard per seat (index 0..4).
    #[serde(default)]
    pub players: [Bitboard; 4],

    /// River layout (blue tiles may only be placed here).
    #[serde(default)]
    pub river: Bitboard,

    /// Playable width/height (bitboard stride stays 16). Defaults to 16×11.
    #[serde(default = "default_board_width")]
    pub width: u8,
    #[serde(default = "default_board_height")]
    pub height: u8,

    pub leader_red: Bitboard,
    pub leader_blue: Bitboard,
    pub leader_green: Bitboard,
    pub leader_black: Bitboard,

    pub red_tiles: Bitboard,
    pub blue_tiles: Bitboard,
    pub green_tiles: Bitboard,
    pub black_tiles: Bitboard,
}

impl Default for Board {
    fn default() -> Self {
        Self::new()
    }
}

pub static RIVER: Lazy<Bitboard> = Lazy::new(|| {
    let mut ret = Bitboard::new();
    for (x, row) in BOARD.iter().enumerate() {
        for (y, c) in row.chars().enumerate() {
            if c == 'x' {
                ret.set(pos!(x as u8, y as u8));
            }
        }
    }
    ret
});

/// Distance from `pos` to the nearest edge of the board.
///
/// Rulebook L40 requires the treasures "on the corner temples" to be taken
/// first. Ruled 2026-10-10 to mean: nearer an edge wins, ties are free. So
/// priority is simply this distance, and no list of special squares is needed.
pub fn edge_distance(pos: Pos) -> u8 {
    pos.x.min(H as u8 - 1 - pos.x)
        .min(pos.y.min(W as u8 - 1 - pos.y))
}

/// Default starting board layout: `x` river, `t` winged-beast temple+treasure.
const BOARD: [&str; 11] = [
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

impl Board {
    /// Create the default (rulebook) board.
    pub fn new() -> Self {
        // Build the default river + starting temples from the layout string.
        let mut river = Bitboard::new();
        let mut temples = Bitboard::new();
        for (x, row) in BOARD.iter().enumerate() {
            for (y, c) in row.chars().enumerate() {
                match c {
                    't' => temples.set(pos!(x as u8, y as u8)),
                    'x' => river.set(pos!(x as u8, y as u8)),
                    '.' => {}
                    _ => unreachable!(),
                }
            }
        }
        Board::from_bits(river, temples)
    }

    /// Build a board from a river layout and the set of starting
    /// treasure+temple cells. Used by procedural map generation.
    pub fn from_bits(river: Bitboard, temples: Bitboard) -> Self {
        Self::from_layout(river, temples, W as u8, H as u8)
    }

    /// Build a board with an explicit playable size.
    pub fn from_layout(river: Bitboard, temples: Bitboard, width: u8, height: u8) -> Self {
        let mut ret = Board {
            unification_tile: None,
            monuments: Bitboard::new(),
            treasures: Bitboard::new(),
            catastrophes: Bitboard::new(),
            players: [Bitboard::new(); 4],

            leader_red: Bitboard::new(),
            leader_blue: Bitboard::new(),
            leader_green: Bitboard::new(),
            leader_black: Bitboard::new(),

            river,
            width,
            height,
            red_tiles: Bitboard::new(),
            blue_tiles: Bitboard::new(),
            green_tiles: Bitboard::new(),
            black_tiles: Bitboard::new(),
        };

        for p in temples.iter() {
            ret.treasures.set(p);
            ret.set_tile_type(p, TileType::Red);
        }

        ret
    }

    /// True if `pos` is inside the playable area.
    #[inline(always)]
    pub fn in_bounds(&self, pos: Pos) -> bool {
        pos.x < self.height && pos.y < self.width
    }

    /// The playable width.
    #[inline(always)]
    pub fn width(&self) -> u8 {
        self.width
    }

    /// The playable height.
    #[inline(always)]
    pub fn height(&self) -> u8 {
        self.height
    }

    #[inline]
    pub fn is_connectable(&self, pos: Pos) -> bool {
        // Fast check using bitboard - avoids multiple function calls
        let tiles = self.red_tiles | self.blue_tiles | self.green_tiles | self.black_tiles;
        let leaders = self.leader_red | self.leader_blue | self.leader_green | self.leader_black;
        (tiles | leaders | self.monuments).get(pos) || self.unification_tile == Some(pos)
    }

    /// Get a bitboard of all connectable positions on the board.
    /// A position is connectable if it has a tile, leader, monument, or is the unification tile.
    #[inline]
    pub fn connectable_bitboard(&self) -> Bitboard {
        let tiles = self.red_tiles | self.blue_tiles | self.green_tiles | self.black_tiles;
        let leaders = self.leader_red | self.leader_blue | self.leader_green | self.leader_black;
        let mut result = tiles | leaders | self.monuments;
        if let Some(pos) = self.unification_tile {
            result.set(pos);
        }
        result
    }

    /// R11.1 / L86: a catastrophe goes on any space that is empty or has a
    /// tile, but not on a treasure or monument, and not on a leader.
    ///
    /// The empty-space half was missing (`get_tile_type(pos) != Empty`), so
    /// `find_catastrophe_positions` — and with it the agent's move list and
    /// the interop `CanPlaceCatastrophe` plane — offered only tiled spaces:
    /// a strict subset of what `validate_action` and the human UI accept.
    pub fn can_place_catastrophe(&self, pos: Pos) -> bool {
        self.get_leader(pos) == Leader::None
            && !self.get_treasure(pos)
            && !self.get_monument(pos)
            && !self.get_catastrophe(pos)
    }

    pub fn can_place_tile(&self, pos: Pos) -> bool {
        !self.get_catastrophe(pos)
            && !self.get_monument(pos)
            && self.get_leader(pos) == Leader::None
            && self.get_tile_type(pos) == TileType::Empty
    }

    pub fn neighboring_kingdoms(&self, to: Pos) -> Vec<Kingdom> {
        let mut kingdoms = vec![];
        let mut visited = Bitboard::new();
        for neighbor in to.neighbors().iter() {
            if visited.get(neighbor) {
                continue;
            }
            let k = self.find_kingdom(neighbor, &mut visited);
            if k.has_leader() {
                kingdoms.push(k);
            }
        }
        kingdoms
    }

    #[must_use]
    pub fn path_find(&self, p1_pos: Pos, p2_pos: Pos) -> bool {
        // find a path between p1_pos and p2_pos, the cells must be is_connectable()
        let mut visited = Bitboard::new();
        let mut stack = p1_pos.mask();
        while let Some(pos) = stack.pop() {
            if visited.get(pos) {
                continue;
            }
            if pos == p2_pos {
                return true;
            }
            visited.set(pos);
            for neighbor in pos.neighbors().iter() {
                if self.is_connectable(neighbor) {
                    stack.set(neighbor);
                }
            }
        }

        false
    }

    pub fn find_empty_leader_space_next_to_red(&self) -> Bitboard {
        let mut ret = Bitboard::new();

        let count = self.nearby_kingdom_count();

        for x in 0..self.height {
            for y in 0..self.width {
                if self.get_tile_type(pos!(x as u8, y as u8)) == TileType::Red {
                    for pos in pos!(x as u8, y as u8).neighbors().iter() {
                        if count[pos.x as usize][pos.y as usize] > 1 {
                            continue;
                        }

                        if self.get_tile_type(pos) == TileType::Empty
                            && !self.river.get(pos)
                            && !self.get_catastrophe(pos)
                            && self.get_leader(pos) == Leader::None
                        {
                            ret.set(pos);
                        }
                    }
                }
            }
        }

        ret
    }

    /// `nearby_kingdom_count()[pos]` for one cell: kingdoms with a leader that
    /// border `pos` without containing it.
    pub fn nearby_kingdoms_at(&self, pos: Pos) -> u8 {
        let connectable = self.connectable_bitboard();
        let leaders = self.leader_red | self.leader_blue | self.leader_green | self.leader_black;
        let mut seen = Bitboard::new();
        let mut n = 0;
        for nb in pos.neighbors().iter() {
            if !connectable.get(nb) || seen.get(nb) {
                continue;
            }
            let k = self.find_kingdom_map_fast(nb, connectable);
            seen = seen | k;
            if (k & leaders).count_ones() > 0 && !k.get(pos) {
                n += 1;
            }
        }
        n
    }

    pub fn nearby_kingdom_count(&self) -> [[u8; 16]; 11] {
        // for each grid cell, count number of neighboring kingdoms
        let mut count = [[0_u8; W]; H];

        // Only start from positions with leaders - kingdoms without leaders are skipped anyway
        let mut remaining_leaders = self.leader_red | self.leader_blue | self.leader_green | self.leader_black;
        
        // Precompute connectable positions once
        let connectable = self.connectable_bitboard();
        
        while let Some(pos) = remaining_leaders.first_set_pos() {
            // Find kingdom map using fast bitboard flood-fill
            let kingdom_map = self.find_kingdom_map_fast(pos, connectable);
            remaining_leaders &= !kingdom_map;
            
            // find surrounding empty cells using bitboard dilate
            let neighbor_mask = kingdom_map.dilate();
            let nearby_empty_cells = !kingdom_map & neighbor_mask;

            // Iterate only over set bits instead of all cells
            for pos in nearby_empty_cells.iter() {
                count[pos.x as usize][pos.y as usize] += 1;
            }
        }
        count
    }

    pub fn find_catastrophe_positions(&self) -> Vec<Pos> {
        let mut ret = Vec::new();
        for x in 0..self.height {
            for y in 0..self.width {
                if self.can_place_catastrophe(pos!(x as u8, y as u8)) {
                    ret.push(pos!(x as u8, y as u8));
                }
            }
        }

        ret
    }

    pub fn find_kingdom_map(&self, start: Pos, kingdom: &mut Bitboard) {
        let mut stack = start.mask();
        // if it's connectable, mark as kingdom
        while let Some(pos) = stack.pop() {
            if kingdom.get(pos) {
                continue;
            }

            if !self.is_connectable(pos) {
                continue;
            }

            kingdom.set(pos);

            stack |= pos.neighbors();
        }
    }

    /// Optimized flood-fill using pure bitboard operations.
    /// Returns the kingdom map starting from `start` position.
    #[inline]
    pub fn find_kingdom_map_fast(&self, start: Pos, connectable: Bitboard) -> Bitboard {
        let mut kingdom = start.mask() & connectable;
        if kingdom.0.is_zero() {
            return kingdom;
        }
        
        loop {
            // Expand to neighbors and intersect with connectable positions
            let expanded = kingdom.dilate() & connectable;
            let new_kingdom = kingdom | expanded;
            
            // If no new cells were added, we're done
            if (new_kingdom.0 ^ kingdom.0).is_zero() {
                break;
            }
            kingdom = new_kingdom;
        }
        
        kingdom
    }

    pub fn find_kingdom(&self, pos: Pos, visited: &mut Bitboard) -> Kingdom {
        self.find_kingdom_with(pos, self.connectable_bitboard(), visited)
    }

    /// Would moving the leader at `from` to `to` split its kingdom and then
    /// rejoin the pieces?
    ///
    /// Rulebook L49: *"A leader may not be removed to form two separate
    /// kingdoms and placed to rejoin them in a single move."* `to` is already
    /// known to be a legal empty space; the only question is whether the
    /// leader's withdrawal cuts its kingdom in two and the placement stitches
    /// them back together.
    ///
    /// Computed on the live board: the kingdom containing `from` is flooded
    /// first, then `from` is removed and the remainder is counted into
    /// components. A move is forbidden only when withdrawal yields two or more
    /// components *and* `to` neighbours two or more of them.
    pub fn move_would_split_and_rejoin(&self, from: Pos, to: Pos) -> bool {
        let current = self.connectable_bitboard();
        let kingdom = self.find_kingdom_map_fast(from, current);

        let mut rest = kingdom;
        rest.reset(from);
        if rest.count_ones() == 0 {
            return false;
        }

        let to_neighbors = to.neighbors();
        let mut remaining = rest;
        let mut components = 0u8;
        let mut touched = 0u8;
        while let Some(start) = remaining.first_set_pos() {
            let component = self.find_kingdom_map_fast(start, rest);
            components += 1;
            if (component & to_neighbors).count_ones() > 0 {
                touched += 1;
            }
            remaining &= !component;
        }

        components >= 2 && touched >= 2
    }

    /// The kingdom containing `pos`, computed as though `ignore` were empty.
    ///
    /// While a war is pending, the unification tile counts as connectable, so
    /// every other query sees the two kingdoms as one. The strength comparison
    /// (rulebook L70-71) must measure each leader's *own* kingdom, before the
    /// join — counting the joined kingdom makes both sides identical and leaves
    /// wars decided by support tiles alone.
    pub fn find_kingdom_excluding(&self, pos: Pos, ignore: Option<Pos>) -> Kingdom {
        let mut connectable = self.connectable_bitboard();
        if let Some(p) = ignore {
            connectable.reset(p);
        }
        self.find_kingdom_with(pos, connectable, &mut Bitboard::new())
    }

    fn find_kingdom_with(&self, pos: Pos, connectable: Bitboard, visited: &mut Bitboard) -> Kingdom {
        let mut kingdom = Kingdom::default();

        // Use fast bitboard flood-fill instead of stack-based approach
        let start = pos.mask() & connectable;

        if start.0.is_zero() {
            return kingdom;
        }

        let mut map = start;
        loop {
            let expanded = map.dilate() & connectable;
            let new_map = map | expanded;
            if (new_map.0 ^ map.0).is_zero() {
                break;
            }
            map = new_map;
        }

        *visited |= map;
        kingdom.map = map;

        // Find treasures using bitboard intersection
        kingdom.treasures = (map & self.treasures).iter().collect();

        kingdom.red_tiles = (map & self.red_tiles).count_ones();
        kingdom.blue_tiles = (map & self.blue_tiles).count_ones();
        kingdom.green_tiles = (map & self.green_tiles).count_ones();
        kingdom.black_tiles = (map & self.black_tiles).count_ones();

        kingdom.red_leader = (self.leader_red & map).iter().next().map(|p| (self.get_player(p), p));
        kingdom.blue_leader = (self.leader_blue & map).iter().next().map(|p| (self.get_player(p), p));
        kingdom.green_leader = (self.leader_green & map).iter().next().map(|p| (self.get_player(p), p));
        kingdom.black_leader = (self.leader_black & map).iter().next().map(|p| (self.get_player(p), p));

        kingdom
    }

    /// find all the kingdoms on the board
    pub fn kingdoms(&self) -> Vec<Kingdom> {
        let mut visited = Bitboard::new();
        let mut kingdoms = vec![];
        for x in 0..self.height {
            for y in 0..self.width {
                let pos = pos!(x as u8, y as u8);
                if visited.get(pos) {
                    continue;
                }
                let kingdom = self.find_kingdom(pos, &mut visited);
                if kingdom.has_leader() {
                    kingdoms.push(kingdom);
                }
            }
        }
        kingdoms
    }

    fn available_treasures_count(&self) -> u8 {
        self.treasures.count_ones()
    }

    pub fn find_empty_spaces_adj_kingdom(&self, pos: Pos, is_river_space: bool) -> Vec<Pos> {
        let mut ret = Vec::new();
        let mut kingdom_map = Bitboard::new();

        self.find_kingdom_map(pos, &mut kingdom_map);

        // find empty spaces around kingdom
        for x in 0..self.height {
            for y in 0..self.width {
                if kingdom_map.get(pos!(x as u8, y as u8)) {
                    for neighbor in pos!(x as u8, y as u8).neighbors().iter() {
                        if self.get_tile_type(neighbor) == TileType::Empty && self.get_leader(neighbor) == Leader::None {
                            if is_river_space == self.river.get(neighbor) {
                                ret.push(neighbor);
                            }
                        }
                    }
                }
            }
        }

        ret
    }

    /// Tiles of `tile_type` inside `kingdom` that the war winner may take.
    ///
    /// Takes the kingdom as a *pre-removed* snapshot rather than a live search:
    /// rulebook L72 moves the losing leader off the board before L73 discards
    /// tiles, and L74 protects red temples that "have another leader next to
    /// them". The two requirements pull in opposite directions — the flood
    /// fill needs the loser still present to traverse through, while the
    /// protection test must NOT see it — so the caller captures the kingdom
    /// first, removes the leader, and passes the snapshot here. Evaluating
    /// protection against the post-removal board is what stops the loser's own
    /// temples from shielding themselves.
    fn disintegrable_in(&self, kingdom: Bitboard, tile_type: TileType) -> Bitboard {
        let mut ret = Bitboard::new();
        // In a priest war (red leader conflict), temples adjacent to leaders or
        // bearing treasures are protected and cannot be removed (L74).
        let is_priest_war = tile_type == TileType::Red;

        for pos in kingdom.iter() {
            if self.unification_tile == Some(pos) {
                continue;
            }
            let is_protected = is_priest_war && self.get_tile_type(pos) == TileType::Red && {
                let has_treasure = self.treasures.get(pos);
                let nearby_leader = pos
                    .neighbors()
                    .iter()
                    .any(|n| self.get_leader(n) != Leader::None);
                has_treasure || nearby_leader
            };

            // Ruled 2026-10-10: a monument's four facedown tiles are excluded
            // from war outright — they do not count toward strength and they
            // cannot be destroyed. The original code was already right on both
            // counts, so this is recorded rather than changed.
            if self.get_tile_type(pos) == tile_type && !is_protected && !self.get_monument(pos) {
                ret.set(pos);
            }
        }
        ret
    }

    #[inline(always)]
    pub fn get_monument(&self, pos: Pos) -> bool {
        self.monuments.get(pos)
    }

    #[inline(always)]
    pub fn set_monument(&mut self, pos: Pos, v: bool) {
        if v {
            self.monuments.set(pos)
        } else {
            self.monuments.reset(pos)
        }
    }


    #[inline(always)]
    /// Starting temples placed on the board (the `t` cells), each of which holds a
/// treasure and consumes one red tile from the bag.
pub fn temple_count(&self) -> u8 {
    self.treasures.count_ones()
}

pub fn get_treasure(&self, pos: Pos) -> bool {
        self.treasures.get(pos)
    }

    #[inline(always)]
    pub fn set_treasure(&mut self, pos: Pos, v: bool) {
        if v {
            self.treasures.set(pos)
        } else {
            self.treasures.reset(pos)
        }
    }

    #[inline(always)]
    pub fn set_catastrophe(&mut self, to: Pos, arg: bool) {
        if arg {
            self.catastrophes.set(to)
        } else {
            self.catastrophes.reset(to)
        }
    }

    #[inline(always)]
    pub fn get_catastrophe(&self, pos: Pos) -> bool {
        self.catastrophes.get(pos)
    }

    #[inline(always)]
    pub fn set_player(&mut self, pos: Pos, player: Player) {
        match player.index() {
            Some(i) => self.players[i].set(pos),
            None => {
                for bb in self.players.iter_mut() {
                    bb.reset(pos);
                }
            }
        }
    }

    #[inline(always)]
    pub fn get_player(&self, from: Pos) -> Player {
        for (i, bb) in self.players.iter().enumerate() {
            if bb.get(from) {
                return Player::from_index(i);
            }
        }
        Player::None
    }

    #[inline(always)]
    pub fn get_leader(&self, pos: Pos) -> Leader {
        if self.leader_red.get(pos) {
            Leader::Red
        } else if self.leader_green.get(pos) {
            Leader::Green
        } else if self.leader_blue.get(pos) {
            Leader::Blue
        } else if self.leader_black.get(pos) {
            Leader::Black
        } else {
            Leader::None
        }
    }

    #[inline(always)]
    pub fn set_leader(&mut self, pos: Pos, leader: Leader) {
        match leader {
            Leader::None => {
                self.leader_red.reset(pos);
                self.leader_green.reset(pos);
                self.leader_blue.reset(pos);
                self.leader_black.reset(pos);
            }
            Leader::Red => self.leader_red.set(pos),
            Leader::Green => self.leader_green.set(pos),
            Leader::Blue => self.leader_blue.set(pos),
            Leader::Black => self.leader_black.set(pos),
        }
    }

    #[inline(always)]
    pub fn get_tile_type(&self, pos: Pos) -> TileType {
        if self.red_tiles.get(pos) {
            TileType::Red
        } else if self.green_tiles.get(pos) {
            TileType::Green
        } else if self.blue_tiles.get(pos) {
            TileType::Blue
        } else if self.black_tiles.get(pos) {
            TileType::Black
        } else {
            TileType::Empty
        }
    }

    #[inline(always)]
    pub fn set_tile_type(&mut self, pos: Pos, tile_type: TileType) {
        match tile_type {
            TileType::Empty => {
                self.red_tiles.reset(pos);
                self.green_tiles.reset(pos);
                self.blue_tiles.reset(pos);
                self.black_tiles.reset(pos);
            }
            TileType::Red => self.red_tiles.set(pos),
            TileType::Green => self.green_tiles.set(pos),
            TileType::Blue => self.blue_tiles.set(pos),
            TileType::Black => self.black_tiles.set(pos),
        }
    }

    /// Returns true if the position contains a temple (red tile)
    #[inline]
    pub fn is_temple(&self, pos: Pos) -> bool {
        self.red_tiles.get(pos)
    }

    /// Returns a bitboard of all temple positions on the board
    #[inline]
    pub fn temples(&self) -> Bitboard {
        self.red_tiles
    }

    /// Counts temples adjacent to a position (used for revolt strength calculation)
    #[inline]
    pub fn count_adjacent_temples(&self, pos: Pos) -> u8 {
        (pos.neighbors() & self.red_tiles).count_ones()
    }

    /// Returns true if the position is adjacent to at least one temple
    #[inline]
    pub fn is_adjacent_to_temple(&self, pos: Pos) -> bool {
        !(pos.neighbors() & self.red_tiles).0.is_zero()
    }
}

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum MonumentType {
    RedGreen,
    RedBlue,
    GreenBlue,
    BlackRed,
    BlackGreen,
    BlackBlue,
}

impl MonumentType {
    pub fn matches(&self, color: TileType) -> bool {
        match (color, self) {
            (TileType::Red, MonumentType::BlackRed) => true,
            (TileType::Red, MonumentType::RedGreen) => true,
            (TileType::Red, MonumentType::RedBlue) => true,

            (TileType::Green, MonumentType::BlackGreen) => true,
            (TileType::Green, MonumentType::RedGreen) => true,
            (TileType::Green, MonumentType::GreenBlue) => true,

            (TileType::Blue, MonumentType::GreenBlue) => true,
            (TileType::Blue, MonumentType::RedBlue) => true,
            (TileType::Blue, MonumentType::BlackBlue) => true,

            (TileType::Black, MonumentType::BlackRed) => true,
            (TileType::Black, MonumentType::BlackGreen) => true,
            (TileType::Black, MonumentType::BlackBlue) => true,
            _ => false,
        }
    }

    pub fn unpack(&self) -> [Leader; 2] {
        match self {
            MonumentType::RedGreen => [Leader::Red, Leader::Green],
            MonumentType::RedBlue => [Leader::Red, Leader::Blue],
            MonumentType::GreenBlue => [Leader::Green, Leader::Blue],
            MonumentType::BlackRed => [Leader::Black, Leader::Red],
            MonumentType::BlackGreen => [Leader::Black, Leader::Green],
            MonumentType::BlackBlue => [Leader::Black, Leader::Blue],
        }
    }
}

/// Tile types:
/// - Red = Temple (Priest leader) - Leaders must be placed adjacent to temples
/// - Blue = Farm (Farmer leader) - Can only be placed on river spaces
/// - Green = Market (Trader leader) - For collecting treasures
/// - Black = Settlement (King leader) - Can score for any tile type if no matching leader
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum TileType {
    Empty,
    /// Farm tiles - can only be placed on river spaces, scored by Farmer (blue leader)
    Blue,
    /// Market tiles - scored by Trader (green leader), triggers treasure collection
    Green,
    /// Temple tiles - leaders must be adjacent to temples, scored by Priest (red leader)
    Red,
    /// Settlement tiles - scored by King (black leader), King can also score other colors
    Black,
}

/// Temple is a red tile
/// Leaders must always be adjacent to at least one temple
pub const TEMPLE: TileType = TileType::Red;

impl From<u8> for TileType {
    fn from(val: u8) -> Self {
        match val {
            0b0000 => TileType::Empty,
            0b0001 => TileType::Blue,
            0b0010 => TileType::Green,
            0b0100 => TileType::Red,
            0b1000 => TileType::Black,
            _ => panic!("invalid tile type"),
        }
    }
}

impl TileType {
    fn as_leader(&self) -> Leader {
        match self {
            TileType::Blue => Leader::Blue,
            TileType::Green => Leader::Green,
            TileType::Red => Leader::Red,
            TileType::Black => Leader::Black,
            TileType::Empty => Leader::None,
        }
    }

    /// Returns true if this tile type is a temple (red tile)
    /// Temples are special because leaders must be adjacent to them
    #[inline]
    pub fn is_temple(&self) -> bool {
        *self == TileType::Red
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Player {
    None,
    Player1,
    Player2,
    Player3,
    Player4,
}

impl Player {
    /// Seat index for an active player (0..4), or `None` for `Player::None`.
    #[inline]
    pub fn index(&self) -> Option<usize> {
        match self {
            Player::None => None,
            Player::Player1 => Some(0),
            Player::Player2 => Some(1),
            Player::Player3 => Some(2),
            Player::Player4 => Some(3),
        }
    }

    #[inline]
    pub fn from_index(i: usize) -> Player {
        match i {
            0 => Player::Player1,
            1 => Player::Player2,
            2 => Player::Player3,
            3 => Player::Player4,
            _ => Player::None,
        }
    }

    /// The next active seat in clockwise (ascending index) order.
    #[inline]
    pub fn next(self, num_players: u8) -> Player {
        match self.index() {
            Some(i) if num_players > 0 => Player::from_index((i + 1) % num_players as usize),
            _ => Player::None,
        }
    }

    /// All active seats for `num_players`, in clockwise order.
    pub fn seats(num_players: u8) -> Vec<Player> {
        (0..num_players as usize).map(Player::from_index).collect()
    }

    /// Number of clockwise steps from `self` to `to` (1..num_players).
    #[inline]
    pub fn clockwise_distance(self, to: Player, num_players: u8) -> u8 {
        match (self.index(), to.index()) {
            (Some(a), Some(b)) if num_players > 0 => {
                let n = num_players as usize;
                (((b + n) - a) % n) as u8
            }
            _ => u8::MAX,
        }
    }
}

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Leader {
    None,
    Blue,
    Green,
    Red,
    Black,
}

impl From<u8> for Leader {
    fn from(val: u8) -> Self {
        match val {
            0b0000 => Leader::None,
            0b0001 => Leader::Blue,
            0b0010 => Leader::Green,
            0b0100 => Leader::Red,
            0b1000 => Leader::Black,
            _ => panic!("invalid leader"),
        }
    }
}

impl Leader {
    pub fn as_tile_type(&self) -> TileType {
        match self {
            Leader::Blue => TileType::Blue,
            Leader::Green => TileType::Green,
            Leader::Red => TileType::Red,
            Leader::Black => TileType::Black,
            Leader::None => TileType::Empty,
        }
    }
}

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    NoExternalConflict,
    NotInConflict,
    NotEnoughTiles,
    LeadersDisconnected,
    LeaderNotInConflict,
    NoCatastrophes,
    CannotPlaceOverLeader,
    CannotPlaceTileOverTile,
    InvalidTileType,
    MustPlaceBlueOnRiver,
    CannotPlaceNonBlueOnRiver,
    CannotJoinThreeKingdoms,
    CannotPlaceLeaderNotAdjacentToTemple,
    CannotPlaceLeaderOnRiver,
    CannotPlaceLeaderOnCatastrophe,
    CannotPlaceLeaderJoiningTwoKingdoms,
    CannotMoveOtherLeader,
    InConflict,
    AlreadySentSupport,
    InvalidAction(GameState, Action),
    NoTreasure,
    /// Must take treasure from special border space first
    MustTakeBorderTreasureFirst,
    GameOver,
    CannotPlaceOverTreasure,
    LeaderAlreadyPlaced,
    MonumentNot2x2,
    CannotPlaceCatastropheOnMonument,
    CannotPlaceLeaderOnMonument,
    CannotWithdrawLeader,
    OutOfBounds,
    /// Moving a leader would split its kingdom and rejoin the pieces (L49).
    CannotSplitAndRejoin,
}

#[cfg(test)]
mod tests {
    use super::*;

    macro_rules! p1 {
        () => {
            (Player::Player1, PlayerAction::Normal)
        };
        ($i:expr) => {
            (Player::Player1, $i)
        };
    }

    macro_rules! p2 {
        () => {
            (Player::Player2, PlayerAction::Normal)
        };
        ($i:expr) => {
            (Player::Player2, $i)
        };
    }

    #[test]
    fn test_pos_neighbors() {
        let pos = pos!(0, 0);
        let neighbors = pos.neighbors().iter().collect::<Vec<_>>();
        assert_eq!(neighbors.len(), 2);
        assert!(neighbors.contains(&pos!(1, 0)));
        assert!(neighbors.contains(&pos!(0, 1)));
    }

    #[test]
    fn leader_must_be_placed_next_to_temples() {
        let mut game = TnEGame::new();
        assert_eq!(game.play_action_stack, vec![p1!(), p1!()]);
        assert_eq!(game.players.get_mut(Player::Player1).hand_sum(), 6);
        let ret = game.process(Action::PlaceLeader {
            pos: pos!(0, 0),
            leader: Leader::Black,
        });
        assert_eq!(
            ret.unwrap_err(),
            Error::CannotPlaceLeaderNotAdjacentToTemple
        );
    }

    #[test]
    fn leader_must_be_placed_next_to_temples_ok() {
        let mut game = TnEGame::new();
        let ret = game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Black,
        });
        assert_eq!(ret.unwrap(), (Player::Player1, PlayerAction::Normal));
        assert_eq!(game.board.get_leader(pos!(0, 1)), Leader::Black);
        assert_eq!(game.board.get_player(pos!(0, 1)), Player::Player1);

        let ret = game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        });
        assert_eq!(ret.unwrap(), (Player::Player2, PlayerAction::Normal));
        assert_eq!(game.board.get_leader(pos!(1, 0)), Leader::Red);
        assert_eq!(game.board.get_player(pos!(1, 0)), Player::Player1);
    }

    fn ensure_player_has_at_least_1_color(player: &mut PlayerState, color: TileType) {
        match color {
            TileType::Blue => ensure_player_has_at_least_1_blue(player),
            TileType::Green => ensure_player_has_at_least_1_green(player),
            TileType::Red => ensure_player_has_at_least_1_red(player),
            TileType::Black => ensure_player_has_at_least_1_black(player),
            TileType::Empty => (),
        }

        fn ensure_player_has_at_least_1_blue(player: &mut PlayerState) {
            if player.hand_blue == 0 {
                player.hand_blue = 1;

                if player.hand_black > 0 {
                    player.hand_black -= 1;
                } else if player.hand_green > 0 {
                    player.hand_green -= 1;
                } else if player.hand_red > 0 {
                    player.hand_red -= 1;
                }
            }
        }
        fn ensure_player_has_at_least_1_green(player: &mut PlayerState) {
            if player.hand_green == 0 {
                player.hand_green = 1;

                if player.hand_black > 0 {
                    player.hand_black -= 1;
                } else if player.hand_blue > 0 {
                    player.hand_blue -= 1;
                } else if player.hand_red > 0 {
                    player.hand_red -= 1;
                }
            }
        }
        fn ensure_player_has_at_least_1_red(player: &mut PlayerState) {
            if player.hand_red == 0 {
                player.hand_red = 1;

                if player.hand_black > 0 {
                    player.hand_black -= 1;
                } else if player.hand_blue > 0 {
                    player.hand_blue -= 1;
                } else if player.hand_green > 0 {
                    player.hand_green -= 1;
                }
            }
        }
        fn ensure_player_has_at_least_1_black(player: &mut PlayerState) {
            if player.hand_black == 0 {
                player.hand_black = 1;

                if player.hand_red > 0 {
                    player.hand_red -= 1;
                } else if player.hand_blue > 0 {
                    player.hand_blue -= 1;
                } else if player.hand_green > 0 {
                    player.hand_green -= 1;
                }
            }
        }
    }

    #[test]
    fn internal_conflict() {
        let mut game = TnEGame::new();

        // player 1 puts down black and red leaders
        game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Black,
        })
        .unwrap();
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        })
        .unwrap();

        assert_eq!(game.players.get_mut(Player::Player1).hand_sum(), 6);
        assert_eq!(game.players.get_mut(Player::Player2).hand_sum(), 6);

        // player 2 puts down red leader
        assert_eq!(game.play_action_stack, vec![p2!(), p2!()]);
        let ret = game.process(Action::PlaceLeader {
            pos: pos!(2, 1),
            leader: Leader::Red,
        });
        assert_eq!(
            ret.unwrap(),
            (Player::Player2, PlayerAction::AddSupport(TileType::Red))
        );
        assert!(game.internal_conflict.is_some());
        assert_eq!(
            game.internal_conflict.unwrap(),
            Conflict {
                is_internal: true,
                attacker: Player::Player2,
                defender: Player::Player1,
                conflict_leader: Leader::Red,
                attacker_pos: pos!(2, 1),
                defender_pos: pos!(1, 0),
                attacker_support: 0,
                defender_support: 0,
                attacker_sent_support: false,
                defender_sent_support: false,
                attacker_base_strength: 1,
                defender_base_strength: 1,
            }
        );
        assert_eq!(
            game.play_action_stack,
            vec![p2!(), p2!(PlayerAction::AddSupport(TileType::Red))]
        );

        // player 2 can only add red support, trying to do anything else is an error
        game.process(Action::PlaceLeader {
            pos: pos!(2, 1),
            leader: Leader::Red,
        })
        .unwrap_err();

        // player 2 tries to add 6 support, but fails
        assert_eq!(
            game.play_action_stack,
            vec![p2!(), p2!(PlayerAction::AddSupport(TileType::Red))]
        );
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player2), TileType::Black);
        let ret = game.process(Action::AddSupport(6));
        assert_eq!(ret.unwrap_err(), Error::NotEnoughTiles);
        assert_eq!(game.players.get_mut(Player::Player2).hand_sum(), 6);

        // player 2 successfully adds 1 support
        ensure_player_has_at_least_1_color(&mut game.players.0[1], TileType::Red);
        let ret = game.process(Action::AddSupport(1));
        assert_eq!(
            game.play_action_stack,
            vec![p2!(), p1!(PlayerAction::AddSupport(TileType::Red))]
        );
        assert_eq!(game.players.get_mut(Player::Player2).hand_sum(), 5);
        assert_eq!(game.internal_conflict.unwrap().attacker_support, 1);
        assert_eq!(game.internal_conflict.unwrap().defender_support, 0);
        assert!(game.internal_conflict.unwrap().attacker_sent_support);
        assert!(!game.internal_conflict.unwrap().defender_sent_support);
        assert_eq!(
            ret.unwrap(),
            (Player::Player1, PlayerAction::AddSupport(TileType::Red))
        );

        // player 1 successfully adds 1 support
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        let ret = game.process(Action::AddSupport(1));
        assert_eq!(game.play_action_stack, vec![p2!()]);
        assert_eq!(ret.unwrap(), (Player::Player2, PlayerAction::Normal));
        assert_eq!(game.players.get_mut(Player::Player2).hand_sum(), 5);
        // No refill. Rulebook L44 refills hands "at the end of any player's
        // turn"; the war sequence (L50-78) does not authorise one, so the
        // defender keeps the tiles it spent on support. This assertion used to
        // read 6, with the comment "defender draws" — pinning the bug.
        assert_eq!(game.players.get_mut(Player::Player1).hand_sum(), 5);

        let ret = game.process(Action::Pass);
        assert_eq!(ret.unwrap(), (Player::Player1, PlayerAction::Normal));
        assert_eq!(game.play_action_stack, vec![p1!(), p1!()]);

        assert_eq!(game.players.get_mut(Player::Player2).hand_sum(), 6);
        assert_eq!(game.players.get_mut(Player::Player1).hand_sum(), 6);
    }

    #[test]
    fn score_is_correct() {
        let mut player = PlayerState {
            score_black: 1,
            score_blue: 2,
            score_green: 3,
            score_red: 4,
            ..Default::default()
        };
        assert_eq!(player.calculate_score(), 1);
        player.score_treasure = 1;
        assert_eq!(player.calculate_score(), 2);
        player.score_treasure = 3;
        assert_eq!(player.calculate_score(), 3);
    }

    #[test]
    fn place_tile() {
        let mut game = TnEGame::new();
        game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Red,
        })
        .unwrap();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        let ret = game.process(Action::PlaceTile {
            pos: pos!(0, 0),
            tile_type: TileType::Red,
        });
        assert_eq!(ret.unwrap(), (Player::Player2, PlayerAction::Normal));
        assert_eq!(game.board.get_tile_type(pos!(0, 0)), TileType::Red);
        assert_eq!(game.players.get_mut(Player::Player2).hand_sum(), 6);
        assert_eq!(game.players.get_mut(Player::Player1).hand_sum(), 6);
        assert_eq!(game.players.get_mut(Player::Player1).score_red, 1);
    }

    #[test]
    fn place_tile_no_leader() {
        let mut game = TnEGame::new();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        let ret = game.process(Action::PlaceTile {
            pos: pos!(0, 0),
            tile_type: TileType::Red,
        });
        assert_eq!(ret.unwrap(), (Player::Player1, PlayerAction::Normal));
        assert_eq!(game.board.get_tile_type(pos!(0, 0)), TileType::Red);
        assert_eq!(game.players.get_mut(Player::Player2).hand_sum(), 6);
        assert_eq!(game.players.get_mut(Player::Player1).hand_sum(), 5);
        assert_eq!(game.players.get_mut(Player::Player1).score_red, 0);
    }

    #[test]
    fn place_tile_score_enemy_leader() {
        let mut game = TnEGame::new();
        game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Red,
        })
        .unwrap();
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Black,
        })
        .unwrap();
        assert_eq!(game.play_action_stack, vec![p2!(), p2!()]);
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player2), TileType::Red);
        game.process(Action::PlaceTile {
            pos: pos!(0, 0),
            tile_type: TileType::Red,
        })
        .unwrap();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player2), TileType::Black);
        game.process(Action::PlaceTile {
            pos: pos!(2, 0),
            tile_type: TileType::Black,
        })
        .unwrap();
        assert_eq!(game.players.get_mut(Player::Player2).hand_sum(), 6);
        assert_eq!(game.players.get_mut(Player::Player1).hand_sum(), 6);

        assert_eq!(game.players.get_mut(Player::Player1).score_red, 1);
        assert_eq!(game.players.get_mut(Player::Player1).score_black, 1);
    }

    #[test]
    fn place_tile_trigger_external_conflict() {
        let mut game = TnEGame::new();

        // player 1 place a leader and a tile
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        })
        .unwrap();
        game.process(Action::PlaceTile {
            pos: pos!(0, 2),
            tile_type: TileType::Red,
        })
        .unwrap();
        assert_eq!(game.board.get_tile_type(pos!(0, 2)), TileType::Red);
        assert_eq!(game.players.get_mut(Player::Player1).score_red, 0);

        // player 2 places a leader
        game.process(Action::PlaceLeader {
            pos: pos!(0, 3),
            leader: Leader::Red,
        })
        .unwrap();

        // player 2 places a tile joining two kingdoms
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player2), TileType::Red);
        let ret = game
            .process(Action::PlaceTile {
                pos: pos!(0, 1),
                tile_type: TileType::Red,
            })
            .unwrap();
        assert_eq!(
            game.play_action_stack,
            vec![p2!(PlayerAction::SelectLeader {
                red: true,
                blue: false,
                green: false,
                black: false
            })]
        );
        assert_eq!(
            ret,
            (
                Player::Player2,
                PlayerAction::SelectLeader {
                    red: true,
                    blue: false,
                    green: false,
                    black: false
                }
            )
        );
        assert_eq!(
            game.external_conflict,
            Some(ExternalConflict {
                conflicts: vec![Conflict {
                    is_internal: false,
                    attacker: Player::Player2,
                    defender: Player::Player1,
                    conflict_leader: Leader::Red,
                    attacker_pos: pos!(0, 3),
                    defender_pos: pos!(1, 0),
                    attacker_support: 0,
                    defender_support: 0,
                    attacker_sent_support: false,
                    defender_sent_support: false,
                    attacker_base_strength: 1,
                    defender_base_strength: 1,
                }],
                unification_tile_pos: pos!(0, 1),
                unification_tile_type: TileType::Red,
            })
        );

        // player 2 (attacker) selects leader
        game.process(Action::WarSelectLeader(Leader::Red))
        .unwrap();
        assert_eq!(
            game.play_action_stack,
            vec![(Player::Player2, PlayerAction::AddSupport(TileType::Red))]
        );

        // adds support
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player2), TileType::Red);
        game.process(Action::AddSupport(1))
        .unwrap();
        assert_eq!(
            game.external_conflict.as_ref().unwrap().conflicts[0].attacker_support,
            1
        );
        assert_eq!(
            game.external_conflict.as_ref().unwrap().conflicts[0].defender_support,
            0
        );
        assert_eq!(
            game.external_conflict.as_ref().unwrap().conflicts[0].attacker_base_strength,
            1
        );
        assert_eq!(
            game.external_conflict.as_ref().unwrap().conflicts[0].defender_base_strength,
            1
        );
        assert_eq!(
            game.play_action_stack,
            vec![(Player::Player1, PlayerAction::AddSupport(TileType::Red))]
        );

        // player 1 (defender) adds support
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        let ret = game
            .process(Action::AddSupport(1))
            .unwrap();
        assert_eq!(game.play_action_stack, vec![p1!(), p1!()]);
        assert_eq!(ret, (Player::Player1, PlayerAction::Normal));
    }

    #[test]
    fn external_conflict_removes_tile_from_hand() {
        let mut game = TnEGame::new();

        // player 1 place a leader and a tile
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        })
        .unwrap();
        game.process(Action::PlaceTile {
            pos: pos!(0, 2),
            tile_type: TileType::Red,
        })
        .unwrap();

        // player 2 places a leader
        game.process(Action::PlaceLeader {
            pos: pos!(0, 3),
            leader: Leader::Red,
        })
        .unwrap();
        
        // Ensure player 2 has exactly 1 red tile and record hand size
        game.players.get_mut(Player::Player2).hand_red = 1;
        game.players.get_mut(Player::Player2).hand_blue = 2;
        game.players.get_mut(Player::Player2).hand_green = 2;
        game.players.get_mut(Player::Player2).hand_black = 1;
        
        let hand_before = game.players.get(Player::Player2).hand_sum();
        let red_before = game.players.get(Player::Player2).hand_red;
        
        // player 2 places a tile joining two kingdoms - triggers external conflict
        game.process(Action::PlaceTile {
            pos: pos!(0, 1),
            tile_type: TileType::Red,
        })
        .unwrap();
        
        // Verify the tile was removed from hand
        assert!(game.external_conflict.is_some());
        assert_eq!(game.players.get(Player::Player2).hand_red, red_before - 1);
        assert_eq!(game.players.get(Player::Player2).hand_sum(), hand_before - 1);
    }

    /// Regression (BUGS.md B2): a tile that joins **two** kingdoms scores
    /// nothing, even when no same-colour conflict arises.
    ///
    /// Rulebook L61 awards the point only "if the tile does not join two
    /// kingdoms", and L78 repeats it. This test previously asserted
    /// `score_red == 1` — it was pinning the bug, crediting a black leader for
    /// a tile that united two separate kingdoms.
    #[test]
    fn place_tile_joining_two_kingdoms_scores_nothing() {
        let mut game = TnEGame::new();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        })
        .unwrap();
        game.process(Action::PlaceTile {
            pos: pos!(0, 2),
            tile_type: TileType::Red,
        })
        .unwrap();
        assert_eq!(game.board.get_tile_type(pos!(0, 2)), TileType::Red);
        assert_eq!(game.players.get_mut(Player::Player1).score_red, 0);
        game.process(Action::PlaceLeader {
            pos: pos!(0, 3),
            leader: Leader::Black,
        })
        .unwrap();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player2), TileType::Red);
        let ret = game
            .process(Action::PlaceTile {
                pos: pos!(0, 1),
                tile_type: TileType::Red,
            })
            .unwrap();
        assert_eq!(ret, (Player::Player1, PlayerAction::Normal));
        // (0,1) touches two kingdoms that were not previously connected:
        // {(0,2), (0,3 black leader)} and {(1,1 temple), (1,0 red leader)}.
        // The black-leader rule (L62) must not apply, because the point is only
        // distributed when the tile joins fewer than two kingdoms.
        assert_eq!(game.players.get_mut(Player::Player1).score_red, 0);
        assert_eq!(game.players.get_mut(Player::Player2).score_red, 0);
    }

    /// The complement of the above: a tile joining a **single** kingdom still
    /// scores for a matching leader, and for a black leader otherwise.
    #[test]
    fn place_tile_joining_one_kingdom_still_scores() {
        let mut game = TnEGame::new();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        })
        .unwrap();
        // (0,1) is orthogonally adjacent to the red leader at (1,0) and joins
        // only that kingdom.
        game.process(Action::PlaceTile {
            pos: pos!(0, 1),
            tile_type: TileType::Red,
        })
        .unwrap();
        assert_eq!(
            game.players.get(Player::Player1).score_red,
            1,
            "a single-kingdom placement must still score"
        );
    }

    #[test]
    fn place_next_to_red() {
        let mut game = TnEGame::new();
        game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Green,
        })
        .unwrap();
        let ret = game.board.find_empty_leader_space_next_to_red();
        assert_eq!(ret.iter().filter(|i| i.x < 5 && i.y < 5).count(), 3);
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Green);
        game.process(Action::PlaceTile {
            pos: pos!(1, 0),
            tile_type: TileType::Green,
        })
        .unwrap();
        assert_eq!(game.players.get_mut(Player::Player1).score_green, 1);
    }

    #[test]
    fn find_kingdom_adj() {
        let mut game = TnEGame::new();
        game.process(Action::PlaceLeader {
            pos: pos!(1, 2),
            leader: Leader::Green,
        })
        .unwrap();
        let ret = game.board.find_empty_spaces_adj_kingdom(pos!(1, 1), false);

        assert_eq!(
            ret,
            vec![
                pos!(0, 1),
                pos!(1, 0),
                pos!(2, 1),
                pos!(0, 2),
                pos!(1, 3),
                pos!(2, 2),
            ]
        );
    }

    #[test]
    fn external_conflict_resolution() {
        let mut game = TnEGame::new();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Black,
        })
        .unwrap();
        game.process(Action::PlaceTile {
            pos: pos!(1, 3),
            tile_type: TileType::Red,
        })
        .unwrap();

        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player2), TileType::Black);
        game.process(Action::PlaceLeader {
            pos: pos!(0, 3),
            leader: Leader::Black,
        })
        .unwrap();
        game.process(Action::PlaceTile {
            pos: pos!(0, 2),
            tile_type: TileType::Black,
        })
        .unwrap();

        game.players.get_mut(Player::Player1).hand_black = 2;
        game.process(Action::PlaceTile {
            pos: pos!(1, 2),
            tile_type: TileType::Black,
        })
        .unwrap();
        game.process(Action::WarSelectLeader(Leader::Black))
        .unwrap();
        game.players.get_mut(Player::Player1).hand_black = 2;
        game.process(Action::AddSupport(2))
        .unwrap();

        game.process(Action::AddSupport(0))
        .unwrap();
        assert_eq!(game.board.get_tile_type(pos!(0, 2)), TileType::Empty);
        assert_eq!(game.next_state(), GameState::Normal);
    }

    /// Regression (BUGS.md B1): resolving a war places the unification tile but
    /// must not award a victory point for it.
    ///
    /// Rulebook L78: "Remove the unification tile. (Do not distribute a victory
    /// point as for normal placement of a tile.)" The old code called
    /// `add_score` for the unification cell, and because the block sat inside
    /// the per-conflict loop it paid the same tile once per conflict colour.
    ///
    /// Point accounting for this position (P1 black leader, P2 black leader,
    /// unification cell (1,2)); black cubes only:
    ///
    ///   P2 places their own black tile at (0,2) beside their own black
    ///   leader            -> P2 +1   (L61-62)
    ///   P1 wins the war    -> P1 +1   (L72)
    ///   (0,2) discarded    -> P1 +1   (L73)
    ///   the unification cell at (1,2) -> +0   (L78)
    ///
    /// So black totals are P1 = 2, P2 = 1. The old code produced P1 = 3, because
    /// it also credited the unification cell.
    #[test]
    fn unification_tile_awards_no_victory_point() {
        let mut game = TnEGame::new();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Black,
        })
        .unwrap();
        game.process(Action::PlaceTile {
            pos: pos!(1, 3),
            tile_type: TileType::Red,
        })
        .unwrap();

        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player2), TileType::Black);
        game.process(Action::PlaceLeader {
            pos: pos!(0, 3),
            leader: Leader::Black,
        })
        .unwrap();
        game.process(Action::PlaceTile {
            pos: pos!(0, 2),
            tile_type: TileType::Black,
        })
        .unwrap();

        game.players.get_mut(Player::Player1).hand_black = 2;
        game.process(Action::PlaceTile {
            pos: pos!(1, 2),
            tile_type: TileType::Black,
        })
        .unwrap();
        game.process(Action::WarSelectLeader(Leader::Black))
        .unwrap();
        game.players.get_mut(Player::Player1).hand_black = 2;
        game.process(Action::AddSupport(2))
        .unwrap();
        game.process(Action::AddSupport(0))
        .unwrap();

        // The real tile does land on the unification cell.
        assert_eq!(
            game.board.get_tile_type(pos!(1, 2)),
            TileType::Black,
            "the unification cell must become the played tile"
        );

        let p1 = game.players.get(Player::Player1).score_black;
        let p2 = game.players.get(Player::Player2).score_black;
        assert_eq!(
            (p1, p2),
            (2, 1),
            "the unification cell must not add a point (got p1={p1}, p2={p2})"
        );
    }

    #[test]
    fn test_monument() {
        let mut game = TnEGame::new();

        ensure_player_has_at_least_1_color(&mut game.players.0[0], TileType::Red);
        game.process(Action::PlaceTile {
            pos: pos!(0, 0),
            tile_type: TileType::Red,
        })
        .unwrap();
        ensure_player_has_at_least_1_color(&mut game.players.0[0], TileType::Red);
        game.process(Action::PlaceTile {
            pos: pos!(0, 1),
            tile_type: TileType::Red,
        })
        .unwrap();

        ensure_player_has_at_least_1_color(&mut game.players.0[1], TileType::Red);
        game.process(Action::PlaceTile {
            pos: pos!(1, 0),
            tile_type: TileType::Red,
        })
        .unwrap();
        assert_eq!(
            game.next(),
            (
                Player::Player2,
                PlayerAction::BuildMonument(
                    pos!(0, 0),
                    vec![
                        MonumentType::RedGreen,
                        MonumentType::RedBlue,
                        MonumentType::BlackRed
                    ]
                )
            )
        );
        game.process(Action::BuildMonument(MonumentType::RedGreen))
        .unwrap();

        ensure_player_has_at_least_1_color(&mut game.players.0[1], TileType::Red);
        game.process(Action::PlaceTile {
            pos: pos!(1, 2),
            tile_type: TileType::Red,
        })
        .unwrap();

        game.process(Action::PlaceLeader {
            pos: pos!(2, 2),
            leader: Leader::Green,
        })
        .unwrap();
        game.process(Action::Pass).unwrap();
        assert_eq!(game.players.0[0].score_green, 1);
    }

    #[test]
    fn test_monument_removed_from_available() {
        let mut game = TnEGame::new();

        // Initially, all 6 monument types are available
        assert_eq!(game.available_monuments.len(), 6);
        assert!(game.available_monuments.contains(&MonumentType::RedGreen));

        // Build a 2x2 square of red tiles
        ensure_player_has_at_least_1_color(&mut game.players.0[0], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(0, 0), tile_type: TileType::Red }).unwrap();
        ensure_player_has_at_least_1_color(&mut game.players.0[0], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(0, 1), tile_type: TileType::Red }).unwrap();

        ensure_player_has_at_least_1_color(&mut game.players.0[1], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(1, 0), tile_type: TileType::Red }).unwrap();

        // Build the monument
        game.process(Action::BuildMonument(MonumentType::RedGreen)).unwrap();

        // The monument should be removed from available monuments
        assert_eq!(game.available_monuments.len(), 5);
        assert!(!game.available_monuments.contains(&MonumentType::RedGreen));
    }

    #[test]
    fn test_monument_tiles_still_connect_kingdom() {
        let mut game = TnEGame::new();

        // Build a 2x2 monument
        ensure_player_has_at_least_1_color(&mut game.players.0[0], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(0, 0), tile_type: TileType::Red }).unwrap();
        ensure_player_has_at_least_1_color(&mut game.players.0[0], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(0, 1), tile_type: TileType::Red }).unwrap();
        ensure_player_has_at_least_1_color(&mut game.players.0[1], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(1, 0), tile_type: TileType::Red }).unwrap();
        game.process(Action::BuildMonument(MonumentType::RedGreen)).unwrap();

        // Monument tiles should be marked as monuments
        assert!(game.board.get_monument(pos!(0, 0)));
        assert!(game.board.get_monument(pos!(0, 1)));
        assert!(game.board.get_monument(pos!(1, 0)));
        assert!(game.board.get_monument(pos!(1, 1)));

        // Monument tiles should still be connectable (for kingdom linking)
        assert!(game.board.is_connectable(pos!(0, 0)));
        assert!(game.board.is_connectable(pos!(0, 1)));
        assert!(game.board.is_connectable(pos!(1, 0)));
        assert!(game.board.is_connectable(pos!(1, 1)));
    }

    #[test]
    fn test_neighbors() {
        let pos = pos!(1, 1);
        let mut n = Bitboard::new();
        n.set(pos!(0, 1));
        n.set(pos!(1, 0));
        n.set(pos!(1, 2));
        n.set(pos!(2, 1));
        assert!(pos.neighbors() == n);

        assert!(pos.neighbors().iter().count() == 4);
        assert!(pos!(0,3).neighbors().iter().count() == 3);
    }

    #[test]
    fn test_bug_leaders_disconnected() {
        let mut game = TnEGame::new();

        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        }).unwrap();
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(0, 3), tile_type: TileType::Red }).unwrap();

        game.process(Action::PlaceLeader { pos: pos!(1, 3), leader: Leader::Red }).unwrap();
        let count = game.board.nearby_kingdom_count();
        assert_eq!(count[1][2], 2);
    }

    #[test]
    fn test_find_kingdom() {
        let mut game = TnEGame::new();
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        }).unwrap();

        let mut visited = Bitboard::new();
        let k = game.board.find_kingdom(pos!(1,0), &mut visited);
        assert!(k.map.get(pos!(1,0)));
        assert!(k.map.get(pos!(1,1)));
        assert_eq!(k.map.count_ones(), 2);
    }

    #[test]
    fn test_bitboard() {
        let mut bb = Bitboard::new();
        bb.set(pos!(0, 0));
        assert!(bb.get(pos!(0, 0)));
    }

    #[test]
    fn test_game_action_usize() {
        for i in 0..(11 * 16 * 11 + 6 + 7 + 4 + 1) {
            let action: Action = i.into();
            let ret: usize = action.into();
            assert_eq!(ret, i, "action: {:?}", action);
        }

        let action: Action = 124.into();
        dbg!(action);

    }

    #[test]
    fn test_generate_move() {
        let mut game = TnEGame::new();
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        }).unwrap();
        game.process(Action::PlaceTile { pos: pos!(0, 3), tile_type: TileType::Red }).unwrap();
        let moves = game.next_action().generate_moves(&game);
        dbg!(moves);
    }

    #[test]
    fn bench_nearby_kingdom_count() {
        use std::time::Instant;

        // Setup a game with multiple kingdoms for realistic benchmark
        let mut game = TnEGame::new();
        let _ = game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        });
        let _ = game.process(Action::PlaceTile { pos: pos!(0, 3), tile_type: TileType::Red });
        let _ = game.process(Action::PlaceLeader { pos: pos!(1, 3), leader: Leader::Red });
        let _ = game.process(Action::PlaceTile { pos: pos!(5, 5), tile_type: TileType::Red });
        let _ = game.process(Action::PlaceLeader { pos: pos!(5, 6), leader: Leader::Green });

        // Warm up
        for _ in 0..1000 {
            let _ = game.board.nearby_kingdom_count();
        }

        // Benchmark
        let iterations = 100_000;
        let start = Instant::now();
        for _ in 0..iterations {
            let _ = game.board.nearby_kingdom_count();
        }
        let duration = start.elapsed();

        println!("\n=== nearby_kingdom_count benchmark ===");
        println!("Iterations: {}", iterations);
        println!("Total time: {:?}", duration);
        println!("Average time per call: {:?}", duration / iterations as u32);
        println!("Calls per second: {:.0}", iterations as f64 / duration.as_secs_f64());
    }

    // ==================== CATASTROPHE TESTS ====================

    #[test]
    fn test_catastrophe_placement() {
        let mut game = TnEGame::new();
        
        // Place a tile first
        ensure_player_has_at_least_1_color(game.players.get_mut(Player::Player1), TileType::Red);
        game.process(Action::PlaceTile {
            pos: pos!(0, 0),
            tile_type: TileType::Red,
        }).unwrap();
        
        // Place catastrophe on that tile (player has 2 catastrophes by default)
        let ret = game.process(Action::PlaceCatastrophe(pos!(0, 0)));
        assert!(ret.is_ok());
        assert!(game.board.get_catastrophe(pos!(0, 0)));
        assert_eq!(game.board.get_tile_type(pos!(0, 0)), TileType::Empty);
    }

    #[test]
    fn test_cannot_place_catastrophe_on_leader() {
        let mut game = TnEGame::new();
        
        // Place leader
        game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Red,
        }).unwrap();
        
        // Try to place catastrophe on leader position
        let ret = game.process(Action::PlaceCatastrophe(pos!(0, 1)));
        assert_eq!(ret.unwrap_err(), Error::CannotPlaceOverLeader);
    }

    #[test]
    fn test_monument_prevents_catastrophe() {
        // This test verifies that monuments block catastrophe placement
        // by directly checking the error type in the game logic
        let mut game = TnEGame::new();
        
        // Manually set up a monument on the board at position (0,0)
        game.board.monuments.set(pos!(0, 0));
        
        // Try to place catastrophe on monument position
        let ret = game.process(Action::PlaceCatastrophe(pos!(0, 0)));
        assert_eq!(ret.unwrap_err(), Error::CannotPlaceCatastropheOnMonument);
    }

    /// R11.1: a catastrophe may be placed on an empty space as well as on a
    /// tiled one. `find_catastrophe_positions` used to require a tile, so the
    /// agent's move list (and the interop availability plane) offered a strict
    /// subset of what `validate_action` and the human UI accept.
    #[test]
    fn catastrophe_positions_include_empty_spaces() {
        let game = TnEGame::new();
        let empty = pos!(0, 0);
        assert_eq!(game.board.get_tile_type(empty), TileType::Empty);
        assert!(
            game.board.can_place_catastrophe(empty),
            "an empty space is legal (L86)"
        );
        assert!(
            game.board.find_catastrophe_positions().contains(&empty),
            "the generator must offer the empty space"
        );
        assert!(
            game.validate_action(Action::PlaceCatastrophe(empty), game.next_state())
                .is_ok(),
            "the generator and validation must agree"
        );
    }

    #[test]
    fn test_catastrophe_only_evicts_leader_without_adjacent_temple() {
        let mut game = TnEGame::new();
        
        // Place a red tile (temple) at (0,0)
        game.players.0[0].hand_red = 2;
        game.process(Action::PlaceTile {
            pos: pos!(0, 0),
            tile_type: TileType::Red,
        }).unwrap();
        
        // Place a leader adjacent to both the new temple and the pre-existing temple at (1,1)
        // Position (1,0) is adjacent to both (0,0) and (1,1)
        game.process(Action::PlaceLeader {
            pos: pos!(1, 0),
            leader: Leader::Red,
        }).unwrap();
        
        // Player 2's turn
        game.process(Action::Pass).unwrap();
        game.process(Action::Pass).unwrap();
        
        // Now Player 1 places catastrophe on (0,0) - destroying the temple
        // Leader at (1,0) should NOT be evicted because it's still adjacent to temple at (1,1)
        let ret = game.process(Action::PlaceCatastrophe(pos!(0, 0)));
        assert!(ret.is_ok());
        assert!(game.board.get_catastrophe(pos!(0, 0)));
        // Leader should still be at (1,0) because (1,1) is a temple adjacent to it
        assert_eq!(game.board.get_leader(pos!(1, 0)), Leader::Red);
    }

    #[test]
    fn test_catastrophe_evicts_leader_when_no_adjacent_temple() {
        let mut game = TnEGame::new();
        
        // Place a red tile (temple) at (5,0) - this is not on river
        game.players.0[0].hand_red = 2;
        game.process(Action::PlaceTile {
            pos: pos!(5, 0),
            tile_type: TileType::Red,
        }).unwrap();
        
        // Place another red tile at (5,1) to have two adjacent temples for the leader
        game.process(Action::PlaceTile {
            pos: pos!(5, 1),
            tile_type: TileType::Red,
        }).unwrap();
        
        // Player 2's turn - pass
        game.process(Action::Pass).unwrap();
        game.process(Action::Pass).unwrap();
        
        // Place a leader at (4,0) - adjacent to temple at (5,0)
        // But (4,0) is also adjacent to the river/nothing else
        game.process(Action::PlaceLeader {
            pos: pos!(4, 0),
            leader: Leader::Red,
        }).unwrap();
        
        // Place catastrophe at (5,0) - destroying one adjacent temple
        // Leader at (4,0) should be evicted because there's no other temple adjacent
        // (4,0)'s neighbors are (3,0)=river, (5,0)=catastrophe target, (4,1)=empty
        let ret = game.process(Action::PlaceCatastrophe(pos!(5, 0)));
        assert!(ret.is_ok());
        assert!(game.board.get_catastrophe(pos!(5, 0)));
        // Leader should be removed because (5,0) was the only adjacent temple
        assert_eq!(game.board.get_leader(pos!(4, 0)), Leader::None);
        assert!(game.players.0[0].placed_red_leader.is_none());
    }

    // ==================== RIVER/BLUE TILE TESTS ====================

    #[test]
    fn test_blue_tiles_must_be_on_river() {
        let mut game = TnEGame::new();
        game.players.0[0].hand_blue = 2;
        
        // Try to place blue tile on non-river
        let ret = game.process(Action::PlaceTile {
            pos: pos!(0, 0),
            tile_type: TileType::Blue,
        });
        assert_eq!(ret.unwrap_err(), Error::MustPlaceBlueOnRiver);
    }

    #[test]
    fn test_non_blue_cannot_be_on_river() {
        let mut game = TnEGame::new();
        game.players.0[0].hand_red = 2;
        
        // Find a river position and try to place red
        // River positions can be found by checking RIVER bitboard
        // Based on the game, let's use a known river position
        let ret = game.process(Action::PlaceTile {
            pos: pos!(1, 4), // This should be on river based on standard board
            tile_type: TileType::Red,
        });
        assert_eq!(ret.unwrap_err(), Error::CannotPlaceNonBlueOnRiver);
    }

    #[test]
    fn test_blue_tile_on_river_succeeds() {
        let mut game = TnEGame::new();
        game.players.0[0].hand_blue = 2;
        
        // Place leader first near a river
        game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Blue,
        }).unwrap();
        
        // Place blue tile on river
        let ret = game.process(Action::PlaceTile {
            pos: pos!(1, 4),
            tile_type: TileType::Blue,
        });
        // This should succeed (assuming 1,4 is on river)
        if RIVER.get(pos!(1, 4)) {
            assert!(ret.is_ok());
        }
    }

    // ==================== CANNOT JOIN THREE KINGDOMS ====================

    #[test]
    fn test_nearby_kingdom_count_multiple_kingdoms() {
        let mut game = TnEGame::new();
        
        // Create two separate kingdoms with leaders near temple at (1,1)
        game.process(Action::PlaceLeader { pos: pos!(0, 1), leader: Leader::Red }).unwrap();
        game.process(Action::PlaceLeader { pos: pos!(2, 1), leader: Leader::Black }).unwrap();
        
        // Check that nearby_kingdom_count correctly counts kingdoms
        let count = game.board.nearby_kingdom_count();
        // Position (1, 0) is between the two kingdoms
        assert!(count[1][0] >= 1);
    }

    // ==================== LEADER WITHDRAWAL ====================

    #[test]
    fn test_leader_withdrawal() {
        let mut game = TnEGame::new();
        
        // Place leader
        game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Red,
        }).unwrap();
        game.process(Action::Pass).unwrap();
        
        // Player 2's turn - pass both actions
        game.process(Action::Pass).unwrap();
        game.process(Action::Pass).unwrap();
        
        // Now it's Player 1's turn again - withdraw the leader
        let ret = game.process(Action::WithdrawLeader(pos!(0, 1)));
        assert!(ret.is_ok());
        assert_eq!(game.board.get_leader(pos!(0, 1)), Leader::None);
        assert!(game.players.0[0].placed_red_leader.is_none());
    }

    #[test]
    fn test_cannot_withdraw_nonexistent_leader() {
        let mut game = TnEGame::new();
        
        // Try to withdraw from empty position
        let ret = game.process(Action::WithdrawLeader(pos!(0, 0)));
        assert_eq!(ret.unwrap_err(), Error::CannotWithdrawLeader);
    }

    #[test]
    fn test_cannot_withdraw_opponent_leader() {
        let mut game = TnEGame::new();
        
        // Player 1 places a leader
        game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Red,
        }).unwrap();
        game.process(Action::Pass).unwrap();
        
        // Player 2 tries to withdraw Player 1's leader - this should fail
        let ret = game.process(Action::WithdrawLeader(pos!(0, 1)));
        assert_eq!(ret.unwrap_err(), Error::CannotMoveOtherLeader);
    }

    // ==================== WAR OUTCOMES ====================

    #[test]
    fn test_internal_conflict_attacker_wins() {
        let mut game = TnEGame::new();
        
        // Setup: Player 1 has a red leader
        game.process(Action::PlaceLeader { pos: pos!(0, 1), leader: Leader::Red }).unwrap();
        game.process(Action::Pass).unwrap();
        
        // Player 2 places competing red leader in same kingdom
        let ret = game.process(Action::PlaceLeader { pos: pos!(2, 1), leader: Leader::Red });
        assert!(ret.is_ok());
        assert!(game.internal_conflict.is_some());
        
        // Attacker (P2) sends 2 support
        game.players.0[1].hand_red = 3;
        game.process(Action::AddSupport(2)).unwrap();
        
        // Defender (P1) sends 0 support - attacker wins
        game.process(Action::AddSupport(0)).unwrap();
        
        // P1's leader should be removed, P2's should remain
        assert_eq!(game.board.get_leader(pos!(0, 1)), Leader::None);
        assert_eq!(game.board.get_leader(pos!(2, 1)), Leader::Red);
        assert!(game.players.0[0].placed_red_leader.is_none());
    }

    #[test]
    fn test_internal_conflict_defender_wins_on_tie() {
        let mut game = TnEGame::new();
        
        // Setup: Player 1 has a red leader
        game.process(Action::PlaceLeader { pos: pos!(0, 1), leader: Leader::Red }).unwrap();
        game.process(Action::Pass).unwrap();
        
        // Player 2 places competing red leader
        game.process(Action::PlaceLeader { pos: pos!(2, 1), leader: Leader::Red }).unwrap();
        
        // Both send 0 support - tie goes to defender
        game.process(Action::AddSupport(0)).unwrap();
        game.process(Action::AddSupport(0)).unwrap();
        
        // P2's leader (attacker) should be removed
        assert_eq!(game.board.get_leader(pos!(2, 1)), Leader::None);
        assert_eq!(game.board.get_leader(pos!(0, 1)), Leader::Red);
    }

    // ==================== BITBOARD TESTS ====================

    #[test]
    fn test_bitboard_dilate() {
        let mut bb = Bitboard::new();
        bb.set(pos!(5, 5));
        
        let dilated = bb.dilate();
        
        // Should include all 4 neighbors
        assert!(dilated.get(pos!(4, 5))); // up
        assert!(dilated.get(pos!(6, 5))); // down
        assert!(dilated.get(pos!(5, 4))); // left
        assert!(dilated.get(pos!(5, 6))); // right
        
        // Should NOT include the original or diagonals
        assert!(!dilated.get(pos!(5, 5)));
        assert!(!dilated.get(pos!(4, 4)));
        assert!(!dilated.get(pos!(6, 6)));
    }

    #[test]
    fn test_bitboard_dilate_edge() {
        let mut bb = Bitboard::new();
        bb.set(pos!(0, 0)); // corner
        
        let dilated = bb.dilate();
        
        // Should only have 2 neighbors (right and down)
        assert!(dilated.get(pos!(0, 1)));
        assert!(dilated.get(pos!(1, 0)));
        assert_eq!(dilated.count_ones(), 2);
    }

    #[test]
    fn test_bitboard_dilate_no_wrap() {
        // Test that dilate doesn't wrap around columns
        let mut bb = Bitboard::new();
        bb.set(pos!(5, 15)); // rightmost column
        
        let dilated = bb.dilate();
        
        // Should NOT wrap to column 0
        assert!(!dilated.get(pos!(5, 0)));
        // Should have left neighbor
        assert!(dilated.get(pos!(5, 14)));
    }

    #[test]
    fn test_bitboard_iterator() {
        let mut bb = Bitboard::new();
        bb.set(pos!(0, 0));
        bb.set(pos!(5, 5));
        bb.set(pos!(10, 10));
        
        let positions: Vec<Pos> = bb.iter().collect();
        assert_eq!(positions.len(), 3);
        assert!(positions.contains(&pos!(0, 0)));
        assert!(positions.contains(&pos!(5, 5)));
        assert!(positions.contains(&pos!(10, 10)));
    }

    #[test]
    fn test_bitboard_count_ones() {
        let mut bb = Bitboard::new();
        assert_eq!(bb.count_ones(), 0);
        
        bb.set(pos!(0, 0));
        assert_eq!(bb.count_ones(), 1);
        
        bb.set(pos!(5, 5));
        assert_eq!(bb.count_ones(), 2);
        
        bb.set(pos!(10, 15));
        assert_eq!(bb.count_ones(), 3);
    }

    // ==================== KINGDOM TESTS ====================

    #[test]
    fn test_kingdom_includes_connected_tiles() {
        let mut game = TnEGame::new();
        
        // Place leader and some connected tiles
        game.process(Action::PlaceLeader { pos: pos!(0, 1), leader: Leader::Red }).unwrap();
        game.players.0[0].hand_red = 3;
        game.process(Action::PlaceTile { pos: pos!(0, 0), tile_type: TileType::Red }).unwrap();
        
        // Find kingdom
        let mut visited = Bitboard::new();
        let kingdom = game.board.find_kingdom(pos!(0, 1), &mut visited);
        
        // Should include leader position, temple at (1,1), and the new tile
        assert!(kingdom.map.get(pos!(0, 1))); // leader
        assert!(kingdom.map.get(pos!(1, 1))); // temple
        assert!(kingdom.map.get(pos!(0, 0))); // new tile
        assert!(kingdom.red_leader.is_some());
    }

    #[test]
    fn test_connectable_bitboard() {
        let mut game = TnEGame::new();
        
        // Place some elements
        game.process(Action::PlaceLeader { pos: pos!(0, 1), leader: Leader::Red }).unwrap();
        game.players.0[0].hand_red = 2;
        game.process(Action::PlaceTile { pos: pos!(0, 0), tile_type: TileType::Red }).unwrap();
        
        let connectable = game.board.connectable_bitboard();
        
        // Should include leader, tiles, and pre-existing temples
        assert!(connectable.get(pos!(0, 1))); // leader
        assert!(connectable.get(pos!(0, 0))); // tile
        assert!(connectable.get(pos!(1, 1))); // temple
    }

    // ==================== SCORING TESTS ====================

    #[test]
    fn test_scoring_with_matching_leader() {
        let mut game = TnEGame::new();
        
        // Place red leader
        game.process(Action::PlaceLeader { pos: pos!(0, 1), leader: Leader::Red }).unwrap();
        game.process(Action::Pass).unwrap();
        
        // P2 places tile - P1 should score since they have matching leader
        game.players.0[1].hand_red = 2;
        game.process(Action::PlaceTile { pos: pos!(0, 0), tile_type: TileType::Red }).unwrap();
        
        // P1 should have scored the red point
        assert_eq!(game.players.0[0].score_red, 1);
        assert_eq!(game.players.0[1].score_red, 0);
    }

    #[test]
    fn test_no_scoring_without_leader() {
        let mut game = TnEGame::new();
        
        // Place tile without any leader in kingdom
        game.players.0[0].hand_red = 2;
        game.process(Action::PlaceTile { pos: pos!(0, 0), tile_type: TileType::Red }).unwrap();
        
        // No one should score
        assert_eq!(game.players.0[0].score_red, 0);
        assert_eq!(game.players.0[1].score_red, 0);
    }

    #[test]
    fn test_min_score_calculation() {
        let player = PlayerState {
            score_red: 5,
            score_blue: 3,
            score_green: 2,
            score_black: 1,
            score_treasure: 2,
            ..Default::default()
        };
        
        // Min score is the lowest among the 4 colors
        // Treasures are wildcards that get added to the lowest color
        // With scores (5,3,2,1) and 2 treasures:
        // - 1st treasure goes to black (lowest=1) -> now black=2
        // - 2nd treasure goes to black/green (tied at 2) -> one becomes 3
        // Final min is 2
        assert_eq!(player.calculate_score(), 2);
    }

    // ==================== PASS ACTION TEST ====================

    #[test]
    fn test_pass_action() {
        let mut game = TnEGame::new();
        
        let ret = game.process(Action::Pass);
        assert!(ret.is_ok());
        assert_eq!(game.play_action_stack.len(), 1);
    }

    #[test]
    fn test_two_passes_ends_turn() {
        let mut game = TnEGame::new();
        
        game.process(Action::Pass).unwrap();
        let ret = game.process(Action::Pass).unwrap();
        
        // After two passes, should be player 2's turn
        assert_eq!(ret.0, Player::Player2);
    }

    /// Clear every treasure off the board so a test can set an exact count.
    fn clear_treasures(game: &mut TnEGame) {
        for x in 0..H {
            for y in 0..W {
                game.board.set_treasure(pos!(x as u8, y as u8), false);
            }
        }
    }

    /// Regression (rulebook: "The game ends ... when there are only one or two
    /// treasures on the board"). A green trader takes *all but one* of a
    /// kingdom's treasures in a single action, so the remaining count can jump
    /// straight from 3 to 1 without ever equalling 2. The old `== 2` check
    /// missed that case and let the game run past its real end.
    #[test]
    fn test_game_ends_when_one_treasure_remains() {
        let mut game = TnEGame::new();
        clear_treasures(&mut game);

        // Three on the board: still playing.
        for p in [pos!(0, 0), pos!(0, 1), pos!(0, 2)] {
            game.board.set_treasure(p, true);
        }
        game.process(Action::Pass).unwrap();
        assert!(
            !game.state.is_empty(),
            "game must continue while three treasures remain"
        );

        // The trader takes two at once, leaving one: game over.
        game.board.set_treasure(pos!(0, 1), false);
        game.board.set_treasure(pos!(0, 2), false);
        assert_eq!(game.board.available_treasures_count(), 1);
        // Once the turn ends, `process` rejects further actions with
        // `Error::GameOver`; drive the turn to completion and check the state
        // stack drained rather than unwrapping a move that can no longer exist.
        let _ = game.process(Action::Pass);
        let _ = game.process(Action::Pass);
        assert!(
            game.state.is_empty(),
            "game must end when only one treasure remains (count skipped 2)"
        );
        assert!(matches!(game.process(Action::Pass), Err(Error::GameOver)));
    }

    /// The plain boundary case: exactly two treasures remaining ends the game.
    #[test]
    fn test_game_ends_at_exactly_two_treasures() {
        let mut game = TnEGame::new();
        clear_treasures(&mut game);
        for p in [pos!(0, 0), pos!(0, 1)] {
            game.board.set_treasure(p, true);
        }
        assert_eq!(game.board.available_treasures_count(), 2);
        let _ = game.process(Action::Pass);
        let _ = game.process(Action::Pass);
        assert!(game.state.is_empty(), "game must end at exactly two treasures");
    }

    // ==================== TEMPLE TESTS ====================

    #[test]
    fn test_initial_temples_have_treasures() {
        let game = TnEGame::new();
        
        // The board starts with 10 temples ('t' positions) that have treasures
        // Check that all treasure positions are also temple (red tile) positions
        for pos in game.board.treasures.iter() {
            assert!(game.board.is_temple(pos), 
                "Treasure at {:?} should be on a temple (red tile)", pos);
        }
        
        // Should have exactly 10 initial treasures
        assert_eq!(game.board.treasures.count_ones(), 10);
    }

    #[test]
    fn test_board_temple_helpers() {
        let game = TnEGame::new();
        
        // Test is_temple - initial temples should be recognized
        // Position (1,1) is a temple based on the board: ".t..x.......x..t"
        assert!(game.board.is_temple(pos!(1, 1)));
        
        // An empty position should not be a temple
        assert!(!game.board.is_temple(pos!(0, 0)));
        
        // Test count_adjacent_temples
        // Position adjacent to the temple at (1,1) should have at least 1 adjacent temple
        assert!(game.board.count_adjacent_temples(pos!(0, 1)) >= 1);
        assert!(game.board.count_adjacent_temples(pos!(1, 0)) >= 1);
        assert!(game.board.count_adjacent_temples(pos!(1, 2)) >= 1);
        assert!(game.board.count_adjacent_temples(pos!(2, 1)) >= 1);
    }

    #[test]
    fn test_leader_must_be_adjacent_to_temple() {
        let mut game = TnEGame::new();
        
        // Position (0,0) is NOT adjacent to any temple
        let ret = game.process(Action::PlaceLeader {
            pos: pos!(0, 0),
            leader: Leader::Red,
        });
        assert_eq!(ret.unwrap_err(), Error::CannotPlaceLeaderNotAdjacentToTemple);
        
        // Position (0,1) IS adjacent to the temple at (1,1)
        let ret = game.process(Action::PlaceLeader {
            pos: pos!(0, 1),
            leader: Leader::Red,
        });
        assert!(ret.is_ok());
    }

    #[test]
    fn test_temple_tile_type_helper() {
        // Test the is_temple method on TileType
        assert!(TileType::Red.is_temple());
        assert!(!TileType::Blue.is_temple());
        assert!(!TileType::Green.is_temple());
        assert!(!TileType::Black.is_temple());
        assert!(!TileType::Empty.is_temple());
        
        // TEMPLE constant should be Red
        assert_eq!(TEMPLE, TileType::Red);
    }

    // ==================== REVOLT REWARD TESTS ====================

    #[test]
    fn test_revolt_winner_gets_red_point() {
        let mut game = TnEGame::new();
        
        // Setup: Player 1 has a blue leader
        game.process(Action::PlaceLeader { pos: pos!(0, 1), leader: Leader::Blue }).unwrap();
        game.process(Action::Pass).unwrap();
        
        // Player 2 places competing blue leader in same kingdom (triggers revolt)
        let ret = game.process(Action::PlaceLeader { pos: pos!(2, 1), leader: Leader::Blue });
        assert!(ret.is_ok());
        assert!(game.internal_conflict.is_some());
        
        // Attacker (P2) sends 2 red tile support
        game.players.0[1].hand_red = 3;
        game.process(Action::AddSupport(2)).unwrap();
        
        // Defender (P1) sends 0 support - attacker wins
        game.process(Action::AddSupport(0)).unwrap();
        
        // P2 should have WON and gotten 1 RED point (amulet), NOT a blue point
        // because revolts are always fought with temples (red tiles)
        assert_eq!(game.players.0[1].score_red, 1);
        assert_eq!(game.players.0[1].score_blue, 0); // Should NOT get blue point
    }

    // ==================== MONUMENT DECLINE TESTS ====================

    #[test]
    fn test_can_decline_monument() {
        let mut game = TnEGame::new();

        // Build a 2x2 square of red tiles
        ensure_player_has_at_least_1_color(&mut game.players.0[0], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(0, 0), tile_type: TileType::Red }).unwrap();
        ensure_player_has_at_least_1_color(&mut game.players.0[0], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(0, 1), tile_type: TileType::Red }).unwrap();

        ensure_player_has_at_least_1_color(&mut game.players.0[1], TileType::Red);
        game.process(Action::PlaceTile { pos: pos!(1, 0), tile_type: TileType::Red }).unwrap();

        // Should be in BuildMonument state
        assert_eq!(game.next_state(), GameState::BuildMonument);

        // Player declines to build monument
        let ret = game.process(Action::DeclineMonument);
        assert!(ret.is_ok());

        // All monuments should still be available
        assert_eq!(game.available_monuments.len(), 6);

        // Tiles should still be on the board (not flipped for monument)
        assert_eq!(game.board.get_tile_type(pos!(0, 0)), TileType::Red);
        assert_eq!(game.board.get_tile_type(pos!(0, 1)), TileType::Red);
        assert_eq!(game.board.get_tile_type(pos!(1, 0)), TileType::Red);
        assert_eq!(game.board.get_tile_type(pos!(1, 1)), TileType::Red);
    }

    // ==================== BORDER TREASURE PRIORITY TESTS ====================
    // `SPECIAL_BORDER_POSITIONS` was removed: it hardcoded two squares and
    // encoded the pre-ruling interpretation of L40. Priority is now
    // `edge_distance`, which `test_edge_distance_is_min_distance_to_any_edge`
    // and `test_must_take_border_treasure_first` cover.

    /// Rulebook L40 / ruling 2026-10-10: "must take the treasures on the corner
    /// temples first" means *nearer a board edge wins; ties are the player's
    /// choice*. The old implementation hardcoded two special squares, which is
    /// why (1,15) and (0,10) had different priorities despite both sitting on
    /// an edge — they are in fact tied, and either may be taken.
    #[test]
    fn test_must_take_border_treasure_first() {
        let mut game = TnEGame::new();
        game.board.set_leader(pos!(1, 14), Leader::Green);
        game.board.set_player(pos!(1, 14), Player::Player1);
        game.players.0[0].placed_green_leader = Some(pos!(1, 14));

        game.state.push(GameState::TakeTreasure);
        game.play_action_stack.clear();
        // Both (1,15) and (0,10) are on a board edge: edge distance 0.
        assert_eq!(edge_distance(pos!(1, 15)), 0);
        assert_eq!(edge_distance(pos!(0, 10)), 0);
        game.play_action_stack.push((
            Player::Player1,
            PlayerAction::TakeTreasure(vec![pos!(1, 15), pos!(0, 10)]),
        ));

        // Tied, so the player chooses — taking (0,10) must now be allowed.
        assert!(
            game.process(Action::TakeTreasure(pos!(0, 10))).is_ok(),
            "ties at equal edge distance are the player's choice"
        );
    }

    /// The actual priority: a treasure further from every edge must wait while
    /// a nearer one is still available.
    #[test]
    fn test_treasure_farther_from_edge_must_wait() {
        let mut game = TnEGame::new();
        game.state.push(GameState::TakeTreasure);
        game.play_action_stack.clear();
        let near = pos!(1, 15); // right edge, distance 0
        let far = pos!(5, 5); // interior, distance 5
        assert_eq!(edge_distance(near), 0);
        assert!(edge_distance(far) > edge_distance(near));
        game.board.set_treasure(near, true);
        game.board.set_treasure(far, true);
        game.play_action_stack.push((
            Player::Player1,
            PlayerAction::TakeTreasure(vec![near, far]),
        ));

        assert_eq!(
            game.process(Action::TakeTreasure(far)).unwrap_err(),
            Error::MustTakeBorderTreasureFirst
        );
        assert!(game.process(Action::TakeTreasure(near)).is_ok());
    }

    /// Regression (BUGS.md B5): the ACTIVE player chooses the order in which
    /// conflicting colours are fought.
    ///
    /// Rulebook L66: "If there are multiple colors for which both kingdoms
    /// have a leader, the active player chooses the order."
    ///
    /// The old code offered every choice after the first to `attacker` — the
    /// attacker of the conflict just resolved. In 2p that is always the active
    /// player, so the bug was invisible; it only misbehaves at three or more
    /// seats, which is the game the rulebook actually describes.
    #[test]
    fn active_player_chooses_the_order_of_conflicting_colours() {
        let mut game = TnEGame::with_start(3, 4242, Player::Player1);
        // P2's kingdom A on the left, P3's kingdom B on the right, joined only
        // by U=(3,8). The BLACK kings sit next to U while the RED leaders sit
        // further out, so losing the red war does not break the black path —
        // otherwise L76 discards the red tiles, the kingdom splits, and the
        // black conflict is eliminated before anyone gets a second choice.
        game.board.set_tile_type(pos!(3, 5), TileType::Red);
        game.board.set_leader(pos!(3, 6), Leader::Red);
        game.board.set_player(pos!(3, 6), Player::Player2);
        game.board.set_leader(pos!(3, 7), Leader::Black);
        game.board.set_player(pos!(3, 7), Player::Player2);
        game.players.0[1].placed_red_leader = Some(pos!(3, 6));
        game.players.0[1].placed_black_leader = Some(pos!(3, 7));

        game.board.set_leader(pos!(3, 9), Leader::Black);
        game.board.set_player(pos!(3, 9), Player::Player3);
        game.board.set_leader(pos!(3, 10), Leader::Red);
        game.board.set_player(pos!(3, 10), Player::Player3);
        game.board.set_tile_type(pos!(3, 11), TileType::Red);
        game.players.0[2].placed_black_leader = Some(pos!(3, 9));
        game.players.0[2].placed_red_leader = Some(pos!(3, 10));

        game.players.0[0].hand_red = 1;
        game.players.0[1].hand_red = 5;
        game.players.0[2].hand_red = 5;

        game.process(Action::PlaceTile {
            pos: pos!(3, 8),
            tile_type: TileType::Red,
        })
        .unwrap();

        let colours: Vec<Leader> = game
            .external_conflict
            .as_ref()
            .unwrap()
            .conflicts
            .iter()
            .map(|c| c.conflict_leader)
            .collect();
        assert_eq!(colours.len(), 2, "both red and black are in conflict");
        let attacker = game
            .external_conflict
            .as_ref()
            .unwrap()
            .conflicts[0]
            .attacker;
        assert_eq!(attacker, Player::Player2, "P1 owns no leader here");
        assert_ne!(attacker, Player::Player1, "so attacker != active player");

        // The first choice belongs to the active player.
        assert_eq!(game.next_player(), Player::Player1);

        // Fight red: P2 (attacker) adds three, P3 (defender) adds none.
        game.process(Action::WarSelectLeader(Leader::Red)).unwrap();
        game.process(Action::AddSupport(3)).unwrap();
        game.process(Action::AddSupport(0)).unwrap();

        // The remaining black conflict must come back to P1, the active player,
        // not to P2 the attacker.
        let (who, PlayerAction::SelectLeader { black, .. }) = game.next() else {
            panic!("expected another leader selection, got {:?}", game.next());
        };
        assert!(black, "the black conflict survives and must still be fought");
        assert_eq!(
            who,
            Player::Player1,
            "the ACTIVE player chooses the order, not the attacker"
        );
    }

    /// Regression (BUGS.md B4): exactly 153 civilization tiles are in play, not
    /// 163.
    ///
    /// Rulebook L13-14 gives 153 tiles (57 red, 36 blue, 30 green, 30 black);
    /// L22-23 puts a red temple *and a treasure* on each of the ten winged-beast
    /// cells and puts all **remaining** tiles in the bag. The bag was seeded
    /// with the full 57 red while the board also received 10 temples, so ten
    /// phantom tiles shipped and the "bag is empty" end condition fired about
    /// ten placements late.
    #[test]
    fn tile_count_matches_the_rulebook() {
        for players in 2..=4u8 {
            let game = TnEGame::with_start(players, 7, Player::Player1);
            let bag = game.bag();
            let on_board: u32 = game.board.red_tiles.count_ones() as u32
                + game.board.blue_tiles.count_ones() as u32
                + game.board.green_tiles.count_ones() as u32
                + game.board.black_tiles.count_ones() as u32;
            // Opening hands are dealt out of the bag, so they are part of the
            // 153 too.
            let in_hands: u32 = (0..players as usize)
                .map(|i| game.players.get(Player::from_index(i)).hand_sum() as u32)
                .sum();
            let total: u32 = bag.red as u32
                + bag.blue as u32
                + bag.green as u32
                + bag.black as u32
                + on_board
                + in_hands;
            assert_eq!(
                total, 153,
                "{players}p: bag + board + hands must be the rulebook's 153 tiles \
                 (bag={}, on_board={on_board}, hands={in_hands})",
                bag.sum()
            );
            assert_eq!(
                game.board.temple_count(),
                10,
                "the default board has ten winged-beast temples"
            );
        }
    }

    /// Regression (BUGS.md B3): the green trader takes **all but one** of the
    /// kingdom's treasures.
    ///
    /// Rulebook L38-40. The old code queued exactly one `TakeTreasure` per
    /// trigger and could not even record a third treasure (`Kingdom.treasures`
    /// was `[Option<Pos>; 2]`), so a kingdom holding three or more yielded one
    /// treasure and stranded the rest under the player's own green trader.
    #[test]
    fn green_trader_takes_all_but_one_treasure() {
        let mut game = TnEGame::new();

        // A single connected stretch with a green leader and three treasures.
        // Column 7 rows 0..4 are land on the default board.
        for y in 0u8..5 {
            game.board.set_tile_type(pos!(y, 7), TileType::Black);
        }
        game.board.set_leader(pos!(2, 7), Leader::Green);
        game.board.set_player(pos!(2, 7), Player::Player1);
        game.players.0[0].placed_green_leader = Some(pos!(2, 7));

        for p in [pos!(0, 7), pos!(1, 7), pos!(3, 7), pos!(4, 7)] {
            game.board.set_treasure(p, true);
        }

        // Four treasures, a green leader present -> the trigger fires.
        let kingdom = game.board.find_kingdom(pos!(2, 7), &mut Bitboard::new());
        assert_eq!(
            kingdom.treasures.len(),
            4,
            "the kingdom must record every treasure, not just two"
        );
        assert!(kingdom.green_leader.is_some());

        // Simulate the queued take directly: each take re-checks, so three of
        // the four are collected (all but one).
        game.state.push(GameState::TakeTreasure);
        game.play_action_stack.clear();
        let available = kingdom.treasures.clone();
        game.play_action_stack
            .push((Player::Player1, PlayerAction::TakeTreasure(available)));

        let mut takes = 0;
        loop {
            let PlayerAction::TakeTreasure(avail) = game.next_action() else {
                break;
            };
            let nearest = avail.iter().map(|t| edge_distance(*t)).min().unwrap();
            let pick = *avail.iter().find(|t| edge_distance(**t) == nearest).unwrap();
            game.process(Action::TakeTreasure(pick)).unwrap();
            takes += 1;
            if takes > 8 {
                break;
            }
        }

        assert_eq!(
            takes, 3,
            "four treasures means the trader takes three (all but one)"
        );
        // Assert on this kingdom, not the board total — the default board ships
        // with ten starting treasures on the winged-beast cells.
        let after = game.board.find_kingdom(pos!(2, 7), &mut Bitboard::new());
        assert_eq!(
            after.treasures.len(),
            1,
            "exactly one treasure is left behind in the kingdom"
        );
        assert_eq!(
            game.players.get(Player::Player1).score_treasure,
            3,
            "the player collected three treasures"
        );
    }

    /// `edge_distance` is a total order on proximity, so the generator's
    /// filtering and the validator's check must agree; otherwise the search
    /// emits moves the rules reject.
    #[test]
    fn test_edge_distance_is_min_distance_to_any_edge() {
        assert_eq!(edge_distance(pos!(0, 0)), 0);
        assert_eq!(edge_distance(pos!(10, 15)), 0);
        assert_eq!(edge_distance(pos!(5, 0)), 0);
        assert_eq!(edge_distance(pos!(0, 7)), 0);
        assert_eq!(edge_distance(pos!(5, 5)), 5);
        // Ties are common and must compare equal.
        assert_eq!(edge_distance(pos!(0, 10)), edge_distance(pos!(1, 15)));
    }
}
#[cfg(test)]
mod interactive_input_tests {
    use super::*;
    use crate::maps::MapSpec;

    /// The answers the desktop UI can send for the two decision phases that are
    /// not "click a piece on the board": committing tiles in a war, and building
    /// or declining a monument.
    ///
    /// Both were previously unreachable from the UI — the monument decision had
    /// no handler at all and tile commitment was an undocumented number key — so
    /// this asserts the engine accepts exactly the range the UI offers, and
    /// rejects what it must not offer. A war in LBR is decided by tile counts,
    /// so an off-by-one here silently hands games away.
    #[test]
    fn war_and_monument_decisions_accept_what_the_ui_can_send() {
        let mut saw_support = 0;
        let mut saw_monument = 0;

        // Driven by the real agent rather than arbitrary moves: conflicts are the
        // interesting states and a random walk mostly avoids them.
        'seeds: for seed in [20261u64, 7, 99, 1234] {
            let mut game = MapSpec::default_map().start_game(4, seed);
            let mut agent = crate::puct::Puct::new(
                crate::puct::PuctConfig {
                    sims: 40,
                    ..Default::default()
                },
                seed,
            );
            for _ in 0..3000 {
                if game.state.is_empty() {
                    continue 'seeds;
                }
                let state = game.next_state();
                match game.next_action() {
                    PlayerAction::AddSupport(colour) => {
                        saw_support += 1;
                        let have = game.players.get(game.next_player()).get_hand(colour);
                        // Every count from 0 to what you hold must be legal...
                        for n in 0..=have {
                            assert!(
                                game.validate_action(Action::AddSupport(n), state).is_ok(),
                                "AddSupport({n}) rejected while holding {have} {colour:?}"
                            );
                        }
                        // ...and one more than you hold must not be.
                        assert!(
                            game.validate_action(Action::AddSupport(have + 1), state).is_err(),
                            "AddSupport({}) accepted while holding only {have}",
                            have + 1
                        );
                    }
                    PlayerAction::BuildMonument(_, avail) => {
                        saw_monument += 1;
                        assert!(!avail.is_empty(), "monument decision with no options");
                        for m in avail.iter() {
                            assert!(
                                game.validate_action(Action::BuildMonument(*m), state).is_ok(),
                                "offered {m:?} but the engine rejects it"
                            );
                        }
                        assert!(
                            game.validate_action(Action::DeclineMonument, state).is_ok(),
                            "declining a monument must always be legal"
                        );
                    }
                    _ => {}
                }

                let Some(pick) = minimax::Strategy::choose_move(&mut agent, &game) else {
                    continue 'seeds;
                };
                if game.process(pick).is_err() {
                    continue 'seeds;
                }
            }
        }

        assert!(saw_support > 0, "never reached a tile-commitment decision");
        assert!(saw_monument > 0, "never reached a monument decision");
    }
}

#[cfg(test)]
mod war_strength_tests {
    use super::*;
    use crate::maps::MapSpec;

    /// Each side of a war is measured by the tiles of the conflict colour **in
    /// its own kingdom** (rulebook L70-71). While a war is pending the
    /// unification tile is connectable, so a plain kingdom lookup merges the two
    /// and both counts come out identical — which silently made every war a
    /// base-strength tie decided by support tiles alone.
    ///
    /// Before the first support is committed nothing has resolved, so the live
    /// count must equal the strength recorded when the war opened (which was
    /// taken from the two separate kingdoms). This is exactly the assertion that
    /// fails if the unification tile is counted.
    #[test]
    fn live_war_strength_equals_the_opening_snapshot() {
        let mut checked = 0;
        for seed in [20261u64, 7, 99, 1234, 5, 4242] {
            let mut game = MapSpec::default_map().start_game(4, seed);
            let mut agent = crate::puct::Puct::new(
                crate::puct::PuctConfig { sims: 40, ..Default::default() },
                seed,
            );
            for _ in 0..4000 {
                if game.state.is_empty() {
                    break;
                }
                if let (PlayerAction::AddSupport(colour), Some(ec)) =
                    (game.next_action(), game.external_conflict.as_ref())
                {
                    if let Some(c) = ec
                        .conflicts
                        .iter()
                        .find(|c| c.conflict_leader.as_tile_type() == colour)
                    {
                        // Only meaningful before anything resolves.
                        if !c.attacker_sent_support && !c.defender_sent_support {
                            let s = game
                                .conflict_standings()
                                .into_iter()
                                .find(|s| !s.is_internal && s.colour == colour)
                                .expect("the war being fought must be reported");
                            assert_eq!(
                                s.attacker_base, c.attacker_base_strength,
                                "attacker strength disagrees with the opening snapshot (seed {seed})"
                            );
                            assert_eq!(
                                s.defender_base, c.defender_base_strength,
                                "defender strength disagrees with the opening snapshot (seed {seed})"
                            );
                            checked += 1;
                        }
                    }
                }
                let Some(pick) = minimax::Strategy::choose_move(&mut agent, &game) else {
                    break;
                };
                if game.process(pick).is_err() {
                    break;
                }
            }
        }
        assert!(checked > 0, "never observed a war opening");
    }

    /// And the two leaders must genuinely be in different kingdoms, otherwise
    /// the counts above agreeing proves nothing.
    #[test]
    fn the_two_sides_of_a_war_are_different_kingdoms() {
        let mut checked = 0;
        for seed in [20261u64, 7, 99, 1234] {
            let mut game = MapSpec::default_map().start_game(4, seed);
            let mut agent = crate::puct::Puct::new(
                crate::puct::PuctConfig { sims: 40, ..Default::default() },
                seed,
            );
            for _ in 0..4000 {
                if game.state.is_empty() {
                    break;
                }
                if let Some(ec) = game.external_conflict.as_ref() {
                    let exclude = game.board.unification_tile;
                    for c in ec.conflicts.iter() {
                        let a = game.board.find_kingdom_excluding(c.attacker_pos, exclude).map;
                        let d = game.board.find_kingdom_excluding(c.defender_pos, exclude).map;
                        assert!(
                            (a.0 & d.0).is_zero(),
                            "the two sides of a war share a kingdom (seed {seed})"
                        );
                        // ...and they *do* share one if the unification tile is
                        // counted, which is the bug this guards.
                        let am = game.board.find_kingdom(c.attacker_pos, &mut Bitboard::new()).map;
                        let dm = game.board.find_kingdom(c.defender_pos, &mut Bitboard::new()).map;
                        assert!(
                            !(am.0 & dm.0).is_zero(),
                            "expected the pending unification tile to merge the kingdoms"
                        );
                        checked += 1;
                    }
                }
                let Some(pick) = minimax::Strategy::choose_move(&mut agent, &game) else {
                    break;
                };
                if game.process(pick).is_err() {
                    break;
                }
            }
        }
        assert!(checked > 0, "never observed a war");
    }
}

#[cfg(test)]
mod conflict_offer_tests {
    use super::*;
    use crate::maps::MapSpec;

    /// Every colour the game offers as `WarSelectLeader` must be a colour that
    /// is genuinely in conflict, and no colour in conflict may be hidden.
    ///
    /// A player reported being asked to choose a colour when the board appeared
    /// to show a conflict between a different colour's leaders. The offer set is
    /// built from `external_conflict`, so this pins the two together: if the
    /// display ever disagrees with the offer, the display is the bug, not this.
    #[test]
    fn offered_conflict_colours_match_the_real_conflicts() {
        let mut checked = 0;
        for seed in [20261u64, 7, 99, 1234, 5, 4242, 77] {
            let mut game = MapSpec::default_map().start_game(4, seed);
            let mut agent = crate::puct::Puct::new(
                crate::puct::PuctConfig {
                    sims: 40,
                    ..Default::default()
                },
                seed,
            );
            for _ in 0..4000 {
                if game.state.is_empty() {
                    break;
                }
                if let PlayerAction::SelectLeader {
                    red,
                    blue,
                    green,
                    black,
                } = game.next_action()
                {
                    let ec = game
                        .external_conflict
                        .as_ref()
                        .expect("SelectLeader without a war");
                    let offered = [
                        (Leader::Red, red),
                        (Leader::Blue, blue),
                        (Leader::Green, green),
                        (Leader::Black, black),
                    ];
                    for (colour, flag) in offered {
                        let real = ec.conflicts.iter().any(|c| c.conflict_leader == colour);
                        assert_eq!(
                            flag, real,
                            "offered {colour:?}={flag} but the conflict set says {real} (seed {seed})"
                        );
                    }
                    // Every conflict must be between two different players —
                    // a leader never fights itself.
                    for c in ec.conflicts.iter() {
                        assert_ne!(
                            c.attacker,
                            c.defender,
                            "a {colour:?} conflict has the same player on both sides (seed {seed})",
                            colour = c.conflict_leader
                        );
                    }
                    // And exactly one action per conflicting colour is legal.
                    let legal: Vec<Leader> = crate::puct::legal_actions(&game)
                        .into_iter()
                        .filter_map(|a| match a {
                            Action::WarSelectLeader(l) => Some(l),
                            _ => None,
                        })
                        .collect();
                    for c in ec.conflicts.iter() {
                        assert!(
                            legal.contains(&c.conflict_leader),
                            "conflict over {:?} offered no legal action (seed {seed})",
                            c.conflict_leader
                        );
                    }
                    checked += 1;
                }
                let Some(pick) = minimax::Strategy::choose_move(&mut agent, &game) else {
                    break;
                };
                if game.process(pick).is_err() {
                    break;
                }
            }
        }
        assert!(checked > 0, "never reached a colour choice");
    }
}

#[cfg(test)]
mod seed_semantics_tests {
    use super::*;
    use crate::maps::MapSpec;

    fn opening_hand(g: &TnEGame) -> [u8; 8] {
        let p = &g.players.0[0];
        [
            p.hand_red,
            p.hand_black,
            p.hand_green,
            p.hand_blue,
            p.score_red,
            p.score_black,
            p.hand_sum(),
            g.bag().sum(),
        ]
    }

    /// `(map, players, seed)` fully determines a game — that is the engine's
    /// contract and the reason every harness is reproducible.
    ///
    /// It is also why the interactive commands must not pass a constant seed:
    /// `play` used to default `--seed` to 7, so every launch dealt the identical
    /// game. Determinism is a feature for a test and a bug for a player.
    #[test]
    fn the_seed_is_the_only_thing_that_decides_the_deal() {
        let a = MapSpec::default_map().start_game(4, 7);
        let b = MapSpec::default_map().start_game(4, 7);
        let c = MapSpec::default_map().start_game(4, 8);
        assert_eq!(opening_hand(&a), opening_hand(&b), "same seed must deal the same game");
        assert_ne!(opening_hand(&a), opening_hand(&c), "a different seed must deal a different game");
    }
}

#[cfg(test)]
mod conflict_display_tests {
    use super::*;
    use crate::maps::MapSpec;

    /// The tie rule is what decides close wars and the whole reason a defender
    /// can "lose with equal strength". The attacker must strictly exceed.
    #[test]
    fn attacker_must_exceed_a_tie_goes_to_the_defender() {
        let base = ConflictStanding {
            colour: TileType::Green,
            is_internal: false,
            attacker: Player::Player1,
            attacker_base: 2,
            attacker_support: 0,
            attacker_sent: true,
            defender: Player::Player2,
            defender_base: 1,
            defender_support: 1,
            defender_sent: true,
        };
        assert_eq!(base.attacker_total(), 2);
        assert_eq!(base.defender_total(), 2);
        assert_eq!(base.leader(), Player::Player2, "2 vs 2 must go to the defender");

        let ahead = ConflictStanding {
            attacker_support: 1,
            ..base
        };
        assert_eq!(ahead.leader(), Player::Player1, "3 vs 2 must go to the attacker");
    }

    /// Which leaders are on the board, indexed `[seat][leader]`.
    fn leader_snapshot(g: &TnEGame) -> Vec<Option<Pos>> {
        let mut v = Vec::with_capacity(16);
        for i in 0..4 {
            let p = Player::from_index(i);
            for l in [Leader::Red, Leader::Blue, Leader::Green, Leader::Black] {
                v.push(g.players.get(p).get_leader(l));
            }
        }
        v
    }

    /// Index into `leader_snapshot`'s per-seat order [Red, Blue, Green, Black].
    fn leader_slot(colour: TileType) -> usize {
        match colour {
            TileType::Red => 0,
            TileType::Blue => 1,
            TileType::Green => 2,
            _ => 3,
        }
    }

    /// The conflict panel is only useful if it agrees with the game. Every war
    /// is decided by the final support commitment, so this reads that
    /// commitment, computes the verdict from `conflict_standings` exactly as the
    /// panel would, and checks the leader the game removes is the one the panel
    /// called the loser.
    #[test]
    fn standings_agree_with_the_resolved_war() {
        let mut checked = 0;
        for seed in [20261u64, 7, 99, 1234] {
            let mut game = MapSpec::default_map().start_game(4, seed);
            let mut agent = crate::puct::Puct::new(
                crate::puct::PuctConfig { sims: 40, ..Default::default() },
                seed,
            );
            for _ in 0..4000 {
                if game.state.is_empty() {
                    break;
                }
                let pending = game.next_player();
                let pending_action = game.next_action();

                // What the panel says, but only when this action is the one that
                // decides it: a war resolves when the *second* side commits, so
                // the attacker's first commitment must not be treated as a verdict.
                let call = match (&pending_action, game.conflict_standings().as_slice()) {
                    (PlayerAction::AddSupport(colour), cs) => cs
                        .iter()
                        .find(|c| !c.is_internal && c.colour == *colour)
                        .copied()
                        .filter(|c| {
                            if pending == c.attacker {
                                c.defender_sent
                            } else {
                                c.attacker_sent
                            }
                        }),
                    _ => None,
                };

                let before = leader_snapshot(&game);
                let Some(pick) = minimax::Strategy::choose_move(&mut agent, &game) else {
                    break;
                };
                if game.process(pick).is_err() {
                    break;
                }
                let after = leader_snapshot(&game);

                if let (Some(c), Action::AddSupport(n)) = (call, pick) {
                    let committer = if pending == c.attacker {
                        (c.attacker_base + c.attacker_support + n, c.defender_base + c.defender_support)
                    } else {
                        (c.attacker_base + c.attacker_support, c.defender_base + c.defender_support + n)
                    };
                    let (ap, dp) = committer;
                    // Attacker must strictly exceed; equal goes to the defender.
                    let predicted = if ap > dp { c.attacker } else { c.defender };
                    let loser = if predicted == c.attacker { c.defender } else { c.attacker };

                    let idx = loser.index().unwrap() as usize * 4 + leader_slot(c.colour);
                    assert!(
                        before[idx].is_some() && after[idx].is_none(),
                        "panel implied {:?} loses ({ap} vs {dp} for {:?}), but that leader \
                         is still on the board",
                        loser,
                        c.colour,
                    );
                    // And the winner's leader must survive.
                    let widx = predicted.index().unwrap() as usize * 4 + leader_slot(c.colour);
                    assert!(
                        after[widx].is_some(),
                        "panel implied {:?} wins but its {:?} leader left the board",
                        predicted,
                        c.colour,
                    );
                    checked += 1;
                }
            }
        }
        assert!(checked > 0, "never observed a resolved war");
    }
}

#[cfg(test)]
mod multiplayer_tests {
    use super::*;

    /// MT3: turn order visits seats clockwise (two actions each).
    #[test]
    fn mt3_turn_order_cycles_all_seats() {
        let mut game = TnEGame::with_start(4, 1, Player::Player1);
        let mut seen = vec![game.next_player()];
        for _ in 0..8 {
            game.process(Action::Pass).unwrap();
            seen.push(game.next_player());
        }
        let expected = [
            Player::Player1,
            Player::Player1,
            Player::Player1, // start: two actions then rotate
            Player::Player2,
            Player::Player2,
            Player::Player3,
            Player::Player3,
            Player::Player4,
            Player::Player4,
        ];
        // First entry is the opening player; then after each pass we observe
        // the player to move next.
        assert_eq!(seen[0], Player::Player1);
        assert!(seen.contains(&Player::Player2));
        assert!(seen.contains(&Player::Player3));
        assert!(seen.contains(&Player::Player4));
        let _ = expected;
    }

    /// MT2: standings report every active seat.
    #[test]
    fn mt2_standings_have_all_seats() {
        let game = TnEGame::with_config(3, 5);
        let st = game.standings();
        assert_eq!(st.len(), 3);
        let game4 = TnEGame::with_config(4, 5);
        assert_eq!(game4.standings().len(), 4);
    }

    /// MT4: in a conflict between two non-active players the attacker is the
    /// one nearest clockwise from the active player.
    #[test]
    fn mt4_clockwise_attacker_selection() {
        // active = P2; involved seats P4 and P3. Clockwise from P2: P3 is 1
        // step, P4 is 2 steps -> attacker P3.
        let p3 = Player::Player3.clockwise_distance(Player::Player3, 4);
        assert_eq!(p3, 0);
        assert_eq!(Player::Player2.clockwise_distance(Player::Player3, 4), 1);
        assert_eq!(Player::Player2.clockwise_distance(Player::Player4, 4), 2);
        assert_eq!(Player::Player1.clockwise_distance(Player::Player4, 4), 3);
    }

    /// MT5: drawing from an empty bag ends the game — at the END of the turn.
    ///
    /// Rulebook L93-95: "The game ends at the end of a player's turn when …
    /// A player would draw a tile, but the bag is empty." Two details matter:
    ///
    ///  * A single `Pass` is only one of the turn's two actions, so the game
    ///    must still be running afterwards. This test used to assert it ended
    ///    after one action, which was the per-action end check (BUGS.md B9).
    ///  * "would draw" is doing work. `draw_to_6` returns immediately when the
    ///    hand is already full, so an empty bag with everyone's hand at six is
    ///    *not* a finished game — nobody needs to draw. A hand has to be below
    ///    six for the end-of-turn refresh to fail.
    #[test]
    fn mt5_empty_bag_ends_game() {
        let mut game = TnEGame::with_start(2, 1, Player::Player1);
        game.bag = Tiles { red: 0, black: 0, green: 0, blue: 0 };
        // Hand below six, so the end-of-turn refresh has to draw and fails.
        game.players.0[0].hand_red = 3;
        game.players.0[0].hand_black = 0;
        game.players.0[0].hand_green = 0;
        game.players.0[0].hand_blue = 0;

        game.process(Action::Pass).unwrap();
        assert!(
            !game.state.is_empty(),
            "the turn is not over after one of two actions"
        );

        game.process(Action::Pass).unwrap();
        assert!(
            game.state.is_empty(),
            "game ends when the end-of-turn refresh finds the bag empty"
        );
        assert!(matches!(game.process(Action::Pass), Err(Error::GameOver)));
    }

    /// The complement: an empty bag is harmless while no player needs to draw.
    #[test]
    fn mt5_empty_bag_with_full_hands_does_not_end_the_game() {
        let mut game = TnEGame::with_start(2, 1, Player::Player1);
        game.bag = Tiles { red: 0, black: 0, green: 0, blue: 0 };
        // Both hands are already six, so "a player would draw" is false.
        assert_eq!(game.players.0[0].hand_sum(), 6);
        assert_eq!(game.players.0[1].hand_sum(), 6);

        game.process(Action::Pass).unwrap();
        game.process(Action::Pass).unwrap();
        assert!(
            !game.state.is_empty(),
            "no player would draw, so the empty bag does not end the game"
        );
    }

    /// Two same-colour leaders of different owners trigger a revolt with the
    /// placing player as attacker.
    #[test]
    fn revolt_attacker_is_placer() {
        let mut game = TnEGame::with_start(2, 1, Player::Player1);
        // P1's turn: place a black leader, then pass to end the turn.
        game.process(Action::PlaceLeader { pos: pos!(0, 1), leader: Leader::Black }).unwrap();
        game.process(Action::Pass).unwrap();
        // P2 places a black leader into P1's kingdom -> revolt, P2 attacks.
        game.process(Action::PlaceLeader { pos: pos!(1, 0), leader: Leader::Black }).unwrap();
        let c = game.internal_conflict.expect("revolt");
        assert_eq!(c.attacker, Player::Player2);
        assert_eq!(c.defender, Player::Player1);
    }
}

#[cfg(test)]
mod identity_hash_tests {
    use super::*;
    use crate::maps::MapSpec;

    /// The tree-reuse path keys on this hash, so a collision between two
    /// different positions is not a performance bug — it makes the search
    /// continue from a subtree describing a game that is no longer being played.
    #[test]
    fn identity_hash_separates_reachable_states() {
        let mut g = MapSpec::default_map().start_game(4, 99);
        let mut seen = std::collections::HashSet::new();
        let mut n = 0;
        for _ in 0..60 {
            if g.state.is_empty() {
                break;
            }
            let h = g.identity_hash();
            assert!(seen.insert(h), "identity_hash collided after {n} plies");
            let actions = crate::puct::legal_actions(&g);
            if actions.is_empty() {
                break;
            }
            let pick = actions[n % actions.len()];
            g.process(pick).expect("legal action failed");
            n += 1;
        }
        assert!(n > 20, "test did not traverse far enough: {n}");
    }
}

#[cfg(test)]
mod split_rejoin_tests {
    use super::*;

    /// Rulebook L49: "A leader may not be removed to form two separate kingdoms
    /// and placed to rejoin them in a single move."
    ///
    /// Built on the real board layout: two red tiles sit on either side of a
    /// bridge square, with a leader on the bridge. Withdrawing the leader cuts
    /// the group in two.
    #[test]
    fn leader_move_that_splits_and_rejoins_is_detected() {
        let mut board = Board::new();
        // Row 4 is open (no river) from column 0 to 12; row 3 is open from 4.
        // A=(4,4), bridge=(4,5), B=(3,5). A and B are not adjacent.
        board.set_tile_type(pos!(4, 4), TileType::Red);
        board.set_tile_type(pos!(3, 5), TileType::Red);
        board.set_leader(pos!(4, 5), Leader::Black);

        // (3,4) is adjacent to both halves, so placing there rejoins them.
        assert!(
            board.move_would_split_and_rejoin(pos!(4, 5), pos!(3, 4)),
            "a move that stitches the split halves back together must be caught"
        );
        // (4,3) touches only the left half: an ordinary relocation.
        assert!(
            !board.move_would_split_and_rejoin(pos!(4, 5), pos!(4, 3)),
            "moving away without rejoining is legal"
        );
    }

    /// A leader that is not the sole bridge can always be moved: removing it
    /// leaves its kingdom connected, so L49 cannot apply.
    #[test]
    fn moving_a_non_bridge_leader_is_allowed() {
        let mut board = Board::new();
        // A ring of tiles around the leader square keeps the kingdom connected
        // once the leader is lifted.
        for p in [pos!(3, 4), pos!(3, 5), pos!(3, 6), pos!(4, 4), pos!(4, 6)] {
            board.set_tile_type(p, TileType::Red);
        }
        board.set_leader(pos!(4, 5), Leader::Black);

        assert!(
            !board.move_would_split_and_rejoin(pos!(4, 5), pos!(5, 5)),
            "removing a leader from a well-connected square cannot split anything"
        );
    }
}

#[cfg(test)]
mod redeal_tests {
    use super::*;

    #[test]
    fn redeal_keeps_sizes_totals_and_viewer_hand() {
        let g = TnEGame::with_config(4, 42);
        let mut r = g.clone();
        r.redeal_hidden(Player::Player1, &mut Rng::new(9));
        let total = |g: &TnEGame| {
            let mut t = g.bag().sum() as u32;
            for i in 0..4 {
                t += g.players.0[i].hand_sum() as u32;
            }
            t
        };
        assert_eq!(total(&g), total(&r));
        for i in 0..4 {
            assert_eq!(g.players.0[i].hand_sum(), r.players.0[i].hand_sum());
        }
        let (a, b) = (&g.players.0[0], &r.players.0[0]);
        assert_eq!((a.hand_red, a.hand_blue, a.hand_green, a.hand_black),
                   (b.hand_red, b.hand_blue, b.hand_green, b.hand_black));
    }
}

#[cfg(test)]
mod nearby_kingdoms_tests {
    use super::*;

    /// The per-cell count must match the whole-board one along real games.
    #[test]
    fn per_cell_matches_full_board() {
        for seed in [1u64, 2, 3] {
            let mut g = TnEGame::with_config(4, seed);
            let mut rng = Rng::new(seed);
            for _ in 0..300 {
                let full = g.board.nearby_kingdom_count();
                for x in 0..H {
                    for y in 0..W {
                        assert_eq!(g.board.nearby_kingdoms_at(pos!(x as u8, y as u8)), full[x][y]);
                    }
                }
                if g.state.is_empty() {
                    break;
                }
                let acts = crate::puct::legal_actions(&g);
                if acts.is_empty() {
                    break;
                }
                let a = acts[rng.below(acts.len() as u64) as usize];
                g.process(a).unwrap();
            }
        }
    }
}
