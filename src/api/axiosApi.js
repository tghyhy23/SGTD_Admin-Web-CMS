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
    deletePost: (id) => axiosApi.delete(`/post/${id}`),
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

export const reviewApi = {
    // Lấy danh sách review cho Admin (Có filter, phân trang)
    getAdminReviewsByBranch: (branchId, params) => axiosApi.get(`/review/branch/${branchId}`, { params }),
    
    // Tạo review seeding
    createSeedReview: (formData) => axiosApi.post(`/review`, formData , {
        headers: { "Content-Type": "multipart/form-data" }, 
    }),
    
    // Cập nhật review seeding
    updateSeedReview: (id, formData) => axiosApi.put(`/review/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    
    // Ẩn/Hiện review
    toggleHideReview: (id) => axiosApi.patch(`/review/${id}/toggle-hide`),
    
    // Xóa review
    deleteReview: (id) => axiosApi.delete(`/review/${id}`)
};

export const promotionApi = {
    // ============================================
    // PUBLIC ROUTES
    // ============================================

    // router.get("/all-active", getAllActivePromotions);
    getAllActivePromotions: (params) => axiosApi.get("/promotion/all-active", { params }),

    // router.get("/branch/:branchId", getPromotionsByBranch);
    getPromotionsByBranch: (branchId, params) => axiosApi.get(`/promotion/branch/${branchId}`, { params }),

    // ============================================
    // ADMIN/MANAGER ROUTES
    // ============================================

    // router.post("/", protectRoute(ROLE_GROUPS.ADMINS), createPromotion);
    createPromotion: (formData) => axiosApi.post("/promotion", formData, {
        headers: { "Content-Type": "multipart/form-data" } // QUAN TRỌNG
    }),

    // router.get("/", protectRoute(ROLE_GROUPS.ADMINS), getAllPromotions);
    getAllPromotions: (params) => axiosApi.get("/promotion", { params }),

    // router.get("/:id", protectRoute(ROLE_GROUPS.ADMINS), getPromotionDetail);
    getPromotionDetail: (id) => axiosApi.get(`/promotion/${id}`),

    // router.put("/:id", protectRoute(ROLE_GROUPS.ADMINS), updatePromotion);
    updatePromotion: (id, formData) => axiosApi.put(`/promotion/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" } // QUAN TRỌNG
    }),

    // router.patch("/:id/toggle-status", protectRoute(ROLE_GROUPS.ADMINS), togglePromotionStatus);
    togglePromotionStatus: (id) => axiosApi.patch(`/promotion/${id}/toggle-status`),

    // router.delete("/:id", protectRoute(ROLE_GROUPS.ADMINS), deletePromotion);
    deletePromotion: (id) => axiosApi.delete(`/promotion/${id}`),

    // router.get("/:id/stats", protectRoute(ROLE_GROUPS.ADMINS), getPromotionStats);
    getPromotionStats: (id) => axiosApi.get(`/promotion/${id}/stats`),
};

