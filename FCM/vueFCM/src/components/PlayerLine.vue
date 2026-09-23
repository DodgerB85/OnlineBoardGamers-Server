<script setup>
/** The player line that goes at the top of the screen, inside the top menu area
 *
 *
 *
 *
 */
import * as view from "../js/FCMview"
//import * as model from '../js/FCMmodel'
import * as controller from "../js/FCMcontroller.js"
import * as plyr from "../js/FCMplayer"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

const playerLineSource = computed(() => store.viewSettings.generatingReplay ? Object.keys(store.players).map(Number) : store.gameflow.fullTurnOrder)

async function clickedPlayerBox(playerIndex) {
	if (store.viewSettings.showingPlayerIndex === playerIndex) store.viewSettings.showingPlayerIndex = -1
	else {
		store.viewSettings.showReserve = false
		store.viewSettings.showingPlayerIndex = playerIndex
	}
}

function showCurrentPlayerGlow(playerIndex) {
	if (!controller.isSimulPhase(store.gameflow.phase) && playerIndex === store.gameflow.turnOrder[0]) return true
	if (controller.isSimulPhase(store.gameflow.phase) && store.gameflow.turnOrder.includes(playerIndex)) return true
	return false
}
</script>

<template>
	<div class="playerLineDiv">
		<div v-for="(playerIndex, index) in playerLineSource" :key="index" class="playerBox" :class="{ currentPlayerGlow: showCurrentPlayerGlow(playerIndex), selectedPlayer: store.viewSettings.showingPlayerIndex === playerIndex }" @click="clickedPlayerBox(playerIndex)">
			<img class="playerRestoSymbol" :src="view.getImage('player_resto_icon_' + personal.getCorrectedColour(store.players[playerIndex].colour))" />
			<br />
			<span class="playerNameSpan" :class="{ currentPlayerNameGlow: playerIndex === store.gameflow.turnOrder[0] }">{{ store.players[playerIndex].displayName }}</span>
			<br />
			${{ store.players[playerIndex].money }}
			<span v-if="plyr.doesPlayerHaveDriveIn(playerIndex)" class="drive">Drive in</span>
		</div>
	</div>
</template>

<style scoped>
.playerLineDiv {
	white-space: nowrap;
	text-align: center;
	font-family: Arial, sans-serif;
}

.currentPlayerGlow {
	border: 2px solid lightgreen !important;
	background-color: #0d972b;
	z-index: 1000 !important;
}

.playerRestoSymbol {
	width: 50px;
	border-radius: 5px;
}

.drive {
	position: absolute;
	width: 100%;
	top: 0;
	left: 0;
	color: #ee2200;
	font-weight: bold;
	pointer-events: none;
}

.playerBox {
	border: 2px solid black !important;
	box-sizing: border-box;
	display: inline-block;
	margin: 0 5px;
	padding-top: 5px;
	padding-bottom: 2px;
	width: 120px;
	min-width: 40px;
	height: 98px;
	line-height: 16px;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-weight: bolder;
	cursor: pointer;
	position: relative;
	overflow: hidden;
	color: white;
}

.playerBox:hover {
	border: 2px solid yellow !important;
	cursor: pointer;
}

.playerNameSpan {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.selectedPlayer {
	outline: 3px solid lightgreen !important;
	background-color: lightblue;
	color: black;
}
</style>
