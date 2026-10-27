<script setup>
import * as rf from "../js/INDreference"
import * as funcs from "../js/INDfuncs"
import * as view from "../js/INDview"
import * as history from "../js/INDhistory"
import * as map from "../js/INDmap"
import * as model from "../js/INDmodel"
import * as replay from "../js/INDreplay"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/INDpersonal.js"
const personal = usePersonalStore()

import i18n from "../i18n"

const RND_KEYS = ["rnd.bidMultiplier", "rnd.slots", "rnd.mergers", "rnd.expansion", "rnd.hullCapacity", "rnd.mergerSubsidy", "rnd.shippingSubsidy"]
function rndString(idx) {
	return i18n.global.t(RND_KEYS[idx])
}

const props = defineProps({
	entry: {
		type: Array,
		required: true,
		default: () => [],
		prop: "entry", // Specify the name of the prop in the parent component
	},
	entry_ID: {
		type: Number,
		required: true,
		default: 0,
		prop: "entry_ID", // Specify the name of the prop in the parent component
	},
})

function clickedHistoryEntry(action, entry3, entry_id) {
	// If not replay, or if clicking on the replay entry, just do highlights
	if (!store.topMenuViews.showReplay || entry_id === -1) history.setupHistoryHighlight(action, entry3, entry_id)
	// Otherwise, you are clicking in history during replay
	else replay.goToReplayStep(entry_id)
}

function getOrdinal(num) {
	const t = i18n.global.t
	if (num === 1) return t("history.timesOnce")
	else if (num === 2) return t("history.timesTwice")
	else if (num === 3) return t("history.timesThree")
	else if (num === 4) return t("history.timesFour")
	else if (num === 5) return t("history.timesFive")
}

function getWinningMergerData(entry) {
	let winningBid = -1
	let playerIndex = -1
	for (let i = entry[3].length - 2; i >= 3; i--) {
		if (entry[3][i][1] > 0 && entry[3][i][0] >= 0) {
			playerIndex = entry[3][i][0]
			winningBid = entry[3][i][1]
			break
		}
	}
	// If no winne was found mid bids, then it must have been the propose,
	// with the proposers initial bid
	if (playerIndex === -1 && winningBid === -1) {
		playerIndex = entry[1]
		winningBid = entry[3][0]
	}
	return [playerIndex, winningBid]
}

function getTimeString(entry2) {
	let timestamp = entry2 * 1000

	var d = new Date(timestamp)
	var res = ""
	if (d.getDate() < 10) res += "0" + d.getDate() + "/"
	else res += d.getDate() + "/"
	if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
	else res += d.getMonth() + 1 + "/"
	res += d.getFullYear() + " "
	if (d.getHours() < 10) res += "0" + d.getHours() + ":"
	else res += d.getHours() + ":"
	if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
	else res += d.getMinutes() + ":"
	if (d.getSeconds() < 10) res += "0" + d.getSeconds()
	else res += d.getSeconds()

	return res
}

function getTotalExpansionCost(num, companyID) {
	let goodValue = model.getActiveCompanyDataFromID(companyID).goodValue
	return goodValue * num
}

function landOperatingOwnerAlsoHadShips(entry) {
	const mainPlayerIndex = entry[1]
	const shippingPlayers = []
	for (const goodJourney of entry[3].slice(1, entry[3].length - 1)) {
		shippingPlayers.push(goodJourney[1])
	}
	return shippingPlayers.includes(mainPlayerIndex)
}

</script>

