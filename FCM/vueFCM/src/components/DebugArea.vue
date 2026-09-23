<script setup>
/** The debug area is a "cheat" area, to start an action at any time.
 * Actions can be put here before being linked into the proper flow of the game.
 * It is a useful way to interact with the game without getting in the way of the main code
 * Each action should be self contained, and ideally run alaost no code here - the code
 * should be put in the relevant place (eg the XXXmodel.js file)
 */

import * as funcs from "../js/FCMfuncs"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

function exportModelToConsole() {
	console.log("MODEL EXPORT:", JSON.stringify(funcs.exportFCMmodel(false, false)))
	console.log("availableMilestones:", JSON.stringify(store.availableMilestones))
	console.log("startingOptions:", JSON.stringify(store.startingOptions))
	console.log("gameflow:", JSON.stringify(store.gameflow))
	console.log("playerMilestones:", JSON.stringify(store.players.map((p) => ({ name: p.displayName, milestones: p.milestones }))))
}
</script>

<template>
	<div id="debugArea">
		{{ personal.moveDataRaw }}
		<button @click="exportModelToConsole">Export Model</button>
	</div>
</template>

<style scoped>
body {
	background-color: lightpink;
	padding: 10px;
}

#debugArea {
	min-height: 100px;
	background-color: lightpink;
}
</style>
