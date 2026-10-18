import { describe, it, expect } from 'vitest'
import { applyAction, createGame } from './engine/index.js'
import { enter as streetEnter } from './engine/street.js'
import { enter as auditEnter, settleLevies } from './engine/audit.js'
import { craftPotion } from './engine/workshop.js'
import { venueAccess, saleRisks, craftable, condemnRisk, spoilRisk, upgradeStatus, yearEarned, projectedScore } from './PAPhints.js'
import { TIER_VP } from './engine/cards.js'

function potion(id, recipe, extra = {}) {
	return { id, recipe, disp: null, poison: 0, potency: 2, protected: 0, backedFutures: false, reoffered: false, fireWard: false, ...extra }
}

// A fresh two-seat game with the setup prompts cleared, so each test sets its own state.
function fresh() {
	const s = createGame(7, ['Ann', 'Ben'])
	s.queue = []
	s.auditOrder = [...s.order]
	return s
}

function setVenue(s, id, customer, mood = 'calm') {
	const v = s.venues.find(x => x.id === id)
	v.customer = customer
	v.mood = mood
}

// Opens the High Street from the state as set up: call it after the potions and customers are in place.
function street(s) {
	streetEnter['street.solo'](s)
	return s
}

// Sells the potion through the engine and reports what changed for the seller (Ann, seat 0).
function sell(s, venueId, potionId) {
	const before = s.players[0]
	const next = applyAction(s, 0, { type: 'soloSale', venue: venueId, potionId })
	const p = next.players[0]
	return {
		sold: !p.potions.some(x => x.id === potionId),
		cash: p.cash - before.cash,
		warnings: p.warnings - before.warnings,
		levy: p.levyOwed - before.levyOwed,
	}
}

// W15 (Workhouse) wants any 1-star potion and has no Preference. G10 (Golem Pound) wants HS3 and prefers favorOfThePit.
describe('saleRisks agrees with completeSale', () => {
	it('a clean sale predicts nothing and changes no Warning or Levy', () => {
		const s = fresh()
		setVenue(s, 'workhouse', 'W15')
		s.players[0].potions = [potion('a', 'HS1')]
		street(s)
		expect(saleRisks(s, 0, 'a', 'workhouse')).toEqual([])
		expect(sell(s, 'workhouse', 'a')).toEqual({ sold: true, cash: 2, warnings: 0, levy: 0 })
	})

	it('over-tolerance predicts a Levy and a Warning, and the sale nets +3 after the Levy', () => {
		const s = fresh()
		setVenue(s, 'workhouse', 'W15')
		s.players[0].potions = [potion('a', 'HS1', { poison: 3 })]
		street(s)
		expect(saleRisks(s, 0, 'a', 'workhouse').map(r => r.kind)).toEqual(['overTolerance'])
		// Clean sale is +2 (anchor 3 less overhead 1); over-tolerance adds 5 Crowns and owes a 2-Crown Levy: +3 net.
		const out = sell(s, 'workhouse', 'a')
		expect(out).toEqual({ sold: true, cash: 7, warnings: 1, levy: 2 })
		expect(out.cash - out.levy).toBe(5)
	})

	it('Properly Licensed Doom passes Reliability even when over tolerance', () => {
		const s = fresh()
		setVenue(s, 'workhouse', 'W15', 'panicked')
		s.players[0].potions = [potion('a', 'HS1', { poison: 3, disp: 'properlyLicensedDoom' })]
		street(s)
		expect(saleRisks(s, 0, 'a', 'workhouse')[0].text).not.toMatch(/Warning/)
		expect(sell(s, 'workhouse', 'a')).toMatchObject({ warnings: 0, levy: 2 })
	})

	it('shows the reduced Poison premium when a Scare doubles the Levy', () => {
		const s = fresh()
		setVenue(s, 'workhouse', 'W15')
		s.yearFx.doubleLevies = true
		s.players[0].potions = [potion('a', 'HS1', { poison: 3 })]
		street(s)
		expect(saleRisks(s, 0, 'a', 'workhouse')[0].text).toBe('+1 Crown net but a 4-Crown Levy and a Warning')
		const next = applyAction(s, 0, { type: 'soloSale', venue: 'workhouse', potionId: 'a' })
		settleLevies(next, 0)
		// The clean sale nets 2; the Poison premiums add only 1 after the doubled Levy.
		expect(next.players[0].cash - s.players[0].cash).toBe(3)
	})

	it('a panicked venue with a Preference the potion lacks predicts a Warning', () => {
		const s = fresh()
		setVenue(s, 'golem', 'G10', 'panicked')
		s.players[0].potions = [potion('a', 'HS3')]
		street(s)
		expect(saleRisks(s, 0, 'a', 'golem').map(r => r.kind)).toEqual(['reliability'])
		expect(sell(s, 'golem', 'a')).toMatchObject({ warnings: 1, levy: 0 })
	})

	it('a panicked venue whose customer has no Preference predicts nothing', () => {
		const s = fresh()
		setVenue(s, 'workhouse', 'W15', 'panicked')
		s.players[0].potions = [potion('a', 'HS1')]
		street(s)
		expect(saleRisks(s, 0, 'a', 'workhouse')).toEqual([])
		expect(sell(s, 'workhouse', 'a')).toMatchObject({ warnings: 0 })
	})

	it('a panicked venue with a matching Preference predicts nothing', () => {
		const s = fresh()
		setVenue(s, 'golem', 'G10', 'panicked')
		s.players[0].potions = [potion('a', 'HS3', { disp: 'favorOfThePit' })]
		street(s)
		expect(saleRisks(s, 0, 'a', 'golem')).toEqual([])
		expect(sell(s, 'golem', 'a')).toMatchObject({ warnings: 0 })
	})

	it('forced Reliability predicts a Warning at a calm venue with an unmet Preference', () => {
		const s = fresh()
		setVenue(s, 'golem', 'G10')
		s.players[0].forcedReliability = true
		s.players[0].potions = [potion('a', 'HS3')]
		street(s)
		expect(saleRisks(s, 0, 'a', 'golem').map(r => r.kind)).toEqual(['reliability'])
		expect(sell(s, 'golem', 'a')).toMatchObject({ warnings: 1 })
	})

	it('Whistling Cork at a Preference venue predicts a Warning, and at a no-Preference venue it does not', () => {
		const s = fresh()
		setVenue(s, 'golem', 'G10')
		s.players[0].potions = [potion('a', 'HS3', { disp: 'whistlingCork' })]
		street(s)
		expect(saleRisks(s, 0, 'a', 'golem').map(r => r.kind)).toEqual(['reliability'])
		expect(sell(s, 'golem', 'a')).toMatchObject({ warnings: 1 })

		const t = fresh()
		setVenue(t, 'workhouse', 'W15')
		t.players[0].potions = [potion('a', 'HS1', { disp: 'whistlingCork' })]
		street(t)
		expect(saleRisks(t, 0, 'a', 'workhouse')).toEqual([])
		expect(sell(t, 'workhouse', 'a')).toMatchObject({ warnings: 0 })
	})

	it('a blocked first sale (Scare S13) predicts pitchBlocked and the potion does not sell', () => {
		const s = fresh()
		setVenue(s, 'workhouse', 'W15')
		s.yearFx.pitchBlocked = 0
		s.players[0].potions = [potion('a', 'HS1')]
		street(s)
		expect(saleRisks(s, 0, 'a', 'workhouse').map(r => r.kind)).toEqual(['pitchBlocked'])
		expect(sell(s, 'workhouse', 'a')).toMatchObject({ sold: false, cash: 0 })
	})
})