<template>
	<template v-if="personal.name === 'admin'">{{ entry[3] }}</template>
	<!-- New Game -->
	<template v-if="entry[0] === rf.HIST_NEW_GAME">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				{{ $t('history.newGame') }}
				<br />
				<div v-for="(player, idx) in store.players" :key="idx" class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(player.colour)">{{
							store.players[idx].name }}</span>
				</div>
			</div>
		</div>
	</template>

	<!-- New ERA -->
	<template v-if="entry[0] === rf.HIST_NEW_ERA">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				{{ $t('history.newEra', { era: rf.ERA_STRINGS[entry[3][0]] }) }}
				<template v-if="entry[3].length > 1 && entry[3][1].length > 0">
					<br />
					<template v-for="(compID, idx) in entry[3][1]" :key="idx">
						<span v-if="compID <= 9">{{ $t('history.eraA') }}</span>
						<span v-else-if="compID >= 10 && compID <= 20">{{ $t('history.eraB') }}</span>
						{{ $t('history.removedFrom', { type: rf.PH_ALL_COMPANIES.find(c => c.id === compID).typeText, province: rf.PHP_PROVINCE_STRINGS[rf.PH_ALL_COMPANIES.find(c => c.id === compID).province] }) }}
						<br />
					</template>
				</template>

			</div>
		</div>
	</template>

	<!-- New Turn -->
	<template v-if="entry[0] === rf.HIST_NEW_TURN">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				{{ $t('history.newTurn', { num: entry[3][0] }) }}
				<template v-if="entry[3].length > 1">
					<template v-for="(summary, idx) in entry[3].slice(1)" :key="idx">
						<br />
						<div class="playerScoreSummaryDiv">
							<span class="mainEntryPlayerNewTurn"
								:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[idx].colour)">{{
									personal.getHistoryName(idx) }}: {{ summary[0] }} + {{ summary[1] }} = {{ summary[0] +
									summary[1] }}</span>
						</div>
					</template>
				</template>
			</div>
		</div>
	</template>

	<!-- GAME END -->
	<template v-if="entry[0] === rf.HIST_GAME_END">
		<div class="log separator" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry new_turn">
				<template v-if="entry[3].length === 1">
					<span class="mainEntryPlayer"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[3][0]].colour)">{{
							personal.getHistoryName(entry[3][0]) }}</span>
					{{ $t('history.winsKing') }}
				</template>
				<template v-else>
					<template v-for="(finalEntry, idx) in entry[3]" :key="idx">
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[finalEntry[0]].colour)">{{
								personal.getHistoryName(finalEntry[0]) }}</span>
						{{ $t('history.total', { score: finalEntry[1] }) }}
						<br />
					</template>
				</template>
				<br />
			</div>
		</div>
	</template>

	<!-- REWIND -->
	<template v-if="entry[0] === rf.HIST_REWIND">
		<div class="log">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">{{ $t('history.rewoundBy', { name: store.players[entry[3][0]].name }) }}</div>
		</div>
	</template>

	<!-- RESIGN -->
	<template v-if="entry[0] === rf.HIST_RESIGN">
		<div class="log">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">{{ $t('history.resigns', { name: entry[3][0] }) }}</div>
		</div>
	</template>

	<!-- KICKOUT -->
	<template v-if="entry[0] === rf.HIST_KICKOUT">
		<div class="log">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">{{ $t('history.kickedOut', { name: entry[3][0] }) }}</div>
		</div>
	</template>

	<!-- Set new turn order -->
	<template v-if="entry[0] === rf.HIST_SET_NEW_TURN_ORDER">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<span class="centreSpan">
				<b><u>{{ $t('history.newTurnOrder') }}</u></b>
			</span>
			<div class="centreSpan">
				<template v-for="(playerIndex, idx) in entry[3]" :key="idx">
					<span class="mainEntryPlayer"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{
							personal.getHistoryName(playerIndex) }}</span>
				</template>
			</div>
		</div>
	</template>

	<!-- AUTO PASS MERGER PHASE -->
	<template v-if="entry[0] === rf.HIST_AUTO_SKIP_MERGERS">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<b><u></u></b>
			<b><u>{{ $t('history.mergersSkipped') }}</u></b>
			<template v-for="(skipRow, idx) in entry[3]" :key="idx">
				<br />
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[skipRow[0]].colour)">{{
						personal.getHistoryName(skipRow[0]) }}</span>
				<span v-if="skipRow.length === 1">{{ $t('history.passes') }}</span>
				<span v-else-if="skipRow[1] === 9">{{ $t('history.allCompaniesMerged') }}</span>
				<span v-else-if="skipRow[1] === 1">{{ $t('history.mergerTechTooLow') }}</span>
				<span v-else-if="skipRow[1] === 3">{{ $t('history.noSlotsAvailable') }}</span>
				<span v-else-if="skipRow[1] === 5">{{ $t('history.notEnoughMoney') }}</span>
				<span v-else>
					-
					<span v-if="skipRow.slice(1).includes(2)">{{ $t('history.mergerTechTooLowShort') }}</span>
					<span v-if="skipRow.slice(1).includes(4)">{{ $t('history.notEnoughSlotsShort') }}</span>
					<span v-if="skipRow.slice(1).includes(6)">{{ $t('history.notEnoughMoneyShort') }}</span>
				</span>
			</template>
		</div>
	</template>

	<!-- PASS MERGER PHASE -->
	<template v-if="entry[0] === rf.HIST_PASS_MERGER">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<b><u></u></b>
			<template v-for="(playerIndex, idx) in entry[3]" :key="idx">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{
						personal.getHistoryName(playerIndex) }}</span>
			</template>
			<span v-if="entry[3].length === 1">{{ $t('history.passesMergers') }}</span>
			<span v-else>{{ $t('history.passMergers') }}</span>
		</div>
	</template>

	<!-- ACQUISITION PHASE SKIP -->
	<template v-if="entry[0] === rf.HIST_SKIP_ACQUISITOIN_PHASE">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<span class="centreSpan">{{ $t('history.acquisitionsSkipped') }}</span>
		</div>
	</template>

	<!-- HIST_REMOVE_COMPANY_NO_TERRS -->
	<template v-if="entry[0] === rf.HIST_REMOVE_COMPANY_NO_TERRS">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<img class="removedCompanyCardNoTerrs" :src="view.getImage(view.getCompanyGfxFromID(entry[3][0]))"
				alt="Era Card" />
			{{ $t('history.companyRemoved') }}
		</div>
	</template>

	<!-- HIST_FINAL_INCOME -->
	<template v-if="entry[0] === rf.HIST_FINAL_INCOME">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			{{ $t('history.finalIncomeDoubled') }}
			<br />
			<template v-for="(amount, playerIndex) in entry[3]" :key="playerIndex">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{
						personal.getHistoryName(playerIndex) }}</span>
				{{ $t('history.gains', { amount }) }}
				<br />
			</template>
		</div>
	</template>

	<!-- *********************************************************** -->
	<!-- *************************** PLAYER ENTRIES **************** -->
	<!-- ADD CITY -->
	<template v-if="entry[0] === rf.HIST_ADD_CITY">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.buildsCityIn') }}
				<b>{{ view.getProvinceString(map.getProvinceFromTerrID(entry[3][0])) }}</b>
				{{ $t('history.using') }}
				<br />
				<img class="eraCard" :src="view.getImage(view.findEraCardGfxCodeFromID(entry[3][1]))" alt="Era Card" />
			</div>
		</div>
	</template>

	<!-- Remove Era Card -->
	<template v-if="entry[0] === rf.HIST_REMOVE_ERA_CARD">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.cannotPlaceCity') }}
				<span v-if="entry[3].length > 1 && entry[3][1] === 1">{{ $t('history.noLevel1Cities') }}</span>
				<span v-else>{{ $t('history.noValidTerritory') }}</span>
				{{ $t('history.cardRemoved') }}
				<br />
				<img class="eraCard" :src="view.getImage(view.findEraCardGfxCodeFromID(entry[3][0]))" alt="Era Card" />
			</div>
		</div>
	</template>

	<!-- Turn order bid -->
	<template v-if="entry[0] === rf.HIST_TURN_ORDER_BID">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.bids') }}
				<b>{{ entry[3][0] * entry[3][1] }}</b>
				{{ $t('history.bidWithMultiplier', { amount: entry[3][0], multiplier: entry[3][1] }) }}
			</div>
		</div>
	</template>

	<!-- MERGE WITHOUT BIDDING-->
	<template v-if="entry[0] === rf.HIST_MERGER_WITHOUT_BIDDING">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.bidsAndWins', { amount: entry[3][0] }) }}
				<template v-if="view.getMergerSubsidyAmount(entry[1], entry[4]) > 0">
					<br />
					{{ $t('history.payoutReduced', { amount: view.getMergerSubsidyAmount(entry[1], entry[4]), net: Math.max(entry[3][0] - view.getMergerSubsidyAmount(entry[1], entry[4]), 0) }) }}
				</template>
				<br />
				<template v-for="(mergerEntry, idx) in entry[3].slice(1, 3)" :key="idx">
					<span class="mainEntryPlayer"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[mergerEntry[0]].colour)">{{
							personal.getHistoryName(mergerEntry[0]) }}</span>
					{{ $t('history.namePossessive') }}
					<!-- slot content-->
					<div class="slotImgsDiv"
						:style="{ height: mergerEntry[1].length > 1 ? 79 + 10 * mergerEntry[1].length + 'px' : '79px' }">
						<template v-for="(companyID, idx2) in mergerEntry[1]" :key="idx2">
							<img class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))"
								alt="Company" :style="{ top: (mergerEntry[1].length - 1 - idx2) * 20 + 'px' }" />
						</template>
						<template
							v-if="model.getActiveCompanyDataFromID(mergerEntry[1][0]).type === rf.COMPANY_SHIPPING">
							<div class="shipCompanyBackground"></div>
							<svg class="shipCardImgSVG">
								<image class="shipCardIMG"
									:filter="view.getShipMarkerMainFilterURLfromPlayerIndex(mergerEntry[0])"
									:xlink:href="view.getImage(view.SHIP_NUM_TO_GFX(mergerEntry[3]))" alt="Ship" />
							</svg>
						</template>
					</div>
				</template>
				<!-- Unable to bid reasons-->
				<template v-for="(bidEntry, idx) in entry[3].slice(2)" :key="idx">
					<template v-if="bidEntry[0] === -5">
						<br />
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[bidEntry[1]].colour)">{{
								personal.getHistoryName(bidEntry[1]) }}</span>
						{{ $t('history.doesNotHaveSlot') }}
					</template>
					<template v-else-if="bidEntry[0] === -6">
						<br />
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[bidEntry[1]].colour)">{{
								personal.getHistoryName(bidEntry[1]) }}</span>
						{{ $t('history.doesNotHaveMoney') }}
					</template>
				</template>
				<br />
				<br />

				<!-- Money Summary -->
				<!-- If the winner owned both companies, then they can only get back winning bid MINUS subsidy-->
				<template v-if="entry[1] === entry[3].slice(1, 3)[0][0] && entry[1] === entry[3].slice(1, 3)[1][0]">
					<span class="mainEntryPlayer"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
							personal.getHistoryName(entry[1]) }}</span>
					{{ $t('history.gains', { amount: Math.max(entry[3][0] - view.getMergerSubsidyAmount(entry[1], entry[4]), 0) }) }}&nbsp;&nbsp;
				</template>
				<template v-else>
					<!-- Otherwise, the winner does NOT own both companies-->
					<template v-for="(mergerEntry, idx) in entry[3].slice(1, 3)" :key="idx">
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[mergerEntry[0]].colour)">{{
								personal.getHistoryName(mergerEntry[0]) }}</span>
						{{ $t('history.gainsColon') }} {{ mergerEntry[2] }}&nbsp;&nbsp;
					</template>
				</template>
			</div>
		</div>
	</template>

	<!-- MERGER WITH BIDDING-->
	<template v-if="entry[0] === rf.HIST_MERGER_BIDDING">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.proposesMerger', { amount: entry[3][0] }) }}
				<br />
				<template v-for="(mergerEntry, idx) in entry[3].slice(1, 3)" :key="idx">
					<span class="mainEntryPlayer"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[mergerEntry[0]].colour)">{{
							personal.getHistoryName(mergerEntry[0]) }}</span>
					{{ $t('history.namePossessive') }}
					<!-- slot content-->
					<div class="slotImgsDiv"
						:style="{ height: mergerEntry[1].length > 1 ? 79 + 10 * mergerEntry[1].length + 'px' : '79px' }">
						<template v-for="(companyID, idx2) in mergerEntry[1]" :key="idx2">
							<img class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))"
								alt="Company" :style="{ top: (mergerEntry[1].length - 1 - idx2) * 20 + 'px' }" />
						</template>
						<template
							v-if="model.getActiveCompanyDataFromID(mergerEntry[1][0]).type === rf.COMPANY_SHIPPING">
							<div class="shipCompanyBackground"></div>
							<svg class="shipCardImgSVG">
								<image class="shipCardIMG"
									:filter="view.getShipMarkerMainFilterURLfromPlayerIndex(mergerEntry[0])"
									:xlink:href="view.getImage(view.SHIP_NUM_TO_GFX(mergerEntry[2]))" alt="Ship" />
							</svg>
						</template>
					</div>
				</template>
				<br />
				<!-- BID SEQUENCE STARTS HERE - ON A NEW LINE -->
				<template v-for="(bidEntry, idx) in entry[3].slice(3)" :key="idx">
					<template v-if="bidEntry[0] === -5">
						<br v-if="idx > 0" />
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[bidEntry[1]].colour)">{{
								personal.getHistoryName(bidEntry[1]) }}</span>
						{{ $t('history.doesNotHaveSlot') }}
					</template>
					<template v-else-if="bidEntry[0] === -6">
						<br v-if="idx > 0" />
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[bidEntry[1]].colour)">{{
								personal.getHistoryName(bidEntry[1]) }}</span>
						{{ $t('history.doesNotHaveMoney') }}
					</template>
					<template v-else-if="bidEntry[0] !== -2">
						<template v-if="bidEntry[1] === 0">
							<br v-if="idx > 0" />
							<span class="mainEntryPlayer"
								:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[bidEntry[0]].colour)">{{
									personal.getHistoryName(bidEntry[0]) }}</span>
							passes
						</template>
						<template v-else>
							<span
								v-if="idx === 0 || (idx > 0 && (entry[3].slice(3)[idx - 1][0] < 0 || entry[3].slice(3)[idx - 1][1] === 0))">
								<br v-if="idx > 0" />
								<b>{{ $t('history.bidsLabel') }}</b>
								&nbsp;
							</span>
							<span class="mainEntryPlayer"
								:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[bidEntry[0]].colour)">{{
									bidEntry[1] }}</span>
						</template>
					</template>
				</template>
				<br />
				<br />
				<!-- Wining Summary -->
				<template v-if="entry[3][entry[3].length - 1][0] === -2">
					<b>{{ $t('history.winner') }}</b>
					<span class="mainEntryPlayer"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[getWinningMergerData(entry)[0]].colour)">{{
							personal.getHistoryName(getWinningMergerData(entry)[0]) }}</span>
					{{ $t('history.winningBid', { amount: getWinningMergerData(entry)[1] }) }}
					<template v-if="view.getMergerSubsidyAmount(getWinningMergerData(entry)[0], entry[4]) > 0">
						<br />
						{{ $t('history.payoutReduced', { amount: view.getMergerSubsidyAmount(getWinningMergerData(entry)[0], entry[4]), net: Math.max(getWinningMergerData(entry)[1] - view.getMergerSubsidyAmount(getWinningMergerData(entry)[0], entry[4]), 0) }) }}
					</template>
					<br />
					<!-- This is win with bids, if both comps belonged to the same person -->


					<!-- If the proposer owned both companies, they gain the full winning bid MINUS subsidy-->
					<template v-if="entry[1] === entry[3][1][0] && entry[1] === entry[3][2][0]">
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
								personal.getHistoryName(entry[1]) }}</span>
						{{ $t('history.gainsColon') }} {{ Math.max(getWinningMergerData(entry)[1] - view.getMergerSubsidyAmount(entry[1], entry[4]), 0) }}&nbsp;&nbsp;
					</template>
					<!-- Otherwise, if the SAME player but not the winner owned both comps -->
					<template v-else-if="entry[3][1][0] === entry[3][2][0]">
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[3][1][0]].colour)">{{
								personal.getHistoryName(entry[3][1][0]) }}</span>
						{{ $t('history.gainsColon') }}
						{{ entry[3][entry[3].length - 1][1] + entry[3][entry[3].length - 1][2] }}
					</template>
					<!-- This seems to be if 2 diff player comps are involved in the merger -->
					<template v-else>
						<template v-for="(mergerEntry, idx) in entry[3].slice(1, 3)" :key="idx">
							<template
								v-if="store.useMergerSubsidy && mergerEntry[0] === getWinningMergerData(entry)[0] && view.getMergerSubsidyAmount(getWinningMergerData(entry)[0], entry[4]) > 0">
								<span class="mainEntryPlayer"
									:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[mergerEntry[0]].colour)">{{
										personal.getHistoryName(mergerEntry[0]) }}</span>
								{{ $t('history.gainsColon') }}
								<!-- The lower of net winning bid-->
								{{ Math.min(Math.max(getWinningMergerData(entry)[1]
									- view.getMergerSubsidyAmount(getWinningMergerData(entry)[0], entry[4]), 0),
									entry[3][entry[3].length - 1][idx + 1]) }}&nbsp;&nbsp;

							</template>
							<template v-else>
								<span class="mainEntryPlayer"
									:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[mergerEntry[0]].colour)">{{
										personal.getHistoryName(mergerEntry[0]) }}</span>
								{{ $t('history.gainsColon') }}
								{{ entry[3][entry[3].length - 1][idx + 1] }}&nbsp;&nbsp;
							</template>
						</template>
					</template>
				</template>
			</div>
		</div>
	</template>

	<!-- MERGER REMOVE S-FAJI TERRS-->
	<template v-if="entry[0] === rf.HIST_MERGER_REMOVE_SIAP_FAJI_TERRS">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.removesMarkers', { count: entry[3].length - 1 }) }}
				<span v-if="entry[3].length - 1 > 1">{{ $t('history.markers') }}</span><span v-else>{{ $t('history.marker') }}</span>
			</div>
		</div>
	</template>

	<!-- MERGER REDEPLOY SHIPPING-->
	<template v-if="entry[0] === rf.HIST_MERGER_SHIP_REDEPLOYMENT">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.removesShips', { count: entry[3].length - 1 }) }}
				<span v-if="entry[3].length - 1 > 1">{{ $t('history.ships') }}</span><span v-else>{{ $t('history.ship') }}</span>
			</div>
		</div>
	</template>

	<!-- ACQUIRE COMPANY -->
	<template v-if="entry[0] === rf.HIST_ACQUIRE_COMPANY">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.acquires') }}
				<b>{{ model.getRawCompanyDataFromID(entry[3][0]).typeText }}</b>
				{{ $t('history.company') }}
				<template v-if="map.getProvinceFromTerrID(entry[3][1]) !== -1">
					{{ $t('history.inProvince') }}
					<b>{{ view.getProvinceString(map.getProvinceFromTerrID(entry[3][1])) }}</b>
				</template>
				<br />
				<div class="singleCompanyHolderDiv">
					<img class="companyCard" :src="view.getImage(model.getActiveCompanyDataFromID(entry[3][0]).gfx)"
						alt="Era Card" />
					<template v-if="model.getRawCompanyDataFromID(entry[3][0]).type === rf.COMPANY_SHIPPING">
						<div class="shipCompanyBackground"></div>
						<svg class="shipCardImgSVG">
							<image class="shipCardIMG"
								:filter="view.getShipMarkerMainFilterURLfromPlayerIndex(entry[1])"
								:xlink:href="view.getImage(view.SHIP_NUM_TO_GFX(entry[3][2]))" alt="Ship" />
						</svg>
					</template>
				</div>
			</div>
		</div>
	</template>

	<!-- PASS ACQUISTIONS -->
	<template v-if="entry[0] === rf.HIST_PLAYER_SKIP_ACQUISITOIN_PHASE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.passesAcquisition') }}
			</div>
		</div>
	</template>

	<!-- PASS HIST_SKIP_ACQUISITOIN_NO_COMPANIES -->
	<template v-if="entry[0] === rf.HIST_SKIP_ACQUISITOIN_NO_COMPANIES">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.passesAcquisitionsNoCompanies') }}
			</div>
		</div>
	</template>

	<!-- AUTO SKIP SINGLE ACQUISTIONS -->
	<template v-if="entry[0] === rf.HIST_AUTO_SKIP_SINGLE_ACQUISITOIN">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.passesAcquisitionsNoSlots') }}
			</div>
		</div>
	</template>

	<!-- R AND D -->
	<template v-if="entry[0] === rf.HIST_RND">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.researches') }}
				<template v-if="entry[3].length === 3">
					<span class="mainEntryPlayer"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[3][2]].colour)">{{
							personal.getHistoryName(entry[3][2]) }}</span>
					{{ $t('history.namePossessive') }}
				</template>
				<b>{{ rndString(entry[3][0]) }} {{ model.getRndDisplayValue(entry[3][0], entry[3][1]) }}</b>
			</div>
		</div>
	</template>

	<!-- OPERATE SHIPPING -->
	<template v-if="entry[0] === rf.HIST_OPERATE_SHIPPING">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.operates') }}
				<!-- slot content-->
				<div class="slotImgsDiv"
					:style="{ height: entry[3][0].length > 1 ? 79 + 10 * entry[3][0].length + 'px' : '79px' }">
					<template v-for="(companyID, idx2) in entry[3][0]" :key="idx2">
						<img class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))"
							alt="Company" :style="{ top: (entry[3][0].length - 1 - idx2) * 20 + 'px' }" />
					</template>
					<div class="shipCompanyBackground"></div>
					<svg class="shipCardImgSVG">
						<image class="shipCardIMG" :filter="view.getShipMarkerMainFilterURLfromPlayerIndex(entry[1])"
							:xlink:href="view.getImage(view.SHIP_NUM_TO_GFX(entry[3][entry[3].length - 1]))"
							alt="Ship" />
					</svg>
				</div>

				<template v-if="entry[3].length === 2">{{ $t('history.withoutExpanding') }}</template>
				<template v-else>
					{{ $t('history.expandingShipping') }}
					<b>{{ getOrdinal(entry[3].length - 2) }}</b>
				</template>
			</div>
		</div>
	</template>

	<!-- Auto Skip Operate Shipping-->
	<template v-if="entry[0] === rf.HIST_AUTO_SKIP_SHIP_OPERATE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.operates') }}
				<!-- slot content-->
				<div class="slotImgsDiv"
					:style="{ height: entry[3][0].length > 1 ? 79 + 10 * entry[3][0].length + 'px' : '79px' }">
					<template v-for="(companyID, idx2) in entry[3][0]" :key="idx2">
						<img class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))"
							alt="Company" :style="{ top: (entry[3][0].length - 1 - idx2) * 20 + 'px' }" />
					</template>
					<div class="shipCompanyBackground"></div>
					<svg class="shipCardImgSVG">
						<image class="shipCardIMG" :filter="view.getShipMarkerMainFilterURLfromPlayerIndex(entry[1])"
							:xlink:href="view.getImage(view.SHIP_NUM_TO_GFX(entry[3][entry[3].length - 1]))"
							alt="Ship" />
					</svg>
				</div>
				{{ $t('history.automaticallyShipOnly') }}
			</div>
		</div>
	</template>

	<!-- SKIP OPERATE LAND-->
	<template v-if="entry[0] === rf.HIST_SKIP_OPERATE_LAND">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.operates') }}
				<!-- slot content-->
				<div class="slotImgsDiv"
					:style="{ height: entry[3].length > 1 ? 79 + 10 * entry[3].length + 'px' : '79px' }">
					<template v-for="(companyID, idx2) in entry[3]" :key="idx2">
						<img class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))"
							alt="Company" :style="{ top: (entry[3].length - 1 - idx2) * 20 + 'px' }" />
					</template>
				</div>
				{{ $t('history.butCannotShip') }}
			</div>
		</div>
	</template>

	<!-- LAND PAY EXPANSINO ONLY-->
	<template v-if="entry[0] === rf.HIST_OPERATE_LAND_PAID_EXPANSION_ONLY">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.operates') }}
				<!-- slot content-->
				<div class="slotImgsDiv"
					:style="{ height: entry[3][0].length > 1 ? 79 + 10 * entry[3][0].length + 'px' : '79px' }">
					<template v-for="(companyID, idx2) in entry[3][0]" :key="idx2">
						<img class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))"
							alt="Company" :style="{ top: (entry[3][0].length - 1 - idx2) * 20 + 'px' }" />
					</template>
				</div>

				{{ $t('history.payingToExpand') }}
				<b>{{ getOrdinal(entry[3][1].length) }}</b>
				<br />{{ $t('history.cost', { amount: getTotalExpansionCost(entry[3][1].length, entry[3][0][0]) }) }}
			</div>
		</div>
	</template>

	<!-- OPERATE LAND -->
	<template v-if="entry[0] === rf.HIST_OPERATE_LAND">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.operates') }}
				<!-- slot content-->
				<div class="slotImgsDiv"
					:style="{ height: entry[3][0].length > 1 ? 79 + 10 * entry[3][0].length + 'px' : '79px' }">
					<template v-for="(companyID, idx2) in entry[3][0]" :key="idx2">
						<img class="companyCardIMG" :src="view.getImage(view.getCompanyGfxFromID(companyID))"
							alt="Company" :style="{ top: (entry[3][0].length - 1 - idx2) * 20 + 'px' }" />
					</template>
				</div>
				<br />
				<!-- Goods Journies-->
				<template v-for="(goodJourney, idx) in entry[3].slice(1, entry[3].length - 1)" :key="idx">
					<img class="goodsOperateImg"
						:src="view.getImage(model.getActiveCompanyDataFromID(entry[3][0][0]).goodsGfx)" alt="good" />
					<span class="mainEntryPlayer mainEntryPlayerShip"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[goodJourney[1]].colour)">
						{{ goodJourney.length - 4 === 1 ? $t('shipping.ship', { count: goodJourney.length - 4 }) : $t('shipping.shipsCount', { count: goodJourney.length - 4 }) }}
					</span>
					{{ $t('history.to') }}
					<b>{{ view.getProvinceString(map.getProvinceFromTerrID(goodJourney[goodJourney.length - 1])) }}</b>
					<!-- Check for subsidy -->
					<template v-if="view.getShippingSubsidyAmount(entry[1], goodJourney[1], entry[4], 'flag0') > 0">
						{{ $t('history.subsidy', { amount: view.getShippingSubsidyAmount(entry[1], goodJourney[1], entry[4], 'flag1') }) }}
					</template>
					<br />
				</template>
				<!-- EXPANSIONS -->
				<template v-if="entry[3][entry[3].length - 1] === -1">{{ $t('history.unableExpandFree') }}</template>
				<template
					v-else-if="entry[3][entry[3].length - 1][0] !== -1 && entry[3][entry[3].length - 1][0] !== -2">
					{{ $t('history.expandsFree') }}
					<b>{{ getOrdinal(entry[3][entry[3].length - 1].length) }}</b>
					<br />
				</template>
				<template v-else-if="entry[3][entry[3].length - 1][0] === -1">
					<template v-if="entry[3][entry[3].length - 1].length === 1">{{ $t('history.noExpansions') }}</template>
					<template v-else>
						{{ $t('history.expandsWithPayment') }}
						<b>{{ getOrdinal(entry[3][entry[3].length - 1].length - 1) }}</b> {{ $t('history.cost', { amount: getTotalExpansionCost(entry[3][entry[3].length - 1].length - 1, entry[3][0][0]) }) }}
					</template>
				</template>
				<template v-else-if="entry[3][entry[3].length - 1][0] === -2">{{ $t('history.choosesNotExpand') }}</template>
				<template v-if="entry[3].length > 2">
					<br />
					<div class="flexContainer">
						<b><u>{{ $t('history.income') }}</u></b>
						<template v-for="(incomeEntry, idx) in view.getTotalIncomeArray(entry, false, entry[4])"
							:key="idx">

							<!-- 2. Each entry is just a child of that flexbox -->
							<span class="incomeItem">
								&nbsp;
								<span class="mainEntryPlayer"
									:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[incomeEntry[0]].colour)">
									{{ personal.getHistoryName(incomeEntry[0]) }}
								</span>
								{{ incomeEntry[1] }}

								<template v-if="incomeEntry[2] > 0">
									(+ {{ incomeEntry[2] }} Subsidy)
								</template>
							</span>
						</template>
					</div>
					<!-- Add a note if the owner also had ships -->
					 <template v-if="landOperatingOwnerAlsoHadShips(entry)">
						{{ $t('history.shipIncomeRemoved', { name: store.players[entry[1]].name }) }}
					 </template>
				</template>

				<!--
				entry[3][0] // is just the slot number
				entry[3][1] [2] [3] etc is the goodJourney's
				each good journey is
				[prod marker terr, ship_company_owner, ship_company_id chip_terr, ship_ter ship_ter..... city_terr]
				-->
			</div>
		</div>
	</template>

	<!-- OPERATION INCOME SUMMARY -->
	<template v-if="entry[0] === rf.HIST_OPERATION_INCOME_SUMMARY">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<span class="centreSpan"><b><u>{{ $t('history.incomeSummary') }}</u></b></span>
			<template v-for="(income, idx) in entry[3]" :key="idx">
				<br v-if="idx > 0" />
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[idx].colour)">{{
						personal.getHistoryName(idx) }}</span>
				{{ income }}
			</template>
		</div>
	</template>

	<!-- NO CITY GROWTH -->
	<template v-if="entry[0] === rf.HIST_NO_CITY_GROWTH">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<span class="centreSpan">{{ $t('history.noCityGrowth') }}</span>
		</div>
	</template>

	<!-- CITY GROWTH SKIPPED - NO TOKENS -->
	<template v-if="entry[0] === rf.HIST_SKIP_CITY_GROWTH">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<span class="centreSpan">{{ $t('history.cityGrowthSkippedNoTokens') }}</span>
		</div>
	</template>

	<!-- CITY GROWTH -->
	<template v-if="entry[0] === rf.HIST_CITY_GROWTH">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<span class="centreSpan">
				<b><u>{{ $t('history.cityGrowth') }}</u></b>
			</span>
			<template v-if="entry[3][0].length > 0">
				<b>{{ $t('history.growthSize2') }} </b>
				<span v-for="(terrID, idx) in entry[3][0]" :key="idx">
					<span v-if="idx < entry[3][0].length - 1">{{
						view.getProvinceString(map.getProvinceFromTerrID(terrID)) }},&nbsp;</span>
					<span v-else>{{ view.getProvinceString(map.getProvinceFromTerrID(terrID)) }}</span>
				</span>
			</template>
			<template v-else>
				<b>{{ $t('history.noGrowthSize2') }}</b>
			</template>
			<br />
			<template v-if="entry[3].length > 1">
				<b>{{ $t('history.growthSize3') }} </b>
				<span v-for="(terrID, idx) in entry[3][1]" :key="idx">
					<span v-if="idx < entry[3][1].length - 1">{{
						view.getProvinceString(map.getProvinceFromTerrID(terrID)) }},&nbsp;</span>
					<span v-else>{{ view.getProvinceString(map.getProvinceFromTerrID(terrID)) }}</span>
				</span>
			</template>
			<template v-else>
				<b>{{ $t('history.noGrowthSize3') }}</b>
			</template>
		</div>
	</template>

	<!-- MANUAL CITY GROWTH -->
	<template v-if="entry[0] === rf.HIST_MANUAL_CITY_GROWTH">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
						personal.getHistoryName(entry[1]) }}</span>
				{{ $t('history.growsCitiesManually') }}
				<br />
				<template v-if="entry[3][0].length > 0">
					<b>{{ $t('history.growthSize2') }}</b>
					<span v-for="(terrID, idx) in entry[3][0]" :key="idx">
						{{ view.getProvinceString(map.getProvinceFromTerrID(terrID)) }}
						<span v-if="idx < entry[3][0].length - 1">,</span>
					</span>
					<br />
				</template>
				<template v-if="entry[3].length > 1">
					<b>{{ $t('history.growthSize3') }}</b>
					<span v-for="(terrID, idx) in entry[3][1]" :key="idx">
						{{ view.getProvinceString(map.getProvinceFromTerrID(terrID)) }}
						<span v-if="idx < entry[3][1].length - 1">,&nbsp;</span>
					</span>
				</template>
			</div>
		</div>
	</template>
