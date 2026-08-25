# AGENTS.md

## Purpose

This repository is a Django-backed online board gaming site where most game logic still lives on the client. Agents working here should optimize for small, safe, pattern-matching changes that fit the existing architecture. Do the requested work, verify it sensibly, and stop. Do not turn a simple task into a redesign.

## Project History And Intent

- The project started from a desire to add expansion content for FCM when that was not happening elsewhere.
- It began as a hobby project, built by following the pattern of the earlier site: keep the server relatively "dumb" and let the client own most game rules and state transitions.
- Django was chosen because that was the backend framework already familiar from a short web course.
- In hindsight, a unified JS client/server stack may have been more convenient long term, and there is still a long-term goal of moving the server toward JS, but that is a large future project, not something to advance accidentally during routine tasks.

## Architectural Summary

- Django is the shell around the whole site: auth, lobby, profiles, tournaments, admin, notifications, and game persistence.
- `Lobby` is the central domain app. It contains the shared `Game` / `GamePlayer` / `Tournament` models, shared presenters, common helpers, middleware, notifications, and most cross-game behavior.
- Each game lives in its own Django app (`FCM`, `TGZ`, `AQY`, `WEB`, etc.) with its own views, templates, assets, and often a separate frontend workspace.
- The server usually stores and serves state rather than enforcing every rule. Common responsibilities are:
  - persist `gameData`, chat, rewind data, options, kickout timing, and version stamps
  - render the page shell / init payload
  - coordinate turn ownership, kickouts, notifications, tournaments, and admin flows
  - reject stale writes via `latestUpdate`
- The client usually owns the detailed game rules, move generation, replay logic, and most gameplay flow.

## Important Repo Map

- `OnlineBoardGamers/settings.py`
  - global config, apps, middleware, static handling, Django Q, env-dependent behavior
- `OnlineBoardGamers/urls.py`
  - top-level routing for all apps
- `Lobby/models.py`
  - core `User`, `Profile`, `Game`, `GamePlayer`, `Tournament`, lock table
- `Lobby/views.py`
  - lobby pages, account flows, tournament flows, admin utilities, API-style endpoints
- `Lobby/presenters.py`
  - shared game behavior and game-specific presenter logic
- `Lobby/gameViewHelpers.py`
  - newer shared helpers for show-page setup, notes, votes, zoom, bug reports
- `Lobby/sharedFunctions/`
  - notifications, refs/constants, mutex, generic helper code
- `<GAME>/views.py`
  - per-game endpoints and server-side coordination
- `<GAME>/common.py`
  - game creation helpers where present
- `<GAME>/templates/<GAME>/`
  - Django-rendered page shells
- `<GAME>/vue<CODE>/src`
  - source for newer Vue frontends, when present
- `<GAME>/static/<GAME>/<GAME>vuedist` or similar
  - built frontend artifacts served by Django

## Working Rules For Agents

### 1. Prefer surgical changes

- Fix the requested issue in the narrowest place that makes sense.
- If a bug is confined to one game, start in that game. Do not generalize across all games unless the shared code is already clearly the right home.
- Do not use a simple task as an excuse to unify patterns, rename things broadly, move layers around, or "clean up" unrelated duplication.

### 2. Respect the client-heavy design

- Do not move gameplay logic from client to server unless the task explicitly requires that.
- Do not assume the server should become the rules engine just because that would be cleaner in a greenfield system.
- If the client already owns a rule, keep the fix on the client side unless persistence or turn coordination truly belongs on the server.

### 3. Follow existing local patterns

- Match the style of the file you are editing.
- This repo is mixed-style and mixed-era by design. Do not mass-reformat files.
- Prefer explicit conditionals and straightforward data handling over clever abstractions.
- Keep existing serialization/compression formats intact.

### 4. Reuse shared code only when it is already genuinely shared

- If a behavior is already centralized in `Lobby/gameViewHelpers.py`, `Lobby/presenters.py`, or `Lobby/sharedFunctions/`, extend that rather than duplicating it.
- If similar code exists across games but is still intentionally separate, do not force a shared abstraction during a routine change.

