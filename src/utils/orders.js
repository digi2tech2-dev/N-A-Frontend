import { formatDateTime, formatNumber } from './intl';
import { getMoneyFormatOptions } from './money';
import { formatCurrencyAmount } from './pricing';
import { getProductQuantityMeta, resolveProductOrderFields } from './productPurchase';
import { resolveOrderExecutionCurrency } from './transactionCurrency';
import { resolveUserAvatar } from './avatar';

const ORDER_STATUS_META = {
  completed: {
    variant: 'success',
    labelAr: 'مكتمل',
    labelEn: 'Completed',
    dotClassName: 'bg-[var(--color-success)]',
  },
  processing: {
    variant: 'warning',
    labelAr: 'قيد التنفيذ',
    labelEn: 'In progress',
    dotClassName: 'bg-[var(--color-warning)]',
  },
  incomplete: {
    variant: 'danger',
    labelAr: 'غير مكتمل',
    labelEn: 'Incomplete',
    dotClassName: 'bg-[var(--color-error)]',
  },
  manual_review: {
    variant: 'danger',
    labelAr: 'مراجعة يدوية',
    labelEn: 'Manual review',
    dotClassName: 'bg-[var(--color-error)] animate-pulse',
  },
};

const ORDER_TYPE_META = {
  auto: {
    variant: 'info',
    labelAr: 'أوتوماتيكي',
    labelEn: 'Automatic',
  },
  manual: {
    variant: 'secondary',
    labelAr: 'يدوي',
    labelEn: 'Manual',
  },
};

const VISUAL_STATUS_ALIASES = {
  approved: 'completed',
  completed: 'completed',
  delivered: 'completed',
  success: 'completed',
  pending: 'processing',
  requested: 'processing',
  queued: 'processing',
  processing: 'processing',
  retry: 'processing',
  under_review: 'processing',
  canceled: 'incomplete',
  cancelled: 'incomplete',
  denied: 'incomplete',
  failed: 'incomplete',
  refunded: 'incomplete',
  rejected: 'incomplete',
  // DLQ kill-switch status — rendered as its own distinct variant
  manual_review: 'manual_review',
};

// ─── Provider Code → Display Label ───────────────────────────────────────────

/**
 * Maps the EXACT provider slugs stored in the DB to bilingual display labels.
 * Keys must match order.providerCode verbatim (lowercase, with dashes preserved).
 * Add a new entry here whenever a new provider is configured in the backend.
 */
export const PROVIDER_DISPLAY_NAMES = {
  'alkasr-vip':   { ar: 'الكاسر VIP',   en: 'Alkasr VIP' },
  'royal-crown':  { ar: 'رويال كراون', en: 'Royal Crown' },
  'torosfon':  { ar:'توروس فون', en: 'Torosfon' },
};

/**
 * Returns a human-readable provider label from a raw providerCode slug.
 * Does a direct (lower-cased) lookup against the known slugs map.
 * Falls back gracefully to title-casing the raw slug for unknown providers.
 *
 * @param {string} providerCode - exact slug from order.providerCode (e.g. 'alkasr-vip')
 * @param {'ar'|'en'} language
 */
export const getProviderDisplayName = (providerCode, language = 'ar') => {
  const key = toLower(providerCode);
  const entry = PROVIDER_DISPLAY_NAMES[key];
  if (entry) return language === 'ar' ? entry.ar : entry.en;
  // Fallback: capitalize each dash-separated segment (e.g. 'new-api' → 'New Api')
  return key.split('-').map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1)).join(' ') || providerCode;
};

// NOTE: provider filter options are built dynamically from fetched orders in AdminOrders.jsx
// to ensure only providers with actual orders are shown. No static list needed here.


