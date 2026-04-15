<script setup>
/** This is the MAIN action area for the city
 * It should ONLY contain
 * RESET WHOLE TURN
 * END PHASE
 *
 * All the minor actions are done above the first city,
 * or next to the new building area
 *
 * The code to change phases should move to controller.js
 */

import * as view from "../js/AQYview.js"
//import * as map from '../js/AQYmap.js'
import * as rf from "../js/AQYreference.js"
import * as city from "../js/AQYcity.js"
import * as controller from "../js/AQYcontroller.js"
import * as model from "../js/AQYmodel.js"
import * as funcs from "../js/AQYfuncs.js"
import * as Bot from "../js/AQYbot.js"
import * as IO from "../backend/AQY_IO"
import * as country from "../js/AQYcountry.js"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

const store = useModelStore()

const props = defineProps({
	playerIndexProp: {
		type: Number,
		required: true,
		default: 0,
		prop: "playerIndexProp", // Specify the name of the prop in the parent component
	},
})

function localEndTurn() {
	if (store.gameflow.phase === rf.PHASE_CITY_BUILDING) {
		if (store.context.action !== rf.ACT_CONFIRM_END_TURN) {
			model.createUndoPoint()
			store.context.action = rf.ACT_CONFIRM_END_TURN
		} else controller.endPlayerTurn()
	} else controller.endPlayerTurn()
}

/**
 * Player Choose Saint
 */
function clickedSaint(saintID) {
	// DO NOT USE props.playerIndexProp or it will give the saint to the city YOU ARE LOOKING AT
	let saintPlayerIndex = personal.pov
	if (personal.trainingGame) saintPlayerIndex = controller.currentPlayerIndex()
	store.players[saintPlayerIndex].saint = saintID
	store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
	// Add history
	store.players[saintPlayerIndex].cityHistory.saintChosen = saintID

	store.clearVars()

	// Add an undo point
	model.createUndoPoint()
}

/**
 * Returns the reason unable to end phase
 * Requirements:
 * 1) x
 * 2) x
 * 3) x
 * 4) x
 */

function getReasonUnableToEndPhase() {
	if (store.gameflow.phase === rf.PHASE_POLLUTION) {
		if (store.context.pollutionLeftToPlace > 0) return "Place remaining Pollution"
		if (store.context.gravesLeftToPlace > 0) return "Place remaining Graves"
		return ""
	}
	if (store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE) return `Finish placing free house`

	if (store.context.action !== rf.ACT_NONE) return "You cannot end the phase mid-action"
	if (store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS) return "Finish (Re)moving buildings to end phase"
	if (store.context.gravesLeftToPlace > 0) return "Finish placing all graves"
	if (city.getAvailableStorage(controller.currentPlayerIndex()) > 0 && store.context.resourcesToDiscard > 0) return "" // return "Finish storing all goods"
	if (store.players[controller.currentPlayerIndex()].requiredRebuilds.length !== 0) {
		let str = "Before ending the phase, you must readd: "
		for (let i = 0; i < store.players[controller.currentPlayerIndex()].requiredRebuilds.length; i++) {
			let bldgNum = store.players[controller.currentPlayerIndex()].requiredRebuilds[i].bldgNum
			if (bldgNum > 20) bldgNum = 20
			str += rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]].name
			//str += String(store.players[controller.currentPlayerIndex()].requiredRebuilds[i].bldgNum)
			if (i < store.players[controller.currentPlayerIndex()].requiredRebuilds.length - 1) str += ", "
		}
		return str
	}
	if (store.players[controller.currentPlayerIndex()].availableMen === -1) return "You need to re-add 1 house"
	if (store.players[controller.currentPlayerIndex()].availableMen < -1) return `You need to re-add ${store.players[controller.currentPlayerIndex()].availableMen * -1} houses`

	return ""
}

