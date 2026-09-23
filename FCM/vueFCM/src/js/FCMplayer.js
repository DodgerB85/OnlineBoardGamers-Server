import { useModelStore } from "../stores/FCMstore.js"

import * as rf from "./FCMreference"
import * as rules from "./FCMrules"
import * as controller from "./FCMcontroller.js"
import * as model from "./FCMmodel.js"

export function addRestaurantToPlayer(playerIndex, index, rotation, open) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	playerObj.restaurants.push({
		index: index,
		rotation: rotation,
		open: open,
	})
}

export function giveNbFreeSlots(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	// Use reduce to calculate slots in a single pass
	return playerObj.employees.reduce((total, employee) => {
		if (employee === rf.BLANK_EMPLOYEE_SPACE) return total

		// Subtract 1 for the employee themselves, add their hierarchy bonus
		return total - 1 + rules.getSubSlotsForEmployee(employee)
	}, playerObj.ceoSlots)
}

export function fireEmployee(playerIndex, employee) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	// 1. Check Beach
	const beachIndex = playerObj.beach.indexOf(employee)
	if (beachIndex > -1) {
		playerObj.beach.splice(beachIndex, 1)
		return
	}

	// 2. Check Hierarchy/Employees
	const empIndex = playerObj.employees.indexOf(employee)
	if (empIndex > -1) {
		playerObj.employees.splice(empIndex, 1)
		return
	}

	// 3. Check Marketers
	const marketerIndex = playerObj.marketers.findIndex((m) => m.marketer === employee)
	if (marketerIndex > -1) {
		playerObj.marketers.splice(marketerIndex, 1)
	}
}

///////////////////////////////
export function hasEmployee(playerIndex, employee) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	// Use .includes for simple string arrays and .some for object arrays
	return playerObj.beach.includes(employee) || playerObj.employees.includes(employee) || playerObj.marketers.some((m) => m.marketer === employee)
}

export function playerHasEmployeeAtWork(playerIndex, employee) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (playerObj.employees.indexOf(employee) > -1) return true

	return false
}

// MOVE TO GENERAL CEAR FOR NEW
export function clearForNewTurn(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	// 1. Clean up hierarchy: Remove blanks and move everyone to the beach
	const activeEmployees = playerObj.employees.filter((e) => e !== rf.BLANK_EMPLOYEE_SPACE)
	playerObj.beach = [...activeEmployees, ...playerObj.beach]

	// 2. Reset employees array with the correct number of blank CEO slots
	const totalSlots = playerObj.ceoSlots
	playerObj.employees = Array(totalSlots).fill(rf.BLANK_EMPLOYEE_SPACE)

	// 3. Reset all restaurants to open
	playerObj.restaurants.forEach((resto) => {
		resto.open = true
	})
}

export function addToStructureFromMiniBeach(emp, anyFreeCEOslots, beachIdx) {
	if (rf.MANAGERS.includes(emp)) {
		if (!anyFreeCEOslots) return
		const idx = controller.currentPlayerObj().employees.indexOf(rf.BLANK_EMPLOYEE_SPACE)
		// Add to employees
		controller.currentPlayerObj().employees[idx] = emp
		// Remove from beach
		controller.currentPlayerObj().beach.splice(beachIdx, 1)

		const count = rules.getSubSlotsForEmployee(emp)
		const blanks = Array(count).fill(rf.BLANK_EMPLOYEE_SPACE)
		controller.currentPlayerObj().employees.push(...blanks)
	}
	if (!rf.MANAGERS.includes(emp)) {
		if (!controller.currentPlayerObj().employees.includes(rf.BLANK_EMPLOYEE_SPACE)) return
		// Find the first index after CEO slots that is rf.BLANK_EMPLOYEE_SPACE
		let foundIdx = controller.currentPlayerObj().employees.findIndex((emp, idx) => {
			return idx >= controller.currentPlayerObj().ceoSlots && emp === rf.BLANK_EMPLOYEE_SPACE
		})

		// If none available, just use the first slot
		if (foundIdx === -1) foundIdx = controller.currentPlayerObj().employees.indexOf(rf.BLANK_EMPLOYEE_SPACE)
		// Add to employees
		controller.currentPlayerObj().employees[foundIdx] = emp
		// Remove from beach
		controller.currentPlayerObj().beach.splice(beachIdx, 1)
	}
}

