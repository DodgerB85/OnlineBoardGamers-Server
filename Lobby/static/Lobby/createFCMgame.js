// No text
/* global global */

var boardTiles // needed in game creation

function initGameCreation(fillData, setupData = {}) {
	// Set experience
	if (global.experienced) document.getElementById("experiencedGame").disabled = false

	// Use buttons to toggle between views
	document.querySelector("#individualOptionsTab").addEventListener("click", () => show_Options("individualOptionsTab"))
	document.querySelector("#scenariosTab").addEventListener("click", () => show_Options("scenariosTab"))

	show_Options("individualOptionsTab")

	if (!global.MT_Creation) {
		autocomplete(document.getElementById("player2"))
		autocomplete(document.getElementById("player3"))
		autocomplete(document.getElementById("player4"))
		autocomplete(document.getElementById("player5"))
		autocomplete(document.getElementById("player6"))
	} else if (global.MT_Creation) {
		global.invitedPlayersArr = []
		autocomplete(document.getElementById("playerToInviteMT"))
		//document.getElementById("invitePlayerMTbutton").addEventListener("click", () => invitePlayerMT)
		document.getElementById("invitePlayerMTbutton").addEventListener("click", invitePlayerMT)
	}

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
		if (startingOptions.includes("101")) document.getElementById("strictPaydayFridge").checked = true
		if (startingOptions.includes("102")) {
			document.getElementById("trainingGame").checked = true
			validateOptions("trainingGame")
		}

		// Check and enable map data if necessary
		if (setupData.startingMap != "") {
			document.getElementById("keepMapDiv").style.display = "block"
			// Don't auto select same map
			/*document.getElementById("keepMap").checked = true;*/
			boardTiles = setupData.startingMap
			document.getElementById("mapData").value = ""
			//document.getElementById("mapData").value = boardTiles;
		}

		// Now fill in scenario / individual options
		if (setupData.scenarioUsed) {
			show_Options("scenariosTab")
			//document.querySelectorAll("input[value=" + setupData.scenarioName + "]").checked = true;
			var scenarioID = ""
			if (setupData.scenarioName === "[Cool Original]") scenarioID = "s_coolOriginal"
			if (setupData.scenarioName === "[New MS]") scenarioID = "s_newMS"
			if (setupData.scenarioName === "[First Coffee]") scenarioID = "s_firstCoffee"
			if (setupData.scenarioName === "[Korean City]") scenarioID = "s_koreanCity"
			if (setupData.scenarioName === "[Nightlife]") scenarioID = "s_nightlife"
			if (setupData.scenarioName === "[Sustenance]") scenarioID = "s_sustenance"
			if (setupData.scenarioName === "[Upmarket Area]") scenarioID = "s_upmarketArea"
			if (setupData.scenarioName === "[City Builder]") scenarioID = "s_cityBuilder"
			if (setupData.scenarioName === "[Asian Fusion]") scenarioID = "s_asianFusion"
			if (setupData.scenarioName === "[First Mover]") scenarioID = "s_firstMover"
			if (setupData.scenarioName === "[Overtime]") scenarioID = "s_overtime"
			if (setupData.scenarioName === "[Henri Lo]") scenarioID = "s_henriLo"
			document.getElementById(scenarioID).checked = true
			validateScenario(scenarioID)
		} else {
			show_Options("individualOptionsTab")

			// Basic options
			if (startingOptions.includes("1")) document.getElementById("short").checked = true
			if (startingOptions.includes("2")) document.getElementById("noMilestones").checked = true
			if (startingOptions.includes("3")) document.getElementById("noCeoMilestone").checked = true
			if (startingOptions.includes("6")) document.getElementById("noRadioMilestone").checked = true
			if (startingOptions.includes("8")) document.getElementById("hardChoices").checked = true

			// Ketchup options
			if (startingOptions.includes("21")) document.getElementById("newMilestones").checked = true
			if (startingOptions.includes("20")) document.getElementById("ketchupMilestone").checked = true
			if (startingOptions.includes("23")) document.getElementById("reservePrice").checked = true

			// Map / route options
			if (startingOptions.includes("18")) document.getElementById("newDistricts").checked = true
			validateOptions("newDistricts")
			if (startingOptions.includes("181")) document.getElementById("newDistrictsApp").checked = true
			if (startingOptions.includes("183")) document.getElementById("newDistrictsPark").checked = true
			if (startingOptions.includes("182")) document.getElementById("newDistrictsAll").checked = true
			if (startingOptions.includes("22")) document.getElementById("lobbyists").checked = true
			if (startingOptions.includes("19")) document.getElementById("coffee").checked = true

			// Food options
			if (startingOptions.includes("10")) document.getElementById("kimchi").checked = true
			if (startingOptions.includes("11")) document.getElementById("sushi").checked = true
			if (startingOptions.includes("12")) document.getElementById("noodles").checked = true
			if (startingOptions.includes("9")) document.getElementById("fryChefs").checked = true

			//Marketing options
			if (startingOptions.includes("15")) document.getElementById("massMarketers").checked = true
			if (startingOptions.includes("13")) document.getElementById("gourmet").checked = true
			if (startingOptions.includes("17")) document.getElementById("ruralMarketers").checked = true

			// Employee options
			if (startingOptions.includes("14")) document.getElementById("movieStars").checked = true
			if (startingOptions.includes("16")) document.getElementById("nightShift").checked = true
		}
	}
}

