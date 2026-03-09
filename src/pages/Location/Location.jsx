import React, { useEffect, useState } from "react";
import "./Location.css";
import { locationApi } from "../../api/axiosApi";

const Location = () => {
    // State Tab
    const [activeTab, setActiveTab] = useState("provinces"); // 'provinces' | 'districts'

    // State Data
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // State UI & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRegion, setFilterRegion] = useState("ALL");
    const [filterProvinceForDistrict, setFilterProvinceForDistrict] = useState("ALL");
    
    // THÊM STATE CHO CUSTOM DROPDOWN CHỖ NÀY:
    const [showRegionDropdown, setShowRegionDropdown] = useState(false);
    const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
    
    // State Modals
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    // State Delete Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null); // { id, name, type: 'province' | 'district' }

    // Forms
    const initialProvinceForm = { name: "", code: "", region: "NORTH" };
    const initialDistrictForm = { name: "", code: "", provinceId: "" };
    const [formData, setFormData] = useState(initialProvinceForm);

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [provRes, distRes] = await Promise.all([
                locationApi.getProvinces(),
                locationApi.getAllDistricts()
            ]);

            if (provRes && provRes.success) setProvinces(provRes.data.provinces || []);
            if (distRes && distRes.success) setDistricts(distRes.data.districts || []);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu location:", error);
            showToast("Lỗi kết nối đến máy chủ", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ==========================================
    // HELPERS
    // ==========================================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const getRegionLabel = (region) => {
        switch(region) {
            case "NORTH": return "Miền Bắc";
            case "CENTRAL": return "Miền Trung";
            case "SOUTH": return "Miền Nam";
            default: return region;
        }
    };

    // Helper lấy tên Tỉnh/Thành đang chọn cho Dropdown
    const getSelectedProvinceName = () => {
        if (filterProvinceForDistrict === "ALL") return "Tất cả Tỉnh/Thành";
        const prov = provinces.find(p => p._id === filterProvinceForDistrict);
        return prov ? prov.name : "Tất cả Tỉnh/Thành";
    };

    // ==========================================
    // XỬ LÝ SUBMIT FORM (Thêm/Sửa Tỉnh & Quận) - OPTIMISTIC UI
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditId(null);
        setFormData(activeTab === "provinces" ? initialProvinceForm : { ...initialDistrictForm, provinceId: provinces[0]?._id || "" });
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setIsEditMode(true);
        setEditId(item._id);
        if (activeTab === "provinces") {
            setFormData({ name: item.name, code: item.code, region: item.region });
        } else {
            setFormData({ name: item.name, code: item.code, provinceId: item.provinceId?._id || item.provinceId });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let res;
            if (activeTab === "provinces") {
                if (isEditMode) res = await locationApi.updateProvince(editId, formData);
                else res = await locationApi.createProvince(formData);

                if (res && res.success) {
                    showToast(isEditMode ? "Cập nhật Tỉnh/Thành thành công!" : "Thêm Tỉnh/Thành thành công!");
                    const savedProv = res.data?.province || res.data;
                    if (isEditMode) {
                        setProvinces(prev => prev.map(p => p._id === editId ? { ...p, ...formData } : p));
                    } else {
                        setProvinces(prev => [...prev, { _id: Date.now().toString(), ...formData, districtCount: 0 }]);
                    }
                    setIsModalOpen(false);
                }
            } else {
                if (isEditMode) res = await locationApi.updateDistrict(editId, formData);
                else res = await locationApi.createDistrict(formData);

                if (res && res.success) {
                    showToast(isEditMode ? "Cập nhật Phường/Xã thành công!" : "Thêm Phường/Xã thành công!");
                    const selectedProv = provinces.find(p => p._id === formData.provinceId);
                    if (isEditMode) {
                        setDistricts(prev => prev.map(d => d._id === editId ? { ...d, ...formData, provinceId: selectedProv } : d));
                    } else {
                        setDistricts(prev => [...prev, { _id: Date.now().toString(), ...formData, provinceId: selectedProv }]);
                    }
                    setIsModalOpen(false);
                }
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Lỗi thao tác", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // XỬ LÝ XÓA - OPTIMISTIC UI
    // ==========================================
    const handleDeleteClick = (item, type) => {
        setItemToDelete({ id: item._id, name: item.name, type });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSubmitting(true);

        try {
            if (itemToDelete.type === "province") {
                await locationApi.deleteProvince(itemToDelete.id);
                setProvinces(prev => prev.filter(p => p._id !== itemToDelete.id)); 
                showToast("Xóa Tỉnh/Thành phố thành công!");
            } else {
                await locationApi.deleteDistrict(itemToDelete.id);
                setDistricts(prev => prev.filter(d => d._id !== itemToDelete.id)); 
                showToast("Xóa Phường/Xã thành công!");
            }
            setIsDeleteModalOpen(false);
        } catch (error) {
            showToast(error.response?.data?.message || "Không thể xóa lúc này", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // LỌC DỮ LIỆU
    // ==========================================
    const filteredProvinces = provinces.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchRegion = filterRegion === "ALL" || p.region === filterRegion;
        return matchSearch && matchRegion;
    });

    const filteredDistricts = districts.filter(d => {
        const matchSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchProv = filterProvinceForDistrict === "ALL" || d.provinceId?._id === filterProvinceForDistrict;
        return matchSearch && matchProv;
    });

    if (isLoading) return <div className="state-message">Đang tải dữ liệu khu vực...</div>;

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message fixed-toast ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>×</button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Khu vực (Locations)</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder={`Tìm mã hoặc tên ${activeTab === 'provinces' ? 'Tỉnh/Thành' : 'Phường/Xã'}...`}
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    {/* CUSTOM DROPDOWN THAY THẾ CHO SELECT */}
                    {activeTab === "provinces" ? (
                        <div className="filter-dropdown-container" style={{ position: 'relative' }}>
                            <button className="btn-filter" onClick={() => setShowRegionDropdown(!showRegionDropdown)}>
                                <span>{filterRegion === "ALL" ? "Tất cả Vùng miền" : getRegionLabel(filterRegion)}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>
                            {showRegionDropdown && (
                                <div className="filter-dropdown-menu">
                                    <div className={`filter-option ${filterRegion === "ALL" ? "active" : ""}`} onClick={() => { setFilterRegion("ALL"); setShowRegionDropdown(false); }}>Tất cả Vùng miền</div>
                                    <div className={`filter-option ${filterRegion === "NORTH" ? "active" : ""}`} onClick={() => { setFilterRegion("NORTH"); setShowRegionDropdown(false); }}>Miền Bắc</div>
                                    <div className={`filter-option ${filterRegion === "CENTRAL" ? "active" : ""}`} onClick={() => { setFilterRegion("CENTRAL"); setShowRegionDropdown(false); }}>Miền Trung</div>
                                    <div className={`filter-option ${filterRegion === "SOUTH" ? "active" : ""}`} onClick={() => { setFilterRegion("SOUTH"); setShowRegionDropdown(false); }}>Miền Nam</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="filter-dropdown-container" style={{ position: 'relative' }}>
                            <button className="btn-filter" onClick={() => setShowProvinceDropdown(!showProvinceDropdown)}>
                                <span>{getSelectedProvinceName()}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>
                            {showProvinceDropdown && (
                                <div className="filter-dropdown-menu">
                                    <div className={`filter-option ${filterProvinceForDistrict === "ALL" ? "active" : ""}`} onClick={() => { setFilterProvinceForDistrict("ALL"); setShowProvinceDropdown(false); }}>
                                        Tất cả Tỉnh/Thành
                                    </div>
                                    {provinces.map(p => (
                                        <div key={p._id} className={`filter-option ${filterProvinceForDistrict === p._id ? "active" : ""}`} onClick={() => { setFilterProvinceForDistrict(p._id); setShowProvinceDropdown(false); }}>
                                            {p.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button className="add-btn" onClick={openAddModal}>
                        <span>+ Thêm mới {activeTab === "provinces" ? "Tỉnh" : "Quận"}</span>
                    </button>
                </div>
            </div>

            {/* TAB MENU */}
            <div className="location-tabs">
                <button className={`tab-btn ${activeTab === "provinces" ? "active" : ""}`} onClick={() => setActiveTab("provinces")}>
                    Tỉnh / Thành Phố
                </button>
                <button className={`tab-btn ${activeTab === "districts" ? "active" : ""}`} onClick={() => setActiveTab("districts")}>
                    Phường / Xã
                </button>
            </div>

            {/* TABLE RENDER DỰA THEO TAB */}
            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Mã CODE</th>
                            <th>{activeTab === "provinces" ? "Tên Tỉnh/Thành phố" : "Tên Phường/Xã"}</th>
                            <th>{activeTab === "provinces" ? "Vùng miền" : "Thuộc Tỉnh/Thành"}</th>
                            {activeTab === "provinces" && <th>Số lượng Quận</th>}
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === "provinces" ? (
                            filteredProvinces.map((prov, index) => (
                                <tr key={prov._id}>
                                    <td>{index + 1}</td>
                                    <td><strong style={{ color: "var(--primary-color)" }}>{prov.code}</strong></td>
                                    <td style={{ fontWeight: '500' }}>{prov.name}</td>
                                    <td>
                                        <span className="category-badge">{getRegionLabel(prov.region)}</span>
                                    </td>
                                    <td>{prov.districtCount || 0}</td>
                                    <td>
                                        <div className="action-row">
                                            <button className="action-btn btn-edit" onClick={() => openEditModal(prov)}>Sửa</button>
                                            <button className="action-btn btn-delete" onClick={() => handleDeleteClick(prov, "province")}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            filteredDistricts.map((dist, index) => (
                                <tr key={dist._id}>
                                    <td>{index + 1}</td>
                                    <td><strong style={{ color: "#ef4444" }}>{dist.code}</strong></td>
                                    <td style={{ fontWeight: '500' }}>{dist.name}</td>
                                    <td>
                                        <span className="category-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                                            {dist.provinceId?.name || "Không xác định"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-row">
                                            <button className="action-btn btn-edit" onClick={() => openEditModal(dist)}>Sửa</button>
                                            <button className="action-btn btn-delete" onClick={() => handleDeleteClick(dist, "district")}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {(activeTab === "provinces" && filteredProvinces.length === 0) && <div className="state-message">Không có Tỉnh/Thành nào.</div>}
                {(activeTab === "districts" && filteredDistricts.length === 0) && <div className="state-message">Không có Phường/Xã nào.</div>}
            </div>

            {/* MODAL THÊM / SỬA */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-location">
                        <div className="modal-header-location">
                            <h2>{isEditMode ? "Cập nhật" : "Thêm mới"} {activeTab === "provinces" ? "Tỉnh/Thành phố" : "Phường/Xã"}</h2>
                            <button className="close-modal-btn" onClick={() => !isSubmitting && setIsModalOpen(false)}>×</button>
                        </div>
                        
                        <form className="modal-form-location" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Tên {activeTab === "provinces" ? "Tỉnh/Thành" : "Phường/Xã"} <span className="required">*</span></label>
                                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} disabled={isSubmitting} placeholder="Ví dụ: Hồ Chí Minh" />
                            </div>

                            <div className="form-group">
                                <label>Mã Code (Viết liền không dấu) <span className="required">*</span></label>
                                <input type="text" name="code" required value={formData.code} onChange={handleInputChange} disabled={isSubmitting} placeholder="Ví dụ: HCM" style={{ textTransform: 'uppercase' }} />
                            </div>

                            {activeTab === "provinces" ? (
                                <div className="form-group">
                                    <label>Vùng miền <span className="required">*</span></label>
                                    <select name="region" value={formData.region} onChange={handleInputChange} disabled={isSubmitting} className="form-input">
                                        <option value="NORTH">Miền Bắc</option>
                                        <option value="CENTRAL">Miền Trung</option>
                                        <option value="SOUTH">Miền Nam</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Thuộc Tỉnh/Thành phố <span className="required">*</span></label>
                                    <select name="provinceId" required value={formData.provinceId} onChange={handleInputChange} disabled={isSubmitting} className="form-input">
                                        <option value="">-- Chọn Tỉnh/Thành --</option>
                                        {provinces.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="modal-footer-location">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Hủy bỏ</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang xử lý..." : "Lưu thông tin"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL XÓA */}
            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-delete" style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                        <div style={{ marginBottom: "15px" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                                <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </div>
                        <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', color: '#111827' }}>Xác nhận xóa</h3>
                        <p style={{ margin: '0 0 20px', color: '#4b5563', lineHeight: '1.5' }}>
                            Bạn có chắc chắn muốn xóa {itemToDelete?.type === 'province' ? 'Tỉnh/Thành' : 'Phường/Xã'} <br />
                            <strong style={{ color: '#ef4444' }}>"{itemToDelete?.name}"</strong> không?
                            {itemToDelete?.type === 'province' && <span style={{ display: 'block', fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>*Lưu ý: Không thể xóa nếu Tỉnh này đang chứa Phường/Xã!</span>}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>Hủy bỏ</button>
                            <button className="btn-danger" onClick={confirmDelete} disabled={isSubmitting}>
                                {isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Location;