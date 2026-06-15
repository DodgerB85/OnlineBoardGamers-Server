<script setup>
import * as rf from "../js/TGZreference"
import * as map from "../js/TGZmap"
import * as view from "../js/TGZview"
import * as model from "../js/TGZmodel"
import * as controller from "../js/TGZcontroller"
import { ref } from "vue"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

const ghostImgRef = ref(null)
const ghostDivRef = ref(null)

function clickedOnSquare(index) {
	ghostImgRef.value.style.display = "none"
	ghostDivRef.value.style.display = "none"

	if (store.context.action === rf.ACT_BUILD_MON || store.context.action === rf.ACT_FIRST_MON) {
		model.addMonument(index)
		store.context.monumentsToPlace--
		if (store.context.monumentsToPlace > 0) store.context.indexesToHighlightClick = map.getSpacesForMonument(model.hasNomads(controller.currentPlayerObj()), false)
		else if (store.context.monumentsToPlace <= 0) {
			// Go back for OYA raising
			/*if (store.context.actionsTaken.includes(rf.ACT_RAISE_MON)) {
				//let histAction = rf.HIST_BUILD_MON
				store.context.historyObj = store.context.historyObj.concat(store.context.upgradingMonumentProcess)
				model.addHistory(rf.HIST_BUILD_OYA_MON, store.gameflow.turnOrder[0], 0, store.context.historyObj)
				// Remove ghosts
				let ghostDivs = document.getElementsByClassName("ghostDiv")
				for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"

				store.clearVars(true)
				model.setupRaiseMonument(true)
			} else {*/
				let histAction = rf.HIST_BUILD_MON
				if (store.gameflow.turn === 0) histAction = rf.HIST_BUILD_FIRST_MON
				model.addHistory(histAction, store.gameflow.turnOrder[0], 0, store.context.historyObj)
				store.clearVars(true)
			//}
		}
	} else if (store.context.action === rf.ACT_BUILD_RES) model.addResource(index, store.context.itemBeingAdded, store.context.itemBeingAddedRotation)
	else if (store.context.action === rf.ACT_BUILD_WATER) model.addResource(index, store.context.itemBeingAdded, store.context.itemBeingAddedRotation)
	else if (store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN || store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN) model.addCraftsman(index, store.context.itemBeingAdded, store.context.itemBeingAddedRotation)
}

function handleTouchStart(event, index) {
	event.preventDefault()

	const startTime = new Date().getTime()

	const touchEndHandler = () => {
		const endTime = new Date().getTime()
		const touchDuration = endTime - startTime

		event.target.removeEventListener("touchend", touchEndHandler)

		if (touchDuration < 200) {
			clickedOnSquare(index)
		} else {
			changeGhost(event, index, true)
		}
	}

	event.target.addEventListener("touchend", touchEndHandler)
}

