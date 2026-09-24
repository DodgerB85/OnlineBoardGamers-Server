<script setup>
/** Action area - This is where you interact with the game flow.
 * Confirm actions, end turn, reset turn.
 * Also, it's where you're told what to do next
 *
 *
 */
import * as rf from "../js/FCMreference"
import * as controller from "../js/FCMcontroller"
import * as model from "../js/FCMmodel"
import * as context from "../js/FCMcontext"
import * as view from "../js/FCMview"
import * as Bot from "../js/FCMbot"
import * as rules from "../js/FCMrules"
import * as plyr from "../js/FCMplayer"
import * as IO from "../backend/FCM_IO"

import AddItemBox from "./utils/AddItemBox.vue"
import ExpertPanel from "./utils/ExpertPanel.vue"
import ActionAreaWorkingDay from "./ActionAreaWorkingDay.vue"
import ActionAreaPrePhase from "./ActionAreaPrePhase.vue"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { watch, computed, ref } from "vue"

const prePhaseMode = ref(null)
function startPrePhase(mode) {
	prePhaseMode.value = mode
}
function closePrePhase() {
	prePhaseMode.value = null
}
// Close any open pre-phase modal when the board phase/subphase advances (stale HMR / turn change)
watch(
	() => [store.gameflow.phase, store.gameflow.subphase],
	() => closePrePhase()
)

const currentPlayerObj = computed(() => controller.currentPlayerObj())
const timedOutPlayerIndex = computed(() => (store.gameflow.turnOrder.length > 0 ? store.gameflow.turnOrder[0] : -1))

const isOnlyHumanLeft = computed(() => {
	const humans = store.players.filter((p) => p.displayName !== rf.BOT_NAME)
	return humans.length <= 1
})

function resetWholeTurn() {
	paydayFlow.value = "fire"
	controller.resetWholeTurn()
}

function cancelKickout() {
	personal.kickoutRequired = 0
}

function passKickout() {
	Bot.passKickout()
}

function currentKickoutTarget() {
	return currentPlayerObj.value ? currentPlayerObj.value.name : ""
}
function myKickoutVote() {
	if (personal.pov < 0) return false
	return store.kickoutVotesData[personal.name]
}
function canKickoutNow() {
	const target = currentKickoutTarget()
	const myVote = myKickoutVote()
	if (myVote) {
		if (myVote[0] === target) {
			if (new Date().getTime() - myVote[1] > rf.KICKOUT_SOLO_DELAY_MS) return true
		} else if (new Date().getTime() - myVote[1] > rf.KICKOUT_SOLO_DELAY_MS) {
			personal.kickoutRequired = 0
			return false
		}
	}
	if (store.kickoutVoteThreshold === 1) return true
	return false
}
function kickoutVoteCount() {
	if (personal.pov < 0) return 0
	return Object.values(store.kickoutVotesData).filter((vote) => vote[0] === currentKickoutTarget()).length
}
function kickoutVoters() {
	if (personal.pov < 0) return ""
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
	if (remainingMs <= 0) soloKickoutCountdown.value = ""
}
watch(
	() => (personal.pov >= 0 ? store.kickoutVotesData[personal.name] : false),
	() => {
		if (personal.pov < 0) return
		updateSoloKickoutCountdown()
		if (soloKickoutCountdown.value !== "") {
			if (personal.kickoutCountdownIntervalTimer != null) clearInterval(personal.kickoutCountdownIntervalTimer)
			personal.kickoutCountdownIntervalTimer = setInterval(updateSoloKickoutCountdown, 1000)
		}
	},
	{ immediate: true }
)

function localClickResign() {
	if (store.context.action !== rf.ACT_CONFIRM_RESIGN) {
		context.clearAllHighlights()
		store.context.action = rf.ACT_CONFIRM_RESIGN
	} else Bot.actionResign()
}

function localEndTurn() {
	// If choosing res card, set that on the player
	if (store.context.selectedReserveCard !== rf.RES_CARD_NONE) {
		if (personal.trainingGame) store.reserveCards[controller.currentPlayerIndex()] = store.context.selectedReserveCard
		else store.reserveCards[personal.pov] = store.context.selectedReserveCard
	}

	controller.endPlayerTurn()
}

function localConfirmDelay() {
	context.resetContextAndHighlights()
	model.addHistory(rf.HIST_DELAY_SETUP, [], controller.currentPlayerIndex(), 0)
	controller.endPlayerTurn(false, false)
}

/** PAYDAY */
const paydayFlow = ref("fire")
watch([() => store.gameflow.phase, () => store.wholeTurnResetData], () => {
	paydayFlow.value = "fire"
})

const computedTotalSalary = computed(() => rules.salary(controller.currentPlayerIndex()))
const computedCanAffordPayDay = computed(() => rules.canAffordPayDay(controller.currentPlayerIndex()))
const computedCanPayWithFood = computed(() => rules.canPayWithFood(controller.currentPlayerIndex()))
const computedNumPays = computed(() => rules.numPayNeeded(controller.currentPlayerIndex()))
const computedPaysLeft = computed(() => computedNumPays.value - store.context.preMoveData[0][1].length)
const paidItemsCount = computed(() => store.context.preMoveData[0][1].length)
const computedMoneyUsed = computed(() => {
	const unitarySalary = plyr.hasMilestone(controller.currentPlayerIndex(), rf.FIRST_WAITRESS_USED) ? 3 : 5
	return Math.max(computedTotalSalary.value - store.context.preMoveData[0][1].length * unitarySalary, 0)
})
const computedNeedFiringMarketers = computed(() => rules.needFiringMarketers(controller.currentPlayerIndex()))

const computedFireableEmployees = computed(() =>
	[...rules.fireableEmployees(controller.currentPlayerIndex())].sort((a, b) => {
		const rankA = rf.REQUIRE_SALARY.indexOf(a) > -1 ? a : a + 100
		const rankB = rf.REQUIRE_SALARY.indexOf(b) > -1 ? b : b + 100
		return rankA - rankB
	})
)

const computedUnfireableMarketers = computed(() =>
	controller
		.currentPlayerObj()
		.marketers.filter((m, idx) => idx !== controller.currentPlayerObj().additionalCampaignArrayIndex && !m.nightShift)
		.map((m) => m.marketer)
)

/** CEO Bonus */
const ceoBonuses = [
	{ id: rf.CEO_ACTION_PRICE_MINUS_3, label: "Price -3" },
	{ id: rf.CEO_ACTION_RECRUITING_MANAGER, label: "2x: Hire 1 person or $5 less salary" },
	{ id: rf.CEO_ACTION_COACH, label: "2 training slots. May train the same person two steps" },
]

const computedPayResources = computed(() => [...controller.currentPlayerObj().resources].sort().filter((resource) => resource !== rf.COFFEE))

function localFireEmployee(employee) {
	plyr.fireEmployee(controller.currentPlayerIndex(), employee)
	store.availableEmployees[employee]++
	store.context.justFired.push(employee)
}

function localUnfireEmployee(employee) {
	const idx = store.context.justFired.indexOf(employee)
	if (idx === -1) return
	store.availableEmployees[employee]--
	controller.currentPlayerObj().beach.push(employee)
	store.context.justFired.splice(idx, 1)
}

function chooseBeerPayment() {
	paydayFlow.value = "beer"
}

function paySalaryWithResource(resource) {
	plyr.removeResourcesFromPlayer(controller.currentPlayerIndex(), resource, 1)
	store.context.preMoveData[0][1].push(resource)
}

