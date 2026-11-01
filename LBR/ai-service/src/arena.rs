//! Self-play harness and procedural-map evaluation pipeline.
//!
//! PRD refs: 004 §3–§8 (E7–E18), 003 §8 (A28–A29).

use crate::eval::EvalWeights;
use crate::game::{Action, Player, Rng, TnEGame};
use crate::maps::MapSpec;
use crate::puct::{Puct, PuctConfig};
use crate::solver::{EngineEvaluator, EngineWeights, Evaluator, TigrisAndEuphrates};
use minimax::{Game, IterativeOptions, IterativeSearch, Negamax, Strategy};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Configuration for one agent "personality" (PRD 004 §7 mixes these).
#[derive(Clone, Copy, Debug)]
pub struct AgentConfig {
    pub sims: u32,
    pub depth_cap: u32,
    pub regret_lambda: f32,
    pub weights: EvalWeights,
    pub max_time_ms: Option<u64>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        AgentConfig {
            sims: 200,
            depth_cap: 0,
            regret_lambda: 0.0,
            weights: EvalWeights::default(),
            max_time_ms: None,
        }
    }
}

impl AgentConfig {
    fn make(&self, seed: u64) -> Puct {
        let cfg = PuctConfig {
            sims: self.sims,
            depth_cap: self.depth_cap,
            regret_lambda: self.regret_lambda,
            max_time_ms: self.max_time_ms,
            ..PuctConfig::default()
        };
        Puct::new(cfg, seed).with_evaluator(crate::eval::DomainEvaluator::with_weights(self.weights))
    }
}

/// Statistical gate for map fairness (PRD 004 §5, E11–E12).
///
/// A map is rejected only when there is enough evidence that a seat's win rate
/// lies outside the equivalence band `1/np ± margin` (95% Wilson CI disjoint
/// from the band), or when cross-budget results are unstable.
#[derive(Clone, Copy, Debug)]
pub struct Gate {
    /// Practical-equivalence half-width for seat win rates.
    pub margin: f64,
    /// Minimum games before fairness gating applies.
    pub min_games: u32,
    /// Max allowed |Δfairness| between search budgets before rejecting.
    pub budget_tolerance: f64,
}

impl Default for Gate {
    fn default() -> Self {
        Gate {
            margin: 0.08,
            min_games: 40,
            budget_tolerance: 0.15,
        }
    }
}

/// One completed game.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GameRecord {
    pub num_players: u8,
    pub winner_seat: Option<usize>,
    pub scores: [u8; 4],
    pub treasures: [u8; 4],
    pub raw_points: [[u32; 4]; 4],
    pub moves: u32,
    pub conflicts: u32,
    pub monuments: u32,
    pub start_seat: usize,
    pub opening: Vec<u32>,
    pub finish_margin: i32,
    pub hit_cap: bool,
}

/// Play one complete game on `map` with one agent config per seat.
///
/// Agents get *per-game, per-seat random* search seeds so a fixed seat never
/// has a systematic RNG advantage (seat-bias control).
pub fn play_game(
    map: &MapSpec,
    configs: &[AgentConfig],
    num_players: u8,
    seed: u64,
    max_moves: u32,
) -> GameRecord {
    let mut game = map.start_game(num_players, seed);

    let mut srng = Rng::new(seed ^ 0xDEAD_BEEF_CAFE_F00D);
    let agent_seeds: Vec<u64> = (0..num_players).map(|_| srng.next_u64()).collect();
    let mut agents: Vec<Puct> = (0..num_players as usize)
        .map(|s| configs[s % configs.len()].make(agent_seeds[s]))
        .collect();

    let start_seat = game.next_player().index().unwrap_or(0);
    let mut moves = 0u32;
    let mut conflicts = 0u32;
    let mut monuments = 0u32;
    let mut opening: Vec<u32> = Vec::new();

    while !game.state.is_empty() && moves < max_moves {
        let seat = match game.next_player().index() {
            Some(s) => s,
            None => break,
        };
        let Some(action) = agents[seat].choose_move(&game) else {
            break;
        };

        if opening.len() < num_players as usize * 2 {
            opening.push(crate::eval::Factor::from(&action).key());
        }

        let had_conflict =
            game.internal_conflict.is_some() || game.external_conflict.is_some();
        match TigrisAndEuphrates::apply(&mut game, action) {
            Some(next) => game = next,
            None => break,
        }
        if !had_conflict
            && (game.internal_conflict.is_some() || game.external_conflict.is_some())
        {
            conflicts += 1;
        }
        if matches!(action, Action::BuildMonument(_)) {
            monuments += 1;
        }
        moves += 1;
    }

    let hit_cap = moves >= max_moves && !game.state.is_empty();
    finalize(&game, start_seat, moves, conflicts, monuments, opening, hit_cap)
}

fn finalize(
    game: &TnEGame,
    start_seat: usize,
    moves: u32,
    conflicts: u32,
    monuments: u32,
    opening: Vec<u32>,
    hit_cap: bool,
) -> GameRecord {
    let np = game.num_players as usize;
    let mut scores = [0u8; 4];
    let mut treasures = [0u8; 4];
    let mut raw_points = [[0u32; 4]; 4];
    for i in 0..np {
        let ps = &game.players.0[i];
        scores[i] = ps.calculate_score();
        treasures[i] = ps.score_treasure;
        raw_points[i] = [
            ps.score_red as u32,
            ps.score_blue as u32,
            ps.score_green as u32,
            ps.score_black as u32,
        ];
    }
    let standings = game.standings();
    let winner_seat = standings.first().and_then(|(p, _)| p.index());
    let best = standings.first().map(|(_, s)| *s as i32).unwrap_or(0);
    let second = standings.get(1).map(|(_, s)| *s as i32).unwrap_or(best);

    GameRecord {
        num_players: game.num_players,
        winner_seat,
        scores,
        treasures,
        raw_points,
        moves,
        conflicts,
        monuments,
        start_seat,
        opening,
        finish_margin: best - second,
        hit_cap,
    }
}

