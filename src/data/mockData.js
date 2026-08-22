import chatAppsImage from '../assets/slide-1.webp';
import gamesChargingImage from '../assets/slide-2.webp';
import buyCardsImage from '../assets/slide-3.webp';

export const mockUsers = [
  {
    id: 'u1',
    name: 'N&A HUB Admin',
    email: 'admin@kanz-coins.com',
    password: 'REDACTED',
    role: 'admin',
    status: 'approved',
    signupMethod: 'email',
    group: 'VIP',
    coins: 10000,
    creditLimit: 0,
    country: 'US',
    currency: 'USD',
    createdAt: '2026-01-03T09:00:00Z',
    approvedAt: '2026-01-03T09:05:00Z',
    avatar: '',
  },
  {
    id: 'u2',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'REDACTED',
    role: 'customer',
    status: 'approved',
    signupMethod: 'email',
    group: 'Normal',
    coins: 5000,
    creditLimit: 0,
    country: 'EG',
    currency: 'EGP',
    createdAt: '2026-03-01T14:10:00Z',
    approvedAt: '2026-03-01T14:25:00Z',
    avatar: '',
  },
  {
    id: 'u3',
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'REDACTED',
    role: 'customer',
    status: 'pending',
    signupMethod: 'google',
    group: 'Normal',
    coins: 0,
    creditLimit: 0,
    country: 'UK',
    currency: 'GBP',
    createdAt: '2026-03-16T11:35:00Z',
    avatar: '',
  },
  {
    id: 'u4',
    name: 'Operations Manager',
    email: 'manager@kanz-coins.com',
    password: 'REDACTED',
    role: 'manager',
    status: 'approved',
    signupMethod: 'email',
    group: 'Standard',
    coins: 0,
    creditLimit: 0,
    country: 'AE',
    currency: 'USD',
    createdAt: '2026-02-08T08:30:00Z',
    approvedAt: '2026-02-08T08:33:00Z',
    avatar: '',
  },
  {
    id: 'u5',
    name: 'Sara Google',
    email: 'sara.google@example.com',
    password: 'REDACTED',
    role: 'customer',
    status: 'rejected',
    signupMethod: 'google',
    group: 'Normal',
    coins: 0,
    creditLimit: 0,
    country: 'SA',
    currency: 'SAR',
    createdAt: '2026-03-10T18:20:00Z',
    rejectedAt: '2026-03-11T09:40:00Z',
    avatar: '',
  },
];

export const mockCategories = [
  { id: 'apps', name: 'Chat Apps', nameAr: '\u0628\u0631\u0627\u0645\u062c \u062f\u0631\u062f\u0634\u0629', image: chatAppsImage },
  { id: 'games', name: 'Games', nameAr: '\u0623\u0644\u0639\u0627\u0628', image: gamesChargingImage },
  { id: 'cards', name: 'Digital Cards', nameAr: '\u0628\u0637\u0627\u0642\u0627\u062a \u0631\u0642\u0645\u064a\u0629', image: buyCardsImage }
];

export const mockGroups = [
  { id: 1, name: 'Standard', discount: 0 },
  { id: 2, name: 'VIP', discount: 10 },
  { id: 3, name: 'Premium', discount: 5 },
];

export const mockSuppliers = [
  {
    id: 'sup-1',
    supplierName: 'FastTopup',
    supplierCode: 'FASTTOPUP',
    supplierType: 'api',
    baseUrl: 'https://api.fasttopup.example',
    authType: 'api_key',
    apiKey: '***',
    apiSecret: '',
    bearerToken: '',
    username: '',
    password: '',
    customHeaders: [{ key: 'X-Client', value: 'kanz-coins' }],
    timeoutMs: 8000,
    webhookUrl: '',
    webhookSecret: '',
    placeOrderEndpoint: '/orders/create',
    checkOrderStatusEndpoint: '/orders/status',
    getBalanceEndpoint: '/balance',
    getProductsEndpoint: '/products',
    cancelOrderEndpoint: '/orders/cancel',
    requestMethod: 'POST',
    payloadFormat: 'json',
    responseFormat: 'json',
    successKeyPath: 'success',
    externalOrderIdPath: 'data.orderId',
    externalStatusPath: 'data.status',
    externalMessagePath: 'message',
    externalBalancePath: 'data.balance',
    productsPath: 'data.items',
    supplierFieldMappings: [
      { internalField: 'playerId', externalField: 'uid' },
      { internalField: 'quantity', externalField: 'qty' },
      { internalField: 'externalProductId', externalField: 'service' },
      { internalField: 'orderReference', externalField: 'reference' }
    ],
    isActive: true,
    enableAutoFulfillment: true,
    enableStatusSync: true,
    enableProductSync: false,
    lastConnectionTestAt: null,
    lastConnectionTestStatus: 'not_tested',
    lastConnectionTestMessage: 'Not tested',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: ''
  }
];

