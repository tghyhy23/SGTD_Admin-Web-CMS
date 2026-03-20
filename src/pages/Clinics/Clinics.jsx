// src/pages/Clinics/Clinics.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clinicApi, locationApi, serviceApi, categoryApi } from "../../api/axiosApi";
import Select from "react-select";

import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Modal from "../../ui/Modal/Modal";
import { AddButton, EditButton, DeleteButton, Button } from "../../ui/Button/Button";

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
    // STATE & KHỞI TẠO
    // ==========================================
    const [clinics, setClinics] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [services, setServices] = useState([]);
    const [activeParentCategory, setActiveParentCategory] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState("rating_desc");
    const [showSortDropdown, setShowSortDropdown] = useState(false);

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
        category: "",
    };

    const [formData, setFormData] = useState(initialForm);
    const fileInputRef = useRef(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [oldImageUrls, setOldImageUrls] = useState([]);

    const navigate = useNavigate();

    // ==========================================
    // LOGIC FUNCTIONS
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const getActiveCategoryFromStorage = () => {
        try {
            const savedCategory = localStorage.getItem("activeCategory");
            const parsed = savedCategory ? JSON.parse(savedCategory) : null;
            console.log("--- DỮ LIỆU CATEGORY TỪ NAVBAR ---", parsed);
            return parsed;
        } catch (err) {
            return null;
        }
    };

    // Thêm tham số showLoadingOverlay để không bị chớp trang khi gọi lại ngầm
    const fetchAllData = async (showLoadingOverlay = true) => {
        if (showLoadingOverlay) setIsLoading(true);
        setError(null);
        try {
            const savedCategory = getActiveCategoryFromStorage();
            setActiveParentCategory(savedCategory);
            const parentId = savedCategory?._id || null;

            const [clinicsRes, distRes] = await Promise.all([clinicApi.getAllClinics({ limit: 100 }), locationApi.getAllDistricts()]);

            if (distRes?.success) setDistricts(distRes.data.districts || []);

            let filteredServices = [];
            if (parentId) {
                const serviceRes = await categoryApi.getAllCategories({ limit: 100, categoryId: parentId });
                if (serviceRes?.success) filteredServices = serviceRes.data?.services || [];
            } else {
                const servRes = await serviceApi.getAllServices();
                if (servRes?.success) filteredServices = servRes.data?.services || [];
            }
            setServices(filteredServices);

            if (clinicsRes?.success) {
                const allClinics = clinicsRes.data.branches || [];
                if (!parentId) {
                    setClinics(allClinics);
                } else {
                    const allowedServiceIds = new Set(filteredServices.map((s) => String(s._id)));
                    const filteredClinics = allClinics.filter((clinic) => {
                        const clinicServiceIds = clinic.availableServiceIds?.map((s) => String(s._id || s)) || [];
                        return clinicServiceIds.some((id) => allowedServiceIds.has(id));
                    });
                    setClinics(filteredClinics);
                }
            }
        } catch (err) {
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            if (showLoadingOverlay) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData(true);
        const handleStorageChange = () => fetchAllData(true);
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const openAddModal = () => {
        setIsEditMode(false);
        setEditClinicId(null);
        setFormData({
            ...initialForm,
            category: activeParentCategory?._id,
        });
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

        const allowedServiceIds = new Set(services.map((s) => String(s._id)));
        const clinicServiceIds = clinic.availableServiceIds?.map((s) => String(s._id || s)).filter((id) => allowedServiceIds.has(id)) || [];

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
            category: clinic.category?._id || clinic.category || activeParentCategory?._id || "",
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
        setFormData((prev) => ({ ...prev, districtId: selectedOption ? selectedOption.value : "" }));
    };

    const handleServiceCheckbox = (serviceId) => {
        setFormData((prev) => {
            const isSelected = prev.availableServiceIds.includes(serviceId);
            return {
                ...prev,
                availableServiceIds: isSelected ? prev.availableServiceIds.filter((id) => id !== serviceId) : [...prev.availableServiceIds, serviceId],
            };
        });
    };

    const handleAddImageClick = () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = "image/*";

        fileInput.onchange = (e) => {
            handleImageChange(e);
        };

        fileInput.click();
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (oldImageUrls.length + imageFiles.length + files.length > 5) return showToast("Tối đa 5 ảnh!", "error");
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
        if (e && e.preventDefault) e.preventDefault();

        if (!formData.name || !formData.districtId || !formData.address || !formData.hotline) {
            return showToast("Vui lòng điền đủ Tên, Quận, Địa chỉ và Hotline!", "error");
        }

        setIsSubmitting(true);
        try {
            const submitData = new FormData();
            ["name", "districtId", "address", "hotline", "email", "description", "mapsUrl", "category"].forEach((key) => {
                if (formData[key]) submitData.append(key, formData[key]);
            });

            if (formData.longitude && formData.latitude) {
                submitData.append("location", JSON.stringify({ type: "Point", coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)] }));
            }
            // submitData.append("managerId", "69a9afec8e8226391fbc055b");
            submitData.append("openingHours", JSON.stringify({ openTime: formData.openTime, closeTime: formData.closeTime, breakStart: "12:00", breakEnd: "13:00" }));
            submitData.append("availableServiceIds", JSON.stringify(formData.availableServiceIds));
            imageFiles.forEach((file) => submitData.append("images", file));

            if (isEditMode) {
                submitData.append("imageUrls", JSON.stringify(oldImageUrls.length === 0 && imageFiles.length === 0 ? [] : oldImageUrls));
            }

            imageFiles.forEach((file) => submitData.append("images", file));
            console.log("--- DEBUG PAYLOAD ---");
            for (let pair of submitData.entries()) {
                console.log(pair[0] + ": " + pair[1]);
            }
            console.log("---------------------");

            const response = isEditMode ? await clinicApi.updateClinic(editClinicId, submitData) : await clinicApi.createClinic(submitData);

            if (response && response.success) {
                showToast(isEditMode ? "Cập nhật thành công!" : "Tạo phòng khám thành công!");

                // Cập nhật State trực tiếp để giao diện đổi luôn
                const selectedDistrict = districts.find((d) => d._id === formData.districtId) || { _id: formData.districtId, name: "..." };

                if (isEditMode) {
                    setClinics((prev) =>
                        prev.map((c) => {
                            if (c._id === editClinicId) {
                                return {
                                    ...c,
                                    name: formData.name,
                                    address: formData.address,
                                    hotline: formData.hotline,
                                    districtId: selectedDistrict,
                                    imageUrls: imagePreviews.length > 0 ? imagePreviews : oldImageUrls,
                                };
                            }
                            return c;
                        }),
                    );
                } else {
                    const newClinic = response.data?.branch ||
                        response.data?.clinic ||
                        response.data || {
                            _id: Date.now().toString(),
                            name: formData.name,
                            address: formData.address,
                            hotline: formData.hotline,
                            districtId: selectedDistrict,
                            isActive: true,
                            imageUrls: imagePreviews,
                            totalRating: 0,
                            totalReview: 0,
                        };
                    setClinics((prev) => [newClinic, ...prev]);
                }

                setIsFormModalOpen(false); // Đóng form

                // Gọi fetch ngầm (false) để làm mới data chuẩn mà không hiện Loading
                fetchAllData(false);
            } else {
                showToast(response?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi kết nối", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

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
            showToast(error.response?.data?.message || "Không thể xóa do đang có dữ liệu liên kết", "error");
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

    const handleRowClick = (id) => navigate(`/clinics/${id}`);

    const filteredClinics = clinics
        .filter((clinic) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedName = removeVietnameseTones(clinic.name || "");
            const normalizedAddress = removeVietnameseTones(clinic.address || "");

            const matchesSearch = normalizedName.includes(normalizedSearch) || normalizedAddress.includes(normalizedSearch);
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
        control: (provided, state) => ({ ...provided, minHeight: "42px", borderRadius: "8px", borderColor: state.isFocused ? "var(--primary-color)" : "#e5e7eb", boxShadow: "none", "&:hover": { borderColor: "var(--primary-color)" } }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0 }),
        option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? "var(--primary-color)" : state.isFocused ? "#eef2ff" : "white", color: state.isSelected ? "white" : "#374151", cursor: "pointer" }),
    };

    if (isLoading) return <div className="z-clinic-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-clinic-state z-clinic-error">{error}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Chi nhánh" }]} title={`Chi nhánh: ${activeParentCategory?.title || "Tất cả"}`} description="Quản lý thông tin, dịch vụ và định vị của các phòng khám." />

            <div className="z-clinic-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-clinic-header">
                    <h1 className="z-clinic-title">Danh sách Phòng khám</h1>
                </div>

                <div className="z-clinic-tools">
                    <div className="z-clinic-search">
                        <input type="text" placeholder="Tìm tên hoặc địa chỉ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="z-clinic-filter">
                        <button
                            className="z-clinic-btn-filter"
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowSortDropdown(false);
                            }}
                        >
                            <span>{filterStatus === "active" ? "Đang hoạt động" : filterStatus === "inactive" ? "Ngừng hoạt động" : "Tất cả trạng thái"}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showFilterDropdown && (
                            <div className="z-clinic-dropdown-menu">
                                <div
                                    className={`z-clinic-dropdown-item ${filterStatus === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("all");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Tất cả trạng thái
                                </div>
                                <div
                                    className={`z-clinic-dropdown-item ${filterStatus === "active" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("active");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang hoạt động
                                </div>
                                <div
                                    className={`z-clinic-dropdown-item ${filterStatus === "inactive" ? "active" : ""}`}
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

                    <div className="z-clinic-filter">
                        <button
                            className="z-clinic-btn-filter"
                            onClick={() => {
                                setShowSortDropdown(!showSortDropdown);
                                setShowFilterDropdown(false);
                            }}
                        >
                            <span>{sortOrder === "rating_desc" ? "Đánh giá: Cao đến thấp" : "Đánh giá: Thấp đến cao"}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showSortDropdown && (
                            <div className="z-clinic-dropdown-menu">
                                <div
                                    className={`z-clinic-dropdown-item ${sortOrder === "rating_desc" ? "active" : ""}`}
                                    onClick={() => {
                                        setSortOrder("rating_desc");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    Đánh giá: Cao đến thấp
                                </div>
                                <div
                                    className={`z-clinic-dropdown-item ${sortOrder === "rating_asc" ? "active" : ""}`}
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

                    <AddButton onClick={openAddModal} className="z-clinic-add-btn-pull-right">
                        Thêm Phòng Khám
                    </AddButton>
                </div>

                <div className="z-clinic-table-wrapper">
                    <table className="z-clinic-table">
                        <thead>
                            <tr>
                                <th className="z-clinic-th-center">STT</th>
                                <th className="z-clinic-th-img">Hình ảnh</th>
                                <th>Thông tin Cơ sở</th>
                                <th>Địa chỉ</th>
                                <th>Đánh giá</th>
                                <th>Trạng thái</th>
                                <th className="z-clinic-th-actions">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClinics.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="z-clinic-state">Không có dữ liệu phòng khám nào.</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredClinics.map((clinic, index) => (
                                    <tr key={clinic._id} onClick={() => handleRowClick(clinic._id)} className="z-clinic-clickable-row">
                                        <td className="z-clinic-td-center">
                                            <strong>{index + 1}</strong>
                                        </td>
                                        <td>
                                            <img
                                                src={clinic.imageUrls?.[0] || FALLBACK_IMG}
                                                alt={clinic.name}
                                                className="z-clinic-table-img"
                                                onError={(e) => {
                                                    e.target.src = FALLBACK_IMG;
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <div className="z-clinic-text-bold">{clinic.name}</div>
                                            <div className="z-clinic-subtext">Hotline: {clinic.hotline}</div>
                                        </td>
                                        <td className="z-clinic-td-address">
                                            <div className="z-clinic-text-clamp">{clinic.address}</div>
                                            <div className="z-clinic-district-name">{clinic.districtId?.name}</div>
                                        </td>
                                        <td>
                                            <span className="z-clinic-rating-star">⭐ {clinic.totalRating?.toFixed(1) || 0}</span>
                                            <span className="z-clinic-rating-count">({clinic.totalReview || 0})</span>
                                        </td>
                                        <td>
                                            <span className={`z-clinic-status-badge ${clinic.isActive ? "active" : "inactive"}`}>{clinic.isActive ? "Đang hoạt động" : "Tạm dừng"}</span>
                                        </td>
                                        <td>
                                            <div className="z-clinic-dropdown-actions" onClick={(e) => e.stopPropagation()}>
                                                <button className="z-clinic-more-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>
                                                <div className="z-clinic-action-menu">
                                                    <Button variant="outline" onClick={(e) => handleToggleStatus(e, clinic._id)}>
                                                        {clinic.isActive ? "Tạm dừng" : "Kích hoạt"}
                                                    </Button>
                                                    <EditButton onClick={(e) => openEditModal(e, clinic)} />
                                                    <DeleteButton onClick={(e) => handleDeleteClick(e, clinic._id, clinic.name)} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật Phòng khám" : "Thêm mới Phòng khám"} maxWidth="900px" onSave={handleSubmitForm} saveText={isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}>
                    <div className="z-clinic-form">
                        <div className="z-clinic-form-grid">
                            {/* CỘT TRÁI */}
                            <div className="z-clinic-form-column">
                                <div className="z-clinic-form-group">
                                    <label>Danh mục hệ thống</label>
                                    <input
                                        type="text"
                                        // Hiển thị chữ "NHA KHOA" từ activeParentCategory
                                        value={activeParentCategory?.title || "Chưa xác định"}
                                        disabled
                                        className="z-clinic-input readonly z-clinic-input-highlight"
                                    />
                                    <small style={{ color: "gray" }}>Mã danh mục: {formData.category}</small>
                                </div>

                                <div className="z-clinic-form-group">
                                    <label>
                                        Tên Phòng Khám <span className="z-clinic-required">*</span>
                                    </label>
                                    <input type="text" name="name" className="z-clinic-input" required value={formData.name} onChange={handleInputChange} disabled={isSubmitting} />
                                </div>

                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Hotline <span className="z-clinic-required">*</span>
                                        </label>
                                        <input type="text" name="hotline" className="z-clinic-input" required value={formData.hotline} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Email liên hệ</label>
                                        <input type="email" name="email" className="z-clinic-input" value={formData.email} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                </div>

                                <div className="z-clinic-form-group">
                                    <label>
                                        Thuộc Quận/Huyện <span className="z-clinic-required">*</span>
                                    </label>
                                    <Select options={districtOptions} value={districtOptions.find((option) => option.value === formData.districtId) || null} onChange={handleDistrictChange} placeholder="-- Gõ để tìm Phường/Xã --" isSearchable={true} isDisabled={isSubmitting} styles={customSelectStyles} noOptionsMessage={() => "Không tìm thấy Phường/Xã"} />
                                </div>

                                <div className="z-clinic-form-group">
                                    <label>
                                        Địa chỉ chi tiết <span className="z-clinic-required">*</span>
                                    </label>
                                    <textarea name="address" rows="2" className="z-clinic-textarea" required value={formData.address} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                </div>

                                <div className="z-clinic-form-group">
                                    <label>Mô tả / Giới thiệu</label>
                                    <textarea name="description" rows="3" className="z-clinic-textarea" value={formData.description} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                </div>
                            </div>

                            {/* CỘT PHẢI */}
                            <div className="z-clinic-form-column">
                                <h3 className="z-clinic-form-section-title">Định vị & Bản đồ</h3>
                                <div className="z-clinic-form-group">
                                    <label>Link Google Maps</label>
                                    <input type="url" name="mapsUrl" className="z-clinic-input" placeholder="http://googleusercontent.com/maps..." value={formData.mapsUrl} onChange={handleInputChange} disabled={isSubmitting} />
                                </div>

                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Kinh độ (Lng)</label>
                                        <input type="number" step="any" name="longitude" className="z-clinic-input" placeholder="VD: 106.59" value={formData.longitude} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Vĩ độ (Lat)</label>
                                        <input type="number" step="any" name="latitude" className="z-clinic-input" placeholder="VD: 10.76" value={formData.latitude} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                </div>

                                <h3 className="z-clinic-form-section-title z-clinic-mt-16">Hoạt động & Dịch vụ</h3>
                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Giờ mở cửa</label>
                                        <input type="time" name="openTime" className="z-clinic-input" required value={formData.openTime} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Giờ đóng cửa</label>
                                        <input type="time" name="closeTime" className="z-clinic-input" required value={formData.closeTime} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                </div>

                                <div className="z-clinic-form-group">
                                    <label>Dịch vụ cung cấp</label>
                                    <div className="z-clinic-services-list">
                                        {services.map((srv) => (
                                            <label key={srv._id} className="z-clinic-service-item">
                                                <input type="checkbox" checked={formData.availableServiceIds.includes(srv._id)} onChange={() => handleServiceCheckbox(srv._id)} disabled={isSubmitting} />
                                                <span>{srv.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="z-clinic-form-group">
                                    <label>Hình ảnh (Tối đa 5 ảnh)</label>
                                    <div className="z-clinic-upload-wrapper">
                                        {oldImageUrls.map((url, i) => (
                                            <div key={`old-${i}`} className="z-clinic-image-box">
                                                <img src={url} alt={`old-${i}`} className="z-clinic-preview-img" />
                                                <button type="button" className="z-clinic-remove-btn" onClick={() => removeOldImage(i)}>
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {imagePreviews.map((src, i) => (
                                            <div key={`new-${i}`} className="z-clinic-image-box">
                                                <img src={src} alt={`new-${i}`} className="z-clinic-preview-img" />
                                                <button type="button" className="z-clinic-remove-btn" onClick={() => removeNewImage(i)}>
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {oldImageUrls.length + imagePreviews.length < 5 && (
                                            <div className="z-clinic-add-img-btn" onClick={handleAddImageClick}>
                                                + Ảnh
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" maxWidth="700px" onSave={confirmDelete} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-clinic-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3 className="z-clinic-delete-title">Xóa phòng khám?</h3>
                        <p className="z-clinic-delete-text">
                            Bạn có chắc muốn xóa phòng khám <br /> <strong>{clinicToDelete?.name}</strong> không?
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Clinics;
