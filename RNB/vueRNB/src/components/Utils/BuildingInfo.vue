<script setup>
import * as rf from "../../js/RNBreference"
import * as view from "../../js/RNBview"
import * as map from "../../js/RNBmap"
import * as controller from "../../js/RNBcontroller"
import * as loc from "../../js/RNBlocation"
import * as model from "../../js/RNBmodel"
import * as context from "../../js/RNBcontext"
import * as util from "../../js/RNButil"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

const props = defineProps({
	bldg: {
		type: Object,
		required: false,
	},
	// bldgNum is just the raw type - no other info
	bldgNum: {
		type: Number,
		required: false,
	},
	showCost: {
		type: Boolean,
		default: false,
	},
	highlightWholeBuilding: {
		type: Boolean,
		default: false,
	},
})

const buildingStats = computed(() => {
	if (props.bldg !== undefined) return rf.BUILDING_STATS.find((b) => b.building === props.bldg.type)
	return rf.BUILDING_STATS.find((b) => b.building === props.bldgNum)
})

const isHighlighted = computed(() => {
	if (props.bldg !== undefined) return store.context.buildingIDsToHighlight.includes(props.bldg.id)
	return false
})

const showRemainingProd = computed(() => {
	return props.bldg !== undefined && rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)
})

const buildingInputImages = computed(() => {
	const bldgStats = buildingStats.value
	const buildingType = bldgStats.building
	let ret = []

	// Quick emergency check here
	let localCurrentPlayerIndex = controller.currentPlayerIndex()
	if (localCurrentPlayerIndex < 0) localCurrentPlayerIndex = 0

	// Handle BLDG_WAGON_FACTORY as it requires transporter input as well as res
	if (buildingType === rf.BLDG_WAGON_FACTORY) {
		ret.push([])
		ret[0].push("transporter_" + String(rf.DONKEY) + "_" + personal.getCorrectedColour(store.players[localCurrentPlayerIndex].colour))
		ret[0].push(`res_${rf.RES_BOARDS}`)
		ret[0].push(`res_${rf.RES_BOARDS}`)
		return ret
	}
	if (rf.BUILDINGS_WITH_MULTIPLE_MIXABLE_INPUTS.includes(buildingType)) {
		for (let i = 0; i < bldgStats.inputRes.length; i++) {
			ret.push([])
			for (let j = 0; j < bldgStats.inputRes[i].length; j++) {
				ret[i].push(`res_${bldgStats.inputRes[i][j]}`)
			}
		}
		return ret
	}
	// Otherwise there is only 1 input set
	for (let i = 0; i < bldgStats.inputRes.length; i++) {
		ret.push([])
		for (let j = 0; j < bldgStats.inputRes[i].length; j++) {
			ret[i].push(`res_${bldgStats.inputRes[i][j]}`)
		}
	}
	return ret
})

const buildingOutputImages = computed(() => {
	const bldgStats = buildingStats.value
	let ret = []

	// Quick emergency check here
	let localCurrentPlayerIndex = controller.currentPlayerIndex()
	if (localCurrentPlayerIndex < 0) localCurrentPlayerIndex = 0

	if (bldgStats.makesTransporter && bldgStats.outputRes.length > 0 && bldgStats.outputRes[0] > rf.RES_UPPER_LIMIT) {
		return ["transporter_" + bldgStats.outputRes[0] + "_" + personal.getCorrectedColour(store.players[localCurrentPlayerIndex].colour)]
	} else {
		for (let i = 0; i < bldgStats.outputRes.length; i++) {
			ret.push(`res_${bldgStats.outputRes[i]}`)
		}
		return ret
	}
})

const buildingCostImages = computed(() => {
	const bldgStats = buildingStats.value
	let ret = []
	for (let i = 0; i < bldgStats.cost.length; i++) {
		ret.push(`res_${bldgStats.cost[i]}`)
	}
	return ret
})

function getBuildingGfx() {
	if (props.bldg !== undefined) return `bldg_${props.bldg.type}`
	return `bldg_${props.bldgNum}`
}

