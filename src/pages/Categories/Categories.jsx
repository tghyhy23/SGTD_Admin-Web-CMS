import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { categoryApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import { AddButton, EditButton, DeleteButton, Button } from "../../ui/Button/Button";
import "./Categories.css";

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

const FALLBACK_IMAGE = "https://via.placeholder.com/150";

const Categories = () => {
    // ==========================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ==========================================
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const navigate = useNavigate();

    const [activeParentCategory, setActiveParentCategory] = useState(null);

    // Modal Xóa
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    // Modal Form
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editCategoryId, setEditCategoryId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State Form Data
    const initialForm = { name: "", description: "", categoryId: "" };
    const [formData, setFormData] = useState(initialForm);

    // ====== XỬ LÝ ẢNH ======
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // ==========================================
    // 2. FETCH DATA
    // ==========================================
    const fetchServicesByCategory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const savedCategory = localStorage.getItem("activeCategory");
            let parentId = null;

            if (savedCategory) {
                const parsed = JSON.parse(savedCategory);
                setActiveParentCategory(parsed);
                parentId = parsed._id;
            }

            if (!parentId) {
                setCategories([]);
                setIsLoading(false);
                return;
            }

            const res = await categoryApi.getAllCategories({
                limit: 100,
                categoryId: parentId,
            });

            if (res && res.success) {
                setCategories(res.data.services || []);
            } else {
                setError("Không thể tải danh sách dịch vụ.");
            }
        } catch (err) {
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Tải lần đầu khi vào trang
        fetchServicesByCategory();

        // 🟢 Hàm xử lý khi có tín hiệu đổi Category
        const handleCategoryChange = () => fetchServicesByCategory();

        // 🟢 Lắng nghe sự kiện mình vừa tạo ở Navbar
        window.addEventListener("activeCategoryChanged", handleCategoryChange);

        // Dọn dẹp bộ nhớ khi rời khỏi trang
        return () => window.removeEventListener("activeCategoryChanged", handleCategoryChange);
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // 3. XỬ LÝ XÓA
    // ==========================================
    const handleDeleteClick = (e, id, name) => {
        e.stopPropagation();
        setCategoryToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        setIsSubmitting(true);
        try {
            const response = await categoryApi.deleteCategory(categoryToDelete.id);
            if (response && response.success) {
                showToast("Xóa thành công!", "success");
                setCategories((prev) => prev.filter((cat) => cat._id !== categoryToDelete.id));
                setIsDeleteModalOpen(false);
                setCategoryToDelete(null);
            } else {
                showToast(response?.message || "Lỗi xóa", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Không thể xóa lúc này", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 4. MỞ FORM THÊM / SỬA
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditCategoryId(null);
        setFormData({
            name: "",
            description: "",
            categoryId: activeParentCategory?._id || "",
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
            categoryId: activeParentCategory?._id || cat.categoryId?._id || cat.categoryId,
        });

        setImageFile(null);
        setImagePreview(cat.thumbnailUrl || null);
        setIsFormModalOpen(true);
    };

    // Xử lý Input Form
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
        if (!formData.name) return showToast("Vui lòng nhập tên dịch vụ!", "error");
        if (!formData.categoryId) return showToast("Không tìm thấy Danh mục gốc từ Navbar!", "error");

        setIsSubmitting(true);
        try {
            let response;
            if (isEditMode) {
                // Update
                response = await categoryApi.updateCategory(editCategoryId, formData);
                // Giả định API cho update hình ảnh sau (nếu có)
            } else {
                // Create
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
                    setCategories((prev) => prev.map((cat) => (cat._id === editCategoryId ? { ...cat, name: formData.name, description: formData.description, thumbnailUrl: imagePreview || cat.thumbnailUrl } : cat)));
                } else {
                    const newCategory = response.data?.service || response.data;
                    if (imagePreview) newCategory.thumbnailUrl = imagePreview;
                    setCategories((prev) => [newCategory, ...prev]);
                }

                setIsFormModalOpen(false);
            } else {
                showToast(response?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi kết nối máy chủ", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (e, id) => {
        e.stopPropagation();
        const originalCategories = [...categories];
        setCategories((prev) => prev.map((cat) => (cat._id === id ? { ...cat, isActive: !cat.isActive } : cat)));

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
    // 6. LỌC DỮ LIỆU & UI OPTIONS
    // ==========================================
    const filteredCategories = categories
        .filter((cat) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedTitle = removeVietnameseTones(cat.name || "");
            const matchesSearch = normalizedTitle.includes(normalizedSearch);

            let matchesStatus = true;
            if (filterStatus === "active") matchesStatus = cat.isActive === true;
            if (filterStatus === "inactive") matchesStatus = cat.isActive === false;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const getFilterLabel = () => {
        if (filterStatus === "active") return "Đang hoạt động";
        if (filterStatus === "inactive") return "Đang ẩn";
        return "Tất cả trạng thái";
    };

    if (isLoading) return <div className="z-category-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-category-state z-category-error">{error}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Dịch vụ" }]} title={`Quản lí danh mục`} description="Quản lý danh sách các danh mục, loại dịch vụ của các sản phẩm." />

            <div className="z-category-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-category-header">
                    <h1 className="z-category-title">Danh sách Dịch vụ</h1>
                </div>

                <div className="z-category-tools">
                    <div className="z-category-search">
                        <input type="text" placeholder="Tìm tên dịch vụ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="z-category-filter">
                        <button className="z-category-btn-filter" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                            <span>{getFilterLabel()}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showFilterDropdown && (
                            <div className="z-category-dropdown-menu">
                                <div
                                    className={`z-category-dropdown-item ${filterStatus === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("all");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Tất cả trạng thái
                                </div>
                                <div
                                    className={`z-category-dropdown-item ${filterStatus === "active" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("active");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang hoạt động
                                </div>
                                <div
                                    className={`z-category-dropdown-item ${filterStatus === "inactive" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("inactive");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang ẩn
                                </div>
                            </div>
                        )}
                    </div>

                    <AddButton onClick={openAddModal} style={{ marginLeft: "auto" }}>
                        Thêm mới
                    </AddButton>
                </div>

                <div className="z-category-table-wrapper">
                    <table className="z-category-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Hình ảnh</th>
                                <th>Thông tin Dịch vụ</th>
                                <th>Lượt đặt</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="z-category-state">Không tìm thấy dữ liệu phù hợp.</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((cat, index) => (
                                    <tr key={cat._id} onClick={(e) => openEditModal(e, cat)}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <img
                                                src={cat.thumbnailUrl || FALLBACK_IMAGE}
                                                alt={cat.name}
                                                className="z-category-img-preview"
                                                onError={(e) => {
                                                    e.target.src = FALLBACK_IMAGE;
                                                }}
                                            />
                                        </td>
                                        <td style={{ maxWidth: "300px" }}>
                                            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>{cat.name}</div>
                                            <div className="z-category-text-clamp" title={cat.description}>
                                                {cat.description || "Chưa có mô tả"}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: "500", color: "#374151" }}>{cat.bookingCount || 0}</span>
                                        </td>
                                        <td>{cat.isActive ? <span className="z-category-badge-active">Đang hoạt động</span> : <span className="z-category-badge-inactive">Đang ẩn</span>}</td>
                                        <td>
                                            <div className="z-category-actions" onClick={(e) => e.stopPropagation()}>
                                                <div className="z-category-dropdown-actions">
                                                    <button className="z-category-more-btn">
                                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                            <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                        </svg>
                                                    </button>
                                                    <div className="z-category-action-menu">
                                                        <EditButton onClick={(e) => openEditModal(e, cat)} />
                                                        <Button variant="outline" onClick={(e) => handleToggleStatus(e, cat._id)}>
                                                            {cat.isActive ? "Ẩn dịch vụ" : "Hiện dịch vụ"}
                                                        </Button>
                                                        <DeleteButton onClick={(e) => handleDeleteClick(e, cat._id, cat.name)} />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- MODAL FORM --- */}
                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật dịch vụ" : "Thêm mới dịch vụ"} size="lg" onSave={handleSubmitForm} saveText={isSubmitting ? "Đang xử lý..." : "Lưu dữ liệu"}>
                    <div className="z-category-form">
                        <div className="z-category-form-grid">
                            {/* CỘT TRÁI */}
                            <div className="z-category-form-column">
                                <div className="z-category-form-group">
                                    <label>Thuộc Danh mục (Từ Navbar)</label>
                                    <input type="text" value={activeParentCategory?.title || "N/A"} disabled className="z-category-input readonly" style={{ backgroundColor: "#f3f4f6", color: "#12915A", fontWeight: "bold" }} />
                                </div>

                                <div className="z-category-form-group">
                                    <label>
                                        Tên dịch vụ <span className="z-category-required">*</span>
                                    </label>
                                    <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="z-category-input" placeholder="VD: Bọc răng sứ Cercon" disabled={isSubmitting} required />
                                </div>

                                <div className="z-category-form-group">
                                    <label>Mô tả ngắn</label>
                                    <textarea name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="4" className="z-category-textarea" placeholder="Nhập mô tả (tùy chọn)..." disabled={isSubmitting} />
                                </div>
                            </div>

                            {/* CỘT PHẢI */}
                            <div className="z-category-form-column">
                                <h3 className="z-category-form-section-title">Thư viện Ảnh</h3>
                                <div className="z-category-form-group">
                                    <label>Hình đại diện (1 ảnh duy nhất)</label>
                                    <div className="z-category-upload-wrapper">
                                        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />

                                        {imagePreview ? (
                                            <div className="z-category-image-box">
                                                <img src={imagePreview} alt="Preview" className="z-category-preview-img" />
                                                <button type="button" className="z-category-remove-img-btn" onClick={removeImage}>
                                                    ×
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="z-category-add-img-btn" onClick={() => fileInputRef.current.click()}>
                                                + Tải ảnh
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* --- MODAL XÓA --- */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={confirmDelete} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-category-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xác nhận xóa</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa dịch vụ <br /> <strong style={{ color: "var(--primary-color)" }}>"{categoryToDelete?.name}"</strong> không?
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Categories;
