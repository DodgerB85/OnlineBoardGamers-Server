<script setup>
/** Each individual entry for the history
 *  EG new turn, resign, do an action, check game end, etc
 *
 *
 *
 */
import * as rf from "../js/AQYreference"
import * as refFuncs from "../js/AQYfuncs"
import * as view from "../js/AQYview"
import * as history from "../js/AQYhistory"
import * as replay from "../js/AQYreplay"
//import * as map from "../js/AQYmap"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

import { useI18n } from "vue-i18n"
const { t } = useI18n()

defineProps(["entry", "entry_ID"])

function clickedHistoryEntry(action, entry3, entry_id) {
	// If not replay, or if clicking on the replay entry, just do highlights
	if (!store.topMenuViews.showReplay || entry_id === -1) history.setupHistoryHighlight(action, entry3, entry_id)
	// Otherwise, you are clicking in history during replay
	else replay.goToReplayStep(entry_id)
}

function getBldgName(bldgNum) {
	if (bldgNum < 20) return rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]].name
	if (bldgNum === 100) return t("historyEntry.grave")
	return t("historyEntry.houseNumber", { number: bldgNum - 20 })
}

function getBldgCost(item) {
	if (!rf.BLDG_COMPLEX_COST.includes(item[0])) {
		if (item[0] > 20) return ""
		if (rf.BLDG_SINGLE_WOOD.includes(item[0])) return ` (<img class="singleResImgForCityHistoryBuildCost" src="${view.getImage("res_0")}" />)`
		if (rf.BLDG_SINGLE_STONE.includes(item[0])) return ` (<img class="singleResImgForCityHistoryBuildCost" src="${view.getImage("res_1")}" />)`
		if (rf.BLDG_DOUBLE_STONE.includes(item[0])) return ` (<img class="singleResImgForCityHistoryBuildCost" src="${view.getImage("res_1")}" /><img class="singleResImgForCityHistoryBuildCost" src="${view.getImage("res_1")}" />)`

		return " " + t("historyEntry.costNotFound") + " "
	}
	// Otherwise, must be complex building
	//return JSON.stringify(item)
	let costs = []
	if (rf.BLDG_ROTATABLE.includes(item[0])) costs = [...item[4]]
	else costs = [...item[3]]

	if (costs.length === 0) return " (" + t("historyEntry.free") + ") "
	let res = " ("
	for (let i = 0; i < costs.length; i++) {
		if (i > 0) res += ", "
		res += `<img class="singleResImgForCityHistoryBuildCost" src="${view.getImage("res_" + String(costs[i]))}" />`
	}
	res += ") "
	return res
}

function getGraveRemovedText(entry34) {
	let totalRemoved = 0
	for (let i = 0; i < entry34.length; i++) {
		totalRemoved += entry34[i].length
	}
	if (totalRemoved !== 1) return ` ${totalRemoved} ${t("historyEntry.graves")}`
	else return ` 1 ${t("historyEntry.grave")}`
}

function getNewPhaseText(entry3) {
	const histAction = entry3[0]
	if (histAction === rf.HIST_FIRST_CITY) return t("historyEntry.setup")
	if (histAction === rf.HIST_PHASE_CITY_BUILDING) return t("historyEntry.cityBuilding")
	if (histAction === rf.HIST_NEW_TURN_ORDER) return t("historyEntry.newTurnOrder")
	if (histAction === rf.HIST_PHASE_COUNTRYSIDE_BUILDING) return t("historyEntry.countrysideBuilding")
	if (histAction === rf.HIST_PHASE_GOODS_STORAGE) return t("historyEntry.goodsStorage")
	if (histAction === rf.HIST_PHASE_HARVEST) return t("historyEntry.harvest")
	if (histAction === rf.HIST_PHASE_EXPLORE) return t("historyEntry.explore")
	if (histAction === rf.HIST_PHASE_FAMINE) return t("historyEntry.famineLevelPhase", { level: entry3[1] })
	if (histAction === rf.HIST_PHASE_POLLUTION) return t("historyEntry.pollution")
	return t("historyEntry.unknown")
}
</script>

