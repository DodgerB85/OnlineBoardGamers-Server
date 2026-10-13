import { defineStore } from "pinia"
import { computed, reactive } from "vue"
import { buildWaterPlayback } from "../js/URRwaterPlayback.js"

export const useWaterPlaybackStore = defineStore("waterPlayback", () => {
	const state = reactive({ visible: false, board: null, steps: [], index: 0, advancing: false })
	const current = computed(() => state.steps[state.index] ?? null)
	const atEnd = computed(() => state.index >= state.steps.length - 1)
	function start(history, index, advancing) {
		const script = buildWaterPlayback(history, index)
		Object.assign(state, script, { visible: true, index: 0, advancing })
	}
	function next() {
		if (!atEnd.value) state.index++
		else state.advancing = false
	}
	function stop() { Object.assign(state, { visible: false, board: null, steps: [], index: 0, advancing: false }) }
	return { state, current, atEnd, start, next, stop }
})
