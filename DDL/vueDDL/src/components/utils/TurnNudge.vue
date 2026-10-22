<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const props = defineProps({
	gameId: { type: [Number, String], required: true },
	latestUpdate: { type: [Number, String], required: true },
})
const targets = ref([])
const message = ref("")
const streakText = ref("")
const receivedNudge = ref("")
const isSending = ref(false)
let refreshTimer
let requestNumber = 0

async function refreshTargets() {
	const currentRequest = ++requestNumber
	try {
		const response = await fetch(`/gameMomentum/${props.gameId}/`, { headers: { Accept: "application/json" } })
		if (!response.ok) throw new Error(t("nudge.loadError"))
		const data = await response.json()
		if (currentRequest === requestNumber) {
			targets.value = data.isActive ? data.targets : []
			receivedNudge.value = data.nudge || ""
			streakText.value = data.streak?.days > 0 && data.isActive ? t("nudge.streak", { days: data.streak.days, best: data.streak.best, goal: data.streak.hasMovedToday ? t("nudge.goalMet") : t("nudge.goalRemaining") }) : ""
		}
	} catch (error) {
		if (currentRequest === requestNumber) {
			targets.value = []
			message.value = error.message
		}
		console.error(error)
	}
}

async function sendNudge(target) {
	isSending.value = true
	message.value = t("nudge.sending")
	const csrfToken = document.cookie.split("; ").find(cookie => cookie.startsWith("csrftoken="))?.slice("csrftoken=".length)
	try {
		const response = await fetch(`/nudgePlayer/${props.gameId}/`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(csrfToken || "") },
			body: JSON.stringify({ playerID: target.id, latestUpdate: props.latestUpdate }),
		})
		const result = await response.json()
		message.value = result.message || result.error
		if (response.ok) target.canNudge = false
		await refreshTargets()
	} catch (error) {
		message.value = t("nudge.sendError")
		console.error(error)
	} finally {
		isSending.value = false
	}
}

watch(() => [props.gameId, props.latestUpdate], () => {
	targets.value = []
	message.value = ""
	streakText.value = ""
	receivedNudge.value = ""
	refreshTargets()
})
onMounted(() => {
	refreshTargets()
	refreshTimer = setInterval(() => { if (!document.hidden) refreshTargets() }, 60000)
})
onUnmounted(() => {
	clearInterval(refreshTimer)
	requestNumber++
})
</script>

<template>
	<div v-if="targets.length || message || receivedNudge" class="turnNudge">
		<p v-if="streakText">{{ streakText }}</p>
		<p v-if="receivedNudge">{{ receivedNudge }}</p>
		<button v-for="target in targets" :key="target.id" type="button" class="actionsLineButton" :disabled="isSending || !target.canNudge" :title="target.canNudge ? $t('nudge.titleEnabled') : $t('nudge.titleDisabled')" @click="sendNudge(target)">{{ $t("nudge.button", { name: target.name }) }}</button>
		<p v-if="targets.length">{{ $t("nudge.info") }}</p>
		<p v-if="message" role="status" aria-live="polite">{{ message }}</p>
	</div>
</template>

<style scoped>
.turnNudge button { margin: 4px; padding: 5px 10px; cursor: pointer; }
.turnNudge button:disabled { cursor: default; opacity: .5; }
.turnNudge p { margin: 6px 0; }
</style>
