/**
 * Visual helpers (images / phase strings).
 */

import * as rf from "./URRreference"
import * as water from "./URRwater"
import i18n from "../i18n.js"

const t = i18n.global.t

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
	if (phase === rf.PHASE_DIVIDING_NATIONS) return t("phase.dividingNations")
	if (phase === rf.PHASE_SETTLEMENT) return t("phase.settlement")
	if (phase === rf.PHASE_DEVELOPMENT) return t("phase.development")
	if (phase === rf.PHASE_RAINY_SEASON) return t("phase.rainySeason")
	if (phase === rf.PHASE_GAME_OVER) return t("phase.gameOver")
	return t("phase.unknown", { phase })
}

export function kindName(kind) {
	return kind === "pump" ? t("common.pump") : kind === "reservoir" ? t("common.reservoir") : kind
}

export function waterworkMeasure(work) {
	if (work.kind === "pump") {
		if (work.capacity === "M") return t("map.unlimitedReach")
		return Number(work.capacity) === 1 ? t("map.reachOne", { count: work.capacity }) : t("map.reach", { count: work.capacity })
	}
	return t("map.capacity", { capacity: work.capacity === "M" ? t("supply.unlimited") : work.capacity })
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
		previousName: before.states[state.id].king === null ? t("common.none") : before.players[before.states[state.id].king].displayName,
		nextName: state.king === null ? t("common.none") : after.players[state.king].displayName,
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
	else if (image === "icon-hand-card") return new URL(`../../../static/URR/images/icon-hand-card.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/URR/images/icon-rulebook.svg`, import.meta.url).href
	else if (image === "icon-price-tag") return new URL(`../../../static/URR/images/icon-price-tag.svg`, import.meta.url).href
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
