// src/api/axiosApi.js
import axios from 'axios';

// Khởi tạo instance với baseURL
const axiosApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Tự động đính kèm token vào header nếu có
axiosApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); // Lấy token từ localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Xử lý lỗi chung (VD: 401 Unauthorized)
axiosApi.interceptors.response.use(
  (response) => {
    return response.data; // Thường api trả về { data, message, status }, ta lấy luôn data
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Logic xử lý khi token hết hạn (ví dụ: clear localStorage, redirect về /login)
      console.error('Token expired or unauthorized');
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  // 1. Đăng nhập
  login: (identifier, password) => {
    return axiosApi.post('/auth/login', { identifier, password });
  },
  
  // 2. Yêu cầu quên mật khẩu (Gửi mã OTP về email)
  forgotPassword: (identifier) => {
    return axiosApi.post('/auth/forgot-password', { identifier });
  },

  // 3. Xác thực OTP (Tùy backend của bạn dùng hàm nào, tôi lấy theo reset trực tiếp)
  resetPassword: (otp, newPassword) => {
    return axiosApi.post('/auth/reset-password', { otp, newPassword });
  }
  
  // Lưu ý: Đổi lại đường dẫn '/auth/...' cho khớp chính xác với router backend của bạn nhé.
};

export const serviceApi = {
  // Lấy tất cả services (dịch vụ chính)
  getAllServices: () => axiosApi.get('/service'),
  
  // Lấy các variants (biến thể/sản phẩm) dựa trên serviceId
  getVariantsByServiceId: (serviceId) => axiosApi.get(`/service-variant/service/${serviceId}`),
  getVariantById: (id) => axiosApi.get(`/service-variant/${id}`),
};