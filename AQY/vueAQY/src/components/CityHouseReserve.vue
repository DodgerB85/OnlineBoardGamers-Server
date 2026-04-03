<script setup>
/** This contains the reserve for all the houses
 */

import * as rf from "../js/AQYreference.js"
import * as city from "../js/AQYcity.js"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

const props = defineProps({
	playerIndexProp: {
		type: Number,
		required: true,
		default: 0,
		prop: "playerIndexProp", // Specify the name of the prop in the parent component
	},
})

function getBldgPath(bldg_str, offsetX, offsetY) {
	let path = [...rf.BLDG_DATA[bldg_str].path]
	let shiftX = path[0]
	path.shift()
	let houseWidth = rf.SMALL_SQ
	if (store.permanentSettings.housesInNumberOrder === 1) houseWidth *= 1.5
	if (store.permanentSettings.housesInNumberOrder === 2) houseWidth *= 2
	let ret = `M ${(offsetX + shiftX) * houseWidth} ${offsetY * houseWidth} `

	for (let i = 0; i < path.length; i++) {
		if (i % 2 == 0) ret += `l${path[i] * houseWidth} 0 `
		else ret += `l0 ${path[i] * houseWidth} `
	}
	return ret
}

function getTextPos(offsetX, offsetY) {
	// use with font size 34 for big central numbers
	let res = [offsetX * rf.SMALL_SQ + 19, offsetY * rf.SMALL_SQ + 23]

	// TL number
	//let res = [offsetX * rf.SMALL_SQ + 25, offsetY * rf.SMALL_SQ + 12]

	return res
}

function clickedHouse(houseNum) {
	// Clear Ghosts
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	let ghostPaths = document.getElementsByClassName("ghostPath")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
	for (let i = 0; i < ghostPaths.length; i++) ghostPaths[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	store.clearVars()

	store.context.cityBuildingToDisplay = houseNum
	store.context.cityBuildingBeingAddedRotation = 0
	store.context.cityBuildingToDisplayData = rf.BLDG_DATA["HOUSE"]

	if (!personal.canPlay()) return

	// If it's not adding buildings time, return
	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return
	if (store.gameflow.subPhase !== rf.SUB_PHASE_ADD_BUILDINGS && store.gameflow.subPhase !== rf.SUB_PHASE_SAINT_HOUSE) return

	// If you don't have the bldg, return
	// If you have the bldg already, return
	if (!city.canAddBuilding(props.playerIndexProp, houseNum)) return

	// If it's free, set up the highlight
	if ((houseNum >= 21 && houseNum <= 24) || (store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE && houseNum < store.context.saintHouse) || store.context.saintHousesThisTurn.includes(houseNum)) {
		store.context.cityBuildingBeingAdded = houseNum
		store.context.cityBuildingBeingAddedPayment = []
		city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
		store.context.action = rf.ACT_PLACE_BUILDING
		return
	}

	// Otherwise, just exit any saint house possibility
	store.context.saintHouse = -1
	store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS

	// If re-adding saint removed building, zero cost
	if (store.players[props.playerIndexProp].requiredRebuilds.some((subarray) => subarray.bldgNum === houseNum)) {
		store.context.action = rf.ACT_PLACE_BUILDING
		city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
		store.context.cityBuildingBeingAddedPayment = []

		store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay

		return
	}

	// Otherwise, check you can afford it
	let cost = rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25]
	let autoSelectedResources = [...city.autoSelectResources(props.playerIndexProp, store.context.cityBuildingToDisplay, cost)]
	if (autoSelectedResources[0] !== -1 && autoSelectedResources[0] !== -2) {
		store.context.action = rf.ACT_PLACE_BUILDING
		city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
		store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
		store.context.cityBuildingBeingAddedPayment = [...autoSelectedResources]
		store.context.action = rf.ACT_PLACE_BUILDING
	} else if (autoSelectedResources[0] === -1) store.context.action = rf.ACT_CHOOSE_BUILDING_PAYMENT
	else if (autoSelectedResources[0] === -2) store.context.cityBuildingBeingAddedPayment = [-1]
	/*let availableResources = store.players[props.playerIndexProp].availableResources

	let canAfford = true
	if (cost[0] > 0 && availableResources[rf.RES_GRAIN] + availableResources[rf.RES_SHEEP] + availableResources[rf.RES_OLIVES] + availableResources[rf.RES_FISH] < cost[0]) canAfford = false
	if (cost[1] > 0 && availableResources[rf.RES_GOLD] + availableResources[rf.RES_WINE] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_DYE] < cost[1]) canAfford = false

	if (store.sandboxMode) canAfford = true

	if (canAfford) {
		store.context.action = rf.ACT_CHOOSE_BUILDING_PAYMENT
		return
	}
	// Otherwise, you can't afford it
	store.context.cityBuildingBeingAddedPayment = [-1]*/
}

