/**
 * Live update websocket (enabled via personal.liveWS). The client also polls
 * via IO.checkForLatestData(), so updates still arrive if the socket drops.
 */

import { usePersonalStore } from "../stores/PAPpersonal.js"
import * as IO from "./PAP_IO"

export var PAPwebSocket

let connectionPromise = null
let retryCount = 0
const MAX_RETRIES = 13
const BASE_RETRY_DELAY = 2000

export async function StartWebSocket() {
	const personal = usePersonalStore()

	if (PAPwebSocket && PAPwebSocket.readyState === 1) return PAPwebSocket
	if (connectionPromise) return connectionPromise
	if (retryCount >= MAX_RETRIES) {
		personal.WSstatus = "WSdisconnected"
		return null
	}

	connectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (PAPwebSocket) PAPwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null)
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			connectionPromise = null
		}

		const handleFailure = () => {
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
			if (PAPwebSocket) PAPwebSocket.close()
			PAPwebSocket = new WebSocket("wss://wss.s3.sitereview.io/ws/HomePAPchannel" + String(personal.gameID) + "/")

			PAPwebSocket.onopen = () => {
				cleanup()
				retryCount = 0
				personal.WSstatus = "WSconnected"
				personal.liveWS = true
				IO.checkForLatestData()
				resolve(PAPwebSocket)
			}
			PAPwebSocket.onclose = () => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}
			PAPwebSocket.onerror = () => {
				cleanup()
				handleFailure("Socket Error")
				resolve(null)
			}
			PAPwebSocket.onmessage = (evt) => PAPwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return connectionPromise
}

async function PAPwebSocketOnInfo(IncomingInfo) {
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
			} else PAPwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
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
		console.warn("PAP broadcast failed:", err)
	}
}

export async function broadcastChatUpdate() {
	const personal = usePersonalStore()
	if (!personal.liveWS) return
	try {
		const socket = await StartWebSocket()
		if (socket && socket.readyState === WebSocket.OPEN) socket.send("NEWCHATTS" + String(personal.gameID))
	} catch (err) {
		console.warn("PAP chat broadcast failed:", err)
	}
}
