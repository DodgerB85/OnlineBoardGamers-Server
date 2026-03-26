<script setup>
import * as constants from "../constants"

import { useModelStore } from "../stores/model.js"
const model = useModelStore()
import { usePersonalStore } from "../stores/personal.js"
const personal = usePersonalStore()

import { computed } from "vue"

const forwardChars = ["A", "B", "C", "D", "E", "F"]
const reverseChars = ["F", "E", "D", "C", "B", "A"]

const computedReverseCharsLineExpansion = computed(() => {
	if (model.gameflow.phase !== constants.PHASE_CHOOSE_ACTIONS) return reverseChars
	let chars = []
	for (let i = 0; i < model.actionAreaData[0].length; i++) {
		if (model.players.length === 5) chars.unshift(Math.max(0, model.maxBuses() + 1 - i))
		else chars.unshift(Math.max(0, model.maxBuses() - i))
	}
	return chars
})
const computedReverseChars = computed(() => {
	if (model.gameflow.phase !== constants.PHASE_CHOOSE_ACTIONS) return reverseChars
	let chars = []
	for (let i = 0; i < model.actionAreaData[0].length; i++) {
		if (model.actionAreaData[1][0] !== -1 && model.getPlayerByColour(model.actionAreaData[1][0]).buses + 1 > model.maxBuses()) chars.unshift(Math.max(0, model.getPlayerByColour(model.actionAreaData[1][0]).buses + 1 - i))
		else chars.unshift(Math.max(0, model.maxBuses() - i))
	}
	return chars
})

const computedForwardChars = computed(() => {
	if (model.gameflow.phase !== constants.PHASE_CHOOSE_ACTIONS) return forwardChars
	let chars = []
	for (let i = 0; i < model.actionAreaData[0].length; i++) {
		if (model.actionAreaData[1][0] !== -1 && model.getPlayerByColour(model.actionAreaData[1][0]).buses + 1 > model.maxBuses()) chars.push(Math.max(0, model.getPlayerByColour(model.actionAreaData[1][0]).buses + 1 - i))
		else chars.push(Math.max(0, model.maxBuses() - i))
	}
	return chars
})

function getReminaingBuildingSpots() {
	let buildingsPlaced = 0
	for (let i = 0; i < model.junctions.length; i++) {
		for (let j = 0; j < model.junctions[i].length - 1; j++) {
			if (model.junctions[i][j] > 0) buildingsPlaced++
		}
	}
	return 47 - buildingsPlaced
}

function highlight(e, entering) {
	if (entering) {
		e.target.style.border = "4px solid lightgreen"
		e.target.style["background-color"] = constants.getColourNameFromNumber(personal.getCorrectedColour(model.currentPlayer().colour))
	} else {
		/*e.target.style.border = '4px solid darkgoldenrod'*/
		e.target.style.border = "4px solid yellow"
		e.target.style.outline = "1px solid black"
		e.target.style["background-color"] = ""
	}
}
function clickedActionOption(action, index) {
	model.context.historyObj.push(action, index)
	model.currentPlayer().remainingActions--
	model.actionAreaData[action][index] = model.currentPlayer().colour
	model.context.actionChosen = true
	// Check for useless moves
	let expansionBonus = 0
	if (model.players.length === 5) expansionBonus = 1

	if (action === 0 && index - 5 + model.maxBuses() + expansionBonus <= 0) model.context.turnEndingErrorMessage = "Caution: Max Buses is too low for this action to have any effect"
	else if (action === 2) {
		if (model.actionAreaData[1][0] !== -1 && model.maxBusesWithNewBus() - index <= 0) model.context.turnEndingErrorMessage = "Caution: Max Buses is too low for this action to have any effect"
		else if (model.actionAreaData[1][0] === -1 && model.maxBuses() - index === 0) model.context.turnEndingErrorMessage = "Caution: Unless a player chooses 'New Bus' then Max Buses will be too low for this action to have any effect"
		else if (model.actionAreaData[1][0] === -1 && model.maxBuses() - index < 0) model.context.turnEndingErrorMessage = "Caution: Max Buses is too low for this action to have any effect"
	} else if (action === 3) {
		if (model.actionAreaData[1][0] !== -1 && index - 4 + model.maxBusesWithNewBus() <= 0) model.context.turnEndingErrorMessage = "Caution: Max Buses is too low for this action to have any effect"
		else if (model.actionAreaData[1][0] === -1 && index - 5 + model.maxBuses() === 0) model.context.turnEndingErrorMessage = "Caution: Unless a player chooses 'New Bus' then Max Buses will be too low for this action to have any effect"
		else if (model.actionAreaData[1][0] === -1 && index - 5 + model.maxBuses() < 0) model.context.turnEndingErrorMessage = "Caution: Max Buses is too low for this action to have any effect"
	}
}
</script>

