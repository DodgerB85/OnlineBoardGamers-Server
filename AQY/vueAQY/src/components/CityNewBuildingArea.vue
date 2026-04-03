<script setup>
/**
 *	This is the area to view / rotate / select costs for NEW BUILDINGS
 *	IE any buildling being added, including graves
 *
 */

import * as view from "../js/AQYview.js"
import * as rf from "../js/AQYreference.js"
import * as city from "../js/AQYcity.js"
import * as controller from "../js/AQYcontroller.js"

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

function adjustStoreSize() {
	// Changed to use warning instead
	const product = store.context.newStorageWidth * store.context.newStorageHeight
	/*if (product % 2 !== 0) {
		if (selectUsed === 1) store.context.newStorageHeight += 1;
		else if (selectUsed === 2) store.context.newStorageWidth += 1;
	}*/
	if (product % 2 == 1) store.context.cityIndexesToHighlightClick.splice(0)
	else city.getAllFreeCitySquaresToHighlight(props.playerIndexProp, false)
}

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

function getNewBldgName() {
	if (store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE) return "Select a House to add for free"
	if (store.context.cityBuildingToDisplay === -1) return "Select a Building"
	else if (store.context.cityBuildingToDisplay < 20) return rf.BLDG_DATA[rf.BLDG_ARRAY[store.context.cityBuildingToDisplay]].name
	else return `House ${store.context.cityBuildingToDisplay - 20}`
}
function getNewBldgDescription() {
	if (store.context.cityBuildingToDisplay === -1) return "(Building Function)"
	else if (store.context.cityBuildingToDisplay < 20) return rf.BLDG_DATA[rf.BLDG_ARRAY[store.context.cityBuildingToDisplay]].description
	else return "Gain 1 worker"
}

function rotateNewBuilding(dir) {
	if (store.context.cityBuildingBeingAdded === rf.BLDG_STORAGE) {
		let temp = store.context.newStorageHeight
		store.context.newStorageHeight = store.context.newStorageWidth
		store.context.newStorageWidth = temp
		return
	}
	if (!rf.BLDG_ROTATABLE.includes(store.context.cityBuildingBeingAdded)) return
	// Remove ghosts
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	let ghostPaths = document.getElementsByClassName("ghostPath")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
	for (let i = 0; i < ghostPaths.length; i++) ghostPaths[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	store.context.cityBuildingBeingAddedRotation += dir
	if (store.context.cityBuildingBeingAddedRotation === 4) store.context.cityBuildingBeingAddedRotation = 0
	else if (store.context.cityBuildingBeingAddedRotation === -1) store.context.cityBuildingBeingAddedRotation = 3
}

function canSelectCostRes(res) {
	if (!personal.canPlay()) return false
	if (!controller.shouldShowActivePlayerInfo(props.playerIndexProp)) return false

	if (store.context.action !== rf.ACT_CHOOSE_BUILDING_PAYMENT) return

	if (!store.sandboxMode && store.players[props.playerIndexProp].availableResources[res] === 0) return false
	// Check if already being spent
	const resCount = store.context.cityBuildingBeingAddedPayment.filter((number) => number === res).length
	if (!store.sandboxMode && store.players[props.playerIndexProp].availableResources[res] - resCount === 0) return false

	if (store.context.cityBuildingBeingAddedPayment.length === 0) return true
	// Otherwise, STABLE and selected one good
	if (store.context.cityBuildingToDisplay === rf.BLDG_STABLE) {
		if (res !== store.context.cityBuildingBeingAddedPayment[0]) return true
		if (city.hasWorkingUniqueBuilding(props.playerIndexProp, rf.BLDG_PHILOSOPHY)) return true
	}
	// HOUSES
	if (store.context.cityBuildingToDisplay >= 25 && store.context.cityBuildingToDisplay <= 45) {
		let hasPhilosophy = city.hasWorkingUniqueBuilding(props.playerIndexProp, rf.BLDG_PHILOSOPHY)
		let cost = rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25]
		// FOOD CHECK
		if (rf.RES_FOODS.includes(res)) {
			// If res is food, and food cost is met, return false
			const foodCount = store.context.cityBuildingBeingAddedPayment.filter((number) => rf.RES_FOODS.includes(number)).length
			if (foodCount >= cost[0]) return false
			// So food cost is not met, if has philo, then tru
			if (hasPhilosophy) return true
			if (!store.context.cityBuildingBeingAddedPayment.includes(res)) return true
			return false
		}
		// LUX CHECK
		if (rf.RES_LUXS.includes(res)) {
			// If res is lux, and lux cost is met, return false
			const luxCount = store.context.cityBuildingBeingAddedPayment.filter((number) => rf.RES_LUXS.includes(number)).length
			if (luxCount >= cost[1]) return false
			// So food cost is not met, if has philo, then tru
			if (hasPhilosophy) return true
			if (!store.context.cityBuildingBeingAddedPayment.includes(res)) return true
			return false
		}
	}

	return false
}

