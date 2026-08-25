<script setup>
/************* &C
 */
/** BIG ASSUMPTIONS
 *  ===============
 *
 * Understand these things. If these things are not ture, the associated code will break!
 *
 * - If a sec bldg has multiple input goods, the only possible goods are RES_BORADS and RES_TRUNKS
 *
 */
/**
 * main app file. Initialise the store here
 *
 * TO DO:

hist 
stack move land combine highlights
all bldgs underscore hist?

sort out plus/excess res
 *
 */
//import * as map from "./js/RNBmap"
import * as model from "./js/RNBmodel"
//import * as controller from "./js/RNBcontroller"
import * as rf from "./js/RNBreference"
import * as view from "./js/RNBview"
//import * as funcs from "./js/RNBfuncs"
import * as highlight from "./js/RNBhighlight"
import * as replay from "./components/History/RNBreplay"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import HistoryTab from "./components/History/HistoryTab.vue"
import FooterBar from "./components/FooterBar.vue"
import DebugArea from "./components/DebugArea.vue"
import MapArea from "./components/MapArea.vue"
import MapOnly from "./components/MapEditor/MapOnly.vue"
import MapEditor from "./components/MapEditor/MapEditor.vue"
import MapZoomPanel from "./components/ZoomPanel/MapZoomPanel.vue"
import MapControlPanel from "./components/MapControlPanel.vue"
import ReplayArea from "./components/History/ReplayArea.vue"

import { useModelStore } from "./stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "./stores/RNBpersonal.js"
import PlayerTable from "./components/PlayerTable.vue"
import BuildingInfo from "./components/Utils/BuildingInfo.vue"
//import { ref } from 'vue';
const personal = usePersonalStore()
personal.mapName = window.initData?.mapName || ""
personal.mapDescription = window.initData?.mapDescription || ""

// import RnB profile options here
if (!window.initData.showMapOnly && !window.initData.mapEditor) model.initGame()
else if (window.initData.mapEditor) {
	personal.mapEditor = true
	personal.name = window.initData.username
} else if (window.initData.showMapOnly) {
	personal.showMapOnly = true
	personal.gameID = window.initData.gameID

	personal.playerCount = window.initData.playerCount
	personal.showPlayerCountWarning = window.initData.showPlayerCountWarning
	if (personal.gameID > 0 && window.initData.startingMap) {
		store.mapData.externalMapData = window.initData.startingMap
	}
}


if (window.initData.mapEditor || window.initData.showMapOnly) {
	// Scaffolf a dummy player
	store.players.push({
		name: "Example User",
		displayName: "Example User",
		colour: rf.RED,
		RnD: [0, 0, 0, 0, 0, 0, 0, 0],
	})
}

/********************************* */
if (!window.initData.showMapOnly && !window.initData.mapEditor) {
	if (personal.mapName === "") personal.mapName =  "[No map found]"
	if (!personal.showMapOnly && !rf.SUPER_USERS.includes(personal.name) && !rf.DEBUG_USERS.includes(personal.name) && personal.name !== "DodgerB") {
		window.addEventListener("contextmenu", (e) => {
			e.preventDefault()
			e.stopPropagation() // not necessary in my case, could leave in case stopImmediateProp isn't available?
			e.stopImmediatePropagation()
			return false
		})
	}

	document.addEventListener("keyup", function (event) {
		if (store.viewSettings.showChat) return
		else if (event.key.toLowerCase() === "d") {
			highlight.deselectTransporter()
		} else if (event.key == "ArrowLeft") {
			// left arrow
			if (store.viewSettings.showReplay) replay.performStep(-1)
		} else if (event.key == "ArrowRight") {
			// right arrow
			if (store.viewSettings.showReplay) replay.performStep(1)
		}
	})
}
</script>

