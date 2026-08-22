import { create } from 'zustand';
import apiClient from '../services/client';
import { normalizeTargetOrderStatus } from '../utils/targetOrders';

const normalizeApp = (app = {}) => {
  const allowedPaymentMethods = Array.isArray(app.allowedPaymentMethods)
    ? app.allowedPaymentMethods.map((item) => String(item || '').trim()).filter(Boolean)
    : Array.isArray(app.paymentMethodIds)
      ? app.paymentMethodIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [];

  return {
    ...app,
    id: app.id || app._id,
    name: app.name || '',
    targetAccountId: String(app.targetAccountId || app.receivingAccountId || app.receiverAccountId || app.recipientAccountId || app.targetRecipientId || app.receivingAccount || app.targetAccount || app.destinationAccountId || app.accountId || app.accountNumber || '').trim(),
    receivingAccountId: String(app.receivingAccountId || app.targetAccountId || app.receiverAccountId || app.recipientAccountId || app.targetRecipientId || app.receivingAccount || app.targetAccount || app.destinationAccountId || app.accountId || app.accountNumber || '').trim(),
    unitPrice: Number(app.unitPrice || 0),
    allowedPaymentMethods,
    paymentMethodIds: allowedPaymentMethods,
    isActive: app.isActive !== false,
  };
};

const normalizeOrder = (order = {}) => {
  const coinAmount = Number(order.coinAmount ?? order.quantity ?? order.coins ?? 0);
  const unitPrice = Number(order.unitPriceSnapshot ?? order.unitPrice ?? 0);
  const userRecord = (() => {
    if (order.user && typeof order.user === 'object') return order.user;
    if (order.userId && typeof order.userId === 'object') return order.userId;
    if (order.customer && typeof order.customer === 'object') return order.customer;
    if (order.customerId && typeof order.customerId === 'object') return order.customerId;
    return {};
  })();
  const userId = String(userRecord.id || userRecord._id || (typeof order.userId === 'string' ? order.userId : '') || '').trim();
  const userName = String(order.userName || order.customerName || userRecord.name || userRecord.fullName || userRecord.username || '').trim();
  const userEmail = String(order.userEmail || order.customerEmail || order.email || userRecord.email || '').trim();

  return {
    ...order,
    id: order.id || order._id,
    appNameSnapshot: order.appNameSnapshot || order.productName || '',
    productName: order.appNameSnapshot || order.productName || '',
    targetAccountIdSnapshot: order.targetAccountIdSnapshot || order.targetAccountId || order.receivingAccountId || order.recipientAccountId || order.targetRecipientId || order.receivingAccount || order.targetAccount || order.destinationAccountId || order.app?.targetAccountId || '',
    targetAccountId: order.targetAccountIdSnapshot || order.targetAccountId || order.receivingAccountId || order.recipientAccountId || order.targetRecipientId || order.receivingAccount || order.targetAccount || order.destinationAccountId || order.app?.targetAccountId || '',
    coinAmount,
    quantity: coinAmount,
    unitPriceSnapshot: unitPrice,
    unitPrice,
    totalPrice: Number(order.totalPrice ?? (coinAmount * unitPrice)),
    paymentMethod: order.paymentMethod || order.paymentMethodName || '',
    paymentMethodName: order.paymentMethod || order.paymentMethodName || '',
    transferNumber: order.transferNumber || order.paymentAccount || '',
    paymentAccount: order.transferNumber || order.paymentAccount || '',
    transactionNumber: order.transactionNumber || order.transactionId || order.paymentReference || '',
    transactionId: order.transactionNumber || order.transactionId || order.paymentReference || '',
    senderId: order.senderId || order.transferFromId || '',
    transferFromId: order.senderId || order.transferFromId || '',
    screenshotProof: order.screenshotProof || order.proofImage || '',
    proofImage: order.screenshotProof || order.proofImage || '',
    status: normalizeTargetOrderStatus(order.status),
    userId,
    userName,
    userEmail,
  };
};

