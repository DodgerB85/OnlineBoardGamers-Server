import * as rf from "./URRreference.js"
import * as model from "./URRmodel.js"
import * as rules from "./URRrules.js"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"

export function canDebug() {
	const personal = usePersonalStore()
	const store = useModelStore()
	return (rf.SUPER_USERS.includes(personal.name) || rf.DEBUG_USERS.includes(personal.name)) && !personal.haltPlay && !store.viewSettings.showReplay
}

export function changePosition(change) {
	if (!canDebug()) return false
	const store = useModelStore()
	const before = model.snapshotState()
	const next = model.snapshotState()
	try {
		change(next)
		model.restoreState(next)
		store.debug.undo.push(before)
		store.gameMessages.actionError = ""
		return true
	} catch (error) {
		store.gameMessages.actionError = error.message
		return false
	}
}

export function placeAtArea(id, position) {
	const store = useModelStore()
	const debug = store.debug
	if (!debug.tool || !canDebug()) return false
	const changed = changePosition((game) => {
		let area = game.board.areas.find((entry) => entry.id === id)
		if (!area) {
			// The scaffold has no logical board yet. These are editable debug
			// fixtures, not a transcription of the printed terrain or borders.
			area = { id, state: debug.state, landType: debug.landType, region: id, isRiver: false, isCity: false, nation: null, owner: null, markerOwner: null, waterwork: null, irrigatedBy: null, neighbours: [], display: { ...position } }
			for (const other of game.board.areas) {
				if (other.display && Math.hypot(other.display.x - position.x, other.display.y - position.y) < 105) {
					area.neighbours.push(other.id)
					other.neighbours.push(id)
				}
			}
			game.board.areas.push(area)
		}
		if (debug.tool === "land") {
			area.owner = area.markerOwner = debug.player
			game.states[area.state].king = rules.getKing(game, area.state)
		} else if (debug.tool === "terrain") {
			area.landType = debug.landType
			area.state = debug.state
			area.isRiver = false
			for (const state of game.states) state.king = rules.getKing(game, state.id)
		} else if (debug.tool === "river") area.isRiver = true
		else if (debug.tool === "city") area.isCity = !area.isCity
		else if (debug.tool === "pump" || debug.tool === "reservoir") {
			area.waterwork = { state: debug.state, kind: debug.tool, capacity: rf.ERA_CARD_DATA[debug.era][debug.tool][0] }
		} else if (debug.tool === "removeWaterwork") area.waterwork = null
		else if (debug.tool === "irrigate") area.irrigatedBy = debug.state
		else if (debug.tool === "dry") area.irrigatedBy = null
		else if (debug.tool === "removeLand") {
			area.owner = area.markerOwner = null
			game.states[area.state].king = rules.getKing(game, area.state)
		} else if (debug.tool === "canal") {
			const previous = debug.path[debug.path.length - 1]
			if (previous !== undefined && previous !== id && !game.board.canals.some(([a, b]) => (a === previous && b === id) || (b === previous && a === id))) game.board.canals.push([previous, id])
		}
	})
	if (changed && debug.tool === "canal") debug.path.push(id)
	return changed
}
