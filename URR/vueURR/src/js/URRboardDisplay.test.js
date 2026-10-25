import assert from "node:assert/strict"
import test from "node:test"
import { getAreaPosition, hexCellPoints, hexClipPoints, outerStateBorderPaths, PRINTED_HEXES, stateBorderPaths } from "./URRboardDisplay.js"

test("Outer borders join across hexes without merging different state colours", () => {
	const borders = [
		{ state: 0, outerEdges: [[[10, 0], [10, 10]]] },
		{ state: 0, outerEdges: [[[0, 0], [10, 0]], [[10, 10], [20, 10]]] },
		{ state: 1, outerEdges: [[[20, 10], [30, 10]]] },
	]
	assert.deepEqual(outerStateBorderPaths(borders), [
		{ state: 0, path: "M0,0 L10,0 L10,10 L20,10" },
		{ state: 1, path: "M20,10 L30,10" },
	])
	assert.equal(borders[1].outerEdges.length, 2)
})

test("Rendered hexes share complete edges, including the unevenly spaced columns", () => {
	const cells = PRINTED_HEXES.map((position) => hexCellPoints(position, PRINTED_HEXES).split(" ").map((point) => point.split(",").map(Number)))
	for (let index = 0; index < PRINTED_HEXES.length; index++) {
		for (let other = index + 1; other < PRINTED_HEXES.length; other++) {
			if (Math.hypot(PRINTED_HEXES[index].x - PRINTED_HEXES[other].x, PRINTED_HEXES[index].y - PRINTED_HEXES[other].y) >= 105) continue
			const shared = cells[index].filter(([x, y]) => cells[other].some(([otherX, otherY]) => Math.hypot(x - otherX, y - otherY) < 1e-6))
			assert.equal(shared.length, 2)
		}
	}
})

test("A lone action keeps its full outline while neighbouring actions split a shared edge", () => {
	const left = { x: 190, y: 134 }
	const right = { x: 288, y: 134 }
	const containsOuterStroke = (positions) => {
		const points = hexClipPoints(left, positions).split(" ").map((point) => point.split(",").map(Number))
		return Math.max(...points.map(([x]) => x)) >= 242.5
	}
	assert.ok(containsOuterStroke([left]))
	assert.ok(!containsOuterStroke([left, right]))
})

test("Display alignment and river border colours do not change saved positions or river neutrality", () => {
	const river = { id: "printed-1-0", state: null, display: { x: 141, y: 223 } }
	assert.deepEqual(getAreaPosition(river), { x: 141, y: 225 })
	assert.equal(stateBorderPaths([river])[0].state, 5)
	assert.deepEqual(river, { id: "printed-1-0", state: null, display: { x: 141, y: 223 } })
})

test("State borders include outer and river edges but omit edges within a state", () => {
	const left = { id: "left", state: 0, display: { x: 190, y: 134 } }
	const right = { id: "right", state: 0, display: { x: 288, y: 134 } }
	const segmentCount = (areas) => stateBorderPaths(areas).map((border) => border.path + border.outerEdges.map(() => "M").join("")).join(" ").split("M").length - 1
	const borders = stateBorderPaths([left, { ...right, state: 1 }])
	assert.deepEqual(borders.map(({ areaId, state }) => ({ areaId, state })), [{ areaId: "left", state: 0 }, { areaId: "right", state: 1 }])
	assert.equal(borders.map((border) => border.path).join("").split("M").length - 1, 2)
	assert.equal(borders.reduce((count, border) => count + border.outerEdges.length, 0), 10)
	assert.equal(stateBorderPaths([left])[0].path, "")
	assert.equal(segmentCount([left]), 6)
	assert.equal(segmentCount([left, right]), 10)
	assert.equal(segmentCount([left, { ...right, state: 1 }]), 12)
	assert.equal(segmentCount([left, { ...right, state: null }]), 6)
	assert.equal(segmentCount([left, { ...right, display: { x: 287, y: 134 } }]), 10)
	assert.equal(segmentCount([{ state: 0 }]), 0)
})

test("Normal hex clips meet halfway without extending into neighbouring hexes", () => {
	for (const position of PRINTED_HEXES) {
		const points = hexClipPoints(position, PRINTED_HEXES).split(" ").map((point) => point.split(",").map(Number))
		assert.ok(points.length >= 3)
		for (const neighbour of PRINTED_HEXES) {
			if (neighbour === position) continue
			const dx = neighbour.x - position.x
			const dy = neighbour.y - position.y
			const distances = points.map(([x, y]) => (x - (position.x + neighbour.x) / 2) * dx + (y - (position.y + neighbour.y) / 2) * dy)
			assert.ok(distances.every((distance) => distance <= 1e-7))
			if (Math.hypot(dx, dy) < 105) assert.ok(distances.some((distance) => Math.abs(distance) < 1e-7))
		}
	}
})
