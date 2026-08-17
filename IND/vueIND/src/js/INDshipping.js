/**
 * Contains functions for max shipping calculations
 * 
 * SHIPPING PROCESS
 * ================
 * The debug area shows HI (store.context.historyObg) and CGJ (store.context.currentGoodJourney)
 * as you go, which shows you what happens. 
 * 
 * Essentially, the histObj is an array of arrays. The first entry is the slot content
 * - ie an array of company indexes caontined in the selected slot. 
 * 
 * Each following array is a good journey, which is a copy of CGJ when it's complete. 
 * 
 * CGJ starts with a copy of the slot content for some reason (this isn't copied to histObj)
 * Once you select a prod marker, it adds terrID of the prod marker
 * 
 * When you dwliver to a city, that terrID becomes the final entry in the array. 
 * 
 * 
 * 
 * IN summary
 * currentGoodJourney = [[slot content], prodMarkerTerrID, shippingCompOwnerIdx, shippingCompID, terrID, terrID, ..., terrID, cityTerrID]
 * 
 * Each journey (minus slot content) is copied into the histObj
 * 
 * histObj = [[slotContent], [goodJourney], [goodJourney], ..., [goodJourney], flag/ending]
 * 
 * The flag/ending is -1 if you can't expand, or a set of terrID's if you do. There's also a flag for paying to expand
 * as the first entry in the new terrIDs, I think
 * 
 */

import { useModelStore } from "../stores/INDstore.js"
import * as rf from "./INDreference.js"
import * as funcs from "./INDfuncs.js"
import * as model from "./INDmodel.js"

export function companyTokens(companies) {
	return [].concat.apply(
		[],
		companies.map((company) => company.territories)
	)
}

export function subtractGoodMarkers(goodMarkers, productionAreas)
{
	let result = []
	for (const areas of productionAreas)
	{
		result.push(areas.filter((a) => !goodMarkers.includes(a)))
	}
	return result
}

export function subtractAllGoodMarkersExcept(marker, productionAreas)
{
	let result = []
	for (const areas of productionAreas)
	{
		result.push(areas.filter((a) => a === marker))
	}
	return result
}

export function contiguousProductionAreas(mapData, companies) {
	const indices = [...mapData.allNeighbours.keys()]
	const territories = companyTokens(companies).map((arr) => arr[0])
	const present = indices.map((n) => territories.includes(n))
	let visited = indices.map((n) => false)
	function visit(n) {
		visited[n] = true
	}
	let result = []
	for (let k = 0; k < territories.length; k++) {
		const id = territories[k]
		if (!visited[id]) {
			visit(id)
			let res = [id]
			let traverse = [id]
			while (traverse.length > 0) {
				const neighbours = mapData.landNeighbours[traverse[0]]
				for (let neighbour of neighbours) {
					if (present[neighbour] && !visited[neighbour]) {
						visit(neighbour)
						res.push(neighbour)
						traverse.push(neighbour)
					}
				}
				traverse.shift()
			}
			result.push(res)
		}
	}
	return result
}

export function allPlayerShippingCompanies(playerSlots, allCompanies) {
	let result = []
	for (let k = 0; k < playerSlots.length; k++) {
		for (let slots of playerSlots[k]) {
			if (slots.length > 0) {
				const companies = model.slotCompanies(slots, allCompanies)
				if (companies[0].type === rf.COMPANY_SHIPPING) {
					result.push({ player: k, id: companies[0].id, tokens: companyTokens(companies) })
				}
			}
		}
	}
	return result
}

export function graphToGraphviz(graph)
{
	function node(n) {
		return n + " [label=\"" + graph.nodeLabels[n] + "\"]"
	}
	function edge(n) {
		return graph.edgeNodes[n][0] + " -> " + graph.edgeNodes[n][1] + (graph.edgeHasLimit[n] ? "[label=\"" + graph.edgeLimit[n] + "\"]" : "")
	}
	function samerank(ls) {
		return "{rank=same; " + ls.join("; ") + "}"
	}
	return "digraph {" + [graph.nodes.map(node).join("; "), graph.edges.map(edge).join("; "), samerank(graph.productionAreaNodeId), samerank(graph.cityNodeId)].join("; ") + "; }";
}

