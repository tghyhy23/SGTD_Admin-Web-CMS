import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { postApi } from "../../api/axiosApi";
import Modal from "../../ui/Modal/Modal";
import { Button, AddButton, EditButton, DeleteButton } from "../../ui/Button/Button";
import { Select } from "../../ui/Select/Select";
import PageHeader from "../../ui/PageHeader/PageHeader";
import "./Blogs.css";

const removeVietnameseTones = (str) => {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
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

const Blogs = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editPostId, setEditPostId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const fetchAllPosts = async () => {
        setIsLoading(true);
        try {
            const res = await postApi.getAllPosts({ limit: 100 });
            if (res && res.success) {
                setPosts(res.data.posts || []);
            } else {
                setError("Không thể tải danh sách bài viết.");
            }
        } catch (err) {
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAllPosts(); }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
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

    const handleSavePost = async () => {
        if (!formData.title || !formData.externalUrl) {
            return showToast("Vui lòng nhập đủ Tiêu đề và Link URL!", "error");
        }
        setIsSubmitting(true);
        try {
            const submitData = new FormData();
            Object.keys(formData).forEach((key) => submitData.append(key, formData[key]));
            if (imageFile) submitData.append("image", imageFile);

            let response;
            if (isEditMode) {
                response = await postApi.updatePost(editPostId, submitData);
            } else {
                submitData.append("contentType", "Post");
                response = await postApi.createPost(submitData);
            }

            if (response && response.success) {
                showToast(isEditMode ? "Cập nhật thành công!" : "Thêm mới thành công!");
                
                // CẬP NHẬT STATE TRỰC TIẾP GIỐNG BANNER (KHÔNG GỌI fetchAllPosts)
                if (isEditMode) {
                    setPosts((prev) => prev.map((p) => p._id === editPostId ? { 
                        ...p, 
                        ...formData, 
                        thumbnailUrl: imagePreview || p.thumbnailUrl 
                    } : p));
                } else {
                    const newPost = response.data?.post || response.data || { _id: Date.now().toString(), ...formData, thumbnailUrl: imagePreview };
                    setPosts((prev) => [newPost, ...prev]);
                }
                setIsFormModalOpen(false);
            }
        } catch (error) {
            showToast("Lỗi hệ thống, vui lòng thử lại", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (e, id) => {
        e.stopPropagation();
        const originalPosts = [...posts];
        // Optimistic Update: Cập nhật UI trước
        setPosts((prev) => prev.map((p) => (p._id === id ? { ...p, status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : p)));
        
        try {
            const res = await postApi.toggleStatus(id);
            if (!res || !res.success) {
                setPosts(originalPosts);
                showToast("Lỗi khi thay đổi trạng thái", "error");
            } else {
                showToast("Cập nhật trạng thái thành công");
            }
        } catch (err) {
            setPosts(originalPosts);
            showToast("Lỗi kết nối", "error");
        }
    };

    const confirmDelete = async () => {
        setIsSubmitting(true);
        try {
            const res = await postApi.deletePost(postToDelete.id);
            if (res.success) {
                showToast("Xóa bài viết thành công");
                // CẬP NHẬT STATE TRỰC TIẾP
                setPosts((prev) => prev.filter((p) => p._id !== postToDelete.id));
                setIsDeleteModalOpen(false);
            }
        } catch (err) {
            showToast("Không thể xóa bài viết", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredPosts = posts.filter((post) => {
        const matchesSearch = removeVietnameseTones(post.title).includes(removeVietnameseTones(searchTerm));
        const matchesStatus = filterStatus === "all" || post.status === filterStatus.toUpperCase();
        return matchesSearch && matchesStatus;
    });

    if (isLoading) return <div className="z-blog-state">Đang tải dữ liệu...</div>;

    return (
        <>
            <PageHeader breadcrumbs={[{ label: "Quản lý bài viết Blogs" }]} title="Quản lý bài viết Blogs" description="Quản lý các bài viết tin tức, bài SEO và khuyến mãi." />
            <div className="z-blog-container">
                {toast.show && (
                    <div className={`z-blog-toast ${toast.type}`}>
                        <span>{toast.message}</span>
                        <button onClick={() => setToast({ ...toast, show: false })}>×</button>
                    </div>
                )}
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
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#374151"><path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z" /></svg>
                        </button>
                        {showFilterDropdown && (
                            <div className="z-blog-dropdown-menu">
                                <div className={`z-blog-dropdown-item ${filterStatus === "all" ? "active" : ""}`} onClick={() => { setFilterStatus("all"); setShowFilterDropdown(false) }}>Tất cả trạng thái</div>
                                <div className={`z-blog-dropdown-item ${filterStatus === "active" ? "active" : ""}`} onClick={() => { setFilterStatus("active"); setShowFilterDropdown(false) }}>Đang hoạt động</div>
                                <div className={`z-blog-dropdown-item ${filterStatus === "inactive" ? "active" : ""}`} onClick={() => { setFilterStatus("inactive"); setShowFilterDropdown(false) }}>Đang ẩn</div>
                            </div>
                        )}
                    </div>
                    <AddButton onClick={openAddModal}>Thêm bài viết</AddButton>
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
                                <tr key={post._id} className="z-blog-clickable-row" onClick={() => navigate(`/blog-detail/${post._id}`)}>
                                    <td>{index + 1}</td>
                                    <td><img src={post.thumbnailUrl || FALLBACK_IMG} alt="" className="z-blog-img-preview" /></td>
                                    <td>
                                        <div className="z-blog-text-clamp"><strong>{post.title}</strong></div>
                                        <div className="z-blog-subtext">{post.externalUrl}</div>
                                    </td>
                                    <td>
                                        <span className="z-blog-badge-gray">{post.postType}</span>
                                        {post.isFeatured && <div className="z-blog-featured-tag">★ Nổi bật</div>}
                                    </td>
                                    <td><span className={`z-blog-status-badge ${post.status === "ACTIVE" ? "active" : "inactive"}`}>{post.status === "ACTIVE" ? "Hoạt động" : "Đang ẩn"}</span></td>
                                    <td>
                                        <div className="z-blog-actions-cell" onClick={(e) => e.stopPropagation()}>
                                            <div className="z-blog-kebab-menu">
                                                <button className="z-blog-kebab-btn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" /></svg>
                                                </button>
                                                <div className="z-blog-action-dropdown">
                                                    <Button variant="outline" onClick={(e) => handleToggleStatus(e, post._id)}>{post.status === "ACTIVE" ? "Ẩn bài" : "Hiện bài"}</Button>
                                                    <EditButton onClick={(e) => openEditModal(e, post)} />
                                                    <DeleteButton onClick={(e) => { e.stopPropagation(); setPostToDelete({ id: post._id, title: post.title }); setIsDeleteModalOpen(true); }} />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Modal isOpen={isFormModalOpen} onClose={() => !isSubmitting && setIsFormModalOpen(false)} title={isEditMode ? "Cập nhật bài viết" : "Thêm bài viết mới"} size="lg" onSave={handleSavePost} saveText={isSubmitting ? "Đang xử lý..." : isEditMode ? "Lưu thay đổi" : "Lưu bài viết"}>
                    <div className="z-blog-form">
                        <div className="z-blog-form-grid">
                            <div className="z-blog-form-column">
                                <div className="z-blog-form-group">
                                    <label>Tiêu đề bài viết <span className="z-blog-required">*</span></label>
                                    <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="z-blog-input" placeholder="Nhập tiêu đề..." disabled={isSubmitting} />
                                </div>
                                <div className="z-blog-form-group">
                                    <label>Đường dẫn (URL) <span className="z-blog-required">*</span></label>
                                    <input type="text" name="externalUrl" value={formData.externalUrl} onChange={handleInputChange} className="z-blog-input" placeholder="https://..." disabled={isSubmitting} />
                                </div>
                                <div className="z-blog-form-group">
                                    <label>Mô tả SEO</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="z-blog-textarea" rows="4" placeholder="Nhập mô tả..." disabled={isSubmitting} />
                                </div>
                            </div>
                            <div className="z-blog-form-column">
                                <div className="z-blog-form-group"><label>Dịch vụ</label><Select name="serviceType" options={serviceOptions} value={formData.serviceType} onChange={handleInputChange} disabled={isSubmitting} /></div>
                                <div className="z-blog-form-group"><label>Loại bài</label><Select name="postType" options={postTypeOptions} value={formData.postType} onChange={handleInputChange} disabled={isSubmitting} /></div>
                                <div className="z-blog-form-group"><label>Trạng thái</label><Select name="status" options={statusOptions} value={formData.status} onChange={handleInputChange} disabled={isSubmitting} /></div>
                                <div className="z-blog-checkbox-group">
                                    <label><input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleInputChange} disabled={isSubmitting} /> Bài nổi bật</label>
                                    <label><input type="checkbox" name="isPinned" checked={formData.isPinned} onChange={handleInputChange} disabled={isSubmitting} /> Ghim đầu</label>
                                </div>
                            </div>
                        </div>
                        <div className="z-blog-form-group">
                            <label>Hình ảnh đại diện <span className="z-blog-required">*</span></label>
                            <div className="z-blog-upload-wrapper">
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} disabled={isSubmitting} />
                                {imagePreview ? (
                                    <div className="z-blog-image-preview-box">
                                        <img src={imagePreview} alt="Preview" />
                                        <button type="button" className="z-blog-remove-img-btn" onClick={removeImage}>×</button>
                                    </div>
                                ) : (
                                    <div className="z-blog-image-upload-btn" onClick={() => fileInputRef.current.click()}><span>+ Tải ảnh lên</span></div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} title="Xác nhận xóa" size="sm" onSave={confirmDelete} saveText={isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}>
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