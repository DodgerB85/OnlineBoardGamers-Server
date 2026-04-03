<script setup>
/** This is the City top building store
 * IE multi-build bldgs, player res, player bldgs
 */

//import * as view from "../js/AQYview.js"
import * as rf from "../js/AQYreference.js"
import * as city from "../js/AQYcity.js"

import ResourceTable from "./ResourceTable.vue"
import CityPlayerInfo from "./CityPlayerInfo.vue"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

//defineProps(['playerIndex', 'playerIndex'])
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
	let ret = `M ${(offsetX + shiftX) * rf.SMALL_SQ} ${offsetY * rf.SMALL_SQ} `

	for (let i = 0; i < path.length; i++) {
		if (i % 2 == 0) ret += `l${path[i] * rf.SMALL_SQ} 0 `
		else ret += `l0 ${path[i] * rf.SMALL_SQ} `
	}

	return ret
}

function clickedBuilding(building) {
	// Clear Ghosts
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	let ghostPaths = document.getElementsByClassName("ghostPath")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
	for (let i = 0; i < ghostPaths.length; i++) ghostPaths[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	store.clearVars()

	store.context.cityBuildingToDisplay = building
	store.context.cityBuildingBeingAddedRotation = 0
	store.context.cityBuildingToDisplayData = rf.BLDG_DATA[rf.BLDG_ARRAY[store.context.cityBuildingToDisplay]]

	if (!personal.canPlay()) return

	// If it's not adding buildings time, return
	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return
	if (store.gameflow.subPhase !== rf.SUB_PHASE_ADD_BUILDINGS) return

	// If you have the bldg already, return
	if (!city.canAddBuilding(props.playerIndexProp, building)) return

	// SANDBOX shortcut to highlight squares / costs action

	// If you have the basic resources, highlight squares and move to add building phase
	// cost = [WOOD, STONE, LUX]
	// Cost can ONLY be 1 wood, 1 stone, 1 lux, or 2d lux
	let cost = store.context.cityBuildingToDisplayData.cost

	// If re-adding saint removed building, zero cost
	if (store.players[props.playerIndexProp].requiredRebuilds.some((subarray) => subarray.bldgNum === building)) {
		store.context.action = rf.ACT_PLACE_BUILDING
		city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
		store.context.cityBuildingBeingAddedPayment = []

		store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
		if (building === rf.BLDG_STORAGE) {
			const storageIndex = store.players[props.playerIndexProp].requiredRebuilds.findIndex((subarray) => subarray.bldgNum === rf.BLDG_STORAGE)
			store.context.newStorageWidth = store.players[props.playerIndexProp].requiredRebuilds[storageIndex].width
			store.context.newStorageHeight = store.players[props.playerIndexProp].requiredRebuilds[storageIndex].height
		}
		return
	}

	let availableResources = store.players[props.playerIndexProp].availableResources

	if (store.sandboxMode) availableResources = [99, 99, 99, 99, 99, 99, 99, 99, 99, 99]

	if (cost[0] === 1 && availableResources[rf.RES_WOOD] > 0) {
		store.context.action = rf.ACT_PLACE_BUILDING
		city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
		store.context.cityBuildingBeingAddedPayment = [rf.RES_WOOD]
		store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
		return
	} else if (cost[1] > 0 && availableResources[rf.RES_STONE] >= cost[1]) {
		store.context.action = rf.ACT_PLACE_BUILDING
		city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
		for (let i = 0; i < cost[1]; i++) store.context.cityBuildingBeingAddedPayment.push(rf.RES_STONE)
		store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
		return
	} else if (cost[2] === 1 && availableResources[rf.RES_GOLD] + availableResources[rf.RES_WINE] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_DYE] > 0) {
		if (store.context.cityBuildingToDisplay === rf.BLDG_HOSPITAL && store.players[props.playerIndexProp].requiredRebuilds.length > 0) {
			store.context.buildingMoveError = 8
			return
		}
		// IF HOSPITAL OR FOUNTAIN, AND ONLY 1 TYPE OF LUX, AUTO SELECT
		let autoSelectedResources = city.autoSelectResources(props.playerIndexProp, store.context.cityBuildingToDisplay, cost)
		if (autoSelectedResources[0] !== -1) {
			store.context.action = rf.ACT_PLACE_BUILDING
			city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
			store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
			store.context.cityBuildingBeingAddedPayment = [...autoSelectedResources]
		} else store.context.action = rf.ACT_CHOOSE_BUILDING_PAYMENT
		return
	} else if (cost[2] === 2 && availableResources[rf.RES_GOLD] + availableResources[rf.RES_WINE] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_DYE] >= 2) {
		let autoSelectedResources = city.autoSelectResources(props.playerIndexProp, store.context.cityBuildingToDisplay, cost)
		if (autoSelectedResources[0] !== -1 && autoSelectedResources[0] !== -2) {
			store.context.action = rf.ACT_PLACE_BUILDING
			city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
			store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
			store.context.cityBuildingBeingAddedPayment = [...autoSelectedResources]
		} else if (autoSelectedResources[0] === -1) store.context.action = rf.ACT_CHOOSE_BUILDING_PAYMENT
		else if (autoSelectedResources[0] === -2) store.context.cityBuildingBeingAddedPayment = [-1]
		return
	}

	// Otherwise, you can't afford it
	store.context.cityBuildingBeingAddedPayment = [-1]
}

