import * as rf from "./URRreference.js"
import * as rules from "./URRrules.js"
import * as water from "./URRwater.js"

function readSnapshot(entry) {
	if (!entry) return null
	try { return JSON.parse(entry[2]) } catch (error) { console.error("Unable to read URR history snapshot:", error); return null }
}

function irrigationDetails(game, areas) {
	return areas.map((area) => ({
		area: area.id, label: area.label || area.id, state: area.irrigatedBy, player: area.owner,
		text: `${area.label || area.id}${area.isCity ? ' (city)' : ''} · ${rf.STATE_NAMES[area.irrigatedBy]} irrigates · Landowner receives ${rf.IRRIGATED_LANDOWNER_INCOME * (area.isCity ? 2 : 1)} SPL`,
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
			const summary = addSummary("riverStart", `Turn ${before.gameflow.turn} · The rivers flow`, `${sources.length} rivers bring ${perRiver} water each (${sources.length * perRiver} total) from the top of the board. Reservoirs divert water into canals; pumps irrigate owned land within reach.`, sources.map((id) => ({ area: id, label: after.board.areas.find((area) => area.id === id)?.label || id, text: `${after.board.areas.find((area) => area.id === id)?.label || id}: ${perRiver} water enters` })))
			summary.waterTotal = sources.length * perRiver
		}
		let wetGame = before.rain.step === "harvest" ? before : after
		if (finishesRouting) {
			wetGame = routingSnapshot(before, after, action, startsRain)
			const wet = wetGame.board.areas.filter((area) => area.irrigatedBy !== null)
			const text = wet.length ? `${wet.length} hexes irrigated; ${after.rain.outflow} water flows off the board. Landowner income is shown below. This income is separate from the states' harvests.` : `No land was irrigated. All ${after.rain.outflow} water flows off the board: the reservoirs and pump networks could not irrigate any owned land. No irrigation income or harvest is paid.`
			const summary = addSummary("riverComplete", wet.length ? "Water routing complete · irrigation income paid" : "Water routing complete · no land irrigated", text, irrigationDetails(wetGame, wet))
			Object.assign(summary, { waterTotal: wet.length + after.rain.outflow, irrigatedCount: wet.length, outflow: after.rain.outflow })
		} else if (startsRain || before.rain.step === "routing") {
			const wet = after.board.areas.filter((area) => area.irrigatedBy !== null && (startsRain || before.board.areas.find((land) => land.id === area.id)?.irrigatedBy === null))
			if (wet.length) addSummary("irrigation", "Land irrigated", "These hexes are now wet. Landowner income will be paid when river routing finishes; the irrigating state receives its harvest afterwards.", irrigationDetails(after, wet).map((detail) => ({ ...detail, text: detail.text.replace('receives', 'will receive') })))
		}
		if (!before.gameflow.endReason && after.gameflow.endReason) {
			const invasion = after.gameflow.endReason === "invasion"
			addSummary("endTrigger", invasion ? "Final rainy season · Southern invasion" : "Final rainy season · Revolution", invasion ? "All upstream water was used for irrigation; none reaches the southern river exit. The game ends after all harvests and land-price updates have resolved." : "A monarch cannot fund the mandatory digging crew, even after all eligible land sales. The game ends after this rainy season; the revolting state must distribute its harvest.", invasion ? [] : after.states.filter((state) => state.hasRevolted).map((state) => ({ state: state.id, text: `${rf.STATE_NAMES[state.id]} revolts` })))
		}

		if (after.era > before.era) {
			const details = before.states.flatMap((state) => state.diggers.filter((crew) => !after.states[state.id].diggers.some((remaining) => remaining.id === crew.id)).map((crew) => ({ state: state.id, text: `${rf.STATE_NAMES[state.id]}: era ${crew.era} crew (${crew.capacity} points) retires` })))
			if (after.era >= 4) for (const nation of before.nations.filter((nation) => !nation.isRemoved && after.nations[nation.id].isRemoved)) details.push({ nation: nation.id, text: `${rf.NATION_NAMES[nation.id]} dissolves` })
			addSummary("era", `Era ${after.era === 5 ? 'M' : after.era} begins`, details.length ? "Old crews retire and independent nations dissolve as shown below." : "The new equipment era begins; no crews retire.", details)
		}
		const beginsDevelopment = before.gameflow.phase === rf.PHASE_SETTLEMENT && after.gameflow.phase === rf.PHASE_DEVELOPMENT
		const paysNegotiationIncome = before.gameflow.phase === rf.PHASE_DIVIDING_NATIONS && action?.type === "pass" && before.gameflow.passes === before.players.length - 1 && before.nations[rf.NATION_ASHUR].ownerType !== null
		if (beginsDevelopment || paysNegotiationIncome) {
			const details = after.nations.filter((nation) => !nation.isRemoved && nation.ownerType !== null).map((nation) => ({ nation: nation.id, player: nation.ownerType === "player" ? nation.owner : undefined, state: nation.ownerType === "state" ? nation.owner : undefined, text: `${rf.NATION_NAMES[nation.id]} pays ${rf.NATION_INCOMES[nation.id]} SPL to ${nation.ownerType === 'player' ? 'private cash' : `${rf.STATE_NAMES[nation.owner]} treasury`}` }))
			addSummary("nationIncome", "Nation income paid", details.length ? "Each surviving nation pays its owner." : "No surviving owned nations; no nation income is paid.", details)
			if (beginsDevelopment) addSummary("development", "Development begins", "Crews are ready to dig. Active states develop in this order:", after.gameflow.stateOrder.map((id) => ({ state: id, text: `${rf.STATE_NAMES[id]}${before.states[id].isActive ? '' : ' · emerges this round'}` })))
		}
		if (before.rain.step === "harvest" && action?.type === "harvest") {
			const id = before.rain.harvestOrder[0]
			const amount = rules.harvestAmount(before, id)
			const distribution = rules.harvestDistribution(before, id, amount)
			const details = action.choice === "store" ? [{ state: id, text: `${rf.STATE_NAMES[id]} treasury receives ${amount} SPL` }] : distribution.payments.flatMap((payment, player) => payment > 0 ? [{ player, text: `Receives ${payment} SPL` }] : [])
			if (action.choice !== "store") details.push({ state: id, text: `${rf.STATE_NAMES[id]} treasury keeps ${distribution.retained} SPL` })
			addSummary("harvest", `${rf.STATE_NAMES[id]} harvest · ${amount} SPL`, action.choice === "store" ? "Harvest stored in the state treasury." : "Harvest distributed among landowners in this state, in proportion to their owned land. The treasury keeps any remainder.", details)
		}
		if (finishesRouting || (before.rain.step === "harvest" && action?.type === "harvest")) {
			const candidates = finishesRouting ? before.gameflow.stateOrder : before.rain.harvestOrder.slice(1)
			for (const id of candidates.filter((id) => !after.rain.harvestOrder.includes(id))) {
				const amount = rules.harvestAmount(wetGame, id)
				const distribution = rules.harvestDistribution(wetGame, id, amount)
				const details = distribution.payments.flatMap((payment, player) => payment > 0 ? [{ player, text: `Receives ${payment} SPL` }] : [])
				details.push({ state: id, text: `${rf.STATE_NAMES[id]} treasury keeps ${distribution.retained} SPL` })
				addSummary(`automaticHarvest-${id}`, `${rf.STATE_NAMES[id]} · automatic harvest`, amount === 0 ? "No land was irrigated by this state. Harvest is 0 SPL; nobody receives a harvest payment." : `This state revolted and must distribute its ${amount} SPL harvest among its landowners.`, details)
			}
		}
		if ((before.rain.step === "harvest" || finishesRouting) && after.rain.step === "complete") {
			const prices = rf.ALL_LAND_TYPES.map((type) => ({ terrain: type, text: `${rf.LAND_NAMES[type]}: ${before.landPrices[type]} → ${after.landPrices[type]} SPL · ${rules.irrigatedRegionCounts(wetGame)[type]} irrigated regions` }))
			addSummary("rainEnd", "Rainy season complete · land prices updated", "Each irrigated region raises its terrain's market price by one step. Dry terrain stays at the same price. Irrigation markers are cleared for the next round.", prices)
		}
		if (before.gameflow.phase !== rf.PHASE_GAME_OVER && after.gameflow.phase === rf.PHASE_GAME_OVER) {
			addSummary("finalScoring", "Game over · final assets", "Private cash plus land at its final market value determines the winner. State treasuries and independent nations do not count.", after.players.map((player, index) => ({ player: index, text: `${player.money} SPL cash + ${player.score - player.money} SPL land = ${player.score} SPL` })))
		}
		before = after
	}
	return result
}