function show_Options(listType) {
	// Update Tab bar
	var tablinks = document.getElementsByClassName("tablinks")
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "")
	}

	document.getElementById(listType).classList.add("active")

	// Hide all games
	document.getElementById("individualOptionsView").style.display = "none"
	document.getElementById("scenarioOptionsView").style.display = "none"

	// clear all options
	var ele
	ele = document.getElementsByName("scenario")
	for (var i = 0; i < ele.length; i++) ele[i].checked = false
	ele = document.getElementsByClassName("individualOpt")
	for (let i = 0; i < ele.length; i++) {
		ele[i].checked = false
		ele[i].disabled = false
	}
	if (listType == "individualOptionsTab") {
		document.getElementById("newDistrictsApp").disabled = true
		document.getElementById("newDistrictsAll").disabled = true
		document.getElementById("newDistrictsPark").disabled = true
		document.getElementById("individualOptionsView").style.display = "inline-block"
	}
	if (listType == "scenariosTab") document.getElementById("scenarioOptionsView").style.display = "inline-block"
}

function validateScenario(scenario) {
	// clear all options
	var ele = document.getElementsByClassName("individualOpt")
	for (var i = 0; i < ele.length; i++) {
		ele[i].checked = false
		ele[i].disabled = false
	}
	//Now set up new options
	if (scenario == "s_coolOriginal") {
		// Do nothing!
	} else if (scenario == "s_newMS") {
		document.getElementById("newMilestones").checked = true
	} else if (scenario == "s_firstCoffee") {
		document.getElementById("coffee").checked = true
	} else if (scenario == "s_koreanCity") {
		// new dist, 1 app min, kimchi
		document.getElementById("newDistricts").checked = true
		document.getElementById("newDistrictsApp").checked = true
		document.getElementById("kimchi").checked = true
	} else if (scenario == "s_nightlife") {
		// New MS, NSM
		document.getElementById("newMilestones").checked = true
		document.getElementById("nightShift").checked = true
	} else if (scenario == "s_sustenance") {
		// coffee, fry chefs
		document.getElementById("coffee").checked = true
		document.getElementById("fryChefs").checked = true
	} else if (scenario == "s_upmarketArea") {
		// New MS, park tile, GFC, Sushi
		document.getElementById("newMilestones").checked = true
		document.getElementById("newDistrictsPark").checked = true
		document.getElementById("gourmet").checked = true
		document.getElementById("sushi").checked = true
	} else if (scenario == "s_cityBuilder") {
		// Lobbyist, New districts, rural marketeers
		document.getElementById("lobbyists").checked = true
		document.getElementById("newDistricts").checked = true
		document.getElementById("ruralMarketers").checked = true
	} else if (scenario == "s_asianFusion") {
		// sushi, kimchi, noodels, ketchup
		document.getElementById("sushi").checked = true
		document.getElementById("kimchi").checked = true
		document.getElementById("noodles").checked = true
		document.getElementById("ketchupMilestone").checked = true
	} else if (scenario == "s_firstMover") {
		// Hard choices, Ketchup, Movie stars, Lobbyists, Reserve prices
		document.getElementById("hardChoices").checked = true
		document.getElementById("ketchupMilestone").checked = true
		document.getElementById("movieStars").checked = true
		document.getElementById("lobbyists").checked = true
		document.getElementById("reservePrice").checked = true
	} else if (scenario == "s_overtime") {
		// NSM, MM, RM, New dist, Noodles, Res price
		document.getElementById("nightShift").checked = true
		document.getElementById("massMarketers").checked = true
		document.getElementById("ruralMarketers").checked = true
		document.getElementById("newDistricts").checked = true
		document.getElementById("noodles").checked = true
		document.getElementById("reservePrice").checked = true
	} else if (scenario == "s_henriLo") {
		document.getElementById("newMilestones").checked = true
		document.getElementById("ketchupMilestone").checked = true
		document.getElementById("reservePrice").checked = true
		document.getElementById("newDistricts").checked = true
		document.getElementById("lobbyists").checked = true
		document.getElementById("coffee").checked = true
		document.getElementById("kimchi").checked = true
		document.getElementById("sushi").checked = true
		document.getElementById("noodles").checked = true
		document.getElementById("fryChefs").checked = true
		document.getElementById("massMarketers").checked = true
		document.getElementById("gourmet").checked = true
		document.getElementById("ruralMarketers").checked = true
		document.getElementById("movieStars").checked = true
		document.getElementById("nightShift").checked = true
	}
}

