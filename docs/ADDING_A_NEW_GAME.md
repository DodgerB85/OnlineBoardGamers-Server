# Adding A New Game To The Site

Every game is one Django app named after its 3-letter game code, registered in a handful of shared lists. Use an existing simple game as your template — **`WEB`** (or `DDL`/`URR`) is the cleanest reference; `RNB` shows solo/map handling and `FCM` shows the most complex case (modules, stats).

The values below are a checklist; grep each item to see it in use in existing games.

## 1. Pick the code and create the app

1. Choose a unique 3-letter code, e.g. `XYZ`, matching an actual board game name.
2. `django-admin startapp XYZ` (or copy the layout of `WEB/`: `views.py`, `common.py`, `models.py`, `urls.py`, `templates/`, `static/`).
3. Add `"XYZ",` to `INSTALLED_APPS` in `OnlineBoardGamers/settings.py`.
4. In `OnlineBoardGamers/urls.py` add `path("XYZ/", include("XYZ.urls")),`.

## 2. Register the game code in the shared registry

The code must appear everywhere the site enumerates games:

- `Lobby/sharedFunctions/sharedRefs.py` → `SR_GAMES_CODES_AND_NAMES_CHOICES` (display name + code; drives choices, game name display and stats filters).
- `Lobby/models.py` → `Game.PRESENTER_MAP` (code → presenter class) and the `startingOptions` HTML helper import if you add one.
- `Lobby/gameViewHelpers.py` / middleware — the `ForceTrailingSlashMiddleware` game-code list in `Lobby/middleware.py` if game pages live under `/XYZ/`.
- `siteUtils/AutoTournyStart.py` → `GAME_CODES` if season tournaments should be generated for it.
- Stats scripts in `siteUtils/` if you want a stats page.

## 3. Game creation

Create `XYZ/common.py` with `create_xyz_game(request, tournamentObj=None, ...)` — copy `WEB/common.py::create_web_game` as your template. It must:

- require POST for normal creation (`400` otherwise),
- read the invited players from POST (`player2..playerN`), validate with `SF_validatePlayers(request, usernames, max_players, allow_creator=False)` (`Lobby/sharedFunctions/sharedFunctions.py`) — this enforces "cannot invite yourself" and "cannot invite unknown users",
- support the tournament path (called by `SF_createNextRoundGamesSetup` with `tournamentObj` + pre-assigned usernames) which returns the new game id instead of a redirect,
- create the `Game` (set `gameCode="XYZ"`, `latestUpdate`, `zoomLevels` sized to max players) and one `GamePlayer` per seat inside `transaction.atomic()`,
- call `presenter.startGame(request)` for auto-start cases (tournament, training/practice games, solo `playerNumber == 1`),
- send invite notifications through `presenter.sendInviteNotifications`,
- redirect to `indexListType` (`current` for started games, `waiting` otherwise).

Then add the create page:

- `Lobby/templates/Lobby/createXYZ.html` (copy `createWEB.html`),
- `createXYZpage` view in `Lobby/views.py` (copy `createWEBpage`; it also implements the rematch/`gameID` prefill),
- routes in `Lobby/urls.py`: `createXYZpage/` and `createXYZpage/<int:gameID>/`, plus `createXYZminiTournament/` and its view/reverse entries if mini tournaments are wanted.

## 4. Presenter

Add `class XYZpresenter(GamePresenter):` in `Lobby/presenters.py` and register it in `PRESENTER_MAP`. Start by overriding only what differs:

- `startGame(self, request)` — copy the per-game pattern (set `ACTIVE`, shuffle seats by `playerOrderSeed`, set `is_current`, `serverCurrentPlayerNamesInTurnOrder`, then `_sendStartGameNotification`).
- End-game handling: `XYZpresenter` implements the end-of-game submission branch (winners, stats, `SN_M_sendEndGameNotificationAnyGame`).
- Skip inherited notification/voting behaviour unless the game needs it — the base `GamePresenter` covers invites, your-turn notifications, kickout timing and votes.

## 5. Views, urls, models, templates

Mirroring `WEB/RNB`:

- `XYZ/constants file` (`RNBconstants.py` / `FCMconstants.py` style): `PHASE_*` ids and any `SO_*` starting-option ids.
- `XYZ/models.py`: any game-specific tables (e.g. `RNBmap`); `migrations`.
- `XYZ/views.py` with:
  - `showXYZgame(request, game_id)` — thin wrapper over `build_show_game_data(...)` from `Lobby/gameViewHelpers.py`, rendering your shell,
  - `XYZdata(request, dataType)` — polling data endpoint (`JsonResponse` of state + `latestUpdate`; keep it light — the client compares `latestUpdate`),
  - `processXYZturn(request)` — **must** wrap your inner handler with `process_game_with_mutex(request, _processXYZturn, mutex_prefix="processTurn_")` and honour the `latestUpdate` check / `syncError` convention,
  - `sendChatMessageXYZ`, `saveNotesXYZ`, `saveZoom`, `castVote`, `bugEntry` — one-line wrappers around the shared helpers (`process_game_with_mutex` + `shared_*` functions),
  - `createXYZgame(request)` — POST-only wrapper delegating to `common.create_xyz_game`.
- `XYZ/urls.py` with `app_name = "XYZ"` and the routes above.
- `XYZ/templates/XYZ/showXYZgame.html` — shell template loading the client bundle and passing the init payload (copy `RNB/templates/RNB/showRNBgame.html`), plus a `XYZhelp.html`.

## 6. Client

- For a Vue client create `XYZ/vueXYZ/` (Vite + Pinia; copy the structure of `CNS/vueCNS` or `RNB/vueRNB`: `model/`, `controller/`, `js/`, `stores/`, `IO/`). The build outputs to `XYZ/static/XYZ/XYZvuedist` (or similar) which Django serves — **never edit the dist**; add a `XYZ.bat` build/dev script like `FCM/vueFCM/FCM.bat`.
- The client implements all rules: it computes moves locally, polls the data endpoint, and submits via `processXYZturn` with `latestUpdate`. Refer to the client conventions in [ARCHITECTURE.md](ARCHITECTURE.md).

## 7. Config and finishing touches

- Player profile preferences (colour/board) if wanted → new fields on `Profile` (`Lobby/models.py`) + migration.
- Experience gate: `SF_getRequiredExp` in `Lobby/sharedFunctions/sharedFunctions.py` — add your code if it should require N completed games before creating/joining.
- Practice/shadow conventions: reuse `SHADOW`-family accounts via `SF_setupTrainingGameShadows`; add your code to `should_auto_start_game` semantics in the auto-tournament helpers if applicable.
- i18n (optional): `XYZ/locale/` and message ids; site already wires `statici18n`.
- Tests in `tests/test_<game>_*.py` — see [UNIT_TESTS.md](UNIT_TESTS.md) (`SF_validatePlayers`, `create_xyz_game` happy paths, and turn-processing gotchas are the highest-value tests).

## Final smoke test

1. Create 3 test users, create/join a game from the lobby, verify statuses on the index lists (`current`/`available`/`waiting`).
2. Submit a move, check `Game.latestUpdate` + `GamePlayer.is_current` updated, notification queued.
3. Submit a stale move (replay the same POST with an old `latestUpdate`) and confirm a `syncError` response.
4. Kickout timer unfurls on the lobby; end the game and check winners/points.
5. `python manage.py test` still green.
