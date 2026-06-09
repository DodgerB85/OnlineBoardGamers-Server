import * as rf from "./TGZreference"
import * as map from "./TGZmap"
import * as funcs from "./TGZfuncs"
import * as controller from "./TGZcontroller"

import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal"

// Helper functions for multi-god support
export function getPlayer_gods(player) {
	return player.god || []
}

/*export function getPlayerPrimary_god(player) {
	const gods = getPlayer_gods(player)
	return gods.length > 0 ? gods[0] : [rf.NO_god, 0]
}*/

export function has_god(player, godType) {
	const gods = getPlayer_gods(player)
	return gods.some((god) => god[0] === godType)
}

export function get_godData(player, godType) {
	const gods = getPlayer_gods(player)
	const god = gods.find((g) => g[0] === godType)
	return god || [rf.NO_god, 0]
}

export function add_godToPlayer(player, godType, data = 0) {
	if (!player.god) player.god = []
	// Check if god already exists
	const existingIndex = player.god.findIndex((g) => g[0] === godType)
	if (existingIndex === -1) {
		// Check if first god is NO_god, replace it instead of pushing
		if (player.god.length > 0 && player.god[0][0] === rf.NO_god) {
			player.god[0] = [godType, data]
		} else {
			player.god.push([godType, data])
		}
	} else {
		player.god[existingIndex][1] = data
	}
}

export function remove_godFromPlayer(player, godType) {
	if (!player.god) return
	const index = player.god.findIndex((g) => g[0] === godType)
	if (index !== -1) {
		player.god.splice(index, 1)
	}
}

export function update_godData(player, godType, newData) {
	const gods = getPlayer_gods(player)
	const godIndex = gods.findIndex((g) => g[0] === godType)
	if (godIndex !== -1) {
		player.god[godIndex][1] = newData
	}
}

/**
 * getPriceForCraftsman
 * getPlayerForCraftsmanPriIndex
 * addMonument
 * addResource
 * addCraftsman
 * setCraftsmanPrice
 * addHistory
 *
 * canSelectRaiseMonument
 * setupRaiseMonument
 * getValidCraftsmenToRaiseMonument
 * getAllowedSqsForMonRaise
 *
 * endTurn
 */

export function toggleMapInspector() {
	const store = useModelStore()
	store.topMenuViews.mapInspectorMode = !store.topMenuViews.mapInspectorMode
	store.topMenuViews.hubRangesToHighlight.splice(0)
	store.context.indexesToPipGreen.splice(0)
	store.context.indexesToPipRed.splice(0)
	store.topMenuViews.mapInspectorEshu = false
}

/** SETUPS */

export function setupPlaceMonument() {
	const store = useModelStore()
	store.context.actionError = ""
	store.clearVars(true)
	store.actionResetData = funcs.exportModel(true)

	store.context.action = rf.ACT_BUILD_MON
	store.context.monumentsToPlace = 1
	if (has_god(controller.currentPlayerObj(), rf.OBATALA)) store.context.monumentsToPlace = 2
	store.context.indexesToHighlightClick.splice(0)
	store.context.indexesToHighlightClick = map.getSpacesForMonument(hasNomads(controller.currentPlayerObj()), false)
	if (store.context.indexesToHighlightClick.length === 0) store.context.actionError = "No Space Left for Any Monuments"
}

export function setupChoosegod() {
	const store = useModelStore()
	store.clearVars(true)
	store.context.actionError = ""
	store.actionResetData = funcs.exportModel(true)
	store.context.action = rf.ACT_CHOOSE_god
}
export function setupChooseSpec() {
	const store = useModelStore()
	store.clearVars(true)
	store.context.actionError = ""

	store.actionResetData = funcs.exportModel(true)
	store.context.action = rf.ACT_CHOOSE_SPEC
}

export function setupUseSpec() {
	const store = useModelStore()
	store.clearVars(true)
	store.context.actionError = ""
	if (controller.currentPlayerObj().specialists.length === 0) {
		store.context.actionError = "Choose a Specialist first"
		return
	}

	store.actionResetData = funcs.exportModel(true)
	store.context.action = rf.ACT_USE_SPEC
}

export function confirmBid_core(cowCost) {
	if (eleguaAvailable()) cowCost = Math.max(cowCost - 3, 0)
	controller.currentPlayerObj().cows -= cowCost
}

export function setupUseSingleSpec(spec) {
	const store = useModelStore()
	store.clearVars(true)
	store.context.actionError = ""

	if (spec[0] === rf.HERD) {
		store.context.action = rf.ACT_USE_HERD
		store.context.chosenPrice = 2
		if (spec[1] === 2) store.context.chosenPrice = 4
		else if (spec[1] === 4) store.context.chosenPrice = 6
	} else if (spec[0] === rf.RAIN_CEREMONY) {
		if (store.remainingItems[rf.WATER_TILE] <= 0) {
			store.context.itemBeingAdded = -1
			store.context.actionError = "No More Water Tiles"
			return
		}
		if (spec[1] === 0) {
			spec[1] = rf.SPEC_COST[spec[0]]
			controller.currentPlayerObj().cows -= rf.SPEC_COST[spec[0]]
			store.context.counter = rf.SPEC_COST[spec[0]]
		}
		store.context.itemBeingAdded = rf.WATER_TILE
		store.context.action = rf.ACT_BUILD_WATER
		store.context.itemBeingAddedRotation = 1
		store.context.indexesToHighlightClick = map.getSpacesForResource()
	} else if (spec[0] === rf.SHAMAN) {
		if (spec[1] === 0) {
			spec[1] = rf.SPEC_COST[spec[0]]
			controller.currentPlayerObj().cows -= rf.SPEC_COST[spec[0]]
			store.context.counter = rf.SPEC_COST[spec[0]]
		}
		if (store.remainingItems[rf.WOOD_TILE] !== 0) store.context.itemBeingAdded = rf.WOOD_TILE
		else if (store.remainingItems[rf.CLAY_TILE] !== 0) store.context.itemBeingAdded = rf.CLAY_TILE
		else if (store.remainingItems[rf.IVORY_TILE] !== 0) store.context.itemBeingAdded = rf.IVORY_TILE
		else if (store.remainingItems[rf.DIAMOND_TILE] !== 0) store.context.itemBeingAdded = rf.DIAMOND_TILE
		else {
			store.context.itemBeingAdded = -1
			store.context.actionError = "No More Resource Tiles"
		}
		store.context.action = rf.ACT_BUILD_RES
		if (store.context.itemBeingAdded !== -1) store.context.indexesToHighlightClick = map.getSpacesForResource()
		if (has_god(controller.currentPlayerObj(), rf.ESHU)) store.context.range = 6

		let data = map.getAllCraftsmanDataWithinRangeOfZoneAndOutOfRange([0], 18, rf.RES_TILE_TO_SQ[store.context.itemBeingAdded])
		store.context.craftsmanDataToPipRed = data[0]
	} else if (spec[0] === rf.NOMADS) {
		if (spec[1] === 0) {
			activateSpecialist_core(spec)
			addHistory(rf.HIST_ACTIVATE_SPEC, controller.currentPlayerIndex(), 0, [spec[0], spec[1]])
			store.clearVars(true)
		}
	} else if (spec[0] === rf.BUILDER) {
		if (spec[1] === 0) {
			activateSpecialist_core(spec)
			addHistory(rf.HIST_ACTIVATE_SPEC, controller.currentPlayerIndex(), 0, [spec[0], spec[1]])
			store.clearVars(true)
		}
	}
}

export function setupPlaceCraftsmen(keepReset) {
	const store = useModelStore()
	store.clearVars(true)
	store.context.actionError = ""

	// Check it is actually possible

	if (!keepReset) store.actionResetData = funcs.exportModel(true)

	store.context.action = rf.ACT_BUILD_CRAFTSMEN
	store.context.indexesToHighlightClick.splice(0)
}

