// src/pages/Users/Users.jsx
import React, { useEffect, useState } from "react";
import { userApi } from "../../api/axiosApi";
import Modal from "../../components/Modal/Modal";
import "../Services/Services.css";

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

const Users = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState("newest");
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // ==========================================
    // STATE CHO MODAL XÓA
    // ==========================================
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    // ==========================================
    // STATE CHO MODAL SỬA ROLE (PHÂN QUYỀN)
    // ==========================================
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null); // Lưu thông tin user đang sửa

    // Form data chỉ chứa role
    const [formData, setFormData] = useState({ role: "USER" });

    // ==========================================
    // LẤY DỮ LIỆU
    // ==========================================
    const fetchAllUsers = async () => {
        setIsLoading(true);
        try {
            const res = await userApi.getAllUsers({ limit: 100 });
            if (res && res.users) {
                setUsers(res.users);
            } else if (res && res.data && res.data.users) {
                setUsers(res.data.users);
            } else {
                setError("Không thể tải danh sách người dùng.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách users:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const getUserRole = (user) => {
        return user?.account?.role || user?.role || "USER";
    };

    // ==========================================
    // XỬ LÝ XÓA USER (KHÓA)
    // ==========================================
    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsSubmittingDelete(true);
        try {
            const response = await userApi.deleteUserByAdmin(userToDelete.userId);
            if (response && response.success) {
                showToast("Khóa/Xóa tài khoản thành công!", "success");
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
                fetchAllUsers();
            } else {
                showToast(response?.message || "Lỗi khi xóa người dùng", "error");
            }
        } catch (error) {
            console.error("Lỗi deleteUser:", error);
            showToast(error.response?.data?.message || "Không thể thao tác lúc này", "error");
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    // ==========================================
    // XỬ LÝ PHÂN QUYỀN (SỬA ROLE)
    // ==========================================
    const handleEditClick = (user) => {
        setUserToEdit(user);
        setFormData({
            role: getUserRole(user),
        });
        setIsEditModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingEdit(true);

        try {
            // Đóng gói data bằng FormData theo đúng file axiosApi.js của bạn
            const submitData = new FormData();
            submitData.append("role", formData.role);

            // Ghi chú: Nếu Backend cấu hình nhận nested object như account.role,
            // bạn có thể đổi key thành "account.role" ở đây.
            // submitData.append("account.role", formData.role);

            const response = await userApi.updateUserByAdmin(userToEdit.userId, submitData);

            if (response && response.success !== false) {
                // Giả định thành công
                showToast("Cấp quyền thành công!", "success");
                setIsEditModalOpen(false);
                fetchAllUsers();
            } else {
                showToast(response?.message || "Lỗi khi cấp quyền", "error");
            }
        } catch (error) {
            console.error("Lỗi updateUser:", error);
            showToast(error.response?.data?.message || "Lỗi kết nối đến máy chủ", "error");
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    // ==========================================
    // FILTER & SORT
    // ==========================================
    const filteredUsers = users
        .filter((user) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedName = removeVietnameseTones(user.fullName || user.username || "");
            const normalizedEmail = removeVietnameseTones(user.email || "");
            const phone = user.phoneNumber || "";

            const matchesSearch = normalizedName.includes(normalizedSearch) || normalizedEmail.includes(normalizedSearch) || phone.includes(searchTerm);

            let matchesRole = true;
            const role = getUserRole(user);
            if (filterRole !== "all") {
                if (filterRole === "ADMIN") {
                    matchesRole = role === "ADMIN" || role === "SUPERADMIN";
                } else {
                    matchesRole = role.toUpperCase() === filterRole.toUpperCase();
                }
            }

            return matchesSearch && matchesRole;
        })
        .sort((a, b) => {
            const dateA = a.joinedAt ? new Date(a.joinedAt) : new Date(0);
            const dateB = b.joinedAt ? new Date(b.joinedAt) : new Date(0);

            if (sortOrder === "newest") return dateB - dateA;
            if (sortOrder === "oldest") return dateA - dateB;
            return 0;
        });

    const getRoleLabel = () => {
        if (filterRole === "all") return "Tất cả vai trò";
        if (filterRole === "ADMIN") return "Admin";
        if (filterRole === "USER") return "Khách hàng (User)";
        return filterRole;
    };

    const getSortLabel = () => {
        if (sortOrder === "newest") return "Tài khoản mới nhất";
        if (sortOrder === "oldest") return "Tài khoản cũ nhất";
        return "Mặc định";
    };

    // Render UI
    if (isLoading) return <div className="state-message">Đang tải dữ liệu người dùng...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

    return (
        <div className="services-container">
            {/* THÔNG BÁO TOAST */}
            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Tài Khoản (Users)</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input type="text" placeholder="Tìm tên, email, sđt..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* Lọc theo Role */}
                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowRoleDropdown(!showRoleDropdown);
                                setShowSortDropdown(false);
                            }}
                        >
                            <span>{getRoleLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showRoleDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className={`filter-option ${filterRole === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterRole("all");
                                        setShowRoleDropdown(false);
                                    }}
                                >
                                    Tất cả vai trò
                                </div>
                                <div
                                    className={`filter-option ${filterRole === "ADMIN" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterRole("ADMIN");
                                        setShowRoleDropdown(false);
                                    }}
                                >
                                    Admin
                                </div>
                                <div
                                    className={`filter-option ${filterRole === "USER" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterRole("USER");
                                        setShowRoleDropdown(false);
                                    }}
                                >
                                    Khách hàng (User)
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sắp xếp */}
                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            style={{ minWidth: "190px" }}
                            onClick={() => {
                                setShowSortDropdown(!showSortDropdown);
                                setShowRoleDropdown(false);
                            }}
                        >
                            <span>{getSortLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showSortDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className={`filter-option ${sortOrder === "newest" ? "active" : ""}`}
                                    onClick={() => {
                                        setSortOrder("newest");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    Mới nhất (Mặc định)
                                </div>
                                <div
                                    className={`filter-option ${sortOrder === "oldest" ? "active" : ""}`}
                                    onClick={() => {
                                        setSortOrder("oldest");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    Cũ nhất
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tài khoản</th>
                            <th>Thông tin liên hệ</th>
                            <th>Quyền (Role)</th>
                            <th>Trạng thái</th>
                            <th>Ngày tham gia</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user, index) => {
                            const userRole = getUserRole(user);
                            return (
                                <tr key={user.userId || index} className="clickable-row">
                                    <td style={{ fontWeight: "bold" }}>{index + 1}</td>

                                    {/* Cột Tài khoản (Avatar + Tên) */}
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div className="td-image" style={{ width: "40px", height: "40px", padding: 0 }}>
                                                <img
                                                    src={user.avatarUrl || FALLBACK_AVATAR}
                                                    alt={user.fullName || "User"}
                                                    style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1px solid #e5e7eb" }}
                                                    onError={(e) => {
                                                        e.target.src = FALLBACK_AVATAR;
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <div className="product-name" style={{ fontSize: "14px", color: "#111827" }}>
                                                    {user.fullName || user.username || "Chưa cập nhật"}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Cột Liên hệ (Email & Phone) */}
                                    <td>
                                        <div style={{ color: "#4b5563", fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                            <span title="Email">✉️ {user.email || "Trống"}</span>
                                            <span title="Phone">📞 {user.phoneNumber || "Trống"}</span>
                                        </div>
                                    </td>

                                    {/* Cột Phân quyền */}
                                    <td>
                                        <span
                                            className="category-badge"
                                            style={{
                                                backgroundColor: userRole === "ADMIN" || userRole === "SUPERADMIN" ? "#fef2f2" : "#f0fdf4",
                                                color: userRole === "ADMIN" || userRole === "SUPERADMIN" ? "#dc2626" : "#16a34a",
                                                borderColor: userRole === "ADMIN" || userRole === "SUPERADMIN" ? "#fecaca" : "#bbf7d0",
                                                fontSize: "11px",
                                                padding: "2px 8px",
                                            }}
                                        >
                                            {userRole}
                                        </span>
                                    </td>

                                    {/* Cột Trạng thái */}
                                    <td>{user?.account?.status === "INACTIVE" ? <span style={{ color: "#ef4444", fontWeight: "500", fontSize: "13px" }}>Đã khóa</span> : <span style={{ color: "#10b981", fontWeight: "500", fontSize: "13px" }}>Đang hoạt động</span>}</td>

                                    {/* Ngày tham gia */}
                                    <td>
                                        <span style={{ color: "#6b7280", fontSize: "13px" }}>{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("vi-VN") : "N/A"}</span>
                                    </td>

                                    {/* Cột Thao tác */}
                                    <td>
                                        <div className="action-row">
                                            {userRole !== "SUPERADMIN" ? (
                                                <button className="action-btn btn-delete" onClick={() => handleDeleteClick(user)}>
                                                    Khóa
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>Quyền cao nhất</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && <div className="state-message">Không tìm thấy người dùng nào phù hợp.</div>}
            </div>

            {/* ==========================================
                MODAL FORM: CẤP QUYỀN (EDIT ROLE)
            ========================================== */}
            <Modal isOpen={isEditModalOpen} onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)} title="Cấp quyền Người Dùng" maxWidth="500px">
                <form onSubmit={handleEditSubmit} className="custom-form">
                    {/* Hiển thị thông tin (Readonly) */}
                    <div className="form-group">
                        <label>Tài khoản</label>
                        <input type="text" value={userToEdit?.fullName || "Chưa cập nhật"} disabled className="form-input" style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", color: "#4b5563" }} />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input type="text" value={userToEdit?.email || "Trống"} disabled className="form-input" style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", color: "#4b5563" }} />
                    </div>

                    {/* Chỉ cho phép đổi phần này */}
                    <div className="form-group">
                        <label>
                            Quyền hạn (Role) <span style={{ color: "red" }}>*</span>
                        </label>
                        <select name="role" value={formData.role} onChange={handleInputChange} disabled={isSubmittingEdit} className="form-input">
                            <option value="USER">Khách hàng (USER)</option>
                            <option value="ADMIN">Quản trị viên (ADMIN)</option>
                        </select>
                    </div>

                    <div className="modal-footer-actions" style={{ marginTop: "24px" }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSubmittingEdit}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmittingEdit}>
                            {isSubmittingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ==========================================
                MODAL XÁC NHẬN XÓA (KHÓA ACCOUNT)
            ========================================== */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)} title="Cảnh báo: Khóa Tài Khoản" maxWidth="400px">
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <div style={{ marginBottom: "15px" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </div>
                    <h3 className="delete-header">Xác nhận Khóa User</h3>
                    <p className="delete-message">
                        Hành động này sẽ khóa vĩnh viễn (Inactive) tài khoản của người dùng: <br />
                        <strong className="delete-product-name" style={{ display: "block", marginTop: "8px" }}>
                            {userToDelete?.fullName} ({userToDelete?.email})
                        </strong>
                    </p>
                    <div className="modal-footer-delete" style={{ marginTop: "24px" }}>
                        <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmittingDelete}>
                            Hủy bỏ
                        </button>
                        <button className="btn-danger" onClick={confirmDelete} disabled={isSubmittingDelete}>
                            {isSubmittingDelete ? "Đang xử lý..." : "Khóa tài khoản"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Users;
