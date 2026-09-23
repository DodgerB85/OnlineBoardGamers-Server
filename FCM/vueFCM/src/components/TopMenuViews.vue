<script setup>
/** Tabs and items that come off the TopMenu
 *  EG bug report, notes, chat, reserve
 *
 *
 *
 */
import * as IO from "../backend/FCM_IO"
import * as funcs from "../js/FCMfuncs"
import * as view from "../js/FCMview"
import * as rf from "../js/FCMreference"
import * as rules from "../js/FCMrules.js"

import { ref, computed } from "vue"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

import InfoPopup from "./utils/InfoPopup.vue"

const chatMessage = ref("")
const bugReportText = ref("")
const submittingBug = ref(false)
const showExpandedMS = ref(false)
const showExpandedEmployees = ref(false)
const consentLevel = ref(0)

function milestoneHCclass(ms) {
	if (store.startingOptions.hardChoices) {
		if (rf.HC_OLD_MS_LEAVE_END_TURN_2.includes(ms)) return "milestoneHC2span"
		if (rf.HC_OLD_MS_LEAVE_END_TURN_3.includes(ms)) return "milestoneHC3span"
	} else if (store.startingOptions.newMilestones && rf.HC_NEW_MS_LEAVE_END_TURN_2.includes(ms)) {
		return "milestoneHC2span"
	}
	return ""
}

// Taken milestones: [milestoneId, playerColor1, ...] or [milestoneId] for expired HC
const takenMilestones = computed(() => {
	const taken = []
	for (const player of store.players) {
		for (const ms of player.milestones) {
			if (store.availableMilestones.includes(ms)) continue
			const existing = taken.find((t) => t[0] === ms)
			if (existing) {
				existing.push(player.colour)
			} else {
				taken.push([ms, player.colour])
			}
		}
	}

	// Add expired HC milestones not claimed by any player
	if (store.startingOptions.newMilestones && store.gameflow.turn >= 3) {
		for (const ms of [rf.FIRST_MARKETEER_USED, rf.FIRST_RECRUITING_GIRL_USED, rf.FIRST_TRAINER_USED]) {
			if (!taken.some((t) => t[0] === ms)) taken.push([ms])
		}
	} else if (store.startingOptions.hardChoices && store.gameflow.turn >= 3) {
		const hc2 = [rf.FIRST_TRAIN, rf.FIRST_BURGER_MARKETED, rf.FIRST_PIZZA_MARKETED, rf.FIRST_DRINK_MARKETED]
		for (const ms of hc2) {
			if (!taken.some((t) => t[0] === ms)) taken.push([ms])
		}
		if (store.gameflow.turn >= 4 && !taken.some((t) => t[0] === rf.FIRST_HIRE_3)) {
			taken.push([rf.FIRST_HIRE_3])
		}
	}

	return taken
})

// Returns the HC icon image for expired milestones with no player, or null
function takenMilestoneHCimg(ms) {
	const hasPlayer = store.players.some((p) => p.milestones.includes(ms))
	if (hasPlayer) return null

	if (store.startingOptions.hardChoices) {
		if (rf.HC_OLD_MS_LEAVE_END_TURN_3.includes(ms)) return "hardChoice3_icon"
		if (rf.HC_OLD_MS_LEAVE_END_TURN_2.includes(ms)) return "hardChoice2_icon"
	} else if (store.startingOptions.newMilestones) {
		if (rf.HC_NEW_MS_LEAVE_END_TURN_2.includes(ms)) return "hardChoice2_icon"
	}
	return null
}

// Milestones about to leave on the current turn (for "leaving" styling)
const aboutToLeave = computed(() => {
	const leave = store.players.flatMap((p) => p.milestones)
	if (store.startingOptions.hardChoices) {
		if (store.gameflow.turn === 2) leave.push(...rf.HC_OLD_MS_LEAVE_END_TURN_2)
		if (store.gameflow.turn === 3) leave.push(...rf.HC_OLD_MS_LEAVE_END_TURN_3)
	} else if (store.startingOptions.newMilestones && store.gameflow.turn === 2) {
		leave.push(...rf.HC_NEW_MS_LEAVE_END_TURN_2)
	}
	return [...new Set(leave)]
})

// Get player colours who have a given milestone
function milestonePlayerColours(ms) {
	return store.players.filter((p) => p.milestones.includes(ms)).map((p) => p.colour)
}

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
	store.viewSettings.showNoteHexIDs = false
}
function parseMessage(message) {
	message = message.replace(/SNLB/g, "\n")
	return message
}

function sendChatMessage() {
	if (chatMessage.value === "") return
	// You will always have chat data, as the welcome message will be in there.
	// New entries are added at the start, and store.chatData has the full TS
	// Therefore, just subtract the time at entry 0 to get the new delta
	let time = Math.round(new Date().getTime() / 1000 - store.chatData[0][1])
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
		IO.loadUnlockedRewind()
	}, 500)
}

