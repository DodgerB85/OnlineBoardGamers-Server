import { currentWaterFrame } from "./URRwater.js"
import { applyAction } from "./URRgame.js"
import { endsDecision } from "./URRturnDraft.js"
import { getAutomaticAction } from "./URRrules.js"
import i18n from "../i18n.js"

// Irrigate direct land before handing water to a pump, regardless of click order.
export function previewWaterPlan(game, selections) {
	const actions = selections.map((selection) => ({ type: "allocateWater", area: selection.area, amount: selection.amount }))
	actions.sort((a, b) => Number(!!game.board.areas.find((area) => area.id === a.area).waterwork) - Number(!!game.board.areas.find((area) => area.id === b.area).waterwork))
	let state = game
	let isReady = false
	for (const action of actions) {
		if (isReady) throw new Error(i18n.global.t("actions.finishPumpRouting"))
		const after = applyAction(state, state.gameflow.turnOrder[0], action)
		isReady = endsDecision(state, after, action)
		state = after
	}
	let automatic = getAutomaticAction(state)
	while (!isReady && automatic) {
		const after = applyAction(state, state.gameflow.turnOrder[0], automatic)
		isReady = endsDecision(state, after, automatic)
		state = after
		automatic = getAutomaticAction(state)
	}
	// A completed allocation can return unused pump water for the next decision.
	if (!isReady && selections.reduce((total, selection) => total + selection.amount, 0) !== currentWaterFrame(game).water) throw new Error(i18n.global.t("turn.routeRemainingWater"))
	return actions
}