export function createShippingGraph(mapData, cityTerritory, cityCapacity, playerCosts, unfavouredPlayerSubsidies, productionAreas, productionCapacity, shippingCompanies, addedCapacity) {
	const mapIndices = [...mapData.allNeighbours.keys()]
	let graph = {
		source: -1,
		sink: -1,
		nodes: [],
		cityNodeId: [],
		productionAreaNodeId: [],
		nodeEdges: [],
		nodeLabels: [],
		edges: [],
		edgeNodes: [],
		edgeHasLimit: [],
		edgeLimit: [],
		edgeCost: [],
		edgeOrigin: [],
	}
	function addNode(label) {
		const id = graph.nodes.length
		graph.nodes.push(id)
		graph.nodeEdges.push([])
		graph.nodeLabels.push(label)
		return id
	}
	graph.source = addNode("source")
	graph.sink = addNode("sink")
	function addEdge(from, to, hasLimit, limit, cost, origin) {
		const id = graph.edges.length
		graph.nodeEdges[from].push(id)
		graph.nodeEdges[to].push(id)
		graph.edges.push(id)
		graph.edgeNodes.push([from, to])
		graph.edgeHasLimit.push(hasLimit)
		graph.edgeLimit.push(limit)
		graph.edgeCost.push(cost)
		graph.edgeOrigin.push(origin)
	}
	function addVirtualEdge(from, to, cost) {
		addEdge(from, to, false, 0, cost, { type: "virtual" })
	}

	for (let n = 0; n < cityTerritory.length; n++) {
		const territory = cityTerritory[n]
		const id = addNode("city " + territory)
		graph.cityNodeId.push(id)
		addEdge(id, graph.sink, true, cityCapacity[n], 0, { type: "city", territory: territory })
	}

	for (let n = 0; n < productionAreas.length; n++) {
		const id = addNode("prod " + n)
		graph.productionAreaNodeId.push(id)
		addEdge(graph.source, id, true, productionCapacity[n], 0, { type: "company", productionArea: n })
	}

	for (let n = 0; n < shippingCompanies.length; n++) {
		const id = shippingCompanies[n].id
		const addedShips = addedCapacity.filter((route) => route.id === id).map((route) => route.ships).flat()
		const shipOwner = shippingCompanies[n].player
		const cost = playerCosts[shipOwner]
		const unfavouredSubsidy = unfavouredPlayerSubsidies[shipOwner]
		const shippingCapacity = mapIndices.map((n) => 0)
		for (const token of shippingCompanies[n].tokens) {
			const id = token[0]
			const hull = token[1]
			shippingCapacity[id] += hull
		}
		for (const id of addedShips) {
			shippingCapacity[id] += 1
		}
		let inNodes = mapIndices.map((n) => -1)
		let outNodes = mapIndices.map((n) => -1)
		const shipAreas = mapIndices.filter((n) => shippingCapacity[n] > 0)
		for (const k of shipAreas) {
			inNodes[k] = addNode("in " + k)
			outNodes[k] = addNode("out " + k)
			addEdge(inNodes[k], outNodes[k], true, shippingCapacity[k], cost, { type: "shipping", territory: k, company: n })
		}
		for (const k of shipAreas) {
			for (const neighbour of mapData.seaNeighbours[k]) {
				if (shippingCapacity[neighbour] > 0) {
					addVirtualEdge(outNodes[k], inNodes[neighbour], 0)
				}
			}
			let adjacentProduction = productionAreas.map((x) => false)
			for (let neighbour of mapData.landNeighbours[k]) {
				let cityIndex = cityTerritory.findIndex((territory) => territory === neighbour)
				if (cityIndex >= 0) {
					addVirtualEdge(outNodes[k], graph.cityNodeId[cityIndex], 0)
				}
				for (let i = 0; i < productionAreas.length; i++) {
					adjacentProduction[i] = adjacentProduction[i] || productionAreas[i].includes(neighbour)
				}
			}
			for (let i = 0; i < adjacentProduction.length; i++) {
				if (adjacentProduction[i]) {
					addVirtualEdge(graph.productionAreaNodeId[i], inNodes[k], unfavouredSubsidy)
				}
			}
		}
	}
	return graph
}