function clickedNewBuilding(bldgNum) {
	if (!props.highlightWholeBuilding) return
	// First, build the NORMAL building
	if (bldgNum < rf.BLDG_PSEUDO_INDEX) map.checkAddingBuildingToMap(bldgNum)
	else if (bldgNum === rf.BLDG_PSEUDO_RESHAFT_MINE) map.reshaftMine(true)
	// Else If it's a pseudo building, set up the highlights EG WALL / ROAD / ETC
	else if (bldgNum >= rf.BLDG_PSEUDO_INDEX) {
		store.context.hexPiecesToHighlight.splice(0)
		store.context.eligibleWallsToBuild.splice(0)
		store.context.eligibleBridgesToBuild.splice(0)
		store.context.eligibleWallsToDemolish.splice(0)
		store.context.eligibleBuildingsToBuild.splice(0)

		// Set up the general params
		const transporterID = store.context.selectedTransporterIDforTM
		const transporterObj = model.getTransporterByID(transporterID)
		const transporterLocation = transporterObj.location
		const hexID = transporterLocation[1]
		const hexObj = model.getHexByID(hexID, "BUILD2")

		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, true)
		const resourceOnHex = model.resourceCountByType(reachableResources.map((res) => res.type))

		const stoneOnHex = resourceOnHex[rf.RES_STONE]
		const boardsOnHex = resourceOnHex[rf.RES_BOARDS]

		const reachable = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterLocation, true)

		// Get reachable vertexes for BRIDGE building
		let reachableVertexes = []
		for (let i = 0; i < reachable.length; i++) {
			if (loc.isLandVertexLocation(reachable[i])) reachableVertexes.push(reachable[i][2])
		}

		// Get reachable buckets for ROAD building
		let reachableBuckets = model.getVertexBucketsFromLocations(reachable)
		let currentBucketIDs = []
		for (let i = 0; i < reachableBuckets.length; i++) {
			currentBucketIDs = currentBucketIDs.concat(reachableBuckets[i][1])
		}
		// but for roads, we use INITIAL buckets, in case of building either side of bridges.
		// So we need to add the initial buckets
		let bucketIds = []
		for (let i = 0; i < currentBucketIDs.length; i++) {
			let bucketID = currentBucketIDs[i]
			let initialBucketID = model.hexCurrentBucketToInitial(hexID, bucketID)
			bucketIds = bucketIds.concat(initialBucketID)
		}
		// Unique the IDs just to make sure
		bucketIds = [...new Set(bucketIds)]

		// Get reachable vertexes for WALL build / demolish
		const buildReachable = reachable.filter((a) => [rf.NODE_VERTEX, rf.NODE_SIDE].includes(a[0]))

		// Terrain Check
		//let currentTerrain = hex.currentTerrain
		//let isShore = model.isHexIDshore(hexID)

		// END OF general params
		// You must have clicked a transport, so there will be a TM selected
		if (bldgNum === rf.BLDG_PSEUDO_ROAD) {
			store.context.newRoadInfo.splice(0)
			// Boats can often build roads from several banks, but the road-end pieces
			// can't tell those banks apart, so let the player pick the FROM bucket first
			const adjacentPieces = map.allLandVertexBucketsWithoutRoadsAdjacentTo(hexID, bucketIds)
			const buildableBuckets = model.isWaterTransporter(transporterObj.type)
				? bucketIds.filter((b) => map.allLandVertexBucketsWithoutRoadsAdjacentTo(hexID, [b]).length > 0)
				: []
			if (buildableBuckets.length > 1) {
				context.setHexPiecesToHighlight(buildableBuckets.map((b) => [hexID, [b]]))
			} else if (buildableBuckets.length === 1) {
				store.context.newRoadInfo.push([hexID, buildableBuckets])
				context.setHexPiecesToHighlight(map.allLandVertexBucketsWithoutRoadsAdjacentTo(hexID, buildableBuckets))
			} else {
				store.context.newRoadInfo.push([hexID, bucketIds])
				context.setHexPiecesToHighlight(adjacentPieces)
			}
		} else if (bldgNum === rf.BLDG_PSEUDO_BRIDGE) {
			for (let i = 0; i < hexObj.bridges.length; i++) {
				const bridge = hexObj.bridges[i]
				if (!util.includesArray(hexObj.builtBridges, bridge) && (reachableVertexes.includes(bridge[0]) || reachableVertexes.includes(bridge[1]))) {
					context.addEligibleBridgeToBuild([hexObj.hexID, [...bridge]])
				}
			}
		} else if (bldgNum === rf.BLDG_PSEUDO_WALL) {
			// Find reachable side
			let reachableEdgeIDs = buildReachable.filter((loc) => loc[0] === rf.LOCATION_EDGE).map((loc) => loc[1])
			// NB if we are a boat at sea, edges are NOT included yet. So we need to find the edges, and check there is land the other side
			if (loc.isWaterVertexLocation(transporterLocation)) {
				reachableEdgeIDs = reachableEdgeIDs.concat(map.getEdgeIDsToBuildWallFromWaterHexID(hexID))
			}
			for (let i = 0; i < reachableEdgeIDs.length; i++) {
				const edgeEntry = store.mapData.edgeData[reachableEdgeIDs[i]]
				//const edgeEntry = store.mapData.edgeData.find((edge) => edge.edgeID === reachableEdgeIDs[i])
				const hexIds = edgeEntry.edgeHexIDs
				const ownedByOpponent = ![controller.currentPlayerIndex(), -1].includes(edgeEntry.wall[1])
				// If you own it or it's neutral, and you have level+1 stones, you can build there
				if (!ownedByOpponent && stoneOnHex >= edgeEntry.wall[0] + 1) {
					context.addEligibleWallToBuild(hexIds)
				}
			}
		} else if (bldgNum === rf.BLDG_PSEUDO_DEMOLISH_WALL) {
			// Find reachable side
			let reachableEdgeIDs = buildReachable.filter((loc) => loc[0] === rf.LOCATION_EDGE).map((loc) => loc[1])
			// NB if we are a boat at sea, edges are NOT included yet. So we need to find the edges, and check there is land the other side
			if (loc.isWaterVertexLocation(transporterLocation)) {
				reachableEdgeIDs = reachableEdgeIDs.concat(map.getEdgeIDsToBuildWallFromWaterHexID(hexID))
			}
			for (let i = 0; i < reachableEdgeIDs.length; i++) {
				const edgeEntry = store.mapData.edgeData[reachableEdgeIDs[i]]
				const hexIds = edgeEntry.edgeHexIDs
				const ownedByOpponent = ![controller.currentPlayerIndex(), -1].includes(edgeEntry.wall[1])
				if (ownedByOpponent && boardsOnHex >= edgeEntry.wall[0] + 1) {
					store.context.eligibleWallsToDemolish.push(hexIds)
				}
			}
		}
	}
}

