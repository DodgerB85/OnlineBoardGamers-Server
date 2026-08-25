import * as rf from "../../js/RNBreference"
import * as funcs from "../../js/RNBfuncs"
import * as map from "../../js/RNBmap"
import * as model from "../../js/RNBmodel"
//import * as controller from "../../js/RNBcontroller"
import * as context from "../../js/RNBcontext"
import * as hd from "../../js/RNBhex"
import * as loc from "../../js/RNBlocation"
import * as produce from "../../js/RNBproduce"
import * as graph from "../../js/RNBgraph"
import * as util from "../../js/RNButil"
import * as stack from "../../js/RNBstack"
import * as wonder from "../../js/RNBwonder"
import * as electricity from "../../js/RNBelectricity"
import * as atelier from "../../js/RNBatelier"

import { useModelStore } from "../../stores/RNBstore.js"
import { usePersonalStore } from "../../stores/RNBpersonal"

/*const getFirstReplayIndexForHistory = (histIdx) => {
	const store = useModelStore()
	// Find the first occurrence of this history index in our flat replay data
	return store.replayData.findIndex((d) => d.computedHistoryIndex === histIdx)
}*/

const FULL_REPLAY_CALCS = true
const CHECK_EXTRA_DATA = true

let replayStopRequested = false

export function requestReplayStop(reason = "") {
	replayStopRequested = true
	console.error("=== replayStopRequested:", reason, "===")
}

export function resetReplayStop() {
	replayStopRequested = false
}

export function performStep(amount) {
	const store = useModelStore()
	const maxIdx = store.replayData.length - 1
	// Exit if we are already at the end - mainly hotkey check
	//if (amount > 0 && store.replayStep.computedHistoryIndex === store.computedHistory.length - 1 && (store.replayStep.subStep === -1 || store.replayStep.subStep === store.replayStep.maxStep)) return

	store.clearHistoryHelpers()
	store.clearMessages()
	//if (amount === -99) store.replayStep.computedHistoryIndex = 0
	if (amount === -99) store.replayStep.index = 0
	else if (amount === 99) store.replayStep.index = maxIdx

	if (amount === -9) {
		const currentHistIdx = store.replayData[store.replayStep.index].computedHistoryIndex
		// Find the last entry that has a lower history index
		const prevIndex = store.replayData.findLastIndex((d, idx) => idx < store.replayStep.index && d.computedHistoryIndex < currentHistIdx)
		store.replayStep.index = prevIndex !== -1 ? prevIndex : 0
	}
	if (amount === -1) {
		store.replayStep.index += amount
	}
	if (amount === 1) {
		store.replayStep.index += amount
	}
	if (amount === 9) {
		const currentHistIdx = store.replayData[store.replayStep.index].computedHistoryIndex
		// Find the first entry in replayData that has a higher history index
		const nextIndex = store.replayData.findIndex((d, idx) => idx > store.replayStep.index && d.computedHistoryIndex > currentHistIdx)
		store.replayStep.index = nextIndex !== -1 ? nextIndex : maxIdx
	}

	// Bounds checking
	if (store.replayStep.index < 0) store.replayStep.index = 0
	if (store.replayStep.index > maxIdx) store.replayStep.index = maxIdx

	//funcs.importModel(store.replayData[store.replayStep], false, false)
	//funcs.simpleImportWholeRNBmodel(store.replayData[store.replayStep], true)
	goToReplayStep(store.replayStep.index)

	//history.setupHistoryHighlight(store.computedHistory[store.replayStep][0], store.computedHistory[store.replayStep][3], store.replayStep) // ADD STEP??
}

export function goToReplayStep(replayDataIndex) {
	const store = useModelStore()

	// Save the global index
	store.replayStep.index = replayDataIndex

	// Get the specific frame data
	const replayEntry = store.replayData[replayDataIndex]
	if (!replayEntry) {
		rf.doAdminAlrt(`goToReplayStep error: replayDataIndex: ${replayDataIndex} not found`)
		return
	}

	// Sync the display metadata so the UI knows where we are in the "original" history
	store.replayStep.computedHistoryIndex = replayEntry.computedHistoryIndex
	store.replayStep.subStep = replayEntry.stackNum
	store.replayStep.maxStep = replayEntry.maxStack

	funcs.simpleImportWholeRNBmodelNoCompression(replayEntry.importData, true)
	hd.calculateCanvasSize()

	//history.setupHistoryHighlight(store.computedHistory[store.replayStep][0], store.computedHistory[store.replayStep][3], store.replayStep) // ADD STEP???
}

export function getReplayEntry(computedHistoryIndexStep, subStep) {
	const store = useModelStore()
	let replayEntry = store.replayData.find((item) => item.computedHistoryIndex === computedHistoryIndexStep)
	if (!replayEntry.stackActionBoo) {
		store.replayStep.subStep = -1
		store.replayStep.maxStep = -1
	} else {
		if (subStep !== -1) {
			store.replayStep.subStep = subStep
			replayEntry = store.replayData.find((item) => item.computedHistoryIndex === computedHistoryIndexStep && item.stackNum === subStep)
			if (!replayEntry) {
				rf.doAdminAlrt(`getReplayEntry error: store.replayStep: ${JSON.stringify(store.replayStep)}, subStep: ${subStep} not found`)
				store.replayStep.subStep = 0
				subStep = 0
				replayEntry = store.replayData.find((item) => item.computedHistoryIndex === computedHistoryIndexStep && item.stackNum === subStep)
				if (!replayEntry) {
					rf.doAdminAlrt(`getReplayEntry Double replay error: store.replayStep: ${JSON.stringify(store.replayStep)}, subStep: ${subStep} not found`)
				}
			}
			store.replayStep.maxStep = replayEntry.maxStack
		} else {
			store.replayStep.subStep = 0
			store.replayStep.maxStep = replayEntry.maxStack
		}
	}
	return replayEntry
}

