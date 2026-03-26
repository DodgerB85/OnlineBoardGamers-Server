<script setup>
import * as constants from '../constants'

import * as view from "../js/BUSview.js"

import { useModelStore } from "../stores/model.js";
const model = useModelStore()
import scoreDiv from './scoreDiv.vue'
import BuildingsDivs from './BuildingsDivs.vue'
import LinesDivs from './LinesDivs.vue'
import ActionSelectionRight from './ActionSelectionRight.vue'
import { usePersonalStore } from "../stores/personal.js";
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

function getBoardImgSrc() {
  if (personal.selectedBoard === 0) return view.getImage('Board_20A')
  if (personal.selectedBoard === 1) return view.getImage('Board_origV2')
  if (personal.selectedBoard === 2) return view.getImage('Board_20AC')
}

function getBoardWidth() {
  if (personal.selectedBoard === 0) return 800
  if (personal.selectedBoard === 1) return 817
  if (personal.selectedBoard === 2) return 1035
}

function getWholeBoardMinWidth() {
  if (personal.selectedBoard === 0) return (model.refSize * (getBoardWidth() + 279 + 8) / 100)
  if (personal.selectedBoard === 1) return (model.refSize * (getBoardWidth() + 279 + 9) / 100)
  if (personal.selectedBoard === 1) return (model.refSize * (getBoardWidth() + 0 + 9) / 100)
}

// Repeats

function highlight(e, entering) {
  if (entering) {
    e.target.style['border-color'] = 'lightgreen'
    e.target.style['background-color'] = constants.getColourNameFromNumber(personal.getCorrectedColour(model.currentPlayer().colour))
  }
  else {
    /*e.target.style['border-color'] = 'darkgoldenrod'*/
    e.target.style['border-color'] = 'yellow'
    e.target.style['background-color'] = ''
  }
}
function clickedActionOption(action, index) {
  model.context.historyObj.push(action, index)
  model.currentPlayer().remainingActions--
  model.actionAreaData[action][index] = model.currentPlayer().colour
  model.context.actionChosen = true
}