export const mockProducts = [
  {
    id: 'p1',
    name: 'PUBG Mobile UC',
    nameAr: 'شدات ببجي موبايل',
    image: 'https://picsum.photos/seed/pubg/400/300',
    description: 'Get UC for PUBG Mobile instantly.',
    descriptionAr: 'اشحن شدات ببجي موبايل فورًا.',
    category: 'games',
    basePricecoins: 100,
    status: 'active',
    adminOverridePricecoins: null,
    // =====================================================
    // إعدادات المنتج - Product Settings
    // =====================================================
    productStatus: 'available', // available | unavailable | paused
    isVisibleInStore: true,
    showWhenUnavailable: false,
    pauseSales: false,
    pauseReason: '',
    internalNotes: 'منتج أساسي - يجب الاحتفاظ به متاحًا دائمًا',
    // =====================================================
    // جدولة الظهور - Schedule
    // =====================================================
    enableSchedule: false,
    scheduledStartAt: null,
    scheduledEndAt: null,
    scheduleVisibilityMode: 'hide', // hide | coming_soon | expired
    // =====================================================
    // حدود الطلب - Order Limits
    // =====================================================
    minimumOrderQty: 1,
    maximumOrderQty: 999,
    stepQty: 1,
    // =====================================================
    // إدارة المخزون - Inventory Management
    // =====================================================
    trackInventory: false,
    stockQuantity: 999,
    lowStockThreshold: 50,
    hideWhenOutOfStock: false,
    showOutOfStockLabel: true,
    supplierId: 'sup-1',
    externalProductId: 'alpha-pubg-60',
    externalProductName: 'PUBG UC 60',
    autoFulfillmentEnabled: true,
    fallbackSupplierId: '',
    supplierFieldMappings: [
      { internalField: 'playerId', externalField: 'uid' },
      { internalField: 'quantity', externalField: 'qty' }
    ],
    externalPricingMode: 'use_local_price',
    supplierMarginType: 'fixed',
    supplierMarginValue: 0,
    supplierNotes: '',
  },
  {
    id: 'p2',
    name: 'Netflix Premium',
    nameAr: 'اشتراك نتفليكس',
    image: 'https://picsum.photos/seed/netflix/400/300',
    description: '1 Month 4K UHD subscription.',
    descriptionAr: 'اشتراك شهر واحد 4K UHD.',
    category: 'apps',
    basePricecoins: 250,
    status: 'active',
    adminOverridePricecoins: 240,
    productStatus: 'available',
    isVisibleInStore: true,
    showWhenUnavailable: false,
    pauseSales: false,
    pauseReason: '',
    internalNotes: '',
    enableSchedule: false,
    scheduledStartAt: null,
    scheduledEndAt: null,
    scheduleVisibilityMode: 'hide',
    minimumOrderQty: 1,
    maximumOrderQty: 5,
    stepQty: 1,
    trackInventory: true,
    stockQuantity: 100,
    lowStockThreshold: 20,
    hideWhenOutOfStock: false,
    showOutOfStockLabel: true,
  },
  {
    id: 'p3',
    name: 'Free Fire Diamonds',
    nameAr: 'جواهر فري فاير',
    image: 'https://picsum.photos/seed/freefire/400/300',
    description: 'Top up diamonds for Free Fire.',
    descriptionAr: 'اشحن جواهر فري فاير.',
    category: 'games',
    basePricecoins: 50,
    status: 'active',
    adminOverridePricecoins: null,
    productStatus: 'available',
    isVisibleInStore: true,
    showWhenUnavailable: true,
    pauseSales: false,
    pauseReason: '',
    internalNotes: 'منتج شهير - يظهر حتى عند عدم التوفر',
    enableSchedule: false,
    scheduledStartAt: null,
    scheduledEndAt: null,
    scheduleVisibilityMode: 'hide',
    minimumOrderQty: 1,
    maximumOrderQty: 10,
    stepQty: 1,
    trackInventory: true,
    stockQuantity: 500,
    lowStockThreshold: 100,
    hideWhenOutOfStock: false,
    showOutOfStockLabel: true,
  },
  {
    id: 'p4',
    name: 'Spotify Premium',
    nameAr: 'اشتراك سبوتيفاي',
    image: 'https://picsum.photos/seed/spotify/400/300',
    description: 'Ad-free music listening.',
    descriptionAr: 'استماع للموسيقى بدون إعلانات.',
    category: 'apps',
    basePricecoins: 120,
    status: 'active',
    adminOverridePricecoins: null,
    productStatus: 'available',
    isVisibleInStore: true,
    showWhenUnavailable: false,
    pauseSales: false,
    pauseReason: '',
    internalNotes: '',
    enableSchedule: false,
    scheduledStartAt: null,
    scheduledEndAt: null,
    scheduleVisibilityMode: 'hide',
    minimumOrderQty: 1,
    maximumOrderQty: 3,
    stepQty: 1,
    trackInventory: false,
    stockQuantity: 999,
    lowStockThreshold: 10,
    hideWhenOutOfStock: false,
    showOutOfStockLabel: true,
  },
  {
    id: 'p5',
    name: 'iTunes Gift Card',
    nameAr: 'بطاقة آيتونز',
    image: 'https://picsum.photos/seed/itunes/400/300',
    description: '$10 US Store Gift Card.',
    descriptionAr: 'بطاقة بقيمة 10 دولار للمتجر الأمريكي.',
    category: 'cards',
    basePricecoins: 380,
    status: 'active',
    adminOverridePricecoins: null,
    productStatus: 'available',
    isVisibleInStore: true,
    showWhenUnavailable: false,
    pauseSales: false,
    pauseReason: '',
    internalNotes: '',
    enableSchedule: false,
    scheduledStartAt: null,
    scheduledEndAt: null,
    scheduleVisibilityMode: 'hide',
    minimumOrderQty: 1,
    maximumOrderQty: 10,
    stepQty: 1,
    trackInventory: true,
    stockQuantity: 50,
    lowStockThreshold: 10,
    hideWhenOutOfStock: true,
    showOutOfStockLabel: false,
  },
];