<template>
	<div id="actionArea">
		<table class="actionTable">
			<thead>
				<th colspan="6" :class="{ currentPhaseGlow: model.gameflow.phase === constants.PHASE_LINE_EXPANSION }">Line Expansion</th>
			</thead>
			<tr>
				<template v-for="(marker, index) in model.actionAreaData[0]" v-bind:key="index">
					<!-- Add a marker -->
					<td
						v-if="marker !== -1"
						:class="{
							currentPlayerGlow: model.gameflow.phase === constants.PHASE_LINE_EXPANSION && index === 6 - model.gameflow.turnOrder.length,
						}">
						<div class="actionDisc" :class="'actionDisc' + personal.getCorrectedColour(marker)">{{ computedReverseCharsLineExpansion[index] }}</div>
					</td>

					<!-- Else IF action time, add a circle -->
					<td v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && (index === 5 || model.actionAreaData[0][index + 1] !== -1)">
						<div class="actionDiscOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)" @click="clickedActionOption(0, index)">{{ computedReverseCharsLineExpansion[index] }}</div>
					</td>

					<!-- Else add a letter-->
					<td v-else>{{ computedReverseCharsLineExpansion[index] }}</td>
				</template>
			</tr>
		</table>

		<table class="actionTable">
			<thead>
				<th :class="{ currentPhaseGlow: model.gameflow.phase === constants.PHASE_ADD_BUS }">New Bus</th>
			</thead>
			<tr>
				<template v-for="(marker, index) in model.actionAreaData[1]" v-bind:key="index">
					<!-- Add a marker -->
					<td v-if="marker !== -1">
						<div class="actionDisc" :class="'actionDisc' + personal.getCorrectedColour(marker)"></div>
					</td>

					<!-- Else IF action time, add a circle -->
					<td v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[1][index] === -1">
						<div class="actionDiscOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)" @click="clickedActionOption(1, index)"></div>
					</td>

					<!-- Else add a letter-->
					<td v-else>A</td>
				</template>
			</tr>
		</table>

		<table class="actionTable">
			<thead>
				<th colspan="6" :class="{ currentPhaseGlow: model.gameflow.phase === constants.PHASE_ADD_PAX }">Passengers ({{ model.remainingPassengers }})</th>
			</thead>
			<tr>
				<template v-for="(marker, index) in model.actionAreaData[2]" v-bind:key="index">
					<!-- Add a marker -->
					<td
						v-if="marker !== -1"
						:class="{
							currentPlayerGlow: model.gameflow.phase === constants.PHASE_ADD_PAX && index === model.gameflow.fullActionTurnOrder.length - model.gameflow.turnOrder.length,
						}">
						<div class="actionDisc" :class="'actionDisc' + personal.getCorrectedColour(marker)">{{ computedForwardChars[index] }}</div>
					</td>

					<!-- Else IF action time, add a circle -->
					<td v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && ((index === 0 && model.actionAreaData[2][0] === -1) || (model.actionAreaData[2][index] === -1 && model.actionAreaData[2][index - 1] !== -1))">
						<div class="actionDiscOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)" @click="clickedActionOption(2, index)">{{ computedForwardChars[index] }}</div>
					</td>

					<!-- Else add a letter-->
					<td v-else>{{ computedForwardChars[index] }}</td>
				</template>
			</tr>
		</table>

		<table class="actionTable">
			<thead>
				<th colspan="6" :class="{ currentPhaseGlow: model.gameflow.phase === constants.PHASE_ADD_BLDGS }">New Building ({{ getReminaingBuildingSpots() }})</th>
			</thead>
			<tr>
				<template v-for="(marker, index) in model.actionAreaData[3]" v-bind:key="index">
					<!-- Add a marker -->
					<td
						v-if="marker !== -1"
						:class="{
							currentPlayerGlow: model.gameflow.phase === constants.PHASE_ADD_BLDGS && index === 6 - model.gameflow.turnOrder.length,
						}">
						<div class="actionDisc" :class="'actionDisc' + personal.getCorrectedColour(marker)">{{ computedReverseChars[index] }}</div>
					</td>

					<!-- Else IF action time, add a circle -->
					<td v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && (index === 5 || model.actionAreaData[3][index + 1] !== -1)">
						<div class="actionDiscOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)" @click="clickedActionOption(3, index)">{{ computedReverseChars[index] }}</div>
					</td>

					<!-- Else add a letter-->
					<td v-else>{{ computedReverseChars[index] }}</td>
				</template>
			</tr>
		</table>

		<table class="actionTable">
			<thead>
				<th :class="{ currentPhaseGlow: model.gameflow.phase === constants.PHASE_ALTER_TIME }">Stop Time</th>
			</thead>
			<tr>
				<template v-for="(marker, index) in model.actionAreaData[4]" v-bind:key="index">
					<!-- Add a marker -->
					<td v-if="marker !== -1" :class="{ currentPlayerGlow: model.gameflow.phase === constants.PHASE_ALTER_TIME }">
						<div class="actionDisc" :class="'actionDisc' + personal.getCorrectedColour(marker)"></div>
					</td>

					<!-- Else IF action time, add a circle -->
					<td v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[4][index] === -1">
						<div class="actionDiscOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)" @click="clickedActionOption(4, index)"></div>
					</td>

					<!-- Else add a letter-->
					<td v-else>A</td>
				</template>
			</tr>
		</table>

		<table class="actionTable">
			<thead>
				<th colspan="6" :class="{ currentPhaseGlow: model.gameflow.phase === constants.PHASE_VROM }">Vrrooomm!</th>
			</thead>
			<tr>
				<template v-for="(marker, index) in model.actionAreaData[5]" v-bind:key="index">
					<!-- Add a marker -->
					<td
						v-if="marker !== -1"
						:class="{
							currentPlayerGlow: model.gameflow.phase === constants.PHASE_VROM && index === model.gameflow.fullActionTurnOrder.length - model.gameflow.turnOrder.length,
						}">
						<div class="actionDisc" :class="'actionDisc' + personal.getCorrectedColour(marker)"></div>
					</td>

					<!-- Else IF action time, add a circle -->
					<td v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && ((index === 0 && model.actionAreaData[5][0] === -1) || (model.actionAreaData[5][index] === -1 && model.actionAreaData[5][index - 1] !== -1))">
						<div class="actionDiscOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)" @click="clickedActionOption(5, index)">{{ model.currentPlayer().buses + (model.currentPlayer().colour === model.actionAreaData[1][0] ? 1 : 0) }}</div>
					</td>

					<!-- Else add a letter-->
					<td v-else>{{ forwardChars[index] }}</td>
				</template>
			</tr>
		</table>

		<table class="actionTable" :class="{ currentPhaseGlow: model.gameflow.phase === constants.PHASE_CHANGE_START_PLAYER }">
			<thead>
				<th>Starting Player</th>
			</thead>
			<tr>
				<template v-for="(marker, index) in model.actionAreaData[6]" v-bind:key="index">
					<!-- Add a marker -->
					<td v-if="marker !== -1">
						<div class="actionDisc" :class="'actionDisc' + personal.getCorrectedColour(marker)"></div>
					</td>

					<!-- Else IF action time, add a circle -->
					<td v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[6][index] === -1">
						<div class="actionDiscOption" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)" @click="clickedActionOption(6, index)"></div>
					</td>

					<!-- Else add a letter-->
					<td v-else>A</td>
				</template>
			</tr>
		</table>

		<table class="remainingTable">
			<tr>
				<td>
					Remaining Passengers:
					<span :class="{ noMoreLeft: model.remainingPassengers === 0 }">
						{{ model.remainingPassengers }}
					</span>
					<br />
					Remaining Time Stones:
					<span :class="{ noMoreLeft: model.remainingTimeStones === 0 }">{{ model.remainingTimeStones }}</span>
					<br />
					Max Buses:
					<span>{{ model.maxBuses() }}</span>
				</td>
			</tr>
		</table>

		<table class="remainingTable">
			<tr>
				<td>
					Building Spots:
					<br />
					<br />
					{{ model.getEmptyBuildingSpotsByNumberTotal(1) }} / {{ model.getEmptyBuildingSpotsByNumberTotal(2) }} / {{ model.getEmptyBuildingSpotsByNumberTotal(3) }} /
					{{ model.getEmptyBuildingSpotsByNumberTotal(4) }}
				</td>
			</tr>
		</table>
	</div>