const MANUAL_STATUS_META = {
  pending: {
    labelAr: 'بانتظار المراجعة',
    labelEn: 'Pending review',
    descriptionAr: 'الطلب بانتظار المراجعة قبل التنفيذ.',
    descriptionEn: 'The order is waiting for review before execution.',
  },
  processing: {
    labelAr: 'قيد التنفيذ',
    labelEn: 'In progress',
    descriptionAr: 'تم بدء تنفيذ الطلب وجارٍ متابعته.',
    descriptionEn: 'The order is being processed and tracked.',
  },
  completed: {
    labelAr: 'مكتمل',
    labelEn: 'Completed',
    descriptionAr: 'تم تنفيذ الطلب بنجاح وإغلاقه.',
    descriptionEn: 'The order was fulfilled successfully and closed.',
  },
  rejected: {
    labelAr: 'مرفوض',
    labelEn: 'Rejected',
    descriptionAr: 'تم رفض الطلب أو تعذر تنفيذه.',
    descriptionEn: 'The order was rejected or could not be fulfilled.',
  },
};

const EXCLUDED_DYNAMIC_FIELDS = new Set([
  'externalproductid',
  'orderreference',
  'qty',
  'quantity',
  'service',
]);

const DYNAMIC_FIELD_LABELS = {
  playerid: { ar: 'معرف المستخدم', en: 'User ID' },
  uid: { ar: 'UID', en: 'UID' },
  userid: { ar: 'معرف المستخدم', en: 'User ID' },
  username: { ar: 'اسم المستخدم', en: 'Username' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  phone: { ar: 'رقم الهاتف', en: 'Phone Number' },
  server: { ar: 'السيرفر', en: 'Server' },
  zone: { ar: 'المنطقة', en: 'Zone' },
};

const PRIMARY_IDENTIFIER_KEYS = new Set([
  'playerid',
  'uid',
  'userid',
  'username',
  'email',
  'phone',
]);

const PRIMARY_IDENTIFIER_LABELS = new Set([
  'id',
  'uid',
  'userid',
  'useridentifier',
  'playerid',
  'accountid',
  'gameid',
  'loginid',
  'معرفالمستخدم',
  'ايديمستخدم',
  'ايديالمستخدم',
  'ايديحساب',
  'معرفالحساب',
  'معرفاللاعب',
  'ايدياللاعب',
]);

const ORDER_DISPLAY_MAXIMUM_FRACTION_DIGITS = 12;

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toLower = (value) => String(value || '')
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .trim()
  .toLowerCase();
const toDisplayString = (value) => String(value || '').trim();
const normalizeDynamicFieldKey = (value) => toLower(value).replace(/[\s_-]+/g, '');
const normalizeDynamicFieldValue = (value) => toDisplayString(value).toLowerCase();

const isPrimaryIdentifierField = (field = {}) => {
  const normalizedKey = normalizeDynamicFieldKey(field?.key || '');
  const normalizedLabel = normalizeDynamicFieldKey(field?.label || '');

  if (PRIMARY_IDENTIFIER_KEYS.has(normalizedKey) || PRIMARY_IDENTIFIER_LABELS.has(normalizedLabel)) {
    return true;
  }

  if (normalizedLabel === 'id') {
    return true;
  }

  const hasIdToken = normalizedLabel.includes('id') || normalizedLabel.includes('uid');
  const hasUserToken = ['user', 'player', 'account', 'game', 'مستخدم', 'اللاعب', 'حساب']
    .some((token) => normalizedLabel.includes(token));

  return hasIdToken && hasUserToken;
};

const resolveDynamicFieldLabel = (key, language = 'ar', explicitLabel = '') => {
  const normalizedKey = normalizeDynamicFieldKey(key);
  const alias = DYNAMIC_FIELD_LABELS[normalizedKey];
  if (alias) {
    return language === 'ar' ? alias.ar : alias.en;
  }

  const cleanedLabel = toDisplayString(explicitLabel);
  return cleanedLabel || humanizeOrderToken(key);
};

export const humanizeOrderToken = (value) => String(value || '')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getDateFilterThreshold = (dateFilter) => {
  const now = new Date();

  if (dateFilter === 'today') {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  if (dateFilter === '7d') {
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - 7);
    return threshold;
  }

  if (dateFilter === '30d') {
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - 30);
    return threshold;
  }

  return null;
};

