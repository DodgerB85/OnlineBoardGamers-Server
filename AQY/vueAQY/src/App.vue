<script setup>
/**
 * main app file. Initialise the store here
 *
 *
 */

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import MapArea from "./components/MapArea.vue"
import CityArea from "./components/CityArea.vue"
import TradeSummary from "./components/TradeSummary.vue"

import DebugArea from "./components/DebugArea.vue"
import FooterBar from "./components/FooterBar.vue"
import HistoryTab from "./components/HistoryTab.vue"

import ReplayArea from "./components/ReplayArea.vue"

import * as view from "./js/AQYview"
//import * as country from "./js/AQYcountry"
import * as WS from "./backend/AQYwebsocket"
import * as IO from "./backend/AQY_IO"
import * as replay from "./js/AQYreplay"

/*

import * as view from './js/AQYview'
import * as IO from './js/AQY_IO'
import * as replay from './js/AQYreplay'
*/
import * as model from "./js/AQYmodel"
import * as city from "./js/AQYcity"
import * as Bot from "./js/AQYbot"

//import hexLib from "./js/hexlib.js"
import * as rf from "./js/AQYreference"
import * as funcs from "./js/AQYfuncs"
import * as controller from "./js/AQYcontroller"
import * as map from "./js/AQYmap"

import { useModelStore } from "./stores/AQYstore.js"
const store = useModelStore()

import { usePersonalStore } from "./stores/AQYpersonal.js"
const personal = usePersonalStore()

import { useI18n } from "vue-i18n"
const { t } = useI18n()

import { ref, watch } from "vue"

const turnBanner = ref("")
let turnBannerTimer