function undoPaySalaryWithResource(idx) {
	const resource = store.context.preMoveData[0][1][idx]
	store.context.preMoveData[0][1].splice(idx, 1)
	controller.currentPlayerObj().resources.push(resource)
}

function confirmTrainerKeepAll() {
	const playerObj = controller.currentPlayerObj()
	store.bank += playerObj.money
	playerObj.money = 0
	if (plyr.hasMilestone(controller.currentPlayerIndex(), rf.FIRST_BEER_SOLD)) playerObj.resources = []
	controller.endPlayerTurn(false, false)
}
/** END PAYDAY */

/** CLEANUP */
const cleanupResources = computed(() => [...controller.currentPlayerObj().resources].sort())
const cleanupHasFridge = computed(() => plyr.hasFridge(controller.currentPlayerIndex()))
const cleanupKimchiCollision = computed(() => rules.kimchiFridgeCollision(controller.currentPlayerIndex()))
const cleanupBinned = computed(() => [...store.context.justBinned])
/** END CLEANUP */

/** RESERVE CARDS */
const showReserveCards = computed(() => store.gameflow.phase === rf.PHASE_SETUP_RESERVE || (!personal.trainingGame && (store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1 || store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2) && personal.moveDataRaw === "" && store.players[personal.pov].restaurants.length > 0 && !store.startingOptions.shortGame && personal.pov !== store.gameflow.turnOrder[0]))
/** END RESERVE CARDS */

// Auto-sort beach
watch(
	() => {
		let obj = controller.currentPlayerObj()
		return obj && obj.beach ? obj.beach.length : 0
	},
	(newLength, oldLength) => {
		if (newLength !== oldLength) {
			let obj = controller.currentPlayerObj()
			if (obj && obj.beach) rf.sortEmployees(obj.beach)
		}
	}
)

const filteredBeach = computed(() => {
	let obj = controller.currentPlayerObj()
	if (!obj || !obj.beach) return []
	const beach = obj.beach
	// Managers are only selectable into a CEO slot
	return beach.filter((emp) => {
		if (store.context.selectedEmployeeIndexForRestructuring < controller.currentPlayerObj().ceoSlots) return true
		return !rf.MANAGERS.includes(emp)
	})
})

const ceoEmployees = computed(() => {
	const player = controller.currentPlayerObj()
	// Returns only the first X items based on ceoSlots
	return player.employees.slice(0, player.ceoSlots)
})

const nonCeoEmployees = computed(() => {
	const player = controller.currentPlayerObj()
	if (!player) return []
	// Only slices when employees or ceoSlots actually change
	return player.employees.slice(player.ceoSlots)
})

function canReturnIndexToBeach(idx) {
	return controller.currentPlayerObj().employees[idx] !== rf.BLANK_EMPLOYEE_SPACE
}

function returnIndexToBeach(idx) {
	const returnee = controller.currentPlayerObj().employees[idx]
	controller.currentPlayerObj().beach.push(returnee)
	controller.currentPlayerObj().employees[idx] = rf.BLANK_EMPLOYEE_SPACE
	store.context.selectedEmployeeIndexForRestructuring = -1
	if (rf.MANAGERS.includes(returnee)) {
		const freeSlotsToRemove = rules.getSubSlotsForEmployee(returnee)
		let removedCount = 0
		const employees = controller.currentPlayerObj().employees

		// Start from the end and remove only if it's a BLANK_EMPLOYEE_SPACE
		for (let i = employees.length - 1; i >= 0 && removedCount < freeSlotsToRemove; i--) {
			if (employees[i] === rf.BLANK_EMPLOYEE_SPACE) {
				employees.splice(i, 1)
				removedCount++
			}
		}
	}
}

function clickedIndxInCEOslots(idx) {
	const emp = controller.currentPlayerObj().employees[idx]
	if (!canSelectCardInCEOslot(emp)) return
	store.context.selectedEmployeeIndexForRestructuring = idx
}

function canSelectCardInCEOslot(emp) {
	if (!rf.MANAGERS.includes(emp)) return true
	const freeSlotsRequired = rules.getSubSlotsForEmployee(emp)
	const freeSlots = controller.currentPlayerObj().employees.filter((emp) => emp === rf.BLANK_EMPLOYEE_SPACE).length
	return freeSlots >= freeSlotsRequired
}

const MODULE_IMGS = {
	8: ["so_hardchoices2", "Hard Choices"],
	20: ["so_ketchupMS", "Ketchup Milestone"],
	23: ["so_reservePrice", "New Reserve Cards"],
	14: ["so_movieStars", "Movie Stars"],
	15: ["so_massMarketeers", "Mass Marketeers"],
	13: ["so_GFC", "Gourmet Food Critics"],
	17: ["so_rural", "Rural Marketeers"],
	22: ["so_lobbyists", "Lobbyists"],
	16: ["so_nightShift", "Night Shift Manager"],
	19: ["so_coffee", "Coffee"],
	9: ["so_fryChef", "Fry Chef"],
	10: ["so_kimchi", "Kimchi"],
	11: ["so_sushi", "Sushi"],
	12: ["so_noodles", "Noodles"],
	999: ["so_skip", "Skip Module"],
}

const MODULE_DESCRIPTIONS = {
	8: "First to train / First to market good disappear after 2 turns. First to hire 3 disappears after 3 turns",
	20: "Milestone: The first time someone else sells your demand, gain a permanent -1 to distance",
	23: "When the bank breaks, add $200 per player. The base price changes to whichever is selected most, from $5, $10, or $20",
	10: "Houses prioritise a restaurant with their demands + kimchi",
	12: "Noodles count as any demand item, but only if no one else can supply it",
	11: "Houses with gardens will try to replace all demand with Sushi",
	19: "Sell coffee along the route travelled by a house",
	22: "Add new roads and parks to the map",
	9: "Adds $10 per total sale",
	15: "Repeat marketing phase for each Mass Marketeer",
	17: "Markets to the Rural Area - accessed by freeway ramps",
	13: "Markets to all houses with a garden",
	14: "Decide turn order and break ties",
	16: "Must be put in a management slot. All unsalaried employees work twice during 9-5",
}

const computedDraftedModules = computed(() => rules.getAvailableModules(true).filter((id) => id in MODULE_IMGS))
const computedAvailableModules = computed(() => rules.getAvailableModules())

function addModuleAndEndTurn() {
	const availableModules = rules.getAvailableModules()
	const modId = availableModules[store.context.selectedModuleIndex]
	model.addHistory(rf.HIST_CHOOSE_MODULE, [modId], controller.currentPlayerIndex(), 0)
	IO.saveModuleSelection(store.context.selectedModuleIndex)
}

function skipModuleAndEndTurn() {
	model.addHistory(rf.HIST_CHOOSE_MODULE, [999], controller.currentPlayerIndex(), 0)
	IO.saveModuleSelection(999)
}
</script>

