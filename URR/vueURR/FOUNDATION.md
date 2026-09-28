# URR rules foundation

Rules source: [searchable rulebook](../UrErules.md). Read that first; use the PDF for diagrams. The land price track and intervention boundary were read from `../tempAssets/BGG/ur_1830_bc_all_files/chart.pdf`.

This is a headless foundation, **not yet a playable implementation**. No game UI was added. The existing placeholder controls do not expose the action API.

## Structure

Following FCM's separation of responsibilities:

- `src/js/URRreference.js`: phases, nations, technology, prices and supply constants.
- `src/js/URRmap.js`: logical board, canal construction costs and waterwork reach.
- `src/js/URRrules.js`: rule queries, prices, ownership, kingship, maintenance and harvest calculations.
- `src/js/URRgame.js`: plain-data setup and actions; no Vue, browser or network dependency.
- `src/js/URRmodel.js`: Pinia integration, versioned persistence and complete history snapshots.
- `src/js/URRcontroller.js`: viewer permission checks and submission through existing Django IO.

`applyAction(position, playerIndex, action)` returns a new position. Invalid actions throw without modifying the original. Money is integer SPL. Players use seat indexes; states/nations/terrain use the reference constants. `null` denotes no owner, marker, waterwork or irrigation. A sold plot retains `markerOwner` while its `owner` becomes `null`.

Player seat order is already randomized by the Django presenter. Do not shuffle again in the client. `fullTurnOrder` keeps seat order; `finalPositions` holds score order separately.

## Turn model and data coverage

URR has no simultaneous submission phase (rulebook pp.4–8, 12–14). Auctions, settlement, state development and waterwork decisions are sequential. Harvest decisions can also use the prescribed state order. Consent is an interrupt/resume handoff, not a simultaneous turn. Barahshum's between-turn ability will need an interrupt window, not a batch of secret moves.

The client retains `turnOrder` as a zero-or-one-seat array to match existing save, notification and rewind APIs. `allIsCurrentPlayers` and `allRemainingPlayersInTurnOrder` are shared server protocol fields and remain necessary even with one acting player. URR does not use pending-player arrays, submitted-move buffers or post-stack transaction handling.

Data is stored as plain JSON objects, not classes or TypeScript interfaces. The implemented mechanics have shapes for players, states, nations/bids, areas, canals, waterworks, crews, auctions, consent requests, technology, harvests and history. This is not yet a complete data model for the whole game: directed river topology, water-routing queues/return paths/visited pumps, forced-sale/revolution resolution and special exchange interrupt state still need defining alongside their mechanics.

## Implemented

- 3–6-player setup, private/state treasuries and separate equipment supplies.
- Nation treaty purchases, negotiations, reserved funds, auctions, Ashur discounts and pass income; First Akkadian payment/land grant.
- Settlement buying and batch selling, fixed colonization versus market prices, city prices, marker limits, terrain/emerging-state rebuy restrictions and intervention pricing.
- Kingship with incumbent ties and clockwise succession, primogeniture bidding/refunds, consecutive passes and permanent state activation.
- Independent nation income, Eridu's pre-development crew and frozen state development order.
- Canal paths, junction costs, 1+1/M crews and closed independent nation land.
- Equipment purchases, shared card stacks, era changes, obsolete crews, mandatory first-crew contributions from the king and physical waterwork token limits.
- Era-3 nation assimilation and waterwork construction with explicit owner consent. An offer temporarily makes the recipient the active player; its response resumes the original king's turn.
- Der's forest exchange and the disappearance of First Akkadians when Akkad hires a crew.
- Waterwork reach through canals, stopping at pumps and rivers.
- Harvest accounting, city multipliers, distribution rounding, storage/removal, regional price increases and final private-asset valuation.
- Complete JSON save/load and replay snapshots. Saved turn order remains authoritative during reloads, polling and rewind.

Unversioned scaffold saves initialize a fresh rules position from the saved player names and emit a console warning. Those saves contained no economic/board mechanics. Unsupported future save versions and malformed JSON raise errors rather than silently replacing the position.

## Headless API

```js
import { createGame, applyAction } from "./src/js/URRgame.js"

let position = createGame(["Alice", "Bob", "Carol"], boardDefinition)
position = applyAction(position, 0, { type: "buyNation", nation: 0 })
```

For the Vue store, call `model.initGameFresh(names, boardDefinition)` then `controller.submitAction(action)`. The controller uses the current seat in training games, and the viewer's seat otherwise. `model.performAction(seat, action)` is the local, non-network variant.

