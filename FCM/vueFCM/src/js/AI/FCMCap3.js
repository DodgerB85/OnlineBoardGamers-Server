import i18n from "../../i18n"
import * as IO from "../../backend/FCM_IO"
import { useModelStore } from "../../stores/FCMstore.js"
import { usePersonalStore } from "../../stores/FCMpersonal.js"
import * as context from "../FCMcontext"
import * as controller from "../FCMcontroller"
import * as funcs from "../FCMfuncs"
import * as map from "../FCMmap"
import * as model from "../FCMmodel"
import * as player from "../FCMplayer"
import * as rf from "../FCMreference"
import * as rules from "../FCMrules"

let inFlight = false

const finishSubphases = new Map([
	[700000, [rf.SUBPHASE_HIRING]],
	[900000, [rf.SUBPHASE_TRAINING]],
	[330000, [rf.SUBPHASE_MARKETING]],
	[430000, [rf.SUBPHASE_PRODUCE]],
	[2400000, [rf.SUBPHASE_HOUSES, rf.SUBPHASE_LOBBYISTS]],
	[2900000, [rf.SUBPHASE_NEW_RESTAURANTS]],
])

function requireMove(legal) {
	if (!legal) throw new Error("Move rejected by FCM rules")
}

function inRange(action, start, end) {
	return action >= start && action < end
}

function train(seat, from, to, origin) {
	const store = useModelStore()
	const p = store.players[seat]
	const points = rules.getTrainingPoints(seat, store.context.justTrained)
	requireMove(origin === 0 ? p.beach.includes(from) : origin === 1
		? rules.getRemainingRecruitingPoints(seat) > 0 && rules.hireableEmployees().includes(from)
		: p.employees.includes(from) && p.milestones.includes(rf.FIRST_LEMONADE_SOLD))
	const upgrades = rules.possibleUpgrades(store.availableEmployees, seat, from,
		points.total, points.level2, points.level3, points.unlimited, store.context.justTrained.map(t => t.to), origin === 2)
	const steps = upgrades.findIndex(level => level.includes(to)) + 1
	requireMove(steps > 0)
	const selection = context.bindTrainingSelection({ employee: from, origin })
	requireMove(controller.trainEmployee(to, steps, selection) !== false)
}

function restructure(plan) {
	const store = useModelStore()
	const p = store.players[plan.seat]
	const held = [...p.employees, ...p.beach].filter(emp => emp >= 0).sort()
	const deployed = plan.employees.filter(emp => emp >= 0)
	const assigned = [...deployed, ...plan.beach].sort()
	const extraSlots = plan.employees.slice(0, p.ceoSlots).reduce((slots, emp) =>
		slots + (emp >= 0 ? rules.getSubSlotsForEmployee(emp) : 0), 0)
	requireMove(held.length === assigned.length && held.every((emp, i) => emp === assigned[i]))
	requireMove(deployed.length <= p.ceoSlots + extraSlots &&
		plan.employees.slice(p.ceoSlots).every(emp => !rf.MANAGERS.includes(emp)))
	return deployed
}

