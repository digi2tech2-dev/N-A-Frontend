import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Hash,
  Hourglass,
  Layers3,
  MessageCircle,
  Package,
  Eye,
  RefreshCw,
  Send,
  UserRound,
  X,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button, { cn } from '../ui/Button';
import Card from '../ui/Card';
import OrderStatusBadge from './OrderStatusBadge';
import AdminOrderActions from './AdminOrderActions';
import ManualReviewActions from './ManualReviewActions';
import {
  getCustomerOrderFeedback,
  formatOrderDateTime,
  formatOrderMoney,
  getProviderDisplayName,
} from '../../utils/orders';
import { resolveUserAvatar } from '../../utils/avatar';
import { resolveImageUrl } from '../../utils/imageUrl';
import { buildWhatsAppLink, getAdminWhatsAppNumber } from '../../utils/whatsapp';
import { useBodyScrollLock } from '../../utils/bodyScrollLock';
import { useNativeBackOverlay } from '../../hooks/useNativeBackOverlay';
import brandLogo from '../../assets/logo.PNG';
import './OrderDetailsDrawer.css';

const DetailTile = ({ label, value, valueNode = null, hint = '', onClick, copyable = false, copyTone = 'primary', icon: Icon = ClipboardList }) => {
  const Component = onClick ? 'button' : 'div';
  const isWarningCopy = copyable && copyTone === 'warning';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'order-details-neon__tile group relative flex min-h-[4.75rem] w-full items-center gap-3.5 overflow-hidden rounded-[1.05rem] border border-[color:rgb(var(--color-border-rgb)/0.66)] bg-[linear-gradient(145deg,rgb(var(--color-elevated-rgb)/0.6),rgb(var(--color-card-rgb)/0.42))] px-3.5 py-3 text-start shadow-[inset_0_1px_0_rgb(255_255_255/0.045),0_18px_38px_-34px_rgb(var(--color-primary-rgb)/0.5)] backdrop-blur-xl transition duration-200',
        isWarningCopy && 'is-warning',
        onClick && 'hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.4)] hover:bg-[linear-gradient(145deg,rgb(var(--color-primary-rgb)/0.09),rgb(var(--color-card-rgb)/0.5))]',
        isWarningCopy && 'border-[color:rgb(var(--color-warning-rgb)/0.36)] bg-[color:rgb(var(--color-warning-rgb)/0.12)] hover:border-[color:rgb(var(--color-warning-rgb)/0.52)] hover:bg-[color:rgb(var(--color-warning-rgb)/0.18)]'
      )}
      title={copyable ? 'Click to copy' : undefined}
    >
      <span className={cn(
        'order-details-neon__tile-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[linear-gradient(145deg,rgb(var(--color-primary-rgb)/0.15),rgb(var(--color-primary-rgb)/0.07))] text-[var(--color-primary)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_10px_24px_-18px_rgb(var(--color-primary-rgb)/0.8)]',
        isWarningCopy && 'border-[color:rgb(var(--color-warning-rgb)/0.32)] bg-[color:rgb(var(--color-warning-rgb)/0.14)] text-[var(--color-warning)]'
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="order-details-neon__tile-label text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</p>
        {valueNode ? (
          <div className="mt-1">{valueNode}</div>
        ) : (
          <p className="order-details-neon__tile-value mt-1 break-words text-sm font-extrabold leading-5 text-[var(--color-text)]">{value || '-'}</p>
        )}
        {hint ? (
          <p className="order-details-neon__tile-hint mt-1 text-[11px] leading-5 text-[var(--color-muted)]">{hint}</p>
        ) : null}
      </div>
      {copyable ? <Copy className={cn('h-3.5 w-3.5 shrink-0 text-[var(--color-muted)] transition group-hover:text-[var(--color-primary)]', isWarningCopy && 'text-[var(--color-warning)] group-hover:text-[var(--color-warning)]')} /> : null}
    </Component>
  );
};

const normalizeFieldText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\u064b-\u065f\u0670]/g, '')
  .replace(/[*:：\s_-]+/g, '');

const IDENTIFIER_FIELD_TOKENS = [
  'playerid',
  'userid',
  'uid',
  'useridentifier',
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
];

const isIdentifierLikeField = (field = {}) => {
  const normalizedText = normalizeFieldText(`${field?.key || ''}${field?.label || ''}`);
  return IDENTIFIER_FIELD_TOKENS.some((token) => normalizedText.includes(token));
};

