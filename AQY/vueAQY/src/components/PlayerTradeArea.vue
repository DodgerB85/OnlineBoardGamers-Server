<script setup>
/*import * as history from '../js/TGZhistory'
import * as model from '../js/TGZmodel'*/

import * as rf from "../js/AQYreference"
import * as view from "../js/AQYview"
import * as IO from "../backend/AQY_IO"

import ResourceTable from "./ResourceTable.vue"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

defineProps({
	playerIndexProp: {
		type: Number,
		required: true,
		default: 0,
		prop: "playerIndexProp", // Specify the name of the prop in the parent component
	},
})

import { ref, computed } from "vue"

const confirmTradeBoo = ref(false)

const actingPlayerIndex = computed(() => personal.actingPlayerIndex())

const yourSelectedPromisePhase = ref(0)
const opponentsSelectedPromisePhase = ref(0)

/*const filteredPlayers = computed(() => {
	return store.players.filter((player, idx) => idx !== personal.pov)
})*/

const filteredPlayers = computed(() => {
	return store.players.map((player, idx) => ({ originalIndex: idx, displayName: player.displayName })).filter(({ originalIndex }) => originalIndex !== actingPlayerIndex.value)
})
function cancelTrade() {
	store.clearVars()
}
function resetTrade() {
	store.context.setupPlayerTrade.yourResources.splice(0)
	store.context.setupPlayerTrade.opponentsResources.splice(0)
	//store.context.setupPlayerTrade.selectedOpponent = -1
	store.context.setupPlayerTrade.yourPromise = ""
	store.context.setupPlayerTrade.opponentsPromise = ""
	confirmTradeBoo.value = false
}

function confirmTrade() {
	confirmTradeBoo.value = true
}

function localProposeTrade() {
	let yourResources = [...store.context.setupPlayerTrade.yourResources]
	let opponentsResources = [...store.context.setupPlayerTrade.opponentsResources]
	let yourPromise = store.context.setupPlayerTrade.yourPromise
	let opponentsPromise = store.context.setupPlayerTrade.opponentsPromise
	let selectedOpponent = store.context.setupPlayerTrade.selectedOpponent

	IO.sendProposeTrade(selectedOpponent, yourResources, opponentsResources, [yourPromise, yourSelectedPromisePhase.value], [opponentsPromise, opponentsSelectedPromisePhase.value])
	confirmTradeBoo.value = false
}

function localRejectTrade(entry) {
	IO.rejectTrade(entry)
}

function localAcceptTrade(entry) {
	IO.acceptTrade(entry)
}

function unableToAffordTrade(entry) {
	let availableResourcesCopy = [...store.players[actingPlayerIndex.value].availableResources]

	for (let i = 0; i < entry[4].length; i++) {
		availableResourcesCopy[entry[4][i]] -= 1
	}
	for (let i = 0; i < availableResourcesCopy.length; i++) {
		if (availableResourcesCopy[i] < 0) return true
	}

	return false
}
</script>

