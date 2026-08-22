import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

/**
 * ManualReviewActions
 *
 * Renders exclusively for orders in MANUAL_REVIEW status.
 * Presents two resolution paths to the admin:
 *   A) Force Complete  — provider actually fulfilled; mark COMPLETED
 *   B) Fail & Refund   — provider failed; refund the customer's wallet
 *
 * Props:
 *   order          – enriched order object
 *   isArabic       – RTL flag
 *   isLoading      – whether an action is in flight
 *   onUpdateStatus – (order, nextStatus) → void
 */
const ManualReviewActions = ({ order, isArabic, isLoading, onUpdateStatus }) => {
  const isManualReview = String(order?.status || '').toLowerCase() === 'manual_review';
  if (!isManualReview) return null;

  return (
    <Card
      variant="flat"
      className="border-[color:rgb(var(--color-error-rgb)/0.35)] bg-[color:rgb(var(--color-error-rgb)/0.07)] p-3.5"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:rgb(var(--color-error-rgb)/0.15)]">
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-error)]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {isArabic ? 'إجراء يدوي مطلوب' : 'Manual action required'}
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-[var(--color-text-secondary)]">
              {isArabic
                ? 'هذا الطلب تجاوز الحد الأقصى لمحاولات الاستعلام ولم يستجب المزود. يرجى حل الطلب يدويًا.'
                : 'This order exceeded its maximum polling retries without provider response. Resolve it manually.'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[color:rgb(var(--color-border-rgb)/0.6)]" />

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* Button A: Force Complete */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onUpdateStatus(order, 'COMPLETED')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[color:rgb(34_197_94/0.4)] bg-[color:rgb(34_197_94/0.12)] px-3.5 py-2.5 text-sm font-semibold text-[color:rgb(22_163_74)] transition-all hover:bg-[color:rgb(34_197_94/0.22)] hover:border-[color:rgb(34_197_94/0.6)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{isArabic ? 'إكمال يدوي' : 'Force complete'}</span>
          </button>

          {/* Button B: Fail & Refund */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onUpdateStatus(order, 'FAILED')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[color:rgb(239_68_68/0.4)] bg-[color:rgb(239_68_68/0.1)] px-3.5 py-2.5 text-sm font-semibold text-[color:rgb(220_38_38)] transition-all hover:bg-[color:rgb(239_68_68/0.2)] hover:border-[color:rgb(239_68_68/0.55)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{isArabic ? 'رفض وإرجاع الرصيد' : 'Fail & refund'}</span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ManualReviewActions;
