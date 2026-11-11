---
name: add-new-game
description: Add a board game to OnlineBoardGamers, from rule and component transcription through client gameplay, Django integration, saves, replay and playable UI. Use for a new game implementation or its implementation plan; also use for aligning an existing game's show-page shell with site conventions. Ordinary rules fixes do not require this whole workflow.
---

# Add a game to OnlineBoardGamers

Deliver a game that people can create, join, play, reload and finish through the normal controls. A working rules engine alone is incomplete.

Read the repository's current `AGENTS.md` first. This skill adds lessons from URR; it does not override project rules or make URR the template for every game. Paths below are relative to the repository root.

Read [references/urr-lessons.md](references/urr-lessons.md) when selecting the design and before declaring the game complete. It records the mistakes, reversals, UI preferences and evidence behind this workflow, including current limitations in URR itself.

## Establish the game and its boundaries

- Identify the authoritative rulebook, edition, errata and printed components. Keep rule sources separate from implementation reports. Transcribe board topology, prices, supply limits and tie-break order from the components; worked examples alone cannot establish every constant. Record the source or unresolved interpretation beside the relevant data or in the game's documentation.
- Turn the rulebook's worked examples into small executable scenarios with independently specified outcomes. Add invariants where useful: conserved resources, finite supplies, legal ownership, and no input mutation after an invalid action. Test phase transitions and special powers together, not only in isolation.
- State which player counts and modes the request includes. Practice play, normal multiplayer, private games, learning games, tournaments and statistics are separate integration decisions. Do not add a bot, expansion framework or tournament support merely because a donor has one.
- Trace the intended lifecycle before copying files: create → invite/join → start → first move → decision handoff → reload → rewind → missing player → finish. List the client, server, template, registry and test changes needed for it.

## Choose references by responsibility

Start with [docs/ADDING_A_NEW_GAME.md](../ADDING_A_NEW_GAME.md), [docs/ARCHITECTURE.md](../ARCHITECTURE.md) and a small sibling such as `WEB`. Verify their advice against current code: existing docs contain historical commands and optional choices. Use `RNB` for relevant map/solo flows and `FCM` only for relevant complex flows. Prefer an existing shared helper over copying a sibling's older local implementation.

URR is useful for deterministic actions, local drafts, contextual map selection and derived history. Its water engine, nation timing, fixed board and compact array slots belong to URR. Copy only the behavior the new game needs; remove unrelated simultaneous-turn queues, stack transactions, phase constants, debug fixtures and placeholder controls from the scaffold.

Keep the server's existing ownership of persistence, authorization and turn coordination. Implement move legality and gameplay in the client. A typical client split is plain-data rules/actions, model/store, controller, IO and Vue components; follow the chosen game's existing conventions rather than imposing URR's filenames or module layout everywhere. In URR, namespace imports such as `rules.canExchangeBarahshum(...)` were explicitly adopted; retain that style when working there.

## Complete the site integration

Search each reference below and inspect its callers. There is no single registry that makes a game usable everywhere.

| Responsibility | Places to inspect or extend |
| --- | --- |
| Django app and routes | `OnlineBoardGamers/settings.py`, `OnlineBoardGamers/urls.py`, the game's `apps.py`, `urls.py`, migrations |
| Name, phase and presenter lookup | `Lobby/sharedFunctions/sharedRefs.py`, `Lobby/models.py::Game.PRESENTER_MAP`, `Lobby/presenters.py` |
| Lobby discovery and joining | `Lobby/views.py::GAME_NAMES_MODELS`, create/rematch views, `Lobby/urls.py`, `Lobby/templates/Lobby/gameDisplay/gameIcons.html` |
| Creation form | `Lobby/templates/Lobby/createXYZ.html`, `Lobby/static/Lobby/createXYZ.js`; reuse `createGamePage.js`, common options and kickout includes |
| Admin and URL compatibility | `Lobby/modelProxies.py`, `Lobby/admin.py`, `Lobby/middleware.py`, the game's legacy redirect if applicable |
| Show page and utility endpoints | `Lobby/gameViewHelpers.py`, game views/templates; shared notes, zoom, votes, bug-report and mutation helpers |
| Optional tournament/statistics support | Shared tournament creation dispatch, `siteUtils/AutoTournyStart.py`, relevant stats scripts; enable only the requested paths |

Use shared player validation and practice shadow setup. Keep creation atomic and preserve seat order, seeded shuffling, invitations, current-player flags and notification ordering. Verify display names separately from account names: practice aliases must survive saves without becoming personal notes or changing participant identity.

