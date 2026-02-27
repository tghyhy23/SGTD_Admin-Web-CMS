import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

import logo from '../../assets/images/logo_sgtd.png';
import search from '../../assets/icons/search_icon.png';
import question from '../../assets/icons/question_icon.png';
import bell from '../../assets/icons/bell_icon.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  // Giá trị mặc định nếu user chưa có avatar/tên
  const displayName = user?.fullName || user?.name || "Admin";
  const displayAvatar = user?.avatarUrl || "https://i.pravatar.cc/150?img=11";

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <img src={logo} alt="Logo" className="sidebar-logo-img" />
      </div>

      <div className="navbar-right">
        <div className="nav-item">
          <img src={search} alt="Search" className="nav-icon" />
        </div>
        <div className="nav-item">
          <img src={question} alt="Question" className="nav-icon" />
        </div>
        <div className="nav-item">
          <img src={bell} alt="Bell" className="nav-icon" />
        </div>

        {/* User Profile Container (Có Menu Hover) */}
        <div 
          className="nav-item user-profile-container"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <div className="user-profile">
            <img src={displayAvatar} alt="avatar" className="avatar" />
            <span className="user-name">{displayName}</span>
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-header">
                <span className="dropdown-role">{user?.role || "ADMIN"}</span>
                <span className="dropdown-email">{user?.email || "admin@example.com"}</span>
              </div>
              <ul className="dropdown-list">
                <li className="dropdown-item" onClick={() => navigate('/profile')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-icon lucide-user">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Trang cá nhân</span>
                </li>
                
                <li className="dropdown-item logout-btn" onClick={handleLogout}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out-icon lucide-log-out">
                    <path d="m16 17 5-5-5-5"/>
                    <path d="M21 12H9"/>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  </svg>
                  <span>Đăng xuất</span>
                </li>
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Navbar;