var availableTiles
var boardTiles
var playerCount = 2

function init() {
	availableTiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
	if (window.initData.isSchismUser) availableTiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17]

	if (boardTiles == undefined) {
		boardTiles = [0, 0, -1, 0, -1, 0, -1, 0]
	} else {
		if (boardTiles.length == 8) playerCount = 2
		if (boardTiles.length == 12) playerCount = 3
		if (boardTiles.length == 14) playerCount = 4
		if (boardTiles.length == 18) playerCount = 5
		changePlayerNumberGraphics(playerCount)

		for (let i = 0; i < boardTiles.length; i += 2) {
			let index = availableTiles.indexOf(boardTiles[i])
			availableTiles.splice(index, 1)
		}
	}
	renderAvailableTiles()
	renderBoard(playerCount)

	window.addEventListener("mouseup", function (event) {
		// do logic here
		if (boardTileMoving) {
			alert("IN INIT BTM")
			//alert("rotate escape")
			boardTileMoving.style.position = "relative"
			boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] += 1
			if (boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] == 4) boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] = 0
			renderAvailableTiles()
			renderBoard(playerCount)
			// reset our element
			boardTileMoving.style.left = ""
			boardTileMoving.style.top = ""
			boardTileMoving.style.height = ""
			boardTileMoving.style.width = ""
			boardTileMoving.style.position = ""
			boardTileMoving.style.zIndex = ""
			boardTileMoving.data = 0

			boardTileMoving = null
		}
	})

	window.addEventListener("mousemove", function (event) {
		// do logic here
		if (availableTileMoving) {
			availableTileMove(event)
		} else if (boardTileMoving) {
			boardTileMove(event)
		}
	})
}

function renderAvailableTiles() {
	document.getElementById("availableMapTiles").innerHTML = ""
	for (var i = 0; i < availableTiles.length; i++) {
		var img = document.createElement("img")
		var numString
		numString = String(availableTiles[i])
		img.src = "/static/TGZ/images/map" + numString + ".jpg"
		img.id = "tile" + availableTiles[i]
		img.class = "availableTile"
		img.style.cssText = "width:100px;height:100px;"
		img.style.cursor = "move"

		img.addEventListener("mousedown", availableTilePickup)
		img.addEventListener("touchstart", availableTilePickup)
		img.addEventListener("mousemove", availableTileMove)
		img.addEventListener("touchmove", availableTileMove, false)
		img.addEventListener("mouseup", availableTileDrop)
		img.addEventListener("touchend", availableTileDrop)

		document.getElementById("availableMapTiles").appendChild(img)
	}
}

let availableTileMoving = null
let boardTileMoving = null

function availableTilePickup(event) {
	event.preventDefault()
	availableTileMoving = event.target
	availableTileMoving.style.opacity = "0.4"
	availableTileMoving.style.position = "absolute"
	availableTileMoving.style.zIndex = 1000
	if (event.clientX) {
		// mousemove
		availableTileMoving.style.left = event.pageX - 50 + "px"
		availableTileMoving.style.top = event.pageY - 50 + "px"
	} else {
		// touchmove - assuming a single touchpoint
		var touch = event.targetTouches[0]
		// Place element where the finger is
		availableTileMoving.style.left = touch.pageX - 50 + "px"
		availableTileMoving.style.top = touch.pageY - 50 + "px"
		event.preventDefault()
	}
}

function availableTileMove(event) {
	if (availableTileMoving) {
		if (event.clientX) {
			// mousemove
			availableTileMoving.style.left = event.pageX - availableTileMoving.offsetWidth / 2 + "px"
			availableTileMoving.style.top = event.pageY - availableTileMoving.offsetHeight / 2 + "px"
		} else {
			event.preventDefault()
			// touchmove - assuming a single touchpoint
			var touch = event.targetTouches[0]
			// Place element where the finger is
			availableTileMoving.style.left = touch.pageX - 50 + "px"
			availableTileMoving.style.top = touch.pageY - 50 + "px"
		}
		// Now check underneath for element
		let target = null
		availableTileMoving.hidden = true
		if (event.clientX) {
			target = document.elementFromPoint(event.clientX, event.clientY)
		} else {
			target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY)
		}
		availableTileMoving.hidden = false
		var elems = document.querySelectorAll(".over")

		;[].forEach.call(elems, function (el) {
			el.classList.remove("over")
		})
		if (target.id.slice(0, 9) == "boardTile" && target.id !== getForbiddenTargetId(playerCount)) {
			target.classList.add("over")
		}
	}
}