async function resetDataForReplay() {
	const store = useModelStore()
	const personal = usePersonalStore()

	// Reset Players
	for (let i = 0; i < store.players.length; i++) {
		store.players[i].RnD = [0, 0, 0, 0, 0, 0, 0, 0]
	}

	let mapData = funcs.exportMapOnly()

	// First, remove all items from the map
	store.ALL_TRANSPORTERS.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_HOME_MARKERS.splice(0)
	// Remove wonder bricks
	store.wonderBricks.splice(0)

	if (personal.soloGame) {
		store.wonderBricks = [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]
	}

	// Set the zoomPanel to -1
	store.mapData.zoomData.hexID = -1
	// Remove edgeData
	store.mapData.edgeData.splice(0)
	// Remove all hexes
	store.mapData.hexData.splice(0)

	funcs.importMapOnly(mapData, true)

	// Reset gameflow
	store.gameflow.turn = 1
	store.gameflow.turnOrder.splice(0)
	store.gameflow.fullTurnOrder.splice(0)

	for (let i = 0; i < store.players.length; i++) {
		store.gameflow.turnOrder.push(i)
		store.gameflow.fullTurnOrder.push(i)
	}
	store.gameflow.phase = rf.PHASE_CHOOSE_HOME_TILE
	// keep history
	context.resetContextAndHighlights()
}

export async function generateReplayData(spoilerFree = false) {
	const store = useModelStore()
	store.viewSettings.generatingReplay = true

	// First, copy the static data used in history
	store.ALL_BUILDINGS_HIST = JSON.parse(JSON.stringify(store.ALL_BUILDINGS))
	store.ALL_RESOURCES_HIST = JSON.parse(JSON.stringify(store.ALL_RESOURCES))
	store.ALL_TRANSPORTERS_HIST = JSON.parse(JSON.stringify(store.ALL_TRANSPORTERS))
	store.ALL_HOME_MARKERS_HIST = JSON.parse(JSON.stringify(store.ALL_HOME_MARKERS))

	// Because there are action stacks that we want to replay one by one, we need more info in each step
	/* esch step has:
  importData
  computedHistoryIndex
  stackActionTrue/False
  stackNum
  maxStack
  stackTitle
  */
	let replayData = []
	let progressBarCounter = 0
	let totalLength = store.computedHistory.length
	let lastYield = performance.now()
	for (let i = 0; i < store.computedHistory.length; i++) {
		if (store.computedHistory[i][0] === rf.HIST_STACK_ACTIONS) totalLength += store.computedHistory[i][3].length - 2
	}

	// Reset the data
	await resetDataForReplay()

	let pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")

	replayStopRequested = false

	for (let i = 0; i < store.computedHistory.length; i++) {
		if (replayStopRequested) break
		if (i !== 0) checkAndPerformTurnEnd(i - 1)

		/** THESE HAVE NO REPLAY YET -- BUT NOT ALL WILL NEED A REPLAY */
		/*
        export const HIST_NEW_GAME = 90 // only added in computed
        export const HIST_NEW_TURN = 0

		export const HIST_CONFLICT_PRAYING = 5
export const HIST_CONFLICT_TURN_ORDER = 6
	debugger
		*/
		let dataAlreadySaved = false
		if (store.computedHistory[i][0] === rf.HIST_NEW_TURN) replayNewTurn(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_NO_CONFLICT) replayNoConflict(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS) replayAddCustomScenarioElements(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_CHOOSE_HOME_TILE) replayChooseHomeTile(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_PRE_PRODUCTION) replayPreProduction(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_PRE_PRODUCTION_MINES) replayPreProductionMines(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_POST_PRODUCTION) replayPostProduction(i, store.computedHistory[i][1], store.computedHistory[i][3])
		// if it is a stack of actions, replay and save each one separately
		else if (store.computedHistory[i][0] === rf.HIST_STACK_ACTIONS) {
			const stackActions = store.computedHistory[i][3]
			store.gameflow.phase = stackActions[0]
			// First entry is the phase
			for (let j = 1; j < stackActions.length; j++) {
				if (replayStopRequested) break
				const stackAction = stackActions[j]
				if (!stackAction) {
					rf.doAdminAlrt(`Stack action is empty: ${stackAction}`)
					continue
				}
				/*
					OUTSTANDING STACK ACTIONS
					=========================
					*/

				if (stackAction[0] === rf.STACK_STRICT_PICKUP_RES) replayStackPickupRes(stackAction)
				else if (stackAction[0] === rf.STACK_MOVE_LAND) replayStackMoveLand(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_MOVE_WATER) replayStackMoveWater(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_DROP_RES_FOLLOWING) replayStackDropResFollowing(stackAction)
				else if (stackAction[0] === rf.STACK_STRICT_DROP_RES) replayStackDropRes(stackAction)
				else if (stackAction[0] === rf.STACK_STRICT_FERRY_RES) replayStackStrictFerryRes(stackAction)
				else if (stackAction[0] === rf.STACK_PICKUP_RES_TO_FOLLOW) replayStackPickupResToFollow(stackAction)
				else if (stackAction[0] === rf.STACK_PICKUP_TRANSPORTER) replayStackPickupTransporter(stackAction)
				else if (stackAction[0] === rf.STACK_DROP_TRANSPORTER) replayStackDropTransporter(stackAction)
				else if (stackAction[0] === rf.STACK_STEAL_RES) replayStackStealRes(stackAction)
				else if (stackAction[0] === rf.STACK_BUILD_ROAD) replayStackBuildRoad(stackAction)
				else if (stackAction[0] === rf.STACK_BUILD_POWER_LINE) replayStackBuildPowerLine(stackAction)
				else if (stackAction[0] === rf.STACK_BUILD_BRIDGE) replayStackBuildBridge(stackAction)
				else if (stackAction[0] === rf.STACK_BUILD_WALL) replayStackBuildWall(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_DEMOLISH_WALL) replayStackDemolishWall(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_BUILD_BUILDING) replayStackBuildBuilding(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_RESHAFT_MINE) replayStackReshaftMine(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_MANUAL_PRODUCTION) replayStackManualProduction(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY) replayStackRemoveExcessTransporterAtFactory(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_DO_RESEARCH) replayStackDoResearch(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_UPGRADE_BUILDING) replayStackUpgradeBuilding(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_DONKEY_REPRODUCTION) replayStackDonkeyReproduction(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_ADD_WONDER_BRICKS) replayStackaddWonderBricks(stackAction, store.computedHistory[i][1])
				else if (stackAction[0] === rf.STACK_EXHIBITION) replayStackExhibition(stackAction, store.computedHistory[i][1])
				// Now save the data as sub-entries
				replayData.push({
					importData: funcs.simpleExportWholeRNBmodelNoCompression(),
					computedHistoryIndex: i,
					stackActionBoo: true,
					stackNum: j - 1, // Ignore first idx, as thats just title
					maxStack: stackActions.length - 2, // final idx; ignore first
					//stackTitle: title,
				})
				dataAlreadySaved = true

				progressBarCounter++
				if (pBarEl != null && pBarTextEl != null && performance.now() - lastYield > 50) {
					let percent = (progressBarCounter / totalLength) * 100
					pBarEl.style.width = percent + "%"
					pBarTextEl.innerText = Math.round(percent) + "%"
					await new Promise((resolve) => requestAnimationFrame(resolve))
					lastYield = performance.now()
				}
			}
			// After processing the stack actions, drop any geese
			if (rf.PHASE_MOVEMENTS.includes(store.computedHistory[i][0])) {
				replayDropAllGeese(store.computedHistory[i][1])
			}
		}
		//replayData.push(funcs.exportModel(true))
		if (!dataAlreadySaved) {
			replayData.push({
				importData: funcs.simpleExportWholeRNBmodelNoCompression(),
				computedHistoryIndex: i,
				stackActionBoo: false,
				stackNum: -1,
				maxStack: -1,
				stackTitle: "",
			})

			progressBarCounter++
			if (pBarEl != null && pBarTextEl != null && performance.now() - lastYield > 50) {
				let percent = (progressBarCounter / totalLength) * 100
				pBarEl.style.width = percent + "%"
				pBarTextEl.innerText = Math.round(percent) + "%"
				await new Promise((resolve) => requestAnimationFrame(resolve))
				lastYield = performance.now()
			}
		}
	} // END generating replay

	store.replayData = replayData
	//store.replayStep.computedHistoryIndex = store.computedHistory.length - 1
	store.replayStep.computedHistoryIndex = 0

	if (spoilerFree) {
		if (window.initData.replayStep <= 0) store.replayStep.computedHistoryIndex = 0
		else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep.computedHistoryIndex = store.replayData.length - 1
		else store.replayStep.computedHistoryIndex = window.initData.replayStep
	}
	if (store.replayData.length > 0) store.viewSettings.showReplay = true
	goToReplayStep(store.replayStep.computedHistoryIndex)
	store.viewSettings.generatingReplay = false
}