export const createOrderStatusOptions = (language = 'ar') => ([
  { value: 'all', label: language === 'ar' ? 'كل الحالات' : 'All statuses' },
  { value: 'completed', label: language === 'ar' ? 'مكتمل' : 'Completed' },
  { value: 'incomplete', label: language === 'ar' ? 'غير مكتمل' : 'Incomplete' },
  { value: 'processing', label: language === 'ar' ? 'قيد التنفيذ' : 'In progress' },
]);

export const createOrderTypeOptions = (language = 'ar') => ([
  { value: 'all', label: language === 'ar' ? 'كل الأنواع' : 'All types' },
  { value: 'auto', label: language === 'ar' ? 'أوتوماتيكي' : 'Automatic' },
  { value: 'manual', label: language === 'ar' ? 'يدوي' : 'Manual' },
]);

export const createOrderDateOptions = (language = 'ar') => ([
  { value: 'today', label: language === 'ar' ? 'اليوم' : 'Today' },
  { value: '7d', label: language === 'ar' ? 'آخر 7 أيام' : 'Last 7 days' },
  { value: '30d', label: language === 'ar' ? 'آخر 30 يوم' : 'Last 30 days' },
  { value: 'all', label: language === 'ar' ? 'الكل' : 'All time' },
  { value: 'custom', label: language === 'ar' ? 'من تاريخ إلى تاريخ' : 'Custom range' },
]);

export const createOrderSortOptions = (language = 'ar') => ([
  { value: 'newest', label: language === 'ar' ? 'الأحدث أولاً' : 'Newest first' },
  { value: 'oldest', label: language === 'ar' ? 'الأقدم أولاً' : 'Oldest first' },
]);

export const normalizeManualOrderStatus = (status) => {
  const normalized = toLower(status);

  if (['completed', 'approved', 'delivered', 'success'].includes(normalized)) {
    return 'completed';
  }

  if (['failed', 'rejected', 'denied', 'refunded', 'cancelled', 'canceled', 'incomplete'].includes(normalized)) {
    return 'rejected';
  }

  if (['processing', 'retry'].includes(normalized)) {
    return 'processing';
  }

  return 'pending';
};

export const createManualOrderStatusOptions = (language = 'ar') => (
  Object.entries(MANUAL_STATUS_META).map(([value, meta]) => ({
    value,
    label: language === 'ar' ? meta.labelAr : meta.labelEn,
    description: language === 'ar' ? meta.descriptionAr : meta.descriptionEn,
  }))
);

export const getManualOrderStatusLabel = (status, language = 'ar') => {
  const normalized = normalizeManualOrderStatus(status);
  const meta = MANUAL_STATUS_META[normalized] || MANUAL_STATUS_META.pending;
  return language === 'ar' ? meta.labelAr : meta.labelEn;
};

export const getVisualOrderStatus = (status) => {
  const normalized = toLower(status);
  return VISUAL_STATUS_ALIASES[normalized] || 'processing';
};

export const getOrderStatusMeta = (status, language = 'ar') => {
  const key = getVisualOrderStatus(status);
  const meta = ORDER_STATUS_META[key] || ORDER_STATUS_META.processing;

  return {
    key,
    variant: meta.variant,
    label: language === 'ar' ? meta.labelAr : meta.labelEn,
    dotClassName: meta.dotClassName,
  };
};

export const getOrderType = (order = {}) => {
  const mode = toLower(order?.fulfillmentMode || order?.executionType);

  if (mode === 'auto' || mode === 'automatic') {
    return 'auto';
  }

  if (mode === 'manual') {
    return 'manual';
  }

  return order?.supplierId ? 'auto' : 'manual';
};

