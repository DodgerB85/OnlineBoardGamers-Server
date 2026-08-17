/**
AVAILABLE FUNCTIONS
===================
addBuildingOutputResourcesToGame_core(buildingID)
doPrimaryProduction()
doAutoSecondaryProduction(prePhase)
**/

import { useModelStore } from "../stores/RNBstore.js"

import * as rf from "./RNBreference.js"
import * as model from "./RNBmodel"
import * as util from "./RNButil"
import * as map from "./RNBmap"
import * as loc from "./RNBlocation"
import * as stack from "./RNBstack"
import * as context from "./RNBcontext"
import * as highlight from "./RNBhighlight"
import * as controller from "./RNBcontroller.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

// NOTE: This outputs resources, and prevents out put of an unclaimed transporter production.
// Player transporter production is handled seperately
export function addBuildingOutputResourcesToGame_core(buildingID, forcedOutputRes = -1, playerIndex = 9, forPreTurn) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const building = model.getBuildingByID(buildingID)
	const bldgStats = model.getBuildingStatsFromBuildingID(buildingID)
	const { type, location, remainingMineContent, id } = building

	// Use a single result variable instead of re-assigning an array repeatedly
	let producedMineRes = 0

	for (const outputRes of bldgStats.outputRes) {
		if (outputRes > rf.RES_UPPER_LIMIT) continue

		if (type !== rf.BLDG_MINE) {
			model.addResourceToGame_core(outputRes, location, playerIndex)
			continue
		}

		// Handle Mine Logic
		const [gold, iron] = remainingMineContent
		const total = gold + iron
		if (total <= 0) continue

		// For PRE-TURN, get eithe ronly option, OR pseudo good
		if (forPreTurn) {
			if (store.gameOptions.useSoloMineRules) producedMineRes = iron > gold ? rf.RES_IRON : rf.RES_GOLD
			else if (gold === 0) producedMineRes = rf.RES_IRON
			else if (iron === 0) producedMineRes = rf.RES_GOLD
			else producedMineRes = rf.RES_PSEUDO_MINE
		}
		// If for solo (and not replay), use the solo rules order
		else if ((store.gameOptions.useSoloMineRules || personal.soloGame) && forcedOutputRes === -1) {
			producedMineRes = iron > gold ? rf.RES_IRON : rf.RES_GOLD
		} else {
			// Actual turn logic
			producedMineRes = forcedOutputRes !== -1 ? forcedOutputRes : Math.random() * total < gold ? rf.RES_GOLD : rf.RES_IRON
		}

		// Execute resource addition and decrement state
		model.addResourceToGame_core(producedMineRes, location, 9)

		if (producedMineRes === rf.RES_GOLD) remainingMineContent[0]--
		else if (producedMineRes === rf.RES_IRON) remainingMineContent[1]--

		// The original code returns early for mines during preTurn,
		// otherwise it continues the loop (though mines usually have 1 outputRes).
		if (forPreTurn) return [id, producedMineRes]
	}

	return producedMineRes ? [id, producedMineRes] : []
}
/*export function addBuildingOutputResourcesToGame_core(buildingID, forcedOutputRes = -1, playerIndex = 9, forPreTurn) {
	const building = model.getBuildingByID(buildingID)
	const bldgStats = model.getBuildingStatsFromBuildingID(buildingID)
	let ret = [] // subArrs for mineID and result
	for (const outputRes of bldgStats.outputRes) {
		if (outputRes <= rf.RES_UPPER_LIMIT) {
			// MINE OUTPUT
			if (building.type === rf.BLDG_MINE) {
				const remainingMineContent = building.remainingMineContent // e.g., [3, 1]
				const [goldCount, ironCount] = remainingMineContent
				const total = goldCount + ironCount
				let producedMineRes = 0
				ret = [building.id, producedMineRes]
				// PRE-PHASE, ONLY MAKE CERTAINTIES, OR PSEUDO
				if (forPreTurn && total > 0) {
					if (goldCount === 0 && ironCount > 0) producedMineRes = rf.RES_IRON
					else if (goldCount > 0 && ironCount === 0) producedMineRes = rf.RES_GOLD
					else producedMineRes = rf.RES_PSEUDO_MINE

					model.addResourceToGame_core(producedMineRes, building.location, 9)
					if (producedMineRes === rf.RES_GOLD) building.remainingMineContent[0]--
					else if (producedMineRes === rf.RES_IRON) building.remainingMineContent[1]--

					return ret
				}
				else if (total > 0) {
					// 1. Pick a random number between 0 and the total
					const roll = Math.random() * total
					// 2. Determine the result based on the weights
					// If roll < 3, it's Gold. If roll >= 3, it's Iron.
					producedMineRes = roll < goldCount ? rf.RES_GOLD : rf.RES_IRON
					// Force the output if doing a replay
					if (forcedOutputRes !== -1) producedMineRes = forcedOutputRes

					model.addResourceToGame_core(producedMineRes, building.location, 9)
					if (producedMineRes === rf.RES_GOLD) building.remainingMineContent[0]--
					else if (producedMineRes === rf.RES_IRON) building.remainingMineContent[1]--
					ret = [building.id, producedMineRes]
				}
			}
			// NORMAL OUTPUT
			else model.addResourceToGame_core(outputRes, building.location, playerIndex)
		}
	}
	return ret
}*/

