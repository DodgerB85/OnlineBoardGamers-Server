# URR implementation

Rules reference: [Ur, 1830 BC rulebook](../Ur1830Rules.md). The client implements the rulebook's settlement, development, rainy-season routing and harvest flow on the printed board. The Django server remains responsible for saving game data and coordinating turns.

## Structure

- `src/js/URRreference.js`, `URRrules.js`, `URRmap.js`, and `URRgame.js` define constants, rule queries, board operations, and plain-data game actions.
- `src/js/URRboard.js` transcribes the printed 90-area board, its three rivers and downstream links, state layout, nation homelands, canals, and terrain regions. `createPrintedBoard(markerLimit = 30)` enforces the original 30 ownership markers per player (BGG print-and-play README); `null` disables the limit.
- `src/js/URRwater.js` resolves river routing as a stack of water allocations, including tributary arrivals, pump handoffs, returns and downstream outflow.
- `src/js/URRmodel.js` handles versioned JSON saves, history, replay, and legacy board migration. `URRcontroller.js` checks viewer permissions and submits through the existing Django IO.
- `src/components/` provides the map, markets, holdings, state/player panels, history and replay views, and phase-specific action controls. Static board and component artwork is in `../static/URR/images/`.

`applyAction(position, playerIndex, action)` produces a new position; invalid actions throw without mutating the input. Game data is plain JSON. Player seats use indexes, and states, nations and terrain use constants from `URRreference.js`. Player turn order remains sequential and compatible with the shared server protocol.

## Implemented gameplay

- Nation division, treaty purchases, bids and auctions, independent nation income, and First Akkadians' three-land grant and payment to Akkad.
- Settlement purchases, ordered sale batches, land prices, price movement, primogeniture bidding, state emergence and kingship succession.
- Canal construction by state crews and Eridu; equipment purchases, era changes, obsolete crews, waterwork construction and consent requests.
- Maintenance liquidation and revolution resolution, including throne-preserving sales and compulsory harvest distribution after revolution.
- Barahshum's between-turn canal exchange and Calah's free waterwork exchange.
- Rainy-season routing through the printed rivers and waterworks, reachable land irrigation, harvest distribution or storage, region-based price changes, and final scoring. First Akkadians' income and grant are handled separately as specified by the rules.

Returned water remains in separate batches with its pump traversal history and originating reservoir, so returning a batch does not mark untouched water as having visited those pumps. Era changes apply before a purchased card's maintenance funding is checked. Settlement controls also allow queuing the newly purchased land for an immediate sale in the same turn.

The normal game view includes map selection, route selection, action controls, player holdings, markets and phase/state displays. Debug fixtures remain separate from normal setup and are not replaced by the printed-board setup.

## Saves and local API

New games use `createPrintedBoard()` by default. Earlier versioned saves whose board has no areas are loaded with the printed board while preserving their saved game state and economy. Legacy unversioned scaffold saves still initialize from player names, and debug fixtures remain available for development.

```js
import { createGame, applyAction } from "./src/js/URRgame.js"
import { createPrintedBoard } from "./src/js/URRboard.js"

let position = createGame(["Alice", "Bob", "Carol"], createPrintedBoard())
position = applyAction(position, 0, { type: "buyNation", nation: 0 })
```

## Verification status

Seventeen temporary headless scenarios passed, covering the opening auction, sales, activation, maintenance/revolution, nation exchanges, water conservation, tributary waits, pump handoffs, returns, reload during routing, harvests and invasion scoring. Chrome completed an opening and a full round through the normal controls using a local save stub, with no missing images or runtime exceptions. The updated frontend was also inspected on the existing URR 191 page while logged in as user1, with its purchase control enabled and all images loading. Live multiplayer and real Django move submissions have not been verified; no moves were submitted to game 191 during inspection.

The subsequent rulebook audit passed 59 temporary headless checks covering distinct water-batch histories, pump backtracking and ownership attribution, reload during routing, confluence waits and conservation, canal path costs and invalid intermediate areas, city prices and shaded-zone sales, immediate crew replacement in eras 3/4/M, consecutive settlement passes, flipped-marker activation, Der's free purchase, immediate resale, monarch ties and throne-preserving sales, Barahshum timing, and state-owned Eridu maintenance. The production frontend build passed. This audit did not repeat browser or live multiplayer verification.

