// Rebuilds the game from the stored history, one log entry at a time, and lets you step through it.
// Only the *_core functions are used here, so nothing depends on the current player or the live board.
// The player index on a stored entry can be null or -1 - the server writes those, and the history
// renderer has always tolerated it. NB null >= 0 is true, so it has to be checked explicitly
function isUsablePlayerIndex(playerIndex) {
	if (playerIndex == null) return false
	if (playerIndex < 0 || playerIndex >= M.players.length) return false
	return true
}

function getLogPlayerName(playerIndex) {
	if (!isUsablePlayerIndex(playerIndex)) return ""
	return M.players[playerIndex].name
}

var replay = {
	init: function (model) {
		this.model = model
		this.liveModel = model
		this.originalLogs = []
		this.replayData = []
		this.replayStep = 0
		this.showingReplay = false
		this.generatingData = false
		this.endReplayResetData = ""
		this.replayError = ""
		this.setupDone = []
		this.desyncCount = 0
		this.setupDone = []
		return this
	},

	/**************************************************************************************************************
	 *
	 * ENTER / EXIT
	 *
	 **************************************************************************************************************/

	toggleReplayMode: async function () {
		if (this.generatingData) return

		if (!this.showingReplay) {
			this.showingReplay = true
			this.generatingData = true
			this.replayError = ""
			this.endReplayResetData = compressObjectToDB(M.export())
			this.liveModel = M

			$("#actions").empty()
			$("#replayArea").empty()
			$("#replayArea").html('<div class="progress-bar"><div></div><span></span></div>')

			await this.generateReplayData()

			this.updateReplayArea()
			$("body").addClass("greyBackground")
			$("body").removeClass("blueBackground")

			this.generatingData = false
		} else {
			this.showingReplay = false
			this.replayData.splice(0)
			$("body").removeClass("greyBackground")
			$("body").addClass("blueBackground")
			$("#replayArea").empty()

			M = Model.import(decompressObjectFromDB(this.endReplayResetData))
			C.model = M
			this.model = M
			C.view.reloadModel(M)
			Log.refreshHistory(M)
			C.startActions()

			// A replay must never let the same action be taken twice, so reset back to the start of the turn
			if (global.fullreset != undefined) C.reset(true)
		}
	},

	/**************************************************************************************************************
	 *
	 * BUILD THE GAME AGAIN
	 *
	 **************************************************************************************************************/

	generateReplayData: async function () {
		this.replayData = []
		this.setupDone = []
		this.desyncCount = 0
		this.originalLogs = M.logs
		if (this.originalLogs.length === 0) return

		this.resetDataForReplay()

		var pBarEl = document.querySelector(".progress-bar div")
		var pBarTextEl = document.querySelector(".progress-bar span")

		for (var i = 0; i < this.originalLogs.length; i++) {
			var entry = this.originalLogs[i]

			if (entry.action === Log.REWIND) {
				// The game was replaced by an earlier saved state, so rebuild up to that point instead
				this.resetDataForReplay()
				this.walkLogs(0, i)
			} else {
				this.setgameflowVars(entry.action)
				this.performReplayAction(entry.action, entry.player, entry.param)
				this.advanceTurnOrder(entry.action, entry.player)
			}

			this.replayData.push(compressObjectToDB(M.export()))

			if (i % 5 === 0 && pBarEl != null) {
				var percent = (i / this.originalLogs.length) * 100
				pBarEl.style.width = percent + "%"
				pBarTextEl.innerText = Math.round(percent) + "%"
				await sleep(0)
			}
		}

		this.replayStep = this.replayData.length - 1
		this.integrityCheck()
	},

	// Applies entries [from, to) without storing snapshots. Only used after a rewind
	walkLogs: function (from, to) {
		for (var i = from; i < to; i++) {
			var entry = this.originalLogs[i]
			this.setgameflowVars(entry.action)
			this.performReplayAction(entry.action, entry.player, entry.param)
			this.advanceTurnOrder(entry.action, entry.player)
		}
	},

	// Start again from the very beginning. Everything except the random shuffles is worked out from
	// logs[0] (SETUP_GAME), the player count and the starting options already on the page
	resetDataForReplay: function () {
		this.setupDone = []

		var setupParam = this.originalLogs[0].param
		var n = setupParam.length - 2
		// New style entries have 5 extra track colours on the end
		var playerCount = n % 2 === 0 ? n / 2 : (n - 5) / 2
		var hasTrackColours = n % 2 !== 0

		var names = []
		var colours = []
		var i = 0
		for (i = 0; i < playerCount; i++) {
			names.push(setupParam[2 + i * 2])
			colours.push(setupParam[3 + i * 2])
		}

		var trackColours = []
		if (hasTrackColours) {
			for (i = 0; i < 5; i++) trackColours.push(setupParam[2 + playerCount * 2 + i])
		} else trackColours = this.unwindTechTracks()

		// global.displayNames is only set on the create page, so take them off the live players instead
		var displayNames = []
		for (i = 0; i < playerCount; i++) displayNames.push(this.liveModel.players[i].displayName)

		var m = new Model()
		m.start({ players: names, colours: colours, trackColours: trackColours, displayNames: displayNames })
// The history is kept whole for the whole replay, so the history tab always shows the game.
			// Only the board state steps. Copied because the walk must not be able to alter it
			m.logs = [...this.originalLogs]

		M = m
		C.model = m
		this.model = m
		C.view.reloadModel(m)
	},

	// Games stored before SETUP_GAME held the tech track colours do not have them anywhere, so work them
	// out by undoing every ADVANCE_EXPECTATIONS rotation, backwards from the current techTracks.
	// Each rotation removes the obsolescence track from the array and copies it to the end, then flips the
	// obsolescence marker, so the removed track is always the last entry and the winner is always in slot 2-4
	unwindTechTracks: function () {
		var tracks = []
		var i = 0
		var l = 0
		for (i = 0; i < this.liveModel.techTracks.length; i++) tracks.push([this.liveModel.techTracks[i][7][0], this.liveModel.techTracks[i][7][1]])

		for (l = this.originalLogs.length - 1; l >= 0; l--) {
			if (this.originalLogs[l].action !== Log.ADVANCE_EXPECTATIONS) continue
			var param = this.originalLogs[l].param
			var oldObsColour = param[0]
			var newMin = param[1]
			var winnerColour = param[3]
			var obsDir = param[4] === 1 ? 0 : 1

			// param[2] holds [innovation, colour, furthestFromMin] for tracks 2, 3 and 4, so the index that won
			// is the one whose colour is the winning colour
			var winner = -1
			for (i = 0; i < param[2].length; i++) {
				if (param[2][i][1] === winnerColour) winner = i + 2
			}
			if (winner === -1) break

			// The splice removed the obsolescence track from index winner, and a copy of it was pushed to the end
			var q = []
			for (i = 0; i < winner; i++) q.push(tracks[i])
			q.push(tracks[4])
			for (i = winner; i <= 3; i++) q.push(tracks[i])

			if (q[obsDir][0] !== winnerColour) break
			if (q[winner][0] !== oldObsColour) break
			if (q[winner][1] !== newMin) break

			// Undo the min demand bump, then the swap
			q[winner][1] = q[winner][1] - 1
			var tmp = q[obsDir]
			q[obsDir] = q[winner]
			q[winner] = tmp
			tracks = q
		}

		var res = []
		for (i = 0; i < tracks.length; i++) res.push(tracks[i][0])
		return res
	},

	// Two phase transitions log nothing, so they are triggered by the first entry of the next phase
	setgameflowVars: function (action) {
		var i = 0
		var j = 0

		if (action === Log.SET_FOCUS) {
			// RESEARCH -> SET FOCUS
			if (M.gameFlow.phase !== PHASE_RESEARCH) return
			M.gameFlow.phase = PHASE_SET_FOCUS

			M.prevEngFocusOrder.splice(0, M.prevEngFocusOrder.length)
			M.newEngFocusOrder.splice(0, M.newEngFocusOrder.length)
			M.prevEngFocusOrder = [...M.gameFlow.unalteredTurnOrder]
			for (i = 0; i < M.players.length; i++) M.newEngFocusOrder.push(-1)

			var ganttOrder = []
			for (i = 0; i < M.prevEngFocusOrder.length; i++) {
				ganttOrder.push([M.prevEngFocusOrder[i], M.players[M.prevEngFocusOrder[i]].gantt])
			}
			ganttOrder.sort(function (a, b) {
				return b[1] - a[1]
			})

			M.gameFlow.turnOrder.splice(0, M.gameFlow.turnOrder.length)
			for (i = 0; i < ganttOrder.length; i++) M.gameFlow.turnOrder.push(ganttOrder[i][0])
			M.gameFlow.unalteredTurnOrder = [...M.gameFlow.turnOrder]
			Bot.correctTurnOrderForBots(M)
		} else if (action === Log.FACTORY_BUILD) {
			// SET FOCUS -> BUILD FACTORY
			if (M.gameFlow.phase !== PHASE_SET_FOCUS) return

			// Fill up new eng focus with leftover people. It just works in reverse
			for (i = M.newEngFocusOrder.length - 1; i >= 0; i--) {
				if (M.newEngFocusOrder[i] === -1) {
					for (j = 0; j < M.prevEngFocusOrder.length; j++) {
						if (!M.newEngFocusOrder.includes(M.prevEngFocusOrder[j])) M.newEngFocusOrder[i] = M.prevEngFocusOrder[j]
					}
				}
			}

			M.gameFlow.phase = PHASE_BUILD_FACTORY
			M.gameFlow.turnOrder = [...M.newEngFocusOrder]
			M.gameFlow.unalteredTurnOrder = [...M.gameFlow.turnOrder]
			Bot.correctTurnOrderForBots(M)
		}
	},

	// Each action is handled by the same model mutation the live game uses, just without the history or the UI
	performReplayAction: function (action, playerIndex, param) {
		var i = 0

		// These act on one specific player, so a bad index means there is nothing to replay for them
		var PLAYER_ACTIONS = [Log.FACTORY_SETUP, Log.RESEARCH, Log.SET_FOCUS, Log.FACTORY_BUILD, Log.PLAY_CARD, Log.SALES_V2, Log.SALES]
		if (PLAYER_ACTIONS.includes(action) && !isUsablePlayerIndex(playerIndex)) return

		if (action === Log.FACTORY_SETUP) this.replayFactorySetup(playerIndex, param)
		else if (action === Log.RESEARCH) this.replayResearch(playerIndex, param)
		else if (action === Log.SET_FOCUS) this.replaySetFocus(playerIndex, param)
		else if (action === Log.FACTORY_BUILD) this.replayFactoryBuild(playerIndex, param)
		else if (action === Log.PLAY_CARD) this.replayPlayCard(playerIndex, param)
		else if (action === Log.SALES_V2) this.replaySales(playerIndex, param)
		else if (action === Log.SALES) this.replayLegacySales(playerIndex, param)
		else if (action === Log.INCREASE_GANTT) this.replayIncreaseGantt()
		else if (action === Log.SHOW_CARDS) this.replayShowCards(param)
		else if (action === Log.NEUTRAL_CARDS) this.replayNeutralCards(param)
		else if (action === Log.ADVANCE_EXPECTATIONS) this.replayAdvanceExpectations()
		else if (action === Log.NEW_TURN) this.replayNewTurn(param)
		else if (action === Log.GAME_END) this.replayGameEnd(param)
		else if (action === Log.RESIGN || action === Log.KICKOUT) this.replayKickout(param)

		if (action === Log.FACTORY_SETUP || action === Log.FACTORY_BUILD || action === Log.SALES_V2) {
			for (i = 0; i < M.players.length; i++) M.players[i].factory.checkDealershipLevels()
		}
	},

	replayFactorySetup: function (playerIndex, param) {
		// moveToNextPhase logs a FACTORY_SETUP for every player as well, so only handle the first of each
		if (this.setupDone.includes(playerIndex)) return
		this.setupDone.push(playerIndex)

		// Turn zero setup is simultaneous, so each player only removes themselves from the queue
		var to = M.gameFlow.turnOrder
		var setupIndex = to.indexOf(playerIndex)
		if (setupIndex > -1) to.splice(setupIndex, 1)

		if (!Log.isNewStyle(Log.FACTORY_SETUP, param)) return

		var factory = M.players[playerIndex].factory
		factory.mainFactoryRotation = param[0]
		factory.mainFactoryFlipped = param.length > 2 ? param[2] : 0
		factory.factoryCoords = factory.rotateSquare(MAIN_FACTORY_TILE_COMPONENT, factory.mainFactoryRotation, 12, factory.mainFactoryFlipped)

		for (var i = 0; i < param[1].length; i++) {
			var placement = Factory.decodePlacement(param[1][i])
			factory.actionPlaceFactoryComponent_core(M.players[playerIndex], placement[0], placement[1], placement[2], placement[3])
		}
	},

	replayResearch: function (playerIndex, param) {
		for (var i = 0; i < param.length; i++) {
			if (param[i].length < 3) continue
			// A compressed track number is the colour of the track, and 5 is the assembly capacity track
			if (param[i][1] === 5) {
				C.actionPlaceResearchPiece_core("ACT", param[i][2] - 1, param[i][0])
				continue
			}
			for (var t = 0; t < M.techTracks.length; t++) {
				if (M.techTracks[t][7][0] === param[i][1]) C.actionPlaceResearchPiece_core("TT" + String(t), param[i][2] - 1, param[i][0])
			}
		}
	},

	replaySetFocus: function (playerIndex, param) {
		// -1 means the player passed and kept their gantt
		if (parseInt(param) === -1) return
		C.actionChooseFocus_core(M.players[playerIndex], parseInt(param))
	},

	replayFactoryBuild: function (playerIndex, param) {
		// Old entries only stored how many components were added, so there is nothing to place
		if (!Log.isNewStyle(Log.FACTORY_BUILD, param)) return

		var player = M.players[playerIndex]
		for (var i = 0; i < param[0].length; i++) {
			var placement = Factory.decodePlacement(param[0][i])
			player.factory.actionPlaceFactoryComponent_core(player, placement[0], placement[1], placement[2], placement[3])
		}

		if (param[1] != undefined && param[1].length > 0) {
			player.factory.expandFactoryArea(8, 8)
			player.factory.actionPlaceFactoryExpansion_core(player, param[1][0], param[1][1], param[1].length > 2 ? param[1][2] : 0)
			player.factory.collapseFactoryAfterExpansion()
		}
	},

	replayPlayCard: function (playerIndex, param) {
		var player = M.players[playerIndex]
		// Old entries did not store which card, so nothing to play
		if (param.length < 2) return

		var cardIndex = player.playerCards.indexOf(param[1])
		if (cardIndex === -1) return
		var cardName = getCardIDcorrectedFromColourAndNumber(player.colour, param[1], false).slice(4)
		C.actionPlayCard_core(player, param[0], cardName, cardIndex)
	},

	replaySales: function (playerIndex, param) {
		var newStyle = Log.isNewStyle(Log.SALES_V2, param)
		var mw = param[1]
		var dealership = this.getDealership(playerIndex, param[0])
		if (dealership == null) return

		// mw[0] 0 = a new market window was placed, 1 = an existing one was used.
		// The raw index and rotation are only on new style entries
		if (newStyle && mw[0] === 0) M.placeDealershipWindowIntoModel_core(dealership, mw[4], mw[5], mw[2])

		// Every vehicle type was sold into the same niche, so any type that sold gives us the index
		if (param[2] !== -1) {
			for (var i = 0; i < param[2].length; i++) {
				if (param[2][i][0] > 0) {
					C.actionSales_core(M.players[playerIndex], param[2][i][2], dealership)
					break
				}
			}
		}
	},

	// Games from before SALES_V2 did not store where the market window went, so only the sale itself can be replayed
	replayLegacySales: function (playerIndex, param) {
		if (param[2] === -1) return
		var dealership = this.getDealership(playerIndex, param[0])
		if (dealership == null) return
		for (var i = 0; i < param[2].length; i++) {
			if (param[2][i][0] > 0 && param[2][i][2] != undefined) {
				C.actionSales_core(M.players[playerIndex], param[2][i][2], dealership)
				break
			}
		}
	},

	replayIncreaseGantt: function () {
		for (var i = 0; i < M.players.length; i++) {
			if (M.players[i].autoplay === true) continue
			var offices = Rules.getNumberOfPlanningOffices(M.players[i])
			var clockReduction = 0
			if (M.players[i].gantt < 10 && M.players[i].gantt + offices >= 10) clockReduction = 1

			M.players[i].gantt = Math.min(20, M.players[i].gantt + offices)
			M.punchClockNumber -= clockReduction
		}
		C.actionRefreshMainlineStock_core()

		M.gameFlow.phase = PHASE_SELL
		M.gameFlow.unalteredTurnOrder.reverse()
		M.gameFlow.turnOrder = [...M.gameFlow.unalteredTurnOrder]
	},

	replayShowCards: function (param) {
		C.actionShowCards_core(param[1])
		M.alreadyPlayedCards.splice(0, M.alreadyPlayedCards.length)
	},

	replayNeutralCards: function (param) {
		for (var i = 0; i < param.length; i++) Rules.playSingleNeutralCard(param[i][0], param[i][1])
	},

	replayAdvanceExpectations: function () {
		M.gameFlow.phase = PHASE_ADVANCE_EXPECTATIONS
		C.actionAdvanceExpectations_core()
		M.gameFlow.phase = PHASE_GROW_DEMANDS
		M.gameFlow.unalteredTurnOrder.reverse()
		M.gameFlow.turnOrder = [...M.gameFlow.unalteredTurnOrder]
		C.actionRefreshMainlineStock_core()
		Bot.correctTurnOrderForBots(M)
	},

	replayNewTurn: function (param) {
		Rules.setCurrentMarketBoardPrices()
		M.gameFlow.turn = param[0]
		M.gameFlow.phase = PHASE_RESEARCH
		M.gameFlow.turnOrder = [...M.gameFlow.unalteredTurnOrder]
		M.gameFlow.currentPlayer = M.gameFlow.turnOrder.length > 0 ? M.gameFlow.turnOrder[0] : 0
		M.alreadyPlayedCards.splice(0, M.alreadyPlayedCards.length)
		M.piecesUsedInResearch.splice(0, M.piecesUsedInResearch.length)
		Bot.correctTurnOrderForBots(M)
	},

	replayGameEnd: function (param) {
		M.gameFlow.phase = PHASE_GAME_END_CHECK
		M.gameEnded = param[1]
		C.actionSortPlayersByMoney_core()
		global.winner = M.players[M.gameFlow.unalteredTurnOrder[0]].name
	},

	replayKickout: function (param) {
		var idx = M.players.map((p) => p.name).indexOf(param[0])
		if (idx === -1) return

		var player = M.players[idx]
		player.name = "HcBot"
		player.autoplay = true
		if (player.money > 0) player.money *= -1
		else player.money = -1
		player.gantt = -1

		Bot.correctTurnOrderForBots(M)
	},

	getDealership: function (playerIndex, componentName) {
		var components = M.players[playerIndex].factory.factoryComponents
		for (var i = 0; i < components.length; i++) {
			if (components[i][0] === componentName) return components[i]
		}
		return null
	},

	// Keep turnOrder in step with the live game, so every handler knows who the acting player is
	advanceTurnOrder: function (action, playerIndex) {
		var to = M.gameFlow.turnOrder
		if (to.length === 0) return

		if (action === Log.SALES_V2 || action === Log.SALES) {
			// The acting player has sold, so goes to the back of the queue
			to.push(to.shift())
		} else if (action === Log.SALES_SKIP) {
			// Cannot sell at all, so leaves the queue for this round
			to.splice(0, 1)
		} else if (action === Log.RESEARCH || action === Log.SET_FOCUS || action === Log.PLAY_CARD || action === Log.NO_CARDS) {
			// Sequential phase, so the acting player is done and leaves the queue.
			// FACTORY_SETUP is not here - it is handled in replayFactorySetup so the duplicate
			// entries from moveToNextPhase cannot remove the same player twice.
			// The entry says who acted, so if that is not the front of the queue the turn order has
			// drifted - count it rather than quietly rotating past it
			if (to.indexOf(playerIndex) === -1) {
				this.desyncCount++
				return
			}
			if (to[0] !== playerIndex) this.desyncCount++
			while (to[0] !== playerIndex) to.push(to.shift())
			to.splice(0, 1)
		}
	},

	/**************************************************************************************************************
	 *
	 * STEP THROUGH
	 *
	 **************************************************************************************************************/

	loadModel: function (strModel) {
		var m = Model.import(decompressObjectFromDB(strModel))
		m.historyObj.splice(0, m.historyObj.length)
		M = m
		C.model = m
		this.model = m
		// We know who acted on this step. The live game gets this from Rules.canPlay(), which stands
		// down during the replay, so set it here - it drives the current player glow and is a handy
		// cross check that the turn order has not drifted
		var entry = this.originalLogs[this.replayStep]
		if (entry != undefined && isUsablePlayerIndex(entry.player)) m.gameFlow.currentPlayer = entry.player

		C.view.reloadModel(m, this.getViewItem())
		Log.refreshHistory(m)
	},

	// V.render() with no argument picks turnOrder[0], but the acting player has already been taken off
	// the queue by the time their entry is shown, so that points one player too far on. Show the
	// factory of whoever the current entry belongs to instead. undefined lets the view decide, which is
	// what we want during the market board phases and for entries with no player
	getViewItem: function () {
		if (M.gameEnded > 0) return undefined
		if (MARKET_BOARD_PHASES.includes(M.gameFlow.phase)) return undefined

		var entry = this.originalLogs[this.replayStep]
		if (entry == undefined || !isUsablePlayerIndex(entry.player)) return undefined

		var item = M.gameFlow.unalteredTurnOrder.indexOf(entry.player)
		if (item === -1) return undefined
		return item
	},

	performStep: function (e) {
		var r = e.data.replay
		var amount = e.data.amount

		if (amount === -99) r.replayStep = 0
		if (amount === -9) r.replayStep -= 5
		if (amount === -1) r.replayStep--
		if (amount === 1) r.replayStep++
		if (amount === 9) r.replayStep += 5
		if (amount === 99) r.replayStep = r.replayData.length - 1

		if (r.replayStep < 0) r.replayStep = 0
		if (r.replayStep > r.replayData.length - 1) r.replayStep = r.replayData.length - 1

		// Performing back to my last
		if (amount === -999) {
			var idx = r.replayStep
			idx--
			while (idx > 0) {
				if (r.originalLogs[idx].player === global.pov) {
					r.replayStep = idx
					break
				}
				idx--
			}
		}

		r.goToReplayStep(r.replayStep)
	},

	goToReplayStep: function (step) {
		if (this.replayData.length === 0) return
		this.replayStep = step
		this.loadModel(this.replayData[step])
		this.updateReplayArea()
	},

	updateReplayArea: function () {
		$("#replayArea").empty()
		if (this.replayData.length === 0) return

		var div = $('<div class="replayButtonsDiv">')
		div.append(gettext("Use the arrows to step through the game. Click an entry in the history tab to jump to that point in time."))
		if (this.replayError !== "") div.append("<BR/><B>" + this.replayError + "</B>")
		div.append("<BR/>")

		if (global.pov != undefined && global.pov >= 0) {
			var buttonPOVback = $('<button class="actionsLineButton">' + gettext("Back to my last turn") + "</button>")
			buttonPOVback.on("click", { amount: -999, replay: this }, this.performStep)
			div.append(buttonPOVback)
			div.append("<BR/>")
		}

		var buttons = [
			["|<", -99],
			["<<", -9],
			["<", -1],
		]
		for (var i = 0; i < buttons.length; i++) {
			var b = $('<button class="actionsLineButton">' + buttons[i][0] + "</button>")
			if (this.replayStep === 0) b.prop("disabled", true)
			b.on("click", { amount: buttons[i][1], replay: this }, this.performStep)
			div.append(b)
		}
		div.append("&nbsp;" + String(this.replayStep + 1) + " / " + String(this.replayData.length) + "&nbsp;")
		buttons = [
			[">", 1],
			[">>", 9],
			[">|", 99],
		]
		for (i = 0; i < buttons.length; i++) {
			var b2 = $('<button class="actionsLineButton">' + buttons[i][0] + "</button>")
			if (this.replayStep + 1 === this.replayData.length) b2.prop("disabled", true)
			b2.on("click", { amount: buttons[i][1], replay: this }, this.performStep)
			div.append(b2)
		}

		var exitReplayButtonDiv = $('<div class="exitReplayButtonDiv">')
		var exitButton = $('<button class="actionsLineButton">' + gettext("Exit Replay Mode") + "</button>")
		exitButton.on("click", function () {
			replay.toggleReplayMode()
		})
		exitReplayButtonDiv.append(exitButton)
		div.append(exitReplayButtonDiv)

		$("#replayArea").append(div)

		// Show what this step is
		var entry = this.originalLogs[this.replayStep]
		var entryDiv = $('<div class="replayHistoryEntry">')
		var entryName = getLogPlayerName(entry.player)
		entryDiv.append(Log.giveFullText(entryName, entry.action, entry.param))
		$("#replayArea").append(entryDiv)
	},

	// The replay must land on exactly the same game as the live one. If it does not, the history was
	// missing something, so say so rather than silently showing the wrong game
	integrityCheck: function () {
		var live = this.liveModel
		var problems = []
		var i = 0
		if (live == undefined || live.players == undefined) return

		if (M.punchClockNumber !== live.punchClockNumber) problems.push("punch clock")
		if (M.gameFlow.turn !== live.gameFlow.turn) problems.push("turn")
		if (M.priceBand.join() !== live.priceBand.join()) problems.push("prices")
		if (M.availableComponents.join() !== live.availableComponents.join()) problems.push("components")
		for (i = 0; i < M.techTracks.length; i++) {
			if (M.techTracks[i][7][1] !== live.techTracks[i][7][1]) problems.push("tech tracks")
		}
		for (i = 0; i < M.players.length; i++) {
			if (M.players[i].money !== live.players[i].money) problems.push("money")
			if (M.players[i].gantt !== live.players[i].gantt) problems.push("gantt")
			if (M.players[i].factory.factoryComponents.length !== live.players[i].factory.factoryComponents.length) problems.push("factory")
		}

		if (this.desyncCount > 0) problems.push("turn order (" + this.desyncCount + " out of step)")
		this.replayError = problems.length === 0 ? "" : gettext("Game data does not match - please submit a bug report") + " (" + problems.join(", ") + ")"
	},
}