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
			document.getElementById("useExpansion").checked = true
			//validateOptions("useExpansion");
		}
		if (startingOptions.includes(8)) {
			document.getElementById("useSoloMineRules").checked = true
		}
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

			document.getElementById("blitzWarningSpan").style.display = "flex"
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

function validateGameOptions(_checkboxID) {
	let checkbox = document.getElementById(_checkboxID)
	/*let radios = document.querySelectorAll('input[name="tableSizeRadio"]');
    if (_checkboxID === "addTableJunk") radios = document.querySelectorAll('input[name="tableJunkRadio"]');

    if (checkbox.checked) {
        radios.forEach(function (radio) {
            radio.disabled = false;
        });
        if (_checkboxID === "limitTableSize") document.getElementById("tableSizeRadio2").checked = true;
        else if (_checkboxID === "addTableJunk") document.getElementById("tableJunkRadio2").checked = true;
    } else {
        radios.forEach(function (radio) {
            radio.disabled = true;
            radio.checked = false;
        });
    }*/
}

function updateHighscoresButton() {
	const viewHighscoresBtn = document.getElementById("viewHighscoresBtn")
	if (!viewHighscoresBtn) return

	const numberOfPlayers = document.getElementById("playerNumber").value
	const mapSelect = document.getElementById("mapSelection")

	if (numberOfPlayers === "1" && mapSelect.value) {
		try {
			const selectedMap = JSON.parse(mapSelect.value)
			viewHighscoresBtn.href = `/RNB/highscores/map/${selectedMap.uniqueID}/`
			viewHighscoresBtn.style.display = "inline-block"
		} catch {
			viewHighscoresBtn.style.display = "none"
		}
	} else {
		viewHighscoresBtn.style.display = "none"
	}
}

function updateMapPlayerCountWarning() {
	const warningSpan = document.getElementById("mapPlayerCountWarning")
	if (!warningSpan) return

	const numberOfPlayers = document.getElementById("playerNumber").value
	const mapSelect = document.getElementById("mapSelection")

	if (mapSelect.value) {
		try {
			const selectedMap = JSON.parse(mapSelect.value)
			if (selectedMap.playerCount && String(selectedMap.playerCount) !== numberOfPlayers) {
				warningSpan.textContent = "Caution: This map is designed for " + selectedMap.playerCount + " players but you have selected " + numberOfPlayers + " players"
				warningSpan.style.display = "inline-block"
				return
			}
		} catch {
			// ignore parse errors
		}
	}
	warningSpan.style.display = "none"
}

