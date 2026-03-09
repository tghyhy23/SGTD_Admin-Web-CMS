import React, { useEffect, useState } from 'react';
import { notificationApi } from '../../api/axiosApi';
import './Notifications.css';

export default function Notifications() {
    // ==========================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ==========================================
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState({ total: 0, totalRead: 0, totalUnread: 0, readRate: "0%" });
    const [isLoading, setIsLoading] = useState(true);

    // ==========================================
    // 2. STATE LỌC, TÌM KIẾM & PHÂN TRANG
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterIsRead, setFilterIsRead] = useState("");
    
    // Toggles cho Custom Dropdowns (Bộ lọc)
    const [showFilterTypeDropdown, setShowFilterTypeDropdown] = useState(false);
    const [showFilterStatusDropdown, setShowFilterStatusDropdown] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    // ==========================================
    // 3. STATE MODAL (GỬI THÔNG BÁO)
    // ==========================================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Toggles cho Custom Dropdowns (Trong Form)
    const [showFormTypeDropdown, setShowFormTypeDropdown] = useState(false);
    const [showFormPriorityDropdown, setShowFormPriorityDropdown] = useState(false);

    const initialForm = {
        title_msg: "",
        content_msg: "",
        type: "SYSTEM",
        priority: "MEDIUM",
    };
    const [formData, setFormData] = useState(initialForm);

    // ==========================================
    // 4. FETCH DATA TỪ API
    // ==========================================
    const fetchStats = async () => {
        try {
            const res = await notificationApi.getNotificationStats();
            if (res && res.success) {
                setStats(res.data);
            }
        } catch (error) {
            console.error("Lỗi lấy thống kê:", error);
        }
    };

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const params = { page, limit };
            if (searchTerm) params.search = searchTerm;
            if (filterType) params.type = filterType;
            if (filterIsRead !== "") params.isRead = filterIsRead;

            const res = await notificationApi.getAllNotifications(params);
            if (res && res.success) {
                setNotifications(res.data.notifications || []);
                setTotalPages(res.data.pagination?.pages || 1);
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách thông báo:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchNotifications();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, searchTerm, filterType, filterIsRead]);

    // ==========================================
    // 5. HELPER & HANDLERS
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDropdownSelect = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setShowFormTypeDropdown(false);
        setShowFormPriorityDropdown(false);
    };

    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await notificationApi.broadcastNotification(formData);
            if (res && res.success) {
                showToast("Đã gửi thông báo hàng loạt thành công!");
                setIsModalOpen(false);
                setFormData(initialForm);
                setPage(1);
                fetchNotifications(); 
                fetchStats(); 
            } else {
                showToast(res?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi kết nối", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // UI Helpers cho Dropdowns
    const getTypeLabel = (val) => {
        switch(val) {
            case "SYSTEM": return "Hệ thống (SYSTEM)";
            case "PROMOTION": return "Khuyến mãi (PROMOTION)";
            case "BOOKING_REMINDER": return "Nhắc lịch (REMINDER)";
            case "BOOKING_CONFIRMED": return "Xác nhận lịch (CONFIRMED)";
            default: return "Tất cả loại (Type)";
        }
    };

    const getStatusLabel = (val) => {
        if(val === "true") return "Đã đọc";
        if(val === "false") return "Chưa đọc";
        return "Tất cả trạng thái";
    };

    const getPriorityLabel = (val) => {
        switch(val) {
            case "LOW": return "Thấp (LOW)";
            case "MEDIUM": return "Trung bình (MEDIUM)";
            case "HIGH": return "Cao (HIGH)";
            default: return "Chọn mức độ";
        }
    };

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message fixed-toast ${toast.type}`} style={{ zIndex: 9999 }}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>×</button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Thông báo</h1>
                <button className="add-btn" onClick={() => setIsModalOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <path d="M5 12h14"></path><path d="M12 5v14"></path>
                    </svg>
                    <span>Gửi thông báo (Broadcast)</span>
                </button>
            </div>

            {/* THỐNG KÊ */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Tổng thông báo</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value text-green">{stats.totalRead}</div>
                    <div className="stat-label">Đã đọc</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value text-orange">{stats.totalUnread}</div>
                    <div className="stat-label">Chưa đọc</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value text-blue">{stats.readRate}</div>
                    <div className="stat-label">Tỷ lệ đọc</div>
                </div>
            </div>

            {/* BỘ LỌC TÌM KIẾM */}
            <div className="services-tools" style={{ marginBottom: '20px' }}>
                <div className="search-box" style={{ flex: 1 }}>
                    <input 
                        type="text" 
                        placeholder="Tìm tiêu đề, nội dung..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    />
                </div>
                
                {/* Custom Filter Type */}
                <div className="filter-dropdown-container" style={{ position: 'relative' }}>
                    <button className="btn-filter" onClick={() => { setShowFilterTypeDropdown(!showFilterTypeDropdown); setShowFilterStatusDropdown(false); }}>
                        <span>{getTypeLabel(filterType)}</span>
                        <span className="dropdown-arrow">▼</span>
                    </button>
                    {showFilterTypeDropdown && (
                        <div className="filter-dropdown-menu">
                            <div className={`filter-option ${filterType === "" ? "active" : ""}`} onClick={() => { setFilterType(""); setPage(1); setShowFilterTypeDropdown(false); }}>Tất cả loại (Type)</div>
                            <div className={`filter-option ${filterType === "SYSTEM" ? "active" : ""}`} onClick={() => { setFilterType("SYSTEM"); setPage(1); setShowFilterTypeDropdown(false); }}>Hệ thống (SYSTEM)</div>
                            <div className={`filter-option ${filterType === "PROMOTION" ? "active" : ""}`} onClick={() => { setFilterType("PROMOTION"); setPage(1); setShowFilterTypeDropdown(false); }}>Khuyến mãi (PROMOTION)</div>
                            <div className={`filter-option ${filterType === "BOOKING_REMINDER" ? "active" : ""}`} onClick={() => { setFilterType("BOOKING_REMINDER"); setPage(1); setShowFilterTypeDropdown(false); }}>Nhắc lịch (REMINDER)</div>
                            <div className={`filter-option ${filterType === "BOOKING_CONFIRMED" ? "active" : ""}`} onClick={() => { setFilterType("BOOKING_CONFIRMED"); setPage(1); setShowFilterTypeDropdown(false); }}>Xác nhận lịch (CONFIRMED)</div>
                        </div>
                    )}
                </div>

                {/* Custom Filter Status */}
                <div className="filter-dropdown-container" style={{ position: 'relative' }}>
                    <button className="btn-filter" onClick={() => { setShowFilterStatusDropdown(!showFilterStatusDropdown); setShowFilterTypeDropdown(false); }}>
                        <span>{getStatusLabel(filterIsRead)}</span>
                        <span className="dropdown-arrow">▼</span>
                    </button>
                    {showFilterStatusDropdown && (
                        <div className="filter-dropdown-menu">
                            <div className={`filter-option ${filterIsRead === "" ? "active" : ""}`} onClick={() => { setFilterIsRead(""); setPage(1); setShowFilterStatusDropdown(false); }}>Tất cả trạng thái</div>
                            <div className={`filter-option ${filterIsRead === "true" ? "active" : ""}`} onClick={() => { setFilterIsRead("true"); setPage(1); setShowFilterStatusDropdown(false); }}>Đã đọc</div>
                            <div className={`filter-option ${filterIsRead === "false" ? "active" : ""}`} onClick={() => { setFilterIsRead("false"); setPage(1); setShowFilterStatusDropdown(false); }}>Chưa đọc</div>
                        </div>
                    )}
                </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>Người nhận</th>
                            <th>Tiêu đề & Nội dung</th>
                            <th>Loại</th>
                            <th>Thời gian</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && notifications.length === 0 ? (
                            <tr><td colSpan="5" className="state-message">Đang tải dữ liệu...</td></tr>
                        ) : notifications.length === 0 ? (
                            <tr><td colSpan="5" className="state-message">Không tìm thấy thông báo nào.</td></tr>
                        ) : (
                            notifications.map((notif) => (
                                <tr key={notif._id}>
                                    <td>
                                        <div className="product-name">{notif.userId?.fullName || "Người dùng ẩn"}</div>
                                        <div className="product-desc">{notif.userId?.phoneNumber || ""}</div>
                                    </td>
                                    <td style={{ maxWidth: '300px' }}>
                                        <div className="product-name">{notif.title_msg}</div>
                                        <div className="product-desc" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{notif.content_msg}</div>
                                    </td>
                                    <td>
                                        <span className="category-badge" style={{ backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db' }}>
                                            {notif.type}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '14px', color: '#111827' }}>{new Date(notif.createdAt).toLocaleDateString('vi-VN')}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{notif.time_msg}</div>
                                    </td>
                                    <td>
                                        {notif.isRead ? (
                                            <span className="category-badge" style={{ backgroundColor: '#dcfce7', color: '#059669', borderColor: '#059669' }}>Đã đọc</span>
                                        ) : (
                                            <span className="category-badge" style={{ backgroundColor: '#fef3c7', color: '#d97706', borderColor: '#d97706' }}>Chưa đọc</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PHÂN TRANG */}
            {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: "20px", gap: "10px" }}>
                    <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trang trước</button>
                    <span style={{ padding: "8px 12px", fontWeight: "500", color: "#374151" }}>Trang {page} / {totalPages}</span>
                    <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Trang sau</button>
                </div>
            )}

            {/* MODAL GỬI BROADCAST */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-clinics" style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                            <h2>Gửi Thông báo Hàng loạt</h2>
                            <button type="button" className="close-modal-btn" onClick={() => !isSubmitting && setIsModalOpen(false)}>×</button>
                        </div>
                        
                        <form className="modal-form" onSubmit={handleSendBroadcast} style={{ overflow: 'visible' }}>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                
                                <div className="form-group">
                                    <label>Tiêu đề thông báo <span className="required">*</span></label>
                                    <input type="text" name="title_msg" required value={formData.title_msg} onChange={handleInputChange} disabled={isSubmitting} placeholder="VD: Khuyến mãi sốc tháng này..." style={{ width: '100%' }}/>
                                </div>
                                
                                <div className="form-group">
                                    <label>Nội dung chi tiết <span className="required">*</span></label>
                                    <textarea name="content_msg" required rows="4" value={formData.content_msg} onChange={handleInputChange} disabled={isSubmitting} placeholder="Nhập nội dung..."></textarea>
                                </div>

                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {/* Custom Dropdown Loại Thông Báo */}
                                    <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                                        <label>Loại thông báo</label>
                                        <div className="filter-dropdown-container" style={{ width: '100%', margin: 0 }}>
                                            <button type="button" className="btn-filter" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => { setShowFormTypeDropdown(!showFormTypeDropdown); setShowFormPriorityDropdown(false); }}>
                                                <span>{getTypeLabel(formData.type)}</span>
                                                <span className="dropdown-arrow">▼</span>
                                            </button>
                                            {showFormTypeDropdown && (
                                                <div className="filter-dropdown-menu" style={{ width: '100%' }}>
                                                    <div className={`filter-option ${formData.type === "SYSTEM" ? "active" : ""}`} onClick={() => handleDropdownSelect("type", "SYSTEM")}>Hệ thống (SYSTEM)</div>
                                                    <div className={`filter-option ${formData.type === "PROMOTION" ? "active" : ""}`} onClick={() => handleDropdownSelect("type", "PROMOTION")}>Khuyến mãi (PROMOTION)</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Custom Dropdown Mức độ ưu tiên */}
                                    <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                                        <label>Mức độ ưu tiên</label>
                                        <div className="filter-dropdown-container" style={{ width: '100%', margin: 0 }}>
                                            <button type="button" className="btn-filter" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => { setShowFormPriorityDropdown(!showFormPriorityDropdown); setShowFormTypeDropdown(false); }}>
                                                <span>{getPriorityLabel(formData.priority)}</span>
                                                <span className="dropdown-arrow">▼</span>
                                            </button>
                                            {showFormPriorityDropdown && (
                                                <div className="filter-dropdown-menu" style={{ width: '100%' }}>
                                                    <div className={`filter-option ${formData.priority === "LOW" ? "active" : ""}`} onClick={() => handleDropdownSelect("priority", "LOW")}>Thấp (LOW)</div>
                                                    <div className={`filter-option ${formData.priority === "MEDIUM" ? "active" : ""}`} onClick={() => handleDropdownSelect("priority", "MEDIUM")}>Trung bình (MEDIUM)</div>
                                                    <div className={`filter-option ${formData.priority === "HIGH" ? "active" : ""}`} onClick={() => handleDropdownSelect("priority", "HIGH")}>Cao (HIGH)</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #d97706' }}>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                                        <strong>Lưu ý:</strong> Chức năng Broadcast sẽ gửi thông báo này tới chuông thông báo của <b>TẤT CẢ người dùng</b> đang có trong hệ thống ứng dụng.
                                    </p>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Hủy bỏ</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang xử lý..." : "Gửi thông báo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}