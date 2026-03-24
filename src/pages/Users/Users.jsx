import React, { useEffect, useState } from "react";
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

const FALLBACK_AVATAR = "https://via.placeholder.com/150/e0e6ed/7f8c8d?text=User";

const roleOptions = [
    { value: "all", label: "Tất cả vai trò" },
    { value: "USER", label: "Khách hàng (USER)" },
    { value: "ADMIN", label: "Quản trị viên (ADMIN)" },
];

const Users = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState("newest");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // ==========================================
    // MODALS STATE
    // ==========================================
    // 1. Delete Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    // 2. Edit Role Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [formData, setFormData] = useState({ role: "USER" });

    // 3. Create User Modal (THÊM MỚI)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        fullName: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "USER",
    });

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchAllUsers = async () => {
        setIsLoading(true);
        try {
            const res = await userApi.getAllUsers({ limit: 100 });
            const userData = res.users || res.data?.users || [];
            setUsers(userData);
        } catch (err) {
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole, sortOrder]);

    const getUserRole = (user) => user?.account?.role || user?.role || "USER";

    // ==========================================
    // HANDLERS
    // ==========================================
    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsSubmittingDelete(true);
        try {
            const response = await userApi.deleteUserByAdmin(userToDelete.userId);
            if (response && response.success) {
                setToast({ show: true, message: "Khóa tài khoản thành công!", type: "success" });
                setIsDeleteModalOpen(false);
                fetchAllUsers();
            }
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    const handleEditClick = (user) => {
        setUserToEdit(user);
        setFormData({ role: getUserRole(user) });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async () => {
        setIsSubmittingEdit(true);
        try {
            const submitData = new FormData();
            submitData.append("role", formData.role);
            const response = await userApi.updateUserByAdmin(userToEdit.userId, submitData);
            if (response && response.success !== false) {
                setToast({ show: true, message: "Cập nhật quyền thành công!", type: "success" });
                setIsEditModalOpen(false);
                fetchAllUsers();
            }
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    // Hàm Mở form tạo User mới
    const handleOpenCreateForm = () => {
        setCreateFormData({ fullName: "", email: "", phoneNumber: "", password: "", role: "USER" });
        setIsCreateModalOpen(true);
    };

    // Hàm xử lý lưu User mới
    const handleCreateSubmit = async () => {
        if (!createFormData.fullName || !createFormData.email || !createFormData.password) {
            setToast({ show: true, message: "Vui lòng nhập các thông tin bắt buộc!", type: "error" });
            return;
        }

        setIsSubmittingCreate(true);
        try {
            // TẠI ĐÂY BẠN CẦN GỌI API TẠO USER TỪ BACKEND
            // const res = await userApi.createUser(createFormData);

            // Fake API Call để test UI:
            setTimeout(() => {
                setToast({ show: true, message: "Tính năng tạo tài khoản đang phát triển!", type: "success" });
                setIsCreateModalOpen(false);
                setIsSubmittingCreate(false);
            }, 1000);
        } catch (error) {
            setToast({ show: true, message: "Lỗi kết nối hệ thống", type: "error" });
            setIsSubmittingCreate(false);
        }
    };

    const handleCreateInputChange = (e) => {
        const { name, value } = e.target;
        setCreateFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ==========================================
    // FILTER & PAGINATION
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

                    {/* NÚT THÊM MỚI Ở ĐÂY */}
                    <AddButton onClick={handleOpenCreateForm} style={{ marginLeft: "auto" }}>
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
                                const isInactive = user?.account?.status === "INACTIVE";
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
                                                    <EditButton onClick={() => handleEditClick(user)} label="Cấp quyền" />
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

                {/* PAGINATION UI */}
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

                {/* MODAL 1: CẤP QUYỀN (EDIT) */}
                <Modal isOpen={isEditModalOpen} onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)} title="Cấp quyền Người Dùng" maxWidth="550px" onSave={handleEditSubmit} saveText={isSubmittingEdit ? "Đang lưu..." : "Lưu thay đổi"}>
                    <div className="z-user-form">
                        <div className="z-user-form-group">
                            <label>Họ và tên</label>
                            <input type="text" value={userToEdit?.fullName || ""} disabled className="z-user-input readonly" />
                        </div>
                        <div className="z-user-form-group">
                            <label>Vai trò hệ thống</label>
                            <Select
                                name="role"
                                options={[
                                    { value: "USER", label: "Khách hàng (USER)" },
                                    { value: "ADMIN", label: "Quản trị viên (ADMIN)" },
                                ]}
                                value={formData.role}
                                onChange={(e) => setFormData({ role: e.target.value })}
                            />
                        </div>
                    </div>
                </Modal>

                {/* MODAL 2: TẠO TÀI KHOẢN (CREATE) */}
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        if (!isSubmittingCreate) {
                            setIsCreateModalOpen(false);
                            // Xóa trắng state ngay khi đóng form
                            setCreateFormData({ fullName: "", email: "", phoneNumber: "", password: "", role: "USER" });
                        }
                    }}
                    title="Tạo tài khoản mới"
                    maxWidth="500px"
                    onSave={handleCreateSubmit}
                    saveText={isSubmittingCreate ? "Đang tạo..." : "Xác nhận tạo"}
                >
                    <div className="z-user-form">
                        <div className="z-user-form-group">
                            <label>
                                Họ và tên <span style={{ color: "red" }}>*</span>
                            </label>
                            <input type="text" name="fullName" value={createFormData.fullName} onChange={handleCreateInputChange} placeholder="Nhập họ và tên..." className="z-user-input" disabled={isSubmittingCreate} autoComplete="off"/>
                        </div>
                        <div className="z-user-form-group">
                            <label>
                                Email <span style={{ color: "red" }}>*</span>
                            </label>
                            <input type="email" name="email" value={createFormData.email} onChange={handleCreateInputChange} placeholder="Nhập địa chỉ email..." className="z-user-input" disabled={isSubmittingCreate} autoComplete="off"/>
                        </div>
                        <div className="z-user-form-group">
                            <label>Số điện thoại</label>
                            <input type="text" name="phoneNumber" value={createFormData.phoneNumber} onChange={handleCreateInputChange} placeholder="Nhập số điện thoại..." className="z-user-input" disabled={isSubmittingCreate} autoComplete="off"/>
                        </div>
                        <div className="z-user-form-group">
                            <label>
                                Mật khẩu <span style={{ color: "red" }}>*</span>
                            </label>
                            <input type="password" name="password" value={createFormData.password} onChange={handleCreateInputChange} placeholder="Tạo mật khẩu..." className="z-user-input" disabled={isSubmittingCreate} autoComplete="new-password"/>
                        </div>
                        <div className="z-user-form-group">
                            <label>Vai trò</label>
                            <Select
                                name="role"
                                options={[
                                    { value: "USER", label: "Khách hàng (USER)" },
                                    { value: "ADMIN", label: "Quản trị viên (ADMIN)" },
                                ]}
                                value={createFormData.role}
                                onChange={handleCreateInputChange}
                                disabled={isSubmittingCreate}
                            />
                        </div>
                    </div>
                </Modal>

                {/* MODAL 3: XÓA/KHÓA TÀI KHOẢN */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)} title="Xác nhận khóa" maxWidth="400px" onSave={confirmDelete} saveText={isSubmittingDelete ? "Đang xử lý..." : "Khóa tài khoản"}>
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
