import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ClipboardList, RefreshCw, Search, ShieldCheck, UserCog } from 'lucide-react';
import apiClient from '../../services/client';
import useAdminStore from '../../store/useAdminStore';
import useOrderStore from '../../store/useOrderStore';
import useTopupStore from '../../store/useTopupStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { formatDateTime } from '../../utils/intl';

const SUPERVISOR_ROLES = new Set(['manager', 'moderator']);
const MONITORED_ROLES = new Set(['admin', 'supervisor', 'manager', 'moderator', 'super_admin', 'superuser']);
const ORDER_TARGET_ENTITY_TYPES = new Set(['order', 'target_order', 'target']);
const TOPUP_ENTITY_TYPES = new Set(['deposit', 'topup']);
const ORDER_TARGET_ACTIONS = new Set([
  'TARGET_ORDER_APPROVED',
  'TARGET_ORDER_REJECTED',
  'ADMIN_ORDER_COMPLETED',
  'ADMIN_ORDER_REFUNDED',
  'ORDER_REFUNDED',
  'ORDER_COMPLETED',
  'ORDER_FAILED',
]);
const TOPUP_PAYMENT_ACTIONS = new Set([
  'DEPOSIT_REQUESTED',
  'DEPOSIT_APPROVED',
  'DEPOSIT_REJECTED',
  'DEPOSIT_UPDATED',
  'TOPUP_CREATED',
  'TOPUP_PENDING',
  'TOPUP_APPROVED',
  'TOPUP_REJECTED',
  'TOPUP_UPDATED',
]);

const getId = (value) => String(value?._id || value?.id || value || '').trim();
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const normalizeAction = (value) => String(value || '').trim().toUpperCase();
const normalizeEntityType = (value) => String(value || '').trim().toLowerCase();

const getActorName = (actorId, usersById, fallback = '') => {
  const normalizedId = getId(actorId);
  if (!normalizedId) return fallback || 'System';
  const actor = usersById.get(normalizedId);
  return actor?.name || actor?.email || fallback || normalizedId;
};

const getActorRole = (actorId, usersById, fallback = '') => {
  const normalizedId = getId(actorId);
  if (!normalizedId) return String(fallback || '').trim().toLowerCase();
  const actor = usersById.get(normalizedId);
  return String(actor?.role || fallback || '').trim().toLowerCase();
};

const getStatusVariant = (value) => {
  const status = String(value || '').toLowerCase();
  if (['approved', 'completed', 'success', 'created'].includes(status)) return 'success';
  if (['rejected', 'failed', 'deleted', 'denied'].includes(status)) return 'danger';
  if (['pending', 'requested', 'updated'].includes(status)) return 'warning';
  return 'info';
};

const buildEntityContext = ({ entityType, entityId, metadata }) => {
  const details = asObject(metadata);
  const normalizedType = normalizeEntityType(entityType);

  const orderId = getId(details.orderId || details.order || details.orderNumber);
  const targetId = getId(details.targetOrderId || details.targetId);
  const depositId = getId(details.depositId || details.topupId || details.requestId);
  const userId = getId(details.userId || details.customerId || details.customer);
  const appId = getId(details.appId);

  if (normalizedType === 'target_order' || normalizedType === 'target') {
    const primary = targetId || orderId || entityId || '-';
    return {
      typeLabel: 'TARGET_ORDER',
      primary,
      secondary: userId ? `User: ${userId}` : (appId ? `App: ${appId}` : ''),
    };
  }

  if (normalizedType === 'order') {
    const primary = orderId || entityId || '-';
    return {
      typeLabel: 'ORDER',
      primary,
      secondary: userId ? `User: ${userId}` : '',
    };
  }

  if (normalizedType === 'deposit' || normalizedType === 'topup') {
    const primary = depositId || entityId || '-';
    return {
      typeLabel: 'DEPOSIT',
      primary,
      secondary: userId ? `User: ${userId}` : '',
    };
  }

  return {
    typeLabel: String(entityType || 'system').toUpperCase(),
    primary: entityId || '-',
    secondary: userId ? `User: ${userId}` : '',
  };
};

