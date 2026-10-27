# How The Site Works

Online Board Gamers is a Django site where **the server is intentionally "dumb"**: it handles accounts, the lobby, persistence and coordination, while the browser client owns almost all game rules. This document explains how the pieces fit together.

Other docs in this folder:

- [ADDING_A_NEW_GAME.md](ADDING_A_NEW_GAME.md) — step-by-step checklist for adding a whole new game.
- [ADDING_A_GAME_MODULE.md](ADDING_A_GAME_MODULE.md) — how optional expansion modules (eg FCM) are wired in.
- [UNIT_TESTS.md](UNIT_TESTS.md) — how to run the backend suite, its conventions, the known expected failure and the frontend test runners.

- [Big picture](#big-picture)
- [Apps and URL layout](#apps-and-url-layout)
- [Core models](#core-models)
- [Admin flags](#admin-flags)
- [Presenters](#presenters)
- [Page shell and the game client](#page-shell-and-the-game-client)
- [Turn processing and stale-write protection](#turn-processing-and-stale-write-protection)
- [Game lifecycle](#game-lifecycle)
- [Notifications](#notifications)
- [Tournaments and mini tournaments](#tournaments-and-mini-tournaments)
- [Shared code](#shared-code)
- [Frontends and static assets](#frontends-and-static-assets)
- [Background jobs, site scripts and stats](#background-jobs-site-scripts-and-stats)
- [Configuration and deployment](#configuration-and-deployment)

## Big picture

Several board games by Splotter and friends are implemented as browser clients (mostly Vue 3 + Pinia, some legacy JS). For each game there is a Django app named after the game code (`FCM`, `TGZ`, `AQY`, ...). The `Lobby` app is the shared domain: users, game lists, shared models, notifications, tournaments, and common helpers.

The design rule: **the client owns the rules; the server owns the truth of what was last submitted.** The server rarely validates a move's legality — it verifies *who* is allowed to write and *whether the write is fresh* (see stale-write protection below).

## Apps and URL layout

`OnlineBoardGamers/urls.py` mounts everything:

```python
path("", include("Lobby.urls")),     # lobby, accounts, tournaments at root
path("FCM/", include("FCM.urls")),   # one prefix per game code
path("BUS/", include("BUS.urls")),
# ... RNB/, URR/, DDL/ etc.
```

`Lobby/urls.py` serves the main site: the index (game lists by status), login/register/profile, `createXXXpage/` for each game's creation form, tournament pages, help pages, `joinGame/` / `joinGameLink/` APIs and admin-ish utilities (`DBO`, stats, webhooks).

Each game app's `urls.py` exposes its API under its prefix, always with the same shape:

- `<int:game_id>/show/` — the game page shell (server-rendered HTML)
- `data/<n>/` — polling endpoint the client hits to fetch state
- `processXXXturn/` — the one mutating endpoint the client calls to submit moves
- `sendChatMessageXXX/`, `saveNotesXXX/`, `saveZoom/`, `castVote/`, `bugEntry/` — shared features with per-game wrappers

## Core models

All in `Lobby/models.py`:

- **`User`** (`AbstractUser`) with a one-to-one **`Profile`**: email/notification preferences (per notification type), webhooks (Discord/Slack/Telegram), per-game display preferences (colours etc.), availability tracking arrays. Admin rights are explicit `Profile.is_site_admin` / `is_game_admin` flags only — Django superusers get neither by default, and grant themselves the flags the same way anyone else does (Django admin); views never authorize by username.
- **`Game`**: `gameCode` (3-char choice), `gameName`, `creator`, `host`, `maxPlayers`, `gameStatus` (`AVAILABLE` / `WAITING` / `PRIVATE` / `ACTIVE` / `FINISHED`), `turn`/`phase`, `gameData` (opaque per-game state the client produced, often gzip+base64), `latestUpdate` (monotonic ms timestamp), `startingOptions` (JSON array of option ints), `kickoutDuration`, `zoomLevels`, plus per-game blob fields (`XXXplayersMoveData`, rewind data, ...).
- **`GamePlayer`**: row per (game, human/bot) seat — `seat_order`, `is_current`, `is_kicked`, `is_missing`, `winner`, private `notes`. Unique on (game, player).
- **`Tournament`**: rounds of `Game`s per game code (`Main`/`Mini` categories, `RR`/`PL`/`TL`/`MG` types), `tournamentProgressionData`/`PointsData`/`SideData` JSON, `nextRoundPlayers` M2M.
- **`Lock`**: row backing `db_mutex` (see below).

`Game` has a `PRESENTER_MAP` …→ per-game presenter class (see next section).

## Admin flags

Two independent booleans on `Profile` (`is_site_admin`, `is_game_admin`), read only through `Lobby/sharedFunctions/permissions.py` (`is_site_admin(user)`, `is_game_admin(user)`, `can_act_in_game(user, game)`). **`is_superuser` grants neither** — a superuser gets exactly what its Profile flags say, so grant it the flags like anyone else. The flags are the only source: views never authorize by username. Change them at `/admin` → *Lobby → Profiles* (both columns are list-filterable).

### `is_site_admin` — the site, never a running game

Gates whole pages; false ⇒ 404/403:

- `/userStats` (`Lobby/views.py`) — signups-per-day and last-login charts.
- `/DBO` and `DBO_deleteGame` — browse every game of every type, hard-delete one (unauthorised attempts are webhookbed to the admin Discord).
- Posting a changelog entry.
- Starting a Main tournament.
- `/FCM/gameAdmin` + `gameAdminGetMoveData` (`FCM/views.py`) — the FCM move-data tool.
- RNB maps: set `isVerified`, edit another creator's map, delete a map.

It grants nothing inside a game: no turns, kickouts or rewinds.

### `is_game_admin` — moderating any game

Three overlapping powers, each repeated per game in its `views.py`:

1. **Treated as in the game.** `Lobby/gameViewHelpers.build_show_game_data` forces `involvedPlayer = True` for a game admin, so the show page renders for them (as `pov = -1` observer unless they hold a seat) and `myMove` is computed — an admin can be *offered a turn* in a game they do not play. `GamePresenter.isMyMove` also returns `True` for everybody while no player is `is_current`, so idle games look like everyone's move. FCM (`FCM/views.py`) and TGZ re-check the flag after the helper.
2. **Passes the write gate.** `can_act_in_game(user, game)` = "game admin **or** a seated player" is the standard check at the top of every `processXXXturn` endpoint.
3. **Acts as somebody else, and moderates.** Submit a move under another player's name via the `BKSN` field (FCM, AQY, RNB, DDL); host-level rewind controls without being the host; `resetGame`; skipping the `passKickoutFor` route; flexi-time bookkeeping; `replaceExternalTournamentPlayer` (TGZ); starting-option bypasses (KFW).

It grants no `is_site_admin` page above.

Client-side footnote: HLC's template sets `global.superuser = true` for the literal username `BotKickStarter` (`HLC/templates/HLC/HLCtemplate.html`) — a hardcoded per-game name, unrelated to Django's `is_superuser`.

## Presenters

`Lobby/presenters.py` has one presenter subclass per game (`FCMpresenter`, `RNBpresenter`, ...), all extending `GamePresenter`. The presenter is the server-side owner of game behaviour and is the right seam for anything common:

- `startGame(request)` — flips status to `ACTIVE`, shuffles seats, sends the start notification.
- `sendInviteNotifications`, `sendYourTurnNotification`, end-game notifications (`_sendEndGameNotificationAnyGame` via django_q).
- Current-player bookkeeping (kickout timing, "my move?" flags), voting (`castVote`, rewind-consent), winning logic, game-name display.

`Game.presenter()` looks up `gameCode` in `PRESENTER_MAP`. Views and shared helpers never implement per-game logic directly — add it to the presenter.

## Page shell and the game client

A show view (`FCM/views.py::showFCMgame`, or e.g. `RNB/views.py::showRNBgame`) is a thin wrapper around the shared `build_show_game_data(...)` in `Lobby/gameViewHelpers.py`, which loads the game + players + viewer profile and redirects people who are not involved to the right list. It renders a Django template (`FCM/templates/FCM/showFCMgame.html`) whose only job is to embed the client bundle (`/static/FCM/FCMvuedist/...`) and hand it an init payload (game id, options, starting data, viewer identity).

From then on the browser talks to the API:

1. The client **polls** (or long-polls) a lightweight endpoint (`checkNewData` / `data/`) that mostly returns `latestUpdate` so the client can tell whether anything changed.
2. When the local player makes a move, the client computes the new state locally and **POSTs** it as JSON to `processXXXturn/` — including the new `turn`, `phase`, `status`, next-player list and the serialised game data.
3. The server persists it, updates `latestUpdate`, computes `is_current` seats, and queues notifications.

### Exception: the FCM tutorial

`/FCM/tutorial/` is the one game page that is **not** backed by a `Game` row. `FCM/views.py::tutorial` skips `build_show_game_data` entirely and renders its own template with a hardcoded init payload (`pov = 0`, `playerNames = [you, "FcmTutor"]`, `startingOptions = [SO_STRICT_PAYDAY_FRIDGE, SO_TRAINING_GAME]`, a fixed 2-player `startingMap`). Consequences:

- The whole game lives in the browser, so it never appears in the lobby and refreshing throws it away.
- `personal.tutorial` is set in `FCMmodel.initGame` and short-circuits every mutating function in `FCM_IO.js` (and skips the websocket), so the client never posts to `processTurn/`.
- `SO_TRAINING_GAME` makes it hotseat (no simul phases) and `SO_STRICT_PAYDAY_FRIDGE` makes Payday/Clean-up resolve in `endPlayerTurn` rather than via `savePreTurn`, which is what keeps it off the server. Real Practice games use the same pair.
- `src/components/tutorial/` drives it: `tutorialScript.js` is the readable step list, `FcmTutor.js` the scripted opponent, `FcmTutorial.js` the engine, `TutorialPanel.vue` the overlay.

## Replay

Games that offer a replay rebuild the game in the browser from the stored history, one entry at a time, and store a full snapshot per entry so stepping is O(1). The pattern is the same everywhere: reset the model to a seed derived from the first history entry plus the immutable per-player identity, walk the remaining entries calling the same model mutations live play uses, and snapshot after each.

- `FCM/vueFCM/src/js/FCMreplay.js` and `TGZ/vueTGZ/src/js/TGZreplay.js` (both Vue).
- `HLC/static/HLC/JS/HLCreplay.js` (raw JS).

The mutations are split into `XXX` and `XXX_core`: `XXX` is the live wrapper and may read in-the-moment state (current player, what is being placed right now), logs the history and paints the UI. `XXX_core` takes the player index and everything else it needs as arguments, touches no DOM and never logs, so the replay can call it without a live board. Replay-specific flags (`showingReplay` etc.) make the shared `Rules`/`canPlay` helpers stand down while stepping.

History entries have been extended over time, so every reader detects old vs new style from the shape of the stored param rather than a version field - old games keep working unchanged.

URR’s opening nation division uses a central six-card grid and a compact side map. The map opens in a dialog fitted to the window using the same live map component, preserving nation highlights and hex inspection. Offer and purchase confirmation stays inline beneath the grid, with bidding controls disabled until confirmation or Undo. During review, the top bar, player strip, and holdings panel continue to show the draft’s acting player; the next player appears after confirmation. Cards contain the offer/purchase controls and Map button; printed card artwork supplies the name, treaty price, and income. Nation cards show interested-player icons in bidding order, with an amount only beside the highest bidder. Player names appear in the top player-order strip; other identity displays use markers with names in tooltips and accessible labels. The acting bidder is highlighted during auctions; withdrawn players leave the list. All bidder markers remain in game data to determine auction eligibility and order. Treasury displays distinguish available money from highest-bid reservations, which are released when outbid and paid when awarded. Later phases retain the board-centered layout. Action buttons share a global appearance in `App.vue`, including preview dialogs; hover, focus, selected, and disabled states use the same styling across panels.

URR stores only compact replay records in `store.history` and derives positions on demand with a non-persisted cache; saves carry those records, re-encoded into the current shape on export (`URRhistoryStorage.js`). Each move stores a numeric action code, the player, the seconds since the previous entry, and only the action's parameters, so a pass is three numbers. Optional parameters come last so absent ones drop out, and parameters with a fixed vocabulary (card kind, harvest choice) are stored as an index into their `URRreference.js` table rather than as a string. Area parameters store the board's `row * 10 + column` index instead of their `printed-` id, and `gameflow.developmentStep` and `gameflow.endReason` store their index into `DEVELOPMENT_STEPS` and `END_REASONS`; every one of them decodes text unchanged, so a save written by an older build still loads. Saved models are gzip+base64 positional arrays: `URRfuncs.js` owns export/import, the board stores index-keyed deltas with trailing defaults omitted, and game-over saves keep only the final screen's state plus replay. Opening corrections are retained in finished-game replay. Privately owned Barahshum can be exchanged only before the normal action on its owner’s settlement turn, without consuming that turn; assimilated Barahshum remains available during its owning state’s development turn. Development proceeds without Barahshum interruptions or skip-prompt controls. Records are re-encoded on every save instead of migrated on load; the project is still in development. Old between-state positions automatically advance to the next state. Every committed turn saves its previous position as a rewind point; individual actions remain available in replay. URR holds uncommitted actions in local `turnDraft` checkpoints until End Turn, with Undo and Reset Turn restoring both state and history. Skipping Eridu commits the turn directly; Eridu canal review offers Undo without the duplicate Reset Turn control. Barahshum canal selection can be canceled to return to the normal turn actions. Selected hex details remain in map tooltips rather than a separate footer. Settlement land actions use an editable ordered timeline with same-terrain sale batches, one replaceable purchase, and previews of cash, markets, and leadership. Complete Turn submits that timeline through the existing `tradeLand` before/buy/after format and saves once. Sale lockouts appear on the board and purchase controls; primogeniture bids and passes commit directly. Development tracing starts on the map and selects the smallest fitting unused crew, with a manual override. Equipment choices highlight legal sites and preview treasury, private contributions, consent, and era/maintenance consequences. Waterwork agreement requests remain editable during construction; End Turn sends queued requests to landowners. The final acceptance finishes the state’s development; a decline restores editable construction checkpoints and blocks that site for the current state turn. The saved development plan retains earlier approvals when rebuilding those checkpoints. Mandatory crew funding previews partial same-terrain sale batches through the same sale validator used on submission; its turn confirmation resolves the sales, hires the crew, and finishes development in one save. Decision boundaries include actor, state, phase, routing source, and consent changes, including successive turns belonging to the same player. Importing a newer saved position discards a stale draft; saves retain the existing stale-write protection. Completed water-routing history offers automatic or manual playback built by rerunning the recorded allocations on a copy. Optional routing trace callbacks describe river movement, diversions, irrigation, returns and outflow; playback uses the historical board and never mutates live state. Uncommitted routing completions do not offer playback. New URR rewind points reuse the compressed client model. Both practice-game and regular-game rewind controls require confirmation before loading and saving a previous turn.

## Turn processing and stale-write protection

Every mutating endpoint goes through `process_game_with_mutex(request, handler, mutex_prefix=...)` (`Lobby/gameViewHelpers.py`):

- POST + JSON body required, `gameID` extracted.
- Acquires a DB mutex (row in the `Lock` table, `Lobby/sharedFunctions/db_mutex.py`) so two players submitting simultaneously cannot interleave.
- Inside, the handler compares the request's `latestUpdate` with the DB's. If the request is older → the server replies with a `syncError` payload instead of applying the write; the client re-syncs from the data endpoint. This is the core defence against double-submits and stale tabs.

- The handler also checks that the caller is a player in that game (or a game admin) via `Lobby.sharedFunctions.permissions.can_act_in_game`. `latestUpdate` is visible to spectators, so it is not an authorization control. Read-only actions (`load`, `refreshChat`, `getBoatMeeplesAndSkills`) stay open to spectators. DDL is still being reworked and is not covered yet.

RNB adds one more layer: during multi-step "stack" moves the game holds a `transactionID`; a disconnect can be recovered by re-posting the same transaction (see `tests/test_rnb_transaction_recovery.py`).

## Game lifecycle

- **Creation**: `Lobby/views.py::createXXXpage` renders `Lobby/templates/Lobby/createXXX.html`; its form POSTs to the game app's `common.py::create_<code>_game`, which validates invites via `SF_validatePlayers` (no self-invites, no unknown users), creates `Game` + `GamePlayer` rows, and either:
  - starts immediately (solo / practice "trainingGame" / tournaments → `presenter.startGame`), or
  - waits (`WAITING` for invites, `AVAILABLE`/`PRIVATE` open games) in the lobby lists.
- **Joining**: `joinGame` / `checkJoinGame` in `Lobby/views.py` handle join/leave/decline/kick actions from the lobby lists; joining a `WAITING` game that reaches `maxPlayers` starts it.
- **Playing**: see above. Kickout logic (`SF_kickoutRequired`, pace strings in `sharedRefs`) flags idle players; pace is a constant (`Lobby/sharedFunctions/constants.py`, e.g. `KICKOUT_1_DAY`).
- **Finishing**: the client submits final positions; the presenter records winners, stats and the end-game notification. Rematch prefills the create page via `createXXXpage/<gameID>/`.

## Notifications

`Lobby/sharedFunctions/sharedNotifications.py` is the single place emails/webhooks/discord DMs are sent. Views never send mail — they queue `async_task("...SN_sendXXX", ...)` (django-q) and the worker sends later. `Profile` preferences + `shouldSendEmail` gate every type (also used by unit tests).

### Shared daily momentum and turn nudges

- `Lobby/sharedFunctions/hotStreaks.py` records one shared streak day per match when an actual current player submits through `GamePresenter.setCurrentPlayersFromArrInTurnOrder(..., acting_username=...)`. Consecutive UTC days extend the streak; a missed day resets it on the next move. Best streak is retained. Initialization, bots, shadow and practice games do not count. Existing matches start tracking with their next move; there is no history backfill.
- `Game.streakDays`, `streakBestDays`, and `streakLastMoveDate` hold the shared state. Lobby rows display 🔥 for positive streaks beside the game name; each Vue app bundles its own copy of `components/utils/TurnNudge.vue` (`components/Utils/` in RNB). URR renders a native kickout dialog with flex-time, majority voting, confirmation, the two-day solo-vote countdown, and Nudge. Its polling refreshes timeout, vote, and missing-seat data even when the game version is unchanged. Abandoned seats retain their indexes and holdings; a conservative client bot passes optional actions and plays mandatory actions through the existing rules. The next remaining player in seat order persists those moves; missing seats cannot win or initiate kickouts. DDL, which has no kickout dialog, renders reminder controls in its Vue panels; the backend supplies eligible overdue targets. HLC adds its Nudge button in its own legacy kickout builder and opens the common `gameMomentum.html` / `gameMomentum.js` dialog explicitly. No shared script observes or inserts controls into the game DOM.
- Each first move of a UTC day queues a single Django Q check for 22:00 UTC the next day. `SN_sendHotStreakReminder` rechecks the match's status and last move date, then only notifies current players who enabled both `Profile.hotStreakEnabled` and `hotStreakReminders`. Reminders default off. Email also respects existing turn-email settings, confirmed addresses, pauses and game pace; Discord/webhooks use the configured channels.
- `Lobby/momentumViews.py` serves participant-only momentum and nudge endpoints. Nudges require a current expired turn, another active participant, a matching `latestUpdate`, and the normal `processTurn_<id>` mutex. They queue after commit and share a 24-hour cooldown per target per match. They do not modify `latestUpdate`, kickout timers, votes, or game data.
- `GamePlayer.lastNudgedAt` and `lastNudgedBy` preserve an in-game reminder; `SN_sendTurnNudge` revalidates before external delivery. `Profile.receiveTurnNudges` controls receiving nudges. Turning off streaks hides them and stops streak reminders for that player, while the shared match streak keeps tracking for others.

### Extra timing statistics

`/extraStats` (also `/extraStats/`) is unlisted and returns `X-Robots-Tag: noindex, nofollow`; it has the same public access as Stats. `Lobby/extraStats.py` decodes finished-game exports explicitly for each game and caches aggregate results for an hour. The page compares average and median game duration, lobby wait, recorded actions per player and time between player actions in four vertical bar charts and a table with column headers, with game tabs and player-count filters.

Timing uses wall time between the first and last history timestamps. Entries exactly at creation (synthetic setup/seed events) are ignored for timing. Player actions are seat-assigned history entries (which can include automatic events), not a count of submitted turns. Timestamp formats include absolute time, creation-relative time, cumulative deltas, and HLC reference-relative offsets. BUS also has MessagePack and legacy JSON exports with different history slots. Unsupported or inconsistent histories are reported in coverage counts rather than guessed; DDL's existing snapshot histories have no timestamps and only contribute action counts. Practice, solo, shadow, FcmAI and stats-excluded games are omitted. The page reuses the Stats icon tabs and shared tab CSS. `/extraStats?demo=FCM` shows a labeled synthetic FCM preview generated in memory; it does not create games or replace cached real statistics. Local SQLite development automatically shows this preview when FCM has no usable timings; `?demo=off` shows real data.

## Tournaments and mini tournaments

- Main tournaments are opened automatically per season by `siteUtils/AutoTournyStart.py`; players join, and once the count hits a "perfect multiple" of `maxGamePlayers` the tournament starts (`auto_tournament_helpers.py` decides the target size).
- Each round generates games through `SF_createNextRoundGamesSetup` (`sharedFunctions.py`) which pairs/buses players, honours byes and avoids rematches (`tournyGenerator.py`), then calls the per-game `create_<code>_game(..., tournamentObj=..., current_players_usernames=...)`.
- Mini tournaments are user-created (`createXXXminiTournament` in `Lobby/views.py`) and share the same game-generation path with optional rewind auto-enable.

## Shared code

- `Lobby/sharedFunctions/sharedRefs.py` — display helpers and the central registry of game codes (`SR_GAMES_CODES_AND_NAMES_CHOICES`), starting-option icons, points tables.
- `Lobby/sharedFunctions/constants.py` — shared starting-option ids, kickout/pace constants.
- `Lobby/sharedFunctions/sharedFunctions.py` — kickouts, flexi-time, game serialisation for lists, next-round setup.
- `Lobby/gameViewHelpers.py` — show-page/notes/votes/zoom/bug helpers and the mutex wrapper.
- `Lobby/sharedFunctions/availability.py` — per-player play-time tracking (hourly buckets on `Profile`).

Anything a new game needs already lives here — games should call these, not fork them.

## Frontends and static assets

Two kinds of client exist per game:

- **Vue workspaces** `vue<CODE>/src` (e.g. `FCM/vueFCM/src` with `model/`, `controller/`, `js/`, `stores/`) — the modern clients. Built artifacts land in `static/<CODE>/<CODE>vuedist/` and are served by Django. Builds fill the dist and delete the generated `images/` folder (see `FCM/vueFCM/FCM.bat`).
- **Legacy static JS** in `static/<CODE>/<CODE>dist/` or `JS/` for older clients.

Source is authoritative; never hand-edit `*vuedist`. HTML shells are Django templates under `<GAME>/templates/<GAME>`, translated via `{% load i18n %}`.

## Background jobs, site scripts and stats

- **django-q** (`Q_CLUSTER` in settings) runs notification tasks and scheduled jobs against the ORM queue.
- **`siteUtils/`** holds operational scripts (run by cron/scheduler on the server):
  - `AutoTournyStart.py` — opens/starts season tournaments.
  - `AutoSiteSweeper.py` + `Auto24HourTimeoutSummary2.py` — kick out idle games, daily summaries.
  - `AutoTurnReminder.py` — turn reminders.
  - `calcStats*.py` — per-game stats pages (FCM `/FCM/FCMstats/` uses `calcStats_FCM.py`).
  - `DBbackup.py` / `ZDBops.py` — DB dumps.
- `DBO` views (`Lobby/views.py`) expose some of these as admin-only pages.

## Configuration and deployment

- Settings: `OnlineBoardGamers/settings.py` — app list, middleware, `Q_CLUSTER`, per-game `*_USE_SOURCE_CODE` flags (serve source instead of built dist while developing, e.g. `FCM_USE_SOURCE_CODE`, `RNB_USE_SOURCE_CODE`).
- Config comes from `.env` via `python-decouple` (`config(...)`): DB credentials, `ADMIN_DB_KEY`, email/dicord tokens. Production runs on PythonAnywhere with MySQL; local dev can use the sqlite or docker-compose (MySQL 9) paths.
- Dev workflow: `A_Run_All_Servers.bat` starts Django + the Vue dev servers for active workspaces; games run at `http://localhost:8000`.
- Tests: root `/tests/` package, run with `manage.py test`; see [UNIT_TESTS.md](UNIT_TESTS.md).

## Glossary

| Term | Meaning |
|---|---|
| Game code | 3-letter app/game id (`FCM`, `RNB`, ...) — app name, URL prefix, DB discriminator |
| `latestUpdate` | ms timestamp bumped on every accepted write; clients poll it; stale posts are rejected |
| starting options | ints in `Game.startingOptions` describing toggles/modules chosen at creation |
| Presenter | per-game server-side behaviour class behind `Game.presenter()` |
| Shadow player | `SHADOW*` placeholder accounts practice games seat real players against |
| GameData | opaque client-owned state blob persisted by the server |