function loadHostRewind() {
	if (store.viewSettings.performingRewind) return
	store.viewSettings.performingRewind = true
	setTimeout(function () {
		store.viewSettings.showRewindPanel = false
		IO.loadRewind()
	}, 500)
}

function submitRewindConsent() {
	IO.submitRewindConsent(consentLevel.value)
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
	const bugSubmitted = await IO.submitBug(bugReportText.value)
	if (bugSubmitted) bugReportText.value = ""
	submittingBug.value = false
}

function getRewindPanelLeft() {
	return document.getElementById("menuButtonRewindPos").getBoundingClientRect().left + document.getElementById("menuButtonRewindPos").getBoundingClientRect().width / 2 - 200
}

// Shared vote tally: votes cast and comma-joined voter names (stats-exclude / delete-game votes)
function getVoteCounts(data, returnPlayers = false) {
	let votes = 0
	let players = "None"
	for (const player in data) {
		if (data[player] === true) {
			votes += 1
			players = players === "None" ? String(player) : players + ", " + player
		}
	}
	return returnPlayers ? players : votes
}

// Count of each road/park variety still available
function getTypeCounts(items) {
	const counts = []
	for (const type of [0, 1, 2]) {
		if (items.includes(type)) counts.push({ type, count: items.filter((x) => x === type).length })
	}
	return counts
}

function getParkCounts() {
	return getTypeCounts(rules.availableParks(store))
}

function getRoadCounts() {
	return getTypeCounts(rules.availableNewRoads(store))
}

const computedEmployeeArrangementForDisplay = computed(() => {
	let employeeArrangement = structuredClone(rf.EMPLOYEE_ARRANGEMENT)

	// If you have jazz musicians, but no movie star B, then combine them onto one line
	if (store.availableEmployees[rf.B_MOVIE_STAR] < 0 && store.availableEmployees[rf.JAZZ_MUSICIAN] >= 0) {
		employeeArrangement[56] = rf.JAZZ_MUSICIAN
		employeeArrangement[71] = -1
	}

	// Remove from the general display any employee not in the game
	for (let i = 0; i < employeeArrangement.length; i++) {
		if (employeeArrangement[i] > -1 && store.availableEmployees[employeeArrangement[i]] === -1) {
			employeeArrangement[i] = -1
		}
	}
	// Now remove groups of 5x -1's in a row
	for (let i = employeeArrangement.length - 5; i >= 0; i -= 5) {
		// Check the slice of 5 elements starting at this index
		const chunk = employeeArrangement.slice(i, i + 5)

		// If every item in this specific chunk is -1
		if (chunk.every((val) => val === -1)) {
			employeeArrangement.splice(i, 5)
		}
	}

	// Group into subArrs of length 5
	const groupedArrangement = []
	for (let i = 0; i < employeeArrangement.length; i += 5) {
		groupedArrangement.push(employeeArrangement.slice(i, i + 5))
	}

	return groupedArrangement
})

/*** EMPLOYEE SVG  */
const horizontalShift = 160
const verticalShift = 190
const initialLeft = 80
const initialTop = 165

