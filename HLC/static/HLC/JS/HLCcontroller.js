var Controller = function (_model, _view) {
	this.startActions = function () {
		var i = 0
		var j = 9
		$("#QSPdiv").remove()

		if (global.fullreset == undefined) {
			global.fullreset = compressObjectToDB(this.model.export())
		}
		if (this.model.phase !== PHASE_BUILD_FACTORY) {
			delete global.expansionReset
		}

		// if sandbox, then enable that
		if (this.model.sandboxMode) {
			this.enableFactoryBuildingSandbox()
			return
		}

		// DISPLAY INFO IF IT IS NOT YOUR TURN
		if (!Rules.canPlay()) {
			// Prevents removal of game end text on WS update
			if (this.model.gameEnded === 0) $("#actions").empty()
			if (M.gameFlow.phase === PHASE_SET_FOCUS) {
				// In set focus, but NOT our turn
				$("#actions").empty()

				var passedPlayers = []
				for (i = 0; i < M.prevEngFocusOrder.length; i++) {
					if (!M.gameFlow.turnOrder.includes(M.prevEngFocusOrder[i]) && !M.newEngFocusOrder.includes(M.prevEngFocusOrder[i])) passedPlayers.push(M.prevEngFocusOrder[i])
				}
				if (passedPlayers.length > 0) {
					$("#actions").append("<BR/>" + gettext("These players have passed and will be inserted in leftover spaces in this order:") + " ")
					for (i = 0; i < passedPlayers.length; i++) {
						$("#actions").append(C.getNameSpan(M.players[passedPlayers[i]].colour))
						if (i != passedPlayers.length - 1) $("#actions").append(",")
					}
					$("#actions").append("<BR/>")
				} // end passed players
				// prev eng focus
				$("#actions").append("<BR/><B>" + gettext("Previous Focus Order:") + "</B>")
				$("#actions").append(C.getNameSpan(-1) + "&nbsp;")
				for (i = 0; i < M.prevEngFocusOrder.length; i++) {
					$("#actions").append(C.getNameSpan(M.players[M.prevEngFocusOrder[i]].colour) + "&nbsp;")
				}
				$("#actions").append(C.getNameSpan(10) + "<BR/>")
				// New eng focus
				$("#actions").append("<BR/><B>" + gettext("New Focus Order:") + "</B>")
				$("#actions").append(C.getNameSpan(-1) + "&nbsp;")

				for (i = 0; i < M.newEngFocusOrder.length; i++) {
					if (M.newEngFocusOrder[i] == -1) {
						var button
						if (M.alreadySetFocus === 0) button = $('<span class="choosePos">' + (i + 1) + "</span> ")
						else button = $("<span>" + (i + 1) + "</span> ")
						$("#actions").append("&nbsp;&nbsp;")
						$("#actions").append(button)
						$("#actions").append("&nbsp;&nbsp;")
					} else {
						$("#actions").append("&nbsp;&nbsp;" + C.getNameSpan(M.players[M.newEngFocusOrder[i]].colour) + "&nbsp;&nbsp;")
					}
				}
				$("#actions").append("&nbsp;" + C.getNameSpan(10) + "<BR/>")
			} else if (this.model.gameFlow.phase === PHASE_SELL) {
				var dealershipsDiv = $("<div></div>")
				dealershipsDiv.css({
					position: "relative",
					display: "flex",
					floar: "left",
					width: "fit-content",
					height: "fit-content",
					padding: "3px",
					margin: "0 auto",
				})

				for (j = 0; j < this.model.gameFlow.turnOrder.length; j++) {
					for (i = 0; i < this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents.length; i++) {
						if (DEALERSHIPS.includes(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i][0])) {
							if (Rules.isDealershipSuitableToDisplay(this.model.players[this.model.gameFlow.turnOrder[j]], this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], false)) {
								stock = this.model.players[this.model.gameFlow.turnOrder[j]].factory.getStockForDealership(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i])
								dshipDiv = V.getDealershipSellingDiv(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], stock, false, this.model.gameFlow.turnOrder[j])
								dealershipsDiv.append(dshipDiv)
							}
						}
					}
				}
				$("#actions").append(dealershipsDiv)
			}
			return
		} // END if !RUles.can play (then display this info)
		if (this.model.gameEnded > 0) return

		// So now we can play
		if (this.model.gameFlow.turn === 0) this.enableFactorySetup()
		else if (this.model.gameFlow.phase === PHASE_RESEARCH) this.enableResearchPhase()
		else if (this.model.gameFlow.phase === PHASE_SET_FOCUS) this.enableSetFocusOptions()
		else if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			if (this.model.gameFlow.subphase === 1) this.enableFactoryExpansion()
			else this.enableFactoryBuilding()
		} else if (this.model.gameFlow.phase === PHASE_SELL) this.enableSell()
		else if (this.model.gameFlow.phase === PHASE_GROW_DEMANDS) this.enableGrowDemands()
	}

	/**************************************************************************************************************
	 *
	 * UTILS & COMMONS
	 *
	 **************************************************************************************************************/

	this.currentPlayer = function () {
		if (M.sandboxMode) return this.model.players[global.pov]
		if (M.trainingGame) return this.model.players[this.model.gameFlow.turnOrder[0]]

		if (!Rules.isSimulPhase()) return this.model.players[this.model.gameFlow.turnOrder[0]]
		if (Rules.isSimulPhase()) return this.model.players[this.model.gameFlow.currentPlayer]
	}

	this.addFinishTurnButton = function (turn, phase, buttonText) {
		if (this.model.sandboxMode) return
		$("#finishTurnButton").remove()
		var finishTurnButton = $('<button id="finishTurnButton">' + buttonText + "</button>")
		finishTurnButton.addClass("actionsLineButton")
		$("#actions").append(finishTurnButton)
		finishTurnButton.on("click", function () {
			if (phase === PHASE_SELL) C.endPlayerSalesTurn()
			else C.endPlayerTurn()
		})
	}

	this.addResetButton = function (text) {
		if (text == undefined) text = gettext("Reset")
		if ($("#resetTotalButton").length === 0) {
			var resetTotalButton = $('<button id="resetTotalButton">' + text + "</button>")
			resetTotalButton.addClass("actionsLineButton")

			$("#actions").append(resetTotalButton)
			resetTotalButton.on("click", { controller: this, total: true }, this.resetButton)
		}
	}

	this.resetButton = function (e) {
		var c = e.data.controller
		c.reset(c, e.data.total)
	}

	this.reset = function (total) {
		this.model.historyObj.splice(0, this.model.historyObj.length)
		this.reloadModel(global.fullreset)
	}

	this.reloadModel = async function (strModel) {
		var modelData = decompressObjectFromDB(strModel)
		this.model = Model.import(modelData)
		this.model.historyObj.splice(0, this.model.historyObj.length)
		M = this.model

		// Do this just to correct gameFlow.currentPLayer
		Rules.canPlay()
		if (!Rules.isSimulPhase()) global.currentPlayers = [this.model.players[this.model.gameFlow.turnOrder[0]].name]
		$("#actions").empty()
		this.view.reloadModel(this.model)
		// Hide newComponentDiv
		$("#newComponentDiv").remove()

		// Allows for spectator auto update history
		//if (global.pov != undefined) this.start(suppressActions);
		Log.refreshHistory(this.model)

		// remove old vies
		$("#eligibleComponentsDiv").empty()
		$("#componentValidationDiv").empty()
		if (Rules.canPlay()) this.sayBeep()
		this.startActions()
	}

	/**************************************************************************************************************
	 *
	 * PHASE 0.1 : SETUP - FACTORY /// Facotry Build
	 *
	 **************************************************************************************************************/

	this.enableFactorySetup = function () {
		var p = this.currentPlayer()
		if (this.model.setupSubPhase === 0) {
			$("#actions").append("<h2><b>" + gettext("Welcome to Horseless Carriage Online!</b><BR/>If you have any suggestions, questions or comments, then please do contact the webmaster at <img src='/static/Lobby/email.png' width='400px' height='30px'>. Thanks!"))

			if (this.model.trainingGame) $("#actions").append("<h2>" + gettext("In this practice game You will play all 3 players. Submit a bug report to report errors and game data to the webmaster. Thanks!") + "</h2>")

			$("#actions").append(gettext("Orientate your main factory tile"))
			$("#actions").append("<BR/>")
			$("#actions").append(V.getSetupInitialFactoryFloorDiv())
			var confirmButton = $('<button id="">Confirm</button>')
			confirmButton.addClass("actionsLineButton")
			this.addResetButton()
			$("#actions").append(confirmButton)
			confirmButton.on("click", function () {
				M.setupSubPhase++
				// set factory model correctly
				C.currentPlayer().factory.factoryCoords = C.currentPlayer().factory.rotateSquare(MAIN_FACTORY_TILE_COMPONENT, C.currentPlayer().factory.mainFactoryRotation, 12, C.currentPlayer().factory.mainFactoryFlipped)
				//var pos = M.gameFlow.ready.length;
				V.render()
				C.startActions()
			})
			if (global.debug) this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, "Debug End")
		} else {
			var eligibleFactoryTiles = Rules.getEligibleFactoryComponentNames(this.currentPlayer())
			this.view.displayEligibleFactoryTiles(this.currentPlayer(), eligibleFactoryTiles)
			$("#actions").empty()
			if (this.model.gameFlow.turn === 0) $("#actions").append(gettext("Place one Research Department and one Planning Department"))
			$("#actions").append("<BR/>")

			this.addResetButton()

			var undoButton = $('<button id="undoButton">Undo</button>')
			undoButton.addClass("actionsLineButton")
			$("#actions").append(undoButton)
			undoButton.on("click", function () {
				if (C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length > 0) {
					C.currentPlayer().factory.removeComponentAtIndex(C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn[C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length - 1])
					V.render()
				}
			})
		}

		this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, gettext("End Turn"))
		$("#finishTurnButton").hide()
		V.render()
	}

	/**************************************************************************************************************
	 *
	 * PHASE 1 : Research
	 *
	 **************************************************************************************************************/

	this.enableResearchPhase = function () {
		// delete info from turn 0
		delete global.move
		for (var i = 0; i < this.model.players.length; i++) {
			this.model.players[i].factory.factoryComponenetIndexesAddedThisTurn.splice(0, this.model.players[i].factory.factoryComponenetIndexesAddedThisTurn.length)
		}

		var player = this.currentPlayer()
		var researchPonts = Rules.getNumberOfResearchPoints(player)
		$("#actions").empty()
		$("#actions").append(this.view.displayAllDealershipsWithStock())

		$("#actions").append(gettext("Advance your Assembly Capacity or any player's Research"))
		$("#actions").append("<BR/>")
		if (Rules.anyBotPlayers()) {
			$("#actions").append("<BR/>")
			$("#actions").append(gettext("NOTE: Bot players do not restrict tech access. So the first human player in Eng order will have access to all techs"))
			$("#actions").append("<BR/>")
		}

		var resignButton = $("<button>" + gettext("Resign") + "</button>")
		resignButton.addClass("actionsLineButton")

		if (!this.model.trainingGame) $("#actions").append(resignButton)

		resignButton.on("click", { controller: this }, function (e) {
			$("#actions").empty()
			$("#actions").append("<p>" + gettext("Are you sure you want to resign?") + "</p><BR/>")
			$("#actions").append("<p>" + gettext("Resigning will unbalance the game for the remaining players.") + "</p>")
			$("#actions").append("<p>" + gettext("Please carry on playing if that is at all possible.") + "</p>")
			$("#actions").append("<p>" + gettext("Even if you think you can't win, you could still aim for 2nd place / not last place / funny factory layout / etc.") + "</p>")
			var img = $("<img>")
			img.attr("src", imagePreURL + "breakdown.jpg")
			img.css({
				height: "178px",
				width: "400px",
			})
			$("#actions").append(img)

			var line = $("<div>")
			var yesButton = $("<button>" + gettext("Yes, I still want to resign") + "</button>")
			var noButton = $("<button>" + gettext("Carry on playing") + "</button>")
			yesButton.addClass("actionsLineButton")
			noButton.addClass("actionsLineButton")

			line.append(noButton)
			line.append(yesButton)
			$("#actions").append(line)
			yesButton.on("click", { controller: C }, C.actionResign)

			noButton.on("click", { controller: C, total: true }, C.resetButton)
		})

		$("#actions").append(gettext("Research points remaining:") + " " + String(researchPonts))
		if (researchPonts > 0) {
			$(".piece").off()
			$(".piece").each(function (i, obj) {
				// if not used in research AND NOT(On ACT with different colour) and not
				if (!M.piecesUsedInResearch.includes(obj.id) && !(obj.id.slice(0, 3) === "ACT" && parseInt(obj.id.slice(4, 5)) !== C.currentPlayer().colour)) {
					// Can't advance if at end of tech track / ACT
					if (!(obj.id.slice(0, 3) === "ACT" && parseInt(obj.id.slice(3, 4)) === 4) && !(obj.id.slice(0, 3) !== "ACT" && parseInt(obj.id.slice(3, 4)) === 6)) {
						$(this).css({
							filter: `drop-shadow(4px 0 0 yellow) 
							drop-shadow(0 4px 0 yellow)
							drop-shadow(-4px 0 0 yellow) 
							drop-shadow(0 -4px 0 yellow)`,
						})
					}
				}
			})

			$(".piece").on("mouseover", function () {
				if (!M.piecesUsedInResearch.includes(this.id) && !(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(4, 5)) !== C.currentPlayer().colour)) {
					if (!(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(3, 4)) === 4) && !(this.id.slice(0, 3) !== "ACT" && parseInt(this.id.slice(3, 4)) === 6)) {
						$(this).css({
							filter: `drop-shadow(4px 0 0 green) 
				drop-shadow(0 4px 0 green)
				drop-shadow(-4px 0 0 green) 
				drop-shadow(0 -4px 0 green)`,
						})
					}
				}
			})

			$(".piece").on("mouseout", function () {
				if (!M.piecesUsedInResearch.includes(this.id) && !(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(4, 5)) !== C.currentPlayer().colour)) {
					if (!(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(3, 4)) === 4) && !(this.id.slice(0, 3) !== "ACT" && parseInt(this.id.slice(3, 4)) === 6)) {
						$(this).css({
							filter: `drop-shadow(4px 0 0 yellow) 
				drop-shadow(0 4px 0 yellow)
				drop-shadow(-4px 0 0 yellow) 
				drop-shadow(0 -4px 0 yellow)`,
						})
					}
				}
			})

			$(".piece").on("click", function (e) {
				if (!M.piecesUsedInResearch.includes(this.id) && !(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(4, 5)) !== C.currentPlayer().colour)) {
					if (!(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(3, 4)) === 4) && !(this.id.slice(0, 3) !== "ACT" && parseInt(this.id.slice(3, 4)) === 6)) {
						var id = this.id
						var track = this.id.slice(0, 3)
						var originalPos = parseInt(this.id.slice(3, 4))
						var colour = parseInt(this.id.slice(4, 5))
						var trackToUse
						if (track.slice(0, 2) === "TT") trackToUse = M.techTracks[parseInt(track.slice(2, 3))]
						if (track === "ACT") trackToUse = M.assemblyCapacityTrack
						// Remove from old pos
						trackToUse[originalPos] = trackToUse[originalPos].filter(function (item) {
							return item !== colour
						})

						// Add to new pos
						trackToUse[originalPos + 1].push(colour)
						M.piecesUsedInResearch.push(track + String(originalPos + 1) + String(colour))
						$(".piece").off()

						// Do punch clock
						if (track !== "ACT" && originalPos + 1 === 4) M.punchClockNumber--
						if (track !== "ACT" && originalPos + 1 === 6) M.punchClockNumber--
						if (track === "ACT" && originalPos + 1 === 4) M.punchClockNumber--

						// Recalc Stocks
						if (track === "ACT") {
							// Add stock back in to display dealerships
							for (let i = 0; i < M.players.length; i++) {
								// Each players dealershup produces vehicles accoeding to the assem capac track -- this is simply set to the correct max value
								let factory = M.players[i].factory
								for (let j = 0; j < factory.factoryComponents.length; j++) {
									if (MAINLINES.includes(factory.factoryComponents[j][0])) {
										for (let k = 0; k < M.assemblyCapacityTrack.length; k++) if (M.assemblyCapacityTrack[k].indexOf(M.players[i].colour) > -1) factory.factoryComponents[j][SL_IDX] = k + 1
									}
								}
							}
						}

						// Add to history object
						// colour of piece being moved, TT0 < index, or ACT < track
						M.historyObj.push([colour, C.getTrackCompressedNumberFromID(track.slice(0, 3)), originalPos + 1, M.punchClockNumber])

						V.render(-1)
					}
				}
			})
		}

		// For any moved pieces, indicate whether it was yours or others
		$(".piece").each(function (i, obj) {
			// if not used in research AND NOT(On ACT with different colour) and not
			if (M.piecesUsedInResearch.includes(obj.id)) {
				if (parseInt(obj.id.slice(4, 5)) === C.currentPlayer().colour) {
					$(this).css({
						filter: `drop-shadow(3px 0 0 lightgreen) 
							drop-shadow(0 3px 0 lightgreen)
							drop-shadow(-3px 0 0 lightgreen) 
							drop-shadow(0 -3px 0 lightgreen)`,
					})
				} else {
					$(this).css({
						filter: `drop-shadow(3px 0 0 orange) 
							drop-shadow(0 3px 0 orange)
							drop-shadow(-3px 0 0 orange) 
							drop-shadow(0 -3px 0 orange)`,
					})
				}
			}
		})

		this.addResetButton()

		$("#actions").append("<BR/>")

		_.each(
			M.historyObj,
			function (p, i) {
				var pos = p[2]
				if (p[1] === 5) pos++

				var arrIndex = this.model.players.map((player) => player.colour).indexOf(p[0])
				var playerName = M.players[arrIndex].name
				if (playerName === global.name) playerName = "yourself"

				$("#actions").append(
					"<SPAN id='researchReminderSpan" +
						String(i) +
						"'>" +
						interpolate(
							gettext("You moved %(playerName)s %(playerToken)s to %(techTrack)s %(newPosition)s"),
							{
								playerName: playerName,
								playerToken: Log.getPlayerTokenFromColour(p[0]).prop("outerHTML"),
								techTrack: Log.getTrackNameFromCompressedNumberL(p[1]),
								newPosition: String(pos),
							},
							true
						) +
						"</SPAN><BR/>"
				)

				if (M.players[arrIndex].name === this.currentPlayer().name) {
					$("#researchReminderSpan" + String(i)).css({
						color: "darkgreen",
					})
				} else {
					$("#researchReminderSpan" + String(i)).css({
						color: "chocolate",
					})
				}
			},
			this
		)

		if (researchPonts === 0 || global.debug) {
			this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, gettext("End Turn"))
			$("#finishTurnButton").show()
		}
	}

	this.actionResign = function (e) {
		var c = e.data.controller
		$("#actions").empty()
		// Need to use global.pov otherwise resiginnign in turn order kicks out wrong person
		// THIS JUST ADDS A LOG, AND CHANGES THE NAME / AUTOPLAY
		IO.resign(c.model, c.currentPlayer().name)

		Bot.actionResign(c.model, global.pov)
	}

	this.getTrackCompressedNumberFromID = function (id) {
		if (id === "ACT")
			return 5 //"Assembly Capacity Track";
		else {
			var trackToUse = this.model.techTracks[parseInt(id.slice(2, 3))]
			var colour = trackToUse[7][0]
			if (colour === 0) return 0 //"Speed Techs";
			if (colour === 1) return 1 //"Range Techs";
			if (colour === 2) return 2 //"Design Techs";
			if (colour === 3) return 3 //"Reliability Techs";
			if (colour === 4) return 4 //"Safety Techs";
		}
	}

	/**************************************************************************************************************
	 *
	 * PHASE 2 : Set Focus
	 *
	 **************************************************************************************************************/

	this.enableSetFocusOptions = function () {
		var i = 0
		//V.render(-1);
		$("#actions").empty()

		$("#actions").append(this.view.displayAllDealershipsWithStock())

		var passedPlayers = []
		for (i = 0; i < this.model.prevEngFocusOrder.length; i++) {
			if (!this.model.gameFlow.turnOrder.includes(this.model.prevEngFocusOrder[i]) && !this.model.newEngFocusOrder.includes(this.model.prevEngFocusOrder[i])) passedPlayers.push(this.model.prevEngFocusOrder[i])
		}
		if (passedPlayers.length > 0) {
			$("#actions").append("<BR/>" + gettext("These players have passed and will be inserted in leftover spaces in this order:") + " ")
			for (i = 0; i < passedPlayers.length; i++) {
				$("#actions").append(this.getNameSpan(this.model.players[passedPlayers[i]].colour))
				if (i != passedPlayers.length - 1) $("#actions").append(",")
			}
			$("#actions").append("<BR/>")
		} // end passed players

		$("#actions").append("<BR/><B>" + gettext("Previous Focus Order") + ": </B>")
		$("#actions").append(this.getNameSpan(-1) + "&nbsp;")
		for (i = 0; i < this.model.prevEngFocusOrder.length; i++) {
			$("#actions").append(this.getNameSpan(this.model.players[this.model.prevEngFocusOrder[i]].colour) + "&nbsp;")
		}
		$("#actions").append(this.getNameSpan(10) + "<BR/>")

		if (Rules.anyBotPlayers()) {
			$("#actions").append("<BR/>")
			$("#actions").append(gettext("NOTE: Bot players do not restrict tech access. So the first human player in Eng order will have access to all techs"))
			$("#actions").append("<BR/>")
		}

		$("#actions").append("<BR/><B>" + gettext("Spend all Gantt to choose focus, or keep your Gantt. Remember: reaching 10 Gantt will reduce the punch clock by 1") + "</b><BR/>")

		var div = $("<div/>")
		for (i = 0; i < this.model.newEngFocusOrder.length; i++) {
			if (this.model.newEngFocusOrder[i] == -1) {
				var button
				if (this.model.alreadySetFocus === 0) button = $('<button class="choosePos">' + (i + 1) + "</button> ")
				else button = $("<span>" + (i + 1) + "</span> ")
				button.data("position", i)
				div.append("&nbsp;&nbsp;")
				div.append(button)
				div.append("&nbsp;&nbsp;")
			} else {
				div.append("&nbsp;&nbsp;" + this.getNameSpan(this.model.players[this.model.newEngFocusOrder[i]].colour) + "&nbsp;&nbsp;")
			}
		}
		$("#actions").append(div)
		if (this.model.alreadySetFocus === 0) {
			var keepGanttButton = $("<button id=''>" + gettext("Pass & Keep Gantt") + "</button>")
			keepGanttButton.addClass("actionsLineButton")
			$("#actions").append(keepGanttButton)
			keepGanttButton.on("click", function () {
				M.log(Log.SET_FOCUS, -1)
				M.alreadySetFocus = 1
				C.startActions()
			})
		}

		$(".choosePos").on("click", { controller: this }, choosePosition)
		if (this.model.alreadySetFocus === 1) {
			this.addResetButton()
			this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, "End Turn")
		}
		V.render(-1)
	}

	this.getNameSpan = function (colour) {
		var span
		if (colour === -1) {
			span = "<span class='playerName" + String(colour) + "'>" + gettext("Eng") + " ></span>"
			return span
		} else if (colour === 10) {
			span = "<span class='playerName-1'>< " + gettext("Sales") + "</span>"
			return span
		}
		// get index first
		var index = this.model.players.map((item) => item.colour).indexOf(colour)
		// Then correct colour
		colour = getCorrectedColour(colour)
		span = "<span class='playerName" + String(colour) + "'> " + this.model.players[index].name + " </span>"
		return span
	}

	function choosePosition(e) {
		var c = e.data.controller
		var pos = $(e.currentTarget).data("position")
		var player = c.currentPlayer()
		player.gantt = 0
		c.model.newEngFocusOrder[pos] = player.arrayPos
		M.alreadySetFocus = 1
		M.log(Log.SET_FOCUS, pos)

		C.startActions()
	}

	/**************************************************************************************************************
	 *
	 * PHASE 3 : Factory Build
	 *
	 **************************************************************************************************************/

	this.enableFactoryBuilding = function () {
		var i = 0
		var eligibleFactoryTiles = Rules.getEligibleFactoryComponentNames(this.currentPlayer())
		this.view.displayEligibleFactoryTiles(this.currentPlayer(), eligibleFactoryTiles)
		$("#actions").empty()
		if (global.move) $("#actions").append("<B><span style='color: red'>" + gettext("Previous players used up the components. Please rearrange your factory") + "</span></B><BR/>")
		if (!Rules.canPlay()) {
			$("#actions").append("<B><span style='color: red'><br/>" + gettext("IT IS NOT YET YOUR TURN. You will be able to fix your factory on your turn") + "</span></B><BR/>")
		}

		$("#actions").append(gettext("Place components into your factory"))

		if (Rules.anyBotPlayers()) {
			$("#actions").append("<BR/>")
			$("#actions").append("<BR/>")
			$("#actions").append(gettext("NOTE: Bot players do not restrict tech access. So the first human player in Eng order will have access to all techs"))
			$("#actions").append("<BR/>")
		}

		if (!this.model.trainingGame) {
			if (global.currentPlayers.indexOf(global.name) === 0) $("#actions").append("<BR/><B>" + gettext("You are the current player. You can use any available component") + "</B>")
			else $("#actions").append("<BR/><B>" + gettext("You are not the current player. If previous players use up components that you also use, you will need to modify your factory") + "</B>")
		}
		$("#actions").append("<BR/>")

		this.addResetButton()

		var undoButton = $("<button id='undoButton'>" + gettext("Remove Last Component") + "</button>")
		undoButton.addClass("actionsLineButton")
		$("#actions").append(undoButton)
		undoButton.on("click", this.clickedOnRemoveLastComponent)

		if (!this.model.trainingGame) {
			var saveFactoryWithoutEndingTurnButton = $("<button id='saveWithoutEndingTurnButton'>" + gettext("Save Without Ending Turn") + "</button>")
			saveFactoryWithoutEndingTurnButton.addClass("actionsLineButton")
			saveFactoryWithoutEndingTurnButton.on("click", IO.saveFactoryWithoutEndingTurn)
			$("#actions").append(saveFactoryWithoutEndingTurnButton)
		}

		// Need to add then hide
		var endBuildingButton = $("<button id='finishTurnButton'>" + gettext("Finish Building") + "</button>")
		endBuildingButton.addClass("actionsLineButton")
		$("#actions").append(endBuildingButton)
		endBuildingButton.on("click", function () {
			//$("#QSPdiv").remove(); NO EFFECT - JUST GETS READDED!
			// BEFORE WE EXPAND, NEED TO CAPTURE WHAT WAS ADDED THIS TURN
			if (!M.trainingGame) {
				var factory = M.players[global.pov].factory
				factory.factoryComponentNamesAddedThisTurn = factory.factoryComponentNamesAddedThisTurn.splice(0, factory.factoryComponenetIndexesAddedThisTurn.length)
				for (i = 0; i < factory.factoryComponenetIndexesAddedThisTurn.length; i++) {
					var arrayIndex = _.findIndex(
						factory.factoryComponents,
						function (el) {
							return el[1] === factory.factoryComponenetIndexesAddedThisTurn[i]
						},
						this
					)
					// NEEDED TO FIX GAMES BREAKING
					try {
						factory.factoryComponentNamesAddedThisTurn.push(factory.factoryComponents[arrayIndex][0])
					} catch {
						// Do nothing
					}
				}
				if (factory.factoryDataBeforeExpansion.length === 0) {
					factory.factoryDataBeforeExpansion.push(factory.export())
					factory.factoryDataBeforeExpansion.push([...M.availableComponents])
				}
				// END CAPTURE

				factory.factoryDataBeforeExpansion = compressObjectToDB(factory.factoryDataBeforeExpansion)
			}
			C.enableFactoryExpansion()
		})
		if (global.name !== "BotKickStarter") $("#finishTurnButton").hide()

		V.render()
		V.updateQSPdiv(this.currentPlayer())
	}

	this.clickedOnRemoveLastComponent = function () {
		$("#newComponentDiv").remove()
		if (C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length > 0) {
			C.currentPlayer().factory.removeComponentAtIndex(C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn[C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length - 1])

			// refresh components
			V.displayEligibleFactoryTiles(C.currentPlayer(), Rules.getEligibleFactoryComponentNames(C.currentPlayer()))

			V.render()
			$("#newComponentDiv").remove()
			V.updateQSPdiv(C.currentPlayer())
		}
	}

	this.enableFactoryExpansion = function () {
		global.sandboxReset = compressObjectToDB(M.export())
		global.undoExpansionReset = compressObjectToDB(M.export())
		this.model.subphase = 1
		$("#actions").empty()
		$(".piece").off()
		$("#actions").empty()
		$("#eligibleComponentsDiv").empty()
		$("#actions").append(gettext("Expand your Factory") + "<BR/>")

		this.addResetButton(gettext("Reset Whole Factory"))

		var undoExpansionResetButton = $("<button id='resetTotalButton222'>" + gettext("Go back to Factory Building") + "</button>")
		undoExpansionResetButton.addClass("actionsLineButton")
		$("#actions").append(undoExpansionResetButton)
		undoExpansionResetButton.on("click", function () {
			M.historyObj.splice(0, M.historyObj.length)
			C.reloadModel(global.undoExpansionReset)
		})

		this.model.gameFlow.subphase = 1
		global.expansionReset = compressObjectToDB(this.model.export())

		this.currentPlayer().factory.showPossibleExpansionAreas()
		if (M.trainingGame) V.render()

		if (global.name === "BotKickStarter") C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End Turn"))
	}

	///////////////////////////////////////////////////// SANDBOX FACTORY /////////////////////////////////////////////////////////////////
	this.enableFactoryBuildingSandbox = function () {
		var i = 0
		var eligibleFactoryTiles = Rules.getEligibleFactoryComponentNames(this.currentPlayer())
		this.view.displayEligibleFactoryTiles(this.currentPlayer(), eligibleFactoryTiles)
		$("#actions").empty()
		$("#actions").append("<B><span class='sandboxWarning'>" + gettext("SANDBOX MODE - USE THE BUTTON TO EXIT SANDBOX MODE") + "</span></B><BR/>")

		$("#actions").append(gettext("Place components into your factory"))

		var undoButton = $("<button id='undoButton'>" + gettext("Remove Last Component") + "</button>")
		undoButton.addClass("actionsLineButton")
		undoButton.css({ width: "200px" })
		$("#actions").append(undoButton)
		undoButton.on("click", function () {
			$("#newComponentDiv").remove()
			if (C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length > 0) {
				C.currentPlayer().factory.removeComponentAtIndex(C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn[C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length - 1])
				// refresh components
				V.displayEligibleFactoryTiles(C.currentPlayer(), Rules.getEligibleFactoryComponentNames(C.currentPlayer()))
				V.render()
				$("#newComponentDiv").remove()
				V.updateQSPdiv(C.currentPlayer())
			}
		})

		// Need to add then hide
		var endBuildingButton = $("<button id='finishTurnButton'>" + gettext("Expand Factory") + "</button>")
		endBuildingButton.addClass("actionsLineButton")
		$("#actions").append(endBuildingButton)
		endBuildingButton.on("click", function () {
			C.enableFactoryExpansionSandbox()
		})
		$("#finishTurnButton").hide()

		var exitSandboxButton = $("<button id='exitSandboxButton'>" + gettext("Exit Sandbox Mode") + "</button>")
		exitSandboxButton.addClass("actionsLineButton")
		$("#actions").append(exitSandboxButton)
		exitSandboxButton.on("click", function () {
			$("#nudgeDiv").remove()
			if (M.gameFlow.phase === PHASE_BUILD_FACTORY) C.reloadModel(global.sandboxReset)
			else C.reloadModel(global.fullreset)
		})

		V.render()
	}

	///////////////////////////////////////////////////// SANDBOX EXPANSION /////////////////////////////////////////////////////////////////
	this.enableFactoryExpansionSandbox = function () {
		this.model.subphase = 1
		$("#actions").empty()
		$(".piece").off()
		$("#actions").empty()
		$("#eligibleComponentsDiv").empty()
		$("#actions").append("<B><span class='sandboxWarning'>" + gettext("SANDBOX MODE - REFRESH THE PAGE OR USE THE BUTTON TO EXIT SANDBOX MODE") + "</span></B><BR/>")

		$("#actions").append(gettext("Expand your Factory") + "<BR/>")

		var exitSandboxButton = $("<button id='exitSandboxButton'>" + gettext("Exit Sandbox Mode") + "</button>")
		exitSandboxButton.addClass("actionsLineButton")
		$("#actions").append(exitSandboxButton)
		exitSandboxButton.on("click", function () {
			if (M.gameFlow.phase === PHASE_BUILD_FACTORY) C.reloadModel(global.sandboxReset)
			else C.reloadModel(global.fullreset)
		})

		this.model.gameFlow.subphase = 1
		this.currentPlayer().factory.showPossibleExpansionAreas()
		V.render()
	}

	///////////////////////////////////////////////////// SANDBOX /////////////////////////////////////////////////////////////////
	this.addEndExpansionSandboxButton = function () {
		$("#endExpansionSandboxButton").remove()

		var endExpansionSandboxButton = $("<button id='endExpansionSandboxButton'>" + gettext("Start Building Again") + "</button>")
		endExpansionSandboxButton.addClass("actionsLineButton")
		$("#actions").append(endExpansionSandboxButton)
		endExpansionSandboxButton.on("click", function () {
			C.currentPlayer().factory.collapseFactoryAfterExpansion()
			$("#nudgeDiv").remove()
			C.startActions()
		})
	}
	///////////////////////////////////////////////////// SANDBOX /////////////////////////////////////////////////////////////////

	/**************************************************************************************************************
	 *
	 * PHASE 5 : Sell
	 *
	 **************************************************************************************************************/

	this.enableSell = function () {
		$(".marketSelectable").remove()
		$(".marketSelectable").off()
		$(".marketIneligible").remove()
		$(".marketIneligible").off()

		var i = 0
		var j = 0
		var stock
		var dshipDiv
		if (this.model.MWrotation == undefined) this.model.MWrotation = 0
		$("#actions").empty()
		$("#actions").append("<B>" + gettext("Choose a dealership, place a Market Window, then if possible, sell to a niche<BR/>Once you select a dealership, you can rotate the market window using the buttons that appear underneath the dealerships") + "</b><BR/>")

		var p = this.currentPlayer()
		var dealershipsDiv = $("<div></div>")
		dealershipsDiv.css({
			position: "relative",
			display: "flex",
			"flex-wrap": "wrap",
			"justify-content": "center",
			width: "fit-content",
			height: "fit-content",
			padding: "3px",
			margin: "0 auto",
		})

		var includeNoMWduds = false
		for (i = 0; i < p.factory.factoryComponents.length; i++) {
			if (DEALERSHIPS.includes(p.factory.factoryComponents[i][0])) {
				if (Rules.isDealershipSuitableToDisplay(p, p.factory.factoryComponents[i], false)) {
					includeNoMWduds = true
					break
				}
			}
		}

		for (i = 0; i < p.factory.factoryComponents.length; i++) {
			if (DEALERSHIPS.includes(p.factory.factoryComponents[i][0])) {
				if (Rules.isDealershipSuitableToDisplay(p, p.factory.factoryComponents[i], includeNoMWduds)) {
					stock = p.factory.getStockForDealership(p.factory.factoryComponents[i])
					dshipDiv = V.getDealershipSellingDiv(p.factory.factoryComponents[i], stock, true, this.model.gameFlow.turnOrder[0])
					dealershipsDiv.append(dshipDiv)
				}
			}
		}
		for (j = 1; j < this.model.gameFlow.turnOrder.length; j++) {
			includeNoMWduds = false
			for (i = 0; i < this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents.length; i++) {
				if (DEALERSHIPS.includes(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i][0])) {
					if (Rules.isDealershipSuitableToDisplay(this.model.players[this.model.gameFlow.turnOrder[j]], this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], false)) {
						includeNoMWduds = true
						break
					}
				}
			}

			for (i = 0; i < this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents.length; i++) {
				if (DEALERSHIPS.includes(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i][0])) {
					if (Rules.isDealershipSuitableToDisplay(this.model.players[this.model.gameFlow.turnOrder[j]], this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], includeNoMWduds)) {
						stock = this.model.players[this.model.gameFlow.turnOrder[j]].factory.getStockForDealership(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i])
						dshipDiv = V.getDealershipSellingDiv(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], stock, false, this.model.gameFlow.turnOrder[j])
						dealershipsDiv.append(dshipDiv)
					}
				}
			}
		}

		$("#actions").append(dealershipsDiv)
		if (global.debug) this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, "Debug End")
	}

	this.clickedOnDealershipOther = function (e) {
		$(".marketIneligible").remove()
		$(".marketSelectable").remove()
		$("#MWrotationDiv").remove()
		if (e.data.dealership[MW_IDX][0] == -1) {
			// Get all squares that can't meet tech and highlight red
			var nichesEligibility = M.getNichesEligibilityForDealership(e.data.dealership)

			V.drawMarketSquares(nichesEligibility[0], "green", "marketSelectable")
			V.drawMarketSquares(nichesEligibility[1], "red", "marketIneligible")
		} else {
			// Highlight the market window squares
			var inelgibile = []
			var eligiible = []
			var coveredIndexes = M.getCoveredIndexesOfMarketWindow(e.data.dealership[MW_IDX][0], e.data.dealership[MW_IDX][1], e.data.dealership[MW_IDX][2])
			var stock = e.data.stocks

			for (var i = 0; i < coveredIndexes.length; i++) {
				if ((M.marketBoard[coveredIndexes[i]][3] > 0 && stock[0] > 0) || (M.marketBoard[coveredIndexes[i]][4] > 0 && stock[1] > 0) || (M.marketBoard[coveredIndexes[i]][5] > 0 && stock[2] > 0)) eligiible.push(coveredIndexes[i])
				else inelgibile.push(coveredIndexes[i])
			}

			V.drawMarketSquares(eligiible, "green", "marketSelectable")
			V.drawMarketSquares(inelgibile, "red", "marketIneligible")
		}
		$(".marketSelectable").mouseover(function () {
			$(".marketSelectable").remove()
			$(".marketSelectable").off()
			$(".marketIneligible").remove()
			$(".marketIneligible").off()
		})
		$(".marketIneligible").mouseover(function () {
			$(".marketSelectable").remove()
			$(".marketSelectable").off()
			$(".marketIneligible").remove()
			$(".marketIneligible").off()
		})
	}

	// WARNING: THIS is now Div ELEMENT
	this.clickedOnDealership = function (e) {
		if (M.preventMultipleDealershipUses !== e.data.dealership[0] && M.preventMultipleDealershipUses !== -1) return
		// Chcek if no sales window placed
		$(".marketIneligible").remove()
		$(".marketSelectable").remove()
		M.historyObj.splice(0, M.historyObj.length)
		M.historyObjV2.splice(0)

		M.historyObj.push(e.data.dealership[0])
		M.historyObjV2.push(e.data.dealership[0])

		if (e.data.dealership[MW_IDX][0] == -1) {
			C.enableMarketWindowPlacement(e.data.dealership)
			M.historyObj.push(-1)
			M.historyObjV2.push([0, -1, -1])
		} else {
			M.historyObj.push(e.data.dealership[MW_IDX][0])
			let HISTindex = e.data.dealership[MW_IDX][0]
			const MWsize = e.data.dealership[MW_IDX][2]
			if (MWsize === 0 && e.data.dealership[MW_IDX][1] === 1) HISTindex--
			else if (MWsize === 0 && e.data.dealership[MW_IDX][1] === 2) HISTindex -= 8
			else if (MWsize === 1) HISTindex--
			else if (MWsize === 2) HISTindex -= 2
			M.historyObjV2.push([1, HISTindex, MWsize])
			if (MWsize === 0 && ![0, 2].includes(e.data.dealership[MW_IDX][1])) M.historyObjV2[M.historyObjV2.length - 1].push(1)

			C.enableSellingForDealership(e.data.dealership)
		}
	}

	this.enableMarketWindowPlacement = function (dealership) {
		this.model.MWrotation = 0
		var p = this.currentPlayer()
		// Get the market window size
		var adjMarketingDeparmentData = p.factory.getAllComponentDataOfDirectConnectionsToComponentIndex(dealership[1])
		adjMarketingDeparmentData = adjMarketingDeparmentData.filter(function (componenet) {
			return DEPARTMENTS_MARKETING.includes(componenet[0])
		})
		var MWsize = Math.min(2, adjMarketingDeparmentData.length)
		// add rotation area
		C.addResetButton()
		$("#MWrotationDiv").remove()
		var MWrotationDiv = $("<div></div>")
		MWrotationDiv.attr("id", "MWrotationDiv")
		var buttonL = $("<img>")
		var buttonR = $("<img>")
		var svgRot = $("<img>")
		buttonL.attr("src", imagePreURL + "/rot_anticlockwise.svg")
		buttonR.attr("src", imagePreURL + "/rot_clockwise.svg")
		svgRot.attr("src", imagePreURL + "/mw_0.svg")
		svgRot.attr("id", "svgRot")

		if (MWsize === 0) svgRot.attr("src", imagePreURL + "/mw_0.svg")
		else if (MWsize === 1) svgRot.attr("src", imagePreURL + "/mw_1.svg")
		else if (MWsize === 2) svgRot.attr("src", imagePreURL + "/mw_2.svg")
		buttonL.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "5px",
		})
		buttonR.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "5px",
		})
		svgRot.css({
			width: "50px",
			height: "50px",
		})

		MWrotationDiv.append(buttonL)
		MWrotationDiv.append("&nbsp;&nbsp;")
		MWrotationDiv.append(svgRot)

		MWrotationDiv.append("&nbsp;&nbsp;")
		MWrotationDiv.append(buttonR)

		$("#actions").append(MWrotationDiv)

		if (MWsize > 0) {
			this.model.MWrotation = 1
			$("#svgRot").addClass("r" + String(M.MWrotation))
		}

		buttonR.on("click", function () {
			$("#svgRot").removeClass("r" + String(M.MWrotation))
			M.MWrotation++
			if (M.MWrotation === 4) M.MWrotation = 0
			$("#svgRot").addClass("r" + String(M.MWrotation))
		})
		buttonL.on("click", function () {
			$("#svgRot").removeClass("r" + String(M.MWrotation))
			M.MWrotation--
			if (M.MWrotation === -1) M.MWrotation = 3
			$("#svgRot").addClass("r" + String(M.MWrotation))
		})
		V.addHighlightsOnMouseOverToElement(buttonR)
		V.addHighlightsOnMouseOverToElement(buttonL)

		// Get all squares that can't meet tech and highlight red
		var nichesEligibility = this.model.getNichesEligibilityForDealership(dealership)

		V.drawMarketSquares(nichesEligibility[0], "green", "marketSelectable")
		V.drawMarketSquares(nichesEligibility[1], "red", "marketIneligible")
		$("#wholeMarketBoardDiv .marketSelectable").on("click", { self: self, dealership: dealership, MWsize: MWsize }, V.tryToPlaceMarketWindow)
		$("#wholeMarketBoardDiv .marketSelectable").on("mouseover", { self: self, dealership: dealership, MWsize: MWsize }, V.nicheMouseOnHighlight)
	}

	this.enableSellingForDealership = function (dealership, fromMWplacement) {
		var sellingNichesEligibility = this.model.getSellingNichesEligibilityForDealership(C.currentPlayer(), dealership)
		if (sellingNichesEligibility[0].length == 0) {
			M.historyObj.push(-1)
			M.historyObjV2.push(-1)
			$("#actions").empty()
			$("#actions").append(gettext("No sales possible"))
			dealership[SE_IDX] = -1

			C.addResetButton()

			C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End turn"))
		} else {
			if (!fromMWplacement) C.addResetButton()

			V.drawMarketSquares(sellingNichesEligibility[0], "green", "marketSelectable")
			V.drawMarketSquares(sellingNichesEligibility[1], "red", "marketIneligible")
			$("#wholeMarketBoardDiv .marketSelectable").on("click", { self: self, dealership: dealership }, C.processSalesClick)
		}
	}

	this.processSalesClick = function (e) {
		var MBindex = $(e.currentTarget).data("index")
		var dealership = e.data.dealership
		C.actionSales(MBindex, dealership, false)
	}

	this.actionSales = function (MBindex, dealership, autoSale) {
		var p = C.currentPlayer()
		var stock = p.factory.getStockForDealership(dealership)

		var histTotalIncome = 0
		var histSales = [
			[0, 0, -1],
			[0, 0, -1],
			[0, 0, -1],
		]

		for (var i = 0; i < stock.length; i++) {
			if (stock[i] > 0 && M.marketBoard[MBindex][3 + i] > 0) {
				while (stock[i] > 0 && M.marketBoard[MBindex][3 + i] > 0) {
					// Remove from local stock data
					stock[i]--
					histSales[i][0]++
					histSales[i][2] = MBindex
					// Remove from factory data
					p.factory.removeItemFromMainlineAdjacentToDealership(dealership, i)
					// Remove from niche
					M.marketBoard[MBindex][3 + i]--
					// Add players money
					if (PRICE_BAND_0_SQS.includes(MBindex)) {
						p.money += M.priceBand[0]
						histSales[i][1] = M.priceBand[0]
						histTotalIncome += M.priceBand[0]
					} else if (PRICE_BAND_1_SQS.includes(MBindex)) {
						p.money += M.priceBand[1]
						histSales[i][1] = M.priceBand[1]
						histTotalIncome += M.priceBand[1]
					} else if (PRICE_BAND_2_SQS.includes(MBindex)) {
						p.money += M.priceBand[2]
						histSales[i][1] = M.priceBand[2]
						histTotalIncome += M.priceBand[2]
					} else if (PRICE_BAND_3_SQS.includes(MBindex)) {
						p.money += M.priceBand[3]
						histSales[i][1] = M.priceBand[3]
						histTotalIncome += M.priceBand[3]
					}
					// 1 bonus for truck, 2 for sports
					histTotalIncome += i
					p.money += i
				}
			}
		}

		// NEEDED TO SOLVE ENDLESS LOOP ISSUE (but this alone can prevent final sale. Fix in RULES skip)
		if (histTotalIncome === 0) autoSale = false

		if (autoSale) {
			// Must come from a placed MW
			M.historyObj.push(dealership[0])
			M.historyObj.push(dealership[MW_IDX][0])
			M.historyObjV2.push(dealership[0])
			let HISTindex = dealership[MW_IDX][0]
			const MWsize = dealership[MW_IDX][2]
			if (MWsize === 0 && dealership[MW_IDX][1] === 1) HISTindex--
			else if (MWsize === 0 && dealership[MW_IDX][1] === 2) HISTindex -= 8
			else if (MWsize === 1) HISTindex--
			else if (MWsize === 2) HISTindex -= 2

			M.historyObjV2.push([1, HISTindex, MWsize])
			if (MWsize === 0 && ![0, 2].includes(dealership[MW_IDX][1])) M.historyObjV2[M.historyObjV2.length - 1].push(1)
		}
		M.historyObj.push(histSales)
		M.historyObj.push(histTotalIncome)
		M.historyObjV2.push(histSales)
		M.historyObjV2.push(histTotalIncome)

		// If auto selling, add the history now
		if (autoSale) {
			M.historyObj.push(1)
			M.historyObjV2.push(1)
			//M.log(Log.SALES, [...M.historyObj], M.gameFlow.turnOrder[0])
			M.log(Log.SALES_V2, [...M.historyObjV2], M.gameFlow.turnOrder[0])
			M.historyObj.splice(0, M.historyObj.length)
			M.historyObjV2.splice(0)
			M.justAutoSold = true
		}

		// End turn / undo
		V.render()

		// remove highlights
		$(".marketSelectable").remove()
		$(".marketSelectable").off()
		$(".marketIneligible").remove()
		$(".marketIneligible").off()

		$("#actions").empty()
		$("#actions").append("Sales Complete")

		C.addResetButton()

		C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End turn"))
	}

	/**************************************************************************************************************
	 *
	 * PHASE 8 : Grow Demands
	 *
	 **************************************************************************************************************/

	this.enableGrowDemands = function () {
		var i = 0
		// delete info from build
		delete global.move
		for (i = 0; i < this.model.players.length; i++) {
			this.model.players[i].factory.factoryComponenetIndexesAddedThisTurn.splice(0, this.model.players[i].factory.factoryComponenetIndexesAddedThisTurn.length)
		}

		$("#actions").empty()
		$("#actions").append(this.view.displayAllDealershipsWithStock())

		$("#actions").append("<B>" + gettext("Choose a card, then select the quadrant you wish to add it to") + "</b><BR/>")
		var p = this.currentPlayer()
		var availableCardsDiv = $("<div></div>")
		availableCardsDiv.css({
			position: "relative",
			display: "flex",
			floar: "left",
			width: "fit-content",
			height: "fit-content",
			padding: "3px",
			margin: "0 auto",
		})
		var possibleCards = []
		var maxCard = 17
		if (this.model.gameFlow.turn === 1) maxCard = 3
		if (this.model.gameFlow.turn === 2) maxCard = 9
		if (this.model.gameFlow.turn === 3) maxCard = 15
		for (i = 0; i < p.playerCards.length; i++) {
			if (p.playerCards[i] <= maxCard) possibleCards.push(p.playerCards[i])
		}
		var availCardsDiv = V.getAvailableCardsDiv(p.colour, possibleCards)

		availableCardsDiv.append(availCardsDiv)
		$("#actions").append(availableCardsDiv)
		var alreadyPlayedCardsDiv = V.getAlreadyPlayedCardsDiv()
		$("#actions").append(alreadyPlayedCardsDiv)
		if (global.debug) this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, "End Debug")
	}

	// WARNING: THIS is now Div ELEMENT
	this.clickedOnCard = function (e) {
		V.render(-1)
		$(".availableCardsImg").removeClass("activeCard")
		$(".availableCardsImg").css({ border: "3px solid black" })
		this.classList.add("activeCard")
		this.style.border = "3px solid lightgreen"
		C.currentPlayer.pcap = e.data.pcap
		V.enableQuadrantSelectionForCard(this.id)
	}

	this.clickedOnQ = function (e) {
		var Q = parseInt(this.id.slice(1, 2))
		var cardName = $(e.currentTarget).data("card").slice(4)
		var cardData = getCardDataFromCardName(cardName)
		M.alreadyPlayedCards.push([C.currentPlayer().colour, Q, cardData, cardName])
		// Remove card from player

		M.log(Log.PLAY_CARD, [Q])

		C.currentPlayer().playerCards.splice(C.currentPlayer.pcap, 1)
		delete C.currentPlayer.pcap

		V.render(-1)
		$("#actions").empty()

		$("#actions").append("")
		var alreadyPlayedCardsDiv = V.getAlreadyPlayedCardsDiv()
		$("#actions").append(alreadyPlayedCardsDiv)

		C.addResetButton()

		C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End Turn"))
	}

	/**************************************************************************************************************
	 *
	 * End Turn ETC
	 *
	 **************************************************************************************************************/

	this.endPlayerTurn = function () {
		$("#nudgeDiv").remove()
		if (this.model.sandboxMode) {
			alert(gettext("You are in sandbox mode. Please refresh the page"))
			return
		}
		delete global.expansionReset
		this.model.gameFlow.subphase = 0

		// Log action
		if (this.model.gameFlow.phase === PHASE_FACTORY_SETUP) {
			this.model.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn.splice(0, this.model.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn.length)
			this.model.log(Log.FACTORY_SETUP, [])
		} else if (this.model.gameFlow.phase === PHASE_RESEARCH) {
			this.model.log(Log.RESEARCH, [...this.model.historyObj], this.model.gameFlow.turnOrder[0])
			this.model.historyObj.splice(0, this.model.historyObj.length)
		} else if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			// Need to finish off the expansion process
			this.currentPlayer().factory.collapseFactoryAfterExpansion()
			// needs a render, but this is done at the end
		} 
		// NB sales phase is handled in its own function
		else if (this.model.gameFlow.phase === PHASE_GROW_DEMANDS) {
			// remove here, as all players will make this move
			this.model.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn.splice(0, this.model.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn.length)
		}

		// Clear vars
		delete global.fullreset
		this.model.setupSubPhase = 0
		this.model.piecesUsedInResearch.splice(0, this.model.piecesUsedInResearch.length)
		this.model.alreadySetFocus = 0

		// remove action areas
		$(".piece").off()
		$("#actions").empty()
		$("#eligibleComponentsDiv").empty()

		// add current player to ready
		this.model.gameFlow.ready.push(this.currentPlayer())
		//  remove current player from turnOrder
		// remove player form turn order

		if (!Rules.isSimulPhase()) this.model.gameFlow.turnOrder.splice(0, 1)
		else if (this.model.gameFlow.turn === 0) {
			var index = this.model.gameFlow.turnOrder.indexOf(global.pov)
			this.model.gameFlow.turnOrder.splice(index, 1)
		}

		if (this.model.gameFlow.turn === 0) {
			if (this.model.trainingGame) IO.saveGame(this.model)
			else IO.saveTurnZeroMove(this.model)
		} else if (this.model.gameFlow.phase !== PHASE_BUILD_FACTORY) {
			IO.saveGame(this.model)
		} else if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			// Cannot be sure if we are first in turn order or not
			if (M.trainingGame) IO.saveGame(this.model)
			else IO.saveFactoryMove(this.model, this.model.players[global.pov])
		}

		if (M.trainingGame) V.render()

		if (this.model.gameFlow.turnOrder.length > 0) {
			this.model.gameFlow.currentPlayer = this.model.gameFlow.turnOrder[0]
			if (MARKET_BOARD_PHASES.includes(this.model.gameFlow.phase)) V.render(-1)
			if (M.trainingGame) this.startActions()
		}
	}

	this.endPlayerSalesTurn = async function () {
		if (this.model.sandboxMode) {
			alert(gettext("You are in sandbox mode. Please refresh the page"))
			return
		}

		if (this.model.players[this.model.gameFlow.turnOrder[0]].name !== "HcBot") {
			//this.model.log(Log.SALES, [...this.model.historyObj], this.model.gameFlow.turnOrder[0])
			this.model.log(Log.SALES_V2, [...this.model.historyObjV2], this.model.gameFlow.turnOrder[0])
		}
		this.model.historyObj.splice(0, this.model.historyObj.length)
		this.model.historyObjV2.splice(0)

		delete global.fullreset

		this.model.preventMultipleDealershipUses = -1
		this.model.MWrotation = 0
		$(".piece").off()
		$("#actions").empty()
		$("#eligibleComponentsDiv").empty()
		// remove MB highlights
		$(".marketIneligible").remove()
		$(".marketSelectable").remove()
		// Move player to back of queue
		this.model.gameFlow.turnOrder.push(this.model.gameFlow.turnOrder.shift())
		while (this.model.gameFlow.turnOrder.length > 0 && Rules.canSkipCurrentSellingPlayer(this.model.players[this.model.gameFlow.turnOrder[0]])[0] && this.model.gameFlow.phase === PHASE_SELL) {
			if (!this.model.justAutoSold) this.model.gameFlow.ready.push(this.currentPlayer())
			if (!this.model.justAutoSold) this.model.log(Log.SALES_SKIP, Rules.canSkipCurrentSellingPlayer(this.model.players[this.model.gameFlow.turnOrder[0]])[1])

			if (!this.model.justAutoSold) this.model.gameFlow.turnOrder.splice(0, 1)

			if (this.model.justAutoSold) this.model.gameFlow.turnOrder.push(this.model.gameFlow.turnOrder.shift())
			this.model.justAutoSold = false
		}

		if (this.model.gameFlow.turnOrder.length !== 0) {
			// Do a save now
			IO.saveGame(this.model)
			V.render(-1)
		}
		if (this.model.gameFlow.turnOrder.length === 0) {
			await this.moveToNextPhase()
			await IO.saveGame(this.model)
		} else this.startActions()
	}

	this.moveToNextPhase = function () {
		var i = 0
		var j = 0
		var k = 0
		var factory

		// clear all ready players
		this.model.gameFlow.ready.splice(0, this.model.gameFlow.ready.length)

		var oldPhase = this.model.gameFlow.phase
		if (oldPhase === PHASE_FACTORY_SETUP) {
			if (!this.model.trainingGame) {
				for (i = 0; i < this.model.players.length; i++) {
					this.model.log(Log.FACTORY_SETUP, [], i, Math.round((new Date().getTime() - IO.timeOffset) / 1000) - (6 - i))
				}
			}

			Rules.playNeutralCards() // MOVE THIS AFTER FIRST FAC SETUP
			Rules.setCurrentMarketBoardPrices()

			this.model.gameFlow.turn = 1
			this.model.log(Log.NEW_TURN, [this.model.gameFlow.turn])
			this.model.gameFlow.phase = PHASE_RESEARCH
			this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]
			this.model.gameFlow.currentPlayer = this.model.gameFlow.turnOrder[0]
			this.model.piecesUsedInResearch.splice(0, this.model.piecesUsedInResearch.length)
			V.render(-1)
		} else if (oldPhase === PHASE_RESEARCH) {
			// Start SET FOCUS
			this.model.gameFlow.phase = PHASE_SET_FOCUS

			// Check vars are empty
			this.model.prevEngFocusOrder.splice(0, this.model.prevEngFocusOrder.length)
			this.model.newEngFocusOrder.splice(0, this.model.newEngFocusOrder.length)

			// set up vars
			this.model.prevEngFocusOrder = [...this.model.gameFlow.unalteredTurnOrder]
			for (i = 0; i < this.model.players.length; i++) this.model.newEngFocusOrder.push(-1)

			var ganttOrder = []
			for (i = 0; i < this.model.prevEngFocusOrder.length; i++) {
				ganttOrder.push([this.model.prevEngFocusOrder[i], this.model.players[this.model.prevEngFocusOrder[i]].gantt])
			}

			ganttOrder.sort(function (a, b) {
				return b[1] - a[1]
			})
			for (i = 0; i < ganttOrder.length; i++) {
				this.model.gameFlow.turnOrder.push(ganttOrder[i][0])
			}
			this.model.gameFlow.unalteredTurnOrder = [...this.model.gameFlow.turnOrder]
			V.render(-1)
		} else if (oldPhase === PHASE_SET_FOCUS) {
			// Need to fill up new eng focus with leftover people
			// It just works in reverse
			for (i = this.model.newEngFocusOrder.length - 1; i >= 0; i--) {
				if (this.model.newEngFocusOrder[i] === -1) {
					// replace with first unused number in oldOld
					for (j = 0; j < this.model.prevEngFocusOrder.length; j++) {
						if (!this.model.newEngFocusOrder.includes(this.model.prevEngFocusOrder[j])) this.model.newEngFocusOrder[i] = this.model.prevEngFocusOrder[j]
					}
				}
			}

			// Start BUILD FACTORY
			this.model.gameFlow.phase = PHASE_BUILD_FACTORY

			this.model.gameFlow.turnOrder = [...this.model.newEngFocusOrder]
			this.model.gameFlow.unalteredTurnOrder = [...this.model.gameFlow.turnOrder]

			// set up vars
		} else if (oldPhase === PHASE_BUILD_FACTORY) {
			// start Print Sales Brochues
			this.model.gameFlow.phase = PHASE_PRINT_SALES_BROCHURES

			// Each player increases gantt by no. planning offices.
			var ganttHist = []
			for (i = 0; i < this.model.players.length; i++) {
				if (this.model.players[i].autoplay !== true) {
					var clockReduction = 0
					if (this.model.players[i].gantt < 10 && this.model.players[i].gantt + Rules.getNumberOfPlanningOffices(this.model.players[i]) >= 10) clockReduction = 1

					this.model.players[i].gantt += Rules.getNumberOfPlanningOffices(this.model.players[i])
					// limit to max 20
					this.model.players[i].gantt = Math.min(20, this.model.players[i].gantt)

					this.model.punchClockNumber -= clockReduction
					ganttHist.push([this.model.players[i].name, Rules.getNumberOfPlanningOffices(this.model.players[i]), clockReduction])
				}
				// Each players dealershup produces vehicles accoeding to the assem capac track
				factory = this.model.players[i].factory
				for (j = 0; j < factory.factoryComponents.length; j++) {
					if (MAINLINES.includes(factory.factoryComponents[j][0])) {
						for (k = 0; k < this.model.assemblyCapacityTrack.length; k++) if (this.model.assemblyCapacityTrack[k].indexOf(this.model.players[i].colour) > -1) factory.factoryComponents[j][SL_IDX] = k + 1
					}
				}
			}
			this.model.log(Log.INCREASE_GANTT, [...ganttHist], -1)

			// Each players dealershup produces car

			this.model.gameFlow.phase = PHASE_SELL

			this.model.gameFlow.unalteredTurnOrder.reverse()
			this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]

			// Check if we can skip the 1st player
			while (this.model.gameFlow.turnOrder.length > 0 && Rules.canSkipCurrentSellingPlayer(this.model.players[this.model.gameFlow.turnOrder[0]])[0] && this.model.gameFlow.phase === PHASE_SELL) {
				this.model.gameFlow.ready.push(this.currentPlayer())

				this.model.log(Log.SALES_SKIP, Rules.canSkipCurrentSellingPlayer(this.model.players[this.model.gameFlow.turnOrder[0]])[1])

				this.model.gameFlow.turnOrder.splice(0, 1)
				if (this.model.gameFlow.turnOrder.length === 0) this.moveToNextPhase()
			}
			// THIS IS THEN SAVED BY THE PLAYER ENDING FACTORY BUILD
			V.render(-1)
		} else if (oldPhase === PHASE_SELL) {
			// Produce a selling summary
			var relevantSellingLogs = []
			const ACTIONS_FOR_SALES_HISTORY = [Log.SALES, Log.SALES_V2, Log.SALES_SKIP, Log.REWIND, Log.RESIGN, Log.KICKOUT]

			i = this.model.logs.length - 1
			while (ACTIONS_FOR_SALES_HISTORY.includes(this.model.logs[i].action)) {
				if (this.model.logs[i].action === Log.SALES && this.model.logs[i].param[2] !== -1) relevantSellingLogs.push(this.model.logs[i])
				if (this.model.logs[i].action === Log.SALES_V2 && this.model.logs[i].param[2] !== -1) relevantSellingLogs.push(this.model.logs[i])
				i--
			}

			// Now collect the number of cars / sports / trucks sold by each player, and a grand total

			var salesSummaryHist = []
			for (i = 0; i < this.model.players.length; i++)
				salesSummaryHist.push([
					[
						[0, 0],
						[0, 0],
						[0, 0],
					],
					[
						[0, 0],
						[0, 0],
						[0, 0],
					],
					[
						[0, 0],
						[0, 0],
						[0, 0],
					],
					0,
				])

			/* salesSummaryHist corresponds to M.players order
				[0] = player 0
					[0][0-2] = player 0's dealerships, each wtih [VamountSold, PricePerV no bonus] c 3
					[0][3] = Total income with bonuses
			*/
			for (i = 0; i < relevantSellingLogs.length; i++) {
				/* Each log has:
						player: Index of M.players
						action:	8 (sell)
						param:  0 - ComponentName of Dealership
								1 - MW Index => either -1 if placed, or index if used
									NB THESE PRICES DO NOT INCLUDE THE BONUSES
								2 - [CarAmountSold, PricePerCar], [TruckAmountSold, PricePerTruck], [SportsAmountSold, PricePerSports]  
								3 - TOTAL income of this sale, including bonuses
						timestamps: (whatever)
				*/

				// Find the indexes to use
				var playerIndex = relevantSellingLogs[i].player
				var dealershipIndex = (relevantSellingLogs[i].param[0] - 40) % 3
				// Add the sales info
				for (j = 0; j < relevantSellingLogs[i].param[2].length; j++) {
					salesSummaryHist[playerIndex][dealershipIndex][j][0] += relevantSellingLogs[i].param[2][j][0]
					salesSummaryHist[playerIndex][dealershipIndex][j][1] += relevantSellingLogs[i].param[2][j][1]
				}
				// Add total sales
				salesSummaryHist[playerIndex][3] += relevantSellingLogs[i].param[3]
			}

			this.model.log(Log.SALES_SUMMARY, [...salesSummaryHist])

			// End of selling summary
			this.model.gameFlow.phase = PHASE_GAME_END_CHECK

			if (this.model.punchClockNumber <= 0) this.model.gameEnded = 1
			if (this.model.gameFlow.turn >= 7) this.model.gameEnded = 2

			if (this.model.gameEnded > 0) {
				// Find winner. Sort players by sakes focus, then move highgest money to front
				this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]
				var moneyInSalesOrder = []
				for (i = 0; i < this.model.gameFlow.turnOrder.length; i++) {
					moneyInSalesOrder.push([this.model.gameFlow.turnOrder[i], this.model.players[this.model.gameFlow.turnOrder[i]].money])
				}
				moneyInSalesOrder.sort(function (a, b) {
					return b[1] - a[1]
				})

				for (i = 0; i < this.model.players.length; i++) {
					this.model.gameFlow.unalteredTurnOrder[i] = moneyInSalesOrder[i][0]
					this.model.gameFlow.turnOrder[i] = moneyInSalesOrder[i][0]
				}

				this.model.log(Log.GAME_END, [this.model.players[this.model.gameFlow.unalteredTurnOrder[0]].name, this.model.gameEnded])
				global.winner = this.model.players[this.model.gameFlow.unalteredTurnOrder[0]].name
				V.render(-1)
				return
			}

			this.model.gameFlow.phase = PHASE_ADVANCE_EXPECTATIONS
			this.model.historyObj.splice(0, this.model.historyObj.length)

			// Remove old sales windows from model
			for (i = 0; i < this.model.players.length; i++) {
				for (j = 0; j < this.model.players[i].factory.factoryComponents.length; j++) {
					var component = this.model.players[i].factory.factoryComponents[j]
					if (DEALERSHIPS.includes(component[0])) {
						// reset sales window data
						component[MW_IDX][0] = -1
						component[MW_IDX][1] = -1
						component[MW_IDX][2] = -1
					}
				}
			}

			// Find the new TT from the off board ones
			var innovations = [0, 0, 0, 0, 0]
			var maxPastMinMarker = [0, 0, 0, 0, 0]
			for (i = 2; i <= 4; i++) {
				var minTech = this.model.techTracks[i][7][1]
				for (j = minTech + 1; j < this.model.techTracks[i].length - 1; j++) {
					innovations[i] += this.model.techTracks[i][j].length * (j - minTech)
					if (this.model.techTracks[i][j].length > 0) maxPastMinMarker[i] = j - this.model.techTracks[i][7][1]
				}
			}

			var max = Math.max(...innovations)
			var res = []
			var winner = -1
			innovations.forEach((item, index) => (item === max && index >= 2 ? res.push(index) : null))

			if (res.length != 1) {
				for (i = 0; i < maxPastMinMarker.length; i++) {
					if (!res.includes(i)) maxPastMinMarker[i] = 0
				}

				var maxMaxPastMinMarker = Math.max(...maxPastMinMarker)
				for (i = 0; i < res.length; i++) {
					if (maxPastMinMarker[res[i]] < maxMaxPastMinMarker) res[i] = -1
				}
			}
			// Now remove the -1s
			res = res.filter(function (val) {
				return val !== -1
			})
			if (res.length > 1) {
				winner = Math.min(...res)
			} else winner = res[0]

			// log the colour of the old TT 0
			this.model.historyObj.push(this.model.techTracks[this.model.obsolescenceMarkerDirection][7][0])

			// log the new value of the min demand 1
			this.model.historyObj.push(this.model.techTracks[this.model.obsolescenceMarkerDirection][7][1] + 1)

			// Add the off board innovation levels
			this.model.historyObj.push([
				[innovations[2], this.model.techTracks[2][7][0], maxPastMinMarker[2]],
				[innovations[3], this.model.techTracks[3][7][0], maxPastMinMarker[3]],
				[innovations[4], this.model.techTracks[4][7][0], maxPastMinMarker[4]],
			])

			// log the colour of the winning tech track 2
			this.model.historyObj.push(this.model.techTracks[winner][7][0])

			// Now increase the min demand of the obs one by 1
			this.model.techTracks[this.model.obsolescenceMarkerDirection][7][1]++

			// Now swap the winning TT with the obs one
			;[this.model.techTracks[this.model.obsolescenceMarkerDirection], this.model.techTracks[winner]] = [this.model.techTracks[winner], this.model.techTracks[this.model.obsolescenceMarkerDirection]]
			// now push the old TT to the end (now in winner position)
			this.model.techTracks.push([...this.model.techTracks[winner]])

			// Now splice out the old one in the winner position
			this.model.techTracks.splice(winner, 1)

			// switch the obs marker
			if (this.model.obsolescenceMarkerDirection === 1) this.model.obsolescenceMarkerDirection = 0
			else this.model.obsolescenceMarkerDirection = 1

			// log the new obsmarker direction
			this.model.historyObj.push(this.model.obsolescenceMarkerDirection)

			this.model.log(Log.ADVANCE_EXPECTATIONS, [...this.model.historyObj], -1)
			this.model.historyObj.splice(0, this.model.historyObj.length)

			this.model.gameFlow.phase = PHASE_GROW_DEMANDS
			this.model.gameFlow.unalteredTurnOrder.reverse()
			this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]

			// Add stock back in to display dealerships
			for (i = 0; i < this.model.players.length; i++) {
				// Each players dealershup produces vehicles accoeding to the assem capac track -- this is simply set to the correct max value
				factory = this.model.players[i].factory
				for (j = 0; j < factory.factoryComponents.length; j++) {
					if (MAINLINES.includes(factory.factoryComponents[j][0])) {
						for (k = 0; k < this.model.assemblyCapacityTrack.length; k++) if (this.model.assemblyCapacityTrack[k].indexOf(this.model.players[i].colour) > -1) factory.factoryComponents[j][SL_IDX] = k + 1
					}
				}
			}
			V.render(-1)

			// Check for any skips
			while (this.currentPlayer().playerCards.length === 0) {
				M.log(Log.NO_CARDS, [], M.gameFlow.turnOrder[0])
				this.model.gameFlow.turnOrder.shift()
				if (this.model.gameFlow.turnOrder.length === 0) {
					this.moveToNextPhase()
					return
				}
			}
		} else if (oldPhase === PHASE_GROW_DEMANDS) {
			// Add sparks to model, take away clocks
			var totalClocks = 0
			for (i = 0; i < this.model.alreadyPlayedCards.length; i++) {
				var clocks = this.model.alreadyPlayedCards[i][2][0]
				// Take away clocks
				this.model.punchClockNumber -= clocks
				totalClocks += clocks

				var Q = this.model.alreadyPlayedCards[i][1]
				var cardData = this.model.alreadyPlayedCards[i][2]
				for (j = 1; j < cardData.length; j++) {
					var Xcoord = 0
					var Ycoord = 0
					if (Q === 1) Ycoord = 4
					if (Q === 4) Xcoord = 4
					if (Q === 2) {
						Xcoord = 4
						Ycoord = 4
					}
					Xcoord = Xcoord + cardData[j][0]
					Ycoord = Ycoord + cardData[j][1]
					var index = this.model.getIndexForMBcoord([Xcoord, Ycoord])
					this.model.marketBoard[index][cardData[j][2]]++
				}
			}
			this.model.log(Log.SHOW_CARDS, [totalClocks, [...this.model.alreadyPlayedCards]], -1)
			//remove data
			this.model.alreadyPlayedCards.splice(0, this.model.alreadyPlayedCards.length)

			// Sparks add Demand
			for (i = 0; i < this.model.marketBoard.length; i++) {
				for (j = 0; j < 3; j++) {
					var vehiclesToAdd = this.model.marketBoard[i][j]
					var maxVehicles = this.model.marketBoard[i][j] * 2
					while (this.model.marketBoard[i][j + 3] < maxVehicles && vehiclesToAdd > 0) {
						this.model.marketBoard[i][j + 3]++
						vehiclesToAdd--
					}
				}
			}

			// Add neutral cards
			Rules.playNeutralCards()

			// set prices
			Rules.setCurrentMarketBoardPrices()

			// Empty data
			this.model.alreadyPlayedCards.splice(0, this.model.alreadyPlayedCards.length)

			this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]

			// Set Phase & Clear data
			this.model.gameFlow.phase = PHASE_RESEARCH
			this.model.piecesUsedInResearch.splice(0, this.model.piecesUsedInResearch.length)

			this.model.gameFlow.turn++
			this.model.log(Log.NEW_TURN, [this.model.gameFlow.turn])
			V.render(-1)
		}

		// MOVE BOTS TO START OF TURN ORDER AND SKIP
		Bot.correctTurnOrderForBots(this.model)

		// Useed in IO.saveGame
		return this.model
	}

	this.sayBeep = function () {
		if (global.liveNotification > 0) {
			if (this.beep == undefined) {
				if (global.liveNotification == 1) this.beep = new Audio(soundPreURL + "beep.mp3")
				if (global.liveNotification == 2) this.beep = new Audio(soundPreURL + "bell.mp3")
			}
			this.beep.play()
		}
	}

	this.model = _model
	this.view = _view
}
