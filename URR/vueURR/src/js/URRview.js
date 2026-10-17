/**
 * Visual helpers (images / phase strings).
 */

import * as rf from "./URRreference"
import * as water from "./URRwater"

export function playerIndexByName(game, name) {
	return game.players.findIndex((player) => player.name === name || player.displayName === name)
}

export function displayedTurnOrder(game) {
	if (game.turnDraft.ready && !game.viewSettings.showReplay) return [game.turnDraft.player]
	return game.gameflow.turnOrder
}

export function currentStateId(game) {
	if (game.gameflow.pendingOffer) return game.gameflow.pendingOffer.state
	if (game.gameflow.phase === rf.PHASE_DEVELOPMENT) {
		if (game.gameflow.developmentStep === "eridu") {
			const eridu = game.nations[rf.NATION_ERIDU]
			return eridu.ownerType === "state" ? eridu.owner : null
		}
		return game.gameflow.stateOrder[game.gameflow.stateIndex] ?? null
	}
	if (game.gameflow.phase === rf.PHASE_RAINY_SEASON) {
		if (game.rain.step === "harvest") return game.rain.harvestOrder[0] ?? null
		return game.board.areas.find((area) => area.id === water.currentWaterFrame(game)?.area)?.waterwork?.state ?? null
	}
	return null
}

export function phaseStr(phase) {
	if (phase === rf.PHASE_DIVIDING_NATIONS) return "Dividing the Independent Nations"
	if (phase === rf.PHASE_SETTLEMENT) return "Settlement"
	if (phase === rf.PHASE_DEVELOPMENT) return "Development"
	if (phase === rf.PHASE_RAINY_SEASON) return "Rainy Season"
	if (phase === rf.PHASE_GAME_OVER) return "Game Over"
	return "Unknown phase - " + phase
}

export function waterworkMeasure(work) {
	if (work.kind === "pump") return work.capacity === "M" ? "unlimited reach" : `reach: ${work.capacity} canal${Number(work.capacity) === 1 ? "" : "s"}`
	return `capacity: ${work.capacity === "M" ? "unlimited" : work.capacity} water`
}

export function getLeadershipChanges(before, after) {
	if (!before?.states || !after?.states) return []
	return after.states.filter((state) => {
		const previous = before.states[state.id]
		return previous && (state.king !== previous.king || (state.isActive && !previous.isActive))
	}).map((state) => ({
		id: state.id, isActive: state.isActive, king: state.king,
		hasEmerged: state.isActive && !before.states[state.id].isActive,
		previousKing: before.states[state.id].king,
		previousName: before.states[state.id].king === null ? "None" : before.players[before.states[state.id].king].displayName,
		nextName: state.king === null ? "None" : after.players[state.king].displayName,
	}))
}

export function getOrdinal(num) {
	var n = num % 10
	var s = num % 100
	if (n === 1 && s !== 11) return num + "st"
	if (n === 2 && s !== 12) return num + "nd"
	if (n === 3 && s !== 13) return num + "rd"
	return num + "th"
}

export function getImage(image) {
	// Menu / generic icons
	if (image === "icon-house") return new URL(`../../../static/URR/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/URR/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/URR/images/icon-rulebook.svg`, import.meta.url).href
	else if (image === "icon-info") return new URL(`../../../static/URR/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/URR/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/URR/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/URR/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/URR/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/URR/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/URR/images/icon-replay.svg`, import.meta.url).href
	else if (image === "resign") return new URL(`../../../static/URR/images/resign.jpg`, import.meta.url).href
	rf.doAdminAlrt("Unknown image requested: " + image)
	return ""
}
