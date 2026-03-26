import React, { useEffect, useRef, useState } from "react";
import { promotionApi, clinicApi, serviceApi, userApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import { AddButton, EditButton, DeleteButton, Button } from "../../ui/Button/Button";
import { Select } from "../../ui/Select/Select";
import ReactSelect from "react-select";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import vi from "date-fns/locale/vi"; // Import tiếng Việt
registerLocale("vi", vi); // Kích hoạt tiếng Việt cho lịch
import "./Promotions.css";

const STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "active", label: "Đang diễn ra" },
    { value: "upcoming", label: "Sắp diễn ra" },
    { value: "expired", label: "Đã hết hạn" },
    { value: "inactive", label: "Đã tắt (Tạm dừng)" },
];
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

const Promotions = () => {
    const fileInputRef = useRef(null);

    // ==========================================
    // 1. STATE QUẢN LÝ DỮ LIỆU
    // ==========================================
    const [users, setUsers] = useState([]);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [promoToApply, setPromoToApply] = useState(null);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState("");
    const [promotions, setPromotions] = useState([]);
    const [branches, setBranches] = useState([]);
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // ==========================================
    // 2. STATE LỌC, TÌM KIẾM & PHÂN TRANG
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterBranch, setFilterBranch] = useState(""); // STATE MỚI: Lọc theo chi nhánh

    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false); // STATE MỚI: Mở menu chi nhánh

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    // ==========================================
    // 3. STATE MODALS (FORM & DELETE)
    // ==========================================
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentPromoId, setCurrentPromoId] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [promoToDelete, setPromoToDelete] = useState(null);

    // ==========================================
    // 4. STATE FORM & ẢNH
    // ==========================================
    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState("");

    const initialFormState = {
        name: "",
        code: "",
        description: "",
        branchId: "",
        isActive: true,
        bannerImageUrl: "",
        badgeText: "",
        details: "",
        terms: "",
        discountType: "percentage",
        discountValue: 0,
        maxDiscountAmount: "",
        minOrderValue: 0,
        startDate: null,
        endDate: null,
        usageLimit: "",
        limitPerUser: "",
        applicableServiceIds: [],
    };
    const [formData, setFormData] = useState(initialFormState);

    // ==========================================
    // 5. FETCH DATA
    // ==========================================
    const fetchPromotions = async () => {
        setIsLoading(true);
        try {
            // Thêm branchId vào params nếu có filter
            const params = { page, limit, search: searchTerm, status: filterStatus };
            if (filterBranch) params.branchId = filterBranch;

            const res = await promotionApi.getAllPromotions(params);
            if (res && res.success) {
                setPromotions(res.data.promotions || []);
                setTotalPages(res.data.pagination?.pages || 1);
            } else {
                setError("Không thể tải danh sách khuyến mãi.");
            }
        } catch (err) {
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReferenceData = async () => {
        try {
            const [branchRes, serviceRes] = await Promise.all([clinicApi.getAllClinics({ limit: 100 }), serviceApi.getAllServices()]);
            if (branchRes && branchRes.success) setBranches(branchRes.data.branches || []);
            if (serviceRes && serviceRes.data) setServices(serviceRes.data.services || []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu tham chiếu:", error);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await userApi.getAllUsers({ limit: 500 });
            const userData = res.users || res.data?.users || [];
            const activeUsers = userData.filter((u) => u?.account?.status !== "INACTIVE");
            setUsers(activeUsers);
        } catch (err) {
            console.error("Lỗi tải danh sách người dùng:", err);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPromotions();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, searchTerm, filterStatus, filterBranch]); // Thêm filterBranch vào dependency

    useEffect(() => {
        fetchReferenceData();
        fetchAllUsers();
    }, []);

    // Reset về trang 1 khi đổi bộ lọc
    // useEffect(() => {
    //     setPage(1);
    // }, [searchTerm, filterStatus, filterBranch]); // Thêm filterBranch vào dependency

    // --- LOGIC TẶNG KHUYẾN MÃI ---
    const openApplyModal = (e, promo) => {
        e.stopPropagation();
        setPromoToApply(promo);
        setSelectedUserIds([]);
        setUserSearchTerm("");
        setIsApplyModalOpen(true);
    };

    const handleToggleSelectUser = (userId) => {
        setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
    };

    const handleSelectAllUsers = (filteredList) => {
        if (selectedUserIds.length === filteredList.length) {
            setSelectedUserIds([]); // Bỏ chọn tất cả
        } else {
            setSelectedUserIds(filteredList.map((u) => u.userId || u._id)); // Chọn tất cả
        }
    };

    const submitApplyPromotion = async () => {
        if (selectedUserIds.length === 0) {
            return setToast({ show: true, message: "Vui lòng chọn ít nhất 1 khách hàng!", type: "error" });
        }

        setIsSubmitting(true);
        try {
            // TẠM THỜI CHƯA CÓ BACKEND -> FAKE DELAY 1 GIÂY
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setToast({ show: true, message: `Đã tặng mã ${promoToApply.code} cho ${selectedUserIds.length} khách hàng!`, type: "success" });
            setIsApplyModalOpen(false);
        } catch (error) {
            setToast({ show: true, message: "Lỗi khi tặng mã", type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Hàm filter danh sách user để hiển thị trong Modal
    const filteredUsers = users.filter((user) => {
        const normalizedSearch = removeVietnameseTones(userSearchTerm);
        const name = removeVietnameseTones(user.fullName || user.username || "");
        const email = removeVietnameseTones(user.email || "");
        const phone = user.phoneNumber || "";
        return name.includes(normalizedSearch) || email.includes(normalizedSearch) || phone.includes(userSearchTerm);
    });

    // ==========================================
    // 6. HANDLERS (DELETE & TOGGLE STATUS)
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const executeDelete = async () => {
        if (!promoToDelete) return;
        setIsSubmitting(true);
        try {
            const response = await promotionApi.deletePromotion(promoToDelete.id);
            if (response && response.success) {
                showToast("Xóa khuyến mãi thành công!");

                // --- Optimistic Update ---
                setPromotions((prev) => prev.filter((promo) => promo._id !== promoToDelete.id));
                // -------------------------

                setIsDeleteModalOpen(false);
                setPromoToDelete(null);
            } else {
                showToast(response?.message || "Lỗi xóa khuyến mãi", "error");
            }
        } catch (error) {
            showToast("Không thể xóa khuyến mãi lúc này", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (id) => {
        const previousPromotions = [...promotions];
        setPromotions((prev) =>
            prev.map((promo) => {
                if (promo._id === id) {
                    const newIsActive = !promo.isActive;
                    let newComputed = "inactive";
                    if (newIsActive) {
                        const now = new Date();
                        const end = new Date(promo.endDate);
                        const start = new Date(promo.startDate);
                        if (now > end) newComputed = "expired";
                        else if (now < start) newComputed = "upcoming";
                        else newComputed = "active";
                    }
                    return { ...promo, isActive: newIsActive, computedStatus: newComputed };
                }
                return promo;
            }),
        );

        try {
            const res = await promotionApi.togglePromotionStatus(id);
            if (res && res.success) {
                showToast("Đã thay đổi trạng thái!");
            } else {
                setPromotions(previousPromotions);
                showToast("Lỗi khi thay đổi trạng thái", "error");
            }
        } catch (error) {
            setPromotions(previousPromotions);
            showToast("Lỗi kết nối máy chủ", "error");
        }
    };

    // ==========================================
    // 7. LOGIC FORM (CREATE / UPDATE)
    // ==========================================
    const openCreateForm = () => {
        setCurrentPromoId(null);
        setFormData(initialFormState);
        setImageFile(null);
        setPreviewImage("");
        setIsFormModalOpen(true);
    };

    // ĐÃ ÁP DỤNG CÁCH 1: TRUYỀN THẲNG OBJECT PROMO ĐỂ MỞ NHANH
    const openUpdateForm = (e, promo) => {
        if (e) e.stopPropagation();

        setCurrentPromoId(promo._id);
        setFormData({
            name: promo.name || "",
            code: promo.code || "",
            description: promo.description || "",
            branchId: promo.branchId?._id || promo.branchId || "",
            isActive: promo.isActive,
            badgeText: promo.badgeText || "",
            details: Array.isArray(promo.details) ? promo.details.join("\n") : promo.details || "",
            terms: Array.isArray(promo.terms) ? promo.terms.join("\n") : promo.terms || "",
            discountType: promo.discountType || "percentage",
            discountValue: promo.discountValue || 0,
            maxDiscountAmount: promo.maxDiscountAmount || "",
            minOrderValue: promo.minOrderValue || 0,
            startDate: promo.startDate ? new Date(promo.startDate) : null,
            endDate: promo.endDate ? new Date(promo.endDate) : null,
            usageLimit: promo.usageLimit || "",
            limitPerUser: promo.limitPerUser || "",
            applicableServiceIds: promo.applicableServiceIds?.map((s) => s._id || s) || [],
        });

        // Thiết lập ảnh preview nếu có
        setImageFile(null);
        setPreviewImage(promo.bannerImageUrl || "");

        // Mở Form NGAY LẬP TỨC mà không cần chờ gọi API
        setIsFormModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        if (name === "isActive") {
            setFormData((prev) => ({ ...prev, [name]: value === "true" }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleServiceCheckboxChange = (serviceId) => {
        setFormData((prev) => {
            const isSelected = prev.applicableServiceIds.includes(serviceId);
            return {
                ...prev,
                applicableServiceIds: isSelected ? prev.applicableServiceIds.filter((id) => id !== serviceId) : [...prev.applicableServiceIds, serviceId],
            };
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewImage(URL.createObjectURL(file));
        }
        e.target.value = null;
    };

    const removeImage = () => {
        setImageFile(null);
        setPreviewImage("");
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!formData.branchId || !formData.name || !formData.code || !formData.startDate || !formData.endDate || !formData.discountValue) {
            return showToast("Vui lòng điền đầy đủ các trường bắt buộc!", "error");
        }

        setIsSubmitting(true);
        try {
            const submitData = new FormData();
            submitData.append("name", formData.name);
            submitData.append("code", formData.code);
            submitData.append("description", formData.description);
            submitData.append("branchId", formData.branchId);
            submitData.append("isActive", formData.isActive.toString());
            submitData.append("badgeText", formData.badgeText);
            submitData.append("discountType", formData.discountType);
            submitData.append("discountValue", Number(formData.discountValue));

            if (formData.maxDiscountAmount) submitData.append("maxDiscountAmount", Number(formData.maxDiscountAmount));
            if (formData.minOrderValue) submitData.append("minOrderValue", Number(formData.minOrderValue));
            if (formData.usageLimit) submitData.append("usageLimit", Number(formData.usageLimit));
            if (formData.limitPerUser) submitData.append("limitPerUser", Number(formData.limitPerUser));

            submitData.append("startDate", formData.startDate.toISOString());
            submitData.append("endDate", formData.endDate.toISOString());

            submitData.append("details", JSON.stringify(formData.details ? formData.details.split("\n").filter((d) => d.trim() !== "") : []));
            submitData.append("terms", JSON.stringify(formData.terms ? formData.terms.split("\n").filter((t) => t.trim() !== "") : []));
            submitData.append("applicableServiceIds", JSON.stringify(formData.applicableServiceIds));

            if (imageFile) submitData.append("image", imageFile);
            else if (currentPromoId && previewImage) submitData.append("bannerImageUrl", previewImage);
            else if (currentPromoId && !previewImage) submitData.append("bannerImageUrl", "");

            let res;
            if (currentPromoId) res = await promotionApi.updatePromotion(currentPromoId, submitData);
            else res = await promotionApi.createPromotion(submitData);

            if (res && res.success) {
                showToast(currentPromoId ? "Cập nhật thành công!" : "Tạo khuyến mãi thành công!");

                const savedPromo = res.data?.promotion || res.data;

                // MẤU CHỐT Ở ĐÂY: Tìm object chi nhánh đầy đủ từ danh sách đã có trên Frontend
                const fullBranchObject = branches.find((b) => b._id === formData.branchId) || formData.branchId;

                if (currentPromoId) {
                    setPromotions((prev) =>
                        prev.map((p) => {
                            if (p._id === currentPromoId) {
                                // Lấy data API trả về, nhưng ghi đè branchId bằng Object đầy đủ
                                return {
                                    ...(savedPromo && savedPromo._id ? savedPromo : p),
                                    ...formData,
                                    details: formData.details ? formData.details.split("\n").filter((d) => d.trim() !== "") : [],
                                    terms: formData.terms ? formData.terms.split("\n").filter((t) => t.trim() !== "") : [],
                                    branchId: fullBranchObject, // <--- Ép kiểu thành Object ở đây
                                    bannerImageUrl: imageFile ? URL.createObjectURL(imageFile) : previewImage,
                                    computedStatus: !formData.isActive ? "inactive" : p.computedStatus,
                                };
                            }
                            return p;
                        }),
                    );
                } else {
                    // Lấy data API trả về, nhưng ghi đè branchId bằng Object đầy đủ
                    const newPromo = {
                        ...(savedPromo && savedPromo._id ? savedPromo : { _id: Date.now().toString() }),
                        ...formData,
                        branchId: fullBranchObject, // <--- Ép kiểu thành Object ở đây
                        usedCount: 0,
                        computedStatus: formData.isActive ? "active" : "inactive",
                        bannerImageUrl: imageFile ? URL.createObjectURL(imageFile) : savedPromo?.bannerImageUrl || "",
                    };
                    setPromotions((prev) => [newPromo, ...prev]);
                }
                setIsFormModalOpen(false);
            } else {
                showToast(res?.message || "Có lỗi xảy ra", "error");
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi lưu khuyến mãi", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 8. HELPER UI
    // ==========================================
    const getStatusLabelText = (status) => {
        const option = STATUS_OPTIONS.find((opt) => opt.value === status);
        return option ? option.label : "Tất cả trạng thái";
    };

    // Helper text cho nút dropdown chi nhánh
    const getBranchLabelText = () => {
        if (!filterBranch) return "Tất cả chi nhánh";
        const branch = branches.find((b) => b._id === filterBranch);
        return branch ? branch.name : "Tất cả chi nhánh";
    };

    const formatDiscount = (type, value) => {
        if (type === "percentage") return `${value}%`;
        return `${value.toLocaleString("vi-VN")} đ`;
    };

    const filterBranchOptions = [{ value: "", label: "Tất cả chi nhánh" }, ...branches.map((b) => ({ value: b._id, label: b.name }))];
    const formBranchOptions = branches.map((b) => ({ value: b._id, label: b.name }));

    // Bê nguyên style từ file Location.jsx sang
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

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Khuyến Mãi" }]} title="Quản lý Khuyến Mãi" description="Thiết lập các chương trình giảm giá, mã giảm giá và theo dõi lượt sử dụng." />

            <div className="z-promo-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-promo-header">
                    <h1 className="z-promo-title">Danh sách Khuyến Mãi</h1>
                </div>

                {/* --- TOOLS BAR --- */}
                <div className="z-promo-tools">
                    <div className="z-promo-search">
                        <input type="text" placeholder="Tìm mã hoặc tên khuyến mãi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* Filter CHI NHÁNH */}

                    <div style={{ minWidth: "300px", zIndex: 10 }}>
                        <ReactSelect
                            options={filterBranchOptions}
                            value={filterBranchOptions.find((opt) => opt.value === filterBranch) || filterBranchOptions[0]}
                            // 🟢 SỬA DÒNG NÀY:
                            onChange={(selected) => {
                                setFilterBranch(selected ? selected.value : "");
                                setPage(1);
                            }}
                            styles={customSelectStyles}
                            isSearchable={true}
                            placeholder="Tìm Chi nhánh..."
                            noOptionsMessage={() => "Không tìm thấy chi nhánh"}
                        />
                    </div>

                    {/* Filter TRẠNG THÁI */}
                    <div className="z-promo-filter">
                        <button
                            className="z-promo-btn-filter"
                            onClick={() => {
                                setShowStatusDropdown(!showStatusDropdown);
                                setShowBranchDropdown(false);
                            }}
                        >
                            <span>{getStatusLabelText(filterStatus)}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showStatusDropdown && (
                            <div className="z-promo-dropdown-menu">
                                {STATUS_OPTIONS.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={`z-promo-dropdown-item ${filterStatus === opt.value ? "active" : ""}`}
                                        onClick={() => {
                                            setFilterStatus(opt.value);
                                            setShowStatusDropdown(false);
                                            setPage(1);
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <AddButton onClick={openCreateForm} style={{ marginLeft: "auto" }}>
                        Thêm Khuyến Mãi
                    </AddButton>
                </div>

                {/* --- TABLE --- */}
                <div className="z-promo-table-wrapper">
                    <table className="z-promo-table">
                        <thead>
                            <tr>
                                <th>Mã KM</th>
                                <th>Tên Khuyến Mãi</th>
                                <th>Mức giảm</th>
                                <th>Thời gian áp dụng</th>
                                <th>Đã dùng</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && promotions.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="z-promo-state">Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="z-promo-state z-promo-error">{error}</div>
                                    </td>
                                </tr>
                            ) : promotions.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="z-promo-state">Không tìm thấy khuyến mãi nào phù hợp.</div>
                                    </td>
                                </tr>
                            ) : (
                                promotions.map((promo) => (
                                    <tr key={promo._id} className="z-promo-clickable-row" onClick={(e) => openUpdateForm(e, promo)}>
                                        <td>
                                            <strong style={{ color: "var(--primary-color)" }}>{promo.code}</strong>
                                        </td>
                                        <td>
                                            <div className="z-promo-text-bold z-promo-text-clamp">{promo.name}</div>
                                            <div className="z-promo-subtext">{promo.branchId?.name || "Đang tải..."}</div>
                                        </td>
                                        <td>
                                            <div className="z-promo-text-bold" style={{ color: "var(--error)" }}>
                                                {formatDiscount(promo.discountType, promo.discountValue)}
                                            </div>
                                            {promo.maxDiscountAmount && promo.discountType === "percentage" && <div className="z-promo-subtext">Tối đa: {promo.maxDiscountAmount.toLocaleString("vi-VN")}đ</div>}
                                        </td>
                                        <td>
                                            <div className="z-promo-text-normal">Từ: {new Date(promo.startDate).toLocaleDateString("vi-VN")}</div>
                                            <div className="z-promo-subtext">Đến: {new Date(promo.endDate).toLocaleDateString("vi-VN")}</div>
                                        </td>
                                        <td>
                                            <div className="z-promo-text-bold">
                                                {promo.usedCount || 0} / {promo.usageLimit || "∞"}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`z-promo-badge-${promo.computedStatus}`}>{getStatusLabelText(promo.computedStatus)}</span>
                                        </td>
                                        <td>
                                            <div className="z-promo-dropdown-actions" onClick={(e) => e.stopPropagation()}>
                                                <button className="z-promo-more-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>
                                                <div className="z-promo-action-menu">
                                                    <Button variant="outline" onClick={(e) => openApplyModal(e, promo)}>
                                                        Tặng KH
                                                    </Button>
                                                    <Button variant="outline" onClick={() => handleToggleStatus(promo._id)}>
                                                        {promo.isActive ? "Tạm dừng" : "Kích hoạt"}
                                                    </Button>
                                                    <EditButton onClick={(e) => openUpdateForm(e, promo)} />
                                                    <DeleteButton
                                                        onClick={() => {
                                                            setPromoToDelete({ id: promo._id, name: promo.name, code: promo.code });
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- PAGINATION --- */}
                {totalPages > 1 && (
                    <div className="z-promo-pagination">
                        <button className="z-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                            Trước
                        </button>
                        <div className="z-pagination-numbers">
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i + 1} className={`z-pagination-number ${page === i + 1 ? "active" : ""}`} onClick={() => setPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button className="z-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                            Sau
                        </button>
                    </div>
                )}

                {/* --- MODAL FORM CHÍNH --- */}
                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={currentPromoId ? "Cập nhật Khuyến mãi" : "Tạo mới Khuyến mãi"} maxWidth="1000px" onSave={handleFormSubmit} saveText={isSubmitting ? "Đang xử lý..." : "Lưu Khuyến Mãi"}>
                    <div className="z-promo-form">
                        <div className="z-promo-form-grid">
                            {/* CỘT TRÁI */}
                            <div className="z-promo-form-column">
                                <h3 className="z-promo-form-subtitle">Thông tin cơ bản</h3>

                                <div className="z-promo-form-group">
                                    <label>
                                        Chi nhánh áp dụng <span className="z-promo-required">*</span>
                                    </label>
                                    <ReactSelect
                                        name="branchId"
                                        options={formBranchOptions}
                                        // Tìm option tương ứng với giá trị đang lưu trong formData
                                        value={formBranchOptions.find((opt) => opt.value === formData.branchId) || null}
                                        // Ghi đè thẳng vào state formData
                                        onChange={(selected) => setFormData((prev) => ({ ...prev, branchId: selected ? selected.value : "" }))}
                                        // Lưu ý: react-select dùng thuộc tính 'isDisabled' thay vì 'disabled'
                                        isDisabled={isSubmitting || !!currentPromoId}
                                        styles={customSelectStyles}
                                        placeholder="-- Chọn chi nhánh --"
                                        isSearchable={true}
                                        noOptionsMessage={() => "Không tìm thấy chi nhánh"}
                                        menuPosition="fixed" // 🟢 Cực kỳ quan trọng: Giúp menu xổ xuống không bị Modal cắt mất
                                    />
                                </div>

                                <div className="z-promo-form-row">
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>
                                            Mã KM (Code) <span className="z-promo-required">*</span>
                                        </label>
                                        <input type="text" name="code" className="z-promo-input" style={{ textTransform: "uppercase" }} required placeholder="VD: SUMMER26" value={formData.code} onChange={handleFormChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-promo-form-group" style={{ flex: 2 }}>
                                        <label>
                                            Tên Khuyến mãi <span className="z-promo-required">*</span>
                                        </label>
                                        <input type="text" name="name" className="z-promo-input" required placeholder="VD: Giảm giá hè..." value={formData.name} onChange={handleFormChange} disabled={isSubmitting} />
                                    </div>
                                </div>

                                <div className="z-promo-form-group">
                                    <label>Mô tả ngắn gọn</label>
                                    <textarea name="description" className="z-promo-textarea" rows="2" value={formData.description} onChange={handleFormChange} disabled={isSubmitting}></textarea>
                                </div>

                                <h3 className="z-promo-form-subtitle" style={{ marginTop: "16px" }}>
                                    Thiết lập giảm giá
                                </h3>
                                <div className="z-promo-form-row">
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>Loại giảm giá</label>
                                        <Select
                                            name="discountType"
                                            options={[
                                                { value: "percentage", label: "Theo phần trăm (%)" },
                                                { value: "fixed", label: "Số tiền cố định (VNĐ)" },
                                            ]}
                                            value={formData.discountType}
                                            onChange={handleFormChange}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>
                                            Giá trị giảm <span className="z-promo-required">*</span>
                                        </label>
                                        <input type="number" name="discountValue" className="z-promo-input" required min="1" value={formData.discountValue} onChange={handleFormChange} disabled={isSubmitting} />
                                    </div>
                                </div>

                                <div className="z-promo-form-row">
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>Giảm tối đa (VNĐ)</label>
                                        <input type="number" name="maxDiscountAmount" className="z-promo-input" placeholder="Để trống = Bất chấp" value={formData.maxDiscountAmount} onChange={handleFormChange} disabled={isSubmitting || formData.discountType === "fixed"} />
                                    </div>
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>Đơn tối thiểu (VNĐ)</label>
                                        <input type="number" name="minOrderValue" className="z-promo-input" value={formData.minOrderValue} onChange={handleFormChange} disabled={isSubmitting} />
                                    </div>
                                </div>

                                <div className="z-promo-form-group">
                                    <label>Dịch vụ áp dụng</label>
                                    <div className="z-promo-checkbox-list">
                                        {services.map((s) => (
                                            <label key={s._id} className="z-promo-checkbox-item">
                                                <input type="checkbox" checked={formData.applicableServiceIds.includes(s._id)} onChange={() => handleServiceCheckboxChange(s._id)} disabled={isSubmitting} />
                                                <span>{s.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* CỘT PHẢI */}
                            <div className="z-promo-form-column">
                                <h3 className="z-promo-form-subtitle">Thời gian & Giới hạn</h3>

                                <div className="z-promo-form-row">
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>
                                            Bắt đầu <span className="z-promo-required">*</span>
                                        </label>
                                        <DatePicker
                                            selected={formData.startDate}
                                            onChange={(date) => setFormData((prev) => ({ ...prev, startDate: date }))}
                                            showTimeSelect
                                            timeFormat="HH:mm"
                                            timeIntervals={15} // Bước nhảy thời gian là 15 phút
                                            dateFormat="dd/MM/yyyy HH:mm"
                                            className="z-promo-input" // Giữ nguyên class CSS để ô input đẹp như cũ
                                            placeholderText="Chọn ngày & giờ"
                                            disabled={isSubmitting}
                                            locale="vi" // Dùng tiếng Việt
                                        />
                                    </div>
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>
                                            Kết thúc <span className="z-promo-required">*</span>
                                        </label>
                                        <DatePicker selected={formData.endDate} onChange={(date) => setFormData((prev) => ({ ...prev, endDate: date }))} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy HH:mm" className="z-promo-input" placeholderText="Chọn ngày & giờ" disabled={isSubmitting} locale="vi" />
                                    </div>
                                </div>

                                <div className="z-promo-form-row">
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>Tổng lượt dùng</label>
                                        <input type="number" name="usageLimit" className="z-promo-input" placeholder="∞" min="1" value={formData.usageLimit} onChange={handleFormChange} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>Lượt dùng/Khách</label>
                                        <input type="number" name="limitPerUser" className="z-promo-input" placeholder="∞" min="1" value={formData.limitPerUser} onChange={handleFormChange} disabled={isSubmitting} />
                                    </div>
                                </div>

                                {/* <h3 className="z-promo-form-subtitle" style={{ marginTop: "16px" }}>
                                    Nội dung App Khách
                                </h3> */}

                                <div className="z-promo-form-group">
                                    <label>Ảnh Banner (Giao diện Khách)</label>
                                    <div className="z-promo-upload-wrapper">
                                        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />
                                        {previewImage ? (
                                            <div className="z-promo-image-preview-box">
                                                <img src={previewImage} alt="Preview" />
                                                <button type="button" className="z-promo-remove-img-btn" onClick={removeImage}>
                                                    ×
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="z-promo-image-upload-btn" onClick={() => fileInputRef.current.click()}>
                                                <span>+ Tải ảnh Banner</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="z-promo-form-group">
                                    <label>Nhãn nổi bật (VD: HOT, SALE)</label>
                                    <input type="text" name="badgeText" className="z-promo-input" value={formData.badgeText} onChange={handleFormChange} disabled={isSubmitting} />
                                </div>

                                <div className="z-promo-form-group">
                                    <label>Chi tiết (Mỗi dòng là 1 ý)</label>
                                    <textarea
                                        name="details"
                                        className="z-promo-textarea"
                                        rows="2"
                                        placeholder="- Giảm 20% Răng Sứ&#10;- Tặng kèm cạo vôi"
                                        value={formData.details}
                                        onChange={handleFormChange}
                                        disabled={isSubmitting}
                                    ></textarea>
                                </div>

                                <div className="z-promo-form-group">
                                    <label>Điều khoản (Mỗi dòng là 1 ý)</label>
                                    <textarea
                                        name="terms"
                                        className="z-promo-textarea"
                                        rows="2"
                                        placeholder="- Áp dụng KH mới&#10;- Không cộng dồn"
                                        value={formData.terms}
                                        onChange={handleFormChange}
                                        disabled={isSubmitting}
                                    ></textarea>
                                </div>

                                <div className="z-promo-form-group">
                                    <label>Trạng thái khởi tạo</label>
                                    <Select
                                        name="isActive"
                                        options={[
                                            { value: "true", label: "Bật (Tự động kích hoạt khi đến ngày)" },
                                            { value: "false", label: "Tắt (Lưu nháp/Tạm dừng)" },
                                        ]}
                                        value={formData.isActive.toString()}
                                        onChange={handleFormChange}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* --- MODAL XÓA --- */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={executeDelete} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-promo-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xóa khuyến mãi?</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa mã <strong style={{ color: "var(--primary-color)" }}>{promoToDelete?.code}</strong> không? Hành động này không thể hoàn tác.
                        </p>
                    </div>
                </Modal>

                {/* MODAL TẶNG KHUYẾN MÃI CHO KHÁCH HÀNG */}
                <Modal isOpen={isApplyModalOpen} onClose={() => !isSubmitting && setIsApplyModalOpen(false)} title={`Tặng mã Khuyến mãi: ${promoToApply?.code || ""}`} maxWidth="600px" onSave={submitApplyPromotion} saveText={isSubmitting ? "Đang xử lý..." : `Xác nhận tặng (${selectedUserIds.length})`}>
                    <div className="z-promo-apply-content">
                        <p style={{ marginBottom: "15px", color: "#6b7280", fontSize: "14px" }}>Chọn khách hàng bạn muốn gửi trực tiếp mã giảm giá này vào tài khoản.</p>

                        <input type="text" className="z-promo-input" placeholder="Tìm theo tên, SĐT, email..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} style={{ marginBottom: "15px" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #e5e7eb" }}>
                            <strong style={{ fontSize: "14px" }}>Danh sách Khách hàng ({filteredUsers.length})</strong>
                            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "14px", color: "var(--primary-color)" }}>
                                <input type="checkbox" checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length} onChange={() => handleSelectAllUsers(filteredUsers)} />
                                <strong>Chọn tất cả</strong>
                            </label>
                        </div>

                        <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px" }}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Không tìm thấy khách hàng nào.</div>
                            ) : (
                                filteredUsers.map((user) => {
                                    const userId = user.userId || user._id;
                                    return (
                                        <label
                                            key={userId}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                padding: "10px",
                                                borderBottom: "1px solid #f3f4f6",
                                                cursor: "pointer",
                                                transition: "background 0.2s",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                        >
                                            <input type="checkbox" checked={selectedUserIds.includes(userId)} onChange={() => handleToggleSelectUser(userId)} />
                                            <div>
                                                <div style={{ fontWeight: "600", color: "#374151" }}>{user.fullName || user.username || "Khách hàng ẩn danh"}</div>
                                                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                                                    {user.phoneNumber || "Chưa có SĐT"} {user.email ? ` • ${user.email}` : ""}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Promotions;
