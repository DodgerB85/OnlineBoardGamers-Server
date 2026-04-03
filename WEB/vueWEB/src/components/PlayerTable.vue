<script setup>
import * as view from "../js/WEBview.js"
import * as rf from "../js/WEBreference.js"
import * as model from "../js/WEBmodel.js"
//import * as funcs from "../js/WEBfuncs.js"
import * as controller from "../js/WEBcontroller.js"
import * as map from "../js/WEBmap.js"
import * as cb from "../js/WEBcables"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

function getStoredTileDivWidth(playerIndex, tileID) {
	if (personal.canPlay() && controller.currentPlayerIndex() === playerIndex && store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE) {
		if (rf.ALL_RECT_TILES.includes(tileID)) return 101
		return 140
	}
	return 100
}

function clickedNewTileOption(playerIndex, tileIDarr) {
	if (controller.currentPlayerIndex() !== playerIndex) return
	if (store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE) {
		store.context.selectedTileIDtoPlaceArr = JSON.parse(JSON.stringify(tileIDarr))
		map.setNewTileOptions()
	}
}
function rotateNewTile(playerIndex, tileIDarr, dir) {
	if (controller.currentPlayerIndex() !== playerIndex) return
	if (store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE) {
		if (dir === 1) tileIDarr[1] = (tileIDarr[1] + 1) % 4
		else tileIDarr[1] = (tileIDarr[1] + 3) % 4
		store.context.selectedTileIDtoPlaceArr = JSON.parse(JSON.stringify(tileIDarr))
		map.setNewTileOptions()
	}
}

function clickedCurrentCable(playerIndex) {
	if (!personal.canPlay()) return
  if (controller.currentPlayerIndex() !== playerIndex) return
	if (store.context.action !== rf.ACT_CHOOSE_ACTION) return
	if (store.context.remainingActions <= 0) return
	store.context.action = rf.ACT_PLACE_CABLE
	cb.highlightSquaresToPlaceCable()
}

const computedScore = computed(() => {
	let scores = []
	for (let i = 0; i < store.players.length; i++) {
    let score = cb.getScore(i)

		scores.push(score)
	}
	return scores
})

function shouldShowActionNumber(playerIndex) {
  //alert(`playerIndex: ${playerIndex} pov: ${personal.pov} gameEnded: ${store.gameEnded} trainingGame: ${personal.trainingGame}`)
  //alert(store.players[0].displayName)
  //playerIndex === personal.pov || store.gameEnded === true || personal.trainingGame === true
  if (playerIndex === personal.pov || store.gameEnded === true || personal.trainingGame === true) return true
  return false
}
</script>

