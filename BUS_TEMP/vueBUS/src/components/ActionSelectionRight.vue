<script setup>
import * as constants from "../constants"

import * as view from "../js/BUSview.js"

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

function highlight(e, entering) {
	if (entering) {
		e.target.style["border-color"] = "lightgreen"
		e.target.style["background-color"] = constants.getColourNameFromNumber(personal.getCorrectedColour(model.currentPlayer().colour))
	} else {
		/*e.target.style['border-color'] = 'darkgoldenrod'*/
		e.target.style["border-color"] = "yellow"
		e.target.style["background-color"] = ""
	}
}
function clickedActionOption(action, index) {
	model.context.historyObj.push(action, index)
	model.currentPlayer().remainingActions--
	model.actionAreaData[action][index] = model.currentPlayer().colour
	model.context.actionChosen = true
}

function getActionSelectionWidth() {
	if (personal.selectedBoard === 0) return 279
	if (personal.selectedBoard === 1) return 279
	if (personal.selectedBoard === 2) return 0
}

function getPointerRotation() {
	if (model.desiredBuilding === 1) return [1886, 264, -120]
	if (model.desiredBuilding === 2) return [1880, 260, 0]
	if (model.desiredBuilding === 3) return [1888, 265, 120]
}
</script>

<template>
	<div
		v-if="model.topMenuViews.displayRightActionSelection"
		id="actionSelectionRight"
		:style="{
			width: (model.refSize * getActionSelectionWidth()) / 100 + 'px',
			height: (model.refSize * 732) / 100 + 'px',
			left: (model.refSize * -8) / 100 + 'px',
		}">
		<img id="actionSelectionRightImg" :src="personal.selectedBoard === 1 ? view.getImage('rightActions_orig') : view.getImage('rightActions')" alt="Actions" />

		<!-- ADD LINES -->
		<template v-for="(marker, index) in model.actionAreaData[0]" v-bind:key="index">
			<!-- Add a marker -->
			<div
				v-if="marker !== -1"
				class="actionDisc"
				:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: model.gameflow.phase === constants.PHASE_LINE_EXPANSION && index === 6 - model.gameflow.turnOrder.length }]"
				:style="{
					width: (model.refSize * 120) / 400 + 'px',
					height: (model.refSize * 110) / 400 + 'px',
					top: (model.refSize * 300) / 400 + 'px',
					left: (model.refSize * (5 + index * 141)) / 400 + 'px',
					border: (model.refSize * 20) / 400 + 'px solid black',
				}"></div>
			<!-- Else IF action time, add a circle -->
			<div
				v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && (index === 5 || model.actionAreaData[0][index + 1] !== -1)"
				class="actionDiscOption"
				:style="{
					width: (model.refSize * 120) / 400 + 'px',
					height: (model.refSize * 110) / 400 + 'px',
          'font-size': (model.refSize * 110) / 500 + 'px',
					top: (model.refSize * 300) / 400 + 'px',
					left: (model.refSize * (5 + index * 141)) / 400 + 'px',
					border: (model.refSize * 20) / 400 + 'px solid yellow',
				}"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="clickedActionOption(0, index)">{{ computedReverseCharsLineExpansion[index] }}</div>
		</template>

		<!-- NEW BUS -->
		<!-- Add a marker -->
		<div
			v-if="model.actionAreaData[1][0] !== -1"
			class="actionDisc"
			:class="['actionDisc' + personal.getCorrectedColour(model.actionAreaData[1][0]), { currentPlayerGlow: model.gameflow.phase === constants.PHASE_ADD_BUS }]"
			:style="{
				width: (model.refSize * 120) / 400 + 'px',
				height: (model.refSize * 110) / 400 + 'px',
				top: (model.refSize * 500) / 400 + 'px',
				left: (model.refSize * 859) / 400 + 'px',
				border: (model.refSize * 20) / 400 + 'px solid black',
			}"></div>
		<!-- Else IF action time, add a circle -->
		<div
			v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[1][0] === -1"
			class="actionDiscOption"
			:style="{
				width: (model.refSize * 120) / 400 + 'px',
				height: (model.refSize * 110) / 400 + 'px',
        'font-size': (model.refSize * 110) / 500 + 'px',
				top: (model.refSize * 500) / 400 + 'px',
				left: (model.refSize * 859) / 400 + 'px',
				border: (model.refSize * 20) / 400 + 'px solid yellow',
			}"
			@mouseover="highlight($event, true)"
			@mouseleave="highlight($event, false)"
			@click="clickedActionOption(1, 0)"></div>

		<!-- ADD PAX -->
		<template v-for="(marker, index) in model.actionAreaData[2]" v-bind:key="index">
			<!-- Add a marker -->
			<div
				v-if="marker !== -1"
				class="actionDisc"
				:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: model.gameflow.phase === constants.PHASE_ADD_PAX && index === model.gameflow.fullActionTurnOrder.length - model.gameflow.turnOrder.length }]"
				:style="{
					width: (model.refSize * 120) / 400 + 'px',
					height: (model.refSize * 110) / 400 + 'px',
					top: (model.refSize * 1226) / 400 + 'px',
					left: (model.refSize * (5 + index * 141)) / 400 + 'px',
					border: (model.refSize * 20) / 400 + 'px solid black',
				}"></div>
			<!-- Else IF action time, add a circle -->
			<div
				v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && ((index === 0 && model.actionAreaData[2][0] === -1) || (model.actionAreaData[2][index] === -1 && model.actionAreaData[2][index - 1] !== -1))"
				class="actionDiscOption"
				:style="{
					width: (model.refSize * 120) / 400 + 'px',
					height: (model.refSize * 110) / 400 + 'px',
          'font-size': (model.refSize * 110) / 500 + 'px',
					top: (model.refSize * 1226) / 400 + 'px',
					left: (model.refSize * (5 + index * 141)) / 400 + 'px',
					border: (model.refSize * 20) / 400 + 'px solid yellow',
				}"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="clickedActionOption(2, index)">{{ computedForwardChars[index] }}</div>
		</template>

		<!-- ADD BUILDING -->
		<template v-for="(marker, index) in model.actionAreaData[3]" v-bind:key="index">
			<!-- Add a marker -->
			<div
				v-if="marker !== -1"
				class="actionDisc"
				:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: model.gameflow.phase === constants.PHASE_ADD_BLDGS && index === 6 - model.gameflow.turnOrder.length }]"
				:style="{
					width: (model.refSize * 120) / 400 + 'px',
					height: (model.refSize * 110) / 400 + 'px',
          'font-size': (model.refSize * 110) / 500 + 'px',
					top: (model.refSize * 1566) / 400 + 'px',
					left: (model.refSize * (5 + index * 141.4)) / 400 + 'px',
					border: (model.refSize * 20) / 400 + 'px solid black',
				}"></div>
			<!-- Else IF action time, add a circle -->
			<div
				v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && (index === 5 || model.actionAreaData[3][index + 1] !== -1)"
				class="actionDiscOption"
				:style="{
					width: (model.refSize * 120) / 400 + 'px',
					height: (model.refSize * 110) / 400 + 'px',
          'font-size': (model.refSize * 110) / 500 + 'px',
					top: (model.refSize * 1566) / 400 + 'px',
					left: (model.refSize * (5 + index * 141)) / 400 + 'px',
					border: (model.refSize * 20) / 400 + 'px solid yellow',
				}"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="clickedActionOption(3, index)">{{ computedReverseChars[index] }}</div>
		</template>

		<!-- ALTER TIME -->
		<!-- Add a marker -->
		<div
			v-if="model.actionAreaData[4][0] !== -1"
			class="actionDisc"
			:class="['actionDisc' + personal.getCorrectedColour(model.actionAreaData[4][0]), { currentPlayerGlow: model.gameflow.phase === constants.PHASE_ADD_BUS }]"
			:style="{
				width: (model.refSize * 120) / 400 + 'px',
				height: (model.refSize * 110) / 400 + 'px',
        'font-size': (model.refSize * 110) / 500 + 'px',
				top: (model.refSize * 1766) / 400 + 'px',
				left: (model.refSize * 859) / 400 + 'px',
				border: (model.refSize * 20) / 400 + 'px solid black',
			}"></div>
		<!-- Else IF action time, add a circle -->
		<div
			v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[4][0] === -1"
			class="actionDiscOption"
			:style="{
				width: (model.refSize * 120) / 400 + 'px',
				height: (model.refSize * 110) / 400 + 'px',
        'font-size': (model.refSize * 110) / 500 + 'px',
				top: (model.refSize * 1766) / 400 + 'px',
				left: (model.refSize * 859) / 400 + 'px',
				border: (model.refSize * 20) / 400 + 'px solid yellow',
			}"
			@mouseover="highlight($event, true)"
			@mouseleave="highlight($event, false)"
			@click="clickedActionOption(4, 0)"></div>

		<!-- VROM -->
		<template v-for="(marker, index) in model.actionAreaData[5]" v-bind:key="index">
			<!-- Add a marker -->
			<div
				v-if="marker !== -1"
				class="actionDisc"
				:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: model.gameflow.phase === constants.PHASE_VROM && index === model.gameflow.fullActionTurnOrder.length - model.gameflow.turnOrder.length }]"
				:style="{
					width: (model.refSize * 120) / 400 + 'px',
					height: (model.refSize * 110) / 400 + 'px',
					top: (model.refSize * 2393) / 400 + 'px',
					left: (model.refSize * (5 + index * 141)) / 400 + 'px',
					border: (model.refSize * 20) / 400 + 'px solid black',
				}"></div>
			<!-- Else IF action time, add a circle -->
			<div
				v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && ((index === 0 && model.actionAreaData[5][0] === -1) || (model.actionAreaData[5][index] === -1 && model.actionAreaData[5][index - 1] !== -1))"
				class="actionDiscOption"
				:style="{
					width: (model.refSize * 120) / 400 + 'px',
					height: (model.refSize * 110) / 400 + 'px',
          'font-size': (model.refSize * 110) / 500 + 'px',
					top: (model.refSize * 2393) / 400 + 'px',
					left: (model.refSize * (5 + index * 141)) / 400 + 'px',
					border: (model.refSize * 20) / 400 + 'px solid yellow',
				}"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="clickedActionOption(5, index)">{{ model.currentPlayer().buses + (model.currentPlayer().colour === model.actionAreaData[1][0] ? 1 : 0)  }}</div>
		</template>

		<!-- STARTING PLAYER -->
		<!-- Add a marker -->
		<div
			v-if="model.actionAreaData[6][0] !== -1"
			class="actionDisc"
			:class="['actionDisc' + personal.getCorrectedColour(model.actionAreaData[6][0]), { currentPlayerGlow: model.gameflow.phase === constants.PHASE_ADD_BUS }]"
			:style="{
				width: (model.refSize * 120) / 400 + 'px',
				height: (model.refSize * 110) / 400 + 'px',
				top: (model.refSize * 2674) / 400 + 'px',
				left: (model.refSize * 859) / 400 + 'px',
				border: (model.refSize * 20) / 400 + 'px solid black',
			}"></div>
		<!-- Else IF action time, add a circle -->
		<div
			v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[6][0] === -1"
			class="actionDiscOption"
			:style="{
				width: (model.refSize * 120) / 400 + 'px',
				height: (model.refSize * 110) / 400 + 'px',
				top: (model.refSize * 2674) / 400 + 'px',
				left: (model.refSize * 859) / 400 + 'px',
				/*'border': model.refSize * 20 / 400 + 'px solid darkgoldenrod'*/
				border: (model.refSize * 20) / 400 + 'px solid yellow',
			}"
			@mouseover="highlight($event, true)"
			@mouseleave="highlight($event, false)"
			@click="clickedActionOption(6, 0)"></div>

		<!-- TIME STONES -->
		<div
			v-if="model.remainingTimeStones >= 1"
			class="timestoneDiv"
			:style="{
				width: (model.refSize * 100) / 400 + 'px',
				height: (model.refSize * 100) / 400 + 'px',
				top: (model.refSize * 1873) / 400 + 'px',
				left: (model.refSize * 532) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_blue')" class="timestoneImg" />
		</div>
		<div
			v-if="model.remainingTimeStones >= 2"
			class="timestoneDiv"
			:style="{
				width: (model.refSize * 100) / 400 + 'px',
				height: (model.refSize * 100) / 400 + 'px',
				top: (model.refSize * 1873) / 400 + 'px',
				left: (model.refSize * 650) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_green')" class="timestoneImg" />
		</div>
		<div
			v-if="model.remainingTimeStones >= 3"
			class="timestoneDiv"
			:style="{
				width: (model.refSize * 100) / 400 + 'px',
				height: (model.refSize * 100) / 400 + 'px',
				top: (model.refSize * 1935) / 400 + 'px',
				left: (model.refSize * 743) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_blue')" class="timestoneImg" />
		</div>
		<div
			v-if="model.remainingTimeStones >= 4"
			class="timestoneDiv"
			:style="{
				width: (model.refSize * 100) / 400 + 'px',
				height: (model.refSize * 100) / 400 + 'px',
				top: (model.refSize * 1997) / 400 + 'px',
				left: (model.refSize * 650) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_green')" class="timestoneImg" />
		</div>
		<div
			v-if="model.remainingTimeStones >= 5"
			class="timestoneDiv"
			:style="{
				width: (model.refSize * 100) / 400 + 'px',
				height: (model.refSize * 100) / 400 + 'px',
				top: (model.refSize * 1997) / 400 + 'px',
				left: (model.refSize * 532) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_blue')" class="timestoneImg" />
		</div>

		<!-- BUSES -->
		<template v-for="(player, index) in model.players" v-bind:key="index">
			<div
				v-for="i in player.buses"
				v-bind:key="i"
				class="busDiv"
				:style="{
					width: (model.refSize * 122) / 400 + 'px',
					height: (model.refSize * 70) / 400 + 'px',
					top: (model.refSize * (972 - (i - 1) * 78)) / 400 + 'px',
					left: (model.refSize * (96 + personal.getCorrectedColour(player.colour) * 193)) / 400 + 'px',
				}">
				<img :src="view.getImage('bus' + String(personal.getCorrectedColour(player.colour)))" class="busImg" />
			</div>
		</template>

		<!-- Pointer -->
		<div
			class="pointerDiv"
			:style="{
				width: (model.refSize * 50) / 400 + 'px',
				height: (model.refSize * 200) / 400 + 'px',
				top: (model.refSize * getPointerRotation()[0]) / 400 + 'px',
				left: (model.refSize * getPointerRotation()[1]) / 400 + 'px',
				transform: 'rotate(' + getPointerRotation()[2] + 'deg)',
			}">
			<img :src="view.getImage('pointer')" class="pointerImg" alt="pointer" />
		</div>

		<!-- PHASE GLOW AREAS -->
		<div
			v-if="model.gameflow.phase === constants.PHASE_LINE_EXPANSION"
			class="currentPhaseGlow"
			:style="{
				width: (model.refSize * 420) / 400 + 'px',
				height: (model.refSize * 70) / 400 + 'px',
				top: (model.refSize * 197) / 400 + 'px',
				left: (model.refSize * 50) / 400 + 'px',
			}"></div>
		<div
			v-if="model.gameflow.phase === constants.PHASE_ADD_PAX"
			class="currentPhaseGlow"
			:style="{
				width: (model.refSize * 310) / 400 + 'px',
				height: (model.refSize * 70) / 400 + 'px',
				top: (model.refSize * 1115) / 400 + 'px',
				left: (model.refSize * 50) / 400 + 'px',
			}"></div>
		<div
			v-if="model.gameflow.phase === constants.PHASE_ADD_BLDGS"
			class="currentPhaseGlow"
			:style="{
				width: (model.refSize * 270) / 400 + 'px',
				height: (model.refSize * 70) / 400 + 'px',
				top: (model.refSize * 1470) / 400 + 'px',
				left: (model.refSize * 50) / 400 + 'px',
			}"></div>
		<div
			v-if="model.gameflow.phase === constants.PHASE_ALTER_TIME"
			class="currentPhaseGlow"
			:style="{
				width: (model.refSize * 350) / 400 + 'px',
				height: (model.refSize * 350) / 400 + 'px',
				top: (model.refSize * 1810) / 400 + 'px',
				left: (model.refSize * 112) / 400 + 'px',
				'border-radius': '100%',
			}"></div>
		<div
			v-if="model.gameflow.phase === constants.PHASE_VROM"
			class="currentPhaseGlow"
			:style="{
				width: (model.refSize * 320) / 400 + 'px',
				height: (model.refSize * 70) / 400 + 'px',
				top: (model.refSize * 2245) / 400 + 'px',
				left: (model.refSize * 50) / 400 + 'px',
			}"></div>
	</div>
