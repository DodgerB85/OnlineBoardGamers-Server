// Plumbing shared by every game's create page. Each game keeps its own
// validateOptions / selectPlayers / initGameCreation in Lobby/createXXX.js;
// only the helpers that were identical in all of them live here.
// Loaded before Lobby/createXXX.js on every create page.

// get CSRF for javascript
function getCookie(name) {
	var cookieValue = null
	if (document.cookie && document.cookie !== "") {
		var cookies = document.cookie.split(";")
		for (var i = 0; i < cookies.length; i++) {
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

function removeOption(option) {
	var el = document.getElementById(option)
	if (!el) return
	el.checked = false
	el.disabled = true
}

function addOption(option) {
	if (option === "experiencedGame" && !global.experienced) return
	var el = document.getElementById(option)
	if (!el) return
	el.disabled = false
}

var GAME_TYPE_OPTIONS = ["trainingGame", "learningGame", "experiencedGame"]
var SHADOW_NAMES = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]

// Empties every seat box the page has (2..6); a game only renders the ones it uses.
function clearSeatNames() {
	for (var i = 2; i <= 6; i++) {
		var input = document.getElementById("player" + i)
		if (!input) continue
		input.value = ""
		input.disabled = false
	}
}

// Shows the seat rows for the chosen player count, empties the unused ones and
// fills in the practice-game shadow names.
function showSeats() {
	var maxPlayers = parseInt(document.getElementById("playerNumber").value)
	var practice = document.getElementById("trainingGame").checked
	document.getElementById("player2help").innerHTML = practice ? '<span style="background-color: yellow; color: darkred;">' + global.player2practiceText + "</span>" : global.player2normText
	for (var i = 2; i <= 6; i++) {
		var input = document.getElementById("player" + i)
		if (!input) continue
		var row = document.getElementById("selPlayer" + i)
		var inUse = i <= maxPlayers
		if (row) row.style.display = inUse ? "flex" : "none"
		if (!inUse) input.value = ""
		else if (practice) input.value = SHADOW_NAMES[i - 2]
	}
}

// The practice / learning / experienced checkboxes behave the same on every
// create page. `followers` are the extra option ids that only belong to a
// normal game - they are disabled with a practice game and restored after.
function validateGameType(change, followers) {
	var checked = document.getElementById(change).checked
	if (change === "trainingGame") {
		if (checked) {
			removeOption("learningGame")
			removeOption("privateGame")
			removeOption("experiencedGame")
		} else {
			addOption("learningGame")
			addOption("privateGame")
			if (global.experienced) addOption("experiencedGame")
		}
		var options = followers || []
		options.forEach(function (option) {
			if (checked) removeOption(option)
			else addOption(option)
		})
		clearSeatNames()
	} else if (change === "learningGame") {
		if (checked) {
			removeOption("trainingGame")
			removeOption("experiencedGame")
			document.getElementById("playerNumber").value = 2
			document.getElementById("playerNumber").disabled = true
		} else {
			document.getElementById("playerNumber").disabled = false
			addOption("trainingGame")
			if (global.experienced) addOption("experiencedGame")
		}
	} else {
		removeOption("trainingGame")
		removeOption("learningGame")
		if (checked) clearSeatNames()
		else {
			addOption("trainingGame")
			addOption("learningGame")
		}
	}
	selectPlayers()
}

// Kickout choices per pace come from Lobby/kickoutOptions.html so the labels stay translated.
function setKickoutOptions() {
	var pace = parseInt(document.getElementById("pace").value)
	var select = document.getElementById("kickoutDuration")
	// Read the new list before clearing: a missing kickoutOptions must not leave
	// the select empty, or the field is dropped from the POST.
	var options = global.kickoutOptions[pace] || global.kickoutOptions[30]
	var previous = select.value
	select.innerHTML = ""
	options.forEach(function (option) {
		select.add(new Option(option[1], option[0]))
	})
	select.value = previous
	if (select.value == "") select.selectedIndex = 0
	document.getElementById("blitzWarningSpan").style.display = pace == 10 ? "block" : "none"
}

function autocomplete(inp) {
	/*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
	var currentFocus
	var searchtimer

	/*execute a function when someone writes in the text field:*/
	inp.addEventListener("input", function (e) {
		// Mini tournament pages have no practice checkbox, and their invite box
		// always needs the player search.
		if (!global.MT_Creation && document.getElementById("trainingGame").checked) return
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
					partialString: this.value,
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

async function invitePlayerMT(e) {
	e.preventDefault()
	document.getElementById("invitedPlayersWarningSpanMT").innerText = ""

	// Get the input value from the autocomplete field
	const input = document.getElementById("playerToInviteMT")
	const username = input.value.trim()

	if (!username) {
		document.getElementById("invitedPlayersWarningSpanMT").innerText = "Please enter a username"
		return
	}

	const inviteButton = document.querySelector("#invitePlayerMTbutton")
	inviteButton.disabled = true
	inviteButton.textContent = "Adding Player...."

	let csrftoken = getCookie("csrftoken")
	try {
		const response = await fetch("/addPlayerToMTinvites/", {
			method: "POST",
			body: JSON.stringify({
				username: username,
			}),
			headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.success === 1) {
			if (global.invitedPlayersArr.includes(username)) {
				document.getElementById("invitedPlayersWarningSpanMT").innerText = "Player already invited"
			} else {
				global.invitedPlayersArr.push(username)
				displayInvitedPlayersMT()
			}
			input.value = ""
		} else if (data.success === 2) document.getElementById("invitedPlayersWarningSpanMT").innerText = "Player does not exist"
		else if (data.success === 3) document.getElementById("invitedPlayersWarningSpanMT").innerText = "You will be added automatically"
		inviteButton.textContent = "Add Player to Invite List"
		inviteButton.disabled = false
	} catch (error) {
		console.error("Error fetching data:", error)
		document.getElementById("invitedPlayersWarningSpanMT").innerText = "Error adding player to invite list"
		inviteButton.disabled = false
	}
}

function displayInvitedPlayersMT() {
	let span = document.getElementById("invitedPlayersSpanMT")
	let invitedPlayers = global.invitedPlayersArr.join(", ")
	span.innerHTML = "<br/>Invited Players: " + invitedPlayers

	let hiddenInput = document.getElementById("invtedPlayersListMT")
	hiddenInput.value = JSON.stringify(global.invitedPlayersArr)
}