<template>
	<div id="container">
		<div id="playerTableDiv">
			<table id="playerTable">
				<thead>
					<tr>
						<th><b>Player</b></th>
						<th><b>Score</b></th>
						<th><b>Cables (Stored)</b></th>
						<th><b>Tiles</b></th>
					</tr>
				</thead>
				<tr v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">
					<!-- Player -->
					<td :class="controller.currentPlayerIndex() === playerIndex ? 'activePLayer' : ''">
						<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
					</td>
					<!-- Score -->
					<td>
						{{ computedScore[playerIndex] }}
            <span v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && store.players[playerIndex].tileIDarrays.length > 0">(-{{ store.players[playerIndex].tileIDarrays.length }})</span>
					</td>
					<!-- Cables -->
					<td>
						<div class="cableContainer">
							<div
								v-for="i in store.players[playerIndex].currentCables"
								:key="i"
								@click="clickedCurrentCable(playerIndex)"
								class="currentCableDiv"
								:class="personal.canPlay() && controller.currentPlayerIndex() === playerIndex && store.context.action === rf.ACT_CHOOSE_ACTION && store.context.remainingActions > 0 ? 'selectableCable' : ''"
								:style="{
									backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
								}"></div>
							<div class="storedCables">
								({{ store.players[playerIndex].storedCables }})
								<template v-if="personal.canPlay() && controller.currentPlayerIndex() === playerIndex && store.context.action === rf.ACT_CHOOSE_ACTION && store.context.remainingActions > 0 && controller.currentPlayerObj().storedCables > 0">
									<br />
									<button class="actionsLineButton" @click="model.addCablesToPlayer(controller.currentPlayerIndex())">
										Add
										<br />
										Cables
									</button>
								</template>
							</div>
						</div>
					</td>
					<!-- Tiles -->
					<td>
						<div
							class="tileAndRotationButtonsDiv"
							v-for="tileIDarr in store.players[playerIndex].tileIDarrays"
							:key="tileIDarr[0]"
							:style="{
								width: getStoredTileDivWidth(playerIndex, tileIDarr[0]) + 'px',
								border: personal.canPlay() && controller.currentPlayerIndex() === playerIndex && store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE ? '1px solid black' : 'none',
							}">
							<div class="tileRotateDiv leftRotatePos" v-if="1==2 && personal.canPlay() && controller.currentPlayerIndex() === playerIndex && store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE">
								<img @click="rotateNewTile(playerIndex, tileIDarr, -1)" :src="view.getImage('rot_anticlockwise')" />
							</div>
							<div class="actionsNumberDiv" v-if="shouldShowActionNumber(playerIndex)">
								<img :src="view.getImage('actions_' + model.getActionsForTileID(tileIDarr[0]))" />
							</div>
							<div class="singleTileDiv">
								<svg class="singleTileSVG" xmlns="http://www.w3.org/2000/svg" :viewBox="rf.ALL_RECT_TILES.includes(tileIDarr[0]) ? '0 0 50 100' : '0 0 100 100'">
									<polygon @click="clickedNewTileOption(playerIndex, tileIDarr)" class="singleTilePolygon" :class="[personal.canPlay() && controller.currentPlayerIndex() === playerIndex && store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE ? 'selectableTile' : '', { selectedTile: store.context.selectedTileIDtoPlaceArr[0] === tileIDarr[0] }]" x="0" y="0" :transform="view.getRotateString(tileIDarr[0], tileIDarr[1], 0, 0, 50)" :points="view.getPolygonPointsFromTileID(tileIDarr[0], tileIDarr[1], 0, 0, 50)" :fill="view.getTilePatternFromID(tileIDarr[0])" />
                  <rect class="anchorSquareHighlight" x="0" y="0" width="50" height="50"  />
                </svg>
							</div>
							<div class="tileRotateDiv rightRotatePos" v-if="1==2 && personal.canPlay() && controller.currentPlayerIndex() === playerIndex && store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE">
								<img @click="rotateNewTile(playerIndex, tileIDarr, 1)" :src="view.getImage('rot_clockwise')" />
							</div>
						</div>
					</td>
				</tr>
			</table>
		</div>
	</div>
</template>

<style scoped>
#container {
	display: flex;
	justify-content: center; /* Center the flex container horizontally */
	min-width: fit-content; /* Minimum total width */
}

#playerTableDiv {
	/*min-width: 700px; /* Fixed width for the left div */
	width: fit-content;
}

#playerTable {
	border-collapse: collapse;
	min-width: fit-content;
	margin: auto;
}

#playerTable td,
#playerTable th {
	border: 1px solid #ddd;
	padding: 5px;
}

#playerTable tr {
	cursor: pointer;
	text-align: center;
}

#playerTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

#playerTable tr:nth-child(odd) {
	background-color: white;
}

#playerTable tr:hover {
	background-color: #ddd;
}

#playerTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

.activePLayer {
	background-color: lightgreen !important;
}
.tileAndRotationButtonsDiv {
	display: inline-block;
	position: relative;
	margin-right: 5px;
}

.singleTileDiv {
	height: 75px;
}

.singleTileSVG {
	width: 100%;
	height: 100%;
}

.singleTilePolygon {
	stroke: black;
	stroke-width: 1px;
}

.selectableTile {
	cursor: pointer;
	stroke: yellow;
	stroke-width: 5px;
}

.selectableTile:hover {
	stroke: lightgreen;
}

.selectedTile {
	stroke: lightgreen !important;
	stroke-width: 5px !important;
}

.actionsNumberDiv {
	position: absolute;
	top: 0px;
	left: 0px;
	z-index: 100;
	width: 30px;
	height: 30px;
	border: 1px solid black;
	box-sizing: border-box;
	overflow: hidden;
}

.actionsNumberDiv img {
	width: 100%;
	height: 100%;
}

.tileRotateDiv {
	position: absolute;
	bottom: 0px;
	z-index: 100;
	width: 30px;
	height: 30px;
	border: 1px solid black;
	border-radius: 10px;
	box-sizing: border-box;
	overflow: hidden;
}

.tileRotateDiv:hover {
	border: yellow;
}

.leftRotatePos {
	left: 0px;
}

.rightRotatePos {
	right: 0px;
}

.cableContainer {
	display: flex;
	align-items: center;
}

.currentCableDiv {
	width: 15px;
	height: 75px;
	display: inline-block;
	border: 1px solid black;
	margin-right: 5px;
}

.selectableCable {
	cursor: pointer;
	border: 3px solid yellow;
}
.selectableCable:hover {
	border: 3px solid lightgreen;
}

.anchorSquareHighlight {
  stroke:none;
  fill: none;
  fill-opacity: 0.3;
  stroke-width: 5px;
}
</style>
