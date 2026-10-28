# URR lessons and evidence

Review baseline: `edebce41`, 2026-10-27. URR was created in `454bb2f7` on 2026-09-28. The reachable path history contains 60 commits, including asset imports, their deletion and generated bundles. Related changes outside `URR/` were checked in the creation/feature commits, root URR tests and the shared practice-deletion fix.

This is an implementation-history review for writing a new-game skill, not a fresh line-by-line certification of every rule, translation, asset or security boundary. Source diffs, current callers and tests support the lessons below. Binary artwork and minified bundles were inventoried rather than visually re-audited. Squashed commits conceal intermediate implementations; their messages and PR bodies supply context but cannot reconstruct all original work or conversations.

## How to inspect the evidence

Run from the repository root, using raw Git output where a wrapper would shorten history or diffs:

```sh
git log --reverse --format='%h %ad %s' --date=short -- URR
git log --all --diff-filter=A -- URR/models.py
git show COMMIT -- URR/vueURR/src URR/views.py tests/test_urr_rewind.py
git show COMMIT -- Lobby/views.py Lobby/presenters.py Lobby/templates/Lobby/createURR.html
git log --follow -- URR/vueURR/src/js/URRhistoryStorage.js
rg -n 'URR|GAME_NAMES_MODELS' Lobby OnlineBoardGamers tests siteUtils
```

`git show 5f6962df:URR/AUDIT-2026-10-05.md` retrieves the deleted audit. Read its correction in `681928ce` and `URR/vueURR/FOUNDATION.md` before using any recommendation. Current code takes precedence when describing what is supported today; the rulebook/components decide intended rules, and `AGENTS.md` decides project constraints.

