import { beforeAll, describe, expect, it } from "vitest"
import { compile, createSSRApp } from "vue"
import { renderToString } from "vue/server-renderer"
import fs from "node:fs"
import * as rf from "./FCMreference.js"
import * as view from "./FCMview.js"

const components = ["PlayerDetails.vue", "TopMenuViews.vue", "utils/InfoPopup.vue"]
function source(component) {
	return fs.readFileSync(new URL(`../components/${component}`, import.meta.url), "utf8")
}
beforeAll(() => {
	globalThis.window = globalThis.window || {}
})

describe("SBD card display", () => {
	it("uses the x1 full-card image without changing other cards", () => {
		expect(view.getImage(`emp_${rf.SENIOR_BUSINESS_DEVELOPER}`)).toMatch(/\/e_senior_business_developer_x1\.jpg$/)
		expect(view.getImage(`emp_${rf.GURU}`)).toMatch(/\/e_guru\.jpg$/)
	})

	it.each(components)("renders the x1 icon in every %s employee-card footer", async (component) => {
		const text = source(component)
		const footers = [...text.matchAll(/<div class="employeeIconsDiv">[\s\S]*?<\/div>/g)].map((match) => match[0])
		expect(footers).toHaveLength(component === "PlayerDetails.vue" ? 2 : 1)
		for (const employee of [rf.SENIOR_BUSINESS_DEVELOPER, rf.GURU]) {
			for (const footer of footers) {
				const html = await renderToString(createSSRApp({
					setup: () => ({ rf, view, emp: employee, employeeId: employee }),
					render: compile(footer),
				}))
				expect(html.includes("icon1x.png")).toBe(true)
			}
		}
		expect(text).toMatch(/\.employeeIconsDiv\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*0;[^}]*left:\s*0;/)
	})

	it("shows the x1 card and rule in static help", () => {
		const html = fs.readFileSync(new URL("../../../templates/FCM/fanExpansionsHelp.html", import.meta.url), "utf8")
		expect(html).toContain("FCM/images/e_senior_business_developer_x1.jpg")
		expect(html).toContain("Senior Business Developer is a ×1 employee")
	})
})
