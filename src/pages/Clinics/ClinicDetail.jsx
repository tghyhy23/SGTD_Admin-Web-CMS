import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clinicApi, reviewApi } from "../../api/axiosApi"; // Thêm reviewApi vào đây
import "./ClinicDetail.css";

const FALLBACK_IMG = "https://via.placeholder.com/600x400?text=No+Image";
const AVATAR_PLACEHOLDER = "https://via.placeholder.com/150?text=Avatar";

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
        fakeAuthorName: "", fakeAvatarUrl: "", rating: 5, content: "", fakeDate: ""
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
    // LOGIC TOAST
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
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
        if (name === "isActive") {
            setFormData((prev) => ({ ...prev, [name]: value === "true" }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
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
        e.preventDefault();
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
                fakeDate: review.reviewDate ? new Date(review.reviewDate).toISOString().slice(0, 16) : "" // Format cho input type="datetime-local"
            });
        } else {
            setCurrentReviewId(null);
            setReviewForm({
                fakeAuthorName: "", fakeAvatarUrl: "", rating: 5, content: "", fakeDate: ""
            });
        }
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                branchId: id,
                fakeAuthorName: reviewForm.fakeAuthorName,
                fakeAvatarUrl: reviewForm.fakeAvatarUrl,
                rating: Number(reviewForm.rating),
                content: reviewForm.content,
                fakeDate: reviewForm.fakeDate || new Date().toISOString()
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
    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;
    if (!clinic) return <div className="state-message">Không có dữ liệu.</div>;

    return (
        <div className="page-container">
            {toast.show && (
                <div className={`toast-message fixed-toast ${toast.type}`} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>×</button>
                </div>
            )}

            <div className="breadcrumb">
                <span onClick={() => navigate("/clinics")} className="breadcrumb-link">Quản lý Phòng khám</span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">Chi tiết Phòng khám</span>
            </div>

            {/* CARD THÔNG TIN PHÒNG KHÁM */}
            <div className="service-detail-card page-card">
                <div className="detail-layout">
                    <div className="detail-left">
                        <div className="main-image-container">
                            <img src={images[activeImage]} alt={clinic.name} className="main-image" onError={(e) => { e.target.src = FALLBACK_IMG; }} />
                        </div>
                        {images.length > 1 && (
                            <div className="thumbnail-list">
                                {images.map((img, index) => (
                                    <div key={index} className={`thumbnail-item ${activeImage === index ? "active" : ""}`} onClick={() => setActiveImage(index)}>
                                        <img src={img} alt={`thumb-${index}`} onError={(e) => { e.target.src = FALLBACK_IMG; }} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="detail-right">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span className="category-badge detail-badge">Phòng Khám</span>
                            <span style={{ fontWeight: "600", fontSize: "1.1rem" }}>
                                ⭐ {clinic.totalRating || 0} <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>({clinic.totalReview || 0} đánh giá)</span>
                            </span>
                        </div>
                        <h1 className="detail-title">{clinic.name}</h1>
                        <div className="detail-price" style={{ fontSize: "1.2rem", color: "var(--primary-color)" }}>📞 Hotline: {clinic.hotline || "Đang cập nhật"}</div>
                        
                        <div className="detail-section">
                            <h3>Thông tin chi tiết</h3>
                            <ul className="specs-list">
                                <li><span className="spec-label">Địa chỉ:</span><span className="spec-value">{clinic.address || "Đang cập nhật"}</span></li>
                                <li>
                                    <span className="spec-label">Trạng thái:</span>
                                    <span className="spec-value">
                                        {clinic.isActive ? <span className="category-badge" style={{ backgroundColor: '#dcfce7', color: '#059669', borderColor: '#059669' }}>Đang hoạt động</span> : <span className="category-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}>Ngừng hoạt động</span>}
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <div className="detail-actions">
                            <button className="back-btn" onClick={() => navigate("/clinics")}>Quay lại danh sách</button>
                            <button className="btn-primary" onClick={handleEditClick}>Chỉnh sửa thông tin</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* QUẢN LÝ ĐÁNH GIÁ (REVIEWS) */}
            <div className="page-card mt-8" style={{ marginTop: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>Quản lý Đánh giá ({reviewTotal})</h2>
                    <button className="btn-primary" onClick={() => handleOpenReviewModal(null)}>
                        + Thêm Seeding
                    </button>
                </div>

                {isReviewsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>Đang tải đánh giá...</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="services-table">
                            <thead>
                                <tr>
                                    <th>Khách hàng</th>
                                    <th>Đánh giá</th>
                                    <th>Nội dung</th>
                                    <th>Ngày tạo</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.map((r) => (
                                    <tr key={r._id}>
                                        <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <img src={r.authAvatar || AVATAR_PLACEHOLDER} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.src = AVATAR_PLACEHOLDER; }} />
                                            <div style={{ fontWeight: '500' }}>{r.authName}</div>
                                        </td>
                                        <td>⭐ {r.rating}</td>
                                        <td style={{ maxWidth: '300px' }}>
                                            <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {r.content}
                                            </div>
                                        </td>
                                        <td>{new Date(r.reviewDate).toLocaleDateString("vi-VN")}</td>
                                        <td>
                                            <span className="category-badge" style={{ 
                                                backgroundColor: r.isHidden ? '#fee2e2' : '#dcfce7', 
                                                color: r.isHidden ? '#dc2626' : '#059669', 
                                                borderColor: r.isHidden ? '#dc2626' : '#059669' 
                                            }}>
                                                {r.isHidden ? 'Đang ẩn' : 'Hiển thị'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-row">
                                                <button className="action-btn btn-edit" onClick={() => handleOpenReviewModal(r)}>Sửa</button>
                                                <button className="action-btn btn-secondary" onClick={() => handleToggleHideReview(r._id)}>
                                                    {r.isHidden ? "Hiện" : "Ẩn"}
                                                </button>
                                                <button className="action-btn btn-delete" onClick={() => handleDeleteReview(r._id)}>Xóa</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {reviews.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Chưa có đánh giá nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ==========================================
                MODAL CẬP NHẬT PHÒNG KHÁM
            ========================================== */}
            {isModalOpen && (
                <div className="modal-overlay">
                    {/* Đã tăng độ rộng của form lên 90% màn hình, max là 1000px */}
                    <div className="modal-content-clinic">
                        <div className="modal-header">
                            <h2>Cập nhật thông tin Phòng khám</h2>
                            <button className="close-modal-btn" onClick={() => !isSubmitting && setIsModalOpen(false)}>×</button>
                        </div>
                        <form className="modal-form" onSubmit={handleUpdateSubmit}>
                            <div className="form-grid">
                                <div className="form-column-left">
                                    <div className="form-group">
                                        <label>Tên Phòng Khám <span className="required">*</span></label>
                                        <input type="text" name="name" required value={formData.name} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="form-group">
                                        <label>Địa chỉ chi tiết <span className="required">*</span></label>
                                        <textarea name="address" rows="2" required value={formData.address} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Mô tả / Giới thiệu</label>
                                        <textarea name="description" rows="4" value={formData.description} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                    </div>
                                </div>
                                <div className="form-column-right">
                                    <div className="form-group">
                                        <label>Hotline <span className="required">*</span></label>
                                        <input type="text" name="hotline" required value={formData.hotline} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="form-group">
                                        <label>Trạng thái hoạt động</label>
                                        <select name="isActive" value={formData.isActive.toString()} onChange={handleInputChange} disabled={isSubmitting}>
                                            <option value="true">Đang hoạt động</option>
                                            <option value="false">Ngừng hoạt động (Bảo trì)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Hình ảnh (Tối đa 5 ảnh)</label>
                                        <div className="image-upload-container">
                                            {oldImageUrls.map((url, i) => (
                                                <div key={`old-${i}`} className="image-preview-box">
                                                    <img src={url} alt={`old-${i}`} /><button type="button" className="remove-img-btn" onClick={() => removeOldImage(i)}>×</button>
                                                </div>
                                            ))}
                                            {imagePreviews.map((src, i) => (
                                                <div key={`new-${i}`} className="image-preview-box">
                                                    <img src={src} alt={`new-${i}`} /><button type="button" className="remove-img-btn" onClick={() => removeNewImage(i)}>×</button>
                                                </div>
                                            ))}
                                            {(oldImageUrls.length + imagePreviews.length) < 5 && (
                                                <div className="image-upload-btn" onClick={() => fileInputRef.current.click()}><span>+ Tải ảnh</span></div>
                                            )}
                                        </div>
                                        <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================
                MODAL THÊM/SỬA REVIEW (SEEDING)
            ========================================== */}
            {isReviewModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-review">
                        <div className="modal-header">
                            <h2>{currentReviewId ? "Cập nhật Review" : "Thêm Review Seeding"}</h2>
                            <button className="close-modal-btn" onClick={() => !isSubmitting && setIsReviewModalOpen(false)}>×</button>
                        </div>
                        <form className="modal-form" onSubmit={handleReviewSubmit}>
                            <div className="form-group">
                                <label>Tên khách hàng ảo <span className="required">*</span></label>
                                <input type="text" name="fakeAuthorName" required placeholder="VD: Chị Mai - Quận 1" value={reviewForm.fakeAuthorName} onChange={handleReviewInputChange} disabled={isSubmitting} />
                            </div>
                            
                            <div style={{ display: "flex" }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Số Sao (1 - 5) <span className="required">*</span></label>
                                    <input type="number" name="rating" min="1" max="5" required value={reviewForm.rating} onChange={handleReviewInputChange} disabled={isSubmitting} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Ngày đánh giá ảo</label>
                                    <input type="datetime-local" name="fakeDate" value={reviewForm.fakeDate} onChange={handleReviewInputChange} disabled={isSubmitting} />
                                    <small style={{ color: 'gray', fontSize: '12px' }}>Bỏ trống sẽ lấy ngày hiện tại</small>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Link Ảnh Avatar (Tùy chọn)</label>
                                <input type="text" name="fakeAvatarUrl" placeholder="https://..." value={reviewForm.fakeAvatarUrl} onChange={handleReviewInputChange} disabled={isSubmitting} />
                            </div>

                            <div className="form-group">
                                <label>Nội dung đánh giá <span className="required">*</span></label>
                                <textarea name="content" rows="4" required placeholder="Nhận xét của khách hàng..." value={reviewForm.content} onChange={handleReviewInputChange} disabled={isSubmitting}></textarea>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsReviewModalOpen(false)}>Hủy</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang lưu..." : "Lưu Đánh Giá"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClinicDetail;