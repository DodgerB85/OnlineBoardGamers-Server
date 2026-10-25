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

		var startingOptions = setupData.startingOptions.split(/,/)

		//if (startingOptions.includes("5")) document.getElementById("allowSurrender").checked = true;
		if (startingOptions.includes("102")) {
			document.getElementById("trainingGame").checked = true
			validateOptions("trainingGame")
		}
	}
}

function validateGameOptions(_checkboxID) {
	let checkbox = document.getElementById(_checkboxID)
	let radios = document.querySelectorAll('input[name="vehicleLimitRadio"]')
	//if (_checkboxID === "addTableJunk") radios = document.querySelectorAll('input[name="tableJunkRadio"]');

	if (checkbox.checked) {
		radios.forEach(function (radio) {
			radio.disabled = false
		})
		document.getElementById("increaseMainlines").disabled = false
		document.getElementById("increaseMainlines").checked = false
		if (_checkboxID === "limitVehicles") document.getElementById("vehicleLimitRadio1").checked = true
		//else if (_checkboxID === "addTableJunk") document.getElementById("tableJunkRadio2").checked = true;
	} else {
		radios.forEach(function (radio) {
			radio.disabled = true
			radio.checked = false
		})
		document.getElementById("increaseMainlines").disabled = true
		document.getElementById("increaseMainlines").checked = false
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
		validateGameType(change)
	}
}

function selectPlayers() {
	showSeats()
}

