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

- Plain `unittest` via Django's `DiscoverRunner`. Nothing is needed beyond `manage.py test`; pytest is not used. Tests use the plain staticfiles storage (`settings.TESTING`), so `collectstatic` is not a prerequisite for rendering pages.
- Discovery pattern is the default `test*.py`, so new files must be named `test_*.py` in `/tests/`. No settings change is needed — a bare `manage.py test` scans from the project root and picks up the `tests` package.
- The suite uses whatever `settings.py` points at (the MySQL mirror on the server, sqlite locally); expect the harmless `django_q.Task: models.W037` warning at startup.
- A full run takes a few minutes.

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
- Tests must never reach Discord. `SN_sendAdminErrorMessage` short-circuits on a test database (`test_*` or the sqlite in-memory DB), and `tests/test_admin_webhook_guard.py` enforces it. Several error paths call it deliberately (FCM's map-sync guard is one), so without that guard a suite run posts to the real admin webhook.

## Known expected failure

`tests/test_rnb_transaction_recovery.py::TransactionRecoveryTest::test_F_FAILING_recovery_player_gets_no_notification` is marked `@unittest.expectedFailure`: it documents the open bug in issue #64 where the notification filter in `RNB/views.py` excludes `request.user`, so the player who triggers recovery is never told it is their turn. Remove the decorator when that filter is fixed.

## TGZ frontend tests

Run `npm test` from `TGZ/vueTGZ/`. The Vitest suite covers VR modifiers (including Alajire + Xango and Gu technology rebates), monument scoring, Yemoja upgrade splitting, and Anyanwu’s Level 1/2 monument restriction.

## AQY frontend tests

Run `npm test` from `AQY/vueAQY/`. It uses Node's built-in test runner (no extra dependency) and covers San Nicolo house pairing, trade-rollback array replacement, the famine clamp, and acting-player selection for training games.

## KFW frontend tests

Run `npm test` from `KFW/vueKFW/`. The Vitest suite covers the Farmers expansion: field regions and the union of fields across grass edges (roads block, boat tiles never join another boat tile), placing animals, the purple marker's animal/wheat declaration, breeding (including the mixed-field rule of boat 5a), and spending wheat for a move.

## URR frontend checks

Run `node --test URR/vueURR/src/components/CurrencyText.test.js` for accessible SPL icons, keeping amounts with their units, and safe text rendering.

Run `node URR/vueURR/rulesCheck.mjs` from the repo root. Run `node --test URR/vueURR/src/js/URRgame.test.js URR/vueURR/src/js/URRwaterPlayback.test.js URR/vueURR/src/js/URRhistoryStorage.test.js URR/vueURR/src/js/URRmodelStorage.test.js URR/vueURR/src/js/URRhistory.test.js` for Barahshum own-turn restrictions, uninterrupted development, old between-state saves, deferred waterwork agreements, editable declined plans, completed water playback (including fully automatic routing, returned water and the undiverted share of a split river), and the compressed/game-over save round-trips, omitted board defaults, and finished replay opening corrections. In addition to the rule scenarios, it checks incomplete maintenance-funding previews, input preservation, sale pricing, and throne/overselling restrictions, plus numeric action-code replay records, parameterless actions storing only a code, action rows re-encoded into the current shape on save, on-demand position replay, cache truncation on undo, inserted/deleted properties and changed arrays, inferred history entries, input preservation, invalid replay change rejection, crew purchase summaries across era supply changes, grouped crew totals and removal indices, restoring First Akkadians when reducing to the mandatory crew minimum, First Akkadians dissolution in the hire preview with the undo snapshot preserved, and turn review boundaries, including successive states governed by the same king and required routing/harvest/consent choices.
