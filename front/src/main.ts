import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { installErrorReporting, installSessionExpiry } from './lib/errorReporting'

const app = createApp(App)

installErrorReporting(app)

app.use(createPinia())
useThemeStore()
app.use(router)

installSessionExpiry(router)

import 'vue-sonner/style.css'
import './style.css'

app.mount('#app')