const svgInstructions = computed(() => {
	const lines = []
	const actualArr = computedEmployeeArrangementForDisplay.value.flat().filter((id) => id > -1)

	let currentTop = initialTop + verticalShift
	let currentLeft = initialLeft

	// Helper to push lines to the array
	const addLine = (x1, y1, x2, y2) => lines.push({ type: "line", x1, y1, x2, y2 })

	// --- ROW 2: MANAGERS ---
	addLine(initialLeft, currentTop, initialLeft + horizontalShift * 4, currentTop)

	lines.push(generatePath(initialLeft, currentTop, 1, 1)) // NBD
	lines.push(generatePath(initialLeft, currentTop, -1, 3)) // Lux Mgr

	currentLeft += horizontalShift // VP
	lines.push(generatePath(currentLeft, currentTop, 1, 1))
	lines.push(generatePath(currentLeft, currentTop, -1, 1))
	lines.push(generatePath(currentLeft, currentTop, -1, 2))
	lines.push(generatePath(currentLeft, currentTop, -1, 3))

	currentLeft += horizontalShift // SVP
	lines.push(generatePath(currentLeft, currentTop, 1, 1))
	lines.push(generatePath(currentLeft, currentTop, -1, 2))

	currentLeft += horizontalShift // HR
	lines.push(generatePath(currentLeft, currentTop, 1, 1))
	lines.push(generatePath(currentLeft, currentTop, -1, 1))

	// --- MARKETERS ---
	currentTop += verticalShift * 4
	currentLeft = initialLeft
	addLine(currentLeft, currentTop, currentLeft + horizontalShift * 3, currentTop)

	const extraMarketers = actualArr.filter((id) => [rf.MASS_MARKETEER, rf.RURAL_MARKETEER, rf.GOURMET_FOOD_CRITIC, rf.HAWKER_MARKETEER].includes(id)).length

	for (let i = 0; i < extraMarketers; i++) {
		lines.push(generatePath(currentLeft, currentTop, -1, i + 1))
	}

	// --- ERRAND BOYS ---
	currentTop += verticalShift * (extraMarketers + 1)
	currentLeft = initialLeft
	addLine(initialLeft, currentTop, initialLeft + horizontalShift * 3, currentTop)

	// --- WAITRESS / MOVIE STARS ---
	currentTop += verticalShift
	currentLeft = initialLeft

	if (actualArr.includes(rf.B_MOVIE_STAR) || actualArr.includes(rf.JAZZ_MUSICIAN)) {
		addLine(currentLeft, currentTop, currentLeft + horizontalShift, currentTop)
	}

	if (actualArr.includes(rf.C_MOVIE_STAR)) lines.push(generatePath(currentLeft, currentTop, -1, 1))
	if (actualArr.includes(rf.D_MOVIE_STAR)) lines.push(generatePath(currentLeft, currentTop, -1, 2))

	if (actualArr.includes(rf.JAZZ_MUSICIAN) && actualArr.includes(rf.B_MOVIE_STAR)) {
		let downShift = 1
		if (actualArr.includes(rf.C_MOVIE_STAR)) downShift++
		if (actualArr.includes(rf.D_MOVIE_STAR)) downShift++
		lines.push(generatePath(currentLeft, currentTop, -1, downShift))
	}

	// --- DYNAMIC VERTICAL SHIFTS ---
	currentTop += verticalShift
	if (actualArr.includes(rf.C_MOVIE_STAR)) currentTop += verticalShift
	if (actualArr.includes(rf.D_MOVIE_STAR)) currentTop += verticalShift
	if (actualArr.includes(rf.DELIVERY_DRIVER)) currentTop += verticalShift
	if (actualArr.includes(rf.LOBBYIST)) currentTop += verticalShift

	// --- COOKS / CHEFS ---
	addLine(currentLeft, currentTop, currentLeft + horizontalShift * 2, currentTop)
	lines.push(generatePath(currentLeft, currentTop, -1, 1)) // P Cook

	const extraCooks = actualArr.filter((id) => [rf.SUSHI_COOK, rf.NOODLE_COOK, rf.DUMPLING_COOK].includes(id)).length

	for (let i = 0; i < extraCooks; i++) {
		lines.push(generatePath(currentLeft, currentTop, -1, i + 2))
	}

	if (actualArr.includes(rf.FRY_CHEF)) {
		lines.push(generatePath(currentLeft + horizontalShift, currentTop, -1, 2 + extraCooks))
	}

	// --- PRODUCTION LINE ---
	currentTop += verticalShift
	currentLeft = initialLeft
	addLine(currentLeft + horizontalShift, currentTop, currentLeft + horizontalShift * 2, currentTop)

	for (let i = 0; i < extraCooks; i++) {
		currentTop += verticalShift
		addLine(currentLeft + horizontalShift, currentTop, currentLeft + horizontalShift * 2, currentTop)
	}

	// --- FINAL SHIFTS ---
	if (actualArr.includes(rf.FRY_CHEF)) currentTop += verticalShift
	if (actualArr.includes(rf.KIMCHI_MASTER)) currentTop += verticalShift
	if (actualArr.includes(rf.BARISTA_TRAINEE)) {
		currentTop += verticalShift
		currentLeft = initialLeft
		addLine(currentLeft, currentTop, currentLeft + horizontalShift * 2, currentTop)
	}

	return lines
})

function generatePath(x, y, dir, rows) {
	const h = horizontalShift / 2
	const v = -dir * (verticalShift * rows)
	return { type: "path", d: `M ${x} ${y} h ${h} v ${v} h ${h}` }
}

/*** END SVG */

const sortedCampaigns = computed(() => {
	// We spread into a new array so we don't mutate the store directly
	return [...store.availableMarketingCampaigns].sort((a, b) => a - b)
})
</script>

