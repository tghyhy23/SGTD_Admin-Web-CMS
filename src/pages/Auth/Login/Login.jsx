// src/pages/Auth/Login/Login.jsx
import { Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import "./Login.css";

const translateLoginError = (errorMsg) => {
    if (!errorMsg) return "Đăng nhập thất bại, vui lòng thử lại!";
    const msg = errorMsg.toLowerCase();

    // Dựa trên loginService từ backend
    if (msg.includes("identifier and password are required")) return "Vui lòng nhập Email/Số điện thoại và Mật khẩu.";
    if (msg.includes("too many login attempts")) return "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.";
    if (msg.includes("invalid identifier or password")) return "Tài khoản hoặc mật khẩu không chính xác!";
    if (msg.includes("log in using your google account")) return "Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.";
    if (msg.includes("inactive or has been suspended") || msg.includes("deleted")) return "Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động.";
    if (msg.includes("not verified")) return "Tài khoản chưa được xác thực. Vui lòng kiểm tra email hoặc số điện thoại.";
    if (msg.includes("user profile not found")) return "Dữ liệu hồ sơ bị lỗi, không tìm thấy người dùng.";
    if (msg.includes("internal server error")) return "Lỗi máy chủ, vui lòng thử lại sau!";

    return errorMsg; // Nếu có lỗi lạ chưa được map thì hiển thị text gốc
};

const Login = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const { login } = useContext(AuthContext);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setIsLoading(true);

        const result = await login(identifier, password);
        if (!result.success) {
            // 🟢 SỬ DỤNG HÀM DỊCH LỖI Ở ĐÂY
            setErrorMsg(translateLoginError(result.message || result.error));
            setIsLoading(false);
        }
    };

    return (
        <div className="form-inner-content">
            <div className="form-header">
                <h2>Đăng nhập</h2>
                <span className="line"></span>
            </div>

            {errorMsg && <div className="error-message">{errorMsg}</div>}

            <form onSubmit={handleLogin} className="form-login">
                <div className="input-container">
                    <div className="input-group">
                        <label>Số điện thoại / Email</label>

                        <div className="input-icon-wrapper">
                            {/* Icon User */}
                            <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#757575">
                                <path d="M367-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm296.5-343.5Q560-607 560-640t-23.5-56.5Q513-720 480-720t-56.5 23.5Q400-673 400-640t23.5 56.5Q447-560 480-560t56.5-23.5ZM480-640Zm0 400Z" />
                            </svg>

                            <input type="text" placeholder="admin@gmail.com" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Mật khẩu</label>
                        {/* BỌC INPUT TRONG 1 DIV ĐỂ ĐỊNH VỊ ICON */}
                        <div className="password-input-wrapper">
                            <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#757575">
                                <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm296.5-143.5Q560-327 560-360t-23.5-56.5Q513-440 480-440t-56.5 23.5Q400-393 400-360t23.5 56.5Q447-280 480-280t56.5-23.5ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z" />
                            </svg>
                            <input type={showPassword ? "text" : "password"} placeholder="enter your password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                            {/* NÚT TOGGLE */}
                            <button type="button" className="toggle-password-btn" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? (
                                    /* Icon Eye (Mở mắt) */
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-icon lucide-eye">
                                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                ) : (
                                    /* Icon Eye Closed (Nhắm mắt) */
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-closed-icon lucide-eye-closed">
                                        <path d="m15 18-.722-3.25" />
                                        <path d="M2 8a10.645 10.645 0 0 0 20 0" />
                                        <path d="m20 15-1.726-2.05" />
                                        <path d="m4 15 1.726-2.05" />
                                        <path d="m9 18 .722-3.25" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* <div className="login-footer">
                    <Link to="/forgot-password" className="forgot-link">
                        Quên mật khẩu?
                    </Link>
                </div> */}

                <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                </button>
            </form>
        </div>
    );
};

export default Login;
