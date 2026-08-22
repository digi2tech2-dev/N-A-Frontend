import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductPurchaseDialog from '../components/products/ProductPurchaseDialog';

const ProductPurchasePage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();

  return (
    <ProductPurchaseDialog
      isOpen
      productId={productId}
      onClose={() => navigate('/products')}
      onViewOrder={(orderId) => navigate(`/orders/${encodeURIComponent(orderId)}`)}
    />
  );
};

export default ProductPurchasePage;
