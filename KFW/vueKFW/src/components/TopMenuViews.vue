<script setup>
import * as IO from "../backend/KFW_IO"
import * as view from "../js/KFWview"
import * as rf from "../js/KFWreference"
import * as funcs from "../js/KFWfuncs"
import * as rules from "../js/KFWrules"

import { ref } from "vue"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

const chatMessage = ref("")
const bugReportText = ref("")
const submittingBug = ref(false)
const polygonRef = ref(null)

function getFlexiTimeString(playerName) {
	let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
	let secondsIn24Hours = 24 * 60 * 60
	let playerSeconds = 0

	// Iterate over the KickoutFlexiDataArray to find the player's entry
	for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
		let entry = KickoutFlexiDataArray[i]

		// Check if the entry is a length-2 array and the first element matches the playerName
		if (Array.isArray(entry) && entry.length === 2 && entry[0] === playerName) {
			playerSeconds = entry[1]
			break
		}
	}

	let remainingSeconds = secondsIn24Hours - playerSeconds
	let hours = Math.floor(remainingSeconds / 3600)
	let minutes = Math.floor((remainingSeconds % 3600) / 60)

	// Set remaining time to 0 if it is negative
	hours = Math.max(hours, 0)
	minutes = Math.max(minutes, 0)

	// Format the hours and minutes as a string in the format hh:mm
	let formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

	return formattedTime
}

function toggleBug() {
	store.viewSettings.showNotes = false
	store.viewSettings.showBug = !store.viewSettings.showBug
}

function toggleNotes() {
	store.viewSettings.showBug = false
	store.viewSettings.showNotes = !store.viewSettings.showNotes
}
function parseMessage(message) {
	message = message.replace(/SNLB/g, "\n")
	return message
}

function sendChatMessage() {
	if (chatMessage.value === "") return
	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp)
	if (store.chatData.length > 0) {
		for (let i = 0; i < store.chatData.length; i++) {
			time -= store.chatData[i][1]
		}
	}
	let newEntry = [personal.name, time, chatMessage.value]
	IO.sendChatMessage([...newEntry])
	chatMessage.value = ""
}
function clearNotes() {
	personal.notes = ""
	IO.saveNotes()
}

function loadRewind() {
	if (store.viewSettings.performingRewind) return
	store.viewSettings.performingRewind = true
	setTimeout(function () {
		store.viewSettings.showRewindPanel = false
		IO.loadRewind()
	}, 500)
}

async function submitBug() {
	submittingBug.value = true
	store.gameMessages.bugErrorText = ""
	store.gameMessages.bugSuccessText = ""

	if (bugReportText.value.length === 0) {
		store.gameMessages.bugErrorText = "Please enter a bug report"
		submittingBug.value = false
		return
	}
	await IO.submitBug(bugReportText.value)
	submittingBug.value = false
}

function getUnusedSeasonTiles(season) {
	if (season < store.gameflow.season) return []
	let possibleSeasonTiles = []
	let baseSeasonTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_BASE && tile.season === season)))
	let merchantSeasonTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_MERCHANTS && tile.season === season)))
	let promoSeasonTiles = JSON.parse(JSON.stringify(rf.ALL_TILES.filter((tile) => tile.tileset === rf.TILESET_PROMO && tile.season === season && store.promoTileIDsToInclude.includes(tile.tileID[0]))))

	possibleSeasonTiles = baseSeasonTiles
	if (store.useMerchantsExpansion) possibleSeasonTiles = possibleSeasonTiles.concat(merchantSeasonTiles)
	if (store.promoTileIDsToInclude.length > 0) possibleSeasonTiles = possibleSeasonTiles.concat(promoSeasonTiles)

	if (season > store.gameflow.season) return possibleSeasonTiles

	return possibleSeasonTiles.filter((tile) => !store.availableTiles.some((tile2) => tile.id === tile2.id))
}

const showPopupFunc = (event, tileID) => {
	polygonRef.value = event.target // Set the polygonRef to the target element
	const rect = polygonRef.value.getBoundingClientRect()
	const xPos = Math.round(rect.left + window.scrollX)
	const yPos = Math.round(rect.top + window.scrollY)
	const width = Math.round(rect.width)
	const height = Math.round(rect.height)

	let tile = rf.ALL_TILES.find((t) => t.tileID.includes(tileID))
	store.popupSetter.tile_id = tile.id
	store.popupSetter.upgraded = tile.upgraded
	let retPos = view.getPopupXY(xPos, yPos, width, height)

	store.popupSetter.xPos = retPos[0]
	store.popupSetter.yPos = retPos[1]

	store.popupSetter.showPopup = true
}

function hidePopup() {
	store.popupSetter.showPopup = false
}
</script>

