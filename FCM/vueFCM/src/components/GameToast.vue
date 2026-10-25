<script setup>
import { ref, watch } from "vue"
import i18n from "../i18n"
import * as rf from "../js/FCMreference"
import * as controller from "../js/FCMcontroller"
import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

const messages = ref([])
let nextId = 0

function show(text) {
	const id = nextId++
	messages.value.push({ id, text })
	setTimeout(() => {
		messages.value = messages.value.filter((message) => message.id !== id)
	}, 2600)
}

// Milestone toast: scan only entries added since the last update, so loading a
// game or a replay rebuild cannot replay old milestones.
let previousHistoryLength = 0
watch(
	() => store.history.length,
	(length) => {
		const from = previousHistoryLength
		previousHistoryLength = length
		if (personal.haltPlay || store.viewSettings.showReplay || store.viewSettings.generatingReplay) return
		if (length <= from || length - from > 20) return
		for (let i = length - 1; i >= from; i--) {
			const entry = store.history[i]
			if (entry[0] !== rf.HIST_NEW_MILESTONE) continue
			const milestone = entry[3]?.[0]
			const player = store.players[entry[1]]
			const label = rf.MILESTONES_STR[milestone]?.text
			if (player && label) show(i18n.global.t("history.newMilestone", { name: player.displayName }) + label)
			break
		}
	},
	{ immediate: true },
)

// Turn handoff: only during the sequential working day, and only when the
// active player actually changes (not on every history entry).
let previousCurrentPlayer = store.gameflow.turnOrder[0]
watch(
	() => [store.gameflow.phase, store.gameflow.turnOrder[0]],
	([phase, current]) => {
		const previous = previousCurrentPlayer
		previousCurrentPlayer = current
		if (previous === undefined || current === undefined || current === previous) return
		if (personal.haltPlay || phase !== rf.PHASE_WORKING_DAY || controller.isSimulPhase(phase)) return
		if (store.viewSettings.showReplay || store.viewSettings.generatingReplay) return
		const player = store.players[current]
		if (!player) return
		show(current === personal.pov ? i18n.global.t("actionArea.yourTurn") : i18n.global.t("actionArea.turnHandoff", { name: player.displayName }))
	},
)
</script>

<template>
	<div class="gameToastArea" aria-live="polite">
		<div v-for="message in messages" :key="message.id" class="gameToast" role="status">{{ message.text }}</div>
	</div>
</template>

<style scoped>
.gameToastArea {
	position: fixed;
	top: 128px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 4000;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	pointer-events: none;
}

.gameToast {
	background: rgba(0, 0, 0, 0.82);
	color: #fff;
	font-weight: bold;
	padding: 7px 16px;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
	animation: toastIn 0.25s ease-out;
}

@keyframes toastIn {
	from {
		opacity: 0;
		transform: translateY(-6px);
	}
}
</style>