<template>
	<!-- *********************************************************** -->
	<!-- *********************** NON PLAYER ENTRIES **************** -->
	<!-- New Game -->
	<span v-if="personal.name === 'admin'">{{ entry[3] }}</span>
	<template v-if="entry[0] === rf.HIST_NEW_GAME">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				{{ $t("historyEntry.welcome") }}
				<br />
				<div v-for="(player, idx) in store.players" :key="idx" class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(player.colour)">{{ store.players[idx].name }}</span>
				</div>
			</div>
		</div>
	</template>

	<!-- New Turn -->
	<template v-if="entry[0] === rf.HIST_NEW_TURN">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				{{ $t("historyEntry.startOfTurn", { turn: entry[3][0] }) }}
				<br />
				{{ $t("historyEntry.famineLevel", { level: entry[3][1] }) }}
			</div>
		</div>
	</template>

	<!-- New Phase -->
	<template v-if="entry[0] === rf.HIST_NEW_PHASE">
		<div class="newPhaseDiv">
			{{ getNewPhaseText(entry[3]) }}
		</div>
	</template>

	<!-- Famine Increase -->
	<template v-if="entry[0] === rf.HIST_FAMINE_INCREASE">
		<div class="newPhaseDiv">
			{{ $t("historyEntry.famineLevelIncreases", { level: entry[3][0] }) }}
		</div>
	</template>

	<!-- GAME END -->
	<template v-if="entry[0] === rf.HIST_GAME_END">
		<div class="log separator" :class="{ selectableHistory: store.topMenuViews.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry new_turn">
				{{ $t("historyEntry.gameEnded") }}
				<br />
			</div>
		</div>
	</template>

	<!-- REWIND -->
	<template v-if="entry[0] === rf.HIST_REWIND">
		<div class="log">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">{{ $t("historyEntry.rewoundBy", { player: store.players[entry[3][0]].name }) }}</div>
		</div>
	</template>

	<!-- RESIGN -->
	<template v-if="entry[0] === rf.HIST_RESIGN">
		<div class="log">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">{{ $t("historyEntry.resigns", { player: entry[3][0] }) }}</div>
		</div>
	</template>

	<!-- GRAVE GAME OVER -->
	<template v-if="entry[0] === rf.HIST_GRAVE_GAME_OVER">
		<div class="log">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">
				{{ $t("historyEntry.playerEliminated") }}
				<br />
				{{ $t("historyEntry.noSpaceForGraves", { player: entry[3][0] }) }}
			</div>
		</div>
	</template>

	<!-- KICKOUT -->
	<template v-if="entry[0] === rf.HIST_KICKOUT">
		<div class="log">
			<div class="header">
				<span>{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}</span>
			</div>
			<div class="mainEntry rewind">{{ $t("historyEntry.kickedOut", { player: entry[3][0] }) }}</div>
		</div>
	</template>

	<!-- *********************************************************** -->
	<!-- *************************** PLAYER ENTRIES **************** -->
	<!-- ADD FIRST CITY -->
	<template v-if="entry[0] === rf.HIST_FIRST_CITY">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.buildsStartingCity" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- PLAYER TRADE -->
	<template v-if="entry[0] === rf.HIST_CITY_PLAYER_TRADE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.trades" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[3][0][0]].colour)">{{ personal.getHistoryName(entry[3][0][0]) }}</span></template>
				</i18n-t>
				<br />
				<i18n-t keypath="historyEntry.receives" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[3][0][0]].colour)">{{ personal.getHistoryName(entry[3][0][0]) }}</span></template>
				</i18n-t>
				<img v-for="(res, idx) in entry[3][1][1]" :key="idx" class="singleResImg" :src="view.getImage('res_' + String(res))" />
				<template v-if="entry[3][1].length > 2">
					<br />
					({{ rf.PHASE_STRINGS[entry[3][1][2][1]] }}):
					<b>{{ entry[3][1][2][0] }}</b>
				</template>
				<br />
				<i18n-t keypath="historyEntry.receives" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[3][1][0]].colour)">{{ personal.getHistoryName(entry[3][1][0]) }}</span></template>
				</i18n-t>
				<img v-for="(res, idx) in entry[3][0][1]" :key="idx" class="singleResImg" :src="view.getImage('res_' + String(res))" />
				<template v-if="entry[3][0].length > 2">
					<br />
					({{ rf.PHASE_STRINGS[entry[3][0][2][1]] }}):
					<b>{{ entry[3][0][2][0] }}</b>
				</template>
				<br />
			</div>
		</div>
	</template>

	<!-- CITY BUILDING -->
	<template v-if="entry[0] === rf.HIST_CITY_BUILD">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span>
				<template v-if="entry[3][0].length > 0">
					<br />
					<b>{{ $t("historyEntry.builds") }}</b>
					<span v-for="(item, idx) in entry[3][0]" :key="idx">
						<span v-if="idx !== 0">,</span>
						{{ getBldgName(item[0]) }}
						<span v-html="getBldgCost(item)"></span>
					</span>
					<br />
				</template>
				<template v-if="entry[3][1].length > 0">
					<b>{{ $t("historyEntry.moves") }}</b>
					<span v-for="(item, idx) in entry[3][1]" :key="idx">
						<span v-if="idx !== 0">,</span>
						{{ getBldgName(item[0]) }}
					</span>
					<br />
				</template>
				<template v-if="entry[3][2].length > 0">
					<b>{{ $t("historyEntry.mans") }}</b>
					<template v-for="(item, idx) in entry[3][2]" :key="idx">
						<span>
							<span v-if="idx !== 0">,</span>
							{{ getBldgName(item[0]) }}
						</span>
					</template>
					<br />
				</template>

				<template v-if="entry[3][3].length > 0">
					<b>{{ $t("historyEntry.tradesLabel") }}</b>
					<template v-for="(item, idx) in entry[3][3]" :key="idx">
						<img class="singleResImg" :src="view.getImage('res_' + String(item[0]))" />
						<img class="singleResImg" :src="view.getImage('res_' + String(item[1]))" />
						<div class="rightArrow"></div>
						<img class="singleResImg" :src="view.getImage('res_' + String(item[2]))" />
						<br />
					</template>
					<br />
				</template>

				<template v-if="entry[3][4].length > 0">
					<b>{{ $t("historyEntry.removes") }}</b>
					{{ getGraveRemovedText(entry[3][4]) }}
					<br />
				</template>

				<template v-if="entry[3][5] !== rf.SAINT_NONE">
					<b>{{ $t("historyEntry.choosesNewPatron") }}</b>
					{{ rf.SAINT_INFO[entry[3][5]].name }}
					<br />
				</template>

				<template v-if="entry[3][6] === 1">
					<b>{{ $t("historyEntry.razedCathedral") }}</b>
				</template>

				<template v-if="entry[3][0].length === 0 && entry[3][1].length === 0 && entry[3][2].length === 0">{{ $t("historyEntry.noCityAction") }}</template>
			</div>
		</div>
	</template>

	<!-- Add Pollutions -->
	<template v-if="entry[0] === rf.HIST_ADD_POLLUTIONS">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.addsPollution" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #count>{{ entry[3][0].length }}</template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- Add Pollutions and graves -->
	<template v-if="entry[0] === rf.HIST_ADD_POLLUIIONS_AND_GRAVES">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.addsPollutionAndGraves" tag="span" scope="global" :plural="entry[3][1].reduce((length, subarray) => length + subarray.length, 0)">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #pollution>{{ entry[3][0].length }}</template>
					<template #graves>{{ entry[3][1].reduce((length, subarray) => length + subarray.length, 0) }}</template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- Remove Pollutions -->
	<template v-if="entry[0] === rf.HIST_REMOVE_POLLUTION">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.removesPollution" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #count>{{ entry[3].length }}</template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- ADD WOODCUTTER -->
	<template v-if="entry[0] === rf.HIST_WOODCUTTER">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.buildsWoodcutter" tag="span" scope="global" :plural="entry[3][1].length + 1">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #count>{{ entry[3][1].length + 1 }}</template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- ADD MINE -->
	<template v-if="entry[0] === rf.HIST_MINE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.buildsMine" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #resource><img class="singleResImg" :src="view.getImage('res_' + String(entry[3][1]))" /></template>
				</i18n-t>
				<span v-if="entry[3][0] === 0">{{ $t("historyEntry.alreadySetFromMountainRange") }}</span>
				<span v-else-if="entry[3][0] === 1">{{ $t("historyEntry.settingMountainRangeResource") }}</span>
				{{ $t("historyEntry.withResourcesToHarvest", { count: entry[3][3].length + 1 }) }}
			</div>
		</div>
	</template>

	<!-- ADD FARM -->
	<template v-if="entry[0] === rf.HIST_FARM">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.buildsFarm" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #resource><img class="singleResImg" :src="view.getImage('res_' + String(entry[3][0]))" /></template>
				</i18n-t>
				{{ $t("historyEntry.withResourcesToHarvest", { count: entry[3][2].length + 1 }) }}
				<span v-if="entry[3].length >= 4">{{ $t("historyEntry.freeSeedFromBiology") }}</span>
			</div>
		</div>
	</template>

	<!-- ADD FISHERY -->
	<template v-if="entry[0] === rf.HIST_FISHERY">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.buildsFishery" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #resource><img class="singleResImg" :src="view.getImage('res_' + String(entry[3][1]))" /></template>
				</i18n-t>
				{{ $t("historyEntry.withResourcesToHarvest", { count: entry[3][2].length }) }}
			</div>
		</div>
	</template>

	<!-- ADD INN -->
	<template v-if="entry[0] === rf.HIST_INN">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.buildsInn" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #resource><img class="singleResImg" :src="view.getImage('res_' + String(entry[3][0]))" /></template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- ADD NEW CITY -->
	<template v-if="entry[0] === rf.HIST_NEW_CITY">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.buildsNewCity" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #resources>
						<img class="singleResImg" :src="view.getImage('res_0')" />
						<img class="singleResImg" :src="view.getImage('res_1')" />
						<img class="singleResImg" :src="view.getImage('res_' + String(entry[3][1][0]))" />
						<img class="singleResImg" :src="view.getImage('res_' + String(entry[3][1][1]))" />
						<img class="singleResImg" :src="view.getImage('res_' + String(entry[3][1][2]))" />
					</template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- STORE GOODS ACTION  -->
	<template v-if="entry[0] === rf.HIST_STORE_GOODS">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span>
				{{ $t("historyEntry.storesOnly") }}
				<template v-for="(res, idx) in entry[3]" :key="idx">
					<img class="singleResImg" :src="view.getImage('res_' + String(res))" />
				</template>
			</div>
		</div>
	</template>

	<!-- HARVEST !!!!NOTE!!!! this is basically the same as auto-harvest. Duplicated just for clarity mainly  -->
	<template v-if="entry[0] === rf.HIST_HARVEST">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span>
				<template v-if="entry[3].length === 0">{{ $t("historyEntry.harvestSkipped") }}</template>
				<template v-else>
					{{ $t("historyEntry.harvests") }}
					<template v-for="(item, idx) in entry[3]" :key="idx">
						<img v-if="item[2] === 1" class="singleResImg" :src="view.getImage('res_' + String(item[0]))" />
					</template>
					<template v-if="entry[3].some((entry) => entry[2] === 0)">
						<br />
						{{ $t("historyEntry.andDiscards") }}
						<template v-for="(item, idx) in entry[3]" :key="idx">
							<img v-if="item[2] === 0" class="singleResImg" :src="view.getImage('res_' + String(item[0]))" />
						</template>
					</template>
				</template>
			</div>
		</div>
	</template>

	<!-- EXPLORE  -->
	<template v-if="entry[0] === rf.HIST_EXPLORE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.exploresAndFinds" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
				</i18n-t>
				<img class="singleResImg" :src="view.getImage('res_' + String(entry[3][1]))" />
				<span v-if="rf.RES_FOODS.includes(entry[3][1])">
					<br />
					{{ $t("historyEntry.famineLevelIncreases", { level: entry[3][2] }) }}
				</span>
			</div>
		</div>
	</template>

	<!-- MANUAL SKIP EXPLORE TURN  -->
	<template v-if="entry[0] === rf.HIST_MANUAL_SKIP_EXPLORE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span>
				{{ $t("historyEntry.choseNotToExplore") }}
			</div>
		</div>
	</template>

	<!-- EXPLORE TURN NOW INVALID -->
	<template v-if="entry[0] === rf.HIST_INVALID_PRE_EXPLORE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span>
				{{ $t("historyEntry.preExploreInvalid") }}
			</div>
		</div>
	</template>

	<!-- FAMINE  -->
	<template v-if="entry[0] === rf.HIST_FAMINE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.placesGraves" tag="span" scope="global" :plural="entry[3].reduce((length, subarray) => length + subarray.length, 0)">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #count>{{ entry[3].reduce((length, subarray) => length + subarray.length, 0) }}</template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- *********************************************************** -->
	<!-- *************************** AUTO ACTIONS **************** -->

	<!-- CITY FOUNDTINS -->
	<template v-if="entry[0] === rf.HIST_CITY_FOUNTAINS">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<b>
					{{ entry[3][[0]] }} {{ $t("historyEntry.newFountain", entry[3][0]) }}
					.
				</b>
				{{ $t("historyEntry.newFamineLevel", { level: entry[3][1] }) }}
			</div>
		</div>
	</template>

	<!-- CITY CTHEDRALS -->
	<template v-if="entry[0] === rf.HIST_CITY_CATHEDRALS">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				{{ $t("historyEntry.newCathedralBuilt", entry[3][[0]]) }}
			</div>
		</div>
	</template>

	<!-- TURN ORDER PHASE -->
	<template v-if="entry[0] === rf.HIST_NEW_TURN_ORDER">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				{{ $t("historyEntry.newTurnOrderHeading") }}
				<br />
				<template v-for="(item, idx) in entry[3]" :key="idx">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[item[0]].colour)">{{ personal.getHistoryName(item[0]) }}</span>
					({{ item[1] }})
				</template>
			</div>
		</div>
	</template>

	<!-- SKIP COUNTRY BUILDING TURN -->
	<template v-if="entry[0] === rf.HIST_SKIP_COUNTRY_TURN">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.skipsCountryPhase" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- SKIP STORAGE TURN -->
	<template v-if="entry[0] === rf.HIST_SKIP_STORAGE_TURN">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.skipsStorage" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
				</i18n-t>
				<span v-if="entry[3][0] === 0">{{ $t("historyEntry.unlimitedStorage") }}</span>
				<span v-if="entry[3][0] === 1">{{ $t("historyEntry.noResources") }}</span>
				<span v-if="entry[3][0] === 2">{{ $t("historyEntry.enoughStorage") }}</span>
				<span v-if="entry[3][0] === 3">{{ $t("historyEntry.noStorage") }}</span>
			</div>
		</div>
	</template>

	<!-- CATHEDRAL FISH -->
	<template v-if="entry[0] === rf.HIST_CATHEDRAL_FISH">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.gainsWithSaintPower" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
					<template #resources>
						<img v-for="idx in entry[3][0]" :key="idx" class="singleResImg" :src="view.getImage('res_' + String(rf.RES_FISH))" />
					</template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- AUTO HARVEST -->
	<template v-if="entry[0] === rf.HIST_AUTO_HARVEST">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span>
				<template v-if="entry[3].length === 0">{{ $t("historyEntry.harvestSkipped") }}</template>
				<template v-else>
					{{ $t("historyEntry.autoHarvests") }}
					<template v-for="(item, idx) in entry[3]" :key="idx">
						<img v-if="item[2] === 1" class="singleResImg" :src="view.getImage('res_' + String(item[0]))" />
					</template>
					<template v-if="entry[3].some((entry) => entry[2] === 0)">
						<br />
						{{ $t("historyEntry.andDiscards") }}
						<template v-for="(item, idx) in entry[3]" :key="idx">
							<img v-if="item[2] === 0" class="singleResImg" :src="view.getImage('res_' + String(item[0]))" />
						</template>
					</template>
				</template>
			</div>
		</div>
	</template>

	<!-- SKIP EXPLORE TURN -- NOTE THIS HISTORY IS COMBINED ALL PLAYER WHO SKIPPED -->
	<template v-if="entry[0] === rf.HIST_SKIP_EXPLORE_TURN">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				{{ $t("historyEntry.exploreSkippedBy") }}
				<template v-for="(item, idx) in entry[3]" :key="idx">
					<br />
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[item[0]].colour)">{{ personal.getHistoryName(item[0]) }}</span>
					<span v-if="item[1] === 0">{{ $t("historyEntry.noExplorers") }}</span>
					<span v-if="item[1] === 1">{{ $t("historyEntry.noTilesInZoc") }}</span>
				</template>
			</div>
		</div>
	</template>

	<!-- SKIP FAMINE TURN -->
	<template v-if="entry[0] === rf.HIST_SKIP_FAMINE_TURN">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.skipsFamine" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
				</i18n-t>
			</div>
		</div>
	</template>

	<!-- SKIP POLLUTION TURN -->
	<template v-if="entry[0] === rf.HIST_SKIP_POLLUTION_TURN">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ refFuncs.timestampToString((personal.gameCreationTimestamp + entry[2]) * 1000) }}
				</span>
			</div>
			<div class="container">
				<i18n-t keypath="historyEntry.skipsPollution" tag="span" scope="global">
					<template #player><span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ personal.getHistoryName(entry[1]) }}</span></template>
				</i18n-t>
			</div>
		</div>
	</template>
