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
			document.getElementById("keepMoneyHidden").checked = true
			//validateOptions("useExpansion");
		}
	}
}

// Kickout choices per pace come from Lobby/kickoutOptions.html so the labels stay translated.
function validateOptions(change) {
	if (change == "pace") {
		setKickoutOptions()
		// Unlock from 2p
		if (document.getElementById("pace").value != 10) {
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
		}
	} else if (GAME_TYPE_OPTIONS.indexOf(change) !== -1) {
		validateGameType(change, ["keepMoneyHidden"])
	}
}

function validateGameOptions(change) {
	// MAP OPTIONS
	if (change === "useAegeanMap") {
		if (document.getElementById("useAegeanMap").checked == true) {
			document.getElementById("usePHPmap").checked = false
			document.getElementById("useMergerSubsidy").checked = false
			document.getElementById("useMergerSubsidy").disabled = true
			document.getElementById("useShippingSubsidy").checked = false
			document.getElementById("useShippingSubsidy").disabled = true
		} else {
			//
		}
	} else if (change === "usePHPmap") {
		if (document.getElementById("usePHPmap").checked == true) {
			document.getElementById("useAegeanMap").checked = false
			document.getElementById("useMergerSubsidy").checked = false
			document.getElementById("useMergerSubsidy").disabled = false
			document.getElementById("useShippingSubsidy").checked = false
			document.getElementById("useShippingSubsidy").disabled = false
		} else {
			document.getElementById("useMergerSubsidy").checked = false
			document.getElementById("useMergerSubsidy").disabled = true
			document.getElementById("useShippingSubsidy").checked = false
			document.getElementById("useShippingSubsidy").disabled = true
		}
	}
}

function selectPlayers() {
	showSeats()
}

