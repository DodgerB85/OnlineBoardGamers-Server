<script setup>
import * as constants from "../constants"
import * as IO from "../BUS_IO"
import * as Bot from "../BUSbot"

import * as view from "../js/BUSview.js"

import { useModelStore } from "../stores/model.js"
const model = useModelStore()
import { usePersonalStore } from "../stores/personal.js"
const personal = usePersonalStore()

function getActionText() {
	let phaseStr = ""
	if (model.gameflow.phase === 0) {
		phaseStr = "Place 2 buildings on Number 1 Locations" // TO: 2 bldgs on zone 1 per player
		phaseStr += "<br/>Remaining Buildings: " + model.context.buildingsLeftToPlace
	}
	if (model.gameflow.phase === 1) {
		phaseStr = "Place a Bus Line" // TO then reverse TO,eg 1,2,3,4,4,3,2,1, place 1 line
		phaseStr += "<br/>Remaining Lines: " + model.context.linesLeftToPlace
		if (model.context.endJunctionsOptions.length > 0) phaseStr += "<br/>Choose the junction where your lines will meet"
	}
	if (model.gameflow.phase === 2) {
		phaseStr = "Choose an Action in the upper right area or next to the board"
		phaseStr += "<br/>Actions are chosen A to F. The 'A' square has the highest number of actions. Actions are resolved Left to Right"
		phaseStr += "<br/>Once you have chosen at least 2 actions this round, you will have the option to pass"
		if (model.currentPlayer().remainingActions === 0 && !model.context.actionChosen) phaseStr += "<br/><br/><span style='color: red'>YOU HAVE NO ACTIONS REMAINING - YOU MUST PASS</span>"
	}

	if (model.gameflow.phase === 3) {
		phaseStr = "Expand your bus line from either end" // 5p: +1 to maxNumBus
		phaseStr += "<br/>Remaining Lines: " + model.context.linesLeftToPlace
	}
	if (model.gameflow.phase === 4) phaseStr = "AddBus"
	if (model.gameflow.phase === 5) {
		phaseStr = "Choose one of the two stations to add a Passenger"
		phaseStr += "<br/>Remaining Passengers: " + model.context.passengersLeftToPlace
	}
	if (model.gameflow.phase === 6) {
		phaseStr = "Choose a location to add a Building" // (GE check)
		phaseStr += "<br/>Remaining Buildings: " + model.context.buildingsLeftToPlace
	}

	// PHASE 7 IN TEMPLATE
	//if (model.gameflow.phase === 7) {phaseStr = 'Choose to stop time, or pass' // AND POSSIBLE IMMEDIATE GAME END

	if (model.gameflow.phase === 8) {
		phaseStr = "Choose a passenger to move to their desired destination"
		phaseStr += "<br/>Remaining Moves: " + model.context.remainingVroms
	}
	if (model.gameflow.phase === 9) phaseStr = "ChangeStartPlayer" // GE check, if no more bldg spots
	if (model.gameflow.phase === 10) phaseStr = "GameEndCheck" // bldg spots, only 1 player with action markers
	if (model.gameflow.phase === 11) phaseStr = "GameFinished"
	return phaseStr
}

function highlight(e, bldgNum, entering) {
	if (entering) e.target.style.border = "4px solid lightgreen"
	else {
		if (bldgNum === model.context.selectedBuildingType) e.target.style.border = "4px solid lightgreen"
		else e.target.style.border = "4px solid yellow"
	}
}
function clickedSelectBuilding(bldgNum) {
	model.context.selectedBuildingType = bldgNum
}

function getBuildingImgBorder(bldgNum) {
	if (bldgNum === model.context.selectedBuildingType) return "4px solid lightgreen"
	else return "4px solid yellow"
}
function alterTime(stoppingTime) {
	if (!stoppingTime) {
		model.desiredBuilding++
		if (model.desiredBuilding === 4) model.desiredBuilding = 1
		model.context.historyObj.push(model.desiredBuilding, 0)
	} else {
		model.currentPlayer().timeStones++
		model.decreaseScore(model.currentPlayer())
		model.remainingTimeStones--
		model.context.historyObj.push(model.desiredBuilding, 1)
	}
	model.context.confirmEndTurn = true
}
function localEndPlayerTurn() {
	model.context.confirmEndTurn = false
	if (model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS) model.endPlayerChooseActionTurn()
	else model.endPlayerTurn()
}
function resetPlayerTurn() {
	model.resetVarsOnTurnEnd()
	model.importModel(model.turnResetData)
	model.startPlayerTurn()
	if (personal.yourTurnAudioType > 0) {
		let beep
		if (personal.yourTurnAudioType == 1) beep = new Audio("/static/BUS/sounds/beep.mp3")
		if (personal.yourTurnAudioType == 2) beep = new Audio("/static/BUS/sounds/bell.mp3")
		beep.play()
	}
}
function passChooseAction() {
	model.context.confirmEndTurn = true
}
function confirmResign() {
	model.context.confirmResign = true
}
function canResign() {
	// canPlay is already checked
	if (personal.trainingGame) return false
	if (model.gameflow.phase !== constants.PHASE_CHOOSE_ACTIONS) return false
	if (model.context.actionChosen) return false
	if (model.gameflow.turnOrder.length < 2) return false
	return true
}
function cancelKickout() {
	personal.kickoutRequired = 0
}

