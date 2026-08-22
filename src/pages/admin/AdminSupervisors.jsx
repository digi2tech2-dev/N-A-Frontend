import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Circle, Plus, Search, ShieldCheck, Trash2, UserCog, UserPlus } from 'lucide-react';
import useAdminStore from '../../store/useAdminStore';
import useAuthStore from '../../store/useAuthStore';
import apiClient from '../../services/client';
import { useToast } from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/account/ConfirmDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import {
  getAccountStatusBadgeVariant,
  getAccountStatusLabel,
  isRejectedAccountStatus,
  normalizeAccountStatus,
} from '../../utils/accountStatus';
import { SUPERVISOR_PERMISSION_GROUPS, normalizePermissions } from '../../utils/permissions';
import { resolveUserAvatar } from '../../utils/avatar';

const SUPERVISOR_ROLES = ['supervisor', 'manager', 'moderator'];
const FILTER_OPTIONS = ['all', 'approved', 'pending', 'rejected'];

const AdminSupervisors = () => {
  const { users, loadUsers, updateUserRole, updateUserStatus, updateUserPermissions } = useAdminStore();
  const { user: actor } = useAuthStore();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [permissionTarget, setPermissionTarget] = useState(null);
  const [activityTarget, setActivityTarget] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateUsers, setCandidateUsers] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isPromotingSupervisor, setIsPromotingSupervisor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [demoteTarget, setDemoteTarget] = useState(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.resolve(loadUsers({ force: true })).finally(() => {
      if (mounted) setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [loadUsers]);

  const supervisors = useMemo(
    () => (users || []).filter((entry) => SUPERVISOR_ROLES.includes(String(entry.role || '').toLowerCase())),
    [users]
  );

  useEffect(() => {
    if (!isAddModalOpen) return undefined;

    let mounted = true;
    const timeout = setTimeout(async () => {
      setIsLoadingCandidates(true);
      try {
        const result = await apiClient.users.list({
          page: 1,
          limit: 20,
          sortBy: 'name',
          sortOrder: 'asc',
          search: candidateSearch.trim(),
        });
        const items = Array.isArray(result) ? result : (result?.users || []);
        const candidates = items.filter((entry) => {
          const role = String(entry?.role || '').toLowerCase();
          return entry?.id && !SUPERVISOR_ROLES.includes(role) && role !== 'admin';
        });

        if (mounted) {
          setCandidateUsers(candidates);
          setSelectedCandidateId((previous) => (
            candidates.some((entry) => String(entry.id) === String(previous)) ? previous : ''
          ));
        }
      } catch (error) {
        if (mounted) {
          setCandidateUsers([]);
          addToast(error?.message || 'فشل تحميل المستخدمين.', 'error');
        }
      } finally {
        if (mounted) setIsLoadingCandidates(false);
      }
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [addToast, candidateSearch, isAddModalOpen]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return supervisors.filter((entry) => {
      const normalizedStatus = normalizeAccountStatus(entry.status);
      const matchesStatus = statusFilter === 'all' ? true : normalizedStatus === statusFilter;
      const matchesSearch = !term
        ? true
        : String(entry.name || '').toLowerCase().includes(term)
          || String(entry.email || '').toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, supervisors]);

  const handleRoleChange = async (id, nextRole) => {
    try {
      await updateUserRole(id, nextRole, actor);
      addToast('تم تحديث الدور بنجاح.', 'success');
      await loadUsers({ force: true });
    } catch (error) {
      addToast(error?.message || 'فشل تحديث الدور.', 'error');
    }
  };

  const openAddSupervisorModal = () => {
    setCandidateSearch('');
    setCandidateUsers([]);
    setSelectedCandidateId('');
    setIsAddModalOpen(true);
  };

  const closeAddSupervisorModal = () => {
    if (isPromotingSupervisor) return;
    setIsAddModalOpen(false);
    setCandidateSearch('');
    setCandidateUsers([]);
    setSelectedCandidateId('');
  };

  const promoteSelectedUser = async () => {
    if (!selectedCandidateId) {
      addToast('اختر مستخدمًا أولًا.', 'error');
      return;
    }

    setIsPromotingSupervisor(true);
    try {
      await updateUserRole(selectedCandidateId, 'SUPERVISOR', actor);
      addToast('تمت إضافة المشرف بنجاح.', 'success');
      setIsAddModalOpen(false);
      setCandidateSearch('');
      setCandidateUsers([]);
      setSelectedCandidateId('');
      await loadUsers({ force: true });
    } catch (error) {
      addToast(error?.message || 'فشل إضافة المشرف.', 'error');
    } finally {
      setIsPromotingSupervisor(false);
    }
  };

  const handleStatusToggle = async (target) => {
    const nextStatus = isRejectedAccountStatus(target.status) ? 'approved' : 'rejected';
    try {
      await updateUserStatus(target.id, nextStatus, actor);
      addToast(nextStatus === 'approved' ? 'تم تفعيل المشرف.' : 'تم حظر المشرف.', 'success');
      await loadUsers({ force: true });
    } catch (error) {
      addToast(error?.message || 'فشل تحديث الحالة.', 'error');
    }
  };

  const handleDemoteSupervisor = async (target) => {
    setDemoteTarget(target);
  };

  const confirmDemoteSupervisor = async () => {
    if (!demoteTarget?.id) return;
    try {
      await updateUserRole(demoteTarget.id, 'CUSTOMER', actor);
      await updateUserPermissions(demoteTarget.id, [], actor);
      addToast('تم تحويل المشرف إلى عميل.', 'success');
      setDemoteTarget(null);
      await loadUsers({ force: true });
    } catch (error) {
      addToast(error?.message || 'فشل تحويل المشرف إلى عميل.', 'error');
    }
  };

  const openPermissionsModal = (target) => {
    setPermissionTarget(target);
    setSelectedPermissions(normalizePermissions(target?.permissions));
  };

  const togglePermission = (permission) => {
    setSelectedPermissions((previous) => (
      previous.includes(permission)
        ? previous.filter((item) => item !== permission)
        : [...previous, permission]
    ));
  };

  const savePermissions = async () => {
    if (!permissionTarget?.id) return;
    setIsSavingPermissions(true);
    try {
      await updateUserPermissions(permissionTarget.id, selectedPermissions, actor);
      addToast('تم تحديث صلاحيات المشرف.', 'success');
      setPermissionTarget(null);
      await loadUsers({ force: true });
    } catch (error) {
      addToast(error?.message || 'فشل تحديث الصلاحيات.', 'error');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const isOnline = (entry) => {
    if (entry?.isOnline || entry?.online) return true;
    const rawLastSeen = entry?.lastSeen || entry?.lastActiveAt || entry?.updatedAt;
    const lastSeen = rawLastSeen ? new Date(rawLastSeen).getTime() : 0;
    return lastSeen > 0 && Date.now() - lastSeen < 5 * 60 * 1000;
  };

  const getActivityLogs = (entry) => (
    Array.isArray(entry?.activityLogs) && entry.activityLogs.length
      ? entry.activityLogs
      : [
          { id: 'login', action: 'آخر ظهور', createdAt: entry?.lastSeen || entry?.lastActiveAt || entry?.updatedAt || entry?.createdAt },
          { id: 'permissions', action: `عدد الصلاحيات الحالية: ${normalizePermissions(entry?.permissions).length}`, createdAt: entry?.updatedAt || entry?.createdAt },
        ]
  );

  return (
    <div className="min-w-0 space-y-6">
      <section className="admin-premium-hero">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text)]">
          <UserCog className="h-6 w-6" />
          إدارة المشرفين
        </h1>

        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <Button type="button" onClick={openAddSupervisorModal} className="shrink-0">
            <Plus className="h-4 w-4" />
            إضافة مشرف
          </Button>
          <div className="flex-1 md:w-72">
            <Input
              placeholder="بحث بالاسم أو البريد..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon={<Search className="h-4 w-4" />}
              variant="search"
            />
          </div>
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            value={statusFilter}
            onChange={(event) => setStatusFilter(FILTER_OPTIONS.includes(event.target.value) ? event.target.value : 'all')}
          >
            <option value="all">كل الحالات</option>
            <option value="approved">نشط</option>
            <option value="pending">قيد الانتظار</option>
            <option value="rejected">محظور</option>
          </select>
        </div>
      </div>
      </section>

      <div className="admin-premium-stat text-sm text-[var(--color-text-secondary)]">
        إجمالي المشرفين: <span className="font-semibold text-[var(--color-text)]">{supervisors.length}</span>
      </div>

      <div className="admin-premium-panel overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-[color:rgb(var(--color-primary-rgb)/0.08)]" />
            ))}
          </div>
        ) : (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المشرف</TableHead>
              <TableHead className="text-center">التواجد</TableHead>
              <TableHead className="text-center">الدور</TableHead>
              <TableHead className="text-center">الصلاحيات</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-end">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={resolveUserAvatar(entry, entry.name || entry.email || 'N&A HUB User')} alt={entry.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full bg-gray-200 object-cover" />
                    <div>
                      <div className="font-medium text-[var(--color-text)]">{entry.name}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">{entry.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ${
                    isOnline(entry)
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : 'bg-slate-500/10 text-slate-500 dark:text-slate-300'
                  }`}>
                    <Circle className={`h-2.5 w-2.5 ${isOnline(entry) ? 'fill-current' : ''}`} />
                    {isOnline(entry) ? 'Online' : 'Offline'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <select
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                    value={entry.role}
                    onChange={(event) => handleRoleChange(entry.id, event.target.value)}
                  >
                    <option value="manager">مانجر</option>
                    <option value="moderator">مشرف</option>
                    <option value="supervisor">سوبرفايزر</option>
                    <option value="customer">عميل</option>
                    <option value="admin">أدمن</option>
                  </select>
                </TableCell>
                <TableCell className="text-center">
                  <Button size="sm" variant="outline" onClick={() => openPermissionsModal(entry)}>
                    <ShieldCheck className="h-4 w-4" />
                    {normalizePermissions(entry.permissions).length || 'تحديد'}
                  </Button>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getAccountStatusBadgeVariant(entry.status)}>
                    {getAccountStatusLabel(entry.status, true)}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant={isRejectedAccountStatus(entry.status) ? 'primary' : 'outline'} onClick={() => handleStatusToggle(entry)}>
                      {isRejectedAccountStatus(entry.status) ? 'تفعيل' : 'حظر'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setActivityTarget(entry)}>
                      <Activity className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDemoteSupervisor(entry)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[var(--color-text-secondary)]">
                  لا يوجد مشرفون مطابقون للبحث.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddSupervisorModal}
        title="إضافة مشرف"
        size="lg"
        footer={(
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={closeAddSupervisorModal} disabled={isPromotingSupervisor}>
              إلغاء
            </Button>
            <Button onClick={promoteSelectedUser} disabled={!selectedCandidateId || isPromotingSupervisor}>
              <UserPlus className="h-4 w-4" />
              {isPromotingSupervisor ? 'جارٍ الإضافة...' : 'تأكيد'}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <Input
            label="البحث عن مستخدم"
            placeholder="ابحث بالاسم أو البريد..."
            value={candidateSearch}
            onChange={(event) => setCandidateSearch(event.target.value)}
            icon={<Search className="h-4 w-4" />}
            variant="search"
          />

          <div className="max-h-80 space-y-2 overflow-y-auto pe-1">
            {isLoadingCandidates ? (
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-[color:rgb(var(--color-primary-rgb)/0.08)]" />
              ))
            ) : candidateUsers.length ? (
              candidateUsers.map((candidate) => {
                const isSelected = String(selectedCandidateId) === String(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition ${
                      isSelected
                        ? 'border-[color:rgb(var(--color-primary-rgb)/0.65)] bg-[color:rgb(var(--color-primary-rgb)/0.12)]'
                        : 'border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.46)] hover:border-[color:rgb(var(--color-primary-rgb)/0.34)]'
                    }`}
                  >
                    <img
                      src={candidate.avatar}
                      alt={candidate.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-full bg-gray-800 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--color-text)]">{candidate.name}</span>
                      <span className="block truncate text-xs text-[var(--color-text-secondary)]">{candidate.email}</span>
                    </span>
                    <Badge variant={getAccountStatusBadgeVariant(candidate.status)}>
                      {getAccountStatusLabel(candidate.status, true)}
                    </Badge>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.42)] p-5 text-center text-sm text-[var(--color-text-secondary)]">
                لا يوجد مستخدمون متاحون للترقية.
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(permissionTarget)}
        onClose={() => !isSavingPermissions && setPermissionTarget(null)}
        title={permissionTarget ? `صلاحيات ${permissionTarget.name}` : 'صلاحيات المشرف'}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPermissionTarget(null)} disabled={isSavingPermissions}>
              إلغاء
            </Button>
            <Button onClick={savePermissions} disabled={isSavingPermissions}>
              حفظ الصلاحيات
            </Button>
          </div>
        )}
      >
        <div className="grid gap-4">
          {SUPERVISOR_PERMISSION_GROUPS.map((group) => (
            <section key={group.id} className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-surface-rgb)/0.42)] p-3">
              <h3 className="mb-3 text-sm font-black text-[var(--color-text)]">{group.title}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.options.map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.66)] bg-[color:rgb(var(--color-card-rgb)/0.58)] p-3 text-sm text-[var(--color-text)] transition hover:border-[color:rgb(var(--color-primary-rgb)/0.28)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(item.key)}
                      onChange={() => togglePermission(item.key)}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(activityTarget)}
        onClose={() => setActivityTarget(null)}
        title={activityTarget ? `سجلات النشاط - ${activityTarget.name}` : 'سجلات النشاط'}
        footer={<Button variant="ghost" onClick={() => setActivityTarget(null)}>إغلاق</Button>}
      >
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pe-1">
          {activityTarget ? getActivityLogs(activityTarget).map((log) => (
            <div key={log.id || `${log.action}-${log.createdAt}`} className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.44)] p-3">
              <p className="text-sm font-semibold text-[var(--color-text)]">{log.action || log.message || 'Activity'}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {log.createdAt ? new Date(log.createdAt).toLocaleString('ar-EG') : 'لا يوجد وقت مسجل'}
              </p>
            </div>
          )) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(demoteTarget)}
        title="تحويل المشرف إلى عميل"
        description={demoteTarget ? `تحويل المشرف ${demoteTarget.name || demoteTarget.email || ''} إلى عميل؟` : ''}
        confirmLabel="تحويل"
        cancelLabel="إلغاء"
        onConfirm={confirmDemoteSupervisor}
        onCancel={() => setDemoteTarget(null)}
      />
    </div>
  );
};

export default AdminSupervisors;
