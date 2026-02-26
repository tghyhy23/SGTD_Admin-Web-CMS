// src/pages/Auth/Login/Login.jsx
import { useNavigate, Link } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import './Login.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const result = await login(identifier, password);
    if (!result.success) {
      setErrorMsg(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="form-inner-content">
      <h2>Đăng nhập</h2>
      
      {errorMsg && <div className="error-message">{errorMsg}</div>}
      
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label>Số điện thoại / Email</label>
          <input 
            type="text" 
            placeholder="Nhập tài khoản..." 
            required 
            value={identifier} 
            onChange={(e) => setIdentifier(e.target.value)} 
          />
        </div>

        <div className="input-group">
          <label>Mật khẩu</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>

        <button type="submit" className="btn-submit-glass" disabled={isLoading}>
          {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="login-footer">
        <Link to="/forgot-password" className="forgot-link">Quên mật khẩu?</Link>
      </div>
    </div>
  );
};

export default Login;