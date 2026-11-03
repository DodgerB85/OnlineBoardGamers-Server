//! Land Between Rivers bridge for the AI seats.
//!
//! The donor engine is the policy: an LBR position is mapped onto `TnEGame`,
//! the shipped `az` agent picks an action, and that action is returned in LBR's
//! own vocabulary. The rules that *apply* the action stay in `LBRrules.js`, run
//! headlessly by the Django worker, so no rule is duplicated here.
//!
//! Cells: LBR index is `row * 16 + col`, which is exactly the donor's `pos(x,y)`
//! index (`x = row`, `y = col`). The board layout is the donor's rulebook layout.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::az::{self, AzAgent, AzConfig, SharedNet};
use crate::game::{
    Bitboard, Board, Conflict, ExternalConflict, GameState, Leader, Monument, MonumentType, MoveHistory,
    Player, PlayerAction, PlayerState, Players, Pos, Rng, TileType, Tiles, TnEGame, RIVER, W,
};
use crate::nn::Net;

const CELLS: usize = 176;

#[derive(Clone, Debug, Deserialize)]
struct LbrLeaderCell {
    s: usize,
    c: String,
}

#[derive(Debug, Deserialize)]
struct LbrMonument {
    t: String,
    at: usize,
}

#[derive(Clone, Copy, Debug, Deserialize)]
struct LbrTiles {
    #[serde(rename = "R")]
    red: u8,
    #[serde(rename = "B")]
    blue: u8,
    #[serde(rename = "G")]
    green: u8,
    #[serde(rename = "K")]
    black: u8,
}

#[derive(Debug, Deserialize)]
struct LbrLeaders {
    #[serde(rename = "R")]
    red: Option<usize>,
    #[serde(rename = "B")]
    blue: Option<usize>,
    #[serde(rename = "G")]
    green: Option<usize>,
    #[serde(rename = "K")]
    black: Option<usize>,
}

#[derive(Debug, Deserialize)]
struct LbrPlayer {
    hand: LbrTiles,
    score: LbrTiles,
    treasures: u8,
    catastrophes: u8,
    leaders: LbrLeaders,
}

#[derive(Debug, Deserialize)]
struct LbrConflict {
    colour: String,
    attacker: usize,
    #[serde(rename = "attackerPos")]
    attacker_pos: usize,
    defender: usize,
    #[serde(rename = "defenderPos")]
    defender_pos: usize,
    #[serde(rename = "attackerSupport")]
    attacker_support: u8,
    #[serde(rename = "defenderSupport")]
    defender_support: u8,
    #[serde(rename = "attackerSent")]
    attacker_sent: bool,
    #[serde(rename = "defenderSent")]
    defender_sent: bool,
}

#[derive(Debug, Deserialize)]
struct LbrWar {
    at: usize,
    #[serde(rename = "placedColour")]
    placed_colour: String,
    conflicts: Vec<LbrConflict>,
}

#[derive(Debug, Deserialize)]
struct LbrRevolt {
    attacker: usize,
    #[serde(rename = "attackerPos")]
    attacker_pos: usize,
    defender: usize,
    #[serde(rename = "defenderPos")]
    defender_pos: usize,
    #[serde(rename = "attackerSupport")]
    attacker_support: u8,
    #[serde(rename = "defenderSupport")]
    defender_support: u8,
    #[serde(rename = "attackerSent")]
    attacker_sent: bool,
    #[serde(rename = "defenderSent")]
    defender_sent: bool,
}

