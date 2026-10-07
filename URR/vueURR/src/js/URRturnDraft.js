import * as rf from "./URRreference.js"
import * as water from "./URRwater.js"

// Buying equipment closes digging, but remains part of the same state's turn.
export function turnContext(game) {
	const flow = game.gameflow
	return JSON.stringify([flow.turn, flow.phase, flow.turnOrder[0], flow.stateIndex,
		["eridu", "betweenStates"].includes(flow.developmentStep) ? flow.developmentStep : null,
		flow.auction?.nation, flow.pendingOffer, game.rain.step,
		game.rain.step === "routing" ? water.currentWaterFrame(game)?.area : game.rain.harvestOrder[0]])
}

export function endsDecision(before, after, action) {
	return turnContext(before) !== turnContext(after) || ["pass", "buyNation", "bidNation", "tradeLand", "bidPrimogeniture", "digEridu", "beginDevelopment", "endDevelopment", "respondOffer", "harvest", "exchangeBarahshum"].includes(action.type)
}

export function defaultEndAction(game) {
	if (game.gameflow.pendingOffer) throw new Error("Choose Accept or Decline before ending your turn.")
	if ([rf.PHASE_DIVIDING_NATIONS, rf.PHASE_SETTLEMENT].includes(game.gameflow.phase)) return { type: "pass" }
	if (game.gameflow.phase === rf.PHASE_DEVELOPMENT) return { type: game.gameflow.developmentStep === "betweenStates" ? "beginDevelopment" : game.gameflow.developmentStep === "eridu" ? "pass" : "endDevelopment" }
	throw new Error(game.rain.step === "routing" ? "Route the remaining water before ending your turn." : "Choose how to use the harvest before ending your turn.")
}

export function actionSummary(before, after, action) {
	const label = (id) => after.board.areas.find((area) => area.id === id)?.label || id
	let message
	if (action.type === "allocateWater") message = `${label(action.area)} · ${before.board.areas.find((area) => area.id === action.area)?.waterwork ? `${action.amount} water sent` : "irrigated"}.`
	else if (["dig", "digEridu", "exchangeBarahshum"].includes(action.type)) message = `Canal ${(action.path || [action.from, action.to]).map(label).join(" → ")} added to your draft.`
	else if (action.type === "buyCard") message = "Crew added to your draft."
	else if (["requestWaterwork", "exchangeCalah"].includes(action.type)) message = `${label(action.area)} · ${action.kind}${action.type === "exchangeCalah" ? " via Calah" : ""} ${after.gameflow.pendingOffer ? "agreement request prepared" : "added to your draft"}.`
	else if (action.type === "respondOffer") message = action.accept ? "Agreement accepted in your draft." : "Agreement declined in your draft."
	else if (action.type === "harvest") message = `${rf.STATE_NAMES[before.rain.harvestOrder[0]]} harvest · ${action.choice === "store" ? `store in treasury${action.remove ? ` and remove ${label(action.remove)}` : ""}` : "distribute to landowners"}.`
	else if (["buyNation", "bidNation", "offerNation"].includes(action.type)) message = `${rf.NATION_NAMES[action.nation]} · ${action.type === "buyNation" ? "purchase" : `offer ${action.amount} SPL`} prepared.`
	else if (action.type === "tradeLand") message = `Trade prepared: ${[action.buy ? `buy ${label(action.buy)}` : "", ...(action.sellBefore || []).flat().map((id) => `sell ${label(id)}`), ...(action.sellAfter || []).flat().map((id) => `sell ${label(id)}`)].filter(Boolean).join(" · ")}.`
	else if (action.type === "bidPrimogeniture") message = `Primogeniture bid · ${action.amount} SPL prepared.`
	else if (action.type === "pass") message = "Pass prepared."
	else if (action.type === "endDevelopment") message = `${rf.STATE_NAMES[before.gameflow.stateOrder[before.gameflow.stateIndex]]} development complete.`
	else if (action.type === "resolveMaintenance") message = "Required crew and maintenance resolved in your draft."
	else message = "Turn choice prepared."
	return message
}

export function describeAction(before, after, action) {
	const message = actionSummary(before, after, action)
	if (endsDecision(before, after, action)) return `${message} Review your choices, then End Turn to confirm.`
	const frame = water.currentWaterFrame(after)
	return `${message} ${after.rain.step === "routing" && frame ? `${frame.water} water remaining · choose another destination.` : "Continue playing, or End Turn to confirm."}`
}
