import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import useWebsiteUpdate from '../../hooks/useWebsiteUpdate';

const WebsiteUpdateModal = () => {
  const {
    availableUpdate,
    isRefreshing,
    dismiss,
    refresh,
  } = useWebsiteUpdate();

  const isForced = availableUpdate?.forceUpdate === true;

  return (
    <Modal
      isOpen={Boolean(availableUpdate)}
      onClose={dismiss}
      dismissible={!isForced}
      title={(
        <span className="flex items-center gap-2" dir="rtl">
          <RefreshCw className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          يتوفر تحديث جديد
        </span>
      )}
      size="xs"
      className="z-[320]"
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row" dir="rtl">
          {!isForced && (
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:flex-1"
              onClick={dismiss}
              disabled={isRefreshing}
            >
              لاحقًا
            </Button>
          )}
          <Button
            type="button"
            className="w-full sm:flex-1"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4${isRefreshing ? ' animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRefreshing ? 'جارٍ التحديث...' : 'تحديث الآن'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4 text-right" dir="rtl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] shadow-[var(--shadow-subtle)]">
          <Sparkles className="h-8 w-8 text-[var(--color-primary)]" aria-hidden="true" />
        </div>

        <div className="space-y-2 text-center">
          <p className="text-base font-semibold text-[var(--color-text)]">
            تم إصدار نسخة جديدة من التطبيق
          </p>
          {availableUpdate?.message && (
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              {availableUpdate.message}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default WebsiteUpdateModal;
