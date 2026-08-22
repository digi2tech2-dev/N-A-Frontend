const STATUS_ALIASES = {
  active: 'approved',
  approved: 'approved',
  complete: 'approved',
  completed: 'approved',
  verification_required: 'verification_required',
  email_verification_required: 'verification_required',
  profile_completion_required: 'profile_completion_required',
  profile_completion: 'profile_completion_required',
  incomplete_profile: 'profile_completion_required',
  verify_email: 'verification_required',
  verification: 'verification_required',
  unverified: 'verification_required',
  pending: 'pending',
  requested: 'pending',
  under_review: 'pending',
  awaiting_approval: 'pending',
  rejected: 'rejected',
  denied: 'rejected',
  blocked: 'rejected',
  inactive: 'rejected',
};

const SIGNUP_METHOD_ALIASES = {
  google: 'google',
  oauth_google: 'google',
  email: 'email',
  password: 'email',
  credentials: 'email',
  manual: 'manual',
};

export const ACCOUNT_PENDING_ROUTE = '/auth/account-pending';
export const ACCOUNT_REJECTED_ROUTE = '/auth/account-rejected';
export const ACCOUNT_VERIFICATION_ROUTE = '/auth/verify-email';

export const normalizeAccountStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  return STATUS_ALIASES[value] || value || '';
};

export const isApprovedAccountStatus = (status) => normalizeAccountStatus(status) === 'approved';
export const isVerificationRequiredStatus = (status) => normalizeAccountStatus(status) === 'verification_required';
export const isProfileCompletionRequiredStatus = (status) => normalizeAccountStatus(status) === 'profile_completion_required';
export const isPendingAccountStatus = (status) => normalizeAccountStatus(status) === 'pending';
export const isRejectedAccountStatus = (status) => normalizeAccountStatus(status) === 'rejected';

export const getAccountAccessRoute = (status) => {
  if (isProfileCompletionRequiredStatus(status)) return '/auth?status=PROFILE_COMPLETION_REQUIRED';
  if (isVerificationRequiredStatus(status)) return ACCOUNT_VERIFICATION_ROUTE;
  if (isPendingAccountStatus(status)) return ACCOUNT_PENDING_ROUTE;
  if (isRejectedAccountStatus(status)) return ACCOUNT_REJECTED_ROUTE;
  return null;
};

export const getAccountStatusBadgeVariant = (status) => {
  const normalized = normalizeAccountStatus(status);
  if (normalized === 'approved') return 'success';
  if (normalized === 'verification_required') return 'info';
  if (normalized === 'rejected') return 'danger';
  return 'warning';
};

export const getAccountStatusLabel = (status, isArabic = true) => {
  const normalized = normalizeAccountStatus(status);
  const labels = {
    approved: { ar: 'مفعّل', en: 'Approved' },
    verification_required: { ar: 'تأكيد البريد مطلوب', en: 'Email Verification Required' },
    pending: { ar: 'بانتظار التفعيل', en: 'Pending Approval' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
  };

  return labels[normalized]?.[isArabic ? 'ar' : 'en'] || status || (isArabic ? 'غير معروف' : 'Unknown');
};

export const normalizeSignupMethod = (method) => {
  const value = String(method || '').trim().toLowerCase();
  return SIGNUP_METHOD_ALIASES[value] || (value || 'email');
};

export const getSignupMethodLabel = (method, isArabic = true) => {
  const normalized = normalizeSignupMethod(method);
  const labels = {
    google: { ar: 'Google', en: 'Google' },
    email: { ar: 'بريد إلكتروني', en: 'Email' },
    manual: { ar: 'يدوي', en: 'Manual' },
  };

  return labels[normalized]?.[isArabic ? 'ar' : 'en'] || method || (isArabic ? 'غير معروف' : 'Unknown');
};

export const getUserRegistrationDate = (user) => (
  user?.createdAt
  || user?.joinDate
  || user?.registeredAt
  || user?.updatedAt
  || null
);

export const inferBlockedStatusFromError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  if (!message) return null;

  if (
    message.includes('verify your email')
    || message.includes('verify your email address')
    || message.includes('please verify your email')
    || message.includes('confirm your email')
    || message.includes('verification email')
  ) {
    return 'verification_required';
  }

  if (message.includes('pending') || message.includes('approval') || message.includes('await')) {
    return 'pending';
  }

  if (
    message.includes('reject')
    || message.includes('denied')
    || message.includes('access denied')
    || message.includes('blocked')
  ) {
    return 'rejected';
  }

  return null;
};
