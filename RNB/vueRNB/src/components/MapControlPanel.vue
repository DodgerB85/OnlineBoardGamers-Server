<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map should be here
 *  Functions to do with manipulating the map should go in XXXmap.js
 *  Functions to do with changing the game state should probably be in XXXmodel.js
 *
 */

//import * as view from "../js/RNBview.js"
//import * as map from "../js/RNBmap"
import * as model from "../js/RNBmodel"
//import * as controller from "../js/RNBcontroller.js"
import * as rf from "../js/RNBreference"
import * as hd from "../js/RNBhex"
import * as controller from "../js/RNBcontroller"
//import * as util from "../js/RNButil"
import * as funcs from "../js/RNBfuncs"
import * as loc from "../js/RNBlocation"
import * as IO from "../backend/RNB_IO"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/RNBpersonal.js"
//import MapZoomPanel from "./MapZoomPanel.vue"
const personal = usePersonalStore()

function toggleShowTransporters() {
	store.mapData.displaySettings.showTransporters = !store.mapData.displaySettings.showTransporters
}

function cycleColourOverlay() {
	store.viewSettings.colourOverlay = (store.viewSettings.colourOverlay + 1) % 3
}

function colourOverlayLabel() {
	if (store.viewSettings.colourOverlay === 1) return "Colour Overlay: Transparent"
	if (store.viewSettings.colourOverlay === 2) return "Colour Overlay: Full"
	return "Colour Overlay: Off"
}

function toggleShowAll() {
	// If any is hidden, show all
	let anyHidden = !store.mapData.displaySettings.showTransporters || !store.mapData.displaySettings.showResources || !store.mapData.displaySettings.showRoads || !store.mapData.displaySettings.showBridges || !store.mapData.displaySettings.showBuildings || !store.mapData.displaySettings.showHomeMakres

	store.mapData.displaySettings.showTransporters = anyHidden
	store.mapData.displaySettings.showResources = anyHidden
	store.mapData.displaySettings.showRoads = anyHidden
	store.mapData.displaySettings.showBridges = anyHidden
	store.mapData.displaySettings.showWalls = anyHidden
	store.mapData.displaySettings.showBuildings = anyHidden
	store.mapData.displaySettings.showHomeMakres = anyHidden
}

/*** ADMIN DEBUG STUFF */
function changeStyle() {
	hd.changeHexStyle()
}

function resetLimits() {
	model.resetTransportersForNewTurn()
	model.resetBuildingsAfterProduction()
	for (let i = 0; i < model.getAllInGameResources().length; i++) {
		model.getAllInGameResources()[i].movedTransporterID = -1
	}
}

function fixDropFollowingToWaterMove() {
	const store = useModelStore()
	let targetAction = JSON.stringify([rf.STACK_DROP_RES_FOLLOWING, 0, [55], [16]])
	let newAction = [rf.STACK_MOVE_WATER, 0, [13, 0], [16, 0, 0], [], [1, [rf.LOCATION_BUCKET, 16, 0]]]

	for (let i = 0; i < store.history.length; i++) {
		const entry = store.history[i]
		if (entry[0] !== rf.HIST_STACK_ACTIONS) continue
		const stackActions = entry[3]
		for (let j = 1; j < stackActions.length; j++) {
			if (JSON.stringify(stackActions[j]) === targetAction) {
				const newStackActions = [...stackActions]
				newStackActions[j] = newAction
				const newEntry = [...entry]
				newEntry[3] = newStackActions
				store.history[i] = newEntry
				console.log(`fixDropFollowingToWaterMove: replaced at history[${i}][3][${j}]`)
				return true
			}
		}
	}
	console.log("fixDropFollowingToWaterMove: target action not found")

	targetAction = JSON.stringify([rf.STACK_DROP_RES_FOLLOWING, 0, [ 77 ], [ 16 ] ])
	newAction = [rf.STACK_MOVE_WATER, 0, [13, 0], [16, 0, 0], [], [1, [rf.LOCATION_BUCKET, 16, 0]]]

	for (let i = 0; i < store.history.length; i++) {
		const entry = store.history[i]
		if (entry[0] !== rf.HIST_STACK_ACTIONS) continue
		const stackActions = entry[3]
		for (let j = 1; j < stackActions.length; j++) {
			if (JSON.stringify(stackActions[j]) === targetAction) {
				const newStackActions = [...stackActions]
				newStackActions[j] = newAction
				const newEntry = [...entry]
				newEntry[3] = newStackActions
				store.history[i] = newEntry
				console.log(`fixDropFollowingToWaterMove: replaced at history[${i}][3][${j}]`)
				return true
			}
		}
	}
	console.log("fixDropFollowingToWaterMove: target action not found")

	return false
}

