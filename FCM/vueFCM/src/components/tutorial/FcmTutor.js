/**
 * FcmTutor - the tutorial opponent.
 *
 * Deliberate, deterministic moves: the whole point of a tutorial is that the
 * narrator can say "they did X because Y". So there is no randomness anywhere
 * here - every position comes from the game's own legality queries
 * (rules.givePossible*) rather than a hardcoded board index, which keeps the
 * tutor correct even though the tutorial map is fixed.
 *
 * playTutorSubphase() does the tutor's work for the ONE subphase it is
 * currently in, then returns a short sentence describing what it did so the
 * tutorial can show it. The engine calls it again on the next tick, which means
 * the user watches the tutor work one step at a time instead of everything
 * happening at once.
 */

import * as rf from "../../js/FCMreference"
import * as rules from "../../js/FCMrules"
import * as map from "../../js/FCMmap"
import * as controller from "../../js/FCMcontroller"
import * as model from "../../js/FCMmodel"
import { useModelStore } from "../../stores/FCMstore.js"
import { usePersonalStore } from "../../stores/FCMpersonal.js"

export const TUTOR_INDEX = 1

// Hire order, most useful first. Recruiters come early because they pay for
// themselves - each Recruiting Girl in your structure adds a recruiting point
// every following turn. Everything here is in rf.HIREABLE_EMPLOYEES so it can
// actually be recruited. Kitchen Trainee is deliberately absent: it can trigger
// the Pizza Bomb milestone detour, which is not worth teaching here.
export const HIRE_PLAN = [rf.RECRUITING_GIRL, rf.ERRAND_BOY, rf.MARKETING_TRAINEE, rf.WAITRESS, rf.TRAINER]

// The game has employeeName() but no equivalent for goods or campaign types.
const GOOD_NAMES = { [rf.BURGER]: "burger", [rf.PIZZA]: "pizza", [rf.SUSHI]: "sushi", [rf.NOODLES]: "noodles", [rf.DUMPLING]: "dumplings", [rf.BEER]: "beer", [rf.COKE]: "coke", [rf.LEMONADE]: "lemonade", [rf.COFFEE]: "coffee", [rf.FRIED_CHICKEN]: "fried chicken" }
const CAMPAIGN_TYPE_NAMES = { [rf.RADIO]: "radio", [rf.AIRPLANE]: "airplane", [rf.MAIL]: "mail campaign", [rf.BILLBOARD]: "billboard", [rf.GOURMET_GUIDE]: "gourmet guide", [rf.GIANT_BILLBOARD]: "giant billboard", [rf.HAWKER_TRUCK]: "hawker truck" }
const employeeName = (emp) => rf.employeeName(emp)

// --- individual moves -------------------------------------------------------

function tutorPlaceRestaurant() {
	const possible = rules.givePossibleStartingRestaurantsPosition(0)
	if (possible.length === 0) return null
	model.addRestaurant(TUTOR_INDEX, possible[possible.length - 1], 0, true)
	return "Puts their restaurant on empty squares with the entrance against a road. That is the whole placement rule - everything else on the board comes later."
}

function tutorChooseReserveCard() {
	useModelStore().reserveCards[TUTOR_INDEX] = 3
	return "Puts a reserve card face down by the bank. Its money only goes into the bank when the bank breaks, and it sets how many cards every CEO gets - but the holder earns nothing."
}

function tutorRestructure() {
	controller.autoFillEmployees()
	const working = useModelStore().players[TUTOR_INDEX].employees.filter((e) => e !== rf.BLANK_EMPLOYEE_SPACE)
	return `Puts everyone to work: ${working.map(employeeName).join(", ") || "nobody yet"}. Anyone left on the beach is doing nothing at all, so they get moved into the structure.`
}

