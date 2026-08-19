<script setup>
import * as rf from "../js/INDreference"
import * as view from "../js/INDview"
import * as model from "../js/INDmodel"
import * as controller from "../js/INDcontroller"
import * as Bot from "../js/INDbot"
import * as IO from "../backend/IND_IO"
import * as map from "../js/INDmap"

import AutoShip from "./AutoShip.vue"
import ManualShip from "./ManualShip.vue"
import HistoryEntry from "./HistoryEntry.vue"

import { ref, computed, watch, onUnmounted } from "vue"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
import MergerBiddingTable from "./MergerBiddingTable.vue"
const personal = usePersonalStore()

//const confirmTournamentReplacement = ref(false)

const turnbidAmount = ref(0)
const isValidBid = ref(true)

const decrement = (value) => {
	turnbidAmount.value = Math.max(0, turnbidAmount.value - value)
	validateTurnOrderBidInput()
}

const increment = (value) => {
	turnbidAmount.value = Math.min(controller.currentPlayerObj().moneyCash, turnbidAmount.value + value)
	validateTurnOrderBidInput()
}

// 1. Check if the current player can afford the bid (including subsidies)
const canAffordBid = computed(() => {
	const player = controller.currentPlayerObj()
	const nominal = store.ongoingVars.nominalValue

	// Base cash check
	if (player.moneyCash >= nominal || store.hiddenMoney) return true

	// Merger Subsidy check (if applicable)
	if (store.useMergerSubsidy) {
		const subsidyLevel = player.RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1
		const totalAvailable = player.moneyCash + subsidyLevel * rf.MERGER_SUBSIDY_MULTIPLIER
		return totalAvailable >= nominal
	}

	return false
})

// 2. Identify if the current player has an active auto-bid set up
const hasAutoBid = computed(() => {
	return store.ongoingVars.preBidData.some((entry) => entry[0] === controller.currentPlayerIndex())
})

// 3. Get the value of the auto-bid limit for the current player
const getAutoBidVal = computed(() => {
	const data = store.ongoingVars.preBidData.find((entry) => entry[0] === controller.currentPlayerIndex())
	return data ? data[1] : null
})

// 4. Determine if the auto-bid is a "Strict/Final" bid (Pass if outbid)
const isFinalBid = computed(() => {
	const data = store.ongoingVars.preBidData.find((entry) => entry[0] === controller.currentPlayerIndex())
	return data ? data[2] === 1 : false
})

const effectiveBidAmount = computed(() => {
	// If the player isn't bidding yet (bid is 0), show forecast for the current high bid
	// Otherwise, show forecast for the bid they are currently selecting
	return store.context.selectedMergerBid === 0 ? store.ongoingVars.currentBid : store.context.selectedMergerBid
})

// 5. Get the height of the company card stack dynamically
function getSlotHeight(playerEntryIndex) {
	const slot = store.players[playerEntryIndex[0]].slots[playerEntryIndex[1]]
	return slot.length > 1 ? 79 + 10 * slot.length + "px" : "79px"
}

// 6. Check if the company in the slot is a shipping company
function isShippingCompany(playerEntryIndex) {
	const companyID = store.players[playerEntryIndex[0]].slots[playerEntryIndex[1]][0]
	const data = model.getActiveCompanyDataFromID(companyID)
	return data.type === rf.COMPANY_SHIPPING
}

// 7. Get the specific data object for the primary company in a slot
function getCompanyData(playerEntryIndex) {
	const companyID = store.players[playerEntryIndex[0]].slots[playerEntryIndex[1]][0]
	return model.getActiveCompanyDataFromID(companyID)
}

const validateTurnOrderBidInput = () => {
	isValidBid.value = !isNaN(turnbidAmount.value) && turnbidAmount.value !== "" && turnbidAmount.value >= 0 && turnbidAmount.value <= controller.currentPlayerObj().moneyCash
	if (isValidBid.value) {
		// update the entry
		let entry = store.ongoingVars.newTurnOrderBids.find((entry) => entry[0] === controller.currentPlayerIndex())
		entry[1] = turnbidAmount.value
		store.ongoingVars.newTurnOrderBids.sort((a, b) => {
			// First, sort by turnBidAmount
			if (a[1] * a[2] !== b[1] * b[2]) {
				return b[1] * b[2] - a[1] * a[2]
			} else {
				// If turnBidAmounts are equal, sort by playerIndex
				const playerIndexA = a[0]
				const playerIndexB = b[0]

				// Find the indices in store.gameflow.fullTurnOrder
				const indexA = store.gameflow.fullTurnOrder.indexOf(playerIndexA)
				const indexB = store.gameflow.fullTurnOrder.indexOf(playerIndexB)

				return indexA - indexB
			}
		})
	}
}

const localConfirmTurnBid = () => {
	store.ongoingVars.newTurnOrderBids.sort((a, b) => {
		// First, sort by turnBidAmount
		if (a[1] * a[2] !== b[1] * b[2]) {
			return b[1] * b[2] - a[1] * a[2]
		} else {
			// If turnBidAmounts are equal, sort by playerIndex
			const playerIndexA = a[0]
			const playerIndexB = b[0]

			// Find the indices in store.gameflow.fullTurnOrder
			const indexA = store.gameflow.fullTurnOrder.indexOf(playerIndexA)
			const indexB = store.gameflow.fullTurnOrder.indexOf(playerIndexB)

			return indexA - indexB
		}
	})
	let entry = store.ongoingVars.newTurnOrderBids.find((entry) => entry[0] === controller.currentPlayerIndex())
	model.addHistory(rf.HIST_TURN_ORDER_BID, controller.currentPlayerIndex(), 0, [entry[1], entry[2]])
	store.context.action = rf.ACT_CONFIRM_END_TURN
	localEndPlayerTurn()
}

function resetWholePlayerTurn() {
	store.clearVars()

	turnbidAmount.value = 0

	model.resetWholeTurn()
	controller.startPlayerTurn()
}

function restartGoodJourney() {
	store.clearVars()
	model.restartGoodJourney()
}
function localEndPlayerTurn() {
	turnbidAmount.value = 0
	controller.endPlayerTurn()
}

function getOrdinal(num) {
	if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
	else if (num === 5) return "5th"
}

function localClickResign() {
	if (store.context.action !== rf.ACT_CONFIRM_RESIGN) store.context.action = rf.ACT_CONFIRM_RESIGN
	else Bot.actionResign()
}

function cancelKickout() {
	personal.kickoutRequired = 0
}

function passKickout() {
	store.context.selectedMergerBid = 0
	personal.kickoutRequired = 0
	personal.removeCurrentFlexTime = true
	personal.removeCurrentFlexTimeName = controller.currentPlayerObj().name

	if (store.gameflow.phase === rf.PHASE_BID_TURN_ORDER) {
		if (!store.ongoingVars.newTurnOrderBids.some((entry) => entry[0] === controller.currentPlayerIndex())) {
			store.ongoingVars.newTurnOrderBids.push([controller.currentPlayerIndex(), 0, model.getBidMultiplierAmount(controller.currentPlayerIndex())])
		}
	} else if (store.gameflow.phase === rf.PHASE_OPERATIONS) {
		let compOperated = false
		// Mark the slot comps as used
		for (let i = 0; i < controller.currentPlayerObj().slots.length; i++) {
			if (controller.currentPlayerObj().slots[i].length > 0 && !model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[i][0].operated)) {
				for (let j = 0; j < controller.currentPlayerObj().slots[i].length; j++) {
					let company = model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[i][j])
					company.operated = true
					// Mark land terrs as used
					if (rf.LAND_COMPANIES.includes(company.type)) {
						for (let k = 0; k < company.territories.length; k++) {
							company.territories[k][1] = true
						}
					}
				}
				compOperated = true
				break
			}
			if (compOperated) break
		}
	}
	localEndPlayerTurn()
}

