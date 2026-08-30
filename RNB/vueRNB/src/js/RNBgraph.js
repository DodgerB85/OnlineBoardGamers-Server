/**
 * Roads and Boats - Graph System
 *
 * This module creates and manages the movement graph used for pathfinding.
 * The graph represents all possible locations and connections that transporters can use.
 *
 * Graph Structure:
 * - Nodes: Represent locations (vertices, sides, coast/docked positions, rivers)
 * - Edges: Represent connections between locations with movement types and costs
 * - Pathfinding: Uses Dial's Algorithm to find optimal paths
 *
 * Node Types:
 * - NODE_VERTEX (1): Land or sea vertices - corners of hexes
 * - NODE_RIVER_VERTEX (2): River positions along hex sides
 * - NODE_COAST (3): Docked positions (with bank and offset variants)
 * - NODE_SIDE (4): Hex side centers
 *
 * Docked Location Structure: [3, hexId, side, bank, offset]
 * - bank: BANK_NONE (0) for non-river coasts, BANK_LEFT (1)/RIGHT (2) for rivers
 * - offset: DOCKED_OFFSET_NONE (0), DOCKED_OFFSET_ACW (1), DOCKED_OFFSET_CW (2)
 *   Offsets allow transporters to shift positions along the dock
 */

import * as rf from "./RNBreference.js"
import * as util from "./RNButil.js"
import * as loc from "./RNBlocation.js"
import * as model from "./RNBmodel.js"

import { useModelStore } from "../stores/RNBstore.js"

// ============================================================================
// NODE OFFSET CONSTANTS
// ============================================================================
// These define the layout of nodes within each hex's internal graph.
// Each hex can have up to 78 nodes arranged in this order:
// 1. Vertices (0-9, varies by hex type)
// 2. Sides (6 nodes: sides 0-5)
// 3. Coast/Docked nodes (54 nodes total):
//    - BANK_NONE: 18 nodes (6 sides × 3 offsets)
//    - BANK_LEFT: 18 nodes (6 sides × 3 offsets)
//    - BANK_RIGHT: 18 nodes (6 sides × 3 offsets)
// 4. River nodes (8 nodes: max 2 rivers × 4 positions each)

export const NODE_OFFSET_SIDE = 0 // Start of side nodes (after vertices)
// NEW DOCKS: add all offsets
export const NODE_OFFSET_COAST = 6 // Start of BANK_NONE docked nodes (6 sides × 3 offsets = 18 nodes)
export const NODE_OFFSET_LEFT_BANK = 24 // Start of BANK_LEFT docked nodes (6 sides × 3 offsets = 18 nodes)
export const NODE_OFFSET_RIGHT_BANK = 42 // Start of BANK_RIGHT docked nodes (6 sides × 3 offsets = 18 nodes)

// ============================================================================
// INTERNAL GRAPH CREATION
// ============================================================================

/**
 * Creates the internal graph for a single hex.
 * This includes all nodes (vertices, sides, docked positions, rivers) and internal edges.
 *
 * @param {number} hexId - The ID of the hex to create a graph for
 * @param {number} playerIndex - The current player's index (for wall checks)
 * @returns {Object} The internal graph structure with nodes, edges, and side data
 */