function validateOptions(change) {
	// Mini Tournamnt
	if (change === "playersPerGameMT") {
		let totalPlayersMT_el = document.getElementById("totalPlayersMT")
		totalPlayersMT_el.innerHTML = ""
		let playersPerGame = parseInt(document.getElementById("playersPerGameMT").value)

		if (playersPerGame === 2) {
			totalPlayersMT_el.add(new Option("6", 6))
			totalPlayersMT_el.add(new Option("8", 8))
			totalPlayersMT_el.add(new Option("10", 10))
			totalPlayersMT_el.add(new Option("12", 12))
			totalPlayersMT_el.value = "12"
		} else if (playersPerGame === 3) {
			totalPlayersMT_el.add(new Option("6", 6))
			totalPlayersMT_el.add(new Option("9", 9))
			totalPlayersMT_el.add(new Option("12", 12))
			totalPlayersMT_el.value = "12"
		} else if (playersPerGame === 4) {
			totalPlayersMT_el.add(new Option("8", 8))
			totalPlayersMT_el.add(new Option("12", 12))
			totalPlayersMT_el.value = "12"
		} else if (playersPerGame === 5) {
			totalPlayersMT_el.add(new Option("10", 10))
			totalPlayersMT_el.value = "10"
		} else if (playersPerGame === 6) {
			totalPlayersMT_el.add(new Option("6", 6))
			totalPlayersMT_el.add(new Option("12", 12))
			totalPlayersMT_el.value = "12"
		}
	}
	// End Mini Tournament
	else if (change == "keepMap") {
		if (document.getElementById(change).checked == true) document.getElementById("mapData").value = boardTiles
		else document.getElementById("mapData").value = ""
	} else if (change == "pace") {
		document.getElementById("kickoutDuration").innerHTML = ""
		// Blitz
		if (document.getElementById("pace").value == 10) {
			var el = document.createElement("option")
			el.value = 5
			el.innerHTML = "5 Minutes"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 10
			el.innerHTML = "10 Minutes"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 20
			el.innerHTML = "20 Minutes"
			document.getElementById("kickoutDuration").appendChild(el)
			// Now lock to 2p
			/*document.getElementById('playerNumber').value = 2;
            document.getElementById('playerNumber').disabled = true;
            selectPlayers();*/
		}
		// Live
		else if (document.getElementById("pace").value == 20) {
			el = document.createElement("option")
			el.value = 50
			el.innerHTML = "12 hours"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 100
			el.innerHTML = "1 day"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			// Unlock from 2p
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
		}
		// Fast / std / slow
		else if (document.getElementById("pace").value >= 30) {
			el = document.createElement("option")
			el.value = 100
			el.innerHTML = "1 day"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 200
			el.innerHTML = "2 days"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 300
			el.innerHTML = "3 days"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 500
			el.innerHTML = "5 days"
			document.getElementById("kickoutDuration").appendChild(el)
			// Unlock from 2p
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
		}
	} else if (change === "newMilestones") {
		if (document.getElementById(change).checked == true) {
			removeOption("noCeoMilestone")
			removeOption("noRadioMilestone")
			removeOption("hardChoices")
		} else {
			addOption("noCeoMilestone")
			addOption("noRadioMilestone")
			addOption("hardChoices")
		}
	} else if (change === "noMilestones") {
		if (document.getElementById(change).checked == true) {
			removeOption("noCeoMilestone")
			removeOption("noRadioMilestone")
			removeOption("hardChoices")
			removeOption("newMilestones")
			removeOption("ketchupMilestone")
		} else {
			addOption("noCeoMilestone")
			addOption("noRadioMilestone")
			addOption("hardChoices")
			addOption("newMilestones")
			addOption("ketchupMilestone")
		}
	} else if (change === "trainingGame") {
		if (document.getElementById(change).checked == true) {
			document.getElementById("strictPaydayFridge").checked = true
			document.getElementById("strictPaydayFridge").disabled = true
			removeOption("learningGame")
			removeOption("experiencedGame")
			removeOption("privateGame")
			removeOption("allowRewind")
			//document.getElementById('playerNumber').value = 2;
			//document.getElementById('playerNumber').disabled = true;
			selectPlayers()
		} else {
			document.getElementById("strictPaydayFridge").checked = false
			document.getElementById("strictPaydayFridge").disabled = false
			//document.getElementById('playerNumber').value = 2;
			if (document.getElementById("mapData").value == "") document.getElementById("playerNumber").disabled = false
			selectPlayers()
			document.getElementById("player2").value = ""
			document.getElementById("player2").disabled = false
			document.getElementById("player3").value = ""
			document.getElementById("player3").disabled = false
			document.getElementById("player4").value = ""
			document.getElementById("player4").disabled = false
			document.getElementById("player5").value = ""
			document.getElementById("player5").disabled = false
			document.getElementById("player6").value = ""
			document.getElementById("player6").disabled = false

			addOption("learningGame")
			addOption("privateGame")
			if (global.experienced) addOption("experiencedGame")
			addOption("allowRewind")
		}
	} else if (change === "newDistricts") {
		if (document.getElementById(change).checked == true) {
			addOption("newDistrictsApp")
			addOption("newDistrictsAll")
			addOption("newDistrictsPark")
		} else {
			removeOption("newDistrictsApp")
			removeOption("newDistrictsAll")
			removeOption("newDistrictsPark")
		}
	} 
	else if (change === "urbanPlanning") {
		document.getElementById("urbanPlanningPlus").checked = false
	}
		else if (change === "urbanPlanningPlus") {
		document.getElementById("urbanPlanning").checked = false
	}
	else if (change === "enableAdvancedOptions") {
		if (document.getElementById(change).checked == true) {
			// clear all options
			var ele
			ele = document.getElementsByName("scenario")
			for (var i = 0; i < ele.length; i++) ele[i].checked = false
			ele = document.getElementsByClassName("individualOpt")
			for (let i = 0; i < ele.length; i++) {
				ele[i].checked = false
				ele[i].disabled = false
			}
			//document.getElementById("random_originalMS").checked = true;
			addOption("randomModules")
			addOption("draftModules")
			addOption("fcmAI")
			document.getElementById("nonExpertOptions").style.display = "none"
		} else {
			removeOption("randomModules")
			removeOption("random_originalMS")
			removeOption("random_newMS")
			removeOption("draft_originalMS")
			removeOption("draft_newMS")
			removeOption("draftModules")
			removeOption("newDistrictsDraft")
			removeOption("newDistrictsAppDraft")
			removeOption("newDistrictsParkDraft")
			removeOption("minModules")
			removeOption("maxModules")
			removeOption("fcmAI")
			document.getElementById("nonExpertOptions").style.display = "inline-block"
		}
	} else if (change === "randomModules") {
		if (document.getElementById(change).checked == true) {
			addOption("random_originalMS")
			addOption("random_newMS")
			addOption("minModules")
			addOption("maxModules")
			document.getElementById("random_originalMS").checked = true
			document.getElementById("draftModules").checked = false
			removeOption("draft_originalMS")
			removeOption("draft_newMS")
			removeOption("newDistrictsDraft")
			removeOption("newDistrictsAppDraft")
			removeOption("newDistrictsParkDraft")
		} else {
			removeOption("random_originalMS")
			removeOption("random_newMS")
			removeOption("minModules")
			removeOption("maxModules")
		}
	} else if (change === "random_originalMS") {
		let newOption1 = new Option("15", "15")
		let newOption2 = new Option("15", "15")
		let selectBox = document.getElementById("minModules")
		selectBox.add(newOption1, undefined)
		selectBox = document.getElementById("maxModules")
		selectBox.add(newOption2, undefined)
	} else if (change === "random_newMS") {
		if (document.getElementById("maxModules").value === "15") document.getElementById("maxModules").value = "14"
		if (document.getElementById("minModules").value === "15") document.getElementById("minModules").value = "14"
		document.getElementById("minModules").remove(14)
		document.getElementById("maxModules").remove(14)
	} else if (change === "minModules") {
		var minModules = parseInt(document.getElementById("minModules").value)
		if (parseInt(document.getElementById("maxModules").value) < minModules) {
			document.getElementById("maxModules").value = String(minModules)
		}
	} else if (change === "maxModules") {
		var maxModules = parseInt(document.getElementById("maxModules").value)
		if (parseInt(document.getElementById("minModules").value) > maxModules) {
			document.getElementById("minModules").value = String(maxModules)
		}
	} else if (change === "draftModules") {
		if (document.getElementById(change).checked == true) {
			addOption("draft_originalMS")
			addOption("draft_newMS")
			document.getElementById("draft_originalMS").checked = true
			addOption("newDistrictsDraft")
			document.getElementById("randomModules").checked = false
			removeOption("random_originalMS")
			removeOption("random_newMS")
			removeOption("minModules")
			removeOption("maxModules")
		} else {
			removeOption("draft_originalMS")
			removeOption("draft_newMS")
			removeOption("newDistrictsDraft")
			removeOption("newDistrictsAppDraft")
			removeOption("newDistrictsParkDraft")
		}
	} else if (change === "newDistrictsDraft") {
		if (document.getElementById(change).checked == true) {
			addOption("newDistrictsAppDraft")
			addOption("newDistrictsParkDraft")
		} else {
			removeOption("newDistrictsAppDraft")
			removeOption("newDistrictsParkDraft")
		}
	} else if (change === "fcmAI") {
		if (document.getElementById(change).checked == true) {
			// Expert Options
			removeOption("randomModules")
			removeOption("random_originalMS")
			removeOption("random_newMS")
			removeOption("draft_originalMS")
			removeOption("draft_newMS")
			removeOption("draftModules")
			removeOption("newDistrictsDraft")
			removeOption("newDistrictsAppDraft")
			removeOption("newDistrictsParkDraft")
			removeOption("minModules")
			removeOption("maxModules")
			// Tick practice
			document.getElementById("trainingGame").checked = true
			document.getElementById("trainingGame").disabled = true
			// Practice mode
			document.getElementById("strictPaydayFridge").checked = true
			document.getElementById("strictPaydayFridge").disabled = true
			document.getElementById("playerNumber").value = 2
			document.getElementById("playerNumber").disabled = true
			// Private / learning / experienced
			removeOption("privateGame")
			removeOption("learningGame")
			removeOption("experiencedGame")
			removeOption("allowRewind")

			selectPlayers()
		} else {
			// Expert Options
			addOption("randomModules")
			addOption("draftModules")
			// Untick Practice
			document.getElementById("trainingGame").checked = false
			document.getElementById("trainingGame").disabled = false
			// Practice game
			document.getElementById("strictPaydayFridge").checked = false
			document.getElementById("strictPaydayFridge").disabled = false
			//document.getElementById('playerNumber').value = 2;
			if (document.getElementById("mapData").value == "") document.getElementById("playerNumber").disabled = false
			selectPlayers()
			document.getElementById("player2").value = ""
			document.getElementById("player2").disabled = false
			document.getElementById("player3").value = ""
			document.getElementById("player3").disabled = false
			document.getElementById("player4").value = ""
			document.getElementById("player4").disabled = false
			document.getElementById("player5").value = ""
			document.getElementById("player5").disabled = false
			document.getElementById("player6").value = ""
			document.getElementById("player6").disabled = false
			// Private / learning / experienced
			addOption("privateGame")
			addOption("learningGame")
			if (global.experienced) addOption("experiencedGame")
			addOption("allowRewind")
		}
	} else if (change === "learningGame") {
		if (document.getElementById(change).checked == true) {
			removeOption("trainingGame")
			removeOption("experiencedGame")
			document.getElementById("playerNumber").value = 2
			document.getElementById("playerNumber").disabled = true
			selectPlayers()
		} else {
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
			addOption("trainingGame")
			if (global.experienced) addOption("experiencedGame")
		}
	} else if (change === "experiencedGame") {
		if (document.getElementById(change).checked == true) {
			removeOption("trainingGame")
			removeOption("learningGame")
			document.getElementById("player2").value = ""
			document.getElementById("player2").disabled = false
			document.getElementById("player3").value = ""
			document.getElementById("player3").disabled = false
			document.getElementById("player4").value = ""
			document.getElementById("player4").disabled = false
			document.getElementById("player5").value = ""
			document.getElementById("player5").disabled = false
			selectPlayers()
		} else {
			addOption("trainingGame")
			addOption("learningGame")
		}
	}
}

