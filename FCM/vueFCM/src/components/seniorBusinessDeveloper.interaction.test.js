import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { createRenderer, h, nextTick } from "vue"

// Exercise compiled SFC templates and their event handlers/watchers in Node.
// Only the DOM-only animation wrapper is replaced; game components stay real.
vi.mock("vue", async (importOriginal) => {
	const vue = await importOriginal()
	return { ...vue, TransitionGroup: (_, { slots }) => slots.default?.() }
})

function element(type, text = "") {
	const classes = new Set()
	return { type, text, props: {}, children: [], parent: null, style: {}, classList: {
		add: (...names) => names.forEach((name) => classes.add(name)),
		remove: (...names) => names.forEach((name) => classes.delete(name)),
	} }
}
const renderer = createRenderer({
	createElement: element,
	createText: (text) => element("text", text),
	createComment: (text) => element("comment", text),
	setText: (node, text) => { node.text = text },
	setElementText: (node, text) => { node.text = text; node.children = [] },
	patchProp: (node, key, _, value) => { node.props[key] = value },
	insert(node, parent, anchor = null) {
		if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
		const index = anchor ? parent.children.indexOf(anchor) : -1
		parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
		node.parent = parent
	},
	remove(node) {
		if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
		node.parent = null
	},
	parentNode: (node) => node.parent,
	nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1],
})
function findAll(root, predicate) {
	return [...(predicate(root) ? [root] : []), ...root.children.flatMap((child) => findAll(child, predicate))]
}
function hasClass(node, name) { return String(node.props.class || "").split(" ").includes(name) }
let app, root, store, rf, model, map, rules, controller, useModelStore, usePersonalStore
let ActionAreaWorkingDay, MapHighlight
beforeAll(async () => {
	globalThis.window = { performance }
	globalThis.document = { addEventListener() {} }
	globalThis.alert = () => {}
	rf = await import("../js/FCMreference.js")
	model = await import("../js/FCMmodel.js")
	map = await import("../js/FCMmap.js")
	rules = await import("../js/FCMrules.js")
	controller = await import("../js/FCMcontroller.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
	;({ usePersonalStore } = await import("../stores/FCMpersonal.js"))
	;({ default: ActionAreaWorkingDay } = await import("./ActionAreaWorkingDay.vue"))
	;({ default: MapHighlight } = await import("./MapHighlight.vue"))
})
afterEach(() => { app?.unmount(); app = null })
const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]
function freshGame() {
	const pinia = createPinia()
	setActivePinia(pinia)
	store = useModelStore()
	const personal = usePersonalStore()
	personal.pov = 0
	model.setInternalStartingOptions([rf.SO_SENIOR_BUSINESS_DEVELOPER])
	model.setupNewGame({ playerNames: ["P0", "P1"], startingMap: STARTING_MAP })
	store.mapData.tiles = map.expandMapToFullGrid(STARTING_MAP, 2)
	map.initCoords()
	store.players[0].employees = [rf.SENIOR_BUSINESS_DEVELOPER]
	store.gameflow.turn = 5
	store.gameflow.phase = rf.PHASE_WORKING_DAY
	store.gameflow.subphase = rf.SUBPHASE_SBD_HOUSES
	store.gameflow.fullTurnOrder = [0, 1]
	store.gameflow.turnOrder = [0, 1]
	store.bank = 500
	root = element("root")
	app = renderer.createApp({ render: () => [h(ActionAreaWorkingDay), h(MapHighlight)] })
	app.use(pinia)
	app.config.globalProperties.$t = (key) => key
	app.mount(root)
	return store
}
async function click(node) {
	expect(node, "rendered clickable element").toBeDefined()
	let target = node
	while (target && !target.props.onClick) target = target.parent
	expect(target, "click target or its ancestor has a Vue click handler").toBeDefined()
	target.props.onClick({ target: node, stopPropagation() {}, preventDefault() {} })
	await nextTick()
}
function square(index) {
	return findAll(root, (n) => hasClass(n, "higlightSquareToClick") && n.props["data-index"] === index)[0]
}
function image(name) {
	return findAll(root, (n) => n.type === "img" && String(n.props.src).includes(name))[0]
}

