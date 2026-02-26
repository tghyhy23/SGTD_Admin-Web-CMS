// src/pages/Auth/OTP/OTP.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../../../api/axiosApi';
import '../Login/Login.css'; // Dùng chung CSS form

const OTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Lấy email/sđt từ trang Quên mật khẩu truyền qua
  const identifier = location.state?.identifier || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPopup, setShowPopup] = useState(false); // State hiển thị Popup thành công

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      return setErrorMsg('Mật khẩu xác nhận không khớp!');
    }

    setIsLoading(true);
    try {
      const response = await authApi.resetPassword(otp, newPassword);
      if (response.success) {
        setShowPopup(true); // Hiển thị popup thành công
      } else {
        setErrorMsg(response.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper" style={{ position: 'relative' }}>
      <h2>Đặt Lại Mật Khẩu</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '10px', fontSize: 'var(--fs-s)' }}>
        Mã xác thực đã được gửi đến: <br/><strong>{identifier}</strong>
      </p>

      {errorMsg && <div style={{ color: 'var(--danger-color)', fontSize: 'var(--fs-s)', textAlign: 'center' }}>{errorMsg}</div>}

      <form onSubmit={handleResetPassword}>
        <input 
          type="text" 
          placeholder="Nhập mã OTP (6 số)" 
          maxLength="6"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required 
        />
        <input 
          type="password" 
          placeholder="Mật khẩu mới" 
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required 
        />
        <input 
          type="password" 
          placeholder="Xác nhận mật khẩu mới" 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required 
        />
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
        </button>
      </form>
      
      <Link to="/login" style={{ marginTop: '16px' }}>&larr; Quay lại đăng nhập</Link>

      {/* POPUP THÀNH CÔNG (Tạo CSS cho nó nếu cần) */}
      {showPopup && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(255,255,255,0.95)', display: 'flex', 
          flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10
        }}>
          <h3 style={{ color: 'var(--success-color)', marginBottom: '10px' }}>Thành công! 🎉</h3>
          <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: 'var(--fs-s)' }}>
            Mật khẩu của bạn đã được cập nhật. <br/>Vui lòng đăng nhập lại.
          </p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Đến trang Đăng nhập
          </button>
        </div>
      )}
    </div>
  );
};

export default OTP;