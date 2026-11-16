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
const visible = computed(() => !store.viewSettings.showReplay && store.gameflow.phase === rf.PHASE_SETTLEMENT && personal.pov >= 0 && store.players[personal.pov]?.name === personal.name && !store.players[personal.pov].isMissing)
const storedFlag = computed(() => store.autoPassData[personal.name] || null)
const active = computed(() => rules.isAutoPassActive(store, storedFlag.value))
const stoppedByPrice = computed(() => storedFlag.value?.mode === rf.AUTO_PASS_PRICE && storedFlag.value?.turn === store.gameflow.turn && !active.value)
const busy = computed(() => saving.value || store.viewSettings.isSaving || personal.haltPlay)
watch([active, storedFlag], () => {
	enabled.value = active.value
	stopOnPrice.value = active.value && storedFlag.value?.mode === rf.AUTO_PASS_PRICE
}, { immediate: true })
async function save() {
	if (busy.value) return
	saving.value = true
	failed.value = false
	const mode = enabled.value ? (stopOnPrice.value ? rf.AUTO_PASS_PRICE : rf.AUTO_PASS_PHASE) : null
	const saved = await IO.saveAutoPass(mode, mode === rf.AUTO_PASS_PRICE ? [...store.landPrices] : [])
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
</script>

<template>
	<div v-if="visible" class="autoPass">
		<label class="autoPassRow"><input type="checkbox" :checked="enabled" :disabled="busy" @change="setEnabled($event.target.checked)" /> {{ $t("actions.autoPassPhase") }}</label>
		<label v-if="enabled" class="autoPassRow autoPassNested"><input type="checkbox" :checked="stopOnPrice" :disabled="busy" @change="setStopOnPrice($event.target.checked)" /> {{ $t("actions.autoPassStopOnPrice") }}</label>
		<small v-if="enabled" class="autoPassStatus" role="status">{{ $t("actions.autoPassActive") }}</small>
		<small v-if="stoppedByPrice" class="autoPassStatus" role="status">{{ $t("actions.autoPassStopped") }}</small>
		<small v-if="failed" class="autoPassError" role="alert">{{ $t("actions.autoPassError") }}</small>
	</div>
</template>

<style scoped>
.autoPass { border-top: 1px solid #aa9b77; margin-top: 8px; padding-top: 8px; display: flex; flex-direction: column; gap: 5px; font-size: 14px; text-align: left; }
.autoPassRow { display: flex; align-items: flex-start; gap: 6px; margin: 0; line-height: 1.3; }
.autoPassRow input { width: 16px; height: 16px; flex-shrink: 0; margin: 1px 0 0; }
.autoPassNested { margin-left: 22px; }
.autoPassStatus { color: #655a42; }
.autoPassError { color: #a40000; font-weight: bold; }
</style>
