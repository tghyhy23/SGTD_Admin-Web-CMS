import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { categoryApi } from "../../api/axiosApi";
import Modal from "../../components/Modal/Modal";
// import "./Categories.css"; 

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

const FALLBACK_ICON = "https://via.placeholder.com/60?text=Icon";

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const navigate = useNavigate();

    // ==========================================
    // STATE LƯU ID "NHA KHOA" ĐỘNG
    // ==========================================
    const [dynamicNhaKhoaId, setDynamicNhaKhoaId] = useState("");

    // Modal Xóa
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    // Modal Form
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editCategoryId, setEditCategoryId] = useState(null);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    
    // State Form Data
    const initialForm = { name: "", description: "", categoryId: "" };
    const [formData, setFormData] = useState(initialForm);
    
    // ====== ĐÃ GỌN LẠI THÀNH 1 ẢNH DUY NHẤT ======
    const [imageFile, setImageFile] = useState(null); // File upload mới
    const [imagePreview, setImagePreview] = useState(null); // Link hiển thị (ảnh cũ hoặc ảnh mới preview)
    const fileInputRef = useRef(null);

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchAllCategories = async () => {
        setIsLoading(true);
        try {
            const res = await categoryApi.getAllCategories({ limit: 100 });
            if (res && res.success) {
                setCategories(res.data.services || []);
            } else {
                setError("Không thể tải danh sách.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDynamicCategoryId = async () => {
        try {
            const res = await categoryApi.getRealCategories();
            if (res && res.success && res.data.categories) {
                const nhaKhoaCat = res.data.categories.find(
                    cat => cat.title === "Nha Khoa" || cat.name === "Nha Khoa"
                );
                if (nhaKhoaCat) setDynamicNhaKhoaId(nhaKhoaCat._id);
            }
        } catch (error) {
            console.error("Lỗi tìm ID danh mục gốc:", error);
        }
    };

    useEffect(() => {
        fetchAllCategories();
        fetchDynamicCategoryId();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // XỬ LÝ XÓA
    // ==========================================
    const handleDeleteClick = (e, id, title) => {
        e.stopPropagation();
        setCategoryToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        setIsSubmittingDelete(true);
        try {
            const response = await categoryApi.deleteCategory(categoryToDelete.id);
            if (response && response.success) {
                showToast("Xóa thành công!", "success");
                setIsDeleteModalOpen(false);
                setCategoryToDelete(null);
                fetchAllCategories();
            } else {
                showToast(response?.message || "Lỗi xóa", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Không thể xóa lúc này", "error");
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    // ==========================================
    // MỞ FORM THÊM / SỬA
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditCategoryId(null);
        setFormData({ name: "", description: "", categoryId: dynamicNhaKhoaId });
        setImageFile(null);
        setImagePreview(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (e, cat) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditCategoryId(cat._id);
        
        setFormData({ 
            name: cat.name || "", 
            description: cat.description || "",
            categoryId: dynamicNhaKhoaId 
        });
        
        setImageFile(null);
        setImagePreview(cat.thumbnailUrl || null); // Gán ảnh cũ vào thẳng preview
        setIsFormModalOpen(true);
    };

    // ==========================================
    // XỬ LÝ ẢNH
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
    // SUBMIT CREATE & UPDATE
    // ==========================================
    const handleSubmitForm = async (e) => {
        e.preventDefault();
        
        if (!formData.name) {
            return showToast("Vui lòng nhập tên!", "error");
        }

        setIsSubmittingForm(true);
        try {
            let response;

            if (isEditMode) {
                // SỬA: CHỈ GỬI JSON (Vì Backend updateServiceService không nhận file)
                const payload = {
                    name: formData.name,
                    description: formData.description,
                    categoryId: formData.categoryId
                };
                
                response = await categoryApi.updateCategory(editCategoryId, payload);
                
                if (imageFile) {
                    showToast("Tên đã đổi, nhưng Backend hiện không hỗ trợ cập nhật file ảnh mới ở form này!", "success");
                }

            } else {
                // TẠO MỚI: GỬI FORM-DATA
                if (!formData.categoryId) {
                    return showToast("Hệ thống chưa tìm thấy ID Danh Mục Nha Khoa, vui lòng F5 lại trang!", "error");
                }

                const submitData = new FormData();
                submitData.append("categoryId", formData.categoryId);
                submitData.append("name", formData.name);
                submitData.append("description", formData.description);

                if (imageFile) {
                    submitData.append("image", imageFile); 
                }

                response = await categoryApi.createCategory(submitData);
            }

            if (response && response.success) {
                if (!isEditMode || (isEditMode && !imageFile)) {
                    showToast(isEditMode ? "Cập nhật thành công!" : "Thêm mới thành công!", "success");
                }
                setIsFormModalOpen(false);
                setFormData(initialForm);
                setImageFile(null);
                setImagePreview(null);
                await fetchAllCategories();
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

    // TOGGLE STATUS
    const handleToggleStatus = async (e, id) => {
        e.stopPropagation();
        try {
            const response = await categoryApi.toggleStatus(id);
            if (response && response.success) {
                showToast("Cập nhật trạng thái thành công!", "success");
                fetchAllCategories();
            }
        } catch (error) {
            showToast("Lỗi khi cập nhật trạng thái", "error");
        }
    };

    const handleRowClick = (id) => {
        navigate(`/categories/${id}`);
    };

    const filteredCategories = (Array.isArray(categories) ? categories : [])
        .filter((cat) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedTitle = removeVietnameseTones(cat.name || cat.title || "");
            const matchesSearch = normalizedTitle.includes(normalizedSearch);

            let matchesStatus = true;
            if (filterStatus === "active") matchesStatus = cat.isActive === true;
            if (filterStatus === "inactive") matchesStatus = cat.isActive === false;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const getStatusLabel = () => {
        if (filterStatus === "active") return "Đang hoạt động";
        if (filterStatus === "inactive") return "Đang ẩn";
        return "Tất cả trạng thái";
    };

    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>×</button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Danh mục Dịch vụ</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input type="text" placeholder="Tìm tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="filter-dropdown-container">
                        <button className="btn-filter" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                            <span>{getStatusLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showFilterDropdown && (
                            <div className="filter-dropdown-menu">
                                <div className={`filter-option ${filterStatus === "all" ? "active" : ""}`} onClick={() => { setFilterStatus("all"); setShowFilterDropdown(false); }}>Tất cả trạng thái</div>
                                <div className={`filter-option ${filterStatus === "active" ? "active" : ""}`} onClick={() => { setFilterStatus("active"); setShowFilterDropdown(false); }}>Đang hoạt động</div>
                                <div className={`filter-option ${filterStatus === "inactive" ? "active" : ""}`} onClick={() => { setFilterStatus("inactive"); setShowFilterDropdown(false); }}>Đang ẩn</div>
                            </div>
                        )}
                    </div>

                    <button className="add-btn" onClick={openAddModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                            <path d="M5 12h14" /><path d="M12 5v14" />
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
                            <th>Hình đại diện</th>
                            <th>Tên Dịch Vụ</th>
                            <th>Mô tả ngắn</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories.map((cat, index) => (
                            <tr key={cat._id} onClick={() => handleRowClick(cat._id)} className="clickable-row">
                                <td style={{ fontWeight: "bold" }}>{index + 1}</td>
                                
                                <td className="td-image" style={{ width: "100px" }}>
                                    <img
                                        src={cat.thumbnailUrl || FALLBACK_ICON}
                                        alt={cat.name}
                                        style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                                        onError={(e) => { e.target.src = FALLBACK_ICON; }}
                                    />
                                </td>
                                
                                <td>
                                    <div className="product-name" style={{ whiteSpace: "normal", WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", color: "#111827" }}>
                                        {cat.name}
                                    </div>
                                    <div className="product-desc" style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>
                                        Số lượt Book: <strong>{cat.bookingCount || 0}</strong>
                                    </div>
                                </td>
                                
                                <td style={{ maxWidth: '250px' }}>
                                    <div className="product-desc" style={{ whiteSpace: "normal", WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical" }} title={cat.description}>
                                        {cat.description || "Chưa có mô tả"}
                                    </div>
                                </td>
                                
                                <td>
                                    <span
                                        className="category-badge"
                                        style={{
                                            backgroundColor: cat.isActive ? "#dcfce7" : "#fee2e2",
                                            color: cat.isActive ? "#059669" : "#dc2626",
                                            borderColor: cat.isActive ? "#059669" : "#dc2626",
                                        }}
                                    >
                                        {cat.isActive ? "Đang hoạt động" : "Đang ẩn"}
                                    </span>
                                </td>
                                
                                <td>
                                    <div className="action-row">
                                        <button className={`action-btn ${cat.isActive ? "btn-toggle-hide" : "btn-toggle-show"}`} onClick={(e) => handleToggleStatus(e, cat._id)} title={cat.isActive ? "Click để đổi trạng thái" : "Click để hiển thị"}>
                                            {cat.isActive ? "Ẩn" : "Hiện"}
                                        </button>

                                        <button className="action-btn btn-edit" onClick={(e) => openEditModal(e, cat)}>
                                            Sửa
                                        </button>

                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, cat._id, cat.name)}>
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCategories.length === 0 && <div className="state-message">Không tìm thấy dữ liệu nào phù hợp.</div>}
            </div>

            {/* ==========================================
                MODAL FORM: THÊM & SỬA
            ========================================== */}
            <Modal 
                isOpen={isFormModalOpen} 
                onClose={() => !isSubmittingForm && setIsFormModalOpen(false)} 
                title={isEditMode ? "Cập nhật danh mục" : "Thêm mới danh mục"}
                maxWidth="550px"
            >
                <form onSubmit={handleSubmitForm} className="custom-form">
                    
                    {/* TRƯỜNG CATEGORY ĐƯỢC HIỂN THỊ CỨNG CHỮ "NHA KHOA" TRÊN UI */}
                    {!isEditMode && (
                        <div className="form-group">
                            <label>Thuộc module (Mặc định)</label>
                            <input 
                                type="text" 
                                value="Nha Khoa" 
                                disabled
                                className="form-input"
                                style={{ backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', fontWeight: 'bold' }}
                            />
                            {!dynamicNhaKhoaId && <small style={{color: 'orange'}}>Đang tải cấu hình module...</small>}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Tên danh mục <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleInputChange} 
                            placeholder="Nhập tên..."
                            required
                            disabled={isSubmittingForm}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Mô tả ngắn</label>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleInputChange} 
                            placeholder="Nhập mô tả..."
                            rows="4"
                            disabled={isSubmittingForm}
                            className="form-textarea"
                        />
                    </div>

                    {/* GIAO DIỆN UPLOAD 1 ẢNH GỌN GÀNG */}
                    <div className="form-group">
                        <label>Hình đại diện (1 ảnh duy nhất)</label>
                        <div className="file-upload-wrapper" style={{ marginTop: '5px' }}>
                            <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRef} 
                                style={{ display: "none" }} 
                                onChange={handleImageChange} 
                                disabled={isSubmittingForm}
                            />

                            {imagePreview ? (
                                <div className="image-preview-box" style={{ position: 'relative', width: '100px', height: '100px', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '4px' }}>
                                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}/>
                                    <button 
                                        type="button" 
                                        onClick={removeImage}
                                        className="x-btn"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div 
                                    className="image-upload-btn" 
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <span>+ Tải ảnh</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer-actions">
                        <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)} disabled={isSubmittingForm}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmittingForm || (!isEditMode && !dynamicNhaKhoaId)}>
                            {isSubmittingForm ? "Đang xử lý..." : (isEditMode ? "Lưu thay đổi" : "Tạo mới")}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ==========================================
                MODAL XÁC NHẬN XÓA
            ========================================== */}
            <Modal 
                isOpen={isDeleteModalOpen} 
                onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)}
                title="Xác nhận xóa"
                maxWidth="400px"
            >
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                            <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </div>
                    <h3 className="delete-header">Xác nhận xóa</h3>
                    <p className="delete-message">
                        Bạn có chắc chắn muốn xóa <br />
                        <strong className="delete-product-name">"{categoryToDelete?.title}"</strong> không?
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

export default Categories;