// No text
/* global global, boardTiles */

function initGameCreation(fillData, setupData = {}) {
	if (global.experienced) document.getElementById("experiencedGame").disabled = false

	if (global.MT_Creation) {
		global.invitedPlayersArr = []
		autocomplete(document.getElementById("playerToInviteMT"))
		//document.getElementById("invitePlayerMTbutton").addEventListener("click", () => invitePlayerMT)
		document.getElementById("invitePlayerMTbutton").addEventListener("click", invitePlayerMT)
		return
	}

	selectPlayers()

	applyInitialExpertState()

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

		// Check and enable map data if necessary
		if (setupData.startingMap != "") {
			document.getElementById("keepMapDiv").style.display = "block"
			// Don't auto select same map
			boardTiles = setupData.startingMap
			document.getElementById("mapData").value = ""
		}
	}
}

function applyInitialExpertState() {
	const enableAdvancedOptions = document.getElementById("enableAdvancedOptions")
	if (!enableAdvancedOptions || enableAdvancedOptions.checked) return
	const expertOptions = document.getElementById("expertOptions")
	expertOptions.style.maxHeight = "370px"
	expertOptions.style.overflowY = "auto"
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

// Kickout choices per pace come from Lobby/kickoutOptions.html so the labels stay translated.
function validateOptions(change) {
	if (change == "keepMap") {
		if (document.getElementById(change).checked == true) document.getElementById("mapData").value = boardTiles
		else document.getElementById("mapData").value = ""
	} else if (change == "pace") {
		setKickoutOptions()
		// Unlock from 2p
		if (document.getElementById("pace").value != 10) {
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
		}
	} else if (GAME_TYPE_OPTIONS.indexOf(change) !== -1) {
		validateGameType(change)
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
			document.getElementById("expertOptions").style.overflowY = "visible"
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
			document.getElementById("expertOptions").style.overflowY = "auto"
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
			const expertSummaryGodsSpan = document.getElementById("expertSummarygodsSpan")
			expertSummaryGodsSpan.style.padding = ""
			expertSummaryGodsSpan.style.borderRadius = ""
			expertSummaryGodsSpan.style.background = ""
			expertSummaryGodsSpan.style.color = "var(--color-muted)"
			expertSummaryGodsSpan.style.fontSize = "13px"
			expertSummaryGodsSpan.style.fontWeight = ""
			expertSummaryGodsSpan.innerHTML = ""
			const expertSummaryVRSpan = document.getElementById("expertSummaryVRSpan")
			expertSummaryVRSpan.style.padding = ""
			expertSummaryVRSpan.style.borderRadius = ""
			expertSummaryVRSpan.style.background = ""
			expertSummaryVRSpan.style.color = ""
			expertSummaryVRSpan.style.fontSize = ""
			expertSummaryVRSpan.style.fontWeight = ""
			expertSummaryVRSpan.style.marginBottom = ""
			expertSummaryVRSpan.innerHTML = ""
			const resetButton = document.getElementById("resetButton")
			if (resetButton) resetButton.parentNode.removeChild(resetButton)
		}
	} else {
		// Enable selections
		toggleCustomgodCheckbox(checkbox)

		// Count the number of checked expert checkboxes
		const checkedCount = expertCheckboxes.filter((expertCheckbox) => expertCheckbox.checked).length
		let span = document.getElementById("expertSummarygodsSpan")
		span.innerHTML = "<br/>" + String(checkedCount) + " of 8 gods selected."
		if (checkedCount !== 8) {
			span.style.padding = "8px 12px"
			span.style.borderRadius = "var(--radius-sm)"
			span.style.background = "var(--color-warn-bg)"
			span.style.color = "var(--color-warn)"
			span.style.fontSize = "13px"
			span.style.fontWeight = "600"
		} else {
			span.style.padding = ""
			span.style.borderRadius = ""
			span.style.background = ""
			span.style.color = "var(--color-muted)"
			span.style.fontSize = "13px"
			span.style.fontWeight = ""
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
		span.style.padding = "8px 12px"
		span.style.borderRadius = "var(--radius-sm)"
		span.style.background = "var(--color-warn-bg)"
		span.style.color = "var(--color-warn)"
		span.style.fontSize = "13px"
		span.style.fontWeight = "600"
		span.style.marginBottom = "6px"
		span.innerHTML = "CAUTION: New VR unbalances the game - less likely players will join"

		// Check if reset button already exists
		const resetButton = document.getElementById("resetButton")
		if (!resetButton) {
			const resetButton = createResetButton()
			span.parentNode.appendChild(resetButton)
		}
	} else {
		span.style.padding = ""
		span.style.borderRadius = ""
		span.style.background = ""
		span.style.color = ""
		span.style.fontSize = ""
		span.style.fontWeight = ""
		span.style.marginBottom = ""
		span.innerHTML = ""
	}
}

function pickRandomgods(event, button) {
	event.preventDefault() // Prevent form submission

	if (!document.getElementById("enableAdvancedOptions").checked) return

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
	span.style.padding = ""
	span.style.borderRadius = ""
	span.style.background = ""
	span.style.color = ""
	span.style.fontSize = ""
	span.style.fontWeight = ""
	span.innerHTML = ""
	const resetButton = document.getElementById("resetButton")
	if (resetButton) resetButton.parentNode.removeChild(resetButton)
}

function selectPlayers() {
	showSeats()
}

function validateForm(event, isMT) {
	// event.submitter is the modern way to get the specific button clicked
	const btn = event.submitter || this.querySelector(".createNewGameButton")
	if (btn) {
		// 1. Change text first
		if (isMT) btn.value = "Creating Mini Tournament..."
		else btn.value = "Creating The Great Zimbabwe Game..."

		// 2. Disable to prevent double-click
		btn.disabled = true

		// 3. Visual feedback
		btn.style.backgroundColor = "#cccccc"
		btn.style.cursor = "not-allowed"
	} else {
		console.error("Submit button not found in form context.")
	}

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

