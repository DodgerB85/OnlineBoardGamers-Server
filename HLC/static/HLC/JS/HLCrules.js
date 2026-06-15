/** 
	
	  @module Rules
	  isSimulOhase
	  canPlay
	  getNumberOfResearchPoints
	  getNumberOfPlanningOffices
	  getMinSpecsInOrder
	  isDealershipSuitableToDisplay
	  canSkipCurrentSellingPlayer
	  setCurrentMarketBoardPrices
	  playNeutralCards
	  playSingleNeutralCard
	  getAllowedTechOnOneTrack
	  getNativelyAllowedTechLevels
	  getAllowedTechLevels
	  getEligibleFactoryComponentNames
	  canResign
	  anyBotPlayers

 */
var Rules = (function () {
	var self = {}

	self.isSimulPhase = function () {
		if (M.trainingGame) return false
		if (M.gameFlow.turn === 0) return true
		else if (M.gameFlow.phase === PHASE_BUILD_FACTORY) return true
		return false
	}

	self.canPlay = function () {
		if (global.haltPlay === true) return false
		if (global.name === "BotKickStarter") {
			M.gameFlow.currentPlayer = global.pov
			return true
		}
		//return true;
		if (global.superuser) return true
		if (global.pov == undefined) return false
		if (global.pov < 0) return false
		if (M.trainingGame) return true

		if (!self.isSimulPhase()) {
			M.gameFlow.currentPlayer = M.gameFlow.turnOrder[0]
			if (global.pov === M.gameFlow.currentPlayer) return true
			return false
		}
		if (self.isSimulPhase()) {
			M.gameFlow.currentPlayer = global.pov
			// if you have a move, can't move
			if (M.gameFlow.turn === 0) {
				if (global.move != undefined && global.move.turn == M.gameFlow.turn && global.move.phase == M.gameFlow.phase) return false
				if (M.gameFlow.turnOrder.indexOf(global.pov) !== -1) return true
			} else {
				if (global.justMoved) return false
				if (global.move != undefined && global.move.turn == M.gameFlow.turn && global.move.phase == M.gameFlow.phase && !global.currentPlayers.indexOf(global.name) == 0) return false
				if (global.currentPlayers.indexOf(global.name) > -1) return true
			}
		}
		return false
	}

	self.getNumberOfResearchPoints = function (player) {
		if (global.debug) return 99
		var res = 0
		for (var i = 0; i < player.factory.factoryComponents.length; i++) {
			if (player.factory.factoryComponents[i][0] === DEPARTMENT_RESEARCH) res++
		}
		res -= M.piecesUsedInResearch.length
		return res
	}

	self.getNumberOfPlanningOffices = function (player) {
		var res = 0
		for (var i = 0; i < player.factory.factoryComponents.length; i++) {
			if (player.factory.factoryComponents[i][0] === DEPARTMENT_PLANNING) res++
		}
		return res
	}

	self.getMinSpecsInOrder = function () {
		var res = [0, 0, 0, 0, 0]
		for (var i = 0; i < M.techTracks.length; i++) {
			if (M.techTracks[i][7][0] === RED) res[RED] = M.techTracks[i][7][1]
			if (M.techTracks[i][7][0] === GREEN) res[GREEN] = M.techTracks[i][7][1]
			if (M.techTracks[i][7][0] === PURPLE) res[PURPLE] = M.techTracks[i][7][1]
			if (M.techTracks[i][7][0] === BLUE) res[BLUE] = M.techTracks[i][7][1]
			if (M.techTracks[i][7][0] === YELLOW) res[YELLOW] = M.techTracks[i][7][1]
		}

		return res
	}

	self.removeFCIATTcomponentsFromPlay = function (factory) {
		var expansionCollapsed = false
		for (var i = 0; i < factory.factoryComponenetIndexesAddedThisTurn.length; i++) {
			// find component in factory
			let index = _.findIndex(
				factory.factoryComponents,
				function (el) {
					return el[1] == factory.factoryComponenetIndexesAddedThisTurn[i]
				},
				this
			)
			// If not found, the factory may be in a post-expansion state (NODATASFWET saved after
			// expansion ran). Remove the most recent expansion tile from the grid, then collapse
			// back to pre-expansion once and retry.
			if (index === -1 && !expansionCollapsed && factory.factoryExpansions.length > 0) {
				console.log("Removing expansion tile from grid")
				var lastExp = factory.factoryExpansions[factory.factoryExpansions.length - 1]
				var expIndex = lastExp[0]
				var expRotation = lastExp[1]
				var tableWidth = DIMENSIONS[FACTORY_EXPANSION_TILE][0]
				var tableHeight = DIMENSIONS[FACTORY_EXPANSION_TILE][1]
				if (expRotation % 2 === 1) {
					tableWidth = DIMENSIONS[FACTORY_EXPANSION_TILE][1]
					tableHeight = DIMENSIONS[FACTORY_EXPANSION_TILE][0]
				}
				for (var ey = 0; ey < tableHeight; ey++) {
					for (var ex = expIndex; ex < expIndex + tableWidth; ex++) {
						factory.factoryCoords[ex + ey * factory.width] = OUT_OF_BOUNDS
					}
				}
				factory.factoryExpansions.pop()
				factory.collapseFactoryAfterExpansion()
				expansionCollapsed = true
				index = _.findIndex(
					factory.factoryComponents,
					function (el) {
						return el[1] == factory.factoryComponenetIndexesAddedThisTurn[i]
					},
					this
				)
			}
			// If still not found after collapse attempt, skip to avoid a crash
			if (index === -1) {
				console.log("Component not found in factory:", factory.factoryComponenetIndexesAddedThisTurn[i])
				continue
			}
			// get the name
			var componentName = factory.factoryComponents[index][0]
			// remove from available
			M.availableComponents[componentName]--
		}
	}

	self.isDealershipSuitableToDisplay = function (player, dealership, allowDuds) {
		var p = player

		// If no vehicles available to any dealership, can skip
		var zeroStock = true
		var stock = p.factory.getStockForDealership(dealership)
		if (stock[0] + stock[1] + stock[2] !== 0) zeroStock = false //return [true, 0];

		// If no dealerships with min specs, can skip
		var belowMinSpec = true
		var minSpecs = Rules.getMinSpecsInOrder()
		if (dealership[TL_IDX][0] >= minSpecs[0] && dealership[TL_IDX][1] >= minSpecs[1] && dealership[TL_IDX][2] >= minSpecs[2] && dealership[TL_IDX][3] >= minSpecs[3] && dealership[TL_IDX][4] >= minSpecs[4]) belowMinSpec = false

		var availableSalesWindow = false
		if (dealership[MW_IDX][0] === -1) {
			availableSalesWindow = true
			// If not allowing duds, remove it from options
			if (!allowDuds) if (M.wouldPlacingMWallowAnySales(player, dealership) === false) availableSalesWindow = false
		}

		// If no possible niches to sell to, can skip
		// NOW you have all dealerships with min tech, stock, placed sales windows, so just have to check if you can still sell
		if (M.getSellingNichesEligibilityForDealership(p, dealership)[0].length > 0) anySellingSquare = true
		else anySellingSquare = false

		if (belowMinSpec) return false
		if (availableSalesWindow) return true
		if (zeroStock) return false
		if (anySellingSquare) return true

		return false
	}

	self.canSkipCurrentSellingPlayer = function (player) {
		for (var i = 0; i < M.players.length; i++) {
			M.players[i].factory.checkDealershipLevels()
		}

		if (M.gameFlow.phase !== PHASE_SELL) return [false, 0]

		if (player.name === "HcBot") return [true, SKIP_BOT]

		var factory = player.factory
		// if no dealerships, can't play
		if (!_.some(factory.factoryComponents, (component) => DEALERSHIPS.includes(component[0]))) {
			return [true, SKIP_NO_DEALERSHUPS]
		}

		// If no vehicles available to any dealership, can skip
		var allZeroStock = true
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					var stock = factory.getStockForDealership(component)
					if (stock[0] + stock[1] + stock[2] !== 0) allZeroStock = false
					else component[SE_IDX] = -1
				}
			},
			this
		)

		if (allZeroStock) return [true, SKIP_NO_STOCK]

		// If no dealerships with min specs, can skip
		var allBelowMinSpec = true
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					var minSpecs = Rules.getMinSpecsInOrder()
					if (component[TL_IDX][0] >= minSpecs[0] && component[TL_IDX][1] >= minSpecs[1] && component[TL_IDX][2] >= minSpecs[2] && component[TL_IDX][3] >= minSpecs[3] && component[TL_IDX][4] >= minSpecs[4]) allBelowMinSpec = false
					else component[SE_IDX] = -1
				}
			},
			this
		)

		if (allBelowMinSpec) return [true, SKIP_NO_MIN_SPEC]

		// NOW, you have dealership with STOCK, MIN TECH
		// if sales window not placed, you can play
		var availableSalesWindows = 0
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					var minSpecs = Rules.getMinSpecsInOrder()
					// If a MW is available, increase the count, and decrease for min spec / no sales
					if (component[MW_IDX][0] === -1) {
						availableSalesWindows++
						// But if this dealership is below min spec, it can't be used
						if (!(component[TL_IDX][0] >= minSpecs[0] && component[TL_IDX][1] >= minSpecs[1] && component[TL_IDX][2] >= minSpecs[2] && component[TL_IDX][3] >= minSpecs[3] && component[TL_IDX][4] >= minSpecs[4])) availableSalesWindows--
						// If it is above min spec, check if none of the available squares could be sold to, it can't be used
						else if (M.wouldPlacingMWallowAnySales(player, component) === false) availableSalesWindows--
					}
				}
			},
			this
		)

		if (availableSalesWindows > 0) return [false, 0]

		// If no possible niches to sell to, can skip
		// NOW you have all dealerships with min tech, stock, placed sales windows, so just have to check if you can still sell
		var anySellingSquare = false
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					if (M.getSellingNichesEligibilityForDealership(player, component)[0].length > 0) anySellingSquare = true
					else component[SE_IDX] = -1
				}
			},
			this
		)

		if (!anySellingSquare) return [true, SKIP_NO_SELLING_SQUARES]

		// Now you must be left with dealerships that have min tech, stock, placed sales window, and at least 1 possible sale
		// Finally, if there is ONE dealership, with ONE selling square, auto sell and skip
		var totalSellingSquares = 0
		var dealershipToUse
		var MBindexToUse
		// NOTE - I think there is a chance that if you have stock of something that can't sell, this could cause an ENDLESS LOOP
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					var stock = factory.getStockForDealership(component)
					if (stock[0] + stock[1] + stock[2] !== 0) {
						totalSellingSquares += M.getSellingNichesEligibilityForDealership(player, component)[0].length
						if (M.getSellingNichesEligibilityForDealership(player, component)[0].length === 1) {
							MBindexToUse = M.getSellingNichesEligibilityForDealership(player, component)[0][0]
							dealershipToUse = component
						}
					}
				}
			},
			this
		)
		if (totalSellingSquares === 1) {
			C.actionSales(MBindexToUse, dealershipToUse, true)
			return [true, SKIP_SINGLE_SALE]
		}
		return false
	}

	self.setCurrentMarketBoardPrices = function () {
		var band3empty = true
		var band2empty = true
		var band1empty = true
		var band0empty = true
		var i = 0
		for (i = 0; i < PRICE_BAND_3_SQS.length; i++) {
			if (!M.isNicheIndexEmptyOfStock(PRICE_BAND_3_SQS[i])) band3empty = false
		}
		for (i = 0; i < PRICE_BAND_2_SQS.length; i++) {
			if (!M.isNicheIndexEmptyOfStock(PRICE_BAND_2_SQS[i])) band2empty = false
		}
		for (i = 0; i < PRICE_BAND_1_SQS.length; i++) {
			if (!M.isNicheIndexEmptyOfStock(PRICE_BAND_1_SQS[i])) band1empty = false
		}
		for (i = 0; i < PRICE_BAND_0_SQS.length; i++) {
			if (!M.isNicheIndexEmptyOfStock(PRICE_BAND_0_SQS[i])) band0empty = false
		}

		if (band3empty) M.priceBand[3] = 0
		if (band2empty) M.priceBand[2] = 0
		if (band1empty) M.priceBand[1] = 0
		if (band0empty) M.priceBand[0] = 0

		var availablePrice = 6
		if (!band3empty) {
			M.priceBand[3] = availablePrice
			if (availablePrice === 6) availablePrice = 4
			else availablePrice--
		}
		if (!band2empty) {
			M.priceBand[2] = availablePrice
			if (availablePrice === 6) availablePrice = 4
			else availablePrice--
		}
		if (!band1empty) {
			M.priceBand[1] = availablePrice
			if (availablePrice === 6) availablePrice = 4
			else availablePrice--
		}
		if (!band0empty) {
			M.priceBand[0] = availablePrice
			if (availablePrice === 6) availablePrice = 4
			else availablePrice--
		}
	}

	self.getValidNeutralCards = function () {
		const ALL_CARDS = [0, 1, 2, 3, 4, 5, 6]

		// Define exclusion lists for readability
		const carIndices = [1, 2, 3, 4, 5, 6]
		const truckIndices = [0]
		const sportsIndices = []

		return ALL_CARDS.filter((x) => {
			if (M.excludeCars && carIndices.includes(x)) return false
			if (M.excludeTrucks && truckIndices.includes(x)) return false
			if (M.excludeSports && sportsIndices.includes(x)) return false
			return true
		})
	}
	self.playNeutralCards = function () {
		var i = 0
		var histNeutralCards = []
		var VALID_NEUTRAL_CARDS = this.getValidNeutralCards()
		var neutralCards = _.shuffle(VALID_NEUTRAL_CARDS)
		if (M.gameFlow.turn === 0) {
			for (i = 0; i < M.players.length + 1; i++) {
				if (neutralCards.length < i) neutralCards = neutralCards.concat(VALID_NEUTRAL_CARDS)
				if (neutralCards.length < 1) return
				this.playSingleNeutralCard(neutralCards[i], 1)
				histNeutralCards.push([neutralCards[i], 1])
			}
		} else {
			var maxCards = 0
			for (i = 0; i < M.players.length; i++) {
				if (M.players[i].autoplay !== true) maxCards++
			}
			for (i = 0; i < maxCards; i++) {
				if (neutralCards.length < i) neutralCards = neutralCards.concat(VALID_NEUTRAL_CARDS)
				if (neutralCards.length < 1) return
				if (i < M.players.length - 2) {
					this.playSingleNeutralCard(neutralCards[i], 1)
					histNeutralCards.push([neutralCards[i], 1])
				}
				if (i === M.players.length - 2) {
					this.playSingleNeutralCard(neutralCards[i], 2)
					histNeutralCards.push([neutralCards[i], 2])
				}
				if (i === M.players.length - 1) {
					this.playSingleNeutralCard(neutralCards[i], 3)
					histNeutralCards.push([neutralCards[i], 3])
				}
			}
		}
		M.log(Log.NEUTRAL_CARDS, [...histNeutralCards])
	}

	self.playSingleNeutralCard = function (cardNum, quadrant) {
		if (cardNum === 0) card = neutralCard0
		if (cardNum === 1) card = neutralCard1
		if (cardNum === 2) card = neutralCard2
		if (cardNum === 3) card = neutralCard3
		if (cardNum === 4) card = neutralCard4
		if (cardNum === 5) card = neutralCard5
		if (cardNum === 6) card = neutralCard6
		var Xstart = 0
		var Ystart = 0
		if (quadrant === 1) Ystart = 4
		if (quadrant === 2) {
			Xstart = 4
			Ystart = 4
		}
		if (quadrant === 4) Xstart = 4
		// Now add the ACTUAL demand in correct place
		var MBindex = M.getIndexForMBcoord(Xstart + card[0], Ystart + card[1])
		M.marketBoard[MBindex][card[2]]++
	}

	self.getAllowedTechOnOneTrack = function (techTrackIndex, min, colour) {
		if (M.sandboxMode) return 6
		var previousPeople = 0
		for (var i = M.techTracks[techTrackIndex].length - 2; i >= 0; i--) {
			var currentLevel = i
			// Firstly, check if you're there
			if (M.techTracks[techTrackIndex][i].includes(colour)) return i
			if (M.techTracks[techTrackIndex][i].length > 0) previousPeople += M.techTracks[techTrackIndex][i].length
			if (previousPeople >= min) return i
		}
	}

	self.getNativelyAllowedTechLevels = function (localPOV, inColourOrder) {
		var i,
			j = 0
		var colour = M.players[localPOV].colour
		var nativelyAllowedTechLevels = [0, 0, 0, 0, 0]
		for (i = 0; i < M.techTracks.length; i++) {
			for (j = 0; j < M.techTracks[i].length - 1; j++) if (M.techTracks[i][j].indexOf(colour) > -1) nativelyAllowedTechLevels[i] = j
			if (M.trainingGame && M.techTracks[i][j].indexOf(C.currentPlayer().colour) > -1) nativelyAllowedTechLevels[i] = j
		}
		if (!inColourOrder) return nativelyAllowedTechLevels
		// Else sort into colour order
		var allowedTechLevelsByColour = [0, 0, 0, 0, 0]

		for (i = 0; i < allowedTechLevelsByColour.length; i++) {
			for (j = 0; j < M.techTracks.length; j++) {
				if (i === M.techTracks[j][7][0]) allowedTechLevelsByColour[i] = nativelyAllowedTechLevels[j]
			}
		}
		return allowedTechLevelsByColour
	}

	// Returns array based on L-R order of TechTracks
	self.getAllowedTechLevels = function (inColourOrder) {
		if (M.sandboxMode) return [6, 6, 6, 6, 6]
		var allowedTechLevels = [0, 0, 0, 0, 0]
		var previousPeoplRequired = 0
		let botRefund = 0
		var i = 0
		if (M.trainingGame) previousPeoplRequired = M.gameFlow.ready.length + 1
		else {
			// need our position in UNALTERED turn order,say, [2,0,1] then PPR is [1,2,3]
			for (i = 0; i < M.gameFlow.unalteredTurnOrder.length; i++) {
				if (M.players[M.gameFlow.unalteredTurnOrder[i]].autoplay == true) botRefund++
				if (M.gameFlow.unalteredTurnOrder[i] === global.pov) previousPeoplRequired = i + 1 - botRefund
			}
		}

		for (i = 0; i < allowedTechLevels.length; i++) {
			allowedTechLevels[i] = this.getAllowedTechOnOneTrack(i, previousPeoplRequired, C.currentPlayer().colour)
		}
		if (!inColourOrder) return allowedTechLevels
		// Else sort into colour order
		var allowedTechLevelsByColour = [0, 0, 0, 0, 0]

		for (i = 0; i < allowedTechLevelsByColour.length; i++) {
			for (var j = 0; j < M.techTracks.length; j++) {
				if (i === M.techTracks[j][7][0]) allowedTechLevelsByColour[i] = allowedTechLevels[j]
			}
		}
		return allowedTechLevelsByColour
	}

	self.getEligibleFactoryComponentNames = function (player) {
		var i = 0
		var res = []
		if (M.gameFlow.turn === 0 && !M.sandboxMode) return [DEPARTMENT_PLANNING, DEPARTMENT_RESEARCH]
		res.push(MAINLINE_CAR)
		res.push(MAINLINE_TRUCK)
		res.push(MAINLINE_SPORTS)
		res.push(DEPARTMENT_RESEARCH)
		res.push(DEPARTMENT_PLANNING)

		/* Now check which techs you can build */
		/* get access of each player, in UNALTERED TURN ORDER */

		// Get allowed techs
		var allowedTechLevels = self.getAllowedTechLevels()

		// now add components
		for (i = 0; i < M.techTracks.length; i++) {
			if (M.techTracks[i][7][0] === RED) {
				if (allowedTechLevels[i] >= 1) {
					res.push(ENGINE)
					res.push(ARROW_SPD_B)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(CLAXON)
					res.push(ARROW_SPD_D)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(GEARS)
					res.push(ARROW_SPD_B)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(TIRE)
					res.push(ARROW_SPD_D)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(FUEL_TANK)
					res.push(ARROW_SPD_B)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(DASHBOARD)
					res.push(ARROW_SPD_C)
				}
			} else if (M.techTracks[i][7][0] === GREEN) {
				if (allowedTechLevels[i] >= 1) {
					res.push(ENGINE)
					res.push(ARROW_RANGE_B)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(RADIATOR)
					res.push(ARROW_RANGE_A)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(TIRE)
					res.push(ARROW_RANGE_D)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(FUEL_TANK)
					res.push(ARROW_RANGE_B)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(RADIATOR)
					res.push(ARROW_RANGE_A)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(GEARS)
					res.push(ARROW_RANGE_B)
				}
			} else if (M.techTracks[i][7][0] === PURPLE) {
				if (allowedTechLevels[i] >= 1) {
					res.push(PAINT)
					res.push(ARROW_DESIGN_C)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(DOOR)
					res.push(ARROW_DESIGN_A)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(HEADLIGHT)
					res.push(ARROW_DESIGN_D)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(DASHBOARD)
					res.push(ARROW_DESIGN_C)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(BODY)
					res.push(ARROW_DESIGN_A)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(STEERING_WHEEL)
					res.push(ARROW_DESIGN_B)
				}
			} else if (M.techTracks[i][7][0] === BLUE) {
				if (allowedTechLevels[i] >= 1) {
					res.push(BATTERY)
					res.push(ARROW_REL_C)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(CHASSIS)
					res.push(ARROW_REL_A)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(BODY)
					res.push(ARROW_REL_A)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(BUMPER)
					res.push(ARROW_REL_A)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(ENGINE)
					res.push(ARROW_REL_B)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(CHASSIS)
					res.push(ARROW_REL_A)
				}
			} else if (M.techTracks[i][7][0] === YELLOW) {
				if (allowedTechLevels[i] >= 1) {
					res.push(BRAKE)
					res.push(ARROW_SAFETY_B)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(WINDSHIELD)
					res.push(ARROW_SAFETY_D)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(STEERING_WHEEL)
					res.push(ARROW_SAFETY_B)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(BUMPER)
					res.push(ARROW_SAFETY_A)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(HEADLIGHT)
					res.push(ARROW_SAFETY_D)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(TIRE)
					res.push(ARROW_SAFETY_D)
				}
			}
		}

		// Now pull out the player we want, and add the appropriate techs
		if (global.debug || M.sandboxMode) {
			res.push(CHASSIS)
			res.push(BODY)
			res.push(RADIATOR)
			res.push(DOOR)
			res.push(BUMPER)
			res.push(DASHBOARD)
			res.push(PAINT)
			res.push(BATTERY)
			res.push(ENGINE)
			res.push(GEARS)
			res.push(FUEL_TANK)
			res.push(STEERING_WHEEL)
			res.push(BRAKE)
			res.push(TIRE)
			res.push(HEADLIGHT)
			res.push(WINDSHIELD)
			res.push(CLAXON)
			res.push(ARROW_DESIGN_A)
			res.push(ARROW_DESIGN_B)
			res.push(ARROW_DESIGN_C)
			res.push(ARROW_DESIGN_D)
			res.push(ARROW_REL_A)
			res.push(ARROW_REL_B)
			res.push(ARROW_REL_C)
			res.push(ARROW_SPD_B)
			res.push(ARROW_SPD_C)
			res.push(ARROW_SPD_D)
			res.push(ARROW_SAFETY_A)
			res.push(ARROW_SAFETY_B)
			res.push(ARROW_SAFETY_D)
			res.push(ARROW_RANGE_A)
			res.push(ARROW_RANGE_B)
			res.push(ARROW_RANGE_D)
		}

		if (player.colour === RED) res = res.concat(RED_DEALERSHIPS)
		if (player.colour === GREEN) res = res.concat(GREEN_DEALERSHIPS)
		if (player.colour === PURPLE) res = res.concat(PURPLE_DEALERSHIPS)
		if (player.colour === BLUE) res = res.concat(BLUE_DEALERSHIPS)
		if (player.colour === YELLOW) res = res.concat(YELLOW_DEALERSHIPS)

		if (player.colour === RED) res.push(DEPARTMENT_MARKETING_RED)
		if (player.colour === GREEN) res.push(DEPARTMENT_MARKETING_GREEN)
		if (player.colour === PURPLE) res.push(DEPARTMENT_MARKETING_PURPLE)
		if (player.colour === BLUE) res.push(DEPARTMENT_MARKETING_BLUE)
		if (player.colour === YELLOW) res.push(DEPARTMENT_MARKETING_YELLOW)

		res = _.uniq(res)

		// If you've used your dealerships or marketings, get rid of them; no need to clog up space
		for (i = res.length - 1; i >= 0; i--) {
			if (DEALERSHIPS.includes(res[i]) && M.availableComponents[res[i]] === 0) {
				res.splice(i, 1)
			}
			if (DEPARTMENTS_MARKETING.includes(res[i]) && M.availableComponents[res[i]] === 0) {
				res.splice(i, 1)
			}
		}

		// Sort arrows to end
		res.sort(function (x, y) {
			return !ARROWS.includes(x) ? -1 : !ARROWS.includes(y) ? 1 : 0
		})

		return res
	}

	self.canResign = function (model, playerNumber) {
		if (playerNumber == undefined) {
			playerNumber = global.pov
		}
		playerNumber = global.pov
		if (model.workflow.turn == 0 && model.workflow.phase < PHASE_SETUP_RESERVE) {
			return true
		} else if (model.workflow.turn < 4) {
			return false
		} else if (model.workflow.turn >= 4 && model.workflow.phase == PHASE_RESTRUCTURING) {
			return true
		}
		return false
	}

	self.anyBotPlayers = function () {
		for (let i = 0; i < M.players.length; i++) {
			if (M.players[i].autoplay == true) return true
		}
		return false
	}

	// tech levels must be in COLOUR order
	self.getCorrectBorderColour = function (component, allowedTechLevels, nativelyAllowedTechLevels) {
		var borderColour = "black"

		// BLUE
		if (component === BATTERY && nativelyAllowedTechLevels[BLUE] >= 1) borderColour = "lightgreen"
		else if (component === BATTERY && allowedTechLevels[BLUE] >= 1) borderColour = "yellow"

		if (component === CHASSIS && nativelyAllowedTechLevels[BLUE] >= 2) borderColour = "lightgreen"
		else if (component === CHASSIS && allowedTechLevels[BLUE] >= 2) borderColour = "yellow"

		if (component === BODY && (nativelyAllowedTechLevels[BLUE] >= 3 || nativelyAllowedTechLevels[PURPLE] >= 5)) borderColour = "lightgreen"
		else if (component === BODY && (allowedTechLevels[BLUE] >= 3 || allowedTechLevels[PURPLE] >= 5)) borderColour = "yellow"

		if (component === BUMPER && (nativelyAllowedTechLevels[BLUE] >= 4 || nativelyAllowedTechLevels[YELLOW] >= 4)) borderColour = "lightgreen"
		else if (component === BUMPER && (allowedTechLevels[BLUE] >= 4 || allowedTechLevels[YELLOW] >= 4)) borderColour = "yellow"

		if (component === ENGINE && (nativelyAllowedTechLevels[BLUE] >= 5 || nativelyAllowedTechLevels[GREEN] >= 1 || nativelyAllowedTechLevels[RED] >= 1)) borderColour = "lightgreen"
		else if (component === ENGINE && (allowedTechLevels[BLUE] >= 5 || allowedTechLevels[GREEN] >= 1 || allowedTechLevels[RED] >= 1)) borderColour = "yellow"

		// PURPLE
		if (component === PAINT && nativelyAllowedTechLevels[PURPLE] >= 1) borderColour = "lightgreen"
		else if (component === PAINT && allowedTechLevels[PURPLE] >= 1) borderColour = "yellow"

		if (component === DOOR && nativelyAllowedTechLevels[PURPLE] >= 2) borderColour = "lightgreen"
		else if (component === DOOR && allowedTechLevels[PURPLE] >= 2) borderColour = "yellow"

		if (component === HEADLIGHT && (nativelyAllowedTechLevels[PURPLE] >= 3 || nativelyAllowedTechLevels[YELLOW] >= 5)) borderColour = "lightgreen"
		else if (component === HEADLIGHT && (allowedTechLevels[PURPLE] >= 3 || allowedTechLevels[YELLOW] >= 5)) borderColour = "yellow"

		if (component === DASHBOARD && (nativelyAllowedTechLevels[PURPLE] >= 4 || nativelyAllowedTechLevels[RED] >= 6)) borderColour = "lightgreen"
		else if (component === DASHBOARD && (allowedTechLevels[PURPLE] >= 4 || allowedTechLevels[RED] >= 6)) borderColour = "yellow"

		if (component === STEERING_WHEEL && (nativelyAllowedTechLevels[PURPLE] >= 6 || nativelyAllowedTechLevels[YELLOW] >= 3)) borderColour = "lightgreen"
		else if (component === STEERING_WHEEL && (allowedTechLevels[PURPLE] >= 6 || allowedTechLevels[YELLOW] >= 3)) borderColour = "yellow"

		// GREEN
		if (component === RADIATOR && nativelyAllowedTechLevels[GREEN] >= 2) borderColour = "lightgreen"
		else if (component === RADIATOR && allowedTechLevels[GREEN] >= 2) borderColour = "yellow"

		if (component === TIRE && (nativelyAllowedTechLevels[GREEN] >= 3 || nativelyAllowedTechLevels[RED] >= 4 || nativelyAllowedTechLevels[YELLOW] >= 6)) borderColour = "lightgreen"
		else if (component === TIRE && (allowedTechLevels[GREEN] >= 3 || allowedTechLevels[RED] >= 4 || allowedTechLevels[YELLOW] >= 6)) borderColour = "yellow"

		if (component === FUEL_TANK && (nativelyAllowedTechLevels[GREEN] >= 4 || nativelyAllowedTechLevels[RED] >= 5)) borderColour = "lightgreen"
		else if (component === FUEL_TANK && (allowedTechLevels[GREEN] >= 4 || allowedTechLevels[RED] >= 5)) borderColour = "yellow"

		if (component === GEARS && (nativelyAllowedTechLevels[GREEN] >= 6 || nativelyAllowedTechLevels[RED] >= 3)) borderColour = "lightgreen"
		else if (component === GEARS && (allowedTechLevels[GREEN] >= 6 || allowedTechLevels[RED] >= 3)) borderColour = "yellow"

		// RED
		if (component === CLAXON && nativelyAllowedTechLevels[RED] >= 2) borderColour = "lightgreen"
		else if (component === CLAXON && allowedTechLevels[RED] >= 2) borderColour = "yellow"

		// YELLOW
		if (component === BRAKE && nativelyAllowedTechLevels[YELLOW] >= 1) borderColour = "lightgreen"
		else if (component === BRAKE && allowedTechLevels[YELLOW] >= 1) borderColour = "yellow"

		if (component === WINDSHIELD && nativelyAllowedTechLevels[YELLOW] >= 2) borderColour = "lightgreen"
		else if (component === WINDSHIELD && allowedTechLevels[YELLOW] >= 2) borderColour = "yellow"

		return borderColour
	}
	return self
})()
