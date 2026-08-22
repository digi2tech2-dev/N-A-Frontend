import React from 'react';
import { CheckCircle2, Copy, ReceiptText, Target, XCircle } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button, { cn } from '../ui/Button';
import EmptyState from './EmptyState';

const isPendingTarget = (status) => String(status || '').trim().toLowerCase() === 'pending';
const isRejectedTarget = (status) => String(status || '').trim().toLowerCase() === 'rejected';

const copyText = (value) => {
  const text = String(value || '').trim();
  if (!text || !navigator?.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).catch(() => null);
};

const getStatusVariant = (status) => {
  if (isRejectedTarget(status)) return 'danger';
  if (String(status || '').trim().toLowerCase() === 'done') return 'success';
  return 'warning';
};

const getStatusLabel = (status, isArabic) => {
  if (!isArabic) return status || 'Pending';
  if (isRejectedTarget(status)) return 'مرفوض';
  if (String(status || '').trim().toLowerCase() === 'done') return 'تم';
  return 'معلّق';
};

const TargetRequestsReviewSection = ({
  requests,
  pendingCount,
  isArabic,
  formatDate,
  formatMoney,
  onApproveRequest,
  onRejectRequest,
  approvingRequestId = '',
}) => {
  const canReviewRequests = Boolean(onApproveRequest && onRejectRequest);

  return (
    <Card variant="elevated" className="mx-auto flex max-h-[26rem] w-[calc(100vw-1.5rem)] max-w-[24rem] flex-col overflow-hidden p-3 sm:w-full sm:max-w-[42rem] sm:p-4 xl:max-w-none">
      <div className={cn(
        'mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between',
        isArabic ? 'items-end text-right sm:flex-row-reverse' : 'items-start text-left'
      )}>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--color-text)] sm:text-lg">
            {isArabic ? 'طلبات التارجت' : 'Target Requests'}
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)] sm:text-xs">
            {isArabic
              ? 'مراجعة إيصالات طلبات التارجت وتأكيد الطلب مباشرة من لوحة الأدمن.'
              : 'Review target request receipts and approve them directly from the admin dashboard.'}
          </p>
        </div>
        <Badge variant={pendingCount > 0 ? 'warning' : 'premium'} className="shrink-0 px-2 py-0.5 text-[10px]">
          {isArabic ? `${pendingCount} معلّق` : `${pendingCount} pending`}
        </Badge>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={Target}
          title={isArabic ? 'لا توجد طلبات تارجت' : 'No target requests yet'}
          description={isArabic
            ? 'ستظهر هنا طلبات التارجت فور إرسالها من المستخدمين.'
            : 'Target requests will appear here as soon as users submit them.'}
        />
      ) : (
        <div className="flex-1 overflow-y-auto pe-1">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {requests.map((request) => {
              const isPending = isPendingTarget(request.status);
              const isRejected = isRejectedTarget(request.status);
              const isApproving = String(approvingRequestId) === String(request.id);
              const requesterId = request.userId || request.customerId || '';
              const requesterName = request.userName || request.customerName || '';
              const requesterEmail = request.userEmail || request.customerEmail || '';

              return (
                <article
                  key={request.id}
                  className={cn(
                    'rounded-[1rem] border p-2.5 sm:p-3',
                    isPending
                      ? 'border-[color:rgb(var(--color-warning-rgb)/0.36)] bg-[color:rgb(var(--color-warning-rgb)/0.08)]'
                      : 'border-[color:rgb(var(--color-border-rgb)/0.85)] bg-[color:rgb(var(--color-card-rgb)/0.78)]'
                  )}
                >
                  <div className={cn('flex items-start justify-between gap-2', isArabic && 'flex-row-reverse text-right')}>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--color-text)]">
                        {request.productName || (isArabic ? 'تطبيق غير محدد' : 'Unknown app')}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted)]">
                        {formatDate(request.createdAt)}
                      </p>
                      {(requesterId || requesterName || requesterEmail) ? (
                        <div className="mt-2 min-w-0 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.62)] bg-[color:rgb(var(--color-surface-rgb)/0.42)] p-2">
                          {requesterId ? (
                            <button
                              type="button"
                              onClick={() => copyText(requesterId)}
                              className="inline-flex max-w-full items-center gap-1 rounded-md border border-[color:rgb(var(--color-primary-rgb)/0.2)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-primary)]"
                              title={isArabic ? 'نسخ ID الحساب' : 'Copy account ID'}
                            >
                              <Copy className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">ID: {requesterId}</span>
                            </button>
                          ) : null}
                          {requesterName ? (
                            <p className="mt-1 truncate text-[11px] font-bold text-[var(--color-text)]">{requesterName}</p>
                          ) : null}
                          {requesterEmail ? (
                            <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted)]">{requesterEmail}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <Badge variant={getStatusVariant(request.status)} className="px-2 py-0.5 text-[10px]">
                      {getStatusLabel(request.status, isArabic)}
                    </Badge>
                  </div>

                  <div className={cn('mt-2.5 rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.65)] bg-black/10 p-2.5 text-[11px]', isArabic && 'text-right')}>
                    <div className="mb-2 flex items-center gap-1.5 text-[var(--color-primary)]">
                      <ReceiptText className="h-3.5 w-3.5" />
                      <span className="font-bold">{isArabic ? 'إيصال الطلب' : 'Request receipt'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="min-w-0">
                        <p className="text-[var(--color-muted)]">{isArabic ? 'المعرف' : 'Identifier'}</p>
                        <p className="mt-0.5 truncate font-medium text-[var(--color-text)]">{request.transferFromId || '-'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--color-muted)]">{isArabic ? 'الكمية' : 'Quantity'}</p>
                        <p className="mt-0.5 truncate font-medium text-[var(--color-text)]">{request.quantity || 0}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--color-muted)]">{isArabic ? 'الإجمالي' : 'Total'}</p>
                        <p className="mt-0.5 truncate font-medium text-[var(--color-primary)]">
                          {formatMoney(request.totalPrice || 0, 'EGP')}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--color-muted)]">{isArabic ? 'الدفع' : 'Payment'}</p>
                        <p className="mt-0.5 truncate font-medium text-[var(--color-text)]">{request.paymentMethodName || '-'}</p>
                      </div>
                      <div className="min-w-0 col-span-2">
                        <p className="text-[var(--color-muted)]">{isArabic ? 'حساب التحويل' : 'Payment account'}</p>
                        <button
                          type="button"
                          onClick={() => copyText(request.paymentAccount)}
                          className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.2)] px-2 py-1 font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
                          title={isArabic ? 'اضغط للنسخ' : 'Click to copy'}
                        >
                          <Copy className="h-3 w-3 shrink-0" />
                          <span className="truncate">{request.paymentAccount || '-'}</span>
                        </button>
                      </div>
                    </div>
                    {isRejected && request.rejectionReason ? (
                      <div className="mt-2 rounded-lg border border-[color:rgb(var(--color-error-rgb)/0.24)] bg-[color:rgb(var(--color-error-rgb)/0.08)] p-2 text-[var(--color-error)]">
                        <p className="font-bold">{isArabic ? 'سبب الرفض' : 'Rejection reason'}</p>
                        <p className="mt-1 leading-5">{request.rejectionReason}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className={cn('mt-2 flex items-center gap-2', isArabic && 'flex-row-reverse')}>
                    {request.proofImage ? (
                      <a
                        href={request.proofImage}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 items-center justify-center rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.28)] px-2.5 text-[10px] font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
                      >
                        {isArabic ? 'عرض الإيصال' : 'View proof'}
                      </a>
                    ) : (
                      <span className="text-[10px] text-[var(--color-muted)]">{isArabic ? 'لا توجد صورة' : 'No image'}</span>
                    )}

                    {isPending && canReviewRequests ? (
                      <div className={cn('ms-auto flex gap-1.5', isArabic && 'me-auto ms-0')}>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          className="h-7 rounded-lg px-2.5 text-[10px]"
                          onClick={() => onRejectRequest(request)}
                          disabled={isApproving}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {isArabic ? 'رفض' : 'Reject'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 rounded-lg px-2.5 text-[10px]"
                          onClick={() => onApproveRequest(request)}
                          disabled={isApproving}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isApproving
                            ? (isArabic ? 'جارٍ التأكيد...' : 'Approving...')
                            : (isArabic ? 'تأكيد الطلب' : 'Approve')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TargetRequestsReviewSection;
