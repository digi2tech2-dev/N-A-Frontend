import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from './Button';

const styleByVariant = {
  topbar: 'bg-[color:rgb(var(--color-card-rgb)/0.9)] text-[var(--color-text)]',
  sidebar: 'bg-[color:rgb(var(--color-elevated-rgb)/0.92)] text-[var(--color-text)]',
  glass: 'bg-[color:rgb(var(--color-card-rgb)/0.72)] text-[var(--color-text)]'
};

const LanguageSwitcher = ({ variant = 'topbar', className, showIcon = false }) => {
  const { i18n, t } = useTranslation();
  const isArabic = String(i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('ar');

  const handleToggleLanguage = () => {
    const next = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggleLanguage}
      aria-label={t('header.language')}
      title={t('header.language')}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[color:rgb(var(--color-border-rgb)/0.9)] px-3 py-2 text-xs font-semibold tracking-[0.08em] transition-all duration-200 hover:border-[color:rgb(var(--color-primary-rgb)/0.3)] hover:text-[var(--color-primary)]',
        styleByVariant[variant] || styleByVariant.topbar,
        className
      )}
    >
      {showIcon && <Globe className="h-3.5 w-3.5 shrink-0 opacity-75" />}
      <span className={isArabic ? 'opacity-100' : 'opacity-65'}>AR</span>
      <span className="opacity-45">|</span>
      <span className={!isArabic ? 'opacity-100' : 'opacity-65'}>EN</span>
    </button>
  );
};

export default LanguageSwitcher;
