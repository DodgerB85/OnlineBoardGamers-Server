<script setup>
import * as view from "../js/RNBview"
//import * as hd from "../js/RNBhex"
import * as rf from "../js/RNBreference"
import * as map from "../js/RNBmap"
//import * as vec from "../js/RNBvector"
//import * as util from "../js/RNButil"
import * as model from "../js/RNBmodel"
//import * as loc from "../js/RNBlocation"
//import * as controller from "../js/RNBcontroller"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

//const props = defineProps(["vertexProp", "hexProp"])
const props = defineProps(["transporterObjProp"])

import { ref, computed, watch } from "vue"

const isHovered = ref(false)

// Reactive coordinates for smooth animation
// const currentPt = ref(props.transporterObjProp.rawTransporterXY || [0, 0])
const currentPt = ref([0, 0]) // NEW
const isAnimating = ref(false)
const transitionDuration = ref("700ms") // Default duration
const transporterGroup = ref(null)

const imgWidth = computed(() => {
	let transporterStats = rf.getTransporterStats(props.transporterObjProp.type)
	let width = transporterStats.width
	if (props.transporterObjProp.location[0] === rf.LOCATION_TRANSPORTER) width /= 2
	return width * store.RATIO
})
const transporterImgHeight = computed(() => {
	let transporterStats = rf.getTransporterStats(props.transporterObjProp.type)
	let height = transporterStats.height
	if (props.transporterObjProp.location[0] === rf.LOCATION_TRANSPORTER) height /= 2
	return height * store.RATIO
})
const resOnTransporterWidth = computed(() => ((rf.DEFAULT_RES_WIDTH * 5) / 6) * store.RATIO)
const resOnTransporterHeight = computed(() => ((rf.DEFAULT_RES_HEIGHT * 5) / 6) * store.RATIO)

const getComputedTranslation = computed(() => {
	return `translate(${currentPt.value[0]}, ${currentPt.value[1]})`
})

/**************************************
 *
 *
 * Animation watcher
 *
 *
 **************************************/
watch(
	// Watch the specific length, the location string, and rawTransporterXY to catch changes accurately
	[() => props.transporterObjProp.animationWaypoints?.length, () => JSON.stringify(props.transporterObjProp.location), () => JSON.stringify(props.transporterObjProp.rawTransporterXY)],
	([newLen, newLocJson, newRawXYJson], [_oldLen, oldLocJson, oldRawXYJson]) => {
		const hasWaypoints = newLen > 0
		const locChanged = newLocJson !== oldLocJson
		const rawXYChanged = newRawXYJson !== oldRawXYJson

		if (hasWaypoints) {
			// If already animating, the existing loop will pick up the new points
			// if you aren't clearing the array inside the loop.
			// if you ARE clearing it, call a 'queue' function instead.
			if (!isAnimating.value) {
				animateTransporter()
			}
		} else if ((locChanged || rawXYChanged) && !isAnimating.value) {
			transitionDuration.value = "700ms"
			updateToFinalPosition("watch, not animating")
		}
	}
)

function animateTransporter() {
	if (isAnimating.value) return
	isAnimating.value = true

	const transporterObj = model.getTransporterByID(props.transporterObjProp.id)
	const waypoints = [...transporterObj.animationWaypoints]
	transporterObj.animationWaypoints = [] // Clear early to prevent double triggers

	let currentWaypointIndex = 0
	let startTime = null
	//     let startPt = [...transporterObj.rawTransporterXY.slice(0,2)]
	let startPt = [...currentPt.value] // NEW

	function step(timestamp) {
		if (!startTime) startTime = timestamp

		const targetWaypoint = waypoints[currentWaypointIndex]
		const duration = targetWaypoint[2]
		const elapsed = timestamp - startTime

		if (elapsed < duration) {
			// Calculate progress (0 to 1)
			const t = elapsed / duration

			// Interpolate X and Y
			currentPt.value = [startPt[0] + (targetWaypoint[0] - startPt[0]) * t, startPt[1] + (targetWaypoint[1] - startPt[1]) * t]
			requestAnimationFrame(step)
		} else {
			// Leg complete: Snap to exact target
			currentPt.value = [targetWaypoint[0], targetWaypoint[1]]
			currentWaypointIndex++

			if (currentWaypointIndex < waypoints.length) {
				// Prepare for next leg
				startTime = timestamp
				startPt = [...currentPt.value]
				requestAnimationFrame(step)
			} else {
				// All waypoints done
				finishAnimation()
			}
		}
	}

	function finishAnimation() {
		updateToFinalPosition("finish anim function")
		setTimeout(() => {
			isAnimating.value = false
		}, 100) // Small buffer to ensure final sync
	}

	requestAnimationFrame(step)
}

