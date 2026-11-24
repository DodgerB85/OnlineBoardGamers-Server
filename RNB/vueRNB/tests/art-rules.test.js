/**
 * ART (&c) regression tests: atelier production verification, caravan cargo
 * limits, powered marble production, show persistence and artwork scoring.
 *
 * Run with:
 *     node --test tests/art-rules.test.js
 */
import test from "node:test"
import assert from "node:assert/strict"
import { register } from "node:module"

// The source uses vite-style extensionless imports, so teach node how to resolve them.
const loaderSource = `
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"
export async function resolve(specifier, context, nextResolve) {
	if ((specifier.startsWith(".") || specifier.startsWith("/")) && !path.extname(specifier)) {
		const parent = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd()
		const base = specifier.startsWith("/") ? specifier : path.resolve(path.dirname(parent), specifier)
		if (existsSync(base + ".js")) return { url: pathToFileURL(base + ".js").href, shortCircuit: true }
	}
	return nextResolve(specifier, context)
}
`
register("data:text/javascript," + encodeURIComponent(loaderSource), import.meta.url)

// Minimal browser surface the RNB code expects (same as ghost-turn.test.js).
globalThis.window = globalThis.window || {}
globalThis.window.atob = globalThis.window.atob || globalThis.atob
globalThis.window.btoa = globalThis.window.btoa || globalThis.btoa
globalThis.window.initData = {
	pov: 0,
	playerNames: [],
	gameID: 1,
	gameName: "art-rules-test",
	gameCreationTimestamp: 0,
	finishedGame: false,
	startingMap: [],
	startingOptions: [],
	preferredRNBoptions: {},
	currentMoveData: {},
	allMyMoveData: [],
	allStackData: [],
	currentPlayers: [],
	transactionID: "",
	kickoutRequired: 0,
	secondsToNextKickout: 99999,
	notes: "",
	yourTurnAudioType: 0,
	myStatsExcludeConsent: 0,
	statsExcludedGame: false,
}
function makeElementStub() {
	return {
		style: {},
		classList: { add: () => {}, remove: () => {}, contains: () => false },
		setAttribute: () => {},
		appendChild: () => {},
		removeChild: () => {},
		innerHTML: "",
		textContent: "",
		content: { firstChild: null },
		firstChild: null,
		children: [],
		parentNode: null,
	}
}
globalThis.document = globalThis.document || {
	cookie: "",
	getElementById: () => null,
	querySelector: () => null,
	querySelectorAll: () => [],
	documentElement: { clientWidth: 800, clientHeight: 600 },
	createElement: () => makeElementStub(),
	createElementNS: () => makeElementStub(),
	createTextNode: () => ({}),
	createComment: () => ({}),
	body: makeElementStub(),
	head: makeElementStub(),
}
globalThis.window.document = globalThis.window.document || globalThis.document
globalThis.alert = globalThis.alert || (() => {})

let rf, hd, map, model, produce, stack, atelier, funcs, view, highlight, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js") // attaches the pako browser global used by RNBfuncs.js
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	hd = await import("../src/js/RNBhex.js")
	map = await import("../src/js/RNBmap.js")
	model = await import("../src/js/RNBmodel.js")
	produce = await import("../src/js/RNBproduce.js")
	stack = await import("../src/js/RNBstack.js")
	atelier = await import("../src/js/RNBatelier.js")
	funcs = await import("../src/js/RNBfuncs.js")
	view = await import("../src/js/RNBview.js")
	highlight = await import("../src/js/RNBhighlight.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

// Two players on one pasture hex. The extra fixtures are added per test.
function setupArtMap() {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.pov = 0
	personal.soloGame = false
	personal.trainingGame = false
	personal.gameCreationTimestamp = 0

	store.players.splice(0)
	for (const [name, colour] of [["A", 0], ["B", 1], ["C", 2]]) {
		store.players.push({ name, displayName: name, colour, RnD: [0, 0, 0, 0, 0, 0, 0, 0], artShownAt: {} })
	}

	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_PRODUCTION_TO
	store.gameflow.turnOrder = [0, 1]
	store.gameflow.fullTurnOrder = [0, 1]
	store.gameflow.wonderPrayingOrder = [0, 1]
	store.gameflow.wonderTurnOrder = [0, 1]

	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)
	store.ALL_HOME_MARKERS.splice(0)
	store.wonderBricks.splice(0)
	store.history.splice(0)
	store.actionStack.splice(0)

	store.gameOptions.useArt = true
	store.gameOptions.useElectricity = false
	store.context.poweredHexIDs.splice(0)

	const pasture = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_1)
	pasture.hexID = 0
	store.mapData.hexData.push(pasture)
	const bucketID = pasture.bucketIdsCurrent[pasture.nodeBucketIds[0]]

	return { store, personal, bucketID }
}

