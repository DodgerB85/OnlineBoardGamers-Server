import { defineStore } from "pinia"
import { computed, reactive } from "vue"
import { buildWaterPlayback, buildWaterPlanPlayback } from "../js/URRwaterPlayback.js"

export const useWaterPlaybackStore = defineStore("waterPlayback", () => {
	const state = reactive({ visible: false, board: null, displayBoard: null, steps: [], index: 0, advancing: false, showIrrigated: false })
	const current = computed(() => state.steps[state.index] ?? null)
	const atEnd = computed(() => state.index >= state.steps.length - 1)
	const isIrrigationPreview = computed(() => state.showIrrigated && atEnd.value && !state.advancing)
	function show(script, advancing) {
		Object.assign(state, script, { visible: true, displayBoard: null, index: 0, advancing, showIrrigated: false })
	}
	function start(history, snapshots, index, advancing, displayBoard = null) {
		const script = buildWaterPlayback(history, snapshots, index)
		show(script, advancing)
		if (displayBoard) state.displayBoard = JSON.parse(JSON.stringify(displayBoard))
	}
	function startPlan(game, actions, advancing = true) {
		show(buildWaterPlanPlayback(game, actions), advancing)
	}
	function next() {
		if (!atEnd.value) state.index++
		else state.advancing = false
	}
	function stop() { Object.assign(state, { visible: false, board: null, displayBoard: null, steps: [], index: 0, advancing: false, showIrrigated: false }) }
	return { state, current, atEnd, isIrrigationPreview, start, startPlan, next, stop }
})
