<script setup>
import * as view from "../js/RNBview.js"
import * as rf from "../js/RNBreference.js"
import * as model from "../js/RNBmodel.js"
//import * as funcs from "../js/RNBfuncs.js"
import * as controller from "../js/RNBcontroller.js"
import * as loc from "../js/RNBlocation.js"
import * as wonder from "../js/RNBwonder.js"
import * as util from "../js/RNButil.js"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

const props = defineProps({
	minimiseInfoForMainScreen: {
		type: Boolean, // Changed from Array to Number
		required: false,
		default: false,
	},
})

import { computed, ref } from "vue"

const hoveredResearch = ref(-1)
const longPressedResearch = ref(-1)
const longPressTimer = ref(null)

function onResearchMouseEnter(idx) {
	hoveredResearch.value = idx
}

function onResearchMouseLeave() {
	hoveredResearch.value = -1
}

function onResearchTouchStart(idx) {
	longPressTimer.value = setTimeout(() => {
		longPressedResearch.value = idx
	}, 500)
}

function onResearchTouchEnd() {
	if (longPressTimer.value) {
		clearTimeout(longPressTimer.value)
		longPressTimer.value = null
	}
	longPressedResearch.value = -1
}

function getPlayerNameClass(playerIndex) {
	if (playerIndex === store.gameflow.turnOrder[0]) return "activePLayer"
	if (controller.isSimulPhase() && store.gameflow.turnOrder.includes(playerIndex)) return "activePLayer"
	if (controller.isMainPhaseAndPseudoSimul() && store.gameflow.turnOrder.includes(playerIndex)) return "canMovePLayer"

	return ""
}

const playerResources = computed(() => {
	const allTransporters = model.getAllInGameTransporters()
	const allResources = model.getAllInGameResources()

	const result = {}
	for (const playerIndex of store.gameflow.fullTurnOrder) {
		const myTransporterIDs = allTransporters.filter((t) => t.ownerIndex === playerIndex).map((t) => t.id)

		result[playerIndex] = allResources.filter((r) => loc.isOnSelectedTransporterIDs(r.location, myTransporterIDs)).map((r) => r.gfx)
	}
	return result
})

const playerTransportCounts = computed(() => {
	const allTransporters = model.getAllInGameTransporters()

	const result = {}
	for (const playerIndex of store.gameflow.fullTurnOrder) {
		const landCount = allTransporters.filter((t) => t.ownerIndex === playerIndex && rf.LAND_TRANSPORTERS.includes(t.type)).length
		const seaCount = allTransporters.filter((t) => t.ownerIndex === playerIndex && rf.WATER_TRANSPORTERS.includes(t.type)).length
		result[playerIndex] = { land: landCount, sea: seaCount, total: landCount + seaCount }
	}
	return result
})

const getFullTurnOrderArray = computed(() => {
	if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
		if (!store.gameflow.wonderPrayingOrder.includes(-1)) return store.gameflow.wonderPrayingOrder
		return store.gameflow.turnOrder
	}
	// Fill -1 placeholders (leftover from an incomplete praying order) with the missing players,
	// keeping the existing players in their positions so the table always shows everyone
	const fto = store.gameflow.fullTurnOrder
	if (fto.includes(-1)) {
		const result = [...fto]
		for (let i = 0; i < store.players.length; i++) {
			if (!result.includes(i)) result[result.indexOf(-1)] = i
		}
		return result
	}
	return fto
})

</script>

