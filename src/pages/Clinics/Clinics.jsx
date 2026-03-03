import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clinicApi } from "../../api/axiosApi";
import "./Clinics.css"; // Dùng chung file CSS như đã cấu hình

const removeVietnameseTones = (str) => {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
};

const FALLBACK_IMG = "https://via.placeholder.com/150?text=No+Image";

const Clinics = () => {
    const [clinics, setClinics] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); 
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState("rating_desc"); 
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    // ==========================================
    // STATE MỚI: TOAST VÀ MODAL XÓA
    // ==========================================
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clinicToDelete, setClinicToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();

    // FETCH DATA
    const fetchAllClinics = async () => {
        setIsLoading(true);
        try {
            const res = await clinicApi.getAllClinics({ limit: 100 });
            if (res && res.success) {
                setClinics(res.data.branches || []);
            } else {
                setError("Không thể tải danh sách phòng khám.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách phòng khám:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllClinics();
    }, []);

    // LOGIC TOAST MESSAGE
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // XỬ LÝ XÓA PHÒNG KHÁM
    // ==========================================
    const handleDeleteClick = (e, id, name) => {
        e.stopPropagation(); // Ngăn sự kiện click vào hàng chuyển trang
        setClinicToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!clinicToDelete) return;

        setIsSubmitting(true);
        try {
            const response = await clinicApi.deleteClinic(clinicToDelete.id);
            if (response && response.success) {
                showToast("Xóa phòng khám thành công!", "success");
                setIsDeleteModalOpen(false);
                setClinicToDelete(null);
                fetchAllClinics(); // Render lại danh sách
            } else {
                showToast(response?.message || "Lỗi xóa phòng khám", "error");
            }
        } catch (error) {
            console.error("Lỗi deleteClinic:", error);
            // Bắt lỗi khi phòng khám đang có người Booking (Backend trả về)
            const errorMsg = error.response?.data?.message || "Không thể xóa phòng khám lúc này";
            showToast(errorMsg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // CLICK VÀO HÀNG ĐỂ XEM CHI TIẾT
    const handleRowClick = (id) => {
        navigate(`/clinics/${id}`);
    };

    // LOGIC FILTER VÀ SORT
    const filteredClinics = clinics
        .filter((clinic) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedName = removeVietnameseTones(clinic.name);
            const normalizedAddress = removeVietnameseTones(clinic.address);
            
            const matchesSearch = normalizedName.includes(normalizedSearch) || normalizedAddress.includes(normalizedSearch);

            let matchesStatus = true;
            if (filterStatus === "active") matchesStatus = clinic.isActive === true;
            if (filterStatus === "inactive") matchesStatus = clinic.isActive === false;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortOrder === "rating_desc") return (b.totalRating || 0) - (a.totalRating || 0);
            if (sortOrder === "rating_asc") return (a.totalRating || 0) - (b.totalRating || 0);
            return 0;
        });

    const getStatusLabel = () => {
        if (filterStatus === "active") return "Đang hoạt động";
        if (filterStatus === "inactive") return "Ngừng hoạt động";
        return "Tất cả trạng thái";
    };

    const getSortLabel = () => {
        if (sortOrder === "rating_desc") return "Đánh giá: Cao đến thấp";
        if (sortOrder === "rating_asc") return "Đánh giá: Thấp đến cao";
        return "Sắp xếp mặc định";
    };

    // RENDER UI
    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

    return (
        <div className="services-container">
            {/* THÔNG BÁO TOAST */}
            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Phòng khám</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder="Tìm tên hoặc địa chỉ..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowSortDropdown(false);
                            }}
                        >
                            <span>{getStatusLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {showFilterDropdown && (
                            <div className="filter-dropdown-menu">
                                <div className={`filter-option ${filterStatus === "all" ? "active" : ""}`} onClick={() => { setFilterStatus("all"); setShowFilterDropdown(false); }}>
                                    Tất cả trạng thái
                                </div>
                                <div className={`filter-option ${filterStatus === "active" ? "active" : ""}`} onClick={() => { setFilterStatus("active"); setShowFilterDropdown(false); }}>
                                    Đang hoạt động
                                </div>
                                <div className={`filter-option ${filterStatus === "inactive" ? "active" : ""}`} onClick={() => { setFilterStatus("inactive"); setShowFilterDropdown(false); }}>
                                    Ngừng hoạt động
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            style={{ minWidth: "180px" }}
                            onClick={() => {
                                setShowSortDropdown(!showSortDropdown);
                                setShowFilterDropdown(false);
                            }}
                        >
                            <span>{getSortLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {showSortDropdown && (
                            <div className="filter-dropdown-menu">
                                <div className={`filter-option ${sortOrder === "rating_desc" ? "active" : ""}`} onClick={() => { setSortOrder("rating_desc"); setShowSortDropdown(false); }}>
                                    Đánh giá: Cao đến thấp
                                </div>
                                <div className={`filter-option ${sortOrder === "rating_asc" ? "active" : ""}`} onClick={() => { setSortOrder("rating_asc"); setShowSortDropdown(false); }}>
                                    Đánh giá: Thấp đến cao
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="add-btn" onClick={() => console.log('Mở form thêm phòng khám')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                        </svg>
                        <span>Thêm mới</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Hình ảnh</th>
                            <th>Tên Phòng Khám</th>
                            <th>Địa chỉ</th>
                            <th>Đánh giá</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClinics.map((clinic, index) => (
                            <tr key={clinic._id} onClick={() => handleRowClick(clinic._id)} className="clickable-row">
                                <td>{index + 1}</td>
                                <td className="td-image">
                                    <img
                                        src={clinic.imageUrls?.[0] || FALLBACK_IMG}
                                        alt={clinic.name}
                                        className="product-image"
                                        onError={(e) => { e.target.src = FALLBACK_IMG; }}
                                    />
                                </td>
                                <td>
                                    <div className="product-name">{clinic.name}</div>
                                    <div className="product-desc" title={clinic.hotline}>
                                        Hotline: {clinic.hotline}
                                    </div>
                                </td>
                                <td style={{ maxWidth: '250px' }}>
                                    <div className="product-desc" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical' }} title={clinic.address}>
                                        {clinic.address}
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontWeight: '600', color: '#f59e0b' }}>⭐ {clinic.totalRating || 0}</span>
                                    <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>({clinic.totalReview || 0})</span>
                                </td>
                                <td>
                                    {clinic.isActive ? (
                                        <span className="category-badge" style={{ backgroundColor: '#dcfce7', color: '#059669', borderColor: '#059669' }}>
                                            Đang hoạt động
                                        </span>
                                    ) : (
                                        <span className="category-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}>
                                            Ngừng hoạt động
                                        </span>
                                    )}
                                </td>
                                <td>
                                    {/* CỘT THAO TÁC (Đã thêm nút Xóa) */}
                                    <div className="action-row">
                                        <button className="action-btn btn-edit" onClick={(e) => { e.stopPropagation(); handleRowClick(clinic._id); }}>
                                            Xem chi tiết
                                        </button>
                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, clinic._id, clinic.name)}>
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredClinics.length === 0 && <div className="state-message">Không tìm thấy phòng khám nào phù hợp.</div>}
            </div>

            {/* ==========================================
                MODAL XÁC NHẬN XÓA 
                ========================================== */}
            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-delete">
                        <div className="delete-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </div>
                        
                        <h3 className="delete-header">Xác nhận xóa</h3>
                        
                        <p className="delete-message">
                            Bạn có chắc chắn muốn xóa phòng khám <br/>
                            <strong className="delete-product-name">"{clinicToDelete?.name}"</strong> không?
                            <span className="delete-warning">Hành động này không thể hoàn tác!</span>
                        </p>
                        
                        <div className="modal-footer-delete">
                            <button 
                                className="btn-secondary" 
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                className="btn-danger" 
                                onClick={confirmDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clinics;