<script setup>
import * as rf from "../js/BUSreference.js"
import * as view from "../js/BUSview.js"
import * as controller from "../js/BUScontroller.js"
import * as model from "../js/BUSmodel.js"

import scoreDiv from "./scoreDiv.vue"
import BuildingsDivs from "./BuildingsDivs.vue"
import LinesDivs from "./LinesDivs.vue"
import ActionSelectionRight from "./ActionSelectionRight.vue"

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

function getBoardImgSrc() {
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) return view.getImage("Board_20A")
	if (personal.selectedBoard === rf.BOARD_OG) return view.getImage("Board_origV2")
	if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) return view.getImage("Board_20AC")
}

function getBoardWidth() {
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) return 800
	if (personal.selectedBoard === rf.BOARD_OG) return 817
	if (personal.selectedBoard === rf.BOARD_20A_CAPSTONE) return 1035
}

function getWholeBoardMinWidth() {
	if (personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL) return (store.refSize * (getBoardWidth() + 279 + 8)) / 100
	if (personal.selectedBoard === rf.BOARD_OG) return (store.refSize * (getBoardWidth() + 279 + 9)) / 100
	// WHY IS THIS REPEATED????? TODO
	if (personal.selectedBoard === rf.BOARD_OG) return (store.refSize * (getBoardWidth() + 0 + 9)) / 100
}

// Repeats

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

function getPointerRotation() {
	const currentRotation = store.pointerRotation || 0
	let targetRotation

	// 1. Define base angles
	if (store.desiredBuilding === 1) targetRotation = -109
	else if (store.desiredBuilding === 2) targetRotation = 11
	else if (store.desiredBuilding === 3) targetRotation = 130
	else return [1815, 3336, 0]

	// 2. Normalize the target relative to the current rotation
	// to find the shortest displacement
	let rotationDiff = (targetRotation - currentRotation) % 360

	if (rotationDiff > 180) rotationDiff -= 360
	if (rotationDiff < -180) rotationDiff += 360

	// 3. Calculate the absolute new rotation
	// DO NOT NORMALIZE THIS. If it's 371, leave it at 371.
	const finalRotation = currentRotation + rotationDiff

	store.pointerRotation = finalRotation

	// 4. Return position array
	const coords = {
		1: [1815, 3336],
		2: [1805, 3340],
		3: [1814, 3350],
	}

	const [x, y] = coords[store.desiredBuilding] || [1815, 3336]
	return [x, y, finalRotation]
}

function getCorrectedBusIndex(position) {
	if (position === 0) return 1
	if (position === 1) return 2
	if (position === 2) return 0
	if (position === 3) return 4
	if (position === 4) return 3
}
</script>