/*** REPLAY FUNCTIONS HERE */
function replayNewTurn(_historyIndex, _playerIndex, _entry3) {
	const store = useModelStore()
	store.gameflow.turn++
	// Set phase to PROD CONF
	store.gameflow.phase = rf.PHASE_CONFLICT_PRODUCTION_DECISION
	wonder.addBrickToWonder_core(8, [])
}

function replayNoConflict(_historyIndex, _playerIndex, entry3) {
	const store = useModelStore()
	// Set phase already to the coming up MAIN phase
	store.gameflow.phase = entry3[0]
}

function replayAddCustomScenarioElements(_historyIndex, _playerIndex, entry3) {
	const store = useModelStore()
	for (let i = 0; i < entry3.length; i++) {
		const action = entry3[i][0]
		if (action === rf.CUSTOM_ADD_WALL) {
			map.addWallToMap_core(-1, entry3[i][1], entry3[i][2], entry3[i][3], false)
		} else if (action === rf.CUSTOM_ADD_RESOURCE) {
			for (const [resType, resLoc] of entry3[i].slice(1)) {
				const decompressedLocation = stack.decompressLocation(resLoc)
				model.addResourceToGame_core(resType, decompressedLocation, 9)
			}
		} else if (action === rf.CUSTOM_ADD_BUILDING) {
			for (const buildingEntry of entry3[i].slice(1)) {
				const buildingType = buildingEntry[0]
				const buildingLoc = buildingEntry[1]
				const decompressedLocation = stack.decompressLocation(buildingLoc)
				map.addBuildingToMap_core(buildingType, decompressedLocation, false, -1, -1, 9)
				if (buildingType === rf.BLDG_MINE && buildingEntry.length > 2) {
					let remainingMineContent = buildingEntry[2]
					if (remainingMineContent.length === 1) remainingMineContent.push(0)
					store.ALL_BUILDINGS[store.ALL_BUILDINGS.length - 1].remainingMineContent = [...remainingMineContent]
				}
			}
		} else if (action === rf.CUSTOM_ADD_TRANSPORTER) {
			for (const [transPlayerIndex, transporterType, transLocation] of entry3[i].slice(1)) {
				const decompressedLocation = stack.decompressLocation(transLocation)
				model.addTransporterToGame(transPlayerIndex, transporterType, decompressedLocation, true)
			}
		} else if (action === rf.CUSTOM_ALL_PLAYERS_PRE_RESEARCHED) {
			for (const playerObj of store.players) {
				for (const researchIdx of entry3[i][1]) {
					playerObj.RnD[researchIdx] = 1
				}
			}
		}
	}
}

function replayChooseHomeTile(_historyIndex, playerIndex, entry3) {
	const bucketLocation = stack.decompressLocation(entry3)
	const hexID = bucketLocation[1]
	const bucketID = bucketLocation[2]
	//const anyVertex = loc.getAnyVertexInHexIDbucketID(hexID, bucketID)
	model.setupStartTileForPlayerIndex_core(playerIndex, hexID, bucketID)
}

function replayPreProduction(_historyIndex, _playerIndex, entry3) {
	// ELECTRICITY: powered power plants are recorded FIRST in the primary production
	// entries ([bldgID, compressedLoc, fuelType, -3]). Restore their active state and
	// consume their fuel before replaying primaries so powered output doubles.
	let poweredPlants = 0
	for (const entry of entry3[0]) {
		const bldgObj = model.getBuildingByID(entry[0])
		if (!bldgObj || bldgObj.type !== rf.BLDG_POWER_PLANT) continue
		bldgObj.powerActive = true
		bldgObj.powerFuelType = entry[2]
		const bldgLocation = stack.decompressLocation(entry[1])
		const fuelResObj = model.getAllInGameResources().find((r) => r.type === entry[2] && loc.isBucketLocation(r.location) && r.location[1] === bldgLocation[1] && r.location[2] === bldgLocation[2])
		if (fuelResObj) fuelResObj.location = loc.setOOBlocation()
		poweredPlants++
	}
	if (poweredPlants > 0) electricity.computePoweredStateFromActivePlants()
	try {
		produce.doPrimaryProduction(true, entry3)
		produce.doAutoSecondaryProduction(true, true)
	} catch (error) {
		console.error("Error in replayPreProduction:", error)
		requestReplayStop("Error in replayPreProduction")
	}
}

