<script setup>
/**
 * This is where you select the hexes to add to the map
 * It is only meant for user by the developers to create maps.
 * It will probably also be adapted and released as a map creator
 *
 */
import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()

//import * as view from "../../js/RNBview"
import * as map from "../../js/RNBmap"
import * as rf from "../../js/RNBreference"
//import * as util from "../../js/RNButil.js"
//import * as controller from "../../js/RNBcontroller"
//import * as model from "../../js/RNBmodel"
import * as hd from "../../js/RNBhex"
import * as view from "../../js/RNBview"
import * as ME from "./RNBmapEditor.js"
import * as context from "../../js/RNBcontext"
import * as funcs from "../../js/RNBfuncs"
//import * as stack from "../../js/RNBstack"

import { ref, reactive, computed } from "vue"

// Props to receive from parent component
const props = defineProps({
	playerCount: {
		type: Number,
		default: 2,
	},
	canReplaceMap: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(["update:playerCount", "update:canReplaceMap"])

// Computed property that includes admin exception for canReplaceMap
const effectiveCanReplaceMap = computed(() => props.canReplaceMap || personal.name === "admin")

const hexRotations = reactive([])
const hexTerrainIDs = ref([])
const mapName = ref("")
const mapDescription = ref("")
const isVerified = ref(false)
const saveMessage = ref("")
const messageType = ref("") // "success" or "error"

// Load map state
const existingMaps = ref([])
const selectedMapId = ref("")

function clickedNewHexOption(hexIndex) {
	clearMessages() // Clear messages when clicking hex options
	store.context.action = rf.ACT_PLACE_HEX
	// This parseInt is required
	store.context.hexTerrainIDbeingAdded = parseInt(hexTerrainIDs.value[hexIndex])
	store.context.hexBeingAddedRotation = hexRotations[hexIndex]

	hd.setPlaceableTiles()
	hd.calculateCanvasSize(true)
	map.updateEdgeData()
	hd.updateAllHexRawXY()
}

function cancelHexPlacement() {
	context.resetContextAndHighlights()
}

function rotateNewHexTile(hexIndex, dir, fromSingleHex) {
	clearMessages() // Clear messages when rotating tiles
	// Update the rotation property

	if (fromSingleHex) {
		const rotation = (store.context.hexBeingAddedRotation + 6 + dir) % 6
		store.context.hexBeingAddedRotation = rotation
		const idx = hexTerrainIDs.value.indexOf(String(store.context.hexTerrainIDbeingAdded >= 10 ? store.context.hexTerrainIDbeingAdded : "0" + String(store.context.hexTerrainIDbeingAdded)))
		hexRotations[idx] = rotation
	} else {
		const rotation = (hexRotations[hexIndex] + 6 + dir) % 6
		hexRotations[hexIndex] = rotation
		if (store.context.hexTerrainIDbeingAdded === parseInt(hexTerrainIDs.value[hexIndex])) {
			store.context.hexBeingAddedRotation = rotation
		}
	}
	/*const idx = hexTerrainIDs.value.indexOf(store.context.hexTerrainIDbeingAdded)
	if (idx !== -1) {
		hexRotations[idx] = rotation
	}*/
}

function setHexOptions() {
	hexTerrainIDs.value = rf.GROUP_DESERT.concat(rf.GROUP_DESERT_RIVERS).concat(rf.GROUP_PASTURE).concat(rf.GROUP_PASTURE_RIVERS).concat(rf.GROUP_ROCK).concat(rf.GROUP_ROCK_RIVERS).concat(rf.GROUP_WOODS).concat(rf.GROUP_WOODS_RIVERS).concat(rf.GROUP_MOUNTAIN).concat(rf.GROUP_MOUNTAIN_RIVERS).concat(rf.GROUP_SEA).concat(rf.GROUP_BLANK) //.concat(rf.GROUP_POLDER).concat(rf.GROUP_CITY)
	// Convert to string, make at least length 2
	hexTerrainIDs.value = hexTerrainIDs.value.map((x) => String(x).padStart(2, "0"))
	hexRotations.splice(0)
	for (let i = 0; i < hexTerrainIDs.value.length; i++) hexRotations.push(0)
}

setHexOptions()

function saveMap() {
	// Clear any existing messages
	clearMessages()

	// Pass map name, description, player count, and isVerified to save function
	ME.saveMapToDB(mapName.value, mapDescription.value, props.playerCount, isVerified.value)
		.then((success) => {
			if (success) {
				saveMessage.value = "Map saved successfully - you can now select it when creating a game"
				messageType.value = "success"
				context.resetContextAndHighlights()
				funcs.clearMap()
				mapName.value = ""
				mapDescription.value = ""
				isVerified.value = false
				fetchExistingMaps()
			} else {
				saveMessage.value = "Failed to save map. Please try again."
				messageType.value = "error"
			}
		})
		.catch((error) => {
			console.error("Save error:", error)
			saveMessage.value = "Error saving map. Please try again."
			messageType.value = "error"
		})
}

function replaceMap() {
	clearMessages()

	if (!selectedMapId.value) {
		saveMessage.value = "No map selected to replace"
		messageType.value = "error"
		return
	}

	ME.replaceMapInDB(parseInt(selectedMapId.value), mapName.value, mapDescription.value, props.playerCount, isVerified.value)
		.then((success) => {
			if (success) {
				saveMessage.value = "Map replaced successfully"
				messageType.value = "success"
				fetchExistingMaps()
			} else {
				saveMessage.value = "Failed to replace map. Please try again."
				messageType.value = "error"
			}
		})
		.catch((error) => {
			console.error("Replace error:", error)
			saveMessage.value = "Error replacing map. Please try again."
			messageType.value = "error"
		})
}

function deleteMap() {
	clearMessages()

	if (!selectedMapId.value) {
		saveMessage.value = "No map selected to delete"
		messageType.value = "error"
		return
	}

	if (!confirm("Are you sure you want to delete this map? This action cannot be undone.")) {
		return
	}

	ME.deleteMapFromDB(parseInt(selectedMapId.value))
		.then((success) => {
			if (success) {
				saveMessage.value = "Map deleted successfully"
				messageType.value = "success"
				selectedMapId.value = ""
				fetchExistingMaps()
				funcs.clearMap()
				mapName.value = ""
				mapDescription.value = ""
				isVerified.value = false
			} else {
				saveMessage.value = "Failed to delete map. Please try again."
				messageType.value = "error"
			}
		})
		.catch((error) => {
			console.error("Delete error:", error)
			saveMessage.value = "Error deleting map. Please try again."
			messageType.value = "error"
		})
}

function clearMessages() {
	saveMessage.value = ""
	messageType.value = ""
}

async function fetchExistingMaps() {
	try {
		const response = await fetch("/RNB/getRNBmaps/")
		const data = await response.json()
		if (data.success) {
			existingMaps.value = data.maps
			existingMaps.value.sort((a, b) => {
				if (a.playerCount !== b.playerCount) {
					return a.playerCount - b.playerCount
				}
				if (a.isVerified !== b.isVerified) {
					return b.isVerified - a.isVerified
				}
				return a.name.localeCompare(b.name)
			})
		}
	} catch (error) {
		console.error("Error fetching maps:", error)
	}
}

async function loadMap() {
	if (!selectedMapId.value) {
		return
	}

	clearMessages()

	const selectedMap = existingMaps.value.find((m) => m.id === parseInt(selectedMapId.value))
	if (!selectedMap) {
		return
	}

	try {
		funcs.importStartingMap(selectedMap.hexData)
		mapName.value = selectedMap.name
		mapDescription.value = selectedMap.description
		isVerified.value = selectedMap.isVerified || false
		emit("update:playerCount", selectedMap.playerCount)
		emit("update:canReplaceMap", selectedMap.canReplace || personal.name === "admin")
		saveMessage.value = "Map loaded successfully"
		messageType.value = "success"
	} catch (error) {
		console.error("Error loading map:", error)
		saveMessage.value = "Error loading map. Please try again."
		messageType.value = "error"
	}
}

// Fetch existing maps on component mount
fetchExistingMaps()

function resetIsVerified() {
	isVerified.value = false
}

// Expose function to parent component
defineExpose({
	resetIsVerified,
})

const errorText = computed(() => {
	// Include mapUpdateTrigger to force reactivity on map changes
	store.mapUpdateTrigger.value

	// Need min size
	if (store.mapData.hexData.length < props.playerCount * 3) return "Map Too Small"
	// Can't have disconnected areas - check if all hexes are in one connected component
	if (store.mapData.hexData.length > 0) {
		const visited = new Set()
		const queue = [0] // Start from first hex
		visited.add(0)

		while (queue.length > 0) {
			const currentHex = queue.shift()
			// Add all neighbours to queue
			for (const neighborHexId of store.mapData.neighbours[currentHex]) {
				if (!visited.has(neighborHexId)) {
					visited.add(neighborHexId)
					queue.push(neighborHexId)
				}
			}
		}

		// If we didn't visit all hexes, there are disconnected areas
		if (visited.size !== store.mapData.hexData.length) {
			return "Cannot have unconnected Tiles"
		}
	}
	// Check that all rivers are properly connected
	for (let hexId = 0; hexId < store.mapData.hexData.length; hexId++) {
		const hex = store.mapData.hexData[hexId]
		for (let side = 0; side < 6; side++) {
			const riverVertexId = hex.sideRiverVertexIds[side]
			if (riverVertexId >= 0) {
				// This side has a river, check if it's properly connected
				const neighborHexId = hex.hexLookup[side]

				// Case 1: No neighbor (edge of map) - valid
				if (neighborHexId === -1) {
					continue
				}

				// Case 2: Check if neighbor has a river on the connecting side
				const neighborHex = store.mapData.hexData[neighborHexId]
				const connectingSide = (side + 3) % 6
				const neighborRiverVertexId = neighborHex.sideRiverVertexIds[connectingSide]

				// If neighbor has a river on the connecting side - valid
				if (neighborRiverVertexId >= 0) {
					continue
				}

				// Case 3: Check if neighbor is sea terrain - valid
				if (neighborHex.currentTerrain === rf.TERR_SEA) {
					continue
				}

				// If none of the above, river is improperly connected
				if (neighborHex.baseTerrain === rf.TERR_VOID) return "Rivers cannot connect to void"
				return "Rivers cannot connect to land"
			}
		}
	}
	// Must have no home markers, or at least enough for player count
	const allHomeMarkers = store.ALL_HOME_MARKERS.length
	if (allHomeMarkers > 0 && allHomeMarkers < props.playerCount) return "Not enough home markers for player count"
	// Need a map title
	if (!mapName.value) return "Please enter a map name"
	// Need a map description
	if (!mapDescription.value) return "Please enter a map description"

	return ""
})
</script>

<template>
	<div id="wholeArea">
		<!-- Available Hexes to Place -->
		<div id="hexOptionDiv">
			<div v-for="(hexTerrainID, idx) in hexTerrainIDs" :key="idx" class="newSingleHexDiv" :class="{ voidHexContainer: hexTerrainID === String(rf.BLANK_1) }">
				<span class="voidHexLabel" v-if="hexTerrainID === String(rf.BLANK_1)">Void<br/>hexes</span>

				<svg class="newSingleHexagon" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
					<polygon @click="clickedNewHexOption(idx)" points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500" :fill="`url(#pattern${`hex_${hexTerrainID}`})`" :transform="`rotate(${store.hexStyle === rf.POINTY ? hexRotations[idx] * 60 : hexRotations[idx] * 60 + 30} 0 0)`" stroke="black" class="selectableHex" :class="{ lightGreen: store.context.hexTerrainIDbeingAdded === parseInt(hexTerrainID) }" />
				</svg>

				<div class="newHexRotateDiv leftRotatePos" v-if="rf.ALL_HEX_DATA[idx].rotatable">
					<img @click="rotateNewHexTile(idx, -1)" :src="view.getImage('rot_anticlockwise')" />
				</div>

				<div class="newHexRotateDiv rightRotatePos" v-if="rf.ALL_HEX_DATA[idx].rotatable">
					<img @click="rotateNewHexTile(idx, 1)" :src="view.getImage('rot_clockwise')" />
				</div>
			</div>
		</div>

		<div v-if="store.viewSettings.showLoader" id="fLoadingBar">
			Saving Map
			<br />
			<img :src="view.getImage('loading-bar-black')" />
		</div>

		<!-- Selected Hex and Map Info Container -->
		<div id="selectedHexAndMapContainer">
			<!-- Load Map Section -->
			<div id="loadMapDiv">
				<select v-model="selectedMapId" class="mapSelectDropdown">
					<option value="">Select a map to load...</option>
					<option v-for="map in existingMaps" :key="map.id" :value="map.id" :style="{ color: map.isVerified ? 'darkgreen' : '#D35400' }">{{ map.name }}{{ map.isVerified ? " [Verified]" : "" }} ({{ map.playerCount === 1 ? "Solo" : map.playerCount + " players" }})</option>
				</select>
				<button @click="loadMap" class="loadMapButton" :disabled="!selectedMapId">Load</button>
			</div>

			<!-- Map Info Section -->
			<div id="mapInfoDiv">
				<input type="text" v-model="mapName" placeholder="Map Name" class="mapNameInput" />
				<div class="descriptionHolderDiv"><textarea v-model="mapDescription" placeholder="Map Description" class="mapDescriptionTextarea"></textarea></div>
			</div>
			<!-- Selected Hex -->
			<div v-if="store.context.hexTerrainIDbeingAdded != -1" class="selectedHexDiv">
				<svg class="selectedHexagonSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
					<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500" :fill="`url(#pattern${`hex_${store.context.hexTerrainIDbeingAdded < 10 ? '0' + store.context.hexTerrainIDbeingAdded : store.context.hexTerrainIDbeingAdded}`})`" :transform="`rotate(${store.hexStyle === rf.POINTY ? store.context.hexBeingAddedRotation * 60 : store.context.hexBeingAddedRotation * 60 + 30} 0 0)`" stroke="black" class="selectableHex" />
				</svg>
				<!-- rotate buttons -->
				<div class="newHexRotateBigDiv leftRotatePos">
					<img @click="rotateNewHexTile(0, -1, true)" :src="view.getImage('rot_anticlockwise')" />
				</div>

				<div class="cancelHexPlacementDiv" @click="cancelHexPlacement">
					<span class="cancelHexX">X</span>
				</div>

				<div class="newHexRotateBigDiv rightRotatePos">
					<img @click="rotateNewHexTile(0, 1, true)" :src="view.getImage('rot_clockwise')" />
				</div>
			</div>
			<div v-else id="noSelectedHexDiv">Select a tile to add to the map</div>

			<!-- Save Map Section -->
			<div
				id="saveMapDiv"
				:style="{
					width: effectiveCanReplaceMap ? '190px' : '120px',
				}">
				<span v-if="errorText !== ''" class="mapErrorText">{{ errorText }}</span>
				<div v-else class="saveButtonsRow">
					<button v-if="effectiveCanReplaceMap" @click="replaceMap" class="actionsLineButton saveMapButton">
						<img :src="view.getImage('replaceMap')" class="saveIcon" alt="Replace Map" />
					</button>
					<button @click="saveMap" class="actionsLineButton saveMapButton">
						<img :src="view.getImage('saveMap')" class="saveIcon" alt="Save Map" />
					</button>
				</div>
				<template v-if="effectiveCanReplaceMap && errorText === ''">
					<span>Replace or save New</span>
				</template>
			</div>

			<!-- Admin-only isVerified checkbox -->
			<div v-if="personal.name === 'admin'" class="isVerifiedCheckbox">
				<input type="checkbox" id="isVerified" v-model="isVerified" />
				<label for="isVerified">Verified Map</label>
			</div>

			<!-- Admin-only delete map button -->
			<div v-if="personal.name === 'admin'" class="deleteMapButtonContainer">
				<button @click="deleteMap" class="deleteMapButton" :disabled="!selectedMapId" title="Delete Map">
					<span class="deleteMapX">×</span>
				</button>
			</div>

			<!-- Map Stats Section-->
		</div>

		<!-- Message Display Area -->
		<div v-if="saveMessage" class="messageDisplay" :class="messageType">
			{{ saveMessage }}
		</div>
	</div>
</template>

<style scoped>
.newHexRotateDiv {
	position: absolute;
	bottom: 0px;
	z-index: 100;
	width: 20px;
	height: 20px;
	border: 1px solid black;
	border-radius: 10px;
	box-sizing: border-box;
	/*overflow: hidden;*/
}

.newHexRotateBigDiv {
	position: absolute;
	bottom: 0px;
	z-index: 100;
	width: 39px;
	height: 39px;
	border: 3px solid black;
	border-radius: 10px;
	box-sizing: border-box;
}

.newHexRotateDiv:hover,
.newHexRotateBigDiv:hover {
	border-color: yellow;
}

.cancelHexPlacementDiv {
	position: absolute;
	bottom: 4px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 100;
	width: 30px;
	height: 30px;
	border: 2px solid black;
	border-radius: 8px;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	background-color: white;
}

.cancelHexPlacementDiv:hover {
	border-color: red;
}

.cancelHexX {
	font-size: 22px;
	font-weight: 900;
	color: red;
	user-select: none;
}

.leftRotatePos {
	left: 0px;
}

.rightRotatePos {
	right: 0px;
}

#hexOptionDiv {
	margin: auto;
	width: fit-content;
}

