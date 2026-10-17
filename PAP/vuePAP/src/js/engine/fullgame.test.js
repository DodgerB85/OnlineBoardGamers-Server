// Plays whole games with random legal moves: every prompt must be answerable and every game must end with a score.
import { describe, it, expect } from 'vitest'
import * as C from './cards.js'
import { createGame, applyAction, currentPrompt, replay, PAPError } from './index.js'

// Deterministic picker so a failure reproduces.
function picker(seed) {
	let x = seed
	return n => {
		x = (x * 1103515245 + 12345) % 2147483648
		return x % n
	}
}

const K = C.INGREDIENTS

// A few plausible candidates per step; illegal ones are filtered by the engine itself.
function candidates(s, prompt, pick) {
	const p = s.players[prompt.seat]
	const pots = p.potions
	const pot = pots.length ? pots[pick(pots.length)] : null
	const rival = (prompt.seat + 1 + pick(s.players.length - 1)) % s.players.length
	const anyK = () => K[pick(K.length)]
	switch (prompt.step) {
		case 'setup.recipes': {
			const hs = C.HOUSE_SPECIALS
			return hs.flatMap((a, i) => hs.slice(i + 1).map(b => ({ type: 'chooseRecipes', recipes: [a, b] })))
		}
		case 'post.review': return [{ type: 'callReview' }, { type: 'pass' }]
		case 'post.rally': return [{ type: 'rally' }, { type: 'pass' }]
		case 'post.council': {
			const idx = pick(Math.max(1, s.council.open.length))
			const c = s.council.open[idx]
			const t = c && C.CHARTERS[c.charterId].target
			const good = !t ? null : t.type === 'ingredient' ? t.kind : t.type === 'recipeClass' ? pot && pot.id : null
			return [{ type: 'contribute', charterIdx: idx, good }, { type: 'done' }]
		}
		case 'post.bylaw': return [{ type: 'vote', candidate: prompt.data.candidates[pick(prompt.data.candidates.length)] }]
		case 'admin.name': return [{ type: 'nameRival', seat: rival }]
		case 'admin.take': return K.map(kind => ({ type: 'takeIngredient', kind }))
		case 'post.pitch': return [{ type: 'poisonPitch', seat: rival }, { type: 'pass' }]
		case 'post.discard': return p.hand.map(card => ({ type: 'discard', card }))
		case 'post.choices': {
			const v = s.venues[pick(s.venues.length)].id
			return [
				{ type: 'done' }, { type: 'buyFranchise' }, { type: 'expose', seat: rival, venue: v }, { type: 'plantTestimonial', testiId: s.decks.testimonialMarket[0] },
				{ type: 'pamphlet', mode: 'reliability', seat: rival }, { type: 'inspection', seat: rival },
				pot && { type: 'backedFutures', potionId: pot.id }, { type: 'done' }, { type: 'done' }, { type: 'done' },
			]
		}
		case 'shift': {
			const free = p.staff.filter(st => !st.actedThisYear && st.hiredYear < s.year)
			if (!free.length) return [{ type: 'done' }]
			const st = free[pick(free.length)]
			const recipe = p.recipes[pick(p.recipes.length)]
			const r = C.RECIPES[recipe]
			const tiles = [
				{ tile: 'coop', choice: { kind: anyK() } }, { tile: 'coop', choice: { hire: 'apprentice' } },
				{ tile: 'mushroomCrown', choice: { mode: 'two' } }, { tile: 'crystalQuarry', choice: { mode: 'mixed', kind: anyK() } },
				{ tile: 'kettle', choice: { recipe, disp: null, poison: pick(2), poisonPay: [anyK()].slice(0, 0) } },
				{ tile: 'kettle', choice: { recipe, disp: null, poison: 0, poisonPay: [] } },
				{ tile: 'streetAlchemist', choice: { take: [anyK(), anyK()] } },
				{ tile: 'streetAlchemist', choice: { draft: 'recipe', id: C.MARKET_RECIPES[pick(C.MARKET_RECIPES.length)] } },
				{ tile: 'streetAlchemist', choice: { draft: 'disp', id: s.decks.dispensations[0] } },
				{ tile: 'cauldronWorks', choice: { promote: st.id } },
				{ tile: 'cauldronWorks', choice: { upgrade: true, pay: upgradePay(p) } },
			]
			void r
			const order = [5, 4, 10, 1, 9, 6, 2, 3, 0, 7, 8]
			return [...order.map(i => ({ type: 'assign', staffId: st.id, ...tiles[i] })), { type: 'done' }]
		}
		case 'street.solo': {
			const sales = pots.flatMap(x => s.venues.map(v => ({ type: 'soloSale', venue: v.id, potionId: x.id })))
			return [...sales, { type: 'done' }, pot && { type: 'dump', potionId: pot.id }]
		}
		case 'street.commit': {
			const anchor = C.VENUES.concat(C.OVERFLOW_VENUES).find(v => v.id === prompt.data.venue).anchor
			return [...pots.map(x => ({ type: 'commit', potionId: x.id, price: 1 + pick(anchor), hype: pick(2), bribe: false })), { type: 'pass' }]
		}
		case 'street.extraSale': return [...pots.map(x => ({ type: 'sell', potionId: x.id, venue: s.venues[pick(s.venues.length)].id })), { type: 'pass' }]
		case 'street.reoffer': return [...s.venues.map(v => ({ type: 'reoffer', venue: v.id, potionId: prompt.data.potionId })), { type: 'pass' }]
		case 'audit.paper': return [{ type: 'favor', mode: 'cancel' }, { type: 'done' }]
		case 'audit.condemn': {
			const j = p.staff.find(x => x.rank === 'journeyman')
			return [{ type: 'payCondemnation' }, j && { type: 'discardJourneyman', staffId: j.id }]
		}
		case 'audit.spoil': return [{ type: 'protect', potionIds: pots.slice(0, prompt.data.slots).map(x => x.id) }, { type: 'protect', potionIds: [] }]
		default: throw new Error('No candidates for step ' + prompt.step)
	}
}