function work(seat, action, secondGood) {
	const store = useModelStore()
	const p = store.players[seat]
	const ctx = store.context
	const subphase = store.gameflow.subphase
	if (finishSubphases.has(action)) {
		// The client advances through some empty subphases in the same call.
		if (finishSubphases.get(action).includes(subphase)) controller.endWorkingDaySubphase()
		return
	}
	if (subphase === rf.SUBPHASE_HIRING && inRange(action, 600000, 600100)) {
		requireMove(controller.hireEmployee(action - 600000))
	} else if (subphase === rf.SUBPHASE_TRAINING && inRange(action, 800000, 810000)) {
		const offset = action - 800000
		train(seat, Math.floor(offset / 100), offset % 100, 0)
	} else if (subphase === rf.SUBPHASE_TRAINING && inRange(action, 5110000, 5130000)) {
		const offset = action - 5100000
		train(seat, Math.floor(offset % 10000 / 100) - 1, offset % 100, Math.floor(offset / 10000))
	} else if (subphase === rf.SUBPHASE_MARKETING && inRange(action, 300000, 300100)) {
		const marketer = action - 300000
		requireMove(rf.MARKETERS.includes(marketer) && p.employees.includes(marketer))
		controller.selectMarketer(marketer)
	} else if (subphase === rf.SUBPHASE_MARKETING && inRange(action, 310000, 310100)) {
		const campaign = action - 310000
		requireMove(ctx.campaigns.includes(campaign))
		controller.chooseCampaign(campaign)
	} else if (subphase === rf.SUBPHASE_MARKETING && inRange(action, 7000000, 7680000)) {
		const offset = action - 7000000
		const square = offset % 6800
		const rotated = Math.floor(offset / 6800) % 2 === 1
		const duration = Math.floor(offset / 13600) % 10
		const good = Math.floor(offset / 136000) % 10
		requireMove(ctx.campaign > 0 && good <= rf.BURGER && duration >= 1)
		if (ctx.rotated !== rotated) controller.rotateCampaign()
		requireMove(store.highlights.indexesToHighlightYellow.includes(square))
		controller.chooseGood(good)
		controller.chooseDuration(duration)
		controller.chooseSecondGood(secondGood ?? -1)
		controller.placeMarketingCampaign(square)
	} else if (subphase === rf.SUBPHASE_PRODUCE && inRange(action, 400000, 400100)) {
		const producer = action - 400000
		requireMove(rules.availableProducers(seat, ctx.justProduced.team).includes(producer))
		controller.clickedProducer(producer)
	} else if (subphase === rf.SUBPHASE_PRODUCE && inRange(action, 1700000, 1701000)) {
		const offset = action - 1700000
		const producer = Math.floor(offset / 10)
		const good = offset % 10
		requireMove(rules.availableProducers(seat, ctx.justProduced.team).includes(producer) &&
			rules.givePossibleFoodDrinksChoice(producer).includes(good))
		controller.clickedProducer(producer)
		controller.addProducedItemToPlayer(good)
	} else if (subphase === rf.SUBPHASE_PRODUCE && inRange(action, 3400000, 3400100)) {
		const producer = action - 3400000
		requireMove(rules.availableProducers(seat, ctx.justProduced.team).includes(producer))
		controller.clickedProducer(producer)
	} else if (subphase === rf.SUBPHASE_PRODUCE && inRange(action, 3500000, 3506800)) {
		const square = action - 3500000
		requireMove(store.highlights.indexesToHighlightYellow.includes(square))
		controller.selectNextPosition(square)
	} else if (subphase === rf.SUBPHASE_PRODUCE && inRange(action, 3600000, 3600272)) {
		const tile = action - 3600000
		requireMove(store.highlights.tilesToHighlight.includes(tile))
		controller.selectNextTile(tile)
	} else if (subphase === rf.SUBPHASE_PRODUCE && action === 3700000) {
		if (ctx.producer >= 0) controller.stopCollecting()
	} else if (subphase === rf.SUBPHASE_HOUSES && inRange(action, 4000000, 7000000)) {
		const offset = action - 4000000
		const square = offset % 6800
		const house = Math.floor(offset / 27200)
		const rotation = Math.floor(offset / 6800) % 4
		if (rf.BOARD_HOUSES.includes(house)) {
			const houseIndex = map.findIndexForHouse(house)
			const edge = map.giveEdgeForIndex(square, houseIndex)
			requireMove(map.findFreeEdgesForHouse(house).includes(edge))
			ctx.house = house
			ctx.houseIndex = houseIndex
			controller.chooseHouseEdge(edge, square)
		} else {
			requireMove(rules.availableHouses().includes(house))
			ctx.rotation = rotation
			controller.selectHouseToBuild(house)
			requireMove(store.highlights.indexesToHighlightYellow.includes(square))
			controller.chooseHousePosition(square)
		}
	} else if (subphase === rf.SUBPHASE_NEW_RESTAURANTS && inRange(action, 2600000, 2600100)) {
		const manager = action - 2600000
		requireMove(rf.CAN_BUILD_RESTAURANT.includes(manager) && p.employees.includes(manager))
		controller.selectManager(manager)
	} else if (subphase === rf.SUBPHASE_NEW_RESTAURANTS && inRange(action, 2650000, 2650002)) {
		controller.chooseBuildAction(action === 2650000 ? "move" : "create")
	} else if (subphase === rf.SUBPHASE_NEW_RESTAURANTS && inRange(action, 2700000, 2700016)) {
		const restaurant = p.restaurants[action - 2700000]
		requireMove(restaurant && ctx.selectedBuildingManager === rf.REGIONAL_MANAGER)
		controller.removeRestaurantForMove(restaurant.index)
	} else if (subphase === rf.SUBPHASE_NEW_RESTAURANTS && inRange(action, 2800000, 2900000)) {
		const offset = action - 2800000
		const square = offset % 6800
		ctx.rotation = Math.floor(offset / 6800) % 4
		requireMove(rf.CAN_BUILD_RESTAURANT.includes(ctx.selectedBuildingManager) &&
			rules.givePossiblePositionsForNewRestaurant(ctx.rotation, ctx.selectedBuildingManager === rf.LOCAL_MANAGER).includes(square))
		controller.chooseRestaurantPositionForWorking(square)
	} else {
		throw new Error(`Unsupported Cap3 working-day action ${action} in subphase ${subphase}`)
	}
}

