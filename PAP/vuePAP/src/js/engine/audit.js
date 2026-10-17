// Rulebook §6 The Audit, §10 Endgame, Paperwork Favor and Expediting Fee (§9). See ENGINE_SPEC.md R30-R35.
import * as C from './cards.js'
import { require, log, money, warn, cancelWarning, potion, releaseBackedFutures, ascendingRecognized } from './state.js'

const backedNow = pot => pot.backedFutures && !pot.backedAudits // survives this Audit without a Protect slot
const protectSlots = p => (p.tier >= 2 ? 1 : 0) + (p.apparatus.includes('coldRoomRack') ? 1 : 0)
const levyBill = (s, p) => Math.max(0, p.levyOwed * (s.yearFx.doubleLevies ? 2 : 1) - 2 * (p.skipLevy || 0))

// Move `seat` right before `before`, or to the end when `before` is omitted.
function moveSeat(order, seat, before) {
	order.splice(order.indexOf(seat), 1)
	order.splice(before === undefined ? order.length : order.indexOf(before), 0, seat)
}

function playFromHand(s, seat, id) {
	const p = s.players[seat]
	require(p.hand.includes(id), 'No such card in hand')
	p.hand.splice(p.hand.indexOf(id), 1)
	if (id === 'expedite') s.decks.side.push(id)
	else s.decks.paperDiscard.push(id)
}

// Operating outlay (§6.1). Pay what you have; each unpaid 2 Crowns is one Warning (R32).
export function settleLevies(s, seat) {
	const p = s.players[seat]
	const bill = levyBill(s, p)
	const paid = Math.min(bill, p.cash)
	if (paid) money(s, seat, -paid, true)
	for (let unpaid = bill - paid; unpaid > 0; unpaid -= 2) warn(s, seat, 'levy')
	if (bill) log(s, seat, 'levies', { paid })
	p.levyOwed = 0
	p.skipLevy = 0
}

// Unprotected unsold potions spoil; a Backed Futures potion survives its first Audit without a slot (R33).
function spoilSeat(s, seat, keep) {
	const p = s.players[seat]
	const kept = []
	let spoiled = 0
	for (const pot of p.potions) {
		if (backedNow(pot)) {
			pot.backedAudits = 1
			kept.push(pot)
		} else if (keep.includes(pot.id)) kept.push(pot)
		else {
			releaseBackedFutures(p, pot)
			spoiled += 1
		}
	}
	p.potions = kept
	if (spoiled) log(s, seat, 'spoiled', { count: spoiled })
}

export const enter = {
	'audit.paper': s => {
		s.auditOrder = [...s.order]
		for (const p of s.players) p.restitutionFrom = []
		s.queue.push(...s.order.map(seat => ({ step: 'audit.paper', seat, data: {} })))
	},

	'audit.condemn': s => {
		for (const seat of s.auditOrder) settleLevies(s, seat)
		for (const seat of s.order) {
			const p = s.players[seat]
			if (p.testimonials.includes('T9') && !p.usedOnce.t9 && p.warnings > 0) {
				cancelWarning(s, seat)
				p.usedOnce.t9 = true
			}
			const excess = Math.max(0, p.warnings - (p.tier === 4 ? 1 : 0) - p.reputation)
			if (!excess) continue
			log(s, seat, 'condemned', { excess })
			const canPay = p.cash >= 2 * excess
			const canDiscard = p.staff.some(st => st.rank === 'journeyman')
			if (canPay || canDiscard) s.queue.push({ step: 'audit.condemn', seat, data: { excess } })
			else money(s, seat, -p.cash, true) // R32: nothing else possible, the excess stays
		}
	},

	'audit.spoil': s => {
		for (const seat of s.order) {
			const p = s.players[seat]
			if (protectSlots(p) > 0 && p.potions.some(pot => !backedNow(pot))) s.queue.push({ step: 'audit.spoil', seat, data: { slots: protectSlots(p) } })
			else spoilSeat(s, seat, [])
		}
	},

	'audit.auto': s => {
		const n = s.players.length

		// Ruin check (§6.3) uses the Watch from the previous Audit.
		const w = s.watch === null ? null : s.players[s.watch]
		const ruined = w !== null && w.recognized <= C.CONTRIBUTION_THRESHOLD && w.recognized <= w.yearStartRecognized
		s.administered = ruined ? s.watch : null
		if (ruined) warn(s, s.watch, 'administration')

		// Recalibration (§6.4): net Recognized this Year; ties to fewer Warnings, then earlier in this Year's order (R10).
		const earned = seat => s.players[seat].recognized - s.players[seat].yearStartRecognized
		const [first] = s.order.filter(seat => seat !== s.administered).sort((a, b) => earned(b) - earned(a) || s.players[a].warnings - s.players[b].warnings || s.order.indexOf(a) - s.order.indexOf(b))
		s.first = first
		warn(s, first, 'firstPlayer')
		log(s, first, 'firstPlayer')

		// Watch (§6.5), before the turn order changes: lowest at or below the threshold, else lowest overall.
		const low = ascendingRecognized(s)
		s.watch = low.find(seat => s.players[seat].recognized <= C.CONTRIBUTION_THRESHOLD) ?? low[0]
		log(s, s.watch, 'watch')
		s.order = s.players.map((_, i) => (first + i) % n)

		// Clean up (§6.6). Year-7 tier VP is fixed here, so later upgrades score nothing (§10).
		for (const p of s.players) {
			p.usedOnce = {}
			p.upgradedThisYear = false
			p.franchise = false
			p.yearStartRecognized = p.recognized
			for (const st of p.staff) st.tile = null
		}
		if (s.year === 6) for (const p of s.players) p.tierAtY7Start = p.tier
		for (const v of s.venues) {
			v.boone = false
			v.founder = null
		}
		s.yearFx.doubleLevies = false

		if (s.year === C.YEARS) s.result = finalScores(s)
		else {
			s.year += 1
			log(s, null, 'yearStart', { year: s.year })
		}
	},
}