<template>
	<div v-if="store.viewSettings.showGameLoader" id="fLoadingBar">
		{{ $t("actionArea.savingGame") }}
		<br />
		<img :src="view.getImage('loading-bar-black')" />
	</div>

	<div id="actionAreaDiv">
		<!-- LOGGED OUT TEXT -->
		<template v-if="personal.pov === -99">
			<div id="loggedOutText">
				<i18n-t keypath="actionArea.loggedOutPrompt" tag="span" scope="global">
					<template #register><a href="/register">{{ $t("actionArea.register") }}</a></template>
					<template #login><a href="/login">{{ $t("actionArea.login") }}</a></template>
				</i18n-t>
				<br />
			</div>
			<br />
		</template>

		<!-- RESIGN -->
		<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN">
			{{ $t("actionArea.resignConfirm") }}
			<br />
			{{ $t("actionArea.resignUnbalance") }}
			<br />
			{{ $t("actionArea.resignCarryOn") }}
			<br />
			{{ $t("actionArea.resignStillCompete") }}
			<br />
			<img class="resignImg" :src="view.getImage('resign')" />
			<br />
			<button class="actionsLineButton" @click="resetWholeTurn">{{ $t("actionArea.carryOnPlaying") }}</button>
			<button class="actionsLineButton" @click="Bot.actionResign">{{ $t("actionArea.confirmResignation") }}</button>
		</template>

		<div v-if="store.context.action !== rf.ACT_CONFIRM_RESIGN">
			<template v-if="personal.kickoutRequired > 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER && store.gameflow.turnOrder[0] !== personal.pov">
				<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
					<i18n-t keypath="actionArea.playerUsedAllKickoutTime" tag="div" scope="global">
						<template #name><b>{{ currentPlayerObj.name }}</b></template>
					</i18n-t>
					<br />
					<br />
					{{ $t("actionArea.remainingFlexTime") }}
					<span id="flexiKickoutTimerSpan">{{ view.getFlexiKickoutTImerText() }}</span>
					<br />
					<br />
					<i18n-t keypath="actionArea.forMoreInfoSeeHelp" tag="div" scope="global">
						<template #help><b><a href="/help/" target="_blank">{{ $t("actionArea.help") }}</a></b></template>
					</i18n-t>
				</div>
				<div v-else id="kickoutDiv">
					<br />
					<template v-if="canKickoutNow()">
						<template v-if="store.context.action !== rf.ACT_CONFIRM_KICKOUT">
							<i18n-t keypath="actionArea.playerTimedOut" tag="div" scope="global">
								<template #name><b>{{ currentPlayerObj.name }}</b></template>
							</i18n-t>
							<br />
							<i18n-t keypath="actionArea.toKickoutPressConfirm" tag="div" scope="global">
								<template #name><b>{{ currentPlayerObj.name }}</b></template>
							</i18n-t>
							<br />
							{{ $t("actionArea.allPlayersCanMoveAgain") }}
							<br />
							<br />
							<i18n-t keypath="actionArea.allowMoreTimeReload" tag="div" scope="global">
								<template #name><b>{{ currentPlayerObj.name }}</b></template>
							</i18n-t>
							<br />

							<br />
							<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("actionArea.notNowAllowMoreTime") }}</button></span>
							<span v-if="store.gameflow.phase !== rf.PHASE_SETUP_RESTAURANT1 && store.gameflow.phase !== rf.PHASE_SETUP_RESTAURANT2">
								<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("actionArea.keepName", { name: currentPlayerObj.name }) }}</button>
							</span>
							<span><button class="actionsLineButton" id="confirmKickoutButton" @click="store.context.action = rf.ACT_CONFIRM_KICKOUT">{{ $t("actionArea.confirmKickout") }}</button></span>
						</template>
						<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
							<i18n-t keypath="actionArea.permanentlyRemove" tag="div" scope="global">
								<template #name><b>{{ currentPlayerObj.name }}</b></template>
							</i18n-t>
							<br />
							<b>{{ $t("actionArea.cannotBeUndone") }}</b>
							<br />
							<br />
							{{ $t("actionArea.checkChatAbsence") }}
							<br />
							{{ $t("actionArea.gracePeriodNote") }}

							<br />
							<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("actionArea.notNowAllowMoreTime") }}</button></span>
							<span>
								<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout(timedOutPlayerIndex)">{{ $t("actionArea.permanentlyKickout", { name: currentPlayerObj.name }) }}</button>
							</span>
						</template>
					</template>
					<template v-else>
						<br />
						<i18n-t keypath="actionArea.playerTimedOut" tag="div" scope="global">
							<template #name><b>{{ currentPlayerObj.name }}</b></template>
						</i18n-t>
						<br />
						<i18n-t keypath="actionArea.voteNeededKickout" tag="div" scope="global">
							<template #name><b>{{ currentPlayerObj.name }}</b></template>
						</i18n-t>
						<br />
						<br />
						{{ $t("actionArea.votesLine", { count: kickoutVoteCount(), threshold: store.kickoutVoteThreshold, voters: kickoutVoters() }) }}
						<br />
						<br />
						<span v-if="!myKickoutVote()">
							<template v-if="isLastVoteRequired()">
								<i18n-t keypath="actionArea.permanentlyRemove" tag="div" scope="global">
									<template #name><b>{{ currentPlayerObj.name }}</b></template>
								</i18n-t>
								<br />
								<b>{{ $t("actionArea.cannotBeUndone") }}</b>
								<br />
								<br />
							</template>
							<button class="actionsLineButton" id="voteKickoutButton" @click="Bot.actionPlayerKickout(timedOutPlayerIndex)">{{ $t("actionArea.voteToKickout", { name: currentPlayerObj.name }) }}</button>
						</span>
						<span v-else>
							<i18n-t keypath="actionArea.youHaveVotedKickout" tag="div" scope="global">
								<template #name><b>{{ currentPlayerObj.name }}</b></template>
							</i18n-t>
							<br />
							<i18n-t keypath="actionArea.kickDirectlyIn" tag="div" scope="global">
								<template #countdown>{{ soloKickoutCountdown }}</template>
							</i18n-t>
							<br />
						</span>
						<span>
							<button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("actionArea.notNowAllowMoreTime") }}</button>
						</span>
						<span v-if="store.gameflow.phase !== rf.PHASE_SETUP_RESTAURANT1 && store.gameflow.phase !== rf.PHASE_SETUP_RESTAURANT2">
							<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("actionArea.keepName", { name: currentPlayerObj.name }) }}</button>
						</span>
					</template>
				</div>
			</template>

			<!-- [Rewind/ERROR] ERROR TEXT -->
			<template v-if="store.gameMessages.errorText !== ''">
				<h1 class="errorText">{{ store.gameMessages.errorText }}</h1>
			</template>
			<template v-if="store.gameMessages.actionError !== ''">
				<h1 class="errorText">{{ store.gameMessages.actionError }}</h1>
			</template>
			<!-- [BUG]]  SUCCESS TEXT -->
			<template v-if="store.gameMessages.successText !== ''">
				<h2 id="successText" v-html="store.gameMessages.successText"></h2>
			</template>

			<!-- ALWAYS SHOWS GAME END-->
			<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
				<!-- ASSUME FULL-TO IS SORTED WITH WINNER AT INDEX 0 -->
				<div id="gameEndDiv">
					<h2>
						{{ $t("actionArea.theWinnerIs") }}
						<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.gameflow.fullTurnOrder[0]].colour)">{{ store.players[store.gameflow.fullTurnOrder[0]].displayName }}</span>
					</h2>
					<template v-if="store.players[store.gameflow.fullTurnOrder[0]].name === personal.name">
						<h1>{{ $t("actionArea.congratulations") }}</h1>
					</template>
					<br />
					{{ $t("actionArea.fancyA") }}
					<a :href="'/createFCMpage/' + String(personal.gameID) + '/'">{{ $t("actionArea.rematch") }}</a>
					{{ $t("actionArea.rematchSuffix") }}
					<br />
					<br />
				</div>
			</template>

			<!-- Turn Order Phase Summary (visible to all players) -->
			<template v-if="store.gameflow.phase === rf.PHASE_TURN_ORDER">
				<div>
					<p v-if="store.context.action !== rf.ACT_CONFORM_END_TURN && personal.canPlay()">{{ $t("actionArea.chooseTurnOrderPosition") }}</p>
					<template v-for="(playerIndex, idx) in store.gameflow.newTurnOrder" :key="idx">
						<template v-if="playerIndex === -1">
							<button @click="controller.chooseTurnOrderPosition(idx)" class="actionsLineButton turnOrderButton" v-if="store.context.action !== rf.ACT_CONFORM_END_TURN && personal.canPlay()">
								{{ idx + 1 }}
							</button>
							<span v-else>
								<div class="playerTurnOrderDiv emptyTurnOrderDiv">
									{{ idx + 1 }}
									<br />
									{{ $t("playerDetails.empty") }}
								</div>
							</span>
						</template>
						<template v-else>
							<span>
								<div class="playerTurnOrderDiv">
									<img class="playerTurnOrderRestoImg" :src="view.getImage('player_resto_icon_' + personal.getCorrectedColour(store.players[playerIndex].colour))" />
									<br />
									<span class="playerTurnOrderNameSpan" :class="{ currentPlayerNameGlow: playerIndex === store.gameflow.turnOrder[0] }">{{ store.players[playerIndex].displayName }}</span>
									<br />
									${{ store.players[playerIndex].money }}
								</div>
							</span>
						</template>
					</template>
				</div>
			</template>

			<!-- CURRENT PLAYER ONLY-->
			<template v-if="personal.canPlay()">
				<!-- CHOOSE RESTO -->
				<template v-if="store.gameflow.phase === rf.PHASE_URBAN_PLANNING">
					<div>
						<p v-if="store.startingOptions.urbanPlanning">
							<b>{{ $t("actionArea.chooseRotationForNextTile") }}</b>
						</p>
						<p v-else-if="store.startingOptions.urbanPlanningPlus">
							<b>{{ $t("actionArea.chooseNewTileAndRotation") }}</b>
						</p>

						<AddItemBox :itemBeingAdded="rf.ITEM_BOX_URBAN_PLANNING" />
					</div>
				</template>

				<!-- Modules Phase -->
				<template v-if="store.gameflow.phase === rf.PHASE_SETUP_MODULES">
					<div>
						<p><b>{{ $t("actionArea.chooseModuleHeader") }}</b><br/>{{ $t("actionArea.totalModulesHint") }}</p>

						<div class="moduleDraftSection">
							<b>{{ $t("actionArea.draftedModules") }}</b>
							<div class="moduleDraftRow moduleDraftRowCentered">
								<template v-if="computedDraftedModules.length === 0">[{{ $t("items.none") }}]</template>
								<template v-for="modId in computedDraftedModules" :key="'drafted-' + modId">
									<img class="startingOption" :style="{ border: '3px solid black' }" :src="view.getImage(MODULE_IMGS[modId][0])" :alt="MODULE_IMGS[modId][1]" />
								</template>
							</div>
						</div>

						<div class="moduleDraftSection">
							<b>{{ $t("actionArea.availableModules") }}</b>
							<div class="moduleDraftRow moduleDraftRowCentered">
								<template v-for="(modId, idx) in computedAvailableModules" :key="'avail-' + idx">
									<img
										class="startingOption selectable"
										:class="{ selected: store.context.selectedModuleIndex === idx }"
										:src="view.getImage(MODULE_IMGS[modId][0])"
										:alt="MODULE_IMGS[modId][1]"
										@click="store.context.selectedModuleIndex = idx"
									/>
								</template>
							</div>
						</div>

						<div class="moduleDraftSection">
							<b>{{ $t("actionArea.selectedModule") }}</b>
							<div class="moduleSelectedRow" v-if="computedAvailableModules.length > 0">
								<div class="moduleSelectedCol">
									<img class="startingOption" :src="view.getImage(MODULE_IMGS[computedAvailableModules[store.context.selectedModuleIndex]][0])" :alt="MODULE_IMGS[computedAvailableModules[store.context.selectedModuleIndex]][1]" />
									<div class="moduleSelectedInfo">
										<b>{{ $t("actionArea.moduleNames." + computedAvailableModules[store.context.selectedModuleIndex]) }}</b><br/>
										<span>{{ MODULE_DESCRIPTIONS[computedAvailableModules[store.context.selectedModuleIndex]] !== undefined ? $t("actionArea.moduleDescs." + computedAvailableModules[store.context.selectedModuleIndex]) : "" }}</span>
									</div>
								</div>
							</div>
						</div>

						<button class="actionsLineButton" @click="addModuleAndEndTurn">{{ $t("actionArea.addModuleToEndTurn") }}</button>
						<button class="actionsLineButton" @click="skipModuleAndEndTurn">{{ $t("actionArea.skipModuleToEndTurn") }}</button>
					</div>
				</template>

				<!-- Starting Restaurant Phase -->
				<template v-if="(store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1 || store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2) && store.context.action !== rf.ACT_CONFORM_END_TURN && (personal.trainingGame && personal.canPlay() ? currentPlayerObj.restaurants.length === 0 : store.players[personal.pov].restaurants.length === 0)">
					<div>
						<h2>
							<b>{{ $t("welcome.title") }}</b>
							<br />
							{{ $t("welcome.contact") }}
							<img :src="view.getImage('email')" width="400" height="30" />
							. {{ $t("actionArea.thanks") }}
						</h2>

						<div id="listDiv">
							<ul class="centreList">
								<li>{{ $t("welcome.instructions.placeItem") }}</li>
								<li>{{ $t("welcome.instructions.rotateItem") }}</li>
								<li>{{ $t("welcome.instructions.viewEmployees") }}</li>
								<li>{{ $t("welcome.instructions.viewReserve") }}</li>
								<li>{{ $t("welcome.instructions.resetTurn") }}</li>
							</ul>
						</div>

						<h1 v-if="personal.trainingGame && (store.players[0].name === 'FcmAI' || store.players[1].name === 'FcmAI')" v-html="$t('welcome.aiWarning')"></h1>

						<p>{{ $t("welcome.chooseRestaurant") }}</p>
						<p v-if="store.startingOptions.useMilestones && store.startingOptions.newMilestones">
							<span v-html="$t('welcome.newMilestones')"></span>
							<img class="boxReminderImg" :src="view.getImage('FCMbox2')" :alt="$t('welcome.expansionBoxAlt')" />
						</p>
						<p v-else-if="store.startingOptions.useMilestones && !store.startingOptions.newMilestones">
							<span v-html="$t('welcome.originalMilestones')"></span>
							<img class="boxReminderImg" :src="view.getImage('FCMbox')" :alt="$t('welcome.originalBoxAlt')" />
						</p>

						<AddItemBox :itemBeingAdded="rf.ITEM_BOX_RESTO" />

						<button v-if="!personal.trainingGame" class="actionsLineButton" @click="localClickResign">{{ $t("actionArea.resign") }}</button>
						<button v-if="store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1 && store.gameflow.turnOrder.length > 1" class="actionsLineButton" @click="localConfirmDelay">{{ $t("actionArea.delayRestaurantRound") }}</button>
					</div>
				</template>

				<!-- Reserve Card Choice (pre-set during restaurant placement, or during reserve phase) -->
				<template v-if="showReserveCards">
					<div>
						<p v-if="store.gameflow.phase === rf.PHASE_SETUP_RESERVE">{{ $t("actionArea.chooseReserveCard") }}</p>
						<p v-else>
							<b>
								{{ $t("actionArea.reserveEarly") }}
								<br />
								{{ $t("actionArea.reserveEarlyNote") }}
							</b>
						</p>
						<p v-if="store.startingOptions.useMilestones && store.startingOptions.newMilestones">
							<span v-html="$t('welcome.newMilestones')"></span>
							<img class="boxReminderImg" :src="view.getImage('FCMbox2')" />
						</p>
						<p v-if="store.startingOptions.useMilestones && !store.startingOptions.newMilestones">
							<span v-html="$t('welcome.originalMilestones')"></span>
							<img class="boxReminderImg" :src="view.getImage('FCMbox')" :alt="$t('welcome.originalBoxAlt')" />
						</p>
						<div v-for="resCardNum in [rf.RES_CARD_OG_2_SLOTS, rf.RES_CARD_OG_3_SLOTS, rf.RES_CARD_OG_4_SLOTS]" :key="resCardNum" @click="store.context.selectedReserveCard = resCardNum" class="resCardChoiceDiv selectable" :class="{ selected: store.context.selectedReserveCard === resCardNum }">
							<img class="cardImg" :src="view.getImage(view.getReserveCardImageKey(resCardNum))" />
						</div>

						<template v-if="store.context.selectedReserveCard !== rf.RES_CARD_NONE">
							<br />
							<button class="actionsLineButton" @click="controller.resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
							<button class="actionsLineButton" @click="localEndTurn">{{ $t("workingDay.endTurn") }}</button>
						</template>
					</div>
				</template>

				<!-- Restructuring Phase -->
				<template v-if="store.gameflow.phase === rf.PHASE_RESTRUCTURING">
					<template v-if="store.context.action === rf.ACT_CONFIRM_NO_MORE_EMPLOYEES">
						<p>{{ $t("actionArea.confirmNoMoreEmployees") }}</p>

						<button v-if="!personal.trainingGame" class="actionsLineButton" @click="localClickResign">{{ $t("actionArea.resign") }}</button>
						<button class="actionsLineButton" @click="controller.resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
						<button class="actionsLineButton" @click="controller.endPlayerTurn(true, false)">{{ $t("workingDay.endTurn") }}</button>
					</template>
					<div v-else>
						<p>{{ $t("actionArea.chooseEmployeesToWork") }}</p>
						<!-- MINI BEACH -->
						<div class="beachChoiceMini">
							<div class="beachTitleMini">{{ $t("actionArea.beach") }}</div>
							<div v-for="(emp, idx) in currentPlayerObj.beach" :key="idx" @click="plyr.addToStructureFromMiniBeach(emp, ceoEmployees.includes(rf.BLANK_EMPLOYEE_SPACE), idx)" class="beachMiniEmployeeDiv" :class="[{ selectable: rf.MANAGERS.includes(emp) && ceoEmployees.includes(rf.BLANK_EMPLOYEE_SPACE) > 0 }, { selectable: !rf.MANAGERS.includes(emp) && currentPlayerObj.employees.includes(rf.BLANK_EMPLOYEE_SPACE) }]">
								<img :src="view.getImage(`emp_${emp}`)" class="cardImg" :alt="rf.employeeName(emp)" />
							</div>
						</div>

						<!-- CEO CARD -->
						<div class="restructureCEOcard">
							<img :src="view.getImage(`ceo_card_OG_${currentPlayerObj.ceoSlots}`)" class="cardImg" />
						</div>

						<!-- BIG BEACH OPTIONS -->
						<template v-if="store.context.selectedEmployeeIndexForRestructuring >= 0">
							<div class="mainBeachDiv">
								<div class="mainBeachTitle">{{ $t("actionArea.beach") }}</div>
								<div v-for="(emp, idx) in filteredBeach" :key="idx" @click="plyr.setEmployeeInIndex(controller.currentPlayerIndex(), emp, store.context.selectedEmployeeIndexForRestructuring)" class="normalSlotDiv selectable">
									<img :src="view.getImage(`emp_${emp}`)" class="cardImg" :alt="rf.employeeName(emp)" />
								</div>
								<br />
								<button v-if="canReturnIndexToBeach(store.context.selectedEmployeeIndexForRestructuring)" @click="returnIndexToBeach(store.context.selectedEmployeeIndexForRestructuring)" class="actionsLineButton">{{ $t("actionArea.returnToBeach") }}</button>
								<button class="actionsLineButton" @click="store.context.selectedEmployeeIndexForRestructuring = -1">{{ $t("topMenuViews.close") }}</button>
							</div>
						</template>

						<!-- CEO SLOTS -->
						<template v-for="(emp, idx) in ceoEmployees" :key="idx">
							<div v-if="emp === rf.BLANK_EMPLOYEE_SPACE" @click="store.context.selectedEmployeeIndexForRestructuring = idx" class="ceoSlotDiv selectable">
								<div class="ceoSlotTextDiv">{{ $t("actionArea.ceoSlot") }}</div>
							</div>
							<div v-else class="ceoSlotDiv" :class="{ selectable: canSelectCardInCEOslot(emp) }" @click="clickedIndxInCEOslots(idx)">
								<img :src="view.getImage(`emp_${emp}`)" class="cardImg" :alt="rf.employeeName(emp)" />
							</div>
						</template>
						<br />
						<!-- SUBSLOTS -->
						<template v-for="(emp, idx) in nonCeoEmployees" :key="idx">
							<div v-if="emp === rf.BLANK_EMPLOYEE_SPACE" @click="store.context.selectedEmployeeIndexForRestructuring = idx + currentPlayerObj.ceoSlots" class="normalSlotDiv selectable"></div>
							<div v-else class="normalSlotDiv selectable" @click="store.context.selectedEmployeeIndexForRestructuring = idx + currentPlayerObj.ceoSlots">
								<img :src="view.getImage(`emp_${emp}`)" class="cardImg" :alt="rf.employeeName(emp)" />
							</div>
						</template>
						<br />

						<button v-if="!personal.trainingGame" class="actionsLineButton" @click="localClickResign">{{ $t("actionArea.resign") }}</button>
						<button class="actionsLineButton" @click="controller.resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
						<button class="actionsLineButton" @click="controller.autoFillEmployees()">{{ $t("actionArea.autoFillStructure") }}</button>
						<button class="actionsLineButton" @click="localEndTurn">{{ $t("workingDay.endTurn") }}</button>
					</div>
				</template>

				<!-- Working Day Subphases -->
				<template v-if="store.gameflow.phase === rf.PHASE_WORKING_DAY">
					<ActionAreaWorkingDay />
					<template v-if="prePhaseMode && store.gameflow.subphase === rf.SUBPHASE_CONFIRM_END_TURN && !isOnlyHumanLeft">
						<ActionAreaPrePhase :mode="prePhaseMode" @close="closePrePhase" />
					</template>
				</template>

				<!-- Pizza Bomb Phase -->
				<template v-if="store.gameflow.phase === rf.PHASE_PIZZA_BOMB">
					<div>
						<p><b>{{ $t("actionArea.pizzaMilestone") }}</b></p>
						<template v-if="store.firstPizzas.length >= 3 && store.firstPizzas[2] === controller.currentPlayerIndex()">
							<p v-if="store.highlights.indexesToHighlightYellow.length > 0">{{ $t("actionArea.chooseSpaceForHouse", { house: store.firstPizzas[1] }) }}</p>
							<p v-else>{{ $t("actionArea.noSpaceForPizzaRadio", { house: store.firstPizzas[1] }) }}</p>
							<button v-if="store.highlights.indexesToHighlightYellow.length === 0" class="actionsLineButton" @click="controller.skipPizzaBombMarketer()">{{ $t("workingDay.neverMind") }}</button>
						</template>
						<template v-else>
							<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
							<button class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
						</template>
					</div>
				</template>

				<!-- CEO Bonus Phase -->
				<template v-if="store.gameflow.phase === rf.PHASE_CHOOSE_CEO_BONUS">
					<div>
						<p>{{ $t("actionArea.chooseCeoBonusReplacement") }}</p>
						<div class="ceoBonusLine">
							<div v-for="bonus in ceoBonuses" :key="bonus.id" class="ceoBonusOptionDiv" :class="{ ceoBonusOptionDivSelected: currentPlayerObj.ceoAction === bonus.id }" @click="controller.selectCeoBonus(bonus.id)">
								<img class="ceoBonusOptionMainImg card" :src="view.getImage('ceo_card_OG_' + store.ceoLevel)" />
								<div class="ceoBonusActionDiv">
									<img class="ceoBonusActionImg" :src="view.getImage('ceo_action_' + bonus.id)" />
								</div>
							</div>
						</div>
						<p v-if="currentPlayerObj.ceoAction === rf.CEO_ACTION_HIRE_1">{{ $t("actionArea.ceoMustChoose") }}</p>
						<p v-else-if="currentPlayerObj.ceoAction === rf.CEO_ACTION_PRICE_MINUS_3">{{ $t("playerDetails.priceMinus3") }}</p>
						<p v-else-if="currentPlayerObj.ceoAction === rf.CEO_ACTION_RECRUITING_MANAGER">{{ $t("actionArea.ceoLabelRecruiting") }}</p>
						<p v-else-if="currentPlayerObj.ceoAction === rf.CEO_ACTION_COACH">{{ $t("employees.coachDesc") }}</p>
						<div v-if="currentPlayerObj.ceoAction !== rf.CEO_ACTION_HIRE_1" class="endOfTurnButtons">
							<button class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
						</div>
					</div>
				</template>

				<!-- Coffee Shop Milestone Phase -->
				<template v-if="store.gameflow.phase === rf.PHASE_COFFE_SHOP_MS">
					<div>
						<p>
							<b>{{ $t("actionArea.coffeeMsUnlimitedRange") }}</b>
							<br />
							{{ $t("workingDay.coffeeShopPlacementRules") }}
						</p>
						<p v-if="store.context.coffeeShopMSAction === 'remove'">{{ $t("workingDay.noMoreCoffeeShopsMove") }}</p>
						<button class="actionsLineButton resetWorkingDayButton" @click="controller.resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
						<button class="actionsLineButton" @click="controller.skipCoffeeMS()">{{ $t("actionArea.skipCoffeeMilestone") }}</button>
						<button v-if="store.context.coffeeShopMSAction === ''" class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
					</div>
				</template>

				<!-- Payday Phase -->
				<template v-if="store.gameflow.phase === rf.PHASE_PAYDAY">
					<!-- BEER MILESTONE - choose payment type -->
					<div v-if="paydayFlow === 'beer'">
						<template v-if="computedPaysLeft > 0">
							<p>
								{{ $t("prePhase.payForEmployees", computedNumPays) }}
								{{ $t("actionArea.chooseItemsToUse", computedPaysLeft) }}
							</p>

							<div class="reminder fireLine">
								<template v-if="paidItemsCount > 0">
									<img :src="view.getImage(rf.MILESTONES_STR[rf.FIRST_THROW_AWAY].img)" class="payBinIcon" alt="bin" />
									<img v-for="(resource, idx) in store.context.preMoveData[0][1]" :key="idx" :src="view.getImage(`item_${resource}`)" class="payFoodToken paidToken" @click="undoPaySalaryWithResource(idx)" />
								</template>
							</div>

							<i18n-t keypath="prePhase.currentlyPaying" tag="p" scope="global" :plural="paidItemsCount">
								<template #money><b>${{ computedMoneyUsed }}</b></template>
								<template #items><b>{{ paidItemsCount }}</b></template>
							</i18n-t>

							<div>
								<img v-for="resource in computedPayResources" :key="resource" :src="view.getImage(`item_${resource}`)" class="payFoodToken selectable" @click="paySalaryWithResource(resource)" />
							</div>

							<div v-if="rules.canPayWithMoney(controller.currentPlayerIndex(), computedPaysLeft)">
								<button class="actionsLineButton paydayResetButton" @click="resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
								<button class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("actionArea.payRestInMoney") }}</button>
							</div>
						</template>
						<template v-else>
							<div class="reminder fireLine">
								<img v-for="(resource, idx) in store.context.preMoveData[0][1]" :key="idx" :src="view.getImage(`item_${resource}`)" class="payFoodToken paidToken" @click="undoPaySalaryWithResource(idx)" />
							</div>
							<button class="actionsLineButton paydayResetButton" @click="resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
							<button class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
						</template>
					</div>

					<!-- MAIN FIRE SCREEN -->
					<div v-else-if="computedFireableEmployees.length > 0">
						<p>{{ $t("actionArea.canFireEmployees") }}</p>

						<div v-if="!computedNeedFiringMarketers && currentPlayerObj.marketers.length > 0" class="reminder">
							<p>{{ $t("actionArea.marketersCantFire") }}</p>
							<div v-for="marketer in computedUnfireableMarketers" :key="marketer" class="cardSummaryDiv">
								<img :src="view.getImage(`emp_${marketer}`)" class="cardImg" :alt="rf.employeeName(marketer)" />
							</div>
						</div>

						<p v-if="computedCanPayWithFood">{{ $t("prePhase.needToPayWithFood", { currentSalary: computedTotalSalary, nbPays: computedNumPays }) }}</p>
						<p v-else>{{ $t("prePhase.needToPay", { currentSalary: computedTotalSalary }) }}</p>

						<template v-if="!computedCanAffordPayDay">
							<p v-if="plyr.hasMilestone(controller.currentPlayerIndex(), rf.FIRST_TRAINER_USED)">
								<span style="color: #f00">
									<i18n-t keypath="prePhase.cantAffordTrainer" tag="span" scope="global">
										<template #trainer><i>{{ $t("prePhase.firstTrainerUsed") }}</i></template>
									</i18n-t>
								</span>
								<br />
								<i18n-t keypath="prePhase.fireAnyway" tag="span" scope="global">
									<template #may><b>{{ $t("prePhase.may") }}</b></template>
								</i18n-t>
							</p>
							<p v-else style="color: #f00">{{ $t("prePhase.cantPayEmployees") }}</p>
						</template>

						<!-- Just fired reminder -->
						<div v-if="store.context.justFired.length > 0" class="reminder fireLine">
							<img v-for="(employee, idx) in store.context.justFired" :key="idx" :src="view.getImage(`emp_${employee}`)" class="cardSummaryDiv selectable" :title="$t('actionArea.clickToUnfire')" @click="localUnfireEmployee(employee)" />
							<b>{{ $t("actionArea.youreFired") }}&nbsp;</b>
							<img :src="view.getImage('fired')" class="firedImg" />
						</div>

						<!-- Fireable employees -->
						<div>
							<div v-for="employee in computedFireableEmployees" :key="employee" class="fireCardChoiceDiv selectable" @click="localFireEmployee(employee)">
								<img :src="view.getImage(`emp_${employee}`)" class="cardImg" :alt="rf.employeeName(employee)" />
							</div>
						</div>

						<br />
						<button class="actionsLineButton paydayResetButton" @click="resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
						<button v-if="!computedCanAffordPayDay && plyr.hasMilestone(controller.currentPlayerIndex(), rf.FIRST_TRAINER_USED)" class="actionsLineButton" @click="confirmTrainerKeepAll()">{{ $t("actionArea.okThankYou") }}</button>
						<button v-else-if="computedCanAffordPayDay && plyr.hasMilestone(controller.currentPlayerIndex(), rf.FIRST_BEER_SOLD)" class="actionsLineButton" @click="chooseBeerPayment()">{{ $t("prePhase.choosePaymentType") }}</button>
						<button v-else-if="computedCanAffordPayDay" class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
					</div>

					<!-- Nothing left to fire -->
					<div v-else>
						<div v-if="store.context.justFired.length > 0" class="reminder fireLine">
							<img v-for="(employee, idx) in store.context.justFired" :key="idx" :src="view.getImage(`emp_${employee}`)" class="cardSummaryDiv selectable" :title="$t('actionArea.clickToUnfire')" @click="localUnfireEmployee(employee)" />
							<b>{{ $t("actionArea.youreFired") }}&nbsp;</b>
							<img :src="view.getImage('fired')" class="firedImg" />
						</div>
						<p v-if="store.context.justFired.length > 0" style="color: #f00"><b>{{ $t("actionArea.cautionFireAll") }}</b></p>
						<button class="actionsLineButton paydayResetButton" @click="resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
						<button class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
					</div>
				</template>

				<!-- Clean Up Phase -->
				<template v-if="store.gameflow.phase === rf.PHASE_CLEAN_UP">
					<div>
						<!-- No fridge: everything is thrown away -->
						<div v-if="!cleanupHasFridge">
							<p>{{ $t("actionArea.noFridgeAllThrown") }}</p>
							<button class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
						</div>

						<!-- Kimchi collision: choose to store kimchi or the rest -->
						<div v-else-if="cleanupKimchiCollision">
							<p>{{ $t("prePhase.fridgeEitherKimchi") }}</p>
							<p>{{ $t("prePhase.yourItems") }}</p>
							<div class="fridgeItems">
								<img v-for="(resource, idx) in cleanupResources" :key="idx" :src="view.getImage(`item_${resource}`)" class="payFoodToken" :alt="resource" />
							</div>
							<button class="actionsLineButton choice-button" @click="controller.chooseFridgeType('kimchi')">{{ $t("prePhase.storeKimchi") }}</button>
							<button class="actionsLineButton choice-button" @click="controller.chooseFridgeType('rest')">{{ $t("prePhase.storeOtherItems") }}</button>
						</div>

						<!-- Normal fridge: click items to bin them, keep up to 10 -->
						<div v-else-if="cleanupResources.length > 0 || cleanupBinned.length > 0">
							<p v-if="cleanupResources.length > 10">{{ $t("actionArea.keepUpTo10") }}</p>
							<p v-else>{{ $t("actionArea.keepRemainingOrClick") }}</p>

							<!-- Binned items shown next to the bin, above the clickable line -->
							<div v-if="cleanupBinned.length > 0" class="fridgeBinnedLine">
								<img :src="view.getImage(rf.MILESTONES_STR[rf.FIRST_THROW_AWAY].img)" class="fridgeBinIcon" :alt="'bin'" />
								<img v-for="(resource, idx) in cleanupBinned" :key="idx" :src="view.getImage(`item_${resource}`)" class="fridgeBinned fridgeSelectable" :alt="resource" :title="$t('actionArea.clickToKeep')" @click="controller.unbinResource(resource)" />
							</div>

							<!-- Remaining items (click to bin) -->
							<div class="fridgeItems">
								<img v-for="(resource, idx) in cleanupResources" :key="idx" :src="view.getImage(`item_${resource}`)" class="fridgeSelectable" :alt="resource" @click="controller.binResource(resource)" />
							</div>

							<div class="fridgeButtons">
								<button class="actionsLineButton" @click="resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
								<button v-if="cleanupResources.length <= 10" class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
							</div>
						</div>

						<!-- No items to manage -->
						<div v-else>
							<p>{{ $t("actionArea.noItemsToManage") }}</p>
							<button class="actionsLineButton" @click="controller.endPlayerTurn(false, false)">{{ $t("workingDay.endTurn") }}</button>
						</div>
					</div>
				</template>

				<!-- CONFIRM END TURN -->
				<template v-if="store.context.action === rf.ACT_CONFORM_END_TURN">
					<button class="actionsLineButton" @click="controller.resetWholeTurn()">{{ $t("workingDay.resetWholeTurn") }}</button>
					<button class="actionsLineButton" @click="localEndTurn">{{ $t("workingDay.endTurn") }}</button>
				</template>

				<!-- COFFEE HISTORY INFO (toggled by the coffee "More Information" button) -->
				<div v-if="store.viewSettings.showCoffeeHistoryInfo" id="historyCoffeeInfodiv">
					<b>{{ $t("actionArea.coffeeHelpHeading1") }}</b>
					<br />
					{{ $t("actionArea.coffeeHelpBody1") }}
					<br />
					<br />
					<b>{{ $t("actionArea.coffeeHelpHeading2") }}</b>
					<br />
					{{ $t("actionArea.coffeeHelpBody2") }}
					<br />
					<br />
					<b>{{ $t("actionArea.coffeeHelpConfused") }}</b>
					<br />
					<i18n-t keypath="actionArea.coffeeHelpReadMore" tag="span" scope="global">
						<template #here><a href="/FCM/coffeeHelp/" target="_blank">{{ $t("topMenuViews.hereLower") }}</a></template>
					</i18n-t>
				</div>
			</template>
		</div>

		<!-- Expert Panel: independent of canPlay, shows preset after player has moved.
		     Hidden during your actual working day turn and during end-turn confirm. -->
		<template v-if="prePhaseMode && !(store.gameflow.phase === rf.PHASE_WORKING_DAY && store.gameflow.subphase === rf.SUBPHASE_CONFIRM_END_TURN && !isOnlyHumanLeft)">
			<ActionAreaPrePhase :mode="prePhaseMode" @close="closePrePhase" />
		</template>
		<template v-else-if="!(store.gameflow.phase === rf.PHASE_WORKING_DAY && (personal.canPlay() || store.gameflow.subphase === rf.SUBPHASE_CONFIRM_END_TURN))">
			<ExpertPanel @startPrePhase="startPrePhase" />
		</template>
	</div>
