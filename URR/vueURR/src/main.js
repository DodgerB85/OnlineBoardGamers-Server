import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import i18n from './i18n'
import { useModelStore } from './stores/URRstore'

const app = createApp(App)
const pinia = createPinia()

app.use(i18n)
app.use(pinia)
app.mount('#app')

// vue-i18n records a performance mark and measure for every translation in dev.
// Firefox slows down as that timeline grows, so keep only recent entries.
if (import.meta.env.DEV) {
	const marks = ["resolve", "compilation", "evaluation"].flatMap((name) => [`intlify-message-${name}-start`, `intlify-message-${name}-end`])
	const measures = ["resolve", "compilation", "evaluation"].map((name) => `intlify message ${name}`)
	window.setInterval(() => {
		for (const name of marks) performance.clearMarks(name)
		for (const name of measures) performance.clearMeasures(name)
	}, 2000)
}

// Expose the store to window for raw JS / debugging
window.mapStore = useModelStore()
