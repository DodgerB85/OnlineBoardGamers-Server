// LBR (Land Between Rivers) create page. Shared plumbing lives in createGamePage.js.

function initGameCreation(fillData, setupData = {}) {
	if (global.experienced) document.getElementById("experiencedGame").disabled = false

	selectPlayers()

	if (fillData) {
		document.getElementById("name").value = setupData.gameName
		document.getElementById("description").value = setupData.gameDescription
		document.getElementById("pace").value = setupData.gamePace
		if (document.getElementById("pace").value == "") document.getElementById("pace").selectedIndex = "2"
		validateOptions("pace")
		document.getElementById("playerNumber").value = setupData.playerNumber
		selectPlayers()

		for (var i = 0; i < setupData.playerNames.length; i++) {
			document.getElementById("player" + String(i + 2)).value = setupData.playerNames[i]
		}

		document.getElementById("kickoutDuration").value = setupData.kickoutDuration
		if (document.getElementById("kickoutDuration").value == "") document.getElementById("kickoutDuration").selectedIndex = "0"

		var startingOptions = setupData.startingOptions
		if (startingOptions.includes(102)) {
			document.getElementById("trainingGame").checked = true
			validateOptions("trainingGame")
		}
		if (startingOptions.includes(110)) document.getElementById("learningGame").checked = true
		if (startingOptions.includes(120)) document.getElementById("experiencedGame").checked = true
	}
}

function validateOptions(change) {
	if (change == "pace") {
		setKickoutOptions()
		if (document.getElementById("pace").value != 10) {
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
		}
	} else if (GAME_TYPE_OPTIONS.indexOf(change) !== -1) {
		validateGameType(change)
	}
}

function selectPlayers() {
	showSeats()
	syncAiSeats()
}

// Per-seat AI toggles: one is shown per seat in use, and a username field is
// disabled (ignored by the server) when its seat is AI. Practice games are
// hotseat shadows, so the toggles are switched off there.
function syncAiSeats() {
	var maxPlayers = parseInt(document.getElementById("playerNumber").value)
	var practice = document.getElementById("trainingGame").checked
	for (var seat = 1; seat <= 4; seat++) {
		var box = document.getElementById("ai" + seat)
		var row = document.getElementById("aiSeat" + seat + "Row")
		if (!box || !row) continue
		row.style.display = seat <= maxPlayers ? "flex" : "none"
		box.disabled = practice
		if (practice) box.checked = false
		var input = document.getElementById("player" + seat)
		if (input) {
			input.disabled = box.checked
			input.style.opacity = box.checked ? 0.5 : 1
		}
	}
}