export function createInternalGraph(hexId, playerIndex, ignoreWalls) {
	const store = useModelStore()
	// Get hex data and initialize arrays
	const hex = model.getHexByID(hexId)
	const sideIndices = util.indexArray(6) // [0,1,2,3,4,5] - all 6 sides

	// All vertices for this hex
	const vertexIndices = util.indexArray(hex.nodeVertexDefinitions.length)

	// Create vertex nodes - these are the corners of the hex
	const vertexLocations = vertexIndices.map((i) => (hex.currentTerrain === rf.TERR_SEA ? loc.setSeaVertexLocation(hexId, i) : loc.setLandVertexLocation(hexId, i)))
	// All vertices are type NODE_VERTEX
	const vertexNodeTypes = vertexLocations.map((_) => rf.NODE_VERTEX)
	// All vertices are valid by default
	const validVertexNodes = vertexLocations.map((_) => true)

	const riverVertexIndices = util.indexArray(hex.riverVertexDefinitions.length)
	const riverVertexLocations = riverVertexIndices.map((i) => loc.setRiverVertexLocation(hexId, i))
	const riverVertexNodeTypes = riverVertexLocations.map((_) => rf.LOCATION_RIVER_VERTEX)
	const validRiverVertexNodes = riverVertexLocations.map((_) => true)

	// Helper function to convert vertex indices to node references
	function vertexEdge(vertices) {
		return vertices.map((i) => [rf.NODE_VERTEX, i]) // Convert [0,1] to [[1,0],[1,1]]
	}
	function riverVertexEdge(vertices) {
		return vertices.map((i) => [rf.NODE_RIVER_VERTEX, i])
	}

	// Get all internal edges for this hex and convert to node references
	let edgeData = hex.nodeEdges.map(vertexEdge).concat(hex.riverVertexEdges.map(riverVertexEdge))

	// Number of vertices in this hex (varies by hex type)
	const landVertexCount = vertexLocations.length
	const vertexCount = landVertexCount + riverVertexLocations.length

	/**
	 * Calculates the base offset for a node type within the hex's internal graph.
	 * This determines where different types of nodes are positioned in the node array.
	 *
	 * @param {Array} node - Node reference [type, ...data]
	 * @returns {number} Base offset for this node type
	 */
	function nodeTypeOffset(node) {
		const type = node[0]
		if (type === rf.NODE_VERTEX) return 0
		else if (type === rf.NODE_RIVER_VERTEX) return landVertexCount
		else if (type === rf.NODE_SIDE)
			return vertexCount + NODE_OFFSET_SIDE // Sides start after vertices
		else if (type === rf.NODE_COAST) {
			// Docked nodes: calculate offset based on bank, side, and offset variant
			const bank = node[2]
			if (bank === rf.BANK_NONE) return vertexCount + NODE_OFFSET_COAST
			else if (bank === rf.BANK_LEFT) return vertexCount + NODE_OFFSET_LEFT_BANK
			else if (bank === rf.BANK_RIGHT) return vertexCount + NODE_OFFSET_RIGHT_BANK
		}
		return vertexCount + NODE_OFFSET_RIGHT_BANK
	}

	/**
	 * Calculates the full index of a node within the hex's internal graph.
	 * This is the actual array index where the node is stored.
	 *
	 * @param {Array} node - Node reference [type, ...data]
	 * @returns {number} Full index of the node
	 */
	function nodeIndex(node) {
		return nodeTypeOffset(node) + node[1]
	}

	// Convert node references to actual indices in the graph
	function actualEdge(nodes) {
		return nodes.map(nodeIndex)
	}

	// Special case: Sea hexes only have vertices (no sides, coasts, or rivers)
	// Void hexes have nothing, but this code works for them too
	if ([rf.TERR_SEA, rf.TERR_VOID].includes(hex.currentTerrain)) {
		// Return simplified sea hex graph
		return {
			vertexCount: vertexCount,
			nodes: {
				locations: vertexLocations, // Where each vertex is located
				valid: validVertexNodes, // All vertices are valid
				types: vertexNodeTypes, // All are NODE_VERTEX type
			},
			edges: {
				types: util.makeArrayOfSizeWithFill(edgeData.length, rf.MOVE_WATER), // All edges are water moves
				nodes: edgeData.map(actualEdge), // Convert to actual node indices
				internalIds: util.indexArray(hex.nodeEdges.length).concat(util.makeArrayOfSizeWithFill(edgeData.length - hex.nodeEdges.length, -1)),
			},
			sides: {
				hasRiver: util.makeArrayOfSizeWithFill(6, false), // No rivers in sea
				riverVertexIndex: util.makeArrayOfSizeWithFill(6, false),
			},
		}
	}

	// Analyze hex sides
	const sideExists = hex.hexLookup.map((i) => i >= 0) // Does this side have a neighboring hex?
	const sideIsCoast = sideIndices.map((i) => sideExists[i] && model.getHexByID(hex.hexLookup[i]).currentTerrain === rf.TERR_SEA) // Does this side border sea?
	const sideHasRiver = hex.sideRiverVertexIds.map((i) => i >= 0) // Does this side have a river?

	/**
	 * Checks if a side is blocked by a wall owned by another player
	 * @param {number} i - Side index (0-5)
	 * @returns {boolean} True if blocked by another player's wall
	 */
	function blockedByWall(i) {
		//return false
		if (ignoreWalls) return false
		let edgeId = hex.edgeLookup[i]
		if (edgeId === -1) {
			return false
		} else {
			const edge = store.mapData.edgeData[edgeId]
			return ![playerIndex, -1].includes(edge.wall[1])
		}
	}

	// disable edges to coast at other players' walls
	const sideBlockedByWall = sideIndices.map(blockedByWall)
	// Create edge locations
	const edgeLocations = sideIndices.map((i) => loc.setEdgeLocation(hex.edgeLookup[i]))
	// Create all possible docked locations (54 total) for consistent indexing
	// We create ALL combinations (3 banks × 3 offsets × 6 sides) even if some are invalid
	// This ensures the node indices are predictable and consistent
	let dockedLocations = []
	let dockExists = []
	for (const bank of [rf.BANK_NONE, rf.BANK_LEFT, rf.BANK_RIGHT]) {
		const sideDockExists = sideIndices.map((i) => sideExists[i] && sideIsCoast[i] && (bank == rf.BANK_NONE ? !sideHasRiver[i] : sideHasRiver[i]))
		// NEW DOCKS: add all offsets
		for (const offset of [rf.DOCKED_OFFSET_NONE, rf.DOCKED_OFFSET_ACW, rf.DOCKED_OFFSET_CW]) {
			dockedLocations = dockedLocations.concat(sideIndices.map((i) => loc.setDockedLocation(hexId, i, bank, offset)))
			dockExists = dockExists.concat(sideDockExists)
		}
	}

	// Combine all node arrays in order: vertices -> sides -> docked -> rivers
	const locations = vertexLocations.concat(riverVertexLocations.concat(edgeLocations.concat(dockedLocations)))
	const nodeTypes = vertexNodeTypes.concat(riverVertexNodeTypes.concat(edgeLocations.map((_) => rf.NODE_SIDE).concat(dockedLocations.map((_) => rf.NODE_COAST))))
	const validNodes = validVertexNodes.concat(validRiverVertexNodes.concat(sideExists.concat(dockExists)))

	// Add edges connecting side nodes to vertices (for land-to-land movement)
	for (let i = 0; i < 6; i++) {
		const left = [rf.NODE_VERTEX, hex.cornerNodeIds[i][0]]
		const right = [rf.NODE_VERTEX, hex.cornerNodeIds[i][1]]
		const middle = [rf.NODE_VERTEX, hex.sideNodeIds[i]]

		// Only add edges if side exists and isn't blocked by a wall
		if (sideExists[i] && !sideBlockedByWall[i]) {
			for (const loc of [left, right, middle]) {
				if (loc[1] !== -1) {
					edgeData.push([[rf.NODE_SIDE, i], loc])
				}
			}

			// If this is a coast side, add connections to docked positions
			if (sideIsCoast[i]) {
				if (sideHasRiver[i]) {
					for (const offset of [rf.DOCKED_OFFSET_NONE, rf.DOCKED_OFFSET_ACW, rf.DOCKED_OFFSET_CW]) {
						edgeData.push([[rf.NODE_COAST, i, rf.BANK_LEFT, offset], left])
						edgeData.push([[rf.NODE_COAST, i, rf.BANK_RIGHT, offset], right])
					}
				} else {
					for (const loc of [left, right, middle]) {
						if (loc[1] !== -1) {
							edgeData.push([[rf.NODE_COAST, i, rf.BANK_NONE], loc])
							// NEW DOCKS: add all offsets
							// Add edges to all 3 offset variants of this docked location
							for (const offset of [rf.DOCKED_OFFSET_NONE, rf.DOCKED_OFFSET_ACW, rf.DOCKED_OFFSET_CW]) {
								const offsetLocation = [rf.NODE_COAST, i, rf.BANK_NONE, offset]
								edgeData.push([offsetLocation, loc])
							}
						}
					}
				}
			}
		}
	}

	// Convert all edge node references to actual indices
	const edges = edgeData.map(actualEdge)

	// Determine the movement type for each edge based on the node types it connects
	// Internal edge between two land vertices (internal hex movement)
	// Edge between docked nodes (shifting docked positions) - treat as water move
	function toEdgeType(nodes) {
		const types = [nodes[0][0], nodes[1][0]]
		if (types[0] === types[1]) {
			if (types[0] === rf.NODE_VERTEX) {
				return rf.MOVE_INTERNAL
			} else if (types[0] === rf.NODE_RIVER_VERTEX) {
				return rf.MOVE_WATER
			}
		}
		return rf.MOVE_NONE
	}
	const edgeTypes = edgeData.map(toEdgeType)

	// Return the complete internal graph for this hex
	return {
		vertexCount: vertexCount,
		nodes: {
			locations: locations, // Array of location references for each node
			valid: validNodes, // Array indicating which nodes are valid/usable
			types: nodeTypes, // Array of node types (VERTEX, SIDE, COAST, RIVER)
		},
		edges: {
			nodes: edges, // Array of edge connections (by node indices)
			types: edgeTypes, // Array of movement types for each edge
			internalIds: util.indexArray(hex.nodeEdges.length).concat(util.makeArrayOfSizeWithFill(edgeData.length - hex.nodeEdges.length, -1)),
		},
		sides: {
			hasRiver: sideHasRiver, // Which sides have rivers
			riverVertexIndex: hex.sideRiverVertexIds.map((i) => i + landVertexCount), // River vertex indices for each side
			blockedByWall: sideBlockedByWall, // Which sides are blocked by walls
		},
	}
}

