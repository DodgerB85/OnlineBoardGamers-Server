<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map should be here
 *  Functions to do with manipulating the map should go in XXXmap.js
 *  Functions to do with changing the game state should probably be in XXXmodel.js
 *
 */

//import * as view from "../js/AQYview.js"
import * as map from "../js/AQYmap"
import * as rf from "../js/AQYreference"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()
//import { ref } from 'vue'

function fisheryCenter(side, isFishery) {
	let rotation,
		offsetX,
		offsetY = 0

	let mapResRefSize = 88

	if (isFishery) {
		if (side === 0) {
			// Move up to center
			rotation = -3
			offsetX = (mapResRefSize * 5) / 17
			offsetY = (-mapResRefSize * 5) / 48
		} else if (side === 1) {
			// Move up right
			rotation = -1
			offsetX = (mapResRefSize * 5) / 16
			offsetY = (mapResRefSize * 5) / 32
		} else if (side === 2) {
			// move down right
			rotation = 1
			offsetX = (-mapResRefSize * 5) / 48
			offsetY = (mapResRefSize * 5) / 18
		} else if (side === 3) {
			// Move down to center
			rotation = 3
			offsetX = (-mapResRefSize * 5) / 17
			offsetY = (mapResRefSize * 5) / 48
		} else if (side === 4) {
			// Move down left
			rotation = 5
			offsetX = (-mapResRefSize * 5) / 16
			offsetY = (-mapResRefSize * 5) / 32
		} else if (side === 5) {
			// move up left
			rotation = 7
			offsetX = (mapResRefSize * 5) / 48
			offsetY = -(mapResRefSize * 5) / 18
		}
	}

	if (!isFishery) {
		if (side === 0) {
			// Move up to center
			rotation = -3
			offsetX = 0
			offsetY = 40
		} else if (side === 1) {
			// Move up right
			rotation = -1
			offsetX = -30
			offsetY = 20
		} else if (side === 2) {
			// move down right
			rotation = 1
			offsetX = -30
			offsetY = -20
		} else if (side === 3) {
			// Move down to center
			rotation = 3
			offsetX = 0
			offsetY = -40
		} else if (side === 4) {
			// Move down left
			rotation = 5
			offsetX = 30
			offsetY = -20
		} else if (side === 5) {
			// move up left
			rotation = 7
			offsetX = 30
			offsetY = 20
		}
	}

	return `translate(${(-offsetX).toFixed(0)},${(-offsetY).toFixed(0)}) rotate(${rotation * 30})`
}

function getZoomTerrainType(terrain) {
	if (terrain !== rf.TERR_GRASS) return terrain
	if (!store.permanentSettings.keepForestUnderWoodRes) return rf.TERR_PLAINS
	if (map.shouldShowGrass(map.getHexDataFromID(store.zoomPanelInfo.hexID))) return rf.TERR_PLAINS
	return rf.TERR_FOREST
}

function getResID() {
	if (store.topMenuViews.resourceIconType === 0) return store.zoomPanelInfo.resToShow
	if (store.topMenuViews.resourceIconType === 1) return store.zoomPanelInfo.resToShow + "_border"
}
function getExplorerID() {
	if (store.topMenuViews.resourceIconType === 0) return "explorer"
	if (store.topMenuViews.resourceIconType === 1) return "explorer_border"
}
</script>