/// Aggregate metrics for one map (PRD 004 §4).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Metrics {
    pub games: u32,
    pub num_players: u8,
    pub win_rate_by_seat: [f64; 4],
    pub win_rate_ci_low: [f64; 4],
    pub win_rate_ci_high: [f64; 4],
    pub avg_score_by_seat: [f64; 4],
    pub score_ci_low: [f64; 4],
    pub score_ci_high: [f64; 4],
    pub first_player_advantage: f64,
    pub starter_win_rate: f64,
    pub avg_moves: f64,
    pub cap_rate: f64,
    pub conflict_rate: f64,
    pub monument_rate: f64,
    pub runaway_rate: f64,
    pub opening_diversity: f64,
    pub scoring_diversity: f64,
    pub scoring_histogram: [u32; 4],
    pub seat_chi2: f64,
    pub fairness_score: f64,
    pub quality_score: f64,
    pub total_score: f64,
    pub cross_budget_delta: f64,
    pub gate_games_ok: bool,
    pub rejected: bool,
    pub reject_reason: Option<String>,
}

/// Wilson score interval for a binomial proportion.
fn wilson(successes: f64, n: f64, z: f64) -> (f64, f64) {
    if n <= 0.0 {
        return (0.0, 0.0);
    }
    let p = successes / n;
    let denom = 1.0 + z * z / n;
    let centre = p + z * z / (2.0 * n);
    let margin = z * (p * (1.0 - p) / n + z * z / (4.0 * n * n)).sqrt();
    ((centre - margin) / denom, (centre + margin) / denom)
}

/// Percentile bootstrap CI for a mean (E12).
fn bootstrap_mean_ci(values: &[f64], iters: u32, seed: u64) -> (f64, f64) {
    if values.is_empty() {
        return (0.0, 0.0);
    }
    let n = values.len();
    let mut rng = Rng::new(seed);
    let mut means = Vec::with_capacity(iters as usize);
    for _ in 0..iters {
        let mut s = 0.0;
        for _ in 0..n {
            s += values[rng.below(n as u64) as usize];
        }
        means.push(s / n as f64);
    }
    means.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let lo_idx = ((iters as f64 * 0.025) as usize).min(iters as usize - 1);
    let hi_idx = ((iters as f64 * 0.975) as usize).min(iters as usize - 1);
    (means[lo_idx], means[hi_idx])
}

/// Shannon entropy (normalised to [0,1] over `bins` outcomes).
fn normalised_entropy(counts: &[u32], bins: usize) -> f64 {
    let total: u32 = counts.iter().sum();
    if total == 0 || bins <= 1 {
        return 0.0;
    }
    let mut h = 0.0;
    for &c in counts {
        if c > 0 {
            let p = c as f64 / total as f64;
            h -= p * p.ln();
        }
    }
    h / (bins as f64).ln()
}

pub fn compute_metrics(records: &[GameRecord], num_players: u8) -> Metrics {
    compute_metrics_with(records, num_players, Gate::default())
}

pub fn compute_metrics_with(records: &[GameRecord], num_players: u8, gate: Gate) -> Metrics {
    let n = records.len() as f64;
    let np = num_players as usize;
    let mut seat_wins = [0u32; 4];
    let mut seat_score_sum = [0f64; 4];
    let mut seat_scores: [Vec<f64>; 4] = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];
    let mut total_moves = 0u32;
    let mut cap_hits = 0u32;
    let mut total_conflicts = 0u32;
    let mut total_monuments = 0u32;
    let mut opening_counts: std::collections::HashMap<Vec<u32>, u32> =
        std::collections::HashMap::new();
    let mut colour_counts = [0u32; 4];
    let mut runaways = 0u32;

    for r in records {
        if let Some(w) = r.winner_seat {
            if w < 4 {
                seat_wins[w] += 1;
            }
        }
        for i in 0..np {
            seat_score_sum[i] += r.scores[i] as f64;
            seat_scores[i].push(r.scores[i] as f64);
        }
        total_moves += r.moves;
        if r.hit_cap {
            cap_hits += 1;
        }
        total_conflicts += r.conflicts;
        total_monuments += r.monuments;
        *opening_counts.entry(r.opening.clone()).or_insert(0) += 1;
        for i in 0..np {
            for c in 0..4 {
                colour_counts[c] += r.raw_points[i][c];
            }
        }
        if r.finish_margin >= 4 {
            runaways += 1;
        }
    }

    let mut win_rate = [0f64; 4];
    let mut ci_low = [0f64; 4];
    let mut ci_high = [0f64; 4];
    let mut avg_score = [0f64; 4];
    let mut score_ci_low = [0f64; 4];
    let mut score_ci_high = [0f64; 4];
    for i in 0..np {
        win_rate[i] = seat_wins[i] as f64 / n.max(1.0);
        let (lo, hi) = wilson(seat_wins[i] as f64, n, 1.96);
        ci_low[i] = lo;
        ci_high[i] = hi;
        avg_score[i] = seat_score_sum[i] / n.max(1.0);
        let (slo, shi) = bootstrap_mean_ci(&seat_scores[i], 500, 0xB007 ^ (i as u64));
        score_ci_low[i] = slo;
        score_ci_high[i] = shi;
    }

    let expected = 1.0 / np.max(1) as f64;
    let max_dev = (0..np)
        .map(|i| (win_rate[i] - expected).abs())
        .fold(0.0f64, f64::max);
    let fairness = (1.0 - max_dev / (1.0 - expected).max(1e-9)).clamp(0.0, 1.0);

    let chi2: f64 = (0..np)
        .map(|i| {
            let o = seat_wins[i] as f64;
            let e = n * expected;
            if e > 0.0 {
                (o - e).powi(2) / e
            } else {
                0.0
            }
        })
        .sum();

    let first_adv = win_rate[0] - expected;

    // Fraction of games won by whoever started (first-player advantage).
    let starter_wins = records
        .iter()
        .filter(|r| r.winner_seat == Some(r.start_seat))
        .count() as f64;
    let starter_win_rate = starter_wins / n.max(1.0);

    let conflict_rate = if n > 0.0 { total_conflicts as f64 / n } else { 0.0 };
    let monument_rate = if n > 0.0 { total_monuments as f64 / n } else { 0.0 };
    let runaway_rate = runaways as f64 / n.max(1.0);
    let cap_rate = cap_hits as f64 / n.max(1.0);
    let opening_diversity = normalised_entropy(
        &opening_counts.values().copied().collect::<Vec<_>>(),
        records.len().max(1),
    );
    let scoring_diversity = normalised_entropy(&colour_counts, 4);

    let interaction = (conflict_rate / 3.0).min(1.0);
    let build = monument_rate.min(1.0);
    let quality = (0.35 * interaction
        + 0.15 * build
        + 0.2 * (1.0 - runaway_rate)
        + 0.2 * opening_diversity
        + 0.1 * scoring_diversity)
        .clamp(0.0, 1.0);

    let total_score = 0.6 * fairness + 0.4 * quality;

    // Statistical gate (E11–E12): reject only with enough evidence.
    let gate_games_ok = records.len() as u32 >= gate.min_games;
    let band_lo = expected - gate.margin;
    let band_hi = expected + gate.margin;
    let seat_outside = (0..np).any(|i| ci_high[i] < band_lo || ci_low[i] > band_hi);
    let rejected = gate_games_ok && seat_outside;
    let reject_reason = if rejected {
        let worst = (0..np)
            .max_by(|&a, &b| {
                (win_rate[a] - expected)
                    .abs()
                    .partial_cmp(&(win_rate[b] - expected).abs())
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .unwrap_or(0);
        Some(format!(
            "seat {} win rate {:.2} outside {:.2}–{:.2} (95% CI [{:.2},{:.2}])",
            worst,
            win_rate[worst],
            band_lo,
            band_hi,
            ci_low[worst],
            ci_high[worst]
        ))
    } else {
        None
    };

    Metrics {
        games: records.len() as u32,
        num_players,
        win_rate_by_seat: win_rate,
        win_rate_ci_low: ci_low,
        win_rate_ci_high: ci_high,
        avg_score_by_seat: avg_score,
        score_ci_low,
        score_ci_high,
        first_player_advantage: first_adv,
        starter_win_rate,
        avg_moves: total_moves as f64 / n.max(1.0),
        cap_rate,
        conflict_rate,
        monument_rate,
        runaway_rate,
        opening_diversity,
        scoring_diversity,
        scoring_histogram: colour_counts,
        seat_chi2: chi2,
        fairness_score: fairness,
        quality_score: quality,
        total_score,
        cross_budget_delta: 0.0,
        gate_games_ok,
        rejected,
        reject_reason,
    }
}

/// One evaluated map in the final report.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MapReport {
    pub name: String,
    pub map: MapSpec,
    pub metrics: Metrics,
    #[serde(default)]
    pub games_detail: Vec<GameRecord>,
}

