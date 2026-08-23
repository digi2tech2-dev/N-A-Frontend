import { 
  mockUsers, 
  mockProducts, 
  mockCategories, 
  mockGroups, 
  mockOrders, 
  mockTopups, 
  mockCurrencies,
  mockSuppliers
} from '../data/mockData';
import { isVerificationRequiredStatus, normalizeAccountStatus, normalizeSignupMethod } from '../utils/accountStatus';
import { getWalletBalanceSummary, normalizeMoneyAmount } from '../utils/money';
import { getDefaultWhatsAppNumber, normalizeWhatsAppNumber } from '../utils/whatsapp';
import { createDefaultPaymentGroups, normalizePaymentGroups } from '../utils/paymentSettings';
import { devLogger } from '../utils/devLogger';
import { resolveUserAvatar } from '../utils/avatar';
import {
  resolveOrderExecutionCurrency,
  resolveTopupExecutionCurrency,
  resolveWalletTransactionExecutionCurrency,
  resolveWalletTransactionOriginalCurrency,
} from '../utils/transactionCurrency';

const DELAY = 800; // Simulated network latency in ms
const ACCOUNT_SECURITY_STORAGE_KEY = 'kanz-coins-account-security-v1';
const AUTH_STORAGE_KEY = 'auth-storage';

// In-memory simulated "Database"; auth uses localStorage to match real persistence.
const __inMemoryDB = Object.create(null);
const readAuthLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeAuthLocalStorage = (value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
};

const clearAuthLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const getDB = (key, defaultData) => {
  try {
    if (key === AUTH_STORAGE_KEY) {
      return readAuthLocalStorage() || defaultData;
    }
    return __inMemoryDB[key] ? __inMemoryDB[key] : defaultData;
  } catch (error) {
    devLogger.warnOnce(`Error reading ${key} from in-memory DB`, error);
    return defaultData;
  }
};

const saveDB = (key, data) => {
  try {
    if (key === AUTH_STORAGE_KEY) {
      writeAuthLocalStorage(data);
      return;
    }
    __inMemoryDB[key] = data;
  } catch (error) {
    devLogger.warnOnce(`Error saving ${key} to in-memory DB`, error);
  }
};

const resolveActor = (actor) => {
  if (!actor) return null;
  const users = getDB('admin-storage', { state: { users: mockUsers } }).state.users || mockUsers;
  return users.find((u) => u.id === actor.id) || null;
};

const ensureCanManageUser = (actor, targetUser, action = 'manage') => {
  if (!actor) throw new Error('Actor context is required');
  if (actor.role === 'admin') return true;

  if (actor.role === 'manager') {
    const forbidden = ['admin', 'manager'];
    if (forbidden.includes(targetUser.role)) {
      throw new Error(`Manager is not allowed to ${action} admins/managers`);
    }
    return true;
  }

  throw new Error('Insufficient permissions');
};

const ensureAdmin = (actor) => {
  if (!actor || actor.role !== 'admin') {
    throw new Error('Only admin can manage system currencies');
  }
};

const getGroupsDb = () => getDB('group-storage', { state: { groups: mockGroups } });

const getDefaultGroupName = () => {
  const groupDb = getGroupsDb();
  const groups = groupDb?.state?.groups || mockGroups;
  return groups[0]?.name || 'Standard';
};

const findGroupRecord = (groupInput, groups = null) => {
  const source = Array.isArray(groups) ? groups : (getGroupsDb()?.state?.groups || mockGroups);
  const raw = typeof groupInput === 'object' && groupInput !== null
    ? (groupInput.id || groupInput._id || groupInput.groupId || groupInput.name || groupInput.groupName || '')
    : groupInput;
  const normalizedRaw = String(raw || '').trim();
  const normalized = normalizedRaw.toLowerCase();

  if (!normalizedRaw) return null;

  return source.find((group) => {
    const idMatch = String(group?.id || '').trim() === normalizedRaw;
    const objectIdMatch = String(group?._id || '').trim() === normalizedRaw;
    const nameMatch = String(group?.name || '').trim().toLowerCase() === normalized;
    const nameArMatch = String(group?.nameAr || '').trim().toLowerCase() === normalized;
    return idMatch || objectIdMatch || nameMatch || nameArMatch;
  }) || null;
};

const resolveGroupName = (groupInput) => {
  const groupDb = getGroupsDb();
  const groups = groupDb?.state?.groups || mockGroups;
  const matched = findGroupRecord(groupInput, groups);

  return matched?.name || getDefaultGroupName();
};

const toHex = (buffer) => {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const hashPassword = async (plainText) => {
  const value = String(plainText || '');
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const encoded = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return toHex(digest);
  }

  // Fallback hash for older environments where SubtleCrypto is unavailable.
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return `legacy-${Math.abs(hash)}`;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, passwordHash, ...safeUser } = user;
  const walletSummary = getWalletBalanceSummary({
    ...safeUser,
    walletBalance: safeUser.walletBalance ?? safeUser.coins ?? safeUser.balance,
    creditLimit: normalizeCreditLimitValue(safeUser.creditLimit),
  });
  return {
    ...safeUser,
    avatar: resolveUserAvatar(safeUser, safeUser.name || safeUser.email || 'N&A HUB User'),
    coins: walletSummary.walletBalance,
    walletBalance: walletSummary.walletBalance,
    balance: walletSummary.walletBalance,
    creditLimit: walletSummary.creditLimit,
    creditUsed: walletSummary.creditUsed,
    availableCredit: walletSummary.availableCredit,
    availableBalance: walletSummary.availableBalance,
    permissions: Array.isArray(safeUser.permissions) ? safeUser.permissions : [],
    isApiEnabled: Boolean(safeUser.isApiEnabled),
    whitelistIps: Array.isArray(safeUser.whitelistIps) ? safeUser.whitelistIps : [],
    webhookUrl: safeUser.webhookUrl || '',
  };
};

const isMockTwoFactorEnabled = (userId) => {
  // Moved to in-memory store; no localStorage access.
  try {
    const store = __inMemoryDB[ACCOUNT_SECURITY_STORAGE_KEY] || {};
    return Boolean(store?.[userId]?.twoFactorEnabled);
  } catch {
    return false;
  }
};

const secureUsersInDb = async (db) => {
  const users = db?.state?.users || [];
  let changed = false;

  for (const user of users) {
    if (!user.passwordHash) {
      const seedUser = mockUsers.find(
        (u) => u.id === user.id || String(u.email || '').toLowerCase() === String(user.email || '').toLowerCase()
      );
      const sourcePassword = typeof user.password === 'string'
        ? user.password
        : (typeof seedUser?.password === 'string' ? seedUser.password : 'password123');
      user.passwordHash = await hashPassword(sourcePassword);
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(user, 'password')) {
      delete user.password;
      changed = true;
    }
  }

  return changed;
};

const getSeedPasswordForUser = (user) => {
  if (!user) return null;
  const seedUser = mockUsers.find(
    (u) => u.id === user.id || String(u.email || '').toLowerCase() === String(user.email || '').toLowerCase()
  );
  return typeof seedUser?.password === 'string' ? seedUser.password : null;
};

const randomTempPassword = (length = 10) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

const getUsersDb = () => getDB('admin-storage', { state: { users: mockUsers } });
const getOrdersDb = () => getDB('order-storage', { state: { orders: mockOrders } });
const getTopupsDb = () => getDB('topup-storage', { state: { topups: mockTopups } });
const getWalletTransactionsDb = () => getDB('wallet-transactions-storage', { state: { transactions: [] } });
const saveWalletTransactionsDb = (db) => saveDB('wallet-transactions-storage', db);

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCreditLimitValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return normalizeMoneyAmount(parsed);
};

const normalizeMockWalletType = (value) => {
  const token = String(value || '').trim().toLowerCase();
  if (['credit', 'deposit', 'topup', 'top_up'].includes(token)) return 'credit';
  if (['debit', 'purchase', 'charge', 'deduct', 'deduction'].includes(token)) return 'debit';
  if (['refund', 'reversal'].includes(token)) return 'refund';
  return token || 'credit';
};

const buildMockWalletTransactionsForUser = (userId) => {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return [];

  const usersDb = getUsersDb();
  const ordersDb = getOrdersDb();
  const topupsDb = getTopupsDb();
  const walletTransactionsDb = getWalletTransactionsDb();

  const user = (usersDb?.state?.users || mockUsers).find((entry) => String(entry.id) === normalizedUserId) || null;
  const manualTransactions = (walletTransactionsDb?.state?.transactions || [])
    .filter((entry) => String(entry.userId) === normalizedUserId)
    .map((entry) => ({
      ...entry,
      type: normalizeMockWalletType(entry.type),
      amount: Math.abs(toFiniteNumber(entry.amount)),
      signedAmount: toFiniteNumber(entry.signedAmount, 0),
      currency: resolveWalletTransactionExecutionCurrency(entry, user?.currency || 'USD'),
      originalCurrency: resolveWalletTransactionOriginalCurrency(entry) || null,
      status: String(entry.status || 'completed').toLowerCase(),
    }));

  const orderTransactions = (ordersDb?.state?.orders || mockOrders)
    .filter((entry) => String(entry.userId) === normalizedUserId)
    .map((order) => {
      const amount = Math.abs(toFiniteNumber(
        order?.financialSnapshot?.finalAmountAtExecution
        ?? order?.priceCoins
        ?? order?.totalAmount
        ?? 0
      ));
      const normalizedStatus = String(order?.status || 'pending').toLowerCase();
      const isRefund = normalizedStatus === 'refunded' || Boolean(order?.refundedAt);
      const type = isRefund ? 'refund' : 'debit';

      return {
        id: `order-${order.id}`,
        userId: normalizedUserId,
        type,
        amount,
        signedAmount: type === 'debit' ? -amount : amount,
        status: normalizedStatus,
        description: order?.productNameAr || order?.productName || 'Order purchase',
        reference: order?.externalOrderId || order?.id || null,
        sourceType: 'order',
        sourceId: order?.id || null,
        currency: resolveOrderExecutionCurrency(order, user?.currency || 'USD'),
        originalCurrency: resolveOrderExecutionCurrency(order) || null,
        createdAt: order?.createdAt || order?.date || null,
      };
    });

  const topupTransactions = (topupsDb?.state?.topups || mockTopups)
    .filter((entry) => String(entry.userId) === normalizedUserId)
    .map((topup) => {
      const amount = Math.abs(toFiniteNumber(
        topup?.actualPaidAmount
        ?? topup?.requestedAmount
        ?? topup?.requestedCoins
        ?? topup?.amount
        ?? 0
      ));
      const normalizedStatus = String(topup?.status || 'pending').toLowerCase();
      const isApplied = ['approved', 'completed', 'success'].includes(normalizedStatus);

      return {
        id: `topup-${topup.id}`,
        userId: normalizedUserId,
        type: 'credit',
        amount,
        signedAmount: isApplied ? amount : 0,
        status: normalizedStatus,
        description: topup?.paymentChannel || topup?.method || 'Balance topup',
        reference: topup?.id || null,
        sourceType: 'topup',
        sourceId: topup?.id || null,
        currency: resolveTopupExecutionCurrency(topup, user?.currency || 'USD'),
        originalCurrency: resolveTopupExecutionCurrency(topup) || null,
        createdAt: topup?.createdAt || topup?.date || null,
      };
    });

  const timeline = [...manualTransactions, ...orderTransactions, ...topupTransactions]
    .sort((left, right) => new Date(left?.createdAt || 0) - new Date(right?.createdAt || 0));

  const currentBalance = toFiniteNumber(user?.coins, 0);
  const signedTotal = timeline.reduce((sum, entry) => sum + toFiniteNumber(entry.signedAmount, 0), 0);
  let runningBalance = currentBalance - signedTotal;

  return timeline
    .map((entry) => {
      runningBalance += toFiniteNumber(entry.signedAmount, 0);
      return {
        ...entry,
        balanceAfter: runningBalance,
      };
    })
    .sort((left, right) => new Date(right?.createdAt || 0) - new Date(left?.createdAt || 0));
};

