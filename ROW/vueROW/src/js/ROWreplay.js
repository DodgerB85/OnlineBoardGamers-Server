/**
 * ROW client-side replay: rebuild every recorded action from the opening
 * position, snapshot each step, then restore the live position on exit.
 */
import * as model from "./ROWmodel"
import { deserializeGame, serializeGame } from "./ROWfuncs"
import { JavaRandom } from "./ROWcore"
import i18n from "../i18n"
import { useModelStore } from "../stores/ROWstore"
import { usePersonalStore } from "../stores/ROWpersonal"

function clone(value) {
	return JSON.parse(JSON.stringify(value))
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
			if (entry.action) game.perform(entry.player, entry.action, rng)
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
	store.replayIndex = store.replayFrames.length - 1
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
