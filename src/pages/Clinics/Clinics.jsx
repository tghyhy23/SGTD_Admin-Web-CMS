import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // 🟢 THÊM IMPORT
import { clinicApi, locationApi, serviceApi, categoryApi, userApi } from "../../api/axiosApi";
import Select from "react-select";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Modal from "../../ui/Modal/Modal";
import { AddButton, EditButton, DeleteButton, Button } from "../../ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
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

const mapCategoryToEnum = (title) => {
    if (!title) return "PHONG_KHAM";
    const normalized = removeVietnameseTones(title).toUpperCase();
    if (normalized.includes("NHA KHOA")) return "NHA_KHOA";
    if (normalized.includes("BENH VIEN")) return "BENH_VIEN";
    if (normalized.includes("THAM MY")) return "THAM_MY_VIEN";
    if (normalized.includes("PHONG KHAM")) return "PHONG_KHAM";
    return normalized.replace(/\s+/g, "_");
};

const translateErrorMessage = (errorMsg) => {
    if (!errorMsg) return null;
    const msg = errorMsg.toLowerCase();
    if (msg.includes("413") || msg.includes("payload too large") || msg.includes("entity too large")) {
        return "Kích thước ảnh tải lên quá lớn. Vui lòng chọn ảnh dưới 5MB!";
    }
    if (msg === "network error") {
        return "Lỗi kết nối hoặc File quá lớn bị máy chủ từ chối (Lỗi 413). Vui lòng thử ảnh nhỏ hơn!";
    }
    if (msg.includes("name, category, district, address and hotline are required")) return "Vui lòng điền đầy đủ Tên, Danh mục, Quận/Huyện, Địa chỉ và Hotline!";
    if (msg.includes("district not found")) return "Không tìm thấy thông tin Quận/Huyện trên hệ thống.";
    if (msg.includes("branch with this name already exists in this district")) return "Tên phòng khám này đã tồn tại trong khu vực Quận/Huyện đã chọn.";
    if (msg.includes("manager not found")) return "Không tìm thấy thông tin tài khoản Quản lý.";
    if (msg.includes("assigned manager must be admin")) return "Tài khoản Quản lý được gán phải có quyền Admin.";
    if (msg.includes("this user already manages")) return "Tài khoản này đang quản lý một phòng khám khác.";
    if (msg.includes("some services not found or inactive")) return "Một số dịch vụ bạn chọn không tồn tại hoặc đã ngừng hoạt động.";
    if (msg.includes("invalid coordinates")) return "Tọa độ bản đồ (Kinh độ/Vĩ độ) không hợp lệ.";
    if (msg.includes("can't extract geo keys")) return "Vui lòng nhập tọa độ (Kinh độ/Vĩ độ)";
    if (msg.includes("branch not found")) return "Không tìm thấy thông tin phòng khám trên hệ thống.";
    if (msg.includes("cannot delete branch with") && msg.includes("booking")) return "Không thể xóa do phòng khám đang có lịch đặt.";
    if (msg.includes("cannot delete branch with") && msg.includes("review")) return "Không thể xóa do phòng khám đã có đánh giá.";
    return errorMsg;
};

const FALLBACK_IMG = "https://via.placeholder.com/150?text=No+Image";

