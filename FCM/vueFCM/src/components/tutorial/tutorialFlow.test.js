import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

const TUTORIAL_MAP = [11, 0, 18, 0, 8, 0, 1, 0, 6, 0, 0, 3, 9, 2, 4, 0, 10, 2]
const TUTORIAL_OPTIONS = [101, 102] // strictPaydayFridge + trainingGame, as the Django view sends

let rf, rules, model, controller, useModelStore, usePersonalStore, store, personal
let tutorial, STEPS

// --- a stand-in for the user: does the minimum legal thing in each subphase ----
// NB the real UI replaces the action panel with a confirm panel (ACT_CONFORM_END_TURN)
// after placing a restaurant or picking a turn-order slot, and nothing progresses
// until End Turn is pressed. Modelling that is what catches "the tutorial is waiting
// on a player input that the script never asked for".
function fakeUser() {
	if (store.context.action === rf.ACT_CONFORM_END_TURN) {
		controller.endPlayerTurn(false, false)
		return
	}

	const phase = store.gameflow.phase
	const subphase = store.gameflow.subphase

	if (phase === rf.PHASE_SETUP_RESTAURANT1 || phase === rf.PHASE_SETUP_RESTAURANT2) {
		const possible = rules.givePossibleStartingRestaurantsPosition(0)
		if (possible.length === 0) return
		model.addRestaurant(0, possible[0], 0, true)
		// Mirrors MapHighlight.clickedOnSquare(): placing only raises the confirm
		// panel, it does not advance the phase.
		store.context.action = rf.ACT_CONFORM_END_TURN
	} else if (phase === rf.PHASE_SETUP_RESERVE) {
		store.reserveCards[0] = 2
		controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_RESTRUCTURING) {
		controller.autoFillEmployees()
		controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_TURN_ORDER) {
		const pos = store.gameflow.newTurnOrder.indexOf(-1)
		if (pos === -1) return
		controller.chooseTurnOrderPosition(pos)
		controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_WORKING_DAY) {
		if (subphase === rf.SUBPHASE_HIRING) {
			while (rules.getRemainingRecruitingPoints(0) > 0 && store.availableEmployees[rf.RECRUITING_GIRL] > 0) {
				controller.hireEmployee(rf.RECRUITING_GIRL)
			}
			controller.endWorkingDaySubphase()
		} else if (subphase === rf.SUBPHASE_TRAINING) {
			controller.endWorkingDaySubphase()
		} else if (subphase === rf.SUBPHASE_MARKETING) {
			controller.endWorkingDaySubphase()
		} else if (subphase === rf.SUBPHASE_PRODUCE) {
			controller.endWorkingDaySubphase()
		} else if (subphase === rf.SUBPHASE_HOUSES) {
			controller.endWorkingDaySubphase()
		} else {
			controller.endPlayerTurn(true, false)
		}
	} else if (phase === rf.PHASE_PAYDAY || phase === rf.PHASE_CLEAN_UP) {
		controller.endPlayerTurn(true, false)
	}
}

beforeEach(async () => {
	if (!globalThis.pako) (0, eval)(fs.readFileSync(PAKO_FILE, "utf8"))
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance

	setActivePinia(createPinia())
	;({ useModelStore } = await import("../../stores/FCMstore.js"))
	;({ usePersonalStore } = await import("../../stores/FCMpersonal.js"))
	rf = await import("../../js/FCMreference.js")
	rules = await import("../../js/FCMrules.js")
	model = await import("../../js/FCMmodel.js")
	controller = await import("../../js/FCMcontroller.js")
	tutorial = await import("./FcmTutorial.js")
	;({ STEPS } = await import("./tutorialScript.js"))

	window.initData = {
		tutorial: true,
		pov: 0,
		name: "Tester",
		playerNames: ["Tester", "FcmTutor"],
		startingOptions: TUTORIAL_OPTIONS,
		startingMap: TUTORIAL_MAP,
		gameData: "",
		gameID: 0,
		startingOptionsHTML: "",
		chatData: "",
		moveData: "",
		notes: "",
		currentPlayers: ["Tester", "FcmTutor"],
	}

	store = useModelStore()
	personal = usePersonalStore()
	await model.initGame()
})

afterEach(() => {
	tutorial.stopTutorialLoop()
	vi.useRealTimers()
})