<template>
	<div id="middleArea">
		<transition name="fadeGameBoard">
			<div
				id="gameBoardAndActions"
				v-if="!store.performingBoardChange"
				:style="{
					'min-width': getWholeBoardMinWidth() + 'px',
				}">
				<div
					id="gameBoard"
					:style="{
						width: (store.refSize * getBoardWidth()) / 100 + 'px',
						height: (store.refSize * 732) / 100 + 'px',
					}"
					:class="{ rightActionSelection: store.topMenuViews.displayRightActionSelection }">
					<img id="gameBoardImg" :src="getBoardImgSrc()" :class="{ rightActionSelection: store.topMenuViews.displayRightActionSelection }" />
					>

					<scoreDiv />
					<BuildingsDivs v-if="personal.selectedBoard !== rf.BOARD_OG" />
					<LinesDivs />
					<BuildingsDivs v-if="personal.selectedBoard === rf.BOARD_OG" />

					<!-- ACTIONS FOR ALL IN ONE BOARDS -->
					<template v-if="personal.selectedBoard === rf.BOARD_20A_CAPSTONE">
						<!-- ADD LINES -->
						<template v-for="(marker, index) in store.actionAreaData[0]" v-bind:key="index">
							<!-- Add a marker -->
							<div
								v-if="marker !== -1"
								class="actionDisc"
								:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_LINE_EXPANSION && index === 6 - store.gameflow.turnOrder.length }]"
								:style="{
									width: (store.refSize * 70) / 400 + 'px',
									height: (store.refSize * 70) / 400 + 'px',
									top: (store.refSize * 417) / 400 + 'px',
									left: (store.refSize * (3296 + index * 86.8)) / 400 + 'px', //3730
									border: (store.refSize * 20) / 400 + 'px solid black',
								}"></div>
							<!-- Else IF action time, add a circle -->
							<div
								v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && (index === 5 || store.actionAreaData[0][index + 1] !== -1)"
								class="actionDiscOption"
								:style="{
									width: (store.refSize * 70) / 400 + 'px',
									height: (store.refSize * 70) / 400 + 'px',
									'font-size': (store.refSize * 70) / 500 + 'px',
									top: (store.refSize * 417) / 400 + 'px',
									left: (store.refSize * (3296 + index * 86.8)) / 400 + 'px', //3730
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
								width: (store.refSize * 70) / 400 + 'px',
								height: (store.refSize * 70) / 400 + 'px',
								top: (store.refSize * 615) / 400 + 'px',
								left: (store.refSize * 3933) / 400 + 'px',
								border: (store.refSize * 20) / 400 + 'px solid black',
							}"></div>
						<!-- Else IF action time, add a circle -->
						<div
							v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && store.actionAreaData[1][0] === -1"
							class="actionDiscOption"
							:style="{
								width: (store.refSize * 70) / 400 + 'px',
								height: (store.refSize * 70) / 400 + 'px',
								top: (store.refSize * 615) / 400 + 'px',
								left: (store.refSize * 3933) / 400 + 'px',
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
									width: (store.refSize * 70) / 400 + 'px',
									height: (store.refSize * 70) / 400 + 'px',
									top: (store.refSize * 1248) / 400 + 'px',
									left: (store.refSize * (3295 + index * 87.5)) / 400 + 'px',
									border: (store.refSize * 20) / 400 + 'px solid black',
								}"></div>
							<!-- Else IF action time, add a circle -->
							<div
								v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && ((index === 0 && store.actionAreaData[2][0] === -1) || (store.actionAreaData[2][index] === -1 && store.actionAreaData[2][index - 1] !== -1))"
								class="actionDiscOption"
								:style="{
									width: (store.refSize * 70) / 400 + 'px',
									height: (store.refSize * 70) / 400 + 'px',
									'font-size': (store.refSize * 70) / 500 + 'px',
									top: (store.refSize * 1248) / 400 + 'px',
									left: (store.refSize * (3295 + index * 87.5)) / 400 + 'px',
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
								:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_ADD_BLDGS && index === 6 - store.gameflow.turnOrder.length }]"
								:style="{
									width: (store.refSize * 70) / 400 + 'px',
									height: (store.refSize * 70) / 400 + 'px',
									top: (store.refSize * 1534) / 400 + 'px',
									left: (store.refSize * (3296 + index * 87.4)) / 400 + 'px', //3730
									border: (store.refSize * 20) / 400 + 'px solid black',
								}"></div>
							<!-- Else IF action time, add a circle -->
							<div
								v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && (index === 5 || store.actionAreaData[3][index + 1] !== -1)"
								class="actionDiscOption"
								:style="{
									width: (store.refSize * 70) / 400 + 'px',
									height: (store.refSize * 70) / 400 + 'px',
									'font-size': (store.refSize * 70) / 500 + 'px',
									top: (store.refSize * 35014) / 400 + 'px',
									left: (store.refSize * (3296 + index * 87.4)) / 400 + 'px', //3730
									border: (store.refSize * 20) / 400 + 'px solid yellow',
								}"
								@mouseover="highlight($event, true)"
								@mouseleave="highlight($event, false)"
								@click="clickedActionOption(5, index)">
								{{ computedReverseChars[index] }}
							</div>
						</template>

						<!-- ALTER TIME -->
						<!-- Add a marker -->
						<div
							v-if="store.actionAreaData[4][0] !== -1"
							class="actionDisc"
							:class="['actionDisc' + personal.getCorrectedColour(store.actionAreaData[4][0]), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_ALTER_TIME }]"
							:style="{
								width: (store.refSize * 70) / 400 + 'px',
								height: (store.refSize * 70) / 400 + 'px',
								top: (store.refSize * 1731) / 400 + 'px',
								left: (store.refSize * 3937) / 400 + 'px',
								border: (store.refSize * 20) / 400 + 'px solid black',
							}"></div>
						<!-- Else IF action time, add a circle -->
						<div
							v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && store.actionAreaData[4][0] === -1"
							class="actionDiscOption"
							:style="{
								width: (store.refSize * 70) / 400 + 'px',
								height: (store.refSize * 70) / 400 + 'px',
								top: (store.refSize * 1731) / 400 + 'px',
								left: (store.refSize * 3937) / 400 + 'px',
								border: (store.refSize * 20) / 400 + 'px solid yellow',
							}"
							@mouseover="highlight($event, true)"
							@mouseleave="highlight($event, false)"
							@click="clickedActionOption(4, 0)">
							{{ computedReverseChars[0] }}
						</div>
						<template v-for="(marker, index) in store.actionAreaData[5]" v-bind:key="index">
							<!-- Add a marker -->
							<div
								v-if="marker !== -1"
								class="actionDisc"
								:class="['actionDisc' + personal.getCorrectedColour(marker), { currentPlayerGlow: store.gameflow.phase === rf.PHASE_VROM && index === store.gameflow.fullActionTurnOrder.length - store.gameflow.turnOrder.length }]"
								:style="{
									width: (store.refSize * 70) / 400 + 'px',
									height: (store.refSize * 70) / 400 + 'px',
									top: (store.refSize * 2526) / 400 + 'px',
									left: (store.refSize * (3302 + index * 87)) / 400 + 'px',
									border: (store.refSize * 20) / 400 + 'px solid black',
								}"></div>
							<!-- Else IF action time, add a circle -->
							<div
								v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && ((index === 0 && store.actionAreaData[5][0] === -1) || (store.actionAreaData[5][index] === -1 && store.actionAreaData[5][index - 1] !== -1))"
								class="actionDiscOption"
								:style="{
									width: (store.refSize * 70) / 400 + 'px',
									height: (store.refSize * 70) / 400 + 'px',
									'font-size': (store.refSize * 70) / 500 + 'px',
									top: (store.refSize * 2526) / 400 + 'px',
									left: (store.refSize * (3302 + index * 87)) / 400 + 'px',
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
								width: (store.refSize * 70) / 400 + 'px',
								height: (store.refSize * 70) / 400 + 'px',
								top: (store.refSize * 2722) / 400 + 'px',
								left: (store.refSize * 3935) / 400 + 'px',
								border: (store.refSize * 20) / 400 + 'px solid black',
							}"></div>
						<!-- Else IF action time, add a circle -->
						<div
							v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && personal.canPlay() && controller.currentPlayerObj().remainingActions > 0 && !store.context.confirmEndTurn && !store.context.actionChosen && store.actionAreaData[6][0] === -1"
							class="actionDiscOption"
							:style="{
								width: (store.refSize * 70) / 400 + 'px',
								height: (store.refSize * 70) / 400 + 'px',
								top: (store.refSize * 2722) / 400 + 'px',
								left: (store.refSize * 3935) / 400 + 'px',
								border: (store.refSize * 20) / 400 + 'px solid yellow',
							}"
							@mouseover="highlight($event, true)"
							@mouseleave="highlight($event, false)"
							@click="clickedActionOption(6, 0)"></div>

						<!-- TIME STONES -->
						<div
							class="timestoneDiv"
							:style="{
								width: (store.refSize * 135) / 400 + 'px',
								height: (store.refSize * 135) / 400 + 'px',
								top: (store.refSize * 1885) / 400 + 'px',
								left: (store.refSize * 3735) / 400 + 'px',
							}">
							<img v-if="store.remainingTimeStones >= 1" :src="view.getImage('stone_blue')" class="timestoneImg" />
							<div v-else class="timestoneGoneDiv"></div>
						</div>
						<div
							class="timestoneDiv"
							:style="{
								width: (store.refSize * 135) / 400 + 'px',
								height: (store.refSize * 135) / 400 + 'px',
								top: (store.refSize * 1923) / 400 + 'px',
								left: (store.refSize * 3906) / 400 + 'px',
							}">
							<img v-if="store.remainingTimeStones >= 2" :src="view.getImage('stone_green')" class="timestoneImg" />
							<div v-else class="timestoneGoneDiv"></div>
						</div>
						<div
							class="timestoneDiv"
							:style="{
								width: (store.refSize * 135) / 400 + 'px',
								height: (store.refSize * 135) / 400 + 'px',
								top: (store.refSize * 2082) / 400 + 'px',
								left: (store.refSize * 3981) / 400 + 'px',
							}">
							<img v-if="store.remainingTimeStones >= 3" :src="view.getImage('stone_blue')" class="timestoneImg" />
							<div v-else class="timestoneGoneDiv"></div>
						</div>
						<div
							class="timestoneDiv"
							:style="{
								width: (store.refSize * 135) / 400 + 'px',
								height: (store.refSize * 135) / 400 + 'px',
								top: (store.refSize * 2204) / 400 + 'px',
								left: (store.refSize * 3848) / 400 + 'px',
							}">
							<img v-if="store.remainingTimeStones >= 4" :src="view.getImage('stone_green')" class="timestoneImg" />
							<div v-else class="timestoneGoneDiv"></div>
						</div>
						<div
							class="timestoneDiv"
							:style="{
								width: (store.refSize * 135) / 400 + 'px',
								height: (store.refSize * 135) / 400 + 'px',
								top: (store.refSize * 2168) / 400 + 'px',
								left: (store.refSize * 3676) / 400 + 'px',
							}">
							<img v-if="store.remainingTimeStones >= 5" :src="view.getImage('stone_blue')" class="timestoneImg" />
							<div v-else class="timestoneGoneDiv"></div>
						</div>

						<!-- BUSES -->
						<template v-for="(player, index) in store.players" v-bind:key="index">
							<div
								v-for="i in player.buses"
								v-bind:key="i"
								class="busDiv"
								:style="{
									width: (store.refSize * 97.6) / 400 + 'px',
									height: (store.refSize * 56) / 400 + 'px',
									top: (store.refSize * (995 - (i - 1) * 62)) / 400 + 'px',
									left: (store.refSize * (3320 + getCorrectedBusIndex(personal.getCorrectedColour(player.colour)) * 152)) / 400 + 'px',
								}">
								<img :src="view.getImage('bus' + String(personal.getCorrectedColour(player.colour)))" class="busImg" />
							</div>
						</template>

						<!-- Pointer -->
						<div
							class="pointerDiv"
							:style="{
								width: (store.refSize * 100) / 400 + 'px',
								height: (store.refSize * 400) / 400 + 'px',
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
								width: (store.refSize * 260) / 400 + 'px',
								height: (store.refSize * 50) / 400 + 'px',
								top: (store.refSize * 355) / 400 + 'px',
								left: (store.refSize * 3300) / 400 + 'px',
							}"></div>
						<div
							v-if="store.gameflow.phase === rf.PHASE_ADD_PAX"
							class="currentPhaseGlow"
							:style="{
								width: (store.refSize * 230) / 400 + 'px',
								height: (store.refSize * 50) / 400 + 'px',
								top: (store.refSize * 1185) / 400 + 'px',
								left: (store.refSize * 3300) / 400 + 'px',
							}"></div>
						<div
							v-if="store.gameflow.phase === rf.PHASE_ADD_BLDGS"
							class="currentPhaseGlow"
							:style="{
								width: (store.refSize * 180) / 400 + 'px',
								height: (store.refSize * 50) / 400 + 'px',
								top: (store.refSize * 1470) / 400 + 'px',
								left: (store.refSize * 3300) / 400 + 'px',
							}"></div>
						<div
							v-if="store.gameflow.phase === rf.PHASE_ALTER_TIME"
							class="currentPhaseGlow"
							:style="{
								width: (store.refSize * 600) / 400 + 'px',
								height: (store.refSize * 600) / 400 + 'px',
								top: (store.refSize * 1710) / 400 + 'px',
								left: (store.refSize * 3085) / 400 + 'px',
								'border-radius': '100%',
							}"></div>
						<div
							v-if="store.gameflow.phase === rf.PHASE_VROM"
							class="currentPhaseGlow"
							:style="{
								width: (store.refSize * 225) / 400 + 'px',
								height: (store.refSize * 50) / 400 + 'px',
								top: (store.refSize * 2465) / 400 + 'px',
								left: (store.refSize * 3300) / 400 + 'px',
							}"></div>
					</template>
				</div>
				<ActionSelectionRight />
			</div>
		</transition>
	</div>
</template>

<style scoped>
#middleArea {
	width: 100%;
	text-align: center;
	min-height: 500px;
}

.fadeGameBoard-enter-active,
.fadeGameBoard-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeGameBoard-enter-from,
.fadeGameBoard-leave-to {
	opacity: 0;
}

#gameBoard {
	position: relative;
	float: left;
	padding: 0px;
	border: 3px solid black;
	border-radius: 25px;
}

#gameBoardAndActions {
	position: relative;
	display: inline-block;
	margin: 0 auto;
	padding: 0px;
}

#gameBoardImg {
	width: 100%;
	height: 100%;
	border: 0px solid black;
	border-radius: 25px;
}

.rightActionSelection {
	border-radius: 25px 0 0 25px !important;
}

/* Repeats */
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

.currentPlayerGlow {
	box-shadow: 0px 0px 10px 5px lightgreen;
	z-index: 20;
}

.timestoneGoneDiv {
	content: "";
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: grey;
	opacity: 0.7;
	border-radius: 100%;
}
</style>
