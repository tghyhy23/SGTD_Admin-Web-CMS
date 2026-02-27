// src/pages/Auth/Login/Login.jsx
import { Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import "./Login.css";

const Login = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    // THÊM STATE ĐỂ TOGGLE MẬT KHẨU
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useContext(AuthContext);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg("");
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

            <form onSubmit={handleLogin} className="form-login">
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
                    {/* BỌC INPUT TRONG 1 DIV ĐỂ ĐỊNH VỊ ICON */}
                    <div className="password-input-wrapper">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            required 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                        {/* NÚT TOGGLE */}
                        <button 
                            type="button" 
                            className="toggle-password-btn"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                /* Icon Eye (Mở mắt) */
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-icon lucide-eye">
                                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            ) : (
                                /* Icon Eye Closed (Nhắm mắt) */
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-closed-icon lucide-eye-closed">
                                    <path d="m15 18-.722-3.25"/>
                                    <path d="M2 8a10.645 10.645 0 0 0 20 0"/>
                                    <path d="m20 15-1.726-2.05"/>
                                    <path d="m4 15 1.726-2.05"/>
                                    <path d="m9 18 .722-3.25"/>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="login-footer">
                    <Link to="/forgot-password" className="forgot-link">
                        Quên mật khẩu?
                    </Link>
                </div>

                <button type="submit" className="btn-submit-glass" disabled={isLoading}>
                    {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                </button>
            </form>
        </div>
    );
};

export default Login;