function addTransporter(store, id, type, location, ownerIndex = 0) {
	store.ALL_TRANSPORTERS.push({
		id,
		type,
		uniqueID: String(id).padStart(11, "0"),
		location: [...location],
		remainingMoves: rf.getTransporterStats(type).maxMoves,
		ownerIndex,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
		animationWaypoints: [],
		rawTransporterXY: [0, 0],
	})
}

function addCaravanWithArt(store, id, artCount, ownerIndex = 0) {
	addTransporter(store, id, rf.EXHIBITION_TRANSPORTER, [rf.LOCATION_LAND_VERTEX, 0, 0], ownerIndex)
	for (let i = 0; i < artCount; i++) {
		model.addResourceToGame_core(rf.ALL_ARTWORK_RES[i], [rf.LOCATION_BUCKET, 0, 0], 9)
		store.ALL_RESOURCES[store.ALL_RESOURCES.length - 1].location = [rf.LOCATION_TRANSPORTER, id]
	}
	return model.getTransporterByID(id)
}

test("atelier donkey->caravan production verifies with the recipe index in the last stack slot", skip, () => {
	const { store, bucketID } = setupArtMap()
	const atelierLocation = [rf.LOCATION_BUCKET, 0, bucketID]
	store.ALL_BUILDINGS.push({ id: 0, type: rf.BLDG_ATELIER, location: atelierLocation, remainingConversions: 1, uniqueID: "atelier" })
	addTransporter(store, 0, rf.DONKEY, [rf.LOCATION_LAND_VERTEX, 0, 0])

	// [action, buildingID, transporterID, location, removedTransporterID, recipeIndex]
	const caravanRecipe = [rf.STACK_MANUAL_PRODUCTION, 0, 0, [...stack.compressLocation(atelierLocation)], 0, 5]
	assert.equal(stack.verifySingleStackAction({ action: rf.STACK_MANUAL_PRODUCTION, historyEntry: caravanRecipe, playerIndex: 0 }), 0)

	// An artwork recipe still verifies (the donkey carries 1 paper + 1 fuel)
	model.addResourceToGame_core(rf.RES_PAPER, [rf.LOCATION_BUCKET, 0, bucketID], 9)
	model.addResourceToGame_core(rf.RES_FUEL, [rf.LOCATION_BUCKET, 0, bucketID], 9)
	store.ALL_RESOURCES[0].location = [rf.LOCATION_TRANSPORTER, 0]
	store.ALL_RESOURCES[1].location = [rf.LOCATION_TRANSPORTER, 0]
	const sketchRecipe = [rf.STACK_MANUAL_PRODUCTION, 0, 0, [...stack.compressLocation(atelierLocation)], 2]
	assert.equal(stack.verifySingleStackAction({ action: rf.STACK_MANUAL_PRODUCTION, historyEntry: sketchRecipe, playerIndex: 0 }), 0)
})

test("a caravan cannot pick up another transporter", skip, () => {
	const { store } = setupArtMap()
	addTransporter(store, 0, rf.EXHIBITION_TRANSPORTER, [rf.LOCATION_LAND_VERTEX, 0, 0])
	addTransporter(store, 1, rf.WAGON, [rf.LOCATION_LAND_VERTEX, 0, 0])

	const entry = [rf.STACK_PICKUP_TRANSPORTER, 0, 1, [0]]
	assert.equal(stack.verifySingleStackAction({ action: rf.STACK_PICKUP_TRANSPORTER, historyEntry: entry, playerIndex: 0 }), 4)
})

test("an exhibition caravan moves through a wall that blocks a donkey", skip, () => {
	const { store } = setupArtMap()
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	const across = hd.createActualHex([0, 1, -1], 0, rf.PASTURE_1)
	across.hexID = 1
	store.mapData.hexData.push(across)
	map.addNewEdge([0, 1])
	store.mapData.edgeData[0].wall = [0, 1] // player 1's wall

	const reachesAcross = () => store.context.hexPiecesToHighlightUnderTransporters.some(([hexID]) => hexID === 1)

	addTransporter(store, 0, rf.EXHIBITION_TRANSPORTER, [rf.LOCATION_LAND_VERTEX, 0, 0])
	highlight.highlightEligibleHexAreasForTransporterMove(0)
	assert.ok(reachesAcross(), "the caravan crosses the wall")

	store.ALL_TRANSPORTERS.splice(0)
	addTransporter(store, 0, rf.DONKEY, [rf.LOCATION_LAND_VERTEX, 0, 0])
	highlight.highlightEligibleHexAreasForTransporterMove(0)
	assert.ok(!reachesAcross(), "the donkey is stopped by the wall")
})

