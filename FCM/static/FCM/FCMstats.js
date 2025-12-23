
document.addEventListener("DOMContentLoaded", function () {
	// Update all times to local

	// Enable Player Stats tabbing


	document.querySelector("#playersAlltab").addEventListener("click", () => show_playerStatsTab("playersAll"))
	document.querySelector("#players2tab").addEventListener("click", () => show_playerStatsTab("players2"))
	document.querySelector("#players3tab").addEventListener("click", () => show_playerStatsTab("players3"))
	document.querySelector("#players4tab").addEventListener("click", () => show_playerStatsTab("players4"))
	document.querySelector("#players5tab").addEventListener("click", () => show_playerStatsTab("players5"))
	document.querySelector("#players6tab").addEventListener("click", () => show_playerStatsTab("players6"))

	show_playerStatsTab("playersAll")
})

function show_playerStatsTab(listType) {

	// Remove all blue tabs and visible divs
	var tablinks = document.getElementsByClassName("tablinks")
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "")
	}
	var statsDivs = document.getElementsByClassName("statsDiv")
	for (let i = 0; i < statsDivs.length; i++) {
		statsDivs[i].style.display = "none"
	}

  document.getElementById(listType + "tab").classList.add("active");
	document.getElementById(listType).style.display = "block"
}