/// Run `games` self-play games on one map, rotating agent configs through
/// seats and varying seeds (E7–E10).
pub fn evaluate_map(
    map: &MapSpec,
    configs: &[AgentConfig],
    num_players: u8,
    games: u32,
    seed: u64,
    max_moves: u32,
) -> Vec<GameRecord> {
    let mut records = Vec::with_capacity(games as usize);
    for g in 0..games {
        let rotated: Vec<AgentConfig> = (0..num_players as usize)
            .map(|s| configs[(s + g as usize) % configs.len()])
            .collect();
        let game_seed = seed.wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(g as u64 + 1);
        records.push(play_game(map, &rotated, num_players, game_seed, max_moves));
    }
    records
}

/// Uniform-random self-play (diagnostic): all seats identical and unbiased, so
/// any seat skew here points at the engine, not the agent.
pub fn random_selfplay(
    map: &MapSpec,
    num_players: u8,
    games: u32,
    seed: u64,
    max_moves: u32,
) -> Vec<GameRecord> {
    let mut out = Vec::with_capacity(games as usize);
    for g in 0..games {
        let gs = seed.wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(g as u64 + 1);
        let mut game = map.start_game(num_players, gs);
        let mut rng = Rng::new(gs ^ 0x00C0_FFEE);
        let start = game.next_player().index().unwrap_or(0);
        let mut moves = 0u32;
        while !game.state.is_empty() && moves < max_moves {
            let actions = crate::puct::legal_actions(&game);
            if actions.is_empty() {
                break;
            }
            let a = actions[rng.below(actions.len() as u64) as usize];
            match TigrisAndEuphrates::apply(&mut game, a) {
                Some(s) => game = s,
                None => break,
            }
            moves += 1;
        }
        let hit_cap = moves >= max_moves && !game.state.is_empty();
        out.push(finalize(&game, start, moves, 0, 0, Vec::new(), hit_cap));
    }
    out
}

/// Full pipeline: generate/evaluate maps, rank (E11–E16).
pub struct EvalConfig {
    pub num_players: u8,
    pub games: u32,
    pub seed: u64,
    pub game_seed: u64,
    pub max_moves: u32,
    pub configs: Vec<AgentConfig>,
    pub maps: Vec<MapSpec>,
    pub gate: Gate,
    /// Search-budget levels for cross-budget validation (empty = single).
    pub budgets: Vec<u32>,
}

pub fn evaluate(mut cfg: EvalConfig) -> Vec<MapReport> {
    let base_configs = cfg.configs.clone();
    let mut reports: Vec<MapReport> = Vec::new();

    for map in cfg.maps.drain(..) {
        let (records, mut metrics) = if cfg.budgets.len() > 1 {
            let mut per_budget: Vec<(Vec<GameRecord>, Metrics)> = Vec::new();
            for &b in &cfg.budgets {
                let c = AgentConfig {
                    sims: b,
                    ..base_configs[0]
                };
                let recs = evaluate_map(
                    &map,
                    &[c],
                    cfg.num_players,
                    cfg.games,
                    cfg.game_seed,
                    cfg.max_moves,
                );
                let m = compute_metrics_with(&recs, cfg.num_players, cfg.gate);
                per_budget.push((recs, m));
            }
            let fairs: Vec<f64> = per_budget.iter().map(|(_, m)| m.fairness_score).collect();
            let mut delta = 0.0f64;
            for i in 0..fairs.len() {
                for j in (i + 1)..fairs.len() {
                    delta = delta.max((fairs[i] - fairs[j]).abs());
                }
            }
            let (recs, mut m) = per_budget.pop().unwrap();
            m.cross_budget_delta = delta;
            if delta > cfg.gate.budget_tolerance {
                m.rejected = true;
                m.reject_reason = Some(format!("cross-budget instability Δ={delta:.2}"));
            }
            (recs, m)
        } else {
            let recs = evaluate_map(
                &map,
                &base_configs,
                cfg.num_players,
                cfg.games,
                cfg.game_seed,
                cfg.max_moves,
            );
            let m = compute_metrics_with(&recs, cfg.num_players, cfg.gate);
            (recs, m)
        };

        metrics.num_players = cfg.num_players;
        reports.push(MapReport {
            name: map.name.clone(),
            map,
            metrics,
            games_detail: records,
        });
    }

    rank(&mut reports);
    reports
}