export function setupRaiseMonument(keepReset) {
	const store = useModelStore()
	if (!keepReset) {
		store.clearVars(true)
		store.context.actionError = ""
		store.actionResetData = funcs.exportModel(true)
	}
	store.topMenuViews.hubRangesToHighlight.splice(0)

	if (!has_god(controller.currentPlayerObj(), rf.YEMOJA)) {
		for (let i = 0; i < controller.currentPlayerObj().monuments.length; i++) {
			if (canSelectRaiseMonument(controller.currentPlayerObj().monuments[i], false)) {
				if (!store.context.canSelectRaiseMonument.includes(controller.currentPlayerObj().monuments[i][0])) store.context.canSelectRaiseMonument.push(controller.currentPlayerObj().monuments[i][0])
			}
		}
	} else if (has_god(controller.currentPlayerObj(), rf.YEMOJA)) {
		for (let i = 0; i < store.players.length; i++) {
			for (let j = 0; j < store.players[i].monuments.length; j++) {
				if (canSelectRaiseMonument(store.players[i].monuments[j], false)) {
					if (!store.context.canSelectRaiseMonument.includes(store.players[i].monuments[j][0])) store.context.canSelectRaiseMonument.push(store.players[i].monuments[j][0])
				}
			}
		}
	}

	if (store.context.canSelectRaiseMonument.length === 0 && store.context.upgradingMonumentProcess.length === 0) {
		// NB THIS EXACT TEXT IS LINKED TO IN ACTIONAREA
		store.context.actionError = "No monument to raise (No more monuments / not enough cows / not enough available craftsmen)"
		//return
	}

	store.context.action = rf.ACT_RAISE_MON
	store.context.range = 3
	if (has_god(controller.currentPlayerObj(), rf.ESHU)) store.context.range = 6

	store.lastMonumentResetData = funcs.exportModel(true)
}

/** ACTIONS */

export function addMonument(index) {
	const store = useModelStore()
	addMonument_core(controller.currentPlayerIndex(), index)
	// clearVars() in MapHighlight in case you're adding 2
	store.context.actionsTaken.push(rf.ACT_BUILD_MON)
	store.context.historyObj.push(index)
}

export function addMonument_core(playerIndex, index) {
	const store = useModelStore()
	// Add monument to player
	store.players[playerIndex].monuments.push([index, 1])
	// Add monument to map
	store.coords[index] = 50 + 10 * playerIndex + 1
}

export function addResource(index, resource, rotation) {
	const store = useModelStore()
	addResource_core(index, resource, rotation)
	// Add to history
	if (resource === rf.WATER_TILE) addHistory(rf.HIST_BUILD_WATER, store.gameflow.turnOrder[0], 0, [index, store.context.itemBeingAddedRotation, store.context.counter])
	else addHistory(rf.HIST_BUILD_RESOURCE, store.gameflow.turnOrder[0], 0, [index, resource, store.context.counter])
	// add to actions taken
	store.context.actionsTaken.push(store.context.action)
	// Remove from remainig
	store.clearVars(true)
}

export function addResource_core(index, resource, rotation) {
	const store = useModelStore()
	if (resource === rf.WATER_TILE) {
		// Add to model
		store.addedWater.push([index, rotation])
		// Add resource to map
		let Sw = map.getSw()
		store.coords[index] = rf.RES_TILE_TO_SQ[resource]
		if (rotation === 0) store.coords[index + 1] = rf.RES_TILE_TO_SQ[resource]
		else if (rotation === 1) store.coords[index + Sw] = rf.RES_TILE_TO_SQ[resource]
	}
	// Otherwise, add RESOURCE
	else {
		// Add to model
		store.addedResources.push([index, resource])
		// Add resource to map
		store.coords[index] = rf.RES_TILE_TO_SQ[resource]
	}
	// Remove from remainig
	store.remainingItems[resource]--
}

export function addCraftsman(index, craftsman, rotation) {
	const store = useModelStore()
	let res = addCraftsman_core(controller.currentPlayerObj(), index, craftsman, rotation)
	let techCard = res[0]
	let builderCows = res[1]

	// Add history
	addHistory(rf.HIST_BUILD_CRAFTSMAN, store.gameflow.turnOrder[0], 0, [index, craftsman, rotation, builderCows, techCard])

	store.clearVars(true)
	setupPlaceCraftsmen(true)
}

export function addCraftsman_core(player, index, craftsman, rotation) {
	const store = useModelStore()
	// Add tech to player
	let techCard = -1
	if (!hasTechForCman(craftsman)) {
		let techs = getAvailableTechs(-1)
		techCard = craftsman * 2 + 1
		if (techs.includes(craftsman * 2)) techCard = craftsman * 2
		controller.currentPlayerObj().techs.push([techCard, 0])
		store.context.techsTaken.push(techCard)
		// ADjust max VR
		adjustMaxVR(controller.currentPlayerObj())
	}
	// Spend cows
	let cowCost = rf.COW_COST_TO_BUILD_CMAN[craftsman]
	controller.currentPlayerObj().cows -= cowCost
	let builderCows = 0
	for (let i = 0; i < controller.currentPlayerObj().specialists.length; i++) {
		if (controller.currentPlayerObj().specialists[i][0] === rf.BUILDER && controller.currentPlayerObj().specialists[i][1] >= 2) {
			builderCows = Math.min(cowCost, 2)
			controller.currentPlayerObj().specialists[i][1] += builderCows
		}
	}

	// Add craftsman to model
	player.craftsmen.push([index, craftsman, rotation])
	// Add craftsman to map
	let Sw = map.getSw()
	store.coords[index] = rf.RES_TILE_TO_SQ[craftsman]
	/*if (craftsman === rf.BLACKSMITH_TILE) {
		store.coords[index + Sw - 1] = rf.RES_TILE_TO_SQ[craftsman]
		store.coords[index + Sw] = rf.RES_TILE_TO_SQ[craftsman]
		store.coords[index + Sw + 1] = rf.RES_TILE_TO_SQ[craftsman]
		store.coords[index + Sw + Sw] = rf.RES_TILE_TO_SQ[craftsman]
	} else*/
	if (rf.FOUR_SIZE_TILES.includes(craftsman)) {
		store.coords[index + 1] = rf.RES_TILE_TO_SQ[craftsman]
		store.coords[index + Sw] = rf.RES_TILE_TO_SQ[craftsman]
		store.coords[index + Sw + 1] = rf.RES_TILE_TO_SQ[craftsman]
	} else {
		//if (craftsman === rf.WOOD_CARVER_TILE || craftsman === rf.POTTER_TILE) {
		if (rotation === 0) store.coords[index + 1] = rf.RES_TILE_TO_SQ[craftsman]
		else if (rotation === 1) store.coords[index + Sw] = rf.RES_TILE_TO_SQ[craftsman]
	}
	// Remove from remainig
	store.remainingItems[craftsman]--

	// If price is 0, set to 1
	if (craftsman === rf.BLACKSMITH_TILE && player.craftsmenPrices[7] === 0) player.craftsmenPrices[7] = 1
	else if (player.craftsmenPrices[craftsman] === 0) player.craftsmenPrices[craftsman] = 1

	return [techCard, builderCows]
}

export function setCraftsmanPrice(player, chosenPrices) {
	const store = useModelStore()
	setCraftsmanPrice_core(player, chosenPrices)
	addHistory(rf.HIST_SET_PRICES, controller.currentPlayerIndex(), 0, [...chosenPrices])
	store.clearVars(true)
}

export function setCraftsmanPrice_core(player, choosingPrices) {
	player.craftsmenPrices = [...choosingPrices]
}

/** END */

export function endAddingCraftsmen() {
	const store = useModelStore()
	store.context.actionsTaken.push(rf.ACT_BUILD_CRAFTSMEN)
	store.clearVars(true)
	// Remove ghosts
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	let ghostImgs = document.getElementsByClassName("ghostImg")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
	for (let i = 0; i < ghostImgs.length; i++) ghostImgs[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	// Set up price setting options -- ONLy REQUIRED IF ANY PRICE NOT 3
	store.context.action = rf.ACT_SET_PRICES
	store.context.choosingPrices = [...controller.currentPlayerObj().craftsmenPrices]
}

export function activateSpecialist_core(spec) {
	spec[1] = rf.SPEC_COST[spec[0]]
	controller.currentPlayerObj().cows -= rf.SPEC_COST[spec[0]]
}

export function hasNomads(player) {
	//const store = useModelStore()
	for (let i = 0; i < player.specialists.length; i++) {
		if (player.specialists[i][0] === rf.NOMADS && player.specialists[i][1] === 2) return true
	}
	return false
}

export function eleguaAvailable() {
	const store = useModelStore()

	if (has_god(controller.currentPlayerObj(), rf.ELEGUA)) {
		// go back in history until you hit new turn. Count entires. If bid entries < no. players, return true
		let bidEntires = 0
		let idx = store.history.length - 1
		while (store.history[idx][0] !== rf.HIST_NEW_TURN) {
			if (store.history[idx][0] === rf.HIST_BID) bidEntires++
			idx--
		}
		if (bidEntires < store.players.length) return true
		return false
	}
	return false
}

export function hasTechForCman(cman) {
	if (cman === rf.BLACKSMITH_TILE && has_god(controller.currentPlayerObj(), rf.OGUN)) return true
	for (let i = 0; i < controller.currentPlayerObj().techs.length; i++) {
		if (controller.currentPlayerObj().techs[i][0] === cman * 2) return true
		if (controller.currentPlayerObj().techs[i][0] === cman * 2 + 1) return true
	}

	return false
}

export function getAvailableTechs(cman) {
	const store = useModelStore()
	let usedTechs = []
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].techs.length; j++) {
			usedTechs = usedTechs.concat(store.players[i].techs[j][0])
		}
	}
	let res = []
	for (let i = 0; i < rf.ALL_TECHS.length; i++) if (!usedTechs.includes(rf.ALL_TECHS[i])) res.push(rf.ALL_TECHS[i])
	if (cman === -1) return res
	if (res.includes(cman * 2)) return true
	if (res.includes(cman * 2 + 1)) return true
	return false
}

