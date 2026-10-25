// No text

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
		if (startingOptions.includes(1)) {
			document.getElementById("useMerchants").checked = true
		}
		// The Farmers checkbox is only rendered for admin and DodgerB.
		if (startingOptions.includes(3) && document.getElementById("useFarmers")) {
			document.getElementById("useFarmers").checked = true
		}
		if (startingOptions.includes(2)) {
			document.getElementById("useAllPromos").checked = true
		}
		if (startingOptions.includes(7)) {
			document.getElementById("hiddenInfoLevelLow").checked = true
		}
		if (startingOptions.includes(8)) {
			document.getElementById("hiddenInfoLevelMedMinus").checked = true
		}
				if (startingOptions.includes(5)) {
			document.getElementById("hiddenInfoLevelMedPlus").checked = true
		}
		if (startingOptions.includes(9)) {
			document.getElementById("hiddenInfoLevelHiPlus").checked = true
		}
		if (startingOptions.includes(6)) {
			document.getElementById("hiddenInfoLevelHiMinus").checked = true
		}
	}
}

// Kickout choices per pace come from Lobby/kickoutOptions.html so the labels stay translated.
// The hidden-information options only belong to a normal game.
var HIDDEN_INFO_OPTIONS = ["hiddenInfoLevelHiPlus", "hiddenInfoLevelHiMinus", "hiddenInfoLevelMedPlus", "hiddenInfoLevelMedMinus", "hiddenInfoLevelLow"]

function validateOptions(change) {
	if (change == "pace") {
		setKickoutOptions()
		// Unlock from 2p
		if (document.getElementById("pace").value != 10) {
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
		}
	} else if (GAME_TYPE_OPTIONS.indexOf(change) !== -1) {
		validateGameType(change, HIDDEN_INFO_OPTIONS)
		// A normal game starts on the highest hidden-information level.
		if (change === "trainingGame" && !document.getElementById(change).checked) document.getElementById("hiddenInfoLevelHiPlus").checked = true
	}
}

function selectPlayers() {
	showSeats()
}

