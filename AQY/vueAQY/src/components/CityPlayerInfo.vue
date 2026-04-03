<script setup>
/** This is the player info line
 * When you click on a player, as well as showing their city,
 * it should show their other information
 * EG saint
 * Also resources?
 *
 * This component may get removed.
 */

import * as view from "../js/AQYview.js"
import * as rf from "../js/AQYreference.js"

import { useModelStore } from "../stores/AQYstore.js"
//import { usePersonalStore } from "../stores/AQYpersonal.js";
//const personal = usePersonalStore()

const store = useModelStore()

const props = defineProps({
	playerIndexProp: {
		type: Number,
		required: true,
		default: 0,
		prop: "playerIndexProp", // Specify the name of the prop in the parent component
	},
})
</script>

<template>
	<!--<div id="wholeInfoArea">-->
	<div class="saintContainerContainer">
		<div class="saintContainer">
			<div class="saintImage">
				<img v-if="store.players[playerIndexProp].saint !== rf.SAINT_NONE" :src="view.getImage('saint_' + String(store.players[playerIndexProp].saint))" />
				<span v-else>
					<br />
					No
					<br />
					Saint
				</span>
			</div>
			<div class="saintText">
				<span v-if="store.players[playerIndexProp].saint !== rf.SAINT_NONE">
					<strong>{{ rf.SAINT_INFO[store.players[playerIndexProp].saint].name }}</strong>
					<br />
					<strong>Bonus: </strong>
					{{ rf.SAINT_INFO[store.players[playerIndexProp].saint].bonus }}
				</span>
				<span v-else><strong>None</strong></span>
				<br />
				<strong>VR: </strong>
				<span v-if="store.players[playerIndexProp].saint !== rf.SAINT_NONE">
					{{ rf.SAINT_INFO[store.players[playerIndexProp].saint].VR }}
				</span>
				<span v-else>Choose a Saint</span>
			</div>
		</div>
	</div>
	<!--</div>-->
</template>

<style scoped>
/*#wholeInfoArea {
	width: 100%;
	background-color: beige;
	min-height: 110px;
	margin: 0px;
	padding: 0px;
	font-weight: bold;
}*/

.saintContainerContainer {
	display: inline-block;
}

.saintContainer {
	display: flex;
	align-items: center;
	border: 2px solid black;
	width: fit-content;
	height: 116px;
}

.saintImage {
	height: 100%;
	width: 64px;
	border: 1px solid black;
}

.saintImage img {
	height: 100%;
	width: 100%;
}

.saintText {
	text-align: left;
	margin-left: 10px;
	margin-right: 10px;
	max-width: 200px;
}
</style>
