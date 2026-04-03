<script setup>
/** This is the main DISPLAY for the city
 *
 * It contains sub components for
 * - city action area
 * - city main building reserve
 * - city new building area
 * - city house reserve
 *
 */

import CityBuildingReserve from "./CityBuildingReserve.vue"
import CityHouseReserve from "./CityHouseReserve.vue"
import CityNewBuildingArea from "./CityNewBuildingArea.vue"
import CityActionArea from "./CityActionArea.vue"
//import CityPlayerInfo from "./CityPlayerInfo.vue"
import ResourceTable from "./ResourceTable.vue"
import PlayerTradeArea from "./PlayerTradeArea.vue"
import PromiseArea from "./PromiseArea.vue"

import * as view from "../js/AQYview.js"
import * as rf from "../js/AQYreference.js"
import * as city from "../js/AQYcity.js"
import * as model from "../js/AQYmodel.js"
import * as controller from "../js/AQYcontroller.js"
import * as country from "../js/AQYcountry.js"
//import * as model from '../js/AQYmodel.js'

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

const store = useModelStore()

import { ref } from "vue"

//import { shouldShowActivePlayerInfo } from "../js/AQYcontroller.js"
// Define a reactive property to trigger a re-render
const forceUpdate = ref(false)
// Function to force a re-render
const triggerUpdate = () => {
	forceUpdate.value = !forceUpdate.value
}

const showErrorPopup = ref(0)
const popupPosition = ref({ x: 0, y: 0 })

let errorInterval
const ghostPathRefs = []

function getGhostPathRef(idx) {
	if (!ghostPathRefs[idx]) {
		ghostPathRefs[idx] = ref(null)
	}
	return (el) => {
		ghostPathRefs[idx] = el
	}
}

const props = defineProps({
	playerIndexProp: {
		type: Number,
		required: true,
		default: 0,
		prop: "playerIndexProp", // Specify the name of the prop in the parent component
	},
})

function getBldgPath(bldg_str, offsetX, offsetY, terrain) {
	let path = [...rf.BLDG_DATA[bldg_str].path]
	let shiftX = path[0]
	path.shift()

	let ret = `M ${(offsetX + shiftX) * rf.SMALL_SQ} ${offsetY * rf.SMALL_SQ} `

	let offSet = 0
	if (bldg_str === "BLDG_GRAVE" && terrain > 100) {
		offSet = 10
	}

	for (let i = 0; i < path.length; i++) {
		if (i % 2 == 0) ret += `l${path[i] * (rf.SMALL_SQ - offSet)} 0 `
		else ret += `l0 ${path[i] * (rf.SMALL_SQ - offSet)} `
	}
	return ret
}

function getStoragePath(offsetX, offsetY, width, height) {
	let ret = `M ${offsetX * rf.SMALL_SQ} ${offsetY * rf.SMALL_SQ} `
	ret += `l${width * rf.SMALL_SQ} 0 `
	ret += `l0 ${height * rf.SMALL_SQ} `
	ret += `l${-width * rf.SMALL_SQ} 0 `
	ret += `l0 ${-height * rf.SMALL_SQ} `

	return ret
}

function handleTouchStart(event, cityIndex, index) {
	event.preventDefault()

	const startTime = new Date().getTime()

	const touchEndHandler = () => {
		const endTime = new Date().getTime()
		const touchDuration = endTime - startTime

		event.target.removeEventListener("touchend", touchEndHandler)

		if (touchDuration < 200) {
			clickedOnSquare(cityIndex, index)
		} else {
			changeGhost(event, index, true, cityIndex)
		}
	}

	event.target.addEventListener("touchend", touchEndHandler)
}

function hideErrorPopup() {
	let popup = document.getElementsByClassName("bldgPlaceErrorPopup")[0]
	popup.style.display = "none"
	clearTimeout(errorInterval)
	showErrorPopup.value = 0
}

