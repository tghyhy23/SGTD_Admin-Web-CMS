import React, { useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clinicApi, reviewApi, userApi, locationApi, serviceApi } from "../../api/axiosApi";
import PageHeader from "../../ui/PageHeader/PageHeader";
import avatarImg from "../../assets/images/default_ava.jpg";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Modal from "../../ui/Modal/Modal";
import { AddButton, EditButton, DeleteButton, Button } from "../../ui/Button/Button";
import ReactSelect from "react-select";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import vi from "date-fns/locale/vi";
registerLocale("vi", vi);

import "./ClinicDetail.css";

const FALLBACK_IMG = "https://via.placeholder.com/600x400?text=No+Image";
const AVATAR_PLACEHOLDER = avatarImg;

const STATUS_OPTIONS = [
    { value: "true", label: "Đang hoạt động" },
    { value: "false", label: "Ngừng hoạt động (Bảo trì)" },
];

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

const translateErrorMessage = (errorMsg) => {
    if (!errorMsg) return null;
    const msg = errorMsg.toLowerCase();
    if (msg.includes("413") || msg.includes("payload too large") || msg.includes("entity too large")) {
        return "Kích thước ảnh tải lên quá lớn. Vui lòng chọn ảnh dưới 5MB!";
    }
    if (msg === "network error") {
        return "Lỗi kết nối hoặc File quá lớn bị máy chủ từ chối (Lỗi 413). Vui lòng thử ảnh nhỏ hơn!";
    }
    if (msg.includes("branch not found")) return "Không tìm thấy thông tin phòng khám trên hệ thống.";
    if (msg.includes("name, category, district, address and hotline are required")) return "Vui lòng điền đầy đủ thông tin bắt buộc!";
    if (msg.includes("manager not found")) return "Không tìm thấy thông tin tài khoản Quản lý.";
    if (msg.includes("assigned user must be admin") || msg.includes("assigned manager must be admin")) return "Tài khoản Quản lý được gán phải có quyền Admin.";
    if (msg.includes("already manages")) return "Tài khoản này đang quản lý một phòng khám khác. Không thể gán thêm.";
    if (msg.includes("some services not found or inactive")) return "Một số dịch vụ không tồn tại hoặc đã ngừng hoạt động.";
    if (msg.includes("review not found")) return "Không tìm thấy thông tin đánh giá trên hệ thống.";
    if (msg.includes("missing required fields")) return "Vui lòng điền đầy đủ thông tin bắt buộc (Tên khách hàng, Số sao, Nội dung)!";
    if (msg.includes("at least 10 characters")) return "Nội dung đánh giá phải có ít nhất 10 ký tự.";
    return errorMsg;
};

const ClinicDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Dữ liệu truyền từ trang list sang
    const passedClinic = location.state?.clinicData || undefined;
    const passedDistricts = location.state?.districtsData || undefined;
    const passedServices = location.state?.servicesData || undefined;
    const passedAdmins = location.state?.adminsData || undefined;

    // UI States
    const [activeImage, setActiveImage] = useState(0);
    const [reviewPage, setReviewPage] = useState(1);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isDeleteReviewModalOpen, setIsDeleteReviewModalOpen] = useState(false);

    const [currentReviewId, setCurrentReviewId] = useState(null);
    const [reviewToDelete, setReviewToDelete] = useState(null);

    // Refs
    const reviewImagesInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const clinicImagesInputRef = useRef(null);

    // ==========================================
    // REACT QUERY: FETCH DỮ LIỆU
    // ==========================================

    const {
        data: clinic,
        isLoading: isClinicLoading,
        error: clinicError,
    } = useQuery({
        queryKey: ["clinicDetail", id],
        queryFn: async () => {
            const response = await clinicApi.getClinicById(id);
            if (response && response.success) return response.data.branch || response.data;
            throw new Error("Không tìm thấy thông tin phòng khám.");
        },
        placeholderData: passedClinic,
        staleTime: 5 * 60 * 1000,
    });

    const images = clinic?.imageUrls?.length > 0 ? clinic.imageUrls : [FALLBACK_IMG];

    const {
        data: reviewsData,
        isLoading: isReviewsLoading,
        isFetching: isReviewsFetching, // 🟢 Trạng thái đang tải lại dữ liệu
        refetch: refetchReviews, // 🟢 Hàm ép gọi lại API riêng cho phần Review
    } = useQuery({
        queryKey: ["clinicReviews", id, reviewPage],
        queryFn: async () => {
            const res = await reviewApi.getAdminReviewsByBranch(id, { page: reviewPage, limit: 10, status: "all" });
            if (res && res.success) return { reviews: res.data.reviews || [], total: res.data.pagination?.total || 0 };
            return { reviews: [], total: 0 };
        },
        staleTime: 1 * 60 * 1000,
    });

    const reviews = reviewsData?.reviews || [];
    const reviewTotal = reviewsData?.total || 0;

    const { data: managers = [] } = useQuery({
        queryKey: ["adminManagers"],
        queryFn: async () => {
            const res = await userApi.getAllUsers({ limit: 500 });
            const userList = res.users || res.data?.users || res.data || [];
            return Array.isArray(userList) ? userList.filter((u) => (u?.account?.role || u?.role || "USER") === "ADMIN") : [];
        },
        initialData: passedAdmins?.length ? passedAdmins : undefined,
        staleTime: 10 * 60 * 1000,
    });

    // 🟢 FIX: Fetch all clinics to get list of assigned managers for filtering
    const { data: allClinics = [] } = useQuery({
        queryKey: ["allClinicsForDetail", id],
        queryFn: async () => {
            const res = await clinicApi.getAllClinics({ limit: 500 });
            return res?.data?.branches || res?.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: districts = [] } = useQuery({
        queryKey: ["districts"],
        queryFn: async () => {
            const res = await locationApi.getAllDistricts();
            return res?.data?.districts || [];
        },
        placeholderData: passedDistricts?.length ? passedDistricts : undefined,
        staleTime: 10 * 60 * 1000,
    });

    const { data: services = [] } = useQuery({
        queryKey: ["services"],
        queryFn: async () => {
            const res = await serviceApi.getAllServices();
            return res?.data?.services || [];
        },
        placeholderData: passedServices?.length ? passedServices : undefined,
        staleTime: 10 * 60 * 1000,
    });

    // ==========================================
    // FORMS STATE
    // ==========================================
    const initialForm = {
        name: "",
        districtId: "",
        address: "",
        hotline: "",
        email: "",
        description: "",
        mapsUrl: "",
        isActive: true,
        managerId: "",
        longitude: "",
        latitude: "",
        openTime: "07:30",
        closeTime: "19:30",
        availableServiceIds: [],
    };
    const [formData, setFormData] = useState(initialForm);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [oldImageUrls, setOldImageUrls] = useState([]);

    const [reviewForm, setReviewForm] = useState({
        fakeAuthorName: "",
        fakeAvatarUrl: "",
        fakeAvatarFile: null,
        previewUrl: "",
        rating: 5,
        content: "",
        fakeDate: null,
        oldReviewImageUrls: [],
        reviewImageFiles: [],
        reviewImagePreviews: [],
    });

    const safeServices = services || [];
    const isAllServicesSelected = safeServices.length > 0 && formData.availableServiceIds.length === safeServices.length;

    const handleSelectAllServices = () => {
        setFormData((prev) => ({
            ...prev,
            availableServiceIds: isAllServicesSelected ? [] : safeServices.map((s) => s._id),
        }));
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

    // ==========================================
    // REACT QUERY: MUTATIONS
    // ==========================================

    const updateClinicMutation = useMutation({
        mutationFn: (submitData) => clinicApi.updateClinic(id, submitData),
        onSuccess: (res) => {
            const updatedClinic = res.data?.branch || res.data;
            queryClient.setQueryData(["clinicDetail", id], { ...clinic, ...updatedClinic });
            showToast("Cập nhật phòng khám thành công!");
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["clinics"] });
            queryClient.invalidateQueries({ queryKey: ["clinicDetail", id] });
        },
        onError: (err) => showToast(translateErrorMessage(err.response?.data?.message || err.message) || "Lỗi cập nhật phòng khám", "error"),
    });

    const toggleHideReviewMutation = useMutation({
        mutationFn: (reviewId) => reviewApi.toggleHideReview(reviewId),
        onMutate: async (reviewId) => {
            await queryClient.cancelQueries({ queryKey: ["clinicReviews", id, reviewPage] });
            const prev = queryClient.getQueryData(["clinicReviews", id, reviewPage]);
            queryClient.setQueryData(["clinicReviews", id, reviewPage], (old) => {
                if (!old) return old;
                return { ...old, reviews: old.reviews.map((r) => (r._id === reviewId ? { ...r, isHidden: !r.isHidden } : r)) };
            });
            return { prev };
        },
        onSuccess: () => showToast("Thay đổi trạng thái thành công!"),
        onError: (err, reviewId, context) => {
            queryClient.setQueryData(["clinicReviews", id, reviewPage], context.prev);
            showToast("Lỗi thay đổi trạng thái", "error");
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["clinicReviews", id, reviewPage] }),
    });

    const deleteReviewMutation = useMutation({
        mutationFn: (reviewId) => reviewApi.deleteReview(reviewId),
        onSuccess: (res, reviewId) => {
            // 1. Cập nhật danh sách review
            queryClient.setQueryData(["clinicReviews", id, reviewPage], (old) => {
                if (!old) return old;
                return { ...old, reviews: old.reviews.filter((r) => r._id !== reviewId), total: Math.max(0, old.total - 1) };
            });

            // 2. 🟢 CẬP NHẬT SỐ LƯỢNG ĐÁNH GIÁ TRÊN THÔNG TIN PHÒNG KHÁM
            queryClient.setQueryData(["clinicDetail", id], (oldClinic) => {
                if (!oldClinic) return oldClinic;
                const newTotalReview = Math.max(0, (oldClinic.totalReview || 0) - 1);
                return {
                    ...oldClinic,
                    totalReview: newTotalReview,
                    // Nếu không còn review nào, ép sao về 0 để tránh lỗi backend
                    totalRating: newTotalReview === 0 ? 0 : oldClinic.totalRating,
                };
            });

            showToast("Đã xóa đánh giá!");
            setIsDeleteReviewModalOpen(false);
            setReviewToDelete(null);

            queryClient.invalidateQueries({ queryKey: ["clinicReviews", id] });
            queryClient.invalidateQueries({ queryKey: ["clinicDetail", id] });
        },
        onError: (err) => showToast(translateErrorMessage(err.response?.data?.message || err.message) || "Lỗi xóa đánh giá", "error"),
    });

    const saveReviewMutation = useMutation({
        mutationFn: ({ reviewId, payload }) => (reviewId ? reviewApi.updateSeedReview(reviewId, payload) : reviewApi.createSeedReview(payload)),
        onSuccess: (res, variables) => {
            // 🟢 TĂNG SỐ LƯỢNG ĐÁNH GIÁ TRÊN THÔNG TIN PHÒNG KHÁM NẾU LÀ THÊM MỚI
            if (!variables.reviewId) {
                queryClient.setQueryData(["clinicDetail", id], (oldClinic) => {
                    if (!oldClinic) return oldClinic;
                    return { ...oldClinic, totalReview: (oldClinic.totalReview || 0) + 1 };
                });
            }

            showToast(variables.reviewId ? "Cập nhật đánh giá thành công!" : "Tạo đánh giá thành công!");
            setIsReviewModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["clinicReviews", id] });
            queryClient.invalidateQueries({ queryKey: ["clinicDetail", id] });
        },
        onError: (err) => showToast(translateErrorMessage(err.response?.data?.message || err.message) || "Lỗi xử lý đánh giá", "error"),
    });

    const isSubmitting = updateClinicMutation.isPending || saveReviewMutation.isPending || deleteReviewMutation.isPending || toggleHideReviewMutation.isPending;

    // ==========================================
    // HANDLERS
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const handleEditClick = () => {
        let lng = "",
            lat = "";
        if (clinic.location?.coordinates) {
            lng = clinic.location.coordinates[0];
            lat = clinic.location.coordinates[1];
        }
        const clinicServiceIds = clinic.availableServiceIds?.map((s) => String(s._id || s)) || [];
        setFormData({
            name: clinic.name || "",
            districtId: clinic.districtId?._id || clinic.districtId || "",
            address: clinic.address || "",
            hotline: clinic.hotline || "",
            email: clinic.email || "",
            mapsUrl: clinic.mapsUrl || "",
            description: clinic.description || "",
            isActive: clinic.isActive !== undefined ? clinic.isActive : true,
            managerId: clinic.managerId?._id || clinic.managerId || "",
            longitude: lng,
            latitude: lat,
            openTime: clinic.openingHours?.openTime || "07:30",
            closeTime: clinic.openingHours?.closeTime || "19:30",
            availableServiceIds: clinicServiceIds,
        });
        setImageFiles([]);
        setImagePreviews([]);
        setOldImageUrls(clinic.imageUrls || []);
        setIsModalOpen(true);
    };

    const handleUpdateSubmit = (e) => {
        if (e) e.preventDefault();
        const submitData = new FormData();
        ["name", "districtId", "address", "hotline", "email", "description", "isActive", "mapsUrl"].forEach((key) => {
            if (formData[key] !== null && formData[key] !== undefined) submitData.append(key, formData[key]);
        });
        submitData.append("managerId", formData.managerId || "null");

        if (formData.longitude && formData.latitude) {
            submitData.append("location", JSON.stringify({ type: "Point", coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)] }));
        }
        submitData.append("openingHours", JSON.stringify({ openTime: formData.openTime, closeTime: formData.closeTime, breakStart: "12:00", breakEnd: "13:00" }));
        submitData.append("availableServiceIds", JSON.stringify(formData.availableServiceIds));

        // 🟢 FIX: Gửi đúng cấu trúc FormData - match Clinics.jsx
        // Gửi file ảnh mới vào field "images"
        imageFiles.forEach((file) => submitData.append("images", file));

        // Gửi các URL ảnh cũ cần giữ lại vào field "imageUrls" (JSON format)
        submitData.append("imageUrls", JSON.stringify(oldImageUrls.length === 0 && imageFiles.length === 0 ? [] : oldImageUrls));

        updateClinicMutation.mutate(submitData);
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (oldImageUrls.length + imageFiles.length + files.length > 5) return showToast("Chỉ được upload tối đa 5 ảnh!", "error");
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
        const updated = [...oldImageUrls];
        updated.splice(index, 1);
        setOldImageUrls(updated);
    };

    const handleOpenReviewModal = (review = null) => {
        if (reviewForm.previewUrl) URL.revokeObjectURL(reviewForm.previewUrl);
        reviewForm.reviewImagePreviews.forEach((url) => URL.revokeObjectURL(url));

        if (review) {
            setCurrentReviewId(review._id);
            setReviewForm({
                fakeAuthorName: review.authName || "",
                fakeAvatarUrl: review.authAvatar || "",
                fakeAvatarFile: null,
                previewUrl: "",
                rating: review.rating || 5,
                content: review.content || "",
                fakeDate: review.reviewDate ? new Date(review.reviewDate) : null,
                oldReviewImageUrls: review.imageUrls || [],
                reviewImageFiles: [],
                reviewImagePreviews: [],
            });
        } else {
            setCurrentReviewId(null);
            setReviewForm({
                fakeAuthorName: "",
                fakeAvatarUrl: "",
                fakeAvatarFile: null,
                previewUrl: "",
                rating: 5,
                content: "",
                fakeDate: null,
                oldReviewImageUrls: [],
                reviewImageFiles: [],
                reviewImagePreviews: [],
            });
        }
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = (e) => {
        if (e) e.preventDefault();

        if (saveReviewMutation.isPending || isSubmitting) return;

        if (!reviewForm.fakeAuthorName.trim()) {
            return showToast("Vui lòng nhập tên khách hàng.", "error");
        }

        if (reviewForm.content.trim().length < 10) {
            return showToast("Nội dung đánh giá phải có ít nhất 10 ký tự.", "error");
        }

        const payload = new FormData();
        payload.append("branchId", id);
        payload.append("fakeAuthorName", reviewForm.fakeAuthorName);
        payload.append("rating", Number(reviewForm.rating));
        payload.append("content", reviewForm.content);
        const dateStr = reviewForm.fakeDate ? reviewForm.fakeDate.toISOString() : new Date().toISOString();
        payload.append("fakeDate", dateStr);

        if (reviewForm.fakeAvatarFile) payload.append("avatarImage", reviewForm.fakeAvatarFile);
        else if (reviewForm.fakeAvatarUrl) payload.append("fakeAvatarUrl", reviewForm.fakeAvatarUrl);
        else payload.append("fakeAvatarUrl", AVATAR_PLACEHOLDER);

        if (reviewForm.oldReviewImageUrls.length > 0) payload.append("imageUrls", JSON.stringify(reviewForm.oldReviewImageUrls));
        if (reviewForm.reviewImageFiles.length > 0) reviewForm.reviewImageFiles.forEach((file) => payload.append("image", file));

        saveReviewMutation.mutate({ reviewId: currentReviewId, payload });
    };

    const districtOptions = (districts || []).map((d) => ({ value: d._id, label: d.name }));

    // 🟢 FIX: Filter to show only unassigned admins or the current clinic's manager
    const assignedManagerIds = (allClinics || []).map((c) => c.managerId?._id || c.managerId).filter(Boolean);

    const availableAdmins = (managers || []).filter((admin) => {
        const adminId = admin.userId || admin._id;
        // Show if admin hasn't been assigned to any clinic OR is the current clinic's manager
        return !assignedManagerIds.includes(adminId) || adminId === formData.managerId;
    });

    const adminOptions = (availableAdmins || []).map((admin) => ({ value: admin.userId || admin._id, label: `${admin.fullName || admin.username || "Chưa có tên"} - ${admin.email || admin.phone || ""}` }));

    const customSelectStyles = {
        control: (provided, state) => ({ ...provided, minHeight: "38px", borderRadius: "6px", fontSize: "14px", borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db", boxShadow: "none", "&:hover": { borderColor: "var(--primary-color)" }, backgroundColor: "#fff" }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white", color: state.isSelected ? "var(--primary-color)" : "#374151", cursor: "pointer", margin: "4px", borderRadius: "6px", fontSize: "14px", width: "96%" }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({ ...provided, overflowX: "hidden" }),
    };

    const currentManagerId = clinic?.managerId?._id || clinic?.managerId;
    const currentManager = (managers || []).find((m) => (m.userId || m._id) === currentManagerId) || (typeof clinic?.managerId === "object" ? clinic?.managerId : null);

    if (isClinicLoading) return <div className="z-clinic-detail-state">Đang tải dữ liệu...</div>;
    if (clinicError || !clinic) return <div className="z-clinic-detail-state z-clinic-detail-error">{clinicError?.message || "Không có dữ liệu"}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Phòng khám", path: "/clinics" }, { label: "Chi tiết Phòng khám" }]} title="Quản lí chi tiết phòng khám" description="Xem chi tiết và chỉnh sửa thông tin phòng khám, quản lý các đánh giá của phòng khám." />

            <div className="z-clinic-detail-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                {/* CARD THÔNG TIN PHÒNG KHÁM */}
                <div className="z-clinic-detail-card">
                    <div className="z-clinic-detail-layout">
                        <div className="z-clinic-detail-left">
                            <div className="z-clinic-detail-main-img-container">
                                <img
                                    src={images[activeImage]}
                                    alt={clinic.name}
                                    className="z-clinic-detail-main-img"
                                    onError={(e) => {
                                        e.target.src = FALLBACK_IMG;
                                    }}
                                />
                            </div>
                            {images.length > 1 && (
                                <div className="z-clinic-detail-thumb-list">
                                    {images.map((img, index) => (
                                        <div key={index} className={`z-clinic-detail-thumb-item ${activeImage === index ? "active" : ""}`} onClick={() => setActiveImage(index)}>
                                            <img
                                                src={img}
                                                alt={`thumb-${index}`}
                                                onError={(e) => {
                                                    e.target.src = FALLBACK_IMG;
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="z-clinic-detail-right">
                            <div className="z-clinic-detail-header-info">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                                    <span className="z-clinic-detail-badge">Chi nhánh hệ thống</span>
                                    <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--warning)" }}>
                                        {/* 🟢 Nếu số lượng review = 0 thì hiển thị 0 sao, ngược lại thì lấy số từ backend */}⭐ {clinic.totalReview === 0 ? 0 : clinic.totalRating?.toFixed(1) || 0}
                                        <span style={{ color: "#6b7280", fontSize: "12px", marginLeft: "4px" }}>({clinic.totalReview || 0} đánh giá)</span>
                                    </span>
                                </div>
                                <h1 className="z-clinic-detail-title">{clinic.name}</h1>
                                <div className="z-clinic-detail-phone">📞 Hotline: {clinic.hotline || "Đang cập nhật"}</div>
                            </div>

                            <div className="z-clinic-detail-section">
                                <h3>Thông tin chi tiết</h3>
                                <p className="z-clinic-detail-desc">{clinic.description || "Chưa có mô tả cho phòng khám này."}</p>
                            </div>

                            <div className="z-clinic-detail-specs-box">
                                <h3>Địa chỉ & Hoạt động</h3>
                                <ul className="z-clinic-detail-specs-list">
                                    <li>
                                        <span className="spec-label">Địa chỉ:</span>
                                        <span className="spec-value" style={{ textAlign: "right" }}>
                                            {clinic.address || "Đang cập nhật"}
                                        </span>
                                    </li>
                                    <li>
                                        <span className="spec-label">Giờ hoạt động:</span>
                                        <span className="spec-value">
                                            {clinic.openingHours?.openTime || "07:30"} - {clinic.openingHours?.closeTime || "19:30"}
                                        </span>
                                    </li>
                                    <li>
                                        <span className="spec-label">Quản lý (Admin):</span>
                                        <span className="spec-value" style={{ textAlign: "right" }}>
                                            {currentManager ? (
                                                <>
                                                    <div style={{ color: "var(--primary-color)", fontWeight: "700" }}>{currentManager.fullName || currentManager.username || "Chưa có tên"}</div>
                                                    <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500", marginTop: "2px" }}>{currentManager.email || currentManager.phoneNumber || "Chưa cập nhật liên hệ"}</div>
                                                </>
                                            ) : (
                                                <span style={{ color: "#9ca3af", fontStyle: "italic", fontWeight: "normal" }}>-- Chưa gán --</span>
                                            )}
                                        </span>
                                    </li>
                                    <li>
                                        <span className="spec-label">Trạng thái:</span>
                                        <span className="spec-value">{clinic.isActive ? <span className="z-clinic-detail-badge-active">Đang hoạt động</span> : <span className="z-clinic-detail-badge-inactive">Ngừng hoạt động</span>}</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="z-clinic-detail-actions">
                                <button className="z-clinic-detail-btn-back" onClick={() => navigate("/clinics")}>
                                    Quay lại danh sách
                                </button>
                                <button className="z-clinic-detail-btn-primary" onClick={handleEditClick}>
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

                {/* QUẢN LÝ ĐÁNH GIÁ (REVIEWS) */}
                <div className="z-clinic-detail-card" style={{ marginTop: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h2 style={{ fontSize: "18px", margin: 0, color: "#111827" }}>Quản lý Đánh giá ({reviewTotal})</h2>
                        {/* 🟢 KHU VỰC TIÊU ĐỀ & NÚT RELOAD CỤC BỘ */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <button
                                onClick={() => refetchReviews()}
                                disabled={isReviewsFetching}
                                title="Tải lại danh sách đánh giá"
                                className="z-clinic-detail-reload-btn"
                                style={{
                                    backgroundColor: isReviewsFetching ? "#09482d" : "var(--primary-color)",
                                    cursor: isReviewsFetching ? "not-allowed" : "pointer",
                                    
                                }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                        transition: "transform 0.5s ease",
                                        transform: isReviewsFetching ? "rotate(180deg)" : "rotate(0deg)", // Xoay nhẹ khi đang tải
                                    }}
                                >
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                    <path d="M3 3v5h5"></path>
                                </svg>
                            </button>
                            <AddButton onClick={() => handleOpenReviewModal(null)}>Thêm Seeding</AddButton>
                        </div>
                    </div>

                    {isReviewsLoading ? (
                        <div className="z-clinic-detail-state">Đang tải đánh giá...</div>
                    ) : (
                        <div className="z-clinic-detail-table-wrapper">
                            <table className="z-clinic-detail-table">
                                <thead>
                                    <tr>
                                        <th>Khách hàng</th>
                                        <th>Đánh giá</th>
                                        <th>Nội dung</th>
                                        <th>Ngày tạo</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: "center" }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reviews.map((r) => (
                                        <tr key={r._id}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <img
                                                        src={r.authAvatar || AVATAR_PLACEHOLDER}
                                                        alt="avatar"
                                                        className="z-clinic-detail-avatar"
                                                        onError={(e) => {
                                                            e.target.src = AVATAR_PLACEHOLDER;
                                                        }}
                                                    />
                                                    <div style={{ fontWeight: "600", color: "#111827" }}>{r.authName}</div>
                                                </div>
                                            </td>
                                            <td style={{ color: "#d97706", fontWeight: "bold" }}>⭐ {r.rating}</td>
                                            <td style={{ maxWidth: "300px" }}>
                                                <div className="z-clinic-detail-text-clamp" title={r.content}>
                                                    {r.content}
                                                </div>
                                            </td>
                                            <td>{r.reviewDate ? new Date(r.reviewDate).toLocaleDateString("vi-VN") : "---"}</td>
                                            <td>
                                                <span className={r.isHidden ? "z-clinic-detail-badge-inactive" : "z-clinic-detail-badge-active"}>{r.isHidden ? "Đang ẩn" : "Hiển thị"}</span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <div className="z-clinic-detail-dropdown-actions" onClick={(e) => e.stopPropagation()}>
                                                    <button className="z-clinic-detail-more-btn">
                                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                            <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                        </svg>
                                                    </button>
                                                    <div className="z-clinic-detail-action-menu">
                                                        <EditButton onClick={() => handleOpenReviewModal(r)} />
                                                        <Button variant="outline" onClick={() => toggleHideReviewMutation.mutate(r._id)} disabled={toggleHideReviewMutation.isPending}>
                                                            {r.isHidden ? "Hiện đánh giá" : "Ẩn đánh giá"}
                                                        </Button>
                                                        <DeleteButton
                                                            onClick={() => {
                                                                setReviewToDelete(r);
                                                                setIsDeleteReviewModalOpen(true);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {reviews.length === 0 && (
                                        <tr>
                                            <td colSpan="6">
                                                <div className="z-clinic-detail-state">Chưa có đánh giá nào.</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL CẬP NHẬT PHÒNG KHÁM */}
                <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title="Cập nhật Phòng khám" maxWidth="900px" onSave={handleUpdateSubmit} saveText={isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}>
                    <div className="z-clinic-form">
                        <div className="z-clinic-form-grid">
                            <div className="z-clinic-form-column">
                                <div className="z-clinic-form-group">
                                    <label>
                                        Tên Phòng Khám <span className="z-clinic-required">*</span>
                                    </label>
                                    <input type="text" name="name" className="z-clinic-input" required value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} disabled={isSubmitting} />
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>Quản lý (Admin)</label>
                                    <ReactSelect options={adminOptions} value={adminOptions.find((opt) => opt.value === formData.managerId) || null} onChange={(selected) => setFormData((prev) => ({ ...prev, managerId: selected ? selected.value : "" }))} placeholder="-- Gõ để tìm Admin --" isSearchable={true} isDisabled={isSubmitting} styles={customSelectStyles} noOptionsMessage={() => "Không tìm thấy Admin nào"} menuPosition="fixed" />
                                </div>
                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Hotline <span className="z-clinic-required">*</span>
                                        </label>
                                        <input type="text" name="hotline" className="z-clinic-input" required value={formData.hotline} onChange={(e) => setFormData((prev) => ({ ...prev, hotline: e.target.value }))} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Email liên hệ</label>
                                        <input type="email" name="email" className="z-clinic-input" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} disabled={isSubmitting} />
                                    </div>
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>
                                        Thuộc Quận/Huyện <span className="z-clinic-required">*</span>
                                    </label>
                                    <ReactSelect options={districtOptions} value={districtOptions.find((option) => option.value === formData.districtId) || null} onChange={(selected) => setFormData((prev) => ({ ...prev, districtId: selected ? selected.value : "" }))} placeholder="-- Gõ để tìm Phường/Xã --" isSearchable={true} isDisabled={isSubmitting} styles={customSelectStyles} noOptionsMessage={() => "Không tìm thấy Phường/Xã"} menuPosition="fixed" />
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>
                                        Địa chỉ chi tiết <span className="z-clinic-required">*</span>
                                    </label>
                                    <textarea name="address" className="z-clinic-textarea" rows="2" required value={formData.address} onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))} disabled={isSubmitting}></textarea>
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>Mô tả / Giới thiệu</label>
                                    <textarea name="description" className="z-clinic-textarea" rows="3" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} disabled={isSubmitting}></textarea>
                                </div>
                            </div>
                            <div className="z-clinic-form-column">
                                <h3 className="z-clinic-form-section-title">Định vị & Bản đồ</h3>
                                <div className="z-clinic-form-group">
                                    <label>Link Google Maps</label>
                                    <input type="url" name="mapsUrl" className="z-clinic-input" placeholder="http://googleusercontent.com/maps..." value={formData.mapsUrl} onChange={(e) => setFormData((prev) => ({ ...prev, mapsUrl: e.target.value }))} disabled={isSubmitting} />
                                </div>
                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Kinh độ (Lng)</label>
                                        <input type="number" step="any" name="longitude" className="z-clinic-input" placeholder="VD: 106.59" value={formData.longitude} onChange={(e) => setFormData((prev) => ({ ...prev, longitude: e.target.value }))} disabled={isSubmitting} />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>Vĩ độ (Lat)</label>
                                        <input type="number" step="any" name="latitude" className="z-clinic-input" placeholder="VD: 10.76" value={formData.latitude} onChange={(e) => setFormData((prev) => ({ ...prev, latitude: e.target.value }))} disabled={isSubmitting} />
                                    </div>
                                </div>
                                <h3 className="z-clinic-form-section-title z-clinic-mt-16">Hoạt động & Dịch vụ</h3>
                                <div className="z-clinic-form-row">
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Giờ mở cửa <span className="z-clinic-required">*</span>
                                        </label>
                                        <ReactSelect options={TIME_OPTIONS} value={TIME_OPTIONS.find((opt) => opt.value === formData.openTime)} onChange={(sel) => setFormData((prev) => ({ ...prev, openTime: sel.value }))} isDisabled={isSubmitting} styles={customSelectStyles} menuPosition="fixed" />
                                    </div>
                                    <div className="z-clinic-form-group z-clinic-flex-1">
                                        <label>
                                            Giờ đóng cửa <span className="z-clinic-required">*</span>
                                        </label>
                                        <ReactSelect options={TIME_OPTIONS} value={TIME_OPTIONS.find((opt) => opt.value === formData.closeTime)} onChange={(sel) => setFormData((prev) => ({ ...prev, closeTime: sel.value }))} isDisabled={isSubmitting} styles={customSelectStyles} menuPosition="fixed" />
                                    </div>
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>Dịch vụ cung cấp</label>
                                    <div className="z-clinic-services-list">
                                        {safeServices.length > 0 && (
                                            <label className="z-clinic-service-item" style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "8px" }}>
                                                <input type="checkbox" checked={isAllServicesSelected} onChange={handleSelectAllServices} disabled={isSubmitting} />
                                                <span style={{ fontWeight: "bold", color: "var(--primary-color, #1d4ed8)" }}>Chọn tất cả ({safeServices.length} dịch vụ)</span>
                                            </label>
                                        )}
                                        {safeServices.map((srv) => (
                                            <label key={srv._id} className="z-clinic-service-item">
                                                <input type="checkbox" checked={formData.availableServiceIds.includes(srv._id)} onChange={() => handleServiceCheckbox(srv._id)} disabled={isSubmitting} />
                                                <span>{srv.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="z-clinic-form-group">
                                    <label>Trạng thái</label>
                                    <ReactSelect options={STATUS_OPTIONS} value={STATUS_OPTIONS.find((opt) => opt.value === formData.isActive.toString())} onChange={(sel) => setFormData((prev) => ({ ...prev, isActive: sel.value === "true" }))} isDisabled={isSubmitting} styles={customSelectStyles} menuPosition="fixed" />
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
                                            <div className="z-clinic-add-img-btn" onClick={() => clinicImagesInputRef.current.click()}>
                                                + Ảnh
                                            </div>
                                        )}
                                    </div>
                                    <input ref={clinicImagesInputRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* MODAL THÊM/SỬA REVIEW */}
                <Modal isOpen={isReviewModalOpen} onClose={() => !isSubmitting && setIsReviewModalOpen(false)} title={currentReviewId ? "Cập nhật Review" : "Thêm Review Seeding"} maxWidth="600px" onSave={handleReviewSubmit} saveText={isSubmitting ? "Đang xử lý..." : "Lưu Đánh Giá"}>
                    <div className="z-clinic-detail-form">
                        <div className="z-clinic-detail-form-group">
                            <label>
                                Tên khách hàng ảo <span className="z-clinic-detail-required">*</span>
                            </label>
                            <input type="text" name="fakeAuthorName" className="z-clinic-detail-input" required placeholder="VD: Chị Mai - Quận 1" value={reviewForm.fakeAuthorName} onChange={(e) => setReviewForm((prev) => ({ ...prev, fakeAuthorName: e.target.value }))} disabled={isSubmitting} />
                        </div>
                        <div className="z-clinic-detail-form-row">
                            <div className="z-clinic-detail-form-group" style={{ flex: 1 }}>
                                <label>
                                    Số Sao (1 - 5) <span className="z-clinic-detail-required">*</span>
                                </label>
                                <input type="number" name="rating" className="z-clinic-detail-input" min="1" max="5" required value={reviewForm.rating} onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))} disabled={isSubmitting} />
                            </div>
                            <div className="z-clinic-detail-form-group" style={{ flex: 1 }}>
                                <label>Ngày đánh giá ảo</label>
                                <DatePicker selected={reviewForm.fakeDate} onChange={(date) => setReviewForm((prev) => ({ ...prev, fakeDate: date }))} showTimeSelect timeFormat="HH:mm" timeIntervals={1} dateFormat="dd/MM/yyyy HH:mm" className="z-clinic-detail-input" placeholderText="Bỏ trống lấy ngày hiện tại" disabled={isSubmitting} locale="vi" />
                            </div>
                        </div>
                        <div className="z-clinic-detail-form-group">
                            <label>Ảnh Avatar (Tùy chọn)</label>
                            <div className="z-clinic-detail-upload-wrapper">
                                {reviewForm.previewUrl || reviewForm.fakeAvatarUrl ? (
                                    <div className="z-clinic-detail-img-box avatar-box">
                                        <img src={reviewForm.previewUrl || reviewForm.fakeAvatarUrl} alt="Avatar preview" />
                                        <button
                                            type="button"
                                            className="z-clinic-detail-remove-btn"
                                            onClick={() => {
                                                if (reviewForm.previewUrl) URL.revokeObjectURL(reviewForm.previewUrl);
                                                setReviewForm((prev) => ({ ...prev, fakeAvatarFile: null, previewUrl: "", fakeAvatarUrl: "" }));
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <div className="z-clinic-detail-add-img-btn avatar-add" onClick={() => avatarInputRef.current.click()}>
                                        + Tải ảnh
                                    </div>
                                )}
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                        const f = e.target.files[0];
                                        if (f) setReviewForm((prev) => ({ ...prev, fakeAvatarFile: f, previewUrl: URL.createObjectURL(f) }));
                                        e.target.value = null;
                                    }}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="z-clinic-detail-form-group">
                            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <span>
                                    Nội dung đánh giá <span className="z-clinic-detail-required">*</span>
                                </span>
                                <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "normal" }}>(Ít nhất 10 ký tự)</span>
                            </label>

                            <textarea name="content" className="z-clinic-detail-textarea" rows="4" required placeholder="Nhận xét của khách hàng..." value={reviewForm.content} onChange={(e) => setReviewForm((prev) => ({ ...prev, content: e.target.value }))} disabled={isSubmitting}></textarea>
                        </div>

                        <div className="z-clinic-detail-form-group">
                            <label>Hình ảnh thực tế kèm theo (Tùy chọn)</label>
                            <div className="z-clinic-detail-upload-wrapper">
                                {reviewForm.reviewImagePreviews.map((src, index) => (
                                    <div key={`rev-img-${index}`} className="z-clinic-detail-img-box">
                                        <img src={src} alt="Review attachment" />
                                        <button
                                            type="button"
                                            className="z-clinic-detail-remove-btn"
                                            onClick={() => {
                                                const newFiles = [...reviewForm.reviewImageFiles];
                                                const newPreviews = [...reviewForm.reviewImagePreviews];
                                                URL.revokeObjectURL(newPreviews[index]);
                                                newFiles.splice(index, 1);
                                                newPreviews.splice(index, 1);
                                                setReviewForm((prev) => ({ ...prev, reviewImageFiles: newFiles, reviewImagePreviews: newPreviews }));
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {reviewForm.reviewImagePreviews.length < 3 && (
                                    <div className="z-clinic-detail-add-img-btn" onClick={() => reviewImagesInputRef.current.click()}>
                                        + Thêm ảnh
                                    </div>
                                )}
                            </div>
                            <input
                                ref={reviewImagesInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    if (reviewForm.oldReviewImageUrls.length + reviewForm.reviewImageFiles.length + files.length > 3) return showToast("Mỗi review tối đa 3 ảnh!", "error");
                                    const newPreviews = files.map((file) => URL.createObjectURL(file));
                                    setReviewForm((prev) => ({ ...prev, reviewImageFiles: [...prev.reviewImageFiles, ...files], reviewImagePreviews: [...prev.reviewImagePreviews, ...newPreviews] }));
                                    e.target.value = null;
                                }}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                </Modal>

                {/* MODAL XÓA REVIEW */}
                <Modal isOpen={isDeleteReviewModalOpen} onClose={() => !isSubmitting && setIsDeleteReviewModalOpen(false)} title="Xác nhận xóa" maxWidth="500px" onSave={() => deleteReviewMutation.mutate(reviewToDelete?._id)} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" }}>
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3 style={{ fontSize: "18px", marginBottom: "8px", color: "#111827" }}>Xóa đánh giá?</h3>
                        <p style={{ color: "#4b5563" }}>
                            Bạn có chắc chắn muốn xóa vĩnh viễn đánh giá của khách hàng <strong>{reviewToDelete?.authName}</strong> không? Hành động này không thể hoàn tác.
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default ClinicDetail;
