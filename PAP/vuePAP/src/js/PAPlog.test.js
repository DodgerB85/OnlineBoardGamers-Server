import { describe, it, expect } from "vitest"
import { logIcon } from "./PAPlog.js"

describe("logIcon", () => {
	it("maps events to registry icons, and null when nothing fits", () => {
		expect(logIcon({ key: "sale", args: {} }).art).toBe("crown")
		expect(logIcon({ key: "favor", args: {} }).art).toBe("paper-favor")
		expect(logIcon({ key: "pamphlet", args: { mode: "retarget" } }).art).toBe("back-scare")
		expect(logIcon({ key: "gameOver", args: {} })).toBeNull()
	})
})
