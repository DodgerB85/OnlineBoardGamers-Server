<script setup>
/** The debug area is a "cheat" area, to start an action at any time.
 * Actions can be put here before being linked into the proper flow of the game.
 * It is a useful way to interact with the game without getting in the way of the main code
 * Each action should be self contained, and ideally run alaost no code here - the code
 * should be put in the relevant place (eg the XXXmodel.js file)
 */

import hexLib from "../js/hexlib.js"
import * as rf from "../js/AQYreference"
import * as map from "../js/AQYmap"
import * as controller from "../js/AQYcontroller"
import * as model from "../js/AQYmodel"
import * as funcs from "../js/AQYfuncs"
import * as city from "../js/AQYcity"
import * as country from "../js/AQYcountry"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/AQYpersonal.js"
import hexlib from "../js/hexlib"
const personal = usePersonalStore()

import { ref } from "vue"

const showDebug = ref(false)

function test1() {
	funcs.exportModel(false, true)
}
function test2() {
	//city.prettyPrint(0,0)
	/*store.historyHelpers.hexesToHighlightYellow.splice(0)
	store.ZOCpaths.splice(0)
	store.ZOCoverlapData.splice(0)
	store.historyHelpers.citySquaresToHighlight[0][0].push(0)
	store.historyHelpers.citySquaresToHighlight[0][0].push(7)
	store.historyHelpers.citySquaresToHighlight[0][0].push(14)*/
	// Example usage

}

function exportLoc() {
	store.turnResetData = funcs.exportModel()
}
function importLoc() {
	let data = store.turnResetData

	data = "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"

	funcs.importModel(data)
}

/*function addCityBldg() {
	// City
	controller.currentPlayerObj().cities.push(city.createNewCity_core(6))
}*/

function addRes(num) {
	let availableResources = controller.currentPlayerObj().availableResources
	for (let i = 0; i < availableResources.length; i++) availableResources[i] += num
	model.updateCountryBuildCalclation(controller.currentPlayerIndex(), false)
}

function endTurn() {
	// remove building flags
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].cities.length; j++) {
			for (let k = 0; k < store.players[i].cities[j].buildings.length; k++) {
				delete store.players[i].cities[j].buildings[k].builtThisTurn
				delete store.players[i].cities[j].buildings[k].builtThisTurnCost
			}
		}
	}
}

function allRise() {
	city.allRise()
}

function setCountryBldgPlacement(bldg) {
	store.context.goodsToBeProduced = -1
	store.context.hexesToHighlight = []
	store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG
	store.context.countryBuildingBeingPlaced = bldg

	// Give wood to build
	if (bldg === rf.COUNTRYSIDE_BLDG_WOODCUTTER || bldg === rf.COUNTRYSIDE_BLDG_INN || bldg === rf.COUNTRYSIDE_BLDG_FISHERY) {
		// Give wood
		controller.currentPlayerObj().availableResources[rf.RES_WOOD]++
	}
	// Woodcutter
	if (bldg === rf.COUNTRYSIDE_BLDG_WOODCUTTER) {
		country.getWoodcutterPlacementZone(controller.currentPlayerIndex())
	}
	// Mine
	else if (bldg === rf.COUNTRYSIDE_BLDG_MINE) {
		store.context.hexesToHighlight = country.getMinePlacementZone(controller.currentPlayerIndex(), store.context.goodsToBeProduced)
		//store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG
	}
	// Inn / Farm / Fishery
	else if (bldg === rf.COUNTRYSIDE_BLDG_INN || bldg === rf.COUNTRYSIDE_BLDG_FARM || bldg === rf.COUNTRYSIDE_BLDG_FISHERY) {
		if (bldg === rf.COUNTRYSIDE_BLDG_INN || bldg === rf.COUNTRYSIDE_BLDG_FARM) controller.currentPlayerObj().availableResources[rf.RES_GRAIN]++
		store.context.action = rf.ACT_CHOOSE_BUILDING_PAYMENT
	}
	// New City
	else if (bldg === rf.COUNTRYSIDE_BLDG_CITY) {
		let availableResources = controller.currentPlayerObj().availableResources
		// give wood stone gold gold
		availableResources[rf.RES_WOOD]++
		availableResources[rf.RES_STONE]++
		availableResources[rf.RES_GRAIN]++
		availableResources[rf.RES_GOLD]++
		availableResources[rf.RES_GOLD]++

		store.context.newCityPayment[1] = [rf.RES_GRAIN, rf.RES_GOLD, rf.RES_GOLD]

		store.context.action = rf.ACT_PLACE_COUNTRYSIDE_CITY
		country.getCityPlacementZone(controller.currentPlayerIndex())
	}
}

