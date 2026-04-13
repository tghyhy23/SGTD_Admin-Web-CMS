import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // 🟢 THÊM IMPORT
import { categoryApi } from "../../api/axiosApi";
import defaultImg from "../../assets/images/default_img.png";
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

const FALLBACK_IMAGE = defaultImg;

// Helper lấy danh mục từ LocalStorage
const getActiveCategoryFromStorage = () => {
    try {
        const savedCategory = localStorage.getItem("activeCategory");
        return savedCategory ? JSON.parse(savedCategory) : null;
    } catch (err) {
        return null;
    }
};

const Categories = () => {
    const queryClient = useQueryClient();

    // ==========================================
    // 1. STATE QUẢN LÝ LỌC & UI
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Quản lý Danh mục gốc đang Active
    const [activeParentCategory, setActiveParentCategory] = useState(getActiveCategoryFromStorage());
    const activeParentId = activeParentCategory?._id || null;

    useEffect(() => {
        const handleStorageChange = () => setActiveParentCategory(getActiveCategoryFromStorage());
        window.addEventListener("activeCategoryChanged", handleStorageChange);
        return () => window.removeEventListener("activeCategoryChanged", handleStorageChange);
    }, []);

    // Modals State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editCategoryId, setEditCategoryId] = useState(null);

    const initialForm = { name: "", description: "", categoryId: "" };
    const [formData, setFormData] = useState(initialForm);

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // REACT QUERY: FETCH DỮ LIỆU
    // ==========================================
    const {
        data: categories = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["categories", activeParentId],
        queryFn: async () => {
            if (!activeParentId) return [];
            const res = await categoryApi.getAllCategories({ limit: 100, categoryId: activeParentId });
            if (res && res.success) return res.data.services || [];
            throw new Error("Không thể tải danh sách danh mục.");
        },
        enabled: !!activeParentId,
        staleTime: 5 * 60 * 1000, // Cache 5 phút
    });

    // ==========================================
    // REACT QUERY: MUTATIONS (Không độ trễ)
    // ==========================================

    // 1. XÓA DANH MỤC
    const deleteMutation = useMutation({
        mutationFn: (id) => categoryApi.deleteCategory(id),
        onSuccess: (res, deletedId) => {
            queryClient.setQueryData(["categories", activeParentId], (old) => {
                if (!old) return old;
                return old.filter((cat) => cat._id !== deletedId);
            });
            showToast("Xóa thành công!", "success");
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["categories", activeParentId] });
        },
        onError: (err) => showToast(err.response?.data?.message || "Lỗi xóa danh mục", "error"),
    });

    // 2. ẨN/HIỆN DANH MỤC (Optimistic Update Cực Mượt)
    // const toggleStatusMutation = useMutation({
    //     mutationFn: (id) => categoryApi.toggleStatus(id),
    //     onMutate: async (toggledId) => {
    //         // Hủy các request get đang dở để không ghi đè nhầm
    //         await queryClient.cancelQueries({ queryKey: ["categories", activeParentId] });
    //         const previousCategories = queryClient.getQueryData(["categories", activeParentId]);

    //         // Cập nhật giao diện lập tức: Đảo ngược trạng thái isActive
    //         queryClient.setQueryData(["categories", activeParentId], (old) => {
    //             if (!old) return old;
    //             return old.map(cat => cat._id === toggledId ? { ...cat, isActive: !cat.isActive } : cat);
    //         });

    //         return { previousCategories }; // Lưu lại state cũ để hoàn tác nếu API lỗi
    //     },
    //     onError: (err, toggledId, context) => {
    //         // Trả lại trạng thái cũ nếu API báo lỗi
    //         queryClient.setQueryData(["categories", activeParentId], context.previousCategories);
    //         showToast("Lỗi khi cập nhật trạng thái", "error");
    //     },
    //     onSettled: () => {
    //         // Dù lỗi hay thành công thì cũng đồng bộ lại với Backend
    //         queryClient.invalidateQueries({ queryKey: ["categories", activeParentId] });
    //     }
    // });

    // 3. THÊM / CẬP NHẬT DANH MỤC
    const saveMutation = useMutation({
        mutationFn: ({ isEdit, id, payload }) => (isEdit ? categoryApi.updateCategory(id, payload) : categoryApi.createCategory(payload)),
        onSuccess: (res, variables) => {
            const serverCategory = res.data?.service || res.data;

            queryClient.setQueryData(["categories", activeParentId], (old) => {
                if (!old) return old;
                if (variables.isEdit) {
                    return old.map((cat) => {
                        if (cat._id === variables.id) {
                            return {
                                ...cat,
                                name: formData.name,
                                description: formData.description,
                                // Ưu tiên ảnh vừa up -> ảnh từ server trả về -> ảnh cũ đang có
                                thumbnailUrl: imagePreview || serverCategory?.thumbnailUrl || cat.thumbnailUrl,
                            };
                        }
                        return cat;
                    });
                } else {
                    const newCategory = serverCategory || { ...variables.payload, _id: Date.now().toString(), isActive: true };
                    newCategory.thumbnailUrl = imagePreview || serverCategory?.thumbnailUrl || FALLBACK_IMAGE;
                    return [newCategory, ...old];
                }
            });

            showToast(variables.isEdit ? "Cập nhật thành công!" : "Thêm mới thành công!", "success");
            setIsFormModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["categories", activeParentId] });
        },
        onError: (err) => showToast(err.response?.data?.message || "Lỗi kết nối máy chủ", "error"),
    });

    const isSubmitting = deleteMutation.isPending || saveMutation.isPending;

    // ==========================================
    // HANDLERS
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditCategoryId(null);
        setFormData({ name: "", description: "", categoryId: activeParentId || "" });
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
            categoryId: activeParentId || cat.categoryId?._id || cat.categoryId,
        });
        setImageFile(null);
        setImagePreview(cat.thumbnailUrl || null);
        setIsFormModalOpen(true);
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

    const handleSubmitForm = (e) => {
        e.preventDefault();
        if (!formData.name) return showToast("Vui lòng nhập tên danh mục!", "error");
        if (!formData.categoryId) return showToast("Không tìm thấy Danh mục gốc từ Navbar!", "error");

        // Khởi tạo FormData dùng chung cho cả Create và Update
        const payload = new FormData();
        payload.append("categoryId", formData.categoryId);
        payload.append("name", formData.name);
        payload.append("description", formData.description);

        if (imageFile) {
            // Nếu có tải ảnh mới lên thì đính kèm vào
            payload.append("image", imageFile);
        } else if (!isEditMode) {
            // Chỉ gán ảnh mặc định nếu là Thêm mới và không chọn ảnh
            // (Khi Edit mà không chọn ảnh mới thì cứ để trống, backend sẽ tự hiểu là giữ nguyên ảnh cũ)
            payload.append("thumbnailUrl", FALLBACK_IMAGE);
        }

        saveMutation.mutate({ isEdit: isEditMode, id: editCategoryId, payload });
    };

    const handleDeleteClick = (e, id, name) => {
        e.stopPropagation();
        setCategoryToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    // ==========================================
    // LỌC DỮ LIỆU CỤC BỘ
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

    if (isLoading && !categories.length) return <div className="z-category-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-category-state z-category-error">{error.message}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Danh mục" }]} title={`Quản lí danh mục`} description="Quản lý danh sách các danh mục, loại danh mục của các sản phẩm." />

            <div className="z-category-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-category-header">
                    <h1 className="z-category-title">Danh sách Danh mục</h1>
                </div>

                <div className="z-category-tools">
                    <div className="z-category-search">
                        <input type="text" placeholder="Tìm tên danh mục..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* <div className="z-category-filter">
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
                    </div> */}

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
                                <th>Thông tin Danh mục</th>
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
                                                        {/* <Button variant="outline" onClick={(e) => toggleStatusMutation.mutate(cat._id)} disabled={toggleStatusMutation.isPending}>
                                                            {cat.isActive ? "Ẩn danh mục" : "Hiện danh mục"}
                                                        </Button> */}
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
                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật danh mục" : "Thêm mới danh mục"} size="lg" onSave={handleSubmitForm} saveText={isSubmitting ? "Đang xử lý..." : "Lưu dữ liệu"}>
                    <div className="z-category-form">
                        <div style={{ marginTop: "-15px", paddingBottom: "6px", borderBottom: "1px dashed #e5e7eb" }}>
                            <span style={{ color: "red", fontWeight: "bold", fontSize: "16px" }}>*</span>
                            <span style={{ color: "#6b7280", fontSize: "12px", fontStyle: "italic", marginLeft: "4px" }}>: Các trường có dấu sao là bắt buộc. Vui lòng nhập đầy đủ thông tin.</span>
                        </div>
                        <div className="z-category-form-grid">
                            <div className="z-category-form-column">
                                <div className="z-category-form-group">
                                    <label>Thuộc Phân Loại</label>
                                    <input type="text" value={activeParentCategory?.title || "N/A"} disabled className="z-category-input readonly" style={{ backgroundColor: "#f3f4f6", color: "#12915A", fontWeight: "bold" }} />
                                </div>

                                <div className="z-category-form-group">
                                    <label>
                                        Tên danh mục <span className="z-category-required">*</span>
                                    </label>
                                    <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="z-category-input" placeholder="VD: Bọc răng sứ Cercon" disabled={isSubmitting} required />
                                </div>

                                <div className="z-category-form-group">
                                    <label>Mô tả ngắn</label>
                                    <textarea name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="4" className="z-category-textarea" placeholder="Nhập mô tả (tùy chọn)..." disabled={isSubmitting} />
                                </div>
                            </div>

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
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={() => deleteMutation.mutate(categoryToDelete?.id)} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-category-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xác nhận xóa</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa danh mục <br /> <strong style={{ color: "var(--primary-color)" }}>"{categoryToDelete?.name}"</strong> không?
                        </p>
                        <p style={{ color: "var(--error)", marginTop: "8px", fontSize: "14px" }}>
                            Lưu ý * : Việc xóa danh mục sẽ <b>mất các sản phẩm con</b> thuộc danh mục này
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Categories;
