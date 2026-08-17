<script setup>
import * as rf from "../../js/RNBreference"
import * as funcs from "../../js/RNBfuncs"
import * as view from "../../js/RNBview"
import * as history from "./RNBhistory"
import * as model from "../../js/RNBmodel.js"
import * as loc from "../../js/RNBlocation"
import * as stack from "../../js/RNBstack"
//import * as map from "../../js/RNBmap"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"
import MiniHex from "../Utils/MiniHex.vue"

const props = defineProps({
	entry: {
		type: Array,
		required: true,
	},
	entry_ID: {
		type: Number,
		default: -1,
	},
	singleStackEntryID: {
		type: Number,
		required: false,
		default: -1,
	},
})

function getRewindName(num) {
	if (num >= 0) return store.players[num].name
	return "admin"
}

function clickedHistoryEntry(action, entry3, computedEntry3, entry_id) {
	// If not replay, or if clicking on the replay entry, just do highlights
	if (!store.viewSettings.showReplay || entry_id === -1) history.setupHistoryHighlight(action, entry3, computedEntry3, entry_id)
	// Otherwise, you are clicking in history during replay
	//else history.goToReplayStep(entry_id)
}

function clickedStackEntry(action, hexPiecesToHighlight = [], riversToHighlight = [], shoresToHighlight = [], halfShoresToHighlight = [], bridgeHighlight = [], wallsToHighlight = [], buildingsToHighlight = []) {
	if (!store.viewSettings.showReplay) history.setupStackHistoryHighlight(action, hexPiecesToHighlight, riversToHighlight, shoresToHighlight, halfShoresToHighlight, bridgeHighlight, wallsToHighlight, buildingsToHighlight)
}

function getHighlightData(locations) {
	let data = {
		hexID: -1,
		bucketId: -1,
		riverID: -1,
		hexPiecesToHighlight: [],
		hexPiecesToOutline: [],
		riversToOutline: [],
		riversToHighlight: [],
		shoresToOutline: [],
		shoresToHighlight: [],
		halfShoresToOutline: [],
		halfShoresToHighlight: [],
	}
	for (const singleLoc of locations) {
		if (loc.isBucketLocation(singleLoc)) {
			const hexID = singleLoc[1]
			const bucketID = singleLoc[2]
			data.hexID = hexID
			data.bucketId = bucketID
			data.hexPiecesToHighlight.push([hexID, [bucketID]])
			data.hexPiecesToOutline.push([hexID, [bucketID]])
		}
		if (loc.isLandVertexLocation(singleLoc)) {
			const hexID = singleLoc[1]
			const vertex = singleLoc[2]
			const bucketId = loc.getBucketIDfromAnyHexIDandVertex(hexID, vertex)

			data.hexID = hexID
			data.bucketId = bucketId
			data.hexPiecesToHighlight.push([hexID, [bucketId]])
			data.hexPiecesToOutline.push([hexID, [bucketId]])
		} else if (loc.isSeaVertexLocation(singleLoc)) {
			const hexID = singleLoc[1]
			const vertex = singleLoc[2]
			const bucketId = loc.getBucketIDfromAnyHexIDandVertex(hexID, vertex)

			data.hexID = hexID
			data.bucketId = bucketId
			data.hexPiecesToHighlight.push([hexID, [bucketId]])
			data.hexPiecesToOutline.push([hexID, [bucketId]])
		} else if (loc.isRiverBucketLocation(singleLoc)) {
			const hexID = singleLoc[1]
			const riverID = singleLoc[2]

			data.hexID = hexID
			data.riverID = riverID
			data.riversToOutline.push([hexID, riverID])
			data.riversToHighlight.push([hexID, riverID])
		} else if (loc.isRiverVertexLocation(singleLoc)) {
			const hexID = singleLoc[1]
			const riverVertex = singleLoc[2]
			const riverID = loc.getRiverIDfromAnyHexIDandRiverVertex(hexID, riverVertex)

			data.hexID = hexID
			data.riverID = riverID
			data.riversToOutline.push([hexID, riverID])
			data.riversToHighlight.push([hexID, riverID])
		} else if (loc.isDockedLocation(singleLoc)) {
			const hexID = singleLoc[1]
			const side = singleLoc[2]
			const bank = singleLoc[3]
			// NEED [hexID, side]
			data.hexID = hexID
			if (bank === rf.BANK_NONE) {
				data.shoresToOutline.push([hexID, side])
				data.shoresToHighlight.push([hexID, side])
			} else {
				// NEED [hexID, [vertex. side]]
				const vertex = bank === rf.BANK_LEFT ? side : (side + 1) % 6
				data.halfShoresToOutline.push([hexID, [vertex, side]])
				data.halfShoresToHighlight.push([hexID, [vertex, side]])
			}
		}
	}

	return data
}

