# AI seats in Land Between Rivers

An AI seat is a normal `GamePlayer` with `is_ai = True`. It keeps its seat
number, its user (for display and history) and, on takeover, its full position.
The human behind a taken-over seat becomes a spectator.

Three pieces make it work:

1. **Policy engine** (`LBR/ai-service`, Rust) — maps the LBR blob onto the donor
   `TnEGame`, runs the `az` agent with `models/best.bin` (alpha 0.7,
   `hide_hands = true`) and prints one action in LBR's own vocabulary. It only
   *proposes*; it knows no LBR rules and does not touch the database.
2. **`lbr_step.mjs`** — a headless run of `LBRrules.js`, the same rules engine
   the browser uses. It validates the proposed action, applies it, and produces
   the next persisted state. An illegal action never reaches the database: it
   falls back to a rules-derived default and reports the rejection to the admins.
3. **`LBR/ai_worker.py`** — a django-q task. It takes the game mutex, re-checks
   `latestUpdate`, saves through `save_lbr_state` (the same path as a human
   move: notifications, rewind, `endGame` cleanup), then plays the next AI
   decision in the same task until a human seat must act. Only a decision cap
   queues a fresh task, so an AI turn does not wait on the cluster poll or a
   browser. `Game.autoMoves` is used as the one-shot claim marker.

## Why a subprocess and not a daemon

Measured on the reference machine (release build, `--sims 400`, one 4.3 kB
opening position):

| Cost | Time |
|---|---|
| spawn + argument parsing | 1.0–1.2 ms |
| spawn + load `models/best.bin` | 1.6–1.7 ms |
| one decision, one-shot (median) | 349 ms |
| one decision, persistent JSON-lines worker (median) | 344 ms |

Process startup and weight loading are ~0.5 % of a decision, and a persistent
worker saved ~5 ms per move (1.4 %, inside run-to-run noise). A daemon would
add a port, a readiness probe, a shared crash domain and a protocol to
supervise for that. So the worker spawns `lbr-move` once per decision: a crash,
a hang or a corrupt reply costs exactly one decision, and the existing retry
path releases the seat.

## Layout

```
LBR/ai-service/
  Cargo.toml, Cargo.lock     pinned dependency set
  src/game.rs eval.rs features.rs nn.rs az.rs puct.rs solver.rs
  src/maps.rs arena.rs       board layout and the donor search harness
  src/lbr.rs                 LBR <-> donor mapping; proposes one action
  src/main.rs                `lbr-move` (stdin JSON -> stdout JSON)
  minimax/                   MIT-licensed generic search crate (path dependency)
  models/best.bin            777 945-byte trained network
```

Excluded from the donor repository: the desktop/macroquad game, the Python
(`pyo3`/`numpy`) bindings, the self-play/training pipeline (`gen`, `replay`,
`history`), training checkpoints, `target/` and the rulebook transcription. No
`LBR/ai-service` source reads the current directory: the model path is always
passed by Django (`settings.BASE_DIR` or `LBR_AI_MODEL`).

## Build

```sh
cd LBR/ai-service
cargo build --release --locked     # target/release/lbr-policy
cargo test --release               # 119 donor tests
```

The production image builds the same crate in a `rust:1-alpine` stage and copies
the static binary to
`/app/LBR/ai-service/target/release/lbr-policy` (the `LBR_AI_BIN` default).

Manual call:

```sh
echo '{"state": <gameData>, "seat": 0}' |
  ./target/release/lbr-policy lbr-move --sims 400 --alpha 0.7 --net models/best.bin
# {"action":{"type":"placeTile","colour":"K","pos":134}}
```

`node LBR/ai/smoke.mjs` plays an AI-vs-AI game through the engine and validates
every returned action with `LBRrules.js`.

## Django settings

