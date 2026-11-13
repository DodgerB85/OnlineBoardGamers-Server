# NTR map extraction: plan to finish

`NTR/vueNTR/src/js/NTRboard.json` is the game's map data. Locales, penalty symbol positions, objectives, setups and entries are in place. Approaches are not fully reviewed: some are at the wrong angle (mostly in woods), some have the wrong width, and some are missing or fake.

## What we know about the map
- Every approach is one printed grey bar, about 24 px thick. A narrow bar is about 260 px long and a wide one about 520 px (sizes are in `images/map.jpg` pixels).
- Bars that continue in a line are separated by a gap of 24-48 px. Two narrow bars end to end are not one wide bar.
- Bars are a neutral grey tint over the background: every colour channel drops by the same small ratio. This tells them apart from blue streams, brown and red roads, and dark text.
- Lake shores (Satschan, Menitz, Kobelnitz) carry impassable symbols with no bar. They count as impassable approaches. The rules say every shared side of two locales is an approach.

## Steps
1. **Approaches from bars.** Find straight bar pieces with the neutral-tint filter, keep only pieces about 260 or 520 px long, and build the locale outlines from the bars, not the other way round. Keep the scripts in `NTR/tools/` so the run can be repeated.
2. **Woods separately.** Tree symbols hide the tint. Remove the tree glyphs first (small green blobs), then run the same bar detection. Handle lake shores as their own list of impassable approaches.
3. **Review in the viewer.** `static/NTR/map-extraction/index.html` can edit approaches and export JSON. The automatic pass fills it in and flags only the unsure cases:
   - lengths between the two sizes;
   - borders with no bar;
   - outline disagreements.

   Review those at full zoom, then import the result back into `NTRboard.json` with a small script (`tools/board_to_viewer.py` does the opposite direction).
4. **No subagents on downscaled sheets.** They cannot see faint bars. If they are used, give them one approach per image at full resolution with the contrast boosted, and ask a single yes/no question.
5. **One layer at a time, each with a passing check in `tests/test_ntr_board.py` before the next.** The order:
   1. **Bars:** each one is narrow or wide by its length.
   2. **Outlines:** each bar separates exactly two locales.
   3. **Penalties:** reattach each placed symbol to the nearest approach on its side. The symbol positions are already in `symbols`.
   4. **Roads:** check road crossings and `road_links`.

## Also open
- The starting units in `NTRmap.js` are placeholders. Use the setup groups in `NTRboard.json` and the commander cards in `tempAssets/commanders/`.
- Existing NTR games store units on the old locale ids.
