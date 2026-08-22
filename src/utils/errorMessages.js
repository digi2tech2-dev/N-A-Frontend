import i18n from '../i18n';

const COPY = {
  generic: {
    ar: 'حدث خطأ غير متوقع. حاول مرة أخرى، وإذا استمرت المشكلة تواصل مع الدعم.',
    en: 'Something went wrong. Try again, and contact support if the issue continues.',
  },
  network: {
    ar: 'يجب التأكد من اتصالك بالـ WI-FI ثم حاول مرة أخرى.',
    en: 'Could not reach the server. Check your connection or backend, then try again.',
  },
  timeout: {
    ar: 'استغرق الطلب وقتًا أطول من المتوقع. حاول مرة أخرى بعد لحظات.',
    en: 'The request took too long. Try again in a moment.',
  },
  session: {
    ar: 'انتهت الجلسة. سجّل الدخول مرة أخرى ثم أعد المحاولة.',
    en: 'Your session expired. Sign in again, then retry.',
  },
  forbidden: {
    ar: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
    en: 'You do not have permission to complete this action.',
  },
  notFound: {
    ar: 'العنصر غير موجود أو تم حذفه. حدّث الصفحة ثم حاول مرة أخرى.',
    en: 'The item was not found. Refresh the page and try again.',
  },
  server: {
    ar: 'مشكلة في الخادم. حاول بعد قليل، وإذا استمرت المشكلة تواصل مع الدعم.',
    en: 'Server issue. Try again later, or contact support if it continues.',
  },
  validation: {
    ar: 'راجع البيانات المطلوبة ثم حاول مرة أخرى.',
    en: 'Review the required details, then try again.',
  },
  invalidCredentials: {
    ar: 'بيانات الدخول غير صحيحة. راجع البريد الإلكتروني وكلمة المرور ثم حاول مرة أخرى.',
    en: 'The sign-in details are incorrect. Check your email and password, then try again.',
  },
  emailExists: {
    ar: 'هذا البريد مستخدم بالفعل. سجّل الدخول به أو استخدم بريدًا آخر.',
    en: 'This email is already in use. Sign in with it or use another email.',
  },
  invalidEmail: {
    ar: 'صيغة البريد غير صحيحة. اكتب بريدًا مثل name@example.com.',
    en: 'The email format is invalid. Use an address like name@example.com.',
  },
  weakPassword: {
    ar: 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع أرقام أو رموز.',
    en: 'The password is too weak. Use at least 8 characters with numbers or symbols.',
  },
  required: {
    ar: 'أكمل البيانات المطلوبة ثم حاول مرة أخرى.',
    en: 'Complete the required fields, then try again.',
  },
  duplicate: {
    ar: 'هذه البيانات مستخدمة بالفعل. استخدم قيمة مختلفة ثم حاول مرة أخرى.',
    en: 'This value is already in use. Use a different value, then try again.',
  },
  insufficientBalance: {
    ar: 'الرصيد غير كافٍ لإتمام العملية.',
    en: 'Insufficient balance to complete this action.',
  },
  invalidAmount: {
    ar: 'المبلغ غير صالح. أدخل مبلغًا صحيحًا ثم حاول مرة أخرى.',
    en: 'Invalid amount. Enter a valid amount, then try again.',
  },
  upload: {
    ar: 'تعذر رفع الملف. تأكد من الصيغة والحجم ثم حاول مرة أخرى.',
    en: 'Could not upload the file. Check the format and size, then try again.',
  },
  priceChanged: {
    ar: 'تغيّر سعر المنتج. راجع السعر الجديد ثم أعد تنفيذ الطلب.',
    en: 'The product price changed. Review the new price, then place the order again.',
  },
  twoFactorInvalid: {
    ar: 'كود التحقق غير صحيح. تأكد من آخر رسالة في بريدك ثم حاول مرة أخرى.',
    en: 'The verification code is incorrect. Check the latest email, then try again.',
  },
  twoFactorExpired: {
    ar: 'انتهت صلاحية كود التحقق. اطلب كودًا جديدًا ثم حاول مرة أخرى.',
    en: 'The verification code expired. Request a new code, then try again.',
  },
  rateLimit: {
    ar: 'محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مرة أخرى.',
    en: 'Too many attempts in a short time. Wait a bit, then try again.',
  },
};

const getLanguage = (language) => {
  const value = String(
    language
      || i18n.resolvedLanguage
      || i18n.language
      || (typeof document !== 'undefined' ? document.documentElement.lang : '')
      || 'ar'
  ).toLowerCase();

  return value.startsWith('en') ? 'en' : 'ar';
};

const pick = (key, language) => COPY[key]?.[getLanguage(language)] || COPY.generic[getLanguage(language)];

const includesAny = (value, patterns) => patterns.some((pattern) => value.includes(pattern));

const looksArabic = (value) => /[\u0600-\u06FF]/.test(String(value || ''));

const withPeriod = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return normalized;
  return /[.!?؟]$/.test(normalized) ? normalized : `${normalized}.`;
};

const extractRawMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error == null) return '';

  return String(
    error?.userMessage
      || error?.response?.data?.message
      || error?.response?.data?.error
      || error?.data?.message
      || error?.data?.error
      || error?.message
      || error
      || ''
  );
};

const cleanupMessage = (value) => String(value || '')
  .replace(/^error:\s*/i, '')
  .replace(/^request failed with status code \d+\.?\s*/i, '')
  .replace(/^axioserror:\s*/i, '')
  .replace(/\b(status code|status)\s*[:=]?\s*\d{3}\b/gi, '')
  .replace(/\b(doctype html|html|body|pre)\b/gi, '')
  .replace(/[{}[\]"`]/g, ' ')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const getStatus = (error) => Number(error?.status || error?.response?.status || error?.data?.status || 0);

const getCode = (error) => String(
  error?.code
    || error?.response?.data?.code
    || error?.data?.code
    || ''
).toLowerCase();

export const getReadableErrorMessage = (error, fallback, options = {}) => {
  const language = getLanguage(options.language);
  const status = getStatus(error);
  const code = getCode(error);
  const raw = extractRawMessage(error);
  const clean = cleanupMessage(raw);
  const message = clean.toLowerCase();
  const fallbackText = fallback ? cleanupMessage(fallback) : '';

  if (!clean && !status && !code) return fallbackText || pick('generic', language);

  if (
    includesAny(message, ['network error', 'failed to fetch', 'load failed', 'internet disconnected', 'err network'])
    || includesAny(code, ['network_error', 'econnreset', 'enotfound', 'econnrefused'])
  ) {
    return pick('network', language);
  }

  if (
    status === 408
    || includesAny(message, ['timeout', 'timed out', 'socket hang up', 'aborted'])
    || includesAny(code, ['ecconnaborted', 'timeout'])
  ) {
    return pick('timeout', language);
  }

  if (status === 401 || includesAny(code, ['token_expired', 'jwt_expired', 'invalid_token']) || (
    includesAny(message, ['jwt', 'token', 'session']) && includesAny(message, ['expired', 'invalid', 'missing', 'malformed'])
  )) {
    return pick('session', language);
  }

  if (status === 403 || includesAny(message, ['forbidden', 'permission', 'not allowed', 'access denied', 'insufficient permissions'])) {
    return pick('forbidden', language);
  }

  if (status === 404 || includesAny(message, ['not found', 'does not exist'])) {
    return pick('notFound', language);
  }

  if (status === 429 || includesAny(message, ['too many requests', 'rate limit', 'too many attempts'])) {
    return pick('rateLimit', language);
  }

  if (status >= 500 || includesAny(message, ['internal server error', 'bad gateway', 'service unavailable', 'gateway timeout'])) {
    return pick('server', language);
  }

  if (
    includesAny(code, ['provider_price_increased'])
    || includesAny(message, ['price increased', 'price changed', 'supplier price'])
  ) {
    return pick('priceChanged', language);
  }

  if (includesAny(message, ['invalid verification code', 'invalid 2fa', 'invalid two factor', 'invalid otp'])) {
    return pick('twoFactorInvalid', language);
  }

  if (includesAny(message, ['verification has expired', 'code has expired', 'expired verification', '2fa setup verification has expired'])) {
    return pick('twoFactorExpired', language);
  }

  if (includesAny(message, ['invalid email or password', 'invalid credentials', 'wrong password', 'incorrect password', 'bad credentials'])) {
    return pick('invalidCredentials', language);
  }

  if (includesAny(message, ['email already registered', 'email already exists', 'duplicate email'])) {
    return pick('emailExists', language);
  }

  if (includesAny(message, ['duplicate', 'already exists', 'already registered', 'must be unique'])) {
    return pick('duplicate', language);
  }

  if (includesAny(message, ['invalid email', 'valid email', 'email format'])) {
    return pick('invalidEmail', language);
  }

  if (includesAny(message, ['password must', 'password should', 'password too short', 'weak password', 'minimum 8', 'min 8'])) {
    return pick('weakPassword', language);
  }

  if (includesAny(message, ['insufficient balance', 'not enough balance', 'الرصيد غير كاف'])) {
    return pick('insufficientBalance', language);
  }

  if (includesAny(code, ['invalid_order_amount']) || includesAny(message, ['invalid amount', 'amount must', 'requested amount'])) {
    return pick('invalidAmount', language);
  }

  if (includesAny(message, ['upload', 'file too large', 'invalid file', 'image too large', 'multipart'])) {
    return pick('upload', language);
  }

  if (status === 400 || status === 422 || includesAny(message, ['validation', 'required', 'missing field', 'is required'])) {
    return pick(includesAny(message, ['required', 'missing']) ? 'required' : 'validation', language);
  }

  if (looksArabic(clean)) return withPeriod(clean);

  if (language === 'en') return withPeriod(clean || fallbackText || COPY.generic.en);

  return fallbackText || pick('generic', language);
};

export const getToastMessage = (message, type = 'info', options = {}) => {
  if (type === 'error') {
    return getReadableErrorMessage(message, options.fallback, options);
  }

  const clean = cleanupMessage(extractRawMessage(message));
  return clean || String(message || '').trim();
};