.newSingleHexDiv {
	position: relative;
	display: inline-block;
	margin: 0px;
}

.voidHexContainer {
	margin-left: 70px;
}

.voidHexLabel {
	position: absolute;
	right: 100%;
	top: 50%;
	transform: translateY(-50%);
	margin-right: 4px;
	text-align: center;
}

.newSingleHexagon {
	width: 75px;
	margin: 0px;
}

.newSingleHexagon polygon {
	/*transition: stroke 0.3s;*/
	stroke: black;
	stroke-width: 30px;
	fill-opacity: 0.3;
}

.selectableHex {
	fill-opacity: 1 !important;
}

.selectableHex:hover {
	stroke: yellow;
}

.lightGreen {
	stroke: lightgreen !important;
	stroke-width: 60px !important;
}

#wholeArea {
	margin: 0;
	height: 100%;
}

#selectedHexAndMapContainer {
	display: flex;
	gap: 10px;
	align-items: flex-start;
	margin: 0 auto;
	width: fit-content;
}

#mapInfoDiv {
	width: 200px;
	height: 100px;
	border: 2px solid black;
	padding: 10px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 8px;
	justify-content: center;
	align-items: center;
}

#loadMapDiv {
	width: 200px;
	height: 100px;
	border: 2px solid black;
	padding: 10px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 8px;
	justify-content: center;
	align-items: center;
}

