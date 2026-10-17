import { createI18n } from "vue-i18n"
import { messages } from "./locales/index.js"

// Django language code (initData.locale) or browser language -> vue-i18n locale.
export function detectLocale() {
	const raw = String(
		(typeof window !== "undefined" && window.initData && window.initData.locale) ||
			(typeof navigator !== "undefined" && navigator.language) ||
			"en",
	).toLowerCase()
	if (raw.startsWith("it")) return "it"
	if (raw.startsWith("nl")) return "nl"
	if (raw.startsWith("pt")) return "pt"
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
})
