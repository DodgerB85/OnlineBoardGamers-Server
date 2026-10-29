# Napoleon’s Triumph map extraction

Open `index.html` directly in Chrome, or serve this directory over HTTP. Choose
**Whole board**, **Original pilot · Kritschen**, or a numbered locale. The locale
views include their surroundings; the occurrence list and counts follow that
area. Layer and individual-element toggles, editing, browser saves, source crops,
JSON import/export and reconstruction SVG export work across the board.

This is an offline annotation collection, not a recognizer running in the viewer.
Gameplay integration is deferred. `NTRmap.js` is not an extraction source.

## Data and coordinates

- `regions/full-board.json` is the primary full-board annotation file.
- `board-data.js` is its browser-loadable copy: `window.NTR_BOARD = <JSON>;`.
- `regions/kritschen-39.json` and `region-data.js` retain the original pilot.
  Its existing geometries and review states are preserved in the full-board data.
- `regions/locale-centers.json` records the numbered-reference anchors and their
  registration to the board. `setup-inventory.json` and `detected-symbols.json`
  retain the underlying occurrence inventories.
- All annotation geometry uses the original `../images/map.jpg`, 5100 × 6600.
  `source_bounds` are `[left, top, right, bottom)`; symbol dimensions are stored
  before rotation. Fixed source crops remain evidence when geometry is edited.

After changing either primary annotation file, update its corresponding JavaScript
copy. Tests enforce equality. Browser saves are separate for each dataset and seed
revision, so an old two-road pilot save cannot replace the full-board annotations.
Export edits before using **Restore supplied region** or changing source revisions.

## Review state and limits

The full-board pass is a **draft**, not a claim of exhaustive, verified extraction.
The supplied seed contains 1,911 elements: 168 locale footprints, 470 road
segments, 406 approach traces, 465 penalties, 165 capacities, 43 objectives,
15 setup groups, 11 hills and 168 reserve anchors.
The numbered reference supplies 168 located IDs. IDs 145 and 146 have not been
located; their registry entries remain null and their navigation entries are
disabled. They are not assigned invented positions.

Roads follow separated red/brown source ink. Short nearly collinear gaps may be
joined provisionally; those joins are recorded in `inferred_gaps`. Shared junction
vertices describe the drawing, not gameplay connectivity. The nine manually traced
pilot roads replace automatic traces inside the pilot rectangle.

Approach candidates follow the pale printed bars. Measured stroke thickness is
separate from one/two-piece frontage. Unknown frontage is `null`, editable as
**Unreviewed**. Unresolved locale pairs remain empty rather than receiving guessed
identities. Paired approaches and sided penalty associations are provisional.

Locale footprints are convex envelopes of faces separated by the detected bars.
Where closures are missing, a face containing several reference anchors is
partitioned using those anchors. `boundary_method` identifies these inferred
partitions. These footprints need source-by-source boundary review.

Capacity values, hill elevations, commander identities, setup unit counts and
penalty kinds are semantic data. Objectives retain their printed color; stacked
stars are independent occurrences. Map labels are excluded. Reserve anchors are
added placement aids, not printed marks. Landscape and board furniture are outside
this extraction pass. Missed and false-positive occurrences remain possible.

## Verification

From the repository root:

```sh
rtk bypass python3 -m unittest tests.test_ntr_map_extraction
rtk bypass python3 -m unittest discover -s NTR/static/NTR/map-extraction/tests
rtk bypass node --check NTR/static/NTR/map-extraction/viewer.js
```

The full-board tests check the browser data copy, preserved pilot geometry,
registered locale inventory, source coordinates/crops, explicit unknowns,
directional associations and exact shared junction vertices. They do not establish
visual completeness or gameplay correctness. SVG export with raster images needs
HTTP; reconstruction SVG export works directly from the local file.
