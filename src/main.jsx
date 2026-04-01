import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// 1. Thêm import từ thư viện React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 2. Khởi tạo một instance duy nhất của QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Ngăn việc tự động gọi lại API khi chuyển tab trình duyệt
      retry: 1, // Tự động thử lại 1 lần nếu API bị lỗi tạm thời
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 3. Bọc toàn bộ ứng dụng bằng QueryClientProvider và truyền queryClient vào */}
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)