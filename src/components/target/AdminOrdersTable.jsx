import React from 'react';
import { Eye, ReceiptText } from 'lucide-react';
import Badge from '../ui/Badge';
import { selectClassName } from '../ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { formatDateTime, formatNumber } from '../../utils/intl';
import {
  getTargetOrderStatusLabel,
  getTargetOrderStatusVariant,
  normalizeTargetOrderStatus,
} from '../../utils/targetOrders';
import { isSiteWalletPaymentMethod } from '../../utils/paymentSettings';

const copyText = (value) => {
  const text = String(value || '').trim();
  if (!text || !navigator?.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).catch(() => null);
};

const AdminOrdersTable = ({ requests = [], onStatusChange, onViewDetails, canConfirm = true, showHeader = true }) => (
  <section className="space-y-4">
    {showHeader ? (
      <div>
        <h2 className="text-xl font-black text-[var(--color-text)]">طلبات التارجت</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">راجع إثبات التحويل واقبل أو ارفض طلبات التارجت.</p>
      </div>
    ) : null}

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>التطبيق</TableHead>
          <TableHead>معرّف الحساب</TableHead>
          <TableHead>الكوينز</TableHead>
          <TableHead>الإجمالي</TableHead>
          <TableHead>الدفع</TableHead>
          <TableHead>رقم التحويل</TableHead>
          <TableHead>رقم العملية</TableHead>
          <TableHead>الإثبات</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead>التفاصيل</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => {
          const normalizedStatus = normalizeTargetOrderStatus(request.status);
          const isSiteWallet = isSiteWalletPaymentMethod(request.paymentMethodId || request.paymentMethod || request.paymentMethodName);
          return (
          <TableRow key={request.id}>
            <TableCell>
              <div>
                <p className="font-bold text-[var(--color-text)]">{request.appNameSnapshot || request.productName}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{formatDateTime(request.createdAt, 'en-US')}</p>
                {(request.userId || request.userName || request.userEmail) ? (
                  <div className="mt-1.5 max-w-52 text-[10px] text-[var(--color-text-secondary)]">
                    {request.userId ? (
                      <button
                        type="button"
                        onClick={() => copyText(request.userId)}
                        className="inline-flex max-w-full items-center gap-1 rounded-md border border-[color:rgb(var(--color-primary-rgb)/0.2)] px-1.5 py-0.5 font-bold text-[var(--color-primary)]"
                        title="نسخ ID الحساب"
                      >
                        <span className="truncate">ID: {request.userId}</span>
                      </button>
                    ) : null}
                    {request.userName ? <p className="mt-1 truncate font-bold text-[var(--color-text)]">{request.userName}</p> : null}
                    {request.userEmail ? <p className="truncate">{request.userEmail}</p> : null}
                  </div>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <p className="font-semibold text-[var(--color-text)]">{request.senderId || request.transferFromId}</p>
            </TableCell>
            <TableCell>{formatNumber(request.coinAmount || request.quantity, 'en-US')}</TableCell>
            <TableCell className="font-bold text-[var(--color-primary)]">
              {formatNumber(request.totalPrice, 'en-US', { maximumFractionDigits: 2 })} EGP
            </TableCell>
            <TableCell>{request.paymentMethod || request.paymentMethodName}</TableCell>
            <TableCell>
              <button
                type="button"
                onClick={() => copyText(request.transferNumber || request.paymentAccount)}
                className="max-w-40 truncate rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.2)] px-2 py-1 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
                title="نسخ"
              >
                {isSiteWallet ? 'محفظة الموقع' : (request.transferNumber || request.paymentAccount || '-')}
              </button>
            </TableCell>
            <TableCell>
              <button
                type="button"
                onClick={() => copyText(request.transactionNumber || request.transactionId || request.paymentReference)}
                className="max-w-40 truncate rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.2)] px-2 py-1 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
                title="نسخ"
              >
                {request.transactionNumber || request.transactionId || request.paymentReference || '-'}
              </button>
            </TableCell>
            <TableCell>
              {request.screenshotProof || request.proofImage ? (
                <a
                  href={request.screenshotProof || request.proofImage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.28)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  عرض
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <ReceiptText className="h-4 w-4" />
                  غير مرفق
                </span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex min-w-36 items-center gap-2">
                <Badge variant={getTargetOrderStatusVariant(normalizedStatus)}>{getTargetOrderStatusLabel(normalizedStatus)}</Badge>
                <select
                  value={normalizedStatus}
                  onChange={(event) => onStatusChange(request.id, event.target.value)}
                  className={cnStatusSelect}
                  disabled={!canConfirm}
                >
                  <option value="PENDING">قيد الانتظار</option>
                  <option value="APPROVED">قبول</option>
                  <option value="REJECTED">رفض</option>
                </select>
              </div>
              {normalizedStatus === 'REJECTED' && (request.rejectionReason || request.adminNotes) ? (
                <p className="mt-2 max-w-48 text-xs text-[var(--color-error)]">{request.rejectionReason || request.adminNotes}</p>
              ) : null}
            </TableCell>
            <TableCell>
              <button
                type="button"
                onClick={() => onViewDetails?.(request)}
                className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.28)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.08)]"
              >
                <ReceiptText className="h-3.5 w-3.5" />
                تفاصيل
              </button>
            </TableCell>
          </TableRow>
          );
        })}

        {!requests.length && (
          <TableRow>
            <TableCell colSpan={10} className="py-10 text-center text-[var(--color-text-secondary)]">
              لا توجد طلبات تارجت حتى الآن.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </section>
);

const cnStatusSelect = `${selectClassName} h-9 min-w-28 rounded-xl px-3 py-1.5 text-xs`;

export default AdminOrdersTable;