function clickedOnSquare(cityIndex, index) {
	store.clearMessages()
	store.topMenuViews.strokeSelectableHighlightCity = [-1, -1, -1]
	// Check for legal position -- House will always be legal -- Grave will always be legal
	if (store.context.cityBuildingBeingAdded < 20) {
		if (store.context.cityBuildingBeingAdded !== rf.BLDG_STORAGE) showErrorPopup.value = city.checkForLegalPlacement(props.playerIndexProp, cityIndex, index, store.context.cityBuildingBeingAdded, store.context.cityBuildingBeingAddedRotation)
		else showErrorPopup.value = city.checkForLegalStoragePlacement(props.playerIndexProp, cityIndex, index, store.context.newStorageWidth, store.context.newStorageHeight)
		if (showErrorPopup.value > 0) {
			// Calculate the position based on the mouse/touch event
			popupPosition.value = { x: event.clientX, y: event.clientY - 80 }

			clearTimeout(errorInterval)
			// Hide the error popup after 2 seconds
			errorInterval = setTimeout(() => {
				showErrorPopup.value = 0
			}, 1000)
			return
		}
	}

	// Now position must be legal, so remove resources
	for (let i = 0; i < store.context.cityBuildingBeingAddedPayment.length; i++) {
		store.players[props.playerIndexProp].availableResources[store.context.cityBuildingBeingAddedPayment[i]]--
	}
	if (city.hasWorkingUniqueBuilding(props.playerIndexProp, rf.BLDG_PHILOSOPHY)) {
		if (rf.BLDG_D_COST.includes(store.context.cityBuildingBeingAdded)) {
			city.markBuildingAsUsed(props.playerIndexProp, rf.BLDG_PHILOSOPHY)
			city.markBuildingAsUsed(props.playerIndexProp, rf.BLDG_UNIVERSITY)
		}
	}

	if (store.context.cityBuildingBeingAdded === rf.BLDG_GRAVE) city.addGraveToCity(props.playerIndexProp, cityIndex, index, true)
	else if (store.context.cityBuildingBeingAdded !== rf.BLDG_STORAGE) city.addBuildingToCity(props.playerIndexProp, cityIndex, index, store.context.cityBuildingBeingAdded, store.context.cityBuildingBeingAddedRotation, true)
	else city.addStorageToCity(props.playerIndexProp, cityIndex, index, store.context.newStorageWidth, store.context.newStorageHeight, true)

	ghostPathRefs.splice(0)

	store.clearVars()

	// Restart grave adding
	if (store.context.gravesLeftToPlace > 0) city.startGravePlacement(props.playerIndexProp)
	else if (store.gameflow.phase === rf.PHASE_CITY_BUILDING && store.gameflow.subPhase === rf.SUB_PHASE_READD_GRAVE) {
		store.clearVars()
		store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
	}
}
function changeGhost(event, index, add, cityIndex) {
	//event.preventDefault()
	const ghostPathRef = ghostPathRefs[cityIndex]

	if (ghostPathRef == undefined) return

	if (index === store.topMenuViews.currentGhostIndex) return
	store.topMenuViews.currentGhostIndex = index
	if (!add) {
		ghostPathRef.style.display = "none"
		return
	}

	let citySize = 6
	if (cityIndex === 0) citySize = 7

	let Xpos = index % citySize
	if (store.context.cityBuildingBeingAdded < 20) Xpos -= store.context.cityBuildingToDisplayData.path[0]
	let Ypos = Math.floor(index / citySize)

	if (store.context.cityBuildingBeingAddedRotation === 1) Ypos -= 1
	if (store.context.cityBuildingBeingAddedRotation === 2) {
		Xpos -= 1
		Ypos -= 1
	}
	if (store.context.cityBuildingBeingAddedRotation === 3) Xpos -= 1

	if (store.context.cityBuildingBeingAdded <= 17) {
		ghostPathRef.setAttribute("fill", "url(#" + store.context.cityBuildingToDisplayData.imgName + ")")
		ghostPathRef.setAttribute("d", getBldgPath(rf.BLDG_ARRAY[store.context.cityBuildingBeingAdded], Xpos, Ypos))

		ghostPathRef.setAttribute("transform", `rotate(${store.context.cityBuildingBeingAddedRotation * 90}, ${(index % citySize) * rf.SMALL_SQ}, ${Math.floor(index / citySize) * rf.SMALL_SQ})`)
	} else if (store.context.cityBuildingBeingAdded === rf.BLDG_STORAGE) {
		ghostPathRef.setAttribute("fill", "url(#b_storage_" + String(store.context.newStorageWidth) + String(store.context.newStorageHeight) + ")")
		ghostPathRef.setAttribute("d", getStoragePath(Xpos, Ypos, store.context.newStorageWidth, store.context.newStorageHeight))
		ghostPathRef.setAttribute("transform", "")
	} else if (store.context.cityBuildingBeingAdded === rf.BLDG_GRAVE) {
		ghostPathRef.setAttribute("fill", "url(#" + store.context.cityBuildingToDisplayData.imgName + ")")
		ghostPathRef.setAttribute("d", getBldgPath("BLDG_GRAVE", Xpos, Ypos))
		ghostPathRef.setAttribute("transform", "")
	} else {
		ghostPathRef.setAttribute("fill", `url(#${view.getCityHouseImg(store.context.cityBuildingBeingAdded)})`)
		ghostPathRef.setAttribute("d", getBldgPath("HOUSE", Xpos, Ypos))
		ghostPathRef.setAttribute("transform", "")
	}

	ghostPathRef.style.display = "block"
}

function getCityBuildingRotation(bldg, citySize) {
	let factorX = 1
	let factorY = 1
	if (bldg.rotation === 1) {
		factorX = rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].height / 2
		factorY = rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].height / 2
	}
	if (bldg.rotation === 2) {
		factorX = rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].width / 2
		factorY = rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].height / 2
	}
	if (bldg.rotation === 3) {
		factorX = rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].width / 2
		factorY = rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].width / 2
	}
	return `rotate(${bldg.rotation * 90}, ${rf.SMALL_SQ * (factorX + (bldg.index % citySize))}, ${rf.SMALL_SQ * (factorY + Math.floor(bldg.index / citySize))})`
}

function clickedAvailableMan() {
	store.clearMessages()
	store.clearVars()
	ghostPathRefs.splice(0)
	store.topMenuViews.strokeSelectableHighlightCity = [-1, -1, -1]

	// If it's not adding buildings time, return
	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return
	if (store.gameflow.subPhase !== rf.SUB_PHASE_ADD_BUILDINGS) return

	if (!personal.canPlay()) return
	if (!controller.shouldShowActivePlayerInfo(props.playerIndexProp)) return

	store.context.action = rf.ACT_MAN_BLDG
}