export function getPriceForCraftsman(player, craftsmanTile, checkForAnansi) {
	if (checkForAnansi && has_god(controller.currentPlayerObj(), rf.ANANSI)) return 1
	else if (craftsmanTile === rf.BLACKSMITH_TILE) return player.craftsmenPrices[7]
	return player.craftsmenPrices[craftsmanTile]
}

export function getPlayerForCraftsmanPriIndex(craftsmanPriIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].craftsmen.length; j++) {
			if (store.players[i].craftsmen[j][0] === craftsmanPriIndex) return store.players[i]
		}
	}
	alert("No player found GPFCM")
}

export function getPlayerIndexForCraftsmanPriIndex(craftsmanPriIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].craftsmen.length; j++) {
			if (store.players[i].craftsmen[j][0] === craftsmanPriIndex) return i
		}
	}
	alert("No player found GPFCM-i")
}

export function addHistory(event, playerIndex, timeOffset, params) {
	const personal = usePersonalStore()
	const store = useModelStore()

	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp + timeOffset)
	store.history.push([event, playerIndex, time, [...params]])
}

export function revenues_core() {
	const store = useModelStore()

	// Add cows to ENGAI
	for (let i = 0; i < store.players.length; i++) {
		if (has_god(store.players[i], rf.ENGAI)) {
			update_godData(store.players[i], rf.ENGAI, 2)
			break
		}
	}

	// Add cows to AJAKA
	if (anyoneHasAJAKA(false)) {
		let ajakaPlayerIndex = anyoneHasAJAKA(true)
		for (let i = 0; i < store.players.length; i++) {
			for (let j = 0; j < store.players[i].techs.length; j++) {
				let totalCows = store.players[i].techs[j][1]
				if (totalCows >= 6) {
					let half_rounded_up = Math.ceil(totalCows / 2)
					update_godData(store.players[ajakaPlayerIndex], rf.AJAKA, get_godData(store.players[ajakaPlayerIndex], rf.AJAKA)[1] + half_rounded_up)
					store.players[i].techs[j][1] -= half_rounded_up
				}
			}
		}
	}

	// Add cows to herd
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].specialists.length; j++) {
			if (store.players[i].specialists[j][0] === rf.HERD) {
				if (store.players[i].specialists[j][1] === 2) store.players[i].specialists[j][1] = 3
				else if (store.players[i].specialists[j][1] === 4) store.players[i].specialists[j][1] = 6
				else if (store.players[i].specialists[j][1] === 6) store.players[i].specialists[j][1] = 9
				break
			}
		}
	}

	let histObj = []

	for (let i = 0; i < store.players.length; i++) {
		let income = [0, 0, 0, 0, 0]
		// add from god cards
		const gods = getPlayer_gods(store.players[i])
		for (let g = 0; g < gods.length; g++) {
			if (gods[g][0] !== rf.EKWENSU) {
				income[0] += gods[g][1]
				gods[g][1] = 0
			}
		}
		// add from spec cards
		for (let j = 0; j < store.players[i].specialists.length; j++) {
			income[1] += store.players[i].specialists[j][1]
			store.players[i].specialists[j][1] = 0
		}
		// add from tech cards
		for (let j = 0; j < store.players[i].techs.length; j++) {
			if (store.players[i].techs[j][1] >= 6 && anyoneHasAJAKA(false)) {
				let ajakaPlayerIndex = anyoneHasAJAKA(true)
				let totalCows = store.players[i].techs[j][1]
				let half_rounded_up = Math.ceil(totalCows / 2)
				income[2] += totalCows - half_rounded_up
				store.players[ajakaPlayerIndex].cows += half_rounded_up
			} else income[2] += store.players[i].techs[j][1]
			store.players[i].techs[j][1] = 0
		}
		// add monument
		let max = 0
		for (let j = 0; j < store.players[i].monuments.length; j++) {
			if (store.players[i].monuments[j][1] > max) max = store.players[i].monuments[j][1]
		}
		income[3] = max
		store.players[i].cows += income.reduce((a, b) => a + b, 0)
		income[4] = store.players[i].cows
		histObj.push([...income])
	}
	return histObj
}

export function newTurn_core() {
	const store = useModelStore()

	store.gameflow.turn++
	store.depletedResources.splice(0)
	// Setup new turn order
	store.gameflow.fullTurnOrder.splice(0)
	let temp = [...JSON.parse(JSON.stringify(store.players))]
	for (let i = 0; i < temp.length; i++) temp[i].key = i
	temp.sort((a, b) => b.maxVR - a.maxVR)

	// Move Nyami-Nyami to the front
	/*if (anyoneHasNYAMI(false)) {
		for (let i = 0; i < temp.length; i++) {
			if (has_god(temp[i], rf.NYAMI_NYAMI)) {
				const NyamiNyamiPlayer = temp[i]
				temp.splice(i, 1)
				temp.unshift(NyamiNyamiPlayer)
				break
			}
		}
	}*/

	for (let i = 0; i < temp.length; i++) store.gameflow.fullTurnOrder.push(temp[i].key)
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
}

export function adjustMaxVR(playerObj) {
	const store = useModelStore()

	// remove player from maxVR adjustments, and bump everyone else up towarsd X.5
	let VRtoAdjust = playerObj.maxVR
	playerObj.maxVR = 0
	for (let i = 0; i < store.players.length; i++) {
		if (Math.floor(store.players[i].maxVR) === Math.floor(VRtoAdjust) && store.players[i].maxVR < VRtoAdjust) store.players[i].maxVR = Math.round((store.players[i].maxVR + 0.1) * 10) / 10
	}

	let newVR = getVR(playerObj)
	newVR += 0.5
	for (let i = 0; i < store.players.length; i++) {
		if (Math.floor(store.players[i].maxVR) === getVR(playerObj)) newVR -= 0.1
	}
	playerObj.maxVR = Math.round(newVR * 10) / 10
}

/* CHECK
      A) NOT level 5
      B) Enough valid craftsmen
      C) Not alrady raised */
export function canSelectRaiseMonument(monument) {
	const store = useModelStore()

	if (monument[1] === 5) return false
	if (has_god(controller.currentPlayerObj(), rf.ALA) && monument[1] === 2) return false
	if (store.context.upgradingMonumentProcess.length > 0) return false

	// Do this first to prevent already raised mons from displaying the bar
	for (let i = store.history.length - 1; i >= 0; i--) {
		if (store.history[i][0] !== rf.HIST_RAISE_MON) break
		if (store.history[i][3][0][0] === monument[0]) {
			if (store.history[i][1] !== controller.currentPlayerIndex()) return true
			return false
		}
	}

	if ((!has_god(controller.currentPlayerObj(), rf.TIURAKH) && getValidCraftsmenToRaiseMonument([monument[0]], true).length < monument[1]) || (has_god(controller.currentPlayerObj(), rf.TIURAKH) && getValidCraftsmenToRaiseMonument([monument[0]], true).length < monument[1] - 1)) {
		if (!store.context.monumentsToShowNotEnoughCraftsmen.includes(monument[0])) store.context.monumentsToShowNotEnoughCraftsmen.push(monument[0])
		return false
	}

	return true
}