const normalizeAuditLog = (log, usersById) => {
  const action = log.action || log.event || log.type || 'activity';
  const entityType = log.entityType || log.targetType || log.resourceType || 'system';
  const entityId = log.entityId || log.targetId || log.orderId || log.userId || log.supplierId || '';
  const actorId = log.actorId || log.actor || log.performedBy || log.createdBy || '';
  const actorName = log.actorName || log.performedByName || getActorName(actorId, usersById);
  const actorRole = log.actorRole || getActorRole(actorId, usersById, log.actorRole || '');
  const metadata = asObject(log.metadata || log.details || log.data || log.newSummary);
  const context = buildEntityContext({ entityType, entityId: getId(entityId), metadata });

  return {
    id: log.id || `${action}-${entityType}-${entityId}-${log.createdAt || Date.now()}`,
    action,
    title: log.title || action.replaceAll('_', ' '),
    description: log.description || log.message || log.newSummary?.message || '',
    actorId: getId(actorId),
    actorName,
    actorRole,
    entityType,
    entityId: getId(entityId),
    metadata,
    contextType: context.typeLabel,
    contextPrimary: context.primary,
    contextSecondary: context.secondary,
    status: log.status || action,
    createdAt: log.createdAt || log.date || new Date().toISOString(),
    source: 'audit',
  };
};

const buildFallbackLogs = ({ users, orders, topups }) => {
  const usersById = new Map((users || []).map((user) => [String(user.id), user]));
  const getRole = (actorId) => getActorRole(actorId, usersById);
  const logs = [];

  (orders || []).forEach((order) => {
    const creatorId = order.createdBy || order.userId;
      logs.push({
        id: `order-created-${order.id}`,
        action: 'order_created',
      title: 'طلب جديد',
      description: order.productName || order.productNameAr || order.productId || '',
      actorId: getId(creatorId),
      actorName: getActorName(creatorId, usersById, order.userName),
      actorRole: getRole(creatorId),
        entityType: 'order',
        entityId: order.id,
        metadata: {
          orderId: order.id,
          userId: order.userId || creatorId,
        },
        status: 'created',
        createdAt: order.createdAt || order.date || new Date().toISOString(),
        source: 'orders',
    });

    const reviewerId = order.reviewedBy || order.approvedBy || order.rejectedBy || order.updatedBy;
    if (reviewerId || order.reviewerName) {
        logs.push({
          id: `order-reviewed-${order.id}`,
          action: `order_${order.status || 'updated'}`,
        title: 'مراجعة طلب',
        description: `تم تحديث حالة الطلب إلى ${order.status || 'updated'}`,
        actorId: getId(reviewerId),
        actorName: order.reviewerName || getActorName(reviewerId, usersById),
        actorRole: getRole(reviewerId),
          entityType: 'order',
          entityId: order.id,
          metadata: {
            orderId: order.id,
            userId: order.userId || creatorId,
          },
          status: order.status || 'updated',
          createdAt: order.updatedAt || order.reviewedAt || order.createdAt || new Date().toISOString(),
          source: 'orders',
      });
    }
  });

  (topups || []).forEach((topup) => {
      logs.push({
        id: `topup-created-${topup.id}`,
        action: 'topup_created',
      title: 'طلب شحن جديد',
      description: topup.paymentChannel || topup.method || '',
      actorId: getId(topup.createdBy || topup.userId),
      actorName: getActorName(topup.createdBy || topup.userId, usersById, topup.userName),
      actorRole: getRole(topup.createdBy || topup.userId),
        entityType: 'topup',
        entityId: topup.id,
        metadata: {
          depositId: topup.id,
          userId: topup.userId,
        },
        status: 'created',
        createdAt: topup.createdAt || topup.date || new Date().toISOString(),
        source: 'topups',
    });

    const reviewerId = topup.reviewedBy || topup.approvedBy || topup.rejectedBy || topup.updatedBy;
    if (reviewerId || topup.reviewerName || topup.adminNote) {
      logs.push({
        id: `topup-reviewed-${topup.id}`,
        action: `topup_${topup.status || 'updated'}`,
        title: 'مراجعة طلب شحن',
        description: topup.adminNote || `تم تحديث حالة طلب الشحن إلى ${topup.status || 'updated'}`,
        actorId: getId(reviewerId),
        actorName: topup.reviewerName || getActorName(reviewerId, usersById),
        actorRole: getRole(reviewerId),
        entityType: 'topup',
        entityId: topup.id,
        metadata: {
          depositId: topup.id,
          userId: topup.userId,
        },
        status: topup.status || 'updated',
        createdAt: topup.updatedAt || topup.reviewedAt || topup.createdAt || new Date().toISOString(),
        source: 'topups',
      });
    }
  });

  (users || [])
    .filter((user) => SUPERVISOR_ROLES.has(String(user.role || '').toLowerCase()))
    .forEach((supervisor) => {
      logs.push({
        id: `supervisor-account-${supervisor.id}`,
        action: 'supervisor_registered',
        title: 'مشرف مضاف',
        description: `${supervisor.name || supervisor.email || supervisor.id}`,
        actorId: getId(supervisor.createdBy || supervisor.addedBy || supervisor.id),
        actorName: getActorName(supervisor.createdBy || supervisor.addedBy || supervisor.id, usersById, supervisor.name),
        actorRole: getRole(supervisor.createdBy || supervisor.addedBy || supervisor.id),
        entityType: 'supervisor',
        entityId: supervisor.id,
        metadata: {
          userId: supervisor.id,
        },
        status: supervisor.status || 'created',
        createdAt: supervisor.createdAt || supervisor.updatedAt || new Date().toISOString(),
        source: 'users',
      });
    });

  return logs;
};