#[derive(Debug, Deserialize)]
struct LbrOffer {
    at: usize,
    types: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct LbrPending {
    kind: String,
    seat: usize,
    #[serde(default)]
    colour: Option<String>,
    #[serde(default, rename = "keepOptions")]
    keep_options: Vec<usize>,
    #[serde(default)]
    offers: Vec<LbrOffer>,
}

#[derive(Debug, Deserialize)]
struct LbrState {
    #[serde(rename = "numSeats")]
    num_seats: usize,
    tiles: Vec<u8>,
    leaders: Vec<Option<LbrLeaderCell>>,
    treasures: Vec<bool>,
    catastrophes: Vec<bool>,
    unification: i64,
    monuments: Vec<LbrMonument>,
    #[serde(rename = "availableMonuments")]
    available_monuments: Vec<String>,
    players: Vec<LbrPlayer>,
    bag: LbrTiles,
    #[serde(rename = "activeSeat")]
    active_seat: usize,
    #[serde(rename = "actionsUsed")]
    actions_used: u32,
    pending: Option<LbrPending>,
    war: Option<LbrWar>,
    revolt: Option<LbrRevolt>,
    #[serde(rename = "gameOver")]
    game_over: bool,
}

fn pos_of(index: usize) -> Result<Pos, String> {
    if index >= CELLS {
        return Err(format!("cell {index} is off the board"));
    }
    Ok(Pos {
        x: (index / W) as u8,
        y: (index % W) as u8,
    })
}

fn index_of(pos: Pos) -> usize {
    pos.x as usize * W + pos.y as usize
}

fn player_of(seat: usize) -> Result<Player, String> {
    let player = Player::from_index(seat);
    if player == Player::None {
        return Err(format!("seat {seat} is not a player"));
    }
    Ok(player)
}

fn colour_tile(letter: &str) -> Result<TileType, String> {
    match letter {
        "R" => Ok(TileType::Red),
        "B" => Ok(TileType::Blue),
        "G" => Ok(TileType::Green),
        "K" => Ok(TileType::Black),
        other => Err(format!("unknown colour {other}")),
    }
}

fn colour_leader(letter: &str) -> Result<Leader, String> {
    match letter {
        "R" => Ok(Leader::Red),
        "B" => Ok(Leader::Blue),
        "G" => Ok(Leader::Green),
        "K" => Ok(Leader::Black),
        other => Err(format!("unknown colour {other}")),
    }
}

fn tile_letter(tile: TileType) -> Result<&'static str, String> {
    match tile {
        TileType::Red => Ok("R"),
        TileType::Blue => Ok("B"),
        TileType::Green => Ok("G"),
        TileType::Black => Ok("K"),
        TileType::Empty => Err("empty tile has no colour".into()),
    }
}

fn leader_letter(leader: Leader) -> Result<&'static str, String> {
    match leader {
        Leader::Red => Ok("R"),
        Leader::Blue => Ok("B"),
        Leader::Green => Ok("G"),
        Leader::Black => Ok("K"),
        Leader::None => Err("no leader has no colour".into()),
    }
}

fn monument_type(code: &str) -> Result<MonumentType, String> {
    match code {
        "RG" => Ok(MonumentType::RedGreen),
        "RB" => Ok(MonumentType::RedBlue),
        "GB" => Ok(MonumentType::GreenBlue),
        "KR" => Ok(MonumentType::BlackRed),
        "KG" => Ok(MonumentType::BlackGreen),
        "KB" => Ok(MonumentType::BlackBlue),
        other => Err(format!("unknown monument {other}")),
    }
}

fn monument_code(monument: MonumentType) -> &'static str {
    match monument {
        MonumentType::RedGreen => "RG",
        MonumentType::RedBlue => "RB",
        MonumentType::GreenBlue => "GB",
        MonumentType::BlackRed => "KR",
        MonumentType::BlackGreen => "KG",
        MonumentType::BlackBlue => "KB",
    }
}

fn count_in_kingdom(board: &Board, at: Pos, colour: TileType, unification: Option<Pos>) -> u8 {
    let kingdom = board.find_kingdom_excluding(at, unification);
    let tiles = match colour {
        TileType::Red => board.red_tiles,
        TileType::Blue => board.blue_tiles,
        TileType::Green => board.green_tiles,
        TileType::Black => board.black_tiles,
        TileType::Empty => Bitboard::new(),
    };
    (kingdom.map & tiles).count_ones()
}

fn adjacent_temples(board: &Board, at: Pos) -> u8 {
    (at.neighbors() & board.red_tiles).count_ones()
}

