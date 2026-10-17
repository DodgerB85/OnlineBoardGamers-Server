/**
 * ROW client-side replay: step through recorded turn-start frames and restore
 * the live position on exit.
 */
import * as model from "./ROWmodel"
import { deserializeGame, serializeGame } from "./ROWfuncs"
import { useModelStore } from "../stores/ROWstore"

/** Enter read-only replay: view the most recent turn-start frame. */
export function enterReplay() {
	const store = useModelStore()
	if (store.viewSettings.showReplay) return
	const g = store.game
	store.liveBeforeReplay = g ? JSON.parse(JSON.stringify(serializeGame(g, model.getRng()))) : null
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
	if (frame) store.setGame(deserializeGame(JSON.parse(JSON.stringify(frame))))
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
		store.setGame(deserializeGame(JSON.parse(JSON.stringify(snap))))
	}
	store.touch()
}
