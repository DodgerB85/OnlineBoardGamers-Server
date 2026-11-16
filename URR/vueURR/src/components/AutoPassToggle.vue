<script setup>
import { computed, ref, watch } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as IO from "../backend/URR_IO"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()
const saving = ref(false)
const failed = ref(false)
const enabled = ref(false)
const stopOnPrice = ref(false)
// Practice games have one human playing every seat, so the setting follows the acting seat.
const targetSeat = computed(() => {
	if (!personal.trainingGame) return personal.pov
	return store.turnDraft.ready && store.turnDraft.player !== null ? store.turnDraft.player : store.gameflow.turnOrder[0]
})
const target = computed(() => targetSeat.value === undefined || targetSeat.value === null ? null : store.players[targetSeat.value] || null)
const targetName = computed(() => target.value?.name || null)
const visible = computed(() => !store.viewSettings.showReplay && store.gameflow.phase === rf.PHASE_SETTLEMENT && personal.pov >= 0 && targetName.value !== null && (personal.trainingGame || targetName.value === personal.name) && !store.players[personal.pov]?.isMissing)
const storedFlag = computed(() => targetName.value ? store.autoPassData[targetName.value] || null : null)
const active = computed(() => rules.isAutoPassActive(store, storedFlag.value))
const stoppedByPrice = computed(() => storedFlag.value?.mode === rf.AUTO_PASS_PRICE && storedFlag.value?.turn === store.gameflow.turn && !active.value)
const busy = computed(() => saving.value || store.viewSettings.isSaving || personal.haltPlay)
const otherActiveFlags = computed(() => {
	if (!personal.trainingGame) return []
	return store.players
		.map((player) => ({ player, flag: store.autoPassData[player.name] }))
		.filter(({ player, flag }) => !player.isMissing && player.name !== targetName.value && rules.isAutoPassActive(store, flag))
})
watch([active, storedFlag], () => {
	enabled.value = active.value
	stopOnPrice.value = active.value && storedFlag.value?.mode === rf.AUTO_PASS_PRICE
}, { immediate: true })
async function save() {
	if (busy.value) return
	saving.value = true
	failed.value = false
	const mode = enabled.value ? (stopOnPrice.value ? rf.AUTO_PASS_PRICE : rf.AUTO_PASS_PHASE) : null
	const saved = await IO.saveAutoPass(mode, mode === rf.AUTO_PASS_PRICE ? [...store.landPrices] : [], targetName.value)
	if (!saved) {
		failed.value = true
		enabled.value = active.value
		stopOnPrice.value = active.value && storedFlag.value?.mode === rf.AUTO_PASS_PRICE
	}
	saving.value = false
}
function setEnabled(value) {
	enabled.value = value
	if (!value) stopOnPrice.value = false
	save()
}
function setStopOnPrice(value) {
	stopOnPrice.value = value
	save()
}
async function cancelFlag(name) {
	if (busy.value) return
	saving.value = true
	failed.value = false
	if (!await IO.saveAutoPass(null, [], name)) failed.value = true
	saving.value = false
}
</script>

<template>
	<div v-if="visible" class="autoPass">
		<label class="autoPassRow"><input type="checkbox" :checked="enabled" :disabled="busy" @change="setEnabled($event.target.checked)" /> {{ personal.trainingGame ? $t("actions.autoPassPhaseFor", { name: target.displayName || targetName }) : $t("actions.autoPassPhase") }}</label>
		<label v-if="enabled" class="autoPassRow autoPassNested"><input type="checkbox" :checked="stopOnPrice" :disabled="busy" @change="setStopOnPrice($event.target.checked)" /> {{ $t("actions.autoPassStopOnPrice") }}</label>
		<small v-if="enabled" class="autoPassStatus" role="status">{{ $t("actions.autoPassActive") }}</small>
		<small v-if="stoppedByPrice" class="autoPassStatus" role="status">{{ $t("actions.autoPassStopped") }}</small>
		<div v-if="otherActiveFlags.length" class="autoPassOthers">
			<small>{{ $t("actions.autoPassOthers") }}</small>
			<span v-for="entry in otherActiveFlags" :key="entry.player.name" class="autoPassOther">
				{{ entry.player.displayName || entry.player.name }}
				<button type="button" class="autoPassCancel" :disabled="busy" @click="cancelFlag(entry.player.name)">{{ $t("actions.autoPassCancel") }}</button>
			</span>
		</div>
		<small v-if="failed" class="autoPassError" role="alert">{{ $t("actions.autoPassError") }}</small>
	</div>
</template>

<style scoped>
.autoPass { border-top: 1px solid #aa9b77; margin-top: 8px; padding-top: 8px; display: flex; flex-direction: column; gap: 5px; font-size: 14px; text-align: left; }
.autoPassRow { display: flex; align-items: flex-start; gap: 6px; margin: 0; line-height: 1.3; }
.autoPassRow input { width: 16px; height: 16px; flex-shrink: 0; margin: 1px 0 0; }
.autoPassNested { margin-left: 22px; }
.autoPassStatus { color: #655a42; }
.autoPassOthers { display: flex; flex-direction: column; gap: 3px; }
.autoPassOther { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.autoPassCancel { margin: 0; padding: 2px 6px; font-size: 13px; }
.autoPassError { color: #a40000; font-weight: bold; }
</style>