// ============================================================================
// GRAPH UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates adjacency lists for the graph.
 * This is used by the pathfinding algorithm to quickly find neighbors of any node.
 *
 * @param {number} nodeCount - Total number of nodes in the graph
 * @param {Array} edges - Array of edges, each edge is [fromNode, toNode]
 * @returns {Object} Object with toNodes and toEdges adjacency lists
 */
export function graphAdjacencies(nodeCount, edges) {
	// Initialize empty adjacency lists for each node
	let toNodes = util.indexArray(nodeCount).map((_) => [])
	let toEdges = util.indexArray(nodeCount).map((_) => [])
	for (let i = 0; i < edges.length; i++) {
		const nodes = edges[i]
		toNodes[nodes[0]].push(nodes[1])
		toNodes[nodes[1]].push(nodes[0])
		for (let k = 0; k < 2; k++) toEdges[nodes[k]].push(i)
	}
	return { nodes: toNodes, edges: toEdges }
}

/**
 * Finds all reachable locations of certain types from a starting location.
 * This is a legacy function for backward compatibility.
 *
 * Returns locations in the form of [getLocationType, data...]
 * eg [rf.LOCATION_LAND_VERTEX, hexId, vertexId]
 *
 * @param {Object} graph - The movement graph
 * @param {Array} traverse - Node types that can be traversed through
 * @param {Array} visit - Node types that can be visited (included in results)
 * @param {Array} inputLocation - Starting location
 * @returns {Array} Array of reachable locations
 */
