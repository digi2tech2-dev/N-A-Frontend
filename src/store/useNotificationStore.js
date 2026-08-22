import { create } from 'zustand';
import apiClient from '../services/client';

const AUTH_STORAGE_KEY = 'auth-storage';

const hasArabicText = (value) => /[\u0600-\u06FF]/.test(String(value || ''));

const readStoredRole = () => {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return String(parsed?.state?.user?.role || '').trim().toLowerCase();
  } catch {
    return '';
  }
};

const shouldForceArabicForBackoffice = () => {
  const role = readStoredRole();
  return ['admin', 'supervisor', 'manager', 'moderator', 'super_admin'].includes(role);
};

const normalizeEnglishNotificationText = (value, options = {}) => {
  const { isTitle = false, forceArabic = false } = options;
  const text = String(value || '').trim();
  if (!text || hasArabicText(text)) return text;

  const manualOrderPlacedMatch = text.match(/^a\s+customer\s+placed\s+manual\s+order\s*#?([a-z0-9_-]+)\s+for\s+(.+)\.?$/i);
  if (manualOrderPlacedMatch) {
    const orderNumber = String(manualOrderPlacedMatch[1] || '').trim();
    const productName = String(manualOrderPlacedMatch[2] || '').replace(/\.$/, '').trim();
    return isTitle
      ? 'طلب يدوي جديد'
      : `تم إنشاء طلب يدوي رقم ${orderNumber}${productName ? ` للمنتج: ${productName}` : ''}. راجعه من صفحة الطلبات.`;
  }

  const customerOrderPlacedMatch = text.match(/^a\s+customer\s+placed\s+(?:an?\s+)?order\s*#?([a-z0-9_-]+)?(?:\s+for\s+(.+))?\.?$/i);
  if (customerOrderPlacedMatch) {
    const orderNumber = String(customerOrderPlacedMatch[1] || '').trim();
    const productName = String(customerOrderPlacedMatch[2] || '').replace(/\.$/, '').trim();
    return isTitle
      ? 'طلب جديد'
      : `تم إنشاء طلب${orderNumber ? ` رقم ${orderNumber}` : ''}${productName ? ` للمنتج: ${productName}` : ''}.`;
  }

  const orderApprovedMatch = text.match(/order\s*#?\s*([a-z0-9_-]{3,})?.*\b(approved|accepted|completed)\b/i);
  if (orderApprovedMatch) {
    const orderId = String(orderApprovedMatch?.[1] || '').trim();
    return orderId ? `تم قبول الطلب ${orderId}` : 'تم قبول الطلب';
  }

  const orderRejectedMatch = text.match(/order\s*#?\s*([a-z0-9_-]{3,})?.*\b(rejected|denied|failed)\b/i);
  if (orderRejectedMatch) {
    const orderId = String(orderRejectedMatch?.[1] || '').trim();
    return orderId ? `تم رفض الطلب ${orderId}` : 'تم رفض الطلب';
  }

  const newOrderMatch = text.match(/^new\s+order(?:\s+request)?(?:\s+(?:from|by))?\s*(.*)$/i);
  if (newOrderMatch) {
    const actor = String(newOrderMatch?.[1] || '').trim();
    return actor ? `طلب جديد من ${actor}` : 'طلب جديد';
  }

  const topupRequestMatch = text.match(/^new\s+top[-\s]?up\s+request(?:\s+(?:from|by))?\s*(.*)$/i);
  if (topupRequestMatch) {
    const actor = String(topupRequestMatch?.[1] || '').trim();
    return actor ? `طلب شحن جديد من ${actor}` : 'طلب شحن جديد';
  }

  const exactTranslations = {
    notification: 'إشعار',
    'admin notification': 'إشعار إداري',
    'supervisor notification': 'إشعار المشرف',
    notifications: 'الإشعارات',
    'new order': 'طلب جديد',
    'order accepted': 'تم قبول الطلب',
    'order rejected': 'تم رفض الطلب',
    'order status updated': 'تم تحديث حالة الطلب',
    'order completed': 'تم تنفيذ الطلب',
    'your order was completed successfully': 'تم تنفيذ طلبك بنجاح',
    'your order was rejected': 'تم رفض طلبك',
    'your order is under review': 'طلبك قيد المراجعة',
    'new topup request': 'طلب شحن جديد',
    'new top-up request': 'طلب شحن جديد',
    'manual topup waiting for review': 'طلب شحن يدوي بانتظار المراجعة',
    'balance topup': 'شحن رصيد',
    'wallet topup': 'شحن المحفظة',
    'payment approved': 'تم قبول الدفع',
    'payment rejected': 'تم رفض الدفع',
    'account approved': 'تمت الموافقة على الحساب',
    'account rejected': 'تم رفض الحساب',
    'account pending': 'الحساب قيد المراجعة',
    'price updated': 'تم تحديث السعر',
    'insufficient balance': 'الرصيد غير كاف',
    'target request': 'طلب تارجت',
    'new target request': 'طلب تارجت جديد',
  };

  const exact = exactTranslations[text.toLowerCase()];
  if (exact) return exact;

  const normalized = text
    .replace(/\bNew order\b/gi, 'طلب جديد')
    .replace(/\bRequest\b/gi, 'طلب')
    .replace(/\bhas been\b/gi, '')
    .replace(/\bis now\b/gi, 'أصبح')
    .replace(/\bunder review\b/gi, 'قيد المراجعة')
    .replace(/\bsuccessfully\b/gi, 'بنجاح')
    .replace(/\bOrder\b/gi, 'طلب')
    .replace(/\border\b/gi, 'طلب')
    .replace(/\bTop[-\s]?up\b/gi, 'شحن')
    .replace(/\bManual topup\b/gi, 'شحن يدوي')
    .replace(/\bWallet\b/gi, 'المحفظة')
    .replace(/\bBalance\b/gi, 'الرصيد')
    .replace(/\bPayment\b/gi, 'الدفع')
    .replace(/\bAccepted\b/gi, 'تم القبول')
    .replace(/\bRejected\b/gi, 'تم الرفض')
    .replace(/\bCompleted\b/gi, 'تم التنفيذ')
    .replace(/\bPending\b/gi, 'قيد المراجعة')
    .replace(/\bApproved\b/gi, 'تمت الموافقة')
    .replace(/\bFailed\b/gi, 'فشل')
    .replace(/\bUpdated\b/gi, 'تم التحديث')
    .replace(/\bcreated\b/gi, 'تم الإنشاء')
    .replace(/\bby\b/gi, 'بواسطة')
    .replace(/\bfrom\b/gi, 'من')
    .replace(/\buser\b/gi, 'مستخدم')
    .replace(/\bcustomer\b/gi, 'عميل')
    .replace(/\badmin\b/gi, 'الأدمن')
    .replace(/\bsupervisor\b/gi, 'المشرف')
    .replace(/\bmanager\b/gi, 'المدير')
    .replace(/\bmoderator\b/gi, 'المشرف')
    .replace(/\baccount\b/gi, 'الحساب')
    .replace(/\btarget\b/gi, 'تارجت');

  const stillEnglish = /[a-z]/i.test(normalized);
  if (forceArabic && stillEnglish) {
    const lowered = text.toLowerCase();
    if (lowered.includes('order')) {
      if (/(approved|accepted|completed)/.test(lowered)) return 'تم قبول الطلب';
      if (/(rejected|denied|failed)/.test(lowered)) return 'تم رفض الطلب';
      if (/(pending|review)/.test(lowered)) return 'الطلب قيد المراجعة';
      return isTitle ? 'تحديث طلب' : 'يوجد تحديث جديد على أحد الطلبات. افتح الإشعار لمعرفة التفاصيل.';
    }

    if (/(topup|top-up|wallet|payment|deposit|balance)/.test(lowered)) {
      if (/(approved|accepted|completed)/.test(lowered)) return 'تم قبول طلب الشحن';
      if (/(rejected|denied|failed)/.test(lowered)) return 'تم رفض طلب الشحن';
      if (/(pending|review)/.test(lowered)) return 'طلب الشحن قيد المراجعة';
      return isTitle ? 'تحديث شحن الرصيد' : 'يوجد تحديث جديد على طلب شحن الرصيد. افتح الإشعار لمعرفة التفاصيل.';
    }

    if (/(account|user)/.test(lowered)) {
      if (/(approved|accepted|verified)/.test(lowered)) return 'تمت الموافقة على الحساب';
      if (/(rejected|denied|blocked)/.test(lowered)) return 'تم رفض الحساب';
      if (/(pending|review)/.test(lowered)) return 'الحساب قيد المراجعة';
      return isTitle ? 'تحديث حساب' : 'يوجد تحديث جديد متعلق بالحساب.';
    }

    if (/target/.test(lowered)) {
      if (/(new|created)/.test(lowered)) return 'طلب تارجت جديد';
      return isTitle ? 'تحديث طلب تارجت' : 'يوجد تحديث جديد على طلب تارجت.';
    }

    return isTitle ? 'إشعار إداري' : 'يوجد إشعار إداري جديد يحتاج المتابعة.';
  }

  return normalized;
};

const normalizeNotification = (item = {}) => {
  const sectionName = String(item.sectionName || item.categoryName || item.categoryTitle || item.section || '').trim();
  const rawMessage = String(item.message || '').trim();
  const normalizedMessage = normalizeEnglishNotificationText(rawMessage, {
    isTitle: false,
    forceArabic: shouldForceArabicForBackoffice(),
  });
  let normalizedTitle = normalizeEnglishNotificationText(item.title || 'إشعار', {
    isTitle: true,
    forceArabic: shouldForceArabicForBackoffice(),
  }) || 'إشعار';

  const isManualOrderNotification = /manual\s+order/i.test(rawMessage)
    || /طلب\s+يدوي|طلب\s+#?\w+.*للمنتج|تابع\s+لقسم/.test(`${normalizedTitle} ${normalizedMessage}`);

  if (isManualOrderNotification) {
    normalizedTitle = sectionName
      ? `طلب يدوي جديد - قسم ${sectionName}`
      : 'طلب يدوي جديد';
  }

  return {
    id: item.id || item._id || `notif-${Date.now()}`,
    title: normalizedTitle,
    message: sectionName && isManualOrderNotification && !/تابع\s+لقسم/.test(normalizedMessage)
      ? `${normalizedMessage} تابع لقسم ${sectionName}.`
      : normalizedMessage,
    type: String(item.type || 'info').toLowerCase(),
    createdAt: item.createdAt || new Date().toISOString(),
    read: Boolean(item.read ?? item.isRead),
    targetUrl: item.targetUrl || item.url || item.link || '',
    targetType: item.targetType || item.entityType || item.resourceType || '',
    targetId: item.targetId || item.entityId || item.resourceId || item.orderId || item.topupId || item.userId || '',
    orderId: item.orderId || '',
    topupId: item.topupId || '',
    userId: item.userId || '',
    source: item.source || '',
    sectionName,
    categoryName: String(item.categoryName || sectionName || '').trim(),
  };
};

const toNotificationTime = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const sortNotificationsByNewest = (items = []) => (
  [...items].sort((left, right) => toNotificationTime(right?.createdAt) - toNotificationTime(left?.createdAt))
);

const useNotificationStore = create((set, get) => ({
  notifications: [],
  isLoading: false,
  unreadCount: 0,

  addNotification: (payload) => {
    const next = normalizeNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: payload?.title || 'إشعار',
      message: payload?.message || '',
      type: payload?.type || 'info',
      createdAt: new Date().toISOString(),
      read: false,
      targetUrl: payload?.targetUrl || payload?.url || payload?.link || '',
      targetType: payload?.targetType || payload?.entityType || '',
      targetId: payload?.targetId || payload?.entityId || payload?.orderId || payload?.topupId || payload?.userId || '',
      orderId: payload?.orderId || '',
      topupId: payload?.topupId || '',
      userId: payload?.userId || '',
      source: payload?.source || '',
      sectionName: payload?.sectionName || payload?.categoryName || payload?.section || '',
      categoryName: payload?.categoryName || payload?.sectionName || '',
    });

    set((state) => ({
      notifications: sortNotificationsByNewest([next, ...state.notifications]).slice(0, 30),
      unreadCount: Number(state.unreadCount || 0) + 1,
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, read: true })),
      unreadCount: 0,
    }));
    void apiClient.notifications?.markAllAsRead?.().catch(() => {});
  },

  loadUnreadCount: async () => {
    try {
      const count = await apiClient.notifications?.unreadCount?.();
      if (count === null || count === undefined) {
        return get().unreadCount;
      }
      const unreadCount = Number(count || 0);
      set({ unreadCount: Number.isFinite(unreadCount) ? unreadCount : 0 });
      return get().unreadCount;
    } catch {
      const fallbackCount = get().notifications.filter((item) => !item.read).length;
      set({ unreadCount: fallbackCount });
      return fallbackCount;
    }
  },

  loadNotifications: async () => {
    set({ isLoading: true });
    try {
      const items = await apiClient.notifications?.list?.();
      if (Array.isArray(items)) {
        const nextNotifications = sortNotificationsByNewest(items.map(normalizeNotification)).slice(0, 30);
        set({
          notifications: nextNotifications,
          unreadCount: nextNotifications.filter((item) => !item.read).length,
        });
      }
    } catch {
      return get().notifications;
    } finally {
      set({ isLoading: false });
    }
    return get().notifications;
  },

  markAsRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((item) => (
        String(item.id) === String(id) ? { ...item, read: true } : item
      )),
      unreadCount: Math.max(0, Number(state.unreadCount || 0) - (
        state.notifications.some((item) => String(item.id) === String(id) && !item.read) ? 1 : 0
      )),
    }));
    try {
      await apiClient.notifications?.markAsRead?.(id);
    } catch {
      // Keep optimistic local state.
    }
  },

  clearNotifications: () => set({ notifications: [] }),
}));

export default useNotificationStore;