const IMAGE_PATH_REGEX = /\.(png|jpe?g|webp|gif|bmp|svg)(?:\?.*)?$/i;
const UPLOAD_IMAGE_PATH_REGEX = /(?:^|\/)uploads\/(?:order-fields|products|deposits|payments|targets|target-apps)\//i;

const isImageOrderField = (field = {}) => {
  const type = String(field?.type || '').trim().toLowerCase();
  const value = String(field?.value || '').trim();

  return type === 'image'
    || UPLOAD_IMAGE_PATH_REGEX.test(value)
    || IMAGE_PATH_REGEX.test(value);
};

const OrderFieldImageButton = ({ value, isArabic }) => {
  const href = resolveImageUrl(value);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="order-details-neon__image-link inline-flex h-8 items-center gap-1 rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.25)] px-2.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
    >
      <Eye className="h-3.5 w-3.5" />
      {isArabic ? 'عرض' : 'View'}
    </a>
  );
};

const feedbackStyles = {
  success: {
    icon: CheckCircle2,
    className: 'border-[color:rgb(var(--color-success-rgb)/0.32)] bg-[linear-gradient(135deg,rgb(var(--color-success-rgb)/0.14),rgb(var(--color-card-rgb)/0.76))] text-[var(--color-success)]',
  },
  danger: {
    icon: AlertTriangle,
    className: 'border-[color:rgb(var(--color-error-rgb)/0.32)] bg-[linear-gradient(135deg,rgb(var(--color-error-rgb)/0.13),rgb(var(--color-card-rgb)/0.76))] text-[var(--color-error)]',
  },
  warning: {
    icon: Hourglass,
    className: 'border-[color:rgb(var(--color-warning-rgb)/0.34)] bg-[linear-gradient(135deg,rgb(var(--color-warning-rgb)/0.14),rgb(var(--color-card-rgb)/0.76))] text-[var(--color-warning)]',
  },
};