<template>
	<!-- BUG REPORT -->
	<transition name="slideBug">
		<div id="bugReport" v-if="store.viewSettings.showBug">
			<h1>Bug Report</h1>
			
			<p>
				Please submit a bug report if you encounter any issues, giving as much detail as possbile.
				<br />
				The game data will be submitted along with your report.
				<br />
				You can also report it on the OBG discord. Click
				<a href="https://discord.gg/hCU7Fr77yV" class="linkOther" target="_blank">Here</a>
				to join
			</p>

			<div><textarea cols="150" rows="10" name="bugContent" id="bugContent" v-model="bugReportText"></textarea></div>
			<div>
				<button class="actionsLineButton" id="submitBug" @click="submitBug" :disabled="submittingBug">
					<span v-if="submittingBug">Submitting Bug Report...</span>
					<span v-else>Submit</span>
				</button>
				<button class="actionsLineButton" id="resetBug" @click="toggleBug">Cancel</button>
			</div>
		</div>
	</transition>

	<!-- NOTES -->
	<transition name="slideNotes">
		<div id="notesBox" v-if="store.viewSettings.showNotes">
			<h2>Personal game notes</h2>
			<p>Only you can see these notes</p>
			<div><textarea cols="120" rows="10" id="notes" v-model="personal.notes"></textarea></div>
			<div>
				<button class="actionsLineButton" id="submitNotes" @click="IO.saveNotes">Submit</button>
				<button class="actionsLineButton" id="clearNotes" @click="clearNotes">Clear</button>
				<button class="actionsLineButton" id="closeNotes" @click="toggleNotes">Close</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<transition name="fade">
		<div id="wholeChat" v-if="store.viewSettings.showChat">
			<div id="chatBox">
				<h2>Send a message</h2>
				<div><textarea rows="6" name="chatMessage" id="chatMessage" v-model="chatMessage"></textarea></div>
				<div><button class="actionsLineButton" @click="sendChatMessage">Send</button></div>
			</div>
			<div id="messageList">
				<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
					<div class="header">
						<span class="bold">{{ message[0] }}</span>
						<span class="date">
							{{ funcs.chatTimestampToString(message[1], index) }}
						</span>
					</div>
					<div class="messageBody">{{ parseMessage(message[2]) }}</div>
				</div>
			</div>
		</div>
	</transition>

	<!-- REWKFW PANEL -->
	<transition name="fade">
		<div id="rewindPanel" v-if="store.viewSettings.showRewindPanel">
			Any player can rewind the game at any time.
			<br />
			Please be courteous and rewind only if absolutely neessary - send a chat message to inform the other players.
			<br />
			Misuse of this feature will result in rewinds requiring permission from all players.

			<br />
			<br />
			<span v-if="rules.getRewindHiddenDataResult(1).length > 0" class="rewindCautionSpan">
				Caution: Rewinding now will change hidden information
				<br />
				This will be added as a note in the history
				<br />
				<br />
			</span>
			<template v-for="(entry, idx) in rules.getRewindHiddenDataResult(1)" :key="idx">
				<span v-if="entry[0] === -1" class="rewindCautionSpan">
					The boats were randomly filled
					<br />
					This rewind will result in different resources on the boats
					<br />
				</span>
				<span v-else-if="entry[0] === -2" class="rewindCautionSpan">
					The season tiles were randomly dealt
					<br />
					This rewind will result in new season tiles being drawn.
					<br />
				</span>
				<span v-else-if="entry[0] === -3" class="rewindCautionSpan">
					This rewind will change which random workers were obtained from Summer boat 1a
					<br />
				</span>
				<span v-else-if="entry[0] === -4" class="rewindCautionSpan">
					New contracts have been revealed
					<br />
					This rewind will result in re-drawing: {{ entry[1] }}
					<br />
				</span>
				<span v-else-if="entry[0] === -5" class="rewindCautionSpan">
					The Winter tiles were revealed
					<br />
					This rewind could result in choosing different Winter tiles after seeing what other players had done
					<br />
				</span>
				<span v-else-if="entry[0] === -6" class="rewindCautionSpan">
					A contract was collected from a boat
					<br />
					This rewind would happen after this contract had been seen
					<br />
				</span>
				<!-- Otherwise, it's a tile action -->
				<span v-else class="rewindCautionSpan">
					This rewind would undo hidden information revealed as part of a tile Action
					<br />
					The tile used was: {{ rf.ALL_TILES.find((tile) => tile.tileID.includes(entry[0])).name[0] }}
					<br />
				</span>
			</template>

			<span class="rewindButtonSpan" @click="loadRewind()">
				<img src="@static/KFW/images/icon-rewind.svg" />
				<span>Rewind</span>
			</span>
		</div>
	</transition>

	<!-- RESERVE -->
	<transition name="slideRes">
		<div id="reserve" v-if="store.viewSettings.showReserve">
			<!-- Unused Season Tiles -->
			<h2>Unused / Upcoming Season Tiles</h2>

			<template v-for="(season, idx) in [rf.SPRING, rf.SUMMER, rf.AUTUMN, rf.WINTER]" :key="idx">
				<template v-if="season >= store.gameflow.season">
					<h2>{{ view.getSeasonText(season) }}</h2>
					<template v-for="(tile, idx) in getUnusedSeasonTiles(season)" :key="idx">
						<div class="seasonHexDiv">
							<svg class="seasonHexSVG" viewBox="-420 -348 840 696" xmlns="http://www.w3.org/2000/svg">
								<defs>
									<pattern :id="tile.gfx[0]" height="100%" width="100%" patternContentUnits="objectBoundingBox">
										<image height="1" width="1" preserveAspectRatio="none" :xlink:href="view.getImage(tile.gfx[0])" />
									</pattern>
								</defs>
								<polygon @mouseover="showPopupFunc($event, tile.tileID[0])" @mouseout="hidePopup()" class="seasonHexPolygon" points="200,346.41 400,0 200,-346.41 -200,-346.41 -400,0 -200,346.41" :fill="`url(#${tile.gfx[0]})`" />
							</svg>
						</div>
					</template>
					<br />
				</template>
			</template>

			<!-- FLEXI-TIMES -->
			<div id="timesDiv">
				Flexi-Times:
				<span v-for="(player, idx) in store.players" :key="idx">{{ player.displayName }}: {{ getFlexiTimeString(player.name) }}&nbsp;&nbsp;&nbsp;</span>
				&nbsp;&nbsp;&nbsp;
			</div>
		</div>
	</transition>