function clickedCostRes(res) {
	if (!canSelectCostRes(res)) return

	store.context.cityBuildingBeingAddedPayment.push(res)
	// HOST / FOUNTAIN check for 1 lux
	if (store.context.cityBuildingToDisplay === rf.BLDG_HOSPITAL || store.context.cityBuildingToDisplay === rf.BLDG_FOUNTAIN) {
		store.context.action = rf.ACT_PLACE_BUILDING
		city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
		store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
	}
	// STABLE check for 2 lux
	else if (store.context.cityBuildingToDisplay === rf.BLDG_STABLE && store.context.cityBuildingBeingAddedPayment.length === 2) {
		store.context.action = rf.ACT_PLACE_BUILDING
		city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
		store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
	}
	// HOUSES
	else if (store.context.cityBuildingToDisplay >= 25 && store.context.cityBuildingToDisplay <= 45) {
		let cost = rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25]
		const foodCount = store.context.cityBuildingBeingAddedPayment.filter((number) => rf.RES_FOODS.includes(number)).length
		const luxCount = store.context.cityBuildingBeingAddedPayment.filter((number) => rf.RES_LUXS.includes(number)).length
		// Check cost met
		if (foodCount >= cost[0] && luxCount >= cost[1]) {
			store.context.action = rf.ACT_PLACE_BUILDING
			city.getAllFreeCitySquaresToHighlight(props.playerIndexProp)
			store.context.cityBuildingBeingAdded = store.context.cityBuildingToDisplay
		}
	}
}

function cancelSaintHouse() {
	store.clearVars()
	store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
}

function setUpBoardTrade() {
	store.context.action = rf.ACT_TRADE_BOARD
}

function setUpPlayerTrade() {
	store.context.setupPlayerTrade.yourResources.splice(0)
	store.context.setupPlayerTrade.opponentsResources.splice(0)
	store.context.setupPlayerTrade.selectedOpponent = -1
	store.context.setupPlayerTrade.yourPromise = ""
	store.context.setupPlayerTrade.opponentsPromise = ""
	if (store.players.length === 2) {
		store.context.setupPlayerTrade.selectedOpponent = 1
		if (personal.pov === 1) store.context.setupPlayerTrade.selectedOpponent = 0
	}
	store.context.action = rf.ACT_SETUP_PLAYER_TRADE
}

function showCancelButton() {
	if (!personal.canPlay()) return false
	if (!controller.shouldShowActivePlayerInfo(props.playerIndexProp)) return false
	if (store.context.action === rf.ACT_PLACE_BUILDING || store.context.action === rf.ACT_CHOOSE_BUILDING_PAYMENT || store.context.action === rf.ACT_SETUP_PLAYER_TRADE || store.context.action === rf.ACT_TRADE_BOARD) return true
	return false
}

