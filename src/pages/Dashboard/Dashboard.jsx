import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData, useQueries } from "@tanstack/react-query";
import Select from "react-select";
import { bookingApi, clinicApi, serviceApi, noteApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Button, { DeleteButton } from "../../ui/Button/Button";
import { useAuth } from "../../context/AuthContext";
import * as XLSX from "xlsx";
import "./Dashboard.css";

// ==========================================
// HÀM HELPER XỬ LÝ CHUỖI & DANH MỤC
// ==========================================
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

const STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "PENDING", label: "Chờ xác nhận" },
    { value: "CONFIRMED", label: "Đã xác nhận" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "CANCELLED", label: "Đã hủy" },
    { value: "NO_SHOW", label: "Khách không đến" },
];

const NOTE_TAGS = [
    { value: "GENERAL", label: "Chung", color: "#6b7280", bg: "#f3f4f6" },
    { value: "ISSUE", label: "Vấn đề", color: "#ef4444", bg: "#fef2f2" },
    { value: "REQUEST", label: "Yêu cầu", color: "#3b82f6", bg: "#eff6ff" },
    { value: "FOLLOW_UP", label: "Theo dõi", color: "#f59e0b", bg: "#fffbeb" },
    { value: "PAYMENT", label: "Thanh toán", color: "#10b981", bg: "#ecfdf5" },
];

