/**
 * The createRNBpage map thumbnails (map selection preview and gallery) draw the map's
 * train tracks (TN = [[x1, y1, x2, y2, lane], ...]) with a simplified routing model: a track
 * between two plain tiles runs straight centre-to-centre. When either tile is a river (terrains
 * 0-22) the river sits at the tile centre and exits at the edge midpoints, so the track crosses
 * the shared edge at the 1/4 point (halfway between the midpoint and a corner) and a river tile
 * joins each lane's entry/exit points with a direct chord — skirting the river, never through
 * the centre. Segments weld at the shared tile centres / crossing points into one continuous
 * line — rendered as a single thick dark-blue stroke (#1A237E, the editor's rail colour) rather
 * than the editor's two masked rails. Both page scripts carry their own copy of the builder, so
 * both are checked.
 *
 * Run with:
 *     node --test tests/map-thumbnail-tracks.test.js
 */
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

// The Lobby page scripts are classic scripts with no exports - borrow their builders.
globalThis.document = { addEventListener: () => {} }
async function loadBuilder(file) {
	const url = new URL("../../../Lobby/static/Lobby/" + file, import.meta.url)
	const source = readFileSync(url, "utf8") + "\nexport { buildMapThumbnailSVG }"
	return (await import("data:text/javascript," + encodeURIComponent(source))).buildMapThumbnailSVG
}

// Tile centres exactly as buildMapThumbnailSVG computes them
const pointy = (q, r) => [Math.sqrt(3) * (q + r / 2) * 100, 1.5 * r * 100]
const flat = (q, r) => [1.5 * q * 100, Math.sqrt(3) * (r + q / 2) * 100]

// The rails are one <path>; split its `d` into subpaths (each an ordered list of points).
function trackPath(svg) {
	const tag = svg.match(/<path d="M[^"]*"[^>]*\/>/)
	if (!tag) return null
	const d = tag[0].match(/d="([^"]+)"/)[1]
	const subpaths = d
		.split("M")
		.filter((s) => s.trim())
		.map((s) =>
			s
				.trim()
				.split("L")
				.map((p) => p.trim().split(" ").map(Number))
		)
	return {
		subpaths,
		colour: tag[0].match(/stroke="([^"]+)"/)[1],
		width: Number(tag[0].match(/stroke-width="([^"]+)"/)[1]),
		round: tag[0].includes('stroke-linecap="round"') && tag[0].includes('stroke-linejoin="round"'),
	}
}

