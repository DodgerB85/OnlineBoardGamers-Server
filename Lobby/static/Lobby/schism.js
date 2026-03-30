
document.addEventListener("DOMContentLoaded", function () {
	let ALL_GAMES = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

	// Add click to Join Game
	var _gameID
	var joinGameDivs = document.querySelectorAll(".availableLink")
	if (joinGameDivs.length > 0) {
		for (let i = 0; i < joinGameDivs.length; i++) {
			joinGameDivs[i].onclick = function () {
				let gameName = this.parentNode.parentNode.id.slice(0, 2)
				if (ALL_GAMES.includes(gameName)) {
					_gameID = parseInt(this.parentNode.parentNode.id.slice(10))
				} else {
					gameName = this.parentNode.parentNode.id.slice(0, 3)
					_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				}

				

				joinGame(gameName, _gameID)
			}

			joinGameDivs[i].onmouseenter = function () {
				this.style.backgroundColor = "#5875f8"
				this.style.color = "white"
				this.style.cursor = "pointer"
			}

			joinGameDivs[i].onmouseleave = function () {
				this.style.backgroundColor = "rgba(255, 255, 255, 0.05)"
				this.style.color = "blue"
			}
		}
	}

	// Add click to decline / Leave
	var leaveDeclineDivs = document.querySelectorAll(".leaveDeclineLink")
	if (leaveDeclineDivs.length > 0) {
		for (let i = 0; i < leaveDeclineDivs.length; i++) {
			leaveDeclineDivs[i].onclick = function () {
				let gameName = this.parentNode.parentNode.id.slice(0, 2)
				if (ALL_GAMES.includes(gameName)) {
					_gameID = parseInt(this.parentNode.parentNode.id.slice(10))
				} else {
					gameName = this.parentNode.parentNode.id.slice(0, 3)
					_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
				}

				let csrftoken = getCookie("csrftoken")
				var action
				if (this.classList.contains("waiting")) action = "vacate"
				let reason = ""
				if (this.classList.contains("invitations")) {
					action = "decline"
					try {
						reason = document.getElementById(gameName + "declineReason" + String(_gameID)).value
					} catch {
						//
					}
				}

				fetch("/joinGame/" + gameName + "/", {
					method: "POST",
					body: JSON.stringify({
						gameID: _gameID,
						action: action,
						reason: reason,
					}),
					headers: { "X-CSRFToken": csrftoken },
				})
					.then((response) => response.json())
					.then((result) => {
						if (result == "AVAILABLE") window.open("/index/available", "_self")
					})
					.catch((error) => {
						console.log("Error:", error)
					})
			}

			leaveDeclineDivs[i].onmouseenter = function () {
				this.style.backgroundColor = "#eb5353"
				this.style.color = "white"
				this.style.cursor = "pointer"
			}

			leaveDeclineDivs[i].onmouseleave = function () {
				this.style.backgroundColor = "rgba(255, 255, 255, 0.05)"
				this.style.color = "blue"
			}
		}
	}

	// Add click to custom map
	var customMapImages = document.querySelectorAll(".startingMap")
	if (customMapImages.length > 0) {
		for (let i = 0; i < customMapImages.length; i++) {
			customMapImages[i].onclick = function (e) {
				e.stopPropagation() // stops the browser from redirecting.
				e.preventDefault()
				let form
				if (this.getAttribute("data-game") === "TGZ") {
					document.getElementById("mapDataTGZ").value = this.getAttribute("data-map")
					form = document.getElementById("openInMapEditorFormTGZ")
				}
				form.submit()
			}
		}
	}

	// Add TGZ info
	let customTGZinfos = document.querySelectorAll(".TGZinfoContainer")
	if (customTGZinfos.length > 0) {
		for (let i = 0; i < customTGZinfos.length; i++) {
			customTGZinfos[i].onclick = function (e) {
				e.stopPropagation() // stops the browser from redirecting.
				e.preventDefault()
				window.location.href = "/showTGZoptions/" + this.parentNode.parentNode.id.slice(11) // Replace 'another_page' with the actual URL name or path for the destination page
			}

			customTGZinfos[i].addEventListener("contextmenu", function (event) {
				event.preventDefault()
			})

			customTGZinfos[i].addEventListener("touchstart", function (event) {
				event.preventDefault()
				const TGZinfoPopup = this.querySelector(".TGZinfoPopup")
				// Calculate the left position of the pop-up
				if (TGZinfoPopup) {
					const popupWidth = 625
					const screenWidth = window.innerWidth
					const cursorX = event.clientX
					const leftPosition = cursorX + popupWidth > screenWidth ? screenWidth - popupWidth - 200 : cursorX

					// Set the left position of the pop-up
					TGZinfoPopup.style.left = leftPosition + "px"

					// Show the pop-up
					TGZinfoPopup.style.display = "block"
				}
			})

			customTGZinfos[i].onmouseenter = function (event) {
				this.style.opacity = "0.9"
				this.style.cursor = "pointer"

				const TGZinfoPopup = this.querySelector(".TGZinfoPopup")
				// Calculate the left position of the pop-up
				if (TGZinfoPopup) {
					const popupWidth = 625
					const screenWidth = window.innerWidth
					const cursorX = event.clientX
					const leftPosition = cursorX + popupWidth > screenWidth ? screenWidth - popupWidth - 200 : cursorX

					// Set the left position of the pop-up
					TGZinfoPopup.style.left = leftPosition + "px"

					// Show the pop-up
					TGZinfoPopup.style.display = "block"
				}
			}

			customTGZinfos[i].onmouseleave = function () {
				this.style.opacity = ""
				const TGZinfoPopup = this.querySelector(".TGZinfoPopup")
				if (TGZinfoPopup) TGZinfoPopup.style.display = "none"
			}
		}
	}
}) // END INIT LOBBY