</template>

<style scoped>
.playerScoreSummaryDiv {
	border: 1px solid white;
	display: inline-block;
	font-size: 15px;
	font-weight: bolder;
	margin: 4px;
	padding: 0px;
}

.log {
	direction: ltr;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 3px 3px 3px 3px;
	background-size: 35px 34px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
	z-index: 30;
}

.log .header {
	font-size: 0.8em;
}

.mainEntry {
	line-height: 25px;
}

.selectableHistory:hover {
	border: 1px solid yellow;
}

.log .new_turn {
	background-color: #000;
	text-align: center;
	color: #fff;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log .new_turn a {
	color: #2196f3;
}

.log .rewind {
	background-color: #d4eafd;
	text-align: center;
	color: #000;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log h4 {
	text-align: center;
}

.log.separator {
	padding: 3px;
}

.reverseHistory {
	display: flex;
	flex-direction: column-reverse;
}

.container {
	display: inline-block;
}

.flexContainer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0px;
	/* Use gap instead of &nbsp; for cleaner spacing */
	margin-bottom: 0px;
	width: 100%;
	/* Ensure it has room to be a "row" */
}

.incomeItem {
	white-space: nowrap;
	/* Prevents a single player's name/score from splitting in half */
}

.eraCard {
	border: 1px solid black;
	box-sizing: border-box;
	width: 200px;
	height: 120px;
	vertical-align: middle;
	margin: auto;
	display: flex;
}

.companyCard {
	border: 1px solid black;
	box-sizing: border-box;
	width: 75px;
	height: 75px;
	vertical-align: middle;
	margin: auto;
	display: flex;
}

.removedCompanyCardNoTerrs {
	border: 1px solid black;
	box-sizing: border-box;
	width: 60px;
	height: 60px;
	vertical-align: middle;
}

.companyCardLandOperate {
	border: 1px solid black;
	box-sizing: border-box;
	width: 50px;
	height: 50px;
	vertical-align: middle;
}

.goodsOperateImg {
	border: 1px solid black;
	box-sizing: border-box;
	width: 20px;
	height: 20px;
	vertical-align: middle;
}

.centreSpan {
	display: table;
	margin: 0 auto;
}

.slotImgsDiv {
	display: inline-block;
	position: relative;
	width: 79px;
	border: 2px solid black;
	margin-right: 5px;
	vertical-align: middle;
}

.singleCompanyHolderDiv {
	display: inline-block;
	position: relative;
	vertical-align: middle;
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

.mainEntryPlayerShip {
	margin-left: 2px;
	padding: 0px 5px !important;
}
</style>
