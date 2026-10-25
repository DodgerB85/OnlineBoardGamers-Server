// Characterize the current opening before changing its rules; these are not balance targets.
import { describe, it, expect } from 'vitest'
import { createGame, applyAction, currentPrompt, replay, PAPError } from './index.js'

function opening() {
	let state = createGame(42, ['Ann', 'Bob'])
	const actions = []
	const play = a => {
		const seat = currentPrompt(state).seat
		state = applyAction(state, seat, a)
		actions.push({ seat, a })
	}
	// The other shop passes. No Paperwork mitigation or Council contributions are used.
	const shift = year => {
		for (let steps = 0; steps < 200; steps++) {
			const prompt = currentPrompt(state)
			if (state.year === year && prompt.step === 'shift' && prompt.seat === 0) return state
			expect(state.year).toBeLessThanOrEqual(year)
			const p = state.players[prompt.seat]
			switch (prompt.step) {
				case 'setup.recipes':
					play({ type: 'chooseRecipes', recipes: prompt.seat === 0 ? ['HS2', 'HS3'] : ['HS1', 'HS4'] })
					break
				case 'post.discard': play({ type: 'discard', card: p.hand[0] }); break
				case 'post.review':
				case 'post.pitch': play({ type: 'pass' }); break
				case 'audit.condemn': play({ type: 'payCondemnation' }); break
				default: play({ type: 'done' })
			}
		}
		throw new Error('Did not reach the requested Morning Shift')
	}
	const assign = (tile, choice, staffId = state.players[0].staff[0].id) => play({ type: 'assign', staffId, tile, choice })
	const nextShift = year => {
		play({ type: 'done' })
		return shift(year)
	}
	return { shift, nextShift, assign, actions }
}

describe('opening pacing under current rules', () => {
	it('needs separate gathering, promotion and crafting Years to brew its first potion', () => {
		const game = opening()
		let s = game.shift(1)
		expect(() => game.assign('kettle', { recipe: 'HS2' })).toThrow(PAPError)
		expect(() => game.assign('coop', { hire: 'apprentice' })).toThrow(PAPError)
		game.assign('crystalQuarry', { mode: 'two' })
		expect(() => game.assign('cauldronWorks', { promote: s.players[0].staff[0].id })).toThrow(PAPError)
		s = game.nextShift(2)
		game.assign('cauldronWorks', { promote: s.players[0].staff[0].id })
		expect(() => game.assign('kettle', { recipe: 'HS2' })).toThrow(PAPError)
		s = game.nextShift(3)
		expect(s.log.filter(e => e.key === 'craft')).toHaveLength(0)
		game.assign('kettle', { recipe: 'HS2' })
		s = replay(42, ['Ann', 'Bob'], {}, game.actions)
		expect(s.players[0].potions.map(p => p.madeYear)).toEqual([3])
		expect(s.players[0].ingredients.crystal).toBe(0)
	})

	it('cannot use its first additional worker until Year 5 along the direct expansion opening', () => {
		const game = opening()
		game.shift(1)
		game.assign('crystalQuarry', { mode: 'two' })
		let s = game.nextShift(2)
		game.assign('cauldronWorks', { promote: s.players[0].staff[0].id })
		game.nextShift(3)
		game.assign('cauldronWorks', { upgrade: true, pay: { crystal: 2 } })
		expect(() => game.assign('coop', { hire: 'apprentice' })).toThrow(PAPError)
		game.nextShift(4)
		game.assign('coop', { hire: 'apprentice' })
		s = replay(42, ['Ann', 'Bob'], {}, game.actions)
		const hire = s.players[0].staff.find(st => st.hiredYear === 4)
		expect(hire).toBeDefined()
		expect(() => game.assign('crystalQuarry', { mode: 'two' }, hire.id)).toThrow(PAPError)
		s = game.nextShift(5)
		game.assign('crystalQuarry', { mode: 'two' }, hire.id)
		s = replay(42, ['Ann', 'Bob'], {}, game.actions)
		expect(s.players[0].staff.find(st => st.id === hire.id).actedThisYear).toBe(true)
		expect(s.log.filter(e => e.key === 'craft')).toHaveLength(0)
	})

	it('applies Condemnation and Administration before either passive shop has brewed', () => {
		const game = opening()
		game.shift(1)
		game.nextShift(2)
		const s = game.nextShift(3)
		expect(s.log.filter(e => e.key === 'craft' || e.key === 'sale')).toHaveLength(0)
		expect(s.log).toContainEqual({ y: 2, seat: 0, key: 'condemnation', args: { choice: 'pay' } })
		expect(s.players[0].recognized).toBe(-2)
		expect(s.administered).toBe(1)
		expect(s.log).toContainEqual({ y: 2, seat: 1, key: 'warning', args: { reason: 'administration' } })
	})
})
