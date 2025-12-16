import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_') // ou '' si tu veux tout charger
  const CR_KEY = env.VITE_CLASHROYALE_API_KEY

  return {
    plugins: [vue(), tailwindcss(), vueDevTools()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      proxy: {
        '/api/clash': {
          target: 'https://api.clashroyale.com/v1',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/clash/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${CR_KEY}`)
            })
          },
        },
        '/api/royaleapi': {
          target: 'https://royaleapi.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/royaleapi/, ''),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://royaleapi.com/',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        },
      },
    },
  }
})
