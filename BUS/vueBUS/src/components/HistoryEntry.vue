<script setup>
import * as funcs from "../js/BUSfuncs.js"
import * as rf from "../js/BUSreference.js"
import * as replay from "../js/BUSreplay"
import * as view from "../js/BUSview.js"
import * as model from "../js/BUSmodel.js"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()

defineProps(["entry", "entry_ID"])

function addHighlight(e, entering, id) {
	// for entry in replay area
	if (id === -1) return
	if (store.topMenuViews.showReplay === false) {
		if (store.history[id][0] === rf.HIST_NEW_TURN || store.history[id][0] === rf.HIST_GAME_END || store.history[id][0] === rf.HIST_REWIND || store.history[id][0] === rf.HIST_RESIGN || store.history[id][0] === rf.HIST_KICKOUT || store.history[id][0] === rf.HIST_CHOOSE_ACTION || store.history[id][0] === rf.HIST_ADD_BUS || store.history[id][0] === rf.HIST_ADD_PAX || store.history[id][0] === rf.HIST_ALTER_TIME || store.history[id][0] === rf.HIST_STARTING_PLAYER) return
		if (store.history[id][0] === rf.HIST_VROM && store.history[id][3][0].length === 1) return
	}
	if (e.target.id !== "logEntry" + String(id)) return
	if (entering) e.target.classList.add("highlightHistDiv")
	else e.target.classList.remove("highlightHistDiv")
}

function historyHighlightBuildings(buildingsObj, index) {
	if (store.topMenuViews.showReplay) {
		clickedEntry(index)
		return
	}
	store.clearHistoryHelpers()
	store.historyHelpers.buildingsToHighlight = [...buildingsObj]
}
function historyHighlightLines(buildingsObj, index) {
	if (store.topMenuViews.showReplay) {
		clickedEntry(index)
		return
	}
	store.clearHistoryHelpers()
	store.historyHelpers.linesToHighlight = [...buildingsObj]
}

function historyHighlightVroms(entry3, index) {
	if (store.topMenuViews.showReplay) {
		clickedEntry(index)
		return
	}
	store.clearHistoryHelpers()
	let junctions = []
	let buildings = []

	for (let i = 0; i < entry3.length; i++) {
		if (entry3[i].length > 1) {
			junctions.push(entry3[i][0])
			// Splotter Designer move [origin, junction, destination, designerIdx] - highlight the destination instead
			if (entry3[i].length > 3) junctions.push(entry3[i][1])
			else buildings.push([-1, entry3[i][1], entry3[i][2]])
		}
	}
	historyHighlightBuildings(buildings)
	store.historyHelpers.junctionsToHighlight = [...junctions]
}

function isBridgeEntry(entry3) {
	if (entry3.length === 0) return false
	return getBridgeCount(entry3) === entry3.length
}

function getBridgeCount(entry3) {
	if (personal.selectedBoard !== rf.BOARD_PITTS) return 0
	let bridgeCount = 0
	for (let i = 0; i < entry3.length; i++) {
		if (entry3[i].length > 0 && rf.PITTS_BRIDGE_LINE_IDS.includes(entry3[i][0])) bridgeCount++
	}
	return bridgeCount
}

function getAddLineText(entry3) {
	if (isBridgeEntry(entry3)) return "places a bridge"
	let bridgeCount = getBridgeCount(entry3)
	if (bridgeCount > 0) return "adds " + entry3.length + " lines (including " + bridgeCount + " bridge" + (bridgeCount > 1 ? "s" : "") + ")"
	if (entry3.length === 1) return "adds 1 line"
	return "adds " + entry3.length + " lines"
}