function setExplorePhase(playerIndex) {
	const zoc = country.getZocTiles(playerIndex)

	//const tiles = zoc.filter((hex) => store.mapData.explorers.map((e) => e.id).includes(hex.id))
	const tiles = zoc.filter((hex) => store.mapData.explorers.includes(hex.id))

	if (tiles.length === 0) {
		rf.doAdminAlrt("NO EXPLORABLE TILES")
		return
	}
	store.context.action = rf.ACT_EXPLORE
	store.context.hexesToHighlight = tiles
}

function cheatSwitchPlayer() {
	store.clearVars()
	store.gameflow.turnOrder.shift()
	if (store.gameflow.turnOrder.length === 0) store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	if (controller.currentPlayerObj().cities.length === 0) {
		store.gameflow.phase = rf.PHASE_FIRST_CITY
		country.getFirstCityPlacementZone()
	} else store.gameflow.phase = rf.PHASE_CITY_BUILDING
}
</script>

<template>
	<body v-if="showDebug === true">
		{{store.gameflow.phase}}
		JU: {{ store.context.historyObj }}
		<br />

		<!--{{ store.players[0].cities[0].buildings }}<br/>-->
		<br />
		<div class="optionsDiv">
			<b>Map Actions - All buildings give you required res for free</b>
			<br />
			<button @click="setCountryBldgPlacement(rf.COUNTRYSIDE_BLDG_WOODCUTTER)">woodcutter</button>
			<button @click="setCountryBldgPlacement(rf.COUNTRYSIDE_BLDG_FARM)">farm (give Grain)</button>
			<button @click="setCountryBldgPlacement(rf.COUNTRYSIDE_BLDG_FISHERY)">fisherman</button>
			<button @click="setCountryBldgPlacement(rf.COUNTRYSIDE_BLDG_MINE)">mine</button>
			<button @click="setCountryBldgPlacement(rf.COUNTRYSIDE_BLDG_INN)">inn (give Grain)</button>
			<button @click="setCountryBldgPlacement(rf.COUNTRYSIDE_BLDG_CITY)">Place City (+res)</button>
			<button @click="country.setAlchemistZoc(controller.currentPlayerIndex())">Use Fac Alch</button>
			<button @click="country.getFirstCityPlacementZone()">Place First City</button>
			<button @click="model.setHarvestPhase">CHEAT: Harvest</button>
			<button @click="model.setPollutionPhase(controller.currentPlayerIndex())" class="actionsLineButton">
				&#9760; CHEAT: Do Pollution phase
				{{ store.context.pollutionLeftToPlace }} &#9760;
			</button>
			<button @click="setExplorePhase(controller.currentPlayerIndex())" class="actionsLineButton">CHEAT: Explore</button>
		</div>
		<div class="optionsDiv">
			<b>City Actions</b>
			<br />
			<button @click="store.context.gravesLeftToPlace--">CHEAT: REMOVE GRAVE</button>
			<button @click="allRise">All Rise</button>
		</div>
		<button @click="addRes(1)">CHEAT: Add Res</button>
		<button @click="addRes(-1)">CHEAT: Remove Res</button>
		<button @click="endTurn">CHEAT: End Turn</button>
		<button @click="test1">Test 1</button>
		<button @click="test2">Test 2</button>
		<button @click="country.getExpectedHarvestResources(controller.currentPlayerIndex(), false)">getExpectedHarvestResources (false)</button>
		<button @click="country.getExpectedHarvestResources(controller.currentPlayerIndex(), true)">getExpectedHarvestResources (true)</button>

		<button @click="exportLoc">Export</button>
		<button @click="importLoc">Import</button>
		<br />
		<button @click="model.status_nicolo_20houses(store.topMenuViews.showingPlayerIndex)">Win 20People</button>
		<button @click="model.status_barbara_buildings(store.topMenuViews.showingPlayerIndex)">Win All Building</button>
		<button @click="model.status_christo_3foodLux(store.topMenuViews.showingPlayerIndex)">Win Food and Lux</button>
		<button @click="model.status_giorgio_enclosing(store.topMenuViews.showingPlayerIndex)">Win ZOC</button>
		<button @click="model.getUnpollutedArea(store.topMenuViews.showingPlayerIndex)">Check Tie</button>
		<button @click="cheatSwitchPlayer" class="actionsLineButton">CHEAT: Switch player</button>
	</body>
	<body v-else>
		<button @click="showDebug = true">Show Debug</button>
	</body>
</template>

<style scoped>
body {
	background-color: lightpink;
	padding: 10px;
}

.optionsDiv {
	display: inline-block;
	border: 2px solid black;
	padding: 2px;
}

button {
	margin: 2px;
}
</style>
