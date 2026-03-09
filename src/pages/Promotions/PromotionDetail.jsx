import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { promotionApi, clinicApi, serviceApi } from "../../api/axiosApi";
import "../Clinics/ClinicDetail.css"; // Dùng chung CSS với ClinicDetail
import "./Promotions.css"; // Dùng chung form CSS với Promotions

const FALLBACK_IMG = "https://via.placeholder.com/600x400?text=No+Banner+Image";

const PromotionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // ==========================================
    // STATE CHI TIẾT KHUYẾN MÃI
    // ==========================================
    const [promotion, setPromotion] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ==========================================
    // STATE MODAL & FORM CẬP NHẬT
    // ==========================================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const fileInputRef = useRef(null);

    // Dữ liệu tham chiếu cho Form
    const [branches, setBranches] = useState([]);
    const [services, setServices] = useState([]);

    const [formData, setFormData] = useState({
        name: "", code: "", description: "", branchId: "", isActive: true,
        bannerImageUrl: "", badgeText: "", details: "", terms: "",
        discountType: "percentage", discountValue: 0, maxDiscountAmount: "", minOrderValue: 0,
        startDate: "", endDate: "", usageLimit: "", limitPerUser: "", applicableServiceIds: []
    });

    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState("");

    // ==========================================
    // FETCH DỮ LIỆU
    // ==========================================
    const fetchDetail = async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const res = await promotionApi.getPromotionDetail(id);
            if (res && res.success) {
                setPromotion(res.data);
            } else {
                setError("Không tìm thấy thông tin khuyến mãi.");
            }
        } catch (err) {
            console.error("Lỗi lấy chi tiết:", err);
            setError("Lỗi khi tải dữ liệu từ máy chủ.");
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    const fetchReferenceData = async () => {
        try {
            const [branchRes, serviceRes] = await Promise.all([
                clinicApi.getAllClinics({ limit: 100 }), 
                serviceApi.getAllServices()
            ]);
            if (branchRes && branchRes.success) setBranches(branchRes.data.branches || []);
            if (serviceRes && serviceRes.data) setServices(serviceRes.data.services || []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu tham chiếu:", error);
        }
    };

    useEffect(() => {
        if (id) {
            fetchDetail();
            fetchReferenceData();
        }
    }, [id]);

    // ==========================================
    // LOGIC TOAST
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // LOGIC FORM & CẬP NHẬT
    // ==========================================
    const handleEditClick = () => {
        if (!promotion) return;
        setFormData({
            name: promotion.name || "",
            code: promotion.code || "",
            description: promotion.description || "",
            branchId: promotion.branchId?._id || promotion.branchId || "",
            isActive: promotion.isActive !== undefined ? promotion.isActive : true,
            bannerImageUrl: promotion.bannerImageUrl || "",
            badgeText: promotion.badgeText || "",
            details: promotion.details?.join("\n") || "",
            terms: promotion.terms?.join("\n") || "",
            discountType: promotion.discountType || "percentage",
            discountValue: promotion.discountValue || 0,
            maxDiscountAmount: promotion.maxDiscountAmount || "",
            minOrderValue: promotion.minOrderValue || 0,
            startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().slice(0, 16) : "",
            endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().slice(0, 16) : "",
            usageLimit: promotion.usageLimit || "",
            limitPerUser: promotion.limitPerUser || "",
            applicableServiceIds: promotion.applicableServiceIds?.map(s => s._id || s) || []
        });
        setImageFile(null);
        setPreviewImage(promotion.bannerImageUrl || "");
        setIsModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        if (name === "isActive") {
            setFormData(prev => ({ ...prev, [name]: value === "true" }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleServiceCheckboxChange = (serviceId) => {
        setFormData((prev) => {
            const isSelected = prev.applicableServiceIds.includes(serviceId);
            return {
                ...prev,
                applicableServiceIds: isSelected 
                    ? prev.applicableServiceIds.filter((_id) => _id !== serviceId)
                    : [...prev.applicableServiceIds, serviceId]
            };
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setPreviewImage("");
        setFormData((prev) => ({ ...prev, bannerImageUrl: "" }));
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                discountValue: Number(formData.discountValue),
                maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
                minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : 0,
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                limitPerUser: formData.limitPerUser ? Number(formData.limitPerUser) : null,
                details: formData.details ? formData.details.split("\n").filter(d => d.trim() !== "") : [],
                terms: formData.terms ? formData.terms.split("\n").filter(t => t.trim() !== "") : []
            };

            const res = await promotionApi.updatePromotion(id, payload);
            if (res && res.success) {
                await fetchDetail(true);
                showToast("Cập nhật khuyến mãi thành công!");
                setIsModalOpen(false);
            } else {
                showToast(res?.message || "Lỗi cập nhật", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi lưu khuyến mãi", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // HELPER UI
    // ==========================================
    const formatDiscount = (type, value) => {
        if (type === "percentage") return `${value}%`;
        return `${value.toLocaleString("vi-VN")} đ`;
    };

    const getStatusBadge = (isActive) => {
        return isActive 
            ? <span className="category-badge" style={{ backgroundColor: '#dcfce7', color: '#059669', borderColor: '#059669' }}>Đang bật</span>
            : <span className="category-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}>Đang tắt</span>;
    };

    // ==========================================
    // RENDER UI
    // ==========================================
    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;
    if (!promotion) return <div className="state-message">Không có dữ liệu.</div>;

    return (
        <div className="page-container">
            {toast.show && (
                <div className={`toast-message fixed-toast ${toast.type}`} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>×</button>
                </div>
            )}

            <div className="breadcrumb">
                <span onClick={() => navigate("/promotions")} className="breadcrumb-link">Quản lý Khuyến mãi</span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">Chi tiết Khuyến mãi</span>
            </div>

            {/* CARD THÔNG TIN KHUYẾN MÃI */}
            <div className="service-detail-card page-card">
                <div className="detail-layout">
                    {/* BÊN TRÁI: ẢNH BANNER */}
                    <div className="detail-left">
                        <div className="main-image-container" style={{ aspectRatio: '16/9' }}>
                            <img 
                                src={promotion.bannerImageUrl || FALLBACK_IMG} 
                                alt={promotion.name} 
                                className="main-image" 
                                style={{ objectFit: 'contain', backgroundColor: '#f3f4f6' }}
                                onError={(e) => { e.target.src = FALLBACK_IMG; }} 
                            />
                        </div>
                    </div>

                    {/* BÊN PHẢI: THÔNG TIN CHI TIẾT */}
                    <div className="detail-right">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: '10px' }}>
                            <span className="category-badge detail-badge" style={{ backgroundColor: 'var(--primary-color)', color: 'white', borderColor: 'var(--primary-color)' }}>
                                {promotion.code}
                            </span>
                            {getStatusBadge(promotion.isActive)}
                        </div>
                        
                        <h1 className="detail-title">{promotion.name}</h1>
                        <p className="detail-desc" style={{ color: '#6b7280', marginBottom: '15px' }}>
                            {promotion.description || "Chưa có mô tả ngắn."}
                        </p>

                        <div className="detail-price" style={{ fontSize: "1.5rem", color: "#ef4444" }}>
                            Giảm: {formatDiscount(promotion.discountType, promotion.discountValue)}
                            {promotion.maxDiscountAmount && promotion.discountType === 'percentage' && (
                                <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '10px' }}>
                                    (Tối đa {promotion.maxDiscountAmount.toLocaleString('vi-VN')} đ)
                                </span>
                            )}
                        </div>
                        
                        <div className="detail-section">
                            <h3>Thông số & Giới hạn</h3>
                            <ul className="specs-list">
                                <li>
                                    <span className="spec-label">Chi nhánh:</span>
                                    <span className="spec-value">{promotion.branchId?.name || "Tất cả chi nhánh"}</span>
                                </li>
                                <li>
                                    <span className="spec-label">Đơn tối thiểu:</span>
                                    <span className="spec-value">{promotion.minOrderValue > 0 ? `${promotion.minOrderValue.toLocaleString('vi-VN')} đ` : "Không yêu cầu"}</span>
                                </li>
                                <li>
                                    <span className="spec-label">Lượt dùng:</span>
                                    <span className="spec-value">
                                        Đã dùng: <strong>{promotion.usedCount || 0}</strong> / {promotion.usageLimit || "Không giới hạn"}
                                    </span>
                                </li>
                                <li>
                                    <span className="spec-label">Giới hạn/Khách:</span>
                                    <span className="spec-value">{promotion.limitPerUser || "Không giới hạn"}</span>
                                </li>
                                <li>
                                    <span className="spec-label">Bắt đầu:</span>
                                    <span className="spec-value">{new Date(promotion.startDate).toLocaleString("vi-VN")}</span>
                                </li>
                                <li>
                                    <span className="spec-label">Kết thúc:</span>
                                    <span className="spec-value" style={{ color: '#ef4444', fontWeight: '500' }}>{new Date(promotion.endDate).toLocaleString("vi-VN")}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="detail-actions">
                            <button className="back-btn" onClick={() => navigate("/promotions")}>Quay lại danh sách</button>
                            <button className="btn-primary" onClick={handleEditClick}>Chỉnh sửa khuyến mãi</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==========================================
                MODAL CẬP NHẬT KHUYẾN MÃI (Dùng chung form cũ)
            ========================================== */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-promotion">
                        <div className="modal-header">
                            <h2>Cập nhật Khuyến mãi</h2>
                            <button type="button" className="close-modal-btn" onClick={() => !isSubmitting && setIsModalOpen(false)}>×</button>
                        </div>

                        <form className="modal-form" onSubmit={handleUpdateSubmit}>
                            <div className="form-grid">
                                <div className="form-column-left">
                                    <h3 className="form-sub-title">Thông tin cơ bản</h3>
                                    <div className="form-group">
                                        <label>Chi nhánh áp dụng <span className="required">*</span></label>
                                        <select name="branchId" required value={formData.branchId} onChange={handleFormChange} disabled={isSubmitting}>
                                            <option value="">-- Chọn chi nhánh --</option>
                                            {branches.map((b) => (<option key={b._id} value={b._id}>{b.name}</option>))}
                                        </select>
                                    </div>
                                    <div style={{ display: "flex", gap: "15px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Mã KM (Code) <span className="required">*</span></label>
                                            <input type="text" name="code" required value={formData.code} onChange={handleFormChange} disabled={true} style={{ textTransform: "uppercase", backgroundColor: '#f3f4f6' }} />
                                            <small>Không thể sửa mã code</small>
                                        </div>
                                        <div className="form-group" style={{ flex: 2 }}>
                                            <label>Tên Khuyến mãi <span className="required">*</span></label>
                                            <input type="text" name="name" required value={formData.name} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Mô tả ngắn gọn</label>
                                        <textarea name="description" rows="2" value={formData.description} onChange={handleFormChange} disabled={isSubmitting}></textarea>
                                    </div>

                                    <h3 className="form-sub-title" style={{ marginTop: "20px" }}>Thiết lập giảm giá</h3>
                                    <div style={{ display: "flex", gap: "15px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Loại giảm giá</label>
                                            <select name="discountType" value={formData.discountType} onChange={handleFormChange} disabled={isSubmitting}>
                                                <option value="percentage">Theo phần trăm (%)</option>
                                                <option value="fixed">Số tiền cố định (VNĐ)</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Giá trị giảm <span className="required">*</span></label>
                                            <input type="number" name="discountValue" required min="1" value={formData.discountValue} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "15px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Giảm tối đa (VNĐ)</label>
                                            <input type="number" name="maxDiscountAmount" value={formData.maxDiscountAmount} onChange={handleFormChange} disabled={isSubmitting || formData.discountType === "fixed"} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Đơn hàng tối thiểu</label>
                                            <input type="number" name="minOrderValue" value={formData.minOrderValue} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Dịch vụ áp dụng</label>
                                        <div className="checkbox-list-container">
                                            {services.map((s) => (
                                                <label key={s._id} className="checkbox-item">
                                                    <input type="checkbox" checked={formData.applicableServiceIds.includes(s._id)} onChange={() => handleServiceCheckboxChange(s._id)} disabled={isSubmitting} />
                                                    <span>{s.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-column-right-promotion">
                                    <h3 className="form-sub-title">Thời gian & Giới hạn</h3>
                                    <div style={{ display: "flex", gap: "15px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Thời gian bắt đầu <span className="required">*</span></label>
                                            <input type="datetime-local" name="startDate" required value={formData.startDate} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Thời gian kết thúc <span className="required">*</span></label>
                                            <input type="datetime-local" name="endDate" required value={formData.endDate} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "15px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Tổng lượt dùng</label>
                                            <input type="number" name="usageLimit" placeholder="∞" min="1" value={formData.usageLimit} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Lượt dùng/Khách</label>
                                            <input type="number" name="limitPerUser" placeholder="∞" min="1" value={formData.limitPerUser} onChange={handleFormChange} disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    <h3 className="form-sub-title" style={{ marginTop: "20px" }}>Hiển thị (Khách)</h3>
                                    <div className="form-group">
                                        <label>Ảnh Banner</label>
                                        <div className="image-upload-container">
                                            {previewImage ? (
                                                <div className="image-preview-box">
                                                    <img src={previewImage} alt="Banner Preview" style={{ maxWidth: "100%", maxHeight: "150px", objectFit: "contain" }} />
                                                    <button type="button" className="remove-img-btn" onClick={removeImage}>×</button>
                                                </div>
                                            ) : (
                                                <div className="image-upload-btn" onClick={() => fileInputRef.current.click()}><span>+ Tải ảnh</span></div>
                                            )}
                                            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Nhãn (Badge)</label>
                                        <input type="text" name="badgeText" value={formData.badgeText} onChange={handleFormChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="form-group">
                                        <label>Chi tiết chương trình</label>
                                        <textarea name="details" rows="2" value={formData.details} onChange={handleFormChange} disabled={isSubmitting}></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Điều khoản</label>
                                        <textarea name="terms" rows="2" value={formData.terms} onChange={handleFormChange} disabled={isSubmitting}></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Trạng thái</label>
                                        <select name="isActive" value={formData.isActive.toString()} onChange={handleFormChange} disabled={isSubmitting}>
                                            <option value="true">Bật (Sẽ chạy nếu đến ngày)</option>
                                            <option value="false">Tắt (Tạm dừng/Lưu nháp)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
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

export default PromotionDetail;