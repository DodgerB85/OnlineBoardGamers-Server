import * as rf from "./URRreference.js"
import * as water from "./URRwater.js"
import i18n from "../i18n.js"

const t = i18n.global.t
const kindLabel = (kind) => (kind === "pump" ? t("common.pump") : kind === "reservoir" ? t("common.reservoir") : kind)

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
	if (game.gameflow.pendingOffer) throw new Error(t("turn.chooseAcceptDecline"))
	if ([rf.PHASE_DIVIDING_NATIONS, rf.PHASE_SETTLEMENT].includes(game.gameflow.phase)) return { type: "pass" }
	if (game.gameflow.phase === rf.PHASE_DEVELOPMENT) return { type: game.gameflow.developmentStep === "betweenStates" ? "beginDevelopment" : game.gameflow.developmentStep === "eridu" ? "pass" : "endDevelopment" }
	throw new Error(game.rain.step === "routing" ? t("turn.routeRemainingWater") : t("turn.chooseHarvestUse"))
}

export function actionSummary(before, after, action) {
	const label = (id) => after.board.areas.find((area) => area.id === id)?.label || id
	let message
	if (action.type === "allocateWater") message = before.board.areas.find((area) => area.id === action.area)?.waterwork ? t("turn.sentWater", { area: label(action.area), amount: action.amount }) : t("turn.irrigated", { area: label(action.area) })
	else if (["dig", "digEridu", "exchangeBarahshum"].includes(action.type)) message = t("turn.canalPath", { path: (action.path || [action.from, action.to]).map(label).join(" → ") })
	else if (action.type === "buyCard") message = t("turn.crew")
	else if (["requestWaterwork", "exchangeCalah"].includes(action.type)) {
		const calah = action.type === "exchangeCalah" ? t("turn.calahVia") : ""
		const agreement = after.gameflow.pendingOffer || after.gameflow.waterworkRequests?.some((offer) => offer.action.area === action.area) ? t("turn.agreementNeeded") : ""
		message = t("turn.workRequest", { area: label(action.area), kind: kindLabel(action.kind), calah, agreement })
	} else if (action.type === "respondOffer") message = action.accept ? t("turn.accepted") : t("turn.declined")
	else if (action.type === "harvest") message = t("turn.harvest", { state: rf.STATE_NAMES[before.rain.harvestOrder[0]], choice: action.choice === "store" ? action.remove ? t("turn.storeRemove", { area: label(action.remove) }) : t("turn.store") : t("turn.distribute") })
	else if (["buyNation", "bidNation", "offerNation"].includes(action.type)) message = action.type === "buyNation" ? t("turn.nationPurchase", { nation: rf.NATION_NAMES[action.nation] }) : t("turn.nationOffer", { nation: rf.NATION_NAMES[action.nation], amount: action.amount })
	else if (action.type === "tradeLand") message = t("turn.trade", { actions: [action.buy ? t("turn.buyLand", { area: label(action.buy) }) : "", ...(action.sellBefore || []).flat().map((id) => t("turn.sellLand", { area: label(id) })), ...(action.sellAfter || []).flat().map((id) => t("turn.sellLand", { area: label(id) }))].filter(Boolean).join(" · ") })
	else if (action.type === "bidPrimogeniture") message = t("turn.primogeniture", { amount: action.amount })
	else if (action.type === "passBarahshum") message = t("turn.passBarahshum")
	else if (action.type === "pass") message = t("turn.pass")
	else if (action.type === "endDevelopment") message = after.gameflow.pendingOffer ? t("turn.requestAgreement") : t("turn.developmentComplete", { state: rf.STATE_NAMES[before.gameflow.stateOrder[before.gameflow.stateIndex]] })
	else if (action.type === "resolveMaintenance") message = t("turn.requiredCrew")
	else message = t("turn.turnChoice")
	return message
}

export function describeAction(before, after, action) {
	const message = actionSummary(before, after, action)
	if (endsDecision(before, after, action)) return message
	const frame = water.currentWaterFrame(after)
	return after.rain.step === "routing" && frame ? t("turn.waterRemaining", { message, water: frame.water }) : message
}