export function reachableFrom(graph, traverse, visit, inputLocation) {
	// @vraid - see comments in RNBlocation first
	// If a riverVertex location is being sent here, its treating connections
	// as if the VERTEX id was the RIVER id
	// So looking at where we came from in RNBlocation, maybe graph.createInternalGraph is where the issue is?
	const startIndex = util.indexOfArrayInArray(graph.nodes.locations, inputLocation)
	const nodeCount = graph.nodes.locations.length
	const adjacencies = graphAdjacencies(nodeCount, graph.edges.nodes)
	if (startIndex >= nodeCount) {
		rf.doAdminAlrt("traversing from invalid location: " + JSON.stringify(inputLocation))
	}
	let reached = util.makeArrayOfSizeWithFill(nodeCount, false)
	reached[startIndex] = true
	let queue = [startIndex]
	while (queue.length > 0) {
		let n = queue.pop()
		for (const k of adjacencies.nodes[n]) {
			let type = graph.nodes.types[k]
			if (!reached[k] && visit.includes(type)) {
				reached[k] = true
				if (traverse.includes(type)) {
					queue.push(k)
				}
			}
		}
	}
	return util
		.indexArray(nodeCount)
		.filter((i) => reached[i])
		.map((i) => graph.nodes.locations[i])
}

// ============================================================================
// COMPLETE GRAPH CREATION
// ============================================================================

/**
 * Creates the complete movement graph for all hexes.
 * This combines internal graphs from all hexes and adds inter-hex connections.
 *
 * @param {Array} hexData - Array of all hex data
 * @param {Array} edgeData - Array of all edge data between hexes
 * @param {number} playerIndex - The current player's index
 * @returns {Object} The complete graph structure
 */
