var global = {}

document.addEventListener("DOMContentLoaded", function () {
	// Update all times to local

	// Enable Player Stats tabbing
	document.querySelector("#fairPlay").addEventListener("click", () => show_playerStatsTab("fairPlay"))

	document.querySelector("#FCM").addEventListener("click", () => show_playerStatsTab("FCM"))
	document.querySelector("#HC").addEventListener("click", () => show_playerStatsTab("HC"))
	document.querySelector("#BUS").addEventListener("click", () => show_playerStatsTab("BUS"))
	document.querySelector("#TGZ").addEventListener("click", () => show_playerStatsTab("TGZ"))
	document.querySelector("#CNS").addEventListener("click", () => show_playerStatsTab("CNS"))
	document.querySelector("#AQY").addEventListener("click", () => show_playerStatsTab("AQY"))
	document.querySelector("#IND").addEventListener("click", () => show_playerStatsTab("IND"))
	document.querySelector("#KFW").addEventListener("click", () => show_playerStatsTab("KFW"))
	document.querySelector("#WEB").addEventListener("click", () => show_playerStatsTab("WEB"))

	document.querySelector("#allPlayers").addEventListener("click", () => show_playerStatsTab("allPlayers"))
	document.querySelector("#players2").addEventListener("click", () => show_playerStatsTab("players2"))
	document.querySelector("#players3").addEventListener("click", () => show_playerStatsTab("players3"))
	document.querySelector("#players4").addEventListener("click", () => show_playerStatsTab("players4"))
	document.querySelector("#players5").addEventListener("click", () => show_playerStatsTab("players5"))
	document.querySelector("#players6").addEventListener("click", () => show_playerStatsTab("players6"))

	document.querySelector("#allTime").addEventListener("click", () => show_playerStatsTab("allTime"))
	document.querySelector("#threeMonths").addEventListener("click", () => show_playerStatsTab("threeMonths"))
	document.querySelector("#month").addEventListener("click", () => show_playerStatsTab("month"))

	var clickableGameRows = document.querySelectorAll(".clickableGameRow")

	// Add click to view profiles
	var clickablePlayerRow = document.querySelectorAll(".clickablePlayerRow")
	for (let i = 0; i < clickablePlayerRow.length; i++) {
		clickablePlayerRow[i].onclick = function () {
			window.open("/profile/" + this.id.slice(9), "_self")
		}
	}

	// Add click to cusom map
	var customMapImages = document.querySelectorAll(".startingMap")
	for (let i = 0; i < customMapImages.length; i++) {
		customMapImages[i].onclick = function (e) {
			e.stopPropagation() // stops the browser from redirecting.
			e.preventDefault()

			let form
			if (this.getAttribute("data-game") === "FCM") {
				form = document.getElementById("openInMapEditorForm")
			}
			if (this.getAttribute("data-game") === "TGZ") {
				document.getElementById("mapDataTGZ").value = this.getAttribute("data-map")
				form = document.getElementById("openInMapEditorFormTGZ")
			}
			if (this.getAttribute("data-game") === "AQY") {
				document.getElementById("mapDataAQY").value = this.getAttribute("data-map")
				form = document.getElementById("openInMapEditorFormAQY")
			}
			form.submit()
		}
		customMapImages[i].onmouseenter = function () {
			this.style.opacity = "0.4"
			this.style.cursor = "pointer"
		}

		customMapImages[i].onmouseleave = function () {
			this.style.opacity = ""
		}
	}
	global.players = "allPlayers"
	global.timeScale = "allTime"
	global.game = "FCM"
	global.fairPlayList = false
	show_playerStatsTab("allTime")
})

