// Pure hints over engine state, for the board and the prompt panel. No Vue, no store.
// Each rule mirrors the engine module named in its comment; PAPhints.test.js checks them against applyAction.
import { CUSTOMERS, INGREDIENTS, RECIPES, REP_MAX, SCARES, UPGRADES } from './engine/cards.js'
import { kettleCapacity, potion, potionPreference, qualifyingPotions, venue, venueInfo } from './engine/state.js'
import { finalScores } from './engine/audit.js'

// street.js completeSale: a sale passes Reliability on a matching Preference, and Properly Licensed Doom always passes.
const prefMatch = (pot, cust) => !cust.preference || potionPreference(pot) === cust.preference

// Seats that can offer at a venue now. `risks` reveals Poison: show it only for the viewer's own seat.
export function venueAccess(s, seat, venueId) {
	const potions = qualifyingPotions(s, seat, venueId).map(pot => ({ id: pot.id, risks: saleRisks(s, seat, pot.id, venueId) }))
	const eligibleSeats = s.order.filter(other => qualifyingPotions(s, other, venueId).length > 0)
	return { qualifies: potions.length > 0, eligibleSeats, contested: eligibleSeats.length >= 2, potions }
}

// street.js completeSale (over-tolerance, Reliability) and pitchBlocked. Only for the viewer's own potions.
export function saleRisks(s, seat, potionId, venueId) {
	const p = s.players[seat]
	const pot = potion(p, potionId)
	const v = venue(s, venueId)
	const cust = CUSTOMERS[v.customer]
	const pld = pot.disp === 'properlyLicensedDoom'
	const over = pot.poison > venueInfo(venueId).tolerance
	const risks = []
	if (over) risks.push({ kind: 'overTolerance', text: '+3 Crowns net but a 2-Crown Levy' + (pld ? '' : ' and a Warning') })
	else if ((v.mood === 'panicked' || p.forcedReliability || pot.disp === 'whistlingCork') && !pld && !prefMatch(pot, cust)) {
		risks.push({ kind: 'reliability', text: 'Reliability check fails: no matching Preference, so a Warning' })
	}
	if (s.yearFx.pitchBlocked === seat) risks.push({ kind: 'pitchBlocked', text: 'Scare S13: your first sale attempt this High Street is blocked' })
	return risks
}

// workshop.js craftPotion: Scare S14 adds one ingredient, Tier 2+ halves Quicksilver (rounded up). Ignores Dispensations and Poison.
export function craftable(s, seat) {
	const p = s.players[seat]
	const roomy = p.potions.length < kettleCapacity(p)
	const scare = s.yearFx.scare ? SCARES[s.yearFx.scare].effect : {}
	const out = {}
	for (const id of p.recipes) {
		const need = { ...RECIPES[id].cost }
		if (scare.type === 'craftExtraIngredient') need[INGREDIENTS.find(k => need[k] > 0)] += 1
		if (p.tier >= 2) need.quick = Math.ceil(need.quick / 2)
		const missing = {}
		for (const k of INGREDIENTS) if (p.ingredients[k] < need[k]) missing[k] = need[k] - p.ingredients[k]
		out[id] = { ok: roomy && Object.keys(missing).length === 0, missing }
	}
	return out
}

// audit.js condemn stage. Spec formula: T9 counts as one fewer Warning here. Engine note: its cancelWarning also restores 1 Reputation.
export function condemnRisk(s, seat) {
	const p = s.players[seat]
	const t9 = p.testimonials.includes('T9') && !p.usedOnce.t9 && p.warnings > 0
	// T9 cancels a Warning, and cancelling restores 1 Reputation (state.js cancelWarning), as audit.js applies it.
	const reputation = Math.min(REP_MAX, p.reputation + (t9 ? 1 : 0))
	const counted = p.warnings - (p.tier === 4 ? 1 : 0) - (t9 ? 1 : 0)
	return { warnings: p.warnings, counted, reputation, condemned: counted > reputation }
}

// The Audit warning in words, for a condemnRisk that is condemned: what counts, and what it costs to clear.
export function condemnText(r) {
	const excess = Math.max(0, r.counted - r.reputation)
	return `Warnings ${r.counted} > Reputation ${r.reputation}: at Audit pay ${2 * excess} Crowns or discard a Journeyman`
}

// audit.js spoil stage: protect slots, and potions that Backed Futures keeps for this Audit.
export function spoilRisk(s, seat) {
	const p = s.players[seat]
	const slots = (p.tier >= 2 ? 1 : 0) + (p.apparatus.includes('coldRoomRack') ? 1 : 0)
	const atRisk = p.potions.filter(pot => !(pot.backedFutures && !pot.backedAudits)).map(pot => pot.id)
	return { slots, atRisk }
}

// workshop.js cauldron upgrade. `missing` uses kind keys, plus `any` for the unspecified ingredients.
export function upgradeStatus(s, seat) {
	const p = s.players[seat]
	const up = UPGRADES[p.tier + 1]
	if (!up) return { nextTier: null, crowns: 0, ingredients: {}, affordable: false, missing: {} }
	const missing = {}
	let spare = 0
	for (const k of INGREDIENTS) {
		const need = up.ingredients[k] || 0
		if (p.ingredients[k] < need) missing[k] = need - p.ingredients[k]
		else spare += p.ingredients[k] - need
	}
	if (spare < (up.ingredients.any || 0)) missing.any = up.ingredients.any - spare
	const affordable = Object.keys(missing).length === 0 && p.cash >= up.crowns && !p.upgradedThisYear
	return { nextTier: p.tier + 1, crowns: up.crowns, ingredients: { ...up.ingredients }, affordable, missing }
}

// Recognized Profit earned this Year (rulebook §6.6 resets yearStartRecognized in the Audit).
export function yearEarned(s, seat) {
	return s.players[seat].recognized - s.players[seat].yearStartRecognized
}

// Victory Points if the game ended now: audit.js finalScores on a copy where each tier is the one held now (not the Year-7 tier).
export function projectedScore(s, seat) {
	const now = structuredClone(s)
	for (const p of now.players) p.tierAtY7Start = p.tier
	return finalScores(now).rows.find(r => r.seat === seat)
}

// The VP breakdown as one line for tooltips: "Recognized Profit /3 +4, Cauldron tier +2, ...".
const VP_LABEL = { profit: 'Recognized Profit / 3', tier: 'Cauldron tier', staff: 'worked roster', cash: 'Crowns / 8', warnings: 'Warnings', softer: 'softer ending' }
export function vpText(row) {
	const parts = Object.entries(row.breakdown).filter(([, n]) => n).map(([k, n]) => `${VP_LABEL[k]} ${n > 0 ? '+' : ''}${n}`)
	return parts.join(', ') || 'nothing yet'
}