function replayPreProductionMines(_historyIndex, _playerIndex, entry3) {
	// Powered plants are restored in replayPreProduction (their primary production
	// entries carry the fuel). Here we just pull mines.
	for (const entry of entry3) {
		const bldgID = entry[0]
		let outputRes = rf.RES_GOLD
		// Ignore the electricity -3 powered marker when reading the mine output
		if (entry.length >= 3 && entry[2] !== -3) outputRes = entry[2]
		// Force mine outputs if doing a replay
		produce.addBuildingOutputResourcesToGame_core(bldgID, outputRes, 9)
	}
}

function replayPostProduction(_historyIndex, _playerIndex, _entry3) {
	produce.doAutoSecondaryProduction(false, true)
	model.resetBuildingsAfterProduction()
	electricity.resetPowerState()
	// Make sure transporters have correct remaining moves before movement
	model.resetTransportersForNewTurn()
}

/**************************** STACK ACTION REPLAYS */
function replayStackPickupRes(stackAction) {
	const transporterID = stackAction[1]
	const resIDs = stackAction[2]
	//const transporterLocation = stackAction[3]
	for (const resID of resIDs) {
		let error = map.pickupRes_core(transporterID, resID)
		if (error === 9) {
			requestReplayStop("Error in replayPreProduction")
			break
		}
	}
}

function replayStackDropRes(stackAction) {
	const resIDs = stackAction[2]
	const dropLocation = stack.decompressLocation(stackAction[3])
	for (const resID of resIDs) map.dropResOnLocation_core(resID, dropLocation)
}

function replayStackStrictFerryRes(stackAction) {
	//const transporterID = stackAction[1]
	const resIDs = stackAction[2]
	const compressedDropLocation = stackAction[3]
	const dropLocation = stack.decompressLocation(compressedDropLocation)
	for (const resID of resIDs) map.dropResOnLocation_core(resID, dropLocation)
}

function replayStackStealRes(stackAction) {
	const transporterID = stackAction[1]
	//const otherTransporterID = stackAction[2]
	const resIDs = stackAction[3]
	//const transporterLocation = stackAction[4]
	for (const resID of resIDs) map.pickupRes_core(transporterID, resID)
}

function replayStackPickupResToFollow(stackAction) {
	const transporterID = stackAction[1]
	const resIDs = stackAction[2]
	//const transporterLocation = stackAction[3]
	for (const resID of resIDs) {
		const resObj = model.getResByID(resID)
		resObj.location = loc.setFollowerLocation(transporterID)
	}
}

function replayStackPickupTransporter(stackAction) {
	const pickingUpTransporterID = stackAction[1]
	const beingCarriedTransporterID = stackAction[2]
	//const pickingUpTransporterLocation = stackAction[3]
	map.loadTransporterOntoTransporter_core(pickingUpTransporterID, beingCarriedTransporterID)
}

function replayStackDropResFollowing(stackAction) {
	//const transporterID = stackAction[1]
	const resIDs = stackAction[2]

	const dropLocation = stack.decompressLocation(stackAction[3])
	//const transporterLocation = stackAction[3]
	for (const resID of resIDs) map.dropResOnLocation_core(resID, dropLocation)
}

function replayStackDropTransporter(stackAction) {
	//const carryingTransporterID = stackAction[1]
	const beingDroppedTransporterID = stackAction[2]
	const decompressedLocation = stack.decompressLocation(stackAction[3])
	const vertexLocation = loc.getVisualLocationFromBucketLocation(decompressedLocation)
	//let vertexLocation = [rf.LOCATION_LAND_VERTEX, fullBucketDropLocation[1], loc.getAnyVertexInHexIDbucketID(fullBucketDropLocation[1], fullBucketDropLocation[2])]
	//const hexObj = model.getHexByID(fullBucketDropLocation[1])
	//if (hexObj.baseTerrain === rf.TERR_SEA) vertexLocation[0] === rf.LOCATION_SEA_VERTEX
	//const transporterLocation = stackAction[3]
	map.dropTransporterOnLocation_core(beingDroppedTransporterID, vertexLocation)
}