export function setEmployeeInIndex(playerIndex, emp, idx) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const returnee = playerObj.employees[idx]
	const employees = playerObj.employees
	// Recover existing employee
	if (employees[idx] !== rf.BLANK_EMPLOYEE_SPACE) {
		playerObj.beach.push(employees[idx])
		// Remove slots
		if (rf.MANAGERS.includes(returnee)) {
			const freeSlotsToRemove = rules.getSubSlotsForEmployee(returnee)
			let removedCount = 0
			
			// Start from the end and remove only if it's a BLANK_EMPLOYEE_SPACE
			for (let i = employees.length - 1; i >= 0 && removedCount < freeSlotsToRemove; i--) {
				if (employees[i] === rf.BLANK_EMPLOYEE_SPACE) {
					employees.splice(i, 1)
					removedCount++
				}
			}
		}
	}
	// Add empployee
	employees[idx] = emp
	if (rf.MANAGERS.includes(emp)) {
		const count = rules.getSubSlotsForEmployee(emp)
		const blanks = Array(count).fill(rf.BLANK_EMPLOYEE_SPACE)
		playerObj.employees.push(...blanks)
	}
	// Remove from beach
	const beachIdx = playerObj.beach.indexOf(emp)
	if (beachIdx > -1) {
		playerObj.beach.splice(beachIdx, 1)
	}
	store.context.selectedEmployeeIndexForRestructuring = -1
}

// TODO is this used?



export function hasMilestone(playerIndex, ms) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (!playerObj) return false
	return playerObj.milestones.indexOf(ms) > -1
}

export function hasFridge(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (!playerObj) return false
	if (playerObj.displayName === rf.BOT_NAME) return false
	return playerObj.milestones.indexOf(rf.FIRST_THROW_AWAY) > -1 || playerObj.milestones.indexOf(rf.FIRST_COKE_SOLD) > -1
}

export function addMilestone(playerIndex, ms) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (!playerObj) return
	playerObj.milestones.push(ms)
}

// REMOVE MARKETER FROM ORG AND PLACE IN ACTIVE MARKETING
export function sendPlayerMarketerToMarket(playerIndex, marketer, campaign, nightShift, nightShiftSwapped) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (playerObj.employees.indexOf(marketer) > -1 || nightShift || nightShiftSwapped) {
		if (!nightShift && !nightShiftSwapped) playerObj.employees.splice(playerObj.employees.indexOf(marketer), 1)
		playerObj.marketers.push({
			campaign: campaign,
			marketer: marketer,
			nightShift: nightShift,
		})
	}
}

export function sendMassMarketeers(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	// 1. Separate the Mass Marketeers from the rest of the employees
	const massMarketeers = playerObj.employees.filter((n) => n === rf.MASS_MARKETEER)

	// 2. Mutate the original array to remove them
	playerObj.employees = playerObj.employees.filter((n) => n !== rf.MASS_MARKETEER)

	// 3. Move them to the marketers array
	massMarketeers.forEach(() => {
		playerObj.marketers.push({
			campaign: -1,
			marketer: rf.MASS_MARKETEER,
		})
	})
}

export function recallMassMarketeers(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	for (let i = 0; i < playerObj.marketers.length; i++) {
		if (playerObj.marketers[i].campaign === -1) {
			playerObj.employees.push(rf.MASS_MARKETEER)
			playerObj.marketers.splice(i, 1) // NEED TO FIX FOR MULTIPLE MM ?????
			i--
			// This line fixes the additional campaign issue; keeps the index aligned with the extra campaign
			if (playerObj.additionalCampaignArrayIndex > -1) playerObj.additionalCampaignArrayIndex--
		}
	}
}


