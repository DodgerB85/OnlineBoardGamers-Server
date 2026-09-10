import { useModelStore } from "../stores/RNBstore.js"

import * as rf from "./RNBreference.js"
import * as util from "./RNButil"
import * as model from "./RNBmodel"
import * as loc from "./RNBlocation"
import * as map from "./RNBmap"

// This is only accessed from highlight.updateAllHighlightsForTransporterMode
export function setEligibleItemsToBuild(playerIndex, transporterID) {
	const store = useModelStore()
	store.context.newRoadInfo.splice(0)

	const transporterObj = model.getTransporterByID(transporterID)
	const transporterLocation = transporterObj.location
	if (!loc.isAnyHexLocation(transporterLocation)) {
		return
	}

	const hexID = transporterLocation[1]
	const hexObj = model.getHexByID(hexID, "BUILD")

	let [eligibleBuildings, buildReachable, resourceOnHex, reachableVertexes, bucketIds] = getEligibleMainBuildingsToBuildWithTransporterID(transporterID)
	store.context.eligibleBuildingsToBuild = eligibleBuildings

	const stoneOnHex = resourceOnHex[rf.RES_STONE]
	const boardsOnHex = resourceOnHex[rf.RES_BOARDS]

	// Is road building possible
	if (stoneOnHex > 0) {
		// Roads are built using initial buckets. Need to get back to initial buckets,
		// otherwise building a bridge to make everything bucket 0 might stop you building a road the other side
		let roadBucketIDs = []
		for (const bucketID of bucketIds) roadBucketIDs = roadBucketIDs.concat(model.hexCurrentBucketToInitial(hexID, bucketID))
		if (!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_ROAD) && map.allLandVertexBucketsWithoutRoadsAdjacentTo(hexID, roadBucketIDs).length > 0) store.context.eligibleBuildingsToBuild.push(rf.BLDG_PSEUDO_ROAD)
	}

	// Is power line building possible
	if (store.gameOptions.useElectricity && resourceOnHex[rf.RES_IRON] > 0) {
		let powerLineBucketIDs = []
		for (const bucketID of bucketIds) powerLineBucketIDs = powerLineBucketIDs.concat(model.hexCurrentBucketToInitial(hexID, bucketID))
		if (!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_POWER_LINE) && map.allVertexBucketsWithoutPowerLinesAdjacentTo(hexID, powerLineBucketIDs).length > 0) store.context.eligibleBuildingsToBuild.push(rf.BLDG_PSEUDO_POWER_LINE)
	}

	// Is bridge building possible
	if (stoneOnHex > 0) {
		for (let i = 0; i < hexObj.bridges.length; i++) {
			const bridge = hexObj.bridges[i]
			if (!util.includesArray(hexObj.builtBridges, bridge) && (reachableVertexes.includes(bridge[0]) || reachableVertexes.includes(bridge[1]))) {
				if (!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_BRIDGE)) store.context.eligibleBuildingsToBuild.push(rf.BLDG_PSEUDO_BRIDGE)
				break
			}
		}
	}

	// Is wall build/demolish possible
	if (stoneOnHex >= 1 || boardsOnHex >= 2) {
		// Find reachable side
		let reachableEdgeIDs = buildReachable.filter((loc) => loc[0] === rf.LOCATION_EDGE).map((loc) => loc[1])

		// NB if we are a boat at sea, edges are NOT included yet. So we need to find the edges, and check there is land the other side
		let resIncreaseDueBuildingFromWater = 0
		if (loc.isWaterVertexLocation(transporterLocation)) {
			reachableEdgeIDs = reachableEdgeIDs.concat(map.getEdgeIDsToBuildWallFromWaterHexID(hexID))
			resIncreaseDueBuildingFromWater = 2
		}
		for (let i = 0; i < reachableEdgeIDs.length; i++) {
			const edgeEntry = store.mapData.edgeData[reachableEdgeIDs[i]]
			const wallOwner = edgeEntry.wall[1]
			const isNeutral = wallOwner === -1
			const isMine = wallOwner === playerIndex

			// It's an opponent if it's not neutral and not mine
			const ownedByOpponent = !isNeutral && !isMine

			// Get hex terrains for polder checks
			const hex1 = model.getHexByID(edgeEntry.edgeHexIDs[0])
			const hex2 = model.getHexByID(edgeEntry.edgeHexIDs[1])
			const hex1IsPolder = rf.TERR_IS_POLDER.includes(hex1.currentTerrain)
			const hex2IsPolder = rf.TERR_IS_POLDER.includes(hex2.currentTerrain)
			const eitherIsPolder = hex1IsPolder || hex2IsPolder

			// Polder restrictions: no polder-to-polder or polder-to-sea walls
			const hex1IsSea = hex1.currentTerrain === rf.TERR_SEA
			const hex2IsSea = hex2.currentTerrain === rf.TERR_SEA
			if (eitherIsPolder && (hex1IsPolder && hex2IsPolder)) continue
			if (eitherIsPolder && (hex1IsSea || hex2IsSea)) continue

			// Polder cost modifier: +2 stone/boards when building from/demolishing from a polder
			let polderCostModifier = 0
			if (store.gameOptions.usePolders && eitherIsPolder) polderCostModifier = 2

			// If you own it or it's neutral, and you have level+1 stones, you can build there
			if (!ownedByOpponent && stoneOnHex >= edgeEntry.wall[0] + 1 + resIncreaseDueBuildingFromWater + polderCostModifier) {
				if (!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_WALL)) store.context.eligibleBuildingsToBuild.push(rf.BLDG_PSEUDO_WALL)
			}
			// If you don't own it,you need 1+level boards to demolish
			else if (ownedByOpponent && boardsOnHex >= edgeEntry.wall[0] + 1 + resIncreaseDueBuildingFromWater + polderCostModifier) {
				if (!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_DEMOLISH_WALL)) store.context.eligibleBuildingsToBuild.push(rf.BLDG_PSEUDO_DEMOLISH_WALL)
			}
		}
	}

	// Bomb pseudo-building: need bombs enabled, a bomb on the hex, and a non-strengthened building on the hex
	if (store.gameOptions.useBombs && resourceOnHex[rf.RES_BOMB] > 0) {
		const buildingsOnHex = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, hexID))
		if (buildingsOnHex.some((b) => !b.strengthened)) {
			if (!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_BOMB)) store.context.eligibleBuildingsToBuild.push(rf.BLDG_PSEUDO_BOMB)
		}
	}

	// Strengthen pseudo-building: need bombs enabled, stone on hex, and a non-strengthened building on the hex
	if (store.gameOptions.useBombs && stoneOnHex >= 1) {
		const buildingsOnHex = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, hexID))
		if (buildingsOnHex.some((b) => !b.strengthened)) {
			if (!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_STRENGTHEN)) store.context.eligibleBuildingsToBuild.push(rf.BLDG_PSEUDO_STRENGTHEN)
		}
	}
}