export function doMineProduction(performingFromReplay, histEntry = [], forPreTurn) {
	const store = useModelStore()
	store.context.historyObj.splice(0)
	for (const building of model.getAllInGameBuildings().filter(model.isPrimaryProducer)) {
		// Skip NON mines here - they are done after conflict
		if (building.type !== rf.BLDG_MINE) continue

		// Force mine outputs if doing a replay
		if (performingFromReplay) {
			const priEntries = histEntry[0]
			let mineProductionEntry = priEntries.find((a) => a[0] === building.id)
			let outputRes = rf.RES_GOLD
			if (mineProductionEntry.length > 2) outputRes = mineProductionEntry[2]
			addBuildingOutputResourcesToGame_core(building.id, outputRes, 9)
		} else {
			const mineInfo = addBuildingOutputResourcesToGame_core(building.id, -1, 9, forPreTurn)
			// Record output
			const compressedLocation = stack.compressLocation(building.location)
			if (mineInfo.length > 0) {
				if (mineInfo[1] !== rf.RES_GOLD) {
					store.context.historyObj.push([building.id, [...compressedLocation], mineInfo[1]])
				} else {
					store.context.historyObj.push([building.id, [...compressedLocation]])
				}
			}
		}
	}
}

// THIS IS ALSO USED IN REPLAY
export function doPrimaryProduction(performingFromReplay, histEntry = []) {
	const store = useModelStore()
	store.context.historyObj.splice(0)
	// Make an history array entry for primary producers
	if (!performingFromReplay) store.context.historyObj.push([])
	for (const building of model.getAllInGameBuildings().filter(model.isPrimaryProducer)) {
		// Skip mines here - they must be done BEFORE conflict
		if (building.type === rf.BLDG_MINE) continue

		// Force mine outputs if doing a replay
		if (performingFromReplay) {
			const priEntries = histEntry[0]
			let mineProductionEntry = priEntries.find((a) => a[0] === building.id)
			let outputRes = rf.RES_GOLD
			if (mineProductionEntry.length > 2) outputRes = mineProductionEntry[2]
			addBuildingOutputResourcesToGame_core(building.id, outputRes, 9)
		} else {
			addBuildingOutputResourcesToGame_core(building.id, -1, 9)
			//const mineInfo =
			// Output is fixed, so we only need to record the type and location UNLESS it is a mine
			const compressedLocation = stack.compressLocation(building.location)
			//if (mineInfo.length > 0 && mineInfo[1] !== rf.RES_GOLD) {
			//	store.context.historyObj[0].push([building.id, [...compressedLocation], mineInfo[1]])
			//} else
			store.context.historyObj[0].push([building.id, [...compressedLocation]])
		}
	}

	// Now check for geese to reproduce - only on land, if on pasture
	let geese = model.getAllInGameResources().filter((r) => r.type === rf.RES_GOOSE && loc.isBucketLocation(r.location))
	console.log(JSON.stringify(geese))
	
	// Split the filter for debugging
	geese = geese.filter((r) => model.getHexByID(r.location[1]).currentTerrain === rf.TERR_PASTURE)
	let reproducingGeeseIDs = []
	// Make an history array entry for geese
	if (!performingFromReplay) store.context.historyObj.push([])
	for (const g of geese) {
		if (reproducingGeeseIDs.includes(g.id)) continue
		let transportersOnHex = model.getAllInGameTransporters().filter((t) => loc.isSpecificHexLocation(t.location, g.location[1]))
		if (transportersOnHex.length > 0) continue
		let resOnHex = model.getAllInGameResources().filter((r) => loc.isSpecificHexLocation(r.location, g.location[1]))
		if (resOnHex.length !== 2) continue
		let buildingsOnHex = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, g.location[1]))
		if (buildingsOnHex.length > 0) continue
		let otherGoose = resOnHex.find((r) => r.id !== g.id && r.type === rf.RES_GOOSE) || null
		if (!otherGoose) continue
		// Now there are no transporters, and exactly 2 geese on the hex with no other resources
		// (Double sanity check)
		let hex = model.getHexByID(g.location[1])
		if (hex.currentTerrain !== rf.TERR_PASTURE) continue
		// All good, so reproduce
		reproducingGeeseIDs.push(resOnHex[0].id)
		reproducingGeeseIDs.push(resOnHex[1].id)
		model.addResourceToGame_core(rf.RES_GOOSE, g.location, 9)
		// Just add the locations to history
		if (!performingFromReplay) {
			const compressedGoodeLocation = stack.compressLocation(g.location)
			store.context.historyObj[1].push([...compressedGoodeLocation])
		}
	}
}

