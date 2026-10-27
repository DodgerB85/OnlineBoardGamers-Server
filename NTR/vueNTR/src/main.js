import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import i18n from './i18n'
import { useModelStore } from './stores/NTRstore'

const app = createApp(App)
const pinia = createPinia()

app.use(i18n)
app.use(pinia)
app.mount('#app')

// Expose the store to the window object for legacy JS access
window.mapStore = useModelStore()