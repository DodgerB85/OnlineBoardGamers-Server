/* global global */

// TEXT IN WEBHOOK ALERTS
document.addEventListener("DOMContentLoaded", function () {
	let stopEmailsButton = document.querySelector("#stopEmailsButton")
	if (global.stopEmailsUntil >= 0) {
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

	autocomplete(document.getElementById("blacklistPlayer"))

	//let ALL_GAMES = ["FCM", "HC", "Bus", "TGZ", "CNS", "AQY", "IND", "RNB"]

	document.querySelectorAll(".yourTurnTR td").forEach((td) => {
		td.addEventListener("click", () => {
			const radio = td.querySelector('input[type="radio"]')
			if (radio) {
				radio.checked = true
			}
		})
	})
	document.querySelectorAll(".essentialTR td").forEach((td) => {
		td.addEventListener("click", () => {
			const radio = td.querySelector('input[type="radio"]')
			if (radio) {
				radio.checked = true
			}
		})
	})
	document.querySelectorAll(".informationTR td").forEach((td) => {
		td.addEventListener("click", () => {
			const radio = td.querySelector('input[type="radio"]')
			if (radio) {
				radio.checked = true
			}
		})
	})
	document.querySelectorAll(".dailyReminderTR td").forEach((td) => {
		td.addEventListener("click", () => {
			const radio = td.querySelector('input[type="radio"]')
			if (radio) {
				radio.checked = true
			}
		})
	})
}) // END INIT

function askForBrowserNotifications() {
	Notification.requestPermission().then((permission) => {
		if (permission === "granted") {
			alert("Notification permission granted")
		} else if (permission === "denied") {
			alert("Notification permission denied - check browser settings to re-enable")
		} else {
			//alert("Notification permission has not been granted or denied.")
		}
	})
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

function changeWebhookType(selectedValue) {
	if (selectedValue === "DC") {
		document.getElementById("webhookURL").placeholder = "EG https://discordapp.com/api/webhooks/xxxxxxxxxxxxx/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
		document.getElementById("webhookURL").disabled = false
		document.getElementById("webhookUserID").placeholder = "Optional: Leave blank if unsure. Input 18 digit discord user ID if you wish to include '@'"
		document.getElementById("webhookUserID").disabled = false
		let telegramInfos = document.getElementsByClassName("telegramInfo")
		for (let i = 0; i < telegramInfos.length; i++) {
			telegramInfos[i].style.display = "none"
		}
	} else if (selectedValue === "SL") {
		document.getElementById("webhookURL").placeholder = "EG https://hooks.slack.com/services/xxxxxxxxxx/xxxxxxxxxx/xxxxxxxxxxxxxxxxxxx"
		document.getElementById("webhookURL").disabled = false
		document.getElementById("webhookUserID").placeholder = "Optional: Slack ID (e.g., U123ABC456)"
		document.getElementById("webhookUserID").disabled = false
		let telegramInfos = document.getElementsByClassName("telegramInfo")
		for (let i = 0; i < telegramInfos.length; i++) {
			telegramInfos[i].style.display = "none"
		}
	} else if (selectedValue === "TG") {
		document.getElementById("webhookURL").placeholder = "Not Required For Telegram"
		document.getElementById("webhookURL").disabled = true
		document.getElementById("webhookUserID").placeholder = "EG: 1234567890. Click link"
		document.getElementById("webhookUserID").disabled = false
		let telegramInfos = document.getElementsByClassName("telegramInfo")
		for (let i = 0; i < telegramInfos.length; i++) {
			telegramInfos[i].style.display = "block"
		}
	} else if (selectedValue === "OT") {
		document.getElementById("webhookURL").placeholder = "Webhook URL"
		document.getElementById("webhookURL").disabled = false
		document.getElementById("webhookUserID").placeholder = "User ID"
		document.getElementById("webhookUserID").disabled = false
		let telegramInfos = document.getElementsByClassName("telegramInfo")
		for (let i = 0; i < telegramInfos.length; i++) {
			telegramInfos[i].style.display = "none"
		}
	}
}

function testWebhook(id, notification) {
	document.getElementById(id).disabled = true
	document.getElementById(id).innerText = "Sending..."

	let csrftoken = getCookie("csrftoken")

	fetch("/testWebhook/", {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json; charset=UTF-8",
			"X-CSRFToken": csrftoken,
		},
		body: JSON.stringify({
			notification: notification,
		}),
	})
		.then((response) => response.json())
		.then((result) => {
			// Prepend actions. // Close consent
			if (result.errorMessage) {
				document.getElementById(id).innerText = "Result Error"
				console.log(result.errorMessage)
				return
			} else {
				//if (result.type == 0) alert(gettext("A test message has been sent. Please check your Discord channel"));
				//if (result.type == 1) alert(gettext("A test message has been sent. Please check your Slack"));
				//document.getElementById("submissionSource").value = "webhookTest"
				//document.getElementById("notificationForm").submit()
				document.getElementById(id).innerText = "Sent"
				document.getElementById(id).disabled = false
			}
		})
		.catch((error) => {
			document.getElementById(id).innerText = "Error"
			console.log("Error:", error)
		})
}

function autocomplete(inp) {
	/*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
	var currentFocus
	var searchtimer

	/*execute a function when someone writes in the text field:*/
	inp.addEventListener("input", function (e) {
		clearTimeout(searchtimer)
		searchtimer = setTimeout(() => {
			var a,
				b,
				i,
				val = this.value
			/*close any already open lists of autocompleted values*/
			closeAllLists()
			if (!val) {
				return false
			}
			currentFocus = -1
			/*create a DIV element that will contain the items (values):*/
			a = document.createElement("DIV")
			a.setAttribute("id", this.id + "autocomplete-list")
			a.setAttribute("class", "autocomplete-items")
			/*append the DIV element as a child of the autocomplete container:*/
			this.parentNode.appendChild(a)

			let csrftoken = getCookie("csrftoken")

			fetch("/autoCompleteUsername/", {
				method: "POST",
				body: JSON.stringify({
					//id: global.gameId,
					partialString: this.value,
					//turn: turn,
					//phase: phase,
					//gameID: global.gameID
				}),
				headers: { "X-CSRFToken": csrftoken },
			})
				.then((response) => response.json())
				.then((result) => {
					var arr = result.matchList
					var matchesFound = false
					for (i = 0; i < arr.length; i++) {
						/*check if the item starts with the same letters as the text field value:*/
						if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
							matchesFound = true
							/*create a DIV element for each matching element:*/
							b = document.createElement("DIV")
							/*make the matching letters bold:*/
							b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>"
							b.innerHTML += arr[i].substr(val.length)
							/*insert a input field that will hold the current array item's value:*/
							b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>"
							/*execute a function when someone clicks on the item value (DIV element):*/
							b.addEventListener("click", function (e) {
								/*insert the value for the autocomplete text field:*/
								inp.value = this.getElementsByTagName("input")[0].value
								/*close the list of autocompleted values,
                                (or any other open lists of autocompleted values:*/
								closeAllLists()
							})
							a.appendChild(b)
						}
					}
					if (matchesFound === false) {
						b = document.createElement("DIV")
						b.innerHTML = "<strong>No User Found</strong>"
						a.appendChild(b)
					}
				})
				.catch((error) => {
					console.log("Error:", error)
				})
		}, 500)
	})

	/*execute a function presses a key on the keyboard:*/
	inp.addEventListener("keydown", function (e) {
		var x = document.getElementById(this.id + "autocomplete-list")
		if (x) x = x.getElementsByTagName("div")
		if (e.keyCode == 40) {
			/*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
			currentFocus++
			/*and and make the current item more visible:*/
			addActive(x)
		} else if (e.keyCode == 38) {
			//up
			/*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
			currentFocus--
			/*and and make the current item more visible:*/
			addActive(x)
		} else if (e.keyCode == 13) {
			/*If the ENTER key is pressed, prevent the form from being submitted,*/
			e.preventDefault()
			if (currentFocus > -1) {
				/*and simulate a click on the "active" item:*/
				if (x) x[currentFocus].click()
			}
		}
	})

	function addActive(x) {
		/*a function to classify an item as "active":*/
		if (!x) return false
		/*start by removing the "active" class on all items:*/
		removeActive(x)
		if (currentFocus >= x.length) currentFocus = 0
		if (currentFocus < 0) currentFocus = x.length - 1
		/*add class "autocomplete-active":*/
		x[currentFocus].classList.add("autocomplete-active")
	}
	function removeActive(x) {
		/*a function to remove the "active" class from all autocomplete items:*/
		for (var i = 0; i < x.length; i++) {
			x[i].classList.remove("autocomplete-active")
		}
	}

	function closeAllLists(elmnt) {
		/*close all autocomplete lists in the document,
        except the one passed as an argument:*/
		var x = document.getElementsByClassName("autocomplete-items")
		for (var i = 0; i < x.length; i++) {
			if (elmnt != x[i] && elmnt != inp) {
				x[i].parentNode.removeChild(x[i])
			}
		}
	}

	/*execute a function when someone clicks in the document:*/
	document.addEventListener("click", function (e) {
		closeAllLists(e.target)
	})
}

