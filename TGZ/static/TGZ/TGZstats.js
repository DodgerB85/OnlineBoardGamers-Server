window.gameType = ""
window.playerNumber = "players2"

document.addEventListener("DOMContentLoaded", function () {
	// Enable games tabbing
	document.querySelector("#originalgodstab").addEventListener("click", () => {
		window.gameType = ""
		show_playerStatsTab()
	})
	document.querySelector("#schismgodstab").addEventListener("click", () => {
		window.gameType = "schism_"
		show_playerStatsTab()
	})

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
	document.querySelector("#players45tab").addEventListener("click", () => {
		window.playerNumber = "players45"
		show_playerStatsTab()
	})
	document.querySelector("#players5tab").addEventListener("click", () => {
		window.playerNumber = "players5"
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
	var statsDivs = document.getElementsByClassName("statsDiv_schism")
	for (let i = 0; i < statsDivs.length; i++) {
		statsDivs[i].style.display = "none"
	}
	let listType = window.gameType + window.playerNumber

	let gameTypeTab = "originalgodstab"
	if (window.gameType === "schism_") gameTypeTab = "schismgodstab"

	document.getElementById(gameTypeTab).classList.add("active")
	document.getElementById(window.playerNumber + "tab").classList.add("active")
	document.getElementById(listType).style.display = "block"
}
