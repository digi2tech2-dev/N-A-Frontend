import React, { useEffect, useMemo, useState } from 'react';
import {
  Bug,
  Clock3,
  Eye,
  Link2,
  Pencil,
  PlugZap,
  Plus,
  Power,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import apiClient from '../../services/client';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import HagoManagementModal from '../../components/admin/HagoManagementModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/useAuthStore';
import { formatDateTime, formatNumber } from '../../utils/intl';
import { useLanguage } from '../../context/LanguageContext';

const defaultForm = {
  supplierName: '',
  supplierCode: '',
  supplierType: 'api',
  baseUrl: '',
  authType: 'none',
  apiKey: '',
  apiSecret: '',
  bearerToken: '',
  username: '',
  password: '',
  customHeadersText: '',
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
  supplierFieldMappingsText: 'playerId:uid\nquantity:qty',
  isActive: true,
  enableAutoFulfillment: true,
  enableStatusSync: true,
  enableProductSync: false,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

const glowInputClass = 'focus:ring-[color:rgb(var(--color-primary-rgb)/0.3)] focus:ring-offset-[color:rgb(var(--color-surface-rgb)/1)]';
const glowSelectClass = 'h-10 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.95)] px-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(var(--color-primary-rgb)/0.3)] focus:ring-offset-2 focus:ring-offset-[color:rgb(var(--color-surface-rgb)/1)]';
const compactActionBtnClass = 'h-8 rounded-lg px-2.5 text-[11px] gap-1';
const supplierTypeLabels = { api: 'API', manual: 'يدوي', hybrid: 'مختلط' };
const summaryCards = [
  { key: 'total', label: 'الموردين' },
  { key: 'active', label: 'نشط' },
  { key: 'syncEnabled', label: 'مزامنة' },
  { key: 'syncedProducts', label: 'منتجات' },
];

const parseHeaders = (text) => String(text || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [key, ...rest] = line.split(':');
    return { key: String(key || '').trim(), value: rest.join(':').trim() };
  })
  .filter((row) => row.key);

const parseMappings = (text) => String(text || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [internalField, externalField] = line.split(':').map((value) => String(value || '').trim());
    return { internalField, externalField };
  })
  .filter((row) => row.internalField && row.externalField);

const normalizeConnectionStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (['connected', 'success', 'ok'].includes(value)) return 'connected';
  if (['failed', 'error', 'disconnected'].includes(value)) return 'failed';
  if (!value || value === 'not_tested') return 'not_tested';
  return value;
};

const getConnectionBadgeVariant = (status) => {
  const value = normalizeConnectionStatus(status);
  if (value === 'connected') return 'success';
  if (value === 'failed') return 'danger';
  return 'warning';
};

const getConnectionLabel = (status) => {
  const value = normalizeConnectionStatus(status);
  if (value === 'connected') return 'متصل';
  if (value === 'failed') return 'فشل الاتصال';
  if (value === 'not_tested') return 'لم يتم الاختبار';
  return value;
};

const formatMetaDate = (value) => (
  value
    ? formatDateTime(value, 'ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'لم تتم بعد'
);

const formatSupplierUnitPrice = (value) => formatNumber(value || 0, 'ar-EG', {
  maximumFractionDigits: 20,
});

/**
 * Safely unwrap raw API response into a flat array.
 * Handles: plain array, { data: [...] }, { products: [...] }, { synced: [...] }
 */
const unwrapProductArray = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const inner = raw.data ?? raw.products ?? raw.synced ?? raw.items ?? raw;
    if (Array.isArray(inner)) return inner;
  }
  return [];
};

const normalizeSupplierProducts = (rawInput = []) => {
  const items = unwrapProductArray(rawInput);
  return items.map((item, index) => {
    const id = item?.externalProductId || item?.providerProductId || item?.productId || item?.id || item?.sku;
    const name = item?.rawName || item?.product_name || item?.name || item?.externalProductName || item?.productName || item?.title;
    const price = Number(item?.rawPrice ?? item?.product_price ?? item?.price ?? item?.supplierPrice ?? item?.cost ?? 0);
    const min = Number(item?.minQty ?? item?.min ?? item?.minimumOrderQty ?? 0);
    const max = Number(item?.maxQty ?? item?.max ?? item?.maximumOrderQty ?? 0);

    return {
      id: String(id || `supplier-product-${index}`),
      externalProductId: String(id || `SUP-${index + 1}`),
      externalProductName: String(name || 'منتج بدون اسم'),
      supplierPrice: Number.isFinite(price) ? price : 0,
      minQty: Number.isFinite(min) ? min : 0,
      maxQty: Number.isFinite(max) ? max : 0,
      category: String(item?.category || item?.group || item?.section || '').trim(),
    };
  }).filter((product) => {
    const id = String(product.externalProductId || product.id || '').trim().toLowerCase();
    const name = String(product.externalProductName || '').trim().toLowerCase();

    const isDemoProviderProduct = (
      ['prod-001', 'prod-002', 'prod-003'].includes(id)
      || name.includes('provider widget')
      || name.includes('provider gadget')
      || name.includes('provider item')
    );

    return !isDemoProviderProduct;
  });
};

