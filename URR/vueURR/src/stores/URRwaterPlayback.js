import { defineStore } from "pinia"
import { computed, reactive } from "vue"
import { buildWaterPlayback } from "../js/URRwaterPlayback.js"

export const useWaterPlaybackStore = defineStore("waterPlayback", () => {
	const state = reactive({ visible: false, board: null, steps: [], index: 0, advancing: false, showIrrigated: false })
	const current = computed(() => state.steps[state.index] ?? null)
	const atEnd = computed(() => state.index >= state.steps.length - 1)
	const isIrrigationPreview = computed(() => state.showIrrigated && atEnd.value && !state.advancing)
	function start(history, index, advancing) {
		const script = buildWaterPlayback(history, index)
		Object.assign(state, script, { visible: true, index: 0, advancing, showIrrigated: false })
	}
	function next() {
		if (!atEnd.value) state.index++
		else state.advancing = false
	}
	function stop() { Object.assign(state, { visible: false, board: null, steps: [], index: 0, advancing: false, showIrrigated: false }) }
	return { state, current, atEnd, isIrrigationPreview, start, next, stop }
})