function removeOption(option) {
	document.getElementById(option).checked = false
	document.getElementById(option).disabled = true
}

function addOption(option) {
	//document.getElementById(option).checked = false;
	document.getElementById(option).disabled = false
}

function setPlayersforMapData() {
	if (document.getElementById("mapData").value == "") return
	else {
		if (boardTiles.length === 18) document.getElementById("playerNumber").value = 2
		if (boardTiles.length === 24) document.getElementById("playerNumber").value = 3
		if (boardTiles.length === 32) document.getElementById("playerNumber").value = 4
		if (boardTiles.length === 40) document.getElementById("playerNumber").value = 5
		if (boardTiles.length === 48) document.getElementById("playerNumber").value = 6
		document.getElementById("playerNumber").disabled = true
		/*if (document.getElementById('playerNumber').value > 2) {
            document.getElementById('trainingGame').disabled = true;
        }*/

		selectPlayers()
	}
}

function selectPlayers() {
	var numberOfPlayers = document.getElementById("playerNumber").value
	if (document.getElementById("trainingGame").checked) {
		if (document.getElementById("fcmAI").checked) {
			document.getElementById("player2").disabled = true
			document.getElementById("player3").disabled = true
			document.getElementById("player4").disabled = true
			document.getElementById("player5").disabled = true
			document.getElementById("player6").disabled = true
		} else document.getElementById("player2help").innerHTML = '<span style="background-color: yellow; color: darkred;">' + global.player2practiceText + "</span>"
	} else document.getElementById("player2help").innerHTML = global.player2normText

	switch (numberOfPlayers) {
		case "2":
			document.getElementById("selPlayer3").style.display = "none"
			document.getElementById("selPlayer4").style.display = "none"
			document.getElementById("selPlayer5").style.display = "none"
			document.getElementById("selPlayer6").style.display = "none"

			document.getElementById("player3").value = ""
			document.getElementById("player4").value = ""
			document.getElementById("player5").value = ""
			document.getElementById("player6").value = ""

			if (document.getElementById("fcmAI").checked) document.getElementById("player2").value = "FcmAI"
			else if (document.getElementById("trainingGame").checked) document.getElementById("player2").value = "SHADOW"
			break
		case "3":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "none"
			document.getElementById("selPlayer5").style.display = "none"
			document.getElementById("selPlayer6").style.display = "none"

			document.getElementById("player4").value = ""
			document.getElementById("player5").value = ""
			document.getElementById("player6").value = ""

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
			}
			break
		case "4":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"
			document.getElementById("selPlayer5").style.display = "none"
			document.getElementById("selPlayer6").style.display = "none"

			document.getElementById("player5").value = ""
			document.getElementById("player6").value = ""
			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
			}
			break
		case "5":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"
			document.getElementById("selPlayer5").style.display = "flex"
			document.getElementById("selPlayer6").style.display = "none"

			document.getElementById("player6").value = ""

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
				document.getElementById("player5").value = "SHADOW_4"
			}
			break
		case "6":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"
			document.getElementById("selPlayer5").style.display = "flex"
			document.getElementById("selPlayer6").style.display = "flex"

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
				document.getElementById("player5").value = "SHADOW_4"
				document.getElementById("player6").value = "SHADOW_5"
			}
			break
	}
}