fn conflict(
    c: &LbrConflict,
    internal: bool,
    board: &Board,
    unification: Option<Pos>,
) -> Result<Conflict, String> {
    let colour = colour_tile(&c.colour)?;
    let (attacker_base, defender_base) = if internal {
        (adjacent_temples(board, pos_of(c.attacker_pos)?), adjacent_temples(board, pos_of(c.defender_pos)?))
    } else {
        (
            count_in_kingdom(board, pos_of(c.attacker_pos)?, colour, unification),
            count_in_kingdom(board, pos_of(c.defender_pos)?, colour, unification),
        )
    };
    Ok(Conflict {
        is_internal: internal,
        conflict_leader: colour_leader(&c.colour)?,
        attacker: player_of(c.attacker)?,
        attacker_pos: pos_of(c.attacker_pos)?,
        attacker_support: c.attacker_support,
        attacker_sent_support: c.attacker_sent,
        attacker_base_strength: attacker_base,
        defender: player_of(c.defender)?,
        defender_pos: pos_of(c.defender_pos)?,
        defender_support: c.defender_support,
        defender_sent_support: c.defender_sent,
        defender_base_strength: defender_base,
    })
}

fn revolt_conflict(r: &LbrRevolt, board: &Board) -> Result<Conflict, String> {
    let attacker_pos = pos_of(r.attacker_pos)?;
    let defender_pos = pos_of(r.defender_pos)?;
    Ok(Conflict {
        is_internal: true,
        conflict_leader: Leader::Red,
        attacker: player_of(r.attacker)?,
        attacker_pos,
        attacker_support: r.attacker_support,
        attacker_sent_support: r.attacker_sent,
        attacker_base_strength: adjacent_temples(board, attacker_pos),
        defender: player_of(r.defender)?,
        defender_pos,
        defender_support: r.defender_support,
        defender_sent_support: r.defender_sent,
        defender_base_strength: adjacent_temples(board, defender_pos),
    })
}

fn lbr_board(state: &LbrState) -> Result<Board, String> {
    let mut board = Board::from_bits(RIVER.clone(), Bitboard::new());

    for index in 0..CELLS {
        let pos = pos_of(index)?;
        if state.treasures.get(index).copied().unwrap_or(false) {
            board.set_treasure(pos, true);
        }
        match state.tiles.get(index).copied().unwrap_or(0) {
            0 => {}
            1 => board.set_tile_type(pos, TileType::Red),
            2 => board.set_tile_type(pos, TileType::Blue),
            3 => board.set_tile_type(pos, TileType::Green),
            4 => board.set_tile_type(pos, TileType::Black),
            5 => {} // facedown monument cell; the monument bitboard is set below
            other => return Err(format!("bad tile code {other} at {index}")),
        }
        if let Some(leader) = state.leaders.get(index).and_then(|l| l.as_ref()) {
            board.set_leader(pos, colour_leader(&leader.c)?);
            board.set_player(pos, player_of(leader.s)?);
        }
        if state.catastrophes.get(index).copied().unwrap_or(false) {
            board.set_catastrophe(pos, true);
        }
    }

    for monument in &state.monuments {
        let top_left = monument.at;
        // LBR stores the top-left cell; the donor wants every cell of the 2x2
        // square in its monument bitboard (and no tile colour under them).
        for cell in [top_left, top_left + 1, top_left + W, top_left + W + 1] {
            board.set_monument(pos_of(cell)?, true);
        }
    }

    board.unification_tile = if state.unification >= 0 {
        Some(pos_of(state.unification as usize)?)
    } else {
        None
    };

    Ok(board)
}

fn lbr_players(state: &LbrState) -> Result<Players, String> {
    let mut players = [PlayerState::new(); 4];
    for (seat, record) in state.players.iter().enumerate().take(state.num_seats) {
        let mut p = PlayerState::new();
        p.hand_red = record.hand.red;
        p.hand_blue = record.hand.blue;
        p.hand_green = record.hand.green;
        p.hand_black = record.hand.black;
        p.score_red = record.score.red;
        p.score_blue = record.score.blue;
        p.score_green = record.score.green;
        p.score_black = record.score.black;
        p.score_treasure = record.treasures;
        p.num_catastrophes = record.catastrophes;
        p.placed_red_leader = record.leaders.red.map(pos_of).transpose()?;
        p.placed_blue_leader = record.leaders.blue.map(pos_of).transpose()?;
        p.placed_green_leader = record.leaders.green.map(pos_of).transpose()?;
        p.placed_black_leader = record.leaders.black.map(pos_of).transpose()?;
        players[seat] = p;
    }
    Ok(Players(players))
}

