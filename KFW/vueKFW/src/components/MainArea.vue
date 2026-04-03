<script setup>
import * as IO from "../backend/KFW_IO"
import * as rf from "../js/KFWreference"
import * as controller from "../js/KFWcontroller"

import SupplyArea from "./SupplyArea.vue"
import PlayerItems from "./PlayerItems.vue"
import ActionArea from "./ActionArea.vue"
import PlayerVillage from "./PlayerVillage.vue"
import VillagesArea from "./VillagesArea.vue"
//import ReplayArea from "./ReplayArea.vue"
import DebugArea from "./DebugArea.vue"
import AvailableTile from "./AvailableTile.vue"
import FinalScoreTable from "./FinalScoreTable.vue"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

function getTrgGamePlayerItemsOrder() {
	let res = [...store.gameflow.fullTurnOrder]
	const index = store.gameflow.fullTurnOrder.indexOf(controller.currentPlayerIndex())

	;[res[0], res[index]] = [res[index], res[0]]

	return res
}

function getNormalPlayerItemsOrder() {
	let res = []
	if (personal.pov >= 0) res.push(personal.pov)
	for (let i = 0; i < store.players.length; i++) if (!res.includes(i)) res.push(i)
	return res
}

function getOrdinalForIdx1(idx1) {
	let num = 1
	for (let i = 0; i < idx1; i++) {
		for (let j = 0; j < store.context.finalPositions[i].length; j++) {
			num++
		}
	}
	if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
	else if (num === 5) return "5th"
	else if (num === 6) return "6th"
	return "Unknown"
}
</script>

<template>
	<div id="mainAreaLessHistory">
		<template v-if="store.gameflow.phase !== rf.PHASE_VILLAGE_EXPANDING && store.gameflow.phase !== rf.PRE_PHASE_VILLAGE_EXPANDING">
			<ActionArea />
			<div v-if="store.viewSettings.showLoader" class="fLoadingBar">
				<img src="@static/KFW/images/loading-bar-black.gif" />
			</div>
		</template>
		<div class="topContainer">
			<div class="leftCol">
				<SupplyArea />
				<template v-if="!personal.trainingGame && !personal.adminDataInspection">
					<PlayerItems v-for="(playerIdx, idx) in getNormalPlayerItemsOrder()" :key="idx" :playerIndexProp="playerIdx" />
				</template>
				<template v-else-if="personal.trainingGame === true || personal.adminDataInspection === true">
					<PlayerItems v-for="(playerIdx, idx) in getTrgGamePlayerItemsOrder()" :key="idx" :playerIndexProp="playerIdx" />
				</template>
			</div>
			<div
				class="rightCol"
				:style="{
					width: store.gameflow.phase === rf.PHASE_FINAL_SCORING || store.gameflow.phase === rf.PHASE_GAME_OVER ? '675px' : 'fit-content',
				}">
				<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
					<!-- THIS IS THE MAIN AREA FOR GAME OVER -->
					<div id="gameEndDiv">
						Game Over
						<template v-if="store.context.finalPositions[0].includes(personal.pov)">
							<h1>Congratulations!</h1>
						</template>
						<template v-else>
							<br />
							<br />
						</template>
						<template v-if="store.context.finalPositions[0].length === 1">
							Winner:
							<span
								class="mainEntryPlayer"
								:style="{
									backgroundColor: personal.getCorrectedColourHex(store.players[store.context.finalPositions[0][0]].colour),
									color: personal.getCorrectedColourText(store.players[store.context.finalPositions[0][0]].colour),
								}">
								{{ store.players[store.context.finalPositions[0][0]].displayName }}
								({{ store.players[store.context.finalPositions[0][0]].finalScore }})
							</span>
							<br />
						</template>
						<template v-if="store.context.finalPositions[0].length > 1">
							Winners:
							<span
								v-for="(playerIndex, idx) in store.context.finalPositions[0]"
								:key="idx"
								class="mainEntryPlayer"
								:style="{
									backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
									color: personal.getCorrectedColourText(store.players[playerIndex].colour),
								}">
								{{ store.players[playerIndex].displayName }}
								({{ store.players[playerIndex].finalScore }})
							</span>
							<br />
						</template>
						<template v-for="(entry, idx1) in store.context.finalPositions.slice(1)" :key="idx1">
							{{ getOrdinalForIdx1(idx1 + 1) }}:
							<span
								v-for="(playerIndex, idx2) in entry"
								:key="idx2"
								class="mainEntryPlayer"
								:style="{
									backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
									color: personal.getCorrectedColourText(store.players[playerIndex].colour),
								}">
								{{ store.players[playerIndex].displayName }}
								({{ store.players[playerIndex].finalScore }})
							</span>
							<br />
						</template>
						<br />
						Fancy a
						<a :href="'/createKFWpage/' + String(personal.gameID) + '/'">rematch</a>
						?
						<br />
						<br />
						<div id="finalScoreTableDiv">
							<table id="finalScoreTableTable">
								<thead>
									<tr>
										<th></th>
										<th v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">
											<span
												class="mainEntryPlayer"
												:style="{
													backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
													color: personal.getCorrectedColourText(store.players[playerIndex].colour),
												}">
												{{ store.players[playerIndex].displayName }}
											</span>
										</th>
									</tr>
								</thead>
								<tbody>
									<template v-if="store.players.some((player) => player.goldScore > 0)">
										<tr>
											<td>Gold Score</td>
											<td v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">{{ store.players[playerIndex].goldScore }}</td>
										</tr>
									</template>
									<template v-if="store.players.some((player) => player.requireItmesScore > 0)">
										<tr>
											<td>Item set Score</td>
											<td v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">{{ store.players[playerIndex].requireItmesScore }}</td>
										</tr>
									</template>
									<template v-if="store.players.some((player) => player.contractScore > 0)">
										<tr>
											<td>Contract Score</td>
											<td v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">{{ store.players[playerIndex].contractScore }}</td>
										</tr>
									</template>
									<template v-if="store.players.some((player) => player.manualScoreScore > 0)">
										<tr>
											<td>Manually Scoring Tiles</td>
											<td v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">{{ store.players[playerIndex].manualScoreScore }}</td>
										</tr>
									</template>
									<template v-if="store.players.some((player) => player.autoScoreScore > 0)">
										<tr>
											<td>Auto Scoring Tiles</td>
											<td v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">{{ store.players[playerIndex].autoScoreScore }}</td>
										</tr>
									</template>
									<tr>
										<td class="totalTD">Total</td>
										<td v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx" class="totalTD">{{ store.players[playerIndex].finalScore }}</td>
									</tr>
								</tbody>
							</table>
						</div>
						<br />
						<br />
						<template v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">
							<span
								class="mainEntryPlayer"
								:style="{
									backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
									color: personal.getCorrectedColourText(store.players[playerIndex].colour),
								}">
								{{ store.players[playerIndex].displayName }}
								({{ store.players[playerIndex].finalScore }})
							</span>
							<FinalScoreTable :playerIndexProp="playerIndex" />
							<PlayerVillage :playerIndexProp="playerIndex" />
						</template>
					</div>
				</template>
				<template v-else>
					<!-- Boat Tiles-->
					<div v-for="(boatTile, idx) in store.availableBoatTiles" :key="idx" class="availableTilesDiv">
						<AvailableTile :tileProp="boatTile" :innerIndex="boatTile.seasonsIndex.findIndex((subArray) => subArray.includes(store.gameflow.season))" />
					</div>
					<!-- Turn Order Tiles-->
					<div v-for="(turnOrderTile, idx) in store.availableTurnOrderTiles" :key="idx" class="availableTilesDiv">
						<AvailableTile :tileProp="turnOrderTile" :innerIndex="0" />
					</div>

					<br />

					<!-- Season Tiles -->
					<div v-for="(seasonTile, idx) in store.availableTiles" :key="idx" class="availableTilesDiv">
						<AvailableTile v-if="!rf.TILE_SUMMER_BOATS.includes(seasonTile.tileID[0])" :tileProp="seasonTile" :innerIndex="seasonTile.upgraded" />
						<AvailableTile v-else-if="rf.TILE_SUMMER_BOATS.includes(seasonTile.tileID[0])" :tileProp="seasonTile" :innerIndex="seasonTile.upgraded" />
					</div>

					<br />

					<!-- LOWER ACTION AREA-->
					<template v-if="store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING">
						<ActionArea />
						<div v-if="store.viewSettings.showLoader" class="fLoadingBar">
							<img src="@static/KFW/images/loading-bar-black.gif" />
						</div>
					</template>

					<!-- PHASE FINAL SCORING-->
					<template v-if="store.gameflow.phase === rf.PHASE_FINAL_SCORING && store.context.preFinalActions.length === 0">
						<FinalScoreTable :playerIndexProp="controller.currentPlayerIndex()" />
					</template>
				</template>

				<!-- VILLAGES -->
				<VillagesArea v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER" />
				<!--<ReplayArea v-if="store.viewSettings.replayAtBottom" />-->
				<template v-if="IO.DEBUG_USERS.includes(personal.name)">
					<DebugArea />
				</template>
			</div>
		</div>
	</div>