function tutorChooseTurnOrder() {
	const store = useModelStore()
	// Take the LAST free slot, so the player is first in the working day. If the tutor
	// grabbed slot 1 they would play their whole day before the player had done
	// anything, and every "now it's your turn" step would be out of order.
	let pos = -1
	for (let i = 0; i < store.gameflow.newTurnOrder.length; i++) if (store.gameflow.newTurnOrder[i] === -1) pos = i
	if (pos === -1) return null
	controller.chooseTurnOrderPosition(pos)
	return `Takes the last slot, ${pos + 1}, so you go first. Turn order is re-picked every turn - the player with the most open slots chooses first.`
}

function tutorHire() {
	const store = useModelStore()
	const hired = []
	while (rules.getRemainingRecruitingPoints(TUTOR_INDEX) > 0) {
		const forbidden = rules.forbiddenEmployeesDuringHire(TUTOR_INDEX, store.context.justHired)
		const next = HIRE_PLAN.find((emp) => store.availableEmployees[emp] > 0 && !forbidden.includes(emp) && !hired.includes(emp))
		if (next === undefined) break
		controller.hireEmployee(next)
		hired.push(next)
	}
	if (hired.length === 0) return "Has no recruitment actions left, so they hire nobody."
	if (hired.length === 1) return `Recruits a ${employeeName(hired[0])}. Note it lands on the beach, not at work - new hires only start working after the next restructuring.`
	return `Recruits ${hired.map(employeeName).join(" and ")}. Both land on the beach and wait for the next restructuring phase.`
}

function tutorTrain() {
	const store = useModelStore()
	const notes = []
	while (notes.length < 4) {
		const train = rules.getTrainingPoints(TUTOR_INDEX, store.context.justTrained)
		if (train.total <= 0) break
		let moved = false
		const trainedTo = store.context.justTrained.map((t) => t.to)
		// Safe to walk the live beach: controller.trainEmployee splices from it, but
		// we break out of the loop on the very next line.
		for (const from of store.players[TUTOR_INDEX].beach) {
			const levels = rules.possibleUpgrades(store.availableEmployees, TUTOR_INDEX, from, train.total, train.level2, train.level3, train.unlimited, trainedTo, false)
			const to = levels[0] && levels[0][0]
			if (to === undefined) continue
			store.context.selectedEmployeeToTrainData.employee = from
			store.context.selectedEmployeeToTrainData.origin = 0 // 0 = from the beach
			controller.trainEmployee(to, 1)
			notes.push(`${employeeName(from)} into ${employeeName(to)}`)
			moved = true
			break
		}
		if (!moved) break
	}
	if (notes.length === 0) return null
	return `Trains ${notes.join(", ")}. Each training action turns one beach card one step, and only cards printed on the beach can be trained.`
}

function tutorMarket() {
	const store = useModelStore()
	const marketer = store.players[TUTOR_INDEX].employees.find((emp) => rf.MARKETERS.includes(emp) && emp !== rf.MASS_MARKETEER)
	if (marketer === undefined) return null
	controller.selectMarketer(marketer, false)
	const campaign = store.context.campaign
	const possible = rules.givePossiblePositionsForMarketingCampaign(marketer, campaign, false)
	if (possible.length === 0) return null
	controller.chooseGood(rf.PIZZA)
	controller.placeMarketingCampaign(possible[possible.length - 1])
	return `Sends the ${employeeName(marketer)} out with a ${CAMPAIGN_TYPE_NAMES[rf.MARKETING_CAMPAIGNS[campaign].type]} advertising pizza. It sells nothing itself - in Phase 6 it drops demand tokens on the houses it reaches.`
}