fn lbr_to_donor(state: &LbrState, seed: u64) -> Result<TnEGame, String> {
    if state.num_seats < 2 || state.num_seats > 4 {
        return Err(format!("numSeats {} is not 2..4", state.num_seats));
    }
    let board = lbr_board(state)?;
    let players = lbr_players(state)?;
    let active = player_of(state.active_seat)?;

    let mut game = TnEGame {
        board,
        players,
        move_history: MoveHistory::new(),
        bag: Tiles {
            red: state.bag.red,
            blue: state.bag.blue,
            green: state.bag.green,
            black: state.bag.black,
        },
        available_monuments: state
            .available_monuments
            .iter()
            .map(|code| monument_type(code))
            .collect::<Result<Vec<_>, _>>()?,
        monuments: state
            .monuments
            .iter()
            .map(|m| {
                Ok(Monument {
                    monument_type: monument_type(&m.t)?,
                    pos_top_left: pos_of(m.at)?,
                })
            })
            .collect::<Result<Vec<_>, String>>()?,
        state: vec![GameState::Normal],
        play_action_stack: Vec::new(),
        player_turn: active,
        last_player: Player::None,
        last_player_normal_action: Player::None,
        last_action_player: Player::None,
        internal_conflict: None,
        external_conflict: None,
        num_players: state.num_seats as u8,
        start_player: Player::Player1,
        rng: Rng::new(seed),
    };

    match &state.pending {
        None => {
            let actions_left = 2u32.saturating_sub(state.actions_used).max(1);
            for _ in 0..actions_left {
                game.play_action_stack.push((active, PlayerAction::Normal));
            }
        }
        Some(pending) => match pending.kind.as_str() {
            "monument" => {
                let offer = pending.offers.first().ok_or("monument decision has no offers")?;
                let types = offer
                    .types
                    .iter()
                    .map(|code| monument_type(code))
                    .collect::<Result<Vec<_>, _>>()?;
                game.play_action_stack = vec![(
                    player_of(pending.seat)?,
                    PlayerAction::BuildMonument(pos_of(offer.at)?, types),
                )];
                game.state = vec![GameState::BuildMonument];
            }
            "warOrder" => {
                let war = state.war.as_ref().ok_or("warOrder without a war")?;
                let unification = game.board.unification_tile;
                let conflicts = war
                    .conflicts
                    .iter()
                    .map(|c| conflict(c, false, &game.board, unification))
                    .collect::<Result<Vec<_>, _>>()?;
                let mut flags = PlayerAction::SelectLeader {
                    red: false,
                    blue: false,
                    green: false,
                    black: false,
                };
                if let PlayerAction::SelectLeader { red, blue, green, black } = &mut flags {
                    for c in &war.conflicts {
                        match c.colour.as_str() {
                            "R" => *red = true,
                            "B" => *blue = true,
                            "G" => *green = true,
                            "K" => *black = true,
                            other => return Err(format!("unknown conflict colour {other}")),
                        }
                    }
                }
                game.external_conflict = Some(ExternalConflict {
                    conflicts,
                    unification_tile_pos: pos_of(war.at)?,
                    unification_tile_type: colour_tile(&war.placed_colour)?,
                });
                game.play_action_stack = vec![(player_of(pending.seat)?, flags)];
                game.state = vec![GameState::WarSelectLeader];
            }
            "warSupport" => {
                let war = state.war.as_ref().ok_or("warSupport without a war")?;
                let colour = colour_tile(pending.colour.as_deref().ok_or("warSupport without a colour")?)?;
                let unification = game.board.unification_tile;
                game.external_conflict = Some(ExternalConflict {
                    conflicts: war
                        .conflicts
                        .iter()
                        .map(|c| conflict(c, false, &game.board, unification))
                        .collect::<Result<Vec<_>, _>>()?,
                    unification_tile_pos: pos_of(war.at)?,
                    unification_tile_type: colour_tile(&war.placed_colour)?,
                });
                game.play_action_stack = vec![(player_of(pending.seat)?, PlayerAction::AddSupport(colour))];
                game.state = vec![GameState::AddSupport];
            }
            "revoltSupport" => {
                let revolt = state.revolt.as_ref().ok_or("revoltSupport without a revolt")?;
                game.internal_conflict = Some(revolt_conflict(revolt, &game.board)?);
                game.play_action_stack =
                    vec![(player_of(pending.seat)?, PlayerAction::AddSupport(TileType::Red))];
                game.state = vec![GameState::AddSupport];
            }
            other => return Err(format!("unsupported pending kind {other}")),
        },
    }

    Ok(game)
}

