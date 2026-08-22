import React from 'react';
import { Phone } from 'lucide-react';

const ENGINEERS_WHATSAPP_URL = `https://wa.me/201019603238?text=${encodeURIComponent('كنت محتاج تفاصيل عن انشاء موقع')}`;

const SiteCopyrightFooter = ({ isArabic, showEngineerContact = true }) => (
  <footer className="mx-auto w-full max-w-[var(--shell-max-width)] px-3 pb-6 sm:px-4 md:px-6 lg:px-8">
    <div className="relative overflow-hidden rounded-[1.45rem] border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[linear-gradient(135deg,rgb(var(--color-card-rgb)/0.82),rgb(var(--color-elevated-rgb)/0.58))] px-4 py-4 text-center shadow-[var(--shadow-subtle)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-10 -top-20 h-28 rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.16)] blur-3xl" />
      <div className="relative space-y-2">
        <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-[var(--color-text-secondary)] sm:flex-row sm:flex-wrap sm:gap-2 sm:text-sm">
          <span className="font-semibold text-[var(--color-text)]">
            {isArabic ? 'حقوق الملكية محفوظة بعناية' : 'Copyright protected'}
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.62)] sm:inline-flex" />
          <span>© 2026 N&amp;A HUB</span>
          <span className="hidden h-1 w-1 rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.62)] sm:inline-flex" />
          <span>
            {isArabic
              ? 'صُنعت الهوية والتجربة لتبقى خاصة بالعلامة.'
              : 'Brand identity and experience are reserved for this store.'}
          </span>
        </div>

        {showEngineerContact ? (
          <a
            href={ENGINEERS_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mx-auto inline-flex items-center justify-center gap-1 text-[0.65rem] font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
          >
            <Phone className="h-3 w-3" />
            <span>{isArabic ? 'تواصل مع مهندسين البرنامج' : 'Contact software engineers'}</span>
          </a>
        ) : null}
      </div>
    </div>
  </footer>
);

export default SiteCopyrightFooter;