function getStrokeClass(houseNum) {
	if (store.players[props.playerIndexProp].requiredRebuilds.some((subarray) => subarray.bldgNum === houseNum)) return "strokeRed"
	else if (store.players[props.playerIndexProp].availableHouses.includes(houseNum) && store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE && houseNum < store.context.saintHouse) return "strokeSelectable"
	return "strokeBlack"
}

function getNumberFill(rawNum) {
	if (rawNum < store.context.saintHouse) return "yellow"
	let cost = rf.HOUSE_COSTS[rawNum - 25]

	if (cost && store.players[props.playerIndexProp].availableHouses.includes(rawNum)) {
		let autoSelectedResources = [...city.autoSelectResources(props.playerIndexProp, store.context.cityBuildingToDisplay, cost)]
		if (autoSelectedResources[0] === -2) {
			return "red"
		}
	}

	if (store.context.cityBuildingBeingAdded === rawNum) return "lightgreen"
	if (store.context.cityBuildingToDisplay === rawNum) return "lightgreen"

	return "white"
}
</script>

<template>
	Houses
	<br />
	<template v-if="store.permanentSettings.housesInNumberOrder === 0">
		<div class="houseIndexDiv" :style="{ left: '110px', top: '55px' }">Free</div>
		<div class="houseIndexDiv" :style="{ left: '47px', top: '140px' }">1-F</div>
		<div class="houseIndexDiv" :style="{ left: '90px', top: '188px' }">2D-F</div>
		<div class="houseIndexDiv" :style="{ left: '137px', top: '188px' }">3D-F</div>
		<div class="houseIndexDiv" :style="{ left: '185px', top: '188px' }">4D-F</div>

		<div class="houseIndexDiv" :style="{ left: '6px', top: '270px' }">1-L</div>
		<div class="houseIndexDiv" :style="{ left: '1px', top: '316px' }">2D-L</div>
		<div class="houseIndexDiv" :style="{ left: '1px', top: '364px' }">3D-L</div>
	</template>

	<div
		id="housesSVGdiv"
		:style="{
			width: String((rf.SMALL_SQ + 0.4 * (store.permanentSettings.housesInNumberOrder !== 0 ? 1 : 0) * rf.SMALL_SQ + 0.5 * (store.permanentSettings.housesInNumberOrder === 2 ? 1 : 0) * rf.SMALL_SQ) * 5) + 'px',
			height: String((rf.SMALL_SQ + 0.5 * (store.permanentSettings.housesInNumberOrder !== 0 ? 1 : 0) * rf.SMALL_SQ + 0.3 * (store.permanentSettings.housesInNumberOrder === 2 ? 1 : 0) * rf.SMALL_SQ) * 8) + 'px',
			'margin-left': (store.permanentSettings.housesInNumberOrder === 0 ? 1 : 0) * 30 + 'px',
			'margin-top': (store.permanentSettings.housesInNumberOrder === 0 ? 1 : 0) * 30 + 'px',
		}">
		<svg id="housesSVG" viewbox="0 100 -100 0">
			<g v-if="store.permanentSettings.housesInNumberOrder === 0">
				<path class="buildingSVGpath" @click="clickedHouse(21)" :fill="`url(#h_1)`" :d="getBldgPath('HOUSE', 0, 0)" :class="[store.players[playerIndexProp].availableHouses.includes(21) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(21)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(0, 0)[0]" :y="getTextPos(0, 0)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(21)">1</text>
				<path class="buildingSVGpath" @click="clickedHouse(22)" :fill="`url(#h_2)`" :d="getBldgPath('HOUSE', 1.2, 0)" :class="[store.players[playerIndexProp].availableHouses.includes(22) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(22)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(1.2, 0)[0]" :y="getTextPos(1.2, 0)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(22)">2</text>

				<path class="buildingSVGpath" @click="clickedHouse(23)" :fill="`url(#h_3)`" :d="getBldgPath('HOUSE', 2.4, 0)" :class="[store.players[playerIndexProp].availableHouses.includes(23) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(23)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(2.4, 0)[0]" :y="getTextPos(2.4, 0)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(23)">3</text>

				<path class="buildingSVGpath" @click="clickedHouse(24)" :fill="`url(#h_4)`" :d="getBldgPath('HOUSE', 3.6, 0)" :class="[store.players[playerIndexProp].availableHouses.includes(24) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(24)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(3.6, 0)[0]" :y="getTextPos(3.6, 0)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(24)">4</text>

				<path class="buildingSVGpath" @click="clickedHouse(25)" :fill="`url(#h_5)`" :d="getBldgPath('HOUSE', 0, 2.2)" :class="[store.players[playerIndexProp].availableHouses.includes(25) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(25)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(0, 2.2)[0]" :y="getTextPos(0, 2.2)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(25)">5</text>

				<path class="buildingSVGpath" @click="clickedHouse(26)" :fill="`url(#h_6)`" :d="getBldgPath('HOUSE', 0, 3.4)" :class="[store.players[playerIndexProp].availableHouses.includes(26) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(26)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(0, 3.4)[0]" :y="getTextPos(0, 3.4)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(26)">6</text>

				<path class="buildingSVGpath" @click="clickedHouse(27)" :fill="`url(#h_7)`" :d="getBldgPath('HOUSE', 1.2, 3.4)" :class="[store.players[playerIndexProp].availableHouses.includes(27) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(27)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(1.2, 3.4)[0]" :y="getTextPos(1.2, 3.4)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(27)">7</text>

				<path class="buildingSVGpath" @click="clickedHouse(29)" :fill="`url(#h_9)`" :d="getBldgPath('HOUSE', 2.4, 3.4)" :class="[store.players[playerIndexProp].availableHouses.includes(29) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(29)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(2.4, 3.4)[0]" :y="getTextPos(2.4, 3.4)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(29)">9</text>

				<path class="buildingSVGpath" @click="clickedHouse(32)" :fill="`url(#h_12)`" :d="getBldgPath('HOUSE', 3.6, 3.4)" :class="[store.players[playerIndexProp].availableHouses.includes(32) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(32)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(3.6, 3.4)[0]" :y="getTextPos(3.6, 3.4)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(32)">12</text>

				<path class="buildingSVGpath" @click="clickedHouse(28)" :fill="`url(#h_8)`" :d="getBldgPath('HOUSE', 0, 4.6)" :class="[store.players[playerIndexProp].availableHouses.includes(28) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(28)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(0, 4.6)[0]" :y="getTextPos(0, 4.6)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(28)">8</text>

				<path class="buildingSVGpath" @click="clickedHouse(31)" :fill="`url(#h_11)`" :d="getBldgPath('HOUSE', 1.2, 4.6)" :class="[store.players[playerIndexProp].availableHouses.includes(31) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(31)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(1.2, 4.6)[0]" :y="getTextPos(1.2, 4.6)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(31)">11</text>

				<path class="buildingSVGpath" @click="clickedHouse(34)" :fill="`url(#h_14)`" :d="getBldgPath('HOUSE', 2.4, 4.6)" :class="[store.players[playerIndexProp].availableHouses.includes(34) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(34)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(2.4, 4.6)[0]" :y="getTextPos(2.4, 4.6)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(34)">14</text>

				<path class="buildingSVGpath" @click="clickedHouse(36)" :fill="`url(#h_16)`" :d="getBldgPath('HOUSE', 3.6, 4.6)" :class="[store.players[playerIndexProp].availableHouses.includes(36) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(36)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(3.6, 4.6)[0]" :y="getTextPos(3.6, 4.6)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(36)">16</text>

				<path class="buildingSVGpath" @click="clickedHouse(30)" :fill="`url(#h_10)`" :d="getBldgPath('HOUSE', 0, 5.8)" :class="[store.players[playerIndexProp].availableHouses.includes(30) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(30)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(0, 5.8)[0]" :y="getTextPos(0, 5.8)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(30)">10</text>

				<path class="buildingSVGpath" @click="clickedHouse(35)" :fill="`url(#h_15)`" :d="getBldgPath('HOUSE', 1.2, 5.8)" :class="[store.players[playerIndexProp].availableHouses.includes(35) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(35)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(1.2, 5.8)[0]" :y="getTextPos(1.2, 5.8)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(35)">15</text>

				<path class="buildingSVGpath" @click="clickedHouse(38)" :fill="`url(#h_18)`" :d="getBldgPath('HOUSE', 2.4, 5.8)" :class="[store.players[playerIndexProp].availableHouses.includes(38) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(38)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(2.4, 5.8)[0]" :y="getTextPos(2.4, 5.8)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(38)">18</text>

				<path class="buildingSVGpath" @click="clickedHouse(39)" :fill="`url(#h_19)`" :d="getBldgPath('HOUSE', 3.6, 5.8)" :class="[store.players[playerIndexProp].availableHouses.includes(39) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(39)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(3.6, 5.8)[0]" :y="getTextPos(3.6, 5.8)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(39)">19</text>

				<path class="buildingSVGpath" @click="clickedHouse(33)" :fill="`url(#h_13)`" :d="getBldgPath('HOUSE', 0, 7)" :class="[store.players[playerIndexProp].availableHouses.includes(33) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(33)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(0, 7)[0]" :y="getTextPos(0, 7)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(33)">13</text>

				<path class="buildingSVGpath" @click="clickedHouse(37)" :fill="`url(#h_17)`" :d="getBldgPath('HOUSE', 1.2, 7)" :class="[store.players[playerIndexProp].availableHouses.includes(37) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(37)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(1.2, 7)[0]" :y="getTextPos(1.2, 7)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(37)">17</text>

				<path class="buildingSVGpath" @click="clickedHouse(40)" :fill="`url(#h_20)`" :d="getBldgPath('HOUSE', 2.4, 7)" :class="[store.players[playerIndexProp].availableHouses.includes(40) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(40)]"></path>
				<text class="houseSVGnumber" :x="getTextPos(2.4, 7)[0]" :y="getTextPos(2.4, 7)[1]" text-anchor="middle" dominant-baseline="middle" :fill="getNumberFill(40)">20</text>
			</g>

			<g v-if="store.permanentSettings.housesInNumberOrder === 1">
				<g v-for="idx in 20" :key="idx">
					<path class="buildingSVGpath" @click="clickedHouse(idx + 20)" :fill="`url(#h_${idx})`" :d="getBldgPath('HOUSE', 1.2 * ((idx - 1) % 4), Math.floor((idx - 1) / 4) * 1.7)" :class="[store.players[playerIndexProp].availableHouses.includes(idx + 20) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(idx + 20), { unaffordableRed: city.buildingNotAddedAndCannotAfford(playerIndexProp, idx + 20) }]"></path>
				</g>
			</g>

			<g v-if="store.permanentSettings.housesInNumberOrder === 2">
				<path class="buildingSVGpath" @click="clickedHouse(21)" :fill="`url(#h_1)`" :d="getBldgPath('HOUSE', 0, 0)" :class="[store.players[playerIndexProp].availableHouses.includes(21) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(21)]"></path>
				<path class="buildingSVGpath" @click="clickedHouse(22)" :fill="`url(#h_2)`" :d="getBldgPath('HOUSE', 1.2, 0)" :class="[store.players[playerIndexProp].availableHouses.includes(22) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(22)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(23)" :fill="`url(#h_3)`" :d="getBldgPath('HOUSE', 2.4, 0)" :class="[store.players[playerIndexProp].availableHouses.includes(23) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(23)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(24)" :fill="`url(#h_4)`" :d="getBldgPath('HOUSE', 3.6, 0)" :class="[store.players[playerIndexProp].availableHouses.includes(24) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(24)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(25)" :fill="`url(#h_5)`" :d="getBldgPath('HOUSE', 0, 1.2)" :class="[store.players[playerIndexProp].availableHouses.includes(25) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(25)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(26)" :fill="`url(#h_6)`" :d="getBldgPath('HOUSE', 0, 2.4)" :class="[store.players[playerIndexProp].availableHouses.includes(26) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(26)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(27)" :fill="`url(#h_7)`" :d="getBldgPath('HOUSE', 1.2, 2.4)" :class="[store.players[playerIndexProp].availableHouses.includes(27) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(27)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(29)" :fill="`url(#h_9)`" :d="getBldgPath('HOUSE', 2.4, 2.4)" :class="[store.players[playerIndexProp].availableHouses.includes(29) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(29)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(32)" :fill="`url(#h_12)`" :d="getBldgPath('HOUSE', 3.6, 2.4)" :class="[store.players[playerIndexProp].availableHouses.includes(32) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(32)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(28)" :fill="`url(#h_8)`" :d="getBldgPath('HOUSE', 0, 3.6)" :class="[store.players[playerIndexProp].availableHouses.includes(28) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(28)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(31)" :fill="`url(#h_11)`" :d="getBldgPath('HOUSE', 1.2, 3.6)" :class="[store.players[playerIndexProp].availableHouses.includes(31) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(31)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(34)" :fill="`url(#h_14)`" :d="getBldgPath('HOUSE', 2.4, 3.6)" :class="[store.players[playerIndexProp].availableHouses.includes(34) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(34)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(36)" :fill="`url(#h_16)`" :d="getBldgPath('HOUSE', 3.6, 3.6)" :class="[store.players[playerIndexProp].availableHouses.includes(36) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(36)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(30)" :fill="`url(#h_10)`" :d="getBldgPath('HOUSE', 0, 4.8)" :class="[store.players[playerIndexProp].availableHouses.includes(30) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(30)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(35)" :fill="`url(#h_15)`" :d="getBldgPath('HOUSE', 1.2, 4.8)" :class="[store.players[playerIndexProp].availableHouses.includes(35) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(35)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(38)" :fill="`url(#h_18)`" :d="getBldgPath('HOUSE', 2.4, 4.8)" :class="[store.players[playerIndexProp].availableHouses.includes(38) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(38)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(39)" :fill="`url(#h_19)`" :d="getBldgPath('HOUSE', 3.6, 4.8)" :class="[store.players[playerIndexProp].availableHouses.includes(39) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(39)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(33)" :fill="`url(#h_13)`" :d="getBldgPath('HOUSE', 0, 6)" :class="[store.players[playerIndexProp].availableHouses.includes(33) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(33)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(37)" :fill="`url(#h_17)`" :d="getBldgPath('HOUSE', 1.2, 6)" :class="[store.players[playerIndexProp].availableHouses.includes(37) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(37)]"></path>

				<path class="buildingSVGpath" @click="clickedHouse(40)" :fill="`url(#h_20)`" :d="getBldgPath('HOUSE', 2.4, 6)" :class="[store.players[playerIndexProp].availableHouses.includes(40) ? 'buildingSVGpathSelectable' : 'greyscale', getStrokeClass(40)]"></path>
			</g>
		</svg>
	</div>