fn choose_with_donor(
    game: &TnEGame,
    sims: u32,
    alpha: f32,
    net: Option<&Net>,
    seed: u64,
) -> Option<crate::game::Action> {
    let cfg = AzConfig {
        sims,
        alpha_policy: alpha,
        alpha_value: alpha,
        dirichlet_alpha: 0.0,
        dirichlet_eps: 0.0,
        temperature: 0.0,
        hide_hands: true,
        // Average four hidden-hand deals; `sims` is split across them.
        determinizations: 4,
        ..AzConfig::default()
    };
    let mut agent = AzAgent::new(cfg, net.cloned(), seed);
    agent.search(game).map(|result| result.action)
}

fn fallback_action(state: &LbrState) -> Value {
    match &state.pending {
        None => json!({"type": "pass"}),
        Some(pending) => match pending.kind.as_str() {
            "treasure" => json!({"type": "treasure", "keep": pending.keep_options.first().copied().unwrap_or(0)}),
            "warOrder" => {
                let colour = state
                    .war
                    .as_ref()
                    .and_then(|war| war.conflicts.first())
                    .map(|c| c.colour.clone())
                    .unwrap_or_else(|| "R".into());
                json!({"type": "warOrder", "colour": colour})
            }
            "warSupport" | "revoltSupport" => json!({"type": "support", "count": 0}),
            "monument" => json!({"type": "monument", "build": null}),
            _ => json!({"type": "pass"}),
        },
    }
}

fn donor_action_to_lbr(
    action: crate::game::Action,
    state: &LbrState,
    game: &TnEGame,
) -> Result<Value, String> {
    use crate::game::Action as A;
    Ok(match action {
        A::PlaceTile { pos, tile_type } => {
            json!({"type": "placeTile", "colour": tile_letter(tile_type)?, "pos": index_of(pos)})
        }
        A::PlaceLeader { pos, leader } => {
            json!({"type": "placeLeader", "colour": leader_letter(leader)?, "pos": index_of(pos)})
        }
        A::WithdrawLeader(pos) => {
            json!({"type": "withdrawLeader", "colour": leader_letter(game.board.get_leader(pos))?})
        }
        A::PlaceCatastrophe(pos) => json!({"type": "catastrophe", "pos": index_of(pos)}),
        A::ReplaceTile(tiles) => {
            json!({"type": "swap", "tiles": {"R": tiles.red, "B": tiles.blue, "G": tiles.green, "K": tiles.black}})
        }
        A::Pass => json!({"type": "pass"}),
        A::TakeTreasure(pos) => json!({"type": "treasure", "keep": index_of(pos)}),
        A::WarSelectLeader(leader) => json!({"type": "warOrder", "colour": leader_letter(leader)?}),
        A::AddSupport(count) => json!({"type": "support", "count": count}),
        A::BuildMonument(kind) => {
            let offer = state
                .pending
                .as_ref()
                .and_then(|pending| pending.offers.first())
                .ok_or("monument build without an offer")?;
            json!({"type": "monument", "build": {"at": offer.at, "type": monument_code(kind)}})
        }
        A::DeclineMonument => json!({"type": "monument", "build": null}),
    })
}

/// Pick one LBR action for the seat to move in `request.state`.
pub fn choose_move_json(
    request: &Value,
    sims: u32,
    alpha: f32,
    net: Option<&Net>,
    seed: u64,
) -> Result<Value, String> {
    let raw = request.get("state").ok_or("request has no state")?;
    let state: LbrState = serde_json::from_value(raw.clone()).map_err(|e| format!("bad LBR state: {e}"))?;
    if state.game_over {
        return Err("game is over".into());
    }

    let fallback = fallback_action(&state);
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| choose_action(&state, sims, alpha, net, seed))) {
        Ok(result) => result,
        // A panic inside the donor search must not take the live service (and
        // every other AI game) down with it; play a legal default instead.
        Err(_) => Ok(fallback),
    }
}

