<script setup>
import * as rf from "../../js/RNBreference"
import * as view from "../../js/RNBview"
import * as map from "../../js/RNBmap"
import * as hd from "../../js/RNBhex"
import * as controller from "../../js/RNBcontroller.js"
import * as model from "../../js/RNBmodel"
import * as loc from "../../js/RNBlocation"
//import * as loc from "../../js/RNBlocation"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../../stores/RNBpersonal.js"
import BuildingInfo from "../Utils/BuildingInfo.vue"
import { computed } from "vue"
const personal = usePersonalStore()

const props = defineProps({
	type: {
		type: String,
		required: true,
		validator: (value) => ["bucket", "river", "docked"].includes(value),
	},
	bucketId: {
		type: Number, // Changed from Array to Number
		default: null,
	},
	riverId: {
		type: Number,
		default: null,
	},
	transporters: {
		type: Array,
		default: () => [],
	},
	resources: {
		type: Array,
		default: () => [],
	},
	buildings: {
		type: Array,
		default: () => [],
	},
	homeMarkers: {
		type: Array,
		default: () => [],
	},
	sideIdx: {
		type: Number,
		default: null,
	},
	bankIdx: {
		type: Number,
		default: null,
	},
})

const highlightBucket = computed(() => {
	return store.context.hexPiecesToHighlightUnderTransporters.some((entry) => entry[0] === store.mapData.zoomData.hexID && entry[1].includes(props.bucketId))
})

const sortedResources = computed(() => {
	return [...props.resources].sort((a, b) => {
		// First sort by type
		if (a.type !== b.type) return a.type - b.type
		// Then sort by moved status (moved first within each type)
		const aMoved = a.movedTransporterID !== -1 ? 0 : 1
		const bMoved = b.movedTransporterID !== -1 ? 0 : 1
		return aMoved - bMoved
	})
})

function clickedBucketPolygon(event) {
	if (!highlightBucket.value) return
	// hex ID, [buckets ID], [location]
	let entry = store.context.hexPiecesToHighlightUnderTransporters.find((entry) => entry[0] === store.mapData.zoomData.hexID && entry[1].includes(props.bucketId))

	map.clickedHighlight(entry, event)
}

function shouldShowTransporterUnloadText(transporterID) {
	if (!model.transporterCarriesTransporter(transporterID)) return false
	// So now it is carrying a trans
	if (!rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) return true
	// So now is is carrying a trans in movement phase = check if it has moveed
	const transporterObj = model.getTransporterByID(transporterID)
	const transporterStats = rf.getTransporterStats(transporterObj.type)
	if (transporterObj.remainingMoves < transporterStats.maxMoves) return true
	return false
}

/*function shouldShowCarriedTransporterAlreadyMovedText(transporterID) {
	const carriedTransporter = model.transportersOnTransporter(transporterID)[0]
	if (!carriedTransporter) return false
	if (carriedTransporter.movedThisTurn) return true
	return false
}*/

function shouldShowUnableToDropGeeseText(transporterID) {
	if (!model.anythingFollowingTransporter(transporterID)) return false
	const transporterObj = model.getTransporterByID(transporterID)
	if (!loc.isSeaVertexLocation(transporterObj.location)) return false
	if (map.hasOilRigOnHexID(transporterObj.location[1])) return false
	return true

}
</script>