</template>

<style>
#mainAreaLessHistory {
	min-height: 100px;
	min-width: 1200px;

	margin: auto;
	width: fit-content;
}

.topContainer {
	display: flex;
	/*background-color: blueviolet;*/
	width: fit-content;
	margin: auto;
}

.leftCol {
	flex: 0 0 auto; /* This div does not grow or shrink */
	width: 185px; /* Set a fixed width for the left div */
	padding: 0px;
	margin-left: 10px;
	margin-top: 5px;
	/*background-color: aqua;*/
}

.rightCol {
	flex: 1; /* This div grows to take up the remaining space */
	padding: 0px;
	margin-top: 5px;
	/*background-color: red;*/
}

.availableTilesDiv {
	display: inline-block;
}

/** Game Over */
#gameEndDiv {
	font-weight: bolder;
	font-size: 30px;
}

#finalScoreDiv {
	min-width: 700px; /* Fixed width for the left div */
	width: fit-content;
	margin: auto;
	font-size: 15px;
}

#finalScoreTableTable {
	border-collapse: collapse;
	min-width: 600px;
	margin: auto;
}

#finalScoreTableTable td,
#finalScoreTableTable th {
	border: 1px solid #ddd;
	padding: 5px;
}

#finafinalScoreTableTablelScore tr {
	cursor: pointer;
	text-align: center;
}

#finalScoreTableTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

#finalScoreTableTable tr:nth-child(odd) {
	background-color: white;
}

#finalScoreTableTable tr:hover {
	background-color: #ddd;
}

#finalScoreTableTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

.totalTD {
	font-weight: bolder;
	background-color: lightgreen;
}
</style>
