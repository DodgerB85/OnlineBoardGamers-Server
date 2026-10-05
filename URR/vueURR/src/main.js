import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useModelStore } from './stores/URRstore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

// Expose the store to window for raw JS / debugging
window.mapStore = useModelStore()