function upgradePay(p) {
	const pay = { crystal: 0, toad: 0, quick: 0, banshee: 0 }
	const up = C.UPGRADES[p.tier + 1]
	if (!up) return pay
	let any = up.ingredients.any || 0
	for (const [k, n] of Object.entries(up.ingredients)) if (k !== 'any') pay[k] += n
	for (const k of K) {
		const spare = p.ingredients[k] - pay[k]
		const use = Math.min(Math.max(spare, 0), any)
		pay[k] += use
		any -= use
	}
	return pay
}

function playRandomGame(seed, n) {
	const names = ['Ann', 'Bob', 'Cid', 'Dee', 'Eve'].slice(0, n)
	const pick = picker(seed)
	let s = createGame(seed, names, {})
	const log = []
	for (let guard = 0; guard < 20000 && currentPrompt(s); guard++) {
		const prompt = currentPrompt(s)
		const options = candidates(s, prompt, pick).filter(Boolean)
		let moved = false
		// Try candidates from a random start; the first legal one is played.
		// Mostly play the first legal candidate (candidates list productive moves first), sometimes a random one.
		const start = pick(4) === 0 ? pick(options.length) : 0
		for (let i = 0; i < options.length && !moved; i++) {
			const a = options[(start + i) % options.length]
			try {
				s = applyAction(s, prompt.seat, a)
				log.push({ seat: prompt.seat, a })
				moved = true
			} catch (e) {
				if (!(e instanceof PAPError)) throw new Error(`Engine crash at ${prompt.step} (year ${s.year}) on ${JSON.stringify(a)}: ${e.stack}`)
			}
		}
		if (!moved) throw new Error(`Stuck at ${prompt.step} (year ${s.year}, seat ${prompt.seat}): no candidate was legal`)
	}
	return { s, log, names }
}

describe('full random games', () => {
	for (const n of [2, 3, 4, 5]) {
		for (const seed of [1, 7, 42]) {
			it(`${n} players, seed ${seed}: reaches a final score and replays identically`, () => {
				const { s, log, names } = playRandomGame(seed * 1000 + n, n)
				expect(s.phase).toBe('over')
				expect(s.year).toBe(7)
				expect(s.result.rows).toHaveLength(n)
				expect(s.result.finalPositions).toHaveLength(n)
				for (const p of s.players) {
					expect(p.cash).toBeGreaterThanOrEqual(0)
					expect(p.hype).toBeGreaterThanOrEqual(0)
					expect(p.hype).toBeLessThanOrEqual(C.HYPE_CAP)
					expect(p.reputation).toBeGreaterThanOrEqual(0)
					expect(p.potions.length).toBeLessThanOrEqual(6)
				}
				// The move log alone reproduces the game (this is what saves and replays rely on).
				expect(replay(seed * 1000 + n, names, {}, log)).toEqual(s)
			})
		}
	}
})
