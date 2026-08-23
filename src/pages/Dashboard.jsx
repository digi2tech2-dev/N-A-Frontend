import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, CheckCircle2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useMediaStore from '../store/useMediaStore';
import useGroupStore from '../store/useGroupStore';
import HeroSlider from '../components/home/HeroSlider';
import CategoryCard from '../components/home/CategoryCard';
import ProductSearchBar from '../components/products/ProductSearchBar';
import ProductSearch from './ProductSearch';
import ProductPurchaseDialog from '../components/products/ProductPurchaseDialog';
import slideOneHeroImage from '../assets/slide-1.webp';
import slideTwoHeroImage from '../assets/slide-2.webp';
import slideThreeHeroImage from '../assets/slide-3.webp';
import slideFourHeroImage from '../assets/slide-4.webp';
import targetBannerImage from '../assets/تارجت.jpg';
import coinsImage from '../assets/logo.PNG';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  createStorefrontCategories,
  createStorefrontProducts,
  getStorefrontLanguage,
} from '../utils/storefront';

const Dashboard = () => {
  const { user, refreshProfile } = useAuthStore();
  const { categories, products, loadProducts } = useMediaStore();
  const groupsLastLoadedAt = useGroupStore((state) => state.groupsLastLoadedAt);
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const language = getStorefrontLanguage(i18n);
  const isTwoFactorEnabled = Boolean(user?.twoFactorEnabled ?? user?.isTwoFactorEnabled);
  const isCustomerUser = String(user?.role || '').trim().toLowerCase() === 'customer';

  useEffect(() => {
    if (refreshProfile) refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const refreshProducts = () => {
      void loadProducts({ force: true, bypassCache: true });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshProducts();
    };

    refreshProducts();
    window.addEventListener('focus', refreshProducts);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const refreshInterval = window.setInterval(refreshProducts, 30_000);

    return () => {
      window.removeEventListener('focus', refreshProducts);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(refreshInterval);
    };
  }, [loadProducts]);

  const slideTwoUrl = 'https://chat.whatsapp.com/FE7DF2bKaaWG3snAGaFjpg';
  const heroSlides = useMemo(() => ([
    { id: 'landing-slide-1', image: slideOneHeroImage, title: '' },
    { id: 'landing-slide-2', image: slideTwoHeroImage, title: '', href: slideTwoUrl },
    { id: 'landing-slide-3', image: slideThreeHeroImage, title: '', href: '/referral' },
    { id: 'landing-slide-4', image: slideFourHeroImage, title: '' },
  ]), []);

  const storefrontProducts = useMemo(
    () => createStorefrontProducts(products, {
      language,
      userGroup: user?.groupId || user?.group || 'Normal',
      userGroupPercentage: user?.groupPercentage ?? null,
    }),
    [groupsLastLoadedAt, language, products, user?.group, user?.groupId, user?.groupPercentage]
  );

  const storefrontCategories = useMemo(
    () => createStorefrontCategories(categories, storefrontProducts, language),
    [categories, storefrontProducts, language]
  );

  const visibleHomepageCategories = useMemo(
    () => storefrontCategories.filter((category) => {
      if (category.id === 'all') return false;
      const p = category.parentCategory;
      if (!p) return true;
      if (typeof p === 'string' && !p.trim()) return true;
      return false;
    }),
    [storefrontCategories]
  );

  const categoryChildrenByParent = useMemo(() => (
    storefrontCategories.reduce((map, category) => {
      const parentId = String(category?.parentCategory || '').trim();
      if (!parentId) return map;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId).push(category.id);
      return map;
    }, new Map())
  ), [storefrontCategories]);

  const collectCategoryIds = useCallback((categoryId) => {
    const seen = new Set();
    const stack = [String(categoryId || '').trim()].filter(Boolean);
    while (stack.length) {
      const currentId = stack.pop();
      if (!currentId || seen.has(currentId)) continue;
      seen.add(currentId);
      (categoryChildrenByParent.get(currentId) || []).forEach((childId) => {
        if (!seen.has(childId)) stack.push(childId);
      });
    }
    return seen;
  }, [categoryChildrenByParent]);

  const bestSellingProducts = useMemo(() => {
    const firstCategory = visibleHomepageCategories[0];
    const secondCategory = visibleHomepageCategories[1];
    const pickedIds = new Set();

    const pickFromCategory = (category, limit) => {
      if (!category) return [];
      const categoryIds = collectCategoryIds(category.id);
      const selected = [];

      for (const product of storefrontProducts) {
        if (selected.length >= limit) break;
        if (!categoryIds.has(String(product?.category || '').trim())) continue;
        if (pickedIds.has(product.id)) continue;
        pickedIds.add(product.id);
        selected.push(product);
      }

      return selected;
    };

    return [
      ...pickFromCategory(firstCategory, 4),
      ...pickFromCategory(secondCategory, 4),
    ];
  }, [collectCategoryIds, storefrontProducts, visibleHomepageCategories]);

  const handleCategorySelect = useCallback((categoryId) => {
    navigate(categoryId === 'all' ? '/products' : `/products?category=${encodeURIComponent(categoryId)}`);
  }, [navigate]);

  const handleProductSelect = useCallback((product) => {
    const next = new URLSearchParams();
    if (product?.category) next.set('category', product.category);
    next.set('request', product.id);
    navigate(`/products?${next.toString()}`);
  }, [navigate]);

  const openPurchaseDialog = useCallback((product) => {
    if (product?.storefrontStatus?.isPurchasable === false) return;
    setSelectedProduct(product);
  }, []);

  const closePurchaseDialog = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const viewCreatedOrder = useCallback((orderId) => {
    setSelectedProduct(null);
    navigate(`/orders/${encodeURIComponent(orderId)}`);
  }, [navigate]);

  return (
    <div className="space-y-5 pb-5 sm:space-y-6">
      {!isTwoFactorEnabled ? (
        <section className="security-promo-banner group relative mx-auto w-full max-w-2xl translate-y-2 overflow-hidden p-1">
          <span className="security-promo-banner__glow pointer-events-none absolute -start-12 -top-16 h-36 w-36 rounded-full blur-3xl" />
          <span className="security-promo-banner__grid pointer-events-none absolute inset-0" />
          <div className="relative flex items-center justify-between gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="security-promo-banner__icon relative grid h-7 w-7 shrink-0 place-items-center">
                <span className="security-promo-banner__status absolute end-0 top-0 h-1.5 w-1.5 -translate-y-1/4 translate-x-1/4 rounded-full" />
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.1} />
              </span>
              <div className="min-w-0">
                <p className="whitespace-nowrap text-[0.62rem] font-black text-[var(--color-text)] sm:text-[0.68rem]">
                  {language === 'ar' ? 'حماية إضافية لحسابك' : 'Extra account protection'}
                </p>
              </div>
            </div>

            <Link
              to="/account-security"
              className="security-promo-banner__action inline-flex h-7 shrink-0 items-center justify-center gap-1 px-2 text-[0.58rem] font-black sm:text-[0.64rem]"
            >
              <span>{language === 'ar' ? 'تفعيل الحماية' : 'Protect now'}</span>
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.3} />
            </Link>
          </div>
        </section>
      ) : null}

      <HeroSlider slides={heroSlides} />

      <section id="categories" className="scroll-mt-28 space-y-3 sm:space-y-3.5">
        <div className="relative z-10 mx-auto flex w-full max-w-5xl justify-center px-0.5 sm:px-2">
          <ProductSearchBar products={storefrontProducts} language={language} onSelectProduct={handleProductSelect} onOpenSearch={() => setIsSearchOpen(true)} forceIconRight placeholder={language === 'ar' ? 'ابحث عن منتج معين...' : 'Search for a specific product...'} noResultsLabel={language === 'ar' ? 'لا يوجد منتج مطابق' : 'No matching product found'} className="mx-auto w-full" inputClassName="h-10 rounded-full" />
        </div>

        <div className="relative z-0 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 md:grid-cols-3 xl:grid-cols-4">
          {visibleHomepageCategories.map((category, index) => (
            <CategoryCard key={category.id} category={category} active={false} index={index} onSelect={handleCategorySelect} />
          ))}
        </div>

      </section>

      {isCustomerUser ? (
        <div className="mx-auto w-full max-w-5xl px-0.5 sm:px-2">
          <Link
            to="/buy-target"
            className="target-sale-card group mx-auto block w-full max-w-4xl"
            aria-label={language === 'ar' ? 'بيع تارجت' : 'Sell Target'}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <span className="target-sale-card__visual" aria-hidden="true">
              <img
                src={targetBannerImage}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </span>
          </Link>
        </div>
      ) : null}

      {bestSellingProducts.length ? (
        <section className="best-selling-section mx-auto w-full max-w-5xl overflow-hidden p-2.5 sm:p-4" aria-labelledby="best-selling-title">
          <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="best-selling-heading-icon" aria-hidden="true">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h2 id="best-selling-title" className="truncate text-sm font-black text-[var(--color-text)] sm:text-base">
                {language === 'ar' ? 'الأكثر مبيعًا' : 'Best sellers'}
              </h2>
            </div>
            <Link to="/products" className="best-selling-view-all">
              <span>{language === 'ar' ? 'عرض الكل' : 'View all'}</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div
            className="scrollbar-hide flex snap-x snap-mandatory items-stretch gap-2.5 overflow-x-auto scroll-smooth pb-1 sm:gap-3"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            {bestSellingProducts.map((product) => {
              const productName = product.displayName || product.nameAr || product.name || '';
              const imageSrc = product.image ? resolveImageUrl(product.image) : coinsImage;
              const isUnavailable = product.storefrontStatus?.isPurchasable === false;
              const unavailableLabel = product.storefrontStatus?.badgeLabel || (language === 'ar' ? 'غير متاح' : 'Unavailable');

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    if (!isUnavailable) openPurchaseDialog(product);
                  }}
                  disabled={isUnavailable}
                  className={`best-selling-card group relative isolate min-w-[41%] snap-start p-1.5 text-center min-[430px]:min-w-[31%] sm:min-w-[22%] sm:p-2 lg:min-w-[17%] ${isUnavailable ? 'is-unavailable cursor-not-allowed' : ''}`}
                  aria-label={productName}
                >
                  <span className="best-selling-media relative flex aspect-square w-full items-center justify-center overflow-hidden">
                    <img
                      src={imageSrc}
                      alt=""
                      aria-hidden="true"
                      className={`best-selling-image h-full w-full object-contain p-2.5 ${isUnavailable ? 'opacity-40 grayscale-[0.35]' : ''}`}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className={`best-selling-status ${isUnavailable ? 'is-unavailable' : 'is-available'}`}>
                      {isUnavailable ? <LockKeyhole /> : <CheckCircle2 />}
                      <span>{isUnavailable ? unavailableLabel : (language === 'ar' ? 'متوفر' : 'Available')}</span>
                    </span>
                  </span>
                  <span className="best-selling-name mt-2 line-clamp-2 block min-h-8 px-1 text-[0.68rem] font-extrabold leading-4 text-[var(--color-text)] sm:text-[0.75rem]">
                    {productName}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {isSearchOpen ? (
        <ProductSearch
          onClose={() => setIsSearchOpen(false)}
          onSelectProduct={openPurchaseDialog}
        />
      ) : null}

      <ProductPurchaseDialog
        isOpen={Boolean(selectedProduct)}
        productId={selectedProduct?.id}
        initialProduct={selectedProduct}
        onClose={closePurchaseDialog}
        onViewOrder={viewCreatedOrder}
      />

    </div>
  );
};

export default Dashboard;
