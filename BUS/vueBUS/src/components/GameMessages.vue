<script setup>
import { onUnmounted, watch } from "vue"
import { useModelStore } from "../stores/BUSstore.js"

defineProps({ top: { type: String, default: "64px" } })

const store = useModelStore()
let successTimer = null
let errorTimer = null

function clearSuccess() {
	store.gameMessages.successText = ""
}

function clearError() {
	store.gameMessages.errorText = ""
}

watch(
	() => store.gameMessages.successText,
	(text) => {
		clearTimeout(successTimer)
		if (text) successTimer = setTimeout(clearSuccess, 3000)
	},
	{ immediate: true },
)

watch(
	() => store.gameMessages.errorText,
	(text) => {
		clearTimeout(errorTimer)
		if (text) errorTimer = setTimeout(clearError, 10000)
	},
	{ immediate: true },
)

onUnmounted(() => {
	clearTimeout(successTimer)
	clearTimeout(errorTimer)
})
</script>

<template>
	<div class="gameMessageArea" :style="{ top }" aria-live="polite">
		<div v-if="store.gameMessages.errorText" class="gameMessage error" role="alert">
			<span class="gameMessageText" v-html="store.gameMessages.errorText"></span>
			<button type="button" class="gameMessageClose" aria-label="Close" @click="clearError">×</button>
		</div>
		<div v-if="store.gameMessages.successText" class="gameMessage success" role="status">
			<span class="gameMessageText" v-html="store.gameMessages.successText"></span>
			<button type="button" class="gameMessageClose" aria-label="Close" @click="clearSuccess">×</button>
		</div>
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
	position: relative;
	box-sizing: border-box;
	max-width: 100%;
	padding: 6px 34px 6px 14px;
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

.gameMessageClose {
	position: absolute;
	top: 2px;
	right: 4px;
	width: 22px;
	height: 22px;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
	opacity: 0.8;
	pointer-events: auto;
}

.gameMessageClose:hover {
	opacity: 1;
}
</style>