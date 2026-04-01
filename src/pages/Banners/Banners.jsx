import React, { useEffect, useState, useRef } from "react";
import { bannerApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // 🟢 THÊM IMPORT

import { Button, AddButton, EditButton, DeleteButton } from "../../ui/Button/Button";
import { Select } from "../../ui/Select/Select";
import "./Banners.css";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";

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

const POSITION_LABELS = {
    MIDDLE: "Background Trang Chủ",
    BOTTOM: "Trang Khuyến Mãi",
    ABOUT_HERO: "Trang Giới Thiệu (lớn)",
    ABOUT_MIDDLE: "Trang Giới Thiệu (nhỏ)",
    EDU: "SGTD EDU",
    MEKONG: "Mekong",
    PCDA: "PDCA",
};

const DEFAULT_LINKS = {
    MIDDLE: "/(tabs)/index",
    BOTTOM: "/promotion/Promotions", 
    ABOUT_HERO: "/dentistry/Intro",
    ABOUT_MIDDLE: "/dentistry/Intro",
    EDU: "/intro/SGTD", 
    MEKONG: "/intro/Mekong", 
    PCDA: "/intro/PDCA", 
};

const LINK_LABELS = {
    "/(tabs)/index": "Trang Chủ",
    "/promotion/Promotions": "Trang Khuyến Mãi",
    "/dentistry/Intro": "Trang Giới Thiệu",
    "/intro/SGTD": "Trang Giới Thiệu Sài Gòn Tâm Đức Education",
    "/intro/Mekong": "Trang Giới Thiệu Mekong",
    "/intro/PDCA": "Trang Giới Thiệu PDCA",
};

const positionOptions = Object.entries(POSITION_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
}));

const statusOptions = [
    { value: "PUBLISHED", label: "Đang hoạt động" },
    { value: "DRAFT", label: "Đang ẩn" },
];

