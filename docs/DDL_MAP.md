# Duck Dealer road map

`DDLroadCells.js` traces all 184 printed blue spaces on `board.jpg`, including
the two shared junctions. Its polygons use the 1800 × 1200 board frame; the SVG
overlay scales with the artwork. Each route's polygons run from `a` to `b`.
Movement enters each road space and then the destination planet. A player's
highway makes entering its road space free, including at junctions.

The graph follows the artwork: Zarmina–Tsukuyomi, Zarmina–Bellerophon,
Tau Boötis b–Inari, Tau Boötis b–Epsilon Reticuli b, Izanagi–Susanoo,
Izanagi–Amaterasu, and Epsilon Reticuli b–Iota Draconis b replace incorrectly
connected links. Junction branches now contain the actual printed cell counts.

This correction deliberately does not migrate the previous graph's saved
segment IDs, as requested. Old games and rewind/replay snapshots can therefore
have changed segment meanings or reference removed segments. New games use the
corrected graph. No backend data format changes are involved.

## Map controls

Choose a starting planet directly on the map. During movement, highlighted
planets and road cells are clickable, including when the next planet is beyond
the remaining movement allowance. Enter and Space also activate road targets.
Stop Moving saves the spent movement allowance, so reloading cannot restore it.

Exploration uses the highlighted top consumer tile in either board column.
Pathways are selected entrance first, then exit on the map; Clear starts the
selection again and Place pathways confirms it. Occupied pathway planets are
excluded. Click an entrance arrow beside your planet to use its pathway.
Exploration takes priority over other action controls.

On the acting player's planet, click the mine or factory good to trade there.
Click a site to open its build or trade controls beside the ship. Factory
choices show input/output goods, points and remaining supply. Other players and
spectators retain a read-only board. Ship details and action controls share one
column, leaving the board uncovered.

## Validation — 2026-11-11

Headless Chrome completed a three-seat practice game through all 24 action
turns, including road movement, saved Stop Moving, pathways, exploration,
mine trading, energy discards, finish/reload and both replay exit paths.
The finished save was 8,964 bytes. The board was checked at 1366 × 768 and
1440 × 900 against URR's page layout.

Three independent accounts on a copied local database created/joined a normal
game, completed auctions (including a tie-break), selected gear and starting
planets, handed off a collection turn, and rewound/reloaded consistently.
WebSockets were disabled to exercise polling; outbound notifications were
captured locally. DDL is now included in the lobby join registry. Only seat
zero commits auction results, preventing competing saves; all seats poll for
the committed result, including untied players waiting for a tie-break.

Prepared browser fixtures with simulated saves covered factory construction
and production, consumer construction and sales, privileges, spaceyard rewards
and purchases, and player-trade selection/acceptance. These checks establish
UI reachability, not a second complete strategic game.

The 71 frontend tests and 13 DDL backend tests passed. The production build
and browser loading of its bundle, stylesheet and images also passed.
Generated bundles are excluded from the source change.

Not an exhaustive rulebook audit, verification of every historical save, or
translation-quality review. The earlier map-ID compatibility limitation above
still applies.