export function findAllDonkeyReproductionHexIDpossibilities(playerIndex) {
	let currentPlayerDonkeyPbj = model.getAllInGameTransporters().filter((t) => t.ownerIndex === playerIndex && t.type === rf.DONKEY)
	let possibleHexIDs = []
	for (const donkeyObj of currentPlayerDonkeyPbj) {
		const mainDonkeyID = donkeyObj.id
		const mainDonkeyLocation = donkeyObj.location
		// Donkey can't be carrying anything
		if (model.anythingFollowingTransporter(mainDonkeyID)) continue
		if (model.transporterCarriesAnything(mainDonkeyID)) continue
		// Don't include if already there
		if (possibleHexIDs.some((subArray) => subArray[0][0] === mainDonkeyLocation[1])) continue
		// Hex must be pasture
		let hex = model.getHexByID(mainDonkeyLocation[1])
		if (hex.currentTerrain !== rf.TERR_PASTURE) continue
		// No buildings
		let buildingsOnHex = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, mainDonkeyLocation[1]))
		if (buildingsOnHex.length > 0) continue
		// No res
		let resOnHex = model.getAllInGameResources().filter((r) => loc.isSpecificHexLocation(r.location, mainDonkeyLocation[1]))
		if (resOnHex.length > 0) continue
		// No other transporters - except a single donkey
		let otherTransportersOnHex = model.getAllInGameTransporters().filter((t) => loc.isSpecificHexLocation(t.location, mainDonkeyLocation[1]) && t.id !== mainDonkeyID)
		if (otherTransportersOnHex.length !== 1) continue
		// Check both trans are donkeys and owned by this player
		let donkeysOnHex = model.getTransportersByPlayerIndex(playerIndex).filter((t) => loc.isSpecificHexLocation(t.location, mainDonkeyLocation[1]) && t.type === rf.DONKEY)
		if (donkeysOnHex.length !== 2) continue

		// Other donkey must not be carrying anything
		const otherDonkeyObj = otherTransportersOnHex[0]
		const otherDonkeyID = otherDonkeyObj.id
		if (model.anythingFollowingTransporter(otherDonkeyID)) continue
		if (model.transporterCarriesAnything(otherDonkeyID)) continue
		// Extra check
		if (otherDonkeyObj.type !== rf.DONKEY) continue

		// Now there are no other transporters, and exactly 2 donkeys on the pasture hex with no res or bldgs

		// All good, so add to the options
		let compressedLocation = stack.compressLocation(mainDonkeyLocation)
		// Location for donkey reproduction // are they reproing? // transID for removal // transLocation for "un removal"
		possibleHexIDs.push([compressedLocation, true, -1, []])
	}
	return possibleHexIDs
}

export function findAllResearchHexIDpossibilities(playerIndex) {
	//const store = useModelStore()
	// This is possibly inefficient. But there are at most 8 transporters in the game anyway
	let res = []
	const allPlayerTransporters = model.getTransportersByPlayerIndex(playerIndex)
	for (const transporterObj of allPlayerTransporters) {
		if (!loc.isAnyHexLocation(transporterObj.location)) continue
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterObj.id, true)
		const resourceOnHex = model.resourceCountByType(reachableResources.map((res) => res.type))

		const paperOnHex = resourceOnHex[rf.RES_PAPER]
		const geeseOnHex = resourceOnHex[rf.RES_GOOSE]
		if (paperOnHex >= 1 && geeseOnHex >= 2 && !res.includes(transporterObj.location[1])) {
			res.push(transporterObj.location[1])
		}
	}
	return res
}