</template>

<style scoped>
#housesSVG {
	margin: 0 auto;
	margin-right: 50px;
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
}

.buildingSVGpath {
	stroke: black;
	stroke-width: 3px;
}

.buildingSVGpathSelectable:hover {
	stroke: yellow;
	stroke-width: 8px;
	/*transform: translate(-2px, 2px);*/
}

.strokeBlack {
	stroke: black;
	stroke-width: 3px;
}

.strokeRed {
	stroke: red;
	stroke-width: 8px !important;
}

#housesSVGdiv {
	position: relative;
	display: inline-block;
}

.houseIndexDiv {
	position: absolute;
	font-weight: bolder;
	font-size: 15px;
}

.greyscale {
	filter: url(#grayscale-filter);
	/*filter: grayscale(100%) brightness(140%);*/
	/*opacity: 0.8; /* Adjust the value between 0 and 1 */
	/*; /* Adjust the value between 0% and 100% */
}

.strokeSelectable {
	stroke: yellow;
	stroke-width: 5px;
}

.strokeSelectable:hover {
	stroke: lightgreen !important;
	stroke-width: 5px;
}

.houseSVGnumber {
	pointer-events: none;
	font-size: 34px;
	stroke: black;
	stroke-width: 1.5px;
}

.unaffordableRed {
	filter: url(#red-unaffordable-filter);
}
</style>