const Banners = () => {
    const queryClient = useQueryClient(); // Dùng để can thiệp cache

    // UI States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPosition, setFilterPosition] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editBannerId, setEditBannerId] = useState(null);

    const initialForm = {
        title: "", subtitle: "", description: "", position: "MIDDLE", displayOrder: 0, status: "PUBLISHED",
    };
    const [formData, setFormData] = useState(initialForm);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // ==========================================
    // 1. DÙNG USEQUERY THAY CHO USEEFFECT ĐỂ FETCH DATA
    // ==========================================
    const { data: banners = [], isLoading, error } = useQuery({
        queryKey: ["banners"],
        queryFn: async () => {
            const res = await bannerApi.getAllBanners({ limit: 100 });
            if (res && res.success) return res.data.banners || [];
            throw new Error("Không thể tải danh sách banner.");
        },
        staleTime: 5 * 60 * 1000 // Cache dữ liệu 5 phút
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterPosition]);

    // ==========================================
    // 2. DÙNG USEMUTATION ĐỂ XỬ LÝ API (THÊM/SỬA/XÓA)
    // ==========================================

    // Mutation Thêm / Sửa Banner
    const saveBannerMutation = useMutation({
        mutationFn: ({ id, submitData }) => id ? bannerApi.updateBanner(id, submitData) : bannerApi.createBanner(submitData),
        onSuccess: (res, variables) => {
            const updatedBanner = res.data?.banner || res.data || res;
            
            // Cập nhật Cache UI ngay lập tức
            queryClient.setQueryData(["banners"], (old) => {
                if (!old) return [];
                if (variables.id) {
                    return old.map(b => b._id === variables.id ? { ...b, ...updatedBanner } : b);
                }
                return [updatedBanner, ...old];
            });

            setToast({ show: true, message: variables.id ? "Cập nhật thành công!" : "Thêm mới thành công!", type: "success" });
            setIsFormModalOpen(false);
        },
        onError: (err) => {
            console.error("Lỗi submit form:", err);
            const serverMessage = err.response?.data?.message;
            const isSizeError = err.response?.status === 413 || (serverMessage && serverMessage.toLowerCase().includes("large"));
            setToast({
                show: true,
                message: isSizeError ? "Kích thước ảnh quá lớn! Vui lòng chọn ảnh có dung lượng nhỏ hơn." : serverMessage || "Có lỗi xảy ra!",
                type: "error",
            });
        }
    });

    // Mutation Xóa Banner
    const deleteBannerMutation = useMutation({
        mutationFn: (id) => bannerApi.deleteBanner(id),
        onSuccess: (res, deletedId) => {
            queryClient.setQueryData(["banners"], (old) => old.filter(b => b._id !== deletedId));
            setToast({ show: true, message: "Xóa banner thành công!", type: "success" });
            setIsDeleteModalOpen(false);
            setBannerToDelete(null);
        },
        onError: (err) => {
            setToast({ show: true, message: err.response?.data?.message || "Không thể xóa banner lúc này", type: "error" });
        }
    });

    // Mutation Đổi trạng thái (Optimistic Update)
    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, submitData }) => bannerApi.updateBanner(id, submitData),
        onMutate: async ({ id, newStatus }) => {
            await queryClient.cancelQueries({ queryKey: ["banners"] });
            const previousBanners = queryClient.getQueryData(["banners"]);

            // Đổi UI ngay lập tức trước khi gọi API
            queryClient.setQueryData(["banners"], (old) =>
                old.map(b => b._id === id ? { ...b, status: newStatus } : b)
            );
            return { previousBanners };
        },
        onSuccess: (_, variables) => {
            setToast({ show: true, message: `Đã chuyển sang: ${variables.newStatus === "PUBLISHED" ? "Đang hoạt động" : "Đang ẩn"}`, type: "success" });
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(["banners"], context.previousBanners); // Rollback nếu lỗi
            setToast({ show: true, message: err.response?.data?.message || "Lỗi khi cập nhật trạng thái", type: "error" });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["banners"] }) // Đồng bộ ngầm lại để chắc chắn
    });

    const isSubmitting = saveBannerMutation.isPending || deleteBannerMutation.isPending || toggleStatusMutation.isPending;

    // ==========================================
    // 3. UI HANDLERS
    // ==========================================
    const handleDeleteClick = (e, id, title) => {
        e.stopPropagation();
        setBannerToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (bannerToDelete) deleteBannerMutation.mutate(bannerToDelete.id);
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setEditBannerId(null);
        setFormData({ ...initialForm, position: filterPosition === "all" ? "MIDDLE" : filterPosition });
        setImageFile(null);
        setImagePreview(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (e, banner) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditBannerId(banner._id);
        setFormData({
            title: banner.title || "", subtitle: banner.subtitle || "", description: banner.description || "",
            position: banner.position || "MIDDLE", displayOrder: banner.displayOrder || 0, status: banner.status || "DRAFT",
        });
        setImageFile(null);
        setImagePreview(banner.imageUrl || null);
        setIsFormModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
        e.target.value = null;
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSaveBanner = () => {
        if (!formData.title) return setToast({ show: true, message: "Vui lòng nhập tiêu đề!", type: "error" });

        const submitData = new FormData();
        submitData.append("title", formData.title);
        submitData.append("subtitle", formData.subtitle);
        submitData.append("description", formData.description);
        submitData.append("position", formData.position);
        submitData.append("buttonLink", DEFAULT_LINKS[formData.position] || "");
        submitData.append("displayOrder", formData.displayOrder);
        submitData.append("status", formData.status);

        if (imageFile) {
            submitData.append("image", imageFile);
        } else if (!isEditMode) {
            return setToast({ show: true, message: "Vui lòng chọn hình ảnh cho Banner!", type: "error" });
        }

        saveBannerMutation.mutate({ id: isEditMode ? editBannerId : null, submitData });
    };

    const handleTogglePublishStatus = (e, banner) => {
        e.stopPropagation();
        const newStatus = banner.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        const submitData = new FormData();
        submitData.append("status", newStatus);
        
        toggleStatusMutation.mutate({ id: banner._id, submitData, newStatus });
    };

    // ==========================================
    // 4. LỌC & RENDER UI
    // ==========================================
    const allFilteredBanners = banners
        .filter((banner) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedTitle = removeVietnameseTones(banner.title);
            const matchesSearch = normalizedTitle.includes(normalizedSearch);
            let matchesStatus = true;
            if (filterStatus === "published") matchesStatus = banner.status === "PUBLISHED";
            if (filterStatus === "draft") matchesStatus = banner.status === "DRAFT";
            let matchesPosition = true;
            if (filterPosition !== "all") matchesPosition = banner.position === filterPosition;
            return matchesSearch && matchesStatus && matchesPosition;
        })
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const MathCeil = Math.ceil(allFilteredBanners.length / itemsPerPage);
    const totalPages = MathCeil > 0 ? MathCeil : 1; 
    
    // Đảm bảo currentPage không vượt quá totalPages khi search/filter
    const validCurrentPage = currentPage > totalPages ? totalPages : currentPage;
    
    const indexOfLastItem = validCurrentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = allFilteredBanners.slice(indexOfFirstItem, indexOfLastItem);

    const getStatusLabel = () => {
        if (filterStatus === "published") return "Đang hoạt động";
        if (filterStatus === "draft") return "Đang ẩn";
        return "Tất cả trạng thái";
    };

    if (isLoading) return <div className="z-banner-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-banner-state z-banner-error">{error.message}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Banners các trang" }]} title="Quản lý Banners các trang" description="Quản lý danh sách banners, thiết lập vị trí và thứ tự hiển thị của banners trên hệ thống di động ." />
            <div className="z-banner-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-banner-header">
                    <h1 className="z-banner-title">Danh sách Banners các trang</h1>
                </div>
                <div className="z-banner-tabs">
                    <button className={`z-banner-tab-item ${filterPosition === "all" ? "active" : ""}`} onClick={() => setFilterPosition("all")}>
                        Tất cả
                    </button>

                    {Object.entries(POSITION_LABELS).map(([key, label]) => (
                        <button key={key} className={`z-banner-tab-item ${filterPosition === key ? "active" : ""}`} onClick={() => setFilterPosition(key)}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="z-banner-tools">
                    <div className="z-banner-search">
                        <input type="text" placeholder="Tìm tiêu đề banner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="z-banner-filter">
                        <button className="z-banner-btn-filter" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                            <span>{getStatusLabel()}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showFilterDropdown && (
                            <div className="z-banner-dropdown-menu">
                                <div className={`z-banner-dropdown-item ${filterStatus === "all" ? "active" : ""}`} onClick={() => { setFilterStatus("all"); setShowFilterDropdown(false); }}>Tất cả trạng thái</div>
                                <div className={`z-banner-dropdown-item ${filterStatus === "published" ? "active" : ""}`} onClick={() => { setFilterStatus("published"); setShowFilterDropdown(false); }}>Đang hoạt động</div>
                                <div className={`z-banner-dropdown-item ${filterStatus === "draft" ? "active" : ""}`} onClick={() => { setFilterStatus("draft"); setShowFilterDropdown(false); }}>Đang ẩn</div>
                            </div>
                        )}
                    </div>

                    <AddButton style={{ marginLeft: "auto" }} onClick={openAddModal}>
                        Thêm banner
                    </AddButton>
                </div>

                <div className="z-banner-table-wrapper">
                    <table className="z-banner-table">
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
                            {currentItems.map((banner, index) => (
                                <tr key={banner._id}>
                                    <td>{indexOfFirstItem + index + 1}</td>
                                    <td>
                                        <img
                                            src={banner.imageUrl ? `${banner.imageUrl}?t=${new Date(banner.updatedAt || banner.createdAt || Date.now()).getTime()}` : FALLBACK_IMG}
                                            alt={banner.title}
                                            className="z-banner-img-preview"
                                            onError={(e) => { e.target.src = FALLBACK_IMG; }}
                                        />
                                    </td>
                                    <td>
                                        <div className="z-banner-text-clamp">{banner.title}</div>
                                    </td>
                                    <td>
                                        <span className="z-banner-badge-gray">{POSITION_LABELS[banner.position] || banner.position || "N/A"}</span>
                                    </td>
                                    <td>
                                        <span className="z-banner-badge-blue">{banner.displayOrder || 0}</span>
                                    </td>
                                    <td>
                                        <span className={`z-banner-status-badge ${banner.status === "PUBLISHED" ? "published" : "draft"}`}>{banner.status === "PUBLISHED" ? "Đang hoạt động" : "Đang ẩn"}</span>
                                    </td>
                                    <td>
                                        <div className="z-banner-actions">
                                            <div className="z-banner-dropdown-actions">
                                                <button className="z-banner-more-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>

                                                <div className="z-banner-action-menu">
                                                    <Button variant="outline" onClick={(e) => handleTogglePublishStatus(e, banner)} disabled={toggleStatusMutation.isPending}>
                                                        {banner.status === "PUBLISHED" ? "Ẩn Banner" : "Hoạt động"}
                                                    </Button>
                                                    <EditButton onClick={(e) => openEditModal(e, banner)} />
                                                    <DeleteButton onClick={(e) => handleDeleteClick(e, banner._id, banner.title)} />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {allFilteredBanners.length === 0 && <div className="z-banner-state">Không tìm thấy banner nào phù hợp.</div>}
                </div>

                {totalPages > 1 && (
                    <div className="z-banner-pagination">
                        <button className="z-pagination-btn" disabled={validCurrentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                            Trước
                        </button>
                        <div className="z-pagination-numbers">
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i + 1} className={`z-pagination-number ${validCurrentPage === i + 1 ? "active" : ""}`} onClick={() => setCurrentPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button className="z-pagination-btn" disabled={validCurrentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
                            Sau
                        </button>
                    </div>
                )}

                {/* MODAL THÊM/SỬA */}
                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật Banner" : "Thêm Banner mới"} size="lg" onSave={handleSaveBanner} saveText={saveBannerMutation.isPending ? "Đang xử lý..." : isEditMode ? "Lưu thay đổi" : "Tạo Banner"}>
                    <div className="z-banner-form">
                        <div className="z-banner-form-group">
                            <label>Tiêu đề <span className="z-banner-required">*</span></label>
                            <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Nhập tiêu đề..." disabled={isSubmitting} className="z-banner-input" />
                        </div>
                        <div className="z-banner-form-group">
                            <label>Phụ đề (Subtitle)</label>
                            <input type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="Nhập phụ đề..." disabled={isSubmitting} className="z-banner-input" />
                        </div>
                        <div className="z-banner-form-grid">
                            <div className="z-banner-form-group">
                                <label>Vị trí (Position)</label>
                                <Select name="position" options={positionOptions} value={formData.position} onChange={handleInputChange} disabled={isSubmitting} />
                            </div>
                            <div className="z-banner-form-group">
                                <label>Thứ tự hiển thị</label>
                                <input type="number" name="displayOrder" value={formData.displayOrder} onChange={handleInputChange} min="0" disabled={isSubmitting} className="z-banner-input" />
                            </div>
                        </div>
                        <div className="z-banner-form-group">
                            <label>Điều hướng đến</label>
                            <input type="text" value={LINK_LABELS[DEFAULT_LINKS[formData.position]] || DEFAULT_LINKS[formData.position] || "Không có link điều hướng"} disabled={true} className="z-banner-input readonly z-banner-input-highlight" />
                        </div>
                        <div className="z-banner-form-group">
                            <label>Trạng thái (Status)</label>
                            <Select name="status" options={statusOptions} value={formData.status} onChange={handleInputChange} disabled={isSubmitting} />
                        </div>
                        <div className="z-banner-form-group">
                            <label>Mô tả (Description)</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Nhập mô tả..." rows="3" disabled={isSubmitting} className="z-banner-textarea" />
                        </div>
                        <div className="z-banner-form-group">
                            <label>Hình ảnh Banner Desktop <span className="z-banner-required">*</span></label>
                            <div className="z-banner-upload-wrapper">
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />
                                {imagePreview ? (
                                    <div className="z-banner-image-preview-box">
                                        <img src={imagePreview} alt="Preview" />
                                        <button type="button" className="z-banner-remove-img-btn" onClick={removeImage}>×</button>
                                    </div>
                                ) : (
                                    <div className="z-banner-image-upload-btn" onClick={() => fileInputRef.current.click()}>
                                        <span>+ Tải ảnh Banner</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* MODAL XÓA */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={confirmDelete} saveText={deleteBannerMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-banner-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xác nhận xóa</h3>
                        <p>Bạn có chắc chắn muốn xóa Banner <br /><strong>"{bannerToDelete?.title}"</strong> không?</p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Banners;