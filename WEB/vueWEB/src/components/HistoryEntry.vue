<script setup>
import * as rf from "../js/WEBreference"
import * as funcs from "../js/WEBfuncs"
import * as view from "../js/WEBview"
import * as history from "../js/WEBhistory"
import * as cb from "../js/WEBcables"
import * as model from "../js/WEBmodel"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

const props = defineProps(["entry", "entry_ID"])

function clickedHistoryEntry(action, entry3, entry_id) {
	// If not replay, or if clicking on the replay entry, just do highlights
	if (!store.viewSettings.showReplay || entry_id === -1) history.setupHistoryHighlight(action, entry3)
	// Otherwise, you are clicking in history during replay
	//else history.goToReplayStep(entry_id)
}

const computedEntry3 = computed(() => {
	let ret = {}
	if (props.entry[0] === rf.HIST_ADD_TILE) {
		//let index = props.entry[3][0]
		let tileID = props.entry[3][1]
		let rotation = props.entry[3][2]
		let tileData = model.getTileByID(tileID)
		ret.tileID = tileID
		ret.gfx = tileData.gfx
		ret.rotation = rotation
	}
	if (props.entry[0] === rf.HIST_GET_NEW_TILE) {
		let tileID = props.entry[3][0]
		let rotation = 0
		let tileData = model.getTileByID(tileID)
		ret.tileID = tileID
		ret.gfx = tileData.gfx
		ret.rotation = rotation
	}
	return ret
})

function getAnchorTilePos() {
	if (!rf.ALL_RECT_TILES.includes(store.context.selectedTileIDtoPlaceArr[0])) return [0, 0]
	if (store.context.selectedTileIDtoPlaceArr[1] === 0) return [75, 0]
	return [0, 75]
}

function getDisplayCoordFromIndex(index) {
	let coord = [index % store.gridWidth, Math.floor(index / store.gridWidth)]
	// Frist, convert to visual coords
	coord[0]++
	coord[1]++
	// Next, if not current player adding a tile, subtract left 2 and top 2 rows.
	if (!personal.canPlay() || store.context.action !== rf.ACT_CHOOSE_INTIIAL_TILE) {
		coord[0] -= 2
		coord[1] -= 2
	}
	return String(coord[0]) + "," + String(coord[1])
}

function getRewindName(num) {
	if (num >= 0) return store.players[num].name
	return "admin"
}

function getOrdinal(num) {
	if (num === 1) return "1st"
	else if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
	return "Unknown"
}
</script>