function getStokeClass(bldgNum) {
	if (store.players[props.playerIndexProp].requiredRebuilds.some((subarray) => subarray.bldgNum === bldgNum)) return "strokeRed"
	return "strokeBlack"
}
</script>

<template>
	<div id="wholeComponentDiv">
		<div id="sharedBuildingsAndResDiv">
			<CityPlayerInfo :playerIndexProp="store.topMenuViews.showingPlayerIndex" />
			<div id="sharedBuildingsDiv">
				<!--Multi-build Buildings
				<br />-->
				<div
					id="sharedBuildingsSVGdiv"
					:style="{
						width: String(rf.SMALL_SQ * 4.5) + 'px',
						height: String(rf.SMALL_SQ * 2.3) + 'px',
					}">
					<svg id="sharedBuildingsSVG" viewbox="0 100 -100 0">
						<path
							class="buildingSVGpath"
							@click="clickedBuilding(rf.BLDG_FOUNTAIN)"
							:fill="`url(#b_fountain)`"
							:d="getBldgPath('BLDG_FOUNTAIN', 0.5, 0)"
							:class="[
								{
									buildingSVGpathSelectable: store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS,
								},
								getStokeClass(rf.BLDG_FOUNTAIN),
								{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_FOUNTAIN)}
							]" />
						<path
							class="buildingSVGpath"
							@click="clickedBuilding(rf.BLDG_STORAGE)"
							:fill="`url(#b_storage_21)`"
							:d="getBldgPath('BLDG_STORAGE', 0, 1.2)"
							:class="[
								{
									buildingSVGpathSelectable: store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS,
								},
								getStokeClass(rf.BLDG_STORAGE),
								{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_STORAGE)}
							]" />
						<path
							class="buildingSVGpath"
							@click="clickedBuilding(rf.BLDG_CART)"
							:fill="`url(#b_cart)`"
							:d="getBldgPath('BLDG_CART', 2.5, 0.2)"
							:class="[
								{
									buildingSVGpathSelectable: store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS,
								},
								getStokeClass(rf.BLDG_CART),
								{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_CART)},
							]" />

						<!--<text class="remainingBuildingsText" x="83%" y="13%" text-anchor="middle"
            alignment-baseline="middle">16</text>
          <text class="remainingBuildingsText" x="83%" y="55%" text-anchor="middle"
            alignment-baseline="middle">16</text>
          <text class="remainingBuildingsText" x="83%" y="96%" text-anchor="middle"
            alignment-baseline="middle">16</text>-->
					</svg>
				</div>
			</div>
			<br />

			<ResourceTable :playerIndexProp="store.topMenuViews.showingPlayerIndex" />
		</div>

		<div id="personBuildingsDiv">
			Unique Buildings
			<br />
			<div id="personablBuildginsSpacerDiv">&nbsp;</div>
			<div
				id="uniBuildingsSVGdiv"
				:style="{
					width: String(rf.SMALL_SQ * 6) + 'px',
					height: String(rf.SMALL_SQ * 6) + 'px',
				}">
				<svg id="uniBuildingsSVG" viewbox="0 100 -100 0">
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_THEOLOGY)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_THEOLOGY"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_theology)`"
						:d="getBldgPath('BLDG_THEOLOGY', 0, 0)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_THEOLOGY),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_THEOLOGY),
							},
							getStokeClass(rf.BLDG_THEOLOGY),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_THEOLOGY)},
						]" />

					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_BIOLOGY)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_BIOLOGY"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_biology)`"
						:d="getBldgPath('BLDG_BIOLOGY', 3, 0)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_BIOLOGY),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_BIOLOGY),
							},
							getStokeClass(rf.BLDG_BIOLOGY),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_BIOLOGY)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_ALCHEMY)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_ALCHEMY"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_alchemy)`"
						:d="getBldgPath('BLDG_ALCHEMY', 0, 3)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_ALCHEMY),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_ALCHEMY),
							},
							getStokeClass(rf.BLDG_ALCHEMY),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_ALCHEMY)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_PHILOSOPHY)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_PHILOSOPHY"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_philosophy)`"
						:d="getBldgPath('BLDG_PHILOSOPHY', 3, 3)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_PHILOSOPHY),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_PHILOSOPHY),
							},
							getStokeClass(rf.BLDG_PHILOSOPHY),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_PHILOSOPHY)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_UNIVERSITY)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_UNIVERSITY"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_university)`"
						:d="getBldgPath('BLDG_UNIVERSITY', 2, 2)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_UNIVERSITY),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_UNIVERSITY),
							},
							getStokeClass(rf.BLDG_UNIVERSITY),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_UNIVERSITY)},
						]" />
						<!-- HIGHLIGHTS -->
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_THEOLOGY', 0, 0)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_THEOLOGY}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_BIOLOGY', 3, 0)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_BIOLOGY}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_ALCHEMY', 0, 3)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_ALCHEMY}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_PHILOSOPHY', 3, 3)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_PHILOSOPHY}" />

						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_UNIVERSITY', 2, 2)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_UNIVERSITY}" />
				</svg>
			</div>

			<div
				id="secondBuildingsSVGdiv"
				:style="{
					width: String(rf.SMALL_SQ * 4) + 'px',
					height: String(rf.SMALL_SQ * 6) + 'px',
				}">
				<svg id="secondBuildingsSVG" viewbox="0 100 -100 0">
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_BREWERY)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_BREWERY"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_brewery)`"
						:d="getBldgPath('BLDG_BREWERY', 0, 0)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_BREWERY),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_BREWERY),
							},
							getStokeClass(rf.BLDG_BREWERY),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_BREWERY)},
						]" />

					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_FORCED_LABOUR)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_FORCED_LABOUR"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_forcedLabour)`"
						:d="getBldgPath('BLDG_FORCED_LABOUR', 0, 1)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_FORCED_LABOUR),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_FORCED_LABOUR),
							},
							getStokeClass(rf.BLDG_FORCED_LABOUR),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_FORCED_LABOUR)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_STABLE)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_STABLE"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_stable)`"
						:d="getBldgPath('BLDG_STABLE', 1, 3)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_STABLE),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_STABLE),
							},
							getStokeClass(rf.BLDG_STABLE),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_STABLE)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_HARBOUR)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_HARBOUR"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_harbour)`"
						:d="getBldgPath('BLDG_HARBOUR', 0, 4)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_HARBOUR),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_HARBOUR),
							},
							getStokeClass(rf.BLDG_HARBOUR),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_HARBOUR)},
						]" />
						<!-- HIGHLIGHTS -->
						<path 
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_BREWERY', 0, 0)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_BREWERY}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_STABLE', 1, 3)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_STABLE}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_FORCED_LABOUR', 0, 1)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_FORCED_LABOUR}" />


						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_HARBOUR', 0, 4)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_HARBOUR}" />
				</svg>
			</div>

			<div
				id="thirdBuildingsSVGdiv"
				:style="{
					width: String(rf.SMALL_SQ * 6) + 'px',
					height: String(rf.SMALL_SQ * 6) + 'px',
				}">
				<svg id="thirdBuildingsSVG" viewbox="0 100 -100 0">
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_EXPLORER)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_EXPLORER"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_explorer)`"
						:d="getBldgPath('BLDG_EXPLORER', 0, 0)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_EXPLORER),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_EXPLORER),
							},
							getStokeClass(rf.BLDG_EXPLORER),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_EXPLORER)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_GRANARY)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_GRANARY"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_granary)`"
						:d="getBldgPath('BLDG_GRANARY', 0, 1)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_GRANARY),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_GRANARY),
							},
							getStokeClass(rf.BLDG_GRANARY),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_GRANARY)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_DUMP)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_DUMP"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_dump)`"
						:d="getBldgPath('BLDG_DUMP', 0, 3)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_DUMP),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_DUMP),
							},
							getStokeClass(rf.BLDG_DUMP),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_DUMP)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_CATHEDRAL)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_CATHEDRAL"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_cathedral)`"
						:d="getBldgPath('BLDG_CATHEDRAL', 2, 0)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_CATHEDRAL),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_CATHEDRAL),
							},
							getStokeClass(rf.BLDG_CATHEDRAL),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_CATHEDRAL)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_HOSPITAL)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_HOSPITAL"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_hospital)`"
						:d="getBldgPath('BLDG_HOSPITAL', 3, 4)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_HOSPITAL),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_HOSPITAL),
							},
							getStokeClass(rf.BLDG_HOSPITAL),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_HOSPITAL)},
						]" />
						
					<path
						class="buildingSVGpath"
						@click="clickedBuilding(rf.BLDG_MARKET)"
						@mouseenter="store.topMenuViews.buildingSVGpathHighlightNum = rf.BLDG_MARKET"
						@mouseleave="store.topMenuViews.buildingSVGpathHighlightNum = -1"
						:fill="`url(#b_market)`"
						:d="getBldgPath('BLDG_MARKET', 4, 2)"
						:class="[
							{
								buildingSVGpathSelectable: store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_MARKET),
								greyscale: !store.players[playerIndexProp].availableBuildings.includes(rf.BLDG_MARKET),
							},
							getStokeClass(rf.BLDG_MARKET),
							{	unaffordableRed: city.buildingNotAddedAndCannotAfford(props.playerIndexProp, rf.BLDG_MARKET)},
						]" />
						<!-- HIGHLIGHTS -->
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_HOSPITAL', 3, 4)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_HOSPITAL}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_CATHEDRAL', 2, 0)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_CATHEDRAL}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_DUMP', 0, 3)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_DUMP}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_GRANARY', 0, 1)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_GRANARY}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_EXPLORER', 0, 0)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_EXPLORER}" />
						<path
						class="buildingSVGpathHighlight"
						fill="none"
						:d="getBldgPath('BLDG_MARKET', 4, 2)"
						:class="{ 'buildingSVGpathHighlightOn': store.topMenuViews.buildingSVGpathHighlightNum === rf.BLDG_MARKET}" />
				</svg>
			</div>
		</div>
		<!--ENd personal buildings-->
	</div>
