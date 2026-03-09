// src/pages/Services/ServiceDetail.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi } from '../../api/axiosApi';
import './ServiceDetail.css';
import './Services.css'; 

const FALLBACK_IMG = 'https://via.placeholder.com/400x400?text=No+Image';

const ServiceDetail = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [images, setImages] = useState([FALLBACK_IMG]);
    const [activeImage, setActiveImage] = useState(0); 
    const [rawServices, setRawServices] = useState([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const initialForm = {
        serviceId: "", name: "", price: "", unit: "cái", description: "",
        manufacturer: "", warranty_period: "", hardness: "", transparency: "",
        maxBookingPerDay: "", displayOrder: "",
    };
    const [formData, setFormData] = useState(initialForm);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [oldImageUrls, setOldImageUrls] = useState([]);

    // ==========================================
    // FETCH DATA (Chỉ gọi 1 lần khi load trang)
    // ==========================================
    const fetchDetail = async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const serviceRes = await serviceApi.getAllServices();
            if (serviceRes && serviceRes.data && serviceRes.data.services) {
                setRawServices(serviceRes.data.services);
            }

            const response = await serviceApi.getVariantById(id);
            if (response && response.success) {
                const variant = response.data.variant;
                setProduct(variant);

                let imgs = [];
                if (variant.imageUrls && variant.imageUrls.length > 0) {
                    imgs = variant.imageUrls;
                } else if (variant.serviceId?.thumbnailUrl) {
                    imgs = [variant.serviceId.thumbnailUrl];
                } else {
                    imgs = [FALLBACK_IMG];
                }
                setImages(imgs);
            } else {
                setError("Không tìm thấy thông tin sản phẩm.");
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

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // XỬ LÝ ẢNH
    // ==========================================
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const totalImages = oldImageUrls.length + imageFiles.length + files.length;
        if (totalImages > 5) {
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

    const handleEditClick = () => {
        setFormData({
            serviceId: product.serviceId?._id || "", 
            name: product.name || "",
            price: product.price || "",
            unit: product.unit || "cái",
            description: product.description || "",
            manufacturer: product.manufacturer || "",
            warranty_period: product.warranty_period || "",
            hardness: product.hardness || "",
            transparency: product.transparency || "",
            maxBookingPerDay: product.maxBookingPerDay || "",
            displayOrder: product.displayOrder || "",
        });
        
        setImageFiles([]);
        setImagePreviews([]); 
        setOldImageUrls(product.imageUrls || []); 
        setIsModalOpen(true);
    };

    // ==========================================
    // CẬP NHẬT (Optimistic UI Update)
    // ==========================================
    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!formData.serviceId) {
            return showToast("Vui lòng chọn Danh mục dịch vụ!", "error");
        }

        setIsSubmitting(true);
        try {
            const submitData = new FormData();

            Object.keys(formData).forEach((key) => {
                if (key === "image" || key === "images" || key === "imageUrls") return; 
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== "") {
                    submitData.append(key, formData[key]);
                }
            });

            // XỬ LÝ ẢNH CŨ VÀ XÓA ẢNH
            if (oldImageUrls.length === 0 && imageFiles.length === 0) {
                submitData.append("images", ""); 
            } else if (oldImageUrls.length > 0) {
                oldImageUrls.forEach(url => {
                    submitData.append("images", url); 
                });
            }

            if (imageFiles && imageFiles.length > 0) {
                Array.from(imageFiles).forEach((file) => {
                    submitData.append("image", file); 
                });
            }

            const response = await serviceApi.updateVariant(id, submitData);

            if (response && response.success) {
                showToast("Cập nhật sản phẩm thành công!");
                
                // --- Optimistic Update Bắt Đầu ---
                const selectedService = rawServices.find(s => s._id === formData.serviceId);
                const updatedImageUrls = [...oldImageUrls, ...imagePreviews];
                
                // Cập nhật state product
                setProduct(prev => ({
                    ...prev,
                    name: formData.name,
                    price: Number(formData.price),
                    unit: formData.unit,
                    description: formData.description,
                    manufacturer: formData.manufacturer,
                    warranty_period: formData.warranty_period,
                    hardness: formData.hardness,
                    transparency: formData.transparency,
                    serviceId: selectedService ? { _id: selectedService._id, name: selectedService.name } : prev.serviceId,
                    imageUrls: updatedImageUrls
                }));

                // Cập nhật state list ảnh (slider bên trái)
                setImages(updatedImageUrls.length > 0 ? updatedImageUrls : [FALLBACK_IMG]);
                setActiveImage(0); // Reset về ảnh đầu tiên
                // --- Optimistic Update Kết Thúc ---

                setIsModalOpen(false);
                setImageFiles([]);
                setImagePreviews([]);
                setOldImageUrls([]);
            } else {
                showToast(response?.message || "Lỗi cập nhật sản phẩm", "error");
            }
        } catch (error) {
            console.error("Lỗi updateVariant:", error);
            const errorMsg = error.response?.data?.message || "Lỗi kết nối đến máy chủ";
            showToast(errorMsg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="state-message">Đang tải chi tiết sản phẩm...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;
    if (!product) return <div className="state-message">Không có dữ liệu.</div>;

    return (
        <div className="page-container">
            {toast.show && (
                <div className={`toast-message ${toast.type}`} style={{position: 'fixed', top: '20px', right: '20px', zIndex: 9999}}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="breadcrumb">
                <span onClick={() => navigate('/services')} className="breadcrumb-link">
                    Quản lý dịch vụ
                </span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">Chi tiết sản phẩm</span>
            </div>

            <div className="service-detail-card page-card">
                <div className="detail-layout">
                    
                    <div className="detail-left">
                        <div className="main-image-container">
                            <img 
                                src={images[activeImage]} 
                                alt={product.name} 
                                className="main-image"
                                onError={(e) => { e.target.src = FALLBACK_IMG }}
                            />
                        </div>
                        
                        {images.length > 1 && (
                            <div className="thumbnail-list">
                                {images.map((img, index) => (
                                    <div 
                                        key={index} 
                                        className={`thumbnail-item ${activeImage === index ? 'active' : ''}`}
                                        onClick={() => setActiveImage(index)}
                                    >
                                        <img src={img} alt={`thumb-${index}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="detail-right">
                        <span className="category-badge detail-badge">
                            {product.serviceId?.name || "Dịch vụ"}
                        </span>
                        <h1 className="detail-title">{product.name}</h1>
                        
                        <div className="detail-price">
                            {product.price?.toLocaleString('vi-VN')} đ {product.unit ? `/ ${product.unit}` : ''}
                        </div>

                        <div className="detail-section">
                            <h3>Mô tả sản phẩm</h3>
                            <p className="detail-description">
                                {product.description || "Chưa có mô tả cho sản phẩm này."}
                            </p>
                        </div>

                        <div className="detail-specs-box">
                            <h3>Thông số kỹ thuật</h3>
                            <ul className="specs-list">
                                {product.manufacturer && (
                                    <li>
                                        <span className="spec-label">Hãng sản xuất:</span>
                                        <span className="spec-value">{product.manufacturer}</span>
                                    </li>
                                )}
                                {product.warranty_period && (
                                    <li>
                                        <span className="spec-label">Bảo hành:</span>
                                        <span className="spec-value">{product.warranty_period}</span>
                                    </li>
                                )}
                                {product.hardness && (
                                    <li>
                                        <span className="spec-label">Độ cứng:</span>
                                        <span className="spec-value">{product.hardness}</span>
                                    </li>
                                )}
                                {product.transparency && (
                                    <li>
                                        <span className="spec-label">Độ trong suốt:</span>
                                        <span className="spec-value">{product.transparency}</span>
                                    </li>
                                )}
                            </ul>
                            
                            {(!product.manufacturer && !product.warranty_period && !product.hardness && !product.transparency) && (
                                <p style={{ color: 'var(--text-muted)' }}>Không có thông số đặc biệt.</p>
                            )}
                        </div>

                        <div className="detail-actions">
                            <button className="back-btn" onClick={() => navigate('/services')}>
                                Quay lại danh sách
                            </button>
                            <button className="btn-primary" onClick={handleEditClick}>
                                Chỉnh sửa sản phẩm
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Cập nhật Sản phẩm/Dịch vụ</h2>
                            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
                                ×
                            </button>
                        </div>

                        <form className="modal-form" onSubmit={handleUpdateSubmit}>
                            <div className="form-grid">
                                <div className="form-column-left">
                                    <div className="form-group">
                                        <label>Danh mục Dịch vụ <span className="required">*</span></label>
                                        <select required value={formData.serviceId} onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}>
                                            <option value="">-- Chọn danh mục --</option>
                                            {rawServices.map((srv) => (
                                                <option key={srv._id} value={srv._id}>
                                                    {srv.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Tên sản phẩm <span className="required">*</span></label>
                                        <input type="text" required placeholder="VD: Implant Zygoma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>

                                    <div className="form-row-2">
                                        <div className="form-group">
                                            <label>Giá (VNĐ) <span className="required">*</span></label>
                                            <input type="number" required min="0" placeholder="VD: 45000000" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Đơn vị</label>
                                            <input type="text" placeholder="VD: cái, răng" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Mô tả chi tiết</label>
                                        <textarea rows="4" placeholder="Nhập mô tả sản phẩm..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                                    </div>

                                    <div className="form-group">
                                        <label>Hình ảnh (Tối đa 5 ảnh)</label>
                                        <div className="image-upload-container">
                                            {oldImageUrls.map((url, index) => (
                                                <div key={`old-${index}`} className="image-preview-box">
                                                    <img src={url} alt={`old-preview-${index}`} />
                                                    <button type="button" className="remove-img-btn" onClick={() => removeOldImage(index)}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))}

                                            {imagePreviews.map((src, index) => (
                                                <div key={`new-${index}`} className="image-preview-box">
                                                    <img src={src} alt={`new-preview-${index}`} />
                                                    <button type="button" className="remove-img-btn" onClick={() => removeNewImage(index)}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))}

                                            {(oldImageUrls.length + imagePreviews.length) < 5 && (
                                                <div className="image-upload-btn" onClick={() => fileInputRef.current.click()}>
                                                    <span>+ Tải ảnh</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} />
                                    </div>
                                </div>

                                <div className="form-column-right">
                                    <h3 className="form-sub-title">Thông số kỹ thuật</h3>

                                    <div className="form-group">
                                        <label>Xuất xứ / Hãng SX</label>
                                        <input type="text" placeholder="VD: Đức, Mỹ" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
                                    </div>

                                    <div className="form-group">
                                        <label>Thời gian bảo hành</label>
                                        <input type="text" placeholder="VD: 10 năm" value={formData.warranty_period} onChange={(e) => setFormData({ ...formData, warranty_period: e.target.value })} />
                                    </div>

                                    <div className="form-group">
                                        <label>Độ cứng (Mpa)</label>
                                        <input type="text" placeholder="VD: 500-530Mpa" value={formData.hardness} onChange={(e) => setFormData({ ...formData, hardness: e.target.value })} />
                                    </div>

                                    <div className="form-group">
                                        <label>Độ trong suốt</label>
                                        <input type="text" placeholder="VD: Cao, tự nhiên" value={formData.transparency} onChange={(e) => setFormData({ ...formData, transparency: e.target.value })} />
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

export default ServiceDetail;