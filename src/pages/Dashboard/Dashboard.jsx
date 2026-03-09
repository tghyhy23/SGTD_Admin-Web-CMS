import React, { useEffect, useState } from "react";
import { bookingApi } from "../../api/axiosApi";
import "./Dashboard.css"; // File CSS mình để ở Bước 3

const Dashboard = () => {
    // ==========================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ==========================================
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // ==========================================
    // 2. STATE LỌC, TÌM KIẾM & PHÂN TRANG
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    // Modal Xóa
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState(null);

    // ==========================================
    // 3. FETCH DATA
    // ==========================================
    const fetchBookings = async () => {
        setIsLoading(true);
        try {
            const params = { page, limit };
            if (searchTerm) params.search = searchTerm;
            if (filterStatus) params.status = filterStatus;

            const res = await bookingApi.getAllBookingsAdmin(params);
            if (res && res.success) {
                setBookings(res.data.bookings || []);
                setTotalPages(res.data.pagination?.pages || 1);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách Booking:", error);
            showToast("Lỗi kết nối đến máy chủ", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBookings();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, searchTerm, filterStatus]);

    // ==========================================
    // 4. HANDLERS (CONFIRM, COMPLETE, DELETE)
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // XÁC NHẬN LỊCH HẸN
    const handleConfirm = async (id) => {
        if (!window.confirm("Bạn có chắc muốn XÁC NHẬN lịch hẹn này? Thông báo sẽ được gửi đến khách hàng.")) return;

        setIsSubmitting(true);
        try {
            const res = await bookingApi.confirmBooking(id);
            if (res && res.success) {
                showToast("Đã xác nhận lịch hẹn!");
                // Cập nhật UI ngay lập tức
                setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status: "CONFIRMED" } : b)));
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi xác nhận lịch hẹn", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // HOÀN THÀNH LỊCH HẸN
    const handleComplete = async (id) => {
        if (!window.confirm("Đánh dấu lịch hẹn này là ĐÃ HOÀN THÀNH?")) return;

        setIsSubmitting(true);
        try {
            const res = await bookingApi.completeBooking(id);
            if (res && res.success) {
                showToast("Đã hoàn thành lịch hẹn!");
                setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status: "COMPLETED" } : b)));
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi hoàn thành lịch hẹn", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // XÓA LỊCH HẸN (Mở Modal)
    const handleDeleteClick = (booking) => {
        setBookingToDelete(booking);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!bookingToDelete) return;
        setIsSubmitting(true);
        try {
            const res = await bookingApi.deleteBooking(bookingToDelete._id);
            if (res && res.success) {
                showToast("Đã xóa lịch hẹn!");
                setBookings((prev) => prev.filter((b) => b._id !== bookingToDelete._id));
                setIsDeleteModalOpen(false);
                setBookingToDelete(null);
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi khi xóa lịch hẹn", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 5. HELPER UI
    // ==========================================
    const getStatusBadge = (status) => {
        switch (status) {
            case "PENDING":
                return <span className="status-badge pending">Chờ xác nhận</span>;
            case "CONFIRMED":
                return <span className="status-badge confirmed">Đã xác nhận</span>;
            case "COMPLETED":
                return <span className="status-badge completed">Hoàn thành</span>;
            case "CANCELLED":
                return <span className="status-badge cancelled">Đã hủy</span>;
            default:
                return <span className="status-badge">{status}</span>;
        }
    };

    const getStatusLabelText = (status) => {
        switch (status) {
            case "PENDING":
                return "Chờ xác nhận";
            case "CONFIRMED":
                return "Đã xác nhận";
            case "COMPLETED":
                return "Hoàn thành";
            case "CANCELLED":
                return "Đã hủy";
            default:
                return "Tất cả trạng thái";
        }
    };

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message fixed-toast ${toast.type}`} style={{ zIndex: 9999 }}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Dashboard - Quản lý Lịch Hẹn</h1>
            </div>

            {/* BỘ LỌC */}
            <div className="filter-bar" style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <div className="search-box" style={{ flex: 1, margin: 0 }}>
                    <input
                        type="text"
                        placeholder="Tìm mã Booking, Tên KH, SĐT..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", outline: "none" }}
                    />
                </div>

                <div className="filter-dropdown-container" style={{ position: "relative", margin: 0 }}>
                    <button className="btn-filter" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
                        <span>{getStatusLabelText(filterStatus)}</span>
                        <span className="dropdown-arrow">▼</span>
                    </button>
                    {showStatusDropdown && (
                        <div className="filter-dropdown-menu">
                            <div
                                className={`filter-option ${filterStatus === "" ? "active" : ""}`}
                                onClick={() => {
                                    setFilterStatus("");
                                    setPage(1);
                                    setShowStatusDropdown(false);
                                }}
                            >
                                Tất cả trạng thái
                            </div>
                            <div
                                className={`filter-option ${filterStatus === "PENDING" ? "active" : ""}`}
                                onClick={() => {
                                    setFilterStatus("PENDING");
                                    setPage(1);
                                    setShowStatusDropdown(false);
                                }}
                            >
                                 Chờ xác nhận
                            </div>
                            <div
                                className={`filter-option ${filterStatus === "CONFIRMED" ? "active" : ""}`}
                                onClick={() => {
                                    setFilterStatus("CONFIRMED");
                                    setPage(1);
                                    setShowStatusDropdown(false);
                                }}
                            >
                                Đã xác nhận
                            </div>
                            <div
                                className={`filter-option ${filterStatus === "COMPLETED" ? "active" : ""}`}
                                onClick={() => {
                                    setFilterStatus("COMPLETED");
                                    setPage(1);
                                    setShowStatusDropdown(false);
                                }}
                            >
                                Hoàn thành
                            </div>
                            <div
                                className={`filter-option ${filterStatus === "CANCELLED" ? "active" : ""}`}
                                onClick={() => {
                                    setFilterStatus("CANCELLED");
                                    setPage(1);
                                    setShowStatusDropdown(false);
                                }}
                            >
                                Đã hủy
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>Mã Đơn</th>
                            <th>Khách hàng</th>
                            <th>Dịch vụ / Gói</th>
                            <th>Chi nhánh</th>
                            <th>Thời gian hẹn</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && bookings.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center py-4">
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : bookings.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center py-4">
                                    Không tìm thấy lịch hẹn nào.
                                </td>
                            </tr>
                        ) : (
                            bookings.map((booking) => (
                                <tr key={booking._id}>
                                    <td>
                                        <strong style={{ color: "var(--primary-color)" }}>{booking.code}</strong>
                                    </td>
                                    <td>
                                        <div className="font-medium text-dark">{booking.contactName}</div>
                                        <div className="text-sm text-gray">{booking.contactPhone}</div>
                                        {booking.isBookingForOthers && <span style={{ fontSize: "10px", backgroundColor: "#e5e7eb", padding: "2px 6px", borderRadius: "4px" }}>Đặt hộ</span>}
                                    </td>
                                    <td>
                                        {/* Hàng 1: Tên dịch vụ */}
                                        <div className="font-medium text-dark">{booking.serviceId?.name}</div>
                                        {/* Hàng 2: Tên gói + Giá tiền màu xanh lá */}
                                        <div className="text-sm text-gray" style={{ marginTop: "4px" }}>
                                            {booking.variantId?.name} - <p style={{ color: "var(--primary-color)" }}>{booking.finalPrice?.toLocaleString()}đ</p>
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: "220px" }}>
                                        {" "}
                                        {/* Tăng xíu maxWidth để chữ có không gian rớt dòng */}
                                        {/* Xóa class 'truncate' và thêm CSS cho phép rớt dòng tự nhiên */}
                                        <div className="font-medium text-dark" style={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.4", fontSize: "14px" }}>
                                            {booking.branchId?.name}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="font-medium" style={{ color: "#12915A" }}>
                                            {booking.bookingTime}
                                        </div>
                                        <div className="text-sm text-gray">{new Date(booking.bookingDate).toLocaleDateString("vi-VN")}</div>
                                    </td>
                                    <td>{getStatusBadge(booking.status)}</td>
                                    <td>
                                        <div className="action-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                            {booking.status === "PENDING" && (
                                                <button className="action-btn btn-primary" onClick={() => handleConfirm(booking._id)} disabled={isSubmitting}>
                                                    Xác nhận
                                                </button>
                                            )}
                                            {booking.status === "CONFIRMED" && (
                                                <button className="action-btn btn-success" onClick={() => handleComplete(booking._id)} disabled={isSubmitting} style={{ backgroundColor: "#10b981", color: "white", border: "none" }}>
                                                    Hoàn thành
                                                </button>
                                            )}
                                            <button className="action-btn btn-delete" onClick={() => handleDeleteClick(booking)} disabled={isSubmitting}>
                                                Xóa
                                            </button>
                                        </div>
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
                    <button className="btn-default" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                        Trang trước
                    </button>
                    <span style={{ padding: "8px 12px", fontWeight: "500", color: "#374151" }}>
                        Trang {page} / {totalPages}
                    </span>
                    <button className="btn-default" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                        Trang sau
                    </button>
                </div>
            )}

            {/* MODAL XÁC NHẬN XÓA */}
            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-delete" style={{ background: "#fff", borderRadius: "12px", padding: "24px", maxWidth: "400px", width: "100%", textAlign: "center" }}>
                        <div style={{ marginBottom: "15px" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </div>
                        <h3 style={{ margin: "0 0 10px", fontSize: "1.2rem", color: "#111827" }}>Xóa lịch hẹn</h3>
                        <p style={{ margin: "0 0 20px", color: "#4b5563", lineHeight: "1.5" }}>
                            Bạn có chắc chắn muốn xóa mã đơn <br />
                            <strong style={{ color: "#ef4444" }}>{bookingToDelete?.code}</strong> không?
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
                                Hủy bỏ
                            </button>
                            <button className="btn-danger" onClick={confirmDelete} disabled={isSubmitting}>
                                {isSubmitting ? "Đang xử lý..." : "Xác nhận xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