function changeGhost(event, index, add) {

	if (index === store.topMenuViews.currentGhostIndex) return
	store.topMenuViews.currentGhostIndex = index
	if (!add) {
		ghostImgRef.value.style.display = "none"
		ghostDivRef.value.style.display = "none"
		return
	}
	// PLACING MONUMENT
	if (store.context.action === rf.ACT_BUILD_MON || store.context.action === rf.ACT_FIRST_MON) {
		ghostDivRef.value.style.display = "block"
		ghostDivRef.value.style.width = store.refSize / 6 - (store.refSize * 6) / 240 + "px"
		ghostDivRef.value.style.height = store.refSize / 6 - (store.refSize * 6) / 240 + "px"
		ghostDivRef.value.style.top = view.getIndexPos(index)[0] + (1.5 * store.refSize) / 240 + "px"
		ghostDivRef.value.style.left = view.getIndexPos(index)[1] + (1.5 * store.refSize) / 240 + "px"
		ghostDivRef.value.style["border-width"] = (store.refSize * 3) / 240 + "px"
		ghostDivRef.value.style["background-color"] = personal.getCorrectedColourHex(store.players[store.gameflow.turnOrder[0]].colour)
		store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs([index], model.has_god(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, 0)
	}
	// PLACING RESOURCE
	else if (store.context.action === rf.ACT_BUILD_RES || store.context.action === rf.ACT_BUILD_WATER) {
		ghostImgRef.value.classList.remove("r1")
		ghostImgRef.value.src = view.getImage("res" + String(store.context.itemBeingAdded))
		ghostImgRef.value.style.display = "block"

		ghostImgRef.value.style.top = view.getIndexPos(index)[0] + (0 * store.refSize) / 240 + "px"
		ghostImgRef.value.style.left = view.getIndexPos(index)[1] + (0 * store.refSize) / 240 + "px"
		ghostImgRef.value.style.width = store.refSize / 6 + "px"
		ghostImgRef.value.style.height = store.refSize / 6 + "px"

		if (rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded)) {
			ghostImgRef.value.style.width = store.refSize / 3 + "px"
			if (store.context.itemBeingAddedRotation === 1) {
				ghostImgRef.value.classList.add("r1")
				ghostImgRef.value.style.top = view.getIndexPos(index)[0] + (20 * store.refSize) / 240 + "px"
				ghostImgRef.value.style.left = view.getIndexPos(index)[1] - (20 * store.refSize) / 240 + "px"
			}
		}
		ghostImgRef.value.style["border-width"] = (store.refSize * 3) / 240 + "px"

		if (store.context.itemBeingAdded !== rf.WATER_TILE) {
			let data = map.getAllCraftsmanDataWithinRangeOfZoneAndOutOfRange([index], model.has_god(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, rf.RES_TILE_TO_SQ[store.context.itemBeingAdded])
			store.context.craftsmanDataToPipGreen = data[0]
			store.context.craftsmanDataToPipRed = data[1]
			store.topMenuViews.hubRangesToHighlight.splice(0)
			store.topMenuViews.hubRangesToHighlight.push(map.getAllSquaresWithinRangeOfZone([index], model.has_god(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, false))
		}
	}
	// PLACING CRAFTSMAN
	else if (store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN || store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN) {
		ghostImgRef.value.src = view.getImage("craftsman" + String(store.context.itemBeingAdded))
		ghostImgRef.value.style.display = "block"
		ghostImgRef.value.classList.remove("r1")

		ghostImgRef.value.style.top = view.getIndexPos(index)[0] + (0 * store.refSize) / 240 + "px"
		ghostImgRef.value.style.left = view.getIndexPos(index)[1] + (0 * store.refSize) / 240 + "px"

		ghostImgRef.value.style.width = store.refSize / 6 - (store.refSize * 0) / 240 + "px"
		ghostImgRef.value.style.height = store.refSize / 6 - (store.refSize * 0) / 240 + "px"

		if (rf.FOUR_SIZE_TILES.includes(store.context.itemBeingAdded)) {
			ghostImgRef.value.style.width = (store.refSize * 2) / 6 + "px"
			ghostImgRef.value.style.height = (store.refSize * 2) / 6 + "px"
		} else if (rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded)) {
			ghostImgRef.value.style.width = (store.refSize * 2) / 6 + "px"
			if (store.context.itemBeingAddedRotation === 1) {
				ghostImgRef.value.classList.add("r1")
				ghostImgRef.value.style.top = view.getIndexPos(index)[0] + (20 * store.refSize) / 240 + "px"
				ghostImgRef.value.style.left = view.getIndexPos(index)[1] - (20 * store.refSize) / 240 + "px"
			}
		} /*else if (store.context.itemBeingAdded === rf.BLACKSMITH_TILE) {
			ghostImgRef.value.style.width = (store.refSize * 3) / 6 + "px"
			ghostImgRef.value.style.height = (store.refSize * 3) / 6 + "px"
			ghostImgRef.value.style.left = view.getIndexPos(index - 1)[1] + (0 * store.refSize) / 240 + "px"
		}*/
		ghostImgRef.value.style["border-width"] = (store.refSize * 6) / 240 + "px"
		/*if (store.context.itemBeingAdded === rf.BLACKSMITH_TILE) {
			ghostImgRef.value.style.filter = `drop-shadow(${(store.refSize * 6) / 240}px 0 0 ${personal.getCorrectedColourHex(store.players[store.gameflow.turnOrder[0]].colour)}) drop-shadow(0 ${(store.refSize * 6) / 240}px 0 ${personal.getCorrectedColourHex(store.players[store.gameflow.turnOrder[0]].colour)}) drop-shadow(-${(store.refSize * 6) / 240}px 0 0 ${personal.getCorrectedColourHex(store.players[store.gameflow.turnOrder[0]].colour)}) drop-shadow(0 -${(store.refSize * 6) / 240}px 0 ${personal.getCorrectedColourHex(store.players[store.gameflow.turnOrder[0]].colour)})`
			ghostImgRef.value.style.border = "none"
		} else*/ ghostImgRef.value.style["border-color"] = personal.getCorrectedColourHex(store.players[store.gameflow.turnOrder[0]].colour)

		// Now add pips to resources
		let resource_sq_arr = rf.getPrimaryResourceSqs(store.context.itemBeingAdded)
		let inRange = []
		let outOfRange = []
		for (let i = 0; i < resource_sq_arr.length; i++) {
			let [inRange_i, outOfRange_i] = map.getResourceRangeStatusForPlacingCraftsman(index, store.context.range, resource_sq_arr[i], store.context.itemBeingAdded, store.context.itemBeingAddedRotation)
			inRange = inRange.concat(inRange_i)
			outOfRange = outOfRange.concat(outOfRange_i)
		}
		store.context.indexesToPipGreen = inRange
		store.context.indexesToPipRed = outOfRange
		let zone = [index]
		if (rf.FOUR_SIZE_TILES.includes(store.context.itemBeingAdded) || store.context.itemBeingAddedRotation === 0) zone.push(index + 1)
		if (rf.FOUR_SIZE_TILES.includes(store.context.itemBeingAdded) || store.context.itemBeingAddedRotation === 1) zone.push(index + map.getSw())
		if (rf.FOUR_SIZE_TILES.includes(store.context.itemBeingAdded)) zone.push(index + map.getSw() + 1)
		/*if (store.context.itemBeingAdded === rf.BLACKSMITH_TILE) {
      zone.push(index + map.getSw() - 1)
      zone.push(index + map.getSw())
      zone.push(index + map.getSw() + 1)
      zone.push(index + (map.getSw()*2))
    }*/
		store.topMenuViews.hubRangesToHighlight.splice(0)
		store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs(zone, model.has_god(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, 0)
	}
}

function hubRangeSqBottomBorder(hubRange, index) {
	let Sw = map.getSw()
	// If on bottom then true
	if (index + Sw > store.coords.length) return true
	// if southern neighbour not in hubRnage, return true
	if (!hubRange.includes(index + Sw)) return true
	return false
}
function hubRangeSqTopBorder(hubRange, index) {
	let Sw = map.getSw()
	// If on top then true
	if (index < Sw) return true
	// if southern neighbour not in hubRnage, return true
	if (!hubRange.includes(index - Sw)) return true
	return false
}
function hubRangeSqLeftBorder(hubRange, index) {
	let Sw = map.getSw()
	// If on left then true
	if (index % Sw == 0) return true
	// if left neighbour not in hubRnage, return true
	if (!hubRange.includes(index - 1)) return true
	return false
}

function hubRangeSqRightBorder(hubRange, index) {
	let Sw = map.getSw()
	// If on right then true
	if (index % Sw == Sw - 1) return true
	// if southern neighbour not in hubRnage, return true
	if (!hubRange.includes(index + 1)) return true
	return false
}
</script>

<template>
	<!-- HIGHLIGHT SQUARES TO CLICK -->
	<template v-if="personal.canPlay()">
		<TransitionGroup name="fade-sq">
			<svg
				v-for="index in store.context.indexesToHighlightClick"
				:key="index"
				class="higlightSquareToClick"
				:style="{
					width: (store.refSize * 38) / 240 + 'px',
					height: (store.refSize * 38) / 240 + 'px',
					top: view.getIndexPos(index)[0] + 'px',
					left: view.getIndexPos(index)[1] + 'px',
				}"
				@click="clickedOnSquare(index)"
				@mouseover="changeGhost($event, index, true)"
				@mouseleave="changeGhost($event, index, false)"
				@touchstart="handleTouchStart($event, index)">
				<rect
					:style="{
						width: '100%',
						height: '100%',
					}"
					oncontextmenu="return false;" />
			</svg>
		</TransitionGroup>
	</template>

	<!-- HIGHLIGHT SQUARES GREEN -->
	<template v-for="(index, indexCount) in store.context.indexesToHighlightGreen" :key="indexCount">
		<svg
			class="higlightSquareGreen"
			:style="{
				width: (store.refSize * 38) / 240 + 'px',
				height: (store.refSize * 38) / 240 + 'px',
				top: view.getIndexPos(index)[0] + 'px',
				left: view.getIndexPos(index)[1] + 'px',
			}">
			<rect
				:style="{
					width: '100%',
					height: '100%',
				}" />
		</svg>
	</template>

	<!-- HIGHLIGHT SQUARES RED -->
	<template v-for="(index, indexCount) in store.context.indexesToHighlightRed" v-bind:key="indexCount">
		<svg
			class="higlightSquareRed"
			:style="{
				width: (store.refSize * 38) / 240 + 'px',
				height: (store.refSize * 38) / 240 + 'px',
				top: view.getIndexPos(index)[0] + 'px',
				left: view.getIndexPos(index)[1] + 'px',
			}">
			<rect
				:style="{
					width: '100%',
					height: '100%',
				}" />
		</svg>
	</template>

	<!-- PIP SQUARES GREEN -->
	<template v-for="(index, indexCount) in store.context.indexesToPipGreen" v-bind:key="indexCount">
		<div
			class="pipSquaresGreen"
			:style="{
				width: (store.refSize * 38) / 2 / 240 + 'px',
				height: (store.refSize * 38) / 2 / 240 + 'px',
				top: view.getIndexPos(index)[0] + (store.refSize * 38) / 2 / 240 + 'px',
				left: view.getIndexPos(index)[1] + (store.refSize * 19) / 2 / 240 + 'px',
			}"
			:class="map.getTakenResourceSquaresForCraftsman(store.context.itemBeingAdded, store.context.range).includes(index) ? 'crossBackground' : ''"></div>
	</template>

	<!-- PIP SQUARES RED -->
	<template v-for="(index, indexCount) in store.context.indexesToPipRed" v-bind:key="indexCount">
		<div
			class="pipSquaresRed"
			:style="{
				width: (store.refSize * 38) / 2 / 240 + 'px',
				height: (store.refSize * 38) / 2 / 240 + 'px',
				top: view.getIndexPos(index)[0] + (store.refSize * 38) / 2 / 240 + 'px',
				left: view.getIndexPos(index)[1] + (store.refSize * 19) / 2 / 240 + 'px',
			}"
			:class="map.getTakenResourceSquaresForCraftsman(store.context.itemBeingAdded, store.context.range).includes(index) ? 'crossBackground' : ''"></div>
	</template>

	<!-- PIP CRAFTSMAN DATA GREEN -->
	<template v-for="(craftsmanData, indexCount) in store.context.craftsmanDataToPipGreen" v-bind:key="indexCount">
		<div
			class="pipSquaresGreen"
			:style="{
				width: (store.refSize * 38) / 2 / 240 + 'px',
				height: (store.refSize * 38) / 2 / 240 + 'px',
				top: view.getIndexPosForCraftsmanPip(craftsmanData)[0] + (store.refSize * 38) / 2 / 240 + 'px',
				left: view.getIndexPosForCraftsmanPip(craftsmanData)[1] + (store.refSize * 19) / 2 / 240 + 'px',
			}"></div>
	</template>

	<!-- PIP CRAFTSMAN DATA RED -->
	<template v-for="(craftsmanData, indexCount) in store.context.craftsmanDataToPipRed" v-bind:key="indexCount">
		<div
			class="pipSquaresRed"
			:style="{
				width: (store.refSize * 38) / 2 / 240 + 'px',
				height: (store.refSize * 38) / 2 / 240 + 'px',
				top: view.getIndexPosForCraftsmanPip(craftsmanData)[0] + (store.refSize * 38) / 2 / 240 + 'px',
				left: view.getIndexPosForCraftsmanPip(craftsmanData)[1] + (store.refSize * 19) / 2 / 240 + 'px',
			}"></div>
	</template>

	<!-- hubRangesToHighlight -->
	<template v-for="(hubRange, idx) in store.topMenuViews.hubRangesToHighlight" v-bind:key="idx">
		<template v-for="(index, idx2) in hubRange" :key="idx2">
			<div
				class="hubRangeDiv"
				:style="{
					width: store.refSize / 6 + 'px',
					height: store.refSize / 6 + 'px',
					top: view.getIndexPos(index)[0] + 'px',
					left: view.getIndexPos(index)[1] + 'px',
					'border-width': (store.refSize * 5) / 240 + 'px',
				}"
				:class="['hubRangeSq' + (idx % 8), { borderTop: hubRangeSqTopBorder(hubRange, index) }, { borderBottom: hubRangeSqBottomBorder(hubRange, index) }, { borderLeft: hubRangeSqLeftBorder(hubRange, index) }, { borderRight: hubRangeSqRightBorder(hubRange, index) }]"></div>
		</template>
	</template>

	<img class="ghostImg" ref="ghostImgRef" src="" alt="GI Image" oncontextmenu="return false;" />
	<div class="ghostDiv" ref="ghostDivRef" oncontextmenu="return false;"></div>
