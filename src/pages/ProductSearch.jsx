import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpLeft, ArrowRight, Clock3, PackageSearch, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import useGroupStore from '../store/useGroupStore';
import useMediaStore from '../store/useMediaStore';
import SearchBar from '../components/ui/SearchBar';
import coinsImage from '../assets/logo.PNG';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  createStorefrontProducts,
  filterStorefrontProducts,
  getStorefrontLanguage,
  sanitizeStorefrontQuery,
} from '../utils/storefront';

const SEARCH_HISTORY_KEY = 'na-hub:product-search-history:v1';
const MAX_HISTORY_ITEMS = 8;

const readSearchHistory = () => {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || '').trim()).filter(Boolean).slice(0, MAX_HISTORY_ITEMS)
      : [];
  } catch {
    return [];
  }
};

const writeSearchHistory = (items) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // Search history is optional and must never block product search.
  }
};

const ProductSearch = ({ onClose, onSelectProduct }) => {
  const { i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const products = useMediaStore((state) => state.products);
  const loadProducts = useMediaStore((state) => state.loadProducts);
  const groupsLastLoadedAt = useGroupStore((state) => state.groupsLastLoadedAt);
  const language = getStorefrontLanguage(i18n);
  const isArabic = language === 'ar';
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState(readSearchHistory);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = sanitizeStorefrontQuery(deferredQuery);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const storefrontProducts = useMemo(
    () => createStorefrontProducts(products, {
      language,
      userGroup: user?.groupId || user?.group || 'Normal',
      userGroupPercentage: user?.groupPercentage ?? null,
    }),
    [groupsLastLoadedAt, language, products, user?.group, user?.groupId, user?.groupPercentage]
  );

  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    return filterStorefrontProducts(storefrontProducts, {
      searchTerm: normalizedQuery,
      activeCategory: 'all',
      language,
    }).slice(0, 24);
  }, [language, normalizedQuery, storefrontProducts]);

  const updateHistory = (updater) => {
    setHistory((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      writeSearchHistory(next);
      return next;
    });
  };

  const rememberSearch = (value) => {
    const term = String(value || '').replace(/\s+/g, ' ').trim();
    if (!term) return;
    const normalizedTerm = sanitizeStorefrontQuery(term);

    updateHistory((current) => [
      term,
      ...current.filter((item) => sanitizeStorefrontQuery(item) !== normalizedTerm),
    ].slice(0, MAX_HISTORY_ITEMS));
  };

  const openProduct = (product) => {
    if (product?.storefrontStatus?.isPurchasable === false) return;
    rememberSearch(query || product?.displayName);
    onClose?.();
    onSelectProduct?.(product);
  };

  const removeHistoryItem = (itemToRemove) => {
    const normalizedItem = sanitizeStorefrontQuery(itemToRemove);
    updateHistory((current) => current.filter(
      (item) => sanitizeStorefrontQuery(item) !== normalizedItem
    ));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    rememberSearch(query);
  };

  return createPortal(
    <div
      className="product-search-overlay fixed inset-0 z-[300] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={isArabic ? 'البحث عن منتج' : 'Product search'}
    >
      <main className="product-search-page mx-auto min-h-full w-full max-w-5xl sm:px-5 sm:py-5">
        <section className="product-search-shell relative min-h-[100dvh] overflow-hidden p-3 sm:min-h-[calc(100dvh-2.5rem)] sm:rounded-[1.65rem] sm:p-5">
        <div className="product-search-shell__glow pointer-events-none absolute -top-24 end-8 h-52 w-52 rounded-full blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center gap-2 px-1 sm:mb-5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="product-search-back grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11"
              aria-label={isArabic ? 'رجوع' : 'Back'}
            >
              <ArrowRight className={`h-5 w-5 ${isArabic ? '' : 'rotate-180'}`} strokeWidth={2.4} />
            </button>
            <form onSubmit={handleSubmit} className="min-w-0 flex-1">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={isArabic ? 'ابحث عن منتج معين...' : 'Search for a specific product...'}
                forceIconRight={isArabic}
                autoFocus
                inputClassName="product-search-input h-10 rounded-xl text-sm sm:h-11"
                iconClassName="product-search-input-icon"
              />
            </form>
          </div>

          {!normalizedQuery ? (
            <div className="mt-5">
              {history.length ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-[var(--color-primary)]" />
                      <h2 className="text-sm font-black text-[var(--color-text)]">
                        {isArabic ? 'عمليات البحث الأخيرة' : 'Recent searches'}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateHistory([])}
                      className="product-search-clear inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.65rem] font-black"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isArabic ? 'مسح الكل' : 'Clear all'}
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {history.map((item) => (
                      <div key={item} className="product-search-history-item flex min-w-0 items-center gap-2 rounded-xl p-1.5">
                        <button
                          type="button"
                          onClick={() => setQuery(item)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1 text-start"
                        >
                          <Clock3 className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" />
                          <span className="truncate text-xs font-bold text-[var(--color-text)]">{item}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryItem(item)}
                          className="product-search-history-remove grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                          aria-label={isArabic ? `حذف ${item}` : `Remove ${item}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="product-search-empty-state flex min-h-[16rem] flex-col items-center justify-center rounded-2xl px-4 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-2xl">
                    <PackageSearch className="h-8 w-8" strokeWidth={1.8} />
                  </span>
                  <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                    {isArabic ? 'ابحث عن المنتج الذي تريده' : 'Find the product you need'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-black text-[var(--color-text)]">
                  {isArabic ? 'نتائج البحث' : 'Search results'}
                </h2>
                <span className="product-search-count rounded-full px-2.5 py-1 text-[0.62rem] font-black">
                  {results.length} {isArabic ? 'نتيجة' : 'results'}
                </span>
              </div>

              {results.length ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {results.map((product) => {
                    const isUnavailable = product.storefrontStatus?.isPurchasable === false;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => openProduct(product)}
                        disabled={isUnavailable}
                        className={`product-search-result group flex min-w-0 items-center gap-3 rounded-2xl p-2.5 text-start ${isUnavailable ? 'cursor-not-allowed' : ''}`}
                      >
                        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.56)] bg-[var(--color-elevated)]">
                          <img
                            src={product.image ? resolveImageUrl(product.image) : coinsImage}
                            alt={product.displayName}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-[var(--color-text)]">
                            {product.displayName}
                          </span>
                          {product.displayDescription ? (
                            <span className="mt-1 line-clamp-1 block text-[0.68rem] font-semibold text-[var(--color-text-secondary)]">
                              {product.displayDescription}
                            </span>
                          ) : null}
                          {isUnavailable ? (
                            <span className="mt-1.5 inline-flex rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[0.58rem] font-black text-rose-500 dark:text-rose-300">
                              {product.storefrontStatus?.badgeLabel || (isArabic ? 'غير متاح' : 'Unavailable')}
                            </span>
                          ) : null}
                        </span>
                        <ArrowUpLeft
                          className={`h-4 w-4 shrink-0 text-[var(--color-primary)] transition-transform group-hover:-translate-y-0.5 ${isArabic ? '' : 'rotate-90'}`}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="product-search-empty-state flex min-h-[15rem] flex-col items-center justify-center rounded-2xl px-4 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl">
                    <PackageSearch className="h-7 w-7" strokeWidth={1.8} />
                  </span>
                  <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                    {isArabic ? 'لا توجد منتجات مطابقة' : 'No matching products'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="mt-3 text-xs font-black text-[var(--color-primary)] hover:underline"
                  >
                    {isArabic ? 'مسح البحث' : 'Clear search'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </section>
      </main>
    </div>,
    document.body
  );
};

export default ProductSearch;
