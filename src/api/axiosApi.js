// src/api/axiosApi.js
import axios from "axios";

// Khởi tạo instance với baseURL
const axiosApi = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true,
});

// Request Interceptor: Tự động đính kèm token vào header nếu có
axiosApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// Response Interceptor: Xử lý lỗi chung & Refresh Token
axiosApi.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes("/login")) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem("refreshToken");
                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }

                // Chú ý URL API có thể khác tùy backend của bạn
                const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`, {
                    refreshToken,
                });

                if (response.data && response.data.success) {
                    const newAccessToken = response.data.data.accessToken;

                    localStorage.setItem("accessToken", newAccessToken);

                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return axiosApi(originalRequest);
                }
            } catch (refreshError) {
                console.error("Refresh token failed:", refreshError);
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("userInfo");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);

export const authApi = {
    login: (identifier, password) => {
        return axiosApi.post("/auth/login", { identifier, password });
    },
    forgotPassword: (identifier) => {
        return axiosApi.post("/auth/forgot-password", { identifier });
    },
    resetPassword: (otp, newPassword) => {
        return axiosApi.post("/auth/reset-password", { otp, newPassword });
    },
    logout: (refreshToken) => {
        return axiosApi.post("/auth/logout", { refreshToken });
    },
    getMe: () => {
        return axiosApi.get("/auth/me");
    },
};

export const serviceApi = {
    getAllServices: () => axiosApi.get("/service"),
    getVariantsByServiceId: (serviceId) => axiosApi.get(`/service-variant/service/${serviceId}`),
    getVariantById: (id) => axiosApi.get(`/service-variant/${id}`),

    // KHÔNG THAY ĐỔI THEO YÊU CẦU
    createVariant: (formData) => {
        return axiosApi.post("/service-variant", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },
    updateVariant: (variantId, formData) => {
        return axiosApi.put(`/service-variant/${variantId}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },
    deleteVariant: (variantId) => {
        return axiosApi.delete(`/service-variant/${variantId}`);
    },
};
