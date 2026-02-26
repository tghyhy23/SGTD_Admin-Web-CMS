// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/axiosApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Trạng thái chờ check token khi F5

  // Kiểm tra xem user đã login chưa khi load lại trang
  useEffect(() => {
    const storedUser = localStorage.getItem('userInfo');
    const token = localStorage.getItem('accessToken');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Hàm gọi khi đăng nhập thành công
  const login = async (identifier, password) => {
    try {
      const response = await authApi.login(identifier, password);
      
      if (response.success) {
        const { user: userData, account, tokens } = response.data;
        
        // KIỂM TRA ROLE: Chỉ cho phép ADMIN hoặc SUPERADMIN (bạn có thể thêm MANAGER nếu cần)
        const allowedRoles = ['ADMIN', 'SUPERADMIN', 'MANAGER'];
        
        if (!allowedRoles.includes(account.role)) {
          // Bắn ra lỗi để Login page bắt được và hiển thị
          throw new Error('Tài khoản của bạn không có quyền truy cập hệ thống quản trị!');
        }

        // Gộp data user và account để lưu trữ dễ dùng
        const userInfo = { ...userData, role: account.role, status: account.status };

        // Lưu state và localStorage
        setUser(userInfo);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        localStorage.setItem('accessToken', tokens.accessToken);
        // Có thể lưu thêm refreshToken nếu bạn tính làm tính năng tự động refresh token
        localStorage.setItem('refreshToken', tokens.refreshToken);

        return { success: true, message: 'Đăng nhập thành công!' };
      } else {
        throw new Error(response.message || 'Đăng nhập thất bại!');
      }
    } catch (error) {
      // Bắt lỗi từ interceptor hoặc lỗi sai Role ở trên
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi kết nối đến máy chủ.';
      return { success: false, message: errorMessage };
    }
  };

  // Hàm gọi khi đăng xuất
  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
    localStorage.removeItem('accessToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};