/// Rank maps: accepted maps first, by combined score descending.
pub fn rank(reports: &mut [MapReport]) {
    reports.sort_by(|a, b| {
        a.metrics
            .rejected
            .cmp(&b.metrics.rejected)
            .then(
                b.metrics
                    .total_score
                    .partial_cmp(&a.metrics.total_score)
                    .unwrap_or(std::cmp::Ordering::Equal),
            )
    });
}

/// Human-readable summary of the ranked reports.
pub fn summary(reports: &[MapReport]) -> String {
    let mut s = String::new();
    s.push_str("rank\tmap\tfairness\tquality\ttotal\twin-by-seat\tconflicts\tmoves\trejected\n");
    for (i, r) in reports.iter().enumerate() {
        let m = &r.metrics;
        let wins: Vec<String> = (0..m.num_players as usize)
            .map(|k| format!("{:.2}", m.win_rate_by_seat[k]))
            .collect();
        s.push_str(&format!(
            "{}\t{}\t{:.3}\t{:.3}\t{:.3}\t{}\t{:.1}\t{:.1}\t{}\n",
            i + 1,
            r.name,
            m.fairness_score,
            m.quality_score,
            m.total_score,
            wins.join("/"),
            m.conflict_rate,
            m.avg_moves,
            m.rejected,
        ));
    }
    s
}

/// Convenience: number of seats for a player count.
pub fn seats(num_players: u8) -> Vec<Player> {
    Player::seats(num_players)
}

/// Expose for callers that just want a single move's search report.
pub fn search_report(
    configs: &[AgentConfig],
    state: &TnEGame,
    seed: u64,
) -> crate::puct::SearchReport {
    let mut agent = configs[0].make(seed);
    let action = agent.choose_move(state);
    let _ = action;
    agent.report()
}

// ---------------------------------------------------------------------------
// Head-to-head strength harness (A28–A29 / AC-5)
// ---------------------------------------------------------------------------

fn elo_expected(a: f64, b: f64) -> f64 {
    1.0 / (1.0 + 10f64.powf((b - a) / 400.0))
}

/// How well a candidate evaluator predicts the actual result.
///
/// `r` is Pearson correlation between the evaluator's mean seat-0-minus-seat-1
/// margin over a game and the game's real final score margin. `agree` is the
/// fraction of decided games whose margin sign agrees with the real margin
/// sign. A value of 0 means the evaluator is predicting noise.
pub struct EvalFit {
    pub name: String,
    pub r: f64,
    pub agree: f64,
}

fn pearson(xs: &[f64], ys: &[f64]) -> f64 {
    let n = xs.len() as f64;
    if n < 2.0 {
        return 0.0;
    }
    let mx = xs.iter().sum::<f64>() / n;
    let my = ys.iter().sum::<f64>() / n;
    let mut num = 0.0;
    let mut dx = 0.0;
    let mut dy = 0.0;
    for (&x, &y) in xs.iter().zip(ys) {
        let (a, b) = (x - mx, y - my);
        num += a * b;
        dx += a * a;
        dy += b * b;
    }
    if dx <= 0.0 || dy <= 0.0 {
        return 0.0;
    }
    num / (dx.sqrt() * dy.sqrt())
}

/// Score every candidate evaluator on the *same* games, so the comparison is
/// paired rather than two noisy win-rates being subtracted.
///
/// This exists because hand-designed evaluator terms are guesses, and a guess
/// that looks plausible can be worth nothing or actively harmful. Measuring a
/// candidate's correlation with the real final margin settles it in seconds,
/// where a head-to-head needs hundreds of games to resolve a few points.
pub fn eval_fit(
    games: u32,
    seed: u64,
    max_moves: u32,
    candidates: &[(&str, fn(&crate::game::TnEGame, Player) -> f64)],
) -> Vec<EvalFit> {
    let weights = EngineWeights::default();
    let mut margins: Vec<Vec<f64>> = (0..candidates.len()).map(|_| Vec::new()).collect();
    let mut finals = Vec::new();

    for g in 0..games {
        let game_seed = seed.wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(g as u64 + 1);
        let map = crate::maps::MapSpec::default_map();
        let mut game = map.start_game(2, game_seed);
        let mut p1 = build_engine(3, 0, game_seed, weights);
        let mut p2 = build_engine(3, 0, game_seed ^ 0x55, weights);

        let mut sums = vec![0.0f64; candidates.len()];
        let mut samples = 0.0f64;
        let mut moves = 0u32;

        while !game.state.is_empty() && moves < max_moves {
            let seat = game.next_player();
            let action = match seat {
                Player::Player1 => p1.choose_move(&game),
                Player::Player2 => p2.choose_move(&game),
                _ => None,
            };
            // Sample on seat 0's decisions only, so every game contributes the
            // same number of observations from the same side of the board.
            if seat == Player::Player1 {
                for (i, (_, f)) in candidates.iter().enumerate() {
                    sums[i] += f(&game, Player::Player1) - f(&game, Player::Player2);
                }
                samples += 1.0;
            }
            match action.and_then(|act| TigrisAndEuphrates::apply(&mut game, act)) {
                Some(next) => game = next,
                None => break,
            }
            moves += 1;
        }

        if samples == 0.0 {
            continue;
        }
        let real = game.players.get(Player::Player1).calculate_score() as f64
            - game.players.get(Player::Player2).calculate_score() as f64;
        if real == 0.0 {
            continue;
        }
        finals.push(real);
        for (i, s) in sums.iter().enumerate() {
            margins[i].push(s / samples);
        }
    }

    candidates
        .iter()
        .enumerate()
        .map(|(i, (name, _))| {
            let m = &margins[i];
            let agree = if m.len() == finals.len() {
                let hits = m
                    .iter()
                    .zip(&finals)
                    .filter(|(&a, &b)| (a > 0.0) == (b > 0.0))
                    .count();
                hits as f64 / m.len() as f64
            } else {
                0.0
            };
            EvalFit {
                name: (*name).to_string(),
                r: pearson(m, &finals),
                agree,
            }
        })
        .collect()
}

