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

test("Inline icons sit immediately before their hex labels", async () => {
	const html = await renderToString(createSSRApp(CurrencyText, {
		text: "Bought H7 · Sold A1, F8 before buying",
		inlineIcons: {
			H7: { src: "/savannah.png", alt: "Savannah" },
			A1: { src: "/desert.png", alt: "Desert" },
			F8: { src: "/forest.png", alt: "Forest" },
		},
	}))
	assert.match(html, /Bought <img[^>]*src="\/savannah.png"[^>]*>H7/)
	assert.match(html, /Sold <img[^>]*src="\/desert.png"[^>]*>A1, <img[^>]*src="\/forest.png"[^>]*>F8/)
})

test("An inline icon can follow its label", async () => {
	const html = await renderToString(createSSRApp(CurrencyText, {
		text: "Elam: built a reservoir at D10",
		inlineIcons: {
			reservoir: { src: "/reservoir.png", alt: "Reservoir", after: true },
		},
	}))
	assert.match(html, /built a reservoir<img[^>]*src="\/reservoir.png"[^>]*> at D10/)
})

test("A longer land label wins over one that prefixes it", async () => {
	const html = await renderToString(createSSRApp(CurrencyText, {
		text: "Bought A10",
		inlineIcons: {
			A1: { src: "/one.png", alt: "One" },
			A10: { src: "/ten.png", alt: "Ten" },
		},
	}))
	assert.match(html, /Bought <img[^>]*src="\/ten.png"[^>]*>A10/)
	assert.doesNotMatch(html, /<img[^>]*src="\/one.png"/)
})
