<script setup>
/** Action area - This is where you interact with the game flow.
 * Confirm actions, end turn, reset turn.
 * Also, it's where you're told what to do next, eg
 * "Select a hex to add to the grid"
 *
 * NB THIS DOESN'T DO ANYTHING YET
 *
 */
import * as rf from "../js/WEBreference"
import * as controller from "../js/WEBcontroller"
//import * as funcs from '../js/WEBfuncs'
import * as model from "../js/WEBmodel"
import * as map from "../js/WEBmap"
import * as view from "../js/WEBview"
import * as cb from "../js/WEBcables"
import * as Bot from "../js/WEBbot"

import { ref, watch, onUnmounted } from "vue"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

function rotateNewCable() {
	store.context.selectedCableRotation++
	if (store.context.selectedCableRotation > 1) store.context.selectedCableRotation = 0
	store.clearAllHighlights()
	cb.highlightSquaresToPlaceCable()
}

function cancelAddingCable() {
	store.clearAllHighlights()
	store.context.action = rf.ACT_CHOOSE_ACTION
}

function rotateNewTile(dir) {
	if (!personal.canPlay()) return
	let playerIndex = controller.currentPlayerIndex()
	if (controller.currentPlayerIndex() !== playerIndex) return
	if (store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE) {
		if (dir === 1) store.context.selectedTileIDtoPlaceArr[1] = (store.context.selectedTileIDtoPlaceArr[1] + 1) % 4
		else store.context.selectedTileIDtoPlaceArr[1] = (store.context.selectedTileIDtoPlaceArr[1] + 3) % 4
		//store.context.selectedTileIDtoPlaceArr = JSON.parse(JSON.stringify(store.context.selectedTileIDtoPlaceArr))
		map.setNewTileOptions()
	}
}

function getAnchorSquarePos() {
	let tileID = store.context.selectedTileIDtoPlaceArr[0]
	let rotation = store.context.selectedTileIDtoPlaceArr[1]
	if (rf.ALL_SQUARE_TILES.includes(tileID)) {
		if (rotation === 0) return [0, 0]
		else if (rotation === 1) return [50, 0]
		else if (rotation === 2) return [50, 50]
		else if (rotation === 3) return [0, 50]
	}
	if (rf.ALL_RECT_TILES.includes(tileID)) {
		if (rotation === 0) return [0, 0]
		else if (rotation === 1) return [25, 25]
		else if (rotation === 2) return [0, 50]
		else if (rotation === 3) return [-25, 25]
	}
	if (rf.ALL_CORNER_TILES.includes(tileID)) {
		if (rotation === 0) return [0, 50]
		else if (rotation === 1) return [0, 0]
		else if (rotation === 2) return [50, 0]
		else if (rotation === 3) return [50, 50]
	}
}

function localGetRotateString(tileID, rotation, xPos, yPos, sideLength) {
	if (rotation === 0) return ""
	if (!rf.ALL_RECT_TILES.includes(tileID)) return `rotate(${rotation * 90} ${xPos + sideLength} ${yPos + sideLength})`
	if (rotation === 1) return `rotate(${rotation * 90} ${xPos + sideLength / 2} ${yPos + sideLength})`
	if (rotation === 2) return `rotate(${rotation * 90} ${xPos + sideLength / 2} ${yPos + sideLength})`
	if (rotation === 3) return `rotate(${rotation * 90} ${xPos + sideLength / 2} ${yPos + sideLength})`
}