export function addCampaignToMarketer(playerIndex, marketer, campaign) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	playerObj.marketers.push({
		campaign: campaign,
		marketer: marketer,
	})
	if (playerObj.additionalCampaignArrayIndex === -1) playerObj.additionalCampaignArrayIndex = playerObj.marketers.length - 1
}

export function recallMarketeer(playerIndex, campaign) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	// 1. Find the marketer
	const marketerIndex = playerObj.marketers.findIndex((m) => m.campaign === campaign)

	if (marketerIndex > -1) {
		const marketer = playerObj.marketers[marketerIndex]

		// 2. Handle the "Additional Campaign" index tracking
		if (marketerIndex === playerObj.additionalCampaignArrayIndex) {
			playerObj.additionalCampaignArrayIndex = -1
		} else {
			if (playerObj.additionalCampaignArrayIndex > marketerIndex) {
				playerObj.additionalCampaignArrayIndex--
			}

			// 3. Move back to beach (unless it's a Night Shift marketer)
			if (!marketer.nightShift) {
				playerObj.beach.push(marketer.marketer)
			}
		}

		// 4. Handle Airplane special marketing cleanup
		const campaignData = rf.MARKETING_CAMPAIGNS[campaign]
		if (campaignData.type === rf.AIRPLANE && playerObj.additionalMarketedGood[0] === campaign) {
			playerObj.additionalMarketedGood.splice(0)
		}

		// 5. Remove the marketer
		playerObj.marketers.splice(marketerIndex, 1)
	}
}

export function addResources(playerIndex, resource, nb = 1) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	if (typeof resource === "number") {
		// Create an array of size 'nb' filled with 'resource' and push all at once
		playerObj.resources.push(...Array(nb).fill(resource))
	} else if (Array.isArray(resource)) {
		// If resource is already an array, push all elements at once
		playerObj.resources.push(...resource)
	}
}

export function removeResourcesFromPlayer(playerIndex, resource, nb = 1) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	// 1. Standardize input to an array of resources to remove
	const resourcesToRemove = typeof resource === "number" ? Array(nb).fill(resource) : resource

	// 2. Remove each requested resource one by one
	resourcesToRemove.forEach((res) => {
		const index = playerObj.resources.indexOf(res)
		if (index > -1) {
			playerObj.resources.splice(index, 1)
		}
	})
}

export function getCoffeeAmountForPlayer(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	return playerObj.resources.filter((r) => r === rf.COFFEE).length
}

export function playerHasResources(playerIndex, resource, nb = 1) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]

	if (!playerObj.resources.length) return false

	// Case 1: Checking for a single resource type (e.g., 3 Burgers)
	if (typeof resource === "number") {
		return playerObj.resources.filter((r) => r === resource).length >= nb
	}

	// Case 2: Checking for an array of resources (e.g., [Pizza, Burger, Beer])
	// Count player possessions once
	const possession = {}
	playerObj.resources.forEach((r) => {
		possession[r] = (possession[r] || 0) + 1
	})

	// Count required resources
	const need = {}
	resource.forEach((r) => {
		need[r] = (need[r] || 0) + 1
	})

	// Check if player has enough of every needed resource
	return Object.keys(need).every((type) => (possession[type] || 0) >= need[type])
}

export function playersPrice(playerIndex) {
	return rules.basePrice() - playerDiscount(playerIndex)
}

export function playerDiscount(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	let discount = 0
	if (playerObj.employees.length === 0) return 0 // TODO this was just blank?
	for (let i = 0; i < playerObj.employees.length; i++) {
		if (playerObj.employees[i] === rf.PRICING_MANAGER) {
			discount++
			if (playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER)) discount++
		}
		if (playerObj.employees[i] === rf.DISCOUNT_MANAGER) discount += 3
		if (playerObj.employees[i] === rf.LUXURIES_MANAGER) discount -= 10
	}
	if (hasMilestone(playerIndex, rf.FIRST_LOWER_PRICES)) discount++
	if (playerObj.ceoAction === rf.CEO_ACTION_PRICE_MINUS_3) discount += 3
	return discount
}