function joinGame(gameName, _gameID) {
	let csrftoken = getCookie("csrftoken")
	fetch("/joinGame/" + gameName + "/", {
		method: "POST",
		body: JSON.stringify({
			gameID: _gameID,
			action: "join",
			source: "ajax",
		}),
		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			//alert(JSON.stringify(result))
			if (result.show_div) {
				window.open("/index/available", "_self")
			} else {
				if (result.listToShow == "ACTIVE") window.open("/index/current", "_self")
				if (result.listToShow == "WAITING") window.open("/index/waiting", "_self")
				if (result.listToShow == "AVAILABLE") window.open("/index/available", "_self")
			}
		})
		.catch((error) => {
			console.log("Error:", error)
		})
}

// Add TGZ info
let pressTimer

function startPressTimer() {
	pressTimer = setTimeout(showPopup, 1000) // Change the duration (in milliseconds) to adjust the long press time
}

function clearPressTimer() {
	clearTimeout(pressTimer)
}
// END TFZ INFO

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

function copyToClipboard(text, event) {
	const textarea = document.createElement("textarea")
	textarea.value = text
	document.body.appendChild(textarea)
	textarea.select()
	document.execCommand("copy")
	document.body.removeChild(textarea)

	const popup = document.createElement("div")
	popup.textContent = "Link Copied"
	popup.style.position = "fixed"
	popup.style.top = event.clientY + 15 + "px"
	popup.style.left = event.clientX - 53 + "px"
	popup.style.background = "#f1f1f1"
	popup.style.padding = "10px"
	popup.style.border = "2px solid #5875f8"
	popup.style.borderRadius = "4px"
	popup.style.opacity = "1"
	popup.style.transition = "opacity 1s"

	document.body.appendChild(popup)
	setTimeout(function () {
		popup.style.opacity = "0"
		setTimeout(function () {
			document.body.removeChild(popup)
		}, 1000)
	}, 1000)
}