// THIS IS ALSO USED IN REPLAY
export function findExcessTransportersWithDonkeyProduction(playerIndex, forcedIncomingDonkeys = -1) {
	const store = useModelStore()
	let incomingDonkeys = 0
	let outgoingTransporterNum = 0
	for (const donkeyEntry of store.context.possibleDonkeyReproductionData) {
		if (donkeyEntry[1] === true) incomingDonkeys += 1
		if (donkeyEntry[2] !== -1) outgoingTransporterNum = 1
	}
	if (forcedIncomingDonkeys !== -1) incomingDonkeys = forcedIncomingDonkeys
	let currentTransporters = model.getTransportersByPlayerIndex(playerIndex).length
	let currentLandTransporters = model.getTransportersByPlayerIndexandType(playerIndex, rf.LAND_TYPE).length
	let totalProblem = false
	let landProblem = false
	if (currentTransporters + incomingDonkeys - outgoingTransporterNum > 8) totalProblem = true
	if (currentLandTransporters + incomingDonkeys - outgoingTransporterNum > 5) landProblem = true
	return [totalProblem, landProblem, incomingDonkeys, currentTransporters, currentLandTransporters]
}

export function processDonkeyReproduction(playerIndex) {
	const store = useModelStore()
	let histObjForStack = []
	for (const donkeyEntry of store.context.possibleDonkeyReproductionData) {
		if (donkeyEntry[1] === true) {
			const errorReturn = findExcessTransportersWithDonkeyProduction(playerIndex, 1)
			// Don't reproduce with any issues
			if (errorReturn[0] === true || errorReturn[1] === true) continue
			const fullLocation = stack.decompressLocation(donkeyEntry[0])

			model.addTransporterToGame(playerIndex, rf.DONKEY, fullLocation, true)
			if (donkeyEntry[2] === -1) histObjForStack.push([[...donkeyEntry[0]]])
			else histObjForStack.push([[...donkeyEntry[0]], donkeyEntry[2]])
		}
	}
	return histObjForStack
}

export function doAutoSecondaryProduction(prePhase, ignoreHistory) {
	const store = useModelStore()
	const secondaryBuildings = model.getAllInGameBuildings().filter(model.isSecondaryProducer)
	// Make an history array entry for sec producers in PRE phase
	// Also find all unreachable locations by anyone for auto-produce
	let allReachableLocations = []
	if (prePhase) {
		if (!ignoreHistory) store.context.historyObj.push([])
		for (let i = 0; i < store.players.length; i++) {
			allReachableLocations = allReachableLocations.concat(loc.getAllLocationsReachableByPlayerIndex(i))
		}
	}
	const secondaryBuildingsReachableIDs = secondaryBuildings.filter((a) => util.includesArray(allReachableLocations, a.location)).map((a) => a.id)
	// Pre-phase, only produce if there's no transporters reaching the bldg
	for (const i of util.indicesOf(model.getAllInGameBuildings(), model.isSecondaryProducer)) {
		let bldg = model.getAllInGameBuildings()[i]
		const bldgLocation = bldg.location
		if (bldgLocation[0] !== rf.LOCATION_BUCKET) {
			rf.doAdminAlrt("do auto sec prod: why is there a building not in a bucket?")
		}
		let hexID = bldgLocation[1]
		let bucketID = bldgLocation[2]
		if (prePhase && secondaryBuildingsReachableIDs.includes(bldg.id)) continue
		const bldgStats = model.getBuildingStatsFromBuildingID(bldg.id)
		for (let i = 0; i < bldgStats.inputRes.length; i++) {
			const inputRes = bldgStats.inputRes[i]
			// While you have remaining capacity, and resources have been found, then produce
			while (bldg.remainingConversions > 0 && map.doesBucketHaveAccessToResources(hexID, bucketID, inputRes, false)) {
				// Add the history entry. We need building type, location, and input ONLY FOR PAPARMILL and COAL_BURNER, IF the first input isn't boards
				let histObj = []
				histObj.push(bldg.id)
				histObj.push(stack.compressLocation(bldg.location))
				if ((bldg.type === rf.BLDG_PAPERMILL || bldg.type === rf.BLDG_COAL_BURNER) && inputRes[0] !== rf.RES_BOARDS) {
					histObj.push(i)
				}
				// In pre phase, store in entry 2
				if (!ignoreHistory) {
					if (prePhase) store.context.historyObj[2].push([...histObj])
					else store.context.historyObj[0].push([...histObj])
				}
				model.removeResourcesFromGameUsingBucket_core(hexID, bucketID, inputRes)
				bldg.remainingConversions--
				addBuildingOutputResourcesToGame_core(bldg.id, -1, 9)
			}
		}
	}
	// Finally, do meta phys research in post production
	if (!prePhase) {
		for (const resObj of store.ALL_RESOURCES) {
			if (![rf.RES_GOOSE, rf.RES_PAPER].includes(resObj.type) || !loc.isAnyHexLocation(resObj.location)) continue

			const resLocation = resObj.location
			const requiredResources = [rf.RES_GOOSE, rf.RES_GOOSE, rf.RES_PAPER]
			let setFound = map.doesBucketHaveAccessToResources(resLocation[1], resLocation[2], requiredResources, false)
			// If a set is found, get the ID's and remove them from the game
			if (setFound) {
				const removedIDs = model.removeResourcesFromGameUsingBucket_core(resLocation[1], resLocation[2], requiredResources)
				if (store.context.historyObj.length === 1) store.context.historyObj.push([])
				const compressedLocation = stack.compressLocation(resLocation)
				if (!ignoreHistory) store.context.historyObj[1].push([compressedLocation, [...removedIDs]])
			}
		}
	}
}