export function createCompleteGraph(hexData, edgeData, playerIndex, ignoreWalls, cheapCrossCountry) {
	let hexCount = hexData.length

	// Initialize arrays to store graph data
	let nodeHexIds = [] // Which hex each node belongs to
	let nodeLocations = [] // Location reference for each node
	let nodeValid = [] // Whether each node is valid/usable
	let nodeTypes = [] // Type of each node (VERTEX, SIDE, COAST, RIVER)
	let edges = [] // Edge connections (by node indices)
	let edgeTypes = [] // Movement type for each edge
	let edgeInternalIds = [] // Internal edge IDs (for tracking)
	// Per-edge flag: true only for internal (ring) edges that are part of a drawn road.
	// The truck prefers these edges on cost/length ties so it follows the road arc,
	// keeping movement visually consistent with the road drawn around mountain hexes,
	// regardless of discovery order or graph layout.
	let edgeIsRoad = []
	let hexNodeOffset = [] // Offset where each hex's nodes start
	let hexVertexOffset = [] // Number of vertices in each hex
	let sideData = [] // Side data for each hex

	// First, create internal graphs for all hexes and concatenate their nodes and edges
	for (let i = 0; i < hexCount; i++) {
		// Calculate where this hex's nodes will start in the global arrays
		let offset = nodeLocations.length
		hexNodeOffset.push(offset)

		// Create the internal graph for this hex
		let graph = createInternalGraph(hexData[i].hexID, playerIndex, ignoreWalls)
		hexVertexOffset.push(graph.vertexCount)
		sideData.push(graph.sides)

		// Add this hex's nodes to the global arrays
		nodeLocations = nodeLocations.concat(graph.nodes.locations)
		nodeValid = nodeValid.concat(graph.nodes.valid)
		nodeTypes = nodeTypes.concat(graph.nodes.types)
		nodeHexIds = nodeHexIds.concat(util.makeArrayOfSizeWithFill(graph.nodes.types.length, i))

		// Add this hex's internal edges to the global arrays
		// Adjust node indices by offset to account for previous hexes
		for (let k = 0; k < graph.edges.types.length; k++) {
			let type = graph.edges.types[k]
			let nodes = graph.edges.nodes[k]
			// Skip placeholder edges
			if (type !== rf.MOVE_NONE) {
				edgeTypes.push(type)
				edges.push(nodes.map((n) => n + offset))
				edgeInternalIds.push(graph.edges.internalIds[k])
				edgeIsRoad.push(!!hexData[i].edgeHasRoad[graph.edges.internalIds[k]])
			}
		}
	}

	// Initialize edge costs (most edges cost 1, donkey moves cost 2)
	let edgeCosts = util.makeArrayOfSizeWithFill(edges.length, 0)

	// Now add edges that connect different hexes together
	for (let i = 0; i < edgeData.length; i++) {
		/**
		 * Helper function to add an edge between hexes
		 * @param {number} type - Movement type (MOVE_WATER, MOVE_ROAD, etc.)
		 * @param {Array} nodes - Node indices [from, to]
		 */
		function addEdge(type, nodes) {
			edgeTypes.push(type)
			// Art & The Atelier: exhibition caravans move 1 hex cross-country, so their
			// unpaved-land edges cost 1 (donkeys pay 2)
			edgeCosts.push(type === rf.MOVE_DONKEY && !cheapCrossCountry ? 2 : 1)
			edges.push(nodes)
			edgeInternalIds.push(-1)
			edgeIsRoad.push(false)
		}
		// Extract edge information
		const edge = edgeData[i]
		const sides = edge.joiningSides // Which sides of each hex are connected
		const hexIds = edge.edgeHexIDs // IDs of the two hexes
		const hexes = hexIds.map((id) => hexData[id])
		const hexTypes = hexes.map((hex) => hex.currentTerrain)

		if (!hexTypes.includes(rf.TERR_VOID)) {
			// Get node indices for the sides and corners
			const hexSideNodes = [0, 1].map((k) => hexes[k].sideNodeIds[sides[k]])
			let hexCornerNodes = [0, 1].map((k) => hexes[k].cornerNodeIds[sides[k]])
			// Reverse the second hex's corner nodes to match orientation
			hexCornerNodes[1] = [1, 0].map((i) => hexCornerNodes[1][i])

			// Get offsets and other data for both hexes
			const hexOffset = hexIds.map((i) => hexNodeOffset[i])
			const vertexCount = hexIds.map((i) => hexVertexOffset[i])
			const hasRoad = edge.hasRoad

			// Check if edge is blocked by a wall
			const blockedByWall = ![playerIndex, -1].includes(edge.wall[1])

			// Determine what types of hexes are connected
			let hasSea = hexTypes.includes(rf.TERR_SEA)
			let hasLand = hexTypes[0] !== rf.TERR_SEA || hexTypes[1] !== rf.TERR_SEA
			let bothSea = hasSea && !hasLand
			let bothLand = hasLand && !hasSea

			if (!blockedByWall) {
				// sea has one edge
				if (bothSea) {
					addEdge(
						rf.MOVE_WATER,
						[0, 1].map((k) => hexOffset[k] + hexSideNodes[k])
					)
					for (let j = 0; j < 2; j++) {
						addEdge(
							rf.MOVE_WATER,
							[0, 1].map((k) => hexOffset[k] + hexCornerNodes[k][j])
						)
					}
				} else if (bothLand) {
					// river edge
					if (sideData[hexIds[0]].hasRiver[sides[0]]) {
						addEdge(
							rf.MOVE_WATER,
							[0, 1].map((k) => hexOffset[k] + sideData[hexIds[k]].riverVertexIndex[sides[k]])
						)
						for (let j = 0; j < 2; j++) {
							addEdge(
								hasRoad[j] ? rf.MOVE_ROAD : rf.MOVE_DONKEY,
								[0, 1].map((k) => hexOffset[k] + hexCornerNodes[k][j])
							)
						}
					} else {
						addEdge(
							hasRoad[0] ? rf.MOVE_ROAD : rf.MOVE_DONKEY,
							[0, 1].map((k) => hexOffset[k] + hexSideNodes[k])
						)
					}
				}
				// sea to coast edge, and potentially sea to river edge
				else {
					let seaHex = hexTypes[0] === rf.TERR_SEA ? 0 : 1
					let seaHexOffset = hexOffset[seaHex]
					let seaSideNode = hexSideNodes[seaHex]
					let landHex = [1, 0][seaHex]
					let landHexId = hexIds[landHex]
					let landHexOffset = hexOffset[landHex]
					let landHexSide = sides[landHex]
					// Only create sea-to-docked edges if this side is actually a coast
					if (sideData[landHexId].hasRiver[landHexSide]) {
						// dual-bank docking plus river
						addEdge(rf.MOVE_WATER, [seaHexOffset + seaSideNode, landHexOffset + sideData[landHexId].riverVertexIndex[landHexSide]])
						for (let offset = 0; offset < 3; offset++) {
							for (const seaNode of [seaSideNode, hexCornerNodes[seaHex][0]]) {
								addEdge(rf.MOVE_WATER, [seaHexOffset + seaNode, landHexOffset + vertexCount[landHex] + NODE_OFFSET_LEFT_BANK + landHexSide + 6 * offset])
							}
							for (const seaNode of [seaSideNode, hexCornerNodes[seaHex][1]]) {
								addEdge(rf.MOVE_WATER, [seaHexOffset + seaNode, landHexOffset + vertexCount[landHex] + NODE_OFFSET_RIGHT_BANK + landHexSide + 6 * offset])
							}
						}
					} else {
						// docking, no river
						for (let offset = 0; offset < 3; offset++) {
							addEdge(rf.MOVE_WATER, [seaHexOffset + seaSideNode, landHexOffset + vertexCount[landHex] + NODE_OFFSET_COAST + landHexSide + 6 * offset])
							for (let j = 0; j < 2; j++) {
								addEdge(rf.MOVE_WATER, [seaHexOffset + hexCornerNodes[seaHex][j], landHexOffset + vertexCount[landHex] + NODE_OFFSET_COAST + landHexSide + 6 * offset])
							}
						}
					}
				}
			}
		}
	}

	const adjacencies = graphAdjacencies(nodeTypes.length, edges)

	return {
		hexes: {
			offset: hexNodeOffset,
		},
		nodes: {
			types: nodeTypes,
			hexIds: nodeHexIds,
			locations: nodeLocations,
			adjacentNodes: adjacencies.nodes,
			adjacentEdges: adjacencies.edges,
		},
		edges: {
			nodes: edges,
			types: edgeTypes,
			costs: edgeCosts,
			internalIds: edgeInternalIds,
			isRoad: edgeIsRoad,
		},
	}
}