function noWaterSpaceForNewTransporter() {
	if (!props.bldg) return false
	if (!rf.ALL_WATER_TRANSPORTER_BUILDINGS.includes(props.bldg.type)) return false
	const possibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(props.bldg.location, false).filter((x) => loc.isAnyWaterLocation(x))
	return possibleLocations.length === 0
}

function transporterLimitIssue() {
	if (!props.bldg) return false
	if (!rf.ALL_TRANSPORTER_ADDING_BUILDINGS.includes(props.bldg.type)) return false
	if (personal.pov < 0) return false
	let playerIndex = personal.pov
	if (personal.trainingGame) playerIndex = controller.currentPlayerIndex()
	let currentTransporters = model.getTransportersByPlayerIndex(playerIndex).length
	let currentLandTransporters = model.getTransportersByPlayerIndexandType(playerIndex, rf.LAND_TYPE).length
	let currentWaterTransporters = model.getTransportersByPlayerIndexandType(playerIndex, rf.WATER_TYPE).length
	let totalProblem = false
	let landProblem = false
	let waterProblem = false
	if (currentTransporters + 1 > 8) totalProblem = true
	if (props.bldg.type === rf.BLDG_TRUCK_FACTORY && currentLandTransporters + 1 > 5) landProblem = true
	if (rf.ALL_WATER_TRANSPORTER_BUILDINGS.includes(props.bldg.type) && currentWaterTransporters + 1 > 5) waterProblem = true
	return [totalProblem, landProblem, waterProblem]
}
</script>

