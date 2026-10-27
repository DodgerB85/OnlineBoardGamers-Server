import { createI18n } from 'vue-i18n'
import { messages } from './locales/index.js'

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

export const NTRTranslations = messages

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages,
  globalInjection: true,
  warnHtmlMessage: false,
  pluralRules: {
    'zh-hans': () => 0,
  },
})

// Export t function for use in script setup
export const t = (key, ...args) => i18n.global.t(key, ...args)

export default i18n