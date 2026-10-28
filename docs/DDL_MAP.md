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
