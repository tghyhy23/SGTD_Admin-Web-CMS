// src/layouts/AuthLayout/AuthLayout.jsx
import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <Outlet /> {/* Nơi hiển thị Login, Forgot PW, v.v. */}
      </div>
    </div>
  );
};

export default AuthLayout;