const buildMockWalletSummary = (userId) => {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return null;

  const usersDb = getUsersDb();
  const user = (usersDb?.state?.users || mockUsers).find((entry) => String(entry.id) === normalizedUserId) || null;
  if (!user) return null;

  const transactions = buildMockWalletTransactionsForUser(normalizedUserId);
  const currency = String(user.currency || 'USD').toUpperCase();

  return {
    id: normalizedUserId,
    walletId: normalizedUserId,
    userId: normalizedUserId,
    user: sanitizeUser(user),
    userName: user.name || '',
    userEmail: user.email || '',
    walletBalance: toFiniteNumber(user.coins, 0),
    balance: toFiniteNumber(user.coins, 0),
    currency,
    transactionsCount: transactions.length,
    lastTransactionAt: transactions[0]?.createdAt || null,
    recentTransactions: transactions.slice(0, 5),
  };
};

const mockProviderCatalog = [
  {
    id: 'prov-alpha',
    name: 'Alpha Provider',
    products: [
      { id: 'alpha-pubg-60', name: 'PUBG UC 60', rawPrice: '52.375', pricecoins: '52.375', minQty: 1, maxQty: 10 },
      { id: 'alpha-netflix-1m', name: 'Netflix 1M', rawPrice: '230.125', pricecoins: '230.125', minQty: 1, maxQty: 3 },
      { id: 'alpha-spotify-1m', name: 'Spotify 1M', rawPrice: '108.500', pricecoins: '108.500', minQty: 1, maxQty: 5 },
    ],
  },
  {
    id: 'prov-beta',
    name: 'Beta Supplier',
    products: [
      { id: 'beta-freefire-100', name: 'FreeFire 100 Diamonds', rawPrice: '44.250', pricecoins: '44.250', minQty: 1, maxQty: 20 },
      { id: 'beta-itunes-10', name: 'iTunes 10$', rawPrice: '355.875', pricecoins: '355.875', minQty: 1, maxQty: 2 },
      { id: 'beta-netflix-1m', name: 'Netflix 1M', rawPrice: '238.250', pricecoins: '238.250', minQty: 1, maxQty: 3 },
    ],
  },
  {
    id: 'prov-gamma',
    name: 'Gamma Digital Hub',
    products: [
      { id: 'gamma-pubg-325', name: 'PUBG UC 325', rawPrice: '255.990', pricecoins: '255.990', minQty: 1, maxQty: 10 },
      { id: 'gamma-youtube-1m', name: 'YouTube Premium 1M', rawPrice: '122.333', pricecoins: '122.333', minQty: 1, maxQty: 4 },
      { id: 'gamma-disney-1m', name: 'Disney+ 1M', rawPrice: '141.750', pricecoins: '141.750', minQty: 1, maxQty: 4 },
    ],
  },
];

const getProviderProduct = (providerId, providerProductId) => {
  const provider = mockProviderCatalog.find((p) => p.id === providerId);
  if (!provider) return null;
  return provider.products.find((p) => p.id === providerProductId) || null;
};

const getDecimalScale = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw.includes('.')) return 0;
  return raw.split('.')[1]?.replace(/[^\d]/g, '').length || 0;
};

const addDecimalValues = (baseValue, deltaValue) => {
  const base = Number(baseValue || 0);
  const delta = Number(deltaValue || 0);
  const scale = Math.max(getDecimalScale(baseValue), getDecimalScale(deltaValue));
  const total = base + delta;
  return scale > 0 ? Number(total.toFixed(scale)) : total;
};

const applyProviderPricing = (productData) => {
  const syncPrice = Boolean(productData?.syncPriceWithProvider);
  if (!syncPrice) {
    return {
      ...productData,
      basePricecoins: Number(productData?.basePriceCoins || 0),
      manualPriceAdjustment: Number(productData?.manualPriceAdjustment || 0),
      minQty: Number(productData?.minQty || 1),
      maxQty: Number(productData?.maxQty || 999),
      displayOrder: Number(productData?.displayOrder || 0),
      providerQuantity: Number(productData?.providerQuantity || 0),
    };
  }

  const providerProduct = getProviderProduct(productData?.providerId, productData?.providerProductId);
  const syncedBaseRaw = productData?.syncedProviderBasePrice ?? providerProduct?.rawPrice ?? providerProduct?.priceCoins ?? 0;
  const manualDeltaRaw = productData?.manualPriceAdjustment || 0;
  const resolvedMinQty = Math.max(
    Number(providerProduct?.minQty ?? providerProduct?.minimumOrderQty ?? productData?.minQty ?? 1) || 1,
    1
  );
  const resolvedMaxQty = Math.max(
    Number(providerProduct?.maxQty ?? providerProduct?.maximumOrderQty ?? productData?.maxQty ?? 999) || 999,
    resolvedMinQty
  );

  return {
    ...productData,
    basePricecoins: addDecimalValues(syncedBaseRaw, manualDeltaRaw),
    syncedProviderBasePrice: Number(syncedBaseRaw || 0),
    manualPriceAdjustment: Number(manualDeltaRaw || 0),
    minQty: resolvedMinQty,
    maxQty: resolvedMaxQty,
    displayOrder: Number(productData?.displayOrder || 0),
    providerQuantity: resolvedMaxQty,
  };
};

const SAFE_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const SENSITIVE_KEYS = new Set([
  'apikey',
  'api_key',
  'secret',
  'token',
  'authorization',
  'password',
  'webhooksecret',
  'bearertoken',
]);

const maskSecret = (value) => {
  const raw = String(value || '');
  if (!raw) return '';
  if (raw.length <= 4) return '****';
  return `${raw.slice(0, 2)}****${raw.slice(-2)}`;
};

const maskHeaders = (headers = []) => {
  if (!Array.isArray(headers)) return [];
  return headers.map((h) => {
    const key = String(h?.key || '');
    const normalized = key.toLowerCase().replace(/[-_]/g, '');
    const shouldMask = [...SENSITIVE_KEYS].some((s) => normalized.includes(s.replace(/[-_]/g, '')));
    return {
      key,
      value: shouldMask ? maskSecret(h?.value) : String(h?.value || ''),
    };
  });
};

const sanitizeSupplierForUi = (supplier) => {
  if (!supplier) return null;
  return {
    ...supplier,
    apiKey: maskSecret(supplier.apiKey),
    apiSecret: maskSecret(supplier.apiSecret),
    bearerToken: maskSecret(supplier.bearerToken),
    password: maskSecret(supplier.password),
    webhookSecret: maskSecret(supplier.webhookSecret),
    customHeaders: maskHeaders(supplier.customHeaders),
  };
};

const getSuppliersDb = () => getDB('suppliers-storage', { state: { suppliers: mockSuppliers } });
const getAuditDb = () => getDB('audit-storage', { state: { logs: [] } });

const writeAuditLog = ({ actorId = 'system', action, supplierId = null, orderId = null, targetType = 'supplier', oldSummary = null, newSummary = null }) => {
  const db = getAuditDb();
  db.state.logs = [
    {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actorId,
      action,
      supplierId,
      orderId,
      targetType,
      oldSummary,
      newSummary,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    },
    ...(db.state.logs || []),
  ];
  saveDB('audit-storage', db);
};

const isPrivateOrLocalHost = (hostname = '') => {
  const host = String(hostname || '').toLowerCase();
  if (!host) return true;
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  return false;
};

const validateExternalUrl = (baseUrl) => {
  let parsed;
  try {
    parsed = new URL(String(baseUrl || '').trim());
  } catch {
    throw new Error('Invalid baseUrl');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https protocols are allowed');
  }
  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error('Blocked URL host (SSRF protection)');
  }
  return parsed.toString().replace(/\/+$/, '');
};

const ensureValidEndpoint = (endpoint, fieldName) => {
  const value = String(endpoint || '').trim();
  if (!value) return '';
  if (!value.startsWith('/')) {
    throw new Error(`${fieldName} must start with "/"`);
  }
  if (value.includes('://')) {
    throw new Error(`${fieldName} must be relative endpoint`);
  }
  return value;
};

const normalizeSupplierPayload = (payload = {}) => {
  const normalized = {
    ...payload,
    supplierName: String(payload.supplierName || '').trim(),
    supplierCode: String(payload.supplierCode || '').trim().toUpperCase(),
    supplierType: ['api', 'manual', 'hybrid'].includes(payload.supplierType) ? payload.supplierType : 'api',
    authType: ['none', 'api_key', 'bearer_token', 'basic_auth', 'custom_headers'].includes(payload.authType) ? payload.authType : 'none',
    requestMethod: SAFE_HTTP_METHODS.includes(String(payload.requestMethod || '').toUpperCase()) ? String(payload.requestMethod).toUpperCase() : 'POST',
    payloadFormat: ['json', 'form-data', 'x-www-form-urlencoded'].includes(payload.payloadFormat) ? payload.payloadFormat : 'json',
    responseFormat: ['json', 'text', 'custom'].includes(payload.responseFormat) ? payload.responseFormat : 'json',
    timeoutMs: Math.min(Math.max(Number(payload.timeoutMs || 8000), 1000), 30000),
    isActive: payload.isActive !== false,
    enableAutoFulfillment: payload.enableAutoFulfillment !== false,
    enableStatusSync: Boolean(payload.enableStatusSync),
    enableProductSync: Boolean(payload.enableProductSync),
    customHeaders: Array.isArray(payload.customHeaders) ? payload.customHeaders.map((h) => ({
      key: String(h?.key || '').trim(),
      value: String(h?.value || '').trim(),
    })).filter((h) => h.key) : [],
    supplierFieldMappings: Array.isArray(payload.supplierFieldMappings) ? payload.supplierFieldMappings.map((m) => ({
      internalField: String(m?.internalField || '').trim(),
      externalField: String(m?.externalField || '').trim(),
    })).filter((m) => m.internalField && m.externalField) : [],
    baseUrl: validateExternalUrl(payload.baseUrl),
    placeOrderEndpoint: ensureValidEndpoint(payload.placeOrderEndpoint, 'placeOrderEndpoint'),
    checkOrderStatusEndpoint: ensureValidEndpoint(payload.checkOrderStatusEndpoint, 'checkOrderStatusEndpoint'),
    getBalanceEndpoint: ensureValidEndpoint(payload.getBalanceEndpoint, 'getBalanceEndpoint'),
    getProductsEndpoint: ensureValidEndpoint(payload.getProductsEndpoint, 'getProductsEndpoint'),
    cancelOrderEndpoint: ensureValidEndpoint(payload.cancelOrderEndpoint, 'cancelOrderEndpoint'),
  };

  if (!normalized.supplierName) throw new Error('supplierName is required');
  if (!normalized.supplierCode) throw new Error('supplierCode is required');
  if (!normalized.baseUrl) throw new Error('baseUrl is required');
  return normalized;
};

const defaultPaymentSettings = {
  countryAccounts: [],
  instructions: 'ارفع صورة الإيصال وحدد المبلغ قبل إرسال الطلب.',
  whatsappNumber: getDefaultWhatsAppNumber(),
  paymentGroups: createDefaultPaymentGroups(),
};