async function initGame() {
	personal.haltPlay = true

	// Set up all Data
	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000

	// UNCOMMENT LATER
	//store.refSize = window.initData.myZoomLevel

	store.refSize = window.initData.myZoomLevel * 10

	// Safety check: ensure refSize is never 0 or NaN
	if (store.refSize === 0 || isNaN(store.refSize)) {
		store.refSize = 160
	}

	store.deleteVotesData = window.initData.deleteVotesData
	store.statsExcludeVotesData = window.initData.statsExcludeVotesData
	store.kickoutVotesData = window.initData.kickoutVotesData || {}
	store.kickoutVoteThreshold = window.initData.kickoutVoteThreshold || 1

	personal.liveWS = false

	// Set up logged in player
	if (window.initData.name != undefined) {
		personal.name = window.initData.name
		store.chatData = funcs.decompressChatData(window.initData.chatData)
		personal.latestUpdate = window.initData.latestUpdate
	}
	personal.pov = -1
	// Set up Involved Player data
	if (window.initData.pov != undefined) {
		personal.liveWS = true
		personal.pov = window.initData.pov

		personal.secondsToNextKickout = window.initData.secondsToNextKickout
		personal.myStatsExcludeConsent = window.initData.myStatsExcludeConsent
		personal.statsExcludedGame = window.initData.statsExcludedGame

		if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
		if (personal.secondsToNextKickout <= 1200 && !personal.trainingGame) personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)

		// KICKOUT REQUIRED
		if (window.initData.kickoutRequired > 0) {
			personal.kickoutRequired = window.initData.kickoutRequired
			if (personal.kickoutRequired === 1) {
				// DATA IS IMPORTED LATER - THIS CRASHES THE GAME
				model.initiateGameVars()
				funcs.importModel(window.initData.gameData, false)
				let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
				let secondsIn24Hours = 24 * 60 * 60
				let playerSeconds = 0

				// Iterate over the KickoutFlexiDataArray to find the player's entry
				for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
					let entry = KickoutFlexiDataArray[i]

					// Check if the entry is a length-2 array and the first element matches the playerName
					if (Array.isArray(entry) && entry.length === 2 && entry[0] === controller.currentPlayerObj().name) {
						playerSeconds = entry[1]
						break
					}
				}
				let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
				personal.flexiSecondsToNextKickout = remainingFlexSecondsBeforeThisMove + personal.secondsToNextKickout

				personal.kickoutFlexiCountdownIntervalTimer = setInterval(view.kickoutFlexiTimerTicker, 1000)
			}
		} // END KICKOUT REQUIRED
		personal.notes = funcs.htmlUnescape(window.initData.notes)
	} // end involved player
	if (window.initData.chatNotification) {
		store.topMenuViews.showChat = true
		setTimeout(function () {
			var el = document.getElementById("wholeChat")
			if (!el) return
			var cs = getComputedStyle(el)
			var b = document.getElementById("footer").getBoundingClientRect().top
			var a = el.getBoundingClientRect().top + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
			el.style["max-height"] = String(parseInt(b - a)) + "px"
		}, 500)
	}

	// Set AQY options
	let options = window.initData.preferredAQYoptions
	// [colour, mapHybrid, resourceIconType, pullResToMan, keepForestUnderWoodRes, showPollutionUnderRes]
	personal.preferredColour = options[0]
	store.topMenuViews.showFullColourHex = options[1]
	store.topMenuViews.resourceIconType = options[2]
	store.permanentSettings.pullResToMan = options[3] === 1 ? true : false
	store.permanentSettings.keepForestUnderWoodRes = options[4] === 1 ? true : false
	store.permanentSettings.showPollutionUnderRes = options[5] === 1 ? true : false
	store.permanentSettings.housesInNumberOrder = options[6]

	personal.yourTurnAudioType = window.initData.yourTurnAudioType
	if (window.initData.startingOptions.includes(102)) personal.trainingGame = true
	personal.prefersReducedMotion = options[7] === 1
	document.body.classList.toggle("reduced-motion", personal.prefersReducedMotion)

	// Always iuit game vars
	model.initiateGameVars()

	// If new, save, otherwise, import data
	if (window.initData.pov == undefined && window.initData.gameData === "") {
		store.topMenuViews.rewindErrorText = t("app.gameNotStarted")
		// Create the <h1> element
		var heading = document.createElement("h1")

		// Set the text content of the <h1> element
		heading.textContent = t("app.gameNotStarted")

		// Get a reference to the body element
		var body = document.body

		// Append the <h1> element to the body
		body.appendChild(heading)
	} else if (window.initData.gameData === "") {
		await IO.saveGame(true, false, true)
		personal.haltPlay = true
	} else {
		// FInally, impport data
		await funcs.importModel(window.initData.gameData)

		personal.votedToDelete = store.deleteVotesData[personal.name]
		personal.votedToExclude = store.statsExcludeVotesData[personal.name]

		// And import pre-moves
		if (window.initData.preMove !== "" && personal.pov >= 0) store.players[personal.pov].preMoves = funcs.decompressData(window.initData.preMove)

		store.currentLayout = JSON.parse(JSON.stringify(rf.MAP_LAYOUTS.find((l) => l.players === store.players.length)))

		// If you have a move, import that too for the visuals
		if (window.initData.move !== "" && personal.pov >= 0) {
			if (store.gameflow.phase === rf.PHASE_CITY_BUILDING) funcs.simpleImportPlayerCityTurnData(personal.pov, window.initData.move)
		}
		if (window.initData.trade && personal.pov >= 0) {
			// If loading a game from the server, include trade updates
			funcs.decompressTradeData(window.initData.trade, true)
		}
		// get current players
		if (controller.isSimulPhase(store.gameflow.phase)) {
			// rebuild the turnOrder from the names
			let currentNames = window.initData.currentPlayers
			store.gameflow.turnOrder.splice(0)
			for (let i = 0; i < currentNames.length; i++) {
				for (let j = 0; j < store.players.length; j++) {
					if (currentNames[i] === store.players[j].name) store.gameflow.turnOrder.push(j)
				}
			}
			// A kicked player can be left flagged current in old games, so their bot
			// seat reaches here; drop bots so an empty turnOrder triggers kickstart below
			Bot.removeBotPlayers()
		}

		if (window.initData.spoilerFree) {
			// Enter replay mode at step 1
			store.topMenuViews.showReplay = true
			store.replayResetData = funcs.simpleExportWholeModel()

			// TURM ON
			await replay.generateReplayData(true)
		}
	}

	personal.haltPlay = false

	map.calculateCanvasSize()

	map.setNeighbours()

	controller.startPlayerTurn()

	// Finally, check for stalled game
	// Check for no current player here
	if (store.gameflow.turnOrder.length === 0 && store.gameflow.phase === rf.PHASE_CITY_BUILDING) {
		// If it is factory build phase, with no one to move, it means the last player disconnected
		// So run the code in IO again here. This should save it and move the game on
		await IO.kickstartGame()
	} else if (store.gameflow.turnOrder.length === 0) {
		IO.sendDiscordWebhook(`AQY GameID ${personal.gameID} - No current player detected: ${store.gameflow.turnOrder}`)
		rf.doAdminAlrt("ERROR: No current player\nContact admin on Discord or Email")
	}

	if (window.initData.pov != undefined) {
		WS.StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	}
} // end initGame