describe("rotation ghost display boundaries — real Vue events", () => {
	async function setupPlacement(kind) {
		freshGame()
		controller.setupHousesAndGardensPhase()
		if (kind === "milestone") {
			store.availableMilestones.push(rf.FIRST_SENIOR_BUSINESS_DEVELOPER_USED)
			controller.clickedHouseSquare(store.highlights.indexesToHighlightYellow[0])
		}
		await nextTick()
		return findAll(root, (n) => n.props.alt === "GI Image")[0]
	}
	it.each(["house", "milestone"])("does not create a %s ghost before any hover", async (kind) => {
		const ghost = await setupPlacement(kind)
		expect(store.viewSettings.currentGhostIndex).toBe(-1)
		await click(image("rot_clockwise"))
		expect(ghost.style.display).not.toBe("block")
		expect(ghost.src).toBeUndefined()
	})
	it.each(["house", "milestone"])("does not revive a %s ghost after leaving the map", async (kind) => {
		const ghost = await setupPlacement(kind)
		const hovered = square(store.highlights.indexesToHighlightYellow[0])
		hovered.props.onMouseover({ target: hovered })
		await nextTick()
		expect(ghost.style.display).toBe("block")
		hovered.props.onMouseleave({ target: hovered, relatedTarget: null })
		await nextTick()
		expect(store.viewSettings.currentGhostIndex).toBeNull()
		await click(image("rot_clockwise"))
		expect(ghost.style.display).toBe("none")
	})
	it.each(["house", "milestone"])("does not refresh a %s ghost when rotation makes its hovered position illegal", async (kind) => {
		const ghost = await setupPlacement(kind)
		const index = store.highlights.indexesToHighlightYellow[0]
		const hovered = square(index)
		hovered.props.onMouseover({ target: hovered })
		await nextTick()
		// A stale, out-of-map hover anchor is never a legal placement option.
		store.viewSettings.currentGhostIndex = store.mapData.coords.length
		await click(image("rot_clockwise"))
		expect(ghost.style.display).toBe("none")
	})
})

describe("OUT hover anchor — real Vue mouseover", () => {
	it.each(["APARTMENT_3", "APARTMENT_9", "APARTMENT_15", "APARTMENT_21", "APARTMENT_27"])("aligns every square of %s to the apartment anchor", async (key) => {
		freshGame()
		const index = map.locationFor(3, 3, false)[0]
		model.addApartment(rf[key], index)
		controller.setupHousesAndGardensPhase()
		await nextTick()
		await click(findAll(root, (n) => n.props.alt === "items.moveOut")[0])
		const view = await import("../js/FCMview.js")
		const [x, y] = view.getXYforSmallSquare(index)
		const ghost = findAll(root, (n) => n.props.alt === "GI Image")[0]
		for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
			const hovered = square(index + col + row * rf.ssW)
			expect(hovered).toBeDefined()
			hovered.props.onMouseover({ target: hovered })
			await nextTick()
			expect(ghost.src).toContain("moved_out")
			expect(ghost.style.display).toBe("block")
			expect([ghost.style.left, ghost.style.top]).toEqual([x + "px", y + "px"])
		}
	})
})