function replayStackMoveLand(stackAction, playerIndex) {
	/*
		currentStack.push(rf.STACK_MOVE_LAND)
		currentStack.push(stack.getTransIDtoUse(transporterObj))
		currentStack.push([...compressedOldLocation])
		currentStack.push([...compressedNewLocation])
		// TRANSPORTER CONTENT
	*/
	const store = useModelStore()
	const movingTransporterID = stackAction[1]
	const toLocationBucket = stack.decompressLocation(stackAction[3])
	const geeseDropped = stackAction.length >= 6 && stackAction[5].length > 1 && stackAction[5][1] === 1
	const toHexID = toLocationBucket[1]
	const toBucket = toLocationBucket[2]

	//let toLocationFromStack = [rf.LOCATION_LAND_VERTEX, toHexID, toVertex]
	const transporterObj = model.getTransporterByID(movingTransporterID)
	let toLocationFinal = [rf.LOCATION_LAND_VERTEX, toHexID, loc.getAnyVertexInHexIDbucketID(toHexID, toBucket)]
	const toLocationForced = [...toLocationFinal]

	if (CHECK_EXTRA_DATA) {
		const contentData = stackAction[4]
		const transportersOnTrans = model.transportersOnTransporter(movingTransporterID)
		if (contentData.length > 0 && contentData[0] === -1) {
			if (transportersOnTrans.length === 0 || stack.getTransIDtoUse(transportersOnTrans[0]) !== contentData[1]) {
				rf.doAdminAlrt("=== replayStackMoveLand extra data mismatch (transporter on trans) ===")
				console.error("=== replayStackMoveLand extra data mismatch (transporter on trans) ===")
				console.error("stackAction:", JSON.stringify(stackAction))
				console.error("expected transporter:", contentData[1], "actual:", transportersOnTrans.length > 0 ? stack.getTransIDtoUse(transportersOnTrans[0]) : "none")
				requestReplayStop("Error in replayStackMoveLand")
			}
		} else {
			const actualResIDs = model
				.resourcesOnTransport(movingTransporterID)
				.map((r) => stack.getResIDtoUse(r))
				.sort()
			const expectedResIDs = [...contentData].sort()
			if (!util.arraysEqual(actualResIDs, expectedResIDs)) {
				rf.doAdminAlrt("=== replayStackMoveLand extra data mismatch (resources on trans) ===")
				console.error("=== replayStackMoveLand extra data mismatch (resources on trans) ===")
				console.error("stackAction:", JSON.stringify(stackAction))
				console.error("expected:", JSON.stringify(expectedResIDs), "actual:", JSON.stringify(actualResIDs))
				//requestReplayStop("Error in replayStackMoveLand")
			}
		}
		if (stackAction.length >= 6) {
			const actualGeeseCount = model.resourcesFollowingTransporter(movingTransporterID).length
			const expectedGeeseCount = stackAction[5][0] || 0
			if (actualGeeseCount !== expectedGeeseCount) {
				rf.doAdminAlrt("=== replayStackMoveLand extra data mismatch (geese following) ===")
				console.error("=== replayStackMoveLand extra data mismatch (geese following) ===")
				console.error("stackAction:", JSON.stringify(stackAction))
				console.error("expected geese count:", expectedGeeseCount, "actual:", actualGeeseCount)
				requestReplayStop("Error in replayStackMoveLand")
			}
		}
	}

	if (!FULL_REPLAY_CALCS) transporterObj.location = [...toLocationFinal]
	// Find reachable locations
	else {
		const stats = rf.getTransporterStats(transporterObj.type)
		const movementGraph = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, playerIndex)
		const pathfind = graph.pathfind(movementGraph, transporterObj.location, stats.validMove, transporterObj.remainingMoves)
		let indicesToValid = util.boolFilter(
			util.indexArray(pathfind.locations.length),
			pathfind.cost.map((cost) => cost > 0)
		)
		const transportersPerLocation = pathfind.locations.map((location) => model.getAllInGameTransporters().filter((a) => util.arraysEqual(a.location, location)).length)

		indicesToValid.sort((i, k) =>
			graph.sortTransporterMoveIndices(i, k, {
				pathfind,
				transportersPerLocation,
				loc,
				model,
			})
		)
		const validMoves = util.getByIndices(pathfind.locations, indicesToValid)
		toLocationFinal = validMoves.find((vMovLoc) => vMovLoc[1] === toHexID && loc.getBucketIDfromAnyHexIDandVertex(vMovLoc[1], vMovLoc[2]) === toBucket)
		if (!toLocationFinal) {
			console.error("=== replayStackMoveLand toLocationFinal is undefined ===")
			console.error("stackAction:", JSON.stringify(stackAction))
			console.error("playerIndex:", playerIndex)
			console.error("movingTransporterID:", movingTransporterID)
			console.error("transporterObj:", JSON.stringify(transporterObj))
			console.error("from location:", JSON.stringify(transporterObj.location))
			console.error("remainingMoves:", transporterObj.remainingMoves)
			console.error("toHexID:", toHexID, "toBucket:", toBucket, "geeseDropped:", geeseDropped)
			console.error("pathfind.locations.length:", pathfind.locations.length)
			console.error("pathfind.locations:", JSON.stringify(pathfind.locations))
			console.error("pathfind.cost:", JSON.stringify(pathfind.cost))
			console.error("indicesToValid:", JSON.stringify(indicesToValid))
			console.error("validMoves:", JSON.stringify(validMoves))
			console.error("transportersPerLocation:", JSON.stringify(transportersPerLocation))
			console.error("=== END replayStackMoveLand debug ===")
			rf.doAdminAlrt("Stk Land move Error")
			toLocationFinal = [...toLocationForced]
		}
		transporterObj.location = [...toLocationFinal]
	}
	const transporterStats = rf.getTransporterStats(transporterObj.type)
	let newPos = map.getTransporterPositionFromLocation(toLocationFinal, transporterStats, movingTransporterID)
	transporterObj.rawTransporterXY = newPos

	// Update all resources FOLLOWING the transporter to indicate they've been moved
	let resourcesFollowingTransporter = model.resourcesFollowingTransporter(transporterObj.id)
	for (let i = 0; i < resourcesFollowingTransporter.length; i++) {
		resourcesFollowingTransporter[i].movedTransporterID = transporterObj.id
		// If geese were dropped, then drop them
		if (geeseDropped) resourcesFollowingTransporter[i].location = [...toLocationBucket]
	}

	// Update all resource on the transporter to indicate they've been moved
	let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id)
	for (let i = 0; i < resourcesOnTransporter.length; i++) {
		resourcesOnTransporter[i].movedTransporterID = transporterObj.id
	}
}

