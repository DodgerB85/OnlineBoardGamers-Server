<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map should be here
 *  Functions to do with manipulating the map should go in XXXmap.js
 *  Functions to do with changing the game state should probably be in XXXmodel.js
 *
 */

//import * as view from "../js/AQYview.js"
//import * as map from "../js/AQYmap"
import * as model from "../js/AQYmodel"
import * as country from "../js/AQYcountry"
import * as city from "../js/AQYcity.js"
import * as controller from "../js/AQYcontroller.js"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()
//import { ref } from 'vue'

function toggleFullColourHex() {
	store.topMenuViews.showFullColourHex++
	if (store.topMenuViews.showFullColourHex === 3) store.topMenuViews.showFullColourHex = 0
}

function toggleResourceIcon() {
	if (store.topMenuViews.resourceIconType === 1) store.topMenuViews.resourceIconType = 0
	else if (store.topMenuViews.resourceIconType === 0) store.topMenuViews.resourceIconType = 1
	//else store.topMenuViews.resourceIconType = 1
}

/*function clickedZOCtoggleAll() {
	let showingAllZOC = true
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].selectedForZOCline === false) {
			showingAllZOC = false
			break
		}
	}

	if (!showingAllZOC) {
		for (let i = 0; i < store.players.length; i++) {
			country.getZOCoutline(i)
			store.players[i].selectedForZOCline = true
		}
	} else {
		store.ZOCpaths.splice(0)
		for (let i = 0; i < store.players.length; i++) {
			store.players[i].selectedForZOCline = false
		}
	}
	/*if (store.ZOCpaths.length === 0) {
		for (let i = 0; i < store.players.length; i++) {
			country.getZOCoutline(i)
		}
	} else store.ZOCpaths.splice(0)*/
//}

function clickedZOCwithDottedLines() {
	let showingAllZOC = true
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].selectedForZOCline === false) {
			showingAllZOC = false
			break
		}
	}

	if (!showingAllZOC) {
		let arr = []
		for (let i = 0; i < store.players.length; i++) {
			store.players[i].selectedForZOCline = true
			arr.push(i)
		}
		country.getZOCpathsForDottedLines(arr)
	} else {
		store.ZOCpathsWithMultiples.splice(0)
		for (let i = 0; i < store.players.length; i++) {
			store.players[i].selectedForZOCline = false
		}
	}
}

function clickedZOCwithDottedLinesSelectedPlayers() {
	// If displaying, then hide them
	if (store.ZOCpathsWithMultiples.length > 0) {
		store.ZOCpathsWithMultiples.splice(0)
		return
	}

	// If no player selected, select all
	if (!store.players.some((player) => player.selectedForZOCline === true)) {
		for (let i = 0; i < store.players.length; i++) {
			//store.players[i].selectedForZOCline === true
			togglePlayerCheckbox(store.players[i])
		}
	}

	country.updateZOCwithDottedLinesSelectedPlayers()
}

function clickedZOCoverlap() {
	// This function is entirely here as it is experimental
	// It it becomes permanent it will be moved out to keep this area clean
	if (store.ZOCoverlapData.length === 0) {
		let res = []

		// First, get all the ZoC ID's for each player
		let ZOCids = []
		for (let i = 0; i < store.players.length; i++) {
			ZOCids.push(country.getZocTiles(i, false, true, true, true))
		}

		// Now go through every hex id and find out which are rep
		const minId = store.mapData.hexes.reduce((min, hexObj) => (hexObj.id < min ? hexObj.id : min), Infinity)
		const maxId = store.mapData.hexes.reduce((max, hexObj) => (hexObj.id > max ? hexObj.id : max), -Infinity)

		for (let i = minId; i <= maxId; i++) {
			// now "i" is an ID. So check how many ZoC it is in
			// If it is in more than one, add it to the result
			let row = []
			for (let j = 0; j < ZOCids.length; j++) {
				if (ZOCids[j].includes(i)) row.push(j)
			}
			// If there is overlap, add it to result
			if (row.length > 1) {
				res.push([i].concat([...row]))
			}
		}
		// Each entry is [hexID, playerNum, playerNUm, ....]
		store.ZOCoverlapData = res
	} else store.ZOCoverlapData.splice(0)
}

function clickedZOCuniqueSelectedPlayers() {
	if (store.ZOCuniqueData.length > 0) {
		store.ZOCuniqueData.splice(0)
		return
	}

	// If no player selected, select all
	if (!store.players.some((player) => player.selectedForZOCline === true)) {
		for (let i = 0; i < store.players.length; i++) {
			//store.players[i].selectedForZOCline === true
			togglePlayerCheckbox(store.players[i])
		}
	}

	country.updateZOCuniqueSelectedPlayers()
}

function clickedZOCoverlapSelectedPlayers() {
	if (store.ZOCoverlapData.length > 0) {
		store.ZOCoverlapData.splice(0)
		return
	}

	// If no player selected, select all
	if (!store.players.some((player) => player.selectedForZOCline === true)) {
		for (let i = 0; i < store.players.length; i++) {
			//store.players[i].selectedForZOCline === true
			togglePlayerCheckbox(store.players[i])
		}
	}

	country.updateZOCoverlapSelectedPlayers()
}

