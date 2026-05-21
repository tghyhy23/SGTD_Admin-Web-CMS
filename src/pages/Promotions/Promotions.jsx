import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { promotionApi, clinicApi, serviceApi, userApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import { AddButton, EditButton, DeleteButton, Button } from "../../ui/Button/Button";
import ReactSelect from "react-select";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import vi from "date-fns/locale/vi";
import { useAuth } from "../../context/AuthContext";
import "./Promotions.css";

registerLocale("vi", vi);

const STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "active", label: "Đang diễn ra" },
    { value: "upcoming", label: "Sắp diễn ra" },
    { value: "expired", label: "Đã hết hạn" },
    { value: "inactive", label: "Đã tắt (Tạm dừng)" },
];

const handlePreventInvalidChars = (e) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
        e.preventDefault();
    }
};

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

const ERROR_MESSAGES_MAP = {
    "Branch not found!": "Không tìm thấy chi nhánh!",
    "Missing required fields!": "Vui lòng điền đầy đủ các trường bắt buộc!",
    "End date must be after start date!": "Ngày kết thúc phải sau ngày bắt đầu!",
    "Promotion code already exists in this branch!": "Mã khuyến mãi này đã tồn tại trong chi nhánh!",
    "Promotion not found!": "Không tìm thấy thông tin khuyến mãi!",
    "Code and Branch ID are required.": "Thiếu mã khuyến mãi hoặc chi nhánh.",
    "Promotion code invalid or not active.": "Mã khuyến mãi không hợp lệ hoặc đã bị vô hiệu hóa.",
    "Promotion has not started yet.": "Khuyến mãi này chưa đến thời gian áp dụng.",
    "Promotion has expired.": "Khuyến mãi này đã hết hạn.",
    "Promotion usage limit reached.": "Mã khuyến mãi này đã hết lượt sử dụng.",
    "This code is not applicable for the selected service.": "Mã khuyến mãi không áp dụng cho dịch vụ bạn đang chọn.",
    "You have reached the maximum usage limit for this code.": "Bạn đã vượt quá số lần sử dụng tối đa cho mã này.",
    "Internal verification error.": "Lỗi xác thực hệ thống.",
    "Internal Server Error!": "Lỗi máy chủ, vui lòng thử lại sau!",
};

const translateErrorMessage = (errorResponse) => {
    const backendError = errorResponse?.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại!";
    if (backendError.includes("already exists in this branch!")) {
        const match = backendError.match(/'([^']+)'/);
        const code = match ? match[1] : "";
        return code ? `Mã khuyến mãi '${code}' đã tồn tại trong chi nhánh này!` : "Mã khuyến mãi đã tồn tại trong chi nhánh!";
    }
    return ERROR_MESSAGES_MAP[backendError] || backendError;
};

