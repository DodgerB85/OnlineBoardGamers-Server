import * as rf from "./URRreference.js"
import * as water from "./URRwater.js"

export function actionPanelGame(game) {
	return game.turnDraft.ready ? game.turnDraft.steps.at(-1).state : game
}

export function turnCost(game) {
	const before = game.turnDraft.start.state
	return before.players.reduce((total, player, index) => total + player.money - game.players[index].money, 0) + before.states.reduce((total, state, index) => total + state.money - game.states[index].money, 0)
}

// Buying equipment closes digging, but remains part of the same state's turn.
export function turnContext(game) {
	const flow = game.gameflow
	return JSON.stringify([flow.turn, flow.phase, flow.turnOrder[0], flow.stateIndex,
		["eridu", "betweenStates"].includes(flow.developmentStep) ? flow.developmentStep : null,
		flow.auction?.nation, flow.pendingOffer, game.rain.step,
		game.rain.step === "routing" ? water.currentWaterFrame(game)?.area : game.rain.harvestOrder[0]])
}

export function endsDecision(before, after, action) {
	if (action.type === "exchangeBarahshum") return false
	return turnContext(before) !== turnContext(after) || ["pass", "buyNation", "bidNation", "tradeLand", "bidPrimogeniture", "digEridu", "beginDevelopment", "endDevelopment", "respondOffer", "harvest", "passBarahshum"].includes(action.type)
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
	else if (["dig", "digEridu", "exchangeBarahshum"].includes(action.type)) message = `Canal ${(action.path || [action.from, action.to]).map(label).join(" → ")}`
	else if (action.type === "buyCard") message = "Crew"
	else if (["requestWaterwork", "exchangeCalah"].includes(action.type)) message = `${label(action.area)} · ${action.kind}${action.type === "exchangeCalah" ? " via Calah" : ""}${after.gameflow.pendingOffer || after.gameflow.waterworkRequests?.some((offer) => offer.action.area === action.area) ? " · agreement needed" : ""}`
	else if (action.type === "respondOffer") message = action.accept ? "Agreement accepted" : "Agreement declined"
	else if (action.type === "harvest") message = `${rf.STATE_NAMES[before.rain.harvestOrder[0]]} harvest · ${action.choice === "store" ? `store in treasury${action.remove ? ` and remove ${label(action.remove)}` : ""}` : "distribute to landowners"}.`
	else if (["buyNation", "bidNation", "offerNation"].includes(action.type)) message = `${rf.NATION_NAMES[action.nation]} · ${action.type === "buyNation" ? "purchase" : `offer ${action.amount} SPL`}`
	else if (action.type === "tradeLand") message = `Trade: ${[action.buy ? `buy ${label(action.buy)}` : "", ...(action.sellBefore || []).flat().map((id) => `sell ${label(id)}`), ...(action.sellAfter || []).flat().map((id) => `sell ${label(id)}`)].filter(Boolean).join(" · ")}.`
	else if (action.type === "bidPrimogeniture") message = `Primogeniture bid · ${action.amount} SPL`
	else if (action.type === "passBarahshum") message = "Pass Barahshum for this round"
	else if (action.type === "pass") message = "Pass"
	else if (action.type === "endDevelopment") message = after.gameflow.pendingOffer ? "Request landowner agreement." : `${rf.STATE_NAMES[before.gameflow.stateOrder[before.gameflow.stateIndex]]} development complete.`
	else if (action.type === "resolveMaintenance") message = "Required crew hired"
	else message = "Turn choice"
	return message
}

export function describeAction(before, after, action) {
	const message = actionSummary(before, after, action)
	if (endsDecision(before, after, action)) return message
	const frame = water.currentWaterFrame(after)
	return after.rain.step === "routing" && frame ? `${message} ${frame.water} water remaining · choose another destination.` : message
}