function getPointerRotation() {
  if (model.desiredBuilding === 1) return [1815, 3336, -109]
  if (model.desiredBuilding === 2) return [1805, 3340, 11]
  if (model.desiredBuilding === 3) return [1814, 3350, 130]
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
      <div id="gameBoardAndActions" v-if="!model.performingBoardChange" :style="{
        'min-width': getWholeBoardMinWidth() + 'px',
      }">

        <div id="gameBoard" :style="{
          'width': model.refSize * getBoardWidth() / 100 + 'px',
          'height': model.refSize * 732 / 100 + 'px',
        }" :class="{ 'rightActionSelection': (model.topMenuViews.displayRightActionSelection) }">
          <img id="gameBoardImg" :src="getBoardImgSrc()"
            :class="{ 'rightActionSelection': (model.topMenuViews.displayRightActionSelection) }">>

          <scoreDiv />
          <BuildingsDivs v-if="personal.selectedBoard !==1"/>
          <LinesDivs />
          <BuildingsDivs v-if="personal.selectedBoard ===1"/>


          <!-- ACTIONS FOR ALL IN ONE BOARDS -->
          <template v-if="personal.selectedBoard === 2">
            <!-- ADD LINES -->
            <template v-for="(marker, index) in model.actionAreaData[0]" v-bind:key="index">
              <!-- Add a marker -->
              <div v-if="marker !== -1" class="actionDisc"
                :class="['actionDisc' + personal.getCorrectedColour(marker), { 'currentPlayerGlow': (model.gameflow.phase === constants.PHASE_LINE_EXPANSION && index === (6 - model.gameflow.turnOrder.length)) }]"
                :style="{
                  'width': model.refSize * 70 / 400 + 'px',
                  'height': model.refSize * 70 / 400 + 'px',
                  'top': model.refSize * 417 / 400 + 'px',
                  'left': model.refSize * (3296 + index * 86.8) / 400 + 'px',//3730
                  'border': model.refSize * 20 / 400 + 'px solid black'
                }">
              </div>
              <!-- Else IF action time, add a circle -->
              <div
                v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && (index === 5 || model.actionAreaData[0][index + 1] !== -1)"
                class="actionDiscOption" :style="{
                  'width': model.refSize * 70 / 400 + 'px',
                  'height': model.refSize * 70 / 400 + 'px',
                  'font-size': model.refSize * 70 / 500 + 'px',
                  'top': model.refSize * 417 / 400 + 'px',
                  'left': model.refSize * (3296 + index * 86.8) / 400 + 'px',//3730
                  'border': model.refSize * 20 / 400 + 'px solid yellow'
                }" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
                @click="clickedActionOption(0, index)">
                {{ computedReverseCharsLineExpansion[index] }}
              </div>
            </template>

            <!-- NEW BUS -->
            <!-- Add a marker -->
            <div v-if="model.actionAreaData[1][0] !== -1" class="actionDisc"
              :class="['actionDisc' + personal.getCorrectedColour(model.actionAreaData[1][0]), { 'currentPlayerGlow': (model.gameflow.phase === constants.PHASE_ADD_BUS) }]"
              :style="{
                'width': model.refSize * 70 / 400 + 'px',
                'height': model.refSize * 70 / 400 + 'px',
                'top': model.refSize * 615 / 400 + 'px',
                'left': model.refSize * 3933 / 400 + 'px',
                'border': model.refSize * 20 / 400 + 'px solid black'
              }">
            </div>
            <!-- Else IF action time, add a circle -->
            <div
              v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[1][0] === -1"
              class="actionDiscOption" :style="{
                'width': model.refSize * 70 / 400 + 'px',
                'height': model.refSize * 70 / 400 + 'px',
                'top': model.refSize * 615 / 400 + 'px',
                'left': model.refSize * 3933 / 400 + 'px',
                'border': model.refSize * 20 / 400 + 'px solid yellow'
              }" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
              @click="clickedActionOption(1, 0)">
            </div>

            <!-- ADD PAX -->
            <template v-for="(marker, index) in model.actionAreaData[2]" v-bind:key="index">
              <!-- Add a marker -->
              <div v-if="marker !== -1" class="actionDisc"
                :class="['actionDisc' + personal.getCorrectedColour(marker), { 'currentPlayerGlow': (model.gameflow.phase === constants.PHASE_ADD_PAX && index === model.gameflow.fullActionTurnOrder.length - model.gameflow.turnOrder.length) }]"
                :style="{
                  'width': model.refSize * 70 / 400 + 'px',
                  'height': model.refSize * 70 / 400 + 'px',
                  'top': model.refSize * 1248 / 400 + 'px',
                  'left': model.refSize * (3295 + index * 87.5) / 400 + 'px',
                  'border': model.refSize * 20 / 400 + 'px solid black'
                }">
              </div>
              <!-- Else IF action time, add a circle -->
              <div
                v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && ((index === 0 && model.actionAreaData[2][0] === -1) || (model.actionAreaData[2][index] === -1 && model.actionAreaData[2][index - 1] !== -1))"
                class="actionDiscOption" :style="{
                  'width': model.refSize * 70 / 400 + 'px',
                  'height': model.refSize * 70 / 400 + 'px',
                  'font-size': model.refSize * 70 / 500 + 'px',
                  'top': model.refSize * 1248 / 400 + 'px',
                  'left': model.refSize * (3295 + index * 87.5) / 400 + 'px',
                  'border': model.refSize * 20 / 400 + 'px solid yellow'
                }" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
                @click="clickedActionOption(2, index)">
                {{ computedForwardChars[index] }}
              </div>
            </template>

            <!-- ADD BUILDING -->
            <template v-for="(marker, index) in model.actionAreaData[3]" v-bind:key="index">
              <!-- Add a marker -->
              <div v-if="marker !== -1" class="actionDisc"
                :class="['actionDisc' + personal.getCorrectedColour(marker), { 'currentPlayerGlow': (model.gameflow.phase === constants.PHASE_ADD_BLDGS && index === (6 - model.gameflow.turnOrder.length)) }]"
                :style="{
                  'width': model.refSize * 70 / 400 + 'px',
                  'height': model.refSize * 70 / 400 + 'px',
                  'top': model.refSize * 1534 / 400 + 'px',
                  'left': model.refSize * (3296 + index * 87.4) / 400 + 'px',//3730
                  'border': model.refSize * 20 / 400 + 'px solid black'
                }">
              </div>
              <!-- Else IF action time, add a circle -->
              <div
                v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && (index === 5 || model.actionAreaData[3][index + 1] !== -1)"
                class="actionDiscOption" :style="{
                  'width': model.refSize * 70 / 400 + 'px',
                  'height': model.refSize * 70 / 400 + 'px',
                  'font-size': model.refSize * 70 / 500 + 'px',
                  'top': model.refSize * 1534 / 400 + 'px',
                  'left': model.refSize * (3296 + index * 87.4) / 400 + 'px',//3730
                  'border': model.refSize * 20 / 400 + 'px solid yellow'
                }" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
                @click="clickedActionOption(3, index)">
                {{ computedReverseChars[index] }}
              </div>
            </template>

            <!-- ALTER TIME -->
            <!-- Add a marker -->
            <div v-if="model.actionAreaData[4][0] !== -1" class="actionDisc"
              :class="['actionDisc' + personal.getCorrectedColour(model.actionAreaData[4][0]), { 'currentPlayerGlow': (model.gameflow.phase === constants.PHASE_ADD_BUS) }]"
              :style="{
                'width': model.refSize * 70 / 400 + 'px',
                'height': model.refSize * 70 / 400 + 'px',
                'top': model.refSize * 1731 / 400 + 'px',
                'left': model.refSize * 3937 / 400 + 'px',
                'border': model.refSize * 20 / 400 + 'px solid black'
              }">
            </div>
            <!-- Else IF action time, add a circle -->
            <div
              v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[4][0] === -1"
              class="actionDiscOption" :style="{
                'width': model.refSize * 70 / 400 + 'px',
                'height': model.refSize * 70 / 400 + 'px',
                'top': model.refSize * 1731 / 400 + 'px',
                'left': model.refSize * 3937 / 400 + 'px',
                'border': model.refSize * 20 / 400 + 'px solid yellow'
              }" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
              @click="clickedActionOption(4, 0)">
            </div>

            <!-- VROM -->
            <template v-for="(marker, index) in model.actionAreaData[5]" v-bind:key="index">
              <!-- Add a marker -->
              <div v-if="marker !== -1" class="actionDisc"
                :class="['actionDisc' + personal.getCorrectedColour(marker), { 'currentPlayerGlow': (model.gameflow.phase === constants.PHASE_VROM && index === model.gameflow.fullActionTurnOrder.length - model.gameflow.turnOrder.length) }]"
                :style="{
                  'width': model.refSize * 70 / 400 + 'px',
                  'height': model.refSize * 70 / 400 + 'px',
                  'top': model.refSize * 2526 / 400 + 'px',
                  'left': model.refSize * (3302 + index * 87) / 400 + 'px',
                  'border': model.refSize * 20 / 400 + 'px solid black'
                }">
              </div>
              <!-- Else IF action time, add a circle -->
              <div
                v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && ((index === 0 && model.actionAreaData[5][0] === -1) || (model.actionAreaData[5][index] === -1 && model.actionAreaData[5][index - 1] !== -1))"
                class="actionDiscOption" :style="{
                  'width': model.refSize * 70 / 400 + 'px',
                  'height': model.refSize * 70 / 400 + 'px',
                  'font-size': model.refSize * 70 / 500 + 'px',
                  'top': model.refSize * 2526 / 400 + 'px',
                  'left': model.refSize * (3302 + index * 87) / 400 + 'px',
                  'border': model.refSize * 20 / 400 + 'px solid yellow'
                }" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
                @click="clickedActionOption(5, index)">
                {{ model.currentPlayer().buses + (model.currentPlayer().colour === model.actionAreaData[1][0] ? 1 : 0)  }}
              </div>
            </template>

            <!-- STARTING PLAYER -->
            <!-- Add a marker -->
            <div v-if="model.actionAreaData[6][0] !== -1" class="actionDisc"
              :class="['actionDisc' + personal.getCorrectedColour(model.actionAreaData[6][0]), { 'currentPlayerGlow': (model.gameflow.phase === constants.PHASE_ADD_BUS) }]"
              :style="{
                'width': model.refSize * 70 / 400 + 'px',
                'height': model.refSize * 70 / 400 + 'px',
                'top': model.refSize * 2722 / 400 + 'px',
                'left': model.refSize * 3935 / 400 + 'px',
                'border': model.refSize * 20 / 400 + 'px solid black'
              }">
            </div>
            <!-- Else IF action time, add a circle -->
            <div
              v-else-if="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && personal.canPlay() && model.currentPlayer().remainingActions > 0 && !model.context.confirmEndTurn && !model.context.actionChosen && model.actionAreaData[6][0] === -1"
              class="actionDiscOption" :style="{
                'width': model.refSize * 70 / 400 + 'px',
                'height': model.refSize * 70 / 400 + 'px',
                'top': model.refSize * 2722 / 400 + 'px',
                'left': model.refSize * 3935 / 400 + 'px',
                'border': model.refSize * 20 / 400 + 'px solid yellow'
              }" @mouseover="highlight($event, true)" @mouseleave="highlight($event, false)"
              @click="clickedActionOption(6, 0)">
            </div>

            <!-- TIME STONES -->
            <div class="timestoneDiv" :style="{
              'width': model.refSize * 135 / 400 + 'px',
              'height': model.refSize * 135 / 400 + 'px',
              'top': model.refSize * 1885 / 400 + 'px',
              'left': model.refSize * 3735 / 400 + 'px',
            }">
              <img v-if="model.remainingTimeStones >= 1" :src="view.getImage('stone_blue')" class="timestoneImg" />
              <div v-else class="timestoneGoneDiv"></div>   
            </div>
            <div class="timestoneDiv" :style="{
              'width': model.refSize * 135 / 400 + 'px',
              'height': model.refSize * 135 / 400 + 'px',
              'top': model.refSize * 1923 / 400 + 'px',
              'left': model.refSize * 3906 / 400 + 'px',
            }">
              <img v-if="model.remainingTimeStones >= 2" :src="view.getImage('stone_green')" class="timestoneImg" />
              <div v-else class="timestoneGoneDiv"></div>   
            </div>
            <div class="timestoneDiv" :style="{
              'width': model.refSize * 135 / 400 + 'px',
              'height': model.refSize * 135 / 400 + 'px',
              'top': model.refSize * 2082 / 400 + 'px',
              'left': model.refSize * 3981 / 400 + 'px',
            }">
              <img v-if="model.remainingTimeStones >= 3" :src="view.getImage('stone_blue')" class="timestoneImg" />
              <div v-else class="timestoneGoneDiv"></div>   
            </div>
            <div class="timestoneDiv" :style="{
              'width': model.refSize * 135 / 400 + 'px',
              'height': model.refSize * 135 / 400 + 'px',
              'top': model.refSize * 2204 / 400 + 'px',
              'left': model.refSize * 3848 / 400 + 'px',
            }">
              <img v-if="model.remainingTimeStones >= 4" :src="view.getImage('stone_green')" class="timestoneImg" />
              <div v-else class="timestoneGoneDiv"></div>   
            </div>
            <div class="timestoneDiv" :style="{
              'width': model.refSize * 135 / 400 + 'px',
              'height': model.refSize * 135 / 400 + 'px',
              'top': model.refSize * 2168 / 400 + 'px',
              'left': model.refSize * 3676 / 400 + 'px',
            }">
              <img v-if="model.remainingTimeStones >= 5" :src="view.getImage('stone_blue')" class="timestoneImg" />
              <div v-else class="timestoneGoneDiv"></div>     
            </div>

            <!-- BUSES -->
            <template v-for="(player, index) in model.players" v-bind:key="index">
              <div v-for="i in player.buses" v-bind:key="i" class="busDiv" :style="{
                'width': model.refSize * 97.6 / 400 + 'px',
                'height': model.refSize * 56 / 400 + 'px',
                'top': model.refSize * (995 - (i - 1) * 62) / 400 + 'px',
                'left': model.refSize * (3320 + (getCorrectedBusIndex(personal.getCorrectedColour(player.colour))) * 152) / 400 + 'px',
              }">
                <img :src="view.getImage('bus' + String(personal.getCorrectedColour(player.colour)))" class="busImg" />
              </div>
            </template>

            <!-- Pointer -->
            <div class="pointerDiv" :style="{
              'width': model.refSize * 100 / 400 + 'px',
              'height': model.refSize * 400 / 400 + 'px',
              'top': model.refSize * getPointerRotation()[0] / 400 + 'px',
              'left': model.refSize * getPointerRotation()[1] / 400 + 'px',
              transform: 'rotate(' + getPointerRotation()[2] + 'deg)',
            }">
              <img :src="view.getImage('pointer')" class="pointerImg" alt="pointer" />
            </div>

            <!-- PHASE GLOW AREAS -->
            <div v-if="model.gameflow.phase === constants.PHASE_LINE_EXPANSION" class="currentPhaseGlow" :style="{
              'width': model.refSize * 260 / 400 + 'px',
              'height': model.refSize * 50 / 400 + 'px',
              'top': model.refSize * 355 / 400 + 'px',
              'left': model.refSize * 3300 / 400 + 'px',
            }">
            </div>
            <div v-if="model.gameflow.phase === constants.PHASE_ADD_PAX" class="currentPhaseGlow" :style="{
              'width': model.refSize * 230 / 400 + 'px',
              'height': model.refSize * 50 / 400 + 'px',
              'top': model.refSize * 1185 / 400 + 'px',
              'left': model.refSize * 3300 / 400 + 'px',
            }">
            </div>
            <div v-if="model.gameflow.phase === constants.PHASE_ADD_BLDGS" class="currentPhaseGlow" :style="{
              'width': model.refSize * 180 / 400 + 'px',
              'height': model.refSize * 50 / 400 + 'px',
              'top': model.refSize * 1470 / 400 + 'px',
              'left': model.refSize * 3300 / 400 + 'px',
            }">
            </div>
            <div v-if="model.gameflow.phase === constants.PHASE_ALTER_TIME" class="currentPhaseGlow" :style="{
              'width': model.refSize * 600 / 400 + 'px',
              'height': model.refSize * 600 / 400 + 'px',
              'top': model.refSize * 1710 / 400 + 'px',
              'left': model.refSize * 3085 / 400 + 'px',
              'border-radius': '100%',
            }">
            </div>
            <div v-if="model.gameflow.phase === constants.PHASE_VROM" class="currentPhaseGlow" :style="{
              'width': model.refSize * 225 / 400 + 'px',
              'height': model.refSize * 50 / 400 + 'px',
              'top': model.refSize * 2465 / 400 + 'px',
              'left': model.refSize * 3300 / 400 + 'px',
            }">
            </div>

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
  transition: opacity .5s ease-in-out;
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
  background-color: #3474A9;
}

.actionDisc1 {
  /*background-color: green;*/
  background-color: #456334;
}

.actionDisc2 {
  /*background-color: purple;*/
  background-color: #AA79AE;
}

.actionDisc3 {
  /*background-color: red;*/
  background-color: #A12529;
}

.actionDisc4 {
  /*background-color: yellow;*/
  background-color: #C28727;
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
