const PAYMENT_METHOD_FIELDS = {
  mobile_wallet: ['amount'],
  site_wallet: [],
  bank_transfer: ['amount'],
  credit_card: ['amount', 'cardNumber', 'expiryDate', 'cvv'],
  usdt: ['amount'],
};

const ALLOWED_METHOD_TYPES = Object.keys(PAYMENT_METHOD_FIELDS);

const slugifyToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const createPaymentEntityId = (prefix = 'item', value = '') => {
  const token = slugifyToken(value);
  const unique = Math.random().toString(36).slice(2, 7);
  return token ? `${prefix}-${token}-${unique}` : `${prefix}-${Date.now()}-${unique}`;
};

const normalizeFeePercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const clamped = Math.min(100, Math.max(0, parsed));
  return Number(clamped.toFixed(2));
};

export const normalizePaymentMethodType = (type = 'mobile_wallet') => {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized === 'paypal' || normalized === 'crypto' || normalized === 'usdt') return 'usdt';
  return ALLOWED_METHOD_TYPES.includes(normalized) ? normalized : 'mobile_wallet';
};

export const getPaymentFieldsForType = (type = 'mobile_wallet') =>
  PAYMENT_METHOD_FIELDS[normalizePaymentMethodType(type)] || PAYMENT_METHOD_FIELDS.mobile_wallet;

export const createDefaultPaymentGroups = () => [
  {
    id: 'default-egypt-wallets',
    name: 'محافظ مصر',
    description: 'طرق دفع افتراضية لطلبات التارجت',
    currency: 'EGP',
    isActive: true,
    methods: [
      {
        id: 'vodafone cash',
        name: 'فودافون كاش',
        type: 'mobile_wallet',
        isActive: true,
      },
      {
        id: 'instapay',
        name: 'إنستا باي',
        type: 'mobile_wallet',
        isActive: true,
      },
      {
        id: 'orange cash',
        name: 'أورانج كاش',
        type: 'mobile_wallet',
        isActive: true,
      },
      {
        id: 'etisalat cash',
        name: 'اتصالات كاش',
        type: 'mobile_wallet',
        isActive: true,
      },
    ],
  },
];

export const normalizePaymentMethodToken = (value) =>
  String(value || '').trim().toLowerCase();

const PAYMENT_METHOD_ALIASES = {
  'vodafone cash': ['vodafone', 'فودافون كاش'],
  vodafone: ['vodafone cash', 'فودافون كاش'],
  'فودافون كاش': ['vodafone', 'vodafone cash'],
  instapay: ['insta pay', 'إنستا باي'],
  'insta pay': ['instapay', 'إنستا باي'],
  'إنستا باي': ['instapay', 'insta pay'],
  'orange cash': ['orange', 'أورانج كاش', 'اورانج كاش'],
  orange: ['orange cash', 'أورانج كاش', 'اورانج كاش'],
  'أورانج كاش': ['orange', 'orange cash', 'اورانج كاش'],
  'اورانج كاش': ['orange', 'orange cash', 'أورانج كاش'],
  'etisalat cash': ['etisalat', 'اتصالات كاش'],
  etisalat: ['etisalat cash', 'اتصالات كاش'],
  'اتصالات كاش': ['etisalat', 'etisalat cash'],
  binance: ['بينانس'],
  'بينانس': ['binance'],
  'site wallet': ['site_wallet', 'wallet', 'محفظة الموقع', 'محفظه الموقع'],
  site_wallet: ['site wallet', 'wallet', 'محفظة الموقع', 'محفظه الموقع'],
  wallet: ['site wallet', 'site_wallet', 'محفظة الموقع', 'محفظه الموقع'],
  'محفظة الموقع': ['site wallet', 'site_wallet', 'wallet', 'محفظه الموقع'],
  'محفظه الموقع': ['site wallet', 'site_wallet', 'wallet', 'محفظة الموقع'],
};

const getPaymentMethodTokenVariants = (value) => {
  const token = normalizePaymentMethodToken(value);
  if (!token) return [];
  return [token, ...(PAYMENT_METHOD_ALIASES[token] || []).map(normalizePaymentMethodToken)];
};

export const normalizePaymentMethod = (method = {}, index = 0) => {
  const type = normalizePaymentMethodType(method?.type);
  const name = String(method?.name || '').trim() || `Payment Method ${index + 1}`;
  const id = String(method?.id || '').trim() || createPaymentEntityId('method', name);
  const fields = Array.isArray(method?.fields) && method.fields.length
    ? method.fields.map((field) => String(field || '').trim()).filter(Boolean)
    : getPaymentFieldsForType(type);

  return {
    id,
    name,
    description: String(method?.description || '').trim(),
    type,
    accountNumber: String(method?.accountNumber || '').trim(),
    accountName: String(method?.accountName || '').trim(),
    bankName: String(method?.bankName || '').trim(),
    feePercent: normalizeFeePercent(method?.feePercent),
    instructions: String(method?.instructions || '').trim(),
    image: String(method?.image || method?.imageUrl || method?.logo || '').trim(),
    imageName: String(method?.imageName || '').trim(),
    isActive: method?.isActive !== false,
    fields,
  };
};

