// Rulebook §1 Setup.
import * as C from './cards.js'
import { require, log, player } from './state.js'

export function initialise(s, shuffle) {
	const n = s.players.length
	const overflow = C.MARKET_SIZE[n] - C.VENUES.length
	s.venues = [...C.VENUES, ...C.OVERFLOW_VENUES.slice(0, overflow)].map(v => ({
		id: v.id, customer: null, mood: 'calm', servedThisYear: 0, unserved: false,
		boone: false, founder: null, standingSince: 1, overflow: v.overflow,
	}))
	const paper = []
	for (const p of Object.values(C.PAPERWORK)) for (let i = 0; i < p.count; i++) paper.push(p.id)
	s.decks = {
		customer: shuffle(s, Object.keys(C.CUSTOMERS)), customerDiscard: [],
		paper: shuffle(s, paper.filter(id => !C.PAPERWORK[id].sideDeck)), paperDiscard: [],
		side: shuffle(s, paper.filter(id => C.PAPERWORK[id].sideDeck)),
		scare: shuffle(s, [...C.SCARE_IDS]), scareDiscard: [],
		testimonial: shuffle(s, [...C.TESTIMONIAL_IDS]), testimonialMarket: [],
		charter: shuffle(s, [...C.CHARTER_IDS]),
		dispensations: [...C.DISPENSATION_IDS], apparatus: [...C.APPARATUS_IDS],
		marketRecipes: [...C.MARKET_RECIPES],
	}
	s.decks.testimonialMarket = s.decks.testimonial.splice(0, 3)
	for (const p of s.players) p.hand = s.decks.paper.splice(0, C.START_HAND)
	for (let i = 0; i < 3; i++) openCharter(s, s.decks.charter.shift())
	// Customers are dealt face down now and revealed at the Year 1 Morning Post.
	for (const v of s.venues) v.customer = dealFor(s, v, shuffle)
	s.queue = s.players.map(p => ({ step: 'setup.recipes', seat: p.seat }))
}

export function openCharter(s, charterId) {
	s.council.open.push({ charterId, progress: 0, contributedBy: [], venue: C.CHARTERS[charterId].venue })
}

// Overflow stalls always take a cheap Workhouse or Golem Pound customer (rulebook §1 Market size).
export function dealFor(s, v, shuffle) {
	if (!v.overflow) return drawCustomer(s, shuffle)
	const idx = s.decks.customer.findIndex(id => ['workhouse', 'golem'].includes(C.CUSTOMERS[id].venue))
	if (idx === -1) return drawCustomer(s, shuffle)
	return s.decks.customer.splice(idx, 1)[0]
}

export function drawCustomer(s, shuffle) {
	if (s.decks.customer.length === 0) {
		s.decks.customer = shuffle(s, s.decks.customerDiscard)
		s.decks.customerDiscard = []
	}
	return s.decks.customer.shift() ?? null
}

export function finish(s, shuffle) {
	// §1.5: re-deal customers whose Wants name a recipe nobody chose.
	const chosen = new Set(s.players.flatMap(p => p.recipes))
	for (const v of s.venues) {
		for (let tries = 0; tries < 30 && v.customer && !openingQualifies(v.customer, chosen); tries++) {
			s.decks.customerDiscard.push(v.customer)
			v.customer = dealFor(s, v, shuffle)
		}
		v.mood = C.CUSTOMERS[v.customer].mood
	}
	// §1.6: one Apprentice each; the rest of the staff waits unemployed in the Ledger.
	for (const p of s.players) {
		p.staff.push({ id: 's' + p.seat + '_1', rank: 'apprentice', hiredYear: 0, tile: null, everWorked: false })
		p.everEmployed = 1
	}
	s.year = 1
	s.order = s.players.map(p => p.seat)
	s.first = s.order[0]
	log(s, null, 'yearStart', { year: 1 })
}

function openingQualifies(customerId, chosen) {
	const w = C.CUSTOMERS[customerId].wants
	return w.type !== 'recipes' || w.ids.some(id => chosen.has(id))
}

export const actions = {
	'setup.recipes': {
		chooseRecipes(s, seat, a) {
			require(Array.isArray(a.recipes) && a.recipes.length === 2 && a.recipes[0] !== a.recipes[1], 'Choose 2 different House Specials')
			for (const id of a.recipes) {
				require(C.HOUSE_SPECIALS.includes(id), 'Not a House Special')
				require(s.players.filter(p => p.recipes.includes(id)).length < 2, 'Two players already chose that recipe')
			}
			player(s, seat).recipes = [...a.recipes]
			log(s, seat, 'choseRecipes', { recipes: a.recipes })
			return true
		},
	},
}
