<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map go in RNBhex (roughly)
 *  A sort of guide is if you're setting X/Y SVG positions / hex data / vertex data, it's probably in RNBhex
 *  Functions to do with manipulating the map should go in RNBmap (roughly)
 *  RNBmap is a slightly more high level set of functions
 *
 *
 */
import TransporterSVGimg from "../TransporterSVGimg.vue"

import * as rf from "../../js/RNBreference"
import * as map from "../../js/RNBmap"
import * as view from "../../js/RNBview"
//import * as controller from "../js/RNBcontroller"
//import * as util from "../js/RNButil"
import * as vec from "../../js/RNBvector"
import * as model from "../../js/RNBmodel"
import * as computes from "../../js/RNBcomputes"
//import * as highlight from "../js/RNBhighlight"
import * as hd from "../../js/RNBhex"
import * as loc from "../../js/RNBlocation"
//import * as graph from "../js/RNBgraph"
//import * as stk from "../js/RNBstack"
import * as funcs from "../../js/RNBfuncs"
import * as highlight from "../../js/RNBhighlight"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()

//import { usePersonalStore } from "../stores/RNBpersonal.js"
//const personal = usePersonalStore()

// Create a local reference that the template can bind to
//const globalRoadNetworks = computes.globalRoadNetworks

import { computed, watch } from "vue"
//import WonderScreen from "./WonderScreen.vue"

// This is used to remove popups after a time period

const hexesForDisplay = computed(() =>
	computes.computedHexes.value.map((hex) => ({
		hexID: hex.hexID,
		rawXY: hex.rawXY,
		rotation: hex.rotation,
		buildingGfxs: hex.buildingGfxs,
		homeMarkerGfxs: hex.homeMarkerGfxs,
		resourceGfxs: hex.resourceGfxs,
		allResourceGfxs: hex.allResourceGfxs,
		builtBridges: hex.builtBridges,
		vertices: hex.vertices,
		roadSegments: hex.roadSegments,
		hexGfx: hex.hexGfx,
		mineData: hex.mineData,
	}))
)

