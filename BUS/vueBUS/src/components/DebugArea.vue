<script setup>
import * as funcs from "../js/BUSfuncs.js"
import * as rf from "../js/BUSreference.js"
import * as model from "../js/BUSmodel.js"
import * as controller from "../js/BUScontroller.js"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()

//import { usePersonalStore } from "../stores/BUSpersonal.js"
//const personal = usePersonalStore()

import { ref } from "vue"

// Positioning tool state
const showAllJunctions = ref(false)
const showAllBuildings = ref(false)

function test() {
	alert(store.players[0].name)
	let res = model.getJunctionsReachableFromJunction(0, 25)
	alert(JSON.stringify(res))
}
function test2() {
	//store.increaseScore(store.players[0])
	for (let i = 0; i < store.players.length; i++) {
		store.players[i].passActionsFlag = false
	}
}

function swapPlayerOrder() {
	//store.gameflow.turnOrder.unshift(store.gameflow.turnOrder.pop())
	modifyPlayerScore(1, 'increase')
}

function highlightBuildingOptions() {
	modifyPlayerScore(1, 'increase')
	store.getVromBuildings()
}
function removePax() {
	store.moveAllPassengersOntoJunctions()
}
function addPax(bldgNumber) {
	store.moveAllPassengersOntoCorrectBuilding(bldgNumber)
}

function removeAllBuildings() {
	for (let i = 0; i < store.junctions.length; i++) {
		for (let j = 0; j < store.junctions[i].length; j++) {
			if (store.junctions[i][j] > 0) store.junctions[i][j] = 0
		}
	}
}
function exportLoc() {
	//store.desiredBuilding = 1
}
function importLoc() {
	//store.canPlayerVrom()
}

function modifyPlayerScore(playerIndex, operation) {
	if (operation === 'increase') {
		model.increaseScore(store.players[playerIndex])
	} else if (operation === 'decrease') {
		model.decreaseScore(store.players[playerIndex])
		store.players[playerIndex].timeStones++
	}
}

// Positioning tool functions
function toggleAllJunctions() {
	showAllJunctions.value = !showAllJunctions.value
}

function toggleAllBuildings() {
	showAllBuildings.value = !showAllBuildings.value
}

function addPaxToAllJunctions() {
	for (let i = 0; i < store.junctions.length; i++) {
		store.junctions[i][rf.paxIdx]++
	}
}

function addBuildingsToAllSpots() {
	for (let i = 0; i < store.junctions.length; i++) {
		for (let j = 0; j < 5; j++) {
			if (store.junctions[i][j] === 0) {
				store.junctions[i][j] = 1 // Pub
			}
		}
	}
}

function addLinesToAllOptions() {
	// Add a line between every junction (lines 0-69 for Pittsburgh)
	for (let lineID = 0; lineID < 70; lineID++) {
		model.addLine_core(controller.currentPlayerIndex(), lineID)
		store.context.linesLeftToPlace--
	}
}
</script>

<template>
	{{ funcs.exportBUSmodel(false, false).length }}
	<br />
	{{ store.actionAreaData }}
	<br />
	<br />
	{{ store.lines }}
	<br />

	<br />
	{{ model.getWinnerName(true) }}
	<br />
	<button @click="modifyPlayerScore(0, 'increase')">P0 +</button>
	<button @click="modifyPlayerScore(0, 'decrease')">P0 -</button>

	<button @click="modifyPlayerScore(1, 'increase')">P1 +</button>
	<button @click="modifyPlayerScore(1, 'decrease')">P1 -</button>

	<button @click="modifyPlayerScore(2, 'increase')">P2 +</button>
	<button @click="modifyPlayerScore(2, 'decrease')">P2 -</button>

	<button @click="store.gameflow.gameEnded = 0">Play</button>
	<button @click="store.gameflow.gameEnded = 1">End</button>

	<button class="actionsLineButton" @click="test">Test</button>
	<button @click="test2">Test2</button>
	<button @click="swapPlayerOrder">swap players</button>
	<button @click="highlightBuildingOptions(1)">Highligh Bldg Options</button>
	<button @click="removeAllBuildings()">Remove All Bldgs</button>
	<button @click="removePax()">Remove Pax</button>
	<button @click="addPax(1)">Add Pax</button>
	<button @click="exportLoc()">export</button>
	<button @click="importLoc()">import</button>
	
	<br /><br />
	<!-- Positioning Tool Controls -->
	<button @click="toggleAllJunctions">Highlight All Junctions</button>
	<button @click="toggleAllBuildings" style="margin-left: 10px;">Highlight All Buildings</button>
	<button @click="addPaxToAllJunctions" style="margin-left: 10px;">Add Pax</button>
	<button @click="addBuildingsToAllSpots" style="margin-left: 10px;">Add Buildings</button>
	<button @click="addLinesToAllOptions" style="margin-left: 10px;">Add Lines</button>
</template>

<style scoped>
body {
	overflow: hidden;
	background: #212121;
}
input {
	position: absolute;
	display: none;
}

* {
	margin: 0px;
	padding: 0px;
	list-style-type: none;
}

body {
	background: #003366;
}

#container {
	width: 1000px;
	margin: 0px auto;
}

#elements {
	width: 100%;
}

#elements li {
	display: inline-block;
	width: 50px;
	margin: 5px;
	background: #fff;
	color: #003366;
	box-shadow: 10px 10px 0px #222;
	user-select: none;
}

#elements li h1,
h3 {
	padding: 1px;
}

#elements li h1 {
	cursor: pointer;
}
</style>
