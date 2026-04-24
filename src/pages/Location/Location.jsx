import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // 🟢 THÊM IMPORT
import { locationApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import { Button, EditButton, DeleteButton, AddButton } from "../../ui/Button/Button";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import Select from "react-select";
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

const translateError = (errorMsg) => {
    if (!errorMsg) return "Có lỗi xảy ra, vui lòng thử lại!";

    if (errorMsg.includes("Cannot delete province with")) return "Không thể xóa vì Tỉnh/Thành này đang chứa Phường/Xã!";
    if (errorMsg.includes("Cannot delete district with")) return "Không thể xóa vì Phường/Xã này đang có Chi nhánh hoạt động!";

    const errorTranslations = {
        "Name, code and region are required!": "Vui lòng nhập đầy đủ tên, mã và vùng miền!",
        "Region must be NORTH, CENTRAL or SOUTH!": "Vùng miền không hợp lệ!",
        "Province code already exists!": "Mã Tỉnh/Thành phố này đã tồn tại trên hệ thống!",
        "Province name already exists!": "Tên Tỉnh/Thành phố này đã tồn tại!",
        "Province not found!": "Không tìm thấy Tỉnh/Thành phố này!",
        "Province, name and code are required!": "Vui lòng nhập đầy đủ thôngợp lệ!",
        "District code already exists in this province!": "Mã Phường/Xã này đã tồn tại trong Tỉnh/Thành đã chọn!",
        "District not found!": "Không tìm thấy Phường/Xã này!",
    };

    return errorTranslations[errorMsg] || errorMsg;
};

const Location = () => {
    const queryClient = useQueryClient();

    // Tab State
    const [activeTab, setActiveTab] = useState("provinces");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Filter & Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRegion, setFilterRegion] = useState("ALL");
    const [filterProvinceForDistrict, setFilterProvinceForDistrict] = useState("ALL");

    // Toast & Modals State
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    const initialProvinceForm = { name: "", code: "", region: "NORTH" };
    const initialDistrictForm = { name: "", code: "", provinceId: "" };
    const [formData, setFormData] = useState(initialProvinceForm);

    // ==========================================
    // REACT QUERY: FETCH DỮ LIỆU
    // ==========================================
    const {
        data: provinces = [],
        isLoading: isLoadingProv,
        error: provError,
    } = useQuery({
        queryKey: ["provinces"],
        queryFn: async () => {
            const res = await locationApi.getProvinces();
            return res?.data?.provinces || [];
        },
        staleTime: 5 * 60 * 1000, // Cache 5 phút
    });

    const {
        data: districts = [],
        isLoading: isLoadingDist,
        error: distError,
    } = useQuery({
        queryKey: ["districts"],
        queryFn: async () => {
            const res = await locationApi.getAllDistricts();
            return res?.data?.districts || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const isLoading = isLoadingProv || isLoadingDist;
    const errorMsg = (provError || distError)?.message || null;

    // Reset Pagination khi đổi tab hoặc filter
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm, filterRegion, filterProvinceForDistrict]);

    const sortedProvinces = useMemo(() => {
        return [...provinces].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }, [provinces]);

    // ==========================================
    // REACT QUERY: MUTATIONS (Thêm/Sửa/Xóa mượt mà)
    // ==========================================

    // --- 1. TỈNH / THÀNH PHỐ ---
    const saveProvinceMutation = useMutation({
        mutationFn: ({ id, payload }) => (id ? locationApi.updateProvince(id, payload) : locationApi.createProvince(payload)),
        onSuccess: (res, variables) => {
            const savedItem = res?.data?.province || res?.data;

            // Cập nhật giao diện lập tức
            queryClient.setQueryData(["provinces"], (old) => {
                if (!old) return old;
                if (variables.id) {
                    return old.map((p) => (p._id === variables.id ? { ...p, ...variables.payload } : p));
                }
                return [...old, { ...savedItem, ...variables.payload, districtCount: 0, _id: savedItem?._id || Date.now().toString() }];
            });

            setToast({ show: true, message: variables.id ? "Cập nhật Tỉnh/Thành thành công!" : "Thêm Tỉnh/Thành thành công!", type: "success" });
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["provinces"] });
        },
        onError: (err) => setToast({ show: true, message: translateError(err.response?.data?.error || err.response?.data?.message), type: "error" }),
    });

    const deleteProvinceMutation = useMutation({
        mutationFn: (id) => locationApi.deleteProvince(id),
        onSuccess: (res, deletedId) => {
            queryClient.setQueryData(["provinces"], (old) => (old ? old.filter((p) => p._id !== deletedId) : old));
            setToast({ show: true, message: "Xóa Tỉnh/Thành phố thành công!", type: "success" });
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["provinces"] });
        },
        onError: (err) => setToast({ show: true, message: translateError(err.response?.data?.error || err.response?.data?.message), type: "error" }),
    });

    // --- 2. PHƯỜNG / XÃ ---
    const saveDistrictMutation = useMutation({
        mutationFn: ({ id, payload }) => (id ? locationApi.updateDistrict(id, payload) : locationApi.createDistrict(payload)),
        onSuccess: (res, variables) => {
            const savedItem = res?.data?.district || res?.data;
            const fullProvince = provinces.find((p) => p._id === variables.payload.provinceId) || { _id: variables.payload.provinceId };

            // Cập nhật giao diện lập tức
            queryClient.setQueryData(["districts"], (old) => {
                if (!old) return old;
                if (variables.id) {
                    return old.map((d) => (d._id === variables.id ? { ...d, ...variables.payload, provinceId: fullProvince } : d));
                }
                return [...old, { ...savedItem, ...variables.payload, provinceId: fullProvince, _id: savedItem?._id || Date.now().toString() }];
            });

            setToast({ show: true, message: variables.id ? "Cập nhật Phường/Xã thành công!" : "Thêm Phường/Xã thành công!", type: "success" });
            setIsModalOpen(false);

            // Xóa/Thêm phường có thể làm thay đổi số lượng phường bên bảng Tỉnh, nên invalidate cả 2
            queryClient.invalidateQueries({ queryKey: ["districts"] });
            queryClient.invalidateQueries({ queryKey: ["provinces"] });
        },
        onError: (err) => setToast({ show: true, message: translateError(err.response?.data?.error || err.response?.data?.message), type: "error" }),
    });

    const deleteDistrictMutation = useMutation({
        mutationFn: (id) => locationApi.deleteDistrict(id),
        onSuccess: (res, deletedId) => {
            queryClient.setQueryData(["districts"], (old) => (old ? old.filter((d) => d._id !== deletedId) : old));
            setToast({ show: true, message: "Xóa Phường/Xã thành công!", type: "success" });
            setIsDeleteModalOpen(false);
            setItemToDelete(null);

            queryClient.invalidateQueries({ queryKey: ["districts"] });
            queryClient.invalidateQueries({ queryKey: ["provinces"] });
        },
        onError: (err) => setToast({ show: true, message: translateError(err.response?.data?.error || err.response?.data?.message), type: "error" }),
    });

    const isSubmitting = saveProvinceMutation.isPending || saveDistrictMutation.isPending;
    const isSubmittingDelete = deleteProvinceMutation.isPending || deleteDistrictMutation.isPending;

    // ==========================================
    // HANDLERS BÌNH THƯỜNG
    // ==========================================
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleReactSelectChange = (selectedOption, actionMeta) => {
        setFormData((prev) => ({ ...prev, [actionMeta.name]: selectedOption ? selectedOption.value : "" }));
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setEditId(null);
        setFormData(activeTab === "provinces" ? initialProvinceForm : { ...initialDistrictForm, provinceId: sortedProvinces[0]?._id || "" });
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

    const handleSubmit = () => {
        if (!formData.name || !formData.code || (activeTab === "districts" && !formData.provinceId)) {
            return setToast({ show: true, message: "Vui lòng nhập đủ thông tin bắt buộc!", type: "error" });
        }

        if (activeTab === "provinces") {
            saveProvinceMutation.mutate({ id: editId, payload: formData });
        } else {
            saveDistrictMutation.mutate({ id: editId, payload: formData });
        }
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === "province") deleteProvinceMutation.mutate(itemToDelete.id);
        else deleteDistrictMutation.mutate(itemToDelete.id);
    };

    // ==========================================
    // LỌC & PHÂN TRANG
    // ==========================================
    const currentList = activeTab === "provinces" ? provinces : districts;

    const allFilteredData = currentList.filter((item) => {
        const normalizedSearch = removeVietnameseTones(searchTerm);
        const name = removeVietnameseTones(item.name || "");
        const code = removeVietnameseTones(item.code || "");
        const matchSearch = name.includes(normalizedSearch) || code.includes(normalizedSearch);

        if (activeTab === "provinces") {
            return matchSearch && (filterRegion === "ALL" || item.region === filterRegion);
        } else {
            return matchSearch && (filterProvinceForDistrict === "ALL" || item.provinceId?._id === filterProvinceForDistrict);
        }
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = allFilteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(allFilteredData.length / itemsPerPage);

    // ==========================================
    // CẤU HÌNH REACT-SELECT
    // ==========================================
    const filterRegionOptions = REGION_OPTIONS;
    const filterProvinceOptions = [{ value: "ALL", label: "Tất cả Tỉnh/Thành" }, ...sortedProvinces.map((p) => ({ value: p._id, label: p.name }))];

    const formRegionOptions = REGION_OPTIONS.filter((o) => o.value !== "ALL");
    const formProvinceOptions = sortedProvinces.map((p) => ({ value: p._id, label: p.name }));

    const customSelectStyles = {
        control: (provided, state) => ({ ...provided, minHeight: "38px", borderRadius: "6px", fontSize: "14px", borderColor: state.isFocused ? "var(--primary-color)" : "#d1d5db", boxShadow: "none", "&:hover": { borderColor: "var(--primary-color)" }, backgroundColor: "#fff" }),
        input: (provided) => ({ ...provided, margin: 0, padding: 0, fontSize: "14px" }),
        option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? "var(--base-primary)" : state.isFocused ? "#eef2ff" : "white", color: state.isSelected ? "var(--primary-color)" : "#374151", cursor: "pointer", margin: "4px", borderRadius: "6px", fontSize: "14px", width: "96%" }),
        menu: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({ ...provided, overflowX: "hidden" }),
    };

    if (isLoading) return <div className="z-location-state">Đang tải dữ liệu...</div>;
    if (errorMsg) return <div className="z-location-state z-location-error">{errorMsg}</div>;

    const getRegionLabel = (region) => REGION_OPTIONS.find((r) => r.value === region)?.label || region;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý khu vực" }]} title="Quản lý khu vực" description="Quản lý danh sách Tỉnh/Thành phố và Phường/Xã trên hệ thống." />

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

                    <div style={{ minWidth: "250px", zIndex: 10 }}>{activeTab === "provinces" ? <Select options={filterRegionOptions} value={filterRegionOptions.find((opt) => opt.value === filterRegion)} onChange={(selected) => setFilterRegion(selected.value)} styles={customSelectStyles} isSearchable={false} placeholder="Chọn Vùng miền..." /> : <Select options={filterProvinceOptions} value={filterProvinceOptions.find((opt) => opt.value === filterProvinceForDistrict)} onChange={(selected) => setFilterProvinceForDistrict(selected.value)} styles={customSelectStyles} isSearchable={true} placeholder="Tìm Tỉnh/Thành phố..." noOptionsMessage={() => "Không tìm thấy kết quả"} />}</div>

                    <AddButton style={{ marginLeft: "auto" }} onClick={openAddModal}>
                        Thêm mới {activeTab === "provinces" ? "Tỉnh" : "Phường"}
                    </AddButton>
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
                        <div style={{ marginTop: "-15px", paddingBottom: "6px", borderBottom: "1px dashed #e5e7eb" }}>
                            <span style={{ color: "red", fontWeight: "bold", fontSize: "16px" }}>*</span>
                            <span style={{ color: "#6b7280", fontSize: "12px", fontStyle: "italic", marginLeft: "4px" }}>: Các trường có dấu sao là bắt buộc. Vui lòng nhập đầy đủ thông tin.</span>
                        </div>
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
                                <Select name="region" options={formRegionOptions} value={formRegionOptions.find((opt) => opt.value === formData.region) || null} onChange={handleReactSelectChange} isDisabled={isSubmitting} styles={customSelectStyles} placeholder="Chọn vùng miền" isSearchable={false} />
                            </div>
                        ) : (
                            <div className="z-location-form-group">
                                <label>
                                    Thuộc Tỉnh/Thành phố <span className="z-location-required">*</span>
                                </label>
                                <Select name="provinceId" options={formProvinceOptions} value={formProvinceOptions.find((opt) => opt.value === formData.provinceId) || null} onChange={handleReactSelectChange} isDisabled={isSubmitting} styles={customSelectStyles} placeholder="Gõ để tìm Tỉnh/Thành phố..." isSearchable={true} noOptionsMessage={() => "Không tìm thấy Tỉnh/Thành nào"} />
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