describe('venueAccess', () => {
	it('lists qualifying potions and marks contested venues', () => {
		const s = fresh()
		setVenue(s, 'workhouse', 'W15')
		// Star Wants are a potency bar (W15 wants potency 1+), so each potion's potency is its recipe stars.
		s.players[0].potions = [potion('a', 'HS1', { potency: 1 }), potion('b', 'HS2', { potency: 1 }), potion('d', 'HS6', { potency: 3 })]
		s.players[1].potions = [potion('c', 'HS2', { potency: 1 })]
		const ann = venueAccess(s, 0, 'workhouse')
		expect(ann.qualifies).toBe(true)
		expect(ann.potions.map(x => x.id)).toEqual(['a', 'b', 'd'])
		expect(ann.eligibleSeats).toEqual([0, 1])
		expect(ann.contested).toBe(true)
	})

	it('a seat with no matching potion does not qualify', () => {
		const s = fresh()
		setVenue(s, 'nobles', 'N2')
		s.players[0].potions = [potion('a', 'HS1')]
		const ann = venueAccess(s, 0, 'nobles')
		expect(ann).toMatchObject({ qualifies: false, potions: [], eligibleSeats: [], contested: false })
	})
})

describe('craftable', () => {
	it('shows the missing ingredients, and matches what craftPotion accepts', () => {
		const s = fresh()
		const p = s.players[0]
		p.recipes = ['HS1', 'HS3', 'HS6']
		p.ingredients = { crystal: 1, toad: 2, quick: 0, banshee: 0 }
		const got = craftable(s, 0)
		expect(got.HS1).toEqual({ ok: false, missing: { quick: 1 } })
		expect(got.HS3).toEqual({ ok: true, missing: {} })
		expect(got.HS6).toEqual({ ok: false, missing: { quick: 1 } })
		for (const id of p.recipes) {
			let crafted = true
			try {
				craftPotion(structuredClone(s), 0, { recipe: id })
			} catch {
				crafted = false
			}
			expect(got[id].ok).toBe(crafted)
		}
	})

	it('needs Kettle space for ok', () => {
		const s = fresh()
		const p = s.players[0]
		p.recipes = ['HS1']
		p.ingredients = { crystal: 0, toad: 1, quick: 1, banshee: 0 }
		expect(craftable(s, 0).HS1.ok).toBe(true)
		p.potions = [potion('x', 'HS1'), potion('y', 'HS1'), potion('z', 'HS1')]
		expect(craftable(s, 0).HS1).toEqual({ ok: false, missing: {} })
	})

	it('Tier 2 pays Quicksilver at half rate, rounded up', () => {
		const s = fresh()
		s.players[0].recipes = ['HS6']
		s.players[0].tier = 2
		s.players[0].ingredients = { crystal: 0, toad: 2, quick: 1, banshee: 0 }
		expect(craftable(s, 0).HS6.ok).toBe(true)
		s.players[0].ingredients.quick = 0
		expect(craftable(s, 0).HS6).toEqual({ ok: false, missing: { quick: 1 } })
	})

	it('agrees with craftPotion, including the Scare S14 extra ingredient', () => {
		const s = fresh()
		s.yearFx.scare = 'S14'
		const p = s.players[0]
		p.recipes = ['HS1', 'HS3']
		p.ingredients = { crystal: 1, toad: 1, quick: 1, banshee: 0 }
		const got = craftable(s, 0)
		expect(got.HS1).toEqual({ ok: false, missing: { toad: 1 } })
		for (const id of p.recipes) {
			let crafted = true
			try {
				craftPotion(structuredClone(s), 0, { recipe: id })
			} catch {
				crafted = false
			}
			expect(got[id].ok).toBe(crafted)
		}
	})
})

