<script setup>
/*******
 * 
 * 
 Rewinding into village phase / pre village, i think with a player with nothing to add can lead to hang
 CONFIRM AGAINST INCOMING NEXT PLAYERS

 with jeweler change default gold assignment
 after submit final score, refresh page, get blank template
 kicked player came back when choosing winter tiles. had to be rekicked

//// Game stuff
purple meeple game end scoring - history entry
rewind hidden info
check the skill tiles into contract action

limit resources /  workers / skill tiles; handle cases when none left

KepleyQuin
Ghost ship

// AFTER SERVER BAGS
route scoring - add buttons as you go to stop route / cancel route // yellow/green route for sea bastion
history clicks highlight


=======
[ tileIDs, season tiles, winter tiles, boat1A meeples, boat fill, new contracts]

The rewind happened after seeing hidden information revealed by using:
===========
*/

/**
 * main app file. Initialise the store here
 *
 *
 */
import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
//import ReplayArea from "./components/ReplayArea.vue"
import TileInfoPopup from "./components/TileInfoPopup.vue"
import MeeplePopup from "./components/MeeplePopup.vue"

import FooterBar from "./components/FooterBar.vue"
import HistoryTab from "./components/HistoryTab.vue"
import MainArea from "./components/MainArea.vue"

import * as replay from "./js/KFWreplay"
import * as IO from "./backend/KFW_IO"
import * as model from "./js/KFWmodel"
import * as rf from "./js/KFWreference"

import { watchEffect } from "vue"

import { useModelStore } from "./stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "./stores/KFWpersonal.js"
const personal = usePersonalStore()

watchEffect(() => {
	let backgroundColour = "floralwhite"
	if (store.viewSettings.showReplay) backgroundColour = "lightgrey"
	else if (store.gameflow.phase === rf.PHASE_GAME_OVER) backgroundColour = "#d4eafd"
	else if (personal.canPlay()) backgroundColour = "#d4eafd"
	else if (!personal.canPlay() && personal.pov >=0) backgroundColour = "floralwhite"
	// If it's mid game but you're not involved, should still be blue
	else backgroundColour = "#d4eafd"

	// Update the body background color directly
	document.body.style.backgroundColor = backgroundColour
})

// Set KFW options
let options = window.initData.preferredKFWoptions
// [colour, ]
personal.preferredColour = options[0]
if (window.initData.startingOptions.includes(1)) store.useMerchantsExpansion = true
if (window.initData.startingOptions.includes(2)) store.promoTileIDsToInclude = [...rf.ALL_PROMO_TILE_SIDE_A_SEASON_IDs]
// 5 is low amounts of info
// NB THIS IS CONVERTED TO PURE 9-5 NUMBERS
if (window.initData.startingOptions.includes(7)) store.hiddenInformationKnowledge = 5
if (window.initData.startingOptions.includes(8)) store.hiddenInformationKnowledge = 6
if (window.initData.startingOptions.includes(5)) store.hiddenInformationKnowledge = 7
if (window.initData.startingOptions.includes(6)) store.hiddenInformationKnowledge = 8
if (window.initData.startingOptions.includes(9)) store.hiddenInformationKnowledge = 9
model.initGame()


/*
let data = 
"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"

funcs.simpleImportWholeKFWmodel(data, true)
*/

/********************************* */

if (!IO.SUPER_USERS.includes(personal.name) && !IO.DEBUG_USERS.includes(personal.name)) {
	window.addEventListener("contextmenu", (e) => {
		e.preventDefault()
		e.stopPropagation() // not necessary in my case, could leave in case stopImmediateProp isn't available?
		e.stopImmediatePropagation()
		return false
	})
}

document.addEventListener("keyup", function (event) {
	if (store.viewSettings.showChat) return
	else if (event.key == "ArrowLeft") {
		// left arrow
		if (store.viewSettings.showReplay) replay.performStep(-1)
	} else if (event.key == "ArrowRight") {
		// right arrow
		if (store.viewSettings.showReplay) replay.performStep(1)
	}
})