const computedEntry3 = computed(() => {
	let ret = {}
	let entry = props.entry

	if (entry[0] === rf.HIST_CHOOSE_HOME_TILE) {
		const compressedLocation = entry[3]
		const bucketLocation = stack.decompressLocation(compressedLocation)
		const hexID = bucketLocation[1]
		Object.assign(ret, getHighlightData([bucketLocation]))
		ret.hexID = hexID
		ret.transporterGfxs = []
		ret.resGfxs = []
		ret.homeTileGfx = "home_" + personal.getCorrectedColour(store.players[entry[1]].colour)
		// Add the items
		// 3 donkey
		for (let i = 0; i < 3; i++) ret.transporterGfxs.push("transporter_" + String(rf.DONKEY) + "_" + personal.getCorrectedColour(store.players[entry[1]].colour))
		// 5 boards
		for (let i = 0; i < 5; i++) ret.resGfxs.push("res_" + rf.RES_BOARDS)
		// 1 stone
		ret.resGfxs.push("res_" + rf.RES_STONE)
		// 2 geese
		for (let i = 0; i < 2; i++) ret.resGfxs.push("res_" + rf.RES_GOOSE)
	} else if (entry[0] === rf.HIST_PRE_PRODUCTION_MINES) {
		// NOTE: IN A DEPARTURE FROM THE NORM, THIS DOESN'T NEED TO RECREATE ANY REPLAY STUFF
		// IN THE REPLAY, JUST RUN THE PRODUCTION FUNCTIONS AGAIN, AND YOU SHOULD GET THE SAME RESULT
		// The param has 3 sub arrays; [pri], [geese], [sec]
		// prim is just [bldg, loc]
		ret.primaryProductions = []
		// Primary Productions
		for (let i = 0; i < entry[3].length; i++) {
			const priHistEntry = entry[3][i]
			let priEntry = {}
			const buildingID = priHistEntry[0]
			const compressedLocation = priHistEntry[1]
			const fullLocation = stack.decompressLocation(compressedLocation)
			const buildingHexID = fullLocation[1]
			priEntry.buildingHexID = buildingHexID
			const bldg = history.getBuildingByID_HIST(buildingID)
			const buildingType = bldg.type
			priEntry.bldgGfx = "bldg_" + String(buildingType)
			//ret.hexIDSandVertexesToHighlight.push(buildingLoc)
			priEntry.outputResourcesGfx = []
			let outputRes = rf.RES_GOLD
			if (priHistEntry.length > 2) outputRes = priHistEntry[2]
			if (outputRes !== 0) priEntry.outputResourcesGfx.push("res_" + String(outputRes))

			Object.assign(priEntry, getHighlightData([fullLocation]))
			priEntry.isMine = true
			ret.primaryProductions.push(priEntry)
		}
	} else if (entry[0] === rf.HIST_PRE_PRODUCTION) {
		// NOTE: IN A DEPARTURE FROM THE NORM, THIS DOESN'T NEED TO RECREATE ANY REPLAY STUFF
		// IN THE REPLAY, JUST RUN THE PRODUCTION FUNCTIONS AGAIN, AND YOU SHOULD GET THE SAME RESULT
		// The param has 3 sub arrays; [pri], [geese], [sec]
		// prim is just [bldg, loc]
		// geese is just an array of locations where they produced
		// sec is [bldg, loc], but also includes [inputRes] if it's a papermill or coal burner and input wasn't TRUNKS/TRUNKS
		ret.primaryProductions = []
		ret.totalGeeseReproduction = 0
		ret.geeseReproductionData = []
		ret.secondaryProductions = []
		// Primary Productions
		for (let i = 0; i < entry[3][0].length; i++) {
			const priHistEntry = entry[3][0][i]
			let priEntry = {}
			const buildingID = priHistEntry[0]
			const compressedLocation = priHistEntry[1]
			const fullLocation = stack.decompressLocation(compressedLocation)
			const buildingHexID = fullLocation[1]
			priEntry.buildingHexID = buildingHexID
			const bldg = history.getBuildingByID_HIST(buildingID)
			const buildingType = bldg.type
			let bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)
			priEntry.bldgGfx = "bldg_" + String(buildingType)
			//ret.hexIDSandVertexesToHighlight.push(buildingLoc)
			priEntry.outputResourcesGfx = []
			if (bldg.type === rf.BLDG_MINE) {
				let outputRes = rf.RES_GOLD
				if (priHistEntry.length > 2) outputRes = priHistEntry[2]
				if (outputRes !== 0) priEntry.outputResourcesGfx.push("res_" + String(outputRes))
			} else {
				for (let j = 0; j < bldgStats.outputRes.length; j++) {
					priEntry.outputResourcesGfx.push("res_" + String(bldgStats.outputRes[j]))
				}
			}
			Object.assign(priEntry, getHighlightData([fullLocation]))
			priEntry.isMine = buildingType === rf.BLDG_MINE
			ret.primaryProductions.push(priEntry)
		}
		ret.totalGeeseReproduction = entry[3][1].length
		for (let i = 0; i < entry[3][1].length; i++) {
			const compressedLocatoin = entry[3][1][i]
			const fullLocation = stack.decompressLocation(compressedLocatoin)
			ret.geeseReproductionData.push({
				location: fullLocation,
				hexID: fullLocation[1],
				highlightData: {},
			})
			Object.assign(ret.geeseReproductionData[i], getHighlightData([fullLocation]))
			//ret.hexIDSandVertexesToHighlight.push(entry[3][1][i])
		}
		// Secondary Productions
		for (let i = 0; i < entry[3][2].length; i++) {
			const secHistEntry = entry[3][2][i]
			const buildingID = secHistEntry[0]
			const compressedLoc = secHistEntry[1]
			const fullLocation = stack.decompressLocation(compressedLoc)
			const buildingHexID = fullLocation[1]
			const bldg = history.getBuildingByID_HIST(buildingID)
			const buildingType = bldg.type
			let secEntry = {}
			secEntry.buildingHexID = buildingHexID
			let bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)
			secEntry.bldgGfx = "bldg_" + String(buildingType)
			//ret.hexIDSandVertexesToHighlight.push(buildingLoc)
			secEntry.inputResourcesGfx = []
			secEntry.outputResourcesGfx = []
			// If len = 2, no input res was recorded. So must be default
			if (secHistEntry.length === 2) {
				for (let j = 0; j < bldgStats.inputRes[0].length; j++) {
					secEntry.inputResourcesGfx.push("res_" + String(bldgStats.inputRes[0][j]))
				}
			} else {
				for (let j = 0; j < secHistEntry[2].length; j++) {
					secEntry.inputResourcesGfx.push("res_" + String(secHistEntry[2][j]))
				}
			}

			for (let j = 0; j < bldgStats.outputRes.length; j++) {
				// If it's a res, it's produced
				if (bldgStats.outputRes[j] < rf.RES_UPPER_LIMIT) secEntry.outputResourcesGfx.push("res_" + String(bldgStats.outputRes[j]))
				// Otherwise, the transporter is lost
				else secEntry.outputResourcesGfx.push("res_blank")
			}
			//secEntry.hexPiecesToOutline = [[buildingHexID, [bucketId]]]
			ret.secondaryProductions.push(secEntry)
		}
	} else if (entry[0] === rf.HIST_POST_PRODUCTION) {
		// NOTE: IN A DEPARTURE FROM THE NORM, THIS DOESN'T NEED TO RECREATE ANY REPLAY STUFF
		// IN THE REPLAY, JUST RUN THE PRODUCTION FUNCTIONS AGAIN, AND YOU SHOULD GET THE SAME RESULT
		// The param has just subarr's of sec
		// sec is [bldg, loc], but also includes [inputRes] if it's a papermill or coal burner and input wasn't TRUNKS/TRUNKS
		ret.secondaryProductions = []
		ret.metaResearchEntries = []
		//ret.hexIDSandVertexesToHighlight = []
		// Secondary Productions
		let allLocs = []
		for (let i = 0; i < entry[3][0].length; i++) {
			const secHistEntry = entry[3][0][i]
			const buildingID = secHistEntry[0]
			const compressedBuildingLoc = secHistEntry[1]
			const buildingLoc = stack.decompressLocation(compressedBuildingLoc)
			allLocs.push(buildingLoc)
			const buildingHexID = buildingLoc[1]
			const buildingBucketID = buildingLoc[2]

			const bldg = history.getBuildingByID_HIST(buildingID)
			const buildingType = bldg.type
			let secEntry = {}
			let bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)
			secEntry.bldgGfx = "bldg_" + String(buildingType)
			//ret.hexIDSandVertexesToHighlight.push(buildingLoc)
			secEntry.inputResourcesGfx = []
			secEntry.outputResourcesGfx = []
			secEntry.buildingHexID = buildingHexID
			// If len = 2, no input res was recorded. So must be default
			if (secHistEntry.length === 2) {
				for (let j = 0; j < bldgStats.inputRes[0].length; j++) {
					secEntry.inputResourcesGfx.push("res_" + String(bldgStats.inputRes[0][j]))
				}
			} else {
				const resIdx = secHistEntry[2]
				const inputRes = bldgStats.inputRes[resIdx]
				for (let j = 0; j < inputRes.length; j++) {
					secEntry.inputResourcesGfx.push("res_" + String(inputRes[j]))
				}
			}

			for (let j = 0; j < bldgStats.outputRes.length; j++) {
				// If it's a res, it's produced
				if (bldgStats.outputRes[j] < rf.RES_UPPER_LIMIT) secEntry.outputResourcesGfx.push("res_" + String(bldgStats.outputRes[j]))
				// Otherwise, the transporter is lost
				else secEntry.outputResourcesGfx.push("res_blank")
			}
			Object.assign(secEntry, getHighlightData([buildingLoc]))
			secEntry.buildingsToHighlight = [[buildingType, buildingHexID, buildingBucketID]]
			ret.secondaryProductions.push(secEntry)
		}
		// Metaphysical research
		if (entry[3].length > 1) {
			for (let i = 0; i < entry[3][1].length; i++) {
				const metaResearchEntry = entry[3][1][i]
				const compressedLoc = metaResearchEntry[0]
				const fullLoc = stack.decompressLocation(compressedLoc)
				const hexID = fullLoc[1]
				//const bucketID = fullLoc[2]

				let metaResearchEntryRet = {}
				metaResearchEntryRet.hexID = hexID
				Object.assign(metaResearchEntryRet, getHighlightData([fullLoc]))
				ret.metaResearchEntries.push(metaResearchEntryRet)
			}
		}
		//Object.assign(ret, getHighlightData(allLocs))
	} else if (entry[0] === rf.HIST_CONFLICT_PRAYING) {
		const playerOrderData = [...entry[3]].map((num) => num % 10)
		ret.playerOrderDataArrs = playerOrderData.map((num) => [num])
		// Add a flag for cashing in or not
		for (let i = 0; i < entry[3].length; i++) {
			if ((entry[3][i] >= 0 && entry[3][i]) <= 19) {
				ret.playerOrderDataArrs[i].push(0)
			} else ret.playerOrderDataArrs[i].push(1)
		}
		// Add in a flag for preset
		for (let i = 0; i < entry[3].length; i++) {
			if ((entry[3][i] >= 10 && entry[3][i] <= 19) || (entry[3][i] >= 30 && entry[3][i] <= 39)) {
				ret.playerOrderDataArrs[i].push(1)
			} else ret.playerOrderDataArrs[i].push(0)
		}
		// Find out which playerIndex is missing from the list
		ret.missingPlayerIndex = -1
		ret.newPrayingOrder = []
		if (playerOrderData.length === store.players.length - 1) {
			const n = store.players.length - 1
			const expectedSum = (n * (n + 1)) / 2

			// Sum up the indices you actually have
			const actualSum = playerOrderData.reduce((a, b) => (a % 10) + Number(b % 10), 0)
			ret.missingPlayerIndex = expectedSum - actualSum
			// Calculate the new praying order
			let newPrayingOrder = Array(store.players.length).fill(-1)
			for (let i = 0; i < playerOrderData.length; i++) {
				let cashIn = entry[3][i] >= 20
				let playerIndex = entry[3][i] % 10
				if (cashIn) {
					const firstEmptyIndex = newPrayingOrder.indexOf(-1)
					newPrayingOrder[firstEmptyIndex] = playerIndex
				} else {
					const lastEmptyIndex = newPrayingOrder.lastIndexOf(-1)
					newPrayingOrder[lastEmptyIndex] = playerIndex
				}
			}
			const finalPosIdx = newPrayingOrder.lastIndexOf(-1)
			newPrayingOrder[finalPosIdx] = ret.missingPlayerIndex
			ret.newPrayingOrder = [...newPrayingOrder]
		} // end conflict praying completed
	} else if (entry[0] === rf.HIST_CONFLICT_TURN_ORDER) {
		ret.playerOrderData = [...entry[3]]
		// Find out which playerIndex is missing from the list
		ret.missingPlayerData = [-1, -1]
		ret.newTurnOrder = []
		if (ret.playerOrderData.length === store.players.length - 1) {
			const n = store.players.length - 1
			const expectedSum = (n * (n + 1)) / 2

			// Calculate sums for both positions [0] and [1]
			const actualSum0 = entry[3].reduce((sum, sub) => sum + Number(sub[0]), 0)
			const actualSum1 = entry[3].reduce((sum, sub) => sum + Number(sub[1]), 0)

			// Identify the missing values
			ret.missingPlayerData[0] = expectedSum - actualSum0
			ret.missingPlayerData[1] = expectedSum - actualSum1

			ret.newTurnOrder = Array(store.players.length).fill(-1)
			for (let i = 0; i < entry[3].length; i++) {
				ret.newTurnOrder[entry[3][i][1]] = entry[3][i][0]
			}
			ret.newTurnOrder[ret.missingPlayerData[1]] = ret.missingPlayerData[0]
		}
	} else if (entry[0] === rf.HIST_STACK_ACTIONS) {
		ret.title = "TITLE"
		ret.stackSteps = []
		if (rf.PHASE_MOVEMENTS.includes(entry[3][0])) ret.title = "Movement Phase"
		else if (rf.PHASE_PRODUCTIONS.includes(entry[3][0])) ret.title = "Production Phase"
		else if (rf.PHASE_BUILDINGS.includes(entry[3][0])) ret.title = "Building Phase"
		else if (rf.PHASE_WONDERS.includes(entry[3][0])) ret.title = "Wonder Phase"
		// If there is only 1 entry, then the phase was skipped
		if (entry[3].length === 1) {
			if (rf.PHASE_MOVEMENTS.includes(entry[3][0])) ret.title = "Skips Movement"
			else if (rf.PHASE_PRODUCTIONS.includes(entry[3][0])) ret.title = "Skips Production"
			else if (rf.PHASE_BUILDINGS.includes(entry[3][0])) ret.title = "Skips Building"
			else if (rf.PHASE_WONDERS.includes(entry[3][0])) ret.title = "Skips Wonder"
		}
		for (let i = 1; i < entry[3].length; i++) {
			let thisStepHist = {}
			const stackAction = entry[3][i]
			if (!stackAction) {
				rf.doAdminAlrt(`no stack action at index ${i} entry3i ${entry[3][i]} ebtry3 ${entry[3]}`)
				continue
			}
			/********************************************************* MOVEMENT / GENERAL STACK ********************************************************* */
			if (stackAction[0] === rf.STACK_MOVE_LAND) {
				// Split out the parameters
				const movingTransporterID = stackAction[1]
				const fromLocation = stack.decompressLocation(stackAction[2])
				const toLocation = stack.decompressLocation(stackAction[3])
				const contentIDs = stackAction[4]
				let numGeeseFollowing = 0
				let droppedGeese = false
				if (stackAction.length >= 6) {
					numGeeseFollowing = stackAction[5][0]
					if (stackAction[5].length > 1) droppedGeese = stackAction[5][1] === 1
				}

				thisStepHist.action = rf.STACK_MOVE_LAND
				thisStepHist.movingTransporterID = movingTransporterID
				thisStepHist.fromHexID = fromLocation[1]
				thisStepHist.toHexID = toLocation[1]
				thisStepHist.droppedGeese = droppedGeese

				const fromBucketId = fromLocation[2]
				const toBucketId = toLocation[2]
				thisStepHist.fromBucketId = fromBucketId
				thisStepHist.toBucketId = toBucketId
				Object.assign(thisStepHist, getHighlightData([fromLocation, toLocation]))

				thisStepHist.numGeeseFollowing = numGeeseFollowing
				let transporterObj = history.getTransporterByID_HIST(movingTransporterID)
				const transporterOwnerIndex = transporterObj.ownerIndex
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterOwnerIndex].colour)}`
				thisStepHist.contentsGfx = []
				for (let j = 0; j < contentIDs.length; j++) {
					if (contentIDs[0] === -1) {
						const transporterBeingCarried = history.getTransporterByID_HIST(contentIDs[1])
						thisStepHist.contentsGfx.push(`transporter_${transporterBeingCarried.type}_${personal.getCorrectedColour(store.players[transporterOwnerIndex].colour)}`)
						break
					}
					let resObj = history.getResByID_HIST(contentIDs[j])
					thisStepHist.contentsGfx.push(`res_${resObj.type}`)
				}
			} else if (stackAction[0] === rf.STACK_MOVE_WATER) {
				const transporterID = stackAction[1]
				const fromLocation = stack.decompressWaterLocation(stackAction[2])
				const toLocation = stack.decompressWaterLocation(stackAction[3])
				const contentIDs = stackAction[4]
				let geeseDropLocation = []

				let numGeeseFollowing = 0
				if (stackAction.length >= 6) {
					numGeeseFollowing = stackAction[5][0]
					if (stackAction[5].length >= 2) {
						if (stackAction[5][1] !== 1) geeseDropLocation = [...stackAction[5][1]]
						else geeseDropLocation = [...toLocation]
					}
				}

				thisStepHist.contentsGfx = []

				const fromHexID = fromLocation[1]
				const toHexID = toLocation[1]
				for (let j = 0; j < contentIDs.length; j++) {
					if (contentIDs[0] === -1) {
						const transporterBeingCarried = history.getTransporterByID_HIST(contentIDs[1])
						thisStepHist.contentsGfx.push(`transporter_${transporterBeingCarried.type}_${personal.getCorrectedColour(store.players[transporterBeingCarried.ownerIndex].colour)}`)
						break
					}
					let resObj = history.getResByID_HIST(contentIDs[j])
					thisStepHist.contentsGfx.push(`res_${resObj.type}`)
				}
				thisStepHist.numGeeseFollowing = numGeeseFollowing
				// Sort the transporter gfx
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				const transporterOwnerIndex = transporterObj.ownerIndex
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterOwnerIndex].colour)}`
				thisStepHist.fromData = {}
				thisStepHist.toData = {}
				thisStepHist.geeseDropLocation = {}
				Object.assign(thisStepHist.fromData, getHighlightData([fromLocation]))
				Object.assign(thisStepHist.toData, getHighlightData([toLocation]))
				Object.assign(thisStepHist.geeseDropLocation, getHighlightData([geeseDropLocation]))
				thisStepHist.action = rf.STACK_MOVE_WATER
				thisStepHist.fromHexID = fromHexID
				thisStepHist.toHexID = toHexID
			} else if (stackAction[0] === rf.STACK_STRICT_PICKUP_RES) {
				const transporterID = stackAction[1]
				const resIDs = stackAction[2]
				const oldResCompressedLocation = stackAction[3]
				const oldResLocationFull = stack.decompressLocation(oldResCompressedLocation)
				Object.assign(thisStepHist, getHighlightData([oldResLocationFull]))
				thisStepHist.action = rf.STACK_STRICT_PICKUP_RES
				thisStepHist.transporterID = transporterID
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				//thisStepHist.resID = resID
				thisStepHist.resGfxs = []
				for (const resID of resIDs) thisStepHist.resGfxs.push(`res_${history.getResByID_HIST(resID).type}`)
			} else if (stackAction[0] === rf.STACK_PICKUP_TRANSPORTER) {
				const pickingUpTransporterID = stackAction[1]
				const beingCarriedTransporterID = stackAction[2]
				const compressedPickingUpTransporterLocation = stackAction[3]
				const pickingUpTransporterLocation = stack.decompressLocation(compressedPickingUpTransporterLocation)
				Object.assign(thisStepHist, getHighlightData([pickingUpTransporterLocation]))
				thisStepHist.action = rf.STACK_PICKUP_TRANSPORTER
				thisStepHist.pickingUpTransporterID = pickingUpTransporterID
				thisStepHist.beingCarriedTransporterID = beingCarriedTransporterID
				const pickingUpTransporterObj = history.getTransporterByID_HIST(pickingUpTransporterID)
				thisStepHist.pickingUpTransporterGfx = `transporter_${pickingUpTransporterObj.type}_${personal.getCorrectedColour(store.players[pickingUpTransporterObj.ownerIndex].colour)}`
				const beingCarriedTransporterObj = history.getTransporterByID_HIST(beingCarriedTransporterID)
				thisStepHist.beingCarriedTransporterGfx = `transporter_${beingCarriedTransporterObj.type}_${personal.getCorrectedColour(store.players[beingCarriedTransporterObj.ownerIndex].colour)}`
			} else if (stackAction[0] === rf.STACK_STRICT_DROP_RES) {
				const transporterID = stackAction[1]
				const resIDs = stackAction[2]
				const compressedDropLocation = stackAction[3]
				const dropLocation = stack.decompressLocation(compressedDropLocation)
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.action = rf.STACK_STRICT_DROP_RES
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				Object.assign(thisStepHist, getHighlightData([dropLocation]))
				thisStepHist.resGfxs = []
				for (const resID of resIDs) thisStepHist.resGfxs.push(`res_${history.getResByID_HIST(resID).type}`)
			} else if (stackAction[0] === rf.STACK_STRICT_FERRY_RES) {
				const transporterID = stackAction[1]
				const resIDs = stackAction[2]
				const compressedDropLocation = stackAction[3]
				const dropLocation = stack.decompressLocation(compressedDropLocation)
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.action = rf.STACK_STRICT_FERRY_RES
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				Object.assign(thisStepHist, getHighlightData([dropLocation]))
				thisStepHist.resGfxs = []
				for (const resID of resIDs) thisStepHist.resGfxs.push(`res_${history.getResByID_HIST(resID).type}`)
			} else if (stackAction[0] === rf.STACK_DROP_TRANSPORTER) {
				const carryingTransporterID = stackAction[1]
				const beingDroppedTransporterID = stackAction[2]
				const compressedDropLocation = stackAction[3]
				const dropLocation = stack.decompressLocation(compressedDropLocation)
				Object.assign(thisStepHist, getHighlightData([dropLocation]))
				thisStepHist.action = rf.STACK_DROP_TRANSPORTER
				const carryingTransporterObj = history.getTransporterByID_HIST(carryingTransporterID)
				thisStepHist.carryingTransporterGfx = `transporter_${carryingTransporterObj.type}_${personal.getCorrectedColour(store.players[carryingTransporterObj.ownerIndex].colour)}`
				const beingDroppedTransporterObj = history.getTransporterByID_HIST(beingDroppedTransporterID)
				thisStepHist.beingDroppedTransporterGfx = `transporter_${beingDroppedTransporterObj.type}_${personal.getCorrectedColour(store.players[beingDroppedTransporterObj.ownerIndex].colour)}`
			} else if (stackAction[0] === rf.STACK_STEAL_RES) {
				const transporterID = stackAction[1]
				const otherTransporterID = stackAction[2]
				const resIDs = stackAction[3]
				const compressedTransporterLocation = stackAction[4]
				const transporterLocation = stack.decompressLocation(compressedTransporterLocation)
				Object.assign(thisStepHist, getHighlightData([transporterLocation]))
				thisStepHist.action = rf.STACK_STEAL_RES
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				const otherTransporterObj = history.getTransporterByID_HIST(otherTransporterID)
				thisStepHist.otherTransporterGfx = `transporter_${otherTransporterObj.type}_${personal.getCorrectedColour(store.players[otherTransporterObj.ownerIndex].colour)}`
				thisStepHist.resGfxs = []
				for (const resID of resIDs) thisStepHist.resGfxs.push(`res_${history.getResByID_HIST(resID).type}`)
			} else if (stackAction[0] === rf.STACK_PICKUP_RES_TO_FOLLOW) {
				const transporterID = stackAction[1]
				const resIDs = stackAction[2]
				const compressedTransporterLocation = stackAction[3]
				const transporterLocation = stack.decompressLocation(compressedTransporterLocation)
				Object.assign(thisStepHist, getHighlightData([transporterLocation]))
				thisStepHist.action = rf.STACK_PICKUP_RES_TO_FOLLOW
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				thisStepHist.resGfxs = []
				for (const resID of resIDs) thisStepHist.resGfxs.push(`res_${history.getResByID_HIST(resID).type}`)
			} else if (stackAction[0] === rf.STACK_DROP_RES_FOLLOWING) {
				const transporterID = stackAction[1]
				const resIDs = stackAction[2]
				const compressedDropLocation = stackAction[3]
				const dropLocation = stack.decompressLocation(compressedDropLocation)
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.action = rf.STACK_DROP_RES_FOLLOWING
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				Object.assign(thisStepHist, getHighlightData([dropLocation]))
				thisStepHist.resGfxs = []
				for (const resID of resIDs) thisStepHist.resGfxs.push(`res_${history.getResByID_HIST(resID).type}`)
			}
			//
			/********************************************************* BUILDING ********************************************************* */
			else if (stackAction[0] === rf.STACK_BUILD_ROAD) {
				const transporterID = stackAction[1]
				const compressedFromLocation = stackAction[2]
				const compressedToLocation = stackAction[3]
				const fromLocation = stack.decompressLocation(compressedFromLocation)
				const toLocation = stack.decompressLocation(compressedToLocation)

				const fromHexID = fromLocation[1]
				const toHexID = toLocation[1]

				thisStepHist.action = rf.STACK_BUILD_ROAD
				thisStepHist.fromHexID = fromHexID
				thisStepHist.toHexID = toHexID
				thisStepHist.fromData = {}
				thisStepHist.toData = {}
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				Object.assign(thisStepHist.fromData, getHighlightData([fromLocation]))
				Object.assign(thisStepHist.toData, getHighlightData([toLocation]))
			} else if (stackAction[0] === rf.STACK_BUILD_BRIDGE) {
				//	let stackAction = [rf.STACK_BUILD_BRIDGE, store.context.selectedTransporterIDforTM, hexID, bridgeArr]
				const transporterID = stackAction[1]
				const hexID = stackAction[2]
				const hex = model.getHexByID(hexID)
				let bridgeArr = []
				if (hex.bridges.length === 1) {
					bridgeArr = hex.bridges[0]
				} else {
					let bridgeIdx = 0
					if (stackAction.length > 3) bridgeIdx = stackAction[3]
					bridgeArr = hex.bridges[bridgeIdx]
				}

				thisStepHist.action = rf.STACK_BUILD_BRIDGE
				thisStepHist.hexID = hexID
				thisStepHist.bridgeArr = bridgeArr
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				thisStepHist.bridgeHighlight = [[hexID, [...bridgeArr]]]
			} else if (stackAction[0] === rf.STACK_BUILD_WALL) {
				//let stackAction = [rf.STACK_BUILD_WALL, store.context.selectedTransporterIDforTM, hex1ID, hex2ID]
				const transporterID = stackAction[1]
				const hex1ID = stackAction[2]
				const hex2ID = stackAction[3]
				const newLevel = stackAction[4]
				let ejectedTransporterIDs = []
				if (stackAction.length > 5) {
					ejectedTransporterIDs = stackAction[5]
				}
				thisStepHist.action = rf.STACK_BUILD_WALL
				thisStepHist.hex1ID = hex1ID
				thisStepHist.hex2ID = hex2ID
				thisStepHist.newLevel = newLevel
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				thisStepHist.ejectedTransporterGfxs = []
				for (let i = 0; i < ejectedTransporterIDs.length; i++) {
					const transporterObj = history.getTransporterByID_HIST(ejectedTransporterIDs[i])
					thisStepHist.ejectedTransporterGfxs.push(`transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`)
				}
				thisStepHist.hex1wallHighlight = [[hex1ID, hex2ID]]
				thisStepHist.hex2wallHighlight = [[hex2ID, hex1ID]]
			} else if (stackAction[0] === rf.STACK_DEMOLISH_WALL) {
				//let stackAction = [rf.STACK_BUILD_WALL, store.context.selectedTransporterIDforTM, hex1ID, hex2ID]
				const transporterID = stackAction[1]
				const hex1ID = stackAction[2]
				const hex2ID = stackAction[3]
				const currentLevel = stackAction[4]
				thisStepHist.action = rf.STACK_DEMOLISH_WALL
				thisStepHist.hex1ID = hex1ID
				thisStepHist.hex2ID = hex2ID
				thisStepHist.currentLevel = currentLevel
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				thisStepHist.hex1wallHighlight = [[hex1ID, hex2ID]]
				thisStepHist.hex2wallHighlight = [[hex2ID, hex1ID]]
			} else if (stackAction[0] === rf.STACK_BUILD_BUILDING) {
				//  let stackAction = [rf.STACK_BUILD_BUILDING, store.context.selectedTransporterIDforTM, buildingType, location.slice(1)]
				const transporterID = stackAction[1]
				const buildingType = stackAction[2]
				const compressedLocation = stackAction[3]
				const fullLocation = stack.decompressLocation(compressedLocation)
				const hexID = fullLocation[1]
				const bucketId = fullLocation[2]
				thisStepHist.action = rf.STACK_BUILD_BUILDING
				thisStepHist.buildingType = buildingType
				thisStepHist.hexID = fullLocation[1]
				thisStepHist.isMine = buildingType === rf.BLDG_MINE
				thisStepHist.mineContent = [3, 3]
				if (thisStepHist.isMine && stackAction.length > 4) {
					const mineType = stackAction[4]
					if (mineType === rf.MINE_IRON) thisStepHist.mineContent = [0, 4]
					else if (mineType === rf.MINE_GOLD) thisStepHist.mineContent = [4, 0]
					else if (mineType === rf.MINE_BIG) thisStepHist.mineContent = [5, 5]
				}
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				thisStepHist.bldgGfx = `bldg_${buildingType}`
				// Need bldgType, hexID, bucketID
				thisStepHist.buildingsToHighlight = [[buildingType, hexID, bucketId]]
				Object.assign(thisStepHist, getHighlightData([fullLocation]))
			}
			//
			else if (stackAction[0] === rf.STACK_RESHAFT_MINE) {
				const transporterID = stackAction[1]
				//const mineID = stackAction[2]
				const compressedLocation = stackAction[3]
				const fullLocation = stack.decompressLocation(compressedLocation)
				const hexID = fullLocation[1]
				const bucketID = fullLocation[2]

				thisStepHist.action = rf.STACK_RESHAFT_MINE
				thisStepHist.hexID = hexID
				thisStepHist.mineContent = [3, 3]
				if (stackAction.length > 4) {
					const mineType = stackAction[4]
					if (mineType === rf.MINE_IRON) thisStepHist.mineContent = [0, 4]
					else if (mineType === rf.MINE_GOLD) thisStepHist.mineContent = [4, 0]
					else if (mineType === rf.MINE_BIG) thisStepHist.mineContent = [5, 5]
				}
				//thisStepHist.location = location
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				thisStepHist.bldgGfx = `bldg_${rf.BLDG_MINE}`
				thisStepHist.buildingsToHighlight = [[rf.BLDG_MINE, hexID, bucketID]]
				Object.assign(thisStepHist, getHighlightData([fullLocation]))
			}
			//
			/********************************************************* PRODUCTION ********************************************************* */
			else if (stackAction[0] === rf.STACK_MANUAL_PRODUCTION) {
				//	let stackAction = [rf.STACK_MANUAL_PRODUCTION, building.id, transporterID, building.location.slice(1) ]
				const buildingID = stackAction[1]
				const transporterID = stackAction[2]
				const compressedLocation = stackAction[3]
				const fullBuildingLocation = stack.decompressLocation(compressedLocation)
				const hexID = fullBuildingLocation[1]
				thisStepHist.action = rf.STACK_MANUAL_PRODUCTION
				thisStepHist.buildingID = buildingID
				thisStepHist.hexID = hexID
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
				thisStepHist.bldgGfx = `bldg_${history.getBuildingByID_HIST(buildingID).type}`
				Object.assign(thisStepHist, getHighlightData([fullBuildingLocation]))
				const buildingType = history.getBuildingByID_HIST(buildingID).type
				const bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)

				thisStepHist.inputResourcesGfx = []
				thisStepHist.outputResourcesGfx = []
				thisStepHist.waterTransportOutputData = {}
				// If len = 2, no input res was recorded. So must be default
				if (stackAction.length === 4) {
					for (let j = 0; j < bldgStats.inputRes[0].length; j++) {
						// If it's a res, it's consumed
						if (bldgStats.inputRes[0][j] < rf.RES_UPPER_LIMIT) thisStepHist.inputResourcesGfx.push(`res_${String(bldgStats.inputRes[0][j])}`)
						// Otherwise, the transporter is consumed
						else thisStepHist.inputResourcesGfx.push(`transporter_${bldgStats.inputRes[0][j]}_${personal.getCorrectedColour(store.players[entry[1]].colour)}`)
					}
				}
				// if you produced a water transporter, extract the location
				else if (rf.ALL_WATER_TRANSPORTER_BUILDINGS.includes(buildingType) && stackAction.length === 5) {
					// Add the input res
					for (let j = 0; j < bldgStats.inputRes[0].length; j++) thisStepHist.inputResourcesGfx.push(`res_${String(bldgStats.inputRes[0][j])}`)

					Object.assign(thisStepHist.waterTransportOutputData, getHighlightData([stack.decompressWaterLocation(stackAction[4])]))
				}
				// if it's a wagon factory, entry[4] is the removed transporterID
				else if (buildingType === rf.BLDG_WAGON_FACTORY && stackAction.length === 5) {
					for (let j = 0; j < bldgStats.inputRes[0].length; j++) {
						// If it's a res, it's consumed
						if (bldgStats.inputRes[0][j] < rf.RES_UPPER_LIMIT) thisStepHist.inputResourcesGfx.push(`res_${String(bldgStats.inputRes[0][j])}`)
						// Otherwise, the transporter is consumed
						else thisStepHist.inputResourcesGfx.push(`transporter_${bldgStats.inputRes[0][j]}_${personal.getCorrectedColour(store.players[entry[1]].colour)}`)
					}
				}
				// Otherwise, it is a multi-input building
				else {
					const inputRes = bldgStats.inputRes[stackAction[4]]
					for (let j = 0; j < inputRes.length; j++) {
						thisStepHist.inputResourcesGfx.push("res_" + String(inputRes[j]))
					}
				}
				for (let j = 0; j < bldgStats.outputRes.length; j++) {
					// If it's a res, it's produced
					if (bldgStats.outputRes[j] < rf.RES_UPPER_LIMIT) thisStepHist.outputResourcesGfx.push(`res_${String(bldgStats.outputRes[j])}`)
					// Otherwise, the transporter is produced
					else thisStepHist.outputResourcesGfx.push(`transporter_${bldgStats.outputRes[j]}_${personal.getCorrectedColour(store.players[entry[1]].colour)}`)
				}
			}
			//
			else if (stackAction[0] === rf.STACK_DO_RESEARCH) {
				const transporterID = stackAction[1]
				const RND_IDX = stackAction[2]
				const hexID = stackAction[3]
				thisStepHist.geeseUsed = 2
				if (stackAction.length >= 5) {
					thisStepHist.geeseUsed = stackAction[4]
				}
				thisStepHist.action = rf.STACK_DO_RESEARCH
				thisStepHist.RND_IDX = RND_IDX
				thisStepHist.hexID = hexID
				const transporterObj = history.getTransporterByID_HIST(transporterID)
				thisStepHist.transporterGfx = `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`
			}
			//
			else if (stackAction[0] === rf.STACK_UPGRADE_BUILDING) {
				const oldBuildingID = stackAction[1]
				const newBuildingType = stackAction[2]
				const compressedLocation = stackAction[3]
				const fullLocation = stack.decompressLocation(compressedLocation)
				thisStepHist.action = rf.STACK_UPGRADE_BUILDING
				thisStepHist.oldBildingID = oldBuildingID
				thisStepHist.hexID = fullLocation[1]
				thisStepHist.oldBldgGfx = `bldg_${history.getBuildingByID_HIST(oldBuildingID).type}`
				thisStepHist.newBldgGfx = `bldg_${newBuildingType}`
				Object.assign(thisStepHist, getHighlightData([fullLocation]))
			}
			//
			else if (stackAction[0] === rf.STACK_DONKEY_REPRODUCTION) {
				thisStepHist.action = rf.STACK_DONKEY_REPRODUCTION
				thisStepHist.donkeyTileIDsAndBuckets = []
				thisStepHist.transporterGfxs = []
				thisStepHist.transporterRemovedGfxs = []
				const allLocations = []
				for (const donkeyEntry of stackAction.slice(1)) {
					const donkeyLocation = donkeyEntry[0]
					if (donkeyEntry.length > 1) {
						const removedTransporterObj = history.getTransporterByID_HIST(donkeyEntry[1])
						thisStepHist.transporterRemovedGfxs.push(`transporter_${removedTransporterObj.type}_${personal.getCorrectedColour(store.players[removedTransporterObj.ownerIndex].colour)}`)
					}
					const fullLocation = stack.decompressLocation(donkeyLocation)
					allLocations.push(fullLocation)
					thisStepHist.donkeyTileIDsAndBuckets.push([fullLocation[1], fullLocation[2]])
					thisStepHist.transporterGfxs.push(`transporter_${rf.DONKEY}_${personal.getCorrectedColour(store.players[entry[1]].colour)}`)
				}
				Object.assign(thisStepHist, getHighlightData(allLocations))
			}
			//
			else if (stackAction[0] === rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY) {
				const removedTransporterID = stackAction[1]
				const hexID = stackAction[2]
				const removedTransporterObj = history.getTransporterByID_HIST(removedTransporterID)
				thisStepHist.action = rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY
				thisStepHist.hexID = hexID
				thisStepHist.transporterGfx = `transporter_${removedTransporterObj.type}_${personal.getCorrectedColour(store.players[entry[1]].colour)}`

				//Object.assign(thisStepHist, getHighlightData([fullLocation]))
			}
			// ***************************************************** WONDERS *****************************************************
			else if (stackAction[0] === rf.STACK_ADD_WONDER_BRICKS) {
				thisStepHist.action = rf.STACK_ADD_WONDER_BRICKS
				const numBricks = stackAction.length - 1
				const addBrickText = numBricks === 1 ? "1 brick" : `${numBricks} bricks`
				const bricks = []
				for (const brick of stackAction.slice(1)) {
					let resGfxs = []
					for (const resID of brick) {
						const resObj = history.getResByID_HIST(resID)
						resGfxs.push(resObj.gfx)
					}
					bricks.push([...resGfxs])
				}
				thisStepHist.bricks = bricks
				thisStepHist.addBrickText = addBrickText
			}
			thisStepHist.singleStackEntryID = i - 1
			ret.stackSteps.push(thisStepHist)
		}
	}

	if (props.singleStackEntryID !== -1) {
		ret.stackSteps = ret.stackSteps.filter((step) => step.singleStackEntryID === props.singleStackEntryID)
	}

	return ret
})
</script>

