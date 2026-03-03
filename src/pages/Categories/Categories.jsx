import React, { useEffect, useState } from "react";
// Bỏ useNavigate nếu bạn không cần chuyển trang detail nữa, hoặc giữ lại nếu muốn xem chi tiết
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
    // STATE CHO MODAL XÓA
    // ==========================================
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    // ==========================================
    // STATE CHO MODAL THÊM / SỬA (FORM)
    // ==========================================
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    
    // Dữ liệu form
    const [formData, setFormData] = useState({ name: "", description: "" });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // ==========================================
    // FETCH DATA & TOAST
    // ==========================================
    const fetchAllCategories = async () => {
        setIsLoading(true);
        try {
            const res = await categoryApi.getAllCategories({ limit: 100 });
            if (res && res.success) {
                setCategories(res.data.services || []);
            } else {
                setError("Không thể tải danh sách danh mục.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách danh mục:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllCategories();
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
                showToast("Xóa danh mục thành công!", "success");
                setIsDeleteModalOpen(false);
                setCategoryToDelete(null);
                fetchAllCategories();
            } else {
                showToast(response?.message || "Lỗi xóa danh mục", "error");
            }
        } catch (error) {
            console.error("Lỗi deleteCategory:", error);
            showToast(error.response?.data?.message || "Không thể xóa danh mục lúc này", "error");
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    // ==========================================
    // XỬ LÝ THÊM VÀ SỬA (FORM)
    // ==========================================
    const openAddModal = () => {
        setEditingCategory(null);
        setFormData({ name: "", description: "" });
        setImageFile(null);
        setImagePreview(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (e, cat) => {
        e.stopPropagation();
        setEditingCategory(cat);
        setFormData({ name: cat.name || "", description: cat.description || "" });
        setImageFile(null);
        setImagePreview(cat.thumbnailUrl || null);
        setIsFormModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file)); // Tạo URL tạm để preview ảnh
        }
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            showToast("Vui lòng nhập tên danh mục!", "error");
            return;
        }

        setIsSubmittingForm(true);
        try {
            // Tạo FormData (vì API cấu hình multipart/form-data)
            const submitData = new FormData();
            submitData.append("name", formData.name);
            submitData.append("description", formData.description);
            if (imageFile) {
                // Tên field 'image' hoặc 'thumbnailUrl' phụ thuộc vào backend của bạn
                // Thường multer backend hay nhận key là 'image' hoặc 'file'
                submitData.append("image", imageFile); 
            }

            let response;
            if (editingCategory) {
                response = await categoryApi.updateCategory(editingCategory._id, submitData);
                console.log("Response from updateCategory:", response);
            } else {
                // Lưu ý: Nếu create cần categoryId (như code backend Service lúc nãy), bạn cần append thêm categoryId nhé
                response = await categoryApi.createCategory(submitData);
            }

            if (response && response.success) {
                showToast(editingCategory ? "Cập nhật thành công!" : "Thêm mới thành công!", "success");
                setIsFormModalOpen(false);
                fetchAllCategories();
            }
        } catch (error) {
            console.error("Lỗi submit form:", error);
            showToast(error.response?.data?.message || "Có lỗi xảy ra!", "error");
        } finally {
            setIsSubmittingForm(false);
        }
    };

    // ==========================================
    // CÁC LOGIC KHÁC (TOGGLE, LỌC)
    // ==========================================
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
                <h1 className="services-title">Quản lý Danh mục (Categories)</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input type="text" placeholder="Tìm tên danh mục..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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

                    {/* MỞ MODAL THÊM MỚI TẠI ĐÂY */}
                    <button className="add-btn" onClick={openAddModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                            <path d="M5 12h14" /><path d="M12 5v14" />
                        </svg>
                        <span>Thêm danh mục</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Hình đại diện</th>
                            <th>Tên Danh Mục</th>
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
                                        <button className={`action-btn ${cat.isActive ? "btn-toggle-hide" : "btn-toggle-show"}`} onClick={(e) => handleToggleStatus(e, cat._id)} title={cat.isActive ? "Click để ẩn danh mục" : "Click để hiển thị danh mục"}>
                                            {cat.isActive ? "Ẩn" : "Hiện"}
                                        </button>

                                        {/* MỞ MODAL SỬA TẠI ĐÂY */}
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
                {filteredCategories.length === 0 && <div className="state-message">Không tìm thấy danh mục nào phù hợp.</div>}
            </div>

            {/* ==========================================
                MODAL FORM: THÊM & SỬA
            ========================================== */}
            <Modal 
                isOpen={isFormModalOpen} 
                onClose={() => !isSubmittingForm && setIsFormModalOpen(false)} 
                title={editingCategory ? "Cập nhật danh mục" : "Thêm danh mục mới"}
                maxWidth="550px"
            >
                <form onSubmit={handleSubmitForm} className="custom-form">
                    <div className="form-group">
                        <label>Tên danh mục <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleInputChange} 
                            placeholder="Nhập tên danh mục..."
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

                    <div className="form-group">
                        <label>Hình ảnh / Thumbnail</label>
                        <div className="file-upload-wrapper">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageChange}
                                disabled={isSubmittingForm}
                                className="form-file-input"
                            />
                            {imagePreview && (
                                <div className="image-preview-container">
                                    <img src={imagePreview} alt="Preview" className="image-preview" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer-actions">
                        <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)} disabled={isSubmittingForm}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmittingForm}>
                            {isSubmittingForm ? "Đang xử lý..." : (editingCategory ? "Cập nhật" : "Lưu danh mục")}
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
                    <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                        Bạn có chắc chắn muốn xóa danh mục <br />
                        <strong style={{ color: '#111827', fontSize: '16px' }}>"{categoryToDelete?.title}"</strong> không?
                    </p>
                    <p style={{ fontSize: '13px', color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px', margin: '0 0 20px 0' }}>
                        Hành động này không thể hoàn tác!
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmittingDelete} style={{ flex: 1 }}>
                            Hủy bỏ
                        </button>
                        <button className="btn-danger" onClick={confirmDelete} disabled={isSubmittingDelete} style={{ flex: 1 }}>
                            {isSubmittingDelete ? "Đang xóa..." : "Xác nhận xóa"}
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default Categories;