/// Number of worker threads to use for a match of `games` games.
///
/// One thread per game does not scale. Each thread reserves a stack (16 MB by
/// default) AND holds a live search arena for whichever agent is thinking —
/// up to `sims` nodes of per-child arrays. A 500-game 4p arena therefore
/// wanted ~8 GB of stack reservation plus ~4.5 GB of arena, against ~9 GB
/// free, and the process was killed. Partitioning a fixed number of games
/// across the available cores gives identical results: the games are
/// independent and each is seeded from its index, so the only requirement is
/// that they be reassembled in order.
pub fn worker_threads(games: u32) -> usize {
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);
    cores.clamp(1, games.max(1) as usize)
}

/// Candidate evaluators for [`eval_fit`].
fn cand_true_score(state: &crate::game::TnEGame, p: Player) -> f64 {
    state.players.get(p).calculate_score() as f64
}
fn cand_old(state: &crate::game::TnEGame, p: Player) -> f64 {
    state.players.get(p).get_eval(state) as f64
}
fn cand_modern(state: &crate::game::TnEGame, p: Player) -> f64 {
    crate::eval::modern_value(state, p) as f64
}
fn cand_final_only(state: &crate::game::TnEGame, p: Player) -> f64 {
    crate::eval::expected_final_score(state, p) as f64
}

/// The standard candidate set: the true score as a control, the incumbent
/// evaluator, and the bag-aware proposals.
pub fn default_eval_candidates() -> Vec<(&'static str, fn(&crate::game::TnEGame, Player) -> f64)> {
    vec![
        ("true_score(control)", cand_true_score),
        ("old get_eval", cand_old),
        ("modern_value", cand_modern),
        ("expected_final", cand_final_only),
    ]
}

pub fn eval_fit_summary(fits: &[EvalFit], games: u32) -> String {
    let mut s = format!("eval fit over {games} paired games:\n");
    for f in fits {
        s.push_str(&format!(
            "  {:<18} r={:+.3}  agrees with real margin {:>5.1}%\n",
            f.name,
            f.r,
            f.agree * 100.0
        ));
    }
    s
}

/// One seat's agent in a 4-player arena.
///
/// The alpha-beta engine is deliberately absent: its evaluator is a hardcoded
/// two-player difference and negamax negates on every seat change, which is
/// only valid zero-sum. Four players each maximise their own score, so the
/// search family for 4p is MCTS.
#[derive(Clone, Debug)]
pub enum Agent4p {
    Puct(PuctConfig),
    /// MCTS-maxⁿ guided by a learned policy/value, optionally blended with the
    /// hand-written evaluator.
    Az {
        cfg: crate::az::AzConfig,
        net: Option<crate::az::SharedNet>,
    },
    Random,
}

/// Aggregate standing of one agent across an arena.
#[derive(Clone, Debug)]
pub struct AgentStanding {
    /// Seat index this agent occupied.
    pub seat: usize,
    pub name: String,
    pub games: u32,
    /// Mean final score (the quantity the game actually rewards).
    pub avg_score: f64,
    /// Fraction of games finished first.
    pub win_rate: f64,
    /// Mean finishing position, 1 = best. 2.5 is exactly average in 4p.
    pub avg_rank: f64,
}

/// Play `games` 4-player games with one agent per seat and rank them.
///
/// This is the only honest way to measure 4p strength: a head-to-head is
/// ill-defined when three opponents share the win, and "beat the agent" is not
/// a well-defined event in a race. Average final score over many games is the
/// metric the game itself scores on.
pub fn arena_4p(
    map: &crate::maps::MapSpec,
    games: u32,
    agents: &[Agent4p],
    seed: u64,
    max_moves: u32,
) -> Vec<AgentStanding> {
    let per_game = arena_4p_games(map, games, agents, seed, max_moves);
    standings(agents, &per_game)
}

/// Paired A-vs-B gate. Seats alternate A,B,A,B; every setup is played again
/// with the seats rotated by one, so each setup is one sample (seat rotations
/// of one setup are not independent) and seat bias cancels.
/// Returns (mean score edge of A per game, its 95% half-width, A's win share).
pub fn paired_gate(
    map: &crate::maps::MapSpec,
    setups: u32,
    a: &Agent4p,
    b: &Agent4p,
    seed: u64,
    max_moves: u32,
) -> (f64, f64, f64) {
    let ab = [a.clone(), b.clone(), a.clone(), b.clone()];
    let ba = [b.clone(), a.clone(), b.clone(), a.clone()];
    let g1 = arena_4p_games(map, setups, &ab, seed, max_moves);
    let g2 = arena_4p_games(map, setups, &ba, seed, max_moves);
    let edge = |sc: &[u8], a_even: bool| {
        let (e, o) = (sc[0] as f64 + sc[2] as f64, sc[1] as f64 + sc[3] as f64);
        (if a_even { e - o } else { o - e }) / 2.0
    };
    let wins = |r: &[usize], a_even: bool| r.iter().enumerate()
        .filter(|(i, &k)| k == 0 && (i % 2 == 0) == a_even).count() as f64;
    let d: Vec<f64> = g1.iter().zip(&g2)
        .map(|((s1, _), (s2, _))| (edge(s1, true) + edge(s2, false)) / 2.0)
        .collect();
    let n = d.len().max(2) as f64;
    let mean = d.iter().sum::<f64>() / n;
    let var = d.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / (n - 1.0);
    let wa: f64 = g1.iter().map(|(_, r)| wins(r, true)).sum::<f64>()
        + g2.iter().map(|(_, r)| wins(r, false)).sum::<f64>();
    let wall: f64 = g1.iter().chain(&g2).map(|(_, r)| r.iter().filter(|&&k| k == 0).count() as f64).sum();
    (mean, 1.96 * (var / n).sqrt(), wa / wall.max(1.0))
}