PR descriptions and reviews were read for [#122](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/122), [#125](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/125), [#126](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/126), [#127](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/127), [#138](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/138), [#139](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/139), [#140](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/140), [#144](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/144), [#145](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/145), [#146](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/146), [#162](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/162) and [#164](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/164). There were no discussion comments in those returned records; most review bodies were short approvals. Those approvals do not independently prove correctness or establish a general preference.

## Mistakes, fixes and the lesson to keep

### 1. A donor scaffold carries assumptions

`454bb2f7` introduced URR and DDL with site registration and a generic client/server shell. `ec6e6148` removed simultaneous-move payloads, stack-save aliases and unused move-data handling from URR. It also stopped overwriting saved engine turn order with the server's generic current-player names: auctions and consent requests need their own order.

**Keep:** reuse the site's persistence and utility contracts, then delete donor mechanics the new game does not use. Keep engine turn order, server notification recipients and practice account identity distinct. Do not use a simple sibling's turn reconstruction as a universal model.

### 2. Rules need original sources, including the board

The foundation commit corrected state membership on three printed areas, marker limits/reuse, canal entry direction, declined consent, returned-water histories, era-change funding and immediate resale. These interact with treasury, leadership, supply and later turns. `5a5e83fa` added the explicit Calah-own-forest exclusion and adjusted its regression check.

`5f6962df` then proposed prohibiting confluence reservoirs and reserving every outstanding bid. `681928ce` retired that audit and documented why both recommendations were wrong: the rulebook allows the reservoir downstream of the confluence and explicitly releases outbid money. It retained the literal Eridu reading rather than inventing an exception. `5eeb0d3b` later intentionally changed player-owned Barahshum timing to its owner's turn.

**Keep:** replay published examples, inspect component data and test interactions. Distinguish a proven defect from an interpretation or intentional simplification. An impressive audit with fuzzing can still propose the wrong fix. Do not teach URR's final special-power timing as a rule for another game.

**Still uncertain:** `FOUNDATION.md` records physical-component confirmation gaps for the full land-price track/intervention price, waterwork counts, printed state order and ownership-marker count. This review did not close them. The foundation's original browser scenarios were not repeated here.

### 3. Save growth is a structural problem

The foundation report records a real browser save failing with `RequestDataTooBig`, spread-argument overflow during base64 conversion, and rewind amplification: about 65.99 MB at 84 history entries. `ec6e6148` added compressed transport, chunked byte conversion and compressed rewind points. `681928ce` introduced history deltas and cheaper compression. `6055f336` moved toward deterministic action replay and board differences; its PR reports a 12.9 MB finished game becoming 66 KB before gzip. Those sizes are historical measurements, not measurements from this review.

`5183bcf1` added a separate compact save codec; `72f45826` removed it in favor of the site's array/gzip pattern and moved snapshot/import/export helpers into `URRfuncs.js`. `5d151000` made compact action records the in-memory history shape, with reconstructed positions kept in a non-persisted cache. `1ae64ef0` and `bffe5a97` compacted optional fields, vocabularies and area references further, normalizing action rows on save.

**Keep:** persist gameplay and action data once; derive display rows and replay positions. Separate readable model objects from wire encoding. Measure full-game behavior before designing a codec, and include rewind amplification and reload CPU. URR's fixed 9×10 area encoding and array slots are local choices, not requirements for new games.

### 4. Compatibility was repaired, then narrowed again

`5183bcf1` removed old decoders; [#145](https://github.com/DodgerB85/OnlineBoardGamers-Server/pull/145) explicitly said old games would need restarting. `72f45826` further changed storage. `5eeb0d3b` restored prior object saves, board formats, `gzip:` rewind decoding and replay timing for historical Barahshum interruptions. It also retained opening changes in finished-game saves.

**Current limitation:** `5d151000` removed the old object decoders, prefix handling and replay-rule marker from the frontend again. At this baseline, `URRfuncs.importURRmodel` accepts the current compact array and opening markers; `URRhistoryStorage.expandHistory` expects numeric action records. Backend rewind tests still exercise older representations. Passing those tests does not establish end-to-end old-save compatibility. No evidence of a complete data migration was found in these changes.

**Keep:** preserve published save meanings, use actual old fixtures and test the frontend and backend together. The skill's compatibility requirement comes from the project contract and this history of breakage; it is not a claim that current URR satisfies it. Do not repair this unrelated implementation while adding another game.

### 5. Rewind must save the position before the move

`ec6e6148` changed rewind to retain the previous position and recover the opening from the first history snapshot. `681928ce` corrected redo anchors after client compaction and compared decompressed rewind content to avoid duplicates. `72f45826` simplified storage; `5eeb0d3b` restored legacy decoding and opening corrections.

**Keep:** first-move rewind, play-on after rewind, mixed supported representations, twenty-point retention and kickout cleanup are separate cases. See `tests/test_urr_rewind.py`. Do not mistake a snapshot of the just-saved position for a useful rewind point.

### 6. Replay is an isolated view

`ec6e6148` fixed replay step zero showing the live position and menu-close leaving the historical position active. It captured/restored full state on mount/unmount rather than restoring just players. `64f94698` introduced completed-water playback using a separate board/state, with no live save or selectable live actions. `52413239` and `49ad0281` preserved waiting confluence water and a reservoir's undiverted share across steps.

**Keep:** test every close path and final historical state. Animation is explanatory output, with manual stepping and reduced motion. It must not silently mutate the live board. Playback tests compare final irrigation and preserve the input history.

### 7. Editable turns need explicit decision boundaries

`681928ce` changed per-action saves into local checkpoints until End Turn, with Undo and Reset, draft invalidation on incoming data, synchronized map/form selection and forced-action suspension. `07380b82` stored draft actions so an earlier choice could be removed by replaying later choices, restoring the backup when dependencies no longer fit.

`64f94698` deferred waterwork consent until End Turn, advanced after final approval, and reopened declined plans while retaining earlier valid agreements. `52413239` kept the original action panel visible after the model had advanced to a new context. `1327bf88` corrected crew summaries across an era boundary and removal down to mandatory crew minimums, including First Akkadians restoration.

**Keep:** “same user” does not mean “same decision.” Model state, review context, local selection, server commit and external consent have different lifetimes. Previews and Undo must preserve the original state and use the same rules as final submission. See `URRgame.test.js` and the turn checks in `rulesCheck.mjs`.

### 8. Automate only outcomes that contain no choice

`07380b82` auto-saved sessions containing only forced moves. `52413239` resolved forced actions sequentially and sent all water to a sole destination pump, stopping at a genuine downstream choice. `1327bf88` recognized a terminal pump as irrigation when enough water served every option, while retaining choice when water was scarce.

**Keep:** ask whether all legal paths lead to the same meaningful outcome. Use rule actions, stop at a decision, and let Undo/Reset suspend automation. A bot's policy for an abandoned seat is not the same as a forced action for a present player.

### 9. Site registration and multiplayer were incomplete

`c20c61c5` corrected the Vite port to 3054 and added the Django static-image proxy; `57655619` corrected the template's matching dev URLs. `fc6445d1` handed practice aliases from the creator's notes to persistent client display names and cleared the notes stash.

`66461c8e` completed kickout eligibility, missing-seat propagation and polling of votes even when the board version was unchanged. `6055f336` removed forced practice mode from form, create view and backend, added URR to `GAME_NAMES_MODELS` so PvP joining worked, restricted resignation on the server and persisted missing-seat actions before the next real player's notification. Shared commit `7e32bfed` separately removed an unnecessary whitelist gate that made newer practice games appear already deleted.

**Keep:** trace every lifecycle action outside the game directory. Test practice aliases, real independent users, join, timers, votes, resignation, replay, rewind, deletion and finish as distinct flows. Preserve stable seats rather than splicing players out of arrays. `08faf39e` touched only URR bundles; its source kickout changes belong to sibling games and are not a new URR pattern.

### 10. Client-owned rules still need server authorization

`9a7aa50e` replaced the hardcoded backend admin username with `is_game_admin` and escaped practice display-name JSON for its script context. `4de92a34` added `can_act_in_game` to turn processing and forced chat attribution to the authenticated sender. `c963f9d1` used bounded gzip decompression and limited chat text to 2000 characters.

**Keep:** reuse shared authorization and compression helpers; do not copy old username privileges, `safe` template injections or client-supplied chat identities. These changes establish a boundary, not a claim that every malformed request path was comprehensively hardened.

### 11. Equal-version WebSocket replies caused a loop

`6714b11e` changed the equal-or-older reply into an older-only reply. `URRwebsocket.test.js` reproduces equal versions, an older-client correction and a newer-version fetch. IO also defers refresh during replay/saving and imports data before adopting its version.

**Keep:** test update protocols as state transitions and include equality. A UI freeze can be a network feedback loop, not slow game rules. Repeated broadcasts must settle, and polling must still work.

### 12. History and translations could make the map expensive

`1747d544` replaced whole-history reactive recomputation with incremental rows and a separate river-report subscription for the map. `e0fa8e4e` cached area descriptions by their actual inputs, including locale, and cleared development-only vue-i18n performance entries. Its comments attribute the slowdown to Firefox formatter/timeline behavior; that diagnosis was not independently profiled here.

**Keep:** keep derived snapshots out of deep reactive persisted state, constrain subscriptions and invalidate caches on every relevant state/locale change. Profile the affected browser and build mode. Do not paste these caches or instrumentation cleanup into another game pre-emptively. Full decoded-state logging was removed in `e0fa8e4e` but exists again in current `exportURRmodel`; current source is not proof that logging is free or desirable.

## Taste observed through revisions

These preferences are inferred from repeated diffs and explicit PR descriptions, not recovered verbatim user requests:

| Preference | Evidence and scope |
| --- | --- |
| Make game components recognizable | Foundation artwork/map work; nation grid and player markers in `70579ce0`; currency units with accessible text and safe Vue rendering in `1327bf88` |
| Keep decision review in context | `681928ce` added review; `52413239` explicitly rejected replacing the original panel with a numbered confirmation list |
| Remove repeated UI | Redundant map shortcuts removed in `681928ce`; repeated instructions/status messages trimmed in `64f94698`; help reduced to the site's smaller shape in `6055f336` |
| Show consequences and supply | Reserved-vs-available bidding cash in `70579ce0`; remaining waterwork tokens in `52413239`; crew costs/era/First Akkadians warnings in `1327bf88` |
| Preserve selection and editing | Canal selection survives form synchronization in `681928ce`; removing staged equipment preserves its panel in `52413239`; rejected clicks keep the path |
| Keep visual alignment out of rules | `6714b11e` corrected adjoining hex borders and applied display offsets without changing saved centers or neutral river ownership; board-display regression tests enforce that separation |
| Favor stable desktop layout and ordinary scrolling | `7cd58624` deliberately enforced a desktop minimum width; `07380b82` removed inner action-panel scrolling; `92813bc8` removed sticky bottom controls. Do not turn this into a universal ban on responsive layouts or sticky panels |
| Match the site's shell and credits | `82d8157f`, `d6b19fcf`, `f7911a0e`, `b1b8ae62`, `b6d4a4e6`, `c394bbd3`; help/menu/footer/loading treatment belongs to the integration, not only gameplay |
| Keep prose concise and actions precise | `abd35647`, `f99c4bcb`, `edebce41`; the final clear-digging label distinguishes clearing a selection from undoing a committed action |
| Preserve local module style | `c301771b` explicitly changed many URR imports to namespace imports; it does not prescribe a mass rename or import rewrite in other games |

`f7911a0e` removed the browser rewind alert in favor of the site's normal practice/voting flow. Prefer contextual confirmations where warranted, without adding an extra alert to every reversible action. `1ab15217` deleted 203 temporary/reference asset files; retain runtime artwork and useful rule sources without shipping the whole extraction workspace. Historical commits included dist output, but current `AGENTS.md` explicitly forbids including generated bundles in new commits.

## Coverage inventory

The table accounts for every reachable commit touching `URR/`. Dates use author dates, so they are not strictly increasing. “Build” describes URR's part of the commit; other games may have source changes. Build artifacts were checked for scope, not reverse-engineered. Hashes are directly resolvable with `git show` in this repository.

| Commit | Date | URR work and review classification |
| --- | --- | --- |
| `454bb2f7` | 09-28 | Creation, generic scaffold and shared game registration |
| `83bb4f02` | 09-28 | Raw source artwork/component assets imported |
| `82d8157f` | 09-30 | Chat/history heights fit the page/footer |
| `3c5adcee` | 09-30 | Build |
| `47826e23` | 10-02 | Remove empty per-app tests stub; root test convention |
| `ec6e6148` | 10-04 | Squashed rules foundation, board/artwork, UI, saves, replay, rewind and playtest restriction |
| `c20c61c5` | 10-04 | Dev server port/proxy configuration |
| `6f2449a8` | 10-04 | Build |
| `57655619` | 10-04 | Template dev URLs match server |
| `1ab15217` | 10-04 | Temporary/reference extraction assets removed |
| `fc6445d1` | 10-04 | Practice names/notes handoff and notes indicator |
| `5a5e83fa` | 10-04 | Calah forest exclusion regression |
| `d6b19fcf` | 10-04 | History presentation matches site |
| `2d21d1ff` | 10-05 | Original rulebook PDF added under static rules |
| `5f6962df` | 10-05 | Report-only audit, subsequently corrected/retired |
| `681928ce` | 10-06 | Local draft turns, contextual map, replay deltas, rewind fixes, audit correction |
| `5d54b329` | 10-06 | Build |
| `66461c8e` | 10-07 | Shared nudges/statistics integration and complete kickout flow |
| `29390331` | 10-07 | Merge-conflict source corrections |
| `b2fa97f3` | 10-07 | Build |
| `c301771b` | 10-07 | Namespace import style enforced |
| `d16ca8c0` | 10-07 | Local nudge component and Vite adjustment |
| `70579ce0` | 10-07 | Nation bidding, markers, compact controls, maintenance preview reuse |
| `6cdc6335` | 10-08 | Build |
| `7cd58624` | 10-07 | Bidding/layout follow-up, fixed desktop width/footer |
| `07380b82` | 10-12 | Map-first trades, staged equipment, removable choices, forced-only saves |
| `a1be861a` | 10-13 | Build |
| `64f94698` | 10-14 | Panels, deferred agreements/editable declines, historical water playback |
| `52413239` | 10-15 | Original review panels, supply visibility, forced water, junction playback |
| `a12a8d83` | 10-15 | Build |
| `f7911a0e` | 10-15 | Colors/loading consistency, text emphasis, remove rewind alert |
| `6055f336` | 10-18 | PvP join/creation, compact action replay, resign/missing seats, shorter help |
| `b1b8ae62` | 10-18 | Footer implementation/permission credits |
| `49ad0281` | 10-18 | Continuous animation speed and undiverted waiting water |
| `a8f9a612` | 10-18 | Save-data diagnostics added; not a universal pattern |
| `5183bcf1` | 10-19 | Compact state codec, old support removed |
| `72f45826` | 10-19 | Array/gzip storage and helper consolidation |
| `5eeb0d3b` | 10-20 | Compatibility repair, board defaults, own-turn Barahshum, cancel/visibility |
| `4b0b764f` | 10-20 | Build |
| `2b122c87` | 10-22 | Shell favicon/thumbnail update |
| `9a7aa50e` | 10-22 | Admin permission helper and escaped names |
| `4de92a34` | 10-23 | Vue translations/locales; server actor and chat attribution checks |
| `c963f9d1` | 10-23 | Bounded decompression and chat validation |
| `6714b11e` | 10-23 | WebSocket echo fix, hex display geometry, UI refinement/tests |
| `294a2b34` | 10-24 | Build |
| `b6d4a4e6` | 10-24 | Game-themed loading shell and reduced motion |
| `abd35647` | 10-24 | Intro text/line breaks |
| `f99c4bcb` | 10-24 | Settlement alternatives and labels/layout |
| `5d151000` | 10-24 | Numeric action-only history/cache; earlier compatibility paths removed |
| `1747d544` | 10-24 | Incremental history rows and separate map river reports |
| `e0fa8e4e` | 10-25 | Translation description cache and dev performance-entry cleanup |
| `60ff3c2e` | 10-25 | Build |
| `1ae64ef0` | 10-25 | Optional/vocabulary action compression |
| `92813bc8` | 10-25 | Remove sticky bottom action bars |
| `bffe5a97` | 10-25 | Area/token encoding, normalized action rows |
| `1327bf88` | 10-27 | Accessible currency, controls/crew previews, forced irrigation, FA history |
| `13325faf` | 10-27 | Build |
| `c394bbd3` | 10-27 | Site history styles and map highlights |
| `08faf39e` | 10-27 | URR build only; kickout source edits are in siblings |
| `edebce41` | 10-27 | Clear digging-selection wording across locales |

## What checked this review

Fresh checks at the baseline, on 2026-10-27:

- `node --test URR/vueURR/src/js/*.test.js URR/vueURR/src/backend/*.test.js URR/vueURR/src/components/*.test.js`: **55 passed**.
- `node URR/vueURR/rulesCheck.mjs`: **passed**, including rules, replay-storage and decision-boundary checks.
- `.venv/bin/python manage.py test tests.test_urr_rewind tests.test_urr_kickout --noinput`: **17 passed**, system checks clean. These targeted backend tests are narrower than a complete multiplayer test.
- Transfer walkthrough against `WEB`: its creation path, frontend package and view patterns differ from URR; it uses older local invite validation and has no frontend test script. This supports choosing shared validation/current package commands rather than copying either game's entire implementation. This was a source walkthrough, not a new-game build or independent agent evaluation.

The rulebook and printed components are the independent oracle for rules; persisted DB state, rejected stale requests and converged independent clients are the oracle for integration; preserved old fixtures are the oracle for compatibility. Tests and browser evidence need to agree with those outcomes, not merely with this document.

Not repeated: production build (documentation-only change), live/browser multiplayer, long-session profiling, a full backend suite, translation quality or physical-component verification. Historical browser/build/size claims above remain attributed reports. No gameplay code or saved games were changed by this review.
