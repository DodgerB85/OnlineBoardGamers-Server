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

import i18n from "../i18n"

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
	const t = i18n.global.t
	if (isBridgeEntry(entry3)) return t("history.placesBridge")
	let bridgeCount = getBridgeCount(entry3)
	if (bridgeCount > 0) return t(bridgeCount > 1 ? "history.addsLinesWithBridgesPlural" : "history.addsLinesWithBridges", { count: entry3.length, bridges: bridgeCount })
	if (entry3.length === 1) return t("history.addsOneLine")
	return t("history.addsLines", { count: entry3.length })
}

function getActionText(entry3) {
	const t = i18n.global.t
	let text = ""

	if (entry3[0] === 10) return t("history.actionToPass")
	if (entry3[0] === 11) return t("history.actionToPassAuto")

	if (entry3[0] === 0) text += t("history.actionLineExpansion")
	if (entry3[0] === 1) text += t("history.actionNewBus")
	if (entry3[0] === 2) text += t("history.actionAddPassengers")
	if (entry3[0] === 3) text += t("history.actionNewBuildings")
	if (entry3[0] === 4) text += t("history.actionAlterTime")
	if (entry3[0] === 5) text += t("history.actionVroom")
	if (entry3[0] === 6) text += t("history.actionStartingPlayer")

	const forwardChars = ["A", "B", "C", "D", "E", "F"]
	const reverseChars = ["F", "E", "D", "C", "B", "A"]

	if (entry3[0] === 0 || entry3[0] === 3) {
		text += t("history.atPosition", { position: reverseChars[entry3[1]] })
	} else if (entry3[0] === 2 || entry3[0] === 5) {
		text += t("history.atPosition", { position: forwardChars[entry3[1]] })
	}

	return text
}
function getAddPassengersText(entry3) {
	const t = i18n.global.t
	let text = ""
	if (entry3[0] === -1) return t("history.addsNoPassengers")
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
	if (junction10 >= 2) text += t("history.addsPassengersTop", { count: junction10 })
	else if (junction10 === 1) text += t("history.addsPassengerTop")

	if (junction10 > 0 && junction25 > 0) text += t("history.and")

	if (junction25 >= 2) text += t("history.addsPassengersBottom", { count: junction25, station: personal.selectedBoard === rf.BOARD_PITTS ? t("history.airport") : t("history.bottomStation") })
	else if (junction25 === 1) text += t("history.addsPassengerBottom", { station: personal.selectedBoard === rf.BOARD_PITTS ? t("history.airport") : t("history.bottomStation") })

	for (let i = 0; i < designers.length; i++) {
		if (designers[i][1] === rf.DESIGNER_JEROEN) text += t("history.bringsJeroen")
		else if (designers[i][1] === rf.DESIGNER_JORIS) text += t("history.bringsJoris")
		else text += t("history.bringsDesigner")
	}

	if (runOut) text += t("history.ranOutPassengers")

	return text
}
function getAlterTimeText(entry1, entry3) {
	const t = i18n.global.t
	if (entry1 === -1) return t("history.timePasses")
	if (entry3[1] === 0) return t("history.choosesNotStopTime")
	else return t("history.stopsTime")
}
function geVromText(entry3) {
	const t = i18n.global.t
	// We know that there is at least 1 valid VROM, and it either ends in VROM or unable
	let designerMoves = 0
	for (let i = 0; i < entry3.length; i++) {
		if (entry3[i].length > 3) designerMoves++
	}
	if (entry3.length === 1 && designerMoves === 0) return t("history.movesOnePassenger")
	if (designerMoves === entry3.length && entry3[entry3.length - 1].length !== 1) return designerMoves === 1 ? t("history.movesOneDesigner") : t("history.movesDesigners", { count: designerMoves })
	if (entry3.length === 1 && designerMoves === 0) return t("history.movesOnePassenger")
	if (entry3[entry3.length - 1].length !== 1) {
		if (designerMoves === 0) return t("history.movesPassengers", { count: entry3.length })
		let paxNum = entry3.length - designerMoves
		let text = ""
		if (paxNum > 1) text += t("history.movesPassengers", { count: paxNum })
		else if (paxNum === 1) text += t("history.movesOnePassenger")
		if (designerMoves > 1) text += t("history.andDesigners", { count: designerMoves })
		else text += t("history.andOneDesigner")
		return text
	}
	// Now there must be some valid and then unable
	let movedPaxNum = entry3.length - 1
	let text = ""
	if (movedPaxNum > 1) text += t("history.movesPassengers", { count: movedPaxNum })
	else if (movedPaxNum === 1) text += t("history.movesOnePassenger")
	if (entry3[entry3.length - 1][0] === 1) text += t("history.butRanOutPassengers")
	if (entry3[entry3.length - 1][0] === 2) text += t("history.butRanOutBuildings")

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
				<div class="new_turn">{{ $t('history.startOfTurn', { num: entry[3][0] }) }}</div>
			</div>
		</template>

		<!-- REWIND -->
		<template v-if="entry[0] === rf.HIST_REWIND">
			<div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
				</div>
				<div class="mainEntry rewind">{{ $t('history.rewoundBy', { name: store.players[entry[1]].name }) }}</div>
			</div>
		</template>

		<!-- RESIGN -->
		<template v-if="entry[0] === rf.HIST_RESIGN">
			<div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
				</div>
				<div class="mainEntry rewind">{{ $t('history.resigns', { name: store.players[entry[1]].name }) }}</div>
			</div>
		</template>

		<!-- KICKOUT -->
		<template v-if="entry[0] === rf.HIST_KICKOUT">
			<div class="log" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
				</div>
				<div class="mainEntry rewind">{{ $t('history.kickedOut', { name: store.players[entry[3][0]].name }) }}</div>
			</div>
		</template>

		<!-- GAME END -->
		<template v-if="entry[0] === rf.HIST_GAME_END">
			<div class="log separator" :id="'logEntry' + String(entry_ID)" @click="clickedEntry(entry_ID)" @mouseover="addHighlight($event, true, entry_ID)" @mouseleave="addHighlight($event, false, entry_ID)">
				<div class="header">
					<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
				</div>
				<div class="mainEntry new_turn">
					{{ $t('history.gameEnded') }}
					<br />
					<br />
					{{ $t('history.winner', { name: model.getWinnerName()[0] }) }}
					<br />
					<br />
					<span v-if="model.getWinnerName()[1] === 0">{{ $t('history.highestScore') }}</span>
					<span v-if="model.getWinnerName()[1] === 1">{{ $t('history.jointMoreStones') }}</span>
					<span v-if="model.getWinnerName()[1] === 2">{{ $t('history.jointScoreFirst') }}</span>
					<br />
					<br />
					<span v-if="store.gameflow.gameEnded === 1">{{ $t('history.noMoreTimeStones') }}</span>
					<span v-if="store.gameflow.gameEnded === 2">{{ $t('history.noMoreBuildingSpots') }}</span>
					<span v-if="store.gameflow.gameEnded === 3">{{ $t('history.onlyOnePlayerActions') }}</span>
					<span v-if="store.gameflow.gameEnded === 4">{{ $t('history.lastPlayerStanding') }}</span>
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
				{{ $t('history.builds') }}
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
				{{ $t('history.passesNewBuilding') }}
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
				{{ $t('history.passesLineExpansion') }}
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
				{{ $t('history.chooses') }} {{ getActionText(entry[3]) }}
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
				<span v-if="entry[3].length > 1 && entry[3][1] === 0">{{ $t('history.newBusNoEffect') }}</span>
				<span v-else>{{ $t('history.increasesBuses', { count: entry[3][0] }) }}</span>
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
				{{ $t('history.passesAddPassenger') }}
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
				<span v-if="entry[1] === -1">{{ $t('history.startingPlayerMovesLeft') }}</span>
				<span v-else>{{ $t('history.becomesStartingPlayer') }}</span>

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
				<span v-if="entry[3][0][0] === 1">{{ $t('history.unableNoPassengers') }}</span>
				<span v-if="entry[3][0][0] === 2">{{ $t('history.unableNoDestination') }}</span>
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
				<span>{{ $t('history.error', { error: entry[3] }) }}</span>
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
