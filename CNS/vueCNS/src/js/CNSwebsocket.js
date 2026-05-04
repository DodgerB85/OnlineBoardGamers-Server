import { useModelStore } from "../stores/CNSstore.js"
import { usePersonalStore } from "../stores/CNSpersonal.js"

import * as IO from "./CNS_IO"
import * as view from "./CNSview"

export var CNSwebSocket
let CNSconnectionPromise = null // Track the in-progress connection
let retryCount = 0
const MAX_RETRIES = 13 // Uses 3 tries per attempt
const BASE_RETRY_DELAY = 2000

export async function StartWebSocket() {
	const personal = usePersonalStore()

	if (CNSwebSocket && CNSwebSocket.readyState === 1) return CNSwebSocket
	if (CNSconnectionPromise) return CNSconnectionPromise

	if (retryCount >= MAX_RETRIES) {
		console.error("Max WebSocket retries reached.")
		personal.WSstatus = "WSdisconnected"
		return null
	}

	CNSconnectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (CNSwebSocket) CNSwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null) // Resolve null to prevent "Uncaught Promise" errors
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			CNSconnectionPromise = null
		}

		const handleFailure = (reason) => {
			retryCount++
			console.warn(`WS Attempt ${retryCount} failed: ${reason}`)
			personal.liveWS = false

			if (retryCount < MAX_RETRIES) {
				personal.WSstatus = "WSconnecting" // Or "WSretrying"
				const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount - 1)
				setTimeout(StartWebSocket, delay)
			} else {
				personal.WSstatus = "WSdisconnected"
			}
		}

		try {
			// Logic to prevent multiple native connections
			if (CNSwebSocket && CNSwebSocket.readyState === 0) {
				// Wait for existing native attempt
			} else {
				if (CNSwebSocket) CNSwebSocket.close()
				let wsUri = "wss://wss.s3.sitereview.io/ws/HomeCNSchannel" + String(personal.gameID) + "/"
				CNSwebSocket = new WebSocket(wsUri)
			}

			CNSwebSocket.onopen = (evt) => {
				cleanup()
				retryCount = 0
				CNSwebSocketOnOpen(evt)
				resolve(CNSwebSocket)
			}

			CNSwebSocket.onclose = () => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}

			CNSwebSocket.onerror = (evt) => {
				cleanup()
				handleFailure("Socket Error (Blocked)")
				resolve(null)
			}

			CNSwebSocket.onmessage = (evt) => CNSwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return CNSconnectionPromise
}
async function CNSwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
	IO.checkForLatestData()
}

async function CNSwebSocketOnInfo(IncomingInfo) {
	const store = useModelStore()
	const personal = usePersonalStore()

	//alert(JSON.stringify(IncomingInfo.data, null, 4));
	//alert(IncomingInfo.data.slice(0, 16))
	//alert(IncomingInfo.data.slice(16))

	if (IncomingInfo.data.slice(0, 16) === "MESSAGEFROMADIN=") {
		alert(IncomingInfo.data.slice(16))
	}

	if (IncomingInfo.data.slice(0, 9) === "NEWCHATTS") {
		if (IncomingInfo.data.slice(9) == personal.gameID) {
			IO.reloadChatData()
		}
	}

	if (IncomingInfo.data.slice(0, 9) === "NEWDATATS") {
		if (IncomingInfo.data.slice(9, -13) == personal.gameID) {
			var newTS = parseInt(IncomingInfo.data.slice(-13))
			if (newTS > personal.latestUpdate) {
				store.topMenuViews.showReplay = false
				personal.latestUpdate = newTS
				personal.kickoutRequired = false
				await IO.reloadGameData()
				if (personal.yourTurnAudioType > 0) {
					let beep
					if (personal.yourTurnAudioType == 1) beep = new Audio("/static/CNS/sounds/beep.mp3")
					if (personal.yourTurnAudioType == 2) beep = new Audio("/static/CNS/sounds/bell.mp3")
					beep.play()

					if (personal.canPlay()) {
						// Check the browser is capable
						if ("serviceWorker" in navigator && "PushManager" in window) {
							let tempElement = document.createElement("div")
							tempElement.innerHTML = store.gameName
							// Get the decoded text
							let decodedGameName = tempElement.textContent

							Notification.requestPermission(function (status) {
								const title = "It is your turn in Cannes"

								const options = {
									body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
									//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
									icon: "/static/CNS/images/cns_icon.png",
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
				}
			} else CNSwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		}
	}
}

export async function broadcastGameUpdate(existingPromise = null) {
	const personal = usePersonalStore()
	if (!personal.liveWS) return

	try {
		// If we already started connecting in the previous function, use that.
		// Otherwise, start a new check.
		const socket = await (existingPromise || StartWebSocket())

		if (socket.readyState === 1) {
			socket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		}
	} catch (err) {
		console.warn("AQY Broadcast failed:", err)
	}
}