function canAffordCraftsman(craftsmanCost, hubCost, craftsmanData) {
	const store = useModelStore()
	let totalCost = craftsmanCost + hubCost
	let craftsmanPlayer = getPlayerForCraftsmanPriIndex(craftsmanData[0])
	// AS pays 0 for pri when using their sec
	if (has_god(controller.currentPlayerObj(), rf.AJE_SHALUGA) && store.context.currentRitualGood.length > 0) {
		let secCmanData = map.getCraftsmanDataFromAnySq(store.context.currentRitualGood[0][0], true)
		// If you have the cman index, then you pay 0
		if (controller.currentPlayerObj().craftsmen.some((cman) => cman[0] === secCmanData[0] && cman[1] === secCmanData[1] && cman[2] === secCmanData[2])) {
			craftsmanCost = 0
			totalCost = craftsmanCost + hubCost
		}
	}
	if (controller.currentPlayerObj().cows >= totalCost) return true
	// This code allos Ekwensu player to play OTHER cmen
	/*else if (getPlayerPrimary_god(controller.currentPlayerObj())[0] === rf.EKWENSU && controller.currentPlayerIndex() !== getPlayerIndexForCraftsmanPriIndex(craftsmanData[0])) {
		let EKWENSUcows = Math.min(getPlayerPrimary_god(controller.currentPlayerObj())[1], craftsmanCost)
		let netCost = craftsmanCost - EKWENSUcows
		if (controller.currentPlayerObj().cows >= netCost + hubCost) return true
	}*/ else if (has_god(craftsmanPlayer, rf.EKWENSU) && controller.currentPlayerIndex() !== getPlayerIndexForCraftsmanPriIndex(craftsmanData[0])) {
		let EKWENSUcows = Math.min(get_godData(craftsmanPlayer, rf.EKWENSU)[1], craftsmanCost)
		let netCost = craftsmanCost - EKWENSUcows
		if (controller.currentPlayerObj().cows >= netCost + hubCost) return true
	}

	return false
}

export function getValidCraftsmenToRaiseMonument(startingZone, simulateOnly) {
	const store = useModelStore()

	let validCraftsmenWithMultipleTG = []
	// UPDATE RANGE HERE
	if (has_god(controller.currentPlayerObj(), rf.ESHU)) store.context.range = 6
	else if (store.context.action === rf.ACT_OYA_RUITUALGOOD) store.context.range = 17
	else store.context.range = 3

	let [allPossibleCraftsmenSqs, hubsUsed] = map.getPossibleCraftsmenWithRangeToRaiseMonument(startingZone, store.context.range)

	let resFound = false

	// TG BOTH CMEN HERE
	for (let i = 0; i < allPossibleCraftsmenSqs.length; i++) {
		let availableResources = map.getAllUndepletedResourceSquaresToHighlight(map.getCraftsmanDataFromAnySq(allPossibleCraftsmenSqs[i], true), store.context.range, [])
		if (store.coords[allPossibleCraftsmenSqs[i]] === rf.BLACKSMITH_SQ) {
			if (availableResources.length === 1) availableResources.splice(0)
			else if (availableResources.length > 0) {
				let firstResType = store.coords[availableResources[0]]
				let diffResFound = false
				for (let j = 1; j < availableResources.length; j++) {
					if (store.coords[availableResources[j]] !== firstResType) {
						diffResFound = true
						break
					}
				}
				if (!diffResFound) availableResources.splice(0)
			}
		}
		// AJE_SHALUGA DOESN't REQUIRE RES FOR THEIR SEC CMAN
		if (availableResources.length > 0 || (has_god(controller.currentPlayerObj(), rf.AJE_SHALUGA_OLD) && rf.SEC_CRAFTSMEN.includes(map.getCraftsmanDataFromAnySq(allPossibleCraftsmenSqs[i], true)[1]))) {
			resFound = true
			// If it has resources, check you have enough money
			let craftsmanData = map.getCraftsmanDataFromAnySq(allPossibleCraftsmenSqs[i], true)
			let craftsmanCost = getPriceForCraftsman(getPlayerForCraftsmanPriIndex(craftsmanData[0]), craftsmanData[1], true)
			let hubCost = hubsUsed[i]
			//let totalCost = hubCost + craftsmanCost
			if (canAffordCraftsman(craftsmanCost, hubCost, craftsmanData)) {
				if (has_god(controller.currentPlayerObj(), rf.TSUI_GOAB)) {
					for (let j = 0; j < availableResources.length; j++) validCraftsmenWithMultipleTG.push(allPossibleCraftsmenSqs[i])
				} else validCraftsmenWithMultipleTG.push(allPossibleCraftsmenSqs[i])
			} else {
				if (!simulateOnly && !store.context.craftsmenTooExpensive.includes(allPossibleCraftsmenSqs[i])) store.context.craftsmenTooExpensive.push(allPossibleCraftsmenSqs[i])
			}
		}
	}
	if (!simulateOnly) {
		store.context.craftsmenIndexesToHighlight = validCraftsmenWithMultipleTG
		if (store.context.craftsmenIndexesToHighlight.length === 0 && resFound === false) store.context.actionError = "No Craftsmen available with Resources"
		if (store.context.craftsmenIndexesToHighlight.length === 0 && resFound === true) store.context.actionError = "Not enough cows for any available Craftsman"
	}

	// RE-UPDATE RANGE HERE
	if (store.context.action === rf.ACT_OYA_RUITUALGOOD) {
		if (has_god(controller.currentPlayerObj(), rf.ESHU)) store.context.range = 6
		else store.context.range = 3
	}

	if (simulateOnly) return validCraftsmenWithMultipleTG
}

// Gives all correct craftsmen, or only the related primary if in the middle of making a good
export function getAllowedSqsForMonRaise() {
	const store = useModelStore()

	// If in middle of ritual good, can only add the related primary
	if (store.context.currentRitualGood.length > 0) return [store.coords[store.context.currentRitualGood[0][0]] - 10]

	// Allow all primary
	let allowedSqs = [...rf.PRI_CRAFFTSMAN_SQS]
	// Replace with secondary if on the board
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].craftsmen.length; j++) {
			if (store.players[i].craftsmen[j][1] === rf.SCULPTOR_TILE) allowedSqs[0] = rf.SCULPTOR_SQ
			else if (store.players[i].craftsmen[j][1] === rf.VESSEL_MAKER_TILE) allowedSqs[1] = rf.VESSEL_MAKER_SQ
			else if (store.players[i].craftsmen[j][1] === rf.THRONE_MAKER_TILE) allowedSqs[2] = rf.THRONE_MAKER_SQ
		}
	}
	// If first ritual good, or has TG, then can do any available
	if (store.context.upgradingMonumentProcess.length === 1 || has_god(controller.currentPlayerObj(), rf.TSUI_GOAB)) {
		return allowedSqs
	}
	// Otherwise you can use a craftsman NOT already used
	else {
		for (let i = 1; i < store.context.upgradingMonumentProcess.length; i++) {
			if (store.coords[store.context.upgradingMonumentProcess[i][0][0]] === rf.WOOD_CARVER_SQ) allowedSqs[0] = -9
			else if (store.coords[store.context.upgradingMonumentProcess[i][0][0]] === rf.SCULPTOR_SQ) allowedSqs[0] = -9
			else if (store.coords[store.context.upgradingMonumentProcess[i][0][0]] === rf.POTTER_SQ) allowedSqs[1] = -9
			else if (store.coords[store.context.upgradingMonumentProcess[i][0][0]] === rf.VESSEL_MAKER_SQ) allowedSqs[1] = -9
			else if (store.coords[store.context.upgradingMonumentProcess[i][0][0]] === rf.IVORY_CARVER_SQ) allowedSqs[2] = -9
			else if (store.coords[store.context.upgradingMonumentProcess[i][0][0]] === rf.THRONE_MAKER_SQ) allowedSqs[2] = -9
			else if (store.coords[store.context.upgradingMonumentProcess[i][0][0]] === rf.DIAMOND_CUTTER_SQ) allowedSqs[3] = -9
			else if (store.coords[store.context.upgradingMonumentProcess[i][0][0]] === rf.BLACKSMITH_SQ) allowedSqs[4] = -9
		}
	}
	return allowedSqs
}

export function hasActiveBuilder(playerIndex) {
	const store = useModelStore()

	for (let i = 0; i < store.players[playerIndex].specialists.length; i++) {
		if (store.players[playerIndex].specialists[i][0] === rf.BUILDER && store.players[playerIndex].specialists[i][1] >= 2) return true
	}
	return false
}

export function anyoneHasSHADIPINYI(returnIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		if (has_god(store.players[i], rf.SHADIPINYI)) {
			if (returnIndex) return i
			else return true
		}
	}
	return false
}
export function anyoneHasALAJIRE(returnIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		if (has_god(store.players[i], rf.ALAJIRE)) {
			if (returnIndex) return i
			else return true
		}
	}
	if (returnIndex) return -1
	return false
}

