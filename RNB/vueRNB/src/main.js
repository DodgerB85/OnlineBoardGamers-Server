import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useModelStore } from './stores/RNBstore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

// 🔥 CRITICAL: Expose the store to the window object
// This allows your raw HTML/JS functions to access it.
window.mapStore = useModelStore()