<script setup>
/**
 * main app file. Initialise the store here
 *
 *
 */
import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import HistoryTab from "./components/HistoryTab.vue"
import FooterBar from "./components/FooterBar.vue"
import PlayerTable from "./components/PlayerTable.vue"
import HexPileSelectionArea from "./components/HexPileSelectionArea.vue"
import DebugArea from "./components/DebugArea.vue"
import MapArea from "./components/MapArea.vue"
import ActionArea from "./components/ActionArea.vue"
import ResourceArea from "./components/ResourceArea.vue"
import ProductionLine from "./components/ProductionLine.vue"
import ReplayArea from "./components/ReplayArea.vue"

import * as rf from "./js/CNSreference"
import * as funcs from "./js/CNSfuncs"
import * as seed from "./js/CNSseed"
import * as map from "./js/CNSmap"
import * as model from "./js/CNSmodel"
import * as controller from "./js/CNScontroller"
import * as view from "./js/CNSview"
import * as IO from "./js/CNS_IO"
import * as WS from "./js/CNSwebsocket"
import * as replay from "./js/CNSreplay"

import { useModelStore } from "./stores/CNSstore.js"
const store = useModelStore()

import { usePersonalStore } from "./stores/CNSpersonal.js"
const personal = usePersonalStore()

async function initGame() {
	personal.haltPlay = true
	store.deleteVotesData = window.initData.deleteVotesData
	store.statsExcludeVotesData = window.initData.statsExcludeVotesData

	// Set up all Data
	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	store.refSize = window.initData.myZoomLevel
	if (window.initData.myZoomLevel % 2 === 0) {
		store.refSize = window.initData.myZoomLevel * 100
	} else {
		store.topMenuViews.showWholeTable = true
		window.initData.myZoomLevel--
		store.refSize = window.initData.myZoomLevel * 100
	}

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
		//store.refSize = 240
		if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
		if (personal.secondsToNextKickout <= 1200) personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)
		if (window.initData.kickoutRequired > 0) {
			personal.kickoutRequired = window.initData.kickoutRequired
			if (personal.kickoutRequired === 1) {
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
		}

		personal.notes = funcs.htmlUnescape(window.initData.notes)
		if (window.initData.chatNotification) store.topMenuViews.showChat = true
		personal.preferredColour = window.initData.preferredCNScolour
		personal.yourTurnAudioType = window.initData.yourTurnAudioType
		if (window.initData.startingOptions.includes(102)) personal.trainingGame = true

		// Set up and save new game
		if (window.initData.gameData === "") {
			// Set up Starting Options
			if (window.initData.startingOptions.includes(1)) store.useExpansion = true

			if (window.initData.startingOptions.includes(10)) map.createTable(10)
			else if (window.initData.startingOptions.includes(11)) map.createTable(11)
			else if (window.initData.startingOptions.includes(12)) map.createTable(12)

			if (window.initData.startingOptions.includes(20)) map.createJunk(20)
			else if (window.initData.startingOptions.includes(21)) map.createJunk(21)
			else if (window.initData.startingOptions.includes(22)) map.createJunk(22)

			const COLOURS = funcs.shuffle([rf.BLACK, rf.BLUE, rf.RED, rf.YELLOW])

			for (let i = 0; i < window.initData.playerNames.length; i++) {
				store.players.push({
					name: window.initData.playerNames[i],
					displayName: "",
					colour: COLOURS[i],
					storedResources: [], // max 5, on days of the week
					links: [], // 5 wooden rods to place on the map
					score: 0, // aka movie tickets / money
					seenDiscardHexRefs: [], // store the hexes you have discarded and thus KNOW are in the discard pile
				})
			}
			// Now insert display names
			for (let i = 0; i < store.players.length; i++) {
				if (store.players[i].name === "SHADOW" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[0]
				else if (store.players[i].name === "SHADOW_2" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[1]
				else if (store.players[i].name === "SHADOW_3" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[2]
				else store.players[i].displayName = store.players[i].name
			}
			for (let i = 0; i < store.players.length; i++) {
				store.gameflow.turnOrder.push(i)
				store.gameflow.fullTurnOrder.push(i)
			}

			// Create map
			if (store.players.length === 4) {
				store.hexDrawPile = [...rf.INITIAL_DRAW_PILE_4P]
				store.hexes = [...seed.initialGridState4p]
			} else {
				store.hexDrawPile = [...rf.INITIAL_DRAW_PILE_2P3P]
				store.hexes = [...seed.initialGridState2p3p]
			}

			const newShuffle = funcs.shuffleSeeded(store.hexDrawPile)
			store.hexDrawPile = newShuffle.shuffled

			model.addHistory(rf.HIST_NEW_GAME, -1, 0, [newShuffle.seed])
			model.drawHexes(3)
		} // End NEW GAME
	} // end involved player

	// If new, save, otherwise, import data
	if (window.initData.pov == undefined && window.initData.gameData === "") {
		store.topMenuViews.rewindErrorText = "The game has not yet started"
		// Create the <h1> element
		var heading = document.createElement("h1")

		// Set the text content of the <h1> element
		heading.textContent = "The game has not yet started"

		// Get a reference to the body element
		var body = document.body

		// Append the <h1> element to the body
		body.appendChild(heading)
	} else if (window.initData.gameData === "") {
		await IO.saveGame(true)
		personal.haltPlay = true
	} else {
		// FInally, impport data
		funcs.importModel(window.initData.gameData, false)

		personal.votedToDelete = store.deleteVotesData[personal.name]
		personal.votedToExclude = store.statsExcludeVotesData[personal.name]

		if (personal.trainingGame) {
			clearInterval(personal.kickoutCountdownIntervalTimer)
			clearInterval(personal.kickoutFlexiTimerTicker)
		}

		if (window.initData.spoilerFree) {
			// Enter replay mode at step 1
			store.topMenuViews.showReplay = true
			store.replayResetData = funcs.exportModel(true) // FIZ

			// TURM ON
			await replay.generateReplayData(true)
		}
	}

	// Set up the CANNES_TILES
	if (store.players.length === 4) {
		rf.CANNES_HEXES.push(rf.HEX_CANNES_L4P)
		rf.CANNES_HEXES.push(rf.HEX_CANNES_R4P)
	}
	personal.haltPlay = false

	map.calculateCanvasSize()

	controller.startPlayerTurn()

	if (window.initData.pov != undefined) {
		WS.StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	}
} // end initGame

initGame()

/********************************* */

if (personal.name !== "admin" && personal.name !== "BotKickStarter") {
	window.addEventListener("contextmenu", (e) => {
		e.preventDefault()
		e.stopPropagation() // not necessary in my case, could leave in case stopImmediateProp isn't available?
		e.stopImmediatePropagation()
		return false
	})
}

document.addEventListener("keyup", function (event) {
	if (store.topMenuViews.showChat) return
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
		if (store.topMenuViews.showReplay) replay.performStep(-1)
	} else if (event.key == "ArrowRight") {
		// right arrow
		if (store.topMenuViews.showReplay) replay.performStep(1)
	}
})
</script>

<template>
	<TopMenu />
	<div
		id="wholeMiddleArea"
		:class="store.topMenuViews.showReplay ? 'greyBackground' : 'normalBackground'"
		:style="{
			'min-width': (store.players.length === 2 ? '500' : '730') + 'px',
		}">
		<transition name="fadeMainArea">
			<div id="boardContainer" v-if="!store.topMenuViews.performingRewind">
				<div id="middle">
					<TopMenuViews />
					<HistoryTab />

					<ReplayArea v-if="store.topMenuViews.generatingReplay || !store.topMenuViews.replayAtBottom" />
					<template v-if="!store.topMenuViews.generatingReplay">
						<div id="mainAreaLessHistory">
							<div id="playerTablePlusHexPiles">
								<div class="topComponent">
									<PlayerTable />
								</div>
								<div class="topComponent">
									<HexPileSelectionArea />
								</div>
							</div>

							<div v-if="store.topMenuViews.showLoader" id="fLoadingBar">
								<img :src="view.getImage('loading-bar-black')" />
							</div>

							<ActionArea />
							<template v-if="personal.canPlay() || store.topMenuViews.showReplay">
								<ResourceArea v-if="store.gameflow.phase === rf.PHASE_PRODUCTION || store.gameflow.phase === rf.PHASE_NETWORK || store.gameflow.phase === rf.PHASE_STORE_RES" />
								<ProductionLine v-if="store.gameflow.phase === rf.PHASE_PRODUCTION || store.gameflow.phase === rf.PHASE_NETWORK" />
							</template>
							<MapArea />
							<ReplayArea v-if="store.topMenuViews.replayAtBottom" />

							<DebugArea />
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
	min-height: 60px;
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

#fLoadingBar {
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

.mainEntryPlayer0 {
	background-color: #000000;
}

.mainEntryPlayer1 {
	background-color: #3474a9;
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
</style>