export function anyoneHasYEMOJA(returnIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		if (has_god(store.players[i], rf.YEMOJA)) {
			if (returnIndex) return i
			else return true
		}
	}
	if (returnIndex) return -1
	return false
}

export function anyoneHasAJAKA(returnIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		if (has_god(store.players[i], rf.AJAKA)) {
			if (returnIndex) return i
			else return true
		}
	}
	if (returnIndex) return -1
	return false
}

export function anyoneHasWATERTOLL(returnIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		if (has_god(store.players[i], rf.WATERTOLL)) {
			if (returnIndex) return i
			else return true
		}
	}
	if (returnIndex) return -1
	return false
}

export function anyoneHasNYAMI(returnIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		if (has_god(store.players[i], rf.NYAMI_NYAMI)) {
			if (returnIndex) return i
			else return true
		}
	}
	if (returnIndex) return -1
	return false
}

export function anyoneHasEKWENSU(returnIndex) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		if (has_god(store.players[i], rf.EKWENSU)) {
			if (returnIndex) return i
			else return true
		}
	}
	if (returnIndex) return -1
	return false
}

// Return 1 if you need to pay WATERTOLL and haven't yet done so, basically
export function needToPayWATERTOLL(craftsmanCheck, data) {
	const store = useModelStore()

	// Don't need to pay if anyone has it
	if (!anyoneHasWATERTOLL(false)) return false
	// if YOU have WATERTOLL, don't need to pay
	if (has_god(controller.currentPlayerObj(), rf.WATERTOLL)) return false
	// If it is set to 2, then you have already paid
	if (store.context.WATERTOLLpaymentStatus >= 2) return false

	if (craftsmanCheck) {
		let withWaterHubs = data[0]
		let craftsmanData = data[1]

		let rangeDataWithoutWater = []
		if (store.context.currentRitualGood.length === 0) rangeDataWithoutWater = map.getPossibleCraftsmenWithRangeToRaiseMonumentWithoutWater([store.context.upgradingMonumentProcess[0][0]], store.context.range)
		// Otherwise, need to take it from the SEC craftsman
		else if (store.context.currentRitualGood.length === 2) {
			let craftsmanZone = map.getCraftsmanZoneFromData(map.getCraftsmanDataFromAnySq(store.context.currentRitualGood[0][0], true))
			rangeDataWithoutWater = map.getPossibleCraftsmenWithRangeToRaiseMonumentWithoutWater(craftsmanZone, store.context.range)
		}
		let arrIndexWithoutWater = rangeDataWithoutWater[0].indexOf(craftsmanData[0])
		if (arrIndexWithoutWater === -1) return true
		let hubsUsedWithoutWater = rangeDataWithoutWater[1][arrIndexWithoutWater]
		if (hubsUsedWithoutWater > withWaterHubs) return true

		return false
	}
	// Now do a resource check
	let resIndex = data[0]
	let priCmanIndex = store.context.currentRitualGood[store.context.currentRitualGood.length - 1][0]
	let priCmanData = map.getCraftsmanDataFromAnySq(priCmanIndex, true)
	let resourcesWithoutWater = map.getAllUndepletedResourceSquaresToHighlightWithoutWater(priCmanData, store.context.range, [])
	if (resourcesWithoutWater.indexOf(resIndex) === -1) return true
	return false
}

export function getCowsOnPlaque(pos, bidAmount) {
	const store = useModelStore()

	let cowsOnPlaques = []
	for (let i = 0; i < store.players.length; i++) cowsOnPlaques.push(0)
	if (anyoneHasSHADIPINYI()) cowsOnPlaques.push(0)

	// USE HISTORY TO DETERMINE NYAMI PLAQUES
	if (anyoneHasNYAMI(false)) {
		let totalBidsToDivvy = []
		let histIdx = store.history.length - 1
		while (store.history[histIdx][0] !== rf.HIST_NEW_TURN) {
			if (store.history[histIdx][0] === rf.HIST_BID) totalBidsToDivvy.push(store.history[histIdx][3][0])
			histIdx--
		}
		if (store.context.action === rf.ACT_BID) totalBidsToDivvy.push(bidAmount)
		for (let i = 0; i < totalBidsToDivvy.length; i++) {
			let cowsToDivvyNyami = totalBidsToDivvy[i]
			let idx = 0
			while (cowsToDivvyNyami >= 1) {
				cowsOnPlaques[idx]++
				cowsToDivvyNyami--
				idx++
				if (idx === cowsOnPlaques.length) idx = 0
			}
		}

		if (pos === -1) return cowsOnPlaques
		else return cowsOnPlaques[pos]
	}

	// divvy up the ongoing total PLUS context bid

	// Now we have an array for each plaque
	let cowsToDivvy = store.ongoingVars.totalBids + bidAmount
	let idx = 0
	while (cowsToDivvy >= 1) {
		cowsOnPlaques[idx]++
		cowsToDivvy--
		idx++
		if (idx === cowsOnPlaques.length) idx = 0
	}

	if (pos === -1) return cowsOnPlaques
	else return cowsOnPlaques[pos]
}

export function setgod(god) {
	const store = useModelStore()
	// VR check
	if (getVR(controller.currentPlayerObj()) > 40) {
		store.clearVars()
		store.context.actionError = "Doing this would increase your VR over 40"
		return
	}

	setgod_core(god)
	// history
	addHistory(rf.HIST_CHOOSE_god, controller.currentPlayerIndex(), 0, [god])
	// reset action
	if (has_god(controller.currentPlayerObj(), rf.DZIVA)) {
		store.context.action = rf.ACT_SET_PRICES
		store.context.choosingPrices = [...controller.currentPlayerObj().craftsmenPrices]
		if (controller.currentPlayerObj().craftsmen.length === 0) {
			store.clearVars(true)
			store.context.action = rf.ACT_NONE
			store.context.actionError = "You have chosen Dziva, but have no craftsmen to change prices for"
		}
	} else if (has_god(controller.currentPlayerObj(), rf.ANYANWU)) {
		store.context.action = rf.ACT_CHOOSE_ANYANWU_MON
		for (let i = 0; i < controller.currentPlayerObj().monuments.length; i++) {
			if (controller.currentPlayerObj().monuments[i][1] <= 3) store.context.canSelectRaiseMonument.push(controller.currentPlayerObj().monuments[i][0])
		}
		if (store.context.canSelectRaiseMonument.length === 0) {
			// NB THIS EXACT TEXT IS LINKED TO IN ACTIONAREA
			store.context.actionError = "You don't have a monument lower than level 4"
			//store.clearVars(true) // NO - this will remove error text
			store.context.action = rf.ACT_NONE
		}
	} else {
		store.clearVars(true)
		store.context.action = rf.ACT_NONE
	}
}

export function setgod_core(god) {
	const store = useModelStore()
	add_godToPlayer(controller.currentPlayerObj(), god)
	let idx = store.availablegods.indexOf(god)
	store.availablegods.splice(idx, 1)
	store.context.actionsTaken.push(rf.ACT_CHOOSE_god)
	// IGWEKALA gets 8 cows
	if (god === rf.IGWEKALA) controller.currentPlayerObj().cows += 8
	// DEFUNCT SCHISM ANYANWU gets highest monument level 5 OLD EDITION
	/*if (god === rf.ANYANWU) {
		let monuments = controller.currentPlayerObj().monuments

		let maxSubarray1Value = -Infinity
		let candidates = []

		monuments.forEach((subarray) => {
			if (subarray[1] > maxSubarray1Value) {
				maxSubarray1Value = subarray[1]
				candidates = [subarray] // Reset candidates to the new max
			} else if (subarray[1] === maxSubarray1Value) {
				candidates.push(subarray) // Add to candidates if we find a match
			}
		})

		// Randomly select one of the filtered subarrays
		let randomIndex = Math.floor(Math.random() * candidates.length)
		let randomSubarray = candidates[randomIndex]
		randomSubarray[1] = 5
	}*/
	// ORISHA AJE gets another action
	else if (god === rf.ORISHA_AJE) {
		store.context.actionsTaken.splice(0)
	}
	// OGIN gets tech
	else if (god === rf.OGUN) {
		controller.currentPlayerObj().techs.push([rf.BLACKSMITH_TECH, 0])
		controller.currentPlayerObj().craftsmenPrices.push(0)
	} else if (god === rf.EKWENSU) {
		update_godData(controller.currentPlayerObj(), rf.EKWENSU, 12)
	}
	adjustMaxVR(controller.currentPlayerObj())
	if (god === rf.ALAJIRE) {
		// Order players by VR, then adjust every players max
		let temp = [...JSON.parse(JSON.stringify(store.players))]
		for (let i = 0; i < temp.length; i++) temp[i].key = i
		temp.sort((a, b) => b.maxVR - a.maxVR)
		for (let i = 0; i < temp.length; i++) adjustMaxVR(store.players[temp[i].key])
	}
}

