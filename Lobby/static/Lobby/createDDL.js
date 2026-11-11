// Duck Dealer create page. The shared plumbing lives in Lobby/createGamePage.js.

// A game is either practice, learning or experienced, never a mixture.
// Kickout choices per pace come from Lobby/kickoutOptions.html so the labels stay translated.
function initGameCreation(fillData, setupData = {}) {
	if (global.experienced) document.getElementById("experiencedGame").disabled = false

	selectPlayers()

	if (fillData) {
		document.getElementById("name").value = setupData.gameName
		document.getElementById("description").value = setupData.gameDescription
		document.getElementById("pace").value = setupData.gamePace
		if (document.getElementById("pace").value == "") document.getElementById("pace").selectedIndex = 2
		setKickoutOptions()
		document.getElementById("playerNumber").value = setupData.playerNumber

		for (var i = 0; i < setupData.playerNames.length; i++) {
			document.getElementById("player" + String(i + 2)).value = setupData.playerNames[i]
		}

		document.getElementById("kickoutDuration").value = setupData.kickoutDuration
		if (document.getElementById("kickoutDuration").value == "") document.getElementById("kickoutDuration").selectedIndex = 0

		var startingOptions = setupData.startingOptions

		if (startingOptions.includes(102)) document.getElementById("trainingGame").checked = true
		if (startingOptions.includes(110)) document.getElementById("learningGame").checked = true
		if (startingOptions.includes(120)) document.getElementById("experiencedGame").checked = true
		if (startingOptions.includes(1)) document.getElementById("startingOptionAuction").checked = true

		// Restores the shadow names a rematch of a practice game will use.
		selectPlayers()
	}
}

function validateOptions(change) {
	if (change === "pace") return setKickoutOptions()
	if (change === "privateGame") return

	var checked = document.getElementById(change).checked

	if (change === "trainingGame") {
		["privateGame", "learningGame", "experiencedGame", "startingOptionAuction"].forEach(function (option) {
			checked ? removeOption(option) : addOption(option)
		})
		clearSeatNames()
	} else if (change === "learningGame") {
		checked ? removeOption("trainingGame") : addOption("trainingGame")
		checked ? removeOption("experiencedGame") : addOption("experiencedGame")
		if (checked) clearShadowNames()
	} else if (change === "experiencedGame") {
		checked ? removeOption("trainingGame") : addOption("trainingGame")
		checked ? removeOption("learningGame") : addOption("learningGame")
		if (checked) clearShadowNames()
	}

	selectPlayers()
}

function clearShadowNames() {
	for (var i = 2; i <= 5; i++) {
		var input = document.getElementById("player" + i)
		if (input && SHADOW_NAMES.indexOf(input.value) !== -1) input.value = ""
	}
}

function selectPlayers() {
	showSeats()
}
