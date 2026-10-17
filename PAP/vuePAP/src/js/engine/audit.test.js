import { describe, it, expect } from 'vitest'
import { createGame } from './index.js'
import { enter, actions, finalScores } from './audit.js'

// A fresh game with no pending setup prompts, so Audit stages can be entered directly.
function game() {
	const s = createGame(7, ['A', 'B', 'C'])
	s.queue = []
	return s
}

const potion = (id, extra = {}) => ({ id, recipe: 'HS1', disp: null, poison: 0, potency: 1, protected: 0, backedFutures: false, reoffered: false, fireWard: false, ...extra })

describe('audit: levies and condemnation', () => {
	it('doubles levies under S11 and lets Expediting Fee waive one 2-Crown unit', () => {
		const s = game()
		s.yearFx.doubleLevies = true
		s.auditOrder = [0, 1, 2]
		Object.assign(s.players[0], { levyOwed: 2, skipLevy: 1, cash: 20, recognized: 10 })
		enter['audit.condemn'](s)
		expect(s.players[0]).toMatchObject({ cash: 18, recognized: 8, warnings: 0, levyOwed: 0 })
	})

	it('turns an unpaid levy into one Warning per 2 Crowns', () => {
		const s = game()
		s.auditOrder = [0, 1, 2]
		Object.assign(s.players[0], { levyOwed: 4, cash: 2, reputation: 5 })
		enter['audit.condemn'](s)
		expect(s.players[0]).toMatchObject({ cash: 0, warnings: 1, reputation: 4 })
		expect(s.queue).toEqual([])
	})

	it('lets a Condemned shop pay or discard a Journeyman', () => {
		const s = game()
		s.auditOrder = [0, 1, 2]
		Object.assign(s.players[0], { warnings: 3, reputation: 1, cash: 20, recognized: 20 })
		s.players[0].staff = [{ id: 's0_2', rank: 'journeyman', hiredYear: 1, tile: null, everWorked: false }]
		enter['audit.condemn'](s)
		expect(s.queue).toEqual([{ step: 'audit.condemn', seat: 0, data: { excess: 2 } }])

		const d = structuredClone(s)
		actions['audit.condemn'].discardJourneyman(d, 0, { type: 'discardJourneyman', staffId: 's0_2' }, d.queue[0])
		expect(d.players[0]).toMatchObject({ warnings: 1, reputation: 3 })
		expect(d.players[0].staff).toEqual([])

		actions['audit.condemn'].payCondemnation(s, 0, { type: 'payCondemnation' }, s.queue[0])
		expect(s.players[0]).toMatchObject({ cash: 16, warnings: 3 })
	})

	it('pays all cash and keeps the excess when neither option is affordable', () => {
		const s = game()
		s.auditOrder = [0, 1, 2]
		Object.assign(s.players[0], { warnings: 2, reputation: 0, cash: 1, recognized: 5 })
		enter['audit.condemn'](s)
		expect(s.queue).toEqual([])
		expect(s.players[0]).toMatchObject({ cash: 0, recognized: 4, warnings: 2 })
	})
})

describe('audit: Paperwork', () => {
	it('plays Favor and Expediting Fee from hand and reorders the fee check', () => {
		const s = game()
		Object.assign(s.players[0], { hand: ['favor', 'favor', 'expedite'], warnings: 1, reputation: 0, recognized: 10 })
		enter['audit.paper'](s)
		actions['audit.paper'].favor(s, 0, { type: 'favor', mode: 'cancel' })
		expect(s.players[0]).toMatchObject({ warnings: 0, reputation: 1, hand: ['favor', 'expedite'] })
		expect(s.decks.paperDiscard.at(-1)).toBe('favor')

		actions['audit.paper'].favor(s, 0, { type: 'favor', mode: 'order', seat: 2 })
		expect(s.auditOrder).toEqual([2, 0, 1])
		actions['audit.paper'].expedite(s, 0, { type: 'expedite', mode: 'last', seat: 2 })
		expect(s.auditOrder).toEqual([0, 1, 2])
		expect(s.players[0]).toMatchObject({ cash: 19, recognized: 9, hand: [] })
		expect(s.decks.side.at(-1)).toBe('expedite')
	})
})