function selectPlayers() {
	var numberOfPlayers = document.getElementById("playerNumber").value

	if (document.getElementById("trainingGame").checked) {
		document.getElementById("player2help").innerHTML = '<span style="background-color: yellow; color: darkred;">' + global.player2practiceText + "</span>"
	} else document.getElementById("player2help").innerHTML = global.player2normText

	switch (numberOfPlayers) {
		case "1":
			// Solo mode: tick and disable practice game
			removeOption("trainingGame")
			document.getElementById("trainingGame").checked = true

			// Disable kickout options
			document.getElementById("kickoutDuration").disabled = true
			// Disable private game
			removeOption("privateGame")
			// Disable learning game
			removeOption("learningGame")
			// Disable experienced game
			removeOption("experiencedGame")
			// Tick and disable solo mine rules
			removeOption("useSoloMineRules")
			document.getElementById("useSoloMineRules").checked = true
			// Hide all player name options
			document.getElementById("selPlayer2").style.display = "none"
			document.getElementById("selPlayer3").style.display = "none"
			document.getElementById("selPlayer4").style.display = "none"
			document.getElementById("selPlayer5").style.display = "none"
			document.getElementById("selPlayer6").style.display = "none"
			// Clear player fields
			document.getElementById("player2").value = ""
			document.getElementById("player3").value = ""
			document.getElementById("player4").value = ""
			document.getElementById("player5").value = ""
			document.getElementById("player6").value = ""
			break
		case "2":
			// Re-enable options when switching from solo
			document.getElementById("kickoutDuration").disabled = false
			// Only re-enable if practice game is not checked
			if (!document.getElementById("trainingGame").checked) {
				addOption("privateGame")
				addOption("learningGame")
			}
			addOption("trainingGame")
			if (document.getElementById("useSoloMineRules").disabled) {
				document.getElementById("useSoloMineRules").checked = false
			}
			addOption("useSoloMineRules")
			if (global.experienced) addOption("experiencedGame")
			document.getElementById("player2").disabled = false

			document.getElementById("selPlayer2").style.display = "flex"
			document.getElementById("selPlayer3").style.display = "none"
			document.getElementById("selPlayer4").style.display = "none"
			document.getElementById("selPlayer5").style.display = "none"
			document.getElementById("selPlayer6").style.display = "none"

			document.getElementById("player3").value = ""
			document.getElementById("player4").value = ""
			document.getElementById("player5").value = ""
			document.getElementById("player6").value = ""

			if (document.getElementById("trainingGame").checked) document.getElementById("player2").value = "SHADOW"
			break
		case "3":
			// Re-enable options when switching from solo
			document.getElementById("kickoutDuration").disabled = false
			// Only re-enable if practice game is not checked
			if (!document.getElementById("trainingGame").checked) {
				addOption("privateGame")
				addOption("learningGame")
			}
			addOption("trainingGame")
			if (document.getElementById("useSoloMineRules").disabled) {
				document.getElementById("useSoloMineRules").checked = false
			}
			addOption("useSoloMineRules")

			if (global.experienced) addOption("experiencedGame")
			document.getElementById("player2").disabled = false
			document.getElementById("player3").disabled = false

			document.getElementById("selPlayer2").style.display = "flex"
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "none"
			document.getElementById("selPlayer5").style.display = "none"
			document.getElementById("selPlayer6").style.display = "none"

			document.getElementById("player4").value = ""
			document.getElementById("player5").value = ""
			document.getElementById("player6").value = ""

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
			}
			break
		case "4":
			// Re-enable options when switching from solo
			document.getElementById("kickoutDuration").disabled = false
			// Only re-enable if practice game is not checked
			if (!document.getElementById("trainingGame").checked) {
				addOption("privateGame")
				addOption("learningGame")
			}
			addOption("trainingGame")
			if (document.getElementById("useSoloMineRules").disabled) {
				document.getElementById("useSoloMineRules").checked = false
			}
			addOption("useSoloMineRules")

			if (global.experienced) addOption("experiencedGame")
			document.getElementById("player2").disabled = false
			document.getElementById("player3").disabled = false
			document.getElementById("player4").disabled = false

			document.getElementById("selPlayer2").style.display = "flex"
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"
			document.getElementById("selPlayer5").style.display = "none"
			document.getElementById("selPlayer6").style.display = "none"

			document.getElementById("player5").value = ""
			document.getElementById("player6").value = ""

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
			}
			break
		case "5":
			// Re-enable options when switching from solo
			document.getElementById("kickoutDuration").disabled = false
			// Only re-enable if practice game is not checked
			if (!document.getElementById("trainingGame").checked) {
				addOption("privateGame")
				addOption("learningGame")
			}
			addOption("trainingGame")
			if (document.getElementById("useSoloMineRules").disabled) {
				document.getElementById("useSoloMineRules").checked = false
			}
			addOption("useSoloMineRules")

			if (global.experienced) addOption("experiencedGame")
			document.getElementById("player2").disabled = false
			document.getElementById("player3").disabled = false
			document.getElementById("player4").disabled = false
			document.getElementById("player5").disabled = false

			document.getElementById("selPlayer2").style.display = "flex"
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"
			document.getElementById("selPlayer5").style.display = "flex"
			document.getElementById("selPlayer6").style.display = "none"

			document.getElementById("player6").value = ""

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
				document.getElementById("player5").value = "SHADOW_4"
			}
			break
		case "6":
			// Re-enable options when switching from solo
			document.getElementById("kickoutDuration").disabled = false
			// Only re-enable if practice game is not checked
			if (!document.getElementById("trainingGame").checked) {
				addOption("privateGame")
				addOption("learningGame")
			}
			addOption("trainingGame")
			if (document.getElementById("useSoloMineRules").disabled) {
				document.getElementById("useSoloMineRules").checked = false
			}
			addOption("useSoloMineRules")

			if (global.experienced) addOption("experiencedGame")
			document.getElementById("player2").disabled = false
			document.getElementById("player3").disabled = false
			document.getElementById("player4").disabled = false
			document.getElementById("player5").disabled = false
			document.getElementById("player6").disabled = false

			document.getElementById("selPlayer2").style.display = "flex"
			document.getElementById("selPlayer3").style.display = "flex"
			document.getElementById("selPlayer4").style.display = "flex"
			document.getElementById("selPlayer5").style.display = "flex"
			document.getElementById("selPlayer6").style.display = "flex"

			if (document.getElementById("trainingGame").checked) {
				document.getElementById("player2").value = "SHADOW"
				document.getElementById("player3").value = "SHADOW_2"
				document.getElementById("player4").value = "SHADOW_3"
				document.getElementById("player5").value = "SHADOW_4"
				document.getElementById("player6").value = "SHADOW_5"
			}
			break
	}

	// Re-sort maps based on new player count
	if (loadedMaps.length > 0) {
		const playerNumberSelect = document.getElementById("playerNumber")
		const lastPlayerCount = playerNumberSelect.dataset.lastValue
		const currentPlayerCount = playerNumberSelect.value
		const playerCountChanged = lastPlayerCount !== undefined && lastPlayerCount !== currentPlayerCount

		const mapSelect = document.getElementById("mapSelection")
		const previousMapValue = playerCountChanged ? null : mapSelect.value
		const preserved = populateMapDropdown(loadedMaps, previousMapValue)

		if (!preserved) {
			//window.mapStore.mapData.externalMapData.splice(0)
			//window.mapStore.playerCount = numberOfPlayers
			const mapPreviewPlaceholder = document.getElementById("mapPreviewPlaceholder")
			const mapPreviewContent = document.getElementById("mapPreviewContent")

			const selectedMapName = document.getElementById("selectedMapName")
			const selectedMapDescription = document.getElementById("selectedMapDescription")

			mapPreviewPlaceholder.style.display = "block"
			mapPreviewContent.style.display = "none"

			selectedMapName.textContent = ""
			selectedMapDescription.textContent = ""
		}

		playerNumberSelect.dataset.lastValue = currentPlayerCount
	}

	updateHighscoresButton()
	updateMapPlayerCountWarning()
	syncGalleryFilterToPlayerCount()
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

