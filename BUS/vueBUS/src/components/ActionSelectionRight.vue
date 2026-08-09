<script setup>
import * as rf from "../js/BUSreference.js"
import * as view from "../js/BUSview.js"
import * as controller from "../js/BUScontroller.js"
import * as model from "../js/BUSmodel.js"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

const forwardChars = ["A", "B", "C", "D", "E", "F"]
const reverseChars = ["F", "E", "D", "C", "B", "A"]

const computedReverseCharsLineExpansion = computed(() => {
	if (store.gameflow.phase !== rf.PHASE_CHOOSE_ACTIONS) return reverseChars
	let chars = []
	for (let i = 0; i < store.actionAreaData[0].length; i++) {
		if (store.players.length === 5) chars.unshift(Math.max(0, model.maxBuses() + 1 - i))
		else chars.unshift(Math.max(0, model.maxBuses() - i))
	}
	return chars
})
const computedReverseChars = computed(() => {
	if (store.gameflow.phase !== rf.PHASE_CHOOSE_ACTIONS) return reverseChars
	let chars = []
	for (let i = 0; i < store.actionAreaData[0].length; i++) {
		if (store.actionAreaData[1][0] !== -1 && controller.getPlayerByColour(store.actionAreaData[1][0]).buses + 1 > model.maxBuses()) chars.unshift(Math.max(0, controller.getPlayerByColour(store.actionAreaData[1][0]).buses + 1 - i))
		else chars.unshift(Math.max(0, model.maxBuses() - i))
	}
	return chars
})

const computedForwardChars = computed(() => {
	if (store.gameflow.phase !== rf.PHASE_CHOOSE_ACTIONS) return forwardChars
	let chars = []
	for (let i = 0; i < store.actionAreaData[0].length; i++) {
		if (store.actionAreaData[1][0] !== -1 && controller.getPlayerByColour(store.actionAreaData[1][0]).buses + 1 > model.maxBuses()) chars.push(Math.max(0, controller.getPlayerByColour(store.actionAreaData[1][0]).buses + 1 - i))
		else chars.push(Math.max(0, model.maxBuses() - i))
	}
	return chars
})

function highlight(e, entering) {
	if (entering) {
		e.target.style["border-color"] = "lightgreen"
		e.target.style["background-color"] = rf.getColourNameFromNumber(personal.getCorrectedColour(controller.currentPlayerObj().colour))
	} else {
		/*e.target.style['border-color'] = 'darkgoldenrod'*/
		e.target.style["border-color"] = "yellow"
		e.target.style["background-color"] = ""
	}
}
function clickedActionOption(action, index) {
	store.context.historyObj.push(action, index)
	controller.currentPlayerObj().remainingActions--
	store.actionAreaData[action][index] = controller.currentPlayerObj().colour
	store.context.actionChosen = true
}

function getActionSelectionWidth() {
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) return 279
	if (personal.selectedBoard === rf.BOARD_OG) return 279
	if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) return 0
	if (personal.selectedBoard === rf.BOARD_PITTS) return 279
}

function getPointerRotation() {
    // 1. Get the current cumulative rotation from the store (default to 0)
    const currentRotation = store.pointerRotation || 0;
    
    // 2. Define the base targets and coordinates
    let targetBaseAngle = 0;
    let coords = [1880, 260];

    if (store.desiredBuilding === rf.BLDG_HOME) {
        targetBaseAngle = -120;
        coords = [1886, 264];
    } else if (store.desiredBuilding === rf.BLDG_OFFICE) {
        targetBaseAngle = 0;
        coords = [1880, 260];
    } else if (store.desiredBuilding === rf.BLDG_PUB) {
        targetBaseAngle = 120;
        coords = [1888, 265];
    }

    // 3. Calculate the shortest difference
    // This formula finds the quickest way to the new angle (-180 to 180 range)
    let diff = (targetBaseAngle - currentRotation) % 360;
    
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // 4. Update the store with the NEW cumulative rotation
    const newRotation = currentRotation + diff;
    store.pointerRotation = newRotation;

    // 5. Return the array with the non-normalized rotation
    return [coords[0], coords[1], newRotation];
}
</script>