function debugButton() {
	/*fixDropFollowingToWaterMove()
	const res = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation([3, 16, 1, 1, 0], false)
	alert(JSON.stringify(res))*/
	
	let resources = loc.getAllResourcesAccessibleToTransporter(4, true)

	alert(JSON.stringify(resources.map(r => r.id)))
	/*const hasString = store.history.some((i) => {
		const arr3 = i[3]
		if (!Array.isArray(arr3)) return false

		// .flat(Infinity) flattens all sub-arrays regardless of depth
		return arr3.flat(Infinity).some((item) => typeof item === "string")
	})

	*/

	/*const resObj = model.getResByID("0010600800")

	for (let i = 0; i < store.history.length; i++) {
		const entry3 = store.history[i][3]
		for (let j=0;j<entry3.length;j++) {
			if (entry3[j][1] && entry3[j][1][0] && entry3[j][1][0] === "0010600800") {
				entry3[j][1][0] = 81
			}
		}
	}

	model.getResByID(31).location = loc.setOOBlocation()*/

	//wonder.addBrickToWonder_core(8, [])

	/*
	// First, copy the stack
	const stackCopy = JSON.parse(JSON.stringify(store.actionStack))
	// Then, reset the whole turnq
	context.resetWholeTurn()
	// Now verify the stack
	stack.verifyAndPerformStack(stackCopy)
	*/

	/*const start = performance.now()



	/*

			const buildingLocation = buildings.map((a) => a.location)
		const buildingReachableLocations = buildingLocation.map((location) => loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(location, true))
		const indices = util.indexArray(buildings.length).filter((i) => hasEnoughResourcesAndOutputAreaAndRemainingConversions(buildings[i], buildingReachableLocations[i]))
		context.setBuildingsToHighlight(indices.map((i) => buildings[i].id))
		*/

	//[7,31,1]
	//buildingReachableLocations: [[[0,31,0],[0,31,1],[0,31,2],[0,31,3],[0,31,4],[4,65],[4,66],[4,69],[4,67],[4,64],[3,31,5,0],[2,31,0],[7,31,0]]]

	/*for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].RnD.length; j++) {
			store.players[i].RnD[j] = 1
		}
	}*/
}

function loadGameData() {
	const gameData = ""
	funcs.simpleImportWholeRNBmodel(gameData, false)
	hd.calculateCanvasSize()
	controller.startPlayerTurn()
}
</script>