export const normalizePaymentGroup = (group = {}, index = 0) => {
  const name = String(group?.name || '').trim() || `Payment Group ${index + 1}`;
  const id = String(group?.id || '').trim() || createPaymentEntityId('group', name);
  const methods = (Array.isArray(group?.methods) ? group.methods : [])
    .map((method, methodIndex) => normalizePaymentMethod(method, methodIndex))
    .filter((method) => method.name);

  return {
    id,
    name,
    description: String(group?.description || '').trim(),
    currency: String(group?.currency || group?.currencyCode || '').trim(),
    image: String(group?.image || group?.imageUrl || group?.logo || '').trim(),
    imageName: String(group?.imageName || '').trim(),
    isActive: group?.isActive !== false,
    methods,
  };
};

export const normalizePaymentGroups = (groups, { fallbackToDefault = true } = {}) => {
  const source = Array.isArray(groups) ? groups : [];
  const normalized = source
    .map((group, index) => normalizePaymentGroup(group, index))
    .filter((group) => group.id && group.name);

  if (normalized.length) return normalized;
  return fallbackToDefault ? createDefaultPaymentGroups() : [];
};

export const getActivePaymentGroups = (settings, options = {}) => {
  const activeGroups = normalizePaymentGroups(settings?.paymentGroups, options).map((group) => ({
    ...group,
    methods: group.methods.filter((method) => method.isActive !== false),
  })).filter((group) => group.isActive !== false && group.methods.length > 0);

  if (activeGroups.length || options?.fallbackToDefault === false) return activeGroups;

  return createDefaultPaymentGroups().map((group) => ({
    ...group,
    methods: group.methods.filter((method) => method.isActive !== false),
  })).filter((group) => group.isActive !== false && group.methods.length > 0);
};

export const getActivePaymentMethods = (settings, options = {}) =>
  getActivePaymentGroups(settings, options).flatMap((group) => (
    group.methods.map((method) => ({
      ...method,
      groupId: group.id,
      groupName: group.name,
      groupCurrency: group.currency,
    }))
  ));

export const isPaymentMethodAllowed = (method, allowedValues = []) => {
  const allowedTokens = new Set(
    (Array.isArray(allowedValues) ? allowedValues : [])
      .flatMap(getPaymentMethodTokenVariants)
      .filter(Boolean)
  );

  if (!allowedTokens.size) return false;

  return [
    method?.id,
    method?.name,
    method?.paymentMethod,
    method?.paymentMethodName,
  ].some((value) => getPaymentMethodTokenVariants(value).some((token) => allowedTokens.has(token)));
};

export const isSiteWalletPaymentMethod = (methodOrValue) => {
  const values = typeof methodOrValue === 'object' && methodOrValue !== null
    ? [methodOrValue.id, methodOrValue.name, methodOrValue.paymentMethod, methodOrValue.paymentMethodName, methodOrValue.type]
    : [methodOrValue];

  return values.some((value) => getPaymentMethodTokenVariants(value)
    .some((token) => ['site wallet', 'site_wallet', 'wallet', 'محفظة الموقع', 'محفظه الموقع'].includes(token)));
};

const TARGET_REQUIRED_PAYMENT_METHODS = [
  { id: 'vodafone cash', name: 'فودافون كاش', type: 'mobile_wallet', isActive: true },
  { id: 'etisalat cash', name: 'اتصالات كاش', type: 'mobile_wallet', isActive: true },
  { id: 'orange cash', name: 'أورانج كاش', type: 'mobile_wallet', isActive: true },
  { id: 'instapay', name: 'إنستا باي', type: 'mobile_wallet', isActive: true },
  { id: 'site_wallet', name: 'محفظة الموقع', type: 'site_wallet', isActive: true },
];

export const getTargetPaymentMethods = (settings) => {
  const activeMethods = getActivePaymentMethods(settings, { fallbackToDefault: true });

  return TARGET_REQUIRED_PAYMENT_METHODS.map((required, index) => {
    const existing = activeMethods.find((method) => isPaymentMethodAllowed(method, [required.id, required.name]));
    return normalizePaymentMethod(existing || required, index);
  });
};

export const findPaymentMethodById = (settings, methodId, options = {}) => {
  const targetId = String(methodId || '').trim();
  if (!targetId) return null;

  const groups = normalizePaymentGroups(settings?.paymentGroups, options);
  for (const group of groups) {
    if (group.isActive === false) continue;
    const method = group.methods.find((item) => item.id === targetId && item.isActive !== false);
    if (method) {
      return { group, method };
    }
  }

  return null;
};

