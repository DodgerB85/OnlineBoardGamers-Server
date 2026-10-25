import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { experimentalEngine, variants } from './engine.mjs'

// Heuristics, not competitive AI. Bots read their own private information only.
export function candidates(engine, s, prompt, style) {
	const C = engine.cards, H = engine.helpers
	const p = s.players[prompt.seat], pots = p.potions
	const growing = style === 'grow', toxic = style === 'poison'
	const available = H.availableHype(p)
	const venues = [...s.venues].sort((a, b) => H.venueInfo(b.id).anchor - H.venueInfo(a.id).anchor)
	const recipes = p.recipes.map(recipe => {
		const r = C.RECIPES[recipe]
		const pot = { recipe, disp: null, potency: r.stars }
		const buyers = venues.filter(v => (s.options.experiment === 'licensedMarket' || H.venueInfo(v.id).tier <= p.tier) && v.customer && H.meetsWants(pot, v.customer))
		const value = buyers.length ? Math.max(...buyers.map(v => H.venueInfo(v.id).anchor - H.venueInfo(v.id).overhead - (s.options.experiment === 'licensedMarket' ? Math.max(0, H.venueInfo(v.id).tier - p.tier) : 0))) : 0
		const cost = Object.fromEntries(C.INGREDIENTS.map(k => [k, k === 'quick' && p.tier >= 2 ? Math.ceil(r.cost[k] / 2) : r.cost[k]]))
		if (C.SCARES[s.yearFx.scare]?.effect.type === 'craftExtraIngredient') cost[C.INGREDIENTS.find(k => r.cost[k] > 0)]++
		const missing = C.INGREDIENTS.reduce((n, k) => n + Math.max(0, cost[k] - p.ingredients[k]), 0)
		return { recipe, cost, value, missing, score: value - Object.values(cost).reduce((a, b) => a + b, 0) * 0.5 - missing * 0.25 }
	}).sort((a, b) => b.score - a.score)
	const saleOptions = type => pots.flatMap(pot => venues.map(v => ({ type, venue: v.id, potionId: pot.id })))
	switch (prompt.step) {
		case 'setup.recipes': {
			// Opening customers are face down: recipe selection cannot consult them.
			const offset = (p.seat * 2 + ['lean', 'grow', 'poison', 'marketing'].indexOf(style)) % C.HOUSE_SPECIALS.length
			const hs = [...C.HOUSE_SPECIALS.slice(offset), ...C.HOUSE_SPECIALS.slice(0, offset)]
			return hs.flatMap((a, i) => hs.slice(i + 1).map(b => ({ type: 'chooseRecipes', recipes: [a, b] })))
		}
		case 'shift': {
			const options = []
			const free = p.staff.filter(st => !st.actedThisYear && st.hiredYear < s.year)
			const rank = st => C.RANKS.indexOf(st.rank)
			const target = recipes[0]
			const up = C.UPGRADES[p.tier + 1]
			const wantsUpgrade = growing && s.year >= 2 && s.year <= 4 && p.tier < 3 && p.cash >= up.crowns + p.staff.length + 3
			const pay = { crystal: 0, toad: 0, quick: 0, banshee: 0 }
			if (up) {
				for (const [k, n] of Object.entries(up.ingredients)) if (k !== 'any') pay[k] = n
				let any = up.ingredients.any || 0
				for (const k of C.INGREDIENTS) {
					const use = Math.min(any, Math.max(0, p.ingredients[k] - pay[k]))
					pay[k] += use
					any -= use
				}
			}
			for (const st of free.sort((a, b) => rank(a) - rank(b))) {
				const add = (tile, choice, score) => options.push({ type: 'assign', staffId: st.id, tile, choice, score })
				if (wantsUpgrade) add('cauldronWorks', { upgrade: true, pay }, 100)
				if (p.staff.length === 1 && st.rank === 'apprentice') add('cauldronWorks', { promote: st.id }, 95)
				const wantsHire = growing && s.year <= 4 && p.staff.length < (p.tier === 1 ? 3 : 4) && p.cash >= p.staff.length + 5
				if (wantsHire) add('coop', { hire: 'apprentice' }, st.rank === 'apprentice' ? 80 : 35)
				if (growing && p.tier >= 2 && p.staff.filter(x => x.rank === 'journeyman').length < 2 && s.year <= 5) {
					const apprentice = p.staff.find(x => x.rank === 'apprentice' && x.tile === null)
					if (apprentice) add('cauldronWorks', { promote: apprentice.id }, 70)
				}
				const craftable = recipes.filter(r => r.value > 0)
				for (const r of craftable) {
					const choice = { recipe: r.recipe }
					if (s.options.experiment.startsWith('redesign') || s.options.experiment === 'licensedMarket') {
						for (const second of craftable) add('kettle', { batch: [choice, { recipe: second.recipe }] }, 60 + r.score + second.score)
					}
					add('kettle', choice, 50 + r.score)
					if (toxic) {
						const poisonPay = C.INGREDIENTS.flatMap(k => Array(Math.max(0, p.ingredients[k] - r.cost[k])).fill(k)).slice(0, 2)
						add('kettle', { ...choice, poison: poisonPay.length, poisonPay }, 58 + r.score)
					}
				}
				const need = wantsUpgrade ? pay : target?.cost || { crystal: 2 }
				const deficits = C.INGREDIENTS.map(kind => ({ kind, n: Math.max(0, (need[kind] || 0) - p.ingredients[kind]) })).sort((a, b) => b.n - a.n)
				if (wantsUpgrade && up.ingredients.any && Object.values(pay).reduce((a, b) => a + b, 0) < up.ingredients.any) deficits[0] = { kind: 'crystal', n: 2 }
				for (const { kind, n } of deficits) {
					const score = (st.rank === 'apprentice' ? 45 : 10) + n * 2
					add('crystalQuarry', { mode: 'mixed', kind }, score + (kind === 'crystal' ? 1 : 0))
					add('mushroomCrown', { mode: 'mixed', kind }, score + (kind === 'toad' ? 1 : 0))
					add('coop', { kind }, score - 2)
				}
			}
			return [...options.sort((a, b) => b.score - a.score), { type: 'done' }]
		}
		case 'post.review': return [{ type: 'callReview' }, { type: 'pass' }]
		case 'post.rally': return [{ type: 'rally' }, { type: 'pass' }]
		case 'post.council': {
			const options = s.council.open.flatMap((c, charterIdx) => {
				const t = C.CHARTERS[c.charterId].target
				if (t.type === 'ingredient' && p.ingredients[t.kind] > 2) return [{ type: 'contribute', charterIdx, good: t.kind }]
				return []
			})
			return [...options, { type: 'done' }]
		}
		case 'post.bylaw': return prompt.data.candidates.map(candidate => ({ type: 'vote', candidate }))
		case 'post.discard': return p.hand.map(card => ({ type: 'discard', card })).sort((a, b) => Number(a.card === 'favor') - Number(b.card === 'favor'))
		case 'post.pitch': return [{ type: 'poisonPitch', seat: (p.seat + 1) % s.players.length }, { type: 'pass' }]
		case 'post.choices': return [{ type: 'buyFranchise' }, { type: 'done' }]
		case 'admin.name': return [{ type: 'nameRival', seat: (p.seat + 1) % s.players.length }]
		case 'admin.take': return C.INGREDIENTS.map(kind => ({ type: 'takeIngredient', kind }))
		case 'street.solo': {
			const sabotage = available >= 3 && p.hand.includes('sabotage') ? s.players.filter(r => r.seat !== p.seat).flatMap(r => r.potions.map(pot => ({ type: 'sabotage', targetSeat: r.seat, potionId: pot.id }))) : []
			return [...sabotage, ...saleOptions('soloSale'), { type: 'done' }]
		}
		case 'street.commit': {
			const info = H.venueInfo(prompt.data.venue)
			const discount = style === 'lean' ? 2 : 1
			return [...pots.map(pot => ({ type: 'commit', potionId: pot.id, price: Math.max(1, info.anchor - discount), hype: Math.min(available, style === 'marketing' ? 2 : 1) })), { type: 'pass' }]
		}
		case 'street.extraSale': return [...saleOptions('sell'), { type: 'pass' }]
		case 'street.reoffer': return [...venues.map(v => ({ type: 'reoffer', venue: v.id, potionId: prompt.data.potionId })), { type: 'pass' }]
		case 'audit.paper': return [...(p.warnings > 0 ? [{ type: 'favor', mode: 'cancel' }] : []), { type: 'done' }]
		case 'audit.condemn': return [{ type: 'payCondemnation' }, ...p.staff.filter(st => st.rank === 'journeyman').map(st => ({ type: 'discardJourneyman', staffId: st.id }))]
		case 'audit.spoil': return [{ type: 'protect', potionIds: pots.slice(0, prompt.data.slots).map(pot => pot.id) }]
		default: throw new Error('Unimplemented prompt: ' + prompt.step)
	}
}

