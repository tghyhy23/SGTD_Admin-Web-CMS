// src/layouts/MainLayout/MainLayout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/Sidebar';
import Navbar from '../../components/Navbar/Navbar';
import './MainLayout.css';
import { useEffect, useState } from 'react';

const MainLayout = () => {
  const location = useLocation();
  // 1. STATE QUẢN LÝ ĐÓNG/MỞ SIDEBAR
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const toggleSidebar = () => {
      setIsSidebarExpanded(!isSidebarExpanded);
  };

  // === 5 DÒNG CODE AUTO-TRACKING TẠI ĐÂY ===
  useEffect(() => {
      const currentPath = sessionStorage.getItem('currentPath') || '/';
      // Nếu đường dẫn hiện tại khác với đường dẫn vừa lưu, tiến hành cập nhật
      if (currentPath !== location.pathname) {
          sessionStorage.setItem('prevPath', currentPath); // Lưu trang cũ thành trang trước
          sessionStorage.setItem('currentPath', location.pathname); // Cập nhật trang hiện tại
      }
  }, [location.pathname]);
  return (
    <div className="main-layout">
      {/* Navbar nằm trên cùng, full-width */}
      
      
      {/* Vùng bên dưới chứa Sidebar và Content */}
      <div className="layout-body">
        <Sidebar isExpanded={isSidebarExpanded}/>
        <div className="main-content">
          <Navbar toggleSidebar={toggleSidebar} />
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;