import { defineStore } from "pinia"
import { computed, reactive } from "vue"
import * as water from "../js/URRwater.js"
import { advanceWaterForecast, chooseWaterForecast, createWaterForecast, waterForecastDecider } from "../js/URRwaterForecast.js"

export const useWaterForecastStore = defineStore("waterForecast", () => {
	const state = reactive({ visible: false, game: null, player: -1, steps: [], choices: [], frame: null, decider: null, finished: false, error: "", wet: [], outflow: 0 })
	let session = null
	const frame = computed(() => state.frame)
	const decider = computed(() => state.decider)
	const ownDecision = computed(() => state.decider !== null && state.decider === state.player)
	const currentStep = computed(() => state.steps.at(-1) ?? null)
	function sync() {
		state.steps = session.recorder.steps.slice()
		state.finished = session.finished
		state.choices = session.finished ? [] : water.waterChoices(session.game)
		const frame = water.currentWaterFrame(session.game)
		state.frame = frame ? { area: frame.area, water: frame.water } : null
		state.decider = waterForecastDecider(session.game)
		state.wet = session.game.board.areas.filter((area) => area.irrigatedBy !== null).map((area) => area.id)
		state.outflow = session.game.rain.routing?.outflow ?? 0
		state.error = ""
	}
	function start(sourceGame, player) {
		stop()
		const next = createWaterForecast(sourceGame)
		session = next
		state.game = next.game
		state.player = player
		sync()
		state.visible = true
	}
	function choose(area, amount) {
		if (!session || state.finished) return
		try {
			chooseWaterForecast(session, area, amount)
			sync()
		} catch (error) { state.error = error.message }
	}
	function advance() {
		if (!session || state.finished) return
		try {
			advanceWaterForecast(session)
			sync()
		} catch (error) { state.error = error.message }
	}
	function stop() {
		session = null
		Object.assign(state, { visible: false, game: null, player: -1, steps: [], choices: [], frame: null, decider: null, finished: false, error: "", wet: [], outflow: 0 })
	}
	return { state, frame, decider, ownDecision, currentStep, start, choose, advance, stop }
})
