<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map go in WEBhex (roughly)
 *  A sort of guide is if you're setting X/Y SVG positions / hex data / vertex data, it's probably in WEBhex
 *  Functions to do with manipulating the map should go in WEBmap (roughly)
 *  WEBmap is a slightly more high level set of functions
 *
 *
 */

import * as rf from "../js/WEBreference"
import * as map from "../js/WEBmap"
import * as view from "../js/WEBview"
import * as controller from "../js/WEBcontroller"
import * as model from "../js/WEBmodel"
import * as cb from "../js/WEBcables"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

//import { usePersonalStore } from "../stores/RNBpersonal.js"
//const personal = usePersonalStore()

import { ref, computed } from "vue"

const ghostPathRef = ref(null)
const ghostPathCableRef = ref(null)
const mouseOverMap = ref(false)

function showErrorPopup(clientX, clientY, htmlMessage) {
	const store = useModelStore()
	store.errorPopupSetter.htmlMessage = htmlMessage

	const popupWidth = 200 // Estimated popup width
	const popupHeight = 80 // Estimated popup height
	let xPos = clientX + 25
	let yPos = clientY - popupHeight / 2
	if (xPos + popupWidth > window.innerWidth) xPos = window.innerWidth - popupWidth
	if (yPos + popupHeight > window.innerHeight) yPos = window.innerHeight - popupHeight
	if (xPos < 0) xPos = 0
	if (yPos < 0) yPos = 0

	store.errorPopupSetter.xPos = xPos
	store.errorPopupSetter.yPos = yPos

	clearTimeout(store.errorPopupSetter.timer)
	store.errorPopupSetter.timer = setTimeout(() => {
		store.errorPopupSetter.showPopup = false
	}, 2000)
	store.errorPopupSetter.showPopup = true
}

const computedTiles = computed(() => {
	let mapTiles = []
	for (const tile of store.mapTiles) {
		let tileCopy = JSON.parse(JSON.stringify(tile))
		tileCopy.x = tileCopy.coord[0] * store.refSize
		tileCopy.y = tileCopy.coord[1] * store.refSize
		tileCopy.rotationText = ""
		if (tileCopy.style === rf.TILE_STYLE_SQUARE) {
			tileCopy.width = 2 * store.refSize
			tileCopy.height = 2 * store.refSize
		}
		if (tileCopy.style === rf.TILE_STYLE_RECT) {
			tileCopy.width = store.refSize
			tileCopy.height = 2 * store.refSize
			if (tileCopy.rotation === 1) tileCopy.rotationText = `rotate(90, ${tileCopy.x + tileCopy.width}, ${tileCopy.y + tileCopy.height / 2})`
		}
		tileCopy.stroke = "black"
		tileCopy.strokeWidth = 1

		mapTiles.push(tileCopy)
	}
	return mapTiles
})

function changeGhost(index) {
	//event.preventDefault()
	if (store.context.action === rf.ACT_PLACE_CABLE) {
		store.context.currentGhostIndex = index
		let Xpos = map.getCoordFromIndex(index)[0] * store.refSize
		let Ypos = map.getCoordFromIndex(index)[1] * store.refSize
		ghostPathCableRef.value.setAttribute("fill", personal.getCorrectedColourHex(controller.currentPlayerObj().colour))
		ghostPathCableRef.value.setAttribute("points", view.getPolygonPointsForCable(store.context.selectedCableRotation, Xpos, Ypos, store.refSize))
		//ghostPathRef.value.style.display = "none"
		ghostPathRef.value = null
		ghostPathCableRef.value.style.display = "block"
		return
	}
	let anchorIndex = map.convertMouseIndexToAnchorIndex(index, store.context.selectedTileIDtoPlaceArr[0], store.context.selectedTileIDtoPlaceArr[1])
	if (anchorIndex === store.context.currentGhostIndex) return
	store.context.currentGhostIndex = anchorIndex
	let Xpos = map.getCoordFromIndex(anchorIndex)[0] * store.refSize
	let Ypos = map.getCoordFromIndex(anchorIndex)[1] * store.refSize

	ghostPathRef.value.setAttribute("fill", view.getTilePatternFromID(store.context.selectedTileIDtoPlaceArr[0]))
	ghostPathRef.value.setAttribute("points", view.getPolygonPointsFromTileID(store.context.selectedTileIDtoPlaceArr[0], store.context.selectedTileIDtoPlaceArr[1], Xpos, Ypos, store.refSize))
	ghostPathRef.value.setAttribute("transform", view.getRotateString(store.context.selectedTileIDtoPlaceArr[0], store.context.selectedTileIDtoPlaceArr[1], Xpos, Ypos, store.refSize))
	//ghostPathCableRef.value.style.display = "none"
	ghostPathCableRef.value = null
	ghostPathRef.value.style.display = "block"
}

