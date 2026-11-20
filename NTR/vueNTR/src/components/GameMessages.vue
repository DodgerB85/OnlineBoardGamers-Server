<script setup>
import { useModelStore } from "../stores/NTRstore.js"

defineProps({ top: { type: String, default: "64px" } })

const store = useModelStore()
</script>

<template>
	<div class="gameMessageArea" :style="{ top }" aria-live="polite">
		<div v-if="store.gameMessages.errorText" class="gameMessage error" role="alert" v-html="store.gameMessages.errorText"></div>
		<div v-if="store.gameMessages.successText" class="gameMessage success" role="status" v-html="store.gameMessages.successText"></div>
	</div>
</template>

<style scoped>
.gameMessageArea {
	position: fixed;
	left: 50%;
	transform: translateX(-50%);
	z-index: 10000;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	max-width: min(720px, calc(100vw - 20px));
	pointer-events: none;
}

.gameMessage {
	box-sizing: border-box;
	max-width: 100%;
	padding: 6px 14px;
	border: 2px solid;
	border-radius: 5px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
	font-weight: bold;
	text-align: center;
}

.gameMessage.error {
	background-color: #ffe8e8;
	border-color: #8b0000;
	color: #8b0000;
}

.gameMessage.success {
	background-color: #e8ffe8;
	border-color: #006400;
	color: #006400;
}
</style>