describe('condemnRisk', () => {
	it('condemned when warnings outrun reputation, the same as the Audit condemn stage', () => {
		const s = fresh()
		Object.assign(s.players[0], { warnings: 3, reputation: 2 })
		expect(condemnRisk(s, 0)).toEqual({ warnings: 3, counted: 3, reputation: 2, condemned: true })
		auditEnter['audit.condemn'](s)
		expect(s.log.some(l => l.seat === 0 && l.key === 'condemned')).toBe(true)
	})

	it('a Tier 4 Cauldron forgives one Warning', () => {
		const s = fresh()
		Object.assign(s.players[0], { warnings: 3, reputation: 2, tier: 4 })
		expect(condemnRisk(s, 0)).toMatchObject({ counted: 2, condemned: false })
	})

	it('an unused T9 counts one fewer Warning, a used one does not', () => {
		const s = fresh()
		Object.assign(s.players[0], { warnings: 2, reputation: 1, testimonials: ['T9'] })
		expect(condemnRisk(s, 0)).toMatchObject({ counted: 1, condemned: false })
		s.players[0].usedOnce = { t9: s.year }
		expect(condemnRisk(s, 0)).toMatchObject({ counted: 2, condemned: true })
	})
})

describe('spoilRisk', () => {
	it('Tier 2 and a Cold-Room Rack each add a protect slot; Backed Futures keeps a potion', () => {
		const s = fresh()
		const p = s.players[0]
		p.tier = 2
		p.apparatus = ['coldRoomRack']
		p.potions = [potion('a', 'HS1', { backedFutures: true }), potion('b', 'HS1')]
		expect(spoilRisk(s, 0)).toEqual({ slots: 2, atRisk: ['b'] })
		p.potions[0].backedAudits = 1
		expect(spoilRisk(s, 0).atRisk).toEqual(['a', 'b'])
	})
})

describe('upgradeStatus', () => {
	it('shows the next tier cost and whether the seat can pay it', () => {
		const s = fresh()
		const p = s.players[0]
		p.cash = 6
		p.ingredients = { crystal: 0, toad: 1, quick: 0, banshee: 0 }
		expect(upgradeStatus(s, 0)).toMatchObject({ nextTier: 2, crowns: 6, affordable: false, missing: { any: 1 } })
		p.ingredients = { crystal: 0, toad: 2, quick: 0, banshee: 0 }
		expect(upgradeStatus(s, 0)).toMatchObject({ affordable: true, missing: {} })
	})

	it('reports no next tier at Tier 4', () => {
		const s = fresh()
		s.players[0].tier = 4
		expect(upgradeStatus(s, 0)).toMatchObject({ nextTier: null, affordable: false })
	})
})

describe('yearEarned', () => {
	it('is Recognized Profit since the start of the Year', () => {
		const s = fresh()
		Object.assign(s.players[0], { recognized: 12, yearStartRecognized: 5 })
		expect(yearEarned(s, 0)).toBe(7)
	})
})

describe('projectedScore', () => {
	it('is the Final Audit VP with the tier held now, and leaves the state alone', () => {
		const s = fresh()
		Object.assign(s.players[0], { recognized: 30, cash: 16, tier: 3, tierAtY7Start: 1, warnings: 1 })
		const row = projectedScore(s, 0)
		expect(row.breakdown.tier).toBe(TIER_VP[3])
		expect(row.breakdown).toMatchObject({ profit: 10, cash: 2, warnings: -2 })
		expect(row.vp).toBe(Object.values(row.breakdown).reduce((a, b) => a + b, 0))
		expect(s.players[0].tierAtY7Start).toBe(1)
	})
})
