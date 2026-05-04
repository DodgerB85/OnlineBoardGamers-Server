var View = function (model) {
	this.model = model

	/** @private */
	function init() {
		this.smallSqPxWidth = 30
		this.nicheSqPxWidth = 68
		this.currentViewItem = -1
		this.previouslyPlacedComponentBorderSize = 1
		this.newlyPlacedComponentBorderSize = 4
		SMALL_SQUARE = '<svg width="' + this.smallSqPxWidth + '" height="' + this.smallSqPxWidth + '"><rect width="' + this.smallSqPxWidth + '" height="' + this.smallSqPxWidth + '" style="fill:COLOR;stroke-width:1;fill-opacity:0.3"></svg>'
		MB_SMALL_SQUARE = '<svg width="68px" height="68px"><rect width="68px" height="68px" style="fill:COLOR;stroke-width:1;fill-opacity:0.3"></svg>'

		//<rect id="rect1872" stroke-linejoin="round" fill-rule="evenodd" rx="50" ry="50" height="972.48" width="472.48" stroke="#000" y="66.121" x="13.759" stroke-width="27.517" fill="none"/>
		// 1sq = w/h 75.5 + niceh 68 +
		const stroke_width = 5
		var gap = 5
		//MW_SMALL = '<svg width="75.5px" height="25.5px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="5px" ry="5px" height="70.5px" width="70.5px" stroke="COLOUR" y="2.5px" x="2.5px" stroke-width="5px" fill="none"/></svg>';
		MW_SMALL = '<svg height="' + String(stroke_width * 2 + gap + this.nicheSqPxWidth * 2) + 'px" width="' + String(stroke_width * 2 + this.nicheSqPxWidth) + 'px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + gap + this.nicheSqPxWidth * 2) + 'px" width="' + String(stroke_width / 2 + this.nicheSqPxWidth) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'
		MW_SMALL_R = '<svg height="' + String(stroke_width * 2 + this.nicheSqPxWidth) + 'px" width="' + String(stroke_width * 2 + gap + this.nicheSqPxWidth * 2) + 'px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + this.nicheSqPxWidth) + 'px" width="' + String(stroke_width / 2 + gap + this.nicheSqPxWidth * 2) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'
		MW_MEDIUM = '<svg height="' + String(stroke_width * 2 + gap + this.nicheSqPxWidth * 2) + 'px" width="' + String(stroke_width * 2 + gap + this.nicheSqPxWidth * 2) + 'px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + gap + this.nicheSqPxWidth * 2) + 'px" width="' + String(stroke_width / 2 + gap + this.nicheSqPxWidth * 2) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'
		MW_LARGE = '<svg height="' + String(stroke_width * 2 + gap * 2 + this.nicheSqPxWidth * 3) + 'px" width="' + String(stroke_width * 2 + gap * 2 + this.nicheSqPxWidth * 3) + 'px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + gap * 2 + this.nicheSqPxWidth * 3) + 'px" width="' + String(stroke_width / 2 + gap * 2 + this.nicheSqPxWidth * 3) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'

		gap = 16
		Qhighlight = '<svg height="' + String(stroke_width * 2 + gap * 1 + this.nicheSqPxWidth * 4) + 'px" width="' + String(stroke_width * 2 + gap * 1 + this.nicheSqPxWidth * 4) + 'px"><rect class="SVGQ" id="THISID" stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + gap * 1 + this.nicheSqPxWidth * 4) + 'px" width="' + String(stroke_width / 2 + gap * 1 + this.nicheSqPxWidth * 4) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'

		P_CARD_AREA = '<svg class="CLASS"><rect stroke-linejoin="round" fill-rule="evenodd" rx="5px" ry="5px" height="50px" width="50px" stroke="#000" y="5px" x="5px" stroke-width="5px" fill="none"/><rect stroke-linejoin="round" fill-rule="evenodd" rx="5px" ry="5px" height="25px" width="25px" stroke="#000" y="5px" x="5px" stroke-width="5px" fill="COLOUR"/></svg>'
	}

	this.reloadModel = function (model) {
		this.model = model
		this.render()
	}

	/**
	 * Render the board
	 */

	// item -1 marketboard
	// OTHERWISE item is the array index of UnalteredTurnOrder
	// 0 should be player at start of line and 4 at end

	// ITEM is UNALTERED TURN ORDER INEDX
	this.render = function (item) {
		$("#SSD").empty()
		// ADD IN AN UNDEFINED CHECK FOR RESET BUTTON RELOAD
		if (item == undefined) {
			if (this.model.gameEnded > 0) item = -1
			else if (this.model.sandboxMode) {
				item = this.model.gameFlow.unalteredTurnOrder.indexOf(global.pov)
			} else if (MARKET_BOARD_PHASES.includes(this.model.gameFlow.phase)) item = -1
			else {
				if (!Rules.isSimulPhase()) item = this.model.gameFlow.turnOrder[0]
				else item = this.model.gameFlow.unalteredTurnOrder.indexOf(this.model.gameFlow.currentPlayer)
				if (M.trainingGame) {
					item = this.model.players.length - this.model.gameFlow.turnOrder.length
				}
			}
		} // end item undefinded

		this.currentViewItem = item

		if (window.innerWidth < 1700) {
			// gameName 1536 - 280 - 160 = 1096 so ~ 10px width / char
			if (window.innerWidth - 700 - 152 - $("#gameNameSpan").text().length * 10 < 0) {
				var charsToRemove = 0
				while (window.innerWidth - 700 - 152 + charsToRemove * 10 - $("#gameNameSpan").text().length * 10 < 0) {
					charsToRemove++
				}
				var remainingLength = Math.max(global.gameName.length - charsToRemove, 10)
				global.gameName = global.gameName.slice(0, remainingLength)
				global.gameName += "..."
			}
		}

		$("#gameName").html(global.gameName)

		$("#turnNumber").html(String(this.model.gameFlow.turn))
		$("#phase").html(PHASES_STR[this.model.gameFlow.phase])
		$("#currentPlayer").html(global.currentPlayers.join(", "))

		this.renderPlayerLineDiv(item)
		if (item === -1) {
			this.renderMarketBoardScreen()
			if (Rules.canPlay() && this.model.gameFlow.phase === PHASE_RESEARCH && !this.model.sandboxMode) C.startActions()
		} else {
			var player = this.model.players[this.model.gameFlow.unalteredTurnOrder[item]]
			this.renderFactoryFloor(player)
		}
		if (this.model.gameEnded > 0) {
			$("#actions").empty()
			if (this.model.gameEnded === 1) $("#actions").append(gettext("Game ended by Punch Clock"))
			if (this.model.gameEnded === 2) $("#actions").append(gettext("Game ended by Factory Expansions"))
			if (this.model.gameEnded === 3) $("#actions").append(gettext("Game ended by King of the Hill"))
			$("#actions").append("<BR/><BR/>")
			$("#actions").append("Winner: " + this.model.players[this.model.gameFlow.turnOrder[0]].name)

			if (global.name === this.model.players[this.model.gameFlow.turnOrder[0]].name) {
				$("#actions").append("<h1>CONGRATULATIONS!</h1>")
				$("#actions").append("Fancy a <a href='/createHLCpage/" + String(global.gameID) + "/'>rematch</a>?")
			} else {
				$("#actions").append("<BR/><BR/>Fancy a <a href='/createHLCpage/" + String(global.gameID) + "/'>rematch</a>?")
			}
			$("#actions").append("<BR/><BR/><a href='/HLC/HLCgameSummary/" + String(global.gameID) + "/'>Click here to see game summary stats</a>")
		}
		$(".topMenuItem").off().on("click", { view: this }, topMenuItem)
	}

	this.renderPlayerLineDiv = function (item) {
		var img

		var playerLineDiv = $("#playerLineDiv")
		playerLineDiv.empty()
		playerLineDiv.css({
			width: "100%",
			display: "flex",
			"flex-wrap": "wrap",
			margin: "auto",
			"justify-content": "center",
			"margin-bottom": "5px", // Needed if no actions to allow buffer below
		})

		// Add punch clock
		var punchClockDiv = $("<div></div>")
		punchClockDiv.attr("id", "punchClockDiv")
		var punchClockImg
		if (this.model.punchClockNumber > 0) {
			punchClockImg = $("<img>")
			punchClockImg.attr("src", imagePreURL + "/punch_clock.png")
			punchClockImg.attr("id", "punchClockImg")

			punchClockDiv.append(punchClockImg)
			punchClockDiv.append("X " + String(this.model.punchClockNumber))
		} else {
			punchClockImg = $("<img>")
			punchClockImg.attr("src", imagePreURL + "/punch_clock_end.png")
			punchClockImg.attr("id", "punchClockImg")

			punchClockDiv.append(punchClockImg)
			punchClockDiv.append(" (" + String(this.model.punchClockNumber) + ")")
		}
		playerLineDiv.append(punchClockDiv)

		// Add Link to Market Board
		var marketBoardLinkdiv = $("<div></div>")
		marketBoardLinkdiv.attr("id", "playerDiv-1")
		marketBoardLinkdiv.addClass("playerDiv")
		if (item === -1) marketBoardLinkdiv.addClass("playerLineActive")
		marketBoardLinkdiv.css({ color: "black" })

		marketBoardLinkdiv.append(gettext("View Market Board"))
		playerLineDiv.append(marketBoardLinkdiv)
		this.addHighlightsOnMouseOverToElement(marketBoardLinkdiv, 5, true)
		marketBoardLinkdiv.on("click", function () {
			var arrayIndex = parseInt(this.id.slice(9))
			V.render(arrayIndex)
		})

		// Add links to each players factories
		var focusDiv
		for (var i = 0; i < this.model.gameFlow.unalteredTurnOrder.length; i++) {
			if (i === 0) {
				focusDiv = $("<div></div>")
				focusDiv.css({
					"margin-right": "20px",
					"margin-top": "5px",
					border: "1px solid black",
					padding: "2px",
					"padding-left": "2px",
					"padding-right": "2px",
					"font-weight": "bolder",
					width: "100px",
					color: "black",
					"background-color": "#C7DaD6",
				})
				if (this.model.gameFlow.phase === PHASE_SET_FOCUS) focusDiv.append(gettext("Most Gantt"))
				else if (this.model.gameFlow.phase === PHASE_SELL) focusDiv.append(gettext("Sales"))
				else if (this.model.gameEnded > 0) focusDiv.append(gettext("Winner"))
				else focusDiv.append(gettext("Engineering"))
				img = $("<img>")
				img.attr("src", imagePreURL + "/arrow.png")
				img.css({
					width: "70px",
					height: "30px",
				})
				focusDiv.append(img)
				playerLineDiv.append(focusDiv)
			} // END i  = 0

			var playerDiv = $("<div></div>")
			playerDiv.attr("id", "playerDiv" + String(i))
			playerDiv.addClass("playerDiv")
			var num = this.model.gameFlow.unalteredTurnOrder[i]

			if (!Rules.isSimulPhase()) {
				if (this.model.gameFlow.turnOrder[0] === num) playerDiv.addClass("playerTurn")
			} else {
				// simul phase
				if (global.currentPlayers.includes(this.model.players[this.model.gameFlow.unalteredTurnOrder[i]].name)) playerDiv.addClass("playerTurn")
			}
			if (item === i) playerDiv.addClass("playerLineActive")
			var colour = getCorrectedColour(this.model.players[num].colour)
			if (colour === RED) playerDiv.css({ "background-color": "#A12529" })
			if (colour === GREEN) playerDiv.css({ "background-color": "#456334" })
			if (colour === PURPLE) playerDiv.css({ "background-color": "#51365F" })
			if (colour === BLUE) playerDiv.css({ "background-color": "#3474A9" })
			if (colour === YELLOW) playerDiv.css({ "background-color": "#C28727" })

			if (this.model.trainingGame && this.model.players[num].displayName != undefined) playerDiv.append(this.model.players[num].displayName)
			else playerDiv.append(this.model.players[num].name)
			playerDiv.append('<BR/><span class="moneySpan">$' + this.model.players[num].money + "</span> G: " + this.model.players[num].gantt + " (+" + Rules.getNumberOfPlanningOffices(this.model.players[num]) + ")")
			playerDiv.on("click", function () {
				var playerNumber = parseInt(this.id.slice(9))
				if (item !== playerNumber) V.render(playerNumber)
				else V.render(-1)
			})
			playerLineDiv.append(playerDiv)
			this.addHighlightsOnMouseOverToElement(playerDiv, 5, true)
			if (i === this.model.gameFlow.unalteredTurnOrder.length - 1) {
				focusDiv = $("<div></div>")
				focusDiv.css({
					"margin-right": "20px",
					"margin-top": "5px",
					border: "1px solid black",
					padding: "2px",
					"padding-left": "2px",
					"padding-right": "2px",
					"font-weight": "bolder",
					width: "100px",
					color: "black",
					"background-color": "#C7DaD6",
				})
				if (this.model.gameFlow.phase === PHASE_SET_FOCUS) focusDiv.append(gettext("Least Gantt"))
				else if (this.model.gameFlow.phase === PHASE_SELL) focusDiv.append(gettext("Engineering"))
				else if (this.model.gameEnded > 0) focusDiv.append(gettext("Stuck in Traffic"))
				else focusDiv.append(gettext("Sales"))
				img = $("<img>")
				img.attr("src", imagePreURL + "/arrow.png")
				img.addClass("r2")
				img.css({
					width: "70px",
					height: "30px",
				})
				focusDiv.append(img)
				playerLineDiv.append(focusDiv)
			}
		}
	}

	this.renderMarketBoardScreen = function () {
		var top = 0
		var i = 0
		var j = 0
		var k = 0
		var imgDiv
		var img
		var numDiv
		var Xcoord = 0
		var Ycoord = 0
		var divXcoord = 0
		var divYcoord = 0
		var minSpec = 0
		var minSpecStickDiv
		var left = 0
		var pieceDiv
		var pieceImg
		var pieceLeft = 0
		var pieceWidth = 28
		var pieceHeight = 28
		var col = "black"

		$("#wholeFactoryDiv").hide()
		$("#wholeMarketScreenDiv").show()

		if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			$("#allDealershipsWithStockDiv").remove()
			// Add stock to newly built Dships
			for (i = 0; i < this.model.players.length; i++) {
				factory = this.model.players[i].factory
				for (j = 0; j < factory.factoryComponents.length; j++) {
					if (MAINLINES.includes(factory.factoryComponents[j][0])) {
						for (k = 0; k < this.model.assemblyCapacityTrack.length; k++) if (this.model.assemblyCapacityTrack[k].indexOf(this.model.players[i].colour) > -1) factory.factoryComponents[j][SL_IDX] = k + 1
					}
				}
			}
			$("#actions").append(this.displayAllDealershipsWithStock())
		}
		// Vertical TT
		var verticalTTdiv = $("#verticalTTdiv")
		verticalTTdiv.empty()
		var verticalTTimg = this.getImage("ttImg" + String(this.model.techTracks[0][7][0]), true)
		verticalTTimg.attr({ id: "verticalTTimg" })
		verticalTTimg.addClass("trackImg")
		verticalTTdiv.append(verticalTTimg)
		var specAxis = $("<div></div>")
		specAxis.attr("id", "verticalSpecAxis")
		// add spec divs
		var YspecAxis = [this.model.techTracks[0][7][1], this.model.techTracks[0][7][1] + 1, this.model.techTracks[0][7][1] + 2, this.model.techTracks[0][7][1] + 3]
		for (i = 0; i < 4; i++) {
			var spcDiv = $("<div></div>")
			top = 150 * i
			spcDiv.css({
				position: "absolute",
				left: "0px",
				top: String(top) + "px",
				width: "14px",
				"margin-left": "2px",
				height: "140px",
				"line-height": "140px",
				"font-weight": "bolder",
				"margin-top": "5px",
				"margin-bottom": "5px",
				border: "1px solid black",
			})
			spcDiv.append(String(YspecAxis[3 - i]))
			specAxis.append(spcDiv)
		}
		verticalTTdiv.append(specAxis)
		// Add min spec sticks
		minSpec = this.model.techTracks[0][7][1]
		minSpecStickDiv = $("<div></div>")
		top = 132 + minSpec * 66
		minSpecStickDiv.css({
			position: "absolute",
			left: "24px",
			top: String(top) + "px",
			width: "90px",
			height: "10px",
			"margin-left": "2px",
			"background-color": "white",
			border: "1px solid black",
		})

		verticalTTdiv.append(minSpecStickDiv)

		// now add in player pieces
		for (i = 0; i < this.model.techTracks[0].length - 1; i++) {
			// ALWAYS add the div to supply tool tips
			// create a div to hold the pieces
			pieceDiv = $("<div></div>")
			pieceDiv.addClass("pieceDiv")
			top = 73 + 66 * i
			pieceDiv.css({
				// Start at left 73. Shift 66
				position: "absolute",
				left: "28px",
				top: String(top) + "px",
				width: "90px",
				height: "59px",
			})
			pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[0][7][0], i))
			verticalTTdiv.append(pieceDiv)
			for (j = 0; j < this.model.techTracks[0][i].length; j++) {
				pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[0][i][j])))
				pieceImg.addClass("piece")
				pieceImg.attr("id", "TT0" + String(i) + String(this.model.techTracks[0][i][j]))
				pieceWidth = 29
				pieceHeight = 30
				// Fix the width at 29; adjust height for oval
				if (getCorrectedColour(this.model.techTracks[0][i][j]) === BLUE) pieceHeight = 21
				pieceImg.css({
					width: String(pieceWidth) + "px",
					height: String(pieceHeight) + "px",
					filter: `drop-shadow(2px 0 0 white) 
									drop-shadow(0 2px 0 white)
									drop-shadow(-2px 0 0 white) 
									drop-shadow(0 -2px 0 white)`,
				})
				pieceDiv.append(pieceImg)
			}
			//} END if piece in array pos
		}
		// Market Board
		var marketBoarddiv = $("#marketBoarddiv")
		marketBoarddiv.empty()
		var marketBoardImg = this.getImage(MARKET_BOARD)
		marketBoardImg.css({
			width: "600px",
			height: "600px",
		})
		marketBoarddiv.append(marketBoardImg)
		// Now add sparks / demand
		for (i = 0; i < this.model.marketBoard.length; i++) {
			if (this.model.marketBoard[i][0] + this.model.marketBoard[i][1] + this.model.marketBoard[i][0] + this.model.marketBoard[i][2] + this.model.marketBoard[i][3] + this.model.marketBoard[i][4] + this.model.marketBoard[i][5] > 0) {
				// Create a niche div
				Xcoord = this.model.getMBcoordsForIndex(i)[0]
				Ycoord = this.model.getMBcoordsForIndex(i)[1]

				var nicheDiv = $("<div></div>")
				divXcoord = 9 + 71.5 * Xcoord
				divYcoord = 9 + 71.5 * Ycoord

				if (Xcoord >= 2) divXcoord += 4.5
				if (Xcoord >= 4) divXcoord += 7
				if (Xcoord >= 6) divXcoord += 4.5

				if (Ycoord >= 2) divYcoord += 4.5
				if (Ycoord >= 4) divYcoord += 7
				if (Ycoord >= 6) divYcoord += 4.5

				nicheDiv.css({
					position: "absolute",
					top: String(divYcoord) + "px",
					left: String(divXcoord) + "px",
					width: "68px",
					height: "68px",
				})
				var demandDiv = $("<div></div>")
				demandDiv.css({
					position: "absolute",
					display: "flex",
					"flex-wrap": "wrap",
					top: "0px",
					left: "0px",
					width: "69px",
					height: "40px",
					"z-index": "500",
				})
				for (j = 3; j < 6; j++) {
					if (this.model.marketBoard[i][j] > 0) {
						imgDiv = $("<div></div>")
						imgDiv.css({
							position: "relative",
							width: "34px",
							height: "20px",
						})
						img = this.getImage("V" + String(j - 3))
						img.css({
							position: "absolute",
							top: "0px",
							left: "0px",
							width: "34px",
							height: "20px",
						})
						imgDiv.append(img)
						numDiv = $("<div></div>")
						numDiv.css({
							position: "absolute",
							top: "0px",
							left: "10px",
							color: "yellow",
							"font-weight": "bolder",
							padding: "2px",
							"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
						})
						numDiv.append(String(this.model.marketBoard[i][j]))
						imgDiv.append(numDiv)
						demandDiv.append(imgDiv)
					}
				}
				var sparkDiv = $("<div></div>")
				sparkDiv.css({
					position: "absolute",
					display: "flex",
					"flex-wrap": "wrap",
					top: "42px",
					left: "0px",
					width: "68px",
					height: "28px",
					"z-index": "500",
				})
				for (j = 0; j < 3; j++) {
					if (this.model.marketBoard[i][j] > 0) {
						imgDiv = $("<div></div>")
						imgDiv.css({
							position: "relative",
							width: "22px",
							height: "22px",
						})
						img = this.getImage("S" + String(j))
						img.css({
							position: "absolute",
							top: "0px",
							left: "0px",
							width: "22px",
							height: "22px",
						})
						imgDiv.append(img)
						numDiv = $("<div></div>")
						numDiv.css({
							position: "absolute",
							top: "0px",
							left: "5px",
							color: "yellow",
							"font-weight": "bolder",
							padding: "2px",
							"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
						})
						numDiv.append(String(this.model.marketBoard[i][j]))
						imgDiv.append(numDiv)
						sparkDiv.append(imgDiv)
					}
				}

				nicheDiv.append(demandDiv)
				nicheDiv.append(sparkDiv)
				marketBoarddiv.append(nicheDiv)
			}
		}

		// Now add PLACED market windows
		var alreadyCoveredIndexes = []
		for (i = 0; i < this.model.players.length; i++) {
			for (j = 0; j < this.model.players[i].factory.factoryComponents.length; j++) {
				var component = this.model.players[i].factory.factoryComponents[j]
				if (DEALERSHIPS.includes(component[0])) {
					if (component[MW_IDX][0] != -1) {
						// We have a dealership with a placed market window
						var index = component[MW_IDX][0]
						var rotation = component[MW_IDX][1]
						var MWsize = component[MW_IDX][2]
						var str
						if (MWsize === 0) str = MW_SMALL
						if (MWsize === 0 && rotation % 2 == 1) str = MW_SMALL_R
						if (MWsize === 1) str = MW_MEDIUM
						if (MWsize === 2) str = MW_LARGE
						col = "black"
						if (RED_DEALERSHIPS.includes(component[0])) col = RED
						if (GREEN_DEALERSHIPS.includes(component[0])) col = GREEN
						if (PURPLE_DEALERSHIPS.includes(component[0])) col = PURPLE
						if (BLUE_DEALERSHIPS.includes(component[0])) col = BLUE
						if (YELLOW_DEALERSHIPS.includes(component[0])) col = YELLOW

						var correctedDshipName = COMPONENTS_NAME_STRING[getCorrectedDealershipColour(component[0], col)]
						correctedDshipName = correctedDshipName.substring(0, 10)

						col = getCorrectedColour(col)
						var colNum = col
						if (col === RED) col = "#E83435"
						if (col === GREEN) col = "#70C96B"
						if (col === PURPLE) col = "#8E63B3"
						if (col === BLUE) col = " #435EB5"
						if (col === YELLOW) col = "#EECD30"

						var MWImg = $(str.replace(/COLOUR/, col))
						var MWwidth = 3
						var MWheight = 3
						if (MWsize == 1) {
							MWwidth = 2
							MWheight = 2
						}
						if (MWsize == 0 && rotation % 2 == 0) {
							MWwidth = 1
							MWheight = 2
						}
						if (MWsize == 0 && rotation % 2 == 1) {
							MWwidth = 2
							MWheight = 1
						}
						Xcoord = this.model.getMBcoordsForIndex(index)[0]
						Ycoord = this.model.getMBcoordsForIndex(index)[1]
						// Shift for rotation first
						divXcoord = 0
						divYcoord = 0
						if (rotation == 1) {
							// top is good, but left needs to move back
							divXcoord = divXcoord - (this.nicheSqPxWidth + 5) * (MWwidth - 1)
						}
						if (rotation == 2) {
							// need to shift left and up
							divXcoord = divXcoord - (this.nicheSqPxWidth + 5) * (MWwidth - 1)
							divYcoord = divYcoord - (this.nicheSqPxWidth + 5) * (MWheight - 1)
						}
						if (rotation == 3) {
							// left is good, but top needs to move o[]
							divYcoord = divYcoord - (this.nicheSqPxWidth + 5) * (MWheight - 1)
						}
						divXcoord += 9 + 71.5 * Xcoord
						divYcoord += 9 + 71.5 * Ycoord

						if (Xcoord >= 2) divXcoord += 4.5
						if (Xcoord >= 4) divXcoord += 7
						if (Xcoord >= 6) divXcoord += 4.5

						if (Ycoord >= 2) divYcoord += 4.5
						if (Ycoord >= 4) divYcoord += 7
						if (Ycoord >= 6) divYcoord += 4.5

						// Now shift for outer px
						divXcoord -= 5
						divYcoord -= 5

						// shift for already covered
						var alreadyL = 0
						var alreadyT = 0
						var newlyCoveredIndexes = this.model.getCoveredIndexesOfMarketWindow(index, rotation, MWsize)

						if (newlyCoveredIndexes.some((r) => alreadyCoveredIndexes.includes(r))) {
							alreadyL = 3 * colNum
							alreadyT = 3 * colNum
						}
						alreadyCoveredIndexes = alreadyCoveredIndexes.concat(newlyCoveredIndexes)

						MWImg.css({
							position: "absolute",
							left: String(divXcoord + alreadyL) + "px",
							top: String(divYcoord + alreadyT) + "px",
							"z-index": String(5 + colNum),
						})

						$("#marketBoarddiv").append(MWImg)
						var MWnameSpan = $("<span>")
						MWnameSpan.addClass("MWnameSpan")
						MWnameSpan.append(correctedDshipName)
						MWnameSpan.css({
							position: "absolute",
							left: String(divXcoord + alreadyL) + "px",
							top: String(divYcoord + alreadyT - 5) + "px",
							"z-index": String(5 + colNum),
						})
						$("#marketBoarddiv").append(MWnameSpan)
					}
				}
			}
		}

		// Add prices
		for (i = 0; i < this.model.priceBand.length; i++) {
			if (this.model.priceBand[i] > 0) {
				var indexToUse = this.model.getIndexForPriceDisplay(i)
				// Create a niche div
				var priceDiv = this.getPriceDiv(indexToUse, this.model.priceBand[i])
				marketBoarddiv.append(priceDiv)
			}
		}

		// Horizontal TT
		var horizontalTTdiv = $("#horizontalTTdiv")
		horizontalTTdiv.empty()
		specAxis = $("<div></div>")
		specAxis.attr("id", "horizontalSpecAxis")

		// add spec divs
		var XspecAxis = [this.model.techTracks[1][7][1], this.model.techTracks[1][7][1] + 1, this.model.techTracks[1][7][1] + 2, this.model.techTracks[1][7][1] + 3]
		for (i = 0; i < 4; i++) {
			var specDiv = $("<div></div>")
			left = 150 * i
			specDiv.css({
				position: "absolute",
				left: String(left) + "px",
				top: "0px",
				height: "14px",
				"margin-top": "2px",
				width: "140px",
				"font-weight": "bolder",
				"font-size": "13px",
				"margin-left": "5px",
				"margin-right": "5px",
				border: "1px solid black",
			})
			specDiv.append(String(XspecAxis[i]))
			specAxis.append(specDiv)
		}

		horizontalTTdiv.append(specAxis)
		var horizontalTTImg = this.getImage("ttImg" + String(this.model.techTracks[1][7][0]), false)
		horizontalTTImg.addClass("trackImg")
		horizontalTTImg.attr("id", "horizontalTTImg")
		horizontalTTImg.css({
			position: "relative",
			top: "20px",
			left: "55px",
			width: "490px",
			height: "120px",
		})
		horizontalTTdiv.append(horizontalTTImg)

		// Add min spec sticks
		minSpec = this.model.techTracks[1][7][1]
		minSpecStickDiv = $("<div></div>")
		left = 131 + minSpec * 66
		minSpecStickDiv.css({
			position: "absolute",
			left: String(left) + "px",
			top: "24px",
			width: "10px",
			height: "90px",
			"background-color": "white",
			border: "1px solid black",
		})

		horizontalTTdiv.append(minSpecStickDiv)

		// now add in player pieces
		for (i = 0; i < this.model.techTracks[1].length - 1; i++) {
			// create a div to hold the pieces
			pieceDiv = $("<div></div>")
			pieceDiv.addClass("pieceDiv")
			left = 73 + 66 * i
			pieceDiv.css({
				// Start at left 73. Shift 66
				position: "absolute",
				top: "28px",
				left: String(left) + "px",
				width: "59px",
				height: "85px",
			})
			pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[1][7][0], i))
			horizontalTTdiv.append(pieceDiv)
			for (j = 0; j < this.model.techTracks[1][i].length; j++) {
				pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[1][i][j])))
				pieceImg.addClass("piece")
				pieceImg.attr("id", "TT1" + String(i) + String(this.model.techTracks[1][i][j]))
				pieceWidth = 29
				pieceHeight = 30
				// Fix the width at 29; adjust height for oval
				if (getCorrectedColour(this.model.techTracks[1][i][j]) === BLUE) pieceHeight = 21
				pieceImg.css({
					width: String(pieceWidth) + "px",
					height: String(pieceHeight) + "px",
					filter: `drop-shadow(2px 0 0 white) 
									drop-shadow(0 2px 0 white)
									drop-shadow(-2px 0 0 white) 
									drop-shadow(0 -2px 0 white)`,
				})
				pieceDiv.append(pieceImg)
			}
		}

		// Obs marker
		var obsMarkerDiv = $("<div></div>")
		obsMarkerDiv.css({
			position: "absolute",
			top: "600px",
			left: "0px",
			width: "140px",
			height: "140px",
		})
		$("#wholeMarketBoardDiv").append(obsMarkerDiv)
		var obsMarkerImg = this.getImage("obsMarker", false)
		if (this.model.obsolescenceMarkerDirection === 0) obsMarkerImg.addClass("r3")
		obsMarkerImg.css({
			width: "140px",
			height: "140px",
		})
		obsMarkerDiv.append(obsMarkerImg)

		// Right Infos
		var allRightInfos = $("<div></div>")
		allRightInfos.css({
			position: "absolute",
			top: "0px",
			left: "740px",
			width: "490px",
			height: "740px",
		})
		$("#wholeMarketBoardDiv").append(allRightInfos)

		//min spec
		var minSpecDiv = $("<div></div>")
		minSpecDiv.css({
			position: "absolute",
			top: "0px",
			left: "0px",
			width: "490px",
			height: "152px",
		})
		allRightInfos.append(minSpecDiv)
		var minSpecImg = this.getImage("minSpecs", false)
		minSpecImg.css({
			width: "320px",
			height: "142px",
			border: "2px solid black",
		})
		minSpecDiv.append(minSpecImg)

		var minSpecs = Rules.getMinSpecsInOrder()
		for (i = 0; i < minSpecs.length; i++) {
			if (minSpecs[i] > 0) {
				// Add min spec sticks
				var minSpecTokenkDiv = $("<div></div>")
				var leftShift = 0
				var text
				if (i === RED) {
					leftShift = 0
					col = "#A12529"
					text = "Speed"
					textCol = "white"
				}
				if (i === PURPLE) {
					leftShift = 1
					col = "#51365F"
					text = "Design"
					textCol = "white"
				}
				if (i === BLUE) {
					leftShift = 2
					col = "#3474A9"
					text = "Reliability"
					textCol = "white"
				}
				if (i === YELLOW) {
					leftShift = 3
					col = "#C28727"
					text = "Safety"
					textCol = "white"
				}
				if (i === GREEN) {
					leftShift = 4
					col = "#456334"
					text = "Range"
					textCol = "white"
				}

				left = 99 + leftShift * 58
				minSpecTokenkDiv.css({
					position: "absolute",
					left: String(left) + "px",
					top: "90px",
					width: "50px",
					height: "45px",
					"font-size": "43px",
					"background-color": col,
					border: "1px solid black",
					color: textCol,
				})
				minSpecTokenkDiv.append(String(minSpecs[i]))

				minSpecDiv.append(minSpecTokenkDiv)
			}
		}

		var showPiecesDiv = $("<div></div>")
		showPiecesDiv.css({
			position: "absolute",
			left: "5px",
			top: "5px",
			width: "60px",
			height: "60px",
			"margin-left": "2px",
		})
		var showPiecesButton = $("<button id='showPiecesButton'>" + gettext("Hide Pieces") + "</button>")
		showPiecesButton.addClass("actionsLineButton")
		showPiecesButton.css({
			"font-weight": "bolder",
			"font-size": "17px",
			width: "68px",
			height: "60px",
			"margin-left": "0px",
		})
		showPiecesDiv.append(showPiecesButton)

		showPiecesButton.off()
		showPiecesButton.on("click", function () {
			if ($(".piece").is(":visible")) {
				$(".piece").fadeOut()
			} else {
				$(".piece").fadeIn()
			}
			if (showPiecesButton.text() == gettext("Hide Pieces")) showPiecesButton.text(gettext("Show Pieces"))
			else showPiecesButton.text(gettext("Hide Pieces"))
		})

		minSpecDiv.append(showPiecesDiv)

		// assem capac
		var assemCapacDiv = $("<div></div>")
		assemCapacDiv.css({
			position: "absolute",
			top: "152px",
			left: "0px",
			width: "490px",
			height: "228px",
		})
		allRightInfos.append(assemCapacDiv)
		var assemCapacImg = this.getImage("assemCapac", false)
		assemCapacImg.addClass("trackImg")
		assemCapacImg.css({
			width: "380px",
			height: "218px",
			border: "2px solid black",
		})
		assemCapacDiv.append(assemCapacImg)
		// now add in player pieces
		for (i = 0; i < this.model.assemblyCapacityTrack.length; i++) {
			if (this.model.assemblyCapacityTrack[i].length > 0 || 1 == 1) {
				// create a div to hold the pieces
				pieceDiv = $("<div></div>")
				pieceDiv.addClass("pieceDiv")
				left = 55 + 76 * i
				pieceDiv.css({
					// Start at left 73. Shift 66
					position: "absolute",
					top: "125px",
					left: String(left) + "px",
					width: "75px",
					height: "83px",
				})
				assemCapacDiv.append(pieceDiv)
				for (j = 0; j < this.model.assemblyCapacityTrack[i].length; j++) {
					pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.assemblyCapacityTrack[i][j])))
					pieceImg.addClass("piece")
					pieceImg.attr("id", "ACT" + String(i) + String(this.model.assemblyCapacityTrack[i][j]))
					pieceWidth = 29
					pieceHeight = 30
					// Fix the width at 29; adjust height for oval
					if (getCorrectedColour(this.model.assemblyCapacityTrack[i][j]) === BLUE) pieceHeight = 21
					pieceImg.css({
						width: String(pieceWidth) + "px",
						height: String(pieceHeight) + "px",
						filter: `drop-shadow(2px 0 0 white) 
										drop-shadow(0 2px 0 white)
										drop-shadow(-2px 0 0 white) 
										drop-shadow(0 -2px 0 white)`,
					})
					pieceDiv.append(pieceImg)
				}
			}
		}

		// 360 for 3 x TT
		for (i = 2; i < this.model.techTracks.length; i++) {
			var divTop = 380 + 120 * (i - 2)
			var ttDiv = $("<div></div>")
			ttDiv.css({
				position: "absolute",
				top: String(divTop) + "px",
				left: "0px",
				width: "490px",
				height: "120px",
			})
			allRightInfos.append(ttDiv)
			var ttImg = this.getImage("ttImg" + String(this.model.techTracks[i][7][0]), false)
			ttImg.addClass("trackImg")
			ttImg.css({
				width: "490px",
				height: "120px",
			})
			ttDiv.append(ttImg)

			// Add min spec sticks
			minSpec = this.model.techTracks[i][7][1]
			minSpecStickDiv = $("<div></div>")
			left = 76 + minSpec * 66
			minSpecStickDiv.css({
				position: "absolute",
				left: String(left) + "px",
				top: "4px",
				width: "10px",
				height: "90px",
				"background-color": "white",
				border: "1px solid black",
			})

			ttDiv.append(minSpecStickDiv)

			// now add in player pieces
			for (j = 0; j < this.model.techTracks[1].length - 1; j++) {
				// create a div to hold the pieces
				pieceDiv = $("<div></div>")
				pieceDiv.addClass("pieceDiv")
				pieceLeft = 18 + 66 * j
				pieceDiv.css({
					// Start at left 73. Shift 66
					position: "absolute",
					top: "12px",
					left: String(pieceLeft) + "px",
					width: "56px",
					height: "85px",
				})
				pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[i][7][0], j))
				ttDiv.append(pieceDiv)
				for (k = 0; k < this.model.techTracks[i][j].length; k++) {
					pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[i][j][k])))
					pieceImg.addClass("piece")
					pieceImg.attr("id", "TT" + String(i) + String(j) + String(this.model.techTracks[i][j][k]))
					pieceWidth = 28
					pieceHeight = 29
					// Fix the width at 28 for off board TTs; adjust height for oval
					if (getCorrectedColour(this.model.techTracks[i][j][k]) === BLUE) pieceHeight = 21
					pieceImg.css({
						width: String(pieceWidth) + "px",
						height: String(pieceHeight) + "px",
						filter: `drop-shadow(2px 0 0 white) 
										drop-shadow(0 2px 0 white)
										drop-shadow(-2px 0 0 white) 
										drop-shadow(0 -2px 0 white)`,
					})
					pieceDiv.append(pieceImg)
				}
			}
		}

		// Add in the help div
		$("#marketBoardHelpDiv").empty()

		var phasesHelpDiv = $("<div></div>")
		phasesHelpDiv.css({
			//position: "absolute",
			top: "0px",
			left: "0px",
			width: "321px",
			height: "fit-content",
			border: "2px solid black",
			padding: "2px",
			margin: "2px",
			"font-weight": "bolder",
			"line-height": "28px",
			"text-align": "left",
		})
		phasesHelpDiv.append("<B><U>" + gettext("Phases") + "</B></U><BR/>")
		phasesHelpDiv.append(String(1) + " - " + PHASES_STR[1] + " " + gettext("(E &#x2192; S)") + "<BR/>")
		phasesHelpDiv.append(String(2) + " - " + PHASES_STR[2] + "  " + gettext("(Most Gantt &#x2192; Least Gantt)") + "<BR/>")
		phasesHelpDiv.append(String(3) + " - " + PHASES_STR[3] + " " + gettext("(E &#x2192; S)") + "<BR/>")
		phasesHelpDiv.append(String(4) + " - " + PHASES_STR[4] + "<BR/>")
		phasesHelpDiv.append(String(5) + " - " + PHASES_STR[5] + " " + gettext("(S &#x2192; E)") + "<BR/>")
		phasesHelpDiv.append(String(6) + " - " + PHASES_STR[6] + "<BR/>")
		phasesHelpDiv.append(String(7) + " - " + PHASES_STR[7] + "<BR/>")
		phasesHelpDiv.append(String(8) + " - " + PHASES_STR[8] + " " + gettext("(E &#x2192; S)") + "<BR/>")

		$("#marketBoardHelpDiv").append(phasesHelpDiv)

		var justFactoryFloorDiv = $("<div></div>")
		justFactoryFloorDiv.css({
			position: "absolute",
			top: "0px",
			left: "341px",
			width: "fit-content",
			height: "fit-content",
			//border: "2px solid black",
			padding: "2px",
			margin: "2px",
		})

		justFactoryFloorDiv.append(this.justRenderJustFactory(C.currentPlayer()))

		$("#marketBoardHelpDiv").append(justFactoryFloorDiv)

		let minHeight = 1010 // Market board screen PLUS phase summary div
		minHeight += justFactoryFloorDiv.height() // Add on height of JFF div
		minHeight -= phasesHelpDiv.height() // Remove height of phase summary div

		$("#wholeMarketScreenDiv").css("min-height", String(minHeight) + "px") // Set the min-height to 300px
	}

	this.getPriceDiv = function (index, price) {
		var priceDiv = $("<div></div>")
		var Xcoord = this.model.getMBcoordsForIndex(index)[0]
		var Ycoord = this.model.getMBcoordsForIndex(index)[1]

		var divXcoord = 9 + 71.5 * Xcoord
		var divYcoord = 9 + 71.5 * Ycoord

		if (Xcoord >= 2) divXcoord += 4.5
		if (Xcoord >= 4) divXcoord += 7
		if (Xcoord >= 6) divXcoord += 4.5

		if (Ycoord >= 2) divYcoord += 4.5
		if (Ycoord >= 4) divYcoord += 7
		if (Ycoord >= 6) divYcoord += 4.5

		priceDiv.css({
			position: "absolute",
			top: String(divYcoord + 10) + "px",
			left: String(divXcoord + 10) + "px",
			width: "48px",
			height: "28px",
			border: "1px solid black",
			"background-color": "#D8E3CD",
			"font-weight": "bolder",
			"line-height": "28px",
		})
		priceDiv.html("$" + String(price) + ".")
		return priceDiv
	}

	this.getImage = function (imgName, verticalImage) {
		var img = $("<img>")

		if (imgName === "ttImg" + String(BLUE) && verticalImage) img.attr("src", imagePreURL + "/tt_B_V.png")
		else if (imgName === "ttImg" + String(GREEN) && verticalImage) img.attr("src", imagePreURL + "/tt_G_V.png")
		else if (imgName === "ttImg" + String(PURPLE) && verticalImage) img.attr("src", imagePreURL + "/tt_P_V.png")
		else if (imgName === "ttImg" + String(RED) && verticalImage) img.attr("src", imagePreURL + "/tt_R_V.png")
		else if (imgName === "ttImg" + String(YELLOW) && verticalImage) img.attr("src", imagePreURL + "/tt_Y_V.png")
		else if (imgName === "ttImg" + String(BLUE)) img.attr("src", imagePreURL + "/tt_B.png")
		else if (imgName === "ttImg" + String(GREEN)) img.attr("src", imagePreURL + "/tt_G.png")
		else if (imgName === "ttImg" + String(PURPLE)) img.attr("src", imagePreURL + "/tt_P.png")
		else if (imgName === "ttImg" + String(RED)) img.attr("src", imagePreURL + "/tt_R.png")
		else if (imgName === "ttImg" + String(YELLOW)) img.attr("src", imagePreURL + "/tt_Y.png")
		else if (imgName === "obsMarker") img.attr("src", imagePreURL + "/obs_marker.png")
		else if (imgName === MARKET_BOARD) img.attr("src", imagePreURL + "/market_board.jpg")
		else if (imgName === "piece" + String(RED)) img.attr("src", imagePreURL + "/piece_R.png")
		else if (imgName === "piece" + String(GREEN)) img.attr("src", imagePreURL + "/piece_G.png")
		else if (imgName === "piece" + String(PURPLE)) img.attr("src", imagePreURL + "/piece_P.png")
		else if (imgName === "piece" + String(BLUE)) img.attr("src", imagePreURL + "/piece_B.png")
		else if (imgName === "piece" + String(YELLOW)) img.attr("src", imagePreURL + "/piece_Y.png")
		else if (imgName === "minSpecs") img.attr("src", imagePreURL + "/min_specs.jpg")
		else if (imgName === "assemCapac") img.attr("src", imagePreURL + "/assem_capac.jpg")
		else if (imgName === "V0") img.attr("src", imagePreURL + "/v_car.png")
		else if (imgName === "V1") img.attr("src", imagePreURL + "/v_truck.png")
		else if (imgName === "V2") img.attr("src", imagePreURL + "/v_sports.png")
		else if (imgName === "S0") img.attr("src", imagePreURL + "/s_car.jpg")
		else if (imgName === "S1") img.attr("src", imagePreURL + "/s_truck.jpg")
		else if (imgName === "S2") img.attr("src", imagePreURL + "/s_sports.jpg")
		else if (imgName === "MWicon0") img.attr("src", imagePreURL + "/MW_sm_i.jpg")
		else if (imgName === "MWicon0_v") img.attr("src", imagePreURL + "/MW_sm_i_v.jpg")
		else if (imgName === "MWicon1") img.attr("src", imagePreURL + "/MW_med_i.jpg")
		else if (imgName === "MWicon2") img.attr("src", imagePreURL + "/MW_lrg_i.jpg")

		return img
	}

	this.renderFactoryFloor = function (player) {
		if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			$("#allDealershipsWithStockDiv").remove()
		}
		var img
		var i = 0
		var j = 0
		var col = "black"
		var left = 0
		var Cwidth = 0
		var Cheight = 0
		var Cleft = 0
		var Ctop = 0
		var borderCol = "lightgreen"
		var shiftForHighlight = 0
		var rotOffset = 0
		var index = 0
		var rotation = 0
		var Xcoord = 0
		var Ycoord = 0

		$("#wholeMarketScreenDiv").hide()
		$("#eligibleComponentsDiv").hide()
		if (global.name !== "BotKickStarter") $("#finishTurnButton").hide()
		$("#SSD").empty()

		if (!Rules.isSimulPhase() && this.model.players[this.model.gameFlow.turnOrder[0]] === player) $("#eligibleComponentsDiv").show()
		else {
			if (this.model.players[global.pov] === player && global.currentPlayers.indexOf(player.name) > -1) {
				$("#eligibleComponentsDiv").show()
			}
		}
		if (M.trainingGame) $("#eligibleComponentsDiv").show()
		if (global.name === "BotKickStarter") $("#eligibleComponentsDiv").show()

		if (Rules.canPlay() && global.currentPlayers.indexOf(player.name) > -1 && this.model.gameFlow.turn !== 0) {
			// show sell summary Div
			var SSD = $("#SSD")
			SSD.css({
				position: "relative",
				width: "100%",
			})
			var SSDwholeLineDiv = $("<div></div>")
			SSDwholeLineDiv.css({
				position: "relative",
				width: "fit-content",
				margin: "auto",
				display: "flex",
				"line-height": "32px",
			})
			// Show the min specs
			var minSpecs = Rules.getMinSpecsInOrder()
			//min spec
			var minSpecDiv = $("<div></div>")
			minSpecDiv.css({
				display: "flex",
			})
			var minAdded = false
			for (i = 0; i < minSpecs.length; i++) {
				if (minSpecs[i] > 0) {
					if (!minAdded) {
						minSpecDiv.append("Min: ")
						minAdded = true
					}
					// Add min spec sticks
					var minSpecTokenkDiv = $("<div></div>")
					var leftShift = 0
					var text
					if (i === RED) {
						leftShift = 0
						col = "#A12529"
						text = "Speed"
						textCol = "white"
					}
					if (i === PURPLE) {
						leftShift = 1
						col = "#46305D"
						text = "Design"
						textCol = "white"
					}
					if (i === BLUE) {
						leftShift = 2
						col = "#3474A9"
						text = "Reliability"
						textCol = "white"
					}
					if (i === YELLOW) {
						leftShift = 3
						col = "#C28727"
						text = "Safety"
						textCol = "white"
					}
					if (i === GREEN) {
						leftShift = 4
						col = "#456334"
						text = "Range"
						textCol = "white"
					}

					minSpecTokenkDiv.css({
						width: "30px",
						height: "30px",
						"font-size": "25px",
						"background-color": col,
						border: "1px solid black",
						color: textCol,
						"margin-left": "2px",
					})
					minSpecTokenkDiv.append(String(minSpecs[i]))
					minSpecDiv.append(minSpecTokenkDiv)
				}
			}
			SSDwholeLineDiv.append(minSpecDiv)

			SSDwholeLineDiv.append("&nbsp;" + gettext("Market Demand:") + " ")
			var DSinfo = this.model.getDemandSummaryInfo()

			for (i = 0; i < DSinfo.length; i++) {
				if (DSinfo[i][2][0] > 0 || DSinfo[i][2][1] > 0 || DSinfo[i][2][2] > 0) {
					var demandDiv = $("<div></div>")
					demandDiv.css({
						position: "relative",
						height: "30px",
						"margin-left": "5px",
						border: "1px solid black",
						"min-width": "fit-content",
					})
					demandDiv.append("<span class=SSD" + this.model.techTracks[0][7][0] + ">" + DSinfo[i][0] + "</span>")
					demandDiv.append("<span class=SSD" + this.model.techTracks[1][7][0] + ">" + DSinfo[i][1] + "</span>")
					var numberAdded = 0
					for (j = 0; j < DSinfo[i][2].length; j++) {
						if (DSinfo[i][2][j] > 0) {
							img = this.getImage("V" + String(j))
							img.css({
								width: "30px",
								height: "15px",
							})
							demandDiv.append(img)
							var valueSpan = $("<span></span>")
							valueSpan.text(DSinfo[i][2][j])
							left = 35 + numberAdded * 30
							valueSpan.css({
								position: "absolute",
								top: "0px",
								left: String(left) + "px",
								"font-size": "30px",
								color: "yellow",
								"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
							})
							demandDiv.append(valueSpan)
							numberAdded++
						}
					}

					SSDwholeLineDiv.append(demandDiv)
				}
			}

			SSD.append(SSDwholeLineDiv)

			var TSD = $("<div></div>")
			TSD.css({
				position: "relative",
				width: "100%",
				height: "fit=content",
			})

			var techSummaryWholeLineDiv = $("<div></div>")
			techSummaryWholeLineDiv.css({
				display: "flex",
				"flex-wrap": "wrap",
				"justify-content": "space-around",
			})

			//////////////
			var FacShowPiecesDiv = $("<div></div>")
			FacShowPiecesDiv.css({
				left: "15px",
				top: "0px",
				width: "50px",
				height: "50px",
				"margin-left": "2px",
				"margin-top": "0px",
			})
			var FacShowPiecesButton = $("<button id='showPiecesButton'>" + gettext("Show Pieces") + "</button>")
			FacShowPiecesButton.addClass("actionsLineButton")
			FacShowPiecesButton.css({
				"font-weight": "bolder",
				"font-size": "12px",
				width: "50px",
				height: "50px",
				"margin-left": "0px",
				"margin-top": "0px",
			})
			FacShowPiecesDiv.append(FacShowPiecesButton)
			FacShowPiecesButton.off()
			FacShowPiecesButton.on("click", function () {
				if ($(".TTsummaryPiece").is(":visible")) {
					$(".TTsummaryPiece").fadeOut()
				} else {
					$(".TTsummaryPiece").fadeIn()
				}
				if (FacShowPiecesButton.text() == gettext("Hide Pieces")) FacShowPiecesButton.text(gettext("Show Pieces"))
				else FacShowPiecesButton.text(gettext("Hide Pieces"))
			})

			techSummaryWholeLineDiv.append(FacShowPiecesDiv)

			////////////////////

			var allowedTechLevels = Rules.getAllowedTechLevels(false)
			var nativelyAllowedTechLevels = Rules.getNativelyAllowedTechLevels(global.pov)
			for (i = 0; i < this.model.techTracks.length; i++) {
				img = $("<img>")
				if (this.model.techTracks[i][7][0] === RED) img.attr("src", imagePreURL + "/tt_R_S.jpg")
				if (this.model.techTracks[i][7][0] === GREEN) img.attr("src", imagePreURL + "/tt_G_S.jpg")
				if (this.model.techTracks[i][7][0] === PURPLE) img.attr("src", imagePreURL + "/tt_P_S.jpg")
				if (this.model.techTracks[i][7][0] === BLUE) img.attr("src", imagePreURL + "/tt_B_S.jpg")
				if (this.model.techTracks[i][7][0] === YELLOW) img.attr("src", imagePreURL + "/tt_Y_S.jpg")

				if (this.model.techTracks[i][7][0] === RED) col = "#A12529"
				if (this.model.techTracks[i][7][0] === PURPLE) col = "#46305D"
				if (this.model.techTracks[i][7][0] === BLUE) col = "#3474A9"
				if (this.model.techTracks[i][7][0] === YELLOW) col = "#C28727"
				if (this.model.techTracks[i][7][0] === GREEN) col = "#456334"

				var singleTTsummaryDiv = $("<div></div>")
				singleTTsummaryDiv.css({
					position: "relative",
					margin: "auto", // NEEDED TO CENTRE OVERFLOW
				})

				img.css({
					width: "300px",
					height: "35px",
					"margin-right": "5px",
					border: "7px solid" + col,
				})

				singleTTsummaryDiv.append(img)

				for (j = 1; j <= 6; j++) {
					// Add a div for tooltip
					var techTooltipDiv = $("<div></div>")
					left = 9 + (j - 1) * 50
					techTooltipDiv.css({
						position: "absolute",
						left: String(left) + "px",
						top: "0px",
						width: "46px",
						height: "47px",
					})
					techTooltipDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[i][7][0], j))
					singleTTsummaryDiv.append(techTooltipDiv)
					// Add Tech Sticks
					if (allowedTechLevels[i] > 0 && allowedTechLevels[i] >= j) {
						var techBarDiv = $("<div></div>")
						if (nativelyAllowedTechLevels[i] >= j) borderCol = "lightgreen"
						else borderCol = "yellow"
						techBarDiv.css({
							position: "absolute",
							left: "0px",
							top: "0px",
							width: "40px",
							height: "5px",
							"background-color": col,
							border: "3px solid " + borderCol,
						})
						techTooltipDiv.append(techBarDiv)
					}
					// Add player minis
					var playerPiecesMiniDiv = $("<div></div>")
					playerPiecesMiniDiv.css({
						position: "absolute",
						left: "0px",
						top: "8px",
						width: "51px",
						height: "36px",
					})
					techTooltipDiv.append(playerPiecesMiniDiv)
					// Now go thru the single entry on the TT to see if pieces need to be added

					for (k = 0; k < this.model.techTracks[i][j].length; k++) {
						pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[i][j][k])))
						pieceImg.addClass("TTsummaryPiece")
						pieceWidth = 17
						pieceHeight = 18
						// Fix the width at 29; adjust height for oval
						if (getCorrectedColour(this.model.techTracks[i][j][k]) === BLUE) pieceHeight = 15
						pieceImg.css({
							width: String(pieceWidth) + "px",
							height: String(pieceHeight) + "px",
							display: "none",
						})
						playerPiecesMiniDiv.append(pieceImg)
					}
				}
				techSummaryWholeLineDiv.append(singleTTsummaryDiv)
			}
			TSD.append(techSummaryWholeLineDiv)
			SSD.append(TSD)
			SSD.show()
		}

		$("#wholeFactoryDiv").show()

		// START FAC CODE
		var factory = player.factory
		i = 0
		$("#factoryFloorDiv").empty()
		var factoryFloorDiv = $("#factoryFloorDiv")
		factoryFloorDiv.css({
			height: String(this.smallSqPxWidth * factory.height) + "px",
			width: String(this.smallSqPxWidth * factory.width) + "px",
		})
		// ************************************************************************************************** Main factory
		img = $("<img>")
		img.attr("src", imagePreURL + "/f_main.jpg")
		if (factory.mainFactoryFlipped === 0) img.addClass("factoryFllor").addClass("r" + factory.mainFactoryRotation)
		else img.addClass("factoryFllor").addClass("r" + String(factory.mainFactoryRotation) + "M")
		var mainFactoryCoords = factory.getCoordsForIndex(factory.mainFactoryIndex)
		img.css({
			height: String(this.smallSqPxWidth * 12) + "px",
			width: String(this.smallSqPxWidth * 12) + "px",
			position: "absolute",
			left: String(mainFactoryCoords[0] * this.smallSqPxWidth) + "px",
			top: String(mainFactoryCoords[1] * this.smallSqPxWidth) + "px",
		})
		factoryFloorDiv.append(img)

		// Render Expansions ******************************************************************************** EXPANSIONS
		for (i = 0; i < factory.factoryExpansions.length; i++) {
			// Expansion
			img = $("<img>")
			img.attr("src", imagePreURL + "/f_expansion.jpg")
			img.addClass("factoryFloor")
			if (factory.factoryExpansions[i][2] === 0) img.addClass("r" + String(factory.factoryExpansions[i][1]))
			else img.addClass("r" + String(factory.factoryExpansions[i][1]) + "M")

			// Render newly added expansion
			shiftForHighlight = 0
			if (factory.factoryExpansions[i][0] === factory.factoryExpansionIndexAddedThisTurn && (Rules.canPlay() || M.sandboxMode)) {
				shiftForHighlight = 1

				img.css({
					border: String(this.newlyPlacedComponentBorderSize) + "px solid green",
				})

				img.on("mouseover", function (e) {
					$(this).css({
						border: String(V.newlyPlacedComponentBorderSize) + "px solid yellow",
					})
				})
				img.on("mouseout", function (e) {
					$(this).css({
						border: String(V.newlyPlacedComponentBorderSize) + "px solid green",
					})
				})

				// PLUCK EXPANSION FROM FACTORY
				img.on("click", function (e) {
					$("#finishTurnButton").remove()
					$("#endExpansionSandboxButton").remove()

					//var i = 0;
					var placedExpansionIndex = factory.factoryExpansionIndexAddedThisTurn
					var placedExpansionRotation = factory.factoryExpansions[factory.factoryExpansions.length - 1][1]
					var placedExpansionFlipped = factory.factoryExpansions[factory.factoryExpansions.length - 1][2]

					// remove coords
					var tableHeight = 8
					var tableWidth = 6
					if (placedExpansionRotation % 2 === 1) {
						tableHeight = 6
						tableWidth = 8
					}
					for (y = 0; y < tableHeight; y++) {
						for (x = placedExpansionIndex; x < placedExpansionIndex + tableWidth; x++) {
							factory.factoryCoords[x + y * factory.width] = OUT_OF_BOUNDS
						}
					}
					// remove from expansion
					factory.factoryExpansions.pop()

					V.renderFactoryFloor(player)

					// Now do the function as if you'd clicked it from the title

					$(".ghostComponentImg").remove()
					$("#nudgeDiv").remove()

					player.factory.componentBeingAdded = FACTORY_EXPANSION_TILE
					player.factory.componentBeingAddedRotation = placedExpansionRotation
					player.factory.componentBeingAddedFlipped = placedExpansionFlipped

					V.showComponentBeingAdded(factory, FACTORY_EXPANSION_TILE)
					V.updateQSPdiv(player)

					$(".selectable").remove()
					var OOB_indexes = []
					for (var i = 0; i < player.factory.factoryCoords.length; i++) if (player.factory.factoryCoords[i] === OUT_OF_BOUNDS) OOB_indexes.push(i)
					V.externalDrawSquares(player, OOB_indexes, "#f00", "selectable")
					$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryExpansion)
					$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
					$("#componentValidationDiv").css("visibility", "hidden")
				}) // END PLACED EXPANSION CLICK
			} // END This turn fac expansion

			var expansionCoords = factory.getCoordsForIndex(factory.factoryExpansions[i][0])
			rotOffset = 0
			if (factory.factoryExpansions[i][1] % 2 == 1) rotOffset = 1
			img.css({
				height: String(this.smallSqPxWidth * 8 - 2 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				width: String(this.smallSqPxWidth * 6 - 2 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				position: "absolute",
				left: String((expansionCoords[0] + rotOffset) * this.smallSqPxWidth - 0 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				top: String((expansionCoords[1] - rotOffset) * this.smallSqPxWidth - 0 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
			})
			factoryFloorDiv.append(img)
		} // END EXPANSION DISPLAY

		// Render components ************************************************************************************************** COMPONENTS

		var componentValidationDiv = $("#componentValidationDiv")
		componentValidationDiv.html()
		componentValidationDiv.empty()
		componentValidationDiv.css({
			visibility: "visible",
		})
		var invalidCount = 0
		for (i = 0; i < factory.factoryComponents.length; i++) {
			var component = factory.factoryComponents[i][0]
			index = factory.factoryComponents[i][1]
			rotation = factory.factoryComponents[i][2]
			var flipped = factory.factoryComponents[i][3]
			var componentImg = this.getComponentImage(component)
			if (flipped === 0) componentImg.addClass("factoryComponent").addClass("r" + String(rotation))
			else componentImg.addClass("factoryComponent").addClass("r" + String(rotation) + "M")
			componentImg.attr("id", "factoryComponent" + String(rotation) + String(index))
			Cwidth = DIMENSIONS[component][0] * this.smallSqPxWidth
			Cheight = DIMENSIONS[component][1] * this.smallSqPxWidth

			// Render newly added components
			shiftForHighlight = 0
			var previousTurnComponent = true
			// Need to check names, as otherwise it was possible to move previous people's factories aroundy
			if ((global.pov != undefined && factory.factoryComponenetIndexesAddedThisTurn.includes(index) && player.name === M.players[global.pov].name && (Rules.canPlay() || M.sandboxMode)) || (M.trainingGame && factory.factoryComponenetIndexesAddedThisTurn.includes(index) && Rules.canPlay())) {
				shiftForHighlight = 1
				previousTurnComponent = false
				var validation = factory.validateSingleComponent(factory.factoryComponents[i])
				if (validation[0]) {
					componentImg.addClass("valid")
					componentImg.css({
						border: String(this.newlyPlacedComponentBorderSize) + "px solid green",
					})
				} else {
					componentImg.css({
						border: String(this.newlyPlacedComponentBorderSize) + "px solid red",
					})
				}
				if (!validation[0]) {
					invalidCount++
					componentValidationDiv.append("<LI>" + COMPONENTS_NAME_STRING[component] + " - " + COMPONENT_ERROR_STRING[validation[1]] + "</LI>")
				}

				componentImg.on("mouseover", function (e) {
					$(this).css({
						border: String(V.newlyPlacedComponentBorderSize) + "px solid yellow",
					})
				})
				componentImg.on("mouseout", function (e) {
					if ($(this).hasClass("valid")) {
						$(this).css({
							border: String(V.newlyPlacedComponentBorderSize) + "px solid green",
						})
					} else {
						$(this).css({
							border: String(V.newlyPlacedComponentBorderSize) + "px solid red",
						})
					}
				})

				// PLUCK COMPONENET FROM FACTORY
				componentImg.on("click", function (e) {
					var i = 0
					var originalPossibleSpecsToAdd
					var possibleSpecsToAdd

					var placedComponentRotation = parseInt(this.id.slice(16, 17))
					var placedComponentIndex = parseInt(this.id.slice(17))
					// find out what componentName is at this index and add one back
					var arrayIndex = _.findIndex(factory.factoryComponents, function (el) {
						return el[1] === placedComponentIndex
					})
					var componentName = factory.factoryComponents[arrayIndex][0]
					var placedComponentFlipped = factory.factoryComponents[arrayIndex][3]

					if (ARROWS.includes(componentName)) originalPossibleSpecsToAdd = factory.findAllPossibleSpecsToAdd()

					factory.removeComponentAtIndex(placedComponentIndex)

					// refresh components
					V.displayEligibleFactoryTiles(player, Rules.getEligibleFactoryComponentNames(player))

					V.renderFactoryFloor(player)

					// Now do the function as if you'd clicked it from the title

					$(".ghostComponentImg").remove()
					$("#nudgeDiv").remove()

					player.factory.componentBeingAdded = componentName
					player.factory.componentBeingAddedRotation = placedComponentRotation
					player.factory.componentBeingAddedFlipped = placedComponentFlipped

					V.showComponentBeingAdded(player.factory, componentName)
					V.updateQSPdiv(player)

					$(".selectable").remove()

					if (ARROWS.includes(componentName)) {
						// Gets array [index in array of factory component now arrowless, arrowdID]
						possibleSpecsToAdd = factory.findAllPossibleSpecsToAdd()
						var specArray = []
						// Need 1 as the default
						var specArrayIndex = 1

						// Loop over the larger arrary to find the element not in the smaller, OR in smaller, but with different length
						for (i = 0; i < possibleSpecsToAdd.length; i++) {
							var found = false
							for (var j = 0; j < originalPossibleSpecsToAdd.length; j++) {
								// If index same and length same, it is found
								if (possibleSpecsToAdd[i][0] === originalPossibleSpecsToAdd[j][0] && possibleSpecsToAdd[i].length === originalPossibleSpecsToAdd[j].length) {
									found = true
									break
								}
								// If referencing the same component, check lengths are the same
								if (possibleSpecsToAdd[i][0] === originalPossibleSpecsToAdd[j][0] && possibleSpecsToAdd[i].length !== originalPossibleSpecsToAdd[j].length) {
									// Find the additional element in the bigger array, then get its index
									var missingArrow = possibleSpecsToAdd[i].filter((x) => !originalPossibleSpecsToAdd[j].includes(x))[0]
									if (missingArrow == undefined) missingArrow = originalPossibleSpecsToAdd[j].last()
									specArrayIndex = possibleSpecsToAdd[i].indexOf(missingArrow)
									break
								}
							}
							if (!found) {
								specArray.push(possibleSpecsToAdd[i])
								break
							}
						}
						// spec array is [component, arrow, arrow, arrow]
						// but need the index of the missing arrow
						V.actionClickedonQSPspec(specArray[0], specArray[0][specArrayIndex])
					} else {
						V.externalDrawSquares(player, player.factory.getEmptyFactorySpaces(), "yellow", "selectable")
						$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryComponent)
						$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
					}
				}) // END PLACED COMPONENT CLICK
			} // END This turn fac components
			Cwidth = DIMENSIONS[component][0]
			Cheight = DIMENSIONS[component][1]

			rotOffset = 0
			if (rotation % 2 == 1) rotOffset = 1
			rotOffset = (rotOffset * (Cwidth - Cheight)) / 2

			Cleft = factory.getCoordsForIndex(index)[0] - rotOffset
			Ctop = factory.getCoordsForIndex(index)[1] + rotOffset

			var borderShift = this.previouslyPlacedComponentBorderSize
			if (!previousTurnComponent) borderShift = this.newlyPlacedComponentBorderSize

			componentImg.css({
				height: String(Cheight * this.smallSqPxWidth - 2 * borderShift) + "px",
				width: String(Cwidth * this.smallSqPxWidth - 2 * borderShift) + "px",
				position: "absolute",
				left: String(Cleft * this.smallSqPxWidth - 0 * shiftForHighlight) + "px",
				top: String(Ctop * this.smallSqPxWidth - 0 * shiftForHighlight) + "px",
			})
			if (previousTurnComponent) componentImg.css({ border: "1px solid black" })

			factoryFloorDiv.append(componentImg)
		} // END faactory componennts

		if (this.model.gameFlow.turn === 0 && player.factory.factoryComponents.length !== 2) invalidCount++

		// Finally, check you are not duplicating preciously placed techs
		for (i = 0; i < factory.factoryComponents.length; i++) {
			var validation2 = factory.checkForDuplicateTechValidation(factory.factoryComponents[i])

			if (!validation2[0]) {
				invalidCount++
				componentValidationDiv.append(
					"<LI>" +
						interpolate(
							gettext("Adding a new tech caused: %(componentName)s - %(componentError)s"),
							{
								componentName: COMPONENTS_NAME_STRING[factory.factoryComponents[i][0]],
								componentError: COMPONENT_ERROR_STRING[validation2[1]],
							},
							true
						) +
						"</LI>"
				)
			}
		}

		// And check avail compo not negative!
		if (Rules.canPlay()) {
			for (i = 0; i < this.model.availableComponents.length; i++) {
				if (this.model.availableComponents[i] < 0) {
					invalidCount++
					componentValidationDiv.append(
						"<LI>" +
							interpolate(
								gettext("Please remove: %(componentName)s - previous players already took this"),
								{
									componentName: COMPONENTS_NAME_STRING[i],
								},
								true
							) +
							"</LI>"
					)
					break
				}
			}
		}

		if (invalidCount === 0) {
			// You may end the turn
			$("#finishTurnButton").show()

			// Add button back to div
			$(".enableOnInput").prop("disabled", true)
			player.factory.isValidFactory = true
			player.factory.checkDealershipLevels()
			componentValidationDiv.css({
				color: "darkgreen",
				"text-align": "left",
			})

			// Now components are updated with tech. So just go thru factory Components and add to div
			for (i = 0; i < player.factory.factoryComponents.length; i++) {
				if (MAINLINES.includes(player.factory.factoryComponents[i][0]) || DEALERSHIPS.includes(player.factory.factoryComponents[i][0])) {
					index = player.factory.factoryComponents[i][1]
					rotation = player.factory.factoryComponents[i][2]
					Xcoord = player.factory.getCoordsForIndex(index)[0]
					Ycoord = player.factory.getCoordsForIndex(index)[1]
					Cheight = DIMENSIONS[player.factory.factoryComponents[i][0]][1]

					if (DEALERSHIPS.includes(player.factory.factoryComponents[i][0])) {
						if (rotation == 0) Ycoord += 1.5
						if (rotation == 3) Xcoord += 1
					}
					var techLevelsDiv = $("<div></div>")
					techLevelsDiv.css({
						position: "absolute",
						left: String(Xcoord * this.smallSqPxWidth + 8) + "px",
						top: String(Ycoord * this.smallSqPxWidth + 8) + "px",
						width: "fit-content",
						height: "fit-content",
						"z-index": "1000",
					})
					var techLevelsSpan = $("<span></span>")
					techLevelsSpan.addClass("techLevelsSpan")

					var addedNumbers = 0
					/*for (j = 0; j < player.factory.factoryComponents[i][TL_IDX].length; j++) {
						if (player.factory.factoryComponents[i][TL_IDX][j] > 0) {
							techLevelsSpan.append("<span class='techLevelNumber" + String(j) + "a'>" + String(player.factory.factoryComponents[i][TL_IDX][j]) + "</span>")
							addedNumbers++
							if (rotation % 2 == 1 && addedNumbers % 2 === 0) techLevelsSpan.append("<BR/>")
						}
					}*/
					for (const j of TL_DISPLAY_IDX_ORDER) {
						const value = player.factory.factoryComponents[i][TL_IDX][j]

						if (value > 0) {
							techLevelsSpan.append("<span class='techLevelNumber" + String(j) + "a'>" + String(value) + "</span>")
							addedNumbers++

							// Handle the line break logic based on your rotation/count
							if (rotation % 2 == 1 && addedNumbers % 2 === 0) {
								techLevelsSpan.append("<BR/>")
							}
						}
					}
					techLevelsDiv.append(techLevelsSpan)
					factoryFloorDiv.append(techLevelsDiv)
				}
			}
		} else {
			componentValidationDiv.css({
				color: "red",
				"text-align": "left",
			})
		}

		// If you clicked back onto the factory, re-enable highlights
		if (player.factory.componentBeingAdded != -1) {
			// Now do the function as if you'd clicked it from the title

			$(".ghostComponentImg").remove()

			var componentName = player.factory.componentBeingAdded

			V.showComponentBeingAdded(player.factory, componentName)
			V.updateQSPdiv(player)
			$(".selectable").remove()
			if (componentName !== FACTORY_EXPANSION_TILE) {
				V.externalDrawSquares(player, player.factory.getEmptyFactorySpaces(), "yellow", "selectable")
				$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryComponent)
				$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
			} else {
				var OOB_indexes = []
				for (i = 0; i < player.factory.factoryCoords.length; i++) if (player.factory.factoryCoords[i] === OUT_OF_BOUNDS) OOB_indexes.push(i)
				V.externalDrawSquares(player, OOB_indexes, "#f00", "selectable")
				$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryExpansion)
				$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
				$("#componentValidationDiv").css("visibility", "hidden")
			}
		}

		// if your fac, show sandbox button
		if (this.model.players.indexOf(player) === global.pov) {
			if (!this.model.sandboxMode) {
				var sandboxButton = $('<button id="sandboxButton">' + gettext("Enter Sandbox Mode") + "</button>")
				sandboxButton.addClass("actionsLineButton")
				$("#componentValidationDiv").prepend(sandboxButton)
				$("#componentValidationDiv").show()
				sandboxButton.on("click", function () {
					M.sandboxMode = true
					if (!(M.gameFlow.phase === PHASE_BUILD_FACTORY && M.gameFlow.subphase === 1)) global.sandboxReset = compressObjectToDB(M.export())
					C.startActions()
					V.updateQSPdiv()
				})
			} else if (this.model.sandboxMode) {
				$("#eligibleComponentsDiv").show()
			}
		}

		// Show a summary of the market board
		$("#wholeMarketAreaSummaryDiv").remove()

		var top

		var wholeMarketAreaSummaryDiv = $("<div></div>")
		wholeMarketAreaSummaryDiv.attr("id", "wholeMarketAreaSummaryDiv") // Not in CSS -- just used to remove

		wholeMarketAreaSummaryDiv.css({
			position: "relative",
			//width: "fit-content",
			width: "1250px",
			overflow: "scroll",
			margin: "auto",
			height: "780px",
			display: "flex",
			//"background-color": "lightblue",
			"margin-top": "10px",
			/*"border-left-style": "solid",
			"border-left-width": "10px",
			"border-left-color": left_border_colour,
			"border-bottom-style": "solid",
			"border-bottom-width": "10px",
			"border-bottom-color": bottom_border_colour,
			"padding-left": "5px",
			"padding-bottom": "5px",
			"margin-bottom": "5px",*/
		})

		/*var left_border_colour = "#A12529"
		if (this.model.techTracks[0][7][0] === GREEN) left_border_colour = "#456334"
		else if (this.model.techTracks[0][7][0] === PURPLE) left_border_colour = "#51365F"
		else if (this.model.techTracks[0][7][0] === BLUE) left_border_colour = "#3474A9"
		else if (this.model.techTracks[0][7][0] === YELLOW) left_border_colour = "#C28727"
		var bottom_border_colour = "#A12529"
		if (this.model.techTracks[1][7][0] === GREEN) bottom_border_colour = "#456334"
		else if (this.model.techTracks[1][7][0] === PURPLE) bottom_border_colour = "#51365F"
		else if (this.model.techTracks[1][7][0] === BLUE) bottom_border_colour = "#3474A9"
		else if (this.model.techTracks[1][7][0] === YELLOW) bottom_border_colour = "#C28727"*/

		var leftSideDiv = $("<div></div>")
		leftSideDiv.css({
			position: "relative",
			top: "0px",
			width: "140px",
			height: "600px",
			//"background-color": "red",
			display: "inline-block",
			"margin-top": "0px",
			"vertical-align": "top",
		})

		// Vertical TT
		var verticalTTdiv = $("<div></div>")
		var verticalTTimg = this.getImage("ttImg" + String(this.model.techTracks[0][7][0]), true)
		verticalTTimg.css({
			position: "absolute",
			top: "55px",
			left: "0px",
			width: "120px",
			height: "490px",
			margin: "0px",
			padding: "0px",
			//"background-color": "red",
		})
		verticalTTimg.addClass("trackImg")
		verticalTTdiv.append(verticalTTimg)
		var specAxis = $("<div></div>")
		specAxis.attr("id", "verticalSpecAxis")
		// add spec divs
		var YspecAxis = [this.model.techTracks[0][7][1], this.model.techTracks[0][7][1] + 1, this.model.techTracks[0][7][1] + 2, this.model.techTracks[0][7][1] + 3]
		for (i = 0; i < 4; i++) {
			var spcDiv = $("<div></div>")
			top = 150 * i
			spcDiv.css({
				position: "absolute",
				left: "0px",
				top: String(top) + "px",
				width: "14px",
				"margin-left": "2px",
				height: "140px",
				"line-height": "140px",
				"font-weight": "bolder",
				"margin-top": "5px",
				"margin-bottom": "5px",
				border: "1px solid black",
			})
			spcDiv.append(String(YspecAxis[3 - i]))
			specAxis.append(spcDiv)
		}
		verticalTTdiv.append(specAxis)
		// Add min spec sticks
		minSpec = this.model.techTracks[0][7][1]
		minSpecStickDiv = $("<div></div>")
		top = 132 + minSpec * 66
		minSpecStickDiv.css({
			position: "absolute",
			left: "24px",
			top: String(top) + "px",
			width: "90px",
			height: "10px",
			"margin-left": "2px",
			"background-color": "white",
			border: "1px solid black",
		})

		verticalTTdiv.append(minSpecStickDiv)

		// now add in player pieces
		for (i = 0; i < this.model.techTracks[0].length - 1; i++) {
			// ALWAYS add the div to supply tool tips
			// create a div to hold the pieces
			pieceDiv = $("<div></div>")
			pieceDiv.addClass("pieceDiv")
			top = 73 + 66 * i
			pieceDiv.css({
				// Start at left 73. Shift 66
				position: "absolute",
				left: "28px",
				top: String(top) + "px",
				width: "90px",
				height: "59px",
			})
			pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[0][7][0], i))
			verticalTTdiv.append(pieceDiv)
			for (j = 0; j < this.model.techTracks[0][i].length; j++) {
				pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[0][i][j])))
				pieceImg.addClass("piece")
				pieceImg.attr("id", "TT0" + String(i) + String(this.model.techTracks[0][i][j]))
				pieceWidth = 29
				pieceHeight = 30
				// Fix the width at 29; adjust height for oval
				if (getCorrectedColour(this.model.techTracks[0][i][j]) === BLUE) pieceHeight = 21
				pieceImg.css({
					width: String(pieceWidth) + "px",
					height: String(pieceHeight) + "px",
					filter: `drop-shadow(2px 0 0 white) 
							drop-shadow(0 2px 0 white)
							drop-shadow(-2px 0 0 white) 
							drop-shadow(0 -2px 0 white)`,
				})
				pieceDiv.append(pieceImg)
			}
			//} END if piece in array pos
		} // end adding player pieces to veritcal TT
		leftSideDiv.append(verticalTTdiv)

		wholeMarketAreaSummaryDiv.append(leftSideDiv)

		var marketBoardDiv = this.getMarketBoardDiv(600)
		marketBoardDiv.css({
			"margin-top": "0px",
			"vertical-align": "top",
		})

		wholeMarketAreaSummaryDiv.append(marketBoardDiv)

		// RIGHT SIDE
		var allRightInfos = $("<div></div>")
		allRightInfos.css({
			/*position: "absolute",
			top: "0px",
			left: "740px",
			width: "490px",
			height: "740px",*/

			position: "relative",
			top: "0px",
			left: "px",
			width: "490px",
			height: "fit-content",
			display: "inline-block",
			//"background-color": "white",
		})

		//min spec
		var minSpecDiv = $("<div></div>")
		minSpecDiv.css({
			position: "absolute",
			top: "0px",
			left: "0px",
			width: "490px",
			height: "152px",
		})
		allRightInfos.append(minSpecDiv)
		var minSpecImg = this.getImage("minSpecs", false)
		minSpecImg.css({
			width: "320px",
			height: "142px",
			border: "2px solid black",
		})
		minSpecDiv.append(minSpecImg)

		var minSpecs = Rules.getMinSpecsInOrder()
		for (i = 0; i < minSpecs.length; i++) {
			if (minSpecs[i] > 0) {
				// Add min spec sticks
				var minSpecTokenkDiv = $("<div></div>")
				var leftShift = 0
				var text
				if (i === RED) {
					leftShift = 0
					col = "#A12529"
					text = "Speed"
					textCol = "white"
				}
				if (i === PURPLE) {
					leftShift = 1
					col = "#51365F"
					text = "Design"
					textCol = "white"
				}
				if (i === BLUE) {
					leftShift = 2
					col = "#3474A9"
					text = "Reliability"
					textCol = "white"
				}
				if (i === YELLOW) {
					leftShift = 3
					col = "#C28727"
					text = "Safety"
					textCol = "white"
				}
				if (i === GREEN) {
					leftShift = 4
					col = "#456334"
					text = "Range"
					textCol = "white"
				}

				left = 99 + leftShift * 58
				minSpecTokenkDiv.css({
					position: "absolute",
					left: String(left) + "px",
					top: "90px",
					width: "50px",
					height: "45px",
					"font-size": "43px",
					"background-color": col,
					border: "1px solid black",
					color: textCol,
				})
				minSpecTokenkDiv.append(String(minSpecs[i]))

				minSpecDiv.append(minSpecTokenkDiv)
			}
		}

		var showPiecesDiv = $("<div></div>")
		showPiecesDiv.css({
			position: "absolute",
			left: "5px",
			top: "5px",
			width: "60px",
			height: "60px",
			"margin-left": "2px",
		})
		var showPiecesButton = $("<button id='showPiecesButton'>" + gettext("Hide Pieces") + "</button>")
		showPiecesButton.addClass("actionsLineButton")
		showPiecesButton.css({
			"font-weight": "bolder",
			"font-size": "17px",
			width: "68px",
			height: "60px",
			"margin-left": "0px",
		})
		showPiecesDiv.append(showPiecesButton)

		showPiecesButton.off()
		showPiecesButton.on("click", function () {
			if ($(".piece").is(":visible")) {
				$(".piece").fadeOut()
			} else {
				$(".piece").fadeIn()
			}
			if (showPiecesButton.text() == gettext("Hide Pieces")) showPiecesButton.text(gettext("Show Pieces"))
			else showPiecesButton.text(gettext("Hide Pieces"))
		})

		minSpecDiv.append(showPiecesDiv)

		// assem capac
		var assemCapacDiv = $("<div></div>")
		assemCapacDiv.css({
			position: "absolute",
			top: "152px",
			left: "0px",
			width: "490px",
			height: "228px",
		})
		allRightInfos.append(assemCapacDiv)
		var assemCapacImg = this.getImage("assemCapac", false)
		assemCapacImg.addClass("trackImg")
		assemCapacImg.css({
			width: "380px",
			height: "218px",
			border: "2px solid black",
		})
		assemCapacDiv.append(assemCapacImg)
		// now add in player pieces
		for (i = 0; i < this.model.assemblyCapacityTrack.length; i++) {
			if (this.model.assemblyCapacityTrack[i].length > 0 || 1 == 1) {
				// create a div to hold the pieces
				pieceDiv = $("<div></div>")
				pieceDiv.addClass("pieceDiv")
				left = 55 + 76 * i
				pieceDiv.css({
					// Start at left 73. Shift 66
					position: "absolute",
					top: "125px",
					left: String(left) + "px",
					width: "75px",
					height: "83px",
				})
				assemCapacDiv.append(pieceDiv)
				for (j = 0; j < this.model.assemblyCapacityTrack[i].length; j++) {
					pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.assemblyCapacityTrack[i][j])))
					pieceImg.addClass("piece")
					pieceImg.attr("id", "ACT" + String(i) + String(this.model.assemblyCapacityTrack[i][j]))
					pieceWidth = 29
					pieceHeight = 30
					// Fix the width at 29; adjust height for oval
					if (getCorrectedColour(this.model.assemblyCapacityTrack[i][j]) === BLUE) pieceHeight = 21
					pieceImg.css({
						width: String(pieceWidth) + "px",
						height: String(pieceHeight) + "px",
						filter: `drop-shadow(2px 0 0 white) 
										drop-shadow(0 2px 0 white)
										drop-shadow(-2px 0 0 white) 
										drop-shadow(0 -2px 0 white)`,
					})
					pieceDiv.append(pieceImg)
				}
			}
		}

		// 360 for 3 x TT
		for (i = 2; i < this.model.techTracks.length; i++) {
			var divTop = 380 + 120 * (i - 2)
			var ttDiv = $("<div></div>")
			ttDiv.css({
				position: "absolute",
				top: String(divTop) + "px",
				left: "0px",
				width: "490px",
				height: "120px",
			})
			allRightInfos.append(ttDiv)
			var ttImg = this.getImage("ttImg" + String(this.model.techTracks[i][7][0]), false)
			ttImg.addClass("trackImg")
			ttImg.css({
				width: "490px",
				height: "120px",
			})
			ttDiv.append(ttImg)

			// Add min spec sticks
			minSpec = this.model.techTracks[i][7][1]
			minSpecStickDiv = $("<div></div>")
			left = 76 + minSpec * 66
			minSpecStickDiv.css({
				position: "absolute",
				left: String(left) + "px",
				top: "4px",
				width: "10px",
				height: "90px",
				"background-color": "white",
				border: "1px solid black",
			})

			ttDiv.append(minSpecStickDiv)

			// now add in player pieces
			for (j = 0; j < this.model.techTracks[1].length - 1; j++) {
				// create a div to hold the pieces
				pieceDiv = $("<div></div>")
				pieceDiv.addClass("pieceDiv")
				pieceLeft = 18 + 66 * j
				pieceDiv.css({
					// Start at left 73. Shift 66
					position: "absolute",
					top: "12px",
					left: String(pieceLeft) + "px",
					width: "56px",
					height: "85px",
				})
				pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[i][7][0], j))
				ttDiv.append(pieceDiv)
				for (k = 0; k < this.model.techTracks[i][j].length; k++) {
					pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[i][j][k])))
					pieceImg.addClass("piece")
					pieceImg.attr("id", "TT" + String(i) + String(j) + String(this.model.techTracks[i][j][k]))
					pieceWidth = 28
					pieceHeight = 29
					// Fix the width at 28 for off board TTs; adjust height for oval
					if (getCorrectedColour(this.model.techTracks[i][j][k]) === BLUE) pieceHeight = 21
					pieceImg.css({
						width: String(pieceWidth) + "px",
						height: String(pieceHeight) + "px",
						filter: `drop-shadow(2px 0 0 white) 
										drop-shadow(0 2px 0 white)
										drop-shadow(-2px 0 0 white) 
										drop-shadow(0 -2px 0 white)`,
					})
					pieceDiv.append(pieceImg)
				}
			}
		}

		wholeMarketAreaSummaryDiv.append(allRightInfos)

		// Now the abs divs
		// Obs marker
		var obsMarkerDiv = $("<div></div>")
		obsMarkerDiv.css({
			position: "absolute",
			top: "600px",
			left: "0px",
			width: "140px",
			height: "140px",
		})
		//$("#wholeMarketBoardDiv").append(obsMarkerDiv)
		var obsMarkerImg = this.getImage("obsMarker", false)
		if (this.model.obsolescenceMarkerDirection === 0) obsMarkerImg.addClass("r3")
		obsMarkerImg.css({
			width: "140px",
			height: "140px",
		})
		obsMarkerDiv.append(obsMarkerImg)

		wholeMarketAreaSummaryDiv.append(obsMarkerDiv)

		// Horiz TT
		// Horizontal TT
		var horizontalTTdiv = $("<div></div>")
		horizontalTTdiv.css({
			position: "absolute",
			top: "600px",
			left: "140px",
			height: "140px",
			width: "600px",
			display: "flex",
			"justify-content": "left",
		})
		specAxis = $("<div></div>")
		specAxis.attr("id", "horizontalSpecAxis")

		// add spec divs
		var XspecAxis = [this.model.techTracks[1][7][1], this.model.techTracks[1][7][1] + 1, this.model.techTracks[1][7][1] + 2, this.model.techTracks[1][7][1] + 3]
		for (i = 0; i < 4; i++) {
			var specDiv = $("<div></div>")
			left = 150 * i
			specDiv.css({
				position: "absolute",
				left: String(left) + "px",
				top: "0px",
				height: "14px",
				"margin-top": "2px",
				width: "140px",
				"font-weight": "bolder",
				"font-size": "13px",
				"margin-left": "5px",
				"margin-right": "5px",
				border: "1px solid black",
			})
			specDiv.append(String(XspecAxis[i]))
			specAxis.append(specDiv)
		}

		horizontalTTdiv.append(specAxis)
		var horizontalTTImg = this.getImage("ttImg" + String(this.model.techTracks[1][7][0]), false)
		horizontalTTImg.addClass("trackImg")
		horizontalTTImg.attr("id", "horizontalTTImg")
		horizontalTTImg.css({
			position: "relative",
			top: "20px",
			left: "55px",
			width: "490px",
			height: "120px",
		})
		horizontalTTdiv.append(horizontalTTImg)

		// Add min spec sticks
		minSpec = this.model.techTracks[1][7][1]
		minSpecStickDiv = $("<div></div>")
		left = 131 + minSpec * 66
		minSpecStickDiv.css({
			position: "absolute",
			left: String(left) + "px",
			top: "24px",
			width: "10px",
			height: "90px",
			"background-color": "white",
			border: "1px solid black",
		})

		horizontalTTdiv.append(minSpecStickDiv)

		// now add in player pieces
		for (i = 0; i < this.model.techTracks[1].length - 1; i++) {
			// create a div to hold the pieces
			pieceDiv = $("<div></div>")
			pieceDiv.addClass("pieceDiv")
			left = 73 + 66 * i
			pieceDiv.css({
				// Start at left 73. Shift 66
				position: "absolute",
				top: "28px",
				left: String(left) + "px",
				width: "59px",
				height: "85px",
			})
			pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[1][7][0], i))
			horizontalTTdiv.append(pieceDiv)
			for (j = 0; j < this.model.techTracks[1][i].length; j++) {
				pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[1][i][j])))
				pieceImg.addClass("piece")
				pieceImg.attr("id", "TT1" + String(i) + String(this.model.techTracks[1][i][j]))
				pieceWidth = 29
				pieceHeight = 30
				// Fix the width at 29; adjust height for oval
				if (getCorrectedColour(this.model.techTracks[1][i][j]) === BLUE) pieceHeight = 21
				pieceImg.css({
					width: String(pieceWidth) + "px",
					height: String(pieceHeight) + "px",
					filter: `drop-shadow(2px 0 0 white) 
									drop-shadow(0 2px 0 white)
									drop-shadow(-2px 0 0 white) 
									drop-shadow(0 -2px 0 white)`,
				})
				pieceDiv.append(pieceImg)
			}
		}

		wholeMarketAreaSummaryDiv.append(horizontalTTdiv)

		// Add to bottom of fac
		$("#wholeFactoryDiv").append(wholeMarketAreaSummaryDiv)
	}

	this.justRenderJustFactory = function (player) {
		// START FAC CODE
		var factory = player.factory
		var i = 0
		//$("#factoryFloorDiv").empty()
		var factoryFloorDiv = $('<div class="" >')

		factoryFloorDiv.css({
			height: String(this.smallSqPxWidth * factory.height) + "px",
			width: String(this.smallSqPxWidth * factory.width) + "px",
		})
		// ************************************************************************************************** Main factory
		var img = $("<img>")
		img.attr("src", imagePreURL + "/f_main.jpg")
		if (factory.mainFactoryFlipped === 0) img.addClass("factoryFllor").addClass("r" + factory.mainFactoryRotation)
		else img.addClass("factoryFllor").addClass("r" + String(factory.mainFactoryRotation) + "M")
		var mainFactoryCoords = factory.getCoordsForIndex(factory.mainFactoryIndex)
		img.css({
			height: String(this.smallSqPxWidth * 12) + "px",
			width: String(this.smallSqPxWidth * 12) + "px",
			position: "absolute",
			left: String(mainFactoryCoords[0] * this.smallSqPxWidth) + "px",
			top: String(mainFactoryCoords[1] * this.smallSqPxWidth) + "px",
		})
		factoryFloorDiv.append(img)

		// Render Expansions ******************************************************************************** EXPANSIONS
		for (i = 0; i < factory.factoryExpansions.length; i++) {
			// Expansion
			img = $("<img>")
			img.attr("src", imagePreURL + "/f_expansion.jpg")
			img.addClass("factoryFloor")
			if (factory.factoryExpansions[i][2] === 0) img.addClass("r" + String(factory.factoryExpansions[i][1]))
			else img.addClass("r" + String(factory.factoryExpansions[i][1]) + "M")

			// Render newly added expansion
			var shiftForHighlight = 0
			if (factory.factoryExpansions[i][0] === factory.factoryExpansionIndexAddedThisTurn && (Rules.canPlay() || M.sandboxMode)) {
				shiftForHighlight = 1

				img.css({
					border: String(this.newlyPlacedComponentBorderSize) + "px solid green",
				})
			} // END This turn fac expansion

			var expansionCoords = factory.getCoordsForIndex(factory.factoryExpansions[i][0])
			rotOffset = 0
			if (factory.factoryExpansions[i][1] % 2 == 1) rotOffset = 1
			img.css({
				height: String(this.smallSqPxWidth * 8 - 2 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				width: String(this.smallSqPxWidth * 6 - 2 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				position: "absolute",
				left: String((expansionCoords[0] + rotOffset) * this.smallSqPxWidth - 0 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				top: String((expansionCoords[1] - rotOffset) * this.smallSqPxWidth - 0 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
			})
			factoryFloorDiv.append(img)
		} // END EXPANSION DISPLAY

		// Render components ************************************************************************************************** COMPONENTS

		var componentValidationDiv = $("#componentValidationDiv")
		componentValidationDiv.html()
		componentValidationDiv.empty()
		componentValidationDiv.css({
			visibility: "visible",
		})
		//var invalidCount = 0
		for (i = 0; i < factory.factoryComponents.length; i++) {
			var component = factory.factoryComponents[i][0]
			index = factory.factoryComponents[i][1]
			rotation = factory.factoryComponents[i][2]
			var flipped = factory.factoryComponents[i][3]
			var componentImg = this.getComponentImage(component)
			if (flipped === 0) componentImg.addClass("factoryComponent").addClass("r" + String(rotation))
			else componentImg.addClass("factoryComponent").addClass("r" + String(rotation) + "M")
			componentImg.attr("id", "factoryComponent" + String(rotation) + String(index))
			Cwidth = DIMENSIONS[component][0] * this.smallSqPxWidth
			Cheight = DIMENSIONS[component][1] * this.smallSqPxWidth

			// Render newly added components
			shiftForHighlight = 0
			var previousTurnComponent = true
			// Need to check names, as otherwise it was possible to move previous people's factories aroundy
			/*if ((global.pov != undefined && factory.factoryComponenetIndexesAddedThisTurn.includes(index) && player.name === M.players[global.pov].name && (Rules.canPlay() || M.sandboxMode)) || (M.trainingGame && factory.factoryComponenetIndexesAddedThisTurn.includes(index) && Rules.canPlay())) {
				shiftForHighlight = 1
				previousTurnComponent = false
				var validation = factory.validateSingleComponent(factory.factoryComponents[i])
				if (validation[0]) {
					componentImg.addClass("valid")
					componentImg.css({
						border: String(this.newlyPlacedComponentBorderSize) + "px solid green",
					})
				} else {
					componentImg.css({
						border: String(this.newlyPlacedComponentBorderSize) + "px solid red",
					})
				}

			} // END This turn fac components*/
			Cwidth = DIMENSIONS[component][0]
			Cheight = DIMENSIONS[component][1]

			rotOffset = 0
			if (rotation % 2 == 1) rotOffset = 1
			rotOffset = (rotOffset * (Cwidth - Cheight)) / 2

			Cleft = factory.getCoordsForIndex(index)[0] - rotOffset
			Ctop = factory.getCoordsForIndex(index)[1] + rotOffset

			var borderShift = this.previouslyPlacedComponentBorderSize
			if (!previousTurnComponent) borderShift = this.newlyPlacedComponentBorderSize

			componentImg.css({
				height: String(Cheight * this.smallSqPxWidth - 2 * borderShift) + "px",
				width: String(Cwidth * this.smallSqPxWidth - 2 * borderShift) + "px",
				position: "absolute",
				left: String(Cleft * this.smallSqPxWidth - 0 * shiftForHighlight) + "px",
				top: String(Ctop * this.smallSqPxWidth - 0 * shiftForHighlight) + "px",
			})
			if (previousTurnComponent) componentImg.css({ border: "1px solid black" })

			factoryFloorDiv.append(componentImg)
		} // END faactory componennts

		return factoryFloorDiv
	}

	this.displayEligibleFactoryTiles = function (player, eligibleFactoryTiles) {
		var mainlinesDiv = $("<div></div>")
		var AlinesDiv = $("<div></div>")
		var BlinesDiv = $("<div></div>")
		var ClinesDiv = $("<div></div>")
		var DlinesDiv = $("<div></div>")
		var departmentsDiv = $("<div></div>")
		var playerComponentsDiv = $("<div></div>")

		mainlinesDiv.addClass("componentsBin")
		AlinesDiv.addClass("componentsBin")
		BlinesDiv.addClass("componentsBin")
		ClinesDiv.addClass("componentsBin")
		DlinesDiv.addClass("componentsBin")
		departmentsDiv.addClass("componentsBin")
		playerComponentsDiv.addClass("componentsBin")

		var eligibleComponentsDiv = $("#eligibleComponentsDiv")
		eligibleComponentsDiv.empty()

		var allowedTechLevels = Rules.getAllowedTechLevels(true)
		var nativelyAllowedTechLevels = Rules.getNativelyAllowedTechLevels(global.pov, true)
		// Now we have allowed, natively allowed, in colour order

		for (var i = 0; i < eligibleFactoryTiles.length; i++) {
			var newComponentIndividualDiv = $("<div/>")
			newComponentIndividualDiv.css({
				position: "relative",
			})
			var newComponentImg = this.getComponentImage(eligibleFactoryTiles[i])
			newComponentImg.attr("id", "newComponentImg" + String(eligibleFactoryTiles[i]))

			// CHANGE THE BORDER DEPENDING ON ELIGIBILIGY. OUTLINE TO BLACK
			var borderColour = Rules.getCorrectBorderColour(eligibleFactoryTiles[i], allowedTechLevels, nativelyAllowedTechLevels)

			newComponentImg.css({
				margin: "4px",
				border: "2px solid " + borderColour,
				outline: "1px solid black",
			})
			// Check if it isn't available
			if (M.availableComponents[eligibleFactoryTiles[i]] <= 0) {
				newComponentImg.css({
					opacity: "0.5",
				})
			}
			newComponentIndividualDiv.append(newComponentImg)

			var newComponentIndividualAmountDiv = $("<div/>")
			newComponentIndividualAmountDiv.html(String(M.availableComponents[eligibleFactoryTiles[i]]))
			var top = 5
			var left = 5
			if (eligibleFactoryTiles[i] === BUMPER) left = 45
			if (ARROWS.includes(eligibleFactoryTiles[i])) top = 35
			if (ARROWS.includes(eligibleFactoryTiles[i])) newComponentIndividualAmountDiv.css({ visibility: "hidden" })

			newComponentIndividualAmountDiv.css({
				position: "absolute",
				top: String(top) + "px",
				left: String(left) + "px",
				color: "white",
				"background-color": "black",
				"font-size": "15px",
				"z-index": "50",
				padding: "2px",
			})
			if (M.availableComponents[eligibleFactoryTiles[i]] <= 0) newComponentIndividualAmountDiv.css({ color: "white", "background-color": "red", "font-weight": "bolder" })
			newComponentIndividualDiv.append(newComponentIndividualAmountDiv)

			if (MAINLINES.includes(eligibleFactoryTiles[i])) mainlinesDiv.append(newComponentIndividualDiv)
			if (A_TECHS.includes(eligibleFactoryTiles[i]) || A_ARROWS.includes(eligibleFactoryTiles[i])) AlinesDiv.append(newComponentIndividualDiv)
			if (B_TECHS.includes(eligibleFactoryTiles[i]) || B_ARROWS.includes(eligibleFactoryTiles[i])) BlinesDiv.append(newComponentIndividualDiv)
			if (C_TECHS.includes(eligibleFactoryTiles[i]) || C_ARROWS.includes(eligibleFactoryTiles[i])) ClinesDiv.append(newComponentIndividualDiv)
			if (D_TECHS.includes(eligibleFactoryTiles[i]) || D_ARROWS.includes(eligibleFactoryTiles[i])) DlinesDiv.append(newComponentIndividualDiv)
			if (eligibleFactoryTiles[i] === DEPARTMENT_RESEARCH || eligibleFactoryTiles[i] === DEPARTMENT_PLANNING) departmentsDiv.append(newComponentIndividualDiv)
			if (DEALERSHIPS.includes(eligibleFactoryTiles[i]) || DEPARTMENTS_MARKETING.includes(eligibleFactoryTiles[i])) playerComponentsDiv.append(newComponentIndividualDiv)

			if (M.availableComponents[eligibleFactoryTiles[i]] > 0) {
				newComponentImg.on("mouseover", function (e) {
					$(this).css({
						outline: "1px solid yellow",
					})
				})
				newComponentImg.on("mouseout", function (e) {
					$(this).css({
						outline: "1px solid black",
					})
				})

				// PICK UP NEW TILE
				newComponentImg.on("click", function (e) {
					$(".ghostComponentImg").remove()
					$("#nudgeDiv").remove()

					player.factory.componentBeingAdded = parseInt(this.id.slice(15))
					player.factory.componentBeingAddedRotation = 0
					player.factory.componentBeingAddedFlipped = 0
					V.showComponentBeingAdded(player.factory, parseInt(this.id.slice(15)))
					V.updateQSPdiv(player)
					$(".selectable").remove()
					V.externalDrawSquares(player, player.factory.getEmptyFactorySpaces(), "yellow", "selectable")
					$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryComponent)
					$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
					$("#newComponentAndQSPdiv").on("mouseover", function (e) {
						$(".ghostComponentImg").remove()
					})
				})
			}
		} // END Eligible Factory Tiles loop

		// Add the titles to each Div
		var name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("MAINLINES"))
		mainlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("A LINES"))
		AlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("B LINES"))
		BlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("C LINES"))
		ClinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("D LINES"))
		DlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("DEPARTMENTS"))
		departmentsDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("DEALERSHIPS"))
		playerComponentsDiv.append(name)

		if (eligibleFactoryTiles.some((r) => MAINLINES.includes(r))) eligibleComponentsDiv.append(mainlinesDiv)
		if (eligibleFactoryTiles.some((r) => A_TECHS.includes(r))) eligibleComponentsDiv.append(AlinesDiv)
		if (eligibleFactoryTiles.some((r) => B_TECHS.includes(r))) eligibleComponentsDiv.append(BlinesDiv)
		if (eligibleFactoryTiles.some((r) => C_TECHS.includes(r))) eligibleComponentsDiv.append(ClinesDiv)
		if (eligibleFactoryTiles.some((r) => D_TECHS.includes(r))) eligibleComponentsDiv.append(DlinesDiv)
		if (eligibleFactoryTiles.some((r) => r === DEPARTMENT_RESEARCH || r === DEPARTMENT_PLANNING)) eligibleComponentsDiv.append(departmentsDiv)
		if (eligibleFactoryTiles.some((r) => DEALERSHIPS.includes(r) || DEPARTMENTS_MARKETING.includes(r))) eligibleComponentsDiv.append(playerComponentsDiv)
	}

	this.displayAllDealershipsWithStock = function () {
		var stock
		var dshipDiv
		var j = 0
		var i = 0

		var dealershipsDiv = $("<div></div>")
		dealershipsDiv.attr("id", "allDealershipsWithStockDiv")
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

		for (j = 0; j < this.model.gameFlow.unalteredTurnOrder.length; j++) {
			for (i = 0; i < this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.factoryComponents.length; i++) {
				if (DEALERSHIPS.includes(this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.factoryComponents[i][0])) {
					stock = this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.getStockForDealership(this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.factoryComponents[i])
					dshipDiv = V.getDealershipSellingDiv(this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.factoryComponents[i], stock, false, this.model.gameFlow.unalteredTurnOrder[j])
					dealershipsDiv.append(dshipDiv)
				}
			}
		}

		if (dealershipsDiv.children().length === 0) {
			dealershipsDiv.append("(No Valid Dealerships)<br/><br/>")
		}

		return dealershipsDiv
	}

	this.nicheMouseOnHighlight = function (e) {
		var index = $(e.currentTarget).data("index")
		V.ghostMWimageOnHighlight(index, e.data.dealership, e.data.MWsize)
	}

	this.ghostMWimageOnHighlight = function (index, dealership, MWsize) {
		var rotation = this.model.MWrotation
		$(".ghostMWImg").remove()
		if (MWsize === 0) str = MW_SMALL
		if (MWsize === 0 && rotation % 2 == 1) str = MW_SMALL_R

		if (MWsize === 1) str = MW_MEDIUM
		if (MWsize === 2) str = MW_LARGE

		var col = "black"
		if (RED_DEALERSHIPS.includes(dealership[0])) col = RED
		if (GREEN_DEALERSHIPS.includes(dealership[0])) col = GREEN
		if (PURPLE_DEALERSHIPS.includes(dealership[0])) col = PURPLE
		if (BLUE_DEALERSHIPS.includes(dealership[0])) col = BLUE
		if (YELLOW_DEALERSHIPS.includes(dealership[0])) col = YELLOW
		col = getCorrectedColour(col)
		if (col === RED) col = "#E83435"
		if (col === GREEN) col = "#70C96B"
		if (col === PURPLE) col = "#8E63B3"
		if (col === BLUE) col = " #435EB5"
		if (col === YELLOW) col = "#EECD30"

		var ghostMWImg = $(str.replace(/COLOUR/, col))

		var MWwidth = 3
		var MWheight = 3
		if (MWsize == 1) {
			MWwidth = 2
			MWheight = 2
		}
		if (MWsize == 0 && rotation % 2 == 0) {
			MWwidth = 1
			MWheight = 2
		}
		if (MWsize == 0 && rotation % 2 == 1) {
			MWwidth = 2
			MWheight = 1
		}

		var Xcoord = this.model.getMBcoordsForIndex(index)[0]
		var Ycoord = this.model.getMBcoordsForIndex(index)[1]

		// Shift for rotation first
		// Now shift for rotation
		var divXcoord = 0
		var divYcoord = 0
		if (rotation == 1) {
			// top is good, but left needs to move back
			divXcoord = divXcoord - (this.nicheSqPxWidth + 5) * (MWwidth - 1)
		}
		if (rotation == 2) {
			// need to shift left and up
			divXcoord = divXcoord - (this.nicheSqPxWidth + 5) * (MWwidth - 1)
			divYcoord = divYcoord - (this.nicheSqPxWidth + 5) * (MWheight - 1)
		}
		if (rotation == 3) {
			// left is good, but top needs to move o[]
			divYcoord = divYcoord - (this.nicheSqPxWidth + 5) * (MWheight - 1)
		}

		divXcoord += 9 + 71.5 * Xcoord
		divYcoord += 9 + 71.5 * Ycoord

		if (Xcoord >= 2) divXcoord += 4.5
		if (Xcoord >= 4) divXcoord += 7
		if (Xcoord >= 6) divXcoord += 4.5

		if (Ycoord >= 2) divYcoord += 4.5
		if (Ycoord >= 4) divYcoord += 7
		if (Ycoord >= 6) divYcoord += 4.5

		// Now shift for outer px
		divXcoord -= 5
		divYcoord -= 5

		ghostMWImg.attr("class", "ghostMWImg r")
		ghostMWImg.attr("id", "ghostMWImg")

		ghostMWImg.css({
			position: "absolute",
			left: String(divXcoord) + "px",
			top: String(divYcoord) + "px",
			"z-index": "5",
		})

		ghostMWImg.on("contextmenu", function (e) {
			e.originalEvent.preventDefault()
			e.preventDefault()
		})

		$("#marketBoarddiv").append(ghostMWImg)
	}

	this.tryToPlaceMarketWindow = function (e) {
		var index = $(e.currentTarget).data("index")
		var indexCoords = M.getMBcoordsForIndex(index)
		var MWsize = e.data.MWsize
		var dealership = e.data.dealership

		// find the affected Indexes
		var coveredIndexes = M.getCoveredIndexesOfMarketWindow(index, M.MWrotation, MWsize)

		// Now check they are all eligible
		var eligibleNiches = M.getNichesEligibilityForDealership(dealership)[0]
		for (var i = 0; i < coveredIndexes.length; i++) {
			if (!eligibleNiches.includes(coveredIndexes[i])) {
				var left = indexCoords[0] * V.nicheSqPxWidth
				var top = (indexCoords[1] - 1) * V.nicheSqPxWidth
				var div = $("<div/>")
				div.attr("class", "noSpaceDiv")
				div.html(gettext("Niche Square exceeds Sepcs of Dealership"))
				div.css({
					"background-color": "white",
					"font-weight": "bolder",
					width: "100px",
					height: "102px",
					position: "absolute",
					left: String(left) + "px",
					top: String(top) + "px",
					"z-index": "100000",
				})
				$("#marketBoarddiv").append(div)

				setTimeout(function () {
					$(".noSpaceDiv").fadeOut()
				}, 1000)
				return
			}
		}

		$(".marketIneligible").remove()
		$(".marketSelectable").remove()
		// Now you have an eligible div, so place it into the model
		M.placeDealershipWindowIntoModel(index, dealership, MWsize)
		C.enableSellingForDealership(dealership, true)
	}

	this.componentMouseOnHighlight = function (e) {
		var index = $(e.currentTarget).data("index")
		V.ghostComponentImageOnHighlight(e.data.player, index)
	}

	this.arrowMouseOnHighlight = function (e) {
		var index = $(e.currentTarget).data("index")
		var player = e.data.player
		var rotation = $(e.currentTarget).data("rotation")
		player.factory.componentBeingAddedRotation = rotation
		V.ghostComponentImageOnHighlight(player, index)
	}

	this.ghostComponentImageOnHighlight = function (player, index) {
		// get the image to ghost
		$(".ghostComponentImg").remove()
		var ghostComponentImg = this.getComponentImage(player.factory.componentBeingAdded)
		var Cwidth = DIMENSIONS[player.factory.componentBeingAdded][0]
		var Cheight = DIMENSIONS[player.factory.componentBeingAdded][1]

		var rotOffset = 0
		if (player.factory.componentBeingAddedRotation % 2 == 1) rotOffset = 1
		rotOffset = (rotOffset * (Cwidth - Cheight)) / 2
		var Cleft = player.factory.getCoordsForIndex(index)[0] - rotOffset
		var Ctop = player.factory.getCoordsForIndex(index)[1] + rotOffset

		if (player.factory.componentBeingAddedFlipped === 0) ghostComponentImg.attr("class", "ghostComponentImg r" + String(player.factory.componentBeingAddedRotation))
		else ghostComponentImg.attr("class", "ghostComponentImg r" + String(player.factory.componentBeingAddedRotation) + "M")
		ghostComponentImg.attr("id", "ghostComponentImg")

		ghostComponentImg.css({
			height: String(Cheight * this.smallSqPxWidth) + "px",
			width: String(Cwidth * this.smallSqPxWidth) + "px",
			position: "absolute",
			left: String(Cleft * this.smallSqPxWidth) + "px",
			top: String(Ctop * this.smallSqPxWidth) + "px",
			opacity: "0.5",
		})

		ghostComponentImg.on("contextmenu", function (e) {
			e.originalEvent.preventDefault()
			e.preventDefault()
		})

		var factoryFloorDiv = $("#factoryFloorDiv")
		factoryFloorDiv.append(ghostComponentImg)
	}

	this.getSetupInitialFactoryFloorDiv = function () {
		var setupFactoryFloorDiv = $("<div></div>")
		setupFactoryFloorDiv.attr("id", "setupFactoryFloorDiv")
		setupFactoryFloorDiv.css({
			border: "1px solid black",
			margin: "0 auto",
			padding: "5px",
		})
		var buttonL = $("<img>")
		var buttonR = $("<img>")
		var buttonFlipH = $("<img>")
		var buttonFlipV = $("<img>")
		buttonL.attr("src", imagePreURL + "/rot_anticlockwise.svg")
		buttonR.attr("src", imagePreURL + "/rot_clockwise.svg")
		buttonFlipH.attr("src", imagePreURL + "/flip_h.svg")
		buttonFlipV.attr("src", imagePreURL + "/flip_h.svg")
		buttonL.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonR.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonFlipH.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonFlipV.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})

		$(setupFactoryFloorDiv).append(buttonL)
		$(setupFactoryFloorDiv).append(buttonR)
		$(setupFactoryFloorDiv).append("<BR/>")
		$(setupFactoryFloorDiv).append(buttonFlipH)
		$(setupFactoryFloorDiv).append(buttonFlipV)

		buttonFlipV.addClass("r1")

		setupFactoryFloorDiv.css({
			width: "200px",
			height: "115px",
		})
		buttonR.on("click", function () {
			C.currentPlayer().factory.mainFactoryRotation++
			if (C.currentPlayer().factory.mainFactoryRotation === 4) C.currentPlayer().factory.mainFactoryRotation = 0
			V.render()
		})
		buttonL.on("click", function () {
			C.currentPlayer().factory.mainFactoryRotation--
			if (C.currentPlayer().factory.mainFactoryRotation === -1) C.currentPlayer().factory.mainFactoryRotation = 3
			V.render()
		})
		buttonFlipH.on("click", function () {
			if (C.currentPlayer().factory.mainFactoryFlipped === 0) C.currentPlayer().factory.mainFactoryFlipped = 1
			else C.currentPlayer().factory.mainFactoryFlipped = 0
			if (C.currentPlayer().factory.mainFactoryRotation === 1) C.currentPlayer().factory.mainFactoryRotation = 3
			else if (C.currentPlayer().factory.mainFactoryRotation === 3) C.currentPlayer().factory.mainFactoryRotation = 1
			V.render()
		})
		buttonFlipV.on("click", function () {
			if (C.currentPlayer().factory.mainFactoryFlipped === 0) C.currentPlayer().factory.mainFactoryFlipped = 1
			else C.currentPlayer().factory.mainFactoryFlipped = 0
			if (C.currentPlayer().factory.mainFactoryRotation === 0) C.currentPlayer().factory.mainFactoryRotation = 2
			else if (C.currentPlayer().factory.mainFactoryRotation === 2) C.currentPlayer().factory.mainFactoryRotation = 0
			V.render()
		})

		V.addHighlightsOnMouseOverToElement(buttonR)
		V.addHighlightsOnMouseOverToElement(buttonL)
		V.addHighlightsOnMouseOverToElement(buttonFlipH)
		V.addHighlightsOnMouseOverToElement(buttonFlipV)
		return setupFactoryFloorDiv
	}

	this.showComponentBeingAdded = function (factory, component) {
		$("#newComponentDiv").remove()
		var newComponentDiv = $("<div></div>")
		newComponentDiv.attr("id", "newComponentDiv")

		var newComponentImg = this.getComponentImage(component)
		newComponentImg.attr("id", "newComponentImg")
		if (factory.componentBeingAddedFlipped === 0) newComponentImg.addClass("r" + String(factory.componentBeingAddedRotation % 4))
		else newComponentImg.addClass("r" + String(factory.componentBeingAddedRotation % 4) + "M")
		newComponentDiv.append(newComponentImg)
		if (DIMENSIONS[component][0] > DIMENSIONS[component][1]) {
			var extra = String(5 + ((DIMENSIONS[component][0] - DIMENSIONS[component][1]) * this.smallSqPxWidth) / 2)
			newComponentImg.css({ "padding-top": extra + "px" })
			newComponentImg.css({ "padding-bottom": extra + "px" })
		}
		// Shift Rotate buttons onto new line
		newComponentDiv.append("<BR/>")
		var buttonL = $("<img>")
		var buttonR = $("<img>")
		var buttonFlipH = $("<img>")
		var buttonFlipV = $("<img>")
		buttonL.attr("src", imagePreURL + "/rot_anticlockwise.svg")
		buttonR.attr("src", imagePreURL + "/rot_clockwise.svg")
		buttonFlipH.attr("src", imagePreURL + "/flip_h.svg")
		buttonFlipV.attr("src", imagePreURL + "/flip_h.svg")
		buttonL.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonR.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonFlipH.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonFlipV.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})

		newComponentDiv.append(buttonL)
		if (component !== FACTORY_EXPANSION_TILE) newComponentDiv.append("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")
		newComponentDiv.append(buttonR)

		var binImg = $("<img>")
		binImg.attr("src", imagePreURL + "/f_bin.png")
		binImg.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		if (component !== FACTORY_EXPANSION_TILE) newComponentDiv.append(binImg)
		if (MAINLINES.includes(component) || component === FACTORY_EXPANSION_TILE) {
			newComponentDiv.append(buttonFlipH)
			newComponentDiv.append(buttonFlipV)
			buttonFlipV.addClass("r1")
		}
		var ncdWidth = Math.max(newComponentImg.height(), newComponentImg.width(), 6 * this.smallSqPxWidth)
		var ncdheight = Math.max(newComponentImg.height() + 40, newComponentImg.width() + 40)
		// Make room for bin
		ncdheight += 75
		newComponentDiv.css({
			width: ncdWidth + "px",
			border: "1px solid black",
		})
		buttonR.on("click", function () {
			V.rotateComponentR(factory, false)
		})

		buttonL.on("click", function () {
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation))
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation) + "M")

			factory.componentBeingAddedRotation--
			if (factory.componentBeingAddedRotation === -1) factory.componentBeingAddedRotation = 3

			if (factory.componentBeingAddedFlipped === 0) $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation))
			else $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation) + "M")
		})
		buttonFlipH.on("click", function () {
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation))
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation) + "M")

			if (factory.componentBeingAddedFlipped === 0) factory.componentBeingAddedFlipped = 1
			else factory.componentBeingAddedFlipped = 0

			if (factory.componentBeingAddedRotation === 1) factory.componentBeingAddedRotation = 3
			else if (factory.componentBeingAddedRotation === 3) factory.componentBeingAddedRotation = 1

			if (factory.componentBeingAddedFlipped === 0) $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation))
			else $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation) + "M")
		})

		buttonFlipV.on("click", function () {
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation))
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation) + "M")

			if (factory.componentBeingAddedFlipped === 0) factory.componentBeingAddedFlipped = 1
			else factory.componentBeingAddedFlipped = 0

			if (factory.componentBeingAddedRotation === 0) factory.componentBeingAddedRotation = 2
			else if (factory.componentBeingAddedRotation === 2) factory.componentBeingAddedRotation = 0

			if (factory.componentBeingAddedFlipped === 0) $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation))
			else $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation) + "M")
		})

		if (component !== FACTORY_EXPANSION_TILE) V.addHighlightsOnMouseOverToElement(binImg)
		V.addHighlightsOnMouseOverToElement(buttonR)
		V.addHighlightsOnMouseOverToElement(buttonL)
		V.addHighlightsOnMouseOverToElement(buttonFlipH)
		V.addHighlightsOnMouseOverToElement(buttonFlipV)
		binImg.on("click", function () {
			factory.clearComponentBeingPlaced()
		})

		$("#newComponentAndQSPdiv").append(newComponentDiv)
	}

	this.rotateComponentR = function (factory, fromKeyPress) {
		$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation))
		$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation) + "M")

		factory.componentBeingAddedRotation++
		if (factory.componentBeingAddedRotation === 4) factory.componentBeingAddedRotation = 0

		if (factory.componentBeingAddedFlipped === 0) $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation))
		else $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation) + "M")

		if (fromKeyPress) {
			// also update the ghost image
			var ghostComponentImg = $("#ghostComponentImg")
			var Cwidth = DIMENSIONS[factory.componentBeingAdded][0]
			var Cheight = DIMENSIONS[factory.componentBeingAdded][1]

			if (factory.componentBeingAddedFlipped === 0) ghostComponentImg.attr("class", "ghostComponentImg r" + String(factory.componentBeingAddedRotation))
			else ghostComponentImg.attr("class", "ghostComponentImg r" + String(factory.componentBeingAddedRotation) + "M")

			// now shift the left / top so it still aligns with the cursor
			if (Cwidth !== Cheight) {
				var shiftSquares = Cwidth - Cheight
				if (factory.componentBeingAddedRotation === 2) shiftSquares = -((Cwidth - Cheight) / 2)
				if (factory.componentBeingAddedRotation === 0) shiftSquares = -(Cwidth - Cheight) / 2
				var oldTop = ghostComponentImg.position().top
				var oldLeft = ghostComponentImg.position().left

				var newLeft = oldLeft - shiftSquares * this.smallSqPxWidth
				var newTop = oldTop + shiftSquares * this.smallSqPxWidth
				ghostComponentImg.css({
					position: "absolute",
					left: String(newLeft) + "px",
					top: String(newTop) + "px",
					opacity: "0.5",
				})
			}
		}
	}

	this.addHighlightsOnMouseOverToElement = function (element, thickness, checkForActive, checkForActiveCard) {
		if (thickness == undefined) thickness = 1
		element.on("mouseover", function (e) {
			$(this).css({
				border: "" + String(thickness) + "px solid yellow",
			})
		})
		element.on("mouseout", function (e) {
			var greenBorder = false
			if (checkForActive) {
				var arrayIndex = parseInt(this.id.slice(9))
				if (V.currentViewItem === arrayIndex) greenBorder = true
			}
			if (checkForActiveCard) {
				if (element.hasClass("activeCard")) greenBorder = true
			}
			if (!greenBorder) {
				$(this).css({
					border: "" + String(thickness) + "px solid black",
				})
			} else if (greenBorder) {
				$(this).css({
					border: "" + String(thickness) + "px solid lightgreen",
				})
			}
		})
	}

	this.externalDrawSquares = function (player, spaces, col, cssClass) {
		var w = this.smallSqPxWidth
		var str = SMALL_SQUARE
		_.each(
			spaces,
			function (space) {
				var coords = player.factory.getCoordsForIndex(space)
				var x = coords[0]
				var y = coords[1]
				x = x * w
				y = y * w
				var img = $(str.replace(/COLOR/, col))
				img.attr("class", cssClass).css({
					left: x + "px",
					top: y + "px",
					width: w - 1 + "px",
					height: w - 1 + "px",
					border: "1px transparent white",
				})
				img.attr("id", "index" + String(space))
				img.attr("data", "index" + String(space))
				img.data("index", space)
				$("#factoryFloorDiv").append(img)
			},
			this
		)
	}

	this.externalDrawSquaresQSP = function (player, spacesWithDirection, col, cssClass) {
		var w = this.smallSqPxWidth
		var str = SMALL_SQUARE
		_.each(
			spacesWithDirection,
			function (space) {
				var coords = player.factory.getCoordsForIndex(space[0])
				var x = coords[0]
				var y = coords[1]
				x = x * w
				y = y * w
				var img = $(str.replace(/COLOR/, col))
				img.attr("class", cssClass).css({
					left: x + "px",
					top: y + "px",
					width: w - 1 + "px",
					height: w - 1 + "px",
					border: "1px transparent white",
				})
				img.attr("id", "index" + String(space[0]))
				img.data("index", space[0])
				img.data("rotation", space[1])
				$("#factoryFloorDiv").append(img)
			},
			this
		)
	}

	this.drawMarketSquares = function (spaces, col, cssClass) {
		var str = MB_SMALL_SQUARE
		_.each(
			spaces,
			function (space) {
				var coords = M.getMBcoordsForIndex(space)
				var Xcoord = coords[0]
				var Ycoord = coords[1]

				var svgXcoord = 9 + 71.5 * Xcoord
				var svgYcoord = 9 + 71.5 * Ycoord

				if (Xcoord >= 2) svgXcoord += 4.5
				if (Xcoord >= 4) svgXcoord += 7
				if (Xcoord >= 6) svgXcoord += 4.5

				if (Ycoord >= 2) svgYcoord += 4.5
				if (Ycoord >= 4) svgYcoord += 7
				if (Ycoord >= 6) svgYcoord += 4.5

				//shift to allow for tech tracks
				svgXcoord += 140

				var img = $(str.replace(/COLOR/, col))
				img.attr("class", cssClass).css({
					left: String(svgXcoord) + "px",
					top: String(svgYcoord) + "px",
					border: "1px transparent white",
				})
				img.attr("id", "index" + String(space))
				img.attr("data", "index" + String(space))
				img.data("index", space)
				$("#wholeMarketBoardDiv").append(img)
			},
			this
		)
	}

	this.getAvailableCardsDiv = function (colour, cards, reserve) {
		var div = $("<div></div>")
		for (var i = 0; i < cards.length; i++) {
			let cardNumber = cards[i]
			let cardID = getCardIDcorrectedFromColourAndNumber(colour, cardNumber, false)
			let CardIDcorrected = getCardIDcorrectedFromColourAndNumber(colour, cardNumber, true)

			var img = getCorrectedCardImage(CardIDcorrected, false)
			img.addClass("availableCardsImg")
			if (reserve) {
				img.css({
					width: "50px",
					height: "75px",
					border: "3px solid black",
					"margin-left": "5px",
				})
			} else {
				img.css({
					width: "100px",
					height: "159px",
					border: "3px solid black",
					"margin-left": "5px",
				})
			}
			img.attr("id", cardID)

			if (!reserve) {
				this.addHighlightsOnMouseOverToElement(img, 3, false, true)
				img.on("click", { pcap: i }, C.clickedOnCard)
			}

			div.append(img)
		}
		return div
	}

	this.enableQuadrantSelectionForCard = function (card) {
		$(".SVGQ").remove()
		for (var i = 1; i <= 4; i++) {
			var str = Qhighlight
			var img = $(str.replace(/COLOUR/, "black").replace(/THISID/, "Q" + String(i) + "stroke"))

			const offset = 2.5
			var left = 0 + offset
			var top = 300 + offset
			if (i === 2) left = 300 + offset
			if (i === 3) {
				left = 0 + offset
				top = 0 + offset
			}
			if (i === 4) {
				left = 300 + offset
				top = 0 + offset
			}

			img.attr("id", "Q" + String(i)) // + card);
			img.data("card", card)

			img.css({
				position: "absolute",
				top: String(top) + "px",
				left: String(left) + "px",
				"z-index": "500",
			})

			img.on("mouseover", function (e) {
				$(".SVGQ").css({
					stroke: "black",
				})
				$("#" + this.id + "stroke").css({
					stroke: "yellow",
				})
				var cardName = $(e.currentTarget).data("card").slice(4)
				var cardData = getCardDataFromCardName(cardName)
				V.addGhostSparks(parseInt(this.id.slice(1, 2)), cardData)
			})
			img.on("mouseout", function (e) {
				$(".ghostNicheDiv").remove()
				$(".ghostSpark").remove()
				$(".SVGQ").css({
					stroke: "black",
				})
			})

			$("#marketBoarddiv").append(img)
			img.on("click", C.clickedOnQ)
		}
	}

	this.addGhostSparks = function (quadrant, cardData) {
		var Xcoord = 0
		var Ycoord = 0

		for (var i = 1; i < cardData.length; i++) {
			Xcoord = 0
			Ycoord = 0
			if (quadrant === 1) Ycoord = 4
			if (quadrant === 4) Xcoord = 4
			if (quadrant === 2) {
				Xcoord = 4
				Ycoord = 4
			}
			// Create a niche div
			Xcoord = Xcoord + cardData[i][0]
			Ycoord = Ycoord + cardData[i][1]

			var nicheDiv = $("<div></div>")
			var divXcoord = 9 + 71.5 * Xcoord
			var divYcoord = 9 + 71.5 * Ycoord

			if (Xcoord >= 2) divXcoord += 4.5
			if (Xcoord >= 4) divXcoord += 7
			if (Xcoord >= 6) divXcoord += 4.5

			if (Ycoord >= 2) divYcoord += 4.5
			if (Ycoord >= 4) divYcoord += 7
			if (Ycoord >= 6) divYcoord += 4.5

			nicheDiv.css({
				position: "absolute",
				top: String(divYcoord) + "px",
				left: String(divXcoord) + "px",
				width: "68px",
				height: "68px",
			})
			var sparkImg = this.getImage("S" + String(cardData[i][2]))
			sparkImg.addClass("ghostSpark")
			sparkImg.css({
				width: "34px",
				height: "34px",
				opacity: "0.5",
			})
			nicheDiv.append(sparkImg)
			$("#marketBoarddiv").append(nicheDiv)
		}
	}

	this.getAlreadyPlayedCardsDiv = function () {
		var alreadyPlayedCardsDiv = $("<div></div>")
		for (var i = 0; i < this.model.alreadyPlayedCards.length; i++) {
			var col = "black"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === RED) col = "#E83435"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === GREEN) col = "#70C96B"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === PURPLE) col = "#8E63B3"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === BLUE) col = " #435EB5"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === YELLOW) col = "#EECD30"

			var img = $(P_CARD_AREA.replace(/COLOUR/, col))

			if (this.model.alreadyPlayedCards[i][1] === 4) img = $(P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r1"))
			if (this.model.alreadyPlayedCards[i][1] === 2) img = $(P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r2"))
			if (this.model.alreadyPlayedCards[i][1] === 1) img = $(P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r3"))
			img.css({
				width: "60px",
				height: "60px",
				"margin-right": "5px",
			})
			alreadyPlayedCardsDiv.append(img)
		}
		return alreadyPlayedCardsDiv
	}

	this.getDealershipSellingDiv = function (dealership, stocks, activate, playerIndex) {
		var i = 0
		var img

		// refresh all tech levels. WHY???? To fix 9s
		for (i = 0; i < this.model.players.length; i++) {
			this.model.players[i].factory.checkDealershipLevels()
		}

		var Cwidth = DIMENSIONS[dealership[0]][0] * this.smallSqPxWidth
		var Cheight = DIMENSIONS[dealership[0]][1] * this.smallSqPxWidth

		var dealershipSellingDiv = $("<div></div>")
		dealershipSellingDiv.attr("id", "dship" + String(dealership[1]))
		dealershipSellingDiv.css({
			position: "relative",
			width: String(Cwidth + 10 + 70) + "px",
			height: String(Cheight + 20) + "px",
			border: "3px solid black",
			"margin-right": "5px",
			"margin-bottom": "5px",
		})

		var componentImg = this.getComponentImage(dealership[0])
		componentImg.addClass("factoryComponent")
		componentImg.css({
			height: String(Cheight) + "px",
			width: String(Cwidth) + "px",
			position: "absolute",
			left: "5px",
			top: "5px",
		})

		dealershipSellingDiv.append(componentImg)

		var techLevelsDiv = $("<div></div>")
		techLevelsDiv.css({
			position: "absolute",
			left: String(11) + "px",
			top: String(53) + "px",
			/*'background-color': 'red',*/
			width: "fit-content",
			height: "fit-content",
			"z-index": "1000",
		})
		var techLevelsSpan = $("<span></span>")
		techLevelsSpan.addClass("techLevelsSpan")

		var addedNumbers = 0
		for (var j = 0; j < dealership[TL_IDX].length; j++) {
			if (dealership[TL_IDX][j] > 0 && dealership[TL_IDX][j] !== 9) {
				techLevelsSpan.append("<span class='techLevelNumber" + String(j) + "a'>" + String(dealership[TL_IDX][j]) + "</span>")
				addedNumbers++
			}
		}
		techLevelsDiv.append(techLevelsSpan)
		dealershipSellingDiv.append(techLevelsDiv)

		// Now add adjacent Stocks
		var stocksDiv = $("<div></div>")
		stocksDiv.css({
			position: "absolute",
			left: String(Cwidth + 10) + "px",
			top: "5px",
			height: String(Cheight + 20) + "px",
			width: "70px",
		})

		// If it is below min spec, add icon
		var belowMinSpec = true
		var minSpecs = Rules.getMinSpecsInOrder()
		if (dealership[TL_IDX][0] >= minSpecs[0] && dealership[TL_IDX][1] >= minSpecs[1] && dealership[TL_IDX][2] >= minSpecs[2] && dealership[TL_IDX][3] >= minSpecs[3] && dealership[TL_IDX][4] >= minSpecs[4]) belowMinSpec = false
		if (belowMinSpec) {
			stocksDiv.append(gettext("Below Min Spec") + "<BR/>")
		}
		// else add stock
		else {
			for (i = 0; i < stocks.length; i++) {
				if (stocks[i] > 0) {
					stocksDiv.append(stocks[i])
					stocksDiv.append(" X ")
					img = this.getImage("V" + String(i))
					img.css({
						width: "41px",
					})
					stocksDiv.append(img)
					stocksDiv.append("<BR/>")
				}
			}
		}
		// Add MW icon
		var adjMarketingDeparmentData = M.players[playerIndex].factory.getAllComponentDataOfDirectConnectionsToComponentIndex(dealership[1])
		adjMarketingDeparmentData = adjMarketingDeparmentData.filter(function (componenet) {
			return DEPARTMENTS_MARKETING.includes(componenet[0])
		})
		var MWsize = Math.min(2, adjMarketingDeparmentData.length)
		img = this.getImage("MWicon" + String(MWsize))
		var iconWidth = 41
		if (MWsize < 2) iconWidth = 28
		img.css({
			width: String(iconWidth) + "px",
		})
		stocksDiv.append(img)

		if (activate) {
			this.addHighlightsOnMouseOverToElement(dealershipSellingDiv, 3, false)
			dealershipSellingDiv.on("click", { /*this: C,*/ dealership: dealership }, C.clickedOnDealership)
		} else {
			this.addHighlightsOnMouseOverToElement(dealershipSellingDiv, 3, false)
			dealershipSellingDiv.on("click", { /*this: C,*/ dealership: dealership, stocks: stocks }, C.clickedOnDealershipOther)
		}

		dealershipSellingDiv.append(stocksDiv)

		return dealershipSellingDiv
	}

	this.addNudgeDiv = function (player, expansion) {
		player = C.currentPlayer()
		$("#nudgeDiv").remove()

		var nudgeDiv = $("<div></div>")
		nudgeDiv.attr("id", "nudgeDiv")
		nudgeDiv.css({
			border: "1px solid black",
			width: "180px",
			height: "fit-content",
			padding: "10px",
			"text-align": "center",
		})
		nudgeDiv.append("<b><u>" + gettext("Nudge Component") + "</b></u><BR/>")
		for (var i = 0; i < 4; i++) {
			var img = $("<img>")
			img.attr("src", imagePreURL + "/nudge.svg")
			if (i === 0) {
				img.addClass("r3")
				img.css({
					position: "relative",
					top: "26px",
				})
			}
			if (i === 2) {
				img.addClass("r1")
				img.css({
					position: "relative",
					top: "26px",
				})
			}
			if (i === 3) {
				img.addClass("r2")
				img.css({
					"margin-left": "0px",
				})
				nudgeDiv.append("<BR/>")
			}
			img.css({
				width: "53px",
				height: "55px",
				border: "1px solid black",
				"border-radius": "10px",
				"margin-right": "5px",
				"margin-top": "5px",
				"padding-bottom": "2px",
			})
			this.addHighlightsOnMouseOverToElement(img, 1, false, false)
			nudgeDiv.append(img)

			img.on("click", { this: player.factory, direction: i, expansion: expansion }, player.factory.clickedOnNudge)
		}
		$("#newComponentAndQSPdiv").append(nudgeDiv)
	}

	this.updateQSPdiv = function (player) {
		player = C.currentPlayer()
		$("#QSPdiv").remove()

		// exit now if during factory expansion
		if (this.model.subphase === 1) return

		var possibleSpecsToAdd = player.factory.findAllPossibleSpecsToAdd()
		if (possibleSpecsToAdd.length > 0) {
			var QSPdiv = $("<div></div>")
			QSPdiv.attr("id", "QSPdiv")
			QSPdiv.css({
				border: "1px solid black",
				width: "180px",
				height: "fit-content",
				padding: "10px",
				"text-align": "left",
			})
			QSPdiv.append("<b><u>" + gettext("Quick Spec Pick") + "</b></u>")
			for (var i = 0; i < possibleSpecsToAdd.length; i++) {
				QSPdiv.append("<BR/>")
				QSPdiv.append(COMPONENTS_NAME_STRING[player.factory.factoryComponents[possibleSpecsToAdd[i][0]][0]])
				QSPdiv.append(": ")
				for (var j = 1; j < possibleSpecsToAdd[i].length; j++) {
					if (j != 1) QSPdiv.append("&nbsp;")
					var img = this.getComponentImage(possibleSpecsToAdd[i][j])
					img.css({
						border: "1px solid black",
					})
					img.on("click", { player: player, specData: possibleSpecsToAdd[i], specName: possibleSpecsToAdd[i][j] }, this.clickedOnQSPspec)
					V.addHighlightsOnMouseOverToElement(img)
					QSPdiv.append(img)
				}
			}
			$("#newComponentAndQSPdiv").prepend(QSPdiv)
		}
	}

	this.clickedOnQSPspec = function (e) {
		// Clear component being placed, just in case

		var specData = e.data.specData // Just used for specData[0], which is the component being linked TO
		var specName = e.data.specName // Just used for p.f.componentBeingAdded

		V.actionClickedonQSPspec(specData, specName)
		//var player = e.data.player;
	}

	this.actionClickedonQSPspec = function (specData, specName) {
		$("#newComponentDiv").remove()
		var player = C.currentPlayer()

		$(".ghostComponentImg").remove()
		$("#nudgeDiv").remove()

		player.factory.componentBeingAdded = specName
		player.factory.componentBeingAddedRotation = 0
		player.factory.componentBeingAddedFlipped = 0

		// Find empty squares next to component
		var eligibleEmptySquaresWithDirection = player.factory.getAllDirectlyAdjacentIndexesOnlyFromComponentIndexWithInwardsPointer(player.factory.factoryComponents[specData[0]][1])
		eligibleEmptySquaresWithDirection = eligibleEmptySquaresWithDirection.filter((entry) => player.factory.factoryCoords[entry[0]] === EMPTY_SPACE)
		$(".selectable").remove()

		V.externalDrawSquaresQSP(player, eligibleEmptySquaresWithDirection, "yellow", "selectable")
		$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryComponent)
		$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.arrowMouseOnHighlight)

		$("#newComponentAndQSPdiv").on("mouseover", function (e) {
			$(".ghostComponentImg").remove()
		})
	}

	// WARNING: THIS is now Div ELEMENT
	this.clickedOnCard = function (e) {
		$(".availableCardsImg").removeClass("activeCard")
		$(".availableCardsImg").css({ border: "3px solid black" })
		this.classList.add("activeCard")
		this.style.border = "3px solid lightgreen"
		C.currentPlayer.pcap = e.data.pcap
		V.enableQuadrantSelectionForCard(this.id)
	}

	this.getMarketBoardDiv = function (size) {
		// Market Board
		var marketBoarddiv = $("<div></div>")
		marketBoarddiv.css({
			position: "relative",
			display: "inline-block",
			top: "0px",
			left: "0px",
			width: "600px",
			height: "600px",
			"margin-top": "30px",
		})
		marketBoarddiv.empty()
		var marketBoardImg = this.getImage(MARKET_BOARD)
		marketBoardImg.css({
			width: "600px",
			height: "600px",
		})
		marketBoarddiv.append(marketBoardImg)
		// Now add sparks / demand
		for (i = 0; i < this.model.marketBoard.length; i++) {
			if (this.model.marketBoard[i][0] + this.model.marketBoard[i][1] + this.model.marketBoard[i][0] + this.model.marketBoard[i][2] + this.model.marketBoard[i][3] + this.model.marketBoard[i][4] + this.model.marketBoard[i][5] > 0) {
				// Create a niche div
				Xcoord = this.model.getMBcoordsForIndex(i)[0]
				Ycoord = this.model.getMBcoordsForIndex(i)[1]

				var nicheDiv = $("<div></div>")
				divXcoord = 9 + 71.5 * Xcoord
				divYcoord = 9 + 71.5 * Ycoord

				if (Xcoord >= 2) divXcoord += 4.5
				if (Xcoord >= 4) divXcoord += 7
				if (Xcoord >= 6) divXcoord += 4.5

				if (Ycoord >= 2) divYcoord += 4.5
				if (Ycoord >= 4) divYcoord += 7
				if (Ycoord >= 6) divYcoord += 4.5

				nicheDiv.css({
					position: "absolute",
					top: String(divYcoord) + "px",
					left: String(divXcoord) + "px",
					width: "68px",
					height: "68px",
				})
				var demandDiv = $("<div></div>")
				demandDiv.css({
					position: "absolute",
					display: "flex",
					"flex-wrap": "wrap",
					top: "0px",
					left: "0px",
					width: "69px",
					height: "40px",
					"z-index": "500",
				})
				for (j = 3; j < 6; j++) {
					if (this.model.marketBoard[i][j] > 0) {
						imgDiv = $("<div></div>")
						imgDiv.css({
							position: "relative",
							width: "34px",
							height: "20px",
						})
						img = this.getImage("V" + String(j - 3))
						img.css({
							position: "absolute",
							top: "0px",
							left: "0px",
							width: "34px",
							height: "20px",
						})
						imgDiv.append(img)
						numDiv = $("<div></div>")
						numDiv.css({
							position: "absolute",
							top: "0px",
							left: "10px",
							color: "yellow",
							"font-weight": "bolder",
							padding: "2px",
							"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
						})
						numDiv.append(String(this.model.marketBoard[i][j]))
						imgDiv.append(numDiv)
						demandDiv.append(imgDiv)
					}
				}
				var sparkDiv = $("<div></div>")
				sparkDiv.css({
					position: "absolute",
					display: "flex",
					"flex-wrap": "wrap",
					top: "42px",
					left: "0px",
					width: "68px",
					height: "28px",
					"z-index": "500",
				})
				for (j = 0; j < 3; j++) {
					if (this.model.marketBoard[i][j] > 0) {
						imgDiv = $("<div></div>")
						imgDiv.css({
							position: "relative",
							width: "22px",
							height: "22px",
						})
						img = this.getImage("S" + String(j))
						img.css({
							position: "absolute",
							top: "0px",
							left: "0px",
							width: "22px",
							height: "22px",
						})
						imgDiv.append(img)
						numDiv = $("<div></div>")
						numDiv.css({
							position: "absolute",
							top: "0px",
							left: "5px",
							color: "yellow",
							"font-weight": "bolder",
							padding: "2px",
							"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
						})
						numDiv.append(String(this.model.marketBoard[i][j]))
						imgDiv.append(numDiv)
						sparkDiv.append(imgDiv)
					}
				}

				nicheDiv.append(demandDiv)
				nicheDiv.append(sparkDiv)
				marketBoarddiv.append(nicheDiv)
			}
		}

		// Add prices
		for (i = 0; i < this.model.priceBand.length; i++) {
			if (this.model.priceBand[i] > 0) {
				var indexToUse = this.model.getIndexForPriceDisplay(i)
				// Create a niche div
				var priceDiv = this.getPriceDiv(indexToUse, this.model.priceBand[i])
				marketBoarddiv.append(priceDiv)
			}
		}
		return marketBoarddiv
	}

	// css used in component rotation div only atm.
	this.getComponentImage = function (componentName) {
		var img = $("<img>")
		var originalColour = 0

		if (DEALERSHIPS.includes(componentName)) {
			originalColour = Math.floor((componentName - 40) / 3)
			componentName = getCorrectedDealershipColour(componentName, originalColour)
		}
		if (DEPARTMENTS_MARKETING.includes(componentName)) {
			originalColour = componentName - 55
			componentName = getCorrectedMarketingDepartmentColour(componentName, originalColour)
		}

		if (componentName === FACTORY_MAIN_TILE) img.attr("src", imagePreURL + "/f_main.jpg")
		else if (componentName === FACTORY_EXPANSION_TILE) img.attr("src", imagePreURL + "/f_expansion.jpg")
		else if (componentName === MAINLINE_CAR) img.attr("src", imagePreURL + "/f_c_mainline_car.jpg")
		else if (componentName === MAINLINE_TRUCK) img.attr("src", imagePreURL + "/f_c_mainline_truck.jpg")
		else if (componentName === MAINLINE_SPORTS) img.attr("src", imagePreURL + "/f_c_mainline_sports.jpg")
		else if (componentName === DEPARTMENT_RESEARCH) img.attr("src", imagePreURL + "/f_c_researchDepartment.jpg")
		else if (componentName === DEPARTMENT_PLANNING) img.attr("src", imagePreURL + "/f_c_planningDepartment.jpg")
		else if (componentName === CHASSIS) img.attr("src", imagePreURL + "/f_c_chassis.jpg")
		else if (componentName === BODY) img.attr("src", imagePreURL + "/f_c_body.jpg")
		else if (componentName === RADIATOR) img.attr("src", imagePreURL + "/f_c_radiator.jpg")
		else if (componentName === DOOR) img.attr("src", imagePreURL + "/f_c_door.jpg")
		else if (componentName === BUMPER) img.attr("src", imagePreURL + "/f_c_bumper.jpg")
		else if (componentName === DASHBOARD) img.attr("src", imagePreURL + "/f_c_dashboard.jpg")
		else if (componentName === PAINT) img.attr("src", imagePreURL + "/f_c_paint.jpg")
		else if (componentName === BATTERY) img.attr("src", imagePreURL + "/f_c_battery.jpg")
		else if (componentName === ENGINE) img.attr("src", imagePreURL + "/f_c_engine.jpg")
		else if (componentName === GEARS) img.attr("src", imagePreURL + "/f_c_gears.jpg")
		else if (componentName === FUEL_TANK) img.attr("src", imagePreURL + "/f_c_fuelTank.jpg")
		else if (componentName === STEERING_WHEEL) img.attr("src", imagePreURL + "/f_c_steeringWheel.jpg")
		else if (componentName === BRAKE) img.attr("src", imagePreURL + "f_c_brake.jpg")
		else if (componentName === TIRE) img.attr("src", imagePreURL + "/f_c_tire.jpg")
		else if (componentName === HEADLIGHT) img.attr("src", imagePreURL + "/f_c_headlight.jpg")
		else if (componentName === WINDSHIELD) img.attr("src", imagePreURL + "/f_c_windshield.jpg")
		else if (componentName === CLAXON) img.attr("src", imagePreURL + "/f_c_claxon.jpg")
		else if (componentName === ARROW_DESIGN_A) img.attr("src", imagePreURL + "/f_arrow_PA.jpg")
		else if (componentName === ARROW_DESIGN_B) img.attr("src", imagePreURL + "/f_arrow_PB.jpg")
		else if (componentName === ARROW_DESIGN_C) img.attr("src", imagePreURL + "/f_arrow_PC.jpg")
		else if (componentName === ARROW_DESIGN_D) img.attr("src", imagePreURL + "/f_arrow_PD.jpg")
		else if (componentName === ARROW_REL_A) img.attr("src", imagePreURL + "/f_arrow_BA.jpg")
		else if (componentName === ARROW_REL_B) img.attr("src", imagePreURL + "/f_arrow_BB.jpg")
		else if (componentName === ARROW_REL_C) img.attr("src", imagePreURL + "/f_arrow_BC.jpg")
		else if (componentName === ARROW_SPD_B) img.attr("src", imagePreURL + "/f_arrow_RB.jpg")
		else if (componentName === ARROW_SPD_C) img.attr("src", imagePreURL + "/f_arrow_RC.jpg")
		else if (componentName === ARROW_SPD_D) img.attr("src", imagePreURL + "/f_arrow_RD.jpg")
		else if (componentName === ARROW_SAFETY_A) img.attr("src", imagePreURL + "/f_arrow_YA.jpg")
		else if (componentName === ARROW_SAFETY_B) img.attr("src", imagePreURL + "/f_arrow_YB.jpg")
		else if (componentName === ARROW_SAFETY_D) img.attr("src", imagePreURL + "/f_arrow_YD.jpg")
		else if (componentName === ARROW_RANGE_A) img.attr("src", imagePreURL + "/f_arrow_GA.jpg")
		else if (componentName === ARROW_RANGE_B) img.attr("src", imagePreURL + "/f_arrow_GB.jpg")
		else if (componentName === ARROW_RANGE_D) img.attr("src", imagePreURL + "/f_arrow_GD.jpg")
		else if (componentName === DEALERSHIP_RED_POMIGLIANO) img.attr("src", imagePreURL + "/f_dealership_R0.jpg")
		else if (componentName === DEALERSHIP_RED_GRUGLIASCO) img.attr("src", imagePreURL + "/f_dealership_R1.jpg")
		else if (componentName === DEALERSHIP_RED_TORINO) img.attr("src", imagePreURL + "/f_dealership_R2.jpg")
		else if (componentName === DEALERSHIP_GREEN_ELLESMERE) img.attr("src", imagePreURL + "/f_dealership_G0.jpg")
		else if (componentName === DEALERSHIP_GREEN_DUNSTABLE) img.attr("src", imagePreURL + "/f_dealership_G1.jpg")
		else if (componentName === DEALERSHIP_GREEN_LUTON) img.attr("src", imagePreURL + "/f_dealership_G2.jpg")
		else if (componentName === DEALERSHIP_PURPLE_AUDINCOURT) img.attr("src", imagePreURL + "/f_dealership_P0.jpg")
		else if (componentName === DEALERSHIP_PURPLE_FIVES) img.attr("src", imagePreURL + "/f_dealership_P1.jpg")
		else if (componentName === DEALERSHIP_PURPLE_SOCHAUX) img.attr("src", imagePreURL + "/f_dealership_P2.jpg")
		else if (componentName === DEALERSHIP_BLUE_KANSAS) img.attr("src", imagePreURL + "/f_dealership_B0.jpg")
		else if (componentName === DEALERSHIP_BLUE_DEARBORN) img.attr("src", imagePreURL + "/f_dealership_B1.jpg")
		else if (componentName === DEALERSHIP_BLUE_DETROIT) img.attr("src", imagePreURL + "/f_dealership_B2.jpg")
		else if (componentName === DEALERSHIP_YELLOW_STUTTGART) img.attr("src", imagePreURL + "/f_dealership_Y0.jpg")
		else if (componentName === DEALERSHIP_YELLOW_LADENBURG) img.attr("src", imagePreURL + "/f_dealership_Y1.jpg")
		else if (componentName === DEALERSHIP_YELLOW_MANNHEIM) img.attr("src", imagePreURL + "/f_dealership_Y2.jpg")
		else if (componentName === DEPARTMENT_MARKETING_RED) img.attr("src", imagePreURL + "/f_marketingDepartment_R.jpg")
		else if (componentName === DEPARTMENT_MARKETING_GREEN) img.attr("src", imagePreURL + "/f_marketingDepartment_G.jpg")
		else if (componentName === DEPARTMENT_MARKETING_PURPLE) img.attr("src", imagePreURL + "/f_marketingDepartment_P.jpg")
		else if (componentName === DEPARTMENT_MARKETING_BLUE) img.attr("src", imagePreURL + "/f_marketingDepartment_B.jpg")
		else if (componentName === DEPARTMENT_MARKETING_YELLOW) img.attr("src", imagePreURL + "/f_marketingDepartment_Y.jpg")

		try {
			String(DIMENSIONS[componentName][0] * this.smallSqPxWidth)
		} catch {
			alert("Componenet Error:  " + String(componentName))
		}

		img.css({
			width: "" + String(DIMENSIONS[componentName][0] * this.smallSqPxWidth) + "px",
			height: "" + String(DIMENSIONS[componentName][1] * this.smallSqPxWidth) + "px",
		})
		img.attr("title", COMPONENTS_NAME_STRING[componentName] + "\n" + String(DIMENSIONS[componentName][0]) + " x " + String(DIMENSIONS[componentName][1]))

		return img
	}

	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */

	this.renderKickoutCountdown = function () {
		//if (replay.showingReplay || global.secondsToNextKickout > 1200 || global.secondsToNextKickout == undefined || M.workflow.phase == END_GAME || M.trainingGame) {
		if (global.secondsToNextKickout > 1200 || global.secondsToNextKickout == undefined || M.workflow?.phase == PHASE_GAME_END_CHECK || M.trainingGame) {
			$("#kickoutTimerSpan").hide()
			clearInterval(global.kickoutCountdownIntervalTimer)
		} else {
			if ($("#kickoutTimerTimer").css("color") != "rgb(238, 238, 238)") $("#kickoutTimerTimer").css("color", "rgb(238, 238, 238)")
			$("#kickoutTimerSpan").show()
			let localSecondsToNextKickout = global.secondsToNextKickout
			if (localSecondsToNextKickout < 0) localSecondsToNextKickout = 0
			var minsToGo = String(Math.floor(localSecondsToNextKickout / 60))
			var secsToGo = "0" + String(Math.floor(localSecondsToNextKickout % 60))
			$("#kickoutTimerTimer").html(" " + minsToGo + " : " + secsToGo.slice(-2) + "")

			if (global.kickoutCountdownIntervalTimer != undefined) clearInterval(global.kickoutCountdownIntervalTimer)
			global.kickoutCountdownIntervalTimer = setInterval(this.kickoutTimeFunction, 1000)
		}
	}
	this.kickoutTimeFunction = function () {
		global.secondsToNextKickout--
		if (global.secondsToNextKickout > 1200 || global.secondsToNextKickout == undefined) {
			$("#kickoutTimerSpan").hide()
			clearInterval(global.kickoutCountdownIntervalTimer)
		} else {
			if (global.secondsToNextKickout < 60) {
				if ($("#kickoutTimerTimer").css("color") == "rgb(238, 238, 238)") $("#kickoutTimerTimer").css("color", "rgb(255, 6, 0)")
				else $("#kickoutTimerTimer").css("color", "rgb(238, 238, 238)")
			}
			if (global.secondsToNextKickout < 0) global.secondsToNextKickout = 0
			var minsToGo = String(Math.floor(global.secondsToNextKickout / 60))
			var secsToGo = "0" + String(Math.floor(global.secondsToNextKickout % 60))
			$("#kickoutTimerTimer").html(" " + minsToGo + " : " + secsToGo.slice(-2) + "")
		}
	}

	this.kickoutFlexiTimeFunction = function () {
		global.remainingFlexiSeconds--
		if (global.remainingFlexiSeconds < 0) global.remainingFlexiSeconds = 0
		let hoursToGo = String(Math.floor(global.remainingFlexiSeconds / 60 / 60))
		let minsToGo = String(Math.floor((global.remainingFlexiSeconds % 3600) / 60)).padStart(2, "0")
		let secsToGo = String(Math.floor(global.remainingFlexiSeconds % 60)).padStart(2, "0")

		$("#flexiKickoutTimerSpan").html(" " + hoursToGo + ":" + minsToGo + ":" + secsToGo)
	}

	function topMenuItem(e) {
		var v = e.data.view
		var item = $(e.currentTarget).data("type")

		if (item === 7) {
			if ($("#reserve").is(":visible")) {
				closeReserve.call(v)
			} else {
				displayReserve.call(v, true)
			}
		} else if (item === 4) {
			if ($("body").hasClass("history")) {
				closeHistory.call(v)
				$(e.currentTarget).removeClass("highlighted")
			} else {
				closeChat.call(v)
				closeNotes.call(v)
				$(e.currentTarget).addClass("highlighted")
				displayHistory.call(v)
			}
		} else if (item === 2) {
			// Bug entry
			if ($("#bugReport").is(":visible")) {
				closeBugReport.call(v)
				$(e.currentTarget).removeClass("highlighted")
			} else {
				displayBugReport.call(v, true)
				$(e.currentTarget).addClass("highlighted")
			}
		} else if (item === 5) {
			// CHAT
			if ($("#wholeChat").is(":visible")) {
				closeChat.call(v)
				$(e.currentTarget).removeClass("highlighted")
			} else {
				displayChat.call(v)
				$(e.currentTarget).addClass("highlighted")
			}
		} else if (item === 3) {
			if ($("#notesBox").is(":visible")) {
				closeNotes.call(v)
			} else {
				displayNotes.call(v)
			}
		} else if (item === 9) {
			// TOGGLE ASSISTANCE HERE
			if (M.gourmet || M.ruralMarketers) {
				if ($("body").hasClass("noassistance")) {
					$("body").removeClass("noassistance")
					$("#assistIcon").attr("src", "/static/FCM/images/assistance.svg")
					IO.saveAssistance(true)
				} else {
					$("body").addClass("noassistance")
					$("#assistIcon").attr("src", "/static/FCM/images/assistanceNo.svg")
					IO.saveAssistance(false)
				}
			} else {
				if ($("#assistance").is(":hidden")) {
					$("#assistance").show()
					$("#assistIcon").attr("src", "/static/FCM/images/assistance.svg")
					IO.saveAssistance(true)
				} else {
					$("#assistance").hide()
					$("#assistIcon").attr("src", "/static/FCM/images/assistanceNo.svg")
					IO.saveAssistance(false)
				}
			}
		} else if (item === 6) {
			if (global.nextUrl != undefined) {
				window.location.href = "/" + global.nextUrl
			} else {
				window.location.href = "/"
			}
		} else if (item === 10) {
			if (!M.trainingGame) {
				toggleDropDown()
			} else {
				$("#wholeMainArea").fadeOut("slow", function () {
					IO.loadRewind(C)
				})
			}
		} else if (item === 99) {
			if (M.trainingGame) {
			} else {
				$("#wholeMainArea").fadeOut("slow", function () {
					IO.loadRewind(C)
				})
			}
		}
	}

	function closeHistory() {
		$("body").removeClass("history")
		$("#menuButtonHistory").removeClass("highlighted")

		$("#history").fadeOut(400)
	}

	function closeChat() {
		$("body").removeClass("chat")
		$("#wholeChat").fadeOut(400)
		$("#menuButtonChat").removeClass("highlighted")
	}

	function closeNotes() {
		$("body").removeClass("notes")
		$("#menuButtonNotes").removeClass("highlighted")
	}

	function closeBugReport() {
		$("#bugReport").hide()
		$("#menuButtonBug").removeClass("highlighted")
	}

	function displayHistory() {
		closeChat.call(this)
		$("body").addClass("history")
		var b = $("#footer").position().top
		var a = 69
		$("#history").css("max-height", parseInt(b - a) + "px")
		$("#history").fadeIn(400)
	}

	function displayChat() {
		// WS starts anyway now
		$("body").addClass("chat")
		closeHistory.call(this)

		var b = $("#footer").position().top
		var a = 69
		$("#wholeChat").css("max-height", parseInt(b - a) + "px")

		$("#wholeChat").fadeIn(400)

		$("#chatBox button")
			.off()
			.on("click", { view: this }, function (e) {
				var v = e.data.view
				var message = $("#chatMessage").val()

				if (message != undefined && message.length > 0 && global.name != undefined) {
					$("#chatMessage").val("")
					addMessageToDisplay.call(this, { timestamp: new Date().getTime(), message: htmlEscape(message), name: global.name }, true)
					IO.postMessage(message, global.name)
				}
			})
	}

	function displayNotes() {
		closeReserve.call(this)
		closeHistory.call(this)
		closeBugReport.call(this)
		closeChat.call(this)
		//closePlayerDetails.call(this);
		$("body").addClass("notes")
		$("#menuButtonNotes").addClass("highlighted")

		if (global.notes != undefined) {
			$("#notes").val(htmlUnescape(global.notes))
		}

		$("#notesBox #submitNotes")
			.off()
			.on("click", { view: this }, function (e) {
				var v = e.data.view
				var note = $("#notes").val()

				if (note != undefined && note.length > 0 && global.name != undefined) {
					global.notes = note
					IO.postNote(note, global.name)
					closeNotes.call(this)
				}
			})

		$("#notesBox #closeNotes")
			.off()
			.on("click", function () {
				closeNotes.call(this)
			})

		$("#notesBox #clearNotes")
			.off()
			.on("click", function () {
				$("#notes").val("")
				delete global.notes
				IO.postNote("", global.name)
				closeNotes.call(this)
			})
	}

	this.displayChat = function () {
		displayChat.call(this)
	}

	function displayBugReport() {
		closeReserve.call(this)
		closeChat.call(this)
		closeHistory.call(this)
		closeNotes.call(this)

		$("#bugReport #submitBug")
			.off()
			.on("click", { view: this }, function (e) {
				var v = e.data.view
				var desc = $("#bugContent").val()

				if (desc != undefined && desc.length > 0) {
					IO.bugEntry(desc, returnFromBugSubmit, v)
				}
			})

		$("#bugReport #resetBug")
			.off()
			.on("click", function () {
				$("#bugContent").val("")
				closeBugReport.call(this)
			})

		$("#bugReport").show()
	}

	function returnFromBugSubmit(data) {
		$("#bugContent").val("")
		closeBugReport.call(this)
		alert(gettext("Your bug report has been submitted"))
	}

	this.refreshChat = function () {
		$("#messageList").empty()
		var messages = []
		if (global.chat != undefined) {
			messages = global.chat.chat
		}

		messages.push({ name: "WelcomeBot", timestamp: global.gameCreationTimestamp, message: gettext("Welcome to Horseless Carriage Online!=-NEWLINE-==-NEWLINE-=If you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!") })

		_.each(
			messages,
			function (message) {
				addMessageToDisplay.call(this, message)
			},
			this
		)
	}

	function addMessageToDisplay(message, pre) {
		var div = $('<div class="chatentry" >')
		var header = $('<div class="header"/>')
		header.append('<span class="date">' + Log.giveFormattedDate(message.timestamp) + " </span>")
		header.append('<span class="bold">' + message.name + "</span>")
		div.append(header)
		message.message = message.message.replace(/=-NEWLINE-=/g, "<br/>")
		message.message = message.message.replace(/\n/g, "<br/>")
		div.append('<div class="body">' + message.message + "</span>")
		if (message.date != undefined) div.data("ts", message.timestamp)
		else div.data("ts", -1)
		if (pre === true) $("#messageList").prepend(div)
		else $("#messageList").append(div)
	}

	this.addMessageToDisplayLive = function (message) {
		displayChat.call(this)
		addMessageToDisplay.call(this, message, true)
	}

	function displayReserve() {
		var i = 0

		var eligibleFactoryTiles = []
		for (i = 0; i < M.availableComponents.length; i++) {
			eligibleFactoryTiles.push(i)
		}

		$("#reserve").empty()
		$("#reserveMenuButton").addClass("highlighted")

		var mainlinesDiv = $("<div></div>")
		var AlinesDiv = $("<div></div>")
		var BlinesDiv = $("<div></div>")
		var ClinesDiv = $("<div></div>")
		var DlinesDiv = $("<div></div>")
		var departmentsDiv = $("<div></div>")
		var playerComponentsDiv = $("<div></div>")
		var playerCardsResDiv = $("<div></div>")

		mainlinesDiv.addClass("componentsBinRes")
		AlinesDiv.addClass("componentsBinRes")
		BlinesDiv.addClass("componentsBinRes")
		ClinesDiv.addClass("componentsBinRes")
		DlinesDiv.addClass("componentsBinRes")
		departmentsDiv.addClass("componentsBinRes")
		playerComponentsDiv.addClass("componentsBinRes")
		playerCardsResDiv.addClass("componentsBinRes")

		var eligibleComponentsDiv = $("#reserve")
		for (i = 0; i < eligibleFactoryTiles.length; i++) {
			var newComponentIndividualDiv = $("<div/>")
			newComponentIndividualDiv.css({
				position: "relative",
				"font-weight": "bolder",
				"font-size": "15px",
			})

			var newComponentImg = this.getComponentImage(eligibleFactoryTiles[i])
			newComponentImg.css({
				width: "" + String((DIMENSIONS[eligibleFactoryTiles[i]][0] * this.smallSqPxWidth) / 2) + "px",
				height: "" + String((DIMENSIONS[eligibleFactoryTiles[i]][1] * this.smallSqPxWidth) / 2) + "px",
			})
			newComponentImg.attr("id", "newComponentImg" + String(eligibleFactoryTiles[i]))
			newComponentImg.css({
				margin: "4px",
				border: "1px solid black",
				"margin-bottom": "0px",
			})
			// Check if it isn't available
			if (M.availableComponents[eligibleFactoryTiles[i]] <= 0) {
				newComponentImg.css({
					opacity: "0.5",
				})
				newComponentIndividualDiv.css({
					color: "red",
				})
			}
			newComponentIndividualDiv.append(newComponentImg)

			if (!ARROWS.includes(eligibleFactoryTiles[i])) newComponentIndividualDiv.append("<BR/>" + DIMENSIONS[eligibleFactoryTiles[i]][0] + " x " + DIMENSIONS[eligibleFactoryTiles[i]][1])

			var newComponentIndividualAmountDiv = $("<div/>")
			newComponentIndividualAmountDiv.html(String(M.availableComponents[eligibleFactoryTiles[i]]))
			var top = 5
			if (ARROWS.includes(eligibleFactoryTiles[i])) top = 35
			var left = 5
			if (eligibleFactoryTiles[i] === BUMPER) left = 25
			if (ARROWS.includes(eligibleFactoryTiles[i])) newComponentIndividualAmountDiv.css({ visibility: "hidden" })

			newComponentIndividualAmountDiv.css({
				position: "absolute",
				top: String(top) + "px",
				left: String(left) + "px",
				color: "white",
				"background-color": "black",
				"font-size": "15px",
				"z-index": "50",
				padding: "2px",
			})
			if (M.availableComponents[eligibleFactoryTiles[i]] <= 0) {
				newComponentIndividualAmountDiv.css({
					color: "salmon",
				})
			}
			newComponentIndividualDiv.append(newComponentIndividualAmountDiv)

			//eligibleComponentsDiv.append(newComponentIndividualDiv);
			if (MAINLINES.includes(eligibleFactoryTiles[i])) mainlinesDiv.append(newComponentIndividualDiv)
			if (A_TECHS.includes(eligibleFactoryTiles[i]) || A_ARROWS.includes(eligibleFactoryTiles[i])) AlinesDiv.append(newComponentIndividualDiv)
			if (B_TECHS.includes(eligibleFactoryTiles[i]) || B_ARROWS.includes(eligibleFactoryTiles[i])) BlinesDiv.append(newComponentIndividualDiv)
			if (C_TECHS.includes(eligibleFactoryTiles[i]) || C_ARROWS.includes(eligibleFactoryTiles[i])) ClinesDiv.append(newComponentIndividualDiv)
			if (D_TECHS.includes(eligibleFactoryTiles[i]) || D_ARROWS.includes(eligibleFactoryTiles[i])) DlinesDiv.append(newComponentIndividualDiv)
			if (eligibleFactoryTiles[i] === DEPARTMENT_RESEARCH || eligibleFactoryTiles[i] === DEPARTMENT_PLANNING) departmentsDiv.append(newComponentIndividualDiv)
			if (DEALERSHIPS.includes(eligibleFactoryTiles[i]) || DEPARTMENTS_MARKETING.includes(eligibleFactoryTiles[i])) playerComponentsDiv.append(newComponentIndividualDiv)
		} // END Eligible Factory Tiles loop

		var name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("MAINLINES"))
		mainlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("A LINES"))
		AlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("B LINES"))
		BlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("C LINES"))
		ClinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("D LINES"))
		DlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("D'MENTS"))
		departmentsDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("DEALERSHIPS"))
		playerComponentsDiv.append(name)

		if (eligibleFactoryTiles.some((r) => MAINLINES.includes(r))) eligibleComponentsDiv.append(mainlinesDiv)
		if (eligibleFactoryTiles.some((r) => A_TECHS.includes(r))) eligibleComponentsDiv.append(AlinesDiv)
		if (eligibleFactoryTiles.some((r) => B_TECHS.includes(r))) eligibleComponentsDiv.append(BlinesDiv)
		if (eligibleFactoryTiles.some((r) => C_TECHS.includes(r))) eligibleComponentsDiv.append(ClinesDiv)
		if (eligibleFactoryTiles.some((r) => D_TECHS.includes(r))) eligibleComponentsDiv.append(DlinesDiv)
		if (eligibleFactoryTiles.some((r) => r === DEPARTMENT_RESEARCH || r === DEPARTMENT_PLANNING)) eligibleComponentsDiv.append(departmentsDiv)
		if (eligibleFactoryTiles.some((r) => DEALERSHIPS.includes(r) || DEPARTMENTS_MARKETING.includes(r))) eligibleComponentsDiv.append(playerComponentsDiv)

		// player cards
		var p
		if (M.trainingGame) p = C.currentPlayer()
		else if (global.pov != undefined) p = this.model.players[global.pov]
		else if (this.model.gameFlow.turnOrder[0] != undefined) p = this.model.players[this.model.gameFlow.turnOrder[0]]
		else p = this.model.players[0]

		if (global.pov != undefined) {
			var availCardsDiv = this.getAvailableCardsDiv(p.colour, p.playerCards, true)
			$("#reserve").append(availCardsDiv)
		}
		for (i = 0; i < this.model.players.length; i++) {
			//$("#reserve").append(gettext("The person having the visual colour:") + " " + getColourNameFromNumber(getCorrectedColour(M.players[i].colour)) + " " + gettext("has the original game cards in colour:") + " " + getColourNameFromNumber(M.players[i].colour) + "<BR/>");

			$("#reserve").append(
				interpolate(
					gettext("The person having the visual colour:: %(visualColour)s has the original game cards in colour: %(originalColour)s"),
					{
						visualColour: getColourNameFromNumber(getCorrectedColour(M.players[i].colour)),
						originalColour: getColourNameFromNumber(M.players[i].colour),
					},
					true
				) + "<BR/>"
			)
		}
		$("#reserve").append("Flex-Times: ")
		for (let i = 0; i < M.players.length; i++) {
			$("#reserve").append(M.players[i].name + ": " + getFlexiTimeString(M.players[i].name))
			$("#reserve").append("&nbsp;&nbsp;&nbsp;")
		}

		$("#reserve").css({ display: "flex" })
		$("#reserve").show()
	}

	function getFlexiTimeString(playerName) {
		let KickoutFlexiDataArray = global.KickoutFlexiDataArray
		let secondsIn24Hours = 24 * 60 * 60
		let playerSeconds = 0

		// Iterate over the KickoutFlexiDataArray to find the player's entry
		for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
			let entry = KickoutFlexiDataArray[i]

			// Check if the entry is a length-2 array and the first element matches the playerName
			if (Array.isArray(entry) && entry.length === 2 && entry[0] === playerName) {
				playerSeconds = entry[1]
				break
			}
		}

		let remainingSeconds = secondsIn24Hours - playerSeconds
		let hours = Math.floor(remainingSeconds / 3600)
		let minutes = Math.floor((remainingSeconds % 3600) / 60)

		// Set remaining time to 0 if it is negative
		hours = Math.max(hours, 0)
		minutes = Math.max(minutes, 0)

		// Format the hours and minutes as a string in the format hh:mm
		let formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

		return formattedTime
	}

	function closeReserve() {
		$("#reserve").hide()
		$("#reserve").empty()
		$("#reserveMenuButton").removeClass("highlighted")
	}

	var SMALL_SQUARE
	var MB_SMALL_SQUARE
	var MW_SMALL
	var MW_SMALL_R
	var MW_MEDIUM
	var MW_LARGE
	var Qhighlight
	var P_CARD_AREA

	this.reloadModel = function (model) {
		this.model = model
		this.render()
	}

	init.call(this)
}

function showLoader() {
	$("#loader").show()
}

function hideLoader() {
	$("#loader").hide()
}

function getCorrectedColour(colour) {
	if (global.preferredColour != undefined && global.preferredColour > -1 && global.pov != undefined && global.pov > -1 && M != undefined) {
		if (M.players[global.pov].colour === colour) {
			return global.preferredColour
		} else if (global.preferredColour === colour) {
			return M.players[global.pov].colour
		}
	}
	return colour
}

function getColourNameFromNumber(colour) {
	if (colour === 0) return "Red"
	if (colour === 1) return "Green"
	if (colour === 2) return "Purple"
	if (colour === 3) return "Blue"
	if (colour === 4) return "Yellow"
}
