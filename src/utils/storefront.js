import buyCardsImage from '../assets/slide-1.webp';
import chatAppsImage from '../assets/slide-2.webp';
import gamesChargingImage from '../assets/slide-3.webp';
import brandIconImage from '../assets/logo.PNG';
import { calculateProductPrice } from './pricing';
import { formatNumber } from './intl';
import { getMoneyFormatOptions, toFiniteMoneyNumber } from './money';
import { getProductStatus } from './productStatus';

const CATEGORY_DISPLAY_CONFIG = {
  all: {
    image: brandIconImage,
    titleAr: 'كل الأقسام',
    titleEn: 'All Collections',
    subtitleAr: '',
    subtitleEn: '',
  },
  apps: {
    image: chatAppsImage,
    titleAr: 'تطبيقات مميزة',
    titleEn: 'Premium Apps',
    subtitleAr: 'اشتراكات وخدمات رقمية',
    subtitleEn: 'Subscriptions and services',
  },
  games: {
    image: gamesChargingImage,
    titleAr: 'شحن الألعاب',
    titleEn: 'Game Topups',
    subtitleAr: '',
    subtitleEn: '',
  },
  cards: {
    image: buyCardsImage,
    titleAr: 'بطاقات رقمية',
    titleEn: 'Digital Cards',
    subtitleAr: 'بطاقات هدايا ومدفوعات',
    subtitleEn: 'Gift and payment cards',
  },
};

const categoryOrder = { all: 0, games: 1, apps: 2, cards: 3 };

