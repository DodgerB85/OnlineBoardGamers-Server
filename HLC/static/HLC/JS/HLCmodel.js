/**
	@class
	start
	getPlayerByColour
	getMBcoordsForIndex
	getIndexForMBcoord
	getDemandSummaryInfo
	getNichesEligibilityForDealership
	getSellingNichesEligibilityForDealership
	isNicheIndexEmpty
	isNicheIndexEmptyOfStock
	getIndexForPriceDisplay
	getCoveredIndexesOfMarketWindow
	placeDealershipWindowIntoModel
	log
	export
	import
*/
Model = function () {
	this.start = function (options) {
		var i = 0
		if (options != undefined && typeof options == "object") {
			this.firstGame = false
			this.trainingGame = false
			this.excludeCars = false
			this.excludeTrucks = false
			this.excludeSports = false
			this.increaseMainlines = false

			if (global.startingOptions && global.startingOptions.length > 0) {
				var optionsArr = global.startingOptions
				for (i = 0; i < optionsArr.length; i++) {
					if (optionsArr[i] == 102) {
						this.trainingGame = true
					}
					if (optionsArr[i] == 3) {
						// Only Cars
						this.excludeTrucks = true
						this.excludeSports = true
					}
					if (optionsArr[i] == 4) {
						// Only Trucks
						this.excludeCars = true
						this.excludeSports = true
					}
					if (optionsArr[i] == 5) {
						// Only Sports
						this.excludeCars = true
						this.excludeTrucks = true
					}
					if (optionsArr[i] == 6) {
						// No Sports
						this.excludeSports = true
					}
					if (optionsArr[i] == 7) {
						// No Trucks
						this.excludeTrucks = true
					}
					if (optionsArr[i] == 8) {
						// No Cars
						this.excludeCars = true
					}
					if (optionsArr[i] == 9) {
						// No Trucks
						this.increaseMainlines = true
					}
				}
			}
			// Set up Game Data

			// Add available general componenents; adjust for player count
			// each index is the component name; each entry is the number left

			//this.techTracks = _.shuffle([TECH_TRACK_RED, TECH_TRACK_GREEN, TECH_TRACK_PURPLE, TECH_TRACK_BLUE, TECH_TRACK_YELLOW, ]);
			this.techTracks = _.shuffle([
				[[], [], [], [], [], [], [], [RED, 0]],
				[[], [], [], [], [], [], [], [GREEN, 0]],
				[[], [], [], [], [], [], [], [PURPLE, 0]],
				[[], [], [], [], [], [], [], [BLUE, 0]],
				[[], [], [], [], [], [], [], [YELLOW, 0]],
			])
			//					SPARKS 	then DEMAND in car / truck / sports
			this.marketBoard = [
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
			]
			for (i = 0; i < this.marketBoard.length; i++) {
				for (var j = 0; j < this.marketBoard[i].length; j++) this.marketBoard[i][j] = 0
			}

			// Point at Bottom
			this.obsolescenceMarkerDirection = 1

			var colours = _.shuffle([RED, GREEN, PURPLE, BLUE, YELLOW])

			this.players = []

			playersName = options.players
			for (i = 0; i < playersName.length; i++) {
				var d = undefined
				if (this.trainingGame) {
					let displayNames = global.displayNames
					let displayNamesArr = displayNames//displayNames.split(/,/)
					if (playersName[i] === "SHADOW") d = displayNamesArr[0]
					if (playersName[i] === "SHADOW_2") d = displayNamesArr[1]
					if (playersName[i] === "SHADOW_3") d = displayNamesArr[2]
					if (playersName[i] === "SHADOW_4") d = displayNamesArr[3]
					if (playersName[i] === "SHADOW_5") d = displayNamesArr[4]
				}
				this.players.push(new Player(playersName[i], colours[i], i, d))
			}

			var to = []
			for (i = 0; i < this.players.length; to[i] = i++);

			var unalteredTurnOrder = [...to]

			this.gameFlow = {
				phase: 0,
				turn: 0,
				// THIS IS THE INDEX in M.players that is currently active
				currentPlayer: 0,
				// This is the current order of players
				turnOrder: to,
				unalteredTurnOrder: unalteredTurnOrder,
				ready: [],
				subphase: 0,
			}

			this.gameFlow.currentPlayer = to[0]

			this.assemblyCapacityTrack = [[], [], [], [], []]

			for (i = 0; i < this.players.length; i++) {
				this.assemblyCapacityTrack[0].push(this.players[i].colour)
				this.players[i].gantt = this.players.length - i
			}

			this.punchClockNumber = 0
			if (this.players.length == 3) this.punchClockNumber = 24
			if (this.players.length == 4) this.punchClockNumber = 32
			if (this.players.length == 5) this.punchClockNumber = 40

			this.alreadyPlayedCards = []

			var pInfos = []
			_.each(this.players, function (p) {
				pInfos.push(p.name, p.colour)
			})
			this.log(Log.SETUP_GAME, _.flatten([booleanToInt(this.trainingGame), booleanToInt(this.firstGame), pInfos]))

			// Now populate the components
			// Place player markers on tech tracks
			_.each(
				this.players,
				function (player) {
					this.techTracks[0][1].push(player.colour)
					this.techTracks[1][1].push(player.colour)
					this.techTracks[2][0].push(player.colour)
					this.techTracks[3][0].push(player.colour)
					this.techTracks[4][0].push(player.colour)
				},
				this
			)

			this.availableComponents = [...STARTING_COMPONENT_LIMITS_5P]
			for (i = 0; i < 5 - this.players.length; i++) {
				this.availableComponents[CHASSIS]--
				this.availableComponents[BODY]--
				this.availableComponents[RADIATOR] -= 2
				this.availableComponents[DOOR] -= 2
				this.availableComponents[BUMPER] -= 2

				this.availableComponents[DASHBOARD]--
				this.availableComponents[PAINT] -= 2
				this.availableComponents[BATTERY] -= 2

				this.availableComponents[ENGINE]--
				this.availableComponents[GEARS]--
				this.availableComponents[FUEL_TANK]--
				this.availableComponents[STEERING_WHEEL]--
				this.availableComponents[BRAKE] -= 2

				this.availableComponents[TIRE]--
				this.availableComponents[HEADLIGHT]--
				this.availableComponents[WINDSHIELD] -= 2
				this.availableComponents[CLAXON] -= 2

				this.availableComponents[MAINLINE_CAR] -= 2
				this.availableComponents[MAINLINE_TRUCK] -= 2
				this.availableComponents[MAINLINE_SPORTS] -= 2

				this.availableComponents[DEPARTMENT_RESEARCH] -= 5
				this.availableComponents[DEPARTMENT_PLANNING] -= 6
			}

			// If removing player cards, do it now
			if (this.excludeCars || this.excludeTrucks || this.excludeSports) {
				for (i = 0; i < this.players.length; i++) {
					let playerCards = this.players[i].playerCards
					let playerColour = this.players[i].colour
					var letterOriginal
					if (playerColour === RED) letterOriginal = "R"
					if (playerColour === GREEN) letterOriginal = "G"
					if (playerColour === PURPLE) letterOriginal = "P"
					if (playerColour === BLUE) letterOriginal = "B"
					if (playerColour === YELLOW) letterOriginal = "Y"

					for (j = playerCards.length - 1; j >= 0; j--) {
						var cardIDstr = letterOriginal + String(playerCards[j])
						if (this.excludeCars && PLAYER_CARDS_WITH_CARS_STR.includes(cardIDstr)) {
							playerCards.splice(j, 1)
							continue
						}
						if (this.excludeTrucks && PLAYER_CARDS_WITH_TRUCKS_STR.includes(cardIDstr)) {
							playerCards.splice(j, 1)
							continue
						}
						if (this.excludeSports && PLAYER_CARDS_WITH_SPORTS_STR.includes(cardIDstr)) {
							playerCards.splice(j, 1)
							continue
						}
					}
				}
			}

			// If increasing mainlines, do it here. Also remove ineligible ones

			const totalPlayers = this.players.length
			// If missing 2 types, need to add 12/16/20 mainlines
			if ((this.excludeTrucks && this.excludeSports) || (this.excludeCars && this.excludeSports) || (this.excludeCars && this.excludeTrucks)) {
				//let extras = 12
				//if (this.players.length == 4) extras = 16
				//else if (this.players.length == 5) extras = 20
				// Add them in
				if (this.excludeTrucks && this.excludeSports) {
					if (this.increaseMainlines) this.availableComponents[MAINLINE_CAR] += this.availableComponents[MAINLINE_TRUCK] + this.availableComponents[MAINLINE_SPORTS]
					this.availableComponents[MAINLINE_TRUCK] = 0
					this.availableComponents[MAINLINE_SPORTS] = 0
				} else if (this.excludeCars && this.excludeSports) {
					if (this.increaseMainlines) this.availableComponents[MAINLINE_TRUCK] += this.availableComponents[MAINLINE_CAR]
					if (this.increaseMainlines) this.availableComponents[MAINLINE_TRUCK] += this.availableComponents[MAINLINE_SPORTS]
					this.availableComponents[MAINLINE_CAR] = 0
					this.availableComponents[MAINLINE_SPORTS] = 0
				} else if (this.excludeCars && this.excludeTrucks) {
					if (this.increaseMainlines) this.availableComponents[MAINLINE_SPORTS] += this.availableComponents[MAINLINE_TRUCK]
					if (this.increaseMainlines) this.availableComponents[MAINLINE_SPORTS] += this.availableComponents[MAINLINE_CAR]
					this.availableComponents[MAINLINE_TRUCK] = 0
					this.availableComponents[MAINLINE_CAR] = 0
				}
			}
			// Otherwise, check for single missing type
			if (this.excludeTrucks && !this.excludeCars && !this.excludeSports) {
				if (this.increaseMainlines) this.availableComponents[MAINLINE_CAR] += Math.round(this.availableComponents[MAINLINE_TRUCK] / 2)
				if (this.increaseMainlines) this.availableComponents[MAINLINE_SPORTS] += Math.round(this.availableComponents[MAINLINE_TRUCK] / 2)
				this.availableComponents[MAINLINE_TRUCK] = 0
			} else if (this.excludeCars && !this.excludeTrucks && !this.excludeSports) {
				if (this.increaseMainlines) this.availableComponents[MAINLINE_TRUCK] += Math.round(this.availableComponents[MAINLINE_CAR] / 2)
				if (this.increaseMainlines) this.availableComponents[MAINLINE_SPORTS] += Math.round(this.availableComponents[MAINLINE_CAR] / 2)
				this.availableComponents[MAINLINE_CAR] = 0
			} else if (this.excludeSports && !this.excludeCars && !this.excludeTrucks) {
				if (this.increaseMainlines) this.availableComponents[MAINLINE_TRUCK] += Math.round(this.availableComponents[MAINLINE_SPORTS] / 2)
				if (this.increaseMainlines) this.availableComponents[MAINLINE_CAR] += Math.round(this.availableComponents[MAINLINE_SPORTS] / 2)
				this.availableComponents[MAINLINE_SPORTS] = 0
			}

			this.prevEngFocusOrder = []
			this.newEngFocusOrder = []

			this.priceBand = [0, 0, 0, 0]

			this.gameEnded = 0

			// TEMPORARY VARS ****************************************************************************
			this.alreadySetFocus = 0
			this.piecesUsedInResearch = []
			this.setupSubPhase = 0
			this.historyObj = []
			this.historyObjV2 = []
			this.sandboxMode = false
			this.preventMultipleDealershipUses = -1
			this.justAutoSold = false
		}
	}

	/*this.getPlayerByColour = function (number) {
		return _.find(this.players, 'colour', number);
	};*/

	this.getMBcoordsForIndex = function (index) {
		var res = []
		res.push(index % 8)
		res.push(Math.floor(index / 8))
		return res
	}

	this.getIndexForMBcoord = function (x, y) {
		if (y == undefined && x.length == 2) {
			return x[1] * 8 + x[0]
		} else {
			return y * 8 + x
		}
	}

	this.getDemandSummaryInfo = function () {
		var res = []

		var Q00indexes = [48, 49, 56, 57]

		var Q10indexes = [32, 33, 40, 41]
		var Q01indexes = [50, 51, 58, 59]

		var Q20indexes = [16, 17, 24, 25]
		var Q11indexes = [34, 35, 42, 42]
		var Q02indexes = [52, 53, 60, 61]

		var Q30indexes = [0, 1, 8, 9]
		var Q21indexes = [18, 19, 26, 27]
		var Q212ndexes = [36, 37, 44, 45]
		var Q03indexes = [54, 55, 62, 63]

		var Q31indexes = [2, 3, 10, 11]
		var Q22indexes = [20, 21, 28, 29]
		var Q13indexes = [38, 39, 46, 47]

		var Q32indexes = [4, 5, 12, 13]
		var Q23indexes = [22, 23, 30, 31]

		var Q33indexes = [6, 7, 14, 15]

		var allQindexes = []
		allQindexes.push(Q00indexes)
		allQindexes.push(Q10indexes)
		allQindexes.push(Q01indexes)
		allQindexes.push(Q20indexes)
		allQindexes.push(Q11indexes)
		allQindexes.push(Q02indexes)
		allQindexes.push(Q30indexes)
		allQindexes.push(Q21indexes)
		allQindexes.push(Q212ndexes)
		allQindexes.push(Q03indexes)
		allQindexes.push(Q31indexes)
		allQindexes.push(Q22indexes)
		allQindexes.push(Q13indexes)
		allQindexes.push(Q32indexes)
		allQindexes.push(Q23indexes)
		allQindexes.push(Q33indexes)

		for (var i = 0; i < allQindexes.length; i++) {
			var Ylevel = 0
			var Xlevel = 0
			if ([0, 2, 5, 9].includes(i)) Ylevel = 0
			if ([1, 4, 8, 12].includes(i)) Ylevel = 1
			if ([3, 7, 11, 14].includes(i)) Ylevel = 2
			if ([6, 10, 13, 15].includes(i)) Ylevel = 3

			if ([0, 1, 3, 6].includes(i)) Xlevel = 0
			if ([2, 4, 7, 10].includes(i)) Xlevel = 1
			if ([5, 8, 11, 13].includes(i)) Xlevel = 2
			if ([9, 12, 14, 15].includes(i)) Xlevel = 3

			var thisStock = [0, 0, 0]
			for (var j = 0; j < allQindexes[i].length; j++) {
				thisStock[0] += this.marketBoard[allQindexes[i][j]][3]
				thisStock[1] += this.marketBoard[allQindexes[i][j]][4]
				thisStock[2] += this.marketBoard[allQindexes[i][j]][5]
			}
			var Yinc = this.techTracks[0][7][1]
			var Xinc = this.techTracks[1][7][1]

			res.push([Ylevel + Yinc, Xlevel + Xinc, [...thisStock]])
			// NEED Yi tec, Xi tec, [stock]
		}
		return res
	}

	this.getNichesEligibilityForDealership = function (dealership) {
		var inelgibile = []
		var eligiible = []
		var dealershipTechLevels = dealership[TL_IDX]
		for (var y = 0; y < 8; y++) {
			for (var x = 0; x < 8; x++) {
				// x = Xcoord
				// y = Ycoord
				var YspecAxis = [this.techTracks[0][7][1], this.techTracks[0][7][1] + 1, this.techTracks[0][7][1] + 2, this.techTracks[0][7][1] + 3]
				var XspecAxis = [this.techTracks[1][7][1], this.techTracks[1][7][1] + 1, this.techTracks[1][7][1] + 2, this.techTracks[1][7][1] + 3]

				var reqdTT0 = YspecAxis[3 - Math.floor(y / 2)]
				var reqdTT1 = XspecAxis[Math.floor(x / 2)]
				var TT0colour = this.techTracks[0][7][0]
				var TT1colour = this.techTracks[1][7][0]
				if (dealershipTechLevels[TT0colour] >= reqdTT0 && dealershipTechLevels[TT1colour] >= reqdTT1) eligiible.push(this.getIndexForMBcoord([x, y]))
				else inelgibile.push(this.getIndexForMBcoord([x, y]))
			}
		}
		return [eligiible, inelgibile]
	}

	this.wouldPlacingMWallowAnySales = function (player, dealership) {
		var allPossibleNiches = this.getNichesEligibilityForDealership(dealership)[0]
		var stock = player.factory.getStockForDealership(dealership)

		for (var i = 0; i < allPossibleNiches.length; i++) {
			if ((this.marketBoard[allPossibleNiches[i]][3] > 0 && stock[0] > 0) || (this.marketBoard[allPossibleNiches[i]][4] > 0 && stock[1] > 0) || (this.marketBoard[allPossibleNiches[i]][5] > 0 && stock[2] > 0)) return true
		}

		return false
	}

	this.getSellingNichesEligibilityForDealership = function (player, dealership) {
		var inelgibile = []
		var eligiible = []
		var coveredIndexes = this.getCoveredIndexesOfMarketWindow(dealership[MW_IDX][0], dealership[MW_IDX][1], dealership[MW_IDX][2])
		var stock = player.factory.getStockForDealership(dealership)

		for (var i = 0; i < coveredIndexes.length; i++) {
			if ((this.marketBoard[coveredIndexes[i]][3] > 0 && stock[0] > 0) || (this.marketBoard[coveredIndexes[i]][4] > 0 && stock[1] > 0) || (this.marketBoard[coveredIndexes[i]][5] > 0 && stock[2] > 0)) eligiible.push(coveredIndexes[i])
			else inelgibile.push(coveredIndexes[i])
		}

		return [eligiible, inelgibile]
	}

	this.isNicheIndexEmpty = function (index) {
		var MBniche = this.marketBoard[index]
		var contents = 0
		for (var i = 0; i < MBniche.length; i++) {
			contents += MBniche[i]
		}
		if (contents === 0) return true
		return false
	}
	this.isNicheIndexEmptyOfStock = function (index) {
		var MBniche = this.marketBoard[index]
		var contents = 0
		for (var i = 0; i < 3; i++) {
			contents += MBniche[i + 3]
		}
		if (contents === 0) return true
		return false
	}

	this.getIndexForPriceDisplay = function (band) {
		var i = 0
		var prefOrder
		if (band == 0) {
			prefOrder = [49, 48, 41, 57, 50, 56, 58, 59, 40]
			for (i = 0; i < prefOrder.length; i++) {
				if (this.isNicheIndexEmpty(prefOrder[i])) return prefOrder[i]
			}
			return 32
		}
		if (band == 1) {
			prefOrder = [26, 34, 35, 43, 44, 25, 17, 52, 53]
			for (i = 0; i < prefOrder.length; i++) {
				if (this.isNicheIndexEmpty(prefOrder[i])) return prefOrder[i]
			}
			return 9
		}
		if (band == 2) {
			prefOrder = [12, 20, 21, 29, 30, 38, 11, 3, 2, 4, 10]
			for (i = 0; i < prefOrder.length; i++) {
				if (this.isNicheIndexEmpty(prefOrder[i])) return prefOrder[i]
			}
			return 13
		}
		if (band == 3) {
			prefOrder = [6, 15, 7, 5, 14]
			for (i = 0; i < prefOrder.length; i++) {
				if (this.isNicheIndexEmpty(prefOrder[i])) return prefOrder[i]
			}
			return 23
		}
		return 0
	}

	this.getCoveredIndexesOfMarketWindow = function (index, rotation, MWsize) {
		var indexCoords = this.getMBcoordsForIndex(index)

		var coveredIndexes = []
		if (MWsize === 0) {
			coveredIndexes.push(index)
			if (rotation === 0 && indexCoords[1] < 7) coveredIndexes.push(index + 8)
			if (rotation === 1 && indexCoords[0] > 0) coveredIndexes.push(index - 1)
			if (rotation === 2 && indexCoords[1] > 0) coveredIndexes.push(index - 8)
			if (rotation === 3 && indexCoords[0] < 7) coveredIndexes.push(index + 1)
		} else {
			var startCoords = this.getMBcoordsForIndex(index)
			if (rotation === 1) startCoords[0] -= MWsize
			if (rotation === 2) {
				startCoords[0] -= MWsize
				startCoords[1] -= MWsize
			}
			if (rotation === 3) startCoords[1] -= MWsize

			for (var x = 0; x <= MWsize; x++) {
				for (var y = 0; y <= MWsize; y++) {
					var currentCoords = [startCoords[0] + x, startCoords[1] + y]
					if (currentCoords[0] >= 0 && currentCoords[0] < 8 && currentCoords[1] >= 0 && currentCoords[1] < 8) coveredIndexes.push(this.getIndexForMBcoord(currentCoords))
				}
			}
		}
		return coveredIndexes
	}

	this.placeDealershipWindowIntoModel = function (index, dealership, MWsize) {
		// this affects the actual dealership of the player's factoryComponents
		this.preventMultipleDealershipUses = dealership[0]
		$("#MWrotationDiv").remove()

		dealership[MW_IDX][0] = index
		dealership[MW_IDX][1] = this.MWrotation
		dealership[MW_IDX][2] = MWsize
		V.render(-1)
		let HISTindex = index
		if (MWsize === 0 && this.MWrotation === 1) HISTindex--
		else if (MWsize === 0 && this.MWrotation === 2) HISTindex-=8
		else if (MWsize === 1) HISTindex--
		else if (MWsize === 2) HISTindex-=2
		M.historyObjV2[M.historyObjV2.length-1][1] = HISTindex
		M.historyObjV2[M.historyObjV2.length-1][2] = MWsize
		if (MWsize === 0 && ![0,2].includes(this.MWrotation)) M.historyObjV2[1].push(1)
		
	}

	this.log = function (action, param, playerNumber, timestamp) {
		if (playerNumber == undefined) {
			playerNumber = this.gameFlow.turnOrder[0]
		}
		Log.log(this, playerNumber, action, param, timestamp)
	}

	/** 
		<ol>

		</ol>
		Use {@linkcode undefined} if an object doesn't exist
		@return {array} The compressed model
	 */
	this.export = function () {
		var temp = []
		var tab = []

		// 0
		temp.push(this.availableComponents)

		// 1
		temp.push(this.alreadyPlayedCards)

		// 2
		var t = [this.gameFlow.phase, this.gameFlow.turn, this.gameFlow.currentPlayer, this.gameFlow.turnOrder.concat([]), this.gameFlow.unalteredTurnOrder.concat([]), this.gameFlow.subphase]
		if (this.gameFlow.ready != undefined) t.push(this.gameFlow.ready.concat([]))
		else t.push(undefined)
		temp.push(t)

		// 3
		if (this.players != undefined) {
			var pl = []
			_.each(this.players, function (player) {
				pl.push(player.export())
			})
			temp.push(pl)
		} else temp.push(undefined)

		// 4
		if (this.firstGame === true) temp.push(1)
		else temp.push(0)

		// 5
		temp.push(this.techTracks)

		// 6
		temp.push(this.marketBoard)

		// 7
		temp.push(this.obsolescenceMarkerDirection)

		// 8
		temp.push(this.assemblyCapacityTrack)

		// 9
		temp.push(this.punchClockNumber)

		// 10
		temp.push(this.prevEngFocusOrder)

		// 11
		temp.push(this.priceBand)

		// 12
		temp.push(this.gameEnded)

		// 13
		temp.push(this.newEngFocusOrder)

		// 14
		if (this.trainingGame === true) temp.push(1)
		else temp.push(0)

		// FIXED AS ACCESSED ON SERVER
		// 15,16
		if (this.logs != undefined && this.logs.length > 0) {
			var tRef = this.logs[0].timestamp
			var t2 = [tRef]
			var ts = []
			_.each(this.logs, function (log) {
				t2.push([log.player, log.action, log.param])
				ts.push(log.timestamp - tRef)
			})
			temp.push(t2)
			temp.push(ts)
		} else {
			temp.push(undefined)
			temp.push(undefined)
		}

		return temp
	}
}

