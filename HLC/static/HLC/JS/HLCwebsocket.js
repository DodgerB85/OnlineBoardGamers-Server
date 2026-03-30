var HLCwebSocket

function StartWebSocket() {
	if (typeof HLCwebSocket !== "undefined") {
		if (HLCwebSocket.readyState === 0 || HLCwebSocket.readyState === 1) return
		else HLCwebSocket.close()
	}

	var ChannelNumber = global.gameID
	//ChannelNumber = 255

	//wsUri = "wss://connect.websocket.in/v3/" + ChannelNumber + "?apiKey=***REMOVED***";
	//wsUri = "wss://socketsbay.com/wss/v2/10/5c77d2bb57dcf99bd4bdea1584117526/";
	// var wsUri = "wss://socketsbay.com/wss/v2/" + String(ChannelNumber) + "/5c77d2bb57dcf99bd4bdea1584117526/";
	//FCMwebSocket.close();
	//var wsUri = "wss://wss.s3.sitereview.io/ws/allFCMchannels/";
	var wsUri = "wss://wss.s3.sitereview.io/ws/HomeHLCchannel" + String(ChannelNumber) + "/"

	//wss://wss.s3.sitereview.io/ws/anythingyoulikehere/

	// Alternate Jonny Server

	// wss://wsserver.fly.dev/ws/yourchannelhere/

	HLCwebSocket = new WebSocket(wsUri)

	HLCwebSocket.onopen = async function (evt) {
		HLCwebSocketOnOpen(evt)
	}
	HLCwebSocket.onclose = function (evt) {
		HLCwebSocketOnClose(evt)
	}
	HLCwebSocket.onmessage = function (evt) {
		HLCwebSocketOnInfo(evt)
	}
	HLCwebSocket.onerror = function (evt) {
		HLCwebSocketOnError(evt)
	}
}

function HLCwebSocketOnOpen(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Connected")
	IO.checkForLatestData();
}

function HLCwebSocketOnClose(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
	setTimeout(StartWebSocket, 2000)
}

function HLCwebSocketOnError(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Error")
	setTimeout(StartWebSocket, 2000)
}

function HLCwebSocketClose(evt) {
	HLCwebSocket.close()
	// MAYBE DELETE THIS?
	document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
}

async function HLCwebSocketOnInfo(IncomingInfo) {
	if (IncomingInfo.data.slice(0, 16) === "MESSAGEFROMADIN=") {
		alert(IncomingInfo.data.slice(16))
	}

	if (IncomingInfo.data.slice(0, 9) === "NEWCHATTS") {
		if (IncomingInfo.data.slice(9) == global.gameID) {
			IO.refreshChat()
		}
	}

	// UNCOMMENT ONCE RESIGN IS FIXED
	if (global.pov != undefined && M.players[global.pov].name == "HcBot" && global.name !== "BotKickStarter" && M.gameFlow.phase != PHASE_GAME_END_CHECK) {
		$("#actions").html("")
		return
	}
	if (IncomingInfo.data.slice(0, 9) === "NEWDATATS") {
		if (IncomingInfo.data.slice(9, -13) == global.gameID) {
			if (M.gameFlow.phase === PHASE_SET_FOCUS && M.gameFlow.turnOrder.length === 1) {
				//alert(1)
				window.location.reload()
			} else {
				var newTS = parseInt(IncomingInfo.data.slice(-13))
				if (newTS > global.latestUpdate) {
					global.latestUpdate = newTS
					if (M.sandboxMode) {
						$("#newComponentDiv").remove()
					}
					await IO.loadGame(C)

                    if (Rules.canPlay()) {
						// Check the browser is capable
						if ("serviceWorker" in navigator && "PushManager" in window) {
							Notification.requestPermission(function (status) {
								const title = "It is your turn in Horseless Carriage"

								const options = {
									body: "" + global.gameName + ": " + M.gameFlow.turn + " - " + PHASES_STR[M.gameFlow.phase],
									//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
									icon: "/static/HLC/images/hc_icon.png",
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
				} else HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(global.latestUpdate))
			}
		}
	}
}