</template>

<style scoped>
.playerScoreSummaryDiv {
	border: 1px solid white;
	display: inline-block;
	font-size: 20px;
	font-weight: bolder;
	margin: 4px;
	padding: 0px;
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

.singleResImg {
	margin-right: 5px;
	margin-bottom: 2px;
	border: 2px solid black;
	display: inline-block;
	height: 35px;
	cursor: default;
	vertical-align: middle;
}

:deep(.singleResImgForCityHistoryBuildCost) {
	/* Add your global CSS styles for the .singleResImg class here */
	margin-right: 0px;
	margin-bottom: 0px;
	border: 2px solid black;
	display: inline-block;
	height: 35px;
	cursor: default;
	vertical-align: middle;
}

.rightArrow {
	position: relative;
	width: 50px;
	height: 0;
	border-bottom: 10px solid black;
	display: inline-block;
	vertical-align: middle;
	margin-left: 4px;
	margin-right: 14px;
}

.rightArrow::after {
	content: "";
	width: 0;
	height: 0;
	border-top: 15px solid transparent;
	border-bottom: 15px solid transparent;
	border-left: 30px solid black;
	position: absolute;
	right: -10px;
	top: -10.5px;
}

.newPhaseDiv {
	margin: 5px;
	border: #000 1px solid;
	padding: 3px 3px 3px 3px;
	background-color: #000;
	text-align: center;
	color: #fff;
	font-weight: bolder;
}
</style>
