import { create } from 'zustand';
import { mockProducts, mockCategories } from '../data/mockData';
import apiClient from '../services/client';
import { isRealProvider } from '../config/dataProvider';


const CATEGORIES_CACHE_KEY = 'kanz-coins:categories-cache:v1';
const LEGACY_PRODUCT_CACHE_KEYS = [
  'coins:media-cache:v2',
  'kanz-coins:media-cache:v2',
];
const PRODUCTS_CACHE_TTL = 5 * 60 * 1000;
let productsRequest = null;

const clearLegacyProductCaches = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    LEGACY_PRODUCT_CACHE_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Best effort; legacy snapshots are ignored even if removal is blocked.
  }
};

const readSessionCache = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const categories = Array.isArray(parsed?.categories) ? parsed.categories : null;
    const lastLoadedAt = Number(parsed?.lastLoadedAt || 0);
    if (!categories || !Number.isFinite(lastLoadedAt)) return null;
    return { categories, lastLoadedAt };
  } catch {
    return null;
  }
};

const writeSessionCache = ({ categories, lastLoadedAt }) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(
      CATEGORIES_CACHE_KEY,
      // Product availability must always come from the API. Persisting product
      // snapshots can leave a stopped product looking active for several minutes.
      JSON.stringify({ categories, lastLoadedAt })
    );
  } catch {
    // Best-effort cache only.
  }
};

const writeCategorySnapshotCache = ({ categories, lastLoadedAt = Date.now() }) => {
  writeSessionCache({
    categories: Array.isArray(categories) ? categories : [],
    lastLoadedAt,
  });
};

const clearSessionCache = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(CATEGORIES_CACHE_KEY);
    LEGACY_PRODUCT_CACHE_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Best effort.
  }
};

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveCategoryId = (value, categories) => {
  const raw = (() => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return String(value._id || value.id || value.name || value.nameAr || '').trim();
    }
    return String(value || '').trim();
  })();
  const matched = (categories || []).find(
    (c) => c.id === raw || c.name === raw || c.nameAr === raw
  );
  return matched?.id || raw || categories?.[0]?.id || '';
};

const looksLikeObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || '').trim());

