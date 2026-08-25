<script setup>
/** The debug area is a "cheat" area, to start an action at any time.
 * Actions can be put here before being linked into the proper flow of the game.
 * It is a useful way to interact with the game without getting in the way of the main code
 *
 *
 */

import * as rf from "../js/RNBreference"
//import * as map from "../js/RNBmap"
import * as controller from "../js/RNBcontroller"
import * as model from "../js/RNBmodel"
import * as funcs from "../js/RNBfuncs"
import * as util from "../js/RNButil"
import * as context from "../js/RNBcontext"
//import * as computes from "../js/RNBcomputes"
import * as wonder from "../js/RNBwonder"
import * as stack from "../js/RNBstack"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

document.addEventListener("keyup", function (event) {
	if (store.viewSettings.showChat) return
	else if (event.key.toLowerCase() === "b") {
		startBridges()
	} else if (event.key == "r") {
		startRoad()
	}
})

function highlightAllPieces() {
	context.resetContextAndHighlights()
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		for (const bucketId of util.uniqueOnly(hex.bucketIdsCurrent)) {
			context.addHexPieceToHighlight([store.mapData.hexData[i].hexID, model.hexCurrentBucketToInitial(store.mapData.hexData[i].hexID, bucketId)])
		}
	}
}

function startBridges() {
	context.resetContextAndHighlights()
	store.context.action = rf.ACT_BUILD_BRIDGE

	// 1. Create a local, non-reactive array
	const eligibleBridges = []

	const hexes = store.mapData.hexData
	for (let i = 0; i < hexes.length; i++) {
		const hex = hexes[i] // Minor optimization: local reference
		for (let j = 0; j < hex.bridges.length; j++) {
			const bridge = hex.bridges[j]

			if (!util.includesArray(hex.builtBridges, bridge)) {
				// 2. Push to the local array (no reactivity triggered yet)
				eligibleBridges.push([hex.hexID, [...bridge]])
			}
		}
	}

	// 3. Update the store ONCE.
	// This triggers exactly one recompute for the entire operation.
	store.context.eligibleBridgesToBuild = eligibleBridges
}

function startRoad() {
	context.resetContextAndHighlights()
	store.context.action = rf.ACT_BUILD_ROAD
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		if (rf.TERR_ANY_LAND.includes(hex.currentTerrain)) {
			for (const bucketId of hex.bucketIdsInitial) {
				context.addHexPieceToHighlight([store.mapData.hexData[i].hexID, [bucketId]])
			}
		}
	}
}

function startPowerLine() {
	context.resetContextAndHighlights()
	store.context.action = rf.ACT_ADMIN_ADD_POWER_LINE
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		for (const bucketId of hex.bucketIdsInitial) {
			context.addHexPieceToHighlight([store.mapData.hexData[i].hexID, [bucketId]])
		}
	}
}

function startAdminAddRes() {
	context.resetContextAndHighlights()
	store.context.action = rf.ACT_ADMIN_ADD_RES
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		for (const bucketId of hex.bucketIdsInitial) {
			context.addHexPieceToHighlight([store.mapData.hexData[i].hexID, [bucketId]])
			//context.addHexPieceToHighlight([bucketId].map(model.withInitialBuckets))
		}
	}
}

function startAdminAddBldg() {
	context.resetContextAndHighlights()
	store.context.action = rf.ACT_ADMIN_ADD_BLDG
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		for (const bucketId of hex.bucketIdsInitial) {
			context.addHexPieceToHighlight([store.mapData.hexData[i].hexID, [bucketId]])
			//context.addHexPieceToHighlight([bucketId].map(model.withInitialBuckets))
		}
	}
}

function startAdminAddTransp() {
	context.resetContextAndHighlights()
	store.context.action = rf.ACT_ADMIN_ADD_TRANSPORTER
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		for (const bucketId of hex.bucketIdsInitial) {
			context.addHexPieceToHighlight([store.mapData.hexData[i].hexID, [bucketId]])
			//context.addHexPieceToHighlight([bucketId].map(model.withInitialBuckets))
		}
	}
}

function testButton() {
	//let output = funcs.simpleExportWholeRNBmodel()
	//funcs.simpleImportWholeRNBmodel(output)
	// aerIndex: 0, transporterType: 33 location: 3,7,3,0
}

