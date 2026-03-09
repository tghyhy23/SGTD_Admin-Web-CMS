import React, { useEffect, useRef, useState } from "react";
import { promotionApi, clinicApi, serviceApi } from "../../api/axiosApi";
import "../Clinics/Clinics.css";
import "./Promotions.css";

const Promotions = () => {
    const fileInputRef = useRef(null);
    // ==========================================
    // STATE & VARIABLES
    // ==========================================
    const [promotions, setPromotions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [branches, setBranches] = useState([]);
    const [services, setServices] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    // STATE MỚI: QUẢN LÝ ẨN/HIỆN CUSTOM DROPDOWN
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [promoToDelete, setPromoToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentPromoId, setCurrentPromoId] = useState(null);

    // STATE MỚI CHO UPLOAD ẢNH
    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState("");

    const initialFormState = {
        name: "",
        code: "",
        description: "",
        branchId: "",
        isActive: true,
        bannerImageUrl: "",
        badgeText: "",
        details: "",
        terms: "",
        discountType: "percentage",
        discountValue: 0,
        maxDiscountAmount: "",
        minOrderValue: 0,
        startDate: "",
        endDate: "",
        usageLimit: "",
        limitPerUser: "",
        applicableServiceIds: [],
    };
    const [formData, setFormData] = useState(initialFormState);

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchPromotions = async () => {
        setIsLoading(true);
        try {
            const params = { page, limit, search: searchTerm, status: filterStatus };
            const res = await promotionApi.getAllPromotions(params);
            if (res && res.success) {
                setPromotions(res.data.promotions || []);
                setTotalPages(res.data.pagination?.pages || 1);
            } else {
                setError("Không thể tải danh sách khuyến mãi.");
            }
        } catch (err) {
            console.error(err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReferenceData = async () => {
        try {
            const [branchRes, serviceRes] = await Promise.all([clinicApi.getAllClinics({ limit: 100 }), serviceApi.getAllServices()]);
            if (branchRes && branchRes.success) setBranches(branchRes.data.branches || []);
            if (serviceRes && serviceRes.data) setServices(serviceRes.data.services || []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu tham chiếu:", error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPromotions();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, searchTerm, filterStatus]);

    useEffect(() => {
        fetchReferenceData();
    }, []);

    // ==========================================
    // TOAST, XÓA & TOGGLE STATUS (Optimistic UI)
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const handleDeleteClick = (e, id, name, code) => {
        e.stopPropagation();
        setPromoToDelete({ id, name, code });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!promoToDelete) return;
        setIsSubmitting(true);
        try {
            const response = await promotionApi.deletePromotion(promoToDelete.id);
            if (response && response.success) {
                showToast("Xóa khuyến mãi thành công!", "success");

                // --- Optimistic Update ---
                setPromotions((prev) => prev.filter((promo) => promo._id !== promoToDelete.id));
                // -------------------------

                setIsDeleteModalOpen(false);
                setPromoToDelete(null);
            } else {
                showToast(response?.message || "Lỗi xóa khuyến mãi", "error");
            }
        } catch (error) {
            showToast("Không thể xóa khuyến mãi lúc này", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (e, id) => {
        e.stopPropagation();

        // Lưu lại list cũ phòng khi lỗi
        const previousPromotions = [...promotions];

        // --- Optimistic Update ---
        setPromotions((prev) =>
            prev.map((promo) => {
                if (promo._id === id) {
                    const newIsActive = !promo.isActive;
                    // Ước tính trạng thái hiển thị
                    let newComputed = "inactive";
                    if (newIsActive) {
                        const now = new Date();
                        const end = new Date(promo.endDate);
                        const start = new Date(promo.startDate);
                        if (now > end) newComputed = "expired";
                        else if (now < start) newComputed = "upcoming";
                        else newComputed = "active";
                    }

                    return { ...promo, isActive: newIsActive, computedStatus: newComputed };
                }
                return promo;
            }),
        );
        // -------------------------

        try {
            const res = await promotionApi.togglePromotionStatus(id);
            if (res && res.success) {
                showToast("Đã thay đổi trạng thái!");
            } else {
                setPromotions(previousPromotions); // Revert nếu có lỗi
                showToast("Lỗi khi thay đổi trạng thái", "error");
            }
        } catch (error) {
            setPromotions(previousPromotions); // Revert nếu catch lỗi
            showToast("Lỗi khi thay đổi trạng thái", "error");
        }
    };

    // ==========================================
    // LOGIC FORM (CREATE / UPDATE)
    // ==========================================
    const openCreateForm = () => {
        setCurrentPromoId(null);
        setFormData(initialFormState);
        setImageFile(null);
        setPreviewImage("");
        setIsFormModalOpen(true);
    };

    const openUpdateForm = async (e, id) => {
        e.stopPropagation();
        setIsSubmitting(true);
        try {
            const res = await promotionApi.getPromotionDetail(id);
            if (res && res.success) {
                const promo = res.data;
                setCurrentPromoId(id);
                setFormData({
                    name: promo.name || "",
                    code: promo.code || "",
                    description: promo.description || "",
                    branchId: promo.branchId?._id || promo.branchId || "",
                    isActive: promo.isActive,
                    bannerImageUrl: promo.bannerImageUrl || "",
                    badgeText: promo.badgeText || "",
                    details: promo.details?.join("\n") || "",
                    terms: promo.terms?.join("\n") || "",
                    discountType: promo.discountType || "percentage",
                    discountValue: promo.discountValue || 0,
                    maxDiscountAmount: promo.maxDiscountAmount || "",
                    minOrderValue: promo.minOrderValue || 0,
                    startDate: promo.startDate ? new Date(promo.startDate).toISOString().slice(0, 16) : "",
                    endDate: promo.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : "",
                    usageLimit: promo.usageLimit || "",
                    limitPerUser: promo.limitPerUser || "",
                    applicableServiceIds: promo.applicableServiceIds?.map((s) => s._id || s) || [],
                });

                // Thiết lập ảnh preview nếu có
                setImageFile(null);
                setPreviewImage(promo.bannerImageUrl || "");

                setIsFormModalOpen(true);
            }
        } catch (error) {
            showToast("Không thể tải chi tiết khuyến mãi", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value, type } = e.target;
        if (name === "isActive") {
            setFormData((prev) => ({ ...prev, [name]: value === "true" }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    // HÀM XỬ LÝ KHI CHỌN CHECKBOX DỊCH VỤ
    const handleServiceCheckboxChange = (serviceId) => {
        setFormData((prev) => {
            const isSelected = prev.applicableServiceIds.includes(serviceId);
            if (isSelected) {
                // Nếu đã có thì bỏ chọn
                return {
                    ...prev,
                    applicableServiceIds: prev.applicableServiceIds.filter((id) => id !== serviceId),
                };
            } else {
                // Nếu chưa có thì thêm vào
                return {
                    ...prev,
                    applicableServiceIds: [...prev.applicableServiceIds, serviceId],
                };
            }
        });
    };

    // HÀM XỬ LÝ KHI CHỌN FILE ẢNH
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewImage(URL.createObjectURL(file)); // Tạo url tạm thời để hiển thị
        }
    };

    // Xóa ảnh
    const removeImage = () => {
        setImageFile(null);
        setPreviewImage("");
        setFormData((prev) => ({ ...prev, bannerImageUrl: "" }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // TẠO FORM DATA THAY VÌ PAYLOAD JSON
            const submitData = new FormData();

            // 1. Thêm các trường text cơ bản
            submitData.append("name", formData.name);
            submitData.append("code", formData.code);
            submitData.append("description", formData.description);
            submitData.append("branchId", formData.branchId);
            submitData.append("isActive", formData.isActive.toString());
            submitData.append("badgeText", formData.badgeText);
            submitData.append("discountType", formData.discountType);
            submitData.append("discountValue", Number(formData.discountValue));

            if (formData.maxDiscountAmount) submitData.append("maxDiscountAmount", Number(formData.maxDiscountAmount));
            if (formData.minOrderValue) submitData.append("minOrderValue", Number(formData.minOrderValue));
            if (formData.usageLimit) submitData.append("usageLimit", Number(formData.usageLimit));
            if (formData.limitPerUser) submitData.append("limitPerUser", Number(formData.limitPerUser));

            submitData.append("startDate", formData.startDate);
            submitData.append("endDate", formData.endDate);

            // 2. Xử lý các mảng (phải parse thành JSON string)
            const detailsArray = formData.details ? formData.details.split("\n").filter((d) => d.trim() !== "") : [];
            submitData.append("details", JSON.stringify(detailsArray));

            const termsArray = formData.terms ? formData.terms.split("\n").filter((t) => t.trim() !== "") : [];
            submitData.append("terms", JSON.stringify(termsArray));

            submitData.append("applicableServiceIds", JSON.stringify(formData.applicableServiceIds));

            // 3. Xử lý ẢNH
            // Nếu người dùng có chọn ảnh MỚI từ máy tính
            if (imageFile) {
                submitData.append("image", imageFile); // Hoặc "banner", "file"... tuỳ tên field backend yêu cầu
            }
            // Nếu đang sửa và người dùng KHÔNG XÓA ảnh cũ (previewImage vẫn còn url)
            else if (currentPromoId && previewImage) {
                // Tùy backend của bạn xử lý, thường thì nếu không gửi file mới, backend tự giữ ảnh cũ.
                // Hoặc bạn phải gửi URL cũ lên lại (submitData.append("bannerImageUrl", previewImage);)
                submitData.append("bannerImageUrl", previewImage);
            }
            // Nếu người dùng cố tình ấn nút [X] Xóa ảnh (previewImage rỗng)
            else if (currentPromoId && !previewImage) {
                submitData.append("bannerImageUrl", ""); // Báo backend xóa ảnh
            }

            // 4. GỌI API (Cần config header multipart/form-data bên trong axiosApi.js)
            let res;
            if (currentPromoId) {
                res = await promotionApi.updatePromotion(currentPromoId, submitData);
            } else {
                res = await promotionApi.createPromotion(submitData);
            }

            if (res && res.success) {
                showToast(currentPromoId ? "Cập nhật thành công!" : "Tạo khuyến mãi thành công!");

                // --- Optimistic Update ---
                const savedPromo = res.data?.promotion || res.data;
                const selectedBranch = branches.find((b) => b._id === formData.branchId) || formData.branchId;

                if (currentPromoId) {
                    setPromotions((prev) =>
                        prev.map((p) => {
                            if (p._id === currentPromoId) {
                                if (savedPromo && savedPromo._id) return savedPromo; // Nếu API trả full object thì dùng luôn

                                // Cập nhật thủ công nếu API không trả về data mới
                                return {
                                    ...p,
                                    ...formData, // Dùng formData thay vì payload
                                    branchId: selectedBranch,
                                    // Nếu có file mới thì tạo url tạm, nếu không thì dùng url cũ/rỗng
                                    bannerImageUrl: imageFile ? URL.createObjectURL(imageFile) : previewImage,
                                    computedStatus: !formData.isActive ? "inactive" : p.computedStatus,
                                };
                            }
                            return p;
                        }),
                    );
                } else {
                    const newPromo =
                        savedPromo && savedPromo._id
                            ? savedPromo
                            : {
                                  _id: Date.now().toString(),
                                  ...formData,
                                  branchId: selectedBranch,
                                  usedCount: 0,
                                  computedStatus: formData.isActive ? "active" : "inactive",
                                  bannerImageUrl: imageFile ? URL.createObjectURL(imageFile) : "",
                              };
                    setPromotions((prev) => [newPromo, ...prev]);
                }
                // -------------------------

                setIsFormModalOpen(false);
            } else {
                showToast(res?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi lưu khuyến mãi", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    // ==========================================
    // HELPER UI
    // ==========================================
    const getStatusBadge = (computedStatus) => {
        switch (computedStatus) {
            case "active":
                return (
                    <span className="category-badge" style={{ backgroundColor: "#dcfce7", color: "#059669", borderColor: "#059669" }}>
                        Đang diễn ra
                    </span>
                );
            case "inactive":
                return (
                    <span className="category-badge" style={{ backgroundColor: "#fee2e2", color: "#dc2626", borderColor: "#dc2626" }}>
                        Tạm dừng
                    </span>
                );
            case "upcoming":
                return (
                    <span className="category-badge" style={{ backgroundColor: "#e0f2fe", color: "#0284c7", borderColor: "#0284c7" }}>
                        Sắp diễn ra
                    </span>
                );
            case "expired":
                return (
                    <span className="category-badge" style={{ backgroundColor: "#f3f4f6", color: "#4b5563", borderColor: "#9ca3af" }}>
                        Đã hết hạn
                    </span>
                );
            default:
                return <span className="category-badge">{computedStatus}</span>;
        }
    };

    const getStatusLabelText = (status) => {
        switch (status) {
            case "active":
                return "Đang diễn ra";
            case "upcoming":
                return "Sắp diễn ra";
            case "expired":
                return "Đã hết hạn";
            case "inactive":
                return "Đã tắt (Tạm dừng)";
            default:
                return "Tất cả trạng thái";
        }
    };

    const formatDiscount = (type, value) => {
        if (type === "percentage") return `${value}%`;
        return `${value.toLocaleString("vi-VN")} đ`;
    };

    // ==========================================
    // RENDER
    // ==========================================
    if (isLoading && promotions.length === 0) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

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
                <h1 className="services-title">Quản lý Khuyến mãi</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Tìm mã hoặc tên khuyến mãi..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    {/* DROPDOWN CUSTOM THAY THẾ CHO SELECT CŨ */}
                    <div className="filter-dropdown-container" style={{ position: "relative", marginLeft: "15px" }}>
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
                                    className={`filter-option ${filterStatus === "active" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("active");
                                        setPage(1);
                                        setShowStatusDropdown(false);
                                    }}
                                >
                                    Đang diễn ra
                                </div>
                                <div
                                    className={`filter-option ${filterStatus === "upcoming" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("upcoming");
                                        setPage(1);
                                        setShowStatusDropdown(false);
                                    }}
                                >
                                    Sắp diễn ra
                                </div>
                                <div
                                    className={`filter-option ${filterStatus === "expired" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("expired");
                                        setPage(1);
                                        setShowStatusDropdown(false);
                                    }}
                                >
                                    Đã hết hạn
                                </div>
                                <div
                                    className={`filter-option ${filterStatus === "inactive" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("inactive");
                                        setPage(1);
                                        setShowStatusDropdown(false);
                                    }}
                                >
                                    Đã tắt (Tạm dừng)
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="add-btn" onClick={openCreateForm} style={{ marginLeft: "15px" }}>
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
                            <th>Mã KM</th>
                            <th>Tên Khuyến Mãi</th>
                            <th>Mức giảm</th>
                            <th>Thời gian áp dụng</th>
                            <th>Đã dùng</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {promotions.map((promo) => (
                            <tr key={promo._id} className="clickable-row" onClick={(e) => openUpdateForm(e, promo._id)}>
                                <td>
                                    <strong style={{ color: "var(--primary-color)" }}>{promo.code}</strong>
                                </td>
                                <td>
                                    <div className="product-name">{promo.name}</div>
                                    <div className="product-desc" style={{ fontSize: "12px" }}>
                                        {promo.branchId?.name || "Tất cả chi nhánh"}
                                    </div>
                                </td>
                                <td>
                                    <strong style={{ color: "#ef4444" }}>{formatDiscount(promo.discountType, promo.discountValue)}</strong>
                                    {promo.maxDiscountAmount && promo.discountType === "percentage" && <div style={{ fontSize: "11px", color: "#6b7280" }}>Tối đa: {promo.maxDiscountAmount.toLocaleString("vi-VN")}đ</div>}
                                </td>
                                <td>
                                    <div style={{ fontSize: "13px" }}>Từ: {new Date(promo.startDate).toLocaleDateString("vi-VN")}</div>
                                    <div style={{ fontSize: "13px", color: "#6b7280" }}>Đến: {new Date(promo.endDate).toLocaleDateString("vi-VN")}</div>
                                </td>
                                <td>
                                    {promo.usedCount || 0} / {promo.usageLimit || "∞"}
                                </td>
                                <td>{getStatusBadge(promo.computedStatus)}</td>
                                <td>
                                    <div className="action-row">
                                        <button className="action-btn btn-default" onClick={(e) => handleToggleStatus(e, promo._id)}>
                                            {promo.isActive ? "Tắt" : "Bật"}
                                        </button>
                                        <button className="action-btn btn-edit" onClick={(e) => openUpdateForm(e, promo._id)}>
                                            Sửa
                                        </button>
                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, promo._id, promo.name, promo.code)}>
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {promotions.length === 0 && !isLoading && <div className="state-message">Không tìm thấy chương trình khuyến mãi nào phù hợp.</div>}
            </div>

            {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: "20px", gap: "10px" }}>
                    <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                        Trang trước
                    </button>
                    <span style={{ padding: "8px 12px", fontWeight: "500" }}>
                        Trang {page} / {totalPages}
                    </span>
                    <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                        Trang sau
                    </button>
                </div>
            )}

            {isFormModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-promotion">
                        <div className="modal-header">
                            <h2>{currentPromoId ? "Cập nhật Khuyến mãi" : "Tạo mới Khuyến mãi"}</h2>
                            <button type="button" className="close-modal-btn" onClick={() => !isSubmitting && setIsFormModalOpen(false)}>
                                ×
                            </button>
                        </div>

                        <form className="modal-form" onSubmit={handleFormSubmit}>
                            <div className="form-grid">
                                <div className="form-column-left">
                                    <h3 className="form-sub-title">Thông tin cơ bản</h3>

                                    <div className="form-group">
                                        <label>
                                            Chi nhánh áp dụng <span className="required">*</span>
                                        </label>
                                        <select name="branchId" required value={formData.branchId} onChange={handleFormChange} disabled={isSubmitting || currentPromoId}>
                                            <option value="">-- Chọn chi nhánh --</option>
                                            {branches.map((b) => (
                                                <option key={b._id} value={b._id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: "flex", gap: "15px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>
                                                Mã KM (Code) <span className="required">*</span>
                                            </label>
                                            <input type="text" name="code" required placeholder="VD: SUMMER2026" value={formData.code} onChange={handleFormChange} disabled={isSubmitting} style={{ textTransform: "uppercase" }} />
                                        </div>
                                        <div className="form-group" style={{ flex: 2 }}>
                                            <label>
                                                Tên Khuyến mãi <span className="required">*</span>
                                            </label>
                                            <input type="text" name="name" required placeholder="VD: Giảm giá hè..." value={formData.name} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Mô tả ngắn gọn</label>
                                        <textarea name="description" rows="2" value={formData.description} onChange={handleFormChange} disabled={isSubmitting}></textarea>
                                    </div>

                                    <h3 className="form-sub-title" style={{ marginTop: "20px" }}>
                                        Thiết lập giảm giá
                                    </h3>

                                    <div style={{ display: "flex", gap: "15px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Loại giảm giá</label>
                                            <select name="discountType" value={formData.discountType} onChange={handleFormChange} disabled={isSubmitting}>
                                                <option value="percentage">Theo phần trăm (%)</option>
                                                <option value="fixed">Số tiền cố định (VNĐ)</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>
                                                Giá trị giảm <span className="required">*</span>
                                            </label>
                                            <input type="number" name="discountValue" required min="1" value={formData.discountValue} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "15px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Giảm tối đa (VNĐ)</label>
                                            <input type="number" name="maxDiscountAmount" placeholder="Để trống = Không giới hạn" value={formData.maxDiscountAmount} onChange={handleFormChange} disabled={isSubmitting || formData.discountType === "fixed"} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Đơn hàng tối thiểu (VNĐ)</label>
                                            <input type="number" name="minOrderValue" value={formData.minOrderValue} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Dịch vụ áp dụng</label>
                                        <div className="checkbox-list-container">
                                            {services.map((s) => (
                                                <label key={s._id} className="checkbox-item">
                                                    <input type="checkbox" checked={formData.applicableServiceIds.includes(s._id)} onChange={() => handleServiceCheckboxChange(s._id)} disabled={isSubmitting} />
                                                    <span>{s.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-column-right-promotion">
                                    <h3 className="form-sub-title">Thời gian & Giới hạn</h3>

                                    <div style={{ display: "flex", gap: "15px", marginTop: "18px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>
                                                Thời gian bắt đầu <span className="required">*</span>
                                            </label>
                                            <input type="datetime-local" name="startDate" required value={formData.startDate} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>
                                                Thời gian kết thúc <span className="required">*</span>
                                            </label>
                                            <input type="datetime-local" name="endDate" required value={formData.endDate} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "15px", marginTop: "18px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Tổng lượt dùng</label>
                                            <input type="number" name="usageLimit" placeholder="∞" min="1" value={formData.usageLimit} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Lượt dùng/Khách</label>
                                            <input type="number" name="limitPerUser" placeholder="∞" min="1" value={formData.limitPerUser} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    <h3 className="form-sub-title" style={{ marginTop: "20px" }}>
                                        Nội dung hiển thị (Giao diện Khách)
                                    </h3>

                                    <div className="form-group" style={{ marginTop: "12px" }}>
                                        <label>Ảnh Banner</label>
                                        <div className="image-upload-container">
                                            {previewImage ? (
                                                <div className="image-preview-box">
                                                    <img src={previewImage} alt="Banner Preview" style={{ maxWidth: "100%", maxHeight: "150px", objectFit: "contain" }} />
                                                    <button type="button" className="remove-img-btn" onClick={removeImage}>
                                                        ×
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="image-upload-btn" onClick={() => fileInputRef.current.click()}>
                                                    <span>+ Tải ảnh</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginTop: "12px" }}>
                                        <label>Nhãn nổi bật (Badge)</label>
                                        <input type="text" name="badgeText" placeholder="VD: HOT, FLASH SALE..." value={formData.badgeText} onChange={handleFormChange} disabled={isSubmitting} />
                                    </div>

                                    <div className="form-group" style={{ marginTop: "12px" }}>
                                        <label>Chi tiết chương trình (Mỗi dòng là 1 ý)</label>
                                        <textarea
                                            name="details"
                                            rows="3"
                                            placeholder="- Ý 1&#10;- Ý 2"
                                            value={formData.details}
                                            onChange={handleFormChange}
                                            disabled={isSubmitting}
                                        ></textarea>
                                    </div>

                                    <div className="form-group" style={{ marginTop: "12px" }}>
                                        <label>Điều khoản sử dụng (Mỗi dòng là 1 ý)</label>
                                        <textarea
                                            name="terms"
                                            rows="3"
                                            placeholder="- Điều khoản 1&#10;- Điều khoản 2"
                                            value={formData.terms}
                                            onChange={handleFormChange}
                                            disabled={isSubmitting}
                                        ></textarea>
                                    </div>

                                    <div className="form-group" style={{ marginTop: "12px", paddingBottom: "18px" }}>
                                        <label>Trạng thái</label>
                                        <select name="isActive" value={formData.isActive.toString()} onChange={handleFormChange} disabled={isSubmitting}>
                                            <option value="true">Bật (Sẽ chạy nếu đến ngày)</option>
                                            <option value="false">Tắt (Tạm dừng/Lưu nháp)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang xử lý..." : "Lưu Khuyến Mãi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-delete">
                        <div className="delete-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </div>
                        <h3 className="delete-header">Xác nhận xóa</h3>
                        <p className="delete-message">
                            Bạn có chắc chắn muốn xóa mã <strong style={{ color: "var(--primary-color)" }}>{promoToDelete?.code}</strong> - <strong>"{promoToDelete?.name}"</strong> không?
                            <span className="delete-warning">Hành động này không thể hoàn tác!</span>
                        </p>
                        <div className="modal-footer-delete">
                            <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
                                Hủy bỏ
                            </button>
                            <button className="btn-danger" onClick={confirmDelete} disabled={isSubmitting}>
                                {isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Promotions;
