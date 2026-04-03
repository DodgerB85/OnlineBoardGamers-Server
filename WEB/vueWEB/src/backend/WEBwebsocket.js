import { useModelStore } from "../stores/WEBstore.js"
import { usePersonalStore } from "../stores/WEBpersonal.js"

import * as IO from "./WEB_IO"
import * as funcs from "../js/WEBfuncs"
import * as view from "../js/WEBview"
//import * as rf from "../js/WEBreference.js"
//import * as model from "../js/WEBmodel"

export var WEBwebSocket

export async function StartWebSocket() {
	if (typeof WEBwebSocket !== "undefined") {
		if (WEBwebSocket.readyState === 0 || WEBwebSocket.readyState === 1) return
		else WEBwebSocket.close()
	}
	const personal = usePersonalStore()

	var ChannelNumber = personal.gameID

	var wsUri = "wss://wss.s3.sitereview.io/ws/HomeWEBchannel" + String(ChannelNumber) + "/"

	WEBwebSocket = new WebSocket(wsUri)

	WEBwebSocket.onopen = async function (evt) {
		await WEBwebSocketOnOpen(evt)
	}
	WEBwebSocket.onclose = function (evt) {
		WEBwebSocketOnClose(evt)
	}
	WEBwebSocket.onmessage = function (evt) {
		WEBwebSocketOnInfo(evt)
	}
	WEBwebSocket.onerror = function (evt) {
		WEBwebSocketOnError(evt)
	}
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

						Notification.requestPermission(function (status) {
							const title = "It is your turn in Web"

							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
								//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
								icon: "/static/WEB/images/web_icon.png",
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
			} else WEBwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		}
	}
}

export async function broadcaseGameUpdate() {
	const personal = usePersonalStore()

	if (WEBwebSocket && WEBwebSocket.readyState === 1) WEBwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
	else if (WEBwebSocket && personal.liveWS) {
		await StartWebSocket()
		await funcs.sleep(2000)
		if (personal.liveWS && WEBwebSocket.readyState === 1) WEBwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		else console.log("2xTO: " + WEBwebSocket.readyState)
	}
}