const normalizeSearchToken = (value) => String(value || '')
  .replace(/[\u0000-\u001F\u007F]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const pickFirstText = (...values) => {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
};

const resolveProductDisplayName = (product, language = 'ar') => (
  language === 'ar' ? product?.nameAr || product?.name : product?.name || product?.nameAr
) || '';

const resolveProductDisplayDescription = (product, language = 'ar') => (
  language === 'ar' ? product?.descriptionAr || product?.description : product?.description || product?.descriptionAr
) || '';

const compareStorefrontProducts = (left, right, language = 'ar') => {
  const orderDelta = Number(left?.displayOrder || 0) - Number(right?.displayOrder || 0);
  if (orderDelta !== 0) return orderDelta;

  return String(left?.displayName || '').localeCompare(
    String(right?.displayName || ''),
    language === 'ar' ? 'ar' : 'en'
  );
};

export const getStorefrontLanguage = (i18n) =>
  String(i18n?.resolvedLanguage || i18n?.language || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';

export const sanitizeStorefrontQuery = (value) => normalizeSearchToken(value);

const shouldKeepUnavailableProductVisible = (product = {}) => {
  if (product?.deletedAt || product?.isDeleted === true || product?.isVisibleInStore === false) {
    return false;
  }

  const status = String(product?.status || '').trim().toLowerCase();
  const productStatus = String(product?.productStatus || '').trim().toLowerCase();
  const stoppedStatuses = new Set([
    'inactive',
    'disabled',
    'disable',
    'stopped',
    'stop',
    'paused',
    'pause',
    'unavailable',
    'not_available',
    'not-available',
    'out_of_service',
    'out-of-service',
    'suspended',
    'blocked',
    'off',
    'closed',
  ]);

  return stoppedStatuses.has(status)
    || product?.isActive === false
    || stoppedStatuses.has(productStatus);
};

export const getCurrencySymbol = (currencyCode = 'USD') => {
  const currencySymbolMap = {
    USD: '$',
    EGP: '£',
    GBP: '£',
    EUR: '€',
    SAR: 'SAR',
    AED: 'AED',
  };

  return currencySymbolMap[String(currencyCode || 'USD').toUpperCase()] || String(currencyCode || 'USD').toUpperCase();
};

export const formatDisplayNumber = (value, locale = 'en-US', compact = false, options = {}) => {
  const {
    minimumFractionDigits,
    maximumFractionDigits,
    ...restOptions
  } = options;
  const fractionOptions = getMoneyFormatOptions(value, {
    compact,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return formatNumber(value, locale, {
    notation: compact ? 'compact' : 'standard',
    ...fractionOptions,
    ...restOptions,
  });
};

export const formatWalletNumber = (value, compact = false, options = {}) => formatDisplayNumber(value, 'en-US', compact, options);

export const formatWalletAmount = (value, currencyCode = 'USD', options = {}) => {
  const {
    compact = false,
    signed = false,
    locale = 'en-US',
    minimumFractionDigits,
    maximumFractionDigits,
  } = options;
  const amount = toFiniteMoneyNumber(value, 0);
  const normalizedCurrency = String(currencyCode || 'USD').toUpperCase();
  const sign = amount < 0 ? '-' : (signed && amount > 0 ? '+' : '');

  return `${sign}${normalizedCurrency} ${formatDisplayNumber(Math.abs(amount), locale, compact, {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
};

export const getCategoryDisplayKey = (category) => {
  const raw = String(category?.id || '').trim().toLowerCase();
  if (CATEGORY_DISPLAY_CONFIG[raw]) return raw;

  const merged = `${category?.id || ''} ${category?.name || ''} ${category?.nameAr || ''}`.toLowerCase();
  if (merged.includes('app') || merged.includes('chat') || merged.includes('دردشة') || merged.includes('تطبيق')) return 'apps';
  if (merged.includes('game') || merged.includes('لعب') || merged.includes('ألعاب')) return 'games';
  if (merged.includes('card') || merged.includes('gift') || merged.includes('بطاق')) return 'cards';

  return raw || 'all';
};

const getCategoryDisplayConfig = (category) => CATEGORY_DISPLAY_CONFIG[getCategoryDisplayKey(category)] || CATEGORY_DISPLAY_CONFIG.all;

export const getCategoryDisplayImage = (category) => category?.image || getCategoryDisplayConfig(category).image || brandIconImage;

export const getCategoryDisplayTitle = (category, language = 'ar') => {
  const config = getCategoryDisplayConfig(category);
  if (category?.id === 'all') {
    return language === 'ar' ? config.titleAr : config.titleEn;
  }

  return language === 'ar'
    ? pickFirstText(category?.nameAr, category?.titleAr, category?.name, category?.title, config.titleAr, config.titleEn)
    : pickFirstText(category?.name, category?.title, category?.nameAr, category?.titleAr, config.titleEn, config.titleAr);
};

export const getCategoryDisplaySubtitle = (category, language = 'ar') => {
  const config = getCategoryDisplayConfig(category);
  return language === 'ar' ? config.subtitleAr : config.subtitleEn;
};

export const createStorefrontProducts = (products, { language = 'ar', userGroup = 'Normal', userGroupPercentage = null } = {}) => (
  Array.isArray(products) ? products : []
).map((product) => ({
  ...product,
  displayName: resolveProductDisplayName(product, language),
  displayDescription: resolveProductDisplayDescription(product, language),
  searchIndex: product?.searchIndex || normalizeSearchToken([
    product?.name,
    product?.nameAr,
    product?.description,
    product?.descriptionAr,
    product?.externalProductName,
  ].join(' ')),
  storefrontPrice: calculateProductPrice(product, userGroup, userGroupPercentage),
  storefrontStatus: getProductStatus(product, language),
})).filter((product) => (
  product.storefrontStatus.isVisible || shouldKeepUnavailableProductVisible(product)
))
  .sort((left, right) => compareStorefrontProducts(left, right, language));

export const filterStorefrontProducts = (products, { searchTerm = '', activeCategory = 'all', language = 'ar' } = {}) => {
  const normalizedSearch = normalizeSearchToken(searchTerm);

  return (Array.isArray(products) ? products : []).filter((product) => {
    const matchesCategory = activeCategory === 'all' || String(product?.category || '').trim() === activeCategory;
    if (!matchesCategory) return false;

    if (!normalizedSearch) return true;

    const haystack = product?.searchIndex || normalizeSearchToken([
      product?.name,
      product?.nameAr,
      product?.description,
      product?.descriptionAr,
      product?.externalProductName,
    ].join(' '));

    return haystack.includes(normalizedSearch);
  });
};

export const createStorefrontCategories = (categories, products, language = 'ar') => {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const countsByCategory = safeProducts.reduce((map, product) => {
    const categoryId = String(product?.category || '').trim();
    if (!categoryId) return map;
    map.set(categoryId, (map.get(categoryId) || 0) + 1);
    return map;
  }, new Map());

  const overview = [
    {
      id: 'all',
      image: CATEGORY_DISPLAY_CONFIG.all.image,
      title: language === 'ar' ? CATEGORY_DISPLAY_CONFIG.all.titleAr : CATEGORY_DISPLAY_CONFIG.all.titleEn,
      subtitle: language === 'ar' ? CATEGORY_DISPLAY_CONFIG.all.subtitleAr : CATEGORY_DISPLAY_CONFIG.all.subtitleEn,
      count: safeProducts.length,
      tone: 'all',
      sortOrder: 0,
    },
    ...safeCategories.map((category) => {
      const rawParent = category?.parentCategory;
      let parentCategory = null;
      if (rawParent) {
        if (typeof rawParent === 'object') parentCategory = rawParent._id || rawParent.id || String(rawParent) || null;
        else if (typeof rawParent === 'string') { const trimmed = rawParent.trim(); parentCategory = trimmed || null; }
        else parentCategory = String(rawParent) || null;
      }
      return {
        id: String(category?.id || '').trim(),
        image: getCategoryDisplayImage(category),
        title: getCategoryDisplayTitle(category, language),
        subtitle: getCategoryDisplaySubtitle(category, language),
        count: countsByCategory.get(String(category?.id || '').trim()) || 0,
        tone: getCategoryDisplayKey(category),
        sortOrder: Number(category?.sortOrder ?? category?.displayOrder),
        parentCategory,
      };
    }),
  ];

  return overview.sort((left, right) => {
    if (left.id === 'all') return -1;
    if (right.id === 'all') return 1;

    const leftOrder = Number.isFinite(left.sortOrder) ? left.sortOrder : null;
    const rightOrder = Number.isFinite(right.sortOrder) ? right.sortOrder : null;

    if (leftOrder !== null && rightOrder !== null) {
      const delta = leftOrder - rightOrder;
      if (delta !== 0) return delta;
      return String(left.title || '').localeCompare(String(right.title || ''), language === 'ar' ? 'ar' : 'en');
    }

    if (leftOrder !== null && rightOrder === null) return -1;
    if (leftOrder === null && rightOrder !== null) return 1;

    const toneDelta = (categoryOrder[left.tone] ?? 99) - (categoryOrder[right.tone] ?? 99);
    if (toneDelta !== 0) return toneDelta;
    return String(left.title || '').localeCompare(String(right.title || ''), language === 'ar' ? 'ar' : 'en');
  });
};
