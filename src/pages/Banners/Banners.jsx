import React, { useEffect, useState, useRef } from "react";
import { bannerApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";

import { Button, AddButton, EditButton, DeleteButton } from "../../ui/Button/Button";
// Import Component Select mới tạo
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
    HERO: "Banner Trang Chủ",
    MIDDLE: "Background Trang Chủ",
    BOTTOM: "Banner Trang Khuyến Mãi",
    ABOUT_HERO: "Banner chính Trang Giới Thiệu",
    ABOUT_MIDDLE: "Banner giữa Trang Giới Thiệu",
};

// --- Chuẩn bị Options cho Component Select ---
const positionOptions = Object.entries(POSITION_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
}));

const statusOptions = [
    { value: "PUBLISHED", label: "Đang hoạt động" },
    { value: "DRAFT", label: "Đang ẩn" },
];

const Banners = () => {
    const [banners, setBanners] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPosition, setFilterPosition] = useState("all");

    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showPositionDropdown, setShowPositionDropdown] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // State Modal Xóa
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    // State Modal Form
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editBannerId, setEditBannerId] = useState(null);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);

    const initialForm = {
        title: "",
        subtitle: "",
        description: "",
        position: "HERO",
        displayOrder: 0,
        status: "PUBLISHED",
    };
    const [formData, setFormData] = useState(initialForm);

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // FETCH DATA
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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterPosition]);

    // XỬ LÝ XÓA
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
                setToast({ show: true, message: "Xóa banner thành công!", type: "success" });
                setIsDeleteModalOpen(false);
                setBanners((prev) => prev.filter((b) => b._id !== bannerToDelete.id));
                setBannerToDelete(null);
            } else {
                setToast({
                    show: true,
                    message: response?.message || "Lỗi xóa banner",
                    type: "error",
                });
            }
        } catch (error) {
            console.error("Lỗi deleteBanner:", error);
            setToast({
                show: true,
                message: error.response?.data?.message || "Không thể xóa banner lúc này",
                type: "error",
            });
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    // MỞ FORM
    const openAddModal = () => {
        setIsEditMode(false);
        setEditBannerId(null);
        setFormData({
            ...initialForm,
            position: filterPosition === "all" ? "HERO" : filterPosition,
        });
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

    // XỬ LÝ NHẬP LIỆU
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

    // LƯU FORM
    const handleSaveBanner = async () => {
        if (!formData.title) {
            return setToast({ show: true, message: isEditMode ? "Cập nhật thành công!" : "Thêm mới thành công!", type: "success" });
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
                setIsSubmittingForm(false);
                return setToast({
                    show: true,
                    message: "Vui lòng chọn hình ảnh cho Banner!",
                    type: "error",
                });
            }

            let response;
            if (isEditMode) {
                response = await bannerApi.updateBanner(editBannerId, submitData);
            } else {
                response = await bannerApi.createBanner(submitData);
            }

            if (response && response.success) {
                setToast({
                    show: true,
                    message: isEditMode ? "Cập nhật thành công!" : "Thêm mới thành công!",
                    type: "success",
                });

                // CẬP NHẬT UI TRỰC TIẾP
                if (isEditMode) {
                    setBanners((prev) =>
                        prev.map((b) => {
                            if (b._id === editBannerId) {
                                return {
                                    ...b,
                                    ...formData,
                                    displayOrder: Number(formData.displayOrder),
                                    imageUrl: imagePreview || b.imageUrl,
                                };
                            }
                            return b;
                        }),
                    );
                } else {
                    const newBanner = response.data?.banner ||
                        response.data || {
                            _id: Date.now().toString(),
                            ...formData,
                            displayOrder: Number(formData.displayOrder),
                            imageUrl: imagePreview || "",
                            createdAt: new Date().toISOString(),
                        };
                    setBanners((prev) => [newBanner, ...prev]);
                }

                setIsFormModalOpen(false);
            } else {
                setToast({
                    show: true,
                    message: response?.message || "Có lỗi xảy ra",
                    type: "error",
                });
            }
        } catch (error) {
            console.error("Lỗi submit form:", error);
            setToast({
                show: true,
                message: error.response?.data?.message || "Lỗi kết nối đến máy chủ",
                type: "error",
            });
        } finally {
            setIsSubmittingForm(false);
        }
    };

    // TOGGLE STATUS
    const handleTogglePublishStatus = async (e, banner) => {
        e.stopPropagation();
        const newStatus = banner.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        const previousBanners = [...banners];

        setBanners((prev) => prev.map((b) => (b._id === banner._id ? { ...b, status: newStatus } : b)));

        try {
            const submitData = new FormData();
            submitData.append("status", newStatus);
            const response = await bannerApi.updateBanner(banner._id, submitData);
            if (response && response.success) {
                setToast({
                    show: true,
                    message: `Đã chuyển sang: ${newStatus === "PUBLISHED" ? "Đang hoạt động" : "Đang ẩn"}`,
                    type: "success",
                });
            } else {
                setBanners(previousBanners);
                setToast({
                    show: true,
                    message: response?.message || "Lỗi khi cập nhật trạng thái",
                    type: "error",
                });
            }
        } catch (error) {
            setBanners(previousBanners);
            setToast({
                show: true,
                message: "Lỗi kết nối đến máy chủ",
                type: "error",
            });
        }
    };

    // LỌC DỮ LIỆU
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

    // Tính toán dữ liệu hiển thị cho trang hiện tại
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = allFilteredBanners.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(allFilteredBanners.length / itemsPerPage);

    const getStatusLabel = () => {
        if (filterStatus === "published") return "Đang hoạt động";
        if (filterStatus === "draft") return "Đang ẩn";
        return "Tất cả trạng thái";
    };

    // const getPositionLabel = () => {
    //     if (filterPosition === "all") return "Tất cả vị trí";
    //     return POSITION_LABELS[filterPosition] || filterPosition;
    // };

    if (isLoading) return <div className="z-banner-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-banner-state z-banner-error">{error}</div>;

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

                    {/* Filter Vị trí */}
                    {/* <div className="z-banner-filter">
                        <button
                            className="z-banner-btn-filter"
                            onClick={() => {
                                setShowPositionDropdown(!showPositionDropdown);
                                setShowFilterDropdown(false);
                            }}
                        >
                            <span>{getPositionLabel()}</span>

                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showPositionDropdown && (
                            <div className="z-banner-dropdown-menu">
                                <div
                                    className={`z-banner-dropdown-item ${filterPosition === "all" ? "active" : ""}`}
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
                                        className={`z-banner-dropdown-item ${filterPosition === key ? "active" : ""}`}
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
                    </div> */}

                    {/* Filter Trạng thái */}
                    <div className="z-banner-filter">
                        <button
                            className="z-banner-btn-filter"
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowPositionDropdown(false);
                            }}
                        >
                            <span>{getStatusLabel()}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showFilterDropdown && (
                            <div className="z-banner-dropdown-menu">
                                <div
                                    className={`z-banner-dropdown-item ${filterStatus === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("all");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Tất cả trạng thái
                                </div>
                                <div
                                    className={`z-banner-dropdown-item ${filterStatus === "published" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("published");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang hoạt động
                                </div>
                                <div
                                    className={`z-banner-dropdown-item ${filterStatus === "draft" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("draft");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang ẩn
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SỬ DỤNG ADD BUTTON TẠI ĐÂY */}
                    <AddButton style={{ marginLeft: "auto" }} onClick={openAddModal}>Thêm banner</AddButton>
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
                            {allFilteredBanners.map((banner, index) => (
                                <tr key={banner._id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <img
                                            src={banner.imageUrl || FALLBACK_IMG}
                                            alt={banner.title}
                                            className="z-banner-img-preview"
                                            onError={(e) => {
                                                e.target.src = FALLBACK_IMG;
                                            }}
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
                                                {/* Nút 3 chấm */}
                                                <button className="z-banner-more-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>

                                                {/* Menu xuất hiện khi hover */}
                                                <div className="z-banner-action-menu">
                                                    <Button variant="outline" onClick={(e) => handleTogglePublishStatus(e, banner)}>
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
                        <button className="z-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                            Trước
                        </button>
                        <div className="z-pagination-numbers">
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i + 1} className={`z-pagination-number ${currentPage === i + 1 ? "active" : ""}`} onClick={() => setCurrentPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button className="z-pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
                            Sau
                        </button>
                    </div>
                )}

                {/* ================= MODAL FORM: THÊM & SỬA ================= */}
                <Modal
                    isOpen={isFormModalOpen}
                    onClose={() => !isSubmittingForm && setIsFormModalOpen(false)}
                    title={isEditMode ? "Cập nhật Banner" : "Thêm Banner mới"}
                    size="lg" // Đã dùng prop size thay vì maxWidth hardcode
                    onSave={handleSaveBanner}
                    saveText={isSubmittingForm ? "Đang xử lý..." : isEditMode ? "Lưu thay đổi" : "Tạo Banner"}
                >
                    <div className="z-banner-form">
                        <div className="z-banner-form-group">
                            <label>
                                Tiêu đề <span className="z-banner-required">*</span>
                            </label>
                            <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Nhập tiêu đề..." disabled={isSubmittingForm} className="z-banner-input" />
                        </div>

                        <div className="z-banner-form-group">
                            <label>Phụ đề (Subtitle)</label>
                            <input type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="Nhập phụ đề..." disabled={isSubmittingForm} className="z-banner-input" />
                        </div>

                        <div className="z-banner-form-grid">
                            <div className="z-banner-form-group">
                                <label>Vị trí (Position)</label>

                                {/* --- SỬ DỤNG COMPONENT SELECT --- */}
                                <Select name="position" options={positionOptions} value={formData.position} onChange={handleInputChange} disabled={isSubmittingForm} />
                            </div>
                            <div className="z-banner-form-group">
                                <label>Thứ tự hiển thị</label>
                                <input type="number" name="displayOrder" value={formData.displayOrder} onChange={handleInputChange} min="0" disabled={isSubmittingForm} className="z-banner-input" />
                            </div>
                        </div>

                        <div className="z-banner-form-group">
                            <label>Trạng thái (Status)</label>

                            {/* --- SỬ DỤNG COMPONENT SELECT --- */}
                            <Select name="status" options={statusOptions} value={formData.status} onChange={handleInputChange} disabled={isSubmittingForm} />
                        </div>

                        <div className="z-banner-form-group">
                            <label>Mô tả (Description)</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Nhập mô tả..." rows="3" disabled={isSubmittingForm} className="z-banner-textarea" />
                        </div>

                        <div className="z-banner-form-group">
                            <label>
                                Hình ảnh Banner Desktop <span className="z-banner-required">*</span>
                            </label>
                            <div className="z-banner-upload-wrapper">
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmittingForm} />
                                {imagePreview ? (
                                    <div className="z-banner-image-preview-box">
                                        <img src={imagePreview} alt="Preview" />
                                        <button type="button" className="z-banner-remove-img-btn" onClick={removeImage}>
                                            ×
                                        </button>
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

                {/* ================= MODAL XÓA ================= */}
                <Modal
                    isOpen={isDeleteModalOpen}
                    onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)}
                    title="Xác nhận xóa"
                    size="sm" // Kích thước nhỏ gọn
                    onSave={confirmDelete}
                    saveText={isSubmittingDelete ? "Đang xóa..." : "Xác nhận xóa"}
                >
                    <div className="z-banner-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xác nhận xóa</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa Banner <br />
                            <strong>"{bannerToDelete?.title}"</strong> không?
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Banners;
