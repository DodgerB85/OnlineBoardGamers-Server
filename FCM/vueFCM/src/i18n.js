import { createI18n } from 'vue-i18n'
import { messages } from './locales/index.js'

// Django language code (initData.locale) or browser language -> vue-i18n locale.
// Only en + zh-hans exist as message catalogs; other codes fall back to en.
export function detectLocale() {
	const raw =
		(typeof window !== 'undefined' && window.initData && window.initData.locale) ||
		(typeof navigator !== 'undefined' && navigator.language) ||
		'en'
	return String(raw).toLowerCase().startsWith('zh') ? 'zh-hans' : 'en'
}

export const FCMTranslations = messages

export default createI18n({
	legacy: false,
	locale: detectLocale(),
	fallbackLocale: 'en',
	messages,
	globalInjection: true,
	warnHtmlMessage: false,
	// zh-hans has one plural form (nplurals=1)
	pluralRules: {
		'zh-hans': () => 0,
	},
})