export async function applyCap3Turn(plan) {
	const store = useModelStore()
	const p = store.players[plan.seat]
	const actions = plan.steps.flatMap(step => step.actions)
	const first = actions[0]
	const phase = store.gameflow.phase
	requireMove(plan.phase === phase && p?.name === rf.AI_NAME)
	const simultaneous = controller.isSimulPhase(phase)
	if (phase === rf.PHASE_SETUP_RESTAURANT1 || phase === rf.PHASE_SETUP_RESTAURANT2) {
		requireMove(actions.length === 1)
		if (first === 200000) {
			requireMove(phase === rf.PHASE_SETUP_RESTAURANT1 && store.gameflow.turnOrder.length > 1)
			model.addHistory(rf.HIST_DELAY_SETUP, [], plan.seat, 0)
		} else {
			const square = Math.floor((first - 150000) / 4)
			const rotation = (first - 150000) % 4
			requireMove(rules.givePossibleStartingRestaurantsPosition(rotation).includes(square))
			model.addRestaurant_core(plan.seat, square, rotation, true)
			const entry = [funcs.exportIndex(square)]
			if (rotation !== 3) entry.push(rotation)
			model.addHistory(rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION, entry, plan.seat, 0)
		}
	} else if (phase === rf.PHASE_SETUP_RESERVE) {
		requireMove(actions.length === 1 && inRange(first, 300001, 300004))
		const card = first - 300000
		if (simultaneous) return IO.saveSimulMove([card], false, "", null, plan.seat)
		store.reserveCards[plan.seat] = card
		model.addHistory(rf.HIST_CHOOSE_RESERVE_CARD, [card], plan.seat, 0)
	} else if (phase === rf.PHASE_RESTRUCTURING) {
		const employees = restructure(plan)
		if (simultaneous) return IO.saveSimulMove([plan.beach, employees, 0], false, "", null, plan.seat)
		p.employees = employees
		p.beach = plan.beach
	} else if (phase === rf.PHASE_TURN_ORDER) {
		const slot = (first - 500000) / 1000
		requireMove(actions.length === 1 && store.gameflow.newTurnOrder[slot] === -1)
		controller.chooseTurnOrderPosition(slot)
	} else if (phase === rf.PHASE_WORKING_DAY) {
		requireMove(inRange(actions.at(-1), 3000001, 3000006))
		for (const step of plan.steps) {
			for (const action of step.actions) {
				if (!inRange(action, 3000001, 3000006)) work(plan.seat, action, step.second_good)
			}
		}
		requireMove(store.gameflow.subphase === rf.SUBPHASE_CONFIRM_END_TURN)
	} else if (phase === rf.PHASE_PAYDAY) {
		for (const action of actions) {
			if (action === 4000007) continue
			if (inRange(action, 4100000 + plan.seat * 100, 4100100 + plan.seat * 100)) {
				const employee = action - 4100000 - plan.seat * 100
				requireMove(rules.fireableEmployees(plan.seat).includes(employee) && player.fireEmployee(plan.seat, employee))
				store.context.justFired.push(employee)
			} else {
				const good = action - 3800000 - plan.seat * 10
				requireMove(inRange(good, 0, 5) && p.resources.includes(good) && rules.canPayWithFood(plan.seat))
				player.removeResourcesFromPlayer(plan.seat, good, 1)
				store.context.preMoveData[0][1].push(good)
			}
		}
		const paid = store.context.preMoveData[0][1].length * player.unitarySalary(plan.seat)
		const due = Math.max(0, rules.baseSalary(plan.seat) - paid) + rules.headhuntSalaryDue(plan.seat)
		requireMove(due <= p.money || player.hasMilestone(plan.seat, rf.FIRST_TRAINER_USED))
	} else if (phase === rf.PHASE_CLEAN_UP) {
		for (const action of actions) {
			if (action === 3000000 || action === 3000001) continue
			const good = action - 3900000
			requireMove(inRange(good, 0, 5) && p.resources.includes(good))
			controller.binResource(good)
		}
	} else {
		throw new Error(`Unsupported Cap3 phase ${phase}`)
	}
	return controller.endPlayerTurn(true, false, { cap3Seat: plan.seat })
}

