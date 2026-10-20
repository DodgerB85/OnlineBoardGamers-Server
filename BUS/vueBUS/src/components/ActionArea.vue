<script setup>
import TurnNudge from "./utils/TurnNudge.vue"
import { ref, watch, onUnmounted } from "vue"
import * as rf from "../js/BUSreference.js"
import * as IO from "../backend/BUS_IO"
import * as Bot from "../js/BUSbot"
import * as funcs from "../js/BUSfuncs.js"

import * as view from "../js/BUSview.js"
import * as controller from "../js/BUScontroller.js"
import * as model from "../js/BUSmodel.js"
import * as pitts from "../js/BUSpitts.js"

import i18n from "../i18n"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()

function getActionText() {
	const t = i18n.global.t
	let phaseStr = ""
	if (store.gameflow.phase === rf.PHASE_SETUP_BLDGS) {
		phaseStr = t("actionArea.phasePlace2Buildings") // TO: 2 bldgs on zone 1 per player
		phaseStr += "<br/>" + t("actionArea.phaseRemainingBuildings", { count: store.context.buildingsLeftToPlace })
	}
	if (store.gameflow.phase === rf.PHASE_SETUP_LINES) {
		phaseStr = t("actionArea.phasePlaceBusLine") // TO then reverse TO,eg 1,2,3,4,3,2,1, place 1 line
		phaseStr += "<br/>" + t("actionArea.phaseRemainingLines", { count: store.context.linesLeftToPlace })
		if (personal.selectedBoard === rf.BOARD_PITTS) phaseStr += "<br/><span style='color: #ff9900'>" + t("actionArea.phaseNoBridgeSetup") + "</span>"
		if (store.context.endJunctionsOptions.length > 0) phaseStr += "<br/>" + t("actionArea.phaseChooseJunction")
	}
	if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS) {
		phaseStr = t("actionArea.phaseChooseAction")
		phaseStr += "<br/>" + t("actionArea.phaseChooseActionHint")
		phaseStr += "<br/>" + t("actionArea.phaseCanPass")
		if (controller.currentPlayerObj().remainingActions === 0 && !store.context.actionChosen) phaseStr += "<br/><br/><span style='color: red'>" + t("actionArea.phaseNoActions") + "</span>"
	}
	if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION) {
		phaseStr = t("actionArea.phaseExpandLine") // 5p: +1 to maxNumBus
		phaseStr += "<br/>" + t("actionArea.phaseRemainingLines", { count: store.context.linesLeftToPlace })
		if (personal.selectedBoard === rf.BOARD_PITTS) phaseStr += "<br/>" + t("actionArea.phaseRemainingBridges", { count: "<span style='color: " + (store.remainingBridgeMarkers > 0 ? "green" : "red") + "'>" + store.remainingBridgeMarkers + "</span>" })
	}
	if (store.gameflow.phase === rf.PHASE_ADD_BUS) phaseStr = t("actionArea.phaseAddBus")
	if (store.gameflow.phase === rf.PHASE_ADD_PAX) {
		phaseStr = t("actionArea.phaseChooseStation")
		phaseStr += "<br/>" + t("actionArea.phaseRemainingPassengers", { count: store.context.passengersLeftToPlace })
		if (personal.selectedBoard === rf.BOARD_PITTS) {
			if (pitts.designerArrivedThisRound()) phaseStr += "<br/><span style='color: red'>" + t("actionArea.phaseDesignerArrived") + "</span>"
			else if (store.jeroenStatus === rf.DESIGNER_NOT_ARRIVED && store.jorisStatus === rf.DESIGNER_NOT_ARRIVED) phaseStr += "<br/><span style='color: #ff9900'>" + t("actionArea.phaseOneDesigner") + "</span>"
		}
	}
	if (store.gameflow.phase === rf.PHASE_ADD_BLDGS) {
		phaseStr = t("actionArea.phaseChooseBuilding") // (GE check)
		phaseStr += "<br/>" + t("actionArea.phaseRemainingBuildings", { count: store.context.buildingsLeftToPlace })
	}

	// PHASE 7 IN TEMPLATE
	//if (store.gameflow.phase === rf.PHASE_ALTER_TIME) {phaseStr = 'Choose to stop time, or pass' // AND POSSIBLE IMMEDIATE GAME END

	if (store.gameflow.phase === rf.PHASE_VROM) {
		phaseStr = t("actionArea.phaseChooseDestination")
		phaseStr += "<br/>" + t("actionArea.phaseRemainingMoves", { count: store.context.remainingVroms })
	}
	if (store.gameflow.phase === rf.PHASE_CHANGE_START_PLAYER) phaseStr = t("actionArea.phaseChangeStartPlayer") // GE check, if no more bldg spots
	if (store.gameflow.phase === rf.PHASE_GAME_END_CHECK) phaseStr = t("actionArea.phaseGameEndCheck") // bldg spots, only 1 player with action markers
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) phaseStr = t("actionArea.phaseGameFinished")
	return phaseStr
}