export function purePriceDropFromDiscountersForPlayer(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	let discount = 0
	if (playerObj.employees.length === 0) return 0 // TODO this was just blank?
	for (let i = 0; i < playerObj.employees.length; i++) {
		if (playerObj.employees[i] === rf.PRICING_MANAGER) {
			discount++
			if (playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER)) discount++
		}
		if (playerObj.employees[i] === rf.DISCOUNT_MANAGER) discount += 3
	}

	if (hasMilestone(playerIndex, rf.FIRST_LOWER_PRICES)) discount++
	return discount
}

export function playerBonus(playerIndex, goods) {
	let base = 0
	const drinks = [rf.BEER, rf.COKE, rf.LEMONADE]

	goods.forEach((good) => {
		if (good === rf.BURGER && hasMilestone(playerIndex, rf.FIRST_BURGER_MARKETED)) {
			base += 5
		} else if (good === rf.PIZZA && hasMilestone(playerIndex, rf.FIRST_PIZZA_MARKETED)) {
			base += 5
		} else if (drinks.includes(good) && hasMilestone(playerIndex, rf.FIRST_DRINK_MARKETED)) {
			base += 5
		}
	})

	return base
}

//NIGHT SHIFT add extra W's
// Just used to break dinner ties and payout W's
export function numberOfWaitress(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	let numWaitress = 0

	// Replay fix
	for (let i = 0; i < playerObj.employees.length; i++) if (playerObj.employees[i] === rf.WAITRESS) numWaitress++

	if (playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER)) numWaitress *= 2

	return numWaitress
}

export function numberOfMusicians(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	let numMusicians = 0

	for (let i = 0; i < playerObj.employees.length; i++) if (playerObj.employees[i] === rf.JAZZ_MUSICIAN) numMusicians++

	return numMusicians
}

export function doesPlayerHaveDriveIn(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	return playerObj.employees.indexOf(rf.LOCAL_MANAGER) > -1 || playerObj.employees.indexOf(rf.REGIONAL_MANAGER) > -1
}

export function awardMilestone(playerIndex, milestone, replayOnly) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (store.availableMilestones.indexOf(milestone) > -1 && !hasMilestone(playerIndex, milestone)) {
		addMilestone(playerIndex, milestone)

		if (!replayOnly) model.addHistory(rf.HIST_NEW_MILESTONE, [milestone], playerIndex, 0)

		if (milestone === rf.FIRST_HIRE_3) {
			model.giveEmployeeIfAvailable(playerIndex, rf.MANAGEMENT_TRAINEE)
			model.giveEmployeeIfAvailable(playerIndex, rf.MANAGEMENT_TRAINEE)
		} else if (milestone === rf.FIRST_BURGER_PRODUCED) {
			model.giveEmployeeIfAvailable(playerIndex, rf.BURGER_COOK)
		} else if (milestone === rf.FIRST_PIZZA_PRODUCED) {
			model.giveEmployeeIfAvailable(playerIndex, rf.PIZZA_COOK)
		} else if (milestone === rf.FIRST_RECRUITING_GIRL_USED) {
			playerObj.beach.push(rf.EXECUTIVE_VICE_PRESIDENT)
			if (store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT] > 0) {
				store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT]--
			}
			// Emergency check
			if (store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT] < 0) store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT] = 0
		} else if (milestone === rf.FIRST_TRAINER_USED) {
			model.giveEmployeeIfAvailable(playerIndex, rf.TRAINER)
		} else if (milestone === rf.FIRST_MARKETING_TRAINEE_USED) {
			model.giveEmployeeIfAvailable(playerIndex, rf.KITCHEN_TRAINEE)
			model.giveEmployeeIfAvailable(playerIndex, rf.ERRAND_BOY)
		}

		// FIRST_BURGER_SOLD: 4th CEO slot
		if (milestone === rf.FIRST_BURGER_SOLD) playerObj.ceoSlots = 4
	}
}
