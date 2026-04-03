<script setup>
import * as rf from "../js/BUSreference.js"
import * as IO from "../backend/BUS_IO"
import * as Bot from "../js/BUSbot"
import * as funcs from "../js/BUSfuncs.js"

import * as view from "../js/BUSview.js"
import * as controller from "../js/BUScontroller.js"
import * as model from "../js/BUSmodel.js"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()

function getActionText() {
	let phaseStr = ""
	if (store.gameflow.phase === 0) {
		phaseStr = "Place 2 buildings on Number 1 Locations" // TO: 2 bldgs on zone 1 per player
		phaseStr += "<br/>Remaining Buildings: " + store.context.buildingsLeftToPlace
	}
	if (store.gameflow.phase === 1) {
		phaseStr = "Place a Bus Line" // TO then reverse TO,eg 1,2,3,4,3,2,1, place 1 line
		phaseStr += "<br/>Remaining Lines: " + store.context.linesLeftToPlace
		if (store.context.endJunctionsOptions.length > 0) phaseStr += "<br/>Choose a junction where your lines will meet"
	}
	if (store.gameflow.phase === 2) {
		phaseStr = "Choose an Action in the upper right area or next to the board"
		phaseStr += "<br/>Actions are chosen A to F. The 'A' square has the highest number of actions. Actions are resolved Left to Right"
		phaseStr += "<br/>Once you have chosen at least 2 actions this round, you will have the option to pass"
		if (controller.currentPlayerObj().remainingActions === 0 && !store.context.actionChosen) phaseStr += "<br/><br/><span style='color: red'>YOU HAVE NO ACTIONS REMAINING - YOU MUST PASS</span>"
	}
	if (store.gameflow.phase === 3) {
		phaseStr = "Expand your bus line from either end" // 5p: +1 to maxNumBus
		phaseStr += "<br/>Remaining Lines: " + store.context.linesLeftToPlace
	}
	if (store.gameflow.phase === 4) phaseStr = "AddBus"
	if (store.gameflow.phase === 5) {
		phaseStr = "Choose one of the two stations to add a Passenger"
		phaseStr += "<br/>Remaining Passengers: " + store.context.passengersLeftToPlace
	}
	if (store.gameflow.phase === 6) {
		phaseStr = "Choose a location to add a Building" // (GE check)
		phaseStr += "<br/>Remaining Buildings: " + store.context.buildingsLeftToPlace
	}

	// PHASE 7 IN TEMPLATE
	//if (store.gameflow.phase === 7) {phaseStr = 'Choose to stop time, or pass' // AND POSSIBLE IMMEDIATE GAME END

	if (store.gameflow.phase === 8) {
		phaseStr = "Choose a passenger to move to their desired destination"
		phaseStr += "<br/>Remaining Moves: " + store.context.remainingVroms
	}
	if (store.gameflow.phase === 9) phaseStr = "ChangeStartPlayer" // GE check, if no more bldg spots
	if (store.gameflow.phase === 10) phaseStr = "GameEndCheck" // bldg spots, only 1 player with action markers
	if (store.gameflow.phase === 11) phaseStr = "GameFinished"
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
		if (store.desiredBuilding === 4) store.desiredBuilding = 1
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
	funcs.importBUSmodel(store.turnResetData, false, false)
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
</script>

<template>
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

	<template v-if="store.rewindErrorText !== ''">
		<h1 id="rewindErrorText">{{ store.rewindErrorText }}</h1>
	</template>
	<template v-if="store.successText !== ''">
		<h1 id="successText">{{ store.successText }}</h1>
	</template>

	<template v-if="personal.canPlay()">
		<div id="actions">
			<template v-if="store.gameflow.phase === rf.PHASE_SETUP_BLDGS">
				<h2>
					<b>Welcome to Bus Online!</b>
					<br />
					If you have any suggestions, questions or comments, then please do contact the webmaster at
					<img :src="view.getImage('email')" width="400" height="30" />
					. Thanks!
				</h2>
				<div id="listDiv">
					<ul class="centreList">
						<li>Place buildings, lines, and passengers directly on the board. Vrrooomm by selecting
							passengers and destinations on the board</li>
						<li>Choose your actions in the upper right area or next to the board</li>
						<li>Both action selection areas display the same information, just in a different format</li>
						<li>To view another player's actions, open the "History" tab and select a "board" action to
							highlight that move</li>
						<li>Score is calculated as you play - Time Stone deductions happen immediately, not at the end
						</li>
						<li>Rewind is always available</li>
						<li>
							The Player Table is in order of the "Choose Actions" phase. So top player picks first.
							<br />
							&nbsp;&nbsp;&nbsp;&nbsp;If no one chooses the "Starting Player" choice, then the player on
							the 2nd line will become the new start player.
						</li>
						<li>
							You can change which board you are playing on from the menu. Select a preference in your
							<a href="/profile" target="_blank">Profile</a>
							<br />
							<b>
								NOTE: THE CHANGE IS COSMETIC ONLY. BOTH BOARDS HAVE THE SAME CONNECTIONS
								<br />
								THE ORIGINAL BOARD IS ROTATED 90 DEGREES FROM THE 20TH ANNIVERSARY BOARD
							</b>
						</li>
					</ul>
				</div>
				<h3 v-if="personal.trainingGame">
					Welcome to this training game. If you wish to rewind your game, use the button at the top.
					<br />
					Each rewind will move the game back by one step.
				</h3>
				Submit a bug report to report errors and game data to the webmaster. You can also use the bug report to
				submit suggestions or improvements. Thanks!
				<br />
				<br />
			</template>

			<template v-if="!store.context.confirmEndTurn && !store.context.confirmResign">
				<span v-html="getActionText()"></span>
				<span class="actionError" v-if="store.context.turnEndingErrorMessage !== ''">
					<br />
					{{ store.context.turnEndingErrorMessage }}
				</span>

				<template
					v-if="(store.gameflow.phase === rf.PHASE_SETUP_BLDGS || store.gameflow.phase === rf.PHASE_ADD_BLDGS) && store.context.buildingsLeftToPlace > 0">
					<br />
					<template v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE">
						<template v-for="i in [1, 2, 3]" v-bind:key="i">
							<img class="buildingOptionImg" :id="'buildingOptionImg' + String(i)"
								:src="view.getImage('building' + String(i))" alt="buildingOption"
								@mouseover="highlight($event, i, true)" @mouseleave="highlight($event, i, false)"
								@click="clickedSelectBuilding(i)" :style="{
									border: getBuildingImgBorder(i),
								}" />
						</template>
					</template>
					<template v-if="personal.selectedBoard === rf.BOARD_OG">
						<template v-for="i in [1, 2, 3]" v-bind:key="i">
							<img class="buildingOptionImg_orig" :id="'buildingOptionImg' + String(i)"
								:src="view.getImage('building' + String(i) + '_orig')" alt="buildingOption"
								@mouseover="highlight($event, i, true)" @mouseleave="highlight($event, i, false)"
								@click="clickedSelectBuilding(i)" :style="{
									border: getBuildingImgBorder(i),
								}" />
						</template>
					</template>
				</template>

				<template v-if="store.gameflow.phase !== rf.PHASE_ALTER_TIME">
					<br />
					<template v-if="canResign()">
						<button class="actionsLineButton resignButton" @click="confirmResign()">Resign</button>
					</template>
					<button class="actionsLineButton" @click="resetPlayerTurn()">Reset</button>
					<template v-if="controller.currentPlayerCanPass() && !store.context.actionChosen">
						<button class="actionsLineButton" @click="passChooseAction()">Pass Choose Actions Phase</button>
					</template>
				</template>
			</template>

			<template v-if="controller.currentPlayerCanPass() && personal.canEndTurn()">
				<button class="actionsLineButton" @click="endTurnAndPass()">End Turn & Pass Next Turn</button>
			</template>

			<button v-if="personal.canEndTurn()" class="actionsLineButton"
				@click="store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS ? controller.endPlayerChooseActionTurn() : controller.endPlayerTurn()">End
				Turn</button>

			<!-- Phase STOP TIME -->
			<template v-if="store.gameflow.phase === rf.PHASE_ALTER_TIME && !store.context.confirmEndTurn">
				Choose to stop time, or pass
				<span v-if="store.remainingTimeStones <= 1" class="actionError">
					<br />
					CAUTION: Taking the last TIme Stone will end the game IMMEDIATELY
				</span>
				<br />
				<button class="actionsLineButton" @click="alterTime(false)">Pass</button>
				<button class="actionsLineButton" @click="alterTime(true)">Stop Time</button>
			</template>

			<!-- Confirm End Turn -->
			<template v-if="store.context.confirmEndTurn">
				Confirm your choice
				<span v-if="store.remainingTimeStones === 0" class="actionError">
					<br />
					CAUTION: Taking the last TIme Stone will end the game IMMEDIATELY
				</span>
				<br />
				<button class="actionsLineButton" @click="resetPlayerTurn()">Reset</button>
				<button class="actionsLineButton" @click="localEndPlayerTurn">End Turn</button>
			</template>

			<!-- Confirm RESIGN -->
			<template v-if="store.context.confirmResign">
				<p>Are you sure you want to resign?</p>
				<p>Resigning will unbalance the game for the remaining players</p>
				<p>Please carry on playing if that is at all possible</p>
				<p>Even if you think you can't win, you can still aim for 2nd place / not last place / etc</p>

				<br />
				<button class="actionsLineButton" @click="resetPlayerTurn()">Cancel</button>
				<button class="actionsLineButton" @click="IO.resign()">Confirm Resign</button>
			</template>
		</div>
	</template>

	<template v-if="store.gameflow.gameEnded > 0 && !store.topMenuViews.showReplay">
		<div id="gameEndDiv">
			Game Over
			<br />
			<br />
			<span v-if="store.gameflow.gameEnded === 1">Game ends immediately once all Time Stones have been used</span>
			<span v-if="store.gameflow.gameEnded === 2">All building spots used</span>
			<span v-if="store.gameflow.gameEnded === 3">Only one player has actions remaining</span>
			<span v-if="store.gameflow.gameEnded === 4">Last player standing</span>
			<br />
			<br />
			Winner: {{ model.getWinnerName()[0] }}
			<template v-if="model.getWinnerName()[0] === personal.name">
				<h1>Congratulations!</h1>
			</template>
			<template v-else>
				<br />
				<br />
			</template>
			<span v-if="model.getWinnerName()[1] === 0">Highest Score</span>
			<span v-if="model.getWinnerName()[1] === 1">Joint score with more Time Stones</span>
			<span v-if="model.getWinnerName()[1] === 2">Joint score, same Time Stones, achieved score first</span>
			<br />
			<br />
			Fancy a
			<a :href="'/createBusPage/' + String(personal.gameID) + '/'">rematch</a>
			?
			<br />
			<br />
		</div>
	</template>

	<template
		v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
		<div v-if="personal.kickoutRequired === 1" id="kickoutDiv">
			Player
			<b>{{ controller.currentPlayerObj().name }}</b>
			has used all of standard kickout time.
			<br />
			<br />
			Remaining Flex-Time:
			<span id="flexiKickoutTimerSpan">{{ getFlexiKickoutTImerText() }}</span>
			<br />
			<br />
			For more information see
			<b><a href="/help/" target="_blank">Help</a></b>
		</div>
		<div v-if="personal.kickoutRequired === 2" id="kickoutDiv">
			Player
			<b>{{ controller.currentPlayerObj().name }}</b>
			has used all of flexi kickout time.
			<br />
			<br />
			<br />
			<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow
					more time</button></span>
			<span>
				<button class="actionsLineButton" id="confirmKickoutButton"
					@click="Bot.actionPlayerKickout">Permanently Kickout {{ controller.currentPlayerObj().name }}</button>
			</span>
		</div>
		<div v-if="personal.kickoutRequired === 3" id="kickoutDiv">
			Player
			<b>{{ controller.currentPlayerObj().name }}</b>
			has used all of flexi kickout time.
			<br />
			<br />
			To kick out
			<b>{{ controller.currentPlayerObj().name }}</b>
			press Confirm Kickout
			<br />
			<br />
			Otherwise you can allow
			<b>{{ controller.currentPlayerObj().name }}</b>
			more time - reload the page to initiate kickout again
			<br />
			<br />
		</div>
		<template v-if="store.context.action !== 1">
			<div id="kickoutDiv">
				Player
				<b>{{ controller.currentPlayerObj().name }}</b>
				has timed out
				<br />
				<br />
				To kick out
				<b>{{ controller.currentPlayerObj().name }}</b>
				press Confirm Kickout
				<br />
				<br />
				Otherwise you can allow
				<b>{{ controller.currentPlayerObj().name }}</b>
				more time - reload the page to initiate kickout again
				<br />
				<br />
			</div>
		</template>
		<template v-if="store.context.action === 1">
			<div id="kickoutDiv">
				This will permanently remove
				<b>{{ controller.currentPlayerObj().name }}</b>
				from the game
				<br />
				<b>It cannot be undone</b>
			</div>
		</template>
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
#loggedOutText {
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
