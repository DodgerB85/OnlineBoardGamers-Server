<script setup>
import * as model from "../js/DDLmodel"
import { useModelStore } from "../stores/DDLstore.js"
const store = useModelStore()

function showState() {
	window.alert(JSON.stringify(model.exportGameData(), null, 2))
}
</script>

<template>
	<div id="debugArea">
		<h3>Debug</h3>
		<div>Phase: {{ store.gameflow.phase }} | Turn: {{ store.gameflow.turn }}</div>
		<div>Turn order: {{ store.gameflow.turnOrder }}</div>
		<button class="actionsLineButton" @click="showState">Show game data</button>
	</div>
</template>

<style scoped>
#debugArea {
	border: 1px dashed darkred;
	background-color: #fff3cd;
	padding: 6px;
	margin: 6px auto;
	max-width: 700px;
	text-align: left;
}
.actionsLineButton {
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 4px 10px;
	cursor: pointer;
	margin-top: 4px;
}
</style>
