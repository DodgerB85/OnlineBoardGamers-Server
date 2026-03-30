var IO = {
	url: "processHLCturn",
	decalage: 0,

	init: function (controller) {
		this.controller = controller
		this.ts = new Date().getTime()
		this.tsChat = new Date().getTime()
		return this
	},

	// here, player is the NAME only
	resign: function (model, player) {
		showLoader()
		var csrftoken = getCookie("csrftoken")
		if (player == undefined) player = model.players[global.pov].name

		fetch("/HLC/processHLCturn/", {
			method: "POST",
			// None of this is used - the player actioning the API must be the one resigning
			body: JSON.stringify({
				gameID: global.gameID,
				action: "resign",
				user: player,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				delete global.move
				hideLoader()
			})
			.catch((error) => {
				console.log("Error:", error)
				alert(gettext("Something went wrong. Please reload the page. If the problem persists, please contact the webmaster"))
			})
	},

	votedToDelete: async function () {
		showLoader()
		let csrftoken = getCookie("csrftoken")

		let postData = {
			action: "voteToDelete",
			gameID: global.gameID,
		}

		try {
			const response = await fetch("/HLC/voteToDelete/", {
				method: "POST",
				body: JSON.stringify(postData),
				headers: { "X-CSRFToken": csrftoken },
			})
			if (!response.ok) {
				if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
				throw new Error("Network response was not ok")
			}
			const data = await response.json()

			hideLoader()
			if (data.voteChanged === true) {
				$("#actions").prepend("<B>" + gettext("Vote Saved") + "<B>")
				global.votedToDelete = true
				global.deleteVotesData = JSON.parse(data.deleteVotesData)
				$("#deleteDiv").html("<hr/>Refresh page to view votes")
				if (data.redirect_url) window.location.href = data.redirect_url
			} else if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
		} catch (error) {
			console.error("Error fetching data:", error)
			if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
			return false
		}
	},

	bugEntry: function (desc, callback, context) {
		showLoader()
		if (global != undefined && global.name != undefined) {
			var csrftoken = getCookie("csrftoken")
			fetch("/HLC/bugEntry/", {
				method: "POST",
				body: JSON.stringify({
					gameID: global.gameID,
					action: "bugentry",
					user: global.name,
					description: desc,
					gameData: compressObjectToDB(M.export()),
				}),
				headers: { "X-CSRFToken": csrftoken },
			})
				.then((response) => response.json())
				.then((result) => {
					hideLoader()
					callback.call(context)
				})
				.catch((error) => {
					console.log("Error:", error)
				})
		}
	},

	saveGame: async function (model, saveOnly) {
		global.haltPlay = true
		if (global.liveWS && (!HLCwebSocket || HLCwebSocket.readyState !== WebSocket.OPEN)) {
			await StartWebSocket()
			await sleep(2000)
		}

		var i = 0
		var nextPlayer = []
		/* CURRENT PLAYER MUST HAVE BEEN UPDATED */

		// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER
		showLoader()
		// THESE ARE INCORRECT IN NORMAL FLOW - UPDATED BELOW
		var turn = model.gameFlow.turn
		var phase = model.gameFlow.phase

		if (saveOnly !== true) {
			// IF NON-SIMUL AND NOTHING IN TURN ORDER
			if (!Rules.isSimulPhase() && model.gameFlow.turnOrder.length === 0) {
				model = C.moveToNextPhase()
				if (model.gameFlow.phase === PHASE_BUILD_FACTORY) {
					// use TURNORDER to account for removed bots
					for (i = 0; i < model.gameFlow.turnOrder.length; i++) {
						nextPlayer.push(model.players[model.gameFlow.turnOrder[i]].name)
					}
				} else nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]
			}
			// Otherwise, it is not a new phase.
			else {
				nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]
			}
			turn = model.gameFlow.turn
			phase = model.gameFlow.phase

			// Set up very first current players
			if (turn === 0) {
				nextPlayer = []
				for (i = 0; i < global.players.length; i++) {
					nextPlayer.push(global.players[i])
				}
			}
			if (M.trainingGame) nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]

			global.currentPlayers = nextPlayer
		} else if (saveOnly === true) {
			nextPlayer = global.currentPlayers
		}

		if (global.latestUpdate == undefined) global.latestUpdate = "9999999999999"

		var callData = {
			action: "save", // USED
			latestUpdate: global.latestUpdate, // USED
			data: compressObjectToDB(model.export()), // USED
			turn: turn, // USED
			nextPlayer: nextPlayer, // USED > goes to currentPlayers
			phase: phase, // USED
			status: "ACTIVE", // USED - only if FINISHED
			gameID: global.gameID, // USED
			saveRewind: global.saveRewind,
		}
		if (model.gameEnded > 0) {
			callData.status = "FINISHED" // USED
			callData.winner = global.winner // USED
			let finalPositions = []
			for (let i = 0; i < model.gameFlow.unalteredTurnOrder.length; i++) {
				finalPositions.push(model.players[model.gameFlow.unalteredTurnOrder[i]].name)
			}
			callData.finalPositions = finalPositions
			callData.deleteMoves = "true" // USED
			callData.saveRewind = false
		}

		var csrftoken = getCookie("csrftoken")
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify(callData),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				global.latestUpdate = String(result.latestUpdate)
				global.saveRewind = true
				if (result.syncError) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}

				hideLoader()
				if (model.trainingGame) {
					global.haltPlay = false
					V.render()
					C.startActions()
				} else if (model.gameFlow.turn !== 0) {
					// Don't transmit if the game can still go on
					/*var transmit = true;
						if (transmit && global.liveWS && HLCwebSocket.readyState === 1)
							HLCwebSocket.send(
							"NEWDATATS" + String(global.gameID) + String(result.latestUpdate)
							);
						else if (transmit && global.liveWS && HLCwebSocket.readyState === 0) {
							sleepPause(1000);
							if (global.liveWS && HLCwebSocket.readyState === 1)
							HLCwebSocket.send(
								"NEWDATATS" +
								String(global.gameID) +
								String(result.latestUpdate)
							);
						}*/

					// Broadcast update
					if (global.liveWS) {
						if (HLCwebSocket.readyState === 1) HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(result.latestUpdate))
						else {
							StartWebSocket()
							sleepPause(2000)
							if (HLCwebSocket.readyState === 1) HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(result.latestUpdate))
							else console.log("2xTO: " + HLCwebSocket.readyState)
						}
					}
					global.haltPlay = false
					V.render()
					C.startActions()
					//if (M.trainingGame) V.render()
				}
				// Otherwise start actions for the opening game player
				else {
					global.haltPlay = false
					C.startActions()
				}
				if (model.players[global.pov].name == "HcBot" && model.gameFlow.phase != PHASE_GAME_END_CHECK && global.name !== "BotKickStarter") $("#actions").html("")
			})
			.catch((error) => {
				console.log("Error:", error)
			})

		return false
	}, // END saveGame

	loadGame: async function (controller) {
		delete global.fullreset
		var csrftoken = getCookie("csrftoken")

		await fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "load",
				gameID: global.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then(async (result) => {
				loadDataString = String(result.loadData)
				global.latestUpdate = String(result.latestUpdate)
				$("#actions").empty()
				// Do this to update the top line info / green player highlights
				global.currentPlayers = result.currentPlayers
				await controller.reloadModel(loadDataString)
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	saveFactoryWithoutEndingTurn: function () {
		var player = M.players[global.pov]
		showLoader()

		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "saveFactoryWithoutEndingTurn", // USED
				data: compressObjectToDB(player.factory.export()), // USED
				gameID: global.gameID,
				name: player.originalName,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				hideLoader()
				if ($("#actions").text().substring(0, 8) != gettext("Your factory has been saved").substring(0, 8)) $("#actions").prepend("<B>" + gettext("Your factory has been saved") + "</B><BR/>")
			})
			.catch((error) => {
				console.log("Error:", error)
			})

		return false
	},

	sendDiscordWebhook: function (message) {
		let csrftoken = getCookie("csrftoken")

		fetch("/sendAdminMessage/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": csrftoken, // Important for Django CSRF protection
			},
			body: JSON.stringify({ message: message }),
		})
			.then((response) => {
				if (!response.ok) {
					console.error("Error sending webhook:", response.status, response.statusText)
				}
			})
			.catch((error) => {
				console.error("Error sending webhook:", error)
			})
	},

	saveFactoryMove: function (model, player, _useTheFirst) {
		// we cannot be sure if we are first in turn order accoring to the server.
		// So need to submit to server and check where we're at.
		// We could (now) be first, but not first when we started - so all factories need to be validated really

		// The server must be up to date, so we need to submit all factory data, plus componentNAMES added this turn
		//var player = model.players[global.pov];

		var FCIATT = player.factory.factoryComponenetIndexesAddedThisTurn
		var FCNATT = player.factory.factoryComponentNamesAddedThisTurn
		var FDBEdeco = decompressObjectFromDB(player.factory.factoryDataBeforeExpansion)
		var FDBE = []
		var ThisAC = []
		if (FDBEdeco != null) {
			FDBE = FDBEdeco[0] // CAUSES AN ERROR
			ThisAC = FDBEdeco[1]
		}

		var useTheFirst = false
		if (_useTheFirst) useTheFirst = true
		var idxToUse = global.currentPlayers.indexOf(global.name)
		if (idxToUse === -1) idxToUse = global.currentPlayers.indexOf(M.players[global.pov].name)
		if (idxToUse === -1 && global.name === "BotKickStarter") idxToUse = 0

		showLoader()

		var csrftoken = getCookie("csrftoken")

		// Use this for turns that could be simultaneous; eg payday, restructure, fridge
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				latestUpdate: global.latestUpdate, // USED
				action: "saveFactoryMove", // USED
				other: compressObjectToDB([FDBE, FCIATT, FCNATT, ThisAC]),
				data: compressObjectToDB(player.factory.export()), // USED
				idx: idxToUse,
				gameID: global.gameID,
				name: player.originalName,
				BKSN: M.players[global.pov].name,
				useTheFirst: useTheFirst,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				if (result.syncError) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}
				hideLoader()
				// if fac is immediately unverified, reopen the turn
				if (result.invalid) {
					var name = result.name
					var backInfo = decompressObjectFromDB(result.backInfo)
					var FDBE = backInfo[0]
					var FCIATT = backInfo[1]
					var DBavailableComponents = backInfo[2]
					M.availableComponents = [...DBavailableComponents]
					var player = M.players[global.pov]
					player.factory = Factory.import(FDBE)
					player.factory.factoryComponenetIndexesAddedThisTurn = [...FCIATT]
					V.render()
					C.startActions()
					// Don't need, as given in info
					// But do need this is immediately invalid
					$("#actions").prepend("<B><span style='color: red'>" + gettext("Previous players used up the components. Please rearrange your factory") + "</span></B><BR/>")

					global.fullreset = compressObjectToDB(M.export())
				}
				// if the fac is verified, but NOT first player, just say it's stored

				// If fac is verified, AND first player, update players, game data
				else if (result.VFFFP === true) {
					delete global.fullreset
					global.currentPlayers = result.currentPlayers
					global.latestUpdate = String(result.latestUpdate)
					$("#actions").empty()
					C.reloadModel(result.gameData)
					if (global.currentPlayers.length === 0) {
						delete global.fullreset
						M = C.moveToNextPhase()
						IO.saveGame(M)
						C.startActions()
					}
					// refresh active players
					return
				} else if (result.stored) {
					delete global.fullreset
					$("#actions").empty()
					$("#actions").append(gettext("Your factory has been saved. It will be verified again when it's your turn"))
					$("#eligibleComponentsDiv").hide()
					global.move = true
					// Clear factory expansion excesses -- need to keep components inactive
					global.justMoved = true
					V.render(M.gameFlow.unalteredTurnOrder.indexOf(global.pov))
				}

				// If you are here and currentPlayers is empty, send alert
				if (global.currentPlayers.length === 0) {
					this.sendDiscordWebhook(`HLC GameID ${global.gameID} - currentPlayers is empty after factory move save.`)
				}
			})
			.catch((error) => {
				console.log("Error:", error)
			})

		return false
	},

	saveTurnZeroMove: function (model, playerToKickIndex) {
		var player = model.players[global.pov]
		if (playerToKickIndex != undefined && playerToKickIndex >= 0) player = model.players[playerToKickIndex]
		var callData = {
			latestUpdate: global.latestUpdate, // USED
			action: "turn0move", // USED
			content: compressObjectToDB(player.factory.export()), // USED
			gameID: global.gameID,
		}
		if (playerToKickIndex != undefined && playerToKickIndex >= 0) callData.kickedPlayerName = player.originalName

		showLoader()
		var csrftoken = getCookie("csrftoken")
		// Use this for turns that could be simultaneous; eg payday, restructure, fridge
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify(callData),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				if (result.syncError) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}
				hideLoader()
				if (result.ready === false) {
					global.currentPlayers = result.currentPlayers
					// refresh active players
					V.render(M.gameFlow.unalteredTurnOrder.indexOf(global.pov))
				} else {
					// reload model
					C.reloadModel(result.gameData)
					$("#actions").empty()
					M = C.moveToNextPhase()
					IO.saveGame(M)
				}
			})
			.catch((error) => {
				console.log("Error:", error)
			})

		return false
	},

	saveGameDataFromKickout: async function (model, nextPlayersArr, kickedName) {
		// TODO
		if (global.liveWS && (!HLCwebSocket || HLCwebSocket.readyState !== WebSocket.OPEN)) {
			await StartWebSocket()
			await sleep(2000)
		}

		var turn = M.gameFlow.turn
		var phase = M.gameFlow.phase
		showLoader()
		var callData = {
			action: "saveAfterKickout",
			data: compressObjectToDB(model.export()),
			turn: turn,
			phase: phase,
			nextPlayer: nextPlayersArr,
			gameID: global.gameID,
			kickedName: kickedName,
			latestUpdate: global.latestUpdate,
			status: "ACTIVE",
		}
		if (model.gameEnded > 0) {
			callData.status = "FINISHED" // USED
			callData.winner = global.winner // USED
			callData.deleteMoves = "true" // USED
			let finalPositions = []
			for (let i = 0; i < M.players.length; i++) {
				finalPositions.push(M.players[i].name)
			}
			callData.finalPositions = finalPositions
		}

		var csrftoken = getCookie("csrftoken")
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify(callData),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				var index
				var player
				global.latestUpdate = String(result.latestUpdate)
				if (result.syncError && !ignoreSync) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}
				hideLoader()
				$("#actions").empty()
				global.secondsToNextKickout = result.secondsToNextKickout

				// Now set the game to the next state
				// You can only kickout someone in turn order. So must be first in turn order
				if (M.gameEnded > 0) {
					// Do this to display that you are the winner
					V.render()
				} else if (M.gameFlow.turn === 0) {
					// just save a turn 0 move with the bot player
					index = model.players.map((item) => item.originalName).indexOf(kickedName)
					player = M.players[index]
					showLoader()
					var csrftoken = getCookie("csrftoken")
					fetch("/HLC/processHLCturn/", {
						method: "POST",
						body: JSON.stringify({
							latestUpdate: global.latestUpdate, // USED
							action: "turn0move", // USED
							content: compressObjectToDB(player.factory.export()), // USED
							gameID: global.gameID,
							kickedPlayerName: kickedName,
						}),
						headers: { "X-CSRFToken": csrftoken },
					})
						.then((response) => response.json())
						.then((result) => {
							if (result.syncError) {
								alert(gettext("It appears you have an older version of the game. Please refresh the page"))
								return
							}
							hideLoader()
							if (result.ready === false) {
								global.currentPlayers = result.currentPlayers
								// refresh active players
								V.render(M.gameFlow.unalteredTurnOrder.indexOf(global.pov))
							} else {
								// reload model
								C.reloadModel(result.gameData)
								$("#actions").empty()
								M = C.moveToNextPhase()
								IO.saveGame(M)
							}
						})
						.catch((error) => {
							console.log("Error:", error)
						})
				} // END TURN 0 KICKOUT
				else if (M.gameFlow.phase === PHASE_BUILD_FACTORY) {
					// send out the update
					/*if (global.liveWS && HLCwebSocket.readyState === 1)
            HLCwebSocket.send(
              "NEWDATATS" + String(global.gameID) + String(result.latestUpdate)
            );
          else if (global.liveWS && HLCwebSocket.readyState === 0) {
            sleepPause(2000);
            if (global.liveWS && HLCwebSocket.readyState === 1)
              HLCwebSocket.send(
                "NEWDATATS" +
                String(global.gameID) +
                String(result.latestUpdate)
              );
          }*/
					// Broadcast update
					if (global.liveWS) {
						if (HLCwebSocket.readyState === 1) HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(result.latestUpdate))
						else {
							StartWebSocket()
							sleepPause(2000)
							if (HLCwebSocket.readyState === 1) HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(result.latestUpdate))
							else console.log("2xTO: " + HLCwebSocket.readyState)
						}
					}

					// kickout last player
					if (global.currentPlayers.length === 0) {
						M = C.moveToNextPhase()
						IO.saveGame(M)
					}
					// Otherwise save a fac move for the kicked out player
					else {
						index = model.players.map((item) => item.originalName).indexOf(kickedName)
						player = M.players[index]
						IO.saveFactoryMove(M, player, true)
					}
				}
				// Otherwise in standard non-simul phase
				else {
					if (M.gameFlow.phase === PHASE_SELL) C.endPlayerSalesTurn()
					else C.endPlayerTurn()
				}
			})
			.catch((error) => {
				alert("Something went wrong during kickout. Please submit a bug report so I can restart the game")
				console.log("Error:", error)
			})
	},

	resign: function (model, player, callback, context) {
		if (model.allowSurrender == true) {
			showLoader()
			var csrftoken = getCookie("csrftoken")
			if (player == undefined) player = model.players[global.pov].name

			fetch("/HLC/processTurn/", {
				method: "POST",
				// None of this is used - the player actioning the API must be the one resigning
				body: JSON.stringify({
					gameID: global.gameID,
					action: "resign",
					user: player,
				}),
				headers: { "X-CSRFToken": csrftoken },
			})
				.then((response) => response.json())
				.then((result) => {
					delete global.move
					hideLoader()
					var nbNonPlayers = 0
					_.each(model.players, function (p) {
						if (p.autoplay == true || p.bankrupt == true) {
							nbNonPlayers++
						}
					})

					if (nbNonPlayers >= model.players.length - 1) {
						model.endGame()
						IO.saveGameData(model)
						V.render()
						return false
					}
					if (model.workflow.turn == 0) C.next()
					else IO.saveGameData(model)
					// Want to check return data, passing it into simul phase to carry on the game
				})
				.catch((error) => {
					console.log("Error:", error)
					alert("Something went wrong. Please reload the page. If the problem persists, please contact the webmaster")
				})
		}
	},

	loadRewind: function (controller) {
		if (global.alreadyRewinding) return
		global.alreadyRewinding = true
		if (M.gameEnded > 0) {
			$("#wholeMainArea").fadeIn("slow")
			if ($("#actions").html().slice(0, 8) !== "You cann") $("#actions").prepend(gettext("You cannot rewind a finished game") + "<BR/>")
			global.alreadyRewinding = false
			return
		}
		var csrftoken = getCookie("csrftoken")
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "loadRewind",
				gameID: global.gameID,
				phase: M.gameFlow.phase,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				global.latestUpdate = result.latestUpdate
				$("#dropdown").hide()
				if (result.message != undefined) {
					$("#wholeMainArea").fadeIn("slow")
					if ($("#actions").html().slice(0, 8) != result.message.slice(0, 8)) $("#actions").prepend(result.message)
				} else {
					delete global.move
					delete global.fullreset
					delete global.sandboxReset
					loadDataString = String(result.loadData)
					var i = 0
					var j = 0
					$("#actions").empty()
					controller.reloadModel(loadDataString)
					$("#wholeMainArea").fadeIn("slow")
					$("#actions").prepend("<B>" + gettext("Game Rewound") + "<B>")
					M.log(Log.REWIND, [M.players[global.pov].name], -1)

					// Re kick booted players
					for (i = 0; i < result.missingPlayers.length; i++) {
						for (j = 0; j < M.players.length; j++) {
							if (M.players[j].name == result.missingPlayers[i]) {
								M.players[j].name = "HcBot"
								M.players[j].autoplay = true
								if (M.players[j].money != undefined && M.players[j].money > 0) M.players[j].money *= -1
							}
						}
					}
					// Send back to DB with another save
					IO.updateDataFromLoadRewind(M)
				}

				global.alreadyRewinding = false
			})
			.catch((error) => {
				$("#actions").prepend("<B>" + gettext("Could not rewind") + "<B>")
				console.log("Error:", error)
			})
	},

	updateDataFromLoadRewind: async function (model) {
		if (global.liveWS && (!HLCwebSocket || HLCwebSocket.readyState !== WebSocket.OPEN)) {
			await StartWebSocket()
			await sleep(2000)
		}

		var i = 0
		// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER
		var nextPlayer = []
		if (!Rules.isSimulPhase() && model.gameFlow.turnOrder.length === 0) {
			model = C.moveToNextPhase()
			if (model.gameFlow.phase === PHASE_BUILD_FACTORY) {
				for (i = 0; i < model.gameFlow.unalteredTurnOrder.length; i++) {
					nextPlayer.push(global.players[model.gameFlow.unalteredTurnOrder[i]])
				}
			} else nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]
		}
		// Otherwise, it is not a new phase.
		else {
			nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]
		}
		// if not trainng, and it is now building factory, enable everyone
		if (!model.trainingGame && (model.gameFlow.phase === PHASE_BUILD_FACTORY || model.gameFlow.turn === 0)) {
			nextPlayer = []
			for (i = 0; i < model.gameFlow.unalteredTurnOrder.length; i++) {
				nextPlayer.push(model.players[model.gameFlow.unalteredTurnOrder[i]].name)
			}
		}

		global.currentPlayers = nextPlayer
		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: model.gameFlow.turn,
				nextPlayer: nextPlayer,
				gameID: global.gameID,
				phase: model.gameFlow.phase,
				data: compressObjectToDB(M.export()),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				global.latestUpdate = result.latestUpdate
				hideLoader()

				/*if (global.liveWS && HLCwebSocket.readyState === 1)
          HLCwebSocket.send(
            "NEWDATATS" + String(global.gameID) + String(result.latestUpdate)
          );*/

				// Broadcast update
				if (global.liveWS) {
					if (HLCwebSocket.readyState === 1) HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(result.latestUpdate))
					else {
						StartWebSocket()
						sleepPause(2000)
						if (HLCwebSocket.readyState === 1) HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(result.latestUpdate))
						else console.log("2xTO: " + HLCwebSocket.readyState)
					}
				}
				$("#actions").empty()
				C.startActions()
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	/* BELOW IS OTHER FUNCTIONS NOT USING -- processTurn -- IE BUG, CHAT, NOTES, REWIND_CONSENT, CHANGE_ASSISTANCE, ZOOM */
	checkForLatestData: async function () {
		let csrftoken = getCookie("csrftoken")

		// Function to fetch data from the database
		try {
			const response = await fetch("/HLC/data/3/", {
				method: "POST",
				body: JSON.stringify({
					gameID: global.gameID,
					latestUpdate: global.latestUpdate,
				}),
				headers: { "X-CSRFToken": csrftoken },
			})

			if (!response.ok) {
				throw new Error("Network response was not ok")
			}
			const data = await response.json()
			if (data.gameDoesNotExist === true) location.reload()
			if (data.latest === true) return
			else {
				let loadDataString = String(data.loadData)
				global.latestUpdate = String(data.latestUpdate)
				global.secondsToNextKickout = data.secondsToNextKickout
				$("#actions").empty()
				// Do this to update the top line info / green player highlights
				C.reloadModel(loadDataString)
			}
		} catch (error) {
			console.error("Error fetching data:", error)
		}
	},

	postMessage: function (message, player) {
		showLoader()
		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/chat/", {
			method: "POST",
			body: JSON.stringify({
				action: "addMessage",
				player: player,
				gameID: global.gameID,
				message: htmlEscape(message),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				hideLoader()
				var d = new Date().getTime()
				var m = { m: htmlEscape(message), p: player, t: d }
				if (IO.chat != undefined) {
					IO.tsChat = d
					IO.chat.child("message").set(m)
				}
				if (global.liveWS) HLCwebSocket.send("NEWCHATTS" + String(global.gameID))
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	refreshChat: function () {
		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/chat/", {
			method: "POST",
			body: JSON.stringify({
				action: "refreshChat",
				gameID: global.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				var message = {
					message: htmlUnescape(result.message),
					timestamp: result.timestamp,
					name: result.name,
				}
				V.addMessageToDisplayLive(message)
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	postNote: function (note, player) {
		showLoader()
		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/notes/", {
			method: "POST",
			body: JSON.stringify({
				action: "notes",
				type: "post",
				user: player,
				note: htmlEscape(note),
				gameID: global.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				hideLoader()
				if (note != "") $("#menuButtonNotes").addClass("notesAvailable")
				else $("#menuButtonNotes").removeClass("notesAvailable")
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	/*saveAssistance: function (assistance) {
		var csrftoken = getCookie("csrftoken")

		fetch("/FCM/changeAssistance/", {
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=UTF-8",
				"X-CSRFToken": csrftoken,
			},
			body: JSON.stringify({
				action: "assistance",
				changeAssistance: assistance,
			}),
		})
	},*/

	submitRewindConsent: function () {
		if ($("#checkOnce").prop("checked") == false && $("#checkPermanent").prop("checked") == false) {
			alert(gettext("Please tick a permission option first"))
			return
		}
		var consentLevel = 0
		if ($("#checkPermanent").prop("checked") == true) consentLevel = 2
		else if ($("#checkOnce").prop("checked") == true) consentLevel = 1

		IO.castVote(REWIND_CONSENT_VOTE_TOPIC, consentLevel)

		/*fetch("/HLC/processHLCrewindConsent/", {
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=UTF-8",
				"X-CSRFToken": csrftoken,
			},
			body: JSON.stringify({
				action: "rewindConsent",
				consentLevel: String(consentLevel),
				playerNumber: global.pov,
				gameID: global.gameID,
			}),
		})
			.then((response) => response.json())
			.then((result) => {
				// Prepend actions. // Close consent
				$("#dropdown").fadeOut(400)
				if (result.newPermission == 1) {
					$("#checkOnce").attr("disabled", true)
					$("#checkPermanent").attr("disabled", false)
					$("#checkOnce").attr("checked", true)
					$("#checkPermanent").attr("checked", false)
				} else if (result.newPermission == 2) {
					$("#checkOnce").attr("disabled", true)
					$("#checkPermanent").attr("disabled", true)
					$("#checkOnce").attr("checked", false)
					$("#checkPermanent").attr("checked", true)
					$("#submitRewindConsent").hide()
				}
				$("#actions").prepend("<p><b>" + gettext("Permission Changed") + "</b></p>")
			})
			.catch((error) => {
				console.log("Error:", error)
			})*/
	},

	castVote: async function (topic, choice) {
		showLoader()
		let csrftoken = getCookie("csrftoken")

		let postData = {
			action: "castVote", // USED
			topic: topic, // USED
			gameID: global.gameID, // USED
			choice: choice,
		}

		try {
			const response = await fetch("/HLC/castVote/", {
				method: "POST",
				body: JSON.stringify(postData),
				headers: { "X-CSRFToken": csrftoken },
			})
			if (!response.ok) {
				if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
				throw new Error("Network response was not ok")
			}
			const data = await response.json()

			hideLoader()
			if (data.voteChanged === true) {
				if (topic === REWIND_CONSENT_VOTE_TOPIC) {
					$("#dropdown").hide()
					$("#actions").prepend("<p><b>" + gettext("Permission Changed") + "</b></p>")
					if (choice == 1) {
						$("#checkOnce").attr("disabled", true)
						$("#checkPermanent").attr("disabled", false)
						$("#checkOnce").attr("checked", true)
						$("#checkPermanent").attr("checked", false)
					} else if (choice == 2) {
						$("#checkOnce").attr("disabled", true)
						$("#checkPermanent").attr("disabled", true)
						$("#checkOnce").attr("checked", false)
						$("#checkPermanent").attr("checked", true)
						$("#submitRewindConsent").hide()
					}
				} else if (topic === DELETE_VOTE_TOPIC) {
					$("#actions").prepend("<B>" + gettext("Vote Saved") + "<B>")

					global.votedToDelete = true
					global.deleteVotesData = JSON.parse(data.votesData)
					$("#deleteDiv").html("<hr/>Refresh page to view votes")
					if (data.redirect_url) window.location.href = data.redirect_url
				} else if (topic === STATS_EXCLUDE_VOTE_TOPIC) {
					$("#actions").prepend("<B>" + gettext("Vote Saved") + "<B>")
					global.votedToExclude = true
					global.excludeVotesData = JSON.parse(data.votesData)
					$("#excludeDiv").html("<hr/>Refresh page to view votes")
				}
			} else if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
		} catch (error) {
			console.error("Error fetching data:", error)
			if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
			return false
		}
	},

	/*saveZoom: function (zoomLevel) {
		var csrftoken = getCookie("csrftoken")

		fetch("/FCM/changeAssistance/", {
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=UTF-8",
				"X-CSRFToken": csrftoken,
			},
			body: JSON.stringify({
				action: "zoom",
				zoomLevel: String(zoomLevel),
				playerNumber: global.pov,
				allPlayers: M.trainingGame,
				gameID: global.gameID,
			}),
		})
	},*/

	htmlEscapeGB: function (value) {
		return String(value)
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/=-NEWLINE-=/g, "\n")
	},
}

function htmlEscape(str) {
	return String(str)
		.replace(/(?:\r|\n|\r\n)/g, "=-NEWLINE-=")
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\\/g, "&#92;")
}

function htmlUnescape(value) {
	return String(value)
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/=-NEWLINE-=/g, "\n")
		.replace(/&#92;/g, "\\")
}

if (!String.prototype.hasOwnProperty("addSlashes")) {
	String.prototype.addSlashes = function () {
		return this.replace(/&/g, "&amp;") /* This MUST be the 1st replacement. */
			.replace(/'/g, "&apos;") /* The 4 other predefined entities, required. */
			.replace(/"/g, "&quot;")
			.replace(/\\/g, "\\\\")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\u0000/g, "\\0")
	}
}

function strip(html) {
	let doc = new DOMParser().parseFromString(html, "text/html")
	return doc.body.textContent || ""
}
