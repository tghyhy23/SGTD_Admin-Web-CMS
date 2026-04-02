import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceApi, categoryApi } from "../../api/axiosApi";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Modal from "../../ui/Modal/Modal";
import { AddButton, EditButton, DeleteButton } from "../../ui/Button/Button";
import ReactSelect from "react-select";

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

const getActiveCategoryFromStorage = () => {
    try {
        const savedCategory = localStorage.getItem("activeCategory");
        if (!savedCategory) return null;
        return JSON.parse(savedCategory);
    } catch (err) {
        return null;
    }
};

// 🟢 HÀM MAPPING LỖI TỪ BACKEND
const translateErrorMessage = (errorMsg) => {
    if (!errorMsg) return "Có lỗi xảy ra, vui lòng thử lại!";
    
    const msg = errorMsg.toLowerCase();

    // Mapping dựa theo các throw error trong serviceVariant.service.js
    if (msg.includes("service, name and price are required")) return "Vui lòng nhập đầy đủ Dịch vụ, Tên và Giá sản phẩm!";
    if (msg.includes("service not found")) return "Không tìm thấy dịch vụ gốc của sản phẩm này!";
    if (msg.includes("cannot add variant to inactive service")) return "Không thể thêm sản phẩm vào Dịch vụ đang bị vô hiệu hóa!";
    if (msg.includes("price cannot be negative")) return "Giá sản phẩm không được là số âm!";
    if (msg.includes("variant not found")) return "Không tìm thấy thông tin sản phẩm này!";
    if (msg.includes("cannot delete variant with") && msg.includes("booking")) return "Không thể xóa sản phẩm này vì đã có khách hàng đặt lịch. Vui lòng chuyển sang trạng thái Ẩn thay vì xóa!";
    if (msg.includes("updates array is required")) return "Danh sách cập nhật thứ tự không hợp lệ!";
    if (msg.includes("file too large") || msg.includes("large")) return "Kích thước ảnh quá lớn! Vui lòng chọn ảnh dung lượng nhỏ hơn.";
    
    // Fallback cho các lỗi chưa handle
    return errorMsg;
};

