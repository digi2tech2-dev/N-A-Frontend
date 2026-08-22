import resolveImageUrl from './imageUrl';

const STORE_NAME = 'N&A HUB';
const DEFAULT_DESCRIPTION = 'N&A HUB لخدمات شحن تطبيقات الدردشة الصوتية، شحن الألعاب، الاشتراكات، البطاقات الرقمية، وخدمات المنتجات الرقمية بسرعة ودقة.';

const SEARCH_PHRASES = [
  'شحن تطبيقات دردشة صوتية',
  'شحن برامج دردشة صوتية',
  'شحن تطبيقات صوتية',
  'شحن العاب',
  'شحن الألعاب',
  'اشتراكات تطبيقات',
  'اشتراكات رقمية',
  'بطاقات رقمية',
  'شحن منتجات رقمية',
  'N&A HUB',
];

const cleanText = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

const truncateText = (value, maxLength = 155) => {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
};

export const getSiteOrigin = () => {
  const configuredUrl = cleanText(import.meta.env.VITE_SITE_URL || import.meta.env.VITE_PUBLIC_SITE_URL);
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
};

export const toAbsoluteUrl = (value) => {
  const resolved = resolveImageUrl(value);
  if (!resolved) return '';
  if (/^https?:\/\//i.test(resolved)) return resolved;

  const origin = getSiteOrigin();
  if (!origin) return resolved;
  return `${origin}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
};

export const getProductSeoName = (product, language = 'ar') => {
  const arabicName = cleanText(product?.nameAr || product?.displayName || product?.name);
  const englishName = cleanText(product?.name || product?.externalProductName);
  return language === 'ar'
    ? cleanText([arabicName, englishName && englishName !== arabicName ? englishName : ''].join(' - '))
    : cleanText([englishName || arabicName, arabicName && arabicName !== englishName ? arabicName : ''].join(' - '));
};

export const getProductSeoDescription = (product, language = 'ar') => {
  const productName = getProductSeoName(product, language);
  const description = cleanText(product?.displayDescription || product?.descriptionAr || product?.description);
  const fallback = language === 'ar'
    ? `شحن ${productName} عبر N&A HUB ضمن خدمات شحن تطبيقات الدردشة الصوتية، الألعاب، الاشتراكات، والمنتجات الرقمية.`
    : `Top up ${productName} through N&A HUB for voice chat apps, games, subscriptions, and digital products.`;

  return truncateText(description || fallback, 220);
};

const getProductPrice = (product) => {
  const value = product?.storefrontPrice ?? product?.price ?? product?.basePrice ?? product?.unitPrice;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price.toFixed(4) : '';
};

const getProductCurrency = (product) => cleanText(product?.currency || product?.currencyCode || 'USD').toUpperCase();

export const buildStoreSeo = ({
  products = [],
  categories = [],
  language = 'ar',
  path = '/',
  title,
  description,
} = {}) => {
  const origin = getSiteOrigin();
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = origin ? `${origin}${canonicalPath}` : canonicalPath;
  const visibleProducts = (Array.isArray(products) ? products : []).filter(Boolean).slice(0, 60);
  const categoryNames = (Array.isArray(categories) ? categories : [])
    .map((category) => cleanText(category?.title || category?.nameAr || category?.name))
    .filter(Boolean)
    .slice(0, 16);

  const productKeywords = visibleProducts
    .flatMap((product) => [product?.nameAr, product?.name, product?.externalProductName])
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 40);

  const seoTitle = title || (
    language === 'ar'
      ? `${STORE_NAME} | شحن تطبيقات الدردشة الصوتية والألعاب والاشتراكات`
      : `${STORE_NAME} | Voice Chat App, Game Topups and Digital Subscriptions`
  );
  const seoDescription = truncateText(description || DEFAULT_DESCRIPTION, 160);
  const keywords = [...SEARCH_PHRASES, ...categoryNames, ...productKeywords].join(', ');

  const productList = visibleProducts.map((product, index) => {
    const name = getProductSeoName(product, language);
    const image = toAbsoluteUrl(product?.image || product?.imageUrl || product?.icon);
    const price = getProductPrice(product);
    const currency = getProductCurrency(product);
    const productUrl = origin && product?.id ? `${origin}/products/${encodeURIComponent(product.id)}` : canonicalUrl;

    return {
      '@type': 'ListItem',
      position: index + 1,
      url: productUrl,
      item: {
        '@type': 'Product',
        name,
        alternateName: cleanText(product?.externalProductName || product?.name),
        image: image ? [image] : undefined,
        description: getProductSeoDescription(product, language),
        sku: cleanText(product?.id || product?._id || product?.externalProductId),
        brand: {
          '@type': 'Brand',
          name: STORE_NAME,
        },
        offers: price ? {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: currency,
          price,
          availability: product?.storefrontStatus?.isPurchasable === false
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        } : undefined,
      },
    };
  });

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: STORE_NAME,
      url: origin || canonicalUrl,
      logo: origin ? `${origin}/android-chrome-192x192.png?v=na-hub-20260731` : '/android-chrome-192x192.png?v=na-hub-20260731',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: STORE_NAME,
      url: origin || canonicalUrl,
      inLanguage: language === 'ar' ? 'ar-EG' : 'en',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: STORE_NAME,
      url: canonicalUrl,
      description: seoDescription,
      areaServed: 'EG',
    },
  ];

  if (productList.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: language === 'ar' ? 'منتجات N&A HUB' : 'N&A HUB Products',
      description: seoDescription,
      itemListElement: productList,
    });
  }

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    canonicalUrl,
    jsonLd,
  };
};