function replayStackMoveWater(stackAction, playerIndex) {
	const movingTransporterID = stackAction[1]
	//const fromLocation = stackAction[2]
	const toLocationBucket = stack.decompressWaterLocation(stackAction[3])
	//const contentIDs = stackAction[4]
	//let numGeeseFollowing = 0
	//if (stackAction.length >= 6) numGeeseFollowing = stackAction[5]

	const transporterObj = model.getTransporterByID(movingTransporterID)
	// Find valid destination (handles docked, sea, and river)
	const result = graph.findValidWaterDestination(toLocationBucket, transporterObj, playerIndex)

	if (CHECK_EXTRA_DATA) {
		const contentData = stackAction[4]
		const transportersOnTrans = model.transportersOnTransporter(movingTransporterID)
		if (contentData.length > 0 && contentData[0] === -1) {
			if (transportersOnTrans.length === 0 || stack.getTransIDtoUse(transportersOnTrans[0]) !== contentData[1]) {
				rf.doAdminAlrt("=== replayStackMoveWater extra data mismatch (transporter on trans) ===")
				console.error("=== replayStackMoveWater extra data mismatch (transporter on trans) ===")
				console.error("stackAction:", JSON.stringify(stackAction))
				console.error("expected transporter:", contentData[1], "actual:", transportersOnTrans.length > 0 ? stack.getTransIDtoUse(transportersOnTrans[0]) : "none")
				requestReplayStop("replayStackMoveWater")
			}
		} else {
			const actualResIDs = model
				.resourcesOnTransport(movingTransporterID)
				.map((r) => stack.getResIDtoUse(r))
				.sort()
			const expectedResIDs = [...contentData].sort()
			if (!util.arraysEqual(actualResIDs, expectedResIDs)) {
				rf.doAdminAlrt("=== replayStackMoveWater extra data mismatch (resources on trans) ===")
				console.error("=== replayStackMoveWater extra data mismatch (resources on trans) ===")
				console.error("stackAction:", JSON.stringify(stackAction))
				console.error("expected:", JSON.stringify(expectedResIDs), "actual:", JSON.stringify(actualResIDs))
				requestReplayStop("replayStackMoveWater")
			}
		}
		if (stackAction.length >= 6) {
			const actualGeeseCount = model.resourcesFollowingTransporter(movingTransporterID).length
			const expectedGeeseCount = stackAction[5][0] || 0
			if (actualGeeseCount !== expectedGeeseCount) {
				rf.doAdminAlrt("=== replayStackMoveWater extra data mismatch (geese following) ===")
				console.error("=== replayStackMoveWater extra data mismatch (geese following) ===")
				console.error("stackAction:", JSON.stringify(stackAction))
				console.error("expected geese count:", expectedGeeseCount, "actual:", actualGeeseCount)
				requestReplayStop("replayStackMoveWater")
			}
		}
	}

	if (!result) {
		console.error("=== replayStackMoveWater debug ===")
		console.error(`playerIndex: ${playerIndex}`)
		console.error(`stackAction: ${JSON.stringify(stackAction)}`)
		console.error(`movingTransporterID: ${movingTransporterID}`)
		console.error(`toLocationBucket: ${JSON.stringify(toLocationBucket)}`)
		console.error(`transporterObj: ${JSON.stringify(transporterObj)}`)
		rf.doAdminAlrt("replayStackMoveWater: No valid water destination found")
		return
	}
	const toLocation = result.location
	const cost = result.cost
	transporterObj.remainingMoves -= cost
	if (loc.isDockedLocation(toLocation)) transporterObj.remainingMoves = 0
	transporterObj.location = toLocation
	const transporterStats = rf.getTransporterStats(transporterObj.type)
	// Update the rawXY so any BEING CARRIED transporter displays correctly
	let newPos = map.getTransporterPositionFromLocation(toLocation, transporterStats, movingTransporterID)
	transporterObj.rawTransporterXY = newPos

	// Update any geese following
	let geeseDropLocation = []

	let numGeeseFollowing = 0
	if (stackAction.length >= 6) {
		numGeeseFollowing = stackAction[5][0]
		if (stackAction[5].length >= 2) {
			if (stackAction[5][1] !== 1) geeseDropLocation = [...stackAction[5][1]]
			else geeseDropLocation = [...toLocation]
		}
	}
	if (numGeeseFollowing > 0 && geeseDropLocation.length > 0) {
		const followingResources = model.resourcesFollowingTransporter(transporterObj.id)
		for (const res of followingResources) {
			res.location = [...geeseDropLocation]
		}
	}
}

// BUILDING STACK
function replayStackBuildRoad(stackAction) {
	const transporterID = stackAction[1]
	const fromLocation = stack.decompressLocation(stackAction[2])
	const toLocation = stack.decompressLocation(stackAction[3])
	const fromHexID = fromLocation[1]
	const fromBucketID = fromLocation[2]
	const toHexID = toLocation[1]
	const toBucketID = toLocation[2]
	map.addRoadToMap_core([fromHexID, fromBucketID], [toHexID, toBucketID], transporterID, true)
}

function replayStackBuildPowerLine(stackAction) {
	const transporterID = stackAction[1]
	const fromLocation = stack.decompressLocation(stackAction[2])
	const toLocation = stack.decompressLocation(stackAction[3])
	const fromHexID = fromLocation[1]
	const fromBucketID = fromLocation[2]
	const toHexID = toLocation[1]
	const toBucketID = toLocation[2]
	map.addPowerLineToMap_core([fromHexID, fromBucketID], [toHexID, toBucketID], transporterID, true)
}

function replayStackBuildBridge(stackAction) {
	const transporterID = stackAction[1]
	const hexID = stackAction[2]
	const hexObj = model.getHexByID(hexID)
	let bridgeArr = hexObj.bridges[0]
	if (stackAction.length > 3) {
		bridgeArr = hexObj.bridges[stackAction[3]]
	}

	map.addBridgeToMap_core(hexID, transporterID, bridgeArr, true)
}

function replayStackBuildWall(stackAction, playerIndex) {
	const transporterID = stackAction[1]
	const fromHexID = stackAction[2]
	const toHexID = stackAction[3]
	//export function addWallToMap_core(hex1ID, hex2ID, transporterID, deductResources) {
	map.addWallToMap_core(transporterID, fromHexID, toHexID, playerIndex, true)
}

function replayStackDemolishWall(stackAction, playerIndex) {
	const transporterID = stackAction[1]
	const fromHexID = stackAction[2]
	const toHexID = stackAction[3]
	//export function addWallToMap_core(hex1ID, hex2ID, transporterID, deductResources) {
	map.addWallToMap_core(transporterID, fromHexID, toHexID, playerIndex, true)
}

function replayStackBuildBuilding(stackAction, playerIndex) {
	const transporterID = stackAction[1]
	const buildingType = stackAction[2]
	const compressedLocation = stackAction[3]
	const fullLocation = stack.decompressLocation(compressedLocation)
	let mineSelectionType = 0
	if (stackAction.length > 4) mineSelectionType = stackAction[4]
	let errorFound = map.addBuildingToMap_core(buildingType, fullLocation, true, transporterID, mineSelectionType, playerIndex)
	if (errorFound === 9) {
		requestReplayStop("replayStackBuildBuilding errorFound === 9")
	}
}

