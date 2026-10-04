/**
 * Tutorial engine.
 *
 * startTutorial() runs a 250ms tick that walks the STEPS array in
 * tutorialScript.js. The rules are small:
 *   - talk steps wait for the user to press Next, and never auto-advance, so an
 *     explanation always gets read even if the game blew past it.
 *   - act / tutor steps complete when their `at` boundary becomes true. If it is
 *     FcmTutor's go, one subphase of their turn is played per tick and their
 *     commentary is logged - see FcmTutor.js. A `tutor` step additionally refuses
 *     to advance until the tutor has actually taken an action, so a "watch
 *     FcmTutor play" step can never be skipped past unread.
 * A step whose `at` is already true when it becomes active is skipped, which is
 * how subphases the game auto-skips get passed without getting stuck. MIN_DWELL_MS
 * gives those a moment to be read rather than flashing past.
 */

import { ref, shallowRef } from "vue"

import * as rules from "../../js/FCMrules"
import { useModelStore } from "../../stores/FCMstore.js"
import { usePersonalStore } from "../../stores/FCMpersonal.js"
import { STEPS } from "./tutorialScript"
import { TUTOR_INDEX, playTutorSubphase } from "./FcmTutor"

const TICK_MS = 250
// How long a freshly-activated auto-advancing step stays on screen before it is
// allowed to advance. Only actually bites when the game skipped past it.
const MIN_DWELL_MS = 1800
// How long the tutor's words stay up before they play their next subphase.
const TUTOR_PAUSE_MS = 2600

export const stepIndex = ref(0)
export const tutorLog = shallowRef([])
export const tutorBusy = ref(false)
export const finished = ref(false)
export const dismissed = ref(false)

let interval = null
let activatedAt = 0
let activatedTurn = 0
let activatedPhase = -1
let tutorActed = false
let tutorPauseUntil = 0

function buildState() {
	const store = useModelStore()
	return {
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		subphase: store.gameflow.subphase,
		currentPlayer: store.gameflow.turnOrder[0],
		myTurn: store.gameflow.turnOrder[0] === 0,
		legalHighlights: store.highlights.indexesToHighlightYellow,
		recruitPoints: rules.getRemainingRecruitingPoints(0),
		trainingPoints: rules.getTrainingPoints(0, store.context.justTrained).total,
		me: store.players[0],
		tutorPlaced: store.players[TUTOR_INDEX] !== undefined && store.players[TUTOR_INDEX].restaurants.length > 0,
	}
}

function currentStep() {
	return STEPS[stepIndex.value]
}

// --- spotlighting -----------------------------------------------------------

let litPanel = null

function setPanel(selector) {
	if (typeof document === "undefined") return // headless (tests)
	if (litPanel === selector) return
	if (litPanel) {
		const prev = document.querySelector(litPanel)
		if (prev) prev.classList.remove("tutorialSpotlight")
	}
	litPanel = selector
	if (litPanel) {
		const el = document.querySelector(litPanel)
		if (el) el.classList.add("tutorialSpotlight")
	}
}

function setSquares(step, s) {
	const store = useModelStore()
	const next = step && typeof step.squares === "function" ? step.squares(s) || [] : []
	const cur = store.highlights.indexesToHighlightTutorial
	if (cur.length === next.length && cur.every((v, i) => v === next[i])) return
	cur.splice(0, cur.length, ...next)
}

// --- stepping ----------------------------------------------------------------

function goTo(index) {
	stepIndex.value = Math.min(index, STEPS.length - 1)
	const store = useModelStore()
	activatedAt = Date.now()
	activatedTurn = store.gameflow.turn
	activatedPhase = store.gameflow.phase
	tutorActed = false
	tutorLog.value = []
	// Clear straight away rather than waiting for the next tick, so board highlights
	// never linger on a step that has nothing to do with the board.
	store.highlights.indexesToHighlightTutorial.splice(0)
}

function stopTutorControl() {
	if (interval) clearInterval(interval)
	interval = null
	setPanel(null)
	const store = useModelStore()
	store.highlights.indexesToHighlightTutorial.splice(0)
	// Hand back a normal-looking game: nothing stays suppressed after the tutorial.
	store.viewSettings.suppressTutorialSetupPanel = false
	finished.value = true
}

// The game fills store.highlights.indexesToHighlightYellow as soon as the shell is
// up (controller.startPlayerTurn), and the starting-restaurant panel (with AddItemBox's
// rotate arrows and preview) renders on the same phase - so the board looks ready to
// play before the tutorial has introduced any of it. Both are held back until the
// first step that opts into board highlighting, and the highlights are then left
// strictly alone: from that point on they are BOTH the visual and the click target
// for every placement, so stashing or clearing them would make the board unclickable.
const BOARD_UNLOCK_INDEX = STEPS.findIndex((s) => typeof s.squares === "function")

