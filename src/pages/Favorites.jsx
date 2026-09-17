import React, { useEffect, useState } from 'react';
import { Heart, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import useFavoritesStore from '../store/useFavoritesStore';
import ProductCardSimple from '../components/products/ProductCardSimple';
import ProductPurchaseDialog from '../components/products/ProductPurchaseDialog';
import LoadingSkeleton from '../components/products/LoadingSkeleton';
import EmptyState from '../components/products/EmptyState';

const Favorites = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accountId = useFavoritesStore((state) => state.accountId);
  const products = useFavoritesStore((state) => state.products);
  const isLoading = useFavoritesStore((state) => state.isLoading);
  const error = useFavoritesStore((state) => state.error);
  const loadFavorites = useFavoritesStore((state) => state.loadFavorites);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const isArabic = String(i18n.resolvedLanguage || i18n.language || 'ar').toLowerCase().startsWith('ar');
  const userId = String(user?.id || '');

  useEffect(() => {
    if (!userId) return;
    void loadFavorites({ userId }).catch(() => {});
  }, [loadFavorites, userId]);

  const isReadyForAccount = accountId === userId;
  const copy = isArabic
    ? {
        title: 'المفضلة',
        description: 'احتفظ بالمنتجات التي تريد الرجوع إليها بسرعة.',
        empty: 'لا توجد منتجات في المفضلة بعد',
        browse: 'تصفح المنتجات',
        retry: 'إعادة المحاولة',
      }
    : {
        title: 'Favorites',
        description: 'Keep products you want to revisit close at hand.',
        empty: 'No favorite products yet',
        browse: 'Browse products',
        retry: 'Try again',
      };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-8">
      <section className="flex flex-wrap items-end justify-between gap-3 rounded-[1.35rem] border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[color:rgb(var(--color-card-rgb)/0.7)] px-4 py-4 shadow-[var(--shadow-subtle)] backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-500/12 text-rose-500"><Heart className="h-5 w-5" fill="currentColor" /></span>
          <div>
            <h1 className="text-xl font-black text-[var(--color-text)] sm:text-2xl">{copy.title}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{copy.description}</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/products')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.28)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-3 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.16)]">
          <Search className="h-4 w-4" />
          {copy.browse}
        </button>
      </section>

      {(!isReadyForAccount || isLoading) ? <LoadingSkeleton variant="products" /> : null}

      {isReadyForAccount && !isLoading && error ? (
        <EmptyState icon={Heart} title={isArabic ? 'تعذر تحميل المفضلة' : 'Could not load Favorites'} description={isArabic ? 'حاول مرة أخرى بعد قليل.' : 'Please try again in a moment.'} actionLabel={copy.retry} onAction={() => void loadFavorites({ userId }).catch(() => {})} />
      ) : null}

      {isReadyForAccount && !isLoading && !error && products.length === 0 ? (
        <EmptyState icon={Heart} title={copy.empty} description={copy.description} actionLabel={copy.browse} onAction={() => navigate('/products')} />
      ) : null}

      {isReadyForAccount && !isLoading && !error && products.length > 0 ? (
        <section className="grid grid-cols-3 gap-2 p-1 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCardSimple
              key={product.id || product._id}
              product={product}
              onOpen={setSelectedProduct}
              unavailableLabel={isArabic ? 'غير متاح' : 'Unavailable'}
            />
          ))}
        </section>
      ) : null}

      <ProductPurchaseDialog
        isOpen={Boolean(selectedProduct)}
        productId={selectedProduct?.id}
        initialProduct={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onViewOrder={() => setSelectedProduct(null)}
      />
    </div>
  );
};

export default Favorites;
