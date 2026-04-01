// src/pages/Users/Users.jsx
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Thêm import
import { userApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import { Button, EditButton, DeleteButton, AddButton } from "../../ui/Button/Button";
import { Select } from "../../ui/Select/Select";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import "./Users.css";

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

const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
};

// ==========================================
// HÀM DỊCH LỖI TỪ BACKEND SANG TIẾNG VIỆT
// ==========================================
const translateErrorMessage = (errorMsg) => {
    if (!errorMsg) return "Có lỗi xảy ra, vui lòng thử lại sau.";
    const msg = errorMsg.toLowerCase();

    if (msg.includes("email is already taken")) return "Email này đã được sử dụng!";
    if (msg.includes("phone number is already taken") || msg.includes("phone number is already associated")) return "Số điện thoại này đã được sử dụng bởi tài khoản khác!";
    if (msg.includes("valid email is required") || msg.includes("invalid email format")) return "Định dạng email không hợp lệ!";
    if (msg.includes("invalid phone number format")) return "Định dạng số điện thoại không hợp lệ!";
    if (msg.includes("full name and password are required") || msg.includes("full name cannot be empty")) return "Họ tên và mật khẩu là bắt buộc!";
    if (msg.includes("invalid gender")) return "Giới tính không hợp lệ!";
    if (msg.includes("invalid date of birth")) return "Ngày sinh không hợp lệ!";
    if (msg.includes("current password is required")) return "Vui lòng nhập mật khẩu hiện tại!";
    if (msg.includes("current password is incorrect")) return "Mật khẩu hiện tại không chính xác!";
    if (msg.includes("new password cannot be the same")) return "Mật khẩu mới không được trùng với mật khẩu cũ!";
    if (msg.includes("password must be at least") || msg.includes("password requires")) return "Mật khẩu phải đủ mạnh (ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số)!";
    if (msg.includes("cannot change password for google")) return "Không thể đổi mật khẩu cho tài khoản đăng nhập bằng Google!";
    if (msg.includes("user not found") || msg.includes("account not found")) return "Không tìm thấy thông tin tài khoản!";
    if (msg.includes("unauthorized access")) return "Không có quyền thực hiện thao tác này!";
    if (msg.includes("account is already inactive or deleted")) return "Tài khoản này đã bị khóa hoặc đã xóa trước đó!";
    if (msg.includes("no valid updates provided")) return "Không có thông tin nào được thay đổi!";

    return errorMsg; 
};

const roleOptions = [
    { value: "all", label: "Tất cả vai trò" },
    { value: "USER", label: "Khách hàng (USER)" },
    { value: "ADMIN", label: "Quản trị viên (ADMIN)" },
];

const genderOptions = [
    { value: "MALE", label: "Nam" },
    { value: "FEMALE", label: "Nữ" },
    { value: "OTHER", label: "Khác" },
];

const statusOptions = [
    { value: "ACTIVE", label: "Hoạt động" },
    { value: "INACTIVE", label: "Đã khóa" },
];

