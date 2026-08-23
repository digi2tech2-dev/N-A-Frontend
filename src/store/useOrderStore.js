import { create } from 'zustand';
import { mockOrders } from '../data/mockData';
import apiClient from '../services/client';
import useNotificationStore from './useNotificationStore';
import useAuthStore from './useAuthStore';
import useAdminStore from './useAdminStore';
import useMediaStore from './useMediaStore';
import { getManualOrderStatusLabel, isManualStatusEditableOrder, normalizeManualOrderStatus } from '../utils/orders';

const dataProvider = (import.meta.env.VITE_DATA_PROVIDER || 'mock').toLowerCase();
const isRealProvider = dataProvider === 'real';
const fetchedOrderScopesThisSession = new Set();

const ORDERS_CACHE_TTL = 15 * 1000; // short TTL to keep navigation smooth and reduce repeated fetches
let ordersRequest = null;
let ordersRequestScope = '';
let ordersRequestId = 0;
const ADMIN_ORDERS_DEFAULT_LIMIT = 100;

const CATEGORY_LABELS_AR = {
  games: 'الألعاب',
  apps: 'التطبيقات',
  cards: 'البطاقات الرقمية',
};

const pickText = (...values) => values
  .map((value) => String(value || '').trim())
  .find(Boolean) || '';

const resolveOrderSectionName = (order = {}, product = null) => {
  const mediaState = useMediaStore.getState?.() || {};
  const categories = Array.isArray(mediaState.categories) ? mediaState.categories : [];
  const rawCategory = product?.category || order?.category || order?.categoryId || '';
  const rawCategoryId = rawCategory && typeof rawCategory === 'object'
    ? pickText(rawCategory.id, rawCategory._id, rawCategory.nameAr, rawCategory.name)
    : String(rawCategory || '').trim();

  const directCategoryName = pickText(
    order?.categoryNameAr,
    order?.categoryTitleAr,
    order?.categoryLabelAr,
    product?.categoryNameAr,
    product?.categoryTitleAr,
    product?.categoryLabelAr,
    rawCategory?.nameAr,
    rawCategory?.titleAr,
    order?.categoryName,
    order?.categoryTitle,
    order?.categoryLabel,
    product?.categoryName,
    product?.categoryTitle,
    product?.categoryLabel,
    rawCategory?.name,
    rawCategory?.title
  );

  const matchedCategory = categories.find((category) => {
    const identifiers = [
      category?.id,
      category?._id,
      category?.name,
      category?.nameAr,
      category?.title,
      category?.titleAr,
    ].map((value) => String(value || '').trim()).filter(Boolean);
    return identifiers.includes(rawCategoryId) || identifiers.includes(directCategoryName);
  });

  const sectionName = pickText(
    matchedCategory?.nameAr,
    matchedCategory?.titleAr,
    matchedCategory?.name,
    matchedCategory?.title,
    directCategoryName,
    CATEGORY_LABELS_AR[rawCategoryId],
    rawCategoryId
  );

  return sectionName || 'غير محدد';
};