export const getOrderTypeMeta = (order, language = 'ar') => {
  const key = getOrderType(order);
  const meta = ORDER_TYPE_META[key] || ORDER_TYPE_META.manual;

  return {
    key,
    variant: meta.variant,
    label: language === 'ar' ? meta.labelAr : meta.labelEn,
  };
};

const getOrderAmountRawValue = (order = {}) => (
  order?.financialSnapshot?.finalAmountAtExecution
  ?? order?.financialSnapshot?.pricingSnapshot?.finalPrice
  ?? order?.financialSnapshot?.convertedAmountAtExecution
  ?? order?.totalAmount
  ?? order?.priceCoins
);

export const getOrderAmountValue = (order = {}) => {
  const snapshotAmount = getOrderAmountRawValue(order);
  const directAmount = order?.totalAmount ?? order?.priceCoins;
  const unitBasedAmount = asNumber(order?.unitPrice || order?.unitPriceBase) * asNumber(order?.quantity || 1);
  return asNumber(snapshotAmount ?? directAmount ?? unitBasedAmount);
};

export const getOrderCurrencyCode = (order = {}) => resolveOrderExecutionCurrency(order, 'USD');

export const formatOrderMoney = (order, currencies = [], locale = 'ar-EG') => {
  const amount = getOrderAmountValue(order);
  const currencyCode = getOrderCurrencyCode(order);
  const displayFormatOptions = {
    maximumFractionDigits: ORDER_DISPLAY_MAXIMUM_FRACTION_DIGITS,
  };

  try {
    return formatCurrencyAmount(amount, currencyCode, currencies, locale, displayFormatOptions);
  } catch (_error) {
    return `${formatNumber(amount, locale, getMoneyFormatOptions(amount, displayFormatOptions))} ${currencyCode}`;
  }
};

