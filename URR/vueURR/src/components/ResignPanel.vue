<script setup>
import * as view from "../js/URRview"
import * as IO from "../backend/URR_IO"

import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()

function close() {
	store.viewSettings.showResignPanel = false
}

async function confirmResign() {
	if (await IO.resign()) close()
}
</script>

<template>
	<div id="resignPanel" role="dialog" :aria-label="$t('resign.title')">
		<b class="resignHeading">{{ $t("resign.title") }}</b>
		<p>{{ $t("resign.question") }}</p>
		<p>{{ $t("resign.carryOn") }}</p>
		<p>{{ $t("resign.aim") }}</p>
		<p v-if="store.gameMessages.errorText" class="resignError" role="alert"><CurrencyText :text="store.gameMessages.errorText" /></p>
		<img class="resignImage" :src="view.getImage('resign')" :alt="$t('resign.title')" />
		<div class="resignButtons">
			<button @click="close">{{ $t("resign.keepPlaying") }}</button>
			<button :disabled="!!store.turnDraft.start || store.viewSettings.showLoader || store.viewSettings.isSaving" :title="store.turnDraft.start ? $t('resign.resetFirst') : $t('resign.resignGame')" @click="confirmResign">{{ $t("resign.confirm") }}</button>
		</div>
	</div>
</template>

<style scoped>
#resignPanel {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	justify-content: safe center;
	gap: 4px;
	width: 100%;
	height: 100%;
	box-sizing: border-box;
	padding: 14px;
	overflow: auto;
	background-color: #d4eafd;
	border: 2px solid black;
	color: #302f27;
	line-height: 1.4;
	text-align: center;
}
.resignHeading { font-size: 22px; }
#resignPanel p { margin: 4px 0; }
.resignImage { width: clamp(140px, 34%, 256px); height: auto; margin: 10px; border: 2px solid black; }
.resignError { width: 100%; background-color: lightgoldenrodyellow; color: darkred; font-weight: bold; }
.resignButtons { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.resignButtons button { margin: 0; border: 2px solid green; border-radius: 5px; padding: 5px 10px; font: inherit; font-weight: bold; cursor: pointer; }
.resignButtons button:hover { background-color: lightgrey; }
.resignButtons button:disabled { cursor: default; opacity: .5; }
</style>