function clickedHighlightSquare(event, index) {
	if (store.context.action === rf.ACT_PLACE_CABLE) {
		let cableError = cb.isValidCablePlacement(index, controller.currentPlayerIndex(), store.context.selectedCableRotation === 1)
		if (cableError > 0) {
			let clientX = event.clientX
			let clientY = event.clientY
			let htmlMessage = "Must fit<br/>On Tiles"
			if (cableError === 2) htmlMessage = "Cannot Parrlel<br/>Existing Cables"
			if (cableError === 3) htmlMessage = "Only One Cable<br/>Per Computer"
			if (cableError === 4) htmlMessage = "Must connect<br/>to Server<br/>or Your Cables"
			showErrorPopup(clientX, clientY, htmlMessage)
			return
		}
		model.addCableToMap(controller.currentPlayerIndex(), index, store.context.selectedCableRotation)
		return
	}
	let tileID = store.context.selectedTileIDtoPlaceArr[0]
	let placementError = map.getAnyPlacementError(index, tileID, store.context.selectedTileIDtoPlaceArr[1])
	if (placementError > 0) {
		let clientX = event.clientX
		let clientY = event.clientY
		let htmlMessage = "Overlaps<br/>Existing Tile"
		if (placementError === 2) htmlMessage = "Must connect<br/>to Existing Tile"
		showErrorPopup(clientX, clientY, htmlMessage)
		return
	}

	model.addTileToModel(controller.currentPlayerIndex(), tileID, store.context.selectedTileIDtoPlaceArr[1], index, [-1, -1])

	store.resetContext()
	store.clearAllHighlights()
	store.context.remainingActions = model.getActionsForTileID(tileID)
	store.context.action = rf.ACT_CHOOSE_ACTION
  store.undoPoints.splice(0)
	model.createUndoPoint()
}

function mouseLeavesMap() {
	mouseOverMap.value = false
	ghostPathRef.value = null
	ghostPathCableRef.value = null
}
</script>

