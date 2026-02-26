// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/base.css'; // Import global CSS

// Layouts
import AuthLayout from './layouts/AuthLayout/AuthLayout';
import MainLayout from './layouts/MainLayout/MainLayout';

// Auth Pages
import Login from './pages/Auth/Login/Login';
// import ForgotPassword from './pages/Auth/ForgotPassword/ForgotPassword'; // Tự tạo tương tự Login
// import OTP from './pages/Auth/OTP/OTP';                                  // Tự tạo tương tự Login
// import ResetPassword from './pages/Auth/ResetPassword/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Services from './pages/Services/Services';

// Dashboard & Management Pages (Ví dụ 1 trang)

// Import các trang khác như Users, Services... tương tự

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Nhóm Route cho Authentication (không có sidebar) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          {/* <Route path="/forgot-password" element={<ForgotPassword />} /> */}
          {/* <Route path="/otp" element={<OTP />} />
          <Route path="/reset-password" element={<ResetPassword />} /> */}
        </Route>

        {/* Nhóm Route cho Admin Dashboard (có sidebar) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<div>Trang Quản lý người dùng</div>} />
          <Route path="/services" element={<Services />} />
          {/* Cấu hình các route quản lý khác ở đây */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;