export function addSpecialist(spec) {
	const store = useModelStore()

	// VR check
	if (getVR(controller.currentPlayerObj()) + rf.SPEC_VR[spec] > 40) {
		store.clearVars(true)
		store.context.actionError = "Doing this would increase your VR over 40"
		return
	}
	// Cow check
	if (controller.currentPlayerObj().cows - rf.SPEC_COST[spec] < 0) {
		store.clearVars(true)
		store.context.actionError = "You must be able to pay the cow cost to take a Specialist"
		return
	}
	addSpecialist_core(spec)
	// history
	addHistory(rf.HIST_CHOOSE_SPEC, controller.currentPlayerIndex(), 0, [spec])
	// reset action
	store.context.action = rf.ACT_NONE
}

export function addSpecialist_core(spec) {
	const store = useModelStore()
	controller.currentPlayerObj().specialists.push([spec, rf.SPEC_COST[spec]])
	controller.currentPlayerObj().cows -= rf.SPEC_COST[spec]
	let idx = store.availableSpecialists.indexOf(spec)
	store.availableSpecialists.splice(idx, 1)
	store.context.actionsTaken.push(rf.ACT_CHOOSE_SPEC)
	adjustMaxVR(controller.currentPlayerObj())
}

export function addHerdCows(amount) {
	const store = useModelStore()

	let cost = addHerdCows_core(amount)
	addHistory(rf.HIST_ADD_HERD_COWS, controller.currentPlayerIndex(), 0, [amount, cost])
	// reset action
	store.clearVars(true)
	store.context.actionsTaken.push(rf.ACT_USE_HERD)
}
export function addHerdCows_core(amount) {
	let cost = 0
	for (let i = 0; i < controller.currentPlayerObj().specialists.length; i++) {
		if (controller.currentPlayerObj().specialists[i][0] === rf.HERD) {
			cost = amount - controller.currentPlayerObj().specialists[i][1]
			controller.currentPlayerObj().cows -= cost
			controller.currentPlayerObj().specialists[i][1] = amount
			break
		}
	}
	return cost
}

function processYEMOJAdifference(playerIndex, score) {
	const store = useModelStore()

	let playerObj = store.players[playerIndex]

	let maxHistIndex = store.history.length
	if (store.topMenuViews.showReplay) maxHistIndex = store.replayStep + 1
	maxHistIndex = Math.min(maxHistIndex, store.history.length)

	//let yemojaAdjustments = []
	for (let i = 0; i < maxHistIndex; i++) {
		if (store.history[i][0] === rf.HIST_RAISE_MON) {
			let playerDoingTheRaiseIndex = store.history[i][1]
			let playerOwningMonIndex = -1
			let monumentIndex = store.history[i][3][0][0]
			for (let j = 0; j < store.players.length; j++) {
				for (let k = 0; k < store.players[j].monuments.length; k++) {
					if (store.players[j].monuments[k][0] === monumentIndex) {
						playerOwningMonIndex = j
						break
					}
				}
			}

			if (playerOwningMonIndex !== -1 && playerDoingTheRaiseIndex !== playerOwningMonIndex) {
				// With mismatching players, if YOU have yemoja, YOU must get the extra score
				if (has_god(playerObj, rf.YEMOJA)) {
					score += rf.MONUMENT_SCORE[store.history[i][3][0][1]] - rf.MONUMENT_SCORE[store.history[i][3][0][1] - 1]
				}
				// Otherwise, if YOU own the monument, YOU lose the score
				else if (playerOwningMonIndex === playerIndex) {
					score -= rf.MONUMENT_SCORE[store.history[i][3][0][1]] - rf.MONUMENT_SCORE[store.history[i][3][0][1] - 1]
				}
			}
		}
	}
	return score
}

export function getScore(playerIndex) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	if (playerObj.displayName === rf.BOT_NAME) return 0
	let score = 0
	// Craftsmen
	for (let i = 0; i < playerObj.craftsmen.length; i++) {
		score += rf.CRAFTSMEN_SCORE[playerObj.craftsmen[i][1]]
	}
	// Monuments
	for (let i = 0; i < playerObj.monuments.length; i++) {
		score += rf.MONUMENT_SCORE[playerObj.monuments[i][1]]
	}

	if (anyoneHasYEMOJA(false)) score = processYEMOJAdifference(playerIndex, score)

	return score
}

export function getTurnEndCows(playerIndex, incomeType) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]

	let income = 0
	if (incomeType === 0 || incomeType === 9) {
		// Add cows to ENGAI
		if (has_god(playerObj, rf.ENGAI)) {
			income += 2
		}
		// add from god cards
		const gods = getPlayer_gods(playerObj)
		for (let g = 0; g < gods.length; g++) {
			if (gods[g][0] !== rf.EKWENSU) {
				income += gods[g][1]
			}
		}

		// Get amount to go on AJAKA
		if (has_god(playerObj, rf.AJAKA)) {
			for (let i = 0; i < store.players.length; i++) {
				for (let j = 0; j < store.players[i].techs.length; j++) {
					let totalCows = store.players[i].techs[j][1]
					if (totalCows >= 6) {
						let half_rounded_up = Math.ceil(totalCows / 2)
						income += half_rounded_up
					}
				}
			}
		}

		if (incomeType === 0) return income
	}
	if (incomeType === 1 || incomeType === 9) {
		// add from spec cards
		for (let j = 0; j < playerObj.specialists.length; j++) {
			income += playerObj.specialists[j][1]
			// Herd
			if (playerObj.specialists[j][0] === rf.HERD) income += playerObj.specialists[j][1] / 2
		}
		if (incomeType === 1) return income
	}
	if (incomeType === 2 || incomeType === 9) {
		// add from tech cards
		for (let j = 0; j < playerObj.techs.length; j++) {
			if (playerObj.techs[j][1] >= 6 && anyoneHasAJAKA(false)) {
				let ajakaPlayerIndex = anyoneHasAJAKA(true)
				let totalCows = playerObj.techs[j][1]
				let half_rounded_up = Math.ceil(totalCows / 2)
				income += totalCows - half_rounded_up
				if (ajakaPlayerIndex === playerIndex) income += half_rounded_up
			} else income += playerObj.techs[j][1]
		}
		if (incomeType === 2) return income
	}
	if (incomeType === 3 || incomeType === 9) {
		// add monument
		let max = 0
		for (let j = 0; j < playerObj.monuments.length; j++) {
			if (playerObj.monuments[j][1] > max) max = playerObj.monuments[j][1]
		}
		income += max
		if (incomeType === 3) return income
	}
	return income
}

export function getVR(playerObj, withoutClamping = false) {
	const store = useModelStore()

	if (playerObj.displayName === rf.BOT_NAME) return 41
	// OLD EDITION
	//if (getPlayerPrimary_god(playerObj)[0] === rf.ANYANWU) return 40
	let VR = 20
	// add god
	const gods = getPlayer_gods(playerObj)
	for (let g = 0; g < gods.length; g++) {
		if (gods[g][0] !== rf.NO_god) VR += rf.gods_VR[gods[g][0]]
	}
	// Add Specs
	for (let i = 0; i < playerObj.specialists.length; i++) {
		VR += rf.SPEC_VR[playerObj.specialists[i][0]]
	}
	// Add Techs
	for (let i = 0; i < playerObj.techs.length; i++) {
		if (has_god(playerObj, rf.GU)) VR++
		else VR += rf.TECH_VR[playerObj.techs[i][0]]
	}
	// Add ALIJIRE penalty
	let playerIndex = store.players.indexOf(playerObj)
	let alajireNumber = anyoneHasALAJIRE(true)
	if (alajireNumber >= 0 && alajireNumber !== playerIndex) VR += 5
	if (!withoutClamping) VR = Math.min(VR, 40)
	return VR
}

export function anyPlayerMeetsVR() {
	const store = useModelStore()

	for (let i = 0; i < store.players.length; i++) {
		if (getScore(i) >= getVR(store.players[i])) return true
	}
	return false
}

export function endGame() {
	let overshoot = endGame_core()
	addHistory(rf.HIST_GAME_END, -1, 1, [...overshoot])
}

