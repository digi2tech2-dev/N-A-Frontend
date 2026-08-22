import i18n from '../i18n';

const COPY = {
  loginGeneric: {
    ar: 'تعذر تسجيل الدخول: تأكد من بيانات الحساب ثم حاول مرة أخرى.',
    en: 'Could not sign in. Check your account details and try again.',
  },
  registerGeneric: {
    ar: 'تعذر إنشاء الحساب: راجع البيانات المطلوبة ثم حاول مرة أخرى.',
    en: 'Could not create the account. Review the required details and try again.',
  },
  googleGeneric: {
    ar: 'تعذر تسجيل الدخول عبر Google: أعد المحاولة أو استخدم البريد وكلمة المرور.',
    en: 'Could not sign in with Google. Try again or use email and password.',
  },
  invalidCredentials: {
    ar: 'بيانات الدخول غير صحيحة: راجع البريد الإلكتروني وكلمة المرور ثم حاول مرة أخرى.',
    en: 'The sign-in details are incorrect. Check your email and password, then try again.',
  },
  accountNotFound: {
    ar: 'الأكونت غير مسجل: تأكد من البريد أو أنشئ حسابًا جديدًا.',
    en: 'No account exists with this email. Check the address or create a new account.',
  },
  emailExists: {
    ar: 'هذا البريد مستخدم بالفعل: سجّل الدخول به أو استخدم بريدًا آخر.',
    en: 'This email is already in use. Sign in with it or use another email.',
  },
  usernameExists: {
    ar: 'اسم المستخدم مستخدم بالفعل: اختر اسمًا مختلفًا لإكمال التسجيل.',
    en: 'This username is already taken. Choose a different one to continue.',
  },
  invalidEmail: {
    ar: 'صيغة البريد غير صحيحة: اكتب بريدًا مثل name@example.com.',
    en: 'The email format is invalid. Use an address like name@example.com.',
  },
  weakPassword: {
    ar: 'كلمة المرور ضعيفة: استخدم 8 أحرف على الأقل مع أرقام أو رموز.',
    en: 'The password is too weak. Use at least 8 characters with numbers or symbols.',
  },
  pendingApproval: {
    ar: 'حسابك قيد المراجعة: تم تسجيله بنجاح لكنه ينتظر موافقة الإدارة قبل الدخول.',
    en: 'Your account is under review. It was created successfully but needs admin approval before sign-in.',
  },
  verifyEmail: {
    ar: 'البريد غير مؤكد: افتح رسالة التفعيل واضغط رابط التأكيد قبل تسجيل الدخول.',
    en: 'Your email is not verified. Open the activation email and confirm it before signing in.',
  },
  accountRejected: {
    ar: 'لا يمكن الدخول بهذا الحساب: الحساب مرفوض أو غير مفعّل، تواصل مع الدعم.',
    en: 'This account cannot sign in. It is rejected or inactive; contact support.',
  },
  tooManyRequests: {
    ar: 'محاولات كثيرة خلال وقت قصير: انتظر دقيقة ثم جرّب مرة أخرى.',
    en: 'Too many attempts in a short time. Wait a minute, then try again.',
  },
  network: {
    ar: 'يجب التأكد من اتصالك بالـ WI-FI ثم حاول مرة أخرى.',
    en: 'Could not reach the server. Check your connection or backend, then try again.',
  },
  server: {
    ar: 'الخادم لم يكمل طلب الدخول: حاول بعد قليل، وإذا استمرت المشكلة تواصل مع الدعم.',
    en: 'The server could not complete sign-in. Try again later, or contact support if it continues.',
  },
  emailRequired: {
    ar: 'البريد الإلكتروني مطلوب: اكتب البريد المسجل به حسابك.',
    en: 'Email is required. Enter the email registered to your account.',
  },
  passwordRequired: {
    ar: 'كلمة المرور مطلوبة: اكتب كلمة مرور الحساب.',
    en: 'Password is required. Enter your account password.',
  },
  twoFactorInvalid: {
    ar: 'كود التحقق المرسل إلى بريدك الإلكتروني غير صحيح. تأكد من آخر رسالة وحاول مرة أخرى.',
    en: 'The email verification code is incorrect. Check the latest email and try again.',
  },
  twoFactorExpired: {
    ar: 'انتهت صلاحية كود البريد الإلكتروني. سجّل الدخول مرة أخرى لإرسال كود جديد.',
    en: 'The email verification code has expired. Sign in again to send a new code.',
  },
};

