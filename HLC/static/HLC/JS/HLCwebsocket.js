var HLCwebSocket
var HLCconnectionPromise = null // Track the in-progress connection
let retryCount = 0
const MAX_RETRIES = 13 // Uses 3 tries per attempt
const BASE_RETRY_DELAY = 2000

async function StartWebSocket() {
	if (HLCwebSocket && HLCwebSocket.readyState === 1) return HLCwebSocket
	if (HLCconnectionPromise) return HLCconnectionPromise

	if (retryCount >= MAX_RETRIES) {
		console.error("Max WebSocket retries reached.")
		document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
		return null
	}

	HLCconnectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (HLCwebSocket) HLCwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null) // Resolve null to prevent "Uncaught Promise" errors
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			HLCconnectionPromise = null
		}

		const handleFailure = (reason) => {
			retryCount++
			console.warn(`WS Attempt ${retryCount} failed: ${reason}`)
			global.liveWS = false

			if (retryCount < MAX_RETRIES) {
				document.getElementById("liveDiv").innerHTML = gettext("Connecting...")
				const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount - 1)
				setTimeout(StartWebSocket, delay)
			} else {
				document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
			}
		}

		try {
			// Logic to prevent multiple native connections
			if (HLCwebSocket && HLCwebSocket.readyState === 0) {
				// Wait for existing native attempt
			} else {
				if (HLCwebSocket) HLCwebSocket.close()
				let wsUri = "wss://wss.s3.sitereview.io/ws/HomeHLCchannel" + String(global.gameID) + "/"
				HLCwebSocket = new WebSocket(wsUri)
			}

			HLCwebSocket.onopen = (evt) => {
				cleanup()
				retryCount = 0
				HLCwebSocketOnOpen(evt)
				resolve(HLCwebSocket)
			}

			HLCwebSocket.onclose = (_evt) => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}

			HLCwebSocket.onerror = (_evt) => {
				cleanup()
				handleFailure("Socket Error (Blocked)")
				resolve(null)
			}

			HLCwebSocket.onmessage = (evt) => HLCwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return HLCconnectionPromise
}

function HLCwebSocketOnOpen(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Connected")
	IO.checkForLatestData()
}

function HLCwebSocketOnClose(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
	setTimeout(StartWebSocket, 2000)
}

function HLCwebSocketOnError(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Error")
	setTimeout(StartWebSocket, 2000)
}

function HLCwebSocketClose(evt) {
	HLCwebSocket.close()
	// MAYBE DELETE THIS?
	document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
}

async function HLCwebSocketOnInfo(IncomingInfo) {
	if (IncomingInfo.data.slice(0, 16) === "MESSAGEFROMADIN=") {
		alert(IncomingInfo.data.slice(16))
	}

	if (IncomingInfo.data.slice(0, 9) === "NEWCHATTS") {
		if (IncomingInfo.data.slice(9) == global.gameID) {
			IO.refreshChat()
		}
	}

	// UNCOMMENT ONCE RESIGN IS FIXED
	if (global.pov != undefined && M.players[global.pov].name == "HcBot" && global.name !== "BotKickStarter" && M.gameFlow.phase != PHASE_GAME_END_CHECK) {
		$("#actions").html("")
		return
	}
	if (IncomingInfo.data.slice(0, 9) === "NEWDATATS") {
		if (IncomingInfo.data.slice(9, -13) == global.gameID) {
			if (M.gameFlow.phase === PHASE_SET_FOCUS && M.gameFlow.turnOrder.length === 1) {
				//alert(1)
				window.location.reload()
			} else {
				var newTS = parseInt(IncomingInfo.data.slice(-13))
				if (newTS > global.latestUpdate) {
					global.latestUpdate = newTS
					if (M.sandboxMode) {
						$("#newComponentDiv").remove()
					}
					await IO.loadGame(C)

					if (Rules.canPlay()) {
						// Check the browser is capable
						if ("serviceWorker" in navigator && "PushManager" in window) {
							Notification.requestPermission(function (status) {
								const title = "It is your turn in Horseless Carriage"

								const options = {
									body: "" + global.gameName + ": " + M.gameFlow.turn + " - " + PHASES_STR[M.gameFlow.phase],
									//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
									icon: "/static/HLC/images/hc_icon.png",
									tag: "OBGgame",
								}

								var n = new Notification(title, options)
								n.onclick = function (event) {
									//event.preventDefault() // Prevents the browser from focusing the Notification's tab
									//window.open("http://localhost:8000/IND/54/", "_blank")
									// Check if the window client exists
									window.focus()
									n.close()
								}
							})
						}
					}
				} else HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(global.latestUpdate))
			}
		}
	}
}

async function broadcastGameUpdate(existingPromise = null) {
	try {
		// If we already started connecting in the previous function, use that.
		// Otherwise, start a new check.
		const socket = await (existingPromise || StartWebSocket())

		if (socket.readyState === 1) {
			socket.send("NEWDATATS" + String(global.gameID) + String(global.latestUpdate))
		}
	} catch (err) {
		console.warn("HLC Broadcast failed:", err)
	}
}