function autocomplete(inp) {
	/*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
	var currentFocus
	var searchtimer

	/*execute a function when someone writes in the text field:*/
	inp.addEventListener("input", function (e) {
		if (!global.MT_Creation && document.getElementById("trainingGame").checked) return
		clearTimeout(searchtimer)

		searchtimer = setTimeout(() => {
			var a,
				b,
				i,
				val = this.value
			/*close any already open lists of autocompleted values*/
			closeAllLists()
			if (!val) {
				return false
			}
			currentFocus = -1
			/*create a DIV element that will contain the items (values):*/
			a = document.createElement("DIV")
			a.setAttribute("id", this.id + "autocomplete-list")
			a.setAttribute("class", "autocomplete-items")
			/*append the DIV element as a child of the autocomplete container:*/
			this.parentNode.appendChild(a)

			let csrftoken = getCookie("csrftoken")

			fetch("/autoCompleteUsername/", {
				method: "POST",
				body: JSON.stringify({
					//id: global.gameId,
					partialString: this.value,
					//turn: turn,
					//phase: phase,
					//gameID: global.gameID
				}),
				headers: { "X-CSRFToken": csrftoken },
			})
				.then((response) => response.json())
				.then((result) => {
					var arr = result.matchList
					var matchesFound = false
					for (i = 0; i < arr.length; i++) {
						/*check if the item starts with the same letters as the text field value:*/
						if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
							//if (arr[i].toUpperCase().includes(val.toUpperCase())) {
							matchesFound = true
							/*create a DIV element for each matching element:*/
							b = document.createElement("DIV")
							/*make the matching letters bold:*/
							b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>"
							b.innerHTML += arr[i].substr(val.length)
							/*insert a input field that will hold the current array item's value:*/
							b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>"
							/*execute a function when someone clicks on the item value (DIV element):*/
							b.addEventListener("click", function (e) {
								/*insert the value for the autocomplete text field:*/
								inp.value = this.getElementsByTagName("input")[0].value
								/*close the list of autocompleted values,
                                (or any other open lists of autocompleted values:*/
								closeAllLists()
							})
							a.appendChild(b)
						}
					}
					if (matchesFound === false) {
						b = document.createElement("DIV")
						b.innerHTML = "<strong>No User Found</strong>"
						a.appendChild(b)
					}
				})
				.catch((error) => {
					console.log("Error:", error)
				})
		}, 500)
	})

	/*execute a function presses a key on the keyboard:*/
	inp.addEventListener("keydown", function (e) {
		var x = document.getElementById(this.id + "autocomplete-list")
		if (x) x = x.getElementsByTagName("div")
		if (e.keyCode == 40) {
			/*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
			currentFocus++
			/*and and make the current item more visible:*/
			addActive(x)
		} else if (e.keyCode == 38) {
			//up
			/*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
			currentFocus--
			/*and and make the current item more visible:*/
			addActive(x)
		} else if (e.keyCode == 13) {
			/*If the ENTER key is pressed, prevent the form from being submitted,*/
			e.preventDefault()
			if (currentFocus > -1) {
				/*and simulate a click on the "active" item:*/
				if (x) x[currentFocus].click()
			}
		}
	})

	function addActive(x) {
		/*a function to classify an item as "active":*/
		if (!x) return false
		/*start by removing the "active" class on all items:*/
		removeActive(x)
		if (currentFocus >= x.length) currentFocus = 0
		if (currentFocus < 0) currentFocus = x.length - 1
		/*add class "autocomplete-active":*/
		x[currentFocus].classList.add("autocomplete-active")
	}
	function removeActive(x) {
		/*a function to remove the "active" class from all autocomplete items:*/
		for (var i = 0; i < x.length; i++) {
			x[i].classList.remove("autocomplete-active")
		}
	}

	function closeAllLists(elmnt) {
		/*close all autocomplete lists in the document,
        except the one passed as an argument:*/
		var x = document.getElementsByClassName("autocomplete-items")
		for (var i = 0; i < x.length; i++) {
			if (elmnt != x[i] && elmnt != inp) {
				x[i].parentNode.removeChild(x[i])
			}
		}
	}

	/*execute a function when someone clicks in the document:*/
	document.addEventListener("click", function (e) {
		closeAllLists(e.target)
	})
}

