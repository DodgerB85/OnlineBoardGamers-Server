var HISTORY_LENGTH = 20

var Log = {
	// actions possible
	P_CARD_AREA: '<svg class="CLASS"><rect stroke-linejoin="round" fill-rule="evenodd" rx="2.5px" ry="2.5px" height="25px" width="25px" stroke="#000" y="2.5px" x="2.5px" stroke-width="2.5px" fill="none"/><rect stroke-linejoin="round" fill-rule="evenodd" rx="2.5px" ry="2.5px" height="12.5px" width="12.5px" stroke="#000" y="2.5px" x="2.5px" stroke-width="2.5px" fill="COLOUR"/></svg>',

	SETUP_GAME: 0,
	FACTORY_SETUP: 1,
	RESEARCH: 2,
	SET_FOCUS: 3,
	// FIXED AND USED IN DB
	FACTORY_EXPAND: 4,
	SALES_SKIP: 5,
	PLAY_CARD: 6,
	INCREASE_GANTT: 7,
	SALES: 8,
	ADVANCE_EXPECTATIONS: 9,
	SHOW_CARDS: 10,
	NEUTRAL_CARDS: 11,
	SALES_SUMMARY: 12,
	// USED IN DB
	FACTORY_BUILD: 13,
	NO_CARDS: 14,

	NEW_TURN: 23,
	GAME_END: 24,

	REWIND: 34,
	RESIGN: 35,
	KICKOUT: 36,
	//////////////////////////////////////
	DISPLAY_RESERVE: 20,
	FIRE: 21,
	DELETE_RESOURCES: 22,

	BANKRUPT: 25,
	TOTAL_BANKRUPT: 26,
	ONE_LEFT: 27,

	TECH_LOGS: [0],

	log: function (model, player, action, param, timestamp) {
		if (timestamp == undefined) timestamp = Math.round((new Date().getTime() - IO.timeOffset) / 1000)
		if (timestamp < 0) timestamp = 0

		if (this.TECH_LOGS.indexOf(action) == -1) {
			this.history(model, player, action, param, timestamp)
		}

		if (model.logs == undefined) model.logs = []
		model.logs.push({
			player: player,
			action: action,
			param: param,
			timestamp: timestamp,
		})
	},

	history: function (model, player, action, param, timestamp) {
		if (this.TECH_LOGS.indexOf(action) == -1) {
			var div = $('<div class="log">')

			var strPlayer = ""
			if (player > -1 && player < 63 && player != null && player != undefined) {
				strPlayer = model.players[player].name
				div.addClass("color" + getCorrectedColour(model.players[player].color))
			}

			if (action !== this.NEW_TURN) div.append('<div class="header"><span> ' + this.giveFormattedDate(timestamp * 1000) + " </span></div>")
			else div.addClass("separator")
			div.append(this.giveFullText(strPlayer, action, param))
			if (global.historyOrder == 0) {
				$("#history").prepend(div)
				var histTogDiv = $("#historyToggleDiv")
				histTogDiv.show()
				$("#history").prepend(histTogDiv)
			} else $("#history").append(div)
		}
	},

	giveFullText: function (player, action, param) {
		var playerSpan
		var index
		var colour
		var resDiv
		var col = "black"
		var img
		var cardID
		var showCardsDiv

		if (player !== "") {
			playerSpan = this.getPlayerSpan(player)
			index = M.players.map((item) => item.name).indexOf(player)
			if (index === -1) index = M.players.map((item) => item.originalName).indexOf(player)
			colour = M.players[index].colour
		}

		var i = 0
		var ul

		var res = $("<div>")
		var str = ""
		if (action == this.FACTORY_SETUP) {
			/*res.append(playerSpan);
			res.append(gettext("  sets up factory"));*/

			res.append(
				interpolate(
					gettext("%(playerName)s sets up factory"),
					{
						playerName: playerSpan.prop("outerHTML"),
					},
					true
				)
			)
		} else if (action == this.REWIND) {
			if (param != undefined && param.length == 1) {
				res.append(
					"<div class='rewind'>" +
						interpolate(
							gettext("Game rewound to here by %(playerName)s"),
							{
								playerName: param[0],
							},
							true
						) +
						//gettext("Game rewound to here by") + " " + param[0]
						"</div>"
				)
			}
		} else if (action == this.KICKOUT) {
			if (param != undefined && param.length == 1) {
				//res.append('<div class="rewind">' + param[0] + " " + gettext('was kicked out') + '</div>');
				res.append(
					"<div class='rewind'>" +
						interpolate(
							gettext("%(playerName)s was kicked out"),
							{
								playerName: param[0],
							},
							true
						) +
						"</div>"
				)
			}
		} else if (action == this.RESIGN) {
			if (param != undefined && param.length == 1) {
				res.append('<div class="rewind">' + interpolate(gettext("%(resignedPlayer)s Resigns"), { resignedPlayer: param[0] }, true) + "</div>")
			}
		} else if (action === this.RESEARCH) {
			resDiv = $("<div></div>")
			resDiv.append(playerSpan)
			resDiv.append(" ")

			_.each(
				param,
				function (p) {
					if (p.length === 2) {
						resDiv.append(this.getPlayerTokenFromColour(p[0]))
						resDiv.append(" on " + this.getTrackNameFromCompressedNumberL(p[1]) + "s<BR/>")
					} else if (p.length === 4) {
						var pos = p[2]
						if (p[1] === 5) pos++

						resDiv.append(gettext("moves"))
						resDiv.append(this.getPlayerTokenFromColour(p[0]))
						resDiv.append(" ")
						resDiv.append(gettext("to") + " " + this.getTrackNameFromCompressedNumberL(p[1]) + " " + String(pos))

						if (p[2] === 4 || p[2] === 6) {
							var punchClockImg = $("<img>")
							punchClockImg.attr("src", imagePreURL + "/punch_clock.png")
							punchClockImg.addClass("punchClockHist")
							punchClockImg.css({
								width: "30px",
								height: "30px",
								"vertical-align": "middle",
							})
							resDiv.append(" ")
							resDiv.append(punchClockImg)
							resDiv.append(" -1 (" + p[3] + ")")
						}
						resDiv.append("<BR/>")
					}
				},
				this
			)

			res.append(resDiv)
		} else if (action === this.SET_FOCUS) {
			resDiv = $("<div></div>")
			//resDiv.append(playerSpan);
			if (parseInt(param) === -1) {
				//resDiv.append(" " + gettext("passes and keeps their Gantt"));

				resDiv.append(
					interpolate(
						gettext("%(playerName)s passes and keeps their Gantt"),
						{
							playerName: playerSpan.prop("outerHTML"),
						},
						true
					)
				)
			} else {
				//resDiv.append(" " + gettext("spends all Gantt to choose position:") + " " + String(parseInt(param) + 1));
				resDiv.append(
					interpolate(
						gettext("%(playerName)s spends all Gantt to choose position: %(position)s"),
						{
							playerName: playerSpan.prop("outerHTML"),
							position: String(parseInt(param) + 1),
						},
						true
					)
				)
			}

			res.append(resDiv)
		} else if (action == this.FACTORY_EXPAND) {
			var bldgStr
			res.append(playerSpan)
			res.append("  " + gettext("builds") + " ")
			bldgStr = ""
			_.each(
				param,
				function (p) {
					var nameNumber = p
					if (DEALERSHIPS.includes(p)) {
						var originalColour = Math.floor((p - 40) / 3)
						nameNumber = getCorrectedDealershipColour(p, originalColour)
					}
					bldgStr += "" + COMPONENTS_NAME_STRING[nameNumber] + ", "
				},
				this
			)
			bldgStr = bldgStr.slice(0, -2)
			res.append(bldgStr)
		} else if (action == this.FACTORY_BUILD) {
			res.append(playerSpan)
			res.append("  " + gettext("builds") + " ")
			bldgStr = ""
			var componentNameNumbers = []

			var playerIndex = M.players.findIndex((obj) => obj.name === player)

			for (i = param[1] - param[0]; i < param[1]; i++) {
				// undefined check as crash caused? possibly by not building anything?
				if (M.players[playerIndex].factory.factoryComponents[i] != undefined) componentNameNumbers.push(M.players[playerIndex].factory.factoryComponents[i][0])
			}

			_.each(
				componentNameNumbers,
				function (p) {
					var nameNumber = p
					if (DEALERSHIPS.includes(p)) {
						var originalColour = Math.floor((p - 40) / 3)
						nameNumber = getCorrectedDealershipColour(p, originalColour)
					}
					bldgStr += "" + COMPONENTS_NAME_STRING[nameNumber] + ", "
				},
				this
			)
			bldgStr = bldgStr.slice(0, -2)
			res.append(bldgStr)
			res.css({
				border: "1px solid yellow",
			})
			res.on("mouseover", function (e) {
				$(this).css({
					border: "1px solid green",
					cursor: "pointer",
				})
			})
			res.on("mouseout", function (e) {
				$(this).css({
					border: "1px solid yellow",
				})
			})
			res.on("click", { playerIndex: playerIndex, p0: param[0], p1: param[1] }, Log.clickedOnBuildHistory)
		} else if (action == this.SALES_SKIP) {
			//res.append(playerSpan);
			//res.append("  " + gettext("passes:") + " " + skipStrings[param]);

			res.append(
				interpolate(
					gettext("%(playerName)s passes: %(reason)s"),
					{
						playerName: playerSpan.prop("outerHTML"),
						reason: skipStrings[param],
					},
					true
				)
			)
		} else if (action == this.INCREASE_GANTT) {
			res.append(gettext("Gantt Increases") + "<BR/>")
			_.each(
				param,
				function (p) {
					//res.append(this.getPlayerSpan(p[0]));
					res.append(interpolate(gettext("%(playerName)s gains %(numberOfGantt)s Gantt"), { playerName: this.getPlayerSpan(p[0]).prop("outerHTML"), numberOfGantt: String(p[1]) }, true))

					if (p[2] > 0) {
						var punchClockImg = $("<img>")
						punchClockImg.attr("src", imagePreURL + "/punch_clock.png")
						punchClockImg.addClass("punchClockHist")
						punchClockImg.css({
							width: "30px",
							height: "30px",
							"vertical-align": "middle",
						})
						res.append(" ")
						res.append(punchClockImg)
						res.append(" -1")
					}
					res.append("<BR/>")
				},
				this
			)
		} else if (action == this.SALES) {
			//res.append(playerSpan);
			// param[1] has MW info
			// param[0] has dealership component name
			var originalColour = Math.floor((param[0] - 40) / 3)
			var correctedDshipName = getCorrectedDealershipColour(param[0], originalColour)

			// 0 = dship name
			// 1 = -1, or MB index of MW
			// 2 = -1 if no sellingNicheEligibility
			//	= histSales

			if (param[2] === -1) {
				if (param[1] === -1) res.append(interpolate(gettext("%(playerName)s places %(dealershipName)s but cannot make any sales"), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + "<BR/>")
				else res.append(interpolate(gettext("%(playerName)s uses %(dealershipName)s but cannot make any sales"), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + "<BR/>")
			} else {
				if (param[1] === -1) res.append(interpolate(gettext("%(playerName)s places %(dealershipName)s to sell:"), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + "<BR/>")
				else res.append(interpolate(gettext("%(playerName)s uses %(dealershipName)s to sell"), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + (param[4] === 1 ? " " + gettext("(automatically)") : "") + ":<BR/>")

				var infoAdded = false
				if (typeof param[2][0] === "number") {
					infoAdded = false
					if (param[2][0] > 0) {
						res.append(String(param[2][0]) + " Car" + (param[2][0] > 1 ? "s" : "") + "")
						infoAdded = true
					}
					if (param[2][1] > 0) {
						if (infoAdded) res.append(", ")
						res.append(String(param[2][1]) + " Truck" + (param[2][1] > 1 ? "s" : "") + "")
						infoAdded = true
					}
					if (param[2][2] > 0) {
						if (infoAdded) res.append(", ")
						res.append(String(param[2][2]) + " Sports Car" + (param[2][2] > 1 ? "s" : "") + "")
						infoAdded = true
					}
				} else {
					// New info
					infoAdded = false
					if (param[2][0][0] > 0) {
						const data = {
							carAmount: param[2][0][0],
							eachSaleAmount: param[2][0][1],
						}

						const formats = ngettext("%(carAmount)s Car for $%(eachSaleAmount)s", "%(carAmount)s Cars, each for $%(eachSaleAmount)s", data.carAmount)
						res.append(interpolate(formats, data, true))

						infoAdded = true
					}
					if (param[2][1][0] > 0) {
						if (infoAdded) res.append("<BR/>")
						const data = {
							truckAmount: param[2][1][0],
							eachSaleAmount: param[2][1][1],
						}
						const formats = ngettext("%(truckAmount)s Truck for $%(eachSaleAmount)s plus bonus $1", "%(truckAmount)s Trucks, each for $%(eachSaleAmount)s plus bonus $1", data.truckAmount)
						res.append(interpolate(formats, data, true))

						infoAdded = true
					}
					if (param[2][2][0] > 0) {
						if (infoAdded) res.append("<BR/>")
						const data = {
							sportsAmount: param[2][2][0],
							eachSaleAmount: param[2][2][1],
						}
						const formats = ngettext("%(sportsAmount)s Sports Car for $%(eachSaleAmount)s plus bonus $2", "%(sportsAmount)s Sports Cars, each for $%(eachSaleAmount)s plus bonus $2", data.sportsAmount)
						res.append(interpolate(formats, data, true))

						infoAdded = true
					}
				}
				res.append("<BR>" + gettext("Total Income:") + " $" + String(param[3]))
			}
		} else if (action === this.SALES_SUMMARY) {
			res.append("<span class=salesSummaryTitle>" + gettext("Sales Summary") + "</span>")
			var table = $('<table class="salesSummaryTable"><thead><tr><td class="blankTD"></td><td><img class="salesSummaryVehicle" src="' + imagePreURL + '/v_car.png"></td><td><img class="salesSummaryVehicle" src="' + imagePreURL + '/v_truck.png"></td><td><img class="salesSummaryVehicle" src="' + imagePreURL + '/v_sports.png"></td><td>' + gettext("Total") + "</td></tr></thead></table>")

			for (i = 0; i < param.length; i++) {
				var totalCars = 0
				var totalTrucks = 0
				var totalSports = 0

				// this does all 3 dealerships
				for (j = 0; j < param[i].length - 1; j++) {
					if (param[i][j][0][0] > 0) totalCars += param[i][j][0][0]
					if (param[i][j][1][0] > 0) totalTrucks += param[i][j][1][0]
					if (param[i][j][2][0] > 0) totalSports += param[i][j][2][0]
				}
				var tr = $("<tr>")
				var td = $("<td>")
				td.append(this.getPlayerSpan(M.players[i].name))
				tr.append(td)
				tr.append("<td>" + String(totalCars) + "</td>")
				tr.append("<td>" + String(totalTrucks) + "</td>")
				tr.append("<td>" + String(totalSports) + "</td>")
				tr.append("<td><B>$" + String(param[i][3]) + "</B></td>")
				table.append(tr)
			}
			res.append(table)
		} else if (action == this.ADVANCE_EXPECTATIONS) {
			res.append(gettext("Expectations Advance:") + "<BR/>")
			res.append(interpolate(gettext("%(techTrackName)s has a new min value of %(minValue)s"), { techTrackName: TTnamesFromColour[param[0]], minValue: String(param[1]) }, true) + "<BR/>")

			// 2 is all the innovation levels
			res.append(gettext("Innovation Levels:") + "<BR/>")

			res.append("&nbsp;&nbsp;" + interpolate(gettext("%(techTrackName)s: %(innovationLevel)s - Furthest from Min Marker:  %(furtehstFromMin)s"), { techTrackName: TTnamesFromColour[param[2][0][1]], innovationLevel: String(param[2][0][0]), furtehstFromMin: String(param[2][0][2]) }, true) + "<BR/>")
			res.append("&nbsp;&nbsp;" + interpolate(gettext("%(techTrackName)s: %(innovationLevel)s - Furthest from Min Marker:  %(furtehstFromMin)s"), { techTrackName: TTnamesFromColour[param[2][1][1]], innovationLevel: String(param[2][1][0]), furtehstFromMin: String(param[2][1][2]) }, true) + "<BR/>")
			res.append("&nbsp;&nbsp;" + interpolate(gettext("%(techTrackName)s: %(innovationLevel)s - Furthest from Min Marker:  %(furtehstFromMin)s"), { techTrackName: TTnamesFromColour[param[2][2][1]], innovationLevel: String(param[2][2][0]), furtehstFromMin: String(param[2][2][2]) }, true) + "<BR/>")

			res.append(gettext("New Tech Track Introduced:") + " " + TTnamesFromColour[param[3]])
			res.append("<BR/>" + gettext("Obsolesence Marker points:") + " " + (param[4] === 0 ? gettext("Up") : gettext("Right")))
		} else if (action == this.PLAY_CARD) {
			//res.append(playerSpan);
			col = "black"
			colour = getCorrectedColour(colour)
			if (colour === RED) col = "#E83435"
			if (colour === GREEN) col = "#70C96B"
			if (colour === PURPLE) col = "#8E63B3"
			if (colour === BLUE) col = " #435EB5"
			if (colour === YELLOW) col = "#EECD30"

			img = $(this.P_CARD_AREA.replace(/COLOUR/, col))

			if (param[0] === 4) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r1"))
			if (param[0] === 2) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r2"))
			if (param[0] === 1) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r3"))
			img.css({
				width: "30px",
				height: "30px",
				"margin-right": "5px",
			})
			//res.append("  " + gettext("plays a card"));@
			res.append(
				interpolate(
					gettext("%(playerName)s plays a card"),
					{
						playerName: playerSpan.prop("outerHTML"),
					},
					true
				)
			)
			res.append(img)
		}else if (action == this.NO_CARDS) {
			res.append(
				interpolate(
					gettext("%(playerName)s has no more cards"),
					{
						playerName: playerSpan.prop("outerHTML"),
					},
					true
				)
			)
		} else if (action == this.GAME_END) {
			if (param[1] === 1) res.append("<div class='new_turn'>" + gettext("Game Ended by: Punch Clock") + "</div>")
			if (param[1] === 2) res.append("<div class='new_turn'>" + gettext("Game Ended by: Turn 7") + "</div>")
			if (param[1] === 3) res.append("<div class='new_turn'>" + gettext("Game Ended by: King of the Hill") + "</div>")

			res.append("<div class='new_turn'>" + gettext("The winner is:") + " " + param[0] + "</div>")

			res.append("<div class='new_turn'><a href='/HLC/HLCgameSummary/" + String(global.gameID) + "/'>" + gettext("Click here to see game summary stats") + "</a></div>")
		} else if (action == this.NEW_TURN) {
			if (param != undefined && (param.length == 1 || param.length == 2 || param.length == 3)) {
				if (param.length == 1) res.append("<div class='new_turn'>" + interpolate(gettext("Start of turn %(turnNumber)s"), { turnNumber: param[0] }, true) + "</div>")
			}
		} else if (action == this.SHOW_CARDS) {
			res.append(interpolate(gettext("Punch Clock decreases by: %(amount)s"), { amount: String(param[0]) }, true) + "<BR/>")
			showCardsDiv = $("<div></div>")
			showCardsDiv.css({
				width: "100%",
				display: "flex",
			})

			for (i = 0; i < param[1].length; i++) {
				var showCardDiv = $("<div></div>")
				showCardDiv.css({
					width: "fit-content",
				})
				col = "black"

				if (getCorrectedColour(param[1][i][0]) === RED) col = "#E83435"
				if (getCorrectedColour(param[1][i][0]) === GREEN) col = "#70C96B"
				if (getCorrectedColour(param[1][i][0]) === PURPLE) col = "#8E63B3"
				if (getCorrectedColour(param[1][i][0]) === BLUE) col = " #435EB5"
				if (getCorrectedColour(param[1][i][0]) === YELLOW) col = "#EECD30"

				img = $(this.P_CARD_AREA.replace(/COLOUR/, col))

				if (param[1][i][1] === 4) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r1"))
				if (param[1][i][1] === 2) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r2"))
				if (param[1][i][1] === 1) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r3"))
				img.css({
					width: "30px",
					height: "30px",
					"margin-right": "5px",
				})
				showCardDiv.append(img)
				showCardDiv.append("<BR/>")

				//cardP00_Y
				cardID = param[1][i][3]
				var newCardID = ""
				if (cardID.length === 2) newCardID = cardID[0] + "0" + cardID[1]
				else newCardID = cardID

				//now add _CC
				var corrCol = getCorrectedColour(param[1][i][0])
				var extraLetter = "R"
				if (corrCol === 1) extraLetter = "G"
				if (corrCol === 2) extraLetter = "P"
				if (corrCol === 3) extraLetter = "B"
				if (corrCol === 4) extraLetter = "Y"

				var img2 = getCorrectedCardImage("card" + newCardID + "_" + extraLetter)
				img2.css({
					width: "50px",
					height: "75px",
					"margin-right": "5px",
				})
				showCardDiv.append(img2)
				showCardsDiv.append(showCardDiv)
			}
			res.append(showCardsDiv)
		} else if (action == this.NEUTRAL_CARDS) {
			res.append(gettext("Neutral Cards:") + "<BR/>")
			showCardsDiv = $("<div></div>")
			showCardsDiv.css({
				width: "100%",
				display: "flex",
			})

			for (i = 0; i < param.length; i++) {
				showCardDiv = $("<div></div>")
				showCardDiv.css({
					width: "fit-content",
				})
				col = "gray"

				img = $(this.P_CARD_AREA.replace(/COLOUR/, col))

				if (param[i][1] === 4) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r1"))
				if (param[i][1] === 2) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r2"))
				if (param[i][1] === 1) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r3"))
				img.css({
					width: "30px",
					height: "30px",
					"margin-right": "5px",
				})
				showCardDiv.append(img)
				showCardDiv.append("<BR/>")
				//cardP00_Y
				cardID = param[i][0]
				img = getNeutralCardImage("card" + String(cardID))
				img.css({
					width: "50px",
					height: "75px",
					"margin-right": "5px",
				})
				showCardDiv.append(img)
				showCardsDiv.append(showCardDiv)
			}
			res.append(showCardsDiv)
		}
		res.css({
			"line-height": "25px",
		})

		return res
	},

	// WARNING: THIS is now Div ELEMENT
	clickedOnBuildHistory: function (e) {
		var i = 0
		// Set the view to correct factory
		var itemIndex = M.gameFlow.unalteredTurnOrder.indexOf(e.data.playerIndex)
		V.render(itemIndex)

		// Find all indexes required to be highlighted
		var componentIndexes = []
		for (i = e.data.p1 - e.data.p0; i < e.data.p1; i++) {
			componentIndexes.push(M.players[e.data.playerIndex].factory.factoryComponents[i][1])
		}
		// Find all the needed squares
		var squaresToHighlight = []
		for (i = 0; i < componentIndexes.length; i++) {
			squaresToHighlight = squaresToHighlight.concat(M.players[e.data.playerIndex].factory.getAdjacentIndexesFromIndex(componentIndexes[i]))
		}
		V.externalDrawSquares(M.players[e.data.playerIndex], squaresToHighlight, "yellow", "historyComponentHighlight")
	},

	getPlayerSpan: function (name) {
		var index = M.players.map((item) => item.name).indexOf(name)
		if (index === -1) index = M.players.map((item) => item.originalName).indexOf(name)
		var colour = getCorrectedColour(M.players[index].colour)

		var span = $("<span></span>")

		if (M.trainingGame && M.players[index].displayName != undefined) span.append(M.players[index].displayName)
		else span.append(M.players[index].name)
		if (colour === RED) span.css({ "background-color": "#A12529" })
		if (colour === GREEN) span.css({ "background-color": "#456334" })
		if (colour === PURPLE) span.css({ "background-color": "#51365F" })
		if (colour === BLUE) span.css({ "background-color": "#3474A9" })
		if (colour === YELLOW) span.css({ "background-color": "#C28727" })
		span.css({
			color: "white",
			"font-weight": "bolder",
			padding: "3px",
			border: "1px solid black",
		})
		return span
	},

	getPlayerTokenFromColour: function (colour) {
		var img = $("<img>")
		colour = getCorrectedColour(colour)

		if (colour === RED) img.attr("src", imagePreURL + "/piece_R.png")
		else if (colour === GREEN) img.attr("src", imagePreURL + "/piece_G.png")
		else if (colour === PURPLE) img.attr("src", imagePreURL + "/piece_P.png")
		else if (colour === BLUE) img.attr("src", imagePreURL + "/piece_B.png")
		else if (colour === YELLOW) img.attr("src", imagePreURL + "/piece_Y.png")

		img.css({
			height: "20px",
			width: "20px",
		})

		return img
	},

	getTrackNameFromCompressedNumberL: function (number) {
		if (number === 5) return gettext("Assembly Capacity Track")
		else {
			if (number === 0) return gettext("Speed Tech")
			if (number === 1) return gettext("Range Tech")
			if (number === 2) return gettext("Design Tech")
			if (number === 3) return gettext("Reliability Tech")
			if (number === 4) return gettext("Safety Tech")
		}
	},

	giveFormattedDate: function (timestamp) {
		var d = new Date(timestamp)
		var res = d.getFullYear() + "/"
		if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
		else res += d.getMonth() + 1 + "/"
		if (d.getDate() < 10) res += "0" + d.getDate() + " "
		else res += d.getDate() + " "
		if (d.getHours() < 10) res += "0" + d.getHours() + ":"
		else res += d.getHours() + ":"
		if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
		else res += d.getMinutes() + ":"
		if (d.getSeconds() < 10) res += "0" + d.getSeconds()
		else res += d.getSeconds()

		return res
	},

	refreshHistory: function (model, last) {
		if (last == undefined) last = HISTORY_LENGTH
		if (model.logs != undefined) {
			var t = _.sortBy(model.logs, "timestamp")

			var histTogDiv = $("#historyToggleDiv")

			$("#history").empty()

			if (last > -1 && t.length > last) {
				var button = $("<div><button>" + gettext("Show full history") + "</button></div>")
				button.on("click", function () {
					Log.refreshHistory(model, -1)
				})
				$("#history").append(button)
				t = t.slice(t.length - last, t.length)
			}
			_.each(
				t,
				function (item) {
					if (item.timestamp > 0) this.history(model, item.player, item.action, item.param, item.timestamp)
					else this.history(model, item.player, item.action, item.param, -item.timestamp)
				},
				this
			)

			// THIS ONLY HAPPENS ONCE
			$("#history").prepend(histTogDiv)
			histTogDiv.show()
		}
	},
}