function highlight(e, bldgNum, entering) {
	if (entering) e.target.style.border = "4px solid lightgreen"
	else {
		if (bldgNum === store.context.selectedBuildingType) e.target.style.border = "4px solid lightgreen"
		else e.target.style.border = "4px solid yellow"
	}
}
function clickedSelectBuilding(bldgNum) {
	store.context.selectedBuildingType = bldgNum
}

function getBuildingImgBorder(bldgNum) {
	if (bldgNum === store.context.selectedBuildingType) return "4px solid lightgreen"
	else return "4px solid yellow"
}
function alterTime(stoppingTime) {
	if (!stoppingTime) {
		store.desiredBuilding++
		if (store.desiredBuilding > rf.BLDG_PUB) store.desiredBuilding = rf.BLDG_HOME
		store.context.historyObj.push(store.desiredBuilding, 0)
	} else {
		controller.currentPlayerObj().timeStones++
		model.decreaseScore(controller.currentPlayerObj())
		store.remainingTimeStones--
		store.context.historyObj.push(store.desiredBuilding, 1)
	}
	store.context.confirmEndTurn = true
}
function localEndPlayerTurn() {
	store.context.confirmEndTurn = false
	if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS) controller.endPlayerChooseActionTurn()
	else controller.endPlayerTurn()
}
function resetPlayerTurn() {
	store.resetVarsOnTurnEnd()
	funcs.importBUSmodel(store.turnResetData, false, true)
	controller.startPlayerTurn()
	if (personal.yourTurnAudioType > 0) {
		let beep
		if (personal.yourTurnAudioType == 1) beep = new Audio("/static/BUS/sounds/beep.mp3")
		if (personal.yourTurnAudioType == 2) beep = new Audio("/static/BUS/sounds/bell.mp3")
		beep.play()
	}
}
function passChooseAction() {
	store.context.confirmEndTurn = true
	localEndPlayerTurn()
}
function confirmResign() {
	store.context.confirmResign = true
}
function canResign() {
	// canPlay is already checked
	if (personal.trainingGame) return false
	if (store.gameflow.phase !== rf.PHASE_CHOOSE_ACTIONS) return false
	if (store.context.actionChosen) return false
	if (store.gameflow.turnOrder.length < 2) return false
	return true
}
function cancelKickout() {
	personal.kickoutRequired = 0
}

function endTurnAndPass() {
	controller.currentPlayerObj().passActionsFlag = true
	controller.endPlayerChooseActionTurn()
}

function getFlexiKickoutTImerText() {
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	let hoursToGo = String(Math.floor(personal.flexiSecondsToNextKickout / 60 / 60))
	let minsToGo = String(Math.floor((personal.flexiSecondsToNextKickout % 3600) / 60)).padStart(2, "0")
	let secsToGo = String(Math.floor(personal.flexiSecondsToNextKickout % 60)).padStart(2, "0")

	return hoursToGo + ":" + minsToGo + ":" + secsToGo
}

function passKickout() {
	personal.kickoutRequired = 0
	personal.removeCurrentFlexTime = true
	personal.removeCurrentFlexTimeName = controller.currentPlayerObj().name

	if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS) controller.currentPlayerObj().remainingActions--

	localEndPlayerTurn()
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
</script>