function getCityEndTurnWarnings() {
	let ret = []
	let player = controller.currentPlayerObj()
	let playerIndex = controller.currentPlayerIndex()
	let resources = player.availableResources
	// Warning: build 2 storages in same turn
	let storageCount = 0
	for (let i = 0; i < player.cities.length; i++) {
		for (let j = 0; j < player.cities[i].buildings.length; j++) {
			if (player.cities[i].buildings[j].bldgNum === rf.BLDG_STORAGE && player.cities[i].buildings[j].builtThisTurn === true) {
				storageCount++
			}
		}
	}
	if (storageCount > 1) ret.push(["red", "Warning: You have built 2 separate Storage Buildings. Did you mean to build 1 big storage?"])
	// Caution: Mannable buildings (carts??), spare men, buildings not manned
	if (player.availableMen > 0) {
		let cautionFound = false
		for (let i = 0; i < player.cities.length; i++) {
			for (let j = 0; j < player.cities[i].buildings.length; j++) {
				if (player.cities[i].buildings[j].manned === false && rf.MANNABLE_BUILDINGS.includes(player.cities[i].buildings[j].bldgNum)) {
					cautionFound = true
					break
				}
			}
			if (cautionFound) break
		}
		if (cautionFound) ret.push(["orange", "Caution: You have spare men and unmanned buildings"])
	}
	// Caution: storage < current resources
	if (player.saint !== rf.SAINT_CHRISTOFORI && player.saint !== rf.SAINT_MARIA) {
		let resCount = player.availableResources.reduce((acc, curr) => acc + curr, 0)
		let availableStorage = city.getAvailableStorage(playerIndex)

		// Add in the manned carts - assume each uses one res
		availableStorage += city.getCartShopStatus(props.playerIndexProp)[0]
		// NOTE: carts don't offset Stone, Gold, Pearl, Dye
		/*if there is an excess of resources compared to the storage space (if storage is manned, ofc) 
the number of Stone, Gold, Pearl and Dye can be properly stored
the eccess of resources does not exceed the number of manne carts*/
		/*if I have 4 storage spaces and 6 resources, with 2 manned carts
then I only need to be sure that I have no more than 5 of Gold, Stone, Dye, Pearl altogether. */
		if (availableStorage < resCount) ret.push(["orange", "Caution: You cannot currently store all your resources (More might be spent in the Countryside Building phase)"])
	}
	// Warning: No wood, no manned cart shops, no wood harvest
	if (resources[rf.RES_WOOD] <= 0 && city.getCartShopStatus(playerIndex)[0] === 0 && !country.getExpectedHarvestResources(playerIndex, city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_FORCED_LABOUR, false)).includes(rf.RES_WOOD)) ret.push(["red", "WARNING: You have no wood and no manned Cart Shops"])

	// Unresolved trades
	if (store.context.relevantIncomingTrades.length > 0) ret.push(["orange", "Caution: You have unresolved trades These will be cancelled"])
	if (store.context.relevantOutgoingTrades.length > 0) ret.push(["orange", "Caution: You have unresolved trades. These will be cancelled"])
	
	// Manned and unused hospital
	if (player.cities.some(city => city.buildings.some(building => building.bldgNum === rf.BLDG_HOSPITAL && building.manned && !building.usedThisTurn))) ret.push(["red", "Caution: You have manned a Hospital but not used it. Click the Hospital then the button in the centre"])
	
	return ret
}

/**
 * Toggle Sandbox Mode
 * Save current game states when enter and restore when exit
 */
function toggleSandboxPhase() {
	if (!store.sandboxMode) {
		store.sandboxResetData = funcs.simpleExportWholeModel()
		store.sandboxMode = true
	} else {
		funcs.simpleImportWholeModel(store.sandboxResetData)
		store.sandboxMode = false
	}
}

function showStorage() {
	if (store.gameflow.phase === rf.PHASE_STORE_GOODS) return true
	if (store.gameflow.phase === rf.PRE_PHASE_STORE_GOODS) return true
	return false
}

function putBackToStorage(res) {
	if (!store.context.discardedResources.includes(res)) {
		return
	}
	store.context.resourcesToDiscard++
	store.players[props.playerIndexProp].availableResources[res]++

	const index = store.context.discardedResources.indexOf(res)

	if (index !== -1) {
		store.context.discardedResources.splice(index, 1)
	}
}

function localClickResign() {
	if (store.context.action !== rf.ACT_CONFIRM_RESIGN) store.context.action = rf.ACT_CONFIRM_RESIGN
	else Bot.actionResign()
}