function getActionText(entry3) {
	let text = ""

	if (entry3[0] === 10) return "to pass"
	if (entry3[0] === 11) return "to pass (auto)"

	if (entry3[0] === 0) text += '"Line Expansion"'
	if (entry3[0] === 1) text += '"New Bus"'
	if (entry3[0] === 2) text += '"Add Passengers"'
	if (entry3[0] === 3) text += '"New Buildings"'
	if (entry3[0] === 4) text += '"Alter Time"'
	if (entry3[0] === 5) text += '"Vrrooomm"'
	if (entry3[0] === 6) text += '"Starting Player"'

	const forwardChars = ["A", "B", "C", "D", "E", "F"]
	const reverseChars = ["F", "E", "D", "C", "B", "A"]

	if (entry3[0] === 0 || entry3[0] === 3) {
		text += " at position: " + reverseChars[entry3[1]]
	} else if (entry3[0] === 2 || entry3[0] === 5) {
		text += " at position: " + forwardChars[entry3[1]]
	}

	return text
}
function getAddPassengersText(entry3) {
	let text = ""
	if (entry3[0] === -1) return "adds no Passengers - none remaining"
	let junction10 = 0
	let junction25 = 0
	let designers = []
	let runOut = false
	for (let i = 0; i < entry3.length; i++) {
		if (Array.isArray(entry3[i])) designers.push(entry3[i])
		else if (entry3[i] === 10 || (personal.selectedBoard === rf.BOARD_PITTS && entry3[i] === 5)) junction10++
		else if (entry3[i] === 25 || (personal.selectedBoard === rf.BOARD_PITTS && entry3[i] === 30)) junction25++
		else if (entry3[i] === -1) runOut = true
	}
	if (junction10 >= 2) text += "adds " + String(junction10) + " passengers to the top station"
	else if (junction10 === 1) text += " adds a passenger to the top station"

	if (junction10 > 0 && junction25 > 0) text += ", and "

	if (junction25 >= 2) text += "adds " + String(junction25) + " passengers to the " + (personal.selectedBoard === rf.BOARD_PITTS ? "Airport" : "bottom station")
	else if (junction25 === 1) text += " adds a passenger to the " + (personal.selectedBoard === rf.BOARD_PITTS ? "Airport" : "bottom station")

	for (let i = 0; i < designers.length; i++) {
		if (designers[i][1] === rf.DESIGNER_JEROEN) text += ", brings the designer Jeroen into play at the Airport"
		else if (designers[i][1] === rf.DESIGNER_JORIS) text += ", brings the designer Joris into play at the Airport"
		else text += ", brings a designer into play at the Airport"
	}

	if (runOut) text += ", but then ran out of Passengers"

	return text
}
function getAlterTimeText(entry1, entry3) {
	if (entry1 === -1) return "Time passes. New Destination: "
	if (entry3[1] === 0) return "chooses not to Stop Time. New Destination: "
	else return "stops Time! Destination remains: "
}
function geVromText(entry3) {
	// We know that there is at least 1 valid VROM, and it either ends in VROM or unable
	let designerMoves = 0
	for (let i = 0; i < entry3.length; i++) {
		if (entry3[i].length > 3) designerMoves++
	}
	if (entry3.length === 1 && designerMoves === 0) return "moves 1 Passenger"
	if (designerMoves === entry3.length && entry3[entry3.length - 1].length !== 1) return designerMoves === 1 ? "moves 1 Designer" : "moves " + String(designerMoves) + " Designers"
	if (entry3.length === 1 && designerMoves === 0) return "moves 1 Passenger"
	if (entry3[entry3.length - 1].length !== 1) {
		if (designerMoves === 0) return "moves " + String(entry3.length) + " Passengers"
		let paxNum = entry3.length - designerMoves
		let text = ""
		if (paxNum > 1) text += "moves " + String(paxNum) + " Passengers"
		else if (paxNum === 1) text += "moves 1 Passenger"
		if (designerMoves > 1) text += " and " + String(designerMoves) + " Designers"
		else text += " and 1 Designer"
		return text
	}
	// Now there must be some valid and then unable
	let movedPaxNum = entry3.length - 1
	let text = ""
	if (movedPaxNum > 1) text += "moves " + String(movedPaxNum) + " Passengers"
	else if (movedPaxNum === 1) text += "moves 1 Passenger"
	if (entry3[entry3.length - 1][0] === 1) text += ", but ran out of Passengers"
	if (entry3[entry3.length - 1][0] === 2) text += ", but ran out of Buildings"

	return text
}

function clickedEntry(index) {
	if (store.topMenuViews.showReplay === false) return
	// for entry in replay area
	if (index === -1) return
	replay.goToReplayStep(index)
}
</script>