<template>
	<div id="zoomPanelDiv">
		<div id="noZoomHexDiv" v-if="store.zoomPanelInfo.hexID === -1">Mouse over or long press a hex to view it in detail</div>
		<svg v-if="store.zoomPanelInfo.hexID >= 0" id="mapSVG" viewBox="-51 -51 102 102">
			<!-- MAP LAYER 0 - THE BIG HEX, ROTATED AS REQUIRED-->
			<!-- IN THE ZOOM PANEL, THIS SHOULD BE JUST THE TERRAIN IMAGE -->
			<!-- Forest replaced by grass should just set the display to grass -->
			<polygon points="50,0 25,-43 -25,-43 -50,0 -25,43 25,43" class="hexPolygon" :fill="`url(#zoomTerr_${getZoomTerrainType(store.zoomPanelInfo.terrainType)})`"></polygon>

			<!-- ADD THE SOLID COLOUR HEX FILL AS PER USER SETTINGS-->
			<polygon :class="store.topMenuViews.showFullColourHex === 1 ? 'halfOpacity' : ''" points="50,0 25,-43 -25,-43 -50,0 -25,43 25,43" class="hexPolygon" :fill="map.getZoomTerrainColor(store.zoomPanelInfo.terrainType)"></polygon>

			<!-- EXPLORER -- this can be here as nothing will ever be on top of it -->
			<rect v-if="store.zoomPanelInfo.showExplorer" x="-30" y="-30" width="60" height="60" :fill="`url(#${getExplorerID()})`" />

			<!-- INN - this can be here as nothing will ever be on top of it -->
			<g v-if="store.zoomPanelInfo.innColourToShow >= 0">
				<polygon points="40,0 20,-34 -20,-34 -40,0 -20,34 20,34" class="hexPolygon" :fill="`url(#c_inn_${store.zoomPanelInfo.innColourToShow})`"></polygon>
			</g>
			<!-- POLLUTION -->
			<g v-if="store.zoomPanelInfo.showPollution">
				<circle r="40" class="pollutionCircle" />
			</g>

			<!-- RESOURCE -->
			<g v-if="store.zoomPanelInfo.resToShow >= 0">
				<rect x="-30" y="-30" width="60" height="60" :fill="`url(#res_${getResID()})`"></rect>
			</g>

			<!-- Fishery -->
			<g v-if="store.zoomPanelInfo.fisherySide >= 0">
				<rect
					fill="url(#c_fishery)"
					:style="{
						width: '100px',
						height: '50px',
					}"
					:transform="fisheryCenter(store.zoomPanelInfo.fisherySide, true)" />
			</g>
			<!-- MAN -->
			<g v-if="store.zoomPanelInfo.manColourToShow >= 0 && store.zoomPanelInfo.fisherySide === -1">
				<rect x="-10" y="-30" width="20" height="20" :fill="`${personal.getCorrectedColourHex(store.zoomPanelInfo.manColourToShow, true)}`" />
			</g>
			<g v-if="store.zoomPanelInfo.manColourToShow >= 0 && store.zoomPanelInfo.fisherySide !== -1">
				<rect x="-10" y="-10" width="20" height="20" :fill="`${personal.getCorrectedColourHex(store.zoomPanelInfo.manColourToShow, true)}`" :transform="fisheryCenter(store.zoomPanelInfo.fisherySide, false)"/>
			</g>

			<!-- MOUNTAIN PIP -->
			<circle v-if="store.zoomPanelInfo.mountainType === rf.MOUNTAIN_STONE || store.zoomPanelInfo.mountainType === rf.MOUNTAIN_GOLD" cx="-18" cy="-32" r="10" :fill="store.zoomPanelInfo.mountainType === rf.MOUNTAIN_GOLD ? 'gold' : 'lightgray'" stroke="black" stroke-width="2" />

			<!--MAP LAYER 3 - ZOC LAYER, draw the ZOC in this layer
                          It needs to be capable of showing glowing hexes, or a solid outline (maybe both?)-->
			<!-- NOT REQUIRED IN ZOOM PANEL -->

			<!--MAP LAYER 4 - HISTORY HIGHLIGHT LAYER, eg click on a history entry, makes the hex / fishery / city etc glow etc-->
			<!-- NOT REQUIRED IN ZOOM PANEL -->

			<!--MAP LAYER 5 - SELECTION LAYER, eg click this hex to build / pollute / explore, etc-->
			<!-- NOT REQUIRED IN ZOOM PANEL -->
		</svg>
	</div>
</template>

<style scoped>
#zoomPanelDiv {
	display: flex;
	border: 2px solid black;
	height: 200px;
	width: 200px;
	margin-left: 20px;
	margin-bottom: 20px;
	align-items: center;
	justify-content: center;
}

#noZoomHexDiv {
	font-size: 25px;
	font-weight: bolder;
	vertical-align: middle;
	padding: 5px;
}

#mapSVG {
	margin: 0 auto;
	/*position: absolute;*/
	width: 100%;
	height: 100%;
}

.cityHexPath {
	stroke: black;
	stroke-width: 5;
}

.hexPolygon {
	pointer-events: visiblePainted;
	/* fill: hsla(60, 12%, 95%, 0);*/
	stroke: black;
	cursor: pointer;
}

.halfOpacity {
	fill-opacity: 0.4;
}

.workerTransparency {
	fill-opacity: 1;
}

.pollutionCircle {
	fill: black;
	stroke: white;
	stroke-width: 0px;
	opacity: 0.5;
}
</style>