describe('audit: spoilage', () => {
	it('protects with Tier 2 and Cold-Room Rack slots, and Backed Futures survives without one', () => {
		const s = game()
		const p = s.players[0]
		Object.assign(p, { tier: 2, apparatus: ['coldRoomRack'], lockedHype: 4 })
		p.potions = [potion('bf1', { backedFutures: true }), potion('bf2', { backedFutures: true, backedAudits: 1 }), potion('a'), potion('b'), potion('c')]
		enter['audit.spoil'](s)
		expect(s.queue).toEqual([{ step: 'audit.spoil', seat: 0, data: { slots: 2 } }])
		const prompt = s.queue[0]
		expect(() => actions['audit.spoil'].protect(s, 0, { type: 'protect', potionIds: ['a', 'b', 'c'] }, prompt)).toThrow('Protect up to 2')
		actions['audit.spoil'].protect(s, 0, { type: 'protect', potionIds: ['a', 'b'] }, prompt)
		expect(p.potions.map(x => x.id)).toEqual(['bf1', 'a', 'b'])
		expect(p.potions[0].backedAudits).toBe(1)
		expect(p.lockedHype).toBe(2)
	})
})

describe('audit: recalibration, ruin check and watch', () => {
	it('gives First Player to the top earner, ties to fewer Warnings then turn order, and rotates the order', () => {
		const s = game()
		Object.assign(s.players[0], { recognized: 10, warnings: 1 })
		Object.assign(s.players[1], { recognized: 10, warnings: 0 })
		s.players[2].recognized = 5
		s.order = [0, 1, 2]
		s.first = 0
		enter['audit.auto'](s)
		expect(s.first).toBe(1)
		expect(s.players[1].warnings).toBe(1)
		expect(s.order).toEqual([1, 2, 0])
		expect(s.year).toBe(2)
	})

	it('breaks a full tie by earlier turn order', () => {
		const s = game()
		Object.assign(s.players[0], { recognized: 10 })
		Object.assign(s.players[1], { recognized: 10 })
		s.order = [2, 0, 1]
		s.first = 2
		enter['audit.auto'](s)
		expect(s.first).toBe(0)
	})

	it('puts the Watch shop under Administration only when it is at or below 40 and did not grow', () => {
		const s = game()
		s.watch = 2
		Object.assign(s.players[2], { recognized: 30, yearStartRecognized: 30, reputation: 5 })
		enter['audit.auto'](s)
		expect(s.administered).toBe(2)
		expect(s.players[2]).toMatchObject({ warnings: 1, reputation: 4 })

		const grew = game()
		grew.watch = 2
		Object.assign(grew.players[2], { recognized: 30, yearStartRecognized: 20 })
		enter['audit.auto'](grew)
		expect(grew.administered).toBe(null)
	})

	it('watches the lowest shop at or below 40, else the lowest overall, ties to the later turn order', () => {
		const watchAfterAudit = (recognized, order = [0, 1, 2]) => {
			const s = game()
			recognized.forEach((r, i) => { s.players[i].recognized = r })
			s.order = order
			s.first = order[0]
			enter['audit.auto'](s)
			return s.watch
		}
		expect(watchAfterAudit([55, 30, 20])).toBe(2)
		expect(watchAfterAudit([55, 45, 42])).toBe(2)
		expect(watchAfterAudit([30, 30, 50])).toBe(1)
	})
})

describe('audit: final scoring', () => {
	// Three shops with a full worked roster and no cash, unless a test changes it.
	const endgame = (recognized, softerEnding = false) => {
		const s = game()
		s.options.softerEnding = softerEnding
		recognized.forEach((r, i) => Object.assign(s.players[i], { recognized: r, cash: 0, everEmployed: 1, workedCount: 1 }))
		return s
	}

	it('scores tier as reached at the start of Year 7 and the worked-roster bonus', () => {
		const s = endgame([60, 60, 60])
		Object.assign(s.players[0], { tier: 4, tierAtY7Start: 2 })
		Object.assign(s.players[1], { everEmployed: 2 })
		const { rows } = finalScores(s)
		expect(rows[0].breakdown).toMatchObject({ profit: 20, tier: 3, staff: 3, softer: 0 })
		expect(rows[1].breakdown.staff).toBe(0)
	})

	it('eliminates shops below 40 when the leader reaches 40', () => {
		const { rows, winner, finalPositions } = finalScores(endgame([60, 30, 45]))
		expect(rows.map(r => r.eligible)).toEqual([true, false, true])
		expect(winner).toBe(0)
		expect(finalPositions[2]).toBe(1)
	})

	it('keeps a shop below 40 for -10 VP under the softer ending', () => {
		const { rows } = finalScores(endgame([60, 30, 45], true))
		expect(rows[1]).toMatchObject({ eligible: true, vp: 10 + 3 - 10 })
		expect(rows[1].breakdown.softer).toBe(-10)
	})

	it('eliminates nobody when even the leader is below 40', () => {
		const { rows } = finalScores(endgame([30, 20, 10]))
		expect(rows.every(r => r.eligible)).toBe(true)
		expect(rows.every(r => r.breakdown.softer === 0)).toBe(true)
	})

	it('sets the result after Year 7', () => {
		const s = endgame([60, 30, 45])
		s.year = 7
		enter['audit.auto'](s)
		expect(s.result.winner).toBe(0)
	})
})
