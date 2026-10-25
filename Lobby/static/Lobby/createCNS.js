// No text

function initGameCreation(fillData, setupData = {}) {
    if (global.experienced) document.getElementById("experiencedGame").disabled = false;

    if (global.MT_Creation) {
        global.invitedPlayersArr = [];
        autocomplete(document.getElementById("playerToInviteMT"));
        document.getElementById("invitePlayerMTbutton").addEventListener("click", invitePlayerMT);
        return;
    }

    selectPlayers();

    if (fillData) {
        document.getElementById("name").value = setupData.gameName;
        document.getElementById("description").value = setupData.gameDescription;
        document.getElementById("pace").value = setupData.gamePace;
        if (document.getElementById("pace").value == "") document.getElementById("pace").selectedIndex = "2";
        validateOptions("pace");
        document.getElementById("playerNumber").value = setupData.playerNumber;
        selectPlayers();

        for (var i = 0; i < setupData.playerNames.length; i++) {
            document.getElementById("player" + String(i + 2)).value = setupData.playerNames[i];
        }

        document.getElementById("kickoutDuration").value = setupData.kickoutDuration;
        if (document.getElementById("kickoutDuration").value == "") document.getElementById("kickoutDuration").selectedIndex = "0";

        var startingOptions = setupData.startingOptions;

        if (startingOptions.includes(102)) {
            document.getElementById("trainingGame").checked = true;
            validateOptions("trainingGame");
        }
        if (startingOptions.includes(1)) {
            document.getElementById("useExpansion").checked = true;
            //validateOptions("useExpansion");
        }
        if (startingOptions.includes(10) || startingOptions.includes(11) || startingOptions.includes(12)) {
            let tableSize = 10
            if (startingOptions.includes(11)) tableSize = 11
            else if (startingOptions.includes(12)) tableSize = 12
            let checkbox = document.getElementById("limitTableSize");
            let radios = document.querySelectorAll('input[name="tableSizeRadio"]');
            checkbox.checked = true
            radios.forEach(function (radio) {
                radio.disabled = false;
            });
            document.getElementById("tableSizeRadio" + String(tableSize - 9)).checked = true;
        }
        if (startingOptions.includes(20) || startingOptions.includes(21) || startingOptions.includes(22)) {
            let tableJunk = 20
            if (startingOptions.includes(21)) tableJunk = 11
            else if (startingOptions.includes(22)) tableJunk = 12
            let checkbox = document.getElementById("addTableJunk");
            let radios = document.querySelectorAll('input[name="tableJunkRadio"]');
            checkbox.checked = true
            radios.forEach(function (radio) {
                radio.disabled = false;
            });
            document.getElementById("tableJunkRadio" + String(tableJunk - 19)).checked = true;
        }
    }
}




// Kickout choices per pace come from Lobby/kickoutOptions.html so the labels stay translated.
function validateOptions(change) {
    if (change == "pace") {
        setKickoutOptions();
        // Unlock from 2p
        if (document.getElementById('pace').value != 10) {
            document.getElementById('playerNumber').disabled = false;
            selectPlayers();
        }
    }

    else if (GAME_TYPE_OPTIONS.indexOf(change) !== -1) {
        validateGameType(change);
    }
}


function validateGameOptions(_checkboxID) {
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
}

function selectPlayers() {
    showSeats();
}