.mapSelectDropdown {
	padding: 5px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 14px;
	outline: none;
	width: 180px;
	box-sizing: border-box;
}

.mapSelectDropdown:focus {
	border-color: #007bff;
	box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.loadMapButton {
	padding: 8px 16px;
	cursor: pointer;
	background-color: #007bff;
	color: white;
	border: none;
	border-radius: 4px;
	font-size: 14px;
	font-weight: bold;
	width: 180px;
	box-sizing: border-box;
}

.loadMapButton:hover:not(:disabled) {
	background-color: #0056b3;
}

.loadMapButton:disabled {
	background-color: #cccccc;
	cursor: not-allowed;
}

.mapNameInput {
	padding: 5px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 14px;
	outline: none;
	width: 180px;
	box-sizing: border-box;
}

.mapNameInput:focus {
	border-color: #007bff;
	box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.descriptionHolderDiv {
	position: relative;
	width: 180px;
	height: 40px;
}

.mapDescriptionTextarea {
	padding: 5px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 14px;
	resize: none;
	outline: none;
	font-family: inherit;
	width: 180px;
	height: 40px;
	box-sizing: border-box;
	position: absolute;
	z-index: 101;
	background-color: white;
	transition:
		width 0.3s ease,
		height 0.3s ease;
	top: 0px;
	left: 0px;
}

.mapDescriptionTextarea:focus {
	border-color: #007bff;
	box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	width: 360px;
	height: 160px !important;
}

.selectedHexDiv {
	position: relative;
	display: inline-block;
	width: 150px;
	height: 100px;
	margin: 0px;
	border: 2px solid black;
}

#noSelectedHexDiv {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 150px;
	height: 100px;
	margin: 0px;
	border: 2px solid black;
	text-align: center;
	font-size: 16px;
	font-weight: bolder;
	padding: 10px;
	box-sizing: border-box;
}

#saveMapDiv {
	height: 100px;
	border: 2px solid black;
	padding: 10px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
}

