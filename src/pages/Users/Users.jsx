import React, { useEffect, useState } from "react";
import { userApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import { Button, EditButton, DeleteButton } from "../../ui/Button/Button";
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
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState("newest");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [formData, setFormData] = useState({ role: "USER" });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Lấy tất cả ID của danh sách thỏa điều kiện lọc (không chỉ trang hiện tại)
            const allIds = allFilteredUsers.map((user) => user.userId);
            setSelectedUserIds(allIds);
        } else {
            // Bỏ chọn tất cả
            setSelectedUserIds([]);
        }
    };

    // Hàm xử lý khi click checkbox từng dòng
    const handleSelectRow = (userId) => {
        setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
    };
    useEffect(() => {
        setSelectedUserIds([]);
    }, [searchTerm, filterRole, sortOrder]);

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
                </div>

                <div className="z-user-table-wrapper">
                    <table className="z-user-table">
                        <thead>
                            <tr>
                                <th style={{ width: "80px" }}>
                                    <input
                                        type="checkbox"
                                        className="z-user-checkbox"
                                        onChange={handleSelectAll}
                                        // Tích xanh nếu số lượng đã chọn bằng tổng số lượng tìm thấy
                                        checked={allFilteredUsers.length > 0 && selectedUserIds.length === allFilteredUsers.length}
                                    />
                                </th>
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
                                        <td>
                                            <input type="checkbox" className="z-user-checkbox" checked={selectedUserIds.includes(user.userId)} onChange={() => handleSelectRow(user.userId)} onClick={(e) => e.stopPropagation()} />
                                        </td>
                                        <td>
                                            <div className="z-user-info-cell">
                                                <img src={user.avatarUrl || FALLBACK_AVATAR} alt="" className="z-user-avatar" />
                                                <div className="z-user-name-wrapper">
                                                    <div className="z-user-name" title={user.fullName || user.username}>
                                                        {user.fullName || user.username || "N/A"}
                                                    </div>
                                                    {/* Thêm title để hover xem email đầy đủ */}
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
                                                    <EditButton onClick={() => handleEditClick(user)} />
                                                    {role !== "SUPERADMIN" && (
                                                        <DeleteButton
                                                            onClick={() => {
                                                                setUserToDelete(user);
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                            label="Khóa"
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

                {/* MODALS */}
                <Modal isOpen={isEditModalOpen} onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)} title="Cấp quyền Người Dùng" size="md" onSave={handleEditSubmit} saveText={isSubmittingEdit ? "Đang lưu..." : "Lưu thay đổi"}>
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

                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)} title="Xác nhận khóa" size="sm" onSave={confirmDelete} saveText={isSubmittingDelete ? "Đang xử lý..." : "Khóa tài khoản"}>
                    <div className="z-user-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Khóa tài khoản?</h3>
                        <p>
                            Tài khoản <strong>{userToDelete?.fullName}</strong> sẽ bị vô hiệu hóa.
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Users;
