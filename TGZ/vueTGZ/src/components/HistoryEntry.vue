<script setup>
import * as refFuncs from "../js/TGZfuncs"
import * as rf from "../js/TGZreference"
import * as map from "../js/TGZmap"
import * as view from "../js/TGZview"
import * as history from "../js/TGZhistory"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

defineProps(["entry", "entry_ID"])

function clickedHistoryEntry(action, entry3, entry_id) {
	// If not replay, or if clicking on the replay entry, just do highlights
	if (!store.topMenuViews.showReplay || entry_id === -1) history.setupHistoryHighlightSquares(action, entry3)
	// Otherwise, you are clicking in history during replay
	else history.goToReplayStep(entry_id)
}

// Take an index, return coords in [x, y]
function getHistoryCoordsForIndex(index) {
	let Sw = map.getSw()
	let x = (index % Sw) + 1
	let y = Math.floor(index / Sw) + 1
	return `(${x}, ${y})`
}

function getTotalRaiseCostHTML(entry3, entry1) {
	// Find out if OVIA is being used
	let OVIAused = false
	let OVIAcows = 0
	for (let i = 1; i < entry3.length; i++) {
		if (entry3[i][0] === -2) OVIAused = true
	}
	// Hubs
	let hubCosts = 0
	for (let i = 0; i < entry3.length; i++) {
		for (let j = 0; j < entry3[i].length; j++) {
			if (entry3[i][j].length === 3) hubCosts += entry3[i][j][1]
		}
	}

	// Craftsmen costs
	let cmenCosts = [0, 0, 0, 0, 0]
	for (let i = 0; i < entry3.length; i++) {
		for (let j = 0; j < entry3[i].length; j++) {
			if (entry3[i][j].length === 3) {
				let cowCost = entry3[i][j][2]
				let priCmanIndex = entry3[i][j][0]
				if (OVIAused) {
					cowCost--
					OVIAcows++
				}
				cmenCosts[getPlayerIndexForCraftsmanPriIndex_Hist(priCmanIndex)] += cowCost
			}
		}
	}
	let ret = "<b><u>Summary:</u> " + String(hubCosts) + "</b> hub" + (hubCosts !== 1 ? "s" : "") + " "
	for (let i = 0; i < cmenCosts.length; i++) {
		if (cmenCosts[i] !== 0) {
			ret += '<span class="mainEntryPlayer" style="background-color: ' + personal.getCorrectedColourHex(store.players[i].colour) + ";color: " + (personal.getCorrectedColour(store.players[i].colour) === rf.WHITE || personal.getCorrectedColour(store.players[i].colour) === rf.YELLOW ? "black" : "white") + '">' + store.players[i].displayName + "</span><b>" + String(cmenCosts[i]) + "</b> "
		}
	}
	// Total
	ret += " Total: <b>" + String(cmenCosts.reduce((a, b) => a + b, 0) + hubCosts + OVIAcows) + "</b> "

	if (OVIAused) ret += '<br/> <span class="mainEntryPlayer" style="background-color: ' + personal.getCorrectedColourHex(store.players[entry1].colour) + ";color: " + (personal.getCorrectedColour(store.players[entry1].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry1].colour) === rf.YELLOW ? "black" : "white") + '">' + store.players[entry1].displayName + "</span>'s <b>Ovia:</b> +" + String(OVIAcows) + " "
	return ret
}

function getCraftsmanDataFromPriSq_Hist(index, reuturnData) {
	// Go thru history. Find entry of building craftsman at that index , and get data
	for (let i = 0; i < store.history.length; i++) {
		if (store.history[i][0] === rf.HIST_BUILD_CRAFTSMAN) {
			// want index,craftsman,rotation
			if (index === store.history[i][3][0] && reuturnData) return [store.history[i][3][0], store.history[i][3][1], store.history[i][3][2]]
		}
	}
	alert("GC*D*FPS_HIST ERROR")
}

