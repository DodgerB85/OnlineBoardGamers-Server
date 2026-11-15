import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let funcs, useModelStore, usePersonalStore

beforeAll(async () => {
	globalThis.window = { initData: {} }
	funcs = await import("./FCMfuncs.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
	;({ usePersonalStore } = await import("../stores/FCMpersonal.js"))
})

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.splice(0, store.players.length, { name: "OldA", displayName: "OldA" }, { name: "OldB", displayName: "OldB" })
})

describe("seat-based participant identity", () => {
	it("updates names by seat without touching custom display names", () => {
		const store = useModelStore()
		store.players[1].displayName = "Custom"

		funcs.syncSeatPlayerNames(["NewA", "NewB"], "NewA")

		expect(store.players[0].name).toBe("NewA")
		expect(store.players[0].displayName).toBe("NewA")
		expect(store.players[1].name).toBe("NewB")
		expect(store.players[1].displayName).toBe("Custom")
		expect(usePersonalStore().name).toBe("NewA")
	})

	it("ignores an array that does not match the seat count", () => {
		const store = useModelStore()

		funcs.syncSeatPlayerNames(["OnlyOne"], "Someone")

		expect(store.players.map((p) => p.name)).toEqual(["OldA", "OldB"])
		expect(usePersonalStore().name).toBe("Someone")
	})

	it("aligns saved move rows with the current seat names", () => {
		const store = useModelStore()
		store.players[0].name = "NewA"
		store.players[1].name = "NewB"

		const rows = funcs.alignMoveDataNames([
			["OldA", [1], 100],
			["OldB", [2], 200],
		])

		expect(rows[0][0]).toBe("NewA")
		expect(rows[1][0]).toBe("NewB")
	})
})
