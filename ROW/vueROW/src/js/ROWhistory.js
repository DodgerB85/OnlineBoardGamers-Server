/**
 * ROW history recording (IND's event/player/time/params shape).
 */
import { useModelStore } from "../stores/ROWstore"

export function addHistory(type, player, params = []) {
	const store = useModelStore()
	store.history.unshift({ type, player, time: Date.now(), params })
	if (store.history.length > 200) store.history.length = 200
}

export function clearHistory() {
	const store = useModelStore()
	store.history.splice(0, store.history.length)
}