fn arena_4p_games(
    map: &crate::maps::MapSpec,
    games: u32,
    agents: &[Agent4p],
    seed: u64,
    max_moves: u32,
) -> Vec<(Vec<u8>, Vec<usize>)> {
    assert!(
        (2..=4).contains(&agents.len()),
        "arena needs 2..=4 seats"
    );
    let n = agents.len();
    let nthreads = worker_threads(games);
    let chunk = (games as usize).div_ceil(nthreads).max(1);
    let per_game: Vec<(Vec<u8>, Vec<usize>)> = std::thread::scope(|scope| {
        let handles: Vec<_> = (0..nthreads as u32)
            .map(|t| {
                let map = map.clone();
                let agents = agents.to_vec();
                scope.spawn(move || {
                    let start = t as usize * chunk;
                    let end = (start + chunk).min(games as usize);
                    (start..end)
                        .map(|g| {
                            let game_seed = seed
                                .wrapping_mul(0x9E37_79B9_7F4A_7C15)
                                .wrapping_add(g as u64 + 1);
                            play_arena_game(&map, &agents, game_seed, max_moves)
                        })
                        .collect::<Vec<_>>()
                })
            })
            .collect();
        handles
            .into_iter()
            .flat_map(|h| h.join().unwrap())
            .collect()
    });
    per_game
}

fn standings(agents: &[Agent4p], per_game: &[(Vec<u8>, Vec<usize>)]) -> Vec<AgentStanding> {
    let n = agents.len();

    let mut score_tot = vec![0.0f64; n];
    let mut win_tot = vec![0.0f64; n];
    let mut rank_tot = vec![0.0f64; n];
    let mut counted = 0.0f64;
    for (scores, ranks) in per_game {
        for seat in 0..n {
            score_tot[seat] += scores[seat] as f64;
            rank_tot[seat] += ranks[seat] as f64;
            if ranks[seat] == 0 {
                win_tot[seat] += 1.0;
            }
        }
        counted += 1.0;
    }

    agents
        .iter()
        .enumerate()
        .map(|(seat, a)| {
            let name = match a {
                Agent4p::Puct(c) => format!("puct(sims={},depth={},child={})", c.sims, c.max_depth, c.max_children),
                Agent4p::Az { cfg, net } => format!(
                    "az(sims={},depth={},child={},a={:.2},{})",
                    cfg.sims,
                    cfg.max_depth,
                    cfg.max_children,
                    cfg.alpha_value,
                    if net.is_some() { "net" } else { "heur" }
                ),
                Agent4p::Random => "random".to_string(),
            };
            let d = counted.max(1.0);
            AgentStanding {
                seat,
                name,
                games: counted as u32,
                avg_score: score_tot[seat] / d,
                win_rate: win_tot[seat] / d,
                avg_rank: rank_tot[seat] / d,
            }
        })
        .collect()
}

fn play_arena_game(
    map: &crate::maps::MapSpec,
    agents: &[Agent4p],
    seed: u64,
    max_moves: u32,
) -> (Vec<u8>, Vec<usize>) {
    let n = agents.len() as u8;
    let mut game = map.start_game(n, seed);
    let mut seats: Vec<Box<dyn Strategy<TigrisAndEuphrates>>> = agents
        .iter()
        .enumerate()
        .map(|(i, a)| match a {
            Agent4p::Puct(c) => {
                Box::new(Puct::new(*c, seed ^ (0xA1 + i as u64 * 0x9E37))) as Box<dyn Strategy<TigrisAndEuphrates>>
            }
            Agent4p::Az { cfg, net } => Box::new(crate::az::AzAgent::new(
                *cfg,
                net.as_ref().map(|n| (**n).clone()),
                seed ^ (0xC7 + i as u64 * 0x9E37),
            )) as Box<dyn Strategy<TigrisAndEuphrates>>,
            Agent4p::Random => Box::new(minimax::Random::<TigrisAndEuphrates>::with_seed(
                seed ^ (0xB2 + i as u64),
            )),
        })
        .collect();

    let mut moves = 0u32;
    while !game.state.is_empty() && moves < max_moves {
        let seat = match game.next_player().index() {
            Some(s) => s,
            None => break,
        };
        let action = seats[seat].choose_move(&game);
        match action.and_then(|a| TigrisAndEuphrates::apply(&mut game, a)) {
            Some(next) => game = next,
            None => break,
        }
        moves += 1;
    }

    let scores: Vec<u8> = (0..n as usize)
        .map(|i| game.players.get(Player::from_index(i)).calculate_score())
        .collect();
    let order: Vec<(Player, u8)> = game.standings();
    let mut ranks = vec![n as usize; n as usize];
    for (r, (p, _)) in order.iter().enumerate() {
        if let Some(i) = p.index() {
            ranks[i] = r;
        }
    }
    (scores, ranks)
}

pub fn arena_4p_summary(s: &[AgentStanding]) -> String {
    let mut out = String::from("4p arena (ranked by mean final score)\n");
    for (i, a) in s.iter().enumerate() {
        out.push_str(&format!(
            "  {}. seat {}  {:<34} score={:>5.2}  win={:>5.1}%  avg_rank={:.2}\n",
            i + 1,
            a.seat,
            a.name,
            a.avg_score,
            a.win_rate * 100.0,
            a.avg_rank
        ));
    }
    out
}

/// Result of a two-player match between agents `A` and `B`.
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct MatchResult {
    pub games: u32,
    pub a_wins: u32,
    pub b_wins: u32,
    pub draws: u32,
    pub elo_a: f64,
    pub elo_b: f64,
}

/// The agent on side A (the agent under test) of a head-to-head match.
#[derive(Clone, Copy, Debug)]
pub enum AgentA {
    Puct(PuctConfig),
    /// Iterative-deepening alpha-beta (TT + PVS + LMR) over the engine
    /// evaluator. `time_ms == 0` uses a fixed `depth`; otherwise a wall-clock
    /// budget.
    Engine {
        depth: u8,
        time_ms: u64,
        weights: EngineWeights,
    },
}

/// Who side B (the yardstick) plays.
#[derive(Clone, Copy, Debug)]
pub enum Opponent {
    Negamax { depth: u8 },
    Engine { depth: u8, time_ms: u64 },
    Random,
}

