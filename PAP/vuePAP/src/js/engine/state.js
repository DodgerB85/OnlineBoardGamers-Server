// Shared state helpers. Every rules module mutates a structuredClone handed to it by index.js,
// so throwing a PAPError mid-way never leaves a half-applied action behind.
import { HYPE_CAP, REP_MAX, KETTLE_CAPACITY, HAND_LIMIT, VENUES, OVERFLOW_VENUES, RECIPES, DISPENSATIONS, CUSTOMERS, PAPERWORK } from './cards.js'

export class PAPError extends Error {}

export function require(cond, msg) {
	if (!cond) throw new PAPError(msg)
}

export function log(s, seat, key, args = {}) {
	s.log.push({ y: s.year, seat, key, args })
}

export function player(s, seat) {
	return s.players[seat]
}

export function venue(s, id) {
	const v = s.venues.find(v => v.id === id)
	require(v, 'Unknown venue')
	return v
}

export function venueInfo(id) {
	return VENUES.find(v => v.id === id) || OVERFLOW_VENUES.find(v => v.id === id)
}

// Operating Crowns move Cash and Recognized Profit; capital Crowns move Cash only (rulebook §2).
export function money(s, seat, amount, operating) {
	const p = s.players[seat]
	require(p.cash + amount >= 0, 'Not enough Crowns')
	p.cash += amount
	if (operating) {
		p.recognized += amount
		p.yearEarned += amount
	}
}

export function availableHype(p) {
	return p.hype - p.lockedHype
}

export function gainHype(s, seat, n) {
	const p = s.players[seat]
	p.hype = Math.min(HYPE_CAP, p.hype + n)
}

export function spendHype(s, seat, n) {
	const p = s.players[seat]
	require(availableHype(p) >= n, 'Not enough Hype')
	p.hype -= n
}

export function changeRep(s, seat, n) {
	const p = s.players[seat]
	p.reputation = Math.max(0, Math.min(REP_MAX, p.reputation + n))
}

export function warn(s, seat, reason) {
	s.players[seat].warnings += 1
	changeRep(s, seat, -1)
	log(s, seat, 'warning', { reason })
}

export function cancelWarning(s, seat) {
	const p = s.players[seat]
	require(p.warnings > 0, 'No Warning to cancel')
	p.warnings -= 1
	changeRep(s, seat, 1)
}

export function kettleCapacity(p) {
	return KETTLE_CAPACITY[p.tier]
}

export function handLimit(p) {
	return HAND_LIMIT + (p.apparatus.includes('paperweightPlinth') ? 1 : 0)
}

export function potion(p, id) {
	const pot = p.potions.find(x => x.id === id)
	require(pot, 'Unknown potion')
	return pot
}

export function removePotion(p, id) {
	p.potions = p.potions.filter(x => x.id !== id)
}

// Backed Futures holds its Hype until the potion sells or spoils (rulebook §4). Sale code must call this too.
export function releaseBackedFutures(p, pot) {
	if (pot.backedFutures) {
		p.lockedHype -= PAPERWORK.backedFutures.cost.lockHype
		pot.backedFutures = false
	}
}

// First assignment of a staff piece to a tile; the worked-roster bonus compares workedCount with everEmployed.
export function markWorked(p, staff) {
	if (!staff.everWorked) {
		staff.everWorked = true
		p.workedCount = (p.workedCount || 0) + 1
	}
}

export function potionStars(pot) {
	return RECIPES[pot.recipe].stars
}

export function potionPreference(pot) {
	// Only preference-granting Dispensations and Full Moon Tax give a tag the customer can match.
	if (!pot.disp) return null
	return DISPENSATIONS[pot.disp].family === 'preference' || pot.disp === 'fullMoonTax' || pot.disp === 'properlyLicensedDoom' ? pot.disp : null
}

export function newId(s, prefix) {
	s.serial += 1
	return prefix + s.serial
}

// Seats sorted by cumulative Recognized Profit, lowest first; ties go to the later seat in turn order.
export function ascendingRecognized(s) {
	return [...s.order].sort((a, b) => s.players[a].recognized - s.players[b].recognized || s.order.indexOf(b) - s.order.indexOf(a))
}

export function recognizedLeader(s) {
	const max = Math.max(...s.players.map(p => p.recognized))
	const leaders = s.players.filter(p => p.recognized === max)
	return leaders.length === 1 ? leaders[0].seat : null
}

// Drawing from a deck that has run out reshuffles its discard pile (rulebook §3.4).
export function draw(s, deck, discard, shuffleFn) {
	if (s.decks[deck].length === 0 && discard && s.decks[discard].length > 0) {
		s.decks[deck] = shuffleFn(s, s.decks[discard])
		s.decks[discard] = []
	}
	return s.decks[deck].shift() ?? null
}


// Does this potion satisfy the customer's printed Wants? (Whistling Cork / T10 bypass is the caller's job.)
export function meetsWants(pot, customerId) {
	const w = CUSTOMERS[customerId].wants
	const r = RECIPES[pot.recipe]
	if (w.type === 'any') return true
	// ★ Wants are a potency bar (design doc §8.1, Appendix D): any potion at or above it qualifies, Poison and Dispensation potency included.
	if (w.type === 'stars') return pot.potency >= (w.min || w.exact)
	if (w.type === 'recipes') return w.ids.includes(pot.recipe)
	if (w.type === 'ingredient') return r.cost[w.kind] > 0
	return false
}

// A seat may offer at a venue when its Cauldron meets the Tier and some potion fits the Wants (rulebook §5).
export function qualifyingPotions(s, seat, venueId, { ignoreWants = false } = {}) {
	const v = venue(s, venueId)
	const p = s.players[seat]
	if (!v.customer || p.tier < venueInfo(venueId).tier) return []
	return p.potions.filter(pot => ignoreWants || pot.disp === 'whistlingCork' || meetsWants(pot, v.customer))
}
