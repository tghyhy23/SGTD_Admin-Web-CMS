import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['admin-sgtd.congtyeon.com'],
  },
  server: {
    port: 5174,
    proxy: {
      '/api/v1': {
        target: 'https://api-sgtd.congtyeon.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
