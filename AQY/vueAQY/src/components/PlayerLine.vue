<script setup>
/** The player line that goes at the top of the screen, inside the top menu area
 *
 *
 *
 *
 */
import * as view from "../js/AQYview"
import * as rf from "../js/AQYreference"
import * as country from "../js/AQYcountry"
import * as city from "../js/AQYcity"
//import * as model from '../js/AQYmodel'
import * as controller from "../js/AQYcontroller.js"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js"
//import { nextTick } from 'vue';
const personal = usePersonalStore()

async function clickedPlayerBox(playerIndex) {
	store.newlyExplorerResource = rf.RES_NONE

	if (store.topMenuViews.showingPlayerIndex === playerIndex) {
		store.topMenuViews.showingPlayerIndex = -1
		// If first city, make sure highlights are shown
		//store.clearVars()
		if (personal.canPlay() && store.gameflow.phase === rf.PHASE_FIRST_CITY && store.context.action !== rf.ACT_CONFIRM_END_TURN) country.getFirstCityPlacementZone()
		//else if (store.gameflow.phase === rf.PHASE_HARVEST)	country.getResourcesHexesForHarvest(controller.currentPlayerIndex())
	} else {
		//store.topMenuViews.showingPlayerIndex = -1
		//await nextTick()
		store.topMenuViews.showingPlayerIndex = playerIndex
		if (!personal.canPlayInCity(playerIndex)) store.context.cityIndexesToHighlightClick.splice(0)
		if (store.gameflow.phase === rf.PHASE_FAMINE && personal.canPlayInCity(playerIndex) && store.context.gravesLeftToPlace > 0) city.startGravePlacement(playerIndex)
	}
}

function showCurrentPlayerGlow(playerIndex) {
	if (!controller.isSimulPhase(store.gameflow.phase) && playerIndex === store.gameflow.turnOrder[0]) return true
	if (controller.isSimulPhase(store.gameflow.phase) && store.gameflow.turnOrder.includes(playerIndex)) return true
	return false
}
</script>

<template>
	<div class="playerLineDiv" v-if="!store.topMenuViews.generatingReplay">
		<div
			v-for="(playerIndex, index) in store.gameflow.fullTurnOrder"
			:key="index"
			class="playerBox"
			:class="{ currentPlayerGlow: showCurrentPlayerGlow(playerIndex), selectedPlayer: store.topMenuViews.showingPlayerIndex === playerIndex }"
			:style="{
				'background-color': personal.getCorrectedColourHex(store.players[playerIndex].colour),
				color: personal.getCorrectedColour(store.players[playerIndex].colour) === rf.YELLOW ? 'black' : 'white',
			}"
			@click="clickedPlayerBox(playerIndex)">
			<img class="playerInnImg" :src="view.getImage('c_inn_PNG_' + personal.getCorrectedColour(store.players[playerIndex].colour))" />
			<br />
			<span class="playerNameSpan" :class="{ currentPlayerNameGlow: playerIndex === store.gameflow.turnOrder[0] }">{{ store.players[playerIndex].displayName }}</span>
			<br />
			<span v-if="store.players[playerIndex].saint !== rf.SAINT_NONE">
				{{ rf.SAINT_INFO[store.players[playerIndex].saint].name }}
			</span>
			<span v-else>No Saint</span>
		</div>
	</div>

	<!-- GENERATING REPLY ONLY -->
	<div class="playerLineDiv" v-else>
		<div
			v-for="(playerIndex, index) in store.gameflow.fullTurnOrder"
			:key="index"
			class="playerBox"
			:style="{
				'background-color': personal.getCorrectedColourHex(store.players[playerIndex].colour),
				color: personal.getCorrectedColour(store.players[playerIndex].colour) === rf.YELLOW ? 'black' : 'white',
			}">
			<img class="playerInnImg" :src="view.getImage('c_inn_PNG_' + personal.getCorrectedColour(store.players[playerIndex].colour))" />
			<br />
			<span class="playerNameSpan">{{ store.players[playerIndex].displayName }}</span>
			<br />
			No Saint
		</div>
	</div>
</template>

<style scoped>
.playerLineDiv {
	white-space: nowrap;
	text-align: center;
}

.currentPlayerGlow {
	border: 2px solid lightgreen !important;
	box-shadow: 0px 0px 20px 10px lightgreen;
	background-color: rgba(144, 238, 144, 0.5);
	/*box-sizing: border-box;*/
	/*  outline: 4px solid lightgreen;*/
	z-index: 1000 !important;
}

/*.currentPlayerNameGlow {
  box-shadow: 0px 0px 20px 10px lightgreen;
  background-color: rgba(144, 238, 144, 0.5);
  /*box-sizing: border-box;*/
/*  outline: 4px solid lightgreen;*/
/*}*/

.playerBox {
	border: 2px solid black;
	display: inline-block;
	margin-left: 5px;
	padding-bottom: 5px;
	width: 150px;
	height: 91px;

	white-space: nowrap;
	/*overflow: hidden;*/
	text-overflow: ellipsis;
	font-weight: bolder;
}

.playerBox:hover {
	border: 2px solid yellow !important;
	cursor: pointer;
}

.playerInnImg {
	width: 45px;
	height: 45px;
}

.playerNameSpan {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.playerCow {
	vertical-align: middle;
	width: 29px;
	height: 25px;
}
.selectedPlayer {
	outline: 3px solid lightgreen !important;
}
</style>
