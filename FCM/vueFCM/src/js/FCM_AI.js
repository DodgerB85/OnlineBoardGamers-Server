import * as rf from "./FCMreference"
import * as model from "./FCMmodel"
import * as map from "./FCMmap"
import * as funcs from "./FCMfuncs"
import * as rules from "./FCMrules"
import * as context from "./FCMcontext"
import * as controller from "./FCMcontroller"
import * as plyr from "./FCMplayer"
import { useModelStore } from "../stores/FCMstore.js"

export async function makeAImove() {
	const store = useModelStore()
	context.resetContext()

	if (store.gameflow.turn > 40) store.bank -= 100
	let phase = store.gameflow.phase
	let subphase = store.gameflow.subphase
	let playerIndex = store.gameflow.turnOrder[0]
	let playerObj = store.players[playerIndex]
	playerObj.AIlevel = 1

	console.log(`making AI move: phase -  ${phase}, subphase - ${subphase}, playerIndex = ${playerIndex}`)

	if (phase === rf.PHASE_SETUP_RESTAURANT1) {
		let rotation = Math.floor(Math.random() * 4)
		let possibleSqs = rules.givePossibleStartingRestaurantsPosition(rotation)
		let index = possibleSqs[Math.floor(Math.random() * possibleSqs.length)]
		model.addRestaurant_core(playerIndex, index, rotation, true)
		if (rotation !== 3) model.addHistory(rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION, [funcs.exportIndex(index), rotation], controller.currentPlayerIndex(), 0)
		else model.addHistory(rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION, [funcs.exportIndex(index)], controller.currentPlayerIndex(), 0)

		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_SETUP_RESERVE) {
		store.reserveCards[playerIndex] = 3
		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_RESTRUCTURING) {
		rf.sortEmployees(playerObj.beach)
		if (playerObj.AIlevel === 0) {
			for (let i = 0; i < playerObj.ceoSlots; i++) {
				if (playerObj.employees[i] === rf.BLANK_EMPLOYEE_SPACE && playerObj.beach.length > 0) plyr.setEmployeeInIndex(playerIndex, playerObj.beach[0], i)
			}
		} else if (playerObj.AIlevel === 1) {
			for (let i = 0; i < playerObj.ceoSlots; i++) {
				if (playerObj.employees[i] === rf.BLANK_EMPLOYEE_SPACE && playerObj.beach.length > 0) {
					for (let j = 0; j < playerObj.beach.length; j++) {
						if (playerObj.beach[j] !== rf.JUNIOR_VICE_PRESIDENT) {
							plyr.setEmployeeInIndex(playerIndex, playerObj.beach[j], i)
							break
						}
					}
				}
			}
		}
		let slots1 = playerObj.ceoSlots
		let slots2 = 0
		for (let i = 0; i < slots1; i++) if (playerObj.employees[i] !== rf.BLANK_EMPLOYEE_SPACE) slots2 += rules.getSubSlotsForEmployee(playerObj.employees[i])

		if (playerObj.employees.length < slots1 + slots2) {
			while (playerObj.employees.length < slots1 + slots2) {
				playerObj.employees.push(rf.BLANK_EMPLOYEE_SPACE)
			}
		}

		let offset = playerObj.ceoSlots
		for (let i = 0 + offset; i < slots2 + offset; i++) {
			playerObj.beach = funcs.shuffle(playerObj.beach)
			if (playerObj.AIlevel === 1) {
				if (playerObj.beach.includes(rf.PIZZA_CHEF)) {
					let index = playerObj.beach.indexOf(rf.PIZZA_CHEF)
					playerObj.beach.splice(index, 1)
					playerObj.beach.unshift(rf.PIZZA_CHEF)
				} else if (playerObj.beach.includes(rf.COACH)) {
					let index = playerObj.beach.indexOf(rf.COACH)
					playerObj.beach.splice(index, 1)
					playerObj.beach.unshift(rf.COACH)
				}
			}
			for (let j = 0; j < playerObj.beach.length; j++) {
				if (!rf.MANAGERS.includes(playerObj.beach[j])) {
					if (playerObj.employees[i] === rf.BLANK_EMPLOYEE_SPACE && playerObj.beach.length > 0) plyr.setEmployeeInIndex(playerIndex, playerObj.beach[j], i)
					break
				}
			}
		}
		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_TURN_ORDER) {
		let pos = 0
		for (let i = 0; i < store.gameflow.newTurnOrder.length; i++) {
			if (store.gameflow.newTurnOrder[i] === -1) {
				pos = i
				break
			}
		}

		store.gameflow.newTurnOrder[pos] = playerIndex

		model.addHistory(rf.HIST_CHOOSE_TURN_ORDER, [pos], playerIndex, 0)

		await controller.endPlayerTurn(true, false)
	} else if (phase === rf.PHASE_WORKING_DAY) {
		if (subphase === rf.SUBPHASE_HIRING) {
			actionHires(playerIndex)
			await controller.endWorkingDaySubphase()
			await makeAImove()
		} else if (subphase === rf.SUBPHASE_TRAINING) {
			const train = rules.getTrainingPoints(playerIndex, store.context.justTrained)
			const recruitPoints = rules.getRemainingRecruitingPoints(playerIndex)

			const trainedTo = store.context.justTrained.map((t) => t.to)

			const hasUpgrades = playerObj.beach.some((emp) => rules.possibleUpgrades(store.availableEmployees, playerIndex, emp, train.total, train.level2, train.level3, train.unlimited, trainedTo).flat().length > 0)

			if (hasUpgrades || recruitPoints > 0) {
				while (train.total > 0) {
					let possibleBeach = playerObj.beach.filter((emp) => {
						const upgrades = rules.possibleUpgrades(store.availableEmployees, playerIndex, emp, train.total, train.level2, train.level3, train.unlimited, trainedTo).flat()
						return upgrades.length > 0
					})

					if (playerObj.AIlevel === 1) {
						possibleBeach = possibleBeach.filter((emp) => emp !== rf.ERRAND_BOY)
					}

					if (possibleBeach.length === 0) break

					let chosenBeach
					if (playerObj.AIlevel === 1) {
						possibleBeach.sort(() => Math.random() - 0.5)

						chosenBeach = possibleBeach.find((emp) => !rf.HIREABLE_EMPLOYEES.includes(emp)) || possibleBeach[0]

						if (rf.HIREABLE_EMPLOYEES.includes(chosenBeach) && rules.salary(playerIndex) > 20) chosenBeach = null
						if (store.gameflow.turn === 3) chosenBeach = rf.MANAGEMENT_TRAINEE
						if (store.gameflow.turn === 4) chosenBeach = rf.JUNIOR_VICE_PRESIDENT
						if (store.gameflow.turn === 5) chosenBeach = rf.KITCHEN_TRAINEE
					} else {
						chosenBeach = possibleBeach[Math.floor(Math.random() * possibleBeach.length)]
					}

					let steps = 0
					if (chosenBeach) {
						const possibleTo = rules.possibleUpgrades(store.availableEmployees, playerIndex, chosenBeach, train.total, train.level2, train.level3, train.unlimited, trainedTo, false)
						const possibleToFlat = possibleTo.flat()

						if (possibleToFlat.length === 0) {
							train.total -= 1
							continue
						}

						let chosenTo = possibleToFlat[Math.floor(Math.random() * possibleToFlat.length)]

						if (playerObj.AIlevel === 1) {
							if (store.gameflow.turn === 3) chosenTo = rf.JUNIOR_VICE_PRESIDENT
							else if (store.gameflow.turn === 4) chosenTo = rf.COACH
							else if (possibleToFlat.includes(rf.PIZZA_CHEF)) {
								chosenTo = rf.PIZZA_CHEF
								if (chosenBeach !== rf.KITCHEN_TRAINEE) {
									const kitchenIdx = playerObj.beach.indexOf(rf.KITCHEN_TRAINEE)
									if (kitchenIdx !== -1) chosenBeach = rf.KITCHEN_TRAINEE
								}
							} else {
								const highestTier = possibleTo.filter((tier) => tier.length > 0).pop()
								if (highestTier) chosenTo = highestTier[Math.floor(Math.random() * highestTier.length)]
							}
						}

						steps = possibleTo.findIndex((tier) => tier.includes(chosenTo)) + 1

						store.context.justTrained.push({
							from: chosenBeach,
							to: chosenTo,
							spent: steps,
							fromStructure: false,
						})

						const beachIdx = playerObj.beach.indexOf(chosenBeach)
						if (beachIdx > -1) {
							playerObj.beach.splice(beachIdx, 1)
							store.availableEmployees[chosenBeach]++
							store.availableEmployees[chosenTo]--
						}
					}

					train.total -= steps || 1
				}
			}

			await controller.endWorkingDaySubphase()
			await makeAImove()
		}

		else if (subphase === rf.SUBPHASE_COFFEE_SHOPS_FROM_TRAIN) {
			while (
				playerObj.coffeeShops.length < 3 &&
				store.context.baristaCoffeeShops + store.context.leadBaristaCoffeeShopsFromB + store.context.leadBaristaCoffeeShopsFromTB > 0
			) {
				const unlimited = store.context.leadBaristaCoffeeShopsFromB > 0 || (store.context.justCoffeeShopped.length === 1 && store.context.leadBaristaCoffeeShopsFromTB > 0)
				const indexes = rules.givePossiblePositionsForCoffeeShop(unlimited ? 99 : 2)
				if (indexes.length === 0) break
				controller.placeCoffeeShop(indexes[Math.floor(Math.random() * indexes.length)])
			}

			await controller.endWorkingDaySubphase()
			await makeAImove()
		}

		else if (subphase === rf.SUBPHASE_MARKETING) {
			plyr.sendMassMarketeers(playerIndex)

			const possibleMarketers = playerObj.employees.filter((emp) => rf.MARKETERS.includes(emp))

			for (const marketer of possibleMarketers) {
				const campaigns = rules.possibleMarketingCampaigns(store.availableMarketingCampaigns, marketer)
				if (campaigns.length === 0) continue

				const campaign = campaigns[0]
				const campaignData = rf.MARKETING_CAMPAIGNS[campaign]

				let good = rf.PIZZA
				if (playerObj.AIlevel === 1) {
					const avail = store.availableMilestones
					if (avail.includes(rf.FIRST_PIZZA_MARKETED)) good = rf.PIZZA
					else if (avail.includes(rf.FIRST_BURGER_MARKETED)) good = rf.BURGER
					else if (avail.includes(rf.FIRST_DRINK_MARKETED)) good = rf.LEMONADE
					else if (plyr.hasMilestone(playerIndex, rf.FIRST_PIZZA_MARKETED)) good = rf.PIZZA
					else if (plyr.hasMilestone(playerIndex, rf.FIRST_BURGER_MARKETED)) good = rf.BURGER
				}

				const hasBillboardMS = plyr.hasMilestone(playerIndex, rf.FIRST_BILLBOARD) || store.availableMilestones.includes(rf.FIRST_BILLBOARD)
				const isInfinite = (hasBillboardMS && campaignData.type === rf.BILLBOARD) || (plyr.hasMilestone(playerIndex, rf.FIRST_BRAND_DIRECTOR_USED) && campaignData.type === rf.RADIO) || campaignData.type === rf.GIANT_BILLBOARD

				const duration = isInfinite ? 9 : 1

				const rotatable = campaignData.width !== campaignData.height && campaignData.type !== rf.GIANT_BILLBOARD
				let rotated = rotatable && Math.random() < 0.5

				let possibleSqs = rules.givePossiblePositionsForMarketingCampaign(marketer, campaign, rotated)
				let index = possibleSqs[Math.floor(Math.random() * possibleSqs.length)]

				if (playerObj.AIlevel === 1) {
					outer: for (let rotVal = 0; rotVal <= 1; rotVal++) {
						const isRot = rotVal === 1
						const trialSqs = rules.givePossiblePositionsForMarketingCampaign(marketer, campaign, isRot)

						for (const sq of trialSqs) {
							const footprint = isRot ? [sq, sq + rf.ssW] : [sq, sq + 1]

							const nearHouse = map.neighbours(footprint).some((nIdx) => rf.HOUSE_SQS.includes(store.mapData.coords[nIdx]))

							if (nearHouse) {
								index = sq
								rotated = isRot
								break outer
							}
						}
					}
				}

				plyr.sendPlayerMarketerToMarket(playerIndex, marketer, campaign, false, false)
				store.context.justMarketed.push(campaign)
				model.addMarketingCampaign(campaign, index, rotated, good, duration)

				const histObj = [campaign, funcs.exportIndex(index), good]
				if (campaign >= 4 && campaign <= 16) histObj.push(marketer)
				if (rf.ROTATABLE_CAMPAIGNS.includes(campaign)) histObj.push(funcs.booleanToInt(rotated))
				if (duration < 9) histObj.push(duration)

				model.addHistory(rf.HIST_START_MARKETING_CAMPAIGN, histObj, controller.currentPlayerIndex(), 0)

				const typeMap = { [rf.BILLBOARD]: rf.FIRST_BILLBOARD, [rf.AIRPLANE]: rf.FIRST_AIRPLANE_CAMPAIGN, [rf.RADIO]: rf.FIRST_RADIO_CAMPAIGN }
				if (typeMap[campaignData.type]) plyr.awardMilestone(playerIndex, typeMap[campaignData.type])

				const goodMap = { [rf.BURGER]: rf.FIRST_BURGER_MARKETED, [rf.PIZZA]: rf.FIRST_PIZZA_MARKETED }
				plyr.awardMilestone(playerIndex, goodMap[good] || rf.FIRST_DRINK_MARKETED)
			}

			await controller.endWorkingDaySubphase()
			await makeAImove()
		} else if (subphase === rf.SUBPHASE_PRODUCE) {
			const producers = playerObj.employees.filter((emp) => rf.PRODUCERS.includes(emp))

			const productionMap = {
				[rf.BARISTA_TRAINEE]: [1, rf.COFFEE],
				[rf.BARISTA]: [2, rf.COFFEE],
				[rf.LEAD_BARISTA]: [5, rf.COFFEE],
				[rf.BURGER_COOK]: [3, rf.BURGER],
				[rf.BURGER_CHEF]: [8, rf.BURGER],
				[rf.PIZZA_COOK]: [3, rf.PIZZA],
				[rf.PIZZA_CHEF]: [8, rf.PIZZA],
				[rf.SUSHI_COOK]: [2, rf.SUSHI],
				[rf.SUSHI_CHEF]: [5, rf.SUSHI],
				[rf.NOODLE_COOK]: [6, rf.NOODLES],
				[rf.NOODLE_CHEF]: [16, rf.NOODLES],
				[rf.ERRAND_BOY]: [1, rf.LEMONADE],
				[rf.KITCHEN_TRAINEE]: [1, null],
			}

			for (const producer of producers) {
				const possibleOptions = rules.givePossibleFoodDrinksChoice(producer)
				if (possibleOptions.length === 0) continue

				let [number, good] = productionMap[producer] || [0, null]

				if (producer === rf.KITCHEN_TRAINEE || (producer === rf.ERRAND_BOY && good === null)) {
					good = rf.BURGER

					if (playerObj.AIlevel === 1) {
						const demandCounts = {}
						store.needs.forEach((need) => {
							need.needs.flat().forEach((item) => {
								const product = item[0]
								demandCounts[product] = (demandCounts[product] || 0) + 1
							})
						})

						if (demandCounts[rf.PIZZA] > 0) good = rf.PIZZA
					}

					if (producer === rf.ERRAND_BOY) good = rf.LEMONADE
				}

				if (good !== null) {
					store.context.justProduced.team.push(producer)
					store.context.justProduced.added[good] += number

					const isDrink = rf.DRINK.includes(good)
					if (isDrink && plyr.hasMilestone(playerIndex, rf.FIRST_ERRAND_BOY)) {
						store.context.justProduced.added[good]++
						plyr.addResources(playerIndex, good, 1)
					}

					for (let j = 0; j < number; j++) {
						plyr.addResources(playerIndex, good, 1)
					}
				}
			}

			await controller.endWorkingDaySubphase()
			await makeAImove()
		}

		else if (subphase === rf.SUBPHASE_HOUSES) {
			const possibleGardenHouses = rules.givePossibleHousesForGarden()

			if (possibleGardenHouses.length > 0) {
				const indexes = possibleGardenHouses.map((h) => map.findIndexForHouse(h))
				const chosenIndex = indexes[Math.floor(Math.random() * indexes.length)]

				const houseValue = store.mapData.coords[chosenIndex] - rf.HOUSE
				const edges = map.findFreeEdgesForHouse(houseValue)

				const chosenEdge = edges[0]
				const isRotated = chosenEdge % 2 === 1

				model.addGarden(chosenIndex, isRotated, houseValue)
				store.context.justBuilt.push(chosenIndex)

				const histData = [funcs.exportIndex(chosenIndex), houseValue]
				if (!isRotated) histData.push(0)

				model.addHistory(rf.HIST_BUILD_GARDEN, histData, controller.currentPlayerIndex(), isRotated ? 0 : 1)
			}

			else {
				const houses = rules.availableHouses()
				if (houses.length > 0) {
					const selectedBuilding = houses[Math.floor(Math.random() * houses.length)]
					const rotation = Math.floor(Math.random() * 2)
					const isRotated = rotation === 1

					const w = isRotated ? 3 : 2
					const h = isRotated ? 2 : 3

					const possiblePos = rules.givePossiblePositionsForBlock(w, h)

					if (possiblePos.length > 0) {
						const chosenIndex = possiblePos[Math.floor(Math.random() * possiblePos.length)]

						model.addHouse(selectedBuilding, chosenIndex, isRotated)
						plyr.awardMilestone(playerIndex, rf.FIRST_HOUSE_BUILT)
						store.context.justBuilt.push(chosenIndex)

						const histData = [funcs.exportIndex(chosenIndex), selectedBuilding]
						if (!isRotated) histData.push(0)

						model.addHistory(rf.HIST_BUILD_HOUSE, histData, controller.currentPlayerIndex(), 0)
					}
				}
			}

			await controller.endWorkingDaySubphase()
			await makeAImove()
		}

		else if (subphase === rf.SUBPHASE_NEW_RESTAURANTS) {
			const managers = playerObj.employees.filter((emp) => rf.CAN_BUILD_RESTAURANT.includes(emp))

			for (const manager of managers) {
				if (playerObj.restaurants.length >= 3) break

				const rotation = Math.floor(Math.random() * 4)
				const isRegionalManager = manager !== rf.LOCAL_MANAGER

				const indexes = rules.givePossiblePositionsForNewRestaurant(rotation, !isRegionalManager)

				if (indexes.length > 0) {
					const chosenIndex = indexes[Math.floor(Math.random() * indexes.length)]

					model.addRestaurant_core(playerIndex, chosenIndex, rotation, isRegionalManager)
					store.context.justOpened.push(manager)

					const isLocal = funcs.booleanToInt(!isRegionalManager)
					const histData = [funcs.exportIndex(chosenIndex), isLocal]
					if (rotation !== 3) histData.push(rotation)

					model.addHistory(rf.HIST_OPEN_RESTAURANT, histData, controller.currentPlayerIndex(), 0)
				}
			}

			await controller.endWorkingDaySubphase()
			await makeAImove()
		} else if (subphase === rf.SUBPHASE_CONFIRM_END_TURN) await controller.endPlayerTurn(true, false)

	} else if (phase === rf.PHASE_PIZZA_BOMB) {
		while (store.firstPizzas.length >= 3 && store.firstPizzas[2] === playerIndex) {
			const spaces = rules.givePossiblePositionsForRadioPizzaBomb(store.firstPizzas[1]).filter((value) => map.adjacentToRoad(value))
			if (spaces.length > 0) controller.choosePizzaBombMarketer(spaces[0])
			else controller.skipPizzaBombMarketer()
		}

	} else if (phase === rf.PHASE_COFFE_SHOP_MS) {
		if (playerObj.coffeeShops.length < 3) {
			const spaces = rules.givePossiblePositionsForCoffeeShop(99)
			if (spaces.length > 0) controller.placeCoffeeShopMS(spaces[Math.floor(Math.random() * spaces.length)])
		}
		await controller.endPlayerTurn(false, false)
	} else if (phase === rf.PHASE_PAYDAY) {
		let emergnecyCheck = 0
		while (rules.salary(playerIndex) > playerObj.money && emergnecyCheck <= 50) {
			let fireOptions = rules.fireableEmployees(playerIndex)
			if (playerObj.AIlevel === 0) {
				for (let i = 0; i < fireOptions.length; i++) {
					let employee = fireOptions[i]
					if (rf.REQUIRE_SALARY.includes(employee)) {
						plyr.fireEmployee(playerIndex, employee)

						store.context.justFired.push(employee)
						break
					}
				}
			} else if (playerObj.AIlevel === 1) {
				for (let i = 0; i < fireOptions.length; i++) {
					let employee = fireOptions[i]
					if (rf.REQUIRE_SALARY.includes(employee) && !rf.MANAGERS.includes(employee)) {
						plyr.fireEmployee(playerIndex, employee)

						store.context.justFired.push(employee)
						break
					}
				}
				emergnecyCheck++
			}
		}
		emergnecyCheck = 0
		while (rules.salary(playerIndex) > playerObj.money && emergnecyCheck <= 50) {
			let fireOptions = rules.fireableEmployees(playerIndex)
			if (playerObj.AIlevel === 1) {
				for (let i = 0; i < fireOptions.length; i++) {
					let employee = fireOptions[i]
					if (rf.REQUIRE_SALARY.includes(employee)) {
						plyr.fireEmployee(playerIndex, employee)
						store.context.justFired.push(employee)
						break
					}
				}
				emergnecyCheck++
			}
		}
		for (let i = playerObj.marketers.length - 1; i >= 0; i--) {
			let employee = playerObj.marketers[i].marketer
			if (rf.REQUIRE_SALARY.includes(employee)) {
				playerObj.marketers.splice(i, 1)
				store.context.justFired.push(employee)
				if (rules.salary(playerIndex) <= playerObj.money) break
			}
		}

		await controller.endPlayerTurn(true, false)
	}
	else if (phase === rf.PHASE_CLEAN_UP) {
		if (!plyr.hasFridge(playerIndex)) await controller.endPlayerTurn(true, false)
		else if (playerObj.resources.length <= 10) {
			await controller.endPlayerTurn()
		} else {
			while (playerObj.resources.length > 10) {
				plyr.removeResourcesFromPlayer(playerIndex, playerObj.resources[0], 1)
			}
			await controller.endPlayerTurn(true, false)
		}
	}
}