function getForbiddenTargetId(playerCount) {
	if (playerCount === 2) return "boardTile0"
	if (playerCount === 3) return "boardTile4"
	if (playerCount === 4) return "boardTile4"
	if (playerCount === 5) return "boardTile4"
}

function boardTilePickup(event) {
	event.preventDefault()
	boardTileMoving = event.target
	if (boardTileMoving.id === getForbiddenTargetId(playerCount)) {
		let index = parseInt(boardTileMoving.id.slice(9))
		if (playerCount === 4) index--
		boardTiles[index * 2 + 1] += 1

		if (boardTiles[index * 2 + 1] == 4) {
			if (window.initData.isSchismUser) {
				if (boardTiles[index * 2] == 0) boardTiles[index * 2] = 11
				else boardTiles[index * 2] = 0
			}
			boardTiles[index * 2 + 1] = 0
		}
		renderBoard(playerCount)
		// reset our element
		boardTileMoving.style.left = ""
		boardTileMoving.style.top = ""
		boardTileMoving.style.height = ""
		boardTileMoving.style.width = ""
		boardTileMoving.style.position = ""
		boardTileMoving.style.zIndex = ""
		boardTileMoving.data = 0

		boardTileMoving = null
		return
	}
	boardTileMoving.classList.remove("r1")
	boardTileMoving.classList.remove("r2")
	boardTileMoving.classList.remove("r3")

	var d = new Date()
	var t = d.getTime()
	boardTileMoving.data = t
	boardTileMoving.style.opacity = "0.4"
	boardTileMoving.style.position = "fixed"

	boardTileMoving.style.zIndex = 1000
	if (event.clientX) {
		boardTileMoving.style.left = event.offsetX - boardTileMoving.width / 2 + "px"
		boardTileMoving.style.top = event.offsetY - boardTileMoving.height / 2 + "px"
	}
	// else touch pickup
	else {
		boardTileMoving.style.position = "absolute"

		var touch = event.targetTouches[0]
		boardTileMoving.style.left = touch.offsetX - 100 + "px"
		boardTileMoving.style.top = touch.offsetY - 100 + "px"

		boardTileMoving.style.left = event.pageX - 100 + "px"
		boardTileMoving.style.top = event.pageY - 100 + "px"
	}
}

function boardTileMove(event) {
	if (boardTileMoving) {
		if (event.clientX) {
			boardTileMoving.style.left = event.clientX - boardTileMoving.offsetWidth / 2 + "px" //;
			boardTileMoving.style.top = event.clientY - boardTileMoving.offsetHeight / 2 + "px" //;
		} else {
			event.preventDefault()
			var touch = event.targetTouches[0]
			// Place element where the finger is
			boardTileMoving.style.position = "fixed"

			boardTileMoving.style.left = touch.pageX - 100 + "px"
			boardTileMoving.style.top = touch.pageY - 100 + "px"

			boardTileMoving.style.left = touch.offsetX - 100 + "px"
			boardTileMoving.style.top = touch.offsetY - 100 + "px"

			boardTileMoving.style.left = touch.clientX - boardTileMoving.offsetWidth / 2 + "px" //;
			boardTileMoving.style.top = touch.clientY - boardTileMoving.offsetHeight / 2 + "px" //;
		}
		// Now check underneath for element
		let target = null
		boardTileMoving.hidden = true
		if (event.clientX) {
			target = document.elementFromPoint(event.clientX, event.clientY)
		} else {
			target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY)
		}
		boardTileMoving.hidden = false
		var elems = document.querySelectorAll(".over")

		;[].forEach.call(elems, function (el) {
			el.classList.remove("over")
		})
		if (target.id.slice(0, 9) == "boardTile" && target.id !== getForbiddenTargetId(playerCount)) {
			target.classList.add("over")
		}
	}
}

