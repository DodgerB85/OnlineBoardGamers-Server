/* On Kickout phase: 
	0: insert dummy factory?
	1 - res: skip player / move to next phase
	2 - focus: skip player / move to next phase


Bot Actions:
	SET_FOCUS: Force all bots into last positions
	FACTORY_BUILD: Make sure all bots at end, pass
	SELL: Add sell skip for bot players
*/
var Bot = (function () {
	var self = {}
	var BOT = "__$$BOT==__"
	var BOT_NAME = "HcBot"

	self.correctTurnOrderForBots = function (model) {
		// in sell, bots are passed in order
		if (model.gameFlow.phase === PHASE_SELL) return

		var i = 0

		if (model.gameFlow.phase !== PHASE_BUILD_FACTORY) {
			var botIndexes = []
			for (i = model.gameFlow.unalteredTurnOrder.length - 1; i >= 0; i--) {
				if (model.players[model.gameFlow.unalteredTurnOrder[i]].autoplay === true) botIndexes.push(i)
			}
			// Now bot indexes is reverse order of bots, so extract them
			var botPlayers = []
			for (i = 0; i < botIndexes.length; i++) {
				botPlayers.push(model.gameFlow.unalteredTurnOrder.splice(botIndexes[i], 1)[0])
			}
			// Now add them to start of turn order
			for (i = 0; i < botPlayers.length; i++) {
				model.gameFlow.unalteredTurnOrder.unshift(botPlayers[i])
			}
			// Now skip them from turn order
			model.gameFlow.turnOrder = [...model.gameFlow.unalteredTurnOrder]
			for (i = 0; i < model.gameFlow.turnOrder.length; i++) {
				if (model.players[model.gameFlow.turnOrder[0]].autoplay === true) model.gameFlow.turnOrder.shift()
			}
		} else {
			// Remove any bots at start of factory lists
			while (model.players[model.gameFlow.turnOrder[0]].name === "HcBot") {
				model.gameFlow.turnOrder.shift()
			}
		}
	}

	self.actionPlayerKickout = function (event) {
		var playerToKickName = event.data.playerToKickName
		const playerToKickIndex = M.players.findIndex((object) => {
			return object.name === playerToKickName
		})
		if (global.kickoutRequired === 2) {
			global.kickoutRequired = 0
			var i = 0
			var bot = BOT
			var nextPlayersArr = []
			var skipTheRest = false

			var playerToKickObject = M.players[playerToKickIndex]

			// Action the kick in game
			M.log(Log.KICKOUT, [playerToKickObject.name])

			playerToKickObject.name = BOT_NAME
			playerToKickObject.autoplay = true
			if (playerToKickObject.money > 0) playerToKickObject.money *= -1
			else playerToKickObject.money = -1
			playerToKickObject.gantt = -1

			// Update global.currentPlayers to replace the kickout name with HcBot
			// WHY???????
			if (global.currentPlayers !== undefined) {
				let idx = global.currentPlayers.indexOf(playerToKickName)
				if (idx > -1) {
					global.currentPlayers.splice(idx, 1)
				}
			}
			nextPlayersArr = global.currentPlayers

			// Count non players and end game if only 1 left
			var nbNonPlayers = 0
			_.each(M.players, function (p) {
				if (p.autoplay == true) {
					nbNonPlayers++
				}
			})

			if (nbNonPlayers >= M.players.length - 1) {
				M.gameFlow.phase = PHASE_GAME_END_CHECK

				M.gameEnded = 3

				// Find winner. Sort players by sakes focus, then move highgest money to front
				M.gameFlow.turnOrder = [...M.gameFlow.unalteredTurnOrder]
				var moneyInSalesOrder = []
				for (i = 0; i < M.gameFlow.turnOrder.length; i++) {
					moneyInSalesOrder.push([M.gameFlow.turnOrder[i], M.players[M.gameFlow.turnOrder[i]].money])
				}
				moneyInSalesOrder.sort(function (a, b) {
					return b[1] - a[1]
				})

				for (i = 0; i < M.players.length; i++) {
					M.gameFlow.unalteredTurnOrder[i] = moneyInSalesOrder[i][0]
					M.gameFlow.turnOrder[i] = moneyInSalesOrder[i][0]
				}

				M.log(Log.GAME_END, [M.players[M.gameFlow.unalteredTurnOrder[0]].name, M.gameEnded])
				global.winner = M.players[M.gameFlow.unalteredTurnOrder[0]].name

				IO.saveGameDataFromKickout(M, nextPlayersArr, playerToKickName)
				V.render(-1)
				return
			}

			if (!M.gameFlow.turn === 0) {
				C.endPlayerTurn()
				IO.saveGame(M)
			} else {
				/*if (!Rules.isSimulPhase()) this.model.gameFlow.turnOrder.splice(0, 1);
				else if (this.model.gameFlow.turn === 0) {
					var index = this.model.gameFlow.turnOrder.indexOf(global.pov);
					this.model.gameFlow.turnOrder.splice(index, 1);
				}
				if (this.model.gameFlow.turnOrder.length > 0) {
					this.model.gameFlow.currentPlayer = this.model.gameFlow.turnOrder[0];
					if (MARKET_BOARD_PHASES.includes(this.model.gameFlow.phase)) V.render(-1);
					//else V.render(this.model.gameFlow.turnOrder[0]);*/
				/*if (M.trainingGame) this.startActions();
				}*/
				IO.saveGameDataFromKickout(M, nextPlayersArr, playerToKickName)
				//IO.saveTurnZeroMove(M, playerToKickIndex);
			}
			// Wait for save, then move on
		} // end global.kickoutRequired
	}

	self.actionResign = function (model, playerNumber) {
		var idx = 0
		var player = model.players[playerNumber]
		var resignName = player.name
		model.log(Log.RESIGN, [resignName])
		player.name = BOT_NAME
		player.autoplay = true

		if (player.money > 0) player.money *= -1
		else player.money = -1
		player.gantt = -1

		var i = 0
		var bot = BOT
		var nextPlayer = ""

		// Update global.currentPlayers to replace the kickout name with HcBot
		// WHY???????
		if (global.currentPlayers != undefined) {
			idx = global.currentPlayers.indexOf(resignName)
			if (idx > -1) {
					global.currentPlayers.splice(idx, 1)
				}
		}
		//nextPlayer = global.currentPlayers;

		// Count non players and end game if only 1 left
		var nbNonPlayers = 0
		_.each(M.players, function (p) {
			if (p.autoplay == true) {
				nbNonPlayers++
			}
		})

		if (nbNonPlayers >= M.players.length - 1) {
			M.gameFlow.phase = PHASE_GAME_END_CHECK

			M.gameEnded = 3

			// Find winner. Sort players by sakes focus, then move highgest money to front
			M.gameFlow.turnOrder = [...M.gameFlow.unalteredTurnOrder]
			var moneyInSalesOrder = []
			for (i = 0; i < M.gameFlow.turnOrder.length; i++) {
				moneyInSalesOrder.push([M.gameFlow.turnOrder[i], M.players[M.gameFlow.turnOrder[i]].money])
			}
			moneyInSalesOrder.sort(function (a, b) {
				return b[1] - a[1]
			})

			for (i = 0; i < M.players.length; i++) {
				M.gameFlow.unalteredTurnOrder[i] = moneyInSalesOrder[i][0]
				M.gameFlow.turnOrder[i] = moneyInSalesOrder[i][0]
			}

			M.log(Log.GAME_END, [M.players[M.gameFlow.unalteredTurnOrder[0]].name, M.gameEnded])
			global.winner = M.players[M.gameFlow.unalteredTurnOrder[0]].name

			IO.saveGame(M)
			V.render(-1)
			return
		} else C.endPlayerTurn()

		return true
	}

	return self
})()
