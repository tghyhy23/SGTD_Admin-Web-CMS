import React, { useEffect, useState } from "react";
import { locationApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import { Button, EditButton, DeleteButton, AddButton } from "../../ui/Button/Button";
import { Select } from "../../ui/Select/Select";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import "./Location.css";

const removeVietnameseTones = (str) => {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
};

const REGION_OPTIONS = [
    { value: "ALL", label: "Tất cả Vùng miền" },
    { value: "NORTH", label: "Miền Bắc" },
    { value: "CENTRAL", label: "Miền Trung" },
    { value: "SOUTH", label: "Miền Nam" },
];

const Location = () => {
    // Tab State
    const [activeTab, setActiveTab] = useState("provinces");

    // Data State
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Filter & Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRegion, setFilterRegion] = useState("ALL");
    const [filterProvinceForDistrict, setFilterProvinceForDistrict] = useState("ALL");

    // UI Dropdown State
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialProvinceForm = { name: "", code: "", region: "NORTH" };
    const initialDistrictForm = { name: "", code: "", provinceId: "" };
    const [formData, setFormData] = useState(initialProvinceForm);

    // FETCH DATA
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [provRes, distRes] = await Promise.all([locationApi.getProvinces(), locationApi.getAllDistricts()]);
            if (provRes && provRes.success) setProvinces(provRes.data.provinces || []);
            if (distRes && distRes.success) setDistricts(distRes.data.districts || []);
        } catch (error) {
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Reset Pagination khi đổi tab hoặc filter
    useEffect(() => {
        setCurrentPage(1);
        setShowFilterDropdown(false);
    }, [activeTab, searchTerm, filterRegion, filterProvinceForDistrict]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const getRegionLabel = (region) => REGION_OPTIONS.find((r) => r.value === region)?.label || region;

    const getSelectedProvinceName = () => {
        if (filterProvinceForDistrict === "ALL") return "Tất cả Tỉnh/Thành";
        return provinces.find((p) => p._id === filterProvinceForDistrict)?.name || "Tất cả Tỉnh/Thành";
    };

    // ================= XỬ LÝ FORM (THÊM / SỬA) =================
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

    const handleSubmit = async () => {
        if (!formData.name || !formData.code) {
            return setToast({ show: true, message: "Vui lòng nhập đủ thông tin bắt buộc!", type: "error" });
        }

        setIsSubmitting(true);
        try {
            let res;
            if (activeTab === "provinces") {
                res = isEditMode ? await locationApi.updateProvince(editId, formData) : await locationApi.createProvince(formData);
                if (res && res.success) {
                    setToast({ show: true, message: isEditMode ? "Cập nhật Tỉnh/Thành thành công!" : "Thêm Tỉnh/Thành thành công!", type: "success" });
                    if (isEditMode) {
                        setProvinces((prev) => prev.map((p) => (p._id === editId ? { ...p, ...formData } : p)));
                    } else {
                        setProvinces((prev) => [...prev, { _id: Date.now().toString(), ...formData, districtCount: 0 }]);
                    }
                }
            } else {
                res = isEditMode ? await locationApi.updateDistrict(editId, formData) : await locationApi.createDistrict(formData);
                if (res && res.success) {
                    setToast({ show: true, message: isEditMode ? "Cập nhật Phường/Xã thành công!" : "Thêm Phường/Xã thành công!", type: "success" });
                    const selectedProv = provinces.find((p) => p._id === formData.provinceId);
                    if (isEditMode) {
                        setDistricts((prev) => prev.map((d) => (d._id === editId ? { ...d, ...formData, provinceId: selectedProv } : d)));
                    } else {
                        setDistricts((prev) => [...prev, { _id: Date.now().toString(), ...formData, provinceId: selectedProv }]);
                    }
                }
            }
            if (res && res.success) setIsModalOpen(false);
            else setToast({ show: true, message: res?.message || "Có lỗi xảy ra", type: "error" });
        } catch (error) {
            setToast({ show: true, message: "Lỗi kết nối máy chủ", type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ================= XỬ LÝ XÓA =================
    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSubmittingDelete(true);
        try {
            if (itemToDelete.type === "province") {
                await locationApi.deleteProvince(itemToDelete.id);
                setProvinces((prev) => prev.filter((p) => p._id !== itemToDelete.id));
                setToast({ show: true, message: "Xóa Tỉnh/Thành phố thành công!", type: "success" });
            } else {
                await locationApi.deleteDistrict(itemToDelete.id);
                setDistricts((prev) => prev.filter((d) => d._id !== itemToDelete.id));
                setToast({ show: true, message: "Xóa Phường/Xã thành công!", type: "success" });
            }
            setIsDeleteModalOpen(false);
        } catch (error) {
            setToast({ show: true, message: error.response?.data?.message || "Không thể xóa lúc này", type: "error" });
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    // ================= LỌC & PHÂN TRANG =================
    const currentList = activeTab === "provinces" ? provinces : districts;

    const allFilteredData = currentList.filter((item) => {
        const normalizedSearch = removeVietnameseTones(searchTerm);
        const name = removeVietnameseTones(item.name || "");
        const code = removeVietnameseTones(item.code || "");
        const matchSearch = name.includes(normalizedSearch) || code.includes(normalizedSearch);

        if (activeTab === "provinces") {
            const matchRegion = filterRegion === "ALL" || item.region === filterRegion;
            return matchSearch && matchRegion;
        } else {
            const matchProv = filterProvinceForDistrict === "ALL" || item.provinceId?._id === filterProvinceForDistrict;
            return matchSearch && matchProv;
        }
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = allFilteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(allFilteredData.length / itemsPerPage);

    if (isLoading) return <div className="z-location-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-location-state z-location-error">{error}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Khu vực" }]} title="Quản lý Khu vực (Locations)" description="Quản lý danh sách Tỉnh/Thành phố và Phường/Xã trên hệ thống." />

            <div className="z-location-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-location-header">
                    <h1 className="z-location-title">Danh sách Khu vực</h1>
                </div>

                <div className="z-location-tabs">
                    <button className={`z-location-tab-item ${activeTab === "provinces" ? "active" : ""}`} onClick={() => setActiveTab("provinces")}>
                        Tỉnh / Thành Phố
                    </button>
                    <button className={`z-location-tab-item ${activeTab === "districts" ? "active" : ""}`} onClick={() => setActiveTab("districts")}>
                        Phường / Xã
                    </button>
                </div>

                <div className="z-location-tools">
                    <div className="z-location-search">
                        <input type="text" placeholder={`Tìm mã hoặc tên ${activeTab === "provinces" ? "Tỉnh/Thành" : "Phường/Xã"}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="z-location-filter">
                        <button className="z-location-btn-filter" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                            <span>{activeTab === "provinces" ? getRegionLabel(filterRegion) : getSelectedProvinceName()}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showFilterDropdown && (
                            <div className="z-location-dropdown-menu">
                                {activeTab === "provinces" ? (
                                    REGION_OPTIONS.map((opt) => (
                                        <div key={opt.value} className={`z-location-dropdown-item ${filterRegion === opt.value ? "active" : ""}`} onClick={() => setFilterRegion(opt.value)}>
                                            {opt.label}
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className={`z-location-dropdown-item ${filterProvinceForDistrict === "ALL" ? "active" : ""}`} onClick={() => setFilterProvinceForDistrict("ALL")}>
                                            Tất cả Tỉnh/Thành
                                        </div>
                                        {provinces.map((p) => (
                                            <div key={p._id} className={`z-location-dropdown-item ${filterProvinceForDistrict === p._id ? "active" : ""}`} onClick={() => setFilterProvinceForDistrict(p._id)}>
                                                {p.name}
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <AddButton style={{ marginLeft: "auto" }} onClick={openAddModal}>Thêm mới {activeTab === "provinces" ? "Tỉnh" : "Phường"}</AddButton>
                </div>

                <div className="z-location-table-wrapper">
                    <table className="z-location-table">
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
                            {currentItems.map((item, index) => (
                                <tr key={item._id}>
                                    <td>{indexOfFirstItem + index + 1}</td>
                                    <td>
                                        <strong style={{ color: activeTab === "provinces" ? "var(--primary-color)" : "#ef4444" }}>{item.code}</strong>
                                    </td>
                                    <td>
                                        <div className="z-location-text-bold">{item.name}</div>
                                    </td>
                                    <td>{activeTab === "provinces" ? <span className="z-location-badge-gray">{getRegionLabel(item.region)}</span> : <span className="z-location-badge-gray">{item.provinceId?.name || "Không xác định"}</span>}</td>
                                    {activeTab === "provinces" && (
                                        <td>
                                            <span className="z-location-badge-blue">{item.districtCount || 0}</span>
                                        </td>
                                    )}
                                    <td>
                                        <div className="z-location-dropdown-actions">
                                            <button className="z-location-more-btn">
                                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                    <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                </svg>
                                            </button>
                                            <div className="z-location-action-menu">
                                                <EditButton onClick={() => openEditModal(item)} />
                                                <DeleteButton
                                                    onClick={() => {
                                                        setItemToDelete({ id: item._id, name: item.name, type: activeTab === "provinces" ? "province" : "district" });
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {allFilteredData.length === 0 && <div className="z-location-state">Không tìm thấy dữ liệu phù hợp.</div>}
                </div>

                {totalPages > 1 && (
                    <div className="z-location-pagination">
                        <button className="z-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                            Trước
                        </button>
                        <div className="z-pagination-numbers">
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i + 1} className={`z-pagination-number ${currentPage === i + 1 ? "active" : ""}`} onClick={() => setCurrentPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button className="z-pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
                            Sau
                        </button>
                    </div>
                )}

                {/* MODAL FORM */}
                <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={`${isEditMode ? "Cập nhật" : "Thêm mới"} ${activeTab === "provinces" ? "Tỉnh/Thành phố" : "Phường/Xã"}`} size="md" onSave={handleSubmit} saveText={isSubmitting ? "Đang xử lý..." : "Lưu thông tin"}>
                    <div className="z-location-form">
                        <div className="z-location-form-group">
                            <label>
                                Tên {activeTab === "provinces" ? "Tỉnh/Thành" : "Phường/Xã"} <span className="z-location-required">*</span>
                            </label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} disabled={isSubmitting} className="z-location-input" placeholder="Ví dụ: Hồ Chí Minh" />
                        </div>
                        <div className="z-location-form-group">
                            <label>
                                Mã Code (Viết liền không dấu) <span className="z-location-required">*</span>
                            </label>
                            <input type="text" name="code" value={formData.code} onChange={handleInputChange} disabled={isSubmitting} className="z-location-input" placeholder="Ví dụ: HCM" style={{ textTransform: "uppercase" }} />
                        </div>
                        {activeTab === "provinces" ? (
                            <div className="z-location-form-group">
                                <label>
                                    Vùng miền <span className="z-location-required">*</span>
                                </label>
                                <Select name="region" options={REGION_OPTIONS.filter((o) => o.value !== "ALL")} value={formData.region} onChange={handleInputChange} disabled={isSubmitting} />
                            </div>
                        ) : (
                            <div className="z-location-form-group">
                                <label>
                                    Thuộc Tỉnh/Thành phố <span className="z-location-required">*</span>
                                </label>
                                <Select name="provinceId" options={provinces.map((p) => ({ value: p._id, label: p.name }))} value={formData.provinceId} onChange={handleInputChange} disabled={isSubmitting} />
                            </div>
                        )}
                    </div>
                </Modal>

                {/* MODAL XÓA */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmittingDelete && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={confirmDelete} saveText={isSubmittingDelete ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-location-delete-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xác nhận xóa</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa {itemToDelete?.type === "province" ? "Tỉnh/Thành" : "Phường/Xã"} <strong>"{itemToDelete?.name}"</strong> không?
                        </p>
                        {itemToDelete?.type === "province" && (
                            <span className="z-location-required" style={{ fontSize: "12px", display: "block", marginTop: "8px" }}>
                                *Lưu ý: Không thể xóa nếu Tỉnh này đang chứa Phường/Xã!
                            </span>
                        )}
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Location;