<template>
	<span v-if="personal.name === 'admin'">{{ entry }}</span>
	<!-- New Game -->
	<template v-if="entry[0] === rf.HIST_NEW_GAME">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				Welcome to Web!
				<br />
				<div v-for="(player, idx) in store.players" :key="idx" class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(player.colour)">{{ store.players[idx].name }}</span>
				</div>
			</div>
		</div>
	</template>

	<!-- REWIND -->
	<template v-if="entry[0] === rf.HIST_REWIND">
		<div class="log">
			<div class="header">
				<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">
				Game rewound to here by {{ getRewindName(entry[1]) }}
				<br />
				<span v-for="(playerIndex, idx) in entry[3]" :key="idx">
					<span v-if="idx > 0">,</span>
					<span :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].name }}</span>
				</span>
				Saw Hidden Info
			</div>
		</div>
	</template>

	<!-- RESIGN -->
	<template v-if="entry[0] === rf.HIST_RESIGN">
		<div class="log">
			<div class="header">
				<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">{{ entry[3][0] }} Resigns</div>
		</div>
	</template>

	<!-- KICKOUT -->
	<template v-if="entry[0] === rf.HIST_KICKOUT">
		<div class="log">
			<div class="header">
				<span>{{ funcs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">{{ entry[3][0] }} was kicked out</div>
		</div>
	</template>

  <!-- GAME END -->
	<template v-if="entry[0] === rf.HIST_GAME_END">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ funcs.timestampToString(entry[2]) }}</span>
			</div>
			<div class="mainEntry new_turn">
				<b><u>Final Scores</u></b>
				<br />
				<br />
				<!--<template v-if="store.context.finalPositions.length === 1">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.context.finalPositions[0]].colour)">{{ store.players[store.context.finalPositions[0]].displayName }}</span>
					wins as King of the Hill
				</template>
				<template v-else>-->
				<template v-for="(finalEntry, idx) in entry[3]" :key="idx">
					{{ getOrdinal(idx + 1) }}:
					<template v-for="(playerIndex, idx2) in finalEntry" :key="idx2">
						<div class="mainEntryPlayer" :style="{
              backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
              color: personal.getCorrectedColourText(store.players[playerIndex].colour),
              borderColor: personal.getCorrectedColour(store.players[playerIndex].colour) === rf.BLACK ? 'white !important' : 'black',
              }">{{ store.players[playerIndex].displayName }}</div>
						Total: {{ cb.getScore(playerIndex) }}
						<br />
					</template>
				</template>
				<br />
			</div>
		</div>
	</template>

	<!-- PLAYER ACTIONS-->

	<!-- ADD Tile -->
	<template v-if="entry[0] === rf.HIST_ADD_TILE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2] * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				Adds
				<div class="singleTileDiv">
					<svg class="singleTileSVG" xmlns="http://www.w3.org/2000/svg" :viewBox="rf.ALL_RECT_TILES.includes(computedEntry3.tileID) ? '0 0 100 100' : '0 0 100 100'">
						<polygon class="singleTilePolygon" :x="getAnchorTilePos()[0]" :y="getAnchorTilePos()[1]" :transform="view.getRotateString(computedEntry3.tileID, computedEntry3.rotation, 0, 0, 50)" :points="view.getPolygonPointsFromTileID(computedEntry3.tileID, computedEntry3.rotation, 0, 0, 50)" :fill="view.getTilePatternFromID(computedEntry3.tileID)" />
					</svg>
				</div>
				at position ({{ getDisplayCoordFromIndex(entry[3][0]) }})
			</div>
		</div>
	</template>

	<!-- ADD Cable to map -->
	<template v-if="entry[0] === rf.HIST_ADD_CABLE_TO_MAP">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2] * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				Adds a cable at position ({{ getDisplayCoordFromIndex(entry[3][0]) }})
				<span v-if="entry[3].length === 1">&nbsp;vertically</span>
				<span v-else>&nbsp;horizontally</span>
			</div>
		</div>
	</template>

	<!-- More Cables -->
	<template v-if="entry[0] === rf.HIST_ADD_CABLES">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2] * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				Adds 3 cables ({{ entry[3][0] }} available, {{ entry[3][1] }} in store)
			</div>
		</div>
	</template>

	<!-- Get New Tile -->
	<template v-if="entry[0] === rf.HIST_GET_NEW_TILE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2] * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				Picks up
				<div class="singleTileDiv">
					<svg class="singleTileSVG" xmlns="http://www.w3.org/2000/svg" :viewBox="rf.ALL_RECT_TILES.includes(computedEntry3.tileID) ? '0 0 100 100' : '0 0 100 100'">
						<polygon class="singleTilePolygon" :x="getAnchorTilePos()[0]" :y="getAnchorTilePos()[1]" :transform="view.getRotateString(computedEntry3.tileID, computedEntry3.rotation, 0, 0, 50)" :points="view.getPolygonPointsFromTileID(computedEntry3.tileID, computedEntry3.rotation, 0, 0, 50)" :fill="view.getTilePatternFromID(computedEntry3.tileID)" />
					</svg>
				</div>
			</div>
		</div>
	</template>
</template>

<style scoped>
.container {
	display: flex;
	align-items: center;
}

.SingleHexDiv {
	margin: 0px;
	width: 75px;
	background-color: aqua;
	height: 75px;
}

.singleHexSVG {
	width: 75px;
	margin: 0px;
	height: fit-content;
}

.log {
	direction: ltr;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 3px 3px 3px 3px;
	background-size: 35px 34px;
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

.selectableHistory:hover {
	border: 1px solid yellow;
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

.reverseHistory {
	display: flex;
	flex-direction: column-reverse;
}

.highlightHistDiv {
	border-color: yellow;
}

.bigFont {
	font-weight: bolder;
	font-size: 25px;
	vertical-align: middle;
}
.playerScoreSummaryDiv {
	border: 1px solid white;
	display: inline-block;
	font-size: 20px;
	font-weight: bolder;
	margin: 4px;
	padding: 0px;
}

.singleTileDiv {
	height: 75px;
}

.singleTileSVG {
	width: 100%;
	height: 100%;
}

.singleTilePolygon {
	stroke: black;
	stroke-width: 1px;
}
</style>
