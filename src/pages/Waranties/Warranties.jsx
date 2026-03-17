import React, { useEffect, useState } from "react";
import { warrantyApi, serviceApi, clinicApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
// import "./Warranties.css"; // Tái sử dụng CSS chung

const Warranties = () => {
    // ==========================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ==========================================
    const [warranties, setWarranties] = useState([]);
    const [services, setServices] = useState([]);
    const [branches, setBranches] = useState([]);

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
    const[totalPages, setTotalPages] = useState(1);
    const limit = 10;

    // ==========================================
    // 3. STATE MODAL & FORM
    // ==========================================
    const[isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editWarrantyId, setEditWarrantyId] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const[warrantyToDelete, setWarrantyToDelete] = useState(null);

    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [warrantyToCancel, setWarrantyToCancel] = useState(null);
    const [cancelReason, setCancelReason] = useState("");

    const initialForm = {
        fullName: "",
        phoneNumber: "",
        email: "",
        serviceId: "",
        serviceName: "",
        variantName: "",
        branchId: "",
        branchName: "",
        startDate: new Date().toISOString().split("T")[0],
        expiredDate: "",
        warrantyPeriod: "",
        notes: "",
    };
    const [formData, setFormData] = useState(initialForm);

    // ==========================================
    // 4. FETCH DATA
    // ==========================================
    const fetchDependencies = async () => {
        try {
            const [servRes, branchRes] = await Promise.all([
                serviceApi.getAllServices(),
                clinicApi.getAllClinics({ limit: 100 }),
            ]);
            if (servRes?.success) setServices(servRes.data?.services ||[]);
            if (branchRes?.success) setBranches(branchRes.data?.branches ||[]);
        } catch (error) {
            console.error("Lỗi lấy danh sách dịch vụ/chi nhánh:", error);
        }
    };

    const fetchWarranties = async () => {
        setIsLoading(true);
        try {
            const params = { page, limit };
            if (searchTerm) params.search = searchTerm;
            if (filterStatus) params.status = filterStatus;

            const res = await warrantyApi.getAllWarranties(params);
            if (res && res.success) {
                setWarranties(res.data.warranties ||[]);
                setTotalPages(res.data.pagination?.pages || 1);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách Bảo hành:", error);
            showToast("Lỗi kết nối đến máy chủ", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDependencies();
    },[]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchWarranties();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, searchTerm, filterStatus]);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // 5. XỬ LÝ FORM THÊM / SỬA
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditWarrantyId(null);
        setFormData(initialForm);
        setIsFormModalOpen(true);
    };

    const openEditModal = (warranty) => {
        setIsEditMode(true);
        setEditWarrantyId(warranty._id);
        setFormData({
            fullName: warranty.fullName || "",
            phoneNumber: warranty.phoneNumber || "",
            email: warranty.email || "",
            serviceId: warranty.serviceId?._id || "",
            serviceName: warranty.serviceName || "",
            variantName: warranty.variantName || "",
            branchId: warranty.branchId?._id || "",
            branchName: warranty.branchName || "",
            startDate: warranty.startDate ? new Date(warranty.startDate).toISOString().split("T")[0] : "",
            expiredDate: warranty.expiredDate ? new Date(warranty.expiredDate).toISOString().split("T")[0] : "",
            warrantyPeriod: warranty.warrantyPeriod || "",
            notes: warranty.notes || "",
        });
        setIsFormModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Tự động map tên Service/Branch khi chọn Select
        if (name === "serviceId") {
            const selectedService = services.find(s => s._id === value);
            setFormData(prev => ({ ...prev, serviceId: value, serviceName: selectedService?.name || "" }));
        } else if (name === "branchId") {
            const selectedBranch = branches.find(b => b._id === value);
            setFormData(prev => ({ ...prev, branchId: value, branchName: selectedBranch?.name || "" }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let res;
            if (isEditMode) {
                res = await warrantyApi.updateWarranty(editWarrantyId, formData);
            } else {
                res = await warrantyApi.createWarranty(formData);
            }

            if (res && res.success) {
                showToast(isEditMode ? "Cập nhật thành công!" : "Tạo bảo hành thành công!");
                setIsFormModalOpen(false);
                fetchWarranties(); // Refresh list
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Có lỗi xảy ra", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 6. CÁC THAO TÁC (SỬ DỤNG, HỦY, XÓA, UPDATE HẠN)
    // ==========================================
    const handleUseWarranty = async (id) => {
        if (!window.confirm("Xác nhận khách hàng đã SỬ DỤNG lượt bảo hành này?")) return;
        setIsSubmitting(true);
        try {
            const res = await warrantyApi.useWarranty(id, { usageNotes: "Đã sử dụng qua trang Quản lý" });
            if (res && res.success) {
                showToast("Đã cập nhật trạng thái SỬ DỤNG!");
                setWarranties(prev => prev.map(w => w._id === id ? { ...w, status: "USED" } : w));
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi cập nhật", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelSubmit = async () => {
        if (!cancelReason) return showToast("Vui lòng nhập lý do hủy", "error");
        setIsSubmitting(true);
        try {
            const res = await warrantyApi.cancelWarranty(warrantyToCancel._id, { reason: cancelReason });
            if (res && res.success) {
                showToast("Đã hủy bảo hành!");
                setIsCancelModalOpen(false);
                setWarranties(prev => prev.map(w => w._id === warrantyToCancel._id ? { ...w, status: "CANCELLED" } : w));
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi khi hủy", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        setIsSubmitting(true);
        try {
            const res = await warrantyApi.deleteWarranty(warrantyToDelete._id);
            if (res && res.success) {
                showToast("Đã xóa bảo hành!");
                setWarranties(prev => prev.filter(w => w._id !== warrantyToDelete._id));
                setIsDeleteModalOpen(false);
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi khi xóa", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateExpired = async () => {
        setIsSubmitting(true);
        try {
            const res = await warrantyApi.updateExpiredWarranties();
            if (res && res.success) {
                showToast(res.message);
                fetchWarranties();
            }
        } catch (error) {
            showToast("Lỗi cập nhật bảo hành hết hạn", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 7. HELPER UI
    // ==========================================
    const getStatusBadge = (status) => {
        switch (status) {
            case "ACTIVE": return <span className="category-badge" style={{ backgroundColor: "#dcfce7", color: "#059669" }}>Đang hiệu lực</span>;
            case "USED": return <span className="category-badge" style={{ backgroundColor: "#dbeafe", color: "#2563eb" }}>Đã sử dụng</span>;
            case "EXPIRED": return <span className="category-badge" style={{ backgroundColor: "#f3f4f6", color: "#4b5563" }}>Đã hết hạn</span>;
            case "CANCELLED": return <span className="category-badge" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>Đã hủy</span>;
            default: return <span className="category-badge">{status}</span>;
        }
    };

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message fixed-toast ${toast.type}`} style={{ zIndex: 9999 }}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>×</button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Bảo Hành</h1>
                <div className="services-tools">
                    <button className="btn-secondary" onClick={handleUpdateExpired} disabled={isSubmitting}>
                        🔄 Quét mã hết hạn
                    </button>
                    <button className="add-btn" onClick={openAddModal}>
                        <span>+ Thêm bảo hành</span>
                    </button>
                </div>
            </div>

            {/* BỘ LỌC */}
            <div className="filter-bar" style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <div className="search-box" style={{ flex: 1, margin: 0 }}>
                    <input
                        type="text"
                        placeholder="Tìm mã BH, Tên KH, SĐT..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", outline: "none" }}
                    />
                </div>

                <div className="filter-dropdown-container" style={{ position: "relative", margin: 0 }}>
                    <button className="btn-filter" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
                        <span>{filterStatus === "" ? "Tất cả trạng thái" : filterStatus === "ACTIVE" ? "Đang hiệu lực" : filterStatus === "USED" ? "Đã sử dụng" : filterStatus === "EXPIRED" ? "Đã hết hạn" : "Đã hủy"}</span>
                        <span className="dropdown-arrow">▼</span>
                    </button>
                    {showStatusDropdown && (
                        <div className="filter-dropdown-menu">
                            <div className={`filter-option ${filterStatus === "" ? "active" : ""}`} onClick={() => { setFilterStatus(""); setPage(1); setShowStatusDropdown(false); }}>Tất cả trạng thái</div>
                            <div className={`filter-option ${filterStatus === "ACTIVE" ? "active" : ""}`} onClick={() => { setFilterStatus("ACTIVE"); setPage(1); setShowStatusDropdown(false); }}>Đang hiệu lực</div>
                            <div className={`filter-option ${filterStatus === "USED" ? "active" : ""}`} onClick={() => { setFilterStatus("USED"); setPage(1); setShowStatusDropdown(false); }}>Đã sử dụng</div>
                            <div className={`filter-option ${filterStatus === "EXPIRED" ? "active" : ""}`} onClick={() => { setFilterStatus("EXPIRED"); setPage(1); setShowStatusDropdown(false); }}>Đã hết hạn</div>
                            <div className={`filter-option ${filterStatus === "CANCELLED" ? "active" : ""}`} onClick={() => { setFilterStatus("CANCELLED"); setPage(1); setShowStatusDropdown(false); }}>Đã hủy</div>
                        </div>
                    )}
                </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>Mã BH</th>
                            <th>Khách hàng</th>
                            <th>Dịch vụ bảo hành</th>
                            <th>Chi nhánh</th>
                            <th>Thời hạn</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && warranties.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>Đang tải dữ liệu...</td></tr>
                        ) : warranties.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>Không tìm thấy dữ liệu.</td></tr>
                        ) : (
                            warranties.map((w) => (
                                <tr key={w._id}>
                                    <td><strong style={{ color: "var(--primary-color)" }}>{w.warrantyCode}</strong></td>
                                    <td>
                                        <div className="font-medium text-dark">{w.fullName}</div>
                                        <div className="text-sm text-gray">{w.phoneNumber}</div>
                                    </td>
                                    <td>
                                        <div className="font-medium text-dark">{w.serviceName}</div>
                                        {w.variantName && <div className="text-sm text-gray">{w.variantName}</div>}
                                    </td>
                                    <td>{w.branchName || "N/A"}</td>
                                    <td>
                                        <div className="text-sm text-gray">Từ: {new Date(w.startDate).toLocaleDateString("vi-VN")}</div>
                                        <div className="font-medium" style={{ color: w.daysRemaining < 0 ? "#dc2626" : "#12915A" }}>
                                            Đến: {new Date(w.expiredDate).toLocaleDateString("vi-VN")}
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(w.status)}</td>
                                    <td>
                                        <div className="action-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                            <button className="action-btn btn-edit" onClick={() => openEditModal(w)}>Sửa</button>
                                            
                                            {w.status === "ACTIVE" && (
                                                <button className="action-btn btn-success" onClick={() => handleUseWarranty(w._id)} style={{ backgroundColor: "#2563eb", color: "white", border: "none" }}>Sử dụng</button>
                                            )}
                                            
                                            {(w.status === "ACTIVE" || w.status === "EXPIRED") && (
                                                <button className="action-btn" onClick={() => { setWarrantyToCancel(w); setIsCancelModalOpen(true); }} style={{ backgroundColor: "#fef08a", color: "#854d0e", border: "none" }}>Hủy</button>
                                            )}
                                            
                                            <button className="action-btn btn-delete" onClick={() => { setWarrantyToDelete(w); setIsDeleteModalOpen(true); }}>Xóa</button>
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
                    <button className="btn-default" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Trang trước</button>
                    <span style={{ padding: "8px 12px", fontWeight: "500" }}>Trang {page} / {totalPages}</span>
                    <button className="btn-default" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Trang sau</button>
                </div>
            )}

            {/* MODAL FORM THÊM/SỬA */}
            <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật Bảo Hành" : "Tạo Bảo Hành Mới"} maxWidth="600px">
                <form onSubmit={handleSubmitForm} className="custom-form">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div className="form-group">
                            <label>Họ tên KH <span style={{ color: "red" }}>*</span></label>
                            <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required disabled={isSubmitting} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label>Số điện thoại <span style={{ color: "red" }}>*</span></label>
                            <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} required disabled={isSubmitting} className="form-input" />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div className="form-group">
                            <label>Dịch vụ <span style={{ color: "red" }}>*</span></label>
                            <select name="serviceId" value={formData.serviceId} onChange={handleInputChange} required disabled={isSubmitting} className="form-input">
                                <option value="">-- Chọn dịch vụ --</option>
                                {services.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Chi nhánh</label>
                            <select name="branchId" value={formData.branchId} onChange={handleInputChange} disabled={isSubmitting} className="form-input">
                                <option value="">-- Chọn chi nhánh --</option>
                                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div className="form-group">
                            <label>Ngày bắt đầu</label>
                            <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required disabled={isSubmitting} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label>Ngày hết hạn <span style={{ color: "red" }}>*</span></label>
                            <input type="date" name="expiredDate" value={formData.expiredDate} onChange={handleInputChange} required disabled={isSubmitting} className="form-input" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Ghi chú</label>
                        <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" disabled={isSubmitting} className="form-textarea" />
                    </div>

                    <div className="modal-footer-actions">
                        <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)}>Hủy bỏ</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : "Lưu dữ liệu"}</button>
                    </div>
                </form>
            </Modal>

            {/* MODAL HỦY BẢO HÀNH */}
            <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Hủy Phiếu Bảo Hành">
                <div style={{ padding: "10px" }}>
                    <p style={{ marginBottom: "15px" }}>Bạn đang thao tác hủy phiếu: <strong>{warrantyToCancel?.warrantyCode}</strong></p>
                    <div className="form-group">
                        <label>Lý do hủy <span style={{ color: "red" }}>*</span></label>
                        <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows="3" className="form-textarea" placeholder="Nhập lý do hủy phiếu..." />
                    </div>
                    <div className="modal-footer-actions">
                        <button className="btn-secondary" onClick={() => setIsCancelModalOpen(false)} disabled={isSubmitting}>Đóng</button>
                        <button className="btn-danger" onClick={handleCancelSubmit} disabled={isSubmitting || !cancelReason}>Xác nhận Hủy</button>
                    </div>
                </div>
            </Modal>

            {/* MODAL XÓA */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xác nhận xóa">
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <h3 className="delete-header">Xác nhận xóa phiếu bảo hành</h3>
                    <p className="delete-message">
                        Bạn có chắc chắn muốn xóa mã <br />
                        <strong className="delete-product-name">{warrantyToDelete?.warrantyCode}</strong> không?
                    </p>
                    <div className="modal-footer-delete">
                        <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>Hủy bỏ</button>
                        <button className="btn-danger" onClick={confirmDelete} disabled={isSubmitting}>Xác nhận xóa</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Warranties;