/**
 * Pathfinding algorithm to find all reachable nodes from a given location
 * @param {Object} graph - The graph object containing nodes and edges
 * @param {Array} inputLocation - The starting location [hexId, nodeType, nodeIndex, edgeType, edgeIndex]
 * @param {Function} validMove - Function to validate moves
 * @param {number} maxCost - Maximum cost for pathfinding
 * @returns {Object} - Object containing reachable nodes and their paths
 */
export function pathfind(graph, inputLocation, validMove, maxCost) {
	const nodeCount = graph.nodes.types.length

	// Typed Arrays for performance and memory efficiency
	const reached = new Uint8Array(nodeCount)
	const cost = new Int32Array(nodeCount).fill(-1)
	const distance = new Int32Array(nodeCount).fill(-1)
	const previous = new Int32Array(nodeCount).fill(-1)
	const viaEdge = new Int32Array(nodeCount).fill(-1)
	// Accumulated count of road-marked internal edges along the best known path
	// to each node. Used only to break cost/length ties so the truck follows the
	// drawn road. Internal-hex pathfind (no isRoad field) treats this as 0 for
	// every edge, leaving its existing behavior unchanged.
	const roadCount = new Int32Array(nodeCount).fill(0)
	// Per-edge flag: true for internal (ring) edges that are part of a drawn road.
	// Absent on the single-hex internal graph, in which case every edge is 0 and
	// this tiebreak is inert (road marking keeps its existing behavior).
	const edgeIsRoad = graph.edges.isRoad || []
	const roadCountFor = (srcNode, edgeId) => roadCount[srcNode] + (edgeIsRoad[edgeId] ? 1 : 0)

	/// HACK
	let inputLocationUse = [...inputLocation]
	if (inputLocation[0] === rf.LOCATION_DOCKED) {
		inputLocationUse[4] = 0
	}
	/// END HACK - TODO

	const startingNode = util.indexOfArrayInArray(graph.nodes.locations, inputLocationUse)

	reached[startingNode] = 1
	cost[startingNode] = 0
	distance[startingNode] = 0
	previous[startingNode] = startingNode

	const { adjacentNodes, adjacentEdges } = graph.nodes
	const { types: edgeTypes, costs: edgeCosts } = graph.edges
	const validMoveSet = new Set(validMove)

	// Dial's Algorithm Buckets
	const buckets = Array.from({ length: maxCost + 1 }, () => [])
	buckets[0].push(startingNode)

	let currentCost = 0

	while (currentCost <= maxCost) {
		const bucket = buckets[currentCost]

		if (bucket.length === 0) {
			currentCost++
			continue
		}

		const source = bucket.pop()
		const neighbors = adjacentNodes[source]
		const edges = adjacentEdges[source]
		const nextDist = distance[source] + 1 // Cache distance increment

		for (let i = 0; i < neighbors.length; i++) {
			const edgeId = edges[i]
			const target = neighbors[i]
			const destCost = currentCost + edgeCosts[edgeId]

			if (destCost > maxCost) continue

			const targetDist = distance[target]
			const targetCost = cost[target]

			let shouldUpdate = false

			if (targetDist === -1 && validMoveSet.has(edgeTypes[edgeId])) {
				shouldUpdate = true
			} else if (destCost < targetCost) {
				shouldUpdate = true
			} else if (destCost === targetCost && nextDist < targetDist) {
				shouldUpdate = true
			} else if (destCost === targetCost && nextDist === targetDist && roadCountFor(source, edgeId) > roadCount[target]) {
				// Equal cost and length: prefer the route that follows the
				// drawn road (more road-marked internal edges), so the truck
				// agrees with the road arc around mountain hexes.
				shouldUpdate = true
			} else if (reached[target] === 0 && validMoveSet.has(edgeTypes[edgeId])) {
				shouldUpdate = true
			}

			if (shouldUpdate) {
				reached[target] = 1
				cost[target] = destCost
				distance[target] = nextDist
				previous[target] = source
				viaEdge[target] = edgeId
				roadCount[target] = roadCountFor(source, edgeId)
				buckets[destCost].push(target)

				// NEW DOCKS: add all offsets
				// If we reached a docked node, mark all 3 offset variants as reachable
				if (graph.nodes.types[target] === rf.NODE_COAST) {
					const [type, hexId, side, bank] = graph.nodes.locations[target]
					for (const offset of [rf.DOCKED_OFFSET_NONE, rf.DOCKED_OFFSET_ACW, rf.DOCKED_OFFSET_CW]) {
						const offsetLocation = [type, hexId, side, bank, offset]
						const offsetIndex = util.indexOfArrayInArray(graph.nodes.locations, offsetLocation)
						if (offsetIndex !== -1 && !reached[offsetIndex]) {
							reached[offsetIndex] = 1
							cost[offsetIndex] = destCost
							distance[offsetIndex] = nextDist
							previous[offsetIndex] = source
							viaEdge[offsetIndex] = edgeId
							roadCount[offsetIndex] = roadCountFor(source, edgeId)
							buckets[destCost].push(offsetIndex)
						}
					}
				}
			}
		}
	}

	// Final result construction
	const reachedIndices = []
	for (let i = 0; i < nodeCount; i++) {
		if (reached[i]) reachedIndices.push(i)
	}

	const reindex = new Int32Array(nodeCount).fill(-1)
	for (let i = 0; i < reachedIndices.length; i++) {
		reindex[reachedIndices[i]] = i
	}

	return {
		reached: reachedIndices,
		cost: reachedIndices.map((i) => cost[i]),
		distances: reachedIndices.map((i) => distance[i]),
		previous: reachedIndices.map((i) => reindex[previous[i]]),
		viaEdge: reachedIndices.map((i) => viaEdge[i]),
		locations: reachedIndices.map((i) => graph.nodes.locations[i]),
	}
}