/*** MAP FUNCTIONS */
// Map selection functions
let loadedMaps = [] // Store maps globally for re-sorting

function loadMaps() {
	const isVerifiedToggle = document.getElementById("isVerifiedToggle")
	const isVerified = isVerifiedToggle.checked ? "true" : "all"

	return fetch(`/RNB/getRNBmaps/?isVerified=${isVerified}`)
		.then((response) => response.json())
		.then((data) => {
		if (data.success) {
			loadedMaps = data.maps // Store maps globally
			populateMapDropdown(data.maps)
			renderMapGallery()
			return data.maps // Return maps for chaining
			} else {
				console.error("Error loading maps:", data.error)
				throw new Error(data.error)
			}
		})
		.catch((error) => {
			console.error("Error fetching maps:", error)
			throw error
		})
}

function populateMapDropdown(maps, preserveMapValue = null) {
	const mapSelect = document.getElementById("mapSelection")
	const numberOfPlayers = document.getElementById("playerNumber").value

	// Clear existing options except the default
	while (mapSelect.options.length > 1) {
		mapSelect.remove(1)
	}

	// Sort helper: verified first, then alphabetical by name
	function sortMaps(mapsList) {
		return mapsList.sort((a, b) => {
			if (a.isVerified !== b.isVerified) {
				return b.isVerified - a.isVerified
			}
			return a.name.localeCompare(b.name)
		})
	}

	// Separate maps into matching and non-matching
	const matchingMaps = []
	const nonMatchingMaps = []

	maps.forEach((map) => {
		if (map.playerCount == numberOfPlayers) {
			matchingMaps.push(map)
		} else {
			nonMatchingMaps.push(map)
		}
	})

	// Add matching maps first (green) — verified top, then alphabetical
	sortMaps(matchingMaps).forEach((map) => {
		const option = document.createElement("option")
		option.value = JSON.stringify({
			id: map.id,
			uniqueID: map.uniqueID,
			name: map.name,
			description: map.description,
			hexData: map.hexData,
			playerCount: map.playerCount,
		})
		const playerText = map.playerCount === 1 ? "Solo" : map.playerCount + " players"
		option.textContent = `${map.name} (${playerText}) ${map.isVerified ? " [Verified]" : ""}`
		option.style.color = map.isVerified ? "darkgreen" : "#D35400"
		option.style.fontWeight = "bold"
		mapSelect.appendChild(option)
	})

	// Sort non-matching maps by custom player count order: 2,3,4,5,6,1
	// Then verified first, then alphabetical
	const playerCountOrder = [2, 3, 4, 5, 6, 1]
	nonMatchingMaps.sort((a, b) => {
		const orderA = playerCountOrder.indexOf(a.playerCount)
		const orderB = playerCountOrder.indexOf(b.playerCount)
		if (orderA !== orderB) {
			return orderA - orderB
		}
		if (a.isVerified !== b.isVerified) {
			return b.isVerified - a.isVerified
		}
		return a.name.localeCompare(b.name)
	})

	// Add non-matching maps below (red)
	nonMatchingMaps.forEach((map) => {
		const option = document.createElement("option")
		option.value = JSON.stringify({
			id: map.id,
			uniqueID: map.uniqueID,
			name: map.name,
			description: map.description,
			hexData: map.hexData,
			playerCount: map.playerCount,
		})
		const playerText = map.playerCount === 1 ? "Solo" : map.playerCount + " players"
		option.textContent = `${map.name} (${playerText}) ${map.isVerified ? " [Verified]" : ""}`
		option.style.color = map.isVerified ? "darkgreen" : "#D35400"
		mapSelect.appendChild(option)
	})

	// Restore previous selection if requested and still available
	if (preserveMapValue) {
		for (let i = 0; i < mapSelect.options.length; i++) {
			if (mapSelect.options[i].value === preserveMapValue) {
				mapSelect.selectedIndex = i
				return true
			}
		}
	}
	return false
}

