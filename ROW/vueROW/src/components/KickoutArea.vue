<script setup>
/**
 * Kickout vote panel, modelled on vueFCM's ActionArea kickout flow (the more
 * robust reference): a timed-out player is voted out once a majority of the
 * remaining players agree, or immediately in a 2-player game / with a 2-day-old
 * solo vote.
 */
import { computed, onUnmounted, ref, watch } from "vue"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

const confirming = ref(false)
const submitting = ref(false)
const now = ref(Date.now())
let timer

const target = computed(() => store.game?.currentPlayer ?? "")
const myVote = computed(() => (personal.pov >= 0 ? store.kickoutVotesData?.[personal.name] : null))
const voters = computed(() =>
	Object.entries(store.kickoutVotesData ?? {})
		.filter(([voter, vote]) => voter !== target.value && vote?.[0] === target.value)
		.map(([voter]) => voter)
)
const soloRemaining = computed(() => {
	if (!myVote.value || myVote.value[0] !== target.value) return 0
	return Math.max(0, Math.ceil((myVote.value[1] + rf.KICKOUT_SOLO_DELAY_MS - now.value) / 1000))
})
const canKickoutNow = computed(() => store.kickoutVoteThreshold <= 1 || soloRemaining.value === 0)
const isLastVote = computed(() => !myVote.value && voters.value.length + 1 >= store.kickoutVoteThreshold)

const visible = computed(
	() =>
		personal.kickoutRequired > 0 &&
		personal.pov >= 0 &&
		!personal.trainingGame &&
		!!store.game &&
		!store.game.isEnded() &&
		!controller.canAct() &&
		target.value !== "" &&
		!store.missingPlayers.includes(personal.name) &&
		!store.missingPlayers.includes(target.value)
)

function duration(seconds) {
	return `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}
function cancel() {
	personal.kickoutRequired = 0
	confirming.value = false
}
async function vote() {
	if (!canKickoutNow.value && !isLastVote.value) {
		submitting.value = true
		try {
			await controller.kickoutPlayer(target.value)
		} finally {
			submitting.value = false
		}
		return
	}
	confirming.value = true
}
async function confirmKickout() {
	submitting.value = true
	try {
		await controller.kickoutPlayer(target.value)
		confirming.value = false
	} finally {
		submitting.value = false
	}
}

watch(() => [personal.latestUpdate, personal.kickoutRequired, target.value], () => (confirming.value = false))
timer = setInterval(() => (now.value = Date.now()), 1000)
onUnmounted(() => clearInterval(timer))
</script>

<template>
	<div v-if="visible" id="kickoutArea">
		<template v-if="confirming">
			<div>This will permanently remove <b>{{ target }}</b> from the game. <b>It cannot be undone.</b></div>
			<div>Check the chat in case they gave a reason for their absence; consider a short grace period.</div>
			<button class="ko" :disabled="submitting" @click="confirmKickout">Permanently kick out {{ target }}</button>
			<button class="ko" :disabled="submitting" @click="confirming = false">Back</button>
		</template>
		<template v-else-if="personal.kickoutRequired === 1">
			<div>Player <b>{{ target }}</b> has used all the standard kickout time.</div>
			<div>Remaining flex-time: {{ duration(Math.max(0, personal.secondsToNextKickout)) }}</div>
			<button class="ko" @click="cancel">Not now - allow more time</button>
		</template>
		<template v-else>
			<div>Player <b>{{ target }}</b> has timed out.</div>
			<template v-if="canKickoutNow || isLastVote">
				<div>Votes: {{ voters.length }}/{{ store.kickoutVoteThreshold }} ({{ voters.join(", ") || "none" }})</div>
				<button class="ko" :disabled="submitting" @click="vote">Confirm kickout</button>
			</template>
			<template v-else>
				<div>Votes: {{ voters.length }}/{{ store.kickoutVoteThreshold }} ({{ voters.join(", ") || "none" }})</div>
				<div v-if="myVote">You have voted to kick out <b>{{ target }}</b>. You can kick them out directly in {{ duration(soloRemaining) }} if others do not also vote.</div>
				<button v-else class="ko" :disabled="submitting" @click="vote">Vote to kick out {{ target }}</button>
			</template>
			<button class="ko" @click="cancel">Not now - allow more time</button>
		</template>
	</div>
</template>

<style scoped>
#kickoutArea {
	margin: 8px auto;
	max-width: 640px;
	background: #fff0d6;
	border: 2px solid #cc7a00;
	border-radius: 6px;
	padding: 8px 10px;
	font-size: 13px;
}
#kickoutArea div { margin-bottom: 4px; }
.ko { margin: 3px; padding: 3px 8px; cursor: pointer; font-size: 12px; }
</style>