const buildProductSearchIndex = (product = {}) => String([
  product?.name,
  product?.nameAr,
  product?.description,
  product?.descriptionAr,
  product?.externalProductName,
].join(' '))
  .replace(/[\u0000-\u001F\u007F]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const pickDefinedProductValue = (incomingValue, fallbackValue) => {
  if (incomingValue === undefined || incomingValue === null) return fallbackValue;

  if (typeof incomingValue === 'string') {
    return incomingValue.trim() ? incomingValue : fallbackValue;
  }

  if (Array.isArray(incomingValue)) {
    return incomingValue.length ? incomingValue : fallbackValue;
  }

  return incomingValue;
};

const pickUsablePriceValue = (...values) => {
  const positiveValue = values.find((value) => {
    if (value === undefined || value === null || String(value).trim() === '') return false;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  });

  if (positiveValue !== undefined) return positiveValue;

  return values.find((value) => (
    value !== undefined
    && value !== null
    && String(value).trim() !== ''
  )) ?? 0;
};

const mergeSavedProductSnapshot = (baseProduct = {}, apiProduct = {}) => ({
  ...baseProduct,
  ...apiProduct,
  providerId: pickDefinedProductValue(apiProduct.providerId ?? apiProduct.supplierId, baseProduct.providerId || baseProduct.supplierId || ''),
  supplierId: pickDefinedProductValue(apiProduct.supplierId ?? apiProduct.providerId, baseProduct.supplierId || baseProduct.providerId || ''),
  providerProductId: pickDefinedProductValue(apiProduct.providerProductId ?? apiProduct.externalProductId, baseProduct.providerProductId || baseProduct.externalProductId || ''),
  externalProductId: pickDefinedProductValue(apiProduct.externalProductId ?? apiProduct.providerProductId, baseProduct.externalProductId || baseProduct.providerProductId || ''),
  externalProductName: pickDefinedProductValue(apiProduct.externalProductName, baseProduct.externalProductName || ''),
  purchaseAccountNumber: pickDefinedProductValue(apiProduct.purchaseAccountNumber ?? apiProduct.accountNumber ?? apiProduct.productAccountNumber, baseProduct.purchaseAccountNumber || baseProduct.accountNumber || ''),
  accountNumber: pickDefinedProductValue(apiProduct.accountNumber ?? apiProduct.purchaseAccountNumber ?? apiProduct.productAccountNumber, baseProduct.accountNumber || baseProduct.purchaseAccountNumber || ''),
  showPurchaseAccountNumber: apiProduct.showPurchaseAccountNumber !== undefined
    ? Boolean(apiProduct.showPurchaseAccountNumber)
    : Boolean(apiProduct.showAccountNumber ?? baseProduct.showPurchaseAccountNumber ?? baseProduct.showAccountNumber),
  showAccountNumber: apiProduct.showAccountNumber !== undefined
    ? Boolean(apiProduct.showAccountNumber)
    : Boolean(apiProduct.showPurchaseAccountNumber ?? baseProduct.showAccountNumber ?? baseProduct.showPurchaseAccountNumber),
  externalPricingMode: pickDefinedProductValue(apiProduct.externalPricingMode, baseProduct.externalPricingMode || 'use_local_price'),
  supplierMarginType: pickDefinedProductValue(apiProduct.supplierMarginType, baseProduct.supplierMarginType || 'fixed'),
  supplierMarginValue: pickDefinedProductValue(apiProduct.supplierMarginValue, baseProduct.supplierMarginValue ?? 0),
  fallbackSupplierId: pickDefinedProductValue(apiProduct.fallbackSupplierId, baseProduct.fallbackSupplierId || ''),
  supplierNotes: pickDefinedProductValue(apiProduct.supplierNotes, baseProduct.supplierNotes || ''),
  supplierFieldMappings: pickDefinedProductValue(apiProduct.supplierFieldMappings, baseProduct.supplierFieldMappings || []),
  syncPriceWithProvider: apiProduct.syncPriceWithProvider !== undefined
    ? Boolean(apiProduct.syncPriceWithProvider)
    : Boolean(baseProduct.syncPriceWithProvider),
  enableManualPrice: apiProduct.enableManualPrice !== undefined
    ? Boolean(apiProduct.enableManualPrice)
    : Boolean(baseProduct.enableManualPrice),
  manualPriceAdjustment: pickDefinedProductValue(apiProduct.manualPriceAdjustment, baseProduct.manualPriceAdjustment ?? ''),
  syncedProviderBasePrice: apiProduct.syncedProviderBasePrice ?? baseProduct.syncedProviderBasePrice ?? null,
  originalPriceCoins: pickDefinedProductValue(
    apiProduct.originalPriceCoins ?? apiProduct.originalPrice ?? apiProduct.costPrice,
    baseProduct.originalPriceCoins ?? baseProduct.originalPrice ?? baseProduct.costPrice ?? ''
  ),
  dynamicFields: pickDefinedProductValue(apiProduct.dynamicFields, baseProduct.dynamicFields || []),
});

const splitProductStatusUpdate = (currentProduct = {}, updates = {}) => {
  const currentStatus = String(
    currentProduct.status
    || (currentProduct.isActive === false ? 'inactive' : 'active')
    || 'active'
  ).trim().toLowerCase();

  const nextStatusRaw = updates?.status !== undefined
    ? updates.status
    : updates?.isActive !== undefined
      ? (updates.isActive ? 'active' : 'inactive')
      : '';
  const nextStatus = String(nextStatusRaw || '').trim().toLowerCase();

  const nonStatusUpdates = { ...(updates || {}) };
  delete nonStatusUpdates.status;
  delete nonStatusUpdates.isActive;

  return {
    statusChanged: ['active', 'inactive'].includes(nextStatus) && nextStatus !== currentStatus,
    nonStatusUpdates,
  };
};

const hasOwnKeys = (value) => Object.keys(value || {}).length > 0;

const getToggleFallbackSnapshot = (currentProduct = {}) => {
  const currentStatus = String(currentProduct.status || '').trim().toLowerCase();
  const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const isActive = nextStatus === 'active';

  return {
    status: nextStatus,
    isActive,
    productStatus: isActive ? 'available' : 'unavailable',
    isVisibleInStore: true,
    showWhenUnavailable: !isActive,
  };
};

const normalizeProductRecord = (product = {}, categories = mockCategories) => {
  const minimumOrderQty = asNumber(product.minimumOrderQty ?? product.minQty, 1);
  const maximumOrderQtyRaw = asNumber(product.maximumOrderQty ?? product.maxQty, 999);
  const maximumOrderQty = Math.max(maximumOrderQtyRaw, minimumOrderQty);
  const trackInventory = Boolean(product.trackInventory);
  const lowStockThreshold = asNumber(product.lowStockThreshold, 50);
  const providerId = String(product.providerId || product.supplierId || product.provider || '').trim();
  const providerProductId = String(
    product.providerProductId
    || product.providerProduct
    || product.externalProductId
    || ''
  ).trim();
  const externalProductId = String(
    product.externalProductId
    || product.providerProductId
    || product.providerProduct
    || ''
  ).trim();
  const manualPriceAdjustment = product.manualPriceAdjustment ?? '';
  const purchaseAccountNumber = String(
    product.purchaseAccountNumber
    || product.accountNumber
    || product.productAccountNumber
    || ''
  ).trim();
  const showPurchaseAccountNumber = Boolean(
    product.showPurchaseAccountNumber
    ?? product.showAccountNumber
    ?? product.displayAccountNumber
    ?? false
  );
  const syncPriceWithProvider = product.syncPriceWithProvider !== undefined
    ? Boolean(product.syncPriceWithProvider)
    : Boolean(providerId && providerProductId && (
      product.externalPricingMode === 'use_supplier_price'
      || product.externalPricingMode === 'supplier_price_plus_margin'
      || product.pricingMode === 'sync'
    ));
  const externalPricingMode = product.externalPricingMode
    || (syncPriceWithProvider ? 'use_supplier_price' : 'use_local_price');
  const rawPayload = product.rawPayload && typeof product.rawPayload === 'object' ? product.rawPayload : {};
  const explicitProductStatus = String(product.productStatus || '').trim().toLowerCase();
  const rawStatus = String(product.status || '').trim().toLowerCase();
  const hasExplicitIsActive = product.isActive !== undefined && product.isActive !== null;
  const explicitIsActiveValue = String(product.isActive ?? '').trim().toLowerCase();
  const explicitlyInactive = hasExplicitIsActive && (
    product.isActive === false
    || product.isActive === 0
    || explicitIsActiveValue === 'false'
    || explicitIsActiveValue === '0'
    || explicitIsActiveValue === 'inactive'
  );
  // Prefer the safest state when API fields disagree: stopped/unavailable wins.
  const isStopped = explicitlyInactive
    || rawStatus === 'inactive'
    || explicitProductStatus === 'unavailable';
  const isExplicitlyHidden = rawStatus === 'hidden' || explicitProductStatus === 'hidden';
  const isDeleted = Boolean(product.deletedAt || product.isDeleted === true);
  const normalizedStatus = isStopped ? 'inactive' : 'active';
  const resolvedProductStatus = String(product.productStatus || '').trim().toLowerCase() === 'unavailable' || isStopped
    ? 'unavailable'
    : 'available';
  const resolvedBasePrice = pickUsablePriceValue(
    product.basePriceCoins,
    product.basePrice,
    product.priceCoins,
    product.price,
    product.product_price,
    rawPayload.product_price,
    product.displayPrice,
    product.finalPrice,
    product.markedUpPriceUSD
  );
  const resolvedDisplayPrice = pickUsablePriceValue(
    product.displayPrice,
    product.finalPrice,
    product.markedUpPriceUSD,
    product.priceCoins,
    product.price,
    product.product_price,
    rawPayload.product_price,
    resolvedBasePrice
  );

  const normalized = {
    ...product,
    basePriceCoins: resolvedBasePrice,
    basePrice: pickUsablePriceValue(product.basePrice, resolvedBasePrice),
    displayPrice: resolvedDisplayPrice,
    category: resolveCategoryId(product.category, categories),
    status: normalizedStatus || 'active',
    productStatus: resolvedProductStatus,
    isVisibleInStore: !isDeleted && !isExplicitlyHidden && product.isVisibleInStore !== false,
    showWhenUnavailable: product.showWhenUnavailable !== undefined
      ? Boolean(product.showWhenUnavailable)
      : resolvedProductStatus === 'unavailable',
    enableSchedule: Boolean(product.enableSchedule),
    scheduledStartAt: product.scheduledStartAt || null,
    scheduledEndAt: product.scheduledEndAt || null,
    scheduleVisibilityMode: product.scheduleVisibilityMode || 'hide',
    pauseSales: Boolean(product.pauseSales),
    pauseReason: product.pauseReason || '',
    internalNotes: product.internalNotes || '',
    minimumOrderQty,
    maximumOrderQty,
    stepQty: Math.max(asNumber(product.stepQty, 1), 1),
    trackInventory,
    stockQuantity: asNumber(product.stockQuantity, 999),
    lowStockThreshold: Math.max(lowStockThreshold, 0),
    hideWhenOutOfStock: Boolean(product.hideWhenOutOfStock),
    showOutOfStockLabel: product.showOutOfStockLabel !== false,
    providerId,
    providerProductId,
    supplierId: providerId,
    externalProductId,
    externalProductName: product.externalProductName || '',
    purchaseAccountNumber,
    accountNumber: product.accountNumber || purchaseAccountNumber,
    showPurchaseAccountNumber,
    showAccountNumber: product.showAccountNumber ?? showPurchaseAccountNumber,
    autoFulfillmentEnabled: product.autoFulfillmentEnabled !== false,
    fallbackSupplierId: product.fallbackSupplierId || '',
    supplierFieldMappings: Array.isArray(product.supplierFieldMappings) ? product.supplierFieldMappings : [],
    externalPricingMode,
    supplierMarginType: product.supplierMarginType || 'fixed',
    supplierMarginValue: asNumber(product.supplierMarginValue, 0),
    supplierNotes: product.supplierNotes || '',
    syncPriceWithProvider,
    enableManualPrice: product.enableManualPrice !== undefined
      ? Boolean(product.enableManualPrice)
      : Number(manualPriceAdjustment || 0) !== 0,
    manualPriceAdjustment,
    syncedProviderBasePrice: product.syncedProviderBasePrice ?? null,
    originalPriceCoins: product.originalPriceCoins ?? product.originalPrice ?? product.costPrice ?? '',
    dynamicFields: Array.isArray(product.dynamicFields) ? product.dynamicFields : [],
    searchIndex: product.searchIndex || buildProductSearchIndex(product),
  };

  normalized.minQty = normalized.minimumOrderQty;
  normalized.maxQty = normalized.maximumOrderQty;

  if (!normalized.trackInventory) {
    normalized.stockQuantity = 999;
    normalized.lowStockThreshold = 0;
    normalized.hideWhenOutOfStock = false;
    normalized.showOutOfStockLabel = true;
  }

  return normalized;
};

const normalizeProducts = (products, categories = mockCategories) => {
  if (!Array.isArray(products)) {
    return mockProducts.map((p) => normalizeProductRecord(p, categories));
  }
  return products.map((p) => normalizeProductRecord(p, categories));
};

const deriveCategoriesFromProducts = (products = []) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const unique = new Map();

  safeProducts.forEach((product) => {
    const rawCategory = product?.category;
    const hasCategoryObject = rawCategory && typeof rawCategory === 'object' && !Array.isArray(rawCategory);

    const categoryId = String(
      (hasCategoryObject ? (rawCategory?._id || rawCategory?.id) : rawCategory) ||
      product?.categoryId ||
      ''
    ).trim();
    if (!categoryId) return;

    if (unique.has(categoryId)) return;

    const fallbackNameFromProduct = String(
      product?.categoryName
      || product?.categoryTitle
      || product?.categoryLabel
      || product?.categoryAr
      || ''
    ).trim();
    const fallbackNameArFromProduct = String(
      product?.categoryNameAr
      || product?.categoryTitleAr
      || product?.categoryLabelAr
      || product?.categoryAr
      || ''
    ).trim();

    const categoryName = String(
      (hasCategoryObject
        ? (rawCategory?.name || rawCategory?.title)
        : (looksLikeObjectId(categoryId) ? fallbackNameFromProduct : categoryId)
      ) ||
      categoryId
    ).trim() || categoryId;
    const categoryNameAr = String(
      (hasCategoryObject
        ? (rawCategory?.nameAr || rawCategory?.titleAr)
        : (looksLikeObjectId(categoryId) ? (fallbackNameArFromProduct || fallbackNameFromProduct || categoryName) : categoryName)
      ) ||
      categoryName
    ).trim() || categoryName;

    const categoryImage = String(
      (hasCategoryObject ? (rawCategory?.image || rawCategory?.icon) : '') ||
      product?.categoryImage ||
      product?.image ||
      ''
    ).trim() || null;

    unique.set(categoryId, {
      id: categoryId,
      name: categoryName,
      nameAr: categoryNameAr,
      ...(categoryImage ? { image: categoryImage } : {}),
    });
  });

  return Array.from(unique.values());
};