function testButton2() {
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		// Irrigate the deserts
		if (store.mapData.hexData[i].currentTerrain === rf.TERR_DESERT) {
			store.mapData.hexData[i].currentTerrain = rf.TERR_PASTURE
			store.mapData.hexData[i].hexGfx += "_irrigated"
		}
	}
}

function verifyStack() {
	// First, copy the stack
	const stackCopy = JSON.parse(JSON.stringify(store.actionStack))
	// Then, reset the whole turnq
	context.resetWholeTurn()
	// Now verify the stack
	stack.verifyAndPerformStack(stackCopy)
}

function emmaFunction() {
	alert("ALL HORSES! SAY I LOVE EMMA!!!!")
}

function alexButton() {
	alert("FART!!!!!")
}

function giveAllResearch() {
	for (const playerObj of store.players) {
		playerObj.RnD =  [1,1, 1, 1, 1, 1, 1, 1]
	}
}
</script>

<template>
	<body>
				CompHexCount: {{ store.debugVars.computedHexCounter }}
		<br />
		Stack: {{ store.actionStack }} // UndoPoints {{ store.undoPoints.length }}
		<br />
		{{ store.context.hexPiecesToHighlight }}
		<br />
		<br/>
		CompHexCount: {{ store.debugVars.computedHexCounter }}<br/>
		<div class="optionsDiv">
			<b>Actions</b>
			<br />
			<label for="resource-select">Select Resource:</label>

			<select v-model="store.adminCheatMoveData.selectedRes" id="resource-select">
				<option v-for="(res, index) in rf.ALL_RES_STRINGS" :key="res" :value="index">
					{{ res }}
				</option>
			</select>
			<button class="actionsLineButton" @click="startAdminAddRes">Add Res</button>
			<br />
			<label for="resource-select">Select Bldg:</label>

			<select v-model="store.adminCheatMoveData.selectedBldg" id="resource-select">
				<option v-for="(bldg, index) in rf.ALL_BUILDING_STRINGS" :key="index" :value="rf.ALL_BUILDINGS[index]">
					{{ bldg }}
				</option>
			</select>
			<button class="actionsLineButton" @click="startAdminAddBldg">Add Bldg</button>
			<br />

			<label for="player-select" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.adminCheatMoveData.selectedTransportPlayerIndex]?.colour)">Select Transp:</label>

			<select v-model="store.adminCheatMoveData.selectedTransportPlayerIndex" id="player-select">
				<option v-for="(player, index) in store.players" :key="index" :value="index">
					{{ player.name }}
				</option>
			</select>

			<select v-model="store.adminCheatMoveData.selectedTransporter" id="transporter-select">
				<option v-for="(transporter, index) in rf.ALL_TRANSPORTER_STRINGS" :key="index" :value="index + 30">
					{{ transporter }}
				</option>
			</select>
			<button class="actionsLineButton" @click="startAdminAddTransp">Add Transp</button>

			<br />

			<button class="actionsLineButton" @click="startBridges">CHEAT: Bridge</button>
			<button class="actionsLineButton" @click="startRoad">CHEAT:Road</button>
			<button class="actionsLineButton" @click="startPowerLine">CHEAT: Power</button>
			<button class="actionsLineButton" @click="wonder.addBrickToWonder(0)">P0 brick</button>
			<button class="actionsLineButton" @click="wonder.addBrickToWonder(1)">P1 brick</button>
			<button class="actionsLineButton" @click="wonder.addBrickToWonder(9)">N brick</button>
		</div>

		<button class="actionsLineButton" @click="verifyStack">Verify Stack</button>
		<button class="actionsLineButton" @click="testButton">Test</button>
		<button class="actionsLineButton" @click="testButton2">Test 2</button>
		<button class="actionsLineButton" @click="highlightAllPieces">Highlight All Pieces</button>
		<button class="actionsLineButton" @click="model.addResourceToGame_core(rf.LOCATION_BUCKET, rf.RES_COINS, [1, 0])">Add Res</button>
		<button class="actionsLineButton" @click="funcs.clearMap()">Clear Map</button>
		<button class="actionsLineButton" @click="funcs.importMapOnly()">Import Map</button>
		<button class="actionsLineButton" @click="giveAllResearch">Give all Research</button>		
		<button class="actionsLineButton" @click="emmaFunction">Emma's button</button>
		<button class="actionsLineButton" @click="alexButton">Alex's Button</button>

		<br />
		refSize: {{ controller.currentPlayerObj() }}
		<br />
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
