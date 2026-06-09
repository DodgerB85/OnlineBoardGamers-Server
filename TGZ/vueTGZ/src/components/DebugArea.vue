<script setup>
import * as WS from "../js/TGZwebsocket"
import * as map from "../js/TGZmap"
import * as rf from "../js/TGZreference"
import * as model from "../js/TGZmodel"
import * as funcs from "../js/TGZfuncs"
import * as controller from "../js/TGZcontroller"
import * as seed from "../js/TGZseed"
//import { storeToRefs } from 'pinia'
import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
//const modelRefs = storeToRefs(model);

import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

import { ref } from "vue"

const fullDebug = ref(true)
//import * as constants from '../constants'

function calcCmanIncome() {
	let res = []
	for (let i = 0; i < store.history.length; i++) {
		if (store.history[i][0] === rf.HIST_RAISE_MON) {
			for (let j = 1; j < store.history[i][3].length; j++) {
				let priCraftsmanIndex = store.history[i][3][j][0][0]
				let cowIncome = store.history[i][3][j][0][2]

				let subArr = res.find((subArr) => subArr[0] === priCraftsmanIndex)
				if (subArr === undefined) {
					res.push([priCraftsmanIndex, cowIncome])
				} else {
					subArr[1] += cowIncome
				}
				if (store.history[i][3][j].length > 2) {
					let priCraftsmanIndex = store.history[i][3][j][2][0]
					let cowIncome = store.history[i][3][j][2][2]

					let subArr = res.find((subArr) => subArr[0] === priCraftsmanIndex)
					if (subArr === undefined) {
						res.push([priCraftsmanIndex, cowIncome])
					} else {
						subArr[1] += cowIncome
					}
				}
			}
		}
	}

	console.log(JSON.stringify(res, null, 4))
}

function test() {
	model.calcSpecsandgodsIncome()
	//store.context.indexesToHighlightClick.splice(0)
	//store.context.indexesToHighlightClick = map.expandWater(0)
	//store.context.indexesToHighlightClick = map.getAllSquaresOfSameType(rf.WOOD_SQ)

	//store.context.indexesToHighlightClick = map.getAllSquaresAndHubsWithinRangeOfArea([0], 3)[0]
	//store.context.indexesToHighlightRed = map.getAllSquaresAndHubsWithinRangeOfArea([0], 3)[1]

	//let resource_sq = rf.getPrimaryResourceSqSSSS(store.context.itemBeingAdded)
	//store.context.indexesToPipGreen = map.getAllSquaresOfTypeWithinRangeOfIndex(1, 3, resource_sq)[0]

	// store.context.indexesToPipGreen = map.getAllCraftsmanPrimaryIndexesWithinRangeOfIndex(11, 6, rf.WOOD_SQ)

	//store.mapTiles = [0,0,1,1,2,2,3,3]
	//map.initCoords()
	//alert(JSON.stringify(map.getCraftsmanDataFromAnySq(48, true)))
	//alert(store.players[0].craftsmen[1])
	//alert(map.getAllUndepletedResourceSquaresToHighlight(store.players[0].craftsmen[1], 3))
	//store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs([0], 3, 0)
}
function test2() {
	let res = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs([0, 1], 3, -9)
	alert(JSON.stringify(res, 4, null))
	alert(res.length)
	/* store.context.indexesToHighlightClick.splice(0)
   store.context.indexesToHighlightRed.splice(0)
   store.context.indexesToHighlightGreen.splice(0)*/

	store.context.indexesToHighlightRed = res[0]
	if (res.length >= 2) store.context.indexesToHighlightClick = res[1]
	if (res.length >= 3) store.context.indexesToHighlightGreen = res[2]
}

function exportLoc() {
	console.log(funcs.exportModel())
	store.turnResetData = funcs.exportModel()
}
function importLoc() {
	// var data =
	//   'NrDeCIDsEMFsFNwC5wBd4GdUAUA20BPeAJ3ABpwATASwwAd8CA5ORFdLPQkgESfPABjAPa5hpJAAYKsYZACuCSKgzJgAXQqDi0AGYqla9QF9NwaQGYyVgExkAbNbIAOMjbPA7kswEYA7GQ+ZhZ27mZmXk6R0j6BZNIJ8UmJiQAscbGJjilOidFkAKzJSfnpOWnF5ZXFRbGZJcX5iXUZrS1WMa1VltUt9VXZ1bXVzXFV-WRlSS2JRZ3dI8WZmhCo8sSQyNLgdAAW0Bhs22sbAPLElCRq3hS68ri4ACrrkOeXEhoUAOasAKKQl0oW2MZGARVsTisUMhMOcHnqFlinni6l8SRCoP8gVRmPRRWAGLCK3A+wwpwARtBUPhkLpoLhDhRSUxhLBoJRVEg6Qz4EyDr8MLt5LT6YzwAB1ADCAH06MRqII2LFwNhZfLFchlQBJGVyhVKig8XXqpWmIA'

	let data = store.turnResetData
	funcs.importModel(data)
}

