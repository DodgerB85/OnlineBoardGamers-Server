import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { importGameData, buildReplayFrames } from './PAPmodel.js'
import { useModelStore } from '../stores/PAPstore.js'
import { createGame } from './engine/index.js'

describe('PAP model replay compatibility', () => {
	it('replays cached games without rulesVersion under legacy Rally rules', () => {
		setActivePinia(createPinia())
		const names = ['P0', 'P1']
		const state = createGame(7, names)
		delete state.options.rulesVersion

		importGameData({ v: 1, seed: 7, options: {}, names, actions: [], state })

		const store = useModelStore()
		expect(store.options.rulesVersion).toBe(1)
		expect(store.game.options.rulesVersion).toBe(1)
		expect(buildReplayFrames()[0].options.rulesVersion).toBe(1)
	})
})
