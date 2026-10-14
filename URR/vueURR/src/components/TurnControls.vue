<script setup>
import { computed } from "vue"
import * as rf from "../js/URRreference"
import * as controller from "../js/URRcontroller.js"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const props = defineProps({ isNationDivision: { type: Boolean, default: false }, landDraft: { type: Object, default: null }, turnAction: { type: Object, default: null } })
const emit = defineEmits(["endTurn"])
const isNationConfirmation = computed(() => props.isNationDivision && store.turnDraft.ready)
const canReview = computed(() => controller.canReviewTurn())
function resetAll() {
	props.turnAction?.undo?.()
	if (store.turnDraft.steps.length) controller.resetTurn()
}
</script>

<template>
	<div class="turnControls" :class="{ nationConfirmation: isNationConfirmation, agreementResponse: store.gameflow.pendingOffer && !store.turnDraft.ready }">
		<p v-if="isNationConfirmation" role="status">{{ store.turnDraft.steps[store.turnDraft.steps.length - 1].label }}</p>
		<p v-else-if="store.turnDraft.message && !store.turnDraft.ready" role="status">{{ store.turnDraft.message }}</p>
		<ol v-if="store.turnDraft.ready && !isNationConfirmation" aria-label="Choices to confirm"><li v-for="(step, index) in store.turnDraft.steps" :key="index">{{ step.label }}</li></ol>
		<p v-if="turnAction?.error" class="draftNotice" role="status">{{ turnAction.error }}</p>
		<p v-if="store.gameMessages.actionError || store.gameMessages.errorText" class="error" role="alert">{{ store.gameMessages.actionError || store.gameMessages.errorText }}</p>
		<div v-if="store.turnDraft.ready || (!store.gameflow.pendingOffer && (store.gameflow.phase !== rf.PHASE_RAINY_SEASON || store.rain.step !== 'harvest'))"><button v-if="!landDraft?.hasTrade && !turnAction?.hasPendingSales" :disabled="!canReview || (!store.turnDraft.steps.length && !turnAction?.undo)" @click="turnAction?.undo ? turnAction.undo() : controller.undoAction()">Undo</button><button v-if="!landDraft?.hasTrade && !turnAction?.hasPendingSales" :disabled="!canReview || (!store.turnDraft.steps.length && !turnAction?.undo)" @click="resetAll">Reset Turn</button><button class="primaryAction" :disabled="!canReview || !!landDraft?.error || !!turnAction?.error" @click="emit('endTurn')">{{ isNationConfirmation ? "Confirm" : landDraft?.hasTrade ? `End Turn${landDraft.net === null ? '' : ` (${landDraft.net >= 0 ? '+' : ''}${landDraft.net} SPL)`}` : turnAction?.label || (store.gameflow.phase === rf.PHASE_SETTLEMENT && !store.turnDraft.start ? 'Pass & End Turn' : 'End Turn') }}</button></div>
	</div>
</template>

<style scoped>
.turnControls { position: sticky; bottom: 0; background: #fff9e9; padding: 10px 0 0; border-top: 1px solid #aa9b77; text-align: left; font-size: 16px; font-weight: 400; z-index: 2; }p { margin: 4px 0 8px; }.draftNotice { color: #655a42; } .turnControls > div { display: flex; flex-wrap: wrap; gap: 5px; }ol { padding-left: 20px; }.error { color: #a40000; }
.agreementResponse { border-top: 0; padding-top: 0; }
.nationConfirmation { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.nationConfirmation > p[role=status] { flex: 1 1 280px; margin: 0; }
</style>