function getFlexiKickoutTImerText() {
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	let hoursToGo = String(Math.floor(personal.flexiSecondsToNextKickout / 60 / 60))
	let minsToGo = String(Math.floor((personal.flexiSecondsToNextKickout % 3600) / 60)).padStart(2, "0")
	let secsToGo = String(Math.floor(personal.flexiSecondsToNextKickout % 60)).padStart(2, "0")

	return hoursToGo + ":" + minsToGo + ":" + secsToGo
}

function currentKickoutTarget() {
	return controller.currentPlayerObj().name
}
function myKickoutVote() {
	return store.kickoutVotesData[personal.name]
}
function canKickoutNow() {
	const target = currentKickoutTarget()
	const myVote = myKickoutVote()
	if (myVote) {
		if (myVote[0] === target) {
			if (new Date().getTime() - myVote[1] > rf.KICKOUT_SOLO_DELAY_MS) return true
		} else if (new Date().getTime() - myVote[1] > rf.KICKOUT_SOLO_DELAY_MS) {
			// My 2 day old vote is for someone else, so clear the requirement for the target
			personal.kickoutRequired = 0
			return false
		}
	}
	if (store.kickoutVoteThreshold === 1) return true
	return false
}
function kickoutVoteCount() {
	return Object.values(store.kickoutVotesData).filter((vote) => vote[0] === currentKickoutTarget()).length
}
function kickoutVoters() {
	let names = []
	for (const voter in store.kickoutVotesData) {
		const vote = store.kickoutVotesData[voter]
		if (vote[0] === currentKickoutTarget()) names.push(voter)
	}
	return names.join(", ")
}
function isLastVoteRequired() {
	return kickoutVoteCount() + 1 >= store.kickoutVoteThreshold
}
const soloKickoutCountdown = ref("")
function updateSoloKickoutCountdown() {
	const myVote = myKickoutVote()
	if (!myVote || myVote[0] !== currentKickoutTarget()) {
		soloKickoutCountdown.value = ""
		return
	}
	const remainingMs = Math.max(rf.KICKOUT_SOLO_DELAY_MS - (new Date().getTime() - myVote[1]), 0)
	const totalSeconds = Math.floor(remainingMs / 1000)
	const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0")
	const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")
	const seconds = String(totalSeconds % 60).padStart(2, "0")
	soloKickoutCountdown.value = hours + ":" + minutes + ":" + seconds
	if (remainingMs <= 0) {
		soloKickoutCountdown.value = ""
		return
	}
}
watch(
	() => store.kickoutVotesData[personal.name],
	() => {
		updateSoloKickoutCountdown()
		if (soloKickoutCountdown.value !== "") {
			if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
			personal.kickoutCountdownIntervalTimer = setInterval(updateSoloKickoutCountdown, 1000)
		}
	},
	{ immediate: true }
)
onUnmounted(() => {
	if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
})
/*function localReplaceExternalTournamentPlayer() {
	IO.replaceExternalTournamentPlayer()
	confirmTournamentReplacement.value = false
}*/

function clickedEraCard(cardID) {
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap) && controller.currentPlayerObj().eraCards.filter((card) => rf.ALL_ERA_CARDS[card].era === store.gameflow.currentEra).length !== 2) return
	if (store.mapData.selectedMap === rf.MAP_AEGEAN && controller.currentPlayerObj().eraCards.filter((handCardID) => rf.AG_ALL_ERA_CARDS.find((card) => card.id === handCardID).era === store.gameflow.currentEra).length !== 2) return
	if (store.mapData.selectedMap === rf.MAP_PHP && controller.currentPlayerObj().eraCards.filter((handCardID) => rf.PH_ALL_ERA_CARDS.find((card) => card.id === handCardID).era === store.gameflow.currentEra).length !== 2) return
	store.context.selectedEraCard = cardID
	model.setupEraCardHighlights(cardID)
}

function getRNDoptions() {
	let possibleRND = [[-1, "Select a Category to Research"]]
	for (let i = 0; i < controller.currentPlayerObj().RnD.length; i++) {
		// Add hull capacity options at the end
		if (i == 4) continue
		const rndLevel = controller.currentPlayerObj().RnD[i]
		if (rndLevel < 5) possibleRND.push([i, "" + rf.RND_STRINGS[i] + " : " + model.getRndDisplayValue(i, rndLevel) + " ► " + model.getRndDisplayValue(i, rndLevel + 1)])
	}
	const ownHullLevel = controller.currentPlayerObj().RnD[4]
	if (ownHullLevel < 5) possibleRND.push([4, " Your " + rf.RND_STRINGS[4] + " : " + ownHullLevel + " ► " + (ownHullLevel + 1)])
	for (let i = 0; i < store.players.length; i++) {
		const hullLevel = store.players[i].RnD[4]
		if (i !== controller.currentPlayerIndex() && hullLevel < 5) {
			possibleRND.push([String(4) + String(i), store.players[i].displayName + "'s " + rf.RND_STRINGS[4] + " : " + hullLevel + " ► " + (hullLevel + 1)])
		}
	}
	return possibleRND
}

function getRNDoptionsPreMove() {
	if (personal.pov < 0) return [[-1, "No POV"]]
	let playerObj = store.players[personal.pov]
	let possibleRND = [[-1, "Select a Category to Research"]]
	for (let i = 0; i < playerObj.RnD.length; i++) {
		// Add hull capacity options at the end
		if (i == 4) continue
		const rndLevel = playerObj.RnD[i]
		if (rndLevel < 5) possibleRND.push([i, "" + rf.RND_STRINGS[i] + " : " + model.getRndDisplayValue(i, rndLevel) + " ► " + model.getRndDisplayValue(i, rndLevel + 1)])
	}
	const ownHullLevel = playerObj.RnD[4]
	if (ownHullLevel < 5) possibleRND.push([4, " Your " + rf.RND_STRINGS[4] + " : " + ownHullLevel + " ► " + (ownHullLevel + 1)])
	for (let i = 0; i < store.players.length; i++) {
		const hullLevel = store.players[i].RnD[4]
		if (i !== personal.pov && hullLevel < 5) {
			possibleRND.push([String(4) + String(i), store.players[i].name + "'s " + rf.RND_STRINGS[4] + " : " + hullLevel + " ► " + (hullLevel + 1)])
		}
	}
	return possibleRND
}

function localPassAcquisitiosn() {
	store.context.selectedMergerBid = 0
	store.resetOngoingVars(true)
	store.context.action = rf.ACT_CONFIRM_END_TURN
	localEndPlayerTurn()
}

function localPassMergerTurn() {
	store.context.action = rf.ACT_CONFIRM_END_TURN
	localEndPlayerTurn()
}

function localSkipExpansion() {
	store.clearMessages()
	store.context.historyObj.push([-2])
	model.stopExpandingEarly()
	localEndPlayerTurn()
}

function localStopPaidExpansion() {
	if (store.context.currentGoodJourney.length > 0) {
		// If it's ONLY paid expansions, concat it
		if (store.context.historyObj.length === 2 && store.context.historyObj[1][0] === -1) store.context.historyObj[1] = [...store.context.historyObj[1], ...store.context.currentGoodJourney]
		// Otherwise, concat with the last entry
		else store.context.historyObj[store.context.historyObj.length - 1] = [...store.context.historyObj[store.context.historyObj.length - 1], ...store.context.currentGoodJourney]
	} else {
		if (store.context.historyObj.length === 2) store.context.historyObj[1][0] = -2
		else store.context.historyObj[store.context.historyObj.length - 1][0] = -2
	}
	model.stopExpandingEarly()
}