function clickedCityBuilding(cityIndex, bldgInfo) {
	ghostPathRefs.splice(0)
	store.topMenuViews.strokeSelectableHighlightCity = [-1, -1, -1]
	// SET UP VIEW DETAILS
	if (store.context.action !== rf.ACT_MAN_BLDG && store.context.action !== rf.ACT_HOSPITAL_GRAVES) {
		store.clearVars()
		store.context.cityBuildingToDisplay = bldgInfo.bldgNum
		store.context.cityBuildingBeingAddedRotation = 0
		store.context.cityBuildingToDisplayData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgInfo.bldgNum]]
	}
	if (!personal.canPlay()) return
	if (!controller.shouldShowActivePlayerInfo(props.playerIndexProp)) return

	// REMOVE GRAVES during hospital action
	if (store.context.action === rf.ACT_HOSPITAL_GRAVES && bldgInfo.bldgNum === rf.BLDG_GRAVE_INFO) {
		city.addGraveToCity(props.playerIndexProp, cityIndex, bldgInfo.index, false)
		return
	}

	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return

	// MAN BUILDING
	if (store.context.action === rf.ACT_MAN_BLDG && city.canManBuilding(props.playerIndexProp, cityIndex, bldgInfo)) {
		bldgInfo.manned = true
		store.players[props.playerIndexProp].availableMen--
		store.clearVars()
		store.context.cityBuildingToDisplay = bldgInfo.bldgNum
		store.context.cityBuildingBeingAddedRotation = 0
		store.context.cityBuildingToDisplayData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgInfo.bldgNum]]
		if (bldgInfo.bldgNum === rf.BLDG_HOSPITAL) {
			//store.context.action = rf.ACT_HOSPITAL_GRAVES
			store.context.gravesLeftToRemove = 5
		}
		// Add an undo point
		model.createUndoPoint()
		if (bldgInfo.bldgNum === rf.BLDG_STABLE || bldgInfo.bldgNum === rf.BLDG_HARBOUR) country.updateZOCdisplayData()
	}
	// REMOVE BUILDING
	else if (store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS && city.canMoveBulding(props.playerIndexProp, cityIndex, bldgInfo) === 0) {
		// Pluck the building
		// if NOT built this turn, MUST be readded -- MOVED to city.js
		if (bldgInfo.bldgNum === rf.BLDG_GRAVE_INFO) {
			city.addGraveToCity(props.playerIndexProp, cityIndex, bldgInfo.index, false, true)
			city.setBuildingToMidMove(props.playerIndexProp, cityIndex, rf.BLDG_GRAVE, bldgInfo.index, 0)
			// Add an undo point
			model.createUndoPoint()
			return
		}

		if (bldgInfo.bldgNum !== rf.BLDG_STORAGE) {
			city.addBuildingToCity(props.playerIndexProp, cityIndex, bldgInfo.index, bldgInfo.bldgNum, bldgInfo.rotation, false)
			if (!bldgInfo.builtThisTurn) city.setBuildingToMidMove(props.playerIndexProp, cityIndex, bldgInfo.bldgNum, bldgInfo.index, bldgInfo.rotation)
		} else {
			// STORAGE
			city.addStorageToCity(props.playerIndexProp, cityIndex, bldgInfo.index, bldgInfo.width, bldgInfo.height, false)
			if (!bldgInfo.builtThisTurn) city.setBuildingToMidMove(props.playerIndexProp, cityIndex, bldgInfo.bldgNum, bldgInfo.index, [bldgInfo.width, bldgInfo.height])
		}

		return
		//if (bldgInfo.bldgNum === rf.BLDG_CATHEDRAL && bldgInfo.builtThisTurn) store.players[props.playerIndexProp].saint = rf.SAINT_NONE
	}
	// SHOW UNABLE TO REMOVE BUILDING REASON
	else if (store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS && city.canMoveBulding(props.playerIndexProp, cityIndex, bldgInfo) !== 0) {
		store.context.buildingMoveError = city.canMoveBulding(props.playerIndexProp, cityIndex, bldgInfo)
	}

	// ENABLE MARKET ACTION - CLICKED ON VALID MARKET - NOW DONE WITH BUTTON
	//if (bldgInfo.bldgNum === rf.BLDG_MARKET && bldgInfo.manned && store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS) store.context.action = rf.ACT_TRADE_BOARD
}

function getCityBuildingStrokeClass(cityIndex, bldg) {
	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return "strokeBlack"
	if (!personal.canPlay()) return "strokeBlack"
	if (!controller.shouldShowActivePlayerInfo(props.playerIndexProp)) return "strokeBlack"

	if (store.context.action === rf.ACT_HOSPITAL_GRAVES && bldg.bldgNum === rf.BLDG_GRAVE_INFO) return "strokeSelectable"

	if (store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS) {
		if (store.context.action === rf.ACT_MAN_BLDG && city.canManBuilding(props.playerIndexProp, cityIndex, bldg)) return "strokeSelectable"
		if (city.canManBuilding(props.playerIndexProp, cityIndex, bldg) && store.context.action !== rf.ACT_MAN_BLDG) return "strokeRed"
	} else if (store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS) {
		if (city.canMoveBulding(props.playerIndexProp, cityIndex, bldg) === 0) return "strokeSelectable"
	}
	return "strokeBlack"
}