export function restrictGraphToCurrentGoodJourney(graph, productionAreas, shippingCompanies, currentGoodJourney) {
	const companyOwner = currentGoodJourney[1]
	const companyId = currentGoodJourney[2]
	const companyIndex = shippingCompanies.findIndex((a) => a.player == companyOwner && a.id == companyId)
	const productionArea = productionAreas.findIndex((a) => a.length > 0)
	let nodeId = graph.productionAreaNodeId[productionArea]
	for (let n = 3; n < currentGoodJourney.length; n++) {
		const shipTerritory = currentGoodJourney[n]
		const shipEdge = graph.edgeOrigin.findIndex((a) => a.type == "shipping" && a.company == companyIndex && a.territory == shipTerritory)
		const inNode = graph.edgeNodes[shipEdge][0]
		const outNode = graph.edgeNodes[shipEdge][1]
		for (let k = 0; k < graph.edgeNodes.length; k++) {
			if (graph.edgeNodes[k][0] == nodeId && graph.edgeNodes[k][1] != inNode) {
				graph.edgeHasLimit[k] = true
				graph.edgeLimit[k] = 0
			}
		}
		nodeId = outNode
	}
}

export function findPossibleJourneys(graph, productionAreas, shippingCompanies) {
	let currentShipment = graph.edges.map((n) => 0)

	function edgeIsLimited(n, reverse) {
		return graph.edgeHasLimit[n] || reverse
	}

	function edgeReversed(n, from) {
		return graph.edgeNodes[n][1] === from
	}

	function edgeSpareCapacity(n, reversed) {
		return reversed ? currentShipment[n] : graph.edgeLimit[n] - currentShipment[n]
	}

	function edgeOtherNode(n, from) {
		return graph.edgeNodes[n][0] === from ? graph.edgeNodes[n][1] : graph.edgeNodes[n][0]
	}

	function newCapacity(capacity, n, reversed) {
		return edgeIsLimited(n, reversed) ? Math.min(capacity, edgeSpareCapacity(n, reversed)) : capacity
	}

	function isSinkReachable() {
		let nodeReached = new Array(graph.nodes.length)
		nodeReached.fill(false)
		const nodeList = [graph.source]
		let head = 0
		while (head < nodeList.length) {
			const node = nodeList[head++]
			if (node === graph.sink) {
				return true
			}
			for (const edge of graph.nodeEdges[node]) {
				const reversed = edgeReversed(edge, node)
				const other = edgeOtherNode(edge, node)
				const alreadyReached = nodeReached[other]
				if (!(alreadyReached || (edgeIsLimited(edge, reversed) && edgeSpareCapacity(edge, reversed) === 0))) {
					nodeReached[other] = true
					nodeList.push(other)
				}
			}
		}
		return false
	}

	function shortestPath() {
		const initial = graph.nodeEdges[graph.source].filter((n) => edgeSpareCapacity(n, false) > 0)
		const noPath = [0, [], []]
		if (!isSinkReachable() || initial.length === 0) {
			return noPath
		} else {
			// Min-heap of candidate partial paths, keyed by [cost, capacity, node, visitedSet, visitedEdges, reversed],
			// so popping the globally cheapest candidate is O(log n).
			const heap = []
			function heapPush(a, b, c, d, e, f) {
				let i = heap.length
				const entry = [a, b, c, d, e, f]
				heap.push(entry)
				while (i > 0) {
					const parent = (i - 1) >> 1
					if (heap[parent][0] <= heap[i][0]) break
					;[heap[parent], heap[i]] = [heap[i], heap[parent]]
					i = parent
				}
			}
			function heapPop() {
				const top = heap[0]
				const last = heap.pop()
				if (heap.length > 0) {
					heap[0] = last
					let i = 0
					for (;;) {
						const l = 2 * i + 1
						const r = l + 1
						let smallest = i
						if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l
						if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r
						if (smallest === i) break
						;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]
						i = smallest
					}
				}
				return top
			}

			// Best (cheapest) cost each node has been reached at so far. Partial paths
			// that reach a node at a strictly worse cost than the best-known are
			// dominated and discarded, pruning the exponential duplicate enumeration.
			// A bounded number of equally-cheapest partial paths per node are kept, so
			// a RECALCULATE re-solve can surface different lowest-cost solutions.
			const bestKnown = new Array(graph.nodes.length).fill(Infinity)
			const bestCount = new Array(graph.nodes.length).fill(0)
			const MAX_EQUAL_PATHS_PER_NODE = 4
			for (const n of initial) {
				const target = graph.edgeNodes[n][1]
				if (bestCount[target] < MAX_EQUAL_PATHS_PER_NODE) {
					bestKnown[target] = 0
					bestCount[target]++
					heapPush(0, edgeSpareCapacity(n, false), target, new Set([graph.source]), [n], [false])
				}
			}

			function validPath(node, visitedSet) {
				return function (n) {
					const isReversed = edgeReversed(n, node)
					return !visitedSet.has(edgeOtherNode(n, node)) && (!edgeIsLimited(n, isReversed) || edgeSpareCapacity(n, isReversed) > 0)
				}
			}

			while (heap.length > 0) {
				const currentPath = heapPop()
				const cost = currentPath[0]
				const capacity = currentPath[1]
				const node = currentPath[2]
				const visitedSet = currentPath[3]
				const visitedEdges = currentPath[4]
				const reversed = currentPath[5]
				if (node === graph.sink) {
					return [capacity, visitedEdges, reversed]
				}
				// shuffling prevents order bias otherwise present in shipping companies
				const outgoing = funcs.shuffle(graph.nodeEdges[node].filter(validPath(node, visitedSet)))
				for (const edge of outgoing) {
					const isReversed = edgeReversed(edge, node)
					const reverseFactor = isReversed ? -1 : 1
					const nextCost = cost + graph.edgeCost[edge] * reverseFactor
					const target = edgeOtherNode(edge, node)
					if (nextCost > bestKnown[target]) continue
					if (nextCost === bestKnown[target] && bestCount[target] >= MAX_EQUAL_PATHS_PER_NODE) continue
					if (nextCost < bestKnown[target]) bestCount[target] = 0
					bestKnown[target] = Math.min(bestKnown[target], nextCost)
					bestCount[target]++
					const nextVisited = new Set(visitedSet)
					nextVisited.add(node)
					heapPush(nextCost, newCapacity(capacity, edge, isReversed), target, nextVisited, visitedEdges.concat([edge]), reversed.concat([isReversed]))
				}
			}
			return noPath
		}
	}

	let shortest = shortestPath()
	while (shortest[0] > 0) {
		const shipment = shortest[0]
		const path = shortest[1]
		const reversed = shortest[2]
		for (let n = 0; n < path.length; n++) {
			currentShipment[path[n]] += reversed[n] ? -shipment : shipment
		}
		shortest = shortestPath()
	}

	function shippingOutEdges(node) {
		return graph.nodeEdges[node].filter((edge) => graph.edgeNodes[edge][0] === node && currentShipment[edge] > 0)
	}

	function firstShippingPath(edges) {
		const edge = edges[0]
		return { edge: edge, node: graph.edgeNodes[edge][1] }
	}

	// reconstruct journeys into game data

	let journeys = []
	let goodIds = structuredClone(productionAreas)
	let shippingOut = shippingOutEdges(graph.source)
	while (shippingOut.length > 0) {
		let path = firstShippingPath(shippingOut)
		currentShipment[path.edge]--
		// all edges connecting to source should have a company origin and contain production area index
		const productionAreaIndex = graph.edgeOrigin[path.edge].productionArea
		const goodId = goodIds[productionAreaIndex].shift()
		let trace = []
		let shipCompanyIndex = -1
		// keep traversing until we hit a city
		while (true) {
			const virtual = firstShippingPath(shippingOutEdges(path.node))
			currentShipment[virtual.edge]--
			path = firstShippingPath(shippingOutEdges(virtual.node))
			currentShipment[path.edge]--
			const origin = graph.edgeOrigin[path.edge]
			// every second path is a ship or city
			// the journey continues
			if (origin.type === "shipping") {
				trace.push(origin.territory)
				shipCompanyIndex = origin.company
			}
			// our journey ends here
			else {
				const city = origin.territory
				const shipCompany = shippingCompanies[shipCompanyIndex]
				// CHECK THIS FOR THE RETURN INFO
				journeys.push([].concat([goodId, shipCompany.player, shipCompany.id], trace, [city]))
				break
			}
		}
		shippingOut = shippingOutEdges(graph.source)
	}

	return journeys
}