<template>
	<!-- BUG REPORT -->
	<transition name="slideBug">
		<div id="bugReport" v-if="store.viewSettings.showBug">
			<h1>Bug Report</h1>
			<template v-if="store.gameMessages.bugErrorText !== ''">
				<h2 id="bugErrorText" v-html="store.gameMessages.bugErrorText"></h2>
			</template>
			<template v-if="store.gameMessages.bugSuccessText !== ''">
				<h2 id="bugSuccessText" v-html="store.gameMessages.bugSuccessText"></h2>
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

			<p><b>Do you think there are too many 1x Luxury Managers? Please note that COFFEE, KIMCHI, SUSHI, and NOODLES add one extra</b></p>
			<p><b>Please note: Cart / Truck drivers can drive around a 'roundabout' on the same tile as many times as they like. Drinks will only be collected once</b></p>
			<p><b>Please note: In New MS you need to actually USE an employee to get their Milestone</b></p>

			<div v-if="store.startingOptions.coffee" id="coffeeBugDiv">
				<b>Is your bug to do with coffee?</b>
				<br />
				<br />
				Please first read the
				<a href="/FCM/coffeeHelp/" target="_blank">coffee help page</a>
				.
				<br />
				Please also make sure you fully understand the coffee rules and example in the official rules, found
				<a href="https://www.boardgamehelpers.com/FoodChainMagnate/Images/FCM_ketchup_Regels_Eng_web.pdf" target="_blank">here</a>
				<br />
				<br />
				If you still think there is a bug, please check carefully:
				<ul>
					<li>Which players had coffee and how much</li>
					<li>If you think a route has not been considered, could it sell the same amount of coffee as the route chosen?</li>
					<li>Remmeber that any part of the coffee route that could have multiple paths each selling the same amount of coffee (even if it's to the same player) will be skipped</li>
				</ul>
				If you still think there is a problem, please submit a bug report
				<br />
			</div>

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
			<div><textarea cols="120" rows="10" id="notes" v-model="personal.notes" maxlength="5000"></textarea></div>
			<div>
				<button class="actionsLineButton" @click="IO.saveNotes">Save</button>
				<button class="actionsLineButton" @click="clearNotes">Clear</button>
				<button class="actionsLineButton" @click="toggleNotes">Close</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<transition name="fade">
		<div id="wholeChat" v-if="store.viewSettings.showChat">
			<div id="chatBox">
				<h2>Send a message</h2>
				<div><textarea rows="6" name="chatMessage" id="chatMessage" v-model="chatMessage"></textarea></div>
				<div><button class="actionsLineButton" @click="sendChatMessage()">Send</button></div>
			</div>
			<div id="messageList">
				<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
					<div class="header">
						<span class="bold">{{ message[0] }}</span>
						<span class="date">
							{{ funcs.timestampToString(message[1]) }}
						</span>
					</div>
					<div class="messageBody">{{ parseMessage(message[2]) }}</div>
				</div>
			</div>
		</div>
	</transition>

	<!-- REWIND PANEL -->
	<transition name="fade">
		<div
			id="rewindPanel"
			v-if="store.viewSettings.showRewindPanel"
			:style="{
				left: getRewindPanelLeft() + 'px',
			}">
			<!-- NON-HOST PANEL (panelType == 1) -->
			<template v-if="store.viewSettings.rewindPanelType === 1">
				<b><u>Trial Feature</u></b>
				<br />
				Anyone may rewind the game at any point EXCEPT during turn order, and the first person working 9-5.
				<br />
				This is because the most important hidden information is during restructuring.
				<br />
				<br />
				<span class="topMenuItem" @click="loadRewind()">
					<img :src="view.getImage('icon-rewind')" />
					<span>Rewind</span>
				</span>
				<hr />
				You can give permission for the host to rewind the game back to the start of the restructuring phase.
				All players must give permission before the host is able to rewind the game.
				<br />
				<br />
				<label>
					<input type="radio" :value="1" v-model="consentLevel" :disabled="personal.currentRewindConsent === 2" />
					Permission up to last Restructuring
				</label>
				<br />
				<label>
					<input type="radio" :value="2" v-model="consentLevel" :disabled="personal.currentRewindConsent === 2" />
					Permanent Permission
				</label>
				<br />
				<button v-if="personal.currentRewindConsent !== 2" class="actionsLineButton" @click="submitRewindConsent()">Give Permission</button>
			</template>

			<!-- HOST PANEL (panelType == 2) -->
			<template v-else-if="store.viewSettings.rewindPanelType === 2">
				<b><u>Trial Feature</u></b>
				<br />
				Anyone may rewind the game at any point EXCEPT during turn order, and the first person working 9-5.
				<br />
				This is because the most important hidden information is during restructuring.
				<br />
				<br />
				<span class="topMenuItem" @click="loadRewind()">
					<img :src="view.getImage('icon-rewind')" />
					<span>Rewind</span>
				</span>
				<hr />
				As the game host, you must wait for all players to give permission.
				They can allow you to rewind once, or as much as you like.
				Try asking in chat for permission if you wish to rewind.
				Current Permissions:
				<br />
				<br />
				<div v-html="store.viewSettings.rewindHostHTML"></div>
				<br />
				<span v-if="store.viewSettings.rewindHostPossible" class="topMenuItem" @click="loadHostRewind()">
					<img :src="view.getImage('icon-rewind')" />
					<span>Rewind</span>
				</span>
				<span v-else>Please wait for all players to give permission</span>
			</template>

			<hr />
			<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				If all players agree, this game can be excluded from the stats (won't count towards wins/losses)
				<br />
 Votes: {{ getVoteCounts(store.statsExcludeVotesData, false) }} - Players: {{ getVoteCounts(store.statsExcludeVotesData, true) }}
				<br />
				<button v-if="!personal.votedToExclude" class="actionsLineButton" @click="IO.castVote(rf.STATS_EXCLUDE_VOTE_TOPIC)">Vote to Exclude Game from Stats</button>
			</div>
			<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				If all players agree, this game will be deleted
				<br />
 Votes: {{ getVoteCounts(store.deleteVotesData, false) }} - Players: {{ getVoteCounts(store.deleteVotesData, true) }}
				<br />
				<button v-if="!personal.votedToDelete" class="actionsLineButton" @click="IO.castVote(rf.DELETE_VOTE_TOPIC)">Vote to Delete Game</button>
			</div>
		</div>
	</transition>

	<!-- RESERVE -->
	<transition name="slideRes">
		<div id="reserveDiv" v-if="store.viewSettings.showReserve">
			<h2 id="reserveTitle">Reserve</h2>
			<!-- SELECTED MODULES -->
			<template v-if="store.startingOptionsHTML !== ''">
				<h3><b>Selected Modules</b></h3>
				<div class="selectedModules" v-html="store.startingOptionsHTML"></div>
			</template>

			<!-- HARD CHOICES ICONS -->
			<div v-if="store.startingOptions.hardChoices && store.gameflow.turn < 4" class="hardChoicesIcons">
				<img :src="view.getImage('hardChoice2_icon')" class="hc-icon" title="The Red Border MS are removed after turn 2" />
				<img :src="view.getImage('hardChoice3_icon')" class="hc-icon" title="First to Hire 3 MS removed after turn 3" />
			</div>
			<div v-else-if="store.startingOptions.newMilestones && store.gameflow.turn < 3" class="hardChoicesIcons">
				<img :src="view.getImage('hardChoice2_icon')" class="hc-icon" title="The Red Border MS are removed after turn 2" />
			</div>

			<!-- MILESTONES -->
			<div class="milestonesHolderDiv" v-if="store.startingOptions.useMilestones">
				<p>
					Current Milestones:
					<button class="actionsLineButton" @click="showExpandedMS = !showExpandedMS">
						{{ showExpandedMS ? "Collapse Milestones &#9650;" : "Expand Milestones &#9660;" }}
					</button>
				</p>
				<template v-if="store.availableMilestones.length > 0">
				<template v-if="showExpandedMS">
					<span class="fullMilestoneSpan" :class="[rf.MILESTONES_STR[ms].type, milestoneHCclass(ms), { compactMilestoneLeavingSpan: aboutToLeave.includes(ms) }]" v-for="(ms, idx) in store.availableMilestones" :key="idx">
						<div class="milestoneTitle">{{ rf.MILESTONES_STR[ms].title.toUpperCase() }}</div>
						<div class="milestoneText">{{ rf.MILESTONES_STR[ms].description }}</div>
						<div class="milestoneSpacer">&nbsp;</div>
						<img class="milestoneIcon" :src="view.getImage(rf.MILESTONES_STR[ms].img)" :class="rf.MILESTONES_STR[ms].additionalClass ? rf.MILESTONES_STR[ms].additionalClass : ''" />
						<br v-if="milestonePlayerColours(ms).length > 0" />
						<template v-for="(colour, i) in milestonePlayerColours(ms)" :key="i">
							<img :src="view.getImage('player_' + personal.getCorrectedColour(colour))" style="width:30px;height:30px;padding-left:5px;" />
						</template>
					</span>
				</template>
				<template v-else>
					<InfoPopup v-for="(ms, idx) in store.availableMilestones" :key="idx" type="milestone" :milestoneId="ms">
						<span class="compactMilestoneSpan" :class="[rf.MILESTONES_STR[ms].type, milestoneHCclass(ms), { compactMilestoneLeavingSpan: aboutToLeave.includes(ms) }]">
							{{ rf.MILESTONES_STR[ms].text }}
							<br v-if="milestonePlayerColours(ms).length > 0" />
							<template v-for="(colour, i) in milestonePlayerColours(ms)" :key="i">
								<img :src="view.getImage('player_' + personal.getCorrectedColour(colour))" style="width:30px;height:30px;padding-left:5px;" />
							</template>
						</span>
					</InfoPopup>
				</template>
				</template>
				<p v-else>None Available</p>
				<p>Taken Milestones:</p>
				<template v-if="showExpandedMS">
					<span class="fullMilestoneSpan" :class="[rf.MILESTONES_STR[ms[0]].type, milestoneHCclass(ms[0])]" v-for="(ms, idx) in takenMilestones" :key="idx">
						<div class="milestoneTitle">{{ rf.MILESTONES_STR[ms[0]].title.toUpperCase() }}</div>
						<div class="milestoneText">{{ rf.MILESTONES_STR[ms[0]].description }}</div>
						<div class="milestoneSpacer">&nbsp;</div>
						<img class="milestoneIcon" :src="view.getImage(rf.MILESTONES_STR[ms[0]].img)" :class="rf.MILESTONES_STR[ms[0]].additionalClass ? rf.MILESTONES_STR[ms[0]].additionalClass : ''" />
						<br />
						<template v-for="(colour, i) in ms.slice(1)" :key="i">
							<img :src="view.getImage('player_' + personal.getCorrectedColour(colour))" style="width:30px;height:30px;padding-left:5px;" />
						</template>
						<img v-if="ms.length === 1 && takenMilestoneHCimg(ms[0])" :src="view.getImage(takenMilestoneHCimg(ms[0]))" style="width:30px;height:30px;padding-left:5px;" />
					</span>
				</template>
				<template v-else>
					<InfoPopup v-for="(ms, idx) in takenMilestones" :key="idx" type="milestone" :milestoneId="ms[0]">
						<span class="compactMilestoneSpan" :class="[rf.MILESTONES_STR[ms[0]].type, milestoneHCclass(ms[0])]">
							{{ rf.MILESTONES_STR[ms[0]].text }}
							<br />
							<template v-for="(colour, i) in ms.slice(1)" :key="i">
								<img :src="view.getImage('player_' + personal.getCorrectedColour(colour))" style="width:30px;height:30px;padding-left:5px;" />
							</template>
							<img v-if="ms.length === 1 && takenMilestoneHCimg(ms[0])" :src="view.getImage(takenMilestoneHCimg(ms[0]))" style="width:30px;height:30px;padding-left:5px;" />
						</span>
					</InfoPopup>
				</template>
			</div>

			<!-- EMPLOYEES -->
			<div
				class="employeesHolderDiv"
				:style="{
					width: showExpandedEmployees ? '800px' : 'auto',
				}">
				<p>
					Employees:
					<button class="actionsLineButton" @click="showExpandedEmployees = !showExpandedEmployees">
						{{ showExpandedEmployees ? "Collapse Employees &#9650;" : "Expand Employees &#9660;" }}
					</button>
				</p>
				<template v-if="showExpandedEmployees">
					<svg class="svgBackground">
						<g v-for="(instr, idx) in svgInstructions" :key="idx">
							<!-- Draw simple lines -->
							<line v-if="instr.type === 'line'" :x1="instr.x1" :y1="instr.y1" :x2="instr.x2" :y2="instr.y2" stroke="black" stroke-width="2" />

							<!-- Draw complex paths (the "up" lines) -->
							<path v-else-if="instr.type === 'path'" :d="instr.d" stroke="black" fill="none" stroke-width="2" />
						</g>
					</svg>
					<template v-for="(line, idx1) in computedEmployeeArrangementForDisplay" :key="idx1">
						<div class="employeeLine">
							<template v-for="(emp, idx2) in line" :key="idx2">
								<div v-if="emp > -1" class="expandedEmployeeAreaDiv">
									<div class="expandedEmployeeAmountDiv">
										<span>{{ store.availableEmployees[emp] }}</span>
									</div>
									<div class="expandedEmployeeDiv">
										<h3 class="expandedEmployeeTitle" :class="[rf.EMPLOYEES_STR[emp].type, { inverted: rf.EMPLOYEES_STR[emp].type === 'manager' || rf.EMPLOYEES_STR[emp].type === 'restaurant' }]">
											{{ rf.EMPLOYEES_STR[emp].title }}
										</h3>

										<div class="employeeDescriptionDiv">{{ rf.EMPLOYEES_STR[emp].description }}</div>

										<div class="employeeIconsDiv">
											<img v-if="rf.UNIQUE_CARDS.indexOf(emp) > -1" :src="view.getImage('icon1x')" class="iconsImg" />
											<img v-else-if="rf.HIREABLE_EMPLOYEES.indexOf(emp) > -1" :src="view.getImage('iconRecruit')" class="iconsImg" />
											<span v-else class="blankIcon">&nbsp;</span>
											<img v-if="rf.getRangeForEmployee(emp) === 8" :src="view.getImage('iconRangeInfinite')" class="iconsImg iconMiddle" />
											<img v-else-if="rf.getRangeForEmployee(emp) >= 1" :src="view.getImage('iconRange' + rf.getRangeForEmployee(emp))" class="iconsImg iconMiddle" :class="{ fixedHeight: rf.getRangeType(emp) === 'road' }" />
											<span v-else class="blankIcon iconMiddle">&nbsp;</span>
											<img v-if="rf.REQUIRE_SALARY.indexOf(emp) > -1" :src="view.getImage('iconSalary')" class="iconsImg" />
											<span v-else class="blankIcon">&nbsp;</span>
										</div>
									</div>
								</div>
								<div v-else class="emptyEmployeeDiv"></div>
							</template>
						</div>
					</template>
				</template>
			<template v-else>
				<template v-for="(line, idx1) in computedEmployeeArrangementForDisplay" :key="idx1">
					<template v-for="(emp, idx2) in line" :key="idx2">
						<InfoPopup v-if="emp > -1" type="employee" :employeeId="emp">
							<span class="empSpan" :class="[rf.EMPLOYEES_STR[emp].type, { inverted: rf.EMPLOYEES_STR[emp].type === 'manager' || rf.EMPLOYEES_STR[emp].type === 'restaurant' }, { noMoreEmployees: store.availableEmployees[emp] === 0 }]">{{ rf.EMPLOYEES_STR[emp].title }} ({{ store.availableEmployees[emp] }})</span>
						</InfoPopup>
						<span v-else class="empSpan"></span>
					</template>
					<br />
				</template>
			</template>
			</div>

			<!-- MARKETING CAMPAIGNS -->
			<div class="reserve_campaigns">
				<p><b>Available marketing campaigns</b></p>
				<template v-if="sortedCampaigns.length > 0">
					<div
						v-for="(campaignNum, idx) in sortedCampaigns"
						:key="idx"
						class="campaignDiv"
						:style="{
							width: campaignNum === 4 ? '40px' : rf.MARKETING_CAMPAIGNS[campaignNum].width * 40 + 'px',
							height: campaignNum === 4 ? '80px' : rf.MARKETING_CAMPAIGNS[campaignNum].height * 40 + 'px',
						}">
						<img :src="view.getImage(`campaign_${campaignNum}${campaignNum === 4 ? '-icon' : ''}`)" class="campaignImg" />
					</div>
				</template>
				<template v-else>No Marketing Campaigns</template>
			</div>

			<!-- FREEWAYS -->
			<div v-if="store.startingOptions.ruralMarketers" class="reserve_campaigns">
				<p><b>Available freeways</b></p>
				<span class="parkRoadReserveHolder">
					<img class="centerAlign" :src="view.getImage('freeway')" width="125" />
					<span><b> x {{ 3 - store.freeways.length }}</b></span>
					<span v-if="3 - store.freeways.length !== 0 && !store.availableMilestones.includes(rf.FIRST_RURAL_MARKETEER_USED)"> (but the Milestone is no longer available)</span>
				</span>
			</div>

			<!-- HOUSES & GARDENS -->
			<div v-if="rules.availableHouses().length > 0 || rules.availableGardens() > 0" class="reserveSection">
				<p><b>Available houses & gardens:</b></p>
				<div class="housesContainer">
					<span v-for="houseNum in rules.availableHouses()" :key="'house-' + houseNum" class="houseHolder">
						<span class="reserveHouseSpan">#{{ houseNum }}</span>
					</span>
				</div>
				<p>
					<img class="reserveGardenImage" :src="view.getImage('garden')" />
					<b> x {{ rules.availableGardens() }}</b>
				</p>
			</div>

			<!-- PARKS -->
			<div v-if="rules.availableParks(store).length > 0" class="reserveSection">
				<p><b>Available Parks:</b></p>
				<div class="parksContainer">
					<span v-for="(parkType, index) in getParkCounts()" :key="'park-' + index" class="parkRoadReserveHolder">
						<!-- TODO: Display park image based on type -->
						<span>x {{ parkType.count }}</span>
					</span>
				</div>
			</div>

			<!-- ROADS -->
			<div v-if="rules.availableNewRoads(store).length > 0" class="reserveSection">
				<p><b>Available Roads:</b></p>
				<div class="roadsContainer">
					<span v-for="(roadType, index) in getRoadCounts()" :key="'road-' + index" class="parkRoadReserveHolder">
						<!-- TODO: Display road image based on type -->
						<span>x {{ roadType.count }}</span>
					</span>
				</div>
			</div>

			<!-- LOBBYIST TILES -->
			<div v-if="store.startingOptions && store.startingOptions.lobbyists" class="reserveSection">
				<p><b>Available Tiles for Lobbyist Milestone:</b></p>
				<div id="allTileChoiceDivRes">
					<!-- TODO: Display available lobbyist tiles -->
				</div>
			</div>

			<!-- FLEXI-TIMES -->
			<div id="timesDiv">
				Flexi-Times:
				<span v-for="(player, idx) in store.players" :key="idx">{{ player.displayName }}: {{ getFlexiTimeString(player.name) }}&nbsp;&nbsp;&nbsp;</span>
				&nbsp;&nbsp;&nbsp;
			</div>

			<!-- CLOSE -->
			<div class="reserveCloseButtonDiv">
				<button class="actionsLineButton" @click="store.viewSettings.showReserve = false">Close</button>
			</div>
		</div>
	</transition>
