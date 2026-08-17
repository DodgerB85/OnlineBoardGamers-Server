<script setup>
/** This it the zoom panel hex main display
 * See bucket for individual buckets
 *
 */

//import * as view from "../js/RNBview.js"
import * as rf from "../../js/RNBreference"
import * as view from "../../js/RNBview"
import * as map from "../../js/RNBmap"
//import * as hd from "../../js/RNBhex"
//import * as controller from "../../js/RNBcontroller.js"
import * as model from "../../js/RNBmodel"
import * as loc from "../../js/RNBlocation"
import * as computes from "../../js/RNBcomputes"
import * as vec from "../../js/RNBvector"
//import * as coord from "../../js/RNBcoordinate"
import * as hd from "../../js/RNBhex"

import BucketDisplay from "./BucketDisplay.vue"
import WonderScreen from "../WonderScreen.vue"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()
import { computed, /*reactive,*/ ref, watch } from "vue"

const resOnTransporterWidthZP = rf.DEFAULT_RES_WIDTH / 2.5
const gooseAreaHeight = 200 / 1.5

// DO NOT USE THIS ANYWHERE ELSE. IT CAUSES EXTRA COMPUTES
function getComputedHexByID(hexID) {
	const computedHexesValue = computes.computedHexes.value // Access the computed property's value
	let hexObj = computedHexesValue.find((h) => h.hexID === hexID)
	if (!hexObj) {
		rf.doAdminAlrt(`getComputedHexByID: hexID not found: ${hexID}`)
		return null // Return null or handle the error as needed
	}
	return hexObj
}

const computedZoomData = computed(() => {
	const hexID = store.mapData.zoomData.hexID
	const computedData =
		//reactive(
		{
			// NB MAYBE CHANGE THIS TO JUST HEX?
			...getComputedHexByID(hexID),
			bucketData: [],
			wallData: [],
			waterTransporters: [],
			transportersOnHex: [],
			rawVertices: [],
			rawchitLocations: [],
			dockedTransporters: [
				[[], [], []],
				[[], [], []],
				[[], [], []],
				[[], [], []],
				[[], [], []],
				[[], [], []],
			],
		} //)
	let hex = model.getHexByID(hexID)

	if (hexID === -1) return computedData

	// Raw vectors
	computedData.rawVertices = computedData.vertices
	computedData.rawchitLocations = computedData.chitLocations

	// Process bucket data
	model.hexVertexBucketsCurrent(hexID).forEach((bucketId) => {
		const bucket = { id: bucketId, transporters: [], resources: [], buildings: [] }

		// Transporters in bucket
		bucket.transporters = model
			.getAllInGameTransporters()
			.filter((t) => loc.isInVertexBucket(t.location, hexID, bucketId))
			.map((transporter) => {
				// Clone to avoid mutating original reactive objects
				const transporterCopy = JSON.parse(JSON.stringify(transporter))
				// Transporters have a RAW position, independent of hexes, to allow animations.
				// So we need to find transporters on the hex, and calc their position according to their vertex
				const vertexIndex = transporterCopy.location[2]
				const transporterStats = rf.getTransporterStats(transporterCopy.type)
				transporterCopy.imgWidth = transporterStats.width / 1.5
				transporterCopy.imgHeight = transporterStats.height / 1.5
				//if (hex.baseTerrain === rf.TERR_SEA) transporterCopy.transporterPos = vec.sum(vec.scaleBy(0.5, computedData.rawVertices[vertexIndex]), vec.scaleBy(0.5, [-transporterCopy.imgWidth, -transporterCopy.imgHeight]))
				//else
				transporterCopy.transporterPos = vec.sum(computedData.rawVertices[vertexIndex], vec.scaleBy(0.5, [-transporterCopy.imgWidth, -transporterCopy.imgHeight]))

				// Resources on transporter
				transporterCopy.resourcesOnTransporter = model.resourcesOnTransport(transporterCopy.id)

				// Transporter on transporter
				const [transOnTrans] = model.transportersOnTransporter(transporterCopy.id)
				transporterCopy.transportOnTransporterCopy = transOnTrans ? JSON.parse(JSON.stringify(transOnTrans)) : { id: -1 }
				if (transporterCopy.transportOnTransporterCopy.id >= 0) {
					const carriedTransporterStats = rf.getTransporterStats(transporterCopy.transportOnTransporterCopy.type)
					transporterCopy.transportOnTransporterCopy.imgWidth = carriedTransporterStats.width / 1.5
					transporterCopy.transportOnTransporterCopy.imgHeight = carriedTransporterStats.height / 1.5
				}

				// Resources following transporter
				transporterCopy.resourcesFollowingTransporter = model.resourcesFollowingTransporter(transporterCopy.id)

				return transporterCopy
			})

		// Resources in bucket
		bucket.resources = model.getAllInGameResources().filter((r) => loc.isBucketLocation(r.location) && r.location[1] === hexID && r.location[2] === bucketId)

		// buildings in bucket
		bucket.buildings = model.getAllInGameBuildings().filter((b) => loc.isBucketLocation(b.location) && b.location[1] === hexID && b.location[2] === bucketId)

		// home markers in bucket
		//bucket.homeMarkers = model.homeMarkersOnHex(hexID)
		bucket.homeMarkers = store.ALL_HOME_MARKERS.filter((hm) => hm.location[1] === hexID && hm.location[2] === bucketId)

		computedData.bucketData.push(bucket)
	})

	if (hex.riverType !== rf.RIVER_NONE) {
		// Reset to exactly 2 slots (most hexes have 0–2 rivers)
		computedData.waterTransporters = [[], []] // index 0 = river 0, index 1 = river 1
		model
			.getAllInGameTransporters()
			.filter((t) => loc.getLocationType(t.location) === rf.LOCATION_RIVER_VERTEX && t.location[1] === hexID)
			.forEach((transporter) => {
				const riverVertex = transporter.location[2] // 0 or 1

				// Clone to avoid mutating original reactive objects
				const clonedTransporter = JSON.parse(JSON.stringify(transporter))

				// Transporters have a RAW position, independent of hexes, to allow animations.
				// So we need to find transporters on the hex, and calc their position according to their riverID
				const transporterStats = rf.getTransporterStats(clonedTransporter.type)
				clonedTransporter.imgWidth = transporterStats.width / 1.5
				clonedTransporter.imgHeight = transporterStats.height / 1.5

				clonedTransporter.transporterPos = vec.sum(hex.riverVertices[riverVertex], vec.scaleBy(0.5, [-clonedTransporter.imgWidth, -clonedTransporter.imgHeight]))
				// Resources on transporter
				clonedTransporter.resourcesOnTransporter = model.resourcesOnTransport(clonedTransporter.id)

				// Transporter on transporter
				const [transOnTrans] = model.transportersOnTransporter(clonedTransporter.id)
				clonedTransporter.transportOnTransporterCopy = transOnTrans ? JSON.parse(JSON.stringify(transOnTrans)) : { id: -1 }
				if (clonedTransporter.transportOnTransporterCopy.id >= 0) {
					const carriedTransporterStats = rf.getTransporterStats(clonedTransporter.transportOnTransporterCopy.type)
					clonedTransporter.transportOnTransporterCopy.imgWidth = carriedTransporterStats.width / 1.5
					clonedTransporter.transportOnTransporterCopy.imgHeight = carriedTransporterStats.height / 1.5
				}

				// Resources following transporter
				clonedTransporter.resourcesFollowingTransporter = model.resourcesFollowingTransporter(clonedTransporter.id)

				// Push into correct sub-array
				const riverVertexIdx = loc.getRiverIDfromAnyHexIDandRiverVertex(hexID, riverVertex)
				computedData.waterTransporters[riverVertexIdx].push(clonedTransporter)
			})
	}

	// Process docked transporters
	const dockedTransporters = model.getAllInGameTransporters().filter((t) => loc.isDockedLocation(t.location) && t.location[1] === hexID)
	for (let i = 0; i < dockedTransporters.length; i++) {
		const dockedTransporter = dockedTransporters[i]
		const dockedTransporterCopy = JSON.parse(JSON.stringify(dockedTransporter))

		// Transporters have a RAW position, independent of hexes, to allow animations.
		// So we need to find transporters on the hex, and calc their position according to their riverID
		const transporterStats = rf.getTransporterStats(dockedTransporterCopy.type)
		dockedTransporterCopy.imgWidth = transporterStats.width / 1.5
		dockedTransporterCopy.imgHeight = transporterStats.height / 1.5

		dockedTransporterCopy.resourcesOnTransporter = model.resourcesOnTransport(dockedTransporterCopy.id)

		const [transOnTrans] = model.transportersOnTransporter(dockedTransporterCopy.id)
		dockedTransporterCopy.transportOnTransporterCopy = transOnTrans ? JSON.parse(JSON.stringify(transOnTrans)) : { id: -1 }
		if (dockedTransporterCopy.transportOnTransporterCopy.id >= 0) {
			const carriedTransporterStats = rf.getTransporterStats(dockedTransporterCopy.transportOnTransporterCopy.type)
			dockedTransporterCopy.transportOnTransporterCopy.imgWidth = carriedTransporterStats.width / 1.5
			dockedTransporterCopy.transportOnTransporterCopy.imgHeight = carriedTransporterStats.height / 1.5
		}

		// Resources following transporter
		dockedTransporterCopy.resourcesFollowingTransporter = model.resourcesFollowingTransporter(dockedTransporterCopy.id)

		const side = dockedTransporterCopy.location[2]
		const bank = dockedTransporterCopy.location[3]
		const dockedOffset = dockedTransporterCopy.location[4] ?? rf.DOCKED_OFFSET_NONE
		const midPoint = store.MID_POINTS_POINTY[side]
		const offset = bank === rf.BANK_NONE ? midPoint : bank === rf.BANK_LEFT ? store.VERTICES_POINTY_EXT[side] : store.VERTICES_POINTY_EXT[(side + 1) % 6]
		const centerPt = vec.scaleBy(0.5, vec.sum(midPoint, offset))

		// Apply offset from location if specified
		let finalPt = centerPt
		if (dockedOffset !== rf.DOCKED_OFFSET_NONE) {
			const leftVertex = store.VERTICES_POINTY_EXT[side]
			const rightVertex = store.VERTICES_POINTY_EXT[(side + 1) % 6]
			const sideDirection = vec.subtract(rightVertex, leftVertex)
			// Use larger offset when no bank (boats coming from same direction need more spread)
			const offsetMultiplier = bank === rf.BANK_NONE ? 0.5 / 1.5 : 0.5 / 3
			const sideOffset = vec.scaleBy(offsetMultiplier, sideDirection)

			if (dockedOffset === rf.DOCKED_OFFSET_CW) {
				finalPt = vec.sum(centerPt, sideOffset)
			} else if (dockedOffset === rf.DOCKED_OFFSET_ACW) {
				finalPt = vec.subtract(centerPt, sideOffset)
			}
		}

		dockedTransporterCopy.transporterPos = vec.sum(finalPt, vec.scaleBy(-0.5, [dockedTransporterCopy.imgWidth, dockedTransporterCopy.imgHeight]))
		computedData.dockedTransporters[dockedTransporterCopy.location[2]][dockedTransporterCopy.location[3]].push(dockedTransporterCopy)
	}

	// Process wall data
	computedData.wallData = store.mapData.edgeData
		.filter((e) => e.edgeHexIDs.includes(hexID) && e.wall[0] !== -1)
		.map((wall) => ({
			...JSON.parse(JSON.stringify(wall)),
			edgeHexIDs: wall.edgeHexIDs[0] === hexID ? wall.edgeHexIDs : [wall.edgeHexIDs[1], wall.edgeHexIDs[0]],
		}))

	// Hex pieces to highlight under transporters
	computedData.hexPiecesToHighlightUnderTransporters = store.context.hexPiecesToHighlightUnderTransporters.filter((entry) => entry[0] === store.mapData.zoomData.hexID)

	// Hex pieces to highlight
	computedData.hexPiecesToHighlight = store.context.hexPiecesToHighlight.filter((entry) => entry[0] === store.mapData.zoomData.hexID)

	// eligibleBridgesToBuild
	computedData.eligibleBridgesToBuild = store.context.eligibleBridgesToBuild.filter((entry) => entry[0] === store.mapData.zoomData.hexID)

	// riversToHighlight
	computedData.riversToHighlight = store.context.riversToHighlight.filter((entry) => entry[0] === store.mapData.zoomData.hexID)

	// shores to highlight
	computedData.shoresToHighlight = store.context.shoresToHighlight.filter((entry) => entry[0] === store.mapData.zoomData.hexID)

	// half shores to highlight
	computedData.halfShoresToHighlight = store.context.halfShoresToHighlight.filter((entry) => entry[0] === store.mapData.zoomData.hexID)

	// eligible walls to build
	computedData.eligibleWallsToBuild = store.context.eligibleWallsToBuild
		.filter((entry) => entry[0] === hexID || entry[1] === hexID)
		.map((entry) => {
			// If the second ID is the zoom ID, swap them so zoomID is always at index [0]
			return entry[1] === hexID ? [entry[1], entry[0], entry[2]] : entry
		})

	// eligible walls to demolish
	computedData.eligibleWallsToDemolish = store.context.eligibleWallsToDemolish
		.filter((entry) => entry[0] === hexID || entry[1] === hexID)
		.map((entry) => {
			// If the second ID is the zoom ID, swap them so zoomID is always at index [0]
			return entry[1] === hexID ? [entry[1], entry[0], entry[2]] : entry
		})
	// Transporters on hex
	//computedData.transportersOnHex = computedData.bucketData.flatMap((bucket) => bucket.transporters).concat(computedData.waterTransporters.flatten())
	computedData.transportersOnHex = [
		// All bucket transporters
		...computedData.bucketData.flatMap((bucket) => bucket.transporters),

		// All river transporters from both river segments (0 and 1)
		...computedData.waterTransporters.flat(),

		// All docked transporters
		...computedData.dockedTransporters.flatMap((side) => side.flat().filter((transporter) => transporter && Object.keys(transporter).length > 0)),
	]
	return computedData
})

