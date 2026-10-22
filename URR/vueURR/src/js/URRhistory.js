import * as rf from "./URRreference.js"
import * as rules from "./URRrules.js"
import * as water from "./URRwater.js"
import i18n from "../i18n.js"

const t = i18n.global.t

function readSnapshot(entry) {
	if (!entry) return null
	try { return JSON.parse(entry[2]) } catch (error) { console.error("Unable to read URR history snapshot:", error); return null }
}

function irrigationDetails(game, areas, future = false) {
	return areas.map((area) => ({
		area: area.id, label: area.label || area.id, state: area.irrigatedBy, player: area.owner,
		text: t(future ? "historyPage.irrigationDetailFuture" : "historyPage.irrigationDetail", {
			area: area.label || area.id,
			city: area.isCity ? t("historyPage.citySuffix") : "",
			state: rf.STATE_NAMES[area.irrigatedBy],
			income: rf.IRRIGATED_LANDOWNER_INCOME * (area.isCity ? 2 : 1),
		}),
	}))
}

// The last harvest clears irrigation. Re-run only water routing to recover
// the wet hexes when all harvesting was automatic in the same saved move.
function routingSnapshot(before, after, action, startsRain) {
	if (after.rain.step !== "complete") return after
	const game = JSON.parse(JSON.stringify(startsRain ? after : before))
	if (startsRain) {
		for (const area of game.board.areas) area.irrigatedBy = null
		game.rain = { step: "routing", outflow: null, harvestOrder: [] }
		water.startWaterRouting(game)
	} else if (action?.type === "allocateWater") water.allocateWater(game, action)
	else if (action?.type === "advanceWater") water.advanceWaterRouting(game)
	return game
}