describe("tutorial flow", () => {
	it("keeps the board and the setup panel hidden until the tutorial asks for a placement", async () => {
		// Regression: the game pre-populates the legal restaurant squares as soon as
		// the shell loads, and the starting-restaurant panel (rotate arrows + preview)
		// renders on the same phase, so both were live before the welcome text had even
		// been read.
		expect(store.gameflow.phase).toBe(rf.PHASE_SETUP_RESTAURANT1)
		expect(store.highlights.indexesToHighlightYellow.length).toBeGreaterThan(0)

		vi.useFakeTimers()
		tutorial.startTutorial()
		await vi.advanceTimersByTimeAsync(1000)

		expect(tutorial.stepIndex.value).toBe(0)
		expect(STEPS[0].id).toBe("welcome")
		expect(store.highlights.indexesToHighlightYellow).toEqual([])
		expect(store.highlights.indexesToHighlightTutorial).toEqual([])
		// ActionArea's v-if reads this to keep AddItemBox off screen
		expect(store.viewSettings.suppressTutorialSetupPanel).toBe(true)

		// Reading past the intro brings both back, and the board is clickable again
		tutorial.nextStep()
		tutorial.nextStep()
		await vi.advanceTimersByTimeAsync(1000)
		expect(STEPS[tutorial.stepIndex.value].id).toBe("placeResto")
		expect(store.highlights.indexesToHighlightYellow.length).toBeGreaterThan(0)
		expect(store.highlights.indexesToHighlightTutorial).toEqual(store.highlights.indexesToHighlightYellow)
		expect(store.viewSettings.suppressTutorialSetupPanel).toBe(false)

		// Finishing the tutorial must not leave anything suppressed behind
		tutorial.endTutorial()
		expect(store.viewSettings.suppressTutorialSetupPanel).toBe(false)
	}, 30000)

	it("runs a full two-turn game from an unsaved start and reaches the handover step", async () => {
		expect(personal.tutorial).toBe(true)
		expect(personal.trainingGame).toBe(true)
		expect(store.startingOptions.strictPaydayFridge).toBe(true)
		expect(store.players.length).toBe(2)
		expect(store.players[1].displayName).toBe("FcmTutor")

		vi.useFakeTimers()
		tutorial.startTutorial()

		let userTurns = 0
		for (let i = 0; i < 3000 && !tutorial.finished.value; i++) {
			await vi.advanceTimersByTimeAsync(250)

			// Talk steps wait for a click, which is what a real user does
			const step = STEPS[tutorial.stepIndex.value]
			if (step.kind === "talk") {
				tutorial.nextStep()
				continue
			}
			if (step.kind === "finish") break

			if (store.gameflow.turnOrder[0] === 0 && !personal.haltPlay) {
				userTurns++
				fakeUser()
			}
		}
		if (!tutorial.finished.value) {
			const stuck = STEPS[tutorial.stepIndex.value]
			throw new Error(`tutorial stuck on step "${stuck.id}" (turn ${store.gameflow.turn}, phase ${store.gameflow.phase}, subphase ${store.gameflow.subphase}, current player ${store.gameflow.turnOrder[0]})`)
		}

		expect(tutorial.finished.value).toBe(true)
		expect(STEPS[tutorial.stepIndex.value].kind).toBe("finish")

		// It really played the game: two players, two full working days, and the
		// tutor turned up as an opponent.
		expect(userTurns).toBeGreaterThan(5)
		expect(store.gameflow.turn).toBeGreaterThanOrEqual(2)
		expect(store.players[0].restaurants.length).toBeGreaterThan(0)
		expect(store.players[1].restaurants.length).toBeGreaterThan(0)
		expect(store.players[1].employees.length + store.players[1].beach.length).toBeGreaterThan(0)
		expect(store.history.length).toBeGreaterThan(20)

		// Nothing was left behind on the board for the tutorial to draw on
		expect(store.highlights.indexesToHighlightTutorial).toEqual([])
	}, 60000)

	it("never asks the server for anything", async () => {
		const original = globalThis.fetch
		const calls = []
		globalThis.fetch = (...args) => {
			calls.push(String(args[0]))
			return Promise.reject(new Error("network disabled in test"))
		}

		try {
			vi.useFakeTimers()
			tutorial.startTutorial()
			for (let i = 0; i < 400 && !tutorial.finished.value; i++) {
				await vi.advanceTimersByTimeAsync(250)
				const step = STEPS[tutorial.stepIndex.value]
				if (step.kind === "talk") tutorial.nextStep()
				else if (step.kind === "finish") break
				else if (store.gameflow.turnOrder[0] === 0 && !personal.haltPlay) fakeUser()
			}
		} finally {
			globalThis.fetch = original
		}

		expect(calls).toEqual([])
	}, 60000)
})