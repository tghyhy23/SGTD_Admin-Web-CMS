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
    // ==========================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ==========================================
    const [categories, setCategories] = useState([]); // Đây thực chất là các Services thuộc Category mẹ
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const navigate = useNavigate();

    // Lưu thông tin Category mẹ đang được chọn từ Navbar
    const [activeParentCategory, setActiveParentCategory] = useState(null);

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
    
    // ====== XỬ LÝ ẢNH ======
    const [imageFile, setImageFile] = useState(null); 
    const [imagePreview, setImagePreview] = useState(null); 
    const fileInputRef = useRef(null);

    // ==========================================
    // 2. FETCH DATA (Dựa trên Category đang chọn từ Navbar)
    // ==========================================
    const fetchServicesByCategory = async () => {
        setIsLoading(true);
        try {
            // Lấy Category đang chọn từ LocalStorage (do Navbar set)
            const savedCategory = localStorage.getItem('activeCategory');
            let parentId = null;
            
            if (savedCategory) {
                const parsed = JSON.parse(savedCategory);
                setActiveParentCategory(parsed);
                parentId = parsed._id;
            }

            // Gọi API lấy danh sách Service, truyền kèm categoryId để lọc
            // Backend của bạn cần nhận params { categoryId }
            const res = await categoryApi.getAllCategories({ 
                limit: 100, 
                categoryId: parentId 
            });

            if (res && res.success) {
                setCategories(res.data.services || []);
            } else {
                setError("Không thể tải danh sách dịch vụ.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchServicesByCategory();

        // Lắng nghe sự kiện storage nếu user đổi category ở tab khác (tùy chọn)
        const handleStorageChange = () => fetchServicesByCategory();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // 3. XỬ LÝ XÓA
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
                setCategories((prev) => prev.filter((cat) => cat._id !== categoryToDelete.id));
                setCategoryToDelete(null);
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
    // 4. MỞ FORM THÊM / SỬA (Tự động gán categoryId)
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditCategoryId(null);
        // Tự động lấy ID từ activeParentCategory đang chọn trên Navbar
        setFormData({ 
            name: "", 
            description: "", 
            categoryId: activeParentCategory?._id || "" 
        });
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
            categoryId: activeParentCategory?._id || cat.categoryId?._id || cat.categoryId
        });
        
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
            setImagePreview(URL.createObjectURL(file));
        }
        e.target.value = null; 
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    // ==========================================
    // 5. SUBMIT FORM
    // ==========================================
    const handleSubmitForm = async (e) => {
        e.preventDefault();
        
        if (!formData.name) return showToast("Vui lòng nhập tên!", "error");
        if (!formData.categoryId) return showToast("Không tìm thấy Danh mục gốc từ Navbar!", "error");

        setIsSubmittingForm(true);
        try {
            let response;
            if (isEditMode) {
                // Backend của bạn dùng JSON cho update
                response = await categoryApi.updateCategory(editCategoryId, formData);
            } else {
                // Backend của bạn dùng FormData cho create
                const submitData = new FormData();
                submitData.append("categoryId", formData.categoryId);
                submitData.append("name", formData.name);
                submitData.append("description", formData.description);
                if (imageFile) submitData.append("image", imageFile);

                response = await categoryApi.createCategory(submitData);
            }

            if (response && response.success) {
                showToast(isEditMode ? "Cập nhật thành công!" : "Thêm mới thành công!", "success");

                if (isEditMode) {
                    setCategories((prev) => 
                        prev.map((cat) => 
                            cat._id === editCategoryId 
                                ? { ...cat, name: formData.name, description: formData.description } 
                                : cat
                        )
                    );
                } else {
                    const newCategory = response.data?.service || response.data;
                    setCategories((prev) => [newCategory, ...prev]);
                }

                setIsFormModalOpen(false);
                setImageFile(null);
                setImagePreview(null);
            } else {
                showToast(response?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi kết nối", "error");
        } finally {
            setIsSubmittingForm(false);
        }
    };

    const handleToggleStatus = async (e, id) => {
        e.stopPropagation();
        const originalCategories = [...categories];
        setCategories((prev) => 
            prev.map((cat) => cat._id === id ? { ...cat, isActive: !cat.isActive } : cat)
        );

        try {
            const response = await categoryApi.toggleStatus(id);
            if (!response || !response.success) {
                setCategories(originalCategories);
                showToast("Lỗi khi cập nhật trạng thái", "error");
            }
        } catch (error) {
            setCategories(originalCategories);
            showToast("Lỗi kết nối", "error");
        }
    };

    // ==========================================
    // 6. FILTER LOGIC
    // ==========================================
    const filteredCategories = categories.filter((cat) => {
        const normalizedSearch = removeVietnameseTones(searchTerm);
        const normalizedTitle = removeVietnameseTones(cat.name || "");
        const matchesSearch = normalizedTitle.includes(normalizedSearch);

        let matchesStatus = true;
        if (filterStatus === "active") matchesStatus = cat.isActive === true;
        if (filterStatus === "inactive") matchesStatus = cat.isActive === false;

        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>×</button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Dịch vụ: {activeParentCategory?.title || "N/A"}</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input type="text" placeholder="Tìm tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="filter-dropdown-container">
                        <button className="btn-filter" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                            <span>{filterStatus === "active" ? "Đang hoạt động" : filterStatus === "inactive" ? "Đang ẩn" : "Tất cả trạng thái"}</span>
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
                            <tr key={cat._id} onClick={(e) => openEditModal(e, cat)} className="clickable-row">
                                <td style={{ fontWeight: "bold" }}>{index + 1}</td>
                                <td className="td-image">
                                    <img
                                        src={cat.thumbnailUrl || FALLBACK_ICON}
                                        alt={cat.name}
                                        style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                                        onError={(e) => { e.target.src = FALLBACK_ICON; }}
                                    />
                                </td>
                                <td>
                                    <div className="product-name" style={{ color: "#111827" }}>{cat.name}</div>
                                    <div className="product-desc" style={{ fontSize: "12px" }}>Bookings: {cat.bookingCount || 0}</div>
                                </td>
                                <td style={{ maxWidth: '250px' }}>
                                    <div className="product-desc" style={{ WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                        {cat.description || "Chưa có mô tả"}
                                    </div>
                                </td>
                                <td>
                                    <span className="category-badge" style={{ backgroundColor: cat.isActive ? "#dcfce7" : "#fee2e2", color: cat.isActive ? "#059669" : "#dc2626" }}>
                                        {cat.isActive ? "Đang hoạt động" : "Đang ẩn"}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-row">
                                        <button className="action-btn btn-edit" onClick={(e) => openEditModal(e, cat)}>Sửa</button>
                                        <button className={`action-btn ${cat.isActive ? "btn-secondary" : "btn-primary"}`} onClick={(e) => handleToggleStatus(e, cat._id)}>
                                            {cat.isActive ? "Ẩn" : "Hiện"}
                                        </button>
                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, cat._id, cat.name)}>Xóa</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCategories.length === 0 && <div className="state-message">Không có dữ liệu trong mục {activeParentCategory?.title}.</div>}
            </div>

            {/* MODAL FORM */}
            <Modal 
                isOpen={isFormModalOpen} 
                onClose={() => !isSubmittingForm && setIsFormModalOpen(false)} 
                title={isEditMode ? "Cập nhật dịch vụ" : "Thêm mới dịch vụ"}
                maxWidth="550px"
            >
                <form onSubmit={handleSubmitForm} className="custom-form">
                    <div className="form-group">
                        <label>Thuộc danh mục (Đang chọn từ Navbar)</label>
                        <input 
                            type="text" 
                            value={activeParentCategory?.title || "N/A"} 
                            disabled 
                            className="form-input"
                            style={{ backgroundColor: '#f3f4f6', color: '#12915A', fontWeight: 'bold' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Tên dịch vụ <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="form-input" />
                    </div>

                    <div className="form-group">
                        <label>Mô tả ngắn</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" className="form-textarea" />
                    </div>

                    <div className="form-group">
                        <label>Hình đại diện</label>
                        <div className="file-upload-wrapper">
                            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} />
                            {imagePreview ? (
                                <div className="image-preview-box">
                                    <img src={imagePreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover' }}/>
                                    <button type="button" onClick={removeImage} className="x-btn">×</button>
                                </div>
                            ) : (
                                <div className="image-upload-btn" onClick={() => fileInputRef.current.click()}>+ Tải ảnh</div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer-actions">
                        <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)}>Hủy bỏ</button>
                        <button type="submit" className="btn-primary" disabled={isSubmittingForm}>
                            {isSubmittingForm ? "Đang xử lý..." : "Lưu dữ liệu"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL XÓA */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xác nhận xóa">
                <div style={{ textAlign: 'center' }}>
                    <h3 className="delete-header">Bạn có chắc chắn muốn xóa "{categoryToDelete?.title}"?</h3>
                    <div className="modal-footer-delete">
                        <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Hủy bỏ</button>
                        <button className="btn-danger" onClick={confirmDelete} disabled={isSubmittingDelete}>Xác nhận xóa</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Categories;