# URR implementation

Rules reference: [Ur, 1830 BC rulebook](../Ur1830Rules.md). The client implements the rulebook's settlement, development, rainy-season routing and harvest flow on the printed board. The Django server remains responsible for saving game data and coordinating turns.

## Structure

- `src/js/URRreference.js`, `URRrules.js`, `URRmap.js`, and `URRgame.js` define constants, rule queries, board operations, and plain-data game actions.
- `src/js/URRboard.js` transcribes the printed 90-area board, its three rivers and downstream links, state layout, nation homelands, canals, and terrain regions. `createPrintedBoard(markerLimit = null)` accepts the ownership marker count; the default `null` leaves that limit unenforced because the printed count is not known.
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
