<script setup>
import * as IO from "../js/CNS_IO"
import * as view from "../js/CNSview"
import * as rf from "../js/CNSreference"
import * as funcs from "../js/CNSfuncs"

import { ref } from "vue"

import { useModelStore } from "../stores/CNSstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/CNSpersonal.js"
const personal = usePersonalStore()

const chatMessage = ref("")
const bugReportText = ref("")
const submittingBug = ref(false)

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
	store.topMenuViews.showNotes = false
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}

function toggleNotes() {
	store.topMenuViews.showBug = false
	store.topMenuViews.showNotes = !store.topMenuViews.showNotes
}
function parseMessage(message) {
	message = message.replace(/SNLB/g, "\n")
	return message
}

function sendChatMessage() {
	if (chatMessage.value === "") return
	let newEntry = [personal.name, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), chatMessage.value]
	IO.sendChatMessage([...newEntry])
	chatMessage.value = ""
}
function clearNotes() {
	personal.notes = ""
	IO.saveNotes()
}

function loadRewind() {
	if (store.topMenuViews.performingRewind) return
	store.topMenuViews.performingRewind = true
	setTimeout(function () {
		store.topMenuViews.showRewindPanel = false
		IO.loadRewind()
	}, 500)
}

function submitBug() {
	submittingBug.value = true
	store.topMenuViews.bugErrorText = ""
	store.topMenuViews.bugSuccessText = ""

	if (bugReportText.value.length === 0) {
		store.topMenuViews.bugErrorText = "Please enter a bug report"
		return
	}
	IO.submitBug(bugReportText.value)
	submittingBug.value = false
}

function getDiscardedHexRefs() {
	if (store.hexDiscardPile.length === 0) return []
	// find the discard pile
	let seenDiscardRefs = []
	if (personal.pov >= 0) {
		seenDiscardRefs = [...store.players[personal.pov].seenDiscardHexRefs]
		seenDiscardRefs.sort((a, b) => a - b)
	}

	let res = combineHexRefs(seenDiscardRefs)

	let unseenDiscardRefs = [...store.hexDiscardPile]
	unseenDiscardRefs = unseenDiscardRefs.filter((ref) => !seenDiscardRefs.includes(ref))

	res.push(unseenDiscardRefs.length)

	return res
}

function getPossibleDrawHexRefs() {
	// Start with all possible refs.
	let possibleDrawRefs = [...rf.INITIAL_DRAW_PILE_2P3P]
	if (store.players.length === 4) possibleDrawRefs = [...rf.INITIAL_DRAW_PILE_4P]

	// Remove your seen discards
	if (personal.pov >= 0) possibleDrawRefs = possibleDrawRefs.filter((ref) => !store.players[personal.pov].seenDiscardHexRefs.includes(ref))

	// Remove the drawn Hexes
	if (personal.canPlay()) possibleDrawRefs = possibleDrawRefs.filter((ref) => !store.ongoingVars.drawnHexes.includes(ref))

	// Remove hexes on the map
	let mapHexRefs = []
	for (let i = 0; i < store.hexes.length; i++) {
		mapHexRefs.push(store.hexes[i].hexRef)
	}
	possibleDrawRefs = possibleDrawRefs.filter((ref) => !mapHexRefs.includes(ref))

	// Now combine multiples
	return combineHexRefs(possibleDrawRefs)
}

