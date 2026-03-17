// src/components/Navbar/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { categoryApi } from '../../api/axiosApi'; 
import { useLocation } from 'react-router-dom'; // Thêm import useLocation
import './Navbar.css';

const Navbar = ({ toggleSidebar }) => {
  const { user } = useAuth(); 
  const location = useLocation(); // Lấy đường dẫn hiện tại
  
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  // FETCH DANH SÁCH CATEGORIES VÀ SET ACTIVE TAB
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getRealCategories();
        if (res && res.success) {
          const fetchedCategories = res.data.categories;
          setCategories(fetchedCategories);

          const savedCategory = localStorage.getItem('activeCategory');
          
          if (savedCategory) {
            setActiveCategory(JSON.parse(savedCategory));
          } else {
            // Mặc định chọn cái đầu tiên nếu chưa có
            const defaultCat = fetchedCategories[0];
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

  const handleSwitchCategory = (category) => {
    setActiveCategory(category);
    localStorage.setItem('activeCategory', JSON.stringify(category));
    window.location.reload(); 
  };

  // Xác định xem trang hiện tại có cần ẩn Tabs không (Có thể thêm các trang khác vào mảng này)
  const hideTabsPages = ['/banners', '/blogs', '/settings'];
  const isHideTabs = hideTabsPages.includes(location.pathname);

  return (
    <div className="navbar">
      <div className="navbar-left">
        {/* === NÚT TOGGLE === */}
        <button className="nav-toggle-btn" onClick={toggleSidebar}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#424242" stroke-linecap="round" stroke-linejoin="round" id="Layout-Sidebar--Streamline-Tabler" height="24" width="24">
  <desc>
    Layout Sidebar Streamline Icon: https://streamlinehq.com
  </desc>
  <path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2H6a2 2 0 0 1 -2 -2z" stroke-width="2"></path>
  <path d="m9 4 0 16" stroke-width="2"></path>
</svg>
        </button>

        {/* XỬ LÝ ĐIỀU KIỆN RENDER TABS HAY TEXT */}
        {isHideTabs ? (
            // Nếu đang ở trang cần ẩn Tabs (VD: Banners) -> Hiện Text cố định
            <div className="nav-fixed-title">
                Sài Gòn Tâm Đức
            </div>
        ) : (
            // Nếu không -> Hiện Thanh Tabs như bình thường
            <div className="navbar-tabs">
            {categories.map((cat) => {
                const isActive = activeCategory?._id === cat._id;
                return (
                <div 
                    key={cat._id}
                    className={`nav-tab-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSwitchCategory(cat)}
                >
                    {cat.iconUrl && (
                        <img src={cat.iconUrl} alt="" className="nav-tab-icon" />
                    )}
                    <span>{cat.title || cat.name}</span>
                </div>
                );
            })}
            </div>
        )}
        
      </div>

      <div className="navbar-right">
        {/* === HIỂN THỊ ROLE NGƯỜI DÙNG === */}
        <div className="nav-user-role">
            <span className="role-value">{user?.role || "ADMIN"}</span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;