export function pathToDestination(pathfinding, destination) {
	let result = [destination]
	let current = destination
	while (pathfinding.previous[current] !== current) {
		let previous = pathfinding.previous[current]
		result.push(previous)
		current = previous
	}
	result.reverse()
	return result.map((i) => pathfinding.locations[i])
}

/**
 * Sorts movement indices based on center avoidance, crowd density, and distance.
 */
export function sortTransporterMoveIndices(i, k, { pathfind, transportersPerLocation, /*loc, model*/ }) {
	const locA = pathfind.locations[i]
	const locB = pathfind.locations[k]

	// 1. Calculate "Center Penalty" for A
	let aIsCenter = false
	if (loc.isLandVertexLocation(locA)) {
		const hexObjA = model.getHexByID(locA[1])
		const vertexPosA = hexObjA?.vertices[locA[2]]
		aIsCenter = vertexPosA && vertexPosA[0] === 0 && vertexPosA[1] === 0
	}

	// 2. Calculate "Center Penalty" for B
	let bIsCenter = false
	if (loc.isLandVertexLocation(locB)) {
		const hexObjB = model.getHexByID(locB[1])
		const vertexPosB = hexObjB?.vertices[locB[2]]
		bIsCenter = vertexPosB && vertexPosB[0] === 0 && vertexPosB[1] === 0
	}

	// 3. PRIMARY WEIGHT: Avoid [0,0]
	if (aIsCenter !== bIsCenter) {
		return aIsCenter ? 1 : -1
	}

	// 4. SECONDARY WEIGHT: Crowd density
	const crowdDiff = transportersPerLocation[i] - transportersPerLocation[k]
	if (crowdDiff !== 0) return crowdDiff

	// 5. TERTIARY WEIGHT: Distance
	const distDiff = pathfind.distances[i] - pathfind.distances[k]
	if (distDiff !== 0) return distDiff

	// 6. FINAL TIE BREAKER: Browser consistency
	return i - k
}

/**
 * Sorts vertices in a bucket by crowd density for water transporter moves.
 * Returns the best (least crowded) vertex.
 */
export function getBestVertexInBucketForWaterMove(hexID, bucketID) {
	const hex = model.getHexByID(hexID)

	// Get all vertices in this bucket
	let verticesInBucket = []
	for (let i = 0; i < hex.nodeBucketIds.length; i++) {
		if (hex.nodeBucketIds[i] === bucketID) {
			verticesInBucket.push(i)
		}
	}

	if (verticesInBucket.length === 0) {
		return 0
	}

	// Sort vertices by transporter count (least crowded first), then by vertex index for consistency
	verticesInBucket.sort((a, b) => {
		const locA = [rf.LOCATION_SEA_VERTEX, hexID, a]
		const locB = [rf.LOCATION_SEA_VERTEX, hexID, b]
		const countA = model.getAllInGameTransporters().filter((t) => util.arraysEqual(t.location, locA)).length
		const countB = model.getAllInGameTransporters().filter((t) => util.arraysEqual(t.location, locB)).length
		if (countA !== countB) return countA - countB
		return a - b
	})

	return verticesInBucket[0]
}

export function getBestVertexInRiver(hexID, riverID) {
	const hex = model.getHexByID(hexID)

	// Get all vertices in this bucket
	let riverVerticesInBucket = []
	for (let i = 0; i < hex.riverVertices.length; i++) {
		if (hex.riverVertexRiverIds[i] === riverID) {
			riverVerticesInBucket.push(i)
		}
	}

	if (riverVerticesInBucket.length === 0) {
		return 0
	}

	// Sort vertices by transporter count (least crowded first), then by vertex index for consistency
	riverVerticesInBucket.sort((a, b) => {
		const locA = [rf.LOCATION_RIVER_VERTEX, hexID, a]
		const locB = [rf.LOCATION_RIVER_VERTEX, hexID, b]
		const countA = model.getAllInGameTransporters().filter((t) => util.arraysEqual(t.location, locA)).length
		const countB = model.getAllInGameTransporters().filter((t) => util.arraysEqual(t.location, locB)).length
		if (countA !== countB) return countA - countB
		return a - b
	})

	return riverVerticesInBucket[0]
}

/**
 * Finds a valid destination vertex for water moves (sea/river/docked).
 * Handles docked locations (with proper offset), sea moves (any sea vertex in hex),
 * and river moves (any vertex in the specific river).
 * @param {Array} toLocationBucket - The target bucket location from decompressWaterLocation
 * @param {Object} transporterObj - The transporter being moved
 * @param {number} playerIndex - Current player index
 * @param {boolean} includeCost - Whether to calculate and return cost (default true)
 * @returns {Object|null} { location, cost } or null if no valid destination found
 */