Keep the mutex and stale-version checks in their established locations. Resolve participant/admin permissions server-side using the shared permission helpers. The client owning rules does not authorize a spectator to save, forge a chat sender, kick another seat or impersonate an administrator. Use translated errors and context-appropriate escaping for template data; use the shared bounded decompressor on server paths that decompress client data.

Do not add human or administrator accounts to a client's `SUPER_USERS` list. That bypasses the turn check and submits actions for whichever seat is active; reserve it for automated accounts such as `BotKickStarter`. Administrators without a seat observe with `pov = -1`.

Exercise the final join that starts a normal game. URR could be created while its missing lobby whitelist entry still prevented PvP joining. Removing a practice-only checkbox is insufficient if backend creation still forces practice mode.

## Make gameplay, saving and review agree

Prefer actions that take plain state and return a new state, with validation before committing a change. Reuse those rules for previews and final actions; incomplete previews may need a narrow shared validation helper. Do not put a second version of legality in Vue click handlers.

For editable turns, distinguish form/map selection, locally applied actions and a saved decision. Undo restores the preceding action and history length; Reset restores the decision's opening state and clears form drafts. Stop at a change of decision context, even when the same person controls both contexts. Agreement responses and state/subphase handoffs can be boundaries without a username change.

Clear a draft only after a confirmed save or after importing a newer authoritative position, explaining the latter to the user. Preserve recoverable choices on a failed save. Import the matching position before advancing `latestUpdate`; defer incoming updates during replay or an in-flight save without losing them. Equal WebSocket versions must stop, older versions may need correction, newer versions trigger a fetch. Check the polling fallback too.

Automate forced outcomes, not strategic choices. Execute forced steps through the same actions, re-evaluating after each step and stopping at the next choice/boundary. Undo/Reset must pause the watcher so the undone move does not instantly recur. URR's sole-pump and sufficient-water irrigation rules are examples, not generic rules for another game.

Finish the missing-player flow using the game's own rules. Preserve seat identity/indexes, apply the server's missing-seat result locally, and ensure a subsequent save/reset does not resurrect the player. Assign one client to persist automatic moves, resolve the abandoned seat before notifying the next real actor, and preserve kickout/flex-time and rewind cleanup. Reuse an existing policy only when it fits the new game.

## Design saves for a complete game

Specify persisted gameplay state separately from local drafts, replay caches, display rows, highlights and animation state. Keep readable objects in the engine; compact only at the storage boundary when size warrants it. Do not copy URR's codec before establishing a need.

Measure a representative late-game payload, compressed transfer, DB state, rewind stack, load/save time and browser memory. Avoid histories containing full prior histories and rewind points containing repeated replay snapshots. Compression alone does not remove that amplification. Large byte-to-base64 conversions need bounded chunks rather than one spread call.

If using deterministic action replay, preserve the opening state/seed, stable identifiers, timestamps and exceptional changes such as renamed players or kickouts. Rule changes can change old replay results: use an explicit compatibility strategy and real old fixtures. Stable numeric codes/table slots must retain their published meanings. Test current state and reconstructed history independently; a round-trip through the same mistaken encoder and decoder is insufficient evidence.

Rewind points represent the state **before** a saved decision. Check the first move, opening reconstruction, repeated rewind/play-on, duplicate detection across supported encodings, retention limits and kickout boundaries. Keep replay navigation distinct from shared rewind: replay must make no saves, block live actions and restore the captured live position through every close path.

Keep decoders for published saves unless a reset/migration is explicitly part of the request. Test old formats with fixtures from the old encoder. A later format change is not evidence that all users' old saves were migrated. Do not copy URR's current compatibility gaps into a new game.

For display performance, derive history rows and reconstructed positions outside persisted state. Append incrementally and invalidate on undo/import/replacement. Subscribe the map only to the history data it uses. Profile long sessions in the affected browser and distinguish development instrumentation from production cost before adding caches.

## Reuse the show-page shell

The game page must look and behave like the site's established game pages. Game-specific artwork and interactions do not authorize a new theme for navigation, buttons or page chrome. Apply this section to shell corrections too, without rewriting rules or persistence.

There is no shared game-shell component or stylesheet to import. Copy and adapt the donor components and local styles below, changing game identifiers, translations and bindings. Name the donor in the implementation plan. The newest game is not automatically a style reference; a bespoke `TopBar` with similar labels does not satisfy this requirement.

