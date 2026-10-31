# AI seats in Land Between Rivers

An AI seat is a normal `GamePlayer` with `is_ai = True`. It keeps its seat
number, its user (for display and history) and, on takeover, its full position.
The human behind a taken-over seat becomes a spectator.

Three pieces make it work:

1. **Rust policy service** (`/home/mihai/personal/tigris/tigris-and-euphrates`,
   `src/lbr.rs`) — maps the LBR blob onto the donor `TnEGame`, runs the shipped
   `az` agent with `runs/best.bin` (alpha 0.7, `hide_hands = true`) and returns
   one action in LBR's own vocabulary.
2. **`lbr_step.mjs`** — a headless run of `LBRrules.js`, the same rules engine
   the browser uses. It validates the returned action, applies it, and produces
   the next persisted state. An illegal action never reaches the database: it
   falls back to a rules-derived default and reports the rejection to the admins.
3. **`LBR/ai_worker.py`** — a django-q task. It takes the game mutex, re-checks
   `latestUpdate`, saves through `save_lbr_state` (the same path as a human
   move: notifications, rewind, `endGame` cleanup), then queues the next AI
   seat. `Game.autoMoves` is used as the one-shot claim marker.

## Running the service

```sh
cd /home/mihai/personal/tigris/tigris-and-euphrates
cargo build --release
./target/release/tigris-and-euphrates lbr-serve \
  --host 127.0.0.1 --port 8731 --sims 400 --alpha 0.7 --net runs/best.bin
```

`POST /move` with `{"state": <gameData>, "seat": <n>}` returns
`{"action": {...}}`. `GET /health` returns `{"ok": true}`. The request carries
the full position, so the service is stateless and restartable; the agent uses a
fresh seed per request and never sees the opponents' hands.

`node LBR/ai/smoke.mjs` plays an AI-vs-AI game through the service and validates
every returned action with `LBRrules.js`.

## Django settings

| Setting | Default | Meaning |
|---|---|---|
| `LBR_AI_URL` | `http://127.0.0.1:8731/move` | Service endpoint. Empty disables AI seats. |
| `LBR_AI_TIMEOUT` | `30` | HTTP timeout in seconds. |
| `LBR_AI_NODE` | `node` | Node binary used for the rules step. |
| `LBR_AI_STEP_TIMEOUT` | `30` | Rules-step timeout in seconds. |
| `LBR_AI_RETRY_SECONDS` | `60` | Delay before retrying a failed AI turn. |
| `LBR_AI_MAX_ATTEMPTS` | `5` | Retries before the marker is released. |

The Django worker host therefore needs **node** (the production image installs
it) and network access to the service. The AI-only opening position is dealt by
`lbr_step.mjs` too, so an all-AI game needs no browser.

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
- If the service is unreachable, the task retries with a delay, reports to the
  admins and releases the claim after `LBR_AI_MAX_ATTEMPTS`, so a later poll or
  save can try again.
- AI seats are never notified and never kickout targets. A kicked or resigned
  seat is played on by the AI; its `seat_order` and `gameData` are untouched.
