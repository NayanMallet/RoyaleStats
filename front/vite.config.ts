import { fileURLToPath, URL } from 'node:url'

import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api/clash': {
        target: 'https://api.clashroyale.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/clash/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            proxyReq.setHeader('Authorization', 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjUyYjQ4Mzg0LTJjNTItNGU1My05ZWNkLTM4MTY1YzViNmI5MiIsImlhdCI6MTc2NTgwMjgyOSwic3ViIjoiZGV2ZWxvcGVyLzkxZGJhNWIxLWM2NjMtY2ZjNi1kOGY4LTM0MDJhZDcyNzkyNCIsInNjb3BlcyI6WyJyb3lhbGUiXSwibGltaXRzIjpbeyJ0aWVyIjoiZGV2ZWxvcGVyL3NpbHZlciIsInR5cGUiOiJ0aHJvdHRsaW5nIn0seyJjaWRycyI6WyI4NS4xNjkuMTAxLjE2MiIsIjgyLjk2LjE2Ny4xNDciLCI4NS4xNjkuMTAxLjE2MiJdLCJ0eXBlIjoiY2xpZW50In1dfQ.dJNRFYkZ-_q60Mn5zDFZDUw-3wFr3Nce-fPJ5KJPSitqWC6AjzrJD7hFKwPoRd-w11R8iE3pA1NEOtAb1jckMw');
          });
        },
      },
    },
  },
})
