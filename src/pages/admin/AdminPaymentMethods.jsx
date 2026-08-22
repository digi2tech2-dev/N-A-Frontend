import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUrl';
import { uploadImage } from '../../services/realApi';
import Button from '../../components/ui/Button';
import Input, { selectClassName, textareaClassName } from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/account/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/useAuthStore';
import useSystemStore from '../../store/useSystemStore';
import { useLanguage } from '../../context/LanguageContext';
import { formatNumber } from '../../utils/intl';
import {
  createPaymentEntityId,
  normalizePaymentGroups,
  normalizePaymentMethod,
} from '../../utils/paymentSettings';

const defaultGroupForm = {
  name: '',
  description: '',
  currency: '',
  image: '',
  imageName: '',
  isActive: true,
};

const defaultMethodForm = {
  groupId: '',
  name: '',
  description: '',
  type: 'mobile_wallet',
  feePercent: '0',
  accountNumber: '',
  accountName: '',
  bankName: '',
  instructions: '',
  image: '',
  imageName: '',
  isActive: true,
};

const paymentImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const paymentImageMaxSize = 2 * 1024 * 1024;

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Failed to read image'));
  reader.readAsDataURL(file);
});

const getMethodBadge = (method) => {
  if (method?.image) return null;
  const type = String(method?.type || '').toLowerCase();
  if (type === 'bank_transfer') return 'BANK';
  if (type === 'credit_card') return 'CARD';
  if (type === 'usdt' || type === 'crypto') return 'USDT';
  return 'PAY';
};

