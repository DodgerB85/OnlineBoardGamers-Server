// Rulebook §5 The High Street, §8 sale-time Poison rules, Itinerant Franchise sale effects. See ENGINE_SPEC.md R1, R5, R6, R9, R11, R12, R44, R48-R53.
import { CUSTOMERS, OVER_TOLERANCE, FRANCHISE, TESTIMONIALS, UNDERCUT_BONUS } from './cards.js'
import { founderCutFor } from './civic.js'
import { resetSalesForNewStreet } from './post.js'
import { require, log, money, gainHype, spendHype, availableHype, changeRep, warn, kettleCapacity, potion, removePotion, releaseBackedFutures, potionPreference, qualifyingPotions, venue, venueInfo } from './state.js'

const prefMatch = (pot, cust) => !cust.preference || potionPreference(pot) === cust.preference

const potencyAt = (s, pot, venueId) => pot.potency * (pot.disp === 'bansheesBlessing' && venue(s, venueId).mood === 'panicked' ? 2 : 1)

const magnetAt = (p, venueId) => p.testimonials.some(t => TESTIMONIALS[t].effect.type === 'demandMagnet' && TESTIMONIALS[t].effect.venue === venueId)

// T10 (once per Year, R44) lets a potion ignore Wants at a venue; the Tier still applies (R12).
function qualifying(s, seat, venueId, useT10) {
	const p = s.players[seat]
	require(!useT10 || (p.testimonials.includes('T10') && p.usedOnce.t10 !== s.year), 'T10 is not available')
	return qualifyingPotions(s, seat, venueId, { ignoreWants: !!useT10 })
}

function dropPotion(p, pot) {
	releaseBackedFutures(p, pot)
	removePotion(p, pot.id)
}

// One realised sale. kind: solo | exchange | extra | reoffer | desperate. The caller decides the price.
export function completeSale(s, seat, venueId, potionId, price, { kind, undercut = false }) {
	const p = s.players[seat]
	const v = venue(s, venueId)
	const info = venueInfo(venueId)
	const pot = potion(p, potionId)
	const cust = CUSTOMERS[v.customer]
	const panicked = v.mood === 'panicked'
	const over = pot.poison > info.tolerance
	const paid = kind === 'exchange' && magnetAt(p, venueId) ? info.anchor : price

	const baseProceeds = paid - info.overhead + (over ? OVER_TOLERANCE.unlicensed + OVER_TOLERANCE.poison : 0)
	const founderCutState = {
		...s,
		players: s.players.map((player, i) => i === seat ? { ...player, recognized: player.recognized + baseProceeds } : player),
	}
	const founderCut = v.founder === null ? 0 : founderCutFor(founderCutState, v.founder, venueId)
	let proceeds = baseProceeds
	if (p.franchise && kind !== 'desperate') proceeds += FRANCHISE.premium
	if (kind === 'exchange' && p.apparatus.includes('invoiceGuillotine')) proceeds += 1
	if (undercut) proceeds += UNDERCUT_BONUS.crowns
	money(s, seat, proceeds, true)
	if (over) p.levyOwed += OVER_TOLERANCE.levy
	if (panicked || over || p.forcedReliability || pot.disp === 'whistlingCork') {
		// Properly Licensed Doom passes every check; an over-tolerance sale forfeits the Preference safe harbor.
		const pass = pot.disp === 'properlyLicensedDoom' || (!over && prefMatch(pot, cust))
		if (!pass) warn(s, seat, 'reliability')
	}
	p.forcedReliability = false

	// Desperate units feed an already satisfied customer, so they add no satisfaction Hype (R48).
	if (kind !== 'desperate') gainHype(s, seat, panicked ? 2 : 1)
	if (v.boone) gainHype(s, seat, 1)
	// The Founder's Cut goes to the venue's Founder on every sale there, whoever sells (rulebook §7).
	if (v.founder !== null) gainHype(s, v.founder, founderCut)
	if (!p.recipes.includes(cust.reward)) p.recipes.push(cust.reward)
	p.sales.push({ venue: venueId, overTolerance: over, year: s.year })
	s.lastStreet.salesByVenue[venueId] = [...(s.lastStreet.salesByVenue[venueId] || []), seat]
	if (!(venueId in s.street.served)) s.street.served[venueId] = seat
	if (kind === 'extra' || kind === 'desperate') s.street.extraUsed[venueId] = true
	v.servedThisYear += 1
	if (pot.disp === 'gardenGradeAlarm') v.mood = 'panicked'
	dropPotion(p, pot)
	log(s, seat, 'sale', { venue: venueId, price: paid, kind })
}