// Rotated points:
// 0.000,-463.127 399.692,-231.564 399.692,231.564 0.000,463.127 -399.692,231.564 -399.692,-231.564

function getresFollowingTransporterPos(maxPos, idx) {
	if (maxPos <= 3) return [-rf.DEFAULT_RES_WIDTH / 2.5, idx * 50]
	return [-rf.DEFAULT_RES_WIDTH / 2.5, idx * 30]
}

function getresOnTransporterPos(idx) {
	if (idx < 4) return [(rf.DEFAULT_RES_WIDTH / 3) * idx, -rf.DEFAULT_RES_HEIGHT / 8]

	const rowIdx = idx - 4
	return [rf.DEFAULT_RES_WIDTH / 6 + rf.DEFAULT_RES_WIDTH / 3 * rowIdx, rf.DEFAULT_RES_HEIGHT / 8  ]
}

// TEMP VERTEX DRAGGING
const draggingIdx = ref(null)
const localVertices = ref({ nodes: [], buildings: [], homeMarkerFallbacks: [], riverVertices: [] })

// Editable nodeVertexDefinitions
const editableNodeVertexDefinitions = ref([])

// Computed properties to display numbers with 2 decimal places
const displayNodeVertexDefinitions = computed(() => {
	return editableNodeVertexDefinitions.value.map((def) => [def[0], def[1], typeof def[2] === "number" ? Number(def[2].toFixed(2)) : def[2], typeof def[3] === "number" ? Number(def[3].toFixed(2)) : def[3]])
})