function setCityBuildingStrokeClassHighlight(cityIndex, bldg) {
	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return
	if (!personal.canPlay()) return
	if (!controller.shouldShowActivePlayerInfo(props.playerIndexProp)) return

	if (store.context.action === rf.ACT_HOSPITAL_GRAVES && bldg.bldgNum === rf.BLDG_GRAVE_INFO) {
		store.topMenuViews.strokeSelectableHighlightCity = [cityIndex, bldg.index, bldg.bldgNum]
		return
	}
	if (store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS) {
		if (store.context.action === rf.ACT_MAN_BLDG && city.canManBuilding(props.playerIndexProp, cityIndex, bldg)) {
			store.topMenuViews.strokeSelectableHighlightCity = [cityIndex, bldg.index, bldg.bldgNum]
			return
		}
		if (city.canManBuilding(props.playerIndexProp, cityIndex, bldg) && store.context.action !== rf.ACT_MAN_BLDG) return
	} else if (store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS) {
		if (city.canMoveBulding(props.playerIndexProp, cityIndex, bldg) === 0) {
			store.topMenuViews.strokeSelectableHighlightCity = [cityIndex, bldg.index, bldg.bldgNum]
			return
		}
	}
}

function getCityBuildingFilterClass(cityIndex, bldg) {
	if (city.canManBuilding(props.playerIndexProp, cityIndex, bldg)) return "filterRed"
	if (!city.canManBuilding(props.playerIndexProp, cityIndex, bldg)) return "filterGreen"
}

function menDivButton() {
	if (store.context.action === rf.ACT_HOSPITAL_GRAVES) {
		store.clearVars()
		return
	}
	store.clearVars()

	if (store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS) store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
	else store.gameflow.subPhase = rf.SUB_PHASE_MOVE_BUILDINGS
}

function unmanButton() {
	if (store.context.action === rf.ACT_UNMAN_BUILDING || store.context.action === rf.ACT_MAN_BLDG) {
		store.clearVars()
	} else store.context.action = rf.ACT_UNMAN_BUILDING
}

function sandboxAddCity() {
	//store.players[props.playerIndexProp].cities.push(city.createNewCity_core(props.playerIndexProp, { q: 0, r: -2, s: 2 }))
	city.createNewCity_core(props.playerIndexProp, { q: 0, r: -2, s: 2 })
}
function sandboxAddGrave() {
	store.context.gravesLeftToPlace++
}

function sandboxRemoveGrave() {
	store.context.gravesLeftToRemove = 1
	store.context.action = rf.ACT_HOSPITAL_GRAVES
}

function canManAllBuildings() {
	if (!personal.canPlay()) return false
	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return false

	if (!controller.shouldShowActivePlayerInfo(props.playerIndexProp)) return false

	let player = controller.currentPlayerObj()
	if (player.availableMan === 0) return false
	// Now find the number of built buildings that are mannable
	let mannableBuildings = 0
	for (let i = 0; i < player.cities.length; i++) {
		for (let j = 0; j < player.cities[i].buildings.length; j++) {
			//if (rf.MANNABLE_BUILDINGS.includes(player.cities[i].buildings[j].bldgNum) && player.cities[i].buildings[j].manned === false) mannableBuildings++
			if (city.canManBuilding(props.playerIndexProp, i, player.cities[i].buildings[j])) mannableBuildings++
		}
	}
	if (mannableBuildings === 0) return false
	if (mannableBuildings <= player.availableMen) return true
	return false
}

function localManAllBuildings() {
	if (!canManAllBuildings()) return
	city.manAllBuildings(controller.currentPlayerIndex())
	triggerUpdate()
}

function canUnManAnyBuilding() {
	if (!personal.canPlay()) return false
	if (!controller.shouldShowActivePlayerInfo(props.playerIndexProp)) return false

	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return false
	//if (store.players[props.playerIndexProp].cities.some(city => city.buildings.some(building => building.manned === true))) return true
	let player = controller.currentPlayerObj()
	for (let i = 0; i < player.cities.length; i++) {
		for (let j = 0; j < player.cities[i].buildings.length; j++) {
			if (rf.MANNABLE_BUILDINGS.includes(player.cities[i].buildings[j].bldgNum) && player.cities[i].buildings[j].manned === true && !player.cities[i].buildings[j].lockedDueTrade) {
				let bldgInfo = player.cities[i].buildings[j]
				if (bldgInfo.usedThisTurn === false) return true
			}
		}
	}
}

function clickedManOnBuilding(bldg) {
	if (store.context.action !== rf.ACT_UNMAN_BUILDING) return
	if (bldg.lockedDueTrade) return
	if (bldg.bldgNum === rf.BLDG_STORAGE) {
		city.unManBuilding_core(controller.currentPlayerIndex(), bldg)
		return
	}
	if (bldg.usedThisTurn) return
	city.unManBuilding_core(controller.currentPlayerIndex(), bldg)
	if (!canUnManAnyBuilding()) store.context.action = rf.ACT_NONE
	if (bldg.bldgNum === rf.BLDG_STABLE || bldg.bldgNum === rf.BLDG_HARBOUR) country.updateZOCdisplayData()
}
</script>

