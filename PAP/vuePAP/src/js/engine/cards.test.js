import { describe, it, expect } from 'vitest'
import * as C from './cards.js'

const venueIds = C.VENUES.map(v => v.id)

describe('cards', () => {
	it('has the printed counts', () => {
		expect(Object.keys(C.RECIPES)).toHaveLength(24)
		expect(C.HOUSE_SPECIALS).toHaveLength(8)
		expect(Object.values(C.RECIPES).filter(r => r.houseSpecial).map(r => r.id).sort()).toEqual([...C.HOUSE_SPECIALS].sort())
		expect(Object.keys(C.CUSTOMERS)).toHaveLength(24)
		expect(Object.keys(C.DISPENSATIONS)).toHaveLength(12)
		expect(Object.keys(C.APPARATUS)).toHaveLength(8)
		expect(Object.keys(C.SCARES)).toHaveLength(14)
		expect(Object.keys(C.TESTIMONIALS)).toHaveLength(10)
		expect(Object.keys(C.CHARTERS)).toHaveLength(10)
	})

	it('links customers to real venues, recipes and dispensations', () => {
		for (const c of Object.values(C.CUSTOMERS)) {
			expect(venueIds).toContain(c.venue)
			expect(C.RECIPES[c.reward]).toBeDefined()
			expect(c.preference === null || C.DISPENSATIONS[c.preference] !== undefined).toBe(true)
			if (c.wants.type === 'recipes') {
				for (const id of c.wants.ids) expect(C.RECIPES[id]).toBeDefined()
			}
		}
	})

	it('keeps charter thresholds in range and venues real', () => {
		for (const ch of Object.values(C.CHARTERS)) {
			expect([3, 4, 5]).toContain(ch.threshold)
			expect(venueIds).toContain(ch.venue)
		}
	})
})
