<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map go in RNBhex (roughly)
 *  A sort of guide is if you're setting X/Y SVG positions / hex data / vertex data, it's probably in RNBhex
 *  Functions to do with manipulating the map should go in RNBmap (roughly)
 *  RNBmap is a slightly more high level set of functions
 *
 *
 */
import ActionArea from "./ActionArea.vue"
import TransporterSVGimg from "./TransporterSVGimg.vue"
import ReplayArea from "./History/ReplayArea.vue"
import BuildingOptionsCard from "./BuildingOptionsCard.vue"

import * as rf from "../js/RNBreference"
import * as map from "../js/RNBmap"
import * as view from "../js/RNBview"
import * as controller from "../js/RNBcontroller"
//import * as util from "../js/RNButil"
import * as vec from "../js/RNBvector"
import * as model from "../js/RNBmodel"
import * as computes from "../js/RNBcomputes"
//import * as highlight from "../js/RNBhighlight"
import * as hd from "../js/RNBhex"
import * as loc from "../js/RNBlocation"
//import * as graph from "../js/RNBgraph"
import * as context from "../js/RNBcontext"
//import * as stk from "../js/RNBstack"
//import * as funcs from "../js/RNBfuncs"
import * as highlight from "../js/RNBhighlight"
import * as produce from "../js/RNBproduce"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

//import { usePersonalStore } from "../stores/RNBpersonal.js"
//const personal = usePersonalStore()

// Create a local reference that the template can bind to
//const globalRoadNetworks = computes.globalRoadNetworks

import { ref, computed, onMounted } from "vue"
//import WonderScreen from "./WonderScreen.vue"
//const showErrorPopup = ref(false)

// This is used to remove popups after a time period
//let errorInterval