clearLegacyProductCaches();
const initialCache = isRealProvider ? readSessionCache() : null;
const initialCategories = initialCache?.categories && initialCache.categories.length
  ? initialCache.categories
  : (isRealProvider ? [] : mockCategories);
const initialProducts = isRealProvider ? [] : normalizeProducts(mockProducts, mockCategories);
const initialLastLoadedAt = initialCache?.lastLoadedAt && Number.isFinite(initialCache.lastLoadedAt)
  ? initialCache.lastLoadedAt
  : 0;

const useMediaStore = create((set, get) => ({
  products: initialProducts,
  categories: initialCategories,
  isLoading: false,
  error: null,
  lastLoadedAt: initialLastLoadedAt,

  resetProducts: () => {
    clearSessionCache();
    set({
      products: normalizeProducts(mockProducts, mockCategories),
      categories: mockCategories,
      lastLoadedAt: 0,
    });
  },

  loadProducts: ({ force = true, bypassCache = false } = {}) => {
    const state = get();
    const hasProducts = Array.isArray(state.products) && state.products.length > 0;
    const hasCategories = Array.isArray(state.categories) && state.categories.length > 0;
    const lastLoadedAt = Number(state.lastLoadedAt || 0);
    const cacheAge = lastLoadedAt ? (Date.now() - lastLoadedAt) : Number.POSITIVE_INFINITY;
    const cacheIsFresh = cacheAge >= 0 && cacheAge < PRODUCTS_CACHE_TTL;

    // Serve cached data immediately when available and still fresh.
    // This keeps pages responsive even if callers pass force=true frequently.
    const canUseProductsCache = !isRealProvider && !bypassCache;

    if (canUseProductsCache && hasProducts && hasCategories && cacheIsFresh) {
      return Promise.resolve({
        products: state.products,
        categories: state.categories,
      });
    }

    if (canUseProductsCache && !force && hasProducts && hasCategories) {
      return Promise.resolve({
        products: state.products,
        categories: state.categories,
      });
    }

        if (productsRequest) {
          return productsRequest;
        }

        set({ isLoading: !(hasProducts && hasCategories), error: null });

        productsRequest = Promise.all([apiClient.products.list(), apiClient.categories.list()])
          .then(async ([products, categories]) => {
            const resolvedCategories = Array.isArray(categories) && categories.length ? categories : [];

            let safeCategories = isRealProvider
              ? (resolvedCategories.length ? resolvedCategories : deriveCategoriesFromProducts(products))
              : (() => {
                const persistedCategories = get().categories;
                if (resolvedCategories.length) return resolvedCategories;
                if (Array.isArray(persistedCategories) && persistedCategories.length) return persistedCategories;
                return mockCategories;
              })();

            if (isRealProvider && !resolvedCategories.length && typeof apiClient?.categories?.get === 'function') {
              const unresolved = (Array.isArray(safeCategories) ? safeCategories : []).filter((category) => {
                const id = String(category?.id || '').trim();
                if (!looksLikeObjectId(id)) return false;
                const name = String(category?.name || '').trim();
                const nameAr = String(category?.nameAr || '').trim();
                const missingName = !name || name === id || looksLikeObjectId(name);
                const missingNameAr = !nameAr || nameAr === id || looksLikeObjectId(nameAr);
                return missingName && missingNameAr;
              });

              if (unresolved.length) {
                const results = await Promise.allSettled(unresolved.map((category) => apiClient.categories.get(category.id)));
                const resolvedById = new Map();
                results.forEach((result, index) => {
                  if (result.status === 'fulfilled' && result.value) {
                    resolvedById.set(String(unresolved[index].id).trim(), result.value);
                  }
                });

                if (resolvedById.size) {
                  safeCategories = safeCategories.map((category) => {
                    const id = String(category?.id || '').trim();
                    if (!resolvedById.has(id)) return category;
                    const resolvedCategory = resolvedById.get(id);
                    return {
                      ...category,
                      ...resolvedCategory,
                      id,
                    };
                  });
                }
              }
            }

            const normalizedProducts = normalizeProducts(products, safeCategories);
            const loadedAt = Date.now();

            set({
              products: normalizedProducts,
              categories: safeCategories,
              isLoading: false,
              error: null,
              lastLoadedAt: loadedAt,
            });

            writeSessionCache({
              categories: safeCategories,
              lastLoadedAt: loadedAt,
            });

          })
          .catch((error) => {
            const { products, categories } = get();
            if (!Array.isArray(products)) {
              set({ products: normalizeProducts(mockProducts, categories || mockCategories) });
            }
            if (!Array.isArray(categories) || categories.length === 0) {
              set({ categories: mockCategories });
            }

            set({
              isLoading: false,
              error: error?.message || null,
            });
          })
          .finally(() => {
            productsRequest = null;
          });

        return productsRequest;
      },

      addProduct: async (product) => {
        const categories = get().categories || [];
        const newProduct = normalizeProductRecord(
          { ...product, id: product.id || `p${Date.now()}` },
          categories
        );

        const created = await apiClient.products.create(newProduct);
        set((state) => {
          const nextProducts = [
            ...state.products,
            normalizeProductRecord(mergeSavedProductSnapshot(newProduct, created || {}), state.categories),
          ];
          const loadedAt = Date.now();
          writeCategorySnapshotCache({ categories: state.categories, lastLoadedAt: loadedAt });

          return {
            products: nextProducts,
            lastLoadedAt: loadedAt,
          };
        });
        return created || newProduct;
      },

      updateProduct: async (id, updates) => {
        const categories = get().categories || [];
        const current = get().products.find((p) => p.id === id) || {};
        const { statusChanged, nonStatusUpdates } = splitProductStatusUpdate(current, updates);
        const hasNonStatusChanges = hasOwnKeys(nonStatusUpdates);

        if (!hasNonStatusChanges && !statusChanged) {
          return current;
        }

        let nextSnapshot = current;

        if (hasNonStatusChanges) {
          const safeUpdates = normalizeProductRecord(
            { ...current, ...nonStatusUpdates, id },
            categories
          );
          const updated = await apiClient.products.update(id, safeUpdates);
          nextSnapshot = mergeSavedProductSnapshot(safeUpdates, updated || {});
        }

        if (statusChanged) {
          const toggled = await apiClient.products.toggleStatus(id);
          nextSnapshot = mergeSavedProductSnapshot(nextSnapshot, toggled || getToggleFallbackSnapshot(current));
        }

        const normalizedProduct = normalizeProductRecord(
          { ...current, ...nextSnapshot, id },
          categories
        );

        set((state) => {
          const nextProducts = state.products.map((p) => (
            p.id === id ? normalizedProduct : p
          ));
          const loadedAt = Date.now();
          writeCategorySnapshotCache({ categories: state.categories, lastLoadedAt: loadedAt });

          return {
            products: nextProducts,
            lastLoadedAt: loadedAt,
          };
        });

        return normalizedProduct;
      },

      toggleProductStatus: async (id) => {
        const categories = get().categories || [];
        const current = get().products.find((p) => p.id === id);

        if (!current) {
          throw new Error('Product not found');
        }

        const toggled = await apiClient.products.toggleStatus(id);
        const normalizedProduct = normalizeProductRecord(
          mergeSavedProductSnapshot(current, toggled || getToggleFallbackSnapshot(current)),
          categories
        );

        set((state) => {
          const nextProducts = state.products.map((p) => (
            p.id === id ? normalizedProduct : p
          ));
          const loadedAt = Date.now();
          writeCategorySnapshotCache({ categories: state.categories, lastLoadedAt: loadedAt });

          return {
            products: nextProducts,
            lastLoadedAt: loadedAt,
          };
        });

        return normalizedProduct;
      },

      deleteProduct: (id) => {
        apiClient.products.delete(id).then(() => {
          set((state) => {
            const nextProducts = state.products.filter((p) => p.id !== id);
            const loadedAt = Date.now();
            writeCategorySnapshotCache({ categories: state.categories, lastLoadedAt: loadedAt });

            return {
              products: nextProducts,
              lastLoadedAt: loadedAt,
            };
          });
        });
      },

      // Category Actions
      addCategory: async (category) => {
        const newCategory = {
          ...category,
          id: category?.id || `c${Date.now()}`,
        };

        const created = await apiClient.categories.create(newCategory);
        const nextCategory = created || newCategory;

        set((state) => {
          const nextCategories = [...(Array.isArray(state.categories) ? state.categories : []), nextCategory];
          const loadedAt = Date.now();
          writeCategorySnapshotCache({ categories: nextCategories, lastLoadedAt: loadedAt });

          return {
            categories: nextCategories,
            lastLoadedAt: loadedAt,
          };
        });

        return nextCategory;
      },

      updateCategory: async (id, updates) => {
        const normalizedId = String(id || '').trim();
        if (!normalizedId) throw new Error('Category id is required');

        const current = (get().categories || []).find((c) => String(c?.id || '').trim() === normalizedId) || null;
        if (!current) throw new Error('Category not found');

        const safeUpdates = { ...(updates || {}) };
        delete safeUpdates.id;

        const updated = await apiClient.categories.update(normalizedId, safeUpdates);
        const nextCategory = updated || { ...current, ...safeUpdates, id: current.id };

        const oldName = String(current?.name || '').trim();
        const oldNameAr = String(current?.nameAr || '').trim();
        const shouldMigrateCategoryField = (value) => {
          const raw = String(value || '').trim();
          if (!raw) return false;
          return raw === oldName || raw === oldNameAr;
        };

        set((state) => {
          const nextCategories = (Array.isArray(state.categories) ? state.categories : []).map((c) => (
            String(c?.id || '').trim() === normalizedId ? nextCategory : c
          ));

          const nextProducts = (Array.isArray(state.products) ? state.products : []).map((product) => {
            if (!shouldMigrateCategoryField(product?.category)) return product;
            return { ...product, category: normalizedId };
          });

          const normalizedProducts = normalizeProducts(nextProducts, nextCategories);
          const loadedAt = Date.now();
          writeCategorySnapshotCache({ categories: nextCategories, lastLoadedAt: loadedAt });

          return {
            categories: nextCategories,
            products: normalizedProducts,
            lastLoadedAt: loadedAt,
          };
        });

        return nextCategory;
      },
      
      deleteCategory: async (id) => {
        await apiClient.categories.delete(id);

        set((state) => {
          const safeCategories = Array.isArray(state.categories) ? state.categories : [];
          const safeProducts = Array.isArray(state.products) ? state.products : [];
          const toDelete = safeCategories.find((c) => c.id === id);
          const shouldDeleteProduct = (p) => {
            const raw = String(p?.category || '').trim();
            if (!toDelete) return raw === id;
            return raw === id || raw === String(toDelete.name || '').trim() || raw === String(toDelete.nameAr || '').trim();
          };

          const nextCategories = safeCategories.filter((c) => c.id !== id);
          const nextProducts = safeProducts.filter((p) => !shouldDeleteProduct(p));
          const loadedAt = Date.now();
          writeCategorySnapshotCache({ categories: nextCategories, lastLoadedAt: loadedAt });

          return {
            categories: nextCategories,
            products: nextProducts,
            lastLoadedAt: loadedAt,
          };
        });

        return { success: true };
      },

      fetchProducts: async () => get().loadProducts({ force: true })
}));

export default useMediaStore;