<template>
	<div @click="clickedNewBuilding(bldgNum)" class="flexHolderBuildingDiv" :class="{ wholeBuildingHighlight: highlightWholeBuilding }">
		<!-- Top Row: Image and Stats -->
		<div class="bldgMainInfoRow">
			<!-- Left: Building Image -->
			<div class="flexHolderLeftDiv">
				<span class="bldgNameSpan">
					{{ buildingStats.bldg_name_summary }}
				</span>
				<br />
				<template v-if="!rf.ALL_PSEUDO_BUILDINGS.includes(buildingStats.building)">
					<!-- NORMAL BUILDING-->
					<img v-if="(props.bldg !== undefined && props.bldg.type !== rf.BLDG_MINE) || (props.bldgNum !== undefined && props.bldgNum !== rf.BLDG_MINE)" class="buildingOnHexSummaryImg" :class="{ buildingOnHexSummaryImgHighlight: isHighlighted }" @click="props.bldg !== undefined ? map.clickedBuilding(props.bldg.id) : ''" :src="view.getImage(getBuildingGfx())" />
					<!-- MINE -->
					<svg v-else viewBox="-110 -110 220 220" class="buildingOnHexSummaryImg">
						<circle cx="0" cy="0" r="100" fill="gray" stroke="#734A36" stroke-width="20" />
						<text x="-40" y="10" class="mineText redMineText">
							<tspan v-if="props.highlightWholeBuilding">
								<tspan v-if="store.context.mineSelectionType === 0">3</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 1">4</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 2">0</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 3">5</tspan>
							</tspan>
							<tspan v-else-if="props.bldg !== undefined">{{ props.bldg.remainingMineContent[1] }}</tspan>
							<tspan v-else>-</tspan>
						</text>
						<text class="mineText goldMineText" x="40" y="10">
							<tspan v-if="props.highlightWholeBuilding">
								<tspan v-if="store.context.mineSelectionType === 0">3</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 1">0</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 2">4</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 3">5</tspan>
							</tspan>
							<tspan v-else-if="props.bldg !== undefined">{{ props.bldg.remainingMineContent[0] }}</tspan>
							<tspan v-else>-</tspan>
						</text>
					</svg>
				</template>
				<!-- RESHAFT MINE -->
				<template v-else-if="buildingStats.building === rf.BLDG_PSEUDO_RESHAFT_MINE">
					<svg viewBox="-110 -110 220 220" class="buildingOnHexSummaryImg">
						<circle cx="0" cy="0" r="100" fill="gray" stroke="#734A36" stroke-width="20" />
						<text x="-40" y="10" class="mineText redMineText">
							<tspan v-if="props.highlightWholeBuilding">
								<tspan v-if="store.context.mineSelectionType === 0">3</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 1">4</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 2">0</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 3">5</tspan>
							</tspan>
							<tspan v-else-if="props.bldg !== undefined">{{ props.bldg.remainingMineContent[1] }}</tspan>
							<tspan v-else>-</tspan>
						</text>
						<text class="mineText goldMineText" x="40" y="10">
							<tspan v-if="props.highlightWholeBuilding">
								<tspan v-if="store.context.mineSelectionType === 0">3</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 1">0</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 2">4</tspan>
								<tspan v-else-if="store.context.mineSelectionType === 3">5</tspan>
							</tspan>
							<tspan v-else-if="props.bldg !== undefined">{{ props.bldg.remainingMineContent[0] }}</tspan>
							<tspan v-else>-</tspan>
						</text>
					</svg>
				</template>
			</div>

			<!-- Right: Stacked Input and Output -->
			<div class="flexHolderRightDiv">
				<div>
					<template v-if="showCost">
						<strong>Cost:&nbsp;</strong>
						<img v-for="(imgName, idx) in buildingCostImages" :key="idx" class="resProdSummaryImg" :src="view.getImage(imgName)" />
						<span v-if="buildingStats.building === rf.BLDG_PSEUDO_WALL || buildingStats.building === rf.BLDG_PSEUDO_DEMOLISH_WALL">x ?</span>
						<br />
					</template>
					<!-- Don't show inputs / outputs for pseudo buildings-->
					<template v-if="!rf.ALL_PSEUDO_BUILDINGS.includes(buildingStats.building)">
						<template v-if="buildingInputImages[0].length === 0">
							<span class="primaryTextSpan">Primary</span>
						</template>
						<template v-else-if="buildingInputImages.length === 1">
							<strong>Input:&nbsp;</strong>
							<img v-for="(imgName, idx) in buildingInputImages[0]" :key="idx" :class="imgName.startsWith('transporter') ? 'transporterProdSummaryImg' : 'resProdSummaryImg'" :src="view.getImage(imgName)" />
						</template>
						<template v-else>
							<strong><u>Input</u></strong>
							<br />
							<template v-for="(resSet, idx) in buildingInputImages" :key="idx">
								<span v-if="idx > 0">&nbsp;/&nbsp;</span>
								<img v-for="(imgName, idx) in resSet" :key="idx" :class="imgName.startsWith('transporter') ? 'transporterProdSummaryImg' : 'resProdSummaryImgSmall'" :src="view.getImage(imgName)" />
							</template>
						</template>

						<div style="margin-top: auto">
							<strong>Output:&nbsp;</strong>
							<template v-if="buildingStats.building !== rf.BLDG_MINE">
								<img v-for="(imgName, idx) in buildingOutputImages" :key="idx" :class="imgName.startsWith('transporter') ? 'transporterProdSummaryImg' : 'resProdSummaryImg'" :src="view.getImage(imgName)" />
							</template>
							<template v-else-if="buildingStats.building === rf.BLDG_MINE">
								<template v-if="props.highlightWholeBuilding">
									<template v-if="store.context.mineSelectionType === 0 || store.context.mineSelectionType === 3">
										<img class="resProdSummaryImg" :src="view.getImage(`res_${rf.RES_IRON}`)" />
										/
										<img class="resProdSummaryImg" :src="view.getImage(`res_${rf.RES_GOLD}`)" />
									</template>
									<img v-else-if="store.context.mineSelectionType === 1" class="resProdSummaryImg" :src="view.getImage(`res_${rf.RES_IRON}`)" />
									<img v-else-if="store.context.mineSelectionType === 2" class="resProdSummaryImg" :src="view.getImage(`res_${rf.RES_GOLD}`)" />
								</template>
								<template v-else-if="props.bldg !== undefined">
									<img v-if="props.bldg.remainingMineContent[1] > 0" class="resProdSummaryImg" :src="view.getImage(`res_${rf.RES_IRON}`)" />
									<span v-if="props.bldg.remainingMineContent[0] > 0 && props.bldg.remainingMineContent[1] > 0">/</span>
									<img v-if="props.bldg.remainingMineContent[0] > 0" class="resProdSummaryImg" :src="view.getImage(`res_${rf.RES_GOLD}`)" />
								</template>
							</template>
						</div>
					</template>
					<!-- RE-SHAFT MINE TEXT-->
					<template v-else-if="buildingStats.building === rf.BLDG_PSEUDO_RESHAFT_MINE">Add to mine stock</template>
				</div>
			</div>
		</div>

		<!-- Mine options (inside the border)-->
		<div v-if="props.highlightWholeBuilding && (props.bldgNum === rf.BLDG_MINE || props.bldgNum === rf.BLDG_PSEUDO_RESHAFT_MINE)" @click.stop class="mineBuildingOptions">
			<!-- Line 1: Standard -->
			<div class="radioLine">
				<label class="mineRadioLabel" @click.stop>
					<input type="radio" :value="0" v-model="store.context.mineSelectionType" />
					Standard
				</label>
			</div>

			<!-- Line 2: Specialized (The Row Wrapper) -->
			<div class="radioLine" v-if="controller.currentPlayerObj().RnD[rf.RND_MINE_SPEC_IDX] === 1">
				<label class="mineRadioLabel" @click.stop>
					<input type="radio" :value="1" v-model="store.context.mineSelectionType" />
					Spec (Iron)
				</label>
				<label class="mineRadioLabel" @click.stop>
					<input type="radio" :value="2" v-model="store.context.mineSelectionType" />
					Spec (Gold)
				</label>
			</div>

			<!-- Line 3: Big -->
			<div class="radioLine" v-if="controller.currentPlayerObj().RnD[rf.RND_MINE_BIG_IDX] === 1">
				<label class="mineRadioLabel" @click.stop>
					<input type="radio" :value="3" v-model="store.context.mineSelectionType" />
					Big
				</label>
			</div>
		</div>

		<!-- Bottom: Remaining Production (Now inside the border) -->
		<div v-if="showRemainingProd" class="remainingProdRow">
			<strong>Remaining production: {{ bldg.remainingConversions * buildingStats.outputRes.length }}</strong>
		</div>
		<div v-if="noWaterSpaceForNewTransporter()" class="remainingProdRow">
			<strong class="warningSpan">No space for a new water transporter</strong>
		</div>
		<div v-if="transporterLimitIssue()[0] || transporterLimitIssue()[1] || transporterLimitIssue()[2]" class="remainingProdRow">
			<strong v-if="transporterLimitIssue()[0]" class="warningSpan">Max 8 transporters</strong>
			<strong v-if="transporterLimitIssue()[1]" class="warningSpan">Max 5 land transporters</strong>
			<strong v-if="transporterLimitIssue()[2]" class="warningSpan">Max 5 water transporters</strong>
		</div>
	</div>
