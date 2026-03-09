// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { authApi } from "../api/axiosApi";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dùng useCallback để hàm này không bị tạo lại liên tục gây re-render
    const refreshUser = useCallback(async () => {
        try {
            const response = await authApi.getMe();

            const responseData = response.data || response;

            if (!responseData || !responseData.user || !responseData.account) {
                console.warn("Cấu trúc trả về API /me không hợp lệ");
                return;
            }

            const { user: userData, account: accountData } = responseData;

            const fullProfile = {
                ...userData,
                ...accountData,
                avatarUrl: userData.avatar || userData.avatarUrl || null,
                accountId: accountData.id || accountData._id,
            };

            setUser(fullProfile);
            localStorage.setItem("userInfo", JSON.stringify(fullProfile));
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
            // Nếu lỗi là 401 thì Axios Interceptor đã lo việc refresh token hoặc đẩy ra login
        }
    }, []);

    // Khôi phục phiên đăng nhập khi F5
    useEffect(() => {
        let isMounted = true;

        const loadUserFromStorage = async () => {
            const token = localStorage.getItem("accessToken");
            const userInfoString = localStorage.getItem("userInfo");

            if (token && userInfoString) {
                try {
                    if (isMounted) {
                        setUser(JSON.parse(userInfoString));
                    }
                    await refreshUser();
                } catch (e) {
                    console.error("Error parsing user info", e);
                }
            }

            if (isMounted) {
                setLoading(false);
            }
        };

        loadUserFromStorage();

        return () => {
            isMounted = false; // Cleanup để tránh memory leak
        };
    }, [refreshUser]);

    const login = async (identifier, password) => {
        if (identifier === "demo.eonsr" && password === "Eonsr@Demo2026!") {
            const demoProfile = {
                accountId: "demo-account-123",
                id: "demo-user-123",
                fullName: "Admin (Bản Demo)",
                email: "demo@doanhnghiep.com",
                role: "ADMIN",
                avatarUrl: "https://ui-avatars.com/api/?name=Admin+Demo&background=0D8ABC&color=fff",
            };

            setUser(demoProfile);
            localStorage.setItem("userInfo", JSON.stringify(demoProfile));
            localStorage.setItem("accessToken", "demo-access-token");
            localStorage.setItem("refreshToken", "demo-refresh-token");

            return { success: true, message: "Đăng nhập tài khoản Demo thành công!" };
        }
        try {
            const response = await authApi.login(identifier, password);

            if (response.success) {
                const { user: userData, account, tokens } = response.data;

                const allowedRoles = ["ADMIN", "SUPERADMIN", "MANAGER"];
                if (!allowedRoles.includes(account.role)) {
                    throw new Error("Tài khoản của bạn không có quyền truy cập hệ thống quản trị!");
                }

                const fullProfile = {
                    ...userData,
                    ...account,
                    avatarUrl: userData.avatar || userData.avatarUrl || null,
                    accountId: account.id || account._id,
                };

                setUser(fullProfile);
                localStorage.setItem("userInfo", JSON.stringify(fullProfile));
                localStorage.setItem("accessToken", tokens.accessToken);
                localStorage.setItem("refreshToken", tokens.refreshToken);

                return { success: true, message: "Đăng nhập thành công!" };
            } else {
                throw new Error(response.message || "Đăng nhập thất bại!");
            }
        } catch (error) {
            // 1. Trích xuất chính xác thông báo lỗi từ backend
            let backendMessage = "";

            if (error.response && error.response.data) {
                // Backend có thể trả về lỗi ở các trường khác nhau tùy vào cách thiết kế
                backendMessage = error.response.data.message || error.response.data.error || "Lỗi không xác định từ máy chủ.";
            } else {
                // Nếu không có response (lỗi mạng, timeout, hoặc throw tay ở trên)
                backendMessage = error.message || "Lỗi kết nối máy chủ.";
            }

            // 2. Bộ từ điển dịch sang Tiếng Việt
            const errorDictionary = {
                "Identifier and password are required": "Vui lòng nhập đầy đủ tài khoản và mật khẩu.",
                "Too many authentication attempts. Account temporarily locked.": "Bạn đã nhập quá nhiều lần. Vui lòng thử lại sau.",
                "Invalid identifier or password!": "Tài khoản hoặc mật khẩu không chính xác!",
                "Your account is inactive or has been suspended.": "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.",
                "Your account is not verified. Please check your email or phone.": "Tài khoản chưa xác thực. Vui lòng kiểm tra email của bạn.",
                "Please log in using your Google account.": "Vui lòng đăng nhập bằng tài khoản Google của bạn.",
                "User profile not found for this account.": "Lỗi dữ liệu: Không tìm thấy hồ sơ người dùng.",
                "Tài khoản của bạn không có quyền truy cập hệ thống quản trị!": "Tài khoản của bạn không có quyền truy cập hệ thống quản trị!",
            };

            // 3. Map lỗi, nếu không có trong từ điển thì dùng tạm lỗi gốc hoặc lỗi mặc định
            const errorMessage = errorDictionary[backendMessage] || backendMessage || "Lỗi kết nối máy chủ, vui lòng thử lại sau.";

            return { success: false, message: errorMessage };
        }
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch (error) {
            console.error("Lỗi logout API:", error);
        } finally {
            setUser(null);
            localStorage.removeItem("userInfo");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            // Chuyển về login
            window.location.href = "/login";
        }
    };

    return <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
