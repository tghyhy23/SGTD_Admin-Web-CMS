// src/pages/Auth/Login/Login.jsx
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import { useContext, useState } from 'react';
import { AuthContext } from '../../../context/AuthContext';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    // Gọi hàm login từ AuthContext
    const result = await login(identifier, password);

    if (result.success) {
      // Nếu thành công và đúng Role, chuyển hướng vào Dashboard
      navigate('/'); 
    } else {
      // Nếu thất bại (sai pass hoặc sai Role), hiển thị lỗi
      setErrorMsg(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <h2>Đăng nhập</h2>
      {errorMsg && <div className="error-message" style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{errorMsg}</div>}
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="Số điện thoại hoặc Email" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <input type="password" placeholder="Mật khẩu" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={isLoading}>Đăng nhập</button>
      </form>
      <Link to="/forgot-password">Quên mật khẩu?</Link>
    </div>
  );
};

export default Login;