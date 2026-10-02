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
| `test_game_creation.py` | 5 | End-to-end RNB game creation via `POST RNB:createRNBgame`: cannot invite yourself; cannot invite a nonexistent player; solo game (`playerNumber=1`) auto-starts `ACTIVE`; practice game auto-starts with `SHADOW` bots and stats excluded; valid invite produces a `WAITING` game with the invite recorded |
| `test_availability.py` | 10 | `record_player_availability_for_turn_change` and friends: hour bucketing across midnight, partial-start-hour exclusion, actor-only credit, rewind/redo handling, anchor advance, training-game exclusion |
| `test_shared_functions.py` | 32 | Kickout / flexi-time maths, `SF_serializeGame` flags, tournament round creation (byes, MG top-14 selection, TL lives), shared game-creation helpers (`SF_validatePlayers`, `SF_setupTrainingGameShadows`) |
| `test_shared_notifications.py` | 7 | `shouldSendEmail`: shadow/bot rejection, unconfirmed email, turn-email suppression for live games, stop-email windows, per-notification-type preferences |
| `test_shared_refs.py` | 47 | Tournament round names, winner HTML, pace strings, points-for-position tables, elapsed-time formatting, round-data sorting |
| `test_tourny_generator.py` | 15 | `tournyGenerator`: multi-game 4p schedules (unique pairings), round-2 group splitting (first/last 7 of 14), `_compute_game_groups` grouping + mini leftovers |
| `test_kfw.py` | 1 | Issue #53: village expansion phase auto-finishes when every builder has already prebuilt |
| `test_rnb_transaction_recovery.py` | 10 | RNB transaction-recovery contract: `saveStackMove` sets `transactionID`, `RNBdata` exposes it, matching ID clears the lock, wrong/missing ID keeps it, Django-Q stuck-notification scheduling and no-op, stale `latestUpdate` rejection |
| `test_robots.py` | 2 | `/robots.txt` GET/POST |

189 tests total (git count may drift slightly as tests are added).

## Conventions

- `django.test.TestCase` / `SimpleTestCase`, no fixtures — data is created in `setUp` with `User.objects.create_user` etc.
- View tests use `self.client.force_login(...)` + `reverse()`; validation-error messages are asserted via `get_messages(response.wsgi_request)`.
- `PrintSuccessTestCase` (in `test_shared_functions.py` / `test_tourny_generator.py`) prints a `PASS:` line per test so progress is visible in long runs.
- Time-dependent logic is pinned with `unittest.mock.patch` on `time.time`.
- Add new files as `tests/test_<topic>.py` in `/tests/`; the module path for running is `tests.<file_name>`.

## Known expected failure

`tests/test_rnb_transaction_recovery.py::TransactionRecoveryTest::test_F_FAILING_recovery_player_gets_no_notification` is marked `@unittest.expectedFailure`: it documents the open bug in issue #64 where the notification filter in `RNB/views.py` excludes `request.user`, so the player who triggers recovery is never told it is their turn. Remove the decorator when that filter is fixed.
