// src/layouts/AuthLayout/AuthLayout.jsx
import { Outlet } from "react-router-dom";
import logo from "../../assets/images/logo_sgtd.png";
import "./AuthLayout.css";

const AuthLayout = () => {
    return (
        <>
            <div className="auth-page-container">
                {/* NỬA BÊN TRÁI - GIỚI THIỆU (Sẽ cố định ở mọi trang Auth) */}
                <svg width="0" height="0" style={{ position: "absolute" }}>
                    <defs>
                        <clipPath id="wave-clip" clipPathUnits="objectBoundingBox">
                            {/* 
                                Giải thích tọa độ (từ 0 đến 1, tương đương 0% đến 100%):
                                M 0,0: Bắt đầu từ góc trên cùng bên trái.
                                L 0.6,0: Kéo đường thẳng sang phải đến 60% chiều ngang.
                                C 0.9,0.3 0.6,0.7 0.95,1: Vẽ đường cong Bezier uốn lượn xuống góc dưới cùng (95% ngang, 100% dọc).
                                L 0,1: Kéo đường thẳng về góc dưới cùng bên trái.
                                Z: Đóng hình.
                            */}
                            <path d="M 0,0 L 0.6,0 C 0.9,0.3 0.6,0.7 0.95,1 L 0,1 Z" />
                            {/* <path d="M 0,0 L 0.75,0 C 1,0.3 0.65,0.7 0.95,1 L 0,1 Z" /> */}
                        </clipPath>
                    </defs>
                </svg>
                <div className="auth-left-side">
                    <div className="logo_nav">
                        <img src={logo} alt="SGTD Logo" className="logo-image" />
                    </div>
                    <div className="auth-content">
                        <h1 className="auth-welcome-title">Xin chào Admin!</h1>
                        <p className="auth-subtitle">Chào mừng bạn đến với hệ thống quản lý của Sài Gòn Tâm Đức.</p>
                    </div>
                </div>

                {/* NỬA BÊN PHẢI - FORM GLASSMORPHISM */}
                <div className="auth-right-side">
                    <div className="form-container">
                        {/* Outlet chính là nơi sẽ nhúng form Login, Forgot PW, OTP vào */}
                        <Outlet />
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuthLayout;