<template>
	<div
		v-if="store.topMenuViews.displayRightActionSelection"
		id="actionSelectionRight"
		:style="{
			width: (store.refSize * getActionSelectionWidth()) / 100 + 'px',
			height: (store.refSize * 732) / 100 + 'px',
			left: (store.refSize * -8) / 100 + 'px',
		}">
		<img id="actionSelectionRightImg" :src="personal.selectedBoard === rf.BOARD_OG ? view.getImage('rightActions_orig') : view.getImage('rightActions')" alt="Actions" />

		<!-- ADD LINES -->
		<template v-for="(marker, index) in store.actionAreaData[0]" v-bind:key="index">
			<!-- Add a marker -->
			<div
				v-if="marker !== -1"
				class="actionDisc"
				:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_LINE_EXPANSION && index === 6 - store.gameflow.turnOrder.length }]"
				:style="{
					width: (store.refSize * 120) / 400 + 'px',
					height: (store.refSize * 110) / 400 + 'px',
					top: (store.refSize * 300) / 400 + 'px',
					left: (store.refSize * (5 + index * 141)) / 400 + 'px',
					border: (store.refSize * 20) / 400 + 'px solid black',
				}"></div>
			<!-- Else IF action time, add a circle -->
			<div
				v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && (index === 5 || store.actionAreaData[0][index + 1] !== -1)"
				class="actionDiscOption"
				:style="{
					width: (store.refSize * 120) / 400 + 'px',
					height: (store.refSize * 110) / 400 + 'px',
					'font-size': (store.refSize * 110) / 500 + 'px',
					top: (store.refSize * 300) / 400 + 'px',
					left: (store.refSize * (5 + index * 141)) / 400 + 'px',
					border: (store.refSize * 20) / 400 + 'px solid yellow',
				}"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="clickedActionOption(0, index)">
				{{ computedReverseCharsLineExpansion[index] }}
			</div>
		</template>

		<!-- NEW BUS -->
		<!-- Add a marker -->
		<div
			v-if="store.actionAreaData[1][0] !== -1"
			class="actionDisc"
			:class="['actionDisc' + personal.getCorrectedColour(store.actionAreaData[1][0]), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_ADD_BUS }]"
			:style="{
				width: (store.refSize * 120) / 400 + 'px',
				height: (store.refSize * 110) / 400 + 'px',
				top: (store.refSize * 500) / 400 + 'px',
				left: (store.refSize * 859) / 400 + 'px',
				border: (store.refSize * 20) / 400 + 'px solid black',
			}"></div>
		<!-- Else IF action time, add a circle -->
		<div
			v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && store.actionAreaData[1][0] === -1"
			class="actionDiscOption"
			:style="{
				width: (store.refSize * 120) / 400 + 'px',
				height: (store.refSize * 110) / 400 + 'px',
				'font-size': (store.refSize * 110) / 500 + 'px',
				top: (store.refSize * 500) / 400 + 'px',
				left: (store.refSize * 859) / 400 + 'px',
				border: (store.refSize * 20) / 400 + 'px solid yellow',
			}"
			@mouseover="highlight($event, true)"
			@mouseleave="highlight($event, false)"
			@click="clickedActionOption(1, 0)"></div>

		<!-- ADD PAX -->
		<template v-for="(marker, index) in store.actionAreaData[2]" v-bind:key="index">
			<!-- Add a marker -->
			<div
				v-if="marker !== -1"
				class="actionDisc"
				:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_ADD_PAX && index === store.gameflow.fullActionTurnOrder.length - store.gameflow.turnOrder.length }]"
				:style="{
					width: (store.refSize * 120) / 400 + 'px',
					height: (store.refSize * 110) / 400 + 'px',
					top: (store.refSize * 1226) / 400 + 'px',
					left: (store.refSize * (5 + index * 141)) / 400 + 'px',
					border: (store.refSize * 20) / 400 + 'px solid black',
				}"></div>
			<!-- Else IF action time, add a circle -->
			<div
				v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && ((index === 0 && store.actionAreaData[2][0] === -1) || (store.actionAreaData[2][index] === -1 && store.actionAreaData[2][index - 1] !== -1))"
				class="actionDiscOption"
				:style="{
					width: (store.refSize * 120) / 400 + 'px',
					height: (store.refSize * 110) / 400 + 'px',
					'font-size': (store.refSize * 110) / 500 + 'px',
					top: (store.refSize * 1226) / 400 + 'px',
					left: (store.refSize * (5 + index * 141)) / 400 + 'px',
					border: (store.refSize * 20) / 400 + 'px solid yellow',
				}"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="clickedActionOption(2, index)">
				{{ computedForwardChars[index] }}
			</div>
		</template>

		<!-- ADD BUILDING -->
		<template v-for="(marker, index) in store.actionAreaData[3]" v-bind:key="index">
			<!-- Add a marker -->
			<div
				v-if="marker !== -1"
				class="actionDisc"
				:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_ADD_BUS && index === 6 - store.gameflow.turnOrder.length }]"
				:style="{
					width: (store.refSize * 120) / 400 + 'px',
					height: (store.refSize * 110) / 400 + 'px',
					'font-size': (store.refSize * 110) / 500 + 'px',
					top: (store.refSize * 1566) / 400 + 'px',
					left: (store.refSize * (5 + index * 141.4)) / 400 + 'px',
					border: (store.refSize * 20) / 400 + 'px solid black',
				}"></div>
			<!-- Else IF action time, add a circle -->
			<div
				v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && (index === 5 || store.actionAreaData[3][index + 1] !== -1)"
				class="actionDiscOption"
				:style="{
					width: (store.refSize * 120) / 400 + 'px',
					height: (store.refSize * 110) / 400 + 'px',
					'font-size': (store.refSize * 110) / 500 + 'px',
					top: (store.refSize * 1566) / 400 + 'px',
					left: (store.refSize * (5 + index * 141)) / 400 + 'px',
					border: (store.refSize * 20) / 400 + 'px solid yellow',
				}"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="clickedActionOption(3, index)">
				{{ computedReverseChars[index] }}
			</div>
		</template>

		<!-- ALTER TIME -->
		<!-- Add a marker -->
		<div
			v-if="store.actionAreaData[4][0] !== -1"
			class="actionDisc"
			:class="['actionDisc' + personal.getCorrectedColour(store.actionAreaData[4][0]), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_ADD_BUS }]"
			:style="{
				width: (store.refSize * 120) / 400 + 'px',
				height: (store.refSize * 110) / 400 + 'px',
				'font-size': (store.refSize * 110) / 500 + 'px',
				top: (store.refSize * 1766) / 400 + 'px',
				left: (store.refSize * 859) / 400 + 'px',
				border: (store.refSize * 20) / 400 + 'px solid black',
			}"></div>
		<!-- Else IF action time, add a circle -->
		<div
			v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && store.actionAreaData[4][0] === -1"
			class="actionDiscOption"
			:style="{
				width: (store.refSize * 120) / 400 + 'px',
				height: (store.refSize * 110) / 400 + 'px',
				'font-size': (store.refSize * 110) / 500 + 'px',
				top: (store.refSize * 1766) / 400 + 'px',
				left: (store.refSize * 859) / 400 + 'px',
				border: (store.refSize * 20) / 400 + 'px solid yellow',
			}"
			@mouseover="highlight($event, true)"
			@mouseleave="highlight($event, false)"
			@click="clickedActionOption(4, 0)"></div>

		<!-- VROM -->
		<template v-for="(marker, index) in store.actionAreaData[5]" v-bind:key="index">
			<!-- Add a marker -->
			<div
				v-if="marker !== -1"
				class="actionDisc"
				:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_VROM && index === store.gameflow.fullActionTurnOrder.length - store.gameflow.turnOrder.length }]"
				:style="{
					width: (store.refSize * 120) / 400 + 'px',
					height: (store.refSize * 110) / 400 + 'px',
					top: (store.refSize * 2393) / 400 + 'px',
					left: (store.refSize * (5 + index * 141)) / 400 + 'px',
					border: (store.refSize * 20) / 400 + 'px solid black',
				}"></div>
			<!-- Else IF action time, add a circle -->
			<div
				v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && ((index === 0 && store.actionAreaData[5][0] === -1) || (store.actionAreaData[5][index] === -1 && store.actionAreaData[5][index - 1] !== -1))"
				class="actionDiscOption"
				:style="{
					width: (store.refSize * 120) / 400 + 'px',
					height: (store.refSize * 110) / 400 + 'px',
					'font-size': (store.refSize * 110) / 500 + 'px',
					top: (store.refSize * 2393) / 400 + 'px',
					left: (store.refSize * (5 + index * 141)) / 400 + 'px',
					border: (store.refSize * 20) / 400 + 'px solid yellow',
				}"
				@mouseover="highlight($event, true)"
				@mouseleave="highlight($event, false)"
				@click="clickedActionOption(5, index)">
				{{ controller.currentPlayerObj().buses + (controller.currentPlayerObj().colour === store.actionAreaData[1][0] ? 1 : 0) }}
			</div>
		</template>

		<!-- STARTING PLAYER -->
		<!-- Add a marker -->
		<div
			v-if="store.actionAreaData[6][0] !== -1"
			class="actionDisc"
			:class="['actionDisc' + personal.getCorrectedColour(store.actionAreaData[6][0]), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_ADD_BUS }]"
			:style="{
				width: (store.refSize * 120) / 400 + 'px',
				height: (store.refSize * 110) / 400 + 'px',
				top: (store.refSize * 2674) / 400 + 'px',
				left: (store.refSize * 859) / 400 + 'px',
				border: (store.refSize * 20) / 400 + 'px solid black',
			}"></div>
		<!-- Else IF action time, add a circle -->
		<div
			v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && store.actionAreaData[6][0] === -1"
			class="actionDiscOption"
			:style="{
				width: (store.refSize * 120) / 400 + 'px',
				height: (store.refSize * 110) / 400 + 'px',
				top: (store.refSize * 2674) / 400 + 'px',
				left: (store.refSize * 859) / 400 + 'px',
				/*'border': store.refSize * 20 / 400 + 'px solid darkgoldenrod'*/
				border: (store.refSize * 20) / 400 + 'px solid yellow',
			}"
			@mouseover="highlight($event, true)"
			@mouseleave="highlight($event, false)"
			@click="clickedActionOption(6, 0)"></div>

		<!-- TIME STONES -->
		<div
			v-if="store.remainingTimeStones >= 1"
			class="timestoneDiv"
			:style="{
				width: (store.refSize * 100) / 400 + 'px',
				height: (store.refSize * 100) / 400 + 'px',
				top: (store.refSize * 1873) / 400 + 'px',
				left: (store.refSize * 532) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_blue')" class="timestoneImg" />
		</div>
		<div
			v-if="store.remainingTimeStones >= 2"
			class="timestoneDiv"
			:style="{
				width: (store.refSize * 100) / 400 + 'px',
				height: (store.refSize * 100) / 400 + 'px',
				top: (store.refSize * 1873) / 400 + 'px',
				left: (store.refSize * 650) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_green')" class="timestoneImg" />
		</div>
		<div
			v-if="store.remainingTimeStones >= 3"
			class="timestoneDiv"
			:style="{
				width: (store.refSize * 100) / 400 + 'px',
				height: (store.refSize * 100) / 400 + 'px',
				top: (store.refSize * 1935) / 400 + 'px',
				left: (store.refSize * 743) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_blue')" class="timestoneImg" />
		</div>
		<div
			v-if="store.remainingTimeStones >= 4"
			class="timestoneDiv"
			:style="{
				width: (store.refSize * 100) / 400 + 'px',
				height: (store.refSize * 100) / 400 + 'px',
				top: (store.refSize * 1997) / 400 + 'px',
				left: (store.refSize * 650) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_green')" class="timestoneImg" />
		</div>
		<div
			v-if="store.remainingTimeStones >= 5"
			class="timestoneDiv"
			:style="{
				width: (store.refSize * 100) / 400 + 'px',
				height: (store.refSize * 100) / 400 + 'px',
				top: (store.refSize * 1997) / 400 + 'px',
				left: (store.refSize * 532) / 400 + 'px',
			}">
			<img :src="view.getImage('stone_blue')" class="timestoneImg" />
		</div>

		<!-- BUSES -->
		<template v-for="(player, index) in store.players" v-bind:key="index">
			<div
				v-for="i in player.buses"
				v-bind:key="i"
				class="busDiv"
				:style="{
					width: (store.refSize * 122) / 400 + 'px',
					height: (store.refSize * 70) / 400 + 'px',
					top: (store.refSize * (972 - (i - 1) * 78)) / 400 + 'px',
					left: (store.refSize * (96 + personal.getCorrectedColour(player.colour) * 193)) / 400 + 'px',
				}">
				<img :src="view.getImage('bus' + String(personal.getCorrectedColour(player.colour)))" class="busImg" />
			</div>
		</template>

		<!-- Pointer -->
		<div
			class="pointerDiv"
			:style="{
				width: (store.refSize * 50) / 400 + 'px',
				height: (store.refSize * 200) / 400 + 'px',
				top: (store.refSize * getPointerRotation()[0]) / 400 + 'px',
				left: (store.refSize * getPointerRotation()[1]) / 400 + 'px',
				transform: 'rotate(' + getPointerRotation()[2] + 'deg)',
			}">
			<img :src="view.getImage('pointer')" class="pointerImg" alt="pointer" />
		</div>

		<!-- PHASE GLOW AREAS -->
		<div
			v-if="store.gameflow.phase === rf.PHASE_LINE_EXPANSION"
			class="currentPhaseGlow"
			:style="{
				width: (store.refSize * 420) / 400 + 'px',
				height: (store.refSize * 70) / 400 + 'px',
				top: (store.refSize * 197) / 400 + 'px',
				left: (store.refSize * 50) / 400 + 'px',
			}"></div>
		<div
			v-if="store.gameflow.phase === rf.PHASE_ADD_PAX"
			class="currentPhaseGlow"
			:style="{
				width: (store.refSize * 310) / 400 + 'px',
				height: (store.refSize * 70) / 400 + 'px',
				top: (store.refSize * 1115) / 400 + 'px',
				left: (store.refSize * 50) / 400 + 'px',
			}"></div>
		<div
			v-if="store.gameflow.phase === rf.PHASE_ADD_BLDGS"
			class="currentPhaseGlow"
			:style="{
				width: (store.refSize * 270) / 400 + 'px',
				height: (store.refSize * 70) / 400 + 'px',
				top: (store.refSize * 1470) / 400 + 'px',
				left: (store.refSize * 50) / 400 + 'px',
			}"></div>
		<div
			v-if="store.gameflow.phase === rf.PHASE_ALTER_TIME"
			class="currentPhaseGlow"
			:style="{
				width: (store.refSize * 350) / 400 + 'px',
				height: (store.refSize * 350) / 400 + 'px',
				top: (store.refSize * 1810) / 400 + 'px',
				left: (store.refSize * 112) / 400 + 'px',
				'border-radius': '100%',
			}"></div>
		<div
			v-if="store.gameflow.phase === rf.PHASE_VROM"
			class="currentPhaseGlow"
			:style="{
				width: (store.refSize * 320) / 400 + 'px',
				height: (store.refSize * 70) / 400 + 'px',
				top: (store.refSize * 2245) / 400 + 'px',
				left: (store.refSize * 50) / 400 + 'px',
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
	transition: transform 0.5s ease-in-out;
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
	background-color: #0c64ae;
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
	background-color: #0c64ae;
}

.actionDisc1 {
	/*background-color: green;*/
	background-color: #0e7964;
}

.actionDisc2 {
	/*background-color: purple;*/
	background-color: #6e365e;
}

.actionDisc3 {
	/*background-color: red;*/
	background-color: #eb2e0f;
}

.actionDisc4 {
	/*background-color: yellow;*/
	background-color: #fb9907;
}

.noMoreLeft {
	color: red;
}

.currentPlayerGlow {
	box-shadow: 0px 0px 10px 5px lightgreen;
	z-index: 20;
}
</style>