let stashedHighlights = null

function gateBoardHighlights() {
	const unlocked = BOARD_UNLOCK_INDEX < 0 || stepIndex.value >= BOARD_UNLOCK_INDEX
	useModelStore().viewSettings.suppressTutorialSetupPanel = !unlocked
	if (unlocked) {
		if (stashedHighlights) {
			useModelStore().highlights.indexesToHighlightYellow.splice(0, ...stashedHighlights)
			stashedHighlights = null
		}
		return
	}
	const highlights = useModelStore().highlights.indexesToHighlightYellow
	if (stashedHighlights === null && highlights.length > 0) {
		stashedHighlights = [...highlights]
		highlights.splice(0)
	}
}

// --- the tick ----------------------------------------------------------------

// Exported so the flow test can drive the tutorial without waiting on real time.
export async function tutorialTick() {
	const personal = usePersonalStore()
	if (personal.haltPlay) return

	let step = currentStep()
	if (step === undefined || finished.value) return

	const s = buildState()

	// Keep the board clean until the tutorial actually asks for a placement.
	// Runs before anything reads s.legalHighlights so a restore is visible on this tick.
	gateBoardHighlights()

	if (step.kind === "finish") {
		stopTutorControl()
		return
	}

	if (step.kind === "talk") {
		setPanel(step.panel || null)
		setSquares(step, s)
		return
	}

	// Tutor / act step: if it is the tutor's go, play one subphase of their turn per
	// tick and show their commentary. This is what lets one step cover both "you go
	// first" and "FcmTutor goes first" phases. A `tutor` step drives them wherever
	// they are - the step only means "watch FcmTutor". An `act` step is scoped to the
	// phase it covers, so it cannot swallow the rest of the game.
	const tutorDriven = step.kind === "tutor" || step.kind === "act"
	const phaseStillOpen = s.phase === activatedPhase
	const stillInScope = step.kind === "tutor" || phaseStillOpen
	const boundaryMet = !step.at || step.at(s, { turn: activatedTurn })

	if (tutorDriven && !boundaryMet && stillInScope && s.currentPlayer === TUTOR_INDEX) {
		setPanel(null)
		setSquares(null, s)
		if (!tutorBusy.value && Date.now() >= tutorPauseUntil) {
			tutorBusy.value = true
			try {
				const said = await playTutorSubphase()
				if (said) {
					tutorLog.value = [...tutorLog.value, said]
					tutorActed = true
				}
			} finally {
				tutorBusy.value = false
				tutorPauseUntil = Date.now() + TUTOR_PAUSE_MS
			}
		}
		return
	}

	setPanel(step.panel || null)
	setSquares(step, s)

	// Auto-advancing step: hold long enough to be read, then move on. A `tutor` step
	// is there to narrate the tutor's turn, so it must not advance until they have
	// actually taken an action.
	const tutorReady = step.kind !== "tutor" || tutorActed || !phaseStillOpen
	const dwellDone = Date.now() - activatedAt > MIN_DWELL_MS
	if (tutorReady && dwellDone && boundaryMet) {
		goTo(stepIndex.value + 1)
	}
}

// --- public API --------------------------------------------------------------

export function stepText() {
	const step = currentStep()
	if (step === undefined) return ""
	return typeof step.say === "function" ? step.say(buildState()) : step.say
}

// Only narration steps are advanced by clicking Next. An act/tutor step is waiting
// on the game, so offering Next there would let the user run ahead of their own
// turn and desync the tutorial from the board.
export function awaitingClick() {
	const step = currentStep()
	return step !== undefined && (step.kind === "talk" || step.kind === "finish")
}

export function nextStep() {
	goTo(stepIndex.value + 1)
}

export function totalSteps() {
	return STEPS.length
}

// Hand the game over to the user: stop driving, drop the spotlight and the panel,
// and leave the (unsaved, still entirely client-side) game running as a hotseat
// practice game they play both sides of.
export function endTutorial() {
	stopTutorControl()
	dismissed.value = true
}

export function startTutorial() {
	finished.value = false
	dismissed.value = false
	stashedHighlights = null
	goTo(0)
	if (interval) clearInterval(interval)
	interval = setInterval(tutorialTick, TICK_MS)
}

export function stopTutorialLoop() {
	if (interval) clearInterval(interval)
	interval = null
}