export const userApi = {
    // Lấy danh sách (Có sẵn)
    getAllUsers: (params) => axiosApi.get("/auth/view-all-users", { params }),

    // Lấy profile của chính mình (Có sẵn)
    getUserProfile: () => axiosApi.get("/auth/user-profile"),

    // Update profile của chính mình (Có sẵn)
    updateUserProfile: (data) => axiosApi.put("/auth/user-profile/update", data),

    // Xóa tài khoản của chính mình (Có sẵn)
    deleteAccount: () => axiosApi.delete("/auth/delete-account"),
    
    // ==========================================
    // CÁC HÀM MỚI DÀNH CHO ADMIN QUẢN LÝ USER
    // ==========================================
    
    // Sửa thông tin user bất kỳ (Admin) - Gửi FormData vì backend hỗ trợ up avatar
    updateUserByAdmin: (id, formData) => axiosApi.put(`/auth/edit-user/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    }),

    // Xóa user bất kỳ (Admin)
    deleteUserByAdmin: (id) => axiosApi.delete(`/auth/delete-account/${id}`),
};

export const locationApi = {
    // ==========================================
    // PROVINCES
    // ==========================================
    getProvinces: (params) => axiosApi.get("/location/provinces", { params }),
    getProvinceById: (id) => axiosApi.get(`/location/provinces/${id}`),
    createProvince: (data) => axiosApi.post("/location/provinces", data),
    updateProvince: (id, data) => axiosApi.put(`/location/provinces/${id}`, data),
    deleteProvince: (id) => axiosApi.delete(`/location/provinces/${id}`),

    // ==========================================
    // DISTRICTS
    // ==========================================
    getAllDistricts: (params) => axiosApi.get("/location/districts", { params }),
    getDistrictsByProvince: (provinceId) => axiosApi.get(`/location/districts/province/${provinceId}`),
    getDistrictById: (id) => axiosApi.get(`/location/districts/${id}`),
    createDistrict: (data) => axiosApi.post("/location/districts", data),
    updateDistrict: (id, data) => axiosApi.put(`/location/districts/${id}`, data),
    deleteDistrict: (id) => axiosApi.delete(`/location/districts/${id}`),
};


export const notificationApi = {
    // ============================================
    // USER ROUTES (Dành cho app/web của khách hàng)
    // ============================================
    
    // Lấy danh sách thông báo của tôi (có phân trang, filter)
    getMyNotifications: (params) => axiosApi.get("/notification/my-notifications", { params }),
    
    // Lấy số lượng thông báo chưa đọc
    getUnreadCount: () => axiosApi.get("/notification/unread-count"),
    
    // Đánh dấu 1 thông báo là đã đọc
    markAsRead: (id) => axiosApi.patch(`/notification/${id}/read`),
    
    // Đánh dấu tất cả là đã đọc
    markAllAsRead: () => axiosApi.patch("/notification/mark-all-read"),
    
    // Xóa thông báo (soft delete)
    deleteNotification: (id) => axiosApi.delete(`/notification/${id}`),

    // ============================================
    // ADMIN ROUTES (Dành cho trang Quản trị)
    // ============================================
    
    // Lấy thống kê tổng quan (Tổng, đã đọc, chưa đọc, tỷ lệ...)
    getNotificationStats: () => axiosApi.get("/notification/stats"),
    
    // Lấy toàn bộ thông báo trong hệ thống (có filter, search, phân trang)
    getAllNotifications: (params) => axiosApi.get("/notification", { params }),
    
    // Tạo thông báo cho 1 user cụ thể
    createForUser: (data) => axiosApi.post("/notification/create-for-user", data),
    
    // Tạo thông báo cho một danh sách user
    createForMultipleUsers: (data) => axiosApi.post("/notification/create-for-multiple", data),
    
    // Gửi thông báo cho TẤT CẢ user (Broadcast)
    broadcastNotification: (data) => axiosApi.post("/notification/broadcast", data),
    
    // Xóa các thông báo quá cũ để dọn dẹp DB (truyền { days: 90 } vào data)
    cleanOldNotifications: (data) => axiosApi.post("/notification/clean-old", data),
};

export const bookingApi = {
    // Lấy tất cả danh sách booking cho Admin (có phân trang, filter)
    getAllBookingsAdmin: (params) => axiosApi.get("/booking/admin/all", { params }),
    
    // Admin xác nhận lịch
    confirmBooking: (id) => axiosApi.post(`/booking/${id}/confirm`),
    
    // Admin đánh dấu đã hoàn thành sau khi khách khám xong
    completeBooking: (id) => axiosApi.post(`/booking/${id}/complete`),
    
    // Admin xóa lịch
    deleteBooking: (id) => axiosApi.delete(`/booking/${id}`),

    // (Tùy chọn) Admin Hủy lịch - Nếu backend của bạn cho phép admin gọi route này
    cancelBooking: (id, data) => axiosApi.post(`/booking/${id}/cancel`, data),
};

export const systemModuleApi = {
    getModules: (params) => axiosApi.get("/module", { params }), // Sửa lại route /system-module nếu backend của bạn đặt tên khác
};

export const warrantyApi = {
    // PUBLIC
    getWarrantiesByPhone: (phoneNumber) => axiosApi.get(`/warranty/lookup/${phoneNumber}`),

    // ADMIN
    getAllWarranties: (params) => axiosApi.get("/warranty", { params }),
    getWarrantyStats: () => axiosApi.get("/warranty/stats"),
    getWarrantyDetail: (id) => axiosApi.get(`/warranty/${id}`),
    
    // FORM DATA / JSON
    createWarranty: (data) => axiosApi.post("/warranty", data),
    updateWarranty: (id, data) => axiosApi.put(`/warranty/${id}`, data),
    
    // ACTIONS
    useWarranty: (id, data) => axiosApi.patch(`/warranty/${id}/use`, data),
    cancelWarranty: (id, data) => axiosApi.patch(`/warranty/${id}/cancel`, data),
    deleteWarranty: (id) => axiosApi.delete(`/warranty/${id}`),
    
    // CRON
    updateExpiredWarranties: () => axiosApi.post("/warranty/update-expired"),
};