function availableTileDrop(event) {
	if (availableTileMoving) {
		document.querySelectorAll(".boardTile").forEach((element) => element.classList.remove("over"))
		//if (event.currentTarget.tagName !== 'HTMLXXXXX') {
		let target = null
		availableTileMoving.hidden = true
		if (event.clientX) {
			target = document.elementFromPoint(event.clientX, event.clientY)
		} else {
			target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY)
		}
		availableTileMoving.hidden = false
		if (target.id.slice(0, 9) == "boardTile" && target.id !== getForbiddenTargetId(playerCount)) {
			var sourceTileID = parseInt(availableTileMoving.id.slice(4))
			var destinationTileID = parseInt(target.id.slice(9))
			// Shift destination Tile ID for odd maps
			if (playerCount === 3 && destinationTileID === 6) destinationTileID = 5
			if (playerCount === 4) {
				if (destinationTileID >= 2) destinationTileID--
				if (destinationTileID >= 6) destinationTileID--
			}

			// remove from available
			var index = availableTiles.indexOf(sourceTileID)
			availableTiles.splice(index, 1)

			// Add back if replacing a tile
			if (boardTiles[destinationTileID * 2] != -1) {
				availableTiles.push(boardTiles[destinationTileID * 2])
				availableTiles.sort(function (a, b) {
					return a - b
				})
			}
			// update on board
			boardTiles[destinationTileID * 2] = sourceTileID

			renderAvailableTiles()
			renderBoard(playerCount)
		} else {
			renderAvailableTiles()
		}

		// else reset
		availableTileMoving.style.opacity = "1"
		availableTileMoving.style.cssText = "width:100px;height:100px;"
		availableTileMoving.style.width = "100px"
		availableTileMoving.style.height = "100px"
		//target.appendChild(moving);
		//}

		// reset our element
		availableTileMoving.style.left = ""
		availableTileMoving.style.top = ""
		availableTileMoving.style.height = ""
		availableTileMoving.style.width = ""
		availableTileMoving.style.position = ""
		availableTileMoving.style.zIndex = ""

		availableTileMoving = null
	}
}

function boardTileDrop(event) {
	if (boardTileMoving == null) return
	//alert("drop")
	var d = new Date()
	var t = d.getTime()
	if (t - boardTileMoving.data < 300) {
		//alert("rotate")
		boardTileMoving.style.position = "relative"
		let index = parseInt(boardTileMoving.id.slice(9))
		if (playerCount === 3 && index === 6) index = 5
		if (playerCount === 4) {
			if (index >= 2) index--
			if (index >= 6) index--
		}
		boardTiles[index * 2 + 1] += 1
		if (boardTiles[index * 2 + 1] == 4) boardTiles[index * 2 + 1] = 0
	} else {
		//alert("move")
		var fromPos = 0
		if (boardTileMoving) {
			document.querySelectorAll(".boardTile").forEach((element) => element.classList.remove("over"))
			//if (event.currentTarget.tagName !== 'HTMLXXXXX') {
			let target = null
			boardTileMoving.hidden = true
			if (event.clientX) {
				target = document.elementFromPoint(event.clientX, event.clientY)
			} else {
				target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY)
			}
			boardTileMoving.hidden = false
			if (target.id.slice(0, 9) == "boardTile" && target.id !== getForbiddenTargetId(playerCount)) {
				fromPos = parseInt(boardTileMoving.id.slice(9))
				var toPos = parseInt(target.id.slice(9))
				// Shift destination Tile ID for odd maps
				if (playerCount === 3 && toPos === 6) toPos = 5
				if (playerCount === 3 && fromPos === 6) fromPos = 5
				if (playerCount === 4) {
					if (fromPos >= 2) fromPos--
					if (fromPos >= 6) fromPos--
					if (toPos >= 2) toPos--
					if (toPos >= 6) toPos--
				}
				var tempTile = boardTiles[toPos * 2]
				var tempRot = boardTiles[toPos * 2 + 1]
				boardTiles[toPos * 2] = boardTiles[fromPos * 2]
				boardTiles[toPos * 2 + 1] = boardTiles[fromPos * 2 + 1]
				boardTiles[fromPos * 2] = tempTile
				boardTiles[fromPos * 2 + 1] = tempRot
			} else {
				if (target.id.slice(0, 7) != "tileDiv") {
					fromPos = parseInt(boardTileMoving.id.slice(9))
					if (playerCount === 3 && fromPos === 6) fromPos = 5
					if (playerCount === 4) {
						if (fromPos >= 2) fromPos--
						if (fromPos >= 6) fromPos--
					}
					availableTiles.push(boardTiles[fromPos * 2])
					boardTiles[fromPos * 2] = -1
				}
			}

			// else reset
			boardTileMoving.style.opacity = "1"
			//boardTileMoving.style.cssText = 'width:100px;height:100px;';
			boardTileMoving.style.width = "200px"
			boardTileMoving.style.height = "200px"
			//target.appendChild(moving);
			//}
		}
	}

	renderAvailableTiles()
	renderBoard(playerCount)
	// reset our element
	boardTileMoving.style.left = ""
	boardTileMoving.style.top = ""
	boardTileMoving.style.height = ""
	boardTileMoving.style.width = ""
	boardTileMoving.style.position = ""
	boardTileMoving.style.zIndex = ""
	boardTileMoving.data = 0

	boardTileMoving = null
}

