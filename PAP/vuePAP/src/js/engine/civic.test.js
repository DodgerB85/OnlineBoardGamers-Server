import { describe, it, expect } from 'vitest'
import { createGame, applyAction, currentPrompt, PAPError } from './index.js'
import { enter as auditEnter } from './audit.js'
import { enter as civicEnter } from './civic.js'

const PICKS = [['HS1', 'HS2'], ['HS3', 'HS4'], ['HS5', 'HS6'], ['HS8', 'HS11']]

// Plays the House Special picks; `before` runs on the state just before the last pick, so Recognized set there orders Council.
function start(n = 2, before = () => {}) {
	let s = createGame(7, PICKS.slice(0, n).map((_, i) => 'P' + i))
	for (let seat = 0; seat < n; seat++) {
		if (seat === n - 1) before(s)
		s = applyAction(s, seat, { type: 'chooseRecipes', recipes: PICKS[seat] })
	}
	return s
}

describe('civic', () => {
	it('queues Council prompts lowest Recognized first', () => {
		const s = start(2, s => { s.players[0].recognized = 5 })
		expect(s.queue.filter(q => q.step === 'post.council').map(q => q.seat)).toEqual([1, 0])
	})

	it('passes a Charter to a Boone and Seal for the contributor, then runs a Bylaw vote', () => {
		let s = start(2, s => { s.players[0].recognized = 5 })
		s.council.open = [{ charterId: 'C3', progress: 3, contributedBy: [], venue: 'workhouse' }]
		s.players[1].hype = 2
		s = applyAction(s, 1, { type: 'contribute', charterIdx: 0 })
		const venue = s.venues.find(v => v.id === 'workhouse')
		expect(venue.boone).toBe(true)
		expect(venue.founder).toBe(1)
		expect(s.players[1].seals).toEqual(['workhouse'])
		expect(s.players[1].hype).toBe(2)
		expect(s.queue[1].step).toBe('post.bylaw')
		s = applyAction(s, 1, { type: 'done' })
		const cands = currentPrompt(s).data.candidates
		expect(currentPrompt(s).step).toBe('post.bylaw')
		s = applyAction(s, 1, { type: 'vote', candidate: cands[0] })
		expect(s.council.open.map(c => c.charterId)).toEqual([cands[0]])
	})

	it('never founds a Charter for the Recognized leader', () => {
		let s = start(2, s => { s.players[0].recognized = 5 })
		s.council.open = [{ charterId: 'C3', progress: 3, contributedBy: [], venue: 'workhouse' }]
		s.players[0].hype = 1
		s = applyAction(s, 1, { type: 'done' })
		s = applyAction(s, 0, { type: 'contribute', charterIdx: 0 })
		expect(s.venues.find(v => v.id === 'workhouse').boone).toBe(true)
		expect(s.venues.find(v => v.id === 'workhouse').founder).toBe(null)
		expect(s.players[0].seals).toEqual([])
	})

	it('breaks Bylaw ties for the candidate of the lowest-Recognized voter', () => {
		let s = start(2, s => { s.players[0].recognized = 5; s.players[1].recognized = 2 })
		s.venues.find(v => v.id === 'golem').founder = 0
		s.players[0].seals = ['golem']
		s.council.open = [{ charterId: 'C3', progress: 3, contributedBy: [], venue: 'workhouse' }]
		s.players[1].hype = 2
		s = applyAction(s, 1, { type: 'contribute', charterIdx: 0 })
		s = applyAction(s, 1, { type: 'done' })
		const cands = currentPrompt(s).data.candidates
		s = applyAction(s, 1, { type: 'vote', candidate: cands[0] })
		expect(currentPrompt(s).step).toBe('post.bylaw')
		s = applyAction(s, 0, { type: 'vote', candidate: cands[1] })
		expect(s.council.open.map(c => c.charterId)).toEqual([cands[0]])
		expect(s.decks.charter.slice(-2)).toEqual([cands[1], cands[2]])
	})

	it('freezes the leader for one Charter opportunity and makes the barred contribution double', () => {
		let s = start(3, s => { s.players[0].recognized = 10; s.players[1].recognized = 3; s.players[2].recognized = 5 })
		s = applyAction(s, 1, { type: 'callReview' })
		expect(s.council.review).toMatchObject({ caller: 1, frozen: 0, opportunities: 1 })
		s.council.open = [{ charterId: 'C1', progress: 0, contributedBy: [], venue: 'golem' }]
		s = applyAction(s, 1, { type: 'contribute', charterIdx: 0, good: 'toad' })
		expect(s.council.open[0].progress).toBe(0)
		s = applyAction(s, 1, { type: 'done' })
		s = applyAction(s, 2, { type: 'done' })
		expect(() => applyAction(s, 0, { type: 'contribute', charterIdx: 0, good: 'toad' })).toThrow(PAPError)
		s = applyAction(s, 0, { type: 'done' })
		expect(s.council.review).toBe(null)
		expect(s.council.open[0].progress).toBe(2)
		expect(s.council.open[0].contributedBy).toEqual([1, 0])
	})

	it('lets last Year\'s Founder Rally next Year, but not an older Seal holder', () => {
		let s = start(4)
		s.council.open = [{ charterId: 'C3', progress: 3, contributedBy: [], venue: 'workhouse' }]
		s.players[2].hype = 1
		s.log.push({ y: 0, seat: 3, key: 'seal', args: { venue: 'odditorium' } })
		s.players[3].seals = ['odditorium']

		// Pass a Year 1 Charter for seat 2 and let the Audit close its Boone.
		s = applyAction(s, 3, { type: 'done' })
		s = applyAction(s, 2, { type: 'contribute', charterIdx: 0 })
		expect(s.log).toContainEqual(expect.objectContaining({ y: 1, seat: 2, key: 'seal' }))
		auditEnter['audit.auto'](s)
		expect(s.year).toBe(2)
		expect(s.venues.find(v => v.id === 'workhouse')).toMatchObject({ boone: false, founder: null })

		// The recognized leader is 0 and the 4-player caller is the runner-up, seat 1.
		s.players[0].recognized = 10
		s.players[1].recognized = 8
		s.players[2].recognized = 5
		s.players[3].recognized = 2
		s.queue = []
		civicEnter['post.review'](s)
		expect(currentPrompt(s)).toMatchObject({ step: 'post.review', seat: 1 })
		s = applyAction(s, 1, { type: 'callReview' })
		expect(s.queue.filter(q => q.step === 'post.rally')).toEqual([
			{ step: 'post.rally', seat: 2, data: {} },
		])
	})

	it('keeps live-Boone Rally eligibility for legacy states without a rules version', () => {
		let s = start(4)
		s.players[0].recognized = 10
		s.players[1].recognized = 8
		s.players[2].recognized = 5
		s.venues.find(v => v.id === 'workhouse').boone = true
		s.venues.find(v => v.id === 'workhouse').founder = 2
		delete s.options.rulesVersion
		s.queue = [{ step: 'post.review', seat: 1, data: {} }]

		s = applyAction(s, 1, { type: 'callReview' })
		expect(s.queue.filter(q => q.step === 'post.rally')).toEqual([
			{ step: 'post.rally', seat: 2, data: {} },
		])
	})
})