function cancelButton() {
	store.clearVars()
	store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
}
</script>

<template>
	<div id="wholeActionArea" v-if="personal.canPlay()">
		<!-- START DEV USE -->
		<!--
		<div>[DEV] SubPhase: {{ rf.SUB_PHASE_ARRAY[store.gameflow.phase] }} ({{ store.gameflow.phase }})</div>
		<div>[DEV] SubPhase: {{ rf.SUB_PHASE_ARRAY[store.gameflow.subPhase] }} ({{ store.gameflow.subPhase }})</div>
		-->
		<!-- END DEV Use -->

		<!-- CITY PHASE, NOT ending turn, NOT confirm resign -->
		<template v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_CONFIRM_RESIGN">
			<span v-if="store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS">Build New City Buildings</span>
			<span v-else-if="store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS">Re(move) City Buildings</span>
			<div v-else-if="store.gameflow.subPhase === rf.SUB_PHASE_CHOOSE_SAINT">
				Choose your Patron Saint
				<br />
				<div class="chooseSaintDiv" v-for="(saint, idx) in rf.SAINT_INFO" :key="idx" @click="clickedSaint(saint.id)">
					<b>{{ saint.name }}</b>
					<br />
					<img class="newSaintImg" :src="view.getImage('saint_' + idx)" />
					<br />
					Bonus: {{ saint.bonus }}
					<br />
					VR: {{ saint.VR }}
				</div>
			</div>

			<span v-if="store.context.action === rf.ACT_CHOOSE_BUILDING_PAYMENT">
				<br />
				Choose your payment to add a:
				<b>{{ store.context.cityBuildingToDisplayData.name }}</b>
			</span>

			<!-- BUTTONS -->
			<br />
			<button v-if="controller.canResign()" @click="localClickResign()" class="actionsLineButton resignButton">Resign</button>
			<button @click="model.resetWholeTurn" class="actionsLineButton">Reset whole turn</button>
			<button v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING" @click="model.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length === 0">Undo</button>
			<button class="actionsLineButton" @click="toggleSandboxPhase">
				<span v-if="!store.sandboxMode">Enter</span>
				<span v-else>Exit</span>
				Sandbox Mode
			</button>
		</template>

		<!-- CITY BUILD, confirm end turn -->
		<template v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING && store.context.action === rf.ACT_CONFIRM_END_TURN">
			<template v-for="(entry, idx) in getCityEndTurnWarnings()" :key="idx">
				<span v-if="idx !== 0"><br /></span>
				<span
					class="endOfTurnIssueSpan"
					:style="{
						color: entry[0],
					}">
					{{ entry[1] }}
				</span>
			</template>
			<!-- BUTTONS -->
			<br />
			<button @click="model.resetWholeTurn" class="actionsLineButton">Reset whole turn</button>
			<!--<button v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING" @click="model.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length === 0">Undo</button>-->
			<button v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING" @click="store.clearVars()" class="actionsLineButton">Back To City</button>
		</template>

		<!-- COUNTRY PHASE -->
		<template v-if="store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING">
			Manned Cart Shops: {{ city.getCartShopStatus(0)[0] }}
			<br />
			Un-manned Cart Shops: {{ city.getCartShopStatus(0)[1] }}
			<br />
			Graved Cart Shops: {{ city.getCartShopStatus(0)[2] }}
			<br />
			<br />
			Build in the countryside
		</template>

		<!-- FAMINE PHASE -->
		<template v-if="store.gameflow.phase === rf.PHASE_FAMINE">
			Graves Left To Place: {{ store.context.gravesLeftToPlace }}
			<br />
			<button v-if="IO.DEBUG_USERS.includes(personal.name)" class="actionsLineButton" @click="store.context.gravesLeftToPlace = 0">CHEAT: REMOVE ALL GRAVES</button>
			<button @click="model.resetWholeTurn" class="actionsLineButton">Reset whole turn</button>
		</template>

		<!-- PRE FAMINE PHASE -->
		<template v-if="store.gameflow.phase === rf.PRE_PHASE_FAMINE">
			Graves Left To Place: {{ store.context.gravesLeftToPlace }}
			<br />
			(You will need to place
			{{ Math.max(store.context.preMoveGravesArr[0] - store.context.preMoveGravesArr[1], 0) }}
			<span v-if="store.context.preMoveGravesArr[1] > 0">- {{ store.context.preMoveGravesArr[0] }}</span>
			graves)
			<br />
			<button @click="model.resetPreMove" class="actionsLineButton">Cancel Pre Move</button>
			<button v-if="store.players[personal.pov].preMoves.some((move) => move.phase === rf.PRE_PHASE_FAMINE)" @click="IO.savePreTurn(rf.PRE_PHASE_FAMINE, [-999])" class="actionsLineButton">Delete Pre Move</button>
			<button v-if="store.context.gravesLeftToPlace === 0" @click="IO.savePreTurn(rf.PRE_PHASE_FAMINE, [...store.context.historyObj])" class="actionsLineButton">Save Famine Turn</button>
		</template>

		<!-- POLLUTION PHASE -->
		<template v-if="store.gameflow.phase === rf.PHASE_POLLUTION && store.context.gravesLeftToPlace === 0">
			Place pollution into your Zone of Control
			<br />
		</template>
		<template v-else-if="store.gameflow.phase === rf.PHASE_POLLUTION && store.context.gravesLeftToPlace > 0">
			No space for pollution in your Zone of Control - Pollution converted to graves
			<br />
			Graves Left To Place: {{ store.context.gravesLeftToPlace }}
			<br />
			<button v-if="IO.DEBUG_USERS.includes(personal.name)" class="actionsLineButton" @click="store.context.gravesLeftToPlace = 0">CHEAT: REMOVE ALL GRAVES</button>
		</template>

		<!-- STORAGE PHASE -->
		<template v-if="store.gameflow.phase === rf.PHASE_STORE_GOODS || store.gameflow.phase === rf.PRE_PHASE_STORE_GOODS">
			<div v-if="showStorage()" style="clear: both">
				<div class="boldDiv">
					Available storage: {{ city.getAvailableStorage(controller.currentPlayerIndex()) }}
					<button v-if="IO.DEBUG_USERS.includes(personal.name)" @click="store.context.resourcesToDiscard = 0">CHEAT: Store all</button>
				</div>
				<div class="boldDiv" :class="{ moreToDiscard: store.context.resourcesToDiscard > 0 }">Resources to discard: {{ store.context.resourcesToDiscard }}</div>
				<div class="boldDiv">
					<span v-if="store.context.discardedResources.length === 0">Click Resources in your Resource Table to Discard</span>
					<span v-else>Discarded resources (click to keep):</span>
				</div>
				<div v-for="(res, idx) in store.context.discardedResources" :key="idx" class="discardedResDiv">
					<img :src="view.getImage('res_' + String(res))" @click="putBackToStorage(res)" />
				</div>
			</div>
		</template>

		<button v-if="store.gameflow.phase === rf.PHASE_POLLUTION" @click="model.resetWholeTurn" class="actionsLineButton">Reset whole turn</button>

		<!-- PRE_PHASE_STORAGE - ADDITIONAL-->
		<template v-if="store.gameflow.phase === rf.PRE_PHASE_STORE_GOODS">
			<button @click="model.resetPreMove" class="actionsLineButton">Cancel Pre Move</button>
			<button v-if="store.players[personal.pov].preMoves.some((move) => move.phase === rf.PRE_PHASE_STORE_GOODS)" @click="IO.savePreTurn(rf.PRE_PHASE_STORE_GOODS, [-999])" class="actionsLineButton">Delete Pre Move</button>
		</template>

		<template v-if="store.gameflow.phase === rf.PRE_PHASE_STORE_GOODS && store.context.resourcesToDiscard === 0">
			<button @click="IO.savePreTurn(rf.PRE_PHASE_STORE_GOODS, [...store.players[personal.pov].availableResources])" class="actionsLineButton">Save Storage Turn</button>
		</template>

		<!-- END TURN BUTTONS -->
		<template v-if="rf.CITY_PHASES.includes(store.gameflow.phase) && controller.canEndPlayerTurn()">
			<button @click="localEndTurn" class="actionsLineButton">
				<span v-if="[rf.PHASE_CITY_BUILDING].includes(store.gameflow.phase)">Finish Actions</span>
				<span v-else>End Turn</span>
			</button>
		</template>

		<!-- CONFIRM END TURN -->
		<template v-else-if="rf.CITY_PHASES.includes(store.gameflow.phase) && store.context.action === rf.ACT_CONFIRM_END_TURN">
			<button @click="localEndTurn" class="actionsLineButton">End Turn</button>
		</template>
		<!-- Rason unable to end turn-->
		<template v-else-if="rf.CITY_PHASES.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_RESIGN">
			<div id="unableEndTurnDiv">
				{{ getReasonUnableToEndPhase() }}
			</div>
			<template v-if="store.context.action === rf.ACT_SETUP_PLAYER_TRADE || store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS || store.context.action === rf.ACT_MAN_BLDG || store.context.action === rf.ACT_UNMAN_BUILDING || store.context.action === rf.ACT_PLACE_BUILDING || store.context.action === rf.ACT_TRADE_BOARD || store.context.action === rf.ACT_CHOOSE_BUILDING_PAYMENT || store.context.action === rf.ACT_HOSPITAL_GRAVES || store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE">
				<button @click="cancelButton" class="actionsLineButton">
					<span v-if="store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE">Cancel Free House</span>
					<span v-else-if="store.context.action === rf.ACT_PLACE_BUILDING">Cancel Placing Building</span>

					<span v-if="store.context.action === rf.ACT_SETUP_PLAYER_TRADE">Cancel Trading</span>
					<span v-if="store.gameflow.subPhase === rf.SUB_PHASE_MOVE_BUILDINGS">Finish (Re)Moving</span>
					<span v-if="store.context.action === rf.ACT_MAN_BLDG">Stop Manning Buildings</span>
					<span v-if="store.context.action === rf.ACT_UNMAN_BUILDING">Stop Unmanning Buildings</span>
					<span v-if="store.context.action === rf.ACT_TRADE_BOARD">Stop Trading</span>
					<span v-if="store.context.action === rf.ACT_CHOOSE_BUILDING_PAYMENT">Cancel Choosing Payment</span>
					<span v-if="store.context.action === rf.ACT_HOSPITAL_GRAVES">Stop Removing Graves</span>
				</button>
			</template>
		</template>
		<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN">
			<span class="resigntext">Are you sure you want to resign?</span>
			<br />
			<button @click="store.clearVars()" class="actionsLineButton resignButton">Cancel</button>
			<button @click="localClickResign()" class="actionsLineButton">Resign</button>
		</template>
	</div>
	<div v-if="store.topMenuViews.showLoader" class="fLoadingBar">
		<img :src="view.getImage('loading-bar-black')" />
	</div>
