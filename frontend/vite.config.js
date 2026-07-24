import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // Allow external access (mobile)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7978',
        changeOrigin: true
      },
      '/videos': {
        target: 'http://localhost:7978',
        changeOrigin: true
      }
    }
  }
})
