<script setup>
import { computed } from "vue"
import * as controller from "../js/URRcontroller.js"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const emit = defineEmits(["endTurn"])
const canReview = computed(() => controller.canReviewTurn())
</script>

<template>
	<div class="turnControls">
		<p v-if="store.turnDraft.message" role="status">{{ store.turnDraft.message }}</p>
		<p v-if="store.turnDraft.start" class="draftNotice">Only End Turn saves your choices · {{ store.turnDraft.steps.length }} action{{ store.turnDraft.steps.length === 1 ? '' : 's' }}</p>
		<ol v-if="store.turnDraft.ready" aria-label="Choices to confirm"><li v-for="(step, index) in store.turnDraft.steps" :key="index">{{ step.label }}</li></ol>
		<p v-if="store.turnDraft.ready">Undo or Reset Turn to change your choices.</p>
		<p v-if="store.gameMessages.actionError || store.gameMessages.errorText" class="error" role="alert">{{ store.gameMessages.actionError || store.gameMessages.errorText }}</p>
		<div><button :disabled="!canReview || !store.turnDraft.steps.length" @click="controller.undoAction">Undo</button><button :disabled="!canReview" @click="controller.resetTurn">Reset Turn</button><button class="primaryAction" :disabled="!canReview" @click="emit('endTurn')">End Turn</button></div>
	</div>
</template>

<style scoped>
.turnControls { position: sticky; bottom: -12px; background: #fff9e9; padding: 10px 0 0; border-top: 1px solid #aa9b77; text-align: left; font-size: 13px; z-index: 2; }p { margin: 4px 0 8px; }.draftNotice { color: #655a42; } .turnControls > div { display: flex; flex-wrap: wrap; gap: 5px; }ol { max-height: min(180px, 20vh); overflow-y: auto; padding-left: 20px; }.primaryAction { background: #e3eddb; border-color: #547751; font-weight: bold; }button { border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #263b32; font: inherit; padding: 7px 9px; min-height: 40px; cursor: pointer; }button:disabled { cursor: default; opacity: .5; }.error { color: #a40000; }
</style>
