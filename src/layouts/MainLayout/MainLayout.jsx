// src/layouts/MainLayout/MainLayout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/Sidebar';
import Navbar from '../../components/Navbar/Navbar';
import './MainLayout.css';

const MainLayout = () => {
  return (
    <div className="main-layout">
      {/* Navbar nằm trên cùng, full-width */}
      <Navbar />
      
      {/* Vùng bên dưới chứa Sidebar và Content */}
      <div className="layout-body">
        <Sidebar />
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;