// Eclipse creation page: keep the per-game bits only.
var OPTION_NAMES = {
	1: "rift_cannon",
	2: "turn_order_variant",
	3: "galactic_event_tiles",
	4: "hyperlanes",
	5: "community_parts",
	6: "community_rep_mod",
	7: "ban_factions",
	8: "alliances",
	9: "community_factions"
}

function selectPlayers() {
	var maxPlayers = parseInt(document.getElementById("playerNumber").value)
	for (var i = 2; i <= 9; i++) {
		var input = document.getElementById("player" + i)
		var row = document.getElementById("selPlayer" + i)
		if (!input || !row) continue
		var inUse = i <= maxPlayers
		row.style.display = inUse ? "flex" : "none"
		if (!inUse) input.value = ""
	}
}

function initGameCreation(fillData, setupData = {}) {
	selectPlayers()
	if (!fillData) return

	document.getElementById("name").value = setupData.gameName
	document.getElementById("description").value = setupData.gameDescription
	document.getElementById("pace").value = setupData.gamePace
	if (document.getElementById("pace").value == "") document.getElementById("pace").selectedIndex = "2"
	document.getElementById("playerNumber").value = setupData.playerNumber
	selectPlayers()

	for (var i = 0; i < setupData.playerNames.length; i++) {
		document.getElementById("player" + String(i + 2)).value = setupData.playerNames[i]
	}
	for (var key in setupData.startingOptions) {
		var option = setupData.startingOptions[key]
		var checkbox = document.querySelector('input[name="' + OPTION_NAMES[option] + '"]')
		if (checkbox) checkbox.checked = true
	}
}
