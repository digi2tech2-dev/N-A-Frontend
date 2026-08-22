export const normalizeTargetOrderStatus = (status) => {
  const value = String(status || '').trim().toUpperCase();
  if (value === 'DONE' || value === 'APPROVED' || value === 'COMPLETED') return 'APPROVED';
  if (value === 'REJECTED' || value === 'DENIED' || value === 'FAILED') return 'REJECTED';
  return 'PENDING';
};

export const getTargetOrderStatusLabel = (status) => {
  const value = normalizeTargetOrderStatus(status);
  if (value === 'APPROVED') return 'مقبول';
  if (value === 'REJECTED') return 'مرفوض';
  return 'قيد الانتظار';
};

export const getTargetOrderStatusVariant = (status) => {
  const value = normalizeTargetOrderStatus(status);
  if (value === 'APPROVED') return 'success';
  if (value === 'REJECTED') return 'danger';
  return 'warning';
};

export const getTargetOrderStatusAccentClass = (status) => {
  const value = normalizeTargetOrderStatus(status);
  if (value === 'APPROVED') return 'border-[color:rgb(var(--color-success-rgb)/0.24)] bg-[color:rgb(var(--color-success-rgb)/0.08)] text-[var(--color-success)]';
  if (value === 'REJECTED') return 'border-[color:rgb(var(--color-error-rgb)/0.24)] bg-[color:rgb(var(--color-error-rgb)/0.08)] text-[var(--color-error)]';
  return 'border-[color:rgb(var(--color-warning-rgb)/0.24)] bg-[color:rgb(var(--color-warning-rgb)/0.08)] text-[var(--color-warning)]';
};