function replayStackReshaftMine(stackAction) {
	const transporterID = stackAction[1]
	const mineID = stackAction[2]
	const mineObj = model.getBuildingByID(mineID)
	let newMineContent = [3, 3]
	if (stackAction.length > 4) {
		const mineType = stackAction[4]
		if (mineType === rf.MINE_IRON) newMineContent = [0, 4]
		else if (mineType === rf.MINE_GOLD) newMineContent = [4, 0]
		else if (mineType === rf.MINE_BIG) newMineContent = [5, 5]
	}
	let reshafthResources = [rf.RES_FUEL, rf.RES_IRON]
	model.removeResourcesFromGameUsingTransporter(transporterID, reshafthResources, false)

	mineObj.remainingMineContent[0] += newMineContent[0]
	mineObj.remainingMineContent[1] += newMineContent[1]
}

function replayStackManualProduction(stackAction, playerIndex) {
	// 	let stackAction = [rf.STACK_MANUAL_PRODUCTION, building.id, transporterID, [...stackLocation]]
	const buildingID = stackAction[1]
	const transporterID = stackAction[2]
	const compressedBuildingLocation = stackAction[3]
	const buildingLocation = stack.decompressLocation(compressedBuildingLocation)
	//const hexID = buildingLocation[1]
	const bucketID = buildingLocation[2]
	if (!bucketID && bucketID !== 0) rf.doAdminAlrt(`bucket error buildingLocation: ${buildingLocation}`)
	//const buildingVertex = loc.getAnyVertexInHexIDbucketID(hexID, bucketID)
	let transporterOutputBucketlocation = [...buildingLocation]
	const bldgObj = model.getBuildingByID(buildingID)
	const buildingType = bldgObj.type
	const bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)
	let inputResIdx = 0
	let removedTransporterID = -1
	if (rf.ALL_WATER_TRANSPORTER_BUILDINGS.includes(buildingType) && stackAction.length > 4) {
		const compressedTransporterOutputlocation = stackAction[4]
		transporterOutputBucketlocation = stack.decompressWaterLocation(compressedTransporterOutputlocation, true)
		//transporterOutputlocation = [...transporterOutputlocationFull]
		//transporterOutputlocation = loc.getVisualLocationFromBucketLocation(transporterOutputlocationFull)
	} else if (stackAction.length > 4 && buildingType === rf.BLDG_WAGON_FACTORY) removedTransporterID = stackAction[4]
	// Art & The Atelier: the recipe index is always the last element (the caravan
	// recipe also records the removed donkey transporter before it)
	else if (stackAction.length > 4 && buildingType === rf.BLDG_ATELIER) inputResIdx = stackAction[stackAction.length - 1]
	else if (stackAction.length > 4) inputResIdx = stackAction[4]
	const inputRes = bldgStats.inputRes[inputResIdx]
	if (CHECK_EXTRA_DATA) {
		const simulateRes = model.removeResourcesFromGameUsingTransporter(transporterID, inputRes, true)
		if (simulateRes !== 0) {
			rf.doAdminAlrt("=== replayStackManualProduction extra data mismatch (unable to find resources) ===")
			rf.doAdminConsolLg("=== replayStackManualProduction extra data mismatch (unable to find resources) ===")
			rf.doAdminConsolLg("stackAction:", JSON.stringify(stackAction))
			rf.doAdminConsolLg("transporterID:", transporterID, "inputRes:", inputRes)
			requestReplayStop("Error in replayStackManualProduction")
			return
		}
	}
	// remove input res
	model.removeResourcesFromGameUsingTransporter(transporterID, inputRes, false)
	// Art & The Atelier: the caravan recipe consumes the selected donkey
	if (buildingType === rf.BLDG_ATELIER && atelier.getRecipeOutput(inputResIdx) > rf.RES_UPPER_LIMIT) removedTransporterID = transporterID
	// if it's a wagon factory, remove a donkey
	// Remove any input transp
	if (removedTransporterID >= 0) model.removeTransporterIDfromGame(removedTransporterID)
	// Art & The Atelier: restore the recipe output for an atelier
	const atelierOutput = buildingType === rf.BLDG_ATELIER ? atelier.getRecipeOutput(inputResIdx) : -1
	store.context.atelierRecipeOutput = atelierOutput
	// add output res
	produce.addBuildingOutputResourcesToGame_core(buildingID, -1, playerIndex)
	// But if the output is a transporter, add it here
	const outputTransporter = buildingType === rf.BLDG_ATELIER ? atelierOutput : bldgStats.outputRes.length === 1 && bldgStats.outputRes[0] > rf.RES_UPPER_LIMIT ? bldgStats.outputRes[0] : -1
	if (outputTransporter > rf.RES_UPPER_LIMIT) {
		model.addTransporterToGame(playerIndex, outputTransporter, transporterOutputBucketlocation, true)
	}
	store.context.atelierRecipeOutput = -1
	bldgObj.remainingConversions--
}

function replayStackRemoveExcessTransporterAtFactory(stackAction, _playerIndex) {
	const transporterID = stackAction[1]
	model.removeTransporterIDfromGame(transporterID)
}

// Art & The Atelier: replay an exhibition show (caravan + artwork vanish, counters update)
function replayStackExhibition(stackAction, _playerIndex) {
	atelier.performExhibitionStackAction(stackAction)
}

function replayStackDoResearch(stackAction, playerIndex) {
	const store = useModelStore()
	const transporterID = stackAction[1]
	const RND_IDX = stackAction[2]
	let geeseUsed = 2
	if (stackAction.length > 4) {
		geeseUsed = stackAction[4]
	}
	let researchResources = [rf.RES_GOOSE, rf.RES_PAPER]
	if (geeseUsed !== 1) researchResources.push(rf.RES_GOOSE)
	model.removeResourcesFromGameUsingTransporter(transporterID, researchResources, false)
	store.players[playerIndex].RnD[RND_IDX] = 1
}

