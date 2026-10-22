<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import TurnNudge from "./utils/TurnNudge.vue"
import * as IO from "../backend/URR_IO"
import * as rf from "../js/URRreference"
import * as view from "../js/URRview"
import * as controller from "../js/URRcontroller"
import { useModelStore } from "../stores/URRstore"
import { usePersonalStore } from "../stores/URRpersonal"

const store = useModelStore()
const personal = usePersonalStore()
const isDismissed = ref(false)
const isConfirming = ref(false)
const isSubmitting = ref(false)
const now = ref(Date.now())
let timer
const target = computed(() => controller.timedOutPlayerObj().name)
const voters = computed(() => Object.entries(store.kickoutVotesData).filter(([name, vote]) => name !== target.value && vote[0] === target.value).map(([name]) => name))
const myVote = computed(() => store.kickoutVotesData[personal.name]?.[0] === target.value ? store.kickoutVotesData[personal.name] : null)
const soloSeconds = computed(() => myVote.value ? Math.max(0, Math.ceil((myVote.value[1] + rf.KICKOUT_SOLO_DELAY_MS - now.value) / 1000)) : 0)
const canKickoutNow = computed(() => store.kickoutVoteThreshold <= 1 || (myVote.value && soloSeconds.value === 0))
const isLastVote = computed(() => !myVote.value && voters.value.length + 1 >= store.kickoutVoteThreshold)
const flexSeconds = computed(() => {
	const used = personal.kickoutFlexiData.find(entry => entry[0] === target.value)?.[1] || 0
	return Math.max(0, Math.ceil(86400 - used + personal.kickoutSecondsRemaining - (now.value - personal.kickoutTimerUpdatedAt) / 1000))
})
function duration(seconds) {
	return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}
async function submitKickout() {
	isSubmitting.value = true
	try {
		const result = await IO.kickout()
		if (result && !result.voteCast) isConfirming.value = false
	} finally {
		isSubmitting.value = false
	}
}
watch(() => [personal.latestUpdate, personal.kickoutRequired, target.value], () => {
	isDismissed.value = false
	isConfirming.value = false
})
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(timer))
</script>

<template>
	<div v-if="personal.kickoutRequired > 0 && personal.pov >= 0 && !store.players[personal.pov]?.isMissing && !controller.timedOutPlayerObj().isMissing && !personal.trainingGame && !personal.canPlay() && !store.viewSettings.showReplay && store.gameflow.phase !== rf.PHASE_GAME_OVER && !isDismissed" class="kickoutDialog">
		<template v-if="personal.kickoutRequired === 1">
			<p>{{ $t("kickout.player") }} <PlayerMarker :index="view.playerIndexByName(store, target)" /> {{ $t("kickout.usedStandardTime") }}</p>
			<p>{{ $t("kickout.remainingFlex", { time: duration(flexSeconds) }) }}</p>
			<p>{{ $t("kickout.forMoreInfo") }} <a href="/help/" target="_blank">{{ $t("kickout.help") }}</a>.</p>
		</template>
		<template v-else>
			<p>{{ $t("kickout.player") }} <PlayerMarker :index="view.playerIndexByName(store, target)" /> {{ $t("kickout.timedOut") }}</p>
			<template v-if="isConfirming">
				<p>{{ $t("kickout.willRemove") }} <PlayerMarker :index="view.playerIndexByName(store, target)" /> {{ $t("kickout.fromGame") }} <b>{{ $t("kickout.cannotBeUndone") }}</b></p>
				<p>{{ $t("kickout.checkChat") }}</p>
				<button type="button" class="actionsLineButton" :disabled="isSubmitting" @click="submitKickout">{{ $t("kickout.permanentlyKickout") }} <PlayerMarker :index="view.playerIndexByName(store, target)" /></button>
			</template>
			<button v-else-if="canKickoutNow || isLastVote" type="button" class="actionsLineButton" :disabled="isSubmitting" @click="isConfirming = true">{{ $t("kickout.confirmKickout") }}</button>
			<template v-else>
				<p>{{ $t("kickout.votes", { votes: voters.length, threshold: store.kickoutVoteThreshold }) }} (<PlayerMarker v-for="name in voters" :key="name" :index="view.playerIndexByName(store, name)" /><template v-if="!voters.length">{{ $t("common.none") }}</template>)</p>
				<p v-if="myVote">{{ $t("kickout.votedToKickout") }} <PlayerMarker :index="view.playerIndexByName(store, target)" />. {{ $t("kickout.canKickIn", { time: duration(soloSeconds) }) }}</p>
				<button v-else type="button" class="actionsLineButton" :disabled="isSubmitting" @click="submitKickout">{{ $t("kickout.voteToKickout") }} <PlayerMarker :index="view.playerIndexByName(store, target)" /></button>
			</template>
			<TurnNudge :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
			<button type="button" class="actionsLineButton" :disabled="isSubmitting" @click="isDismissed = true">{{ $t("kickout.notNow") }}</button>
		</template>
	</div>
</template>

<style scoped>
.kickoutDialog { padding: 12px; margin-bottom: 12px; border: 2px solid #a85838; background: #fff4df; }
.kickoutDialog button { padding: 6px 10px; margin: 4px; cursor: pointer; }
.kickoutDialog button:disabled { cursor: default; opacity: .5; }
</style>