export function cap3Seat() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!window.initData.startingOptions?.includes(rf.SO_CAP3_AI) || personal.pov < 0 || store.viewSettings.showReplay ||
		store.players.length !== 4 || store.gameflow.phase === rf.PHASE_GAME_OVER) return -1
	const order = store.gameflow.turnOrder
	const eligible = controller.isSimulPhase() ? order : order.slice(0, 1)
	return eligible.find(seat => store.players[seat]?.name === rf.AI_NAME && store.players[seat].displayName !== rf.BOT_NAME) ?? -1
}

export async function runCap3Turn(seat) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (inFlight || personal.haltPlay) return
	inFlight = true
	const phase = store.gameflow.phase
	const latestUpdate = personal.latestUpdate
	const simultaneous = controller.isSimulPhase(phase)
	let snapshot
	let reload = false
	let refreshTurn = false
	let keepHalted = false
	try {
		if (!simultaneous) controller.startPlayerTurn(false, true)
		snapshot = funcs.simpleExportWholeFCMmodel()
		personal.haltPlay = true
		store.viewSettings.showGameLoader = true
		const response = await fetch(`/FCM/${personal.gameID}/cap3/`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-CSRFToken": funcs.getCookie("csrftoken") },
			body: JSON.stringify({
				latestUpdate,
				state: funcs.decompressData(funcs.exportFCMmodel(false, false)),
				metadata: {
					starting_map: map.getOriginalTiles(false),
					subphase: store.gameflow.subphase,
					availableEmployees: store.availableEmployees,
					availableMarketingCampaigns: store.availableMarketingCampaigns,
					availableMilestones: store.availableMilestones,
					bankruptPlayers: store.players.flatMap((p, index) => p.bankrupt ? [index] : []),
				},
			}),
		})
		const plan = await response.json()
		if (response.status === 409) {
			if (latestUpdate === personal.latestUpdate && simultaneous && String(plan.latestUpdate) === latestUpdate) {
				store.gameflow.turnOrder = store.gameflow.turnOrder.filter(other => other !== seat)
				refreshTurn = true
			} else {
				reload = latestUpdate === personal.latestUpdate && (plan.stale === true || String(plan.latestUpdate) !== latestUpdate)
				refreshTurn = latestUpdate !== personal.latestUpdate
			}
		} else {
			if (!response.ok) throw new Error(plan.error)
			if (latestUpdate === personal.latestUpdate && seat === cap3Seat()) await applyCap3Turn(plan)
			keepHalted = personal.haltPlay && Boolean(store.gameMessages.errorText)
			refreshTurn = latestUpdate !== personal.latestUpdate || (simultaneous && cap3Seat() < 0)
		}
	} catch (error) {
		if (latestUpdate === personal.latestUpdate) {
			if (snapshot) funcs.simpleImportWholeFCMmodel(snapshot)
			store.gameMessages.errorText = i18n.global.t("FCM_IO.cap3Error")
			store.gameMessages.retrySave = () => runCap3Turn(seat)
		}
		console.error("Cap3 AI failed", error)
	} finally {
		inFlight = false
		store.viewSettings.showGameLoader = false
		personal.haltPlay = keepHalted
	}
	if (reload) await IO.loadGame()
	else if (refreshTurn) controller.startPlayerTurn(false)
}
