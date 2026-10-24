<script setup>
/** The player line that goes at the top of the screen, inside the top menu area
 *
 *
 *
 *
 */
import * as view from "../js/FCMview"
import * as controller from "../js/FCMcontroller.js"
import * as plyr from "../js/FCMplayer"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { computed, ref, watch } from "vue"

const playerLineSource = computed(() => store.viewSettings.generatingReplay ? Object.keys(store.players).map(Number) : store.gameflow.fullTurnOrder)

const moneyDeltas = ref({})
const previousMoney = {}
const deltaTimers = {}

for (let i = 0; i < store.players.length; i++) previousMoney[i] = store.players[i].money

function checkMoneyChanges() {
	if (store.viewSettings.showReplay || store.viewSettings.generatingReplay) return
	for (let i = 0; i < store.players.length; i++) {
		const money = store.players[i].money
		if (previousMoney[i] !== undefined && money !== previousMoney[i] && !personal.prefersReducedMotion) {
			moneyDeltas.value = { ...moneyDeltas.value, [i]: (moneyDeltas.value[i] || 0) + (money - previousMoney[i]) }
			clearTimeout(deltaTimers[i])
			deltaTimers[i] = setTimeout(() => {
				const next = { ...moneyDeltas.value }
				delete next[i]
				moneyDeltas.value = next
			}, 1200)
		}
		previousMoney[i] = money
	}
}

watch(() => [store.history.length, store.gameflow.turn, store.gameflow.phase], checkMoneyChanges)

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
	<TransitionGroup name="playerOrder" tag="div" class="playerLineDiv">
		<div v-for="playerIndex in playerLineSource" :key="playerIndex" class="playerBox" :class="{ currentPlayerGlow: showCurrentPlayerGlow(playerIndex), selectedPlayer: store.viewSettings.showingPlayerIndex === playerIndex }" role="button" tabindex="0" :aria-pressed="store.viewSettings.showingPlayerIndex === playerIndex" @click="clickedPlayerBox(playerIndex)" @keydown.enter.prevent="clickedPlayerBox(playerIndex)" @keydown.space.prevent="clickedPlayerBox(playerIndex)">
			<img class="playerRestoSymbol" :src="view.getImage('player_resto_icon_' + personal.getCorrectedColour(store.players[playerIndex].colour))" />
			<br />
			<span class="playerNameSpan" :class="{ currentPlayerNameGlow: playerIndex === store.gameflow.turnOrder[0] }">{{ store.players[playerIndex].displayName }}</span>
			<br />
			${{ store.players[playerIndex].money }}
			<span v-if="moneyDeltas[playerIndex]" class="moneyDelta" :class="{ moneyLoss: moneyDeltas[playerIndex] < 0 }">{{ moneyDeltas[playerIndex] > 0 ? "+" : "-" }}${{ Math.abs(moneyDeltas[playerIndex]) }}</span>
			<span v-if="plyr.doesPlayerHaveDriveIn(playerIndex)" class="drive">{{ $t("playerLine.driveIn") }}</span>
		</div>
	</TransitionGroup>
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

.playerBox:focus-visible {
	outline: 3px solid lightblue;
	outline-offset: -3px;
}

.playerOrder-move {
	transition: transform 0.35s ease;
}

.moneyDelta {
	position: absolute;
	right: 4px;
	top: 4px;
	z-index: 3;
	background: darkgreen;
	color: white;
	font-size: 13px;
	padding: 1px 4px;
	border-radius: 4px;
	animation: moneyFloat 1.2s ease-out forwards;
}

.moneyDelta.moneyLoss {
	background: darkred;
}

@keyframes moneyFloat {
	0% {
		opacity: 0;
		transform: translateY(4px);
	}
	20% {
		opacity: 1;
		transform: translateY(0);
	}
	100% {
		opacity: 0;
		transform: translateY(-14px);
	}
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
