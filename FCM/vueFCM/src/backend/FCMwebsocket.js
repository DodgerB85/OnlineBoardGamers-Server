import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal.js"
import i18n from "../i18n"

import * as IO from "./FCM_IO"
//import * as funcs from "../js/FCMfuncs"
import * as view from "../js/FCMview"
import * as rf from "../js/FCMreference.js"
//import * as model from "../js/FCMmodel"

export var FCMwebSocket = null
let FCMconnectionPromise = null // Track the in-progress connection

export async function StartWebSocket() {
	const personal = usePersonalStore()
	// 1. If already open, return immediately
	if (FCMwebSocket && FCMwebSocket.readyState === 1) {
		return FCMwebSocket
	}

	// 2. If currently connecting, return the existing promise
	if (FCMconnectionPromise) {
		return FCMconnectionPromise
	}

	// 3. Create a new connection promise
	FCMconnectionPromise = new Promise((resolve, reject) => {
		if (FCMwebSocket && FCMwebSocket.readyState === 0) {
			// Already in connecting state, just attach listeners
		} else {
			if (FCMwebSocket) FCMwebSocket.close()
			let ChannelNumber = personal.gameID
			let wsUri = "wss://wss.s3.sitereview.io/ws/HomeFCMchannel" + String(ChannelNumber) + "/"
			FCMwebSocket = new WebSocket(wsUri)
		}

		FCMwebSocket.onopen = function (evt) {
			FCMconnectionPromise = null // Clear promise on success
			FCMwebSocketOnOpen(evt)
			resolve(FCMwebSocket)
		}

		FCMwebSocket.onclose = function (evt) {
			FCMconnectionPromise = null
			FCMwebSocketOnClose(evt)
		}

		FCMwebSocket.onerror = function (evt) {
			FCMconnectionPromise = null
			FCMwebSocketOnError(evt)
			reject(evt)
		}

		FCMwebSocket.onmessage = function (evt) {
			FCMwebSocketOnInfo(evt)
		}
	})

	return FCMconnectionPromise
}

function FCMwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
	IO.checkForLatestData()
}

function FCMwebSocketOnClose() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

function FCMwebSocketOnError() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	if (FCMwebSocket) FCMwebSocket.close()
}

async function FCMwebSocketOnInfo(IncomingInfo) {
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

	// UNCOMMENT ONCE RESIGN IS FIXED
	if (personal.pov >= 0 && store.players[personal.pov].displayName == rf.BOT_NAME && !personal.name.includes(rf.TOURNAMENT_ADMIN_NAME) && store.gameflow.phase != rf.PHASE_GAME_OVER) {
		// TODO clear actions
		return
	}
	if (IncomingInfo.data.slice(0, 9) === "NEWDATATS") {
		if (IncomingInfo.data.slice(9, -13) == personal.gameID) {
			let newTS = parseInt(IncomingInfo.data.slice(-13))
			if (newTS > personal.latestUpdate) {
				personal.latestUpdate = newTS
				// Try doing this first to make sure modules get loaded even when new game starts
				if (store.gameflow.phase === rf.PHASE_SETUP_MODULES) personal.haltPlay = true
				if (store.gameflow.phase === rf.PHASE_SETUP_MODULES) location.reload()
				//global.recentLoad = true;
				else await IO.loadGame()

				if (personal.yourTurnAudioType > 0) {
					let beep
					if (personal.yourTurnAudioType == 1) beep = new Audio("/static/Lobby/common/sounds/beep.mp3")
					if (personal.yourTurnAudioType == 2) beep = new Audio("/static/Lobby/common/sounds/bell.mp3")
					beep.play()
				}

				// A full load is required to reload the whole starting options which only normally comes with the HTML
				// It's not worth having a separate update function to send starting options just to "smoothly" live update
				// during module selection which a) isn't done often and b) isn't necesserily done live anyway
				//if (M.gameflow.phase === rf.PHASE_SETUP_MODULES) location.reload()
				//else global.haltPlay = false

				if (personal.canPlay()) {
					// Check the browser is capable
					if ("serviceWorker" in navigator && "PushManager" in window) {
						let tempElement = document.createElement("div")
						tempElement.innerHTML = store.gameName
						// Get the decoded text
						let decodedGameName = tempElement.textContent

						Notification.requestPermission(function () {
							const title = i18n.global.t("alerts.yourTurnNotification")

							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(store.gameflow.phase),
								//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
								icon: "/static/FCM/images/fcm_icon.png",
								tag: "OBGgame",
							}

							let n = new Notification(title, options)
							n.onclick = function () {
								//event.preventDefault() // Prevents the browser from focusing the Notification's tab
								//window.open("http://localhost:8000/IND/54/", "_blank")
								// Check if the window client exists
								window.focus()
								n.close()
							}
						})
					}
				}
			} else FCMwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		}
	}
}

export async function broadcastGameUpdate() {
	const personal = usePersonalStore()
	// Only attempt if we want live updates
	if (!personal.liveWS) return

	try {
		// This will either return the open socket instantly
		// or wait for the connection to finish.
		const socket = await StartWebSocket()

		if (socket.readyState === 1) {
			socket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		}
	} catch (err) {
		console.warn("FCM Broadcast failed:", err)
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
