// No text

var SHADOW_NAMES = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]

// A game is either practice, learning or experienced, never a mixture.
var GAME_TYPE_OPTIONS = ["trainingGame", "learningGame", "experiencedGame"]

function initGameCreation(fillData, setupData = {}) {
	if (global.experienced) document.getElementById("experiencedGame").disabled = false

	selectPlayers()

	if (fillData) {
		document.getElementById("name").value = setupData.gameName
		document.getElementById("description").value = setupData.gameDescription
		document.getElementById("pace").value = setupData.gamePace
		if (document.getElementById("pace").value == "") document.getElementById("pace").selectedIndex = 2
		document.getElementById("playerNumber").value = setupData.playerNumber

		for (var i = 0; i < setupData.playerNames.length; i++) {
			document.getElementById("player" + String(i + 2)).value = setupData.playerNames[i]
		}

		document.getElementById("kickoutDuration").value = setupData.kickoutDuration
		if (document.getElementById("kickoutDuration").value == "") document.getElementById("kickoutDuration").selectedIndex = 0

		var startingOptions = setupData.startingOptions

		if (startingOptions.includes(102)) document.getElementById("trainingGame").checked = true
		if (startingOptions.includes(110)) document.getElementById("learningGame").checked = true
		if (startingOptions.includes(120)) document.getElementById("experiencedGame").checked = true

		// Restores the shadow names a rematch of a practice game will use.
		selectPlayers()
	}
}

function validateOptions(change) {
	if (change === "privateGame") return

	var checked = document.getElementById(change).checked

	GAME_TYPE_OPTIONS.forEach(function (option) {
		if (option === change) return
		if (checked) removeOption(option)
		else addOption(option)
	})

	// A practice game has nobody to invite, so it cannot also be private.
	if (change === "trainingGame") {
		if (checked) removeOption("privateGame")
		else addOption("privateGame")
		// Either way the seats must not still hold shadow placeholders or the
		// real usernames a previous setup left behind.
		clearPlayerNames()
	} else if (checked) {
		// Learning and experienced games need real usernames, not shadows.
		clearShadowNames()
	}

	selectPlayers()
}

function removeOption(option) {
	document.getElementById(option).checked = false
	document.getElementById(option).disabled = true
}

function addOption(option) {
	if (option === "experiencedGame" && !global.experienced) return
	document.getElementById(option).disabled = false
}

function clearPlayerNames() {
	for (var i = 2; i <= 6; i++) {
		var input = document.getElementById("player" + i)
		if (input) input.value = ""
	}
}

function clearShadowNames() {
	for (var i = 2; i <= 6; i++) {
		var input = document.getElementById("player" + i)
		if (input && SHADOW_NAMES.indexOf(input.value) !== -1) input.value = ""
	}
}

function selectPlayers() {
	var maxPlayers = parseInt(document.getElementById("playerNumber").value)
	var training = document.getElementById("trainingGame").checked

	document.getElementById("player2help").innerHTML = training ? '<span style="background-color: yellow; color: darkred;">' + global.player2practiceText + "</span>" : global.player2normText

	for (var i = 2; i <= 6; i++) {
		var row = document.getElementById("selPlayer" + i)
		var input = document.getElementById("player" + i)
		var inUse = i <= maxPlayers
		row.style.display = inUse ? "flex" : "none"
		if (!inUse) input.value = ""
		// Show the names a practice game will use, but never overwrite an
		// in-game name the player has already typed.
		else if (training && (!input.value || SHADOW_NAMES.indexOf(input.value) !== -1)) input.value = SHADOW_NAMES[i - 2]
	}
}

function autocomplete(inp) {
	/*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
	var currentFocus
	var searchtimer

	/*execute a function when someone writes in the text field:*/
	inp.addEventListener("input", function (e) {
		if (document.getElementById("trainingGame").checked) return
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
