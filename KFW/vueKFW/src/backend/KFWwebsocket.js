import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal.js"

import * as IO from "./KFW_IO"
//import * as funcs from "../js/KFWfuncs"
import * as view from "../js/KFWview"
import * as rf from "../js/KFWreference.js"
import * as model from "../js/KFWmodel"

export var KFWwebSocket
let KFWconnectionPromise = null // Track the in-progress connection
let retryCount = 0
const MAX_RETRIES = 13 // Uses 3 tries per attempt
const BASE_RETRY_DELAY = 2000

export async function StartWebSocket() {
	const personal = usePersonalStore()

	if (KFWwebSocket && KFWwebSocket.readyState === 1) return KFWwebSocket
	if (KFWconnectionPromise) return KFWconnectionPromise

	if (retryCount >= MAX_RETRIES) {
		console.error("Max WebSocket retries reached.")
		personal.WSstatus = "WSdisconnected"
		return null
	}

	KFWconnectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (KFWwebSocket) KFWwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null) // Resolve null to prevent "Uncaught Promise" errors
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			KFWconnectionPromise = null
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
			if (KFWwebSocket && KFWwebSocket.readyState === 0) {
				// Wait for existing native attempt
			} else {
				if (KFWwebSocket) KFWwebSocket.close()
				let wsUri = "wss://wss.s3.sitereview.io/ws/HomeKFWchannel" + String(personal.gameID) + "/"
				KFWwebSocket = new WebSocket(wsUri)
			}

			KFWwebSocket.onopen = (evt) => {
				cleanup()
				retryCount = 0
				KFWwebSocketOnOpen(evt)
				resolve(KFWwebSocket)
			}

			KFWwebSocket.onclose = () => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}

			KFWwebSocket.onerror = (evt) => {
				cleanup()
				handleFailure("Socket Error (Blocked)")
				resolve(null)
			}

			KFWwebSocket.onmessage = (evt) => KFWwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return KFWconnectionPromise
}
async function KFWwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
	IO.checkForLatestData()
}

function KFWwebSocketOnClose() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

function KFWwebSocketOnError() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

async function KFWwebSocketOnInfo(IncomingInfo) {
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
			var newTS = parseInt(IncomingInfo.data.slice(-13))
			if (newTS > personal.latestUpdate) {
				store.viewSettings.showReplay = false
				personal.latestUpdate = newTS
				window.initData.latestUpdate = newTS
				personal.kickoutRequired = false
				personal.adminDataInspection = false
				if (store.gameflow.phase === rf.PHASE_FINAL_SCORING && !personal.canPlay()) window.location.reload()
				else if (store.gameflow.phase !== rf.PRE_PHASE_VILLAGE_EXPANDING || !personal.canPlay()) {
					await IO.reloadGameData()
					model.doturnStartHighlights()
				}
				if (personal.yourTurnAudioType > 0) {
					let beep
					if (personal.yourTurnAudioType == 1) beep = new Audio("/static/KFW/sounds/beep.mp3")
					if (personal.yourTurnAudioType == 2) beep = new Audio("/static/KFW/sounds/bell.mp3")
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
							const title = "It is your turn in Keyflower"

							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
								//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
								icon: "/static/KFW/images/kfw_icon.png",
								tag: "OBGgame",
							}

							var n = new Notification(title, options)
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
			} else KFWwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
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