function show_playerStatsTab(listType) {
	var divToDisplay = "winTotals"

	// Remove all blue tabs and visible divs
	var tablinks = document.getElementsByClassName("tablinks")
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "")
	}
	var statsDivs = document.getElementsByClassName("statsDiv")
	for (let i = 0; i < statsDivs.length; i++) {
		statsDivs[i].style.display = "none"
	}

	if (listType === "fairPlay") {
		divToDisplay = "fairPlayDiv"
		if (global.game === "FCM") divToDisplay += "0"
		else if (global.game === "HC") divToDisplay += "1"
		else if (global.game === "BUS") divToDisplay += "2"
		else if (global.game === "TGZ") divToDisplay += "3"
		else if (global.game === "CNS") divToDisplay += "4"
		else if (global.game === "AQY") divToDisplay += "5"
		else if (global.game === "IND") divToDisplay += "6"
		else if (global.game === "KFW") divToDisplay += "7"
		else if (global.game === "WEB") divToDisplay += "8"

		global.fairPlayList = true
		document.getElementById(global.game).classList.add("active")
		document.getElementById(listType).classList.add("active")
		document.getElementById(divToDisplay).style.display = "block"
	} else {
		if (listType === "FCM") global.game = "FCM"
		else if (listType === "HC") global.game = "HC"
		else if (listType === "BUS") global.game = "BUS"
		else if (listType === "TGZ") global.game = "TGZ"
		else if (listType === "CNS") global.game = "CNS"
		else if (listType === "AQY") global.game = "AQY"
		else if (listType === "IND") global.game = "IND"
		else if (listType === "KFW") global.game = "KFW"
		else if (listType === "WEB") global.game = "WEB"

		if (listType !== "FCM" && listType !== "HC" && listType !== "BUS" && listType !== "TGZ" && listType !== "CNS" && listType !== "AQY" && listType !== "IND" && listType !== "KFW" && listType !== "WEB") global.fairPlayList = false

		if (listType === "allPlayers") global.players = "allPlayers"
		if (listType === "players2") global.players = "players2"
		if (listType === "players3") global.players = "players3"
		if (listType === "players4") global.players = "players4"
		if (listType === "players5") global.players = "players5"
		if (listType === "players6") global.players = "players6"

		if (listType === "allTime") global.timeScale = "allTime"
		if (listType === "threeMonths") global.timeScale = "threeMonths"
		if (listType === "month") global.timeScale = "month"

		// Set up correct player display
		if (global.game === "FCM") {
			document.getElementById("players2").style.display = "inline"
			document.getElementById("players5").style.display = "inline"
			document.getElementById("players6").style.display = "inline"
		} else if (global.game === "HC") {
			if (global.players === "players2" || global.players === "players6") global.players = "allPlayers"
			document.getElementById("players2").style.display = "none"
			document.getElementById("players5").style.display = "inline"
			document.getElementById("players6").style.display = "none"
		} else if (global.game === "BUS") {
			if (global.players === "players2" || global.players === "players6") global.players = "allPlayers"
			document.getElementById("players2").style.display = "none"
			document.getElementById("players5").style.display = "inline"
			document.getElementById("players6").style.display = "none"
		} else if (global.game === "TGZ") {
			if (global.players === "players6") global.players = "allPlayers"
			document.getElementById("players2").style.display = "inline"
			document.getElementById("players6").style.display = "none"
		} else if (global.game === "CNS") {
			if (global.players === "players6") global.players = "allPlayers"
			document.getElementById("players2").style.display = "inline"
			document.getElementById("players5").style.display = "none"
			document.getElementById("players6").style.display = "none"
		} else if (global.game === "AQY") {
			if (global.players === "players6") global.players = "allPlayers"
			document.getElementById("players2").style.display = "inline"
			document.getElementById("players5").style.display = "none"
			document.getElementById("players6").style.display = "none"
		} else if (global.game === "IND") {
			if (global.players === "players6") global.players = "allPlayers"
			document.getElementById("players2").style.display = "inline"
			document.getElementById("players5").style.display = "inline"
			document.getElementById("players6").style.display = "none"
		} else if (global.game === "KFW") {
			document.getElementById("players2").style.display = "inline"
			document.getElementById("players5").style.display = "inline"
			document.getElementById("players6").style.display = "inline"
		}
		else if (global.game === "WEB") {
			if (global.players === "players5" || global.players === "players6") global.players = "allPlayers"
			document.getElementById("players2").style.display = "inline"
			document.getElementById("players5").style.display = "none"
			document.getElementById("players6").style.display = "none"
		}

		// Highlight the correct time and playercount
		document.getElementById(global.game).classList.add("active")
		if (global.fairPlayList) document.getElementById("fairPlay").classList.add("active")
		if (!global.fairPlayList) {
			document.getElementById(global.players).classList.add("active")
			document.getElementById(global.timeScale).classList.add("active")
		}

		// Show the correct Div
		/*var divToDisplay = winTotals - Total - Div
    winTotals - ThreeMonths - Div
    winTotals - Month - Div
    winTotals - Total - -2p - Div
    winTotals - ThreeMonths - -2p - Div*/
		if (global.timeScale === "allTime") divToDisplay += "Total"
		else if (global.timeScale === "threeMonths") divToDisplay += "ThreeMonths"
		else if (global.timeScale === "month") divToDisplay += "Month"

		if (global.players === "players2") divToDisplay += "2p"
		else if (global.players === "players3") divToDisplay += "3p"
		else if (global.players === "players4") divToDisplay += "4p"
		else if (global.players === "players5") divToDisplay += "5p"
		else if (global.players === "players6") divToDisplay += "6p"

		if (global.fairPlayList) {
			divToDisplay = "fairPlayDiv"
			if (global.game === "FCM") divToDisplay += "0"
			else if (global.game === "HC") divToDisplay += "1"
			else if (global.game === "BUS") divToDisplay += "2"
			else if (global.game === "TGZ") divToDisplay += "3"
			else if (global.game === "CNS") divToDisplay += "4"
			else if (global.game === "AQY") divToDisplay += "5"
			else if (global.game === "IND") divToDisplay += "6"
			else if (global.game === "KFW") divToDisplay += "7"
			else if (global.game === "WEB") divToDisplay += "8"
		} else {
			if (global.game === "FCM") divToDisplay += "Div0"
			else if (global.game === "HC") divToDisplay += "Div1"
			else if (global.game === "BUS") divToDisplay += "Div2"
			else if (global.game === "TGZ") divToDisplay += "Div3"
			else if (global.game === "CNS") divToDisplay += "Div4"
			else if (global.game === "AQY") divToDisplay += "Div5"
			else if (global.game === "IND") divToDisplay += "Div6"
			else if (global.game === "KFW") divToDisplay += "Div7"
			else if (global.game === "WEB") divToDisplay += "Div8"
		}

		document.getElementById(divToDisplay).style.display = "block"
	}

	//document.getElementById(listType).classList.add("active");

	/*if (listType == "allTime") document.getElementById("winTotalsTotalDiv").style.display = "block";
  if (listType == "threeMonths") document.getElementById("winTotalsThreeMonthsDiv").style.display = "block";
  if (listType == "month") document.getElementById("winTotalsMonthDiv").style.display = "block";*/
}
