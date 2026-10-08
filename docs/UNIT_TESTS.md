# Unit Tests

All backend tests live in the root [`/tests/`](../tests/) package. There are no `tests.py` files inside the Django apps.

Run from the repo root:

```sh
# Everything
.venv/Scripts/python manage.py test

# One file (use the dotted module path)
.venv/Scripts/python manage.py test tests.test_game_creation

# One test class / one test
.venv/Scripts/python manage.py test tests.test_game_creation.RNBGameCreationTests
.venv/Scripts/python manage.py test tests.test_models.TestLockModel.test_is_expired_true

# Speed up repeated runs by keeping the test DB between runs
.venv/Scripts/python manage.py test --keepdb
```

Notes:

- Plain `unittest` via Django's `DiscoverRunner`. Nothing is needed beyond `manage.py test`; pytest is not used.
- Discovery pattern is the default `test*.py`, so new files must be named `test_*.py` in `/tests/`. No settings change is needed — a bare `manage.py test` scans from the project root and picks up the `tests` package.
- The test database is a MySQL mirror DB (see `settings.py`); expect the harmless `django_q.Task: models.W037` warning at startup.
- Full run takes ~60s.

## Contents

| File | Tests | Covers |
|---|---|---|
| `test_lobby.py` | 15 | `BGH_API` JSON parsing (trailing commas); tournament matchmaking (`_compute_game_groups` rematch avoidance, leftovers, ordering); auto-tournament scheduler helpers (pending-creation day, target start size, exact-multiple start trigger) and `find_pending_tournament_to_open` DB queries |
| `test_models.py` | 14 | `User`/`Profile`/`Lock`/`Game`/`GamePlayer` models: `__str__`, profile auto-creation and defaults, lock expiry, `Game` field defaults, `GamePlayer` unique game+player constraint and seat-ordering |
| `test_middleware.py` | 8 | `ForceTrailingSlashMiddleware`: redirects game codes / login / profile / index, no redirect when slash already present or path not covered |
| `test_game_creation.py` | 14 | End-to-end RNB game creation via `POST RNB:createRNBgame`: cannot invite yourself; cannot invite a nonexistent player; solo game (`playerNumber=1`) auto-starts `ACTIVE` and ignores a supplied invite; practice game auto-starts with `SHADOW` bots and stats excluded; valid invite produces a `WAITING` game with the invite recorded; GET rejected; anonymous redirected to login; `privateGame` → `PRIVATE`; too-many invites rejected; module/learning options recorded; 4-player practice seats 3 shadows with display-name notes; `zoomLevels` resized to the actual player count |
| `test_game_creation_all_games.py` | 6 | The same creation rules across all 10 games on the create-new-game page (FCM, RNB, HLC, TGZ, IND, AQY, BUS, CNS, WEB, KFW), each with its own create endpoint: valid invite → `WAITING`; no self-invite; no nonexistent invite; too-many invites rejected (games using `SF_validatePlayers`); practice game auto-starts `ACTIVE` with shadows; GET rejected. Extra per-game POST fields are held in a per-game config. |
| `test_join_game.py` | 12 | `joinGame` lifecycle for RNB: GET rejected; joining a missing game; already joined; creator blacklist; full invite-only `WAITING` game rejects a stranger; joining the last seat starts the game `ACTIVE`; `vacate` deletes the game when the last player leaves but is refused on an `ACTIVE` game; `decline` of the last invite returns the game to `AVAILABLE`; `deleteTrgGame` is creator-only. Plus the start-game kickout timer: the join that fills a game resets `latestUpdate` to now for FCM and RNB, so a game that took days to fill does not start with an already-expired timer. `django_q.tasks.async_task` is patched. |
| `test_availability.py` | 10 | `record_player_availability_for_turn_change` and friends: hour bucketing across midnight, partial-start-hour exclusion, actor-only credit, rewind/redo handling, anchor advance, training-game exclusion |
| `test_shared_functions.py` | 49 | Kickout / flexi-time maths, `SF_serializeGame` flags, tournament round creation (byes, MG top-14 selection, MG no-bye rule, TL lives, availability-aware ordering/grouping via `availabilityMatchmaking`), shared game-creation helpers (`SF_validatePlayers` empty/order/cap/creator/duplicate handling, `SF_setupTrainingGameShadows` default + explicit names) |
| `test_shared_notifications.py` | 7 | `shouldSendEmail`: shadow/bot rejection, unconfirmed email, turn-email suppression for live games, stop-email windows, per-notification-type preferences |
| `test_shared_refs.py` | 47 | Tournament round names, winner HTML, pace strings, points-for-position tables, elapsed-time formatting, round-data sorting |
| `test_tourny_generator.py` | 29 | `tournyGenerator`: multi-game 4p schedules (unique pairings), round-2 group splitting (first/last 7 of 14), `_compute_game_groups` grouping + mini leftovers. Plus `availabilityMatchmaking`: `availability_profile` neutral prior on empty observations, `build_matchup_counts` ignoring byes, `expected_response_wait` / `expected_game_duration` for single-player and 6p daily windows (incl. responses landing a day later or in a different hour), and the annealer's restart-from-best plus group-shape/order preservation for `optimize_disjoint_groups` and `optimize_multigame_order`. `ANNEALING_TIME_LIMIT_SECONDS` is patched down so these stay fast. |
| `test_kfw.py` | 1 | Issue #53: village expansion phase auto-finishes when every builder has already prebuilt |
| `test_rnb_transaction_recovery.py` | 10 | RNB transaction-recovery contract: `saveStackMove` sets `transactionID`, `RNBdata` exposes it, matching ID clears the lock, wrong/missing ID keeps it, Django-Q stuck-notification scheduling and no-op, stale `latestUpdate` rejection |
| `test_robots.py` | 2 | `/robots.txt` GET/POST |
| `test_urr_rewind.py` | 5 | URR legacy and gzip rewind compatibility, mixed rewind stacks and replay branches, twenty-point retention, opening-position extraction from compact replay history, and matching the redo anchor to a client-compacted rewind position |
| `test_fcm_rewind.py` | 6 | FCM `saveNormal` rewind stack: `saveRewind=True` records the pre-save state, `saveRewind=False` records nothing at all, one save makes exactly one rewind point, repeated AI-style saves never grow the stack, and rewinding after your own move returns *your* turn rather than the next player's (FcmAI's) |
| `test_fcm_reset.py` | 5 | Admin "Reset AI": a reset-flagged save replaces `startingMap` and clears the discarded game's rewind stack; the map-sync drift guard still rejects a changed board on an ordinary save, and still rejects a non-admin claiming `resetGame` |
| `test_fcm_passkickout.py` | 5 | FCM "skip turn instead of kickout": a timed-out player's auto-skip move is attributed to *them* (not the clicker) in `saveSimulMove` and `saveNormal` with correct flexi-time credit; the same attribute is refused (syncError) when the target is not the current player, when kickout isn't due, or when the target isn't a participant |
| `test_admin_webhook_guard.py` | 2 | `SN_sendAdminErrorMessage` never posts to the admin Discord webhook while Django is on a test database — directly, and via the FCM map-sync rejection path that prompted it |
| `test_game_end.py` | 8 | `clearGeneralDataOnGameEndWithoutSave` (the shared choke point every presenter's `endGame` calls): per-player `moveDataJSON` / `currentMoveTime` / `currentMoveData` are wiped for all 12 games, the wipe is persisted rather than only in-memory, the Game-level scratch fields are still cleared, and `endGame` still marks exactly one winner. Plus vote cleanup: rewind-consent and kickout votes are refused once a game is FINISHED (delete / stats-exclude votes still allowed), rewind votes still work while ACTIVE, and an FCM `saveNormal` with `status=FINISHED` no longer re-creates `activeVotes` after `endGame` cleared it |
| `test_legacy_game_urls.py` | 6 | Legacy bare game URLs `/GAME/<id>/` redirect to `/GAME/<id>/show/` for BUS, CNS, TGZ, WEB, AQY, KFW, IND — both when the game has no `original_id` (the regression: these views used to query `original_id` only, so every game created after the backfill 404'd) and when it does. Also asserts a genuinely missing id is *not* redirected, that a BUS id does not resolve under CNS, and that `handler404` returns a real HTTP 404 rather than a 200 |

274 tests total (git count may drift slightly as tests are added).

## Momentum and extra statistics

- `tests/test_momentum.py`: shared UTC streak boundaries and resets, duplicate-day credit, practice exclusions, reminders, opt-outs, participant access, stale versions, expired-turn checks and nudge cooldowns. Queueing and delivery are mocked, so these tests do not send messages.
- `tests/test_urr_kickout.py`: timeout/flex-time eligibility, participant and target restrictions, stale kickout requests, polling votes without a game version change, majority and two-day solo kickouts, and rewind cleanup with seat indexes preserved.
- `tests/test_extra_stats.py`: absolute, relative and delta histories, HLC offsets, missing DDL timestamps, lobby/play/final-gap separation, action sample weighting, exclusions and the unlisted page.

Run on Linux with `.venv/bin/python manage.py test tests.test_momentum tests.test_extra_stats --keepdb` (Windows uses `.venv/Scripts/python`).

## Conventions

- `django.test.TestCase` / `SimpleTestCase`, no fixtures — data is created in `setUp` with `User.objects.create_user` etc.
- View tests use `self.client.force_login(...)` + `reverse()`; validation-error messages are asserted via `get_messages(response.wsgi_request)`.
- `PrintSuccessTestCase` (in `test_shared_functions.py` / `test_tourny_generator.py`) prints a `PASS:` line per test so progress is visible in long runs.
- Time-dependent logic is pinned with `unittest.mock.patch` on `time.time`.
- Add new files as `tests/test_<topic>.py` in `/tests/`; the module path for running is `tests.<file_name>`.
- Tests must never reach Discord. `SN_sendAdminErrorMessage` short-circuits when Django is on a `test_` database, and `tests/test_admin_webhook_guard.py` enforces it. Several error paths call it deliberately (FCM's map-sync guard is one), so without that guard a suite run posts to the real admin webhook.

## Known expected failure

`tests/test_rnb_transaction_recovery.py::TransactionRecoveryTest::test_F_FAILING_recovery_player_gets_no_notification` is marked `@unittest.expectedFailure`: it documents the open bug in issue #64 where the notification filter in `RNB/views.py` excludes `request.user`, so the player who triggers recovery is never told it is their turn. Remove the decorator when that filter is fixed.

## URR frontend checks

Run `node URR/vueURR/rulesCheck.mjs` from the repo root. In addition to the rule scenarios, it checks incomplete maintenance-funding previews, input preservation, sale pricing, and throne/overselling restrictions, plus lossless replay compaction, legacy histories, phase checkpoints, inserted/deleted properties and changed arrays, input preservation, cache invalidation after branching, invalid delta rejection, and turn review boundaries, including successive states governed by the same king and required routing/harvest/consent choices.
