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
    // 1. Lấy danh sách phòng khám (kèm filter, search, phân trang)
    getAllClinics: (params) => axiosApi.get("/branch", { params }),
    
    // 2. Lấy chi tiết 1 phòng khám
    getClinicById: (id) => axiosApi.get(`/branch/${id}`),
    
    // 3. Tạo phòng khám mới (Gửi FormData vì có file ảnh)
    createClinic: (formData) => axiosApi.post("/branch", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),

    // 4. Cập nhật phòng khám (Gửi FormData)
    updateClinic: (id, formData) => axiosApi.put(`/branch/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),

    // 5. Bật/tắt trạng thái hoạt động
    toggleStatus: (id) => axiosApi.patch(`/branch/${id}/toggle-status`),

    // 6. Xóa phòng khám
    deleteClinic: (id) => axiosApi.delete(`/branch/${id}`),

    // 7. Lấy thống kê của phòng khám (Admin/Manager)
    getClinicStats: (id, params) => axiosApi.get(`/branch/${id}/stats`, { params }),
};

export const postApi = {
    // 1. Lấy danh sách cho Admin
    getAllPosts: (params) => axiosApi.get("/post/manage/list", { params }), 

    // 2. Xem chi tiết bài viết
    getPostById: (id) => axiosApi.get(`/post/${id}`),

    // 3. Tạo mới bài viết (Hỗ trợ upload file)
    createPost: (formData) => axiosApi.post("/post", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    }),

    // 4. Cập nhật bài viết (Hỗ trợ upload file)
    updatePost: (id, formData) => axiosApi.put(`/post/${id}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    }),

    // 5. Bật/Tắt trạng thái
    toggleStatus: (id) => axiosApi.patch(`/post/manage/toggle-status/${id}`),

    // 6. Xóa bài viết
    deletePost: (id) => axiosApi.delete(`/post/manage/${id}`),
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
    getRealCategories: () => axiosApi.get("/category"),
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