function combineHexRefs(input) {
	const res = []
	const possibleCombinations = [
		[rf.HEX_YELLOW_PEOPLE1_A, rf.HEX_YELLOW_PEOPLE1_B],
		[rf.HEX_YELLOW_BEER1_A, rf.HEX_YELLOW_BEER1_B],
		[rf.HEX_YELLOW_CHIP1_A, rf.HEX_YELLOW_CHIP1_B, rf.HEX_YELLOW_CHIP1_C, rf.HEX_YELLOW_CHIP1_D],
		[rf.HEX_REAL_ESTATE_A, rf.HEX_REAL_ESTATE_B],
		[rf.HEX_PROD_CIGAR_A, rf.HEX_PROD_CIGAR_B],
		[rf.HEX_PROD_COMPUTER_A, rf.HEX_PROD_COMPUTER_B, rf.HEX_PROD_COMPUTER_C],
		[rf.HEX_PROD_ACTRESS_A, rf.HEX_PROD_ACTRESS_B],
		[rf.HEX_PROD_SFX_A, rf.HEX_PROD_SFX_B],
		[rf.HEX_PROD_SCRIPT_A, rf.HEX_PROD_SCRIPT_B],
		[rf.HEX_PARTY_NO_ENTRANCE_A, rf.HEX_PARTY_NO_ENTRANCE_B],
		[rf.HEX_PARTY_0_A, rf.HEX_PARTY_0_B],
		[rf.HEX_PARTY_01, rf.HEX_PARTY_05],
		[rf.HEX_PARTY_02_A, rf.HEX_PARTY_02_B],
		[rf.HEX_PARTY_03_A, rf.HEX_PARTY_03_B],
	]

	for (const smallerArray of possibleCombinations) {
		const matchingEntries = smallerArray.filter((value) => input.includes(value))

		if (matchingEntries.length > 1) {
			res.push(matchingEntries)
		} else if (matchingEntries.length === 1) {
			res.push([matchingEntries[0]])
		}
	}

	// Add values from input that are not contained in res
	for (const value of input) {
		const isValueContained = res.some((arr) => arr.includes(value))
		if (!isValueContained) {
			res.push([value])
		}
	}

	// Sort arrays in res based on the value of subArray[0]
	res.sort((a, b) => a[0] - b[0])

	return res
}

function getRewindPanelLeft() {
	return document.getElementById("menuButtonRewindPos").getBoundingClientRect().left + document.getElementById("menuButtonRewindPos").getBoundingClientRect().width / 2 - 200
}

function getStatsExcludeVotes(returnPlayers = false) {
	let votes = 0
	let players = "None"

	for (const player in store.statsExcludeVotesData) {
		// Use const or let for player
		if (store.statsExcludeVotesData[player] === true) {
			votes += 1
			if (players === "None") players = String(player)
			else players += ", " + player
		}
	}
	if (returnPlayers) return players
	return votes
}

function getDeleteVotes(returnPlayers = false) {
	let votes = 0
	let players = "None"

	for (const player in store.deleteVotesData) {
		// Use const or let for player
		if (store.deleteVotesData[player] === true) {
			votes += 1
			if (players === "None") players = String(player)
			else players += ", " + player
		}
	}
	if (returnPlayers) return players
	return votes
}

function localCastVote(topic) {
	IO.castVote(topic)
}



</script>

