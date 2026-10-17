// Permit Office (rulebook §7): Public Review, Council contributions, Civic Boone, Founder's Seal, Bylaw votes.
import * as C from './cards.js'
import { require, log, player, venue, venueInfo, gainHype, spendHype, potion, potionStars, removePotion, recognizedLeader, ascendingRecognized, draw, newId } from './state.js'
import { shuffle } from './rng.js'
import { openCharter } from './setup.js'

function hasLiveSeal(s, seat) {
	return s.venues.some(v => v.founder === seat && v.boone)
}

// 4-5p: 2nd in Recognized; 3p: lowest-Recognized non-leader; 2p: disabled.
function reviewCaller(s, leader) {
	if (s.players.length === 2 || leader === null) return null
	const asc = ascendingRecognized(s)
	if (s.players.length === 3) return asc.find(seat => seat !== leader)
	return [...asc].reverse()[1]
}

// Draws 3 candidates (skipping venues with a live Boone). Returns the vote prompts, or opens the first candidate when nobody holds a Seal.
function bylaw(s) {
	const cands = []
	const skipped = []
	while (cands.length < 3) {
		const id = draw(s, 'charter', 'charterDiscard', shuffle)
		if (id === null) break
		if (venue(s, C.CHARTERS[id].venue).boone) skipped.push(id)
		else cands.push(id)
	}
	s.decks.charter.push(...skipped)
	if (cands.length === 0) return []
	const holders = ascendingRecognized(s).filter(seat => s.players[seat].seals.length > 0)
	if (holders.length === 0) {
		openCharter(s, cands[0])
		s.decks.charter.push(...cands.slice(1))
		return []
	}
	const block = newId(s, 'bylaw')
	return holders.map(seat => ({ step: 'post.bylaw', seat, data: { block, candidates: cands, votes: [] } }))
}

// A charter that reaches its threshold passes: Boone, then the Seal (never to the leader or a frozen seat), then a Bylaw vote.
function resolveCharter(s, idx, seat) {
	const c = s.council.open[idx]
	if (c.progress < C.CHARTERS[c.charterId].threshold) return
	const v = venue(s, c.venue)
	s.council.open.splice(idx, 1)
	v.boone = true
	log(s, seat, 'charterPassed', { charter: c.charterId })
	const frozen = s.council.review && s.council.review.frozen === seat
	if (v.founder === null && !frozen && seat !== recognizedLeader(s)) {
		v.founder = seat
		s.players[seat].seals.push(v.id)
		log(s, seat, 'seal', { venue: v.id })
	}
	s.decks.charterDiscard ||= []
	s.queue.splice(1, 0, ...bylaw(s))
	s.decks.charterDiscard.push(c.charterId)
}

function pay(s, seat, info, good) {
	const p = player(s, seat)
	const t = info.target
	if (t.type === 'ingredient') {
		require(good === t.kind && p.ingredients[t.kind] > 0, 'Contribute 1 ' + t.kind)
		p.ingredients[t.kind] -= 1
	} else if (t.type === 'recipeClass') {
		require(potionStars(potion(p, good)) === t.stars, 'This Charter needs a ' + t.stars + '-star potion')
		removePotion(p, good)
	} else {
		spendHype(s, seat, t.hype)
	}
}

// Freeze expiry (R14): the frozen leader's barred contribution is made by the Review, counts double, and founds nothing.
function endStage(s, r) {
	r.callerSpent = false
	r.opportunities -= 1
	if (r.opportunities > 0) return
	const idx = s.council.open.findIndex(c => !c.contributedBy.includes(r.frozen) && !venue(s, c.venue).boone)
	if (idx !== -1) {
		const c = s.council.open[idx]
		c.contributedBy.push(r.frozen)
		c.progress += 2
		log(s, r.frozen, 'reviewContribution', { charter: c.charterId })
		resolveCharter(s, idx, r.frozen)
	}
	s.council.review = null
}

export const enter = {
	'post.review': (s) => {
		for (const p of s.players) {
			p.franchise = false
			p.usedOnce = {}
			p.forcedReliability = false
			p.exchangesEntered = 0
			p.desperateVolume = 0
			p.yearStartRecognized = p.recognized
			p.yearEarned = 0
		}
		const caller = reviewCaller(s, recognizedLeader(s))
		if (caller !== null && !s.council.review) s.queue.push({ step: 'post.review', seat: caller, data: {} })
	},
	'post.council': (s) => {
		for (const c of s.council.open) c.contributedBy = []
		for (const seat of ascendingRecognized(s)) s.queue.push({ step: 'post.council', seat, data: {} })
	},
}

export const actions = {
	'post.review': {
		callReview(s, seat) {
			const leader = recognizedLeader(s)
			s.council.review = { caller: seat, frozen: leader, opportunities: 1, callerSpent: true }
			const rivals = s.order.filter(x => x !== leader && x !== seat && hasLiveSeal(s, x))
			s.queue.splice(1, 0, ...rivals.map(x => ({ step: 'post.rally', seat: x, data: {} })))
			log(s, seat, 'reviewCalled', {})
			return true
		},
		pass() {
			return true
		},
	},
	'post.rally': {
		rally(s, seat) {
			s.council.review.opportunities += 1
			log(s, seat, 'rally', {})
			return true
		},
		pass() {
			return true
		},
	},
	'post.council': {
		contribute(s, seat, a) {
			const c = s.council.open[a.charterIdx]
			require(c, 'No such open Charter')
			const r = s.council.review
			require(!(r && r.frozen === seat), 'A Public Review freezes you out of the civic lane')
			require(!c.contributedBy.includes(seat), 'You already contributed to this Charter this Year')
			require(!venue(s, c.venue).boone, 'That venue already has a Boone')
			c.contributedBy.push(seat)
			if (r && r.caller === seat && r.callerSpent) {
				r.callerSpent = false
				log(s, seat, 'reviewSlotSpent', {})
				return false
			}
			pay(s, seat, C.CHARTERS[c.charterId], a.good)
			gainHype(s, seat, 1)
			c.progress += 1
			log(s, seat, 'contributed', { charter: c.charterId })
			resolveCharter(s, a.charterIdx, seat)
			return false
		},
		done(s) {
			const r = s.council.review
			if (r && s.queue.slice(1).every(q => q.step !== 'post.council')) endStage(s, r)
			return true
		},
	},
	'post.bylaw': {
		vote(s, seat, a, prompt) {
			const { block, candidates, votes } = prompt.data
			require(candidates.includes(a.candidate), 'Not a candidate')
			const all = [...votes, { seat, candidate: a.candidate, weight: s.players[seat].seals.length }]
			const next = s.queue[1]
			if (next && next.data.block === block) {
				next.data.votes = all
				return true
			}
			const score = c => all.filter(v => v.candidate === c).reduce((n, v) => n + v.weight, 0)
			const best = Math.max(...candidates.map(score))
			const tied = candidates.filter(c => score(c) === best)
			const winner = tied.length === 1 ? tied[0] : all.find(v => tied.includes(v.candidate)).candidate
			openCharter(s, winner)
			s.decks.charter.push(...candidates.filter(c => c !== winner))
			log(s, null, 'bylaw', { charter: winner })
			return true
		},
	},
}

// Hype cut a seat collects from a venue it holds the Seal for, or 0 (R17).
export function founderCutFor(s, seat, venueId) {
	const v = venue(s, venueId)
	if (!v.boone || v.founder !== seat || seat === recognizedLeader(s)) return 0
	if (s.council.review && s.council.review.frozen === seat) return 0
	return venueInfo(venueId).founderCut
}