<template>
	<template v-if="personal.name == undefined">
		<div id="loggedOutText">
			{{ $t('actionArea.loggedOutPlease') }}
			<a href="/register">{{ $t('actionArea.register') }}</a>
			{{ $t('actionArea.or') }}
			<a href="/login">{{ $t('actionArea.login') }}</a>
			{{ $t('actionArea.toPlayGame') }}
			<br />
		</div>
		<br />
	</template>

	<template v-if="store.rewindErrorText !== ''">
		<h1 id="rewindErrorText">{{ store.rewindErrorText }}</h1>
	</template>
	<template v-if="store.topMenuViews.errorText !== ''">
		<h1 id="errorText">{{ store.topMenuViews.errorText }}</h1>
	</template>
	<template v-if="store.successText !== ''">
		<h1 id="successText">{{ store.successText }}</h1>
	</template>

	<template v-if="personal.canPlay()">
		<div id="actions">
			<template v-if="store.gameflow.phase === rf.PHASE_SETUP_BLDGS">
				<h2>
					<b>{{ $t('actionArea.welcomeTitle') }}</b>
					<br />
					{{ $t('actionArea.welcomeContact') }}
					<img :src="view.getImage('email')" width="400" height="30" />
					{{ $t('actionArea.welcomeThanks') }}
				</h2>
				<div id="listDiv">
					<ul class="centreList">
						<li>{{ $t('actionArea.welcomeList1') }}</li>
						<li>{{ $t('actionArea.welcomeList2') }}</li>
						<li>{{ $t('actionArea.welcomeList3') }}</li>
						<li>{{ $t('actionArea.welcomeList4') }}</li>
						<li>{{ $t('actionArea.welcomeList5') }}</li>
						<li>{{ $t('actionArea.welcomeList6') }}</li>
						<li>
							{{ $t('actionArea.welcomeList7') }}
							<br />
							&nbsp;&nbsp;&nbsp;&nbsp;{{ $t('actionArea.welcomeList7b') }}
						</li>
						<li>
							{{ $t('actionArea.welcomeList8') }}
							<a href="/profile" target="_blank">{{ $t('actionArea.profile') }}</a>
							<br />
							<b>
								{{ $t('actionArea.welcomeNote') }}
								<br />
								{{ $t('actionArea.welcomeNote2') }}
							</b>
						</li>
					</ul>
				</div>
				<h3 v-if="personal.trainingGame">
					{{ $t('actionArea.trainingWelcome') }}
					<br />
					{{ $t('actionArea.trainingRewind') }}
				</h3>
				{{ $t('actionArea.bugSuggestion') }}
				<br />
				<br />
			</template>

			<template v-if="!store.context.confirmEndTurn && !store.context.confirmResign">
				<span v-html="getActionText()"></span>
				<span class="actionError" v-if="store.context.turnEndingErrorMessage !== ''">
					<br />
					{{ store.context.turnEndingErrorMessage }}
				</span>

				<template v-if="(store.gameflow.phase === rf.PHASE_SETUP_BLDGS || store.gameflow.phase === rf.PHASE_ADD_BLDGS) && store.context.buildingsLeftToPlace > 0">
					<br />
					<template v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS">
						<template v-for="i in [1, 2, 3]" v-bind:key="i">
							<img
								class="buildingOptionImg"
								:id="'buildingOptionImg' + String(i)"
								:src="view.getImage('building' + String(i))"
								alt="buildingOption"
								@mouseover="highlight($event, i, true)"
								@mouseleave="highlight($event, i, false)"
								@click="clickedSelectBuilding(i)"
								:style="{
									border: getBuildingImgBorder(i),
								}" />
						</template>
					</template>
					<template v-if="personal.selectedBoard === rf.BOARD_OG">
						<template v-for="i in [1, 2, 3]" v-bind:key="i">
							<img
								class="buildingOptionImg_orig"
								:id="'buildingOptionImg' + String(i)"
								:src="view.getImage('building' + String(i) + '_orig')"
								alt="buildingOption"
								@mouseover="highlight($event, i, true)"
								@mouseleave="highlight($event, i, false)"
								@click="clickedSelectBuilding(i)"
								:style="{
									border: getBuildingImgBorder(i),
								}" />
						</template>
					</template>
				</template>

				<template v-if="store.gameflow.phase !== rf.PHASE_ALTER_TIME">
					<br />
					<template v-if="canResign()">
						<button class="actionsLineButton resignButton" @click="confirmResign()">{{ $t('actionArea.resign') }}</button>
					</template>
					<button class="actionsLineButton" @click="resetPlayerTurn()">{{ $t('actionArea.reset') }}</button>
					<template v-if="controller.currentPlayerCanPass() && !store.context.actionChosen">
						<button class="actionsLineButton" @click="passChooseAction()">{{ $t('actionArea.passChooseActions') }}</button>
					</template>
				</template>
			</template>

			<template v-if="controller.currentPlayerCanPass() && personal.canEndTurn()">
				<button class="actionsLineButton" @click="endTurnAndPass()">{{ $t('actionArea.endTurnPass') }}</button>
			</template>

			<button v-if="personal.canEndTurn()" class="actionsLineButton" @click="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS ? controller.endPlayerChooseActionTurn() : controller.endPlayerTurn()">{{ $t('actionArea.endTurn') }}</button>

			<!-- Phase STOP TIME -->
			<template v-if="store.gameflow.phase === rf.PHASE_ALTER_TIME && !store.context.confirmEndTurn">
				{{ $t('actionArea.stopTimePrompt') }}
				<span v-if="store.remainingTimeStones <= 1" class="actionError">
					<br />
					{{ $t('actionArea.cautionLastTimeStone') }}
				</span>
				<br />
				<button class="actionsLineButton" @click="alterTime(false)">{{ $t('actionArea.pass') }}</button>
				<button class="actionsLineButton" @click="alterTime(true)">{{ $t('actionArea.stopTime') }}</button>
			</template>

			<!-- Confirm End Turn -->
			<template v-if="store.context.confirmEndTurn">
				{{ $t('actionArea.confirmChoice') }}
				<span v-if="store.remainingTimeStones === 0" class="actionError">
					<br />
					{{ $t('actionArea.cautionLastTimeStone') }}
				</span>
				<br />
				<button class="actionsLineButton" @click="resetPlayerTurn()">{{ $t('actionArea.reset') }}</button>
				<button class="actionsLineButton" @click="localEndPlayerTurn">{{ $t('actionArea.endTurn') }}</button>
			</template>

			<!-- Confirm RESIGN -->
			<template v-if="store.context.confirmResign">
				<p>{{ $t('actionArea.resignQuestion') }}</p>
				<p>{{ $t('actionArea.resignUnbalance') }}</p>
				<p>{{ $t('actionArea.resignCarryOn') }}</p>
				<p>{{ $t('actionArea.resignAim') }}</p>

				<br />
				<button class="actionsLineButton" @click="resetPlayerTurn()">{{ $t('actionArea.cancel') }}</button>
				<button class="actionsLineButton" @click="IO.resign()">{{ $t('actionArea.confirmResign') }}</button>
			</template>
		</div>
	</template>

	<template v-if="store.gameflow.gameEnded > 0 && !store.topMenuViews.showReplay">
		<div id="gameEndDiv">
			{{ $t('actionArea.gameOver') }}
			<br />
			<br />
			<span v-if="store.gameflow.gameEnded === 1">{{ $t('actionArea.gameEnd1') }}</span>
			<span v-if="store.gameflow.gameEnded === 2">{{ $t('actionArea.gameEnd2') }}</span>
			<span v-if="store.gameflow.gameEnded === 3">{{ $t('actionArea.gameEnd3') }}</span>
			<span v-if="store.gameflow.gameEnded === 4">{{ $t('actionArea.gameEnd4') }}</span>
			<br />
			<br />
			{{ $t('actionArea.winner', { name: model.getWinnerName()[0] }) }}
			<template v-if="model.getWinnerName()[0] === personal.name">
				<h1>{{ $t('actionArea.congratulations') }}</h1>
			</template>
			<template v-else>
				<br />
				<br />
			</template>
			<span v-if="model.getWinnerName()[1] === 0">{{ $t('actionArea.highestScore') }}</span>
			<span v-if="model.getWinnerName()[1] === 1">{{ $t('actionArea.jointMoreStones') }}</span>
			<span v-if="model.getWinnerName()[1] === 2">{{ $t('actionArea.jointScoreFirst') }}</span>
			<br />
			<br />
			{{ $t('actionArea.fancyRematch') }}
			<a :href="'/createBusPage/' + String(personal.gameID) + '/'">{{ $t('actionArea.rematch') }}</a>
			{{ $t('actionArea.fancyRematchEnd') }}
			<br />
			<br />
		</div>
	</template>

	<template v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
		<div v-if="personal.kickoutRequired === 1" id="kickoutDiv">
			{{ $t('actionArea.kickoutStandardUsed', { name: controller.currentPlayerObj().name }) }}
			<br />
			<br />
			{{ $t('actionArea.remainingFlexTime') }}
			<span id="flexiKickoutTimerSpan">{{ getFlexiKickoutTImerText() }}</span>
			<br />
			<br />
			{{ $t('actionArea.forMoreInfo') }}
			<b><a href="/help/" target="_blank">{{ $t('actionArea.help') }}</a></b>
		</div>
		<div v-else id="kickoutDiv">
			<template v-if="canKickoutNow()">
				{{ $t('actionArea.timedOut', { name: controller.currentPlayerObj().name }) }}
				<br />
				<br />
				{{ $t('actionArea.toKickout', { name: controller.currentPlayerObj().name }) }}
				<br />
				<br />
				{{ $t('actionArea.allowMoreTime', { name: controller.currentPlayerObj().name }) }}
				<br />
				<br />
				<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t('actionArea.notNow') }}</button></span>
				<span>
					<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t('actionArea.keepInGame', { name: controller.currentPlayerObj().name }) }}</button>
				</span>
				<span>
					<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">{{ $t('actionArea.confirmKickout') }}</button>
				</span>
			</template>
			<template v-else>
				{{ $t('actionArea.timedOut', { name: controller.currentPlayerObj().name }) }}
				<br />
				{{ $t('actionArea.voteNeeded', { name: controller.currentPlayerObj().name }) }}
				<br />
				<br />
				{{ $t('actionArea.votes', { votes: kickoutVoteCount(), threshold: store.kickoutVoteThreshold, voters: kickoutVoters() }) }}
				<br />
				<br />
				<span v-if="!myKickoutVote()">
					<template v-if="isLastVoteRequired()">
						{{ $t('actionArea.willRemove', { name: controller.currentPlayerObj().name }) }}
						<br />
						<b>{{ $t('actionArea.cannotBeUndone') }}</b>
						<br />
						<br />
					</template>
					<button class="actionsLineButton" id="voteKickoutButton" @click="Bot.actionPlayerKickout">{{ $t('actionArea.voteToKickout', { name: controller.currentPlayerObj().name }) }}</button>
				</span>
				<span v-else>
					{{ $t('actionArea.votedToKickout', { name: controller.currentPlayerObj().name }) }}
					<br />
					{{ $t('actionArea.voteCountdown', { time: soloKickoutCountdown }) }}
				</span>
				<br />
				<br />
				<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
				<span>
					<button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t('actionArea.notNow') }}</button>
				</span>
				<span>
					<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t('actionArea.keepInGame', { name: controller.currentPlayerObj().name }) }}</button>
				</span>
			</template>
		</div>
	</template>