<template>
	<div class="wholeTradeDiv" v-if="store.context.action === rf.ACT_SETUP_PLAYER_TRADE">
		<template v-if="!confirmTradeBoo">
			<span class="cautionSpan">{{ $t("playerTradeArea.negotiateInChat") }}</span>
			<br />
			<span class="cautionSpan">{{ $t("playerTradeArea.unnegotiatedRejected") }}</span>

			<div class="playerBoxes">
				<div class="playerBox">
					<b><u>{{ $t("playerTradeArea.yourTrade") }}</u></b>
					<br />
					<br />
					<br />
					<ResourceTable :playerIndexProp="actingPlayerIndex" class="" />
					<br />
					{{ $t("playerTradeArea.resourcesToTrade") }}
					<img v-for="(res, idx) in store.context.setupPlayerTrade.yourResources" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
					<br />
					<!--
					<label>
						<input type="checkbox" v-model="addYourPromise" />
						Tick to add Promise
					</label>-->
					<div>
						<textarea v-model="store.context.setupPlayerTrade.yourPromise" :placeholder="$t('playerTradeArea.promisePlaceholder')" class="promiseTextArea"></textarea>
						<br />
						{{ $t("playerTradeArea.addPhaseToYourPromise") }}
						<select v-model="yourSelectedPromisePhase" class="phaseSelect">
							<option :value="0">{{ $t("playerTradeArea.phaseNone") }}</option>
							<option :value="2">{{ $t("playerTradeArea.phaseCityBuilding") }}</option>
							<option :value="3">{{ $t("playerTradeArea.phaseTurnOrder") }}</option>
							<option :value="4">{{ $t("playerTradeArea.phaseCountrysideBuilding") }}</option>
							<option :value="5">{{ $t("playerTradeArea.phaseStoreGoods") }}</option>
							<option :value="6">{{ $t("playerTradeArea.phaseHarvest") }}</option>
							<option :value="7">{{ $t("playerTradeArea.phaseExplore") }}</option>
							<option :value="8">{{ $t("playerTradeArea.phaseFamine") }}</option>
							<option :value="9">{{ $t("playerTradeArea.phasePollution") }}</option>
						</select>
					</div>
				</div>

				<div class="playerBox">
					<b><u>{{ $t("playerTradeArea.opponentsTrade") }}</u></b>
					<br />
					<template v-if="filteredPlayers.length > 1">
						{{ $t("playerTradeArea.selectOpponent") }}
						<select v-model="store.context.setupPlayerTrade.selectedOpponent">
							<option :value="-1">{{ $t("playerTradeArea.selectPlayer") }}</option>
							<option v-for="(player, idx) in filteredPlayers" :key="idx" :value="player.originalIndex">
								{{ player.displayName }}
							</option>
						</select>
					</template>
					<template v-else>{{ $t("playerTradeArea.selectedOpponent", { player: filteredPlayers[0].displayName }) }}</template>
					<br />
					<br />
					<template v-if="store.context.setupPlayerTrade.selectedOpponent !== -1 && !store.gameflow.turnOrder.includes(store.context.setupPlayerTrade.selectedOpponent)">
						<span class="cautionSpan">{{ $t("playerTradeArea.opponentEndedTurn", { player: store.players[store.context.setupPlayerTrade.selectedOpponent].displayName }) }}</span>
						<br />
						<br />
					</template>
					<template v-if="store.context.setupPlayerTrade.selectedOpponent !== -1">
						<ResourceTable :playerIndexProp="store.context.setupPlayerTrade.selectedOpponent" class="" />
						<br />
						{{ $t("playerTradeArea.resourcesToTrade") }}
						<img v-for="(res, idx) in store.context.setupPlayerTrade.opponentsResources" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<br />
						<!--
					<label>
						<input type="checkbox" v-model="addOpponentsPromise" />
						Tick to add Promise
					</label>-->
						<div>
							<textarea v-model="store.context.setupPlayerTrade.opponentsPromise" :placeholder="$t('playerTradeArea.promisePlaceholder')" class="promiseTextArea"></textarea>
							<br />
							{{ $t("playerTradeArea.addPhaseToTheirPromise") }}
							<select v-model="opponentsSelectedPromisePhase" class="phaseSelect">
								<option :value="0">{{ $t("playerTradeArea.phaseNone") }}</option>
								<option :value="2">{{ $t("playerTradeArea.phaseCityBuilding") }}</option>
								<option :value="3">{{ $t("playerTradeArea.phaseTurnOrder") }}</option>
								<option :value="4">{{ $t("playerTradeArea.phaseCountrysideBuilding") }}</option>
								<option :value="5">{{ $t("playerTradeArea.phaseStoreGoods") }}</option>
								<option :value="6">{{ $t("playerTradeArea.phaseHarvest") }}</option>
								<option :value="7">{{ $t("playerTradeArea.phaseExplore") }}</option>
								<option :value="8">{{ $t("playerTradeArea.phaseFamine") }}</option>
								<option :value="9">{{ $t("playerTradeArea.phasePollution") }}</option>
							</select>
						</div>
					</template>
				</div>
			</div>
			<button @click="cancelTrade" class="actionsLineButton">{{ $t("playerTradeArea.cancelTrade") }}</button>
			<button @click="resetTrade" class="actionsLineButton">{{ $t("playerTradeArea.resetTrade") }}</button>
			<button v-if="store.context.setupPlayerTrade.selectedOpponent !== -1" @click="confirmTrade" class="actionsLineButton">{{ $t("playerTradeArea.confirmTrade") }}</button>
		</template>

		<!-- TRADE CONFIRMATION -->
		<template v-if="confirmTradeBoo">
			<div class="playerBoxes">
				<div class="playerBox">
					<b><u>{{ $t("playerTradeArea.yourTrade") }}</u></b>
					<br />
					<br />
					{{ $t("playerTradeArea.resourcesToTrade") }}
					<img v-for="(res, idx) in store.context.setupPlayerTrade.yourResources" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
					<br />

					<div v-if="store.context.setupPlayerTrade.yourPromise !== ''">
						<br />
						{{ $t("playerTradeArea.promisePhase") }}: {{ rf.PHASE_STRINGS[yourSelectedPromisePhase] }}
						<br />
						<br />
						{{ $t("playerTradeArea.promise") }}:
						<br />
						{{ store.context.setupPlayerTrade.yourPromise }}
					</div>
				</div>

				<div class="playerBox">
					<b><u>{{ $t("playerTradeArea.opponentsTrade") }}</u></b>
					<br />
					{{ $t("playerTradeArea.selectedOpponent", { player: store.players[store.context.setupPlayerTrade.selectedOpponent].displayName }) }}
					<br />
					{{ $t("playerTradeArea.resourcesToTrade") }}
					<img v-for="(res, idx) in store.context.setupPlayerTrade.opponentsResources" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
					<br />

					<div v-if="store.context.setupPlayerTrade.opponentsPromise !== ''">
						<br />
						{{ $t("playerTradeArea.promisePhase") }}: {{ rf.PHASE_STRINGS[opponentsSelectedPromisePhase] }}
						<br />
						<br />
						{{ $t("playerTradeArea.promise") }}:
						<br />
						{{ store.context.setupPlayerTrade.opponentsPromise }}
					</div>
				</div>
			</div>
			<span class="cautionSpan">{{ $t("playerTradeArea.cautionAcceptedTrade") }}</span>
			<br />
			<span class="cautionSpan">{{ $t("playerTradeArea.cautionResetTurn") }}</span>
			<br />

			<button @click="cancelTrade" class="actionsLineButton">{{ $t("playerTradeArea.cancelTrade") }}</button>
			<button @click="resetTrade" class="actionsLineButton">{{ $t("playerTradeArea.resetTrade") }}</button>
			<button @click="localProposeTrade" class="actionsLineButton">{{ $t("playerTradeArea.proposeTrade") }}</button>
		</template>
	</div>

	<!-- INCOMING TRADES -->
	<template v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING && personal.canPlay() && store.context.relevantIncomingTrades.length > 0">
		<div class="wholeTradeDiv">
			<h2>{{ $t("playerTradeArea.incomingTrades") }}</h2>
			<div v-for="(entry, idx) in store.context.relevantIncomingTrades" :key="idx" class="incomingTradeDiv">
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].displayName }}</span>
				</div>
				{{ $t("playerTradeArea.tradeSuffix") }}
				<br />
				<div class="incomingPlayerBoxes">
					<div class="incomingPlayerBox">
						{{ $t("playerTradeArea.youWillReceive") }}
						<br />
						<img v-for="(res, idx) in entry[2]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<template v-if="entry[3][0] !== ''">
							<br />
							{{ $t("playerTradeArea.promise") }}:
							<br />
							{{ entry[3][0] }}
							<br />
							<br />
							{{ $t("playerTradeArea.nominalPhase") }}: {{ rf.PHASE_STRINGS[entry[3][1]] }}
						</template>
					</div>
					<div class="incomingPlayerBox">
						{{ $t("playerTradeArea.youWillGive") }}
						<br />
						<img v-for="(res, idx) in entry[4]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<template v-if="entry[5][0] !== ''">
							<br />
							{{ $t("playerTradeArea.promise") }}:
							<br />
							{{ entry[5][0] }}
							<br />
							<br />
							{{ $t("playerTradeArea.nominalPhase") }}: {{ rf.PHASE_STRINGS[entry[5][1]] }}
						</template>
					</div>
				</div>
				<span class="cautionSpan">{{ $t("playerTradeArea.cautionAcceptIncomingTrade") }}</span>
				<br />
				<span class="cautionSpan">{{ $t("playerTradeArea.cautionResetTurn") }}</span>
				<br />
				<span class="warningSpan" v-if="unableToAffordTrade(entry)">{{ $t("playerTradeArea.cannotAffordTrade") }}</span>
				<br />
				<button @click="localRejectTrade(entry)" class="actionsLineButton">{{ $t("playerTradeArea.rejectTrade") }}</button>
				<button v-if="!unableToAffordTrade(entry)" @click="localAcceptTrade(entry)" class="actionsLineButton">{{ $t("playerTradeArea.acceptTrade") }}</button>
			</div>
		</div>
	</template>

	<!-- OUTGOING TRADES -->
	<template v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING && personal.canPlay() && store.context.relevantOutgoingTrades.length > 0">
		<div class="wholeTradeDiv">
			<h2>{{ $t("playerTradeArea.outgoingTrades") }}</h2>
			<div v-for="(entry, idx) in store.context.relevantOutgoingTrades" :key="idx" class="incomingTradeDiv">
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				</div>
				{{ $t("playerTradeArea.tradeSuffix") }}
				<br />
				<div class="incomingPlayerBoxes">
					<div class="incomingPlayerBox">
						{{ $t("playerTradeArea.youWillReceive") }}
						<br />
						<img v-for="(res, idx) in entry[4]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<template v-if="entry[5][0] !== ''">
							<br />
							{{ $t("playerTradeArea.promise") }}:
							<br />
							{{ entry[5][0] }}
							<br />
							<br />
							{{ $t("playerTradeArea.nominalPhase") }}: {{ rf.PHASE_STRINGS[entry[5][1]] }}
						</template>
					</div>
					<div class="incomingPlayerBox">
						{{ $t("playerTradeArea.youWillGive") }}
						<br />
						<img v-for="(res, idx) in entry[2]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<template v-if="entry[3][0] !== ''">
							<br />
							{{ $t("playerTradeArea.promise") }}:
							<br />
							{{ entry[3][0] }}
							<br />
							<br />
							{{ $t("playerTradeArea.nominalPhase") }}: {{ rf.PHASE_STRINGS[entry[3][1]] }}
						</template>
					</div>
				</div>
			</div>
		</div>
	</template>