function getCrafsmsnTileFromPriSq_Hist(index) {
	// Go thru history. Find entry of building craftsman at that index , and get data
	for (let i = 0; i < store.history.length; i++) {
		if (store.history[i][0] === rf.HIST_BUILD_CRAFTSMAN) {
			// want index,craftsman,rotation
			if (index === store.history[i][3][0]) return store.history[i][3][1]
		}
	}
	alert("GC*T*FPS_HIST ERROR")
}

function getPlayerForCraftsmanPriIndex_Hist(index) {
	// Go thru history. Find entry of building craftsman at that index , and get data
	for (let i = 0; i < store.history.length; i++) {
		if (store.history[i][0] === rf.HIST_BUILD_CRAFTSMAN) {
			// want index,craftsman,rotation
			if (index === store.history[i][3][0]) return store.players[store.history[i][1]]
		}
	}
	alert("GPFCP_HIST ERROR")
}

function getPlayerIndexForCraftsmanPriIndex_Hist(index) {
	// Go thru history. Find entry of building craftsman at that index , and get data
	for (let i = 0; i < store.history.length; i++) {
		if (store.history[i][0] === rf.HIST_BUILD_CRAFTSMAN) {
			// want index,craftsman,rotation
			if (index === store.history[i][3][0]) return store.history[i][1]
		}
	}
	alert("GP*I*FCP_HIST ERROR")
}

function TIURAKHused(entry) {
	let newMonLevel = entry[3][0][1]
	if (newMonLevel === 2) return false
	let goodsUsed = 0
	for (let i = 1; i < entry[3].length; i++) {
		if (entry[3][i][0] !== -1 && entry[3][i][0] !== -2) goodsUsed++
	}
	if (goodsUsed + 1 === newMonLevel) return false
	// Now need to check if player actually has TIURAKH
	// Except that would break the hist for replay
	return true
}

function YEMOJAused(entry) {
	let monIndex = entry[3][0][0]
	let monumentIndex = store.players[entry[1]].monuments
		.map(function (el) {
			return el[0]
		})
		.indexOf(monIndex)

	if (monumentIndex !== -1) return -1
	if (monumentIndex === -1) {
		for (let i = 0; i < store.players.length; i++) {
			monumentIndex = store.players[i].monuments
				.map(function (el) {
					return el[0]
				})
				.indexOf(monIndex)
			if (monumentIndex !== -1) return i
		}
	}
}

// Return a valid image name - in case res was made later by shaman
function getResImgName(input) {
	// If it's on the board, use that img
	if (rf.resSqToTile(store.coords[input]) !== -1)	return 'res' + String(rf.resSqToTile(store.coords[input]))
	// Otherwise, try to find the shaman entry in the history
	for (let i=store.history.length-1; i>=0; i--) {
		if (store.history[i][0] === rf.HIST_BUILD_RESOURCE) {
			if (store.history[i][3][0] === input) return 'res' + String(store.history[i][3][1])
		}
	}
	alert("GRIN in hist")
	return 'res' + String(rf.WOOD_TILE)
}

</script>

