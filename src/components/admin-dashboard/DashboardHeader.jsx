import React from 'react';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { cn } from '../ui/Button';

const DashboardHeader = ({ isArabic, userName, currentDateLabel }) => {
  return (
    <section className="admin-dashboard-header relative mx-auto w-[calc(100vw-1.5rem)] max-w-[42rem] overflow-hidden rounded-[1.5rem] border border-[color:rgb(var(--color-primary-rgb)/0.2)] p-4 sm:w-full sm:p-6 lg:max-w-none lg:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(var(--color-primary-rgb)/0.72),transparent)]" />
      <div className="relative flex flex-col items-center gap-4 text-center sm:gap-5 lg:flex-row lg:items-end lg:justify-between lg:text-start">
        <div className="space-y-2.5 sm:space-y-4">
          <span className={cn('section-kicker justify-center text-[10px] sm:text-xs lg:justify-start', isArabic && 'lg:justify-end')}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {isArabic ? 'لوحة القيادة الإدارية' : 'Admin control center'}
          </span>

          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl font-black text-[var(--color-text)] sm:text-4xl">
              {isArabic ? 'لوحة تحكم الإدارة' : 'Admin Dashboard'}
            </h1>
            <p className="mx-auto max-w-2xl text-[11px] leading-5 text-[var(--color-text-secondary)] sm:text-base sm:leading-6 lg:mx-0">
              {isArabic
                ? 'نظرة عامة سريعة على أداء المتجر، آخر الطلبات، الشحن اليدوي، والإجراءات الأساسية التي يحتاجها الأدمن يوميًا.'
                : 'A fast overview of store performance, recent orders, manual topups, and the actions admins use most often.'}
            </p>
          </div>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:gap-3 lg:max-w-md">
          <div className="admin-dashboard-info-tile rounded-[1rem] px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] sm:text-xs sm:tracking-[0.14em]">
              {isArabic ? 'مرحبًا بعودتك' : 'Welcome back'}
            </p>
            <p className="mt-2 text-sm font-bold leading-5 text-[var(--color-text)] sm:mt-3 sm:text-lg">
              {userName || (isArabic ? 'مشرف النظام' : 'Administrator')}
            </p>
          </div>

          <div className="admin-dashboard-info-tile rounded-[1rem] px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-center gap-1.5 text-[var(--color-primary)] sm:gap-2">
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] sm:text-xs sm:tracking-[0.14em]">
                {isArabic ? 'تاريخ اليوم' : 'Today'}
              </p>
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-[var(--color-text)] sm:mt-3 sm:text-base">
              {currentDateLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardHeader;