function addPlayerToBlacklist() {
	let blackListPlayer = document.getElementById("blacklistPlayer").value
	document.getElementById("blacklistError").innerText = ""
	document.getElementById("blacklistSuccess").innerText = ""

	let csrftoken = getCookie("csrftoken")

	fetch("/blacklistPlayer/", {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json; charset=UTF-8",
			"X-CSRFToken": csrftoken,
		},
		body: JSON.stringify({
			blackListPlayer: blackListPlayer,
			action: "addPlayerToBlacklist",
		}),
	})
		.then((response) => response.json())
		.then((result) => {
			// Prepend actions. // Close consent
			if (result.errorMessage) {
				document.getElementById("blacklistError").innerText = result.errorMessage
				return
			} else {
				document.getElementById("blacklistSuccess").innerText = blackListPlayer + " has been added to your blacklist"
				// Remove "no players"
				let elementToRemove = document.getElementById("noBlacklistedPlayers")
				if (elementToRemove) {
					elementToRemove.remove() // Remove the element if it exists
				}
				// Add the new player
				// Create a new blacklisted player div
				let newPlayerDiv = document.createElement("div")
				newPlayerDiv.classList.add("blacklistedPlayer")
				newPlayerDiv.id = "BL" + blackListPlayer

				// Create a span for the player name
				let playerNameSpan = document.createElement("span")
				playerNameSpan.textContent = blackListPlayer

				// Create a button to remove the player
				let removeButton = document.createElement("button")
				removeButton.classList.add("removePlayerBtn")
				removeButton.textContent = "❌"
				removeButton.onclick = function () {
					event.preventDefault()
					removePlayerFromBlacklist(blackListPlayer)
				}

				// Append the span and button to the new player div
				newPlayerDiv.appendChild(playerNameSpan)
				newPlayerDiv.appendChild(removeButton)

				// Append the new player div to the blacklistedPlayers section
				var blacklistedPlayersSection = document.querySelector(".blacklistedPlayers")
				blacklistedPlayersSection.appendChild(newPlayerDiv)
			}
		})
		.catch((error) => {
			document.getElementById("blacklistError").innerText = "Error"
			console.log("Error:", error)
		})
}

function removePlayerFromBlacklist(blackListPlayer) {
	document.getElementById("blacklistError").innerText = ""
	document.getElementById("blacklistSuccess").innerText = ""

	let csrftoken = getCookie("csrftoken")

	fetch("/blacklistPlayer/", {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json; charset=UTF-8",
			"X-CSRFToken": csrftoken,
		},
		body: JSON.stringify({
			blackListPlayer: blackListPlayer,
			action: "removePlayerFromBlacklist",
		}),
	})
		.then((response) => response.json())
		.then((result) => {
			// Prepend actions. // Close consent
			if (result.errorMessage) {
				document.getElementById("blacklistError").innerText = result.errorMessage
				return
			} else {
				document.getElementById("blacklistSuccess").innerText = blackListPlayer + " has been removed from your blacklist"
				document.getElementById("BL" + blackListPlayer).remove()
			}
		})
		.catch((error) => {
			document.getElementById("blacklistError").innerText = "Error"
			console.log("Error:", error)
		})
}
/* End Profile Page */