const SupervisorMonitoring = () => {
  const { users, loadUsers, adminActivities } = useAdminStore();
  const { adminOrders, loadAdminOrders } = useOrderStore();
  const { topups, loadTopups } = useTopupStore();
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const usersById = useMemo(
    () => new Map((users || []).map((user) => [String(user.id), user])),
    [users]
  );

  const loadMonitoring = async () => {
    setIsLoading(true);
    try {
      const [auditResult] = await Promise.allSettled([
        Promise.resolve(apiClient.audit?.list?.({ page: 1, limit: 100 }) || []),
        Promise.resolve(loadUsers({ force: true })),
        Promise.resolve(loadAdminOrders({ page: 1, limit: 100 })),
        Promise.resolve(loadTopups({ force: true })),
      ]);

      const nextAuditLogs = auditResult.status === 'fulfilled' && Array.isArray(auditResult.value)
        ? auditResult.value
        : [];
      setAuditLogs(nextAuditLogs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMonitoring();
  }, []);

  const rows = useMemo(() => {
    const auditRows = (auditLogs || []).map((log) => normalizeAuditLog(log, usersById));
    const activityRows = (adminActivities || []).map((activity) => normalizeAuditLog(activity, usersById));
    const fallbackRows = buildFallbackLogs({ users, orders: adminOrders, topups });
    const baseRows = [...auditRows, ...activityRows, ...fallbackRows];
    const term = search.trim().toLowerCase();

    return baseRows
      .filter((row, index, array) => array.findIndex((item) => item.id === row.id) === index)
      .filter((row) => MONITORED_ROLES.has(String(row.actorRole || '').toLowerCase()) || row.source === 'admin_store' || row.source === 'audit')
      .filter((row) => {
        if (sourceFilter === 'all') return true;
        const actionKey = normalizeAction(row.action);
        const entityTypeKey = normalizeEntityType(row.entityType);
        if (sourceFilter === 'orders') return ORDER_TARGET_ACTIONS.has(actionKey);
        if (sourceFilter === 'payments') return TOPUP_PAYMENT_ACTIONS.has(actionKey) || TOPUP_ENTITY_TYPES.has(entityTypeKey);
        return true;
      })
      .filter((row) => {
        if (!term) return true;
        return [row.title, row.description, row.actorName, row.entityType, row.entityId, row.contextPrimary, row.contextSecondary, row.status, row.action]
          .some((value) => String(value || '').toLowerCase().includes(term));
      })
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
  }, [adminOrders, auditLogs, search, sourceFilter, topups, users, usersById]);



  return (
    <div className="min-w-0 space-y-6 pb-4">
      <section className="admin-premium-hero relative overflow-hidden p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-[var(--color-text)]">مراقبة المشرفين</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                تتبع الطلبات والعمليات ومن قام بإضافتها أو قبولها من المشرفين.
              </p>
            </div>
          </div>

          <Button onClick={loadMonitoring} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

      </section>

      <Card className="admin-premium-panel p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المشرف، رقم الطلب، نوع العملية..."
              className="h-10 w-full rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[var(--color-surface)] ps-10 pe-3 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="h-10 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          >
            <option value="all">كل العمليات</option>
            <option value="orders">الطلبات</option>
            <option value="payments">الشحن والمدفوعات</option>
          </select>
        </div>
      </Card>

      <div className="admin-premium-panel overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.08)]" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العملية</TableHead>
                <TableHead>المشرف / المنفذ</TableHead>
                <TableHead className="text-center">الهدف</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-end">الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
                        {ORDER_TARGET_ENTITY_TYPES.has(normalizeEntityType(row.entityType)) ? <ClipboardList className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--color-text)]">{row.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{row.description || row.action}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]">
                        <UserCog className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-text)]">{row.actorName}</p>
                        <p className="truncate text-[11px] text-[var(--color-text-secondary)]">{row.actorId || 'system'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">{row.contextType || row.entityType}</span>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-text)]">{row.contextPrimary || row.entityId || '-'}</p>
                    {row.contextSecondary ? (
                      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{row.contextSecondary}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-end text-xs text-[var(--color-text-secondary)]">
                    {formatDateTime(row.createdAt, 'ar-EG')}
                  </TableCell>
                </TableRow>
              ))}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[var(--color-text-secondary)]">
                    لا توجد عمليات مطابقة حتى الآن.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default SupervisorMonitoring;