const useOrderStore = create((set, get) => ({
      // =====================================================================================
      // FINANCIAL SNAPSHOT SYSTEM - CRITICAL BUSINESS LOGIC
      // =====================================================================================
      // Each order gets a FINANCIAL SNAPSHOT at creation time that includes:
      // - originalCurrency: User's currency at order time
      // - originalAmount: Price in coins at order time
      // - exchangeRateAtExecution: Exchange rate at order creation
      // - pricingSnapshot: Complete pricing context (base price, discounts, etc.)
      //
      // This ensures orders maintain their prices even if product prices or
      // exchange rates change after order creation.
      // =====================================================================================
      orders: isRealProvider ? [] : mockOrders,
      ordersLastLoadedAt: 0,
      ordersLastLoadedScope: '',

      // ── Admin paginated orders (separate from customer orders) ────────
      adminOrders: [],
      adminPagination: { page: 1, limit: ADMIN_ORDERS_DEFAULT_LIMIT, total: 0, pages: 0 },
      adminOrdersLoading: false,

      /**
       * Fetch admin orders with server-side pagination.
       * Does NOT use the regular orders cache — admin has its own state slice.
       */
      loadAdminOrders: async ({ page = 1, limit = ADMIN_ORDERS_DEFAULT_LIMIT, status, search, userId, startDate, endDate } = {}) => {
        set({ adminOrdersLoading: true });
        try {
          const result = await apiClient.orders.listPaginated({ page, limit, status, search, userId, startDate, endDate });
          set({
            adminOrders: result.orders,
            adminPagination: result.pagination,
            adminOrdersLoading: false,
          });
          return result;
        } catch (error) {
          set({ adminOrdersLoading: false });
          throw error;
        }
      },

      loadOrders: async (userId, { force = true } = {}) => {
        const scope = userId ? `user:${userId}` : 'all';

        const { orders, ordersLastLoadedAt, ordersLastLoadedScope } = get();
        const hasOrders = Array.isArray(orders) && orders.length > 0;
        const cacheAge = Number(ordersLastLoadedAt || 0) ? (Date.now() - Number(ordersLastLoadedAt || 0)) : Number.POSITIVE_INFINITY;
        const cacheIsFresh = cacheAge >= 0 && cacheAge < ORDERS_CACHE_TTL;
        const shouldBypassHydratedCache = isRealProvider && !fetchedOrderScopesThisSession.has(scope);
        const hasFreshOrders = !shouldBypassHydratedCache && hasOrders && ordersLastLoadedScope === scope && cacheIsFresh;

        // Serve cached orders when still fresh (even if force=true).
        if (hasFreshOrders) return orders;
        if (!force && hasOrders) return orders;

        if (ordersRequest && ordersRequestScope === scope) {
          return ordersRequest;
        }

        const requestId = ++ordersRequestId;
        ordersRequestScope = scope;
        ordersRequest = apiClient.orders.list(userId)
          .then((items) => {
            const nextOrders = Array.isArray(items) ? items : (isRealProvider ? [] : mockOrders);

            // Guard against stale responses when switching scopes quickly.
            if (requestId === ordersRequestId) {
              set({
                orders: nextOrders,
                ordersLastLoadedAt: Date.now(),
                ordersLastLoadedScope: scope,
              });
            }

            if (isRealProvider) {
              fetchedOrderScopesThisSession.add(scope);
            }
            return nextOrders;
          })
          .catch((_error) => {
            if (!hasOrders || ordersLastLoadedScope !== scope) {
              const fallbackOrders = userId
                ? mockOrders.filter((entry) => entry.userId === userId)
                : mockOrders;

              set({
                orders: isRealProvider ? [] : fallbackOrders,
                ordersLastLoadedScope: scope,
              });
            }
            return get().orders;
          })
          .finally(() => {
            ordersRequest = null;
            ordersRequestScope = '';
          });

        return ordersRequest;
      },

      getOrderById: async (orderId, userId = null) => {
        const normalizedOrderId = String(orderId || '').trim();
        if (!normalizedOrderId) return null;

        const fetchedOrder = await apiClient.orders.getById(normalizedOrderId, userId);
        if (!fetchedOrder) return null;

        set((state) => {
          const existingOrders = Array.isArray(state.orders) ? state.orders : [];
          const existingIndex = existingOrders.findIndex((entry) => entry.id === fetchedOrder.id);
          const nextOrders = existingIndex >= 0
            ? existingOrders.map((entry) => (entry.id === fetchedOrder.id ? { ...entry, ...fetchedOrder } : entry))
            : [fetchedOrder, ...existingOrders];

          return {
            orders: nextOrders,
            ordersLastLoadedAt: Date.now(),
            ordersLastLoadedScope: state.ordersLastLoadedScope || (userId ? `user:${userId}` : 'all'),
          };
        });

        return fetchedOrder;
      },
      
      addOrder: async (order) => {
        try {
          const rawCustomInputs = (
            order?.customInputs !== undefined
              ? order.customInputs
              : (order?.orderFieldsValues || order?.orderFields || {})
          );
          const customInputsObject = (rawCustomInputs && typeof rawCustomInputs === 'object' && !Array.isArray(rawCustomInputs))
            ? rawCustomInputs
            : {};
          const orderFieldsValues = customInputsObject;
          const playerId = String(
            order?.playerId ||
            customInputsObject?.playerId ||
            customInputsObject?.player_id ||
            customInputsObject?.userId ||
            orderFieldsValues?.playerId ||
            orderFieldsValues?.userId ||
            orderFieldsValues?.uid ||
            ''
          ).trim();

          // Get current pricing and exchange rates for financial snapshot
          const currencies = await apiClient.system.currencies().catch(() => []);
          const products = await apiClient.products.list().catch(() => []);

          const product = products.find((p) => p.id === order.productId);
          const currencyCode = String(order.currencyCode || 'USD').toUpperCase();
          const userCurrency = currencies.find((c) => String(c.code || '').toUpperCase() === currencyCode) || { code: currencyCode, rate: 1 };

          // Calculate pricing snapshot
          const basePrice = Number(order.unitPriceBase || product?.basePriceCoins || product?.price || 0);
          const groupDiscount = 0; // TODO: Get from user group
          const unitPriceInAccountCurrency = Number(order.unitPrice || basePrice);
          const quantity = Number(order.quantity || 1);
          const finalPrice = Number(order.priceCoins || (unitPriceInAccountCurrency * quantity));

          if (!Number.isFinite(finalPrice) || finalPrice < 0) {
            const err = new Error('Invalid order amount');
            err.code = 'INVALID_ORDER_AMOUNT';
            throw err;
          }

          const orderWithSnapshot = {
            ...order,
            playerId,
            customInputs: rawCustomInputs,
            orderFields: orderFieldsValues,
            orderFieldsValues,
            financialSnapshot: {
              originalCurrency: userCurrency.code,
              originalAmount: basePrice,
              exchangeRateAtExecution: Number(order.exchangeRateAtExecution || userCurrency.rate || 1),
              convertedAmountAtExecution: finalPrice,
              finalAmountAtExecution: finalPrice,
              pricingSnapshot: {
                basePrice,
                groupDiscount,
                unitPrice: unitPriceInAccountCurrency,
                finalPrice,
                currency: userCurrency.code,
              },
              feesSnapshot: {
                processingFee: 0,
                serviceFee: 0,
                totalFees: 0,
              },
            },
          };

          const created = await apiClient.orders.create(orderWithSnapshot);
          const createdOrder = created?.order || created || {};
          const nextOrder = {
            ...orderWithSnapshot,
            ...createdOrder,
            customInputs: createdOrder?.customInputs ?? orderWithSnapshot.customInputs,
            orderFields: createdOrder?.orderFields || createdOrder?.orderFieldsValues || orderWithSnapshot.orderFields,
            orderFieldsValues: createdOrder?.orderFieldsValues || createdOrder?.orderFields || orderWithSnapshot.orderFieldsValues,
            customerInput: createdOrder?.customerInput || orderWithSnapshot.customerInput,
          };

          set((state) => ({
            orders: [nextOrder, ...state.orders],
            ordersLastLoadedAt: Date.now(),
            ordersLastLoadedScope: state.ordersLastLoadedScope || `user:${nextOrder.userId}`,
          }));

          // Fire-and-forget: don't let a notification failure mask a successful order.
          try {
            const orderNumber = nextOrder?.orderNumber || nextOrder?.displayOrderId || nextOrder?.id;
            const productName = nextOrder?.productName || nextOrder?.productTitle || nextOrder?.name || 'منتج';
            const customerName = nextOrder?.userName || nextOrder?.customerName || nextOrder?.userId || 'عميل';
            const sectionName = resolveOrderSectionName(nextOrder, product);
            useNotificationStore.getState().addNotification({
              title: `طلب يدوي جديد - قسم ${sectionName}`,
              message: `طلب ${orderNumber ? `#${orderNumber}` : 'جديد'} من ${customerName} للمنتج: ${productName}. تابع لقسم ${sectionName}.`,
              type: 'info',
              targetType: 'order',
              targetId: nextOrder?.id,
              orderId: nextOrder?.id,
              sectionName,
              categoryName: sectionName,
              source: 'order',
              targetUrl: nextOrder?.id ? `/admin/orders?orderId=${encodeURIComponent(nextOrder.id)}` : '/admin/orders',
            });
          } catch (_notifError) {
            // Swallow — order was already created successfully.
          }

          return {
            order: nextOrder,
            updatedBalance: created?.updatedBalance,
          };
        } catch (err) {
          // Refetch products so the UI picks up the latest prices after a provider price jump.
          if (err?.code === 'PROVIDER_PRICE_INCREASED') {
            apiClient.products.list().catch(() => {});
            throw err;
          }

          console.error('Order submission error details:', err, err?.response?.data);
          throw err;
        }
      },

      updateOrderStatus: async (id, status, orderContext = null) => {
        const target = (get().orders || []).find((o) => o.id === id);
        const currentOrder = orderContext || target;
        if (!currentOrder) return;

        const normalizedStatus = normalizeManualOrderStatus(status);
        const currentActor = useAuthStore.getState().user || null;
        const actorRole = String(currentActor?.role || '').trim().toLowerCase();
        const isAdminActor = ['admin', 'supervisor', 'manager', 'moderator'].includes(actorRole);

        // Merge rejectionReason into the context so realApi can read it
        const contextWithReason = {
          ...currentOrder,
          rejectionReason: orderContext?.rejectionReason || null,
        };

        const updated = await apiClient.orders.updateStatus(id, normalizedStatus, contextWithReason);
        const nextOrder = updated || { ...currentOrder, status: normalizedStatus };
        if (isAdminActor) {
          nextOrder.updatedBy = currentActor?.id || currentActor?._id || nextOrder.updatedBy || null;
          nextOrder.updatedByName = currentActor?.name || nextOrder.updatedByName || '';
          nextOrder.reviewerName = currentActor?.name || nextOrder.reviewerName || '';
          nextOrder.reviewedBy = nextOrder.reviewedBy || currentActor?.id || currentActor?._id || null;
          nextOrder.approvedBy = ['completed', 'approved'].includes(normalizedStatus) ? (currentActor?.id || currentActor?._id || nextOrder.approvedBy || null) : nextOrder.approvedBy || null;
          nextOrder.rejectedBy = normalizedStatus === 'rejected' ? (currentActor?.id || currentActor?._id || nextOrder.rejectedBy || null) : nextOrder.rejectedBy || null;
          nextOrder.reviewedAt = new Date().toISOString();
        }
        set(state => ({
          orders: state.orders.map((o) => (
            o.id === id
              ? {
                  ...o,
                  ...nextOrder,
                  status: nextOrder.status || normalizedStatus,
                  rejectionReason: nextOrder.rejectionReason || orderContext?.rejectionReason || o.rejectionReason || null,
                }
              : o
          )),
          ordersLastLoadedAt: Date.now(),
        }));

        if (isAdminActor) {
          useAdminStore.getState().appendAdminActivity?.({
            action: `order_${normalizedStatus}`,
            title: normalizedStatus === 'completed' || normalizedStatus === 'approved' ? 'قبول طلب' : normalizedStatus === 'rejected' ? 'رفض طلب' : 'تحديث طلب',
            description: `${currentActor?.name || actorRole || 'مشرف'} ${normalizedStatus === 'rejected' ? 'رفض' : 'قبل/حدّث'} الطلب ${target?.id || id}`,
            actor: currentActor,
            entityType: 'order',
            entityId: target?.id || id,
            status: normalizedStatus,
            source: 'order_review',
          });
        }

        if (useAdminStore.getState().loadUsers) {
          await useAdminStore.getState().loadUsers();
        }

        if (useAuthStore.getState().refreshProfile) {
          await useAuthStore.getState().refreshProfile();
        }

        if (normalizedStatus === 'completed') {
          useNotificationStore.getState().addNotification({
            title: 'قبول طلب',
            message: `تم قبول الطلب ${target?.id || id}`,
            type: 'success',
            targetType: 'order',
            targetId: target?.id || id,
            orderId: target?.id || id,
            targetUrl: `/orders?orderId=${encodeURIComponent(target?.id || id)}`,
          });
        } else if (normalizedStatus === 'rejected') {
          useNotificationStore.getState().addNotification({
            title: 'رفض طلب',
            message: `تم رفض الطلب ${target?.id || id}`,
            type: 'warning',
            targetType: 'order',
            targetId: target?.id || id,
            orderId: target?.id || id,
            targetUrl: `/orders?orderId=${encodeURIComponent(target?.id || id)}`,
          });
        } else {
          useNotificationStore.getState().addNotification({
            title: 'تحديث حالة الطلب',
            message: `تم تحديث الطلب ${target?.id || id} إلى ${getManualOrderStatusLabel(normalizedStatus)}`,
            type: 'info',
            targetType: 'order',
            targetId: target?.id || id,
            orderId: target?.id || id,
            targetUrl: `/orders?orderId=${encodeURIComponent(target?.id || id)}`,
          });
        }

        return nextOrder;
      },

      syncOrderSupplierStatus: async (id, actor) => {
        const synced = await apiClient.orders.syncSupplierStatus(id, actor || null);
        if (!synced) return null;
        set((state) => ({
          orders: (state.orders || []).map((o) => (o.id === id ? { ...o, ...synced } : o)),
          ordersLastLoadedAt: Date.now(),
        }));
        return synced;
      }
}));

export default useOrderStore;