export function endGame_core(simulateOnly) {
	const store = useModelStore()
	if (!simulateOnly) store.gameflow.phase = rf.PHASE_GAME_OVER

	// Step 1: Create overshoot array [overshootValue, playerIndex]
	let overshoot = store.players.map((player, index) => [getScore(index) - getVR(player), index])

	// Step 2: Sort by overshoot (descending), XANGO, getScore (descending), turn order
	overshoot.sort((a, b) => {
		// Tiebreaker 1: Highest overshoot
		if (a[0] !== b[0]) return b[0] - a[0]

		// Tiebreaker 2: XANGO (at most one player has it)
		const aIsXango = has_god(store.players[a[1]], rf.XANGO)
		const bIsXango = has_god(store.players[b[1]], rf.XANGO)
		if (aIsXango && !bIsXango) return -1
		if (!aIsXango && bIsXango) return 1

		// Tiebreaker 3: Highest getScore
		const scoreDiff = getScore(b[1]) - getScore(a[1])
		if (scoreDiff !== 0) return scoreDiff

		// Tiebreaker 4: Turn order
		return store.gameflow.fullTurnOrder.indexOf(a[1]) - store.gameflow.fullTurnOrder.indexOf(b[1])
	})

	// Step 3: Assign tiebreaker codes for all tied groups
	for (let i = 0; i < overshoot.length; i++) {
		// Tiebreaker 1: Outright highest overshoot
		if ((i === 0 && overshoot.length > 1 && overshoot[0][0] > overshoot[1][0]) || (i > 0 && i < overshoot.length - 1 && overshoot[i - 1][0] > overshoot[i][0] && overshoot[i][0] > overshoot[i + 1][0]) || (i === overshoot.length - 1 && overshoot[i - 1][0] > overshoot[i][0])) {
			overshoot[i].push(1) // Outright highest overshoot
			continue
		}

		// Identify tied group
		let startIdx = i
		let endIdx = i
		while (endIdx + 1 < overshoot.length && overshoot[endIdx + 1][0] === overshoot[startIdx][0]) {
			endIdx++
		}

		// Process tied group
		if (startIdx === endIdx) {
			// Single player in group, no tiebreaker needed beyond overshoot
			overshoot[startIdx].push(5) // Next in order
		} else {
			// Tiebreaker 2: XANGO (at most one player)
			let xangoAssigned = false
			for (let j = startIdx; j <= endIdx; j++) {
				if (has_god(store.players[overshoot[j][1]], rf.XANGO)) {
					overshoot[j].push(2) // XANGO wins tied group
					xangoAssigned = true
					break
				}
			}

			// Tiebreaker 3: Highest getScore
			if (!xangoAssigned && endIdx > startIdx) {
				if (getScore(overshoot[startIdx][1]) > getScore(overshoot[startIdx + 1][1])) {
					overshoot[startIdx].push(3) // Highest score wins
				}
			}

			// Tiebreaker 4: Turn order
			if (!overshoot[startIdx][2] && endIdx > startIdx) {
				if (store.gameflow.fullTurnOrder.indexOf(overshoot[startIdx][1]) < store.gameflow.fullTurnOrder.indexOf(overshoot[startIdx + 1][1])) {
					overshoot[startIdx].push(4) // Turn order wins
				}
			}

			// Tiebreaker 5: Next in order for remaining players
			for (let j = startIdx; j <= endIdx; j++) {
				if (!overshoot[j][2]) {
					overshoot[j].push(5) // Next in order
				}
			}
		}

		i = endIdx // Skip to end of tied group
	}

	// Step 4: Update gameflow if not simulating
	if (!simulateOnly) {
		store.gameflow.fullTurnOrder.splice(0, store.gameflow.fullTurnOrder.length, ...overshoot.map((item) => item[1]))
		store.gameflow.turnOrder.splice(0, store.gameflow.turnOrder.length, overshoot[0][1])
	}
	return overshoot
}

/*
function sortByHihgestRawScore(items) {
	//const store = useModelStore()
	items = items.sort((a, b) => getScore(b[1]) - getScore(a[1]))
	return items
}

function sortByTurnOrder(items) {
	const store = useModelStore()
	items = items.sort((a, b) => store.gameflow.fullTurnOrder.indexOf(a[1]) - store.gameflow.fullTurnOrder.indexOf[b[1]])
	return items
}

export function endGame_core(simulateOnly) {
	const store = useModelStore()

	if (!simulateOnly) store.gameflow.phase = rf.PHASE_GAME_OVER
	let overshoot = []
	for (let i = 0; i < store.players.length; i++) {
		overshoot.push([getScore(i) - getVR(store.players[i]), i])
	}
	// Sort by highest overshoot first
	overshoot = overshoot.sort((a, b) => b[0] - a[0])

	// 1 = OUTRIGHT HIGHEST OVERSHOOT
	for (let i = 0; i < overshoot.length; i++) {
		if (i == 0 && overshoot[0][0] > overshoot[1][0]) overshoot[0].push(1)
		// Must be lower than previous player, and higher than next
		else if (i > 0 && i < overshoot.length - 1 && overshoot[i - 1][0] > overshoot[i][0] && overshoot[i][0] > overshoot[i + 1][0]) overshoot[i].push(1)
		else if (i === overshoot.length - 1 && overshoot[i - 1][0] > overshoot[i][0]) overshoot[i].push(1)
	}

	//return overshoot

	// Now anything with lengthh 3 is the pure highest overshoot
	// So sort anything inbetween by XANGO and give it a 2

	// 2 = Tied overshoots are won by XANGO
	for (let i = 0; i < overshoot.length; i++) {
		if (overshoot[i].length < 3) {
			let startIdx = i
			let endIdx = i
			for (let j = i; j < overshoot.length; j++) {
				if (overshoot[j].length === 3 || overshoot[j][0] !== overshoot[i][0]) break
				else endIdx = j
			}
			// Now loop the indexes, and if XANGO is found, move them to the start
			for (let j = startIdx; j <= endIdx; j++) {
				if (has_god(store.players[overshoot[j][1]], rf.XANGO)) {
					//overshoot[j].push(2)
					;[overshoot[startIdx], overshoot[j]] = [overshoot[j], overshoot[startIdx]]
					overshoot[startIdx].push(2)
					break
				}
			}
		}
	}

	//return overshoot

	// 3 = Highest Raw Score
	for (let i = 0; i < overshoot.length; i++) {
		if (overshoot[i].length < 3) {
			let startIdx = i
			let endIdx = i
			for (let j = i; j < overshoot.length; j++) {
				if (overshoot[j].length === 3 || overshoot[j][0] !== overshoot[startIdx][0]) break
				else endIdx = j
			}
			if (startIdx !== endIdx) {
				let numItems = endIdx - startIdx + 1
				//alert(JSON.stringify(overshoot))
				//alert("Start: " + String(startIdx) + " End: " + String(endIdx)+ " Num Items: " + String(numItems))
				// Splice out this section for sorting
				let removedItems = overshoot.splice(startIdx, numItems)
				//alert(JSON.stringify(removedItems))
				removedItems = sortByHihgestRawScore(removedItems)
				//alert(JSON.stringify(removedItems))

				//alert(removedItems.length)
				//  alert(JSON.stringify(removedItems))
				// Now reinsert one by one
				for (let j = 0; j < removedItems.length; j++) {
					overshoot.splice(startIdx + j, 0, removedItems[j])
				}
				//  alert(JSON.stringify(overshoot))
				// Now if the first is different from the second, give it a reason
				if (getScore(overshoot[startIdx][1]) > getScore(overshoot[startIdx + 1][1])) {
					overshoot[startIdx].push(3)
				}
			}
			i = endIdx
		}
	}

	//return overshoot

	// 4 = then turn order
	for (let i = 0; i < overshoot.length; i++) {
		if (overshoot[i].length < 3) {
			let startIdx = i
			let endIdx = i
			for (let j = i; j < overshoot.length; j++) {
				if (overshoot[j].length === 3 || overshoot[j][0] !== overshoot[startIdx][0]) break
				else endIdx = j
			}
			if (startIdx !== endIdx) {
				let numItems = endIdx - startIdx + 1
				// alert("Start: " + String(startIdx) + " End: " + String(endIdx))
				// Splice out this section for sorting
				let removedItems = overshoot.splice(startIdx, numItems)
				removedItems = sortByTurnOrder(removedItems)
				//  alert(JSON.stringify(removedItems))
				// Now reinsert one by one
				for (let j = 0; j < removedItems.length; j++) {
					overshoot.splice(startIdx + j, 0, removedItems[j])
				}
				//  alert(JSON.stringify(overshoot))
				// Now if the first is different from the second, give it a reason
				if (store.gameflow.fullTurnOrder.indexOf(overshoot[startIdx][1]) < store.gameflow.fullTurnOrder.indexOf(overshoot[startIdx + 1][1])) {
					overshoot[startIdx].push(4)
				}
			}
			i = endIdx
		}
	}

	// 5 = Next in order
	for (let i = 0; i < overshoot.length; i++) {
		if (overshoot[i].length === 2) overshoot[i].push(5)
	}

	if (!simulateOnly) {
		store.gameflow.fullTurnOrder.splice(0)
		for (let i = 0; i < overshoot.length; i++) {
			store.gameflow.fullTurnOrder.push(overshoot[i][1])
		}
		store.gameflow.turnOrder.splice(0)
		store.gameflow.turnOrder.push(overshoot[0][1])
	}
	//alert("END")
	// alert(JSON.stringify(overshoot))

	return overshoot
}*/

