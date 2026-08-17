//import * as map from "../../js/RNBmap"
//import * as funcs from "../../js/RNBfuncs"
import * as rf from "../../js/RNBreference"
//import * as controller from "../../js/RNBcontroller"
import * as model from "../../js/RNBmodel"
//import * as util from "../../js/RNButil"
//import * as stack from "../../js/RNBstack"

import { useModelStore } from "../../stores/RNBstore.js"
import { nextTick } from "vue"

export function getBuildingByID_HIST(buildingID) {
	const store = useModelStore()
	let buildingObj = model.getBuildingByID(buildingID)
	if (!buildingObj) {
		buildingObj = store.ALL_BUILDINGS_HIST.find((b) => b.id === buildingID)
		if (!buildingObj) {
			rf.doAdminAlrt("GBBI_HIST: buildingID not found: " + buildingID)
			return
		}
	}
	return buildingObj
}

export function getResByID_HIST(resID) {
	const store = useModelStore()
	// Try to find it in the current resources without triggering the GRBI alert.
	let resObj
	if (typeof resID === "number") {
		resObj = store.ALL_RESOURCES.find((r) => r.id === resID)
	} else {
		resObj = store.ALL_RESOURCES.find((r) => r.uniqueID === resID)
	}
	// But if not found (eg not made yet in the replay, try to find it in the copy of ALL resources up to latest move)
	if (!resObj) {
		if (typeof resID === "number") {
			resObj = store.ALL_RESOURCES_HIST.find((r) => r.id === resID)
		} else {
			resObj = store.ALL_RESOURCES_HIST.find((r) => r.uniqueID === resID)
		}
		if (!resObj) {
			rf.doAdminAlrt("GRBI_HIST: resID not found: " + resID)
			return
		}
	}
	return resObj
}

export function getTransporterByID_HIST(transporterID) {
	const store = useModelStore()
	let transporterObj = model.getTransporterByID(transporterID)
	if (!transporterObj) {
		transporterObj = store.ALL_TRANSPORTERS_HIST.find((t) => t.id === transporterID)
		if (!transporterObj) {
			rf.doAdminAlrt("GTBI_HIST: transporterID not found: " + transporterID)
			return
		}
	}
	return transporterObj
}

export async function setupHistoryHighlight(action, _entry3, computedEntry3, _entry_id) {
	const store = useModelStore()
	store.clearHistoryHelpers()
	await nextTick()

	if (action === rf.HIST_CHOOSE_HOME_TILE) {
		store.historyHelpers.histHexPiecesToHighlight = computedEntry3.hexPiecesToHighlight
	}
	if (action === rf.HIST_PRE_PRODUCTION) {
		for (let i = 0; i < computedEntry3.hexIDSandVertexesToHighlight.length; i++) {
			const entryArr = computedEntry3.hexIDSandVertexesToHighlight[i]
			const hex = model.getHexByID(entryArr[0])
			//const bucket = util.indicesOf(hex.cornerBucketIds, (a) => a === hex.nodeBucketIds[entryArr[1]])
			let nodeId = entryArr[1]
			let bucketId = hex.nodeBucketIds[nodeId]
			//let corners = hex.initialBucketCorners[bucketId]
			store.historyHelpers.histHexPiecesToHighlight.push([hex.hexID, [bucketId]])

			store.historyHelpers.histBuildingsToHighlight.push([0, hex.hexID, bucketId])
		}
	} else if (action === rf.HIST_POST_PRODUCTION) {
		//for (let i = 0; i < computedEntry3.hexIDSandVertexesToHighlight.length; i++) {
		/*const entryArr = computedEntry3.hexIDSandVertexesToHighlight[i]
			const hex = model.getHexByID(entryArr[0])
			let nodeId = entryArr[1]
			let bucketId = hex.nodeBucketIds[nodeId]
			store.historyHelpers.histHexPiecesToHighlight.push([hex.hexID, [bucketId]])
			store.historyHelpers.histBuildingsToHighlight.push([0, hex.hexID, entryArr[1]])*/
		for (let i = 0; i < computedEntry3.secondaryProductions.length; i++) {
			const entryArr = computedEntry3.secondaryProductions[i]
			for (const highlightEntry of entryArr.hexPiecesToHighlight) store.historyHelpers.histHexPiecesToHighlight.push(highlightEntry)
			for (const bldgHighlight of entryArr.buildingsToHighlight) store.historyHelpers.histBuildingsToHighlight.push(bldgHighlight)
		}

		for (let i = 0; i < computedEntry3.metaResearchEntries.length; i++) {
			const entryArr = computedEntry3.metaResearchEntries[i]
			for (const highlightEntry of entryArr.hexPiecesToHighlight) store.historyHelpers.histHexPiecesToHighlight.push(highlightEntry)
		}

		//store.historyHelpers.histHexPiecesToHighlight = computedEntry3.hexPiecesToHighlight
		//store.historyHelpers.histBuildingsToHighlight = computedEntry3.buildingsToHighlight
		//}
	}
}

