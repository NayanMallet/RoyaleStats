import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { installErrorReporting } from './lib/errorReporting'
import { installSession } from './lib/session'

const app = createApp(App)

installErrorReporting(app)

app.use(createPinia())
useThemeStore()
app.use(router)

installSession(router)

import 'vue-sonner/style.css'
import './style.css'

app.mount('#app')
