import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  define: {
    __API_URL__: JSON.stringify('https://crypto-paste-api.bopbap.workers.dev'),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