</template>

<style scoped>
#unableEndTurnDiv {
	display: inline-block;
	max-width: 140px;
}
#wholeActionArea {
	width: 100%;
	/*background-color: aliceblue;*/
	min-height: 110px;
	margin: 0px;
	padding: 0px;
	font-weight: bold;
}

.chooseSaintDiv {
	display: inline-block;
	width: 200px;
	height: 275px;
	border: 2px solid yellow;
	vertical-align: middle;
	margin-right: 5px;
}

.chooseSaintDiv:hover {
	border-color: lightgreen;
}

.newSaintImg {
	height: 150px;
}

.resPaymentImg {
	width: 40px;
	height: 40px;
	vertical-align: middle;
	border: 1px solid black;
	margin-right: 5px;
}

.endOfTurnIssueSpan {
	font-size: 20px;
	font-weight: bolder;
}

.fLoadingBar {
	width: 100%;
	text-align: center;
}

.boldDiv {
	font-weight: bolder;
}

.discardedResDiv {
	display: inline-flex;
	margin: 0 5px;
	border: 2px solid yellow;
}
.discardedResDiv img {
	width: 40px;
	height: 40px;
}

.discardedResDiv:hover {
	border-color: lightgreen;
	cursor: pointer;
}

.moreToDiscard {
	color: red;
}

.resignButton {
	margin-right: 50px;
}

.resigntext {
	font-size: 60px;
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
</style>