</template>

<style scoped>
.higlightSquareToClick {
	position: absolute;
	z-index: 100;
	opacity: 0.3;
	fill: yellow;
	cursor: pointer;
	border: 2px solid black;
	/*-webkit-touch-callout: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;*/
}

.hubRangeDiv {
	z-index: 20;
	position: absolute;
	box-sizing: border-box;
}

.borderTop {
	border-top: solid;
}

.borderBottom {
	border-bottom: solid;
}

.borderLeft {
	border-left: solid;
}

.borderRight {
	border-right: solid;
}

.hubRangeSq0 {
	border-color: green;
}

.hubRangeSq1 {
	border-color: orange;
}

.hubRangeSq2 {
	border-color: purple;
}

.hubRangeSq3 {
	border-color: red;
}

.hubRangeSq4 {
	border-color: black;
}

.hubRangeSq5 {
	border-color: black;
}

.hubRangeSq6 {
	border-color: black;
}

.higlightSquareGreen,
.higlightSquareRed {
	animation: glow 0.6s infinite alternate;
}

@keyframes glow {
	to {
		opacity: 0.5;
	}
}

.pipSquaresRed,
.pipSquaresGreen {
	position: absolute;
	z-index: 50;
	border-radius: 100%;
	border: 1px solid black;
}

