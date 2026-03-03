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

export const clinicApi = {
    // API lấy danh sách phòng khám (branch)
    getAllClinics: (params) => axiosApi.get("/branch", { params }),
    // Chừa sẵn API lấy chi tiết để lát bạn làm trang ClinicDetail
    getClinicById: (id) => axiosApi.get(`/branch/${id}`),
    deleteClinic: (id) => axiosApi.delete(`/branch/${id}`),
};

export const postApi = {
    // Gọi route /manage/list của Admin để lấy được cả bài ACTIVE và INACTIVE
    getAllPosts: (params) => axiosApi.get("/post/manage/list", { params }), 
    getPostById: (id) => axiosApi.get(`/post/${id}`),
    deletePost: (id) => axiosApi.delete(`/post/${id}`),
    toggleStatus: (id) => axiosApi.patch(`/post/toggle-status/${id}`), // Có thể dùng sau này
};

export const bannerApi = {
    // Lấy danh sách banner (dành cho Admin)
    getAllBanners: (params) => axiosApi.get("/banner", { params }), 
    
    // Lấy chi tiết 1 banner
    getBannerById: (id) => axiosApi.get(`/banner/${id}`),
    
    // Tạo banner mới (hỗ trợ upload file)
    createBanner: (formData) => axiosApi.post("/banner", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    
    // Cập nhật banner
    updateBanner: (id, formData) => axiosApi.put(`/banner/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    
    // Xóa banner
    deleteBanner: (id) => axiosApi.delete(`/banner/${id}`),
    
    // Thay đổi trạng thái (Active/Inactive)
    toggleStatus: (id) => axiosApi.patch(`/banner/${id}/toggle-status`),
    
    // Cập nhật thứ tự hiển thị hàng loạt
    bulkUpdateOrder: (updates) => axiosApi.patch("/banner/bulk-update-order", { updates }),
};

export const categoryApi = {
    // Lấy danh sách danh mục (đang gọi vào route /service theo ý bạn)
    getAllCategories: (params) => axiosApi.get("/service", { params }), 
    getCategoryById: (id) => axiosApi.get(`/service/${id}`),
    createCategory: (formData) => axiosApi.post("/service", formData, {
        headers: { "Content-Type": "multipart/form-data" }, 
    }),
    updateCategory: (id, formData) => axiosApi.put(`/service/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    deleteCategory: (id) => axiosApi.delete(`/service/${id}`),
    toggleStatus: (id) => axiosApi.patch(`/service/${id}/toggle-status`),
};
