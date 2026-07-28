// TEXT IN WEBHOOK ALERTS

//var displayType = "squares";
var displayType = "tables"
var global = {}

document.addEventListener("DOMContentLoaded", function () {
	let ALL_GAMES = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

	//var forcerefresh;

	// Update all times to local

	// Use buttons to toggle between views
	if (!global.joinGameLink) {
		document.querySelector("#available").addEventListener("click", () => show_gamesList("available"))
		document.querySelector("#current").addEventListener("click", () => show_gamesList("current"))
		document.querySelector("#waiting").addEventListener("click", () => show_gamesList("waiting"))
		document.querySelector("#invitations").addEventListener("click", () => show_gamesList("invitations"))
		document.querySelector("#finished").addEventListener("click", () => show_gamesList("finished"))
	}
	// Add click to Join Game
	var _gameID
	var joinGameDivs = document.querySelectorAll(".availableLink")
	for (let i = 0; i < joinGameDivs.length; i++) {
		joinGameDivs[i].onclick = function () {
			let gameName = this.parentNode.parentNode.id.slice(0, 2)
			if (ALL_GAMES.includes(gameName)) {
				_gameID = parseInt(this.parentNode.parentNode.id.slice(10))
			} else {
				gameName = this.parentNode.parentNode.id.slice(0, 3)
				_gameID = parseInt(this.parentNode.parentNode.id.slice(11))
			}

			if (this.parentNode.parentNode.classList.contains("learningGame")) {
				// Create the div element
				let div = document.getElementById("learningGameConfirmDiv")
				div.style.left = `${event.clientX}px`
				div.style.top = `${event.clientY}px`
				div.style.display = "block"

				// Create the "Join" button
				let joinDiv = document.getElementById("learningJoin")

				// Remove existing event listeners from the "Join" button
				let joinDivClone = joinDiv.cloneNode(true)
				joinDiv.parentNode.replaceChild(joinDivClone, joinDiv)

				joinDivClone.addEventListener("click", function () {
					div.style.display = "none"
					joinGame(gameName, _gameID)
				})

				// Create the "Cancel" button
				let cancelButton = document.getElementById("learningCancel")

				// Remove existing event listeners from the "Cancel" button
				let cancelButtonClone = cancelButton.cloneNode(true)
				cancelButton.parentNode.replaceChild(cancelButtonClone, cancelButton)

				cancelButtonClone.addEventListener("click", function () {
					div.style.display = "none"
				})

				return
			}

			joinGame(gameName, _gameID)
		}

		if (!document.body.classList.contains("nd")) {
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

		if (!document.body.classList.contains("nd")) {
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

	// Add Delete to training games
	var trainingGameDeleteDivs = document.querySelectorAll(".deleteTrainingGame")
	for (let i = 0; i < trainingGameDeleteDivs.length; i++) {
		trainingGameDeleteDivs[i].onclick = function (event) {
			event.cancelBubble = true
			event.preventDefault()
			event.stopPropagation()
			let gameCode = this.parentNode.parentNode.id.slice(0, 3)
			_gameID = parseInt(this.parentNode.parentNode.id.slice(11))

			let csrftoken = getCookie("csrftoken")
			var action = "deleteTrgGame"

			fetch("/deleteGame/" + gameCode + "/", {
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
						if (result.gameStatus === "ACTIVE") {
							global.currentCount -= 1
							document.getElementById("currentCount").innerHTML = String(global.currentCount)
							global.myMoveCount--
							if (global.myMoveCount > 0) document.title = "(" + String(global.myMoveCount) + ") Online Board Gamers"
							else document.title = "Online Board Gamers"
						} else if (result.gameStatus === "FINISHED") {
							global.finishedCount -= 1
							document.getElementById("finishedCount").innerHTML = String(global.finishedCount)
						}
						const gameRow = document.getElementById(result.gameType + "gamesRow" + String(result.gameID))
						fadeOutAndRemove(gameRow)
						if (result.gameStatus === "ACTIVE") {
							setTimeout(function () {
								var tbody = document.querySelector("#currentGamesListView .nd-current-games-table tbody")
								if (!tbody || tbody.rows.length === 0) {
									var wrap = document.querySelector("#currentGamesListView .nd-table-wrap")
									if (wrap) wrap.remove()
									var emptyP = document.querySelector("#currentGamesListView > p.nd-empty")
									if (emptyP) emptyP.remove()
									var view = document.getElementById("currentGamesListView")
									var colourGuide = view.querySelector(".nd-colour-guide, .colourGuideDiv")
									if (colourGuide) {
										var card = document.createElement("div")
										card.className = "nd-empty-card"
										var msg = document.createElement("p")
										msg.className = "nd-empty-msg"
										msg.textContent = "No current games or mini tournaments."
										card.appendChild(msg)
										var link = document.createElement("a")
										link.className = "nd-empty-cta"
										link.href = "/newGames/"
										link.textContent = "Start a new game"
										card.appendChild(link)
										var hint = document.createElement("p")
										hint.className = "nd-empty-hint"
										hint.innerHTML = 'Need a refresher on the icons? <a href="/help/">See Help</a>.'
										card.appendChild(hint)
										view.insertBefore(card, colourGuide)
									}
								}
							}, 1200)
						}
					}
				})
				.catch((error) => {
					console.log("Error:", error)
				})
		}
	}

	// Add click to custom map
	var customMapImages = document.querySelectorAll(".startingMap")
	for (let i = 0; i < customMapImages.length; i++) {
		customMapImages[i].onclick = function (e) {
			e.stopPropagation() // stops the browser from redirecting.
			e.preventDefault()
			let form
			if (this.getAttribute("data-game") === "FCM") {
				document.getElementById("mapData").value = this.getAttribute("data-map")
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
			if (this.getAttribute("data-game") === "RNB") {
				// Go to /RNB/showRNBmap/{gameID}
				window.location.href = "/RNB/" + this.getAttribute("data-gameID") + "/maponly/"
				return
			}
			form.submit()
		}
		/*customMapImages[i].onmouseenter = function () {
			this.style.opacity = "0.4"
			this.style.cursor = "pointer"
		}

		customMapImages[i].onmouseleave = function () {
			this.style.opacity = ""
		}*/
	}

	// Add TGZ info
	let customTGZinfos = document.querySelectorAll(".TGZinfoContainer")
	for (let i = 0; i < customTGZinfos.length; i++) {
		customTGZinfos[i].onclick = function (e) {
			e.stopPropagation() // stops the browser from redirecting.
			e.preventDefault()
			const ndPrefix = document.body.classList.contains("nd") ? "/nd" : ""
			window.location.href = ndPrefix + "/showTGZoptions/" + this.parentNode.parentNode.id.slice(11)
		}

		customTGZinfos[i].addEventListener("contextmenu", function (event) {
			event.preventDefault()
		})

		customTGZinfos[i].addEventListener("touchstart", function (event) {
			if (document.body.classList.contains("nd")) return

			event.preventDefault()
			const TGZinfoPopup = this.querySelector(".TGZinfoPopup")
			// Calculate the left position of the pop-up
			const popupWidth = 625
			const screenWidth = window.innerWidth
			const cursorX = event.clientX
			const leftPosition = cursorX + popupWidth > screenWidth ? screenWidth - popupWidth - 200 : cursorX

			// Set the left position of the pop-up
			TGZinfoPopup.style.left = leftPosition + "px"

			// Show the pop-up
			TGZinfoPopup.style.display = "block"
		})

		customTGZinfos[i].onmouseenter = function (event) {
			this.style.opacity = "0.9"
			this.style.cursor = "pointer"

			const TGZinfoPopup = this.querySelector(".TGZinfoPopup")
			if (document.body.classList.contains("nd")) {
				TGZinfoPopup.style.left = ""
				TGZinfoPopup.style.display = "block"
				return
			}
			// Calculate the left position of the pop-up
			const popupWidth = 625
			const screenWidth = window.innerWidth
			const cursorX = event.clientX
			const leftPosition = cursorX + popupWidth > screenWidth ? screenWidth - popupWidth - 200 : cursorX

			// Set the left position of the pop-up
			TGZinfoPopup.style.left = leftPosition + "px"

			// Show the pop-up
			TGZinfoPopup.style.display = "block"
		}

		customTGZinfos[i].onmouseleave = function () {
			this.style.opacity = ""
			const TGZinfoPopup = this.querySelector(".TGZinfoPopup")
			TGZinfoPopup.style.display = "none"
		}
	}

	// Add RNB info
	/*let customRNBinfos = document.querySelectorAll(".RNBinfoContainer")
	for (let i = 0; i < customRNBinfos.length; i++) {
		customRNBinfos[i].onclick = function (e) {
			e.stopPropagation() // stops the browser from redirecting.
			e.preventDefault()
			window.location.href = "/showRNBoptions/" + this.parentNode.parentNode.id.slice(11) // Replace 'another_page' with the actual URL name or path for the destination page
		}

		customRNBinfos[i].addEventListener("contextmenu", function (event) {
			event.preventDefault()
		})

		customRNBinfos[i].addEventListener("touchstart", function (event) {
			event.preventDefault()
			const RNBinfoPopup = this.querySelector(".RNBinfoPopup")
			// Calculate the left position of the pop-up
			const popupWidth = 625
			const screenWidth = window.innerWidth
			const cursorX = event.clientX
			const leftPosition = cursorX + popupWidth > screenWidth ? screenWidth - popupWidth - 200 : cursorX

			// Set the left position of the pop-up
			RNBinfoPopup.style.left = leftPosition + "px"

			// Show the pop-up
			RNBinfoPopup.style.display = "block"
		})

		customRNBinfos[i].onmouseenter = function (event) {
			this.style.opacity = "0.9"
			this.style.cursor = "pointer"

			const RNBinfoPopup = this.querySelector(".RNBinfoPopup")
			// Calculate the left position of the pop-up
			const popupWidth = 625
			const screenWidth = window.innerWidth
			const cursorX = event.clientX
			const leftPosition = cursorX + popupWidth > screenWidth ? screenWidth - popupWidth - 200 : cursorX

			// Set the left position of the pop-up
			RNBinfoPopup.style.left = leftPosition + "px"

			// Show the pop-up
			RNBinfoPopup.style.display = "block"
		}

		customRNBinfos[i].onmouseleave = function () {
			this.style.opacity = ""
			const RNBinfoPopup = this.querySelector(".RNBinfoPopup")
			RNBinfoPopup.style.display = "none"
		}
	}*/

	// Add click to open all games button
	if (!global.joinGameLink) {
		let openAllGamesButton = document.querySelector("#openAllMyMoveGamesButton")
		if (openAllGamesButton) {
			openAllGamesButton.onclick = function (e) {
				e.stopPropagation() // stops the browser from redirecting.
				e.preventDefault()
				for (let i = 0; i < global.myMoveGamesData.length; i++) {
					let URL = `/${global.myMoveGamesData[i][0]}/${global.myMoveGamesData[i][1]}/`
					// Open URLs in the sidebar for mobile devices
					//window.open(URL, "_blank")
					// Open URLs in new tabs for desktop
					//let newTab = window.open()
					//newTab.location.href = URL
					let newTab = window.open()
					newTab.opener = null // This line helps prevent some pop-up blockers
					newTab.location.href = URL
				}
			}
		}
	}

	// Add click to stop emails 1 hr button
	/*if (!global.joinGameLink) {
		let stopEmailsButton = document.querySelector("#stopEmailsButton")
		if (global.stopEmailsUntil) {
			let milliseconds = global.stopEmailsUntil * 60 * 1000 // Convert seconds to milliseconds

			// Convert Unix timestamp to local time
			let localDateTime = new Date(milliseconds)

			// Get hours and minutes with leading zeros if needed
			let hours = localDateTime.getHours().toString().padStart(2, "0")
			let minutes = localDateTime.getMinutes().toString().padStart(2, "0")

			// Format the local time in hh:mm format
			let timeFormatted = `${hours}:${minutes}`
			stopEmailsButton.innerHTML = `Emails stopped until: ${timeFormatted}. Click to restart now`
		} else stopEmailsButton.innerHTML = "Stop 'Your Turn' emails for 1 hour"
		if (stopEmailsButton) {
			stopEmailsButton.onclick = async function (e) {
				stopEmailsButton.innerHTML = "Setting emails..."
				stopEmailsButton.disabled = true
				let csrftoken = getCookie("csrftoken")
				e.stopPropagation() // stops the browser from redirecting.
				e.preventDefault()
				try {
					const response = await fetch("/setStopEmails/", {
						method: "POST",
						//body: JSON.stringify({
						//	myMoveCount: global.myMoveCount,
						//	availableCount: global.availableCount,
						//	invitationsCount: global.invitationsCount,
						//}),
						headers: { "X-CSRFToken": csrftoken },
					})

					if (!response.ok) {
						throw new Error("Network response was not ok")
					}
					const data = await response.json()
					console.log(data.result)
					console.log(typeof data.result)
					if (data.result == null) {
						stopEmailsButton.innerHTML = "Stop 'Your Turn' emails for 1 hour"
					} else {
						let milliseconds = data.result * 60 * 1000 // Convert seconds to milliseconds

						// Convert Unix timestamp to local time
						let localDateTime = new Date(milliseconds)

						// Get hours and minutes with leading zeros if needed
						let hours = localDateTime.getHours().toString().padStart(2, "0")
						let minutes = localDateTime.getMinutes().toString().padStart(2, "0")

						// Format the local time in hh:mm format
						let timeFormatted = `${hours}:${minutes}`
						stopEmailsButton.innerHTML = `Emails stopped until: ${timeFormatted}. Click to restart now`
					}

					stopEmailsButton.disabled = false
				} catch (error) {
					console.error("Error fetching data:", error)
				}
			}
		}
	}*/

	if (!global.joinGameLink) {
		show_gamesList(global.listType)
		var pollInterval = null
		function startLobbyPolling() {
			if (pollInterval !== null) return
			pollInterval = setInterval(checkLobbyUpdates, 120000)
		}
		function stopLobbyPolling() {
			if (pollInterval === null) return
			clearInterval(pollInterval)
			pollInterval = null
		}
		startLobbyPolling()
		document.addEventListener("visibilitychange", function () {
			if (document.hidden) stopLobbyPolling()
			else startLobbyPolling()
		})
	} else if (global.joinGameLink) document.getElementById("availableGamesListView").style.display = "block"
}) // END INIT LOBBY

/*async function checkLobbyUpdates() {
	let csrftoken = getCookie("csrftoken")

	try {
		const response = await fetch("/dataCheck/", {
			method: "POST",
			body: JSON.stringify({
				myMoveCount: global.myMoveCount,
				availableCount: global.availableCount,
				invitationsCount: global.invitationsCount,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})

		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.latest === true) return
		else {
			location.reload()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}*/

async function checkLobbyUpdates() {
	let csrftoken = getCookie("csrftoken")

	try {
		const response = await fetch("/dataCheck/", {
			method: "POST",
			headers: {
				"X-CSRFToken": csrftoken,
				"Content-Type": "application/json", // Important: Specify content type
				"If-None-Match": global.etag, // Send the ETag
			},
			body: JSON.stringify({
				myMoveCount: global.myMoveCount,
				availableCount: global.availableCount,
				invitationsCount: global.invitationsCount,
			}),
		})

		if (!response.ok) {
			if (response.status === 304) {
				// Not Modified - No need to reload
				return
			} else {
				throw new Error("Network response was not ok")
			}
		}

		const data = await response.json()
		console.log(global.listType)
		if (data.latest === false) {
			// Use global.listType to preserve the currently showing list
			if (global.listType === "current") window.location.href = "/index/current/"
			else if (global.listType === "waiting") window.location.href = "/index/waiting/"
			else if (global.listType === "available") window.location.href = "/index/available/"
			else if (global.listType === "invitations") window.location.href = "/index/invitations/"
			else if (global.listType === "finished") window.location.href = "/index/finished/"
			else location.reload()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

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
				//if (result == "ACTIVE") show_gamesList('current')
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
	if (element.classList.contains("nd-row09")) {
		const currentHeight = element.offsetHeight
		const duration = 500

		element.style.transition = `opacity ${duration}ms`
		element.style.opacity = "0"

		setTimeout(() => {
			element.style.boxSizing = "border-box"
			element.style.height = `${currentHeight}px`
			element.style.minHeight = "0"
			element.style.overflow = "hidden"
			void element.offsetHeight

			element.style.transition = "height 0.5s ease-out, padding 0.5s ease-out, border-width 0.5s ease-out"
			element.style.height = "0"
			element.style.paddingBlock = "0"
			element.style.borderBottomWidth = "0"
			element.addEventListener("transitionend", (event) => {
				if (event.target === element && event.propertyName === "height") element.remove()
			})
		}, duration + 100)
		return
	}

	const tableCells = element.getElementsByTagName("td")
	const currentHeight = element.offsetHeight + 0
	const duration = 500

	element.style.transition = `opacity ${duration}ms`
	element.style.opacity = "0"

	setTimeout(() => {
		element.style.minHeight = `${currentHeight}px`
		element.style.height = `${currentHeight}px`

		while (tableCells.length > 0) {
			tableCells[0].remove()
		}

		setTimeout(() => {
			element.style.transition = "height 0.5s ease-out, min-height 0.5s step-end"
			element.style.height = "0"
			element.style.minHeight = `${currentHeight}px`

			element.addEventListener("transitionend", () => {
				element.remove()
			})
		}, 0)
	}, duration + 100)
}

function show_gamesList(listType) {
	global.listType = listType
	// Update Tab bar

	var tablinks = document.getElementsByClassName("tablinks")
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "")
	}

	document.getElementById(listType).classList.add("active")

	// Hide all games
	document.getElementById("availableGamesListSquares").style.display = "none"
	document.getElementById("availableGamesListView").style.display = "none"
	document.getElementById("currentGamesListView").style.display = "none"
	document.getElementById("waitingGamesListView").style.display = "none"
	document.getElementById("invitationGamesListView").style.display = "none"
	document.getElementById("finishedGamesListView").style.display = "none"

	if (displayType === "squares") {
		if (listType == "available") {
			document.getElementById("availableGamesListSquares").style.display = "flex"
			document.getElementById("availableGamesListSquares").style.flexWrap = "wrap"
			document.getElementById("availableGamesListSquares").style.margin = "auto"
			document.getElementById("availableGamesListSquares").style.justifyContent = "space-around"
		}
	} else if (displayType === "tables") {
		if (listType == "available") document.getElementById("availableGamesListView").style.display = "block"
		if (listType == "current") document.getElementById("currentGamesListView").style.display = "block"
		if (listType == "waiting") document.getElementById("waitingGamesListView").style.display = "block"
		if (listType == "invitations") document.getElementById("invitationGamesListView").style.display = "block"
		if (listType == "finished") document.getElementById("finishedGamesListView").style.display = "block"
	}
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
