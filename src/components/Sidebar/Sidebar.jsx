// src/components/Sidebar/Sidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/images/logo_sgtd.png";
import "./Sidebar.css";

const Sidebar = ({ isExpanded }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // State Menu Profile ở dưới cùng
    const [showDropdown, setShowDropdown] = useState(false);

    const displayName = user?.fullName || user?.name || "Admin";
    const displayAvatar = user?.avatarUrl || "https://i.pravatar.cc/150?img=11";

    const handleLogout = () => {
        localStorage.removeItem("activeCategory"); // Clear dữ liệu nếu cần
        logout();
    };

    const menuItems = [
        {
            path: "/",
            label: "Quản lí lịch hẹn",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-clock-icon lucide-calendar-clock">
                    <path d="M16 14v2.2l1.6 1" />
                    <path d="M16 2v4" />
                    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
                    <path d="M3 10h5" />
                    <path d="M8 2v4" />
                    <circle cx="16" cy="16" r="6" />
                </svg>
            ),
        },
        {
            path: "/users",
            label: "Quản lí người dùng",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <path d="M10 15H6a4 4 0 0 0-4 4v2" />
                    <path d="m14.305 16.53.923-.382" />
                    <path d="m15.228 13.852-.923-.383" />
                    <path d="m16.852 12.228-.383-.923" />
                    <path d="m16.852 17.772-.383.924" />
                    <path d="m19.148 12.228.383-.923" />
                    <path d="m19.53 18.696-.382-.924" />
                    <path d="m20.772 13.852.924-.383" />
                    <path d="m20.772 16.148.924.383" />
                    <circle cx="18" cy="15" r="3" />
                    <circle cx="9" cy="7" r="4" />
                </svg>
            ),
        },
        {
            path: "/services",
            label: "Quản lí dịch vụ",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                </svg>
            ),
        },
        {
            path: "/categories",
            label: "Quản lí danh mục",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <path d="M11 13v4" />
                    <path d="M15 5v4" />
                    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                    <rect x="7" y="13" width="9" height="4" rx="1" />
                    <rect x="7" y="5" width="12" height="4" rx="1" />
                </svg>
            ),
        },
        {
            path: "/promotions",
            label: "Quản lí khuyến mãi",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    <path d="m9.5 14.5 5-5" />
                </svg>
            ),
        },
        {
            path: "/locations",
            label: "Quản lí khu vực",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
            ),
        },
        {
            path: "/notifications",
            label: "Quản lí thông báo",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                    <path d="M11.68 2.009A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673c-.824-.85-1.678-1.731-2.21-3.348" />
                    <circle cx="18" cy="5" r="3" />
                </svg>
            ),
        },
        {
            path: "/clinics",
            label: "Quản lí phòng khám",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <path d="M12 7v4" />
                    <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
                    <path d="M14 9h-4" />
                    <path d="M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
                    <path d="M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16" />
                </svg>
            ),
        },
        {
            path: "/banners",
            label: "Quản lí banner",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
            ),
        },
        {
            path: "/blogs",
            label: "Quản lí tin tức",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide">
                    <path d="M15 18h-5" />
                    <path d="M18 14h-8" />
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" />
                    <rect width="8" height="4" x="10" y="6" rx="1" />
                </svg>
            ),
        },
    ];

    return (
        <aside className={`sidebar ${!isExpanded ? "collapsed" : ""}`}>
            {/* LOGO TRÊN CÙNG */}
            <div className="sidebar-logo-container">
                <img src={logo} alt="Logo" className="z-sidebar-logo-img" />
            </div>

            {/* VÙNG MENU CUỘN ĐƯỢC */}
            <ul className="sidebar-menu">
                {menuItems.map((item, index) => (
                    <li key={index}>
                        <NavLink to={item.path} className={({ isActive }) => (isActive ? "active-link" : "")}>
                            <span className="menu-icon">{item.icon}</span>
                            <span className="menu-label">{item.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>

            {/* VÙNG CHỨA AVATAR DƯỚI CÙNG (GHIM CỐ ĐỊNH) */}
            <div className="sidebar-footer" onMouseEnter={() => setShowDropdown(true)} onMouseLeave={() => setShowDropdown(false)}>
                {/* MENU DROPDOWN SẼ BUNG NGƯỢC LÊN TRÊN KHI HOVER */}
                {showDropdown && (
                    <div className="profile-dropdown-menu">
                        <div className="dropdown-header">
                            <span className="dropdown-role">{user?.role || "ADMIN"}</span>
                            <span className="dropdown-email">{user?.email || "admin@example.com"}</span>
                        </div>

                        <div className="dropdown-account-section">
                            <ul className="dropdown-list">
                                <li className="dropdown-item" onClick={() => navigate("/profile")}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span>Trang cá nhân</span>
                                </li>
                                <li className="dropdown-item logout-btn" onClick={handleLogout}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="m16 17 5-5-5-5" />
                                        <path d="M21 12H9" />
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    </svg>
                                    <span>Đăng xuất</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* THẺ HIỂN THỊ AVATAR */}
                <div className="user-profile">
                    <img src={displayAvatar} alt="avatar" className="avatar" />
                    {isExpanded && (
                        <div className="sidebar-user-info">
                            <span className="user-name" title={displayName}>
                                {displayName}
                            </span>
                            <span className="sidebar-user-role">{user?.role || "ADMIN"}</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
