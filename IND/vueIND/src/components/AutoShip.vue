<script setup>
import * as view from "../js/INDview.js"
import * as rf from "../js/INDreference.js"
import * as controller from "../js/INDcontroller.js"
import * as mpf from "../js/INDshipping.js"
import * as model from "../js/INDmodel.js"
import * as map from "../js/INDmap.js"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
//import { nextTick } from 'vue';
const personal = usePersonalStore()

function getAutoShipNetIncome(entry) {
	let goodIncome = rf.GOOD_INCOME[model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).good]
	let shipCost = (entry.length - 4) * 5
	if (entry[1] !== controller.currentPlayerIndex()) return goodIncome - shipCost
	else return goodIncome
}

function getAutoShipTotalIncomes() {
	let res = []
	res.push([controller.currentPlayerIndex(), 0, 0])
	let goodIncome = rf.GOOD_INCOME[model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).good]
	// Calculate the main player income
	let totalGoodsSold = store.context.maxPossData.length
	let mainIncome = goodIncome * totalGoodsSold

	// Now transfer money to the ships
	for (let i = 0; i < store.context.maxPossData.length; i++) {
		let shipsIncome = (store.context.maxPossData[i].length - 4) * 5
		mainIncome -= shipsIncome
		const playerIndex = store.context.maxPossData[i][1]
		let shipSubsidy = 0
		if (store.useShippingSubsidy && playerIndex !== controller.currentPlayerIndex()) {
			shipSubsidy = (store.players[playerIndex].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] - 1) * rf.SHIPPING_SUBSIDY_MULTIPLIER
		}
		let subArr = res.find((subArr) => subArr[0] === playerIndex)
		if (subArr === undefined) {
			res.push([playerIndex, shipsIncome, shipSubsidy])
		} else {
			subArr[1] += shipsIncome
			subArr[2] += shipSubsidy
		}
	}

	res[0][1] += mainIncome

	return res
}

function localRecalcMaxPoss() {
	store.clearHistoryHelpers()
	const playerIndex = controller.currentPlayerIndex()
	let maxPossRet = mpf.getCheapestMaxPossibleShipmentsFromSlotIDX(
		store.cities,
		store.activeCompanies,
		store.players.map((_, n) => (n == playerIndex ? 0 : store.context.unfavouredPlayerIndexes[n] ? 2 : 1)),
		store.players.map((_, n) => store.useShippingSubsidy && store.context.unfavouredPlayerIndexes[n] ? store.players[n].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] - 1 : 0),
		store.players.map((player) => player.slots),
		playerIndex,
		store.context.selectedSlotToOperate,
		store.context.historyObj.slice(1)
	)
	// NO - the max poss should only be set when you start operating a slot
	//store.context.maxPoss = maxPossRet.length
	store.context.maxPossData = [...maxPossRet]

	// WHY???
	store.removeAllActiveHighlights() 
	//model.setupSlotToOperate(controller.currentPlayerIndex(), store.context.selectedSlotToOperate)

	// WHY???
	model.checkForResponseAfterDeliverGoodsToCity(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate])
}

function localShipAuto() {
	store.removeAllActiveHighlights()
	store.clearHistoryHelpers()
	store.context.canChangeOperatingCompany = false
	model.autoShip(controller.currentPlayerIndex(), store.context.selectedSlotToOperate, store.context.maxPossData)
}

/*function localShowShipping() {
	store.context.showShippingArray = mpf.makeShowShippingArray(store.context.maxPossData)
}*/

function localClickedShippingRow(entry) {
	store.historyHelpers.histCitiesToHighlight.splice(0)
	store.context.showShippingArray.splice(0)
	const displayArray = []
	const goodJourney = entry
	// Prod Terr ID
	displayArray.push([0, goodJourney[0]])
	for (let j = 3; j < goodJourney.length - 1; j++) {
		// Ship terrs = [compID, terrID]
		displayArray.push([1, [goodJourney[2], goodJourney[j]]])
	}
	// City terrID
	displayArray.push([2, goodJourney[goodJourney.length - 1]])

	store.context.showShippingArray = displayArray
}

function localShowCities() {
	store.context.showShippingArray.splice(0)
	store.historyHelpers.histCitiesToHighlight.splice(0)
	store.historyHelpers.histCitiesToHighlight = store.context.maxPossData.map((entry) => entry[entry.length - 1])
}

function copyRoute(entry) {
	store.stopFlashingGoodsJourney()
	// No, this is done during deliverGoodsToCity_core
	//store.context.historyObj.push(entry)
	store.context.maxPossData.splice(store.context.maxPossData.indexOf(entry), 1)
	let playerIndex = controller.currentPlayerIndex()
	model.deliverGoodsToCity_core(playerIndex, store.players[playerIndex].slots[store.context.selectedSlotToOperate], entry, true)

	// Do this to recalc max Poss
	model.checkForResponseAfterDeliverGoodsToCity(store.context.historyObj[0], true)
}

