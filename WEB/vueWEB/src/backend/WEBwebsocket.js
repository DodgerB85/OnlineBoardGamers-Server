import { useModelStore } from "../stores/WEBstore.js"
import { usePersonalStore } from "../stores/WEBpersonal.js"

import * as IO from "./WEB_IO"
import * as view from "../js/WEBview"
//import * as rf from "../js/WEBreference.js"
//import * as model from "../js/WEBmodel"

export var WEBwebSocket
let WEBconnectionPromise = null // Track the in-progress connection

export async function StartWebSocket() {
	const personal = usePersonalStore()
	// 1. If already open, return immediately
	if (WEBwebSocket && WEBwebSocket.readyState === 1) {
		return WEBwebSocket
	}

	// 2. If currently connecting, return the existing promise
	if (WEBconnectionPromise) {
		return WEBconnectionPromise
	}

	// 3. Create a new connection promise
	WEBconnectionPromise = new Promise((resolve, reject) => {
		if (typeof WEBwebSocket !== "undefined" && WEBwebSocket.readyState === 0) {
			// Already in native connecting state, just attach listeners
		} else {
			if (WEBwebSocket) WEBwebSocket.close()
			let ChannelNumber = personal.gameID
			let wsUri = "wss://wss.s3.sitereview.io/ws/HomeWEBchannel" + String(ChannelNumber) + "/"
			WEBwebSocket = new WebSocket(wsUri)
		}

		WEBwebSocket.onopen = function (evt) {
			WEBconnectionPromise = null // Clear promise on success
			WEBwebSocketOnOpen(evt)
			resolve(WEBwebSocket)
		}

		WEBwebSocket.onclose = function (evt) {
			WEBconnectionPromise = null
			WEBwebSocketOnClose(evt)
		}

		WEBwebSocket.onerror = function (evt) {
			WEBconnectionPromise = null
			WEBwebSocketOnError(evt)
			reject(evt)
		}

		WEBwebSocket.onmessage = function (evt) {
			WEBwebSocketOnInfo(evt)
		}
	})

	return WEBconnectionPromise
}

async function WEBwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
	IO.checkForLatestData()
}

function WEBwebSocketOnClose() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

function WEBwebSocketOnError() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

async function WEBwebSocketOnInfo(IncomingInfo) {
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

				await IO.reloadGameData()

				if (personal.yourTurnAudioType > 0) {
					let beep
					if (personal.yourTurnAudioType == 1) beep = new Audio("/static/WEB/sounds/beep.mp3")
					if (personal.yourTurnAudioType == 2) beep = new Audio("/static/WEB/sounds/bell.mp3")
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
							const title = "It is your turn in Web"

							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
								//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
								icon: "/static/WEB/images/web_icon.png",
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
			} else WEBwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
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
		console.warn("WEB Broadcast failed:", err)
	}
}