<template>
	<div>
		<div
			id="mapDiv"
			:style="{
				width: store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE ? store.gridWidth * store.refSize + 'px' : (store.gridWidth - 4) * store.refSize + 'px',
				height: store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE ? store.gridHeight * store.refSize + 'px' : (store.gridHeight - 4) * store.refSize + 'px',
			}"
			@mouseleave="mouseLeavesMap()">
			<transition name="fadeOut">
				<div class="errorPopup" v-if="store.errorPopupSetter.showPopup" @mouseenter="store.errorPopupSetter.showPopup = false" :style="{ top: store.errorPopupSetter.yPos + 'px', left: store.errorPopupSetter.xPos + 'px' }">
					<span v-html="store.errorPopupSetter.htmlMessage"></span>
				</div>
			</transition>

			<svg id="mapSVG" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" :viewBox="map.getViewBox()">
				<!-- Visible Grid -->
				<g v-for="xCoord in Array.from({ length: store.gridWidth }, (_, index) => index)" :key="xCoord">
					<g v-for="yCoord in Array.from({ length: store.gridHeight }, (_, index) => index)" :key="yCoord">
						<rect :x="xCoord * store.refSize" :y="yCoord * store.refSize" :width="store.refSize" :height="store.refSize" fill="none" stroke="black" stroke-width="1" />
					</g>
				</g>
				<!-- Ghost Tiles -->
				<polygon class="ghostPath" ref="ghostPathRef" fill="" points="" transform="" oncontextmenu="return false;" :style="{ display: store.context.currentGhostIndex === -99 || !mouseOverMap || store.context.action !== rf.ACT_CHOOSE_INTIIAL_TILE ? 'none' : 'block' }" />

				<!-- Tiles - Rects -->
				<polygon v-for="tile in computedTiles" :key="tile.tileID" :x="tile.x" :y="tile.y" :transform="view.getRotateString(tile.tileID, tile.rotation, tile.x, tile.y, store.refSize)" :points="view.getPolygonPointsFromTileID(tile.tileID, tile.rotation, tile.x, tile.y, store.refSize)" :fill="view.getTilePatternFromID(tile.tileID)" stroke="black" stroke-width="1" />
				<!-- Ghost Cables -->
				<polygon class="ghostPath" ref="ghostPathCableRef"
        fill="" points="" transform="" oncontextmenu="return false;"
        :style="{ display: store.context.currentGhostIndex === -99 || !mouseOverMap || store.context.action !== rf.ACT_PLACE_CABLE ? 'none' : 'block' }" />
				<!-- Placed Cables -->
				<g v-for="(cable, idx) in store.cables" :key="idx">
					<polygon
						class="placedCable"
						:fill="personal.getCorrectedColourHex(store.players[cable.playerIndex].colour)"
						:points="view.getPolygonPointsForCable(cable.rotation, map.getCoordFromIndex(cable.indexes[0])[0] * store.refSize, map.getCoordFromIndex(cable.indexes[0])[1] * store.refSize, store.refSize)"
						oncontextmenu="return false;"
						:style="{
							stroke: personal.getCorrectedColour(store.players[cable.playerIndex].colour) === 0 ? 'white' : 'black',
						}" />
				</g>

				<!-- Selectable Squares by Index -->
				<g v-for="(index, idx) in store.context.indexesToHighlight" :key="idx">
					<rect
						class="selectableSquare"
						oncontextmenu="return false;"
						@click="clickedHighlightSquare($event, index)"
						@mouseover="
							() => {
								mouseOverMap = true
								changeGhost(index)
							}
						"
						@touchstart="handleTouchStart($event, cityIndex, index)"
						:x="map.getCoordFromIndex(index)[0] * store.refSize"
						:y="map.getCoordFromIndex(index)[1] * store.refSize"
						:width="store.refSize"
						:height="store.refSize" />
				</g>

				<!-- History Squares -->
				<g v-for="(index, idx) in store.historyHighlights.indexesToHighlight" :key="idx">
					<rect class="historyHighlightSquare" oncontextmenu="return false;" @mouseover="store.historyHighlights.indexesToHighlight.splice(0)" :x="map.getCoordFromIndex(index)[0] * store.refSize" :y="map.getCoordFromIndex(index)[1] * store.refSize" :width="store.refSize" :height="store.refSize" />
				</g>

				<!-- History Cables -->
				<g v-for="(cable, idx) in store.historyHighlights.cablesToHighlgiht" :key="idx">
					<polygon class="historyHighlightCable" :points="view.getPolygonPointsForCable(cable[1], map.getCoordFromIndex(cable[0])[0] * store.refSize, map.getCoordFromIndex(cable[0])[1] * store.refSize, store.refSize)" oncontextmenu="return false;" @mouseover="store.historyHighlights.indexesToHighlight.splice(0)" />
				</g>
			</svg>
		</div>
	</div>
</template>

<style scoped>
#mapDiv {
	position: relative;
	/*float: left;*/
	padding: 0px;
	/*border: 3px solid black;
  border-radius: 25px;*/
	width: fit-content;
	margin: auto;
}

#mapSVG {
	margin: 0 auto;
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
	z-index: 1000;
}

.selectableSquare {
	stroke: none;
	fill: yellow;
	opacity: 0.5;
}

.ghostPath {
	stroke: black;
	stroke-width: 3px;
	display: none;
	/*fill-opacity: 0.3;*/
}

.placedCable {
	stroke-width: 3px;
}

.errorPopup {
	position: fixed;
	background-color: red;
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

.historyHighlightSquare {
	stroke: none;
	fill: yellow;
	opacity: 0.8;
	animation: glow 0.6s infinite alternate;
}

.historyHighlightCable {
	stroke: none;
	fill: yellow;
	opacity: 0.8;
	animation: glow 0.6s infinite alternate;
}

@keyframes glow {
	to {
		opacity: 0.3;
	}
}
</style>