function hospitalActionButton() {
	let playerIndex = props.playerIndexProp
	// End action
	if (store.context.action === rf.ACT_HOSPITAL_GRAVES) store.clearVars()
	// Auto-remove <=5
	else if (totalGraveCount(playerIndex) <= store.context.gravesLeftToRemove) {
		for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
			for (let j = store.players[playerIndex].cities[i].graves.length-1; j >= 0; j--) {
				city.addGraveToCity(playerIndex, i, store.players[playerIndex].cities[i].graves[j], false, false)
			}
		}
	}
	// Else start action
	else store.context.action = rf.ACT_HOSPITAL_GRAVES
}

function totalGraveCount(playerIndex) {
	let totalGraves = 0
	for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
		totalGraves += store.players[playerIndex].cities[i].graves.length
	}
	return totalGraves
}
</script>

<template>
	<div id="newBuildingDiv">
		<!-- ROT ANTI-CLOCKWISE -->
		<img class="rot_img" :class="(store.context.cityBuildingBeingAdded === rf.BLDG_STORAGE || rf.BLDG_ROTATABLE.includes(store.context.cityBuildingBeingAdded)) && city.canAddBuilding(playerIndexProp, store.context.cityBuildingBeingAdded) ? 'rot_img_enabled' : 'rot_img_disabled'" @click="rotateNewBuilding(-1)" :src="view.getImage('rot_anticlockwise')" />

		<div
			id="newBuildingSVGdiv"
			:style="{
				width: String(rf.SMALL_SQ * 4) + 'px',
				height: String(rf.SMALL_SQ * 4) + 'px',
			}">
			<svg id="newBuildingSVG" viewbox="0 100 -100 0">
				<!-- NEW BUILDING PATH -->
				<g v-if="store.context.cityBuildingToDisplay >= 0 && store.context.cityBuildingToDisplay < 20 && store.context.cityBuildingToDisplay !== rf.BLDG_STORAGE">
					<path class="newBuildingSVGpath" :fill="`url(#${store.context.cityBuildingToDisplayData.imgName})`" :d="getBldgPath(rf.BLDG_ARRAY[store.context.cityBuildingToDisplay], (4 - store.context.cityBuildingToDisplayData.width) / 2, (4 - store.context.cityBuildingToDisplayData.height) / 2)" :transform="`rotate(${store.context.cityBuildingBeingAddedRotation * 90}, ${rf.SMALL_SQ * 2}, ${rf.SMALL_SQ * 2})`" />
				</g>
				<!-- NEW STORAGE RECT -->
				<g v-else-if="store.context.cityBuildingToDisplay === rf.BLDG_STORAGE && (store.context.newStorageHeight * store.context.newStorageWidth) % 2 === 0">
					<rect
						class="newStorageRect"
						:style="{
							width: (store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? (rf.SMALL_SQ * 4) / 7 : rf.SMALL_SQ) * store.context.newStorageWidth + 'px',
							height: (store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? (rf.SMALL_SQ * 4) / 7 : rf.SMALL_SQ) * store.context.newStorageHeight + 'px',
						}"
						:x="(store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? ((7 - store.context.newStorageWidth) * rf.SMALL_SQ * 4) / 7 : (4 - store.context.newStorageWidth) * rf.SMALL_SQ) / 2 + 'px'"
						:y="(store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? ((7 - store.context.newStorageHeight) * rf.SMALL_SQ * 4) / 7 : (4 - store.context.newStorageHeight) * rf.SMALL_SQ) / 2 + 'px'"
						:fill="`url(#b_storage_${store.context.newStorageWidth}${store.context.newStorageHeight})`" />
					<!-- INDIVIDUAL RECTS -->
					<g v-for="(width, idx1) in store.context.newStorageWidth" :key="idx1">
						<g v-for="(height, idx2) in store.context.newStorageHeight" :key="idx2">
							<rect
								class="newStorageIndividualRect"
								:style="{
									width: (store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? 4 / 7 : 1) * rf.SMALL_SQ + 'px',
									height: (store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? 4 / 7 : 1) * rf.SMALL_SQ + 'px',
								}"
								:x="(store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? ((7 - store.context.newStorageWidth) * rf.SMALL_SQ * 4) / 7 / 2 + ((rf.SMALL_SQ * 4) / 7) * (width - 1) : ((4 - store.context.newStorageWidth) * rf.SMALL_SQ) / 2 + rf.SMALL_SQ * (width - 1)) + 'px'"
								:y="(store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? ((7 - store.context.newStorageHeight) * rf.SMALL_SQ * 4) / 7 / 2 + ((rf.SMALL_SQ * 4) / 7) * (height - 1) : ((4 - store.context.newStorageHeight) * rf.SMALL_SQ) / 2 + rf.SMALL_SQ * (height - 1)) + 'px'" />
						</g>
					</g>
				</g>
				<g v-else-if="store.context.cityBuildingToDisplay === rf.BLDG_STORAGE && (store.context.newStorageHeight * store.context.newStorageWidth) % 2 === 1">
					<text class="invalidStorageText" x="50%" y="33%" text-anchor="middle" alignment-baseline="middle">
						<tspan x="50%" dy="0px">Stores must be</tspan>
						<tspan x="50%" dy="25px">in 2x1 blocks</tspan>
						<tspan x="50%" dy="25px">EG 1x6, 3x4</tspan>
						<tspan x="50%" dy="25px">2x3, 5x2</tspan>
					</text>
				</g>
				<!-- NEW HOUSE PATH -->
				<g v-else-if="store.context.cityBuildingToDisplay > 20">
					<path class="newBuildingSVGpath" :fill="`url(#h_${store.context.cityBuildingToDisplay - 20})`" :d="getBldgPath('HOUSE', 1.5, 1.5)" />
				</g>

				<!-- HIGHLIGHT ANCHOR RECT-->
				<rect
					v-if="store.context.cityBuildingBeingAdded !== rf.BLDG_STORAGE && store.context.cityBuildingBeingAdded >= 0 && store.context.cityBuildingBeingAdded < 20 && store.context.cityBuildingBeingAdded !== rf.BLDG_STORAGE && store.context.cityBuildingBeingAdded !== rf.BLDG_FOUNTAIN && city.canAddBuilding(playerIndexProp, store.context.cityBuildingBeingAdded)"
					class="newBuildingAnchorRect"
					:style="{
						width: rf.SMALL_SQ + 'px',
						height: rf.SMALL_SQ + 'px',
					}"
					:x="((4 - store.context.cityBuildingToDisplayData.width + 2 * store.context.cityBuildingToDisplayData.path[0]) / 2) * rf.SMALL_SQ"
					:y="((4 - store.context.cityBuildingToDisplayData.height) / 2) * rf.SMALL_SQ"
					:transform="`rotate(${store.context.cityBuildingBeingAddedRotation * 90}, ${rf.SMALL_SQ * 2}, ${rf.SMALL_SQ * 2})`" />
				<rect
					v-else-if="store.context.cityBuildingBeingAdded === rf.BLDG_STORAGE && (store.context.newStorageHeight * store.context.newStorageWidth) % 2 === 0"
					class="newBuildingAnchorRect"
					:style="{
						width: (store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? 4 / 7 : 1) * rf.SMALL_SQ + 'px',
						height: (store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? 4 / 7 : 1) * rf.SMALL_SQ + 'px',
					}"
					:x="(store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? ((7 - store.context.newStorageWidth) * rf.SMALL_SQ * 4) / 7 : (4 - store.context.newStorageWidth) * rf.SMALL_SQ) / 2 + 'px'"
					:y="(store.context.newStorageWidth > 4 || store.context.newStorageHeight > 4 ? ((7 - store.context.newStorageHeight) * rf.SMALL_SQ * 4) / 7 : (4 - store.context.newStorageHeight) * rf.SMALL_SQ) / 2 + 'px'" />
			</svg>
		</div>
		<!-- ROT CLOCKWISE -->
		<img class="rot_img" :class="(store.context.cityBuildingBeingAdded === rf.BLDG_STORAGE || rf.BLDG_ROTATABLE.includes(store.context.cityBuildingBeingAdded)) && city.canAddBuilding(playerIndexProp, store.context.cityBuildingBeingAdded) ? 'rot_img_enabled' : 'rot_img_disabled'" @click="rotateNewBuilding(1)" :src="view.getImage('rot_clockwise')" />
		<br />

		<!-- STORAGE SELECTOR -->
		<div v-if="store.context.cityBuildingBeingAdded === rf.BLDG_STORAGE">
			Size: W
			<select v-model="store.context.newStorageWidth" @change="adjustStoreSize(1)" :disabled="store.players[props.playerIndexProp].requiredRebuilds.some((subarray) => subarray.bldgNum === rf.BLDG_STORAGE)">
				<option v-for="number in 7" :key="number" :value="number">{{ number }}</option>
			</select>
			x H
			<select v-model="store.context.newStorageHeight" @change="adjustStoreSize(2)" :disabled="store.players[props.playerIndexProp].requiredRebuilds.some((subarray) => subarray.bldgNum === rf.BLDG_STORAGE)">
				<option v-for="number in 7" :key="number" :value="number">{{ number }}</option>
			</select>
		</div>

		<!-- REMOVE GRAVES BUTTON -->
		<template v-if="store.context.cityBuildingToDisplay === rf.BLDG_HOSPITAL && city.hasWorkingUniqueBuilding(playerIndexProp, rf.BLDG_HOSPITAL)">
			<button @click="hospitalActionButton" :disabled="store.context.gravesLeftToRemove <= 0" class="actionsLineButton">
				<span v-if="store.context.action === rf.ACT_HOSPITAL_GRAVES">Stop Removing Graves</span>
				<span v-else-if="totalGraveCount(playerIndexProp) <= store.context.gravesLeftToRemove">Remove All Graves ({{ totalGraveCount(playerIndexProp) }})</span>
				<span v-else>Remove Graves ({{ store.context.gravesLeftToRemove }} Left)</span>
			</button>
			<br />
		</template>

		<!-- RAZE BUTTON -->
		<template v-if="(store.context.cityBuildingToDisplay === rf.BLDG_CATHEDRAL || store.context.cityBuildingToDisplay === rf.BLDG_THEOLOGY) && store.players[playerIndexProp].cathedralStatus < 5 && city.hasWorkingUniqueBuilding(playerIndexProp, rf.BLDG_THEOLOGY) && city.hasWorkingUniqueBuilding(playerIndexProp, rf.BLDG_CATHEDRAL)">
			<button v-if="store.players[playerIndexProp].saint !== rf.SAINT_MARIA" @click="city.razeCathedral(playerIndexProp)" class="actionsLineButton">Raze Cathedral</button>
			<span v-else class="redText">You cannot Raze Santa Maria's Cathedral</span>
			<br />
		</template>

		<!-- TRADE BUTTONS -->
		<template v-else-if="store.context.cityBuildingToDisplay === rf.BLDG_MARKET && store.context.action !== rf.ACT_TRADE_BOARD && store.context.action !== rf.ACT_SETUP_PLAYER_TRADE && city.hasWorkingUniqueBuilding(playerIndexProp, store.context.cityBuildingToDisplay, false) && personal.canPlay() && store.gameflow.phase === rf.PHASE_CITY_BUILDING">
			<button @click="setUpBoardTrade" class="actionsLineButton">Trade Goods With Board</button>
			<br />
			<button v-if="!personal.trainingGame && !store.sandboxMode" @click="setUpPlayerTrade" class="actionsLineButton">Trade Goods With Other Players</button>
			<br />
		</template>

		<template v-else-if="store.context.cityBuildingToDisplay === rf.BLDG_MARKET && store.context.action === rf.ACT_TRADE_BOARD">
			Trade Goods 2:1 in the upper left resource area
			<br />
			<template v-if="store.context.tradingAwayGoods.length > 0">
				Trading:
				<img v-for="(res, idx) in store.context.tradingAwayGoods" :key="idx" class="newBuildingCostResMultiple" :src="view.getImage('res_' + String(res))" />
			</template>
			<br />
		</template>

		<!-- CANCEL BUTTON -->
		<template v-if="showCancelButton()">
			<button @click="city.cancelButton" class="actionsLineButton">
				<span v-if="store.context.action === rf.ACT_TRADE_BOARD">
					Stop Trading
				</span>
				<span v-else>
				Cancel
				</span>
			</button>
			<br />
		</template>

		<b>
			<u>{{ getNewBldgName() }}</u>
		</b>
		<br />
		<span v-if="store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE">
			<button class="actionsLineButton" @click="cancelSaintHouse">Cancel</button>
			<br />
		</span>
		{{ getNewBldgDescription() }}
		<br />
		<template v-if="store.context.cityBuildingBeingAdded !== rf.BLDG_GRAVE">
			<b><u>Cost</u></b>
		</template>
		<br />

		<span v-if="store.context.cityBuildingToDisplay === -1">(Building Cost)</span>

		<!-- PREVIOUS TURN BUILDING BEING READDED -->
		<div v-if="store.players[props.playerIndexProp].requiredRebuilds.some((subarray) => subarray.bldgNum === store.context.cityBuildingBeingAdded)">
			<br />
			Free (Cost paid previously)
		</div>
		<div v-else-if="store.context.saintHousesThisTurn.includes(store.context.cityBuildingBeingAdded)">
			<br />
			Free (Cost paid when house used with Saint Power)
		</div>

		<!-- NEW BUILDING COST NORMAL BUILDING -->
		<div v-else-if="store.context.cityBuildingToDisplay >= 0 && store.context.cityBuildingToDisplay < 20" class="newBuildingCostSpan">
			<!-- WOOD -->
			<template v-if="store.context.cityBuildingToDisplayData.cost[0] > 0">
				<img class="newBuildingCostRes" :src="view.getImage('res_0')" />
			</template>
			<!-- STONE -->
			<template v-if="store.context.cityBuildingToDisplayData.cost[1] > 0">
				<span v-if="store.context.cityBuildingToDisplayData.cost[1] > 1">{{ store.context.cityBuildingToDisplayData.cost[1] }}x</span>
				<img class="newBuildingCostRes" :src="view.getImage('res_1')" />
			</template>
			<!-- LUXURY GOODS -->
			<template v-if="store.context.cityBuildingToDisplayData.cost[2] > 0">
				<span v-if="store.context.cityBuildingToDisplayData.cost[2] > 0">{{ store.context.cityBuildingToDisplayData.cost[2] }} x</span>
				<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_GOLD)" :class="{ resSelectable: canSelectCostRes(rf.RES_GOLD) }" :src="view.getImage('res_' + String(rf.RES_GOLD))" />
				/
				<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_WINE)" :class="{ resSelectable: canSelectCostRes(rf.RES_WINE) }" :src="view.getImage('res_' + String(rf.RES_WINE))" />
				/
				<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_PEARLS)" :class="{ resSelectable: canSelectCostRes(rf.RES_PEARLS) }" :src="view.getImage('res_' + String(rf.RES_PEARLS))" />
				/
				<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_DYE)" :class="{ resSelectable: canSelectCostRes(rf.RES_DYE) }" :src="view.getImage('res_' + String(rf.RES_DYE))" />
				<template v-if="store.context.cityBuildingToDisplayData.cost[2] > 1">
					<span v-if="city.hasWorkingUniqueBuilding(props.playerIndexProp, rf.BLDG_PHILOSOPHY)" class="newBuildingLuxText">
						<br />
						Your Faculty of Philosophy allows you to use the same Luxury Good
					</span>
					<span v-else class="newBuildingLuxText">The Luxury Goods must be different</span>
				</template>
			</template>
		</div>

		<!-- NEW BUILDING COST HOUSE -->
		<div v-else-if="store.context.cityBuildingToDisplay >= 20 && store.context.cityBuildingToDisplay <= 24" class="newBuildingCostSpan">Free</div>
		<div v-else-if="store.context.cityBuildingToDisplay >= 25 && store.context.cityBuildingToDisplay <= 45" class="newBuildingCostSpan">
			<template v-if="store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE">Free (Saint Power)</template>
			<template v-else>
				<!-- FOOD -->
				<template v-if="rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25][0] > 0">
					<span v-if="rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25][0] > 0">{{ rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25][0] }} x</span>
					<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_GRAIN)" :class="{ resSelectable: canSelectCostRes(rf.RES_GRAIN) }" :src="view.getImage('res_' + String(rf.RES_GRAIN))" />
					/
					<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_SHEEP)" :class="{ resSelectable: canSelectCostRes(rf.RES_SHEEP) }" :src="view.getImage('res_' + String(rf.RES_SHEEP))" />
					/
					<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_OLIVES)" :class="{ resSelectable: canSelectCostRes(rf.RES_OLIVES) }" :src="view.getImage('res_' + String(rf.RES_OLIVES))" />
					/
					<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_FISH)" :class="{ resSelectable: canSelectCostRes(rf.RES_FISH) }" :src="view.getImage('res_' + String(rf.RES_FISH))" />
				</template>

				<!-- LUXURY GOODS -->
				<template v-if="rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25][1] > 0">
					<br />
					<span v-if="rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25][1] > 0">{{ rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25][1] }} x</span>
					<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_GOLD)" :class="{ resSelectable: canSelectCostRes(rf.RES_GOLD) }" :src="view.getImage('res_' + String(rf.RES_GOLD))" />
					/
					<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_WINE)" :class="{ resSelectable: canSelectCostRes(rf.RES_WINE) }" :src="view.getImage('res_' + String(rf.RES_WINE))" />
					/
					<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_PEARLS)" :class="{ resSelectable: canSelectCostRes(rf.RES_PEARLS) }" :src="view.getImage('res_' + String(rf.RES_PEARLS))" />
					/
					<img class="newBuildingCostResMultiple" @click="clickedCostRes(rf.RES_DYE)" :class="{ resSelectable: canSelectCostRes(rf.RES_DYE) }" :src="view.getImage('res_' + String(rf.RES_DYE))" />
				</template>
				<template v-if="rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25][0] > 1 || rf.HOUSE_COSTS[store.context.cityBuildingToDisplay - 25][1] > 1">
					<span v-if="city.hasWorkingUniqueBuilding(props.playerIndexProp, rf.BLDG_PHILOSOPHY)" class="newBuildingLuxText">
						<br />
						Your Faculty of Philosophy allows you to use the same Goods
					</span>
					<span v-else class="newBuildingLuxText">The Goods must be different</span>
				</template>
			</template>
		</div>

		<span v-if="store.context.cityBuildingBeingAddedPayment[0] === -1 && personal.canPlay() && controller.shouldShowActivePlayerInfo(playerIndexProp)" class="redText">
			<br />
			You Cannot Afford This Building
		</span>
		<span v-if="store.context.buildingMoveError > 0" class="redText">
			<br />
			<span v-if="store.context.buildingMoveError === 1">Not built this turn</span>
			<span v-else-if="store.context.buildingMoveError === 2">A manned Hospital cannot be moved without the Saint power</span>
			<span v-else-if="store.context.buildingMoveError === 3">A manned University cannot be moved without the Saint power</span>
			<span v-else-if="store.context.buildingMoveError === 4">You have used your Faculty of Theology to raze your Cathedral</span>
			<span v-else-if="store.context.buildingMoveError === 5">You have used your Market to Trade</span>
			<span v-else-if="store.context.buildingMoveError === 6">A cathedral cannot be moved after a saint power has been used</span>
			<span v-else-if="store.context.buildingMoveError === 7">No free space to move grave</span>
			<span v-else-if="store.context.buildingMoveError === 8">You cannot build a hospital in the middle of moving buildings</span>
		</span>

		<!-- ONLY SHOW SELECTED PAYMENT FOR YOU IN YOUR CITY IN YOUR TURN-->
		<template v-if="personal.canPlay() && controller.shouldShowActivePlayerInfo(playerIndexProp)">
			<span v-if="store.context.action === rf.ACT_CHOOSE_BUILDING_PAYMENT || rf.BLDG_COMPLEX_COST.includes(store.context.cityBuildingBeingAdded)">
				<b><u>Selected Payment</u></b>
				<br />
				<span v-if="store.context.cityBuildingBeingAddedPayment.length === 0">None</span>
				<span v-else>
					<img v-for="(res, idx) in store.context.cityBuildingBeingAddedPayment" :key="idx" class="resPaymentImg" :src="view.getImage('res_' + String(res))" />
				</span>
			</span>
		</template>
		<br />
	</div>
