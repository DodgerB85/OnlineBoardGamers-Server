<script setup>
import * as rf from "../js/RNBreference"
import * as model from "../js/RNBmodel"
import * as view from "../js/RNBview"
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
	return rf.PHASE_WONDERS.includes(store.gameflow.phase) && !personal.soloGame && !personal.trainingGame && store.gameOptions.useTrade
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
	return store.ALL_RESOURCES.filter((r) => r.location[0] === rf.LOCATION_BUCKET && r.location[1] === hexID && r.location[0] !== rf.LOCATION_OOB).map((r) => r.id)
})

const theirResIDsOnHomeTile = computed(() => {
	if (tradeOpponentIdx.value < 0) return []
	const homeMarker = store.ALL_HOME_MARKERS.find((m) => m.ownerIndex === tradeOpponentIdx.value)
	if (!homeMarker) return []
	const hexID = homeMarker.location[1]
	return store.ALL_RESOURCES.filter((r) => r.location[0] === rf.LOCATION_BUCKET && r.location[1] === hexID && r.location[0] !== rf.LOCATION_OOB).map((r) => r.id)
})

const opponentHasTransporter = computed(() => {
	if (tradeOpponentIdx.value < 0) return false
	const homeMarker = store.ALL_HOME_MARKERS.find((m) => m.ownerIndex === tradeOpponentIdx.value)
	if (!homeMarker) return false
	const hexID = homeMarker.location[1]
	return model.getTransportersByPlayerIndexAndHexID(tradeOpponentIdx.value, hexID).length > 0
})

const canPropose = computed(() => {
	return tradeOpponentIdx.value >= 0 && tradeYourResIDs.value.length > 0 && tradeTheirResIDs.value.length > 0 && opponentHasTransporter.value && store.context.tradeRelevantOutgoing.length < rf.MAX_PLAYER_TRADES
})

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
		<button class="actionsLineButton tradeToggleButton" @click="toggleTradePanel" :class="{ tradeToggleButtonActive: showTradePanel }">
			Trade
			<span v-if="store.context.tradeRelevantIncoming.length > 0" class="tradeNotification">{{ store.context.tradeRelevantIncoming.length }}</span>
		</button>

		<div v-if="showTradePanel" class="tradePanel">
			<!-- INCOMING TRADES -->
			<div v-if="store.context.tradeRelevantIncoming.length > 0" class="tradeSection">
				<strong>Incoming Trades:</strong>
				<div v-for="(entry, idx) in store.context.tradeRelevantIncoming" :key="idx" class="tradeEntry">
					<span>{{ store.players[entry[0]].displayName || store.players[entry[0]].name }} offers:</span>
					<span class="tradeResList">
						<img v-for="resID in entry[2]" :key="resID" class="tradeResImg" :src="resName(resID)" />
					</span>
					<span>for your:</span>
					<span class="tradeResList">
						<img v-for="resID in entry[3]" :key="resID" class="tradeResImg" :src="resName(resID)" />
					</span>
					<br />
					<button class="tradeSmallButton tradeAcceptButton" @click="localAcceptTrade(entry)">Accept</button>
					<button class="tradeSmallButton tradeRejectButton" @click="localRejectTrade(entry)">Reject</button>
				</div>
			</div>

			<!-- OUTGOING TRADES -->
			<div v-if="store.context.tradeRelevantOutgoing.length > 0" class="tradeSection">
				<strong>Your Pending Trades:</strong>
				<div v-for="(entry, idx) in store.context.tradeRelevantOutgoing" :key="idx" class="tradeEntry">
					<span>You offer:</span>
					<span class="tradeResList">
						<img v-for="resID in entry[2]" :key="resID" class="tradeResImg" :src="resName(resID)" />
					</span>
					<span>to {{ store.players[entry[1]].displayName || store.players[entry[1]].name }} for:</span>
					<span class="tradeResList">
						<img v-for="resID in entry[3]" :key="resID" class="tradeResImg" :src="resName(resID)" />
					</span>
					<br />
					<button class="tradeSmallButton tradeCancelButton" @click="localCancelTrade(entry)">Cancel</button>
				</div>
			</div>

			<!-- TRADE SETUP -->
			<div v-if="!tradeConfirmStep" class="tradeSection">
				<strong>Propose a Trade:</strong>
				<br />
				<span>Opponent:</span>
				<select v-model="tradeOpponentIdx" class="tradeSelect">
					<option :value="-1">-- Choose --</option>
					<option v-for="opponent in eligibleOpponents" :key="opponent.idx" :value="opponent.idx">
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
						<strong>{{ store.players[tradeOpponentIdx].displayName || store.players[tradeOpponentIdx].name }}'s goods:</strong>
						<div class="tradeResPicker">
							<img v-for="resID in theirResIDsOnHomeTile" :key="resID" class="tradeResImg tradeResSelectable" :class="{ tradeResSelected: tradeTheirResIDs.includes(resID) }" :src="resName(resID)" @click="toggleTheirRes(resID)" />
						</div>
					</div>

					<button class="actionsLineButton" :disabled="!canPropose" @click="proposeTrade">Propose Trade</button>
				</div>
			</div>

			<!-- CONFIRM TRADE -->
			<div v-if="tradeConfirmStep" class="tradeSection">
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
				<button class="actionsLineButton tradeAcceptButton" @click="confirmPropose">Confirm</button>
				<button class="actionsLineButton" @click="cancelPropose">Back</button>
			</div>

			<button class="actionsLineButton" @click="toggleTradePanel" style="margin-top: 5px">Close</button>
		</div>
	</div>
</template>

<style scoped>
.tradeAreaContainer {
	position: relative;
	display: inline-block;
}
.tradeToggleButton {
	position: relative;
}
.tradeToggleButtonActive {
	background-color: #c9a84c;
}
.tradeNotification {
	background-color: red;
	color: white;
	border-radius: 50%;
	padding: 1px 5px;
	font-size: 10px;
	margin-left: 3px;
}
.tradePanel {
	position: absolute;
	left: 0;
	bottom: 35px;
	background-color: #2c2c2c;
	border: 1px solid #555;
	padding: 8px;
	min-width: 350px;
	z-index: 100;
	border-radius: 4px;
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
	width: 20px;
	height: 20px;
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
	background-color: rgba(76, 175, 80, 0.2);
}
.tradeSelect {
	background-color: #3c3c3c;
	color: white;
	border: 1px solid #666;
	padding: 3px;
	margin: 3px 0;
}
.tradeSmallButton {
	padding: 2px 8px;
	font-size: 11px;
	margin: 2px;
}
.tradeAcceptButton {
	background-color: #2e7d32;
	color: white;
	border: 1px solid #4caf50;
}
.tradeRejectButton {
	background-color: #c62828;
	color: white;
	border: 1px solid #f44336;
}
.tradeCancelButton {
	background-color: #555;
	color: white;
	border: 1px solid #777;
}
.tradeGoodsSection {
	margin: 5px 0;
}
.donkeyWarningSpan {
	color: #f44336;
	font-size: 12px;
}
</style>
