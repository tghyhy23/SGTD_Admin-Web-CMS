import React, { useEffect, useState, useRef } from "react";
import { bannerApi } from "../../api/axiosApi";
import Modal from "../../components/Modal/Modal";
import "./Banners.css";

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

const FALLBACK_IMG = "https://via.placeholder.com/300x150?text=No+Banner";

// ==========================================
// TỪ ĐIỂN MAP VỊ TRÍ GIAO DIỆN (UI) <-> BACKEND
// ==========================================
const POSITION_LABELS = {
    HERO: "Banner Trang Chủ",
    MIDDLE: "Home Background Trang Chủ",
    BOTTOM: "Banner Trang Khuyến Mãi",
    ABOUT_HERO: "Banner chính Trang Giới Thiệu",
    ABOUT_MIDDLE: "Banner giữa Trang Giới Thiệu",
};

const Banners = () => {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPosition, setFilterPosition] = useState("all");

    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showPositionDropdown, setShowPositionDropdown] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // ==========================================
    // STATE CHO MODAL XÓA
    // ==========================================
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    // ==========================================
    // STATE CHO MODAL THÊM / SỬA (FORM)
    // ==========================================
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editBannerId, setEditBannerId] = useState(null);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);

    // State Form Data
    const initialForm = {
        title: "",
        subtitle: "",
        description: "",
        position: "HERO",
        displayOrder: 0,
        status: "PUBLISHED", // Thêm trường status cho Form
    };
    const [formData, setFormData] = useState(initialForm);

    // State Ảnh (Tối đa 1 ảnh)
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchAllBanners = async () => {
        setIsLoading(true);
        try {
            const res = await bannerApi.getAllBanners({ limit: 100 });
            if (res && res.success) {
                setBanners(res.data.banners || []);
            } else {
                setError("Không thể tải danh sách banner.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách banner:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllBanners();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // XỬ LÝ XÓA (Optimistic Update)
    // ==========================================
    const handleDeleteClick = (e, id, title) => {
        e.stopPropagation();
        setBannerToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!bannerToDelete) return;
        setIsSubmittingDelete(true);
        try {
            const response = await bannerApi.deleteBanner(bannerToDelete.id);
            if (response && response.success) {
                showToast("Xóa banner thành công!", "success");
                setIsDeleteModalOpen(false);
                
                // Cập nhật UI ngay lập tức
                setBanners((prev) => prev.filter((b) => b._id !== bannerToDelete.id));
                setBannerToDelete(null);
            } else {
                showToast(response?.message || "Lỗi xóa banner", "error");
            }
        } catch (error) {
            console.error("Lỗi deleteBanner:", error);
            showToast(error.response?.data?.message || "Không thể xóa banner lúc này", "error");
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    // ==========================================
    // MỞ FORM THÊM / SỬA
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditBannerId(null);
        setFormData(initialForm);
        setImageFile(null);
        setImagePreview(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (e, banner) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditBannerId(banner._id);

        setFormData({
            title: banner.title || "",
            subtitle: banner.subtitle || "",
            description: banner.description || "",
            position: banner.position || "HERO",
            displayOrder: banner.displayOrder || 0,
            status: banner.status || "DRAFT",
        });

        setImageFile(null);
        setImagePreview(banner.imageUrl || null);
        setIsFormModalOpen(true);
    };

    // ==========================================
    // XỬ LÝ NHẬP LIỆU & ẢNH
    // ==========================================
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
        e.target.value = null; // Reset input file
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    // ==========================================
    // SUBMIT CREATE & UPDATE FORM (Optimistic Update)
    // ==========================================
    const handleSubmitForm = async (e) => {
        e.preventDefault();

        if (!formData.title) {
            return showToast("Vui lòng nhập tiêu đề banner!", "error");
        }

        setIsSubmittingForm(true);
        try {
            const submitData = new FormData();
            submitData.append("title", formData.title);
            submitData.append("subtitle", formData.subtitle);
            submitData.append("description", formData.description);
            submitData.append("position", formData.position);
            submitData.append("displayOrder", formData.displayOrder);
            submitData.append("status", formData.status);

            if (imageFile) {
                submitData.append("image", imageFile);
            } else if (!isEditMode) {
                showToast("Vui lòng chọn hình ảnh cho Banner!", "error");
                setIsSubmittingForm(false);
                return;
            }

            let response;
            if (isEditMode) {
                response = await bannerApi.updateBanner(editBannerId, submitData);
            } else {
                response = await bannerApi.createBanner(submitData);
            }

            if (response && response.success) {
                showToast(isEditMode ? "Cập nhật thành công!" : "Thêm mới thành công!", "success");
                
                // CẬP NHẬT UI TRỰC TIẾP
                if (isEditMode) {
                    setBanners(prev => prev.map(b => {
                        if (b._id === editBannerId) {
                            return {
                                ...b,
                                title: formData.title,
                                subtitle: formData.subtitle,
                                description: formData.description,
                                position: formData.position,
                                displayOrder: Number(formData.displayOrder),
                                status: formData.status,
                                imageUrl: imagePreview || b.imageUrl
                            };
                        }
                        return b;
                    }));
                } else {
                    const newBanner = response.data?.banner || response.data || {
                        _id: Date.now().toString(),
                        title: formData.title,
                        subtitle: formData.subtitle,
                        description: formData.description,
                        position: formData.position,
                        displayOrder: Number(formData.displayOrder),
                        status: formData.status,
                        imageUrl: imagePreview || "",
                        createdAt: new Date().toISOString()
                    };
                    setBanners(prev => [newBanner, ...prev]);
                }

                setIsFormModalOpen(false);
                setFormData(initialForm);
                setImageFile(null);
                setImagePreview(null);
            } else {
                showToast(response?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            console.error("Lỗi submit form:", error);
            showToast(error.response?.data?.message || "Lỗi kết nối đến máy chủ", "error");
        } finally {
            setIsSubmittingForm(false);
        }
    };

    // ==========================================
    // CẬP NHẬT TRẠNG THÁI PUBLISHED / DRAFT (Optimistic Update)
    // ==========================================
    const handleTogglePublishStatus = async (e, banner) => {
        e.stopPropagation();

        const newStatus = banner.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        const previousBanners = [...banners];

        // 1. Cập nhật UI trước cho mượt
        setBanners(prev => prev.map(b => b._id === banner._id ? { ...b, status: newStatus } : b));

        try {
            const submitData = new FormData();
            submitData.append("status", newStatus);

            const response = await bannerApi.updateBanner(banner._id, submitData);
            if (response && response.success) {
                showToast(`Đã chuyển sang: ${newStatus === "PUBLISHED" ? "Đã Xuất Bản" : "Bản Nháp"}`, "success");
            } else {
                // Lỗi API -> Hoàn tác
                setBanners(previousBanners);
                showToast("Lỗi khi cập nhật trạng thái", "error");
            }
        } catch (error) {
            // Lỗi mạng -> Hoàn tác
            setBanners(previousBanners);
            console.error("Lỗi cập nhật Publish/Draft:", error);
            showToast("Lỗi kết nối khi cập nhật", "error");
        }
    };

    // ==========================================
    // LỌC DỮ LIỆU BẢNG
    // ==========================================
    const filteredBanners = banners
        .filter((banner) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedTitle = removeVietnameseTones(banner.title);
            const normalizedSubtitle = removeVietnameseTones(banner.subtitle || "");

            const matchesSearch = normalizedTitle.includes(normalizedSearch) || normalizedSubtitle.includes(normalizedSearch);

            let matchesStatus = true;
            if (filterStatus === "published") matchesStatus = banner.status === "PUBLISHED";
            if (filterStatus === "draft") matchesStatus = banner.status === "DRAFT";

            let matchesPosition = true;
            if (filterPosition !== "all") matchesPosition = banner.position === filterPosition;

            return matchesSearch && matchesStatus && matchesPosition;
        })
        .sort((a, b) => {
            // Ưu tiên 1: Sắp xếp theo displayOrder (Thứ tự hiển thị)
            const orderA = a.displayOrder || 0;
            const orderB = b.displayOrder || 0;

            if (orderA !== orderB) {
                return orderA - orderB; // Số nhỏ xếp trước
            }

            // Ưu tiên 2: Nếu displayOrder bằng nhau (vd: cùng là 0), xếp theo Mới Nhất
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA; // Mới tạo xếp trước
        });

    const getStatusLabel = () => {
        if (filterStatus === "published") return "Đã xuất bản";
        if (filterStatus === "draft") return "Bản nháp";
        return "Tất cả trạng thái";
    };

    const getPositionLabel = () => {
        if (filterPosition === "all") return "Tất cả vị trí";
        return POSITION_LABELS[filterPosition] || filterPosition;
    };

    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Banners</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input type="text" placeholder="Tìm tiêu đề banner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* Filter Vị trí */}
                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowPositionDropdown(!showPositionDropdown);
                                setShowFilterDropdown(false);
                            }}
                        >
                            <span>{getPositionLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showPositionDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className={`filter-option ${filterPosition === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterPosition("all");
                                        setShowPositionDropdown(false);
                                    }}
                                >
                                    Tất cả vị trí
                                </div>
                                {Object.entries(POSITION_LABELS).map(([key, label]) => (
                                    <div
                                        key={key}
                                        className={`filter-option ${filterPosition === key ? "active" : ""}`}
                                        onClick={() => {
                                            setFilterPosition(key);
                                            setShowPositionDropdown(false);
                                        }}
                                    >
                                        {label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Filter Trạng thái (Cập nhật thành Publish/Draft) */}
                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowPositionDropdown(false);
                            }}
                        >
                            <span>{getStatusLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showFilterDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className={`filter-option ${filterStatus === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("all");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Tất cả trạng thái
                                </div>
                                <div
                                    className={`filter-option ${filterStatus === "published" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("published");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đã xuất bản (Published)
                                </div>
                                <div
                                    className={`filter-option ${filterStatus === "draft" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("draft");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Bản nháp (Draft)
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="add-btn" onClick={openAddModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                        </svg>
                        <span>Thêm banner</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Hình ảnh Desktop</th>
                            <th>Tiêu đề Banner</th>
                            <th>Vị trí</th>
                            <th>Thứ tự</th>
                            <th>Trạng thái (Status)</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBanners.map((banner, index) => (
                            <tr key={banner._id} className="clickable-row">
                                <td style={{ fontWeight: "bold" }}>{index + 1}</td>
                                <td className="td-image" style={{ width: "150px" }}>
                                    <img
                                        src={banner.imageUrl || FALLBACK_IMG}
                                        alt={banner.title}
                                        style={{ width: "120px", height: "60px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e5e7eb" }}
                                        onError={(e) => {
                                            e.target.src = FALLBACK_IMG;
                                        }}
                                    />
                                </td>
                                <td>
                                    <div className="product-name" style={{ whiteSpace: "normal", WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical" }}>
                                        {banner.title}
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontWeight: "600", color: "#4b5563", backgroundColor: "#f3f4f6", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>{POSITION_LABELS[banner.position] || banner.position || "N/A"}</span>
                                </td>
                                <td>
                                    <span style={{ fontWeight: "bold", color: "#3b82f6", backgroundColor: "#eff6ff", padding: "4px 12px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>{banner.displayOrder || 0}</span>
                                </td>
                                <td>
                                    {/* UI CẬP NHẬT CHO TRẠNG THÁI PUBLISHED / DRAFT */}
                                    <span
                                        className="category-badge"
                                        style={{
                                            backgroundColor: banner.status === "PUBLISHED" ? "#dcfce7" : "#f3f4f6",
                                            color: banner.status === "PUBLISHED" ? "#059669" : "#4b5563",
                                            borderColor: banner.status === "PUBLISHED" ? "#059669" : "#d1d5db",
                                        }}
                                    >
                                        {banner.status === "PUBLISHED" ? "Đã Xuất Bản" : "Bản Nháp"}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-row">
                                        {/* NÚT TOGGLE PUBLISH/DRAFT */}
                                        <button className={`action-btn ${banner.status === "PUBLISHED" ? "btn-toggle-hide" : "btn-toggle-show"}`} onClick={(e) => handleTogglePublishStatus(e, banner)} title={banner.status === "PUBLISHED" ? "Chuyển về Bản Nháp" : "Xuất bản Banner ngay"}>
                                            {banner.status === "PUBLISHED" ? "Nháp" : "Xuất bản"}
                                        </button>

                                        <button className="action-btn btn-edit" onClick={(e) => openEditModal(e, banner)}>
                                            Sửa
                                        </button>

                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, banner._id, banner.title)}>
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredBanners.length === 0 && <div className="state-message">Không tìm thấy banner nào phù hợp.</div>}
            </div>

            {/* ==========================================
                MODAL FORM: THÊM & SỬA BANNER
            ========================================== */}
            <Modal isOpen={isFormModalOpen} onClose={() => !isSubmittingForm && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật Banner" : "Thêm Banner mới"} maxWidth="600px">
                <form onSubmit={handleSubmitForm} className="custom-form">
                    <div className="form-group">
                        <label>
                            Tiêu đề <span style={{ color: "red" }}>*</span>
                        </label>
                        <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Nhập tiêu đề..." required disabled={isSubmittingForm} className="form-input" />
                    </div>

                    <div className="form-group">
                        <label>Phụ đề (Subtitle)</label>
                        <input type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="Nhập phụ đề..." disabled={isSubmittingForm} className="form-input" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div className="form-group">
                            <label>Vị trí (Position)</label>
                            <select name="position" value={formData.position} onChange={handleInputChange} disabled={isSubmittingForm} className="form-input">
                                {Object.entries(POSITION_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Thứ tự hiển thị</label>
                            <input type="number" name="displayOrder" value={formData.displayOrder} onChange={handleInputChange} min="0" disabled={isSubmittingForm} className="form-input" />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                        {/* THÊM TRƯỜNG CHỌN STATUS TRONG FORM */}
                        <div className="form-group">
                            <label>Trạng thái (Status)</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} disabled={isSubmittingForm} className="form-input">
                                <option value="PUBLISHED">Đã Xuất Bản (PUBLISHED)</option>
                                <option value="DRAFT">Bản Nháp (DRAFT)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Mô tả (Description)</label>
                        <textarea style={{ minHeight: "80px" }} name="description" value={formData.description} onChange={handleInputChange} placeholder="Nhập mô tả chi tiết..." rows="3" disabled={isSubmittingForm} className="form-textarea" />
                    </div>

                    <div className="form-group">
                        <label>
                            Hình ảnh Banner Desktop <span style={{ color: "red" }}>*</span>
                        </label>
                        <div className="file-upload-wrapper" style={{ marginTop: "5px" }}>
                            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmittingForm} />

                            {imagePreview ? (
                                <div className="image-preview-box" style={{ position: "relative", width: "200px", height: "100px", border: "1px dashed #d1d5db", borderRadius: "8px", padding: "4px" }}>
                                    <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "4px" }} />
                                    <button type="button" className="x-btn" onClick={removeImage}>
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div className="image-upload-btn" onClick={() => fileInputRef.current.click()} style={{ width: "200px", height: "100px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                    <span>+ Tải ảnh Banner</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer-actions">
                        <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)} disabled={isSubmittingForm}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmittingForm}>
                            {isSubmittingForm ? "Đang xử lý..." : isEditMode ? "Lưu thay đổi" : "Tạo Banner"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL XÓA GIỮ NGUYÊN... */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)} title="Xác nhận xóa" maxWidth="400px">
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <div style={{ marginBottom: "15px" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </div>
                    <h3 className="delete-header">Xác nhận xóa</h3>
                    <p className="delete-message">
                        Bạn có chắc chắn muốn xóa Banner <br />
                        <strong className="delete-product-name">"{bannerToDelete?.title}"</strong> không?
                    </p>
                    <div className="modal-footer-delete">
                        <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmittingDelete}>
                            Hủy bỏ
                        </button>
                        <button className="btn-danger" onClick={confirmDelete} disabled={isSubmittingDelete}>
                            {isSubmittingDelete ? "Đang xóa..." : "Xác nhận xóa"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Banners;