<template>
	<div id="mapControlPanelDiv">
		<b><u>Display Settings</u></b>
		<br />
		<button class="actionsLineButton" @click="toggleShowAll">
			<span v-if="store.mapData.displaySettings.showTransporters && store.mapData.displaySettings.showResources && store.mapData.displaySettings.showRoads && store.mapData.displaySettings.showBridges && store.mapData.displaySettings.showBuildings && store.mapData.displaySettings.showHomeMakres">Hide All</span>
			<span v-else>Show All</span>
		</button>
		<br />
		<button class="actionsLineButton" @click="toggleShowTransporters">
			<span v-if="store.mapData.displaySettings.showTransporters">Hide Transporters</span>
			<span v-else>Show Transporters</span>
		</button>
		<br />
		<button class="actionsLineButton" @click="store.mapData.displaySettings.showResources = !store.mapData.displaySettings.showResources">
			<span v-if="store.mapData.displaySettings.showResources">Hide Resources</span>
			<span v-else>Show Resources</span>
		</button>
		<br />
		<button class="actionsLineButton" @click="store.mapData.displaySettings.showRoads = !store.mapData.displaySettings.showRoads">
			<span v-if="store.mapData.displaySettings.showRoads">Hide Roads</span>
			<span v-else>Show Roads</span>
		</button>
		<br />
		<button class="actionsLineButton" @click="store.mapData.displaySettings.showBridges = !store.mapData.displaySettings.showBridges">
			<span v-if="store.mapData.displaySettings.showBridges">Hide Bridges</span>
			<span v-else>Show Bridges</span>
		</button>
		<br />
		<button class="actionsLineButton" @click="store.mapData.displaySettings.showWalls = !store.mapData.displaySettings.showWalls">
			<span v-if="store.mapData.displaySettings.showWalls">Hide Walls</span>
			<span v-else>Show Walls</span>
		</button>
		<br />
		<button class="actionsLineButton" @click="store.mapData.displaySettings.showBuildings = !store.mapData.displaySettings.showBuildings">
			<span v-if="store.mapData.displaySettings.showBuildings">Hide Buildings</span>
			<span v-else>Show Buildings</span>
		</button>
		<br />
		<button class="actionsLineButton" @click="store.mapData.displaySettings.showHomeMakres = !store.mapData.displaySettings.showHomeMakres">
			<span v-if="store.mapData.displaySettings.showHomeMakres">Hide Home Markers</span>
			<span v-else>Show Home Makers</span>
		</button>
		<br />
		<button class="actionsLineButton" @click="cycleColourOverlay">
			<span>{{ colourOverlayLabel() }}</span>
		</button>

		<div class="adminDebugDiv" v-if="rf.DEBUG_USERS.includes(personal.name)">
			<b><u>ADMIN DEBUG STUFF</u></b>
			<br />
			<button class="actionsLineButton hexStyleButton" @click="changeStyle">
				<!-- Pointy Top: Just the "Roof" with a 2-unit gap at the top -->
				<svg class="actionsLineButtonSvg" viewBox="0 0 32 12" v-if="store.hexStyle === rf.POINTY">
					<!-- 
						Points:
						16,2  -> Top Point (Shifted down 2 units for the gap)
						32,12 -> Bottom Right Corner
						0,12  -> Bottom Left Corner
					-->
					<polygon points="16,2 32,12 0,12" fill="currentColor" />
				</svg>

				<!-- Flat Top: The "Clipped Rectangle" with a 2-unit gap at the top -->
				<svg class="actionsLineButtonSvg" viewBox="0 0 32 12" v-else>
					<polygon points="8,2 24,2 32,12 0,12" fill="currentColor" />
				</svg>
			</button>
			<button class="actionsLineButton" @click="debugButton">Debug Btn</button>
			<button class="actionsLineButton" @click="resetLimits">Reset Limits</button>
			<button class="actionsLineButton" @click="loadGameData">Load Game</button>
			<button class="actionsLineButton" @click="IO.saveGame(false)">Save Game</button>
		</div>
	</div>
</template>

<style scoped>
#mapControlPanelDiv {
	display: inline-block;
	border: 2px solid black;
	height: fit-content;
	width: 150px;
	min-width: 150px;
	margin-left: 2px;
}

.adminDebugDiv {
	background-color: lightpink;
}

.hexStyleButton {
	display: inline-flex; /* Ensures flex properties work */
	align-items: center;
	justify-content: center;
	vertical-align: middle; /* Aligns this button with the text-based buttons */
	min-width: 50px;
	height: 30px; /* Use fixed height instead of min-height to match others */
	padding: 0;
	overflow: hidden; /* Clips any stray paths */
}

.actionsLineButtonSvg {
	height: 100%; /* Now stretches to the full 30px height */
	width: auto;
	display: block;
}
</style>
