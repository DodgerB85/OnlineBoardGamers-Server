// Morning Post (rulebook §3, §7 franchise, §8 Expose, §9 Paperwork and Testimonials): admin, Scares, customers, draw, choices.
import * as C from './cards.js'
import { require, log, player, venue, warn, money, spendHype, availableHype, potion, handLimit, draw } from './state.js'
import { shuffle } from './rng.js'
import { dealFor } from './setup.js'

// Panic and Calm-to-Desperate come from this Year's Scare; re-applied after any customer or Panic change (R3).
export function applyMoods(s) {
	const fx = s.yearFx
	for (const v of s.venues) {
		const base = v.baseMood || (v.customer ? C.CUSTOMERS[v.customer].mood : 'calm')
		if (fx.allPanicked || fx.panic === v.id) v.mood = 'panicked'
		else v.mood = fx.calmToDesperate && base === 'calm' ? 'desperate' : base
	}
}

function deal(s, v, replacement) {
	v.customer = dealFor(s, v, shuffle)
	require(v.customer, 'No Customers left to deal')
	v.baseMood = replacement ? 'desperate' : C.CUSTOMERS[v.customer].mood
	v.standingSince = s.year
	v.servedThisYear = 0
	v.sold = false
	v.unserved = false
}

function refresh(s, v) {
	if (v.customer) s.decks.customerDiscard.push(v.customer)
	deal(s, v, v.unserved)
}

// Paperwork leaves the hand: side-deck cards go to the bottom of their deck (rulebook §9).
export function playPaper(s, seat, cardId) {
	const p = player(s, seat)
	const i = p.hand.indexOf(cardId)
	require(i !== -1, 'That Paperwork is not in your hand')
	p.hand.splice(i, 1)
	if (C.PAPERWORK[cardId].sideDeck) s.decks.side.push(cardId)
	else s.decks.paperDiscard.push(cardId)
}

// Inspection Notice (rulebook §9): any time. Pays 1 Crown operating outlay; a target who cannot pay in full takes a Warning.
export function inspectionNotice(s, seat, targetSeat) {
	playPaper(s, seat, 'inspection')
	money(s, seat, -1, true)
	const t = player(s, targetSeat)
	if (t.cash >= t.levyOwed) {
		money(s, targetSeat, -t.levyOwed, true)
		t.levyOwed = 0
	} else {
		warn(s, targetSeat, 'inspection')
	}
	log(s, seat, 'inspection', { seat: targetSeat })
}

// Sales from the last High Street stay visible for Expose until the next High Street starts.
export function resetSalesForNewStreet(s) {
	for (const p of s.players) p.sales = []
}

// Bribe and the retarget Pamphlet move this Year's Panic to another fixed venue (R18).
function retarget(s, venueId) {
	require(s.yearFx.panic, "This Year's Scare is not a Panic")
	require(C.VENUES.some(v => v.id === venueId) && venueId !== s.yearFx.panic, 'Retarget the Panic to another fixed venue')
	s.yearFx.panic = venueId
	applyMoods(s)
}

export const enter = {
	'post.admin': (s) => {
		const a = s.administered
		// The Administration Warning was already taken at the Audit that set it; s.administered stays set all Year.
		if (a === null) return
		if (Object.values(s.players[a].ingredients).every(n => n === 0)) return
		s.queue.push({ step: 'admin.name', seat: a, data: {} })
	},
	'post.events': (s) => {
		const id = draw(s, 'scare', 'scareDiscard', shuffle)
		s.yearFx = { scare: id }
		if (id === null) return
		s.decks.scareDiscard.push(id)
		log(s, null, 'scare', { scare: id })
		const e = C.SCARES[id].effect
		switch (e.type) {
			case 'panic':
				s.yearFx.panic = e.venue
				break
			case 'calmToDesperate':
				s.yearFx.calmToDesperate = true
				break
			case 'ingredientSurcharge':
				s.yearFx.surcharge = [{ kind: e.kind, where: e.where, amount: e.amount }]
				break
			case 'panicAll':
				s.yearFx.allPanicked = true
				s.yearFx.allPanickedReliability = true
				break
			case 'doubleLevies':
				s.yearFx.doubleLevies = true
				break
			case 'warnHypeLeader': {
				const top = Math.max(...s.players.map(p => p.hype))
				const leaders = s.players.filter(p => p.hype === top)
				if (leaders.length === 1) warn(s, leaders[0].seat, 'scare')
				break
			}
			case 'pitchPoisoned':
				s.queue.push({ step: 'post.pitch', seat: s.first, data: {} })
				break
			case 'craftExtraIngredient':
				s.yearFx.craftExtraIngredient = true
				break
		}
	},
	'post.refresh': (s) => {
		if (s.year > 1) {
			const done = new Set()
			for (const v of s.venues) {
				if (!v.overflow && !v.sold && !v.unserved) continue
				refresh(s, v)
				done.add(v.id)
			}
			if (s.players.length === 2) {
				const rest = s.venues.filter(v => !done.has(v.id))
				if (rest.length) refresh(s, rest.reduce((a, b) => (b.standingSince < a.standingSince ? b : a)))
			}
		}
		applyMoods(s)
	},
	'post.draw': (s) => {
		for (const seat of s.order) {
			const card = draw(s, 'paper', 'paperDiscard', shuffle)
			if (card !== null) s.players[seat].hand.push(card)
		}
		for (const seat of s.order) {
			if (s.players[seat].hand.length > handLimit(s.players[seat])) s.queue.push({ step: 'post.discard', seat, data: {} })
		}
	},
	'post.choices': (s) => {
		for (const seat of [...s.order].reverse()) s.queue.push({ step: 'post.choices', seat, data: {} })
	},
}