/// Iterative-deepening alpha-beta over the engine evaluator (2p).
pub(crate) fn build_engine(depth: u8, time_ms: u64, seed: u64, weights: EngineWeights) -> IterativeSearch<EngineEvaluator> {
    let opts = IterativeOptions::new()
        .with_countermoves()
        .with_countermove_history()
        // Null-move pruning is deliberately NOT enabled: T&E has no null move
        // (`Pass` spends one of the two actions in a turn, it does not hand the
        // position over). See `TigrisAndEuphrates::null_move`.
        //
        // T&E turns are two actions, so leaf evaluations should land on turn
        // boundaries: complete only every second ply so odd (mid-turn) depths
        // never become the returned move.
        .with_double_step_increment();
    let mut s = IterativeSearch::with_seed(EngineEvaluator::new(weights), opts, seed);
    if time_ms > 0 {
        s.set_timeout(Duration::from_millis(time_ms));
    } else {
        s.set_max_depth(depth);
    }
    s
}

fn build_opponent(opponent: Opponent, game_seed: u64) -> Box<dyn Strategy<TigrisAndEuphrates>> {
    match opponent {
        Opponent::Negamax { depth } => {
            Box::new(Negamax::with_seed(Evaluator::default(), depth, game_seed))
        }
        Opponent::Engine { depth, time_ms } => Box::new(build_engine(
            depth,
            time_ms,
            game_seed,
            EngineWeights::default(),
        )),
        Opponent::Random => Box::new(minimax::Random::<TigrisAndEuphrates>::with_seed(game_seed)),
    }
}

/// PUCT (`A`) vs an `opponent` (`B`), 2 players, seats alternated to control
/// turn-order bias.
pub fn head_to_head_2p(
    map: &MapSpec,
    games: u32,
    cfg: PuctConfig,
    opponent: Opponent,
    seed: u64,
    max_moves: u32,
) -> MatchResult {
    head_to_head_agent(map, games, AgentA::Puct(cfg), opponent, seed, max_moves)
}

/// Any agent (`A`) vs an `opponent` (`B`), 2 players, seats alternated. Games
/// are independent given their seeds, so they run in parallel across cores;
/// aggregation is order-preserving (deterministic).
pub fn head_to_head_agent(
    map: &MapSpec,
    games: u32,
    a_kind: AgentA,
    opponent: Opponent,
    seed: u64,
    max_moves: u32,
) -> MatchResult {
    // Bounded worker pool rather than one thread per game; see
    // `worker_threads` for why. Games are independent and each is seeded from
    // its index, so chunking preserves results exactly.
    let nthreads = worker_threads(games);
    let chunk = (games as usize).div_ceil(nthreads).max(1);
    let scores: Vec<f64> = std::thread::scope(|scope| {
        let handles: Vec<_> = (0..nthreads as u32)
            .map(|t| {
                let map = map.clone();
                scope.spawn(move || {
                    let start = t as usize * chunk;
                    let end = (start + chunk).min(games as usize);
                    (start..end)
                        .map(|g| play_head_to_head_game(&map, a_kind, opponent, seed, max_moves, g as u32))
                        .collect::<Vec<f64>>()
                })
            })
            .collect();
        handles
            .into_iter()
            .flat_map(|h| h.join().unwrap())
            .collect()
    });

    let mut elo_a = 1500.0f64;
    let mut elo_b = 1500.0f64;
    let mut a_wins = 0u32;
    let mut b_wins = 0u32;
    let mut draws = 0u32;
    for &a_score in &scores {
        let b_score = 1.0 - a_score;
        if a_score == 1.0 {
            a_wins += 1;
        } else if a_score == 0.0 {
            b_wins += 1;
        } else {
            draws += 1;
        }
        let ea = elo_expected(elo_a, elo_b);
        let eb = elo_expected(elo_b, elo_a);
        elo_a += 32.0 * (a_score - ea);
        elo_b += 32.0 * (b_score - eb);
    }

    MatchResult {
        games,
        a_wins,
        b_wins,
        draws,
        elo_a,
        elo_b,
    }
}

/// One seat-alternated game; returns side A's score (1/0.5/0).
fn play_head_to_head_game(
    map: &MapSpec,
    a_kind: AgentA,
    opponent: Opponent,
    seed: u64,
    max_moves: u32,
    g: u32,
) -> f64 {
    let a_is_p1 = g % 2 == 0;
    let game_seed = seed.wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(g as u64 + 1);
    let mut game = map.start_game(2, game_seed);

    let mut a: Box<dyn Strategy<TigrisAndEuphrates>> = match a_kind {
        AgentA::Puct(cfg) => Box::new(Puct::new(cfg, game_seed ^ 0xA1)),
        AgentA::Engine {
            depth,
            time_ms,
            weights,
        } => Box::new(build_engine(depth, time_ms, game_seed, weights)),
    };
    let mut b = build_opponent(opponent, game_seed);

    let mut moves = 0u32;
    while !game.state.is_empty() && moves < max_moves {
        let seat = match game.next_player().index() {
            Some(s) => s,
            None => break,
        };
        let a_to_move = (seat == 0) == a_is_p1;
        let action = if a_to_move {
            a.choose_move(&game)
        } else {
            b.choose_move(&game)
        };
        match action.and_then(|act| TigrisAndEuphrates::apply(&mut game, act)) {
            Some(next) => game = next,
            None => break,
        }
        moves += 1;
    }

    match game.winner() {
        Player::Player1 if a_is_p1 => 1.0,
        Player::Player2 if !a_is_p1 => 1.0,
        Player::None => 0.5,
        _ => 0.0,
    }
}

impl MatchResult {
    /// A's score in [0,1] with draws counted as half.
    pub fn a_score(&self) -> f64 {
        if self.games == 0 {
            return 0.5;
        }
        (self.a_wins as f64 + 0.5 * self.draws as f64) / self.games as f64
    }

    /// 95% Wilson score interval for [`MatchResult::a_score`].
    ///
    /// A raw win rate over a few dozen games is not a measurement — at 28 games
    /// the interval is roughly ±17 points, wide enough to call a real
    /// improvement noise. Gating a claim on the *lower* bound of this interval
    /// is what makes a ladder rung mean anything.
    pub fn a_score_ci95(&self) -> (f64, f64) {
        let n = self.games as f64;
        if n == 0.0 {
            return (0.0, 1.0);
        }
        let p = self.a_score();
        let z = 1.959_963_985_f64;
        let denom = 1.0 + z * z / n;
        let centre = (p + z * z / (2.0 * n)) / denom;
        let margin = z * ((p * (1.0 - p) / n + z * z / (4.0 * n * n)).sqrt()) / denom;
        ((centre - margin).max(0.0), (centre + margin).min(1.0))
    }

