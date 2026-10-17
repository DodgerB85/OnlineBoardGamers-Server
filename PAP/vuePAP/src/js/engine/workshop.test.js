import { describe, it, expect } from 'vitest'
import { PAPError } from './state.js'
import { actions, enter, craftPotion, ingredientCost } from './workshop.js'

const ing = (o = {}) => ({ crystal: 0, toad: 0, quick: 0, banshee: 0, ...o })
const staffer = (id, rank, over = {}) => ({ id, rank, hiredYear: 0, tile: null, actedThisYear: false, everWorked: false, ...over })
const player = (over = {}) => ({
	name: 'p', cash: 20, recognized: 0, yearEarned: 0, hype: 0, lockedHype: 0, tier: 1, everEmployed: 1,
	ingredients: ing(), recipes: ['HS1', 'HS2', 'HS8', 'M13'], staff: [staffer('s0', 'journeyman')],
	potions: [], dispensations: [], apparatus: [], usedOnce: {}, upgradedThisYear: false, hand: [], ...over,
})
const game = (players, over = {}) => ({
	year: 3, first: 0, order: players.map((_, i) => i), serial: 0, yearFx: { scare: null }, queue: [], log: [], players,
	decks: { dispensations: [], apparatus: [], marketRecipes: [], side: [] }, ...over,
})
const assign = (s, seat, staffId, tile, choice) => actions.shift.assign(s, seat, { staffId, tile, choice })

describe('workshop', () => {
	it('limits hires by Cauldron tier and by the hirer rank', () => {
		const tier1 = game([player()])
		expect(() => assign(tier1, 0, 's0', 'coop', { hire: 'apprentice' })).toThrow(PAPError)

		const tier2 = game([player({ tier: 2, staff: [staffer('s0', 'journeyman'), staffer('s1', 'apprentice')] })])
		expect(() => assign(tier2, 0, 's1', 'coop', { hire: 'journeyman' })).toThrow(PAPError)
		expect(() => assign(tier2, 0, 's0', 'coop', { hire: 'journeyman' })).toThrow(PAPError)
		assign(tier2, 0, 's0', 'coop', { hire: 'apprentice' })
		expect(tier2.players[0].staff).toHaveLength(3)
		expect(tier2.players[0].cash).toBe(19)
		expect(() => assign(tier2, 0, 's1', 'coop', { hire: 'apprentice' })).toThrow(PAPError)
	})

	it('charges the Access Toll to every seat but the First Player', () => {
		const s = game([player(), player()], { decks: { dispensations: [], apparatus: [], marketRecipes: [], side: ['favor', 'bribe'] } })
		assign(s, 0, 's0', 'streetAlchemist', { take: ['toad', 'crystal'] })
		expect(s.players[0].cash).toBe(20)
		assign(s, 1, 's0', 'streetAlchemist', { draft: 'side' })
		expect(s.players[1].cash).toBe(19)
		expect(s.players[1].recognized).toBe(0)
		expect(s.players[1].hand).toEqual(['favor'])
	})

	it('prices Quicksilver at Tier 2 and lets a swapper pay the substitute', () => {
		const tier1 = game([player({ ingredients: ing({ quick: 1 }) })])
		expect(() => craftPotion(tier1, 0, { recipe: 'HS8' })).toThrow(PAPError)

		const tier2 = game([player({ tier: 2, ingredients: ing({ quick: 1 }) })])
		craftPotion(tier2, 0, { recipe: 'HS8' })
		expect(tier2.players[0].ingredients.quick).toBe(0)

		const swapped = game([player({ dispensations: ['fieldGradeToadstool'], ingredients: ing({ toad: 1, quick: 2 }) })])
		craftPotion(swapped, 0, { recipe: 'M13', disp: 'fieldGradeToadstool', swap: 2 })
		expect(swapped.players[0].ingredients).toEqual(ing())

		const unswapped = game([player({ dispensations: ['fieldGradeToadstool'], ingredients: ing({ toad: 1, quick: 2 }) })])
		expect(() => craftPotion(unswapped, 0, { recipe: 'M13', disp: 'fieldGradeToadstool' })).toThrow(PAPError)
	})

	it('adds Poison markers and potency adders to potency, and never logs poison', () => {
		const s = game([player({ dispensations: ['doubleDistilled'], ingredients: ing({ toad: 1, quick: 1, crystal: 1, banshee: 1 }) })])
		craftPotion(s, 0, { recipe: 'HS1', disp: 'doubleDistilled', poison: 2, poisonPay: ['crystal', 'banshee'] })
		expect(s.players[0].potions[0].potency).toBe(1 + 2 + 1)
		expect(s.players[0].cash).toBe(19)
		expect(JSON.stringify(s.log)).not.toContain('poison')
	})

	it('refuses a craft once the Kettle is at capacity', () => {
		const s = game([player({ potions: [{}, {}, {}] })])
		expect(() => craftPotion(s, 0, { recipe: 'HS2' })).toThrow(PAPError)
	})

	it('upgrades the Cauldron once a Year, at journeyman rank or above', () => {
		const s = game([player({
			ingredients: ing({ toad: 3, crystal: 1, quick: 1 }),
			staff: [staffer('s0', 'apprentice'), staffer('s1', 'journeyman'), staffer('s2', 'journeyman')],
		})])
		expect(() => assign(s, 0, 's0', 'cauldronWorks', { upgrade: true, pay: { toad: 2 } })).toThrow(PAPError)
		assign(s, 0, 's1', 'cauldronWorks', { upgrade: true, pay: { toad: 2 } })
		expect(s.players[0].tier).toBe(2)
		expect(s.players[0].cash).toBe(14)
		expect(() => assign(s, 0, 's2', 'cauldronWorks', { upgrade: true, pay: { crystal: 1, toad: 1, quick: 1 } })).toThrow(PAPError)
		expect(s.players[0].tier).toBe(2)
	})

	it('keeps a new hire idle until next Year and resets the flags on enter', () => {
		const s = game([player({ tier: 2, staff: [staffer('s0', 'journeyman'), staffer('new', 'apprentice', { hiredYear: 3 })] })])
		expect(() => assign(s, 0, 'new', 'coop', { kind: 'toad' })).toThrow(PAPError)
		assign(s, 0, 's0', 'coop', { kind: 'toad' })
		expect(() => assign(s, 0, 's0', 'coop', { kind: 'toad' })).toThrow(PAPError)

		s.year = 4
		enter.shift(s)
		expect(s.queue).toEqual([{ step: 'shift', seat: 0, data: {} }])
		expect(s.players[0].staff[0].actedThisYear).toBe(false)
		assign(s, 0, 'new', 'coop', { kind: 'toad' })
		expect(s.players[0].staff[1].actedThisYear).toBe(true)
	})

	it('prices Banshee and Toadstool surcharges with Resonant Copper', () => {
		const copper = game([player({ apparatus: ['resonantCopper'] })], { yearFx: { scare: 'S9' } })
		expect(ingredientCost(copper, 0, 'banshee', 'coop')).toBe(1)
		expect(ingredientCost(copper, 0, 'banshee', 'other')).toBe(1)
		const toad = game([player()], { yearFx: { scare: 'S8' } })
		expect(ingredientCost(toad, 0, 'toad', 'coop')).toBe(1)
		expect(ingredientCost(toad, 0, 'toad', 'other')).toBe(0)
	})
})