fn choose_action(state: &LbrState, sims: u32, alpha: f32, net: Option<&Net>, seed: u64) -> Result<Value, String> {
    // Treasure decisions are a choice between equals: the keep options share the
    // same edge distance, so the engine's one-at-a-time treasure model does not
    // describe this decision and there is nothing to search.
    if let Some(pending) = &state.pending {
        if pending.kind == "treasure" {
            return Ok(fallback_action(state));
        }
    }

    let game = lbr_to_donor(state, seed)?;
    let action = match choose_with_donor(&game, sims, alpha, net, seed) {
        Some(action) => action,
        None => return Ok(fallback_action(state)),
    };
    donor_action_to_lbr(action, state, &game)
}

/// Load the trained network for one process.
pub fn load_net(path: &str) -> Option<SharedNet> {
    if path.is_empty() {
        return None;
    }
    match az::load_net(path) {
        Ok(net) => Some(net),
        Err(error) => {
            eprintln!("{error}");
            None
        }
    }
}

// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn opening_state() -> Value {
        let temples = [10usize, 17, 31, 37, 77, 105, 113, 142, 150, 170];
        let mut tiles = vec![0u8; CELLS];
        let mut treasures = vec![false; CELLS];
        let mut leaders = vec![Value::Null; CELLS];
        for temple in temples {
            tiles[temple] = 1;
            treasures[temple] = true;
        }
        let player = json!({
            "hand": {"R": 1, "B": 2, "G": 2, "K": 1},
            "score": {"R": 0, "B": 0, "G": 0, "K": 0},
            "treasures": 0,
            "catastrophes": 2,
            "leaders": {"R": null, "B": null, "G": null, "K": null},
        });
        let mut players = Vec::new();
        for _ in 0..4 {
            players.push(player.clone());
        }
        json!({
            "numSeats": 4,
            "tiles": tiles,
            "leaders": leaders,
            "treasures": treasures,
            "catastrophes": vec![false; CELLS],
            "unification": -1,
            "monuments": [],
            "availableMonuments": ["RB", "KG", "KB", "KR", "GB", "RG"],
            "players": players,
            "bag": {"R": 23, "B": 28, "G": 22, "K": 22},
            "activeSeat": 0,
            "actionsUsed": 0,
            "pending": null,
            "war": null,
            "revolt": null,
            "gameOver": false,
        })
    }

    #[test]
    fn maps_the_opening_position_onto_the_donor() {
        let request = json!({"state": opening_state(), "seat": 0});
        let state: LbrState = serde_json::from_value(request["state"].clone()).unwrap();
        let game = lbr_to_donor(&state, 7).unwrap();

        assert_eq!(game.board.treasures.count_ones(), 10);
        assert_eq!(game.board.unification_tile, None);
        assert_eq!(game.players.get(Player::Player1).hand_sum(), 6);
        assert_eq!(game.num_players, 4);
        assert_eq!(game.player_turn, Player::Player1);
        assert_eq!(game.play_action_stack.len(), 2);
        assert!(game.play_action_stack.iter().all(|(p, a)| *p == Player::Player1 && *a == PlayerAction::Normal));
    }

    #[test]
    fn picks_a_legal_lbr_action_without_a_network() {
        let request = json!({"state": opening_state(), "seat": 0});
        let action = choose_move_json(&request, 2, 0.7, None, 11).unwrap();
        let kind = action["type"].as_str().unwrap();
        assert!(
            ["placeTile", "placeLeader", "withdrawLeader", "catastrophe", "swap", "pass"].contains(&kind),
            "unexpected action {action}"
        );
    }

    #[test]
    fn maps_a_pending_monument_decision() {
        let mut state = opening_state();
        state["pending"] = json!({
            "kind": "monument",
            "seat": 1,
            "colour": "R",
            "offers": [{"at": 20, "types": ["RG", "RB"]}],
        });
        let request = json!({"state": state, "seat": 1});
        let parsed: LbrState = serde_json::from_value(request["state"].clone()).unwrap();
        let game = lbr_to_donor(&parsed, 3).unwrap();

        assert_eq!(game.state, vec![GameState::BuildMonument]);
        assert_eq!(game.next_player(), Player::Player2);
        match game.next_action() {
            PlayerAction::BuildMonument(pos, types) => {
                assert_eq!(pos, Pos { x: 1, y: 4 });
                assert_eq!(types, vec![MonumentType::RedGreen, MonumentType::RedBlue]);
            }
            other => panic!("unexpected pending decision {other:?}"),
        }
    }
}

