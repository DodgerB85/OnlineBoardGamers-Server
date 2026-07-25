<script setup>
import * as view from "../js/INDview.js"
import * as rf from "../js/INDreference.js"
import * as controller from "../js/INDcontroller.js"

import * as model from "../js/INDmodel.js"
import * as map from "../js/INDmap.js"
import * as mpf from "../js/INDshipping.js"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
import { computed } from "vue"
const personal = usePersonalStore()

function getManualShipNetIncome(entry) {
	let goodIncome = rf.GOOD_INCOME[model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).good]
	let shipCost = (entry.length - 4) * 5
	if (entry[1] !== controller.currentPlayerIndex()) return goodIncome - shipCost
	else return goodIncome
}

function getManualShipTotalIncomes() {
	let res = []
	res.push([controller.currentPlayerIndex(), 0, 0])
	let goodIncome = rf.GOOD_INCOME[model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).good]
	// Calculate the main player income
	let totalGoodsSold = computedManualShipping.value.length
	let mainIncome = goodIncome * totalGoodsSold

	// Now transfer money to the ships
	for (let i = 0; i < computedManualShipping.value.length; i++) {
		let shipsIncome = (computedManualShipping.value[i].length - 4) * 5
		mainIncome -= shipsIncome
		const playerIndex = computedManualShipping.value[i][1]
		let shipSubsidy = 0
		if (store.useShippingSubsidy && playerIndex !== controller.currentPlayerIndex()) {
			shipSubsidy = (store.players[playerIndex].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX]-1) * rf.SHIPPING_SUBSIDY_MULTIPLIER
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
	store.historyHelpers.histCitiesToHighlight = store.context.historyObj.slice(1).map((entry) => entry[entry.length - 1])
}

const computedManualShipping = computed(() => {
	let manualShipping = JSON.parse(JSON.stringify(store.context.historyObj))
	manualShipping.shift()
	return manualShipping
})

function localRemoveShippingRow(entry) {
	// In case you need to remove the "No more deliveries poss msg"
	store.clearMessages()

	// Do this in case action is set to confirming delivery
	store.context.action = rf.ACT_NONE

	store.stopFlashingGoodsJourney()
	model.UNdeliverGoodsToCity_core(controller.currentPlayerIndex(), entry)
	const index = store.context.historyObj.findIndex((item) => {
		// Custom comparison logic - you may need to adjust this based on your object structure
		return JSON.stringify(item) === JSON.stringify(entry)
	})
	store.context.historyObj.splice(index, 1)

	// Do this to recalc max Poss
	model.checkForResponseAfterDeliverGoodsToCity(store.context.historyObj[0])
}
</script>

<template>
	<div id="manualShipDiv" >
		Current Deliveries:
		<br />
		(Click a row to view that good movement)
		<table id="manualShipPlayerTable">
			<thead>
				<tr>
					<th><b>Player</b></th>
					<th><b>Ships</b></th>
					<th><b>Ship cost</b></th>
					<th><b>Net Income</b></th>
					<th><b>City</b></th>
					<th><b>Remove</b></th>
				</tr>
			</thead>
			<tbody>
				<!-- journeys.push([].concat([goodId, shipCompany.player, shipCompany.id], trace, [city])) -->
				<tr v-for="(entry, idx) in computedManualShipping" :key="idx">
					<!-- Player-->
					<td @click="localClickedShippingRow(entry)">
						<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
						<svg class="shipSVG">
							<image class="shipIMG" :filter="view.getShipMarkerMainFilterURLfromPlayerIndex(entry[1])" :xlink:href="view.getImage(model.getActiveCompanyDataFromID(entry[2]).shipGfx)" alt="Ship" />
						</svg>
					</td>
					<!-- Ship Count -->
					<td @click="localClickedShippingRow(entry)">{{ entry.length - 4 }}</td>
					<!-- Ship Cost -->
					<td v-if="entry[1] === controller.currentPlayerIndex()" class="greenText" @click="localClickedShippingRow(entry)">0</td>
					<td v-else class="redText" @click="localClickedShippingRow(entry)">{{ (entry.length - 4) * 5 }}</td>
					<!-- Net Income -->
					<td :class="getManualShipNetIncome(entry) >= 0 ? 'greenText' : 'redText'" @click="localClickedShippingRow(entry)">{{ getManualShipNetIncome(entry) }}</td>
					<!-- City -->
					<td @click="localClickedShippingRow(entry)">
						{{ view.getProvinceString(map.getProvinceFromTerrID(entry[entry.length - 1])) }}

						<img class="manualShipCityImg" :src="view.getImage('city_' + String(store.cities.find((city) => city.territory === entry[entry.length - 1]).size))" alt="city" />
					</td>
					<!-- Remove -->
					<td class="removeTD" @click="localRemoveShippingRow(entry)">
						<div class="close"></div>
					</td>
				</tr>
				<!--
				<tr class="emptyRow" v-for="emptyRow in Array.from({ length: store.context.maxPoss - computedManualShipping.length })" :key="emptyRow">
					<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
				</tr>
			-->
			</tbody>
		</table>
		<span v-if="computedManualShipping.length === 0">
			<br />
			No Deliveries
			<br />
			<br />
		</span>
		Total Income:
		<template v-for="(incomeEntry, idx) in getManualShipTotalIncomes()" :key="idx">
			&nbsp;
			<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[incomeEntry[0]].colour)">{{ store.players[incomeEntry[0]].displayName }}</span>
			{{ incomeEntry[1] }}
			<span v-if="incomeEntry[2] > 0">
				(+{{ incomeEntry[2] }} Subsidy)
			</span>
		</template>
		<br />

		<button class="actionsLineButton" @click="localShowCities">Show Destination Cities</button>
	</div>
</template>

<style scoped>
/*** Manual SHIP CSS */
.mainEntryPlayer {
	margin-top: 0px !important;
}
#manualShipDiv {
	border: 2px solid black;
	padding: 5px;
	width: fit-content;
	margin: auto;
}
#manualShipPlayerTable {
	border-collapse: collapse;
	min-width: 600px;
	margin: auto;
}

#manualShipPlayerTable td,
#manualShipPlayerTable th {
	border: 1px solid #ddd;
	padding: 5px;
}

#manualShipPlayerTable tr {
	cursor: pointer;
	text-align: center;
}

#manualShipPlayerTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

#manualShipPlayerTable tr:nth-child(odd) {
	background-color: white;
}

#manualShipPlayerTable tr:hover {
	background-color: #ddd;
}

#manualShipPlayerTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

.manualShipCityImg {
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

.close {
	height: 50px;
	width: 50px;
	border-radius: 5px;
	position: relative;
	margin: 0 auto;
	&:after {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		content: "\274c";
		font-size: 25px;
		color: #fff;
		line-height: 50px;
		text-align: center;
	}
}
.removeTD {
	background-color: white !important;
}
.removeTD:hover {
	background-color: lightgreen !important;
}
.emptyRow {
	height: 71px;;
}
</style>
