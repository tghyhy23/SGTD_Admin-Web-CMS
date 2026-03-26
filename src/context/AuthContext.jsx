import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { authApi } from "../api/axiosApi";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const response = await authApi.getMe();
            const responseData = response.data || response;

            if (!responseData || !responseData.user || !responseData.account) {
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
            // Nếu lỗi 401 nặng, axios interceptor sẽ tự xử lý logout
        }
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("accessToken");
            const userInfoString = localStorage.getItem("userInfo");

            if (token && userInfoString) {
                try {
                    // Bước 1: Set user từ máy để hiện UI ngay lập tức
                    setUser(JSON.parse(userInfoString));
                    // Bước 2: Đồng bộ lại với Server ngầm
                    await refreshUser();
                } catch (e) {
                    localStorage.clear();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [refreshUser]);

const login = async (identifier, password) => {
    // Logic Demo giữ nguyên
    if (identifier === "demo.eonsr" && password === "Eonsr@Demo2026!") {
        const demoProfile = { fullName: "Admin (Demo)", role: "ADMIN" };
        setUser(demoProfile);
        localStorage.setItem("accessToken", "demo-token");
        localStorage.setItem("userInfo", JSON.stringify(demoProfile));
        return { success: true, message: "Đăng nhập Demo thành công!" };
    }

    try {
        const response = await authApi.login(identifier, password);
        if (response.success) {
            const { user: userData, account, tokens } = response.data;

            // Kiểm tra quyền
            if (!["ADMIN", "SUPERADMIN", "MANAGER"].includes(account.role)) {
                throw new Error("Tài khoản của bạn không có quyền truy cập!");
            }

            const fullProfile = {
                ...userData,
                ...account,
                avatarUrl: userData.avatar || userData.avatarUrl || null,
                accountId: account.id || account._id,
            };

            // LƯU TOKEN VÀ USER VÀO MÁY
            localStorage.setItem("accessToken", tokens.accessToken);
            localStorage.setItem("refreshToken", tokens.refreshToken);
            localStorage.setItem("userInfo", JSON.stringify(fullProfile));
            
            setUser(fullProfile);
            return { success: true, message: "Đăng nhập thành công!" };
        }
        throw new Error(response.message || "Thất bại");
    } catch (error) {
        let backendMessage = error.response?.data?.message || error.message || "Lỗi kết nối.";
        const errorDictionary = {
            "Invalid identifier or password!": "Tài khoản hoặc mật khẩu không chính xác!",
            "Tài khoản của bạn không có quyền truy cập hệ thống quản trị!": "Bạn không có quyền truy cập!",
        };
        return { success: false, message: errorDictionary[backendMessage] || backendMessage };
    }
};

    const logout = async () => {
        const rfToken = localStorage.getItem("refreshToken");
        if (rfToken) await authApi.logout(rfToken).catch(() => {});
        localStorage.clear();
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);