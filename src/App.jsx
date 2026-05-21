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
import Companies from './pages/Companies/Companies';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  // 🟢 LẤY ROLE TỪ TÀI KHOẢN ĐĂNG NHẬP
  const userRole = user?.role || user?.account?.role || user?.user?.account?.role;
  
  // 🟢 ĐỊNH NGHĨA 3 CẤP ĐỘ QUYỀN TRUY CẬP (Khớp 100% với Sidebar)
  const isSuperAdmin = userRole === "SUPERADMIN";
  const isAdminOrSuperAdmin = ["SUPERADMIN", "ADMIN"].includes(userRole);
  const isStaff = ["SUPERADMIN", "ADMIN", "SALE", "RECEPTIONIST"].includes(userRole);

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
            {/* NHÓM 1: QUYỀN VẬN HÀNH CHUNG */}
            {/* (SUPERADMIN, ADMIN, SALE, RECEPTIONIST) */}
            {/* ========================================== */}
            {isStaff && (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clinics" element={<Clinics />} />
                  <Route path="/clinics/:id" element={<ClinicDetail />} />
                  <Route path="/promotions" element={<Promotions />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/services/:id" element={<ServiceDetail />} />
                  <Route path="/categories" element={<Categories />} />
                </>
            )}

            {/* ========================================== */}
            {/* NHÓM 2: QUYỀN QUẢN LÝ NỘI DUNG */}
            {/* (SUPERADMIN, ADMIN) */}
            {/* ========================================== */}
            {isAdminOrSuperAdmin && (
                <>
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/banners" element={<Banners />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/blogs" element={<Blogs />} />
                </>
            )}

            {/* ========================================== */}
            {/* NHÓM 3: QUYỀN QUẢN TRỊ HỆ THỐNG LÕI */}
            {/* (CHỈ SUPERADMIN) */}
            {/* ========================================== */}
            {isSuperAdmin && (
                <>
                  <Route path="/users" element={<Users />} />
                  <Route path="/locations" element={<Location />} />
                  <Route path="/warranties" element={<Warranties />} />
                </>
            )}

            {/* Fallback: Bắt mọi route sai hoặc không có quyền đẩy về trang chủ */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;