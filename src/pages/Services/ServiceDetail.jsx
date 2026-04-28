// src/pages/Services/ServiceDetail.jsx
import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // 🟢 THÊM IMPORT
import { serviceApi } from "../../api/axiosApi";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Modal from "../../ui/Modal/Modal";
import ReactSelect from "react-select";
import "./ServiceDetail.css";

const FALLBACK_IMG = "https://via.placeholder.com/400x400?text=No+Image";

const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeImage, setActiveImage] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const fileInputRef = useRef(null);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const initialForm = {
        serviceId: "",
        name: "",
        price: "",
        unit: "cái",
        description: "",
        manufacturer: "",
        warranty_period: "",
        hardness: "",
        transparency: "",
    };
    const [formData, setFormData] = useState(initialForm);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [oldImageUrls, setOldImageUrls] = useState([]);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // REACT QUERY: FETCH DỮ LIỆU
    // ==========================================
    const { data, isLoading, error } = useQuery({
        queryKey: ["serviceDetail", id],
        queryFn: async () => {
            // Gọi song song 2 API để tiết kiệm thời gian chờ
            const [serviceRes, variantRes] = await Promise.all([serviceApi.getAllServices(), serviceApi.getVariantById(id)]);

            const rawServices = serviceRes?.data?.services || [];
            const product = variantRes?.data?.variant;

            if (!product) throw new Error("Không tìm thấy thông tin sản phẩm.");

            let images = [];
            if (product.imageUrls && product.imageUrls.length > 0) {
                images = product.imageUrls;
            } else if (product.serviceId?.thumbnailUrl) {
                images = [product.serviceId.thumbnailUrl];
            } else {
                images = [FALLBACK_IMG];
            }

            return { product, rawServices, images };
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // Giữ cache 5 phút
    });

    const product = data?.product;
    const rawServices = data?.rawServices || [];
    const images = data?.images || [FALLBACK_IMG];

    // ==========================================
    // REACT QUERY: MUTATION (Cập nhật)
    // ==========================================
    const updateMutation = useMutation({
        mutationFn: (submitData) => serviceApi.updateVariant(id, submitData),
        onSuccess: (res) => {
            const serverVariant = res.data?.variant || res.data;
            const selectedService = rawServices.find((s) => s._id === formData.serviceId);
            const updatedImageUrls = serverVariant?.imageUrls || [...oldImageUrls, ...imagePreviews];

            // CẬP NHẬT CACHE CỦA TRANG DETAIL
            queryClient.setQueryData(["serviceDetail", id], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    product: {
                        ...old.product,
                        name: formData.name,
                        price: Number(formData.price),
                        unit: formData.unit,
                        description: formData.description,
                        manufacturer: formData.manufacturer,
                        warranty_period: formData.warranty_period,
                        hardness: formData.hardness,
                        transparency: formData.transparency,
                        serviceId: selectedService ? { _id: selectedService._id, name: selectedService.name } : old.product.serviceId,
                        imageUrls: updatedImageUrls,
                    },
                    images: updatedImageUrls.length > 0 ? updatedImageUrls : [FALLBACK_IMG],
                };
            });

            // VÔ HIỆU HOÁ CACHE DANH SÁCH (Để khi bấm nút "Back", ds ngoài kia cập nhật luôn)
            queryClient.invalidateQueries({ queryKey: ["servicesAndVariants"] });

            showToast("Cập nhật sản phẩm thành công!");
            setIsModalOpen(false);
            setImageFiles([]);
            setImagePreviews([]);
            setOldImageUrls([]);
            setActiveImage(0);

            // Fetch lại để chắc chắn khớp Backend 100%
            queryClient.invalidateQueries({ queryKey: ["serviceDetail", id] });
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.message || "Lỗi kết nối đến máy chủ";
            showToast(errorMsg, "error");
        },
    });

    const isSubmitting = updateMutation.isPending;

    // ==========================================
    // XỬ LÝ ẢNH & HANDLERS
    // ==========================================
    const handleAddImageClick = () => fileInputRef.current.click();

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const totalImages = oldImageUrls.length + imageFiles.length + files.length;
        if (totalImages > 5) return showToast("Chỉ được phép upload tối đa 5 ảnh!", "error");

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
        });
        setImageFiles([]);
        setImagePreviews([]);
        setOldImageUrls(product.imageUrls || []);
        setIsModalOpen(true);
    };

    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        if (!formData.serviceId) return showToast("Vui lòng chọn Danh mục dịch vụ!", "error");

        const submitData = new FormData();

        // 1. Gửi các thông tin text bình thường
        Object.keys(formData).forEach((key) => {
            if (key === "image" || key === "images" || key === "imageUrls" || key === "existingUrls") return;
            if (formData[key] !== null && formData[key] !== undefined && formData[key] !== "") {
                submitData.append(key, formData[key]);
            }
        });

        // 2. 🟢 ĐỒNG BỘ LOGIC: Gửi danh sách ảnh cũ bằng key "existingUrls" giống trang Services
        submitData.append("existingUrls", JSON.stringify(oldImageUrls));

        // 3. Xử lý các file ảnh MỚI được thêm vào
        if (imageFiles && imageFiles.length > 0) {
            Array.from(imageFiles).forEach((file) => submitData.append("image", file));
        }

        updateMutation.mutate(submitData);
    };

    // ==========================================
    // CẤU HÌNH UI (React-Select)
    // ==========================================
    const formServiceOptions = rawServices.map((srv) => ({ value: srv._id, label: srv.name }));
    const customSelectStyles = {
        control: (provided, state) => ({ ...provided, minHeight: "38px", borderRadius: "6px", fontSize: "14px", borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db", boxShadow: "none", "&:hover": { borderColor: "var(--primary-color)" }, backgroundColor: "#fff" }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white", color: state.isSelected ? "var(--primary-color)" : "#374151", cursor: "pointer", margin: "4px", borderRadius: "6px", fontSize: "14px", width: "96%" }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({ ...provided, overflowX: "hidden" }),
    };

    // Render States
    if (isLoading) return <div className="z-service-detail-state">Đang tải chi tiết sản phẩm...</div>;
    if (error) return <div className="z-service-detail-state z-service-detail-error">{error.message || "Đã có lỗi xảy ra."}</div>;
    if (!product) return <div className="z-service-detail-state">Không có dữ liệu.</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Sản phẩm & Biến thể", path: "/services" }, { label: "Chi tiết sản phẩm" }]} title="Chi tiết sản phẩm" description="Xem và chỉnh sửa thông tin chi tiết của sản phẩm." />

            <div className="z-service-detail-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-service-detail-card">
                    <div className="z-service-detail-layout">
                        {/* --- CỘT TRÁI (HÌNH ẢNH) --- */}
                        <div className="z-service-detail-left">
                            <div className="z-service-detail-main-img-container">
                                <img
                                    src={images[activeImage]}
                                    alt={product.name}
                                    className="z-service-detail-main-img"
                                    onError={(e) => {
                                        e.target.src = FALLBACK_IMG;
                                    }}
                                />
                            </div>

                            {images.length > 1 && (
                                <div className="z-service-detail-thumb-list">
                                    {images.map((img, index) => (
                                        <div key={index} className={`z-service-detail-thumb-item ${activeImage === index ? "active" : ""}`} onClick={() => setActiveImage(index)}>
                                            <img src={img} alt={`thumb-${index}`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* --- CỘT PHẢI (THÔNG TIN) --- */}
                        <div className="z-service-detail-right">
                            <div className="z-service-detail-header-info">
                                <span className="z-service-detail-badge">{product.serviceId?.name || "Dịch vụ"}</span>
                                <h1 className="z-service-detail-title">{product.name}</h1>

                                <div className="z-service-detail-price">
                                    {Number(product.price || 0).toLocaleString("vi-VN")} đ<span className="z-service-detail-unit">{product.unit ? `/ ${product.unit}` : ""}</span>
                                </div>
                            </div>

                            <div className="z-service-detail-section">
                                <h3>Mô tả sản phẩm</h3>
                                <p className="z-service-detail-desc">{product.description || "Chưa có mô tả cho sản phẩm này."}</p>
                            </div>

                            <div className="z-service-detail-specs-box">
                                <h3>Thông số kỹ thuật</h3>
                                <ul className="z-service-detail-specs-list">
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

                                {!product.manufacturer && !product.warranty_period && !product.hardness && !product.transparency && <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>Chưa có thông số kỹ thuật.</p>}
                            </div>

                            <div className="z-service-detail-actions">
                                <button className="z-service-detail-btn-back" onClick={() => navigate("/services")}>
                                    Quay lại danh sách
                                </button>
                                <button className="z-service-detail-btn-primary" onClick={handleEditClick} disabled={isSubmitting}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Chỉnh sửa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MODAL CẬP NHẬT */}
                <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title="Cập nhật Sản phẩm" size="lg" onSave={handleUpdateSubmit} saveText={isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}>
                    <div className="z-service-detail-form">
                        <div className="z-service-detail-form-grid">
                            {/* CỘT TRÁI */}
                            <div className="z-service-detail-form-col">
                                <div className="z-service-detail-form-group">
                                    <label>
                                        Danh mục Dịch vụ <span className="z-service-detail-required">*</span>
                                    </label>
                                    <ReactSelect options={formServiceOptions} value={formServiceOptions.find((opt) => opt.value === formData.serviceId) || null} onChange={(selected) => setFormData({ ...formData, serviceId: selected ? selected.value : "" })} isDisabled={isSubmitting} styles={customSelectStyles} placeholder="-- Chọn dịch vụ --" isSearchable={true} menuPosition="fixed" />
                                </div>

                                <div className="z-service-detail-form-group">
                                    <label>
                                        Tên sản phẩm <span className="z-service-detail-required">*</span>
                                    </label>
                                    <input type="text" className="z-service-detail-input" required placeholder="VD: Implant Zygoma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-service-detail-form-row">
                                    <div className="z-service-detail-form-group" style={{ flex: 1 }}>
                                        <label>
                                            Giá (VNĐ) <span className="z-service-detail-required">*</span>
                                        </label>
                                        <input type="number" className="z-service-detail-input" required min="0" placeholder="VD: 45000000" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-service-detail-form-group" style={{ flex: 1 }}>
                                        <label>Đơn vị</label>
                                        <input type="text" className="z-service-detail-input" placeholder="VD: cái, răng" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} disabled={isSubmitting} />
                                    </div>
                                </div>

                                <div className="z-service-detail-form-group">
                                    <label>Mô tả chi tiết</label>
                                    <textarea className="z-service-detail-textarea" rows="4" placeholder="Nhập mô tả sản phẩm..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isSubmitting}></textarea>
                                </div>
                            </div>

                            {/* CỘT PHẢI */}
                            <div className="z-service-detail-form-col">
                                <h3 className="z-service-detail-form-title">Thông số kỹ thuật</h3>

                                <div className="z-service-detail-form-group">
                                    <label>Xuất xứ / Hãng SX</label>
                                    <input type="text" className="z-service-detail-input" placeholder="VD: Đức, Mỹ" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-service-detail-form-group">
                                    <label>Thời gian bảo hành</label>
                                    <input type="text" className="z-service-detail-input" placeholder="VD: 10 năm" value={formData.warranty_period} onChange={(e) => setFormData({ ...formData, warranty_period: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-service-detail-form-group">
                                    <label>Độ cứng (Mpa)</label>
                                    <input type="text" className="z-service-detail-input" placeholder="VD: 500-530Mpa" value={formData.hardness} onChange={(e) => setFormData({ ...formData, hardness: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-service-detail-form-group">
                                    <label>Độ trong suốt</label>
                                    <input type="text" className="z-service-detail-input" placeholder="VD: Cao, tự nhiên" value={formData.transparency} onChange={(e) => setFormData({ ...formData, transparency: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <h3 className="z-service-detail-form-title" style={{ marginTop: "12px" }}>
                                    Thư viện Ảnh
                                </h3>
                                <div className="z-service-detail-form-group">
                                    <label>Hình ảnh (Tối đa 5 ảnh)</label>
                                    <div className="z-service-detail-upload-wrapper">
                                        {oldImageUrls.map((url, index) => (
                                            <div key={`old-${index}`} className="z-service-detail-img-box">
                                                <img src={url} alt={`old-preview-${index}`} />
                                                <button type="button" className="z-service-detail-remove-btn" onClick={() => removeOldImage(index)}>
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {imagePreviews.map((src, index) => (
                                            <div key={`new-${index}`} className="z-service-detail-img-box">
                                                <img src={src} alt={`new-preview-${index}`} />
                                                <button type="button" className="z-service-detail-remove-btn" onClick={() => removeNewImage(index)}>
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {oldImageUrls.length + imagePreviews.length < 5 && (
                                            <div className="z-service-detail-add-img-btn" onClick={handleAddImageClick}>
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
            </div>
        </>
    );
};

export default ServiceDetail;
