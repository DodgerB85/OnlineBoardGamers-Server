// NTR (Napoleon's Triumph) create page. Shared plumbing lives in createGamePage.js.

function initGameCreation(fillData, setupData = {}) {
	if (global.experienced) document.getElementById("experiencedGame").disabled = false

	if (global.MT_Creation) {
		global.invitedPlayersArr = []
		autocomplete(document.getElementById("playerToInviteMT"))
		document.getElementById("invitePlayerMTbutton").addEventListener("click", invitePlayerMT)
		return
	}

	selectPlayers()

	if (fillData) {
		document.getElementById("name").value = setupData.gameName
		document.getElementById("description").value = setupData.gameDescription
		document.getElementById("pace").value = setupData.gamePace
		if (document.getElementById("pace").value == "") document.getElementById("pace").selectedIndex = "2"
		validateOptions("pace")

		document.getElementById("kickoutDuration").value = setupData.kickoutDuration
		if (document.getElementById("kickoutDuration").value == "") document.getElementById("kickoutDuration").selectedIndex = "0"

		// Check the options before the player count: team play and practice decide it.
		var startingOptions = setupData.startingOptions
		for (var j = 0; j < startingOptions.length; j++) {
			var element = document.getElementById(getOptionId(startingOptions[j]))
			if (element) element.checked = true
		}

		document.getElementById("playerNumber").value = setupData.playerNumber
		selectPlayers()

		for (var i = 0; i < setupData.playerNames.length; i++) {
			document.getElementById("player" + String(i + 2)).value = setupData.playerNames[i]
		}
	}
}

function getOptionId(optionValue) {
	var mapping = {
		1: "scenario1",
		2: "scenario2",
		10: "frenchReinforcements",
		11: "santonFort",
		12: "teamPlay",
		102: "trainingGame",
		110: "learningGame",
		120: "experiencedGame",
	}
	return mapping[optionValue] || ""
}

function validateOptions(change) {
	if (change == "pace") {
		setKickoutOptions()
		selectPlayers()
	} else if (GAME_TYPE_OPTIONS.indexOf(change) !== -1) {
		// Practice is one human against one bot, so it cannot be a team game.
		validateGameType(change, ["teamPlay"])
	} else if (change == "teamPlay") {
		if (!document.getElementById("teamPlay").checked) document.getElementById("playerNumber").value = "2"
		selectPlayers()
	}
}

// Choosing 4 or 8 players means team play.
function playerNumberChanged() {
	if (parseInt(document.getElementById("playerNumber").value) > 2) document.getElementById("teamPlay").checked = true
	selectPlayers()
}

function selectPlayers() {
	var playerNumber = document.getElementById("playerNumber")
	var practice = document.getElementById("trainingGame").checked
	var learning = document.getElementById("learningGame").checked
	if (practice) {
		playerNumber.value = "2"
		playerNumber.disabled = true
	} else if (learning) {
		playerNumber.disabled = true
	} else {
		playerNumber.disabled = false
	}

	var maxPlayers = parseInt(playerNumber.value)
	for (var i = 2; i <= 8; i++) {
		var row = document.getElementById("selPlayer" + i)
		var input = document.getElementById("player" + i)
		if (row) row.style.display = i <= maxPlayers ? "flex" : "none"
		if (input && i > maxPlayers) input.value = ""
	}
	document.getElementById("player2help").innerHTML = practice ? "<span style='background-color: yellow; color: darkred;'>" + global.player2practiceText + "</span>" : global.player2normText
}
