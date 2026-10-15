import * as rf from "./URRreference"
import * as model from "./URRmodel"
import * as IO from "../backend/URR_IO"
import * as game from "./URRgame.js"
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
	if (personal.canPlay() && !store.turnDraft.start && !store.gameflow.pendingOffer && store.gameflow.offerDeclined) {
		try {
			const restored = game.restoreDevelopmentChoices(model.snapshotState())
			if (!restored) return
			model.restoreState(restored.state)
			const draft = store.turnDraft
			draft.player = currentPlayerIndex()
			draft.steps = restored.steps.map((step) => ({ state: step.state, historyLength: store.history.length, player: step.player, action: step.action, label: turnDraft.actionSummary(step.state, step.after, step.action) }))
			draft.start = draft.steps[0] || null
			draft.ready = false
			draft.pauseAutomatic = true
			draft.revision++
		} catch (error) {
			store.gameMessages.actionError = `Unable to restore construction choices: ${error.message}`
			console.error("Unable to restore declined development plan:", error)
		}
	}
}

// Rules still run normally; the resulting positions stay local until End Turn.
export async function submitAction(action) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let player = personal.trainingGame || rf.SUPER_USERS.includes(personal.name) ? currentPlayerIndex() : personal.pov
	if (["exchangeBarahshum", "passBarahshum"].includes(action.type)) {
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
	draft.steps.push({ ...checkpoint, label: turnDraft.actionSummary(before, after, action), action: JSON.parse(JSON.stringify(action)), player })
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
	store.turnDraft.message = "Last action undone."
}

// Remove one choice from the draft by replaying the later ones without it; if they no longer fit, nothing changes.
export async function removeDraftStep(index) {
	const store = useModelStore()
	const actionIntent = store.viewSettings.actionIntent
	const steps = store.turnDraft.steps
	if (!canReviewTurn() || !steps[index]) return false
	const backup = { state: model.snapshotState(), history: [...store.history], steps: [...steps], ready: store.turnDraft.ready }
	const later = steps.slice(index + 1).map((step) => step.action)
	const checkpoint = steps[index]
	steps.splice(index)
	restoreCheckpoint(checkpoint)
	store.viewSettings.actionIntent = actionIntent
	for (const action of later) {
		if (await submitAction(action)) continue
		model.restoreState(backup.state)
		store.history.splice(0, store.history.length, ...backup.history)
		steps.splice(0, steps.length, ...backup.steps)
		store.turnDraft.ready = backup.ready
		store.turnDraft.revision++
		store.gameMessages.actionError = "That choice can't be removed because later choices depend on it. Undo those first."
		return false
	}
	store.turnDraft.message = "Choice removed."
	return true
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
	store.turnDraft.message = "Turn reset."
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
		startPlayerTurn()
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
