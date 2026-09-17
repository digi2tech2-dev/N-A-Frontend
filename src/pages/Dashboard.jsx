import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
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
import { ANDROID_APK_DOWNLOAD_URL } from '../config/appDownloads';
import ContactActions from '../components/contact/ContactActions';
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

  const heroSlides = useMemo(() => ([
    { id: 'landing-slide-1', image: slideOneHeroImage, title: '' },
    {
      id: 'android-app-download',
      image: slideTwoHeroImage,
      title: '',
      href: ANDROID_APK_DOWNLOAD_URL,
      alt: language === 'ar' ? 'تحميل تطبيق N&A HUB للأندرويد' : 'Download the N&A HUB Android app',
    },
    { id: 'landing-slide-3', image: slideThreeHeroImage, title: '', href: '/referral' },
    { id: 'landing-slide-4', image: slideFourHeroImage, title: '' },
  ]), [language]);

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

      <section id="categories" className="-mt-2 scroll-mt-28 space-y-3 sm:-mt-1 sm:space-y-3.5">
        <div className="relative z-10 mx-auto flex w-full max-w-5xl justify-center px-0.5 sm:px-2">
          <ProductSearchBar
            products={storefrontProducts}
            language={language}
            onSelectProduct={handleProductSelect}
            onOpenSearch={() => setIsSearchOpen(true)}
            forceIconRight
            placeholder={language === 'ar' ? 'ابحث عن منتج معين...' : 'Search for a specific product...'}
            noResultsLabel={language === 'ar' ? 'لا يوجد منتج مطابق' : 'No matching product found'}
            className="mx-auto w-full max-w-3xl"
            inputClassName="!h-11 rounded-[1.15rem] border-[color:rgb(var(--color-primary-rgb)/0.3)] bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)/0.94),rgb(var(--color-card-rgb)/0.82))] font-semibold shadow-[0_12px_28px_-20px_rgb(var(--color-primary-rgb)/0.8),inset_0_1px_rgb(255_255_255/0.1)] placeholder:text-[var(--color-text-secondary)] focus:border-[color:rgb(var(--color-primary-rgb)/0.62)] focus:bg-[color:rgb(var(--color-surface-rgb)/0.98)] focus:shadow-[0_0_0_3px_rgb(var(--color-primary-rgb)/0.1),0_16px_34px_-20px_rgb(var(--color-primary-rgb)/0.9)] sm:!h-12 sm:rounded-[1.3rem]"
          />
        </div>

        <div className="relative z-0 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-2.5 md:grid-cols-3 xl:grid-cols-4">
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

      <ContactActions isArabic={language === 'ar'} />

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