// Reveal, score and settle one contested venue. Losers' potions go on the re-offer list.
function resolveExchange(s) {
	const ex = s.exchange
	const customer = CUSTOMERS[venue(s, ex.venue).customer]
	const admin = ex.commits[s.administered]
	const bids = Object.keys(ex.commits).map(Number).filter(seat => ex.commits[seat] !== 'pass').map(seat => {
		const c = ex.commits[seat]
		const p = s.players[seat]
		const pot = potion(p, c.potionId)
		// The administration edge only lands if the administered seat also committed here (R51).
		const edge = c.adminEdge && admin && admin !== 'pass' ? 1 : 0
		return {
			seat, c, edge,
			score: potencyAt(s, pot, ex.venue) + c.hype + (c.bribe ? 2 : 0) + edge - c.price,
			pref: prefMatch(pot, customer),
			t7: p.testimonials.includes('T7') && p.usedOnce.t7 !== s.year,
		}
	})
	if (bids.length === 0) return
	bids.sort((a, b) => b.score - a.score || b.t7 - a.t7 || b.pref - a.pref || a.c.price - b.c.price || s.order.indexOf(a.seat) - s.order.indexOf(b.seat) || s.players[b.seat].reputation - s.players[a.seat].reputation)
	const [win, ...rivals] = bids
	if (win.t7 && rivals.some(r => r.score === win.score)) s.players[win.seat].usedOnce.t7 = s.year
	for (const b of bids) {
		spendHype(s, b.seat, b.c.hype)
		s.players[b.seat].exchangesEntered = 1
		if (b.edge) money(s, b.seat, -1, false)
	}
	const undercut = rivals.length > 0 && rivals.every(r => r.c.price > win.c.price)
	completeSale(s, win.seat, ex.venue, win.c.potionId, win.c.price, { kind: 'exchange', undercut })
	if (undercut) {
		changeRep(s, win.seat, UNDERCUT_BONUS.rep)
		log(s, win.seat, 'undercut', { venue: ex.venue })
	}
	for (const r of rivals) s.street.losers.push({ seat: r.seat, venue: ex.venue, potionId: r.c.potionId })
	// Scores stay out of the log: potency encodes the hidden Poison count.
	log(s, null, 'exchange', { venue: ex.venue, winner: win.seat, bids: bids.map(b => ({ seat: b.seat, price: b.c.price, hype: b.c.hype })) })
}

// Opens the next contested venue with a seat still free to bid (rulebook §5: one contested exchange per Phase).
function startNextExchange(s) {
	const st = s.street
	s.exchange = null
	while (st.contested.length) {
		const id = st.contested.shift()
		const prompted = st.eligible[id].filter(seat => s.players[seat].exchangesEntered === 0 && qualifyingPotions(s, seat, id).length > 0)
		st.bidders[id] = prompted
		if (prompted.length === 0) continue
		s.exchange = { venue: id, eligible: prompted, commits: {} }
		for (const seat of prompted) s.queue.push({ step: 'street.commit', seat, data: { venue: id } })
		return
	}
}

function commitDone(s) {
	const ex = s.exchange
	if (Object.keys(ex.commits).length < ex.eligible.length) return
	resolveExchange(s)
	startNextExchange(s)
}

// Extra-volume prompts for the venue are dropped once one of them uses its slot (R6: Boone yields).
function dropSlotPrompts(s, venueId) {
	s.queue = [s.queue[0], ...s.queue.slice(1).filter(p => !(p.step === 'street.extraSale' && p.data.venue === venueId && p.data.slot === 'boone'))]
}

