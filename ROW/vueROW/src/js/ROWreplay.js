/**
 * ROW client-side replay: rebuild every recorded action from the opening
 * position, snapshot each step, then restore the live position on exit.
 */
import * as model from "./ROWmodel"
import { deserializeGame, serializeGame } from "./ROWfuncs"
import { JavaRandom, isCattleCard, isObjectiveCard, shuffle as shuffleArray } from "./ROWcore"
import { OBJECTIVE_CARD_TYPES } from "./ROWdata"
import { PHASE_GAME_OVER, PHASE_MAIN } from "./ROWreference"
import i18n from "../i18n"
import { useModelStore } from "../stores/ROWstore"
import { usePersonalStore } from "../stores/ROWpersonal"

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

/**
 * A copy becomes a training game, so replace every hidden card belonging to
 * another seat and every hidden deck. The copier's own hand and objectives are
 * kept; the total card multiset is preserved.
 */
export function sanitizeCopyFrame(frame, playerName, rng = new JavaRandom(Math.floor(Math.random() * 2 ** 48))) {
	const copy = clone(frame)
	const playerStates = copy?.playerStates
	if (!playerStates) return copy

	const names = Object.keys(playerStates)
	const keepName = names.includes(playerName) ? playerName : null
	const isCattle = (card) => !!card && typeof card === "object" && isCattleCard(card)
	const isObjective = (card) => !!card && (typeof card === "string" || (typeof card === "object" && isObjectiveCard(card)))
	const cattlePool = []
	const objectiveIds = []
	const objectiveCards = new Map()
	const addObjective = (card) => {
		const id = typeof card === "string" ? card : card?.id
		if (!id) return
		objectiveIds.push(id)
		if (card && typeof card === "object") objectiveCards.set(id, clone(card))
		else if (!objectiveCards.has(id) && OBJECTIVE_CARD_TYPES[id]) objectiveCards.set(id, clone(OBJECTIVE_CARD_TYPES[id]))
	}
	const cardForId = (id) => {
		const card = objectiveCards.get(id) ?? OBJECTIVE_CARD_TYPES[id]
		return card ? clone(card) : { id }
	}

	const slots = []
	for (const name of names) {
		const ps = playerStates[name]
		if (name === keepName) {
			if (ps.drawStack?.length > 1) shuffleArray(ps.drawStack, rng)
			continue
		}
		const cattleHand = []
		const objectiveHand = []
		ps.hand = (ps.hand ?? []).map((card, index) => {
			if (isCattle(card)) {
				cattlePool.push(card)
				cattleHand.push(index)
				return null
			}
			if (isObjective(card)) {
				addObjective(card)
				objectiveHand.push(index)
				return null
			}
			return card
		})
		let cattleDraw = 0
		let objectiveDraw = 0
		for (const card of ps.drawStack ?? []) {
			if (isCattle(card)) {
				cattlePool.push(card)
				cattleDraw++
			} else if (isObjective(card)) {
				addObjective(card)
				objectiveDraw++
			}
		}
		ps.drawStack = []
		const objectiveCount = (ps.objectives ?? []).length
		for (const id of ps.objectives ?? []) addObjective(id)
		ps.objectives = []
		slots.push({ ps, cattleHand, objectiveHand, cattleDraw, objectiveDraw, objectiveCount })
	}

	let cattleMarketDraw = 0
	for (const card of copy.cattleMarket?.drawStack ?? []) {
		if (isCattle(card)) {
			cattlePool.push(card)
			cattleMarketDraw++
		}
	}
	if (copy.cattleMarket) copy.cattleMarket.drawStack = []

	let objectiveDrawCount = 0
	for (const card of copy.objectiveCards?.drawStack ?? []) {
		addObjective(card)
		objectiveDrawCount++
	}
	if (copy.objectiveCards) copy.objectiveCards.drawStack = []

	let startingObjectiveCount = 0
	for (const card of copy.startingObjectiveCards ?? []) {
		addObjective(card)
		startingObjectiveCount++
	}
	if (copy.startingObjectiveCards) copy.startingObjectiveCards = []

	shuffleArray(cattlePool, rng)
	shuffleArray(objectiveIds, rng)
	const takeCattle = () => cattlePool.pop()
	const takeObjectiveId = () => objectiveIds.pop()

	for (const slot of slots) {
		for (const index of slot.cattleHand) {
			const card = takeCattle()
			if (card) slot.ps.hand[index] = card
		}
		for (const index of slot.objectiveHand) {
			const id = takeObjectiveId()
			if (id) slot.ps.hand[index] = cardForId(id)
		}
		for (let i = 0; i < slot.cattleDraw; i++) {
			const card = takeCattle()
			if (card) slot.ps.drawStack.push(card)
		}
		for (let i = 0; i < slot.objectiveDraw; i++) {
			const id = takeObjectiveId()
			if (id) slot.ps.drawStack.push(cardForId(id))
		}
		if (slot.ps.drawStack.length > 1) shuffleArray(slot.ps.drawStack, rng)
		for (let i = 0; i < slot.objectiveCount; i++) {
			const id = takeObjectiveId()
			if (id) slot.ps.objectives.push(id)
		}
	}

	if (copy.cattleMarket) {
		for (let i = 0; i < cattleMarketDraw; i++) {
			const card = takeCattle()
			if (card) copy.cattleMarket.drawStack.push(card)
		}
		if (copy.cattleMarket.drawStack.length > 1) shuffleArray(copy.cattleMarket.drawStack, rng)
	}
	if (copy.objectiveCards) {
		for (let i = 0; i < objectiveDrawCount; i++) {
			const id = takeObjectiveId()
			if (id) copy.objectiveCards.drawStack.push(cardForId(id))
		}
		if (copy.objectiveCards.drawStack.length > 1) shuffleArray(copy.objectiveCards.drawStack, rng)
	}
	if (copy.startingObjectiveCards) {
		for (let i = 0; i < startingObjectiveCount; i++) {
			const id = takeObjectiveId()
			if (id) copy.startingObjectiveCards.push(id)
		}
		if (copy.startingObjectiveCards.length > 1) shuffleArray(copy.startingObjectiveCards, rng)
	}
	for (const pile of copy.kcSupply?.piles ?? []) if (pile.length > 1) shuffleArray(pile, rng)

	copy.rngState = rng.getState()
	return copy
}

