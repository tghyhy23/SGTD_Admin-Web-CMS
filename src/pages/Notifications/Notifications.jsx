import React, { useEffect, useState } from "react";
import { notificationApi } from "../../api/axiosApi";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Modal from "../../ui/Modal/Modal";
import { AddButton } from "../../ui/Button/Button";
import ReactSelect from "react-select";
import "./Notifications.css";

// ================= OPTIONS CHO REACT-SELECT =================
const filterTypeOptions = [
    { value: "", label: "Tất cả loại" },
    { value: "SYSTEM", label: "Hệ thống" },
    { value: "PROMOTION", label: "Khuyến mãi" },
    { value: "BOOKING_REMINDER", label: "Nhắc lịch" },
    { value: "BOOKING_CONFIRMED", label: "Xác nhận lịch" },
];

const filterReadOptions = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "true", label: "Đã đọc" },
    { value: "false", label: "Chưa đọc" },
];

const formTypeOptions = [
    { value: "SYSTEM", label: "Hệ thống" },
    { value: "PROMOTION", label: "Khuyến mãi" },
];

const formPriorityOptions = [
    { value: "LOW", label: "Thấp" },
    { value: "MEDIUM", label: "Trung bình" },
    { value: "HIGH", label: "Cao" },
];

export default function Notifications() {
    // ==========================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ==========================================
    const [notifications, setNotifications] = useState([]);
    // const [stats, setStats] = useState({ total: 0, totalRead: 0, totalUnread: 0, readRate: "0%" });
    const [isLoading, setIsLoading] = useState(true);

    // ==========================================
    // 2. STATE LỌC, TÌM KIẾM & PHÂN TRANG
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterIsRead, setFilterIsRead] = useState("");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    // ==========================================
    // 3. STATE MODAL (GỬI THÔNG BÁO)
    // ==========================================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

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
    // const fetchStats = async () => {
    //     try {
    //         const res = await notificationApi.getNotificationStats();
    //         if (res && res.success) {
    //             setStats(res.data);
    //         }
    //     } catch (error) {
    //         console.error("Lỗi lấy thống kê:", error);
    //     }
    // };

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

    // useEffect(() => {
    //     fetchStats();
    // }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchNotifications();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, searchTerm, filterType, filterIsRead]);

    // ==========================================
    // 5. HANDLERS
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSendBroadcast = async (e) => {
        e.preventDefault();

        if (!formData.title_msg || !formData.content_msg) {
            return showToast("Vui lòng nhập đủ Tiêu đề và Nội dung!", "error");
        }

        setIsSubmitting(true);
        try {
            const res = await notificationApi.broadcastNotification(formData);
            if (res && res.success) {
                showToast("Đã gửi thông báo hàng loạt thành công!");
                setIsModalOpen(false);
                setFormData(initialForm);
                setPage(1);
                fetchNotifications();
                // fetchStats();
            } else {
                showToast(res?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi kết nối", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🟢 STYLE ĐỒNG BỘ CHO REACT-SELECT
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "38px",
            borderRadius: "6px",
            fontSize: "14px",
            borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db",
            boxShadow: "none",
            "&:hover": { borderColor: "var(--primary-color)" },
            backgroundColor: "#fff",
        }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white",
            color: state.isSelected ? "var(--primary-color)" : "#374151",
            cursor: "pointer",
            margin: "4px",
            borderRadius: "6px",
            fontSize: "14px",
            width: "96%",
        }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({
            ...provided,
            overflowX: "hidden",
        }),
    };

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Thông báo" }]} title="Quản lí thông báo" description="Theo dõi lịch sử thông báo hệ thống và gửi thông báo hàng loạt tới người dùng." />

            <div className="z-notification-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                {/* THỐNG KÊ */}
                {/* <div className="z-notification-stats-grid">
                    <div className="z-notification-stat-card">
                        <div className="z-notification-stat-value">{stats.total}</div>
                        <div className="z-notification-stat-label">Tổng thông báo</div>
                    </div>
                    <div className="z-notification-stat-card">
                        <div className="z-notification-stat-value text-green">{stats.totalRead}</div>
                        <div className="z-notification-stat-label">Đã đọc</div>
                    </div>
                    <div className="z-notification-stat-card">
                        <div className="z-notification-stat-value text-orange">{stats.totalUnread}</div>
                        <div className="z-notification-stat-label">Chưa đọc</div>
                    </div>
                    <div className="z-notification-stat-card">
                        <div className="z-notification-stat-value text-blue">{stats.readRate}</div>
                        <div className="z-notification-stat-label">Tỷ lệ đọc</div>
                    </div>
                </div> */}

                {/* HEADER & TOOLS BAR */}
                <div className="z-notification-header">
                    <h1 className="z-notification-title">Lịch sử Thông báo</h1>
                </div>

                <div className="z-notification-tools">
                    <div className="z-notification-search">
                        <input
                            type="text"
                            placeholder="Tìm tiêu đề, nội dung..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ minWidth: "220px", zIndex: 11 }}>
                        <ReactSelect
                            options={filterTypeOptions}
                            value={filterTypeOptions.find((opt) => opt.value === filterType) || filterTypeOptions[0]}
                            onChange={(selected) => {
                                setFilterType(selected ? selected.value : "");
                                setPage(1);
                            }}
                            styles={customSelectStyles}
                            isSearchable={false}
                            placeholder="Loại thông báo"
                        />
                    </div>

                    <div style={{ minWidth: "180px", zIndex: 10 }}>
                        <ReactSelect
                            options={filterReadOptions}
                            value={filterReadOptions.find((opt) => opt.value === filterIsRead) || filterReadOptions[0]}
                            onChange={(selected) => {
                                setFilterIsRead(selected ? selected.value : "");
                                setPage(1);
                            }}
                            styles={customSelectStyles}
                            isSearchable={false}
                            placeholder="Trạng thái"
                        />
                    </div>

                    <AddButton style={{ marginLeft: "auto" }} onClick={() => setIsModalOpen(true)}>
                        Gửi Thông báo
                    </AddButton>
                </div>

                {/* BẢNG DỮ LIỆU */}
                <div className="z-notification-table-wrapper">
                    <table className="z-notification-table">
                        <thead>
                            <tr>
                                <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                                <th style={{ width: "200px" }}>Người nhận</th>
                                <th>Tiêu đề & Nội dung</th>
                                <th>Loại</th>
                                <th>Thời gian</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && notifications.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="z-notification-state">Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : notifications.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="z-notification-state">Không tìm thấy thông báo nào.</div>
                                    </td>
                                </tr>
                            ) : (
                                notifications.map((notif, index) => (
                                    <tr key={notif._id}>
                                        <td style={{ textAlign: "center", fontWeight: "600", color: "#6b7280" }}>{(page - 1) * limit + index + 1}</td>
                                        <td>
                                            <div className="z-notification-text-bold">{notif.userId?.fullName || "Người dùng ẩn"}</div>
                                            <div className="z-notification-subtext">{notif.userId?.phoneNumber || "Chưa có SĐT"}</div>
                                        </td>
                                        <td style={{ maxWidth: "350px" }}>
                                            <div className="z-notification-text-bold" style={{ marginBottom: "4px" }}>
                                                {notif.title_msg}
                                            </div>
                                            <div className="z-notification-text-clamp" title={notif.content_msg}>
                                                {notif.content_msg}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="z-notification-badge-gray">{notif.type}</span>
                                        </td>
                                        <td>
                                            <div className="z-notification-text-normal">{new Date(notif.createdAt).toLocaleDateString("vi-VN")}</div>
                                            <div className="z-notification-subtext">{notif.time_msg}</div>
                                        </td>
                                        <td>{notif.isRead ? <span className="z-notification-badge-green">Đã đọc</span> : <span className="z-notification-badge-orange">Chưa đọc</span>}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PHÂN TRANG */}
                {totalPages > 1 && (
                    <div className="z-notification-pagination">
                        <button className="z-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                            Trước
                        </button>
                        <div className="z-pagination-numbers">
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i + 1} className={`z-pagination-number ${page === i + 1 ? "active" : ""}`} onClick={() => setPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button className="z-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                            Sau
                        </button>
                    </div>
                )}

                {/* MODAL GỬI BROADCAST */}
                <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title="Gửi Thông báo Hàng loạt (Broadcast)" size="md" onSave={handleSendBroadcast} saveText={isSubmitting ? "Đang xử lý..." : "Gửi thông báo"}>
                    <div className="z-notification-form">
                        <div className="z-notification-info-box">
                            <p>
                                <strong>Lưu ý:</strong> Chức năng Broadcast sẽ gửi thông báo này tới chuông thông báo của <b>TẤT CẢ người dùng</b> đang có trong hệ thống ứng dụng.
                            </p>
                        </div>

                        <div className="z-notification-form-group">
                            <label>
                                Tiêu đề thông báo <span className="z-notification-required">*</span>
                            </label>
                            <input type="text" name="title_msg" required value={formData.title_msg} onChange={handleInputChange} disabled={isSubmitting} className="z-notification-input" placeholder="VD: Khuyến mãi sốc tháng này..." />
                        </div>

                        <div className="z-notification-form-group">
                            <label>
                                Nội dung chi tiết <span className="z-notification-required">*</span>
                            </label>
                            <textarea name="content_msg" required rows="4" value={formData.content_msg} onChange={handleInputChange} disabled={isSubmitting} className="z-notification-textarea" placeholder="Nhập nội dung..."></textarea>
                        </div>

                        <div className="z-notification-form-row">
                            <div className="z-notification-form-group" style={{ flex: 1 }}>
                                <label>Loại thông báo</label>
                                <ReactSelect
                                    options={formTypeOptions}
                                    value={formTypeOptions.find((opt) => opt.value === formData.type) || formTypeOptions[0]}
                                    onChange={(selected) => setFormData((prev) => ({ ...prev, type: selected.value }))}
                                    isDisabled={isSubmitting}
                                    styles={customSelectStyles}
                                    isSearchable={false}
                                    menuPosition="fixed" // Tránh bị Modal che mất
                                />
                            </div>

                            <div className="z-notification-form-group" style={{ flex: 1 }}>
                                <label>Mức độ ưu tiên</label>
                                <ReactSelect
                                    options={formPriorityOptions}
                                    value={formPriorityOptions.find((opt) => opt.value === formData.priority) || formPriorityOptions[1]}
                                    onChange={(selected) => setFormData((prev) => ({ ...prev, priority: selected.value }))}
                                    isDisabled={isSubmitting}
                                    styles={customSelectStyles}
                                    isSearchable={false}
                                    menuPosition="fixed" // Tránh bị Modal che mất
                                />
                            </div>
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
}