### 5. Preserve legacy compatibility

- Old URLs may redirect through `original_id`; do not break these flows casually.
- Data fields have legacy shapes. Examples:
  - `zoomLevels` is JSON in some games and a fixed-width string in older FCM code
  - `chatData` may be gzip/base64 or `lzstring` depending on the game
  - `rewindData` has both newer JSON-array handling and legacy compatibility shims
- Never assume one game's storage format applies to another.

## Backend Conventions

- Mutating game endpoints commonly:
  - require `POST` or `PUT`
  - parse JSON request bodies
  - load `Game` by `id` and `gameCode`
  - compare request `latestUpdate` to DB `latestUpdate`
  - update `turn`, `phase`, `gameData`, current players, and notification state
  - save before sending notifications
- When you touch turn-processing endpoints, preserve:
  - stale-write protection
  - kickout timing updates
  - notification behavior
  - rewind handling
- Concurrency matters. Mutating endpoints often use `db_mutex(...)`. Do not remove or bypass that lightly.
- Presenter methods are an important seam. Check there before duplicating host-change, current-player, vote, or notification logic.

## Frontend Conventions

- Newer frontends are usually Vue 3 + Pinia + Vite, but code is often organized in a custom way:
  - `model`
  - `controller`
  - `funcs`
  - `history`
  - `IO` / websocket modules
  - Pinia stores for long-lived state
- Prefer editing source in `vue<CODE>/src` when that source exists.
- Do not hand-edit built `*vuedist` output if the real source workspace is present, unless the task is explicitly about a built artifact and source is unavailable.
- Build the RNB frontend with `RNB/vueRNB/rnb.bat` (run from that directory). It runs `npm run build`, deletes the generated `RNB/static/RNB/RNBvuedist/images/` folder from the dist (that folder is not kept in the repo), then starts the dev server. Use this rather than running `npm run build` bare, or you will leave the unwanted `images/` directory behind.
- Some older or transitional games do not have complete source-side parity in this repo. In those cases, work with what actually exists instead of inventing a large migration.

## Tests And Verification

- The automated test footprint is currently very light. Many `tests.py` files are still placeholders.
- Default rule: do not add tests unless there is already a meaningful nearby pattern to follow, or the user explicitly asks for tests.
- Do not introduce a new testing approach as part of a small feature or bugfix.
- Prefer targeted verification:
  - read the affected flow carefully
  - run a focused command if one exists
  - describe what you verified and what you could not verify

## Code Style Notes

- Python formatting is permissive here:
  - `black` and `ruff` use a very long line length
  - explicit, practical code is preferred over over-factored code
- Frontend formatting is also permissive:
  - tabs are common
  - semicolons are usually omitted
  - line width is intentionally wide
- Preserve existing naming and structure in the touched file unless a rename is necessary for correctness.

## Refactoring Policy

Avoid "drive-by architecture work." In particular, do not:

- refactor multiple game apps because they look similar
- migrate data fields to new schemas during a small task
- convert client-owned logic into server-owned logic as a side quest
- replace local conventions with your preferred framework pattern
- reformat entire files or directories
- add broad abstractions to remove a little duplication

Small cleanup is welcome only when it is directly adjacent to the task and clearly lowers risk.

## Practical Default Workflow

1. Read the relevant app plus any shared helper it depends on.
2. Identify whether the change belongs in:
   - a game app
   - a shared helper
   - a presenter
   - a Vue source workspace
   - a Django template shell
3. Make the smallest coherent change.
4. Verify with the lightest realistic check.
5. Report what changed, what was verified, and any remaining uncertainty.

## If You Are Unsure

- Bias toward minimalism.
- Bias toward preserving behavior outside the requested scope.
- Bias toward matching existing code over introducing cleaner-but-broader designs.
- If a change would pull the repo toward a bigger server/client rewrite, stop and treat that as a separate project.
