<script setup>
import TurnNudge from "./utils/TurnNudge.vue"
/** Action area - This is where you interact with the game flow.
 * Confirm actions, end turn, reset turn.
 * Also, it's where you're told what to do next, eg
 * "Select a hex to add to the grid"
 *
 */
import * as rf from "../js/CNSreference"
import * as controller from "../js/CNScontroller"
import * as funcs from "../js/CNSfuncs"
import * as model from "../js/CNSmodel"
import * as map from "../js/CNSmap"
import * as Bot from "../js/CNSbot"
import i18n from "../i18n"

import { ref, computed, watch, onUnmounted } from "vue"

import { useModelStore } from "../stores/CNSstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/CNSpersonal.js"
const personal = usePersonalStore()

function canMoveToNetworkPhase(hexActionsUsed, agents) {
	if (agents === 0 && hexActionsUsed === 1) return true
	if (agents === 1 && (hexActionsUsed === 1 || hexActionsUsed === 2)) return true
	if (agents === 2 && hexActionsUsed >= 1) return true
}

function localEndPlayerTurn(withoutConfirmation) {
	store.context.action = rf.ACT_CONFIRM_END_TURN
	if (withoutConfirmation) controller.endPlayerTurn()
}

function resetWholeTurn() {
	funcs.importModel(store.wholeTurnResetData, false)
	// Recalc estate agents
	let hexRefsInNetwork = map.getHexesInNetwork(controller.currentPlayerObj(), true)
	if (hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_A) || hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_B)) store.context.realEstateAgentsInNetwork = 1
	if (hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_A) && hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_B)) store.context.realEstateAgentsInNetwork = 2
}

function resetNetworkPhase() {
	funcs.importModel(store.networkPhaseResetData, true)

	store.context.placeableLinks.splice(0)
	store.context.placeableTiles.splice(0)
	store.context.action = rf.ACT_ADD_LINK
	map.setNeighbours()
	map.setPlaceableLinks(controller.currentPlayerObj(), false)

	store.phaseResetData = funcs.exportModel(false)
	model.setCurrentProdRes(controller.currentPlayerObj())
}

function resetPhase() {
	let phase = store.gameflow.phase
	if (phase === rf.PHASE_STORE_RES) funcs.importModel(store.phaseResetData, true)
	else funcs.importModel(store.phaseResetData, false)

	if (phase === rf.PHASE_CONFIRM_PIRATE) store.gameflow.phase = rf.PHASE_PRODUCTION
	else store.gameflow.phase = phase

	if (!store.context.startingTurnAfterPirates) controller.startPhase(store.gameflow.phase)
}
function offerResourceStoragePhase() {
	if (store.gameflow.phase !== rf.PHASE_STORE_RES) return false
	if (!store.useExpansion && store.context.availableResources.reduce((acc, curr) => acc + curr, 0) > 5) return true
	if (store.useExpansion && store.context.availableResources.reduce((acc, curr) => acc + curr, 0) > 3) return true
}

function offerResourceStoragePhaseButton() {
	if (store.gameflow.phase !== rf.PHASE_STORE_RES) return false
	if (!store.useExpansion) return false
	if (controller.currentPlayerObj().storedResources.length > 0) return false
	if (store.context.availableResources.reduce((acc, curr) => acc + curr, 0) > 5) return false
	return true
}

function stopStoringResources() {
	model.storeResources()
	store.context.action = rf.ACT_CONFIRM_END_TURN
	controller.endPlayerTurn()
}

function getOrdinal(num) {
	return i18n.global.t("action.ordinal" + num)
}
function localCheckResign() {
	store.context.action = rf.ACT_CONFIRM_RESIGN
}
function cancelKickout() {
	personal.kickoutRequired = 0
}