export function getEligibleMainBuildingsToBuildWithTransporterID(transporterID) {
	const store = useModelStore()
	const transporterObj = model.getTransporterByID(transporterID)
	const transporterLocation = transporterObj.location
	const hexID = transporterLocation[1]
	const hexObj = model.getHexByID(hexID)
	const playerIndex = transporterObj.ownerIndex
	const playerObj = store.players[playerIndex]
	let buildingsOnTile = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, hexID))

	// Don't return early if no space - need to return other data, plus possibility of new shaft
	const maxBuildings = hexObj.terrainID === rf.CITY ? 2 : 1
	const spaceForBuilding = buildingsOnTile.length < maxBuildings

	if (hexID < 0) {
		rf.doAdminAlrt("build: SEITB: Transporter Position Error")
		return
	}

	const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, true)
	const resourceOnHex = model.resourceCountByType(reachableResources.map((res) => res.type))

	const reachable = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterLocation, true)
	let reachableVertexes = []
	for (let i = 0; i < reachable.length; i++) {
		if (loc.isLandVertexLocation(reachable[i])) reachableVertexes.push(reachable[i][2])
	}

	const buildReachable = reachable.filter((a) => [rf.NODE_VERTEX, rf.NODE_SIDE].includes(a[0]))

	// Terrain Check
	let currentTerrain = hexObj.currentTerrain
	let isShore = model.isHexIDshore(hexID)

	// BUILDINGS
	let eligibleBuildings = []
	if (spaceForBuilding) {
		function canBeBuilt(stats) {
			if (stats.startingOptionRequired !== rf.SO_BASE_GAME) {
				if (!store.internalStartingOptions.includes(stats.startingOptionRequired)) return false
			}

			if (stats.building >= rf.BLDG_PSEUDO_INDEX) return false // These are done seperately

			// MBAs can only be built if the Management rule is enabled
			if (rf.ALL_MBA_BUILDINGS.includes(stats.building) && !store.gameOptions.useManagement) return false

			// MBAs are one per terrain type - don't offer a type that's already been built in the game
			if (rf.ALL_MBA_BUILDINGS.includes(stats.building) && model.getAllInGameBuildings().some((b) => b.type === stats.building)) return false

			// Check research
			if (stats.requiredResearchIndex >= 0 && store.players[playerIndex].RnD[stats.requiredResearchIndex] !== 1) return false
			const costs = model.resourceCountByType(stats.cost)
			let enoughResources = true
			for (let i = 0; i < rf.ALL_RES.length; i++) {
				if (resourceOnHex[i] < costs[i]) enoughResources = false
			}

			return enoughResources && stats.isValidTerrain(currentTerrain, isShore)
		}

		// 2. Filter, Map, and then Sort
		eligibleBuildings = rf.BUILDING_STATS.filter(canBeBuilt)
			.map((stat) => stat.building)
			.sort((a, b) => {
				return rf.BUILDING_OPTION_DISPLAY_ORDER.indexOf(a) - rf.BUILDING_OPTION_DISPLAY_ORDER.indexOf(b)
			})
	}

	// Check for the possibility to add a new shaft
	if (buildingsOnTile.length > 0) {
		for (const bldgObj of buildingsOnTile) {
			if (bldgObj.type === rf.BLDG_MINE) {
				if (playerObj.RnD[rf.RND_MINE_NEW_SHAFT_IDX] === 1) {
					if (resourceOnHex[rf.RES_FUEL] > 0 && resourceOnHex[rf.RES_IRON] > 0) eligibleBuildings.push(rf.BLDG_PSEUDO_RESHAFT_MINE)
				}
			}
		}
	}

	/*
	let reachableBuckets = model.getVertexBucketsFromLocations(reachable)
	console.log(JSON.stringify(reachableBuckets))
	let bucketIds = []
	for (let i = 0; i < reachableBuckets.length; i++) {
		bucketIds = bucketIds.concat(reachableBuckets[i][1])
	}*/

	// Reachable includes buckets, so just extract the bucket IDs from reachable bucket locations
	const bucketIds = reachable.filter((reachLoc) => loc.isBucketLocation(reachLoc)).map((reachLoc) => reachLoc[2])

	return [eligibleBuildings, buildReachable, resourceOnHex, reachableVertexes, bucketIds]
}
