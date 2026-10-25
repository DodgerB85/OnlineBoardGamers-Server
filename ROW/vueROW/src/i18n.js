import { createI18n } from "vue-i18n"
import { messages } from "./locales/index.js"

// Django language code (initData.locale) or browser language -> vue-i18n locale.
// nl/pt are ROW-only languages and are not offered by the site selector, so an
// English site language still lets a Dutch/Portuguese browser use them.
export function detectLocale() {
	const site = String((typeof window !== "undefined" && window.initData && window.initData.locale) || "").toLowerCase()
	const browser = String((typeof navigator !== "undefined" && navigator.language) || "en").toLowerCase()
	if (site.startsWith("zh")) return "zh-hans"
	if (site.startsWith("de")) return "de"
	if (site.startsWith("fr")) return "fr"
	if (site.startsWith("es")) return "es"
	if (site.startsWith("it")) return "it"
	if (site) {
		if (site.startsWith("en")) {
			if (browser.startsWith("nl")) return "nl"
			if (browser.startsWith("pt")) return "pt"
		}
		return "en"
	}
	if (browser.startsWith("zh")) return "zh-hans"
	if (browser.startsWith("de")) return "de"
	if (browser.startsWith("fr")) return "fr"
	if (browser.startsWith("es")) return "es"
	if (browser.startsWith("it")) return "it"
	if (browser.startsWith("nl")) return "nl"
	if (browser.startsWith("pt")) return "pt"
	return "en"
}

export const ROWTranslations = messages

export default createI18n({
	legacy: false,
	locale: detectLocale(),
	fallbackLocale: "en",
	messages,
	globalInjection: true,
	warnHtmlMessage: false,
	// zh-hans has one plural form (nplurals=1)
	pluralRules: {
		"zh-hans": () => 0,
	},
})