export const actions = {
	'admin.name': {
		nameRival(s, seat, a) {
			require(a.seat !== seat && s.players[a.seat], 'Name a rival')
			s.queue.splice(1, 0, { step: 'admin.take', seat: a.seat, data: { from: seat } })
			return true
		},
	},
	'admin.take': {
		takeIngredient(s, seat, a, prompt) {
			const from = player(s, prompt.data.from)
			require(C.INGREDIENTS.includes(a.kind) && from.ingredients[a.kind] > 0, 'Nothing of that kind to take')
			from.ingredients[a.kind] -= 1
			player(s, seat).ingredients[a.kind] += 1
			log(s, seat, 'administered', { kind: a.kind })
			return true
		},
	},
	'post.pitch': {
		poisonPitch(s, seat, a) {
			require(a.seat !== seat && s.players[a.seat], 'Name a rival')
			spendHype(s, seat, C.SCARES.S13.effect.hypeCost)
			s.yearFx.pitchBlocked = a.seat
			log(s, seat, 'pitchPoisoned', {})
			return true
		},
		pass() {
			return true
		},
	},
	'post.discard': {
		discard(s, seat, a) {
			playPaper(s, seat, a.card)
			return player(s, seat).hand.length <= handLimit(player(s, seat))
		},
	},
	'post.choices': {
		done() {
			return true
		},
		buyFranchise(s, seat) {
			const p = player(s, seat)
			require(!p.franchise, 'You already hold a Franchise this Year')
			const top = Math.max(...s.players.map(x => x.recognized))
			require(top - p.recognized >= C.FRANCHISE.gap, 'Only a shop 10 Recognized Profit behind the leader may charter')
			money(s, seat, -C.FRANCHISE.cost, true)
			p.franchise = true
			log(s, seat, 'franchise', {})
			return false
		},
		expose(s, seat, a) {
			require(a.seat !== seat && s.players[a.seat], 'Expose a rival')
			venue(s, a.venue)
			const target = player(s, a.seat)
			require((s.lastStreet.salesByVenue[a.venue] || []).includes(a.seat), 'They did not sell there last High Street')
			const flag = 'expose:' + a.venue
			require(!target.usedOnce[flag], 'Already exposed at that venue this Year')
			spendHype(s, seat, 1)
			target.usedOnce[flag] = true
			const hit = target.sales.some(x => x.venue === a.venue && x.overTolerance)
			if (hit) warn(s, a.seat, 'expose')
			log(s, seat, 'expose', { seat: a.seat, venue: a.venue, hit })
			return false
		},
		backedFutures(s, seat, a) {
			const p = player(s, seat)
			const pot = potion(p, a.potionId)
			require(!pot.backedFutures, 'That potion is already backed')
			require(p.hand.includes('backedFutures'), 'You hold no Backed Futures card')
			require(availableHype(p) >= 2, 'Not enough Hype to lock')
			playPaper(s, seat, 'backedFutures')
			p.lockedHype += 2
			pot.backedFutures = true
			log(s, seat, 'backedFutures', {})
			return false
		},
		bribeScare(s, seat, a) {
			require(player(s, seat).hand.includes('bribe'), 'You hold no Bribe card')
			retarget(s, a.venue)
			money(s, seat, -2, true)
			playPaper(s, seat, 'bribe')
			log(s, seat, 'bribe', { venue: a.venue })
			return false
		},
		pamphlet(s, seat, a) {
			require(a.mode === 'retarget' || a.mode === 'reliability', 'Unknown pamphlet')
			spendHype(s, seat, 2)
			if (a.mode === 'retarget') {
				retarget(s, a.venue)
			} else {
				require(a.seat !== seat && s.players[a.seat], 'Name a rival')
				s.players[a.seat].forcedReliability = true
			}
			log(s, seat, 'pamphlet', { mode: a.mode })
			return false
		},
		plantTestimonial(s, seat, a) {
			const market = s.decks.testimonialMarket
			require(market.includes(a.testiId), 'That Testimonial is not on the market')
			spendHype(s, seat, 3)
			market.splice(market.indexOf(a.testiId), 1)
			player(s, seat).testimonials.push(a.testiId)
			while (market.length < 3) {
				const next = draw(s, 'testimonial', null, shuffle)
				if (next === null) break
				market.push(next)
			}
			log(s, seat, 'testimonial', { testimonial: a.testiId })
			return false
		},
		demonstration(s, seat, a) {
			const v = venue(s, a.venue)
			require(!v.customer, 'That venue already has a customer')
			spendHype(s, seat, 4)
			deal(s, v, false)
			applyMoods(s)
			log(s, seat, 'demonstration', { venue: a.venue })
			return false
		},
		inspection(s, seat, a) {
			require(a.seat !== seat && s.players[a.seat], 'Inspect a rival')
			inspectionNotice(s, seat, a.seat)
			return false
		},
	},
}