| Setting | Default | Meaning |
|---|---|---|
| `LBR_AI_URL` | empty | Compatibility override: POST `{"state","seat"}` to a remote service. Empty uses the local binary. |
| `LBR_AI_BIN` | `BASE_DIR/LBR/ai-service/target/release/lbr-policy` | Policy binary. |
| `LBR_AI_MODEL` | `BASE_DIR/LBR/ai-service/models/best.bin` | Network weights (`--net`). |
| `LBR_AI_SIMS` | `400` | Search simulations per decision. |
| `LBR_AI_ALPHA` | `0.7` | Network/heuristic blend used by the shipped checkpoint. |
| `LBR_AI_TIMEOUT` | `30` | Per-decision timeout in seconds (subprocess or HTTP). |
| `LBR_AI_NODE` | `node` | Node binary used for the rules step. |
| `LBR_AI_STEP_TIMEOUT` | `30` | Rules-step timeout in seconds. |
| `LBR_AI_RETRY_SECONDS` | `60` | Delay before retrying a failed AI turn. |
| `LBR_AI_MAX_ATTEMPTS` | `5` | Retries before the claim marker is released. |

The Django host needs **node** for the rules step and either the policy binary
plus model or a reachable `LBR_AI_URL`. `node` runs `lbr_step.mjs`, which imports
`LBR/vueLBR/src/js/LBRrules.js` relative to itself, so no working directory is
assumed.

## Model provenance and licensing

`models/best.bin` is the donor checkpoint `runs/best.bin` from commit `f717cb8`
("Add retrained checkpoint runs/best.bin (honest search, h2w)"), copied byte for
byte. It was produced by the donor's own self-play pipeline on that engine; it
embeds no third-party data or code. `minimax/` is the MIT-licensed
`minimax-local` crate (its `LICENSE` is vendored). The donor repository itself
carries **no license file**: the vendored Rust source and the weights are
therefore redistributed under whatever terms the donor owner grants. Get that in
writing before publishing this repository publicly.

## Decisions and limits

- **Treasure** decisions keep the first option. All `keepOptions` share the same
  distance from the board edge, so they are equivalent under the LBR rules; the
  donor's one-at-a-time treasure model does not describe the "keep one, take the
  rest" choice.
- **Support, war order and monument** decisions are searched by the donor engine
  with the pending state reconstructed from the LBR blob (conflicts, supports,
  unification tile, monument offers).
- **Swaps** are decided by the donor search, then applied by `LBRrules.js`.
- A panic inside the donor search is caught and turned into a legal default; the
  game never stalls on the AI.
- A missing binary or model logs one warning and leaves `schedule_ai_turn`
  returning `False` without claiming the turn, so polling clients cannot queue
  tasks that can never run.
- A crash, a non-zero exit, malformed JSON, a timeout or a reply without
  `action` raises in the task: the admins are notified, the task is retried with
  a delay, and the `autoMoves` claim is released after `LBR_AI_MAX_ATTEMPTS`, so
  a later poll or save can try again.
- An action rejected by `LBRrules.js` is replaced by a legal default and reported
  to the admins. A stale `latestUpdate` is re-checked under the mutex and the
  computed position is discarded.
- AI seats are never notified and never kickout targets. A kicked or resigned
  seat is played on by the AI; its `seat_order` and `gameData` are untouched.

## Migrating from the `tigris` checkout

1. `cd LBR/ai-service && cargo build --release --locked`, or rebuild the
   production image (its `lbr-ai` stage does it).
2. Remove `LBR_AI_URL` from `.env` (or leave it empty) so the local binary is
   used. Any old `http://127.0.0.1:8731/move` value would still be honoured as
   the remote-service override.
3. Drop the `lbr_ai` process from your process supervisor; nothing needs to
   listen on a port any more.
4. Leave `LBR_AI_BIN`/`LBR_AI_MODEL` at their defaults unless the binary or
   weights live elsewhere; both must be absolute and readable by the Django-Q
   worker.
5. Restart the Django-Q cluster: tasks import the new worker module.