function researchFromSelect() {
	let selevtValue = store.context.selectDropdownRND
	let RNDidx = 0
	if (selevtValue.length === 1) {
		RNDidx = parseInt(selevtValue)
		model.upgradeRND(controller.currentPlayerIndex(), RNDidx)
		localEndPlayerTurn()
	} else if (selevtValue.length === 2) {
		RNDidx = parseInt(selevtValue[0])
		let playerIndex = parseInt(selevtValue[1])
		model.upgradeRND(playerIndex, RNDidx)
	}
}

function getLatestMergerBiddingIndex() {
	let index = store.computedHistory.length - 1
	while (store.computedHistory[index][0] !== rf.HIST_MERGER_BIDDING) index--
	return index
}

function localConfirmDeliveries() {
	store.removeAllActiveHighlights()
	// Now check if the company has fully operated
	let slotIdx = store.context.selectedSlotToOperate
	let slotContent = controller.currentPlayerObj().slots[slotIdx]
	let allSold = true
	//let soldCount = 0
	for (let i = 0; i < slotContent.length; i++) {
		let company = model.getActiveCompanyDataFromID(slotContent[i])
		for (let j = 0; j < company.territories.length; j++) {
			if (!company.territories[j][1]) allSold = false
			//if (company.territories[j][1]) soldCount++
		}
	}
	if (allSold) {
		// You MUST expand for free
		store.context.action = rf.ACT_FREE_EXPANSION
		store.context.remainingExpansions = controller.currentPlayerObj().RnD[rf.RnD_EXPANSION_IDX]
		store.context.territoriesToHighlightBlue = [...model.getAllTerrIDsForSlot(slotContent)]
		store.context.territoriesToHighlight = [...model.getValidTerrsForExpansionFromLandSlotIdx(slotIdx)]
		if (store.context.territoriesToHighlight.length === 0) {
			store.gameMessages.actionError = "There are no valid territories to expand into"
			store.context.action = rf.ACT_CONFIRM_END_TURN
			store.context.historyObj.push(-1)
		}
	} else {
		store.context.action = rf.ACT_DECIDE_PAID_EXPANSION
	}
}

function shouldShowPreResearchOption() {
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
	if (IO.DEBUG_USERS.includes(personal.name)) return true
	// If not in the game, then no
	if (personal.pov !== 0 && !personal.pov) return false
	if (personal.pov < 0) return false
	if (personal.trainingGame) return false
	if (store.topMenuViews.showLoader) return false
	if (personal.canPlay()) return false
	if (store.topMenuViews.showReplay) return false

	// NB ship redeploy is phase 10. This could cause server to delete all premoves, i think
	if (![rf.PHASE_NEW_ERA, rf.PHASE_BID_TURN_ORDER, rf.PHASE_MERGERS, rf.PHASE_MERGER_BIDDING, rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS, rf.PHASE_MERGER_SHIP_REDEPLOYMENT, rf.PHASE_ACQUISITIONS, rf.PHASE_R_AND_D].includes(store.gameflow.phase)) return false
	if (store.gameflow.phase === rf.PHASE_R_AND_D && !store.gameflow.turnOrder.includes(personal.pov)) return false
	return true
}

function getResearchPreMove() {
	if (personal.pov < 0) return "No POV"
	let playerObj = store.players[personal.pov]
	if (playerObj.preMoves[0] === personal.name && playerObj.preMoves[1].includes(rf.PRE_PHASE_R_AND_D)) {
		let moveData = playerObj.preMoves[3]
		// First, check the current turn
		if (moveData[0] !== store.gameflow.turn) {
			playerObj.preMoves.splice(0)
			return "No Data (Data from old turn)"
		}

		// Process YOUR RnD
		let idxToResearch = moveData[1]
		if (idxToResearch <= 9) {
			const rndLevel = playerObj.RnD[idxToResearch]
			if (moveData[2] !== playerObj.RnD[idxToResearch]) {
				playerObj.preMoves.splice(0)
				return "No Data (Move no longer available)"
			}
			return "" + rf.RND_STRINGS[idxToResearch] + " : " + model.getRndDisplayValue(idxToResearch, rndLevel) + " ► " + model.getRndDisplayValue(idxToResearch, rndLevel + 1)
		}

		if (idxToResearch >= 10) {
			let idxToResearchString = idxToResearch.toString()
			let rndIdx = parseInt(idxToResearchString[0])
			let playerIdx = parseInt(idxToResearchString[1])
			const hullLevel = store.players[playerIdx].RnD[4]
			return store.players[playerIdx].name + "'s " + rf.RND_STRINGS[rndIdx] + " : " + hullLevel + " ► " + (hullLevel + 1)
		}

		/*for (let i = 0; i < store.players.length; i++) {
		const hullLevel = store.players[i].RnD[4]
		if (i !== controller.currentPlayerIndex() && hullLevel < 5) {
			possibleRND.push([String(4) + String(i), store.players[i].name + "'s " + rf.RND_STRINGS[4] + " : " + hullLevel + " ► " + (hullLevel + 1)])
		}*/
	}
	return "No Data"
}

function localSavePreResearch() {
	let preMoveInt = parseInt(store.context.selectDropdownRND)
	// Save the turn, the idx, and the current value
	if (preMoveInt >= 0 && preMoveInt <= 9) IO.savePreTurn(rf.PRE_PHASE_R_AND_D, [store.gameflow.turn, preMoveInt, store.players[personal.pov].RnD[preMoveInt]])
	else if (preMoveInt >= 10) IO.savePreTurn(rf.PRE_PHASE_R_AND_D, [store.gameflow.turn, preMoveInt, -1])
	else IO.savePreTurn(rf.PRE_PHASE_R_AND_D, [])
	store.context.selectDropdownRND = -1
}
function localCancelResearch() {
	IO.savePreTurn(rf.PRE_PHASE_R_AND_D, [])
	store.context.selectDropdownRND = -1
}

function selectC0() {
	store.context.action = rf.ACT_NONE
	store.context.territoriesToHighlight.push(rf.PH_C_0)
	//store.context.territoriesToHighlight = [...rf.OM_TERR_ID_TO_PATH_ID]
}
</script>