| Element | Required pattern and source |
| --- | --- |
| Header structure | Copy [URR TopMenu.vue](../../URR/vueURR/src/components/TopMenu.vue): `#top` contains `#menu`, `#topInfos` and `#topRight`. Keep the approximately 60px dark `#333` header, icon-and-label navigation, centered game/phase/player information, and viewer/connection/zoom area. Assess width against the board instead of blindly copying URR's minimum width. |
| Header width and viewer | `#top` must never scroll: no `overflow-x`, no fixed `min-width`. Let `#topInfos` take the remaining width (`flex: 1 1 auto; min-width: 0`) and ellipsize long game/player text, so menu items, viewer name and zoom stay visible at 1366–1400px. Show the viewer's name as text beside the `#WSstatus` dot (spectators see the translated "Spectator"), not as a bare player marker. Order the zoom controls whole-map/fit, zoom in, zoom out. Keep labels short ("Prices", not "Land prices"), and show each turn-order player's marker followed by their display name. |
| Menu controls | Use `.topMenuItem`, `.topMenuItemSelected`, `.menuDivider` and `.hasNotes`. Items have transparent backgrounds, roughly 38px icons and labels underneath; selected/hover states use the donor's light-blue treatment. Use real buttons for toggles, links for navigation, translated labels, `aria-expanded` for panels, visible keyboard focus and appropriate disabled states. Do not copy older clickable-span semantics. |
| Utilities and panels | Preserve Home, Chat, Bug report, Next game, Rules/help, Notes, History, Replay, Rewind and Resign where supported and eligible. Follow participant/spectator and game-state visibility rules. Wire actual handlers and [TopMenuViews.vue](../../URR/vueURR/src/components/TopMenuViews.vue) panel behavior. Dummy controls or omitting site utilities for a first version are incomplete integration. Trace actual routes and init data, including `nextURL`; do not guess creation URLs. |
| Turn status | Place the shared full-width status bar directly below the header (`Lobby/static/Lobby/common/GameStatusBanner.vue`, wired like [BUS App.vue](../../BUS/vueBUS/src/App.vue)). On your turn show a "YOUR TURN" badge and the current action; otherwise show the acting player's colour chip, display name and action. Use the same bar for "Game over" and "Replay". Reuse the action panel's title helper so the bar and the panel cannot disagree. |
| Action buttons | Default to `.actionsLineButton` from [WEB App.vue](../../WEB/vueWEB/src/App.vue): `margin: 10px`, `width: fit-content`, `border: 2px solid green`, `border-radius: 5px`, `font-weight: bolder`, `padding: 5px`, light-grey hover and dark-grey active backgrounds. In dense panels, keep component-scoped margins and padding instead of the 10px margin, as URR does. Preserve native focus/disabled behavior or the donor's explicit states. No yellow/ghost buttons or invented palette. |
| Page and footer | Copy zero body margin, Arial/sans-serif typography and light-blue `#d4eafd` page background. Keep artwork within the game area; do not theme the shell with gradients, gold controls, new fonts or decorative shadows. Copy [FooterBar.vue](../../WEB/vueWEB/src/components/FooterBar.vue), its `#footer` styles and the normal loading shell. Retain implementation, artwork/permission and icon credits as applicable. |
| Page background | `#wholeMiddleArea` is light blue (`#d4eafd`) when it is your turn and for spectators, grey while a seated player waits for another player's turn and while replaying, with a 1s colour transition. Practice games stay blue. Do not grey the game-over screen. |

### Icons and SVG