const customSelectStyles = {
    control: (provided, state) => ({ ...provided, minHeight: "38px", borderRadius: "6px", fontSize: "14px", borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db", boxShadow: "none", "&:hover": { borderColor: "var(--primary-color)" }, backgroundColor: "#fff" }),
    input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white", color: state.isSelected ? "var(--primary-color)" : "#374151", cursor: "pointer", margin: "4px", borderRadius: "6px", fontSize: "14px", width: "96%" }),
    menu: (provided) => ({ ...provided, zIndex: 9999 }),
    menuList: (provided) => ({ ...provided, overflowX: "hidden" }),
};

const Dashboard = () => {
    // ==========================================
    // KHỞI TẠO QUYỀN TRUY CẬP TỪ BẢNG PHÂN QUYỀN
    // ==========================================
    const { user } = useAuth();
    const userRole = user?.role || user?.account?.role || "USER";
    const currentUserId = user?._id || user?.user?._id || user?.account?._id;
    const currentUserName = user?.fullName || user?.user?.fullName || user?.account?.fullName || "Tôi";

    const isSuperAdmin = userRole === "SUPERADMIN";
    const isAdmin = userRole === "ADMIN";
    const isSales = ["SALE", "SALES"].includes(userRole);
    const isReceptionist = userRole === "RECEPTIONIST";

    // Phân quyền theo chức năng lịch hẹn
    const canViewAllBranches = isSuperAdmin || isAdmin || isSales;
    const canDelete = isSuperAdmin; // Chỉ SuperAdmin mới được xóa lịch

    const queryClient = useQueryClient();

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

    // ==========================================
    // STATE LỌC BẢNG LỊCH HẸN
    // ==========================================
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterBranch, setFilterBranch] = useState("");
    const [filterService, setFilterService] = useState("");
    const [filterBookingDate, setFilterBookingDate] = useState("");
    const [filterCreatedAt, setFilterCreatedAt] = useState("");

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [tempStatus, setTempStatus] = useState("");
    const [tempBranch, setTempBranch] = useState("");
    const [tempService, setTempService] = useState("");
    const [tempBookingDate, setTempBookingDate] = useState("");
    const [tempCreatedAt, setTempCreatedAt] = useState("");

    const [sortOrder, setSortOrder] = useState("desc");
    const [page, setPage] = useState(1);
    const limit = 10;
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals thao tác Booking
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [bookingToConfirm, setBookingToConfirm] = useState(null);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [bookingToComplete, setBookingToComplete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState(null);

    // Modals thao tác Note
    const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
    const [bookingForNote, setBookingForNote] = useState(null);
    const [noteContent, setNoteContent] = useState("");
    const [noteTag, setNoteTag] = useState("GENERAL");

    const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
    const [noteToEdit, setNoteToEdit] = useState(null);

    const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    const [isEditBookingModalOpen, setIsEditBookingModalOpen] = useState(false);
    const [bookingToEdit, setBookingToEdit] = useState(null);
    const [editBookingData, setEditBookingData] = useState({
        bookingDate: "",
        bookingTime: "",
        contactName: "",
        contactPhone: "",
        customerNote: "",
        promotionCode: "",
    });

    const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
    const [bookingToNoShow, setBookingToNoShow] = useState(null);

    useEffect(() => {
        setFilterBranch("");
        setPage(1);
    }, [activeParentCategory?.title]);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ==========================================
    // REACT QUERY DỮ LIỆU BẢNG & DANH MỤC
    // ==========================================
    const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
        // 🟢 Cập nhật key theo phân quyền nhánh
        queryKey: ["branches", canViewAllBranches, user?.user?.id, activeParentCategory?.title],
        queryFn: async () => {
            const apiParams = { limit: 100 };
            if (activeParentCategory?.title) apiParams.category = mapCategoryToEnum(activeParentCategory.title);
            const clinicRes = await clinicApi.getAllClinics(apiParams);
            return clinicRes.data?.branches || clinicRes.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
        queryKey: ["available_slots", bookingToEdit?.branchId?._id, editBookingData.bookingDate, bookingToEdit?.variantId?._id],
        queryFn: async () => {
            const branchId = bookingToEdit?.branchId?._id || bookingToEdit?.branchId;
            if (!branchId || !editBookingData.bookingDate) return [];

            try {
                const res = await clinicApi.getAvailableTimeSlots(branchId, {
                    date: editBookingData.bookingDate,
                    variantId: bookingToEdit?.variantId?._id || "",
                });

                const payload = res?.data?.success !== undefined ? res.data : res;
                const slots = payload?.data?.slots || payload?.slots || [];
                return slots;
            } catch (error) {
                console.error("Lỗi khi tải slot thời gian:", error);
                return [];
            }
        },
        enabled: !!isEditBookingModalOpen && !!bookingToEdit && !!editBookingData.bookingDate,
    });

    const { data: services = [], isLoading: isLoadingServices } = useQuery({
        queryKey: ["services", activeParentCategory?.title],
        queryFn: async () => {
            const apiParams = { limit: 100 };
            if (activeParentCategory?.title) apiParams.category = mapCategoryToEnum(activeParentCategory.title);
            const res = await serviceApi.getAllServices(apiParams);
            return res.data?.services || res.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // 🟢 Áp dụng quyền lọc chi nhánh
    const derivedBranchId = canViewAllBranches ? filterBranch : branches.length > 0 ? branches[0]._id : undefined;

    const { data: rawBookings = [], isLoading: isLoadingBookings } = useQuery({
        queryKey: ["all_bookings", derivedBranchId, activeParentCategory?.title, sortOrder],
        queryFn: async () => {
            const params = { limit: 10000, sort: sortOrder };
            if (derivedBranchId) params.branchId = derivedBranchId;
            if (activeParentCategory?.title) params.category = mapCategoryToEnum(activeParentCategory.title);
            const res = await bookingApi.getAllBookingsAdmin(params);
            if (res && res.success) return res.data.bookings || [];
            return [];
        },
        enabled: canViewAllBranches || branches.length > 0,
        placeholderData: keepPreviousData,
        staleTime: 1 * 60 * 1000,
    });

    const { data: bookingNotes = [], isLoading: isLoadingNotes } = useQuery({
        queryKey: ["booking_notes", selectedBooking?._id],
        queryFn: async () => {
            if (!selectedBooking) return [];
            const res = await noteApi.getNotesByBooking(selectedBooking._id);
            return res.data?.notes || [];
        },
        enabled: !!selectedBooking && isDetailModalOpen,
    });

    // ==========================================
    // FRONTEND FILTER DỮ LIỆU
    // ==========================================
    const filteredBookings = useMemo(() => {
        let result = rawBookings;

        // 🟢 QUY TẮC LỄ TÂN: Chỉ xem được các lịch hẹn trạng thái ĐÃ XÁC NHẬN (Và các trạng thái kế tiếp)
        if (isReceptionist) {
            result = result.filter(b => ["CONFIRMED", "COMPLETED", "NO_SHOW"].includes(b.status));
        }

        if (debouncedSearch) {
            const lowerSearch = debouncedSearch.toLowerCase();
            result = result.filter((b) => (b.code && b.code.toLowerCase().includes(lowerSearch)) || (b.contactName && b.contactName.toLowerCase().includes(lowerSearch)) || (b.contactPhone && b.contactPhone.includes(debouncedSearch)));
        }
        if (filterStatus) result = result.filter((b) => b.status === filterStatus);
        if (filterService) result = result.filter((b) => b.serviceId?._id === filterService);
        if (filterBookingDate) result = result.filter((b) => b.bookingDate && b.bookingDate.startsWith(filterBookingDate));
        if (filterCreatedAt) result = result.filter((b) => b.createdAt && b.createdAt.startsWith(filterCreatedAt));
        return result;
    }, [rawBookings, debouncedSearch, filterStatus, filterService, filterBookingDate, filterCreatedAt, isReceptionist]);

    const totalItems = filteredBookings.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentBookings = useMemo(() => {
        const startIndex = (page - 1) * limit;
        return filteredBookings.slice(startIndex, startIndex + limit);
    }, [filteredBookings, page, limit]);

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [totalPages, page]);

    // ==========================================
    // TỰ ĐỘNG FETCH LATEST NOTE
    // ==========================================
    const noteQueries = useQueries({
        queries: currentBookings.map((booking) => ({
            queryKey: ["latest_note", booking._id],
            queryFn: async () => {
                const res = await noteApi.getNotesByBooking(booking._id);
                const notes = res.data?.notes || res.data?.data?.notes || [];
                return notes[0] || null;
            },
            staleTime: 10 * 60 * 1000,
        })),
    });

    const latestNotesMap = useMemo(() => {
        const map = {};
        noteQueries.forEach((query, index) => {
            const bookingId = currentBookings[index]?._id;
            if (bookingId && query.data) {
                const note = query.data;
                const author = note.authorId?.fullName || note.authorName || "Nhân viên";
                const content = note.content || "---";
                map[bookingId] = `${author}: ${content}`;
            }
        });
        return map;
    }, [noteQueries, currentBookings]);

    const isLoading = isLoadingBookings || isLoadingBranches || isLoadingServices;

    // ==========================================
    // MUTATIONS
    // ==========================================
    const confirmMutation = useMutation({
        mutationFn: (id) => bookingApi.confirmBooking(id),
        onSuccess: () => {
            setToast({ show: true, message: "Đã xác nhận lịch hẹn!", type: "success" });
            setIsConfirmModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["all_bookings"] });
        },
    });

    const completeMutation = useMutation({
        mutationFn: (id) => bookingApi.completeBooking(id),
        onSuccess: () => {
            setToast({ show: true, message: "Đã hoàn thành!", type: "success" });
            setIsCompleteModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["all_bookings"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => bookingApi.deleteBooking(id),
        onSuccess: () => {
            setToast({ show: true, message: "Đã xóa lịch hẹn!", type: "success" });
            setIsDeleteModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["all_bookings"] });
        },
    });

    const updateBookingMutation = useMutation({
        mutationFn: ({ id, data }) => bookingApi.updateBooking(id, data),
        onSuccess: () => {
            setToast({ show: true, message: "Đã cập nhật lịch hẹn!", type: "success" });
            setIsEditBookingModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["all_bookings"] });
        },
        onError: () => setToast({ show: true, message: "Lỗi cập nhật lịch hẹn", type: "error" }),
    });

    const noShowMutation = useMutation({
        mutationFn: (id) => bookingApi.markBookingNoShow(id),
        onSuccess: () => {
            setToast({ show: true, message: "Đã đánh dấu khách không đến!", type: "success" });
            setIsNoShowModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["all_bookings"] });
        },
        onError: () => setToast({ show: true, message: "Lỗi xử lý", type: "error" }),
    });

    const createNoteMutation = useMutation({
        mutationFn: (data) => noteApi.createNote(data.bookingId, { content: data.content, tag: data.tag }),
        onSuccess: (res, variables) => {
            const newNote = res.data?.data?.note || res.data;
            const optimisticNote = {
                ...newNote,
                authorId: {
                    _id: currentUserId,
                    fullName: currentUserName,
                },
            };

            queryClient.setQueryData(["booking_notes", variables.bookingId], (oldNotes) => {
                return oldNotes ? [optimisticNote, ...oldNotes] : [optimisticNote];
            });
            queryClient.setQueryData(["latest_note", variables.bookingId], optimisticNote);

            setToast({ show: true, message: "Đã thêm ghi chú thành công!", type: "success" });
            setIsAddNoteModalOpen(false);
            setNoteContent("");
            setNoteTag("GENERAL");

            queryClient.invalidateQueries({ queryKey: ["booking_notes", variables.bookingId] });
            queryClient.invalidateQueries({ queryKey: ["latest_note", variables.bookingId] });
        },
        onError: () => setToast({ show: true, message: "Lỗi khi thêm ghi chú", type: "error" }),
    });

    const updateNoteMutation = useMutation({
        mutationFn: ({ noteId, data }) => noteApi.updateNote(noteId, data),
        onSuccess: (res, variables) => {
            const updatedNote = res.data?.data?.note || res.data;
            queryClient.setQueryData(["booking_notes", variables.bookingId], (oldNotes) => {
                if (!oldNotes) return [];
                return oldNotes.map((n) => (n._id === variables.noteId ? { ...n, ...updatedNote, authorId: n.authorId } : n));
            });
            queryClient.setQueryData(["latest_note", variables.bookingId], (oldLatest) => {
                if (oldLatest && oldLatest._id === variables.noteId) return { ...oldLatest, ...updatedNote, authorId: oldLatest.authorId };
                return oldLatest;
            });

            setToast({ show: true, message: "Đã cập nhật ghi chú!", type: "success" });
            setIsEditNoteModalOpen(false);
            setNoteToEdit(null);

            queryClient.invalidateQueries({ queryKey: ["booking_notes", variables.bookingId] });
            queryClient.invalidateQueries({ queryKey: ["latest_note", variables.bookingId] });
        },
        onError: () => setToast({ show: true, message: "Lỗi cập nhật ghi chú", type: "error" }),
    });

    const deleteNoteMutation = useMutation({
        mutationFn: ({ noteId }) => noteApi.deleteNote(noteId),
        onSuccess: (_, variables) => {
            queryClient.setQueryData(["booking_notes", variables.bookingId], (oldNotes) => {
                if (!oldNotes) return [];
                const newNotes = oldNotes.filter((n) => n._id !== variables.noteId);
                queryClient.setQueryData(["latest_note", variables.bookingId], newNotes[0] || null);
                return newNotes;
            });

            setToast({ show: true, message: "Đã xóa ghi chú!", type: "success" });
            setIsDeleteNoteModalOpen(false);
            setNoteToDelete(null);

            queryClient.invalidateQueries({ queryKey: ["booking_notes", variables.bookingId] });
            queryClient.invalidateQueries({ queryKey: ["latest_note", variables.bookingId] });
        },
        onError: () => setToast({ show: true, message: "Lỗi khi xóa ghi chú", type: "error" }),
    });

    const isSubmitting = confirmMutation.isPending || completeMutation.isPending || deleteMutation.isPending || createNoteMutation.isPending || updateNoteMutation.isPending || deleteNoteMutation.isPending || updateBookingMutation.isPending || noShowMutation.isPending;

    // ==========================================
    // HANDLERS
    // ==========================================
    const handleRowClick = (booking) => {
        setSelectedBooking(booking);
        setIsDetailModalOpen(true);
    };

    const handleOpenAddNote = (e, booking) => {
        e.stopPropagation();
        setBookingForNote(booking);
        setNoteContent("");
        setNoteTag("GENERAL");
        setIsAddNoteModalOpen(true);
    };
    const handleSaveAddNote = () => {
        if (!noteContent.trim()) return setToast({ show: true, message: "Nhập nội dung!", type: "error" });
        createNoteMutation.mutate({ bookingId: bookingForNote?._id || selectedBooking?._id, content: noteContent, tag: noteTag });
    };

    const handleOpenEditNote = (note) => {
        setNoteToEdit(note);
        setNoteContent(note.content);
        setNoteTag(note.tag || "GENERAL");
        setIsEditNoteModalOpen(true);
    };
    const handleSaveEditNote = () => {
        if (!noteContent.trim()) return setToast({ show: true, message: "Nhập nội dung!", type: "error" });
        updateNoteMutation.mutate({
            noteId: noteToEdit._id,
            bookingId: selectedBooking?._id || bookingForNote?._id,
            data: { content: noteContent, tag: noteTag },
        });
    };

    const handleOpenEditBooking = (booking) => {
        setBookingToEdit(booking);
        const formattedDate = booking.bookingDate ? new Date(booking.bookingDate).toISOString().split("T")[0] : "";
        setEditBookingData({
            bookingDate: formattedDate,
            bookingTime: booking.bookingTime || "",
            contactName: booking.contactName || "",
            contactPhone: booking.contactPhone || "",
            customerNote: booking.customerNote || "",
            promotionCode: booking.promotionId?.code || "",
        });
        setIsEditBookingModalOpen(true);
    };

    const handleSaveEditBooking = () => {
        updateBookingMutation.mutate({ id: bookingToEdit._id, data: editBookingData });
    };

    const checkNotePermission = (note) => {
        if (["ADMIN", "SUPERADMIN"].includes(userRole)) return true;
        return note.authorId?._id === currentUserId;
    };

    const getStatusLabelText = (statusValue) => {
        if (!statusValue) return "Không xác định";
        const normalizedStatus = String(statusValue).trim().toUpperCase();
        const option = STATUS_OPTIONS.find((opt) => opt.value === normalizedStatus);
        return option ? option.label : statusValue;
    };

    const openFilterModal = () => {
        setTempBranch(filterBranch);
        setTempService(filterService);
        setTempStatus(filterStatus);
        setTempBookingDate(filterBookingDate);
        setTempCreatedAt(filterCreatedAt);
        setIsFilterModalOpen(true);
    };
    const applyFilters = () => {
        setFilterBranch(tempBranch);
        setFilterService(tempService);
        setFilterStatus(tempStatus);
        setFilterBookingDate(tempBookingDate);
        setFilterCreatedAt(tempCreatedAt);
        setPage(1);
        setIsFilterModalOpen(false);
    };
    const clearFilters = () => {
        setFilterBranch("");
        setFilterService("");
        setFilterStatus("");
        setFilterBookingDate("");
        setFilterCreatedAt("");
        setPage(1);
        setIsFilterModalOpen(false);
    };

    const branchOptions = [{ value: "", label: "Tất cả chi nhánh" }, ...branches.map((branch) => ({ value: branch._id, label: branch.name }))];
    const serviceOptions = [{ value: "", label: "Tất cả dịch vụ" }, ...services.map((srv) => ({ value: srv._id, label: srv.name }))];
    const currentTempBranch = branchOptions.find((opt) => opt.value === tempBranch) || branchOptions[0];
    const currentTempService = serviceOptions.find((opt) => opt.value === tempService) || serviceOptions[0];
    const currentTempStatus = STATUS_OPTIONS.find((opt) => opt.value === tempStatus) || STATUS_OPTIONS[0];

    const handleExportExcel = () => {
        if (!filteredBookings || filteredBookings.length === 0) return setToast({ show: true, message: "Không có dữ liệu!", type: "error" });
        const excelData = filteredBookings.map((booking, index) => ({
            STT: index + 1,
            "Mã Đơn": booking.code || "",
            "Ngày tạo lịch": booking.createdAt ? new Date(booking.createdAt).toLocaleString("vi-VN") : "",
            "Tên khách hàng": booking.contactName || "",
            "Số điện thoại": booking.contactPhone || "",
            "Dịch vụ": booking.serviceId?.name || "",
            "Gói dịch vụ": booking.variantId?.name || "Chưa chọn",
            "Chi nhánh": booking.branchId?.name || "",
            "Ngày hẹn khám": booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString("vi-VN") : "",
            "Giờ hẹn": booking.bookingTime || "",
            "Tổng tiền (VNĐ)": booking.finalPrice || 0,
            "Trạng thái": getStatusLabelText(booking.status),
            "Ghi chú KH": booking.customerNote || "",
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSach");
        XLSX.writeFile(workbook, `DanhSachLichHen_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Lịch Hẹn" }]} title="Quản lý lịch hẹn" description="Quản lý theo dõi các lịch hẹn của khách hàng." />

            <div className="z-dashboard-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h1 className="z-dashboard-title">
                        Danh sách lịch hẹn {activeParentCategory?.title ? `- ${activeParentCategory.title}` : ""}
                        <span style={{ color: "var(--primary-color)", marginLeft: "8px" }}>- Tổng: {totalItems}</span>
                    </h1>
                </div>

                <div className="z-dashboard-tools">
                    <div className="z-dashboard-search">
                        <input type="text" placeholder="Tìm mã Booking, Tên KH, SĐT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="z-dashboard-btn-filter" onClick={openFilterModal} style={{ fontWeight: 500 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 5h20" />
                            <path d="M6 12h12" />
                            <path d="M9 19h6" />
                        </svg>
                        Bộ lọc {(filterBranch || filterService || filterStatus || filterBookingDate || filterCreatedAt) && <span style={{ color: "var(--primary-color)" }}> (Đang lọc) </span>}
                    </button>
                    <button onClick={handleExportExcel} className="z-dashboard-btn-export">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 15V3" />
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <path d="m7 10 5 5 5-5" />
                        </svg>
                        Xuất Excel
                    </button>
                </div>

                <div className="z-dashboard-table-wrapper">
                    <table className="z-dashboard-table">
                        <thead>
                            <tr>
                                <th>Mã Đơn</th>
                                <th style={{ width: "5%" }}>Ngày tạo</th>
                                <th>Khách hàng</th>
                                <th>Dịch vụ / Gói</th>
                                <th style={{ width: "15%" }}>Chi nhánh</th>
                                <th>Thời gian hẹn</th>
                                <th>Trạng thái</th>
                                <th>Ghi chú</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="9">
                                        <div className="z-dashboard-state">Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : currentBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="9">
                                        <div className="z-dashboard-state">Không tìm thấy lịch hẹn.</div>
                                    </td>
                                </tr>
                            ) : (
                                currentBookings.map((booking) => (
                                    <tr key={booking._id} onClick={() => handleRowClick(booking)} style={{ cursor: "pointer" }} className="hover-row">
                                        <td>
                                            <strong style={{ color: "var(--primary-color)" }}>{booking.code}</strong>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-normal">{new Date(booking.createdAt).toLocaleDateString("vi-VN")}</div>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-bold">{booking.contactName}</div>
                                            <div className="z-dashboard-subtext">{booking.contactPhone}</div>
                                            {booking.isBookingForOthers && <span className="z-dashboard-tag-gray">Đặt hộ</span>}
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-bold z-dashboard-text-clamp">{booking.serviceId?.name}</div>
                                            <div className="z-dashboard-subtext" style={{ marginTop: "4px" }}>
                                                {booking.variantId?.name ? (
                                                    <>
                                                        {booking.variantId.name} - <span style={{ color: "var(--primary-color)", fontWeight: "500" }}>{booking.finalPrice?.toLocaleString()}đ</span>
                                                    </>
                                                ) : (
                                                    <span style={{ fontStyle: "italic", color: "var(--warning)", fontWeight: "500" }}>Chưa chọn gói</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-normal" style={{ maxWidth: "160px", whiteSpace: "normal" }}>
                                                {booking.branchId?.name}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-text-bold" style={{ color: "var(--primary-color)" }}>
                                                {booking.bookingTime}
                                            </div>
                                            <div className="z-dashboard-subtext">{new Date(booking.bookingDate).toLocaleDateString("vi-VN")}</div>
                                        </td>
                                        <td>
                                            <span className={`z-dashboard-badge-${(booking.status || "").trim().toLowerCase()}`}>{getStatusLabelText(booking.status)}</span>
                                        </td>
                                        <td>
                                            <div className="z-dashboard-subtext" style={{ maxWidth: "180px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                                {booking.customerNote || booking.note ? (
                                                    <div style={{ fontStyle: "italic", color: "#4b5563", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} title={booking.customerNote || booking.note}>
                                                        <span style={{ fontWeight: 600, color: "#6b7280" }}>KH: </span>
                                                        {booking.customerNote || booking.note}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontStyle: "italic", color: "#9ca3af" }}>Chưa có ghi chú KH</div>
                                                )}

                                                {latestNotesMap[booking._id] && (
                                                    <div style={{ color: "var(--primary-color)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} title={latestNotesMap[booking._id]}>
                                                        <span style={{ fontWeight: 600 }}>NB: </span>
                                                        {latestNotesMap[booking._id]}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            {/* 🟢 Nếu lịch hoàn thành và không có quyền xóa thì vẫn ẩn nút Dropdown để UX nhất quán với bản cũ */}
                                            {booking.status === "COMPLETED" && !canDelete ? (
                                                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="z-dashboard-dropdown-actions">
                                                    <button className="z-dashboard-more-btn">
                                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                            <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                        </svg>
                                                    </button>
                                                    <div className="z-dashboard-action-menu">
                                                        {booking.status === "PENDING" && (
                                                            <>
                                                                <Button variant="edit" onClick={() => handleOpenEditBooking(booking)} disabled={isSubmitting}>
                                                                    Sửa lịch hẹn
                                                                </Button>
                                                                <Button
                                                                    variant="primary"
                                                                    onClick={() => {
                                                                        setBookingToConfirm(booking);
                                                                        setIsConfirmModalOpen(true);
                                                                    }}
                                                                    disabled={isSubmitting}
                                                                >
                                                                    Xác nhận lịch
                                                                </Button>
                                                            </>
                                                        )}
                                                        {booking.status === "CONFIRMED" && (
                                                            <>
                                                                <Button
                                                                    variant="complete"
                                                                    onClick={() => {
                                                                        setBookingToComplete(booking);
                                                                        setIsCompleteModalOpen(true);
                                                                    }}
                                                                    disabled={isSubmitting}
                                                                >
                                                                    Hoàn thành
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setBookingToNoShow(booking);
                                                                        setIsNoShowModalOpen(true);
                                                                    }}
                                                                    disabled={isSubmitting}
                                                                    style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
                                                                >
                                                                    Khách không đến (No-show)
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button variant="outline" onClick={(e) => handleOpenAddNote(e, booking)} style={{ border: "1px solid #d1d5db", color: "#374151", backgroundColor: "#f9fafb" }}>
                                                            Thêm ghi chú
                                                        </Button>
                                                        {/* 🟢 CHỈ SUPERADMIN MỚI ĐƯỢC XÓA */}
                                                        {canDelete && (
                                                            <DeleteButton
                                                                onClick={() => {
                                                                    setBookingToDelete(booking);
                                                                    setIsDeleteModalOpen(true);
                                                                }}
                                                                disabled={isSubmitting}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="z-dashboard-pagination">
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

                {/* MODAL BỘ LỌC */}
                <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Bộ lọc" size="md" onSave={applyFilters} saveText="Áp dụng">
                    <div className="z-dashboard-filter-grid">
                        <div className="z-dashboard-filter-group">
                            <label>Trạng thái</label>
                            <Select options={STATUS_OPTIONS} value={currentTempStatus} onChange={(opt) => setTempStatus(opt ? opt.value : "")} styles={customSelectStyles} isSearchable={false} />
                        </div>
                        <div className="z-dashboard-filter-group">
                            <label>Dịch vụ</label>
                            <Select options={serviceOptions} value={currentTempService} onChange={(opt) => setTempService(opt ? opt.value : "")} styles={customSelectStyles} placeholder="Chọn..." isSearchable={true} />
                        </div>
                        <div className="z-dashboard-filter-group">
                            <label>Ngày hẹn khám</label>
                            <input type="date" value={tempBookingDate} onChange={(e) => setTempBookingDate(e.target.value)} />
                        </div>
                        <div className="z-dashboard-filter-group">
                            <label>Ngày tạo lịch</label>
                            <input type="date" value={tempCreatedAt} onChange={(e) => setTempCreatedAt(e.target.value)} />
                        </div>
                        <div className="z-dashboard-filter-group" style={{ gridColumn: "1 / -1" }}>
                            <label>Chi nhánh</label>
                            {/* 🟢 Khóa bộ lọc chi nhánh nếu Lễ Tân bị cố định vào 1 chỗ */}
                            <Select options={branchOptions} value={currentTempBranch} onChange={(opt) => setTempBranch(opt ? opt.value : "")} styles={customSelectStyles} placeholder="Chọn..." isDisabled={!canViewAllBranches} isSearchable={true} />
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                        <button type="button" onClick={clearFilters} className="z-dashboard-filter-delete">
                            Xóa bộ lọc
                        </button>
                    </div>
                </Modal>

                {/* MODAL CHI TIẾT LỊCH HẸN VÀ GHI CHÚ */}
                <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Chi tiết lịch hẹn: ${selectedBooking?.code}`} size="lg" hideFooter={true}>
                    {selectedBooking && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                                <div>
                                    <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#6b7280" }}>Khách hàng:</p>
                                    <p style={{ margin: 0, fontWeight: "600", color: "#111827" }}>{selectedBooking.contactName}</p>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#374151" }}>{selectedBooking.contactPhone}</p>
                                </div>
                                <div>
                                    <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#6b7280" }}>Thời gian hẹn:</p>
                                    <p style={{ margin: 0, fontWeight: "600", color: "var(--primary-color)" }}>
                                        {selectedBooking.bookingTime} - {new Date(selectedBooking.bookingDate).toLocaleDateString("vi-VN")}
                                    </p>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#374151" }}>
                                        Trạng thái: <strong>{getStatusLabelText(selectedBooking.status)}</strong>
                                    </p>
                                </div>
                                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
                                    <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#6b7280" }}>Ghi chú của khách khi đặt lịch:</p>
                                    <p style={{ margin: 0, fontStyle: "italic", fontSize: "14px", color: "#4b5563" }}>{selectedBooking.customerNote || selectedBooking.note || "Không có"}</p>
                                </div>
                            </div>

                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>Lịch sử ghi chú nội bộ</h3>
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            setIsDetailModalOpen(false);
                                            setBookingForNote(selectedBooking);
                                            setIsAddNoteModalOpen(true);
                                        }}
                                    >
                                        + Thêm
                                    </Button>
                                </div>

                                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                                    {isLoadingNotes ? (
                                        <p style={{ textAlign: "center", color: "#6b7280", fontStyle: "italic" }}>Đang tải ghi chú...</p>
                                    ) : bookingNotes.length === 0 ? (
                                        <div style={{ textAlign: "center", padding: "24px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px dashed #d1d5db" }}>
                                            <p style={{ margin: 0, color: "#6b7280" }}>Chưa có ghi chú nội bộ nào.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                            {bookingNotes.map((note) => {
                                                const tagInfo = NOTE_TAGS.find((t) => t.value === note.tag) || NOTE_TAGS[0];
                                                const hasPermission = checkNotePermission(note);

                                                return (
                                                    <div key={note._id} style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                <span style={{ fontWeight: "600", fontSize: "14px", color: "#111827" }}>{note.authorId?.fullName || "Nhân viên"}</span>
                                                                <span style={{ fontSize: "12px", color: "#6b7280" }}>({note.authorRole})</span>
                                                            </div>
                                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                                <span style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "9999px", fontWeight: "500", backgroundColor: tagInfo.bg, color: tagInfo.color }}>{tagInfo.label}</span>
                                                                {hasPermission && (
                                                                    <div style={{ display: "flex", gap: "12px", marginLeft: "8px" }}>
                                                                        <button onClick={() => handleOpenEditNote(note)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--edit)" }} title="Sửa">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setNoteToDelete(note);
                                                                                setIsDeleteNoteModalOpen(true);
                                                                            }}
                                                                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                                                                            title="Xóa"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#374151", whiteSpace: "pre-wrap" }}>{note.content}</p>
                                                        <div style={{ fontSize: "12px", color: "#9ca3af", textAlign: "right" }}>
                                                            Tạo lúc: {new Date(note.createdAt).toLocaleString("vi-VN")} {note.isEdited && "(Đã chỉnh sửa)"}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* MODAL THÊM GHI CHÚ */}
                <Modal isOpen={isAddNoteModalOpen} onClose={() => !isSubmitting && setIsAddNoteModalOpen(false)} title={`Thêm ghi chú cho: ${bookingForNote?.code || selectedBooking?.code}`} size="md" onSave={handleSaveAddNote} saveText={isSubmitting ? "Đang lưu..." : "Lưu"}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
                        <div className="z-dashboard-filter-group">
                            <label>Nhãn / Loại</label>
                            <select value={noteTag} onChange={(e) => setNoteTag(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                                {NOTE_TAGS.map((tag) => (
                                    <option key={tag.value} value={tag.value}>
                                        {tag.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="z-dashboard-filter-group">
                            <label>
                                Nội dung <span style={{ color: "red" }}>*</span>
                            </label>
                            <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows="4" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", resize: "vertical" }}></textarea>
                        </div>
                    </div>
                </Modal>

                {/* MODAL SỬA GHI CHÚ */}
                <Modal isOpen={isEditNoteModalOpen} onClose={() => !isSubmitting && setIsEditNoteModalOpen(false)} title="Chỉnh sửa ghi chú" size="md" onSave={handleSaveEditNote} saveText={isSubmitting ? "Đang lưu..." : "Cập nhật"}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
                        <div className="z-dashboard-filter-group">
                            <label>Nhãn / Loại</label>
                            <select value={noteTag} onChange={(e) => setNoteTag(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                                {NOTE_TAGS.map((tag) => (
                                    <option key={tag.value} value={tag.value}>
                                        {tag.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="z-dashboard-filter-group">
                            <label>
                                Nội dung <span style={{ color: "red" }}>*</span>
                            </label>
                            <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows="4" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", resize: "vertical" }}></textarea>
                        </div>
                    </div>
                </Modal>

                {/* MODAL XÓA GHI CHÚ */}
                <Modal isOpen={isDeleteNoteModalOpen} onClose={() => !isSubmitting && setIsDeleteNoteModalOpen(false)} title="Xóa ghi chú" size="sm" onSave={() => deleteNoteMutation.mutate({ noteId: noteToDelete?._id, bookingId: selectedBooking?._id || bookingForNote?._id })} saveText={isSubmitting ? "Đang xử lý..." : "Xác nhận xóa"}>
                    <div className="z-dashboard-delete-content">
                        <h3>Xóa ghi chú này?</h3>
                        <p>Hành động này không thể hoàn tác.</p>
                    </div>
                </Modal>

                {/* CÁC MODAL BOOKING */}
                <Modal isOpen={isConfirmModalOpen} onClose={() => !isSubmitting && setIsConfirmModalOpen(false)} title="Xác nhận" size="sm" onSave={() => confirmMutation.mutate(bookingToConfirm._id)} saveText="Xác nhận">
                    <div className="z-dashboard-delete-content">
                        <h3>Xác nhận lịch hẹn?</h3>
                        <p>
                            Mã đơn <strong style={{ color: "var(--edit)" }}>{bookingToConfirm?.code}</strong>?
                        </p>
                    </div>
                </Modal>
                <Modal isOpen={isCompleteModalOpen} onClose={() => !isSubmitting && setIsCompleteModalOpen(false)} title="Hoàn thành" size="sm" onSave={() => completeMutation.mutate(bookingToComplete._id)} saveText="Hoàn thành">
                    <div className="z-dashboard-delete-content">
                        <h3>Đánh dấu hoàn thành?</h3>
                        <p>
                            Mã đơn <strong style={{ color: "#10b981" }}>{bookingToComplete?.code}</strong>.
                        </p>
                    </div>
                </Modal>
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xóa lịch" size="sm" onSave={() => deleteMutation.mutate(bookingToDelete._id)} saveText="Xóa">
                    <div className="z-dashboard-delete-content">
                        <h3>Xóa lịch hẹn?</h3>
                        <p>
                            Mã đơn <strong style={{ color: "var(--error)" }}>{bookingToDelete?.code}</strong>?
                        </p>
                    </div>
                </Modal>

                {/* MODAL SỬA LỊCH HẸN */}
                <Modal isOpen={isEditBookingModalOpen} onClose={() => !isSubmitting && setIsEditBookingModalOpen(false)} title={`Sửa lịch hẹn: ${bookingToEdit?.code}`} size="md" onSave={handleSaveEditBooking} saveText={isSubmitting ? "Đang lưu..." : "Cập nhật"}>
                    <div className="z-dashboard-edit-form">
                        <div className="z-dashboard-filter-group">
                            <label>Chi nhánh thực hiện</label>
                            <input type="text" value={bookingToEdit?.branchId?.name || "Không xác định"} readOnly className="z-dashboard-input z-dashboard-input-readonly" />
                        </div>

                        <div className="z-dashboard-form-row">
                            <div className="z-dashboard-filter-group">
                                <label>Tên khách hàng</label>
                                <input type="text" value={editBookingData.contactName} onChange={(e) => setEditBookingData({ ...editBookingData, contactName: e.target.value })} className="z-dashboard-input" />
                            </div>
                            <div className="z-dashboard-filter-group">
                                <label>Số điện thoại</label>
                                <input type="text" value={editBookingData.contactPhone} onChange={(e) => setEditBookingData({ ...editBookingData, contactPhone: e.target.value })} className="z-dashboard-input" />
                            </div>
                        </div>

                        <div className="z-dashboard-form-row">
                            <div className="z-dashboard-filter-group">
                                <label>Ngày hẹn</label>
                                <input type="date" value={editBookingData.bookingDate} onChange={(e) => setEditBookingData({ ...editBookingData, bookingDate: e.target.value })} className="z-dashboard-input z-dashboard-input-date" />
                            </div>

                            <div className="z-dashboard-filter-group">
                                <label>Giờ hẹn {isLoadingSlots && <span style={{ fontSize: "12px", color: "var(--primary-color)" }}>(Đang tải...)</span>}</label>
                                <Select
                                    styles={customSelectStyles}
                                    placeholder="-- Chọn giờ --"
                                    isSearchable={true}
                                    isDisabled={isLoadingSlots || availableSlots.length === 0}
                                    noOptionsMessage={() => "Không có giờ trống"}
                                    options={availableSlots.map((slot) => {
                                        const isOriginalTime = slot.time === bookingToEdit?.bookingTime;
                                        let isPastTime = false;

                                        if (editBookingData.bookingDate) {
                                            const now = new Date();
                                            const [slotHour, slotMinute] = slot.time.split(":").map(Number);
                                            const slotDateTime = new Date(editBookingData.bookingDate);
                                            slotDateTime.setHours(slotHour, slotMinute, 0, 0);

                                            isPastTime = slotDateTime < now;
                                        }

                                        const isSelectable = (slot.available && !isPastTime) || isOriginalTime;

                                        let labelText = slot.time;
                                        if (!isSelectable && !isOriginalTime) {
                                            labelText += isPastTime ? " (Đã qua)" : " (Đã kín)";
                                        } else if (isOriginalTime) {
                                            labelText += " (Giờ hiện tại)";
                                        }

                                        return {
                                            value: slot.time,
                                            label: labelText,
                                            isDisabled: !isSelectable,
                                        };
                                    })}
                                    value={editBookingData.bookingTime ? { value: editBookingData.bookingTime, label: editBookingData.bookingTime } : null}
                                    onChange={(selectedOption) => {
                                        setEditBookingData({
                                            ...editBookingData,
                                            bookingTime: selectedOption ? selectedOption.value : "",
                                        });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="z-dashboard-filter-group">
                            <label>Nhập mã CTKM (nếu có)</label>
                            <input type="text" placeholder="Ví dụ: SALE10..." value={editBookingData.promotionCode} onChange={(e) => setEditBookingData({ ...editBookingData, promotionCode: e.target.value })} className="z-dashboard-input z-dashboard-input-uppercase" />
                        </div>

                        <div className="z-dashboard-filter-group">
                            <label>Ghi chú khách hàng</label>
                            <textarea value={editBookingData.customerNote} onChange={(e) => setEditBookingData({ ...editBookingData, customerNote: e.target.value })} rows="3" className="z-dashboard-textarea"></textarea>
                        </div>
                    </div>
                </Modal>

                {/* MODAL ĐÁNH DẤU NO-SHOW */}
                <Modal isOpen={isNoShowModalOpen} onClose={() => !isSubmitting && setIsNoShowModalOpen(false)} title="Khách không đến" size="sm" onSave={() => noShowMutation.mutate(bookingToNoShow._id)} saveText="Xác nhận">
                    <div className="z-dashboard-delete-content">
                        <h3>Đánh dấu khách không đến?</h3>
                        <p>
                            Lịch hẹn <strong style={{ color: "#f59e0b" }}>{bookingToNoShow?.code}</strong> sẽ được chuyển sang trạng thái <strong>NO_SHOW</strong>.
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};
export default Dashboard;