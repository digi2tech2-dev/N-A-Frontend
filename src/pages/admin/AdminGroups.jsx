import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Edit, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import useGroupStore from '../../store/useGroupStore';
import useAdminStore from '../../store/useAdminStore';
import Button, { cn } from '../../components/ui/Button';
import Input, { selectClassName } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

const getGroupId = (group) => String(group?.id || group?._id || '').trim();

const getGroupNames = (group) => (
  [group?.name, group?.nameAr]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
);

const isUserInGroup = (user, group) => {
  if (!user || !group) return false;

  const targetId = getGroupId(group);
  const rawUserGroupId = String(user?.groupId || '').trim();
  if (targetId && rawUserGroupId && targetId === rawUserGroupId) {
    return true;
  }

  const targetNames = getGroupNames(group).map((value) => value.toLowerCase());
  const rawUserGroup = String(user?.group || user?.groupName || user?.groupId || '').trim().toLowerCase();

  return Boolean(rawUserGroup && targetNames.includes(rawUserGroup));
};

const getGroupMembers = (group, users) => (
  (Array.isArray(users) ? users : []).filter((user) => isUserInGroup(user, group))
);

const getMemberDisplayName = (member, tx) => (
  String(member?.name || '').trim()
  || String(member?.email || '').trim()
  || tx('مستخدم بدون اسم', 'Unnamed user')
);

const getRoleLabel = (role, tx) => {
  const normalizedRole = String(role || '').toLowerCase();
  if (normalizedRole === 'admin') return tx('أدمن', 'Admin');
  if (normalizedRole === 'manager') return tx('مشرف', 'Manager');
  return tx('عميل', 'Customer');
};

const getStatusLabel = (status, tx) => {
  const normalizedStatus = String(status || '').toLowerCase();
  if (normalizedStatus === 'approved' || normalizedStatus === 'active') return tx('مفعّل', 'Active');
  if (normalizedStatus === 'rejected') return tx('مرفوض', 'Rejected');
  return tx('بانتظار التفعيل', 'Pending');
};

