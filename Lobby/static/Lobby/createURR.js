// No text

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

		// Restores the shadow names a rematch of a practice game will use.
		selectPlayers()
	}
}

function validateOptions(change) {
	if (change === "pace") return setKickoutOptions()
	if (change === "privateGame") return

	var checked = document.getElementById(change).checked

	GAME_TYPE_OPTIONS.forEach(function (option) {
		if (option === change) return
		if (checked) removeOption(option)
		else addOption(option)
	})

	// A practice game has nobody to invite, so it cannot also be private.
	if (change === "trainingGame") {
		if (checked) removeOption("privateGame")
		else addOption("privateGame")
		// Either way the seats must not still hold shadow placeholders or the
		// real usernames a previous setup left behind.
		clearSeatNames()
	} else if (checked) {
		// Learning and experienced games need real usernames, not shadows.
		clearShadowNames()
	}

	selectPlayers()
}

function clearShadowNames() {
	for (var i = 2; i <= 6; i++) {
		var input = document.getElementById("player" + i)
		if (input && SHADOW_NAMES.indexOf(input.value) !== -1) input.value = ""
	}
}

function selectPlayers() {
	showSeats()
}

