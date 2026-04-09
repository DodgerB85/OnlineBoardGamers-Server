import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"

import * as IO from "./AQY_IO"
import * as view from "../js/AQYview"

export var AQYwebSocket

export async function StartWebSocket() {
	if (typeof AQYwebSocket !== "undefined") {
		if (AQYwebSocket.readyState === 0 || AQYwebSocket.readyState === 1) return
		else AQYwebSocket.close()
	}
	const personal = usePersonalStore()

	var ChannelNumber = personal.gameID

	var wsUri = "wss://wss.s3.sitereview.io/ws/HomeAQYchannel" + String(ChannelNumber) + "/"

	AQYwebSocket = new WebSocket(wsUri)

	AQYwebSocket.onopen = async function (evt) {
		await AQYwebSocketOnOpen(evt)
	}
	AQYwebSocket.onclose = function (evt) {
		AQYwebSocketOnClose(evt)
	}
	AQYwebSocket.onmessage = function (evt) {
		AQYwebSocketOnInfo(evt)
	}
	AQYwebSocket.onerror = function (evt) {
		AQYwebSocketOnError(evt)
	}
}

async function AQYwebSocketOnOpen() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSconnected"
	personal.liveWS = true
	IO.checkForLatestData()
}

function AQYwebSocketOnClose() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

function AQYwebSocketOnError() {
	const personal = usePersonalStore()
	personal.WSstatus = "WSdisconnected"
	// Reconnect after a delay
	setTimeout(StartWebSocket, 2000)
}

async function AQYwebSocketOnInfo(IncomingInfo) {
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
					if (personal.yourTurnAudioType == 1) beep = new Audio("/static/AQY/sounds/beep.mp3")
					if (personal.yourTurnAudioType == 2) beep = new Audio("/static/AQY/sounds/bell.mp3")
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
							const title = "It is your turn in Antiquity"
	
							const options = {
								body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
								//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
								icon: "/static/AQY/images/aqy_icon.png",
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

				
			} else AQYwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))


		}
	}

	// Trade update
	if (IncomingInfo.data.slice(0, 9) === "NEWDATATT") {
		if (IncomingInfo.data.slice(9) == personal.gameID) {
			let relevantIncomingTradesCopy = JSON.parse(JSON.stringify(store.context.relevantIncomingTrades))
			let relevantOutgoingTradesCopy = JSON.parse(JSON.stringify(store.context.relevantOutgoingTrades))
			let irrelevantTradesCopy = JSON.parse(JSON.stringify(store.context.irrelevantTrades))
			let oldHistoryLength = store.history.length
			await IO.reloadTradeData()
			if (personal.yourTurnAudioType > 0) {
				let beep
				if (personal.yourTurnAudioType == 1) beep = new Audio("/static/AQY/sounds/beep.mp3")
				if (personal.yourTurnAudioType == 2) beep = new Audio("/static/AQY/sounds/bell.mp3")
				beep.play()
			}
			let differencesIncoming = compareArraysOfArrays(relevantIncomingTradesCopy, store.context.relevantIncomingTrades)
			let differencesOutgoing = compareArraysOfArrays(relevantOutgoingTradesCopy, store.context.relevantOutgoingTrades)
			let differencesIrrelevant = compareArraysOfArrays(irrelevantTradesCopy, store.context.irrelevantTrades)
			let newHistoryLength = store.history.length
			store.clearMessages()

			if (differencesIncoming.length === 0 && differencesOutgoing.length === 0 && differencesIrrelevant.length !== 0) {
				//store.topMenuViews.tradeErrorText = "Other players have made a trade action. If a trade was accepted, it will show in your history"
				// Irrelevant trade added - show who proposes to who
				if (differencesIrrelevant[0].type === "added") {
					store.topMenuViews.tradeErrorText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesIrrelevant[0].data[0]].colour) + `">${store.players[differencesIrrelevant[0].data[0]].displayName}</span></div> proposed a trade to <div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesIrrelevant[0].data[1]].colour) + `">${store.players[differencesIrrelevant[0].data[1]].displayName}</span></div>`
					store.topMenuViews.WStradeToDisplay.push(...differencesIrrelevant[0].data)
				}
				// Irrelevant trade deleted - show if it was accepted or rejected
				else if (differencesIrrelevant[0].type === "deleted") {
					if (oldHistoryLength === newHistoryLength) {
						store.topMenuViews.tradeErrorText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesIrrelevant[0].data[1]].colour) + `">${store.players[differencesIrrelevant[0].data[1]].displayName}</span></div> rejected a trade from <div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesIrrelevant[0].data[0]].colour) + `">${store.players[differencesIrrelevant[0].data[0]].displayName}</span></div>`
						store.topMenuViews.WStradeToDisplay.push(...differencesIrrelevant[0].data)
					} else {
						store.topMenuViews.tradeSuccessText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesIrrelevant[0].data[1]].colour) + `">${store.players[differencesIrrelevant[0].data[1]].displayName}</span></div> accepted a trade from <div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesIrrelevant[0].data[0]].colour) + `">${store.players[differencesIrrelevant[0].data[0]].displayName}</span></div>`
						store.topMenuViews.WStradeToDisplay.push(...differencesIrrelevant[0].data)
					}
				}
			} else if (differencesIncoming.length > 0) {
				// Change in incoming info
				if (differencesIncoming[0].type === "added") {
					store.topMenuViews.tradeSuccessText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesIncoming[0].data[0]].colour) + `">${store.players[differencesIncoming[0].data[0]].displayName}</span></div> has sent you a trade`
					store.topMenuViews.WStradeToDisplay.push(...differencesIncoming[0].data)
				} else if (differencesIncoming[0].type === "deleted") {
					// THIS CAN HAPPEN IF SOMEONE ELSE ACCEPTED A TRADE TO THE ORIGINATOR
					store.topMenuViews.tradeErrorText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesIncoming[0].data[0]].colour) + `">${store.players[differencesIncoming[0].data[0]].displayName}</span></div>'s trade has been cancelled as they were involved in a different trade`
				}
			} else if (differencesOutgoing.length > 0) {
				// Change in incoming info
				if (differencesOutgoing[0].type === "added") {
					alert("diff out add")
				} else if (differencesOutgoing[0].type === "deleted") {
					if (oldHistoryLength === newHistoryLength) store.topMenuViews.tradeErrorText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesOutgoing[0].data[1]].colour) + `">${store.players[differencesOutgoing[0].data[1]].displayName}</span></div> rejected your trade`
					else store.topMenuViews.tradeSuccessText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[differencesOutgoing[0].data[1]].colour) + `">${store.players[differencesOutgoing[0].data[1]].displayName}</span></div> accepted your trade`
					store.topMenuViews.WStradeToDisplay.push(...differencesOutgoing[0].data)
				}
			}
		}
	}
}