export const mockOrders = [
  {
    id: 'o1',
    userId: 'u2',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    productId: 'p1',
    productName: 'PUBG Mobile UC',
    productNameAr: 'شدات ببجي موبايل',
    status: 'completed',
    createdAt: '2026-03-15T10:00:00Z',
    // Financial Snapshot - Fixed values at order time
    financialSnapshot: {
      originalCurrency: 'EGP',
      originalAmount: 105, // Price in coins at order time
      exchangeRateAtExecution: 30.9, // EGP rate at order time
      convertedAmountAtExecution: 105, // Final amount in coins
      finalAmountAtExecution: 105, // Amount deducted from wallet
      pricingSnapshot: {
        basePrice: 100, // Base price of product
        groupDiscount: 0, // No discount for this user
        finalPrice: 105, // Final price after any adjustments
        currency: 'EGP'
      },
      feesSnapshot: {
        processingFee: 0,
        serviceFee: 0,
        totalFees: 0
      }
    },
    // Legacy fields for backward compatibility
    pricecoins: 105,
    quantity: 1,
    totalAmount: 105,
    supplierId: 'sup-1',
    supplierName: 'FastTopup',
    externalProductId: 'alpha-pubg-60',
    externalOrderId: 'FT-78451299',
    externalStatus: 'completed',
    supplierRequestSnapshot: { uid: '100200300', qty: 1, service: 'alpha-pubg-60' },
    supplierResponseSnapshot: { success: true, data: { orderId: 'FT-78451299', status: 'completed' } },
    supplierLastSyncAt: '2026-03-15T10:10:00Z',
    providerReferenceMessage: 'Delivered',
    fulfillmentMode: 'auto',
  },
  {
    id: 'o2',
    userId: 'u2',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    productId: 'p2',
    productName: 'Netflix Premium',
    productNameAr: 'اشتراك نتفليكس',
    status: 'pending',
    createdAt: '2026-03-17T09:25:00Z',
    financialSnapshot: {
      originalCurrency: 'USD',
      originalAmount: 250,
      exchangeRateAtExecution: 1,
      convertedAmountAtExecution: 250,
      finalAmountAtExecution: 250,
      pricingSnapshot: {
        basePrice: 250,
        groupDiscount: 0,
        finalPrice: 250,
        currency: 'USD'
      },
      feesSnapshot: {
        processingFee: 0,
        serviceFee: 0,
        totalFees: 0
      }
    },
    pricecoins: 250,
    quantity: 1,
    totalAmount: 250,
    fulfillmentMode: 'manual',
    orderFieldsValues: {
      accountEmail: 'john.netflix@example.com',
      profileName: 'Family Plan'
    },
    notes: 'Pending admin review for manual subscription provisioning.',
  },
  {
    id: 'o3',
    userId: 'u3',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    productId: 'p5',
    productName: 'iTunes Gift Card',
    productNameAr: 'بطاقة آيتونز',
    status: 'processing',
    createdAt: '2026-03-16T18:40:00Z',
    financialSnapshot: {
      originalCurrency: 'USD',
      originalAmount: 380,
      exchangeRateAtExecution: 1,
      convertedAmountAtExecution: 760,
      finalAmountAtExecution: 760,
      pricingSnapshot: {
        basePrice: 380,
        groupDiscount: 0,
        finalPrice: 760,
        currency: 'USD'
      },
      feesSnapshot: {
        processingFee: 0,
        serviceFee: 0,
        totalFees: 0
      }
    },
    pricecoins: 760,
    quantity: 2,
    totalAmount: 760,
    fulfillmentMode: 'manual',
    orderFieldsValues: {
      region: 'US Store',
      deliveryEmail: 'jane.cards@example.com'
    },
    notes: 'Gift card codes are being prepared manually.',
  },
  {
    id: 'o4',
    userId: 'u3',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    productId: 'p1',
    productName: 'PUBG Mobile UC',
    productNameAr: 'شدات ببجي موبايل',
    status: 'failed',
    createdAt: '2026-03-14T13:10:00Z',
    financialSnapshot: {
      originalCurrency: 'USD',
      originalAmount: 100,
      exchangeRateAtExecution: 1,
      convertedAmountAtExecution: 100,
      finalAmountAtExecution: 100,
      pricingSnapshot: {
        basePrice: 100,
        groupDiscount: 0,
        finalPrice: 100,
        currency: 'USD'
      },
      feesSnapshot: {
        processingFee: 0,
        serviceFee: 0,
        totalFees: 0
      }
    },
    pricecoins: 100,
    quantity: 1,
    totalAmount: 100,
    supplierId: 'sup-1',
    supplierName: 'FastTopup',
    externalProductId: 'alpha-pubg-60',
    externalOrderId: 'FT-78451311',
    externalStatus: 'failed',
    supplierRequestSnapshot: { uid: '700800900', qty: 1, service: 'alpha-pubg-60' },
    supplierResponseSnapshot: { success: false, data: { orderId: 'FT-78451311', status: 'failed' } },
    supplierLastSyncAt: '2026-03-14T13:15:00Z',
    providerReferenceMessage: 'Provider rejected request due to invalid UID.',
    fulfillmentMode: 'auto',
  },
];