const Promotions = () => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    // ==========================================
    // 0. LẤY THÔNG TIN USER & PHÂN QUYỀN
    // ==========================================
    const { user } = useAuth();
    const userRole = user?.role || user?.account?.role || user?.user?.account?.role || "USER";

    // 🟢 SUPERADMIN CÓ TOÀN QUYỀN (BAO GỒM XÓA)
    const isSuperAdmin = userRole === "SUPERADMIN";

    // 🟢 ADMIN VÀ SUPERADMIN CÓ QUYỀN GHI (THÊM, SỬA, TẶNG MÃ, ĐỔI TRẠNG THÁI)
    const isAdminOrSuperAdmin = ["ADMIN", "SUPERADMIN"].includes(userRole);

    // 🟢 SUPERADMIN, ADMIN, SALES ĐƯỢC XEM TOÀN BỘ CHI NHÁNH (Lễ tân chỉ xem chi nhánh được giao)
    const canViewAllBranches = ["SUPERADMIN", "ADMIN", "SALE"].includes(userRole);

    // ==========================================
    // 1. STATE LỌC, TÌM KIẾM, PHÂN TRANG & UI
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterBranch, setFilterBranch] = useState("");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    const [page, setPage] = useState(1);
    const limit = 10;

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentPromoId, setCurrentPromoId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [promoToDelete, setPromoToDelete] = useState(null);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [promoToApply, setPromoToApply] = useState(null);
    const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false);

    // Tặng mã state
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState("");
    const [filterMonth, setFilterMonth] = useState("");
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);

    // Form state (Hỗ trợ Multi-branch)
    const initialFormState = {
        name: "",
        code: "",
        description: "",
        branchIds: [],
        applyAllBranches: false,
        isActive: true,
        bannerImageUrl: "",
        badgeText: "",
        details: "",
        terms: "",
        discountType: "percentage",
        discountValue: 0,
        maxDiscountAmount: 0,
        minOrderValue: 0,
        startDate: null,
        endDate: null,
        usageLimit: "",
        limitPerUser: "",
        applicableServiceIds: [],
    };
    const [formData, setFormData] = useState(initialFormState);
    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState("");

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ==========================================
    // REACT QUERY: FETCH DATA
    // ==========================================
    const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
        queryKey: ["branchesReference"],
        queryFn: async () => {
            const res = await clinicApi.getAllClinics({ limit: 100 });
            return res?.data?.branches || [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const derivedBranchId = canViewAllBranches ? filterBranch : branches.length > 0 ? branches[0]._id : undefined;

    useEffect(() => {
        if (!canViewAllBranches && branches.length > 0 && !filterBranch) {
            setFilterBranch(branches[0]._id);
        }
    }, [branches, canViewAllBranches, filterBranch]);

    const { data: services = [] } = useQuery({
        queryKey: ["servicesReference"],
        queryFn: async () => {
            const res = await serviceApi.getAllServices();
            return res?.data?.services || [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const { data: users = [] } = useQuery({
        queryKey: ["usersReference"],
        queryFn: async () => {
            const res = await userApi.getAllUsers({ limit: 500 });
            const userData = res.users || res.data?.users || [];
            return userData.filter((u) => u?.account?.status !== "INACTIVE");
        },
        staleTime: 5 * 60 * 1000,
        enabled: isAdminOrSuperAdmin,
    });

    const {
        data: promoData,
        isLoading: isLoadingPromosAPI,
        error: promoError,
    } = useQuery({
        queryKey: ["promotions", page, limit, debouncedSearch, filterStatus, derivedBranchId],
        queryFn: async () => {
            const params = { page, limit };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterStatus) params.status = filterStatus;
            if (derivedBranchId) params.branchId = derivedBranchId;

            const res = await promotionApi.getAllActivePromotions(params);
            if (!res || !res.success) throw new Error("Không thể tải danh sách khuyến mãi.");
            return {
                promotions: res.data.promotions || [],
                totalPages: res.data.pagination?.pages || 1,
            };
        },
        enabled: canViewAllBranches || branches.length > 0,
        placeholderData: keepPreviousData,
        staleTime: 1 * 60 * 1000,
    });

    const promotions = promoData?.promotions || [];
    const totalPages = promoData?.totalPages || 1;
    const isLoadingPromos = isLoadingPromosAPI || isLoadingBranches;

    // ==========================================
    // REACT QUERY: MUTATIONS
    // ==========================================
    const deleteMutation = useMutation({
        mutationFn: (id) => promotionApi.deletePromotion(id),
        onSuccess: (res, deletedId) => {
            showToast("Xóa khuyến mãi thành công!");
            setIsDeleteModalOpen(false);
            setPromoToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["promotions"] });
        },
        onError: (err) => {
            setIsDeleteModalOpen(false);
            showToast(translateErrorMessage(err), "error");
        },
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (id) => promotionApi.togglePromotionStatus(id),
        onSuccess: () => {
            showToast("Đã thay đổi trạng thái!");
            queryClient.invalidateQueries({ queryKey: ["promotions"] });
        },
        onError: (err) => showToast(translateErrorMessage(err), "error"),
    });

    const saveMutation = useMutation({
        mutationFn: ({ id, payload }) => (id ? promotionApi.updatePromotion(id, payload) : promotionApi.createPromotion(payload)),
        onSuccess: (res, variables) => {
            showToast(variables.id ? "Cập nhật thành công!" : "Tạo khuyến mãi thành công!");
            setIsFormModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["promotions"] });
        },
        onError: (err) => showToast(translateErrorMessage(err), "error"),
    });

    const applyPromoMutation = useMutation({
        mutationFn: ({ id, payload }) => promotionApi.updatePromotion(id, payload),
        onSuccess: () => {
            showToast(selectedUserIds.length > 0 ? `Đã cập nhật tặng mã ${promoToApply.code} cho ${selectedUserIds.length} khách hàng!` : `Đã thu hồi mã ${promoToApply.code} của tất cả khách hàng!`);
            setIsApplyModalOpen(false);
            setIsRevokeConfirmOpen(false);
            queryClient.invalidateQueries({ queryKey: ["promotions"] });
        },
        onError: (err) => showToast(translateErrorMessage(err), "error"),
    });

    const isSubmitting = deleteMutation.isPending || saveMutation.isPending || toggleStatusMutation.isPending || applyPromoMutation.isPending;

    // ==========================================
    // HANDLERS
    // ==========================================
    const openCreateForm = () => {
        setCurrentPromoId(null);
        setFormData({
            ...initialFormState,
            branchIds: !isAdminOrSuperAdmin && branches.length > 0 ? [branches[0]._id] : [],
        });
        setImageFile(null);
        setPreviewImage("");
        setIsFormModalOpen(true);
    };

    const openUpdateForm = (e, promo) => {
        if (e) e.stopPropagation();
        setCurrentPromoId(promo._id);

        const fetchedBranchIds = promo.branchIds?.map((b) => b._id || b) || (promo.branchId ? [promo.branchId._id || promo.branchId] : []);
        const isAll = branches.length > 0 && fetchedBranchIds.length === branches.length;

        setFormData({
            name: promo.name || "",
            code: promo.code || "",
            description: promo.description || "",
            branchIds: fetchedBranchIds,
            applyAllBranches: isAll,
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
        setImageFile(null);
        setPreviewImage(promo.bannerImageUrl || "");
        setIsFormModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        const numericFields = ["discountValue", "maxDiscountAmount", "minOrderValue", "usageLimit", "limitPerUser"];

        if (numericFields.includes(name)) {
            const sanitizedValue = value.replace(/[^0-9]/g, "");
            setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: name === "isActive" ? value === "true" : value }));
        }
    };

    const handleServiceCheckboxChange = (serviceId) => {
        setFormData((prev) => ({
            ...prev,
            applicableServiceIds: prev.applicableServiceIds.includes(serviceId) ? prev.applicableServiceIds.filter((id) => id !== serviceId) : [...prev.applicableServiceIds, serviceId],
        }));
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

    const handleFormSubmit = (e) => {
        e.preventDefault();

        if ((!formData.applyAllBranches && formData.branchIds.length === 0) || !formData.name || !formData.code || !formData.startDate || !formData.endDate || !formData.discountValue) {
            return showToast("Vui lòng điền đầy đủ các trường bắt buộc!", "error");
        }

        const submitData = new FormData();
        submitData.append("name", formData.name);
        submitData.append("code", formData.code);
        submitData.append("description", formData.description);

        // Append branchIds
        const finalBranchIds = formData.applyAllBranches ? branches.map((b) => b._id) : formData.branchIds;
        submitData.append("branchIds", JSON.stringify(finalBranchIds));

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

        saveMutation.mutate({ id: currentPromoId, payload: submitData });
    };

    const openApplyModal = (e, promo) => {
        e.stopPropagation();
        setPromoToApply(promo);
        setSelectedUserIds(promo.applicableUserIds?.map((u) => (typeof u === "object" ? u._id : u)) || []);
        setUserSearchTerm("");
        setFilterMonth("");
        setIsApplyModalOpen(true);
    };

    const handleToggleSelectUser = (userId) => setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
    const handleSelectAllUsers = (filteredList) => {
        const filteredIds = filteredList.map((u) => u.userId || u._id);
        const isAllSelected = filteredIds.every((id) => selectedUserIds.includes(id));
        setSelectedUserIds((prev) => (isAllSelected ? prev.filter((id) => !filteredIds.includes(id)) : Array.from(new Set([...prev, ...filteredIds]))));
    };

    const executeApplyPromotion = () => {
        const submitData = new FormData();
        submitData.append("applicableUserIds", JSON.stringify(selectedUserIds));
        applyPromoMutation.mutate({ id: promoToApply._id, payload: submitData });
    };

    const submitApplyPromotion = () => {
        if (selectedUserIds.length === 0 && promoToApply?.applicableUserIds?.length > 0) {
            setIsRevokeConfirmOpen(true);
            return;
        }
        executeApplyPromotion();
    };

    const filteredUsers = users
        .filter((user) => {
            const search = removeVietnameseTones(userSearchTerm);
            const matchesText = removeVietnameseTones(user.fullName || user.username || "").includes(search) || removeVietnameseTones(user.email || "").includes(search) || (user.phoneNumber || "").includes(userSearchTerm);

            let matchesMonth = true;
            if (filterMonth) {
                const dob = user.dateOfBirth || user.dob;
                if (dob) {
                    const birthMonth = new Date(dob).getMonth() + 1;
                    matchesMonth = birthMonth.toString() === filterMonth;
                } else {
                    matchesMonth = false;
                }
            }

            return matchesText && matchesMonth;
        })
        .sort((a, b) => {
            const aId = a.userId || a._id;
            const bId = b.userId || b._id;
            const isASelected = selectedUserIds.includes(aId);
            const isBSelected = selectedUserIds.includes(bId);

            if (isASelected && !isBSelected) return -1;
            if (!isASelected && isBSelected) return 1;
            return 0;
        });

    // ==========================================
    // HELPER UI
    // ==========================================
    const getStatusLabelText = (status) => STATUS_OPTIONS.find((opt) => opt.value === status)?.label || "Tất cả trạng thái";
    const formatDiscount = (type, value) => (type === "percentage" ? `${value}%` : `${value.toLocaleString("vi-VN")} đ`);

    const formBranchOptions = branches.map((b) => ({ value: b._id, label: b.name }));
    const filterBranchOptions = canViewAllBranches ? [{ value: "", label: "Tất cả chi nhánh" }, ...formBranchOptions] : formBranchOptions;

    const customSelectStyles = {
        control: (provided, state) => ({ ...provided, minHeight: "38px", borderRadius: "6px", fontSize: "14px", borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db", boxShadow: "none", "&:hover": { borderColor: "var(--primary-color)" }, backgroundColor: "#fff" }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white", color: state.isSelected ? "var(--primary-color)" : "#374151", cursor: "pointer", margin: "4px", borderRadius: "6px", fontSize: "14px", width: "96%" }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({ ...provided, overflowX: "hidden" }),
    };

    const getMonthLabelText = (monthValue) => {
        return monthValue ? `Tháng ${monthValue}` : "Tất cả tháng sinh";
    };

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý khuyến mãi" }]} title="Quản lý khuyến mãi" description="Thiết lập các chương trình giảm giá, mã giảm giá và theo dõi lượt sử dụng." />

            <div className="z-promo-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-promo-header">
                    <h1 className="z-promo-title">Danh sách Khuyến Mãi</h1>
                </div>

                <div className="z-promo-tools">
                    <div className="z-promo-search">
                        <input type="text" placeholder="Tìm mã hoặc tên khuyến mãi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div style={{ minWidth: "300px", zIndex: 10 }}>
                        <ReactSelect
                            options={filterBranchOptions}
                            value={filterBranchOptions.find((opt) => opt.value === filterBranch) || (canViewAllBranches ? filterBranchOptions[0] : null)}
                            onChange={(selected) => {
                                setFilterBranch(selected ? selected.value : "");
                                setPage(1);
                            }}
                            styles={customSelectStyles}
                            isSearchable={true}
                            placeholder={isLoadingBranches ? "Đang tải..." : "Tìm Chi nhánh..."}
                            noOptionsMessage={() => "Không tìm thấy chi nhánh"}
                        />
                    </div>

                    <div className="z-promo-filter">
                        <button className="z-promo-btn-filter" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
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

                    {isAdminOrSuperAdmin && (
                        <AddButton onClick={openCreateForm} style={{ marginLeft: "auto" }}>
                            Thêm Khuyến Mãi
                        </AddButton>
                    )}
                </div>

                <div className="z-promo-table-wrapper">
                    <table className="z-promo-table">
                        <thead>
                            <tr>
                                <th>Mã KM</th>
                                <th>Tên Khuyến Mãi</th>
                                <th>Mức giảm</th>
                                <th>Thời gian áp dụng</th>
                                <th>Đã dùng</th>
                                {isAdminOrSuperAdmin && <th>Thao tác</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingPromos && promotions.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdminOrSuperAdmin ? "6" : "5"}>
                                        <div className="z-promo-state">Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : promoError ? (
                                <tr>
                                    <td colSpan={isAdminOrSuperAdmin ? "6" : "5"}>
                                        <div className="z-promo-state z-promo-error">{promoError.message}</div>
                                    </td>
                                </tr>
                            ) : promotions.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdminOrSuperAdmin ? "6" : "5"}>
                                        <div className="z-promo-state">Không tìm thấy khuyến mãi nào phù hợp.</div>
                                    </td>
                                </tr>
                            ) : (
                                promotions.map((promo) => (
                                    <tr key={promo._id} className="z-promo-clickable-row" onClick={(e) => (isAdminOrSuperAdmin ? openUpdateForm(e, promo) : null)} style={{ cursor: isAdminOrSuperAdmin ? "pointer" : "default" }}>
                                        <td>
                                            <strong style={{ color: "var(--primary-color)" }}>{promo.code}</strong>
                                        </td>
                                        <td>
                                            <div className="z-promo-text-bold z-promo-text-clamp">{promo.name}</div>

                                            {/* 🟢 SỬA LẠI ĐOẠN NÀY ĐỂ BẢO VỆ UI KHÔNG BỊ VỠ */}
                                            <div
                                                className="z-promo-subtext"
                                                style={{
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                    marginTop: "4px",
                                                }}
                                            >
                                                {(() => {
                                                    if (promo.branchIds?.length > 0) {
                                                        // Nếu User là Admin/SuperAdmin và số lượng bằng tổng chi nhánh hệ thống
                                                        if (branches.length > 1 && promo.branchIds.length === branches.length) {
                                                            return "Tất cả chi nhánh";
                                                        }
                                                        // Nếu khuyến mãi áp dụng cho nhiều hơn 2 chi nhánh -> Gom gọn lại
                                                        if (promo.branchIds.length > 2) {
                                                            return `Áp dụng ${promo.branchIds.length} chi nhánh`;
                                                        }
                                                        // Nếu ít (1-2 chi nhánh) thì in tên ra
                                                        return promo.branchIds.map((b) => b.name || b).join(" • ");
                                                    }
                                                    return promo.branchId?.name || "Đang tải...";
                                                })()}
                                            </div>
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

                                        {isAdminOrSuperAdmin && (
                                            <td>
                                                <div className="z-promo-dropdown-actions" onClick={(e) => e.stopPropagation()}>
                                                    <button className="z-promo-more-btn">
                                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                            <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                        </svg>
                                                    </button>
                                                    <div className="z-promo-action-menu">
                                                        <Button variant="complete" onClick={(e) => openApplyModal(e, promo)}>
                                                            Tặng KH
                                                        </Button>
                                                        <Button variant="outline" onClick={() => toggleStatusMutation.mutate(promo._id)} disabled={toggleStatusMutation.isPending}>
                                                            {promo.isActive ? "Tạm dừng" : "Kích hoạt"}
                                                        </Button>
                                                        <EditButton onClick={(e) => openUpdateForm(e, promo)} />

                                                        {isSuperAdmin && (
                                                            <DeleteButton
                                                                onClick={() => {
                                                                    setPromoToDelete({ id: promo._id, name: promo.name, code: promo.code });
                                                                    setIsDeleteModalOpen(true);
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

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

                {/* MODAL FORM CHÍNH */}
                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={currentPromoId ? "Cập nhật Khuyến mãi" : "Tạo mới Khuyến mãi"} maxWidth="1000px" onSave={handleFormSubmit} saveText={isSubmitting ? "Đang xử lý..." : "Lưu Khuyến Mãi"}>
                    <div className="z-promo-form">
                        <div style={{ marginBottom: "10px", marginTop: "-15px", paddingBottom: "10px", borderBottom: "1px dashed #e5e7eb" }}>
                            <span style={{ color: "red", fontWeight: "bold", fontSize: "16px" }}>*</span>
                            <span style={{ color: "#6b7280", fontSize: "12px", fontStyle: "italic", marginLeft: "4px" }}>: Các trường có dấu sao là bắt buộc. Vui lòng nhập đầy đủ thông tin.</span>
                        </div>
                        <div className="z-promo-form-grid">
                            <div className="z-promo-form-column">
                                <h3 className="z-promo-form-subtitle">Thông tin cơ bản</h3>

                                {/* 🟢 MULTI-SELECT BRANCH */}
                                <div className="z-promo-form-group">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                        <label style={{ margin: 0 }}>
                                            Chi nhánh áp dụng <span className="z-promo-required">*</span>
                                        </label>
                                        {isAdminOrSuperAdmin && (
                                            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", color: "var(--primary-color)", fontWeight: "500" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.applyAllBranches}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            applyAllBranches: checked,
                                                            branchIds: checked ? branches.map((b) => b._id) : [],
                                                        }));
                                                    }}
                                                    style={{ accentColor: "var(--primary-color)", cursor: "pointer", width: "14px", height: "14px" }}
                                                    disabled={isSubmitting || !!currentPromoId}
                                                />
                                                Áp dụng tất cả chi nhánh
                                            </label>
                                        )}
                                    </div>
                                    <ReactSelect
                                        isMulti
                                        name="branchIds"
                                        options={formBranchOptions}
                                        value={formData.applyAllBranches ? [{ value: "ALL", label: `Đã chọn tất cả chi nhánh (${branches.length})` }] : formBranchOptions.filter((opt) => formData.branchIds.includes(opt.value))}
                                        onChange={(selected) => {
                                            if (selected && selected.some((s) => s.value === "ALL")) return;
                                            const selectedIds = selected ? selected.map((s) => s.value) : [];
                                            setFormData((prev) => ({
                                                ...prev,
                                                branchIds: selectedIds,
                                                applyAllBranches: selectedIds.length === branches.length && branches.length > 0,
                                            }));
                                        }}
                                        isDisabled={isSubmitting || !!currentPromoId || formData.applyAllBranches || !isAdminOrSuperAdmin}
                                        styles={{
                                            ...customSelectStyles,
                                            valueContainer: (provided) => ({
                                                ...provided,
                                                maxHeight: "85px",
                                                overflowY: "auto",
                                            }),
                                        }}
                                        placeholder={isLoadingBranches ? "Đang tải..." : "-- Chọn chi nhánh --"}
                                        isSearchable={true}
                                        menuPosition="fixed"
                                        noOptionsMessage={() => "Không tìm thấy chi nhánh"}
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
                                        <ReactSelect
                                            name="discountType"
                                            options={[
                                                { value: "percentage", label: "Theo phần trăm (%)" },
                                                { value: "fixed", label: "Số tiền cố định (VNĐ)" },
                                            ]}
                                            value={[
                                                { value: "percentage", label: "Theo phần trăm (%)" },
                                                { value: "fixed", label: "Số tiền cố định (VNĐ)" },
                                            ].find((opt) => opt.value === formData.discountType)}
                                            onChange={(selected) => setFormData((prev) => ({ ...prev, discountType: selected.value }))}
                                            isDisabled={isSubmitting}
                                            styles={customSelectStyles}
                                        />
                                    </div>
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>
                                            Giá trị giảm <span className="z-promo-required">*</span>
                                        </label>
                                        <input type="number" name="discountValue" className="z-promo-input" required min="1" value={formData.discountValue} onChange={handleFormChange} onKeyDown={handlePreventInvalidChars} disabled={isSubmitting} />
                                    </div>
                                </div>
                                <div className="z-promo-form-row">
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>Giảm tối đa (VNĐ)</label>
                                        <input type="number" name="maxDiscountAmount" className="z-promo-input" placeholder="50.000đ" value={formData.maxDiscountAmount} onChange={handleFormChange} onKeyDown={handlePreventInvalidChars} disabled={isSubmitting || formData.discountType === "fixed"} />
                                    </div>
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>Đơn tối thiểu (VNĐ)</label>
                                        <input type="number" name="minOrderValue" className="z-promo-input" placeholder="100.000đ" value={formData.minOrderValue} onChange={handleFormChange} onKeyDown={handlePreventInvalidChars} disabled={isSubmitting} />
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

                            <div className="z-promo-form-column">
                                <h3 className="z-promo-form-subtitle">Thời gian & Giới hạn</h3>
                                <div className="z-promo-form-row">
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>
                                            Bắt đầu <span className="z-promo-required">*</span>
                                        </label>
                                        <DatePicker selected={formData.startDate} onChange={(date) => setFormData((prev) => ({ ...prev, startDate: date }))} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy HH:mm" className="z-promo-input" placeholderText="Chọn ngày & giờ" disabled={isSubmitting} locale="vi" />
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
                                        <input type="number" name="usageLimit" className="z-promo-input" placeholder="∞" min="1" value={formData.usageLimit} onChange={handleFormChange} onKeyDown={handlePreventInvalidChars} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-promo-form-group" style={{ flex: 1 }}>
                                        <label>Lượt dùng/Khách</label>
                                        <input type="number" name="limitPerUser" className="z-promo-input" placeholder="∞" min="1" value={formData.limitPerUser} onChange={handleFormChange} onKeyDown={handlePreventInvalidChars} disabled={isSubmitting} />
                                    </div>
                                </div>

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
                                    <input type="text" name="badgeText" placeholder="VD: HOT, SALE, DEAL99K, ..." className="z-promo-input" value={formData.badgeText} onChange={handleFormChange} disabled={isSubmitting} />
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
                                    <ReactSelect
                                        name="isActive"
                                        options={[
                                            { value: "true", label: "Bật (Tự động kích hoạt khi đến ngày)" },
                                            { value: "false", label: "Tắt (Lưu nháp/Tạm dừng)" },
                                        ]}
                                        value={[
                                            { value: "true", label: "Bật (Tự động kích hoạt khi đến ngày)" },
                                            { value: "false", label: "Tắt (Lưu nháp/Tạm dừng)" },
                                        ].find((opt) => opt.value === formData.isActive.toString())}
                                        onChange={(selected) => setFormData((prev) => ({ ...prev, isActive: selected.value === "true" }))}
                                        isDisabled={isSubmitting}
                                        styles={customSelectStyles}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* MODAL XÓA */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={() => deleteMutation.mutate(promoToDelete?.id)} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-promo-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xóa khuyến mãi?</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa mã <strong style={{ color: "var(--primary-color)" }}>{promoToDelete?.code}</strong> không?
                        </p>
                        <span style={{ color: "var(--error)", fontSize: "14px" }}> Lưu ý* : Hành động này không thể hoàn tác.</span>
                    </div>
                </Modal>

                {/* MODAL TẶNG MÃ */}
                <Modal isOpen={isApplyModalOpen} onClose={() => !isSubmitting && setIsApplyModalOpen(false)} title={`Tặng mã Khuyến mãi: ${promoToApply?.code || ""}`} maxWidth="800px" onSave={submitApplyPromotion} saveText={isSubmitting ? "Đang xử lý..." : `Xác nhận tặng (${selectedUserIds.length})`}>
                    <div className="z-promo-apply-content">
                        <p style={{ marginBottom: "15px", color: "#6b7280", fontSize: "14px" }}>Chọn khách hàng bạn muốn gửi trực tiếp mã giảm giá này vào tài khoản.</p>

                        <div style={{ display: "flex", gap: "12px", marginBottom: "15px", alignItems: "center" }}>
                            <input type="text" className="z-promo-input" placeholder="Tìm theo tên, SĐT, email..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} style={{ flex: 1, margin: 0 }} />

                            <div className="z-promo-filter" style={{ minWidth: "200px" }}>
                                <button type="button" className="z-promo-btn-filter" onClick={() => setShowMonthDropdown(!showMonthDropdown)} style={{ width: "100%", justifyContent: "space-between", height: "42px" }}>
                                    <span>{getMonthLabelText(filterMonth)}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                        <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                                    </svg>
                                </button>

                                {showMonthDropdown && (
                                    <div className="z-promo-dropdown-menu" style={{ maxHeight: "250px", overflowY: "auto", width: "100%" }}>
                                        <div
                                            className={`z-promo-dropdown-item ${filterMonth === "" ? "active" : ""}`}
                                            onClick={() => {
                                                setFilterMonth("");
                                                setShowMonthDropdown(false);
                                            }}
                                        >
                                            Tất cả tháng sinh
                                        </div>
                                        {[...Array(12)].map((_, i) => (
                                            <div
                                                key={i + 1}
                                                className={`z-promo-dropdown-item ${filterMonth === (i + 1).toString() ? "active" : ""}`}
                                                onClick={() => {
                                                    setFilterMonth((i + 1).toString());
                                                    setShowMonthDropdown(false);
                                                }}
                                            >
                                                Tháng {i + 1}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #e5e7eb" }}>
                            <strong style={{ fontSize: "14px" }}>Danh sách Khách hàng ({filteredUsers.length})</strong>
                            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "14px", color: "var(--primary-color)" }}>
                                <input
                                    type="checkbox"
                                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                                    onChange={() => handleSelectAllUsers(filteredUsers)}
                                    style={{
                                        accentColor: "var(--primary-color)",
                                        width: "16px",
                                        height: "16px",
                                        cursor: "pointer",
                                    }}
                                />
                                <strong>Chọn tất cả</strong>
                            </label>
                        </div>
                        <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px" }}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Không tìm thấy khách hàng nào.</div>
                            ) : (
                                filteredUsers.map((user) => {
                                    const userId = user.userId || user._id;
                                    const dobString = user.dateOfBirth || user.dob;
                                    const dobFormatted = dobString ? new Date(dobString).toLocaleDateString("vi-VN") : "";

                                    return (
                                        <label key={userId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(userId)}
                                                onChange={() => handleToggleSelectUser(userId)}
                                                style={{
                                                    accentColor: "var(--primary-color)",
                                                    width: "16px",
                                                    height: "16px",
                                                    cursor: "pointer",
                                                }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: "600", color: "#374151" }}>{user.fullName || user.username || "Khách hàng ẩn danh"}</div>
                                                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                                                    {user.phoneNumber || "Chưa có SĐT"}
                                                    {user.email ? ` • ${user.email}` : ""}
                                                    {dobFormatted ? <span style={{ color: "var(--primary-color)", fontWeight: "500" }}> • {dobFormatted}</span> : ""}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </Modal>

                {/* MODAL CẢNH BÁO THU HỒI MÃ */}
                <Modal isOpen={isRevokeConfirmOpen} onClose={() => !isSubmitting && setIsRevokeConfirmOpen(false)} title="Cảnh báo thu hồi mã" size="sm" onSave={executeApplyPromotion} saveText={isSubmitting ? "Đang xử lý..." : "Xác nhận thu hồi"}>
                    <div className="z-promo-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto", marginBottom: "15px" }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <h3 style={{ color: "var(--warning)" }}>Thu hồi toàn bộ mã?</h3>
                        <p>
                            Bạn chưa chọn khách hàng nào. Việc này sẽ <strong>THU HỒI</strong> khuyến mãi khỏi tất cả khách hàng hiện tại.
                        </p>
                        <p style={{ marginTop: "10px" }}>Bạn có chắc chắn muốn tiếp tục?</p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Promotions;
