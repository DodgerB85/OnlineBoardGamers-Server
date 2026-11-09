import { describe, expect, it } from "vitest"
import { getStatusBannerLabels, readableTextColour } from "../../../Lobby/static/Lobby/common/statusBannerLabels.js"

describe("shared status banner labels", () => {
	it("formats turn and waiting labels in every supported language", () => {
		expect(getStatusBannerLabels("en", { turn: 3 }).turn).toBe("Turn 3")
		expect(getStatusBannerLabels("de", { turn: 3 }).turn).toBe("Runde 3")
		expect(getStatusBannerLabels("es", { turn: 3 }).turn).toBe("Turno 3")
		expect(getStatusBannerLabels("fr", { turn: 3 }).turn).toBe("Tour 3")
		expect(getStatusBannerLabels("it", { turn: 3 }).turn).toBe("Turno 3")
		expect(getStatusBannerLabels("zh-hans", { turn: 3 }).turn).toBe("第 3 回合")
		expect(getStatusBannerLabels("pt", { turn: 3 }).turn).toBe("Turno 3")
		expect(getStatusBannerLabels("nl", { turn: 3 }).turn).toBe("Beurt 3")
		expect(getStatusBannerLabels("fr", { names: "Alice, Bob" }).waitingFor).toBe("En attente de Alice, Bob")
	})

	it("keeps the player chip readable on light and dark colours", () => {
		expect(readableTextColour("#ffff00")).toBe("black")
		expect(readableTextColour("yellow")).toBe("black")
		expect(readableTextColour("#FB9907")).toBe("black")
		expect(readableTextColour("#0C64AE")).toBe("white")
		expect(readableTextColour("black")).toBe("white")
	})
})