</template>

<style scoped>
#passKickoutButton,
#cancelKickoutButton {
	margin-right: 100px;
}

#listDiv {
	margin: auto;
	width: fit-content;
}

.centreList {
	text-align: left;
	list-style-position: inside;
}

.noMoreLeft {
	border-color: red !important;
	opacity: 0.3;
}

#actions,
#gameEndDiv {
	margin: 0;
	font-weight: bolder;
	text-align: center;
}

#kickoutDiv {
	margin: 0;
	text-align: center;
	margin-bottom: 5px;
}

#rewindErrorText,
#loggedOutText,
#errorText {
	margin: 0;
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#loggedOutText {
	font-size: 20px;
}

#gameEndDiv {
	font-size: 30px;
}

.actionError {
	color: red;
	font-weight: bolder;
}

.resignButton {
	margin-right: 50px;
}

.buildingOptionImg {
	width: 50px;
	border: 4px solid yellow;
	border-radius: 100%;
	margin: 4px;
}

.buildingOptionImg_orig {
	width: 50px;
	border: 4px solid yellow;
	margin: 4px;
}

#successText {
	font-size: 20px;
	margin: 10px;
	padding: 10px;
	font-weight: bolder;
	color: darkgreen;
	background-color: lightblue;
	text-align: center;
}
</style>
