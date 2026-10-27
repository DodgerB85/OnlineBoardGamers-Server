import assert from "node:assert/strict"
import test from "node:test"
import { createSSRApp } from "vue"
import { renderToString } from "vue/server-renderer"
import CurrencyText from "./CurrencyText.js"

test("Currency text renders each SPL unit as an accessible icon and keeps amounts together", async () => {
	const html = await renderToString(createSSRApp(CurrencyText, { text: "Pump 30 SPL · reach 1\nTotal: 60 SPL" }))
	assert.equal((html.match(/alt="SPL"/g) || []).length, 2)
	assert.match(html, /white-space:nowrap/)
	assert.match(html, /30 <img/)
	assert.match(html, /reach 1\nTotal: /)
})

test("Currency text escapes markup and leaves words containing SPL untouched", async () => {
	const html = await renderToString(createSSRApp(CurrencyText, { text: "<b>SPLENDOR</b> 5 SPL" }))
	assert.match(html, /&lt;b&gt;SPLENDOR&lt;\/b&gt;/)
	assert.equal((html.match(/alt="SPL"/g) || []).length, 1)
})
