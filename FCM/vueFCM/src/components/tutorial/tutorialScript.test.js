import { describe, expect, it } from "vitest"

import * as rf from "../../js/FCMreference.js"
import { STEPS } from "./tutorialScript.js"
import { HIRE_PLAN, TUTOR_INDEX } from "./FcmTutor.js"

// Same map the Django tutorial view renders (FCM/views.py TUTORIAL_STARTING_MAP)
const TUTORIAL_MAP = [11, 0, 18, 0, 8, 0, 1, 0, 6, 0, 0, 3, 9, 2, 4, 0, 10, 2]

function fakeState(over = {}) {
	return {
		turn: 1,
		phase: rf.PHASE_WORKING_DAY,
		subphase: rf.SUBPHASE_HIRING,
		currentPlayer: 0,
		myTurn: true,
		legalHighlights: [1, 2, 3],
		recruitPoints: 1,
		trainingPoints: 0,
		me: { restaurants: [], beach: [], employees: [] },
		tutorPlaced: false,
		...over,
	}
}

describe("tutorial script", () => {
	it("has unique ids and a known kind for every step", () => {
		const ids = STEPS.map((s) => s.id)
		expect(new Set(ids).size).toBe(ids.length)
		for (const step of STEPS) {
			expect(["talk", "act", "tutor", "finish"]).toContain(step.kind)
			expect(typeof step.say === "string" || typeof step.say === "function").toBe(true)
		}
	})

	it("gives every auto-advancing step a boundary, and no talk step one", () => {
		// A talk step with an `at` would be skipped unread; an auto step without one
		// would never complete and hang the tutorial.
		for (const step of STEPS.filter((s) => s.kind === "act" || s.kind === "tutor")) expect(typeof step.at).toBe("function")
		for (const step of STEPS.filter((s) => s.kind === "talk" || s.kind === "finish")) expect(step.at).toBeUndefined()
	})

	it("only highlights the board on the steps that are actually a board placement", () => {
		// Everything before the first board placement is narration, so it must not
		// paint squares the player has not been told about yet.
		const highlighting = STEPS.filter((s) => typeof s.squares === "function").map((s) => s.id)
		expect(highlighting).toEqual(["placeResto", "market2", "produce2", "houses2"])

		// And nothing before placeResto may highlight at all
		const firstBoardStep = STEPS.findIndex((s) => s.id === "placeResto")
		for (const step of STEPS.slice(0, firstBoardStep)) expect(step.squares).toBeUndefined()
	})

	it("ends on the handover step and only has one finish step", () => {
		expect(STEPS[STEPS.length - 1].kind).toBe("finish")
		expect(STEPS.filter((s) => s.kind === "finish")).toHaveLength(1)
	})

	it("makes pressing End Turn its own step after placing a restaurant", () => {
		// Regression: placing a restaurant only raises the confirm panel, it does not
		// advance the phase, and the tutor cannot act until End Turn is pressed. A
		// single step covering both left the tutorial waiting on an input it never
		// mentioned, and the game looked stuck.
		const placeIdx = STEPS.findIndex((s) => s.id === "placeResto")
		const endIdx = STEPS.findIndex((s) => s.id === "endTurnResto")
		expect(placeIdx).toBeGreaterThan(-1)
		expect(endIdx).toBe(placeIdx + 1)
		// ...and placing must not be gated on the phase ending, or it deadlocks
		expect(STEPS[placeIdx].at(fakeState({ me: { restaurants: [1] } }), { turn: 1 })).toBe(true)
		// ...whereas End Turn is: it completes when the phase finally moves on
		expect(STEPS[endIdx].at(fakeState({ phase: rf.PHASE_SETUP_RESERVE }), { turn: 1 })).toBe(true)
		expect(STEPS[endIdx].at(fakeState({ phase: rf.PHASE_SETUP_RESTAURANT1 }), { turn: 1 })).toBe(false)
	})

	it("renders every say() against a plausible state without throwing", () => {
		for (const step of STEPS) {
			if (typeof step.say !== "function") continue
			const text = step.say(fakeState())
			expect(typeof text).toBe("string")
			expect(text.length).toBeGreaterThan(0)
		}
	})

	it("renders every say() with zero employees and zero points without throwing", () => {
		// The opening steps run before the player has anything at all
		for (const step of STEPS) {
			if (typeof step.say !== "function") continue
			expect(step.say(fakeState({ recruitPoints: 0, trainingPoints: 0, me: { restaurants: [], beach: [], employees: [] } })).length).toBeGreaterThan(0)
		}
	})
})

describe("tutorial tutor", () => {
	it("sits in seat 1", () => {
		expect(TUTOR_INDEX).toBe(1)
	})

	it("only plans hires the player can actually recruit", () => {
		// If an entry is not in HIREABLE_EMPLOYEES, controller.hireEmployee would
		// quietly take a card that was never on offer.
		expect(HIRE_PLAN.length).toBeGreaterThan(0)
		expect(new Set(HIRE_PLAN).size).toBe(HIRE_PLAN.length)
		for (const emp of HIRE_PLAN) expect(rf.HIREABLE_EMPLOYEES).toContain(emp)
	})

	it("avoids the Kitchen Trainee so the Pizza Bomb detour cannot hijack the tutorial", () => {
		expect(HIRE_PLAN).not.toContain(rf.KITCHEN_TRAINEE)
	})
})

describe("tutorial tutor-day boundary", () => {
	const tutorDays = STEPS.filter((s) => s.kind === "tutor" && s.at.length === 2)

	it("only fires once the user is back in a working day a turn later", () => {
		expect(tutorDays.length).toBeGreaterThan(0)
		for (const step of tutorDays) {
			const ctx = { turn: 1 }
			// Still the tutor's go - must not fire, or we would skip their whole turn
			expect(step.at(fakeState({ currentPlayer: TUTOR_INDEX, myTurn: false, turn: 1 }), ctx)).toBe(false)
			// Out of the working day entirely - still must not fire
			expect(step.at(fakeState({ phase: rf.PHASE_CLEAN_UP, turn: 1 }), ctx)).toBe(false)
			// Back with the user, one turn on - now it is done
			expect(step.at(fakeState({ turn: 2, currentPlayer: 0, myTurn: true }), ctx)).toBe(true)
			// Same turn, user current - not yet, the cycle has not completed
			expect(step.at(fakeState({ turn: 1, currentPlayer: 0, myTurn: true }), ctx)).toBe(false)
		}
	})
})

describe("tutorial map", () => {
	it("is nine valid base-tile/rotation pairs - the 2-player board size", () => {
		expect(TUTORIAL_MAP.length / 2).toBe(9)
		for (let i = 0; i < TUTORIAL_MAP.length; i += 2) {
			expect(TUTORIAL_MAP[i]).toBeGreaterThanOrEqual(0)
			expect(TUTORIAL_MAP[i]).toBeLessThan(20)
			expect(TUTORIAL_MAP[i + 1]).toBeGreaterThanOrEqual(0)
			expect(TUTORIAL_MAP[i + 1]).toBeLessThanOrEqual(3)
		}
	})
})