function removeTileInfoPopup() {
  let popup = document.getElementsByClassName("infoPopup")[0];

  if (!popup) {
    return; // Exit the function if no element with class "infoPopup" is found
  }

  popup.style.display = "none";
  store.popupSetter.showPopup = false;
}
</script>

<template>
	<svg id="patternsSVG">
		<defs>
			<!-- HEX TILES -->
			<!--
			<pattern v-for="(filename, index) in getAllTileGfx()" :key="index" :id="filename" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(filename)" />
			</pattern>
		-->
			<!-- Meeples -->
			<!--
			<pattern v-for="(meeple, index) in [0, 1, 2, 3, 4]" :key="index" :id="'meeple_' + meeple" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('meeple_' + meeple)" />
			</pattern>-->
			<!-- Skill Tiles-->
			<!--<pattern v-for="(skillTile, index) in [0, 1, 2]" :key="index" :id="'skillTile_' + skillTile" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('skillTile_' + skillTile)" />
			</pattern>-->
			<!-- Resources -->
			<!--<pattern v-for="(res, index) in [0, 1, 2, 3]" :key="index" :id="'res_' + String(res)" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('res_' + res)" />
			</pattern>-->
			<!-- Clip Path -->
			<clipPath id="conttractClipPath">
				<path :d="rf.CONTRACT_PATH_D" />
			</clipPath>
			<!-- Filters -->
			<!--<filter id="f_yellow" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="yellow" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>

			<filter id="f_lightGreen" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="lightgreen" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>-->
		</defs>
	</svg>
	<TopMenu />
	<div
		id="wholeMiddleArea"
		:class="store.viewSettings.showReplay ? 'greyBackground222' : 'normalBackground222'"
		:style="{
			'min-width': (store.players.length === 2 ? '500' : '730') + 'px',
		}">
		<transition name="fadeMainArea">
			<div id="boardContainer" v-if="!store.viewSettings.performingRewind">
				<Transition name="fadePopup">
					<TileInfoPopup v-if="store.popupSetter.showPopup" @mouseover="removeTileInfoPopup" />
				</Transition>
				<Transition name="fadePopup">
					<MeeplePopup v-if="store.meeplePopupSetter.showPopup" @mouseover="removeTileInfoPopup" />
				</Transition>
				<div id="middle">
					<TopMenuViews />
					<HistoryTab />

					<!--<ReplayArea v-if="store.viewSettings.generatingReplay || !store.viewSettings.replayAtBottom" />-->
					<template v-if="!store.viewSettings.generatingReplay">
						<MainArea />
					</template>
				</div>
			</div>
		</transition>
	</div>

	<FooterBar />
</template>

<style>
body {
	margin: 0px !important;
	background-color: #d4eafd;
	font-family: Arial, sans-serif;
	font-size: 16px;
    transition: background-color 1s ease-in-out;
}

#patternsSVG {
	height: 0px;
	margin: 0px;
	padding: 0px;
	position: absolute;
	top: 10px;
	left: 0px;
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
	min-width: 1310px;
	text-align: center;
	min-height: 500px;
}

#mainAreaLessHistory {
	min-height: 100px;
	min-width: 620px;
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

.fLoadingBar {
	width: 100%;
	text-align: center;
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

/* REMOVED to allow for dynamic colours
.mainEntryPlayer0 {
	background-color: #84c3e2; 
	color: black !important;
}

*/

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

.actionsLineSelect {
	margin: 10px;
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px;
}

.actionsLineSelect:hover {
	background-color: lightgrey;
}

.actionsLineSelect > option {
	background-color: white;
}

.fadePopup-enter-active,
.fadePopup-leave-active {
	transition: opacity 0.3s ease-in-out;
}

.fadePopup-enter-from,
.fadePopup-leave-to {
	opacity: 0;
}


</style>