<template>
	<div class="hexBucketContainer">
		<!-- SVG filters for transporter outlines -->
		<svg style="position: absolute; width: 0; height: 0">
			<defs>
				<filter id="f_orange_BD" x="-100%" y="-100%" width="300%" height="300%">
					<feFlood flood-color="orange" result="flood" />
					<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />
					<feMorphology operator="dilate" radius="3" in="color" result="thick" />
					<feGaussianBlur in="thick" stdDeviation="1" result="smooth" />
					<feComponentTransfer in="smooth">
						<feFuncA type="linear" slope="4" intercept="-1" />
					</feComponentTransfer>
				</filter>

				<filter id="f_red_BD" x="-100%" y="-100%" width="300%" height="300%">
					<feFlood flood-color="red" result="flood" />
					<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />
					<feMorphology operator="dilate" radius="3" in="color" result="thick" />
					<feGaussianBlur in="thick" stdDeviation="1" result="smooth" />
					<feComponentTransfer in="smooth">
						<feFuncA type="linear" slope="4" intercept="-1" />
					</feComponentTransfer>
				</filter>
			</defs>
		</svg>
		<div v-if="type === 'river'" class="hexSegmentImgDiv">
			<svg class="sectionSVG" :viewBox="store.hexStyle === rf.POINTY ? '-400 -464 800 928' : '-462.692 -401.000 925 802'">
				<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
					<!-- Hex outline -->
					<polygon :points="hd.getHexPoints(false, 1.4, true)" class="polygonHex" />
					<!-- Rivers -->
					<path :d="view.getRiverHighlightPath(store.mapData.zoomData.hexID, riverId, true)" :transform="`rotate(${model.getHexByID(store.mapData.zoomData.hexID).rotation * 60} 0 0)`" class="riverOutline" />
				</g>
			</svg>
		</div>
		<div v-else class="hexSegmentImgDiv">
			<svg class="sectionSVG" :viewBox="store.hexStyle === rf.POINTY ? '-400 -464 800 928' : '-462.692 -401.000 925 802'">
				<g :transform="store.hexStyle === rf.FLAT ? 'rotate(30 0 0)' : ''">
					<path v-if="type === 'bucket'" :d="view.getHexHighlightPath(store.mapData.zoomData.hexID, model.hexCurrentBucketToInitial(store.mapData.zoomData.hexID, bucketId), true)" :transform="`rotate(${model.getHexByID(store.mapData.zoomData.hexID).rotation * 60} 0 0)`" class="higlightOutlinePath" />
					<path v-else-if="type === 'docked'" :d="view.getWallSVGpointsFromHexIDModifiedForZoomPanelEdgeSummary(sideIdx, bankIdx)" class="higlightOutlinePath" />
					<polygon @click="clickedBucketPolygon($event)" :points="hd.getHexPoints(false, 1.4, true)" :class="highlightBucket ? 'polygonHexHighlight' : 'polygonHex'" />
				</g>
			</svg>
		</div>
		<div class="hexBucketContentsDiv">
			<template v-for="transporter in transporters" :key="transporter.id">
				<div class="gooseAndTransporterDiv">
					<!-- Res following Trans -->
					<div class="gooseAreaDiv" :class="{ gooseAreaDivHighlihgted: store.context.action === rf.ACT_TM_CHOOSE_GOOSE_LOCATION && store.context.selectedTransporterIDforTM === transporter.id }" @click="map.clickedGooseArea(transporter.id, store.context.gooseID)">
						<div
							v-for="(res, resIdx) in transporter.resourcesFollowingTransporter"
							:key="resIdx"
							class="resFollowingTransporterSummaryDiv"
							:class="{ resFollowingTransporterSummaryDivHighlighted: store.context.resourceIDsToHighlight.includes(res.id) }"
							@click="map.clickedResFollowingTransporter(res.id)"
							:style="{
								marginRight: resIdx !== transporter.resourcesFollowingTransporter.length - 1 ? '2px' : '0px',
							}">
							<img class="resFollowingTransporterSummaryImg" :src="view.getImage(res.gfx)" />
							<div v-if="res.movedTransporterID !== -1" class="triangle-overlay">
								<!-- Top Left -->
								<div class="tri-border top-left"></div>
								<div class="tri top-left"></div>

								<!-- Top Right -->
								<div class="tri-border top-right"></div>
								<div class="tri top-right"></div>

								<!-- Bottom Left -->
								<div class="tri-border bottom-left"></div>
								<div class="tri bottom-left"></div>

								<!-- Bottom Right -->
								<div class="tri-border bottom-right"></div>
								<div class="tri bottom-right"></div>
							</div>
						</div>

						<span class="gooseTextSpan" v-if="transporter.resourcesFollowingTransporter.length === 0">Geese</span>
					</div>
					<!-- Display Trans-->
					<img
						class="transporterImg"
						:src="view.getImage('transporter_' + String(transporter.type) + '_' + personal.getCorrectedColour(store.players[transporter.ownerIndex].colour))"
						@mouseover="transporter.borderColour === 'yellow' ? (transporter.borderColour = 'lightgreen') : ''"
						@mouseleave="store.context.transporterIDsToHighlight.includes(transporter.id) && transporter.borderColour === 'lightgreen' ? (transporter.borderColour = 'yellow') : ''"
						@click="map.clickedTransporter(transporter.id)"
						:class="{
							transporterHighlight: store.context.transporterIDsToHighlight === transporter.id && store.context.action === rf.ACT_TM_CHOOSE_GOOSE_LOCATION,
							transporterSelected: store.context.selectedTransporterIDforTM === transporter.id && store.context.action !== rf.ACT_TM_CHOOSE_GOOSE_LOCATION,
							transporterHighlight: store.context.selectedTransporterIDforTM !== 1 && store.context.transporterIDsToHighlight?.includes(transporter.id),
							transporterNormal: store.context.selectedTransporterIDforTM !== 1 && !store.context.transporterIDsToHighlight?.includes(transporter.id) && !transporter.movedThisTurn,
							transporterMovedOrange: transporter.movedThisTurn && transporter.remainingMoves > 0,
							transporterMovedRed: transporter.movedThisTurn && transporter.remainingMoves === 0,
						}" />
					<!-- Res On Trans -->
					<div class="resourcesGroup" v-if="transporter.resourcesOnTransporter.length > 0">
						<div v-for="res in transporter.resourcesOnTransporter" :key="res.id" class="resOnTransporterSummaryDiv" :class="[{ resOnTransporterSummaryDivHighlighted: store.context.resourceIDsToHighlight.includes(res.id) }, { resOnTransporterNormalSizeDiv: transporter.resourcesOnTransporter.length <= 3 }, { resOnTransporterSmallSizeDiv: transporter.resourcesOnTransporter.length > 3 }]" @click="map.clickedResOnTransporter(res.location[1], res.id)">
							<img class="resOnTransporterSummaryImg" :src="view.getImage(res.gfx)" />
							<div v-if="res.movedTransporterID !== -1" class="triangle-overlay">
								<!-- Top Left -->
								<div class="tri-border top-left"></div>
								<div class="tri top-left"></div>

								<!-- Top Right -->
								<div class="tri-border top-right"></div>
								<div class="tri top-right"></div>

								<!-- Bottom Left -->
								<div class="tri-border bottom-left"></div>
								<div class="tri bottom-left"></div>

								<!-- Bottom Right -->
								<div class="tri-border bottom-right"></div>
								<div class="tri bottom-right"></div>
							</div>
						</div>
					</div>

					<!-- Trans on Trans -->
					<template v-if="transporter.transportOnTransporterCopy.id >= 0">
						<div class="resourcesGroup">
							<img
								class="transporterOnTransporterImg"
								:src="view.getImage('transporter_' + String(transporter.transportOnTransporterCopy.type) + '_' + personal.getCorrectedColour(store.players[transporter.transportOnTransporterCopy.ownerIndex].colour))"
								@mouseover="transporter.transportOnTransporterCopy.borderColour === 'yellow' ? (transporter.transportOnTransporterCopy.borderColour = 'lightgreen') : ''"
								@mouseleave="store.context.transporterIDsToHighlight.includes(transporter.transportOnTransporterCopy.id) && transporter.transportOnTransporterCopy.borderColour === 'lightgreen' ? (transporter.transportOnTransporterCopy.borderColour = 'yellow') : ''"
								@click="map.clickedTransporter(transporter.transportOnTransporterCopy.id)"
								:class="{
									transporterHighlightCarried: store.context.transporterIDsToHighlight.includes(transporter.transportOnTransporterCopy.id),
									transporterNormalCarried: store.context.selectedTransporterIDforTM !== 1 && !store.context.transporterIDsToHighlight.includes(transporter.transportOnTransporterCopy.id) && !transporter.transportOnTransporterCopy.movedThisTurn,
									transporterMovedOrange: transporter.transportOnTransporterCopy.movedThisTurn && transporter.transportOnTransporterCopy.remainingMoves > 0,
									transporterMovedRed: transporter.transportOnTransporterCopy.movedThisTurn && transporter.transportOnTransporterCopy.remainingMoves === 0,
								}" />
						</div>
					</template>
				</div>

				<div class="transporterInfoDiv" v-if="rf.PHASE_MOVEMENTS.includes(store.gameflow.phase) && transporter.ownerIndex === controller.currentPlayerIndex()">
					Moves: {{ transporter.remainingMoves }}
					<br />
					<template v-if="model.doesTransporterHaveAlreadyMovedResource(transporter.id)">
						<span class="resAlreadyMovedSpan">Another transporter has already moved a good</span>
						<br />
					</template>
				</div>
				<div class="transporterInfoDiv" v-if="shouldShowTransporterUnloadText(transporter.id)">
					<span class="resAlreadyMovedSpan">You can only unload transporters at the start of movement phase</span>
					<br />
				</div>
				<div class="transporterInfoDiv" v-if="model.doesTransporterHaveAlreadyMovedTransporter(transporter.id)">
					<span class="resAlreadyMovedSpan">The carried transporter has already moved</span>
					<br />
				</div>
				<div class="transporterInfoDiv" v-if="shouldShowUnableToDropGeeseText(transporter.id)">
					<span class="resAlreadyMovedSpan">There is nowhere to drop the geese</span>
					<br />
				</div>
			</template>
			<!-- HOME MARKERS ON HEX (only for bucket)-->
			<template v-if="type === 'bucket' && homeMarkers.length > 0">
				<template v-for="marker in homeMarkers" :key="marker.id">
					<img class="homeMarkerSummaryImg" :src="view.getImage(`home_${personal.getCorrectedColour(store.players[marker.ownerIndex].colour)}`)" />
					<br/>
				</template>
			</template>
			<!-- RESOURCES ON HEX (only for bucket) -->
			<template v-if="type === 'bucket' && resources.length > 0">
				<template v-for="(res, index) in sortedResources" :key="res.id">
					<div class="resOnHexSummaryDiv" :class="{ resOnHexSummaryDivHighlighted: store.context.resourceIDsToHighlight.includes(res.id) }" @click="map.clickedRes($event, res.location, res.id)">
						<img class="resOnHexSummaryImg" :src="view.getImage(res.gfx)" />

						<div v-if="res.movedTransporterID !== -1" class="triangle-overlay">
							<!-- Top Left -->
							<div class="tri-border top-left"></div>
							<div class="tri top-left"></div>

							<!-- Top Right -->
							<div class="tri-border top-right"></div>
							<div class="tri top-right"></div>

							<!-- Bottom Left -->
							<div class="tri-border bottom-left"></div>
							<div class="tri bottom-left"></div>

							<!-- Bottom Right -->
							<div class="tri-border bottom-right"></div>
							<div class="tri bottom-right"></div>
						</div>
					</div>
					<br v-if="index === sortedResources.length - 1 || res.type !== sortedResources[index + 1].type" />
				</template>
			</template>
			<!-- BUILDINGS ON HEX (only for bucket)-->
			<template v-if="type === 'bucket' && buildings.length > 0">
				<template v-for="bldg in buildings" :key="bldg.id">
					<BuildingInfo :bldg="bldg" :highlightWholeBuilding="false" />
					<hr v-if="buildings.length > 1" style="border: 0.5px solid #eee; margin: 10px 0" />
				</template>
			</template>
		</div>
	</div>