function endTurnAndPass() {
	model.currentPlayer().passActionsFlag = true
	model.endPlayerChooseActionTurn()
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
	personal.removeCurrentFlexTimeName = model.currentPlayer().name

	if (model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS) model.currentPlayer().remainingActions--

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

	<template v-if="model.rewindErrorText !== ''">
		<h1 id="rewindErrorText">{{ model.rewindErrorText }}</h1>
	</template>
	<template v-if="model.successText !== ''">
		<h1 id="successText">{{ model.successText }}</h1>
	</template>

	<template v-if="personal.canPlay()">
		<div id="actions">
			<template v-if="model.gameflow.phase === constants.PHASE_SETUP_BLDGS">
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

			<template v-if="!model.context.confirmEndTurn && !model.context.confirmResign">
				<span v-html="getActionText()"></span>
				<span class="actionError" v-if="model.context.turnEndingErrorMessage !== ''">
					<br />
					{{ model.context.turnEndingErrorMessage }}
				</span>

				<template
					v-if="(model.gameflow.phase === constants.PHASE_SETUP_BLDGS || model.gameflow.phase === constants.PHASE_ADD_BLDGS) && model.context.buildingsLeftToPlace > 0">
					<br />
					<template v-if="personal.selectedBoard === 0 || personal.selectedBoard === 2">
						<template v-for="i in [1, 2, 3]" v-bind:key="i">
							<img class="buildingOptionImg" :id="'buildingOptionImg' + String(i)"
								:src="view.getImage('building' + String(i))" alt="buildingOption"
								@mouseover="highlight($event, i, true)" @mouseleave="highlight($event, i, false)"
								@click="clickedSelectBuilding(i)" :style="{
									border: getBuildingImgBorder(i),
								}" />
						</template>
					</template>
					<template v-if="personal.selectedBoard === 1">
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

				<template v-if="model.gameflow.phase !== constants.PHASE_ALTER_TIME">
					<br />
					<template v-if="canResign()">
						<button class="actionsLineButton resignButton" @click="confirmResign()">Resign</button>
					</template>
					<button class="actionsLineButton" @click="resetPlayerTurn()">Reset</button>
					<template v-if="model.currentPlayerCanPass() && !model.context.actionChosen">
						<button class="actionsLineButton" @click="passChooseAction()">Pass Choose Actions Phase</button>
					</template>
				</template>
			</template>

			<template v-if="model.currentPlayerCanPass() && personal.canEndTurn()">
				<button class="actionsLineButton" @click="endTurnAndPass()">End Turn & Pass Next Turn</button>
			</template>

			<button v-if="personal.canEndTurn()" class="actionsLineButton"
				@click="model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS ? model.endPlayerChooseActionTurn() : model.endPlayerTurn()">End
				Turn</button>

			<!-- Phase STOP TIME -->
			<template v-if="model.gameflow.phase === constants.PHASE_ALTER_TIME && !model.context.confirmEndTurn">
				Choose to stop time, or pass
				<span v-if="model.remainingTimeStones <= 1" class="actionError">
					<br />
					CAUTION: Taking the last TIme Stone will end the game IMMEDIATELY
				</span>
				<br />
				<button class="actionsLineButton" @click="alterTime(false)">Pass</button>
				<button class="actionsLineButton" @click="alterTime(true)">Stop Time</button>
			</template>

			<!-- Confirm End Turn -->
			<template v-if="model.context.confirmEndTurn">
				Confirm your choice
				<span v-if="model.remainingTimeStones === 0" class="actionError">
					<br />
					CAUTION: Taking the last TIme Stone will end the game IMMEDIATELY
				</span>
				<br />
				<button class="actionsLineButton" @click="resetPlayerTurn()">Reset</button>
				<button class="actionsLineButton" @click="localEndPlayerTurn">End Turn</button>
			</template>

			<!-- Confirm RESIGN -->
			<template v-if="model.context.confirmResign">
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

	<template v-if="model.gameflow.gameEnded > 0 && !model.topMenuViews.showReplay">
		<div id="gameEndDiv">
			Game Over
			<br />
			<br />
			<span v-if="model.gameflow.gameEnded === 1">Game ends immediately once all Time Stones have been used</span>
			<span v-if="model.gameflow.gameEnded === 2">All building spots used</span>
			<span v-if="model.gameflow.gameEnded === 3">Only one player has actions remaining</span>
			<span v-if="model.gameflow.gameEnded === 4">Last player standing</span>
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
		v-if="personal.kickoutRequired > 0 && !personal.canPlay() && model.gameflow.phase !== constants.PHASE_GAME_OVER">
		<div v-if="personal.kickoutRequired === 1" id="kickoutDiv">
			Player
			<b>{{ model.currentPlayer().name }}</b>
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
		<div v-else id="kickoutDiv">
			<br />
			<template v-if="model.context.action !== 1">
				Player
				<b>{{ model.currentPlayer().name }}</b>
				has timed out
				<br />
				To kick out
				<b>{{ model.currentPlayer().name }}</b>
				press Confirm Kickout
				<br />
				The game will proceed to the next player/phase/turn
				<br />
				<br />
				Otherwise you can allow
				<b>{{ model.currentPlayer().name }}</b>
				more time - reload the page to initiate kickout again
				<br />

				<br />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow
						more time</button></span>
				<span>
					<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{
						model.currentPlayer().name }} in the game - but end their current turn</button>
				</span>
				<span><button class="actionsLineButton" id="confirmKickoutButton"
						@click="model.context.action = 1">Confirm Kickout</button></span>
			</template>
			<template v-if="model.context.action === 1">
				This will permanently remove
				<b>{{ model.currentPlayer().name }}</b>
				from the game
				<br />
				<b>It cannot be undone</b>
				<br />
				<br />
				Try checking the chat in case they have given a reason for any temporary absence
				<br />
				Please consider giving them a short grace period, in case they are just delayed

				<br />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow
						more time</button></span>
				<span>
					<button class="actionsLineButton" id="confirmKickoutButton"
						@click="Bot.actionPlayerKickout">Permanently Kickout {{ model.currentPlayer().name }}</button>
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