function tutorProduce() {
	const store = useModelStore()
	const producer = store.players[TUTOR_INDEX].employees.find((emp) => rf.PRODUCERS.includes(emp))
	if (producer === undefined) return null

	controller.clickedProducer(producer)

	// Driving producers need a route picked one square at a time
	if ([rf.CART_OPERATOR, rf.TRUCK_DRIVER].includes(producer)) {
		let steps = 0
		while (store.context.producer === producer && store.highlights.indexesToHighlightYellow.length > 0 && steps < 12) {
			controller.selectNextPosition(store.highlights.indexesToHighlightYellow[0])
			steps++
		}
		if (store.context.producer === producer) controller.stopCollecting()
		return `Drives out with the ${employeeName(producer)} and lifts every drink symbol beside the road within range. The cart reaches two tiles and takes two drinks per symbol.`
	}

	const choices = rules.givePossibleFoodDrinksChoice(producer)
	if (choices.length === 0) return null
	const good = choices[choices.length - 1]
	controller.addProducedItemToPlayer(good)
	return `Takes a ${GOOD_NAMES[good] || "good"} from the general stock with the ${employeeName(producer)}. It sits in front of them for every restaurant in their chain - it is not on the board.`
}

function tutorBuild() {
	const store = useModelStore()
	const gardens = rules.givePossibleHousesForGarden()
	if (gardens.length > 0) {
		const house = gardens[gardens.length - 1]
		controller.selectGardenToBuild()
		controller.clickedHouseSquare(map.findIndexForHouse(house))
		// Houses with more than one free edge need a second click to pick the side
		if (store.context.edges.length > 0) controller.clickedHouseSquare(store.highlights.indexesToHighlightYellow[0])
		return `Puts a garden on house ${house}. It has to touch that house along two squares, and a house with a garden earns double the unit price.`
	}
	const houses = rules.availableHouses()
	const possible = rules.givePossiblePositionsForBlock(2, 3)
	if (houses.length === 0 || possible.length === 0) return null
	const house = houses[houses.length - 1]
	controller.selectHouseToBuild(house)
	controller.clickedHouseSquare(possible[possible.length - 1])
	return `Builds house ${house}. It must be connected to a road, but there is no range limit - and it comes with its own garden already attached.`
}

// --- dispatcher -------------------------------------------------------------

export async function playTutorSubphase() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.haltPlay) return ""
	if (store.gameflow.turnOrder[0] !== TUTOR_INDEX) return ""

	const phase = store.gameflow.phase
	const subphase = store.gameflow.subphase
	let said = null

	if (phase === rf.PHASE_SETUP_RESTAURANT1 || phase === rf.PHASE_SETUP_RESTAURANT2) {
		said = tutorPlaceRestaurant()
		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_SETUP_RESERVE) {
		said = tutorChooseReserveCard()
		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_RESTRUCTURING) {
		said = tutorRestructure()
		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_TURN_ORDER) {
		said = tutorChooseTurnOrder()
		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_WORKING_DAY) {
		if (subphase === rf.SUBPHASE_HIRING) said = tutorHire()
		else if (subphase === rf.SUBPHASE_TRAINING) said = tutorTrain()
		else if (subphase === rf.SUBPHASE_MARKETING) said = tutorMarket()
		else if (subphase === rf.SUBPHASE_PRODUCE) said = tutorProduce()
		else if (subphase === rf.SUBPHASE_HOUSES) said = tutorBuild()
		// NB SUBPHASE_CONFIRM_END_TURN has to end the TURN, not just the subphase -
		// otherwise the tutor sits on the turn order forever and the game stalls.
		else if (subphase === rf.SUBPHASE_CONFIRM_END_TURN) {
			said = "Done for the day - hands the turn back to you."
			await controller.endPlayerTurn(true, false)
			return said
		}
		controller.endWorkingDaySubphase()
	} else if (phase === rf.PHASE_PAYDAY) {
		said = "Puts their hand in their pocket and pays every employee who demands a salary."
		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_CLEAN_UP) {
		said = "Takes stock of the fridge and bins whatever will not fit through the week."
		await controller.endPlayerTurn(true, false)
	}

	// The remaining phases (Dinnertime, marketing campaign resolution, Pizza Bomb,
	// Coffee milestone) have nothing for the tutor to do - the game resolves them itself.
	return said || ""
}