function booleanToInt(b) {
	if (b === true) {
		return 1
	} else {
		return 0
	}
}

/**
 * @see {@link Model#export}
 * @param {array} tab - The input data
 * @static
 */
Model.import = function (tab) {
	var m = new Model()
	if (tab != undefined && tab.length != undefined) {
		m.availableComponents = tab[0]

		m.alreadyPlayedCards = tab[1]

		if (tab[2] != undefined) {
			m.gameFlow = {
				phase: tab[2][0],
				turn: tab[2][1],
				currentPlayer: tab[2][2],
				turnOrder: tab[2][3],
				unalteredTurnOrder: tab[2][4],
				subphase: tab[2][5],
				ready: tab[2][6],
			}
		}

		if (tab[3] != undefined && tab[3].length > 0) {
			m.players = []
			_.each(
				tab[3],
				function (t) {
					var p = Player.import(t)
					m.players.push(p)
				},
				m
			)
		}

		if (tab[4] === 1) m.firstGame = true
		else m.firstGame = false

		m.techTracks = tab[5]

		m.marketBoard = tab[6]

		m.obsolescenceMarkerDirection = tab[7]

		m.assemblyCapacityTrack = tab[8]

		m.punchClockNumber = tab[9]

		m.prevEngFocusOrder = tab[10]

		m.priceBand = tab[11]

		m.gameEnded = tab[12]

		m.newEngFocusOrder = tab[13]

		if (tab[14] == 1) m.trainingGame = true
		else m.trainingGame = false

		// FIXED AS ACCESSED ON SERVER
		if (tab[15] != undefined && tab[16] != undefined) {
			m.logs = []
			var tRef = 0
			_.each(tab[15], function (log) {
				if (typeof log === "number") {
					tRef = log
				} else {
					var l = {
						player: log[0],
						action: log[1],
						param: log[2],
					}
					if (typeof l.param === "number") l.param = [l.param]
					m.logs.push(l)
				}
			})

			// FIXED AS ACCESSED ON SERVER
			for (var i = 0; i < tab[16].length; i++) {
				if (tab[16][i] != undefined) m.logs[i].timestamp = tab[16][i] + tRef
				else m.logs[i].timestamp = 0
			}
		}

		// Get data from starting options
		if (global.startingOptions && global.startingOptions.length > 0) {
			let optionsArr = global.startingOptions
			for (i = 0; i < optionsArr.length; i++) {
				if (optionsArr[i] == 102) {
					m.trainingGame = true
				}
				if (optionsArr[i] == 3) {
					// Only Cars
					m.excludeTrucks = true
					m.excludeSports = true
				}
				if (optionsArr[i] == 4) {
					// Only Trucks
					m.excludeCars = true
					m.excludeSports = true
				}
				if (optionsArr[i] == 5) {
					// Only Sports
					m.excludeCars = true
					m.excludeTrucks = true
				}
				if (optionsArr[i] ==6) {
					// No Sports
					m.excludeSports = true
				}
				if (optionsArr[i] == 7) {
					// No Trucks
					m.excludeTrucks = true
				}
				if (optionsArr[i] == 8) {
					// No Cars
					m.excludeCars = true
				}
				if (optionsArr[i] == 9) {
					// No Trucks
					m.increaseMainlines = true
				}
			}
		}

		// Add in unsaved vars
		m.alreadySetFocus = 0
		m.piecesUsedInResearch = []
		m.setupSubPhase = 0
		m.historyObj = []
		m.historyObjV2 = []
		m.sandboxMode = false
		m.preventMultipleDealershipUses = -1
		m.justAutoSold = false
	}
	return m
}