// Bounded memo of the max-shipping solve. During a shipping operation the same
// inputs recur across the several getCheapestMaxPossibleShipmentsFromSlotIDX
// call sites, so re-solving each time is wasted work. The cache key includes
// every input that can affect the result. Callers copy the returned array, so
// sharing is safe. The RECALCULATE flow passes recalculate=true to skip the
// cache lookup and re-solve, replacing the cached entry with the fresh result.
let maxShippingMemo = new Map()
let maxShippingMemoOrder = []
const MAX_SHIPPING_MEMO_SIZE = 16

export function getCheapestMaxPossibleShipmentsFromSlotIDX(cities, activeCompanies, playerCosts, unfavouredPlayerSubsidies, playerSlots, playerIndex, slotIDX, subtractedRoutes, recalculate) {
	const mapData = useModelStore().mapData

	const memoKey = JSON.stringify([playerIndex, slotIDX, playerCosts, unfavouredPlayerSubsidies, mapData, cities, activeCompanies, playerSlots, subtractedRoutes])
	if (!recalculate) {
		const memoHit = maxShippingMemo.get(memoKey)
		if (memoHit !== undefined) {
			return memoHit.slice()
		}
	}

	const subtractedGoodMarkers = subtractedRoutes.map((route) => route[0])

	const activeSlot = playerSlots[playerIndex][slotIDX]
	let result
	if (activeSlot.length === 0) {
		result = []
	} else {
		const activeCompany = model.slotCompanies(activeSlot, activeCompanies)
		if (activeCompany.type === rf.COMPANY_SHIPPING) {
			result = []
		} else {
			const currentGood = activeCompany[0].good

			const allProductionAreas = contiguousProductionAreas(mapData, activeCompany)
			const productionAreas = subtractGoodMarkers(subtractedGoodMarkers, allProductionAreas)
			const productionCapacity = productionAreas.map((a) => a.length)
const shippingCompanies = allPlayerShippingCompanies(playerSlots, activeCompanies)
			
			const cityTerritory = cities.map((city) => city.territory)
			const cityCapacity = cities.map((city) => city.size - city.receivedGoods.filter((good) => good === currentGood).length)

			const graph = createShippingGraph(mapData, cityTerritory, cityCapacity, playerCosts, unfavouredPlayerSubsidies, allProductionAreas, productionCapacity, shippingCompanies, [])

			result = findPossibleJourneys(graph, productionAreas, shippingCompanies)
		}
	}

	maxShippingMemo.set(memoKey, result)
	maxShippingMemoOrder.push(memoKey)
	if (maxShippingMemoOrder.length > MAX_SHIPPING_MEMO_SIZE) {
		const oldest = maxShippingMemoOrder.shift()
		maxShippingMemo.delete(oldest)
	}

	return result
}