</template>

<style scoped>
.hexBucketContainer {
	display: flex;
	border: 1px solid black;
	box-sizing: border-box;
	width: 100%;
	margin-left: 0px;
	/*margin-bottom: 20px;*/
	/*align-items: center;*/
	/*justify-content: center;*/
	padding-top: 5px;
}

.hexSegmentImgDiv {
	width: 50px;
	/* Fixed width for left div */
}

.sectionSVG {
	width: 50px;
	height: fit-content;
}

.hexBucketContentsDiv {
	flex: 1;
	/* Takes up remaining space */
}

.polygonHex {
	stroke: blue;
	stroke-width: 40px;
	fill: black;
	fill-opacity: 0;
}

.polygonHexHighlight {
	stroke: yellow;
	stroke-width: 60px;
	fill: black;
	fill-opacity: 0;
	cursor: pointer;
}

.polygonHexHighlight:hover {
	stroke: lightgreen;
}

.riverOutline {
	stroke: black;
	stroke-width: 40px;
	fill: blue;
}

.gooseAndTransporterDiv {
	display: flex;
	justify-content: center;
}

.resourcesGroup {
	display: flex;
	flex-wrap: wrap;
	margin-left: 8px;
}

.gooseAreaDiv {
	display: inline-flex;
	align-items: center; /* Vertically centers children */
	justify-content: center; /* Horizontally centers children */
	width: auto;
	min-width: 40px;
	height: auto;
	min-height: 40px;
	border: 2px dashed black;
	box-sizing: border-box;
	vertical-align: middle;
	text-align: center;
	padding: 2px;
	margin: 2px;
	margin-right: 8px;
}