function onMapSelectionChange() {
	const mapSelect = document.getElementById("mapSelection")
	const mapDataInput = document.getElementById("mapData")
	const mapPreviewPlaceholder = document.getElementById("mapPreviewPlaceholder")
	const mapPreviewContent = document.getElementById("mapPreviewContent")
	const mapInfoDisplay = document.getElementById("mapInfoDisplay")
	const selectedMapName = document.getElementById("selectedMapName")
	const selectedMapDescription = document.getElementById("selectedMapDescription")

	if (mapSelect.value) {
		try {
			const selectedMap = JSON.parse(mapSelect.value)

			// 1. Update the hidden mapData input for form submission
			if (mapDataInput) {
				mapDataInput.value = JSON.stringify(selectedMap.hexData)
			}

			// 2. Use global store reference we created in Step 1
			if (window.mapStore) {
				// This triggers all your computed properties in the Vue app
				// ADD TO CHANGE PLAYER
				window.mapStore.mapData.externalMapData = selectedMap.hexData

				// If you have player count logic in the store
				if (selectedMap.playerCount) {
					// ADD TO CHANGE PLAYER
					window.mapStore.playerCount = selectedMap.playerCount
				}
			} else {
				console.error("Vue Store not initialized yet")
			}

			// 3. Show map info
			if (mapInfoDisplay) {
				mapInfoDisplay.style.display = "block"
				selectedMapName.textContent = selectedMap.name
				selectedMapDescription.textContent = selectedMap.description || "No description available"
			}

			// 4. Show the Vue container
			mapPreviewPlaceholder.style.display = "none"
			mapPreviewContent.style.display = "block"
		} catch (error) {
			console.error("Error parsing map selection:", error)
		}
	} else {
		// Hide map preview and show placeholder when "Select Map" is chosen
		mapPreviewPlaceholder.style.display = "block"
		mapPreviewContent.style.display = "none"

		// Hide map info
		if (mapInfoDisplay) {
			mapInfoDisplay.style.display = "none"
		}

		// Clear the hidden mapData input when default is selected
		if (mapDataInput) {
			mapDataInput.value = ""
		}
	}

	updateHighscoresButton()
	updateMapPlayerCountWarning()
	updateGallerySelection()
}

function clearMapSelection() {
	const mapSelect = document.getElementById("mapSelection")
	const mapDataInput = document.getElementById("mapData")
	const mapPreviewPlaceholder = document.getElementById("mapPreviewPlaceholder")
	const mapPreviewContent = document.getElementById("mapPreviewContent")
	const mapInfoDisplay = document.getElementById("mapInfoDisplay")
	const selectedMapName = document.getElementById("selectedMapName")
	const selectedMapDescription = document.getElementById("selectedMapDescription")

	// Reset map selection to default
	mapSelect.value = ""

	// Hide map preview and show placeholder
	mapPreviewPlaceholder.style.display = "block"
	mapPreviewContent.style.display = "none"

	// Hide map info
	if (mapInfoDisplay) {
		mapInfoDisplay.style.display = "none"
		selectedMapName.textContent = ""
		selectedMapDescription.textContent = ""
	}

	// Clear the hidden mapData input
	if (mapDataInput) {
		mapDataInput.value = ""
	}

	// Update Vue store if available
	if (window.mapStore) {
		window.mapStore.mapData.externalMapData = null
	}

	updateMapPlayerCountWarning()
	updateGallerySelection()
}


