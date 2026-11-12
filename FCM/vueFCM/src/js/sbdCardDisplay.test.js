import { beforeAll, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { compile, createSSRApp } from "vue"
import { renderToString } from "vue/server-renderer"
import fs from "node:fs"
import * as rules from "./FCMrules.js"
import * as rf from "./FCMreference.js"
import * as view from "./FCMview.js"
import { useModelStore } from "../stores/FCMstore.js"

const components = ["PlayerDetails.vue", "TopMenuViews.vue", "utils/InfoPopup.vue"]
function source(component) {
	return fs.readFileSync(new URL(`../components/${component}`, import.meta.url), "utf8")
}
function setup(uniqueCards) {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.startingOptions.seniorBusinessDeveloper = true
	store.seniorBusinessDeveloper.uniqueCards = uniqueCards
	return store
}
beforeAll(() => {
	globalThis.window = globalThis.window || {}
})

describe("SBD version-aware card display", () => {
	it.each([false, true])("routes version %s to its matching full-card image without changing other cards", (uniqueCards) => {
		setup(uniqueCards)
		expect(view.getImage(`emp_${rf.SENIOR_BUSINESS_DEVELOPER}`)).toMatch(new RegExp(`/e_senior_business_developer${uniqueCards ? "_x1" : ""}\\.jpg$`))
		expect(view.getImage(`emp_${rf.GURU}`)).toMatch(/\/e_guru\.jpg$/)
	})

	it.each(components)("renders the correct ×1 icon in every %s employee-card footer", async (component) => {
		const text = source(component)
		const footers = [...text.matchAll(/<div class="employeeIconsDiv">[\s\S]*?<\/div>/g)].map((match) => match[0])
		expect(footers).toHaveLength(component === "PlayerDetails.vue" ? 2 : 1)
		for (const uniqueCards of [false, true]) {
			const store = setup(uniqueCards)
			for (const employee of [rf.SENIOR_BUSINESS_DEVELOPER, rf.GURU]) {
				for (const footer of footers) {
					const html = await renderToString(createSSRApp({
						setup: () => ({ rf, rules, view, emp: employee, employeeId: employee }),
						render: compile(footer),
					}))
					expect(html.includes('icon1x.png')).toBe(employee === rf.GURU || uniqueCards)
				}
			}
			store.startingOptions.seniorBusinessDeveloper = false
			expect(rules.isUniqueEmployee(rf.SENIOR_BUSINESS_DEVELOPER)).toBe(false)
		}
		expect(text).toMatch(/import \* as rules from /)
		expect(text).toMatch(/\.employeeIconsDiv\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*0;[^}]*left:\s*0;/)
	})

	it("shows the new card and explicitly documents grandfathered games in static help", () => {
		const html = fs.readFileSync(new URL("../../../templates/FCM/fanExpansionsHelp.html", import.meta.url), "utf8")
		expect(html).toContain("FCM/images/e_senior_business_developer_x1.jpg")
		expect(html).toContain("Existing games retain the original six-card supply and may own multiple Senior Business Developers.")
	})
})