    /// True when the lower bound of [`MatchResult::a_score_ci95`] clears 50%,
    /// i.e. A is demonstrably stronger than B rather than merely ahead.
    pub fn a_beats_b_significantly(&self) -> bool {
        self.a_score_ci95().0 > 0.5
    }

    pub fn summary(&self) -> String {
        let (lo, hi) = self.a_score_ci95();
        format!(
            "A {}-{} B ({} draws) over {} games; A score {:.1}% [95% CI {:.1}%..{:.1}%]{}; \
             Elo A={:.0} B={:.0} (Δ={:+.0})",
            self.a_wins,
            self.b_wins,
            self.draws,
            self.games,
            self.a_score() * 100.0,
            lo * 100.0,
            hi * 100.0,
            if self.a_beats_b_significantly() { ", significant" } else { "" },
            self.elo_a,
            self.elo_b,
            self.elo_a - self.elo_b
        )
    }
}

/// Ensure trait bounds are referenced in no-feature builds.
#[allow(dead_code)]
fn _assert_game_bound() {
    fn _f<G: Game>() {}
    _f::<TigrisAndEuphrates>();
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::maps::generate_maps;

    fn fast_cfg() -> AgentConfig {
        AgentConfig {
            sims: 24,
            depth_cap: 0,
            regret_lambda: 0.0,
            ..Default::default()
        }
    }

    #[test]
    fn default_map_is_playable() {
        let m = MapSpec::default_map();
        assert!(m.is_playable(4).is_ok(), "{:?}", m.is_playable(4));
        assert_eq!(m.temple_positions().len(), 10);
    }

    #[test]
    fn generated_maps_are_playable() {
        for players in [2u8, 3, 4] {
            let maps = generate_maps(5, players, 123);
            assert_eq!(maps.len(), 5);
            for m in &maps {
                assert!(
                    m.is_playable(players).is_ok(),
                    "{} ({}p): {:?}",
                    m.name,
                    players,
                    m.is_playable(players)
                );
                assert!(m.has_reachable_water_square());
            }
        }
    }

    #[test]
    fn selfplay_2p_terminates() {
        let rec = play_game(&MapSpec::default_map(), &[fast_cfg()], 2, 7, 400);
        assert!(rec.moves > 0);
    }

    #[test]
    fn selfplay_3p_terminates() {
        let rec = play_game(&MapSpec::default_map(), &[fast_cfg()], 3, 11, 400);
        assert!(rec.moves > 0);
    }

    #[test]
    fn selfplay_4p_terminates() {
        let rec = play_game(&MapSpec::default_map(), &[fast_cfg()], 4, 42, 600);
        assert!(rec.moves > 0);
    }

    #[test]
    fn rollout_search_runs() {
        // Exercises the completed-round rollout path (A5, gap 6).
        let mut game = MapSpec::default_map().start_game(4, 1);
        let cfg = AgentConfig {
            sims: 8,
            depth_cap: 4,
            ..Default::default()
        };
        let mut agent = cfg.make(1);
        let action = agent.choose_move(&game);
        assert!(action.is_some());
        game.process(action.unwrap()).unwrap();
        assert!(agent.report().cap_hits > 0 || agent.report().sims > 0);
    }

    /// The 95% interval is what makes a ladder rung mean anything: a raw win
    /// rate over a few dozen games cannot distinguish a real improvement from
    /// noise.
    #[test]
fn head_to_head_reports_a_confidence_interval() {
    let mk = |games: u32, a: u32, b: u32, d: u32| MatchResult {
        games,
        a_wins: a,
        b_wins: b,
        draws: d,
        elo_a: 1500.0,
        elo_b: 1500.0,
    };

    // A dead heat must never read as a win, however many games.
    let tie = mk(400, 200, 200, 0);
    assert!(!tie.a_beats_b_significantly());

    // A narrow edge over few games must not read as a win either.
    let noisy = mk(28, 16, 11, 1);
    assert!(
        !noisy.a_beats_b_significantly(),
        "16-11-1 over 28 games must not be significant"
    );

    // The same 57% edge over 400 games should be decisive.
    let solid = mk(400, 232, 168, 0);
    assert!(solid.a_beats_b_significantly());

    // The interval must actually narrow as evidence accumulates.
    let few = mk(28, 16, 11, 1).a_score_ci95();
    let many = mk(400, 232, 168, 0).a_score_ci95();
    assert!(
        (many.1 - many.0) < (few.1 - few.0),
        "wider sample must give a narrower interval"
    );

    // It must contain the point estimate.
    let (lo, hi) = solid.a_score_ci95();
    assert!(lo <= 0.58 && 0.58 <= hi, "CI {lo}..{hi} must contain 0.58");
}

#[test]
fn gate_is_statistical() {
        // Too few games -> never rejected on fairness.
        let rec = play_game(&MapSpec::default_map(), &[fast_cfg()], 4, 3, 200);
        let m = compute_metrics_with(&[rec], 4, Gate::default());
        assert!(!m.rejected, "gate must not reject below min games");
    }

    #[test]
    fn evaluate_pipeline_runs() {
        let cfg = EvalConfig {
            num_players: 4,
            games: 3,
            seed: 99,
            game_seed: 99,
            max_moves: 300,
            configs: vec![fast_cfg()],
            maps: generate_maps(2, 4, 5),
            gate: Gate::default(),
            budgets: vec![],
        };
        let reports = evaluate(cfg);
        assert_eq!(reports.len(), 2);
        for r in &reports {
            assert_eq!(r.metrics.games, 3);
            assert_eq!(r.games_detail.len(), 3);
        }
    }

    #[test]
    fn head_to_head_runs() {
        let cfg = PuctConfig {
            sims: 8,
            ..PuctConfig::default()
        };
        let r = head_to_head_2p(
            &MapSpec::default_map(),
            2,
            cfg,
            Opponent::Negamax { depth: 1 },
            5,
            300,
        );
        assert_eq!(r.games, 2);
        assert_eq!(r.a_wins + r.b_wins + r.draws, 2);
    }
}
