<script setup>
import * as rf from "../js/INDreference"
import * as view from "../js/INDview"
import * as model from "../js/INDmodel"
import * as controller from "../js/INDcontroller"
//import * as map from "../js/INDmap"

//import { ref, computed } from "vue"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
const personal = usePersonalStore()

// Reactive data for checkbox
import { ref } from "vue"
const passIfOutbid = ref(false)

function resetWholePlayerTurn() {
	store.clearVars()
	model.resetWholeTurn()
	controller.startPlayerTurn()
}

function getPlayerAvailableCashForMergerBidding(playerIndex) {
	let availableCash = store.players[playerIndex].moneyCash
	if (store.useMergerSubsidy) availableCash += (store.players[playerIndex].RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * rf.MERGER_SUBSIDY_MULTIPLIER
	return availableCash
}

function newBidSelected(newBid) {
	store.context.selectedMergerBid = parseInt(newBid)
	store.context.selectedMergerPreBid = -1
}

function getBidRange() {
	let possibleBids = []
	let maxBid = controller.currentPlayerObj().moneyCash
	let mergerSubsidyAmount = 0
	if (store.useMergerSubsidy) {
		mergerSubsidyAmount = (controller.currentPlayerObj().RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * rf.MERGER_SUBSIDY_MULTIPLIER
		maxBid += mergerSubsidyAmount
	}

	for (let i = store.ongoingVars.currentBid + store.ongoingVars.bidIncrement; i <= maxBid; i += store.ongoingVars.bidIncrement) possibleBids.push(i)
	let res = []
	// Pass
	if (store.gameflow.phase === rf.PHASE_MERGER_BIDDING) res.push([0, "Pass (Keep " + String(controller.currentPlayerObj().moneyCash) + ")"])
	for (let i = 0; i < possibleBids.length; i++) {
		if (store.useMergerSubsidy && mergerSubsidyAmount > 0) {
			res.push([possibleBids[i], `${String(possibleBids[i])} (${String(getRemainingCashIfBidSuccessful(controller.currentPlayerIndex(), possibleBids[i], false))} remaining after subsidy of ${String(mergerSubsidyAmount)})`])
		} else res.push([possibleBids[i], "" + String(possibleBids[i]) + " (" + String(getRemainingCashIfBidSuccessful(controller.currentPlayerIndex(), possibleBids[i], false)) + " remaining)"])
	}
	return res
}

function getRemainingCashIfBidSuccessful(playerIndex, bidAmount, justTheNet) {
	bidAmount = parseInt(bidAmount)
	let startingCash = store.players[playerIndex].moneyCash
	let res = startingCash
	let net = 0
	let thisIsWinningPlayerIndex = (playerIndex === store.ongoingVars.currentBidderIndex && bidAmount === store.ongoingVars.currentBid) || (playerIndex === controller.currentPlayerIndex() && bidAmount > store.ongoingVars.currentBid)
	let mergerSubsidyAmount = 0
	let netBidAmount = bidAmount
	if (store.useMergerSubsidy && thisIsWinningPlayerIndex) mergerSubsidyAmount = (store.players[playerIndex].RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * rf.MERGER_SUBSIDY_MULTIPLIER

	// Alter the bidAmount here to take into account the subsidy
	if (mergerSubsidyAmount > 0) netBidAmount = Math.max(netBidAmount - mergerSubsidyAmount, 0)

	if (thisIsWinningPlayerIndex && bidAmount === store.ongoingVars.currentBid) res -= netBidAmount
	else if (playerIndex === controller.currentPlayerIndex() && bidAmount > store.ongoingVars.currentBid) res -= netBidAmount
	if (playerIndex === store.ongoingVars.selectedMergerInfo[0][0] || playerIndex === store.ongoingVars.selectedMergerInfo[1][0]) {
		// You are in the current merger
		let myPcGain = 0
		// Own both, get 100%
		if (playerIndex === store.ongoingVars.selectedMergerInfo[0][0] && playerIndex === store.ongoingVars.selectedMergerInfo[1][0]) myPcGain = 1
		else if (playerIndex === store.ongoingVars.selectedMergerInfo[0][0]) myPcGain = store.ongoingVars.selectedMergerInfo[0][2] / (store.ongoingVars.selectedMergerInfo[0][2] + store.ongoingVars.selectedMergerInfo[1][2])
		else if (playerIndex === store.ongoingVars.selectedMergerInfo[1][0]) myPcGain = store.ongoingVars.selectedMergerInfo[1][2] / (store.ongoingVars.selectedMergerInfo[0][2] + store.ongoingVars.selectedMergerInfo[1][2])
		let monetaryGain = bidAmount * myPcGain
		//if (monetaryGain > netBidAmount) monetaryGain = 0
		// If the net bid amount is greater then the monetary gain, you get it all back
		if (netBidAmount > monetaryGain) {
			// No adjustment necessary
			//monetaryGain = monetaryGain
		}
		// So if the net bid amount is LESS than the monetary gain, you get the net bid amount
		else {
			monetaryGain = netBidAmount
		}

		//monetaryGain = Math.min(monetaryGain - mergerSubsidyAmount, netBidAmount)
		//if (monetaryGain < 0) monetaryGain = 0

		net += monetaryGain
		res += monetaryGain
	}
	// This is needed
	net = parseInt(net)
	res = parseInt(res)

	if (justTheNet && thisIsWinningPlayerIndex && bidAmount === store.ongoingVars.currentBid) {
		if (net - netBidAmount > 0) return "+" + String(net - netBidAmount)
		if (net - netBidAmount === 0) return "-0"
		return String(net - netBidAmount)
	} else if (justTheNet && playerIndex === controller.currentPlayerIndex() && bidAmount > store.ongoingVars.currentBid) {
		if (net - netBidAmount > 0) return "+" + String(net - netBidAmount)
		if (net - netBidAmount === 0) return "-0"
		return String(net - netBidAmount)
	}
	if (justTheNet) return "+" + String(net)
	return String(res)
}

function newPreBidSelected(newBid) {
	store.context.selectedMergerPreBid = parseInt(newBid)
}

function getPreBidRange() {
	let possibleBids = []
	let maxBid = controller.currentPlayerObj().moneyCash
	let mergerSubsidyAmount = 0
	if (store.useMergerSubsidy) mergerSubsidyAmount = (controller.currentPlayerObj().RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * rf.MERGER_SUBSIDY_MULTIPLIER
	maxBid += mergerSubsidyAmount

	if (store.context.selectedMergerBid === 0 || store.context.selectedMergerBid + store.ongoingVars.bidIncrement * 2 > maxBid) {
		store.context.selectedMergerPreBid = 0
		// Forced pass with hidden money
		if (controller.currentPlayerObj().moneyCash + mergerSubsidyAmount < store.ongoingVars.currentBid + store.ongoingVars.bidIncrement) return [[0, "No Money - You must manually pass to help hide your money"]]

		if (store.context.selectedMergerBid === 0) {
            store.context.selectedMergerPreBid = -1
            return [[-1, "Place Bid First"]]
        }
		if (store.context.selectedMergerBid + store.ongoingVars.bidIncrement * 2 > maxBid) return [[0, "No higher bids possible"]]
	}

	for (let i = store.context.selectedMergerBid + store.ongoingVars.bidIncrement * 2; i <= maxBid; i += store.ongoingVars.bidIncrement) possibleBids.push(i)
	let res = []
	res.push([-1, "Do not set an auto bid"])
	res.push([0, "Pass for your next bid"])
	for (let i = 0; i < possibleBids.length; i++) {
		res.push([possibleBids[i], "" + String(possibleBids[i]) + " (" + String(getRemainingCashIfBidSuccessful(controller.currentPlayerIndex(), possibleBids[i], false)) + " remaining)"])
	}
	return res
}

function localGetEligibleBidderIndexes() {
	let res = []
	for (let i = 0; i < store.players.length; i++) {
		if ((store.gameflow.phase === rf.PHASE_MERGERS || store.ongoingVars.bidTurnOrder.includes(i)) && i !== controller.currentPlayerIndex()) {
			let availableMoney = store.players[i].moneyCash
			if (store.useMergerSubsidy) availableMoney += (store.players[i].RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * rf.MERGER_SUBSIDY_MULTIPLIER
			if (availableMoney >= (store.context.selectedMergerBid > 0 ? store.context.selectedMergerBid + store.ongoingVars.bidIncrement : store.ongoingVars.currentBid + store.ongoingVars.bidIncrement)) {
				let freeSlot = false
				// Either fully free slot
				if (!model.hasNoFreeSlots(store.players[i])) freeSlot = true
				// OR be in the merger
				else if (store.ongoingVars.selectedMergerInfo[0][0] === i || store.ongoingVars.selectedMergerInfo[1][0] === i) freeSlot = true
				if (store.players[i].displayName === rf.BOT_NAME) freeSlot = false
				if (freeSlot) res.push(i)
			}
		}
	}
	// Now sort res according to order in store.ongoingVars.bidTurnOrder
	res.sort((a, b) => store.ongoingVars.bidTurnOrder.indexOf(a) - store.ongoingVars.bidTurnOrder.indexOf(b))
	return res
}

function confirmPreBid(passOnNextTurn) {
	let idx = store.ongoingVars.preBidData.findIndex((entry) => entry[0] === controller.currentPlayerIndex())
	if (idx === -1) store.ongoingVars.preBidData.push([controller.currentPlayerIndex(), store.context.selectedMergerPreBid, passOnNextTurn === true ? 1 : 0])
	else {
		store.ongoingVars.preBidData[idx][1] = store.context.selectedMergerPreBid
		store.ongoingVars.preBidData[idx][2] = passOnNextTurn === true ? 1 : 0
	}
	store.context.action = rf.ACT_CONFIRM_END_TURN
	store.context.action = rf.ACT_CONFIRM_END_TURN
	controller.endPlayerTurn()
}

function confirmPass() {
	store.context.selectedMergerBid = 0
	//store.resetOngoingVars(true)
	store.context.action = rf.ACT_CONFIRM_END_TURN
	controller.endPlayerTurn()
}

function confirmBid() {
	store.context.action = rf.ACT_CONFIRM_END_TURN
	controller.endPlayerTurn()
}

function updatePassIfOutbid() {
	// Update the pre-bid data with the new pass-if-outbid setting
	let idx = store.ongoingVars.preBidData.findIndex((entry) => entry[0] === controller.currentPlayerIndex())
	if (idx !== -1) {
		store.ongoingVars.preBidData[idx][2] = passIfOutbid.value ? 1 : 0
	}
}
</script>

<template>
	<div class="wholeMergerBiddingDiv">
		<!-- 1. Selection Display: Side-by-Side Comparison -->
		<!-- 1. Selection Display: Side-by-Side Comparison with High Bidder in between -->
		<div class="merginCompaniesDiv">
			<template v-for="(entry, idx) in store.ongoingVars.selectedMergerInfo" :key="idx">
				<!-- FIRST COMPANY -->
				<div class="mergingCompanyDiv">
					<span class="mainEntryPlayer limitedPlayerNameSpan mergingCompanyNameSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].displayName }}</span>

					<div class="slotImgsDiv" :style="{ height: store.players[entry[0]].slots[entry[1]].length > 1 ? 79 + 10 * store.players[entry[0]].slots[entry[1]].length + 'px' : '79px' }">
						<img v-for="(companyID, idx2) in store.players[entry[0]].slots[entry[1]]" :key="idx2" class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))" :style="{ top: (store.players[entry[0]].slots[entry[1]].length - 1 - idx2) * 20 + 'px' }" />

						<!-- Shipping Visuals -->
						<template v-if="model.getActiveCompanyDataFromID(store.players[entry[0]].slots[entry[1]][0]).type === rf.COMPANY_SHIPPING">
							<div class="shipCompanyBackground"></div>
							<svg class="shipCardImgSVG">
								<image class="shipCardIMG" :filter="view.getShipMarkerMainFilterURLfromPlayerIndex(entry[0])" :xlink:href="view.getImage(model.getActiveCompanyDataFromID(store.players[entry[0]].slots[entry[1]][0]).shipGfx)" />
							</svg>
						</template>
					</div>
				</div>

				<!-- 2. INJECT HIGH BIDDER (Only after first company, during bidding phase) -->
				<div v-if="idx === 0 && store.ongoingVars.selectedMergerInfo.length === 2 && store.gameflow.phase === rf.PHASE_MERGER_BIDDING" class="current-bidder-mid-section">
					<div class="bidder-info-small">
						<div class="label-tiny">High Bidder</div>
						<span class="mainEntryPlayer limitedPlayerNameSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.ongoingVars.currentBidderIndex].colour)">
							{{ store.players[store.ongoingVars.currentBidderIndex].displayName }}
						</span>
						<div class="bid-val">💵 {{ store.ongoingVars.currentBid }}</div>
					</div>
				</div>
			</template>
		</div>

		<!-- 2. Bidding Dashboard (2 Companies Selected) -->
		<div v-if="store.ongoingVars.selectedMergerInfo.length === 2" class="biddingAreaLessCompaniesDiv">
			<div class="nominalIncrementDiv">
				<span>
					Nominal:
					<strong>{{ store.ongoingVars.nominalValue }}</strong>
				</span>
				<span>
					Increment:
					<strong>{{ store.ongoingVars.bidIncrement }}</strong>
				</span>
			</div>

			<!-- Affordable State -->
			<template v-if="getPlayerAvailableCashForMergerBidding(controller.currentPlayerIndex()) >= store.ongoingVars.nominalValue">
				<div class="bidSelectorsDiv" v-if="store.context.action !== rf.ACT_CONFIRM_END_TURN">
					<div class="singleBidSelectDiv">
						<label>Current Bid</label>
						<select class="bidSelect" @change="newBidSelected($event.target.value)">
							<option v-for="(amount, idx) in getBidRange()" :key="idx" :value="amount[0]">{{ amount[1] }}</option>
						</select>
					</div>
					<div v-if="!personal.trainingGame" class="singleBidSelectDiv">
						<label>Auto-Bid</label>
						<select class="bidSelect" @change="newPreBidSelected($event.target.value)">
							<option v-for="(amount, idx) in getPreBidRange()" :key="idx" :value="amount[0]" :selected="amount[0] === store.context.selectedMergerPreBid" :disabled="store.context.selectedMergerBid === -1">{{ amount[1] }}</option>
						</select>
					</div>
				</div>

				<!-- Current Commitment -->
				<div class="yourBidDiv">
					Your Bid:
					<template v-if="store.context.selectedMergerBid === 0"><strong>Pass</strong></template>
					<template v-else>
						<strong>{{ store.context.selectedMergerBid }}</strong>
						<!-- Inline checkbox for auto-bid behavior -->
						<div v-if="!personal.trainingGame && store.context.selectedMergerPreBid > 0" class="inline-checkbox-container">
							<input type="checkbox" id="passIfOutbid" v-model="passIfOutbid" @change="updatePassIfOutbid" />
							<label for="passIfOutbid" class="inline-checkbox-label">
								Pass if  Outbid
							</label>
						</div>
						<div v-if="store.context.selectedMergerPreBid !== -1" class="auto-status-text">
							<template v-if="store.context.selectedMergerPreBid === 0">
								⚠️
								<em>Auto-pass active if outbid.</em>
							</template>
							<template v-else>
								<em>Auto-bidding to {{ store.context.selectedMergerPreBid }}</em>
							</template>
						</div>
					</template>
				</div>

				<!-- Resulting Cash Table -->
				<div class="cashResultsDiv">
					<p v-if="store.context.selectedMergerBid > 0" class="title-small">CASH IF SUCCESSFUL</p>
					<p v-else class="title-small">CASH IF YOU PASS</p>

					<!-- YOUR CASH -->
					<div class="cashResutSingleRowDiv">
						<span class="mainEntryPlayer limitedPlayerNameSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[controller.currentPlayerIndex()].colour)">{{ store.players[controller.currentPlayerIndex()].displayName }}</span>
						<strong>
							<span class="cashIconIfSuccessful">💵</span>
							{{ getRemainingCashIfBidSuccessful(controller.currentPlayerIndex(), store.context.selectedMergerBid > 0 ? store.context.selectedMergerBid : store.ongoingVars.currentBid, false) }}
						</strong>
						<small
							:style="{
								color: getRemainingCashIfBidSuccessful(controller.currentPlayerIndex(), store.context.selectedMergerBid > 0 ? store.context.selectedMergerBid : store.ongoingVars.currentBid, true) < 0 ? 'darkred' : 'darkgreen',
								fontWeight: 'bolder',
							}">
							({{ getRemainingCashIfBidSuccessful(controller.currentPlayerIndex(), store.context.selectedMergerBid > 0 ? store.context.selectedMergerBid : store.ongoingVars.currentBid, true) }})
						</small>
					</div>
					<!-- WINNING BIDDER IF YOU PASS AND THEY AREn"T IN THE MERGER -->
					<div v-if="store.context.selectedMergerBid === 0 && store.ongoingVars.currentBidderIndex !== store.ongoingVars.selectedMergerInfo[0][0] && store.ongoingVars.currentBidderIndex !== store.ongoingVars.selectedMergerInfo[1][0]" class="cashResutSingleRowDiv">
						<span class="mainEntryPlayer limitedPlayerNameSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.ongoingVars.currentBidderIndex].colour)">{{ store.players[store.ongoingVars.currentBidderIndex].displayName }}</span>
						<strong v-if="!store.hiddenMoney">
							<span class="cashIconIfSuccessful">💵</span>
							{{ getRemainingCashIfBidSuccessful(store.ongoingVars.currentBidderIndex, store.ongoingVars.currentBid, false) }}
						</strong>
						<small
							:style="{
								color: getRemainingCashIfBidSuccessful(store.ongoingVars.currentBidderIndex, store.ongoingVars.currentBid, true) < 0 ? 'darkred' : 'darkgreen',
								fontWeight: 'bolder',
							}">
							({{ getRemainingCashIfBidSuccessful(store.ongoingVars.currentBidderIndex, store.ongoingVars.currentBid, true) }})
						</small>
					</div>
					<!-- OTHER CASH -->
					<template v-for="(entry, idx) in store.ongoingVars.selectedMergerInfo" :key="idx">
						<div v-if="(entry[0] !== controller.currentPlayerIndex() && (idx === 0 || (idx === 1 && store.ongoingVars.selectedMergerInfo[0][0] !== entry[0])))" class="cashResutSingleRowDiv">
							<span class="mainEntryPlayer limitedPlayerNameSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].displayName }}</span>
							<strong v-if="!store.hiddenMoney">
								<span class="cashIconIfSuccessful">💵</span>
								{{ getRemainingCashIfBidSuccessful(entry[0], store.context.selectedMergerBid > 0 ? store.context.selectedMergerBid : store.ongoingVars.currentBid, false) }}
							</strong>
							<small
								:style="{
									color: getRemainingCashIfBidSuccessful(entry[0], store.context.selectedMergerBid > 0 ? store.context.selectedMergerBid : store.ongoingVars.currentBid, true) < 0 ? 'darkred' : 'darkgreen',
									fontWeight: 'bolder',
								}">
								({{ getRemainingCashIfBidSuccessful(entry[0], store.context.selectedMergerBid > 0 ? store.context.selectedMergerBid : store.ongoingVars.currentBid, true) }})
							</small>
						</div>
					</template>
				</div>

				<!-- Competition Panel -->
				<div v-if="personal.trainingGame || !store.hiddenMoney" class="otherBiddersDiv">
					<div v-if="localGetEligibleBidderIndexes().length > 0">
						<p class="title-small">COMPETITORS IN BIDDING ORDER</p>
						<div class="otherBiddersNamesDiv">
							<span v-for="pIdx in localGetEligibleBidderIndexes()" :key="pIdx" class="otherSingleBidderNameDiv">
								<span class="mainEntryPlayer limitedPlayerNameSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[pIdx].colour)">{{ store.players[pIdx].displayName }}</span>
								<span class="cashIconCompetitors">💵</span>
								{{ getPlayerAvailableCashForMergerBidding(pIdx) }}
							</span>
						</div>
					</div>
					<p v-else class="mergerBidWinP">You will win the merger with this bid</p>
				</div>

				<!-- Actions Footer -->
				<div class="mergerBottomButtonsDiv" v-if="store.context.action !== rf.ACT_CONFIRM_END_TURN">
					<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
					<button v-if="store.context.selectedMergerPreBid === -1" class="actionsLineButton" @click="confirmBid">
						<template v-if="store.context.selectedMergerBid === 0">
							<template v-if="localGetEligibleBidderIndexes().length <= 1">Pass - lose merger - End Turn</template>
							<template v-else>Pass & End Turn</template>
						</template>
						<template v-else>Bid {{ store.context.selectedMergerBid }} & End Turn</template>
					</button>
					<button v-else-if="store.context.selectedMergerPreBid === 0" class="actionsLineButton" @click="confirmPreBid(false)">Bid {{ store.context.selectedMergerBid }} & Pass</button>
					<button v-else class="actionsLineButton" @click="confirmPreBid(passIfOutbid)">Bid {{ store.context.selectedMergerBid }} & End Turn. Auto bid to {{ store.context.selectedMergerPreBid }}<template v-if="passIfOutbid">. Pass if outbid</template></button>
				</div>
			</template>

			<!-- Error State -->
			<template v-else>
				<div class="insufficientFunds">
					<p>Insufficient funds for this merger.<br/>
					(You were not auto-passed to hide your available money)</p>
					<button class="actionsLineButton" @click="confirmPass">Pass & End Turn</button>
				</div>
			</template>
		</div>

		<!-- Single Company Selected State -->
		<template v-else>
			<div class="single-selection-footer">
				<p class="hint-text">Click a non-highlighted slot to see why you cannot merge with it.</p>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Selection</button>
			</div>
		</template>
	</div>
