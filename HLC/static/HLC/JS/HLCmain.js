/* exported imagePreURL */
var imagePreURL = "/static/HLC/images/"
/* exported soundPreURL */
var soundPreURL = "/static/HLC/Sound/"

function init() {
	//var M;
	// global.debug = true;
	// global.superuser = true;
	// Used in history to only store time difference from game start
	if (global.now != undefined && global.now > 0) {
		IO.timeOffset = new Date().getTime() - global.now
	}

	if (global.notes != undefined && global.notes != "") $("#menuButtonNotes").addClass("notesAvailable")

	$("#submitRewindConsent").on("click", IO.submitRewindConsent)

	if (global.load != undefined) {
		var loadData = decompressObjectFromDB(global.load)
		M = Model.import(loadData)
		//if (!global.HLCgameSummary) Log.refreshHistory(M)

		///////////////////

		//M.players[1].money = 200;
		/*M.players[0].gantt = 2;
        M.players[1].gantt = 2;
        M.players[2].gantt = 1;
        M.gameFlow.turn = 1;
        M.gameFlow.phase = 1;*/
		//////////////////
	} else {
		M = new Model()
		M.start({ players: global.players })

		if (global.players.includes(global.name)) IO.saveGame(M)
	}

	if (global.HLCgameSummary) {
		initHLCgameSummary()
		return
	}
	/********************************************* */
	// M.trainingGame = true;

	/*********************************** */

	// Training Game
	if (M.trainingGame && global.players.includes(global.name)) {
		global.superuser = true
	}
	V = new View(M)

	C = new Controller(M, V)

	if (global.load != undefined && !global.HLCgameSummary) Log.refreshHistory(M)

	if (global.liveWS) {
		$(".live").show()
		IO.init(C)
		StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	}

	// Check for no current player here
	if (global.currentPlayers === undefined || global.currentPlayers.length === 0) {
		// If it is factory build phase, with no one to move, it means the last player disconnected
		// So run the code in IO again here. This should save it and move the game on
		if (M.gameFlow.phase === PHASE_BUILD_FACTORY) {
			delete global.fullreset
			M = C.moveToNextPhase()
			IO.saveGame(M)
			C.startActions()
		} else {
			IO.sendDiscordWebhook(`HLC GameID ${global.gameID} - No current player detected: ${global.currentPlayers}`)
			alert("ERROR: No current player\nContact admin on Discord or Email")
		}
	}

	if (M.gameFlow.turn === 0 && global.move != undefined) {
		M.players[global.pov].factory = Factory.import(decompressObjectFromDB(global.move.content))
	}
	if (M.gameFlow.phase === PHASE_BUILD_FACTORY && global.move != undefined) {
		var moveData = decompressObjectFromDB(global.move.content)
		var FDBE = moveData[0]
		var FCIATT = moveData[1]
		var FCNATT = moveData[2]
		var FAC_DATA_RAW = moveData[3]

		if (!Rules.canPlay()) {
			M.players[global.pov].factory = Factory.import(FAC_DATA_RAW)
		} else {
			M.players[global.pov].factory = Factory.import(FDBE)
		}

		M.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn = FCIATT

		global.fullreset = compressObjectToDB(M.export())
	}
	if (M.gameFlow.phase === PHASE_BUILD_FACTORY && global.temporaryMove != undefined) {
		if (global.temporaryMove.type === "NODATASFWET") {
			var temporaryMoveData = decompressObjectFromDB(global.temporaryMove.content)
			M.players[global.pov].factory = Factory.import(temporaryMoveData)
			Rules.removeFCIATTcomponentsFromPlay(M.players[global.pov].factory)
			global.fullreset = compressObjectToDB(M.export())
		}
	}

	// Rules checked in C.startActions. Also if can't play display info in C.startActions
	C.startActions()

	if (global.pov != undefined && global.pov >= 0) {
		global.votedToExclude = global.statsExcludeVotesData[global.name]
		global.votedToDelete = global.deleteVotesData[global.name]
		if (!global.tournamentGame && !M.trainingGame && M.gameFlow.phase !== PHASE_GAME_END_CHECK) {
			let dropdown = $("#dropdown")
			// Exclude stats
			let excludeDiv = $("<div id='excludeDiv'></div>")
			excludeDiv.append("<hr/>")
			excludeDiv.append(gettext("If all players agree, this game can be excluded from the stats<br/>(won't count towards wins/losses)"))
			excludeDiv.append("<br/>")
			let excludeVotes = 0
			for (const player in global.statsExcludeVotesData) {
				if (global.statsExcludeVotesData[player] === true) {
					excludeVotes += 1
				}
			}
			let excludePlayers = "None"
			for (const player in global.statsExcludeVotesData) {
				if (global.statsExcludeVotesData[player] === true) {
					if (excludePlayers === "None") excludePlayers = String(player)
					else excludePlayers += ", " + player
				}
			}
			excludeDiv.append("Votes: " + excludeVotes + " - Players: " + excludePlayers)
			excludeDiv.append("<br/>")
			if (!global.votedToExclude) excludeDiv.append(`<button class="actionsLineButton voteExcludeButton" onClick="IO.castVote('${STATS_EXCLUDE_VOTE_TOPIC}', true)">Vote to Exclude Game from Stats</button>`)
			dropdown.append(excludeDiv)
			// Delete game
			let deleteDiv = $("<div id='deleteDiv'></div>")
			deleteDiv.append("<hr/>")
			deleteDiv.append(gettext("If all players agree, this game will be deleted"))
			deleteDiv.append("<br/>")
			let votes = 0
			for (const player in global.deleteVotesData) {
				// Use const or let for player
				if (global.deleteVotesData[player] === true) {
					votes += 1
				}
			}
			let players = "None"
			for (const player in global.deleteVotesData) {
				// Use const or let for player
				if (global.deleteVotesData[player] === true) {
					if (players === "None") players = String(player)
					else players += ", " + player
				}
			}
			deleteDiv.append("Votes: " + votes + " - Players: " + players)
			deleteDiv.append("<br/>")
			if (!global.votedToDelete) deleteDiv.append(`<button class="actionsLineButton voteDeleteButton" onClick="IO.castVote('${DELETE_VOTE_TOPIC}', true)">Vote to Delete Game</button>`)
			dropdown.append(deleteDiv)
		}
	}

	V.render()
	V.refreshChat()
	if (global.chatNotification === true) {
		V.displayChat()
	}

	if (!global.debug && global.name !== "admin")
		$(document).on("contextmenu", function (e) {
			e.originalEvent.preventDefault()
			e.preventDefault()
			return false
		})

	if (global.name == undefined || global.name === "") {
		$("#actions").empty()
		$("#actions").html(gettext("Please <a href='/register'>REGISTER</a> or <a href='/login'>LOGIN</a> to play a game"))
		$("#actions").show()
	}

	$(document).keydown(function (event) {
		//if (event.altKey && event.which === 82)

		// r = rotate
		if (event.which === 82) {
			// DONT USE - STOPS WORKING IN CHAT / ETC!!!!
			//event.preventDefault();
			if (M.gameFlow.phase === PHASE_BUILD_FACTORY || PHASE_FACTORY_SETUP || M.sandboxMode) {
				if (!$("#bugContent").is(":focus") && !$("#chatMessage").is(":focus") && !$("#notes").is(":focus")) {
					V.rotateComponentR(M.players[global.pov].factory, true)
				}
			}
		}
		// del/backsp = remove last
		if (event.which === 8 || event.which === 46) {
			if (M.gameFlow.phase === PHASE_BUILD_FACTORY || PHASE_FACTORY_SETUP || M.sandboxMode) {
				if (!$("#bugContent").is(":focus") && !$("#chatMessage").is(":focus") && !$("#notes").is(":focus")) {
					C.clickedOnRemoveLastComponent(C.currentPlayer().factory)
				}
			}
		}
	})

	// CHECK FOR KICKOUT FIRSTLY HERE, checks every single time for global.kickout true
	// this is the only place to enter this function
	if (global.kickoutRequired > 0) {
		var currentPlayersArray = global.currentPlayers
		currentPlayersArray = currentPlayersArray.filter(function (a) {
			return a !== "HcBot"
		})
		var playerToKickName = currentPlayersArray[0]
		global.playerToKickName = playerToKickName

		$("#actions").empty()
		if (global.kickoutRequired === 1) {
			$("#actions").html(interpolate(gettext("Player <b>%(playerToKickName)s</b> has used all the standard kickout time."), { playerToKickName: playerToKickName }, true))
			$("#actions").append("<br/><br/>")
			$("#actions").append(gettext("Remaining Flex-Time:"))
			$("#actions").append(" ")
			$("#actions").append('<span id="flexiKickoutTimerSpan"></span><br/><br/>')
			$("#actions").append(gettext('For more information see <b><a href="/help/" target="_blank">Help</a></b>'))

			// Calculate remaining flexi-time
			let KickoutFlexiDataArray = global.KickoutFlexiDataArray
			let secondsIn24Hours = 24 * 60 * 60
			let playerSeconds = 0

			// Iterate over the KickoutFlexiDataArray to find the player's entry
			for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
				let entry = KickoutFlexiDataArray[i]

				// Check if the entry is a length-2 array and the first element matches the playerName
				if (Array.isArray(entry) && entry.length === 2 && entry[0] === playerToKickName) {
					playerSeconds = entry[1]
					break
				}
			}

			let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
			global.remainingFlexiSeconds = remainingFlexSecondsBeforeThisMove + global.secondsToNextKickout

			if (global.kickoutFlexiCountdownIntervalTimer != undefined) clearInterval(global.kickoutFlexiCountdownIntervalTimer)
			global.kickoutFlexiCountdownIntervalTimer = setInterval(V.kickoutFlexiTimeFunction, 1000)

			if (global.remainingFlexiSeconds < 0) global.remainingFlexiSeconds = 0
			let hoursToGo = String(Math.floor(global.remainingFlexiSeconds / 60 / 60))
			let minsToGo = String(Math.floor((global.remainingFlexiSeconds % 3600) / 60)).padStart(2, "0")
			let secsToGo = String(Math.floor(global.remainingFlexiSeconds % 60)).padStart(2, "0")

			$("#flexiKickoutTimerSpan").html(" " + hoursToGo + ":" + minsToGo + ":" + secsToGo)
		} else if (global.kickoutRequired === 2) {
			$("#actions").html(interpolate(gettext("Player <b>%(playerToKickName)s</b> has timed out<BR/>To kick out <B>%(playerToKickName)s</b> press Confirm Kickout<BR/>The game will proceed to the next player/phase/turn<BR/><BR/>Otherwise you can allow <b>%(playerToKickName)s</b> more time - reload the page to initiate kickout again<BR/>"), { playerToKickName: playerToKickName }, true))

			var cancelButtonSpan = $("<BR/><span><button class='actionsLineButton' id='cancelKickoutButton'>" + gettext("Not now - allow more time") + "</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>")
			var ConfirmButtonSpan = $("<span><button class='actionsLineButton' id='confirmKickoutButton'>" + gettext("Confirm Kickout") + "</button></span>")

			$("#actions").append(cancelButtonSpan)
			$("#actions").append(ConfirmButtonSpan)
			$("#cancelKickoutButton").on("click", function () {
				$("#actions").hide()
			})

			//ConfirmButtonSpan.on("click", { playerToKickName: playerToKickName }, Bot.actionPlayerKickout)
			ConfirmButtonSpan.on("click", function () {
				$("#actions").empty()
				$("#actions").html(interpolate(gettext("This will permanently remove <b>%(playerToKickName)s</b> from the game<br/><b>It cannot be undone</b><br/><br/>Try checking the chat in case they have given a reason for any temporary absence<br/>Please consider giving them a short grace period, in case they are just delayed<br/>"), { playerToKickName: playerToKickName }, true))

				var cancelButtonSpan = $("<BR/><span><button class='actionsLineButton' id='cancelKickoutButton'>" + gettext("Not now - allow more time") + "</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>")
				var ConfirmButtonSpan = $("<span><button class='actionsLineButton' id='confirmKickoutButton'>" + gettext("Confirm Kickout") + "</button></span>")

				$("#actions").append(cancelButtonSpan)
				$("#actions").append(ConfirmButtonSpan)
				$("#cancelKickoutButton").on("click", function () {
					$("#actions").hide()
				})

				ConfirmButtonSpan.on("click", { playerToKickName: global.playerToKickName }, Bot.actionPlayerKickout)
			})
		}
		$("#actions").show()
		V.renderKickoutCountdown()
	}

	$("#loggedInDiv").click(function () {
		if (global.name === "BotKickStarter") {
			global.superuser = true
			global.pov++
			if (global.pov === M.players.length) global.pov = 0

			//M.availableComponents[TIRE] = 0
			//IO.saveGame(M, true)

			V.render()
			C.startActions()
			$("#actions").prepend("P: " + String(global.pov) + " N: " + M.players[global.pov].name)

			/*M.players[2].name = "tlance8";
            IO.saveGame(M, true);*/

			/*  [M.gameFlow.turnOrder[0], M.gameFlow.turnOrder[1]] = [M.gameFlow.turnOrder[1], M.gameFlow.turnOrder[0]];
              [M.gameFlow.unalteredTurnOrder[0], M.gameFlow.unalteredTurnOrder[1]] = [M.gameFlow.unalteredTurnOrder[1], M.gameFlow.unalteredTurnOrder[0]];
              IO.saveGame(M);
             V.render();
             alert("Complete")*/
		}
	})

	if (global.name === "admin" || global.name === "BotKickStarter") {
		// Create the buttons
		let button1 = $("<button>").text("Raw Save")
		let button2 = $("<button>").text("Button 2")

		// Attach the buttons to the div with ID "zoomDiv"
		$("#zoomDiv").append(button1, button2)

		// Add onclick event handlers for the buttons
		button1.on("click", function () {
			IO.saveGame(M, true)
		})

		button2.on("click", function () {
			M.availableComponents[ENGINE]++
		})
	}
}

$(window).on("load", init)
