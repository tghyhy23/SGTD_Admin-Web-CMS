// src/layouts/AuthLayout/AuthLayout.jsx
import { Outlet } from 'react-router-dom';
import logo from '../../assets/images/logo_sgtd.png';
import './AuthLayout.css';

const AuthLayout = () => {
  return (
    <>
    <div className='logo_nav'>
      <img src={logo} alt="SGTD Logo" className="logo-image" />
    </div>
    <div className="auth-page-container">
      {/* NỬA BÊN TRÁI - GIỚI THIỆU (Sẽ cố định ở mọi trang Auth) */}
      <div className="auth-left-side">
        <h1 className="auth-welcome-title">Chào mừng trở lại!</h1>
        <div className="auth-divider"></div>
        <p className="auth-subtitle">
          Chào mừng bạn đến với hệ thống quản lí. Vui lòng đăng nhập để tiếp tục quản lý dữ liệu, dịch vụ của bạn một cách an toàn và hiệu quả.
        </p>
      </div>

      {/* NỬA BÊN PHẢI - FORM GLASSMORPHISM */}
      <div className="auth-right-side">
        <div className="glass-form-card">
          {/* Outlet chính là nơi sẽ nhúng form Login, Forgot PW, OTP vào */}
          <Outlet /> 
        </div>
      </div>
    </div>
    </>
  );
};

export default AuthLayout;