function addForcedSourceEdges(graph, mapData, productionAreas, shippingCompanies, productionAreaIndex, companyIndex, unfavouredPlayerSubsidies) {
	const area = productionAreas[productionAreaIndex]
	const areaAdjacentSea = []
	for (const territory of area) {
		areaAdjacentSea.push(...mapData.landNeighbours[territory])
	}
	const cost = unfavouredPlayerSubsidies[shippingCompanies[companyIndex].player]
	for (let e = 0; e < graph.edgeNodes.length; e++) {
		const origin = graph.edgeOrigin[e]
		if (origin.type !== "shipping" || origin.company !== companyIndex || !areaAdjacentSea.includes(origin.territory)) {
			continue
		}
		const inNode = graph.edgeNodes[e][0]
		const id = graph.edges.length
		graph.nodeEdges[graph.source].push(id)
		graph.nodeEdges[inNode].push(id)
		graph.edges.push(id)
		graph.edgeNodes.push([graph.source, inNode])
		graph.edgeHasLimit.push(false)
		graph.edgeLimit.push(0)
		graph.edgeCost.push(cost)
		graph.edgeOrigin.push({ type: "company", productionArea: productionAreaIndex })
	}
}

/**
 * For each good in the given max-shipping journeys, find other shipping
 * companies that can carry one of the same production area's goods in some
 * solution that still ships the most possible goods. The stored alternative
 * solutions are full max-shipping plans, so applying one can never reduce the
 * number of goods shipped.
 *
 * A company qualifies for a production area if the flow still reaches the max
 * count when one unit of that area is only loadable onto that company's ships
 * (the area's source capacity is cut by one and a direct source edge to the
 * company's adjacent tokens is added instead), AND the resulting plan actually
 * carries a good of that area with that company.
 */