</template>

<style scoped>
.seasonHexDiv {
	display: inline-block;
	vertical-align: middle;
	width: 131px;
	height: 103px;
	margin-bottom: 5px;
}
.seasonHexSVG {
	width: 100%;
	height: 100%;
}
.seasonHexPolygon {
	stroke: black;
	stroke-width: 8;
}

#timesDiv {
	margin-top: 20px;
	margin-bottom: 4px;
}

#reserve {
	border: 2px solid black;
	/*margin-top: -4px;*/
	/*margin-left: -10px;*/
	background-color: lightblue;
}

.slideRes-enter-active,
.slideRes-leave-active {
	transition: all 0.2s ease-in-out;
	height: 1000px;
	overflow: hidden;
}

.slideRes-enter-from,
.slideRes-leave-to {
	opacity: 0;
	height: 0px;
}



.rewindCautionSpan {
	background-color: lightgoldenrodyellow;
	color: darkred;
}



.slideNotes-enter-active,
.slideNotes-leave-active {
	transition: all 0.2s ease-in-out;
	height: 293px;
	overflow: hidden;
}

.slideBug-enter-active,
.slideBug-leave-active {
	transition: all 0.2s ease-in-out;
	height: 300px;
	overflow: hidden;
}

.slideBug-enter-from,
.slideBug-leave-to,
.slideNotes-enter-from,
.slideNotes-leave-to {
	opacity: 0;
	height: 0px;
}

#bugReport,
#notesBox {
	/*display: none;*/
	text-align: center;
	margin-bottom: 10px;
}

#wholeChat {
	/*display: none;*/
	position: absolute;
	left: 2px;
	top: 62px;
	width: 450px;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	overflow-y: scroll;
	padding-bottom: 10px;
	font-family: Arial, sans-serif;
	text-align: center;
}

#chatBox {
	text-align: center;
}

#chatBox textarea {
	width: 90%;
}

.chatentry {
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 5px;
	background-size: 40px 40px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
}

.chatentry .header {
	margin-bottom: 7px;
	border-bottom: #000 1px solid;
}

.chatentry .header .date {
	font-size: 0.7em;
	font-style: italic;
	float: right;
}

.chatentry .header .bold {
	font-weight: bold;
}

.chatentry .messageBody {
	overflow: auto;
	white-space: pre-wrap;
}

.chatentry .header {
	margin-bottom: 7px;
	border-bottom: #000 1px solid;
}

.chatentry .header .date {
	font-size: 0.7em;
	font-style: italic;
	float: right;
}

.chatentry .header .bold {
	font-weight: bold;
}

.chatentry .body {
	overflow: auto;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

#rewindPanel {
	position: absolute;
	background-color: black;
	border: 1px solid white;
	padding: 5px;
	width: 400px;
	top: 60px;
	left: 500px;
	font-size: 18px;
	z-index: 10000;
	color: white;
}

.rewindButtonSpan {
	display: inline-block;
	width: 62px;
	height: 55px;
	border: #eee;
	border-radius: 5px;
	cursor: pointer;
	text-align: center;
}

.rewindButtonSpan:hover {
	color: lightblue;
}

.rewindButtonSpan:hover img {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
}

.rewindButtonSpan img {
	width: 38x;
	height: 38px;
}

.rewindButtonSpan span {
	font-size: 14px;
	font-weight: bold;
	display: block;
}
</style>