/*** GALLERY DISPLAY */
// ponytail: standalone hex-art thumbnails (plain SVG, mirrors RNBhex layout). No extra Vue app mounts; hex art only - add scenario pieces later if needed
const MEEPLE_PATH_D = "M 13.91,32.62 C 14.29,25.85 12.91,18.78 20.57,15.26 C 18.95,11.61 17.07,7.68 21.30,4.43 C 22.44,3.54 25.21,3.29 25.00,3.29 C 24.79,3.29 27.56,3.54 28.70,4.43 C 32.93,7.68 31.05,11.61 29.43,15.26 C 37.09,18.78 35.71,25.85 36.09,32.62 L 32.13,33.28 L 30.62,48.80 L 19.38,48.80 L 17.87,33.28 L 13.91,32.62 Z"
const GALLERY_HEX_POINTS = "0,-100.344 86.6,-50.172 86.6,50.172 0,100.344 -86.6,50.172 -86.6,-50.172"
let galleryPlayerFilter = null
let galleryLastPlayerCount = null
let galleryThumbSeq = 0

document.addEventListener("DOMContentLoaded", function () {
	const picker = document.getElementById("galleryPlayerPicker")
	if (picker) picker.addEventListener("click", galleryPlayerIconClicked)
	const grid = document.getElementById("galleryGrid")
	if (grid) grid.addEventListener("click", galleryGridClicked)
	// Make the required map validation reachable while the gallery tab is showing
	const mapSelectEl = document.getElementById("mapSelection")
	if (mapSelectEl)
		mapSelectEl.addEventListener("invalid", function () {
			showMapDisplay("list")
		})
	syncGalleryFilterToPlayerCount()
})

function showMapDisplay(type) {
	var tablinks = document.getElementsByClassName("tablinks")
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "")
	}
	document.getElementById(type === "gallery" ? "mapGalleryTab" : "mapListTab").classList.add("active")
	document.getElementById("mapListView").style.display = type === "gallery" ? "none" : "block"
	document.getElementById("mapGalleryView").style.display = type === "gallery" ? "block" : "none"
	if (type === "gallery") renderMapGallery()
}

// Gallery filter presets to, and follows, the main Number of players dropdown
function syncGalleryFilterToPlayerCount() {
	const mainCount = document.getElementById("playerNumber").value
	if (mainCount === galleryLastPlayerCount) return
	galleryLastPlayerCount = mainCount
	galleryPlayerFilter = parseInt(mainCount, 10)
	renderGalleryPlayerIcons()
	renderMapGallery()
}

function renderGalleryPlayerIcons() {
	const picker = document.getElementById("galleryPlayerPicker")
	if (!picker) return
	const mainCount = document.getElementById("playerNumber").value
	let color = "#333"
	if (galleryPlayerFilter !== null) color = String(galleryPlayerFilter) === String(mainCount) ? "green" : "red"
	picker.querySelectorAll(".galleryPlayerIcon").forEach((icon) => {
		const n = parseInt(icon.dataset.players, 10)
		const filled = galleryPlayerFilter !== null && n <= galleryPlayerFilter
		icon.style.color = color
		icon.innerHTML = `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="${MEEPLE_PATH_D}" fill="${filled ? "currentColor" : "none"}" ${filled ? "" : 'stroke="currentColor" stroke-width="1"'} stroke-linejoin="round" stroke-linecap="round"/></svg>`
	})
}

function galleryPlayerIconClicked(e) {
	const icon = e.target.closest(".galleryPlayerIcon")
	if (!icon) return
	const n = parseInt(icon.dataset.players, 10)
	galleryPlayerFilter = galleryPlayerFilter === n ? null : n
	renderGalleryPlayerIcons()
	renderMapGallery()
}