export function getShippingAlternatives(journeys, cities, activeCompanies, playerCosts, unfavouredPlayerSubsidies, playerSlots, playerIndex, slotIDX, subtractedRoutes) {
	const mapData = useModelStore().mapData

	if (journeys.length === 0) {
		return { byGood: {} }
	}
	const activeSlot = playerSlots[playerIndex][slotIDX]
	if (activeSlot.length === 0) {
		return { byGood: {} }
	}
	const activeCompany = model.slotCompanies(activeSlot, activeCompanies)
	if (activeCompany.type === rf.COMPANY_SHIPPING) {
		return { byGood: {} }
	}

	const currentGood = activeCompany[0].good
	const allProductionAreas = contiguousProductionAreas(mapData, activeCompany)
	const productionAreas = subtractGoodMarkers(subtractedRoutes.map((route) => route[0]), allProductionAreas)
	const productionCapacity = productionAreas.map((a) => a.length)
	const shippingCompanies = allPlayerShippingCompanies(playerSlots, activeCompanies)

	const cityTerritory = cities.map((city) => city.territory)
	const cityCapacity = cities.map((city) => city.size - city.receivedGoods.filter((good) => good === currentGood).length)

	// Which companies' ships are land-adjacent to each production area
	const companyAdjacentAreas = shippingCompanies.map((company) => {
		const tokenTerrs = company.tokens.map((token) => token[0])
		return productionAreas.map((area) => {
			const areaAdjacentSea = []
			for (const territory of area) {
				areaAdjacentSea.push(...mapData.landNeighbours[territory])
			}
			return tokenTerrs.some((terr) => areaAdjacentSea.includes(terr))
		})
	})

	// The production area each journey's good comes from
	const rowAreas = journeys.map((journey) => productionAreas.findIndex((area) => area.includes(journey[0])))

	const byGood = {}
	const baseKey = journeys.map((journey) => JSON.stringify(journey)).sort().join("|")
	// How many goods of each production area the current plan ships
	const areaShippedCount = new Array(productionAreas.length).fill(0)
	for (let row = 0; row < journeys.length; row++) {
		if (rowAreas[row] >= 0) {
			areaShippedCount[rowAreas[row]]++
		}
	}
	for (let areaIndex = 0; areaIndex < productionAreas.length; areaIndex++) {
		if (areaShippedCount[areaIndex] === 0) {
			continue
		}
		for (let c = 0; c < shippingCompanies.length; c++) {
			const company = shippingCompanies[c]
			if (!companyAdjacentAreas[c][areaIndex]) {
				continue
			}
			// The area's source capacity is cut to one below what the current plan
			// ships, so one unit of this area can ONLY be loaded onto this
			// company's ships. Reaching the max count then proves this company can
			// carry one of the area's goods without dropping any shipments.
			const modifiedProductionCapacity = productionCapacity.slice()
			modifiedProductionCapacity[areaIndex] = areaShippedCount[areaIndex] - 1
			const graph = createShippingGraph(mapData, cityTerritory, cityCapacity, playerCosts, unfavouredPlayerSubsidies, allProductionAreas, modifiedProductionCapacity, shippingCompanies, [])
			addForcedSourceEdges(graph, mapData, allProductionAreas, shippingCompanies, areaIndex, c, unfavouredPlayerSubsidies)
			const candidate = findPossibleJourneys(graph, productionAreas, shippingCompanies)
			if (candidate.length !== journeys.length) {
				continue
			}
			if (!candidate.some((journey) => journey[2] === company.id && productionAreas[areaIndex].includes(journey[0]))) {
				continue
			}
			// Don't offer a switch that would leave the displayed plan unchanged
			const candidateKey = candidate.map((journey) => JSON.stringify(journey)).sort().join("|")
			if (candidateKey === baseKey) {
				continue
			}
			for (let row = 0; row < journeys.length; row++) {
				if (rowAreas[row] === areaIndex) {
					if (!byGood[journeys[row][0]]) {
						byGood[journeys[row][0]] = []
					}
					byGood[journeys[row][0]].push({ player: company.player, id: company.id, journeys: candidate })
				}
			}
		}
	}
	return { byGood }
}