initGame()

store.wholeTestResetData = funcs.simpleExportWholeModel()

/********************************* */

function isTypingTarget(event) {
	const el = event.target
	if (!el) return false
	if (el.isContentEditable) return true
	return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
}

function hotkeyPlayerIndex() {
	const showing = store.topMenuViews.showingPlayerIndex
	if (showing >= 0) return showing
	return personal.actingPlayerIndex()
}

function retrySave() {
	const retry = store.topMenuViews.retrySave
	if (retry) retry()
}

watch(
	() => store.history.length,
	() => {
		const last = store.history[store.history.length - 1]
		if (!last || last[0] !== rf.HIST_NEW_TURN || store.topMenuViews.showReplay || store.topMenuViews.generatingReplay || personal.prefersReducedMotion || personal.haltPlay) return
		turnBanner.value = t("historyEntry.startOfTurn", { turn: store.gameflow.turn })
		clearTimeout(turnBannerTimer)
		turnBannerTimer = setTimeout(() => {
			turnBanner.value = ""
		}, 1200)
	}
)

document.addEventListener("keyup", function (event) {
	if (store.topMenuViews.showChat || store.topMenuViews.showBug || store.topMenuViews.showNotes) return
	if (isTypingTarget(event)) return

	if (event.key === "r" || event.key === "R") {
		city.rotateCurrentBuilding(event.shiftKey ? -1 : 1, hotkeyPlayerIndex())
	} else if (event.key === "Escape") {
		store.clearVars()
		store.clearHistoryHelpers()
		if (store.gameflow.phase === rf.PHASE_CITY_BUILDING && [rf.SUB_PHASE_MOVE_BUILDINGS, rf.SUB_PHASE_SAINT_HOUSE, rf.SUB_PHASE_READD_GRAVE].includes(store.gameflow.subPhase)) {
			store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
		}
	} else if (event.key === "Enter") {
		if (document.activeElement?.tagName === "BUTTON") return
		document.getElementById("endTurnButton")?.click()
	} else if ((event.ctrlKey || event.metaKey) && (event.key === "z" || event.key === "Z")) {
		if (store.topMenuViews.showReplay || store.undoPoints.length === 0) return
		event.preventDefault()
		model.undoLastAction()
	} else if (event.key === "?") {
		window.open("/AQY/help/", "_blank")
	} else if (event.key == "ArrowLeft") {
		if (store.topMenuViews.showReplay) replay.performStep(-1)
	} else if (event.key == "ArrowRight") {
		if (store.topMenuViews.showReplay) replay.performStep(1)
	}
})
</script>