</template>

<style scoped>
#actionAreaDiv {
	font-weight: bolder;
	font-family: Arial, Helvetica, sans-serif;
}

.resignImg {
	width: 100px;
	height: 100px;
	margin: 20px;
	border: 2px solid black;
}

/* Coffee "More Information" panel */
#historyCoffeeInfodiv {
	background-color: #a1cfa8;
	border: 2px solid black;
	width: 70%;
	height: fit-content;
	padding: 10px;
	margin: 10px auto;
	text-align: center;
}

.errorText,
#loggedOutText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.redText {
	color: red;
}

#successText {
	color: darkgreen;
	background-color: lightblue;
}

#listDiv {
	margin: auto;
	width: fit-content;
	font-size: 20px;
}

.centreList {
	text-align: left;
	list-style-position: inside;
}

.boxReminderImg {
	width: 105px;
	height: 150px;
	vertical-align: middle;
	margin-left: 10px;
}

#fLoadingBar {
	width: 100%;
	text-align: center;
	font-size: 40px;
	font-weight: bolder;
}

#gameEndDiv {
	font-size: 30px;
	font-weight: bold;
	margin-top: 10px;
}

/** GENERAL WORKING DAY */

.selectable {
	cursor: pointer;
	border: 3px solid yellow;
}
.selectable:hover {
	border-color: lightgreen;
}