const AdminPaymentMethods = () => {
  const { user } = useAuthStore();
  const {
    currencies,
    isLoadingCurrencies,
    loadCurrencies,
    paymentSettings,
    loadPaymentSettings,
    savePaymentSettings,
  } = useSystemStore();
  const { addToast } = useToast();
  const { dir, language } = useLanguage();
  const isRTL = dir === 'rtl';
  const isEnglish = language === 'en';

  const tx = (ar, en) => (isEnglish ? en : ar);

  const [paymentGroups, setPaymentGroups] = useState([]);
  const [isPersisting, setIsPersisting] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingMethodRef, setEditingMethodRef] = useState({ groupId: '', methodId: '' });
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState({ open: false, groupId: '' });
  const [deleteMethodConfirm, setDeleteMethodConfirm] = useState({ open: false, groupId: '', methodId: '' });
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [methodForm, setMethodForm] = useState(defaultMethodForm);

  useEffect(() => {
    loadPaymentSettings({ force: true });
  }, [loadPaymentSettings]);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  useEffect(() => {
    setPaymentGroups(normalizePaymentGroups(paymentSettings?.paymentGroups, { fallbackToDefault: false }));
  }, [paymentSettings]);

  const methodTypeOptions = useMemo(
    () => ([
      { value: 'mobile_wallet', label: tx('محفظة إلكترونية', 'Mobile Wallet') },
      { value: 'bank_transfer', label: tx('تحويل بنكي', 'Bank Transfer') },
      { value: 'credit_card', label: tx('بطاقة ائتمان', 'Credit Card') },
      { value: 'usdt', label: 'USDT' },
    ]),
    [isEnglish]
  );

  const totalMethods = useMemo(
    () => paymentGroups.reduce((sum, group) => sum + group.methods.length, 0),
    [paymentGroups]
  );

  const activeMethods = useMemo(
    () => paymentGroups.reduce((sum, group) => sum + group.methods.filter((method) => method.isActive !== false).length, 0),
    [paymentGroups]
  );

  const activeGroups = useMemo(
    () => paymentGroups.filter((group) => group.isActive !== false).length,
    [paymentGroups]
  );

  const persistPaymentGroups = async (nextGroups, successMessage) => {
    setIsPersisting(true);
    try {
      const normalizedGroups = normalizePaymentGroups(nextGroups, { fallbackToDefault: false });
      const savedSettings = await savePaymentSettings(
        { paymentGroups: normalizedGroups },
        user
      );
      const freshSettings = await loadPaymentSettings({ force: true }).catch(() => savedSettings);
      setPaymentGroups(normalizePaymentGroups(freshSettings?.paymentGroups || savedSettings?.paymentGroups, { fallbackToDefault: false }));
      addToast(successMessage, 'success');
      return true;
    } catch (error) {
      addToast(error?.message || tx('فشل حفظ إعدادات طرق الدفع', 'Failed to save payment methods settings'), 'error');
      return false;
    } finally {
      setIsPersisting(false);
    }
  };

  const getFreshPaymentGroups = async () => {
    const freshSettings = await loadPaymentSettings({ force: true });
    return normalizePaymentGroups(freshSettings?.paymentGroups, { fallbackToDefault: false });
  };

  const openAddGroupModal = () => {
    setEditingGroupId(null);
    setGroupForm(defaultGroupForm);
    setGroupModalOpen(true);
  };

  const openEditGroupModal = (group) => {
    setEditingGroupId(group.id);
    setGroupForm({
      name: group.name,
      description: group.description || '',
      currency: group.currency || '',
      image: group.image || '',
      imageName: group.imageName || '',
      isActive: group.isActive !== false,
    });
    setGroupModalOpen(true);
  };

  const handleGroupImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!paymentImageTypes.includes(file.type)) {
      addToast(tx('صيغة الصورة غير مدعومة', 'Unsupported image format'), 'error');
      event.target.value = '';
      return;
    }

    if (file.size > paymentImageMaxSize) {
      addToast(tx('حجم الصورة يجب أن يكون أقل من 2MB', 'Image size must be smaller than 2MB'), 'error');
      event.target.value = '';
      return;
    }

    try {
      const path = await uploadImage('payments', file);
      setGroupForm((prev) => ({
        ...prev,
        image: path,
        imageName: file.name,
      }));
    } catch (_error) {
      addToast(tx('تعذر رفع الصورة', 'Unable to upload image'), 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveGroupImage = () => {
    setGroupForm((prev) => ({
      ...prev,
      image: '',
      imageName: '',
    }));
  };

  const handleSaveGroup = async (event) => {
    event.preventDefault();
    const trimmedName = String(groupForm.name || '').trim();
    const currencyCode = String(groupForm.currency || '').trim();

    if (!trimmedName) {
      addToast(tx('اسم المجموعة مطلوب', 'Group name is required'), 'error');
      return;
    }

    if (!currencyCode) {
      addToast(tx('حدد العملة الخاصة بالمجموعة', 'Select the group currency'), 'error');
      return;
    }

    const nextGroups = editingGroupId
      ? paymentGroups.map((group) => (
          group.id === editingGroupId
            ? {
                ...group,
                ...groupForm,
                currency: currencyCode,
                name: trimmedName,
                description: String(groupForm.description || '').trim(),
              }
            : group
        ))
      : [
          ...paymentGroups,
          {
            id: createPaymentEntityId('group', trimmedName),
            name: trimmedName,
            description: String(groupForm.description || '').trim(),
            currency: currencyCode,
            image: groupForm.image,
            imageName: groupForm.imageName,
            isActive: groupForm.isActive,
            methods: [],
          },
        ];

    await persistPaymentGroups(
      nextGroups,
      editingGroupId
        ? tx('تم تحديث مجموعة الدفع', 'Payment group updated')
        : tx('تمت إضافة مجموعة الدفع', 'Payment group added')
    );
    setGroupModalOpen(false);
  };

  const handleDeleteGroup = async (groupId) => {
    setDeleteGroupConfirm({ open: true, groupId });
  };

  const confirmDeleteGroup = async () => {
    const { groupId } = deleteGroupConfirm;
    const freshGroups = await getFreshPaymentGroups().catch(() => paymentGroups);

    const didSave = await persistPaymentGroups(
      freshGroups.filter((group) => group.id !== groupId),
      tx('تم حذف مجموعة الدفع', 'Payment group deleted')
    );
    if (didSave) setDeleteGroupConfirm({ open: false, groupId: '' });
  };

  const handleToggleGroup = async (groupId) => {
    await persistPaymentGroups(
      paymentGroups.map((group) => (
        group.id === groupId
          ? { ...group, isActive: group.isActive === false }
          : group
      )),
      tx('تم تحديث حالة المجموعة', 'Group status updated')
    );
  };

  const openAddMethodModal = (groupId) => {
    setEditingMethodRef({ groupId: '', methodId: '' });
    setMethodForm({
      ...defaultMethodForm,
      groupId,
    });
    setMethodModalOpen(true);
  };

  const openEditMethodModal = (groupId, method) => {
    setEditingMethodRef({ groupId, methodId: method.id });
    setMethodForm({
      groupId,
      name: method.name,
      description: method.description || '',
      type: method.type,
      feePercent: String(method.feePercent ?? 0),
      accountNumber: method.accountNumber || '',
      accountName: method.accountName || '',
      bankName: method.bankName || '',
      instructions: method.instructions || '',
      image: method.image || '',
      imageName: method.imageName || '',
      isActive: method.isActive !== false,
    });
    setMethodModalOpen(true);
  };

  const handleMethodImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!paymentImageTypes.includes(file.type)) {
      addToast(tx('صيغة الصورة غير مدعومة', 'Unsupported image format'), 'error');
      event.target.value = '';
      return;
    }

    if (file.size > paymentImageMaxSize) {
      addToast(tx('حجم الصورة يجب أن يكون أقل من 2MB', 'Image size must be smaller than 2MB'), 'error');
      event.target.value = '';
      return;
    }

    try {
      const path = await uploadImage('payments', file);
      setMethodForm((prev) => ({
        ...prev,
        image: path,
        imageName: file.name,
      }));
    } catch (_error) {
      addToast(tx('تعذر رفع الصورة', 'Unable to upload image'), 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveMethodImage = () => {
    setMethodForm((prev) => ({
      ...prev,
      image: '',
      imageName: '',
    }));
  };

  const handleSaveMethod = async (event) => {
    event.preventDefault();
    const trimmedName = String(methodForm.name || '').trim();

    if (!methodForm.groupId) {
      addToast(tx('اختر مجموعة الدفع أولاً', 'Select a payment group first'), 'error');
      return;
    }

    if (!trimmedName) {
      addToast(tx('اسم طريقة الدفع مطلوب', 'Payment method name is required'), 'error');
      return;
    }

    const nextGroups = paymentGroups.map((group) => ({
      ...group,
      methods: [...group.methods],
    }));

    const oldGroupId = editingMethodRef.groupId;
    const oldMethodId = editingMethodRef.methodId;
    const targetGroupIndex = nextGroups.findIndex((group) => group.id === methodForm.groupId);

    if (targetGroupIndex === -1) {
      addToast(tx('مجموعة الدفع غير موجودة', 'Payment group was not found'), 'error');
      return;
    }

    if (oldGroupId && oldMethodId) {
      const sourceGroupIndex = nextGroups.findIndex((group) => group.id === oldGroupId);
      if (sourceGroupIndex !== -1) {
        nextGroups[sourceGroupIndex].methods = nextGroups[sourceGroupIndex].methods.filter((method) => method.id !== oldMethodId);
      }
    }

    const normalizedMethod = normalizePaymentMethod({
      id: oldMethodId || createPaymentEntityId('method', trimmedName),
      name: trimmedName,
      description: String(methodForm.description || '').trim(),
      type: methodForm.type,
      feePercent: methodForm.feePercent,
      accountNumber: methodForm.accountNumber,
      accountName: methodForm.accountName,
      bankName: methodForm.bankName,
      instructions: methodForm.instructions,
      image: methodForm.image,
      imageName: methodForm.imageName,
      isActive: methodForm.isActive,
    });

    nextGroups[targetGroupIndex].methods = [
      ...nextGroups[targetGroupIndex].methods,
      normalizedMethod,
    ];

    await persistPaymentGroups(
      nextGroups,
      oldMethodId
        ? tx('تم تحديث طريقة الدفع', 'Payment method updated')
        : tx('تمت إضافة طريقة الدفع', 'Payment method added')
    );
    setMethodModalOpen(false);
  };

  const handleDeleteMethod = async (groupId, methodId) => {
    setDeleteMethodConfirm({ open: true, groupId, methodId });
  };

  const confirmDeleteMethod = async () => {
    const { groupId, methodId } = deleteMethodConfirm;
    const freshGroups = await getFreshPaymentGroups().catch(() => paymentGroups);

    const didSave = await persistPaymentGroups(
      freshGroups.map((group) => (
        group.id === groupId
          ? { ...group, methods: group.methods.filter((method) => method.id !== methodId) }
          : group
      )),
      tx('تم حذف طريقة الدفع', 'Payment method deleted')
    );
    if (didSave) setDeleteMethodConfirm({ open: false, groupId: '', methodId: '' });
  };

  const handleToggleMethod = async (groupId, methodId) => {
    await persistPaymentGroups(
      paymentGroups.map((group) => (
        group.id === groupId
          ? {
              ...group,
              methods: group.methods.map((method) => (
                method.id === methodId
                  ? { ...method, isActive: method.isActive === false }
                  : method
              )),
            }
          : group
      )),
      tx('تم تحديث حالة طريقة الدفع', 'Payment method status updated')
    );
  };

  const getMethodTypeLabel = (type) => {
    const matched = methodTypeOptions.find((option) => option.value === type);
    return matched?.label || type;
  };

  return (
    <div className="min-w-0 space-y-6">
      <header className="admin-premium-hero space-y-2">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">
          {tx('إدارة مجموعات وطرق الدفع', 'Payment Groups & Methods')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {tx(
            'أنشئ مجموعات مثل تحويل مصر أو تحويل السعودية، ثم أضف بداخل كل مجموعة وسائل الدفع التي ستظهر للعميل.',
            'Create groups such as Egypt Transfer or Saudi Transfer, then add the payment methods that should appear to customers inside each group.'
          )}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: tx('إجمالي المجموعات', 'Total Groups'),
            value: paymentGroups.length,
          },
          {
            label: tx('المجموعات النشطة', 'Active Groups'),
            value: activeGroups,
          },
          {
            label: tx('إجمالي طرق الدفع', 'Total Payment Methods'),
            value: activeMethods || totalMethods,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="admin-premium-stat p-5"
          >
            <p className="text-sm text-[var(--color-text-secondary)]">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-[var(--color-text)]">{formatNumber(card.value, isEnglish ? 'en-US' : 'ar-EG')}</p>
          </div>
        ))}
      </div>

      <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
        <Button onClick={openAddGroupModal} disabled={isPersisting} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          <span>{tx('إضافة مجموعة جديدة', 'Add New Group')}</span>
        </Button>
      </div>

      <ConfirmDialog
        open={deleteGroupConfirm.open}
        title={tx('هل أنت متأكد من حذف هذه المجموعة؟', 'Are you sure you want to delete this group?')}
        description={tx('سيتم حذف المجموعة وكل طرق الدفع داخلها نهائيًا.', 'This group and all payment methods inside it will be removed.')}
        confirmLabel={tx('حذف', 'Delete')}
        cancelLabel={tx('إلغاء', 'Cancel')}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setDeleteGroupConfirm({ open: false, groupId: '' })}
        isLoading={isPersisting}
      />

      <ConfirmDialog
        open={deleteMethodConfirm.open}
        title={tx('هل أنت متأكد من حذف طريقة الدفع هذه؟', 'Are you sure you want to delete this payment method?')}
        description={tx('سيتم حذف طريقة الدفع نهائيًا من هذه المجموعة.', 'This payment method will be removed from the group.')}
        confirmLabel={tx('حذف', 'Delete')}
        cancelLabel={tx('إلغاء', 'Cancel')}
        onConfirm={confirmDeleteMethod}
        onCancel={() => setDeleteMethodConfirm({ open: false, groupId: '', methodId: '' })}
        isLoading={isPersisting}
      />

      <div className="space-y-4">
        {paymentGroups.map((group) => (
          <section
            key={group.id}
            className="admin-premium-panel min-w-0 p-4 sm:p-5"
          >
            <div className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
              <div className={`flex min-w-0 items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {group.image ? (
                  <img
                    src={resolveImageUrl(group.image)}
                    alt={group.name}
                    className="h-12 w-12 shrink-0 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.8)] object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-soft))] text-[var(--color-button-text)]">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h2 className="truncate text-lg font-semibold text-[var(--color-text)] sm:text-xl">{group.name}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        group.isActive !== false
                          ? 'bg-[color:rgb(var(--color-success-rgb)/0.12)] text-[var(--color-success)]'
                          : 'bg-[color:rgb(var(--color-error-rgb)/0.12)] text-[var(--color-error)]'
                      }`}
                    >
                      {group.isActive !== false ? tx('نشطة', 'Active') : tx('معطلة', 'Disabled')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    {group.description || tx('لا يوجد وصف مضاف لهذه المجموعة بعد.', 'No description has been added for this group yet.')}
                  </p>
                  {group.currency ? (
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-primary)]">
                      {tx('العملة:', 'Currency:')} {group.currency}
                    </p>
                  ) : null}
                  {group.imageName ? (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {tx('الصورة:', 'Image:')} {group.imageName}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-primary)]">
                    {tx(`${group.methods.length} طرق دفع`, `${group.methods.length} payment methods`)}
                  </p>
                </div>
              </div>

              <div className={`flex w-full flex-wrap gap-2 lg:w-auto ${isRTL ? 'justify-start' : 'justify-end'}`}>
                <Button variant="outline" size="sm" onClick={() => openAddMethodModal(group.id)} disabled={isPersisting}>
                  <Plus className="h-4 w-4" />
                  <span>{tx('إضافة طريقة', 'Add Method')}</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleToggleGroup(group.id)} disabled={isPersisting}>
                  {group.isActive !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEditGroupModal(group)} disabled={isPersisting}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="icon" onClick={() => handleDeleteGroup(group.id)} disabled={isPersisting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
              {group.methods.map((method) => (
                <div
                  key={method.id}
                  className="min-w-0 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-surface-rgb)/0.8)] p-4"
                >
                  <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex min-w-0 gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {method.image ? (
                        <img
                          src={resolveImageUrl(method.image)}
                          alt={method.name}
                          className="h-14 w-14 shrink-0 rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.8)] object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-soft))] text-xs font-black tracking-[0.12em] text-[var(--color-button-text)]">
                          {getMethodBadge(method)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h3 className="truncate font-semibold text-[var(--color-text)]">{method.name}</h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              method.isActive !== false
                                ? 'bg-[color:rgb(var(--color-success-rgb)/0.12)] text-[var(--color-success)]'
                                : 'bg-[color:rgb(var(--color-error-rgb)/0.12)] text-[var(--color-error)]'
                            }`}
                          >
                            {method.isActive !== false ? tx('نشطة', 'Active') : tx('معطلة', 'Disabled')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                          {method.description || getMethodTypeLabel(method.type)}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
                          {getMethodTypeLabel(method.type)}
                        </p>
                      </div>
                    </div>

                    <div className={`flex shrink-0 flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleMethod(group.id, method.id)} disabled={isPersisting}>
                        {method.isActive !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditMethodModal(group.id, method)} disabled={isPersisting}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="danger" size="icon" onClick={() => handleDeleteMethod(group.id, method.id)} disabled={isPersisting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 break-words text-sm text-[var(--color-text-secondary)]">
                    <p>
                      <span className="font-medium text-[var(--color-text)]">{tx('رقم الحساب:', 'Account:')}</span>{' '}
                      <span className="break-all">{method.accountNumber || tx('غير محدد', 'Not set')}</span>
                    </p>
                    <p>
                      <span className="font-medium text-[var(--color-text)]">{tx('رسوم الطريقة:', 'Method fee:')}</span>{' '}
                      {`${formatNumber(Number(method.feePercent || 0), isEnglish ? 'en-US' : 'ar-EG')}%`}
                    </p>
                    {method.bankName && (
                      <p>
                        <span className="font-medium text-[var(--color-text)]">{tx('اسم البنك:', 'Bank:')}</span>{' '}
                        {method.bankName}
                      </p>
                    )}
                    {method.accountName && (
                      <p>
                        <span className="font-medium text-[var(--color-text)]">{tx('اسم صاحب الحساب:', 'Account Holder:')}</span>{' '}
                        {method.accountName}
                      </p>
                    )}
                    {method.instructions && (
                      <p>
                        <span className="font-medium text-[var(--color-text)]">{tx('تعليمات:', 'Instructions:')}</span>{' '}
                        {method.instructions}
                      </p>
                    )}
                    {method.imageName && (
                      <p>
                        <span className="font-medium text-[var(--color-text)]">{tx('اسم الصورة:', 'Image name:')}</span>{' '}
                        {method.imageName}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {!group.methods.length && (
                <div className="rounded-xl border border-dashed border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-surface-rgb)/0.72)] p-5 text-sm text-[var(--color-text-secondary)]">
                  {tx('لا توجد طرق دفع داخل هذه المجموعة حتى الآن.', 'There are no payment methods inside this group yet.')}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <Modal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroupId ? tx('تعديل مجموعة الدفع', 'Edit Payment Group') : tx('إضافة مجموعة دفع', 'Add Payment Group')}
        footer={(
          <div className={`flex flex-col gap-3 sm:flex-row ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <Button variant="ghost" className="flex-1" onClick={() => setGroupModalOpen(false)}>
              {tx('إلغاء', 'Cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSaveGroup} disabled={isPersisting}>
              {editingGroupId ? tx('حفظ التعديلات', 'Save Changes') : tx('إضافة المجموعة', 'Add Group')}
            </Button>
          </div>
        )}
      >
        <form onSubmit={handleSaveGroup} className="space-y-4">
          <Input
            label={tx('اسم المجموعة', 'Group Name')}
            value={groupForm.name}
            onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={tx('مثال: تحويل السعودية', 'Example: Saudi Transfer')}
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {tx('تحديد العملة', 'Select Currency')}
            </label>
            <select
              className={selectClassName}
              value={groupForm.currency}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, currency: event.target.value }))}
              required
              disabled={isLoadingCurrencies}
            >
              <option value="">{isLoadingCurrencies ? tx('جاري تحميل العملات...', 'Loading currencies...') : tx('اختر العملة', 'Select a currency')}</option>
              {(currencies || []).map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}{currency.name ? ` — ${currency.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {tx('وصف المجموعة', 'Group Description')}
            </label>
            <textarea
              className={textareaClassName}
              value={groupForm.description}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={tx('اكتب وصفًا مختصرًا لما تحتويه هذه المجموعة', 'Write a short description of what this group contains')}
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.85)] bg-[color:rgb(var(--color-surface-rgb)/0.75)] p-4">
            <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">{tx('صورة المجموعة', 'Group Image')}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {tx('ارفع صورة أو شعار يظهر للعملاء مع مجموعة الدفع.', 'Upload an image or logo that appears to customers with this payment group.')}
                </p>
              </div>
              {groupForm.image ? (
                <button
                  type="button"
                  onClick={handleRemoveGroupImage}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:rgb(var(--color-error-rgb)/0.22)] bg-[color:rgb(var(--color-error-rgb)/0.08)] text-[var(--color-error)] transition-colors hover:bg-[color:rgb(var(--color-error-rgb)/0.14)]"
                  aria-label={tx('حذف الصورة', 'Remove image')}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <label className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-card-rgb)/0.9)] p-4 transition-colors hover:border-[color:rgb(var(--color-primary-rgb)/0.35)]">
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" className="hidden" onChange={handleGroupImageChange} />
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-soft))] text-[var(--color-button-text)]">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{tx('رفع صورة جديدة', 'Upload a new image')}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {groupForm.imageName || tx('PNG, JPG, WEBP أو GIF', 'PNG, JPG, WEBP, or GIF')}
                  </p>
                </div>
              </div>
            </label>

            {groupForm.image ? (
              <div className="overflow-hidden rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.85)] bg-[color:rgb(var(--color-card-rgb)/0.96)] p-3">
                <img src={resolveImageUrl(groupForm.image)} alt={groupForm.name || 'Payment group'} decoding="async" referrerPolicy="no-referrer" className="h-44 w-full rounded-xl object-cover" />
              </div>
            ) : null}
          </div>

          <label className={`flex items-center gap-3 text-sm text-[var(--color-text)] ${isRTL ? 'flex-row-reverse' : ''}`}>
            <input
              type="checkbox"
              checked={groupForm.isActive}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span>{tx('تفعيل المجموعة', 'Enable Group')}</span>
          </label>
        </form>
      </Modal>

      <Modal
        isOpen={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        title={editingMethodRef.methodId ? tx('تعديل طريقة الدفع', 'Edit Payment Method') : tx('إضافة طريقة دفع', 'Add Payment Method')}
        footer={(
          <div className={`flex flex-col gap-3 sm:flex-row ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <Button variant="ghost" className="flex-1" onClick={() => setMethodModalOpen(false)}>
              {tx('إلغاء', 'Cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSaveMethod} disabled={isPersisting}>
              {editingMethodRef.methodId ? tx('حفظ التعديلات', 'Save Changes') : tx('إضافة الطريقة', 'Add Method')}
            </Button>
          </div>
        )}
      >
        <form onSubmit={handleSaveMethod} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {tx('المجموعة', 'Group')}
            </label>
            <select
              className={selectClassName}
              value={methodForm.groupId}
              onChange={(event) => setMethodForm((prev) => ({ ...prev, groupId: event.target.value }))}
              required
            >
              <option value="">{tx('اختر مجموعة', 'Select a group')}</option>
              {paymentGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.discount ?? group.percentage ?? 0}%)
                </option>
              ))}
            </select>
          </div>

          <Input
            label={tx('اسم طريقة الدفع', 'Payment Method Name')}
            value={methodForm.name}
            onChange={(event) => setMethodForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={tx('مثال: تحويل الراجحي', 'Example: Al Rajhi Transfer')}
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {tx('الوصف', 'Description')}
            </label>
            <textarea
              className={textareaClassName}
              value={methodForm.description}
              onChange={(event) => setMethodForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={tx('وصف قصير سيظهر للعميل', 'A short description shown to the customer')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {tx('نوع الطريقة', 'Method Type')}
            </label>
            <select
              className={selectClassName}
              value={methodForm.type}
              onChange={(event) => setMethodForm((prev) => ({ ...prev, type: event.target.value }))}
            >
              {methodTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={tx('نسبة رسوم الطريقة (%)', 'Method Fee Percentage (%)')}
            value={methodForm.feePercent}
            onChange={(event) => setMethodForm((prev) => ({ ...prev, feePercent: event.target.value }))}
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder={tx('مثال: 5', 'Example: 5')}
          />

          <Input
            label={tx('رقم الحساب أو المحفظة', 'Account or Wallet Number')}
            value={methodForm.accountNumber}
            onChange={(event) => setMethodForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
            placeholder={tx('أدخل الرقم الذي سيحوّل إليه العميل', 'Enter the number the customer will transfer to')}
          />

          <Input
            label={tx('اسم البنك', 'Bank Name')}
            value={methodForm.bankName}
            onChange={(event) => setMethodForm((prev) => ({ ...prev, bankName: event.target.value }))}
            placeholder={tx('يستخدم مع التحويل البنكي فقط', 'Used for bank transfer methods')}
          />

          <Input
            label={tx('اسم صاحب الحساب (اختياري)', 'Account Holder Name (optional)')}
            value={methodForm.accountName}
            onChange={(event) => setMethodForm((prev) => ({ ...prev, accountName: event.target.value }))}
            placeholder={tx('مثال: محمد أحمد', 'Example: John Doe')}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {tx('تعليمات العميل', 'Customer Instructions')}
            </label>
            <textarea
              className={textareaClassName}
              value={methodForm.instructions}
              onChange={(event) => setMethodForm((prev) => ({ ...prev, instructions: event.target.value }))}
              placeholder={tx('ما الذي يجب أن يفعله العميل قبل رفع الإيصال؟', 'What should the customer do before uploading the receipt?')}
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.85)] bg-[color:rgb(var(--color-surface-rgb)/0.75)] p-4">
            <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">{tx('صورة طريقة الدفع', 'Payment Method Image')}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {tx('ارفع شعارًا أو صورة تعريفية واضحة للطريقة. الحد الأقصى 2MB.', 'Upload a clear logo or identifying image. Maximum size is 2MB.')}
                </p>
              </div>
              {methodForm.image ? (
                <button
                  type="button"
                  onClick={handleRemoveMethodImage}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:rgb(var(--color-error-rgb)/0.22)] bg-[color:rgb(var(--color-error-rgb)/0.08)] text-[var(--color-error)] transition-colors hover:bg-[color:rgb(var(--color-error-rgb)/0.14)]"
                  aria-label={tx('حذف الصورة', 'Remove image')}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <label className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-card-rgb)/0.9)] p-4 transition-colors hover:border-[color:rgb(var(--color-primary-rgb)/0.35)]">
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" className="hidden" onChange={handleMethodImageChange} />
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-soft))] text-[var(--color-button-text)]">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{tx('رفع صورة جديدة', 'Upload a new image')}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {methodForm.imageName || tx('PNG, JPG, WEBP أو GIF', 'PNG, JPG, WEBP, or GIF')}
                  </p>
                </div>
              </div>
            </label>

            {methodForm.image ? (
              <div className="overflow-hidden rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.85)] bg-[color:rgb(var(--color-card-rgb)/0.96)] p-3">
                <img src={resolveImageUrl(methodForm.image)} alt={methodForm.name || 'Payment method'} decoding="async" referrerPolicy="no-referrer" className="h-44 w-full rounded-xl object-cover" />
              </div>
            ) : null}
          </div>

          <label className={`flex items-center gap-3 text-sm text-[var(--color-text)] ${isRTL ? 'flex-row-reverse' : ''}`}>
            <input
              type="checkbox"
              checked={methodForm.isActive}
              onChange={(event) => setMethodForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span>{tx('تفعيل طريقة الدفع', 'Enable Payment Method')}</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPaymentMethods;
