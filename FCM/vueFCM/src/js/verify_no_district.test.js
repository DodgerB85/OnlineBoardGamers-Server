import { describe, it, expect } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import * as map from "./FCMmap.js"
import { useModelStore } from "../stores/FCMstore.js"

describe("no district tiles leak (4p priority mode)", () => {
	it("never draws tiles 20-25 across 200 runs", () => {
		for (let i = 0; i < 200; i++) {
			setActivePinia(createPinia())
			const store = useModelStore()
			store.startingOptions.newMap = true
			store.startingOptions.newMapAll = true
			const tiles = map.generateRandomMap(4).filter((_, j) => j % 2 === 0).filter((t) => t >= 0)
			const district = tiles.filter((t) => t >= 20 && t <= 28) // 20-25 districts + 26 reserved + 27/28 stadium
			expect(district, `run ${i}: ${tiles}`).toHaveLength(0)
		}
	})
	it("never draws tiles 20-25 across 200 runs (mix mode)", () => {
		for (let i = 0; i < 200; i++) {
			setActivePinia(createPinia())
			const store = useModelStore()
			store.startingOptions.newMap = true
			const tiles = map.generateRandomMap(4).filter((_, j) => j % 2 === 0).filter((t) => t >= 0)
			const district = tiles.filter((t) => t >= 20 && t <= 28)
			expect(district, `run ${i}: ${tiles}`).toHaveLength(0)
		}
	})
	// 6p: original 6p expansion always injects 20-24 into the pool
	it("6p does include 20-24 (original 6p expansion rule)", () => {
		let saw = false
		for (let i = 0; i < 50; i++) {
			setActivePinia(createPinia())
			const store = useModelStore()
			store.startingOptions.newMap = true
			store.startingOptions.newMapAll = true
			const tiles = map.generateRandomMap(6).filter((_, j) => j % 2 === 0).filter((t) => t >= 0)
			if (tiles.some((t) => t >= 20 && t <= 24)) { saw = true; break }
		}
		expect(saw).toBe(true)
	})
})
