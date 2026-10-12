<script setup>
import * as rf from "../js/URRreference"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
</script>

<template>
	<div v-if="store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.pendingOffer" class="developmentProgress" aria-label="Development progress">
		<p>Awaiting agreement · development resumes after the response.</p>
	</div>
</template>

<style scoped>
.developmentProgress { text-align: left; font-size: 16px; font-weight: 600; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 1px solid #c4b894; }ol { display: flex; flex-wrap: wrap; gap: 5px 18px; margin: 0; padding-left: 18px; }li { padding: 3px 0; color: #655a42; }.current { color: #42653b; font-weight: bold; }.completed { color: #786d54; }p { margin: 6px 0 0; }.crewRequirement { color: #854c1c; }
</style>