<template>
	<svg id="patternsSVG">
		<!-- Get patterns for all the hex images -->
		<defs>
			<pattern v-for="(hexData, idx) in rf.ALL_HEX_DATA" :key="idx" :id="'pattern' + hexData.hexGfx" width="100%" height="100%" patternContentUnits="objectBoundingBox" :patternTransform="store.hexStyle === rf.FLAT ? '' : ''">
				<image :xlink:href="view.getImage(hexData.hexGfx)" preserveAspectRatio="none" x="0" y="0" width="1" height="1" />
			</pattern>
			<!-- IRRIGATED DESERTS -->
			<pattern v-for="(hexGfx, idx) in ['hex_00_irrigated', 'hex_01_irrigated', 'hex_50_irrigated', 'hex_51_irrigated', 'hex_52_irrigated', 'hex_53_irrigated', 'hex_54_irrigated']" :key="idx" :id="'pattern' + hexGfx" width="100%" height="100%" patternContentUnits="objectBoundingBox" :patternTransform="store.hexStyle === rf.FLAT ? '' : ''">
				<image :xlink:href="view.getImage(hexGfx)" :preserveAspectRatio="store.hexStyle === rf.POINTY ? 'none' : 'none'" :x="store.hexStyle === rf.POINTY ? 0 : 0" :y="store.hexStyle === rf.POINTY ? 0 : 0" :width="store.hexStyle === rf.POINTY ? 1 : 1" :height="store.hexStyle === rf.POINTY ? 1 : 1" />
			</pattern>
			<!-- RESOURCES -->
			<pattern v-for="(res, idx) in rf.ALL_RES.concat(rf.RES_PSEUDO_MINE)" :key="idx" :id="'pattern_res_' + res" width="100%" height="100%" patternContentUnits="objectBoundingBox">
				<image :xlink:href="view.getImage('res_' + res)" preserveAspectRatio="none" x="0" y="0" width="1" height="1" />
			</pattern>
			<!-- BUILDINGS -->
			<pattern v-for="(bldg, idx) in rf.ALL_BUILDINGS.filter((bldg) => bldg !== rf.BLDG_MINE)" :key="idx" :id="'pattern_bldg_' + bldg" width="100%" height="100%" patternContentUnits="objectBoundingBox">
				<image :xlink:href="view.getImage('bldg_' + bldg)" preserveAspectRatio="none" x="0" y="0" width="1" height="1" />
			</pattern>
			<!-- HOME MARKERS -->
			<pattern v-for="(homeMarker, idx) in [0, 1, 2, 3, 4, 5]" :key="idx" :id="'pattern_home_' + homeMarker" width="100%" height="100%" patternContentUnits="objectBoundingBox">
				<image :xlink:href="view.getImage('home_' + homeMarker)" preserveAspectRatio="none" x="0" y="0" width="1" height="1" />
			</pattern>
			<!-- WONDER BRICKS -->
			<pattern v-for="(playerIdx, idx) in [0, 1, 2, 3, 4, 5, 8, 9]" :key="idx" :id="'pattern_wonder_brick_' + playerIdx" width="100%" height="100%" patternContentUnits="objectBoundingBox">
				<image :xlink:href="view.getImage('wonder_brick_' + playerIdx)" preserveAspectRatio="none" x="0" y="0" width="1" height="1" />
			</pattern>
			<!-- ROTATION ARROWS -->
			<pattern id="pattern_rot_anticlockwise" width="100%" height="100%" patternContentUnits="objectBoundingBox">
				<image :xlink:href="view.getImage('rot_anticlockwise')" preserveAspectRatio="none" x="0" y="0" width="1" height="1" />
			</pattern>
			<pattern id="pattern_rot_clockwise" width="100%" height="100%" patternContentUnits="objectBoundingBox">
				<image :xlink:href="view.getImage('rot_clockwise')" preserveAspectRatio="none" x="0" y="0" width="1" height="1" />
			</pattern>
		</defs>
	</svg>
	<template v-if="personal.showMapOnly">
		<MapOnly />
	</template>
	<template v-else-if="personal.mapEditor">
		<!-- Map editor content would go here -->
		<MapEditor />
	</template>
	<template v-else>
		<TopMenu />
		<div
			id="wholeMiddleArea"
			:class="store.viewSettings.showReplay ? 'greyBackground' : 'normalBackground'"
			:style="{
				'min-width': (store.players.length === 2 ? '500' : '730') + 'px',
			}">
			<transition name="fadeMainArea">
				<div id="boardContainer" v-if="!store.viewSettings.performingRewind">
					<div id="middle">
						<TopMenuViews />
						<HistoryTab />

						<ReplayArea v-if="store.viewSettings.generatingReplay || !store.viewSettings.replayAtBottom" />
						<template v-if="!store.viewSettings.generatingReplay">
							<div id="mainAreaLessHistory">
								<PlayerTable v-if="!store.viewSettings.showReplay" :minimiseInfoForMainScreen="true" />

								<div class="mapAndControlPanelContainer">
									<MapZoomPanel />
									<MapArea />
									<MapControlPanel />
								</div>

								<DebugArea v-if="rf.DEBUG_USERS.includes(personal.name)" />

								<div class="playerAidDiv">
									<img class="playerAidImg" :src="view.getImage(`playerAid_${personal.preferredPlayerAid}`)" />
								</div>
								<div class="bldgPlayerAidContainer">
									<template v-for="bldgNum in rf.BUILDING_OPTION_DISPLAY_ORDER" :key="bldgNum">
										<div class="bldgPlayerAid" v-if="store.internalStartingOptions.concat([-1]).includes(rf.BUILDING_STATS.find((b) => b.building === bldgNum)?.startingOptionRequired)">
											<BuildingInfo :bldgNum="bldgNum" :showCost="true" />
										</div>
									</template>
								</div>
							</div>
						</template>
					</div>
				</div>
			</transition>
		</div>

		<FooterBar />
	</template>
