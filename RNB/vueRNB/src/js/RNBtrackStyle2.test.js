import { test } from "vitest"
import assert from "node:assert/strict"
import { offsetTrackNetwork } from "./RNBtrackStyle2.js"

const line = (start, end) => Array.from({ length: 31 }, (_entry, i) => [start + (end - start) * i / 30, 0])
const dry = () => true
const offsetPoints = (...args) => offsetTrackNetwork(...args).map((chunk) => chunk.points)
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

test("a route keeps its offset across tile boundaries, including reversed chunks and rounding", () => {
	const chunks = [line(0, 300), line(600, 300.2), line(600.1, 900)]
	const result = offsetPoints(chunks, 70, dry)
	assert.ok(distance(result[0].at(-1), result[1].at(-1)) < 1e-8)
	assert.ok(distance(result[1][0], result[2][0]) < 1e-8)
	assert.equal(result[0].at(-1)[1], 70)
	assert.equal(result[1][0][1], 70)
})

test("a bank narrows the offset gradually without switching sides at a tile boundary", () => {
	const canMove = (original, shifted) => shifted[1] >= 0 && shifted[1] <= (original[0] > 450 ? 20 : 80)
	const result = offsetPoints([line(0, 300), line(300, 600)], 70, canMove).flat()
	for (const point of result) assert.ok(canMove(point, point))
	for (let i = 1; i < result.length; i++) assert.ok(Math.abs(result[i][1] - result[i - 1][1]) <= 2.01)
	assert.ok(result.at(-1)[1] > 0)
})

test("water retains the existing alignment rather than offsetting farther into it", () => {
	const result = offsetPoints([line(0, 300), line(300, 600)], 70, (original, shifted) => original[0] < 400 && shifted[1] <= 0)
	for (const point of result.flat()) if (point[0] >= 400) assert.equal(point[1], 0)
	assert.ok(distance(result[0].at(-1), result[1][0]) < 1e-8)
})

test("all branches meet at the same junction", () => {
	const branch = Array.from({ length: 31 }, (_entry, i) => [300, i * 10])
	const result = offsetPoints([line(0, 300), line(300, 600), branch], 70, dry)
	assert.deepEqual(result[0].at(-1), result[1][0])
	assert.deepEqual(result[1][0], result[2][0])
})

test("tight closed curves stay closed and avoid inside cusps", () => {
	const radius = 40
	const points = Array.from({ length: 161 }, (_entry, i) => [radius * Math.cos(i * Math.PI / 80), radius * Math.sin(i * Math.PI / 80)])
	const [result] = offsetPoints([points], 70, dry)
	assert.deepEqual(result[0], result.at(-1))
	for (let i = 0; i < result.length; i++) {
		assert.ok(distance(result[i], points[i]) < radius / 2)
		assert.ok(Math.hypot(...result[i]) > radius)
		assert.ok(result[i].every(Number.isFinite))
	}
})

test("a sharp bend is rounded while keeping its endpoint alignment", () => {
	const points = [...line(0, 300), ...Array.from({ length: 30 }, (_entry, i) => [300, (i + 1) * 10])]
	const [result] = offsetPoints([points], 70, dry)
	assert.equal(result[0][0], 0)
	assert.equal(result.at(-1)[1], 300)
	assert.ok(result[0][1] < 0 && result[0][1] >= -70)
	assert.ok(result.at(-1)[0] > 300 && result.at(-1)[0] <= 370)
	for (let i = 1; i < result.length - 1; i++) {
		const a = result[i].map((v, axis) => v - result[i - 1][axis])
		const b = result[i + 1].map((v, axis) => v - result[i][axis])
		const cosine = (a[0] * b[0] + a[1] * b[1]) / Math.hypot(...a) / Math.hypot(...b)
		assert.ok(cosine > Math.cos(Math.PI / 9))
	}
})

test("sleepers keep their spacing through unequal and reversed tile segments", () => {
	const chunks = [line(0, 317), line(574, 317), line(574, 1003)]
	const result = offsetTrackNetwork(chunks, 70, dry)
	const centres = []
	for (const chunk of result) {
		assert.equal(chunk.tieSpacing, result[0].tieSpacing)
		const start = chunk.points[0][0], end = chunk.points.at(-1)[0]
		const phase = chunk.tieOffset - chunk.tieSpacing * 0.06
		for (let n = -1; n < 30; n++) {
			const along = n * chunk.tieSpacing - phase
			if (along >= -1e-8 && along <= Math.abs(end - start) + 1e-8) centres.push(start + Math.sign(end - start) * along)
		}
	}
	centres.sort((a, b) => a - b)
	assert.equal(centres.length, 11)
	assert.ok(Math.abs(result[0].tieSpacing - 100) < 1)
	for (let i = 1; i < centres.length; i++) assert.ok(Math.abs(centres[i] - centres[i - 1] - result[0].tieSpacing) < 1e-8)
})

test("a closed route fits a whole number of sleeper periods", () => {
	const points = Array.from({ length: 161 }, (_entry, i) => [200 * Math.cos(i * Math.PI / 80), 200 * Math.sin(i * Math.PI / 80)])
	const result = offsetTrackNetwork([points.slice(0, 54), points.slice(53, 110).reverse(), points.slice(109)], 70, dry)
	let length = 0
	for (const chunk of result) {
		assert.equal(chunk.tieSpacing, result[0].tieSpacing)
		for (let i = 1; i < chunk.points.length; i++) length += distance(chunk.points[i], chunk.points[i - 1])
	}
	assert.ok(Math.abs(length / result[0].tieSpacing - Math.round(length / result[0].tieSpacing)) < 1e-8)
})