export const enter = {
	'street.solo': s => {
		// Last High Street's sales stayed visible for Expose through the Morning Post; a new Street starts clean.
		resetSalesForNewStreet(s)
		s.lastStreet = { salesByVenue: {} }
		const eligible = {}
		for (const v of s.venues) eligible[v.id] = s.order.filter(seat => qualifyingPotions(s, seat, v.id).length > 0)
		s.street = { eligible, served: {}, losers: [], extraUsed: {}, bidders: { ...eligible }, contested: [] }
		s.exchange = null
		for (const seat of s.order) s.queue.push({ step: 'street.solo', seat, data: {} })
	},

	'street.exchange': s => {
		const st = s.street
		st.contested = s.venues.map(v => v.id).filter(id => st.eligible[id].length >= 2 && st.served[id] === undefined)
		startNextExchange(s)
	},

	'street.extra': s => {
		const st = s.street
		for (const v of s.venues) {
			const seat = st.served[v.id]
			if (seat !== undefined && v.mood === 'desperate') s.queue.push({ step: 'street.extraSale', seat, data: { venue: v.id, slot: 'desperate' } })
		}
		for (const seat of s.order) if (s.players[seat].franchise) s.queue.push({ step: 'street.extraSale', seat, data: { slot: 'franchise' } })
		for (const v of s.venues) {
			const seller = st.served[v.id]
			if (seller === undefined || !v.boone) continue
			for (const seat of s.order) if (seat !== seller && st.eligible[v.id].includes(seat)) s.queue.push({ step: 'street.extraSale', seat, data: { venue: v.id, slot: 'boone' } })
		}
	},

	'street.reoffer': s => {
		const order = s.venues.map(v => v.id)
		// One entry per potion: a blocked potion can also lose an exchange later.
		const losers = [...new Map(s.street.losers.map(l => [l.potionId, l])).values()].filter(l => s.players[l.seat].potions.some(x => x.id === l.potionId))
		losers.sort((a, b) => order.indexOf(a.venue) - order.indexOf(b.venue))
		for (const l of losers) s.queue.push({ step: 'street.reoffer', seat: l.seat, data: { venue: l.venue, potionId: l.potionId } })
	},

	'street.end': s => {
		const st = s.street
		for (const v of s.venues) {
			const seller = st.served[v.id]
			v.sold = seller !== undefined
			v.unserved = seller === undefined
			if (v.unserved) {
				for (const seat of st.bidders[v.id] || []) {
					changeRep(s, seat, -1)
					log(s, seat, 'declined', { venue: v.id })
				}
			}
		}
		for (const p of s.players) for (const pot of p.potions) pot.fireWard = false
		s.yearFx.pitchBlocked = null
		s.exchange = null
	},
}