const AdminGroups = () => {
  const { t, language } = useLanguage();
  const tx = (ar, en) => (language === 'ar' ? ar : en);
  const { groups, loadGroups, addGroup, updateGroup, deleteGroup } = useGroupStore();
  const { users, loadUsers, updateUserGroup } = useAdminStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({ name: '', discount: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [groupPendingDelete, setGroupPendingDelete] = useState(null);
  const [transferTargetGroupId, setTransferTargetGroupId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadGroups({ force: true });
    loadUsers({ force: true });
  }, [loadGroups, loadUsers]);

  const editingMembers = editingGroup ? getGroupMembers(editingGroup, users) : [];
  const deletingMembers = groupPendingDelete ? getGroupMembers(groupPendingDelete, users) : [];
  const alternativeGroups = groupPendingDelete
    ? groups.filter((group) => getGroupId(group) !== getGroupId(groupPendingDelete))
    : [];
  const groupsWithMembersCount = groups.filter((group) => getGroupMembers(group, users).length > 0).length;
  const groupsReadyToDeleteCount = Math.max(groups.length - groupsWithMembersCount, 0);

  const resetForm = () => {
    setEditingGroup(null);
    setFormData({ name: '', discount: 0 });
  };

  const closeEditModal = (force = false) => {
    if (isSaving && !force) return;
    setIsModalOpen(false);
    resetForm();
  };

  const openEditModal = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: String(group.name || ''),
        discount: Number(group.discount ?? group.percentage ?? 0),
      });
    } else {
      resetForm();
    }

    setIsModalOpen(true);
  };

  const closeDeleteModal = (force = false) => {
    if (isDeleting && !force) return;
    setGroupPendingDelete(null);
    setTransferTargetGroupId('');
  };

  const handleSave = async () => {
    const trimmedName = String(formData.name || '').trim();
    const normalizedDiscount = Math.max(0, Math.min(100, Number(formData.discount) || 0));

    if (!trimmedName) {
      addToast(tx('اسم المجموعة مطلوب.', 'Group name is required.'), 'error');
      return;
    }

    setIsSaving(true);

    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, { name: trimmedName, discount: normalizedDiscount });
        await Promise.allSettled([
          loadGroups({ force: true }),
          loadUsers({ force: true }),
        ]);
        addToast(t('groupUpdated'), 'success');
      } else {
        await addGroup({ name: trimmedName, discount: normalizedDiscount });
        await loadGroups({ force: true });
        addToast(t('groupAdded'), 'success');
      }

      closeEditModal(true);
    } catch (error) {
      addToast(error?.message || tx('تعذر حفظ المجموعة.', 'Unable to save the group.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDelete = (group) => {
    const nextAlternativeGroup = groups.find((entry) => getGroupId(entry) !== getGroupId(group));
    setGroupPendingDelete(group);
    setTransferTargetGroupId(nextAlternativeGroup ? getGroupId(nextAlternativeGroup) : '');
  };

  const handleConfirmDelete = async () => {
    if (!groupPendingDelete) return;

    const targetGroup = groups.find((group) => getGroupId(group) === transferTargetGroupId) || null;
    const membersToMove = getGroupMembers(groupPendingDelete, users);
    const requiresTransfer = membersToMove.length > 0;

    if (requiresTransfer && !targetGroup) {
      addToast(
        tx('اختر مجموعة بديلة لنقل المستخدمين قبل الحذف.', 'Choose another group for member transfer before deleting.'),
        'error'
      );
      return;
    }

    setIsDeleting(true);

    try {
      if (requiresTransfer) {
        const transferResults = await Promise.allSettled(
          membersToMove.map((member) => updateUserGroup(member.id, targetGroup))
        );
        const failedTransfers = transferResults.filter((result) => result.status === 'rejected');

        if (failedTransfers.length > 0) {
          await loadUsers({ force: true });
          throw new Error(tx(
            'تعذر نقل كل المستخدمين. لم يتم حذف المجموعة.',
            'Not all members could be transferred, so the group was not deleted.'
          ));
        }
      }

      await deleteGroup(groupPendingDelete.id);
      await Promise.allSettled([
        loadGroups({ force: true }),
        loadUsers({ force: true }),
      ]);

      addToast(
        requiresTransfer
          ? tx(
            `تم نقل ${membersToMove.length} مستخدم ثم حذف المجموعة بنجاح.`,
            `Transferred ${membersToMove.length} users and deleted the group successfully.`
          )
          : t('groupDeleted'),
        'success'
      );
      closeDeleteModal(true);
    } catch (error) {
      addToast(error?.message || tx('تعذر حذف المجموعة.', 'Unable to delete the group.'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const summaryCards = [
    {
      id: 'groups-total',
      icon: ShieldCheck,
      label: tx('إجمالي المجموعات', 'Total Groups'),
      value: groups.length,
      toneClassName: 'from-amber-500/18 via-yellow-500/10 to-transparent',
    },
    {
      id: 'groups-protected',
      icon: Users,
      label: tx('مجموعات بها أعضاء', 'Groups With Members'),
      value: groupsWithMembersCount,
      toneClassName: 'from-sky-500/16 via-indigo-500/10 to-transparent',
    },
    {
      id: 'groups-empty',
      icon: ArrowRightLeft,
      label: tx('جاهزة للحذف المباشر', 'Ready For Direct Delete'),
      value: groupsReadyToDeleteCount,
      toneClassName: 'from-emerald-500/16 via-green-500/10 to-transparent',
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <section className="admin-premium-hero space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-primary)]">
              {tx('إدارة شرائح العملاء', 'Customer Segments')}
            </p>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">
              {t('groupsManager')}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
              {tx(
                'عدّل أسماء وخصومات المجموعات مع مشاهدة أعضائها الحاليين، وأي حذف لمجموعة فيها مستخدمون يتم فقط بعد نقلهم إلى مجموعة أخرى.',
                'Edit group names and discounts while seeing their current members, and any group with members must transfer them before deletion.'
              )}
            </p>
          </div>

          <Button onClick={() => openEditModal()} disabled={isSaving || isDeleting}>
            <Plus className="h-4 w-4" />
            {t('addGroup')}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-[1.5rem] border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)] p-4 shadow-[var(--shadow-subtle)]"
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br', card.toneClassName)} />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">{card.value}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.16)] bg-[color:rgb(var(--color-surface-rgb)/0.85)] text-[var(--color-primary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="admin-premium-panel overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%] px-3">{t('groupName')}</TableHead>
              <TableHead className="w-[15%] px-2 text-center">{t('discountPercent')}</TableHead>
              <TableHead className="w-[39%] px-3">{tx('الأعضاء الحاليون', 'Current Members')}</TableHead>
              <TableHead className="w-[18%] px-3 text-end">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {groups.map((group) => {
              const members = getGroupMembers(group, users);
              const requiresTransfer = members.length > 0;

              return (
                <TableRow key={group.id} className="hover:bg-[color:rgb(var(--color-primary-rgb)/0.045)]">
                  <TableCell className="px-3 py-3 font-medium text-[var(--color-text)]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{group.name}</p>
                      <p className={cn(
                        'mt-1 text-[11px] font-medium',
                        requiresTransfer ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)]'
                      )}>
                        {requiresTransfer
                          ? tx('محمي بنقل الأعضاء', 'Transfer protected')
                          : tx('بدون أعضاء', 'No members')}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="px-2 py-3 text-center">
                    <span className="inline-flex min-w-[54px] items-center justify-center rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.16)] bg-[color:rgb(var(--color-primary-rgb)/0.07)] px-2 py-1 text-xs font-bold text-[var(--color-primary-hover)]">
                      {Number(group.discount ?? group.percentage ?? 0)}%
                    </span>
                  </TableCell>

                  <TableCell className="px-3 py-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.14)] bg-[color:rgb(var(--color-primary-rgb)/0.06)] px-2 py-1 text-[11px] font-semibold text-[var(--color-primary-hover)]">
                          <Users className="h-3.5 w-3.5" />
                          {members.length} {tx('عضو', 'member')}
                        </span>
                        {requiresTransfer && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-[color:rgb(var(--color-warning-rgb,245_158_11)/0.18)] bg-[color:rgb(var(--color-warning-rgb,245_158_11)/0.08)] px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            {tx('يلزم نقل قبل الحذف', 'Transfer before delete')}
                          </span>
                        )}
                      </div>

                      {members.length > 0 ? (
                        <p className="line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                          {members.slice(0, 4).map((member) => getMemberDisplayName(member, tx)).join('، ')}
                          {members.length > 4 && (
                            <span className="font-semibold text-[var(--color-primary-hover)]">
                              {' '}+{members.length - 4}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                          {tx('لا يوجد مستخدمون داخل هذه المجموعة حاليًا.', 'No users are assigned to this group yet.')}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-3 py-3 text-end">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(group)}
                        disabled={isSaving || isDeleting}
                        className="h-8 px-2 text-xs"
                      >
                        <Edit className="h-4 w-4" />
                        {tx('تعديل', 'Edit')}
                      </Button>
                      <Button
                        variant={requiresTransfer ? 'outline' : 'danger'}
                        size="sm"
                        onClick={() => handleRequestDelete(group)}
                        disabled={isSaving || isDeleting}
                        className="h-8 px-2 text-xs"
                      >
                        <Trash2 className="h-4 w-4" />
                        {tx('حذف', 'Delete')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeEditModal}
        title={editingGroup ? t('editGroup') : t('addGroup')}
        size="lg"
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('groupName')}
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. VIP, Standard"
            />

            <Input
              label={t('discountPercent')}
              type="number"
              min="0"
              max="100"
              value={formData.discount}
              onChange={(event) => setFormData((current) => ({ ...current, discount: Number(event.target.value) }))}
            />
          </div>

          {editingGroup ? (
            <section className="rounded-[1.5rem] border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-elevated-rgb)/0.72)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    {tx('المستخدمون الموجودون داخل هذه المجموعة', 'Users currently inside this group')}
                  </h3>
                  <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                    {tx(
                      'هذه القائمة تظهر مباشرة أثناء التعديل حتى تعرف من سيتأثر بأي تغيير على المجموعة.',
                      'This list is shown directly during editing so you can see who will be affected by any group change.'
                    )}
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-hover)]">
                  <Users className="h-4 w-4" />
                  {editingMembers.length} {tx('عضو', 'member')}
                </span>
              </div>

              {editingMembers.length > 0 ? (
                <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto pe-1">
                  {editingMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.92)] px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                          {getMemberDisplayName(member, tx)}
                        </p>
                        <p className="truncate text-xs text-[var(--color-text-secondary)]">
                          {member.email || tx('لا يوجد بريد إلكتروني', 'No email available')}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-[color:rgb(var(--color-border-rgb)/0.86)] bg-[color:rgb(var(--color-surface-rgb)/0.86)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                          {getRoleLabel(member.role, tx)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.16)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-hover)]">
                          {getStatusLabel(member.status, tx)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.2rem] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.55)] px-4 py-5 text-center text-sm text-[var(--color-text-secondary)]">
                  {tx('لا يوجد مستخدمون مرتبطون بهذه المجموعة حاليًا.', 'There are no users assigned to this group right now.')}
                </div>
              )}
            </section>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.55)] px-4 py-4 text-sm leading-6 text-[var(--color-text-secondary)]">
              {tx(
                'بعد إنشاء المجموعة ستظهر هنا الحسابات التي يتم إسنادها لها تلقائيًا عند التعديل لاحقًا.',
                'After creating the group, accounts assigned to it will appear here automatically the next time you edit it.'
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={closeEditModal} disabled={isSaving}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? tx('جارٍ الحفظ...', 'Saving...') : t('save')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(groupPendingDelete)}
        onClose={closeDeleteModal}
        title={tx('حذف مجموعة العملاء', 'Delete Customer Group')}
        size="lg"
      >
        {groupPendingDelete && (
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-[color:rgb(var(--color-error-rgb)/0.18)] bg-[color:rgb(var(--color-error-rgb)/0.08)] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:rgb(var(--color-error-rgb)/0.12)] text-[var(--color-error)]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {tx(
                      `أنت على وشك حذف مجموعة "${groupPendingDelete.name}".`,
                      `You are about to delete the "${groupPendingDelete.name}" group.`
                    )}
                  </p>
                  <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                    {deletingMembers.length > 0
                      ? tx(
                        'هذه المجموعة تحتوي على مستخدمين، لذلك يجب نقلهم أولًا إلى مجموعة أخرى قبل تنفيذ الحذف.',
                        'This group still has users, so they must be moved to another group before deletion can continue.'
                      )
                      : tx(
                        'لا يوجد أعضاء داخل هذه المجموعة الآن، لذا يمكن حذفها مباشرة بأمان.',
                        'There are no members in this group, so it can be deleted directly.'
                      )}
                  </p>
                </div>
              </div>
            </div>

            {deletingMembers.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      {tx('الأعضاء الذين سيتم نقلهم', 'Members that will be transferred')}
                    </h3>
                    <span className="inline-flex items-center rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-hover)]">
                      {deletingMembers.length} {tx('عضو', 'member')}
                    </span>
                  </div>

                  <div className="grid max-h-72 gap-2 overflow-y-auto pe-1">
                    {deletingMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.94)] px-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                            {getMemberDisplayName(member, tx)}
                          </p>
                          <p className="truncate text-xs text-[var(--color-text-secondary)]">
                            {member.email || tx('لا يوجد بريد إلكتروني', 'No email available')}
                          </p>
                        </div>

                        <span className="inline-flex items-center rounded-full border border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-surface-rgb)/0.84)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                          {getStatusLabel(member.status, tx)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.3rem] border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-elevated-rgb)/0.68)] p-4">
                  <label className="mb-2 block text-sm font-semibold text-[var(--color-text)]">
                    {tx('انقل الأعضاء إلى', 'Move members to')}
                  </label>

                  <select
                    className={cn(selectClassName, 'text-sm')}
                    value={transferTargetGroupId}
                    onChange={(event) => setTransferTargetGroupId(event.target.value)}
                    disabled={isDeleting || alternativeGroups.length === 0}
                  >
                    <option value="">{tx('اختر مجموعة بديلة', 'Choose another group')}</option>
                    {alternativeGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.discount ?? group.percentage ?? 0}%)
                      </option>
                    ))}
                  </select>

                  <p className="mt-3 text-xs leading-5 text-[var(--color-text-secondary)]">
                    {alternativeGroups.length > 0
                      ? tx(
                        'سيتم نقل كل الحسابات الظاهرة هنا إلى المجموعة المختارة ثم حذف المجموعة الحالية تلقائيًا.',
                        'All listed accounts will be moved to the selected group, then the current group will be deleted automatically.'
                      )
                      : tx(
                        'لا توجد مجموعة أخرى متاحة للنقل، لذلك لا يمكن حذف هذه المجموعة الآن.',
                        'There is no other group available for transfer, so this group cannot be deleted right now.'
                      )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={closeDeleteModal} disabled={isDeleting}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting || (deletingMembers.length > 0 && (!transferTargetGroupId || alternativeGroups.length === 0))}
              >
                {isDeleting
                  ? tx('جارٍ التنفيذ...', 'Processing...')
                  : deletingMembers.length > 0
                    ? tx('نقل الأعضاء ثم الحذف', 'Transfer members and delete')
                    : tx('حذف المجموعة', 'Delete group')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminGroups;