function compareArraysOfArrays(arr1, arr2) {
	const differences = []

	// Find elements in arr1 that are not in arr2 (deleted elements)
	for (let subArr of arr1) {
		if (!arr2.some((subArr2) => JSON.stringify(subArr) === JSON.stringify(subArr2))) {
			differences.push({ type: "deleted", data: subArr })
		}
	}

	// Find elements in arr2 that are not in arr1 (added elements)
	for (let subArr of arr2) {
		if (!arr1.some((subArr1) => JSON.stringify(subArr) === JSON.stringify(subArr1))) {
			differences.push({ type: "added", data: subArr })
		}
	}

	return differences
}

function findObjectDifferences(obj1, obj2) {
	const differences = {}

	// Check properties in obj1
	for (let key in obj1) {
		if (obj1[key] !== obj2[key]) {
			differences[key] = [obj1[key], obj2[key]]
		}
	}

	// Check properties in obj2
	for (let key in obj2) {
		if (obj1[key] !== obj2[key] && !differences[key]) {
			differences[key] = [obj1[key], obj2[key]]
		}
	}

	return differences
}

function deepObjectDifference(obj1, obj2) {
	const diff = {}

	// Loop over all keys in obj1
	for (let key in obj1) {
		if (typeof obj1[key] === "object" && obj1[key] !== null) {
			// If the value is an object, recursively compare
			const nestedDiff = deepObjectDifference(obj1[key], obj2[key])
			if (Object.keys(nestedDiff).length > 0) {
				diff[key] = nestedDiff
			}
		} else if (obj1[key] !== obj2[key]) {
			// Values are different
			diff[key] = [obj1[key], obj2[key]]
		}
	}

	// Check for keys in obj2 not present in obj1
	for (let key in obj2) {
		if (!(key in obj1)) {
			diff[key] = [undefined, obj2[key]]
		}
	}

	return diff
}
