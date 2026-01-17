window.gameType = ""
window.playerNumber = "players2"

document.addEventListener("DOMContentLoaded", function () {
	// Enable Player Stats tabbing
	/*document.querySelector("#players2tab").addEventListener("click", () => show_playerStatsTab("players2"))
	document.querySelector("#players3tab").addEventListener("click", () => show_playerStatsTab("players3"))
	document.querySelector("#players4tab").addEventListener("click", () => show_playerStatsTab("players4"))
	document.querySelector("#playersttab").addEventListener("click", () => show_playerStatsTab("playerst"))
	document.querySelector("#players5tab").addEventListener("click", () => show_playerStatsTab("players5"))*/

	document.querySelector("#players2tab").addEventListener("click", () => {
		window.playerNumber = "players2"
		show_playerStatsTab()
	})
	document.querySelector("#players3tab").addEventListener("click", () => {
		window.playerNumber = "players3"
		show_playerStatsTab()
	})
	document.querySelector("#players4tab").addEventListener("click", () => {
		window.playerNumber = "players4"
		show_playerStatsTab()
	})
		document.querySelector("#playerscombined_2_3_4tab").addEventListener("click", () => {
		window.playerNumber = "playerscombined_2_3_4"
		show_playerStatsTab()
	})

	

	show_playerStatsTab()
})

function show_playerStatsTab() {
	// Remove all blue tabs and visible divs
	var tablinks = document.getElementsByClassName("tablinks")
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "")
	}
	var statsDivs = document.getElementsByClassName("statsDiv")
	for (let i = 0; i < statsDivs.length; i++) {
		statsDivs[i].style.display = "none"
	}

	let listType = window.gameType + window.playerNumber

	document.getElementById(window.playerNumber + "tab").classList.add("active")
	document.getElementById(listType).style.display = "block"
}