</template>

<style scoped>
#timesDiv {
	margin-top: 20px;
	margin-bottom: 4px;
}

.reserveCloseButtonDiv {
	margin-top: 10px;
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
	height: 342px;
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
	font-family: Arial, Helvetica, sans-serif;
}

/* Coffee bug-report section */
#coffeeBugDiv {
	background-color: #a1cfa8;
	border: 2px solid black;
	width: 1000px;
	margin: 10px auto;
	padding: 5px;
	height: fit-content;
}

#coffeeBugDiv ul {
	text-align: left;
}

#wholeChat {
	position: absolute;
	left: 2px;
	top: 123px;
	width: 450px;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	overflow-y: scroll;
	padding-bottom: 10px;
	text-align: center;
	font-family: Arial, Helvetica, sans-serif;
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
	left: 10px;
	top: 120px;
	font-size: 18px;
	z-index: 10000;
	color: white;
	font-family: Arial, Helvetica, sans-serif;
}

.topMenuItem {
	display: inline-block;
	width: 62px;
	height: 55px;
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
	height: 38px;
	width: 38px;
}

.topMenuItem span {
	font-size: 14px;
	font-weight: bold;
	display: block;
}

.topMenuItem.highlighted {
	color: #ff9900;
}

/** RESERVE */
#reserveDiv {
	border: 2px solid black;
	box-sizing: border-box;
	margin-top: -4px;
	background-color: lightblue;
	justify-content: center;
	width: 100%;
	font-family: Arial, Helvetica, sans-serif;
	min-width: 1200px;
}

