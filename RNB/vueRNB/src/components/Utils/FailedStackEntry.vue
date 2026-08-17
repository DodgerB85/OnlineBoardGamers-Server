<script setup>
import * as rf from "../../js/RNBreference"
//import * as view from "../../js/RNBview"
//import * as map from "../../js/RNBmap"
//import * as controller from "../../js/RNBcontroller"
//import * as loc from "../../js/RNBlocation"
//import * as model from "../../js/RNBmodel"
//import * as context from "../../js/RNBcontext"
//import * as util from "../../js/RNButil"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()

//import { computed } from "vue"
import HistoryEntry from "../History/HistoryEntry.vue"

function getFullHistoryEntry() {
	const entry0 = rf.HIST_STACK_ACTIONS
	const entry1 = personal.pov
	const entry2 = -1
	const entry3 = [store.gameflow.phase, store.stackControl.failedStackHistoryEntry]
	return [entry0, entry1, entry2, entry3]
}
</script>

<template>
	<span class="errorText">Other players have caused this action to fail</span>
	<div class="failedEntryDiv">
		<HistoryEntry :entry="getFullHistoryEntry()" />
	</div>
	<span class="errorText">You can reset your turn or continue from just before this action</span>
	<br />
</template>

<style scoped>
.failedEntryDiv {
	width: fit-content;
	margin: 0px auto;
}

.errorText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
</style>
