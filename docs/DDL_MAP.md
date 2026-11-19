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
Highway cubes sit at the centres of the same road cells, including
the two junctions. The board stays in place while a highway placement saves.

Exploration uses the highlighted top consumer tile in either board column.
Pathways are selected entrance first, then exit on the map; Clear starts the
selection again and Place pathways confirms it. Occupied pathway planets are
excluded. Click an entrance arrow beside your planet to use its pathway.
Exploration takes priority over other action controls.

Tiles and privilege markers sit in their printed mine, site and factory slots.
On the acting player's planet, click the mine or factory good to trade there.
Click a site to open its build or trade controls beside the ship. Factory
choices show input/output goods, points and remaining supply. Other players and
spectators retain a read-only board. Ship details and action controls share one
column, leaving the board uncovered.

## Player feedback round — 2026-11-17

Each spaceyard chip shows its printed cost good plus NAV/BLD/MER/CGO in the gear's
energy colour, so the five starting yards can be read without visiting them.
Hovering a planet states its mine, factory recipe and site in words. The action
column grew to 320 px and every goods icon keeps a name tooltip; factory options
also print the recipe as text.

Info now opens a goods reference (each good's factories, its consumer value and
what uses it) and a starting-planet table (mine, spaceyard gear, cost, built
state), followed by the four rules that caused the most confusion: highways skip
dots for their owner only, a new consumer site is built with its printed good
and one build energy before it can be sold to, undo reaches only the current
action turn, and energy is limited to 40 per colour.

Undo, Redo and Restart turn act on the current action turn only. They restore
the history snapshot of the previous or first entry of the turn and save without
a rewind point, so a plan can be tried on the real board and dropped. Ending the
turn commits it. The first entry of the turn — not the button that opened it — is
the floor, so a free action turn from an energy shortage is covered too.

Collect-energy pre-orders store a list of colours per player in `gameData`. The
player's own client takes one marker per collect turn while the page is open, at
least eight seconds after the last edit, and stops on an energy shortage so the
free action turn is played by hand. Orders are consumed head first, so the
limited stock still resolves in the chosen order. Nothing else about a collect
turn changes: the marker, the crew quarters and the stock are the same as a hand
click. Other clients never submit for the active seat.

`startPlayerTurn` used to re-enter highway placement after every save, which hid
the movement targets whenever free highway parts were unspent; movement now keeps
the board in movement mode while steps remain.

## Validation — 2026-11-17

Headless Chrome played a fresh three-seat practice game from gear and starting
planets to the game-over screen: 24 action turns, interleaved collect turns,
mid-space dot hopping, exploration of four planets, mine trades, energy and cargo
discards, pathways, undo/redo, and a reload of the finished game. No save
returned a sync error.

Prepared fixtures checked the rest: a consumer site built for its printed good
and then sold to, a factory built and used to produce, a spaceyard built with its
two goods and its gear installed, gear bought at a built yard, a privilege
claimed for three build energy, a paid highway, and undo/redo of that highway.

The pre-order queue was checked with two intended collects, one removed, the
remaining one collected automatically after the eight-second hold, and the queue
persisted across a reload. The 88 frontend tests and 13 DDL backend tests pass.
The board and the reference panel were checked at 1440 × 900 and 1366 × 768.

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