function setupPlaceMonument() {
	store.context.action = rf.ACT_BUILD_MON
	store.context.monumentsToPlace = 1
	if (model.has_god(controller.currentPlayerObj(), rf.OBATALA)) store.context.monumentsToPlace = 2
	store.context.indexesToHighlightClick.splice(0)
	store.context.indexesToHighlightClick = map.getSpacesForMonument(model.hasNomads(controller.currentPlayerObj()), false)
}

function setupPlaceStartingMonument() {
	store.context.action = rf.ACT_BUILD_MON
	store.context.monumentsToPlace = 1
	store.context.indexesToHighlightClick.splice(0)
	store.context.indexesToHighlightClick = map.getSpacesForMonument(false, true)
}

function setupPlaceResource(resource) {
	store.clearVars()
	if (store.remainingItems[resource] === 0) {
		alert("None Left")
		return
	}
	store.context.action = rf.ACT_BUILD_RES
	store.context.itemBeingAdded = resource
	store.context.itemBeingAddedRotation = 0
	if (resource === rf.WATER_TILE) store.context.itemBeingAddedRotation = 1
	store.context.indexesToHighlightClick = map.getSpacesForResource()
}

function setupPlacePriCraftsman(craftsman) {
	store.clearVars()
	if (store.remainingItems[craftsman] === 0) {
		alert("None Left")
		return
	}

	store.context.action = rf.ACT_BUILD_PRI_CRAFTSMAN
	store.context.itemBeingAdded = craftsman
	store.context.itemBeingAddedRotation = 0
	if (rf.ROTATABLE_TILES.includes(craftsman)) store.context.itemBeingAddedRotation = 1
	store.context.indexesToHighlightClick.splice(0)
	store.context.range = model.has_god(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3
	//  return [validSquares, availableResourcesSquares, takenResourcesSquares]
	let craftsmanPlacingInfo = map.getAllowedIndexesToPlacePriCraftsman(craftsman, store.context.range, store.context.itemBeingAddedRotation)
	store.context.indexesToHighlightClick = craftsmanPlacingInfo[0]
	//store.context.indexesToHighlightGreen = craftsmanPlacingInfo[1]
	//store.context.indexesToHighlightRed = craftsmanPlacingInfo[2]
	store.context.indexesToPipRed = craftsmanPlacingInfo[1].concat(craftsmanPlacingInfo[2])
}

function setupPlaceSecCraftsman(craftsman) {
	if (store.remainingItems[craftsman] === 0) {
		alert("None Left")
		return
	}
	store.context.action = rf.ACT_BUILD_SEC_CRAFTSMAN
	store.context.itemBeingAdded = craftsman
	store.context.itemBeingAddedRotation = 0
	if (rf.ROTATABLE_TILES.includes(craftsman)) store.context.itemBeingAddedRotation = 1
	store.context.indexesToHighlightClick.splice(0)
	store.context.range = model.has_god(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3
	let craftsmanPlacingInfo = map.getAllowedIndexesToPlaceSecCraftsman(craftsman, store.context.range, store.context.itemBeingAddedRotation)
	store.context.indexesToHighlightClick = craftsmanPlacingInfo[0]
	//store.context.indexesToHighlightGreen = craftsmanPlacingInfo[1]
	//store.context.indexesToHighlightRed = craftsmanPlacingInfo[2]
	store.context.indexesToPipRed = craftsmanPlacingInfo[1].concat(craftsmanPlacingInfo[2])
}

function setupRaiseMonument() {
	store.actionResetData = funcs.exportModel(false)
	model.setupRaiseMonument()
}

function setupSetPrices() {
	store.context.action = rf.ACT_SET_PRICES
	store.context.choosingPrices = [...controller.currentPlayerObj().craftsmenPrices]
}

function setDebug_god(godType) {
	model.add_godToPlayer(controller.currentPlayerObj(), godType)
}

function swapTile(item, index) {
	store.mapTiles[index * 2]++
	if (store.mapTiles[index * 2] === 11) store.mapTiles[index * 2] = 1
	map.initCoords()
	controller.startPlayerTurn()
}
function rotateTile(item, index) {
	store.mapTiles[index * 2 + 1]++
	if (store.mapTiles[index * 2 + 1] === 4) store.mapTiles[index * 2 + 1] = 0
	map.initCoords()
	controller.startPlayerTurn()
}
function newMap(num) {
	map.newMap(num)
	store.players = seed.getPlayerSeed(num)
	store.gameflow.fullTurnOrder.splice(0)
	store.gameflow.turnOrder.splice(0)
	for (let i = 0; i < num; i++) {
		store.gameflow.fullTurnOrder.push(i)
		store.gameflow.turnOrder.push(i)
	}
	controller.startPlayerTurn()
}
</script>

<template>
	<body v-if="rf.debugUsers.includes(personal.name)">
		<template v-if="fullDebug">
			{{ store.context.historyObj }}
			<br />

			<!--<div class="optionsDiv">
        <span id="mapPrint">{{ map.prettyPrint() }}</span>
      </div>
      <br />-->
		</template>
		<!-- <br />CurrentPlayer: {{ store.currentPlayer() }}
  <br />canPlay: {{ personal.canPlay() }} 
  <br />turnOrder: {{ store.gameflow.turnOrder }}-->

		<div v-if="store.history.length === 0" class="optionsDiv">
			<b>Generate New Map</b>
			<br />
			<button @click="newMap(2)">New 2p Map</button>
			<br />
			<button @click="newMap(3)">New 3p Map</button>
			<br />
			<button @click="newMap(4)">New 4p Map</button>
			<br />
			<button @click="newMap(5)">New 5p Map</button>
			<br />
		</div>

		<div v-if="store.history.length === 0" class="optionsDiv">
			<b>Edit Map</b>
			<br />
			<template v-for="(item, index) in map.getMapDisplayArray()" :key="index">
				<button v-if="!(store.mapTiles.length === 8 && index === 0) && !(store.mapTiles.length === 12 && index === 4) && !(store.mapTiles.length === 14 && index === 3) && !(store.mapTiles.length === 18 && index === 4)" @click="swapTile(item, index)">Swap Tile</button>
				<button @click="rotateTile(item, index)">Rotate</button>
				<br />
			</template>
		</div>

		<button v-if="fullDebug" @click="model.endGame">END GAME</button>
		<br />

		<div class="optionsDiv">
			<b>Place Monument</b>
			<br />

			<button @click="setupPlaceMonument">Place Monument</button>
			<br />
			<button @click="setupPlaceStartingMonument">Place Starting Monument</button>
			<br />
		</div>
		<div class="optionsDiv">
			<b>Place resource</b>
			<br />
			<button @click="setupPlaceResource(rf.WOOD_TILE)">Wood ({{ store.remainingItems[rf.WOOD_TILE] }})</button>
			<br />
			<button @click="setupPlaceResource(rf.CLAY_TILE)">Clay ({{ store.remainingItems[rf.CLAY_TILE] }})</button>
			<br />
			<button @click="setupPlaceResource(rf.IVORY_TILE)">Ivory ({{ store.remainingItems[rf.IVORY_TILE] }})</button>
			<br />
			<button @click="setupPlaceResource(rf.DIAMOND_TILE)">Diamond ({{ store.remainingItems[rf.DIAMOND_TILE] }})</button>
			<br />
			==========
			<br />
			<button @click="setupPlaceResource(rf.WATER_TILE)">Water ({{ store.remainingItems[rf.WATER_TILE] }})</button>
			<br />
		</div>

		<div class="optionsDiv">
			<b>Place craftsman</b>
			<br />
			<button @click="setupPlacePriCraftsman(rf.WOOD_CARVER_TILE)">Wood Carver ({{ store.remainingItems[rf.WOOD_CARVER_TILE] }})</button>
			<br />
			<button @click="setupPlacePriCraftsman(rf.POTTER_TILE)">Potter ({{ store.remainingItems[rf.POTTER_TILE] }})</button>
			<br />
			<button @click="setupPlacePriCraftsman(rf.IVORY_CARVER_TILE)">Ivory Carver ({{ store.remainingItems[rf.IVORY_CARVER_TILE] }})</button>
			<br />
			<button @click="setupPlacePriCraftsman(rf.DIAMOND_CUTTER_TILE)">Diamond Cutter ({{ store.remainingItems[rf.DIAMOND_CUTTER_TILE] }})</button>
			<br />
		</div>

		<div class="optionsDiv">
			<b>Place Sec Craftsman</b>
			<br />
			<button @click="setupPlaceSecCraftsman(rf.SCULPTOR_TILE)">Sculptor ({{ store.remainingItems[rf.SCULPTOR_TILE] }})</button>
			<br />
			<button @click="setupPlaceSecCraftsman(rf.VESSEL_MAKER_TILE)">Vessel Maker ({{ store.remainingItems[rf.VESSEL_MAKER_TILE] }})</button>
			<br />
			<button @click="setupPlaceSecCraftsman(rf.THRONE_MAKER_TILE)">Throne Maker ({{ store.remainingItems[rf.THRONE_MAKER_TILE] }})</button>
			<br />
			<button @click="setupSetPrices">Set prices</button>
			<br />
		</div>

		<div class="optionsDiv">
			<b>Raise Monuments</b>
			<br />
			<button @click="setupRaiseMonument">Raise Monuments</button>
			<br />
		</div>

		<div class="optionsDiv">
			<b>god</b>
			<br />
			<button @click="setDebug_god(rf.SHADIPINYI)">SHADIPINYI</button>
			<br />
			<button @click="setDebug_god(rf.ELEGUA)">ELEGUA</button>
			<button @click="setDebug_god(rf.DZIVA)">DZIVA</button>
			<br />
			<button @click="setDebug_god(rf.ESHU)">ESHU</button>
			<button @click="setDebug_god(rf.GU)">GU</button>
			<br />
			<button @click="setDebug_god(rf.OBATALA)">OBATALA</button>
			<button @click="setDebug_god(rf.ATETE)">ATETE</button>
			<br />
			<button @click="setDebug_god(rf.TSUI_GOAB)">TSUI_GOAB</button>
			<br />
			<button @click="setDebug_god(rf.ANANSI)">ANANSI</button>
			<button @click="setDebug_god(rf.QAMATA)">QAMATA</button>
			<br />
			<button @click="setDebug_god(rf.ENGAI)">ENGAI</button>
			<button @click="setDebug_god(rf.XANGO)">XANGO</button>
			<br />
		</div>

		<div v-if="fullDebug" class="optionsDiv">
			<b>Player Colour</b>
			<br />
			<button @click="personal.preferredColour = 0">Black</button>
			<br />
			<button @click="personal.preferredColour = 1">Green</button>
			<br />
			<button @click="personal.preferredColour = 2">Red</button>
			<br />
			<button @click="personal.preferredColour = 3">White</button>
			<br />
			<button @click="personal.preferredColour = 4">Yellow</button>
			<br />
		</div>
		Cows:
		<input v-model="controller.currentPlayerObj().cows" placeholder="edit me" id="cowsNumber" />

		<button @click="controller.currentPlayerObj().cows++">+</button>
		<button @click="controller.currentPlayerObj().cows--">-</button>
		<template v-if="fullDebug">
			<button @click="test">Test</button>
			<button @click="test2">Test2</button>

			<!--<button @click="store.context.indexesToHighlightClick = map.getAllSquaresWithinRangeOfZone([21], 6, true)[0]">0
    </button>
    <button @click="store.context.indexesToHighlightClick = map.getAllSquaresWithinRangeOfZone([21], 6, true)[1]">1
    </button>
    <button @click="store.context.indexesToHighlightClick = map.getAllSquaresWithinRangeOfZone([21], 6, true)[2]">2
    </button>
    <button @click="store.context.indexesToHighlightClick = map.getAllSquaresWithinRangeOfZone([21], 6, true)[3]">3
    </button>
    <button @click="store.context.indexesToHighlightClick = map.getAllSquaresWithinRangeOfZone([21], 6, true)[4]">4
    </button>
    <button @click="store.context.indexesToHighlightClick = map.getAllSquaresWithinRangeOfZone([21], 6, true)[5]">5
    </button>
    <button @click="store.context.indexesToHighlightClick = map.getAllSquaresWithinRangeOfZone([21], 6, true)[6]">6
    </button>-->

			<button @click="exportLoc">export</button>
			<button @click="importLoc">import</button>
			<button @click="WS.TGZwebSocket.close()">Close WS</button>
			<button @click="calcCmanIncome">Calc Cman Income</button>

			[debug]count
		</template>
	</body>
</template>

<style scoped>
#cowsNumber {
	width: 20px;
}

body {
	background-color: lightpink;
	padding: 10px;
}

#mapPrint {
	font-family: monospace;
	white-space: pre;
	width: fit-content;
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
