import * as rf from "./URRreference"
import * as model from "./URRmodel"
import * as IO from "../backend/URR_IO"
import * as game from "./URRgame.js"
import * as view from "./URRview.js"
import * as turnDraft from "./URRturnDraft.js"
import * as rules from "./URRrules.js"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"

export function currentPlayerIndex() {
	const store = useModelStore()
	return store.gameflow.turnOrder[0]
}

export function isMyTurn() {
	const personal = usePersonalStore()
	return personal.canPlay() && currentPlayerIndex() === personal.pov
}

export function startPlayerTurn() {
	const personal = usePersonalStore()
	const store = useModelStore()
	personal.haltPlay = false
	if (store.viewSettings.showReplay) return
	if (personal.canPlay() && personal.yourTurnAudioType > 0) {
		// Optional "your turn" sound. Add sound files to static/Lobby/common/sounds if wanted.
	}
	model.rebuildTurnOrder()
}

// Rules still run normally; the resulting positions stay local until End Turn.
export async function submitAction(action) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let player = personal.trainingGame || rf.SUPER_USERS.includes(personal.name) ? currentPlayerIndex() : personal.pov
	if (action.type === "exchangeBarahshum") {
		if (store.turnDraft.ready || personal.haltPlay || store.viewSettings.showReplay || personal.pov < 0) return false
		const nation = store.nations[rf.NATION_BARAHSHUM]
		if ((personal.trainingGame || rf.SUPER_USERS.includes(personal.name)) && nation.ownerType === "player") player = nation.owner
		if (!rules.canExchangeBarahshum(store, player)) return false
	} else if (!personal.canPlay()) return false
	const before = model.snapshotState()
	const checkpoint = { state: before, historyLength: store.history.length }
	try {
		model.performAction(player, action)
		store.gameMessages.actionError = ""
	} catch (error) {
		store.gameMessages.actionError = error.message
		return false
	}
	const draft = store.turnDraft
	if (!draft.start) { draft.start = checkpoint; draft.player = player }
	const after = model.snapshotState()
	draft.steps.push({ ...checkpoint, label: turnDraft.actionSummary(before, after, action) })
	draft.ready = turnDraft.endsDecision(before, after, action)
	draft.message = turnDraft.describeAction(before, after, action)
	draft.pauseAutomatic = false
	return true
}

export function canReviewTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.haltPlay || store.viewSettings.showReplay || store.viewSettings.showLoader || personal.pov < 0) return false
	if (store.turnDraft.start) return personal.trainingGame || rf.SUPER_USERS.includes(personal.name) || personal.pov === store.turnDraft.player
	return personal.canPlay() || rules.canExchangeBarahshum(store, personal.pov)
}

function restoreCheckpoint(checkpoint) {
	const store = useModelStore()
	model.restoreState(checkpoint.state)
	store.history.splice(checkpoint.historyLength)
	store.gameMessages.actionError = ""
	store.viewSettings.actionIntent = ""
	store.viewSettings.historyArea = null
	store.turnDraft.ready = false
	store.turnDraft.pauseAutomatic = true
	store.turnDraft.revision++
}

export function undoAction() {
	const store = useModelStore()
	if (!canReviewTurn() || !store.turnDraft.steps.length) return
	const checkpoint = store.turnDraft.steps.pop()
	restoreCheckpoint(checkpoint)
	store.turnDraft.message = "Last action undone. Continue playing or reset the turn."
}

export function resetTurn() {
	const store = useModelStore()
	if (!canReviewTurn()) return
	if (store.turnDraft.start) restoreCheckpoint(store.turnDraft.start)
	store.gameMessages.actionError = ""
	store.gameMessages.errorText = ""
	store.viewSettings.actionIntent = ""
	store.clearTurnDraft()
	store.turnDraft.pauseAutomatic = true
	store.turnDraft.message = "Turn reset. Your choices have not been committed."
}

export async function endPlayerTurn() {
	const store = useModelStore()
	if (!canReviewTurn()) return false
	if (!store.turnDraft.ready) {
		if (!usePersonalStore().canPlay()) {
			store.gameMessages.actionError = "Choose the Barahshum exchange before ending your turn."
			return false
		}
		try {
			// Reuse the existing forced-action rules after an Undo or Reset.
			let automatic = rules.getAutomaticAction(store)
			while (automatic && !store.turnDraft.ready) {
				if (!await submitAction(automatic)) return false
				automatic = rules.getAutomaticAction(store)
			}
			if (!store.turnDraft.ready && !await submitAction(turnDraft.defaultEndAction(store))) return false
		} catch (error) {
			store.gameMessages.actionError = error.message
			return false
		}
	}
	const saved = await IO.saveGame(true)
	if (saved) {
		store.clearTurnDraft()
		store.viewSettings.actionIntent = ""
		const next = store.players[store.gameflow.turnOrder[0]]
		const stateId = view.currentStateId(store)
		const context = store.gameflow.pendingOffer ? "respond to the agreement request" : store.rain.step === "routing" ? "route water" : store.rain.step === "harvest" ? "choose the harvest" : view.phaseStr(store.gameflow.phase)
		store.turnDraft.message = next ? `Turn saved.${stateId === null ? "" : ` · ${rf.STATE_NAMES[stateId]}`} · ${context}.` : "Turn saved. Game complete."
	}
	return saved
}

export function timedOutPlayerObj() {
	const store = useModelStore()
	const idx = store.gameflow.turnOrder[0]
	return store.players[idx] || { name: "" }
}

export function botTurnPlayerIndex() {
	const store = useModelStore()
	const current = currentPlayerIndex()
	for (let offset = 1; offset <= store.players.length; offset++) {
		const index = (current + offset) % store.players.length
		if (!store.players[index].isMissing) return index
	}
	return -1
}

export function canRunBotTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	return personal.pov >= 0 && !personal.haltPlay && !store.viewSettings.showReplay && store.players[currentPlayerIndex()]?.isMissing && botTurnPlayerIndex() === personal.pov
}

export function getAutomaticBotAction() {
	if (!canRunBotTurn()) return null
	try {
		return game.getBotAction(model.snapshotState())
	} catch (error) {
		useModelStore().gameMessages.actionError = error.message
		console.error("Unable to choose an abandoned seat's move:", error)
		return null
	}
}

export async function submitBotAction(action) {
	if (!canRunBotTurn()) return false
	const store = useModelStore()
	try {
		model.performAction(currentPlayerIndex(), action)
		store.gameMessages.actionError = ""
	} catch (error) {
		store.gameMessages.actionError = error.message
		console.error("Unable to play an abandoned seat's move:", error)
		return false
	}
	return await IO.saveGame(true)
}