export function computeHistory(history, creationTimestamp) {
	const result = []
	let before = null
	for (const [index, entry] of history.entries()) {
		const displayEntry = [...entry]
		displayEntry[4] = entry[4] ?? (entry[0] === rf.HIST_NEW_GAME ? creationTimestamp : null)
		displayEntry.historyIndex = index
		displayEntry.historyKey = `${index}-move`
		result.push(displayEntry)
		const after = readSnapshot(entry)
		if (!before || !after) { before = after; continue }
		const action = entry[3]
		function addSummary(kind, title, text, details = []) {
			const summary = [rf.HIST_ACTION, -1, entry[2], null, displayEntry[4]]
			summary.historyIndex = index
			summary.historyKey = `${index}-${kind}`
			summary.administration = { kind, title, text, details, turn: before.gameflow.turn }
			result.push(summary)
			return summary.administration
		}

		const startsRain = before.gameflow.phase === rf.PHASE_DEVELOPMENT && (after.gameflow.phase === rf.PHASE_RAINY_SEASON || after.gameflow.turn > before.gameflow.turn || after.gameflow.phase === rf.PHASE_GAME_OVER)
		const finishesRouting = (startsRain || before.rain.step === "routing") && after.rain.outflow !== null && after.rain.step !== "routing"
		if (startsRain) {
			const perRiver = rf.ERA_WATER_PER_RIVER[after.era]
			const sources = after.board.riverSources || []
			const summary = addSummary("riverStart", t("historyPage.riversFlow", { turn: before.gameflow.turn }), t("historyPage.riversFlowText", { count: sources.length, perRiver, total: sources.length * perRiver }), sources.map((id) => ({ area: id, label: after.board.areas.find((area) => area.id === id)?.label || id, text: t("historyPage.waterEnters", { area: after.board.areas.find((area) => area.id === id)?.label || id, amount: perRiver }) })))
			summary.waterTotal = sources.length * perRiver
		}
		let wetGame = before.rain.step === "harvest" ? before : after
		if (finishesRouting) {
			wetGame = routingSnapshot(before, after, action, startsRain)
			const wet = wetGame.board.areas.filter((area) => area.irrigatedBy !== null)
			const text = wet.length ? t("historyPage.routingCompleteText", { count: wet.length, outflow: after.rain.outflow }) : t("historyPage.routingCompleteNoLandText", { outflow: after.rain.outflow })
			const summary = addSummary("riverComplete", wet.length ? t("historyPage.routingComplete") : t("historyPage.routingCompleteNoLand"), text, irrigationDetails(wetGame, wet))
			Object.assign(summary, { waterTotal: wet.length + after.rain.outflow, irrigatedCount: wet.length, outflow: after.rain.outflow })
		} else if (startsRain || before.rain.step === "routing") {
			const wet = after.board.areas.filter((area) => area.irrigatedBy !== null && (startsRain || before.board.areas.find((land) => land.id === area.id)?.irrigatedBy === null))
			if (wet.length) addSummary("irrigation", t("historyPage.landIrrigated"), t("historyPage.landIrrigatedText"), irrigationDetails(after, wet, true))
		}
		if (!before.gameflow.endReason && after.gameflow.endReason) {
			const invasion = after.gameflow.endReason === "invasion"
			addSummary("endTrigger", invasion ? t("historyPage.finalInvasion") : t("historyPage.finalRevolution"), invasion ? t("historyPage.invasionText") : t("historyPage.revolutionText"), invasion ? [] : after.states.filter((state) => state.hasRevolted).map((state) => ({ state: state.id, text: t("historyPage.revolts", { state: rf.STATE_NAMES[state.id] }) })))
		}

		if (after.era > before.era) {
			const details = before.states.flatMap((state) => state.diggers.filter((crew) => !after.states[state.id].diggers.some((remaining) => remaining.id === crew.id)).map((crew) => ({ state: state.id, text: t("historyPage.crewRetires", { state: rf.STATE_NAMES[state.id], era: crew.era, points: crew.capacity }) })))
			if (after.era >= 4) for (const nation of before.nations.filter((nation) => !nation.isRemoved && after.nations[nation.id].isRemoved)) details.push({ nation: nation.id, text: t("historyPage.nationDissolves", { nation: rf.NATION_NAMES[nation.id] }) })
			addSummary("era", t("historyPage.eraBegins", { era: after.era === 5 ? 'M' : after.era }), details.length ? t("historyPage.eraTextRetire") : t("historyPage.eraTextNone"), details)
		}
		// With no active state the whole development phase and rainy season resolve inside the move that ends settlement.
		const beginsDevelopment = before.gameflow.phase === rf.PHASE_SETTLEMENT && (after.gameflow.phase !== rf.PHASE_SETTLEMENT || after.gameflow.turn > before.gameflow.turn)
		const paysNegotiationIncome = before.gameflow.phase === rf.PHASE_DIVIDING_NATIONS && action?.type === "pass" && before.gameflow.passes === before.players.length - 1 && before.nations[rf.NATION_ASHUR].ownerType !== null
		if (beginsDevelopment || paysNegotiationIncome) {
			const details = after.nations.filter((nation) => !nation.isRemoved && nation.ownerType !== null).map((nation) => ({ nation: nation.id, player: nation.ownerType === "player" ? nation.owner : undefined, state: nation.ownerType === "state" ? nation.owner : undefined, text: nation.ownerType === "player" ? t("historyPage.nationPaysPrivate", { nation: rf.NATION_NAMES[nation.id], income: rf.NATION_INCOMES[nation.id] }) : t("historyPage.nationPaysState", { nation: rf.NATION_NAMES[nation.id], income: rf.NATION_INCOMES[nation.id], state: rf.STATE_NAMES[nation.owner] }) }))
			addSummary("nationIncome", t("historyPage.nationIncome"), details.length ? t("historyPage.nationIncomeText") : t("historyPage.nationIncomeNone"), details)
			if (beginsDevelopment) addSummary("development", t("historyPage.developmentBegins"), after.gameflow.stateOrder.length ? t("historyPage.developmentText") : t("historyPage.developmentNone", { count: rf.LAND_FOR_STATE_TO_ACTIVATE }), after.gameflow.stateOrder.map((id) => ({ state: id, text: `${rf.STATE_NAMES[id]}${before.states[id].isActive ? '' : t("historyPage.emergesThisRound")}` })))
		}
		if (before.rain.step === "harvest" && action?.type === "harvest") {
			const id = before.rain.harvestOrder[0]
			const amount = rules.harvestAmount(before, id)
			const distribution = rules.harvestDistribution(before, id, amount)
			const details = action.choice === "store" ? [{ state: id, text: t("historyPage.treasuryReceives", { state: rf.STATE_NAMES[id], amount }) }] : distribution.payments.flatMap((payment, player) => payment > 0 ? [{ player, text: t("historyPage.receives", { amount: payment }) }] : [])
			if (action.choice !== "store") details.push({ state: id, text: t("historyPage.treasuryKeeps", { state: rf.STATE_NAMES[id], amount: distribution.retained }) })
			addSummary("harvest", t("historyPage.harvest", { state: rf.STATE_NAMES[id], amount }), action.choice === "store" ? t("historyPage.harvestStored") : t("historyPage.harvestDistributed"), details)
		}
		if (finishesRouting || (before.rain.step === "harvest" && action?.type === "harvest")) {
			const candidates = finishesRouting ? before.gameflow.stateOrder : before.rain.harvestOrder.slice(1)
			for (const id of candidates.filter((id) => !after.rain.harvestOrder.includes(id))) {
				const amount = rules.harvestAmount(wetGame, id)
				const distribution = rules.harvestDistribution(wetGame, id, amount)
				const details = distribution.payments.flatMap((payment, player) => payment > 0 ? [{ player, text: t("historyPage.receives", { amount: payment }) }] : [])
				details.push({ state: id, text: t("historyPage.treasuryKeeps", { state: rf.STATE_NAMES[id], amount: distribution.retained }) })
				addSummary(`automaticHarvest-${id}`, t("historyPage.automaticHarvest", { state: rf.STATE_NAMES[id] }), amount === 0 ? t("historyPage.automaticHarvestNone") : t("historyPage.automaticHarvestRevolt", { amount }), details)
			}
		}
		if ((before.rain.step === "harvest" || finishesRouting) && after.rain.step === "complete") {
			const prices = rf.ALL_LAND_TYPES.map((type) => ({ terrain: type, text: t("historyPage.landPrice", { land: rf.LAND_NAMES[type], before: before.landPrices[type], after: after.landPrices[type], count: rules.irrigatedRegionCounts(wetGame)[type] }) }))
			addSummary("rainEnd", t("historyPage.rainyComplete"), t("historyPage.rainyCompleteText"), prices)
		}
		if (before.gameflow.phase !== rf.PHASE_GAME_OVER && after.gameflow.phase === rf.PHASE_GAME_OVER) {
			addSummary("finalScoring", t("historyPage.gameOver"), t("historyPage.gameOverText"), after.players.map((player, index) => ({ player: index, text: t("historyPage.finalAssets", { money: player.money, land: player.score - player.money, score: player.score }) })))
		}
		before = after
	}
	return result
}
