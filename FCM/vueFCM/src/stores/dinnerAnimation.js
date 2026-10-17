/**
 * Playback state for the dinner-time resolution animation.
 *
 * The actual animation beats are built by js/dinnerScript.js as a flat array
 * of step objects. This store just walks that array, either automatically
 * ("Animate") or one step at a time ("Step through").
 */

import { defineStore } from "pinia"
import { reactive, computed } from "vue"

export const useDinnerAnimationStore = defineStore("dinnerAnimation", () => {
	const state = reactive({
		visible: false,
		steps: [],
		// History-time demand tokens per house, hidden one by one as their sale takes over
		overlay: [],
		index: 0,
		advancing: false,
	})

	const total = computed(() => state.steps.length)
	const current = computed(() => state.steps[state.index] ?? null)
	const atEnd = computed(() => state.index >= state.steps.length - 1)

	function start(steps, advancing, overlay) {
		state.steps = Array.isArray(steps) ? steps : []
		state.overlay = Array.isArray(overlay) ? overlay : []
		state.index = 0
		state.advancing = !!advancing
		state.visible = state.steps.length > 0
	}

	// Returns false once there is nowhere left to advance (used to stop auto-play).
	function next() {
		if (state.index < state.steps.length - 1) {
			state.index++
			return true
		}
		return false
	}

	function prev() {
		if (state.index > 0) {
			state.index--
			return true
		}
		return false
	}

	// Jump straight to the first / last step (auto-play mode keeps running).
	function jumpStart() {
		state.index = 0
	}

	function jumpEnd() {
		state.index = Math.max(state.steps.length - 1, 0)
	}

	function tick() {
		if (!next()) state.advancing = false
	}

	function toggleAdvancing() {
		state.advancing = !state.advancing
	}

	function stop() {
		state.visible = false
		state.advancing = false
		state.steps = []
		state.overlay = []
		state.index = 0
	}

	return { state, total, current, atEnd, start, next, prev, jumpStart, jumpEnd, tick, toggleAdvancing, stop }
})