const clearStoredSupplierProductSnapshots = () => {
  // No-op: remove persistent supplier snapshots (localStorage not used anymore).
  return;
};

const stripSupplierProductSnapshot = (supplier = {}) => {
  const { syncedProductsSnapshot, syncedProductsCount, ...rest } = supplier || {};
  return rest;
};

const trimStringFields = (payload = {}) => Object.fromEntries(
  Object.entries(payload).map(([key, value]) => [
    key,
    typeof value === 'string' ? value.trim() : value,
  ])
);

const AdminSuppliers = () => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState([]);
  const [runtimeSupplierState, setRuntimeSupplierState] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [allProductsSearch, setAllProductsSearch] = useState('');
  const [allSupplierProducts, setAllSupplierProducts] = useState([]);
  const [allProductsLoading, setAllProductsLoading] = useState(false);
  const [allProductsLoaded, setAllProductsLoaded] = useState(false);
  const [syncingSupplierId, setSyncingSupplierId] = useState(null);
  const [testingSupplierId, setTestingSupplierId] = useState(null);
  const [hagoSupplier, setHagoSupplier] = useState(null);

  // ── Debug modal state ──────────────────────────────────────────────────────
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugSupplier, setDebugSupplier] = useState(null);
  const [debugOrderId, setDebugOrderId] = useState('');
  const [debugResult, setDebugResult] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const { dir, t } = useLanguage();
  const isRTL = dir === 'rtl';

  const mergeRuntimeSupplierState = (supplierId, patch) => {
    setRuntimeSupplierState((current) => ({
      ...current,
      [supplierId]: { ...(current[supplierId] || {}), ...patch },
    }));
  };

  const load = async () => {
    try {
      clearStoredSupplierProductSnapshots();
      const rows = await apiClient.suppliers.list();
      setSuppliers(Array.isArray(rows) ? rows.map(stripSupplierProductSnapshot) : []);
    } catch (error) {
      addToast(error?.message || 'فشل تحميل الموردين', 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (suppliers || []).filter((supplier) => {
      const matchesTerm = !term
        || String(supplier.supplierName || '').toLowerCase().includes(term)
        || String(supplier.supplierCode || '').toLowerCase().includes(term)
        || String(supplier.baseUrl || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'active' ? supplier.isActive : !supplier.isActive);
      return matchesTerm && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  const visibleSuppliers = useMemo(
    () => filteredSuppliers.map((supplier) => ({ ...supplier, ...(runtimeSupplierState[supplier.id] || {}) })),
    [filteredSuppliers, runtimeSupplierState]
  );

  const supplierStats = useMemo(() => {
    const mergedSuppliers = (suppliers || []).map((supplier) => ({ ...supplier, ...(runtimeSupplierState[supplier.id] || {}) }));
    return {
      total: mergedSuppliers.length,
      active: mergedSuppliers.filter((supplier) => supplier.isActive).length,
      syncEnabled: mergedSuppliers.filter((supplier) => supplier.enableProductSync).length,
      syncedProducts: mergedSuppliers.reduce((sum, supplier) => sum + Number(supplier.syncedProductsCount || 0), 0),
    };
  }, [suppliers, runtimeSupplierState]);

  const filteredAllSupplierProducts = useMemo(() => {
    const term = allProductsSearch.trim().toLowerCase();
    if (!term) return allSupplierProducts;

    return allSupplierProducts.filter((product) => (
      String(product.externalProductName || '').toLowerCase().includes(term)
      || String(product.externalProductId || '').toLowerCase().includes(term)
      || String(product.supplierName || '').toLowerCase().includes(term)
      || String(product.supplierCode || '').toLowerCase().includes(term)
      || String(product.category || '').toLowerCase().includes(term)
    ));
  }, [allProductsSearch, allSupplierProducts]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setIsOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...defaultForm,
      ...row,
      customHeadersText: (row.customHeaders || []).map((header) => `${header.key}:${header.value}`).join('\n'),
      supplierFieldMappingsText: (row.supplierFieldMappings || []).map((mapping) => `${mapping.internalField}:${mapping.externalField}`).join('\n'),
    });
    setIsOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const {
      linkedProductsCount,
      syncedProductsCount,
      syncedProductsSnapshot,
      lastProductSyncAt,
      lastConnectionTestAt,
      lastConnectionTestStatus,
      lastConnectionTestMessage,
      latencyMs,
      ...editableForm
    } = form;
    const sanitizedForm = trimStringFields(editableForm);
    const payload = {
      ...sanitizedForm,
      customHeaders: parseHeaders(sanitizedForm.customHeadersText),
      supplierFieldMappings: parseMappings(sanitizedForm.supplierFieldMappingsText),
      timeoutMs: Number(sanitizedForm.timeoutMs || 8000),
    };

    try {
      if (editing?.id) {
        await apiClient.suppliers.update(editing.id, payload, user);
        addToast('تم تعديل المورد', 'success');
      } else {
        await apiClient.suppliers.create(payload, user);
        addToast('تم إضافة المورد', 'success');
      }
      setIsOpen(false);
      await load();
    } catch (error) {
      addToast(error?.message || 'فشل حفظ المورد', 'error');
    }
  };

  const deactivate = async (row) => {
    try {
      await apiClient.suppliers.deactivate(row.id, user);
      addToast('تم تعطيل المورد', 'success');
      await load();
    } catch (error) {
      addToast(error?.message || 'فشل تعطيل المورد', 'error');
    }
  };

  const testConnection = async (row) => {
    setTestingSupplierId(row.id);
    try {
      const result = await apiClient.suppliers.testConnection(row.id, user);
      const nextStatus = normalizeConnectionStatus(result?.lastConnectionTestStatus);
      mergeRuntimeSupplierState(row.id, {
        lastConnectionTestAt: result?.lastConnectionTestAt || new Date().toISOString(),
        lastConnectionTestStatus: nextStatus,
        lastConnectionTestMessage: result?.lastConnectionTestMessage || '',
      });
      addToast(`نتيجة الاختبار: ${getConnectionLabel(nextStatus)}`, nextStatus === 'connected' ? 'success' : 'warning');
      await load();
    } catch (error) {
      addToast(error?.message || 'فشل اختبار الاتصال', 'error');
    } finally {
      setTestingSupplierId(null);
    }
  };

  const openProductsCatalog = async (row, mode = 'live') => {
    const mergedSupplier = { ...row, ...(runtimeSupplierState[row.id] || {}) };
    setSelectedSupplier(stripSupplierProductSnapshot(mergedSupplier));
    setSupplierProducts([]);
    setIsProductsOpen(true);
    setProductsLoading(true);

    try {
      const rawItems = mode === 'sync'
        ? await apiClient.suppliers.syncProducts(row.id, user)
        : await apiClient.suppliers.getLiveProducts(row.id, user);
      const normalizedItems = normalizeSupplierProducts(rawItems);
      const nextMeta = {
        syncedProductsCount: normalizedItems.length,
      };

      if (mode === 'sync') {
        nextMeta.syncedProductsSnapshot = normalizedItems;
        nextMeta.lastProductSyncAt = new Date().toISOString();
      }

      mergeRuntimeSupplierState(row.id, nextMeta);
      setSelectedSupplier(stripSupplierProductSnapshot({ ...mergedSupplier, ...nextMeta }));
      setSupplierProducts(normalizedItems);
      setIsProductsOpen(true);

      if (mode === 'sync') {
        addToast(`تمت مزامنة ${normalizedItems.length} منتج من المورد`, 'success');
        await load();
      } else if (!normalizedItems.length) {
        addToast('لا توجد منتجات متاحة لهذا المورد حاليًا', 'warning');
      }
    } catch (error) {
      addToast(error?.message || (mode === 'sync' ? 'فشل مزامنة المنتجات' : 'فشل تحميل منتجات المورد'), 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  const syncProducts = async (row) => {
    setSyncingSupplierId(row.id);
    try {
      await openProductsCatalog(row, 'sync');
    } finally {
      setSyncingSupplierId(null);
    }
  };

  // ── Debug/Testing handlers ────────────────────────────────────────────────

  const openDebugModal = (row) => {
    setDebugSupplier(row);
    setDebugResult(null);
    setDebugOrderId('');
    setIsDebugOpen(true);
  };

  const openHagoManagement = (row) => {
    if (String(row?.slug || '').toLowerCase() !== 'hago') return;
    setHagoSupplier(row);
  };

  const handleCheckBalance = async () => {
    if (!debugSupplier) return;
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const data = await apiClient.suppliers.getBalance(debugSupplier.id);
      setDebugResult({ action: 'فحص الرصيد', data });
      addToast('تم جلب بيانات الرصيد بنجاح', 'success');
    } catch (err) {
      setDebugResult({ action: 'فحص الرصيد', error: err?.message || 'فشل جلب الرصيد' });
      addToast(err?.message || 'فشل جلب الرصيد', 'error');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleCheckOrder = async () => {
    if (!debugSupplier || !debugOrderId.trim()) {
      addToast('أدخل رقم الطلب أولاً', 'warning');
      return;
    }
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const data = await apiClient.suppliers.checkOrder(debugSupplier.id, debugOrderId.trim());
      setDebugResult({ action: `فحص طلب #${debugOrderId.trim()}`, data });
      addToast('تم جلب حالة الطلب بنجاح', 'success');
    } catch (err) {
      setDebugResult({ action: `فحص طلب #${debugOrderId.trim()}`, error: err?.message || 'فشل فحص الطلب' });
      addToast(err?.message || 'فشل فحص الطلب', 'error');
    } finally {
      setDebugLoading(false);
    }
  };

  const viewProducts = async (row) => {
    await openProductsCatalog(row, 'live');
  };

  const searchAllSupplierProducts = async () => {
    const supplierRows = (suppliers || [])
      .map((supplier) => ({ ...supplier, ...(runtimeSupplierState[supplier.id] || {}) }))
      .filter((supplier) => supplier?.id);

    if (!supplierRows.length) {
      addToast('لا يوجد موردون للبحث في منتجاتهم', 'warning');
      return;
    }

    setAllProductsLoading(true);
    setAllProductsLoaded(true);

    try {
      const settledResults = await Promise.allSettled(
        supplierRows.map(async (supplier) => {
          const rawItems = await apiClient.suppliers.getLiveProducts(supplier.id, user);
          return normalizeSupplierProducts(rawItems).map((product) => ({
            ...product,
            supplierId: supplier.id,
            supplierName: supplier.supplierName || supplier.name || 'مورد غير معروف',
            supplierCode: supplier.supplierCode || supplier.slug || '',
          }));
        })
      );

      const products = settledResults.flatMap((result) => (
        result.status === 'fulfilled' ? result.value : []
      ));
      const failedCount = settledResults.filter((result) => result.status === 'rejected').length;

      setAllSupplierProducts(products);

      if (failedCount) {
        addToast(`تم تحميل ${formatNumber(products.length, 'ar-EG')} منتج، وتعذر جلب منتجات ${formatNumber(failedCount, 'ar-EG')} مورد`, 'warning');
      } else {
        addToast(`تم تحميل ${formatNumber(products.length, 'ar-EG')} منتج من كل الموردين`, 'success');
      }
    } catch (error) {
      addToast(error?.message || 'فشل البحث في منتجات الموردين', 'error');
      setAllSupplierProducts([]);
    } finally {
      setAllProductsLoading(false);
    }
  };

  const productsModalFooter = selectedSupplier ? (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {productsLoading ? 'جاري تحديث قائمة المنتجات...' : `تم عرض ${formatNumber(supplierProducts.length, 'ar-EG')} منتج`}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" onClick={() => syncProducts(selectedSupplier)} disabled={syncingSupplierId === selectedSupplier.id}>
          <RefreshCw className={`h-4 w-4 ${syncingSupplierId === selectedSupplier.id ? 'animate-spin' : ''}`} />
          مزامنة الآن
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsProductsOpen(false)}>
          إغلاق
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-w-0 space-y-4" dir={dir}>
      <section className="admin-premium-hero overflow-hidden p-2.5">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
            <h1 className="shrink-0 text-sm font-black tracking-tight text-gray-950 dark:text-white">
              الموردين
            </h1>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {summaryCards.map((item) => (
                <Badge key={item.key} variant="outline" className="h-6 rounded-md px-2 text-[10px]">
                  {item.label} {formatNumber(supplierStats[item.key], 'ar-EG')}
                </Badge>
              ))}
            </div>
          </div>
          <Button onClick={openCreate} className="h-10 self-start rounded-lg px-4 text-sm xl:self-auto">
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-gray-200 bg-white/95 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/95">
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1.55fr)_210px]">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالمورد أو الكود..." variant="search" className="h-11 rounded-xl text-sm shadow-none focus:shadow-none" />
          <select className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">كل الموردين</option>
            <option value="active">النشطون فقط</option>
            <option value="inactive">غير النشطين فقط</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] border border-amber-200/70 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,255,0.92))] p-3 shadow-[0_24px_70px_-46px_rgba(147,51,234,0.55)] dark:border-amber-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_36%),linear-gradient(135deg,rgba(17,24,39,0.96),rgba(30,27,75,0.82))]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Badge variant="premium" className="w-fit">بحث منتجات الموردين</Badge>
            <h2 className="mt-2 text-base font-black text-gray-950 dark:text-white sm:text-lg">بحث فاخر في منتجات كل الموردين</h2>
            <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
            </p>
          </div>

          <Button
            type="button"
            onClick={searchAllSupplierProducts}
            disabled={allProductsLoading}
            className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-indigo-700 via-amber-600 to-amber-500 px-4 text-white shadow-[0_18px_38px_-24px_rgba(168,85,247,0.8)] hover:brightness-105"
          >
            <Search className="h-4 w-4" />
            {allProductsLoading ? 'جاري البحث...' : 'بحث كل المنتجات'}
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <Input
            value={allProductsSearch}
            onChange={(event) => setAllProductsSearch(event.target.value)}
            placeholder="ابحث باسم المنتج أو كود المنتج أو اسم المورد..."
            variant="search"
            className="h-11 rounded-xl border-amber-200/80 bg-white/82 text-sm shadow-none focus:shadow-none dark:border-amber-500/20 dark:bg-gray-950/38"
          />
          <div className="rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-500/20 dark:bg-white/[0.06] dark:text-amber-100">
            {allProductsLoaded
              ? `${formatNumber(filteredAllSupplierProducts.length, 'ar-EG')} من ${formatNumber(allSupplierProducts.length, 'ar-EG')} منتج`
              : 'اضغط بحث كل المنتجات للبدء'}
          </div>
        </div>

        {allProductsLoaded ? (
          <div className="mt-3 overflow-hidden rounded-[1rem] border border-amber-200/70 bg-white/80 dark:border-amber-500/20 dark:bg-gray-950/26">
            {allProductsLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-semibold text-amber-700 dark:text-amber-100">
                <RefreshCw className="h-4 w-4 animate-spin" />
                جاري جلب منتجات الموردين...
              </div>
            ) : filteredAllSupplierProducts.length ? (
              <div className="max-h-[27rem] divide-y divide-amber-100/80 overflow-y-auto dark:divide-amber-500/10">
                {filteredAllSupplierProducts.map((product) => (
                  <div
                    key={`${product.supplierId}-${product.externalProductId}`}
                    className="grid grid-cols-1 gap-2 px-3 py-2.5 text-start transition hover:bg-amber-50/70 md:grid-cols-[minmax(0,1.4fr)_130px_minmax(0,0.75fr)] md:items-center dark:hover:bg-amber-500/8"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{product.externalProductName}</p>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400" dir="ltr">
                        {product.externalProductId}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 md:justify-center">
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">سعر الوحدة</span>
                      <Badge variant="success">{formatSupplierUnitPrice(product.supplierPrice)} Coins</Badge>
                    </div>

                    <div className="min-w-0 md:text-end">
                      <p className="truncate text-xs font-black text-amber-800 dark:text-amber-100">{product.supplierName}</p>
                      {product.supplierCode ? (
                        <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{product.supplierCode}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                لا توجد منتجات مطابقة للبحث الحالي.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <div className="space-y-2.5 md:hidden">
        {visibleSuppliers.length ? visibleSuppliers.map((row) => {
          const isSyncing = syncingSupplierId === row.id;
          const isTesting = testingSupplierId === row.id;

          return (
            <article key={row.id} className="overflow-hidden rounded-[1rem] border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 bg-[linear-gradient(135deg,rgba(248,250,252,0.92),rgba(245,243,255,0.9))] p-2.5 dark:border-gray-700 dark:bg-[linear-gradient(135deg,rgba(31,41,55,0.95),rgba(51,65,85,0.92))]">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{row.supplierName}</p>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{row.supplierCode}</p>
                  </div>
                  <Badge variant={row.isActive ? 'success' : 'secondary'}>{row.isActive ? 'نشط' : 'غير نشط'}</Badge>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="info">{supplierTypeLabels[row.supplierType] || row.supplierType}</Badge>
                  <Badge variant={row.enableProductSync ? 'premium' : 'secondary'}>{row.enableProductSync ? 'مزامنة المنتجات مفعلة' : 'المزامنة غير مفعلة'}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 border-t border-gray-100 p-2.5 dark:border-gray-700">
                <Button size="sm" className={compactActionBtnClass} variant="outline" onClick={() => testConnection(row)} disabled={isTesting}>
                  <PlugZap className={`h-3.5 w-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
                  اختبار الاتصال
                </Button>
                <Button size="sm" className={compactActionBtnClass} variant="outline" onClick={() => viewProducts(row)}>
                  <Eye className="h-3.5 w-3.5" />
                  عرض المنتجات
                </Button>
                <Button size="sm" className={compactActionBtnClass} variant="secondary" onClick={() => syncProducts(row)} disabled={isSyncing}>
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  مزامنة
                </Button>
                <Button size="sm" className={compactActionBtnClass} variant="outline" onClick={() => openDebugModal(row)}>
                  <Bug className="h-3.5 w-3.5" />
                  أدوات الفحص
                </Button>
                {String(row.slug || '').toLowerCase() === 'hago' ? (
                  <Button size="sm" className={compactActionBtnClass} variant="secondary" onClick={() => openHagoManagement(row)}>
                    <PlugZap className="h-3.5 w-3.5" />
                    {t('hago.manage')}
                  </Button>
                ) : null}
                <Button size="sm" className={compactActionBtnClass} variant="outline" onClick={() => openEdit(row)}>
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button size="sm" className={compactActionBtnClass} variant="danger" onClick={() => deactivate(row)}>
                  <Power className="h-3.5 w-3.5" />
                  تعطيل
                </Button>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-[1rem] border border-dashed border-gray-300 bg-white p-5 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            لا توجد نتائج مطابقة للبحث الحالي.
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-[1.25rem] border border-gray-200 bg-white shadow-sm md:block dark:border-gray-700 dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المورد</TableHead>
              <TableHead className="text-end">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleSuppliers.length ? visibleSuppliers.map((row) => {
              const isSyncing = syncingSupplierId === row.id;
              const isTesting = testingSupplierId === row.id;

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-950 dark:text-white">{row.supplierName}</div>
                        <Badge variant={row.isActive ? 'success' : 'secondary'}>{row.isActive ? 'نشط' : 'غير نشط'}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="info">{supplierTypeLabels[row.supplierType] || row.supplierType}</Badge>
                        <Badge variant={row.enableProductSync ? 'premium' : 'secondary'}>{row.enableProductSync ? 'مزامنة مفعلة' : 'مزامنة غير مفعلة'}</Badge>
                      </div>
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{row.supplierCode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[360px] flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => testConnection(row)} disabled={isTesting}>
                        <PlugZap className={`h-4 w-4 ${isTesting ? 'animate-pulse' : ''}`} />
                        اختبار
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => viewProducts(row)}>
                        <Eye className="h-4 w-4" />
                        المنتجات
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => syncProducts(row)} disabled={isSyncing}>
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        مزامنة
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openDebugModal(row)}>
                        <Bug className="h-4 w-4" />
                        أدوات الفحص
                      </Button>
                      {String(row.slug || '').toLowerCase() === 'hago' ? (
                        <Button size="sm" variant="secondary" onClick={() => openHagoManagement(row)}>
                          <PlugZap className="h-4 w-4" />
                          {t('hago.manage')}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deactivate(row)}>
                        <Power className="h-4 w-4" />
                        تعطيل
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={2} className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  لا توجد نتائج مطابقة للبحث الحالي.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isProductsOpen} onClose={() => setIsProductsOpen(false)} title={selectedSupplier ? `منتجات المورد ${selectedSupplier.supplierName}` : 'منتجات المورد'} size="xl" footer={productsModalFooter}>
        {selectedSupplier ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] p-3.5">
                <p className="text-xs font-semibold tracking-[0.16em] text-[var(--color-primary)]">بيانات المورد</p>
                <h3 className="mt-2.5 text-lg font-bold text-gray-950 dark:text-white">{selectedSupplier.supplierName}</h3>
                <p className="mt-1.5 break-all text-xs text-gray-600 dark:text-gray-300">{selectedSupplier.baseUrl || '-'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="info">{supplierTypeLabels[selectedSupplier.supplierType] || selectedSupplier.supplierType}</Badge>
                  <Badge variant={getConnectionBadgeVariant(selectedSupplier.lastConnectionTestStatus)}>{getConnectionLabel(selectedSupplier.lastConnectionTestStatus)}</Badge>
                  <Badge variant="premium">{formatNumber(selectedSupplier.syncedProductsCount || supplierProducts.length, 'ar-EG')} منتج</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Clock3 className="h-4 w-4" /><span className="text-xs font-semibold">آخر مزامنة</span></div>
                  <p className="mt-2 text-xs font-medium text-gray-900 dark:text-white">{formatMetaDate(selectedSupplier.lastProductSyncAt)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Link2 className="h-4 w-4" /><span className="text-xs font-semibold">منتجات مرتبطة</span></div>
                  <p className="mt-2 text-base font-black text-gray-950 dark:text-white">{formatNumber(selectedSupplier.linkedProductsCount || 0, 'ar-EG')}</p>
                </div>
              </div>
            </div>

            {productsLoading ? (
              <div className="rounded-2xl border border-dashed border-[color:rgb(var(--color-primary-rgb)/0.34)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-4 py-8 text-center text-xs text-[var(--color-primary)]">
                جاري تحميل كتالوج المورد...
              </div>
            ) : supplierProducts.length ? (
              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {supplierProducts.map((product) => (
                  <article key={product.id} className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-gray-950 dark:text-white">{product.externalProductName}</p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{product.externalProductId}</p>
                      </div>
                      <Badge variant="success">{formatSupplierUnitPrice(product.supplierPrice)} Coins</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {product.category ? <Badge variant="secondary">{product.category}</Badge> : null}
                      {product.minQty > 0 ? <Badge variant="info">الحد الأدنى: {formatNumber(product.minQty, 'ar-EG')}</Badge> : null}
                      {product.maxQty > 0 ? <Badge variant="info">الحد الأقصى: {formatNumber(product.maxQty, 'ar-EG')}</Badge> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-4 py-8 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                لا توجد منتجات متاحة لهذا المورد حاليًا.
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <HagoManagementModal
        provider={hagoSupplier}
        isOpen={Boolean(hagoSupplier)}
        onClose={() => setHagoSupplier(null)}
      />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'تعديل مورد' : 'إضافة مورد جديد'} size="xl">
        <form onSubmit={submit} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-2.5 py-1.5 text-xs text-[var(--color-text)]">
            تم ترك الحقول الضرورية فقط لإضافة مورد بسرعة. يمكنك تعديل باقي الإعدادات لاحقًا من شاشة التعديل.
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            <Input label="اسم المورد" value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} className={glowInputClass} required />
            <Input label="كود المورد" value={form.supplierCode} onChange={(event) => setForm({ ...form, supplierCode: event.target.value })} className={glowInputClass} required />
            <Input label="رابط الـ API الأساسي" value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} className={`md:col-span-2 ${glowInputClass}`} required />
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            <select className={glowSelectClass} value={form.supplierType} onChange={(event) => setForm({ ...form, supplierType: event.target.value })}>
              <option value="api">API (واجهة برمجة)</option>
              <option value="manual">يدوي</option>
              <option value="hybrid">مختلط</option>
            </select>
            <select className={glowSelectClass} value={form.authType} onChange={(event) => setForm({ ...form, authType: event.target.value })}>
              <option value="none">بدون توثيق</option>
              <option value="api_key">مفتاح API</option>
              <option value="bearer_token">توكن Bearer</option>
              <option value="basic_auth">اسم مستخدم وكلمة مرور</option>
            </select>
          </div>

          {form.authType === 'api_key' ? <Input label="مفتاح API" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} className={glowInputClass} /> : null}
          {form.authType === 'bearer_token' ? <Input label="توكن Bearer" type="password" value={form.bearerToken} onChange={(event) => setForm({ ...form, bearerToken: event.target.value })} className={glowInputClass} /> : null}

          {form.authType === 'basic_auth' ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              <Input label="اسم المستخدم" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className={glowInputClass} />
              <Input label="كلمة المرور" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={glowInputClass} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2.5 text-xs md:grid-cols-2">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              المورد نشط
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={Boolean(form.enableAutoFulfillment)} onChange={(event) => setForm({ ...form, enableAutoFulfillment: event.target.checked })} />
              تفعيل التنفيذ التلقائي
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" size="sm">
              حفظ المورد
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Debug / Testing Modal ──────────────────────────────────────────── */}
      <Modal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} title={debugSupplier ? `أدوات الفحص — ${debugSupplier.supplierName}` : 'أدوات الفحص'} size="lg">
        {debugSupplier ? (
          <div className="space-y-4">
            {/* Check Balance */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
              <p className="mb-3 text-sm font-bold text-gray-950 dark:text-white">فحص الرصيد</p>
              <Button size="sm" variant="secondary" onClick={handleCheckBalance} disabled={debugLoading}>
                {debugLoading ? 'جاري الفحص...' : 'جلب رصيد المورد'}
              </Button>
            </div>

            {/* Check Order Status */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
              <p className="mb-3 text-sm font-bold text-gray-950 dark:text-white">فحص حالة طلب</p>
              <div className="flex items-center gap-2">
                <Input
                  value={debugOrderId}
                  onChange={(e) => setDebugOrderId(e.target.value)}
                  placeholder="رقم الطلب (Order ID)"
                  className="h-9 flex-1 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckOrder()}
                />
                <Button size="sm" variant="secondary" onClick={handleCheckOrder} disabled={debugLoading || !debugOrderId.trim()}>
                  <Search className="h-4 w-4" />
                  فحص
                </Button>
              </div>
            </div>

            {/* Result Display */}
            {debugResult && (
              <div className="space-y-3">
                {/* ── Balance visual cards ── */}
                {debugResult.action === 'فحص الرصيد' && debugResult.data && !debugResult.error && (() => {
                  const raw = debugResult.data;
                  const balObj = raw?.balance;
                  const innerData = (typeof balObj === 'object' && balObj !== null) ? balObj : {};
                  const deepData = (typeof innerData?.data === 'object' && innerData.data !== null) ? innerData.data : {};

                  const balance = deepData?.user_balance ?? innerData?.balance ?? innerData?.user_balance ?? innerData?.remains ?? innerData?.credits ?? raw?.user_balance ?? 'N/A';
                  const parsedBalance = Number(balance);
                  const formattedBalance = Number.isFinite(parsedBalance)
                    ? new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                        useGrouping: true,
                      }).format(parsedBalance)
                    : balance ?? 'N/A';
                  const currency = deepData?.user_currency ?? innerData?.currency ?? innerData?.user_currency ?? raw?.currency ?? '';
                  const email = deepData?.user_email ?? innerData?.email ?? innerData?.user_email ?? raw?.email ?? '';
                  const userId = deepData?.user_id ?? deepData?.userId ?? innerData?.user_id ?? innerData?.userId ?? innerData?.username ?? raw?.user_id ?? '';
                  const plan = deepData?.plan ?? innerData?.plan ?? innerData?.plan_name ?? raw?.plan ?? '';
                  const status = deepData?.status ?? innerData?.status ?? raw?.status ?? '';

                  const cards = [
                    { label: 'الرصيد الحالي', value: formattedBalance, highlight: true },
                    { label: 'العملة', value: currency },
                    { label: 'البريد الإلكتروني', value: email },
                    { label: 'معرف الحساب', value: userId },
                    ...(plan ? [{ label: 'الخطة', value: plan }] : []),
                    ...(status ? [{ label: 'الحالة', value: status }] : []),
                  ].filter((c) => c.value !== undefined && c.value !== null && c.value !== '');

                  return cards.length ? (
                    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                      {cards.map((card) => (
                        <div
                          key={card.label}
                          className={`rounded-2xl border p-3.5 ${
                            card.highlight
                              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
                              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/60'
                          }`}
                        >
                          <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">{card.label}</p>
                          <p className={`mt-1.5 truncate font-bold ${
                            card.highlight
                              ? 'text-2xl text-emerald-700 dark:text-emerald-400'
                              : 'text-sm text-gray-950 dark:text-white'
                          }`}>
                            {String(card.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* ── Order Status visual cards ── */}
                {debugResult.action !== 'فحص الرصيد' && debugResult.data && !debugResult.error && (() => {
                  const d = debugResult.data;
                  const unified = d?.unifiedStatus || 'UNKNOWN';
                  const statusConfig = {
                    COMPLETED: { label: 'مكتمل', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' },
                    PENDING:   { label: 'قيد الانتظار', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400' },
                    FAILED:    { label: 'فشل', className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400' },
                    HOLD:      { label: 'معلّق — مراجعة يدوية', className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-400' },
                  };
                  const cfg = statusConfig[unified] || statusConfig.FAILED;

                  return (
                    <div className="space-y-2.5">
                      {/* Status hero card */}
                      <div className={`rounded-2xl border p-4 text-center ${cfg.className}`}>
                        <p className="text-[11px] font-semibold tracking-wide opacity-70">حالة الطلب الموحدة</p>
                        <p className="mt-1.5 text-2xl font-black">{cfg.label}</p>
                        <p className="mt-1 text-xs font-medium opacity-60">{unified}</p>
                      </div>

                      {/* Detail cards */}
                      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                        {d.providerOrderId != null && (
                          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900/60">
                            <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">رقم الطلب عند المورد</p>
                            <p className="mt-1.5 text-sm font-bold text-gray-950 dark:text-white">{String(d.providerOrderId)}</p>
                          </div>
                        )}
                        {d.providerStatus && (
                          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900/60">
                            <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">حالة المورد (الخام)</p>
                            <p className="mt-1.5 text-sm font-bold text-gray-950 dark:text-white">{String(d.providerStatus)}</p>
                          </div>
                        )}
                        {d.provider && (
                          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900/60">
                            <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">المورد</p>
                            <p className="mt-1.5 text-sm font-bold text-gray-950 dark:text-white">{String(d.provider)}</p>
                          </div>
                        )}
                      </div>

                      {/* DLQ warning */}
                      {d.dlq && (
                        <div className="rounded-2xl border border-orange-300 bg-orange-50 p-3.5 dark:border-orange-700 dark:bg-orange-950/30">
                          <p className="text-sm font-bold text-orange-700 dark:text-orange-400">⚠ تم تصنيف هذا الطلب للمراجعة اليدوية (DLQ)</p>
                          <p className="mt-1 text-xs text-orange-600 dark:text-orange-300">
                            السبب: {d.dlqReason === 'TIMEOUT' ? 'انتهاء المهلة' : d.dlqReason === 'AUTH_ERROR' ? 'خطأ مصادقة' : d.dlqReason === 'ORDER_NOT_FOUND' ? 'الطلب غير موجود' : 'خطأ في المورد'}
                          </p>
                          {d.errorMessage && <p className="mt-1 text-xs text-orange-500/80 dark:text-orange-400/70" dir="ltr">{d.errorMessage}</p>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Error display ── */}
                {debugResult.error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">حدث خطأ</p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-300">{String(debugResult.error)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AdminSuppliers;
