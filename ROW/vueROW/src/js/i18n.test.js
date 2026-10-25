import { describe, expect, it } from "vitest"
import i18n from "../i18n"
import { messages } from "../locales/index.js"
import { humanizeAction } from "./ROWview"

const locales = Object.keys(messages)

function flatten(value, prefix = "") {
	const out = {}
	for (const [key, entry] of Object.entries(value)) {
		const path = prefix ? `${prefix}.${key}` : key
		if (entry && typeof entry === "object") Object.assign(out, flatten(entry, path))
		else out[path] = String(entry)
	}
	return out
}

function placeholders(text) {
	return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",")
}

describe("ROW i18n", () => {
	it("has every English key in all 8 locales, with the same placeholders", () => {
		const base = flatten(messages.en)
		for (const locale of locales) {
			const other = flatten(messages[locale])
			const missing = Object.keys(base).filter((key) => !(key in other))
			const mismatched = Object.keys(base).filter((key) => key in other && placeholders(other[key]) !== placeholders(base[key]))
			expect(missing, `${locale} missing keys`).toEqual([])
			expect(mismatched, `${locale} placeholder mismatches`).toEqual([])
		}
	})

	it("localizes action and history labels", () => {
		i18n.global.locale.value = "en"
		expect(humanizeAction("MOVE")).toBe("Move your cattleman")
		expect(humanizeAction("END_TURN")).toBe("End turn")
		i18n.global.locale.value = "de"
		expect(humanizeAction("MOVE")).not.toBe("Move your cattleman")
	})
})