<template>
	<div
		id="actionsDiv"
		:style="{
			'min-height': (personal.canPlay() || personal.trainingGame) && !store.topMenuViews.showReplay ? '200px' : '',
		}">
		<template v-if="personal.name == undefined">
			<div id="loggedOutText">
				Please
				<a href="/register">REGISTER</a>
				or
				<a href="/login">LOGIN</a>
				to play a game
				<br />
			</div>
			<br />
		</template>

		<!-- TOURNAMENT ADMIN KICKOUT BUTTON -->
		<!--<template v-if="IO.SUPER_USERS.includes(personal.name) && personal.isTournamentGame">
			<template v-if="confirmTournamentReplacement === false">
				<button class="actionsLineButton" @click="confirmTournamentReplacement = true">
					Confirm Replacement For:
					<b>{{ controller.currentPlayerObj().name }}</b>
				</button>
			</template>
			<template v-if="confirmTournamentReplacement === true">
				<br />
				<br />
				Are you sure you want to replace
				<b>{{ controller.currentPlayerObj().name }}</b>
				?
				<br />
				<br />
				This action cannot be undone.
				<br />
				<br />
				This action will delete current rewind data.
				<br />
				<br />
				The INDtourneyAdmin player will replace
				<b>{{ controller.currentPlayerObj().name }}</b>
				.
				<br />
				<br />
				Mr.Moo will get notifications, and this game will show up in "Current Games".
				<br />
				<br />
				<button class="actionsLineButton" @click="confirmTournamentReplacement = false">CANCEL</button>
				<button class="actionsLineButton" @click="localReplaceExternalTournamentPlayer()">
					CONFIRM Kick and replacement for
					<b>{{ controller.currentPlayerObj().name }}</b>
				</button>
			</template>
		</template>-->

		<!-- KICKOUT INFO -->
		<template v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
			<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
				Player
				<b>{{ controller.currentPlayerObj().name }}</b>
				has used all the standard kickout time.
				<br />
				<br />
				Remaining Flex-Time:
				<span id="flexiKickoutTimerSpan">{{ getFlexiKickoutTImerText() }}</span>
				<br />
				<br />
				For more information see
				<b><a href="/help/" target="_blank">Help</a></b>
			</div>
			<div v-else-if="personal.externalTournamentGame" id="kickoutDiv">
				Under the tournament rules set by the external tournament organisers, you cannot kick other players from this type of tournament game
				<br />
				<br />
				Please use the button below to alert the admins, who will continue to make moves for this player
				<br />
				<br />
				<br />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>

				<button class="actionsLineButton" @click="IO.nudgeTourneyAdmins(1)">Alert Admins</button>
			</div>

			<div v-else id="kickoutDiv">
				<template v-if="canKickoutNow()">
					<template v-if="store.context.action !== rf.ACT_CONFIRM_KICKOUT">
						Player
						<b>{{ controller.currentPlayerObj().name }}</b>
						has timed out
						<br />
						To kick out
						<b>{{ controller.currentPlayerObj().name }}</b>
						press Confirm Kickout
						<br />
						The game will proceed to the next player/phase/turn
						<br />
						<br />
						Otherwise you can allow
						<b>{{ controller.currentPlayerObj().name }}</b>
						more time - reload the page to initiate kickout again
						<br />

						<br />
						<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>
						<span>
							<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{ controller.currentPlayerObj().name }} in the game - but end their current turn</button>
						</span>
						<span><button class="actionsLineButton" id="confirmKickoutButton" @click="store.context.action = rf.ACT_CONFIRM_KICKOUT">Confirm Kickout</button></span>
					</template>
					<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
						This will permanently remove
						<b>{{ controller.currentPlayerObj().name }}</b>
						from the game
						<br />
						<b>It cannot be undone</b>
						<br />
						<br />
						Try checking the chat in case they have given a reason for any temporary absence
						<br />
						Please consider giving them a short grace period, in case they are just delayed

						<br />
						<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>
						<span>
							<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">Permanently Kickout {{ controller.currentPlayerObj().name }}</button>
						</span>
					</template>
				</template>
				<template v-else>
					<br />
					Player
					<b>{{ controller.currentPlayerObj().name }}</b>
					has timed out
					<br />
					A vote from the other players is needed to kick out
					<b>{{ controller.currentPlayerObj().name }}</b>
					<br />
					<br />
					Votes: {{ kickoutVoteCount() }}/{{ store.kickoutVoteThreshold }} ({{ kickoutVoters() }})
					<br />
					<br />
					<span v-if="!myKickoutVote()">
						<template v-if="isLastVoteRequired()">
							This will permanently remove
							<b>{{ controller.currentPlayerObj().name }}</b>
							from the game
							<br />
							<b>It cannot be undone</b>
							<br />
							<br />
						</template>
						<button class="actionsLineButton" id="voteKickoutButton" @click="Bot.actionPlayerKickout">Vote to Kickout {{ controller.currentPlayerObj().name }}</button>
					</span>
					<span v-else>
						You have voted to kick out
						<b>{{ controller.currentPlayerObj().name }}</b>
						<br />
						If the other players do not also vote, you will be able to kick them out directly in
						{{ soloKickoutCountdown }}
					</span>
					<br />
					<br />
					<span>
						<button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button>
					</span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{ controller.currentPlayerObj().name }} in the game - but end their current turn</button>
					</span>
				</template>
			</div>
		</template>

		<!-- REWIND ERROR TEXT -->
		<template v-if="store.gameMessages.rewindErrorText !== ''">
			<h1 id="rewindErrorText">{{ store.gameMessages.rewindErrorText }}</h1>
		</template>
		<template v-if="store.gameMessages.errorText !== ''">
			<h1 id="rewindErrorText">{{ store.gameMessages.errorText }}</h1>
		</template>
		<template v-if="store.gameMessages.successText !== ''">
			<h1 id="successText">{{ store.gameMessages.successText }}</h1>
		</template>

		<!-- EXPERT PANEL - PRE-RESEARCH TURN -->
		<template v-if="shouldShowPreResearchOption()">
			<br />
			<div class="expertPanel">
				<b>Expert Options</b>
				: If unsure then ignore
				<hr />
				<span class="preMoveDataSpan">
					{{ getResearchPreMove() }}
					<span v-if="personal.name === 'admin' && personal.pov >= 0">{{ store.players[personal.pov].preMoves }}</span>
				</span>
				&nbsp;&nbsp;
				<label class="choiceLabel" for="dropdownRND_PRE">Set Research:</label>
				<select name="dropdownRND_PRE" id="dropdownRND_PRE" class="actionsLineSelect" @change="store.context.selectDropdownRND = $event.target.value">
					<option v-for="(optionArr, idx) in getRNDoptionsPreMove()" :key="idx" :value="optionArr[0]">{{ optionArr[1] }}</option>
				</select>
				<button :disabled="parseInt(store.context.selectDropdownRND) === -1" class="actionsLineButton" @click="localSavePreResearch">Save Research Turn</button>
				<span v-if="getResearchPreMove() !== 'No Data'">
					<br />
					<button class="actionsLineButton" @click="localCancelResearch">Cancel Research Turn</button>
				</span>
			</div>
		</template>

		<!-- ALWAYS SHOWS ON TURN 0 -->
		<template v-if="store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_NEW_ERA && !store.topMenuViews.showReplay && store.topMenuViews.showIntroInfo">
			<h2>Welcome to Indonesia!</h2>
			<b>
				You can view your Era cards in the "Cards" section"
				<img :src="view.getImage('icon-hand-card')" class="helpImage infoIcon" />
				<br />
				Change the map using "Settings"
				<img :src="view.getImage('icon-cog')" class="helpImage infoIcon" />
				<br />
				You can expand/collapse the player table using the button next to it
				<br />
				View the phase order above the player table
				<br />
				Don't forget to set your Indonesia Preferences!
				<a class="linkOther" href="/profileIND" target="_blank">Indonesia Preferences</a>
				<br />
				For more information please see
				<a class="linkOther" href="/IND/help/" target="_blank">Indonesia Help</a>
			</b>
			<br />
			<br />
		</template>
		<template v-else-if="store.topMenuViews.showIntroInfo === false">
			<button class="actionsLineButton" @click="store.topMenuViews.showIntroInfo = true">Show Help</button>
		</template>

		<!-- ALWAYS SHOWS GAME END-->
		<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
			<div id="gameEndDiv">
				Game Over
				<br />
				<br />
				<!-- BOT WIN -->
				<template v-if="store.history[store.history.length - 1][3].length === 1">
					Winner:
					<div class="playerScoreSummaryDiv">
						<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][0]].colour)">{{ store.players[store.history[store.history.length - 1][3][0]].displayName }}</span>
					</div>

					<br />
					<br />
					Last Man Standing
					<br />
					<br />
				</template>
				<template v-else>
					Winner:
					<div class="playerScoreSummaryDiv">
						<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][0][0]].colour)">{{ store.players[store.history[store.history.length - 1][3][0][0]].displayName }}</span>
					</div>
					{{ store.history[store.history.length - 1][3][0][1] }}
					<!-- Winner Reason -->
					<span v-if="store.history[store.history.length - 1][3][0][1] === store.history[store.history.length - 1][3][1][1]">- (Higher in Turn Order)</span>

					<br />
					<template v-if="store.players[store.history[store.history.length - 1][3][0][0]].name === personal.name">
						<h1>Congratulations!</h1>
					</template>
					<!-- REASON -->
					<template v-for="(finalEntry, idx) in store.history[store.history.length - 1][3].slice(1)" :key="idx">
						{{ getOrdinal(idx + 2) }}:
						<div class="playerScoreSummaryDiv">
							<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[finalEntry[0]].colour)">{{ store.players[finalEntry[0]].displayName }}</span>
						</div>
						{{ finalEntry[1] }}
						<template v-if="idx !== store.history[store.history.length - 1][3].length - 2">
							<span v-if="finalEntry[1] === store.history[store.history.length - 1][3][idx + 2][1]">- (Higher in Turn Order)</span>
						</template>
						<template v-else>- (Enjoying the beaches)</template>
						<br />
					</template>
					<br />
					<br />
				</template>
				Fancy a
				<a :href="'/createINDpage/' + String(personal.gameID) + '/'">rematch</a>
				?
				<br />
				<br />
			</div>
		</template>

		<!-- Not your turn, map insector button -->
		<!--<template v-if="!personal.canPlay() && !store.topMenuViews.showReplay">
			<div id="mapInspectorButtonDiv">
				<button @click="model.toggleMapInspector" class="actionsLineButton">
					<span v-if="!store.topMenuViews.mapInspectorMode">Enable</span>
					<span v-else>Disable</span>
					<br />
					Map
					<br />
					Inspector
				</button>
				<template v-if="store.topMenuViews.mapInspectorMode">
					<br />
					<input type="checkbox" id="mapInspectorEshuCheckbox" v-model="store.topMenuViews.mapInspectorEshu" />
					<label for="mapInspectorEshuCheckbox">Use Eshu</label>
				</template>
			</div>
			<template v-if="store.topMenuViews.mapInspectorMode && !store.topMenuViews.showReplay">
				<br />
				Click a territory to show neighbours
				<br />
			</template>
		</template>-->

		<!-- SHOW CURRENT TURN ORDER BIDS IF NOT YOUR TURN -->
		<template v-if="!personal.canPlay() && store.gameflow.phase === rf.PHASE_BID_TURN_ORDER">
			<div id="actions">
				<template v-if="store.ongoingVars.newTurnOrderBids.length > 0">
					Current new turn order:
					<template v-for="(entry, idx) in store.ongoingVars.newTurnOrderBids" :key="idx">
						<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].displayName }} ({{ entry[1] * entry[2] }})</span>
					</template>
					<br />
					<br />
				</template>
				<template v-else>
					No turn order bids
					<br />
					<br />
				</template>
			</div>
		</template>

		<!-- SHOW CURRENT MERGER BIDDING IF NOT YOUR TURN -->
		<template v-if="!personal.canPlay() && store.gameflow.phase === rf.PHASE_MERGER_BIDDING">
			<HistoryEntry :entry="store.computedHistory[getLatestMergerBiddingIndex()]" :entry_-i-d="getLatestMergerBiddingIndex()" />
		</template>

		<template v-if="personal.canPlay()">
			<div id="actions">
				<span class="actionError" v-if="store.gameMessages.actionError !== ''">
					<br />
					{{ store.gameMessages.actionError }}
					<br />
				</span>

				<!-- NO ACTIONS -->

				<!-- NEW ERA > PLACE CITY -->
				<template v-if="store.gameflow.phase === rf.PHASE_NEW_ERA && store.context.action !== rf.ACT_CONFIRM_END_TURN">
					<!-- Display relevant era cards-->
					<template v-if="controller.currentPlayerObj().eraCards.length === 6">Select an Era card and then place a city</template>
					<template v-else>Place a city in a territory on your Era Card</template>
					<br />
					<template v-for="(cardID, idx) in controller.currentPlayerObj().eraCards" :key="idx">
						<template v-if="rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)">
							<img v-if="rf.ALL_ERA_CARDS[cardID].era === store.gameflow.currentEra" class="currentEraCard" :src="view.getImage(view.findEraCardGfxCodeFromID(cardID))" alt="Era Card" :class="[{ selectableEraCard: controller.currentPlayerObj().eraCards.filter((card) => rf.ALL_ERA_CARDS[card].era === store.gameflow.currentEra).length === 2 }, { selectedEraCard: store.context.selectedEraCard === cardID }]" @click="clickedEraCard(cardID)" />
						</template>
						<template v-else-if="store.mapData.selectedMap === rf.MAP_AEGEAN">
							<img v-if="rf.AG_ALL_ERA_CARDS.find((card) => card.id === cardID).era === store.gameflow.currentEra" class="currentEraCard" :src="view.getImage(view.findEraCardGfxCodeFromID(cardID))" alt="Era Card" :class="[{ selectableEraCard: controller.currentPlayerObj().eraCards.filter((handCardID) => rf.AG_ALL_ERA_CARDS.find((card) => card.id === handCardID).era === store.gameflow.currentEra).length === 2 }, { selectedEraCard: store.context.selectedEraCard === cardID }]" @click="clickedEraCard(cardID)" />
						</template>
						<template v-else-if="store.mapData.selectedMap === rf.MAP_PHP">
							<img v-if="rf.PH_ALL_ERA_CARDS.find((card) => card.id === cardID).era === store.gameflow.currentEra" class="currentEraCard" :src="view.getImage(view.findEraCardGfxCodeFromID(cardID))" alt="Era Card" :class="[{ selectableEraCard: controller.currentPlayerObj().eraCards.filter((handCardID) => rf.PH_ALL_ERA_CARDS.find((card) => card.id === handCardID).era === store.gameflow.currentEra).length === 2 }, { selectedEraCard: store.context.selectedEraCard === cardID }]" @click="clickedEraCard(cardID)" />
						</template>
					</template>
				</template>

				<!-- TURN ORDER BID -->
				<template v-if="store.gameflow.phase === rf.PHASE_BID_TURN_ORDER && store.context.action !== rf.ACT_CONFIRM_RESIGN">
					<div class="actionsPanel">
						<!-- Header and Current Order in one line -->
						<div class="bid-header-compact">
							<span class="bid-title-compact">Turn Order Bidding:</span>
							<span class="current-order-compact">
								<template v-if="store.ongoingVars.newTurnOrderBids.length > 0">
									<template v-for="(entry, idx) in store.ongoingVars.newTurnOrderBids" :key="idx">
										<span class="mainEntryPlayer limitedPlayerNameSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].displayName }}({{ entry[1] * entry[2] }})</span>
									</template>
								</template>
								<template v-else>
									<span class="no-bids-compact">No bids yet</span>
								</template>
							</span>
						</div>

						<!-- Your Bid Info in one line -->
						<div class="yourTurnOrderBidLine">
							<span class="bid-label-compact">Your bid:</span>
							<span class="bid-value-compact primary">{{ turnbidAmount * model.getBidMultiplierAmount(controller.currentPlayerIndex()) }}</span>
							<span class="bid-detail-compact">({{ turnbidAmount }} × {{ model.getBidMultiplierAmount(controller.currentPlayerIndex()) }}x)</span>
							<span class="bid-cash-compact">
								Remaining Cash:
								<span class="cashIconTurnOrderBid">💵</span>
								{{ controller.currentPlayerObj().moneyCash - turnbidAmount }}
							</span>
						</div>

						<!-- Bid Controls and Actions -->
						<template v-if="store.context.action !== rf.ACT_CONFIRM_END_TURN">
							<div class="bid-controls-compact">
								<div class="bid-stepper-compact">
									<button class="actionsLineButton" @click="decrement(controller.currentPlayerObj().moneyCash)">0</button>
									<button class="actionsLineButton" @click="decrement(10)">-10</button>
									<button class="actionsLineButton" @click="decrement(1)">-1</button>
									<input type="number" v-model="turnbidAmount" @input="validateTurnOrderBidInput" :max="controller.currentPlayerObj().moneyCash" min="0" class="bid-input-compact" />
									<button class="actionsLineButton" @click="increment(1)">+1</button>
									<button class="actionsLineButton" @click="increment(10)">+10</button>
									<button class="actionsLineButton" @click="increment(controller.currentPlayerObj().moneyCash)">Max</button>
								</div>

								<div class="bid-actions-compact">
									<button v-if="controller.canResign()" @click="localClickResign()" class="actionsLineButton">Resign</button>
									<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset</button>
									<button class="actionsLineButton" :disabled="!isValidBid" @click="localConfirmTurnBid">
										<span v-if="!isValidBid">Invalid</span>
										<span v-else>Confirm {{ turnbidAmount }} & End Turn</span>
									</button>
								</div>
							</div>
						</template>
					</div>
				</template>

				<!-- MERGERS -->
				<template v-if="store.gameflow.phase === rf.PHASE_MERGERS">
					<template v-if="store.ongoingVars.selectedMergerInfo.length === 0">
						Choose companies to merge. You can merge at most 2 slots
						<template v-if="store.ongoingVars.passedPlayerIndexes.length > 0">
							<br />
							The following players have passed:
							<template v-for="(playerIndex, idx) in store.ongoingVars.passedPlayerIndexes" :key="idx">
								<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
							</template>
						</template>
					</template>
					<template v-else-if="store.ongoingVars.passedPlayerIndexes.length === 0"><!--None--></template>
					<br />
					<MergerBiddingTable v-if="store.ongoingVars.selectedMergerInfo.length > 0" />

					<!-- If not selected any companies, offer reset and pass-->
					<template v-else>
						<br />
						<span class="greenText">You may click a slot that is not highlighted to see why you are unable to merge that company</span>
						<br />
						<button v-if="store.context.action !== rf.ACT_CONFIRM_END_TURN" class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
						<button v-if="store.context.action !== rf.ACT_CONFIRM_END_TURN" class="actionsLineButton" @click="localPassMergerTurn">Pass Merger & End Turn</button>
					</template>
				</template>

				<!-- MERGERS BIDDING -->
				<template v-if="store.gameflow.phase === rf.PHASE_MERGER_BIDDING">
					<MergerBiddingTable />
				</template>

				<!-- PHASE: PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS-->
				<template v-if="store.gameflow.phase === rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS">
					You must remove half of the Siap Saji Territories (rounded up)
					<br />
					Territories next to exisiting Siap Saji companies have already been removed
					<br />
					You cannot split the company territories into unconnected sections
					<br />
					<br />
					Territories to remove: {{ store.context.siapFajiTerrsToRemove }}
					<br />
				</template>

				<!-- PHASE: PHASE_MERGER_SHIP_REDEPLOYMENT-->
				<template v-if="store.gameflow.phase === rf.PHASE_MERGER_SHIP_REDEPLOYMENT">
					To redeploy ships in your new shipping company, you may remove ships from territories that contain more than one
					<br />
					<br />
					Max redelpoyments remaining: {{ store.context.shippingTerrsToRedeploy.length }}
					<br />
					<br />
					<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
					<button class="actionsLineButton" @click="localEndPlayerTurn">
						<span v-if="store.context.shippingTerrsToRedeploy.length > 0">Stop Redeploying & End Turn</span>
						<span v-else>End Turn</span>
					</button>
				</template>

				<!-- PHASE: ACQUISITIONS -->
				<template v-if="store.gameflow.phase === rf.PHASE_ACQUISITIONS">
					<template v-if="store.context.action === rf.ACT_ACQUIRE_COMPANY">
						Choose a company to acquire
						<br />
						<template v-if="store.context.selectedCompanyToAcquire === -1">
							<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
							<button class="actionsLineButton" @click="localPassAcquisitiosn">Pass Acquisitions & End Turn</button>
						</template>
					</template>
					<template v-if="store.context.action === rf.ACT_FREE_EXPANSION">
						<span v-if="model.getActiveCompanyDataFromID(store.context.selectedCompanyToAcquire).type === rf.COMPANY_SHIPPING">Place a ship in your new company's starting sea zone</span>
						<span v-else>Place a goods marker in your new company's province</span>
						<br />
						<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
					</template>
				</template>

				<!-- PHASE: OPERATIONS -->
				<template v-if="store.gameflow.phase === rf.PHASE_OPERATIONS">
					<!-- No company selected -->
					<template v-if="store.context.action === rf.ACT_NONE && store.context.currentGoodJourney.length === 0">
						Select a Company in one of your slots to Operate, or select an item directly on the map
						<br />
						<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
					</template>
					<!-- Selected company OR prod marker -->
					<template v-else-if="(store.context.action === rf.ACT_NONE || store.context.action === rf.ACT_CONFIRM_ALL_DELIVERIES) && store.context.historyObj.length >= 1">
						You can ship your goods manually, or automatically using the table below
						<br />
						Auto-shipping will ship the most possible goods (as per the rules) at the cheapest cost to you
						<br />
						There may be multiple solutions with the same lowest cost
						<br />
						If you wish to pay more than the minimum cost (perhaps to reach a particular city), you should ship your goods manually
						<br />
						<br />
						<div
							class="shippingContainers"
							:style="{
								minHeight: 229 + store.context.maxPoss * 61 + 'px',
							}">
							<div class="shippingContainer">
								<!-- AUTO SHIP -->
								<AutoShip />
								<!-- END AUTO SHIP -->
							</div>
							<div class="shippingContainer">
								<ManualShip />
							</div>
						</div>

						<br />
						To ship your goods manually, select a production marker on the map
						<br />
						You can then select eligible ships, or a city if it is connected to the current ship
						<br />
						<br />
						You must ship: {{ store.context.maxPoss - (store.context.historyObj.length - 1) }}
						<span v-if="store.context.maxPoss - (store.context.historyObj.length - 1) !== 1">goods</span>
						<span v-else>good</span>
						<br />
						(Total {{ store.context.maxPoss }}
						<span v-if="store.context.maxPoss !== 1">goods</span>
						<span v-else>good</span>
						)

						<br />
						<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
						<button v-if="store.context.currentGoodJourney.length > 1" class="actionsLineButton" @click="restartGoodJourney">Restart Good Shipment</button>
						<button v-if="store.context.action === rf.ACT_CONFIRM_ALL_DELIVERIES" class="actionsLineButton" @click="localConfirmDeliveries">Confirm Deliveries</button>
					</template>

					<template v-else-if="store.context.action === rf.ACT_FREE_EXPANSION">
						You Must Expand For Free
						<br />
						Remaining Expansion: {{ store.context.remainingExpansions }}
						<br />
						<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
						<br />
					</template>
					<!-- Shipping company - free expansion - fully optional -->
					<template v-else-if="store.context.action === rf.ACT_EXPAND_COMPANY && store.context.remainingExpansions > 0 && model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).type === rf.COMPANY_SHIPPING">
						You may expand your Shipping Company for free
						<br />
						Remaining Expansion: {{ store.context.remainingExpansions }} (Expansion R&D: {{ controller.currentPlayerObj().RnD[rf.RnD_EXPANSION_IDX] }}, Remaining Company Size: {{ model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).combinedCapacity[store.gameflow.currentEra] - model.getSlotTerrSize(controller.currentPlayerIndex(), store.context.selectedSlotToOperate) }})
						<br />
						<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
						<button class="actionsLineButton" @click="model.stopExpandingEarly">Stop Expanding</button>
						<br />
					</template>
					<!-- Land Company - OFFER paid expansion -->
					<template v-else-if="store.context.action === rf.ACT_DECIDE_PAID_EXPANSION">
						You may expand your {{ model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).typeText }} Company
						<br />
						Each Expansion will cost:
						<b>{{ model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).goodValue }}</b>
						<br />
						<template v-if="store.context.action === rf.ACT_EXPAND_COMPANY">
							Remaining Expansion: {{ store.context.remainingExpansions }}
							<br />
						</template>
						<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
						<button class="actionsLineButton" @click="localSkipExpansion">Skip Expansion & End Turn</button>
						<button class="actionsLineButton" @click="model.setupPaidExpansion">Pay for Expansions</button>
					</template>
					<!-- Land Company - Paid Expansion -->
					<template v-else-if="store.context.action === rf.ACT_EXPAND_COMPANY && store.context.remainingExpansions > 0 && rf.LAND_COMPANIES.includes(model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).type)">
						You may expand your {{ model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).typeText }} Company
						<br />
						Each Expansion will cost:
						<b>{{ model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).goodValue }}</b>
						<br />
						Remaining Expansion: {{ store.context.remainingExpansions }}
						<br />
						<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
						<button class="actionsLineButton" @click="localStopPaidExpansion">Stop Expanding</button>
					</template>
				</template>

				<template v-if="store.gameflow.phase === rf.PHASE_CITY_GROWTH && store.context.action !== rf.ACT_CONFIRM_END_TURN">
					There are not enough big cities to upgrade all the elgible cities
					<br />
					Select the cities you wish to upgrade
					<br />
					<br />
					<span v-if="store.context.citySize1GrowsRemaining !== 0">
						Remaining size 1 cities to upgrade: {{ store.context.citySize1GrowsRemaining }}
						<br />
						<br />
					</span>
					<span v-if="store.context.citySize2GrowsRemaining !== 0">
						Remaining size 2 cities to upgrade: {{ store.context.citySize2GrowsRemaining }}
						<br />
						<br />
					</span>
					<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
				</template>

				<!-- PHASE: RND -->
				<template v-if="store.gameflow.phase === rf.PHASE_R_AND_D">
					<template v-if="store.context.action !== rf.ACT_CONFIRM_END_TURN">
						Advance your research, or any player's Hull Capacity
						<br />
						You may click on the map, or use the dropdown box
						<br />
						<label class="choiceLabel" for="dropdownRND">Research:</label>
						<select name="dropdownRND" id="dropdownRND" class="actionsLineSelect" @change="store.context.selectDropdownRND = $event.target.value">
							<option v-for="(optionArr, idx) in getRNDoptions()" :key="idx" :value="optionArr[0]">{{ optionArr[1] }}</option>
						</select>
						<br />
						<button v-if="parseInt(store.context.selectDropdownRND) !== -1" class="actionsLineButton" @click="researchFromSelect">
							<span v-if="store.context.selectDropdownRND.length === 1">Research & End Turn</span>
							<span v-else>Research</span>
						</button>
					</template>
					<span v-else :class="{ orangeText: store.context.justResearched.length === 3 && store.context.justResearched[2] !== controller.currentPlayerIndex() }">
						You researched
						<template v-if="store.context.justResearched.length === 3 && store.context.justResearched[2] !== controller.currentPlayerIndex()">
							<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.context.justResearched[2]].colour)">{{ store.players[store.context.justResearched[2]].displayName }}</span>
							's
						</template>
						<span v-if="store.context.justResearched.length === 2 && store.context.justResearched[0] === rf.RnD_HULL_IDX">Your</span>
						<b>{{ rf.RND_STRINGS[store.context.justResearched[0]] }} {{ model.getRndDisplayValue(store.context.justResearched[0], store.context.justResearched[1]) }}</b>
					</span>
					<br />
				</template>

				<!-- CONFIRM END TURN -->
				<template v-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
					<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
					<button class="actionsLineButton" @click="localEndPlayerTurn">End Turn</button>
				</template>

				<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN && !personal.externalTournamentGame">
					<p>Are you sure you want to resign?</p>
					<p>Resigning will unbalance the game for the remaining players</p>
					<p>Please carry on playing if that is at all possible</p>
					<p>Even if you think you can't win, you can still aim for not last / most companies / biggest company / etc</p>
					<button class="actionsLineButton" @click="resetWholePlayerTurn">Carry On Playing</button>
					<button class="actionsLineButton" @click="Bot.actionResign">Confirm Resignation</button>
				</template>
				<template v-else-if="store.context.action === rf.ACT_CONFIRM_RESIGN && personal.externalTournamentGame">
					<div id="resignConfirmDiv">
						Under the tournament rules set by the external tournament organisers, you cannot resign from this type of tournament game
						<br />
						<br />
						Please continue to play
						<br />
						<br />
						If you are unable to continue, please contact the admins via BGG or Discord, or alert them using the button below
						<br />
						You will probably be removed from the tournament
						<br />
						<br />
						<button class="actionsLineButton" @click="resetWholePlayerTurn">Carry On Playing</button>
						<button class="actionsLineButton" @click="IO.nudgeTourneyAdmins(0)">Alert Admins</button>
					</div>
				</template>
			</div>
		</template>
		<!-- TEMP DEBUG STUFFF -->
		<template v-if="IO.MAP_DEBUG_USERS.includes(personal.name)">
			<button class="actionsLineButton" @click="selectC0">Select C0</button>
			<br />
			Territory Path (GFX): {{ store.debugVars.clickedTerrPath }}
			<br />
			Territory ID (REF): {{ map.getTerrIDfromPath(store.debugVars.clickedTerrPath) }} == {{ rf.PHP_TERR_ID_TO_PATH_ID[map.getTerrIDfromPath(store.debugVars.clickedTerrPath)] }}
		</template>
	</div>
