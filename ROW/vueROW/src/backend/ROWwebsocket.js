/**
 * Live update websocket. The client also polls via reloadFromServer, so
 * updates still arrive if the socket drops.
 */

import { usePersonalStore } from "../stores/ROWpersonal"

export let ROWwebSocket

let connectionPromise = null
let retryCount = 0
const MAX_RETRIES = 13
const BASE_RETRY_DELAY = 2000

/**
 * Message handler registered once by the caller. It is (re)attached to every new
 * socket in `startWebSocket`, so a reconnect does not lose live updates.
 */
let onMessageHandler = null
export function setOnMessage(handler) {
	onMessageHandler = handler
}

export async function startWebSocket() {
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
			handleFailure()
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
				setTimeout(() => void startWebSocket(), BASE_RETRY_DELAY * Math.pow(2, retryCount - 1))
			} else {
				personal.WSstatus = "WSdisconnected"
			}
		}

		try {
			if (ROWwebSocket) ROWwebSocket.close()
			ROWwebSocket = new WebSocket("wss://wss.s3.sitereview.io/ws/HomeROWchannel" + String(personal.gameID) + "/")
			ROWwebSocket.onmessage = (evt) => {
				if (onMessageHandler) onMessageHandler(evt)
			}
			ROWwebSocket.onopen = () => {
				cleanup()
				retryCount = 0
				personal.WSstatus = "WSconnected"
				personal.liveWS = true
				resolve(ROWwebSocket ?? null)
			}
			ROWwebSocket.onclose = () => {
				cleanup()
				handleFailure()
				resolve(null)
			}
			ROWwebSocket.onerror = () => {
				cleanup()
				handleFailure()
				resolve(null)
			}
		} catch {
			cleanup()
			handleFailure()
			resolve(null)
		}
	})

	return connectionPromise
}

export function broadcastGameUpdate() {
	const personal = usePersonalStore()
	if (!personal.liveWS || !ROWwebSocket || ROWwebSocket.readyState !== 1) return
	ROWwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
}

export function broadcastChatUpdate() {
	const personal = usePersonalStore()
	if (!personal.liveWS || !ROWwebSocket || ROWwebSocket.readyState !== 1) return
	ROWwebSocket.send("NEWCHATTS" + String(personal.gameID))
}
