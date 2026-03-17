// src/components/PageHeader/PageHeader.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_NAMES } from '../../routesConfig'; // Import từ điển vào
import './PageHeader.css';

export default function PageHeader({ title, description }) {
  const navigate = useNavigate();

  // 1. Tự động đọc đường dẫn của trang trước (page - 1)
  const prevPath = sessionStorage.getItem('prevPath') || '/';
  
  // 2. Tra từ điển để lấy tên trang trước (Nếu không có trong từ điển thì mặc định là "Trang chủ")
  const prevName = ROUTE_NAMES[prevPath] || "Trang chủ";

  // 3. Hàm lùi lại trang trước
  const handleGoBack = () => {
      navigate(-1); // Lệnh lùi lịch sử (page - 1) y như bạn muốn
  };

  return (
    <div className="page-header-wrapper">
      
      {/* KHU VỰC BREADCRUMBS TỰ ĐỘNG */}
      <nav className="page-header-breadcrumbs">
        {/* Nút bấm quay lại trang trước */}
        <span className="crumb-link" onClick={handleGoBack}>
          {prevName}
        </span>
        
        <span className="crumb-separator">/</span>
        
        {/* Tên trang hiện tại */}
        <span className="crumb-active">
          {title}
        </span>
      </nav>

      {title && <h1 className="page-header-title">{title}</h1>}
      {description && <p className="page-header-description">{description}</p>}
    </div>
  );
}