<template>
	<div id="container">
		<div id="topAreaContainerDiv">
			<div id="playerTableDiv">
				<table id="playerTable">
					<thead>
						<tr>
							<th rowspan="2"><b>Player</b></th>
							<th colspan="3"><b>Wealth Points</b></th>
							<th v-if="!props.minimiseInfoForMainScreen" colspan="3" style="text-align: center">
								<b>Transports</b>
							</th>
							<th rowspan="2" v-for="idx in util.indexArray(store.gameOptions.useFundamentalResearch ? 8 : 7)" :key="idx">
								<div class="researchOptionDivHeader">
									<img
										:src="view.getImage(`research_${idx}`)"
										class="researchOptionImg"
										:title="rf.RND_STRINGS[idx]"
										@mouseenter="onResearchMouseEnter(idx)"
										@mouseleave="onResearchMouseLeave"
										@touchstart="onResearchTouchStart(idx)"
										@touchend="onResearchTouchEnd"
										@touchcancel="onResearchTouchEnd"
										@contextmenu.prevent
									/>
									<div v-if="hoveredResearch === idx || longPressedResearch === idx" class="researchTooltip">
										{{ rf.RND_STRINGS[idx] }}
									</div>
								</div>
							</th>
							<th v-if="!props.minimiseInfoForMainScreen" rowspan="2"><b>Held Goods</b></th>
						</tr>
						<tr>
							<th style="text-align: center">Goods</th>
							<th style="text-align: center">Wonder</th>
							<th style="text-align: center">Total</th>
							<template v-if="!props.minimiseInfoForMainScreen">
								<!-- These are the sub-headers for Transports -->
								<th style="text-align: center">Land</th>
								<th style="text-align: center">Sea</th>
								<th style="text-align: center">Total</th>
							</template>
						</tr>
					</thead>
					<template v-for="(playerIndex, idx) in getFullTurnOrderArray" :key="idx">
						<tr v-if="playerIndex !== -1">
							<!-- Player Name -->
							<td :class="getPlayerNameClass(playerIndex)">
								<span class="mainEntryPlayer turnOrderSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">
									{{ store.players[playerIndex].displayName }}
								</span>
							</td>

							<!-- Wealth Points -->
							<td>{{ wonder.getHeldResourcesScore(playerIndex) }}</td>
							<td>{{ wonder.getPlayerWonderPoints(playerIndex) }}</td>
							<td>{{ wonder.getHeldResourcesScore(playerIndex) + wonder.getPlayerWonderPoints(playerIndex) }}</td>

							<!-- TRANSPORTERS-->
							<td v-if="!minimiseInfoForMainScreen">{{ playerTransportCounts[playerIndex]?.land ?? 0 }}</td>
							<td v-if="!minimiseInfoForMainScreen">{{ playerTransportCounts[playerIndex]?.sea ?? 0 }}</td>
							<td v-if="!minimiseInfoForMainScreen">{{ playerTransportCounts[playerIndex]?.total ?? 0 }}</td>

							<!-- RESEARCH COLUMN: Only renders on the first row (idx === 0) -->
							<!-- Rowspan is total players (multiplied by 2 if you have sub-rows) -->
							<td v-for="RND_IDX in util.indexArray(store.gameOptions.useFundamentalResearch ? 8 : 7)" :key="RND_IDX">
								<img v-if="store.players[playerIndex].RnD[RND_IDX] === 1" :src="view.getImage(`gem_${personal.getCorrectedColour(store.players[playerIndex].colour)}`)" class="researchGem" />
								<span v-else>-</span>
							</td>
							<!-- Held Goods -->
							<td v-if="!props.minimiseInfoForMainScreen">
								<img v-for="(img, idx) in playerResources[playerIndex] ?? []" :key="idx" class="heldResImg" :src="view.getImage(img)" />
								<span v-if="!playerResources[playerIndex] || playerResources[playerIndex].length === 0">None</span>
							</td>
						</tr>
					</template>
				</table>
			</div>
			<div id="infoDiv">
				<!-- Leftover from IND. Keep as required -->
			</div>
		</div>
	</div>
	<p v-if="minimiseInfoForMainScreen">
		<b>
			<template v-if="store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE">
				<span class="currentPhaseGlow">0) Setup</span>
				►
			</template>
			<span :class="{ currentPhaseGlow: rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) || rf.PHASE_CONFLICT_PRODUCTIONS.includes(store.gameflow.phase) }">
				1) Production
				<span v-if="store.gameflow.phase === rf.PHASE_CONFLICT_PRODUCTION_DECISION">(Conflict Decision)</span>
				<span v-else-if="store.gameflow.phase === rf.PHASE_CONFLICT_PRODUCTION_PRAYING">(Conflict Praying)</span>
				<span v-else-if="store.gameflow.phase === rf.PHASE_CONFLICT_PRODUCTION_TURN_ORDER">(Conflict Turn Order)</span>
			</span>
			►
			<span :class="{ currentPhaseGlow: rf.PHASE_MOVEMENTS.includes(store.gameflow.phase) || rf.PHASE_CONFLICT_MOVEMENTS.includes(store.gameflow.phase) }">
				2) Movement
				<span v-if="store.gameflow.phase === rf.PHASE_CONFLICT_MOVEMENT_DECISION">(Conflict Decision)</span>
				<span v-else-if="store.gameflow.phase === rf.PHASE_CONFLICT_MOVEMENT_PRAYING">(Conflict Praying)</span>
				<span v-else-if="store.gameflow.phase === rf.PHASE_CONFLICT_MOVEMENT_TURN_ORDER">(Conflict Turn Order)</span>
			</span>
			►
			<span :class="{ currentPhaseGlow: rf.PHASE_BUILDINGS.includes(store.gameflow.phase) || rf.PHASE_CONFLICT_BUILDINGS.includes(store.gameflow.phase) }">
				3) Building
				<span v-if="store.gameflow.phase === rf.PHASE_CONFLICT_BUILDING_DECISION">(Conflict Decision)</span>
				<span v-else-if="store.gameflow.phase === rf.PHASE_CONFLICT_BUILDING_PRAYING">(Conflict Praying)</span>
				<span v-else-if="store.gameflow.phase === rf.PHASE_CONFLICT_BUILDING_TURN_ORDER">(Conflict Turn Order)</span>
			</span>
			►
			<span :class="{ currentPhaseGlow: rf.PHASE_WONDERS.includes(store.gameflow.phase) || rf.PHASE_CONFLICT_WONDERS.includes(store.gameflow.phase) }">
				4) Wonder
				<span v-if="store.gameflow.phase === rf.PHASE_CONFLICT_WONDER_DECISION">(Conflict Decision)</span>
				<span v-else-if="store.gameflow.phase === rf.PHASE_CONFLICT_WONDER_PRAYING">(Conflict Praying)</span>
				<span v-else-if="store.gameflow.phase === rf.PHASE_CONFLICT_WONDER_TURN_ORDER">(Conflict Turn Order)</span>
			</span>
		</b>
		<label v-if="personal.pov >= 0 && personal.trainingGame && !personal.soloGame" class="skipPhaseLabel">
			<input type="checkbox" v-model="store.trainingGameSkipConflictPhase" class="skipPhaseCheckbox" />
			Skip Conflict Phase
		</label>
	</p>