test("every exhibition takes place, and non-shows carry the reason why", skip, () => {
	const { store, bucketID } = setupArtMap()
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	// A and B both have starting tiles on hex 0; C's shows count on both.
	store.ALL_HOME_MARKERS.push({ ownerIndex: 0, location: [rf.LOCATION_BUCKET, 0, bucketID] })
	store.ALL_HOME_MARKERS.push({ ownerIndex: 1, location: [rf.LOCATION_BUCKET, 0, bucketID] })

	// One artwork: too few for a show, but the caravan still vanishes.
	const one = addCaravanWithArt(store, 0, 1)
	const tooFew = atelier.checkExhibitionOnMove(one)
	assert.equal(tooFew.beauty, 0)
	assert.equal(tooFew.reason.code, rf.ART_NO_SHOW_TOO_FEW)
	assert.equal(tooFew.reason.actualBeauty, 1)
	assert.equal(tooFew.reason.required, 3)
	assert.equal(one.location[0], rf.LOCATION_OOB, "the caravan vanishes either way")

	// Three different artworks: a show.
	const three = addCaravanWithArt(store, 1, 3)
	const show = atelier.checkExhibitionOnMove(three)
	assert.equal(show.beauty, 3)
	assert.equal(show.reason, null)
	assert.deepEqual(store.players[0].artShownAt, { 1: 3 })
	const showEntry = store.actionStack[store.actionStack.length - 1].historyEntry
	assert.equal(showEntry.length, 5, "a show has no reason element")
	assert.ok(showEntry.every((entry) => entry !== null), "history entries may not contain nulls")

	// Same player at the same tile: only one show per tile.
	const again = addCaravanWithArt(store, 2, 4)
	const already = atelier.checkExhibitionOnMove(again)
	assert.equal(already.reason.code, rf.ART_NO_SHOW_ALREADY_SHOWN)

	// C has a better show at A's tile, so B's 4 works do not beat it.
	store.players[2].artShownAt = { 0: 4 }
	const notBest = addCaravanWithArt(store, 3, 4, 1)
	const tooSmall = atelier.checkExhibitionOnMove(notBest)
	assert.equal(tooSmall.beauty, 0)
	assert.equal(tooSmall.reason.code, rf.ART_NO_SHOW_NOT_BEST)
	assert.equal(tooSmall.reason.best, 4)
	assert.equal(tooSmall.reason.required, 5)

	// Five works already shown: no further exhibitions are possible.
	store.players[2].artShownAt = { 0: 5 }
	const noMore = addCaravanWithArt(store, 4, 5, 1)
	const impossible = atelier.checkExhibitionOnMove(noMore)
	assert.equal(impossible.reason.code, rf.ART_NO_SHOW_NOT_BEST)
	assert.equal(impossible.reason.noMore, true)
})

test("exhibition popup reasons are readable", skip, () => {
	assert.match(view.exhibitionReasonText({ code: rf.ART_NO_SHOW_TOO_FEW, actualBeauty: 1, required: 3 }), /1 of the 3/)
	assert.match(view.exhibitionReasonText({ code: rf.ART_NO_SHOW_ALREADY_SHOWN }), /one show/i)
	assert.match(view.exhibitionReasonText({ code: rf.ART_NO_SHOW_NOT_BEST, best: 4, required: 5 }), /4 works/)
	assert.match(view.exhibitionReasonText({ code: rf.ART_NO_SHOW_NOT_BEST, best: 5, required: 6, noMore: true }), /no further/i)
})

test("the exhibition popup targets the arrival hex and celebrates only a show", skip, () => {
	view.showExhibitionPopup({ beauty: 3, reason: null, hexID: 42 })
	assert.equal(view.exhibitionPopup.show, true)
	assert.equal(view.exhibitionPopup.isShow, true)
	assert.equal(view.exhibitionPopup.hexID, 42)
	assert.ok(view.exhibitionPopup.confetti.length > 0)
	assert.ok(view.exhibitionPopup.fireworks.length > 0)
	view.closeExhibitionPopup()
	assert.equal(view.exhibitionPopup.show, false)

	view.showExhibitionPopup({ beauty: 0, reason: { code: rf.ART_NO_SHOW_TOO_FEW, actualBeauty: 1, required: 3 }, hexID: 7 })
	assert.equal(view.exhibitionPopup.isShow, false)
	assert.equal(view.exhibitionPopup.hexID, 7)
	assert.equal(view.exhibitionPopup.confetti.length, 0)
	assert.ok(view.exhibitionPopup.reasonText.length > 0)
	view.closeExhibitionPopup()
})