</template>

<style scoped>
/** NEW */
#actionsDiv {
	margin-top: 10px;
	display: grid;
	place-items: center;
}

#actions,
#gameEndDiv {
	font-weight: bolder;
}

.currentEraCard {
	width: 400px;
	height: 242.5px;
	border: 3px solid black;
	box-sizing: border-box;
	margin-right: 10px;
}

.selectableEraCard {
	cursor: pointer;
	border-color: yellow;
}

.selectableEraCard:hover {
	border-color: lightgreen;
}

.selectedEraCard {
	border-color: lightgreen !important;
}

.actionsPanel {
	background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
	border: 1px solid black;
	border-radius: 8px;
	padding: 12px;
	margin: 8px 0;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

.bid-header-compact {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
	flex-wrap: wrap;
	gap: 8px;
}

.bid-title-compact {
	font-weight: 600;
	color: #2c3e50;
	font-size: 1em;
}

.current-order-compact {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.no-bids-compact {
	color: #6c757d;
	font-style: italic;
	font-size: 0.9em;
}

.yourTurnOrderBidLine {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 10px;
	flex-wrap: wrap;
	justify-content: center;
}

.bid-label-compact {
	color: #6c757d;
	font-size: 0.9em;
}

.bid-value-compact {
	font-weight: 600;
	color: #2c3e50;
}

.bid-value-compact.primary {
	color: #007bff;
	font-size: 1.1em;
}

.bid-detail-compact {
	color: #6c757d;
	font-size: 0.85em;
}

.bid-cash-compact {
	font-weight: 600;
	color: #2c3e50;
	font-size: 0.9em;
}

.bid-controls-compact {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.bid-stepper-compact {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	flex-wrap: wrap;
}

.bid-input-compact {
	width: 70px;
	padding: 6px 8px;
	border: 2px solid #dee2e6;
	border-radius: 4px;
	text-align: center;
	font-weight: 600;
	font-size: 0.95em;
}

.bid-input-compact:focus {
	outline: none;
	border-color: #007bff;
	box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.bid-actions-compact {
	display: flex;
	gap: 8px;
	justify-content: center;
	flex-wrap: wrap;
}

.slotImgsDiv {
	display: inline-block;
	position: relative;
	width: 79px;
	border: 2px solid black;
	margin-right: 5px;
	vertical-align: middle;
}

.companyCardIMG {
	position: absolute;
	left: 0px;
	border: 2px solid black;
	width: 75px;
	height: 75px;
}

.resign-button-compact {
	background: #dc3545 !important;
	color: white !important;
	border-color: #dc3545 !important;
	font-size: 0.85em;
	padding: 6px 12px;
}

.resign-button-compact:hover:not(:disabled) {
	background: #c82333 !important;
	border-color: #bd2130 !important;
}

.secondary-button-compact {
	background: #6c757d !important;
	color: white !important;
	border-color: #6c757d !important;
	font-size: 0.85em;
	padding: 6px 12px;
}

.secondary-button-compact:hover:not(:disabled) {
	background: #545b62 !important;
	border-color: #545b62 !important;
}

.primary-button-compact {
	background: #28a745 !important;
	color: white !important;
	border-color: #28a745 !important;
	font-weight: 600;
	font-size: 0.85em;
	padding: 6px 16px;
}

.primary-button-compact:hover:not(:disabled) {
	background: #218838 !important;
	border-color: #1e7e34 !important;
}

.primary-button-compact:disabled {
	background: #6c757d !important;
	border-color: #6c757d !important;
	cursor: not-allowed;
}

/** END NEW */
.messageSuccess {
	color: darkgreen;
	background-color: lightblue;
}

#passKickoutButton,
#cancelKickoutButton {
	margin-right: 100px;
}

#mapInspectorButtonDiv {
	display: inline-block;
	vertical-align: middle;
}

.redText {
	font-weight: bolder;
	color: red;
}

.orangeText {
	font-weight: bolder;
	color: darkgoldenrod;
}

.greenText {
	color: darkgreen;
}

.actionError {
	color: red;
	font-weight: bolder;
}

#rewindErrorText,
#loggedOutText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#loggedOutText {
	font-size: 20px;
}

#gameEndDiv {
	font-size: 30px;
}