describe("OUT history footprints — actual move-out records and rendered highlights", () => {
	for (const format of ["compact", "legacy"]) {
		it.each(["APARTMENT_3", "APARTMENT_9", "APARTMENT_15", "APARTMENT_21", "APARTMENT_27", "house"])(`${format} history highlights the full %s footprint`, async (key) => {
			freshGame()
			let number, index
			if (key === "house") {
				number = rules.moveOutCandidateHouses().find((n) => !rf.APARTMENTS.includes(n))
				index = map.findIndexForHouse(number)
			} else {
				number = rf[key]
				index = map.locationFor(3, 3, false)[0]
				model.addApartment(number, index)
			}
			expect(index).toBeGreaterThanOrEqual(0)
			controller.setupHousesAndGardensPhase()
			await nextTick()
			await click(findAll(root, (n) => n.props.alt === "items.moveOut")[0])
			await click(square(index))
			const entry = store.history.find((h) => h[0] === rf.HIST_SBD_MOVE_OUT)
			expect(entry[3]).toEqual([number])
			const { exportIndex } = await import("../js/FCMfuncs.js")
			const { setupHistoryHighlight } = await import("../js/FCMhistory.js")
			setupHistoryHighlight(entry[0], format === "compact" ? entry[3] : [exportIndex(index), number])
			await nextTick()
			const size = key === "house" ? 2 : 3
			const expected = []
			for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) expected.push(index + col + row * rf.ssW)
			expect([...store.historyHelpers.indexesToHighlightYellow].sort((a, b) => a - b)).toEqual(expected)
			expect(findAll(root, (n) => hasClass(n, "higlightSquareHistory"))).toHaveLength(size * size)
		})
	}
})

describe("SBD OUT token — real Vue choice and map click", () => {
	it.each(["APARTMENT_3", "APARTMENT_9", "APARTMENT_15", "APARTMENT_21", "APARTMENT_27"])("offers %s without demand and places OUT from its far corner", async (apartmentKey) => {
		freshGame()
		const apartment = rf[apartmentKey]
		const index = map.locationFor(3, 3, false)[0]
		model.addApartment(apartment, index)
		// Printed apartments live in map coords, not the player-built house list.
		if (apartment === rf.APARTMENT_3 || apartment === rf.APARTMENT_9) {
			store.houses = store.houses.filter((house) => house.number !== apartment)
		}
		controller.setupHousesAndGardensPhase()
		await nextTick()
		await click(findAll(root, (n) => n.props.alt === "items.moveOut")[0])
		expect(store.context.selectedBuilding).toBe(-2)
		const corner = index + 2 + 2 * rf.ssW
		expect(store.highlights.indexesToHighlightYellow).toContain(corner)
		await click(square(corner))
		expect(store.needs.find((n) => n.number === apartment).pendingMoveOut).toBe(true)
		expect(store.seniorBusinessDeveloper.outTokensUsed).toBe(1)
		expect(store.history.find((entry) => entry[0] === rf.HIST_SBD_MOVE_OUT)[3]).toEqual([apartment])
		expect(store.context.justBuilt).toHaveLength(1)
		expect(rules.moveOutCandidateHouses()).not.toContain(apartment)
		controller.chooseMoveOutHouse(index)
		expect(store.seniorBusinessDeveloper.outTokensUsed).toBe(1)
	})
	it.each(["demand", "pending", "movedOut"])("does not highlight or evict an apartment with %s", async (reason) => {
		freshGame()
		const index = map.locationFor(3, 3, false)[0]
		model.addApartment(rf.APARTMENT_15, index)
		model.addNeedToHouse(rf.BURGER, rf.APARTMENT_15, 0)
		const need = store.needs.find((n) => n.number === rf.APARTMENT_15)
		if (reason !== "demand") {
			need.needs = []
			if (reason === "pending") need.pendingMoveOut = true
			else need.movedOut = true
		}
		controller.selectMoveOutToBuild()
		await nextTick()
		expect(rules.moveOutCandidateHouses()).not.toContain(rf.APARTMENT_15)
		expect(square(index)).toBeUndefined()
		controller.chooseMoveOutHouse(index)
		expect(store.seniorBusinessDeveloper.outTokensUsed).toBe(0)
	})
	it("hides OUT when its shared pool is exhausted or the module is disabled", async () => {
		freshGame()
		store.seniorBusinessDeveloper.outTokensUsed = rules.SBD_OUT_TOKEN_POOL
		await nextTick()
		expect(findAll(root, (n) => n.props.alt === "items.moveOut")).toHaveLength(0)
		store.seniorBusinessDeveloper.outTokensUsed = 0
		store.startingOptions.seniorBusinessDeveloper = false
		await nextTick()
		expect(rules.moveOutCandidateHouses()).toEqual([])
		expect(findAll(root, (n) => n.props.alt === "items.moveOut")).toHaveLength(0)
	})
})

