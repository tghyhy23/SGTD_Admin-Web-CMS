import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // 🟢 THÊM IMPORT
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
    const queryClient = useQueryClient();

    // ==========================================
    // 1. STATE LỌC, TÌM KIẾM & PHÂN TRANG
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState(""); // 🟢 Tách riêng search delay
    const [filterType, setFilterType] = useState("");
    const [filterIsRead, setFilterIsRead] = useState("");

    const [page, setPage] = useState(1);
    const limit = 10;

    // ==========================================
    // 2. STATE MODAL (GỬI THÔNG BÁO)
    // ==========================================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const initialForm = { title_msg: "", content_msg: "", type: "SYSTEM", priority: "MEDIUM" };
    const [formData, setFormData] = useState(initialForm);

    // ==========================================
    // DEBOUNCE TÌM KIẾM
    // ==========================================
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Trở về trang 1 khi gõ tìm kiếm
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ==========================================
    // 3. REACT QUERY: FETCH DỮ LIỆU
    // ==========================================
    const { data, isLoading, error } = useQuery({
        queryKey: ["notifications", page, limit, debouncedSearch, filterType, filterIsRead],
        queryFn: async () => {
            const params = { page, limit };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterType) params.type = filterType;
            if (filterIsRead !== "") params.isRead = filterIsRead;

            const res = await notificationApi.getAllNotifications(params);
            if (res && res.success) {
                return {
                    notifications: res.data.notifications || [],
                    totalPages: res.data.pagination?.pages || 1
                };
            }
            throw new Error("Không thể tải danh sách thông báo.");
        },
        staleTime: 1 * 60 * 1000, // Cache trong 1 phút
    });

    const notifications = data?.notifications || [];
    const totalPages = data?.totalPages || 1;

    // ==========================================
    // 4. REACT QUERY: MUTATION (GỬI BROADCAST)
    // ==========================================
    const broadcastMutation = useMutation({
        mutationFn: (payload) => notificationApi.broadcastNotification(payload),
        onSuccess: () => {
            showToast("Đã gửi thông báo hàng loạt thành công!");
            setIsModalOpen(false);
            setFormData(initialForm);
            setPage(1); // Chuyển về trang 1 để thấy thông báo mới nhất
            queryClient.invalidateQueries({ queryKey: ["notifications"] }); // Làm mới danh sách
        },
        onError: (err) => {
            showToast(err.response?.data?.message || "Lỗi kết nối hoặc xử lý từ server", "error");
        }
    });

    const isSubmitting = broadcastMutation.isPending;

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

    const handleSendBroadcast = (e) => {
        e.preventDefault();
        if (!formData.title_msg || !formData.content_msg) {
            return showToast("Vui lòng nhập đủ Tiêu đề và Nội dung!", "error");
        }
        broadcastMutation.mutate(formData);
    };

    // 🟢 STYLE ĐỒNG BỘ CHO REACT-SELECT
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided, minHeight: "38px", borderRadius: "6px", fontSize: "14px",
            borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db", boxShadow: "none",
            "&:hover": { borderColor: "var(--primary-color)" }, backgroundColor: "#fff",
        }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({
            ...provided, backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white",
            color: state.isSelected ? "var(--primary-color)" : "#374151", cursor: "pointer",
            margin: "4px", borderRadius: "6px", fontSize: "14px", width: "96%",
        }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({ ...provided, overflowX: "hidden" }),
    };

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Thông báo" }]} title="Quản lí thông báo" description="Theo dõi lịch sử thông báo hệ thống và gửi thông báo hàng loạt tới người dùng." />

            <div className="z-notification-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-notification-header">
                    <h1 className="z-notification-title">Lịch sử Thông báo</h1>
                </div>

                <div className="z-notification-tools">
                    <div className="z-notification-search">
                        <input
                            type="text"
                            placeholder="Tìm tiêu đề, nội dung..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
                            ) : error ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="z-notification-state z-notification-error">{error.message}</div>
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
                                    menuPosition="fixed"
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
                                    menuPosition="fixed"
                                />
                            </div>
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
}