</template>

<style scoped>
.strokeBlack {
	stroke: black;
	stroke-width: 3px;
}

.strokeRed {
	stroke: red;
	stroke-width: 8px !important;
}

#sharedBuildingsDiv {
	width: fit-content;
	height: 96px;
	margin-bottom: 4px;
}

#personablBuildginsSpacerDiv {
	height: 20px;
	width: 100%;
	display: block;
}

#resDiv {
	display: inline-block;
	border: 2px solid black;
	box-sizing: border-box;
	font-weight: bolder;
	font-size: 20px;
	width: 403px;
	height: 203px;
	padding: 0px;
	position: relative;
}

#resBankImg {
	width: 100%;
	/* height: 160px;*/
	height: 100%;
	margin: 0px;
}

.resImg {
	border: 2px solid black;
	width: 45px;
	height: 45px;
	vertical-align: middle;
}

.resImgDiv {
	position: absolute;
	top: 0px;
	left: 0px;
	border: 2px solid black;
	width: 33px;
	height: 33px;
}

.resImgDiv img {
	width: 100%;
	height: 100%;
}

.resNumDiv {
	position: absolute;
	font-size: 25px;
	cursor: inherit;

	top: 0px;
	left: 0px;
	width: 100%;
	text-align: center;
	justify-content: center;
	vertical-align: middle;
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
}

