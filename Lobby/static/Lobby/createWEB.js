// No text

function initGameCreation(fillData, setupData = {}) {
	if (global.experienced) document.getElementById("experiencedGame").disabled = false

	selectPlayers()

	if (fillData) {
		document.getElementById("name").value = setupData.gameName
		document.getElementById("description").value = setupData.gameDescription
		document.getElementById("pace").value = setupData.gamePace
		if (document.getElementById("pace").value == "") document.getElementById("pace").selectedIndex = "2"
		validateOptions("pace")
		document.getElementById("playerNumber").value = setupData.playerNumber
		selectPlayers()

		for (var i = 0; i < setupData.playerNames.length; i++) {
			document.getElementById("player" + String(i + 2)).value = setupData.playerNames[i]
		}

		document.getElementById("kickoutDuration").value = setupData.kickoutDuration
		if (document.getElementById("kickoutDuration").value == "") document.getElementById("kickoutDuration").selectedIndex = "0"

		var startingOptions = setupData.startingOptions

		if (startingOptions.includes(102)) {
			document.getElementById("trainingGame").checked = true
			validateOptions("trainingGame")
		}
		if (startingOptions.includes(1)) {
			document.getElementById("useMerchants").checked = true
		}
		//if (startingOptions.includes(2)) {
		//	document.getElementById("useAllPromos").checked = true
		//}
	}
}

function validateOptions(change) {
	var el
	if (change == "pace") {
		document.getElementById("kickoutDuration").innerHTML = ""
		// Blitz
		if (document.getElementById("pace").value == 10) {
			el = document.createElement("option")
			el.value = 5
			el.innerHTML = "5 Minutes"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 10
			el.innerHTML = "10 Minutes"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 20
			el.innerHTML = "20 Minutes"
			document.getElementById("kickoutDuration").appendChild(el)

			document.getElementById("blitzWarningSpan").style.display = "block"
		}
		// Live
		else if (document.getElementById("pace").value == 20) {
			el = document.createElement("option")
			el.value = 50
			el.innerHTML = "12 hours"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 100
			el.innerHTML = "1 day"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")

			document.getElementById("blitzWarningSpan").style.display = "none"

			// Unlock from 2p
			document.getElementById("playerNumber").disabled = false

			selectPlayers()
		}
		// Fast / std / slow
		else if (document.getElementById("pace").value >= 30) {
			el = document.createElement("option")
			el.value = 100
			el.innerHTML = "1 day"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 200
			el.innerHTML = "2 days"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 300
			el.innerHTML = "3 days"
			document.getElementById("kickoutDuration").appendChild(el)
			el = document.createElement("option")
			el.value = 500
			el.innerHTML = "5 days"
			document.getElementById("kickoutDuration").appendChild(el)

			document.getElementById("blitzWarningSpan").style.display = "none"

			// Unlock from 2p
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
		}
	} else if (change === "trainingGame") {
		if (document.getElementById(change).checked == true) {
			//document.getElementById('playerNumber').value = 2;
			//document.getElementById('playerNumber').disabled = true;
			removeOption("learningGame")
			removeOption("experiencedGame")
			removeOption("privateGame")
			selectPlayers()
		} else {
			addOption("learningGame")
			addOption("privateGame")
			if (global.experienced) addOption("experiencedGame")
			document.getElementById("player2").value = ""
			document.getElementById("player2").disabled = false
			document.getElementById("player3").value = ""
			document.getElementById("player3").disabled = false
			document.getElementById("player4").value = ""
			document.getElementById("player4").disabled = false
			document.getElementById("player5").value = ""
			document.getElementById("player5").disabled = false
			document.getElementById("player6").value = ""
			document.getElementById("player6").disabled = false
			selectPlayers()
		}
	} else if (change === "learningGame") {
		if (document.getElementById(change).checked == true) {
			removeOption("trainingGame")
			removeOption("experiencedGame")
			document.getElementById("playerNumber").value = 2
			document.getElementById("playerNumber").disabled = true
			selectPlayers()
		} else {
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
			addOption("trainingGame")
			if (global.experienced) addOption("experiencedGame")
		}
	} else if (change === "experiencedGame") {
		if (document.getElementById(change).checked == true) {
			removeOption("trainingGame")
			removeOption("learningGame")
			document.getElementById("player2").value = ""
			document.getElementById("player2").disabled = false
			document.getElementById("player3").value = ""
			document.getElementById("player3").disabled = false
			document.getElementById("player4").value = ""
			document.getElementById("player4").disabled = false
			document.getElementById("player5").value = ""
			document.getElementById("player5").disabled = false
			document.getElementById("player6").value = ""
			document.getElementById("player6").disabled = false
			selectPlayers()
		} else {
			addOption("trainingGame")
			addOption("learningGame")
		}
	}
}

function removeOption(option) {
	document.getElementById(option).checked = false
	document.getElementById(option).disabled = true
}

function addOption(option) {
	//document.getElementById(option).checked = false;
	document.getElementById(option).disabled = false
}

function selectPlayers() {
	var numberOfPlayers = document.getElementById("playerNumber").value

	if (document.getElementById("trainingGame").checked) {
		document.getElementById("player2help").innerHTML = '<span style="background-color: yellow; color: darkred;">' + global.player2practiceText + "</span>"
	} else document.getElementById("player2help").innerHTML = global.player2normText

	switch (numberOfPlayers) {
		case "2":
			document.getElementById("selPlayer3").style.display = "none"
			document.getElementById("selPlayer4").style.display = "none"

			document.getElementById("player3").value = ""
			document.getElementById("player4").value = ""

			if (document.getElementById("trainingGame").checked) document.getElementById("player2").value = "SHADOW"
			break
		case "3":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "none"

			document.getElementById("player4").value = ""

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
			}
			break
		case "4":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
			}
			break
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
