<script setup>
/**
 * main app file. Initialise the store here
 *
 *
 * If the player has no beach, you can skip restructure
 *
 *
 */

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import MapArea from "./components/MapArea.vue"

import DebugArea from "./components/DebugArea.vue"
import FooterBar from "./components/FooterBar.vue"
import HistoryTab from "./components/HistoryTab.vue"
import PlayerDetails from "./components/PlayerDetails.vue"

import ReplayArea from "./components/ReplayArea.vue"

import * as replay from "./js/FCMreplay"

/*
import * as view from './js/FCMview'
import * as IO from './js/FCM_IO'
import * as replay from './js/FCMreplay'
*/
import * as model from "./js/FCMmodel"
import * as rf from "./js/FCMreference"
import * as funcs from "./js/FCMfuncs"

import { useModelStore } from "./stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "./stores/FCMpersonal.js"
import ActionArea from "./components/ActionArea.vue"
const personal = usePersonalStore()

model.initGame()

store.wholeTestResetData = funcs.simpleExportWholeFCMmodel()

/********************************* */

document.addEventListener("keyup", function (event) {
	if (store.viewSettings.showChat) return
	//if (event.altKey && event.which === 82)
	// r = rotate
	if (event.key === "r" || event.key === "R") {
		/*
if (!rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded)) return
// Remove ghosts
let ghostDivs = document.getElementsByClassName('ghostDiv')
let ghostImgs = document.getElementsByClassName('ghostImg')
for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = 'none'
for (let i = 0; i < ghostImgs.length; i++) ghostImgs[i].style.display = 'none'
store.topMenuViews.currentGhostIndex = -1

store.context.itemBeingAddedRotation += 1
if (store.context.itemBeingAddedRotation === 2) store.context.itemBeingAddedRotation = 0
else if (store.context.itemBeingAddedRotation === -1) store.context.itemBeingAddedRotation = 1
store.context.indexesToHighlightClick.splice(0)
if (store.context.action === rf.ACT_BUILD_WATER) store.context.indexesToHighlightClick = map.getSpacesForResource()
else if (store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN) store.context.indexesToHighlightClick = map.getAllowedIndexesToPlacePriCraftsman(store.context.itemBeingAdded, store.context.range, store.context.itemBeingAddedRotation)[0]
else if (store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN) store.context.indexesToHighlightClick = map.getAllowedIndexesToPlaceSecCraftsman(store.context.itemBeingAdded, store.context.range, store.context.itemBeingAddedRotation)[0]
*/
	} else if (event.key == "ArrowLeft") {
		// left arrow
		if (store.viewSettings.showReplay) replay.performStep(-1)
	} else if (event.key == "ArrowRight") {
		// right arrow
		if (store.viewSettings.showReplay) replay.performStep(1)
	}
})
</script>

<template>
	<TopMenu />

	<div
		id="wholeMiddleArea"
		:class="store.viewSettings.showReplay ? 'greyBackground' : 'normalBackground'">
		<transition name="fadeMainArea">
			<div id="boardContainer" v-if="!store.viewSettings.performingRewind">
				<div id="middle222">
					<transition name="slidePlayer">
						<PlayerDetails v-if="store.viewSettings.showingPlayerIndex >= 0" :playerIndexProp="store.viewSettings.showingPlayerIndex" />
					</transition>
					<TopMenuViews />
					<HistoryTab />

					<!-- NORMAL UI -->
					<ReplayArea v-if="store.viewSettings.generatingReplay || !store.viewSettings.replayAtBottom" />
					<template v-if="!store.viewSettings.generatingReplay">
						<div id="mainAreaLessHistory">
							<ActionArea />
							<MapArea />

							<template v-if="rf.DEBUG_USERS.includes(personal.name)">
								<DebugArea />
							</template>
						</div>
						<ReplayArea v-if="store.viewSettings.replayAtBottom" />
					</template>
				</div>
			</div>
		</transition>
	</div>

	<FooterBar />
</template>

<style>
.slidePlayer-enter-active,
.slidePlayer-leave-active {
	transition: all 0.2s ease-in-out;
	height: 1000px;
	overflow: hidden;
}

.slidePlayer-enter-from,
.slidePlayer-leave-to {
	opacity: 0;
	height: 0px;
}

@font-face {
	font-family: "gonzo";
	src: url("/static/FCM/gonzo6.ttf") format("truetype");
	font-weight: normal;
	font-style: normal;
}

body {
	margin: 0px !important;
	background-color: #d4eafd;
	font-family: Arial, sans-serif;
	font-size: 16px;
}

#patternsSVG {
	height: 0px;
	margin: 0px;
	padding: 0px;
	position: absolute;
}

#playerTablePlusHexPiles {
	display: flex;
	flex-wrap: nowrap;
	width: 100%;
}

.topComponent {
	flex: 1 0 50%;
	min-width: fit-content;
	z-index: 1;
	border-bottom: 1px solid black;
}

#boardContainer {
	margin-top: 0px;
	margin-right: auto;
	margin-bottom: 0px;
	align-items: center;
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
    text-align: center;
    min-height: 500px;
    min-width: 1050px;
}

#mainAreaLessHistory {
    min-height: 100px;
    min-width: 1050px;
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

.globalPlayerNameDiv {
	color: white;
	font-weight: bolder;
	padding: 0px;
	display: inline-block;
	margin: 0px;
	border: 1px solid black;
}

.mainEntryPlayer0 {
	background-color: #c597ae;
	color: white;
}

.mainEntryPlayer1 {
	background-color: white;
	color: #be3740;
}

.mainEntryPlayer2 {
	background-color: #86c7ca;
	color: black;
}

.mainEntryPlayer3 {
	background-color: #f89d8a;
	color: black;
}

.mainEntryPlayer4 {
	background-color: #85ae4f;
	color: black;
}

.mainEntryPlayer5 {
	background-color: #a2d8aa;
	color: black;
}

.actionsLineButton {
	margin: 10px;
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
#rewindErrorText {
	/*margin: 0;
    width: 100%;*/
	font-weight: bolder;
	/*text-align: center;*/
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.startingOption {
	/*width: 50px;*/
	height: 50px;
	width: 50px;
	border-radius: 15px;
	margin: 2px;
	vertical-align: middle;
	line-height: 30px;
}

/** UNIVERSAL CSS */
.distance {
	background-color: black;
	color: white;
}

.pricing {
	background-color: #f8a48c;
}

.hiring {
	background-color: #beb6b4;
}

.food {
	background-color: #8fa960;
}

.drink {
	background-color: #a4cf8a;
}

.restaurant {
	background-color: #b8312d;
}

.manager {
	background-color: #241e20;
}

.marketer {
	background-color: #87c2c8;
}

.waitress {
	background-color: #b492c4;
}
.delivery {
	background-color: #e98d2a;
}

.coffee {
	background-color: #a1cfa8;
}


</style>
