// src/pages/Blogs/BlogDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { postApi } from "../../api/axiosApi";
import "./BlogDetail.css";
// Import CSS chứa các class của modal (Giống như bên ServiceDetail)
import "../Services/Services.css";

const FALLBACK_IMG = "https://via.placeholder.com/600x400?text=No+Image";

const BlogDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // ==========================================
    // STATE CHI TIẾT BÀI VIẾT
    // ==========================================
    const [post, setPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ==========================================
    // STATE CHO MODAL CẬP NHẬT
    // ==========================================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const initialForm = {
        title: "",
        externalUrl: "",
        description: "",
        serviceType: "NHA KHOA",
        postType: "Bài SEO",
        status: "ACTIVE",
        isFeatured: false,
        isPinned: false,
        notes: "",
    };
    const [formData, setFormData] = useState(initialForm);

    // State ảnh cho form
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // ==========================================
    // FETCH DỮ LIỆU
    // ==========================================
    const fetchDetail = async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const response = await postApi.getPostById(id);
            if (response && response.success) {
                setPost(response.data.post);
            } else {
                setError("Không tìm thấy thông tin bài viết.");
            }
        } catch (err) {
            console.error("Lỗi lấy chi tiết:", err);
            setError("Lỗi khi tải dữ liệu từ máy chủ.");
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    // ==========================================
    // LOGIC TOAST & XỬ LÝ ẢNH TRONG FORM
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
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

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    // ==========================================
    // MỞ FORM CẬP NHẬT
    // ==========================================
    const handleEditClick = () => {
        setFormData({
            title: post.title || "",
            externalUrl: post.externalUrl || "",
            description: post.description || "",
            serviceType: post.serviceType || "NHA KHOA",
            postType: post.postType || "Bài SEO",
            status: post.status || "ACTIVE",
            isFeatured: post.isFeatured || false,
            isPinned: post.isPinned || false,
            notes: post.notes || "",
        });

        setImageFile(null);
        setImagePreview(post.thumbnailUrl || null);
        setIsModalOpen(true);
    };

    // ==========================================
    // GỬI DATA CẬP NHẬT (Optimistic UI Update)
    // ==========================================
    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.externalUrl) {
            return showToast("Vui lòng nhập đủ Tiêu đề và Link URL!", "error");
        }

        setIsSubmitting(true);
        try {
            // Khởi tạo đối tượng FormData
            const submitData = new FormData();

            // Thêm các dữ liệu văn bản vào FormData
            Object.keys(formData).forEach((key) => {
                submitData.append(key, formData[key]);
            });

            // Đảm bảo contentType không bị mất
            submitData.append("contentType", post.contentType || "Post");

            // Thêm File ảnh nếu người dùng có chọn ảnh mới
            if (imageFile) {
                submitData.append("image", imageFile);
            }

            // Gọi API cập nhật với formData
            const response = await postApi.updatePost(id, submitData);

            if (response && response.success) {
                showToast("Cập nhật bài viết thành công!");
                
                // --- Optimistic Update ---
                setPost(prev => ({
                    ...prev,
                    title: formData.title,
                    externalUrl: formData.externalUrl,
                    description: formData.description,
                    serviceType: formData.serviceType,
                    postType: formData.postType,
                    status: formData.status,
                    isFeatured: formData.isFeatured,
                    isPinned: formData.isPinned,
                    notes: formData.notes,
                    thumbnailUrl: imagePreview || prev.thumbnailUrl, // Cập nhật hình ảnh nếu có đổi
                    updatedAt: new Date().toISOString()
                }));
                // -------------------------

                setIsModalOpen(false);
                setImageFile(null);
            } else {
                showToast(response?.message || "Lỗi cập nhật bài viết", "error");
            }
        } catch (error) {
            console.error("Lỗi updatePost:", error);
            const errorMsg = error.response?.data?.message || "Lỗi kết nối đến máy chủ";
            showToast(errorMsg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // RENDER UI
    // ==========================================
    if (isLoading) return <div className="state-message">Đang tải chi tiết bài viết...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;
    if (!post) return <div className="state-message">Không có dữ liệu bài viết.</div>;

    return (
        <div className="page-container">
            {/* COMPONENT TOAST MESSAGE */}
            {toast.show && (
                <div className={`toast-message fixed-toast ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="breadcrumb">
                <span onClick={() => navigate("/blogs")} className="breadcrumb-link">
                    Quản lý bài viết
                </span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">Chi tiết bài viết</span>
            </div>

            <div className="service-detail-card page-card">
                <div className="detail-layout">
                    {/* CỘT TRÁI: HÌNH ẢNH */}
                    <div className="detail-left">
                        <div className="main-image-container blog-image-container">
                            <img
                                src={post.thumbnailUrl || FALLBACK_IMG}
                                alt={post.title}
                                className="main-image blog-main-image"
                                onError={(e) => {
                                    e.target.src = FALLBACK_IMG;
                                }}
                            />
                        </div>

                        {/* THÔNG TIN NGƯỜI TẠO */}
                        <div className="creator-info-box">
                            <p className="creator-info-text">
                                <strong>Ngày tạo:</strong> {new Date(post.createdAt).toLocaleString("vi-VN")}
                            </p>
                            <p className="creator-info-text">
                                <strong>Cập nhật lần cuối:</strong> {new Date(post.updatedAt).toLocaleString("vi-VN")}
                            </p>
                            <p className="creator-info-text creator-info-last">
                                <strong>Người tạo:</strong> <span className="creator-info-highlight">{post.createdBy?.fullName || post.createdBy?.email || "Admin"}</span>
                            </p>
                        </div>
                    </div>

                    {/* CỘT PHẢI: THÔNG TIN */}
                    <div className="detail-right">
                        <h1 className="detail-title blog-detail-title">{post.title}</h1>

                        {/* LINK BÀI VIẾT */}
                        <div className="detail-price blog-detail-link">
                            <a href={post.externalUrl} target="_blank" rel="noreferrer" className="blog-external-link">
                                {post.externalUrl}
                            </a>
                        </div>

                        <div className="detail-section">
                            <h3>Mô tả ngắn (SEO Description)</h3>
                            <p className="detail-description">{post.description || "Chưa có mô tả cho bài viết này."}</p>
                        </div>

                        <div className="detail-specs-box">
                            <h3>Thống kê & Trạng thái</h3>
                            <ul className="specs-list">
                                <li>
                                    <span className="spec-label">Trạng thái hiển thị:</span>
                                    <span className="spec-value">
                                        <span className={`category-badge custom-status-badge ${post.status === "ACTIVE" ? "active" : "inactive"}`}>{post.status}</span>
                                    </span>
                                </li>
                                <li>
                                    <span className="spec-label">Lượt click (Lượt xem):</span>
                                    <span className="spec-value click-count-value">{post.clickCount || 0} lượt</span>
                                </li>
                                <li>
                                    <span className="spec-label">Loại Content:</span>
                                    <span className="spec-value">{post.contentType}</span>
                                </li>
                                {post.notes && (
                                    <li className="notes-list-item">
                                        <span className="spec-label">Ghi chú nội bộ:</span>
                                        <span className="spec-notes">{post.notes}</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="detail-actions">
                            <button className="back-btn" onClick={() => navigate("/blogs")}>
                                Quay lại danh sách
                            </button>
                            <button className="btn-primary" onClick={handleEditClick}>
                                Chỉnh sửa bài viết
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==========================================
          MODAL FORM CẬP NHẬT BÀI VIẾT
          ========================================== */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-blogs">
                        <div className="modal-header">
                            <h2>Chỉnh sửa Bài viết</h2>
                            <button className="close-modal-btn" onClick={() => !isSubmitting && setIsModalOpen(false)}>
                                ×
                            </button>
                        </div>

                        <form className="modal-form" onSubmit={handleUpdateSubmit}>
                            <div className="form-grid-blog">
                                {/* Cột trái */}
                                <div className="form-column-left">
                                    <div className="form-group">
                                        <label>
                                            Tiêu đề bài viết <span className="required">*</span>
                                        </label>
                                        <input type="text" name="title" required placeholder="Nhập tiêu đề..." value={formData.title} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            Đường dẫn bài viết (URL) <span className="required">*</span>
                                        </label>
                                        <input type="url" name="externalUrl" required placeholder="https://..." value={formData.externalUrl} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>

                                    <div className="form-group">
                                        <label>Mô tả ngắn (SEO)</label>
                                        <textarea name="description" rows="5" placeholder="Mô tả SEO..." value={formData.description} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                    </div>

                                    <div className="form-group">
                                        <label>Hình ảnh (Thumbnail)</label>
                                        <div className="image-upload-container">
                                            {imagePreview ? (
                                                <div className="image-preview-box blog-preview-box">
                                                    <img src={imagePreview} alt="Preview" className="blog-preview-img" />
                                                    <button type="button" className="remove-img-btn" onClick={removeImage}>
                                                        ×
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="image-upload-btn blog-upload-btn" onClick={() => fileInputRef.current.click()}>
                                                    <span>+ Tải ảnh</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" accept="image/*" ref={fileInputRef} className="hidden-file-input" onChange={handleImageChange} />
                                    </div>
                                </div>

                                {/* Cột phải */}
                                <div className="form-column-right">
                                    <h3 className="form-sub-title">Cài đặt & Phân loại</h3>

                                    <div className="form-group">
                                        <label>Loại Dịch Vụ (Service Type)</label>
                                        <select name="serviceType" value={formData.serviceType} onChange={handleInputChange} disabled={isSubmitting}>
                                            <option value="NHA KHOA">Nha Khoa</option>
                                            <option value="THẨM MỸ">Thẩm Mỹ</option>
                                            <option value="SPA">Spa</option>
                                            <option value="DA LIỄU">Da Liễu</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Loại Bài (Post Type)</label>
                                        <select name="postType" value={formData.postType} onChange={handleInputChange} disabled={isSubmitting}>
                                            <option value="Bài SEO">Bài SEO</option>
                                            <option value="Tin tức">Tin tức</option>
                                            <option value="Khuyến mãi">Khuyến mãi</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Trạng thái</label>
                                        <select name="status" value={formData.status} onChange={handleInputChange} disabled={isSubmitting}>
                                            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                                            <option value="INACTIVE">Ẩn (INACTIVE)</option>
                                        </select>
                                    </div>

                                    <div className="blog-checkbox-row">
                                        <div className="checkbox-item">
                                            <input type="checkbox" id="isFeatured" name="isFeatured" checked={formData.isFeatured} onChange={handleInputChange} disabled={isSubmitting} className="blog-checkbox" />
                                            <label htmlFor="isFeatured" className="blog-checkbox-label">
                                                Bài nổi bật (⭐)
                                            </label>
                                        </div>
                                        <div className="checkbox-item">
                                            <input type="checkbox" id="isPinned" name="isPinned" checked={formData.isPinned} onChange={handleInputChange} disabled={isSubmitting} className="blog-checkbox" />
                                            <label htmlFor="isPinned" className="blog-checkbox-label">
                                                Ghim lên đầu (📌)
                                            </label>
                                        </div>
                                    </div>

                                    <div className="form-group blog-notes-group">
                                        <label>Ghi chú nội bộ</label>
                                        <textarea name="notes" rows="4" placeholder="Chỉ Admin xem được..." value={formData.notes} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                                    Hủy bỏ
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlogDetail;