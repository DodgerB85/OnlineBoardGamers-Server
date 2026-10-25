<script setup>
import { computed } from "vue"
import * as rf from "../js/URRreference"
import { useModelStore } from "../stores/URRstore.js"
const props = defineProps({ isDigging: { type: Boolean, default: false } })
const store = useModelStore()
const currentStep = computed(() => {
	if (store.gameflow.phase !== rf.PHASE_DEVELOPMENT) return null
	return store.gameflow.developmentStep === "digging" && !props.isDigging ? "purchasing" : store.gameflow.developmentStep
})
</script>

<template>
	<section class="developmentProgress" :aria-label="$t('development.aria')">
		<ol class="mainPhases">
			<li :class="{ current: store.gameflow.phase === rf.PHASE_SETTLEMENT }" :aria-current="store.gameflow.phase === rf.PHASE_SETTLEMENT ? 'step' : undefined">{{ $t("development.settlement") }}</li>
			<li :class="{ current: store.gameflow.phase === rf.PHASE_DEVELOPMENT }" :aria-current="store.gameflow.phase === rf.PHASE_DEVELOPMENT ? 'step' : undefined">{{ $t("development.development") }}</li>
			<li :class="{ current: store.gameflow.phase === rf.PHASE_RAINY_SEASON }" :aria-current="store.gameflow.phase === rf.PHASE_RAINY_SEASON ? 'step' : undefined">{{ $t("development.rainySeason") }}</li>
		</ol>
		<div v-if="store.gameflow.phase === rf.PHASE_DEVELOPMENT" class="developmentOrder">
			<ol class="developmentSteps">
				<li><span>{{ $t("development.nationIncome") }}</span><small>{{ $t("development.paidAutomatically") }}</small></li>
				<li><span :class="{ current: currentStep === 'eridu' }" :aria-current="currentStep === 'eridu' ? 'step' : undefined">{{ $t("development.eridu") }}</span><small>{{ $t("development.eriduHint") }}</small></li>
				<li><span :class="{ current: currentStep === 'digging' }" :aria-current="currentStep === 'digging' ? 'step' : undefined">{{ $t("development.buildCanals") }}</span><small>{{ $t("development.buildCanalsHint") }}</small></li>
				<li><span :class="{ current: currentStep === 'purchasing' }" :aria-current="currentStep === 'purchasing' ? 'step' : undefined">{{ $t("development.purchases") }}</span><small>{{ $t("development.purchasesHint") }}<br>{{ $t("development.crewRequired") }}</small></li>
			</ol>
			<div class="stateLoop" :aria-label="$t('development.repeatAria')"><span>{{ $t("development.perActiveState") }}</span></div>
		</div>
	</section>
</template>

<style scoped>
.developmentProgress { margin: 0 var(--page-margin) 12px; padding: 12px; border: 1px solid #aa9b77; border-radius: 5px; background: #fff9e9; font-size: 16px; font-weight: 400; }
ol { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 32px; list-style: none; margin: 0; padding: 0; }li { position: relative; }li + li::before { content: '→'; position: absolute; left: -24px; font-weight: 400; color: #736950; }.current { font-weight: bold; }
.developmentOrder { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.6fr); column-gap: 32px; }.developmentSteps { display: grid; grid-template-columns: subgrid; grid-column: 1 / -1; margin-top: 12px; padding-top: 12px; border-top: 1px solid #c4b894; text-align: left; }small { display: block; margin-top: 4px; font: inherit; color: #655a42; }
.stateLoop { position: relative; grid-column: 3 / -1; height: 22px; margin: 8px 18px 10px; border: solid #736950; border-width: 0 1px 1px; border-radius: 0 0 8px 8px; text-align: center; color: #655a42; }.stateLoop::before { content: ''; position: absolute; left: -4px; top: -3px; width: 0; height: 0; border-left: 3px solid transparent; border-right: 3px solid transparent; border-bottom: 6px solid #736950; }.stateLoop span { position: relative; top: 12px; padding: 0 8px; background: #fff9e9; }
</style>
