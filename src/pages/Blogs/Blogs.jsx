import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { postApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import { Button, AddButton, EditButton, DeleteButton } from "../../ui/Button/Button";
import { Select } from "../../ui/Select/Select";
import PageHeader from "../../ui/PageHeader/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // 🟢 THÊM IMPORT

import "./Blogs.css";
import ToastMessage from "../../ui/ToastMessage/ToastMessage";

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

const FALLBACK_IMG = "https://via.placeholder.com/150?text=No+Image";

const statusOptions = [
    { value: "ACTIVE", label: "Đang hoạt động" },
    { value: "INACTIVE", label: "Đang ẩn" },
];

const serviceOptions = [
    { value: "Nha khoa", label: "Nha khoa" },
    { value: "THẨM MỸ", label: "Thẩm mỹ" },
    { value: "SPA", label: "Spa" },
    { value: "DA LIỄU", label: "Da liễu" },
];

const postTypeOptions = [
    { value: "Bài SEO", label: "Bài SEO" },
    { value: "Tin tức", label: "Tin tức" },
    { value: "Khuyến mãi", label: "Khuyến mãi" },
];

const translateError = (errorMsg) => {
    if (!errorMsg) return "Có lỗi xảy ra, vui lòng thử lại!";

    const errorTranslations = {
        "Title, external URL and service type are required!": "Vui lòng nhập đầy đủ tiêu đề, đường dẫn (URL) và loại dịch vụ!",
        "This URL already exists!": "Đường dẫn (URL) này đã tồn tại trên hệ thống, vui lòng chọn đường dẫn khác!",
        "Post not found!": "Không tìm thấy bài viết này trên hệ thống!",
        "Posts array is required!": "Danh sách bài viết không hợp lệ!",
        "Internal Server Error": "Lỗi máy chủ nội bộ, vui lòng thử lại sau!",
    };

    return errorTranslations[errorMsg] || errorMsg;
};

const Blogs = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient(); // 🟢 Dùng để quản lý Cache

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // State Toast & Modals
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editPostId, setEditPostId] = useState(null);

    const initialForm = {
        title: "",
        externalUrl: "",
        description: "",
        serviceType: "Nha khoa",
        postType: "Bài SEO",
        status: "ACTIVE",
        isFeatured: false,
        isPinned: false,
    };

    const [formData, setFormData] = useState(initialForm);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // ==========================================
    // 1. USEQUERY: LẤY DỮ LIỆU BÀI VIẾT (CACHE 5 PHÚT)
    // ==========================================
    const {
        data: posts = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["posts"],
        queryFn: async () => {
            const res = await postApi.getAllPosts({ limit: 100 });
            if (res && res.success) return res.data.posts || [];
            throw new Error("Không thể tải danh sách bài viết.");
        },
        staleTime: 5 * 60 * 1000, // Cache trong 5 phút
    });

    // ==========================================
    // 2. USEMUTATION: THÊM / SỬA BÀI VIẾT
    // ==========================================
    const savePostMutation = useMutation({
        mutationFn: ({ id, submitData }) => (id ? postApi.updatePost(id, submitData) : postApi.createPost(submitData)),
        onSuccess: (res, variables) => {
            const updatedPost = res.data?.post || res.data || res;

            // Ép Cache UI cập nhật lập tức
            queryClient.setQueryData(["posts"], (old) => {
                if (!old) return [];
                if (variables.id) {
                    return old.map((p) => (p._id === variables.id ? { ...p, ...updatedPost } : p));
                }
                return [updatedPost, ...old];
            });

            setToast({ show: true, message: variables.id ? "Cập nhật bài viết thành công!" : "Thêm mới bài viết thành công!", type: "success" });
            setIsFormModalOpen(false);
        },
        onError: (err) => {
            const backendMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            setToast({ show: true, message: translateError(backendMsg), type: "error" });
        },
    });

    // ==========================================
    // 3. USEMUTATION: ĐỔI TRẠNG THÁI (OPTIMISTIC UPDATE)
    // ==========================================
    const toggleStatusMutation = useMutation({
        mutationFn: (id) => postApi.toggleStatus(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ["posts"] });
            const previousPosts = queryClient.getQueryData(["posts"]);

            // Đổi UI ngay lập tức trước khi gọi API
            queryClient.setQueryData(["posts"], (old) => old.map((p) => (p._id === id ? { ...p, status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : p)));
            return { previousPosts };
        },
        onSuccess: () => {
            setToast({ show: true, message: "Cập nhật trạng thái thành công", type: "success" });
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(["posts"], context.previousPosts); // Phục hồi nếu API lỗi
            const backendMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            setToast({ show: true, message: translateError(backendMsg), type: "error" });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
    });

    // ==========================================
    // 4. USEMUTATION: XÓA BÀI VIẾT
    // ==========================================
    const deletePostMutation = useMutation({
        mutationFn: (id) => postApi.deletePost(id),
        onSuccess: (res, deletedId) => {
            queryClient.setQueryData(["posts"], (old) => old.filter((p) => p._id !== deletedId));
            setToast({ show: true, message: "Xóa bài viết thành công", type: "success" });
            setIsDeleteModalOpen(false);
            setPostToDelete(null);
        },
        onError: (err) => {
            const backendMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            setToast({ show: true, message: translateError(backendMsg), type: "error" });
        },
    });

    const isSubmitting = savePostMutation.isPending || toggleStatusMutation.isPending || deletePostMutation.isPending;

    // ==========================================
    // HANDLERS
    // ==========================================
    const handleSavePost = () => {
        if (!formData.title || !formData.externalUrl) {
            return setToast({ show: true, message: "Vui lòng nhập đủ Tiêu đề và Link URL!", type: "error" });
        }

        const submitData = new FormData();
        Object.keys(formData).forEach((key) => submitData.append(key, formData[key]));
        if (imageFile) submitData.append("image", imageFile);
        if (!isEditMode) submitData.append("contentType", "Post"); // Backend req cho Thêm mới

        savePostMutation.mutate({ id: isEditMode ? editPostId : null, submitData });
    };

    const confirmDelete = () => {
        if (postToDelete) deletePostMutation.mutate(postToDelete.id);
    };

    const handleToggleStatus = (e, id) => {
        e.stopPropagation();
        toggleStatusMutation.mutate(id);
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setEditPostId(null);
        setFormData(initialForm);
        setImageFile(null);
        setImagePreview(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (e, post) => {
        e.stopPropagation();
        setIsEditMode(true);
        setEditPostId(post._id);
        setFormData({
            title: post.title || "",
            externalUrl: post.externalUrl || "",
            description: post.description || "",
            serviceType: post.serviceType || "Nha khoa",
            postType: post.postType || "Bài SEO",
            status: post.status || "ACTIVE",
            isFeatured: post.isFeatured || false,
            isPinned: post.isPinned || false,
        });
        setImageFile(null);
        setImagePreview(post.thumbnailUrl || null);
        setIsFormModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
        e.target.value = null;
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    // Lọc dữ liệu hiển thị (Lọc trên Cache có sẵn, không gọi API)
    const filteredPosts = posts.filter((post) => {
        const matchesSearch = removeVietnameseTones(post.title).includes(removeVietnameseTones(searchTerm));
        const matchesStatus = filterStatus === "all" || post.status === filterStatus.toUpperCase();
        return matchesSearch && matchesStatus;
    });

    if (isLoading) return <div className="z-blog-state">Đang tải dữ liệu...</div>;
    if (error) return <div className="z-blog-state z-blog-error">Lỗi: {error.message}</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý bài viết tin tức" }]} title="Quản lý bài viết tin tức" description="Quản lý các bài viết tin tức theo loại hình SEO, thiết lập đường dẫn nội dung tin tức." />

            <div className="z-blog-container">
                <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

                <div className="z-blog-header">
                    <h1 className="z-blog-title">Danh sách bài viết</h1>
                </div>

                <div className="z-blog-tools">
                    <div className="z-blog-search">
                        <input type="text" placeholder="Tìm tiêu đề bài viết..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="z-blog-filter">
                        <button className="z-blog-btn-filter" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                            <span>{filterStatus === "all" ? "Tất cả trạng thái" : filterStatus === "active" ? "Đang hoạt động" : "Đang ẩn"}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151">
                                <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" />
                            </svg>
                        </button>
                        {showFilterDropdown && (
                            <div className="z-blog-dropdown-menu">
                                <div
                                    className={`z-blog-dropdown-item ${filterStatus === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("all");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Tất cả trạng thái
                                </div>
                                <div
                                    className={`z-blog-dropdown-item ${filterStatus === "active" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("active");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang hoạt động
                                </div>
                                <div
                                    className={`z-blog-dropdown-item ${filterStatus === "inactive" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("inactive");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang ẩn
                                </div>
                            </div>
                        )}
                    </div>
                    <AddButton style={{ marginLeft: "auto" }} onClick={openAddModal}>
                        Thêm bài viết
                    </AddButton>
                </div>

                <div className="z-blog-table-wrapper">
                    <table className="z-blog-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Thumbnail</th>
                                <th>Tiêu đề bài viết</th>
                                <th>Loại</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPosts.map((post, index) => (
                                <tr key={post._id} className="z-blog-clickable-row" onClick={(e) => openEditModal(e, post)}>
                                    <td>{index + 1}</td>
                                    <td>
                                        {/* 🟢 CACHE-BUSTING: Tránh hiện ảnh cũ sau khi cập nhật */}
                                        <img src={post.thumbnailUrl ? `${post.thumbnailUrl}?t=${new Date(post.updatedAt || Date.now()).getTime()}` : FALLBACK_IMG} alt="" className="z-blog-img-preview" />
                                    </td>
                                    <td>
                                        <div className="z-blog-text-clamp">{post.title}</div>
                                        <div className="z-blog-subtext">{post.externalUrl}</div>
                                    </td>
                                    <td>
                                        <span className="z-blog-badge-gray">{post.postType}</span>
                                        {post.isFeatured && <div className="z-blog-featured-tag">★ Nổi bật</div>}
                                    </td>
                                    <td>
                                        <span className={`z-blog-status-badge ${post.status === "ACTIVE" ? "active" : "inactive"}`}>{post.status === "ACTIVE" ? "Đang hoạt động" : "Đang ẩn"}</span>
                                    </td>
                                    <td>
                                        <div className="z-blog-actions-cell" onClick={(e) => e.stopPropagation()}>
                                            <div className="z-blog-kebab-menu">
                                                <button className="z-blog-kebab-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368">
                                                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                                                    </svg>
                                                </button>
                                                <div className="z-blog-action-dropdown">
                                                    {/* <Button variant="outline" onClick={(e) => handleToggleStatus(e, post._id)} disabled={toggleStatusMutation.isPending}>{post.status === "ACTIVE" ? "Ẩn bài" : "Hiện bài"}</Button> */}
                                                    <EditButton onClick={(e) => openEditModal(e, post)} />
                                                    <DeleteButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPostToDelete({ id: post._id, title: post.title });
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPosts.length === 0 && <div className="z-blog-state">Không tìm thấy bài viết nào phù hợp.</div>}
                </div>

                {/* MODAL FORM */}
                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật bài viết" : "Thêm bài viết mới"} size="lg" onSave={handleSavePost} saveText={savePostMutation.isPending ? "Đang xử lý..." : "Lưu thay đổi"}>
                    <div className="z-blog-form">
                        <div style={{ marginBottom: "10px", marginTop: "-15px", paddingBottom: "6px", borderBottom: "1px dashed #e5e7eb" }}>
                            <span style={{ color: "red", fontWeight: "bold", fontSize: "16px" }}>*</span>
                            <span style={{ color: "#6b7280", fontSize: "12px", fontStyle: "italic", marginLeft: "4px" }}>: Các trường có dấu sao là bắt buộc. Vui lòng nhập đầy đủ thông tin.</span>
                        </div>
                        <div className="z-blog-form-grid">
                            <div className="z-blog-form-column">
                                <div className="z-blog-form-group">
                                    <label>
                                        Tiêu đề bài viết <span className="z-blog-required">*</span>
                                    </label>
                                    <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="z-blog-input" placeholder="Nhập tiêu đề..." disabled={isSubmitting} />
                                </div>
                                <div className="z-blog-form-group">
                                    <label>
                                        Đường dẫn (URL) <span className="z-blog-required">*</span>
                                    </label>
                                    <input type="text" name="externalUrl" value={formData.externalUrl} onChange={handleInputChange} className="z-blog-input" placeholder="https://..." disabled={isSubmitting} />
                                </div>
                                <div className="z-blog-form-group">
                                    <label>Mô tả SEO</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="z-blog-textarea" rows="4" placeholder="Nhập mô tả..." disabled={isSubmitting} />
                                </div>
                            </div>
                            <div className="z-blog-form-column">
                                <div className="z-blog-form-group">
                                    <label>Loại bài</label>
                                    <Select name="postType" options={postTypeOptions} value={formData.postType} onChange={handleInputChange} disabled={isSubmitting} />
                                </div>
                                <div className="z-blog-form-group">
                                    <label>Trạng thái</label>
                                    <Select name="status" options={statusOptions} value={formData.status} onChange={handleInputChange} disabled={isSubmitting} />
                                </div>
                                <div className="z-blog-checkbox-group">
                                    <label>
                                        <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleInputChange} disabled={isSubmitting} /> Bài nổi bật
                                    </label>
                                    <label>
                                        <input type="checkbox" name="isPinned" checked={formData.isPinned} onChange={handleInputChange} disabled={isSubmitting} /> Ghim đầu
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="z-blog-form-group">
                            <label>Hình ảnh đại diện</label>
                            <div className="z-blog-upload-wrapper">
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />
                                {imagePreview ? (
                                    <div className="z-blog-image-preview-box">
                                        <img src={imagePreview} alt="Preview" />
                                        <button type="button" className="z-blog-remove-img-btn" onClick={removeImage}>
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <div className="z-blog-image-upload-btn" onClick={() => fileInputRef.current.click()}>
                                        <span>+ Tải ảnh lên</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* MODAL DELETE */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={confirmDelete} saveText={deletePostMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}>
                    <div className="z-blog-delete-confirm">
                        <p>Bạn có chắc chắn muốn xóa bài viết:</p>
                        <strong>{postToDelete?.title}</strong>
                        <p className="z-blog-warning-text">Hành động này không thể hoàn tác.</p>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Blogs;