function renderBoard(playerCount) {
	//if (setTiles !== undefined) boardTiles = setTiles;
	document.getElementById("board").innerHTML = ""
	var img
	var W = 2
	var H = 2
	var tileWidth = 200

	if (boardTiles.length > 8) {
		W = 3
		H = 3
	}
	let displayTiles = [...boardTiles]
	if (playerCount === 3) displayTiles.splice(10, 0, -2, 0)
	if (playerCount === 4) {
		displayTiles.splice(4, 0, -2, 0)
		displayTiles.splice(12, 0, -2, 0)
	}

	for (var i = 0; i < displayTiles.length; i += 2) {
		// Create the divs
		// Create the divs
		var div = document.createElement("div")
		div.id = "tileDiv" + String(i / 2)
		div.classList.add("tileDiv")
		div.style.cssText = "width:" + tileWidth + "px;height:" + tileWidth + "px;"
		//div.style.border = '1px black dashed'
		div.style.position = "absolute"
		//div.style.left = String(((i / 2) % W) * tileWidth) + "px";
		//div.style.top = String((Math.floor((i / 2) / H)) * tileWidth) + 'px';
		div.style.left = String(((i / 2) % W) * tileWidth) + "px"
		div.style.top = String(Math.floor(i / 2 / W) * tileWidth) + "px"
		document.getElementById("board").appendChild(div)

		if (displayTiles[i] == -1) {
			img = document.createElement("img")
			img.src = "/static/Lobby/images/blankTileTGZ.jpg"
			img.id = "boardTile" + String(i / 2)
			img.classList.add("boardTile")
			//img.classList.add('over');
			img.style.cssText = "width:190px;height:190px;"
			img.style.position = "relative"
			//img.style.border = '1px solid black';

			img.style.top = "5px"
			img.style.left = "5px"

			div.appendChild(img)
		} else if (displayTiles[i] !== -2) {
			img = document.createElement("img")
			let numString = String(displayTiles[i])

			img.src = "/static/TGZ/images/map" + numString + ".jpg"
			img.id = "boardTile" + String(i / 2)
			img.classList.add("boardTile")
			img.classList.add("r" + displayTiles[i + 1])
			img.style.width = String(tileWidth) + "px"
			img.style.height = String(tileWidth) + "px"
			img.style.cursor = "pointer"
			img.style.position = "relative"
			img.style.top = "0px"
			img.style.left = "0px"

			img.addEventListener("mousedown", boardTilePickup, false)
			img.addEventListener("touchstart", boardTilePickup)
			img.addEventListener("mousemove", boardTileMove, false)
			img.addEventListener("touchmove", boardTileMove, false)
			img.addEventListener("mouseup", boardTileDrop)
			img.addEventListener("touchend", boardTileDrop)

			//img.addEventListener('click', rotateBoardTile);
			div.appendChild(img)
		}
	}
	// resizze the board area
	document.getElementById("board").style.width = W * tileWidth + 6 + "px"
	document.getElementById("board").style.height = H * tileWidth + 6 + "px"
}
function changePlayerNumberGraphics(playerNumber) {
	switch (playerCount) {
		case 2:
			document.querySelectorAll(".playerCount").forEach((element) => (element.src = "/static/Lobby/images/playerNone.png"))
			document.getElementById("2player").src = "/static/Lobby/images/player.png"
			break
		case 3:
			document.querySelectorAll(".playerCount").forEach((element) => (element.src = "/static/Lobby/images/playerNone.png"))
			document.getElementById("2player").src = "/static/Lobby/images/player.png"
			document.getElementById("3player").src = "/static/Lobby/images/player.png"
			break
		case 4:
			document.querySelectorAll(".playerCount").forEach((element) => (element.src = "/static/Lobby/images/playerNone.png"))
			document.getElementById("2player").src = "/static/Lobby/images/player.png"
			document.getElementById("3player").src = "/static/Lobby/images/player.png"
			document.getElementById("4player").src = "/static/Lobby/images/player.png"
			break
		case 5:
			document.querySelectorAll(".playerCount").forEach((element) => (element.src = "/static/Lobby/images/playerNone.png"))
			document.getElementById("2player").src = "/static/Lobby/images/player.png"
			document.getElementById("3player").src = "/static/Lobby/images/player.png"
			document.getElementById("4player").src = "/static/Lobby/images/player.png"
			document.getElementById("5player").src = "/static/Lobby/images/player.png"
			break
	}
}

