import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { experimentalEngine, variants } from './engine.mjs'
import { candidates, play } from './run.mjs'

test('the saved candidate game reproduces its public log and final result', async () => {
	const saved = JSON.parse(await readFile(new URL('./example-replay.json', import.meta.url), 'utf8'))
	const engine = await experimentalEngine(saved.variant)
	try {
		let state = engine.createGame(saved.seed, saved.names)
		state.options.experiment = saved.variant
		for (const { seat, a } of saved.actions) state = engine.applyAction(state, seat, a)
		assert.deepEqual(state.log, saved.expectedLog)
		// Saved JSON normalizes JavaScript's negative zero in the Warning score.
		assert.deepEqual(JSON.parse(JSON.stringify(state.result)), saved.expectedResult)
	} finally { await engine.close() }
})

for (const variant of variants) test(`${variant}: complete games conserve production and replay exactly`, async () => {
	const engine = await experimentalEngine(variant)
	try {
		for (const n of [2, 4, 5]) {
			const { state, actions, names } = play(engine, variant, 42, n)
			let replayed = engine.createGame(42, names)
			replayed.options.experiment = variant
			for (const { seat, a } of actions) replayed = engine.applyAction(replayed, seat, a)
			assert.deepEqual(replayed, state)
			for (const p of state.players) {
				const crafts = state.log.filter(e => e.seat === p.seat && e.key === 'craft').length
				const sales = state.log.filter(e => e.seat === p.seat && e.key === 'sale').length
				assert(sales + p.potions.length <= crafts)
				assert(p.cash >= 0)
				assert(Object.values(p.ingredients).every(n => n >= 0))
			}
			if (variant !== 'baseline') assert(state.log.some(e => e.key === 'craft' && e.y === 1))
			if (variant === 'licensedMarket') {
				assert(state.log.filter(e => e.key === 'payroll' && e.y === 1).every(e => e.args.bill === 0))
			}
		}
	} finally { await engine.close() }
})

test('recipe selection does not read face down customers', async () => {
	const engine = await experimentalEngine('baseline')
	try {
		const state = engine.createGame(42, ['Ann', 'Bob'])
		const before = candidates(engine, state, engine.currentPrompt(state), 'lean')
		for (const v of state.venues) v.customer = null
		assert.deepEqual(candidates(engine, state, engine.currentPrompt(state), 'lean'), before)
	} finally { await engine.close() }
})

test('batch brewing validates its size and rolls back an unaffordable second potion', async () => {
	const engine = await experimentalEngine('licensedMarket')
	try {
		let state = engine.createGame(42, ['Ann', 'Bob'])
		state.options.experiment = 'licensedMarket'
		while (engine.currentPrompt(state).step !== 'shift') {
			const q = engine.currentPrompt(state)
			const action = q.step === 'setup.recipes' ? { type: 'chooseRecipes', recipes: ['HS2', 'HS3'] } : { type: 'done' }
			state = engine.applyAction(state, q.seat, action)
		}
		const staffId = state.players[0].staff[0].id
		const batch = [{ recipe: 'HS2' }, { recipe: 'HS2' }]
		const before = structuredClone(state)
		assert.throws(() => engine.applyAction(state, 0, { type: 'assign', staffId, tile: 'kettle', choice: { batch } }), engine.PAPError)
		assert.deepEqual(state, before)
		state.players[0].ingredients.crystal = 6
		assert.throws(() => engine.applyAction(state, 0, { type: 'assign', staffId, tile: 'kettle', choice: { batch: [...batch, batch[0]] } }), engine.PAPError)
		const brewed = engine.applyAction(state, 0, { type: 'assign', staffId, tile: 'kettle', choice: { batch } })
		assert.equal(brewed.players[0].potions.length, 2)
		assert.equal(brewed.players[0].ingredients.crystal, 2)

		// A rented Nobles' permit costs three Crowns at Tier 1, on top of overhead.
		const customer = Object.values(engine.cards.CUSTOMERS).find(c => c.wants.type === 'any')
		const v = brewed.venues.find(v => v.id === 'nobles')
		v.customer = customer.id
		v.mood = 'calm'
		brewed.queue = [{ step: 'street.solo', seat: 0 }]
		brewed.street = { eligible: { nobles: [0] }, served: {}, extraUsed: {} }
		const cash = brewed.players[0].cash
		const profit = brewed.players[0].recognized
		const sold = engine.applyAction(brewed, 0, { type: 'soloSale', venue: 'nobles', potionId: brewed.players[0].potions[0].id })
		assert.equal(sold.players[0].cash - cash, 9 - 3 - 3)
		assert.equal(sold.players[0].recognized - profit, 9 - 3 - 3)
		assert.equal(sold.players[0].potions.length, 1)
	} finally { await engine.close() }
})

test('paying Condemnation settles its Warnings without manufacturing Reputation', async () => {
	const engine = await experimentalEngine('licensedMarket')
	try {
		const state = engine.createGame(42, ['Ann', 'Bob'])
		state.queue = [{ step: 'audit.condemn', seat: 0, data: { excess: 2 } }, { step: 'audit.paper', seat: 1 }]
		state.players[0].warnings = 2
		const paid = engine.applyAction(state, 0, { type: 'payCondemnation' })
		assert.equal(paid.players[0].warnings, 0)
		assert.equal(paid.players[0].cash, state.players[0].cash - 4)
		assert.equal(paid.players[0].reputation, 0)
	} finally { await engine.close() }
})
