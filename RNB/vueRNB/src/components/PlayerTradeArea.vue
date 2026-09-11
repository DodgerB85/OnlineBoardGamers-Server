<script setup>
import * as rf from "../js/RNBreference"
import * as model from "../js/RNBmodel"
import * as view from "../js/RNBview"
import * as highlight from "../js/RNBhighlight"
import * as IO from "../backend/RNB_IO"
import * as funcs from "../js/RNBfuncs"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"
import { computed, ref } from "vue"

const store = useModelStore()
const personal = usePersonalStore()

const showTradePanel = ref(false)
const tradeOpponentIdx = ref(-1)
const tradeYourResIDs = ref([])
const tradeTheirResIDs = ref([])
const tradeConfirmStep = ref(false)

const isTradeEnabled = computed(() => {
	return rf.PHASE_WONDERS.includes(store.gameflow.phase) && !personal.soloGame && store.gameOptions.useTrade
})

const isTrainingMode = computed(() => personal.trainingGame && !personal.soloGame)

const hasEndedTurn = computed(() => {
	return rf.MAIN_PHASES.includes(store.gameflow.phase) && !store.gameflow.turnOrder.includes(personal.pov)
})

const eligibleOpponents = computed(() => {
	return store.players
		.map((player, idx) => ({ idx, name: player.displayName || player.name }))
		.filter((p) => p.idx !== personal.pov)
})

const yourResIDsOnHomeTile = computed(() => {
	if (personal.pov < 0) return []
	const homeMarker = store.ALL_HOME_MARKERS.find((m) => m.ownerIndex === personal.pov)
	if (!homeMarker) return []
	const hexID = homeMarker.location[1]
	return store.ALL_RESOURCES.filter((r) => r.location[0] === rf.LOCATION_BUCKET && r.location[1] === hexID).map((r) => r.id)
})

const theirResIDsOnHomeTile = computed(() => {
	if (tradeOpponentIdx.value < 0) return []
	const homeMarker = store.ALL_HOME_MARKERS.find((m) => m.ownerIndex === tradeOpponentIdx.value)
	if (!homeMarker) return []
	const hexID = homeMarker.location[1]
	return store.ALL_RESOURCES.filter((r) => r.location[0] === rf.LOCATION_BUCKET && r.location[1] === hexID).map((r) => r.id)
})

const opponentHasTransporter = computed(() => {
	if (tradeOpponentIdx.value < 0) return false
	const homeMarker = store.ALL_HOME_MARKERS.find((m) => m.ownerIndex === tradeOpponentIdx.value)
	if (!homeMarker) return false
	const hexID = homeMarker.location[1]
	return model.getTransportersByPlayerIndexAndHexID(tradeOpponentIdx.value, hexID).length > 0
})

const canPropose = computed(() => {
	return tradeOpponentIdx.value >= 0 && (tradeYourResIDs.value.length > 0 || tradeTheirResIDs.value.length > 0) && opponentHasTransporter.value && store.context.tradeRelevantOutgoing.length < rf.MAX_PLAYER_TRADES
})

const incomingCount = computed(() => store.context.tradeRelevantIncoming.length)

function playerColorClass(playerIndex) {
	return "mainEntryPlayer mainEntryPlayer" + personal.getCorrectedColour(store.players[playerIndex].colour)
}

function playerColorHex(playerIndex) {
	return personal.getCorrectedColourHex(store.players[playerIndex].colour)
}

function toggleTradePanel() {
	showTradePanel.value = !showTradePanel.value
	if (!showTradePanel.value) resetTradeForm()
}

function resetTradeForm() {
	tradeOpponentIdx.value = -1
	tradeYourResIDs.value = []
	tradeTheirResIDs.value = []
	tradeConfirmStep.value = false
}

function toggleYourRes(resID) {
	const idx = tradeYourResIDs.value.indexOf(resID)
	if (idx >= 0) tradeYourResIDs.value.splice(idx, 1)
	else tradeYourResIDs.value.push(resID)
}

function toggleTheirRes(resID) {
	const idx = tradeTheirResIDs.value.indexOf(resID)
	if (idx >= 0) tradeTheirResIDs.value.splice(idx, 1)
	else tradeTheirResIDs.value.push(resID)
}

function proposeTrade() {
	if (!canPropose.value) return
	tradeConfirmStep.value = true
}

function confirmPropose() {
	IO.proposeTrade(tradeOpponentIdx.value, [...tradeYourResIDs.value], [...tradeTheirResIDs.value])
	resetTradeForm()
}

