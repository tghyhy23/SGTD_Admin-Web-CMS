// src/pages/Services/ServiceDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi } from '../../api/axiosApi';
import './ServiceDetail.css';

const FALLBACK_IMG = 'https://via.placeholder.com/400x400?text=No+Image';

const ServiceDetail = () => {
  const { id } = useParams(); // Lấy ID từ URL
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([FALLBACK_IMG]);
  const [activeImage, setActiveImage] = useState(0); // Index ảnh đang hiển thị lớn
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const response = await serviceApi.getVariantById(id);
        
        // ĐÃ SỬA: Bỏ .data dư thừa đi, vì interceptor đã bóc tách rồi
        if (response && response.success) {
          // Lấy variant từ response.data
          const variant = response.data.variant;
          setProduct(variant);

          // Xử lý logic ảnh
          let imgs = [];
          if (variant.imageUrls && variant.imageUrls.length > 0) {
            imgs = variant.imageUrls;
          } else if (variant.serviceId?.thumbnailUrl) {
            imgs = [variant.serviceId.thumbnailUrl];
          } else {
            imgs = [FALLBACK_IMG];
          }
          setImages(imgs);
        } else {
          setError("Không tìm thấy thông tin sản phẩm.");
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết:", err);
        setError("Lỗi khi tải dữ liệu từ máy chủ.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchDetail();
  }, [id]);

  if (isLoading) return <div className="state-message">Đang tải chi tiết sản phẩm...</div>;
  if (error) return <div className="state-message error-message">{error}</div>;
  if (!product) return <div className="state-message">Không có dữ liệu.</div>;

  return (
    <div className="page-container">
      {/* Breadcrumb - Thanh điều hướng */}
      <div className="breadcrumb">
        <span onClick={() => navigate('/services')} className="breadcrumb-link">
          Quản lý dịch vụ
        </span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Chi tiết sản phẩm</span>
      </div>

      <div className="service-detail-card page-card">
        
        <div className="detail-layout">
          {/* CỘT TRÁI: HÌNH ẢNH */}
          <div className="detail-left">
            <div className="main-image-container">
              <img 
                src={images[activeImage]} 
                alt={product.name} 
                className="main-image"
                onError={(e) => { e.target.src = FALLBACK_IMG }}
              />
            </div>
            
            {/* Danh sách ảnh nhỏ (Thumbnails) */}
            {images.length > 1 && (
              <div className="thumbnail-list">
                {images.map((img, index) => (
                  <div 
                    key={index} 
                    className={`thumbnail-item ${activeImage === index ? 'active' : ''}`}
                    onClick={() => setActiveImage(index)}
                  >
                    <img src={img} alt={`thumb-${index}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CỘT PHẢI: THÔNG TIN CHI TIẾT */}
          <div className="detail-right">
            <span className="category-badge detail-badge">
              {product.serviceId?.name || "Dịch vụ"}
            </span>
            <h1 className="detail-title">{product.name}</h1>
            
            <div className="detail-price">
              {product.price?.toLocaleString('vi-VN')} {product.unit || 'đ'}
            </div>

            <div className="detail-section">
              <h3>Mô tả sản phẩm</h3>
              <p className="detail-description">
                {product.description || "Chưa có mô tả cho sản phẩm này."}
              </p>
            </div>

            {/* Khung Thông số kỹ thuật */}
            <div className="detail-specs-box">
              <h3>Thông số kỹ thuật</h3>
              <ul className="specs-list">
                {product.manufacturer && (
                  <li>
                    <span className="spec-label">Hãng sản xuất:</span>
                    <span className="spec-value">{product.manufacturer}</span>
                  </li>
                )}
                {product.warranty_period && (
                  <li>
                    <span className="spec-label">Bảo hành:</span>
                    <span className="spec-value">{product.warranty_period}</span>
                  </li>
                )}
                {product.hardness && (
                  <li>
                    <span className="spec-label">Độ cứng:</span>
                    <span className="spec-value">{product.hardness}</span>
                  </li>
                )}
                {product.transparency && (
                  <li>
                    <span className="spec-label">Độ trong suốt:</span>
                    <span className="spec-value">{product.transparency}</span>
                  </li>
                )}
              </ul>
              
              {/* Nếu không có thông số nào */}
              {(!product.manufacturer && !product.warranty_period && !product.hardness && !product.transparency) && (
                <p style={{ color: 'var(--text-muted)' }}>Không có thông số đặc biệt.</p>
              )}
            </div>

            {/* Các nút hành động */}
            <div className="detail-actions">
              <button className="btn-secondary" onClick={() => navigate('/services')}>
                Quay lại danh sách
              </button>
              <button className="btn-primary" onClick={() => console.log('Edit', product._id)}>
                Chỉnh sửa sản phẩm
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;