</template>

<style scoped>
.wholeMergerBiddingDiv {
	padding: 5px;
	background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
	border: 1px solid black;
	border-radius: 8px;
	margin: 8px 0;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.merginCompaniesDiv {
	display: flex; /* Align companies and high bidder in a row */
	align-items: center; /* Center everything vertically */
	justify-content: center;
	gap: 5px; /* Space between columns */
	margin-bottom: 0px;
}

.mergingCompanyDiv {
	flex: 1; /* Allow companies to share space equally */
	max-width: 140px; /* Match your company card width */
	text-align: center;
}

.current-bidder-mid-section {
	flex: 0 0 200px; /* Fixed width for the middle section */
	text-align: center;
	background: rgba(0, 0, 0, 0.1);
	padding: 8px;
	border-radius: 6px;
	border: 1px solid rgba(255, 255, 0, 0.2); /* Subtle glow */
}

.label-tiny {
	font-size: 0.65rem;
	color: black;
	text-transform: uppercase;
}

.bid-val {
	font-weight: bold;
	font-size: 1.1rem;
	color: darkgreen;
	margin-top: 4px;
}

.mergerBidWinP {
	color: #006400;
}

.nominalIncrementDiv {
	display: flex;
	justify-content: space-around;
	padding: 0px;
	border-radius: 4px;
	font-size: 0.9rem;
}

.bidSelectorsDiv {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 5px;
	margin: 5px 0;
}

.singleBidSelectDiv label {
	display: block;
	font-size: 0.75rem;
	color: black;
	margin-bottom: 4px;
}

.bidSelect {
	width: 100%;
	border: 1px solid #444;
	padding: 5px;
	border-radius: 4px;
}

.cashResultsDiv {
	padding: 10px;
	border-radius: 4px;
	background: rgba(0, 0, 0, 0.1);
}

.title-small {
	font-size: 0.7rem;
	color: #555;
	margin-bottom: 5px;
	font-weight: bold;
}

.cashResutSingleRowDiv {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr;
	padding: 4px 0;
	border-bottom: 1px solid #222;
	font-size: 0.85rem;
	align-items: center;
}

.cashIconIfSuccessful {
	font-size: 18px;
	min-width: 24px;
	display: inline;
	align-items: center;
	justify-content: center;
}

.current-bidder-section {
	padding: 10px;
	border-radius: 4px;
	background: rgba(0, 0, 0, 0.05);
	margin: 10px 0;
	border: 1px solid #ddd;
}

.bidder-info {
	text-align: center;
	font-size: 0.9rem;
}

.inline-checkbox-container {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-left: 10px;
	vertical-align: middle;
}

.inline-checkbox-container input[type="checkbox"] {
	margin: 0;
	width: 14px;
	height: 14px;
}

.inline-checkbox-label {
	margin: 0;
	font-size: 0.8rem;
	color: #555;
	cursor: pointer;
	display: inline;
	vertical-align: middle;
}

.cashIconCompetitors {
	font-size: 18px;
	display: flex; /* 5. Allows inner alignment */
	align-items: center;
	line-height: 1; /* 6. Removes extra "lead" space from the emoji box */
	margin-bottom: 4px;
}

.biddingAreaLessCompaniesDiv {
	padding: 5px;
	border-radius: 6px;
	margin: 5px 0;
}

.slotImgsDiv {
	display: inline-block;
	position: relative;
	width: 79px;
}

.yourBidDiv {
	padding: 4px;
	border-radius: 4px;
	margin: 0px 0;
}

.auto-status-text {
	font-size: 0.8rem;
	color: #666;
	margin-top: 5px;
}

.otherBiddersDiv {
	padding: 5px;
	border-radius: 4px;
	background: rgba(0, 0, 0, 0.03);
	margin: 4px 0;
}

.otherBiddersNamesDiv {
	display: inline-flex; /* 1. Turn the container into a flexbox */
	align-items: center; /* 2. Vertically center all children (text, span, emoji) */
	gap: 4px; /* 3. Space between elements */
}

.otherSingleBidderNameDiv {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 4px 8px;
	border-radius: 12px;
	background: #f0f0f0;
	border: 1px solid #ccc;
	font-size: 0.8rem;
}

.insufficientFunds {
	text-align: center;
	padding: 20px;
	color: #d32f2f;
}

.hint-text {
	font-size: 0.8rem;
	color: #666;
	margin-bottom: 10px;
}

.single-selection-footer {
	text-align: center;
	padding: 15px;
}

.companyCardIMG {
	position: absolute;
	left: 0px;
	border: 2px solid black;
	width: 75px;
	height: 75px;
}

.shipCompanyBackground {
	background-color: #4ca0bc;
	position: absolute;
	left: 2px;
	top: 20px;
	width: 70px;
	height: 40px;
}

.shipCardImgSVG {
	position: absolute;
	left: 18px;
	top: 20px;
	width: 46px;
	height: 46px;
}

.shipCardIMG {
	width: 100%;
	height: 100%;
}

.limitedPlayerNameSpan {
	display: inline-block;
	vertical-align: middle;

	/* 1. Limit the maximum size */
	max-width: 200px;

	/* 2. FORCE it to be at least as wide as the text (up to the max) */
	width: min-content;

	/* 3. Prevent parent flexboxes from squashing it */
	flex-shrink: 0;

	/* 4. Standard truncation */
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.mergingCompanyNameSpan {
	display: inline-block;
	vertical-align: middle;

	/* 1. Limit the maximum size */
	max-width: 133px;

	/* 2. FORCE it to be at least as wide as the text (up to the max) */
	width: min-content;

	/* 3. Prevent parent flexboxes from squashing it */
	flex-shrink: 0;

	/* 4. Standard truncation */
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-bottom: 2px;
}

.mergerBottomButtonsDiv {
	display: flex;
	margin: auto;
	justify-content: center;
	margin-top: 5px;
}
</style>
