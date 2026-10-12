window.playerNumber = "players3"

document.addEventListener("DOMContentLoaded", function () {
	document.querySelector("#players3tab").addEventListener("click", () => {
		window.playerNumber = "players3"
		show_playerStatsTab()
	})
	document.querySelector("#players4tab").addEventListener("click", () => {
		window.playerNumber = "players4"
		show_playerStatsTab()
	})
	document.querySelector("#players5tab").addEventListener("click", () => {
		window.playerNumber = "players5"
		show_playerStatsTab()
	})
	document.querySelector("#playerscombinedtab").addEventListener("click", () => {
		window.playerNumber = "playerscombined"
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

	document.getElementById(window.playerNumber + "tab").classList.add("active")
	document.getElementById(window.playerNumber).style.display = "block"
}