function getOrdinalForIdx1(idx1) {
	let num = 1
	for (let i = 0; i < idx1; i++) {
		for (let j = 0; j < model.endGame_core()[i].length; j++) {
			num++
		}
	}
	if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
	return "Unknown"
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
	<div id="actionAreaDiv">
		<!-- LOGGED OUT TEXT -->
		<template v-if="personal.pov === -99">
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

		<!-- KICKOUT INFO -->
		<template v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
			<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
				Player
				<b>{{ controller.currentPlayerObj().name }}</b>
				has used all the standard kickout time.
				<br />
				<br />
				Remaining Flex-Time:
				<span id="flexiKickoutTimerSpan">{{ view.getFlexiKickoutTImerText() }}</span>
				<br />
				<br />
				For more information see
				<b><a href="/help/" target="_blank">Help</a></b>
			</div>
			<div v-else id="kickoutDiv">
				<template v-if="canKickoutNow()">
				<br />
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
		<template v-if="store.gameMessages.errorText !== ''">
			<h1 id="errorText">{{ store.gameMessages.errorText }}</h1>
		</template>

		<!-- ALWAYS SHOWS GAME END-->
		<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
			<!-- THIS IS THE MAIN AREA FOR GAME OVER -->
			<div id="gameEndDiv">
				Game Over
				<template v-if="model.endGame_core()[0].includes(personal.pov)">
					<h1>Congratulations!</h1>
				</template>
				<template v-else>
					<br />
					<br />
				</template>
				<template v-if="model.endGame_core()[0].length === 1">
					Winner:
					<span
						class="mainEntryPlayer"
						:style="{
							backgroundColor: personal.getCorrectedColourHex(store.players[model.endGame_core()[0][0]].colour),
							color: personal.getCorrectedColourText(store.players[model.endGame_core()[0][0]].colour),
						}">
						{{ store.players[model.endGame_core()[0][0]].displayName }}
						({{ cb.getScore(model.endGame_core()[0][0]) }})
					</span>
					<br />
				</template>
				<template v-if="model.endGame_core()[0].length > 1">
					Winners:
					<span
						v-for="(playerIndex, idx) in model.endGame_core()[0]"
						:key="idx"
						class="mainEntryPlayer"
						:style="{
							backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
							color: personal.getCorrectedColourText(store.players[playerIndex].colour),
						}">
						{{ store.players[playerIndex].displayName }}
						({{ cb.getScore(playerIndex) }})
					</span>
					<br />
				</template>
				<template v-for="(entry, idx1) in model.endGame_core().slice(1)" :key="idx1">
					{{ getOrdinalForIdx1(idx1 + 1) }}:
					<span
						v-for="(playerIndex, idx2) in entry"
						:key="idx2"
						class="mainEntryPlayer"
						:style="{
							backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
							color: personal.getCorrectedColourText(store.players[playerIndex].colour),
						}">
						{{ store.players[playerIndex].displayName }}
						({{ cb.getScore(playerIndex) }})
					</span>
					<br />
				</template>
				<br />
				Fancy a
				<a :href="'/createWEBpage/' + String(personal.gameID) + '/'">rematch</a>
				?
				<br />
				<br />
			</div>
		</template>

		<!-- CURRENT PLAYER ONLY-->
		<template v-if="personal.canPlay()">
			<!-- PLACE TILE -->
			<div v-if="store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE">
				<div class="containerDiv">
					<div class="leftDiv">
						<span v-if="store.context.selectedTileIDtoPlaceArr[0] === -1">Select one of your tiles to add to the Grid</span>
						<span v-else>Click tile to rotate</span>
						<br />
						<button @click="model.resetWholeTurn" class="actionsLineButton">Reset</button>
					</div>
					<div class="rightDiv">
						<template v-if="store.context.selectedTileIDtoPlaceArr[0] === -1">Select a tile to Place</template>
						<template v-else>
							<div class="tileAndRotationButtonsDiv">
								<div class="tileRotateDiv leftRotatePos">
									<img @click="rotateNewTile(-1)" :src="view.getImage('rot_anticlockwise')" />
								</div>
								<div class="actionsNumberDiv">
									<img :src="view.getImage('actions_' + model.getActionsForTileID(store.context.selectedTileIDtoPlaceArr[0]))" />
								</div>
								<div class="singleTileDiv">
									<svg class="singleTileSVG" xmlns="http://www.w3.org/2000/svg" :viewBox="rf.ALL_RECT_TILES.includes(store.context.selectedTileIDtoPlaceArr[0]) ? '0 0 50 100' : '0 0 100 100'">
										<polygon @click="rotateNewTile(1)" class="singleTilePolygon" x="0" y="0" :transform="localGetRotateString(store.context.selectedTileIDtoPlaceArr[0], store.context.selectedTileIDtoPlaceArr[1], 0, 0, 50)" :points="view.getPolygonPointsFromTileID(store.context.selectedTileIDtoPlaceArr[0], store.context.selectedTileIDtoPlaceArr[1], 0, 0, 50)" :fill="view.getTilePatternFromID(store.context.selectedTileIDtoPlaceArr[0])" />
										<rect class="anchorSquareHighlight" :x="getAnchorSquarePos()[0]" :y="getAnchorSquarePos()[1]" width="50" height="50" />
									</svg>
								</div>
								<div class="tileRotateDiv rightRotatePos">
									<img @click="rotateNewTile(1)" :src="view.getImage('rot_clockwise')" />
								</div>
							</div>
						</template>
					</div>
				</div>
			</div>

			<!-- Choose Action -->
			<div v-if="store.context.action === rf.ACT_CHOOSE_ACTION">
				You may add a cable, get more cables from your reserve, or select a new Tile
				<br />
				Remaining Actions: {{ store.context.remainingActions }}
				<br />
				<b>
					CAUTION: Taking a new tile will reveal hidden information
					<br />
					The game will be saved and you will not be able to undo this action
				</b>
				<br />
				<span v-if="controller.currentPlayerObj().tileIDarrays.length === 0" class="cautionSpan">
					CAUTION: If you do not pick up a tile you will not be able to take any more turns
					<br />
				</span>
				<button @click="model.resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="model.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">Undo Action</button>
				<button @click="controller.endPlayerTurn()" class="actionsLineButton">
					<span v-if="store.context.remainingActions === 0">End Turn</span>
					<span v-else>Forefeit Actions & End Turn</span>
				</button>
			</div>

			<!-- Place Cable -->
			<div v-if="store.context.action === rf.ACT_PLACE_CABLE">
				Add a Cable to the Grid (Click to Rotate)
				<br />
				<div class="cableAndRotationContainer">
					<div class="cableRotateDiv leftRotatePos">
						<img @click="rotateNewCable()" :src="view.getImage('rot_anticlockwise')" />
					</div>
					<div class="cableContainer">
						<div
							class="currentCableDiv"
							@click="rotateNewCable()"
							:style="{
								backgroundColor: personal.getCorrectedColourHex(controller.currentPlayerObj().colour),
								width: store.context.selectedCableRotation === 0 ? '15px' : '75px',
								height: store.context.selectedCableRotation === 0 ? '75px' : '15px',
								marginLeft: store.context.selectedCableRotation === 0 ? '42.5px' : '12.5px',
								top: store.context.selectedCableRotation === 0 ? '0px' : '26px',
							}"></div>
					</div>
					<div class="cableRotateDiv rightRotatePos">
						<img @click="rotateNewCable(playerIndex, tileIDarr, 1)" :src="view.getImage('rot_clockwise')" />
					</div>
				</div>
				<button @click="cancelAddingCable" class="actionsLineButton">Cancel</button>
			</div>

			<!-- Confirm Turn End -->
			<div v-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
				<button @click="model.resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="model.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">Undo Action</button>
				<button @click="controller.endPlayerTurn()" class="actionsLineButton">End Turn</button>
			</div>

			<!-- Confirm Turn End -->
			<div v-if="store.context.action === rf.CONFIRM_GAME_END_EMPTY_SUPPLY">
				Emptying a supply plie will immediately end the game. Are you sure?
				<br />
				<button @click="model.resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="model.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">Undo Action</button>
				<button @click="controller.endPlayerTurn()" class="actionsLineButton">Confirm Game End</button>
			</div>
		</template>
	</div>