<template>
	<span v-if="personal.name === 'admin'">{{ entry[3] }}</span>
	<br />
	<!-- New Game -->
	<template v-if="entry[0] === rf.HIST_NEW_GAME">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				Welcome to Africa!
				<br />
				<span v-for="(playerIndex, idx) in entry[3][0]" :key="idx">
					<img class="newGameTribeImg" :src="view.getPlayerTribeImage(personal.getCorrectedColour(store.players[playerIndex].colour))" alt="TRIBE" />
				</span>
			</div>
		</div>
	</template>

	<!-- BUILD MON -->
	<template v-if="entry[0] === rf.HIST_BUILD_MON || entry[0] === rf.HIST_BUILD_FIRST_MON">
		<div
			class="log mainEntry selectableHistory"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			builds
			<span v-if="entry[3].length == 1">a monument</span>
			<span v-if="entry[3].length == 2">monuments</span>
			at co-ordinates
			<template v-for="(index, indexAM) in entry[3]" :key="indexAM">
				<span class="noBreak">{{ getHistoryCoordsForIndex(index) }}</span>
				&nbsp;
			</template>
		</div>
	</template>

	<!-- BUILD OYA MON -->
	<template v-if="entry[0] === rf.HIST_BUILD_OYA_MON">
		<div
			class="log mainEntry selectableHistory"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			builds a monument at co-ordinates
			<span class="noBreak">{{ getHistoryCoordsForIndex(entry[3][0]) }}</span>
			<br />
			Using ritual good:
			<div class="RaiseGoodsRow">
				<template v-for="(ritualGoodRow, index1) in entry[3].slice(1, entry[3].length)" :key="index1">
					<!--R G ROW: {{ ritualGoodRow }}-->
					<template v-for="(item, index2) in ritualGoodRow" :key="index2">
						<template v-if="index2 === 0 || index2 === 2">
							<img
								class="historyCraftsmanRaiseImg"
								:class="'r' + String(getCraftsmanDataFromPriSq_Hist(item[0], true)[2])"
								:src="view.getImage('craftsman' + String(getCrafsmsnTileFromPriSq_Hist(item[0])))"
								:style="{
									'border-color': personal.getCorrectedColourHex(getPlayerForCraftsmanPriIndex_Hist(item[0]).colour),
								}"
								alt="Cman" />
							&nbsp;
							<span class="noBreak">{{ getHistoryCoordsForIndex(item[0]) }}</span>
							&nbsp;
							<span v-if="item[1] === 1">(1 hub</span>
							<span v-if="item[1] !== 1">({{ item[1] }} hubs</span>
							&nbsp;
							<span v-if="item[2] === 1">
								+1
								<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
								<!--cow-->
								)
							</span>
							<span v-if="item[2] !== 1">
								+{{ item[2] }}
								<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
								<!--cows-->
								)
							</span>
							&nbsp;
						</template>

						<template v-if="(index2 === 1 || index2 === 3) && typeof item === 'number'">
							<img class="historyResourceImg" :src="view.getImage(getResImgName(item))" alt="RRR" />
							&nbsp;
							<span class="noBreak">{{ getHistoryCoordsForIndex(item) }}</span>
							<template v-if="(index2 === 3 || ritualGoodRow.length === 2) && index1 !== entry[3].length - 2">
								<hr />
							</template>
							<template v-else><br /></template>
						</template>

						<template v-if="(index2 === 1 || index2 === 3) && typeof item === 'object'">
							<template v-for="(res, index3) in item" :key="index3">
								<span v-if="index3 === 1"><br /></span>
								<img class="historyResourceImg" :class="{ blacksmithSecondRes: index3 === 1 }" :src="view.getImage(getResImgName(res))" alt="RRR" />
								&nbsp;
								<span class="noBreak">{{ getHistoryCoordsForIndex(res) }}</span>
							</template>
							<template v-if="(index2 === 3 || ritualGoodRow.length === 2) && index1 !== entry[3].length - 2">
								<hr />
							</template>
							<template v-else><br /></template>
						</template>
					</template>
				</template>
				<hr />
				<hr />
			</div>
			<span v-html="getTotalRaiseCostHTML(entry[3].slice(1, entry[3].length), entry[1])"></span>
			<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
			<br />
		</div>
	</template>

	<!-- BID -->
	<template v-if="entry[0] === rf.HIST_BID">
		<div
			class="log mainEntry"
			:class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			<template v-if="entry[3][0] > 0">
				bids {{ entry[3][0] }}
				<span v-if="entry[3][0] !== 1">cows</span>
				<span v-else>cow</span>
				<span v-if="entry[3][2] > 0"> (Elegua gives {{ entry[3][2] }} free)</span>
				<span v-if="entry[3][2] === -1"> (Bid goes to Aja)</span>
			</template>
			<template v-else-if="entry[3][0] === 0">passes. New position: {{ entry[3][1] + 1 }}</template>
			<template v-else-if="entry[3][0] === -1">passes - Not enough cows to bid. New position: {{ entry[3][1] + 1 }}</template>
			<template v-else-if="entry[3][0] === -2">is the most generous. New position: 1</template>
			<template v-else-if="entry[3][0] === -3">performs a free pass with Aja</template>
		</div>
	</template>

	<!-- END BID PHASE -->
	<template v-if="entry[0] === rf.HIST_END_BIDS">
		<div class="log" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry endBidsDiv">
				<template v-for="(playerIdx, idx) in entry[3][0]" :key="idx">
					<span
						:class="['mainEntryPlayer']"
						:style="{
							'background-color': personal.getCorrectedColourHex(store.players[playerIdx].colour),
							color: personal.getCorrectedColour(store.players[playerIdx].colour) === rf.WHITE || personal.getCorrectedColour(store.players[playerIdx].colour) === rf.YELLOW ? 'black' : 'white',
						}">
						{{ store.players[playerIdx].displayName }}
					</span>
					gains {{ entry[3][1][idx] }}
					<span v-if="entry[3][1][idx] !== 1">cows</span>
					<span v-else>cow</span>
					. Total: {{ entry[3][2][idx] }}
					<span v-if="entry[3][2][idx] !== 1">cows</span>
					<span v-else>cow</span>
					.
					<br />
				</template>
			</div>
		</div>
	</template>

	<!-- CHOOSE god -->
	<template v-if="entry[0] === rf.HIST_CHOOSE_god">
		<div
			class="log mainEntry"
			:class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			<span v-if="entry[3][0] === rf.OGUN"> chooses Ogun and takes the Blacksmith technology card. </span><span v-else> chooses {{ rf.god_NAMES[entry[3][0]] }}. </span>
			
			VR increases by: {{ rf.gods_VR[entry[3][0]] }}
		</div>
	</template>

	<!-- ANYANWU MONUMENT LEVEL 3 -->
	<template v-if="entry[0] === rf.HIST_CHOOSE_ANYANWU_MON">
		<div
			class="log mainEntry selectableHistory"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			raises monument at co-ordinates
			<span class="noBreak">{{ getHistoryCoordsForIndex(entry[3]) }}</span>
			&nbsp; to level 3
		</div>
	</template>

	<!-- CHOOSE SPEC -->
	<template v-if="entry[0] === rf.HIST_CHOOSE_SPEC">
		<div
			class="log mainEntry"
			:class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			chooses {{ rf.SPEC_NAMES[entry[3][0]] }} ({{ rf.SPEC_COST[entry[3][0]] }} cows) VR +{{ rf.SPEC_VR[entry[3][0]] }}
		</div>
	</template>

	<!-- ADD HERD COWS -->
	<template v-if="entry[0] === rf.HIST_ADD_HERD_COWS">
		<div
			class="log mainEntry"
			:class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			adds {{ entry[3][1] }} to Herd. New size: {{ entry[3][0] }}
		</div>
	</template>

	<!-- BUILD RESOURCE -->
	<template v-if="entry[0] === rf.HIST_BUILD_RESOURCE">
		<div
			class="log mainEntry selectableHistory"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			<span v-if="entry[3][2] > 0">activates Shaman with {{ entry[3][2] }} cows and</span>
			builds
			<img class="historyResourceImg" :src="view.getImage('res' + String(entry[3][1]))" alt="RRR" />
			at co-ordinates
			<span class="noBreak">{{ getHistoryCoordsForIndex(entry[3][0]) }}</span>
		</div>
	</template>

	<!-- BUILD WATER -->
	<template v-if="entry[0] === rf.HIST_BUILD_WATER">
		<div
			class="log mainEntry selectableHistory"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			<span v-if="entry[3][2] > 0">activates Rain Ceremony with {{ entry[3][2] }} cows and</span>
			builds
			<img
				class="historyWaterImg"
				:src="view.getImage('res' + String(rf.WATER_TILE) + (entry[3][1] === 1 ? '_v' : ''))"
				alt="RRR"
				:style="{
					width: entry[3][1] === 0 ? '50px' : '25px',
					height: entry[3][1] === 0 ? '25px' : '50px',
				}" />
			at co-ordinates
			<span class="noBreak">{{ getHistoryCoordsForIndex(entry[3][0]) }}</span>
		</div>
	</template>

	<!-- ACTIVATE SPEC -->
	<template v-if="entry[0] === rf.HIST_ACTIVATE_SPEC">
		<div
			class="log mainEntry"
			:class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			activates {{ rf.SPEC_NAMES[entry[3][0]] }} with {{ entry[3][1] }} cows
		</div>
	</template>

	<!-- BUILD PRIMARY CRAFTSMAN -->
	<template v-if="entry[0] === rf.HIST_BUILD_CRAFTSMAN">
		<div
			class="log mainEntry selectableHistory"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			builds
			<img class="historyCraftsmanImg" :class="'r' + String(entry[3][2])" :src="view.getImage('craftsman' + String(entry[3][1]))" alt="Cman" />
			at
			<span class="noBreak">{{ getHistoryCoordsForIndex(entry[3][0]) }}</span>
			.
			{{ rf.COW_COST_TO_BUILD_CMAN[entry[3][1]] }}
			<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
			<span v-if="entry[3][3] !== 0">(Builder +{{ entry[3][3] }})</span>
			<span v-if="entry[3][4] !== -1">
				<br />
				Tech +{{ rf.TECH_VR[entry[3][4]] }} VR
				<img class="historyTechImg" :src="view.getImage('tech' + String(entry[3][4]))" alt="Tech" />
			</span>
		</div>
	</template>

	<!-- RAISE MONUMENT -->
	<!-- mon index, mon lvl -->
	<!-- cman_pri_idx, hubs, cost // res // x2 -->
	<template v-if="entry[0] === rf.HIST_RAISE_MON">
		<div
			class="log mainEntry selectableHistory"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			raises monument at
			<span class="noBreak">{{ getHistoryCoordsForIndex(entry[3][0][0]) }}</span>
			to level
			{{ entry[3][0][1] }}
			<br />
			<template v-if="YEMOJAused(entry) >= 0">
				<b>Yemoja</b>
				raised
				<span
					:class="['mainEntryPlayer']"
					:style="{
						'background-color': personal.getCorrectedColourHex(store.players[YEMOJAused(entry)].colour),
						color: personal.getCorrectedColour(store.players[YEMOJAused(entry)].colour) === rf.WHITE || personal.getCorrectedColour(store.players[YEMOJAused(entry)].colour) === rf.YELLOW ? 'black' : 'white',
					}">
					{{ store.players[YEMOJAused(entry)].displayName }}
				</span>
				's monument
				<br />
			</template>
			<div class="RaiseGoodsRow">
				<template v-for="(ritualGoodRow, index1) in entry[3].slice(1, entry[3].length)" :key="index1">
					<!-- NB -1 is the flag for using Ekwensu cowss 
					-		-2 is an OyaUsed flag -->
					<template v-if="ritualGoodRow[0] !== -1 && ritualGoodRow[0] !== -2">
						<!--R G ROW: {{ ritualGoodRow }}-->
						<template v-for="(item, index2) in ritualGoodRow" :key="index2">
							<template v-if="index2 === 0 || index2 === 2">
								<img
									class="historyCraftsmanRaiseImg"
									:class="'r' + String(getCraftsmanDataFromPriSq_Hist(item[0], true)[2])"
									:src="view.getImage('craftsman' + String(getCrafsmsnTileFromPriSq_Hist(item[0])))"
									:style="{
										'border-color': personal.getCorrectedColourHex(getPlayerForCraftsmanPriIndex_Hist(item[0]).colour),
									}"
									alt="Cman" />
								&nbsp;
								<span class="noBreak">{{ getHistoryCoordsForIndex(item[0]) }}</span>
								&nbsp;
								<span v-if="item[1] === 1">(1 hub</span>
								<span v-if="item[1] !== 1">({{ item[1] }} hubs</span>
								&nbsp;
								<span v-if="item[2] === 1">
									+1
									<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
									<!--cow-->
									)
								</span>
								<span v-if="item[2] !== 1">
									+{{ item[2] }}
									<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
									<!--cows-->
									)
								</span>
								&nbsp;
								<span v-if="item.length > 3 && item[3] === -3">
									<br />
									WATERTOLL toll paid for Craftsman
									<br />
								</span>
							</template>

							<!-- SIMPLE RESOURCE USED - is this legacy only??? -->
							<template v-if="(index2 === 1 || index2 === 3) && typeof item === 'number'">
								<img class="historyResourceImg" :src="view.getImage(getResImgName(item))" alt="RRR" />
								&nbsp;
								<span class="noBreak">{{ getHistoryCoordsForIndex(item) }}</span>

								<!-- NOW CHECK FOR COMPLETE PRIMARY SKIP -->
								<template v-if="index2 === 1 && ritualGoodRow.length === 2 && rf.SEC_CRAFTSMEN.includes(getCrafsmsnTileFromPriSq_Hist(ritualGoodRow[0][0]))">
									<br />
									(Primary Ritual good skipped with god power)
								</template>

								<template v-if="(index2 === 3 || ritualGoodRow.length === 2) && index1 !== entry[3].length - 2">
									<hr />
								</template>
								<template v-else><br /></template>
							</template>
							<!-- BLACKSMITH DOUBLE RESOURCE or single resource in array - Changed data to always use array, I think !!! ??? -->
							<template v-else-if="(index2 === 1 || index2 === 3) && typeof item === 'object' && item.length > 0">
								<template v-for="(res, index3) in item" :key="index3">
									<span v-if="index3 === 1"><br /></span>
									<!-- If WATERTOLL flag-->
									<span v-if="res !== -3">
										<img class="historyResourceImg" :class="{ blacksmithSecondRes: index3 === 1 }" :src="view.getImage(getResImgName(res))" alt="RRR" />
										&nbsp;
										<span class="noBreak">{{ getHistoryCoordsForIndex(res) }}</span>
									</span>
									<span v-else-if="res === -3">WATERTOLL Toll Paid for Resource</span>
								</template>
								<!-- NOW CHECK FOR COMPLETE PRIMARY SKIP -->
								<template v-if="index2 === 1 && ritualGoodRow.length === 2 && rf.SEC_CRAFTSMEN.includes(getCrafsmsnTileFromPriSq_Hist(ritualGoodRow[0][0]))">
									<br />
									(Primary Ritual good skipped with god power)
								</template>

								<!-- Check if 0 paid to pri - ie AS power -->
								<template v-else-if="index2 === 3 && ritualGoodRow[2][2] === 0">
									<br/>(Primary craftsman cost skipped with god power)<br/>
								</template>

								<template v-else><br /></template>
							</template>
							<!-- RESOURCE SKIP -->
							<template v-else-if="(index2 === 1 || index2 === 3) && item.length === 0">
								<br />
								(Resource skipped with god power)
								<br />
							</template>
						</template>
					</template>
				</template>
				<hr />
				<hr />
			</div>
			<template v-if="TIURAKHused(entry)">
				<b>Tiurakh</b>
				reduced the number of ritual goods required by 1
				<br />
			</template>
			<span v-html="getTotalRaiseCostHTML(entry[3].slice(1, entry[3].length), entry[1])"></span>
			<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
			<br />
			<template v-for="(ritualGoodRow, index1) in entry[3].slice(1, entry[3].length)" :key="index1">
				<template v-if="ritualGoodRow[0] === -1">
					<b>Ekwensu</b>
					paid for {{ ritualGoodRow[1] }}
					<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
				</template>
			</template>
		</div>
	</template>

	<!-- SET PRICES -->
	<template v-if="entry[0] === rf.HIST_SET_PRICES">
		<div
			class="log mainEntry"
			:class="{ selectableHistory: store.topMenuViews.showReplay }"
			@click="clickedHistoryEntry(entry[0], entry[3], entry_ID)"
			:style="{
				'background-image': 'url(' + view.getPlayerTribeImage(personal.getCorrectedColour(store.players[entry[1]].colour)) + ')',
			}">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span
				:class="['mainEntryPlayer']"
				:style="{
					'background-color': personal.getCorrectedColourHex(store.players[entry[1]].colour),
					color: personal.getCorrectedColour(store.players[entry[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[1]].colour) === rf.YELLOW ? 'black' : 'white',
				}">
				{{ store.players[entry[1]].displayName }}
			</span>
			sets prices:
			<template v-for="(craftsmanPrice, index1) in entry[3]" :key="index1">
				<template
					v-if="
						(store.players[entry[1]].craftsmen
							.map(function (el) {
								return el[1]
							})
							.indexOf(index1) > -1 &&
							craftsmanPrice > 0) ||
						(index1 === 7 && craftsmanPrice > 0)
					">
					<span class="noBreak">
						<img class="historyCraftsmanPriceImg" :class="'r' + String(1)" :src="view.getImage('craftsman' + String(index1))" alt="Cman" />
						<img class="historyCraftsmanPriceCowImg" :src="view.getImage('cows' + String(craftsmanPrice))" alt="Cow" />
					</span>
					&nbsp;
				</template>
			</template>
		</div>
	</template>

	<!-- REVENUES -->
	<template v-if="entry[0] === rf.HIST_REVENUES">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span class="centreSpan">
				<b><u>Revenue (in New Bidding Order)</u></b>
			</span>
			<template v-for="(entry, idx) in entry[3]" :key="idx">
				<span
					:class="['mainEntryPlayer']"
					:style="{
						'background-color': personal.getCorrectedColourHex(store.players[entry[0]].colour),
						color: personal.getCorrectedColour(store.players[entry[0]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[entry[0]].colour) === rf.YELLOW ? 'black' : 'white',
					}">
					{{ store.players[entry[0]].displayName }}
				</span>
				+{{ entry.reduce((a, b) => a + b, 0) - entry[5] - entry[0] }} Total: {{ entry[5] }} (
				<span v-if="entry[1] !== 0">+{{ entry[1] }} god,</span>
				<span v-if="entry[2] !== 0">+{{ entry[2] }} specialists,</span>
				<span v-if="entry[3] !== 0">+{{ entry[3] }} techs,</span>
				+{{ entry[4] }} monument)
				<br />
			</template>
		</div>
	</template>

	<!-- LET US COMPARE MYTHOLOGIES -->
	<template v-if="entry[0] === rf.HIST_COMPARE_MYTHOLOGIES">
		<div class="log mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<span class="centreSpan">
				<b><u>Let Us Compare Mythologies (Best First)</u></b>
			</span>
			<template v-for="(scoreObj, idx) in entry[3]" :key="idx">
				<span
					:class="['mainEntryPlayer']"
					:style="{
						'background-color': personal.getCorrectedColourHex(store.players[scoreObj[1]].colour),
						color: personal.getCorrectedColour(store.players[scoreObj[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[scoreObj[1]].colour) === rf.YELLOW ? 'black' : 'white',
					}">
					{{ store.players[scoreObj[1]].displayName }}
				</span>
				{{ scoreObj[2] }} / {{ scoreObj[3] }} (
				<span v-if="scoreObj[2] - scoreObj[3] >= 0">+</span>
				{{ scoreObj[2] - scoreObj[3] }})
				<br />
			</template>
		</div>
	</template>

	<!-- New Turn -->
	<template v-if="entry[0] === rf.HIST_NEW_TURN">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">Start of turn {{ entry[3][0] }}</div>
		</div>
	</template>

	<!-- GAME END -->
	<template v-if="entry[0] === rf.HIST_GAME_END">
		<div class="log separator" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry new_turn">
				Game Ended
				<br />
				<br />
				Winner: {{ store.players[entry[3][0][1]].displayName }}
				<br />
				<br />
				<span v-if="entry[3][0][2] === 1">Highest Difference Between VP / VR</span>
				<span v-if="entry[3][0][2] === 2">Xango wins ties with same difference between VP / VR</span>
				<span v-if="entry[3][0][2] === 3">Highest Total VP</span>
				<span v-if="entry[3][0][2] === 4">Earlier in Turn Order</span>
			</div>
		</div>
	</template>

	<!-- REWIND -->
	<template v-if="entry[0] === rf.HIST_REWIND">
		<div class="log">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">Game rewound to here by {{ store.players[entry[3][0]].name }}</div>
		</div>
	</template>

	<!-- RESIGN -->
	<template v-if="entry[0] === rf.HIST_RESIGN">
		<div class="log">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">{{ entry[3][0] }} Resigns</div>
		</div>
	</template>

	<!-- KICKOUT -->
	<template v-if="entry[0] === rf.HIST_KICKOUT">
		<div class="log">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">{{ entry[3][0] }} was kicked out</div>
		</div>
	</template>
</template>

<style scoped>
.newGameTribeImg {
	width: 50px;
	height: 50px;
	margin-right: 2px;
}

.centreSpan {
	display: table;
	margin: 0 auto;
}

.RaiseGoodsRow {
	line-height: 50px;
}

.miniCowImg {
	vertical-align: middle;
	width: 30px;
	height: 30px;
	border: 1px solid white;
}

.historyCraftsmanImg {
	width: 40px;
	border: 1px solid black;
	vertical-align: middle;
	margin-top: 2px;
}

.historyCraftsmanImg.r1 {
	margin-top: 4px;
	margin-bottom: 4px;
	vertical-align: baseline;
}

.historyCraftsmanRaiseImg {
	width: 40px;
	border: 5px solid;
	vertical-align: middle;
}

.historyCraftsmanPriceImg {
	width: 40px;
	border: 1px solid black;
	vertical-align: middle;
	margin-right: 5px;
}

.historyCraftsmanPriceCowImg {
	width: 30px;
	border: 1px solid black;
	vertical-align: middle;
	margin-right: 0px;
}

.historyResourceImg {
	width: 40px;
	height: 40px;
	border: 1px solid black;
	vertical-align: middle;
}

.historyTechImg {
	vertical-align: middle;
	width: 200px;
	margin-top: 2px;
}

.historyWaterImg {
	margin: 2px;
	border: 1px solid black;
	vertical-align: middle;
}

.historyWaterImg.r1 {
	vertical-align: baseline;
}

.noBreak {
	white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

#history {
	position: absolute;
	padding-top: 5px;
	left: 2px;
	top: 62px;
	width: 450px;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	/*overflow-y: scroll;
	direction: rtl;*/
	overflow-y: scroll;
	text-align: center;
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

.log .endBidsDiv {
	background-color: #d4eafd;
	text-align: left;
	color: #000;
	font-weight: bold;
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

.reverseHistory {
	display: flex;
	flex-direction: column-reverse;
}

.highlightHistDiv {
	border-color: yellow;
}

/* The switch - the box around the slider */
#historyToggleDiv .switch {
	position: relative;
	display: inline-block;
	width: 60px;
	height: 34px;
	margin-left: 10px;
	margin-right: 10px;
	vertical-align: middle;
}

/* Hide default HTML checkbox */
#historyToggleDiv .switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

/* The slider */
#historyToggleDiv .slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #2196f3;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

#historyToggleDiv .slider:before {
	position: absolute;
	content: "";
	height: 26px;
	width: 26px;
	left: 4px;
	bottom: 4px;
	background-color: white;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

#historyToggleDiv input:checked + .slider {
	background-color: #2196f3;
}

#historyToggleDiv input:focus + .slider {
	box-shadow: 0 0 1px #2196f3;
}

#historyToggleDiv input:checked + .slider:before {
	-webkit-transform: translateX(26px);
	-ms-transform: translateX(26px);
	transform: translateX(26px);
}

/* Rounded sliders */
#historyToggleDiv .slider.round {
	border-radius: 34px;
}

#historyToggleDiv .slider.round:before {
	border-radius: 50%;
}

.blacksmithSecondRes {
	margin-left: 251px;
}
</style>
