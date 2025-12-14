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

		var startingOptions = setupData.startingOptions.split(/,/)

		//if (startingOptions.includes("5")) document.getElementById("allowSurrender").checked = true;
		if (startingOptions.includes("102")) {
			document.getElementById("trainingGame").checked = true
			validateOptions("trainingGame")
		}
		if (startingOptions.includes("9")) {
			document.getElementById("useSchism").checked = true
			validateOptions("useSchism")
		}

		// Check and enable map data if necessary
		if (setupData.startingMap != "") {
			document.getElementById("keepMapDiv").style.display = "block"
			// Don't auto select same map
			boardTiles = setupData.startingMap
			document.getElementById("mapData").value = ""
		}
	}
}

function setPlayersforMapData() {
	if (document.getElementById("mapData").value == "") return
	else {
		if (boardTiles.length === 8) document.getElementById("playerNumber").value = 2
		if (boardTiles.length === 12) document.getElementById("playerNumber").value = 3
		if (boardTiles.length === 14) document.getElementById("playerNumber").value = 4
		if (boardTiles.length === 18) document.getElementById("playerNumber").value = 5
		document.getElementById("playerNumber").disabled = true
		selectPlayers()
	}
}

function validateOptions(change) {
	var el
	if (change == "keepMap") {
		if (document.getElementById(change).checked == true) document.getElementById("mapData").value = boardTiles
		else document.getElementById("mapData").value = ""
	} else if (change == "pace") {
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

			// Now lock to 2p

			/*document.getElementById('playerNumber').value = 3;
            document.getElementById('playerNumber').disabled = true;
            selectPlayers();*/
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
			removeOption("experiencedGame")
			removeOption("learningGame")
			removeOption("privateGame")
			selectPlayers()
		} else {
			document.getElementById("player2").value = ""
			document.getElementById("player2").disabled = false
			document.getElementById("player3").value = ""
			document.getElementById("player3").disabled = false
			document.getElementById("player4").value = ""
			document.getElementById("player4").disabled = false
			document.getElementById("player5").value = ""
			document.getElementById("player5").disabled = false
			selectPlayers()
			if (global.experienced) addOption("experiencedGame")
			addOption("learningGame")
			addOption("privateGame")
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
			selectPlayers()
		} else {
			addOption("trainingGame")
			addOption("learningGame")
		}
	} else if (change === "useSchism") {
		if (document.getElementById(change).checked == true) {
			addOption("schismRadio_schismOnly")
			addOption("schismRadio_half")
			addOption("schismRadio_mix")
			document.getElementById("schismRadio_mix").checked = true
		} else {
			removeOption("schismRadio_schismOnly")
			removeOption("schismRadio_half")
			removeOption("schismRadio_mix")
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

// Store the default values of the number inputs
const defaultVRvalues = Array.from(document.querySelectorAll(".valueField")).map((input) => input.value)

function validateExpertOptions(checkbox) {
	const checkboxes = document.querySelectorAll('#expertOptions input[type="checkbox"]')
	const VRinputs = document.querySelectorAll('#expertOptions input[type="number"]')
	const VRinputsSpecs = Array.from(VRinputs).slice(24)
	const VRbuttons = document.querySelectorAll("#expertOptions button")
	const VRbuttonsSpecs = Array.from(VRbuttons).slice(48)
	const enableAdvancedOptions = checkboxes[0]
	const expertCheckboxes = Array.from(checkboxes).slice(1)
	const pickRandomgods = document.getElementById("pickRandomgods")

	if (checkbox === enableAdvancedOptions) {
		if (checkbox.checked) {
			removeOption("useSchism")
			removeOption("schismRadio_schismOnly")
			removeOption("schismRadio_half")
			removeOption("schismRadio_mix")
			document.getElementById("expertOptions").style.maxHeight = "fit-content"
			// Enable expert checkboxes
			expertCheckboxes.forEach((expertCheckbox) => {
				expertCheckbox.disabled = false
			})
			/*VRinputs.forEach(expertCheckbox => {
                expertCheckbox.disabled = false;
            });
            VRbuttons.forEach(expertCheckbox => {
                expertCheckbox.disabled = false;
            });*/
			VRinputsSpecs.forEach((expertCheckbox) => {
				expertCheckbox.disabled = false
			})
			VRbuttonsSpecs.forEach((expertCheckbox) => {
				expertCheckbox.disabled = false
			})
			pickRandomgods.disabled = false
		} else {
			addOption("useSchism")
			document.getElementById("expertOptions").style.maxHeight = "370px"
			// Disable and uncheck expert checkboxes
			expertCheckboxes.forEach((expertCheckbox) => {
				expertCheckbox.checked = false
				expertCheckbox.disabled = true
			})
			VRinputs.forEach((expertCheckbox) => {
				expertCheckbox.disabled = true
			})
			VRbuttons.forEach((expertCheckbox) => {
				expertCheckbox.disabled = true
			})
			pickRandomgods.disabled = true
		}
	} else {
		// Enable selections
		toggleCustomgodCheckbox(checkbox)

		// Count the number of checked expert checkboxes
		const checkedCount = expertCheckboxes.filter((expertCheckbox) => expertCheckbox.checked).length
		let span = document.getElementById("expertSummarygodsSpan")
		span.innerHTML = "<br/>" + String(checkedCount) + " of 8 gods selected."
		if (checkedCount !== 8) {
			span.style.color = "red"
			span.style.backgroundColor = "yellow"
		} else {
			span.style.color = "" // Reset to default color
			span.style.backgroundColor = "" // Reset to default background color
		}
	}
}

function toggleCustomgodCheckbox(checkbox) {
	const VRinput = checkbox.previousElementSibling.previousElementSibling
	const upButton = checkbox.previousElementSibling
	const downButton = checkbox.previousElementSibling.previousElementSibling.previousElementSibling
	if (checkbox.checked) {
		upButton.disabled = false
		downButton.disabled = false
		VRinput.disabled = false
	} else {
		upButton.disabled = true
		downButton.disabled = true
		VRinput.disabled = true
	}
}

function changeValue(event, button, increment) {
	/* event.preventDefault(); // Prevent form submission
     const valueField = button.parentNode.querySelector('.valueField');
     let value = parseInt(valueField.value);
     value += increment;
     valueField.value = value;
     //alert(value)
     let index = parseInt(button.parentNode.id.slice(5))
 
     if (value !== parseInt(defaultVRvalues[index])) alert("changes")
 */

	event.preventDefault() // Prevent form submission
	const valueField = button.parentNode.querySelector(".valueField")
	let value = parseInt(valueField.value)
	value += increment
	valueField.value = value
	// alert(value)
	//let index = parseInt(button.parentNode.id.slice(5));

	let valueFields = document.querySelectorAll(".valueField")
	let defaultValues = Array.from(defaultVRvalues).map(Number)

	let isAnyValueChanged = false

	for (let i = 0; i < valueFields.length; i++) {
		if (parseInt(valueFields[i].value) !== defaultValues[i]) {
			isAnyValueChanged = true
			break
		}
	}

	let span = document.getElementById("expertSummaryVRSpan")

	if (isAnyValueChanged) {
		span.style.color = "red"
		span.style.backgroundColor = "yellow"
		span.style.fontSize = "20px"
		span.style.fontWeight = "bold"
		span.innerHTML = "<br/>CAUTION: New VR unbalances the game - less likely players will join"

		// Check if reset button already exists
		const resetButton = document.getElementById("resetButton")
		if (!resetButton) {
			const resetButton = createResetButton()
			span.parentNode.appendChild(resetButton)
		}
	} else {
		span.innerHTML = ""
	}
}

function pickRandomgods(event, button) {
	event.preventDefault() // Prevent form submission

	const checkboxes1 = document.querySelectorAll('#expertOptions input[type="checkbox"]')
	const checkboxes = Array.from(checkboxes1).slice(1)
	// Uncheck all checkboxes
	checkboxes.forEach(function (checkbox) {
		checkbox.checked = false
		toggleCustomgodCheckbox(checkbox)
	})

	// Randomly select 8 gods
	//var checkboxes = document.querySelectorAll('input[type="checkbox"]')
	var randomIndexes = []
	while (randomIndexes.length < 8) {
		var randomIndex = Math.floor(Math.random() * checkboxes.length)
		if (!randomIndexes.includes(randomIndex)) {
			randomIndexes.push(randomIndex)
			checkboxes[randomIndex].checked = true
			toggleCustomgodCheckbox(checkboxes[randomIndex])
		}
	}
}

document.getElementById("pickRandomgods").addEventListener("click", pickRandomgods)

function createResetButton() {
	const resetButton = document.createElement("button")
	resetButton.textContent = "Reset VR"
	resetButton.id = "resetButton" // Assign the ID to the resetButton element
	resetButton.addEventListener("click", resetAllValues)
	resetButton.type = "button" // Set the type attribute to "button"
	return resetButton
}

function resetAllValues() {
	const valueFields = document.querySelectorAll(".valueField")
	const defaultValues = Array.from(defaultVRvalues).map(Number)

	for (let i = 0; i < valueFields.length; i++) {
		valueFields[i].value = defaultValues[i]
	}
	let span = document.getElementById("expertSummaryVRSpan")
	span.innerHTML = ""
}

function selectPlayers() {
	var numberOfPlayers = document.getElementById("playerNumber").value

	if (document.getElementById("trainingGame").checked) {
		/*document.getElementById('player2').disabled = true;
        document.getElementById('player3').disabled = true;
        document.getElementById('player4').disabled = true;
        document.getElementById('player5').disabled = true;
        document.getElementById('player6').disabled = true;*/
		document.getElementById("player2help").innerHTML = '<span style="background-color: yellow; color: darkred;">' + global.player2practiceText + "</span>"
	} else document.getElementById("player2help").innerHTML = global.player2normText

	switch (numberOfPlayers) {
		case "2":
			document.getElementById("selPlayer3").style.display = "none"
			document.getElementById("selPlayer4").style.display = "none"
			document.getElementById("selPlayer5").style.display = "none"

			document.getElementById("player3").value = ""
			document.getElementById("player4").value = ""
			document.getElementById("player5").value = ""

			if (document.getElementById("trainingGame").checked) document.getElementById("player2").value = "SHADOW"
			break
		case "3":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "none"
			document.getElementById("selPlayer5").style.display = "none"

			document.getElementById("player4").value = ""
			document.getElementById("player5").value = ""

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
			}
			break
		case "4":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"
			document.getElementById("selPlayer5").style.display = "none"

			document.getElementById("player5").value = ""
			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
			}
			break
		case "5":
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"
			document.getElementById("selPlayer5").style.display = "flex"

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
				document.getElementById("player5").value = "SHADOW_4"
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

function validateForm(event) {
	// Check if expertOptions are enabled
	const enableAdvancedOptions = document.getElementById("enableAdvancedOptions")
	const expertOptionsChecked = enableAdvancedOptions.checked

	// Check if 8 checkboxes are ticked if expertOptions are enabled
	if (expertOptionsChecked) {
		const expertCheckboxes = document.querySelectorAll('#expertOptions input[type="checkbox"]')
		const checkedCount = Array.from(expertCheckboxes).reduce((count, checkbox) => {
			return checkbox.checked ? count + 1 : count
		}, 0)

		// Need 1 for expert, 8 for gods, total 9
		if (checkedCount > 9) {
			event.preventDefault() // Prevent form submission
			document.getElementById("invalidForm").style.display = "inline"
			return
		}
		// Validate valueFields
		const valueFields = Array.from(document.querySelectorAll(".valueField"))
		for (const field of valueFields) {
			const value = parseInt(field.value)
			if (isNaN(value)) {
				event.preventDefault() // Prevent form submission
				document.getElementById("invalidForm").style.display = "inline"
				return
			}
			// Additional validation rules if needed
		}
	}

	// Continue with form submission
	document.getElementById("TGZnewGameForm").submit()
}