export function actionHires(playerIndex) {
    const store = useModelStore();
    const playerObj = store.players[playerIndex];
    let totalHires = rules.getRemainingRecruitingPoints(playerIndex);
    const disallowed = rules.forbiddenEmployeesDuringHire(playerIndex, store.context.justHired);

    if (playerObj.AIlevel >= 1) {
        const turn = store.gameflow.turn;
        const script = {
            1: [rf.RECRUITING_GIRL],
            2: [rf.RECRUITING_GIRL, rf.TRAINER],
            3: [rf.MANAGEMENT_TRAINEE, rf.MARKETING_TRAINEE, rf.ERRAND_BOY],
            5: [rf.KITCHEN_TRAINEE]
        };

        const scriptedActions = script[turn] || [];
        for (const emp of scriptedActions) {
            if (totalHires > 0) {
                actionAIhire(playerIndex, emp);
                totalHires--;
            }
        }
    }

    while (totalHires > 0) {
        let possibleHires = rf.HIREABLE_EMPLOYEES.filter(emp => 
            store.availableEmployees[emp] > 0 && !disallowed.includes(emp)
        );

        if (possibleHires.length === 0) break;

        if (playerObj.AIlevel >= 1) {
            possibleHires = possibleHires.filter(emp => emp !== rf.RECRUITING_GIRL);
            
            if (possibleHires.length === 0) break;

            const chosen = possibleHires[Math.floor(Math.random() * possibleHires.length)];
            
            const existingCount = playerObj.beach.filter(e => e === chosen).length;
            
            if (existingCount <= 1) {
                actionAIhire(playerIndex, chosen);
            }
        } else {
            const chosen = possibleHires[Math.floor(Math.random() * possibleHires.length)];
            actionAIhire(playerIndex, chosen);
        }
        
        totalHires--;
    }

    if (playerObj.employees.includes(rf.RECRUITING_GIRL)) {
        plyr.awardMilestone(playerIndex, rf.FIRST_RECRUITING_GIRL_USED);
    }
}


export function actionAIhire(playerIndex, employee) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	playerObj.beach.push(employee)
	store.availableEmployees[employee]--
	store.context.justHired.push(employee)
}