export async function setupStackHistoryHighlight(_action, hexPiecesToHighlight, riversToHighlight, shoresToHighlight, halfShoresToHighlight, bridgesToHighlight, wallsToHighlight, buildingsToHighlight) {
	const store = useModelStore()
	store.clearHistoryHelpers()
	await nextTick()

	for (const piece of hexPiecesToHighlight) {
		store.historyHelpers.histHexPiecesToHighlight.push(piece)
	}
	for (const river of riversToHighlight) {
		store.historyHelpers.histRiversToHighlight.push(river)
	}
	for (const shore of shoresToHighlight) {
		store.historyHelpers.histShoresToHighlight.push(shore)
	}
	for (const halfShore of halfShoresToHighlight) {
		store.historyHelpers.histHalfShoresToHighlight.push(halfShore)
	}
	for (const bridge of bridgesToHighlight) {
		store.historyHelpers.histBridgesToHighlight.push(bridge)
	}
	for (const wall of wallsToHighlight) {
		store.historyHelpers.histWallsToHighlight.push(wall)
	}
	for (const bldg of buildingsToHighlight) {
		store.historyHelpers.histBuildingsToHighlight.push(bldg)
	}
}

export function changeOfPhaseWithNoConflictDetected(computerHistIdx) {
	const store = useModelStore()
	let oldPhase = -1
	let newPhase = -1

	const entry1 = store.history[computerHistIdx]
	const entry2 = store.history[computerHistIdx + 1]
	if (entry1[0] === rf.HIST_STACK_ACTIONS && rf.PHASE_PRODUCTIONS.includes(entry1[3][0])) oldPhase = rf.PHASE_PRODUCTION_TO
	if (entry1[0] === rf.HIST_STACK_ACTIONS && rf.PHASE_MOVEMENTS.includes(entry1[3][0])) oldPhase = rf.PHASE_MOVEMENT_TO
	if (entry1[0] === rf.HIST_STACK_ACTIONS && rf.PHASE_BUILDINGS.includes(entry1[3][0])) oldPhase = rf.PHASE_BUILDING_TO
	if (entry1[0] === rf.HIST_STACK_ACTIONS && rf.PHASE_WONDERS.includes(entry1[3][0])) oldPhase = rf.PHASE_WONDER_TO
	// Prod is different - primary production should count as wonder in terms of phase detection
	if (entry1[0] === rf.HIST_PRE_PRODUCTION) oldPhase = rf.PHASE_WONDER_TO

	if (entry1[0] === rf.HIST_NO_PRODUCTION_ACTIONS) oldPhase = rf.PHASE_PRODUCTION_TO
	if (entry1[0] === rf.HIST_NO_MOVEMENT_ACTIONS) oldPhase = rf.PHASE_MOVEMENT_TO
	if (entry1[0] === rf.HIST_NO_BUILDING_ACTIONS) oldPhase = rf.PHASE_BUILDING_TO
	if (entry1[0] === rf.HIST_NO_WONDER_ACTIONS) oldPhase = rf.PHASE_WONDER_TO

	if (entry2[0] === rf.HIST_STACK_ACTIONS && rf.PHASE_PRODUCTIONS.includes(entry2[3][0])) newPhase = rf.PHASE_PRODUCTION_TO
	if (entry2[0] === rf.HIST_STACK_ACTIONS && rf.PHASE_MOVEMENTS.includes(entry2[3][0])) newPhase = rf.PHASE_MOVEMENT_TO
	if (entry2[0] === rf.HIST_STACK_ACTIONS && rf.PHASE_BUILDINGS.includes(entry2[3][0])) newPhase = rf.PHASE_BUILDING_TO
	if (entry2[0] === rf.HIST_STACK_ACTIONS && rf.PHASE_WONDERS.includes(entry2[3][0])) newPhase = rf.PHASE_WONDER_TO

	if (entry2[0] === rf.HIST_NO_PRODUCTION_ACTIONS) newPhase = rf.PHASE_PRODUCTION_TO
	if (entry2[0] === rf.HIST_NO_MOVEMENT_ACTIONS) newPhase = rf.PHASE_MOVEMENT_TO
	if (entry2[0] === rf.HIST_NO_BUILDING_ACTIONS) newPhase = rf.PHASE_BUILDING_TO
	if (entry2[0] === rf.HIST_NO_WONDER_ACTIONS) newPhase = rf.PHASE_WONDER_TO

	return [oldPhase >= 0 && newPhase >= 0 && oldPhase !== newPhase, newPhase]
}