.selected {
	border-color: lightgreen !important;
	border-width: 5px !important;
}

.cardImg {
	width: 100%;
	height: 100%;
}

/** PAYDAY */
.cardSummaryDiv {
	border-radius: 10px;
	box-sizing: border-box;
	width: 97px;
	height: 150px;
	margin: 5px;
	display: inline-block;
	overflow: hidden;
	border: 2px solid black;
}

/* fired-line cards: yellow outline until hovered (overrides cardSummaryDiv's default border) */
.fireLine .cardSummaryDiv.selectable:not(:hover) {
	border: 3px solid yellow;
}
.fireLine .cardSummaryDiv.selectable:hover {
	border: 3px solid lightgreen;
}

.fireCardChoiceDiv {
	border-radius: 10px;
	box-sizing: border-box;
	width: 160px;
	height: 250px;
	margin: 5px;
	display: inline-block;
	overflow: hidden;
}

.fireLine {
	display: flex;
	align-items: center;
	justify-content: center;
}

.payFoodToken {
	margin: 5px;
	vertical-align: middle;
	filter: drop-shadow(3px 0 0 yellow) drop-shadow(0 3px 0 yellow) drop-shadow(-3px 0 0 yellow) drop-shadow(0 -3px 0 yellow);
	border: none;
}

