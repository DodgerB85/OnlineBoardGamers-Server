<script setup>
import { computed } from "vue"
import * as rf from "../js/URRreference"
import { hasMaintenanceCrew, maintenanceShortfall } from "../js/URRrules"
import { currentStateId } from "../js/URRview"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const state = computed(() => store.states[currentStateId(store)])
const step = computed(() => store.gameflow.developmentStep)
const needsCrew = computed(() => state.value && !hasMaintenanceCrew(store, state.value.id))
</script>

<template>
	<div v-if="store.gameflow.phase === rf.PHASE_DEVELOPMENT" class="developmentProgress" aria-label="Development progress">
		<p v-if="step === 'eridu'">Eridu special digging · before state development</p>
		<p v-else-if="step === 'betweenStates'">Between states · optional Barahshum exchange before development continues</p>
		<template v-else>
			<ol><li :class="{ current: step === 'digging', completed: step === 'purchasing' }" :aria-current="step === 'digging' ? 'step' : undefined">{{ step === 'purchasing' ? 'Digging closed' : 'Dig canals (optional)' }}</li><li :class="{ current: step === 'purchasing' }" :aria-current="step === 'purchasing' ? 'step' : undefined">Buy equipment (optional)</li><li>End development</li></ol>
			<p v-if="needsCrew" class="crewRequirement">Crew required before ending.<template v-if="maintenanceShortfall(store, state.id)"> Private contribution: {{ maintenanceShortfall(store, state.id) }} SPL.</template><template v-else> Paid from the state treasury.</template></p>
			<p v-else>Maintenance crew available.</p>
		</template>
		<p v-if="store.gameflow.pendingOffer">Awaiting agreement · development resumes after the response.</p>
	</div>
</template>

<style scoped>
.developmentProgress { text-align: left; font-size: 12px; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 1px solid #c4b894; }ol { display: flex; flex-wrap: wrap; gap: 5px 18px; margin: 0; padding-left: 18px; }li { padding: 3px 0; color: #655a42; }.current { color: #42653b; font-weight: bold; }.completed { color: #786d54; }p { margin: 6px 0 0; }.crewRequirement { color: #854c1c; }
</style>
