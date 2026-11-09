<script setup>
import { useI18n } from "vue-i18n"
import * as controller from "../js/ROWcontroller"
import { useModelStore } from "../stores/ROWstore.js"

const { t } = useI18n()
const store = useModelStore()

function close() {
	store.viewSettings.showResignPanel = false
}

async function confirm() {
	store.gameMessages.errorText = ""
	await controller.resignGame()
	if (!store.gameMessages.errorText) close()
}
</script>

<template>
	<div v-if="store.viewSettings.showResignPanel" id="resignOverlay" @click.self="close">
		<div id="resignPanel" role="dialog" aria-modal="true" :aria-label="t('topMenu.resign')" tabindex="-1" @keydown.esc.stop.prevent="close">
			<h3>{{ t('topMenu.resign') }}</h3>
			<p>{{ t('app.confirmResign') }}</p>
			<p v-if="store.gameMessages.errorText" class="resignError" role="alert">{{ store.gameMessages.errorText }}</p>
			<div class="resignButtons">
				<button class="actionsLineButton" autofocus @click="close">{{ t('panels.cancel') }}</button>
				<button class="actionsLineButton" @click="confirm">{{ t('topMenu.resign') }}</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
#resignOverlay {
	position: fixed;
	inset: 0;
	z-index: 10000;
	background: rgba(0, 0, 0, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
	box-sizing: border-box;
}
#resignPanel {
	background: #d4eafd;
	border: 2px solid black;
	border-radius: 6px;
	color: #302f27;
	padding: 16px;
	max-width: 460px;
	text-align: center;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}
#resignPanel h3 { margin: 0 0 8px; }
#resignPanel p { margin: 8px 0; }
.resignButtons { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.resignError { background: lightgoldenrodyellow; color: darkred; font-weight: bold; }
</style>
