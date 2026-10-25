import assert from "node:assert/strict"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { createPinia, setActivePinia } from "pinia"
import { createServer } from "vite"

test("game notifications stop at equal versions, correct older versions and fetch newer ones", async () => {
	const server = await createServer({
		configFile: false,
		root: fileURLToPath(new URL("../..", import.meta.url)),
		server: { middlewareMode: true },
		appType: "custom",
	})
	const originalWebSocket = globalThis.WebSocket
	const originalDocument = globalThis.document
	let socket
	const sent = []
	let fetches = 0
	try {
		setActivePinia(createPinia())
		const { usePersonalStore } = await server.ssrLoadModule("/src/stores/URRpersonal.js")
		const websocket = await server.ssrLoadModule("/src/backend/URRwebsocket.js")
		const personal = usePersonalStore()
		personal.gameID = 42
		personal.latestUpdate = 1792732000000
		personal.liveWS = true
		globalThis.document = { cookie: "" }
		globalThis.WebSocket = class {
			constructor() { socket = this; this.readyState = 1 }
			send(message) { sent.push(message) }
		}
		test.mock.method(globalThis, "fetch", async () => {
			fetches++
			return { ok: true, json: async () => ({ latest: true, missingPlayers: [] }) }
		})
		const connection = websocket.StartWebSocket()
		socket.onopen()
		await connection
		await websocket.broadcastGameUpdate()
		const notification = `NEWDATATS42${personal.latestUpdate}`
		assert.deepEqual(sent, [notification])
		await socket.onmessage({ data: notification })
		assert.deepEqual(sent, [notification], "the relay must not start an echo loop")
		const initialFetches = fetches
		await socket.onmessage({ data: `NEWDATATS42${personal.latestUpdate - 1}` })
		assert.deepEqual(sent, [notification, notification])
		await socket.onmessage({ data: notification })
		assert.equal(sent.length, 2, "an older client's correction also stops when echoed")
		assert.equal(fetches, initialFetches)
		await socket.onmessage({ data: `NEWDATATS42${personal.latestUpdate + 1}` })
		assert.equal(fetches, initialFetches + 1)
		assert.equal(sent.length, 2)
	} finally {
		test.mock.restoreAll()
		globalThis.WebSocket = originalWebSocket
		if (originalDocument === undefined) delete globalThis.document
		else globalThis.document = originalDocument
		await server.close()
	}
})
