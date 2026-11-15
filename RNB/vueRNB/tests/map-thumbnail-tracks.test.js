/**
 * createRNBpage and createRNBpage2 share the same map-thumbnail builder. Both draw the editor's
 * saved TP geometry 1:1 when present; maps saved before TP existed fall back to TN and are drawn
 * centre-to-centre. The rail is black with a white dashed centre. Page 2 only adds the &c
 * checkboxes, so both builders are checked against the same expectations.
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

const near = (a, b) => Math.abs(a - b) < 0.01
const nearPoint = (p, q) => near(p[0], q[0]) && near(p[1], q[1])

function blackRails(svg) {
	return [...svg.matchAll(/<path d="([^"]+)"[^>]*stroke="black"[^>]*\/>/g)].map((m) => ({
		d: m[1],
		nums: (m[1].match(/-?\d+(?:\.\d+)?/g) || []).map(Number),
		tag: m[0],
	}))
}

for (const file of ["createRNB.js", "createRNB2.js"]) {
	const buildMapThumbnailSVG = await loadBuilder(file)

	test(file + ": TN fallback draws a black centre-to-centre rail", () => {
		const svg = buildMapThumbnailSVG([[0, 0, 55], [0, 1, 55], { TN: [[0, 0, 0, 1, 0]] }])
		const rails = blackRails(svg)
		assert.equal(rails.length, 1, "one edge draws one black rail")
		assert.equal(rails[0].d, "M0 0 L86.6 150", "the rail runs centre to centre")
		assert.match(rails[0].tag, /stroke-width="26\.8"/, "the rail is the new thick width")
		assert.match(rails[0].tag, /stroke-linecap="butt"/, "the rail meets the edge without caps")
		assert.match(svg, /stroke="white"[^>]*stroke-width="13\.8"/, "the white dashed centre is drawn too")
	})

	test(file + ": old maps without TP use the TN centre-to-centre fallback", () => {
		// Maps saved before TP existed still have TN; they intentionally fall back to straight
		// centre-to-centre lines rather than the old river chord approximation.
		const rails = blackRails(buildMapThumbnailSVG([[0, 0, 55], [0, 1, 1], [0, 2, 55], { TN: [[0, 0, 0, 1, 0], [0, 1, 0, 2, 0]] }]))
		assert.equal(rails.length, 1, "the run is one continuous rail")
		const n = rails[0].nums
		assert.ok(nearPoint([n[0], n[1]], pointy(0, 0)), "starts at the first plain tile centre")
		assert.ok(nearPoint([n[n.length - 2], n[n.length - 1]], pointy(0, 2)), "ends at the last plain tile centre")
	})

	test(file + ": TN lanes still draw when there is no TP", () => {
		const rails = blackRails(
			buildMapThumbnailSVG([[0, 0, 55], [0, 1, 1], [0, 2, 55], { TN: [[0, 0, 0, 1, 0], [0, 1, 0, 2, 0], [0, 0, 0, 1, 1], [0, 1, 0, 2, 1]] }])
		)
		assert.ok(rails.length >= 1, "multi-lane TN data still renders")
	})

	test(file + ": TP geometry is drawn 1:1", () => {
		const rails = blackRails(buildMapThumbnailSVG([[0, 0, 55], [0, 1, 55], { TP: [[0, 0, [0, 0.5, -0.866, 0.5]]] }]))
		assert.equal(rails.length, 1)
		assert.equal(rails[0].d, "M0 50 L-86.6 50", "hex-local TP points are scaled by the 100px thumbnail radius")
	})

	test(file + ": flat style and maps without tracks", () => {
		const flatRails = blackRails(buildMapThumbnailSVG([[0, 0, 55], [0, 1, 55], { ST: 1, TN: [[0, 0, 0, 1, 0]] }]))
		assert.equal(flatRails.length, 1)
		assert.ok(
			nearPoint([flatRails[0].nums[0], flatRails[0].nums[1]], flat(0, 0)) &&
				nearPoint([flatRails[0].nums[flatRails[0].nums.length - 2], flatRails[0].nums[flatRails[0].nums.length - 1]], flat(0, 1)),
			"flat-style tracks end at the two tile centres"
		)

		assert.equal(blackRails(buildMapThumbnailSVG([[0, 0, 1], [0, 1, 1], {}])).length, 0, "no TN, no track")
		assert.equal(blackRails(buildMapThumbnailSVG([[0, 0, 1], [0, 1, 1], undefined])).length, 0, "no setup object, no track")
		assert.equal(blackRails(buildMapThumbnailSVG([[0, 0, 1], [0, 1, 1], { TN: [[7, 7, 8, 8, 0]] }])).length, 0, "unknown tile coords are ignored")
	})
}
