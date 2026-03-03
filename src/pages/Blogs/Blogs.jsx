import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postApi } from "../../api/axiosApi"; // Đảm bảo import đúng đường dẫn của bạn
import "./Blogs.css"; // Dùng chung file CSS với Clinics

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

const Blogs = () => {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); 
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState("newest"); 
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    // ==========================================
    // STATE: TOAST VÀ MODAL XÓA
    // ==========================================
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();

    // FETCH DATA
    const fetchAllPosts = async () => {
        setIsLoading(true);
        try {
            // Lấy limit cao để demo search/filter frontend giống trang Clinics
            const res = await postApi.getAllPosts({ limit: 100 });
            if (res && res.success) {
                setPosts(res.data.posts || []);
            } else {
                setError("Không thể tải danh sách bài viết.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách bài viết:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllPosts();
    }, []);

    // LOGIC TOAST MESSAGE
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ==========================================
    // XỬ LÝ XÓA BÀI VIẾT
    // ==========================================
    const handleDeleteClick = (e, id, title) => {
        e.stopPropagation();
        setPostToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!postToDelete) return;

        setIsSubmitting(true);
        try {
            const response = await postApi.deletePost(postToDelete.id);
            if (response && response.success) {
                showToast("Xóa bài viết thành công!", "success");
                setIsDeleteModalOpen(false);
                setPostToDelete(null);
                fetchAllPosts(); // Render lại danh sách
            } else {
                showToast(response?.message || "Lỗi xóa bài viết", "error");
            }
        } catch (error) {
            console.error("Lỗi deletePost:", error);
            const errorMsg = error.response?.data?.message || "Không thể xóa bài viết lúc này";
            showToast(errorMsg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // CLICK VÀO HÀNG ĐỂ XEM CHI TIẾT
    const handleRowClick = (id) => {
        navigate(`/blogs/${id}`); // Đường dẫn sang chi tiết bài viết
    };

    // LOGIC FILTER VÀ SORT
    const filteredPosts = posts
        .filter((post) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedTitle = removeVietnameseTones(post.title);
            
            const matchesSearch = normalizedTitle.includes(normalizedSearch);

            let matchesStatus = true;
            if (filterStatus === "active") matchesStatus = post.status === "ACTIVE";
            if (filterStatus === "inactive") matchesStatus = post.status === "INACTIVE";

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortOrder === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortOrder === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
            return 0;
        });

    const getStatusLabel = () => {
        if (filterStatus === "active") return "Đang hoạt động";
        if (filterStatus === "inactive") return "Đang ẩn";
        return "Tất cả trạng thái";
    };

    const getSortLabel = () => {
        if (sortOrder === "newest") return "Ngày tạo: Mới nhất";
        if (sortOrder === "oldest") return "Ngày tạo: Cũ nhất";
        return "Sắp xếp mặc định";
    };

    // RENDER UI
    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

    return (
        <div className="services-container">
            {/* THÔNG BÁO TOAST */}
            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Bài Viết</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder="Tìm tiêu đề bài viết..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowSortDropdown(false);
                            }}
                        >
                            <span>{getStatusLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {showFilterDropdown && (
                            <div className="filter-dropdown-menu">
                                <div className={`filter-option ${filterStatus === "all" ? "active" : ""}`} onClick={() => { setFilterStatus("all"); setShowFilterDropdown(false); }}>
                                    Tất cả trạng thái
                                </div>
                                <div className={`filter-option ${filterStatus === "active" ? "active" : ""}`} onClick={() => { setFilterStatus("active"); setShowFilterDropdown(false); }}>
                                    Đang hoạt động
                                </div>
                                <div className={`filter-option ${filterStatus === "inactive" ? "active" : ""}`} onClick={() => { setFilterStatus("inactive"); setShowFilterDropdown(false); }}>
                                    Đang ẩn (Ngừng hoạt động)
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            style={{ minWidth: "180px" }}
                            onClick={() => {
                                setShowSortDropdown(!showSortDropdown);
                                setShowFilterDropdown(false);
                            }}
                        >
                            <span>{getSortLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {showSortDropdown && (
                            <div className="filter-dropdown-menu">
                                <div className={`filter-option ${sortOrder === "newest" ? "active" : ""}`} onClick={() => { setSortOrder("newest"); setShowSortDropdown(false); }}>
                                    Ngày tạo: Mới nhất
                                </div>
                                <div className={`filter-option ${sortOrder === "oldest" ? "active" : ""}`} onClick={() => { setSortOrder("oldest"); setShowSortDropdown(false); }}>
                                    Ngày tạo: Cũ nhất
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="add-btn" onClick={() => navigate('/blogs/create')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                        </svg>
                        <span>Thêm bài viết</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Thumbnail</th>
                            <th>Tiêu đề bài viết</th>
                            <th>Loại bài</th>
                            <th>Lượt Click</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPosts.map((post, index) => (
                            <tr key={post._id} onClick={() => handleRowClick(post._id)} className="clickable-row">
                                <td>{index + 1}</td>
                                <td className="td-image">
                                    <img
                                        src={post.thumbnailUrl || FALLBACK_IMG}
                                        alt={post.title}
                                        className="product-image"
                                        onError={(e) => { e.target.src = FALLBACK_IMG; }}
                                    />
                                </td>
                                <td>
                                    <div className="product-name" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                                        {post.title}
                                    </div>
                                    <div className="product-desc" style={{ color: '#3b82f6', fontSize: '12px' }} title={post.externalUrl}>
                                        {post.externalUrl}
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontWeight: '500', color: '#4b5563' }}>{post.postType || 'Bài SEO'}</span>
                                    {post.isFeatured && (
                                        <span style={{ display: 'block', fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
                                            ★ Nổi bật
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span style={{ fontWeight: '600', color: '#6366f1' }}>{post.clickCount || 0}</span>
                                </td>
                                <td>
                                    {post.status === 'ACTIVE' ? (
                                        <span className="category-badge" style={{ backgroundColor: '#dcfce7', color: '#059669', borderColor: '#059669' }}>
                                            Đang hoạt động
                                        </span>
                                    ) : (
                                        <span className="category-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}>
                                            Đang ẩn
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <div className="action-row">
                                        <button className="action-btn btn-edit" onClick={(e) => { e.stopPropagation(); handleRowClick(post._id); }}>
                                            Xem chi tiết
                                        </button>
                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, post._id, post.title)}>
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredPosts.length === 0 && <div className="state-message">Không tìm thấy bài viết nào phù hợp.</div>}
            </div>

            {/* ==========================================
                MODAL XÁC NHẬN XÓA 
                ========================================== */}
            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-delete">
                        <div className="delete-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </div>
                        
                        <h3 className="delete-header">Xác nhận xóa</h3>
                        
                        <p className="delete-message">
                            Bạn có chắc chắn muốn xóa bài viết <br/>
                            <strong className="delete-product-name">"{postToDelete?.title}"</strong> không?
                            <span className="delete-warning">Hành động này không thể hoàn tác!</span>
                        </p>
                        
                        <div className="modal-footer-delete">
                            <button 
                                className="btn-secondary" 
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                className="btn-danger" 
                                onClick={confirmDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Blogs;