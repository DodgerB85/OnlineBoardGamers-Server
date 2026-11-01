//! LBR policy engine: propose one action for the seat to move.
//!
//! The rules that *apply* an action stay in `LBRrules.js`, run headlessly by
//! `LBR/ai/lbr_step.mjs`. This binary only proposes; an action outside the
//! rules engine's vocabulary is rejected there and never reaches the database.
//!
//! Usage: `lbr-policy lbr-move [--sims N] [--alpha A] [--net PATH]`
//!   stdin:  {"state": <LBR gameData>, "seat": <n>}
//!   stdout: {"action": {...}}
//!
//! `--net` is an explicit path chosen by the caller (Django settings): the
//! binary never looks for weights relative to the current directory.
#![allow(dead_code)]

pub mod arena;
pub mod az;
pub mod eval;
pub mod features;
pub mod game;
pub mod lbr;
pub mod maps;
pub mod nn;
pub mod puct;
pub mod solver;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match args.first().map(String::as_str).unwrap_or("") {
        "lbr-move" => cmd_lbr_move(&args),
        _ => {
            eprintln!(
                "usage: lbr-policy lbr-move [--sims N] [--alpha A] [--net PATH]\n\
                 \x20 stdin: {{\"state\": <gameData>, \"seat\": N}} -> stdout: {{\"action\": {{...}}}}"
            );
            std::process::exit(2);
        }
    }
}

/// One LBR decision from a JSON request on stdin.
fn cmd_lbr_move(args: &[String]) {
    use std::io::Read;

    let sims = arg_u64(args, "--sims", 400) as u32;
    let alpha = arg_f32(args, "--alpha", 0.7);
    // No default path: without --net the engine searches with the heuristic
    // evaluator instead of silently reading weights from the cwd.
    let net = load_net_or_die(&arg_str(args, "--net", ""));

    let mut input = String::new();
    if let Err(error) = std::io::stdin().read_to_string(&mut input) {
        eprintln!("cannot read stdin: {error}");
        std::process::exit(2);
    }
    let request: serde_json::Value = match serde_json::from_str(&input) {
        Ok(value) => value,
        Err(error) => {
            eprintln!("bad request JSON: {error}");
            std::process::exit(2);
        }
    };
    match lbr::choose_move_json(&request, sims, alpha, net.as_deref(), fresh_seed()) {
        Ok(action) => println!("{}", serde_json::json!({"action": action})),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}

fn load_net_or_die(path: &str) -> Option<az::SharedNet> {
    if path.is_empty() {
        return None;
    }
    match az::load_net(path) {
        Ok(n) => Some(n),
        Err(e) => {
            eprintln!("{e}");
            std::process::exit(1);
        }
    }
}

fn fresh_seed() -> u64 {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    nanos
        .wrapping_mul(0x9E37_79B9_7F4A_7C15)
        ^ (std::process::id() as u64).rotate_left(32)
}

fn arg_u64(args: &[String], key: &str, default: u64) -> u64 {
    args.iter()
        .position(|a| a == key)
        .and_then(|i| args.get(i + 1))
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

fn arg_str(args: &[String], key: &str, default: &str) -> String {
    args.iter()
        .position(|a| a == key)
        .and_then(|i| args.get(i + 1))
        .cloned()
        .unwrap_or_else(|| default.to_string())
}

fn arg_f32(args: &[String], key: &str, default: f32) -> f32 {
    args.iter()
        .position(|a| a == key)
        .and_then(|i| args.get(i + 1))
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}
