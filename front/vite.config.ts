import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// In development, every /api/* call goes through the API Gateway, exactly like nginx does in Docker.
// The Gateway must be running (docker compose up -d). Override its URL with API_GATEWAY_DEV_URL if needed.
const API_GATEWAY_DEV_URL = process.env.API_GATEWAY_DEV_URL ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [vue(), tailwindcss(), vueDevTools()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': {
        target: API_GATEWAY_DEV_URL,
        changeOrigin: true,
      },
    },
  },
})
