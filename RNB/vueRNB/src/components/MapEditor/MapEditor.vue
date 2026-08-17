<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map go in RNBhex (roughly)
 *  A sort of guide is if you're setting X/Y SVG positions / hex data / vertex data, it's probably in RNBhex
 *  Functions to do with manipulating the map should go in RNBmap (roughly)
 *  RNBmap is a slightly more high level set of functions
 *
 *
 */
import { computed, ref } from "vue"

import TransporterSVGimg from "../TransporterSVGimg.vue"
import HexPileSelectionArea from "./HexPileSelectionArea.vue"

import * as rf from "../../js/RNBreference"
import * as map from "../../js/RNBmap"
import * as view from "../../js/RNBview"
import * as vec from "../../js/RNBvector"
import * as model from "../../js/RNBmodel"
import * as computes from "../../js/RNBcomputes"
import * as hd from "../../js/RNBhex"
import * as loc from "../../js/RNBlocation"
import * as funcs from "../../js/RNBfuncs"
import * as context from "../../js/RNBcontext"
import * as ME from "./RNBmapEditor"
import * as util from "../../js/RNButil"
import * as coord from "../../js/RNBcoordinate"

import * as highlight from "../../js/RNBhighlight"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()

// Local refs for min/max players
const playerCount = ref(2)

// Whether the loaded map can be replaced by the current user
const canReplaceMap = ref(false)

// State for showing/hiding hex icons
const showHexIcons = ref(true)

//import { usePersonalStore } from "../stores/RNBpersonal.js"
//const personal = usePersonalStore()

// Create a local reference that the template can bind to
//const globalRoadNetworks = computes.globalRoadNetworks

// Ref for HexPileSelectionArea component
const hexPileSelectionAreaRef = ref(null)

// Track which existing hex is hovered when in ACT_PLACE_HEX mode
const hoveredHexID = ref(-1)

const hexesForDisplay = computed(() =>
	computes.computedHexes.value.map((hex) => ({
		hexID: hex.hexID,
		coord: hex.coord,
		rawXY: hex.rawXY,
		rotation: hex.rotation,
		buildingGfxs: hex.buildingGfxs,
		homeMarkerGfxs: hex.homeMarkerGfxs,
		resourceGfxs: hex.resourceGfxs,
		allResourceGfxs: hex.allResourceGfxs,
		whiteCrosses: hex.whiteCrosses,
		builtBridges: hex.builtBridges,
		vertices: hex.vertices,
		roadSegments: hex.roadSegments,
		hexGfx: hex.hexGfx,
		mineData: hex.mineData,
		// DEBUG ONLY - REMOVE
		bridgeRiverLines: hex.bridgeRiverLines,
		roadJoinPoints: hex.roadJoinPoints,
		fullRoadPath: hex.fullRoadPath,
	}))
)

// Track hexes with invalid river connections for visual highlighting
const hexesWithInvalidRivers = computed(() => {
	// Include mapUpdateTrigger to force reactivity on map changes
	store.mapUpdateTrigger.value

	const invalidHexIds = new Set()

	for (let hexId = 0; hexId < store.mapData.hexData.length; hexId++) {
		const hex = store.mapData.hexData[hexId]
		if (!hex.sideRiverVertexIds) continue

		for (let side = 0; side < 6; side++) {
			const riverVertexId = hex.sideRiverVertexIds[side]
			if (riverVertexId >= 0) {
				// This side has a river, check if it's properly connected
				const neighborHexId = hex.hexLookup?.[side]

				// Case 1: No neighbor (edge of map) - valid
				if (neighborHexId === -1 || neighborHexId === undefined) {
					continue
				}

				// Case 2: Check if neighbor has a river on the connecting side
				const neighborHex = store.mapData.hexData[neighborHexId]
				const connectingSide = (side + 3) % 6
				const neighborRiverVertexId = neighborHex?.sideRiverVertexIds?.[connectingSide]

				// If neighbor has a river on the connecting side - valid
				if (neighborRiverVertexId >= 0) {
					continue
				}

				// Case 3: Check if neighbor is sea terrain - valid
				if (neighborHex?.currentTerrain === rf.TERR_SEA) {
					continue
				}

				// If none of the above, river is improperly connected
				invalidHexIds.add(hexId)
				break // Mark this hex as invalid and move to next hex
			}
		}
	}

	return invalidHexIds
})

// Filtered list of hexes with invalid rivers for rendering
const invalidRiverHexesForDisplay = computed(() => {
	return hexesForDisplay.value.filter((hex) => hexesWithInvalidRivers.value.has(hex.hexID))
})

function getNewHexOptionFill(mousover) {
	if (mousover) {
		const hexData = rf.ALL_HEX_DATA.find((h) => h.hexTerrainID === store.context.hexTerrainIDbeingAdded)
		const pattern = hexData.hexGfx
		return `url(#pattern${pattern})`
	} else return "yellow"
}

function localAddHexToMap(tile, rotation, hexTerrainID) {
	let coord = tile.coord

	// Validate coordinates
	if (coord.length !== 3) return
	if (coord[0] + coord[1] + coord[2] !== 0) return

	// Create and add hex directly without resetting the add-mode context
	let newHex = hd.createActualHex(coord, rotation, hexTerrainID)
	newHex.hexID = store.mapData.hexData.length
	store.mapData.hexData.push(newHex)

	// Re-calculate placeable tiles so the same hex can be placed again
	hd.setPlaceableTiles()
	hd.calculateCanvasSize(true)
	map.updateEdgeData()
	hd.updateAllHexRawXY()
}

function hexClicked(_hex) {
	// Clicking an existing hex while in place-hex mode replaces that hex
	if (store.context.action === rf.ACT_PLACE_HEX) {
		// Save context variables that will be reset
		const savedAction = store.context.action
		const savedHexBeingAddedRotation = store.context.hexBeingAddedRotation
		const savedHexTerrainIDbeingAdded = store.context.hexTerrainIDbeingAdded

		// Replace the hex: remove old one and add new one at same coord
		const coord = _hex.coord
		const rotation = savedHexBeingAddedRotation
		const hexTerrainID = savedHexTerrainIDbeingAdded

		// Remove the old hex first
		removeHex(_hex.hexID)

		// Create and add the new hex at the same coordinate
		let newHex = hd.createActualHex(coord, rotation, hexTerrainID)
		newHex.hexID = store.mapData.hexData.length
		store.mapData.hexData.push(newHex)

		// Recalculate everything
		hd.setPlaceableTiles()
		hd.calculateCanvasSize(true)
		map.updateEdgeData()
		hd.updateAllHexRawXY()

		// Restore context variables to keep the place-hex mode active
		store.context.action = savedAction
		store.context.hexBeingAddedRotation = savedHexBeingAddedRotation
		store.context.hexTerrainIDbeingAdded = savedHexTerrainIDbeingAdded
	}
}