function toggleCheckbox(playerIndexToggled) {
	store.clearHistoryHelpers()

	store.context.unfavouredPlayerIndexes[playerIndexToggled] = !store.context.unfavouredPlayerIndexes[playerIndexToggled]
	const playerIndex = controller.currentPlayerIndex()
	//let slotIdx = controller.currentPlayerObj().slots.findIndex((s) => s === store.context.selectedSlotToOperate)
	let maxPossRet = mpf.getCheapestMaxPossibleShipmentsFromSlotIDX(
		store.cities,
		store.activeCompanies,
		store.players.map((_, n) => (n == playerIndex ? 0 : store.context.unfavouredPlayerIndexes[n] ? 2 : 1)),
		store.players.map((_, n) => store.useShippingSubsidy && store.context.unfavouredPlayerIndexes[n] ? store.players[n].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] - 1 : 0),
		store.players.map((player) => player.slots),
		playerIndex,
		store.context.selectedSlotToOperate,
		store.context.historyObj.slice(1)
	)
	/**************************** */
	// NO - the max poss should only be set when you start operating a slot
	//store.context.maxPoss = maxPossRet.length
	store.context.maxPossData = [...maxPossRet]

	// WHY???
	//store.removeAllActiveHighlights()
	//model.setupSlotToOperate(controller.currentPlayerIndex(), store.context.selectedSlotToOperate)
	// WHY???
	//model.checkForResponseAfterDeliverGoodsToCity(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate])
}
</script>

<template>
	<div class="sideBySide" id="autoShipDiv">
		<span v-if="store.context.historyObj.length === 1">You can ship the most possible goods in the cheapest way as
			follows:</span>
		<span v-else>You can ship the remaining goods in the cheapest way as follows:</span>
		<br />
		(Click a row to view that good movement)
		<table id="autoShipPlayerTable">
			<thead>
				<tr>
					<th><b>Player</b></th>
					<th><b>Ships</b></th>
					<th><b>Ship cost</b></th>
					<th><b>Net Income</b></th>
					<th><b>City</b></th>
					<th><b>Ship Good</b></th>
				</tr>
			</thead>
			<tbody>
				<!-- journeys.push([].concat([goodId, shipCompany.player, shipCompany.id], trace, [city])) -->
				<tr v-for="(entry, idx) in store.context.maxPossData" :key="idx">
					<!-- Player-->
					<td @click="localClickedShippingRow(entry)">
						<span class="mainEntryPlayer"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{
								store.players[entry[1]].displayName }}</span>
						<svg class="shipSVG">
							<image class="shipIMG" :filter="view.getShipMarkerMainFilterURLfromPlayerIndex(entry[1])"
								:xlink:href="view.getImage(model.getActiveCompanyDataFromID(entry[2]).shipGfx)"
								alt="Ship" />
						</svg>
					</td>
					<!-- Ship Count -->
					<td @click="localClickedShippingRow(entry)">{{ entry.length - 4 }}</td>
					<!-- Ship Cost -->
					<td v-if="entry[1] === controller.currentPlayerIndex()" class="greenText"
						@click="localClickedShippingRow(entry)">0</td>
					<td v-else class="redText" @click="localClickedShippingRow(entry)">{{ (entry.length - 4) * 5 }}</td>
					<!-- Net Income -->
					<td :class="getAutoShipNetIncome(entry) >= 0 ? 'greenText' : 'redText'"
						@click="localClickedShippingRow(entry)">{{ getAutoShipNetIncome(entry) }}</td>
					<!-- City -->
					<td @click="localClickedShippingRow(entry)">
						{{ view.getProvinceString(map.getProvinceFromTerrID(entry[entry.length - 1])) }}

						<img class="autoShipCityImg"
							:src="view.getImage('city_' + String(store.cities.find((city) => city.territory === entry[entry.length - 1]).size))"
							alt="city" />
					</td>
					<!-- Copy -->
					<td class="copyTD" @click="copyRoute(entry)">
						<div class="arrow"></div>
					</td>
				</tr>
			</tbody>
		</table>
		<template v-if="store.context.maxPossData.length > 0">
			Total Income:
			<template v-for="(incomeEntry, idx) in getAutoShipTotalIncomes()" :key="idx">
				&nbsp;
				<span class="mainEntryPlayer"
					:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[incomeEntry[0]].colour)">{{
						store.players[incomeEntry[0]].displayName }}</span>
				{{ incomeEntry[1] }}
				<span v-if="incomeEntry[2] > 0">
					(+{{ incomeEntry[2] }} Subsidy)
				</span>
			</template>
			<br />

			There may be more than 1 lowest cost solution
			<br />
			<div class="expertDiv" v-if="store.players.length > 2">
				<b><u>Expert Option</u></b>
				<br />
				Favour these players to ship
				<br />
				<template v-for="(player, playerIndex) in store.players" :key="playerIndex">
					<template v-if="playerIndex !== controller.currentPlayerIndex()">
						<label>
							<span class="mainEntryPlayer turnOrderSpan"
								:class="'mainEntryPlayer' + personal.getCorrectedColour(player.colour)">
								{{ player.displayName }}
							</span>
							<input @change="toggleCheckbox(playerIndex)" type="checkbox"
								:checked="!store.context.unfavouredPlayerIndexes[playerIndex]" />
						</label>
					</template>
				</template>
				<br />
				Altering this could end up in lower net income - see
				<a class="linkOther" href="/IND/help/#navShipPlayerPreference" target="_blank">Help</a>
				for info
			</div>
			<button class="actionsLineButton" @click="localRecalcMaxPoss">Recalculate</button>
			<!--<button class="actionsLineButton" @click="localShowShipping">Show Shipping</button>-->
			<button class="actionsLineButton" @click="localShowCities">Show Destination Cities</button>
			<button class="actionsLineButton" @click="localShipAuto">
				<span v-if="store.context.historyObj.length === 1">Auto Ship</span>
				<span v-else>Auto Ship Remaining Goods</span>
			</button>
		</template>
		<template
			v-else-if="store.context.maxPossData.length === 0 && store.context.historyObj.length - 1 === store.context.maxPoss">
			<br />
			You have shipped all possible goods
		</template>
		<template v-else>
			<br />
			<span class="deliveryTooSmallError">
				Your manual shipping has blocked some deliveries
				<br />
				As per the rules, you must ship at least {{ store.context.maxPoss }}
				<span v-if="store.context.maxPoss === 1">good</span>
				<span v-else>goods</span>
			</span>
		</template>
		<template
			v-if="store.context.maxPossData.length > 0 && store.context.maxPossData.length + store.context.historyObj.length - 1 < store.context.maxPoss">
			<br />
			<span class="deliveryTooSmallError">
				Your manual shipping has blocked some deliveries
				<br />
				As per the rules, you must ship at least {{ store.context.maxPoss }}
				<span v-if="store.context.maxPoss === 1">good</span>
				<span v-else>goods</span>
			</span>
		</template>
	</div>