// function to add 2 numbers

export function doResearch(RND_IDX) {
	const store = useModelStore()
	const transporterID = store.context.selectedTransporterIDforTM
	if (transporterID === -1) return
	let geeseUsed = doResearch_core(transporterID, RND_IDX)
	// Add to the stack
	// All we know is that the transporter rmust be on a hex.
	// It could be carrying all the resources.
	const transporterObj = model.getTransporterByID(transporterID)
	const hexID = transporterObj.location[1]
	let stackAction = [rf.STACK_DO_RESEARCH, stack.getTransIDtoUse(transporterObj), RND_IDX, hexID]
	if (geeseUsed === 1) stackAction.push(1)
	stack.addItemToStack({
		action: rf.STACK_DO_RESEARCH,
		historyEntry: stackAction,
		playerIndex: controller.currentPlayerIndex(),
	})

	// reset vars
	context.resetContextAndHighlights()
	context.createUndoPoint()

	store.context.researchHexIDpossibilities = findAllResearchHexIDpossibilities(controller.currentPlayerIndex())

	// Check for transporter production upgrade possibilities
	const eligibleBuildingIDs = getEligibleBuildingIDsToUpgrade(RND_IDX)
	if (eligibleBuildingIDs.length > 0) {
		store.context.buildingIDsToHighlight = [...eligibleBuildingIDs]
		store.context.action = rf.ACT_CHOOSE_BUILDING_TO_UPGRADE
		store.context.researchIndexForBuildingUpgrades = RND_IDX
	} else highlight.updateAllHighlightsForTransporterMode()
}

export function getEligibleBuildingIDsToUpgrade(RND_IDX) {
	const allInGameBuildings = model.getAllInGameBuildings()

	// 1. Determine eligible building types
	let eligibleBuildingTypes = []
	// NB there is not a "linerar" upgrade path. Therefore, you CAN "upgrade" steamship to rowboat
	if (RND_IDX === rf.RND_ROWBOAT_IDX) eligibleBuildingTypes = [rf.BLDG_RAFT_FACTORY, rf.BLDG_STEAMER_FACTORY]
	else if (RND_IDX === rf.RND_STEAMER_IDX) eligibleBuildingTypes = [rf.BLDG_RAFT_FACTORY, rf.BLDG_ROWBOAT_FACTORY]
	else if (RND_IDX === rf.RND_TRUCK_IDX) eligibleBuildingTypes = [rf.BLDG_WAGON_FACTORY]

	// 2. Get all reachable locations from transporters
	const allPlayerTransporters = model.getTransportersByPlayerIndex(controller.currentPlayerIndex())
	let allReachableLocations = []
	for (const transporterObj of allPlayerTransporters) {
		if (!loc.isAnyHexLocation(transporterObj.location)) continue
		allReachableLocations = allReachableLocations.concat(loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, true))
	}

	// 3. Find matches and return IDs
	// Helper to turn [a, x, y] into "a,x,y" for reliable comparison
	const reachableKeys = new Set(allReachableLocations.map((l) => l.toString()))

	const eligibleBuildingIDs = allInGameBuildings.filter((building) => eligibleBuildingTypes.includes(building.type) && reachableKeys.has(building.location.toString())).map((building) => building.id)

	return eligibleBuildingIDs
}

export function doResearch_core(transporterID, RND_IDX) {
	const store = useModelStore()
	const transporterObj = model.getTransporterByID(transporterID)
	const playerIndex = transporterObj.ownerIndex
	const playerObj = store.players[playerIndex]
	let researchResources = [rf.RES_GOOSE, rf.RES_PAPER]
	let geeseUsed = 1
	if (playerObj.RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] !== 1) {
		researchResources.push(rf.RES_GOOSE)
		geeseUsed = 2
	}
	model.removeResourcesFromGameUsingTransporter(transporterID, researchResources, false)
	playerObj.RnD[RND_IDX] = 1
	return geeseUsed
}