</template>

<style scoped>
.currentPhaseGlow {
	position: absolute;
	box-shadow: 0px 0px 10px 5px lightgreen;
	background-color: rgba(144, 238, 144, 0.5);
	/*opacity: 0.7;*/
	z-index: 20;
}

.busDiv,
.pointerDiv {
	position: absolute;
}

.timestoneDiv {
	position: absolute;
}

.busImg {
	width: 100%;
	height: 100%;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
}

.timestoneImg {
	width: 100%;
	height: 100%;
}

.pointerImg {
	width: 100%;
	height: 100%;
	filter: drop-shadow(2px 0 0 white) drop-shadow(0 2px 0 white) drop-shadow(-2px 0 0 white) drop-shadow(0 -2px 0 white);
}

#actionSelectionRight {
	position: relative;
	top: 0px;
	border-top: 3px solid black;
	border-bottom: 3px solid black;
	border-right: 3px solid black;
	border-radius: 0 25px 25px 0;
	background-color: #3474a9;
	float: right;
}

#actionSelectionRightImg {
	width: 100%;
	height: 100%;
	border: 0px solid black;
	border-radius: 0 25px 25px 0;
}

.actionDiscOption {
	position: absolute;
	border-radius: 100%;
  background-color: black;
  color: white;
  font-weight: 900;
  
}
.actionDiscOption:hover {
	cursor: pointer;
}

.actionDisc {
	position: absolute;
	border-radius: 100%;
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

.currentPlayerGlow {
	box-shadow: 0px 0px 10px 5px lightgreen;
	z-index: 20;
}
</style>
