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

const props = defineProps({
	playerIndexProp: {
		type: Number,
		required: true,
		default: 0,
		prop: "playerIndexProp", // Specify the name of the prop in the parent component
	},
})

import { ref, computed } from "vue"

const confirmTradeBoo = ref(false)

const yourSelectedPromisePhase = ref(0)
const opponentsSelectedPromisePhase = ref(0)

/*const filteredPlayers = computed(() => {
	return store.players.filter((player, idx) => idx !== personal.pov)
})*/

const filteredPlayers = computed(() => {
	return store.players.map((player, idx) => ({ originalIndex: idx, displayName: player.displayName })).filter(({ originalIndex }) => originalIndex !== personal.pov)
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
	let availableResourcesCopy = [...store.players[props.playerIndexProp].availableResources]

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
			<span class="cautionSpan">Trade negotiations should be done in chat BEFORE submitting a trade</span>
			<br />
			<span class="cautionSpan">Trades submitted without negotiation will almost certainly be rejected</span>

			<div class="playerBoxes">
				<div class="playerBox">
					<b><u>Your Trade</u></b>
					<br />
					<br />
					<br />
					<ResourceTable :playerIndexProp="playerIndexProp" class="" />
					<br />
					Resources To Trade:
					<img v-for="(res, idx) in store.context.setupPlayerTrade.yourResources" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
					<br />
					<!--
					<label>
						<input type="checkbox" v-model="addYourPromise" />
						Tick to add Promise
					</label>-->
					<div>
						<textarea v-model="store.context.setupPlayerTrade.yourPromise" placeholder="Trade an optional promise here" class="promiseTextArea"></textarea>
						<br />
						Add a nominal Phase to your Promise:
						<select v-model="yourSelectedPromisePhase" class="phaseSelect">
							<option :value="0">None</option>
							<option :value="2">City Building</option>
							<option :value="3">Turn Order</option>
							<option :value="4">Countryside Building</option>
							<option :value="5">Store Goods</option>
							<option :value="6">Harvest</option>
							<option :value="7">Explore</option>
							<option :value="8">Famine</option>
							<option :value="9">Pollution</option>
						</select>
					</div>
				</div>

				<div class="playerBox">
					<b><u>Opponent's Trade</u></b>
					<br />
					<template v-if="filteredPlayers.length > 1">
						Select Opponent:
						<select v-model="store.context.setupPlayerTrade.selectedOpponent">
							<option :value="-1">Select Player</option>
							<option v-for="(player, idx) in filteredPlayers" :key="idx" :value="player.originalIndex">
								{{ player.displayName }}
							</option>
						</select>
					</template>
					<template v-else>Selected Opponent: {{ filteredPlayers[0].displayName }}</template>
					<br />
					<br />
					<template v-if="store.context.setupPlayerTrade.selectedOpponent !== -1 && !store.gameflow.turnOrder.includes(store.context.setupPlayerTrade.selectedOpponent)">
						<span class="cautionSpan">{{ store.players[store.context.setupPlayerTrade.selectedOpponent].displayName }} has ended their turn. You cannot trade with them</span>
						<br />
						<br />
					</template>
					<template v-if="store.context.setupPlayerTrade.selectedOpponent !== -1">
						<ResourceTable :playerIndexProp="store.context.setupPlayerTrade.selectedOpponent" class="" />
						<br />
						Resources To Trade:
						<img v-for="(res, idx) in store.context.setupPlayerTrade.opponentsResources" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<br />
						<!--
					<label>
						<input type="checkbox" v-model="addOpponentsPromise" />
						Tick to add Promise
					</label>-->
						<div>
							<textarea v-model="store.context.setupPlayerTrade.opponentsPromise" placeholder="Trade an optional promise here" class="promiseTextArea"></textarea>
							<br />
							Add a nominal Phase to their Promise:
							<select v-model="opponentsSelectedPromisePhase" class="phaseSelect">
								<option :value="0">None</option>
								<option :value="2">City Building</option>
								<option :value="3">Turn Order</option>
								<option :value="4">Countryside Building</option>
								<option :value="5">Store Goods</option>
								<option :value="6">Harvest</option>
								<option :value="7">Explore</option>
								<option :value="8">Famine</option>
								<option :value="9">Pollution</option>
							</select>
						</div>
					</template>
				</div>
			</div>
			<button @click="cancelTrade" class="actionsLineButton">Cancel Trade</button>
			<button @click="resetTrade" class="actionsLineButton">Reset Trade</button>
			<button v-if="store.context.setupPlayerTrade.selectedOpponent !== -1" @click="confirmTrade" class="actionsLineButton">Confirm Trade</button>
		</template>

		<!-- TRADE CONFIRMATION -->
		<template v-if="confirmTradeBoo">
			<div class="playerBoxes">
				<div class="playerBox">
					<b><u>Your Trade</u></b>
					<br />
					<br />
					Resources To Trade:
					<img v-for="(res, idx) in store.context.setupPlayerTrade.yourResources" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
					<br />

					<div v-if="store.context.setupPlayerTrade.yourPromise !== ''">
						<br />
						Promise Phase: {{ rf.PHASE_STRINGS[yourSelectedPromisePhase] }}
						<br />
						<br />
						Promise:
						<br />
						{{ store.context.setupPlayerTrade.yourPromise }}
					</div>
				</div>

				<div class="playerBox">
					<b><u>Opponent's Trade</u></b>
					<br />
					Selected Opponent: {{ store.players[store.context.setupPlayerTrade.selectedOpponent].displayName }}
					<br />
					Resources To Trade:
					<img v-for="(res, idx) in store.context.setupPlayerTrade.opponentsResources" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
					<br />

					<div v-if="store.context.setupPlayerTrade.opponentsPromise !== ''">
						<br />
						Promise Phase: {{ rf.PHASE_STRINGS[opponentsSelectedPromisePhase] }}
						<br />
						<br />
						Promise:
						<br />
						{{ store.context.setupPlayerTrade.opponentsPromise }}
					</div>
				</div>
			</div>
			<span class="cautionSpan">Caution: If the trade is accepted, your city actions will be locked up to this point in time</span>
			<br />
			<span class="cautionSpan">For maximum flexibility, reset your turn and perform just the necessary actions to trade</span>
			<br />

			<button @click="cancelTrade" class="actionsLineButton">Cancel Trade</button>
			<button @click="resetTrade" class="actionsLineButton">Reset Trade</button>
			<button @click="localProposeTrade" class="actionsLineButton">Propose Trade</button>
		</template>
	</div>

	<!-- INCOMING TRADES -->
	<template v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING && personal.canPlay() && store.context.relevantIncomingTrades.length > 0">
		<div class="wholeTradeDiv">
			<h2>Incoming Trades</h2>
			<div v-for="(entry, idx) in store.context.relevantIncomingTrades" :key="idx" class="incomingTradeDiv">
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].displayName }}</span>
				</div>
				's Trade
				<br />
				<div class="incomingPlayerBoxes">
					<div class="incomingPlayerBox">
						You will receive:
						<br />
						<img v-for="(res, idx) in entry[2]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<template v-if="entry[3][0] !== ''">
							<br />
							Promise:
							<br />
							{{ entry[3][0] }}
							<br />
							<br />
							Nominal Phase: {{ rf.PHASE_STRINGS[entry[3][1]] }}
						</template>
					</div>
					<div class="incomingPlayerBox">
						You will give:
						<br />
						<img v-for="(res, idx) in entry[4]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<template v-if="entry[5][0] !== ''">
							<br />
							Promise:
							<br />
							{{ entry[5][0] }}
							<br />
							<br />
							Nominal Phase: {{ rf.PHASE_STRINGS[entry[5][1]] }}
						</template>
					</div>
				</div>
				<span class="cautionSpan">Caution: If you accept this trade, your city actions will be locked up to this point in time</span>
				<br />
				<span class="cautionSpan">For maximum flexibility, reset your turn and perform just the necessary actions to trade</span>
				<br />
				<span class="warningSpan" v-if="unableToAffordTrade(entry)">You no longer have these resource. Reset turn / undo actions to enable this trade</span>
				<br />
				<button @click="localRejectTrade(entry)" class="actionsLineButton">Reject Trade</button>
				<button v-if="!unableToAffordTrade(entry)" @click="localAcceptTrade(entry)" class="actionsLineButton">Accept Trade</button>
			</div>
		</div>
	</template>

	<!-- OUTGOING TRADES -->
	<template v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING && personal.canPlay() && store.context.relevantOutgoingTrades.length > 0">
		<div class="wholeTradeDiv">
			<h2>Outgoing Trades</h2>
			<div v-for="(entry, idx) in store.context.relevantOutgoingTrades" :key="idx" class="incomingTradeDiv">
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				</div>
				's Trade
				<br />
				<div class="incomingPlayerBoxes">
					<div class="incomingPlayerBox">
						You will receive:
						<br />
						<img v-for="(res, idx) in entry[4]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<template v-if="entry[5][0] !== ''">
							<br />
							Promise:
							<br />
							{{ entry[5][0] }}
							<br />
							<br />
							Nominal Phase: {{ rf.PHASE_STRINGS[entry[5][1]] }}
						</template>
					</div>
					<div class="incomingPlayerBox">
						You will give:
						<br />
						<img v-for="(res, idx) in entry[2]" :key="idx" class="tradingRes" :src="view.getImage('res_' + String(res))" />
						<template v-if="entry[3][0] !== ''">
							<br />
							Promise:
							<br />
							{{ entry[3][0] }}
							<br />
							<br />
							Nominal Phase: {{ rf.PHASE_STRINGS[entry[3][1]] }}
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