function passKickout() {
	personal.kickoutRequired = 0
	personal.removeCurrentFlexTime = true
	personal.removeCurrentFlexTimeName = controller.currentPlayerObj().name
	controller.endPlayerTurn()
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

// Returns my vote entry [target, time] if I have voted to kick out the current player
function myKickoutVote() {
	const vote = store.kickoutVotesData[personal.name]
	if (!vote || !Array.isArray(vote) || vote[0] !== currentKickoutTarget()) return null
	return vote
}

// 2-player games keep the old direct kickout; otherwise I must have a vote
// for this player that is more than 2 days old before I can kick out alone
function canKickoutNow() {
	if (store.kickoutVoteThreshold <= 1) return true
	const myVote = myKickoutVote()
	if (!myVote) return false
	return Date.now() - myVote[1] >= rf.KICKOUT_SOLO_DELAY_MS
}

function kickoutVoteCount() {
	const target = currentKickoutTarget()
	let count = 0
	for (const voter in store.kickoutVotesData) {
		const vote = store.kickoutVotesData[voter]
		if (Array.isArray(vote) && vote[0] === target) count++
	}
	return count
}

function kickoutVoters() {
	const target = currentKickoutTarget()
	let voters = i18n.global.t("common.none")
	for (const voter in store.kickoutVotesData) {
		const vote = store.kickoutVotesData[voter]
		if (Array.isArray(vote) && vote[0] === target) {
			if (voters === i18n.global.t("common.none")) voters = String(voter)
			else voters += ", " + voter
		}
	}
	return voters
}

// My vote would bring the count to the threshold, so the kickout goes ahead
function isLastVoteRequired() {
	return kickoutVoteCount() + 1 >= store.kickoutVoteThreshold
}

const soloKickoutCountdown = ref("")
let soloKickoutCountdownTimer = null

function updateSoloKickoutCountdown() {
	const myVote = myKickoutVote()
	if (!myVote || store.kickoutVoteThreshold <= 1) {
		soloKickoutCountdown.value = ""
		return
	}
	let remainingMs = rf.KICKOUT_SOLO_DELAY_MS - (Date.now() - myVote[1])
	if (remainingMs <= 0) {
		clearInterval(soloKickoutCountdownTimer)
		soloKickoutCountdownTimer = null
		soloKickoutCountdown.value = ""
		return
	}
	let totalSeconds = Math.floor(remainingMs / 1000)
	let hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0")
	let mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")
	let secs = String(Math.floor(totalSeconds % 60)).padStart(2, "0")
	soloKickoutCountdown.value = hours + ":" + mins + ":" + secs
}

watch(
	() => store.kickoutVotesData[personal.name],
	(vote) => {
		if (vote && Array.isArray(vote) && soloKickoutCountdownTimer == null) {
			updateSoloKickoutCountdown()
			soloKickoutCountdownTimer = setInterval(updateSoloKickoutCountdown, 1000)
		}
	},
	{ immediate: true }
)

onUnmounted(() => {
	if (soloKickoutCountdownTimer != null) clearInterval(soloKickoutCountdownTimer)
})

const totalAvailableResources = computed(() => store.context.availableResources.reduce((acc, curr) => acc + curr, 0))

function localSellMovies() {
	model.sellMovies(controller.currentPlayerIndex())
}

function cancelSales() {
	model.cancelSellMovies()
}
</script>

<template>
	<div id="actionAreaDiv">
		<template v-if="personal.name == undefined">
			<div id="loggedOutText">
				<i18n-t keypath="action.loggedOutPrompt" tag="span" scope="global">
					<template #register><a href="/register">{{ $t("action.register") }}</a></template>
					<template #login><a href="/login">{{ $t("action.login") }}</a></template>
				</i18n-t>
				<br />
			</div>
			<br />
		</template>

		<template v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
			<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
				{{ $t("action.kickoutUsedAllTime", { name: controller.currentPlayerObj().name }) }}
				<br />
				<br />
				{{ $t("action.remainingFlexTime") }}
				<span id="flexiKickoutTimerSpan">{{ getFlexiKickoutTImerText() }}</span>
				<br />
				<br />
				<i18n-t keypath="action.forMoreInfo" tag="span" scope="global">
					<template #help><b><a href="/help/" target="_blank">{{ $t("action.help") }}</a></b></template>
				</i18n-t>
			</div>
			<div v-else id="kickoutDiv">
				<br />
				<template v-if="canKickoutNow()">
					<template v-if="store.context.action !== rf.ACT_CONFIRM_KICKOUT">
						{{ $t("action.kickoutTimedOut", { name: controller.currentPlayerObj().name }) }}
						<br />
						{{ $t("action.kickoutDirectPrompt", { name: controller.currentPlayerObj().name }) }}
						<br />
						{{ $t("action.kickoutProceed") }}
						<br />
						<br />
						{{ $t("action.kickoutAllowMoreTimeReload", { name: controller.currentPlayerObj().name }) }}
						<br />

						<br />
						<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
						<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button></span>
						<span>
							<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("action.keepPlayer", { name: controller.currentPlayerObj().name }) }}</button>
						</span>
						<span><button class="actionsLineButton" id="confirmKickoutButton" @click="store.context.action = rf.ACT_CONFIRM_KICKOUT">{{ $t("action.confirmKickout") }}</button></span>
					</template>
					<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
						{{ $t("action.permanentlyRemove", { name: controller.currentPlayerObj().name }) }}
						<br />
						<b>{{ $t("action.cannotBeUndone") }}</b>
						<br />
						<br />
						{{ $t("action.checkChat") }}
						<br />
						{{ $t("action.gracePeriod") }}

						<br />
						<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
						<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button></span>
						<span>
							<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">{{ $t("action.permanentlyKickout", { name: controller.currentPlayerObj().name }) }}</button>
						</span>
					</template>
				</template>
				<template v-else>
					{{ $t("action.kickoutTimedOut", { name: controller.currentPlayerObj().name }) }}
					<br />
					{{ $t("action.voteRequired", { name: controller.currentPlayerObj().name }) }}
					<br />
					{{ $t("action.votesLine", { count: kickoutVoteCount(), threshold: store.kickoutVoteThreshold, voters: kickoutVoters() }) }}
					<br />
					<br />
					<span v-if="!myKickoutVote()">
						<template v-if="isLastVoteRequired()">
							{{ $t("action.permanentlyRemove", { name: controller.currentPlayerObj().name }) }}
							<br />
							<b>{{ $t("action.cannotBeUndone") }}</b>
							<br />
							<br />
						</template>
						<button class="actionsLineButton" id="voteKickoutButton" @click="Bot.actionPlayerKickout">{{ $t("action.voteToKickout", { name: controller.currentPlayerObj().name }) }}</button>
					</span>
					<span v-else>
						{{ $t("action.youVoted", { name: controller.currentPlayerObj().name }) }}
						<br />
						{{ $t("action.soloKickout", { countdown: soloKickoutCountdown }) }}
					</span>
					<br />
					<br />
					<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
					<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button></span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("action.keepPlayer", { name: controller.currentPlayerObj().name }) }}</button>
					</span>
				</template>
			</div>
		</template>

		<template v-if="store.topMenuViews.rewindErrorText !== ''">
			<h1 id="rewindErrorText">{{ store.topMenuViews.rewindErrorText }}</h1>
		</template>

		<template v-if="store.topMenuViews.errorText !== ''">
			<h1 id="errorText">{{ store.topMenuViews.errorText }}</h1>
		</template>

		<template v-if="store.topMenuViews.successText !== ''">
			<h1 id="successText">{{ store.topMenuViews.successText }}</h1>
		</template>

		<!-- ALWAYS SHOWS GAME END-->
		<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
			<div id="gameEndDiv">
				{{ $t("action.gameOver") }}
				<br />
				<br />
				<span v-if="store.oldBoysNetwork.length >= 10">{{ $t("action.allCigarsUsed") }}</span>
				<span v-else-if="store.hexDrawPile.length + store.hexDiscardPile.length === 0">{{ $t("action.allTilesUsed") }}</span>
				<span v-else>{{ $t("action.onePlayerRemaining") }}</span>
				<br />
				<br />
				{{ $t("action.winner") }}
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][0][0]].colour)">{{ store.players[store.history[store.history.length - 1][3][0][0]].displayName }} € {{ store.players[store.history[store.history.length - 1][3][0][0]].score }} M</span>
				</div>

				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][0][0]].name === personal.name">
					<h1>{{ $t("action.congratulations") }}</h1>
				</template>

				<br />
				<span v-if="store.players[store.gameflow.fullTurnOrder[0]].score === store.players[store.gameflow.fullTurnOrder[1]].score">{{ $t("action.nextInTurnOrder") }}</span>
				<span v-else>{{ $t("action.outrightWinner") }}</span>

				<br />
				<br />
				<i18n-t keypath="action.fancyARematch" tag="span" scope="global">
					<template #rematch><a :href="'/createCNSpage/' + String(personal.gameID) + '/'">{{ $t("action.rematch") }}</a></template>
				</i18n-t>
				<br />

				<template v-for="(entry, idx) in store.history[store.history.length - 1][3]" :key="idx">
					<template v-if="idx !== 0">
						{{ getOrdinal(idx + 1) }}:
						<div class="playerScoreSummaryDiv">
							<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].name }} € {{ store.players[entry[0]].score }} M</span>
						</div>
					</template>
					<br />
				</template>
			</div>
		</template>

		<template v-if="personal.canPlay()">
			<!-- TURN 1 INFO -->
			<template v-if="store.gameflow.turn === 1 && !store.topMenuViews.showReplay">
				<h2>{{ $t("action.welcomeTitle") }}</h2>
				<b>
					{{ $t("action.welcomeTableNote") }}
				</b>
				<br />
				<br />
				<div class="intro_items_list_div">
					{{ $t("action.welcomeActions") }}
					<br />
					{{ $t("action.welcomePlace") }}
					<br />
					{{ $t("action.welcomeChoose") }}
					<br />
					<br />
					{{ $t("action.welcomeRewind") }}
					<br />
					{{ $t("action.welcomeRewindNormal") }}
					<br />
					{{ $t("action.welcomeRewindHidden") }}
					<br />
					<br />
					{{ $t("action.welcomeReplay") }}
					<br />
					{{ $t("action.welcomeReplayExit") }}
					<br />
					{{ $t("action.welcomeReplayHidden") }}
					<br />
					<br />
					<i18n-t keypath="action.welcomeMoreInfo" tag="span" scope="global">
						<template #help><b><a class="linkOther" href="/CNS/help/" target="_blank">{{ $t("action.cannesHelp") }}</a></b></template>
					</i18n-t>
				</div>
				<br />
			</template>
			<!-- MOVE PIRATE -->
			<template v-if="store.gameflow.phase === rf.PHASE_MOVE_PIRATE">
				{{ $t("action.movePirates") }}
				<br />
				<br />
				<span v-if="store.context.pirateActionsUsed >= 2">
					{{ $t("action.piratesAnyParty") }}
				</span>
				<span v-else>{{ $t("action.piratesNewParty") }}</span>
				<br />
				<br />
			</template>
			<!-- CONFIRM RESIGN -->
			<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN">
				<p>{{ $t("action.resignConfirm") }}</p>
				<p>{{ $t("action.resignUnbalance") }}</p>
				<p>{{ $t("action.resignCarryOn") }}</p>
				<p>{{ $t("action.resignStillCompete") }}</p>
				<button class="actionsLineButton resignButton" @click="resetWholeTurn">{{ $t("action.carryOnPlaying") }}</button>
				<button class="actionsLineButton" @click="Bot.actionResign">{{ $t("action.confirmResignation") }}</button>
			</template>

			<!-- PLACE HEXES -->
			<div v-if="store.gameflow.phase === rf.PHASE_PLACE_HEXES && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_CONFIRM_RESIGN">
				{{ $t("action.placeHexesIntro") }}
				<span v-if="store.useExpansion && !controller.currentPlayerObj().storedResources.some((value) => value >= 20)">
					<br />
					{{ $t("action.storeTileInstead") }}
					<template v-if="controller.currentPlayerObj().links.length === 0">
						<br />
						<span class="warningSpan">{{ $t("action.mustPlaceLink") }}</span>
					</template>
				</span>
				<span v-if="store.context.realEstateAgentsInNetwork === 1">
					<br />
					{{ $t("action.oneEstateAgent") }}
				</span>
				<span v-if="store.context.realEstateAgentsInNetwork === 2">
					<br />
					{{ $t("action.twoEstateAgents") }}
				</span>
				<span v-if="controller.currentPlayerObj().storedResources.some((value) => value >= 20)">
					<br />
					{{ $t("action.placeStoredTile") }}
				</span>
				<br />
				<button @click="localCheckResign" v-if="controller.canResign()" class="actionsLineButton resignButton">{{ $t("action.resign") }}</button>
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("common.reset") }}</button>
				<button @click="controller.endCurrentPhase(true)" v-if="canMoveToNetworkPhase(store.context.hexActionsUsed, store.context.realEstateAgentsInNetwork)" class="actionsLineButton">{{ $t("action.moveOnNetwork") }}</button>
				<button @click="localEndPlayerTurn(true)" v-if="store.context.hexActionsUsed >= 2" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
			</div>

			<!-- PLACE LINKS -->
			<div v-if="store.gameflow.phase === rf.PHASE_NETWORK">
				<span v-if="store.context.linksPlacedThisTurn === 0">
					<span v-if="controller.currentPlayerObj().links.length <= 3">{{ $t("action.mayPlace2Links") }}</span>
					<span v-else-if="controller.currentPlayerObj().links.length == 4">{{ $t("action.mayPlace1Move1") }}</span>
					<span v-else>{{ $t("action.mayMove2Links") }}</span>
				</span>
				<span v-if="store.context.linksPlacedThisTurn === 1">
					{{ $t("action.placed1Link") }}
					<span v-if="controller.currentPlayerObj().links.length < 5">{{ $t("action.mayPlace1More") }}</span>
					<span v-else>{{ $t("action.mayMove1More") }}</span>
				</span>

				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button @click="resetNetworkPhase" class="actionsLineButton">{{ $t("action.resetNetwork") }}</button>
				<button v-if="store.context.action !== rf.ACT_READD_LINK" @click="controller.endCurrentPhase(true)" class="actionsLineButton">{{ $t("action.moveOnProduction") }}</button>
			</div>

			<!-- PRODUCTION -->
			<div v-if="store.gameflow.phase === rf.PHASE_PRODUCTION && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_PIRATE && store.context.action !== rf.ACT_SELL_CANNES">
				{{ $t("action.convertResources") }}

				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button v-if="store.networkPhaseResetData !== ''" @click="resetNetworkPhase" class="actionsLineButton">{{ $t("action.resetNetwork") }}</button>
				<button @click="resetPhase" class="actionsLineButton">{{ $t("action.resetProduction") }}</button>
				<button @click="controller.endCurrentPhase(true)" class="actionsLineButton">{{ $t("action.finishProduction") }}</button>
			</div>

			<div v-if="store.gameflow.phase === rf.PHASE_PRODUCTION && store.context.action === rf.ACT_SELL_CANNES">
				{{ $t("action.confirmMovieSales") }}
				<br />
				<button class="actionsLineButton" @click="localSellMovies">{{ $t("action.sellMovies") }}</button>
				<button class="actionsLineButton" @click="cancelSales">{{ $t("common.cancel") }}</button>
			</div>

			<!-- STORE RESOURCES -->
			<div v-if="offerResourceStoragePhase()">
				{{ $t("action.store5Resources") }}
				<br />
				<span :class="[{ tooManyResources: totalAvailableResources > 5 }, { tooManyResForTile: totalAvailableResources >= 4 && totalAvailableResources <= 5 }, { canStoreAllRes: totalAvailableResources <= 3 }]">
					<template v-if="totalAvailableResources > 5">{{ $t("action.youHaveResourcesDiscard", { count: totalAvailableResources }) }}</template>
					<template v-else-if="totalAvailableResources >= 4">{{ $t("action.youHaveResourcesNoTile", { count: totalAvailableResources }) }}</template>
					<template v-else>{{ $t("action.youHaveResourcesAll", { count: totalAvailableResources }) }}</template>
				</span>

				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button v-if="store.networkPhaseResetData !== ''" @click="resetNetworkPhase" class="actionsLineButton">{{ $t("action.resetNetwork") }}</button>
				<button @click="resetPhase" class="actionsLineButton">{{ $t("action.resetResources") }}</button>
				<button v-if="offerResourceStoragePhaseButton()" class="actionsLineButton" @click="stopStoringResources">{{ $t("action.storeCurrentEndTurn") }}</button>
			</div>

			<!-- Confirm Turn End -->
			<div v-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
				<span v-if="store.gameflow.phase === rf.PHASE_PRODUCTION">
					<br />
					<br />
					{{ $t("action.lessThanResourcesStored", { count: store.useExpansion ? 3 : 5 }) }}
					<br />
				</span>

				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button v-if="store.networkPhaseResetData !== ''" @click="resetNetworkPhase" class="actionsLineButton">{{ $t("action.resetNetwork") }}</button>

				<button @click="resetPhase" v-if="store.gameflow.phase !== rf.PHASE_PLACE_HEXES" class="actionsLineButton">
					<span v-if="store.gameflow.phase === rf.PHASE_STORE_RES">{{ $t("action.resetResourcePhase") }}</span>
					<span v-else>{{ $t("action.resetProductionPhase") }}</span>
				</button>
				<button @click="controller.endPlayerTurn()" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
			</div>

			<!-- Confirm PIRATE Turn End -->
			<div v-if="store.context.action === rf.ACT_CONFIRM_PIRATE_PLACEMENT">
				{{ $t("action.confirmPiratePlacement") }}
				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("common.cancel") }}</button>
				<button @click="controller.endPlayerPiratePlacementTurn()" class="actionsLineButton">{{ $t("action.confirm") }}</button>
			</div>

			<!-- Confirm Turn End -->
			<div v-if="store.gameflow.phase === rf.PHASE_CONFIRM_PIRATE">
				{{ $t("action.piratedIntro") }}
				<br />
				<br />
				<span class="warningSpan">{{ $t("action.actionsSaved") }}</span>
				<!--<br/>Your actions up to this point will be saved. You will not be able to undo them later.-->
				<br />
				<br />
				{{ $t("action.confirmEndTurnQuestion") }}
				<br />
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button @click="resetPhase" v-if="store.gameflow.phase !== rf.PHASE_PLACE_HEXES" class="actionsLineButton">{{ $t("action.resetPhase") }}</button>
				<button @click="controller.endPlayerPirateTurn()" class="actionsLineButton">{{ $t("action.confirmTurnToPoint") }}</button>
			</div>
		</template>
	</div>
</template>

<style scoped>
.intro_items_list_div {
	width: fit-content;
	text-align: left;
	margin: 9px auto;
}

.warningSpan {
	font-weight: 900;
	color: darkgoldenrod;
}

.resignButton {
	margin-right: 100px;
}

#actionAreaDiv {
	font-weight: bolder;
}

#gameEndDiv {
	font-size: 30px;
	font-weight: bold;
}

#rewindErrorText,
#loggedOutText,
#errorText {
	/*margin: 0;
    width: 100%;*/
	font-weight: bolder;
	/*text-align: center;*/
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.tooManyResources {
	/*background-color: lightgoldenrodyellow;*/
	color: darkred;
}

.tooManyResForTile {
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.canStoreAllRes {
	background-color: lightgreen;
	color: darkgreen;
}

.playerScoreSummaryDiv {
	border: 1px solid black;
	display: inline-block;
	font-size: 30px;
	margin: 4px;
	padding: 0px;
}

.playerScoreSummaryDiv span {
	padding: 4px;
	padding-left: 8px;
	padding-right: 8px;
}

#successText {
	color: darkgreen;
	background-color: lightblue;
}
</style>
