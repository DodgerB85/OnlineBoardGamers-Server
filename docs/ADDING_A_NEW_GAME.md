# Adding A New Game To The Site

For the implementation workflow, UI conventions and lessons from URR's development history, use [the add-new-game skill](add-new-game/SKILL.md). This page is the site-wiring checklist; verify specific commands and donor patterns against current code.

Every game is one Django app named after its 3-letter game code, registered in a handful of shared lists. Use an existing simple game as your template — **`WEB`** (or `DDL`/`URR`) is the cleanest reference; `RNB` shows solo/map handling and `FCM` shows the most complex case (modules, stats).

The values below are a checklist; grep each item to see it in use in existing games.

## 1. Pick the code and create the app

1. Choose a unique 3-letter code, e.g. `XYZ`, matching an actual board game name.
2. `django-admin startapp XYZ` (or copy the layout of `WEB/`: `views.py`, `common.py`, `models.py`, `urls.py`, `templates/`, `static/`).
3. Add `"XYZ",` to `INSTALLED_APPS` in `OnlineBoardGamers/settings.py`.
4. In `OnlineBoardGamers/urls.py` add `path("XYZ/", include("XYZ.urls")),`.

## 2. Register the game code in the shared registry

The code must appear everywhere the site enumerates games:

- `Lobby/sharedFunctions/sharedRefs.py` → `SR_GAMES_CODES_AND_NAMES_CHOICES` (display name + code; drives choices, game name display and stats filters). Changing the choices also needs `manage.py makemigrations Lobby` — `makemigrations --check` fails otherwise.
- `Lobby/models.py` → `Game.PRESENTER_MAP` (code → presenter class) and the `startingOptions` HTML helper import if you add one.
- `Lobby/views.py` → `GAME_NAMES_MODELS` (player profile, join links, delete-game and fair-play loops), plus `stats()` `game_codes` / `GAME_META` from section 9.
- `Lobby/gameViewHelpers.py` / middleware — the `ForceTrailingSlashMiddleware` game-code list in `Lobby/middleware.py` if game pages live under `/XYZ/`.
- Option icons: call your `SR_getXYZstartingOptionsHTML` from `SF_serializeGame` (`Lobby/sharedFunctions/sharedFunctions.py`) and from `Tournament.startingOptionsHTML` (`Lobby/models.py`), or lobby/tournament rows show `[None]`.
- Admin: add `XYZgame` (and `XYZMiniTournament` if mini tournaments are supported) to `Lobby/modelProxies.py` and register them in `Lobby/admin.py`; proxies need an app migration.
- `Lobby/templates/Lobby/gameDisplay/gameIcons.html` (game icon) and `Lobby/templates/Lobby/admin/DBO.html` (admin show-page link).
- Tournaments: `start_next_any_tournament_round` in `Lobby/sharedFunctions/sharedFunctions.py` dispatches per game code — without a branch every generated game falls into the legacy call and 500s.
- `siteUtils/AutoSiteSweeper.py` → `GAME_CODES` (stale-game deletion; add it to `SINGLE_WINNER_GAMES`/`AT_LEAST_ONE_WINNER_GAMES` only if its end-game always marks winners).
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

- `Lobby/templates/Lobby/createXYZ.html` (copy `createWEB.html`). It comes with the shared create-page pieces already wired in: `Lobby/createGamePage.js` (autocomplete, `getCookie`, `removeOption`/`addOption`, `setKickoutOptions`, `showSeats`/`clearSeatNames`, `validateGameType`), `Lobby/createCommonOptions.html` (the Common Options card, parameterised by the practice-game sentence) and `Lobby/kickoutOptions.html` (translated kickout labels). Keep only the per-game `validateOptions` / `selectPlayers` / `initGameCreation` in `Lobby/createXYZ.js` - do not copy the shared helpers into it.
- Only render a Game Options card when the game actually has options. Do not ship a placeholder "options will be added here" card. If the page ends up with two cards, add `setup-cards-grid-two` to the grid so a wide screen does not leave an empty third column.
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
- `XYZ/templates/XYZ/showXYZgame.html` — shell template loading the client bundle and passing the init payload (copy `RNB/templates/RNB/showRNBgame.html`; `WEB/templates/WEB/showWEBgame.html` shows the block structure), plus a `XYZhelp.html` that extends `Lobby/help_shell.html`. Every value must be valid JavaScript: quote strings with `escapejs` and pass JSON blobs as escaped strings the client parses, because one unquoted value breaks the whole init script (the client then never gets `latestUpdate`, `pov` or `name`).