const Users = () => {
    const queryClient = useQueryClient();

    // ==========================================
    // STATE LỌC & PHÂN TRANG (Client-side)
    // ==========================================
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState("newest");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // ==========================================
    // MODALS STATE
    // ==========================================
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [formData, setFormData] = useState({
        role: "USER", gender: "MALE", dateOfBirth: "", accountStatus: "ACTIVE",
    });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        fullName: "", email: "", phoneNumber: "", password: "", role: "USER", gender: "MALE", dateOfBirth: "", accountStatus: "ACTIVE",
    });

    // Reset về trang 1 khi đổi bộ lọc
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole, sortOrder]);

    const getUserRole = (user) => user?.account?.role || user?.role || "USER";
    const getUserStatus = (user) => user?.account?.status || user?.account?.accountStatus || user?.status || "ACTIVE";

    // ==========================================
    // REACT QUERY: FETCH DỮ LIỆU
    // ==========================================
    const { data: users = [], isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await userApi.getAllUsers({ limit: 100 });
            return res.users || res.data?.users || [];
        },
        staleTime: 5 * 60 * 1000, // Cache 5 phút, chuyển qua lại không bị load lại
    });

    // ==========================================
    // REACT QUERY: MUTATIONS (Thêm/Sửa/Xóa)
    // ==========================================
    
    // 1. Xóa/Khóa User
    const deleteMutation = useMutation({
        mutationFn: (userId) => userApi.deleteUserByAdmin(userId),
        onSuccess: (res, deletedId) => { 
            queryClient.setQueryData(["users"], (oldData) => {
                if (!oldData) return [];
                return oldData.map(user => {
                    const currentId = String(user.userId || user._id);
                    const targetId = String(deletedId);
                    
                    if (currentId === targetId) {
                        return { 
                            ...user, 
                            status: "INACTIVE",
                            account: { ...user.account, status: "INACTIVE", accountStatus: "INACTIVE" } 
                        };
                    }
                    return user;
                });
            });

            setToast({ show: true, message: "Khóa tài khoản thành công!", type: "success" });
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            
            // Đồng bộ lại với server sau (Background)
            queryClient.invalidateQueries({ queryKey: ["users"] }); 
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.message || error.message;
            setToast({ show: true, message: translateErrorMessage(errorMsg), type: "error" });
        }
    });

    // 2. Cập nhật User
    const editMutation = useMutation({
        mutationFn: ({ id, payload }) => userApi.updateUserByAdmin(id, payload),
        onSuccess: (res, variables) => { 
            queryClient.setQueryData(["users"], (oldData) => {
                if (!oldData) return [];
                return oldData.map(user => {
                    const currentId = String(user.userId || user._id);
                    const targetId = String(variables.id);

                    if (currentId === targetId) {
                        return { 
                            ...user, 
                            ...variables.payload, // Ghi đè fullName, gender, dateOfBirth ở ngoài
                            role: variables.payload.role, // Ghi đè role ngoài
                            // QUAN TRỌNG: Ghi đè vào sâu bên trong object account để UI nhận diện được
                            account: {
                                ...user.account,
                                role: variables.payload.role,
                                status: variables.payload.accountStatus,
                                accountStatus: variables.payload.accountStatus
                            }
                        };
                    }
                    return user;
                });
            });

            setToast({ show: true, message: "Cập nhật tài khoản thành công!", type: "success" });
            setIsEditModalOpen(false);
            
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.message || error.message;
            setToast({ show: true, message: translateErrorMessage(errorMsg), type: "error" });
        }
    });

    // 3. Tạo User mới
    const createMutation = useMutation({
        mutationFn: (payload) => userApi.createUser(payload),
        onSuccess: (res, variables) => {
            // Lấy data chuẩn từ API trả về (nếu có), nếu không có thì tự chế cục data tạm
            const newUserData = res?.user || res?.data || { 
                ...variables, 
                userId: Math.random().toString(), // Tạo ID tạm để map() không bị lỗi key
                joinedAt: new Date().toISOString(),
                account: { role: variables.role, status: variables.accountStatus }
            };

            queryClient.setQueryData(["users"], (oldData) => {
                if (!oldData) return [newUserData];
                return [newUserData, ...oldData]; // Đẩy lên đầu danh sách
            });

            setToast({ show: true, message: "Tạo tài khoản thành công!", type: "success" });
            setIsCreateModalOpen(false);
            
            // Sau khi update UI xong, gọi lại API GET ngầm để lấy ID thật từ database
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || "Lỗi kết nối hệ thống";
            setToast({ show: true, message: translateErrorMessage(errorMsg), type: "error" });
        }
    });

    // Gom nhóm trạng thái loading của các hành động
    const isSubmittingDelete = deleteMutation.isPending;
    const isSubmittingEdit = editMutation.isPending;
    const isSubmittingCreate = createMutation.isPending;

    // ==========================================
    // HANDLERS CALL MUTATIONS
    // ==========================================
    const handleEditClick = (user) => {
        setUserToEdit(user);
        setFormData({
            fullName: user.fullName || user.username || "",
            role: getUserRole(user),
            gender: user.gender || "MALE",
            dateOfBirth: formatDateForInput(user.dateOfBirth),
            accountStatus: getUserStatus(user),
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = () => {
        const payload = {
            fullName: formData.fullName,
            role: formData.role,
            gender: formData.gender,
            dateOfBirth: formData.dateOfBirth || null,
            accountStatus: formData.accountStatus,
        };
        editMutation.mutate({ id: userToEdit.userId || userToEdit._id, payload });
    };

    const handleCreateSubmit = () => {
        if (!createFormData.fullName || !createFormData.email || !createFormData.password) {
            setToast({ show: true, message: "Vui lòng nhập các thông tin bắt buộc (*)", type: "error" });
            return;
        }
        
        const payload = { ...createFormData, dateOfBirth: createFormData.dateOfBirth || null };
        createMutation.mutate(payload);
    };

    const handleCreateInputChange = (e) => {
        const { name, value } = e.target;
        setCreateFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ==========================================
    // LỌC VÀ PHÂN TRANG (Trên mảng users đã cache)
    // ==========================================
    const allFilteredUsers = users
        .filter((user) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const name = removeVietnameseTones(user.fullName || user.username || "");
            const email = removeVietnameseTones(user.email || "");
            const matchesSearch = name.includes(normalizedSearch) || email.includes(normalizedSearch) || (user.phoneNumber || "").includes(searchTerm);
            const role = getUserRole(user);
            const matchesRole = filterRole === "all" || role === filterRole;
            return matchesSearch && matchesRole;
        })
        .sort((a, b) => {
            const dateA = new Date(a.joinedAt || 0);
            const dateB = new Date(b.joinedAt || 0);
            return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = allFilteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(allFilteredUsers.length / itemsPerPage);

    if (isLoading) return <div className="z-user-state">Đang tải dữ liệu...</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Tài Khoản" }]} title="Quản lý Tài Khoản Người Dùng" description="Phân quyền và quản lý thông tin khách hàng trên hệ thống." />

            <div className="z-user-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-user-header">
                    <h1 className="z-user-title">Danh sách người dùng</h1>
                </div>

                <div className="z-user-tabs">
                    <button className={`z-user-tab-item ${sortOrder === "newest" ? "active" : ""}`} onClick={() => setSortOrder("newest")}>
                        Mới nhất
                    </button>
                    <button className={`z-user-tab-item ${sortOrder === "oldest" ? "active" : ""}`} onClick={() => setSortOrder("oldest")}>
                        Cũ nhất
                    </button>
                </div>

                <div className="z-user-tools">
                    <div className="z-user-search">
                        <input type="text" placeholder="Tìm tên, email, sđt..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="z-user-filter">
                        <button className="z-user-btn-filter" onClick={() => setShowRoleDropdown(!showRoleDropdown)}>
                            <span>{roleOptions.find((r) => r.value === filterRole)?.label}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showRoleDropdown && (
                            <div className="z-user-dropdown-menu">
                                {roleOptions.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={`z-user-dropdown-item ${filterRole === opt.value ? "active" : ""}`}
                                        onClick={() => {
                                            setFilterRole(opt.value);
                                            setShowRoleDropdown(false);
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <AddButton onClick={() => setIsCreateModalOpen(true)} style={{ marginLeft: "auto" }}>
                        Thêm tài khoản
                    </AddButton>
                </div>

                <div className="z-user-table-wrapper">
                    <table className="z-user-table">
                        <thead>
                            <tr>
                                <th style={{ width: "150px", textAlign: "center" }}>STT</th>
                                <th>Tên người dùng</th>
                                <th>Ngày sinh</th>
                                <th>Vai trò</th>
                                <th>Trạng thái</th>
                                <th>Tham gia</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((user, index) => {
                                const role = getUserRole(user);
                                const isInactive = getUserStatus(user) === "INACTIVE" || getUserStatus(user) === "DELETED";
                                return (
                                    <tr key={user.userId || index}>
                                        <td style={{ textAlign: "center" }}>
                                            <strong>{indexOfFirstItem + index + 1}</strong>
                                        </td>
                                        <td>
                                            <div className="z-user-info-cell">
                                                <div className="z-user-name-wrapper">
                                                    <div className="z-user-name" title={user.fullName || user.username}>
                                                        {user.fullName || user.username || "N/A"}
                                                    </div>
                                                    <div className="z-user-sub-email" title={user.email}>
                                                        {user.email || "---"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="z-user-birthday">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("vi-VN") : "---"}</span>
                                        </td>
                                        <td>
                                            <span className={`z-user-role-badge ${role.toLowerCase()}`}>{role}</span>
                                        </td>
                                        <td>
                                            <span className={`z-user-status-badge ${isInactive ? "inactive" : "active"}`}>{isInactive ? "Đã khóa" : "Hoạt động"}</span>
                                        </td>
                                        <td>{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("vi-VN") : "---"}</td>
                                        <td>
                                            <div className="z-user-dropdown-actions">
                                                <button className="z-user-more-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>
                                                <div className="z-user-action-menu">
                                                    <EditButton onClick={() => handleEditClick(user)} label="Cập nhật" />
                                                    {role !== "SUPERADMIN" && (
                                                        <DeleteButton
                                                            onClick={() => {
                                                                setUserToDelete(user);
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                            label="Khóa tài khoản"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="z-user-pagination">
                        <button className="z-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                            Trước
                        </button>
                        <div className="z-pagination-numbers">
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i + 1} className={`z-pagination-number ${currentPage === i + 1 ? "active" : ""}`} onClick={() => setCurrentPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button className="z-pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
                            Sau
                        </button>
                    </div>
                )}

                {/* ================= MODALS ================= */}

                {/* MODAL 1: CẬP NHẬT TÀI KHOẢN (EDIT) */}
                <Modal isOpen={isEditModalOpen} onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)} title="Cập nhật Thông tin" maxWidth="550px" onSave={handleEditSubmit} saveText={isSubmittingEdit ? "Đang lưu..." : "Lưu thay đổi"}>
                    <div className="z-user-form">
                        <div className="z-user-form-group">
                            <label>Họ và tên</label>
                            <input type="text" className="z-user-input" value={formData.fullName || ""} onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))} disabled={isSubmittingEdit} />
                        </div>
                        <div className="z-user-form-group">
                            <label>Ngày sinh</label>
                            <input type="date" className="z-user-input" value={formData.dateOfBirth} onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))} disabled={isSubmittingEdit} />
                        </div>
                        <div style={{ display: "flex", gap: "16px" }}>
                            <div className="z-user-form-group" style={{ flex: 1 }}>
                                <label>Giới tính</label>
                                <Select name="gender" options={genderOptions} value={formData.gender} onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))} disabled={isSubmittingEdit} />
                            </div>
                            <div className="z-user-form-group" style={{ flex: 1 }}>
                                <label>Trạng thái</label>
                                <Select name="accountStatus" options={statusOptions} value={formData.accountStatus} onChange={(e) => setFormData((prev) => ({ ...prev, accountStatus: e.target.value }))} disabled={isSubmittingEdit} />
                            </div>
                        </div>
                        <div className="z-user-form-group" style={{ marginTop: "8px" }}>
                            <label>Vai trò hệ thống</label>
                            <Select name="role" options={roleOptions.filter((opt) => opt.value !== "all")} value={formData.role} onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))} disabled={isSubmittingEdit} />
                        </div>
                    </div>
                </Modal>

                {/* MODAL 2: TẠO TÀI KHOẢN (CREATE) */}
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        if (!isSubmittingCreate) {
                            setIsCreateModalOpen(false);
                            setCreateFormData({ fullName: "", email: "", phoneNumber: "", password: "", role: "USER", gender: "MALE", dateOfBirth: "", accountStatus: "ACTIVE" });
                            setShowPassword(false);
                        }
                    }}
                    title="Tạo tài khoản mới"
                    maxWidth="550px"
                    onSave={handleCreateSubmit}
                    saveText={isSubmittingCreate ? "Đang tạo..." : "Xác nhận tạo"}
                >
                    <div className="z-user-form">
                        <div className="z-user-form-group">
                            <label>
                                Họ và tên <span style={{ color: "red" }}>*</span>
                            </label>
                            <input type="text" name="fullName" value={createFormData.fullName} onChange={handleCreateInputChange} placeholder="Nhập họ và tên..." className="z-user-input" disabled={isSubmittingCreate} autoComplete="off" />
                        </div>

                        <div style={{ display: "flex", gap: "16px" }}>
                            <div className="z-user-form-group" style={{ flex: 1 }}>
                                <label>
                                    Email <span style={{ color: "red" }}>*</span>
                                </label>
                                <input type="email" name="email" value={createFormData.email} onChange={handleCreateInputChange} placeholder="Nhập địa chỉ email..." className="z-user-input" disabled={isSubmittingCreate} autoComplete="off" />
                            </div>
                            <div className="z-user-form-group" style={{ flex: 1 }}>
                                <label>Số điện thoại</label>
                                <input type="text" name="phoneNumber" value={createFormData.phoneNumber} onChange={handleCreateInputChange} placeholder="Nhập số điện thoại..." className="z-user-input" disabled={isSubmittingCreate} autoComplete="off" />
                            </div>
                        </div>

                        <div className="z-user-form-group">
                            <label>Mật khẩu <small style={{ color: "gray" }}>(ít nhất 8 ký tự (gồm chữ hoa và chữ thường, 1 ký tự đặc biệt))</small> <span style={{ color: "red" }}>*</span></label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={createFormData.password}
                                    onChange={handleCreateInputChange}
                                    placeholder="Tạo mật khẩu..."
                                    className="z-user-input"
                                    disabled={isSubmittingCreate}
                                    autoComplete="new-password"
                                    style={{ paddingRight: "40px" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                                    }}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "16px" }}>
                            <div className="z-user-form-group" style={{ flex: 1 }}>
                                <label>Ngày sinh</label>
                                <input type="date" name="dateOfBirth" className="z-user-input" value={createFormData.dateOfBirth} onChange={handleCreateInputChange} disabled={isSubmittingCreate} />
                            </div>
                            <div className="z-user-form-group" style={{ flex: 1 }}>
                                <label>Giới tính</label>
                                <Select name="gender" options={genderOptions} value={createFormData.gender} onChange={handleCreateInputChange} disabled={isSubmittingCreate} />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                            <div className="z-user-form-group" style={{ flex: 1 }}>
                                <label>Vai trò</label>
                                <Select name="role" options={roleOptions.filter((opt) => opt.value !== "all")} value={createFormData.role} onChange={handleCreateInputChange} disabled={isSubmittingCreate} />
                            </div>
                            <div className="z-user-form-group" style={{ flex: 1 }}>
                                <label>Trạng thái</label>
                                <Select name="accountStatus" options={statusOptions} value={createFormData.accountStatus} onChange={handleCreateInputChange} disabled={isSubmittingCreate} />
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* MODAL 3: XÓA/KHÓA TÀI KHOẢN */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)} title="Xác nhận khóa" maxWidth="400px" onSave={() => deleteMutation.mutate(userToDelete.userId || userToDelete._id)} saveText={isSubmittingDelete ? "Đang xử lý..." : "Khóa tài khoản"}>
                    <div className="z-user-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Khóa tài khoản?</h3>
                        <p>
                            Tài khoản <strong>{userToDelete?.fullName}</strong> sẽ bị vô hiệu hóa và không thể đăng nhập.
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Users;