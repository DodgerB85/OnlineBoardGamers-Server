import { describe, it, expect } from 'vitest'
import * as street from './street.js'

// Minimal High Street state. Workhouse and Golem Pound only; post and audit stages are not needed here.
function potion(id, recipe = 'HS1', extra = {}) {
	return { id, recipe, disp: null, poison: 0, potency: 1, protected: 0, backedFutures: false, reoffered: false, fireWard: false, ...extra }
}

function player(seat, potions) {
	return { name: 'P' + seat, seat, cash: 20, recognized: 0, yearStartRecognized: 0, yearEarned: 0, hype: 0, lockedHype: 0, reputation: 5, warnings: 0, tier: 1, tierAtY7Start: 1, ingredients: {}, recipes: [], staff: [], potions, hand: [], dispensations: [], apparatus: [], testimonials: [], seals: [], franchise: false, upgradedThisYear: false, sales: [], levyOwed: 0, exchangesEntered: 0, desperateVolume: 0, usedOnce: {}, everEmployed: 0 }
}

function game(potions = [[], []]) {
	const venue = (id, customer) => ({ id, customer, mood: 'calm', servedThisYear: 0, unserved: false, boone: false, founder: null, standingSince: 1, overflow: false })
	return {
		year: 1, serial: 0, rng: 1, first: 0, order: [0, 1], watch: null, administered: null,
		players: [player(0, potions[0]), player(1, potions[1])],
		venues: [venue('workhouse', 'W15'), venue('golem', 'G12')],
		council: { open: [], review: null }, decks: { paperDiscard: [] }, yearFx: { scare: null },
		exchange: null, lastStreet: { salesByVenue: {} }, log: [], queue: [],
	}
}

// Workhouse customer wants 2-star potions, so only Golem Pound is contested.
function contest(potions) {
	const s = game(potions)
	s.venues[0].customer = 'W13'
	return s
}

const solo = street.actions['street.solo']
const commit = street.actions['street.commit']

describe('street', () => {
	it('solo sale pays the Anchor less overhead and gains Hype', () => {
		const s = game([[potion('a')], []])
		street.enter['street.solo'](s)
		solo.soloSale(s, 0, { venue: 'workhouse', potionId: 'a' })
		const p = s.players[0]
		expect(p.cash).toBe(22)
		expect(p.recognized).toBe(2)
		expect(p.hype).toBe(1)
		expect(p.potions).toHaveLength(0)
		expect(s.street.served.workhouse).toBe(0)
	})

	it('exchange tie goes to the lower price, which also earns the Undercut Bonus', () => {
		const s = contest([[potion('a', 'HS1', { potency: 1 })], [potion('b', 'HS1', { potency: 1 })]])
		s.players[0].hype = 2
		street.enter['street.solo'](s)
		street.enter['street.exchange'](s)
		// Scores: seat 0 = 2 + 2 - 3 = 1, seat 1 = 2 + 0 - 1 = 1. Seat 1 wins on price, then +2 Crowns and +1 Reputation.
		commit.commit(s, 0, { potionId: 'a', price: 3, hype: 2 })
		commit.commit(s, 1, { potionId: 'b', price: 1, hype: 0 })
		expect(s.players[1].cash).toBe(22)
		expect(s.players[1].reputation).toBe(6)
		expect(s.players[0].hype).toBe(0)
		expect(s.street.losers).toEqual([{ seat: 0, venue: 'golem', potionId: 'a' }])
	})

	it('a lone commit pays its own price with no Undercut Bonus', () => {
		const s = contest([[potion('a')], [potion('b')]])
		street.enter['street.solo'](s)
		street.enter['street.exchange'](s)
		commit.commit(s, 0, { potionId: 'a', price: 2, hype: 0 })
		commit.pass(s, 1)
		expect(s.players[0].recognized).toBe(1)
		expect(s.players[0].reputation).toBe(5)
		expect(s.street.served.golem).toBe(0)
	})

	it('over-tolerance sale takes both premiums, owes the Levy and takes a Warning', () => {
		const s = game([[potion('a', 'HS1', { poison: 3 })], []])
		street.enter['street.solo'](s)
		solo.soloSale(s, 0, { venue: 'workhouse', potionId: 'a' })
		const p = s.players[0]
		// Anchor 3 + unlicensed 2 + Poison premium 3 - overhead 1.
		expect(p.cash).toBe(27)
		expect(p.levyOwed).toBe(2)
		expect(p.warnings).toBe(1)
		expect(p.reputation).toBe(4)
	})

	it('dump pays 1 Crown with no overhead and costs 1 Reputation', () => {
		const s = game([[potion('a')], []])
		street.enter['street.solo'](s)
		solo.dump(s, 0, { potionId: 'a' })
		const p = s.players[0]
		expect([p.cash, p.recognized, p.reputation, p.potions]).toEqual([21, 1, 4, []])
	})

	it('a shop that could serve and declined loses 1 Reputation when the customer stays unserved', () => {
		const s = contest([[potion('a')], []])
		street.enter['street.solo'](s)
		solo.done(s, 0)
		street.enter['street.exchange'](s)
		street.enter['street.extra'](s)
		street.enter['street.reoffer'](s)
		street.enter['street.end'](s)
		expect(s.players[0].reputation).toBe(4)
		expect(s.players[1].reputation).toBe(5)
		expect(s.venues[1].unserved).toBe(true)
	})

	it('desperate extra volume stops at Kettle capacity', () => {
		const potions = ['a', 'b', 'c', 'd', 'e'].map(id => potion(id, 'HS3', { potency: 2 }))
		const s = game([potions, []])
		s.venues[0].customer = 'W13'
		s.venues[0].mood = 'desperate'
		street.enter['street.solo'](s)
		solo.soloSale(s, 0, { venue: 'workhouse', potionId: 'a' })
		street.enter['street.extra'](s)
		const prompt = s.queue.find(q => q.step === 'street.extraSale' && q.data.slot === 'desperate')
		const sell = street.actions['street.extraSale'].sell
		// Kettle capacity is 3 at Tier 1: two sales keep the prompt open, the third closes it.
		expect(sell(s, 0, { potionId: 'b' }, prompt)).toBe(false)
		expect(sell(s, 0, { potionId: 'c' }, prompt)).toBe(false)
		expect(sell(s, 0, { potionId: 'd' }, prompt)).toBe(true)
		expect(s.players[0].desperateVolume).toBe(3)
		expect(s.players[0].cash).toBe(28)
		expect(() => sell(s, 0, { potionId: 'e' }, prompt)).toThrow('Kettle capacity')
		expect(s.players[0].potions.map(p => p.id)).toEqual(['e'])
	})
})