</template>

<style scoped>
.wholeTradeDiv {
	font-weight: bolder;
	background-color: aliceblue;
}

.playerScoreSummaryDiv {
	border: 1px solid black;
	display: inline-block;
	margin: 4px;
	padding: 0px;
	vertical-align: middle;
}

.incomingTradeDiv {
	width: fit-content;
	margin: auto;
	min-width: 500px;
	border: 2px solid black;
	padding: 5px;
	margin-bottom: 5px;
}

.incomingPlayerBoxes {
	width: fit-content;
	display: flex;
}

.incomingPlayerBox {
	min-width: 500px;
	width: fit-content;
	border: 2px solid black;
	margin: 5px;
	padding: 5px;
}

.playerBoxes {
	width: fit-content;
	display: flex;
	margin: auto;
}

.playerBox {
	min-width: 500px;
	width: fit-content;
	border: 2px solid black;
	margin: 5px;
	padding: 5px;
}

.tradingRes {
	border: 1px solid black;
	width: 50px;
	height: 50px;
	vertical-align: middle;
	border: 1px solid black;
}

.promiseTextArea {
	width: 90%;
	height: 100px;
}

.phaseSelect {
	font-weight: bold;
}

.cautionSpan {
	font-size: 20px;
	font-weight: bolder;
	color: darkorange;
}

.warningSpan {
	font-size: 20px;
	font-weight: bolder;
	color: red;
}
</style>