export function findValidWaterDestination(toLocationBucket, transporterObj, playerIndex, includeCost = true) {
	const store = useModelStore()

	// Docked locations: get final location with proper offset
	if (loc.isDockedLocation(toLocationBucket)) {
		const finalLocation = loc.getFinalLocationForDockingTransporterID(toLocationBucket, transporterObj.id)
		if (!includeCost) return { location: finalLocation }

		// Calculate cost for docked moves
		const stats = rf.getTransporterStats(transporterObj.type)
		const movementGraph = createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, playerIndex)
		const pathfindResult = pathfind(movementGraph, transporterObj.location, stats.validMove, transporterObj.remainingMoves)
		const destinationIdx = util.indexOfArrayInArray(pathfindResult.locations, finalLocation)
		const cost = destinationIdx >= 0 ? pathfindResult.cost[destinationIdx] : 0
		return { location: finalLocation, cost }
	}

	const toHexID = toLocationBucket[1]
	const stats = rf.getTransporterStats(transporterObj.type)
	const movementGraph = createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, playerIndex)
	const pathfindResult = pathfind(movementGraph, transporterObj.location, stats.validMove, transporterObj.remainingMoves)

	const locationIndices = util.indexArray(pathfindResult.locations.length)
	let indicesToValid = util.boolFilter(
		locationIndices,
		locationIndices.map((i) => pathfindResult.cost[i] > 0 && loc.locationAllowsStop(pathfindResult.locations[i]))
	)

	// Sort by crowd density and distance
	const transportersPerLocation = pathfindResult.locations.map((arrLoc) =>
		model.getAllInGameTransporters().filter((t) => util.arraysEqual(t.location, arrLoc)).length
	)
	indicesToValid.sort((i, k) =>
		sortTransporterMoveIndices(i, k, {
			pathfind: pathfindResult,
			transportersPerLocation,
			loc,
			model,
		})
	)

	const validMoves = util.getByIndices(pathfindResult.locations, indicesToValid)
	const validCosts = util.getByIndices(pathfindResult.cost, indicesToValid)

	// Find matching location
	let foundIdx = -1
	if (toLocationBucket[0] === rf.LOCATION_SEA_VERTEX) {
		foundIdx = validMoves.findIndex((arrLoc) => loc.isSeaVertexLocation(arrLoc) && arrLoc[1] === toHexID)
	} else if (toLocationBucket[0] === rf.LOCATION_RIVER_BUCKET) {
		const targetRiverID = toLocationBucket[2]
		foundIdx = validMoves.findIndex((arrLoc) => {
			if (!loc.isRiverVertexLocation(arrLoc) || arrLoc[1] !== toHexID) return false
			const moveRiverID = loc.getRiverIDfromAnyHexIDandRiverVertex(arrLoc[1], arrLoc[2])
			return moveRiverID === targetRiverID
		})
	}

	if (foundIdx === -1) return null
	return { location: validMoves[foundIdx], cost: validCosts[foundIdx] }
}

// ============================================================================
// PLANES & AEROPORTS — Fly movement graph
// ============================================================================
// A plane in FLY mode can reach ANY land tile (TERR_ANY_LAND). We model this by
// connecting every land vertex node to every other land vertex node with a single
// MOVE_FLY edge, so the existing pathfind() / highlight / move pipeline works
// unchanged. Sea and wet-polder tiles are intentionally excluded.
export function addFlyEdges(graph) {
	const landVertexIndices = []
	for (let i = 0; i < graph.nodes.types.length; i++) {
		if (graph.nodes.types[i] !== rf.NODE_VERTEX) continue
		const loc0 = graph.nodes.locations[i]
		const hex = model.getHexByID(loc0[1])
		if (hex && rf.TERR_ANY_LAND.includes(hex.currentTerrain)) landVertexIndices.push(i)
	}
	const edges = graph.edges.nodes
	const edgeTypes = graph.edges.types
	const edgeCosts = graph.edges.costs
	const edgeIsRoad = graph.edges.isRoad || []
	for (let a = 0; a < landVertexIndices.length; a++) {
		for (let b = a + 1; b < landVertexIndices.length; b++) {
			edges.push([landVertexIndices[a], landVertexIndices[b]])
			edgeTypes.push(rf.MOVE_FLY)
			edgeCosts.push(1)
			edgeIsRoad.push(false)
		}
	}
	const adj = graphAdjacencies(graph.nodes.types.length, edges)
	graph.nodes.adjacentNodes = adj.nodes
	graph.nodes.adjacentEdges = adj.edges
	graph.edges.nodes = edges
	graph.edges.types = edgeTypes
	graph.edges.costs = edgeCosts
	graph.edges.isRoad = edgeIsRoad
	return graph
}

// Build the movement graph for a transporter, augmenting with fly edges when the
// transporter is a plane and `forceFly` is true (i.e. FLY mode).
export function createMovementGraph(transporterObj, playerIndex, forceFly) {
	const store = useModelStore()
	const isCaravan = transporterObj.type === rf.EXHIBITION_TRANSPORTER
	const graph = createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, playerIndex, isCaravan, isCaravan)
	if (transporterObj.type === rf.PLANE && forceFly) return addFlyEdges(graph)
	return graph
}
