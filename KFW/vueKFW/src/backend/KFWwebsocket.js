import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal.js"

import * as IO from "./KFW_IO"
import * as funcs from "../js/KFWfuncs"
import * as view from "../js/KFWview"
import * as rf from "../js/KFWreference.js"
import * as model from "../js/KFWmodel"

export var KFWwebSocket

export async function StartWebSocket() {
	if (typeof KFWwebSocket !== "undefined") {
		if (KFWwebSocket.readyState === 0 || KFWwebSocket.readyState === 1) return
		else KFWwebSocket.close()
	}
	const personal = usePersonalStore()

	var ChannelNumber = personal.gameID

	var wsUri = "wss://wss.s3.sitereview.io/ws/HomeKFWchannel" + String(ChannelNumber) + "/"

	KFWwebSocket = new WebSocket(wsUri)

	KFWwebSocket.onopen = async function (evt) {
		await KFWwebSocketOnOpen(evt)
	}
	KFWwebSocket.onclose = function (evt) {
		KFWwebSocketOnClose(evt)
	}
	KFWwebSocket.onmessage = function (evt) {
		KFWwebSocketOnInfo(evt)
	}
	KFWwebSocket.onerror = function (evt) {
		KFWwebSocketOnError(evt)
	}
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

						Notification.requestPermission(function (status) {
							const title = "It is your turn in Keyflower"

							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
								//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
								icon: "/static/KFW/images/kfw_icon.png",
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
			} else KFWwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		}
	}
}

export async function broadcaseGameUpdate() {
	const personal = usePersonalStore()

	if (KFWwebSocket && KFWwebSocket.readyState === 1) KFWwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
	else if (KFWwebSocket && personal.liveWS) {
		await StartWebSocket()
		await funcs.sleep(2000)
		if (personal.liveWS && KFWwebSocket.readyState === 1) KFWwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		else console.log("2xTO: " + KFWwebSocket.readyState)
	}
}