.payFoodToken:hover {
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen);
}

.paidToken {
	height: 25px;
	cursor: pointer;
}

.paidToken:hover {
	filter: drop-shadow(1px 1px 2px rgba(200, 0, 0, 0.8));
}

.payBinIcon {
	height: 25px;
	vertical-align: middle;
	margin-right: 4px;
}

.fridgeItems {
	margin: 5px 0;
}

.choice-button {
	margin: 5px;
}

/** CLEANUP / FRIDGE UI */
.fridgeSelectable {
	height: auto;
	max-width: 91px;
	max-height: 91px;
	margin: 4px;
	vertical-align: middle;
	filter: drop-shadow(3px 0 0 yellow) drop-shadow(0 3px 0 yellow) drop-shadow(-3px 0 0 yellow) drop-shadow(0 -3px 0 yellow);
	transition: filter 0.15s ease;
}

.fridgeSelectable:hover {
	cursor: pointer;
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen);
}

.fridgeBinnedLine {
	position: relative;
	padding: 5px;
	margin-bottom: 5px;
}

.fridgeBinIcon {
	height: 45px;
	vertical-align: middle;
	margin-right: 6px;
}

.fridgeBinned {
	height: auto;
	max-width: 25px;
	max-height: 25px;
	vertical-align: middle;
	margin: 2px;
}

