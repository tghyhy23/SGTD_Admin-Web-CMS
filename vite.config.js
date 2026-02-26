import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Khi gọi API bắt đầu bằng '/api/v1', Vite sẽ chuyển tiếp nó đến Backend thật
      '/api/v1': {
        target: 'https://api-sgtd.congtyeon.com',
        changeOrigin: true,
        secure: false, // Thêm dòng này nếu gọi https bị lỗi chứng chỉ ở local
      }
    }
  }
})