| Phase | Actions |
| --- | --- |
| Nation division | `buyNation { nation }`, `bidNation { nation, amount }`, `pass` |
| Active nation auction | `bidNation { amount }`, `pass` (withdraws) |
| Settlement | `tradeLand { sellBefore: [ids], buy: id, sellAfter: [ids], exchangeDer?: true }`, `bidPrimogeniture { amount }`, `pass` |
| Eridu | `digEridu { path: [areaIds] }`, `pass` |
| State development | `dig { crew: crewId, path }`, `buyCard { kind, area? }`, `requestWaterwork { kind, area }`, `offerNation { nation, amount }`, `endDevelopment` |
| Pending offer | `respondOffer { accept: boolean }` |
| Harvest decisions | `harvest { choice: "distribute" }` or `harvest { choice: "store", remove?: areaId }` |

All action objects include `type`. Trade fields are optional, but an empty trade is invalid. Card kinds are `digger`, `pump`, `reservoir`. Digging ends when the state starts purchasing or requests consent. Another player's land requires `requestWaterwork`, not a client-provided permission flag.

The rulebook does not prescribe a detailed auction speaking order. This implementation cycles seated eligible bidders after the high bidder, skipping the current high bidder; withdrawing is final for that auction.

## Board definition contract

The actual printed map **has not been encoded**. Supply a verified logical board before playing beyond nation division. Setup without a board permits inspection of the initial economy and early auctions, but awarding First Akkadians requires its three printed lands. There is deliberately no invented map or guessed piece count.

```js
{
  markerLimit: /* printed ownership markers per player */,
  stateOrder: [/* all six state IDs in printed tie-break order */],
  waterworkLimits: {
    /* state ID: { printed capacity: physical token count, ... } */
  },
  areas: [{
    id: "unique-stable-id",
    state: /* state ID */,
    landType: /* terrain ID; not used for rivers */,
    region: "connected-terrain-region-id", // consistent across state borders
    isRiver: false,
    isCity: false,
    nation: null, // nation ID on independent nation homelands
    neighbours: [/* adjacent area IDs; reciprocal */]
  }],
  canals: [[/* area ID */, /* adjacent area ID */]]
}
```

`createBoard` initializes ownership and waterworks; this contract is for setup, not importing saved boards. Mark the three First Akkadian savannah plots with that nation's ID. Capacities share token inventory between pumps and reservoirs. M cards are unlimited, but M waterwork tokens remain limited.

## Remaining work

1. Encode and verify the printed map, source/downstream river topology, regions, state order, marker counts and waterwork inventories from the supplied assets.
2. Implement rainy-season routing: tributary waits, mandatory reservoir diversion, mandatory pump self-irrigation, allocation choices, visited-pump tracking, backtracking excess water and southern outflow. Development currently stops at `rain.step === "routing"` with no active player. It cannot be skipped by a normal action.
3. Connect the resolver to `finishWaterRouting(position, outflow)`. This internal helper expects validated `area.irrigatedBy` assignments, checks water conservation, pays landowners once and starts harvest decisions. It mutates the supplied position and must be called on the resolver's working copy before committing it through the model. It does **not** prove that irrigation routes were legal.
4. Implement forced land liquidation and revolutions, including preservation of the current throne and the minimum excess-cash rule. A king who cannot fund the first crew currently receives a rule error. `maintenanceShortfall`, `hasRevolted` and `endReason` support that future flow; a completed revolution must force distribution and end after the rainy season.
5. Implement Barahshum's special canal exchange (including its between-turn timing) and Calah's free waterwork exchange. The nations can already be owned, pay income and be assimilated.
6. Build the gameplay UI and integrate these actions. The original placeholder still contains a manual end-game control; it is not the rules-driven end condition. Official setup supports 3–6 seats; the generic lobby's one-seat option has no invented solo rules here.

## Verification

One-off headless checks covered 20 scenarios, including the rulebook p.5 auction example and p.15 harvest example, atomic rejection, city price ordering, intervention pricing, state activation, consent, era changes, canal costs, waterwork reach and final scoring. Separate Vite/Pinia checks covered initial state, JSON round-trip, complete replay restoration, saved turn order and invalid JSON. No new test framework was added.

Production compilation was verified with `npm run build -- --outDir /tmp/urr-foundation-build`; generated files were kept outside the repository. Live multiplayer, real-map routes and the unfinished flows above have not been verified.