export const actions = {
	'audit.paper': {
		favor(s, seat, a) {
			require(s.players[seat].hand.includes('favor'), 'No Favor in hand')
			require(['cancel', 'order', 'restitution'].includes(a.mode), 'Unknown Favor mode')
			if (a.mode === 'cancel') cancelWarning(s, seat)
			else {
				require(a.seat !== seat && s.order.includes(a.seat), 'Pick a rival')
				if (a.mode === 'order') moveSeat(s.auditOrder, a.seat, seat)
				else s.players[seat].restitutionFrom.push(a.seat)
			}
			log(s, seat, 'favor', { mode: a.mode })
			playFromHand(s, seat, 'favor')
			return false
		},
		expedite(s, seat, a) {
			const p = s.players[seat]
			require(p.hand.includes('expedite'), 'No Expediting Fee in hand')
			require(['skipFee', 'last'].includes(a.mode), 'Unknown Expediting Fee mode')
			if (a.mode === 'skipFee') {
				require(levyBill(s, p) > 0, 'No fee to skip')
				p.skipLevy = (p.skipLevy || 0) + 1
			} else {
				require(a.seat !== seat && s.order.includes(a.seat), 'Pick a rival')
				moveSeat(s.auditOrder, a.seat)
			}
			money(s, seat, -1, true)
			log(s, seat, 'expedite', { mode: a.mode })
			playFromHand(s, seat, 'expedite')
			return false
		},
		done: () => true,
	},
	'audit.condemn': {
		payCondemnation(s, seat, _a, prompt) {
			money(s, seat, -2 * prompt.data.excess, true)
			log(s, seat, 'condemnation', { choice: 'pay' })
			return true
		},
		discardJourneyman(s, seat, a, prompt) {
			const p = s.players[seat]
			const i = p.staff.findIndex(st => st.id === a.staffId && st.rank === 'journeyman')
			require(i >= 0, 'Discard a Journeyman')
			p.staff.splice(i, 1)
			for (let k = 0; k < prompt.data.excess; k++) cancelWarning(s, seat)
			log(s, seat, 'condemnation', { choice: 'discard' })
			return true
		},
	},
	'audit.spoil': {
		protect(s, seat, a) {
			const p = s.players[seat]
			const slots = protectSlots(p)
			require(Array.isArray(a.potionIds) && a.potionIds.length <= slots && new Set(a.potionIds).size === a.potionIds.length, 'Protect up to ' + slots + ' different potions')
			for (const id of a.potionIds) require(!backedNow(potion(p, id)), 'Backed Futures already protects that potion')
			spoilSeat(s, seat, a.potionIds)
			return true
		},
	},
}

// Final Audit (§10). Below the threshold a shop is out, unless the softer ending keeps it for -10 VP (R35).
export function finalScores(s) {
	const leader = Math.max(...s.players.map(p => p.recognized))
	const elimination = leader >= C.CONTRIBUTION_THRESHOLD
	const rows = s.players.map(p => {
		const below = elimination && p.recognized < C.CONTRIBUTION_THRESHOLD
		const breakdown = {
			profit: Math.floor(p.recognized / 3),
			tier: C.TIER_VP[p.tierAtY7Start],
			staff: (p.workedCount || 0) === p.everEmployed ? 3 : 0,
			cash: Math.floor(p.cash / 8),
			warnings: -2 * p.warnings,
			softer: below && s.options.softerEnding ? -10 : 0,
		}
		const vp = Object.values(breakdown).reduce((a, b) => a + b, 0)
		return { seat: p.seat, name: p.name, breakdown, vp, eligible: !below || s.options.softerEnding }
	})
	const ranked = rows.slice().sort((a, b) => {
		const [pa, pb] = [s.players[a.seat], s.players[b.seat]]
		return (b.eligible - a.eligible) || (b.vp - a.vp) || (pb.recognized - pa.recognized) || (pb.cash - pa.cash) || (a.seat - b.seat)
	})
	return { rows, winner: ranked[0].seat, finalPositions: ranked.map(r => r.seat) }
}
