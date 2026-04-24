import React, { useEffect, useState, useRef } from "react";
import { companyPageApi } from "../../api/axiosApi"; 
import Modal from "../../ui/Modal/Modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button, AddButton, EditButton, DeleteButton } from "../../ui/Button/Button";
import { Select } from "../../ui/Select/Select";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import "./Companies.css"; // ĐÃ ĐỔI SANG IMPORT CSS MỚI

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

const FALLBACK_IMG = "https://via.placeholder.com/300x150?text=No+Image";

const COMPANY_LABELS = {
    SGTD: "SGTD Edu",
    MEKONG: "Mekong",
    PDCA: "PDCA",
};

const companyOptions = Object.entries(COMPANY_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
}));

const statusOptions = [
    { value: "PUBLISHED", label: "Đang hoạt động" },
    { value: "DRAFT", label: "Đang ẩn" },
];

const Companies = () => {
    const queryClient = useQueryClient();

    // UI States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [activeTab, setActiveTab] = useState("SGTD");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [contentToDelete, setContentToDelete] = useState(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editContentId, setEditContentId] = useState(null);

    const initialForm = {
        title: "",
        description: "",
        companyCode: activeTab,
        displayOrder: 0,
        status: "PUBLISHED",
    };
    const [formData, setFormData] = useState(initialForm);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // FETCH DATA
    const {
        data: pageContents = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["company-contents"],
        queryFn: async () => {
            const res = await companyPageApi.getAllContents({ limit: 200 });
            if (res && res.success) return res.data.contents || [];
            throw new Error("Không thể tải danh sách nội dung công ty.");
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, activeTab]);

    // MUTATIONS
    const saveContentMutation = useMutation({
        mutationFn: ({ id, submitData }) => (id ? companyPageApi.updateContent(id, submitData) : companyPageApi.createContent(submitData)),
        onSuccess: (res, variables) => {
            const updatedItem = res.data?.content || res.data || res;
            queryClient.setQueryData(["company-contents"], (old) => {
                if (!old) return [];
                if (variables.id) {
                    return old.map((c) => (c._id === variables.id ? { ...c, ...updatedItem } : c));
                }
                return [updatedItem, ...old];
            });
            setToast({ show: true, message: variables.id ? "Cập nhật thành công!" : "Thêm mới thành công!", type: "success" });
            setIsFormModalOpen(false);
        },
        onError: (err) => {
            const serverMessage = err.response?.data?.message;
            const isSizeError = err.response?.status === 413 || (serverMessage && serverMessage.toLowerCase().includes("large"));
            setToast({ show: true, message: isSizeError ? "Kích thước ảnh quá lớn!" : serverMessage || "Có lỗi xảy ra!", type: "error" });
        },
    });

    const deleteContentMutation = useMutation({
        mutationFn: (id) => companyPageApi.deleteContent(id),
        onSuccess: (res, deletedId) => {
            queryClient.setQueryData(["company-contents"], (old) => old.filter((c) => c._id !== deletedId));
            setToast({ show: true, message: "Xóa nội dung thành công!", type: "success" });
            setIsDeleteModalOpen(false);
            setContentToDelete(null);
        },
        onError: (err) => setToast({ show: true, message: err.response?.data?.message || "Không thể xóa lúc này", type: "error" }),
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, submitData }) => companyPageApi.updateContent(id, submitData),
        onMutate: async ({ id, newStatus }) => {
            await queryClient.cancelQueries({ queryKey: ["company-contents"] });
            const previousContents = queryClient.getQueryData(["company-contents"]);
            queryClient.setQueryData(["company-contents"], (old) => old.map((c) => (c._id === id ? { ...c, status: newStatus } : c)));
            return { previousContents };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(["company-contents"], context.previousContents);
            setToast({ show: true, message: "Lỗi cập nhật trạng thái", type: "error" });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["company-contents"] }),
    });

    const isSubmitting = saveContentMutation.isPending || deleteContentMutation.isPending || toggleStatusMutation.isPending;

    // HANDLERS
    const openAddModal = () => {
        setIsEditMode(false);
        setEditContentId(null);
        setFormData({ ...initialForm, companyCode: activeTab });
        setImageFile(null);
        setImagePreview(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (e, item) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditContentId(item._id);
        setFormData({
            title: item.title || "",
            description: item.description || "",
            companyCode: item.companyCode || "SGTD",
            displayOrder: item.displayOrder || 0,
            status: item.status || "DRAFT",
        });
        setImageFile(null);
        setImagePreview(item.imageUrl || null);
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (e, id, title) => {
        e.stopPropagation();
        setContentToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
        e.target.value = null;
    };

    const handleSaveContent = () => {
        if (!formData.title) return setToast({ show: true, message: "Vui lòng nhập tiêu đề!", type: "error" });

        const submitData = new FormData();
        submitData.append("title", formData.title);
        submitData.append("description", formData.description);
        submitData.append("companyCode", formData.companyCode);
        submitData.append("displayOrder", formData.displayOrder);
        submitData.append("status", formData.status);

        if (imageFile) submitData.append("image", imageFile);

        saveContentMutation.mutate({ id: isEditMode ? editContentId : null, submitData });
    };

    // LỌC & RENDER UI
    const filteredContents = pageContents
        .filter((item) => {
            const matchesTab = item.companyCode === activeTab;
            const matchesSearch = removeVietnameseTones(item.title).includes(removeVietnameseTones(searchTerm));
            let matchesStatus = true;
            if (filterStatus === "published") matchesStatus = item.status === "PUBLISHED";
            if (filterStatus === "draft") matchesStatus = item.status === "DRAFT";
            return matchesTab && matchesSearch && matchesStatus;
        })
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const totalPages = Math.max(1, Math.ceil(filteredContents.length / itemsPerPage));
    const validCurrentPage = Math.min(currentPage, totalPages);
    const indexOfLastItem = validCurrentPage * itemsPerPage;
    const currentItems = filteredContents.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

    if (isLoading) return <div className="z-company-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-company-state z-company-error">{error.message}</div>;

    return (
        <>
            <PageHeader 
                breadcrumbs={[{ label: "Quản lý Trang Công ty" }]} 
                title="Quản lý Các Công ty thành viên" 
                description="Quản lý nội dung, hình ảnh và hiển thị cho các trang SGTD Edu, Mekong, và PDCA." 
            />
            
            <div className="z-company-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                {/* TAB BAR CHUYỂN ĐỔI CÔNG TY */}
                <div className="z-company-tabs">
                    {Object.entries(COMPANY_LABELS).map(([key, label]) => (
                        <button key={key} className={`z-company-tab-item ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="z-company-tools" style={{ marginTop: "16px" }}>
                    <div className="z-company-search">
                        <input type="text" placeholder={`Tìm kiếm nội dung trong ${COMPANY_LABELS[activeTab]}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="z-company-filter">
                        <button className="z-company-btn-filter" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                            <span>{filterStatus === "published" ? "Đang hoạt động" : filterStatus === "draft" ? "Đang ẩn" : "Tất cả trạng thái"}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showFilterDropdown && (
                            <div className="z-company-dropdown-menu">
                                <div className={`z-company-dropdown-item ${filterStatus === "all" ? "active" : ""}`} onClick={() => { setFilterStatus("all"); setShowFilterDropdown(false); }}>Tất cả trạng thái</div>
                                <div className={`z-company-dropdown-item ${filterStatus === "published" ? "active" : ""}`} onClick={() => { setFilterStatus("published"); setShowFilterDropdown(false); }}>Đang hoạt động</div>
                                <div className={`z-company-dropdown-item ${filterStatus === "draft" ? "active" : ""}`} onClick={() => { setFilterStatus("draft"); setShowFilterDropdown(false); }}>Đang ẩn</div>
                            </div>
                        )}
                    </div>

                    <AddButton style={{ marginLeft: "auto" }} onClick={openAddModal}>Thêm nội dung</AddButton>
                </div>

                {/* TABLE DỮ LIỆU */}
                <div className="z-company-table-wrapper">
                    <table className="z-company-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Hình ảnh</th>
                                <th>Tiêu đề Nội dung</th>
                                <th>Trang Công ty</th>
                                <th>Thứ tự</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((item, index) => (
                                <tr key={item._id}>
                                    <td>{indexOfLastItem - itemsPerPage + index + 1}</td>
                                    <td>
                                        <img src={item.imageUrl || FALLBACK_IMG} alt="preview" className="z-company-img-preview" />
                                    </td>
                                    <td><div className="z-company-text-clamp">{item.title}</div></td>
                                    <td><span className="z-company-badge-gray">{COMPANY_LABELS[item.companyCode]}</span></td>
                                    <td><span className="z-company-badge-blue">{item.displayOrder || 0}</span></td>
                                    <td>
                                        <span className={`z-company-status-badge ${item.status === "PUBLISHED" ? "published" : "draft"}`}>
                                            {item.status === "PUBLISHED" ? "Đang hoạt động" : "Đang ẩn"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="z-company-actions">
                                            <div className="z-company-dropdown-actions">
                                                <button className="z-company-more-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>
                                                <div className="z-company-action-menu">
                                                    <EditButton onClick={(e) => openEditModal(e, item)} />
                                                    <DeleteButton onClick={(e) => handleDeleteClick(e, item._id, item.title)} />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredContents.length === 0 && <div className="z-company-state">Chưa có nội dung nào cho {COMPANY_LABELS[activeTab]}.</div>}
                </div>

                {/* PHÂN TRANG */}
                {totalPages > 1 && (
                    <div className="z-company-pagination">
                        <button className="z-company-pagination-btn" disabled={validCurrentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Trước</button>
                        <div className="z-company-pagination-numbers">
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i + 1} className={`z-company-pagination-number ${validCurrentPage === i + 1 ? "active" : ""}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                            ))}
                        </div>
                        <button className="z-company-pagination-btn" disabled={validCurrentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Sau</button>
                    </div>
                )}

                {/* MODAL FORM THÊM/SỬA */}
                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? `Cập nhật nội dung ${COMPANY_LABELS[formData.companyCode]}` : `Thêm nội dung cho ${COMPANY_LABELS[activeTab]}`} size="lg" onSave={handleSaveContent} saveText={saveContentMutation.isPending ? "Đang xử lý..." : "Lưu thay đổi"}>
                    <div className="z-company-form">
                        <div className="z-company-form-group">
                            <label>Tiêu đề <span className="z-company-required">*</span></label>
                            <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Nhập tiêu đề..." disabled={isSubmitting} className="z-company-input" />
                        </div>
                        
                        <div className="z-company-form-grid">
                            <div className="z-company-form-group">
                                <label>Thuộc trang Công ty</label>
                                <Select name="companyCode" options={companyOptions} value={formData.companyCode} onChange={handleInputChange} disabled={isSubmitting} />
                            </div>
                            <div className="z-company-form-group">
                                <label>Thứ tự hiển thị</label>
                                <input type="number" name="displayOrder" value={formData.displayOrder} onChange={handleInputChange} min="0" disabled={isSubmitting} className="z-company-input" />
                            </div>
                        </div>

                        <div className="z-company-form-group">
                            <label>Trạng thái</label>
                            <Select name="status" options={statusOptions} value={formData.status} onChange={handleInputChange} disabled={isSubmitting} />
                        </div>

                        <div className="z-company-form-group">
                            <label>Nội dung chi tiết (Description)</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Nhập nội dung/đoạn văn..." rows="4" disabled={isSubmitting} className="z-company-textarea" />
                        </div>

                        <div className="z-company-form-group">
                            <label>Hình ảnh đính kèm</label>
                            <div className="z-company-upload-wrapper">
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />
                                {imagePreview ? (
                                    <div className="z-company-image-preview-box">
                                        <img src={imagePreview} alt="Preview" />
                                        <button type="button" className="z-company-remove-img-btn" onClick={() => { setImageFile(null); setImagePreview(null); }}>×</button>
                                    </div>
                                ) : (
                                    <div className="z-company-image-upload-btn" onClick={() => fileInputRef.current.click()}>
                                        <span>+ Tải ảnh lên</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* MODAL XÓA */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={() => deleteContentMutation.mutate(contentToDelete?.id)} saveText={deleteContentMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-company-delete-content">
                        <h3>Xác nhận xóa</h3>
                        <p>Bạn có chắc chắn muốn xóa nội dung <br /><strong>"{contentToDelete?.title}"</strong>?</p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Companies;