import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bannerApi } from "../../api/axiosApi";
import "./Banners.css";

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

const FALLBACK_IMG = "https://via.placeholder.com/300x150?text=No+Banner";

const Banners = () => {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPosition, setFilterPosition] = useState("all");

    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showPositionDropdown, setShowPositionDropdown] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();

    const fetchAllBanners = async () => {
        setIsLoading(true);
        try {
            const res = await bannerApi.getAllBanners({ limit: 100 });
            if (res && res.success) {
                setBanners(res.data.banners || []);
            } else {
                setError("Không thể tải danh sách banner.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách banner:", err);
            setError("Lỗi kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllBanners();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const handleDeleteClick = (e, id, title) => {
        e.stopPropagation();
        setBannerToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!bannerToDelete) return;
        setIsSubmitting(true);
        try {
            const response = await bannerApi.deleteBanner(bannerToDelete.id);
            if (response && response.success) {
                showToast("Xóa banner thành công!", "success");
                setIsDeleteModalOpen(false);
                setBannerToDelete(null);
                fetchAllBanners();
            } else {
                showToast(response?.message || "Lỗi xóa banner", "error");
            }
        } catch (error) {
            console.error("Lỗi deleteBanner:", error);
            showToast(error.response?.data?.message || "Không thể xóa banner lúc này", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (e, id) => {
        e.stopPropagation();
        try {
            const response = await bannerApi.toggleStatus(id);
            if (response && response.success) {
                showToast("Cập nhật trạng thái thành công!", "success");
                fetchAllBanners();
            }
        } catch (error) {
            showToast("Lỗi khi cập nhật trạng thái", "error");
        }
    };

    const handleRowClick = (id) => {
        navigate(`/banners/${id}`);
    };

    const uniquePositions = Array.from(new Set(banners.map((b) => b.position).filter(Boolean)));

    const filteredBanners = banners
        .filter((banner) => {
            const normalizedSearch = removeVietnameseTones(searchTerm);
            const normalizedTitle = removeVietnameseTones(banner.title);
            const normalizedSubtitle = removeVietnameseTones(banner.subtitle || "");

            const matchesSearch = normalizedTitle.includes(normalizedSearch) || normalizedSubtitle.includes(normalizedSearch);

            let matchesStatus = true;
            if (filterStatus === "active") matchesStatus = banner.isActive === true;
            if (filterStatus === "inactive") matchesStatus = banner.isActive === false;

            let matchesPosition = true;
            if (filterPosition !== "all") matchesPosition = banner.position === filterPosition;

            return matchesSearch && matchesStatus && matchesPosition;
        })
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const getStatusLabel = () => {
        if (filterStatus === "active") return "Đang hiển thị";
        if (filterStatus === "inactive") return "Đang ẩn";
        return "Tất cả trạng thái";
    };

    const getPositionLabel = () => {
        if (filterPosition === "all") return "Tất cả vị trí";
        return `Vị trí: ${filterPosition}`;
    };

    if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
    if (error) return <div className="state-message error-message">{error}</div>;

    return (
        <div className="services-container">
            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                        ×
                    </button>
                </div>
            )}

            <div className="services-header-bar">
                <h1 className="services-title">Quản lý Banners</h1>

                <div className="services-tools">
                    <div className="search-box">
                        <input type="text" placeholder="Tìm tiêu đề banner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowPositionDropdown(!showPositionDropdown);
                                setShowFilterDropdown(false);
                            }}
                        >
                            <span>{getPositionLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showPositionDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className={`filter-option ${filterPosition === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterPosition("all");
                                        setShowPositionDropdown(false);
                                    }}
                                >
                                    Tất cả vị trí
                                </div>
                                {uniquePositions.map((pos) => (
                                    <div
                                        key={pos}
                                        className={`filter-option ${filterPosition === pos ? "active" : ""}`}
                                        onClick={() => {
                                            setFilterPosition(pos);
                                            setShowPositionDropdown(false);
                                        }}
                                    >
                                        {pos}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="filter-dropdown-container">
                        <button
                            className="btn-filter"
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowPositionDropdown(false);
                            }}
                        >
                            <span>{getStatusLabel()}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {showFilterDropdown && (
                            <div className="filter-dropdown-menu">
                                <div
                                    className={`filter-option ${filterStatus === "all" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("all");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Tất cả trạng thái
                                </div>
                                <div
                                    className={`filter-option ${filterStatus === "active" ? "active" : ""}`}
                                    onClick={() => {
                                        setFilterStatus("active");
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    Đang hiển thị
                                </div>
                                <div
                                    className={`filter-option ${filterStatus === "inactive" ? "active" : ""}`}
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

                    <button className="add-btn" onClick={() => navigate("/banners/create")}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                        </svg>
                        <span>Thêm banner</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="services-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Hình ảnh Desktop</th>
                            <th>Tiêu đề Banner</th>
                            <th>Vị trí</th>
                            <th>Thứ tự hiển thị</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBanners.map((banner, index) => (
                            <tr key={banner._id} onClick={() => handleRowClick(banner._id)} className="clickable-row">
                                <td style={{ fontWeight: "bold" }}>{index + 1}</td>
                                <td className="td-image" style={{ width: "150px" }}>
                                    <img
                                        src={banner.imageUrl || FALLBACK_IMG}
                                        alt={banner.title}
                                        style={{ width: "120px", height: "60px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e5e7eb" }}
                                        onError={(e) => {
                                            e.target.src = FALLBACK_IMG;
                                        }}
                                    />
                                </td>
                                <td>
                                    <div className="product-name" style={{ whiteSpace: "normal", WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical" }}>
                                        {banner.title}
                                    </div>
                                    {banner.buttonLink && (
                                        <div className="product-desc" style={{ color: "#3b82f6", fontSize: "12px", marginTop: "4px" }}>
                                            🔗 {banner.buttonLink}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <span style={{ fontWeight: "600", color: "#4b5563", backgroundColor: "#f3f4f6", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>{banner.position || "N/A"}</span>
                                </td>
                                <td>
                                    <span style={{ fontWeight: "bold", color: "#3b82f6", backgroundColor: "#eff6ff", padding: "4px 12px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                                        {banner.displayOrder || 0}
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className="category-badge"
                                        style={{
                                            backgroundColor: banner.isActive ? "#dcfce7" : "#fee2e2",
                                            color: banner.isActive ? "#059669" : "#dc2626",
                                            borderColor: banner.isActive ? "#059669" : "#dc2626",
                                        }}
                                    >
                                        {banner.isActive ? "Đang hiển thị" : "Đang ẩn"}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-row">
                                        <button className={`action-btn ${banner.isActive ? "btn-toggle-hide" : "btn-toggle-show"}`} onClick={(e) => handleToggleStatus(e, banner._id)} title={banner.isActive ? "Click để ẩn banner" : "Click để hiển thị banner"}>
                                            {banner.isActive ? "Ẩn" : "Hiện"}
                                        </button>

                                        <button
                                            className="action-btn btn-edit"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRowClick(banner._id);
                                            }}
                                        >
                                            Sửa
                                        </button>

                                        <button className="action-btn btn-delete" onClick={(e) => handleDeleteClick(e, banner._id, banner.title)}>
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredBanners.length === 0 && <div className="state-message">Không tìm thấy banner nào phù hợp.</div>}
            </div>

            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-delete">
                        <div className="delete-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eb3c2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </div>
                        <h3 className="delete-header">Xác nhận xóa</h3>
                        <p className="delete-message">
                            Bạn có chắc chắn muốn xóa banner <br />
                            <strong className="delete-product-name">"{bannerToDelete?.title}"</strong> không?
                            <span className="delete-warning">Hành động này không thể hoàn tác!</span>
                        </p>
                        <div className="modal-footer-delete">
                            <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
                                Hủy bỏ
                            </button>
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

export default Banners;