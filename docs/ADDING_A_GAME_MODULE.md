# Adding A New Module To A Game (example: FCM)

A "module" is an optional expansion rule toggle for a game — the FCM Chinese modules, fan-made expansions (Fry Chefs, Kimchi, ...), draft/random modules etc. The site's contract is strict: **the client implements the module's rules; the server only stores that the module was chosen.** The server-side footprint of a module is small and always the same shape.

This doc uses FCM as the reference; the same pattern applies to any game's starting options.

## How modules are represented

- Every module has an integer id: an `SO_*` constant in `FCM/FCMconstants.py` (e.g. `SO_FRIED_CHICKEN = 46`, `SO_STADIUM = 47`, `SO_JAZZ_MUSICIANS = 42`). Chosen ids are stored as a **JSON array of ints** in `Game.startingOptions`.
- Some modules use **encoded values**: min/max module counts for random-module games (`SO_MIN_RANDOM_MODULES`/`SO_MAX_RANDOM_MODULES` + 2-digit count, e.g. `21002`) and range markers parsed in `Lobby/sharedFunctions/sharedRefs.py::SR_getFCMstartingOptionsHTML` (`21000 < x < 21116`).
- The **client reads `startingOptions`** in the init payload and enables its own module logic accordingly — the server never re-implements the rules.

## Checklist for a new FCM module

### 1. Constant — `FCM/FCMconstants.py`

Add `SO_<MODULE_NAME> = <next free int>`. Keep ids stable once published: they are persisted in DB rows and recognised by stats utilities (`siteUtils/calcStats_FCM.py`) and old clients.

- Regular fan-module ids are 1..99 (note the `SO_NEW_DISTRICTS_*` family uses 181/182/183 sub-variants).
- Chinese-expansion module range is separate (the `SO_RANDOM_MODULES`/`SO_RANDOM_MODULES_CHINESE` machinery rolls real ids into `startingOptions` in `FCMpresenter.startGame`, see below).

### 2. Creation form — `Lobby/templates/Lobby/createFCM.html`

Add a checkbox/toggle with a POST name (e.g. `friedChicken` — one per option). `buildFCMstartingOptions(post_data)` in `FCM/common.py` maps POST keys to ids:

- add `"moduleName"` to the `option_names` list there (each present key appends its log id to `startingOptions`),
- or, for a module needing extra parameters (like random/draft modules), extend the `enableAdvancedOptions` block explicitly — see `randomModules`/`draftModules` handling with `SO_MIN_RANDOM_MODULES`/`SO_MAX_RANDOM_MODULES` range entries and the `SO_RANDOM_MODULES_CHINESE` pool marker.

### 3. Stats exclusion — `FCM/common.py::STATS_EXCLUDED_OPTIONS`

If the module should exclude the game from the stats pages (all fan/Chinese modules do), add its `SO_*` constant to `STATS_EXCLUDED_OPTIONS` — creation sets `Game.statsExcludedGame = True` based on it. Tournament games get the same check from the tournament's stored options.

### 4. Lobby display — `Lobby/sharedFunctions/sharedRefs.py`

Two lists in `SR_getFCMstartingOptionsHTML` must know the module:

- `preferred_order` — where it appears in the lobby icon row,
- `options_map` — `id → ("icon filename", "Display Name")`; drop the SVG/JPG icon into `FCM/static/FCM/images/` (the two non-module game types use the Lobby folder path as the third tuple entry).

Every list page and show page (e.g. `FCM/views.py`) renders these via `SR_getFCMstartingOptionsHTML(json.loads(game.startingOptions))`, so this is where players see the module badge without any change elsewhere.

### 5. Server-side behaviour — only if needed

Never duplicate client rules here, but the server *is* responsible for module bookkeeping:

- Random/draft modules: selection logic lives in `FCMpresenter.startGame` (`Lobby/presenters.py` ~line 1951): `SO_RANDOM_MODULES` draws ids into the options (honouring min/max encodings and the Chinese pool marker), and stats may be flagged based on what was rolled. Module-choice during play is a real phase (`PHASE_SETUP_MODULES`) and its submits (`saveModuleSelection`) are handled in `FCM/views.py` like any turn phase — mutex + `latestUpdate` check + rewind rules included.
- If your module needs server-side milestones/phase handling (e.g. `SO_URBAN_PLANNING` map swap), wire it in the presenter/views the same way.

### 6. Client implementation — `FCM/vueFCM/src`

Implement the rules in the Vue workspace (`FCM/vueFCM/src`: `model/`, `controller/`, `js/`):

- read `startingOptions` (the init payload sends both the literal JSON and the pre-rendered icon HTML — the client should rely on the ids),
- add the rules/boards/content and its own tests in `FCM/vueFCM/src/js/*.test.js` (existing module examples: `stadium.test.js`, `laborMarket.*.test.js`, `draftModules.test.js`, `coffee.*.test.js`),
- build with `FCM/vueFCM/FCM.bat` (never bare `npm run build`; it also deletes the generated `images/` folder from the dist).

### 7. Help page and tests

- Describe the module in `FCM/templates/FCM/fanExpansionsHelp.html` (fan modules) or `FCMchinaHelp.html` (Chinese kickstarter modules) — including the stats-exclusion note if applicable.
- Add tests in the root `/tests/` package where the server has an opinion (e.g. new entry in `STATS_EXCLUDED_OPTIONS`, options parsing, presenter roll logic). See [UNIT_TESTS.md](UNIT_TESTS.md) for conventions.

## Data safety

- Existing finished games keep whatever ids they stored — never change the meaning of an already-published id; new modules must take new ids.
- Helpers that interpret options (`SR_getFCMstartingOptionsHTML`, stats filters, the client) ignore unknown ids gracefully, which is what makes adding ids backwards-safe.
