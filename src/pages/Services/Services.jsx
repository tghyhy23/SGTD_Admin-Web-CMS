// src/pages/Services/Services.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Services.css";
import { serviceApi } from "../../api/axiosApi";

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

const Services = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rawServices, setRawServices] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const [sortOrder, setSortOrder] = useState("none");
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    // STATE CHO MODAL TẠO MỚI/SỬA & TOAST MESSAGE
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // STATE CHO TÍNH NĂNG CẬP NHẬT
    const [isEditMode, setIsEditMode] = useState(false);
    const [editProductId, setEditProductId] = useState(null);

    // THÊM MỚI: STATE CHO MODAL XÓA
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    // State Form Data
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

    const navigate = useNavigate();

    // FETCH DỮ LIỆU
    const fetchAllProducts = async () => {
        setIsLoading(true);
        try {
            const serviceRes = await serviceApi.getAllServices();

            if (serviceRes && serviceRes.data && serviceRes.data.services) {
                const servicesData = serviceRes.data.services;
                setRawServices(servicesData);

                const uniqueCategories = Array.from(new Set(servicesData.map((s) => s.name)));
                setCategories(uniqueCategories);

                const productPromises = servicesData.map(async (service) => {
                    try {
                        const res = await serviceApi.getVariantsByServiceId(service._id);
                        if (res && res.success) {
                            return res.data.variants.map((variant) => ({
                                id: variant._id,
                                name: variant.name,
                                price: variant.price,
                                unit: variant.unit,
                                description: variant.description,
                                image: variant.imageUrls && variant.imageUrls.length > 0 ? variant.imageUrls[0] : service.thumbnailUrl,
                                category: service.name,
                                serviceId: service._id,
                                manufacturer: variant.manufacturer || "",
                                warranty_period: variant.warranty_period || "",
                                hardness: variant.hardness || "",
                                transparency: variant.transparency || "",
                                imageUrls: variant.imageUrls || [],
                            }));
                        }
                        return [];
                    } catch (err) {
                        console.error(`Lỗi lấy variant cho service ${service._id}:`, err);
                        return [];
                    }
                });

                const results = await Promise.all(productPromises);
                const flatProducts = results.flat();

                setAllProducts(flatProducts);
            }
        } catch (err) {
            setError("Không thể tải danh sách dịch vụ");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllProducts();
    }, []);

    // LOGIC TOAST MESSAGE VÀ UPLOAD ẢNH (PREVIEW)
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

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

    // ==========================================
    // GIỮ NGUYÊN HÀM TẠO SẢN PHẨM CŨ CỦA BẠN
    // ==========================================
    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        if (!formData.serviceId) {
            return showToast("Vui lòng chọn Danh mục dịch vụ!", "error");
        }

        setIsSubmitting(true);

        try {
            const submitData = new FormData();

            Object.keys(formData).forEach((key) => {
                if (key === "image" || key === "images") return;
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== "") {
                    submitData.append(key, formData[key]);
                }
            });

            if (imageFiles && imageFiles.length > 0) {
                Array.from(imageFiles).forEach((file) => {
                    submitData.append("image", file);
                });
            }

            const response = await serviceApi.createVariant(submitData);

            if (response && response.success) {
                showToast("Tạo sản phẩm thành công!");
                setIsModalOpen(false);
                setFormData(initialForm);
                setImageFiles([]);
                setImagePreviews([]);
                fetchAllProducts();
            } else {
                showToast(response?.message || "Lỗi tạo sản phẩm", "error");
            }
        } catch (error) {
            console.error("Lỗi createVariant:", error);
            const errorMsg = error.response?.data?.message || "Lỗi kết nối đến máy chủ";
            showToast(errorMsg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // CẬP NHẬT HÀM SỬA SẢN PHẨM
    // ==========================================
    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!formData.serviceId) {
            return showToast("Vui lòng chọn Danh mục dịch vụ!", "error");
        }

        setIsSubmitting(true);
        try {
            const submitData = new FormData();

            // 1. Gắn các trường text
            Object.keys(formData).forEach((key) => {
                if (key === "image" || key === "images") return;
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== "") {
                    submitData.append(key, formData[key]);
                }
            });

            // 2. Gắn URL ảnh cũ (nếu có).
            // Gửi mảng chuỗi lên với key là "images" (vì Backend loop qua updates.images)
            if (oldImageUrls && oldImageUrls.length > 0) {
                oldImageUrls.forEach((url) => {
                    submitData.append("images", url); // <--- Key là "images"
                });
            }

            // 3. Gắn File ảnh mới (nếu có).
            // LƯU Ý: Backend ở route Update có dùng upload.array('image', 5) giống Create không?
            // Nếu có, key ở đây phải là "image" (giống lúc Create bạn đã làm).
            if (imageFiles && imageFiles.length > 0) {
                Array.from(imageFiles).forEach((file) => {
                    submitData.append("image", file); // <--- Key là "image" (để Multer nhận)
                });
            }

            // DEBUG DỮ LIỆU TRƯỚC KHI GỬI
            console.log("=== FORMDATA UPDATE GỬI ĐI ===");
            for (let [key, value] of submitData.entries()) {
                console.log(`${key}:`, value);
            }

            const response = await serviceApi.updateVariant(editProductId, submitData);

            if (response && response.success) {
                showToast("Cập nhật sản phẩm thành công!");
                setIsModalOpen(false);
                setFormData(initialForm);
                setImageFiles([]);
                setImagePreviews([]);
                setOldImageUrls([]);
                setIsEditMode(false);
                setEditProductId(null);
                fetchAllProducts();
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

    // ==========================================
    // THÊM MỚI: LOGIC CHUẨN BỊ XÓA (MỞ MODAL XÓA)
    // ==========================================
    const handleDeleteClick = (e, id, name) => {
        e.stopPropagation();
        setProductToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    // ==========================================
    // THÊM MỚI: THỰC THI XÓA SẢN PHẨM
    // ==========================================
    const confirmDelete = async () => {
        if (!productToDelete) return;

        setIsSubmitting(true);
        try {
            const response = await serviceApi.deleteVariant(productToDelete.id);
            if (response && response.success) {
                showToast("Xóa sản phẩm thành công!", "success");
                setIsDeleteModalOpen(false);
                setProductToDelete(null);
                fetchAllProducts();
            } else {
                showToast(response?.message || "Lỗi xóa sản phẩm", "error");
            }
        } catch (error) {
            console.error("Lỗi deleteVariant:", error);
            const errorMsg = error.response?.data?.message || "Không thể xóa sản phẩm lúc này";
            showToast(errorMsg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // MỞ FORM CHỈNH SỬA
    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditProductId(item.id);

        setFormData({
            serviceId: item.serviceId || "",
            name: item.name || "",
            price: item.price || "",
            unit: item.unit || "cái",
            description: item.description || "",
            manufacturer: item.manufacturer || "",
            warranty_period: item.warranty_period || "",
            hardness: item.hardness || "",
            transparency: item.transparency || "",
        });

        setImageFiles([]);
        setImagePreviews([]); // Đảm bảo clear preview mới
        setOldImageUrls(item.imageUrls || []); // Set ảnh cũ
        setIsModalOpen(true);
    };

    // LOGIC TƯƠNG TÁC UI (LỌC, SẮP XẾP)
    const handleRowClick = (productId) => {
        navigate(`/services/${productId}`);
    };

    const filteredProducts = allProducts
        .filter((product) => {
            const normalizedSearchTerm = removeVietnameseTones(searchTerm);
            const normalizedProductName = removeVietnameseTones(product.name);
            const normalizedCategoryName = removeVietnameseTones(product.category);

            const matchesSearch = normalizedProductName.includes(normalizedSearchTerm) || normalizedCategoryName.includes(normalizedSearchTerm);
            const matchesCategory = selectedCategory === "" || product.category === selectedCategory;

            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            if (sortOrder === "asc") return a.price - b.price;
            if (sortOrder === "desc") return b.price - a.price;
            return 0;
        });

    const getSortLabel = () => {
        if (sortOrder === "asc") return "Giá: Thấp đến cao";
        if (sortOrder === "desc") return "Giá: Cao đến thấp";
        return "Sắp xếp theo giá";
    };

    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Dịch vụ & Sản phẩm</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input type="text" placeholder="Tìm kiếm dịch vụ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowSortDropdown(false);
                            }}
                        >
                            <span>{selectedCategory === "" ? "Tất cả danh mục" : selectedCategory}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {showFilterDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className={`filter-option ${selectedCategory === "" ? "active" : ""}`}
                                    onClick={() => {
                                        setSelectedCategory("");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Tất cả danh mục
                                </div>
                                {categories.map((cat, index) => (
                                    <div
                                        key={index}
                                        className={`filter-option ${selectedCategory === cat ? "active" : ""}`}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setShowFilterDropdown(false);
                                        }}
                                    >
                                        {cat}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            style={{ minWidth: "180px" }}
                            onClick={() => {
                                setShowSortDropdown(!showSortDropdown);
                                setShowFilterDropdown(false);
                            }}
                        >
                            <span>{getSortLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {showSortDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className={`filter-option ${sortOrder === "none" ? "active" : ""}`}
                                    onClick={() => {
                                        setSortOrder("none");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    Mặc định
                                </div>
                                <div
                                    className={`filter-option ${sortOrder === "asc" ? "active" : ""}`}
                                    onClick={() => {
                                        setSortOrder("asc");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    Giá: Thấp đến cao
                                </div>
                                <div
                                    className={`filter-option ${sortOrder === "desc" ? "active" : ""}`}
                                    onClick={() => {
                                        setSortOrder("desc");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    Giá: Cao đến thấp
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MỞ MODAL KHI CLICK THÊM MỚI (Reset form) */}
                    <button
                        className="add-btn"
                        onClick={() => {
                            setIsEditMode(false);
                            setEditProductId(null);
                            setFormData(initialForm);
                            setImageFiles([]);
                            setImagePreviews([]);
                            setOldImageUrls([]);
                            setIsModalOpen(true);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-icon lucide-plus" style={{ marginRight: "6px" }}>
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                        </svg>
                        <span>Thêm mới</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Hình ảnh</th>
                            <th>Tên sản phẩm</th>
                            <th>Danh mục</th>
                            <th>Giá</th>
                            <th>Đơn vị</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((item, index) => (
                            <tr key={item.id} onClick={() => handleRowClick(item.id)} className="clickable-row">
                                <td>{index + 1}</td>
                                <td className="td-image">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="product-image"
                                        onError={(e) => {
                                            e.target.src = "https://via.placeholder.com/150";
                                        }}
                                    />
                                </td>
                                <td>
                                    <div className="product-name">{item.name}</div>
                                    <div className="product-desc" title={item.description}>
                                        {item.description}
                                    </div>
                                </td>
                                <td>
                                    <span className="category-badge">{item.category}</span>
                                </td>
                                <td>
                                    <span className="product-price">{item.price?.toLocaleString("vi-VN")} đ</span>
                                </td>
                                <td>
                                    <span className="product-unit">{item.unit || "-"}</span>
                                </td>
                                <td>
                                    <div className="action-row">
                                        <button className="action-btn btn-edit" onClick={(e) => handleEditClick(e, item)}>
                                            Sửa
                                        </button>
                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, item.id, item.name)}>
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredProducts.length === 0 && <div className="state-message">Không tìm thấy sản phẩm nào phù hợp.</div>}
            </div>

            {/* MODAL FORM */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{isEditMode ? "Cập nhật Sản phẩm/Dịch vụ" : "Thêm mới Sản phẩm/Dịch vụ"}</h2>
                            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
                                ×
                            </button>
                        </div>

                        {/* ĐỔI LOGIC ONSUBMIT DỰA VÀO CHẾ ĐỘ THÊM HOẶC SỬA */}
                        <form className="modal-form" onSubmit={isEditMode ? handleUpdateSubmit : handleCreateSubmit}>
                            <div className="form-grid">
                                {/* Cột trái */}
                                <div className="form-column-left">
                                    <div className="form-group">
                                        <label>
                                            Danh mục Dịch vụ <span className="required">*</span>
                                        </label>
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
                                        <label>
                                            Tên sản phẩm <span className="required">*</span>
                                        </label>
                                        <input type="text" required placeholder="VD: Implant Zygoma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>

                                    <div className="form-row-2">
                                        <div className="form-group">
                                            <label>
                                                Giá (VNĐ) <span className="required">*</span>
                                            </label>
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
                                            {/* HIỂN THỊ ẢNH CŨ */}
                                            {oldImageUrls.map((url, index) => (
                                                <div key={`old-${index}`} className="image-preview-box">
                                                    <img src={url} alt={`old-preview-${index}`} />
                                                    <button type="button" className="remove-img-btn" onClick={() => removeOldImage(index)}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))}

                                            {/* HIỂN THỊ ẢNH MỚI */}
                                            {imagePreviews.map((src, index) => (
                                                <div key={`new-${index}`} className="image-preview-box">
                                                    <img src={src} alt={`new-preview-${index}`} />
                                                    <button type="button" className="remove-img-btn" onClick={() => removeNewImage(index)}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))}

                                            {oldImageUrls.length + imagePreviews.length < 5 && (
                                                <div className="image-upload-btn" onClick={() => fileInputRef.current.click()}>
                                                    <span>+ Tải ảnh</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} />
                                    </div>
                                </div>

                                {/* Cột phải: Các thông số khác */}
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
                                    {isSubmitting ? "Đang xử lý..." : isEditMode ? "Lưu thay đổi" : "Lưu sản phẩm"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================
                THÊM MỚI: MODAL XÁC NHẬN XÓA
                ========================================== */}
            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-delete">
                        <h3 className="delete-header">Xác nhận xóa</h3>

                        <p className="delete-message">
                            Bạn có chắc chắn muốn xóa sản phẩm <br />
                            <strong className="delete-product-name">"{productToDelete?.name}"</strong> không?
                            <span className="delete-warning">Hành động này không thể hoàn tác!</span>
                        </p>

                        <div className="modal-footer-delete">
                            <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
                                Hủy bỏ
                            </button>
                            <button className="btn-danger" onClick={confirmDelete} disabled={isSubmitting}>
                                {isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
