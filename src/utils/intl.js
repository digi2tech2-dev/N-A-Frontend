const EASTERN_ARABIC_DIGITS = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

const PERSIAN_DIGITS = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

const normalizeLocaleInput = (locale = 'en-US') => String(locale || 'en-US').toLowerCase();

const asFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asValidDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toEnglishDigits = (value) => String(value ?? '')
  .replace(/[٠-٩]/g, (digit) => EASTERN_ARABIC_DIGITS[digit] || digit)
  .replace(/[۰-۹]/g, (digit) => PERSIAN_DIGITS[digit] || digit);

export const getNumericLocale = (locale = 'en-US') => (
  normalizeLocaleInput(locale).startsWith('ar') ? 'ar-EG-u-nu-latn' : 'en-US-u-nu-latn'
);

export const formatNumber = (value, locale = 'en-US', options = {}) => toEnglishDigits(
  new Intl.NumberFormat(getNumericLocale(locale), {
    numberingSystem: 'latn',
    useGrouping: true,
    ...options,
  }).format(asFiniteNumber(value))
);

export const formatDate = (value, locale = 'en-US', options = {}) => {
  const date = asValidDate(value);
  if (!date) return '';

  return toEnglishDigits(
    new Intl.DateTimeFormat(getNumericLocale(locale), {
      numberingSystem: 'latn',
      ...options,
    }).format(date)
  );
};

export const formatDateTime = (value, locale = 'en-US', options = {}) => formatDate(value, locale, options);

export const formatTime = (value, locale = 'en-US', options = {}) => {
  const date = asValidDate(value);
  if (!date) return '';

  return toEnglishDigits(
    new Intl.DateTimeFormat(getNumericLocale(locale), {
      numberingSystem: 'latn',
      hour: 'numeric',
      minute: '2-digit',
      ...options,
    }).format(date)
  );
};