export function play(engine, variant, seed, n = 4) {
	const styles = ['lean', 'grow', 'poison', 'marketing', 'grow']
	const names = Array.from({ length: n }, (_, seat) => styles[(seat + seed) % styles.length])
	let s = engine.createGame(seed, names)
	s.options.experiment = variant
	const actions = []
	for (let guard = 0; engine.currentPrompt(s) && guard < 5000; guard++) {
		const prompt = engine.currentPrompt(s)
		let moved = false
		for (const candidate of candidates(engine, s, prompt, names[prompt.seat])) {
			const { score, ...a } = candidate
			try {
				s = engine.applyAction(s, prompt.seat, a)
				actions.push({ seat: prompt.seat, a })
				moved = true
				break
			} catch (error) {
				if (!(error instanceof engine.PAPError)) throw error
			}
		}
		assert(moved, `No legal move at ${prompt.step}, seed ${seed}, ${variant}`)
	}
	assert.equal(s.phase, 'over')
	return { state: s, actions, names }
}

export async function run(count = 20, n = 4, seed0 = 0) {
	assert(Number.isInteger(count) && count > 0)
	assert(Number.isInteger(n) && n >= 2 && n <= 5)
	assert(Number.isInteger(seed0) && seed0 >= 0)
	const results = []
	for (const variant of variants) {
		const engine = await experimentalEngine(variant)
		try {
			const games = Array.from({ length: count }, (_, i) => play(engine, variant, seed0 + i, n))
			const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
			const yearly = key => Array.from({ length: 7 }, (_, i) => mean(games.map(({ state: s }) => s.log.filter(e => e.key === key && e.y <= i + 1).length / n)))
			const players = games.flatMap(g => g.state.players)
			const row = {
				variant, games: count, players: n, seed0,
				cumulativeCrafts: yearly('craft'), cumulativeSales: yearly('sale'),
				meanFinalProfit: mean(players.map(p => p.recognized)),
				meanFinalCash: mean(players.map(p => p.cash)),
				meanFinalStaff: mean(players.map(p => p.staff.length)),
				meanFinalTier: mean(players.map(p => p.tier)),
				contestedSalesPerGame: mean(games.map(g => g.state.log.filter(e => e.key === 'sale' && e.args.kind === 'exchange').length)),
				spoiledPerPlayer: mean(games.map(g => g.state.log.filter(e => e.key === 'spoiled').reduce((sum, e) => sum + e.args.count, 0) / n)),
				gamesReaching40: games.filter(g => g.state.players.some(p => p.recognized >= 40)).length,
				auditThreshold: engine.cards.CONTRIBUTION_THRESHOLD,
				gamesActivatingFinalAudit: games.filter(g => g.state.players.some(p => p.recognized >= engine.cards.CONTRIBUTION_THRESHOLD)).length,
				payrollShortfallGames: games.filter(g => g.state.log.some(e => e.key === 'payroll' && e.args.paid < e.args.bill)).length,
			}
			results.push(row)
			console.log(JSON.stringify(row))
		} finally { await engine.close() }
	}
	return results
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const results = await run(Number(process.argv[2] || 20), Number(process.argv[3] || 4), Number(process.argv[5] || 0))
	if (process.argv[4]) await writeFile(process.argv[4], JSON.stringify(results, null, 2) + '\n')
}
