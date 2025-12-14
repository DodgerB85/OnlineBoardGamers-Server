import { useModelStore } from "../stores/CNSstore.js"
import { usePersonalStore } from "../stores/CNSpersonal.js"

import * as IO from "./CNS_IO"
import * as view from "./CNSview"

export var CNSwebSocket

export async function StartWebSocket() {
	if (typeof CNSwebSocket !== "undefined") {
		if (CNSwebSocket.readyState === 0 || CNSwebSocket.readyState === 1) return
		else CNSwebSocket.close()
	}
	const personal = usePersonalStore()

	var ChannelNumber = personal.gameID

	//wsUri = "wss://connect.websocket.in/v3/" + ChannelNumber + "?apiKey=***REMOVED***";
	// var wsUri = "wss://socketsbay.com/wss/v2/" + String(ChannelNumber) + "/5c77d2bb57dcf99bd4bdea1584117526/";
	//var wsUri = "wss://wss.s3.sitereview.io/ws/allFCMchannels/";
	var wsUri = "wss://wss.s3.sitereview.io/ws/HomeCNSchannel" + String(ChannelNumber) + "/"

	//wss://wss.s3.sitereview.io/ws/anythingyoulikehere/

	// Alternate Jonny Server

	// wss://wsserver.fly.dev/ws/yourchannelhere/

	CNSwebSocket = new WebSocket(wsUri)

	CNSwebSocket.onopen = async function (evt) {
		await CNSwebSocketOnOpen(evt)
	}
	CNSwebSocket.onclose = function (evt) {
		CNSwebSocketOnClose(evt)
	}
	CNSwebSocket.onmessage = function (evt) {
		CNSwebSocketOnInfo(evt)
	}
	CNSwebSocket.onerror = function (evt) {
		CNSwebSocketOnError(evt)
	}
}

async function CNSwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
	IO.checkForLatestData()
}

function CNSwebSocketOnClose() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

function CNSwebSocketOnError() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
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
