import React from 'react';
import { Activity } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../ui/Button';
import EmptyState from './EmptyState';
import StatusBadge from './StatusBadge';

const toneStyles = {
  success: 'border-[color:rgb(var(--color-success-rgb)/0.24)] bg-[color:rgb(var(--color-success-rgb)/0.12)] text-[var(--color-success)]',
  warning: 'border-[color:rgb(var(--color-warning-rgb)/0.24)] bg-[color:rgb(var(--color-warning-rgb)/0.12)] text-[var(--color-warning)]',
  info: 'border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] text-[var(--color-primary)]',
};

const ActivityFeedSection = ({ items, isArabic, formatDate }) => {
  return (
    <Card variant="elevated" className="mx-auto w-[calc(100vw-1.5rem)] max-w-[24rem] p-4 sm:w-full sm:max-w-[42rem] sm:p-6 xl:max-w-none">
      <div className={cn('mb-4', isArabic ? 'text-right' : 'text-left')}>
        <h2 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">
          {isArabic ? 'ملخص النشاط' : 'Activity Summary'}
        </h2>
        <p className="mt-1.5 text-xs leading-6 text-[var(--color-text-secondary)] sm:text-sm">
          {isArabic
            ? 'لقطات سريعة لآخر ما حدث داخل النظام لتسهيل المتابعة اليومية.'
            : 'Quick snapshots of the latest activity across the system for daily follow-up.'}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={isArabic ? 'لا يوجد نشاط حديث' : 'No recent activity'}
          description={isArabic
            ? 'سيظهر هنا آخر النشاطات فور توفر بيانات تشغيلية جديدة.'
            : 'Recent operational updates will appear here as soon as new data becomes available.'}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const toneClassName = toneStyles[item.tone] || toneStyles.info;

            return (
              <div
                key={item.id}
                className="rounded-[var(--radius-xl)] border border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-card-rgb)/0.78)] p-3.5 sm:p-4"
              >
                <div className={cn('flex items-start gap-3', isArabic && 'flex-row-reverse text-right')}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${toneClassName}`}>
                    <item.icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={cn('flex flex-wrap items-center gap-2', isArabic && 'flex-row-reverse justify-start')}>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{item.title}</p>
                      {item.status && (
                        <StatusBadge status={item.status} isArabic={isArabic} className="px-2 py-0.5 text-[10px]" />
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-6 text-[var(--color-text-secondary)] sm:text-sm">
                      {item.description}
                    </p>
                    {item.timestamp && (
                      <p className="mt-2 text-xs text-[var(--color-muted)]">{formatDate(item.timestamp)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ActivityFeedSection;
