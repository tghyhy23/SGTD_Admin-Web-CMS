// src/pages/Services/Services.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { serviceApi, categoryApi } from "../../api/axiosApi";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Modal from "../../ui/Modal/Modal";
import { AddButton, EditButton, DeleteButton } from "../../ui/Button/Button";
import ReactSelect from "react-select"; // 🟢 THÊM IMPORT REACT-SELECT

import "./Services.css";

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

const FALLBACK_IMAGE = "https://via.placeholder.com/150";

const Services = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rawServices, setRawServices] = useState([]);
    const [activeParentCategory, setActiveParentCategory] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const [sortOrder, setSortOrder] = useState("newest");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const [isEditMode, setIsEditMode] = useState(false);
    const [editProductId, setEditProductId] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

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

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const getActiveCategoryFromStorage = () => {
        try {
            const savedCategory = localStorage.getItem("activeCategory");
            if (!savedCategory) return null;
            return JSON.parse(savedCategory);
        } catch (err) {
            return null;
        }
    };

    const fetchProductsByActiveCategory = async (showLoadingOverlay = true) => {
        if (showLoadingOverlay) setIsLoading(true);
        setError(null);

        try {
            const savedCategory = getActiveCategoryFromStorage();
            setActiveParentCategory(savedCategory);

            const parentId = savedCategory?._id || null;

            if (!parentId) {
                setRawServices([]);
                setCategories([]);
                setAllProducts([]);
                setIsLoading(false);
                return;
            }

            const serviceRes = await categoryApi.getAllCategories({
                limit: 100,
                categoryId: parentId,
            });

            if (!serviceRes || !serviceRes.success) {
                setRawServices([]);
                setCategories([]);
                setAllProducts([]);
                setError("Không thể tải danh sách dịch vụ.");
                return;
            }

            const servicesData = serviceRes.data?.services || [];
            setRawServices(servicesData);

            const uniqueCategories = Array.from(new Set(servicesData.map((s) => s.name).filter(Boolean)));
            setCategories(uniqueCategories);

            if (servicesData.length === 0) {
                setAllProducts([]);
                return;
            }

            const productPromises = servicesData.map(async (service) => {
                try {
                    const res = await serviceApi.getVariantsByServiceId(service._id);
                    if (res && res.success) {
                        return (res.data?.variants || []).map((variant) => ({
                            id: variant._id,
                            _id: variant._id,
                            name: variant.name,
                            price: variant.price,
                            unit: variant.unit,
                            description: variant.description,
                            image: variant.imageUrls && variant.imageUrls.length > 0 ? variant.imageUrls[0] : service.thumbnailUrl || FALLBACK_IMAGE,
                            category: service.name,
                            serviceId: service._id,
                            manufacturer: variant.manufacturer || "",
                            warranty_period: variant.warranty_period || "",
                            hardness: variant.hardness || "",
                            transparency: variant.transparency || "",
                            imageUrls: variant.imageUrls || [],
                            createdAt: variant.createdAt || service.createdAt,
                        }));
                    }
                    return [];
                } catch (err) {
                    return [];
                }
            });

            const results = await Promise.all(productPromises);
            const flatProducts = results.flat();

            setAllProducts(flatProducts);
        } catch (err) {
            setError("Không thể tải danh sách sản phẩm/dịch vụ.");
            setRawServices([]);
            setCategories([]);
            setAllProducts([]);
        } finally {
            if (showLoadingOverlay) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProductsByActiveCategory(true);
        const handleStorageChange = () => fetchProductsByActiveCategory(true);
        window.addEventListener("activeCategoryChanged", handleStorageChange);
        return () => window.removeEventListener("activeCategoryChanged", handleStorageChange);
    }, []);

    const handleAddImageClick = () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = "image/*";
        fileInput.onchange = (e) => handleImageChange(e);
        fileInput.click();
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const totalImages = oldImageUrls.length + imageFiles.length + files.length;
        if (totalImages > 5) return showToast("Chỉ được phép upload tối đa 5 ảnh!", "error");

        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setImageFiles((prev) => [...prev, ...files]);
        setImagePreviews((prev) => [...prev, ...newPreviews]);
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

    const getCategoryNameByServiceId = (serviceId) => {
        const service = rawServices.find((s) => s._id === serviceId);
        return service ? service.name : "";
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setEditProductId(null);
        setFormData({ ...initialForm, serviceId: rawServices?.[0]?._id || "" });
        setImageFiles([]);
        setImagePreviews([]);
        setOldImageUrls([]);
        setIsModalOpen(true);
    };

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
        setImagePreviews([]);
        setOldImageUrls(item.imageUrls || []);
        setIsModalOpen(true);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.serviceId) return showToast("Vui lòng chọn Danh mục dịch vụ!", "error");

        setIsSubmitting(true);
        try {
            const submitData = new FormData();

            Object.keys(formData).forEach((key) => {
                if (key !== "image" && key !== "images" && formData[key] !== null && formData[key] !== "") {
                    submitData.append(key, formData[key]);
                }
            });

            if (isEditMode) {
                if (oldImageUrls.length === 0 && imageFiles.length === 0) {
                    submitData.append("images", "");
                } else if (oldImageUrls.length > 0) {
                    oldImageUrls.forEach((url) => submitData.append("images", url));
                }
            }

            if (imageFiles && imageFiles.length > 0) {
                imageFiles.forEach((file) => submitData.append("image", file));
            }

            const response = isEditMode ? await serviceApi.updateVariant(editProductId, submitData) : await serviceApi.createVariant(submitData);

            if (response && response.success) {
                showToast(isEditMode ? "Cập nhật sản phẩm thành công!" : "Tạo sản phẩm thành công!");
                
                const categoryName = getCategoryNameByServiceId(formData.serviceId);
                const serverVariant = response.data?.variant || response.data;
                const updatedImageUrls = serverVariant?.imageUrls || [...oldImageUrls, ...imagePreviews];

                if (isEditMode) {
                    setAllProducts((prev) =>
                        prev.map((prod) => {
                            if (prod.id === editProductId) {
                                return {
                                    ...prod,
                                    name: serverVariant?.name || formData.name,
                                    price: serverVariant?.price || formData.price,
                                    unit: serverVariant?.unit || formData.unit,
                                    description: serverVariant?.description || formData.description,
                                    image: updatedImageUrls?.[0] || FALLBACK_IMAGE,
                                    category: categoryName,
                                    serviceId: formData.serviceId,
                                    manufacturer: serverVariant?.manufacturer || formData.manufacturer,
                                    warranty_period: serverVariant?.warranty_period || formData.warranty_period,
                                    hardness: serverVariant?.hardness || formData.hardness,
                                    transparency: serverVariant?.transparency || formData.transparency,
                                    imageUrls: updatedImageUrls,
                                };
                            }
                            return prod;
                        })
                    );
                } else {
                    const newProduct = {
                        id: serverVariant?._id || Date.now().toString(),
                        _id: serverVariant?._id || Date.now().toString(),
                        name: serverVariant?.name || formData.name,
                        price: serverVariant?.price || formData.price,
                        unit: serverVariant?.unit || formData.unit,
                        description: serverVariant?.description || formData.description,
                        image: serverVariant?.imageUrls?.[0] || imagePreviews?.[0] || FALLBACK_IMAGE,
                        category: categoryName,
                        serviceId: formData.serviceId,
                        manufacturer: serverVariant?.manufacturer || formData.manufacturer,
                        warranty_period: serverVariant?.warranty_period || formData.warranty_period,
                        hardness: serverVariant?.hardness || formData.hardness,
                        transparency: serverVariant?.transparency || formData.transparency,
                        imageUrls: serverVariant?.imageUrls || imagePreviews || [],
                        createdAt: serverVariant?.createdAt || new Date().toISOString(),
                    };
                    setAllProducts((prev) => [newProduct, ...prev]);
                }

                setIsModalOpen(false);
                fetchProductsByActiveCategory(false);
            } else {
                showToast(response?.message || "Lỗi xử lý sản phẩm", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi kết nối đến máy chủ", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (e, id, name) => {
        e.stopPropagation();
        setProductToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        setIsSubmitting(true);
        try {
            const response = await serviceApi.deleteVariant(productToDelete.id);
            if (response && response.success) {
                showToast("Xóa sản phẩm thành công!", "success");
                setAllProducts((prev) => prev.filter((prod) => prod.id !== productToDelete.id));
                setIsDeleteModalOpen(false);
                setProductToDelete(null);
            } else {
                showToast(response?.message || "Lỗi xóa sản phẩm", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Không thể xóa sản phẩm lúc này", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRowClick = (productId) => navigate(`/services/${productId}`);

    const filteredProducts = allProducts
        .filter((product) => {
            const normalizedSearchTerm = removeVietnameseTones(searchTerm);
            const normalizedProductName = removeVietnameseTones(product.name || "");
            const normalizedCategoryName = removeVietnameseTones(product.category || "");

            const matchesSearch = normalizedProductName.includes(normalizedSearchTerm) || normalizedCategoryName.includes(normalizedSearchTerm);
            const matchesCategory = selectedCategory === "" || product.category === selectedCategory;

            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            if (sortOrder === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortOrder === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortOrder === "asc") return Number(a.price || 0) - Number(b.price || 0);
            if (sortOrder === "desc") return Number(b.price || 0) - Number(a.price || 0);
            return 0;
        });

    // 🟢 CẤU HÌNH OPTIONS CHO REACT-SELECT
    const formServiceOptions = rawServices.map((srv) => ({ value: srv._id, label: srv.name }));

    const filterCategoryOptions = [
        { value: "", label: "Tất cả dịch vụ" },
        ...categories.map((cat) => ({ value: cat, label: cat }))
    ];

    const sortOptions = [
        { value: "newest", label: "Mới nhất (Mặc định)" },
        { value: "oldest", label: "Cũ nhất" },
        { value: "asc", label: "Giá: Thấp đến cao" },
        { value: "desc", label: "Giá: Cao đến thấp" }
    ];

    // 🟢 STYLE ĐỒNG BỘ CHO REACT-SELECT
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "38px",
            borderRadius: "6px",
            fontSize: "14px",
            borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db",
            boxShadow: "none",
            "&:hover": { borderColor: "var(--primary-color)" },
            backgroundColor: "#fff",
        }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white",
            color: state.isSelected ? "var(--primary-color)" : "#374151",
            cursor: "pointer",
            margin: "4px",
            borderRadius: "6px",
            fontSize: "14px",
            width: "96%",
        }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({
            ...provided,
            overflowX: "hidden",
        }),
    };

    if (isLoading) return <div className="z-services-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-services-state z-services-error">{error}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Sản phẩm & Biến thể" }]} title={`Quản lý dịch vụ`} description="Quản lí danh sách dịch vụ, thông tin chi tiết và miêu tả của sản phẩm." />

            <div className="z-services-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-services-header">
                    <h1 className="z-services-title">Danh sách Sản phẩm</h1>
                </div>

                <div className="z-services-tools">
                    <div className="z-services-search">
                        <input type="text" placeholder="Tìm tên sản phẩm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* 🟢 LỌC DANH MỤC BẰNG REACT-SELECT */}
                    <div style={{ minWidth: "220px", zIndex: 11 }}>
                        <ReactSelect
                            options={filterCategoryOptions}
                            value={filterCategoryOptions.find(opt => opt.value === selectedCategory) || filterCategoryOptions[0]}
                            onChange={(selected) => setSelectedCategory(selected ? selected.value : "")}
                            styles={customSelectStyles}
                            isSearchable={true}
                            placeholder="Lọc dịch vụ..."
                            noOptionsMessage={() => "Không tìm thấy"}
                        />
                    </div>

                    {/* 🟢 LỌC SẮP XẾP BẰNG REACT-SELECT */}
                    <div style={{ minWidth: "220px", zIndex: 10 }}>
                        <ReactSelect
                            options={sortOptions}
                            value={sortOptions.find(opt => opt.value === sortOrder) || sortOptions[0]}
                            onChange={(selected) => setSortOrder(selected ? selected.value : "newest")}
                            styles={customSelectStyles}
                            isSearchable={false}
                        />
                    </div>

                    <AddButton style={{ marginLeft: "auto" }} onClick={openAddModal}>
                        Thêm sản phẩm
                    </AddButton>
                </div>

                <div className="z-services-table-wrapper">
                    <table className="z-services-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Hình ảnh</th>
                                <th>Thông tin Sản phẩm</th>
                                <th>Danh mục</th>
                                <th>Giá</th>
                                <th>Đơn vị</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((item, index) => (
                                <tr key={item.id} onClick={() => handleRowClick(item.id)}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <img src={item.image || FALLBACK_IMAGE} alt={item.name} className="z-services-img-preview" onError={(e) => { e.target.src = FALLBACK_IMAGE; }} />
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>{item.name}</div>
                                        <div className="z-services-text-clamp" title={item.description}>{item.description}</div>
                                    </td>
                                    <td>
                                        <span className="z-services-badge-gray">{item.category}</span>
                                    </td>
                                    <td>
                                        <span className="z-services-badge-blue">{Number(item.price || 0).toLocaleString("vi-VN")} đ</span>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: "500", color: "#374151" }}>{item.unit || "-"}</span>
                                    </td>
                                    <td>
                                        <div className="z-services-actions" onClick={(e) => e.stopPropagation()}>
                                            <div className="z-services-dropdown-actions">
                                                <button className="z-services-more-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>
                                                <div className="z-services-action-menu">
                                                    <EditButton onClick={(e) => handleEditClick(e, item)} />
                                                    <DeleteButton onClick={(e) => handleDeleteClick(e, item.id, item.name)} />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && <div className="z-services-state">Không tìm thấy sản phẩm nào.</div>}
                </div>

                <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={isEditMode ? "Cập nhật Sản phẩm" : "Thêm Sản phẩm mới"} size="lg" onSave={handleSubmitForm} saveText={isSubmitting ? "Đang xử lý..." : isEditMode ? "Lưu thay đổi" : "Tạo Sản phẩm"}>
                    <div className="z-services-form">
                        <div className="z-services-form-grid">
                            
                            {/* CỘT TRÁI */}
                            <div className="z-services-form-column">
                                <div className="z-services-form-group">
                                    <label>Thuộc Danh mục</label>
                                    <input type="text" value={activeParentCategory?.title || "N/A"} disabled className="z-services-input readonly" style={{ backgroundColor: "#f3f4f6", color: "#12915A", fontWeight: "bold" }} />
                                </div>

                                {/* 🟢 CHỌN DỊCH VỤ TRONG FORM BẰNG REACT-SELECT */}
                                <div className="z-services-form-group">
                                    <label>Dịch vụ <span className="z-services-required">*</span></label>
                                    <ReactSelect
                                        options={formServiceOptions}
                                        value={formServiceOptions.find(opt => opt.value === formData.serviceId) || null}
                                        onChange={(selected) => setFormData({ ...formData, serviceId: selected ? selected.value : "" })}
                                        isDisabled={isSubmitting}
                                        styles={customSelectStyles}
                                        placeholder="-- Chọn dịch vụ --"
                                        isSearchable={true}
                                        noOptionsMessage={() => "Không tìm thấy dịch vụ"}
                                        menuPosition="fixed" // Tránh menu bị cắt xén trong Modal
                                    />
                                </div>

                                <div className="z-services-form-group">
                                    <label>Tên sản phẩm <span className="z-services-required">*</span></label>
                                    <input type="text" className="z-services-input" required placeholder="VD: Implant Zygoma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-services-form-row">
                                    <div className="z-services-form-group z-services-flex-1">
                                        <label>Giá (VNĐ) <span className="z-services-required">*</span></label>
                                        <input type="number" className="z-services-input" required min="0" placeholder="VD: 45000000" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-services-form-group z-services-flex-1">
                                        <label>Đơn vị</label>
                                        <input type="text" className="z-services-input" placeholder="VD: cái, răng" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} disabled={isSubmitting} />
                                    </div>
                                </div>

                                <div className="z-services-form-group">
                                    <label>Mô tả chi tiết</label>
                                    <textarea className="z-services-textarea" rows="3" placeholder="Nhập mô tả sản phẩm..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isSubmitting}></textarea>
                                </div>
                            </div>

                            {/* CỘT PHẢI */}
                            <div className="z-services-form-column">
                                <h3 className="z-services-form-section-title">Thông số kỹ thuật</h3>

                                <div className="z-services-form-group">
                                    <label>Xuất xứ / Hãng SX</label>
                                    <input type="text" className="z-services-input" placeholder="VD: Đức, Mỹ" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-services-form-group">
                                    <label>Thời gian bảo hành</label>
                                    <input type="text" className="z-services-input" placeholder="VD: 10 năm" value={formData.warranty_period} onChange={(e) => setFormData({ ...formData, warranty_period: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-services-form-group">
                                    <label>Độ cứng (Mpa)</label>
                                    <input type="text" className="z-services-input" placeholder="VD: 500-530Mpa" value={formData.hardness} onChange={(e) => setFormData({ ...formData, hardness: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-services-form-group">
                                    <label>Độ trong suốt</label>
                                    <input type="text" className="z-services-input" placeholder="VD: Cao, tự nhiên" value={formData.transparency} onChange={(e) => setFormData({ ...formData, transparency: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <h3 className="z-services-form-section-title" style={{ marginTop: "16px" }}>Thư viện Ảnh</h3>
                                <div className="z-services-form-group">
                                    <label>Hình ảnh (Tối đa 5 ảnh)</label>
                                    <div className="z-services-upload-wrapper">
                                        {oldImageUrls.map((url, index) => (
                                            <div key={`old-${index}`} className="z-services-image-box">
                                                <img src={url} alt={`old-preview-${index}`} className="z-services-preview-img" />
                                                <button type="button" className="z-services-remove-img-btn" onClick={() => removeOldImage(index)}>×</button>
                                            </div>
                                        ))}

                                        {imagePreviews.map((src, index) => (
                                            <div key={`new-${index}`} className="z-services-image-box">
                                                <img src={src} alt={`new-preview-${index}`} className="z-services-preview-img" />
                                                <button type="button" className="z-services-remove-img-btn" onClick={() => removeNewImage(index)}>×</button>
                                            </div>
                                        ))}

                                        {oldImageUrls.length + imagePreviews.length < 5 && (
                                            <div className="z-services-add-img-btn" onClick={handleAddImageClick}>
                                                + Ảnh
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={confirmDelete} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-services-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xác nhận xóa</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa sản phẩm <br />
                            <strong>"{productToDelete?.name}"</strong> không?
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Services;