</template>

<style scoped>
.actionDiscOption {
	border: 4px solid black;
	border-radius: 100%;
	width: 15px;
	height: 15px;
	/*border-color: darkgoldenrod;*/
	border-color: yellow;
	outline: 1px solid black;
	margin: auto;
}

.actionDiscOption:hover {
	cursor: pointer;
}

.actionDisc {
	top: 0px;
	left: 0px;
	border: 1px solid black;
	border-radius: 100%;
	width: 15px;
	height: 15px;
	margin: auto;
	padding: 3px;
}

.actionDisc0 {
	/*background-color: blue;*/
	background-color: #3474a9;
}

.actionDisc1 {
	/*background-color: green;*/
	background-color: #456334;
}

.actionDisc2 {
	/*background-color: purple;*/
	background-color: #aa79ae;
}

.actionDisc3 {
	/*background-color: red;*/
	background-color: #a12529;
}

.actionDisc4 {
	/*background-color: yellow;*/
	background-color: #c28727;
}

.noMoreLeft {
	color: red;
}

.currentPhaseGlow {
	box-shadow: 0px 0px 10px 5px lightgreen;
	z-index: 20;
}

.currentPlayerGlow {
	background-color: lightgreen;
}

.buildingAmountImg {
	width: 40px;
	height: 40px;
	margin-right: 0px;
	margin-left: 5px;
	vertical-align: middle;
}

.actionTable {
	display: inline-block;
	border-collapse: collapse;
	margin: 5px;
	text-align: center;
}

.remainingTable {
	display: inline-block;
	border-collapse: collapse;
	/*width: 600px;*/
	margin: 5px;
	text-align: center;
	background-color: white;
	padding: 5px;
	border: 1px solid black;
}

.actionTable td,
.actionTable th {
	border: 1px solid #000;
	padding: 5px;
	min-width: 23px;
}

.actionTable td {
	height: 23px;
}

.actionTable tr {
	cursor: default;
}

.actionTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

.actionTable tr:nth-child(odd) {
	background-color: white;
}

/*.actionTable td:hover {
  background-color: #ddd;
}*/

.actionTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}
</style>