function getResGfxPos(resGfx, flag) {
	// 0 = x, 1 = y, 2 = xCenter, 3 = yCenter, 4 = cent [x,y]
	if (flag === 0) return vec.scaleBy(store.RATIO, vec.sum(resGfx.pos, vec.scaleBy(-0.5, [resGfx.width, resGfx.height])))[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6
	if (flag === 1) return vec.scaleBy(store.RATIO, vec.sum(resGfx.pos, vec.scaleBy(-0.5, [resGfx.width, resGfx.height])))[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6
	if (flag === 2) return vec.scaleBy(store.RATIO, resGfx.pos)[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6
	if (flag === 3) return vec.scaleBy(store.RATIO, resGfx.pos)[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6
	if (flag === 4) return [vec.scaleBy(store.RATIO, resGfx.pos)[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6, vec.scaleBy(store.RATIO, resGfx.pos)[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6]
}

function calculateCanvasSizeForRefSize(refSize) {
	const store = useModelStore()

	let hexWidth = (refSize / 2400) * 130
	const hexHeight = hexWidth * 1.1547 // Calculate the height of each hexagon
	const sideLength = hexWidth / 1.732
	const sidePlusPointy = (hexHeight - sideLength) / 2 + sideLength

	// This is independent of actual sizing and doesn't alter store
	let gridDimensions = hd.calculateGridDimensions()

	// If you are adding a hex, add space all around the edge to allow space for the new hex options, IE +1 here
	let extraSpaceW = 0
	let extraSpaceH = 0
	if (store.hexStyle === rf.FLAT) {
		extraSpaceH = 0
	}

	const gridWidth = gridDimensions[3] - gridDimensions[2] + extraSpaceW
	const gridHeight = gridDimensions[1] - gridDimensions[0] + extraSpaceH

	let canvasWidth = -1
	let canvasHeight = -1
	let canvasSize = -1

	// This sets the size of the div.
	if (store.hexStyle === rf.FLAT) {
		canvasHeight = gridHeight * hexWidth + hexWidth * 1.5 // Add one extra for padding
		canvasWidth = gridWidth * sidePlusPointy + hexHeight * 1.5

		canvasSize = Math.min(canvasWidth, canvasHeight)
	} else if (store.hexStyle === rf.POINTY) {
		// For the width, you simply want the width of the grid, plus room for 1 hex each side
		canvasWidth = gridWidth * hexWidth + hexWidth * 2 // Add one extra for padding
		canvasHeight = (gridHeight + 1) * sidePlusPointy + hexHeight * 1
		// As the min dimension of the canvas increaes, the SVGs will get bigger.
		// This variable is used to stop this happening.
		canvasSize = Math.min(canvasWidth, canvasHeight)
	}
	// Add a check for no map
	if (canvasSize === -Infinity) canvasSize = 600

	return [canvasWidth, canvasHeight]
}

//////
store.refSize = 1000

funcs.clearMap()

if (store.mapData.externalMapData.length > 0) localImportStartingMap(store.mapData.externalMapData)

function localImportStartingMap() {
	funcs.importStartingMap(store.mapData.externalMapData)

	let refSize = store.refSize
	let widthAvailable = 600
	// If no game ID, it means you are selecting it on the map creation screen
	if (personal.gameID === -1) widthAvailable = 348
	let heightAvailable = 400

	const [initialWidth, initialHeight] = calculateCanvasSizeForRefSize(store.refSize)
	if (initialWidth < widthAvailable && initialHeight < heightAvailable) {
		while (calculateCanvasSizeForRefSize(refSize)[0] < widthAvailable && calculateCanvasSizeForRefSize(refSize)[1] < heightAvailable) {
			refSize += 40
		}
		// Now we are just to big, so shrink to match
		refSize -= 40
	}

	if (initialWidth > widthAvailable || initialHeight > heightAvailable) {
		while (calculateCanvasSizeForRefSize(refSize)[0] > widthAvailable || calculateCanvasSizeForRefSize(refSize)[1] > heightAvailable) {
			refSize -= 40
		}
		// Now we are just to small, so grow to match
		refSize += 40
	}

	store.refSize = refSize

	hd.calculateCanvasSize()
}

watch(
	() => store.mapData.externalMapData,
	(newVal) => {
		if (newVal && newVal.length > 0) {
			localImportStartingMap()
		}
	}
)

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
//if (window.initData.startingMap && window.initData.startingMap.length > 0) store.mapData.startingMap = [...window.initData.startingMap]
</script>

<template>
	<div>
		<h2>{{ personal.mapName }}</h2>
		<div class="mapDescriptionDiv">{{ personal.mapDescription }}</div>
		<div v-for="player in personal.playerCount" :key="player" class="playerCount" title="Player" v-html="playerFilledSVG"></div>
		<p v-if="personal.showPlayerCountWarning" class="errorText">Caution: Number of players do not match this map's player count</p>
		<div
			id="hexDIV"
			:style="{
				width: store.canvasWidth + 'px',
				height: store.canvasHeight + 'px',
			}">
			<svg id="hexSVG" v-if="store.mapData.hexData" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" :viewBox="hd.getViewbox()">
				<!-- MAKE UP AN INDIVIDUAL HEX HERE WITH ALL ITEMS ON TOP OF IT. IT CAN THEN BE ROATED TO FLAT TOP IF NEEDED BEFORE BEING MOVED TO THE CORRECT LOCATION -->
				<!-- LAYER 1 -- JUST THE HEX ART AND OUTLINES-->
				<g v-for="(hex, idx) in hexesForDisplay" :key="idx" :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`">
					<!-- FINE TO ROTATE TO FLAT-->
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<!-- Add BASE Hex art -->
						<polygon :points="store.hexPoints" :transform="`rotate(${hex.rotation * 60} 0 0)`" class="mapHexSVG" :fill="`url(#pattern${hex.hexGfx})`" />
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
						<g v-if="store.mapData.displaySettings.showRoads && 1 == 1">
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

				<!-- HEX PIECES TO Highlight UNDER TRANSPORTERS -->
				<g v-for="(entry, idx) in store.context.hexPiecesToHighlightUnderTransporters" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<path
							@click="map.clickedHighlight(entry, $event)"
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
					<path
						:transform="`
    translate(${model.getHexByID(entry[0], 'MapArea1-1').rawXY[0]}, ${model.getHexByID(entry[0], 'MapArea2').rawXY[1]})
    ${store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''}
  `"
						@click="map.clickedBridgeOption(entry)"
						:d="view.getBridgeSVGpath(entry[0], entry[1], true, false).bridgeD"
						class="bridgeOptionPath"
						:stroke-width="40 * store.RATIO" />
				</g>
			</svg>
		</div>
	</div>
</template>

<style scoped>
.noClick {
	pointer-events: none;
}

#hexDIV {
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

#hexSVG {
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

/*
.transporter-list-move {
	transition: transform 700ms ease-in-out;
}
	*/

.playerCount {
	height: 28px;
	width: 28px;
	cursor: pointer;
	transition: opacity 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	display: inline-block;
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

.errorText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.mapDescriptionDiv {
	white-space: pre-line;
	max-width: 800px;
	margin: auto;
}
</style>
