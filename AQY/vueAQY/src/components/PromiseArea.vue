<script setup>
/*import * as history from '../js/TGZhistory'
import * as model from '../js/TGZmodel'*/

import * as rf from "../js/AQYreference"
import * as view from "../js/AQYview"
import * as IO from "../backend/AQY_IO"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

const props = defineProps({
	playerIndexProp: {
		type: Number,
		required: true,
		default: 0,
		prop: "playerIndexProp", // Specify the name of the prop in the parent component
	},
})

function localMarkPromiseComplete(idx) {
	IO.markPromiseComplete(props.playerIndexProp, store.players[props.playerIndexProp].promises[idx])
}
</script>

<template>
	<div class="wholePromiseDiv" v-if="store.players[playerIndexProp].promises.length > 0">
		<template v-for="(promise, idx) in store.players[playerIndexProp].promises" :key="idx">
			<div class="playerScoreSummaryDiv">
				<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[promise[1]].colour)">
					<span v-if="personal.pov === promise[1]">You</span>
					<span v-else>{{ store.players[promise[1]].displayName }}</span>
				</span>
			</div>
			promise<span v-if="personal.pov !== promise[1]">s</span>
			<div class="playerScoreSummaryDiv">
				<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[promise[0]].colour)">
					<span v-if="personal.pov === promise[0]">You</span>
					<span v-else>{{ store.players[promise[0]].displayName }}</span>
				</span>
			</div>
			{{ rf.PHASE_STRINGS[promise[3]] }}: {{ promise[2] }}
			<button class="actionsLineButton" v-if="promise[0] === personal.pov" @click="localMarkPromiseComplete(idx)">Mark as Complete</button>
			<br/>
		</template>
	</div>
</template>

<style scoped>
.wholePromiseDiv {
	font-weight: bolder;
	background-color: aliceblue;
}

.playerScoreSummaryDiv {
	border: 1px solid black;
	display: inline-block;
	margin: 4px;
	padding: 0px;
}
</style>