.gooseAreaDivHighlihgted {
	border: 3px solid yellow;
}

.gooseAreaDivHighlihgted:hover {
	border: 3px solid lightgreen;
	cursor: pointer;
}

.resFollowingTransporterSummaryDiv {
	width: 40px;
	height: 40px;
	margin-right: 0px;
	border: 2px solid black;
	box-sizing: border-box;
	position: relative;
	display: inline-block;
	overflow: hidden;
}

.resFollowingTransporterSummaryImg {
	width: 100%;
	height: 100%;
}

.resFollowingTransporterSummaryDivHighlighted {
	border: 4px solid yellow;
}

.resFollowingTransporterSummaryDivHighlighted:hover {
	border: 4px solid lightgreen;
	cursor: pointer;
}

.resOnTransporterSummaryDiv {
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
	position: relative;
	display: inline-block;
	overflow: hidden;
}

.transporterOnTransporterImg {
	height: 25px;
	position: relative;
	display: inline-block;
	overflow: hidden;
	left: 0px;
}

.resOnTransporterSummaryImg {
	width: 100%;
	height: 100%;
}

.resOnTransporterSummaryDivHighlighted {
	border: 4px solid yellow;
}

.resOnTransporterNormalSizeDiv {
	width: 40px;
	height: 40px;
}