const OrderDetailsDrawer = ({
  isOpen,
  onClose,
  order,
  isArabic,
  currencies,
  view = 'admin',
  onUpdateStatus = () => {},
  canUpdateStatus = true,
  onSync = () => {},
  onReconcileHago = null,
  isActionLoading = false,
  isSyncing = false,
  isReconcilingHago = false,
}) => {
  const locale = isArabic ? 'ar-EG' : 'en-US';
  const [copyState, setCopyState] = useState('idle');
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [complaintError, setComplaintError] = useState('');
  const isDrawerVisible = Boolean(isOpen && order);
  const isHagoFinancialUnresolved = Boolean(order?.hagoFinancial?.serviceType)
    && ['claimed', 'sent', 'pending', 'unknown'].includes(String(order?.hagoFinancial?.mutationState || '').toLowerCase());
  useNativeBackOverlay(isDrawerVisible, onClose);
  const primaryIdentifierField = order?.primaryIdentifierField || null;
  const rawRequestFields = Array.isArray(order?.requestDetails?.fields) ? order.requestDetails.fields : [];
  const requestFields = rawRequestFields.filter((field) => {
    if (!primaryIdentifierField) return true;

    const hasSameKey = normalizeFieldText(field?.key) === normalizeFieldText(primaryIdentifierField?.key);
    const hasSameLabelAndValue = (
      normalizeFieldText(field?.label) === normalizeFieldText(primaryIdentifierField?.label)
      && normalizeFieldText(field?.value) === normalizeFieldText(primaryIdentifierField?.value)
    );
    const hasSameIdentifierValue = (
      isIdentifierLikeField(field)
      && normalizeFieldText(field?.value)
      && normalizeFieldText(field?.value) === normalizeFieldText(primaryIdentifierField?.value)
    );

    return !hasSameKey && !hasSameLabelAndValue && !hasSameIdentifierValue;
  });
  const customerFeedback = view === 'customer'
    ? getCustomerOrderFeedback(order, isArabic ? 'ar' : 'en')
    : null;
  const customerName = order?.customerName || order?.userName || order?.userRecord?.name || '';
  const customerEmail = order?.customerEmail || order?.userEmail || order?.userRecord?.email || '';
  const customerAvatar = resolveUserAvatar(order?.customerAvatar || order?.userRecord?.avatar, customerName || customerEmail || 'N&A HUB User');
  const customerSiteId = order?.userId || order?.userRecord?.id || order?.userRecord?._id || '';
  const copyToClipboard = async (value) => {
    const text = String(value || '').trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard failures.
    }
  };
  const orderNumber = order?.siteOrderNumber || order?.orderNumber || '';

  useEffect(() => {
    if (copyState === 'idle') return undefined;

    const timer = window.setTimeout(() => {
      setCopyState('idle');
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    if (!isOpen) {
      setCopyState('idle');
      setComplaintOpen(false);
      setComplaintText('');
      setComplaintError('');
    }
  }, [isOpen]);

  useEffect(() => {
    setComplaintOpen(false);
    setComplaintText('');
    setComplaintError('');
  }, [order?.id, order?.siteOrderNumber, order?.orderNumber]);

  const handleCopyOrderNumber = async () => {
    const value = String(orderNumber || '').trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyState('success');
    } catch (_error) {
      setCopyState('error');
    }
  };
  const complaintOptions = isArabic
    ? [
      'لماذا طلبي قيد الانتظار؟',
      'لماذا تم رفض طلبي؟',
      'لم يصلني الطلب حتى الآن.',
      'أريد تعديل بيانات الطلب.',
      'لدي مشكلة أخرى بخصوص هذا الطلب.',
    ]
    : [
      'Why is my order still pending?',
      'Why was my order rejected?',
      'I have not received my order yet.',
      'I want to edit my order details.',
      'I have another issue with this order.',
    ];
  const orderIdentifier = primaryIdentifierField?.value || order?.playerId || order?.customerId || '';
  const handleOpenComplaint = () => {
    setComplaintOpen(true);
    setComplaintError('');
  };
  const handleSelectComplaint = (text) => {
    setComplaintText(text);
    setComplaintError('');
  };
  const handleSendComplaint = () => {
    const issue = String(complaintText || '').trim();
    if (!issue) {
      setComplaintError(isArabic ? 'اكتب مشكلتك أو اختر رسالة جاهزة.' : 'Write your issue or choose a template.');
      return;
    }

    const message = isArabic
      ? [
        'شكوى بخصوص طلب',
        `رقم الطلب: ${orderNumber || '-'}`,
        `المنتج: ${order?.productName || '-'}`,
        `معرف المستخدم داخل الطلب: ${orderIdentifier || '-'}`,
        `حالة الطلب: ${order?.statusLabel || '-'}`,
        `المشكلة: ${issue}`,
      ].join('\n')
      : [
        'Order complaint',
        `Order no.: ${orderNumber || '-'}`,
        `Product: ${order?.productName || '-'}`,
        `Order user ID: ${orderIdentifier || '-'}`,
        `Order status: ${order?.statusLabel || '-'}`,
        `Issue: ${issue}`,
      ].join('\n');

    const href = buildWhatsAppLink({
      number: getAdminWhatsAppNumber(),
      message,
    });

    window.open(href, '_blank', 'noopener,noreferrer');
  };
  const detailItems = [
    {
      key: 'site-order-number',
      label: isArabic ? 'رقم الطلب' : 'Order no.',
      value: order?.siteOrderNumber || order?.orderNumber,
      copyable: true,
      icon: Hash,
    },
    {
      key: 'date',
      label: isArabic ? 'تاريخ الطلب' : 'Order date',
      value: formatOrderDateTime(order?.createdAt, locale),
      icon: CalendarDays,
    },
    {
      key: 'quantity',
      label: isArabic ? 'الكمية' : 'Quantity',
      value: order?.quantity || 1,
      icon: Layers3,
    },
    primaryIdentifierField ? {
      key: 'primary-identifier',
      label: primaryIdentifierField.label,
      value: primaryIdentifierField.value,
      icon: UserRound,
      copyable: view === 'admin',
      copyTone: 'warning',
      onClick: () => copyToClipboard(primaryIdentifierField.value),
    } : null,
    order?.supplierName ? {
      key: 'supplier',
      label: isArabic ? 'المورد' : 'Supplier',
      value: order.supplierName,
      icon: Package,
    } : null,
    view === 'admin' && order?.providerCode ? {
      key: 'provider-code',
      label: isArabic ? 'مزود الخدمة' : 'Service provider',
      value: getProviderDisplayName(order.providerCode, isArabic ? 'ar' : 'en'),
      icon: ClipboardList,
    } : null,
    view === 'admin' && order?.supplierOrderNumber ? {
      key: 'supplier-order-number',
      label: isArabic ? 'رقم طلب المورد' : 'Supplier order no.',
      value: order.supplierOrderNumber,
      icon: Hash,
    } : null,
  ].filter(Boolean);
  const FeedbackIcon = feedbackStyles[customerFeedback?.tone]?.icon || Hourglass;
  useBodyScrollLock(isDrawerVisible);

  const drawer = (
    <AnimatePresence>
      {isOpen && order ? (
        <>
          <motion.button
            type="button"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="order-details-neon__backdrop fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm"
            aria-label={isArabic ? 'إغلاق' : 'Close'}
          />

          <div className="order-details-neon__viewport pointer-events-none fixed inset-0 z-[81] flex h-[100dvh] max-h-[100dvh] items-center justify-end overflow-hidden sm:p-3">
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="order-details-neon pointer-events-auto h-[100dvh] max-h-[100dvh] w-full max-w-[42rem] overflow-hidden border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[radial-gradient(circle_at_top_left,rgb(var(--color-primary-rgb)/0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgb(168_85_247/0.09),transparent_34%),linear-gradient(180deg,rgb(var(--color-surface-rgb)/0.995),rgb(var(--color-bg-rgb)/0.995))] shadow-[0_38px_140px_-44px_rgb(0_0_0/0.78),0_0_50px_-30px_rgb(var(--color-primary-rgb)/0.72)] sm:h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-[2rem]"
            >
              <div className="order-details-neon__shell flex h-full min-h-0 flex-col">
                <div className="order-details-neon__header relative overflow-hidden border-b border-[color:rgb(var(--color-primary-rgb)/0.18)] px-4 pb-5 pt-4 sm:px-5 sm:pt-5">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(121_234_255/0.62),rgb(var(--color-primary-rgb)/0.72),transparent)]" />
                  <div className="order-details-neon__header-row relative flex items-start justify-between gap-3">
                    <div className="order-details-neon__brand" aria-hidden="true">
                      <img src={brandLogo} alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="order-details-neon__kicker inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        <ClipboardList className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                        {isArabic ? 'N&A HUB' : 'N&A HUB'}
                      </p>
                      <h2 className="order-details-neon__title">{isArabic ? 'تفاصيل الطلب' : 'Order details'}</h2>
                      <div className="order-details-neon__meta mt-2.5 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyOrderNumber}
                          className="order-details-neon__number group/order inline-flex max-w-full items-center gap-2 rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.3)] bg-[linear-gradient(135deg,rgb(var(--color-primary-rgb)/0.16),rgb(var(--color-card-rgb)/0.58))] px-3.5 py-2 text-lg font-black text-[var(--color-text)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_18px_38px_-28px_rgb(var(--color-primary-rgb)/0.72)] transition hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.52)] hover:text-[var(--color-primary)]"
                          title={isArabic ? 'نسخ رقم الطلب' : 'Copy order number'}
                        >
                          <span className="text-xs font-bold text-[var(--color-muted)]">#</span>
                          <span className="truncate">{order.siteOrderNumber || order.orderNumber}</span>
                          <Copy className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-hover/order:text-[var(--color-primary)]" />
                        </button>
                        <OrderStatusBadge status={order.status} isArabic={isArabic} className="order-details-neon__status px-3 py-2 text-[10px] shadow-[var(--shadow-subtle)]" />
                        <Badge variant={order.typeVariant} className="order-details-neon__type px-3 py-2 text-[10px]">{order.typeLabel}</Badge>
                      </div>
                      {copyState !== 'idle' ? (
                        <p
                          className={cn(
                            'mt-1 text-[11px] font-medium',
                            copyState === 'success'
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--color-danger)]'
                          )}
                        >
                          {copyState === 'success'
                            ? (isArabic ? 'تم نسخ رقم الطلب' : 'Order number copied')
                            : (isArabic ? 'تعذر نسخ رقم الطلب' : 'Unable to copy order number')}
                        </p>
                      ) : null}
                    </div>

                    <Button variant="ghost" size="icon" onClick={onClose} className="order-details-neon__close h-10 w-10 shrink-0 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[color:rgb(var(--color-card-rgb)/0.64)] shadow-[inset_0_1px_rgb(255_255_255/0.06)] hover:border-[color:rgb(var(--color-primary-rgb)/0.36)]">
                      <X className="h-[1.125rem] w-[1.125rem]" />
                    </Button>
                  </div>
                </div>

                <div className="order-details-neon__content min-h-0 flex-1 overflow-y-auto px-3.5 py-4 sm:px-5 sm:py-5">
                  <div className="order-details-neon__stack space-y-[1.125rem]">
                    <section className="order-details-neon__product relative overflow-hidden rounded-[1.6rem] border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[radial-gradient(circle_at_top_right,rgb(var(--color-primary-rgb)/0.12),transparent_42%),linear-gradient(145deg,rgb(var(--color-card-rgb)/0.94),rgb(var(--color-surface-rgb)/0.62))] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.055),0_28px_72px_-52px_rgb(var(--color-primary-rgb)/0.78)] sm:p-5">
                      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(var(--color-primary-rgb)/0.72),transparent)]" />
                      <div className="order-details-neon__product-row flex items-start gap-4">
                        <div className="order-details-neon__product-image h-20 w-20 shrink-0 overflow-hidden rounded-[1.25rem] border border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-elevated-rgb)/0.62)] shadow-[inset_0_1px_rgb(255_255_255/0.06),0_20px_46px_-28px_rgb(var(--color-primary-rgb)/0.68)] sm:h-24 sm:w-24">
                          {order.productImage ? (
                            <img src={order.productImage} alt={order.productName} decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[var(--color-muted)]">
                              <Package className="h-7 w-7" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="order-details-neon__eyebrow text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                            {isArabic ? 'المنتج' : 'Product'}
                          </p>
                          <h3 className="order-details-neon__product-name mt-1.5 line-clamp-2 text-base font-black leading-6 text-[var(--color-text)] sm:text-lg">{order.productName}</h3>
                          <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            <span dir="ltr" className="order-details-neon__price inline-flex rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.28)] bg-[linear-gradient(135deg,rgb(var(--color-primary-rgb)/0.14),rgb(var(--color-primary-rgb)/0.06))] px-3 py-1.5 text-sm font-black text-[var(--color-primary)] shadow-[inset_0_1px_rgb(255_255_255/0.07)]">
                              {formatOrderMoney(order, currencies, locale)}
                            </span>
                            <Badge variant={order.typeVariant}>{order.typeLabel}</Badge>
                          </div>
                        </div>
                      </div>

                      {view === 'admin' ? (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.68)] bg-[color:rgb(var(--color-elevated-rgb)/0.46)] px-3 py-3">
                          <img
                            src={customerAvatar}
                            alt={customerName}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-full border border-[color:rgb(var(--color-border-rgb)/0.86)] object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[var(--color-text)]">{customerName || (isArabic ? 'عميل غير معروف' : 'Unknown customer')}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-muted)]">
                              <button type="button" onClick={() => copyToClipboard(customerName)} className="max-w-full truncate hover:text-[var(--color-primary)]">
                                {isArabic ? 'اسم الحساب:' : 'Account name:'} {customerName || '-'}
                              </button>
                              <button type="button" onClick={() => copyToClipboard(customerSiteId)} className="max-w-full truncate hover:text-[var(--color-primary)]">
                                {isArabic ? 'المعرف:' : 'ID:'} {customerSiteId || '-'}
                              </button>
                            </div>
                            {customerEmail ? (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(customerEmail)}
                                className="mt-1 block truncate text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                              >
                                {customerEmail}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <section className="order-details-neon__section rounded-[1.6rem] border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.66),rgb(var(--color-surface-rgb)/0.38))] p-3.5 shadow-[inset_0_1px_rgb(255_255_255/0.035),0_20px_52px_-44px_rgb(var(--color-primary-rgb)/0.5)] sm:p-4">
                      <div className="order-details-neon__section-heading mb-3.5 flex items-center justify-between gap-3 px-1">
                        <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-text)]">
                          <span className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,#79eaff,var(--color-primary),#a855f7)]" />
                          {isArabic ? 'تفاصيل التنفيذ' : 'Fulfilment details'}
                        </p>
                        <span className="h-px flex-1 bg-[linear-gradient(90deg,rgb(var(--color-border-rgb)/0.72),transparent)]" />
                      </div>
                      <div className="order-details-neon__detail-grid grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {detailItems.map((item) => (
                          <DetailTile
                            key={item.key}
                            label={item.label}
                            value={item.value}
                            copyable={item.copyable}
                            copyTone={item.copyTone}
                            icon={item.icon}
                            onClick={item.onClick || (item.copyable ? handleCopyOrderNumber : undefined)}
                          />
                        ))}
                      </div>
                    </section>

                    {view === 'customer' ? (
                      <section className="order-details-neon__complaint relative overflow-hidden rounded-[1.6rem] border border-[color:rgb(var(--color-primary-rgb)/0.28)] bg-[radial-gradient(circle_at_top_right,rgb(var(--color-primary-rgb)/0.13),transparent_44%),linear-gradient(145deg,rgb(var(--color-primary-rgb)/0.1),rgb(var(--color-card-rgb)/0.64))] p-4 shadow-[inset_0_1px_rgb(255_255_255/0.045),0_24px_62px_-48px_rgb(var(--color-primary-rgb)/0.8)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <span className="order-details-neon__complaint-icon grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] border border-[color:rgb(var(--color-primary-rgb)/0.28)] bg-[linear-gradient(145deg,rgb(var(--color-primary-rgb)/0.18),rgb(var(--color-primary-rgb)/0.08))] text-[var(--color-primary)] shadow-[0_12px_26px_-18px_rgb(var(--color-primary-rgb)/0.9)]">
                            <MessageCircle className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-[var(--color-text)]">
                              {isArabic ? 'للشكوى اضغط هنا' : 'Need help with this order?'}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                              {isArabic
                                ? 'سنجهز رسالة واتساب فيها رقم الطلب ومعرف المستخدم تلقائيًا.'
                                : 'We will prepare a WhatsApp message with your order number and user ID automatically.'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant={complaintOpen ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={handleOpenComplaint}
                            className="order-details-neon__complaint-open h-10 w-full shrink-0 rounded-xl px-4 text-xs sm:w-auto"
                          >
                            {isArabic ? 'اضغط هنا' : 'Open'}
                          </Button>
                        </div>

                        {complaintOpen ? (
                          <div className="order-details-neon__complaint-form mt-4 space-y-3">
                            <div>
                              <p className="mb-2 text-xs font-bold text-[var(--color-text)]">
                                {isArabic ? 'اختر رسالة جاهزة' : 'Choose a quick message'}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {complaintOptions.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleSelectComplaint(option)}
                                    className={cn(
                                      'order-details-neon__quick-message rounded-full border px-3 py-1.5 text-[11px] font-semibold transition',
                                      complaintText === option
                                        ? 'is-active border-[color:rgb(var(--color-primary-rgb)/0.42)] bg-[color:rgb(var(--color-primary-rgb)/0.16)] text-[var(--color-primary)]'
                                        : 'border-[color:rgb(var(--color-border-rgb)/0.64)] bg-[color:rgb(var(--color-card-rgb)/0.58)] text-[var(--color-text-secondary)] hover:border-[color:rgb(var(--color-primary-rgb)/0.3)] hover:text-[var(--color-text)]'
                                    )}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-xs font-bold text-[var(--color-text)]">
                                {isArabic ? 'اكتب مشكلتك' : 'Write your issue'}
                              </label>
                              <textarea
                                value={complaintText}
                                onChange={(event) => {
                                  setComplaintText(event.target.value);
                                  if (complaintError) setComplaintError('');
                                }}
                                placeholder={isArabic ? 'اكتب تفاصيل المشكلة هنا...' : 'Write the issue details here...'}
                                rows={4}
                                className="order-details-neon__textarea min-h-[6.5rem] w-full resize-none rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-elevated-rgb)/0.54)] px-3 py-2.5 text-sm leading-6 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[color:rgb(var(--color-primary-rgb)/0.42)] focus:bg-[color:rgb(var(--color-card-rgb)/0.72)]"
                              />
                              {complaintError ? (
                                <p className="mt-1.5 text-xs font-semibold text-[var(--color-error)]">{complaintError}</p>
                              ) : null}
                            </div>

                            <div className="rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.58)] bg-[color:rgb(var(--color-bg-rgb)/0.32)] px-3 py-2 text-[11px] leading-5 text-[var(--color-text-secondary)]">
                              {isArabic
                                ? `سيتم إرسال رقم الطلب ${orderNumber || '-'} ومعرف المستخدم ${orderIdentifier || '-'} تلقائيًا.`
                                : `Order no. ${orderNumber || '-'} and user ID ${orderIdentifier || '-'} will be included automatically.`}
                            </div>

                            <Button type="button" onClick={handleSendComplaint} className="order-details-neon__send h-10 w-full rounded-xl text-sm">
                              <Send className="h-4 w-4" />
                              {isArabic ? 'إرسال على واتساب' : 'Send on WhatsApp'}
                            </Button>
                          </div>
                        ) : null}
                      </section>
                    ) : null}

                    {customerFeedback ? (
                      <section
                        className={cn(
                          'order-details-neon__feedback flex items-start gap-3 rounded-[1.35rem] border p-4 shadow-[0_20px_54px_-44px_currentColor]',
                          feedbackStyles[customerFeedback.tone]?.className || feedbackStyles.warning.className
                        )}
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-current/20 bg-current/10">
                          <FeedbackIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-extrabold text-[var(--color-text)]">
                            {customerFeedback.title}
                          </p>
                          <p className="mt-1.5 text-xs leading-6 text-[var(--color-text-secondary)]">
                            {customerFeedback.description}
                          </p>
                        </div>
                      </section>
                    ) : null}

                    {/* ── Rejection Reason (admin view) ──────────────────── */}
                    {view === 'admin' && order.rejectionReason ? (
                      <Card variant="flat" className="border-[color:rgb(var(--color-error-rgb)/0.28)] bg-[color:rgb(var(--color-error-rgb)/0.08)] p-3.5">
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {isArabic ? 'سبب الرفض' : 'Rejection reason'}
                        </p>
                        <p className="mt-1.5 text-sm leading-6 text-[var(--color-text-secondary)]">
                          {order.rejectionReason}
                        </p>
                      </Card>
                    ) : null}

                    {requestFields.length ? (
                      <section className="order-details-neon__section rounded-[1.6rem] border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[linear-gradient(145deg,rgb(var(--color-card-rgb)/0.66),rgb(var(--color-surface-rgb)/0.38))] p-3.5 shadow-[inset_0_1px_rgb(255_255_255/0.035),0_20px_52px_-44px_rgb(var(--color-primary-rgb)/0.5)] sm:p-4">
                        <div className="order-details-neon__section-heading mb-3.5 flex items-center justify-between gap-3 px-1">
                          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-text)]">
                            <span className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,#79eaff,var(--color-primary),#a855f7)]" />
                            {isArabic ? 'معلومات المستخدم' : 'User information'}
                          </p>
                          <span className="h-px flex-1 bg-[linear-gradient(90deg,rgb(var(--color-border-rgb)/0.72),transparent)]" />
                        </div>

                        <div className="order-details-neon__detail-grid grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {requestFields.map((field) => (
                            <DetailTile
                              key={`${order.id}-${field.key}`}
                              label={field.label}
                              value={field.value}
                              valueNode={isImageOrderField(field) ? (
                                <OrderFieldImageButton value={field.value} isArabic={isArabic} />
                              ) : null}
                              hint={field.placeholder}
                              icon={UserRound}
                            />
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {order.notes ? (
                      <Card variant="flat" className="p-3.5">
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {isArabic ? 'ملاحظات' : 'Notes'}
                        </p>
                        <p className="mt-1.5 text-sm leading-6 text-[var(--color-text-secondary)]">{order.notes}</p>
                      </Card>
                    ) : null}

                    {view === 'admin' && !isHagoFinancialUnresolved && order.canSync && canUpdateStatus ? (
                      <Card variant="flat" className="p-3.5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-text)]">
                              {isArabic ? 'مزامنة المورد' : 'Supplier sync'}
                            </p>
                          </div>

                          <Button variant="secondary" className="h-9 rounded-xl px-3 text-xs" onClick={() => onSync(order)} disabled={isSyncing}>
                            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                            <span>{isArabic ? 'مزامنة الآن' : 'Sync now'}</span>
                          </Button>
                        </div>
                      </Card>
                    ) : null}

                    {view === 'admin' && canUpdateStatus ? (
                      <>
                        <ManualReviewActions
                          order={order}
                          isArabic={isArabic}
                          isLoading={isActionLoading}
                          onUpdateStatus={onUpdateStatus}
                          onReconcileHago={onReconcileHago}
                          isReconciling={isReconcilingHago}
                        />
                        <AdminOrderActions
                          order={order}
                          isArabic={isArabic}
                          isLoading={isActionLoading}
                          onUpdateStatus={onUpdateStatus}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return drawer;

  return createPortal(drawer, document.body);
};

export default OrderDetailsDrawer;
