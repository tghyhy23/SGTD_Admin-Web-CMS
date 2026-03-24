// src/pages/Auth/ResetPassword/ResetPassword.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import './ResetPassword.css';

const ResetPassword = () => {
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const handleReset = (e) => {
    e.preventDefault();
    // Giả lập call API thành công
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    navigate('/login'); // Quay về login sau khi đóng popup
  };

  return (
    <div className="reset-password-wrapper">
      <h2>Nhập mật khẩu mới</h2>
      <form onSubmit={handleReset}>
        <input type="password" placeholder="Mật khẩu mới" required />
        <input type="password" placeholder="Xác nhận mật khẩu" required />
        <button type="submit" className="btn-primary">Xác nhận</button>
      </form>

      {/* POPUP HIỂN THỊ KHI THÀNH CÔNG */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Thành công!</h3>
            <p>Mật khẩu của bạn đã được cập nhật.</p>
            <button onClick={closePopup} className="btn-primary">Quay về Đăng nhập</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;