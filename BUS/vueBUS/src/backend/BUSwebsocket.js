//import { useModelStore } from './stores/BUSstore.js'

import { usePersonalStore } from "../stores/BUSpersonal.js"
import { useModelStore } from "../stores/BUSstore.js"
import * as view from "../js/BUSview.js"

import * as IO from "./BUS_IO.js"

export var BUSwebSocket
let BUSconnectionPromise = null // Track the in-progress connection
let retryCount = 0
const MAX_RETRIES = 13 // Uses 3 tries per attempt
const BASE_RETRY_DELAY = 2000

export async function StartWebSocket() {
	const personal = usePersonalStore()

	if (BUSwebSocket && BUSwebSocket.readyState === 1) return BUSwebSocket
	if (BUSconnectionPromise) return BUSconnectionPromise

	if (retryCount >= MAX_RETRIES) {
		console.error("Max WebSocket retries reached.")
		personal.WSstatus = "WSdisconnected"
		return null
	}

	BUSconnectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (BUSwebSocket) BUSwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null) // Resolve null to prevent "Uncaught Promise" errors
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			BUSconnectionPromise = null
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
			if (BUSwebSocket && BUSwebSocket.readyState === 0) {
				// Wait for existing native attempt
			} else {
				if (BUSwebSocket) BUSwebSocket.close()
				let wsUri = "wss://wss.s3.sitereview.io/ws/HomeBUSchannel" + String(personal.gameID) + "/"
				BUSwebSocket = new WebSocket(wsUri)
			}

			BUSwebSocket.onopen = (evt) => {
				cleanup()
				retryCount = 0
				BUSwebSocketOnOpen(evt)
				resolve(BUSwebSocket)
			}

			BUSwebSocket.onclose = () => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}

			BUSwebSocket.onerror = (evt) => {
				cleanup()
				handleFailure("Socket Error (Blocked)")
				resolve(null)
			}

			BUSwebSocket.onmessage = (evt) => BUSwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return BUSconnectionPromise
}
function BUSwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
}

async function BUSwebSocketOnInfo(IncomingInfo) {
	const personal = usePersonalStore()
	const store = useModelStore()

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
				personal.latestUpdate = newTS
				personal.kickoutRequired = false
				await IO.reloadGameData()
				if (personal.canPlay() && personal.yourTurnAudioType > 0) {
					let beep
					if (personal.yourTurnAudioType === 1) beep = new Audio("/static/BUS/sounds/beep.mp3")
					if (personal.yourTurnAudioType === 2) beep = new Audio("/static/BUS/sounds/bell.mp3")
					beep.play()
				}

				if (personal.canPlay()) {
					// Check the browser is capable
					if ("serviceWorker" in navigator && "PushManager" in window) {
						let tempElement = document.createElement("div")
						tempElement.innerHTML = store.gameName
						// Get the decoded text
						let decodedGameName = tempElement.textContent

						Notification.requestPermission(function (status) {
							const title = "It is your turn in Bus"

							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
								//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
								icon: "/static/BUS/images/bus_icon.png",
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
			} else BUSwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
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
		console.warn("BUS Broadcast failed:", err)
	}
}
