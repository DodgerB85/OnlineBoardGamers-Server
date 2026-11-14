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
		if (startingOptions.includes(0)) {
			document.getElementById("useElectricity").checked = true
		}
		if (startingOptions.includes(1)) {
			document.getElementById("useManagement").checked = true
		}
		if (startingOptions.includes(2)) {
			document.getElementById("useArt").checked = true
		}
		if (startingOptions.includes(3)) {
			document.getElementById("useTrade").checked = true
		}
		if (startingOptions.includes(4)) {
			document.getElementById("useFundamentalResearch").checked = true
		}
		if (startingOptions.includes(5)) {
			document.getElementById("usePlanes").checked = true
		}
		if (startingOptions.includes(6)) {
			document.getElementById("useBombs").checked = true
		}
		if (startingOptions.includes(7)) {
			document.getElementById("useJumpStart").checked = true
		}
		if (startingOptions.includes(8)) {
			document.getElementById("useSoloMineRules").checked = true
		}
	}
}

// Kickout choices per pace come from Lobby/kickoutOptions.html so the labels stay translated.
function validateOptions(change) {
	if (change == "pace") {
		setKickoutOptions()
		// Unlock from 2p
		if (document.getElementById("pace").value != 10) {
			document.getElementById("playerNumber").disabled = false
			selectPlayers()
		}
	} else if (GAME_TYPE_OPTIONS.indexOf(change) !== -1) {
		validateGameType(change)
	}
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
	var solo = document.getElementById("playerNumber").value == "1"
	showSeats()

	if (solo) {
		// Solo mode: the practice game is the only game type, and no kickout.
		removeOption("trainingGame")
		document.getElementById("trainingGame").checked = true
		removeOption("privateGame")
		removeOption("learningGame")
		removeOption("experiencedGame")
		removeOption("useSoloMineRules")
		document.getElementById("useSoloMineRules").checked = true
		document.getElementById("kickoutDuration").disabled = true
	} else {
		// Re-enable what solo mode locked, unless the practice game is on.
		document.getElementById("kickoutDuration").disabled = false
		if (!document.getElementById("trainingGame").checked) {
			addOption("privateGame")
			addOption("learningGame")
		}
		addOption("trainingGame")
		if (document.getElementById("useSoloMineRules").disabled) document.getElementById("useSoloMineRules").checked = false
		addOption("useSoloMineRules")
		if (global.experienced) addOption("experiencedGame")
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

			// 2. Draw the map with the same lightweight builder the gallery uses,
			// so the page never has to boot the whole RNB app for a preview
			const mapPreviewThumb = document.getElementById("mapPreviewThumb")
			if (mapPreviewThumb) mapPreviewThumb.innerHTML = buildMapThumbnailSVG(selectedMap.hexData)

			// 3. Show map info
			if (mapInfoDisplay) {
				mapInfoDisplay.style.display = "block"
				selectedMapName.textContent = selectedMap.name
				selectedMapDescription.textContent = selectedMap.description || "No description available"
			}

			// 4. Show the map preview
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

	// Clear the thumbnail preview
	const mapPreviewThumb = document.getElementById("mapPreviewThumb")
	if (mapPreviewThumb) mapPreviewThumb.innerHTML = ""

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

// Weld unordered [[x1,y1],[x2,y2]] segments into continuous polylines so a run of
// track tiles draws as one line with no gap at shared corners. Port of the editor's
// trainTrackSegmentsToPath.
function trackSegmentsToPath(segments, free) {
	if (!segments.length) return []
	const key = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`
	const nodeSegments = new Map()
	for (let i = 0; i < segments.length; i++)
		for (const p of segments[i]) {
			const k = key(p)
			if (!nodeSegments.has(k)) nodeSegments.set(k, [])
			nodeSegments.get(k).push(i)
		}
	const otherPoint = (segIndex, pointKey) => {
		const seg = segments[segIndex]
		return key(seg[0]) === pointKey ? seg[1] : seg[0]
	}
	const used = new Array(segments.length).fill(false)
	const r = (n) => Math.round(n * 100) / 100
	const chains = []
	for (let i = 0; i < segments.length; i++) {
		if (used[i]) continue
		used[i] = true
		const points = [segments[i][0], segments[i][1]]
		for (const dir of [0, 1]) {
			for (;;) {
				const endKey = key(dir === 0 ? points[0] : points[points.length - 1])
				const connections = nodeSegments.get(endKey) || []
				if (connections.length !== 2) break
				const next = connections.find((j) => !used[j])
				if (next === undefined) break
				used[next] = true
				const p = otherPoint(next, endKey)
				if (dir === 0) points.unshift(p)
				else points.push(p)
			}
		}
		let length = 0
		for (let j = 1; j < points.length; j++) length += Math.hypot(points[j][0] - points[j - 1][0], points[j][1] - points[j - 1][1])
		// Whole dash periods (editor: 200 per 463 hex radius) so dashes join up across hex edges, like RNBcomputes
		chains.push({ d: smoothPolylinePath(points, (p) => `${r(p[0])} ${r(p[1])}`, free), dashes: Math.max(1, Math.round(length / 43.2)) })
	}
	return chains
}

// Copy of the editor's smoothPolylinePath (RNB/vueRNB/src/js/RNBcomputes.js) - keep both in sync.
function smoothPolylinePath(points, fmt, free) {
	// No river or city on the tile: one smooth arc edge-to-edge, leaving the centre anchor alone
	if (free && points.length > 2) {
		const [p0, p1, q1, q0] = [points[0], points[1], points[points.length - 2], points[points.length - 1]]
		const k = 0.5 * Math.hypot(q0[0] - p0[0], q0[1] - p0[1])
		const toward = (p, q) => {
			const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
			return [p[0] + ((q[0] - p[0]) * k) / l, p[1] + ((q[1] - p[1]) * k) / l]
		}
		return "M" + fmt(p0) + " C" + fmt(toward(p0, p1)) + " " + fmt(toward(q0, q1)) + " " + fmt(q0)
	}
	let d = "M" + fmt(points[0])
	for (let i = 1; i < points.length - 1; i++) {
		const [p, a, b] = [points[i], points[i - 1], points[i + 1]]
		const la = Math.hypot(a[0] - p[0], a[1] - p[1]),
			lb = Math.hypot(b[0] - p[0], b[1] - p[1])
		// A segment shared by two bends gives each half; one ending at a track end can be used whole
		const cut = Math.min(la * (i === 1 ? 1 : 0.5), lb * (i === points.length - 2 ? 1 : 0.5))
		if (!cut) continue
		const at = (q, l) => [p[0] + ((q[0] - p[0]) * cut) / l, p[1] + ((q[1] - p[1]) * cut) / l]
		d += " L" + fmt(at(a, la)) + " Q" + fmt(p) + " " + fmt(at(b, lb))
	}
	return d + " L" + fmt(points[points.length - 1])
}

function railsSVG(chains) {
	const line = (d, attrs) => `<path d="${d}" ${attrs} stroke-linejoin="round" stroke-linecap="butt" fill="none"/>`
	// Same as the editor/game (MapEditor.vue): black track with white dashed centre, scaled from editor hex radius 463 to S = 100
	return chains.map((c) => line(c.d, 'stroke="black" stroke-width="26.8"')).join("") + chains.map((c) => line(c.d, `pathLength="${2 * c.dashes}" stroke="white" stroke-width="13.8" stroke-dasharray="1 1" stroke-dashoffset="0.5"`)).join("")
}

function buildMapThumbnailSVG(hexData) {
	if (!Array.isArray(hexData) || hexData.length < 2) return ""
	const last = hexData[hexData.length - 1]
	const setup = Array.isArray(last) ? null : last
	const hexes = (setup ? hexData.slice(0, -1) : hexData).filter((e) => Array.isArray(e) && e.length >= 3)
	if (!hexes.length) return ""
	const flat = !!setup && setup.ST === 1
	const hasPolder = hexes.some((e) => e[2] >= 90 && e[2] <= 94)
	const homeHexIDs = (setup && Array.isArray(setup.HM) ? setup.HM : []).map((m) => (Array.isArray(m) ? m[0] : -1)).filter((id) => hexes[id])
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
	// Pre-set home tile spots. The app draws these at the marker bucket's chit position; hex centre is close enough for a thumbnail
	const homeSize = S * 0.54
	homeHexIDs.forEach((id) => {
		const c = centres[id]
		body += `<image href="/static/RNB/images/hometiles/homered.jpg" x="${c[0] - homeSize / 2}" y="${c[1] - homeSize / 2}" width="${homeSize}" height="${homeSize}"/>`
	})
	// Train tracks. TP = the editor's drawn geometry per hex ([q, r, [x1, y1, x2, y2, ...]], hex-local
	// pointy units, circumradius 1), drawn 1:1. Maps saved before TP existed only have TN
	// ([[x1, y1, x2, y2, lane], ...]): draw those centre-to-centre until the map is re-saved in the editor.
	const centreByCoord = {}
	const terrByCoord = {}
	hexes.forEach((e, i) => {
		centreByCoord[e[0] + "," + e[1]] = centres[i]
		terrByCoord[e[0] + "," + e[1]] = e[2]
	})
	const segments = []
	let tpChains = []
	const tp = setup && Array.isArray(setup.TP) ? setup.TP : null
	if (tp) {
		const cos = Math.cos(flat ? Math.PI / 6 : 0),
			sin = Math.sin(flat ? Math.PI / 6 : 0)
		tp.forEach(([q, r, pts]) => {
			const c = centreByCoord[q + "," + r]
			if (!c || !Array.isArray(pts)) return
			const at = (i) => [c[0] + S * (pts[i] * cos - pts[i + 1] * sin), c[1] + S * (pts[i] * sin + pts[i + 1] * cos)]
			const hexSegments = []
			for (let i = 0; i + 3 < pts.length; i += 4) hexSegments.push([at(i), at(i + 2)])
			// Per hex, like the editor: polylines end at hex edges, so curves match it exactly
			const hexChains = trackSegmentsToPath(hexSegments, terrByCoord[q + "," + r] > 22) // > CITY: no river on the tile
			tpChains = tpChains.concat(hexChains)
		})
	} else if (setup && Array.isArray(setup.TN)) {
		setup.TN.forEach((t) => {
			const a = centreByCoord[t[0] + "," + t[1]],
				b = centreByCoord[t[2] + "," + t[3]]
			if (a && b) segments.push([a, b])
		})
	}
	const tracks = railsSVG(tp ? tpChains : trackSegmentsToPath(segments))
	return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"><rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="#f9f9f9"/><defs>${defs}</defs>${body}${tracks}</svg>`
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
