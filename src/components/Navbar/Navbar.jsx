import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// IMPORT categoryApi THAY VÌ systemModuleApi
import { categoryApi } from '../../api/axiosApi'; 
import './Navbar.css';

import logo from '../../assets/images/logo_sgtd.png';
import search from '../../assets/icons/search_icon.png';
import question from '../../assets/icons/question_icon.png';
import bell from '../../assets/icons/bell_icon.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  
  // STATE QUẢN LÝ CATEGORY (Thay thế cho Module)
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const displayName = user?.fullName || user?.name || "Admin";
  const displayAvatar = user?.avatarUrl || "https://i.pravatar.cc/150?img=11";

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // 1. FETCH DANH SÁCH CATEGORY TỪ BACKEND
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getRealCategories(); // Gọi API get Category
        if (res && res.success) {
          const fetchedCategories = res.data.categories;
          setCategories(fetchedCategories);

          // Kiểm tra xem trong localStorage đã lưu Category nào chưa
          const savedCategory = localStorage.getItem('activeCategory');
          
          if (savedCategory) {
            setActiveCategory(JSON.parse(savedCategory));
          } else {
            // Nếu chưa có, mặc định chọn Category đầu tiên (hoặc ưu tiên NHA KHOA)
            const defaultCat = fetchedCategories.find(c => c.title === "NHA KHOA" || c.name === "NHA KHOA") || fetchedCategories[0];
            if (defaultCat) {
              setActiveCategory(defaultCat);
              localStorage.setItem('activeCategory', JSON.stringify(defaultCat));
            }
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách Category:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('activeCategory'); // Clear data khi logout
    logout();
  };

  // 2. XỬ LÝ KHI CLICK CHUYỂN ĐỔI CATEGORY
  const handleSwitchCategory = (category) => {
    // Lưu Category mới vào State và LocalStorage
    setActiveCategory(category);
    localStorage.setItem('activeCategory', JSON.stringify(category));
    setShowDropdown(false);
    
    // Tải lại trang để toàn bộ app fetch lại data theo Category mới
    window.location.reload(); 
  };

  return (
    <>
      {toast.show && (
        <div className={`navbar-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="navbar">
        <div className="navbar-left">
          <img src={logo} alt="Logo" className="sidebar-logo-img" />
          
          {/* 3. HIỂN THỊ TÊN CATEGORY HIỆN TẠI LÊN NAVBAR */}
          {activeCategory && (
            <div className="module-badge-current">
              {activeCategory.title || activeCategory.name} {/* Lấy title hoặc name */}
            </div>
          )}
        </div>

        <div className="navbar-right">
          <div className="nav-item"><img src={search} alt="Search" className="nav-icon" /></div>
          <div className="nav-item"><img src={question} alt="Question" className="nav-icon" /></div>
          <div className="nav-item"><img src={bell} alt="Bell" className="nav-icon" /></div>

          <div 
            className="nav-item user-profile-container"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <div className="user-profile">
              <img src={displayAvatar} alt="avatar" className="avatar" />
              <span className="user-name">{displayName}</span>
            </div>

            {showDropdown && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-header">
                  <span className="dropdown-role">{user?.role || "ADMIN"}</span>
                  <span className="dropdown-email">{user?.email || "admin@example.com"}</span>
                </div>

                {/* ===== 4. MENU CHỌN CATEGORY TỪ API ===== */}
                <div className="dropdown-module-section">
                  <div className="section-title">KHU VỰC QUẢN TRỊ</div>
                  <ul className="dropdown-list">
                    {categories.map((cat) => (
                      <li 
                        key={cat._id} 
                        className={`dropdown-item module-item ${activeCategory?._id === cat._id ? 'active' : ''}`}
                        onClick={() => handleSwitchCategory(cat)}
                      >
                        <div className="module-item-left">
                          {/* Nếu category có iconUrl, có thể render thẻ img ở đây, nếu không dùng icon mặc định */}
                          <img 
                            src={cat.iconUrl || "https://cdn-icons-png.flaticon.com/512/2913/2913156.png"} 
                            alt="icon" 
                            style={{ width: '16px', height: '16px', objectFit: 'contain' }} 
                          />
                          <span>{cat.title || cat.name}</span>
                        </div>
                        {activeCategory?._id === cat._id && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#12915A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="dropdown-account-section">
                  <ul className="dropdown-list">
                    <li className="dropdown-item" onClick={() => navigate('/profile')}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <span>Trang cá nhân</span>
                    </li>
                    
                    <li className="dropdown-item logout-btn" onClick={handleLogout}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m16 17 5-5-5-5"/>
                        <path d="M21 12H9"/>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      </svg>
                      <span>Đăng xuất</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;