<template>
	<svg id="patternsSVG">
		<!-- MAP TILES -->
		<pattern :id="`tile-${index}`" height="100%" v-for="(entry, index) in store.mapData.seed" :key="index" width="100%" patternContentUnits="objectBoundingBox">
			<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(view.getTileImgNameFromSeed(entry[0]))" />
		</pattern>
		<!-- BUILDINGS -->
		<pattern v-for="(bldgData, idx) in rf.BLDG_DATA" :key="idx" :id="bldgData.imgName" height="100%" width="100%" patternContentUnits="objectBoundingBox">
			<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('bldg' + bldgData.id)" />
		</pattern>
		<!-- HOUSES -->
		<g v-for="index in 20" :key="index">
			<pattern :id="'h_' + index" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('h_' + index)" />
			</pattern>
		</g>
		<g v-for="index in 3" :key="index">
			<pattern :id="'h_city_' + index" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('h_city_' + index)" />
			</pattern>
		</g>
		<!-- STORAGE PATTERNS -->
		<g v-for="width in 7" :key="width">
			<g v-for="height in 7" :key="height">
				<g v-if="(width * height) % 2 === 0">
					<pattern :id="`b_storage_${width}${height}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
						<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('bldg_storage_' + String(width) + String(height))" />
					</pattern>
				</g>
			</g>
		</g>

		<!-- COUNTRYSIDE BUILDINGS -->
		<pattern v-for="index in [0, 1, 2, 3]" :key="index" :id="`c_inn_${index}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
			<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('c_inn_' + index)" />
		</pattern>

		<pattern id="c_fishery" height="100%" width="100%" patternContentUnits="objectBoundingBox">
			<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('c_fishery')" />
		</pattern>

		<pattern id="explorer" height="100%" width="100%" patternContentUnits="objectBoundingBox">
			<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('explorer')" />
		</pattern>
		<pattern id="explorer_border" height="100%" width="100%" patternContentUnits="objectBoundingBox">
			<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('explorer_border')" />
		</pattern>

		<!-- City Tiles -->
		<pattern v-for="index in [0, 1, 2, 3]" :key="index" :id="`city_${index}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
			<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('city_' + index)" />
		</pattern>

		<!-- POLLUTION -->
		<!--<pattern id="pollution" height="100%" width="100%" patternContentUnits="objectBoundingBox">
			<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('pollution')" />
		</pattern>-->

		<!-- RESOURCES -->
		<g v-for="(resData, idx) in rf.RES_DATA" :key="idx">
			<pattern :id="resData.imgName" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('res_' + resData.id)" />
			</pattern>
			<pattern :id="resData.imgName + '_border'" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('res_border_' + resData.id)" />
			</pattern>
		</g>

		<!-- GRASS -->
		<g v-for="index in [0, 1]" :key="index">
			<pattern :id="'hex_grass_' + index" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('hex_grass_' + index)" />
			</pattern>
		</g>
		<!-- ZOOM TERRAIN -->
		<g v-for="index in [0, 1, 2, 3]" :key="index">
			<pattern :id="'zoomTerr_' + index" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage('zoomTerr_' + index)" />
			</pattern>
		</g>

		<!-- FILTERS FOR CITY SCREEN -->
		<filter id="green-highlight-filter">
			<feColorMatrix type="matrix" values="0.1 0 0 0 0 0 0.8 0 0 0 0 0 0 0 0 0 0 0 1 0" />
		</filter>
		<filter id="green-overlay-filter">
			<feFlood flood-color="lightgreen" flood-opacity="0.15" result="overlayColor" />
			<feComposite in="overlayColor" in2="SourceGraphic" operator="atop" />
		</filter>
		<filter id="red-overlay-filter">
			<feFlood flood-color="red" flood-opacity="0.1" result="overlayColor" />
			<feComposite in="overlayColor" in2="SourceGraphic" operator="atop" />
		</filter>
		<filter id="red-unaffordable-filter">
			<feFlood flood-color="red" flood-opacity="0.25" result="overlayColor" />
			<feComposite in="overlayColor" in2="SourceGraphic" operator="atop" />
		</filter>
		<filter id="grayscale-filter">
			<feColorMatrix
				type="matrix"
				values="0.6 0.6 0.6 0 0
                                        0.6 0.6 0.6 0 0
                                        0.6 0.6 0.6 0 0
                                        0   0   0   1 0" />
		</filter>
	</svg>

	<TopMenu />

	<transition name="turnBanner">
		<div v-if="turnBanner" class="turn-banner">{{ turnBanner }}</div>
	</transition>

	<div
		id="wholeMiddleArea"
		:class="store.topMenuViews.showReplay ? 'greyBackground' : 'normalBackground'"
		:style="{
			'min-width': (store.players.length === 2 ? '500' : '730') + 'px',
		}">
		<transition name="fadeMainArea">
			<div id="boardContainer" v-if="!store.topMenuViews.performingRewind">
				<template v-if="store.topMenuViews.rewindErrorText !== ''">
					<h1 id="rewindErrorText">{{ store.topMenuViews.rewindErrorText }}</h1>
					<button v-if="store.topMenuViews.retrySave" class="actionsLineButton" @click="retrySave">{{ $t("aqyUi.save.redoSave") }}</button>
				</template>
				<template v-if="store.topMenuViews.tradeSuccessText !== ''">
					<h1 id="tradeSuccessText" v-html="store.topMenuViews.tradeSuccessText"></h1>
					<TradeSummary v-if="store.topMenuViews.WStradeToDisplay.length > 0" />
				</template>
				<template v-if="store.topMenuViews.tradeErrorText !== ''">
					<h1 id="tradeErrorText" v-html="store.topMenuViews.tradeErrorText"></h1>
					<TradeSummary v-if="store.topMenuViews.WStradeToDisplay.length > 0" />
				</template>
				<div id="middle">
					<TopMenuViews />
					<HistoryTab />

					<ReplayArea v-if="store.topMenuViews.generatingReplay || !store.topMenuViews.replayAtBottom" />
					<template v-if="!store.topMenuViews.generatingReplay">
						<div id="mainAreaLessHistory">
							<template v-if="store.topMenuViews.showingPlayerIndex === -1">
								<MapArea />
							</template>
							<template v-else>
								<CityArea :playerIndexProp="store.topMenuViews.showingPlayerIndex" />
							</template>

							<ReplayArea v-if="store.topMenuViews.replayAtBottom" />

							<DebugArea v-if="IO.DEBUG_USERS.includes(personal.name)" />
						</div>
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
	background-color: #3474a9;
}

.mainEntryPlayer1 {
	background-color: rgb(79, 23, 88);
}

.mainEntryPlayer2 {
	background-color: #a12529;
}

.mainEntryPlayer3 {
	background-color: #c28727;
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

#tradeSuccessText,
#tradeErrorText {
	font-size: 20px;
	margin: 10px;
	padding: 10px;
	font-weight: bold;
}

#tradeSuccessText {
	color: darkgreen;
	background-color: lightblue;
}

#tradeErrorText {
	color: darkred;
	background-color: lightblue;
}

.turn-banner {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 5000;
	background: rgba(0, 0, 0, 0.8);
	color: white;
	padding: 10px 20px;
	border-radius: 6px;
	font-size: 22px;
	font-weight: bold;
	pointer-events: none;
}

.turnBanner-enter-active,
.turnBanner-leave-active {
	transition: opacity 0.35s ease-in-out;
}

.turnBanner-enter-from,
.turnBanner-leave-to {
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}

body.reduced-motion *,
body.reduced-motion *::before,
body.reduced-motion *::after {
	animation-duration: 0.01ms !important;
	animation-iteration-count: 1 !important;
	transition-duration: 0.01ms !important;
	scroll-behavior: auto !important;
}
</style>