#reserveTitle {
	font-size: 30px;
	font-weight: bolder;
}

/** MILESTONES */

.milestonesHolderDiv {
	background-color: #94e2fa;
	border-radius: 5px;
	padding: 5px;
}

.milestoneHC2span {
	border: #b63832 2px solid;
}

.milestoneHC3span {
	border: #303030 2px solid;
}

.compactMilestoneSpan {
	font-weight: bold;
	padding: 2px 5px;
	margin: 2px;
	display: inline-block;
	cursor: default;
	width: 220px;
}

.compactMilestoneLeavingSpan {
	font-style: italic;
	color: #ddd;
	text-shadow:
		/*-1px -1px 0 #000,
		1px -1px 0 #000,*/
		-1px 1px 0 #000,
		1px 1px 0 #000;
}

.fullMilestoneSpan {
	display: inline-block;
	width: 120px;
	height: 120px;
	margin: 10px;
	border-radius: 10px;
	position: relative;
	z-index: 1;
}

.milestoneTitle {
	height: 22px;
	margin: 2px;
	padding: 2px;
	font-family: gonzo;
	font-size: 11px;
	position: relative;
	z-index: 10;
}

.milestoneText {
	height: 70px;
	margin: 2px;
	padding: 2px;
	font-size: 13px;
	position: relative;
	z-index: 10;
}