<template>
	<!-- BUG REPORT -->
	<transition name="slideBug">
		<div id="bugReport" v-if="store.topMenuViews.showBug">
			<h1>Bug Report</h1>
			<template v-if="store.topMenuViews.bugErrorText !== ''">
				<h2 id="bugErrorText" v-html="store.topMenuViews.bugErrorText"></h2>
			</template>
			<template v-if="store.topMenuViews.bugSuccessText !== ''">
				<h2 id="bugSuccessText" v-html="store.topMenuViews.bugSuccessText"></h2>
			</template>
			<p>
				Please submit a bug report if you encounter any issues, giving as much detail as possbile.
				<br />
				The game data will be submitted along with your report.
				<br />
				You can also report it on the OBG discord. Click
				<a href="https://discord.gg/hCU7Fr77yV" class="linkOther" target="_blank">Here</a>
				to join
			</p>

			<div>
				<textarea cols="150" rows="10" name="bugContent" id="bugContent" v-model="bugReportText"></textarea>
			</div>
			<div>
				<button class="actionsLineButton" id="submitBug" @click="submitBug" :disabled="submittingBug">
					<span v-if="submittingBug">Submitting Bug Report...</span>
					<span v-else>Submit</span>
				</button>
				<button id="resetBug" class="actionsLineButton" @click="toggleBug">Cancel</button>
			</div>
		</div>
	</transition>

	<!-- NOTES -->
	<transition name="slideNotes">
		<div id="notesBox" v-if="store.topMenuViews.showNotes">
			<h2>Personal game notes</h2>
			<p>Only you can see these notes</p>
			<div><textarea cols="120" rows="10" id="notes" v-model="personal.notes" maxlength="5000"></textarea></div>
			<div>
				<button id="submitNotes" class="actionsLineButton" @click="IO.saveNotes">Save</button>
				<button id="clearNotes" class="actionsLineButton" @click="clearNotes">Clear</button>
				<button id="closeNotes" class="actionsLineButton" @click="toggleNotes">Close</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<transition name="fade">
		<div id="wholeChat" v-if="store.topMenuViews.showChat">
			<div id="chatBox">
				<h2>Send a message</h2>
				<div>
					<textarea rows="6" name="chatMessage" id="chatMessage" v-model="chatMessage"></textarea>
				</div>
				<div><button class="actionsLineButton" @click="sendChatMessage()">Send</button></div>
			</div>
			<div id="messageList">
				<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
					<div class="header">
						<span class="bold">{{ message[0] }}</span>
						<span class="date">
							{{ funcs.timestampToString((personal.gameCreationTimestamp + message[1]) * 1000) }}
						</span>
					</div>
					<div class="messageBody">{{ parseMessage(message[2]) }}</div>
				</div>
			</div>
		</div>
	</transition>

	<!-- REWIND PANEL -->
	<transition name="fade">
		<div id="rewindPanel" v-if="store.topMenuViews.showRewindPanel" :style="{
			left: getRewindPanelLeft() + 'px',
		}">
			Any player can rewind the game at any time.
			<br />
			Please be courteous and rewind only if absolutely necessary - send a chat message to inform the other
			players.
			<br />
			Misuse of this feature will result in rewinds requiring permission from all players.

			<br />
			<br />

			<span class="topMenuItem" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" />
				<span>Rewind</span>
			</span>
			<hr />
			<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				If all players agree, this game can be excluded from the stats (won't count towards wins/losses)
				<br />
				Votes: {{ getStatsExcludeVotes(false) }} - Players: {{ getStatsExcludeVotes(true) }}
				<br />
				<button v-if="!personal.votedToExclude" class="actionsLineButton"
					@click="localCastVote(rf.STATS_EXCLUDE_VOTE_TOPIC)">Vote to
					Exclude
					Game from Stats</button>
			</div>
			<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				If all players agree, this game will be deleted
				<br />
				Votes: {{ getDeleteVotes(false) }} - Players: {{ getDeleteVotes(true) }}
				<br />
				<button v-if="!personal.votedToDelete" class="actionsLineButton"
					@click="localCastVote(rf.DELETE_VOTE_TOPIC)">Vote to
					Delete
					Game</button>
			</div>
		</div>
	</transition>

	<!-- RESERVE -->
	<transition name="slideRes">
		<div id="reserve" v-if="store.topMenuViews.showReserve">
			<!-- DRAW PILE -->
			<h2>Possible Tiles in Draw Pile</h2>
			<b>NOTE: These include the unseen hex discards</b>
			<br />
			<div v-for="(hexRefArr, idx) in getPossibleDrawHexRefs()" :key="idx" class="singleHexDiv">
				<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
					<defs>
						<pattern :id="'discardSeenHexPattern' + String(hexRefArr[0])" height="100%" width="100%"
							patternContentUnits="objectBoundingBox">
							<image height="1" width="1" preserveAspectRatio="none"
								:xlink:href="view.getImage('hex' + String(hexRefArr[0]))" />
						</pattern>

						<filter id="whiteOutlineEffect" color-interpolation-filters="sRGB">
							<feMorphology in="SourceAlpha" result="MORPH" operator="dilate" radius="20" />
							<feColorMatrix in="MORPH" result="WHITENED" type="matrix"
								values="-1 0 0 0 1, 0 -1 0 0 1, 0 0 -1 0 1, 0 0 0 1 0" />
							<feMerge>
								<feMergeNode in="WHITENED" />
								<feMergeNode in="SourceGraphic" />
							</feMerge>
						</filter>
					</defs>

					<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
						:fill="`url(#discardSeenHexPattern${hexRefArr[0]})`" stroke="black" />
					<text v-if="hexRefArr.length > 1" x="0" y="0" dominant-baseline="middle" text-anchor="middle"
						fill="black" font-size="24" filter="url(#whiteOutlineEffect)">
						{{ hexRefArr.length }}
					</text>
				</svg>
			</div>

			<!-- Discard Piile-->
			<h2>Seen Tiles in Discard Pile</h2>
			<div v-if="getDiscardedHexRefs().length == 0">
				<b>No Discarded Hexes</b>
			</div>
			<div v-else>
				<div v-for="(hexRefArr, idx) in getDiscardedHexRefs().slice(0, -1)" :key="idx" class="singleHexDiv">
					<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
						<defs>
							<pattern :id="'discardSeenHexPattern' + String(hexRefArr[0])" height="100%" width="100%"
								patternContentUnits="objectBoundingBox">
								<image height="1" width="1" preserveAspectRatio="none"
									:xlink:href="view.getImage('hex' + String(hexRefArr[0]))" />
							</pattern>
							<pattern v-for="(num, index) in rf.INITIAL_DRAW_PILE_4P" :key="index" :id="'pattern' + num"
								height="100%" width="100%" patternContentUnits="objectBoundingBox">
								<image height="1" width="1" preserveAspectRatio="none"
									:xlink:href="view.getImage('hex' + String(num))" />
							</pattern>
						</defs>

						<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
							:fill="`url(#discardSeenHexPattern${hexRefArr[0]})`" stroke="black"
							:class="{ lightGreen: store.context.hexRefBeingAdded === hexRefArr[0] }" />
					</svg>
				</div>

				<!-- UNSEEN DISCARD NUMBER -->
				<div class="singleHexDiv" v-if="getDiscardedHexRefs().slice(-1)[0] > 0">
					<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
						<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500" fill="none" stroke="black" />
						<text x="0" y="0" text-anchor="middle" dominant-baseline="central">
							{{ getDiscardedHexRefs().slice(-1)[0] }}
						</text>
					</svg>
				</div>
			</div>

			<!-- RESOURCE CONVERSION -->
			<h2>Resource Conversion</h2>
			<div id="resourceConversionDiv">
				<div class="resourceConversionCol">
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_PEOPLE))" />
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_PEOPLE))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_PROD_CIGAR_A})`" stroke="black" />
							</svg>
						</div>
						<img :src="view.getImage('cigar_u')" id="cigarImage" />
					</div>
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_CHIP))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_PROD_COMPUTER_A})`" stroke="black" />
							</svg>
						</div>
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_COMPUTER))" />
					</div>
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_BEER))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_FILM_CRITIC})`" stroke="black" />
							</svg>
						</div>
						<img :src="view.getImage('res' + String(rf.RES_FILM_CRITIC))" id="cigarImage" />
					</div>
				</div>
				<div class="resourceConversionCol">
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_PEOPLE))" />
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_PEOPLE))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_PROD_ACTRESS_A})`" stroke="black" />
							</svg>
						</div>
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_ACTRESS))" />
					</div>
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_COMPUTER))" />
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_COMPUTER))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_PROD_SFX_A})`" stroke="black" />
							</svg>
						</div>
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_SFX))" />
					</div>
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_COMPUTER))" />
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_BEER))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_PROD_SCRIPT_A})`" stroke="black" />
							</svg>
						</div>
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_SCRIPT))" />
					</div>
				</div>
				<div class="resourceConversionCol">
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_ACTRESS))" />
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_SFX))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_PROD_MOVIE_ACTION})`" stroke="black" />
							</svg>
						</div>
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_MOVIE_ACTION))" />
					</div>
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_ACTRESS))" />
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_SCRIPT))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_PROD_MOVIE_GIRLIE})`" stroke="black" />
							</svg>
						</div>
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_MOVIE_GIRLIE))" />
					</div>
					<div class="singleConversionDiv">
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_SFX))" />
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_SCRIPT))" />
						<div class="singleHexDiv">
							<svg class="singleHexSVG" xmlns="http://www.w3.org/2000/svg" viewBox="-515 -515 1015 1015">
								<polygon points="433,250 433,-250 0,-500 -433,-250 -433,250 0,500"
									:fill="`url(#pattern${rf.HEX_PROD_MOVIE_SCIFI})`" stroke="black" />
							</svg>
						</div>
						<img class="resImg" :src="view.getImage('res' + String(rf.RES_MOVIE_SCIFI))" />
					</div>
				</div>
			</div>

			<!-- FLEXI-TIMES -->
			<div id="timesDiv">
				Flexi-Times:
				<span v-for="(player, idx) in store.players" :key="idx">{{ player.displayName }}: {{
					getFlexiTimeString(player.name) }}&nbsp;&nbsp;&nbsp;</span>
				&nbsp;&nbsp;&nbsp;
			</div>
		</div>
	</transition>