.fridgeButtons {
	margin-top: 10px;
}

.fridgeButtons .actionsLineButton {
	margin-right: 10px;
}

.firedImg {
	width: 100px;
	vertical-align: middle;
}

.paydayResetButton {
	margin-right: 60px;
}

/** CHOOSE RESERVE */
.resCardChoiceDiv {
	border-radius: 10px;
	box-sizing: border-box;
	width: 127px;
	height: 200px;
	margin: 5px;
	display: inline-block;
	overflow: hidden;
}

/** TURN ORDER */
.turnOrderButton {
	width: 120px;
	height: 98px;
	display: inline-block !important;
}
.playerTurnOrderDiv {
	border: 2px solid black !important;
	box-sizing: border-box;
	display: inline-block;
	margin: 0 5px;
	padding-top: 5px;
	padding-bottom: 2px;
	width: 120px;
	min-width: 40px;
	height: 98px;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-weight: bolder;
	cursor: pointer;
	position: relative;
	overflow: hidden;
	background-color: gray;
	color: white;
	font-weight: 500;
	vertical-align: middle;
}

.emptyTurnOrderDiv {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	text-align: center;
}

.playerTurnOrderRestoImg {
	width: 50px;
	border-radius: 5px;
}

.playerTurnOrderNameSpan {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/** RESTRUCTURING */
.beachChoiceMini {
	background-color: #e7bf93;
	position: relative;
	width: fit-content;
	margin: auto;
	padding-left: 20px;
	min-height: 110px;
	min-width: 20px;
	display: inline-block;
}

.beachTitleMini {
	color: rgba(255, 255, 255, 0.8);
	text-transform: uppercase;
	font-size: 30px;
	font-weight: bold;
	position: absolute;
	-moz-transform: rotate(270deg);
	-webkit-transform: rotate(270deg);
	-o-transform: rotate(270deg);
	-ms-transform: rotate(270deg);
	transform: rotate(270deg);
	top: 40px;
	left: -40px;
}

.beachMiniEmployeeDiv {
	width: 65px;
	height: 101px !important;
	margin: 5px;
	box-sizing: border-box;
	border-radius: 5px;
	display: inline-block;
}

.restructureCEOcard {
	height: 200px;
	width: 136px;
	margin: auto;
	margin: 5px auto 5px auto;
	border: #000 1px solid;
	box-sizing: border-box;
	border-radius: 5px;
}

.ceoSlotDiv {
	width: 136px;
	height: 200px;
	margin: 5px;
	box-sizing: border-box;
	border-radius: 15px;
	overflow: hidden;
	background-color: rgba(30, 41, 192, 1);
	color: lightblue;
	font-size: 25px;
	position: relative;
	display: inline-block;
	vertical-align: top;
}

.ceoSlotTextDiv {
	position: absolute;
	transform: translate(4%, 275%) rotate(-45deg);
	user-select: none;
	-webkit-user-select: none;
}

.normalSlotDiv {
	border-radius: 15px;
	overflow: hidden;
	height: 200px;
	width: 135px;
	background-color: rgba(30, 41, 192, 0.808);
	display: inline-block;
	margin: 5px;
}

.mainBeachDiv {
	background-color: #e7bf93;
	position: relative;
	min-height: 267px;
}
.mainBeachTitle {
	color: rgba(255, 255, 255, 0.5);
	text-transform: uppercase;
	font-size: 70px;
	font-weight: bold;
	position: absolute;
	-moz-transform: rotate(270deg);
	-webkit-transform: rotate(270deg);
	-o-transform: rotate(270deg);
	-ms-transform: rotate(270deg);
	transform: rotate(270deg);
	top: 90px;
	left: -90px;
}

.ceoBonusLine {
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	margin: auto;
	width: 100%;
	background-color: #d4eafd;
}

.ceoBonusOptionDiv {
	border: yellow 2px solid;
	height: 250px;
	width: 160px;
	margin-right: 20px;
	border-radius: 10px;
	overflow: hidden;
	position: relative;
}
.ceoBonusOptionDiv:hover {
	border: lightgreen 2px solid;
	cursor: pointer;
}
.ceoBonusActionDiv {
	position: absolute;
	bottom: 0;
	width: 100%;
	height: 60px;
}

.ceoBonusActionImg {
	width: 100%;
	height: 100%;
}

.ceoBonusOptionMainImg {
	width: 100% !important;
	height: 100% !important;
}
.ceoBonusOptionDivSelected {
	border: lightgreen 2px solid !important;
}

.moduleDraftSection {
	padding: 5px;
	margin-bottom: 5px;
}

.moduleDraftRow {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	margin-top: 5px;
}

.moduleDraftRowCentered {
	justify-content: center;
}

.moduleSelectedRow {
	display: flex;
	justify-content: center;
	margin-top: 5px;
}

.moduleSelectedCol {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.moduleSelectedInfo {
	display: inline-block;
	position: relative;
	top: 7px;
	text-align: center;
}

.moduleSelectedInfo b {
	font-size: 14px;
}
</style>
