// src/pages/Auth/ForgotPassword/ForgotPassword.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../../api/axiosApi';
import '../Login/Login.css'; // Dùng chung CSS của form Login cho đồng bộ

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword(identifier);
      if (response.success) {
        // Chuyển sang trang OTP và mang theo identifier (để hiển thị "Đã gửi mã đến email...")
        navigate('/otp', { state: { identifier } });
      } else {
        setErrorMsg(response.message || 'Không thể gửi yêu cầu, vui lòng thử lại.');
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Lỗi kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <h2>Quên Mật Khẩu</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '10px', fontSize: 'var(--fs-s)' }}>
        Vui lòng nhập Email hoặc Số điện thoại để nhận mã xác thực (OTP).
      </p>

      {errorMsg && <div style={{ color: 'var(--danger-color)', fontSize: 'var(--fs-s)', textAlign: 'center' }}>{errorMsg}</div>}

      <form onSubmit={handleSendOTP}>
        <input 
          type="text" 
          placeholder="Email hoặc Số điện thoại" 
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required 
        />
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Đang gửi...' : 'Gửi mã xác thực'}
        </button>
      </form>
      
      <Link to="/login" style={{ marginTop: '16px' }}>&larr; Quay lại đăng nhập</Link>
    </div>
  );
};

export default ForgotPassword;