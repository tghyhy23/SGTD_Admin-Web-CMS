import React, { useEffect, useState } from 'react';

import './Services.css'; // Import file CSS thuần
import { serviceApi } from '../../api/axiosApi';

const Services = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (isLoading) return <div className="state-message">Đang tải dữ liệu...</div>;
  if (error) return <div className="state-message error-message">{error}</div>;

  return (
    <div className="services-container">
      <h1 className="services-title">Quản lý Dịch vụ & Sản phẩm</h1>
      
      <div className="table-wrapper">
        <table className="services-table">
          <thead>
            <tr>
              <th>Hình ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((item) => (
              <tr key={item.id}>
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
                  <button className="action-btn btn-edit">Sửa</button>
                  <button className="action-btn btn-delete">Xóa</button>
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