export function setupStatsMode() {
	const store = useModelStore()
	store.statsModeData.cmanIncomeArray.splice(0)
	store.statsModeData.cmanIncomeArray = [...calcCmanIncome()]
	store.statsModeData.techIncomeArray.splice(0)
	store.statsModeData.techIncomeArray = [...calcTechIncome()]
	calcSpecsandgodsIncome()

	store.statsModeData.statsMode = true
}

function calcCmanIncome() {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.history.length; i++) {
		if (store.history[i][0] === rf.HIST_RAISE_MON) {
			for (let j = 1; j < store.history[i][3].length; j++) {
				let priCraftsmanIndex = store.history[i][3][j][0][0]
				let cowIncome = store.history[i][3][j][0][2]

				let subArr = res.find((subArr) => subArr[0] === priCraftsmanIndex)
				if (subArr === undefined) {
					res.push([priCraftsmanIndex, cowIncome])
				} else {
					subArr[1] += cowIncome
				}
				if (store.history[i][3][j].length > 2) {
					let priCraftsmanIndex = store.history[i][3][j][2][0]
					let cowIncome = store.history[i][3][j][2][2]

					let subArr = res.find((subArr) => subArr[0] === priCraftsmanIndex)
					if (subArr === undefined) {
						res.push([priCraftsmanIndex, cowIncome])
					} else {
						subArr[1] += cowIncome
					}
				}
			}
		}
	}

	// Add in any unused Cman with 0 income
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].craftsmen.length; j++) {
			let priCraftsmanIndex = store.players[i].craftsmen[j][0]
			let subArr = res.find((subArr) => subArr[0] === priCraftsmanIndex)
			if (subArr === undefined) {
				res.push([priCraftsmanIndex, 0])
			}
		}
	}
	return res
}

export function getStatForPrCraftsmanSq(sq) {
	const store = useModelStore()
	let subArr = store.statsModeData.cmanIncomeArray.find((subArr) => subArr[0] === sq)
	return subArr[1]
}

// ASSUME THE CRAFTSMAN STATS HAS ALREADY BEEN CALC'D
function calcTechIncome() {
	const store = useModelStore()
	let res = []

	for (let i = 0; i < store.players.length; i++) {
		// [WC techs, potter techs, ivory techs, dismond techs, Scultor techs, VM techs, TM techs, Blacksmith tech]
		res.push([0, 0, 0, 0, 0, 0, 0, 0])
		for (let j = 0; j < store.players[i].craftsmen.length; j++) {
			let priCraftsmanIndex = store.players[i].craftsmen[j][0]
			let subArr = store.statsModeData.cmanIncomeArray.find((subArr) => subArr[0] === priCraftsmanIndex)
			let totalIncome = subArr[1]

			let relevantTile = rf.getCrafsmsnTileFromCraftsmanSq(store.coords[priCraftsmanIndex])

			if (relevantTile !== rf.BLACKSMITH_TILE) res[res.length - 1][relevantTile] += totalIncome
			else res[res.length - 1][7] += totalIncome
		}
	}

	return res
}

export function calcSpecsandgodsIncome() {
	const store = useModelStore()
	// god vars
	let engaiTaken = false
	let shadTaken = false
	let OVIAused = false
	let qamataPlayerIndex = -1

	// spec vars
	let builderPlayerIndex = -1
	for (let i = 0; i < store.history.length; i++) {
		// CHOOSE SPEC
		if (store.history[i][0] === rf.HIST_CHOOSE_SPEC) {
			if (store.history[i][3][0] === rf.HERD) store.statsModeData.specsandgodsObj.herd += 1
			else if (store.history[i][3][0] === rf.NOMADS) store.statsModeData.specsandgodsObj.nomads += 2
			else if (store.history[i][3][0] === rf.RAIN_CEREMONY) store.statsModeData.specsandgodsObj.rainCeremony += 3
			else if (store.history[i][3][0] === rf.SHAMAN) store.statsModeData.specsandgodsObj.shaman += 2
			else if (store.history[i][3][0] === rf.BUILDER) {
				//store.statsModeData.specsandgodsObj.builder += 2
				builderPlayerIndex = store.history[i][1]
			}
		}
		// HERD
		if (store.history[i][0] === rf.HIST_ADD_HERD_COWS) store.statsModeData.specsandgodsObj.herd += store.history[i][3][1] / 2
		// activate spec (NOMADS / BUILDER)
		if (store.history[i][0] === rf.HIST_ACTIVATE_SPEC) {
			if (store.history[i][3][0] === rf.NOMADS) store.statsModeData.specsandgodsObj.nomads += store.history[i][3][1]
			//else if (store.history[i][3][0] === rf.BUILDER) store.statsModeData.specsandgodsObj.builder += store.history[i][3][1]
		}
		// RAIN CEREMONY
		if (store.history[i][0] === rf.HIST_BUILD_WATER && store.history[i][3][2] > 0) store.statsModeData.specsandgodsObj.rainCeremony += store.history[i][3][2]
		// SHAMAN
		if (store.history[i][0] === rf.HIST_BUILD_RESOURCE && store.history[i][3][2] > 0) store.statsModeData.specsandgodsObj.shaman += store.history[i][3][2]
		// Builder
		if (store.history[i][0] === rf.HIST_BUILD_CRAFTSMAN && store.history[i][1] === builderPlayerIndex) {
			store.statsModeData.specsandgodsObj.builder += 2
		}

		/********************************************************* gods */
		if (store.history[i][0] === rf.HIST_CHOOSE_god) {
			if (store.history[i][3][0] === rf.ENGAI) engaiTaken = true
			else if (store.history[i][3][0] === rf.SHADIPINYI) shadTaken = true
			else if (store.history[i][3][0] === rf.QAMATA) qamataPlayerIndex = store.history[i][1]
		}
		// Engai
		if (store.history[i][0] === rf.HIST_REVENUES) {
			if (engaiTaken) store.statsModeData.specsandgodsObj.engai += 2
			if (qamataPlayerIndex >= 0) {
				let entry = store.history[i][3].find((subArr) => subArr[0] === qamataPlayerIndex)
				store.statsModeData.specsandgodsObj.qamata += entry[1]
			}
		}

		// Shad
		if (shadTaken && store.history[i][0] === rf.HIST_END_BIDS) {
			let totalBids = 0
			for (let j = 0; j < store.history[i][3][1].length; j++) totalBids += store.history[i][3][1][j]
			// Shad gets totalBids / totalplayers+1 if that's an int, or an extra if it's not
			store.statsModeData.specsandgodsObj.shadipinyi += Math.floor(totalBids / (store.players.length + 1)) + (totalBids % (store.players.length + 1) > 0 ? 1 : 0)
		}

		// Ovia
		if (store.history[i][0] === rf.HIST_RAISE_MON) {
			const histEntry3 = store.history[i][3]
			for (let j = 1; j < histEntry3.length; j++) {
				if (histEntry3[j][0] === -2) OVIAused = true
			}
			if (OVIAused) {
				for (let j = 0; j < histEntry3.length; j++) {
					for (let k = 0; k < histEntry3[j].length; k++) {
						if (histEntry3[j][k].length === 3) store.statsModeData.specsandgodsObj.ovia++
					}
				}
			}
		}
	}
}
/*export const HERD = 0 // Change 2/4/5 cows => 3/6/9 cows
export const NOMADS = 1 // allow adjacent monuments
export const RAIN_CEREMONY = 2 // place water
export const SHAMAN = 3 // place resources
export const BUILDER = 4*/
