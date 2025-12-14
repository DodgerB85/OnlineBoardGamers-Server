var global = {}

document.addEventListener("DOMContentLoaded", function () {
	// Update all times to local

	document.querySelector("#FCM").addEventListener("click", () => show_playerStatsTab("FCM"))
	document.querySelector("#HC").addEventListener("click", () => show_playerStatsTab("HC"))
	document.querySelector("#Bus").addEventListener("click", () => show_playerStatsTab("Bus"))
	document.querySelector("#TGZ").addEventListener("click", () => show_playerStatsTab("TGZ"))
	document.querySelector("#CNS").addEventListener("click", () => show_playerStatsTab("CNS"))
	document.querySelector("#AQY").addEventListener("click", () => show_playerStatsTab("AQY"))
	document.querySelector("#IND").addEventListener("click", () => show_playerStatsTab("IND"))
	document.querySelector("#KFW").addEventListener("click", () => show_playerStatsTab("KFW"))
	document.querySelector("#WEB").addEventListener("click", () => show_playerStatsTab("WEB"))

	var gameRows = document.querySelectorAll(".gameRow")

	// Add Delete to training games
	var trainingGameDeleteDivs = document.querySelectorAll(".deleteTrainingGame")
	for (let i = 0; i < trainingGameDeleteDivs.length; i++) {
		trainingGameDeleteDivs[i].onclick = function (event) {
			event.cancelBubble = true
			event.stopPropagation()
			let _gameID = 0

			var URLstring
			if (this.parentNode.parentNode.id.slice(0, 3) === "FCM") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				URLstring = "FCM"
			} else if (this.parentNode.parentNode.id.slice(0, 2) === "HC") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(10))
				URLstring = "HC"
			} else if (this.parentNode.parentNode.id.slice(0, 3) === "Bus") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				URLstring = "Bus"
			} else if (this.parentNode.parentNode.id.slice(0, 3) === "TGZ") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				URLstring = "TGZ"
			} else if (this.parentNode.parentNode.id.slice(0, 3) === "CNS") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				URLstring = "CNS"
			} else if (this.parentNode.parentNode.id.slice(0, 3) === "AQY") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				URLstring = "AQY"
			} else if (this.parentNode.parentNode.id.slice(0, 3) === "IND") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				URLstring = "IND"
			} else if (this.parentNode.parentNode.id.slice(0, 3) === "KFW") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				URLstring = "KFW"
			} else if (this.parentNode.parentNode.id.slice(0, 3) === "WEB") {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				URLstring = "WEB"
			}

			let csrftoken = getCookie("csrftoken")
			var action = "deleteTrgGame"

			fetch("/deleteGame/" + URLstring + "/", {
				method: "DELETE",
				body: JSON.stringify({
					gameID: _gameID,
					action: action,
					return: "lobby",
				}),
				headers: { "X-CSRFToken": csrftoken },
			})
				.then((response) => response.json())
				.then((result) => {
					if (result.noGame) alert("Already Deleted")
					else {
						const gameRow = document.getElementById(result.gameType + "gamesRow" + String(result.gameID))
						fadeOutAndRemove(gameRow)
					}
				})
				.catch((error) => {
					console.log("Error:", error)
				})
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
	}

	global.game = "FCM"
	show_playerStatsTab(global.game)
})

function show_playerStatsTab(game) {
	// Remove all blue tabs and visible divs
	var tablinks = document.getElementsByClassName("tablinks")
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "")
	}
	var playerStatsDiv = document.getElementsByClassName("playerStatsDiv")
	for (let i = 0; i < playerStatsDiv.length; i++) {
		playerStatsDiv[i].style.display = "none"
	}

	// Set up correct player display
	if (game === "FCM") {
		document.getElementById(game).classList.add("active")
	} else if (game === "HC") {
		document.getElementsByClassName("players2")[1].style.display = "none"
		document.getElementsByClassName("players6")[1].style.display = "none"
		document.getElementById(game).classList.add("active")
	} else if (game === "Bus") {
		document.getElementsByClassName("players2")[2].style.display = "none"
		document.getElementsByClassName("players6")[2].style.display = "none"
		document.getElementById(game).classList.add("active")
	} else if (game === "TGZ") {
		document.getElementsByClassName("players6")[3].style.display = "none"
		document.getElementById(game).classList.add("active")
	} else if (game === "CNS") {
		document.getElementsByClassName("players5")[4].style.display = "none"
		document.getElementsByClassName("players6")[4].style.display = "none"
		document.getElementById(game).classList.add("active")
	} else if (game === "AQY") {
		document.getElementsByClassName("players5")[5].style.display = "none"
		document.getElementsByClassName("players6")[5].style.display = "none"
		document.getElementById(game).classList.add("active")
	} else if (game === "IND") {
		document.getElementsByClassName("players6")[6].style.display = "none"
		document.getElementById(game).classList.add("active")
	} else if (game === "KFW") {
		document.getElementById(game).classList.add("active")
	} else if (game === "WEB") {
		document.getElementsByClassName("players5")[8].style.display = "none"
		document.getElementsByClassName("players6")[8].style.display = "none"
		document.getElementById(game).classList.add("active")
	}

	var divToDisplay = "playerStatsDiv"
	if (game === "FCM") divToDisplay += "0"
	else if (game === "HC") divToDisplay += "1"
	else if (game === "Bus") divToDisplay += "2"
	else if (game === "TGZ") divToDisplay += "3"
	else if (game === "CNS") divToDisplay += "4"
	else if (game === "AQY") divToDisplay += "5"
	else if (game === "IND") divToDisplay += "6"
	else if (game === "KFW") divToDisplay += "7"
	else if (game === "WEB") divToDisplay += "8"
	// Show the correct Div
	document.getElementById(divToDisplay).style.display = "block"
}
// get CSRF for javascript
function getCookie(name) {
	var cookieValue = null
	if (document.cookie && document.cookie !== "") {
		var cookies = document.cookie.split(";")
		for (let i = 0; i < cookies.length; i++) {
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

function fadeOutAndRemove(element) {
	const tableCells = element.getElementsByTagName("td")
	const currentHeight = element.offsetHeight + 0
	const duration = 500 // Adjust the duration for the desired fade-out and height reduction speed

	element.style.transition = `opacity ${duration}ms`
	element.style.opacity = "0"

	setTimeout(() => {
		element.style.minHeight = `${currentHeight}px`
		element.style.height = `${currentHeight}px`

		// Remove all the TDs within the TR
		while (tableCells.length > 0) {
			tableCells[0].remove()
		}

		setTimeout(() => {
			element.style.transition = `height 0.5s ease-out, min-height 0.5s step-end`
			element.style.height = "0"
			element.style.minHeight = `${currentHeight}px`

			element.addEventListener("transitionend", () => {
				element.remove()
			})
		}, 0)
	}, duration + 100) // Adjust the delay to ensure sufficient time between TR removals
}