function updateToFinalPosition(_SOURCE_FLAG) {
	const transporterObj = model.getTransporterByID(props.transporterObjProp.id)
	const transporterStats = rf.getTransporterStats(transporterObj.type)
	let pt = map.getTransporterPositionFromLocation(transporterObj.location, transporterStats, props.transporterObjProp.id)
	transitionDuration.value = "700ms" // Ensure duration
	//nextTick(() => {
	if (pt.length !== 2) {
		rf.doAdminAlrt(`updateToFinalPosition: pt.length !== 2 pt: ${JSON.stringify(pt)}`)
		pt = pt.slice(0, 2)
	}
	currentPt.value = pt
	transporterObj.rawTransporterXY = pt
	// NOW perform the visual drop of following geese, if they need to be
	let resourcesFollowingTransporter = model.resourcesFollowingTransporter(props.transporterObjProp.id)
	for (let i = 0; i < resourcesFollowingTransporter.length; i++) {
		if (resourcesFollowingTransporter[i].autoDropLocationAfterFollowingTransporter.length > 0) {
			resourcesFollowingTransporter[i].location = [...resourcesFollowingTransporter[i].autoDropLocationAfterFollowingTransporter]
			resourcesFollowingTransporter[i].autoDropLocationAfterFollowingTransporter.splice(0)
		}
	}
	//})
}

/**************************************
 *
 *
 * END Animation watcher
 *
 *
 **************************************/

function getresFollowingTransporterPos(maxPos, idx) {
	if (maxPos <= 3) return [-resOnTransporterWidth.value, idx * 50 * store.RATIO]
	return [-resOnTransporterWidth.value, idx * 25 * store.RATIO]
}

function getresOnTransporterPos(idx) {
	if (idx < 4) return [50 * idx * store.RATIO, -resOnTransporterHeight.value / 2]

	const rowIdx = idx - 4
	return [25 * store.RATIO + 50 * rowIdx * store.RATIO, 0]
}

function isTransporterSelectable() {
	if (store.context.transporterIDsToHighlight.includes(props.transporterObjProp.id)) return true
	return false
}

// Computed property for transporter resOnTransporters
const getComputedTransporterResources = computed(() => {
	return model.resourcesOnTransport(props.transporterObjProp.id)
})

// Computed property for transporter resOnTransporters
const getComputedTransporterFollowerResources = computed(() => {
	return model.resourcesFollowingTransporter(props.transporterObjProp.id)
})

const getComputedImageLocal = computed(() => {
	return view.getImage("transporter_" + String(props.transporterObjProp.type) + "_" + personal.getCorrectedColour(store.players[props.transporterObjProp.ownerIndex].colour))
})

const getComputedTransporterHighlightFilter = computed(() => {
	// 1. Is it currently selected in the store?
	const isSelected = store.context.selectedTransporterIDforTM === props.transporterObjProp.id

	// 2. Is it currently being hovered AND is it actually selectable?
	// (We only want the green glow if it's a valid move)
	const shouldShowGreen = isSelected || (isHovered.value && isTransporterSelectable())
	let filter = "f_black"
	if (shouldShowGreen) filter = "f_lightGreen"
	else if (isTransporterSelectable()) filter = "f_yellow"

	return `url(#${filter})`
})

// Initialize position
transitionDuration.value = "0ms" // NEW
updateToFinalPosition("RAW")
</script>