function handleSvgBackgroundClick() {
	// Clicking empty space on the SVG while in place-hex mode cancels the add operation
	if (store.context.action === rf.ACT_PLACE_HEX) {
		context.resetContextAndHighlights()
	}
}

function getResGfxPos(resGfx, flag) {
	// 0 = x, 1 = y, 2 = xCenter, 3 = yCenter, 4 = cent [x,y]
	if (flag === 0) return vec.scaleBy(store.RATIO, vec.sum(resGfx.pos, vec.scaleBy(-0.5, [resGfx.width, resGfx.height])))[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6
	if (flag === 1) return vec.scaleBy(store.RATIO, vec.sum(resGfx.pos, vec.scaleBy(-0.5, [resGfx.width, resGfx.height])))[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6
	if (flag === 2) return vec.scaleBy(store.RATIO, resGfx.pos)[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6
	if (flag === 3) return vec.scaleBy(store.RATIO, resGfx.pos)[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6
	if (flag === 4) return [vec.scaleBy(store.RATIO, resGfx.pos)[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6, vec.scaleBy(store.RATIO, resGfx.pos)[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6]
}

function rotatePlacedTile(hexObj, dir) {
	// Find and update the original hex in hexData
	const originalHex = store.mapData.hexData.find((hex) => hex.hexID === hexObj.hexID)
	if (originalHex) {
		// Calculate the delta rotation (the change from current rotation)
		const deltaRotation = dir

		// Update the rotation property
		originalHex.rotation = (originalHex.rotation + 6 + dir) % 6

		// Apply the delta rotation to the internal data
		// We need to rotate the arrays by the delta amount
		function rearrange(arr) {
			return util.indexArray(arr.length).map((i) => arr[(i - deltaRotation + 6) % 6])
		}

		const rotate = coord.rotateCoord(deltaRotation)

		if (originalHex.sideRiverVertexIds) {
			originalHex.sideRiverVertexIds = rearrange(originalHex.sideRiverVertexIds)
		}
		if (originalHex.riverVertexDefinitions) {
			originalHex.riverVertexDefinitions = originalHex.riverVertexDefinitions.map(rotate)
		}
		if (originalHex.cornerBucketIds) {
			originalHex.cornerBucketIds = rearrange(originalHex.cornerBucketIds)
		}
		if (originalHex.nodeVertexDefinitions) {
			originalHex.nodeVertexDefinitions = originalHex.nodeVertexDefinitions.map(rotate)
		}
		if (originalHex.sideNodeIds) {
			originalHex.sideNodeIds = rearrange(originalHex.sideNodeIds)
		}
		if (originalHex.cornerNodeIds) {
			originalHex.cornerNodeIds = rearrange(originalHex.cornerNodeIds)
		}

		if (originalHex.bridgeRiverLines) {
			for (let i = 0; i < originalHex.bridgeRiverLines.length; i++) {
				originalHex.bridgeRiverLines[i] = originalHex.bridgeRiverLines[i].map(rotate)
			}
		}

		if (originalHex.chitLocations) {
			originalHex.chitLocations = originalHex.chitLocations.map(rotate)
		}
		if (originalHex.homeMarkerFallbackPositions) {
			originalHex.homeMarkerFallbackPositions = originalHex.homeMarkerFallbackPositions.map(rotate)
		}
	}

	hd.updateAllHexRawXY()

	// Trigger reactivity for error text updates
	store.mapUpdateTrigger++
}

function toggleHexStyle() {
	hd.changeHexStyle()
	hd.updateAllHexRawXY()
}

function clearMap() {
	context.resetContextAndHighlights()
	funcs.clearMap()
	canReplaceMap.value = false
	if (hexPileSelectionAreaRef.value && hexPileSelectionAreaRef.value.resetIsVerified) {
		hexPileSelectionAreaRef.value.resetIsVerified()
	}
}

function removeHex(hexID) {
	// Make a copy of all hexes except the one to remove
	const remainingHexes = store.mapData.hexData.filter((hex) => hex.hexID !== hexID)

	// Save home markers before clearing the map, storing hex coordinates instead of hexID
	const savedHomeMarkers = store.ALL_HOME_MARKERS
		.filter((marker) => marker.location[1] !== hexID)
		.map((marker) => {
			const hex = store.mapData.hexData[marker.location[1]]
			return {
				marker: marker,
				hexCoord: hex ? hex.coord : null,
			}
		})
		.filter((item) => item.hexCoord !== null)

	// Clear the entire map
	funcs.clearMap()

	// Re-add all remaining hexes
	for (const hex of remainingHexes) {
		model.addHexToMap(hex.coord, hex.rotation, hex.hexTerrainID)
	}

	// Restore home markers by finding hexes with matching coordinates
	for (const item of savedHomeMarkers) {
		const newHex = store.mapData.hexData.find((hex) => hex.coord[0] === item.hexCoord[0] && hex.coord[1] === item.hexCoord[1] && hex.coord[2] === item.hexCoord[2])
		if (newHex) {
			item.marker.location[1] = newHex.hexID
			store.ALL_HOME_MARKERS.push(item.marker)
		}
	}
}

function getHexOutlineColor(hexID) {
	if (hoveredHexID.value === hexID) {
		return 'limegreen'
	}
	return 'yellow'
}

function setPlayerCount(count) {
	playerCount.value = count
}

function setCanReplaceMap(val) {
	canReplaceMap.value = val
}

function toggleHexIcons() {
	showHexIcons.value = !showHexIcons.value
}

// Computed properties for player images - now using inline SVGs
const playerFilledSVG = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 50 50">
  <!-- Symmetrical Silhouette (Right side now mirrors Left) -->
  <path fill="#000000" d="
    M 13.91,32.62 
    C 14.29,25.85 12.91,18.78 20.57,15.26 
    C 18.95,11.61 17.07,7.68 21.30,4.43 
    C 22.44,3.54 25.21,3.29 25.00,3.29 
    C 24.79,3.29 27.56,3.54 28.70,4.43 
    C 32.93,7.68 31.05,11.61 29.43,15.26 
    C 37.09,18.78 35.71,25.85 36.09,32.62 
    L 32.13,33.28 
    L 30.62,48.80 
    L 19.38,48.80 
    L 17.87,33.28 
    L 13.91,32.62 
    Z" />
</svg>`

const playerOutlineSVG = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 50 50">

  
  <!-- Symmetrical Outline -->
  <path fill="none" stroke="#000000" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" d="
    M 13.91,32.62 
    C 14.29,25.85 12.91,18.78 20.57,15.26 
    C 18.95,11.61 17.07,7.68 21.30,4.43 
    C 22.44,3.54 25.21,3.29 25.00,3.29 
    C 24.79,3.29 27.56,3.54 28.70,4.43 
    C 32.93,7.68 31.05,11.61 29.43,15.26 
    C 37.09,18.78 35.71,25.85 36.09,32.62 
    L 32.13,33.28 
    L 30.62,48.80 
    L 19.38,48.80 
    L 17.87,33.28 
    L 13.91,32.62 
    Z" />
</svg>`

const playerImages = computed(() => {
	return [
		{ id: 1, svg: playerCount.value >= 1 ? playerFilledSVG : playerOutlineSVG },
		{ id: 2, svg: playerCount.value >= 2 ? playerFilledSVG : playerOutlineSVG },
		{ id: 3, svg: playerCount.value >= 3 ? playerFilledSVG : playerOutlineSVG },
		{ id: 4, svg: playerCount.value >= 4 ? playerFilledSVG : playerOutlineSVG },
		{ id: 5, svg: playerCount.value >= 5 ? playerFilledSVG : playerOutlineSVG },
		{ id: 6, svg: playerCount.value >= 6 ? playerFilledSVG : playerOutlineSVG },
	]
})

store.refSize = 2400
</script>

<template>
	<div id="wholeMapEditorDiv">
		<HexPileSelectionArea ref="hexPileSelectionAreaRef" :playerCount="playerCount" @update:playerCount="setPlayerCount" :canReplaceMap="canReplaceMap" @update:canReplaceMap="setCanReplaceMap" />
		<!-- Buttons -->
		<div class="mapButtonsDiv">
			<button class="actionsLineButton showIconsButton" @click="toggleHexIcons" :title="showHexIcons ? 'Hide Hex Icons' : 'Show Hex Icons'">
				<svg class="actionsLineButtonSvg" viewBox="0 0 48 32">
					<g v-if="showHexIcons">
						<ellipse cx="16" cy="16" rx="12" ry="7" fill="none" stroke="currentColor" stroke-width="3" />
						<circle cx="16" cy="16" r="3" fill="currentColor" />
						<line x1="8" y1="9" x2="6" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="12" y1="8" x2="11" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="16" y1="8" x2="16" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="20" y1="8" x2="21" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="24" y1="9" x2="26" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</g>
					<g v-else>
						<ellipse cx="16" cy="16" rx="12" ry="7" fill="none" stroke="currentColor" stroke-width="3" />
						<circle cx="16" cy="16" r="3" fill="currentColor" />
						<line x1="8" y1="9" x2="6" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="12" y1="8" x2="11" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="16" y1="8" x2="16" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="20" y1="8" x2="21" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="24" y1="9" x2="26" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="3" y1="3" x2="28" y2="28" stroke="currentColor" stroke-width="5" />
					</g>
					<g transform="translate(32, 0) scale(0.03)">
						<path  stroke="black" 
  stroke-width="50" 
  fill="fff"  d="M248.91 50c11.882-.006 23.875 1.018 35.857 3.13 85.207 15.025 152.077 81.895 167.102 167.102 15.023 85.208-24.944 170.917-99.874 214.178-32.782 18.927-69.254 27.996-105.463 27.553-46.555-.57-92.675-16.865-129.957-48.15l30.855-36.768c50.95 42.75 122.968 49.05 180.566 15.797 57.597-33.254 88.152-98.777 76.603-164.274-11.55-65.497-62.672-116.62-128.17-128.168-51.656-9.108-103.323 7.98-139.17 43.862L185 192H57V64l46.34 46.342C141.758 71.962 194.17 50.03 248.91 50z" transform="translate(512, 0) scale(-1, 1) rotate(-75, 256, 256) skewX(0) skewY(0)"></path>
					</g>
					<g transform="translate(16, 16) scale(0.03)">
						<path stroke="black" 
  stroke-width="50" 
  fill="fff" d="M248.91 50c11.882-.006 23.875 1.018 35.857 3.13 85.207 15.025 152.077 81.895 167.102 167.102 15.023 85.208-24.944 170.917-99.874 214.178-32.782 18.927-69.254 27.996-105.463 27.553-46.555-.57-92.675-16.865-129.957-48.15l30.855-36.768c50.95 42.75 122.968 49.05 180.566 15.797 57.597-33.254 88.152-98.777 76.603-164.274-11.55-65.497-62.672-116.62-128.17-128.168-51.656-9.108-103.323 7.98-139.17 43.862L185 192H57V64l46.34 46.342C141.758 71.962 194.17 50.03 248.91 50z" transform="translate(512, 0) scale(1, 1) rotate(-75, 256, 256) skewX(0) skewY(0)"></path>
					</g>
				</svg>
			</button>
			<button class="actionsLineButton" @click="hd.doZoom(1, true, true)" title="Zoom In">🔍+</button>
			<button class="actionsLineButton" @click="hd.doZoom(-1, true, true)" title="Zoom Out">🔍-</button>
			<button class="actionsLineButton homeMarkerButton" @click="ME.setupAddHomeMarker" title="Add Home Marker">
				<div class="homeMarkerContainer">
					<img :src="view.getImage('home_2')" class="homeMarkerIcon" alt="Add Home Marker" />
					<span v-if="store.context.action !== rf.ACT_MAP_EDITOR_ADD_HOME_MARKER" class="homeMarkerPlus">+</span>
					<span v-else class="homeMarkerX">×</span>
				</div>
			</button>
			<button class="actionsLineButton homeMarkerButton" @click="ME.setupRemoveHomeMarker" title="Remove Home Marker" :disabled="store.ALL_HOME_MARKERS.length === 0" :class="{ disabledButton: store.ALL_HOME_MARKERS.length === 0 }">
				<div class="homeMarkerContainer">
					<img :src="view.getImage('home_2')" class="homeMarkerIcon" alt="Remove Home Marker" />
					<span v-if="store.context.action !== rf.ACT_MAP_EDITOR_REMOVE_HOME_MARKER" class="homeMarkerMinus">-</span>
					<span v-else class="homeMarkerX">×</span>
				</div>
			</button>
			<button class="actionsLineButton hexStyleButton" @click="toggleHexStyle">
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

			<!-- Player Count Selector - Inline with Buttons -->
			<div class="playerCountInline">
				<div class="playerCountFixed" @click="setPlayerCount(1)" title="1 Player" v-html="playerImages[0].svg"></div>
				<div v-for="player in playerImages.slice(1)" :key="player.id" class="playerCount" @click="setPlayerCount(player.id)" :title="`${player.id} Players`" v-html="player.svg"></div>
			</div>

			<button class="actionsLineButton binButton" @click="clearMap" title="Clear Map">
				<svg class="actionsLineButtonSvg" viewBox="0 0 32 32">
					<!-- Handle and Lid (Touch Top) -->
					<path d="M12 4V0h8v4h6v3H6V4h6zm2-2.5h4V4h-4V1.5z" fill="currentColor" />

					<!-- Main Bin Body (Touch Bottom) -->
					<path d="M8 10l3 22h10l3-22H8z" fill="currentColor" />

					<!-- 3 Tapered Internal Stripes (Holes) -->
					<g fill="white">
						<path d="M12.5 12l1.5 16h-1.5l-1-16z" />
						<!-- Left Taper -->
						<rect x="15" y="12" width="2" height="16" />
						<!-- Center Straight -->
						<path d="M19.5 12l-1.5 16h1.5l1-16z" />
						<!-- Right Taper -->
					</g>
				</svg>
			</button>
		</div>
		<div
			id="hexMapEditorDIV"
			:style="{
				width: store.canvasWidth + 'px',
				height: store.canvasHeight + 'px',
			}">
			<svg id="hexMapEditorSVG" v-if="store.mapData.hexData" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" :viewBox="hd.getViewbox()" @click.self="handleSvgBackgroundClick">
				<defs>
					<filter id="f_black" x="-100%" y="-100%" width="300%" height="300%">
						<!-- 1. Color it black -->
						<feFlood flood-color="black" result="flood" />
						<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

						<!-- 2. Dynamic Expansion (Thickness) -->
						<!-- Use :radius to multiply your base size by the store RATIO -->
						<feMorphology operator="dilate" :radius="8 * store.RATIO" in="color" result="thick" />

						<!-- 3. Dynamic Smoothing -->
						<!-- Scale the blur proportionally to keep the donkey ears sharp -->
						<feGaussianBlur in="thick" :stdDeviation="3 * store.RATIO" result="smooth" />

						<!-- 4. Sharpen the edge -->
						<feComponentTransfer in="smooth">
							<feFuncA type="linear" slope="4" intercept="-1" />
						</feComponentTransfer>
					</filter>
				</defs>
				<!-- MAKE UP AN INDIVIDUAL HEX HERE WITH ALL ITEMS ON TOP OF IT. IT CAN THEN BE ROATED TO FLAT TOP IF NEEDED BEFORE BEING MOVED TO THE CORRECT LOCATION -->
				<!-- LAYER 1 -- JUST THE HEX ART AND OUTLINES-->
				<g v-for="(hex, idx) in hexesForDisplay" :key="idx" :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`">
					<!-- FINE TO ROTATE TO FLAT-->
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<!-- Add BASE Hex art -->
						<polygon @click="hexClicked(hex)" :points="store.hexPoints" :transform="`rotate(${hex.rotation * 60} 0 0)`" class="mapHexSVG" :fill="`url(#pattern${hex.hexGfx})`" />
						<!-- New tile Rotate Buttons -->
					</g>
				</g>
				<!-- INVALID RIVER OUTLINE LAYER -->
				<g v-for="(hex, idx) in invalidRiverHexesForDisplay" :key="'invalid-' + idx" :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<polygon :points="store.hexPoints" :transform="`rotate(${hex.rotation * 60} 0 0)`" fill="none" stroke="red" :stroke-width="30 * store.RATIO" />
					</g>
				</g>
				<!-- LAYER 2 -- EVERYTHING ELSE AT THE MOMENT-->
				<g v-for="(hex, idx) in hexesForDisplay" :key="idx" :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`">
					<!-- FINE TO ROTATE TO FLAT-->
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<!-- BRIDGES -->
						<g v-if="store.mapData.displaySettings.showBridges">
							<g v-for="(bridgeEntry, bridgeIdx) in hex.builtBridges" :key="bridgeIdx">
								<path :transform="store.hexStyle === rf.FLAT ? 'rotate(0 0 0)' : ''" :d="view.getBridgeSVGpath(hex.hexID, bridgeEntry, false, false).bridgeD" stroke="black" :stroke-width="40 * store.RATIO" fill="none" />
							</g>
						</g>
						<!-- ROADS -->
						<g v-if="store.mapData.displaySettings.showRoads">
							<!-- Draw the roads and white lines -->
							<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 0 : 0} 0 0)`">
								<!-- full path-->
								<path :d="hex.fullRoadPath" stroke="#1C2526" :stroke-width="60 * store.RATIO" stroke-linejoin="round" stroke-linecap="round" />
								<path :d="hex.fullRoadPath" stroke="#F5F5F5" :stroke-width="(7 * store.RATIO).toFixed(0)" :stroke-dasharray="`${(25 * store.RATIO).toFixed(0)} ${(20 * store.RATIO).toFixed(0)}`" fill="none" />
							</g>
						</g>
					</g>
					<!-- NOT FINE TO ROTATE TO FLAT-->
					<!-- HOME MARKERS -->
					<g v-if="store.mapData.displaySettings.showHomeMakres">
						<g v-for="(homeMarker, idx2) in hex.homeMarkerGfxs" :key="idx2">
							<rect
								class="homeMarkerRect"
								:x="vec.scaleBy(store.RATIO, vec.sum(homeMarker.pos, vec.scaleBy(-0.5, [homeMarker.width, homeMarker.height])))[0]"
								:y="vec.scaleBy(store.RATIO, vec.sum(homeMarker.pos, vec.scaleBy(-0.5, [homeMarker.width, homeMarker.height])))[1]"
								:width="homeMarker.width * store.RATIO"
								:height="homeMarker.height * store.RATIO"
								:fill="`url(#pattern_${homeMarker.img})`"
								:style="{
									strokeWidth: 4 * store.RATIO,
								}" />
						</g>
					</g>
					<!-- BUILDINGS -->
					<g v-if="store.mapData.displaySettings.showBuildings">
						<!-- NON MINES -->
						<g v-for="(bldg, idx2) in hex.buildingGfxs" :key="idx2">
							<rect
								:class="highlight.shouldHighlightItem(rf.ITEM_BUILT_BUILDING, bldg.id) ? 'bldgHighlight' : 'bldgNormal'"
								@click="map.clickedBuilding(bldg.id)"
								:x="vec.scaleBy(store.RATIO, vec.sum(bldg.pos, vec.scaleBy(-0.5, [bldg.width, bldg.height])))[0]"
								:y="vec.scaleBy(store.RATIO, vec.sum(bldg.pos, vec.scaleBy(-0.5, [bldg.width, bldg.height])))[1]"
								:width="bldg.width * store.RATIO"
								:height="bldg.height * store.RATIO"
								:fill="`url(#pattern_${bldg.img})`"
								:style="{
									strokeWidth: highlight.shouldHighlightItem(rf.ITEM_BUILT_BUILDING, bldg.id) ? 20 * store.RATIO : 2 * store.RATIO,
								}" />
						</g>
						<!-- MINE -->
						<g v-if="hex.mineData.length > 0">
							<circle class="mineSVGcircle" :cx="hex.mineData[1][0] * store.RATIO" :cy="hex.mineData[1][1] * store.RATIO" :r="115 * store.RATIO" fill="gray" stroke="#734A36" :stroke-width="50 * store.RATIO" />
							<!-- Iron Number -->
							<text
								:x="hex.mineData[1][0] * store.RATIO - 40 * store.RATIO"
								:y="hex.mineData[1][1] * store.RATIO + 20 * store.RATIO"
								text-anchor="middle"
								dominant-baseline="middle"
								:style="{
									'font-size': 175 * store.RATIO + 'px',
									fill: 'red',
									'font-weight': 700,
									stroke: 'black',
									'stroke-width': 10 * store.RATIO + 'px',
								}">
								{{ hex.mineData[2][1] }}
							</text>
							<!-- Gold Number -->
							<text
								:x="hex.mineData[1][0] * store.RATIO + 40 * store.RATIO"
								:y="hex.mineData[1][1] * store.RATIO + 20 * store.RATIO"
								text-anchor="middle"
								dominant-baseline="middle"
								:style="{
									'font-size': 175 * store.RATIO + 'px',
									fill: 'gold',
									'font-weight': 700,
									stroke: 'black',
									'stroke-width': 10 * store.RATIO + 'px',
								}">
								{{ hex.mineData[2][0] }}
							</text>
						</g>
					</g>
					<!-- RESOURCES -->
					<g v-if="store.mapData.displaySettings.showResources">
						<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
							<g v-for="(resGfx, idx2) in hex.allResourceGfxs" :key="idx2">
								<rect
									:style="{
										strokeWidth: store.context.resourceIDsToHighlight.includes(resGfx.id) ? 20 * store.RATIO : 5 * store.RATIO,
									}"
									:class="[store.context.resourceIDsToHighlight.includes(resGfx.id) ? 'resHighlight' : 'resNormal']"
									@click="map.clickedRes($event, hex.hexID, resGfx.id)"
									:x="getResGfxPos(resGfx, 0)"
									:y="getResGfxPos(resGfx, 1)"
									:width="resGfx.width * store.RATIO"
									:height="resGfx.height * store.RATIO"
									:fill="`url(#pattern_${resGfx.img})`"
									:transform="store.hexStyle === rf.FLAT ? `rotate(-30 ${getResGfxPos(resGfx, 2)} ${getResGfxPos(resGfx, 3)})` : ''" />
								<!-- The Triangle Indicators -->
								<polygon class="noClick" v-if="resGfx.movedThisTurn" :transform="store.hexStyle === rf.FLAT ? `rotate(-30 ${getResGfxPos(resGfx, 2)} ${getResGfxPos(resGfx, 3)})` : ''" :points="view.getCornerTrianglePoints(getResGfxPos(resGfx, 4), resGfx.width * store.RATIO, resGfx.height * store.RATIO, 0)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
								<polygon class="noClick" v-if="resGfx.movedThisTurn" :transform="store.hexStyle === rf.FLAT ? `rotate(-30 ${getResGfxPos(resGfx, 2)} ${getResGfxPos(resGfx, 3)})` : ''" :points="view.getCornerTrianglePoints(getResGfxPos(resGfx, 4), resGfx.width * store.RATIO, resGfx.height * store.RATIO, 1)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
								<polygon class="noClick" v-if="resGfx.movedThisTurn" :transform="store.hexStyle === rf.FLAT ? `rotate(-30 ${getResGfxPos(resGfx, 2)} ${getResGfxPos(resGfx, 3)})` : ''" :points="view.getCornerTrianglePoints(getResGfxPos(resGfx, 4), resGfx.width * store.RATIO, resGfx.height * store.RATIO, 2)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
								<polygon class="noClick" v-if="resGfx.movedThisTurn" :transform="store.hexStyle === rf.FLAT ? `rotate(-30 ${getResGfxPos(resGfx, 2)} ${getResGfxPos(resGfx, 3)})` : ''" :points="view.getCornerTrianglePoints(getResGfxPos(resGfx, 4), resGfx.width * store.RATIO, resGfx.height * store.RATIO, 3)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
							</g>
							<!-- White crosses-->
							,
							<g v-for="(cross, idx) in hex.whiteCrosses" :key="idx">
								<path
									:style="{
										stroke: 'white',
										strokeWidth: 75 * store.RATIO,
									}"
									:d="`M${cross.pos[0]} ${cross.pos[1] - 5 * store.RATIO} V${cross.pos[1] + 5 * store.RATIO} M${cross.pos[0] - 5 * store.RATIO} ${cross.pos[1]} H${cross.pos[0] + 5 * store.RATIO}`" />
							</g>
						</g>
					</g>
				</g>
				<!-- END OF INDIVIDUAL HEX-->

				<!-- MAP EDITOR BUTTONS-->
				<g v-for="(hex, idx) in hexesForDisplay" :key="idx">
					<g :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`" v-if="showHexIcons">
						<rect
							v-if="store.context.action === rf.ACT_NONE"
							class="newTileRotateImg"
							@click="rotatePlacedTile(hex, -1)"
							:x="-370 * store.RATIO"
							:y="0"
							:width="200 * store.RATIO"
							:height="200 * store.RATIO"
							:rx="40 * store.RATIO"
							:ry="40 * store.RATIO"
							:fill="`url(#pattern_rot_anticlockwise)`"
							:style="{
								strokeWidth: 30 * store.RATIO + 'px',
							}" />

						<!-- Middle Bin Button -->
						<g v-if="store.context.action === rf.ACT_NONE" @click="removeHex(hex.hexID)" style="cursor: pointer">
							<!-- Background Button Shape (at -400) -->
							<rect class="newTileBinImg" :x="-100 * store.RATIO" :y="-400 * store.RATIO" :width="200 * store.RATIO" :height="200 * store.RATIO" :rx="40 * store.RATIO" :ry="40 * store.RATIO" fill="white" :style="{ strokeWidth: 30 * store.RATIO + 'px' }" />

							<!-- The Bin Icon (Scaled and Translated to match -400 position) -->
							<!-- 
								X: -100 (rect start) + 20 (padding) = -80
								Y: -400 (rect start) + 20 (padding) = -380
								-->
							<g class="noClick" :transform="`translate(${-80 * store.RATIO}, ${-380 * store.RATIO}) scale(${5 * store.RATIO})`">
								<!-- Simplified Bin Path -->
								<path d="M12 4V0h8v4h6v3H6V4h6zm2-2.5h4V4h-4V1.5z" fill="black" />
								<path d="M8 10l3 22h10l3-22H8z" fill="black" />
								<g fill="white">
									<path d="M12.5 12l1.5 16h-1.5l-1-16z" />
									<rect x="15" y="12" width="2" height="16" />
									<path d="19.5 12l-1.5 16h1.5l1-16z" />
								</g>
							</g>
						</g>

						<rect
							v-if="store.context.action === rf.ACT_NONE"
							class="newTileRotateImg"
							@click="rotatePlacedTile(hex, 1)"
							:x="120 * store.RATIO"
							:y="0"
							:width="200 * store.RATIO"
							:height="200 * store.RATIO"
							:rx="40 * store.RATIO"
							:ry="40 * store.RATIO"
							:fill="`url(#pattern_rot_clockwise)`"
							:style="{
								strokeWidth: 30 * store.RATIO + 'px',
							}" />
					</g>
				</g>

				<!-- HEX PIECES TO Highlight UNDER TRANSPORTERS -->
				<g v-for="(entry, idx) in store.context.hexPiecesToHighlightUnderTransporters" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<path
							@click="ME.clickedHighlight(entry)"
							:d="view.getHexHighlightPath(entry[0], entry[1])"
							:transform="`rotate(${model.getHexByID(entry[0]).rotation * 60} 0 0)`"
							class="highlightPath"
							:style="{
								'stroke-width': 20 * store.RATIO + 'px',
							}" />
					</g>
				</g>

				<!-- WALLS -->
				<g v-for="(edgeData, idx) in store.mapData.edgeData" :key="idx">
					<g v-if="edgeData.wall[0] > 0">
						<g :transform="`translate(${model.getHexByID(edgeData.edgeHexIDs[0]).rawXY[0]} , ${model.getHexByID(edgeData.edgeHexIDs[0]).rawXY[1]})`">
							<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
								<polygon
									:points="view.getWallSVGpointsFromHexID(edgeData.edgeHexIDs[0], edgeData.edgeHexIDs[1], false, false, false)"
									:style="{
										'stroke-width': 10 * store.RATIO + 'px',
										stroke: 'white',
										fill: edgeData.wall[1] === -1 ? 'white' : personal.getCorrectedColourHex(store.players[edgeData.wall[1]].colour),
									}" />
							</g>
							<text
								v-if="edgeData.wall[0] > 1"
								:x="view.getWallSVGpointsFromHexID(edgeData.edgeHexIDs[0], edgeData.edgeHexIDs[1], false, true, false)[0]"
								:y="view.getWallSVGpointsFromHexID(edgeData.edgeHexIDs[0], edgeData.edgeHexIDs[1], false, true, false)[1]"
								text-anchor="middle"
								dominant-baseline="middle"
								:style="{
									'font-size': 200 * store.RATIO + 'px',
									fill: edgeData.wall[1] === -1 ? 'black' : 'white',
									'font-weight': 700,
									stroke: 'black',
									'stroke-width': 10 * store.RATIO + 'px',
								}">
								{{ edgeData.wall[0] }}
							</text>
						</g>
					</g>
				</g>

				<!-- TRANSPORTERS -->
				<g v-if="store.mapData.displaySettings.showTransporters">
					<!--
					<transition-group name="transporter-list" tag="g">
						<TransporterSVGimg v-for="transporterObj in sortedTransporters" :key="transporterObj.id" :transporterObjProp="transporterObj" />
					</transition-group>
				-->
					<g v-for="transporterObj in model.getAllInGameTransporters()" :key="transporterObj.id">
						<TransporterSVGimg v-if="!loc.isOnAnyTransporter(transporterObj.location)" :transporterObjProp="transporterObj" />
					</g>
					<g v-for="transporterObj in model.getAllInGameTransporters()" :key="transporterObj.id">
						<TransporterSVGimg v-if="loc.isOnAnyTransporter(transporterObj.location)" :transporterObjProp="transporterObj" />
					</g>
				</g>

				<!-- HIGHLIGHTS ON TOP OF EVERYTHING -->
				<!-- BRIDGE OPTIONS -- NO NEED TO ROTATE THIS WITH POINTY/FLAT FOR SOME REASON -->
				<g v-for="(entry, idx) in store.context.eligibleBridgesToBuild" :key="idx">
					<!-- BRIDGE DEBUG !!! ALWAYS SHOW THIS !!! -->
					<g
						v-if="rf.DEBUG_USERS.includes(personal.name)"
						:transform="`
                  translate(${model.getHexByID(entry[0], 'MapArea1').rawXY[0]}, ${model.getHexByID(entry[0], 'MapArea2').rawXY[1]})
                  ${store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''}
                `">
						<!-- BRIDGE RIVER LINE - WHITE -->
						<line v-if="rf.DEBUG_USERS.includes(personal.name)" :x1="view.getBridgeSVGpath(entry[0], entry[1], false, false, false, true)[0][0]" :y1="view.getBridgeSVGpath(entry[0], entry[1], false, false, false, true)[0][1]" :x2="view.getBridgeSVGpath(entry[0], entry[1], false, false, false, true)[1][0]" :y2="view.getBridgeSVGpath(entry[0], entry[1], false, false, false, true)[1][1]" stroke="white" :stroke-width="20" fill="none" />
						<!-- BRIDGE POINTS - RED -->
						<line v-if="rf.DEBUG_USERS.includes(personal.name)" :x1="model.getHexByID(entry[0]).vertices[entry[1][0]][0] * store.RATIO" :y1="model.getHexByID(entry[0]).vertices[entry[1][0]][1] * store.RATIO" :x2="model.getHexByID(entry[0]).vertices[entry[1][1]][0] * store.RATIO" :y2="model.getHexByID(entry[0]).vertices[entry[1][1]][1] * store.RATIO" stroke="red" :stroke-width="20" fill="none" />
					</g>
					<path :transform="`translate(${model.getHexByID(entry[0], 'MapArea1-1').rawXY[0]}, ${model.getHexByID(entry[0], 'MapArea2').rawXY[1]}) ${store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''}`" @click="map.clickedBridgeOption(entry)" :d="view.getBridgeSVGpath(entry[0], entry[1], true, false).bridgeD" class="bridgeOptionPath" :stroke-width="40 * store.RATIO" />
				</g>

				<!-- HEX PIECES TO Highlight -->
				<g v-for="(entry, idx) in store.context.hexPiecesToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<path
							@click="ME.clickedHighlight(entry)"
							:d="view.getHexHighlightPath(entry[0], entry[1], false)"
							:transform="`rotate(${model.getHexByID(entry[0]).rotation * 60} 0 0)`"
							class="highlightPath"
							:style="{
								'stroke-width': 20 * store.RATIO + 'px',
							}" />
					</g>
				</g>

				<!-- RIVER PIECES TO Highlight -->
				<g v-for="(entry, idx) in store.context.riversToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<path
							@click="map.clickedHighlight(entry, $event)"
							:d="view.getRiverHighlightPath(entry[0], entry[1])"
							:transform="`rotate(${model.getHexByID(entry[0]).rotation * 60} 0 0)`"
							class="highlightPath"
							:style="{
								'stroke-width': 20 * store.RATIO + 'px',
							}" />
					</g>
				</g>

				<!-- SHORES TO Highlight -->
				<g v-for="(entry, idx) in store.context.shoresToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<polygon
							@click="map.clickedHighlight(entry, $event)"
							:points="view.getShoreHighlightPoints(entry)"
							class="highlightPath"
							:style="{
								'stroke-width': 20 * store.RATIO + 'px',
							}" />
					</g>
				</g>

				<!-- HALF SHORES TO Highlight -->
				<g v-for="(entry, idx) in store.context.halfShoresToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<polygon
							@click="map.clickedHighlight(entry, $event)"
							:points="view.getHalfShoreHighlightPoints(entry)"
							class="highlightPath"
							:style="{
								'stroke-width': 20 * store.RATIO + 'px',
							}" />
					</g>
				</g>

				<!-- Outline layer for existing hexes when in ACT_PLACE_HEX mode - shows yellow outline (green on hover) -->
				<g v-if="store.context.action === rf.ACT_PLACE_HEX">
					<g v-for="(hex, idx) in hexesForDisplay" :key="'outline-' + idx" :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`">
						<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
							<polygon
								:points="store.hexPoints"
								:transform="`rotate(${hex.rotation * 60} 0 0)`"
								fill="fff"
								fill-opacity="0"
								:stroke="getHexOutlineColor(hex.hexID)"
								:stroke-width="30 * store.RATIO"
								class="existingHexOutline"
								@mouseover="hoveredHexID = hex.hexID"
								@mouseout="hoveredHexID = -1"
								@click="hexClicked(hex)"
								style="cursor: pointer" />
						</g>
					</g>
				</g>

				<!-- Add New Hex Options - These can be anywhere as they are never over / under anything else -->
				<g v-if="store.context.action === rf.ACT_PLACE_HEX">
					<polygon
						v-for="tile in store.context.placeableTiles"
						class="newHexOptionSVG"
						:key="tile.id"
						@click="localAddHexToMap(tile, store.context.hexBeingAddedRotation, store.context.hexTerrainIDbeingAdded)"
						:points="store.hexPoints"
						:transform="'rotate(' + (store.hexStyle === rf.POINTY ? store.context.hexBeingAddedRotation * 60 : store.context.hexBeingAddedRotation * 60 + 30) + ' ' + hd.hexCenter(tile.coord, false, true) + ')' + hd.hexCenter(tile.coord, false)"
						@mouseover="tile.isMouseOver = true"
						@mouseout="tile.isMouseOver = false"
						:fill="getNewHexOptionFill(tile.isMouseOver)"
						stroke="black"
						:style="{
							'stroke-width': 10 * store.RATIO + 'px',
						}"></polygon>
				</g>

				<!-- Wall Options -->
				<g v-for="(entry, idx) in store.context.eligibleWallsToBuild" :key="idx">
					<g :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
						<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
							<polygon
								class="wallOptionPolygon"
								:points="view.getWallSVGpointsFromHexID(entry[0], entry[1], true, false, false)"
								@click="map.clickedWallOption(entry)"
								:style="{
									'stroke-width': 40 * store.RATIO + 'px',
								}" />
						</g>
					</g>
				</g>

				<!-- Wall Options TO DEMOLISH -->
				<g v-for="(entry, idx) in store.context.eligibleWallsToDemolish" :key="idx">
					<g :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
						<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
							<polygon
								class="wallDemolishOptionPolygon"
								:points="view.getWallSVGpointsFromHexID(entry[0], entry[1], true, false, false)"
								@click="map.clickedWallOption(entry)"
								:style="{
									'stroke-width': 40 * store.RATIO + 'px',
								}" />
						</g>
					</g>
				</g>

				<!-- HISTORY STUFF-->
				<!-- HISTORY HEX PIECES TO Highlight -->
				<g v-for="(entry, idx) in store.historyHelpers.histHexPiecesToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<path :d="view.getHexHighlightPath(entry[0], entry[1], false)" :transform="`rotate(${model.getHexByID(entry[0]).rotation * 60} 0 0)`" class="histHighlightPath fillYellow" />
					</g>
				</g>
				<!-- HISTORY RIVERS TO HIGHLGIHT -->
				<g v-for="(entry, idx) in store.historyHelpers.histRiversToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<path :d="view.getRiverHighlightPath(entry[0], entry[1], false)" :transform="`rotate(${model.getHexByID(entry[0]).rotation * 60} 0 0)`" class="histHighlightPath fillYellow" />
					</g>
				</g>
				<!-- HISTORY SHORES TO Highlight -->
				<g v-for="(entry, idx) in store.historyHelpers.histShoresToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<polygon :points="view.getShoreHighlightPoints(entry)" class="histHighlightPath fillYellow" />
					</g>
				</g>
				<!-- HISTORY BRIDGES TO HIGHLIGHT -->
				<g v-for="(entry, idx) in store.historyHelpers.histBridgesToHighlight" :key="idx">
					<path
						:transform="`
    translate(${model.getHexByID(entry[0], 'MapArea13').rawXY[0]}, ${model.getHexByID(entry[0], 'MapArea14').rawXY[1]})
    ${store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''}
  `"
						:d="view.getBridgeSVGpath(entry[0], entry[1], true, false).bridgeD"
						class="histHighlightPath fillYellow" />
				</g>
				<!-- HISTORY WALLS TO Highlight -->
				<g v-for="(entry, idx) in store.historyHelpers.histWallsToHighlight" :key="idx">
					<g :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
						<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
							<polygon class="histHighlightPath fillYellow" :points="view.getWallSVGpointsFromHexID(entry[0], entry[1], true, false, false)" />
						</g>
					</g>
				</g>
				<!-- HISTORY HALF SHORES TO Highlight -->
				<g v-for="(entry, idx) in store.historyHelpers.histHalfShoresToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<polygon :points="view.getHalfShoreHighlightPoints(entry)" class="histHighlightPath fillYellow" />
					</g>
				</g>
				<!-- HISTORY BUILDINGS HIGHLIGHT -->
				<g v-for="(bldgArr, idx) in store.historyHelpers.histBuildingsToHighlight" :key="idx" :transform="`translate(${model.getHexByID(bldgArr[1]).rawXY[0]} , ${model.getHexByID(bldgArr[1]).rawXY[1]})`">
					<!-- NON MINES -->
					<g v-if="bldgArr[0] !== rf.BLDG_MINE">
						<rect class="histHighlightRect fillBlue" :x="(computes.getComputedBuildingPos(bldgArr[1], bldgArr[2])[0] - rf.DEFAULT_BLDG_WIDTH / 2) * store.RATIO" :y="(computes.getComputedBuildingPos(bldgArr[1], bldgArr[2])[1] - rf.DEFAULT_BLDG_HEIGHT / 2) * store.RATIO" :width="rf.DEFAULT_BLDG_WIDTH * store.RATIO" :height="rf.DEFAULT_BLDG_HEIGHT * store.RATIO" fill="none" />
					</g>
					<!-- MINE -->
					<g v-if="bldgArr[0] === rf.BLDG_MINE">
						<circle class="histHighlightRect fillBlue" :cx="computes.getComputedBuildingPos(bldgArr[1], bldgArr[2])[0] * store.RATIO" :cy="computes.getComputedBuildingPos(bldgArr[1], bldgArr[2])[1] * store.RATIO" :r="115 * store.RATIO" fill="none" />
					</g>
				</g>
			</svg>
		</div>
	</div>
</template>

<style scoped>
.newTileRotateImg {
	stroke: yellow;
	transition: stroke 0.2s ease;
}

.newTileBinImg {
	stroke: yellow;
	transition: stroke 0.2s ease;
	fill: white;
	fill-opacity: 1;
}

.newTileBinImg:hover {
	stroke: lightgreen;
}

.newTileRotateImg:hover {
	stroke: lightgreen;
}
.newHexOptionSVG {
	stroke: black;
	fill-opacity: 0.5;
	z-index: 6000;
}

.noClick {
	pointer-events: none;
}

#hexMapEditorDIV {
	position: relative;
	/*float: left;*/
	padding: 0px;
	/*border: 3px solid black;
  border-radius: 25px;*/
	width: fit-content;
	margin: auto;

	background-color: aliceblue;
}

.mapHexSVG {
	stroke: black;
	stroke-width: 5px;
}

#hexMapEditorSVG {
	margin: 0 auto;
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
	z-index: 1000;
}

.resNormal {
	stroke: aliceblue;
	pointer-events: none;
}

/** These 2 res class are applied in computes */
.resHighlight {
	stroke: yellow;
	pointer-events: visiblePainted;
}

.resHighlight:hover {
	cursor: pointer;
	stroke: lightgreen;
}

.bldgNormal {
	stroke: aliceblue;
}

.homeMarkerRect {
	stroke: black;
}

.bldgHighlight {
	stroke: yellow;
}

.bldgHighlight:hover {
	cursor: pointer;
	stroke: lightgreen;
}

.highlightPath {
	fill: yellow;
	fill-opacity: 0.3;
	z-index: 1000;
	stroke: yellow;
	stroke-opacity: 0.8;
}

.highlightPath:hover {
	cursor: pointer;
	opacity: 0.8;
	fill: lightgreen;
	stroke: lightgreen;
}

.bridgeOptionPath {
	fill: yellow;
	fill-opacity: 0.3;
	z-index: 1000;
	stroke: yellow;
	stroke-opacity: 0.8;
}

.bridgeOptionPath:hover {
	cursor: pointer;
	opacity: 0.8;
	fill: lightgreen;
	stroke: lightgreen;
	stroke-opacity: 1;
}

.wallOptionPolygon {
	stroke: yellow;
	fill: black;
	fill-opacity: 0;
}

.wallOptionPolygon:hover {
	cursor: pointer;
	stroke: lightgreen;
}

.wallDemolishOptionPolygon {
	stroke: red;
	fill: black;
	fill-opacity: 0;
}

.wallDemolishOptionPolygon:hover {
	cursor: pointer;
	stroke: lightgreen;
}

/*** HISTORY */
.histHighlightPath {
	stroke: black;
	stroke-width: 0px;
	fill-opacity: 1;
	pointer-events: visiblePainted;
	cursor: default;
	animation: glow 0.6s infinite alternate;
}

.histHighlightRect {
	stroke: black;
	stroke-width: 0px;
	fill-opacity: 1;
	pointer-events: visiblePainted;
	cursor: default;
	animation: glow 0.6s infinite alternate;
}

.fillYellow {
	fill: yellow;
}

.fillBlue {
	fill: blue;
}

/*** END HISTORY */

@keyframes glow {
	to {
		opacity: 0.3;
	}
}

.playerCountInline {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	margin-left: 8px;
	vertical-align: middle;
}

.playerCountFixed {
	height: 28px;
	width: 28px;
	cursor: pointer;
	transition: opacity 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
}

.playerCount {
	height: 28px;
	width: 28px;
	cursor: pointer;
	transition: opacity 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
}

.playerCount:hover {
	opacity: 0.8;
}

.playerCountFixed:hover {
	opacity: 0.8;
}

.playerCount svg,
.playerCountFixed svg {
	width: 100%;
	height: 100%;
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

.showIconsButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 34px; /* Match action button heights */
	min-width: 45px;
	padding: 2px 0; /* Tiny vertical buffer to prevent clipping */
	vertical-align: middle;
}

.binButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 30px; /* Match action button heights */
	min-width: 45px;
	padding: 2px 0; /* Tiny vertical buffer to prevent clipping */
	vertical-align: middle;
}

.homeMarkerButton {
	height: 34px;
	vertical-align: middle;
	padding: 0;
}

.homeMarkerContainer {
	position: relative;
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.homeMarkerIcon {
	width: 28px;
	height: 28px;
	object-fit: contain;
}

.homeMarkerPlus {
	position: absolute;
	top: -2px;
	right: -2px;
	background-color: #007bff;
	color: white;
	font-size: 12px;
	font-weight: bold;
	border-radius: 50%;
	width: 14px;
	height: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 1;
	border: 1px solid white;
}

.homeMarkerX {
	position: absolute;
	top: -2px;
	right: -2px;
	background-color: #dc3545;
	color: white;
	font-size: 12px;
	font-weight: bold;
	border-radius: 50%;
	width: 14px;
	height: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 1;
	border: 1px solid white;
}

.homeMarkerMinus {
	position: absolute;
	top: -2px;
	right: -2px;
	background-color: #dc3545;
	color: white;
	font-size: 12px;
	font-weight: bold;
	border-radius: 50%;
	width: 14px;
	height: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 1;
	border: 1px solid white;
}

.disabledButton {
	opacity: 0.5;
	cursor: not-allowed;
	pointer-events: none;
}

.disabledButton:hover {
	opacity: 0.5;
}

/*
.transporter-list-move {
	transition: transform 700ms ease-in-out;
}
	*/
</style>