.milestoneSpacer {
	height: 5px;
	font-size: 4px;
}

.milestoneIcon {
	position: absolute;
	width: 60px;
	bottom: -13px;
	right: -13px;
	z-index: 5;
}

.milestoneIcon.cart {
	bottom: 0;
	right: 0;
}

.milestoneIcon.billboard {
	bottom: -19px;
	width: 50px;
}

.milestoneIcon.vertical {
	width: 40px;
}

.milestoneIcon.house {
	width: 80px;
}

.milestoneIcon.higher {
	bottom: -5px;
}

.milestoneIcon.trainer {
	bottom: -15px;
}

.milestoneIcon.smaller {
	width: 50px;
}

.milestoneIcon.plane {
	width: 110px;
	bottom: -12px;
}

/** EMPLOYEES */
.employeesHolderDiv {
	display: inline-block;

	position: relative;
}

.employeeLine {
	height: 190px;
}

.empSpan {
	font-weight: bold;
	padding: 2px 5px;
	margin: 2px;
	display: inline-block;
	cursor: default;
	width: 220px;
}

.inverted {
	color: white;
}

.noMoreEmployees {
	text-decoration: line-through;
	color: #e21616;
}

.expandedEmployeeAreaDiv {
	margin: 5px 15px;
	display: inline-block;
	width: 130px;
}