</template>

<style scoped>
#resourceConversionDiv {
	min-width: 1000px;
	display: flex;
	justify-content: center;
	align-items: center;
}

.resourceConversionCol {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100%;
}

.singleConversionDiv {
	border: 2px solid black;
	width: fit-content;
	padding: 5px;
	margin: 5px;
}

.resImg {
	vertical-align: middle;
	border: 2px solid black;
	height: 60px;
	width: 60px;
	margin-left: 2px;
}

#cigarImage {
	width: 72px;
	vertical-align: middle;
}

.singleHexDiv {
	position: relative;
	display: inline-block;
	margin: 0px;
	font-size: 0;
	/* Set font size to 0 to remove any additional vertical space */
	line-height: 1;
	/* Set line-height to 1 to prevent extra spacing */
	vertical-align: middle;
}

.singleHexDiv text {
	font-size: 500px;
	/* Set the desired font size for the text */
}

.singleHexSVG {
	width: 100px;
	margin: 0px;
}

.singleHexSVG polygon {
	stroke: black;
	stroke-width: 30px;
}

#timesDiv {
	margin-top: 20px;
	margin-bottom: 4px;
}

#reserve {
	border: 2px solid black;
	background-color: lightblue;
	min-width: 1000px;
}

.slideRes-enter-active,
.slideRes-leave-active {
	transition: all 0.2s ease-in-out;
	height: 750px;
	overflow: hidden;
}

.slideRes-enter-from,
.slideRes-leave-to {
	opacity: 0;
	height: 0px;
}

#bugErrorText {
	width: 100%;
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#bugSuccessText {
	color: darkgreen;
	background-color: lightblue;
}

.slideNotes-enter-active,
.slideNotes-leave-active {
	transition: all 0.2s ease-in-out;
	height: 264px;
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
	text-align: center;
	margin-bottom: 10px;
}

#wholeChat {
	position: absolute;
	left: 2px;
	top: 62px;
	width: 450px;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	overflow-y: scroll;
	padding-bottom: 10px;
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
	font-size: 18px;
	z-index: 10000;
	color: white;
}

.topMenuItem {
	display: inline-block;
	width: 62px;
	height: 55px;
	border: #eee;
	border-radius: 5px;

	cursor: pointer;
	text-align: center;
}

.topMenuItem:hover {
	color: lightblue;
}

.topMenuItem:hover img {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
}

.topMenuItem img {
	width: 38x;
	height: 38px;
}

.topMenuItem span {
	font-size: 14px;
	font-weight: bold;
	display: block;
}

.topMenuItem.highlighted {
	color: #ff9900;
}
</style>