const near = (a, b) => Math.abs(a - b) < 0.01
const nearPoint = (p, q) => near(p[0], q[0]) && near(p[1], q[1])
const distPointToSeg = (p, a, b) => {
	const dx = b[0] - a[0],
		dy = b[1] - a[1]
	const len2 = dx * dx + dy * dy
	let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0
	t = Math.max(0, Math.min(1, t))
	return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

for (const file of ["createRNB.js", "createRNB2.js"]) {
	const buildMapThumbnailSVG = await loadBuilder(file)

	test(file + ": a track between plain tiles runs straight centre to centre", () => {
		const track = trackPath(buildMapThumbnailSVG([[0, 0, 55], [0, 1, 55], { TN: [[0, 0, 0, 1, 0]] }]))
		assert.ok(track, "one edge draws a track")
		assert.equal(track.colour, "#1A237E", "the rail is dark blue")
		assert.equal(track.width, 34, "the rail is thick")
		assert.ok(track.round, "the rail uses round caps and joins")

		assert.equal(track.subpaths.length, 1, "the edge is a single welded line")
		const pts = track.subpaths[0]
		assert.equal(pts.length, 2, "straight from centre to centre")
		const a = pointy(0, 0)
		const b = pointy(0, 1)
		assert.ok((nearPoint(pts[0], a) && nearPoint(pts[1], b)) || (nearPoint(pts[0], b) && nearPoint(pts[1], a)), "the ends are the two tile centres")
	})

	test(file + ": a river tile is crossed by a chord, never through its centre", () => {
		// Plain -> river -> plain: the track crosses each shared edge at the 1/4 point and the
		// river tile joins those entry/exit points directly, so its centre (where the river is)
		// is never on the line.
		const track = trackPath(buildMapThumbnailSVG([[0, 0, 55], [0, 1, 1], [0, 2, 55], { TN: [[0, 0, 0, 1, 0], [0, 1, 0, 2, 0]] }]))
		assert.equal(track.subpaths.length, 1, "the whole run is one continuous line")
		const pts = track.subpaths[0]
		assert.equal(pts.length, 4, "centre -> entry -> exit -> centre")
		const c0 = pointy(0, 0)
		const cR = pointy(0, 1)
		const c2 = pointy(0, 2)
		// The river tile's centre is not a route point...
		for (const p of pts) assert.ok(!nearPoint(p, cR), "no point sits on the river tile's centre")
		// ...and the chord (the middle segment) passes well clear of it.
		assert.ok(distPointToSeg(cR, pts[1], pts[2]) > 10, "the chord skirts the river tile's centre")
		// The two crossings sit a quarter edge (S/4 = 25) off the shared-edge midpoints.
		const midA = [(c0[0] + cR[0]) / 2, (c0[1] + cR[1]) / 2]
		const midB = [(cR[0] + c2[0]) / 2, (cR[1] + c2[1]) / 2]
		const ends = [pts[0], pts[3]]
		assert.ok(ends.some((p) => nearPoint(p, c0)) && ends.some((p) => nearPoint(p, c2)), "the run starts and ends at the outer plain centres")
		const entry = pts[1]
		const exit = pts[2]
		const dA = Math.min(Math.hypot(entry[0] - midA[0], entry[1] - midA[1]), Math.hypot(exit[0] - midA[0], exit[1] - midA[1]))
		const dB = Math.min(Math.hypot(entry[0] - midB[0], entry[1] - midB[1]), Math.hypot(exit[0] - midB[0], exit[1] - midB[1]))
		assert.ok(near(dA, 25), "one crossing is a quarter edge off its midpoint")
		assert.ok(near(dB, 25), "the other crossing is a quarter edge off its midpoint")
	})

	test(file + ": a gentle-curve through-track with mismatched edge lanes still draws", () => {
		// Reported bug: on a gentle-curve river tile the two edges store independent lane
		// numbers (TN's lane is edge-relative, not a physical bank), so grouping crossings by
		// `lane` splits a continuous track into two singletons and draws nothing. Here the river
		// tile (0,1) is edgeHexIDs0 for BOTH edges, so the valid through-track needs lanes 0 and
		// 1 — different lane values, but they pair into one continuous run.
		const track = trackPath(buildMapThumbnailSVG([[0, 0, 55], [0, 1, 1], [0, 2, 55], { TN: [[0, 1, 0, 0, 0], [0, 1, 0, 2, 1]] }]))
		assert.ok(track, "the mismatched-lane track draws")
		assert.equal(track.subpaths.length, 1, "the whole run is one continuous line")
		const pts = track.subpaths[0]
		assert.equal(pts.length, 4, "centre -> entry -> exit -> centre")
		const c0 = pointy(0, 0)
		const cR = pointy(0, 1)
		const c2 = pointy(0, 2)
		const ends = [pts[0], pts[3]]
		assert.ok(ends.some((p) => nearPoint(p, c0)) && ends.some((p) => nearPoint(p, c2)), "the run starts and ends at the outer plain centres")
		for (const p of pts) assert.ok(!nearPoint(p, cR), "no point sits on the river tile's centre")
		assert.ok(distPointToSeg(cR, pts[1], pts[2]) > 10, "the chord skirts the river tile's centre")
	})

	test(file + ": the two lanes of a river edge cross on the editor's banks", () => {
		// TN order is [edgeHexIDs0, edgeHexIDs1, lane]; the editor maps lane 0 to vertex[side]
		// and lane 1 to vertex[side+1] of the side facing edgeHexIDs1, so lane 0 crosses off the
		// A->B perpendicular toward vertex[side]: mid - perp*S/4 (lane 0), mid + perp*S/4 (lane 1).
		// edgeHexIDs0=(0,1) has larger coords than edgeHexIDs1=(0,0), so a coord-order-based
		// offset (rather than the true edgeHexIDs order) would flip the banks here.
		const a = pointy(0, 1)
		const b = pointy(0, 0)
		const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
		const dx = b[0] - a[0],
			dy = b[1] - a[1]
		const len = Math.hypot(dx, dy)
		const perp = [-dy / len, dx / len]
		// Plain tile (0,1) feeding the river tile (0,0): its spoke ends at the crossing point.
		const cross = (lane) => trackPath(buildMapThumbnailSVG([[0, 1, 55], [0, 0, 1], { TN: [[0, 1, 0, 0, lane]] }])).subpaths[0].find((p) => !nearPoint(p, a))
		assert.ok(nearPoint(cross(0), [mid[0] - perp[0] * 25, mid[1] - perp[1] * 25]), "lane 0 crosses on the vertex[side] bank")
		assert.ok(nearPoint(cross(1), [mid[0] + perp[0] * 25, mid[1] + perp[1] * 25]), "lane 1 crosses on the vertex[side+1] bank")
	})

	test(file + ": a double-tracked river run stays continuous and off the centre", () => {
		// Both lanes through a river tile: two parallel chords (one per bank), still one path.
		const track = trackPath(
			buildMapThumbnailSVG([[0, 0, 55], [0, 1, 1], [0, 2, 55], { TN: [[0, 0, 0, 1, 0], [0, 1, 0, 2, 0], [0, 0, 0, 1, 1], [0, 1, 0, 2, 1]] }])
		)
		const cR = pointy(0, 1)
		for (const sub of track.subpaths) for (const p of sub) assert.ok(!nearPoint(p, cR), "no route point touches the river centre")
		assert.ok(track.subpaths.length >= 1, "the double track still draws")
	})

	test(file + ": flat-style maps and maps without tracks", () => {
		const f = trackPath(buildMapThumbnailSVG([[0, 0, 55], [0, 1, 55], { ST: 1, TN: [[0, 0, 0, 1, 0]] }]))
		assert.ok(f, "a flat-style map draws its track too")
		const a = flat(0, 0)
		const b = flat(0, 1)
		assert.ok((nearPoint(f.subpaths[0][0], a) && nearPoint(f.subpaths[0][1], b)) || (nearPoint(f.subpaths[0][0], b) && nearPoint(f.subpaths[0][1], a)), "the flat track ends at the two tile centres")

		assert.equal(trackPath(buildMapThumbnailSVG([[0, 0, 1], [0, 1, 1], {}])), null, "no TN, no track")
		assert.equal(trackPath(buildMapThumbnailSVG([[0, 0, 1], [0, 1, 1], undefined])), null, "no setup object, no track")
		assert.equal(trackPath(buildMapThumbnailSVG([[0, 0, 1], [0, 1, 1], { TN: [[7, 7, 8, 8, 0]] }])), null, "unknown tile coords are ignored")
	})
}
