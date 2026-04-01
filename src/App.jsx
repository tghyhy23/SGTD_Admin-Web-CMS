// src/App.jsx
import { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import './styles/base.css'; 

// Layouts
import AuthLayout from './layouts/AuthLayout/AuthLayout';
import MainLayout from './layouts/MainLayout/MainLayout';

// Auth Pages
import Login from './pages/Auth/Login/Login';

// Dashboard & Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Services from './pages/Services/Services';
import ServiceDetail from './pages/Services/ServiceDetail'; 
import Clinics from './pages/Clinics/Clinics';
import ClinicDetail from './pages/Clinics/ClinicDetail';
import Blogs from './pages/Blogs/Blogs';
import Banners from './pages/Banners/Banners';
import Categories from './pages/Categories/Categories';
import Promotions from './pages/Promotions/Promotions';
import Users from './pages/Users/Users';
import Location from './pages/Location/Location';
import Notifications from './pages/Notifications/Notifications';
import Warranties from './pages/Waranties/Warranties';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  // ✅ THÊM MỚI: Lấy role của user để phân quyền
  // (Lưu ý: Tuỳ thuộc vào cấu trúc dữ liệu user của bạn, có thể là user?.role hoặc user?.account?.role)
  const userRole = user?.role || user?.account?.role;
  const isSuperAdmin = userRole === "SUPERADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin; // SUPERADMIN cũng có mọi quyền của ADMIN

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        ) : (
          <Route element={<MainLayout />}>
            {/* ========================================== */}
            {/* NHÓM 1: CÁC ROUTE CỦA ADMIN (Superadmin cũng vào được) */}
            {/* ========================================== */}
            {isAdmin && (
                <>
                  <Route path="/" element={<Dashboard />} /> {/* Lịch hẹn */}
                  <Route path="/clinics" element={<Clinics />} />
                  <Route path="/clinics/:id" element={<ClinicDetail />} />
                  <Route path="/promotions" element={<Promotions />} />
                </>
            )}

            {/* ========================================== */}
            {/* NHÓM 2: CÁC ROUTE CHỈ DÀNH CHO SUPERADMIN */}
            {/* ========================================== */}
            {isSuperAdmin && (
                <>
                  <Route path="/users" element={<Users />} />
                  <Route path="/clinics" element={<Clinics />} />
                  <Route path="/clinics/:id" element={<ClinicDetail />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/services/:id" element={<ServiceDetail />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/blogs" element={<Blogs />} />
                  <Route path="/banners" element={<Banners />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/locations" element={<Location />} />
                  <Route path="/warranties" element={<Warranties />} />
                </>
            )}

            {/* Nếu truy cập vào trang không tồn tại hoặc không có quyền -> Đẩy về trang chủ */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;