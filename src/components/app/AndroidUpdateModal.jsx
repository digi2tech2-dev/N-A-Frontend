import React from 'react';
import { Download, ShieldAlert, Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import useAndroidUpdate from '../../hooks/useAndroidUpdate';
import styles from './AndroidUpdateModal.module.css';

const AndroidUpdateModal = () => {
  const { availableUpdate, dismiss, isOpening, openUpdate } = useAndroidUpdate();
  const isForced = availableUpdate?.forceUpdate === true;
  const message = availableUpdate?.message || 'يتوفر إصدار أحدث من تطبيق N&A HUB لتحسين تجربتك.';

  return (
    <Modal
      isOpen={Boolean(availableUpdate)}
      onClose={dismiss}
      dismissible={!isForced}
      title={(
        <span className="flex items-center gap-2" dir="rtl">
          {isForced ? <ShieldAlert className="h-5 w-5 text-[var(--color-warning)]" /> : <Download className="h-5 w-5 text-[var(--color-primary)]" />}
          يتوفر تحديث جديد
        </span>
      )}
      size="xs"
      className={`${styles.modalLayer} z-[340]`}
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row" dir="rtl">
          {!isForced ? (
            <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={dismiss} disabled={isOpening}>
              لاحقًا
            </Button>
          ) : null}
          <Button type="button" className="w-full sm:flex-1" onClick={openUpdate} disabled={isOpening}>
            <Download className={`h-4 w-4${isOpening ? ' animate-bounce' : ''}`} aria-hidden="true" />
            {isOpening ? 'جارٍ فتح التحميل...' : 'تحديث الآن'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4 text-right" dir="rtl">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border shadow-[var(--shadow-subtle)] ${isForced ? 'border-[color:rgb(var(--color-warning-rgb)/0.28)] bg-[color:rgb(var(--color-warning-rgb)/0.1)]' : 'border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.1)]'}`}>
          <Sparkles className={`h-8 w-8 ${isForced ? 'text-[var(--color-warning)]' : 'text-[var(--color-primary)]'}`} aria-hidden="true" />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-base font-semibold text-[var(--color-text)]">{message}</p>
          {availableUpdate?.latestVersionName ? (
            <p className="text-sm text-[var(--color-text-secondary)]">الإصدار {availableUpdate.latestVersionName}</p>
          ) : null}
          {isForced ? (
            <p className="text-xs leading-5 text-[var(--color-warning)]">يلزم تثبيت هذا التحديث للمتابعة.</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

export default AndroidUpdateModal;