// get CSRF for javascript
function getCookie(name) {
	var cookieValue = null
	if (document.cookie && document.cookie !== "") {
		var cookies = document.cookie.split(";")
		for (var i = 0; i < cookies.length; i++) {
			var cookie = cookies[i].trim()
			// Does this cookie string begin with the name we want?
			if (cookie.substring(0, name.length + 1) === name + "=") {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
				break
			}
		}
	}
	return cookieValue
}

async function invitePlayerMT(e) {
	e.preventDefault()
	document.getElementById("invitedPlayersWarningSpanMT").innerText = ""

	// Get the input value from the autocomplete field
	const input = document.getElementById("playerToInviteMT")
	const username = input.value.trim()

	if (!username) {
		document.getElementById("invitedPlayersWarningSpanMT").innerText = "Please enter a username"
		return
	}

	const inviteButton = document.querySelector("#invitePlayerMTbutton")
	inviteButton.disabled = true
	inviteButton.textContent = "Adding Player...."

	let csrftoken = getCookie("csrftoken")
	try {
		const response = await fetch("/addPlayerToMTinvites/", {
			method: "POST",
			body: JSON.stringify({
				username: username,
			}),
			headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.success === 1) {
			if (global.invitedPlayersArr.includes(username)) {
				document.getElementById("invitedPlayersWarningSpanMT").innerText = "Player already invited"
			} else {
				global.invitedPlayersArr.push(username)
				displayInvitedPlayersMT()
			}
			input.value = ""
		} else if (data.success === 2) document.getElementById("invitedPlayersWarningSpanMT").innerText = "Player does not exist"
		else if (data.success === 3) document.getElementById("invitedPlayersWarningSpanMT").innerText = "You will be added automatically"
		inviteButton.textContent = "Add Player to Invite List"
		inviteButton.disabled = false
	} catch (error) {
		console.error("Error fetching data:", error)
		document.getElementById("invitedPlayersWarningSpanMT").innerText = "Error adding player to invite list"
		inviteButton.disabled = false
	}
}

function displayInvitedPlayersMT() {
	let span = document.getElementById("invitedPlayersSpanMT")
	let invitedPlayers = global.invitedPlayersArr.join(", ")
	span.innerHTML = "<br/>Invited Players: " + invitedPlayers

	let hiddenInput = document.getElementById("invtedPlayersListMT")
	hiddenInput.value = JSON.stringify(global.invitedPlayersArr)
}