const hexesForDisplay = computed(() =>
	computes.computedHexes.value.map((hex) => ({
		hexID: hex.hexID,
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

// Prevent animation on page load
// 1. Flag to prevent animations on initial page load
const isFullyMounted = ref(false)

onMounted(() => {
	// Wait a tiny bit after mount to flip the flag
	// This ensures existing buildings appear instantly
	setTimeout(() => {
		isFullyMounted.value = true
	}, 100)
})

// 2. The Custom Directive
const vPlop = {
	mounted: (el) => {
		// Only run if the page has been loaded for a while
		if (!isFullyMounted.value) return

		el.classList.add("building-plop-active")

		// Cleanup class after animation to keep the DOM clean
		el.addEventListener(
			"animationend",
			() => {
				el.classList.remove("building-plop-active")
			},
			{ once: true }
		)
	},
}

function hexClicked(hex) {
	rf.doAdminConsolLg(JSON.stringify(hex))
	if (![rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER, rf.ACT_SELECT_INPUT_RESOURCES_FOR_SEC_PRODUCTION, rf.ACT_CHOOSE_BUILDING_TO_UPGRADE, rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY].includes(store.context.action)) {
		if (store.gameflow.phase !== rf.PHASE_CHOOSE_HOME_TILE) context.resetContextAndHighlights()
	}
	store.mapData.zoomData.hexID = hex.hexID
}

function getNewHexOptionFill(mousover) {
	if (mousover) {
		const hexData = rf.ALL_HEX_DATA.find((h) => h.hexTerrainID === store.context.hexTerrainIDbeingAdded)
		const pattern = hexData.hexGfx
		return `url(#pattern${pattern})`
	} else return "yellow"
}

function localAddHexToMap(tile, rotation, hexTerrainID) {
	let coord = tile.coord
	/*let placementError = hex.getAnyHexPlacementError(tile, hexRef, rotation)
	if (placementError) {
		// Calculate the position based on the mouse/touch event
		popupPosition.value = { x: event.clientX, y: event.clientY - 60 }

		// Show the error popup
		showErrorPopup.value = true

		clearTimeout(errorInterval)
		// Hide the error popup after 2 seconds
		errorInterval = setTimeout(() => {
			showErrorPopup.value = false
		}, 1000)
	} else*/ model.addHexToMap(coord, rotation, hexTerrainID)
}

/*function shouldShowBridgeHighlight(entry) {
	//return true
	if (store.context.eligibleBridgesToBuild.some((subArr) => subArr[0] === entry[0] && util.arraysEquivalent(subArr[1], entry[1]))) return true

	return false
}
*/

function getResGfxPos(resGfx, flag) {
	// 0 = x, 1 = y, 2 = xCenter, 3 = yCenter, 4 = cent [x,y]
	if (flag === 0) return vec.scaleBy(store.RATIO, vec.sum(resGfx.pos, vec.scaleBy(-0.5, [resGfx.width, resGfx.height])))[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6
	if (flag === 1) return vec.scaleBy(store.RATIO, vec.sum(resGfx.pos, vec.scaleBy(-0.5, [resGfx.width, resGfx.height])))[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6
	if (flag === 2) return vec.scaleBy(store.RATIO, resGfx.pos)[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6
	if (flag === 3) return vec.scaleBy(store.RATIO, resGfx.pos)[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6
	if (flag === 4) return [vec.scaleBy(store.RATIO, resGfx.pos)[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6, vec.scaleBy(store.RATIO, resGfx.pos)[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6]
}

/*const sortedTransporters = computed(() => {
	return [...model.getAllInGameTransporters()].sort((a, b) => {
		const aIsOn = loc.isOnAnyTransporter(a.location) ? 1 : 0
		const bIsOn = loc.isOnAnyTransporter(b.location) ? 1 : 0
		return aIsOn - bIsOn // 0 first (base), 1 last (on top)
	})
})*/

const shouldShowResearchBubbles = computed(() => {
	return rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.selectedTransporterIDforTM !== -1 && loc.isAnyHexLocation(model.getTransporterByID(store.context.selectedTransporterIDforTM).location) && store.context.researchHexIDpossibilities.includes(model.getTransporterByID(store.context.selectedTransporterIDforTM).location[1])
})

const shouldShowBuildingOptions = computed(() => {
	return store.context.eligibleBuildingsToBuild.length > 0 && store.context.selectedTransporterIDforTM !== -1
})

const shouldShowPickupSelectBubbles = computed(() => {
	return store.context.action === rf.ACT_TM_DECIDE_ON_TRANSPORTER_PICKUP_OR_SELECT && store.context.selectedTransporterIDforPickupOrSelection !== -1
})

const transporterScreenPosition = computed(() => {
	if (store.context.selectedTransporterIDforTM === -1) return null
	if (!shouldShowResearchBubbles.value && !shouldShowBuildingOptions.value && !shouldShowPickupSelectBubbles.value) return null
	let transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
	if (shouldShowPickupSelectBubbles.value) transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforPickupOrSelection)
	//const hex = model.getHexByID(transporterObj.location[1])

	// 1. Get the SVG element and the container
	const svg = document.getElementById("hexSVG")
	const container = document.getElementById("hexDIV")

	// 2. Create an SVG point for the raw coordinates
	const pt = svg.createSVGPoint()
	//pt.x = hex.rawXY[0]
	//pt.y = hex.rawXY[1]
	pt.x = transporterObj.rawTransporterXY[0] - 40
	pt.y = transporterObj.rawTransporterXY[1] - 40

	// 3. Transform the SVG point to screen pixels
	// getScreenCTM accounts for viewbox, scaling, and panning
	const screenPos = pt.matrixTransform(svg.getScreenCTM())

	// 4. Convert screen pixels back to your local container coordinates
	const containerRect = container.getBoundingClientRect()

	return {
		x: screenPos.x - containerRect.left,
		y: screenPos.y - containerRect.top,
	}
})

function getBubblePosition(idx) {
	// Count available research options
	const availableOptions = controller
		.currentPlayerObj()
		.RnD.map((isResearched, i) => ({ isResearched, idx: i }))
		.filter(({ isResearched, idx }) => isResearched === 0 && (idx !== rf.RND_FUNDAMENTAL_RESEARCH_IDX || (idx === rf.RND_FUNDAMENTAL_RESEARCH_IDX && store.gameOptions.useFundamentalResearch)))

	const totalBubbles = availableOptions.length
	const bubbleIndex = availableOptions.findIndex((opt) => opt.idx === idx)

	if (totalBubbles === 0) return {}

	// Arrange bubbles in a circle around the transporter
	const radius = 90
	const angle = (bubbleIndex / totalBubbles) * 2 * Math.PI - Math.PI / 2 // Start from top

	const x = Math.cos(angle) * radius
	const y = Math.sin(angle) * radius

	return {
		transform: `translate(${x}px, ${y}px)`,
	}
}

function getPickupSelectBubblePosition(type) {
	// Position 2 bubbles: Pickup up-left, Select up-right
	const radius = 60
	const angle = type === "pickup" ? -Math.PI / 4 : (-3 * Math.PI) / 4 // -135° and -45°

	const x = Math.cos(angle) * radius
	const y = Math.sin(angle) * radius

	return {
		transform: `translate(${x}px, ${y}px)`,
	}
}

function handlePickupBubbleClick() {
	const transporterID = store.context.selectedTransporterIDforPickupOrSelection
	map.executePickupTransporter(transporterID)
}

function handleSelectBubbleClick() {
	const transporterID = store.context.selectedTransporterIDforPickupOrSelection
	store.context.selectedTransporterIDforPickupOrSelection = -1
	store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE
	context.resetContextAndHighlights()
	store.context.selectedTransporterIDforTM = transporterID
	highlight.updateAllHighlightsForTransporterMode()
}
</script>

<template>
	<div>
		<ActionArea />
		<div
			id="hexDIV"
			:style="{
				width: store.canvasWidth + 'px',
				height: store.canvasHeight + 'px',
			}">
			<transition name="fadeOut">
				<div class="errorPopup" v-if="store.errorPopupSetter.showPopup" @mouseenter="store.errorPopupSetter.showPopup = false" :style="{ top: store.errorPopupSetter.pos[1] + 'px', left: store.errorPopupSetter.pos[0] + 'px' }">
					<span v-html="store.errorPopupSetter.htmlMessage"></span>
				</div>
			</transition>
			<transition name="fadeOut">
				<div class="infoPopup" v-if="store.infoPopupSetter.showPopup" @mouseenter="store.infoPopupSetter.showPopup = false" :style="{ top: store.infoPopupSetter.pos[1] + 'px', left: store.infoPopupSetter.pos[0] + 'px' }">
					<span v-html="store.infoPopupSetter.htmlMessage"></span>
				</div>
			</transition>
			<svg id="hexSVG" v-if="store.mapData.hexData" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" :viewBox="hd.getViewbox()">
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

					<filter id="f_yellow" x="-100%" y="-100%" width="300%" height="300%">
						<!-- 1. Color it Yellow -->
						<feFlood flood-color="yellow" result="flood" />
						<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

						<!-- 2. Dynamic Expansion (Thickness) -->
						<!-- Use :radius to multiply your base size by the store RATIO -->
						<feMorphology operator="dilate" :radius="15 * store.RATIO" in="color" result="thick" />

						<!-- 3. Dynamic Smoothing -->
						<!-- Scale the blur proportionally to keep the donkey ears sharp -->
						<feGaussianBlur in="thick" :stdDeviation="3 * store.RATIO" result="smooth" />

						<!-- 4. Sharpen the edge -->
						<feComponentTransfer in="smooth">
							<feFuncA type="linear" slope="4" intercept="-1" />
						</feComponentTransfer>
					</filter>

					<filter id="f_lightGreen" x="-100%" y="-100%" width="300%" height="300%">
						<!-- 1. Color it lightgreen -->
						<feFlood flood-color="lightgreen" result="flood" />
						<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

						<!-- 2. Dynamic Expansion (Thickness) -->
						<!-- Use :radius to multiply your base size by the store RATIO -->
						<feMorphology operator="dilate" :radius="15 * store.RATIO" in="color" result="thick" />

						<!-- 3. Dynamic Smoothing -->
						<!-- Scale the blur proportionally to keep the donkey ears sharp -->
						<feGaussianBlur in="thick" :stdDeviation="3 * store.RATIO" result="smooth" />

						<!-- 4. Sharpen the edge -->
						<feComponentTransfer in="smooth">
							<feFuncA type="linear" slope="4" intercept="-1" />
						</feComponentTransfer>
					</filter>

					<filter id="f_orange" x="-100%" y="-100%" width="300%" height="300%">
						<!-- 1. Color it orange -->
						<feFlood flood-color="orange" result="flood" />
						<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

						<!-- 2. Dynamic Expansion (Thickness) -->
						<!-- Use :radius to multiply your base size by the store RATIO -->
						<feMorphology operator="dilate" :radius="20 * store.RATIO" in="color" result="thick" />

						<!-- 3. Dynamic Smoothing -->
						<!-- Scale the blur proportionally to keep the donkey ears sharp -->
						<feGaussianBlur in="thick" :stdDeviation="3 * store.RATIO" result="smooth" />

						<!-- 4. Sharpen the edge -->
						<feComponentTransfer in="smooth">
							<feFuncA type="linear" slope="4" intercept="-1" />
						</feComponentTransfer>
					</filter>

					<filter id="f_red" x="-100%" y="-100%" width="300%" height="300%">
						<!-- 1. Color it red -->
						<feFlood flood-color="red" result="flood" />
						<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

						<!-- 2. Dynamic Expansion (Thickness) -->
						<!-- Use :radius to multiply your base size by the store RATIO -->
						<feMorphology operator="dilate" :radius="20 * store.RATIO" in="color" result="thick" />

						<!-- 3. Dynamic Smoothing -->
						<!-- Scale the blur proportionally to keep the donkey ears sharp -->
						<feGaussianBlur in="thick" :stdDeviation="3 * store.RATIO" result="smooth" />

						<!-- 4. Sharpen the edge -->
						<feComponentTransfer in="smooth">
							<feFuncA type="linear" slope="4" intercept="-1" />
						</feComponentTransfer>
					</filter>

					<filter id="f_mineDrop" x="-60%" y="-60%" width="220%" height="220%">
						<feGaussianBlur in="SourceAlpha" :stdDeviation="12 * store.RATIO" result="blur" />
						<feOffset in="blur" :dx="8 * store.RATIO" :dy="14 * store.RATIO" result="offsetBlur" />
						<feFlood flood-color="rgba(0,0,0,0.6)" result="shadowColor" />
						<feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow" />
						<feMerge>
							<feMergeNode in="shadow" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>
				<!-- MAKE UP AN INDIVIDUAL HEX HERE WITH ALL ITEMS ON TOP OF IT. IT CAN THEN BE ROATED TO FLAT TOP IF NEEDED BEFORE BEING MOVED TO THE CORRECT LOCATION -->
				<!-- LAYER 1 -- JUST THE HEX ART AND OUTLINES-->
				<g v-for="(hex, idx) in hexesForDisplay" :key="idx" :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`">
					<!-- FINE TO ROTATE TO FLAT-->
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<!-- Add BASE Hex art -->
						<polygon @click="hexClicked(hex)" :points="store.hexPoints" :transform="`rotate(${hex.rotation * 60} 0 0)`" class="mapHexSVG" :fill="`url(#pattern${hex.hexGfx})`" />
					</g>
				</g>

				<!-- COLOUR OVERLAY -- 0 = none, 1 = transparent, 2 = full colour -->
				<!-- River hexes are split into pieces (buckets), so colour each piece separately -->
				<g v-if="store.viewSettings.colourOverlay > 0">
					<g v-for="(hex, idx) in store.mapData.hexData" :key="'colourOverlay' + idx" :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`">
						<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
							<!--<path v-for="(bucketId, bIdx) in model.hexVertexBucketsInitial(hex.hexID)" :key="bIdx" class="noClick colourOverlayPath" :class="store.viewSettings.colourOverlay === 1 ? 'halfOpacity' : ''" :d="view.getHexHighlightPath(hex.hexID, model.hexCurrentBucketToInitial(hex.hexID, bucketId))" :transform="`rotate(${hex.rotation * 60} 0 0)`" :fill="view.getTerrainColour(hex.hexID)" />
						-->
							<g v-for="(bucketID, bIdx) in hex.bucketIdsInitial" :key="bIdx">
								<path :d="view.getHexHighlightPath(hex.hexID, [bucketID])" :transform="`rotate(${hex.rotation * 60} 0 0)`" class="noClick colourOverlayPath" :class="store.viewSettings.colourOverlay === 1 ? 'halfOpacity' : ''" :fill="view.getTerrainColour(hex.hexID)" />
							</g>
						</g>
					</g>
				</g>

				<!-- NEW ROAD WAY -->
				<!-- new way-->
				<!-- Base Pavement for all networks -->
				<path v-if="1 == 2" v-for="(pathD, idx) in globalRoadNetworks" :key="'base-' + idx" :d="pathD" fill="none" stroke="#1C2526" :stroke-width="60 * store.RATIO" stroke-linejoin="round" stroke-linecap="round" />

				<!-- Dashed Markings for all networks -->
				<path v-if="1 == 2" v-for="(pathD, idx) in globalRoadNetworks" :key="'dash-' + idx" :d="pathD" fill="none" stroke="#F5F5F5" :stroke-width="10 * store.RATIO" :stroke-dasharray="`${20 * store.RATIO} ${20 * store.RATIO}`" />

				<!-- LAYER 2 -- EVERYTHING ELSE AT THE MOMENT-->
				<g v-for="(hex, idx) in hexesForDisplay" :key="idx" :transform="`translate(${hex.rawXY[0]} , ${hex.rawXY[1]})`">
					<!-- FINE TO ROTATE TO FLAT-->
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<!-- BRIDGES -->
						<g v-if="store.mapData.displaySettings.showBridges">
							<g v-for="(bridgeEntry, bridgeIdx) in hex.builtBridges" :key="bridgeIdx">
								<path class="noClick" :transform="store.hexStyle === rf.FLAT ? 'rotate(0 0 0)' : ''" :d="view.getBridgeSVGpath(hex.hexID, bridgeEntry, false, false).bridgeD" stroke="black" :stroke-width="40 * store.RATIO" fill="none" />
							</g>
						</g>
						<!-- ROADS -->
						<g v-if="store.mapData.displaySettings.showRoads && 1 == 1">
							<!-- Draw the roads and white lines -->
							<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 0 : 0} 0 0)`">
								<!-- full path-->
								<path class="noClick" :d="hex.fullRoadPath" stroke="#1C2526" :stroke-width="60 * store.RATIO" stroke-linejoin="round" stroke-linecap="round" />
								<path class="noClick" :d="hex.fullRoadPath" stroke="#F5F5F5" :stroke-width="(7 * store.RATIO).toFixed(0)" :stroke-dasharray="`${(25 * store.RATIO).toFixed(0)} ${(20 * store.RATIO).toFixed(0)}`" fill="none" />
							</g>
						</g>
					</g>
					<!-- NOT FINE TO ROTATE TO FLAT-->
					<!-- HOME MARKERS -->
					<g v-if="store.mapData.displaySettings.showHomeMakres">
						<g v-for="(homeMarker, idx2) in hex.homeMarkerGfxs" :key="idx2">
							<rect
								class="homeMarkerRect noClick"
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
						<g v-for="bldg in hex.buildingGfxs" :key="bldg.id">
							<!-- The Directive triggers the animation logic -->
							<g
								v-plop
								:style="{
									'--cx': bldg.pos[0] * store.RATIO + 'px',
									'--cy': bldg.pos[1] * store.RATIO + 'px',
								}">
								<!-- Ripple Effect (Behind Building) -->
								<circle class="city-ripple" :cx="bldg.pos[0] * store.RATIO" :cy="bldg.pos[1] * store.RATIO" :r="(bldg.width / 2) * store.RATIO" />

								<!-- The Building -->
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
						</g>

						<!-- MINE -->
						<g
							v-plop
							v-if="hex.mineData.length > 0"
							:style="{
								'--cx': hex.mineData[1][0] * store.RATIO + 'px',
								'--cy': hex.mineData[1][1] * store.RATIO + 'px',
							}">
							<!-- 🌊 The Ripple (Behind the mine) -->
							<circle class="city-ripple" :cx="hex.mineData[1][0] * store.RATIO" :cy="hex.mineData[1][1] * store.RATIO" :r="115 * store.RATIO" />

							<!-- The Mine Circle -->
							<circle class="mineSVGcircle" :cx="hex.mineData[1][0] * store.RATIO" :cy="hex.mineData[1][1] * store.RATIO" :r="115 * store.RATIO" fill="gray" stroke="#734A36" :stroke-width="50 * store.RATIO" filter="url(#f_mineDrop)" />

							<!-- Outer bright rim (outside the brown stroke) -->
							<circle :cx="hex.mineData[1][0] * store.RATIO" :cy="hex.mineData[1][1] * store.RATIO" :r="145 * store.RATIO" fill="none" stroke="rgba(255,255,255,0.85)" :stroke-width="10 * store.RATIO" />

							<!-- Iron Number -->
							<text :x="hex.mineData[1][0] * store.RATIO - (hex.mineData[2][1] >= 10 ? 55 : 40) * store.RATIO" :y="hex.mineData[1][1] * store.RATIO + 20 * store.RATIO" text-anchor="middle" dominant-baseline="middle" :style="{ 'font-size': (hex.mineData[2][1] >= 10 ? 100 : 175) * store.RATIO + 'px', fill: 'red', 'font-weight': 900, stroke: 'black', 'stroke-width': (hex.mineData[2][1] >= 10 ? 6 : 10) * store.RATIO + 'px' }">
								{{ hex.mineData[2][1] }}
							</text>

							<!-- Gold Number -->
							<text :x="hex.mineData[1][0] * store.RATIO + (hex.mineData[2][0] >= 10 ? 55 : 40) * store.RATIO" :y="hex.mineData[1][1] * store.RATIO + 20 * store.RATIO" text-anchor="middle" dominant-baseline="middle" :style="{ 'font-size': (hex.mineData[2][0] >= 10 ? 100 : 175) * store.RATIO + 'px', fill: 'gold', 'font-weight': 900, stroke: 'black', 'stroke-width': (hex.mineData[2][0] >= 10 ? 6 : 10) * store.RATIO + 'px' }">
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

				<!-- WALLS -->
				<g v-if="store.mapData.displaySettings.showWalls">
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
								<text
									v-if="edgeData.wall[0] > 1"
									:x="view.getWallSVGpointsFromHexID(edgeData.edgeHexIDs[0], edgeData.edgeHexIDs[1], false, true, false)[0]"
									:y="view.getWallSVGpointsFromHexID(edgeData.edgeHexIDs[0], edgeData.edgeHexIDs[1], false, true, false)[1]"
									:transform="store.hexStyle === rf.FLAT ? `rotate(-30 ${view.getWallSVGpointsFromHexID(edgeData.edgeHexIDs[0], edgeData.edgeHexIDs[1], false, true, false)[0]} ${view.getWallSVGpointsFromHexID(edgeData.edgeHexIDs[0], edgeData.edgeHexIDs[1], false, true, false)[1]})` : ''"
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

				<!-- HEX PIECES TO Highlight -->
				<g v-for="(entry, idx) in store.context.hexPiecesToHighlight" :key="idx" :transform="`translate(${model.getHexByID(entry[0]).rawXY[0]} , ${model.getHexByID(entry[0]).rawXY[1]})`">
					<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
						<path
							@click="map.clickedHighlight(entry, $event)"
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
							:fill-rule="model.getHexByID(entry[0]).hexTerrainID === rf.CITY ? 'evenodd' : ''"
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
						:style="{
							'stroke-width': store.refSize / 240 + 'px',
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

			<!-- Research Bubbles Overlay -->
			<transition name="fade">
				<div v-if="shouldShowResearchBubbles && transporterScreenPosition" class="researchBubblesOverlay" :style="{ left: transporterScreenPosition.x + 'px', top: transporterScreenPosition.y + 'px' }">
					<template v-for="(isResearched, idx) in controller.currentPlayerObj().RnD" :key="idx">
						<div v-if="isResearched === 0 && (idx !== rf.RND_FUNDAMENTAL_RESEARCH_IDX || (idx === rf.RND_FUNDAMENTAL_RESEARCH_IDX && store.gameOptions.useFundamentalResearch))" class="researchBubble" @click="produce.doResearch(idx)" :style="getBubblePosition(idx)">
							<div class="researchBubbleContent">
								<img :src="view.getImage(`research_${idx}`)" class="researchBubbleImg" />
								<span class="researchBubbleText">{{ rf.RND_STRINGS[idx] }}</span>
							</div>
						</div>
					</template>
				</div>
			</transition>

			<!-- Pickup/Select Bubbles Overlay -->
			<transition name="fade">
				<div v-if="shouldShowPickupSelectBubbles && transporterScreenPosition" class="researchBubblesOverlay" :style="{ left: transporterScreenPosition.x + 'px', top: transporterScreenPosition.y + 'px' }">
					<div class="researchBubble" @click="handlePickupBubbleClick" :style="getPickupSelectBubblePosition('pickup')">
						<div class="researchBubbleContent pickupPreview">
							<img :src="view.getImage(`transporter_${model.getTransporterByID(store.context.selectedTransporterIDforTM).type}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" class="researchBubbleImg pickupBottomImg" :style="{ width: rf.getTransporterStats(model.getTransporterByID(store.context.selectedTransporterIDforTM).type).width / 7 + 'px', height: rf.getTransporterStats(model.getTransporterByID(store.context.selectedTransporterIDforTM).type).height / 7 + 'px' }" />
							<img :src="view.getImage(`transporter_${model.getTransporterByID(store.context.selectedTransporterIDforPickupOrSelection).type}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" class="researchBubbleImg pickupTopImg" :style="{ width: rf.getTransporterStats(model.getTransporterByID(store.context.selectedTransporterIDforPickupOrSelection).type).width / 11 + 'px', height: rf.getTransporterStats(model.getTransporterByID(store.context.selectedTransporterIDforPickupOrSelection).type).height / 11 + 'px' }" />

							<span class="researchBubbleText">Pickup</span>
						</div>
					</div>
					<div class="researchBubble selectBubble" @click="handleSelectBubbleClick" :style="getPickupSelectBubblePosition('select')">
						<div class="researchBubbleContent">
							<img :src="view.getImage(`transporter_${model.getTransporterByID(store.context.selectedTransporterIDforPickupOrSelection).type}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" class="researchBubbleImg" :style="{ width: rf.getTransporterStats(model.getTransporterByID(store.context.selectedTransporterIDforPickupOrSelection).type).width / 7 + 'px', height: rf.getTransporterStats(model.getTransporterByID(store.context.selectedTransporterIDforPickupOrSelection).type).height / 7 + 'px' }" />
							<span class="researchBubbleText">Select</span>
						</div>
					</div>
				</div>
			</transition>

			<!-- Building Options Card -->
			<BuildingOptionsCard v-if="store.context.eligibleBuildingsToBuild.length > 0 && store.context.selectedTransporterIDforTM !== -1" :position="transporterScreenPosition" />
		</div>
		<ReplayArea v-if="store.viewSettings.replayAtBottom" />
	</div>
</template>

<style scoped>
.newHexOptionSVG {
	stroke: black;
	fill-opacity: 0.5;
	z-index: 6000;
}

.researchBubblesOverlay {
	position: absolute;
	pointer-events: none;
	z-index: 2000;
}

.researchBubble {
	position: absolute;
	pointer-events: auto;
	background: rgba(255, 255, 255, 0.95);
	border: 3px solid yellow;
	border-radius: 50%;
	width: 70px;
	height: 70px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
	transition:
		box-shadow 0.2s,
		border-color 0.2s;
}

.researchBubble:hover {
	box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
	border-color: lightgreen;
}

.selectBubble .researchBubbleImg {
	/* Creates a solid 2px outline by layering shadows in 4 directions */
	filter: drop-shadow(2px 0 0 lightgreen) drop-shadow(-2px 0 0 lightgreen) drop-shadow(0 2px 0 lightgreen) drop-shadow(0 -2px 0 lightgreen);
}

.pickupPreview {
	position: relative;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding-top: 5px;
}

.pickupBottomImg {
	position: absolute;
	bottom: 25px;
	left: 50%;
	transform: translateX(-50%);
}

.pickupTopImg {
	position: absolute;
	bottom: 38px;
	left: 0%;
	transform: translateX(-60%);
	filter: drop-shadow(1px 0 0 black) drop-shadow(-1px 0 0 black) drop-shadow(0 1px 0 black) drop-shadow(0 -1px 0 black);
}

.researchBubbleContent {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	transition: transform 0.2s ease;
	pointer-events: none;
}

.researchBubble:hover .researchBubbleContent {
	transform: scale(1.15);
}

.researchBubbleImg {
	width: 35px;
	height: 35px;
	pointer-events: none;
}

.researchBubbleText {
	font-size: 10px;
	font-weight: bold;
	text-align: center;
	margin-top: 2px;
	line-height: 1;
	width: 50px;
	overflow: hidden;
	text-overflow: ellipsis;
	pointer-events: none;
}

.pickupPreview .researchBubbleText {
	position: absolute;
	bottom: 15px;
	left: 50%;
	transform: translateX(-50%);
	margin-top: 0;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

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

.colourOverlayPath {
	stroke: none;
}

.halfOpacity {
	fill-opacity: 0.6;
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
	/* TODO: uncomment */
	/*pointer-events: none;*/
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

.errorPopup {
	position: fixed;
	background-color: red;
	color: white;
	padding: 10px;
	border-radius: 5px;
	opacity: 1;
	z-index: 2000;
}

.infoPopup {
	position: fixed;
	background-color: forestgreen;
	color: white;
	padding: 10px;
	border-radius: 5px;
	opacity: 1;
	z-index: 2000;
}

.fadeOut-enter-active,
.fadeOut-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeOut-enter,
.fadeOut-leave-active {
	opacity: 0;
}

@keyframes glow {
	to {
		opacity: 0.3;
	}
}

/*
.transporter-list-move {
	transition: transform 700ms ease-in-out;
}
	*/

/* Container for the building + ripple */
.building-plop-active {
	animation: plop-bounce 0.4s ease-out forwards;
	transform-origin: var(--cx) var(--cy);
}

/* The Ripple Effect */
.building-plop-active .city-ripple {
	fill: none;
	stroke: rgba(255, 255, 255, 0.8);
	stroke-width: 10px;
	transform-origin: var(--cx) var(--cy);
	animation: ripple-out 0.6s ease-out forwards;
}

/* Ensure ripple is hidden by default */
.city-ripple {
	opacity: 0;
	pointer-events: none;
}

@keyframes plop-bounce {
	0% {
		transform: scale(0);
		opacity: 0;
	}
	60% {
		transform: scale(1.2);
		opacity: 1;
	}
	100% {
		transform: scale(1);
		opacity: 1;
	}
}

@keyframes ripple-out {
	0% {
		transform: scale(0.8);
		opacity: 1;
	}
	100% {
		transform: scale(2.5);
		opacity: 0;
	}
}
</style>