const Services = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // 1. Quản lý trạng thái danh mục gốc từ LocalStorage
    const [activeParentCategory, setActiveParentCategory] = useState(getActiveCategoryFromStorage());
    const activeParentId = activeParentCategory?._id || null;

    // Lắng nghe sự kiện đổi danh mục
    useEffect(() => {
        const handleStorageChange = () => setActiveParentCategory(getActiveCategoryFromStorage());
        window.addEventListener("activeCategoryChanged", handleStorageChange);
        return () => window.removeEventListener("activeCategoryChanged", handleStorageChange);
    }, []);

    // 2. States cho Lọc, Tìm kiếm, UI
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // 3. States cho Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editProductId, setEditProductId] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const initialForm = {
        serviceId: "", name: "", price: "", unit: "cái", description: "", manufacturer: "", warranty_period: "", hardness: "", transparency: "",
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
    const { data: pageData, isLoading, error } = useQuery({
        queryKey: ["servicesAndVariants", activeParentId],
        queryFn: async () => {
            if (!activeParentId) return { allProducts: [], categories: [], rawServices: [] };

            // 1. Lấy danh sách Services
            const serviceRes = await categoryApi.getAllCategories({ limit: 100, categoryId: activeParentId });
            if (!serviceRes || !serviceRes.success) throw new Error("Không thể tải danh sách dịch vụ.");
            
            const servicesData = serviceRes.data?.services || [];
            const uniqueCategories = Array.from(new Set(servicesData.map((s) => s.name).filter(Boolean)));

            if (servicesData.length === 0) return { allProducts: [], categories: uniqueCategories, rawServices: servicesData };

            // 2. Lấy Variants cho từng Service
            const productPromises = servicesData.map(async (service) => {
                try {
                    const res = await serviceApi.getVariantsByServiceId(service._id);
                    if (res && res.success) {
                        return (res.data?.variants || []).map((variant) => ({
                            id: variant._id, _id: variant._id, name: variant.name, price: variant.price, unit: variant.unit,
                            description: variant.description,
                            image: variant.imageUrls?.length > 0 ? variant.imageUrls[0] : service.thumbnailUrl || FALLBACK_IMAGE,
                            category: service.name, serviceId: service._id, manufacturer: variant.manufacturer || "",
                            warranty_period: variant.warranty_period || "", hardness: variant.hardness || "",
                            transparency: variant.transparency || "", imageUrls: variant.imageUrls || [],
                            createdAt: variant.createdAt || service.createdAt,
                        }));
                    }
                    return [];
                } catch (err) { return []; }
            });

            const results = await Promise.all(productPromises);
            return {
                allProducts: results.flat(),
                categories: uniqueCategories,
                rawServices: servicesData
            };
        },
        enabled: !!activeParentId, // Chỉ chạy khi đã xác định được activeParentId
        staleTime: 5 * 60 * 1000,
    });

    const allProducts = pageData?.allProducts || [];
    const categories = pageData?.categories || [];
    const rawServices = pageData?.rawServices || [];

    // Lấy tên category dựa vào serviceId
    const getCategoryNameByServiceId = (serviceId) => {
        const service = rawServices.find((s) => s._id === serviceId);
        return service ? service.name : "";
    };

    // ==========================================
    // REACT QUERY: MUTATIONS (Không độ trễ)
    // ==========================================
    
    // 1. MUTATION: XÓA SẢN PHẨM
    const deleteMutation = useMutation({
        mutationFn: (id) => serviceApi.deleteVariant(id),
        onSuccess: (res, deletedId) => {
            queryClient.setQueryData(["servicesAndVariants", activeParentId], (old) => {
                if (!old) return old;
                return { ...old, allProducts: old.allProducts.filter(p => p.id !== deletedId) };
            });
            showToast("Xóa sản phẩm thành công!", "success");
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["servicesAndVariants", activeParentId] });
        },
        // 🟢 MAPPING LỖI KHI XÓA
        onError: (err) => {
            const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            showToast(translateErrorMessage(serverMsg), "error");
        }
    });

    // 2. MUTATION: THÊM / CẬP NHẬT SẢN PHẨM (Dùng chung cho Form)
    const saveProductMutation = useMutation({
        mutationFn: ({ isEdit, id, payload }) => isEdit ? serviceApi.updateVariant(id, payload) : serviceApi.createVariant(payload),
        onSuccess: (res, variables) => {
            const serverVariant = res.data?.variant || res.data;
            const categoryName = getCategoryNameByServiceId(formData.serviceId);
            
            // Xử lý ảnh tạm thời để hiển thị liền mạch trên UI
            const updatedImageUrls = serverVariant?.imageUrls || [...oldImageUrls, ...imagePreviews];

            queryClient.setQueryData(["servicesAndVariants", activeParentId], (old) => {
                if (!old) return old;
                let newProducts = [...old.allProducts];

                if (variables.isEdit) {
                    newProducts = newProducts.map((prod) => {
                        if (prod.id === variables.id) {
                            return {
                                ...prod,
                                name: serverVariant?.name || formData.name,
                                price: serverVariant?.price || formData.price,
                                unit: serverVariant?.unit || formData.unit,
                                description: serverVariant?.description || formData.description,
                                image: updatedImageUrls?.[0] || FALLBACK_IMAGE,
                                category: categoryName, serviceId: formData.serviceId,
                                manufacturer: serverVariant?.manufacturer || formData.manufacturer,
                                warranty_period: serverVariant?.warranty_period || formData.warranty_period,
                                hardness: serverVariant?.hardness || formData.hardness,
                                transparency: serverVariant?.transparency || formData.transparency,
                                imageUrls: updatedImageUrls,
                            };
                        }
                        return prod;
                    });
                } else {
                    const newProduct = {
                        id: serverVariant?._id || Date.now().toString(),
                        _id: serverVariant?._id || Date.now().toString(),
                        name: serverVariant?.name || formData.name, price: serverVariant?.price || formData.price,
                        unit: serverVariant?.unit || formData.unit, description: serverVariant?.description || formData.description,
                        image: serverVariant?.imageUrls?.[0] || imagePreviews?.[0] || FALLBACK_IMAGE,
                        category: categoryName, serviceId: formData.serviceId, manufacturer: serverVariant?.manufacturer || formData.manufacturer,
                        warranty_period: serverVariant?.warranty_period || formData.warranty_period, hardness: serverVariant?.hardness || formData.hardness,
                        transparency: serverVariant?.transparency || formData.transparency, imageUrls: serverVariant?.imageUrls || imagePreviews || [],
                        createdAt: serverVariant?.createdAt || new Date().toISOString(),
                    };
                    newProducts = [newProduct, ...newProducts];
                }
                return { ...old, allProducts: newProducts };
            });

            showToast(variables.isEdit ? "Cập nhật sản phẩm thành công!" : "Tạo sản phẩm thành công!");
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["servicesAndVariants", activeParentId] });
        },
        // 🟢 MAPPING LỖI KHI LƯU
        onError: (err) => {
            const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            showToast(translateErrorMessage(serverMsg), "error");
        }
    });

    const isSubmitting = deleteMutation.isPending || saveProductMutation.isPending;

    // ==========================================
    // HANDLERS BÌNH THƯỜNG
    // ==========================================

    const handleAddImageClick = () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file"; fileInput.multiple = true; fileInput.accept = "image/*";
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
        const newFiles = [...imageFiles]; const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newFiles.splice(index, 1); newPreviews.splice(index, 1);
        setImageFiles(newFiles); setImagePreviews(newPreviews);
    };

    const removeOldImage = (index) => {
        const updatedOldImages = [...oldImageUrls];
        updatedOldImages.splice(index, 1);
        setOldImageUrls(updatedOldImages);
    };

    const openAddModal = () => {
        setIsEditMode(false); setEditProductId(null);
        setFormData({ ...initialForm, serviceId: rawServices?.[0]?._id || "" });
        setImageFiles([]); setImagePreviews([]); setOldImageUrls([]);
        setIsModalOpen(true);
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setIsEditMode(true); setEditProductId(item.id);
        setFormData({
            serviceId: item.serviceId || "", name: item.name || "", price: item.price || "", unit: item.unit || "cái",
            description: item.description || "", manufacturer: item.manufacturer || "",
            warranty_period: item.warranty_period || "", hardness: item.hardness || "", transparency: item.transparency || "",
        });
        setImageFiles([]); setImagePreviews([]); setOldImageUrls(item.imageUrls || []);
        setIsModalOpen(true);
    };

    const handleSubmitForm = (e) => {
        e.preventDefault();
        
        // Frontend Validate nhẹ
        if (!formData.serviceId) return showToast("Vui lòng chọn Danh mục dịch vụ!", "error");
        if (!formData.name) return showToast("Vui lòng nhập tên sản phẩm!", "error");
        if (!formData.price || Number(formData.price) < 0) return showToast("Giá sản phẩm không hợp lệ!", "error");

        const submitData = new FormData();
        Object.keys(formData).forEach((key) => {
            if (key !== "image" && key !== "images" && formData[key] !== null && formData[key] !== "") {
                submitData.append(key, formData[key]);
            }
        });

        if (isEditMode) submitData.append("existingUrls", JSON.stringify(oldImageUrls));
        if (imageFiles && imageFiles.length > 0) {
            imageFiles.forEach((file) => submitData.append("image", file));
        }

        saveProductMutation.mutate({ isEdit: isEditMode, id: editProductId, payload: submitData });
    };

    const handleDeleteClick = (e, id, name) => {
        e.stopPropagation();
        setProductToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    // ==========================================
    // FILTER & LỌC DỮ LIỆU CỤC BỘ
    // ==========================================
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

    // ==========================================
    // CẤU HÌNH UI (React-Select)
    // ==========================================
    const formServiceOptions = rawServices.map((srv) => ({ value: srv._id, label: srv.name }));
    const filterCategoryOptions = [{ value: "", label: "Tất cả dịch vụ" }, ...categories.map((cat) => ({ value: cat, label: cat }))];
    const sortOptions = [
        { value: "newest", label: "Mới nhất (Mặc định)" }, { value: "oldest", label: "Cũ nhất" },
        { value: "asc", label: "Giá: Thấp đến cao" }, { value: "desc", label: "Giá: Cao đến thấp" },
    ];

    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided, minHeight: "38px", borderRadius: "6px", fontSize: "14px",
            borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db", boxShadow: "none",
            "&:hover": { borderColor: "var(--primary-color)" }, backgroundColor: "#fff",
        }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({
            ...provided, backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white",
            color: state.isSelected ? "var(--primary-color)" : "#374151", cursor: "pointer",
            margin: "4px", borderRadius: "6px", fontSize: "14px", width: "96%",
        }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({ ...provided, overflowX: "hidden" }),
    };

    // Renders
    if (isLoading && !allProducts.length) return <div className="z-services-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-services-state z-services-error">{error.message || error}</div>;

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

                    <div style={{ minWidth: "220px", zIndex: 11 }}>
                        <ReactSelect options={filterCategoryOptions} value={filterCategoryOptions.find((opt) => opt.value === selectedCategory) || filterCategoryOptions[0]} onChange={(selected) => setSelectedCategory(selected ? selected.value : "")} styles={customSelectStyles} isSearchable={true} placeholder="Lọc dịch vụ..." noOptionsMessage={() => "Không tìm thấy"} />
                    </div>

                    <div style={{ minWidth: "220px", zIndex: 10 }}>
                        <ReactSelect options={sortOptions} value={sortOptions.find((opt) => opt.value === sortOrder) || sortOptions[0]} onChange={(selected) => setSortOrder(selected ? selected.value : "newest")} styles={customSelectStyles} isSearchable={false} />
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
                                <tr key={item.id} onClick={() => navigate(`/services/${item.id}`)}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <img
                                            src={item.image || FALLBACK_IMAGE}
                                            alt={item.name}
                                            className="z-services-img-preview"
                                            onError={(e) => {
                                                e.target.src = FALLBACK_IMAGE;
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>{item.name}</div>
                                        <div className="z-services-text-clamp" title={item.description}>
                                            {item.description}
                                        </div>
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
                    <div style={{ marginTop: "-15px", paddingBottom: "6px", borderBottom: "1px dashed #e5e7eb" }}>
                            <span style={{ color: "red", fontWeight: "bold", fontSize: "16px" }}>*</span>
                            <span style={{ color: "#6b7280", fontSize: "12px", fontStyle: "italic", marginLeft: "4px" }}>: Các trường có dấu sao là bắt buộc. Vui lòng nhập đầy đủ thông tin.</span>
                        </div>
                        <div className="z-services-form-grid">
                            <div className="z-services-form-column">
                                <div className="z-services-form-group">
                                    <label>Thuộc Danh mục</label>
                                    <input type="text" value={activeParentCategory?.title || "N/A"} disabled className="z-services-input readonly" style={{ backgroundColor: "#f3f4f6", color: "#12915A", fontWeight: "bold" }} />
                                </div>

                                <div className="z-services-form-group">
                                    <label>Dịch vụ <span className="z-services-required">*</span></label>
                                    <ReactSelect
                                        options={formServiceOptions}
                                        value={formServiceOptions.find((opt) => opt.value === formData.serviceId) || null}
                                        onChange={(selected) => setFormData({ ...formData, serviceId: selected ? selected.value : "" })}
                                        isDisabled={isSubmitting} styles={customSelectStyles} placeholder="-- Chọn dịch vụ --"
                                        isSearchable={true} noOptionsMessage={() => "Không tìm thấy dịch vụ"} menuPosition="fixed"
                                    />
                                </div>

                                <div className="z-services-form-group">
                                    <label>Tên sản phẩm <span className="z-services-required">*</span></label>
                                    <input type="text" className="z-services-input" required placeholder="VD: Implant Zygoma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isSubmitting} />
                                </div>

                                <div className="z-services-form-row">
                                    <div className="z-services-form-group z-services-flex-1">
                                        <label>Giá (VNĐ) <span className="z-services-required">*</span></label>
                                        <input
                                            type="number" className="z-services-input" required min="0" placeholder="VD: 45000000"
                                            value={formData.price}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                if (!/^\d*$/.test(value)) return;
                                                setFormData({ ...formData, price: value });
                                            }}
                                            onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
                                            disabled={isSubmitting}
                                        />
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
                                            <div className="z-services-add-img-btn" onClick={handleAddImageClick}>+ Ảnh</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={() => deleteMutation.mutate(productToDelete?.id)} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-services-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xác nhận xóa</h3>
                        <p>Bạn có chắc chắn muốn xóa sản phẩm <br /><strong>"{productToDelete?.name}"</strong> không?</p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Services;