</template>

<style scoped>
.flexHolderBuildingDiv {
	display: flex;
	flex-direction: column;
	/* Stack Top Row and Bottom Row vertically */
	align-items: stretch;
	/* Allow children to fill width for consistent borders */
	gap: 0px;
	margin-bottom: 5px;
	border: 2px solid black;
	padding: 0px;
	/* Added padding so text isn't touching the border */
}

/* New helper for the top section */
.bldgMainInfoRow {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}

.remainingProdRow {
	text-align: center;
	border-top: 1px solid #ccc;
	/* Optional: subtle separator line */
	padding-top: 0px;
	margin-top: 0px;
}

.wholeBuildingHighlight {
	border: 4px solid yellow;
}

.wholeBuildingHighlight:hover {
	border: 4px solid lightgreen;
	cursor: pointer;
}

.flexHolderLeftDiv {
	display: flex;
	flex-direction: column;
	align-items: center;
	/* Centers name over the image */
	margin-right: 10px;
	/* Space between image and the Input/Output text */
}

.bldgNameSpan {
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 2px;
	text-align: center;
	white-space: nowrap;
	/* Keeps name on one line */
	text-decoration: underline;
}

.flexHolderRightDiv {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	height: 100%;
	line-height: 32px;
}

.resProdSummaryImg {
	height: 30px;
	width: 30px;
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
	vertical-align: middle;
}

.resProdSummaryImgSmall {
	height: 25px;
	width: 25px;
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
	vertical-align: middle;
}

.transporterProdSummaryImg {
	height: 30px;
	margin-right: 2px;
	vertical-align: middle;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
	margin: 2px;
}

.buildingOnHexSummaryImg {
	width: 60px;
	height: 60px;
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
}

.buildingOnHexSummaryImgHighlight {
	border: 4px solid yellow;
}

.buildingOnHexSummaryImgHighlight:hover {
	border: 4px solid lightgreen;
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

.primaryTextSpan {
	background-color: palegreen;
}

.mineBuildingOptions {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 5px;
	text-align: center;
}

.radioLine {
	display: flex;
	flex-direction: row;
	/* Forces children (labels) to stay in a line */
	gap: 10px;
	/* Space between Iron and Gold */
	align-items: center;
	margin: auto;
}

.mineRadioLabel {
	display: inline-flex;
	/* Keeps content tight */
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	cursor: pointer;
	border-radius: 4px;
	white-space: nowrap;
	/* Prevents "Spec (Iron)" from wrapping internally */
}

.mineRadioLabel:hover {
	background-color: lightblue;
}
</style>