<template>
	<g ref="transporterGroup" :transform="getComputedTranslation" class="transporterSVGimg" :style="[{ '--ratio': store.RATIO }, isAnimating ? 'transition: none;' : `transition: transform ${transitionDuration};`]">
		<!-- GOOSE FOLLOWING AREA -->
		<rect v-if="store.context.action === rf.ACT_TM_CHOOSE_GOOSE_LOCATION && store.context.selectedTransporterIDforTM === props.transporterObjProp.id" @click="map.clickedGooseArea(props.transporterObjProp.id, store.context.gooseID)" :x="-resOnTransporterWidth - 40 * store.RATIO" :y="0 - 10 * store.RATIO" :rx="20 * store.RATIO" :ry="20 * store.RATIO" :stroke-width="20 * store.RATIO" class="resFollowingAreaSVGrect" :width="resOnTransporterWidth" :height="transporterImgHeight" />
		<!-- RES FOLLOWING TRANSPORTER-->
		<g v-for="(computedResObj, idx) in getComputedTransporterFollowerResources" :key="idx">
			<g :transform="`translate(${getresFollowingTransporterPos(getComputedTransporterResources.length, idx)[0]},${getresFollowingTransporterPos(getComputedTransporterResources.length, idx)[1]})`">
				<rect
					class="resOnTransporterSVGrect"
					:class="{ resHighlight: store.context.resourceIDsToHighlight.includes(computedResObj.id) }"
					:style="{
						pointerEvents: store.context.resourceIDsToHighlight.includes(computedResObj.id) ? 'painted' : 'none',
						strokeWidth: store.context.resourceIDsToHighlight.includes(computedResObj.id) ? 20 * store.RATIO : 2 * store.RATIO,
					}"
					@click="map.clickedResFollowingTransporter(computedResObj.id)"
					:width="resOnTransporterWidth"
					:height="resOnTransporterHeight"
					:fill="`url(#pattern_${computedResObj.gfx})`" />
				<!-- The Triangle Indicator (Top-Left) -->
				<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidth / 2, resOnTransporterHeight / 2], resOnTransporterWidth, resOnTransporterHeight, 0, 0.75)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
				<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidth / 2, resOnTransporterHeight / 2], resOnTransporterWidth, resOnTransporterHeight, 1, 0.75)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
				<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidth / 2, resOnTransporterHeight / 2], resOnTransporterWidth, resOnTransporterHeight, 2, 0.75)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
				<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidth / 2, resOnTransporterHeight / 2], resOnTransporterWidth, resOnTransporterHeight, 3, 0.75)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
			</g>
		</g>
		<!-- TRANSPORTER -->
		<!-- THE SINGLE SHADOW LAYER -->
		<!-- This one image will become the entire outline thanks to the filter -->
		<image v-if="transporterObjProp.movedThisTurn" :width="imgWidth" :height="transporterImgHeight" :xlink:href="getComputedImageLocal" :filter="transporterObjProp.remainingMoves > 0 ? 'url(#f_orange)' : 'url(#f_red)'" style="pointer-events: none" />
		<image :width="imgWidth" :height="transporterImgHeight" :xlink:href="getComputedImageLocal" :filter="getComputedTransporterHighlightFilter" style="pointer-events: none" />

		<!-- THE MAIN TRANSPORTER IMAGE -->
		<image
			@click="map.clickedTransporter(transporterObjProp.id)"
			:width="imgWidth"
			@mouseover="isHovered = true"
			@mouseleave="isHovered = false"
			:height="transporterImgHeight"
			:xlink:href="getComputedImageLocal"
			preserveAspectRatio="none"
			class="transporterBaseImage"
			:style="{
				pointerEvents: isTransporterSelectable() ? 'painted' : 'painted',
			}" />
		<!-- Planes & Aeroports: show the current movement mode (FLY/TAXI) on the selected plane -->
		<text
			v-if="props.transporterObjProp.type === rf.PLANE && store.context.selectedTransporterIDforTM === props.transporterObjProp.id"
			:x="0"
			:y="-transporterImgHeight / 2 - 10 * store.RATIO"
			:font-size="28 * store.RATIO"
			fill="white"
			stroke="black"
			:text-anchor="middle">
			{{ store.context.selectedPlaneMode === rf.MOVE_TAXI ? "TAXI" : "FLY" }}
		</text>
		<!-- RESOURCES ON TRANSPORTER-->
		<g v-for="(computedResObj, idx) in getComputedTransporterResources" :key="idx">
			<g :transform="`translate(${getresOnTransporterPos(idx)[0]},${getresOnTransporterPos(idx)[1]})`">
				<rect
					class="resOnTransporterSVGrect"
					:class="{ resHighlight: store.context.resourceIDsToHighlight.includes(computedResObj.id) }"
					:style="{
						pointerEvents: store.context.resourceIDsToHighlight.includes(computedResObj.id) ? 'painted' : 'none',
						strokeWidth: store.context.resourceIDsToHighlight.includes(computedResObj.id) ? 20 * store.RATIO : 2 * store.RATIO,
					}"
					@click="map.clickedResOnTransporter(props.transporterObjProp.id, computedResObj.id)"
					:width="resOnTransporterWidth"
					:height="resOnTransporterHeight"
					:fill="`url(#pattern_${computedResObj.gfx})`" />
				<!-- The Triangle Indicator (Top-Left) -->
				<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidth / 2, resOnTransporterHeight / 2], resOnTransporterWidth, resOnTransporterHeight, 0, 0.75)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
				<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidth / 2, resOnTransporterHeight / 2], resOnTransporterWidth, resOnTransporterHeight, 1, 0.75)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
				<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidth / 2, resOnTransporterHeight / 2], resOnTransporterWidth, resOnTransporterHeight, 2, 0.75)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
				<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidth / 2, resOnTransporterHeight / 2], resOnTransporterWidth, resOnTransporterHeight, 3, 0.75)" fill="red" stroke="#000" :stroke-width="10 * store.RATIO" />
			</g>
		</g>
	</g>
</template>

<style scoped>
.transporterSVGimg,
.resOnTransporterSVGrect {
	transition: transform var(--transition-duration, 700ms) linear;
	will-change: transform;
	stroke: aliceblue;
}

.transporterSVGimg {
	backface-visibility: hidden;
	-webkit-backface-visibility: hidden;
}

.resHighlight {
	stroke: yellow;
}

.resHighlight:hover {
	cursor: pointer;
	stroke: lightgreen;
}

.resFollowingAreaSVGrect {
	pointer-events: "painted";
	stroke: yellow;
	fill-opacity: 0;
	fill: "black";
}

.resFollowingAreaSVGrect:hover {
	cursor: pointer;
	stroke: lightgreen;
}
</style>