export function completeCurrentPath(cityTerritory, activeCompanies, playerCosts, unfavouredPlayerSubsidies, playerSlots, playerIndex, slotIDX, currentGoodJourney) {
	const mapData = useModelStore().mapData

	const activeSlot = playerSlots[playerIndex][slotIDX]
	if (activeSlot.length === 0) {
		return []
	}
	const activeCompany = model.slotCompanies(activeSlot, activeCompanies)
	if (activeCompany.type === rf.COMPANY_SHIPPING) {
		return []
	}
	
	const shippingCompanies = allPlayerShippingCompanies(playerSlots, activeCompanies)

	const allProductionAreas = contiguousProductionAreas(mapData, activeCompany)
	let productionAreas = allProductionAreas
	// exclude other production areas than selected
	if (currentGoodJourney.length > 0) {
		const selectedProduction = currentGoodJourney[0]
		productionAreas = subtractAllGoodMarkersExcept(selectedProduction, productionAreas)
	}
	const productionCapacity = productionAreas.map((a) => a.length)

	// disable edges leading off from the current path
	if (currentGoodJourney.length > 1) {
		const companyId = currentGoodJourney[2]
		const addedCapacity = [{
			id: companyId,
			ships: currentGoodJourney.slice(3)}]
		const graph = createShippingGraph(mapData, [cityTerritory], [1], playerCosts, unfavouredPlayerSubsidies, allProductionAreas, productionCapacity, shippingCompanies, addedCapacity)
		restrictGraphToCurrentGoodJourney(graph, productionAreas, shippingCompanies, currentGoodJourney)
		const journeys = findPossibleJourneys(graph, productionAreas, shippingCompanies)
		return journeys[0]
	}
	else {
		const ownCompanies = shippingCompanies.filter((a) => a.player == playerIndex)
		// use -1 as player index to trick algorithm into taking the shortest path as though the ships were owned by another player
		const ownGraph = createShippingGraph(mapData, [cityTerritory], [1], playerCosts, unfavouredPlayerSubsidies, allProductionAreas, productionCapacity, ownCompanies, [])
		const ownJourneys = findPossibleJourneys(ownGraph, productionAreas, ownCompanies)
		if (ownJourneys.length > 0)
		{
			return ownJourneys[0]
		}
		else {
			const otherCompanies = shippingCompanies.filter((a) => a.player != playerIndex)
			const otherGraph = createShippingGraph(mapData, [cityTerritory], [1], playerCosts, unfavouredPlayerSubsidies, allProductionAreas, productionCapacity, otherCompanies, [])
			const journeys = findPossibleJourneys(otherGraph, productionAreas, otherCompanies)
			return journeys[0]
		}
	}
}