function completeTradeLocal() {
	if (!canPropose.value) return
	// In training mode, swap resources instantly in the local store.
	// POV is the proposer; tradeOpponentIdx is the other player.
	const proposerIdx = personal.pov
	const targetIdx = tradeOpponentIdx.value
	const proposerHomeMarker = store.ALL_HOME_MARKERS.find((m) => m.ownerIndex === proposerIdx)
	const targetHomeMarker = store.ALL_HOME_MARKERS.find((m) => m.ownerIndex === targetIdx)
	if (proposerHomeMarker && targetHomeMarker) {
		const proposerHex = proposerHomeMarker.location[1]
		const targetHex = targetHomeMarker.location[1]
		for (const rid of tradeYourResIDs.value) {
			if (store.ALL_RESOURCES[rid]) store.ALL_RESOURCES[rid].location = [rf.LOCATION_BUCKET, targetHex, 0]
		}
		for (const rid of tradeTheirResIDs.value) {
			if (store.ALL_RESOURCES[rid]) store.ALL_RESOURCES[rid].location = [rf.LOCATION_BUCKET, proposerHex, 0]
		}
	}
	resetTradeForm()
	// Clear cached wonder resource lists so they recompute from the new locations
	store.context.resIDsOnHomeTile.splice(0)
	store.context.resIDsInWonderBrick.splice(0)
	store.context.wonderError = 0
	highlight.updateAllHighlightsForTransporterMode()
}

function cancelPropose() {
	tradeConfirmStep.value = false
}

function localAcceptTrade(entry) {
	IO.acceptTrade(entry)
}

function localRejectTrade(entry) {
	IO.rejectTrade(entry)
}

function localCancelTrade(entry) {
	IO.cancelTrade(entry)
}

function resName(resID) {
	const res = store.ALL_RESOURCES[resID]
	if (!res) return "???"
	return view.getImage(res.gfx)
}
</script>

