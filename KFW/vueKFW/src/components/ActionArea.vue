<script setup>
import TurnNudge from "./utils/TurnNudge.vue"
import * as rf from "../js/KFWreference"
import * as view from "../js/KFWview"
import * as model from "../js/KFWmodel"
import * as controller from "../js/KFWcontroller"
import * as Bot from "../js/KFWbot"
import * as IO from "../backend/KFW_IO"
import * as village from "../js/KFWvillage"
import * as rules from "../js/KFWrules"
import i18n from "../i18n"

import { ref, watch, onUnmounted } from "vue"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

//const confirmTournamentReplacement = ref(false)
const selectedPassOption = ref("1")

function setPassFlag() {
	controller.currentPlayerObj().passFlag = parseInt(selectedPassOption.value)
}

function resetWholePlayerTurn() {
	store.clearContext()
	store.meeplePopupSetter.showPopup = false

	model.resetWholeTurn()
	controller.startPlayerTurn()
}

function localEndPlayerTurn() {
	controller.endPlayerTurn()
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

function finishAddingMeeples() {
	// You now have enough meeples for a valid bid / to activate a tile
	store.removeAllActiveHighlights()
	model.unhighlightOutbidMeeples()
	store.meeplePopupSetter.showPopup = false

	// If you were bidding, then just move to end turn
	if (store.context.selectedTileArea === rf.TILE_BIDDING_AREA) {
		store.context.action = rf.ACT_CONFIRM_END_TURN
		store.removeAllActiveHighlights()

		// Add the history
		model.addHistory(rf.HIST_BID_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
		controller.endPlayerTurn()
	}
	// If you activated a tile, move on to that action
	else if (store.context.selectedTileArea === rf.TILE_ACTION_AREA) {
		model.processTileAction(store.context.selectedTile)
	}
}

function finishedMovingAndUpgrading() {
	store.context.remainingMoves = 0
	store.context.remainingUpgrades = 0
	model.addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	//store.context.action = rf.ACT_CONFIRM_END_TURN
	controller.endPlayerTurn()
}

function localSetRandomMeepleOrSkill(type) {
	let message = i18n.global.t("model.endTurnToGet")
	if (type === 0) {
		message += `<img class="meepleInMessage" src="${view.getImage("meeple_random")}" />`
		let histData = [0, rf.MEEPLE_RANDOM] // NB 0 INDICATED NEEPLE WAS CHOSEN
		store.context.historyObj.push([...histData])
		model.addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER, 1, store.history.length - 1, [...histData]])
		controller.currentPlayerObj().knownHiddenMeeples[4]++
	} else if (type === 1) {
		message += `<img class="skillTileInMessage" src="${view.getImage("skillTile_random")}" />`
		let histData = [1, rf.SKILL_ANY_RANDOM] // NB 1 INDICATED SKILL WAS CHOSEN
		// Except if using bookkeper A
		if (store.context.selectedTile.tileID[store.context.selectedTile.upgraded] === rf.TILE_M_SUMMER_BOOKKEEPER_A) histData = [rf.SKILL_ANY_RANDOM]

		store.context.historyObj.push([...histData])
		model.addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_SKILLS_FROM_BAG_TO_PLAYER, 1, store.history.length - 1, [...histData]])
		controller.currentPlayerObj().knownHiddenSkillTiles[3]++
	}
	store.gameMessages.turnEndText = message
	store.context.action = rf.ACT_CONFIRM_END_TURN
}

function localPassTurn() {
	store.clearMessages()
	if (!store.gameflow.passedPlayerIndexes.includes(controller.currentPlayerIndex())) store.gameflow.passedPlayerIndexes.push(controller.currentPlayerIndex())
	model.addHistory(rf.HIST_PASS_TURN, controller.currentPlayerIndex(), 0, [])
	store.context.action = rf.ACT_CONFIRM_END_TURN
	selectedPassOption.value = "1"
	controller.endPlayerTurn()
}

function clickedWinterTileSelect(tileID) {
	store.context.selectedWinterTileIDs.push(tileID)
	controller.currentPlayerObj().hiddenWinterTile_tileIDs = controller.currentPlayerObj().hiddenWinterTile_tileIDs.filter((tID) => tID !== tileID)
}

function clickedChooseNewBoatTile(tileID) {
	model.replaceSeaBation2(tileID)
	store.context.action = rf.ACT_CONFIRM_END_TURN
}

function clickedWinterTileChosen(tileID) {
	store.context.selectedWinterTileIDs = store.context.selectedWinterTileIDs.filter((tID) => tID !== tileID)
	controller.currentPlayerObj().hiddenWinterTile_tileIDs.push(tileID)
}

function cancelMovingRes() {
	store.context.action = rf.ACT_MOVE_AND_UPGRADE
}

function localAddResToPlayer(playerIndex, res) {
	store.context.action = rf.ACT_CONFIRM_END_TURN
	store.context.action2 = rf.ACT_CONFIRM_END_TURN
	if (store.availableResources[res] > 0) {
		store.availableResources[res]--
		village.addResourcesToVillage(playerIndex, store.context.selectedTile.tileID[store.context.selectedTile.upgraded], [res])
		// This only comes from a tile action, so if it's complete, add the history
		if (store.context.action !== rf.ACT_PLACE_BOAT_7A_RESOURCES) model.addHistory(rf.HIST_ACT_ON_TILE, playerIndex, 0, [...store.context.historyObj])
	} else {
		store.gameMessages.actionError = i18n.global.t("action.noMoreResource")
	}
}