<template>
	<div
		id="wholeCityArea"
		:style="{
			border: '10px solid ' + personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
		}">
		<!--<CityPlayerInfo :playerIndexProp="store.topMenuViews.showingPlayerIndex" />
		-->
		<CityActionArea :playerIndexProp="store.topMenuViews.showingPlayerIndex" />

		<PlayerTradeArea :playerIndexProp="store.topMenuViews.showingPlayerIndex" />

		<PromiseArea :playerIndexProp="store.topMenuViews.showingPlayerIndex" />

		<CityBuildingReserve :playerIndexProp="store.topMenuViews.showingPlayerIndex" />

		<div id="allCityAndHousesContainer">
			<div id="cityLeftSideContainer">
				<div id="availableMenDiv">
					<!-- EXPECTED HARVDEST -->
					<div class="expectedHarvestDiv">
						Expected Harvest:
						<span v-if="country.getExpectedHarvestResources(playerIndexProp, city.hasWorkingUniqueBuilding(playerIndexProp, rf.BLDG_FORCED_LABOUR, false)).length > 0">
							<img v-for="(res, idx) in country.getExpectedHarvestResources(playerIndexProp, city.hasWorkingUniqueBuilding(playerIndexProp, rf.BLDG_FORCED_LABOUR, false))" :key="idx" class="expectedHarvestRes" :src="view.getImage('res_' + String(res))" />
						</span>
						<span v-else>None</span>
					</div>
					<button v-if="store.sandboxMode && store.players[playerIndexProp].cities.length < 4" @click="sandboxAddCity" class="actionsLineButton">Sandbox: Add city</button>
					<button v-if="store.sandboxMode" @click="sandboxAddGrave" class="actionsLineButton">Sandbox: Add Grave</button>
					<button v-if="store.sandboxMode && store.players[playerIndexProp].cities.some((city) => city.graves.length > 0)" @click="sandboxRemoveGrave" class="actionsLineButton">Sandbox: Remove Grave</button>

					<template v-if="personal.canPlay() && store.gameflow.subPhase !== rf.SUB_PHASE_CHOOSE_SAINT">
						<button v-if="personal.canPlay() && controller.shouldShowActivePlayerInfo(playerIndexProp) && store.gameflow.phase === rf.PHASE_CITY_BUILDING && (store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS || store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS)" @click="menDivButton" class="actionsLineButton">
							<span v-if="store.context.action === rf.ACT_HOSPITAL_GRAVES">Stop Removing Graves</span>
							<span v-else-if="personal.canPlay() && store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS && controller.shouldShowActivePlayerInfo(playerIndexProp)">(Re)move Buildings</span>
							<span v-else>Stop (Re)moving</span>
						</button>
						<button v-if="canManAllBuildings() && controller.shouldShowActivePlayerInfo(playerIndexProp)" @click="localManAllBuildings" class="actionsLineButton">Man All</button>
						<button v-if="controller.shouldShowActivePlayerInfo(playerIndexProp) && ((canUnManAnyBuilding() && store.context.action !== rf.ACT_UNMAN_BUILDING) || store.context.action === rf.ACT_UNMAN_BUILDING)" @click="unmanButton" class="actionsLineButton">
							<span v-if="store.context.action === rf.ACT_UNMAN_BUILDING">Cancel</span>
							<span v-else-if="store.context.action === rf.ACT_MAN_BLDG">Cancel</span>
							<span v-else>Un-man</span>
						</button>
					</template>
					<template v-else-if="personal.canPlay() && store.gameflow.subPhase === rf.SUB_PHASE_CHOOSE_SAINT">
						Please choose a saint (See above city screen)
					</template>
					<br />
					<span v-if="store.players[playerIndexProp].availableMen <= 0">
						No Available Men
						<span v-if="store.players[playerIndexProp].availableMen < 0" class="redText">
							<br />
							You have removed a house after using the man
							<br />
							A house must be readded before ending your turn
						</span>
					</span>
					<span v-else-if="store.gameflow.subPhase !== rf.SUB_PHASE_CHOOSE_SAINT">
						Available Men:
						<div
							v-for="manNum in store.players[playerIndexProp].availableMen"
							:key="manNum"
							class="availableMan"
							:style="{
								'background-color': personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
							}"
							@click="clickedAvailableMan"
							:class="{ availableManSelectable: personal.canPlay() && controller.shouldShowActivePlayerInfo(playerIndexProp) && store.gameflow.phase === rf.PHASE_CITY_BUILDING && store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS }"></div>
					</span>
					<template v-if="personal.canPlay() && controller.shouldShowActivePlayerInfo(playerIndexProp) && store.context.gravesLeftToPlace > 0">
						<br />
						Graves:
						<div v-for="graveNum in store.context.gravesLeftToPlace" :key="graveNum" class="availableGrave" @click="city.startGravePlacement(playerIndexProp)">
							<img :src="view.getImage('grave')" />
						</div>
					</template>
				</div>
				<div
					id="cityContainer"
					:style="{
						width: String(rf.SMALL_SQ * (store.players[playerIndexProp].cities.length <= 2 ? 8 : 14.5)) + 'px',
						height: String(rf.SMALL_SQ * (store.players[playerIndexProp].cities.length <= 1 ? 7 : 14)) + 'px',
					}">
					<div
						class="cityDiv"
						v-for="(cityObj, cityIndex) in store.players[playerIndexProp].cities"
						:key="cityIndex"
						:style="{
							width: String(rf.SMALL_SQ * cityObj.size) + 'px',
							height: String(rf.SMALL_SQ * cityObj.size) + 'px',
						}">
						<transition name="fadeOut">
							<div class="bldgPlaceErrorPopup" v-if="showErrorPopup > 0" :style="{ top: popupPosition.y + 'px', left: popupPosition.x + 'px' }" @mouseover="hideErrorPopup">
								<span v-if="showErrorPopup === 1">
									Building Must
									<br />
									Fit in City
								</span>
								<span v-if="showErrorPopup === 2">
									Must be Placed
									<br />
									on Free Space
								</span>
							</div>
						</transition>

						<img :src="view.getImage('city' + String(cityObj.size))" class="cityImage" />
						<svg class="citySVG" viewbox="0 100 -100 0" @mouseleave="changeGhost($event, 0, false, cityIndex)">
							<!-- Layer 0 -- Ghost biuldings -->
							<path v-if="store.context.cityBuildingBeingAdded !== rf.BLDG_GRAVE" class="ghostPath" :ref="getGhostPathRef(cityIndex)" fill="" d="" transform="" oncontextmenu="return false;" />

							<!-- LAYER 1 -- BUILDINGS -- THIS NEEDS TO BE IN A SEPARATE SVG TAG OR WEIRD THINGS HAPPEN FOR SOME REASAON -->
							<g v-for="(bldg, idx) in cityObj.buildings" :key="idx">
								<!-- PLACED BUILDINGS -->
								<path v-if="bldg.bldgNum <= 17" class="cityBuildingSVGpath" :fill="`url(#${rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].imgName})`" :d="getBldgPath(rf.BLDG_ARRAY[bldg.bldgNum], bldg.index % cityObj.size, Math.floor(bldg.index / cityObj.size))" :transform="getCityBuildingRotation(bldg, cityObj.size)" :class="[getCityBuildingStrokeClass(cityIndex, bldg), getCityBuildingFilterClass(cityIndex, bldg)]" @click="clickedCityBuilding(cityIndex, bldg)" @mouseover="setCityBuildingStrokeClassHighlight(cityIndex, bldg)" @mouseleave="store.topMenuViews.strokeSelectableHighlightCity = [-1, -1, -1]" />

								<!-- PLACED STORAGE -->
								<path v-else-if="bldg.bldgNum === rf.BLDG_STORAGE" class="cityBuildingSVGpath" :fill="`url(#b_storage_${bldg.width}${bldg.height})`" :d="getStoragePath(bldg.index % cityObj.size, Math.floor(bldg.index / cityObj.size), bldg.width, bldg.height)" :class="[getCityBuildingStrokeClass(cityIndex, bldg), getCityBuildingFilterClass(cityIndex, bldg)]" @click="clickedCityBuilding(cityIndex, bldg)" @mouseover="setCityBuildingStrokeClassHighlight(cityIndex, bldg)" @mouseleave="store.topMenuViews.strokeSelectableHighlightCity = [-1, -1, -1]" />

								<!-- PLACED HOUSES -->
								<path v-else class="cityBuildingSVGpath strokeBlack" :fill="`url(#${view.getCityHouseImg(bldg.bldgNum)})`" :d="getBldgPath('HOUSE', bldg.index % cityObj.size, Math.floor(bldg.index / cityObj.size))" @click="clickedCityBuilding(cityIndex, bldg)" :class="[getCityBuildingStrokeClass(cityIndex, bldg)]" @mouseover="setCityBuildingStrokeClassHighlight(cityIndex, bldg)" @mouseleave="store.topMenuViews.strokeSelectableHighlightCity = [-1, -1, -1]" />

								<!-- MEN ON BUILDINGS -->
								<rect
									v-if="bldg.manned && bldg.bldgNum !== rf.BLDG_STORAGE"
									:key="idx + bldg.manned"
									class="manOnBuildingRect"
									:class="{ manOnBuildingSelectable: bldg.usedThisTurn === false && store.context.action === rf.ACT_UNMAN_BUILDING && !bldg.lockedDueTrade }"
									:style="{
										fill: personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
									}"
									@click="clickedManOnBuilding(bldg)"
									:x="((bldg.index % cityObj.size) + rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].manIdx[0]) * rf.SMALL_SQ + 5"
									:y="(Math.floor(bldg.index / cityObj.size) + rf.BLDG_DATA[rf.BLDG_ARRAY[bldg.bldgNum]].manIdx[1]) * rf.SMALL_SQ + 5"
									:transform="getCityBuildingRotation(bldg, cityObj.size)" />

								<rect
									v-if="bldg.manned && bldg.bldgNum === rf.BLDG_STORAGE"
									:key="idx + bldg.manned"
									class="manOnBuildingRect"
									:class="{ manOnBuildingSelectable: store.context.action === rf.ACT_UNMAN_BUILDING }"
									:style="{
										fill: personal.getCorrectedColourHex(store.players[playerIndexProp].colour),
									}"
									@click="clickedManOnBuilding(bldg)"
									:x="((bldg.index % cityObj.size) + (bldg.width - 1) / 2) * rf.SMALL_SQ + 5"
									:y="(Math.floor(bldg.index / cityObj.size) + (bldg.height - 1) / 2) * rf.SMALL_SQ + 5" />
							</g>

							<!-- LAYER 2 -- GRAVES AND HIGHLIGHTS -->
							<!-- GRAVE HIGHLIGHT -->
							<path v-if="store.context.cityBuildingBeingAdded === rf.BLDG_GRAVE" class="ghostPath" :ref="getGhostPathRef(cityIndex)" fill="" d="" transform="" oncontextmenu="return false;" />

							<!-- GRAVES IN CITY -->
							<g v-for="(index, indexCount) in cityObj.graves" :key="indexCount">
								<path class="cityBuildingSVGpath" :fill="`url(#${rf.BLDG_DATA['BLDG_GRAVE'].imgName})`" :d="getBldgPath('BLDG_GRAVE', index % cityObj.size, Math.floor(index / cityObj.size), cityObj.coords[index])" @click="clickedCityBuilding(cityIndex, { bldgNum: rf.BLDG_GRAVE_INFO, index: index })" :class="[getCityBuildingStrokeClass(cityIndex, { bldgNum: rf.BLDG_GRAVE_INFO })]" />
							</g>

							<!-- LAYER 3 - HISTORY HIGHLIGHTS -->
							<g v-for="(index, idx) in store.historyHelpers.citySquaresToHighlight[playerIndexProp][cityIndex]" :key="idx">
								<rect
									class="historyHighlightRect"
									:x="(index % cityObj.size) * rf.SMALL_SQ"
									:y="Math.floor(index / cityObj.size) * rf.SMALL_SQ"
									:style="{
										width: rf.SMALL_SQ + 'px',
										height: rf.SMALL_SQ + 'px',
									}"
									oncontextmenu="return false;" />
							</g>
							<!-- LAYER 4 -->
							<!-- Outline Highlights -->
							<g v-for="(bldg, idx) in cityObj.buildings" :key="idx">
								<!-- PLACED BUILDINGS -->
								<path v-if="bldg.bldgNum <= 17" class="cityBuildingSVGpathHighlight" :d="getBldgPath(rf.BLDG_ARRAY[bldg.bldgNum], bldg.index % cityObj.size, Math.floor(bldg.index / cityObj.size))" :transform="getCityBuildingRotation(bldg, cityObj.size)" :class="{ strokeSelectableHighlightOn: store.topMenuViews.strokeSelectableHighlightCity[0] === cityIndex && store.topMenuViews.strokeSelectableHighlightCity[1] === bldg.index && store.topMenuViews.strokeSelectableHighlightCity[2] === bldg.bldgNum }" />
								<!-- PLACED STORAGE -->
								<path v-else-if="bldg.bldgNum === rf.BLDG_STORAGE" class="cityBuildingSVGpathHighlight" :d="getStoragePath(bldg.index % cityObj.size, Math.floor(bldg.index / cityObj.size), bldg.width, bldg.height)" :class="{ strokeSelectableHighlightOn: store.topMenuViews.strokeSelectableHighlightCity[0] === cityIndex && store.topMenuViews.strokeSelectableHighlightCity[1] === bldg.index && store.topMenuViews.strokeSelectableHighlightCity[2] === bldg.bldgNum }" />
								<!-- PLACED HOUSES -->
								<path v-else class="cityBuildingSVGpathHighlight" :d="getBldgPath('HOUSE', bldg.index % cityObj.size, Math.floor(bldg.index / cityObj.size))" :class="{ strokeSelectableHighlightOn: store.topMenuViews.strokeSelectableHighlightCity[0] === cityIndex && store.topMenuViews.strokeSelectableHighlightCity[1] === bldg.index && store.topMenuViews.strokeSelectableHighlightCity[2] === bldg.bldgNum }" />
							</g>
							<!-- TOP LAYER - HIGHLIGHT SQUARES -->
							<g v-for="(index, indexCount) in store.context.cityIndexesToHighlightClick[cityIndex]" :key="indexCount">
								<rect
									class="sqSelectRect"
									:x="(index % cityObj.size) * rf.SMALL_SQ"
									:y="Math.floor(index / cityObj.size) * rf.SMALL_SQ"
									:style="{
										width: rf.SMALL_SQ - 2 + 'px',
										height: rf.SMALL_SQ - 2 + 'px',
									}"
									oncontextmenu="return false;"
									@click="clickedOnSquare(cityIndex, index)"
									@mouseover="changeGhost($event, index, true, cityIndex)"
									@touchstart="handleTouchStart($event, cityIndex, index)" />
							</g>
						</svg>
						<!-- END CITY SVG-->

						<div
							v-if="store.players[playerIndexProp].cities.length === 1"
							class="cityDiv"
							:style="{
								width: String(rf.SMALL_SQ * 6) + 'px',
								height: String(rf.SMALL_SQ * 6) + 'px',
							}">
							<img :src="view.getImage('city_back')" class="cityImage" />
						</div>
					</div>
				</div>
				<!-- END CITIES V-FOR -->
			</div>
			<div
				id="cityRightSideContainer"
				:style="{
					width: store.permanentSettings.housesInNumberOrder === 2 ? '890px' : '790px',
				}">
				<span class="infoSpan" id="famineSpan">Famine Level: {{ model.getFamineLevel() }}</span>
				<span class="infoSpan" id="pollutionSpan">
					- Pollution:
					<span>{{ country.getPendingPollution(playerIndexProp) }}</span>
				</span>
				<span class="infoSpan" id="graveSpan">
					- Graves:
					<span>{{ city.getTotalGravesToPlace(playerIndexProp) }}</span>
				</span>
				<br />
				<CityNewBuildingArea :playerIndexProp="store.topMenuViews.showingPlayerIndex" />

				<div id="housesDiv">
					<CityHouseReserve :playerIndexProp="store.topMenuViews.showingPlayerIndex" />
				</div>
			</div>
			<!-- END CITIES AND HOUSES -->
		</div>
		<div id="resLineDiv">
			<b>
				<!-- IMAGE RESOURCES
				Countryside Costs: Woodcutter
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_WOOD))" />
				, Mine
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_WOOD))" />
				, Fishery
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_WOOD))" />
				, Farm (1x
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_GRAIN))" />
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_OLIVES))" />
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_SHEEP))" />
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_WINE))" />
				), City
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_WOOD))" />
				+
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_STONE))" />
				+ 1F + 2DL, Inn (1x
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_GRAIN))" />
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_OLIVES))" />
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_SHEEP))" />
				<img class="countryCostResImg" :src="view.getImage('res_' + String(rf.RES_FISH))" />
				)
			-->
				Countryside Costs: Woodcutter: W, Mine: W, Fishery: W, Farm: Seed, City: W+S+F+2DL, Inn: F
			</b>
			<br />
			<template v-for="idx in Array.from({ length: store.players.length }, (_, idx) => idx)" :key="idx">
				<ResourceTable :playerIndexProp="idx" class="resTableLine" />
			</template>
		</div>
	</div>