describe("SBD milestone — real Vue rotation and tile placement", () => {
	it.each(["house", "garden", "apartment", "OUT"])("keeps tile placement after %s reward and either rotation arrow", async (action) => {
		freshGame()
		store.availableMilestones.push(rf.FIRST_SENIOR_BUSINESS_DEVELOPER_USED)
		controller.setupHousesAndGardensPhase()
		if (action === "garden") {
			const house = rules.givePossibleHousesForGarden()[0]
			store.context.house = house
			store.context.houseIndex = map.findIndexForHouse(house)
			store.context.selectedBuilding = -1
			controller.chooseHouseEdge(map.findFreeEdgesForHouse(house)[0], -1)
		} else if (action === "OUT") {
			controller.selectMoveOutToBuild()
			controller.clickedHouseSquare(store.highlights.indexesToHighlightYellow[0])
		} else {
			if (action === "apartment") controller.selectApartmentToBuild(rf.APARTMENT_15)
			controller.clickedHouseSquare(store.highlights.indexesToHighlightYellow[0])
		}
		await nextTick()
		expect(store.players[0].milestones).toContain(rf.FIRST_SENIOR_BUSINESS_DEVELOPER_USED)
		expect(store.context.lobbyistMilestoneActive).toBe(true)
		const choices = findAll(root, (n) => hasClass(n, "lobbyistTileChoiceImg"))
		await click(choices[1])
		const tile = store.context.newLobbyistTile
		const justBuilt = [...store.context.justBuilt]
		const historyLength = store.history.length
		const hovered = square(store.highlights.indexesToHighlightYellow[0])
		hovered.props.onMouseover({ target: hovered })
		await nextTick()
		const ghost = findAll(root, (n) => n.props.alt === "GI Image")[0]
		const tileSrc = ghost.src
		expect(tileSrc).toContain("map")
		for (const [name, rotations] of [["rot_clockwise", [1, 2, 3, 0]], ["rot_anticlockwise", [3, 2, 1]]]) {
			for (const rotation of rotations) {
				await click(image(name))
				expect(store.context.rotation).toBe(rotation)
				expect(ghost.src).toBe(tileSrc)
				expect(ghost.style.transform).toBe(`rotate(${rotation * 90}deg)`)
				expect(ghost.style.width).toBe(store.refSize + "px")
				expect(store.context.newLobbyistTile).toBe(tile)
				expect(store.context.lobbyistMilestoneActive).toBe(true)
				expect(store.context.lobbyistMilestoneReturnPhase).toBe("sbd")
				expect(store.context.justBuilt).toEqual(justBuilt)
				expect(store.history).toHaveLength(historyLength)
				expect(store.highlights.indexesToHighlightYellow).toEqual(rules.givePossibilitiesForNewTile())
				expect(findAll(root, (n) => hasClass(n, "lobbyistTileChoiceImg"))).not.toHaveLength(0)
			}
		}
		const position = store.highlights.indexesToHighlightYellow[0]
		expect(position).toBeDefined()
		await click(square(position))
		expect(store.context.lobbyistMilestoneActive).toBe(false)
		expect(store.gameflow.subphase).toBe(rf.SUBPHASE_SBD_HOUSES)
		const entry = store.history.find((h) => h[0] === rf.HIST_NEW_TILE)
		expect(entry[3][1]).toBe(tile)
		expect(entry[3][2]).toBe(1)
		expect(store.mapData.tiles[entry[3][3] * 2]).toBe(tile)
		expect(store.mapData.tiles[entry[3][3] * 2 + 1]).toBe(1)
	})
})