</template>

<style scoped>
#newBuildingDiv {
	position: relative;
	vertical-align: top;
	border: 2px solid black;
	height: fit-content;
	min-height: 412px;
	width: 300px;
	font-size: 20px;
	display: inline-block;
	margin-right: 4px;
}

#newBuildingSVG {
	margin: 0 auto;
	margin-right: 50px;
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0px;
	left: 0px;
}

.newBuildingSVGpath,
.buildingSVGpath {
	stroke: black;
	stroke-width: 3px;
}

#newBuildingSVGdiv {
	position: relative;
	display: inline-block;
}

.newStorageRect {
	/*fill: rgb(171, 148, 85);*/
	stroke: black;
	stroke-width: 3px;
}
.newStorageIndividualRect {
	/*fill: rgb(171, 148, 85);*/
	fill: none;
	stroke: black;
	stroke-width: 1px;
}

.invalidStorageText {
	text-shadow:
		-1px -1px 0 white,
		1px -1px 0 white,
		-1px 1px 0 white,
		1px 1px 0 white;
}
.newBuildingAnchorRect {
	fill: yellow;
	opacity: 0.5;
}

.newBuildingCostRes {
	border: 1px solid black;
	width: 75px;
	height: 75px;
	vertical-align: middle;
}

.newBuildingCostResMultiple {
	border: 1px solid black;
	width: 50px;
	height: 50px;
	vertical-align: middle;
	border: 1px solid black;
}

.resSelectable {
	border-color: yellow;
	border-width: 2px;
}

.resSelectable:hover {
	border-color: lightgreen;
	border-width: 2px;
}

.newBuildingLuxText {
	display: inline-block;
	font-size: 15px;
	line-height: 17px;
	font-weight: bolder;
}

.resPaymentImg {
	width: 50px;
	height: 50px;
	vertical-align: middle;
	border: 1px solid black;
	margin-right: 5px;
}

.newBuildingCostSpan {
	font-weight: bolder;
	font-size: 20px;
}

.rot_img {
	width: 50px;
	height: 50px;
	border: 1px solid black;
	border-radius: 15px;
	margin: 5px;
}

.rot_img_enabled:hover {
	border: 1px solid yellow;
}

.rot_img_disabled {
	opacity: 0.3;
}

.redText {
	font-weight: bolder;
	color: red;
}
</style>
