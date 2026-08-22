import React from 'react';
import Badge from '../ui/Badge';

const STATUS_META = {
  pending: {
    variant: 'warning',
    label: { ar: 'قيد الانتظار', en: 'Pending' },
  },
  processing: {
    variant: 'info',
    label: { ar: 'قيد المعالجة', en: 'Processing' },
  },
  approved: {
    variant: 'success',
    label: { ar: 'مقبول', en: 'Approved' },
  },
  completed: {
    variant: 'success',
    label: { ar: 'مكتمل', en: 'Completed' },
  },
  rejected: {
    variant: 'danger',
    label: { ar: 'مرفوض', en: 'Rejected' },
  },
  cancelled: {
    variant: 'danger',
    label: { ar: 'ملغي', en: 'Cancelled' },
  },
};

const STATUS_ALIASES = {
  requested: 'pending',
  pending: 'pending',
  under_review: 'processing',
  processing: 'processing',
  approved: 'approved',
  completed: 'completed',
  success: 'completed',
  rejected: 'rejected',
  denied: 'rejected',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

const normalizeStatus = (status) => {
  const raw = String(status || '').trim().toLowerCase();
  return STATUS_ALIASES[raw] || raw || 'pending';
};

const humanizeStatus = (status) => {
  const text = String(status || '').trim();
  if (!text) return '';
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const StatusBadge = ({ status, isArabic, className }) => {
  const normalizedStatus = normalizeStatus(status);
  const meta = STATUS_META[normalizedStatus] || STATUS_META.pending;

  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label[isArabic ? 'ar' : 'en'] || humanizeStatus(status)}
    </Badge>
  );
};

export default StatusBadge;