</template>

<style>
body {
	margin: 0px !important;
	background-color: #d4eafd;
	font-family: Arial, sans-serif;
	font-size: 16px;
	width: fit-content;
	min-width: 100%;
	overflow-anchor: none; /* may not need this */
}
/*
html {
	overflow-anchor: none;
}
*/
#playerTablePlusHexPiles {
	display: flex;
	flex-wrap: nowrap;
	width: 100%;
}

.topComponent {
	flex: 1 0 50%;
	min-width: fit-content;
	margin: auto;
}

#boardContainer {
	margin-top: 0px;
	margin-right: auto;
	margin-bottom: 0px;
	align-items: flex-start;
	align-self: flex-start;
	overflow-anchor: none; /* may not need this */
	-webkit-transition: all 0.2s ease-in-out;
	-moz-transition: all 0.2s ease-in-out;
	-ms-transition: all 0.2s ease-in-out;
	-o-transition: all 0.2s ease-in-out;
	transition: all 0.2s ease-in-out;
}

.slideRight {
	margin: 0px auto 0px 460px !important;
	-webkit-transition: all 0.2s ease-in-out;
	-moz-transition: all 0.2s ease-in-out;
	-ms-transition: all 0.2s ease-in-out;
	-o-transition: all 0.2s ease-in-out;
	transition: all 0.2s ease-in-out;
}

#wholeMiddleArea {
	width: 100%;
	min-width: 1310px;
	text-align: center;
	min-height: 500px;
	overflow-anchor: none; /* may not need this */
}

#mainAreaLessHistory {
	min-height: 60px;
	min-width: 620px;
	overflow-anchor: none;
}

.greyBackground {
	background-color: lightgray;
	transition: background-color 1s ease-in-out;
}

.normalBackground {
	background-color: #d4eafd;
	transition: background-color 1s ease-in-out;
}

.fadeMainArea-enter-active,
.fadeMainArea-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeMainArea-enter-from,
.fadeMainArea-leave-to {
	opacity: 0;
}

#fLoadingBar {
	width: 100%;
	text-align: center;
	font-size: 40px;
	font-weight: bolder;
}

/** UNSCOPED CSS */
.mainEntryPlayer {
	color: white;
	font-weight: bolder;
	padding: 2px;
	border: 1px solid black;
	margin-right: 3px;
	display: inline-block;
	margin-top: 1px;
}
.mainEntryPlayerNewTurn {
	color: white;
	font-weight: bolder;
	padding: 2px;
	display: inline-block;
	margin: 0px;
}

.mainEntryPlayer0 {
	background-color: #000000;
}

.mainEntryPlayer1 {
	background-color: #334ccc;
}

.mainEntryPlayer2 {
	/*background-color: #51365F;*/
	background-color: #4c9726;
	/*color: black;*/
}

.mainEntryPlayer3 {
	background-color: #7f7f7f;
}

.mainEntryPlayer4 {
	background-color: #cc3333;
}

.mainEntryPlayer5 {
	background-color: #ccbf33;
	color: black;
}

.warningSpan {
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.actionsLineButton {
	margin: 10px;
	/*width: 100px;*/
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px;
}

.actionsLineButton:hover {
	background-color: lightgrey;
}

.actionsLineButton:active {
	background-color: darkgrey;
}
#patternsSVG {
	height: 0px;
	margin: 0px;
	padding: 0px;
	position: absolute;
}

.mapAndControlPanelContainer {
	/*display: flex;
	justify-content: center; /* Center horizontally */
	/*align-items: flex-start; /* Align items to the top (adjust as needed) */
	/*gap: 20px; /* Space between components */
	/* min-height: 100vh;*/ /* Full viewport height for vertical centering if desired */
	display: flex;
	align-items: flex-start;
	flex-wrap: nowrap;
	width: fit-content;
	margin-top: 2px;
	gap: 5px;
	justify-content: flex-start; /* Align PlayerTable to the left */
	margin: auto;
	overflow-anchor: none; /* Try setting this on the container */
}

.playerAidDiv {
	margin: auto;
	width: 1200px;
	height: auto;
	border: 5px solid white;
	box-sizing: border-box;
}

.playerAidImg {
	width: 100%;
	display: block;
}

.bldgPlayerAidContainer {
	display: flex;
	flex-wrap: wrap; /* Allows items to move to a new line if they exceed 1200px */
	width: 1200px; /* Matches your image width */
	align-items: stretch; /* This is the magic: it makes all items the same height */
	margin: auto;
}

.bldgPlayerAid {
	width: fit-content;
	/* Remove display: inline-block; flex handles this now */
	box-sizing: border-box;
	display: flex; /* Ensures the internal BuildingInfo also fills the height */
	margin: 5px;
}

/* Ensure the component inside also expands */
.bldgPlayerAid > * {
	flex: 1;
}
</style>