</template>

<style scoped>
#wholeCityArea {
	width: 100%;
	min-width: 1250px;
	min-height: 200px;
	box-sizing: border-box;
	padding: 5px;
}

#availableMenDiv {
	/*background-color: aliceblue;*/
	width: 100%;
	font-size: 20px;
	font-weight: bolder;
	min-height: 90px;
}

.availableMan {
	width: 30px;
	height: 30px;
	border: 2px solid black;
	display: inline-block;
	vertical-align: middle;
	margin-right: 5px;
	margin-bottom: 5px;
}

.availableManSelectable:hover {
	border-color: yellow;
}

.redText {
	font-weight: bolder;
	color: red;
}

.availableGrave {
	width: 40px;
	height: 40px;
	border: 2px solid yellow;
	display: inline-block;
	vertical-align: middle;
	margin-right: 5px;
	margin-bottom: 5px;
}

.availableGrave img {
	width: 100%;
	height: 100%;
}

.availableGrave:hover {
	border-color: lightgreen;
}

#housesDiv {
	position: relative;
	width: fit-content;
	height: fit-content;
	border: 2px solid black;
	padding: 10px;
	font-weight: bolder;
	font-size: 30px;
	display: inline-block;
	vertical-align: top;
}

.citySVG {
	margin: 0 auto;
	margin-right: 50px;
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
}