## Live browser audit — 2026-10-02

This audit supersedes the earlier lack of real Django submissions. All moves in games 191 and 192 used the normal browser controls in visible Chrome, authenticated as user1. Both are local practice games; all three seats can be controlled by user1. Store inspection and database queries were read-only. Additional engine fixtures below are explicitly separate from browser evidence.

Game **191 ended in round 11, era M, by invasion**: 24 water were used for irrigation and none flowed off the board. Harvest decisions completed before game over. Reload showed the same final position, and the database record was `FINISHED`, phase 4, turn 11. Independently summing private cash and current land prices, including city prices, reproduced every score:

| Place | Seat | Private cash | Land value | Final assets |
| --- | --- | --- | --- | --- |
| 1 | user1 | 1322 | 2662 | 3984 |
| 2 | SHADOW_2 | 544 | 2825 | 3369 |
| 3 | SHADOW | 710 | 2348 | 3058 |

### Coverage against the rulebook

| Sections | Browser evidence | Supplementary targeted evidence / limits |
| --- | --- | --- |
| 1–2: treasuries and setup | Three-seat starting economy, separate state/private treasuries and seat controls in 191/192 | Four-, five-, and six-player starting amounts checked with engine fixtures; no browser games at those player counts |
| 3: independent nation division | Treaty purchases in 191; 192 exercised all-pass tribute, four Ashur discounts to a free award, later offers, competing auction bids, withdrawal, single-offer automatic award, resumed turn and First Akkadians' treasury payment/land grant | Engine checks additionally verified offer escrow and bidding order |
| 4: settlement | Colonization and repurchase, immediate resale, multi-area same-price sale batch, price movement, primogeniture bids/refund, consecutive passes, activation including flipped markers; 192 verified clockwise succession between tied challengers | Sale cap, intervention/shaded-zone boundaries, city price ties and current-monarch ties additionally checked in fixtures |
| 4: validation | Browser rejected owned/closed nation land, buying a terrain sold this phase, buying in an emerging state sold this phase, and selling the last player-owned area | Marker exhaustion was then fixture-only; new games now enforce 30 per player (see gap closure below) |
| 5.1–5.3: development | Eridu before states, state order, crews 1+1/2/3/4/M, canal paths/junctions, shared card supply, reservoir/pump purchases, consent accepted and declined, equipment ending digging | Invalid repeated/nonadjacent paths, river traversal and intermediate junctions; finite physical waterwork supply exhaustion checked in fixtures |
| 5.4–5.5: eras/maintenance | All five eras reached; obsolete crews/nations disappeared; era-4 purchase correctly used the monarch's private shortfall after removing crew/Eridu; M maintenance required a throne-preserving forest sale and rejected an unnecessary second sale | Immediate maintenance funding in eras 3/4/M and a complete revolution through the following rainy season were checked with engine fixtures; revolution was not reached in the browser |
| 5.6 and 9: nations | Der free forest with no state payment; player Barahshum exchange between states; Calah assimilation/free reservoir/card consumption; Ashur decline/accept and state-to-state transfer; player/state Eridu digging/income/maintenance; First Akkadians' income and dissolution | State-owned Barahshum exchange and Calah location/card restrictions additionally checked with fixtures |
| 6.1: water | River sources/confluences, numeric capacity/reach, M reservoir/pumps, cross-state pump handoffs, mandatory pump-own-area irrigation, separate returned-water batches and revisitation restrictions; exact routing state survived reload | Fixtures additionally checked unlimited M reach stopping at other pumps, tributary aggregation and conservation |
| 6.2–6.3: harvest/prices | Private 5 SPL/city 10 SPL income; state yields 20/25/30 with doubled cities; distribution with rounding/remainder; storage removed lowest numeric waterwork; zero harvest storage removed none; regional prices advanced | Sole-owner full harvest, mill-only storage retention and counting regions rather than individual areas checked with fixtures |
| 7: game end | Invasion, final harvest completion, rankings, private assets only, saved finished state and reload | Revolution ending and exclusion of nation/state assets also checked with fixtures |
| Web functions | Real Django saves throughout; reload during water routing and after completion; all 358 history entries displayed; replay step 0/next/previous/menu close/Exit Replay exercised | Rewind UI is intentionally hidden in practice games. Mocked server checks verified legacy, compressed and mixed rewind entries; no browser rewind verification. Independent users, stale concurrent writes, notifications and tournament completion remain unverified |

