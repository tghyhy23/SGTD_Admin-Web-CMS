import React, { useEffect, useState, useRef } from "react";
import { companyPageApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button, AddButton, EditButton, DeleteButton } from "../../ui/Button/Button";
import { Select } from "../../ui/Select/Select";
import PageHeader from "../../ui/PageHeader/PageHeader";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";
import "./Companies.css";

// IMPORT THƯ VIỆN REACT QUILL & CSS
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

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

// HÀM MỚI: Dùng để bóc tách thẻ HTML lấy chữ thuần túy hiển thị ra Bảng
const stripHtml = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
};

const COMPANY_LABELS = {
    SGTD_EDU: "SGTD Edu",
    MEKONG: "Mekong",
    PDCA: "PDCA",
};

const Companies = () => {
    const queryClient = useQueryClient();

    // UI States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("SGTD_EDU");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Modals States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [contentToDelete, setContentToDelete] = useState(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editSectionId, setEditSectionId] = useState(null);

    const initialForm = {
        title: "",
        smallTitle: "",
        content: "",
        boldText: "",
        imagePosition: "RIGHT",
        order: 0,
    };
    const [formData, setFormData] = useState(initialForm);

    // ==========================================
    // STATE QUẢN LÝ HÌNH ẢNH (HỖ TRỢ MULTI-IMAGE)
    // ==========================================
    const [existingImages, setExistingImages] = useState([]);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const fileInputRef = useRef(null);

    // ==========================================
    // QUERIES: FETCH PAGE DETAIL & SECTIONS
    // ==========================================
    const {
        data: pageDetail,
        isLoading,
        isFetching,
        error,
    } = useQuery({
        queryKey: ["company-page", activeTab],
        queryFn: async () => {
            try {
                const res = await companyPageApi.getPageDetail(activeTab);
                return res.data?.page || null;
            } catch (err) {
                if (err.response?.status === 404) return null;
                throw new Error("Không thể tải dữ liệu trang công ty.");
            }
        },
        staleTime: 5 * 60 * 1000,
        keepPreviousData: true,
    });

    const sections = pageDetail?.sections || [];

    useEffect(() => {
        Object.keys(COMPANY_LABELS).forEach((key) => {
            queryClient.prefetchQuery({
                queryKey: ["company-page", key],
                queryFn: async () => {
                    try {
                        const res = await companyPageApi.getPageDetail(key);
                        return res.data?.page || null;
                    } catch {
                        return null;
                    }
                },
                staleTime: 5 * 60 * 1000,
            });
        });
    }, [queryClient]);

    // ==========================================
    // MUTATIONS
    // ==========================================
    const initPageMutation = useMutation({
        mutationFn: () => {
            const fd = new FormData();
            fd.append("companyKey", activeTab);
            fd.append("companyName", COMPANY_LABELS[activeTab]);
            fd.append("heroTitle", `Trang chủ ${COMPANY_LABELS[activeTab]}`);
            return companyPageApi.upsertPage(fd);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["company-page", activeTab] });
            setToast({ show: true, message: "Khởi tạo trang thành công!", type: "success" });
        },
        onError: () => setToast({ show: true, message: "Lỗi khi khởi tạo trang", type: "error" }),
    });

    const togglePublishMutation = useMutation({
        mutationFn: () => companyPageApi.togglePublish(activeTab),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["company-page", activeTab] });
            setToast({ show: true, message: "Cập nhật trạng thái hiển thị thành công!", type: "success" });
        },
        onError: () => setToast({ show: true, message: "Lỗi cập nhật trạng thái", type: "error" }),
    });

    const saveSectionMutation = useMutation({
        mutationFn: ({ id, submitData }) => (id ? companyPageApi.updateSection(activeTab, id, submitData) : companyPageApi.addSection(activeTab, submitData)),
        onSuccess: (res, variables) => {
            queryClient.invalidateQueries({ queryKey: ["company-page", activeTab] });
            setToast({ show: true, message: variables.id ? "Cập nhật đoạn văn thành công!" : "Thêm mới thành công!", type: "success" });
            setIsFormModalOpen(false);
        },
        onError: (err) => {
            const serverMessage = err.response?.data?.error || err.response?.data?.message;
            setToast({ show: true, message: serverMessage || "Có lỗi xảy ra!", type: "error" });
        },
    });

    const deleteSectionMutation = useMutation({
        mutationFn: (id) => companyPageApi.deleteSection(activeTab, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["company-page", activeTab] });
            setToast({ show: true, message: "Xóa đoạn văn thành công!", type: "success" });
            setIsDeleteModalOpen(false);
            setContentToDelete(null);
        },
        onError: (err) => setToast({ show: true, message: err.response?.data?.error || "Không thể xóa lúc này", type: "error" }),
    });

    const deleteImageMutation = useMutation({
        mutationFn: (imageId) => companyPageApi.deleteSectionImage(activeTab, editSectionId, imageId),
        onSuccess: (_, imageId) => {
            setExistingImages((prev) => prev.filter((img) => img._id !== imageId));
            queryClient.invalidateQueries({ queryKey: ["company-page", activeTab] });
            setToast({ show: true, message: "Đã xóa ảnh cũ thành công!", type: "success" });
        },
        onError: () => setToast({ show: true, message: "Lỗi không thể xóa ảnh này!", type: "error" }),
    });

    const isSubmitting = saveSectionMutation.isPending || deleteSectionMutation.isPending || initPageMutation.isPending || togglePublishMutation.isPending;

    // ==========================================
    // HANDLERS
    // ==========================================
    const openAddModal = () => {
        setIsEditMode(false);
        setEditSectionId(null);
        const nextOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order)) + 1 : 0;
        setFormData({ ...initialForm, order: nextOrder });

        setExistingImages([]);
        setNewImageFiles([]);

        setIsFormModalOpen(true);
    };

    const openEditModal = (e, item) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditSectionId(item._id);
        setFormData({
            title: item.title || "",
            smallTitle: item.smallTitle || "",
            content: item.content || "",
            boldText: item.boldText || "",
            imagePosition: item.imagePosition || "RIGHT",
            order: item.order || 0,
        });

        setExistingImages(item.images || []);
        setNewImageFiles([]);

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
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const totalImages = existingImages.length + newImageFiles.length + files.length;
        if (totalImages > 10) {
            setToast({ show: true, message: "Một đoạn văn chỉ được tải tối đa 10 ảnh!", type: "error" });
            return;
        }

        setNewImageFiles((prev) => [...prev, ...files]);
        e.target.value = null;
    };

    const handleRemoveNewFile = (index) => {
        setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveContent = () => {
        // Tui đã tắt check Require để bạn có thể lưu bài không cần Tiêu đề/Nội dung
        // if (!formData.content || formData.content === "<p><br></p>") return setToast({ show: true, message: "Vui lòng nhập Nội dung!", type: "error" });

        const submitData = new FormData();
        submitData.append("title", formData.title || "");
        submitData.append("content", formData.content || "");

        submitData.append("smallTitle", formData.smallTitle || "");
        submitData.append("boldText", formData.boldText || "");

        submitData.append("imagePosition", formData.imagePosition);
        submitData.append("order", formData.order);

        newImageFiles.forEach((file) => {
            submitData.append("sectionImages", file);
        });

        saveSectionMutation.mutate({ id: isEditMode ? editSectionId : null, submitData });
    };

    // ==========================================
    // FILTER & RENDER
    // ==========================================
    const filteredSections = sections.filter((item) => removeVietnameseTones(item.title).includes(removeVietnameseTones(searchTerm))).sort((a, b) => (a.order || 0) - (b.order || 0));

    const totalPages = Math.max(1, Math.ceil(filteredSections.length / itemsPerPage));
    const validCurrentPage = Math.min(currentPage, totalPages);
    const indexOfLastItem = validCurrentPage * itemsPerPage;
    const currentItems = filteredSections.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

    const shouldShowInitialLoading = isLoading && !pageDetail;

    if (shouldShowInitialLoading) {
        return <div className="z-company-state">Đang tải dữ liệu...</div>;
    }

    if (error && !pageDetail) {
        return <div className="z-company-state z-company-error">{error.message}</div>;
    }

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý Trang Công ty" }]} title="Quản lý Nội Dung Các Công ty thành viên" description="Quản lý đoạn văn, hình ảnh và nội dung hiển thị cho các trang SGTD Edu, Mekong, và PDCA." />

            <div className="z-company-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-company-tabs">
                    {Object.entries(COMPANY_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            className={`z-company-tab-item ${activeTab === key ? "active" : ""}`}
                            onClick={() => {
                                setActiveTab(key);
                                setCurrentPage(1);
                                setSearchTerm("");
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {!pageDetail ? (
                    <div className="z-company-state z-company-state-init">
                        <p>
                            Trang <strong>{COMPANY_LABELS[activeTab]}</strong> chưa được khởi tạo trong hệ thống.
                        </p>
                        <Button onClick={() => initPageMutation.mutate()} disabled={initPageMutation.isPending}>
                            {initPageMutation.isPending ? "Đang tạo..." : "Khởi tạo trang này ngay"}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="z-company-tools">
                            <div className="z-company-search">
                                <input type="text" placeholder={`Tìm kiếm đoạn văn trong ${COMPANY_LABELS[activeTab]}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>

                            <div className="z-company-tools-right">
                                <AddButton onClick={openAddModal}>Thêm nội dung mới</AddButton>
                            </div>
                        </div>

                        <div className="z-company-table-wrapper">
                            {isFetching && pageDetail && (
                                <div className="z-company-loading-overlay">
                                    <div className="z-company-loading-spinner" />
                                </div>
                            )}
                            <table className="z-company-table">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Hình ảnh</th>
                                        <th>Tiêu đề chính / Tiêu đề phụ</th>
                                        {/* THÊM CỘT NỘI DUNG */}
                                        <th style={{ width: "35%" }}>Nội dung</th>
                                        <th>Thứ tự</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((item, index) => {
                                        // Dùng hàm bóc tách HTML để lấy text thuần
                                        const plainContent = stripHtml(item.content).trim();

                                        return (
                                            <tr key={item._id}>
                                                <td>{indexOfLastItem - itemsPerPage + index + 1}</td>
                                                <td>{item.images?.length > 0 ? <img src={item.images[0].url} alt="preview" className="z-company-img-preview" /> : <div style={{ fontSize: "14px", color: "#9ca3af", fontStyle: "italic" }}>Không có ảnh</div>}</td>
                                                <td>
                                                    {item.title ? <div className="z-company-text-clamp z-company-title-bold">{item.title}</div> : <div style={{ fontSize: "14px", color: "#9ca3af", fontStyle: "italic" }}>Không có tiêu đề</div>}
                                                    {item.smallTitle && <div className="z-company-subtitle">{item.smallTitle}</div>}
                                                </td>

                                                {/* CỘT NỘI DUNG MỚI */}
                                                <td>
                                                    {" "}
                                                    {/* Ép chiều rộng tối đa để bảng không bị phình */}
                                                    {plainContent ? (
                                                        <div
                                                            style={{
                                                                display: "-webkit-box",
                                                                WebkitLineClamp: 2 /* Hiển thị tối đa 2 dòng, dòng 3 sẽ thành dấu ... */,
                                                                WebkitBoxOrient: "vertical",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "normal",
                                                                wordBreak: "break-word",
                                                                lineHeight: "1.5",
                                                                color: "#4b5563",
                                                            }}
                                                        >
                                                            {plainContent}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: "14px", color: "#9ca3af", fontStyle: "italic" }}>Không có nội dung</div>
                                                    )}
                                                </td>

                                                <td>
                                                    <span className="z-company-badge-blue">{item.order || 0}</span>
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
                                                                <DeleteButton onClick={(e) => handleDeleteClick(e, item._id, item.title || "Đoạn văn này")} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredSections.length === 0 && <div className="z-company-state">Chưa có nội dung nào cho trang này.</div>}
                        </div>

                        {totalPages > 1 && (
                            <div className="z-company-pagination">
                                <button className="z-company-pagination-btn" disabled={validCurrentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                                    Trước
                                </button>
                                <div className="z-company-pagination-numbers">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button key={i + 1} className={`z-company-pagination-number ${validCurrentPage === i + 1 ? "active" : ""}`} onClick={() => setCurrentPage(i + 1)}>
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button className="z-company-pagination-btn" disabled={validCurrentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                                    Sau
                                </button>
                            </div>
                        )}
                    </>
                )}

                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? `Cập nhật đoạn văn` : `Thêm đoạn văn mới`} size="lg" onSave={handleSaveContent} saveText={saveSectionMutation.isPending ? "Đang xử lý..." : "Lưu thay đổi"}>
                    <div className="z-company-form">
                        <div className="z-company-form-group">
                            <label>Tiêu đề chính (Tùy chọn)</label>
                            <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Nhập tiêu đề..." disabled={isSubmitting} className="z-company-input" />
                        </div>

                        <div className="z-company-form-group">
                            <label>Tiêu đề phụ (Tùy chọn)</label>
                            <input type="text" name="smallTitle" value={formData.smallTitle} onChange={handleInputChange} placeholder="Nhập tiêu đề phụ..." disabled={isSubmitting} className="z-company-input" />
                        </div>

                        <div className="z-company-form-grid">
                            <div className="z-company-form-group">
                                <label>Thứ tự hiển thị</label>
                                <input type="number" name="order" value={formData.order} onChange={handleInputChange} min="0" disabled={isSubmitting} className="z-company-input" />
                            </div>
                        </div>

                        <div className="z-company-form-group">
                            <label>Nội dung chi tiết đoạn văn (Tùy chọn)</label>
                            <ReactQuill theme="snow" value={formData.content} onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))} readOnly={isSubmitting} placeholder="Nhập nội dung/đoạn văn..." style={{ backgroundColor: "white", marginBottom: "50px", height: "250px" }} />
                        </div>

                        <div className="z-company-form-group">
                            <label>Hình ảnh đính kèm (Tối đa 10 ảnh) - Hiện có: {existingImages.length + newImageFiles.length}/10</label>

                            <div className="z-company-image-gallery">
                                {existingImages.map((img) => (
                                    <div key={img._id} className="z-company-image-container">
                                        <img src={img.url} alt="Server" className="z-company-image-item" />
                                        <button type="button" onClick={() => deleteImageMutation.mutate(img._id)} disabled={deleteImageMutation.isPending} className="z-company-remove-img-btn">
                                            ×
                                        </button>
                                    </div>
                                ))}

                                {newImageFiles.map((file, idx) => (
                                    <div key={idx} className="z-company-image-container-new">
                                        <img src={URL.createObjectURL(file)} alt="New" className="z-company-image-item" />
                                        <button type="button" onClick={() => handleRemoveNewFile(idx)} className="z-company-remove-img-btn">
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="z-company-upload-wrapper">
                                <input type="file" accept="image/*" multiple ref={fileInputRef} className="z-company-file-input-hidden" onChange={handleImageChange} disabled={isSubmitting || existingImages.length + newImageFiles.length >= 10} />

                                {existingImages.length + newImageFiles.length < 10 && (
                                    <div className="z-company-image-upload-btn" onClick={() => fileInputRef.current.click()}>
                                        <span>+ Tải ảnh lên</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={() => deleteSectionMutation.mutate(contentToDelete?.id)} saveText={deleteSectionMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-company-delete-content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <h3>Xác nhận xóa</h3>
                        <p>Bạn có chắc chắn muốn xóa đoạn văn này không?</p>
                        <p className="z-company-delete-warning" style={{color: "var(--error)"}}>
                            Lưu ý: Hành động này sẽ xóa toàn bộ nội dung và hình ảnh của đoạn văn này trên hệ thống.
                        </p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Companies;