.noRes {
	opacity: 0.5;
	border-color: red;
}

#wholeComponentDiv {
	width: 100%;
}

#sharedBuildingsAndResDiv {
	display: inline-block;
}

#personBuildingsDiv {
	height: 315px;
}

#sharedBuildingsDiv,
#personBuildingsDiv {
	border: 2px solid black;
	padding: 10px;
	font-weight: bolder;
	font-size: 30px;
	display: inline-block;
	vertical-align: top;
	margin-left: 8px;
}

#sharedBuildingsSVG,
#thirdBuildingsSVG,
#secondBuildingsSVG,
#uniBuildingsSVG {
	margin: 0 auto;
	margin-right: 50px;
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
}

.buildingSVGpath {
	stroke-width: 3px;
}

.buildingSVGpathHighlight {
	stroke-width: 8px;
	stroke: none;
}
.buildingSVGpathHighlightOn {
	stroke: yellow;
}

.buildingSVGpathSelectable:hover {
	stroke: yellow;
	stroke-width: 8px;
	/*transform: translate(-2px, 2px);*/
}

#sharedBuildingsSVGdiv {
	position: relative;
	display: inline-block;
	vertical-align: top;
}

#uniBuildingsSVGdiv,
#secondBuildingsSVGdiv,
#thirdBuildingsSVGdiv {
	position: relative;
	display: inline-block;
}

.remainingBuildingsText {
	text-shadow:
		-1px -1px 0 white,
		1px -1px 0 white,
		-1px 1px 0 white,
		1px 1px 0 white;
}

.greyscale {
	filter: url(#grayscale-filter);
	/*filter: grayscale(100%) brightness(140%);*/
	/*opacity: 0.8; /* Adjust the value between 0 and 1 */
	/*; /* Adjust the value between 0% and 100% */
}

.resSelectable {
	border-color: yellow;
	border-width: 2px;
	opacity: 1 !important;
}

.resSelectable:hover {
	border-color: lightgreen;
	border-width: 2px;
	cursor: pointer;
}
.unaffordableRed {
	filter: url(#red-unaffordable-filter);
}
</style>
