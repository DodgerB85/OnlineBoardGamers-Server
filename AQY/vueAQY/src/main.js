//import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import i18n from './i18n'

const app = createApp(App)
app.use(i18n)
app.use(createPinia())

app.directive("tooltip", {
	mounted(el, binding) {
		if (!binding.value) return
		if (el instanceof SVGElement) {
			const title = document.createElementNS("http://www.w3.org/2000/svg", "title")
			title.textContent = binding.value
			el.appendChild(title)
		} else {
			el.title = binding.value
		}
	},
	updated(el, binding) {
		if (!binding.value) return
		if (el instanceof SVGElement) {
			const title = el.querySelector("title")
			if (title) title.textContent = binding.value
		} else {
			el.title = binding.value
		}
	},
})

app.mount('#app')
