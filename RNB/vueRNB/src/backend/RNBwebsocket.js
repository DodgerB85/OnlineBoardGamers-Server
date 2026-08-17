import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

import * as IO from "./RNB_IO"
//import * as funcs from "../js/RNBfuncs"
import * as view from "../js/RNBview"
//import * as rf from "../js/RNBreference.js"
//import * as model from "../js/RNBmodel"

export var RNBwebSocket

// Add a variable to track the "connecting" promise
let RNBconnectionPromise = null
let retryCount = 0
const MAX_RETRIES = 13 // Uses 3 tries per attempt
const BASE_RETRY_DELAY = 2000

export async function StartWebSocket() {
	const personal = usePersonalStore()

	if (RNBwebSocket && RNBwebSocket.readyState === 1) return RNBwebSocket
	if (RNBconnectionPromise) return RNBconnectionPromise

	if (retryCount >= MAX_RETRIES) {
		console.error("Max WebSocket retries reached.")
		personal.WSstatus = "WSdisconnected"
		return null
	}

	RNBconnectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (RNBwebSocket) RNBwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null) // Resolve null to prevent "Uncaught Promise" errors
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			RNBconnectionPromise = null
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
			if (RNBwebSocket && RNBwebSocket.readyState === 0) {
				// Wait for existing native attempt
			} else {
				if (RNBwebSocket) RNBwebSocket.close()
				let wsUri = "wss://wss.s3.sitereview.io/ws/HomeRNBchannel" + String(personal.gameID) + "/"
				RNBwebSocket = new WebSocket(wsUri)
			}

			RNBwebSocket.onopen = (evt) => {
				cleanup()
				retryCount = 0
				RNBwebSocketOnOpen(evt)
				resolve(RNBwebSocket)
			}

			RNBwebSocket.onclose = () => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}

			RNBwebSocket.onerror = () => {
				cleanup()
				handleFailure("Socket Error (Blocked)")
				resolve(null)
			}

			RNBwebSocket.onmessage = (evt) => RNBwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return RNBconnectionPromise
}

function RNBwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
	IO.checkForLatestData()
}

async function RNBwebSocketOnInfo(IncomingInfo) {
	const store = useModelStore()
	const personal = usePersonalStore()

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
			let newTS = parseInt(IncomingInfo.data.slice(-13))
			if (newTS > personal.latestUpdate) {
				const couldPlay = personal.canPlay()
				// Do this to stop any in progress moves
				personal.haltPlay = true
				//const storedActionStackCopy = JSON.parse(JSON.stringify(store.actionStack))
				store.viewSettings.showReplay = false
				personal.latestUpdate = newTS
				window.initData.latestUpdate = newTS
				personal.kickoutRequired = false

				// BEFORE DOING THIS, SAVE ANY IN-PROGRESS MOVES
				await IO.reloadGameData(couldPlay)
				// NOW RELOAD ANY IN-PROGRESS  MOVES

				if (personal.yourTurnAudioType > 0) {
					let beep
					if (personal.yourTurnAudioType == 1) beep = new Audio("/static/Lobby/common/sounds/beep.mp3")
					if (personal.yourTurnAudioType == 2) beep = new Audio("/static/Lobby/common/sounds/bell.mp3")
					beep.play()
				}

				if (personal.canPlay()) {
					// Check the browser is capable
					if ("serviceWorker" in navigator && "PushManager" in window) {
						let tempElement = document.createElement("div")
						tempElement.innerHTML = store.gameName
						// Get the decoded text
						let decodedGameName = tempElement.textContent

						Notification.requestPermission(function (_status) {
							const title = "It is your turn in Roads & Boats"

							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(store.gameflow.phase),
								icon: "/static/RNB/images/rnb_icon.png",
								tag: "OBGgame",
							}

							let n = new Notification(title, options)
							n.onclick = function (_event) {
								//event.preventDefault() // Prevents the browser from focusing the Notification's tab
								//window.open("http://localhost:8000/IND/54/", "_blank")
								// Check if the window client exists
								window.focus()
								n.close()
							}
						})
					}
				}
			} else RNBwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
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

export async function broadcastChatUpdate() {
	const personal = usePersonalStore()
	if (!personal.liveWS) return
	try {
		// StartWebSocket() returns the socket immediately if open,
		// or waits for the connection if it's currently opening.
		const socket = await StartWebSocket()

		if (socket.readyState === WebSocket.OPEN) {
			socket.send("NEWCHATTS" + String(personal.gameID))
		}
	} catch (err) {
		console.warn("Chat broadcast failed:", err)
	}
}