const Clinics = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // ==========================================
    // 1. STATE QUẢN LÝ QUYỀN & BỘ LỌC UI
    // ==========================================
    const { user } = useAuth();
    const userRole = user?.role || user?.account?.role || "USER";
    const isSuperAdmin = userRole === "SUPERADMIN";

    const [activeParentCategory, setActiveParentCategory] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("activeCategory"));
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const handleStorageChange = () => {
            try {
                setActiveParentCategory(JSON.parse(localStorage.getItem("activeCategory")));
            } catch {
                setActiveParentCategory(null);
            }
        };
        window.addEventListener("activeCategoryChanged", handleStorageChange);
        return () => window.removeEventListener("activeCategoryChanged", handleStorageChange);
    }, []);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [filterProvince, setFilterProvince] = useState("all");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clinicToDelete, setClinicToDelete] = useState(null);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editClinicId, setEditClinicId] = useState(null);

    const initialForm = {
        name: "",
        districtId: "",
        managerId: "",
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
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [oldImageUrls, setOldImageUrls] = useState([]);

    const generateTimeOptions = () => {
        const times = [];
        for (let h = 6; h <= 23; h++) {
            const hour = h.toString().padStart(2, "0");
            times.push({ value: `${hour}:00`, label: `${hour}:00` });
            times.push({ value: `${hour}:30`, label: `${hour}:30` });
        }
        return times;
    };
    const TIME_OPTIONS = generateTimeOptions();

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // REACT QUERY: FETCH DỮ LIỆU
    // ==========================================

    // 1. Fetch Dữ liệu Tham chiếu (Districts, Admins)
    const { data: referenceData } = useQuery({
        queryKey: ["clinicReferences"],
        queryFn: async () => {
            const [distRes, usersRes] = await Promise.all([locationApi.getAllDistricts(), userApi.getAllUsers({ limit: 500 })]);

            const districts = distRes?.data?.districts || [];
            let admins = [];
            if (usersRes) {
                const userList = usersRes.users || usersRes.data?.users || usersRes.data || [];
                admins = userList.filter((u) => {
                    const role = u?.account?.role || u?.role || "USER";
                    return role === "ADMIN";
                });
            }
            return { districts, admins };
        },
        staleTime: 10 * 60 * 1000, // Cache 10 phút
    });

    const districts = referenceData?.districts || [];
    const admins = referenceData?.admins || [];

    // 2. Fetch Dịch vụ theo Category
    const parentId = activeParentCategory?._id || null;
    const { data: services = [] } = useQuery({
        queryKey: ["servicesForClinic", parentId],
        queryFn: async () => {
            if (parentId) {
                const res = await categoryApi.getAllCategories({ limit: 100, categoryId: parentId });
                return res?.data?.services || [];
            } else {
                const res = await serviceApi.getAllServices();
                return res?.data?.services || [];
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    // 3. Fetch Danh sách Phòng khám
    const {
        data: clinics = [],
        isLoading: isLoadingClinics,
        error: clinicsError,
    } = useQuery({
        queryKey: ["clinics", activeParentCategory?.title, user?.email, isSuperAdmin],
        queryFn: async () => {
            // 🟢 FIX: Thêm tham số status: "all" để yêu cầu Backend trả về CẢ phòng khám đã ẩn
            const apiParams = { limit: 100, status: "all" };

            if (activeParentCategory?.title) {
                apiParams.category = mapCategoryToEnum(activeParentCategory.title);
            }

            const res = await clinicApi.getAllClinics(apiParams);
            let allClinics = res?.data?.branches || [];

            // Lọc theo phân quyền ngay từ Client nếu là Admin thường
            if (!isSuperAdmin && user?.email) {
                allClinics = allClinics.filter((b) => b.managerId?.email === user.email);
            }

            return allClinics;
        },
        staleTime: 1 * 60 * 1000,
    });

    const isLoading = isLoadingClinics && !clinics.length;

    // ==========================================
    // REACT QUERY: MUTATIONS
    // ==========================================

    const deleteMutation = useMutation({
        mutationFn: (id) => clinicApi.deleteClinic(id),
        onSuccess: (res, deletedId) => {
            queryClient.setQueryData(["clinics", activeParentCategory?.title, user?.email, isSuperAdmin], (old) => old?.filter((c) => c._id !== deletedId));
            showToast("Xóa phòng khám thành công!");
            setIsDeleteModalOpen(false);
            setClinicToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["clinics"] });
        },
        onError: (err) => showToast(translateErrorMessage(err.response?.data?.error || err.response?.data?.message || err.message) || "Không thể xóa do đang có dữ liệu liên kết", "error"),
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (id) => clinicApi.toggleStatus(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ["clinics"] });
            const prevData = queryClient.getQueryData(["clinics", activeParentCategory?.title, user?.email, isSuperAdmin]);
            queryClient.setQueryData(["clinics", activeParentCategory?.title, user?.email, isSuperAdmin], (old) => old?.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c)));
            return { prevData };
        },
        onSuccess: () => showToast("Đã thay đổi trạng thái!"),
        onError: (err, id, context) => {
            showToast(translateErrorMessage(err.response?.data?.message) || "Lỗi thay đổi trạng thái", "error");
            queryClient.setQueryData(["clinics", activeParentCategory?.title, user?.email, isSuperAdmin], context.prevData);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["clinics"] }),
    });

    const saveMutation = useMutation({
        mutationFn: ({ id, payload }) => (id ? clinicApi.updateClinic(id, payload) : clinicApi.createClinic(payload)),
        onSuccess: (res, variables) => {
            const savedClinic = res?.data?.branch || res?.data?.clinic || res?.data;
            const selectedDistrict = districts.find((d) => d._id === formData.districtId) || { _id: formData.districtId, name: "..." };

            // Optimistic Update
            queryClient.setQueryData(["clinics", activeParentCategory?.title, user?.email, isSuperAdmin], (old) => {
                if (!old) return old;
                if (variables.id) {
                    return old.map((c) => {
                        if (c._id === variables.id) {
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
                    });
                } else {
                    const newClinic = {
                        _id: savedClinic?._id || Date.now().toString(),
                        name: formData.name,
                        address: formData.address,
                        hotline: formData.hotline,
                        districtId: selectedDistrict,
                        isActive: true,
                        imageUrls: imagePreviews,
                        totalRating: 0,
                        totalReview: 0,
                        ...savedClinic,
                    };
                    return [newClinic, ...old];
                }
            });

            showToast(variables.id ? "Cập nhật thành công!" : "Tạo phòng khám thành công!");
            setIsFormModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["clinics"] });
        },
        onError: (err) => showToast(translateErrorMessage(err.response?.data?.error || err.response?.data?.message || err.message) || "Có lỗi xảy ra khi lưu phòng khám", "error"),
    });

    const isSubmitting = deleteMutation.isPending || saveMutation.isPending || toggleStatusMutation.isPending;

    // ==========================================
    // HANDLERS FORM & UI
    // ==========================================

    const openAddModal = () => {
        setIsEditMode(false);
        setEditClinicId(null);
        setFormData({ ...initialForm, category: mapCategoryToEnum(activeParentCategory?.title) });
        setImageFiles([]);
        setImagePreviews([]);
        setOldImageUrls([]);
        setIsFormModalOpen(true);
    };

    const openEditModal = (e, clinic) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditClinicId(clinic._id);

        let lng = "",
            lat = "";
        if (clinic.location?.coordinates) {
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
            managerId: clinic.managerId?._id || clinic.managerId || "",
            email: clinic.email || "",
            description: clinic.description || "",
            mapsUrl: clinic.mapsUrl || "",
            longitude: lng,
            latitude: lat,
            openTime: clinic.openingHours?.openTime || "07:30",
            closeTime: clinic.openingHours?.closeTime || "19:30",
            availableServiceIds: clinicServiceIds,
            category: clinic.category || mapCategoryToEnum(activeParentCategory?.title) || "",
        });

        setImageFiles([]);
        setImagePreviews([]);
        setOldImageUrls(clinic.imageUrls || []);
        setIsFormModalOpen(true);
    };
    const handlePhoneKeyDown = (e) => {
        // Chặn dấu trừ, cộng, chữ e/E, và dấu chấm
        if (["-", "+", "e", "E", "."].includes(e.key)) {
            e.preventDefault();
        }
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "hotline") {
            // Lọc bỏ mọi thứ không phải là số
            const sanitizedValue = value.replace(/[^0-9]/g, "");
            // Giới hạn không cho nhập quá 10 số
            if (sanitizedValue.length > 10) return;
            setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };
    const handleDistrictChange = (selectedOption) => setFormData((prev) => ({ ...prev, districtId: selectedOption ? selectedOption.value : "" }));
    const handleServiceCheckbox = (serviceId) =>
        setFormData((prev) => ({
            ...prev,
            availableServiceIds: prev.availableServiceIds.includes(serviceId) ? prev.availableServiceIds.filter((id) => id !== serviceId) : [...prev.availableServiceIds, serviceId],
        }));

    const isAllServicesSelected = services.length > 0 && formData.availableServiceIds.length === services.length;
    const handleSelectAllServices = () =>
        setFormData((prev) => ({
            ...prev,
            availableServiceIds: isAllServicesSelected ? [] : services.map((s) => s._id),
        }));

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

    const handleSubmitForm = (e) => {
        if (e) e.preventDefault();
        if (!formData.name || !formData.districtId || !formData.address || !formData.hotline) {
            return showToast("Vui lòng điền đủ Tên, Quận, Địa chỉ và Hotline!", "error");
        }
        // Validate SĐT (Bắt buộc 10 số)
        if (formData.hotline.length !== 10) {
            return showToast("Số điện thoại Hotline phải bao gồm đúng 10 chữ số!", "error");
        }
        // Validate Email (Nếu có nhập)
        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                return showToast("Định dạng email không hợp lệ!", "error");
            }
        }
        const submitData = new FormData();
        ["name", "districtId", "address", "hotline", "email", "description", "mapsUrl", "category", "managerId"].forEach((key) => {
            if (formData[key]) submitData.append(key, formData[key]);
        });

        if (formData.longitude && formData.latitude) {
            submitData.append("location", JSON.stringify({ type: "Point", coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)] }));
        }
        submitData.append("openingHours", JSON.stringify({ openTime: formData.openTime, closeTime: formData.closeTime, breakStart: "12:00", breakEnd: "13:00" }));
        submitData.append("availableServiceIds", JSON.stringify(formData.availableServiceIds));
        imageFiles.forEach((file) => submitData.append("images", file));

        if (isEditMode) submitData.append("imageUrls", JSON.stringify(oldImageUrls.length === 0 && imageFiles.length === 0 ? [] : oldImageUrls));

        saveMutation.mutate({ id: editClinicId, payload: submitData });
    };

    const handleDeleteClick = (e, id, name) => {
        e.stopPropagation();
        setClinicToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const handleRowClick = (clinicId) => {
        const clickedClinic = clinics.find((c) => c._id === clinicId);
        navigate(`/clinics/${clinicId}`, { state: { clinicData: clickedClinic, districtsData: districts, servicesData: services, adminsData: admins } });
    };

    // Lọc dữ liệu hiển thị
    const filteredClinics = clinics.filter((clinic) => {
        const normalizedSearch = removeVietnameseTones(searchTerm);
        const normalizedName = removeVietnameseTones(clinic.name || "");
        const normalizedAddress = removeVietnameseTones(clinic.address || "");
        const matchesSearch = normalizedName.includes(normalizedSearch) || normalizedAddress.includes(normalizedSearch);

        let matchesStatus = true;
        if (filterStatus === "active") matchesStatus = clinic.isActive === true;
        if (filterStatus === "inactive") matchesStatus = clinic.isActive === false;

        let matchesProvince = true;
        if (isSuperAdmin && filterProvince !== "all") {
            const clinicDistrictId = clinic.districtId?._id || clinic.districtId;
            const districtObj = districts.find((d) => d._id === clinicDistrictId);
            const clinicProvinceId = districtObj?.provinceId?._id || clinic.districtId?.provinceId?._id;
            matchesProvince = clinicProvinceId === filterProvince;
        }

        return matchesSearch && matchesStatus && matchesProvince;
    });

    // Options UI
    const uniqueProvinces = Array.from(new Map(districts.filter((d) => d.provinceId).map((d) => [d.provinceId._id, { _id: d.provinceId._id, name: d.provinceId.name }])).values());
    const provinceOptions = [{ value: "all", label: "Tất cả Tỉnh/Thành" }, ...uniqueProvinces.map((p) => ({ value: p._id, label: p.name }))];
    const districtOptions = districts.map((d) => ({ value: d._id, label: `${d.name} (${d.provinceId?.name})` }));
    const assignedManagerIds = clinics
        .map((c) => c.managerId?._id || c.managerId)
        .filter(Boolean);

    // Lọc ra các Admin hợp lệ
    const availableAdmins = admins.filter((admin) => {
        const adminId = admin.userId || admin._id;
        // Hiển thị nếu Admin chưa quản lý chi nhánh nào HOẶC là người quản lý của chi nhánh đang sửa
        return !assignedManagerIds.includes(adminId) || adminId === formData.managerId;
    });
    const adminOptions = availableAdmins.map((admin) => ({
        value: admin.userId || admin._id,
        label: `${admin.fullName || admin.username || "Chưa có tên"} - ${admin.email || admin.phone || ""}`,
    }));

    const customSelectStyles = {
        control: (provided, state) => ({ ...provided, minHeight: "38px", borderRadius: "6px", fontSize: "14px", borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db", boxShadow: "none", "&:hover": { borderColor: "var(--primary-color)" }, backgroundColor: "#fff" }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white", color: state.isSelected ? "var(--primary-color)" : "#374151", cursor: "pointer", margin: "4px", borderRadius: "6px", fontSize: "14px", width: "96%" }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({ ...provided, overflowX: "hidden" }),
    };

    if (isLoading) return <div className="z-clinic-state">Đang tải dữ liệu...</div>;
    if (clinicsError) return <div className="z-clinic-state z-clinic-error">{clinicsError.message}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Chi nhánh" }]} title={`Quản lí phòng khám`} description="Quản lí và thiết lập khu vực, định vị của các phòng khám trên các tỉnh thành." />

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
                        <button className="z-clinic-btn-filter" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
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

                    {isSuperAdmin && (
                        <div className="z-clinic-filter" style={{ minWidth: "250px", zIndex: 10 }}>
                            <Select options={provinceOptions} value={provinceOptions.find((opt) => opt.value === filterProvince) || provinceOptions[0]} onChange={(selected) => setFilterProvince(selected ? selected.value : "all")} placeholder="-- Gõ để tìm Tỉnh/Thành --" isSearchable={true} styles={customSelectStyles} noOptionsMessage={() => "Không tìm thấy Tỉnh/Thành"} />
                        </div>
                    )}

                    {isSuperAdmin && (
                        <AddButton onClick={openAddModal} className="z-clinic-add-btn-pull-right" style={{ marginLeft: "auto" }}>
                            Thêm Phòng Khám
                        </AddButton>
                    )}
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
                                filteredClinics.map((clinic, index) => {
                                    const mId = clinic.managerId?._id || clinic.managerId;
                                    const mObj = admins.find((a) => a.userId === mId || a._id === mId);
                                    const managerName = mObj?.fullName || mObj?.username || clinic.managerId?.fullName || clinic.managerId?.email || clinic.managerId?.name;

                                    return (
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
                                                {managerName ? (
                                                    <div className="z-clinic-subtext" style={{ marginTop: "4px", fontSize: "12px", color: "#4b5563" }}>
                                                        Quản lý: <span style={{ fontWeight: "600", color: "var(--primary-color, #312e81)" }}>{managerName}</span>
                                                    </div>
                                                ) : (
                                                    <div className="z-clinic-subtext" style={{ marginTop: "4px", fontSize: "12px", fontStyle: "italic", color: "#9ca3af" }}>
                                                        Chưa gán quản lý
                                                    </div>
                                                )}
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
                                                        {/* <Button
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleStatusMutation.mutate(clinic._id);
                                                            }}
                                                            disabled={toggleStatusMutation.isPending}
                                                        >
                                                            {clinic.isActive ? "Tạm dừng" : "Kích hoạt"}
                                                        </Button> */}
                                                        <EditButton onClick={(e) => openEditModal(e, clinic)} />
                                                        {isSuperAdmin && <DeleteButton onClick={(e) => handleDeleteClick(e, clinic._id, clinic.name)} />}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MODAL FORM */}
                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật Phòng khám" : "Thêm mới Phòng khám"} maxWidth="900px" onSave={handleSubmitForm} saveText={isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}>
                    <div className="z-clinic-form">
                        <div className="z-clinic-form-grid">
                            <div className="z-clinic-form-column">
                                <div className="z-clinic-form-group">
                                    <label>Danh mục hệ thống</label>
                                    <input style={{ color: "var(--primary-color)", fontWeight: "500" }} type="text" value={activeParentCategory?.title || "Chưa xác định"} disabled className="z-clinic-input readonly z-clinic-input-highlight" />
                                    <small className="z-clinic-required">
                                        * <span style={{ color: "grey", fontSize: "12px", fontStyle: "italic" }}>: Các trường có dấu sao là bắt buộc. Vui lòng nhập đầy đủ thông tin.</span>
                                    </small>
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>
                                        Tên Phòng Khám <span className="z-clinic-required">*</span>
                                    </label>
                                    <input type="text" name="name" className="z-clinic-input" required value={formData.name}  placeholder="VD: Nha Khoa Sài Gòn Tâm Đức - phường....." onChange={handleInputChange} disabled={isSubmitting} />
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>Quản lí (Admin)</label>
                                    <Select options={adminOptions} value={adminOptions.find((opt) => opt.value === formData.managerId) || null} onChange={(selected) => setFormData((prev) => ({ ...prev, managerId: selected ? selected.value : "" }))} placeholder="-- Gõ để tìm Admin --" isSearchable={true} isDisabled={isSubmitting || !isSuperAdmin} styles={customSelectStyles} noOptionsMessage={() => "Không tìm thấy Admin nào"} />
                                </div>
                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Hotline <span className="z-clinic-required">*</span>
                                        </label>
                                        <input type="text" name="hotline" className="z-clinic-input" placeholder="VD: 1900988973"required value={formData.hotline} onChange={handleInputChange} onKeyDown={handlePhoneKeyDown} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Email liên hệ</label>
                                        <input type="email" name="email" className="z-clinic-input" placeholder="VD: clinic@gmail.com" value={formData.email} onChange={handleInputChange} disabled={isSubmitting} />
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
                                    <textarea name="address" rows="2" className="z-clinic-textarea" required value={formData.address}  placeholder="Nhập địa chỉ nha khoa..." onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>Mô tả / Giới thiệu</label>
                                    <textarea name="description" rows="3" className="z-clinic-textarea" value={formData.description} onChange={handleInputChange} disabled={isSubmitting}></textarea>
                                </div>
                            </div>
                            <div className="z-clinic-form-column">
                                <h3 className="z-clinic-form-section-title">Định vị & Bản đồ</h3>
                                <div className="z-clinic-form-group">
                                    <label>
                                        Link Google Maps <span className="z-clinic-required">*</span>
                                    </label>
                                    <input type="url" name="mapsUrl" className="z-clinic-input" placeholder="http://googleusercontent.com/maps..." value={formData.mapsUrl} onChange={handleInputChange} disabled={isSubmitting} />
                                </div>
                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Kinh độ (Lng) <span className="z-clinic-required">*</span>
                                        </label>
                                        <input type="number" step="any" name="longitude" className="z-clinic-input" placeholder="VD: 106.59" value={formData.longitude} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Vĩ độ (Lat) <span className="z-clinic-required">*</span>
                                        </label>
                                        <input type="number" step="any" name="latitude" className="z-clinic-input" placeholder="VD: 10.76" value={formData.latitude} onChange={handleInputChange} disabled={isSubmitting} />
                                    </div>
                                </div>
                                <h3 className="z-clinic-form-section-title z-clinic-mt-16">Hoạt động & Dịch vụ</h3>
                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Giờ mở cửa <span className="z-clinic-required">*</span>
                                        </label>
                                        <Select options={TIME_OPTIONS} value={TIME_OPTIONS.find((opt) => opt.value === formData.openTime) || null} onChange={(selected) => setFormData((prev) => ({ ...prev, openTime: selected ? selected.value : "" }))} isDisabled={isSubmitting} placeholder="Chọn giờ" styles={customSelectStyles} />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Giờ đóng cửa <span className="z-clinic-required">*</span>
                                        </label>
                                        <Select options={TIME_OPTIONS} value={TIME_OPTIONS.find((opt) => opt.value === formData.closeTime) || null} onChange={(selected) => setFormData((prev) => ({ ...prev, closeTime: selected ? selected.value : "" }))} isDisabled={isSubmitting} placeholder="Chọn giờ" styles={customSelectStyles} />
                                    </div>
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>Dịch vụ cung cấp</label>
                                    <div className="z-clinic-services-list">
                                        {services.length > 0 && (
                                            <label className="z-clinic-service-item" style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "8px" }}>
                                                <input type="checkbox" checked={isAllServicesSelected} onChange={handleSelectAllServices} disabled={isSubmitting} />
                                                <span style={{ fontWeight: "bold", color: "var(--primary-color, #1d4ed8)" }}>Chọn tất cả ({services.length} dịch vụ)</span>
                                            </label>
                                        )}
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

                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" maxWidth="700px" onSave={() => deleteMutation.mutate(clinicToDelete?.id)} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
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
