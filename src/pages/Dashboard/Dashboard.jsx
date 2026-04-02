import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"; // Thêm import
import { bookingApi, clinicApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Button, { DeleteButton } from "../../ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";

const STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "PENDING", label: "Chờ xác nhận" },
    { value: "CONFIRMED", label: "Đã xác nhận" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "CANCELLED", label: "Đã hủy" },
];

const Dashboard = () => {
    // ==========================================
    // 1. LẤY THÔNG TIN USER & PHÂN QUYỀN
    // ==========================================
    const { user } = useAuth();
    const userRole = user?.role || user?.account?.role || "USER";
    const isSuperAdmin = userRole === "SUPERADMIN";

    const adminAssignedBranchIds = user?.account?.branches?.map(b => b._id || b) || user?.branches?.map(b => b._id || b) || [];
    
    // Khởi tạo queryClient để invalidate cache sau khi update
    const queryClient = useQueryClient(); 

    // ==========================================
    // 2. STATE LỌC, TÌM KIẾM, SẮP XẾP & PHÂN TRANG
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [filterStatus, setFilterStatus] = useState("");
    const [filterBranch, setFilterBranch] = useState("");
    const [sortOrder, setSortOrder] = useState("desc");

    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);

    const [page, setPage] = useState(1);
    const limit = 10;

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // ==========================================
    // 3. STATE CÁC MODALS
    // ==========================================
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [bookingToConfirm, setBookingToConfirm] = useState(null);

    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [bookingToComplete, setBookingToComplete] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState(null);

    // ==========================================
    // 4. REACT QUERY: FETCH DỮ LIỆU 
    // ==========================================

    // Delay debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 4.1 Lấy danh sách chi nhánh (Được cache lại)
    const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
        queryKey: ["branches", isSuperAdmin, user?.email],
        queryFn: async () => {
            const clinicRes = await clinicApi.getAllClinics({ limit: 100 });
            const allBranches = clinicRes.data?.branches || clinicRes.data || [];

            if (isSuperAdmin) return allBranches;

            return allBranches.filter(b => {
                const matchEmail = b.managerId?.email === user?.email;
                const matchAccount = adminAssignedBranchIds.includes(String(b._id));
                return matchEmail || matchAccount;
            });
        },
        staleTime: 5 * 60 * 1000, // Cache sống trong 5 phút
    });

    // Tính toán branchId để query truyền đi
    const derivedBranchId = isSuperAdmin ? filterBranch : (branches.length > 0 ? branches[0]._id : undefined);

    // 4.2 Lấy danh sách Bookings (Được cache & giữ data cũ khi sang trang)
    const { data: bookingData, isLoading: isLoadingBookings } = useQuery({
        queryKey: ["bookings", page, limit, debouncedSearch, filterStatus, derivedBranchId, sortOrder],
        queryFn: async () => {
            const params = { page, limit, sort: sortOrder };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterStatus) params.status = filterStatus;
            if (derivedBranchId) params.branchId = derivedBranchId;

            const res = await bookingApi.getAllBookingsAdmin(params);
            if (res && res.success) {
                return {
                    bookings: res.data.bookings || [],
                    totalPages: res.data.pagination?.pages || 1
                };
            }
            return { bookings: [], totalPages: 1 };
        },
        // Chỉ chạy query này khi đã biết được list branches (nếu không phải SuperAdmin)
        enabled: isSuperAdmin || branches.length > 0,
        placeholderData: keepPreviousData, // Giữ data trang cũ khi đang fetch trang mới (UI không bị giật)
        staleTime: 1 * 60 * 1000, // Dữ liệu booking khá nhạy cảm, cache 1 phút
    });

    const bookings = bookingData?.bookings || [];
    const totalPages = bookingData?.totalPages || 1;
    const isLoading = isLoadingBookings || isLoadingBranches;

    // ==========================================
    // 5. REACT QUERY: MUTATIONS (Xử lý các thao tác update/delete)
    // ==========================================
    
    const confirmMutation = useMutation({
        mutationFn: (id) => bookingApi.confirmBooking(id),
        onSuccess: () => {
            setToast({ show: true, message: "Đã xác nhận lịch hẹn!", type: "success" });
            setIsConfirmModalOpen(false);
            setBookingToConfirm(null);
            queryClient.invalidateQueries({ queryKey: ["bookings"] }); // Tự động refetch list
        },
        onError: (error) => setToast({ show: true, message: error.response?.data?.message || "Lỗi xác nhận lịch hẹn", type: "error" })
    });

    const completeMutation = useMutation({
        mutationFn: (id) => bookingApi.completeBooking(id),
        onSuccess: () => {
            setToast({ show: true, message: "Đã hoàn thành lịch hẹn!", type: "success" });
            setIsCompleteModalOpen(false);
            setBookingToComplete(null);
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
        },
        onError: (error) => setToast({ show: true, message: error.response?.data?.message || "Lỗi hoàn thành lịch hẹn", type: "error" })
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => bookingApi.deleteBooking(id),
        onSuccess: () => {
            setToast({ show: true, message: "Đã xóa lịch hẹn!", type: "success" });
            setIsDeleteModalOpen(false);
            setBookingToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
        },
        onError: (error) => setToast({ show: true, message: error.response?.data?.message || "Lỗi khi xóa lịch hẹn", type: "error" })
    });

    const isSubmitting = confirmMutation.isPending || completeMutation.isPending || deleteMutation.isPending;

    // ==========================================
    // 6. HELPER UI
    // ==========================================
    const getStatusLabelText = (statusValue) => {
        const option = STATUS_OPTIONS.find((opt) => opt.value === statusValue);
        return option ? option.label : "Tất cả trạng thái";
    };

    const getBranchLabelText = () => {
        if (!isSuperAdmin) {
            return branches.length > 0 ? branches[0].name : "Đang tải chi nhánh...";
        }
        if (!filterBranch) return "Tất cả chi nhánh";
        const branch = branches.find((b) => b._id === filterBranch);
        return branch ? branch.name : "Tất cả chi nhánh";
    };

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Lịch Hẹn" }]} title="Quản lí lịch Hẹn" description="Quản lý theo dõi các lịch hẹn của khách hàng. Xác nhận và cập nhật hoàn thành dịch vụ khách hàng" />

            <div className="z-dashboard-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-dashboard-header">
                    <h1 className="z-dashboard-title">Danh sách lịch hẹn</h1>
                </div>

                {/* --- TOOLS BAR (Search & Filters) --- */}
                <div className="z-dashboard-tools">
                    <div className="z-dashboard-search">
                        <input type="text" placeholder="Tìm mã Booking, Tên KH, SĐT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* Filter CHI NHÁNH */}
                    <div className="z-dashboard-filter">
                        <button
                            className="z-dashboard-btn-filter"
                            onClick={() => {
                                if (isSuperAdmin) {
                                    setShowBranchDropdown(!showBranchDropdown);
                                    setShowStatusDropdown(false);
                                }
                            }}
                            style={{ cursor: isSuperAdmin ? "pointer" : "default" }}
                        >
                            <span style={{ maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getBranchLabelText()}</span>
                            {isSuperAdmin && (
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                    <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                                </svg>
                            )}
                        </button>

                        {isSuperAdmin && showBranchDropdown && (
                            <div className="z-dashboard-dropdown-menu" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                <div
                                    className={`z-dashboard-dropdown-item ${filterBranch === "" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterBranch("");
                                        setPage(1);
                                        setShowBranchDropdown(false);
                                    }}
                                >
                                    Tất cả chi nhánh
                                </div>
                                {branches.map((branch) => (
                                    <div
                                        key={branch._id}
                                        className={`z-dashboard-dropdown-item ${filterBranch === branch._id ? "active" : ""}`}
                                        onClick={() => {
                                            setFilterBranch(branch._id);
                                            setPage(1);
                                            setShowBranchDropdown(false);
                                        }}
                                    >
                                        {branch.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Filter TRẠNG THÁI */}
                    <div className="z-dashboard-filter">
                        <button
                            className="z-dashboard-btn-filter"
                            onClick={() => {
                                setShowStatusDropdown(!showStatusDropdown);
                                setShowBranchDropdown(false);
                            }}
                        >
                            <span>{getStatusLabelText(filterStatus)}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showStatusDropdown && (
                            <div className="z-dashboard-dropdown-menu">
                                {STATUS_OPTIONS.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={`z-dashboard-dropdown-item ${filterStatus === opt.value ? "active" : ""}`}
                                        onClick={() => {
                                            setFilterStatus(opt.value);
                                            setPage(1);
                                            setShowStatusDropdown(false);
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- TABLE --- */}
                <div className="z-dashboard-table-wrapper">
                    <table className="z-dashboard-table">
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
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="z-dashboard-state">Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="z-dashboard-state">Không tìm thấy lịch hẹn nào phù hợp.</div>
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking._id}>
                                        <td>
                                            <strong style={{ color: "var(--primary-color)" }}>{booking.code}</strong>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-bold">{booking.contactName}</div>
                                            <div className="z-dashboard-subtext">{booking.contactPhone}</div>
                                            {booking.isBookingForOthers && <span className="z-dashboard-tag-gray">Đặt hộ</span>}
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-bold z-dashboard-text-clamp">{booking.serviceId?.name}</div>
                                            <div className="z-dashboard-subtext" style={{ marginTop: "4px" }}>
                                                {booking.variantId?.name ? (
                                                    <>
                                                        {booking.variantId.name} - <span style={{ color: "var(--primary-color)", fontWeight: "500" }}>{booking.finalPrice?.toLocaleString()}đ</span>
                                                    </>
                                                ) : (
                                                    <span style={{ fontStyle: "italic", color: "var(--warning)", fontWeight: "500" }}>Chưa chọn gói dịch vụ - Cần tư vấn</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-normal" style={{ maxWidth: "220px", wordBreak: "break-word" }}>{booking.branchId?.name}</div>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-bold" style={{ color: "var(--primary-color)" }}>
                                                {booking.bookingTime}
                                            </div>
                                            <div className="z-dashboard-subtext">{new Date(booking.bookingDate).toLocaleDateString("vi-VN")}</div>
                                        </td>
                                        <td>
                                            <span className={`z-dashboard-badge-${booking.status.toLowerCase()}`}>{getStatusLabelText(booking.status)}</span>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-dropdown-actions">
                                                <button className="z-banner-more-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>
                                                <div className="z-dashboard-action-menu">
                                                    {booking.status === "PENDING" && (
                                                        <Button
                                                            variant="edit"
                                                            onClick={() => {
                                                                setBookingToConfirm(booking);
                                                                setIsConfirmModalOpen(true);
                                                            }}
                                                            disabled={isSubmitting}
                                                        >
                                                            Xác nhận lịch
                                                        </Button>
                                                    )}
                                                    {booking.status === "CONFIRMED" && (
                                                        <Button
                                                            variant="complete"
                                                            onClick={() => {
                                                                setBookingToComplete(booking);
                                                                setIsCompleteModalOpen(true);
                                                            }}
                                                            disabled={isSubmitting}
                                                        >
                                                            Hoàn thành
                                                        </Button>
                                                    )}
                                                    {isSuperAdmin && (
                                                        <DeleteButton
                                                            onClick={() => {
                                                                setBookingToDelete(booking);
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                            disabled={isSubmitting}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- PAGINATION --- */}
                {totalPages > 1 && (
                    <div className="z-dashboard-pagination">
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

                {/* --- MODAL XÁC NHẬN --- */}
                <Modal isOpen={isConfirmModalOpen} onClose={() => !isSubmitting && setIsConfirmModalOpen(false)} title="Xác nhận lịch hẹn" size="sm" onSave={() => confirmMutation.mutate(bookingToConfirm._id)} saveText={isSubmitting ? "Đang xử lý..." : "Xác nhận"}>
                    <div className="z-dashboard-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto", marginBottom: "15px" }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                        <h3>Xác nhận lịch hẹn?</h3>
                        <p>
                            Bạn có chắc muốn xác nhận mã đơn <strong style={{ color: "#2563eb" }}>{bookingToConfirm?.code}</strong>? Khách hàng sẽ nhận được thông báo ngay sau khi xác nhận.
                        </p>
                    </div>
                </Modal>

                {/* --- MODAL HOÀN THÀNH --- */}
                <Modal isOpen={isCompleteModalOpen} onClose={() => !isSubmitting && setIsCompleteModalOpen(false)} title="Hoàn thành lịch hẹn" size="sm" onSave={() => completeMutation.mutate(bookingToComplete._id)} saveText={isSubmitting ? "Đang xử lý..." : "Hoàn thành"}>
                    <div className="z-dashboard-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto", marginBottom: "15px" }}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <h3>Đánh dấu hoàn thành?</h3>
                        <p>
                            Xác nhận khách hàng đã hoàn tất dịch vụ cho mã đơn <strong style={{ color: "#10b981" }}>{bookingToComplete?.code}</strong>.
                        </p>
                    </div>
                </Modal>

                {/* --- MODAL XÓA --- */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={() => deleteMutation.mutate(bookingToDelete._id)} saveText={isSubmitting ? "Đang xử lý..." : "Xác nhận xóa"}>
                    <div className="z-dashboard-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto", marginBottom: "15px" }}>
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xóa lịch hẹn?</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa mã đơn <strong style={{ color: "var(--error)" }}>{bookingToDelete?.code}</strong> không? Hành động này không thể hoàn tác.
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Dashboard;