.resOnTransporterSmallSizeDiv {
	width: 30px;
	height: 30px;
}

.resOnTransporterSummaryDivHighlighted:hover {
	border: 4px solid lightgreen;
	cursor: pointer;
}

.transporterImg {
	height: 40px;
}

.homeMarkerSummaryImg {
	width: 50px;
	height: 50px;
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
}

.resOnHexSummaryDiv {
	position: relative;
	display: inline-block;
	width: 40px;
	height: 40px;
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
	overflow: hidden;
}

.resOnHexSummaryImg {
	width: 100%;
	height: 100%;
}

/** TRINAGLES */
.tri,
.tri-border {
	position: absolute;
	pointer-events: none;
}

/* The actual Red Triangle */
.tri {
	width: 9px;
	height: 9px;
	background-color: red;
	z-index: 2;
}

/* The Black Border Triangle (2px larger) */
.tri-border {
	width: 12px;
	height: 12px;
	background-color: black;
	z-index: 1;
}

/* Positioning and Clipping */
.top-left {
	top: 0;
	left: 0;
	clip-path: polygon(0 0, 100% 0, 0 100%);
}
.top-right {
	top: 0;
	right: 0;
	clip-path: polygon(100% 0, 100% 100%, 0 0);
}
.bottom-left {
	bottom: 0;
	left: 0;
	clip-path: polygon(0 100%, 0 0, 100% 100%);
}
.bottom-right {
	bottom: 0;
	right: 0;
	clip-path: polygon(100% 100%, 0 100%, 100% 0);
}
/** END TRIANGLES  */

.resOnHexSummaryDivHighlighted {
	border: 4px solid yellow;
}

.resOnHexSummaryDivHighlighted:hover {
	border: 4px solid lightgreen;
}

.transporterInfoDiv {
	font-weight: bolder;
	margin-bottom: 5px;
}

.resAlreadyMovedSpan {
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.gooseTextSpan {
	font-weight: bolder;
	font-size: 12px;
}

.transporterNormal {
	filter: drop-shadow(2px 2px 0 black) drop-shadow(-2px 2px 0 black) drop-shadow(-2px -2px 0 black) drop-shadow(2px -2px 0 black);
}

.transporterHighlight {
	filter: drop-shadow(3px 3px 0 yellow) drop-shadow(-3px 3px 0 yellow) drop-shadow(-3px -3px 0 yellow) drop-shadow(3px -3px 0 yellow);
}

.transporterHighlight:hover {
	cursor: pointer;
	filter: drop-shadow(3px 3px 0 lightgreen) drop-shadow(-3px 3px 0 lightgreen) drop-shadow(-3px -3px 0 lightgreen) drop-shadow(3px -3px 0 lightgreen);
}

.transporterSelected {
	filter: drop-shadow(3px 3px 0 lightgreen) drop-shadow(-3px 3px 0 lightgreen) drop-shadow(-3px -3px 0 lightgreen) drop-shadow(3px -3px 0 lightgreen);
}

.transporterNormalCarried {
	filter: drop-shadow(2px 2px 0 black) drop-shadow(-2px 2px 0 black) drop-shadow(-2px -2px 0 black) drop-shadow(2px -2px 0 black);
}

.transporterHighlightCarried {
	filter: drop-shadow(3px 3px 0 yellow) drop-shadow(-3px 3px 0 yellow) drop-shadow(-3px -3px 0 yellow) drop-shadow(3px -3px 0 yellow);
}

.transporterHighlightCarried:hover {
	cursor: pointer;
	filter: drop-shadow(3px 3px 0 lightgreen) drop-shadow(-3px 3px 0 lightgreen) drop-shadow(-3px -3px 0 lightgreen) drop-shadow(3px -3px 0 lightgreen);
}

.transporterMovedOrange {
	filter: drop-shadow(2px 2px 0 orange) drop-shadow(-2px 2px 0 orange) drop-shadow(-2px -2px 0 orange) drop-shadow(2px -2px 0 orange);
}

.transporterMovedRed {
	filter: drop-shadow(2px 2px 0 red) drop-shadow(-2px 2px 0 red) drop-shadow(-2px -2px 0 red) drop-shadow(2px -2px 0 red);
}
</style>