// Sync local state whenever the hex selection or store data changes
watch(
	() => {
		// 1. Check ID first. If -1, return a signal value immediately.
		if (store.mapData.zoomData.hexID === -1) return null

		// 2. Only if ID is valid, we access the computed property.
		return {
			nodes: computedZoomData.value?.nodeVertexDefinitions.map((a, n) => [n, [computedZoomData.value?.nodeBucketIds[n], a[0] === "absolute"], a]),
			buildings: computedZoomData.value?.chitLocations.map((a, n) => [n, [computedZoomData.value?.chitLocationBucketIds[n], computedZoomData.value?.chitLocationBuildingEligible[n]], a]),
			homeMarkerFallbacks: computedZoomData.value?.homeMarkerFallbackPositions?.map((a, n) => [n, a !== null, a]) || [],
			riverVertices: computedZoomData.value?.riverVertices?.map((pos, n) => [n, pos]) || [],
			rawNodeVertexDefinitions: computedZoomData.value?.nodeVertexDefinitions || [],
		}
	},
	(newVerts) => {
		// If the getter returned null, reset and exit.
		if (!newVerts) {
			localVertices.value = { nodes: [], buildings: [], homeMarkerFallbacks: [], riverVertices: [] }
			editableNodeVertexDefinitions.value = []
			return
		}

		/*function processVertex(type) {
			return ([n, a, v]) => {
				// Call the function and capture the result
				const result = computes.computedToXY.value(v)
				const [type, x, y] = v

				// If result is undefined/null, return a safe fallback like [0, 0]
				if (!result) {
					console.warn(`toXY returned undefined for ${type} #${n} at coord:`, v)
					return [n, a, v, [0, 0]]
				}

				return [n, a, [type, Math.round(x), Math.round(y)], result.map(Math.round)]
			}
		}*/
		function processVertex(kind) {
			// renamed 'type' to 'kind' to avoid confusion with coord types
			return ([n, a, v]) => {
				// Handle null values (for homeMarkerFallbackPositions)
				if (v === null) {
					return [n, a, null, [0, 0]]
				}

				// 1. Check if 'v' is already a calculated point [x, y]
				// If it's a point, it won't have a RELATIVE/ABSOLUTE constant at index 0
				const isAlreadyCalculated = typeof v[0] === "number" && v.length === 2

				let result
				let coordDef

				if (isAlreadyCalculated) {
					// It's already [x, y], no need to transform
					result = v
					coordDef = [0, v[0], v[1]] // Mock a definition for your Math.round logic below
				} else {
					// It's a definition [TYPE, ...], transform it
					result = computes.computedToXY.value(v)
					coordDef = v
				}

				if (!result) {
					console.warn(`toXY failed for ${kind} #${n}:`, v)
					return [n, a, v, [0, 0]]
				}

				// 2. Destructure the coordDef (either the original or our mock)
				const [cType, cX, cY] = coordDef

				return [n, a, [cType, Math.round(cX), Math.round(cY)], [Math.round(result[0]), Math.round(result[1])]]
			}
		}

		// 3. Process the data into integers.
		localVertices.value = {
			nodes: newVerts.nodes.map(processVertex("node")),
			buildings: newVerts.buildings.map(processVertex("building")),
			homeMarkerFallbacks: newVerts.homeMarkerFallbacks.map(processVertex("homeMarkerFallback")),
			riverVertices: newVerts.riverVertices.map(([n, pos]) => {
				// riverVertices are already XY positions [x, y]
				if (!pos) return [n, [0, 0], [0, 0]]
				return [n, pos, [Math.round(pos[0]), Math.round(pos[1])]]
			}),
		}

		// Sync editable nodeVertexDefinitions
		editableNodeVertexDefinitions.value = newVerts.rawNodeVertexDefinitions.map((def) => [...def])
	}
)

const getSVGCoords = (event) => {
	const svg = document.getElementById("zoomSVG")
	const CTM = svg.getScreenCTM()
	return {
		x: (event.clientX - CTM.e) / CTM.a,
		y: (event.clientY - CTM.f) / CTM.d,
	}
}

const doDrag = (event) => {
	if (draggingIdx.value === null) return

	const coords = getSVGCoords(event)

	const x = Math.round(coords.x)
	const y = Math.round(coords.y)

	// Update local array [x, y]
	const [key, index] = draggingIdx.value

	if (key === "riverVertices") {
		// riverVertices structure: [n, pos, [Math.round(pos[0]), Math.round(pos[1])]]
		localVertices.value[key][index][1] = [x, y] // Update original position
		localVertices.value[key][index][2] = [x, y] // Update rounded position
	} else {
		// Other vertices structure: [n, a, v, [x, y]]
		localVertices.value[key][index][2] = ["absolute", x, y]
		localVertices.value[key][index][3] = [x, y]
	}
}
// END TEMP VERTEX DRAGGING

// Functions to update nodeVertexDefinition coordinates
const updateNodeVertexDefinition = (index, coordIndex, value) => {
	if (editableNodeVertexDefinitions.value[index] && localVertices.value.nodes[index]) {
		editableNodeVertexDefinitions.value[index][coordIndex] = value

		// Update the actual vertex position
		const def = editableNodeVertexDefinitions.value[index]

		if (def[0] === "relative" && def.length >= 4) {
			// Convert relative to absolute coordinates
			const [_type, corner, y, z] = def // X is the corner index

			// Use actual polygon corner coordinates

			// Actual polygon corners: 0.000,-463.127 399.692,-231.564 399.692,231.564 0.000,463.127 -399.692,231.564 -399.692,-231.564
			const hexCorners = [
				[0.0, -463.127], // Corner 0: top
				[399.692, -231.564], // Corner 1: top-right
				[399.692, 231.564], // Corner 2: bottom-right
				[0.0, 463.127], // Corner 3: bottom
				[-399.692, 231.564], // Corner 4: bottom-left
				[-399.692, -231.564], // Corner 5: top-left
			]

			if (corner >= 0 && corner < hexCorners.length) {

				const closestCorner = hexCorners[corner]
				const nextCorner = hexCorners[(corner + 1) % 6]

				// Calculate position based on relative coordinates
				const edgeVector = [nextCorner[0] - closestCorner[0], nextCorner[1] - closestCorner[1]]

				let position = [closestCorner[0] + edgeVector[0] * y, closestCorner[1] + edgeVector[1] * y]

				// Move towards center based on z value (only if z > 0)
				if (z > 0) {
					const center = [0, 0]
					const toCenter = [center[0] - position[0], center[1] - position[1]]
					position[0] += toCenter[0] * z
					position[1] += toCenter[1] * z
				}

				// Update localVertices with proper Vue reactivity
				const updatedNode = [...localVertices.value.nodes[index]]
				updatedNode[2] = ["relative", corner, y, z]
				updatedNode[3] = [Math.round(position[0]), Math.round(position[1])]
				localVertices.value.nodes[index] = updatedNode
			}
		} else if (def[0] === "absolute" && def.length >= 3) {
			// Handle absolute coordinates
			const [, x, y] = def
			const updatedNode = [...localVertices.value.nodes[index]]
			updatedNode[2] = ["absolute", x, y]
			updatedNode[3] = [x, y]
			localVertices.value.nodes[index] = updatedNode
		}
	}
}

const handleYInput = (index, event) => {
	const value = parseFloat(event.target.value) || 0
	updateNodeVertexDefinition(index, 2, value)
}

const handleZInput = (index, event) => {
	const value = parseFloat(event.target.value) || 0
	updateNodeVertexDefinition(index, 3, value)
}

const incrementCoord = (index, coordIndex, delta = 1) => {
	if (editableNodeVertexDefinitions.value[index]) {
		const currentValue = editableNodeVertexDefinitions.value[index][coordIndex] || 0
		const newValue = coordIndex === 0 ? currentValue + delta : Math.max(0, Math.min(1, currentValue + delta * 0.1))
		updateNodeVertexDefinition(index, coordIndex, newValue)
	}
}

function getResGfxPos(resGfx, flag) {
	// 0 = x, 1 = y, 2 = xCenter, 3 = yCenter
	if (flag === 0) return vec.sum(resGfx.pos, vec.scaleBy(-0.5, [resGfx.width / 1.5, resGfx.height / 1.5]))[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH) / 4
	if (flag === 1) return vec.sum(resGfx.pos, vec.scaleBy(-0.5, [resGfx.width / 1.5, resGfx.height / 1.5]))[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT) / 4
	if (flag === 2) return resGfx.pos[0] + (resGfx.offsets * rf.DEFAULT_RES_WIDTH * store.RATIO) / 6
	if (flag === 3) return resGfx.pos[1] + (resGfx.offsets * rf.DEFAULT_RES_HEIGHT * store.RATIO) / 6
}

function getResFollowingTrandporterTransform(transporter, idx2) {
	const maxPos = transporter.resourcesFollowingTransporter.length
	const [baseX, baseY] = getresFollowingTransporterPos(maxPos, idx2)
	return `translate(${baseX},${baseY})`
}

function isTransporterSelectable(transporterID) {
	if (store.context.transporterIDsToHighlight.includes(transporterID)) return true
	return false
}

function getComputedTransporterHighlightFilter(transporterObj) {
	// Deal with being carried transp first
	if (loc.isOnAnyTransporter(transporterObj.location)) return "url(#f_black_ZP)"
	// 1. Is it currently selected in the store?
	const isSelected = store.context.selectedTransporterIDforTM === transporterObj.id

	// 2. Is it currently being hovered AND is it actually selectable?
	// (We only want the green glow if it's a valid move)
	const shouldShowGreen = isSelected || (transporterObj.isHovered && isTransporterSelectable(transporterObj.id))
	let filter = "f_black_ZP"
	if (shouldShowGreen) filter = "f_lightGreen_ZP"
	else if (isTransporterSelectable(transporterObj.id)) filter = "f_yellow_ZP"

	return `url(#${filter})`
}

const computedTotalNeutralBricks = computed(() => {
	const neutralBricksUsed = store.wonderBricks.filter((num) => num === 8 || num === 9).length
	if (personal.soloGame) return neutralBricksUsed - 17
	return neutralBricksUsed
})

const computedMaxNeutralBricks = computed(() => {
	if (store.CUSTOM_RULES.includes(rf.CR_USE_ONLY_28_NEUTRAL_BRICKS)) return 28
	if (personal.soloGame) return 20
	return 33
})
</script>