<template>
	<span v-if="personal.name === 'admin'">{{ entry[3] }}</span>

	<!-- NON PLAYER-->
	<template v-if="entry[0] < 10">
		<!-- New Turn -->
		<template v-if="entry[0] === rf.HIST_NEW_TURN">
			<div class="log separator mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="new_turn">Start of turn {{ entry[3][0] }}</div>
			</div>
		</template>

		<!-- REWIND -->
		<template v-if="entry[0] === rf.HIST_REWIND">
			<div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
				</div>
				<div class="mainEntry rewind">Game rewound to here by {{ store.players[entry[1]].name }}</div>
			</div>
		</template>

		<!-- RESIGN -->
		<template v-if="entry[0] === rf.HIST_RESIGN">
			<div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
				</div>
				<div class="mainEntry rewind">{{ store.players[entry[1]].name }} Resigns</div>
			</div>
		</template>

		<!-- KICKOUT -->
		<template v-if="entry[0] === rf.HIST_KICKOUT">
			<div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
				</div>
				<div class="mainEntry rewind">{{ store.players[entry[3][0]].name }} was kicked out</div>
			</div>
		</template>

		<!-- GAME END -->
		<template v-if="entry[0] === rf.HIST_GAME_END">
			<div class="log separator" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
				</div>
				<div class="mainEntry new_turn">
					Game Ended
					<br />
					<br />
					Winner: {{ model.getWinnerName()[0] }}
					<br />
					<br />
					<span v-if="model.getWinnerName()[1] === 0">Highest Score</span>
					<span v-if="model.getWinnerName()[1] === 1">Joint score with more Time Stones</span>
					<span v-if="model.getWinnerName()[1] === 2">Joint score, same Time Stones, achieved score first</span>
					<br />
					<br />
					<span v-if="store.gameflow.gameEnded === 1">No More Timestones</span>
					<span v-if="store.gameflow.gameEnded === 2">No More Building Spots</span>
					<span v-if="store.gameflow.gameEnded === 3">Only One Player with Actions</span>
					<span v-if="store.gameflow.gameEnded === 4">Last player standing</span>
				</div>
			</div>
		</template>
	</template>

	<!-- PLAYER ACTIONS -->
	<template v-else-if="entry[0] >= 10 && entry[0] < 20">
		<!-- ADD BLDG -->
		<template v-if="entry[0] === rf.HIST_ADD_BLDG && entry[3].length > 0">
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="historyHighlightBuildings(entry[3], entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">{{ store.players[entry[1]].displayName }}</span>
				builds
				<template v-for="(line, index) in entry[3]" v-bind:key="index">
					<img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE || personal.selectedBoard === rf.BOARD_PITTS" class="hist_buildingImg" :src="view.getImage('building' + String(line[0]))" alt="buildingHist" />
					<img v-if="personal.selectedBoard === rf.BOARD_OG" class="hist_buildingImg_orig" :src="view.getImage('building' + String(line[0]) + '_orig')" alt="buildingHist" />
				</template>
			</div>
		</template>
		<template v-if="entry[0] === rf.HIST_ADD_BLDG && entry[3].length === 0">
			<div class="log mainEntry">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">{{ store.players[entry[1]].displayName }}</span>
				passes "New Building" - Max Buses too low
			</div>
		</template>

		<!-- ADD LINE -->
		<template v-if="entry[0] === rf.HIST_ADD_LINE && entry[3].length > 0">
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="historyHighlightLines(entry[3], entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">{{ store.players[entry[1]].displayName }}</span>
				<span>{{ getAddLineText(entry[3]) }}</span>
			</div>
		</template>
		<template v-if="entry[0] === rf.HIST_ADD_LINE && entry[3].length === 0">
			<div class="log mainEntry">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">
					{{ store.players[entry[1]].displayName }}
				</span>
				passes "Line Expansion" - Max Buses too low
			</div>
		</template>

		<!-- Choose Action -->
		<template v-if="entry[0] === rf.HIST_CHOOSE_ACTION">
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">
					{{ store.players[entry[1]].displayName }}
				</span>
				chooses {{ getActionText(entry[3]) }}
			</div>
		</template>

		<!-- ADD BUS -->
		<template v-if="entry[0] === rf.HIST_ADD_BUS">
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">
					{{ store.players[entry[1]].displayName }}
				</span>
				increases buses to {{ entry[3][0] }}
			</div>
		</template>

		<!-- Add Pax -->
		<template v-if="entry[0] === rf.HIST_ADD_PAX && entry[3].length > 0">
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">
					{{ store.players[entry[1]].displayName }}
				</span>
				{{ getAddPassengersText(entry[3]) }}
			</div>
		</template>
		<template v-if="entry[0] === rf.HIST_ADD_PAX && entry[3].length === 0">
			<div class="log mainEntry">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">
					{{ store.players[entry[1]].displayName }}
				</span>
				passes "Add Passenger" - Max Buses too low
			</div>
		</template>

		<!-- Alter Time -->
		<template v-if="entry[0] === rf.HIST_ALTER_TIME">
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span v-if="entry[1] !== -1" :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">
					{{ store.players[entry[1]].displayName }}
				</span>
				{{ getAlterTimeText(entry[1], entry[3]) }}
				<img v-if="personal.selectedBoard === rf.BOARD_20A_UNOFFICIAL || personal.selectedBoard === rf.BOARD_20A_CAPSTONE" class="hist_buildingImg" :src="view.getImage('building' + String(entry[3][0]))" alt="buildingOption" />
				<img v-if="personal.selectedBoard === rf.BOARD_OG" class="hist_buildingImg_orig" :src="view.getImage('building' + String(entry[3][0]) + '_orig')" alt="buildingOption" />
			</div>
		</template>

		<!-- Start Player -->
		<template v-if="entry[0] === rf.HIST_STARTING_PLAYER">
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span v-if="entry[1] !== -1" :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">
					{{ store.players[entry[1]].displayName }}
				</span>
				<span v-if="entry[1] === -1">Action Round Starting Player moves to the Left. New Turn Order:</span>
				<span v-else>becomes the Starting Player. New Turn Order:</span>

				<span v-for="(player, indexSP) in entry[3]" v-bind:key="indexSP" :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[player].colour)]">
					{{ store.players[player].displayName }}
				</span>
			</div>
		</template>
	</template>
	<template v-else>
		<!-- VROM WITH HIGHLIGHTS -->
		<template v-if="entry[0] === rf.HIST_VROM && entry[3][0] != undefined && entry[3][0].length > 1">
			<!-- && entry[3][0] != undefined -->
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="historyHighlightVroms(entry[3], entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">{{ store.players[entry[1]].displayName }}</span>
				<span>{{ geVromText(entry[3]) }}</span>
			</div>
		</template>

		<!-- UNABLE TO VROM -->
		<template v-if="entry[0] === rf.HIST_VROM && entry[3][0] != undefined && entry[3][0].length === 1">
			<!-- && entry[3][0] != undefined -->
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">{{ store.players[entry[1]].displayName }}</span>
				<span v-if="entry[3][0][0] === 1">is unable to VRROOOMM - no available Passengers</span>
				<span v-if="entry[3][0][0] === 2">is unable to VRROOOMM - no desired destination</span>
			</div>
		</template>

		<template v-if="entry[0] === rf.HIST_VROM && entry[3][0] == undefined">
			<!-- && entry[3][0] != undefined -->
			<div class="log mainEntry" :id="'logEntry' + String(entry_ID)">
				<div class="header">
					<span>
						{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
					</span>
				</div>
				<span :class="['mainEntryPlayer', 'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)]">{{ store.players[entry[1]].displayName }}</span>
				<span>ERROR: {{ entry[3] }}</span>
			</div>
		</template>
	</template>
</template>

<style scoped>
.log {
	direction: ltr;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 3px 3px 3px 3px;
	background-size: 40px 40px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
	z-index: 30;
}

.log .header {
	font-size: 0.8em;
}

.mainEntry {
	line-height: 25px;
}

.log .new_turn {
	background-color: #000;
	text-align: center;
	color: #fff;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log .new_turn a {
	color: #2196f3;
}

.log .rewind {
	background-color: #d4eafd;
	text-align: center;
	color: #000;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log h4 {
	text-align: center;
}

.log.separator {
	padding: 3px;
}

.hist_buildingImg {
	width: 40px;
	vertical-align: middle;
	border: 2px solid black;
	border-radius: 100%;
	margin-left: 2px;
}

.hist_buildingImg_orig {
	width: 40px;
	vertical-align: middle;
	border: 2px solid black;
	margin-left: 2px;
}

.highlightHistDiv {
	border-color: yellow;
}
</style>
