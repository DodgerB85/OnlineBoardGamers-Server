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

function loadSoloMaps() {
    fetch("/RNB/getSoloMaps/")
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                populateMapDropdown(data.maps)
                
                // Auto-select map if selectedMapId is provided (runs after maps are loaded)
                if (window.initData && window.initData.selectedMapId) {
                    selectMapByUniqueId(window.initData.selectedMapId)
                } else {
                    // Select first option (placeholder) by default
                    const mapSelect = document.getElementById("mapSelection")
                    if (mapSelect && mapSelect.options.length > 0) {
                        mapSelect.selectedIndex = 0
                    }
                }
            } else {
                console.error("Error loading maps:", data.error)
            }
        })
        .catch((error) => {
            console.error("Error fetching maps:", error)
        })
}

function populateMapDropdown(maps) {
    const mapSelect = document.getElementById("mapSelection")

    // Clear existing options except the default
    while (mapSelect.options.length > 1) {
        mapSelect.remove(1)
    }

    // Add maps to dropdown
    maps.forEach((map) => {
        const option = document.createElement("option")
        // Store full map data as JSON in the value
        option.value = JSON.stringify({
            id: map.id,
            uniqueID: map.uniqueID,  // Add uniqueID for URL matching
            name: map.name,
            description: map.description,
            hexData: map.hexData,
            playerCount: map.playerCount,
        })
        option.textContent = map.name
        if (map.isOfficial) {
            option.textContent += " [Official]"
        }
        mapSelect.appendChild(option)
    })
}

function selectMapByUniqueId(uniqueId) {
    const mapSelect = document.getElementById("mapSelection")
    // Find the option with matching uniqueID
    for (let i = 0; i < mapSelect.options.length; i++) {
        const option = mapSelect.options[i]
        if (option.value) {
            try {
                const mapData = JSON.parse(option.value)
                // Compare against uniqueID field, not id
                if (mapData.uniqueID && mapData.uniqueID.toString() === uniqueId.toString()) {
                    mapSelect.selectedIndex = i
                    // Trigger the change event to load map info and highscores
                    onMapSelectionChange()
                    return
                }
            } catch (error) {
                console.error("Error parsing map data:", error)
            }
        }
    }
    
    // If map not found, log warning and select first option
    console.warn(`Map with uniqueID ${uniqueId} not found`)
    if (mapSelect.options.length > 0) {
        mapSelect.selectedIndex = 0
    }
}

function onMapSelectionChange() {
    const mapSelect = document.getElementById("mapSelection")
    const mapInfoDisplay = document.getElementById("mapInfoDisplay")
    const selectedMapName = document.getElementById("selectedMapName")
    const selectedMapDescription = document.getElementById("selectedMapDescription")
    const mapPreviewPlaceholder = document.getElementById("mapPreviewPlaceholder")
    const mapPreviewContent = document.getElementById("mapPreviewContent")
    const highscoresContainer = document.getElementById("highscoresContainer")
    const highscoresTableBody = document.getElementById("highscoresTableBody")
    const noHighscoresMessage = document.getElementById("noHighscoresMessage")

    if (mapSelect.value) {
        try {
            const selectedMap = JSON.parse(mapSelect.value)

            // Update Vue store with map data for preview
            if (window.mapStore) {
                window.mapStore.mapData.externalMapData = selectedMap.hexData
                if (selectedMap.playerCount) {
                    window.mapStore.playerCount = selectedMap.playerCount
                }
            } else {
                console.error("Vue Store not initialized yet")
            }

            // Show map info
            if (mapInfoDisplay) {
                mapInfoDisplay.style.display = "block"
                selectedMapName.textContent = selectedMap.name
                selectedMapDescription.textContent = selectedMap.description || "No description available"
            }

            // Show the Vue container for map preview
            mapPreviewPlaceholder.style.display = "none"
            mapPreviewContent.style.display = "block"

            // Fetch highscores for the selected map
            fetch(`/RNB/getMapHighscores/?mapId=${selectedMap.id}`)
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        // Show highscores container
                        highscoresContainer.style.display = "block"

                        // Clear existing highscores
                        highscoresTableBody.innerHTML = ""

                        // Populate highscores table
                        if (data.highscores && data.highscores.length > 0) {
                            noHighscoresMessage.style.display = "none"
                            data.highscores.forEach((highscore) => {
                                const row = document.createElement("tr")
                                
                                const nameCell = document.createElement("td")
                                if (highscore.name && highscore.name !== "Unknown") {
                                    const nameLink = document.createElement("a")
                                    nameLink.href = `/profile/${highscore.name}/`
                                    nameLink.textContent = highscore.name
                                    nameLink.className = "linkOther"
                                    nameCell.appendChild(nameLink)
                                } else {
                                    nameCell.textContent = highscore.name
                                }
                                
                                const dateCell = document.createElement("td")
                                let localDateTime = new Date(parseInt(highscore.date_timestamp * 1000)).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'})
                                localDateTime = localDateTime.replace(/,/g, "")
                                dateCell.textContent = localDateTime
                                
                                const gameCell = document.createElement("td")
                                if (highscore.game && highscore.game !== "N/A") {
                                    const gameLink = document.createElement("a")
                                    gameLink.href = `/RNB/${highscore.game}/show/`
                                    gameLink.textContent = "Game Link"
                                    gameLink.className = "linkOther"
                                    gameCell.appendChild(gameLink)
                                } else {
                                    gameCell.textContent = highscore.game
                                }
                                
                                const scoreCell = document.createElement("td")
                                scoreCell.className = "scoreCell"
                                scoreCell.textContent = highscore.score
                                
                                row.appendChild(nameCell)
                                row.appendChild(dateCell)
                                row.appendChild(gameCell)
                                row.appendChild(scoreCell)
                                
                                highscoresTableBody.appendChild(row)
                            })
                        } else {
                            noHighscoresMessage.style.display = "block"
                        }
                    } else {
                        console.error("Error loading highscores:", data.error)
                    }
                })
                .catch((error) => {
                    console.error("Error fetching highscores:", error)
                })
        } catch (error) {
            console.error("Error parsing map selection:", error)
        }
    } else {
        // Hide map info, preview, and highscores when default is selected
        mapInfoDisplay.style.display = "none"
        mapPreviewPlaceholder.style.display = "block"
        mapPreviewContent.style.display = "none"
        highscoresContainer.style.display = "none"
        selectedMapName.textContent = ""
        selectedMapDescription.textContent = ""

        // Clear Vue store if available
        if (window.mapStore) {
            window.mapStore.mapData.externalMapData = null
        }
    }
}