.linkOther {
	text-align: center;
	text-decoration: none;
	outline: none;
}

.linkOther:hover {
	color: darkblue;
}

#resignConfirmDiv,
#kickoutDiv {
	margin: 20px;
}

#resignConfirmDiv {
	font-weight: bolder;
}

.playerScoreSummaryDiv {
	border: 1px solid black;
	display: inline-block;
	font-size: 30px;
	margin: 4px;
	padding: 0px;
}

.resignButton {
	margin-right: 50px;
}

.activeChoiceLabel {
	color: black;
}

.activeChoiceLabel:hover {
	color: darkgreen;
}

.helpImage {
	display: inline;
	vertical-align: middle;
}

.infoIcon {
	width: 38px;
	height: 38px;
	border: #eee;
	border-radius: 5px;
	margin-left: 0px;
	cursor: pointer;
	text-align: center;
	background-color: black;
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

#bidAmountPre {
	min-width: 187px;
}

.bidSelectsDiv {
	text-align: right;
	width: fit-content;
	margin: auto;
}

.shippingContainers {
	display: flex;
}

.shippingContainer {
	width: 50%;
	/* Set the width of each box to 50% for side-by-side layout */
	box-sizing: border-box;
	/* Include padding and border in the box's total width */
	margin-right: 5px;
}