</template>

<style scoped>
/*.container {
	display: flex;
	justify-content: center;
	align-items: center;
}
.sideBySide {
	display: inline-block;
}*/
.expertDiv {
	border: 2px solid darkblue;
	background-color: lightsalmon;
	font-weight: bolder;
	min-width: fit-content;
	height: fit-content;
	padding: 10px;
	margin: auto;
	margin-right: 5px;
}

/*** AUTO SHIP CSS */
.mainEntryPlayer {
	margin-top: 0px !important;
}

#autoShipDiv {
	border: 2px solid black;
	padding: 5px;
	width: fit-content;
	margin: auto;
}

#autoShipPlayerTable {
	border-collapse: collapse;
	min-width: 500px;
	margin: auto;
}

#autoShipPlayerTable td,
#autoShipPlayerTable th {
	border: 1px solid #ddd;
	padding: 5px;
}

#autoShipPlayerTable tr {
	cursor: pointer;
	text-align: center;
}

#autoShipPlayerTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

#autoShipPlayerTable tr:nth-child(odd) {
	background-color: white;
}

#autoShipPlayerTable tr:hover {
	background-color: #ddd;
}

#autoShipPlayerTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

.autoShipCityImg {
	width: 20px;
	height: 20px;
	vertical-align: middle;
}

.shipSVG {
	width: 21px;
	height: 21px;
}

.shipIMG {
	width: 100%;
	height: 100%;
}

.copyTD {
	background-color: white !important;
}

.copyTD:hover {
	background-color: lightgreen !important;
}

.arrow {
	width: 0;
	height: 0;
	border-top: 30px solid transparent;
	border-bottom: 30px solid transparent;
	border-left: 30px solid #5875f8;
	position: relative;
	margin: 0 0 0 50px;
}

.arrow::before {
	content: "";
	height: 25px;
	width: 40px;
	background: #5875f8;
	position: absolute;
	top: 0;
	margin: -100%;
	display: block;
	transform: translateX(-160%) translateY(-50%);
}

.deliveryTooSmallError {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
</style>