.crossBackground {
	background: linear-gradient(to top left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 2px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 2px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 2px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 2px), rgba(0, 0, 0, 0) 100%);
}

/* IMPORTANT!!!!! THE PIP SQ BACKGROUND MUST BE BELOW THE CROSS-BKGND CSSS */
.pipSquaresRed {
	background-color: lightgray;
}

.pipSquaresGreen {
	background-color: yellow;
}

.higlightSquareGreen,
.higlightSquareRed {
	position: absolute;
	z-index: 50;
	opacity: 0.1;
}

.higlightSquareGreen {
	fill: lightgreen;
}

.higlightSquareRed {
	fill: red;
}

.ghostImg,
.ghostDiv {
	position: absolute;
	display: none;
	z-index: 50;
}

.ghostImg {
	box-sizing: border-box;
	border: solid black;
}

.ghostDiv {
	border: solid black;
	border-radius: 100%;
}

/* Fade transition for highlight squares */
/* Disable all mouse/touch interactions while fading out */
.fade-sq-leave-active {
	pointer-events: none;
}

/* Duration and timing of the animation */
.fade-sq-enter-active,
.fade-sq-leave-active {
	transition:
		opacity 0.4s ease,
		transform 0.4s ease;
}

/* Starting state for entering / Ending state for leaving */
.fade-sq-enter-from,
.fade-sq-leave-to {
	opacity: 0;
}

/* Absolute position is needed during leave so items don't "jump" */
.fade-sq-leave-active {
	position: absolute;
}
</style>