<template>
	<div v-if="1==1 || rf.DEBUG_USERS.includes(personal.name) && !store.viewSettings.showReplay" class="entry3Div">0: {{ entry[0] }} 1: {{ entry[1] }} 3: {{ entry[3] }}</div>
	<!-- New Game -->
	<template v-if="entry[0] === rf.HIST_NEW_GAME">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				Welcome to Roads & Boats!
				<br />
				<div v-for="(player, idx) in store.players" :key="idx" class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(player.colour)">{{ store.players[idx].name }}</span>
				</div>
			</div>
		</div>
	</template>

	<!-- GAME END -->
	<template v-if="entry[0] === rf.HIST_GAME_END">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ funcs.timestampToString(entry[2]) }}</span>
			</div>
			<div class="mainEntry new_turn">
				<b><u>Final Scores</u></b>
				<br />
				<br />
				<!--<template v-if="store.context.finalPositions.length === 1">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.context.finalPositions[0]].colour)">{{ store.players[store.context.finalPositions[0]].displayName }}</span>
					wins as King of the Hill
				</template>
				<template v-else>-->
				<template v-for="(finalEntry, idx) in entry[3]" :key="idx">
					{{ view.getOrdinal(idx + 1) }}:
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[finalEntry[0]].colour)">{{ store.players[finalEntry[0]].displayName }}</span>
					Total: {{ finalEntry[1] }}
					<br />
				</template>
				<br />
			</div>
		</div>
	</template>

	<!-- New Turn -->
	<template v-if="entry[0] === rf.HIST_NEW_TURN">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">Start of turn {{ entry[3][0] }}</div>
		</div>
	</template>

	<!-- CUSTOM SCENARIO ELEMENTS -->
	<template v-if="entry[0] === rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">Custom Scenario Elements Added</div>
		</div>
	</template>
	<!-- HIST_PRE_PRODUCTION_MINES -->
	<template v-if="entry[0] === rf.HIST_PRE_PRODUCTION_MINES">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<b><u>Mine Production</u></b>
				<br />
				<template v-for="(primaryEntry, idx) in computedEntry3.primaryProductions" :key="idx">
					<div class="flexContainer">
						<MiniHex :hexID="primaryEntry.buildingHexID" :hexPiecesToOutline="primaryEntry.hexPiecesToOutline" />
						<svg class="buildingProductionSummaryImg" xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000">
							<circle class="mineSVGcircle" cx="0" cy="0" r="450" fill="gray" stroke="#734A36" stroke-width="100" />
						</svg>
						<template v-if="primaryEntry.outputResourcesGfx.length > 0">
							<div class="rightArrow"></div>
							<img v-for="(resGfx, idx2) in primaryEntry.outputResourcesGfx" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
						</template>
						<template v-else>is empty</template>
					</div>
				</template>
			</div>
		</div>
	</template>

	<!-- PRE-PRODUCTION -->
	<template v-if="entry[0] === rf.HIST_PRE_PRODUCTION">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<b><u>Primary Production</u></b>
				<br />
				<template v-for="(primaryEntry, idx) in computedEntry3.primaryProductions" :key="idx">
					<div class="flexContainer">
						<MiniHex :hexID="primaryEntry.buildingHexID" :hexPiecesToOutline="primaryEntry.hexPiecesToOutline" />
						<img v-if="!primaryEntry.isMine" class="buildingProductionSummaryImg" :src="view.getImage(primaryEntry.bldgGfx)" />
						<svg v-if="primaryEntry.isMine" class="buildingProductionSummaryImg" xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000">
							<circle class="mineSVGcircle" cx="0" cy="0" r="450" fill="gray" stroke="#734A36" stroke-width="100" />
						</svg>
						<template v-if="primaryEntry.outputResourcesGfx.length > 0">
							<div class="rightArrow"></div>
							<img v-for="(resGfx, idx2) in primaryEntry.outputResourcesGfx" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
						</template>
						<template v-else>is empty</template>
					</div>
				</template>
				<span v-if="computedEntry3.primaryProductions.length === 0">
					No primary production
					<br />
				</span>
				<b><u>Geese Reproduction</u></b>
				<br />
				<template v-if="computedEntry3.totalGeeseReproduction !== 0">
					<MiniHex v-for="(data, idx) in computedEntry3.geeseReproductionData" :key="idx" :hexID="data.hexID" :hexPiecesToOutline="data.hexPiecesToOutline" />
					<br />
				</template>
				<span v-if="computedEntry3.totalGeeseReproduction === 0">
					No geese reproduced
					<br />
				</span>
				<b><u>Unattended Secondary Production</u></b>
				<br />
				<template v-for="(secondaryEntry, idx) in computedEntry3.secondaryProductions" :key="idx">
					<div class="flexContainer">
						<MiniHex :hexID="secondaryEntry.buildingHexID" :hexPiecesToOutline="secondaryEntry.hexPiecesToOutline" />
						<img class="buildingProductionSummaryImg" :src="view.getImage(secondaryEntry.bldgGfx)" />
						<img v-for="(resGfx, idx2) in secondaryEntry.inputResourcesGfx" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
						<div class="rightArrow"></div>
						<img v-for="(resGfx, idx2) in secondaryEntry.outputResourcesGfx" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
					</div>
				</template>
				<span v-if="computedEntry3.secondaryProductions.length === 0">
					No secondary production
					<br />
				</span>
			</div>
		</div>
	</template>

	<!-- POST-PRODUCTION -->
	<template v-if="entry[0] === rf.HIST_POST_PRODUCTION">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<b><u>Remaining Secondary Production</u></b>
				<br />
				<template v-for="(secondaryEntry, idx) in computedEntry3.secondaryProductions" :key="idx">
					<div class="flexContainer">
						<MiniHex :hexID="secondaryEntry.buildingHexID" :hexPiecesToOutline="secondaryEntry.hexPiecesToOutline" />
						<img class="buildingProductionSummaryImg" :src="view.getImage(secondaryEntry.bldgGfx)" />
						<img v-for="(resGfx, idx2) in secondaryEntry.inputResourcesGfx" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
						<div class="rightArrow"></div>
						<img v-for="(resGfx, idx2) in secondaryEntry.outputResourcesGfx" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
					</div>
				</template>
				<span v-if="computedEntry3.secondaryProductions.length === 0">No Production</span>

				<template v-if="computedEntry3.metaResearchEntries.length > 0">
					<b><u>Metaphysical Research</u></b>
					<br />
					<template v-for="(metaResearchEntry, idx) in computedEntry3.metaResearchEntries" :key="idx">
						<div class="flexContainer">
							<MiniHex :hexID="metaResearchEntry.hexID" :hexPiecesToOutline="metaResearchEntry.hexPiecesToOutline" />
							<img class="resourceProductionSummaryImg" :src="view.getImage(`res_${rf.RES_GOOSE}`)" />
							<img class="resourceProductionSummaryImg" :src="view.getImage(`res_${rf.RES_GOOSE}`)" />
							<img class="resourceProductionSummaryImg" :src="view.getImage(`res_${rf.RES_PAPER}`)" />
							<div class="rightArrow"></div>
							<img class="resourceProductionSummaryImg" :src="view.getImage(`res_blank`)" />
						</div>
					</template>
				</template>
			</div>
		</div>
	</template>

	<!-- HIST_CHOOSE_CONFLICT -->
	<template v-if="entry[0] === rf.HIST_CHOOSE_CONFLICT">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				Conflict called by:
				<template v-for="(playerIndex, idx) in entry[3]" :key="idx">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
				</template>
			</div>
		</div>
	</template>

	<!-- HIST_CONFLICT_PRAYING -->
	<template v-if="entry[0] === rf.HIST_CONFLICT_PRAYING">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<b><u>Conflict - Praying</u></b>
				<br />
				<template v-for="(entry, idx) in computedEntry3.playerOrderDataArrs" :key="idx">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[0]].colour)">{{ store.players[entry[0]].displayName }}</span>
					<span v-if="entry[1] === 1">Cashes in</span>
					<span v-else-if="entry[1] === 0">Keeps Praying</span>
					<span v-if="entry.length > 2 && entry[2] === 1">&nbsp;(preset)</span>
					<br />
				</template>
				<template v-if="computedEntry3.missingPlayerIndex >= 0">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[computedEntry3.missingPlayerIndex].colour)">{{ store.players[computedEntry3.missingPlayerIndex].displayName }}</span>
					is the last player and keeps praying
				</template>
				<template v-if="computedEntry3.newPrayingOrder.length > 0">
					<br />
					<b><u>New Praying Order</u></b>
					<br />
					<template v-for="(playerIndex, idx) in computedEntry3.newPrayingOrder" :key="idx">
						<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
					</template>
					<img class="templeIconImg" :src="view.getImage('temple_icon')" />
				</template>
			</div>
		</div>
	</template>

	<!-- HIST_CONFLICT_TURN_ORDER -->
	<template v-if="entry[0] === rf.HIST_CONFLICT_TURN_ORDER">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<b><u>Conflict - Turn order</u></b>
				<br />
				<template v-for="(choiceEntry, idx) in computedEntry3.playerOrderData" :key="idx">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[choiceEntry[0]].colour)">{{ store.players[choiceEntry[0]].displayName }}</span>
					chooses to play {{ view.getOrdinal(choiceEntry[1] + 1) }}
					<span v-if="choiceEntry.length > 2 && choiceEntry[2] === 1">(preset)</span>
					<br />
				</template>
				<template v-if="computedEntry3.missingPlayerData[0] >= 0">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[computedEntry3.missingPlayerData[0]].colour)">{{ store.players[computedEntry3.missingPlayerData[0]].displayName }}</span>
					has to play {{ view.getOrdinal(computedEntry3.missingPlayerData[1] + 1) }}
				</template>
				<template v-if="computedEntry3.newTurnOrder.length > 0">
					<br />
					<b><u>New Turn Order</u></b>
					<br />
					<template v-for="(playerIndex, idx) in computedEntry3.newTurnOrder" :key="idx">
						<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
					</template>
				</template>
			</div>
		</div>
	</template>

	<!-- HIST_NO_CONFLICT -->
	<template v-if="entry[0] === rf.HIST_NO_CONFLICT">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<b><u>No Conflict</u></b>
			</div>
		</div>
	</template>

	<!-- REWIND -->
	<template v-if="entry[0] === rf.HIST_REWIND">
		<div class="log">
			<div class="header">
				<span>{{ funcs.timestampToString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">Game rewound to here by {{ getRewindName(entry[1]) }}</div>
		</div>
	</template>

	<!-- RESIGN -->
	<template v-if="entry[0] === rf.HIST_RESIGN">
		<div class="log">
			<div class="header">
				<span>{{ funcs.timestampToString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">{{ entry[3][0] }} Resigns</div>
		</div>
	</template>

	<!-- KICKOUT -->
	<template v-if="entry[0] === rf.HIST_KICKOUT">
		<div class="log">
			<div class="header">
				<span>{{ funcs.timestampToString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">{{ store.players[entry[3][0]].displayName }} was kicked out</div>
		</div>
	</template>

	<!-- PLAYER ACTIONS -->
	<!-- PLAYER ACTIONS -->
	<!-- PLAYER ACTIONS -->

	<!-- NO PRODUCTION-->
	<template v-if="entry[0] === rf.HIST_NO_PRODUCTION_ACTIONS || entry[0] === rf.HIST_NO_MOVEMENT_ACTIONS || entry[0] === rf.HIST_NO_BUILDING_ACTIONS || entry[0] === rf.HIST_NO_WONDER_ACTIONS">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				<span v-if="entry[0] === rf.HIST_NO_PRODUCTION_ACTIONS">Skips Production</span>
				<span v-else-if="entry[0] === rf.HIST_NO_MOVEMENT_ACTIONS">Skips Movement</span>
				<span v-else-if="entry[0] === rf.HIST_NO_BUILDING_ACTIONS">Skips Building</span>
				<span v-else-if="entry[0] === rf.HIST_NO_WONDER_ACTIONS">Skips Wonder</span>
			</div>
		</div>
	</template>

	<!-- ADD HEX -->

	<!-- CHOOSE HOME TILE-->
	<template v-if="entry[0] === rf.HIST_CHOOSE_HOME_TILE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span>
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				Chooses Home Tile:
				<br />
				<div class="flexContainer">
					<MiniHex :hexID="computedEntry3.hexID" :hexPiecesToOutline="computedEntry3.hexPiecesToOutline" />
					<img class="buildingProductionSummaryImg" :src="view.getImage(computedEntry3.homeTileGfx)" />
					<img v-for="(transporterGfx, idx) in computedEntry3.transporterGfxs" :key="idx" class="buildingProductionTransporterImg" :src="view.getImage(transporterGfx)" />
					<img v-for="(resGfx, idx) in computedEntry3.resGfxs" :key="idx" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
				</div>
			</div>
		</div>
	</template>

	<!-- STACK ACTIONS -->
	<template v-if="entry[0] === rf.HIST_STACK_ACTIONS">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], computedEntry3, entry_ID)">
			<div class="header">
				<span v-if="entry[2] !== -1">
					{{ funcs.timestampToString(entry[2]) }}
				</span>
			</div>
			<div class="container">
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[entry[1]].colour)">{{ store.players[entry[1]].displayName }}</span>
				<strong>{{ computedEntry3.title }}</strong>
				<br />
				<template v-for="(stackEntry, idx) in computedEntry3.stackSteps" :key="idx">
					<!-- LAND MOVE -->
					<template v-if="stackEntry.action === rf.STACK_MOVE_LAND">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, [])">
							<MiniHex :hexID="stackEntry.fromHexID" :hexPiecesToOutline="[[stackEntry.fromHexID, [stackEntry.fromBucketId]]]" />
							<img v-for="i in stackEntry.numGeeseFollowing" :key="i" class="stackResFollowingTransporterImg" :src="view.getImage(`res_${rf.RES_GOOSE}`)" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							<img class="stackContentsImg" v-for="(content, idx2) in stackEntry.contentsGfx" :key="idx2" :src="view.getImage(content)" />
							<div class="rightArrow"></div>
							<MiniHex :hexID="stackEntry.toHexID" :hexPiecesToOutline="[[stackEntry.toHexID, [stackEntry.toBucketId]]]" />
							<span v-if="stackEntry.droppedGeese">Drops Geese</span>
						</div>
					</template>
					<!-- WATER MOVE -->
					<template v-else-if="stackEntry.action === rf.STACK_MOVE_WATER">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.fromData.hexPiecesToHighlight.concat(stackEntry.toData.hexPiecesToHighlight), stackEntry.fromData.riversToOutline.concat(stackEntry.toData.riversToOutline), stackEntry.fromData.shoresToHighlight.concat(stackEntry.toData.shoresToHighlight), stackEntry.fromData.halfShoresToHighlight.concat(stackEntry.toData.halfShoresToHighlight))">
							<MiniHex :hexID="stackEntry.fromHexID" :hexPiecesToOutline="stackEntry.fromData.hexPiecesToOutline" :riversToOutline="stackEntry.fromData.riversToOutline" :shoresToOutline="stackEntry.fromData.shoresToHighlight" :halfShoresToOutline="stackEntry.fromData.halfShoresToOutline" />
							<img v-for="i in stackEntry.numGeeseFollowing" :key="i" class="stackResFollowingTransporterImg" :src="view.getImage(`res_${rf.RES_GOOSE}`)" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							<img class="stackContentsImg" v-for="(content, idx2) in stackEntry.contentsGfx" :key="idx2" :src="view.getImage(content)" />
							<div class="rightArrow"></div>
							<MiniHex :hexID="stackEntry.toHexID" :hexPiecesToOutline="stackEntry.toData.hexPiecesToOutline" :riversToOutline="stackEntry.toData.riversToOutline" :shoresToOutline="stackEntry.toData.shoresToOutline" :halfShoresToOutline="stackEntry.toData.halfShoresToOutline" />
							<template v-if="stackEntry.geeseDropLocation.hexID !== -1">
								Drops Geese
								<MiniHex :hexID="stackEntry.toHexID" :hexPiecesToOutline="stackEntry.geeseDropLocation.hexPiecesToOutline" :riversToOutline="stackEntry.geeseDropLocation.riversToOutline" :shoresToOutline="stackEntry.geeseDropLocation.shoresToOutline" :halfShoresToOutline="stackEntry.geeseDropLocation.halfShoresToOutline" />
							</template>
						</div>
					</template>
					<!-- PICKUP RES -->
					<template v-else-if="stackEntry.action === rf.STACK_STRICT_PICKUP_RES">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, stackEntry.riversToHighlight)">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" :riversToOutline="stackEntry.riversToOutline" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Picks Up&nbsp;
							<img v-for="(resGfx, idx) in stackEntry.resGfxs" :key="idx" class="stackContentsImg" :src="view.getImage(resGfx)" />
						</div>
					</template>
					<!-- PICKUP Transporter -->
					<template v-else-if="stackEntry.action === rf.STACK_PICKUP_TRANSPORTER">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, stackEntry.riversToHighlight, stackEntry.shoresToHighlight, stackEntry.halfShoresToHighlight)">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" :riversToOutline="stackEntry.riversToOutline" :shoresToOutline="stackEntry.shoresToHighlight" :halfShoresToOutline="stackEntry.halfShoresToHighlight" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.pickingUpTransporterGfx}`)" />
							Picks Up&nbsp;
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.beingCarriedTransporterGfx}`)" />
						</div>
					</template>
					<!-- STACK_STRICT_DROP_RES -->
					<template v-else-if="stackEntry.action === rf.STACK_STRICT_DROP_RES">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight)">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Drops&nbsp;
							<img v-for="(resGfx, idx) in stackEntry.resGfxs" :key="idx" class="stackContentsImg" :src="view.getImage(resGfx)" />
						</div>
					</template>
					<!-- STACK_STRICT_FERRY_RES -->
					<template v-else-if="stackEntry.action === rf.STACK_STRICT_FERRY_RES">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight)">
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Ferries&nbsp;
							<img v-for="(resGfx, idx) in stackEntry.resGfxs" :key="idx" class="stackContentsImg" :src="view.getImage(resGfx)" />
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" />
						</div>
					</template>
					<!-- DROP Transporter -->
					<template v-else-if="stackEntry.action === rf.STACK_DROP_TRANSPORTER">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, stackEntry.riversToHighlight, stackEntry.shoresToHighlight, stackEntry.halfShoresToHighlight)">
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.carryingTransporterGfx}`)" />
							Drops&nbsp;
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.beingDroppedTransporterGfx}`)" />
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" :riversToOutline="stackEntry.riversToOutline" :shoresToOutline="stackEntry.shoresToHighlight" :halfShoresToOutline="stackEntry.halfShoresToHighlight" />
						</div>
					</template>
					<!-- STEAL RES -->
					<template v-else-if="stackEntry.action === rf.STACK_STEAL_RES">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, stackEntry.riversToHighlight, stackEntry.shoresToHighlight, stackEntry.halfShoresToHighlight)">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" :riversToOutline="stackEntry.riversToOutline" :shoresToOutline="stackEntry.shoresToOutline" :halfShoresToOutline="stackEntry.halfShoresToOutline" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Transfers&nbsp;
							<img v-for="(resGfx, idx) in stackEntry.resGfxs" :key="idx" class="stackContentsImg" :src="view.getImage(resGfx)" />
							from
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.otherTransporterGfx}`)" />
						</div>
					</template>
					<!-- PICKUP RES AS FOLLOWER -->
					<template v-else-if="stackEntry.action === rf.STACK_PICKUP_RES_TO_FOLLOW">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, stackEntry.riversToHighlight)">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" :riversToOutline="stackEntry.riversToOutline" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Picks Up a follower&nbsp;
							<img v-for="(resGfx, idx) in stackEntry.resGfxs" :key="idx" class="stackContentsImg" :src="view.getImage(resGfx)" />
						</div>
					</template>
					<!-- STACK_DROP_RES_FOLLOWING -->
					<template v-else-if="stackEntry.action === rf.STACK_DROP_RES_FOLLOWING">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight)">
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Deposits Follower&nbsp;
							<img v-for="(resGfx, idx) in stackEntry.resGfxs" :key="idx" class="stackContentsImg" :src="view.getImage(resGfx)" />
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" />
						</div>
					</template>
					<!-- BUILD ROAD -->
					<template v-if="stackEntry.action === rf.STACK_BUILD_ROAD">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.fromData.hexPiecesToHighlight.concat(stackEntry.toData.hexPiecesToHighlight))">
							<MiniHex :hexID="stackEntry.fromHexID" :hexPiecesToOutline="stackEntry.fromData.hexPiecesToOutline" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Builds Road
							<div class="rightArrow"></div>
							<MiniHex :hexID="stackEntry.toHexID" :hexPiecesToOutline="stackEntry.toData.hexPiecesToOutline" />
						</div>
					</template>
					<!-- BUILD BRIDGE -->
					<template v-if="stackEntry.action === rf.STACK_BUILD_BRIDGE">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], [], [], [], [], stackEntry.bridgeHighlight)">
							<MiniHex :hexID="stackEntry.hexID" :bridgehighlight="stackEntry.bridgeHighlight" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Builds Bridge
						</div>
					</template>
					<!-- BUILD WALL -->
					<template v-if="stackEntry.action === rf.STACK_BUILD_WALL">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], [], [], [], [], [], stackEntry.hex1wallHighlight.concat(stackEntry.hex2wallHighlight))">
							<MiniHex :hexID="stackEntry.hex1ID" :wallsToOutline="stackEntry.hex1wallHighlight" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Builds Wall to Level {{ stackEntry.newLevel }}
							<MiniHex :hexID="stackEntry.hex2ID" :wallsToOutline="stackEntry.hex2wallHighlight" />

							<g v-if="stackEntry.ejectedTransporterGfxs.length > 0">
								Pushes to sea:
								<g v-for="ejectedTransporterGfx in stackEntry.ejectedTransporterGfxs" :key="ejectedTransporterGfx">
									<img class="stackTransporterImg" :src="view.getImage(`${ejectedTransporterGfx}`)" />
								</g>
							</g>
						</div>
					</template>
					<!-- DEMOLISH WALL-->
					<template v-if="stackEntry.action === rf.STACK_DEMOLISH_WALL">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], [], [], [], [], [], stackEntry.hex1wallHighlight.concat(stackEntry.hex2wallHighlight))">
							<MiniHex :hexID="stackEntry.hex1ID" :wallsToOutline="stackEntry.hex1wallHighlight" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Demolishes Level {{ stackEntry.currentLevel }} Wall&nbsp;
							<MiniHex :hexID="stackEntry.hex2ID" :wallsToOutline="stackEntry.hex2wallHighlight" />
						</div>
					</template>
					<!-- BUILD BUILDING -->
					<template v-if="stackEntry.action === rf.STACK_BUILD_BUILDING">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, [], [], [], [], [], stackEntry.buildingsToHighlight)">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Builds
							<img v-if="!stackEntry.isMine" class="buildingProductionSummaryImg" :src="view.getImage(stackEntry.bldgGfx)" />
							<svg v-if="stackEntry.isMine" class="buildingProductionSummaryImg" xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220">
								<circle cx="0" cy="0" r="100" fill="gray" stroke="#734A36" stroke-width="20" />
								<text x="-40" y="10" class="mineText redMineText">
									{{ stackEntry.mineContent[1] }}
								</text>
								<text class="mineText goldMineText" x="40" y="10">
									{{ stackEntry.mineContent[0] }}
								</text>
							</svg>
						</div>
					</template>
					<!-- STACK_RESHAFT_MINE -->
					<template v-if="stackEntry.action === rf.STACK_RESHAFT_MINE">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, [], [], [], [], [], stackEntry.buildingsToHighlight)">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" />
							<img class="stackTransporterImg" :src="view.getImage(`${stackEntry.transporterGfx}`)" />
							Reshafts mine with
							<svg class="buildingProductionSummaryImg" xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220">
								<circle cx="0" cy="0" r="100" fill="gray" stroke="#734A36" stroke-width="20" />
								<text x="-40" y="10" class="mineText redMineText">
									{{ stackEntry.mineContent[1] }}
								</text>
								<text class="mineText goldMineText" x="40" y="10">
									{{ stackEntry.mineContent[0] }}
								</text>
							</svg>
						</div>
					</template>
					<!-- MANUAL PRODUCTION -->
					<template v-if="stackEntry.action === rf.STACK_MANUAL_PRODUCTION">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, [], [], [], [])">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" />
							<img class="buildingProductionTransporterImg" :src="view.getImage(stackEntry.transporterGfx)" />
							<img class="buildingProductionSummaryImg" :src="view.getImage(stackEntry.bldgGfx)" />
							<img v-for="(resGfx, idx2) in stackEntry.inputResourcesGfx" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
							<!-- If outputting rowboat, must split lines here-->
							<template v-if="stackEntry.outputResourcesGfx[0].slice(0, 14) === 'transporter_34'">
								<br />
								&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
							</template>
							<div class="rightArrow"></div>
							<img v-for="(resGfx, idx2) in stackEntry.outputResourcesGfx" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
							<template v-if="stackEntry.waterTransportOutputData.hexID">
								<MiniHex :hexID="stackEntry.waterTransportOutputData.hexID" :shoresToOutline="stackEntry.waterTransportOutputData.shoresToOutline" :halfShoresToOutline="stackEntry.waterTransportOutputData.halfShoresToOutline" :riversToOutline="stackEntry.waterTransportOutputData.riversToOutline" />
							</template>
						</div>
					</template>
					<!-- STACK_DO_RESEARCH -->
					<template v-if="stackEntry.action === rf.STACK_DO_RESEARCH">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, [], [], [], [])">
							<MiniHex :hexID="stackEntry.hexID" />
							<img class="buildingProductionTransporterImg" :src="view.getImage(stackEntry.transporterGfx)" />
							researches
							<img class="researchImg" :src="view.getImage(`research_${stackEntry.RND_IDX}`)" />
							{{ rf.RND_STRINGS[stackEntry.RND_IDX] }}
							<span v-if="stackEntry.geeseUsed === 1">
								<br />
								Fundamental Research reduces geese required to 1
							</span>
						</div>
					</template>
					<!-- STACK_UPGRADE_BUILDING -->
					<template v-if="stackEntry.action === rf.STACK_UPGRADE_BUILDING">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, [], [], [], [])">
							<MiniHex :hexID="stackEntry.hexID" :hexPiecesToOutline="stackEntry.hexPiecesToOutline" />
							<img class="buildingProductionSummaryImg" :src="view.getImage(stackEntry.oldBldgGfx)" />
							upgraded to&nbsp;
							<img class="buildingProductionSummaryImg" :src="view.getImage(stackEntry.newBldgGfx)" />
						</div>
					</template>
					<!-- DONKEY REPRODUCTION -->
					<template v-if="stackEntry.action === rf.STACK_DONKEY_REPRODUCTION">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, [], [], [], [])">
							Donkey Reproduction
							<div class="lineBreak"></div>
							<template v-for="(entry, idx) in stackEntry.donkeyTileIDsAndBuckets" :key="idx">
								<div class="flexContainer">
									<MiniHex :hexID="entry[0]" :hexPiecesToOutline="[[entry[0], [entry[1]]]]" />
									<img class="buildingProductionTransporterImg" :src="view.getImage(stackEntry.transporterGfxs[idx])" />
									<img class="buildingProductionTransporterImg" :src="view.getImage(stackEntry.transporterGfxs[idx])" />
									<div class="rightArrow"></div>
									<img class="buildingProductionTransporterImg" :src="view.getImage(stackEntry.transporterGfxs[idx])" />
								</div>
							</template>
							<template v-if="stackEntry.transporterRemovedGfxs.length > 0">
								<div class="flexContainer">
									by removing&nbsp;
									<img class="buildingProductionTransporterImg" :src="view.getImage(stackEntry.transporterRemovedGfxs[0])" />
								</div>
							</template>
						</div>
					</template>
					<!-- STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY -->
					<template v-if="stackEntry.action === rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], [], [], [], [], [])">
							<MiniHex :hexID="stackEntry.hexID" />

							Excess transporter removed&nbsp;
							<img class="buildingProductionTransporterImg" :src="view.getImage(stackEntry.transporterGfx)" />
						</div>
					</template>
					<!-- WONDER -->
					<template v-if="stackEntry.action === rf.STACK_ADD_WONDER_BRICKS">
						<div class="flexContainer stackEntryDiv" @click.stop="clickedStackEntry(entry[0], stackEntry.hexPiecesToHighlight, [], [], [], [])">
							Adds {{ stackEntry.addBrickText }}:
							<br />
							<div v-for="(brick, idx) in stackEntry.bricks" :key="idx" class="flexContainer">
								<span v-if="idx > 0">+&nbsp;</span>
								<img v-for="(resGfx, idx2) in brick" :key="idx2" class="resourceProductionSummaryImg" :src="view.getImage(resGfx)" />
							</div>
						</div>
					</template>
					<!-- End of stack entries -->
				</template>
			</div>
		</div>
	</template>
	<!-- END -->
</template>

<style scoped>
.container {
	display: inline-block;
}

.entry3Div {
	width: 426px;
}

.playerScoreSummaryDiv {
	border: 1px solid white;
	display: inline-block;
	font-size: 20px;
	font-weight: bolder;
	margin: 4px;
	padding: 0px;
	box-sizing: border-box;
}

.flexContainer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0px;
	/* Add spacing between elements */
	margin-bottom: 2px;
}

.lineBreak {
	width: 100%;
	height: 0;
}

.log {
	direction: ltr;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 3px 3px 3px 3px;
	background-size: 35px 34px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
	z-index: 30;
}

.log .header {
	font-size: 0.8em;
}

.mainEntry {
	line-height: 25px;
}

.selectableHistory:hover:not(:has(.stackEntryDiv:hover)) {
	border: 1px solid yellow;
}

.log .new_turn {
	background-color: #000;
	text-align: center;
	color: #fff;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log .rewind {
	background-color: #d4eafd;
	text-align: center;
	color: #000;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log.separator {
	padding: 3px;
}

/*.reverseHistory {
	display: flex;
	flex-direction: column-reverse;
}*/

/** Production */
.buildingProductionSummaryImg {
	width: 50px;
	height: 50px;
	margin-right: 10px;
}

.buildingProductionTransporterImg {
	height: 40px;
	margin-right: 5px;
}

.resourceProductionSummaryImg {
	/*width: 35px; no; allow transporters to be variable width */
	height: 35px;
	width: auto;
	max-width: 56px;
	margin-right: 5px;
}

.rightArrow {
	position: relative;
	width: 50px;
	height: 0;
	border-bottom: 10px solid black;
	display: inline-block;
	vertical-align: middle;
	margin-left: 4px;
	margin-right: 14px;
}

.rightArrow::after {
	content: "";
	width: 0;
	height: 0;
	border-top: 15px solid transparent;
	border-bottom: 15px solid transparent;
	border-left: 30px solid black;
	position: absolute;
	right: -10px;
	top: -10.5px;
}

/******** STACK ITEMS */
.stackEntryDiv {
	border: 2px solid black;
	padding: 2px;
	width: 426px;
}

.stackEntryDiv:hover {
	border: 2px solid yellow;
}

.stackResFollowingTransporterImg {
	width: 20px;
	height: 20px;
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
}

.stackTransporterImg {
	height: 40px;
	margin-right: 2px;
}

.stackContentsImg {
	width: 30px;
	height: 30px;
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
}

.templeIconImg {
	width: 38px;
	height: 38px;
	vertical-align: middle;
}

.mineText {
	fill: gold;
	stroke: black;
	font-weight: 700;
	text-anchor: middle;
	dominant-baseline: central;
	/* 'central' often aligns better than 'middle' in CSS */
	font-size: 175px;
	stroke-width: 10px;
}

.goldMineText {
	fill: gold;
}

.redMineText {
	fill: red;
}

.researchImg {
	height: 47px;
	margin-left: 2px;
	margin-right: 2px;
}
</style>