.saveButtonsRow {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 4px;
}

.saveMapButton {
	padding: 8px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 50px;
	height: 50px;
}

.saveIcon {
	width: 40px;
	height: 40px;
}

.selectedHexagonSVG {
	width: 90px;
	margin: 0px;
}

.selectedHexagonSVG polygon {
	/*transition: stroke 0.3s;*/
	stroke: black;
	stroke-width: 30px;
	fill-opacity: 0.3;
}

.mapErrorText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.messageDisplay {
	display: block;
	margin-top: 10px;
	padding: 8px 12px;
	border-radius: 4px;
	font-weight: bolder;
	text-align: center;
	width: 100%;
	box-sizing: border-box;
	clear: both;
}

.messageDisplay.success {
	background-color: #d4edda;
	color: #155724;
	border: 1px solid #c3e6cb;
}

.messageDisplay.error {
	background-color: #f8d7da;
	color: #721c24;
	border: 1px solid #f5c6cb;
}

.isVerifiedCheckbox {
	display: flex;
	align-items: center;
	gap: 5px;
	margin-top: 5px;
	border: 1px solid black;
}

.isVerifiedCheckbox input {
	cursor: pointer;
}

.isVerifiedCheckbox label {
	cursor: pointer;
	user-select: none;
}

.deleteMapButtonContainer {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 5px;
}

.deleteMapButton {
	width: 40px;
	height: 40px;
	border: 2px solid red;
	border-radius: 8px;
	background-color: white;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background-color 0.2s;
}

.deleteMapButton:hover:not(:disabled) {
	background-color: #ffe6e6;
}

.deleteMapButton:disabled {
	border-color: #ccc;
	cursor: not-allowed;
	opacity: 0.5;
}

.deleteMapX {
	font-size: 32px;
	font-weight: bold;
	color: red;
	line-height: 1;
	user-select: none;
}
</style>