const mergeTargetAppSnapshot = (base = {}, changes = {}, saved = {}) => {
  const requestedMethods = Array.isArray(changes.allowedPaymentMethods)
    ? changes.allowedPaymentMethods
    : Array.isArray(changes.paymentMethodIds)
      ? changes.paymentMethodIds
      : [];
  const savedMethods = Array.isArray(saved.allowedPaymentMethods)
    ? saved.allowedPaymentMethods
    : Array.isArray(saved.paymentMethodIds)
      ? saved.paymentMethodIds
      : null;
  const shouldKeepRequestedMethods = requestedMethods.length > 0 && (!savedMethods || savedMethods.length === 0);

  return {
    ...base,
    ...changes,
    ...saved,
    ...(shouldKeepRequestedMethods
      ? {
          allowedPaymentMethods: requestedMethods,
          paymentMethodIds: requestedMethods,
        }
      : {}),
  };
};

const toApiStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'done' || normalized === 'approved') return 'APPROVED';
  if (normalized === 'rejected') return 'REJECTED';
  return 'PENDING';
};

const useTargetStore = create((set, get) => ({
  apps: [],
  products: [],
  requests: [],
  myRequests: [],
  paymentMethods: [],
  isLoading: false,
  isSubmitting: false,

  loadApps: async ({ includeInactive = false } = {}) => {
    set({ isLoading: true });
    try {
      const apps = includeInactive
        ? await apiClient.targetApps?.list?.()
        : await apiClient.targetApps?.listActive?.();
      const normalizedApps = Array.isArray(apps) ? apps.map(normalizeApp) : [];
      set({ apps: normalizedApps, products: normalizedApps });
      return normalizedApps;
    } finally {
      set({ isLoading: false });
    }
  },

  loadRequests: async (params = {}) => {
    set({ isLoading: true });
    try {
      const requests = await apiClient.targetPurchases?.list?.(params);
      const normalizedRequests = Array.isArray(requests) ? requests.map(normalizeOrder) : [];
      set({ requests: normalizedRequests });
      return normalizedRequests;
    } finally {
      set({ isLoading: false });
    }
  },

  loadMyRequests: async (params = {}) => {
    set({ isLoading: true });
    try {
      const requests = await apiClient.targetPurchases?.listMine?.(params);
      const normalizedRequests = Array.isArray(requests) ? requests.map(normalizeOrder) : [];
      set({ myRequests: normalizedRequests });
      return normalizedRequests;
    } finally {
      set({ isLoading: false });
    }
  },

  addProduct: async (payload) => {
    const saved = await apiClient.targetApps.create(payload);
    const created = normalizeApp(mergeTargetAppSnapshot({}, payload, saved));
    set((state) => {
      const apps = [created, ...state.apps];
      return { apps, products: apps };
    });
    return created;
  },

  updateProduct: async (id, updates) => {
    const saved = await apiClient.targetApps.update(id, updates);
    set((state) => {
      const apps = state.apps.map((app) => {
        if (String(app.id) !== String(id)) return app;
        const updated = normalizeApp(mergeTargetAppSnapshot(app, updates, saved));
        return { ...app, ...updated };
      });
      return { apps, products: apps };
    });
    return normalizeApp(mergeTargetAppSnapshot({}, updates, saved));
  },

  deleteProduct: async (id) => {
    const updated = normalizeApp(await apiClient.targetApps.delete(id));
    set((state) => {
      const apps = state.apps.map((app) => (String(app.id) === String(id) ? { ...app, ...updated, isActive: false } : app));
      return { apps, products: apps };
    });
    return updated;
  },

  submitRequest: async (payload) => {
    set({ isSubmitting: true });
    try {
      const created = normalizeOrder(await apiClient.targetPurchases.create(payload));
      set((state) => ({
        requests: [created, ...state.requests],
        myRequests: [created, ...state.myRequests],
      }));
      return created;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateRequestStatus: async (id, status, payload = {}) => {
    const updated = normalizeOrder(await apiClient.targetPurchases.updateStatus(id, toApiStatus(status), payload));
    set((state) => ({
      requests: state.requests.map((item) => (String(item.id) === String(id) ? { ...item, ...updated } : item)),
      myRequests: state.myRequests.map((item) => (String(item.id) === String(id) ? { ...item, ...updated } : item)),
    }));
    return updated;
  },
}));

export default useTargetStore;