const togglePlayerCheckbox = (player) => {
	player.selectedForZOCline = !player.selectedForZOCline
	country.updateZOCdisplayData()
}

function clearAllZOC() {
	store.ZOCoverlapData.splice(0)
	store.ZOCuniqueData.splice(0)
	store.ZOCpathsWithMultiples.splice(0)
	/*for (let i = 0; i < store.players.length; i++) {
		store.players[i].selectedForZOCline = false
	}*/
}
</script>

<template>
	<div id="ZOCpanelDiv">
		<span class="infoSpan" id="famineSpan">Famine Level: {{ model.getFamineLevel() }}</span>
		<br />
		<span class="infoSpan" id="pollutionSpan">
			Pollution:
			<span v-if="personal.trainingGame">{{ country.getPendingPollution(controller.currentPlayerIndex()) }}</span>
			<span v-else-if="personal.pov >= 0">{{ country.getPendingPollution(personal.pov) }}</span>
			<span v-else>{{ country.getPendingPollution(controller.currentPlayerIndex()) }}</span>
		</span>
		<br />
		<span class="infoSpan" id="graveSpan">
			Graves:
			<span v-if="personal.trainingGame">{{ city.getTotalGravesToPlace(controller.currentPlayerIndex()) }}</span>
			<span v-else-if="personal.pov >= 0">{{ city.getTotalGravesToPlace(personal.pov) }}</span>
			<span v-else>{{ city.getTotalGravesToPlace(controller.currentPlayerIndex()) }}</span>
		</span>
		<br />
		<br />
		<b><u>Map Settings</u></b>
		<br />
		<button @click="toggleFullColourHex" class="actionsLineButton">
			Map Fill:
			<span v-if="store.topMenuViews.showFullColourHex === 0">Original tile</span>
			<span v-else-if="store.topMenuViews.showFullColourHex === 1">Hybrid</span>
			<span v-else-if="store.topMenuViews.showFullColourHex === 2">Solid Colour</span>
		</button>
		<br />
		<button @click="toggleResourceIcon" class="actionsLineButton">
			Resource Icon:
			<span v-if="store.topMenuViews.resourceIconType === 0">Original</span>
			<span v-else-if="store.topMenuViews.resourceIconType === 1">Border</span>
		</button>
		<br />
		<button @click="store.topMenuViews.showMapObjects = !store.topMenuViews.showMapObjects" class="actionsLineButton">
			<span v-if="store.topMenuViews.showMapObjects">Hide Map Objects</span>
			<span v-else-if="!store.topMenuViews.showMapObjects">Show Map Objects</span>
		</button>
		<br />
		<br />
		<b><u>Zone of Control</u></b>
		<br />
		<!--<button @click="clickedZOCtoggleAll" class="actionsLineButton">Toggle ZOCs</button>-->
		<button @click="clickedZOCwithDottedLines" class="actionsLineButton">Toggle All ZoCs</button>
		<button @click="clickedZOCoverlap" class="actionsLineButton">Toggle All ZOC Overlap</button>
		<br />
		<b><u>Individual ZoC</u></b>
		<br />
		<br />
		<div v-for="(player, idx) in store.players" :key="idx" class="playerNameAndSelectDiv">
			<div @click="togglePlayerCheckbox(player)" class="mainEntryPlayerNewTurn ZOCplayerNameSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(player.colour)">{{ store.players[idx].name }}</div>

			<input type="checkbox" v-model="player.selectedForZOCline" class="playerCheckboxDiv" />
		</div>
		<button class="actionsLineButton individualZocButton" @click="clickedZOCwithDottedLinesSelectedPlayers">
			<span v-if="store.ZOCpathsWithMultiples.length > 0">Hide</span>
			<span v-else>Show</span>
			<br />
			ZoC
			<br />
			Lines
		</button>
		<button class="actionsLineButton individualZocButton" @click="clickedZOCoverlapSelectedPlayers">
			<span v-if="store.ZOCoverlapData.length > 0">Hide</span>
			<span v-else>Show</span>
			<br />
			Overlap
			<br />
			Hexes
		</button>
		<button class="actionsLineButton individualZocButton" @click="clickedZOCuniqueSelectedPlayers">
			<span v-if="store.ZOCuniqueData.length > 0">Hide</span>
			<span v-else>Show</span>
			<br />
			Unique
			<br />
			Hexes
		</button>
		<br />
		<button class="actionsLineButton" @click="clearAllZOC">Clear All</button>
	</div>
</template>

<style scoped>
#ZOCpanelDiv {
	display: inline-block;
	border: 2px solid black;
	height: fit-content;
	width: 200px;
	margin-left: 20px;
}

.playerNameAndSelectDiv {
	display: flex;
	margin-bottom: 10px;
	margin-left: auto;
	margin-right: 20px;
	/*background-color: red;*/
	width: fit-content;
}

.ZOCplayerNameSpan {
	cursor: pointer;
	border: 2px solid black;
	padding: 5px;
	align-items: end;
	text-align: right;
}
.ZOCplayerNameSpan:hover {
	border-color: yellow;
}

.playerCheckboxDiv {
	margin-left: 10px;
}
.individualZocButton {
	margin: 1px !important;
	vertical-align: middle;
	width: 64px;
}

.infoSpan {
	font-weight: bolder;
}
#famineSpan {
	font-size: 25px;
}
</style>