<template>
	<div id="mapZoomPanelDiv">
		<!-- VERTEX POSITIONING -->
		<div v-if="store.mapData.zoomData.hexID >= 0 && rf.DEBUG_VERTEX_USERS.includes(personal.name)">
			<br />
			nodeVertexDefinitions: [
			<span v-for="(def, idx) in displayNodeVertexDefinitions" :key="idx">
				<br />
				[ "{{ def[0] }}", {{ def[1] }},
				<input :value="def[2]" @input="handleYInput(idx, $event)" style="width: 35px; margin-right: 5px" placeholder="Y" step="0.1" />
				<button @click="incrementCoord(idx, 2, -0.1)" style="margin-right: 2px">-</button>
				<button @click="incrementCoord(idx, 2, 0.1)" style="margin-right: 10px">+</button>

				<input :value="def[3]" @input="handleZInput(idx, $event)" style="width: 35px; margin-right: 5px" placeholder="Z" step="0.1" />
				<button @click="incrementCoord(idx, 3, -0.1)" style="margin-right: 2px">-</button>
				<button @click="incrementCoord(idx, 3, 0.1)" style="margin-right: 5px">+</button>
				],
			</span>
			],
		</div>
		<div v-if="store.mapData.zoomData.hexID >= 0 && rf.DEBUG_VERTEX_USERS.includes(personal.name)">
			<br />
			chitLocations: [
			<span v-for="(vert, idx) in localVertices.buildings" :key="idx">
				<br />
				{{ vert[2] }},
			</span>
			],
		</div>
		<div v-if="store.mapData.zoomData.hexID >= 0 && rf.DEBUG_VERTEX_USERS.includes(personal.name)">
			<br />
			homeMarkerFallbackPositions: [
			<span v-for="(fallback, idx) in localVertices.homeMarkerFallbacks" :key="idx">
				<br />
				{{ fallback[2] }},
			</span>
			],
		</div>
		<div v-if="store.mapData.zoomData.hexID >= 0 && rf.DEBUG_VERTEX_USERS.includes(personal.name)">
			<br />
			riverVertexDefinitions: [
			<span v-for="(riverVertex, idx) in localVertices.riverVertices" :key="idx">
				<br />
				["absolute", {{ riverVertex[2][0] }}, {{ riverVertex[2][1] }}],
			</span>
			],
		</div>
		<!-- END VERTEX POSITIONING -->
		<div id="noZoomHexDiv" v-if="store.mapData.zoomData.hexID === -1">Mouse over or long press a hex to view it in detail</div>
		<div v-else>
			<div id="zoomHexDiv">
				<svg @mousemove="doDrag" @mouseup="draggingIdx = null" @mouseleave="draggingIdx = null" v-if="store.mapData.zoomData.hexID >= 0" id="zoomSVG" :viewBox="store.hexStyle === rf.POINTY ? '-400 -464 800 928' : '-462.692 -401.000 925 802'">
					<defs>
						<filter id="f_black_ZP" x="-100%" y="-100%" width="300%" height="300%">
							<!-- 1. Color it black -->
							<feFlood flood-color="black" result="flood" />
							<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

							<!-- 2. Dynamic Expansion (Thickness) -->
							<!-- Use :radius to multiply your base size by the store RATIO -->
							<feMorphology operator="dilate" radius="8" in="color" result="thick" />

							<!-- 3. Dynamic Smoothing -->
							<!-- Scale the blur proportionally to keep the donkey ears sharp -->
							<feGaussianBlur in="thick" stdDeviation="3" result="smooth" />

							<!-- 4. Sharpen the edge -->
							<feComponentTransfer in="smooth">
								<feFuncA type="linear" slope="4" intercept="-1" />
							</feComponentTransfer>
						</filter>

						<filter id="f_yellow_ZP" x="-100%" y="-100%" width="300%" height="300%">
							<!-- 1. Color it Yellow -->
							<feFlood flood-color="yellow" result="flood" />
							<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

							<!-- 2. Dynamic Expansion (Thickness) -->
							<!-- Use :radius to multiply your base size by the store RATIO -->
							<feMorphology operator="dilate" radius="7.5" in="color" result="thick" />

							<!-- 3. Dynamic Smoothing -->
							<!-- Scale the blur proportionally to keep the donkey ears sharp -->
							<feGaussianBlur in="thick" stdDeviation="3" result="smooth" />

							<!-- 4. Sharpen the edge -->
							<feComponentTransfer in="smooth">
								<feFuncA type="linear" slope="4" intercept="-1" />
							</feComponentTransfer>
						</filter>

						<filter id="f_lightGreen_ZP" x="-100%" y="-100%" width="300%" height="300%">
							<!-- 1. Color it lightgreen -->
							<feFlood flood-color="lightgreen" result="flood" />
							<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

							<!-- 2. Dynamic Expansion (Thickness) -->
							<!-- Use :radius to multiply your base size by the store RATIO -->
							<feMorphology operator="dilate" radius="7.5" in="color" result="thick" />

							<!-- 3. Dynamic Smoothing -->
							<!-- Scale the blur proportionally to keep the donkey ears sharp -->
							<feGaussianBlur in="thick" stdDeviation="3" result="smooth" />

							<!-- 4. Sharpen the edge -->
							<feComponentTransfer in="smooth">
								<feFuncA type="linear" slope="4" intercept="-1" />
							</feComponentTransfer>
						</filter>

						<filter id="f_orange_ZP" x="-100%" y="-100%" width="300%" height="300%">
							<!-- 1. Color it orange -->
							<feFlood flood-color="orange" result="flood" />
							<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

							<!-- 2. Dynamic Expansion (Thickness) -->
							<!-- Use :radius to multiply your base size by the store RATIO -->
							<feMorphology operator="dilate" radius="12.5" in="color" result="thick" />

							<!-- 3. Dynamic Smoothing -->
							<!-- Scale the blur proportionally to keep the donkey ears sharp -->
							<feGaussianBlur in="thick" stdDeviation="3" result="smooth" />

							<!-- 4. Sharpen the edge -->
							<feComponentTransfer in="smooth">
								<feFuncA type="linear" slope="4" intercept="-1" />
							</feComponentTransfer>
						</filter>

						<filter id="f_red_ZP" x="-100%" y="-100%" width="300%" height="300%">
							<!-- 1. Color it red -->
							<feFlood flood-color="red" result="flood" />
							<feComposite in="flood" in2="SourceGraphic" operator="in" result="color" />

							<!-- 2. Dynamic Expansion (Thickness) -->
							<!-- Use :radius to multiply your base size by the store RATIO -->
							<feMorphology operator="dilate" radius="12.5" in="color" result="thick" />

							<!-- 3. Dynamic Smoothing -->
							<!-- Scale the blur proportionally to keep the donkey ears sharp -->
							<feGaussianBlur in="thick" stdDeviation="3" result="smooth" />

							<!-- 4. Sharpen the edge -->
							<feComponentTransfer in="smooth">
								<feFuncA type="linear" slope="4" intercept="-1" />
							</feComponentTransfer>
						</filter>
					</defs>
					<!-- MAP LAYER 0 - THE BIG HEX, ROTATED AS REQUIRED-->
					<!-- IN THE ZOOM PANEL, THIS SHOULD BE JUST THE TERRAIN IMAGE -->
					<!-- Forest replaced by grass should just set the display to grass -->
					<!-- BASE HEX -->
					<polygon :points="hd.getHexPoints(false, 1, true)" class="hexPolygon" :fill="`url(#pattern${computedZoomData.hexGfx})`" :transform="`rotate(${store.hexStyle === rf.POINTY ? computedZoomData.rotation * 60 : computedZoomData.rotation * 60 + 30} 0 0)`" />

					<!-- TEMP - VERTEX LOCATION DISPLAY -->
					<!-- DRAGGABLE VERTICES -->
					<g v-if="rf.DEBUG_USERS.includes(personal.name)">
						<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 30 : 0} 0 0)`">
							<g v-for="(vert, idx) in localVertices.nodes" :key="idx">
								<!-- moveable nodes -->
								<circle v-if="vert[1][0] === 0 && vert[1][1]" :cx="vert[3][0]" :cy="vert[3][1]" r="50" fill="white" stroke="black" stroke-width="2" />
								<circle v-if="vert[1][0] === 1 && vert[1][1]" :cx="vert[3][0]" :cy="vert[3][1]" r="50" fill="orange" stroke="black" stroke-width="2" />
								<circle v-if="vert[1][0] === 2 && vert[1][1]" :cx="vert[3][0]" :cy="vert[3][1]" r="50" fill="red" stroke="black" stroke-width="2" />

								<!-- static nodes -->
								<circle v-else-if="vert[1][0] === 0 && !vert[1][1]" :cx="vert[3][0]" :cy="vert[3][1]" r="30" fill="white" stroke="black" stroke-width="2" />
								<circle v-else-if="vert[1][0] === 1 && !vert[1][1]" :cx="vert[3][0]" :cy="vert[3][1]" r="30" fill="orange" stroke="black" stroke-width="2" />
								<circle v-else-if="vert[1][0] === 2 && !vert[1][1]" :cx="vert[3][0]" :cy="vert[3][1]" r="30" fill="red" stroke="black" stroke-width="2" />
								<text :x="vert[3][0]" :y="vert[3][1]" text-anchor="middle" dominant-baseline="central" fill="black" font-size="40" style="pointer-events: none; user-select: none">
									{{ vert[0] }}
								</text>
							</g>
							<!-- RIVER VERTICES -->
							<g v-for="(vert, idx) in localVertices.riverVertices" :key="'river-' + idx">
								<circle :cx="vert[2][0]" :cy="vert[2][1]" r="35" fill="lightblue" stroke="blue" stroke-width="2" style="cursor: move" @mousedown="draggingIdx = ['riverVertices', idx]" />
								<text :x="vert[2][0]" :y="vert[2][1]" text-anchor="middle" dominant-baseline="central" fill="darkblue" font-size="30" style="pointer-events: none; user-select: none">
									{{ vert[0] }}
								</text>
							</g>
							<g v-for="(vert, idx) in localVertices.buildings" :key="idx">
								<!-- buildings as squares -->
								<rect :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} ${vert[3][0]} ${vert[3][1]})`" v-if="vert[1][0] === 0 && vert[1][1]" :x="vert[3][0] - 60" :y="vert[3][1] - 60" width="120" height="120" fill="white" stroke="black" stroke-width="2" style="cursor: move" @mousedown="draggingIdx = ['buildings', idx]" />
								<rect :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} ${vert[3][0]} ${vert[3][1]})`" v-if="vert[1][0] === 1 && vert[1][1]" :x="vert[3][0] - 60" :y="vert[3][1] - 60" width="120" height="120" fill="orange" stroke="black" stroke-width="2" style="cursor: move" @mousedown="draggingIdx = ['buildings', idx]" />
								<rect :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} ${vert[3][0]} ${vert[3][1]})`" v-if="vert[1][0] === 2 && vert[1][1]" :x="vert[3][0] - 60" :y="vert[3][1] - 60" width="120" height="120" fill="red" stroke="black" stroke-width="2" style="cursor: move" @mousedown="draggingIdx = ['buildings', idx]" />
								<!-- resource loations -->
								<rect :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} ${vert[3][0]} ${vert[3][1]})`" v-else-if="vert[1][0] === 0 && !vert[1][1]" :x="vert[3][0] - 40" :y="vert[3][1] - 40" width="80" height="80" fill="white" stroke="black" stroke-width="2" style="cursor: move" @mousedown="draggingIdx = ['buildings', idx]" />
								<rect :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} ${vert[3][0]} ${vert[3][1]})`" v-else-if="vert[1][0] === 1 && !vert[1][1]" :x="vert[3][0] - 40" :y="vert[3][1] - 40" width="80" height="80" fill="orange" stroke="black" stroke-width="2" style="cursor: move" @mousedown="draggingIdx = ['buildings', idx]" />
								<rect :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} ${vert[3][0]} ${vert[3][1]})`" v-else-if="vert[1][0] === 2 && !vert[1][1]" :x="vert[3][0] - 40" :y="vert[3][1] - 40" width="80" height="80" fill="red" stroke="black" stroke-width="2" style="cursor: move" @mousedown="draggingIdx = ['buildings', idx]" />
								<!-- The Index Number (Always visible) -->
								<text :x="vert[3][0]" :y="vert[3][1]" text-anchor="middle" dominant-baseline="central" fill="black" font-size="40" style="pointer-events: none; user-select: none">
									{{ vert[0] }}
								</text>
							</g>
						</g>
					</g>

					<!-- HOME MARKER FALLBACK POSITIONS -->
					<g v-if="rf.DEBUG_USERS.includes(personal.name)">
						<g :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} 0 0)`">
							<g v-for="(fallback, idx) in localVertices.homeMarkerFallbacks" :key="idx">
								<rect v-if="fallback[1]" :x="fallback[3][0] - 60" :y="fallback[3][1] - 60" width="120" height="120" fill="yellow" stroke="black" stroke-width="2" style="opacity: 0.7; cursor: move" @mousedown="draggingIdx = ['homeMarkerFallbacks', idx]" />
								<text v-if="fallback[1]" :x="fallback[3][0]" :y="fallback[3][1]" text-anchor="middle" dominant-baseline="central" fill="black" font-size="30" style="pointer-events: none; user-select: none; font-weight: bold">H{{ idx }}</text>
							</g>
						</g>
					</g>

					<!-- HOME MARKERS -->
					<g v-for="(homeMarker, idx2) in computedZoomData.homeMarkerGfxs" :key="idx2">
						<rect class="homeMarkerRect" :x="vec.sum(homeMarker.pos, vec.scaleBy(-0.5, [homeMarker.width / 1.5, homeMarker.height / 1.5]))[0]" :y="vec.sum(homeMarker.pos, vec.scaleBy(-0.5, [homeMarker.width / 1.5, homeMarker.height / 1.5]))[1]" :width="homeMarker.width / 1.5" :height="homeMarker.height / 1.5" :fill="`url(#pattern_${homeMarker.img})`" />
					</g>
					<!-- ROTATABLE ITEMS -->
					<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 30 : 0} 0 0)`">
						<!-- BRIDGES -->
						<!-- BRIDGE DEBUG !!! ALWAYS SHOW THIS !!! -->
						<g v-if="rf.DEBUG_USERS.includes(personal.name)">
							<g v-for="(bridgeEntry, bridgeIdx) in computedZoomData.bridges" :key="bridgeIdx">
								<!-- BRIDGE RIVER LINE - WHITE -->
								<g v-for="(entry, idx) in computedZoomData.bridges" :key="idx">
									<line v-if="rf.DEBUG_USERS.includes(personal.name)" :x1="view.getBridgeSVGpath(store.mapData.zoomData.hexID, entry, false, false, true, true)[0][0]" :y1="view.getBridgeSVGpath(store.mapData.zoomData.hexID, entry, false, false, true, true)[0][1]" :x2="view.getBridgeSVGpath(store.mapData.zoomData.hexID, entry, false, false, true, true)[1][0]" :y2="view.getBridgeSVGpath(store.mapData.zoomData.hexID, entry, false, false, true, true)[1][1]" stroke="white" :stroke-width="20" fill="none" />
									<circle :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} ${view.getBridgeSVGpath(store.mapData.zoomData.hexID, entry, false, false, true, false, true)[0]} ${view.getBridgeSVGpath(store.mapData.zoomData.hexID, entry, false, false, true, false, true)[1]})`" :cx="view.getBridgeSVGpath(store.mapData.zoomData.hexID, entry, false, false, true, false, true)[0]" :cy="view.getBridgeSVGpath(store.mapData.zoomData.hexID, entry, false, false, true, false, true)[1]" :r="20" stroke="white" :stroke-width="20" fill="none" />
								</g>
								<!-- BRIDGE POINTS - RED -->
								<line v-if="rf.DEBUG_USERS.includes(personal.name)" :transform="`rotate(${store.hexStyle === rf.FLAT ? 0 : 0} 0 0)`" :x1="computedZoomData.vertices[bridgeEntry[0]][0] * 1" :y1="computedZoomData.vertices[bridgeEntry[0]][1] * 1" :x2="computedZoomData.vertices[bridgeEntry[1]][0] * 1" :y2="computedZoomData.vertices[bridgeEntry[1]][1] * 1" stroke="red" :stroke-width="20" fill="none" />
							</g>
						</g>
						<g v-for="(bridgeEntry, bridgeIdx) in computedZoomData.builtBridges" :key="bridgeIdx">
							<path :d="view.getBridgeSVGpath(store.mapData.zoomData.hexID, bridgeEntry, false, false, true).bridgeD" stroke="black" :stroke-width="40" fill="none" />
						</g>
						<!-- ROADS-->
						<path :d="computedZoomData.fullRoadPathZP" stroke="#1C2526" stroke-width="60" stroke-linejoin="round" stroke-linecap="round" />
						<path :d="computedZoomData.fullRoadPathZP" stroke="#F5F5F5" stroke-width="7" stroke-dasharray="25 20" fill="none" />
					</g>
					<!-- BUILDINGS-->
					<!-- NON MINES -->
					<g v-for="(bldg, idx2) in computedZoomData.buildingGfxs" :key="idx2">
						<rect
							:class="store.context.buildingIDsToHighlight.includes(bldg.id) ? 'bldgHighlight' : 'bldgNormal'"
							@click="map.clickedBuilding(bldg.id)"
							:x="vec.sum(bldg.pos, vec.scaleBy(-0.5, [bldg.width / 1.5, bldg.height / 1.5]))[0]"
							:y="vec.sum(bldg.pos, vec.scaleBy(-0.5, [bldg.width / 1.5, bldg.height / 1.5]))[1]"
							:width="bldg.width / 1.5"
							:height="bldg.height / 1.5"
							:fill="`url(#pattern_${bldg.img})`"
							:style="{
								strokeWidth: store.context.buildingIDsToHighlight.includes(bldg.id) ? 20 * store.RATIO : 2 * store.RATIO,
							}" />
					</g>
					<!-- MINE -->
					<g v-if="computedZoomData.mineData.length > 0">
						<circle class="mineSVGcircle" :cx="computedZoomData.mineData[1][0]" :cy="computedZoomData.mineData[1][1]" :r="rf.DEFAULT_BLDG_WIDTH / 1.5 / 2" fill="gray" stroke="#734A36" :stroke-width="50 * store.RATIO" />
						<!-- Iron Number -->
						<text :x="computedZoomData.mineData[1][0] - (computedZoomData.mineData[2][1] >= 10 ? 55 : 40)" :y="computedZoomData.mineData[1][1] + 20" text-anchor="middle" dominant-baseline="middle" class="mineText ironText" :style="{ fontSize: computedZoomData.mineData[2][1] >= 10 ? '100px' : '175px', strokeWidth: computedZoomData.mineData[2][1] >= 10 ? '6px' : '10px' }">{{ computedZoomData.mineData[2][1] }}</text>
						<!-- Gold Number -->
						<text :x="computedZoomData.mineData[1][0] + (computedZoomData.mineData[2][0] >= 10 ? 55 : 40)" :y="computedZoomData.mineData[1][1] + 20" text-anchor="middle" dominant-baseline="middle" class="mineText goldText" :style="{ fontSize: computedZoomData.mineData[2][0] >= 10 ? '100px' : '175px', strokeWidth: computedZoomData.mineData[2][0] >= 10 ? '6px' : '10px' }">{{ computedZoomData.mineData[2][0] }}</text>
					</g>
					<!-- RESOURCES-->
					<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 30 : 0} 0 0)`">
						<g v-for="(resGfx, idx2) in computedZoomData.allResourceGfxs" :key="idx2">
							<g :transform="store.hexStyle === rf.FLAT ? `rotate(-30 ${getResGfxPos(resGfx, 2)} ${getResGfxPos(resGfx, 3)})` : ''">
								<rect
									:style="{
										strokeWidth: store.context.resourceIDsToHighlight.includes(resGfx.id) ? 10 : 5,
									}"
									:class="store.context.resourceIDsToHighlight.includes(resGfx.id) ? 'resHighlight' : 'resNormal'"
									@click="map.clickedRes($event, store.mapData.zoomData.hexID, resGfx.id)"
									:x="getResGfxPos(resGfx, 0)"
									:y="getResGfxPos(resGfx, 1)"
									:width="resGfx.width / 1.5"
									:height="resGfx.height / 1.5"
									:fill="`url(#pattern_${resGfx.img})`" />
								<!-- The Triangle Indicators -->
								<polygon v-if="resGfx.movedThisTurn" :points="view.getCornerTrianglePoints([getResGfxPos(resGfx, 0) + resGfx.width / 1.5 / 2, getResGfxPos(resGfx, 1) + resGfx.height / 1.5 / 2], resGfx.width / 1.5, resGfx.height / 1.5, 0)" fill="red" stroke="#000" stroke-width="5" />
								<polygon v-if="resGfx.movedThisTurn" :points="view.getCornerTrianglePoints([getResGfxPos(resGfx, 0) + resGfx.width / 1.5 / 2, getResGfxPos(resGfx, 1) + resGfx.height / 1.5 / 2], resGfx.width / 1.5, resGfx.height / 1.5, 1)" fill="red" stroke="#000" stroke-width="5" />
								<polygon v-if="resGfx.movedThisTurn" :points="view.getCornerTrianglePoints([getResGfxPos(resGfx, 0) + resGfx.width / 1.5 / 2, getResGfxPos(resGfx, 1) + resGfx.height / 1.5 / 2], resGfx.width / 1.5, resGfx.height / 1.5, 2)" fill="red" stroke="#000" stroke-width="5" />
								<polygon v-if="resGfx.movedThisTurn" :points="view.getCornerTrianglePoints([getResGfxPos(resGfx, 0) + resGfx.width / 1.5 / 2, getResGfxPos(resGfx, 1) + resGfx.height / 1.5 / 2], resGfx.width / 1.5, resGfx.height / 1.5, 3)" fill="red" stroke="#000" stroke-width="5" />
							</g>
						</g>
					</g>

					<!-- HEX PIECES TO Highlight UNDER TRANSPORTERS -->
					<g v-for="(entry, idx) in computedZoomData.hexPiecesToHighlightUnderTransporters" :key="idx">
						<path @click="map.clickedHighlight(entry, $event)" :id="'ZP_hexHighlight' + idx" :d="view.getHexHighlightPath(entry[0], entry[1], true)" :transform="`rotate(${store.hexStyle === rf.FLAT ? computedZoomData.rotation * 60 + 30 : computedZoomData.rotation * 60} 0 0)`" class="highlightPath" />
					</g>

					<!-- TRANSPORRTERS -->
					<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 30 : 0} 0 0)`">
						<g v-for="(transporter, idx) in computedZoomData.transportersOnHex" :key="idx" :transform="`rotate(${store.hexStyle === rf.FLAT ? -30 : 0} ${transporter.transporterPos[0] + transporter.imgWidth / 2} ${transporter.transporterPos[1] + transporter.imgHeight / 2}) translate(${transporter.transporterPos[0]}, ${transporter.transporterPos[1]})`">
							<!-- GOOSE FOLLOWING AREA -->
							<rect v-if="store.context.action === rf.ACT_TM_CHOOSE_GOOSE_LOCATION && store.context.selectedTransporterIDforTM === transporter.id" @click="map.clickedGooseArea(transporter.id, store.context.gooseID)" :x="-resOnTransporterWidthZP - 40" :y="-10" :rx="10" :ry="10" :stroke-width="20" class="resFollowingAreaSVGrect" :width="resOnTransporterWidthZP" :height="gooseAreaHeight" />

							<!-- RES FOLLOWING TRANSPORTER-->
							<g v-for="(computedResObj, idx2) in transporter.resourcesFollowingTransporter" :key="idx2">
								<g :transform="getResFollowingTrandporterTransform(transporter, idx2)">
									<rect
										:class="store.context.resourceIDsToHighlight.includes(computedResObj.id) ? 'resHighlight' : 'resNormal'"
										:style="{
											pointerEvents: store.context.resourceIDsToHighlight.includes(computedResObj.id) ? 'painted' : 'none',
										}"
										@click="map.clickedResFollowingTransporter(computedResObj.id)"
										:width="rf.DEFAULT_RES_WIDTH / 2.5"
										:height="rf.DEFAULT_RES_HEIGHT / 2.5"
										:fill="`url(#pattern_${computedResObj.gfx})`" />
									<!-- The Triangle Indicators -->
									<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([rf.DEFAULT_RES_WIDTH / 2.5 / 2, rf.DEFAULT_RES_HEIGHT / 2.5 / 2], rf.DEFAULT_RES_WIDTH / 2.5, rf.DEFAULT_RES_HEIGHT / 2.5, 0, 1)" fill="red" stroke="#000" stroke-width="5" />
									<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([rf.DEFAULT_RES_WIDTH / 2.5 / 2, rf.DEFAULT_RES_HEIGHT / 2.5 / 2], rf.DEFAULT_RES_WIDTH / 2.5, rf.DEFAULT_RES_HEIGHT / 2.5, 1, 1)" fill="red" stroke="#000" stroke-width="5" />
									<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([rf.DEFAULT_RES_WIDTH / 2.5 / 2, rf.DEFAULT_RES_HEIGHT / 2.5 / 2], rf.DEFAULT_RES_WIDTH / 2.5, rf.DEFAULT_RES_HEIGHT / 2.5, 2, 1)" fill="red" stroke="#000" stroke-width="5" />
									<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([rf.DEFAULT_RES_WIDTH / 2.5 / 2, rf.DEFAULT_RES_HEIGHT / 2.5 / 2], rf.DEFAULT_RES_WIDTH / 2.5, rf.DEFAULT_RES_HEIGHT / 2.5, 3, 1)" fill="red" stroke="#000" stroke-width="5" />
								</g>
							</g>
							<!-- TRANSPORTER -->
							<!-- THE SINGLE SHADOW LAYER -->
							<!-- This one image will become the entire outline thanks to the filter -->
							<image v-if="transporter.movedThisTurn" :width="transporter.imgWidth" :height="transporter.imgHeight" :xlink:href="view.getImage('transporter_' + String(transporter.type) + '_' + personal.getCorrectedColour(store.players[transporter.ownerIndex].colour))" :filter="transporter.remainingMoves > 0 ? 'url(#f_orange_ZP)' : 'url(#f_red_ZP)'" style="pointer-events: none" />
							<image :width="transporter.imgWidth" :height="transporter.imgHeight" :xlink:href="view.getImage('transporter_' + String(transporter.type) + '_' + personal.getCorrectedColour(store.players[transporter.ownerIndex].colour))" :filter="getComputedTransporterHighlightFilter(transporter)" style="pointer-events: none" />

							<!-- THE MAIN TRANSPORTER IMAGE -->
							<image
								@click="map.clickedTransporter(transporter.id)"
								:width="transporter.imgWidth"
								@mouseover="transporter.isHovered = true"
								@mouseleave="transporter.isHovered = false"
								:height="transporter.imgHeight"
								:xlink:href="view.getImage('transporter_' + String(transporter.type) + '_' + personal.getCorrectedColour(store.players[transporter.ownerIndex].colour))"
								preserveAspectRatio="none"
								class="transporterBaseImage"
								:style="{
									pointerEvents: isTransporterSelectable(transporter.id) ? 'painted' : 'painted',
								}" />
							<!-- RESOURCES ON TRANSPORTER-->
							<g v-for="(computedResObj, idx2) in transporter.resourcesOnTransporter" :key="idx2">
								<g :transform="`translate(${getresOnTransporterPos(idx2)[0]},${getresOnTransporterPos(idx2)[1]})`">
									<rect
										:class="store.context.resourceIDsToHighlight.includes(computedResObj.id) ? 'resHighlight' : 'resNormal'"
										:style="{
											pointerEvents: store.context.resourceIDsToHighlight.includes(computedResObj.id) ? 'painted' : 'none',
										}"
										@click="map.clickedResOnTransporter(transporter.id, computedResObj.id)"
										:width="resOnTransporterWidthZP"
										:height="resOnTransporterWidthZP"
										:fill="`url(#pattern_${computedResObj.gfx})`" />
									<!-- The Triangle Indicators -->
									<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidthZP / 2, resOnTransporterWidthZP / 2], resOnTransporterWidthZP, resOnTransporterWidthZP, 0, 0.75)" fill="red" stroke="#000" stroke-width="5" />
									<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidthZP / 2, resOnTransporterWidthZP / 2], resOnTransporterWidthZP, resOnTransporterWidthZP, 1, 0.75)" fill="red" stroke="#000" stroke-width="5" />
									<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidthZP / 2, resOnTransporterWidthZP / 2], resOnTransporterWidthZP, resOnTransporterWidthZP, 2, 0.75)" fill="red" stroke="#000" stroke-width="5" />
									<polygon v-if="computedResObj.movedTransporterID >= 0" :points="view.getCornerTrianglePoints([resOnTransporterWidthZP / 2, resOnTransporterWidthZP / 2], resOnTransporterWidthZP, resOnTransporterWidthZP, 3, 0.75)" fill="red" stroke="#000" stroke-width="5" />
								</g>
							</g>
							<!-- TRANSPORTERS ON TRANSPORTER-->
							<g v-if="transporter.transportOnTransporterCopy.id >= 0">
								<image :width="transporter.transportOnTransporterCopy.imgWidth / 2" :height="transporter.transportOnTransporterCopy.imgHeight / 2" :xlink:href="view.getImage('transporter_' + String(transporter.transportOnTransporterCopy.type) + '_' + personal.getCorrectedColour(store.players[transporter.transportOnTransporterCopy.ownerIndex].colour))" :filter="getComputedTransporterHighlightFilter(transporter.transportOnTransporterCopy)" style="pointer-events: none" />

								<image
									@click="map.clickedTransporter(transporter.transportOnTransporterCopy.id)"
									:class="{
										transporterHighlightCarried: store.context.transporterIDsToHighlight.includes(transporter.transportOnTransporterCopy.id),
										transporterNormalCarried: store.context.selectedTransporterIDforTM !== 1 && !store.context.transporterIDsToHighlight.includes(transporter.transportOnTransporterCopy.id),
									}"
									:width="transporter.transportOnTransporterCopy.imgWidth / 2"
									:height="transporter.transportOnTransporterCopy.imgHeight / 2"
									:xlink:href="view.getImage('transporter_' + String(transporter.transportOnTransporterCopy.type) + '_' + personal.getCorrectedColour(store.players[transporter.transportOnTransporterCopy.ownerIndex].colour))"
									preserveAspectRatio="none"
									:style="{
										pointerEvents: store.context.transporterIDsToHighlight.includes(transporter.transportOnTransporterCopy.id) ? 'painted' : 'painted',
									}" />
							</g>
						</g>
					</g>

					<!-- WALLS -->
					<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 30 : 0} 0 0)`">
						<g v-for="(wallData, idx) in computedZoomData.wallData" :key="idx">
							<g v-if="wallData.wall[0] > 0">
								<polygon
									:points="view.getWallSVGpointsFromHexID(wallData.edgeHexIDs[0], wallData.edgeHexIDs[1], false, false, true)"
									class="wallPolygon"
									:style="{
										fill: wallData.wall[1] === -1 ? 'white' : personal.getCorrectedColourHex(store.players[wallData.wall[1]].colour),
									}" />
								<text
									v-if="wallData.wall[0] > 1"
									:x="view.getWallSVGpointsFromHexID(wallData.edgeHexIDs[0], wallData.edgeHexIDs[1], false, true, true)[0]"
									:y="view.getWallSVGpointsFromHexID(wallData.edgeHexIDs[0], wallData.edgeHexIDs[1], false, true, true)[1]"
									:transform="store.hexStyle === rf.POINTY ? '' : `rotate(-30 ${view.getWallSVGpointsFromHexID(wallData.edgeHexIDs[0], wallData.edgeHexIDs[1], false, true, true)[0]} ${view.getWallSVGpointsFromHexID(wallData.edgeHexIDs[0], wallData.edgeHexIDs[1], false, true, true)[1]})`"
									text-anchor="middle"
									dominant-baseline="middle"
									class="wallText"
									:style="{
										fill: wallData.wall[1] === -1 ? 'black' : 'white',
									}">
									{{ wallData.wall[0] }}
								</text>
							</g>
						</g>
					</g>

					<!-- HIGHLIGHTS ON TOP OF EVERYTHING -- ROTATABLE -->
					<g :transform="`rotate(${store.hexStyle === rf.FLAT ? 30 : 0} 0 0)`">
						<!-- BRIDGE OPTIONS -->
						<g v-for="(entry, idx) in computedZoomData.eligibleBridgesToBuild" :key="idx">
							<path @click="map.clickedBridgeOption(entry)" :d="view.getBridgeSVGpath(entry[0], entry[1], true, false, true, false).bridgeD" class="bridgeOptionPath" :stroke-width="40" />
						</g>

						<!-- HEX PIECES TO Highlight -->
						<g v-for="(entry, idx) in computedZoomData.hexPiecesToHighlight" :key="idx">
							<path @click="map.clickedHighlight(entry, $event)" :id="'ZP_hexHighlight' + idx" :d="view.getHexHighlightPath(entry[0], entry[1], true)" :transform="`rotate(${computedZoomData.rotation * 60} 0 0)`" class="highlightPath" />
						</g>

						<!-- RIVER PIECES TO Highlight -->
						<g v-for="(entry, idx) in computedZoomData.riversToHighlight" :key="idx">
							<path @click="map.clickedHighlight(entry, $event)" :id="'riverHighlight' + idx" :d="view.getRiverHighlightPath(entry[0], entry[1], true)" :transform="`rotate(${computedZoomData.rotation * 60} 0 0)`" class="highlightPath" />
						</g>

						<!-- SHORES TO Highlight -->
						<g v-for="(entry, idx) in computedZoomData.shoresToHighlight" :key="idx">
							<polygon @click="map.clickedHighlight(entry, $event)" :points="view.getShoreHighlightPoints(entry, true)" class="highlightPath" />
						</g>

						<!-- HALF SHORES TO Highlight -->
						<g v-for="(entry, idx) in computedZoomData.halfShoresToHighlight" :key="idx">
							<polygon @click="map.clickedHighlight(entry, $event)" :points="view.getHalfShoreHighlightPoints(entry, true)" class="highlightPath" />
						</g>

						<!-- Wall Options -->
						<g v-for="(entry, idx) in computedZoomData.eligibleWallsToBuild" :key="idx">
							<polygon class="highlightPath" :points="view.getWallSVGpointsFromHexID(entry[0], entry[1], true, false, true)" @click="map.clickedWallOption(entry)" />
						</g>

						<!-- Wall Options TO DEMOLISH -->
						<g v-for="(entry, idx) in computedZoomData.eligibleWallsToDemolish" :key="idx">
							<polygon class="wallDemolishOptionPolygon" :points="view.getWallSVGpointsFromHexID(entry[0], entry[1], true, false, true)" @click="map.clickedWallOption(entry)" />
						</g>
						<!-- end -->
					</g>
				</svg>
			</div>
			<div id="zoomInfoDiv">
				<BucketDisplay v-for="(bucket, idx) in computedZoomData.bucketData" :key="idx" type="bucket" :bucket-id="bucket.id" :transporters="bucket.transporters" :resources="bucket.resources" :buildings="bucket.buildings" :homeMarkers="bucket.homeMarkers" />
				<template v-for="(bucket, riverIdx) in computedZoomData.waterTransporters" :key="riverIdx">
					<BucketDisplay v-if="bucket.length > 0" :key="riverIdx" type="river" :river-id="riverIdx" :transporters="bucket" />
				</template>
				<template v-for="(sideData, sideIdx) in computedZoomData.dockedTransporters" :key="sideIdx">
					<template v-for="(bankData, bankIdx) in sideData" :key="bankIdx">
						<BucketDisplay v-if="bankData.length > 0" type="docked" :transporters="bankData" :side-idx="sideIdx" :bank-idx="bankIdx" />
					</template>
				</template>
			</div>
		</div>
		<div id="wonderScreen">
			<!-- temple area-->
			<div>
				<!-- temple figures -->
				<template v-for="(playerIndex, idx) in store.gameflow.wonderPrayingOrder" :key="idx">
					<div
						v-if="playerIndex !== -1 && store.players[playerIndex]"
						class="prayingDiv"
						:class="'prayingDiv' + String(playerIndex)"
						:style="{
							borderColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
						}">
						<img class="prayingFigureImg" :src="view.getImage('pray_' + String(personal.getCorrectedColour(store.players[playerIndex].colour)))" />
					</div>
				</template>
				<img class="templeIconImg" :src="view.getImage('temple_icon')" />
			</div>
			<WonderScreen :total-width="300" :crop-to6players="store.players.length === 6" :crop-to5players="store.players.length === 5" :crop-to3or4players="store.players.length === 3 || store.players.length === 4" :crop-to2players="store.players.length === 2" />
			<b>Neutral Bricks: {{ computedTotalNeutralBricks }}/{{ computedMaxNeutralBricks }}</b>
			<!-- temple area-->
			<div>
				<!-- turn order figures -->
				1st
				<template v-for="(playerIndex, idx) in store.gameflow.wonderTurnOrder" :key="idx">
					<div v-if="playerIndex !== -1" class="wholeTurnOrderFigureDiv" :class="{ wholeTurnOrderFigureDivActive: playerIndex === store.gameflow.turnOrder[0] }">
						<div
							class="turnOrderFigureDiv"
							:style="{
								borderColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
								color: personal.getCorrectedColourHex(store.players[playerIndex].colour),
							}">
							{{ idx + 1 }}
						</div>
					</div>
					<div v-else-if="playerIndex === -1" class="emptyTurnOrderDiv"></div>
				</template>
				Last
			</div>
		</div>
	</div>
</template>

<style scoped>
#mapZoomPanelDiv {
	display: inline-block;
	border: 2px solid black;
	height: fit-content;
	width: 300px;
	min-width: 300px;
	margin-left: 2px;
}

#zoomHexDiv {
	display: flex;
	border: 1px solid black;
	box-sizing: border-box;
	height: 350px;
	width: 100%;
	margin-left: 0px;
	margin-bottom: 0px;
	align-items: center;
	justify-content: center;
}

#noZoomHexDiv {
	font-size: 25px;
	font-weight: bolder;
	vertical-align: middle;
	padding: 5px;
	min-height: 400px;
	border: 2px solid black;
}

#zoomSVG {
	margin: 0 auto;
	/*position: absolute;*/
	width: 100%;
	height: 100%;
}

.hexPolygon {
	pointer-events: visiblePainted;
	/* fill: hsla(60, 12%, 95%, 0);*/
	stroke: black;
	cursor: pointer;
}

.highlightPath {
	fill: yellow;
	fill-opacity: 0.3;
	z-index: 1000;
	stroke: yellow;
	stroke-opacity: 0.8;
	stroke-width: 20px;
}

.highlightPath:hover {
	cursor: pointer;
	opacity: 0.8;
	fill: lightgreen;
	stroke: lightgreen;
}

.wallDemolishOptionPolygon {
	fill: red;
	fill-opacity: 0.3;
	z-index: 1000;
	stroke: red;
	stroke-opacity: 0.8;
	stroke-width: 20px;
}

.wallDemolishOptionPolygon:hover {
	cursor: pointer;
	stroke: lightgreen;
	fill: lightgreen;
	opacity: 0.8;
}

.bridgeOptionPath {
	fill: yellow;
	fill-opacity: 0.3;
	z-index: 1000;
	stroke: yellow;
	stroke-opacity: 0.8;
}

.bridgeOptionPath:hover {
	cursor: pointer;
	opacity: 0.8;
	fill: lightgreen;
	stroke: lightgreen;
	stroke-opacity: 1;
}

.resNormal {
	stroke: black;
	stroke-width: 5;
	pointer-events: none;
}

.resHighlight {
	stroke: yellow;
	stroke-width: 10;
}

.resHighlight:hover {
	cursor: pointer;
	stroke: lightgreen;
}

.transporterNormalCarried {
	filter: drop-shadow(7.5px 7.5px 0 black) drop-shadow(-7.5px 7.5px 0 black) drop-shadow(-7.5px -7.5px 0 black) drop-shadow(7.5px -7.5px 0 black);
}

.transporterHighlightCarried {
	filter: drop-shadow(7px 7px 0 yellow) drop-shadow(-7px 7px 0 yellow) drop-shadow(-7px -7px 0 yellow) drop-shadow(7px -7px 0 yellow);
}

.transporterHighlightCarried:hover {
	cursor: pointer;
	filter: drop-shadow(7px 7px 0 lightgreen) drop-shadow(-7px 7px 0 lightgreen) drop-shadow(-7px -7px 0 lightgreen) drop-shadow(7px -7px 0 lightgreen);
}

.resFollowingAreaSVGrect {
	pointer-events: "painted";
	stroke: yellow;
	fill-opacity: 0;
	fill: "black";
}

.resFollowingAreaSVGrect:hover {
	cursor: pointer;
	stroke: lightgreen;
}

.bldgNormal {
	stroke: aliceblue;
}

.wallPolygon {
	stroke-width: 10px;
	stroke: white;
}

.wallText {
	font-size: 200px;
	font-weight: bolder;
	stroke: black;
	stroke-width: 10px;
}

.mineText {
	font-size: 175px;
	font-weight: bolder;
	stroke: black;
	stroke-width: 10px;
}

.goldText {
	fill: gold;
}

.ironText {
	fill: red;
}

.homeMarkerRect {
	stroke: black;
	stroke-width: 4px;
}

.bldgHighlight {
	stroke: yellow;
}

.bldgHighlight:hover {
	cursor: pointer;
	stroke: lightgreen;
}

/** WONDER AREA */
.prayingDiv {
	border: 8px solid;
	box-sizing: border-box;
	width: 38px;
	height: 38px;
	pointer-events: none;
	border-radius: 100%;
	display: inline-block;
	vertical-align: middle;
}

.emptyTurnOrderDiv {
	border: 8px solid black;
	width: 30px;
	height: 30px;
	pointer-events: none;
	border-radius: 100%;
	display: inline-block;
	vertical-align: middle;
	font-weight: bolder;
	font-size: 25px;
	text-align: center;
	opacity: 50%;
}

.templeIconImg {
	height: 38px;
	vertical-align: middle;
}

.prayingFigureImg {
	width: 80%;
	height: 100%;
}

.wholeTurnOrderFigureDiv {
	display: inline-block;
	vertical-align: middle;
}

.wholeTurnOrderFigureDivActive {
	background-color: lightgreen;
}

.turnOrderFigureDiv {
	border: 8px solid;
	width: 30px;
	height: 30px;
	pointer-events: none;
	border-radius: 100%;
	vertical-align: middle;
	font-weight: bolder;
	font-size: 25px;
	text-align: center;
	line-height: 30px;
}
</style>
