/**
 * Live update websocket (enabled via personal.liveWS). The client also polls
 * via IO.checkForLatestData(), so updates still arrive if the socket drops.
 */

import { usePersonalStore } from "../stores/ROWpersonal.js"
import * as IO from "./ROW_IO"

export var ROWwebSocket

let connectionPromise = null
let retryCount = 0
const MAX_RETRIES = 13
const BASE_RETRY_DELAY = 2000

export async function StartWebSocket() {
	const personal = usePersonalStore()

	if (ROWwebSocket && ROWwebSocket.readyState === 1) return ROWwebSocket
	if (connectionPromise) return connectionPromise
	if (retryCount >= MAX_RETRIES) {
		personal.WSstatus = "WSdisconnected"
		return null
	}

	connectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (ROWwebSocket) ROWwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null)
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			connectionPromise = null
		}

		const handleFailure = (reason) => {
			retryCount++
			personal.liveWS = false
			if (retryCount < MAX_RETRIES) {
				personal.WSstatus = "WSconnecting"
				setTimeout(StartWebSocket, BASE_RETRY_DELAY * Math.pow(2, retryCount - 1))
			} else {
				personal.WSstatus = "WSdisconnected"
			}
		}

		try {
			if (ROWwebSocket) ROWwebSocket.close()
			ROWwebSocket = new WebSocket("wss://wss.s3.sitereview.io/ws/HomeROWchannel" + String(personal.gameID) + "/")

			ROWwebSocket.onopen = (evt) => {
				cleanup()
				retryCount = 0
				personal.WSstatus = "WSconnected"
				personal.liveWS = true
				IO.checkForLatestData()
				resolve(ROWwebSocket)
			}
			ROWwebSocket.onclose = () => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}
			ROWwebSocket.onerror = () => {
				cleanup()
				handleFailure("Socket Error")
				resolve(null)
			}
			ROWwebSocket.onmessage = (evt) => ROWwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return connectionPromise
}

async function ROWwebSocketOnInfo(IncomingInfo) {
	const personal = usePersonalStore()
	if (IncomingInfo.data.slice(0, 16) === "MESSAGEFROMADIN=") alert(IncomingInfo.data.slice(16))
	if (IncomingInfo.data.slice(0, 9) === "NEWCHATTS") {
		if (IncomingInfo.data.slice(9) == personal.gameID) IO.reloadChatData()
	}
	if (IncomingInfo.data.slice(0, 9) === "NEWDATATS") {
		if (IncomingInfo.data.slice(9, -13) == personal.gameID) {
			let newTS = parseInt(IncomingInfo.data.slice(-13))
			if (newTS > personal.latestUpdate) {
				personal.haltPlay = true
				personal.latestUpdate = newTS
				window.initData.latestUpdate = newTS
				await IO.reloadGameData()
				personal.haltPlay = false
			} else ROWwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		}
	}
}

export async function broadcastGameUpdate(existingPromise = null) {
	const personal = usePersonalStore()
	if (!personal.liveWS) return
	try {
		const socket = await (existingPromise || StartWebSocket())
		if (socket && socket.readyState === 1) socket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
	} catch (err) {
		console.warn("ROW broadcast failed:", err)
	}
}

export async function broadcastChatUpdate() {
	const personal = usePersonalStore()
	if (!personal.liveWS) return
	try {
		const socket = await StartWebSocket()
		if (socket && socket.readyState === WebSocket.OPEN) socket.send("NEWCHATTS" + String(personal.gameID))
	} catch (err) {
		console.warn("ROW chat broadcast failed:", err)
	}
}