test("a powered quarry produces one marble, then a normal stone", skip, () => {
	const { store, bucketID } = setupArtMap()
	const quarryLocation = [rf.LOCATION_BUCKET, 0, bucketID]
	store.ALL_BUILDINGS.push({ id: 0, type: rf.BLDG_QUARRY, location: quarryLocation, remainingConversions: 1, uniqueID: "quarry" })
	for (let i = 0; i < 3; i++) model.addResourceToGame_core(rf.RES_STONE, quarryLocation, 9)

	store.gameOptions.useElectricity = true
	store.context.poweredBucketKeys = [`0:${bucketID}`]
	produce.addBuildingOutputResourcesToGame_core(0, -1, 9)

	const onHex = store.ALL_RESOURCES.filter((r) => r.location[1] === 0)
	assert.equal(onHex.filter((r) => r.type === rf.RES_MARBLE).length, 1, "one marble")
	assert.equal(onHex.filter((r) => r.type === rf.RES_STONE).length, 4, "the 3 stones plus one normal stone")
})

test("shows are rebuilt from the history on load, not from the player export", skip, () => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.gameOptions.useArt = true

	// Player 0's exported artShownAt is deliberately wrong (5); history says 3.
	const input = [
		[[["A"], 0, { 1: 5 }], [["B"], 1]],
		[],
		[],
		[],
		[
			[rf.HIST_STACK_ACTIONS, 0, 0, [rf.PHASE_MOVEMENT_TO, [rf.STACK_EXHIBITION, 9, 0, 1, 3]]],
			[rf.HIST_STACK_ACTIONS, 0, 0, [rf.PHASE_MOVEMENT_TO, [rf.STACK_EXHIBITION, 9, 1, 0, 0]]],
			// An older save wrote a null reason for a successful show
			[rf.HIST_STACK_ACTIONS, 0, 0, [rf.PHASE_MOVEMENT_TO, [rf.STACK_EXHIBITION, 9, 1, 0, 4, null]]],
		],
		[],
	]
	const b64 = globalThis.btoa(String.fromCharCode(...globalThis.pako.gzip(JSON.stringify(input))))
	funcs.importRNBmodel(b64, true)

	assert.deepEqual(store.players[0].artShownAt, { 1: 3 }, "the recorded show from history")
	assert.deepEqual(store.players[1].artShownAt, { 0: 4 }, "no-show reasons are not recorded")
	assert.equal(store.history[2][3][1].length, 5, "a null show reason is cleaned on load")
})

test("every atelier recipe output has a bubble name", skip, () => {
	const stats = rf.BUILDING_STATS.find((b) => b.building === rf.BLDG_ATELIER)
	for (const recipe of stats.recipes) {
		const name = recipe.output > rf.RES_UPPER_LIMIT ? rf.ALL_TRANSPORTER_STRINGS[recipe.output - rf.DONKEY] : rf.ALL_RES_STRINGS[recipe.output]
		assert.ok(name, `recipe output ${recipe.output} has a display name`)
	}
	assert.equal(rf.ALL_RES_STRINGS[rf.RES_WOOD_CARVING], "Wood Carving")
	assert.equal(rf.ALL_TRANSPORTER_STRINGS[rf.EXHIBITION_TRANSPORTER - rf.DONKEY], "Exhibition Caravan")
})

test("artwork scores 20 each, multiplied by one plus the number of tiles shown", skip, () => {
	const { store, bucketID } = setupArtMap()
	addTransporter(store, 0, rf.DONKEY, [rf.LOCATION_LAND_VERTEX, 0, 0])
	for (const art of [rf.RES_WOOD_CARVING, rf.RES_RING, rf.RES_SKETCH, rf.RES_POTTERY]) {
		model.addResourceToGame_core(art, [rf.LOCATION_BUCKET, 0, bucketID], 9)
		store.ALL_RESOURCES[store.ALL_RESOURCES.length - 1].location = [rf.LOCATION_TRANSPORTER, 0]
	}

	assert.equal(atelier.scoreArtwork(0), 4 * 20, "no shows: base value")

	store.players[0].artShownAt = { 1: 3 }
	assert.equal(atelier.scoreArtwork(0), 4 * 20 * 2, "one show: doubled")

	store.players[0].artShownAt = { 1: 3, 2: 4 }
	assert.equal(atelier.scoreArtwork(0), 4 * 20 * 3, "two shows: tripled")
})
