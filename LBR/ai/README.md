# AI seats in Land Between Rivers

An AI seat is a normal `GamePlayer` with `is_ai = True`. It keeps its seat
number, its user (for display and history) and, on takeover, its full position.
The human behind a taken-over seat becomes a spectator.

Three pieces make it work:

1. **Policy engine** (`LBR/ai-service/bin/lbr-policy`, a static Rust binary
   built from [MihaiAnca13/tigris](https://github.com/MihaiAnca13/tigris)) — maps the LBR blob onto the donor
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
   browser. `Game.autoMoves` holds the claim for the whole run and is released
   when the task ends, so polling clients cannot queue duplicates.

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
  bin/lbr-policy             static (musl) build of the engine, the LBR_AI_BIN default
  models/best.bin            default-board net (803 545 bytes, 243 inputs)
  models/<map>.bin           one net per generated board (twin-bends, long-bend, the-fork)
```

The engine source lives in [MihaiAnca13/tigris](https://github.com/MihaiAnca13/tigris)
(`tigris-and-euphrates/`); the committed binary is built from commit `7912e96`.
The binary never reads the current directory: the model path is always passed by
Django (`settings.BASE_DIR` or `LBR_AI_MODEL`).

## Rebuilding the binary

The binary is committed so a deploy needs no Rust toolchain. After changing the
engine, rebuild it in the tigris checkout and commit it here, with the commit
hash above:

```sh
cd tigris-and-euphrates
rustup target add x86_64-unknown-linux-musl
RUSTFLAGS="-C target-cpu=x86-64" cargo build --release --locked \
  --target x86_64-unknown-linux-musl --bin tigris-and-euphrates
cp target/x86_64-unknown-linux-musl/release/tigris-and-euphrates \
  <OBG>/LBR/ai-service/bin/lbr-policy && strip <OBG>/LBR/ai-service/bin/lbr-policy
```

Build with `target-cpu=x86-64`: a `native` build emits GFNI/AVX-512
instructions and dies with SIGILL on deploy hosts that lack them
(PythonAnywhere's CPU has AVX2 but not GFNI). Check the result with
`objdump -d .../lbr-policy | grep -c gf2p8affineqb`; it must print 0.

Then run `node LBR/ai/smoke.mjs` (and `LBR_MAP=<map> node LBR/ai/smoke.mjs 400`
for each board) to check that every action it returns is legal.

Manual call:

```sh
echo '{"state": <gameData>, "seat": 0}' |
  LBR/ai-service/bin/lbr-policy lbr-move --sims 400 --alpha 0.7 --net LBR/ai-service/models/best.bin
# {"action":{"type":"placeTile","colour":"K","pos":134}}
```

`node LBR/ai/smoke.mjs` plays an AI-vs-AI game through the engine and validates
every returned action with `LBRrules.js`.

## Django settings

| Setting | Default | Meaning |
|---|---|---|
| `LBR_AI_URL` | empty | Compatibility override: POST `{"state","seat"}` to a remote service. Empty uses the local binary. |
| `LBR_AI_BIN` | `BASE_DIR/LBR/ai-service/bin/lbr-policy` | Policy binary. |
| `LBR_AI_MODEL` | `BASE_DIR/LBR/ai-service/models/best.bin` | Default-board weights (`--net`). A board with its own `<map>.bin` beside it uses that instead. |
| `LBR_AI_SIMS` | `2000` | Search simulations per decision, split across 4 hidden-hand determinizations. |
| `LBR_AI_ALPHA` | `0.7` | Network/heuristic blend used by the shipped checkpoint. |
| `LBR_AI_TIMEOUT` | `30` | Per-decision timeout in seconds (subprocess or HTTP). |
| `LBR_AI_NODE` | `node` | Node binary used for the rules step. |
| `LBR_AI_STEP_TIMEOUT` | `30` | Rules-step timeout in seconds. |
| `LBR_AI_RETRY_SECONDS` | `60` | Delay before retrying a failed AI turn. |
| `LBR_AI_MAX_ATTEMPTS` | `2` | Attempts per position before the AI gives up until the next save. |
| `LBR_AI_CLAIM_SECONDS` | `LBR_AI_RETRY_SECONDS + 30` | A claim older than this is treated as abandoned by a crashed worker. |

The Django host needs **node** for the rules step and either the policy binary
plus model or a reachable `LBR_AI_URL`. `node` runs `lbr_step.mjs`, which imports
`LBR/vueLBR/src/js/LBRrules.js` relative to itself, so no working directory is
assumed.

The committed binary is a Linux ELF, so on Windows set `LBR_AI_BIN` to
`LBR/ai-service/bin/lbr-policy.cmd`: it runs the same binary in the default WSL
distribution and translates the Windows `--net` path. Install a distro first
(`wsl --install -d Ubuntu`, or import any small rootfs); the binary is static
musl, so any distro works.

## Model provenance and licensing

Each net is the donor's `runs/<map>/best.bin`, trained by its per-map chain
(`train/all_maps.sh`, donor commit `cf81336`) and copied byte for byte; each
beats the donor heuristic on its own board in a 150-setup paired gate. A net
only fits the engine's 243-input features: replace the source and the weights
together. They were produced by the donor's own self-play pipeline on that engine and
embed no third-party data or code. The donor repository is this project's own
first-party work, so the binary and the weights carry the same terms as the rest
of OBG. The binary statically links the MIT-licensed `minimax-local` crate.

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
  `action` raises in the task: the admins are notified and the task is retried
  with a delay, during which the existing `autoMoves` claim is kept. After
  `LBR_AI_MAX_ATTEMPTS` the position is marked `ai-failed:<latestUpdate>` and the
  AI stops trying it until a save, rewind or replay changes `latestUpdate`. A
  retry whose position moved on, or whose claim was replaced, is dropped
  silently. A claim left behind by a worker that died is replaced once it is
  older than `LBR_AI_CLAIM_SECONDS`.
- An action rejected by `LBRrules.js` is replaced by a legal default and reported
  to the admins. A stale `latestUpdate` is re-checked under the mutex and the
  computed position is discarded.
- AI seats are never notified and never kickout targets. A kicked or resigned
  seat is played on by the AI; its `seat_order` and `gameData` are untouched.

## Migrating from the old external AI service

1. Make sure `LBR/ai-service/bin/lbr-policy` is deployed and executable.
2. Remove `LBR_AI_URL` from `.env` (or leave it empty) so the local binary is
   used. Any old `http://127.0.0.1:8731/move` value would still be honoured as
   the remote-service override.
3. Drop the `lbr_ai` process from your process supervisor; nothing needs to
   listen on a port any more.
4. Leave `LBR_AI_BIN`/`LBR_AI_MODEL` at their defaults unless the binary or
   weights live elsewhere; both must be absolute and readable by the Django-Q
   worker.
5. Restart the Django-Q cluster: tasks import the new worker module.
