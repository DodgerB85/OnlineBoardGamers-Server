// No text
let boardTiles

function initGameCreation(fillData, setupData = {}) {
	if (global.experienced) document.getElementById("experiencedGame").disabled = false;

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

		// Check and enable map data if necessary
		if (setupData.startingMap != "") {
			document.getElementById("keepMapDiv").style.display = "block"
			// Don't auto select same map
			boardTiles = setupData.startingMap
			document.getElementById("mapData").value = ""
		}
	}
}

function setPlayersforMapData() {
	if (document.getElementById("mapData").value == "") return
	else {
		let boardTiles2 = JSON.parse(document.getElementById("mapData").value)
		if (boardTiles2.length === 4) document.getElementById("playerNumber").value = 2
		if (boardTiles2.length === 6) document.getElementById("playerNumber").value = 3
		if (boardTiles2.length === 8) document.getElementById("playerNumber").value = 4
		document.getElementById("playerNumber").disabled = true
		selectPlayers()
	}
}

// Kickout choices per pace come from Lobby/kickoutOptions.html so the labels stay translated.
function validateOptions(change) {
    if (change == "keepMap") {
        if (document.getElementById(change).checked == true) document.getElementById("mapData").value = boardTiles;
        else document.getElementById("mapData").value = "";
    }
	else if (change == "pace") {
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

/*function validateGameOptions(_checkboxID) {
    let checkbox = document.getElementById(_checkboxID);
    let radios = document.querySelectorAll('input[name="tableSizeRadio"]');
    if (_checkboxID === "addTableJunk") radios = document.querySelectorAll('input[name="tableJunkRadio"]');

    if (checkbox.checked) {
        radios.forEach(function (radio) {
            radio.disabled = false;
        });
        if (_checkboxID === "limitTableSize") document.getElementById("tableSizeRadio2").checked = true;
        else if (_checkboxID === "addTableJunk") document.getElementById("tableJunkRadio2").checked = true;
    } else {
        radios.forEach(function (radio) {
            radio.disabled = true;
            radio.checked = false;
        });
    }
}*/

function selectPlayers() {
	showSeats()
}