export const formatOrderDateTime = (value, locale = 'ar-EG') => formatDateTime(value, locale, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const resolveSiteOrderNumber = (order = {}) => toDisplayString(
  order?.siteOrderNumber
    || order?.internalOrderNumber
    || order?.orderNumber
    || order?.id
);

export const resolveSupplierOrderNumber = (order = {}) => toDisplayString(
  order?.supplierOrderNumber
    || order?.externalOrderId
    || order?.providerOrderId
    || order?.supplierResponseSnapshot?.data?.orderId
    || order?.supplierResponseSnapshot?.orderId
);

const getOrderFieldValueEntries = (order = {}) => {
  const valueSources = [
    order?.customerInput?.values,
    order?.orderFieldsValues,
    order?.orderFields,
    order?.supplierRequestSnapshot,
  ];

  const valuesByKey = new Map();

  const hasMatchingPrimaryIdentifierValue = (normalizedKey, value) => {
    if (!PRIMARY_IDENTIFIER_KEYS.has(normalizedKey) && !PRIMARY_IDENTIFIER_LABELS.has(normalizedKey)) {
      return false;
    }

    const normalizedValue = normalizeDynamicFieldValue(value);
    if (!normalizedValue) return false;

    return Array.from(valuesByKey.entries()).some(([existingKey, existingEntry]) => (
      (PRIMARY_IDENTIFIER_KEYS.has(existingKey) || PRIMARY_IDENTIFIER_LABELS.has(existingKey))
      && normalizeDynamicFieldValue(existingEntry?.value) === normalizedValue
    ));
  };

  valueSources.forEach((source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return;

    Object.entries(source).forEach(([key, value]) => {
      const normalizedKey = normalizeDynamicFieldKey(key);
      if (
        !normalizedKey
        || EXCLUDED_DYNAMIC_FIELDS.has(normalizedKey)
        || value === undefined
        || value === null
        || String(value).trim() === ''
      ) {
        return;
      }

      if (hasMatchingPrimaryIdentifierValue(normalizedKey, value)) {
        return;
      }

      valuesByKey.set(normalizedKey, {
        key,
        value: String(value),
      });
    });
  });

  const fallbackPlayerId = toDisplayString(order?.playerId);
  if (fallbackPlayerId && !valuesByKey.has('playerid')) {
    valuesByKey.set('playerid', {
      key: 'playerId',
      value: fallbackPlayerId,
    });
  }

  return valuesByKey;
};

const getOrderFieldDefinitions = (order = {}, { product = null, language = 'ar' } = {}) => {
  const fieldSnapshot = Array.isArray(order?.customerInput?.fieldsSnapshot) && order.customerInput.fieldsSnapshot.length > 0
    ? order.customerInput.fieldsSnapshot
    : (Array.isArray(order?.fieldsSnapshot) && order.fieldsSnapshot.length > 0 ? order.fieldsSnapshot : null);

  if (fieldSnapshot) {
    return fieldSnapshot.map((field, index) => {
      const key = String(field?.key || field?.name || field?.id || `field_${index}`);
      return {
        key,
        label: resolveDynamicFieldLabel(
          key,
          language,
          language === 'ar'
            ? field?.labelAr || field?.placeholderAr || field?.label || field?.placeholder
            : field?.label || field?.placeholder || field?.labelAr || field?.placeholderAr
        ),
        placeholder: toDisplayString(
          language === 'ar'
            ? field?.placeholderAr || field?.placeholder
            : field?.placeholder || field?.placeholderAr
        ),
        type: String(field?.type || '').trim().toLowerCase(),
      };
    });
  }

  const hasExplicitProductFields = Array.isArray(product?.orderFields) && product.orderFields.length > 0;
  const hasSupplierMappedFields = Array.isArray(product?.supplierFieldMappings)
    && product.supplierFieldMappings.some((mapping) => {
      const internalField = String(mapping?.internalField || '').trim();
      return internalField && internalField !== 'quantity' && internalField !== 'externalProductId';
    });

  if (!hasExplicitProductFields && !hasSupplierMappedFields) {
    return [];
  }

  return resolveProductOrderFields(product, language).map((field, index) => ({
    key: String(field?.key || `field_${index}`),
    label: resolveDynamicFieldLabel(field?.key || `field_${index}`, language, field?.label),
    placeholder: toDisplayString(field?.placeholder),
    type: String(field?.type || '').trim().toLowerCase(),
  }));
};

export const getOrderDynamicFields = (order = {}, { product = null, language = 'ar' } = {}) => {
  const valuesByKey = getOrderFieldValueEntries(order);
  const fieldDefinitions = getOrderFieldDefinitions(order, { product, language });

  const orderedFields = [];
  const seenKeys = new Set();

  fieldDefinitions.forEach((field) => {
    const normalizedKey = normalizeDynamicFieldKey(field?.key || '');
    const valueEntry = valuesByKey.get(normalizedKey);

    if (!normalizedKey || !valueEntry || seenKeys.has(normalizedKey)) return;

    orderedFields.push({
      key: valueEntry.key,
      label: field.label,
      value: valueEntry.value,
      type: field.type,
    });
    seenKeys.add(normalizedKey);
  });

  valuesByKey.forEach((entry, normalizedKey) => {
    if (seenKeys.has(normalizedKey)) return;

    orderedFields.push({
      key: entry.key,
      label: resolveDynamicFieldLabel(entry.key, language),
      value: entry.value,
      type: '',
    });
  });

  return orderedFields;
};

export const getOrderRequestDetails = (order = {}, { product = null, language = 'ar' } = {}) => {
  const valuesByKey = getOrderFieldValueEntries(order);
  const fieldDefinitions = getOrderFieldDefinitions(order, { product, language });
  const fields = [];
  const seenKeys = new Set();

  fieldDefinitions.forEach((field) => {
    const normalizedKey = normalizeDynamicFieldKey(field?.key || '');
    const valueEntry = valuesByKey.get(normalizedKey);

    if (!normalizedKey || seenKeys.has(normalizedKey)) return;

    fields.push({
      key: field.key,
      label: field.label,
      placeholder: field.placeholder,
      value: valueEntry?.value || '',
      type: field.type,
    });
    seenKeys.add(normalizedKey);
  });

  valuesByKey.forEach((entry, normalizedKey) => {
    if (seenKeys.has(normalizedKey)) return;

    fields.push({
      key: entry.key,
      label: resolveDynamicFieldLabel(entry.key, language),
      placeholder: '',
      value: entry.value,
      type: '',
    });
  });

  const quantitySnapshot = order?.customerInput?.quantitySnapshot || order?.quantitySnapshot || {};
  const quantityMeta = getProductQuantityMeta({
    minimumOrderQty: quantitySnapshot?.minQty ?? quantitySnapshot?.minimumOrderQty ?? product?.minimumOrderQty ?? product?.minQty ?? order?.quantity ?? 1,
    maximumOrderQty: quantitySnapshot?.maxQty ?? quantitySnapshot?.maximumOrderQty ?? product?.maximumOrderQty ?? product?.maxQty ?? order?.quantity ?? 1,
    stepQty: quantitySnapshot?.stepQty ?? product?.stepQty ?? 1,
  });

  return {
    fields,
    quantity: {
      label: language === 'ar' ? 'إضافة' : 'Add',
      value: String(order?.quantity || 1),
      minQty: quantityMeta.minQty,
      maxQty: quantityMeta.maxQty,
      stepQty: quantityMeta.stepQty,
    },
  };
};

export const getPrimaryOrderIdentifierField = (fields = []) => (
  (Array.isArray(fields) ? fields : []).find((field) => isPrimaryIdentifierField(field)) || null
);

export const canSyncSupplierOrder = (order = {}) => Boolean(order?.supplierId && order?.externalOrderId);

export const isManualActionableOrder = (order = {}) => {
  const statusKey = getVisualOrderStatus(order?.status);
  return isManualStatusEditableOrder(order) && !['completed', 'incomplete'].includes(statusKey);
};

export const isManualStatusEditableOrder = (order = {}) => {
  // Allow admin to manually override status of ANY order type,
  // including automatic/provider-linked orders (e.g. stuck PENDING).
  return true;
};

export const getManualOrderPrimaryAction = (order, language = 'ar') => {
  const statusKey = getVisualOrderStatus(order?.status);

  if (statusKey === 'processing') {
    return {
      label: language === 'ar' ? 'تأكيد الإكمال' : 'Mark completed',
      nextStatus: 'completed',
    };
  }

  return {
    label: language === 'ar' ? 'قبول الطلب' : 'Accept order',
    nextStatus: 'processing',
  };
};

export const getCustomerOrderFeedback = (order = {}, language = 'ar') => {
  const isArabic = language === 'ar';
  const statusKey = getVisualOrderStatus(order?.status);
  const typeKey = getOrderType(order);

  if (statusKey === 'completed') {
    return {
      tone: 'success',
      title: isArabic ? 'تم تنفيذ الطلب بنجاح' : 'Your order was completed successfully',
      description: isArabic
        ? 'يمكنك مراجعة كل التفاصيل النهائية للطلب من زر التفاصيل.'
        : 'You can open the details button to review the final order information.',
      actionLabel: isArabic ? 'التفاصيل' : 'View details',
    };
  }

  if (statusKey === 'incomplete') {
    const reason = String(order?.rejectionReason || '').trim();
    return {
      tone: 'danger',
      title: isArabic ? 'تم رفض الطلب' : 'Your order was rejected',
      description: reason
        ? (isArabic ? `سبب الرفض: ${reason}` : `Rejection reason: ${reason}`)
        : (isArabic
          ? 'تم رفض هذا الطلب أو تعذر تنفيذه. يرجى التواصل مع الإدارة للمزيد من التفاصيل.'
          : 'This order was rejected or could not be fulfilled. Please contact support for more details.'),
      actionLabel: isArabic ? 'التفاصيل' : 'View details',
    };
  }

  if (typeKey === 'manual') {
    return {
      tone: 'warning',
      title: isArabic ? 'طلبك قيد المراجعة' : 'Your order is under review',
      description: isArabic
        ? 'هذا الطلب يُنفذ يدويًا من الإدارة، وسيتم تحديث حالته فور الانتهاء من مراجعته.'
        : 'This order is handled manually by the admin team and its status will update once the review is finished.',
      actionLabel: isArabic ? 'التفاصيل' : 'View details',
    };
  }

  return null;
};

export const enrichOrders = (orders, { users = [], products = [], language = 'ar' } = {}) => {
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const userMap = new Map((Array.isArray(users) ? users : []).map((user) => [String(user?.id || ''), user]));
  const productMap = new Map((Array.isArray(products) ? products : []).map((product) => [String(product?.id || ''), product]));

  return (Array.isArray(orders) ? orders : []).map((order) => {
    const linkedUser = userMap.get(String(order?.userId || '')) || null;
    const linkedProduct = productMap.get(String(order?.productId || '')) || null;
    const hydratedOrder = {
      ...order,
      supplierId: order?.supplierId || linkedProduct?.supplierId || '',
      fulfillmentMode: order?.fulfillmentMode
        || (linkedProduct?.autoFulfillmentEnabled === false ? 'manual' : order?.fulfillmentMode)
        || '',
    };
    const statusMeta = getOrderStatusMeta(hydratedOrder?.status, language);
    const typeMeta = getOrderTypeMeta(hydratedOrder, language);
    const siteOrderNumber = resolveSiteOrderNumber(hydratedOrder);
    const supplierOrderNumber = resolveSupplierOrderNumber(hydratedOrder);
    const customerName = order?.userName
      || linkedUser?.name
      || (language === 'ar' ? 'عميل غير معروف' : 'Unknown customer');
    const customerEmail = order?.userEmail || linkedUser?.email || '';
    const productName = (
      language === 'ar'
        ? order?.productNameAr || linkedProduct?.nameAr || order?.productName || linkedProduct?.name
        : order?.productName || linkedProduct?.name || order?.productNameAr || linkedProduct?.nameAr
    ) || (language === 'ar' ? 'منتج غير معروف' : 'Unknown product');
    const createdAt = order?.createdAt || order?.date || order?.updatedAt || '';
    const amountValue = getOrderAmountValue(order);
    const currencyCode = getOrderCurrencyCode(order);
    const dynamicFields = getOrderDynamicFields(order, {
      product: linkedProduct,
      language,
    });
    const requestDetails = getOrderRequestDetails(order, {
      product: linkedProduct,
      language,
    });
    const primaryIdentifierField = getPrimaryOrderIdentifierField(dynamicFields);
    const notes = String(order?.notes || order?.adminNote || order?.providerReferenceMessage || '').trim();
    const supplierName = order?.supplierName || '';

    return {
      ...hydratedOrder,
      orderNumber: siteOrderNumber,
      siteOrderNumber,
      internalOrderNumber: siteOrderNumber,
      supplierOrderNumber,
      customerName,
      customerEmail,
      customerAvatar: resolveUserAvatar(order?.customerAvatar || linkedUser?.avatar, customerName || customerEmail || 'N&A HUB User'),
      productName,
      productImage: order?.productImage || linkedProduct?.image || '',
      productRecord: linkedProduct,
      userRecord: linkedUser,
      statusKey: statusMeta.key,
      statusLabel: statusMeta.label,
      statusVariant: statusMeta.variant,
      typeKey: typeMeta.key,
      typeLabel: typeMeta.label,
      typeVariant: typeMeta.variant,
      createdAt,
      amountValue,
      amountLabel: formatOrderMoney(order, [], locale),
      currencyCode,
      notes,
      supplierName,
      dynamicFields,
      requestDetails,
      primaryIdentifierField,
      canSync: canSyncSupplierOrder(hydratedOrder),
      manualActionable: isManualActionableOrder(hydratedOrder),
      manualStatusEditable: isManualStatusEditableOrder(hydratedOrder),
      rawStatusLabel: humanizeOrderToken(order?.status || ''),
      searchIndex: toLower([
        hydratedOrder?.id,
        hydratedOrder?._id,
        hydratedOrder?.orderNumber,
        hydratedOrder?.internalOrderNumber,
        hydratedOrder?.siteOrderNumber,
        hydratedOrder?.displayOrderId,
        hydratedOrder?.externalOrderId,
        hydratedOrder?.providerOrderId,
        hydratedOrder?.supplierOrderNumber,
        hydratedOrder?.supplierRequestSnapshot?.orderId,
        hydratedOrder?.supplierResponseSnapshot?.orderId,
        hydratedOrder?.supplierResponseSnapshot?.data?.orderId,
        hydratedOrder?.userId,
        hydratedOrder?.customerId,
        hydratedOrder?.user?._id,
        hydratedOrder?.user?.id,
        hydratedOrder?.customer?._id,
        hydratedOrder?.customer?.id,
        hydratedOrder?.playerId,
        hydratedOrder?.uid,
        hydratedOrder?.username,
        hydratedOrder?.customerInput,
        siteOrderNumber,
        supplierOrderNumber,
        productName,
        order?.productName,
        order?.productNameAr,
        customerName,
        customerEmail,
        supplierName,
        notes,
        order?.providerCode,
        ...dynamicFields.flatMap((field) => [field.label, field.value]),
      ].join(' ')),
    };
  });
};

export const filterOrders = (orders, {
  searchTerm = '',
  statusFilter = 'all',
  typeFilter = 'all',
  dateFilter = 'all',
  sortOrder = 'newest',
  providerFilter = 'all',
} = {}) => {
  const normalizedSearchTerm = toLower(searchTerm);
  const threshold = getDateFilterThreshold(dateFilter);

  return [...(Array.isArray(orders) ? orders : [])]
    .filter((order) => {
      if (normalizedSearchTerm && !String(order?.searchIndex || '').includes(normalizedSearchTerm)) {
        return false;
      }

      if (statusFilter !== 'all') {
        // Special handling: 'manual_review' maps directly to the raw status,
        // bypassing the visual alias system so the tab is exclusive.
        if (statusFilter === 'manual_review') {
          if (toLower(order?.status) !== 'manual_review') return false;
        } else if (order?.statusKey !== statusFilter) {
          return false;
        }
      }

      if (typeFilter !== 'all' && order?.typeKey !== typeFilter) {
        return false;
      }

      if (providerFilter !== 'all') {
        // Compare raw slugs directly — no dash/underscore stripping.
        // The <select> option value is the exact order.providerCode string.
        if (toLower(order?.providerCode) !== providerFilter) return false;
      }

      if (threshold) {
        const orderDate = new Date(order?.createdAt || 0);
        if (Number.isNaN(orderDate.getTime()) || orderDate < threshold) {
          return false;
        }
      }

      return true;
    })
    .sort((left, right) => {
      const leftDate = new Date(left?.createdAt || 0).getTime();
      const rightDate = new Date(right?.createdAt || 0).getTime();

      if (sortOrder === 'oldest') {
        return leftDate - rightDate;
      }

      return rightDate - leftDate;
    });
};

export const summarizeOrders = (orders = []) => ({
  total: orders.length,
  completed: orders.filter((order) => order?.statusKey === 'completed').length,
  processing: orders.filter((order) => order?.statusKey === 'processing').length,
  incomplete: orders.filter((order) => order?.statusKey === 'incomplete').length,
  manualPending: orders.filter((order) => order?.manualActionable).length,
  manualReview: orders.filter((order) => toLower(order?.status) === 'manual_review').length,
});