- Reuse the menu SVGs from [WEB's images](../../WEB/static/WEB/images): `icon-house.svg`, `icon-chat.svg`, `icon-stop.svg` (bug report), `icon-nextGame.svg`, `icon-rulebook.svg`, `icon-notebook.svg`, `icon-scroll.svg` (history), `icon-replay.svg` and `icon-rewind.svg`. Copy needed assets into the new game's static images directory and adapt [URRview.js](../../URR/vueURR/src/js/URRview.js)'s build-resolved image lookup. Do not introduce a new icon pack, hand-draw substitutes, or replace navigation with emoji or text-only buttons. Resign and game-specific icons may use donor raster assets.
- Decorative icons beside visible labels use `alt=""`; icon-only controls need an accessible name. Preserve selected/hover icon treatment and icon credits. Verify asset loading in the production bundle as well as development.
- For a scalable fixed-map board, inspect [URR MapArea.vue](../../URR/vueURR/src/components/MapArea.vue) and [WEB MapArea.vue](../../WEB/vueWEB/src/components/MapArea.vue): an SVG `viewBox` places artwork, targets and markers in one coordinate system. Reuse supplied board artwork through an image layer; do not redraw the printed board as invented SVG art. Keep geometry separate from rules and saved state, with keyboard-accessible targets. A different renderer needs a game-specific reason; it does not justify different site chrome. A shell correction need not replace a working board renderer.

### Verify visual consistency

Compare donor and new page in a browser at the same desktop viewport. Check header structure, icon sizes/labels, font, background, button states, panels, footer, zoom and long content. Include participant and spectator views, keyboard focus and an open utility panel. Similar component names or a History button do not establish visual consistency. Record the donor and comparison evidence; if browser comparison cannot run, report the shell as unverified.

LBR's initial implementation illustrates the gap this contract closes: a custom gradient `TopBar.vue`, Trebuchet typography, yellow/ghost buttons and text-only navigation passed the old vague instruction to match the site. Those choices must not become a donor for future shells. Game-specific board artwork is a separate concern.

## Build an interface around the decision

Observed URR taste, to adapt to the new game's needs:

- Keep the board, current actor/state, relevant economy and next action understandable together. Use game artwork, player markers and recognizable pieces; keep enlarged card inspection available where useful.
- Show the current stage and relevant controls. Avoid repeated instructions, redundant map shortcuts, oversized headings, blanket bold text and generic confirmation lists that replace the decision being reviewed.
- Keep completed choices in their original panel with selections, previews and costs until committed. Put the final cost/consequence on the action button where useful. Accepted/declined agreements must lead to a coherent continuation; retain valid earlier approvals when reopening a declined plan.
- Share selection between map and form controls. Preserve a path while its crew/form synchronizes; invalid clicks explain the restriction without destroying the draft. Use visible targets above pieces and distinguish selection from legal continuation/completion. Inspection should suppress action highlights.
- Show actual remaining supply and impending losses/era effects before confirmation. Summaries use the pre-action card/price, not the next available card after the purchase.
- Hide action controls the viewer cannot use instead of rendering them disabled: bid forms, buy/pass and auction controls should not appear for non-actors. Keep read-only prices, bids and ownership visible. Controls that remain visible may still disable themselves for their own reasons, such as not enough money.
- Keep scrolling predictable. URR deliberately retains a desktop-width board; do not promise a mobile redesign or copy a fixed viewport without assessing the new board. Check lower-resolution desktop, zoom and long panels. Sticky bottom controls were removed because content slid behind them.
- Prefer local confirmation/cancel controls to browser alerts. Preserve ordinary keyboard operation, labels, safe text rendering and reduced motion. Currency images still need accessible units. Keep user-facing text translated; do not store translated display prose as game state.
- Explain automatic sequences through recorded history/playback where helpful. Animation presents recorded outcomes, never drives game rules or saves. Manual stepping must show the same state, including waiting/returned resources.

Follow the show-page shell contract above. Verify the Django template and Vite config use the same dev port, entry URL and static paths. URR required both a port correction and a Django-image proxy after the initial implementation. Use existing permissioned artwork where available, prefer JPG when suitable, and keep temporary extraction sheets out of the deliverable.

## Verify observable outcomes

Choose focused tests from the actual package scripts and neighboring tests; the repo has multiple frontend runners. New non-trivial logic needs a small lasting regression test. Backend tests live in root `tests/test_*.py` and run with `manage.py test tests.test_name`.

Before calling the game playable, collect evidence for the requested modes:

| Area | Evidence |
| --- | --- |
| Rules | Published examples match expected results; special-rule/transition regressions and resource invariants pass |
| Site lifecycle | Create, invite/join, start, current-player handoff, missing-player handling and finish work through real endpoints; stored state, flags and results agree |
| Authorization and concurrency | Spectator/forged actor rejected; stale submission rejected without mutation; two independent accounts/tabs converge; equal WS messages do not echo |
| Persistence | Reload during a meaningful intermediate phase; current and old fixtures load; late-game size/time measured; rewind and replay retain the expected states |
| Shell | Named donor compared in-browser; header, SVG icons, buttons, utility panels and footer follow the contract above |
| UI | Normal controls can reach the tested rules; Undo/Reset, selection, review, save failure and every replay exit behave correctly; intended viewports/locales checked |
| Build | Production frontend build passes, Django shell loads the bundle and images; no generated output enters the change |

Use local disposable games for endpoint/browser verification. Mock saves when testing presentation against an existing game; explicitly distinguish those checks from real multiplayer submissions. Mock outbound notification delivery while checking recipients and save ordering.

Build with the workspace's actual command. The checked-in `.bat` scripts use maintainer Windows paths; on Linux use `npm run build`, then remove only the generated stray `images/` directory (RNB also `help/`). Never edit dist by hand or include build output in the commit. Preserve any pre-existing user changes.

Report what passed, what was simulated, what remains untested and any unresolved rule source or compatibility risk. A merged PR, unchecked test plan or old audit report is not a fresh validation result. Update affected docs without turning historical playtest reports into claims about the current build.