<template>
	<div v-if="isTradeEnabled" class="tradeAreaContainer">
		<div class="tradeButtonRow">
			<button class="actionsLineButton" @click="toggleTradePanel">
				Trade {{ showTradePanel ? "▲" : "▼" }}
				<span v-if="incomingCount > 0" class="tradeNotification">{{ incomingCount }}</span>
			</button>
		</div>

		<div class="tradePanelWrap" :class="{ tradePanelOpen: showTradePanel }">
			<div class="tradePanelInner">
				<!-- INCOMING TRADES -->
				<div v-if="store.context.tradeRelevantIncoming.length > 0" class="tradeSection">
					<strong>Incoming Trades:</strong>
					<div v-for="(entry, idx) in store.context.tradeRelevantIncoming" :key="idx" class="tradeEntry">
						<span :class="playerColorClass(entry[0])">{{ store.players[entry[0]].displayName }}</span>
						offers:
						<span class="tradeResList">
							<img v-for="resID in entry[2]" :key="resID" class="tradeResImg" :src="resName(resID)" />
						</span>
						to
						<span :class="playerColorClass(entry[1])">{{ store.players[entry[1]].displayName }}</span>
						for:
						<span class="tradeResList">
							<img v-for="resID in entry[3]" :key="resID" class="tradeResImg" :src="resName(resID)" />
						</span>
						<br />
						<button class="actionsLineButton" @click="localAcceptTrade(entry)">Accept</button>
						<button class="actionsLineButton" @click="localRejectTrade(entry)">Reject</button>
					</div>
				</div>

				<!-- OUTGOING TRADES -->
				<div v-if="store.context.tradeRelevantOutgoing.length > 0" class="tradeSection">
					<strong>Your Pending Trades:</strong>
					<div v-for="(entry, idx) in store.context.tradeRelevantOutgoing" :key="idx" class="tradeEntry">
						<span :class="playerColorClass(entry[0])">{{ store.players[entry[0]].displayName }}</span>
						offers:
						<span class="tradeResList">
							<img v-for="resID in entry[2]" :key="resID" class="tradeResImg" :src="resName(resID)" />
						</span>
						to
						<span :class="playerColorClass(entry[1])">{{ store.players[entry[1]].displayName }}</span>
						for:
						<span class="tradeResList">
							<img v-for="resID in entry[3]" :key="resID" class="tradeResImg" :src="resName(resID)" />
						</span>
						<br />
						<button class="actionsLineButton" @click="localCancelTrade(entry)">Cancel</button>
					</div>
				</div>

				<!-- TRADE SETUP -->
				<div v-if="!tradeConfirmStep && (!hasEndedTurn || isTrainingMode)" class="tradeSection">
					<strong>Propose a Trade:</strong>
					<br />
					<span>Opponent:</span>
					<select v-model="tradeOpponentIdx">
						<option :value="-1">-- Choose --</option>
						<option v-for="opponent in eligibleOpponents" :key="opponent.idx" :value="opponent.idx" :style="{ backgroundColor: playerColorHex(opponent.idx), color: 'white' }">
							{{ opponent.name }}
						</option>
					</select>

					<div v-if="tradeOpponentIdx >= 0">
						<div v-if="!opponentHasTransporter" class="donkeyWarningSpan">Opponent has no transporter on their home tile</div>

						<div class="tradeGoodsSection">
							<strong>Your goods:</strong>
							<span v-if="yourResIDsOnHomeTile.length === 0" class="donkeyWarningSpan">No goods on your home tile</span>
							<div class="tradeResPicker">
								<img v-for="resID in yourResIDsOnHomeTile" :key="resID" class="tradeResImg tradeResSelectable" :class="{ tradeResSelected: tradeYourResIDs.includes(resID) }" :src="resName(resID)" @click="toggleYourRes(resID)" />
							</div>
						</div>

						<div class="tradeGoodsSection">
							<strong>
								<span :class="playerColorClass(tradeOpponentIdx)">{{ store.players[tradeOpponentIdx].displayName }}</span>
								's goods:
							</strong>
							<div class="tradeResPicker">
								<img v-for="resID in theirResIDsOnHomeTile" :key="resID" class="tradeResImg tradeResSelectable" :class="{ tradeResSelected: tradeTheirResIDs.includes(resID) }" :src="resName(resID)" @click="toggleTheirRes(resID)" />
							</div>
						</div>

						<button v-if="isTrainingMode" class="actionsLineButton" :disabled="!canPropose" @click="completeTradeLocal">Complete Trade</button>
						<button v-else class="actionsLineButton" :disabled="!canPropose" @click="proposeTrade">Propose Trade</button>
					</div>
				</div>

				<!-- ENDED TURN - cannot propose -->
				<div v-if="!tradeConfirmStep && hasEndedTurn && !isTrainingMode" class="tradeSection">
					<span class="donkeyWarningSpan">You may not propose a trade once you have ended your turn</span>
				</div>

				<!-- CONFIRM TRADE -->
				<div v-if="tradeConfirmStep && !isTrainingMode" class="tradeSection">
					<strong>Confirm Trade:</strong>
					<br />
					<span>You give:</span>
					<span class="tradeResList">
						<img v-for="resID in tradeYourResIDs" :key="resID" class="tradeResImg" :src="resName(resID)" />
					</span>
					<br />
					<span>You receive:</span>
					<span class="tradeResList">
						<img v-for="resID in tradeTheirResIDs" :key="resID" class="tradeResImg" :src="resName(resID)" />
					</span>
					<br />
					<button class="actionsLineButton" @click="confirmPropose">Confirm</button>
					<button class="actionsLineButton" @click="cancelPropose">Back</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.tradeAreaContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.tradeButtonRow {
	display: flex;
	justify-content: center;
}
.tradeNotification {
	background-color: red;
	color: white;
	border-radius: 50%;
	padding: 1px 5px;
	font-size: 10px;
	margin-left: 3px;
}
.tradePanelWrap {
	max-height: 0;
	overflow: hidden;
	transition: max-height 0.3s ease-in-out;
	width: 100%;
}
.tradePanelWrap.tradePanelOpen {
	max-height: 500px;
}
.tradePanelInner {
	background-color: #d4eafd;
	border: 1px solid #555;
	padding: 8px;
	border-radius: 4px;
	margin-top: 4px;
}
.tradeSection {
	margin-bottom: 8px;
	padding-bottom: 5px;
	border-bottom: 1px solid #444;
}
.tradeEntry {
	margin-bottom: 5px;
}
.tradeResList {
	display: inline;
	vertical-align: middle;
}
.tradeResImg {
	width: 30px;
	height: 30px;
	vertical-align: middle;
	margin: 1px;
}
.tradeResSelectable {
	cursor: pointer;
	border: 2px solid transparent;
	border-radius: 3px;
}
.tradeResSelectable:hover {
	border-color: #888;
}
.tradeResSelected {
	border-color: #4caf50;
	border-width: 4px;
	background-color: rgba(76, 175, 80, 0.2);
}
.tradeGoodsSection {
	margin: 5px 0;
}
.donkeyWarningSpan {
	color: #f44336;
	font-size: 12px;
}
</style>