</template>

<style scoped>
#container {
	display: flex;
	justify-content: center;
	/* Center the flex container horizontally */
	min-width: 1000px;
	/* Minimum total width */
}

#topAreaContainerDiv {
	display: flex;
	min-width: fit-content;
	/* Minimum total width */
	margin: auto;
}

#playerTableDiv {
	min-width: 700px;
	/* Fixed width for the left div */
	width: fit-content;
}

#infoDiv {
	/*flex: 1; /* Take up the remaining space */
	width: 0px;
	background-color: lightcoral;
}

.heldResImg {
	width: 20px;
	height: 20px;
	border: 1px solid black;
	margin-right: 2px;
}

.researchBoardDiv {
	width: 420px;
	height: 60px;
	border: 2px solid white;
	position: relative;
}

.researchBoardImg {
	width: 100%;
	height: 100%;
}

.researchCompleteDiv {
	position: absolute;
	width: 45px;
	opacity: 0.5;
}

#playerTable {
	border-collapse: collapse;
	min-width: 600px;
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

.canMovePLayer {
	background-color: rgba(144, 238, 144, 0.5) !important;
}

.passedPlayer {
	background-color: orange !important;
}

.lightGreenBackground {
	background-color: yellow;
}

.redText {
	color: red;
}

.currentPhaseGlow {
	background-color: lightgreen;
}

.skipPhaseLabel {
	display: inline-block;
	align-items: center;
	gap: 10px;
	cursor: pointer;
	font-family: sans-serif;
}

.skipPhaseCheckbox {
	width: 20px;
	height: 20px;
	/* Directly changes the "check" color */
	accent-color: #42b883;
}

.researchOptionDivHeader {
	display: inline-block;
	width: fit-content;
	height: fit-content;
	margin-right: 4px;
	vertical-align: top;
	position: relative;
}

.researchTooltip {
	position: absolute;
	bottom: calc(100% + 4px);
	left: 50%;
	transform: translateX(-50%);
	background-color: rgba(0, 0, 0, 0.85);
	color: white;
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 12px;
	white-space: nowrap;
	pointer-events: none;
	z-index: 100;
}

.researchOptionImg {
	width: 43px;
	margin-top: 0px;
	vertical-align: top;
}

.researchGem {
	width: 21px;
	height: 21px;
}

.turnOrderSpan {
	display: inline-block;
	padding: 5px;
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