Twenty-six additional temporary engine scenarios/groups passed during this audit. They cover the supplementary cases above; they do not count as browser verification. Production frontend builds, Python compilation, and mocked rewind compatibility checks passed.

### Failures fixed and retested

- Replay initially displayed the live position at step 0 and could leave a historical position active when closed through the menu. It now applies the first snapshot on mount and restores the captured live snapshot on unmount. Retested both during play and after completion.
- A normal save exceeded Django's request-size limit after history grew: the browser received HTTP 400 `RequestDataTooBig`. Game submissions now gzip/base64 the transfer while preserving plain JSON game storage and legacy callers. Saves continued successfully through the 12.9 MB final game data.
- Compressing larger histories exposed the JavaScript spread-argument limit. Byte-to-string conversion now works in bounded chunks; long-game browser saves passed.
- Twenty rewind points each embedded the full replay history, producing 65.99 MB of rewind data at only 84 history entries. Rewind points are now compressed, with transparent legacy decoding. Subsequent browser saves used the new format; at 94 entries the rewind array was about 5.9 MB. Finished-game handling clears rewind normally.
- The earlier water-batch, era-change funding and immediate-resale fixes all passed actual browser moves in game 191.

The original local Django process grew beyond 9 GB while debug toolbar/profiling was enabled, and the desktop/browser/server crashed during the session. Play resumed with profiling middleware disabled in a temporary local settings module. Django was about 665 MB near completion. Full per-action history still grows with game length; compression reduces amplification but is not proof that no heap leak exists. Profiling-enabled memory behavior has not been retested. No project-wide debug settings were changed.

## Rulebook gap closure — 2026-10-02

Fixed after a second section-by-section rulebook review. `node rulesCheck.mjs` (in this folder) asserts each one:

- Ownership markers: 30 per player for new games. Rebuying your own sold land reuses its flipped marker (4.3).
- Board transcription: B7 hills are Akkad (were Persia), Ashur's E8 forest is Akkad (was Elam), and E9 forest is Persia (was Elam). States now have 11 land areas each, except Elam with 12. This affects colonization treasuries, activation, monarchs, development order and harvest shares. Saved games keep the board they were created with, so games 191/192 retain the old assignment.
- Calah's free waterwork may go on Calah's hills or land adjacent to Calah, not on Calah's own forest (9.3, literal reading).
- Canal stretches may be entered from either end; one end must already hold a river or canal (5.2).
- A declined waterwork or assimilation request no longer ends the state's digging step (5.1).
- The check also confirms the printed region counts: 5 hills, 4 forest, 3 savannah, 4 desert (6.3).

Confirmed as already matching: seat order is shuffled by the lobby (2); the rulebook's 3.2 division example, the 4.4 sale example, the 4.7 city-price example, clockwise monarch ties and the section 10 table all replay exactly.

Open interpretations, unchanged: a player-owned Barahshum may be dissolved after each state, including the last, but not between Eridu's dig and the first state. FA land stays closed to buying and digging while FA is player-owned. Forced maintenance and revolution sales preserve the throne. These rule changes have not been replayed in the browser.

## Canal selection and rules review — 2026-10-05

Canal tracing uses the selected unused crew's capacity (2 for Eridu). Green hexes complete a legal route; dashed hexes start or continue a route that can still reach the existing network within budget. Invalid clicks leave the draft unchanged and explain the restriction beside the map. The map shows canal and junction costs, supports Undo/Clear, and allows tracing from either end. Final submission still validates the complete path. Changing crews revalidates the draft.