function replayStackUpgradeBuilding(stackAction, playerIndex) {
	const oldBuildingID = stackAction[1]
	const newBuildingType = stackAction[2]
	const compressedLocation = stackAction[3]
	const fullLocation = stack.decompressLocation(compressedLocation)
	// remove the old building
	model.removeBuildingByID(oldBuildingID)
	// add the new building
	map.addBuildingToMap_core(newBuildingType, fullLocation, false, -1, -1, playerIndex)
}

function replayStackDonkeyReproduction(stackAction, playerIndex) {
	const donkeyEntries = stackAction.slice(1)
	for (const entry of donkeyEntries) {
		const donkeyLocation = entry[0]
		// IF trans ID is removed, it is added after the location
		if (entry.length > 1) model.removeTransporterIDfromGame(entry[1])

		const fullLocation = stack.decompressLocation(donkeyLocation)
		model.addTransporterToGame(playerIndex, rf.DONKEY, fullLocation, true)
	}
}

function replayStackaddWonderBricks(stackAction, playerIndex) {
	const bricks = stackAction.slice(1)
	for (const brick of bricks) {
		wonder.addBrickToWonder_core(playerIndex, brick)
	}
}

function replayDropAllGeese(playerIndex) {
	const store = useModelStore()

	const playerTransportersOnMap = model
		.getAllInGameTransporters()
		.filter((transporter) => model.transporterIsOnMap(transporter) && transporter.ownerIndex === playerIndex)
		.map((a) => [a.id, a.location])

	let resourcesFollowingTransporters = []
	for (let i = 0; i < playerTransportersOnMap.length; i++) {
		resourcesFollowingTransporters = resourcesFollowingTransporters.concat(model.resourcesFollowingTransporter(playerTransportersOnMap[i][0]))
	}

	for (let i = 0; i < resourcesFollowingTransporters.length; i++) {
		let resObj = resourcesFollowingTransporters[i]
		const followedTransporterID = resObj.location[1]
		const followedTransporterLocation = playerTransportersOnMap.find((t) => t[0] === followedTransporterID)[1]
		const followedTransporterHexID = followedTransporterLocation[1]

		// Firstly, can only drop on sea IF there's an oil rig. In which case, the only bucket is 0
		if (loc.isSeaVertexLocation(followedTransporterLocation) && !map.hasOilRigOnHexID(followedTransporterHexID)) {
			let clientX = event ? event.clientX : window.innerWidth / 2
			let clientY = event ? event.clientY : window.innerHeight / 2
			let htmlMessage = "Geese cannot end<br/>turn at sea<br/>following transporter"
			model.showPopup("error", clientX, clientY, htmlMessage)
			store.context.errorUnableToDropGeeseAtSea = true
			rf.doAdminAlrt("Dropping geese on sea during replay")
			return
		}
		// Now we know there is an oil rig, so drop in bucket 0
		else if (loc.isSeaVertexLocation(followedTransporterLocation) && map.hasOilRigOnHexID(followedTransporterHexID)) {
			resObj.location = loc.setBucketLocation(followedTransporterHexID, 0)
		}
		// On land, convert the transporters location to a bucket, and drop it in that
		else if (loc.isLandVertexLocation(followedTransporterLocation)) {
			const bucketID = loc.getBucketIDfromAnyHexIDandVertex(followedTransporterHexID, followedTransporterLocation[2])
			resObj.location = loc.setBucketLocation(followedTransporterHexID, bucketID)
		}
		// NB Docking sets movement to 0 so SHOULD have already dropped the geese
		// TODO; tidy this up - BUT THIS SHOULD NEVER BE RUN ANYWAY
		else if (loc.isDockedLocation(followedTransporterLocation)) {
			const eligibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(followedTransporterLocation, false)
			// Find the first bucket location
			const bucketLocation = eligibleLocations.find((loc) => loc[0] === rf.LOCATION_BUCKET)
			resObj.location = bucketLocation
		}
	}
}

/********************************** END STACK REPLAY */

function checkAndPerformTurnEnd(historyIndex) {
	// NOTE: THis IS THE HISTORY INDEX THAT ALREADY HAPPEND
	// SO NEED TO REDUCE TO THE PREVIOUS MENINGFUL ENTRY
	const store = useModelStore()
	if (store.computedHistory[historyIndex][0] === rf.HIST_STACK_ACTIONS) {
		if (store.computedHistory[historyIndex][3][0] === rf.PHASE_MOVEMENT_TO) {
			model.dropAllGeeseForPlayerIndex(store.computedHistory[historyIndex][1])
		}
	}

	/*
	let currentAction = store.history[historyIndex][0]

	// Ignore player trades, as they won't ever end a turn or player (which is done by city build)
	let entriesToIgnore = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT]
	if (entriesToIgnore.includes(currentAction)) return // NOTHING

	let currentPlayerIndex = store.history[historyIndex][1]

	historyIndex--
	while (entriesToIgnore.includes(store.history[historyIndex][0]) && historyIndex > 0) historyIndex--
	// Don't end the first turn before it has begun

	//let previousPlayerIndex = store.history[historyIndex][1]
	let previousAction = store.history[historyIndex][0]

	if (historyIndex === 0 && entriesToIgnore.includes(previousAction)) return //NOTHING

	if (previousAction === rf.HIST_NEW_TURN) return // NOTHING

	let changeOfPlayer = false
	if (store.gameflow.turnOrder[0] !== -1 && store.gameflow.turnOrder[0] !== currentPlayerIndex) changeOfPlayer = true

	// If there has been a change of player
	if (changeOfPlayer) {
		// This should work, as city build simul history is generated in player turn order
		store.gameflow.turnOrder.shift()

		// Instead of shift, use this to allow for simul turns
		//	const indexToRemove = store.gameflow.turnOrder.indexOf(currentPlayerIndex)
		//	// Check if the integer is present in the array before removing
		//	if (indexToRemove !== -1) {
		//		// Remove the integer from the array
		//		store.gameflow.turnOrder.splice(indexToRemove, 1)
		//	}

		if (store.gameflow.turnOrder.length === 0) {
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			if (store.gameflow.phase === rf.PHASE_FIRST_CITY) {
				store.gameflow.turnOrder.reverse()
				store.gameflow.fullTurnOrder = [...store.gameflow.turnOrder]
				store.gameflow.phase = rf.PHASE_CITY_BUILDING
			}
		}
	}
	//return NOTHING
	*/
}