/**
 * Pure replay builder so the action history can be tested without the store.
 * `history` is newest-first, matching the stored history log.
 */
export function buildReplayFrames(initial, history) {
	if (!initial || initial.v !== 1) return []
	const frames = [clone(initial)]
	for (const entry of [...(history ?? [])].reverse()) {
		if (!entry || typeof entry !== "object") continue
		if (entry.type === "UNDO") {
			if (frames.length > 1) frames.pop()
			continue
		}
		if (entry.type === "RESET_WHOLE_TURN") {
			if (entry.snapshot?.v === 1) frames.push(clone(entry.snapshot))
			continue
		}
		const current = frames[frames.length - 1]
		if (!current) break
		const rng = new JavaRandom(0)
		if (current.rngState) rng.setState(current.rngState)
		const game = deserializeGame(clone(current))
		try {
			if (entry.action) {
				game.perform(entry.player, entry.action, rng)
				// Automatic follow-ups (e.g. a delivery's exchange token) share their
				// triggering action's frame, so one undo still removes the whole step.
				for (const followup of entry.followups ?? []) game.perform(entry.player, followup, rng)
			}
			else if (entry.type === "END_TURN") game.endTurn(entry.player, rng)
			else if (entry.type === "SKIP") game.skip(entry.player)
			else continue
		} catch {
			// Stop at the first action this version cannot rebuild rather than
			// showing a replay that silently diverges from the live game.
			break
		}
		frames.push(clone(serializeGame(game, rng)))
	}
	return frames
}

/** Enter read-only replay: view the most recent recorded position. */
export function enterReplay() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (store.viewSettings.showReplay) return
	const g = store.game
	store.liveBeforeReplay = g ? clone(serializeGame(g, model.getRng())) : null

	if (store.replayInitial && !personal.automaGame) {
		const rebuilt = buildReplayFrames(store.replayInitial, store.history)
		if (rebuilt.length > 1) store.replayFrames = rebuilt
	}
	if (store.replayFrames.length <= 1) {
		store.gameMessages.errorText = i18n.global.t("error.noReplayData")
		return
	}
	store.viewSettings.showReplay = true
	const requested = window.initData?.spoilerFree ? Number(window.initData.replayStep) : NaN
	store.replayIndex = Number.isInteger(requested) && requested >= 0 ? Math.min(requested, store.replayFrames.length - 1) : store.replayFrames.length - 1
	viewFrame()
}

/** Jump to a frame (used by the replay slider). */
export function goToReplayStep(step) {
	const store = useModelStore()
	if (!store.viewSettings.showReplay) return
	const next = Math.max(0, Math.min(Number(step), store.replayFrames.length - 1))
	store.replayIndex = next
	viewFrame()
}

/** Step through replay frames (delta -1 = older, +1 = newer). */
export function performStep(delta) {
	const store = useModelStore()
	if (!store.viewSettings.showReplay) return
	const next = store.replayIndex + delta
	if (next < 0 || next >= store.replayFrames.length) return
	store.replayIndex = next
	viewFrame()
}

function viewFrame() {
	const store = useModelStore()
	const frame = store.replayFrames[store.replayIndex]
	if (frame) {
		model.restoreRng(frame)
		store.setGame(deserializeGame(clone(frame)))
	}
	store.touch()
}

/** Copy the visible replay frame into a new practice game. */
export async function copyGameToNewPracticeGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const frame = store.replayFrames[store.replayIndex]
	if (!frame) return null

	// Start the copy at the visible frame, with no earlier history to replay.
	// Finished games are already public; mid-game copies keep only the copier's
	// own private cards and re-randomise every other hidden zone.
	const playerName = personal.name || store.state?.players?.[personal.pov]?.name || ""
	const snapshot = store.game?.isEnded() ? clone(frame) : sanitizeCopyFrame(frame, playerName)
	const data = { ...snapshot, history: [], replayInitial: snapshot, turn: store.turn }
	let csrftoken = ""
	for (const cookie of document.cookie.split(";")) {
		const [key, ...rest] = cookie.trim().split("=")
		if (key === "csrftoken") csrftoken = decodeURIComponent(rest.join("="))
	}

	try {
		const response = await fetch("/createGameCopy/", {
			method: "POST",
			body: JSON.stringify({
				action: "copyGame",
				gameID: personal.gameID,
				pov: personal.pov,
				turn: store.turn,
				phase: store.game?.isEnded() ? PHASE_GAME_OVER : PHASE_MAIN,
				data: JSON.stringify(data),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		return await response.json()
	} catch (error) {
		console.error("Error copying ROW game:", error)
		return null
	}
}

/** Leave replay and restore the live position. */
export function exitReplay() {
	const store = useModelStore()
	if (!store.viewSettings.showReplay) return
	store.viewSettings.showReplay = false
	store.replayIndex = -1
	if (store.liveBeforeReplay) {
		const snap = store.liveBeforeReplay
		store.liveBeforeReplay = null
		model.restoreRng(snap)
		store.setGame(deserializeGame(clone(snap)))
	}
	store.touch()
}
