import { createI18n } from "vue-i18n"
import app from "./locales/app"
import rowEn from "./locales/row/en.json"
import rowIt from "./locales/row/it.json"
import rowNl from "./locales/row/nl.json"
import rowPt from "./locales/row/pt.json"

/** Django language code (initData.locale) or browser language -> vue-i18n locale. */
export function detectLocale(): string {
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

// ROW's own locale files are already namespaced under `row`. The app adds a top-level `app` namespace.
export const messages = {
	en: { ...app, ...(rowEn as Record<string, unknown>) },
	it: { ...app, ...(rowIt as Record<string, unknown>) },
	nl: { ...app, ...(rowNl as Record<string, unknown>) },
	pt: { ...app, ...(rowPt as Record<string, unknown>) },
}

export default createI18n({
	legacy: false,
	locale: detectLocale(),
	fallbackLocale: "en",
	messages,
	globalInjection: true,
	warnHtmlMessage: false,
})
