// No text

document.addEventListener("DOMContentLoaded", function () {
	var i = 0

	// Update all times to local

	// Add click to view tournys
	var clickableTournamentRows = document.getElementsByClassName("clickableTournamentRow")
	for (i = 0; i < clickableTournamentRows.length; i++) {
		if (clickableTournamentRows[i].classList.contains("FCM")) {
			clickableTournamentRows[i].onclick = function () {
				window.open("/FCMtournament/FCM/" + this.id.slice(13) + "/", "_self")
			}
		} else if (clickableTournamentRows[i].classList.contains("HC")) {
			clickableTournamentRows[i].onclick = function () {
				window.open("/HCtournament/HC/" + this.id.slice(13) + "/", "_self")
			}
		} else if (clickableTournamentRows[i].classList.contains("Bus")) {
			clickableTournamentRows[i].onclick = function () {
				window.open("/Bustournament/Bus/" + this.id.slice(13) + "/", "_self")
			}
		} else if (clickableTournamentRows[i].classList.contains("AQY")) {
			clickableTournamentRows[i].onclick = function () {
				window.open("/AQYtournament/AQY/" + this.id.slice(13) + "/", "_self")
			}
		} else if (clickableTournamentRows[i].classList.contains("IND")) {
			clickableTournamentRows[i].onclick = function () {
				window.open("/INDtournament/IND/" + this.id.slice(13) + "/", "_self")
			}
		}
		// OTHERWISE, it must be a general MAIN tournament
		else {
			clickableTournamentRows[i].onclick = function () {
				window.open("/MainTournament/" + this.id.slice(13) + "/", "_self")
			}
		}
	}
})