function buildMapThumbnailSVG(hexData) {
	if (!Array.isArray(hexData) || hexData.length < 2) return ""
	const last = hexData[hexData.length - 1]
	const setup = Array.isArray(last) ? null : last
	const hexes = (setup ? hexData.slice(0, -1) : hexData).filter((e) => Array.isArray(e) && e.length >= 3)
	if (!hexes.length) return ""
	const flat = !!setup && setup.ST === 1
	const hasPolder = hexes.some((e) => e[2] >= 90 && e[2] <= 94)
	const S = 100
	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity
	const centres = hexes.map((e) => {
		const q = e[0],
			r = e[1]
		const c = flat ? [1.5 * q * S, Math.sqrt(3) * (r + q / 2) * S] : [Math.sqrt(3) * (q + r / 2) * S, 1.5 * r * S]
		minX = Math.min(minX, c[0] - 1.05 * S)
		maxX = Math.max(maxX, c[0] + 1.05 * S)
		minY = Math.min(minY, c[1] - 1.05 * S)
		maxY = Math.max(maxY, c[1] + 1.05 * S)
		return c
	})
	const pad = 8
	const vbX = minX - pad,
		vbY = minY - pad,
		vbW = maxX - minX + 2 * pad,
		vbH = maxY - minY + 2 * pad
	const uid = "gt" + ++galleryThumbSeq
	const seen = {}
	let defs = "",
		body = ""
	hexes.forEach((e, i) => {
		const id = e[2]
		let file
		if (id === 95) file = "hex_blank_1"
		else if (id === 96) file = "hex_blank_2"
		else {
			file = "hex_" + String(id).padStart(2, "0")
			if (hasPolder && id >= 90 && id <= 94) file += "_f"
		}
		if (!seen[file]) {
			seen[file] = true
			defs += `<pattern id="${uid}_${file}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="/static/RNB/images/hexes/${file}.jpg" x="0" y="0" width="1" height="1" preserveAspectRatio="none"/></pattern>`
		}
		const rot = e.length > 3 ? e[3] : 0
		const c = centres[i]
		body += `<g transform="translate(${c[0]} ${c[1]})${flat ? " rotate(30)" : ""}"><polygon points="${GALLERY_HEX_POINTS}" transform="rotate(${rot * 60})" fill="url(#${uid}_${file})" stroke="black" stroke-width="6"/></g>`
	})
	return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"><rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="#f9f9f9"/><defs>${defs}</defs>${body}</svg>`
}

function escapeGalleryHTML(str) {
	return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function getSelectedMapUniqueID() {
	const mapSelect = document.getElementById("mapSelection")
	if (!mapSelect || !mapSelect.value) return null
	try {
		return JSON.parse(mapSelect.value).uniqueID
	} catch (e) {
		return null
	}
}

function updateGallerySelection() {
	const uniqueID = getSelectedMapUniqueID()
	document.querySelectorAll(".galleryMapTile").forEach((tile) => {
		tile.classList.toggle("selected", uniqueID !== null && parseInt(tile.dataset.uniqueid, 10) === uniqueID)
	})
}

function renderMapGallery() {
	const grid = document.getElementById("galleryGrid")
	if (!grid) return
	const maps = loadedMaps.filter((map) => galleryPlayerFilter === null || map.playerCount === galleryPlayerFilter)
	const playerCountOrder = [2, 3, 4, 5, 6, 1]
	maps.sort((a, b) => {
		const orderA = playerCountOrder.indexOf(a.playerCount)
		const orderB = playerCountOrder.indexOf(b.playerCount)
		if (orderA !== orderB) return orderA - orderB
		if (a.isVerified !== b.isVerified) return b.isVerified - a.isVerified
		return a.name.localeCompare(b.name)
	})
	grid.innerHTML = maps
		.map((map) => {
			const playerText = map.playerCount === 1 ? "Solo" : map.playerCount + "p"
			const label = escapeGalleryHTML(`${map.name} (${playerText})${map.isVerified ? " \u2713" : ""}`)
			return `<div class="galleryMapTile" data-uniqueid="${map.uniqueID}" title="${label}"><div class="galleryMapThumb">${buildMapThumbnailSVG(map.hexData)}</div><div class="galleryMapLabel">${label}</div></div>`
		})
		.join("")
	updateGallerySelection()
}

function galleryGridClicked(e) {
	const tile = e.target.closest(".galleryMapTile")
	if (!tile) return
	const uniqueID = parseInt(tile.dataset.uniqueid, 10)
	if (isNaN(uniqueID)) return
	const mapSelect = document.getElementById("mapSelection")
	for (let i = 0; i < mapSelect.options.length; i++) {
		const value = mapSelect.options[i].value
		if (!value) continue
		try {
			if (JSON.parse(value).uniqueID === uniqueID) {
				mapSelect.selectedIndex = i
				onMapSelectionChange()
				break
			}
		} catch (err) {
			// ignore parse errors
		}
	}
}