export const actions = {
	'street.solo': {
		soloSale(s, seat, a) {
			const p = s.players[seat]
			const st = s.street
			venue(s, a.venue)
			require(st.eligible[a.venue] && st.eligible[a.venue].length === 1 && st.eligible[a.venue][0] === seat, 'Only one shop can serve this customer; use a Pricing Exchange')
			require(st.served[a.venue] === undefined, 'This customer is already served')
			const pot = qualifying(s, seat, a.venue, a.useT10).find(x => x.id === a.potionId)
			require(pot, 'That potion does not meet the Wants or Tier here')
			// S13: the first sale attempt of the named rival is blocked; the potion may re-offer later (R53).
			if (s.yearFx.pitchBlocked === seat) {
				s.yearFx.pitchBlocked = null
				st.losers.push({ seat, venue: a.venue, potionId: pot.id })
				log(s, seat, 'pitchBlocked', { venue: a.venue })
				return false
			}
			if (a.useT10) p.usedOnce.t10 = s.year
			completeSale(s, seat, a.venue, pot.id, venueInfo(a.venue).anchor, { kind: 'solo' })
			return false
		},

		dump(s, seat, a) {
			const p = s.players[seat]
			const pot = potion(p, a.potionId)
			money(s, seat, p.testimonials.includes('T8') ? 2 : 1, true)
			changeRep(s, seat, -1)
			dropPotion(p, pot)
			log(s, seat, 'dump', {})
			return false
		},

		sabotage(s, seat, a) {
			const p = s.players[seat]
			const t = s.players[a.targetSeat]
			require(t && a.targetSeat !== seat, 'Pick a rival')
			require(p.hand.includes('sabotage'), 'You hold no Sabotage Order')
			const pot = potion(t, a.potionId)
			spendHype(s, seat, 2)
			p.hand.splice(p.hand.indexOf('sabotage'), 1)
			s.decks.paperDiscard.push('sabotage')
			if (pot.fireWard) {
				log(s, seat, 'sabotageWarded', { target: a.targetSeat })
				return false
			}
			if (pot.disp === 'whistlingCork') {
				// The Cork turns the Sabotage back on the saboteur's own strongest potion.
				const mine = [...p.potions].sort((x, y) => y.potency - x.potency)[0]
				if (mine) dropPotion(p, mine)
				log(s, seat, 'sabotageRedirected', { target: a.targetSeat })
				return false
			}
			dropPotion(t, pot)
			if (t.restitutionFrom?.includes(seat)) {
				t.restitutionFrom = t.restitutionFrom.filter(x => x !== seat)
				if (p.cash >= 2) money(s, seat, -2, true)
				else warn(s, seat, 'restitution')
			}
			log(s, seat, 'sabotage', { target: a.targetSeat })
			return false
		},

		// Fire-Ward: spend 2 Reputation to make one potion immune to Sabotage for this Phase.
		fireWard(s, seat, a) {
			const p = s.players[seat]
			const pot = potion(p, a.potionId)
			require(p.reputation >= 2, 'Fire-Ward costs 2 Reputation')
			require(!pot.fireWard, 'That potion is already warded')
			changeRep(s, seat, -2)
			pot.fireWard = true
			log(s, seat, 'fireWard', {})
			return false
		},

		done: () => true,
	},

	'street.commit': {
		commit(s, seat, a) {
			const ex = s.exchange
			const p = s.players[seat]
			const info = venueInfo(ex.venue)
			const pot = qualifying(s, seat, ex.venue, a.useT10).find(x => x.id === a.potionId)
			require(pot, 'That potion does not meet the Wants or Tier here')
			require(Number.isInteger(a.price) && a.price >= 1 && a.price <= info.anchor, 'Price must be a whole number from 1 to the Anchor')
			require(Number.isInteger(a.hype) && a.hype >= 0 && a.hype <= availableHype(p), 'Not enough Hype to bid')
			require(!a.bribe || (p.hand.includes('bribe') && p.cash >= 2), 'A Bribe needs a Bribe card and 2 Crowns')
			require(!a.adminEdge || (s.administered !== null && s.administered !== seat && ex.eligible.includes(s.administered)), 'No administration edge to buy here')
			require(p.cash >= (a.bribe ? 2 : 0) + (a.adminEdge ? 1 : 0), 'Not enough Crowns for the Bribe and edge')
			if (a.useT10) p.usedOnce.t10 = s.year
			if (a.bribe) {
				p.hand.splice(p.hand.indexOf('bribe'), 1)
				s.decks.paperDiscard.push('bribe')
				money(s, seat, -2, true)
			}
			ex.commits[seat] = { potionId: pot.id, price: a.price, hype: a.hype, bribe: !!a.bribe, adminEdge: !!a.adminEdge }
			commitDone(s)
			return true
		},

		pass(s, seat) {
			s.exchange.commits[seat] = 'pass'
			commitDone(s)
			return true
		},
	},

	'street.extraSale': {
		sell(s, seat, a, prompt) {
			const p = s.players[seat]
			const st = s.street
			const { slot } = prompt.data
			const venueId = slot === 'franchise' ? a.venue : prompt.data.venue
			const v = venue(s, venueId)
			require(st.served[venueId] !== undefined, 'Nobody has bought here yet')
			if (slot === 'desperate') {
				require(st.served[venueId] === seat && v.mood === 'desperate', 'Only the Desperate customer\'s seller may sell more')
				require(p.desperateVolume < kettleCapacity(p), 'Kettle capacity reached this Phase')
			} else {
				require(!st.extraUsed[venueId], 'This venue already has its extra customer')
				require(slot !== 'franchise' || p.franchise, 'Only the franchise holder has a second till')
				require(slot !== 'boone' || (v.boone && seat !== st.served[venueId]), 'The Civic Boone slot is not yours')
			}
			const pot = qualifyingPotions(s, seat, venueId).find(x => x.id === a.potionId)
			require(pot, 'That potion does not meet the Wants or Tier here')
			completeSale(s, seat, venueId, pot.id, venueInfo(venueId).anchor, { kind: slot === 'desperate' ? 'desperate' : 'extra' })
			dropSlotPrompts(s, venueId)
			if (slot !== 'desperate') return true
			p.desperateVolume += 1
			return p.desperateVolume >= kettleCapacity(p)
		},

		pass: () => true,
	},

	'street.reoffer': {
		reoffer(s, seat, a, prompt) {
			const { venue: from, potionId } = prompt.data
			require(a.potionId === potionId && a.venue !== from, 'Re-offer the same potion to a different venue')
			venue(s, a.venue)
			require(s.street.served[a.venue] === undefined, 'That customer is already served')
			const pot = qualifyingPotions(s, seat, a.venue).find(x => x.id === potionId)
			require(pot, 'That potion does not meet the Wants or Tier there')
			completeSale(s, seat, a.venue, potionId, venueInfo(a.venue).anchor, { kind: 'reoffer' })
			return true
		},

		pass: () => true,
	},
}