// --- Mock API Service ---
const mockApi = {

  uploads: {
    orderFieldImage: async (file) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const name = String(file?.name || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_');
      return `/uploads/order-fields/mock-${Date.now()}-${name}`;
    },
  },

  whatsapp: {
    getStatus: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      return {
        state: 'CONNECTED',
        qrCode: null,
        hasQrCode: false,
        isConnected: true,
        isInitializing: false,
        adminNumberConfigured: true,
        dependencyAvailable: true,
        lastError: null,
      };
    },
    reconnect: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      return {
        state: 'INITIALIZING',
        qrCode: null,
        hasQrCode: false,
        isConnected: false,
        isInitializing: true,
        adminNumberConfigured: true,
        dependencyAvailable: true,
        lastError: null,
      };
    },
    reset: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      return {
        state: 'INITIALIZING',
        qrCode: null,
        hasQrCode: false,
        isConnected: false,
        isInitializing: true,
        adminNumberConfigured: true,
        dependencyAvailable: true,
        lastError: null,
      };
    },
  },
  
  // --- Auth & Users ---
  auth: {
    login: async (email, password) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('admin-storage', { state: { users: mockUsers } });
      const users = db.state.users || mockUsers;
      const migrated = await secureUsersInDb(db);
      if (migrated) saveDB('admin-storage', db);

      const normalizedEmail = String(email || '').trim().toLowerCase();
      const candidateHash = await hashPassword(password);
      const emailUser = users.find((u) => String(u.email || '').toLowerCase() === normalizedEmail);
      let user = users.find(
        (u) => String(u.email || '').toLowerCase() === normalizedEmail && u.passwordHash === candidateHash
      );

      // Self-heal old corrupted hashes created before migration fix.
      if (!user) {
        const seedPassword = getSeedPasswordForUser(emailUser);
        if (emailUser && seedPassword && password === seedPassword) {
          emailUser.passwordHash = candidateHash;
          saveDB('admin-storage', db);
          user = emailUser;
        }
      }
      
      if (!emailUser) throw new Error('User not found');
      if (!user) throw new Error('Invalid email or password');

      if (user.signupMethod !== 'google' && user.verified === false) {
        throw new Error('Please verify your email address before logging in');
      }

      const normalizedStatus = normalizeAccountStatus(user.status);
      if (!['approved', 'pending', 'rejected'].includes(normalizedStatus)) {
        user.status = 'pending';
        saveDB('admin-storage', db);
      }

      if (isMockTwoFactorEnabled(user.id)) {
        const tempToken = `mock-2fa-${user.id}-${Date.now()}`;
        return {
          requires2FA: true,
          tempToken,
          twoFactorToken: tempToken,
          user: sanitizeUser(user),
        };
      }
      
      return { user: sanitizeUser(user), token: 'mock-jwt-token-12345' };
    },

    verifyTwoFactor: async ({ tempToken, twoFactorToken, code }) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const normalizedToken = String(tempToken || twoFactorToken || '');
      const userId = normalizedToken.split('-').slice(2, -1).join('-');
      if (!normalizedToken.startsWith('mock-2fa-') || !userId) {
        throw new Error('Invalid 2FA session');
      }
      if (String(code || '').replace(/\D/g, '') !== '123456') {
        throw new Error('Invalid verification code');
      }
      const db = getDB('admin-storage', { state: { users: mockUsers } });
      const user = (db.state.users || mockUsers).find((entry) => String(entry.id) === String(userId));
      if (!user) throw new Error('User not found');
      return { user: sanitizeUser(user), token: 'mock-jwt-token-2fa' };
    },

    generateTwoFactor: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      return { message: 'Verification code sent to email' };
    },

    enableTwoFactor: async ({ code } = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      if (String(code || '').replace(/\D/g, '') !== '123456') {
        throw new Error('Invalid 2FA setup code');
      }
      return { twoFactorEnabled: true };
    },

    disableTwoFactor: async ({ password, token, code }) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      if (!String(password || token || code || '').trim()) {
        throw new Error('Password or 2FA code is required');
      }
      return { twoFactorEnabled: false };
    },

    loginWithGoogle: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('admin-storage', { state: { users: mockUsers } });
      const users = db.state.users || mockUsers;
      const migrated = await secureUsersInDb(db);
      if (migrated) saveDB('admin-storage', db);

      const googleEmail = 'google.user@kanz-coins.app';
      let user = users.find((item) => String(item.email || '').toLowerCase() === googleEmail);

      if (!user) {
        const createdAt = new Date().toISOString();
        user = {
          id: `u${Date.now()}`,
          name: 'Google User',
          username: `googleuser${Math.random().toString(36).slice(2, 6)}`,
          email: googleEmail,
          passwordHash: await hashPassword(`google-${Date.now()}`),
          role: 'customer',
          coins: 0,
          creditLimit: 0,
          group: getDefaultGroupName(),
          status: 'pending',
          country: 'US',
          currency: 'USD',
          phone: '+10000000000',
          joinDate: createdAt,
          createdAt,
          verified: true,
          signupMethod: 'google',
          approvedAt: null,
          rejectedAt: null,
          avatar: resolveUserAvatar({ name: 'Google User' }, 'Google User'),
          authProvider: 'google',
        };

        db.state.users = [...users, user];
        saveDB('admin-storage', db);
      }

      return { user: sanitizeUser(user), token: 'mock-google-token-12345' };
    },

    resendVerification: async (email) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (normalizedEmail && typeof window !== 'undefined') {
        window.sessionStorage.setItem(`mock-email-verification:${normalizedEmail}`, '1234');
      }
      return {
        success: true,
        message: email
          ? 'If that email exists, a 4-digit verification code has been sent.'
          : 'Email is required.',
      };
    },

    verifyEmailCode: async ({ email, code } = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedCode = String(code || '').replace(/\D/g, '').slice(0, 4);
      const storedCode = typeof window !== 'undefined'
        ? window.sessionStorage.getItem(`mock-email-verification:${normalizedEmail}`)
        : null;

      if (!normalizedEmail) throw new Error('Email is required.');
      if (normalizedCode !== (storedCode || '1234')) {
        throw new Error('Invalid verification code');
      }

      const db = getDB('admin-storage', { state: { users: mockUsers } });
      const users = db.state.users || mockUsers;
      const user = users.find((entry) => String(entry.email || '').trim().toLowerCase() === normalizedEmail);
      if (user) {
        user.verified = true;
        if (isVerificationRequiredStatus(user.status)) user.status = 'pending';
        saveDB('admin-storage', db);
      }
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(`mock-email-verification:${normalizedEmail}`);
      }

      return {
        success: true,
        message: 'Email verified successfully.',
        user: user ? sanitizeUser(user) : null,
      };
    },
    
    register: async (userData) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('admin-storage', { state: { users: mockUsers } });
      const users = db.state.users || mockUsers;
      const migrated = await secureUsersInDb(db);
      if (migrated) saveDB('admin-storage', db);
      const normalizedEmail = String(userData.email || '').trim().toLowerCase();
      
      if (users.some(u => String(u.email || '').toLowerCase() === normalizedEmail)) throw new Error('Email already registered');
      
      const newUser = {
        id: `u${Date.now()}`,
        ...userData,
        email: normalizedEmail,
        passwordHash: await hashPassword(userData.password || ''),
        role: 'customer',
        coins: 0,
        creditLimit: 0,
        group: resolveGroupName(userData.group),
        status: 'approved',
        verified: true,
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        signupMethod: normalizeSignupMethod(userData.signupMethod || 'email'),
        approvedAt: null,
        rejectedAt: null,
        avatar: resolveUserAvatar(userData, userData.name || userData.username || userData.email || 'N&A HUB User')
      };
      delete newUser.password;
      
      // Save to "Database"
      db.state.users = [...users, newUser];
      saveDB('admin-storage', db);
      
      return { user: sanitizeUser(newUser), token: 'mock-jwt-token-register' };
    },
    
    getProfile: async (userId) => {
       await new Promise(resolve => setTimeout(resolve, DELAY));
       const db = getDB('admin-storage', { state: { users: mockUsers } });
       const users = db.state.users;
       const migrated = await secureUsersInDb(db);
       if (migrated) saveDB('admin-storage', db);
       const user = users.find(u => u.id === userId);
       if (!user) throw new Error('User not found');
       return sanitizeUser(user);
    },

    logout: async () => {
      await new Promise(resolve => setTimeout(resolve, Math.min(DELAY, 250)));
      clearAuthLocalStorage();
      return { success: true };
    }
  },

  me: {
    generateApiToken: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const rawToken = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      return { rawToken };
    },

    updateApiSettings: async ({ whitelistIps = [], webhookUrl = '' } = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      return {
        isApiEnabled: true,
        whitelistIps: Array.isArray(whitelistIps) ? whitelistIps.map((item) => String(item || '').trim()).filter(Boolean) : [],
        webhookUrl: String(webhookUrl || '').trim(),
      };
    },
  },

  notifications: {
    unreadCount: async () => {
      await new Promise(resolve => setTimeout(resolve, Math.min(DELAY, 200)));
      const db = getDB('notifications-storage', { state: { notifications: [] } });
      return (db?.state?.notifications || []).filter((item) => !Boolean(item.read ?? item.isRead)).length;
    },

    list: async () => {
      await new Promise(resolve => setTimeout(resolve, Math.min(DELAY, 300)));
      const db = getDB('notifications-storage', { state: { notifications: [] } });
      return db?.state?.notifications || [];
    },

    markAsRead: async (id) => {
      await new Promise(resolve => setTimeout(resolve, Math.min(DELAY, 250)));
      const db = getDB('notifications-storage', { state: { notifications: [] } });
      db.state.notifications = (db.state.notifications || []).map((item) => (
        String(item.id) === String(id) ? { ...item, read: true, isRead: true } : item
      ));
      saveDB('notifications-storage', db);
      return { success: true };
    },

    markAllAsRead: async () => {
      await new Promise(resolve => setTimeout(resolve, Math.min(DELAY, 250)));
      const db = getDB('notifications-storage', { state: { notifications: [] } });
      db.state.notifications = (db.state.notifications || []).map((item) => ({ ...item, read: true, isRead: true }));
      saveDB('notifications-storage', db);
      return { success: true };
    },

    send: async (payload = {}) => {
      await new Promise(resolve => setTimeout(resolve, Math.min(DELAY, 300)));
      const db = getDB('notifications-storage', { state: { notifications: [] } });
      const notification = {
        id: `notif-${Date.now()}`,
        title: payload.title || 'Notification',
        message: payload.message || '',
        type: String(payload.type || 'info').toLowerCase(),
        read: false,
        isRead: false,
        createdAt: new Date().toISOString(),
        targetUrl: payload.targetUrl || payload.url || '',
      };
      db.state.notifications = [notification, ...(db.state.notifications || [])];
      saveDB('notifications-storage', db);
      return notification;
    },
  },

  // --- Products ---
  products: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      // Read from persisted store format or fallback
      const data = getDB('products-storage', { state: { products: mockProducts } });
      return data.state.products || mockProducts;
    },
    
    get: async (id) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const products = await mockApi.products.list();
      return products.find(p => p.id === id);
    },
    
    create: async (productData) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('products-storage', { state: { products: mockProducts } });
      const resolved = applyProviderPricing(productData);
      const newProduct = { ...resolved, id: `p${Date.now()}` };
      
      db.state.products = [...(db.state.products || []), newProduct];
      saveDB('products-storage', db);
      return newProduct;
    },
    
    update: async (id, updates) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('products-storage', { state: { products: mockProducts } });
      const index = db.state.products.findIndex(p => p.id === id);
      
      if (index === -1) throw new Error('Product not found');
      
      const merged = { ...db.state.products[index], ...updates };
      const updatedProduct = applyProviderPricing(merged);
      db.state.products[index] = updatedProduct;
      saveDB('products-storage', db);
      return updatedProduct;
    },

    verifyField: async (_id, fieldValue) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const value = String(fieldValue || '').trim();
      if (!value) throw new Error('Field value is required');

      return {
        uid: value,
        nickName: `Player ${value}`,
        avatar: null,
      };
    },

    toggleStatus: async (id) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('products-storage', { state: { products: mockProducts } });
      const index = db.state.products.findIndex(p => p.id === id);

      if (index === -1) throw new Error('Product not found');

      const currentProduct = db.state.products[index];
      const nextStatus = currentProduct?.status === 'active' ? 'inactive' : 'active';
      const toggledProduct = applyProviderPricing({
        ...currentProduct,
        status: nextStatus,
        productStatus: nextStatus === 'active' ? 'available' : 'unavailable',
        isVisibleInStore: true,
        showWhenUnavailable: nextStatus !== 'active',
      });

      db.state.products[index] = toggledProduct;
      saveDB('products-storage', db);
      return toggledProduct;
    },
    
    delete: async (id) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('products-storage', { state: { products: mockProducts } });
      db.state.products = db.state.products.filter(p => p.id !== id);
      saveDB('products-storage', db);
      return { success: true };
    },

    listProviders: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      return mockProviderCatalog.map((provider) => ({ id: provider.id, name: provider.name }));
    },

    listProviderProducts: async (providerId) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const provider = mockProviderCatalog.find((p) => p.id === providerId);
      if (!provider) return [];
      return provider.products;
    },

    getSyncedPrice: async (providerId, providerProductId) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const product = getProviderProduct(providerId, providerProductId);
      if (!product) throw new Error('Provider product not found');
      return {
        basePricecoins: product.rawPrice ?? product.priceCoins ?? 0,
        rawPrice: product.rawPrice ?? product.priceCoins ?? 0,
        minQty: product.minQty ?? null,
        minimumOrderQty: product.minQty ?? null,
        maxQty: product.maxQty ?? null,
        maximumOrderQty: product.maxQty ?? null,
      };
    }
  },

  // --- Categories ---
  categories: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const data = getDB('products-storage', { state: { categories: mockCategories } });
      return data.state.categories || mockCategories;
    },

    get: async (id) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const normalizedId = String(id || '').trim();
      if (!normalizedId) return null;
      const data = getDB('products-storage', { state: { categories: mockCategories } });
      const categories = data.state.categories || mockCategories;
      return categories.find((c) => String(c?.id || '').trim() === normalizedId) || null;
    },
    
    create: async (categoryData) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('products-storage', { state: { categories: mockCategories } });
      const newCategory = { ...categoryData, id: categoryData.id || `cat-${Date.now()}` };
      
      db.state.categories = [...(db.state.categories || []), newCategory];
      saveDB('products-storage', db);
      return newCategory;
    },

    update: async (id, updates) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const normalizedId = String(id || '').trim();
      if (!normalizedId) throw new Error('Category id is required');

      const db = getDB('products-storage', { state: { categories: mockCategories } });
      const categories = Array.isArray(db.state.categories) ? db.state.categories : mockCategories;
      const index = categories.findIndex((c) => String(c?.id || '').trim() === normalizedId);
      if (index < 0) throw new Error('Category not found');

      const current = categories[index] || {};
      const nextCategory = {
        ...current,
        ...(updates || {}),
        id: current.id,
      };

      db.state.categories = categories.map((c) => (String(c?.id || '').trim() === normalizedId ? nextCategory : c));
      saveDB('products-storage', db);
      return nextCategory;
    },
    
    delete: async (id) => {
       await new Promise(resolve => setTimeout(resolve, DELAY));
       const db = getDB('products-storage', { state: { categories: mockCategories } });
       const deletedCategory = (db.state.categories || mockCategories).find((c) => c.id === id);
       db.state.categories = db.state.categories.filter(c => c.id !== id);
       db.state.products = (db.state.products || mockProducts).filter((p) => {
         const raw = String(p.category || '').trim();
         return raw !== id && raw !== deletedCategory?.name && raw !== deletedCategory?.nameAr;
       });
       saveDB('products-storage', db);
       return { success: true };
    }
  },

  // --- Suppliers ---
  suppliers: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getSuppliersDb();
      const productsDb = getDB('products-storage', { state: { products: mockProducts } });
      const products = productsDb.state.products || [];
      return (db.state.suppliers || []).map((s) => {
        const linkedProductsCount = products.filter((p) => p.supplierId === s.id).length;
        const syncedProductsCount = Array.isArray(s.syncedProductsSnapshot) ? s.syncedProductsSnapshot.length : 0;
        return sanitizeSupplierForUi({ ...s, linkedProductsCount, syncedProductsCount });
      });
    },

    get: async (id) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getSuppliersDb();
      const found = (db.state.suppliers || []).find((s) => s.id === id);
      if (!found) throw new Error('Supplier not found');
      return sanitizeSupplierForUi(found);
    },

    create: async (payload, actorContext) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getSuppliersDb();
      const normalized = normalizeSupplierPayload(payload);
      const codeExists = (db.state.suppliers || []).some((s) => s.supplierCode === normalized.supplierCode);
      if (codeExists) throw new Error('supplierCode must be unique');
      const record = {
        id: `sup-${Date.now()}`,
        ...normalized,
        lastConnectionTestAt: null,
        lastConnectionTestStatus: 'not_tested',
        lastConnectionTestMessage: 'Not tested',
        lastProductSyncAt: null,
        syncedProductsSnapshot: [],
      };
      db.state.suppliers = [record, ...(db.state.suppliers || [])];
      saveDB('suppliers-storage', db);
      writeAuditLog({
        actorId: actorContext?.id || 'system',
        action: 'supplier_created',
        supplierId: record.id,
        targetType: 'supplier',
        newSummary: { supplierName: record.supplierName, supplierCode: record.supplierCode },
      });
      return sanitizeSupplierForUi(record);
    },

    update: async (id, payload, actorContext) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getSuppliersDb();
      const idx = (db.state.suppliers || []).findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Supplier not found');
      const current = db.state.suppliers[idx];
      const normalized = normalizeSupplierPayload({ ...current, ...payload });
      const duplicate = (db.state.suppliers || []).some((s, i) => i !== idx && s.supplierCode === normalized.supplierCode);
      if (duplicate) throw new Error('supplierCode must be unique');
      const next = { ...current, ...normalized };
      db.state.suppliers[idx] = next;
      saveDB('suppliers-storage', db);
      writeAuditLog({
        actorId: actorContext?.id || 'system',
        action: 'supplier_updated',
        supplierId: id,
        targetType: 'supplier',
        oldSummary: { supplierName: current.supplierName, isActive: current.isActive },
        newSummary: { supplierName: next.supplierName, isActive: next.isActive },
      });
      return sanitizeSupplierForUi(next);
    },

    deactivate: async (id, actorContext) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getSuppliersDb();
      const supplier = (db.state.suppliers || []).find((s) => s.id === id);
      if (!supplier) throw new Error('Supplier not found');
      supplier.isActive = false;
      saveDB('suppliers-storage', db);
      writeAuditLog({
        actorId: actorContext?.id || 'system',
        action: 'supplier_deactivated',
        supplierId: id,
        targetType: 'supplier',
      });
      return sanitizeSupplierForUi(supplier);
    },

    testConnection: async (id, actorContext) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getSuppliersDb();
      const supplier = (db.state.suppliers || []).find((s) => s.id === id);
      if (!supplier) throw new Error('Supplier not found');
      try {
        validateExternalUrl(supplier.baseUrl);
      } catch (error) {
        supplier.lastConnectionTestAt = new Date().toISOString();
        supplier.lastConnectionTestStatus = 'failed';
        supplier.lastConnectionTestMessage = error.message;
        saveDB('suppliers-storage', db);
        writeAuditLog({ actorId: actorContext?.id || 'system', action: 'supplier_test_failed', supplierId: id, targetType: 'supplier', newSummary: { message: error.message } });
        return sanitizeSupplierForUi(supplier);
      }

      const method = String(supplier.requestMethod || 'POST').toUpperCase();
      const status = SAFE_HTTP_METHODS.includes(method) ? 'connected' : 'failed';
      const message = status === 'connected' ? 'Connection successful' : 'Invalid request method';
      supplier.lastConnectionTestAt = new Date().toISOString();
      supplier.lastConnectionTestStatus = status;
      supplier.lastConnectionTestMessage = message;
      saveDB('suppliers-storage', db);
      writeAuditLog({
        actorId: actorContext?.id || 'system',
        action: 'supplier_connection_tested',
        supplierId: id,
        targetType: 'supplier',
        newSummary: { status, message },
      });
      return sanitizeSupplierForUi(supplier);
    },

    syncProducts: async (id, actorContext) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getSuppliersDb();
      const supplier = (db.state.suppliers || []).find((s) => s.id === id);
      if (!supplier) throw new Error('Supplier not found');
      const provider = mockProviderCatalog.find((p) => String(p.id || '').toLowerCase().includes(String(supplier.supplierCode || '').toLowerCase()));
      if (!provider) {
        supplier.lastProductSyncAt = new Date().toISOString();
        supplier.syncedProductsSnapshot = [];
        saveDB('suppliers-storage', db);
        return [];
      }
      const items = provider?.products || [];
      const snapshot = items.map((p) => ({
        externalProductId: p.id,
        externalProductName: p.name,
        supplierPrice: p.priceCoins,
      }));
      supplier.lastProductSyncAt = new Date().toISOString();
      supplier.syncedProductsSnapshot = snapshot;
      saveDB('suppliers-storage', db);
      writeAuditLog({
        actorId: actorContext?.id || 'system',
        action: 'supplier_products_synced',
        supplierId: id,
        targetType: 'supplier',
        newSummary: { count: items.length },
      });
      return snapshot;
    },

    getLiveProducts: async (id) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getSuppliersDb();
      const supplier = (db.state.suppliers || []).find((s) => s.id === id);
      if (!supplier) throw new Error('Supplier not found');

      const provider = mockProviderCatalog.find((p) => String(p.id || '').toLowerCase().includes(String(supplier.supplierCode || '').toLowerCase()));
      if (!provider) return [];

      return (provider?.products || []).map((p) => ({
        externalProductId: p.id,
        externalProductName: p.name,
        supplierPrice: p.priceCoins,
      }));
    },
  },

  // --- Orders ---
  orders: {
    list: async (userId) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('order-storage', { state: { orders: mockOrders } });
      const allOrders = db.state.orders || mockOrders;
      
      if (userId) {
          return allOrders.filter(o => o.userId === userId);
      }
      return allOrders; // Admin sees all
    },

    listPaginated: async ({ page = 1, limit = 100, status, search, userId, startDate, endDate } = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('order-storage', { state: { orders: mockOrders } });
      const allOrders = db.state.orders || mockOrders;
      const normalizedStatus = String(status || '').trim().toLowerCase();
      const term = String(search || '').trim().toLowerCase();
      const normalizedUserId = String(userId || '').trim();
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end && /^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) end.setHours(23, 59, 59, 999);

      const filteredOrders = allOrders
        .filter((order) => {
          if (normalizedStatus && normalizedStatus !== 'all' && String(order?.status || '').toLowerCase() !== normalizedStatus) {
            return false;
          }

          if (normalizedUserId && String(order?.userId || order?.customerId || '').trim() !== normalizedUserId) {
            return false;
          }

          const orderDate = new Date(order?.createdAt || order?.date || order?.updatedAt || 0);
          if (start && (Number.isNaN(orderDate.getTime()) || orderDate < start)) return false;
          if (end && (Number.isNaN(orderDate.getTime()) || orderDate > end)) return false;

          if (term) {
            const searchableText = [
              order?.id,
              order?._id,
              order?.orderNumber,
              order?.siteOrderNumber,
              order?.internalOrderNumber,
              order?.supplierOrderNumber,
              order?.externalOrderId,
              order?.providerOrderId,
              order?.playerId,
              order?.uid,
              order?.username,
              order?.userId,
              order?.customerId,
              order?.userName,
              order?.customerName,
              order?.productName,
              order?.productTitle,
            ].map((value) => String(value || '').toLowerCase()).join(' ');
            if (!searchableText.includes(term)) return false;
          }

          return true;
        })
        .sort((left, right) => {
          const leftDate = new Date(left?.createdAt || left?.date || 0).getTime();
          const rightDate = new Date(right?.createdAt || right?.date || 0).getTime();
          return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
        });

      const pageNumber = Math.max(1, Number(page) || 1);
      const pageSize = Math.max(1, Number(limit) || 100);
      const total = filteredOrders.length;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(pageNumber, pages);
      const startIndex = (safePage - 1) * pageSize;

      return {
        orders: filteredOrders.slice(startIndex, startIndex + pageSize),
        pagination: { page: safePage, limit: pageSize, total, pages },
      };
    },

    getById: async (orderId, userId = null) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('order-storage', { state: { orders: mockOrders } });
      const allOrders = db.state.orders || mockOrders;
      const target = allOrders.find((entry) => (
        entry.id === orderId && (!userId || entry.userId === userId)
      ));

      if (!target) {
        throw new Error('Order not found');
      }

      return target;
    },
    
    create: async (orderData) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('order-storage', { state: { orders: mockOrders } });
      const existingOrders = db.state.orders || [];
      const idempotencyKey = String(orderData.idempotencyKey || '').trim();

      if (idempotencyKey) {
        const existing = existingOrders.find((o) => String(o.idempotencyKey || '') === idempotencyKey);
        if (existing) {
          return { order: existing };
        }
      }
      
      // Check User Balance (Transaction logic)
      const userDB = getDB('admin-storage', { state: { users: mockUsers } });
      const userIndex = userDB.state.users.findIndex(u => u.id === orderData.userId);
      
      if (userIndex === -1) throw new Error('User not found');
      const user = userDB.state.users[userIndex];
      
      const orderPrice = normalizeMoneyAmount(Number(orderData.priceCoins || 0));
      const currentWallet = getWalletBalanceSummary(user);
      const currentBalance = currentWallet.walletBalance;
      const spendableAmount = currentWallet.availableBalance;

      if (spendableAmount < orderPrice) {
          throw new Error('Insufficient balance');
      }
      
      // Deduct Coins
      const nextWallet = getWalletBalanceSummary({
        ...user,
        walletBalance: normalizeMoneyAmount(currentBalance - orderPrice, 2),
      });
      user.coins = nextWallet.walletBalance;
      user.walletBalance = nextWallet.walletBalance;
      user.balance = nextWallet.walletBalance;
      user.creditLimit = nextWallet.creditLimit;
      user.creditUsed = nextWallet.creditUsed;
      user.availableCredit = nextWallet.availableCredit;
      user.availableBalance = nextWallet.availableBalance;
      userDB.state.users[userIndex] = user;
      saveDB('admin-storage', userDB);
      
      // Create Order
      const newOrder = {
          id: `ord-${Date.now()}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          ...orderData,
          idempotencyKey: idempotencyKey || null,
          supplierId: null,
          supplierName: null,
          externalProductId: null,
          externalOrderId: null,
          externalStatus: null,
          supplierRequestSnapshot: null,
          supplierResponseSnapshot: null,
          supplierLastSyncAt: null,
          providerReferenceMessage: null,
          fulfillmentMode: 'manual',
      };

      // Auto fulfillment workflow
      const productsDb = getDB('products-storage', { state: { products: mockProducts } });
      const suppliersDb = getSuppliersDb();
      const product = (productsDb.state.products || []).find((p) => p.id === orderData.productId);
      const supplier = (suppliersDb.state.suppliers || []).find((s) => s.id === product?.supplierId);
      const canAutoFulfill = Boolean(
        product &&
        supplier &&
        supplier.isActive &&
        supplier.enableAutoFulfillment &&
        product.autoFulfillmentEnabled !== false &&
        product.externalProductId &&
        String(supplier.supplierType || '').toLowerCase() !== 'manual'
      );

        if (canAutoFulfill) {
          const mappings = Array.isArray(product.supplierFieldMappings) && product.supplierFieldMappings.length
            ? product.supplierFieldMappings
            : (Array.isArray(supplier.supplierFieldMappings) ? supplier.supplierFieldMappings : []);

          const orderFieldsValues = {
            ...(orderData.orderFieldsValues || {}),
            ...(orderData.orderFields || {}),
          };

          const internalSource = {
            ...orderFieldsValues,
            orderReference: newOrder.id,
            externalProductId: product.externalProductId,
            quantity: Number(orderData.quantity || 1),
            playerId: String(orderData.playerId || orderFieldsValues.playerId || orderFieldsValues.uid || ''),
            userId: String(orderData.userId || ''),
          };

        const payload = {};
        mappings.forEach((m) => {
          payload[m.externalField] = internalSource[m.internalField] ?? null;
        });
        if (!Object.keys(payload).length) {
          payload.externalProductId = product.externalProductId;
          payload.quantity = Number(orderData.quantity || 1);
          payload.playerId = String(orderData.playerId || '');
          payload.orderReference = newOrder.id;
        }

        // Simulated provider call (secured snapshot without credentials)
        const simulatedSuccess = Math.random() > 0.08;
        const externalId = `${supplier.supplierCode}-${Date.now()}`;
        const response = simulatedSuccess
          ? { success: true, message: 'Accepted', data: { orderId: externalId, status: 'pending' } }
          : { success: false, message: 'Provider rejected request', data: { status: 'failed' } };

        newOrder.supplierId = supplier.id;
        newOrder.supplierName = supplier.supplierName;
        newOrder.externalProductId = product.externalProductId;
        newOrder.externalOrderId = response?.data?.orderId || null;
        newOrder.externalStatus = response?.data?.status || (simulatedSuccess ? 'pending' : 'failed');
        newOrder.supplierRequestSnapshot = payload;
        newOrder.supplierResponseSnapshot = response;
        newOrder.supplierLastSyncAt = new Date().toISOString();
        newOrder.providerReferenceMessage = response?.message || '';
        newOrder.fulfillmentMode = 'auto';
        newOrder.status = simulatedSuccess ? 'processing' : 'failed';

        writeAuditLog({
          actorId: String(orderData.userId || 'system'),
          action: simulatedSuccess ? 'supplier_order_created' : 'supplier_order_failed',
          supplierId: supplier.id,
          orderId: newOrder.id,
          targetType: 'order',
          newSummary: { supplierName: supplier.supplierName, externalOrderId: newOrder.externalOrderId, status: newOrder.externalStatus },
        });
      }
      
      db.state.orders = [newOrder, ...(db.state.orders || [])];
      saveDB('order-storage', db);
      
      return { order: newOrder, updatedBalance: user.coins };
    },
    
    updateStatus: async (orderId, status) => {
       await new Promise(resolve => setTimeout(resolve, DELAY));
       const db = getDB('order-storage', { state: { orders: mockOrders } });
       const order = db.state.orders.find(o => o.id === orderId);
       
       if (order) {
           const isManualOrder = !order.supplierId && String(order.fulfillmentMode || '').toLowerCase() === 'manual';
           if (!isManualOrder) {
             throw new Error('Direct status changes are only available for manual orders');
           }

           const previousStatus = String(order.status || '').toLowerCase();
           const nextStatus = String(status || '').toLowerCase();
           const refundStatuses = ['failed', 'rejected', 'denied', 'cancelled', 'canceled', 'refunded'];
           const shouldRefund = refundStatuses.includes(nextStatus) && !order.refundedAt;

           order.status = nextStatus;
           order.updatedAt = new Date().toISOString();

           if (nextStatus === 'processing') {
             order.processingAt = order.updatedAt;
           }

           if (nextStatus === 'completed') {
             order.completedAt = order.updatedAt;
           }

           if (shouldRefund && previousStatus !== nextStatus) {
             const amountToRefund = Number(order.financialSnapshot?.finalAmountAtExecution ?? order.totalAmount ?? order.priceCoins ?? 0);
             const userDB = getDB('admin-storage', { state: { users: mockUsers } });
             const user = userDB.state.users.find((item) => item.id === order.userId);

             if (user) {
               user.coins = normalizeMoneyAmount(Number(user.coins || 0) + amountToRefund);
               saveDB('admin-storage', userDB);
             }

             order.refundedAt = order.updatedAt;
           }

           saveDB('order-storage', db);
       }
       return order;
    },

    syncSupplierStatus: async (orderId, actorContext) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('order-storage', { state: { orders: mockOrders } });
      const orders = db.state.orders || [];
      const order = orders.find((o) => o.id === orderId);
      if (!order || !order.supplierId || !order.externalOrderId) throw new Error('Order is not linked to supplier');

      const lifecycle = ['pending', 'processing', 'completed'];
      const current = String(order.externalStatus || 'pending').toLowerCase();
      const idx = Math.max(lifecycle.indexOf(current), 0);
      const next = lifecycle[Math.min(idx + 1, lifecycle.length - 1)];

      order.externalStatus = next;
      order.status = next === 'completed' ? 'completed' : (next === 'processing' ? 'processing' : 'pending');
      order.supplierLastSyncAt = new Date().toISOString();
      order.supplierResponseSnapshot = { success: true, data: { orderId: order.externalOrderId, status: next }, message: 'Synced' };

      saveDB('order-storage', db);
      writeAuditLog({
        actorId: actorContext?.id || 'system',
        action: 'supplier_status_sync',
        supplierId: order.supplierId,
        orderId: order.id,
        targetType: 'order',
        newSummary: { externalStatus: next },
      });
      return order;
    },
  },

  // --- Groups ---
  groups: {
    list: async () => {
       await new Promise(resolve => setTimeout(resolve, DELAY));
       const data = getDB('group-storage', { state: { groups: mockGroups } });
       return data.state.groups || mockGroups;
    },
     create: async (groupData) => {
       await new Promise(resolve => setTimeout(resolve, DELAY));
       const db = getDB('group-storage', { state: { groups: mockGroups } });
       const newGroup = { id: Date.now(), ...groupData };
       db.state.groups = [...(db.state.groups || []), newGroup];
       saveDB('group-storage', db);
       return newGroup;
     },
     update: async (id, updates) => {
       await new Promise(resolve => setTimeout(resolve, DELAY));
       const db = getDB('group-storage', { state: { groups: mockGroups } });
       const currentGroup = (db.state.groups || []).find((g) => String(g.id) === String(id)) || null;
       db.state.groups = (db.state.groups || []).map((g) => (String(g.id) === String(id) ? { ...g, ...updates } : g));
       saveDB('group-storage', db);
       const nextGroup = db.state.groups.find((g) => String(g.id) === String(id)) || null;

       if (currentGroup && nextGroup && String(currentGroup.name || '') !== String(nextGroup.name || '')) {
         const usersDb = getDB('admin-storage', { state: { users: mockUsers } });
         const migrated = await secureUsersInDb(usersDb);
         if (migrated) saveDB('admin-storage', usersDb);

         usersDb.state.users = (usersDb.state.users || []).map((user) => {
           const matchesById = String(user?.groupId || '').trim() === String(id);
           const matchesByName = String(user?.group || '').trim().toLowerCase() === String(currentGroup.name || '').trim().toLowerCase();

           if (!matchesById && !matchesByName) {
             return user;
           }

           return {
             ...user,
             group: nextGroup.name,
             groupId: String(nextGroup.id),
           };
         });
         saveDB('admin-storage', usersDb);
       }

       return nextGroup;
     },
     delete: async (id) => {
       await new Promise(resolve => setTimeout(resolve, DELAY));
       const db = getDB('group-storage', { state: { groups: mockGroups } });
       const targetGroup = (db.state.groups || []).find((g) => String(g.id) === String(id)) || null;
       const usersDb = getDB('admin-storage', { state: { users: mockUsers } });
       const migrated = await secureUsersInDb(usersDb);
       if (migrated) saveDB('admin-storage', usersDb);

       const hasMembers = (usersDb.state.users || []).some((user) => (
         String(user?.groupId || '').trim() === String(id)
         || (
           targetGroup?.name
           && String(user?.group || '').trim().toLowerCase() === String(targetGroup.name || '').trim().toLowerCase()
         )
       ));

       if (hasMembers) {
         throw new Error('Cannot delete a group that still has users. Transfer them first.');
       }

       db.state.groups = (db.state.groups || []).filter((g) => g.id !== id);
       saveDB('group-storage', db);
       return { success: true };
     },
  },
  
  // --- Admin User Management ---
  users: {
      list: async ({ search = '', role, status, email } = {}) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const data = getDB('admin-storage', { state: { users: mockUsers } });
        const migrated = await secureUsersInDb(data);
        if (migrated) saveDB('admin-storage', data);
        const term = String(search || '').trim().toLowerCase();
        const normalizedRole = String(role || '').trim().toLowerCase();
        const normalizedStatus = status ? normalizeAccountStatus(status) : '';
        const normalizedEmail = String(email || '').trim().toLowerCase();
        return (data.state.users || mockUsers)
          .filter((entry) => !entry?.deletedAt && entry?.isDeleted !== true)
          .filter((entry) => {
            if (normalizedRole && String(entry?.role || '').trim().toLowerCase() !== normalizedRole) return false;
            if (normalizedStatus && normalizeAccountStatus(entry?.status) !== normalizedStatus) return false;
            if (normalizedEmail && !String(entry?.email || '').toLowerCase().includes(normalizedEmail)) return false;
            if (!term) return true;
            return String(entry?.name || '').toLowerCase().includes(term)
              || String(entry?.email || '').toLowerCase().includes(term)
              || String(entry?.username || '').toLowerCase().includes(term);
          })
          .map(sanitizeUser);
      },

      listDeleted: async () => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const data = getDB('admin-storage', { state: { users: mockUsers } });
        const migrated = await secureUsersInDb(data);
        if (migrated) saveDB('admin-storage', data);
        return (data.state.users || mockUsers)
          .filter((entry) => entry?.deletedAt || entry?.isDeleted === true || String(entry?.status || '').toLowerCase() === 'deleted')
          .map(sanitizeUser);
      },

      getById: async (userId) => {
        await new Promise(resolve => setTimeout(resolve, DELAY));
        const db = getUsersDb();
        const migrated = await secureUsersInDb(db);
        if (migrated) saveDB('admin-storage', db);

        const user = (db?.state?.users || mockUsers).find((entry) => String(entry.id) === String(userId));
        if (!user) {
          throw new Error('User not found');
        }

        return sanitizeUser(user);
      },
      
      updateStatus: async (userId, status, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;
          ensureCanManageUser(actor, user, 'update status of');
          if (user) {
              const normalizedStatus = normalizeAccountStatus(status);
              user.status = normalizedStatus;
              if (normalizedStatus === 'approved') {
                user.approvedAt = new Date().toISOString();
                user.rejectedAt = null;
              } else if (normalizedStatus === 'rejected') {
                user.approvedAt = null;
                user.rejectedAt = new Date().toISOString();
              } else {
                user.approvedAt = null;
                user.rejectedAt = null;
              }
              saveDB('admin-storage', db);
          }
            return sanitizeUser(user);
      },
      
      addcoins: async (userId, amount, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;

          // Customer can only deduct their own balance (purchase flow), never add credits.
          const isSelfDeduction = actor && actor.role === 'customer' && actor.id === userId && Number(amount) < 0;
          if (!isSelfDeduction) {
            ensureCanManageUser(actor, user, 'top up');
          }

          if (user) {
              user.coins = normalizeMoneyAmount(Number(user.coins || 0) + Number(amount || 0));
              saveDB('admin-storage', db);

              const walletTxDb = getWalletTransactionsDb();
              const transactionCurrency = String(user.currency || 'USD').toUpperCase();
              const normalizedAmount = Math.abs(toFiniteNumber(amount, 0));
              const signedAmount = amount >= 0 ? normalizedAmount : -normalizedAmount;
              walletTxDb.state.transactions = [
                {
                  id: `manual-${Date.now()}`,
                  userId: String(userId),
                  type: amount >= 0 ? 'credit' : 'debit',
                  amount: normalizedAmount,
                  signedAmount,
                  status: 'completed',
                  description: amount >= 0 ? 'Admin balance top-up' : 'Admin balance deduction',
                  reference: `wallet-adjust-${Date.now()}`,
                  sourceType: 'admin_adjustment',
                  sourceId: Date.now(),
                  currency: transactionCurrency,
                  currencyCode: transactionCurrency,
                  originalCurrency: transactionCurrency,
                  financialSnapshot: {
                    originalCurrency: transactionCurrency,
                    originalAmount: normalizedAmount,
                    convertedAmountAtExecution: normalizedAmount,
                    finalAmountAtExecution: normalizedAmount,
                    pricingSnapshot: {
                      currency: transactionCurrency,
                      baseRate: 1,
                      finalRate: 1,
                      fees: 0,
                      discount: 0,
                    },
                  },
                  createdAt: new Date().toISOString(),
                  balanceAfter: toFiniteNumber(user.coins, 0),
                },
                ...(walletTxDb.state.transactions || []),
              ];
              saveWalletTransactionsDb(walletTxDb);
          }
            return {
              ...sanitizeUser(user),
              transaction: (getWalletTransactionsDb().state.transactions || [])[0] || null,
            };
          },

          updateGroup: async (userId, group, actorContext) => {
            await new Promise(resolve => setTimeout(resolve, DELAY));
            const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
            const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;
          ensureCanManageUser(actor, user, 'update group of');
            if (user) {
              const groupDb = getDB('group-storage', { state: { groups: mockGroups } });
              const groups = groupDb?.state?.groups || mockGroups;
              const matchedGroup = findGroupRecord(group, groups);
              user.group = matchedGroup?.name || resolveGroupName(group);
              user.groupId = matchedGroup?.id ? String(matchedGroup.id) : '';
              saveDB('admin-storage', db);
            }
            return sanitizeUser(user);
        },

        updateRole: async (userId, role, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;

          if (!actor || actor.role !== 'admin') {
          throw new Error('Only admin can change roles');
          }
          if (user.role === 'admin' && role !== 'admin') {
          throw new Error('Cannot demote an admin in mock security mode');
          }

          user.role = String(role || '').toLowerCase();
          saveDB('admin-storage', db);
          return sanitizeUser(user);
        },

        updatePermissions: async (userId, permissions = [], actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;

          if (!actor || actor.role !== 'admin') {
            throw new Error('Only admin can change permissions');
          }

          user.permissions = Array.isArray(permissions)
            ? [...new Set(permissions.map((item) => String(item || '').trim()).filter(Boolean))]
            : [];
          saveDB('admin-storage', db);
          return sanitizeUser(user);
        },

        updateCurrency: async (userId, currencyCode, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;
          ensureCanManageUser(actor, user, 'update currency for');

          const code = String(currencyCode || '').trim().toUpperCase();
          if (!code) throw new Error('Currency code is required');

          const systemDb = getDB('system-storage', { state: { currencies: mockCurrencies } });
          const list = systemDb?.state?.currencies || mockCurrencies;
          const exists = list.some((item) => String(item.code || '').toUpperCase() === code);
          if (!exists) throw new Error('Currency is not allowed in system settings');

          user.currency = code;
          saveDB('admin-storage', db);
          return sanitizeUser(user);
        },

        updateCreditLimit: async (userId, creditLimit, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;

          if (!actor || actor.role !== 'admin') {
            throw new Error('Only admin can update credit limit');
          }

          user.creditLimit = normalizeCreditLimitValue(creditLimit);
          saveDB('admin-storage', db);
          return sanitizeUser(user);
        },

        setBalance: async (userId, balance, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;

          ensureCanManageUser(actor, user, 'set balance for');

          user.coins = normalizeMoneyAmount(toFiniteNumber(balance, 0));
          saveDB('admin-storage', db);
          return sanitizeUser(user);
        },

        delete: async (userId, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const target = db.state.users.find(u => u.id === userId);
          if (!target) return { success: false };

          ensureCanManageUser(actor, target, 'delete');
          if (target.role === 'admin') {
          throw new Error('Cannot delete admin accounts');
          }

          target.deletedAt = new Date().toISOString();
          target.isDeleted = true;
          target.previousStatus = target.status || 'approved';
          target.status = 'deleted';
          saveDB('admin-storage', db);
          return { success: true };
        },

        restore: async (userId, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const target = db.state.users.find(u => u.id === userId);
          if (!target) return null;

          ensureCanManageUser(actor, target, 'restore');
          target.isDeleted = false;
          target.deletedAt = null;
          target.status = normalizeAccountStatus(target.previousStatus || target.status || 'approved') || 'approved';
          delete target.previousStatus;
          saveDB('admin-storage', db);
          return sanitizeUser(target);
        },

        updateAvatar: async (userId, avatar, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;

          // self-update is allowed for all roles
          const isSelf = actor && actor.id === userId;
          if (!isSelf) {
          ensureCanManageUser(actor, user, 'update avatar for');
          }

          let storedAvatar = avatar;
          if (avatar instanceof Blob) {
            storedAvatar = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result || ''));
              reader.onerror = () => reject(reader.error || new Error('Could not read avatar file.'));
              reader.readAsDataURL(avatar);
            });
          }

          user.avatar = storedAvatar;
          saveDB('admin-storage', db);
            return sanitizeUser(user);
      },

      updateProfile: async (userId, updates, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find(u => u.id === userId);
          if (!user) return null;

          const isSelf = actor && actor.id === userId;
          if (!isSelf) {
            ensureCanManageUser(actor, user, 'update profile for');
          }

          const nextName = typeof updates?.name === 'string' ? updates.name.trim() : user.name;
          const nextEmail = typeof updates?.email === 'string' ? updates.email.trim().toLowerCase() : user.email;
          const nextPassword = typeof updates?.password === 'string' ? updates.password : '';

          if (!nextName) {
            throw new Error('Name is required');
          }

          if (!nextEmail || !nextEmail.includes('@')) {
            throw new Error('A valid email is required');
          }

          const duplicate = db.state.users.find(
            (u) => u.id !== userId && String(u.email || '').toLowerCase() === nextEmail
          );
          if (duplicate) {
            throw new Error('Email already registered');
          }

          if (nextPassword && nextPassword.length < 6) {
            throw new Error('Password must be at least 6 characters');
          }

          user.name = nextName;
          user.email = nextEmail;
          if (nextPassword) {
            user.passwordHash = await hashPassword(nextPassword);
          }
          if (updates?.creditLimit !== undefined) {
            if (!actor || actor.role !== 'admin') {
              throw new Error('Only admin can update credit limit');
            }
            user.creditLimit = normalizeCreditLimitValue(updates.creditLimit);
          }
          if (updates?.isApiEnabled !== undefined) {
            if (!actor || actor.role !== 'admin') {
              throw new Error('Only admin can update API access');
            }
            user.isApiEnabled = Boolean(updates.isApiEnabled);
          }

          saveDB('admin-storage', db);
          return sanitizeUser(user);
      },

      resetPassword: async (userId, actorContext, nextPassword = '') => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('admin-storage', { state: { users: mockUsers } });
          const migrated = await secureUsersInDb(db);
          if (migrated) saveDB('admin-storage', db);
          const actor = resolveActor(actorContext);
          const user = db.state.users.find((u) => u.id === userId);
          if (!user) return null;

          const isSelf = actor && actor.id === userId;
          if (!isSelf) {
            ensureCanManageUser(actor, user, 'reset password for');
          }

          const explicitPassword = String(nextPassword || '').trim();
          const temporaryPassword = explicitPassword || randomTempPassword(10);
          if (temporaryPassword.length < 8) {
            throw new Error('Password must be at least 8 characters');
          }
          user.passwordHash = await hashPassword(temporaryPassword);
          saveDB('admin-storage', db);

          return {
            user: sanitizeUser(user),
            temporaryPassword,
          };
      }
  },

  adminWallets: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const usersDb = getUsersDb();
      const migrated = await secureUsersInDb(usersDb);
      if (migrated) saveDB('admin-storage', usersDb);

      return (usersDb?.state?.users || mockUsers)
        .filter((entry) => String(entry?.role || '').trim().toLowerCase() === 'customer')
        .map((entry) => buildMockWalletSummary(entry.id))
        .filter(Boolean);
    },

    getByUserId: async (userId) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const wallet = buildMockWalletSummary(userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      return wallet;
    },

    getTransactionsByUserId: async (userId) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      return buildMockWalletTransactionsForUser(userId);
    },
  },

  wallet: {
    getStats: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const authDb = getDB('auth-storage', { state: { user: null } });
      const authUserId = authDb?.state?.user?.id;
      const wallet = buildMockWalletSummary(authUserId);
      const transactions = buildMockWalletTransactionsForUser(authUserId);
      const totalDeposits = transactions.reduce((sum, entry) => (entry.signedAmount > 0 ? sum + entry.signedAmount : sum), 0);
      const totalSpent = Math.abs(transactions.reduce((sum, entry) => (entry.signedAmount < 0 ? sum + entry.signedAmount : sum), 0));

      return {
        walletBalance: wallet?.walletBalance || 0,
        currency: wallet?.currency || 'USD',
        recentTransactions: wallet?.recentTransactions || [],
        netBalance: wallet?.walletBalance || 0,
        totalTransactions: wallet?.transactionsCount || 0,
        totalDeposits,
        totalSpent,
      };
    },

    getTransactions: async ({ page = 1, limit = 50 } = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const authDb = getDB('auth-storage', { state: { user: null } });
      const authUserId = authDb?.state?.user?.id;
      const items = buildMockWalletTransactionsForUser(authUserId);
      const start = Math.max(0, (Number(page) - 1) * Number(limit));
      const typeMap = { credit: 'CREDIT', debit: 'DEBIT', refund: 'REFUND' };

      return items.slice(start, start + Number(limit)).map((entry) => ({
        _id: entry.id,
        userId: entry.userId,
        type: typeMap[entry.type] || 'CREDIT',
        amount: Math.abs(toFiniteNumber(entry.amount, 0)),
        signedAmount: toFiniteNumber(entry.signedAmount, 0),
        balanceAfter: entry.balanceAfter,
        description: entry.description,
        status: entry.status,
        reference: entry.reference,
        createdAt: entry.createdAt,
        currency: entry.currency,
        currencyCode: entry.currencyCode || entry.currency,
        originalCurrency: entry.originalCurrency || entry.currencyCode || entry.currency,
        financialSnapshot: entry.financialSnapshot || null,
        sourceType: entry.sourceType || null,
        sourceId: entry.sourceId || null,
      }));
    },
  },

  // --- Topups ---
  topups: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const data = getDB('topup-storage', { state: { topups: mockTopups } });
      return data.state.topups || mockTopups;
    },

    getById: async (topupId, userId = null) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const data = getDB('topup-storage', { state: { topups: mockTopups } });
      const topups = data.state.topups || mockTopups;
      const target = topups.find((entry) => (
        String(entry.id) === String(topupId) && (!userId || String(entry.userId) === String(userId))
      ));

      if (!target) {
        throw new Error('Topup not found');
      }

      return target;
    },
    
    create: async (topupData) => {
        await new Promise(resolve => setTimeout(resolve, DELAY));
        const db = getDB('topup-storage', { state: { topups: mockTopups } });
      const amount = Number(topupData.requestedAmount ?? topupData.requestedCoins ?? topupData.amount ?? 0);
        const newTopup = {
            id: `top-${Date.now()}`,
            ...topupData,
            status: 'pending',
        createdAt: new Date().toISOString(),
        requestedAmount: amount,
        requestedcoins: amount,
        amount,
        currencyCode: String(topupData.currencyCode || 'USD').toUpperCase(),
        paymentChannel: topupData.paymentChannel || 'cash_wallet',
        proofImage: topupData.proofImage || '',
        transferCountryCode: String(topupData.transferCountryCode || '').toUpperCase(),
        transferCountryName: topupData.transferCountryName || '',
        };
        db.state.topups = [newTopup, ...(db.state.topups || [])];
        saveDB('topup-storage', db);
        return newTopup;
    },

    updateStatus: async (topupId, status, review = {}) => {
        await new Promise(resolve => setTimeout(resolve, DELAY));
        const db = getDB('topup-storage', { state: { topups: mockTopups } });
        const topupIndex = db.state.topups.findIndex(t => t.id === topupId);
        
        if (topupIndex === -1) throw new Error('Topup not found');
        
        const topup = db.state.topups[topupIndex];
        const previousStatus = topup.status;
        topup.status = status;
        topup.reviewedAt = new Date().toISOString();
        topup.adminNote = review?.adminNote || topup.adminNote || '';
        
        if (status === 'completed' || status === 'approved') {
             const currencyCode = String(review?.currencyCode || topup.currencyCode || 'USD').toUpperCase();
             const requested = Number(topup.requestedAmount ?? topup.requestedCoins ?? topup.amount ?? 0);
             const actual = Number(review?.actualPaidAmount ?? topup.actualPaidAmount ?? requested);

             topup.currencyCode = currencyCode;
             topup.actualPaidAmount = actual;

             const systemDb = getDB('system-storage', { state: { currencies: mockCurrencies } });
             const currencies = systemDb?.state?.currencies || mockCurrencies;
             const matchedCurrency = currencies.find((item) => String(item.code || '').toUpperCase() === currencyCode);
             const rate = Number(matchedCurrency?.rate || 1);
             const creditedCoins = normalizeMoneyAmount(actual / (rate > 0 ? rate : 1));
             topup.creditedCoins = creditedCoins;

             // Add balance only once when entering approved/completed state.
             const wasApproved = previousStatus === 'approved' || previousStatus === 'completed';
             if (!wasApproved) {
               const userDB = getDB('admin-storage', { state: { users: mockUsers } });
               const user = userDB.state.users.find(u => u.id === topup.userId);
               if (user) {
                 user.coins = normalizeMoneyAmount(Number(user.coins || 0) + creditedCoins);
                 saveDB('admin-storage', userDB);
               }
             }
        }

        if (status === 'rejected' || status === 'denied') {
          topup.rejectedAt = new Date().toISOString();
        }
        
        db.state.topups[topupIndex] = topup;
        saveDB('topup-storage', db);
        return topup;
    },

    updateRequest: async (topupId, updates = {}) => {
        await new Promise(resolve => setTimeout(resolve, DELAY));
        const db = getDB('topup-storage', { state: { topups: mockTopups } });
        const topupIndex = db.state.topups.findIndex(t => t.id === topupId);

        if (topupIndex === -1) throw new Error('Topup not found');

        const topup = db.state.topups[topupIndex];
        const isPendingLike = topup.status === 'pending' || topup.status === 'requested';
        if (!isPendingLike) {
          throw new Error('Only pending requests can be edited');
        }

        const nextRequestedAmount = Number(
          updates?.requestedAmount ?? updates?.requestedCoins ?? updates?.amount ?? topup.requestedAmount ?? topup.requestedCoins ?? topup.amount ?? 0
        );

        if (!Number.isFinite(nextRequestedAmount) || nextRequestedAmount <= 0) {
          throw new Error('Requested amount must be a positive number');
        }

        topup.requestedAmount = nextRequestedAmount;
        topup.requestedCoins = nextRequestedAmount;
        topup.amount = nextRequestedAmount;
        topup.editedAt = new Date().toISOString();
        topup.adminNote = String(updates?.adminNote || topup.adminNote || '').trim();

        db.state.topups[topupIndex] = topup;
        saveDB('topup-storage', db);
        return topup;
    }
  },

  targetApps: {
    listActive: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-apps-storage', { state: { apps: [] } });
      const apps = Array.isArray(db.state.apps) ? db.state.apps : [];
      return apps.filter((app) => app.isActive !== false);
    },

    list: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-apps-storage', { state: { apps: [] } });
      return Array.isArray(db.state.apps) ? db.state.apps : [];
    },

    create: async (payload = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-apps-storage', { state: { apps: [] } });
      const app = {
        id: `target-app-${Date.now()}`,
        name: payload.name || 'Target App',
        targetAccountId: String(payload.targetAccountId || payload.receivingAccountId || payload.receiverAccountId || payload.recipientAccountId || payload.targetRecipientId || payload.receivingAccount || payload.targetAccount || payload.destinationAccountId || payload.accountId || payload.accountNumber || '').trim(),
        receivingAccountId: String(payload.receivingAccountId || payload.targetAccountId || payload.receiverAccountId || payload.recipientAccountId || payload.targetRecipientId || payload.receivingAccount || payload.targetAccount || payload.destinationAccountId || payload.accountId || payload.accountNumber || '').trim(),
        unitPrice: Number(payload.unitPrice || 0),
        image: payload.imagePreview || (typeof payload.image === 'string' ? payload.image : payload.image?.preview || ''),
        allowedPaymentMethods: payload.allowedPaymentMethods || payload.paymentMethodIds || [],
        isActive: payload.isActive !== false,
        createdAt: new Date().toISOString(),
      };
      db.state.apps = [app, ...(db.state.apps || [])];
      saveDB('target-apps-storage', db);
      return app;
    },

    update: async (id, payload = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-apps-storage', { state: { apps: [] } });
      const index = db.state.apps.findIndex((app) => String(app.id) === String(id));
      if (index === -1) throw new Error('Target app not found');
      db.state.apps[index] = {
        ...db.state.apps[index],
        ...payload,
        image: payload.imagePreview || (typeof payload.image === 'string' ? payload.image : payload.image?.preview || db.state.apps[index].image),
        allowedPaymentMethods: payload.allowedPaymentMethods || payload.paymentMethodIds || db.state.apps[index].allowedPaymentMethods,
        updatedAt: new Date().toISOString(),
      };
      saveDB('target-apps-storage', db);
      return db.state.apps[index];
    },

    delete: async (id) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-apps-storage', { state: { apps: [] } });
      const index = db.state.apps.findIndex((app) => String(app.id) === String(id));
      if (index === -1) throw new Error('Target app not found');
      db.state.apps[index] = { ...db.state.apps[index], isActive: false, updatedAt: new Date().toISOString() };
      saveDB('target-apps-storage', db);
      return db.state.apps[index];
    },
  },

  targetPurchases: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-purchases-storage', { state: { requests: [] } });
      return db.state.requests || [];
    },

    listMine: async (params = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-purchases-storage', { state: { requests: [] } });
      const userId = String(params.userId || params.customerId || '').trim();
      const requests = db.state.requests || [];
      return userId
        ? requests.filter((request) => String(request.userId || '').trim() === userId)
        : requests;
    },

    create: async (payload) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-purchases-storage', { state: { requests: [] } });
      const readValue = (key) => (
        payload instanceof FormData ? payload.get(key) : payload?.[key]
      );
      const screenshot = readValue('screenshotProof') || readValue('screenshot') || readValue('proofImage') || null;
      const appId = readValue('appId') || readValue('productId');
      const apps = await mockApi.targetApps.list();
      const app = apps.find((item) => String(item.id) === String(appId)) || {};
      const coinAmount = Number(readValue('coinAmount') || readValue('coins') || readValue('quantity') || 0);
      const unitPrice = Number(app.unitPrice || readValue('unitPrice') || 0);
      const request = {
        id: `target-${Date.now()}`,
        userId: readValue('userId'),
        userName: readValue('userName'),
        userEmail: readValue('userEmail'),
        appId,
        appNameSnapshot: app.name || readValue('productName') || '',
        targetAccountIdSnapshot: app.targetAccountId || app.receivingAccountId || app.receiverAccountId || app.recipientAccountId || app.targetRecipientId || app.receivingAccount || app.targetAccount || app.destinationAccountId || readValue('targetAccountIdSnapshot') || '',
        targetAccountId: app.targetAccountId || app.receivingAccountId || app.receiverAccountId || app.recipientAccountId || app.targetRecipientId || app.receivingAccount || app.targetAccount || app.destinationAccountId || readValue('targetAccountIdSnapshot') || '',
        coinAmount,
        quantity: coinAmount,
        unitPriceSnapshot: unitPrice,
        unitPrice,
        totalPrice: coinAmount * unitPrice,
        senderId: readValue('senderId') || readValue('playerId'),
        transferNumber: readValue('transferNumber') || readValue('vodafoneCashNumber'),
        transactionNumber: readValue('transactionNumber') || readValue('transactionId') || readValue('paymentReference'),
        paymentMethod: readValue('paymentMethod') || readValue('paymentMethodName'),
        paymentMethodId: readValue('paymentMethodId'),
        screenshotName: screenshot?.name || '',
        proofImage: screenshot?.preview || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      db.state.requests = [request, ...(db.state.requests || [])];
      saveDB('target-purchases-storage', db);
      return request;
    },

    updateStatus: async (id, status, payload = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getDB('target-purchases-storage', { state: { requests: [] } });
      const index = (db.state.requests || []).findIndex((entry) => String(entry.id) === String(id));
      if (index === -1) throw new Error('Target request not found');
      const normalizedStatus = String(status || 'PENDING').trim().toUpperCase();
      const rejectionReason = payload.adminNotes ?? payload.rejectionReason ?? payload.reason ?? '';
      const next = {
        ...db.state.requests[index],
        status: normalizedStatus,
        adminNotes: normalizedStatus === 'REJECTED' ? rejectionReason : '',
        rejectionReason: normalizedStatus === 'REJECTED' ? rejectionReason : '',
        reviewedAt: new Date().toISOString(),
      };
      db.state.requests[index] = next;
      saveDB('target-purchases-storage', db);
      return next;
    },
  },

  // --- System ---
  system: {
      currencies: async () => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('system-storage', { state: { currencies: mockCurrencies } });
          const items = db.state.currencies || mockCurrencies;
          return [...items];
      },

      addCurrency: async (currencyData, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const actor = resolveActor(actorContext);
          ensureAdmin(actor);

          const db = getDB('system-storage', { state: { currencies: mockCurrencies } });
          const currencies = db.state.currencies || mockCurrencies;
          const code = String(currencyData?.code || '').trim().toUpperCase();
          const name = String(currencyData?.name || '').trim();
          const symbol = String(currencyData?.symbol || '').trim();
          const rate = Number(currencyData?.rate);

          if (!code || !name || !symbol || Number.isNaN(rate) || rate <= 0) {
            throw new Error('Invalid currency payload');
          }

          if (currencies.some((item) => String(item.code || '').toUpperCase() === code)) {
            throw new Error('Currency code already exists');
          }

          const newCurrency = { code, name, symbol, rate };
          db.state.currencies = [...currencies, newCurrency];
          saveDB('system-storage', db);
          return newCurrency;
      },

      updateCurrency: async (code, updates, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const actor = resolveActor(actorContext);
          ensureAdmin(actor);

          const db = getDB('system-storage', { state: { currencies: mockCurrencies } });
          const currencies = db.state.currencies || mockCurrencies;
          const normalizedCode = String(code || '').trim().toUpperCase();
          const index = currencies.findIndex((item) => String(item.code || '').toUpperCase() === normalizedCode);
          if (index === -1) throw new Error('Currency not found');

          const nextRate = updates?.rate !== undefined ? Number(updates.rate) : currencies[index].rate;
          if (Number.isNaN(nextRate) || nextRate <= 0) {
            throw new Error('Rate must be a positive number');
          }

          const updated = {
            ...currencies[index],
            name: updates?.name ? String(updates.name).trim() : currencies[index].name,
            symbol: updates?.symbol ? String(updates.symbol).trim() : currencies[index].symbol,
            rate: nextRate,
          };
          currencies[index] = updated;

          db.state.currencies = [...currencies];
          saveDB('system-storage', db);
          return updated;
      },

      deleteCurrency: async (code, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const actor = resolveActor(actorContext);
          ensureAdmin(actor);

          const normalizedCode = String(code || '').trim().toUpperCase();
          if (normalizedCode === 'USD') {
            throw new Error('USD cannot be deleted');
          }

          const db = getDB('system-storage', { state: { currencies: mockCurrencies } });
          const currencies = db.state.currencies || mockCurrencies;
          db.state.currencies = currencies.filter((item) => String(item.code || '').toUpperCase() !== normalizedCode);
          saveDB('system-storage', db);
          return { success: true };
      },

      paymentSettings: async () => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const db = getDB('system-storage', { state: { paymentSettings: defaultPaymentSettings } });
          const paymentSettings = db?.state?.paymentSettings || defaultPaymentSettings;
          const countryAccounts = Array.isArray(paymentSettings?.countryAccounts)
            ? paymentSettings.countryAccounts
            : [];
          const paymentGroups = normalizePaymentGroups(paymentSettings?.paymentGroups, { fallbackToDefault: false });
          return {
            ...defaultPaymentSettings,
            ...paymentSettings,
            countryAccounts,
            paymentGroups,
            whatsappNumber: paymentSettings?.whatsappNumber || getDefaultWhatsAppNumber(),
          };
      },

      updatePaymentSettings: async (settings, actorContext) => {
          await new Promise(resolve => setTimeout(resolve, DELAY));
          const actor = resolveActor(actorContext);
          ensureAdmin(actor);

          const db = getDB('system-storage', { state: { paymentSettings: defaultPaymentSettings } });
          const current = db?.state?.paymentSettings || defaultPaymentSettings;
          const currentAccounts = Array.isArray(current?.countryAccounts) ? current.countryAccounts : [];
          const incomingAccounts = Array.isArray(settings?.countryAccounts) ? settings.countryAccounts : currentAccounts;
          const currentGroups = normalizePaymentGroups(current?.paymentGroups, { fallbackToDefault: false });
          const incomingGroups = Array.isArray(settings?.paymentGroups) ? settings.paymentGroups : currentGroups;
          const normalizedAccounts = incomingAccounts
            .map((item) => ({
              countryCode: String(item?.countryCode || '').trim().toUpperCase(),
              countryName: String(item?.countryName || '').trim(),
              currencyCode: String(item?.currencyCode || '').trim().toUpperCase(),
              cashWalletNumber: String(item?.cashWalletNumber || '').trim(),
              bankAccountNumber: String(item?.bankAccountNumber || '').trim(),
              bankAccountName: String(item?.bankAccountName || '').trim(),
            }))
            .filter((item) => item.countryCode);
          const normalizedGroups = normalizePaymentGroups(incomingGroups, { fallbackToDefault: false });

          const next = {
            ...current,
            countryAccounts: normalizedAccounts,
            instructions: String(settings?.instructions ?? current?.instructions ?? '').trim(),
            whatsappNumber: normalizeWhatsAppNumber(
              settings?.whatsappNumber ?? current?.whatsappNumber ?? getDefaultWhatsAppNumber()
            ),
            paymentGroups: normalizedGroups,
          };

          db.state.paymentSettings = next;
          saveDB('system-storage', db);
          return next;
      }
  },

  dashboard: {
    getDashboardStats: async ({ startDate, endDate } = {}) => {
      await new Promise(resolve => setTimeout(resolve, DELAY));

      const orders = getOrdersDb()?.state?.orders || mockOrders;
      const users = getUsersDb()?.state?.users || mockUsers;
      const productsDb = getDB('products-storage', { state: { products: mockProducts } });
      const products = productsDb?.state?.products || mockProducts;
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end && /^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) end.setHours(23, 59, 59, 999);

      const inRange = (value) => {
        if (!start && !end) return true;
        const date = new Date(value || 0);
        if (Number.isNaN(date.getTime())) return false;
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      };

      const rangedOrders = orders.filter((order) => inRange(order.createdAt || order.date || order.updatedAt));
      const completedOrders = rangedOrders.filter((order) => ['completed', 'approved', 'success'].includes(String(order.status || '').toLowerCase()));
      const pendingStatuses = ['pending', 'requested', 'under_review', 'processing'];

      return {
        orders: {
          total: rangedOrders.length,
          completed: completedOrders.length,
          pending: rangedOrders.filter((order) => String(order.status || '').toLowerCase() === 'pending').length,
          processing: rangedOrders.filter((order) => String(order.status || '').toLowerCase() === 'processing').length,
          pendingProcessing: rangedOrders.filter((order) => pendingStatuses.includes(String(order.status || '').toLowerCase())).length,
        },
        financials: {
          totalRevenueUsd: completedOrders.reduce((sum, order) => sum + Number(order.usdAmount ?? order.totalRevenueUsd ?? order.totalAmount ?? order.priceCoins ?? 0), 0),
          totalProfitUsd: completedOrders.reduce((sum, order) => sum + Number(order.profitUsd ?? order.financialSnapshot?.profitUsd ?? 0), 0),
        },
        users: {
          total: users.filter((user) => String(user.role || '').toLowerCase() === 'customer').length,
          active: users.filter((user) => String(user.role || '').toLowerCase() === 'customer' && ['active', 'approved'].includes(String(user.status || '').toLowerCase())).length,
          totalWalletBalance: users.reduce((sum, user) => sum + Number(user.coins ?? user.walletBalance ?? 0), 0),
        },
        products: {
          total: products.length,
          active: products.filter((product) => product.isActive !== false).length,
        },
      };
    },
  },

  audit: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const db = getAuditDb();
      return db.state.logs || [];
    }
  }
};

export default mockApi;
