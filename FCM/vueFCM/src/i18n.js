import { createI18n } from 'vue-i18n'
import { messages } from './locales/index.js'

// Django language code (initData.locale) or browser language -> vue-i18n locale.
export function detectLocale() {
	const raw = String(
		(typeof window !== 'undefined' && window.initData && window.initData.locale) ||
			(typeof navigator !== 'undefined' && navigator.language) ||
			'en',
	).toLowerCase()
	if (raw.startsWith('zh')) return 'zh-hans'
	if (raw.startsWith('de')) return 'de'
	if (raw.startsWith('fr')) return 'fr'
	if (raw.startsWith('es')) return 'es'
	if (raw.startsWith('it')) return 'it'
	return 'en'
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
