import { useEffect } from 'react';

const upsertMeta = (selector, createAttributes, valueAttribute, value) => {
  if (typeof document === 'undefined' || !value) return;

  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(createAttributes).forEach(([key, attributeValue]) => {
      element.setAttribute(key, attributeValue);
    });
    element.setAttribute('data-seo-managed', 'true');
    document.head.appendChild(element);
  }

  element.setAttribute(valueAttribute, value);
};

const upsertLink = (rel, href) => {
  if (typeof document === 'undefined' || !href) return;

  let element = document.head.querySelector(`link[rel="${rel}"][data-seo-managed="true"]`)
    || document.head.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    element.setAttribute('data-seo-managed', 'true');
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
};

const removeManagedJsonLd = () => {
  if (typeof document === 'undefined') return;
  document.head
    .querySelectorAll('script[type="application/ld+json"][data-seo-managed="true"]')
    .forEach((element) => element.remove());
};

const Seo = ({
  title,
  description,
  keywords,
  canonicalUrl,
  image,
  language = 'ar',
  jsonLd = [],
}) => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const safeTitle = title || 'N&A HUB';
    document.title = safeTitle;
    document.documentElement.lang = language === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

    upsertMeta('meta[name="description"]', { name: 'description' }, 'content', description);
    upsertMeta('meta[name="keywords"]', { name: 'keywords' }, 'content', keywords);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, 'content', 'index, follow, max-image-preview:large');
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, 'content', safeTitle);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, 'content', description);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'content', 'website');
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale' }, 'content', language === 'ar' ? 'ar_EG' : 'en_US');
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'content', image ? 'summary_large_image' : 'summary');
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, 'content', safeTitle);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, 'content', description);

    if (canonicalUrl) {
      upsertLink('canonical', canonicalUrl);
      upsertMeta('meta[property="og:url"]', { property: 'og:url' }, 'content', canonicalUrl);
    }

    if (image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image' }, 'content', image);
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, 'content', image);
    }

    removeManagedJsonLd();
    (Array.isArray(jsonLd) ? jsonLd : []).filter(Boolean).forEach((item) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-managed', 'true');
      script.textContent = JSON.stringify(item);
      document.head.appendChild(script);
    });

    return undefined;
  }, [canonicalUrl, description, image, jsonLd, keywords, language, title]);

  return null;
};

export default Seo;
