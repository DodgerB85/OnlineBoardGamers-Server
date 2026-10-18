import { describe, it, expect, vi } from "vitest"
import { createSSRApp } from "vue"
import { renderToString } from "vue/server-renderer"
import PotionChip from "./PotionChip.vue"

const viewer = vi.hoisted(() => ({ pov: 0 }))
vi.mock("../../stores/PAPpersonal.js", () => ({ usePersonalStore: () => viewer }))

function render(poison, compact, pov) {
	viewer.pov = pov
	const potion = { recipe: "HS1", disp: null, potency: 1 + poison, poison }
	return renderToString(createSSRApp(PotionChip, { potion, owner: 0, compact }))
}

describe("potion privacy", () => {
	for (const compact of [false, true]) {
		it(`conceals Poison-derived potency from rivals and observers (${compact ? "compact" : "full"})`, async () => {
			for (const pov of [1, -1]) {
				const clean = await render(0, compact, pov)
				const poisoned = await render(3, compact, pov)
				expect(poisoned).toBe(clean)
				expect(poisoned).toContain("potency hidden")
				expect(poisoned).toContain("?")
			}
		})

		it(`shows the owner their total potency and Poison (${compact ? "compact" : "full"})`, async () => {
			const html = await render(3, compact, 0)
			expect(html).toContain("potency 4")
			expect(html).toContain("poison 3")
		})
	}
})
