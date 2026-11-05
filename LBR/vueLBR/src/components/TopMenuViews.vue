<script setup>
import { ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as controller from "../js/LBRcontroller.js";
import * as IO from "../backend/LBR_IO.js";

const store = useModelStore();
const bugReportText = ref("");
const submittingBug = ref(false);

async function submitBug() {
	if (!bugReportText.value.trim()) {
		store.gameMessages.bugErrorText = "Please describe the bug.";
		return;
	}
	submittingBug.value = true;
	store.gameMessages.bugErrorText = "";
	try {
		await IO.submitBug(bugReportText.value);
		bugReportText.value = "";
	} catch {
		store.gameMessages.bugErrorText = "Could not send the bug report.";
	} finally {
		submittingBug.value = false;
	}
}

async function confirmRewind() {
	await controller.doRewind();
	if (!store.gameMessages.errorText) store.viewSettings.showRewindPanel = false;
}

async function confirmResign() {
	await controller.doResign();
	store.viewSettings.showResignPanel = false;
}
</script>

<template>
	<!-- BUG REPORT -->
	<div id="bugReport" v-if="store.viewSettings.showBug">
		<h1>Report a bug</h1>
		<h2 class="errorText" v-if="store.gameMessages.bugErrorText" role="alert">{{ store.gameMessages.bugErrorText }}</h2>
		<p>
			Describe what went wrong. The current position is sent with your report.
			<br />
			Please mention whether the problem was a wrong rule, a display error or a save failure.
		</p>
		<div><textarea cols="150" rows="10" v-model="bugReportText" aria-label="Bug description"></textarea></div>
		<div>
			<button type="button" class="actionsLineButton" @click="submitBug" :disabled="submittingBug">
				{{ submittingBug ? "Sending..." : "Send report" }}
			</button>
			<button type="button" class="actionsLineButton" @click="store.viewSettings.showBug = false">Cancel</button>
		</div>
	</div>

	<!-- REWIND -->
	<div id="rewindPanel" v-if="store.viewSettings.showRewindPanel">
		<div class="utilityHeading">
			<b>Rewind</b>
			<button type="button" class="utilityClose" @click="store.viewSettings.showRewindPanel = false" aria-label="Close rewind panel">×</button>
		</div>
		<p>Return to the position before the last saved decision. This cannot be undone.</p>
		<p v-if="store.gameMessages.errorText" class="errorText" role="alert">{{ store.gameMessages.errorText }}</p>
		<button type="button" class="actionsLineButton" :disabled="store.viewSettings.saving" @click="confirmRewind">Rewind</button>
		<button type="button" class="actionsLineButton" @click="store.viewSettings.showRewindPanel = false">Cancel</button>
	</div>

	<!-- RESIGN -->
	<div id="resignPanel" v-if="store.viewSettings.showResignPanel">
		<div class="utilityHeading">
			<b>Resign</b>
			<button type="button" class="utilityClose" @click="store.viewSettings.showResignPanel = false" aria-label="Close resign panel">×</button>
		</div>
		<p>Resign from this game? Your seat will be handed to the AI.</p>
		<p><b>This cannot be undone.</b></p>
		<p v-if="store.gameMessages.errorText" class="errorText" role="alert">{{ store.gameMessages.errorText }}</p>
		<button type="button" class="actionsLineButton" :disabled="store.viewSettings.saving" @click="confirmResign">Resign</button>
		<button type="button" class="actionsLineButton" @click="store.viewSettings.showResignPanel = false">Cancel</button>
	</div>
</template>

<style scoped>
.errorText {
	width: 100%;
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
#bugReport {
	text-align: center;
	margin-bottom: 10px;
	border: 2px solid black;
	background-color: lightblue;
}
#bugReport textarea { max-width: 90%; box-sizing: border-box; }
#rewindPanel, #resignPanel {
	position: fixed;
	background-color: black;
	border: 1px solid white;
	padding: 5px;
	width: 400px;
	max-height: calc(100vh - var(--lbr-menu-height, 60px) - 20px);
	overflow-y: auto;
	top: calc(var(--lbr-menu-height, 60px) + 4px);
	left: 440px;
	font-size: 18px;
	z-index: 10000;
	color: white;
}
.utilityHeading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.utilityHeading button { border: 0; background: none; color: inherit; font-size: 26px; cursor: pointer; }
@media (max-width: 1050px) { .utilityHeading button { min-width: 44px; min-height: 44px; box-sizing: border-box; } }
</style>