export function getCitiesReachableByShipping(cities, activeCompanies, playerSlots, playerIndex, slotIDX, subtractedRoutes, currentGoodJourney) {
	const mapData = useModelStore().mapData

	const subtractedGoodMarkers = subtractedRoutes.map((route) => route[0])

	const activeSlot = playerSlots[playerIndex][slotIDX]
	if (activeSlot.length === 0) {
		return []
	}
	const activeCompany = model.slotCompanies(activeSlot, activeCompanies)
	if (activeCompany.type === rf.COMPANY_SHIPPING) {
		return []
	}
	const currentGood = activeCompany[0].good

	const shippingCompanies = allPlayerShippingCompanies(playerSlots, activeCompanies)
	const playerCosts = playerSlots.map((_) => 1)
	const unfavouredPlayerSubsidies = playerSlots.map((_) => 0)

	const allProductionAreas = contiguousProductionAreas(mapData, activeCompany)
	let productionAreas = subtractGoodMarkers(subtractedGoodMarkers, allProductionAreas)
	// exclude other production areas than selected
	if (currentGoodJourney.length > 0) {
		const selectedProduction = currentGoodJourney[0]
		productionAreas = subtractAllGoodMarkersExcept(selectedProduction, productionAreas)
	}
	const productionCapacity = productionAreas.map((a) => a.length)

	const cityTerritory = cities.map((city) => city.territory)
	const cityCapacity = cities.map((city) => city.size - city.receivedGoods.filter((good) => good === currentGood).length)

	let graph = createShippingGraph(mapData, cityTerritory, cityCapacity, playerCosts, unfavouredPlayerSubsidies, allProductionAreas, productionCapacity, shippingCompanies, [])

	// disable edges leading off from the current path
	if (currentGoodJourney.length > 1) {
		const companyId = currentGoodJourney[2]
		const addedCapacity = [{
			id: companyId,
			ships: currentGoodJourney.slice(3)}]
		graph = createShippingGraph(mapData, cityTerritory, cityCapacity, playerCosts, unfavouredPlayerSubsidies, allProductionAreas, productionCapacity, shippingCompanies, addedCapacity)
		restrictGraphToCurrentGoodJourney(graph, productionAreas, shippingCompanies, currentGoodJourney)
	}

	function edgeReversed(n, from) {
		return graph.edgeNodes[n][1] === from
	}

	function isTraversible(n) {
		return !(graph.edgeHasLimit[n] && graph.edgeLimit[n] <= 0)
	}

	let reached = new Array(graph.edges.length)
	reached.fill(false)

	function traverse(from) {
		for (const edge of graph.nodeEdges[from]) {
			if (!reached[edge] && !edgeReversed(edge, from) && isTraversible(edge)) {
				reached[edge] = true
				traverse(graph.edgeNodes[edge][1])
			}
		}
	}

	traverse(graph.source)

	let result = []
	for (let n = 0; n < graph.edges.length; n++) {
		const origin = graph.edgeOrigin[n]
		if (origin.type === "city" && reached[n]) {
			result.push(origin.territory)
		}
	}
	return result
}

export function makeShowShippingArray(goodJourneys) {
	const displayArray = []
	for (let i = 0; i < goodJourneys.length; i++) {
		const goodJourney = goodJourneys[i]
		// Prod Terr ID
		displayArray.push([0, goodJourney[0]])
		for (let j = 3; j < goodJourney.length-1; j++) {
			// Ship terrs = [compID, terrID]
			displayArray.push([1, [goodJourney[2], goodJourney[j]]])
		}
		// City terrID
		displayArray.push([2, goodJourney[goodJourney.length-1]])
	}
	return displayArray
}