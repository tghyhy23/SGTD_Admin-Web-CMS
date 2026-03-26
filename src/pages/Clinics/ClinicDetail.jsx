import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clinicApi, reviewApi } from "../../api/axiosApi";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Modal from "../../ui/Modal/Modal";
import { AddButton, EditButton, DeleteButton, Button } from "../../ui/Button/Button";
import ReactSelect from "react-select";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import vi from "date-fns/locale/vi";
registerLocale("vi", vi);

import "./ClinicDetail.css";

const FALLBACK_IMG = "https://via.placeholder.com/600x400?text=No+Image";
const AVATAR_PLACEHOLDER = "https://via.placeholder.com/150?text=Avatar";

const STATUS_OPTIONS = [
    { value: "true", label: "Đang hoạt động" },
    { value: "false", label: "Ngừng hoạt động (Bảo trì)" },
];

const ClinicDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // ==========================================
    // STATE CHI TIẾT PHÒNG KHÁM
    // ==========================================
    const [clinic, setClinic] = useState(null);
    const [images, setImages] = useState([FALLBACK_IMG]);
    const [activeImage, setActiveImage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ==========================================
    // STATE REVIEWS
    // ==========================================
    const [reviews, setReviews] = useState([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(false);
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewTotal, setReviewTotal] = useState(0);

    // ==========================================
    // STATE MODAL PHÒNG KHÁM
    // ==========================================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const initialForm = {
        name: "", address: "", hotline: "", description: "", isActive: true,
    };
    const [formData, setFormData] = useState(initialForm);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [oldImageUrls, setOldImageUrls] = useState([]);

    // ==========================================
    // STATE MODAL REVIEW (SEEDING)
    // ==========================================
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [currentReviewId, setCurrentReviewId] = useState(null);
    const [reviewForm, setReviewForm] = useState({
        fakeAuthorName: "", fakeAvatarUrl: "", rating: 5, content: "", fakeDate: null
    });

    // ==========================================
    // FETCH DỮ LIỆU
    // ==========================================
    const fetchDetail = async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const response = await clinicApi.getClinicById(id);
            if (response && response.success) {
                const fetchedClinic = response.data.branch || response.data;
                setClinic(fetchedClinic);
                setImages(fetchedClinic.imageUrls?.length > 0 ? fetchedClinic.imageUrls : [FALLBACK_IMG]);
            } else {
                setError("Không tìm thấy thông tin phòng khám.");
            }
        } catch (err) {
            console.error("Lỗi lấy chi tiết:", err);
            setError("Lỗi khi tải dữ liệu từ máy chủ.");
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    const fetchReviews = async () => {
        setIsReviewsLoading(true);
        try {
            const res = await reviewApi.getAdminReviewsByBranch(id, { page: reviewPage, limit: 10, status: 'all' });
            if (res && res.success) {
                setReviews(res.data.reviews || []);
                setReviewTotal(res.data.pagination?.total || 0);
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách review:", err);
            showToast("Không thể tải đánh giá.", "error");
        } finally {
            setIsReviewsLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchDetail();
            fetchReviews();
        }
    }, [id, reviewPage]);

    // ==========================================
    // LOGIC TOAST & HELPER UI
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "42px",
            borderRadius: "8px",
            fontSize: "14px",
            borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(49, 46, 129, 0.1)" : "none",
            "&:hover": { borderColor: "var(--primary-color)" },
            backgroundColor: state.isDisabled ? "#f9fafb" : "#fff",
            cursor: state.isDisabled ? "not-allowed" : "pointer"
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#f3f4f6" : "white",
            color: state.isSelected ? "var(--primary-color)" : "#374151",
            cursor: "pointer",
            fontSize: "14px",
        }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
    };

    // ==========================================
    // LOGIC CẬP NHẬT PHÒNG KHÁM
    // ==========================================
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (oldImageUrls.length + imageFiles.length + files.length > 5) {
            return showToast("Chỉ được phép upload tối đa 5 ảnh!", "error");
        }
        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setImageFiles([...imageFiles, ...files]);
        setImagePreviews([...imagePreviews, ...newPreviews]);
        e.target.value = null;
    };

    const removeNewImage = (index) => {
        const newFiles = [...imageFiles];
        const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newFiles.splice(index, 1);
        newPreviews.splice(index, 1);
        setImageFiles(newFiles);
        setImagePreviews(newPreviews);
    };

    const removeOldImage = (index) => {
        const updatedOldImages = [...oldImageUrls];
        updatedOldImages.splice(index, 1);
        setOldImageUrls(updatedOldImages);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditClick = () => {
        setFormData({
            name: clinic.name || "", address: clinic.address || "", hotline: clinic.hotline || "",
            description: clinic.description || "", isActive: clinic.isActive !== undefined ? clinic.isActive : true,
        });
        setImageFiles([]); setImagePreviews([]); setOldImageUrls(clinic.imageUrls || []);
        setIsModalOpen(true);
    };

    const handleUpdateSubmit = async (e) => {
        if(e) e.preventDefault();
        setIsSubmitting(true);
        try {
            const submitData = new FormData();
            Object.keys(formData).forEach((key) => {
                if (formData[key] !== null && formData[key] !== undefined) submitData.append(key, formData[key]);
            });

            if (oldImageUrls.length === 0 && imageFiles.length === 0) submitData.append("images", "");
            else if (oldImageUrls.length > 0) oldImageUrls.forEach(url => submitData.append("images", url));

            if (imageFiles && imageFiles.length > 0) imageFiles.forEach((file) => submitData.append("image", file));

            const response = await clinicApi.updateClinic(id, submitData);
            if (response && response.success) {
                await fetchDetail(true);
                showToast("Cập nhật phòng khám thành công!");
                setIsModalOpen(false);
            } else {
                showToast(response?.message || "Lỗi cập nhật", "error");
            }
        } catch (error) {
            showToast("Lỗi kết nối máy chủ", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // LOGIC QUẢN LÝ REVIEWS
    // ==========================================
    const handleReviewInputChange = (e) => {
        const { name, value } = e.target;
        setReviewForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleOpenReviewModal = (review = null) => {
        if (review) {
            setCurrentReviewId(review._id);
            setReviewForm({
                fakeAuthorName: review.authName || "",
                fakeAvatarUrl: review.authAvatar || "",
                rating: review.rating || 5,
                content: review.content || "",
                fakeDate: review.reviewDate ? new Date(review.reviewDate) : null
            });
        } else {
            setCurrentReviewId(null);
            setReviewForm({
                fakeAuthorName: "", fakeAvatarUrl: "", rating: 5, content: "", fakeDate: null
            });
        }
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = async (e) => {
        if(e) e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                branchId: id,
                fakeAuthorName: reviewForm.fakeAuthorName,
                fakeAvatarUrl: reviewForm.fakeAvatarUrl,
                rating: Number(reviewForm.rating),
                content: reviewForm.content,
                fakeDate: reviewForm.fakeDate ? reviewForm.fakeDate.toISOString() : new Date().toISOString()
            };

            let res;
            if (currentReviewId) {
                res = await reviewApi.updateSeedReview(currentReviewId, payload);
            } else {
                res = await reviewApi.createSeedReview(payload);
            }

            if (res && res.success) {
                showToast(currentReviewId ? "Cập nhật đánh giá thành công!" : "Tạo đánh giá thành công!");
                setIsReviewModalOpen(false);
                fetchReviews();
                fetchDetail(true); // Cập nhật lại số sao trung bình trên UI phòng khám
            } else {
                showToast(res?.message || "Lỗi xử lý đánh giá", "error");
            }
        } catch (err) {
            showToast("Lỗi khi lưu đánh giá", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleHideReview = async (reviewId) => {
        try {
            const res = await reviewApi.toggleHideReview(reviewId);
            if (res && res.success) {
                showToast("Thay đổi trạng thái thành công!");
                fetchReviews();
            }
        } catch (err) {
            showToast("Lỗi thay đổi trạng thái", "error");
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa đánh giá này vĩnh viễn?")) return;
        try {
            const res = await reviewApi.deleteReview(reviewId);
            if (res && res.success) {
                showToast("Đã xóa đánh giá!");
                fetchReviews();
                fetchDetail(true);
            }
        } catch (err) {
            showToast("Lỗi xóa đánh giá", "error");
        }
    };

    // ==========================================
    // RENDER UI
    // ==========================================
    if (isLoading) return <div className="z-clinic-detail-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-clinic-detail-state z-clinic-detail-error">{error}</div>;
    if (!clinic) return <div className="z-clinic-detail-state">Không có dữ liệu.</div>;

    return (
        <>
            <PageHeader 
                breadcrumbs={[{ label: "Quản lý Phòng khám", path: "/clinics" }, { label: "Chi tiết Phòng khám" }]} 
                title="Quản lí chi tiết phòng khám" 
                description="Xem chi tiết và chỉnh sửa thông tin phòng khám, quản lý các đánh giá của phòng khám." 
            />

            <div className="z-clinic-detail-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                {/* CARD THÔNG TIN PHÒNG KHÁM */}
                <div className="z-clinic-detail-card">
                    <div className="z-clinic-detail-layout">
                        {/* --- CỘT TRÁI (HÌNH ẢNH) --- */}
                        <div className="z-clinic-detail-left">
                            <div className="z-clinic-detail-main-img-container">
                                <img src={images[activeImage]} alt={clinic.name} className="z-clinic-detail-main-img" onError={(e) => { e.target.src = FALLBACK_IMG; }} />
                            </div>
                            {images.length > 1 && (
                                <div className="z-clinic-detail-thumb-list">
                                    {images.map((img, index) => (
                                        <div key={index} className={`z-clinic-detail-thumb-item ${activeImage === index ? "active" : ""}`} onClick={() => setActiveImage(index)}>
                                            <img src={img} alt={`thumb-${index}`} onError={(e) => { e.target.src = FALLBACK_IMG; }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* --- CỘT PHẢI (THÔNG TIN) --- */}
                        <div className="z-clinic-detail-right">
                            <div className="z-clinic-detail-header-info">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                                    <span className="z-clinic-detail-badge">Chi nhánh hệ thống</span>
                                    <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--warning)" }}>
                                        ⭐ {clinic.totalRating || 0} <span style={{ color: "#6b7280", fontSize: "12px" }}>({clinic.totalReview || 0} đánh giá)</span>
                                    </span>
                                </div>
                                <h1 className="z-clinic-detail-title">{clinic.name}</h1>
                                <div className="z-clinic-detail-phone">📞 Hotline: {clinic.hotline || "Đang cập nhật"}</div>
                            </div>

                            <div className="z-clinic-detail-section">
                                <h3>Thông tin chi tiết</h3>
                                <p className="z-clinic-detail-desc">{clinic.description || "Chưa có mô tả cho phòng khám này."}</p>
                            </div>

                            <div className="z-clinic-detail-specs-box">
                                <h3>Địa chỉ & Hoạt động</h3>
                                <ul className="z-clinic-detail-specs-list">
                                    <li>
                                        <span className="spec-label">Địa chỉ:</span>
                                        <span className="spec-value" style={{ textAlign: "right" }}>{clinic.address || "Đang cập nhật"}</span>
                                    </li>
                                    <li>
                                        <span className="spec-label">Trạng thái:</span>
                                        <span className="spec-value">
                                            {clinic.isActive ? <span className="z-clinic-detail-badge-active">Đang hoạt động</span> : <span className="z-clinic-detail-badge-inactive">Ngừng hoạt động</span>}
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            <div className="z-clinic-detail-actions">
                                <button className="z-clinic-detail-btn-back" onClick={() => navigate("/clinics")}>Quay lại danh sách</button>
                                <button className="z-clinic-detail-btn-primary" onClick={handleEditClick}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    Chỉnh sửa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QUẢN LÝ ĐÁNH GIÁ (REVIEWS) */}
                <div className="z-clinic-detail-card" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '18px', margin: 0, color: '#111827' }}>Quản lý Đánh giá ({reviewTotal})</h2>
                        <AddButton onClick={() => handleOpenReviewModal(null)}>Thêm Seeding</AddButton>
                    </div>

                    {isReviewsLoading ? (
                        <div className="z-clinic-detail-state">Đang tải đánh giá...</div>
                    ) : (
                        <div className="z-clinic-detail-table-wrapper">
                            <table className="z-clinic-detail-table">
                                <thead>
                                    <tr>
                                        <th>Khách hàng</th>
                                        <th>Đánh giá</th>
                                        <th>Nội dung</th>
                                        <th>Ngày tạo</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: "center" }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reviews.map((r) => (
                                        <tr key={r._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <img src={r.authAvatar || AVATAR_PLACEHOLDER} alt="avatar" className="z-clinic-detail-avatar" onError={(e) => { e.target.src = AVATAR_PLACEHOLDER; }} />
                                                    <div style={{ fontWeight: '600', color: '#111827' }}>{r.authName}</div>
                                                </div>
                                            </td>
                                            <td style={{ color: '#d97706', fontWeight: 'bold' }}>⭐ {r.rating}</td>
                                            <td style={{ maxWidth: '300px' }}>
                                                <div className="z-clinic-detail-text-clamp" title={r.content}>{r.content}</div>
                                            </td>
                                            <td>{new Date(r.reviewDate).toLocaleDateString("vi-VN")}</td>
                                            <td>
                                                <span className={r.isHidden ? 'z-clinic-detail-badge-inactive' : 'z-clinic-detail-badge-active'}>
                                                    {r.isHidden ? 'Đang ẩn' : 'Hiển thị'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <div className="z-clinic-detail-dropdown-actions" onClick={(e) => e.stopPropagation()}>
                                                    <button className="z-clinic-detail-more-btn">
                                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                            <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                        </svg>
                                                    </button>
                                                    <div className="z-clinic-detail-action-menu">
                                                        <EditButton onClick={() => handleOpenReviewModal(r)} />
                                                        <Button variant="outline" onClick={() => handleToggleHideReview(r._id)}>
                                                            {r.isHidden ? "Hiện đánh giá" : "Ẩn đánh giá"}
                                                        </Button>
                                                        <DeleteButton onClick={() => handleDeleteReview(r._id)} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {reviews.length === 0 && (
                                        <tr><td colSpan="6"><div className="z-clinic-detail-state">Chưa có đánh giá nào.</div></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ==========================================
                    MODAL CẬP NHẬT PHÒNG KHÁM
                ========================================== */}
                <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title="Cập nhật Phòng khám" size="lg" onSave={handleUpdateSubmit} saveText={isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}>
                    <div className="z-clinic-detail-form">
                        <div className="z-clinic-detail-form-grid">
                            
                            {/* CỘT TRÁI */}
                            <div className="z-clinic-detail-form-col">
                                <div className="z-clinic-detail-form-group">
                                    <label>Tên Phòng Khám <span className="z-clinic-detail-required">*</span></label>
                                    <input type="text" name="name" className="z-clinic-detail-input" required value={formData.name} onChange={handleInputChange} disabled={isSubmitting} />
                                </div>

                                <div className="z-clinic-detail-form-group">
                                    <label>Địa chỉ chi tiết <span className="z-clinic-detail-required">*</span></label>
                                    <textarea name="address" className="z-clinic-detail-textarea" rows="2" required value={formData.address} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                </div>

                                <div className="z-clinic-detail-form-group">
                                    <label>Mô tả / Giới thiệu</label>
                                    <textarea name="description" className="z-clinic-detail-textarea" rows="4" value={formData.description} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                </div>
                            </div>

                            {/* CỘT PHẢI */}
                            <div className="z-clinic-detail-form-col">
                                <div className="z-clinic-detail-form-group">
                                    <label>Hotline <span className="z-clinic-detail-required">*</span></label>
                                    <input type="text" name="hotline" className="z-clinic-detail-input" required value={formData.hotline} onChange={handleInputChange} disabled={isSubmitting} />
                                </div>

                                <div className="z-clinic-detail-form-group">
                                    <label>Trạng thái hoạt động</label>
                                    <ReactSelect
                                        options={STATUS_OPTIONS}
                                        value={STATUS_OPTIONS.find(opt => opt.value === formData.isActive.toString())}
                                        onChange={(selected) => setFormData(prev => ({ ...prev, isActive: selected.value === "true" }))}
                                        isDisabled={isSubmitting}
                                        styles={customSelectStyles}
                                        isSearchable={false}
                                        menuPosition="fixed"
                                    />
                                </div>

                                <h3 className="z-clinic-detail-form-title" style={{ marginTop: "12px" }}>Thư viện Ảnh</h3>
                                <div className="z-clinic-detail-form-group">
                                    <label>Hình ảnh (Tối đa 5 ảnh)</label>
                                    <div className="z-clinic-detail-upload-wrapper">
                                        {oldImageUrls.map((url, index) => (
                                            <div key={`old-${index}`} className="z-clinic-detail-img-box">
                                                <img src={url} alt={`old-preview-${index}`} />
                                                <button type="button" className="z-clinic-detail-remove-btn" onClick={() => removeOldImage(index)}>×</button>
                                            </div>
                                        ))}

                                        {imagePreviews.map((src, index) => (
                                            <div key={`new-${index}`} className="z-clinic-detail-img-box">
                                                <img src={src} alt={`new-preview-${index}`} />
                                                <button type="button" className="z-clinic-detail-remove-btn" onClick={() => removeNewImage(index)}>×</button>
                                            </div>
                                        ))}

                                        {(oldImageUrls.length + imagePreviews.length) < 5 && (
                                            <div className="z-clinic-detail-add-img-btn" onClick={() => fileInputRef.current.click()}>
                                                + Tải ảnh
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} />
                                </div>
                            </div>

                        </div>
                    </div>
                </Modal>

                {/* ==========================================
                    MODAL THÊM/SỬA REVIEW (SEEDING)
                ========================================== */}
                <Modal isOpen={isReviewModalOpen} onClose={() => !isSubmitting && setIsReviewModalOpen(false)} title={currentReviewId ? "Cập nhật Review" : "Thêm Review Seeding"} maxWidth="600px" onSave={handleReviewSubmit} saveText={isSubmitting ? "Đang xử lý..." : "Lưu Đánh Giá"}>
                    <div className="z-clinic-detail-form">
                        <div className="z-clinic-detail-form-group">
                            <label>Tên khách hàng ảo <span className="z-clinic-detail-required">*</span></label>
                            <input type="text" name="fakeAuthorName" className="z-clinic-detail-input" required placeholder="VD: Chị Mai - Quận 1" value={reviewForm.fakeAuthorName} onChange={handleReviewInputChange} disabled={isSubmitting} />
                        </div>
                        
                        <div className="z-clinic-detail-form-row">
                            <div className="z-clinic-detail-form-group" style={{ flex: 1 }}>
                                <label>Số Sao (1 - 5) <span className="z-clinic-detail-required">*</span></label>
                                <input type="number" name="rating" className="z-clinic-detail-input" min="1" max="5" required value={reviewForm.rating} onChange={handleReviewInputChange} disabled={isSubmitting} />
                            </div>
                            <div className="z-clinic-detail-form-group" style={{ flex: 1 }}>
                                <label>Ngày đánh giá ảo</label>
                                <DatePicker 
                                    selected={reviewForm.fakeDate} 
                                    onChange={(date) => setReviewForm(prev => ({ ...prev, fakeDate: date }))} 
                                    showTimeSelect 
                                    timeFormat="HH:mm" 
                                    timeIntervals={1} 
                                    dateFormat="dd/MM/yyyy HH:mm" 
                                    className="z-clinic-detail-input" 
                                    placeholderText="Bỏ trống lấy ngày hiện tại" 
                                    disabled={isSubmitting} 
                                    locale="vi" 
                                />
                            </div>
                        </div>

                        <div className="z-clinic-detail-form-group">
                            <label>Link Ảnh Avatar (Tùy chọn)</label>
                            <input type="text" name="fakeAvatarUrl" className="z-clinic-detail-input" placeholder="https://..." value={reviewForm.fakeAvatarUrl} onChange={handleReviewInputChange} disabled={isSubmitting} />
                        </div>

                        <div className="z-clinic-detail-form-group">
                            <label>Nội dung đánh giá <span className="z-clinic-detail-required">*</span></label>
                            <textarea name="content" className="z-clinic-detail-textarea" rows="4" required placeholder="Nhận xét của khách hàng..." value={reviewForm.content} onChange={handleReviewInputChange} disabled={isSubmitting}></textarea>
                        </div>
                    </div>
                </Modal>

            </div>
        </>
    );
};

export default ClinicDetail;