function changePlayerNumber() {
	playerCount = parseInt(this.id.slice(0, 1))
	availableTiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
	if (window.initData.isSchismUser) availableTiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17]
	switch (playerCount) {
		case 2:
			document.querySelectorAll(".playerCount").forEach((element) => (element.src = "/static/Lobby/images/playerNone.png"))
			document.getElementById("2player").src = "/static/Lobby/images/player.png"
			boardTiles = [0, 0, -1, 0, -1, 0, -1, 0]
			break
		case 3:
			document.querySelectorAll(".playerCount").forEach((element) => (element.src = "/static/Lobby/images/playerNone.png"))
			document.getElementById("2player").src = "/static/Lobby/images/player.png"
			document.getElementById("3player").src = "/static/Lobby/images/player.png"
			boardTiles = [-1, 0, -1, 0, -1, 0, -1, 0, 0, 0, -1, 0]
			break
		case 4:
			document.querySelectorAll(".playerCount").forEach((element) => (element.src = "/static/Lobby/images/playerNone.png"))
			document.getElementById("2player").src = "/static/Lobby/images/player.png"
			document.getElementById("3player").src = "/static/Lobby/images/player.png"
			document.getElementById("4player").src = "/static/Lobby/images/player.png"
			boardTiles = [-1, 0, -1, 0, -1, 0, 0, 0, -1, 0, -1, 0, -1, 0]
			break
		case 5:
			document.querySelectorAll(".playerCount").forEach((element) => (element.src = "/static/Lobby/images/playerNone.png"))
			document.getElementById("2player").src = "/static/Lobby/images/player.png"
			document.getElementById("3player").src = "/static/Lobby/images/player.png"
			document.getElementById("4player").src = "/static/Lobby/images/player.png"
			document.getElementById("5player").src = "/static/Lobby/images/player.png"
			boardTiles = [-1, 0, -1, 0, -1, 0, -1, 0, 0, 0, -1, 0, -1, 0, -1, 0, -1, 0]
			break
	}
	renderAvailableTiles()
	renderBoard(playerCount)
}

function fillMap() {
	availableTiles = shuffle(availableTiles)
	var i = 0
	for (i = 0; i < boardTiles.length; i += 2) {
		if (boardTiles[i] == -1) {
			boardTiles[i] = availableTiles.pop()
			boardTiles[i + 1] = Math.floor(Math.random() * 4)
		}
	}
	availableTiles.sort(function (a, b) {
		return a - b
	})
	renderAvailableTiles()
	renderBoard(playerCount)
}

function shuffleCurrentBoard() {
	var tilesToShuffle = []
	var i
	for (i = 0; i < boardTiles.length; i += 2) tilesToShuffle.push(boardTiles[i])
	tilesToShuffle = shuffle(tilesToShuffle)
	for (i = 0; i < boardTiles.length; i += 2) {
		boardTiles[i] = tilesToShuffle.pop()
		boardTiles[i + 1] = Math.floor(Math.random() * 4)
	}
	let startTileIndex
	for (let i = 0; i < boardTiles.length; i += 2) {
		if (boardTiles[i] === 0) {
			startTileIndex = i
			break
		}
	}
	let targetIndex = 0
	if (playerCount === 3 || playerCount === 5) targetIndex = 8
	if (playerCount === 4) targetIndex = 6
	let temp = boardTiles[targetIndex]
	boardTiles[targetIndex] = 0
	boardTiles[startTileIndex] = temp
	renderAvailableTiles()
	renderBoard(playerCount)
}

function clearMap() {
	for (var i = 0; i < boardTiles.length; i += 2) {
		if (boardTiles[i] !== 0) {
			boardTiles[i] = -1
			boardTiles[i + 1] = 0
		}
	}
	availableTiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
	renderAvailableTiles()
	renderBoard(playerCount)
}

function createGameWithMap() {
	if (boardTiles.indexOf(-1) > -1) {
		alert("Please create a valid map first")
	} else {
		document.getElementById("mapData").value = JSON.stringify(boardTiles)
		document.getElementById("mapSubmit").submit()
	}
}

function shuffle(array) {
	let currentIndex = array.length,
		randomIndex

	// While there remain elements to shuffle.
	while (currentIndex != 0) {
		// Pick a remaining element.
		randomIndex = Math.floor(Math.random() * currentIndex)
		currentIndex--

		// And swap it with the current element.
		;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
	}

	return array
}
