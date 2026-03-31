<script setup>
import * as view from "../js/TGZview"
import * as rf from "../js/TGZreference"
import * as model from "../js/TGZmodel"
import * as controller from "../js/TGZcontroller"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

async function clickedPlayerBox(playerIndex) {
	if (store.topMenuViews.showingPlayerIndex === playerIndex) store.topMenuViews.showingPlayerIndex = -1
	else {
		store.topMenuViews.showingPlayerIndex = playerIndex
	}
}

function getCowNumber(playerIndex) {
	if (playerIndex === controller.currentPlayerIndex() && store.gameflow.phase === rf.PHASE_BID && store.context.action === rf.ACT_BID) {
		if (model.eleguaAvailable()) return store.players[playerIndex].cows - Math.max(store.context.selectedBid - 3, 0)
		return store.players[playerIndex].cows - store.context.selectedBid
	}
	return store.players[playerIndex].cows
}

function getBidIncomeCows(playerIndex) {
	let cowsOnPlaques = model.getCowsOnPlaque(-1, store.context.selectedBid)
	let idx = 0
	let cowsTotal = 0

	// Add Shad
	if (model.anyoneHasSHADIPINYI(false)) {
		if (playerIndex === model.anyoneHasSHADIPINYI(true)) cowsTotal += cowsOnPlaques[idx]
		idx++
	}

	// Now get the bid income
	for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
		if (store.gameflow.fullTurnOrder[i] === playerIndex) return (cowsTotal += cowsOnPlaques[idx])
		idx++
	}
	return cowsTotal
}
</script>

<template>
	<div class="playerLineDiv" v-if="!store.topMenuViews.generatingReplay">
		<div
			v-for="(playerIndex, index) in store.gameflow.fullTurnOrder"
			:key="index"
			class="playerBox"
			:class="{ currentPlayerGlow: playerIndex === store.gameflow.turnOrder[0] }"
			:style="{
				'background-color': personal.getCorrectedColourHex(store.players[playerIndex].colour),
				color: personal.getCorrectedColour(store.players[playerIndex].colour) === rf.WHITE || personal.getCorrectedColour(store.players[playerIndex].colour) === rf.YELLOW ? 'black' : 'white',
			}"
			@click="clickedPlayerBox(playerIndex)">
			<img class="playerTribeImg" :src="view.getPlayerTribeImage(personal.getCorrectedColour(store.players[playerIndex].colour))" alt="NR" />
			<br />
			<span class="playerNameSpan" :class="{ currentPlayerNameGlow: playerIndex === store.gameflow.turnOrder[0] }">{{ store.players[playerIndex].displayName }}</span>
			<br />
			{{ getCowNumber(playerIndex) }}
			<template v-if="store.gameflow.phase === rf.PHASE_BUILD">(+{{ model.getTurnEndCows(playerIndex, 9) }})</template>
			<template v-else-if="store.gameflow.phase === rf.PHASE_BID">(+{{ getBidIncomeCows(playerIndex) }})</template>
			<img :src="view.getImage('cows1' + personal.getCorrectedColour(store.players[playerIndex].colour))" class="playerCow" alt="Cows: " />
			<span :class="{ VRmet: model.getScore(playerIndex) >= model.getVR(store.players[playerIndex]) }">VR: {{ model.getScore(playerIndex) }} / {{ model.getVR(store.players[playerIndex]) }}</span>
		</div>
	</div>
	<div class="playerLineDiv" v-else>
		<div
			v-for="(player, index) in store.players"
			:key="index"
			class="playerBox"
			:style="{
				'background-color': personal.getCorrectedColourHex(player.colour),
				color: personal.getCorrectedColour(player.colour) === rf.WHITE || personal.getCorrectedColour(player.colour) === rf.YELLOW ? 'black' : 'white',
			}"
			@click="clickedPlayerBox(playerIndex)">
			<img class="playerTribeImg" :src="view.getPlayerTribeImage(personal.getCorrectedColour(player.colour))" alt="NR" />
			<br />
			<span class="playerNameSpan" :class="{ currentPlayerNameGlow: playerIndex === store.gameflow.turnOrder[0] }">{{ player.displayName }}</span>
			<br />
			3
			<img :src="view.getImage('cows1' + personal.getCorrectedColour(player.colour))" class="playerCow" alt="Cows: " />
			<span>VR: 0 / 20</span>
		</div>
	</div>
</template>

<style scoped>
.VRmet {
	background-color: lightgreen;
	color: black;
	padding: 5px;
}

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
	width: 170px;
	height: 93px;

	white-space: nowrap;
	/*overflow: hidden;*/
	text-overflow: ellipsis;
	font-weight: bolder;
}

.playerBox:hover {
	border: 2px solid yellow !important;
	cursor: pointer;
}

.playerTribeImg {
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
</style>