export const mockTopups = [
  {
    id: 't1',
    userId: 'u2',
    userName: 'John Doe',
    status: 'approved',
    createdAt: '2023-10-20T14:30:00Z',
    // Financial Snapshot - Fixed values at execution time
    financialSnapshot: {
      originalCurrency: 'USD',
      originalAmount: 100, // 100 USD paid
      exchangeRateAtExecution: 50, // 1 USD = 50 EGP at execution time
      convertedAmountAtExecution: 5000, // 100 * 50 = 5000 EGP
      finalAmountAtExecution: 5000, // Final amount credited to wallet
      pricingSnapshot: {
        baseRate: 50,
        fees: 0,
        discount: 0,
        finalRate: 50
      },
      feesSnapshot: {
        processingFee: 0,
        transferFee: 0,
        totalFees: 0
      }
    },
    // Legacy fields for backward compatibility
    requestedAmount: 100,
    actualPaidAmount: 100,
    currencyCode: 'USD',
    requestedcoins: 5000,
    creditedcoins: 5000,
    adminNote: 'Approved - Payment verified'
  },
  {
    id: 't4',
    userId: 'u2',
    userName: 'John Doe',
    status: 'approved', // Auto-approved
    createdAt: '2023-10-28T14:20:00Z',
    type: 'game_topup',
    gameDetails: {
      gameName: 'Free Fire',
      gameId: 'FF987654321',
      packageName: 'Diamonds 100',
      quantity: 100
    },
    // Financial Snapshot - Auto-generated
    financialSnapshot: {
      originalCurrency: 'USD',
      originalAmount: 2,
      exchangeRateAtExecution: 50,
      convertedAmountAtExecution: 100,
      finalAmountAtExecution: 100,
      pricingSnapshot: {
        baseRate: 50,
        fees: 0,
        discount: 0,
        finalRate: 50
      },
      feesSnapshot: {
        processingFee: 0,
        transferFee: 0,
        totalFees: 0
      }
    },
    requestedAmount: 2,
    actualPaidAmount: 2,
    currencyCode: 'USD',
    requestedcoins: 100,
    creditedcoins: 100,
    adminNote: 'Auto-approved - Game top-up'
  },
];

export const mockCurrencies = [
  { code: 'USD', name: 'US Dollar', rate: 1.0, symbol: '$' },
  { code: 'EGP', name: 'Egyptian Pound', rate: 30.9, symbol: 'EGP' },
  { code: 'SAR', name: 'Saudi Riyal', rate: 3.75, symbol: 'SAR' },
];