#successText {
	color: darkgreen;
	background-color: lightblue;
}

/** Pre Turn */
.expertPanel {
	border: 2px solid darkblue;
	background-color: lightsalmon;
	font-weight: bolder;
	width: fit-content;
	height: fit-content;
	padding: 10px;
	margin: auto;
}

.preMoveDataSpan {
	background-color: #94e2fa;
}

/** MERGER BIDDING */

.mergerBidWinP {
	color: #006400;
}

.merger-comparison-flex {
	display: flex;
	justify-content: space-evenly;
	align-items: center;
	padding-bottom: 15px;
	border-bottom: 1px solid #333;
}

.vs-divider {
	font-weight: bold;
	font-size: 1.2rem;
	color: #555;
}

.player-name-tag {
	display: block;
	text-align: center;
	margin-bottom: 10px;
	padding: 2px 8px;
	border-radius: 4px;
}

.market-rules-bar {
	display: flex;
	justify-content: space-around;
	padding: 8px;
	margin-top: 15px;
	border-radius: 4px;
	font-size: 0.9rem;
}

.bid-controls-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 15px;
	margin: 15px 0;
}

.control-box label {
	display: block;
	font-size: 0.75rem;
	color: black;
	margin-bottom: 4px;
}

.modern-select {
	width: 100%;
	border: 1px solid #444;
	padding: 5px;
	border-radius: 4px;
}