## 6. Client

The [show-page shell contract](add-new-game/SKILL.md#reuse-the-show-page-shell) is required: adapt URR’s `TopMenu.vue` structure and SVG icons, and WEB’s `.actionsLineButton` styles. Preserve the site header, utility panels, typography, background and footer. A custom themed top bar or hand-rolled button palette is not an equivalent substitute. Compare the result against the named donor in a browser.

Shell corrections already made in the donors, required for a new game:

- The top bar must never show a scrollbar. No `overflow-x` and no fixed `min-width` on `#top`; the centred `#topInfos` takes the remaining width (`flex: 1 1 auto; min-width: 0`) and ellipsizes long game/player text so menu items, viewer name and zoom controls stay visible at 1366–1400px.
- Show the viewer's name as text beside the connection dot (`#WSstatus`); spectators show "Spectator". Do not replace the name with only a player marker.
- Zoom controls run whole-map/fit, zoom in, zoom out, left to right. Keep menu labels short enough to fit (e.g. "Prices", not "Land prices"). The turn-order line shows each player's marker followed by the display name.
- Place a turn status bar directly below the header (copy `BUS/vueBUS/src/App.vue` `#turnStatus`): a "YOUR TURN" badge plus the current action on your turn, otherwise the acting player's colour chip, name and action; use it for "Game over" and "Replay" too. Drive the action text from the same helper as the action panel so both agree.
- Page background (`#wholeMiddleArea`): light blue (`#d4eafd`) on your turn and for spectators, grey while a seated player waits for another player's turn and while replaying, with the 1s fade. Practice games stay blue.
- Hide action controls the viewer cannot use; do not render them disabled. Disabled buy/bid/pass buttons on another player's turn confuse spectators. Leave read-only information (prices, bids, ownership) visible.
- `SUPER_USERS` is for automated accounts only (`BotKickStarter`). Never add a human or administrator username: that bypasses the turn check and submits actions for whichever seat is active. Administrators without a seat observe with `pov = -1`.
- For a Vue client create `XYZ/vueXYZ/` (Vite + Pinia; copy the structure of `CNS/vueCNS` or `RNB/vueRNB`: `model/`, `controller/`, `js/`, `stores/`, `IO/`). The build outputs to `XYZ/static/XYZ/XYZvuedist` (or similar) which Django serves — **never edit the dist**; add a `XYZ.bat` build/dev script like `FCM/vueFCM/FCM.bat`.
- The client implements all rules: it computes moves locally, polls the data endpoint, and submits via `processXYZturn` with `latestUpdate`. Refer to the client conventions in [ARCHITECTURE.md](ARCHITECTURE.md).

## 7. Config and finishing touches

- Player profile preferences (colour/board) if wanted → new fields on `Profile` (`Lobby/models.py`) + migration. See [Per-game colour preferences](#8-per-game-colour-preferences) below.
- BG Stats export: if the game has an end screen, wire the shared opt-in export. In `showXYZgame.html` load `Lobby/common/qrcode.js` and `Lobby/common/bgStats.js` inside `{% if bgStatsEnabled %}` and set `initData.bgStatsEnabled = {{ bgStatsEnabled|default:0 }}` in the authenticated block; then add a `XYZ_bgStats.js` builder that calls `window.OBGBgStats.buildUrl({ title, bggId, sourceGameId, sourcePlayId, playDate, noPoints, groups })` with the final standings (best group first, bots excluded) and render the link/QR block on the game-over screen (copy `TGZ/vueTGZ/src/components/ActionArea.vue`). The flag, the profile toggle and the migration already exist; only the per-game wiring is new.
- Experience gate: `SF_getRequiredExp` in `Lobby/sharedFunctions/sharedFunctions.py` — add your code if it should require N completed games before creating/joining.
- Practice/shadow conventions: reuse `SHADOW`-family accounts via `SF_setupTrainingGameShadows`; add your code to `should_auto_start_game` semantics in the auto-tournament helpers if applicable.
- i18n (optional): `XYZ/locale/` and message ids; site already wires `statici18n`.
- Tests in `tests/test_<game>_*.py` — see [UNIT_TESTS.md](UNIT_TESTS.md) (`SF_validatePlayers`, `create_xyz_game` happy paths, and turn-processing gotchas are the highest-value tests).

## 8. Per-game colour preferences

URR is the minimal current example; RNB shows the same pattern with extra options. A colour preference lets a player swap their seat colour for another one on their own screen only. It never changes saved game data.

1. **Profile field** — add one JSON string per game to `Profile` in `Lobby/models.py`:
   ```python
   preferredXYZoptions = models.CharField(max_length=30, blank=True)
   ```
   Run `manage.py makemigrations Lobby`. Store a JSON array, not a bare number, so later options can be appended. For colour only the value is `[colour]` or `[-1]` for none; RNB stores `[colour, playerAid, colourOverlay]`.
2. **Profile page** — add a labelled row to `Lobby/templates/Lobby/profile.html` (URR puts **Ur Colour** under **Web Colour**). Use a radio group with `name="xyzColour"`, a `None` option with `value="-1"`, then one radio per colour. Use the game's own marker images or colour swatches so the icons match the board; URR uses the six `URR/images/ownership-marker-*.png` files. Add the wrapper class to `Lobby/static/Lobby/CSS/profile.css` if the options need sizing.
3. **Save** — in the `updateProfileFavourites` branch of `profile()` in `Lobby/views.py`, read with `.get(..., -1)` so older forms and tests do not fail, then dump a one-element array:
   ```python
   profile.preferredXYZoptions = json.dumps([int(request.POST.get("xyzColour", -1))], separators=(",", ":"))
   ```
4. **Load on the profile page** — read the field in the GET branch, treating blank as none, and pass it to the template:
   ```python
   preferredXYZoptions = json.loads(profile.preferredXYZoptions) if profile.preferredXYZoptions else [-1]
   favXYZcolour = preferredXYZoptions[0]
   ```
   Add `favXYZcolour` to the render context. If you add more options later, pad the list with defaults so old profiles keep loading (`RNB/views.py::profileRNB` and `IND/views.py` show this).
5. **Pass to the game** — in `showXYZgame`, put a safe default in the base payload (`"preferredXYZoptions": [-1]`) so logged-out spectators and non-players still render. For authenticated users, read `result["user_profile"].preferredXYZoptions`, fall back to `[-1]` when blank, and override the payload. Emit it in `showXYZgame.html`:
   ```html
   initData.preferredXYZoptions = {{ preferredXYZoptions|default:"[-1]"|safe }};
   ```
6. **Client** — keep the preference in the personal store because it is viewer-specific, not game state. Set it during model init:
   ```js
   const options = window.initData.preferredXYZoptions || [-1]
   personal.preferredColour = options[0]
   ```
   Add `getCorrectedColour(colour)` to the personal store. When the player has a preference, swap their own seat colour with the preferred colour and leave every other colour alone; return the original colour when the preference is `-1` or the viewer has no seat. Route **all** player colour lookups through that helper (or through it inside a shared asset helper), including board markers, history chips and the turn-order chip. Fixing only the top bar makes the board disagree with the player list.
7. **Test** — cover the profile POST, the blank default and the value reaching the show page. `tests/test_urr_show_options.py` is the small template; `tests/test_bus_tgz_show_options.py` and `tests/test_fcm_show_route.py` show other games' versions.

For more than a colour or two, use a separate `profileXYZ` page and link it from the profile page instead of growing `profile.html` — see `profileRNB`, `profileIND` and `profileAQY` in `Lobby/views.py` and `Lobby/templates/Lobby/`.

## 9. Lobby, landing page and notification wiring

A game can create, save and finish correctly and still be invisible. Grep each file below for an existing code (`WEB` and `URR` are the current references) and add `XYZ` everywhere the site enumerates games.

- `Lobby/templates/Lobby/newGames.html` — add the create tile in the intended order:
  ```django
  {% include "Lobby/create_tile.html" with url="createXYZpage" title=_("Game Name") img="XYZ/images/box.jpg" %}
  ```
- `Lobby/templates/Lobby/index.html` (logged-out landing page) — add the game to the JSON-LD top-level `"description"` and `"hasPart"` list, the hero sentence, one `Lobby/game_card.html` include (`players` and `tagline`), and one `<details id="game-xyz">` block in `.game-flavour`. The card's `full_id="game-xyz"` is what opens the matching details block.
- `Lobby/templates/Lobby/layout.html` — title, meta description, keywords and footer text if the game should be advertised globally.
- `Lobby/templates/Lobby/lobby_icons.html` — game icon in the "What are the icons?" legend.
- `Lobby/templates/Lobby/lobbyHelp.html` — help pill, required-experience table row (`SF_getRequiredExp`), the no-specific-starting-options note if it applies, and the resign rule.
- `Lobby/templates/Lobby/about.html` — "Current Games" list.
- `Lobby/templates/Lobby/lobby.html` — release banner/teaser and, if main tournaments are supported, a branch in the `availableTournaments` icon list. If the teaser is a countdown, at launch replace the timer with a link to `createXYZpage`, remove the dark overlay and delete the countdown script.
- `Lobby/sharedFunctions/sharedNotifications.py` → `getGameStrings(game)` — without an `XYZ` branch every notification and email falls back to the generic "Game" wording. Add `boxName`, your-turn, click-here-to-play, bug report, invite, tournament and reminder subjects.
- Every template that maps a game code to a show URL: `Lobby/templates/Lobby/gameEmails/gameStartEmail.html`, `gameEndEmail.html`, `stuckTransactionEmail.html`, `tournamentGameStart.html`, `yourPendingTurnEmail.html`, `yourTurnEmail.html`, `yourTurnFixRNBemail.html`, and `Lobby/templates/Lobby/email/gameReminderEmail.html` / `gameReminderExpiredEmail.html`. Grep `showRNBgame` to find the current list.
- `Lobby/static/Lobby/Lobby.js` → `ALL_GAMES` (join/leave click parsing).
- `Lobby/static/Lobby/playerInfo.js` — stats tab listener, stats div index, and the delete-training-game branch.
- `Lobby/static/Lobby/stats.js` + `Lobby/templates/Lobby/game_tabs.html` — stats tab listener, tab button, fair-play div index and per-game player-count visibility if the game appears on the site stats page.
- `Lobby/views.py` → `stats()` `game_codes` list and `GAME_META`; `Lobby/extraStats.py` → `read_history()` if the exported history format differs. Otherwise the game is missing from site stats.
- `Lobby/templates/Lobby/newMiniTournaments.html` — tile if mini tournaments are supported (with the matching `createXYZminiTournament` view and route from section 3).
- `tests/test_game_creation_all_games.py` — add the game to `GAMES` (creation POST coverage) and `CREATE_PAGE_FIELDS` (create-page markup coverage).
- `Lobby/templates/Lobby/gameDisplay/gameIcons.html` and `Lobby/templates/Lobby/admin/DBO.html` are already required in section 2; re-check them after UI additions.


## Final smoke test

1. Create 3 test users, create/join a game from the lobby, verify statuses on the index lists (`current`/`available`/`waiting`).
2. Submit a move, check `Game.latestUpdate` + `GamePlayer.is_current` updated, notification queued.
3. Submit a stale move (replay the same POST with an old `latestUpdate`) and confirm a `syncError` response.
4. Kickout timer unfurls on the lobby; end the game and check winners/points.
5. Check the new game appears on `/newGames/`, the logged-out `/`, the help page and the icon legend, and that notification/email links resolve to `/XYZ/<id>/show/`.
6. `python manage.py test` still green.