const getLanguage = () => {
  const current = String(
    i18n.resolvedLanguage
      || i18n.language
      || (typeof navigator !== 'undefined' ? navigator.language : '')
      || 'ar'
  ).toLowerCase();

  return current.startsWith('en') ? 'en' : 'ar';
};

const pick = (key) => COPY[key]?.[getLanguage()] || COPY.loginGeneric.ar;

const includesAny = (value, patterns) => patterns.some((pattern) => value.includes(pattern));

const cleanupMessage = (value) => String(value || '')
  .replace(/^request failed with status code \d+\s*/i, '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const looksArabic = (value) => /[\u0600-\u06FF]/.test(String(value || ''));

const withPeriod = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return normalized;
  return /[.!?؟]$/.test(normalized) ? normalized : `${normalized}.`;
};

export const formatAuthErrorMessage = (error, { action = 'login' } = {}) => {
  const status = Number(error?.status || error?.response?.status || 0);
  const code = String(error?.code || error?.response?.data?.code || '').toLowerCase();
  const raw = String(
    error?.response?.data?.message
      || error?.response?.data?.error
      || error?.message
      || error
      || ''
  ).trim();
  const message = cleanupMessage(raw).toLowerCase();

  const genericKey = action === 'register'
    ? 'registerGeneric'
    : action === 'google'
      ? 'googleGeneric'
      : 'loginGeneric';

  if (!raw && !status && !code) return pick(genericKey);

  if (
    includesAny(message, ['network error', 'failed to fetch', 'load failed', 'timeout', 'timed out', 'socket hang up'])
    || includesAny(code, ['network_error', 'ecconnaborted', 'econnreset'])
  ) {
    return pick('network');
  }

  if (status >= 500) {
    return pick('server');
  }

  if (
    includesAny(code, ['email_exists', 'duplicate_email', 'user_exists'])
    || includesAny(message, ['email already registered', 'email already exists', 'user already exists', 'account already exists'])
  ) {
    return pick('emailExists');
  }

  if (
    includesAny(code, ['username_exists', 'duplicate_username'])
    || includesAny(message, ['username already exists', 'username already taken', 'username is taken'])
  ) {
    return pick('usernameExists');
  }

  if (
    includesAny(message, ['2fa verification has expired', '2fa setup verification has expired', 'two-factor verification has expired', 'temporary token'])
  ) {
    return pick('twoFactorExpired');
  }

  if (
    includesAny(message, ['invalid 2fa code', 'invalid 2fa setup code', 'invalid two-factor code', 'invalid verification code'])
  ) {
    return pick('twoFactorInvalid');
  }

  if (
    includesAny(message, ['invalid email or password', 'invalid credentials', 'wrong password', 'incorrect password', 'bad credentials', 'authentication failed', 'login failed'])
    || (status === 401 && action !== 'register')
  ) {
    return pick('invalidCredentials');
  }

  if (includesAny(message, ['user not found', 'account not found', 'no user found', 'user does not exist', 'email not found', 'not registered'])) {
    return pick('accountNotFound');
  }

  if (includesAny(message, ['invalid email', 'email is invalid', 'must be a valid email', 'email format'])) {
    return pick('invalidEmail');
  }

  if (includesAny(message, ['password must', 'password should', 'password too short', 'minimum 8', 'min 8', 'weak password'])) {
    return pick('weakPassword');
  }

  if (
    includesAny(message, ['verify your email', 'verify your email address', 'please verify your email', 'confirm your email', 'verification email', 'email not verified', 'email unverified'])
  ) {
    return pick('verifyEmail');
  }

  if (includesAny(message, ['pending approval', 'awaiting approval', 'under review', 'await admin approval', 'pending account approval'])) {
    return pick('pendingApproval');
  }

  if (includesAny(message, ['rejected', 'denied', 'access denied', 'blocked', 'disabled', 'forbidden'])) {
    return pick('accountRejected');
  }

  if (status === 429 || includesAny(message, ['too many requests', 'rate limit', 'too many attempts'])) {
    return pick('tooManyRequests');
  }

  if (message.includes('required')) {
    if (message.includes('email')) return pick('emailRequired');
    if (message.includes('password')) return pick('passwordRequired');
  }

  if (/request failed with status code \d+/i.test(raw)) {
    return pick(genericKey);
  }

  if (looksArabic(raw)) {
    return withPeriod(cleanupMessage(raw));
  }

  return getLanguage() === 'en'
    ? withPeriod(cleanupMessage(raw))
    : pick(genericKey);
};
