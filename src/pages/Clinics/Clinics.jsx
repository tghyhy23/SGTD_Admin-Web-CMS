// src/pages/Clinics/Clinics.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clinicApi, locationApi, serviceApi, categoryApi } from "../../api/axiosApi";
import Select from "react-select";
import "./Clinics.css";

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

const FALLBACK_IMG = "https://via.placeholder.com/150?text=No+Image";

const Clinics = () => {
    // ==========================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ==========================================
    const [clinics, setClinics] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [services, setServices] = useState([]);
    const [activeParentCategory, setActiveParentCategory] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ==========================================
    // 2. STATE LỌC & TÌM KIẾM
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState("rating_desc");
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    // ==========================================
    // 3. STATE MODAL & FORM
    // ==========================================
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clinicToDelete, setClinicToDelete] = useState(null);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editClinicId, setEditClinicId] = useState(null);

    const initialForm = {
        name: "",
        districtId: "",
        address: "",
        hotline: "",
        email: "",
        description: "",
        mapsUrl: "",
        longitude: "",
        latitude: "",
        openTime: "07:30",
        closeTime: "19:30",
        availableServiceIds: [],
    };

    const [formData, setFormData] = useState(initialForm);

    const fileInputRef = useRef(null);
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
            console.error("Lỗi parse activeCategory:", err);
            return null;
        }
    };

    // ==========================================
    // 4. FETCH DATA INIT THEO CATEGORY
    // ==========================================
    const fetchAllData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const savedCategory = getActiveCategoryFromStorage();
            setActiveParentCategory(savedCategory);

            const parentId = savedCategory?._id || null;

            const [clinicsRes, distRes] = await Promise.all([
                clinicApi.getAllClinics({ limit: 100 }),
                locationApi.getAllDistricts(),
            ]);

            if (distRes?.success) {
                setDistricts(distRes.data.districts || []);
            }

            // Lấy service thuộc parent category đang active
            let filteredServices = [];
            if (parentId) {
                const serviceRes = await categoryApi.getAllCategories({
                    limit: 100,
                    categoryId: parentId,
                });

                if (serviceRes?.success) {
                    filteredServices = serviceRes.data?.services || [];
                }
            } else {
                // fallback nếu chưa có activeCategory
                const servRes = await serviceApi.getAllServices();
                if (servRes?.success) {
                    filteredServices = servRes.data?.services || [];
                }
            }

            setServices(filteredServices);

            // Lọc clinic: chỉ giữ clinic có linked service thuộc category đang chọn
            if (clinicsRes?.success) {
                const allClinics = clinicsRes.data.branches || [];

                if (!parentId) {
                    setClinics(allClinics);
                } else {
                    const allowedServiceIds = new Set(filteredServices.map((s) => String(s._id)));

                    const filteredClinics = allClinics.filter((clinic) => {
                        const clinicServiceIds =
                            clinic.availableServiceIds?.map((s) => String(s._id || s)) || [];

                        return clinicServiceIds.some((id) => allowedServiceIds.has(id));
                    });

                    setClinics(filteredClinics);
                }
            }
        } catch (err) {
            console.error("Lỗi lấy dữ liệu:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();

        const handleStorageChange = () => fetchAllData();
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // ==========================================
    // 5. XỬ LÝ FORM (THÊM / SỬA)
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditClinicId(null);
        setFormData(initialForm);
        setImageFiles([]);
        setImagePreviews([]);
        setOldImageUrls([]);
        setIsFormModalOpen(true);
    };

    const openEditModal = (e, clinic) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditClinicId(clinic._id);

        let lng = "";
        let lat = "";
        if (clinic.location && clinic.location.coordinates) {
            lng = clinic.location.coordinates[0];
            lat = clinic.location.coordinates[1];
        }

        // Chỉ giữ những serviceIds thuộc category đang active
        const allowedServiceIds = new Set(services.map((s) => String(s._id)));
        const clinicServiceIds =
            clinic.availableServiceIds?.map((s) => String(s._id || s)).filter((id) => allowedServiceIds.has(id)) || [];

        setFormData({
            name: clinic.name || "",
            districtId: clinic.districtId?._id || clinic.districtId || "",
            address: clinic.address || "",
            hotline: clinic.hotline || "",
            email: clinic.email || "",
            description: clinic.description || "",
            mapsUrl: clinic.mapsUrl || "",
            longitude: lng,
            latitude: lat,
            openTime: clinic.openingHours?.openTime || "07:30",
            closeTime: clinic.openingHours?.closeTime || "19:30",
            availableServiceIds: clinicServiceIds,
        });

        setImageFiles([]);
        setImagePreviews([]);
        setOldImageUrls(clinic.imageUrls || []);
        setIsFormModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleDistrictChange = (selectedOption) => {
        setFormData((prev) => ({
            ...prev,
            districtId: selectedOption ? selectedOption.value : "",
        }));
    };

    const handleServiceCheckbox = (serviceId) => {
        setFormData((prev) => {
            const isSelected = prev.availableServiceIds.includes(serviceId);
            if (isSelected) {
                return {
                    ...prev,
                    availableServiceIds: prev.availableServiceIds.filter((id) => id !== serviceId),
                };
            } else {
                return {
                    ...prev,
                    availableServiceIds: [...prev.availableServiceIds, serviceId],
                };
            }
        });
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (oldImageUrls.length + imageFiles.length + files.length > 5) {
            return showToast("Tối đa 5 ảnh!", "error");
        }
        const newPreviews = files.map((f) => URL.createObjectURL(f));
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
        const updated = [...oldImageUrls];
        updated.splice(index, 1);
        setOldImageUrls(updated);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.districtId || !formData.address || !formData.hotline) {
            return showToast("Vui lòng điền đủ Tên, Quận, Địa chỉ và Hotline!", "error");
        }

        setIsSubmitting(true);
        try {
            const submitData = new FormData();

            const textFields = ["name", "districtId", "address", "hotline", "email", "description", "mapsUrl"];
            textFields.forEach((key) => {
                if (formData[key]) submitData.append(key, formData[key]);
            });

            if (formData.longitude && formData.latitude) {
                const locationObj = {
                    type: "Point",
                    coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
                };
                submitData.append("location", JSON.stringify(locationObj));
            }

            const openingHoursObj = {
                openTime: formData.openTime,
                closeTime: formData.closeTime,
                breakStart: "12:00",
                breakEnd: "13:00",
            };
            submitData.append("openingHours", JSON.stringify(openingHoursObj));

            submitData.append("availableServiceIds", JSON.stringify(formData.availableServiceIds));

            if (isEditMode) {
                if (oldImageUrls.length === 0 && imageFiles.length === 0) {
                    submitData.append("imageUrls", JSON.stringify([]));
                } else {
                    submitData.append("imageUrls", JSON.stringify(oldImageUrls));
                }
            }

            imageFiles.forEach((file) => submitData.append("images", file));

            let response;
            if (isEditMode) {
                response = await clinicApi.updateClinic(editClinicId, submitData);
            } else {
                response = await clinicApi.createClinic(submitData);
            }

            if (response && response.success) {
                showToast(isEditMode ? "Cập nhật thành công!" : "Tạo phòng khám thành công!");

                const savedClinic = response.data?.branch || response.data;
                const fullDistrict = districts.find((d) => d._id === formData.districtId);
                const fullServices = services.filter((s) => formData.availableServiceIds.includes(s._id));
                const finalImages = [...oldImageUrls, ...imagePreviews];

                if (isEditMode) {
                    setClinics((prev) =>
                        prev.map((c) =>
                            c._id === editClinicId
                                ? {
                                      ...c,
                                      ...formData,
                                      districtId: fullDistrict,
                                      availableServiceIds: fullServices,
                                      imageUrls: finalImages.length ? finalImages : c.imageUrls,
                                  }
                                : c
                        )
                    );
                } else {
                    const newClinic = savedClinic?._id
                        ? savedClinic
                        : {
                              _id: Date.now().toString(),
                              ...formData,
                              districtId: fullDistrict,
                              availableServiceIds: fullServices,
                              imageUrls: finalImages,
                              isActive: true,
                              totalRating: 0,
                              totalReview: 0,
                          };

                    setClinics((prev) => [newClinic, ...prev]);
                }

                setIsFormModalOpen(false);
            } else {
                showToast(response?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            console.error("Lỗi submit form:", error);
            showToast(error.response?.data?.message || "Lỗi kết nối", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 6. XỬ LÝ XÓA VÀ TOGGLE STATUS
    // ==========================================
    const handleDeleteClick = (e, id, name) => {
        e.stopPropagation();
        setClinicToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!clinicToDelete) return;
        setIsSubmitting(true);
        try {
            const response = await clinicApi.deleteClinic(clinicToDelete.id);
            if (response && response.success) {
                showToast("Xóa phòng khám thành công!");
                setClinics((prev) => prev.filter((c) => c._id !== clinicToDelete.id));
                setIsDeleteModalOpen(false);
                setClinicToDelete(null);
            } else {
                showToast(response?.message || "Lỗi xóa phòng khám", "error");
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Không thể xóa do đang có dữ liệu liên kết";
            showToast(errorMsg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (e, id) => {
        e.stopPropagation();
        setClinics((prev) => prev.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c)));
        try {
            const res = await clinicApi.toggleStatus(id);
            if (res && res.success) {
                showToast("Đã thay đổi trạng thái!");
            } else {
                setClinics((prev) => prev.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c)));
                showToast("Lỗi thay đổi trạng thái", "error");
            }
        } catch (error) {
            setClinics((prev) => prev.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c)));
            showToast("Lỗi kết nối mạng", "error");
        }
    };

    // ==========================================
    // 7. LOGIC RENDER & LỌC
    // ==========================================
    const handleRowClick = (id) => navigate(`/clinics/${id}`);

    const filteredClinics = clinics
        .filter((clinic) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedName = removeVietnameseTones(clinic.name || "");
            const normalizedAddress = removeVietnameseTones(clinic.address || "");

            const matchesSearch =
                normalizedName.includes(normalizedSearch) ||
                normalizedAddress.includes(normalizedSearch);

            let matchesStatus = true;
            if (filterStatus === "active") matchesStatus = clinic.isActive === true;
            if (filterStatus === "inactive") matchesStatus = clinic.isActive === false;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortOrder === "rating_desc") return (b.totalRating || 0) - (a.totalRating || 0);
            if (sortOrder === "rating_asc") return (a.totalRating || 0) - (b.totalRating || 0);
            return 0;
        });

    const districtOptions = districts.map((d) => ({
        value: d._id,
        label: `${d.name} (${d.provinceId?.name})`,
    }));

    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "42px",
            borderRadius: "4px",
            borderColor: state.isFocused ? "#12915A" : "#d1d5db",
            boxShadow: state.isFocused ? "0 0 0 2px rgba(55, 123, 246, 0.15)" : "none",
            "&:hover": {
                borderColor: "#12915A",
            },
        }),
        input: (provided) => ({
            ...provided,
            margin: 0,
            padding: 0,
            "& input": {
                background: "transparent !important",
                border: "none !important",
                boxShadow: "none !important",
                outline: "none !important",
            },
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
                ? "#12915A"
                : state.isFocused
                ? "rgba(18, 145, 90, 0.08)"
                : "white",
            color: state.isSelected ? "white" : "#374151",
            cursor: "pointer",
            "&:active": {
                backgroundColor: "#12915A",
                color: "white",
            },
        }),
        placeholder: (provided) => ({
            ...provided,
            color: "#9ca3af",
            fontSize: "14px",
        }),
        singleValue: (provided) => ({
            ...provided,
            color: "#111827",
            fontSize: "14px",
        }),
    };

    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message fixed-toast ${toast.type}`} style={{ zIndex: 9999 }}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">
                    Quản lý Chi nhánh: {activeParentCategory?.title || "N/A"}
                </h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Tìm tên hoặc địa chỉ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowSortDropdown(false);
                            }}
                        >
                            <span>
                                {filterStatus === "active"
                                    ? "Đang hoạt động"
                                    : filterStatus === "inactive"
                                    ? "Ngừng hoạt động"
                                    : "Tất cả trạng thái"}
                            </span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showFilterDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className="filter-option"
                                    onClick={() => {
                                        setFilterStatus("all");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Tất cả trạng thái
                                </div>
                                <div
                                    className="filter-option"
                                    onClick={() => {
                                        setFilterStatus("active");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang hoạt động
                                </div>
                                <div
                                    className="filter-option"
                                    onClick={() => {
                                        setFilterStatus("inactive");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Ngừng hoạt động
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowSortDropdown(!showSortDropdown);
                                setShowFilterDropdown(false);
                            }}
                        >
                            <span>
                                {sortOrder === "rating_desc"
                                    ? "Đánh giá: Cao đến thấp"
                                    : "Đánh giá: Thấp đến cao"}
                            </span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showSortDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className="filter-option"
                                    onClick={() => {
                                        setSortOrder("rating_desc");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    Đánh giá: Cao đến thấp
                                </div>
                                <div
                                    className="filter-option"
                                    onClick={() => {
                                        setSortOrder("rating_asc");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    Đánh giá: Thấp đến cao
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="add-btn" onClick={openAddModal}>
                        <span>+ Thêm mới</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Hình ảnh</th>
                            <th>Thông tin Cơ sở</th>
                            <th>Địa chỉ</th>
                            <th>Đánh giá</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClinics.map((clinic, index) => (
                            <tr key={clinic._id} onClick={() => handleRowClick(clinic._id)} className="clickable-row">
                                <td>{index + 1}</td>
                                <td className="td-image">
                                    <img
                                        src={clinic.imageUrls?.[0] || FALLBACK_IMG}
                                        alt={clinic.name}
                                        style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }}
                                        onError={(e) => {
                                            e.target.src = FALLBACK_IMG;
                                        }}
                                    />
                                </td>
                                <td>
                                    <div className="product-name">{clinic.name}</div>
                                    <div className="product-desc">Hotline: {clinic.hotline}</div>
                                </td>
                                <td style={{ maxWidth: "250px" }}>
                                    <div
                                        className="product-desc"
                                        style={{
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {clinic.address}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "4px" }}>
                                        {clinic.districtId?.name}
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontWeight: "600", color: "#f59e0b" }}>
                                        ⭐ {clinic.totalRating?.toFixed(1) || 0}
                                    </span>
                                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "4px" }}>
                                        ({clinic.totalReview || 0})
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className="category-badge"
                                        style={{
                                            backgroundColor: clinic.isActive ? "#dcfce7" : "#fee2e2",
                                            color: clinic.isActive ? "#059669" : "#dc2626",
                                        }}
                                    >
                                        {clinic.isActive ? "Đang hoạt động" : "Tạm dừng"}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-row">
                                        <button className="action-btn btn-edit" onClick={(e) => openEditModal(e, clinic)}>
                                            Sửa
                                        </button>
                                        <button className="action-btn btn-secondary" onClick={(e) => handleToggleStatus(e, clinic._id)}>
                                            {clinic.isActive ? "Tắt" : "Bật"}
                                        </button>
                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, clinic._id, clinic.name)}>
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredClinics.length === 0 && (
                    <div className="state-message">
                        Không có chi nhánh nào trong mục {activeParentCategory?.title || "này"}.
                    </div>
                )}
            </div>

            {isFormModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-clinics">
                        <div className="modal-header">
                            <h2>{isEditMode ? "Cập nhật Phòng khám" : "Thêm mới Phòng khám"}</h2>
                            <button className="close-modal-btn" onClick={() => !isSubmitting && setIsFormModalOpen(false)}>
                                ×
                            </button>
                        </div>

                        <form className="modal-form" onSubmit={handleSubmitForm}>
                            <div className="form-grid-clinics">
                                <div className="form-column-left">
                                    <div className="form-group">
                                        <label>Thuộc danh mục gốc (từ Navbar)</label>
                                        <input
                                            type="text"
                                            value={activeParentCategory?.title || "N/A"}
                                            disabled
                                            style={{
                                                backgroundColor: "#f3f4f6",
                                                color: "#12915A",
                                                fontWeight: "bold",
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            Tên Phòng Khám <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div style={{ display: "flex", gap: "12px" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>
                                                Hotline <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="hotline"
                                                required
                                                value={formData.hotline}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Email liên hệ</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            Thuộc Quận/Huyện <span className="required">*</span>
                                        </label>
                                        <Select
                                            options={districtOptions}
                                            value={districtOptions.find((option) => option.value === formData.districtId) || null}
                                            onChange={handleDistrictChange}
                                            placeholder="-- Gõ để tìm Phường/Xã --"
                                            isSearchable={true}
                                            isDisabled={isSubmitting}
                                            styles={customSelectStyles}
                                            noOptionsMessage={() => "Không tìm thấy Phường/Xã"}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            Địa chỉ chi tiết <span className="required">*</span>
                                        </label>
                                        <textarea
                                            name="address"
                                            rows="2"
                                            required
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        ></textarea>
                                    </div>

                                    <div className="form-group">
                                        <label>Mô tả / Giới thiệu</label>
                                        <textarea
                                            name="description"
                                            rows="4"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="form-column-right-clinics">
                                    <h3 className="form-sub-title">Định vị & Bản đồ</h3>
                                    <div className="form-group" style={{ width: "100%" }}>
                                        <label>Link Google Maps</label>
                                        <input
                                            type="url"
                                            name="mapsUrl"
                                            placeholder="https://maps.app.goo.gl/..."
                                            value={formData.mapsUrl}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                            style={{ width: "100%" }}
                                        />
                                    </div>

                                    <div style={{ display: "flex", gap: "16px", width: "100%" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Kinh độ (Lng)</label>
                                            <input
                                                type="number"
                                                step="any"
                                                name="longitude"
                                                placeholder="VD: 106.59"
                                                value={formData.longitude}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                                style={{ width: "100%" }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Vĩ độ (Lat)</label>
                                            <input
                                                type="number"
                                                step="any"
                                                name="latitude"
                                                placeholder="VD: 10.76"
                                                value={formData.latitude}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                                style={{ width: "100%" }}
                                            />
                                        </div>
                                    </div>

                                    <h3 className="form-sub-title">Hoạt động & Dịch vụ</h3>
                                    <div style={{ display: "flex", gap: "16px", width: "100%" }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Giờ mở cửa</label>
                                            <input
                                                type="time"
                                                name="openTime"
                                                required
                                                value={formData.openTime}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                                style={{ width: "100%" }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Giờ đóng cửa</label>
                                            <input
                                                type="time"
                                                name="closeTime"
                                                required
                                                value={formData.closeTime}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                                style={{ width: "100%" }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ display: "flex" }}>
                                        <label>Dịch vụ cung cấp</label>
                                        <div className="services-list-container">
                                            {services.map((srv) => (
                                                <label key={srv._id} className="service-item-label">
                                                    <input
                                                        type="checkbox"
                                                        className="service-item-checkbox"
                                                        checked={formData.availableServiceIds.includes(srv._id)}
                                                        onChange={() => handleServiceCheckbox(srv._id)}
                                                        disabled={isSubmitting}
                                                    />
                                                    <span className="service-item-text">{srv.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Hình ảnh (Tối đa 5 ảnh)</label>
                                        <div className="image-upload-container" style={{ flexWrap: "wrap", gap: "10px" }}>
                                            {oldImageUrls.map((url, i) => (
                                                <div key={`old-${i}`} className="image-preview-box" style={{ width: "80px", height: "60px" }}>
                                                    <img src={url} alt={`old-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    <button type="button" className="remove-img-btn" onClick={() => removeOldImage(i)}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            {imagePreviews.map((src, i) => (
                                                <div key={`new-${i}`} className="image-preview-box" style={{ width: "80px", height: "60px" }}>
                                                    <img src={src} alt={`new-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    <button type="button" className="remove-img-btn" onClick={() => removeNewImage(i)}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            {oldImageUrls.length + imagePreviews.length < 5 && (
                                                <div
                                                    className="image-upload-btn"
                                                    onClick={() => fileInputRef.current.click()}
                                                    style={{ width: "120px", height: "80px" }}
                                                >
                                                    <span>+ Tải ảnh</span>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            ref={fileInputRef}
                                            style={{ display: "none" }}
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)}>
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

            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div
                        className="modal-content-delete"
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            padding: "24px",
                            maxWidth: "400px",
                            width: "100%",
                            textAlign: "center",
                        }}
                    >
                        <h3 style={{ margin: "0 0 10px", fontSize: "1.2rem", color: "#111827" }}>
                            Xác nhận xóa
                        </h3>
                        <p style={{ margin: "0 0 20px", color: "#4b5563", lineHeight: "1.5" }}>
                            Bạn có chắc muốn xóa phòng khám <br />
                            <strong style={{ color: "#C03744" }}>"{clinicToDelete?.name}"</strong> không?
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
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

export default Clinics;