.financial-forecast {
	padding: 10px;
	border-radius: 4px;
	margin-bottom: 15px;
	background: rgba(0, 0, 0, 0.1); /* Optional: makes the card stand out */
}

.title-small {
	font-size: 0.7rem;
	color: #555;
	margin-bottom: 5px;
	font-weight: bold;
}

.forecast-row {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr;
	padding: 4px 0;
	border-bottom: 1px solid #222;
	font-size: 0.85rem;
	align-items: center;
}

.merger-actions-footer {
	display: flex;
	gap: 10px;
	margin-top: 20px;
}

.btn-stack-right {
	flex: 2;
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.cashIcon {
	font-size: 18px;
	min-width: 24px;
	display: inline;
	align-items: center;
	justify-content: center;
}

.cashIconTurnOrderBid {
	font-size: 18px;
	display: inline;
	vertical-align: text-bottom;
}

/*** IN MERGER BIDDING */
.merger-slots-row {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 15px;
	padding: 10px;
	border-radius: 4px;
}

.mini-slot {
	height: 60px !important;
	transform: scale(0.7);
	transform-origin: center;
}

.bidding-dashboard {
	padding: 12px;
	border-radius: 6px;
	margin: 10px 0;
}

.market-info {
	display: flex;
	justify-content: space-around;
	border-bottom: 1px solid #333;
	padding-bottom: 8px;
	margin-bottom: 8px;
}

.info-box span {
	font-size: 0.7rem;
	color: #888;
	text-transform: uppercase;
}
.info-box strong {
	display: block;
	font-size: 1.1rem;
}

.high-bidder-box {
	text-align: center;
	padding: 5px;
}

.bid-amount {
	font-size: 1.4rem;
	color: #4caf50;
	margin-left: 10px;
}

.turn-order-strip {
	display: flex;
	align-items: center;
	gap: 5px;
	margin-top: 10px;
}

.order-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	border: 1px solid #000;
}

.forecast-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
	gap: 8px;
	margin-top: 10px;
}

.button-footer {
	display: flex;
	gap: 10px;
	margin-top: 15px;
}

.stack-right {
	display: flex;
	flex-direction: column;
	gap: 5px;
	flex: 2;
}

.btn-confirm {
	background: #2e7d32;
	color: #fff;
	font-weight: bold;
	border-radius: 4px;
	border: none;
	padding: 10px;
	cursor: pointer;
}
.btn-reset {
	background: #555;
	color: #fff;
	border: none;
	padding: 10px;
	border-radius: 4px;
	cursor: pointer;
}
</style>