The rules review corrected three findings in the retired audit:

- Only the highest offer on each nation reserves money: an outbid offer is returned explicitly in 3.2.
- Reservoirs are legal in confluence areas, downstream of the meeting point (5.3.1.1). The routing engine waits for the tributaries before processing the area's reservoir.
- Eridu is a normal 2-digger with special ownership and timing (9.5), without a homeland exception to 5.2. Player-owned nation land remains closed, including its own homeland. No authoritative online ruling overriding this reading was retrieved from the publisher's rules/errata links.

`rulesCheck.mjs` covers route budgets, split and M crews, adjacency, repeated areas, existing canals/interior junctions, dry-end completion, nation closure, released offers, and confluence reservoir construction.

Remaining component checks from the retired audit: confirm the full land-price track/intervention price, per-state waterwork token counts, printed state order, and 30 ownership markers against physical components. Rulebook examples alone do not establish all these values. Other report-only observations were a stale auction award for a manually corrupted save (unreachable through normal bidding), cross-state nation homelands affecting the board locator label, misleading maintenance-sale errors, and practice-game/debug access settings. These were outside the canal-selection change; maintenance already offers a revolution button.

## Replay save performance — 2026-10-05

`URRhistoryStorage.js` stores full snapshots at the opening and turn/phase boundaries and lossless property changes between them. Import expands the stored history back to full snapshots, so history presentation, replay stepping, and individual rewind behaviour remain unchanged. Old full-snapshot histories and mixed legacy/gzip rewind points remain supported. The later draft-turn layer below commits these compact positions on End Turn. Compact records are cached per history entry, including the preceding snapshot, so appended moves and replay branches invalidate only affected records. No game rules are re-run to reconstruct historical positions.

On game 193's 384-entry sample, all reconstructed positions matched the originals. The JSON save shrank from 13,937,865 to 1,381,558 bytes; gzip level 6 shrank the payload from 1,251,388 to 133,384 bytes and measured roughly 16 ms for the compact payload in Node. In Chromium, gzip preparation fell from about 440 ms to 47 ms; compaction took 184 ms once and 2.3 ms on subsequent saves. Browser checks covered a mocked irrigation save/reload, individual replay positions, restoring the live position, and rendering every history entry without runtime exceptions. Rewind compression now uses level 6 instead of the default level 9 without changing its format. Existing rewind points are preserved; subsequent points use the compact save. `rulesCheck.mjs` covers replay storage edge cases, and `tests.test_urr_rewind` covers backend rewind compatibility.


## Draft turns and action interface — 2026-10-05

All phases now prepare local actions until End Turn commits them. Undo restores the preceding action checkpoint; Reset Turn restores the start of the current decision session and clears unsubmitted form/map drafts. These checkpoints retain state and history length rather than copying the full replay. Actor, state, phase, routing source and consent boundaries stop the draft before another decision can be taken, even when the next decision belongs to the same player. Existing forced-action rules are unchanged; Undo/Reset pauses their watcher so they cannot immediately repeat an undone action. End Turn can resume the existing forced steps, but never chooses an ambiguous routing or harvest option. Shared rewind applies to saved turns and is disabled while a local draft exists. A refresh discards the local draft; an incoming saved update clears it and explains why.

Map selection and irrigation/removal dropdowns are synchronized. Irrigation has nearby confirmation/cancel controls backed by the same submission path as the sidebar. Development uses expandable digging, equipment and nation sections, with construction sites validated by existing rule previews and highlights scoped to the selected construction, sale or exchange action. The action panel reports draft transitions, shows the choices awaiting confirmation, and identifies the next player/context after saving. Shared history panel behavior remains unchanged.

Verification uses the existing frontend rule check and Chromium CDP with mocked saves: recorded choices across auctions, land trades, development, consent, river flow and harvest retain their original rule results, Undo/Reset restore state and history, no action posts before End Turn, and reviewed handoffs submit once. Map/dropdown selection, inline confirmation, and stale draft invalidation are also checked without writing to a live game.
