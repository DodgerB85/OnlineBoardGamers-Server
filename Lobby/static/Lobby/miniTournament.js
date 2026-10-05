// Rebuild the Total Players select so every option is a multiple of the
// selected players-per-game, matching the FCM mini tournament page.
function mtPlayersPerGameChanged() {
	var perGame = parseInt(document.getElementById("playersPerGameMT").value, 10)
	var totalEl = document.getElementById("totalPlayersMT")
	if (!perGame || !totalEl) return
	totalEl.innerHTML = ""
	for (var total = 6; total <= 12; total++) {
		if (total % perGame === 0) totalEl.add(new Option(total, total))
	}
	totalEl.value = Math.floor(12 / perGame) * perGame
}