function localExchangePurpleMeeple(itemIndex, item) {
	controller.currentPlayerObj().hasPurpleMeeple = false
	if (itemIndex === 0) {
		controller.currentPlayerObj().hiddenMeeples[item]++
	} else if (itemIndex === 1) {
		controller.currentPlayerObj().hiddenSkillTiles[item]++
	} else if (itemIndex === 2) {
		controller.currentPlayerObj().villageTiles[0].resources[item]++
	}
	store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
}

function shouldShowIntroText() {
	if (store.gameflow.turn !== 0) return false
	if (store.gameflow.phase !== rf.PHASE_BIDDING_AND_ACTIONS) return false
	if (store.viewSettings.showReplay) return false

	// If YOU have made a history entry, return false
	if (store.history.some((entry) => entry[1] === personal.pov)) return false

	// If it isn't spring, then don't show
	if (store.gameflow.season !== rf.SPRING) return false
	if (store.history.length > 8) return false
	return true
}
</script>

<template>
	<div
		id="actionsDiv"
		:style="{
			'min-height': personal.canPlay() || personal.trainingGame ? '100px' : '',
		}">
		<template v-if="personal.pov === -99">
			<div id="loggedOutText">
				<i18n-t keypath="action.loggedOutPrompt" tag="span" scope="global">
					<template #register><a href="/register">{{ $t("action.register") }}</a></template>
					<template #login><a href="/login">{{ $t("action.login") }}</a></template>
				</i18n-t>
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
				The KFWtourneyAdmin player will replace
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
			<div v-else-if="personal.externalTournamentGame" id="kickoutDiv">
				{{ $t("action.tournamentNoKick") }}
				<br />
				<br />
				{{ $t("action.tournamentAdminsHint") }}
				<br />
				<br />
				<br />
				<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button></span>

				<button class="actionsLineButton" @click="IO.nudgeTourneyAdmins(1)">{{ $t("action.alertAdmins") }}</button>
			</div>

			<div v-else id="kickoutDiv">
				<template v-if="canKickoutNow()">
					{{ $t("action.timedOut", { name: controller.currentPlayerObj().name }) }}
					<br />
					{{ $t("action.toKickout", { name: controller.currentPlayerObj().name }) }}
					<br />
					{{ $t("action.gameProceeds") }}
					<br />
					<br />
					{{ $t("action.allowMoreTime", { name: controller.currentPlayerObj().name }) }}
					<br />

					<br />
					<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
					<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button></span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("action.keepInGame", { name: controller.currentPlayerObj().name }) }}</button>
					</span>
					<span><button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">{{ $t("action.confirmKickout") }}</button></span>
				</template>
				<template v-else>
					<br />
					{{ $t("action.timedOut", { name: controller.currentPlayerObj().name }) }}
					<br />
					{{ $t("action.voteNeeded", { name: controller.currentPlayerObj().name }) }}
					<br />
					<br />
					{{ $t("action.votes", { count: kickoutVoteCount(), threshold: store.kickoutVoteThreshold, voters: kickoutVoters() }) }}
					<br />
					<br />
					<span v-if="!myKickoutVote()">
						<template v-if="isLastVoteRequired()">
							{{ $t("action.willRemove", { name: controller.currentPlayerObj().name }) }}
							<br />
							<b>{{ $t("action.cannotBeUndone") }}</b>
							<br />
							<br />
						</template>
						<button class="actionsLineButton" id="voteKickoutButton" @click="Bot.actionPlayerKickout">{{ $t("action.voteToKickout", { name: controller.currentPlayerObj().name }) }}</button>
					</span>
					<span v-else>
						{{ $t("action.voted", { name: controller.currentPlayerObj().name }) }}
						<br />
						{{ $t("action.voteCountdown", { time: soloKickoutCountdown }) }}
					</span>
					<br />
					<br />
					<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
					<span>
						<button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button>
					</span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("action.keepInGame", { name: controller.currentPlayerObj().name }) }}</button>
					</span>
				</template>
			</div>
		</template>

		<!-- REWIND ERROR TEXT -->
		<template v-if="store.gameMessages.errorText !== ''">
			<h1 id="errorText">{{ store.gameMessages.errorText }}</h1>
		</template>

		<!-- ALWAYS SHOWS ON TURN 0 -->
		<template v-if="shouldShowIntroText() && store.viewSettings.showIntroInfo">
			<div class="introTextDiv">
				<h2>{{ $t("action.welcomeTitle") }}</h2>
				<b>
					{{ $t("action.welcomeIntro") }}
					<br />
					<br />
					<template v-if="!personal.trainingGame">
						{{ $t("action.welcomeHighlights") }}
						<br />
						<br />
					</template>
					<svg
						width="50"
						height="25"
						viewBox="-70 270 140 60"
						xmlns="http://www.w3.org/2000/svg"
						:style="{
							display: 'inline-block',
							verticalAlign: 'middle',
						}">
						<path
							d="M -56.95742684464382,330.3530756989341 A 56.95742684464382,56.95742684464382 0 0 1 56.95742684464382,330.3530756989341 Z"
							:style="{
								'stroke-width': 10,
								stroke: 'black',
								fill: '#E4EBCA',
							}" />
					</svg>
					{{ $t("action.welcomeRoads") }}
					<br />
					<br />
					<img class="boatWarnIntroIcon" :src="view.getImage('boat_warn_icon')" />
					{{ $t("action.welcomeBoatChain") }}
					<br />
					<br />
					<b><u>{{ $t("action.welcomeHiddenTitle") }}</u></b>
					<br />
					<span v-if="personal.trainingGame">
						{{ $t("action.welcomePractice") }}
						<br />
						{{ $t("action.welcomePracticeNormal") }}
					</span>
					<span v-else-if="store.hiddenInformationKnowledge === 9">{{ $t("action.welcomeHighKnowledge") }}</span>
					<span v-else-if="store.hiddenInformationKnowledge === 8">
						{{ $t("action.welcomeHighKnowledge") }}
						<br />
						{{ $t("action.welcomeHighKnowledge2") }}
					</span>
					<span v-else-if="store.hiddenInformationKnowledge === 7">
						{{ $t("action.welcomeMediumKnowledge") }}
						<br />
						{{ $t("action.welcomeMediumKnowledge2") }}
						<br />
						<b>{{ $t("action.welcomeMediumNote") }}</b>
					</span>
					<span v-else-if="store.hiddenInformationKnowledge === 6">
						{{ $t("action.welcomeMediumKnowledge") }}
						<br />
						{{ $t("action.welcomeMediumKnowledge2") }}
					</span>
					<span v-else-if="store.hiddenInformationKnowledge === 5">
						{{ $t("action.welcomeLowKnowledge") }}
						<br />
						{{ $t("action.welcomeLowKnowledge2") }}
					</span>
					<br />
					<br />
					<i18n-t keypath="action.welcomeHelp" tag="span" scope="global">
						<template #help><a class="linkOther" href="/KFW/help/" target="_blank">{{ $t("action.helpPage") }}</a></template>
					</i18n-t>
				</b>
			</div>
		</template>
		<template v-else-if="shouldShowIntroText() && store.viewSettings.showIntroInfo === false">
			<button class="actionsLineButton" @click="store.viewSettings.showIntroInfo = true">{{ $t("action.showHelp") }}</button>
		</template>

		<!-- ALWAYS SHOWS GAME END-->
		<!-- MOVED TO MainArea -->

		<!-- game messages-->
		<template v-if="store.gameMessages.endTurnMessage !== ''">
			<div id="endTurnMessage">
				<br />
				<span v-html="store.gameMessages.endTurnMessage"></span>
				<br />
			</div>
		</template>

		<template v-if="store.gameMessages.bugErrorText !== ''">
			<h2 id="bugErrorText" v-html="store.gameMessages.bugErrorText"></h2>
		</template>
		<template v-if="store.gameMessages.bugSuccessText !== ''">
			<h2 id="bugSuccessText" v-html="store.gameMessages.bugSuccessText"></h2>
		</template>

		<template v-if="personal.canPlay()">
			<div id="actions">
				<span class="actionError" v-if="store.gameMessages.actionError !== ''">
					<br />
					{{ store.gameMessages.actionError }}
					<br />
				</span>
				<br />
				<template v-if="store.gameflow.phase === rf.PHASE_GET_BOOKKEEPER_B_CONTRACT">{{ $t("action.chooseContract") }}</template>
				<template v-if="store.gameflow.phase === rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE">{{ $t("action.chooseSecondContract") }}</template>

				<!-- PHASE_BIDDING_AND_ACTIONS -->
				<template v-else-if="store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS">
					<!-- RESIGN -->
					<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN">
						{{ $t("action.resignConfirm") }}
						<br />
						{{ $t("action.resignUnbalance") }}
						<br />
						{{ $t("action.resignCarryOn") }}
						<br />
						{{ $t("action.resignStillCompete") }}
						<br />
						<button class="actionsLineButton" @click="resetWholePlayerTurn">{{ $t("action.carryOnPlaying") }}</button>
						<button class="actionsLineButton" @click="Bot.actionResign">{{ $t("action.confirmResignation") }}</button>
					</template>
					<!-- NOTHING SELECTED YET -->
					<template v-if="store.context.action === rf.ACT_NONE">
						{{ $t("action.selectBiddingArea") }}
						<br />
						<!-- Reserve space for remaining meeples-->
						<br />
						<button v-if="store.gameflow.passedPlayerIndexes.length < store.gameflow.fullTurnOrder.length - 1 && store.computedHistory[store.computedHistory.length - 1][0] === rf.HIST_EXCHANGE_CONTRACT_AUTO" @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>

						<button v-if="rules.canResign()" class="actionsLineButton" @click="localClickResign">{{ $t("action.resign") }}</button>
						<template v-if="!store.context.meepleActionFound">
							<span class="noActionsSpan">{{ $t("action.noActionsLeft") }}</span>
							<br />
						</template>
						<template v-if="store.gameflow.passedPlayerIndexes.length >= store.gameflow.fullTurnOrder.length - 1">
							{{ $t("action.everyonePassed") }}
							<br />
							<button v-if="store.computedHistory[store.computedHistory.length - 1][0] === rf.HIST_EXCHANGE_CONTRACT_AUTO" @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
							<button class="actionsLineButton" @click="localPassTurn">
								<span v-if="selectedPassOption === '1'">{{ $t("action.passAndEndTurn") }}</span>
							</button>
						</template>
						<template v-else>
							<select class="actionsLineSelect" v-model="selectedPassOption" @change="setPassFlag">
								<option value="1" :selected="controller.currentPlayerObj().passFlag === 1">{{ $t("action.passOnce") }}</option>
								<option value="2" :selected="controller.currentPlayerObj().passFlag === 2">{{ $t("action.passUntilOutbid") }}</option>
								<option value="3" :selected="controller.currentPlayerObj().passFlag === 3">{{ $t("action.passEveryTurn") }}</option>
							</select>
							<button class="actionsLineButton" @click="localPassTurn">
								<span v-if="selectedPassOption === '1'">{{ $t("action.passAndEndTurn") }}</span>
								<span v-else-if="selectedPassOption === '2'">{{ $t("action.endTurnPassUntilOutbid") }}</span>
								<span v-else-if="selectedPassOption === '3'">{{ $t("action.endTurnPassEveryTurn") }}</span>
							</button>
						</template>
					</template>
					<template v-else-if="store.context.action === rf.ACT_PLACE_BOAT_7A_RESOURCES">{{ $t("action.boat7aPlace") }}</template>
					<template v-else-if="store.context.action === rf.ACT_END_TURN_FOR_BOOKKEEPER_B_SKILL">
						{{ $t("action.confirmTurnGetSkillIntro") }}
						<img class="skillTileIMGsmall" :src="view.getImage('skillTile_random')" />
						{{ $t("action.chooseContractNext") }}
						<br />
						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("common.cancel") }}</button>
						<button @click="controller.endPlayerTurn(true)" class="actionsLineButton">{{ $t("action.confirmTurnGetSkill") }}</button>
					</template>
					<template v-else-if="store.context.action === rf.ACT_END_TURN_FOR_MERCHANTS_B_CONTRACT">
						<span v-if="store.history[store.history.length - 1][1] === controller.currentPlayerIndex()">{{ $t("action.confirmTurnToDealContract") }}</span>
						<span v-else>{{ $t("action.confirmTurnToRevealContract") }}</span><br/>{{ $t("action.chooseSecondContractNext") }}
												<br />
						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("common.cancel") }}</button>
						<button @click="controller.endPlayerTurn(false, true)" class="actionsLineButton">{{ $t("action.confirmTurnFirstContract") }}</button>
					</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_MEEPLES">
						{{ $t("action.chooseWorkersOnTile", { tile: store.context.selectedTile.name[0] }) }}
						<br />
						<template v-if="store.context.minMeeplesRequired > 0">
							{{ $t("action.youNeed", { count: store.context.minMeeplesRequired }) }}
							<span v-if="store.context.minMeeplesRequired > 1">{{ $t("action.workers") }}</span>
							<span v-else>{{ $t("action.worker") }}</span>
							<br />
							<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("common.cancel") }}</button>
						</template>
						<template v-else-if="store.context.minMeeplesRequired <= 0">
							{{ $t("action.mayAddMoreWorkers") }}
							<br />
							<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("common.cancel") }}</button>
							<button v-if="store.gameMessages.actionError === ''" class="actionsLineButton" @click="finishAddingMeeples">
								<span v-if="store.context.selectedTileArea === rf.TILE_BIDDING_AREA">{{ $t("action.finishAddingWorkersEndTurn") }}</span>
								<span v-else>{{ $t("action.finishAddingWorkers") }}</span>
							</button>
						</template>
					</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_RANDOM_MEEPLE_OR_SKILL">
						{{ $t("action.chooseRandomWorkerOrSkill") }}
						<br />
						<img @click="localSetRandomMeepleOrSkill(0)" class="chooseMeepleOrSkillTileIMG" :src="view.getImage('meeple_random')" />
						<img @click="localSetRandomMeepleOrSkill(1)" class="chooseMeepleOrSkillTileIMG" :src="view.getImage('skillTile_random')" />
					</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_SINGLE_RES">
						{{ $t("action.chooseSingleResource") }}
						<br />
						<img @click="localAddResToPlayer(controller.currentPlayerIndex(), 0)" class="chooseSingleResImg" :src="view.getImage('res_0')" />
						<img @click="localAddResToPlayer(controller.currentPlayerIndex(), 1)" class="chooseSingleResImg" :src="view.getImage('res_1')" />
						<img @click="localAddResToPlayer(controller.currentPlayerIndex(), 2)" class="chooseSingleResImg" :src="view.getImage('res_2')" />
					</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_ANY_MEEPLE_FOR_EXCHANGE">{{ $t("action.chooseWorkerToExchange") }}</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_SET_MEEPLE_FOR_EXCHANGE">
						<i18n-t keypath="action.chooseMeepleToExchange" tag="span" scope="global">
							<template #meeple><img class="meepleInMessage" :src="view.getImage(`meeple_${store.context.selectedTile.action[store.context.selectedTile.upgraded + 1][0]}`)" /></template>
						</i18n-t>
						<br />
						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
					</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_SKILL_TILE_EXCHANGE">{{ $t("action.chooseSkillForSkillTiles") }}</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_MEEPLE">{{ $t("action.chooseSkillForWorkers") }}</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_SKILL_TILE_FOR_GREEN">{{ $t("action.chooseSkillToExchange") }}</template>
					<template v-else-if="store.context.action === rf.ACT_MOVE_AND_UPGRADE || store.context.action === rf.ACT_MOVE_RES">
						{{ $t("action.mayMoveUpgrade") }}
						<br />
						{{ $t("action.remainingMoves", { count: store.context.remainingMoves }) }}
						<br />
						{{ $t("action.remainingUpgrades", { count: store.context.remainingUpgrades }) }}
						<br />
						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
						<button @click="model.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">{{ $t("action.undo") }}</button>
						<button v-if="store.context.action === rf.ACT_MOVE_RES" class="actionsLineButton" @click="cancelMovingRes">{{ $t("action.cancelMovingResource") }}</button>
						<button class="actionsLineButton" @click="finishedMovingAndUpgrading">{{ $t("action.finishActionsEndTurn") }}</button>
					</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_ITEMS">
						<template v-if="store.context.action2 === rf.ACT_MOVE_AND_UPGRADE">
							<!-- You must be selecting an extension that requires picking items-->
							<template v-if="store.context.action === rf.ACT_CHOOSE_ITEMS">
								{{ $t("action.toUpgradeNeed") }}
								<img v-for="(meeple, idx) in store.context.itemsRequired.meeplesReq" :key="idx" class="itemsetImg" :src="view.getImage('meeple_' + meeple)" />
								<img v-for="(skill, idx) in store.context.itemsRequired.skillsReq" :key="idx" class="itemsetImg" :src="view.getImage('skillTile_' + skill)" />
								<img v-for="(res, idx) in store.context.itemsRequired.resReq" :key="idx" class="itemsetImg" :src="view.getImage('res_' + res)" />
								{{ $t("action.youHaveChosen") }}
								<img v-for="(meeple, idx) in store.context.itemsChosen.meeplesChosen" :key="idx" class="itemsetImg" :src="view.getImage('meeple_' + meeple)" />
								<img v-for="(skill, idx) in store.context.itemsChosen.skillsChosen" :key="idx" class="itemsetImg" :src="view.getImage('skillTile_' + skill)" />
								<img v-for="(res, idx) in store.context.itemsChosen.resChosen" :key="idx" class="itemsetImg" :src="view.getImage('res_' + res)" />
							</template>
						</template>
						<template v-if="store.context.action2 === rf.ACT_CHOOSE_EXTENSION">
							<!-- You must be selecting an extension that requires picking items-->
							<template v-if="store.context.action === rf.ACT_CHOOSE_ITEMS">
								{{ $t("action.toAddExtensionNeed") }}
								<img v-for="(meeple, idx) in store.context.itemsRequired.meeplesReq" :key="idx" class="itemsetImg" :src="view.getImage('meeple_' + meeple)" />
								<img v-for="(skill, idx) in store.context.itemsRequired.skillsReq" :key="idx" class="itemsetImg" :src="view.getImage('skillTile_' + skill)" />
								<img v-for="(res, idx) in store.context.itemsRequired.resReq" :key="idx" class="itemsetImg" :src="view.getImage('res_' + res)" />
								{{ $t("action.youHaveChosen") }}
								<img v-for="(meeple, idx) in store.context.itemsChosen.meeplesChosen" :key="idx" class="itemsetImg" :src="view.getImage('meeple_' + meeple)" />
								<img v-for="(skill, idx) in store.context.itemsChosen.skillsChosen" :key="idx" class="itemsetImg" :src="view.getImage('skillTile_' + skill)" />
								<img v-for="(res, idx) in store.context.itemsChosen.resChosen" :key="idx" class="itemsetImg" :src="view.getImage('res_' + res)" />
							</template>
						</template>
					</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_CONTRACT">
						<!-- If choosing a contract, with an OR Res, add the choice -->
						<template v-if="store.context.selectedTile.action[0] === rf.ACT_TILE_CONTRACT_OR_AND_ITEMS && store.context.selectedTile.upgraded === 0">
							<template v-if="store.context.selectedTile.tileID[0] === rf.TILE_M_SPRING_ASSAYER_A">
								{{ $t("action.chooseResourceOrContract") }}
								<br />
								<img @click="localAddResToPlayer(controller.currentPlayerIndex(), 1)" class="chooseSingleResImg" :src="view.getImage('res_1')" />
								<img @click="localAddResToPlayer(controller.currentPlayerIndex(), 2)" class="chooseSingleResImg" :src="view.getImage('res_2')" />
							</template>
							<template v-else-if="store.context.selectedTile.tileID[1] === rf.TILE_M_SUMMER_BOOKKEEPER_B">
								{{ $t("action.chooseRandomSkillOrContract") }}
								<br />
								<img @click="localSetRandomMeepleOrSkill(1)" class="chooseMeepleOrSkillTileIMG" :src="view.getImage('skillTile_random')" />
							</template>
						</template>
						<!-- If UPGRADED show them all -->
						<template v-else-if="store.context.selectedTile.action[0] === rf.ACT_TILE_CONTRACT_OR_AND_ITEMS && store.context.selectedTile.upgraded === 1">
							<template v-if="store.context.selectedTile.tileID[1] === rf.TILE_M_SPRING_ASSAYER_B">
								{{ $t("action.canChooseContractGained") }}
								<img class="singleResImg" :src="view.getImage('res_1')" />
								<img class="singleResImg" :src="view.getImage('res_2')" />
							</template>
						</template>
						<!-- OTHERWISE just rely on store.context.contractsRemaining -->
						<template v-else-if="store.context.remainingContracts > 0">
							<template v-if="store.context.remainingContracts === 1">{{ $t("action.chooseContractRemaining", { count: store.context.remainingContracts }) }}</template>
							<template v-else-if="store.context.remainingContracts === 2">
								{{ $t("action.chooseFirstContractRemaining", { count: store.context.remainingContracts }) }}
								<br />
								<br />
								{{ $t("action.gameSavedBeforeSecond") }}
								<br />
								{{ $t("action.dealOrReveal") }}
							</template>
						</template>
						<br />
						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
					</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_SORCERER_TILE">{{ $t("action.chooseTileToCopy") }}</template>
					<!-- ACT_CONFIRM_END_TURN -->
					<template v-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
						<template v-if="store.gameMessages.turnEndText !== ''">
							<span v-html="store.gameMessages.turnEndText"></span>
							<br />
						</template>
						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
						<button @click="controller.endPlayerTurn" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
					</template>
				</template>

				<!-- PHASE_COLLECT_BOAT_RESOURCES -->
				<template v-else-if="store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES">
					<template v-if="store.context.action === rf.ACT_COLLECT_BOAT_RESOURCES">{{ $t("action.collectBoatResources") }}</template>
					<template v-else-if="store.context.action === rf.ACT_COLLECT_BOAT_TILES">{{ $t("action.collectBoatTile") }}</template>
					<template v-else-if="store.context.action === rf.ACT_CHOOSE_NEW_BOAT_TILE">
						{{ $t("action.seaBastionReplace") }}
						<br />
						<template v-for="(tileID, idx) in store.context.newBoatTileIDs" :key="idx">
							<div class="winterTileSelectDiv">
								<svg class="winterTileSelectSVG" viewBox="-420 -348 840 696" xmlns="http://www.w3.org/2000/svg">
									<!--DEF -->
									<defs>
										<pattern :id="rf.ALL_TILES.find((tile) => tile.tileID[1] === tileID).gfx[1]" height="100%" width="100%" patternContentUnits="objectBoundingBox">
											<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(rf.ALL_TILES.find((tile) => tile.tileID[1] === tileID).gfx[1])" />
										</pattern>
									</defs>
									<polygon class="winterTileSelectPolygon" @click="clickedChooseNewBoatTile(tileID)" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${rf.ALL_TILES.find((tile) => tile.tileID[1] === tileID).gfx[1]})`" />
								</svg>
							</div>
						</template>
					</template>
					<template v-else-if="store.context.action === rf.ACT_PLACE_BOAT_7A_RESOURCES">{{ $t("action.boat7aPlace") }}</template>
					<template v-else-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
						<template v-if="store.gameMessages.turnEndText !== ''">
							<span v-html="store.gameMessages.turnEndText"></span>
							<br />
						</template>
						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
						<button @click="controller.endPlayerTurn" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
					</template>
				</template>

				<!-- PHASE_VILLAGE_EXPANDING -->
				<template v-else-if="store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING">
					<template v-if="store.context.action === rf.ACT_ADD_TILES_TO_VILLAGE">
						{{ $t("action.selectTileExpansion") }}
						<br />
						{{ $t("action.rotateBeforeAdding") }}
						<br />

						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
						<button @click="model.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">{{ $t("action.undo") }}</button>
					</template>
					<template v-else-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
						<!--<template v-if="store.context.boatChainWarnings.some((warning) => warning.errorTile_ids.length > 0)">
							<img class="boatWarningIcon" :src="view.getImage('boat_warn_icon')" />
							Caution - one of your tiles is blocking the water flowing from your home tile
							<br />
							This could prevent you from adding boat tiles in a chain, which could affect the Sea Breese scoring
							<span v-if="store.players.length === 2">
								<br />
								(Sea Breese is not in a 2p game, but be careful at higher player counts)
							</span>
							<br />
						</template>-->

						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
						<button v-if="store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING" @click="model.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">{{ $t("action.undo") }}</button>
						<template v-if="village.isVillageValid(controller.currentPlayerIndex()) === 0">
							<button @click="controller.endPlayerTurn" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
						</template>
						<template v-else-if="village.isVillageValid(controller.currentPlayerIndex()) === 1">{{ $t("action.finishPlacingTiles") }}</template>
						<template v-else-if="village.isVillageValid(controller.currentPlayerIndex()) === 2">{{ $t("action.invalidTilePlacement") }}</template>
						<template v-else-if="village.isVillageValid(controller.currentPlayerIndex()) === 3">{{ $t("action.tilesMustConnect") }}</template>
					</template>
				</template>

				<!-- PHASE_CHOOSE_WINNER_TILES -->
				<template v-else-if="store.gameflow.phase === rf.PHASE_CHOOSE_WINTER_TILES">
					<template v-if="store.context.action === rf.ACT_CHOOSE_WINTER_TILES">
						{{ $t("action.selectWinterTile") }}
						<template v-if="store.context.selectedWinterTileIDs.length === 0">
							<br />
							{{ $t("action.mustSelectWinterTile") }}
						</template>
						<br />
						<template v-for="(tileID, idx) in controller.currentPlayerObj().hiddenWinterTile_tileIDs" :key="idx">
							<div class="winterTileSelectDiv">
								<svg class="winterTileSelectSVG" viewBox="-420 -348 840 696" xmlns="http://www.w3.org/2000/svg">
									<!--DEF -->
									<defs>
										<pattern :id="rf.ALL_TILES.find((tile) => tile.tileID[0] === tileID).gfx[0]" height="100%" width="100%" patternContentUnits="objectBoundingBox">
											<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(rf.ALL_TILES.find((tile) => tile.tileID[0] === tileID).gfx[0])" />
										</pattern>
									</defs>
									<polygon class="winterTileSelectPolygon" @click="clickedWinterTileSelect(tileID)" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${rf.ALL_TILES.find((tile) => tile.tileID[0] === tileID).gfx[0]})`" />
								</svg>
							</div>
						</template>
						<br />
						{{ $t("action.theseTilesUsed") }}
						<br />
						<template v-for="(tileID, idx) in store.context.selectedWinterTileIDs" :key="idx">
							<div class="winterTileChosenDiv">
								<svg class="winterTileSelectSVG" viewBox="-420 -348 840 696" xmlns="http://www.w3.org/2000/svg">
									<defs>
										<pattern :id="rf.ALL_TILES.find((tile) => tile.tileID.includes(tileID)).gfx[0]" height="100%" width="100%" patternContentUnits="objectBoundingBox">
											<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(rf.ALL_TILES.find((tile) => tile.tileID.includes(tileID)).gfx[0])" />
										</pattern>
									</defs>
									<polygon class="winterTileChosenPolygon" @click="clickedWinterTileChosen(tileID)" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${rf.ALL_TILES.find((tile) => tile.tileID.includes(tileID)).gfx[0]})`" />
								</svg>
							</div>
						</template>
						<br />
						<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
						<button v-if="store.context.selectedWinterTileIDs.length > 0" @click="controller.endPlayerTurn" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
					</template>
				</template>

				<template v-else-if="store.gameflow.phase === rf.PHASE_FINAL_SCORING && store.context.preFinalActions.length === 0">
					{{ $t("action.allocateItems") }}
					<br />
					{{ $t("action.onTileResources") }}
					<br />
					{{ $t("action.selectResourcesFromSupply") }}
					<br />
					<template v-if="controller.currentPlayerObj().hasPurpleMeeple">
						{{ $t("action.clickPurpleWorker") }}
						<br />
					</template>
					<button @click="resetWholePlayerTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
					<button @click="controller.endPlayerTurn" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
					<template v-if="store.context.action === rf.ACT_EXCHANGE_PURPLE_MEEPLE">
						<br />
						{{ $t("action.exchangePurpleWorker") }}
						<br />
						<img @click="localExchangePurpleMeeple(0, meeple)" v-for="(meeple, idx) in [0, 1, 2, 3]" :key="idx" class="chooseMeepleOrSkillTileIMGpurple" :src="view.getImage('meeple_' + String(meeple))" alt="Meeple" />
						<img @click="localExchangePurpleMeeple(1, skillTile)" v-for="(skillTile, idx) in [0, 1, 2]" :key="idx" class="chooseMeepleOrSkillTileIMGpurple" :src="view.getImage('skillTile_' + String(skillTile))" alt="Skill Tile" />
						<img @click="localExchangePurpleMeeple(2, resource)" v-for="(resource, idx) in [0, 1, 2, 3]" :key="idx" class="chooseSingleResImg" :src="view.getImage('res_' + String(resource))" alt="Res" />
					</template>
				</template>
				<template v-else-if="store.gameflow.phase === rf.PHASE_FINAL_SCORING && store.context.preFinalActions.length > 0">
					<template v-if="store.context.action === rf.ACT_FREE_UPGRADE">{{ $t("action.usingFlipper") }}</template>
					<template v-else-if="store.context.action === rf.ACT_FREE_EXTENSION">{{ $t("action.usingFlipperII") }}</template>
					<template v-if="store.context.tileIDsForPreFinalAction.length === 0">
						<br />
						<span class="redText">{{ $t("action.noEligibleTiles") }}</span>
					</template>
					<br />
					<button @click="controller.finishPreFinalAction" class="actionsLineButton">{{ $t("action.skipAction") }}</button>
				</template>
			</div>
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
#endTurnMessage {
	font-weight: bolder;
	font-size: 30px;
}

.introTextDiv {
	background-color: aliceblue;
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

#errorText,
#loggedOutText,
.noActionsSpan {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#loggedOutText {
	font-size: 20px;
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
.skillTileIMGsmall {
	width: 50px;
	height: 50px;
	margin-right: 6px;
	display: inline-block;
	vertical-align: middle;
	/*filter: drop-shadow(2px 0 0 yellow) drop-shadow(0 2px 0 yellow) drop-shadow(-2px 0 0 yellow) drop-shadow(0 -2px 0 yellow);*/
}

.skillTileIMG {
	width: 100px;
	height: 100px;
	margin-right: 6px;
	filter: drop-shadow(2px 0 0 yellow) drop-shadow(0 2px 0 yellow) drop-shadow(-2px 0 0 yellow) drop-shadow(0 -2px 0 yellow);
}

.chooseMeepleOrSkillTileIMG {
	width: 100px;
	height: 100px;
	margin-right: 6px;
	filter: drop-shadow(4px 0 0 yellow) drop-shadow(0 4px 0 yellow) drop-shadow(-4px 0 0 yellow) drop-shadow(0 -4px 0 yellow);
}
.chooseMeepleOrSkillTileIMG:hover {
	filter: drop-shadow(4px 0 0 lightgreen) drop-shadow(0 4px 0 lightgreen) drop-shadow(-4px 0 0 lightgreen) drop-shadow(0 -4px 0 lightgreen);
}

.chooseMeepleOrSkillTileIMGpurple {
	width: 80px;
	height: 80px;
	margin-right: 10px;
	filter: drop-shadow(4px 0 0 yellow) drop-shadow(0 4px 0 yellow) drop-shadow(-4px 0 0 yellow) drop-shadow(0 -4px 0 yellow);
}
.chooseMeepleOrSkillTileIMGpurple:hover {
	filter: drop-shadow(4px 0 0 lightgreen) drop-shadow(0 4px 0 lightgreen) drop-shadow(-4px 0 0 lightgreen) drop-shadow(0 -4px 0 lightgreen);
}

.singleResImg {
	height: 40px;
	vertical-align: middle;
	margin-right: 10px;
}

.chooseSingleResImg {
	height: 80px;
	margin-right: 10px;
	filter: drop-shadow(4px 0 0 yellow) drop-shadow(0 4px 0 yellow) drop-shadow(-4px 0 0 yellow) drop-shadow(0 -4px 0 yellow);
}
.chooseSingleResImg:hover {
	filter: drop-shadow(4px 0 0 lightgreen) drop-shadow(0 4px 0 lightgreen) drop-shadow(-4px 0 0 lightgreen) drop-shadow(0 -4px 0 lightgreen);
}

.winterTileSelectDiv {
	display: inline-block;
	width: 200px;
	height: 200px;
}

.winterTileSelectSVG {
	width: 100%;
	height: 100%;
}

.winterTileSelectPolygon {
	stroke: yellow;
	stroke-width: 32;
}
.winterTileSelectPolygon:hover {
	stroke: lightgreen;
}

.winterTileChosenDiv {
	display: inline-block;
	width: 100px;
	height: 100px;
}
.winterTileChosenPolygon {
	stroke: yellow;
	stroke-width: 32;
}
.winterTileChosenPolygon:hover {
	stroke: red;
}

:deep(.resourceInMessage) {
	vertical-align: middle;
	width: 35px;
	margin-right: 6px;
	filter: drop-shadow(0px 0 0 black) drop-shadow(0 0px 0 black) drop-shadow(-0px 0 0 black) drop-shadow(0 -0px 0 black);
}

:deep(.meepleInMessage) {
	vertical-align: middle;
	width: 50px;
	margin-right: 6px;
	filter: drop-shadow(2px 0 0 black) drop-shadow(0 2px 0 black) drop-shadow(-2px 0 0 black) drop-shadow(0 -2px 0 black);
}

:deep(.skillTileInMessage) {
	vertical-align: middle;
	width: 50px;
	height: 50px;
	margin-right: 6px;
	border: 2px solid black;
}
.itemsetImg {
	height: 40px;
	vertical-align: middle;
}

:deep(.contractInMessage) {
	vertical-align: middle;
	height: 50px;
	margin-right: 6px;
}

:deep(.contractPathGLOBAL) {
	fill: black;
	fill-opacity: 0;
	stroke: black;
	stroke-width: 2;
	stroke-linecap: butt;
	stroke-linejoin: miter;
	stroke-opacity: 1;
}

.boatWarningIcon {
	width: 50px;
	height: 50px;
	margin-right: 6px;
}

.boatWarnIntroIcon {
	width: 40px;
	height: 40px;
	vertical-align: middle;
}

#bugErrorText {
	width: 100%;
	font-weight: bolder;
	font-family: Arial, sans-serif;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#bugSuccessText {
	color: darkgreen;
	background-color: lightblue;
}
</style>
