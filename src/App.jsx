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
// 1. IMPORT COMPONENT CHI TIẾT VÀO ĐÂY
import ServiceDetail from './pages/Services/ServiceDetail'; 

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

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
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<div>Trang Quản lý người dùng</div>} />
            
            {/* 2. KHAI BÁO CÁC ROUTE CỦA SERVICES Ở ĐÂY */}
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetail />} /> 

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;