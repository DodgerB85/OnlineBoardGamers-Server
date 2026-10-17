import { describe, it, expect } from 'vitest'
import { createGame, applyAction, PAPError } from './index.js'
import { actions, enter } from './post.js'

const PICKS = [['HS1', 'HS2'], ['HS3', 'HS4']]

// Plays the House Special picks and stops at the first Morning Post prompt.
function start() {
	let s = createGame(7, ['P0', 'P1'])
	for (let seat = 0; seat < 2; seat++) s = applyAction(s, seat, { type: 'chooseRecipes', recipes: PICKS[seat] })
	s.yearFx = { scare: null }
	return s
}

const choices = actions['post.choices']

describe('post', () => {
	it('refreshes an unserved customer as Desperate and discards the old one', () => {
		const s = start()
		s.year = 2
		s.queue = []
		const v = s.venues.find(x => x.id === 'workhouse')
		const old = v.customer
		v.unserved = true
		enter['post.refresh'](s)
		expect(v.customer).not.toBe(old)
		expect(v.mood).toBe('desperate')
		expect(s.decks.customerDiscard).toContain(old)
	})

	it('makes a seat over the hand limit discard until it is within the limit', () => {
		const s = start()
		s.queue = []
		s.players[0].hand = ['favor', 'favor', 'favor', 'favor', 'favor']
		enter['post.draw'](s)
		expect(s.queue).toEqual([{ step: 'post.discard', seat: 0, data: {} }])
		expect(actions['post.discard'].discard(s, 0, { type: 'discard', card: 'favor' })).toBe(false)
		expect(actions['post.discard'].discard(s, 0, { type: 'discard', card: 'favor' })).toBe(true)
		expect(s.players[0].hand).toHaveLength(4)
	})

	it('lets only a shop 10 Recognized Profit behind the leader buy a Franchise', () => {
		const s = start()
		s.players[0].recognized = 15
		s.players[1].recognized = 6
		expect(() => choices.buyFranchise(s, 1, { type: 'buyFranchise' })).toThrow(PAPError)
		s.players[1].recognized = 5
		choices.buyFranchise(s, 1, { type: 'buyFranchise' })
		expect(s.players[1]).toMatchObject({ franchise: true, recognized: 3, cash: 18 })
	})

	it('Expose warns the target only for an over-tolerance sale, and once per venue', () => {
		const s = start()
		s.players[1].hype = 2
		s.lastStreet.salesByVenue = { golem: [0], workhouse: [0] }
		s.players[0].sales = [{ venue: 'golem', overTolerance: true, year: 1 }, { venue: 'workhouse', overTolerance: false, year: 1 }]
		choices.expose(s, 1, { type: 'expose', seat: 0, venue: 'golem' })
		expect(s.players[0].warnings).toBe(1)
		choices.expose(s, 1, { type: 'expose', seat: 0, venue: 'workhouse' })
		expect(s.players[0].warnings).toBe(1)
		expect(s.players[1].hype).toBe(0)
		expect(() => choices.expose(s, 1, { type: 'expose', seat: 0, venue: 'golem' })).toThrow(PAPError)
	})

	it('plants a Testimonial for 3 Hype and refills the market from the deck', () => {
		const s = start()
		s.decks.testimonialMarket = ['T1', 'T2', 'T3']
		s.decks.testimonial = ['T9', 'T10']
		s.players[0].hype = 3
		choices.plantTestimonial(s, 0, { type: 'plantTestimonial', testiId: 'T2' })
		expect(s.players[0]).toMatchObject({ hype: 0, testimonials: ['T2'] })
		expect(s.decks.testimonialMarket).toEqual(['T1', 'T3', 'T9'])
	})
})
