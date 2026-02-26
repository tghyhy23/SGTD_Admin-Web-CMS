import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import hook chuyển trang
import './Services.css'; 
import { serviceApi } from '../../api/axiosApi';

const Services = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate(); // Khởi tạo navigate

  useEffect(() => {
    const fetchAllProducts = async () => {
      setIsLoading(true);
      try {
        const serviceRes = await serviceApi.getAllServices();
        
        if (serviceRes && serviceRes.data && serviceRes.data.services) {
          const servicesData = serviceRes.data.services;

          const productPromises = servicesData.map(async (service) => {
            try {
              const res = await serviceApi.getVariantsByServiceId(service._id);
              if (res && res.success) {
                return res.data.variants.map((variant) => ({
                  id: variant._id,
                  name: variant.name,
                  price: variant.price,
                  unit: variant.unit,
                  description: variant.description,
                  image: (variant.imageUrls && variant.imageUrls.length > 0) 
                         ? variant.imageUrls[0] 
                         : service.thumbnailUrl,
                  category: service.name,
                  serviceId: service._id,
                }));
              }
              return [];
            } catch (err) {
              console.error(`Lỗi lấy variant cho service ${service._id}:`, err);
              return [];
            }
          });

          const results = await Promise.all(productPromises);
          const flatProducts = results.flat();
          
          setProducts(flatProducts);
        }
      } catch (err) {
        setError("Không thể tải danh sách dịch vụ");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProducts();
  }, []);

  // Hàm xử lý khi click vào 1 dòng
  const handleRowClick = (productId) => {
    navigate(`/services/${productId}`); // Chuyển hướng sang trang chi tiết
  };

  if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
  if (error) return <div className="state-message error-message">{error}</div>;

  return (
    <div className="services-container">
      <h1 className="services-title">Quản lý Dịch vụ & Sản phẩm</h1>
      
      <div className="table-wrapper">
        <table className="services-table">
          <thead>
            <tr>
              <th>STT</th> {/* THÊM CỘT STT */}
              <th>Hình ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((item, index) => (
              <tr 
                key={item.id} 
                onClick={() => handleRowClick(item.id)} // Gắn sự kiện click vào hàng
                className="clickable-row"
              >
                {/* CỘT STT */}
                <td>{index + 1}</td> 

                <td>
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="product-image"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150' }}
                  />
                </td>
                <td>
                  <div className="product-name">{item.name}</div>
                  <div className="product-desc" title={item.description}>
                    {item.description}
                  </div>
                </td>
                <td>
                  <span className="category-badge">
                    {item.category}
                  </span>
                </td>
                <td>
                  <span className="product-price">
                    {item.price?.toLocaleString()} {item.unit || 'đ'}
                  </span>
                </td>
                <td>
                  {/* Dùng e.stopPropagation() để chặn sự kiện click hàng (nhảy trang) khi bấm nút */}
                  <button 
                    className="action-btn btn-edit"
                    onClick={(e) => {
                      e.stopPropagation(); 
                      console.log('Sửa', item.id);
                    }}
                  >
                    Sửa
                  </button>
                  <button 
                    className="action-btn btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Xóa', item.id);
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {products.length === 0 && (
          <div className="state-message">Không tìm thấy sản phẩm nào.</div>
        )}
      </div>
    </div>
  );
};

export default Services;