.expandedEmployeeDiv {
	position: relative;
	z-index: 6;
	display: inline-block;
	width: 130px;
	height: 130px;
	background-color: #ffffff;
	border: #000 1px solid;
	border-radius: 5px;
	font-size: 13px;
	margin: 3px;
	padding: 0;
}

.emptyEmployeeDiv {
	margin: 5px 15px;
	display: inline-block;
	width: 130px;
	height: 130px;
}

.expandedEmployeeTitle {
	margin: 0 0 3px 0;
	height: 35px;
	border-radius: 5px 5px 0 0;
}

.expandedEmployeeAmountDiv {
	position: relative;
	top: 8px;
	z-index: 5;
	display: inline-block;
	width: 30px;
	height: 30px;
	border-radius: 15px;
	background-color: #333;
	font-weight: bold;
	color: #eee;
	line-height: 30px;
}

.employeeDescriptionDiv {
	height: 70px;
	padding: 2px;
}

.blankIcon {
	width: 30px;
	display: inline-block;
}

.iconsImg {
	width: 30px;
}

.fixedHeight {
	height: 30px;
	width: 20px;
}

.iconMiddle {
	margin: 0 12px;
}

.svgBackground {
	/* Position it behind the employee wrappers */
	position: absolute;
	top: 0;
	left: 0;

	/* Fill the entire grid area */
	width: 100%;
	height: 100%;

	/* Ensure it doesn't block clicks on employee icons */
	pointer-events: none;

	/* Layering */
	z-index: 0;
}

.reserveHouseSpan {
	display: inline-block;
	width: 50px;
	height: 50px;
	line-height: 50px;
	margin: 5px;
	background-color: #762448;
	color: #fff;
}

.reserveGardenImage {
	height: 50px;
	width: 100px;
	vertical-align: middle;
}

.campaignDiv {
	display: inline-block;
	margin: 2px;
}

.campaignImg {
	width: 100%;
	height: 100%;
}

.hc-icon {
	margin: 5px;
	width: 60px;
	height: 60px;
}

.centerAlign {
	vertical-align: middle;
}
</style>
