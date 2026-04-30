import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal.js"

import * as IO from "./TGZ_IO"
import * as view from "./TGZview"

export var TGZwebSocket
let TGZconnectionPromise = null // Track the in-progress connection

export async function StartWebSocket() {
	const personal = usePersonalStore()
	// 1. If already open, return immediately
	if (TGZwebSocket && TGZwebSocket.readyState === 1) {
		return TGZwebSocket
	}

	// 2. If currently connecting, return the existing promise
	if (TGZconnectionPromise) {
		return TGZconnectionPromise
	}

	// 3. Create a new connection promise
	TGZconnectionPromise = new Promise((resolve, reject) => {
		if (typeof TGZwebSocket !== "undefined" && TGZwebSocket.readyState === 0) {
			// Already in native connecting state, just attach listeners
		} else {
			if (TGZwebSocket) TGZwebSocket.close()
			let ChannelNumber = personal.gameID
			let wsUri = "wss://wss.s3.sitereview.io/ws/HomeTGZchannel" + String(ChannelNumber) + "/"
			TGZwebSocket = new WebSocket(wsUri)
		}

		TGZwebSocket.onopen = function (evt) {
			TGZconnectionPromise = null // Clear promise on success
			TGZwebSocketOnOpen(evt)
			resolve(TGZwebSocket)
		}

		TGZwebSocket.onclose = function (evt) {
			TGZconnectionPromise = null
			TGZwebSocketOnClose(evt)
		}

		TGZwebSocket.onerror = function (evt) {
			TGZconnectionPromise = null
			TGZwebSocketOnError(evt)
			reject(evt)
		}

		TGZwebSocket.onmessage = function (evt) {
			TGZwebSocketOnInfo(evt)
		}
	})

	return TGZconnectionPromise
}

async function TGZwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
	IO.checkForLatestData()
}

function TGZwebSocketOnClose() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

function TGZwebSocketOnError() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

async function TGZwebSocketOnInfo(IncomingInfo) {
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
				store.topMenuViews.showReplay = false
				personal.latestUpdate = newTS
				personal.kickoutRequired = false
				await IO.reloadGameData()
				if (personal.yourTurnAudioType > 0) {
					let beep
					if (personal.yourTurnAudioType == 1) beep = new Audio("/static/TGZ/sounds/beep.mp3")
					if (personal.yourTurnAudioType == 2) beep = new Audio("/static/TGZ/sounds/bell.mp3")
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
							const title = "It is your turn in The Great Zimbabwe"

							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
								//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
								icon: "/static/TGZ/images/tgz_icon.png",
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
			} else TGZwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
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