.cityBuildingSVGpath {
	stroke-width: 2px;
	/*filter: sepia(10%) brightness(150%) hue-rotate(80deg);*/
	stroke-opacity: 1;
	fill-opacity: 1;
}

.cityBuildingSVGpathHighlight {
	stroke-width: 5px;
	/*filter: sepia(10%) brightness(150%) hue-rotate(80deg);*/
	stroke: none;
	fill: none;
}

.strokeSelectableHighlightOn {
	stroke: lightgreen;
}

.filterRed {
	filter: url(#red-overlay-filter);
}
.filterGreen {
	filter: url(#green-overlay-filter);
}

.strokeBlack {
	stroke: black;
}

.strokeRed {
	stroke: red;
	stroke-width: 3px;
}

.strokeSelectable {
	stroke: yellow;
	stroke-width: 5px;
}

.strokeSelectableHighlight {
	stroke: lightgreen;
}

.strokeSelectable:hover {
	stroke: lightgreen !important;
	stroke-width: 5px;
}

.manOnBuildingRect {
	width: 30px;
	height: 30px;
	stroke: black;
	stroke-width: 3px;
}
.manOnBuildingSelectable {
	stroke: yellow;
}
.manOnBuildingSelectable:hover {
	stroke: lightgreen;
}

.buildingSVGpath {
	stroke: black;
	stroke-width: 3px;
}

.sqSelectRect {
	fill-opacity: 0.3;
	fill: yellow;
	cursor: pointer;
}

.historyHighlightRect {
	fill: yellow;
	fill-opacity: 1;
	cursor: default;
	animation: glow 0.6s infinite alternate;
}

.ghostPath {
	stroke: black;
	stroke-width: 3px;
	display: none;
	/*fill-opacity: 0.3;*/
}

#allCityAndHousesContainer {
	padding-top: 20px;
	width: fit-content;
	display: flex;
	margin: auto;
}

#cityLeftSideContainer {
	flex: 0 0 443px; /* Set a fixed width  */
	/*background-color: aquamarine;*/
}

#cityRightSideContainer {
	flex: 1; /* Let it take the remaining space */
	/*background-color: aqua;*/

	/*background-color: brown;*/
}

#cityContainer {
	display: inline-block;
}

.cityDiv {
	display: inline-block;
	margin: 10px;
	border: 2px solid black;
	position: relative;
}

.cityImage {
	width: 100%;
	height: 100%;
}

.resTableLine {
	margin-top: 8px;
	margin-right: 8px;
}

.expectedHarvestRes {
	width: 40px;
	height: 40px;
	vertical-align: middle;
	border: 2px solid black;
	margin-right: 2px;
}

.infoSpan {
	font-weight: bolder;
	font-size: 20px;
}
#famineSpan {
	font-size: 20px;
}

.countryCostResImg {
	width: 50px;
	height: 50px;
	vertical-align: middle;
}

.bldgPlaceErrorPopup {
	position: fixed;
	background-color: red;
	color: white;
	padding: 10px;
	border-radius: 5px;
	opacity: 1;
	z-index: 9999;
}

.fadeOut-enter-active,
.fadeOut-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeOut-enter,
.fadeOut-leave-active {
	opacity: 0;
}

@keyframes glow {
	to {
		opacity: 0.3;
	}
}
</style>