</template>

<style scoped>
#actionAreaDiv {
	font-weight: bolder;
	background-color: lightblue;
}

.containerDiv {
	display: flex; /* Use flexbox to arrange children side by side */
	justify-content: space-between; /* Space divs evenly or adjust as needed */
	align-items: center; /* Vertically center content */
	width: fit-content; /* Full width of parent */
	margin: 0 auto; /* Center the container */
}

.leftDiv {
	flex: 1; /* Take equal or proportional space */
	margin-right: 10px; /* Space between left and right divs */
	text-align: center; /* Center text */
	color: #333; /* Text color */
	width: fit-content;
	min-width: 200px;
}

.rightDiv {
	flex: 1; /* Take equal or proportional space */
	text-align: center; /* Center text */
	color: #333; /* Text color */
}

.cableAndRotationContainer {
	position: relative;
	width: 100px;
	height: 75px;
	margin: auto;
}

.currentCableDiv {
	position: absolute;
	border: 2px solid black;
}
.cableRotateDiv {
	position: absolute;
	bottom: 0px;
	z-index: 100;
	width: 30px;
	height: 30px;
	border: 2px solid black;
	border-radius: 10px;
	box-sizing: border-box;
	overflow: hidden;
}

.cableRotateDiv:hover {
	border: 2px solid yellow;
}

.tileAndRotationButtonsDiv {
	display: inline-block;
	position: relative;
	margin-right: 5px;
	width: 275px;
	border: 1px solid black;
}

.tileRotateDiv {
	position: absolute;
	bottom: 0px;
	z-index: 100;
	width: 60px;
	height: 60px;
	border: 2px solid black;
	border-radius: 20px;
	box-sizing: border-box;
	overflow: hidden;
}

.tileRotateDiv img {
	width: 100%;
	height: 100%;
}

.tileRotateDiv:hover {
	border-color: yellow;
}

.leftRotatePos {
	left: 0px;
}

.rightRotatePos {
	right: 0px;
}

.actionsNumberDiv {
	position: absolute;
	top: 0px;
	left: 0px;
	z-index: 100;
	width: 50px;
	height: 50px;
	border: 1px solid black;
	box-sizing: border-box;
	overflow: hidden;
}

.actionsNumberDiv img {
	width: 100%;
	height: 100%;
}

.singleTileDiv {
	height: 150px;
}

.singleTileSVG {
	width: 100%;
	height: 100%;
}

.singleTilePolygon {
	stroke: black;
	stroke-width: 1px;
}

.anchorSquareHighlight {
	stroke: yellow;
	fill: yellow;
	fill-opacity: 0.3;
	stroke-width: 5px;
	pointer-events: none;
}

#gameEndDiv {
	font-size: 30px;
	font-weight: bold;
	margin-top: 10px;
}

.playerScoreSummaryDiv {
	border: 1px solid black;
	display: inline-block;
	font-size: 30px;
	margin: 4px;
	padding: 0px;
}

.cautionSpan {
	color: orangered;
	font-size: 20px;
	font-weight: bolder;
}

.playerNameWithPadding {
	padding: 10px;
}

#errorText,
#loggedOutText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#loggedOutText {
	font-size: 20px;
}
</style>
