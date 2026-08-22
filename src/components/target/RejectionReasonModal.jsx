import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { textareaClassName } from '../ui/Input';

const RejectionReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'رفض الطلب',
  description = 'اكتب سبب رفض الطلب بوضوح حتى يظهر في تفاصيل الطلب.',
  confirmLabel = 'تأكيد الرفض',
  cancelLabel = 'إلغاء',
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(reason.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xxs"
      placement="center"
      className="z-[260]"
      footer={(
        <div className="flex flex-row justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" size="sm" variant="danger" className="h-8 rounded-lg px-3 text-xs" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      <div className="space-y-2.5 text-right">
        <div className="rounded-xl border border-[color:rgb(var(--color-warning-rgb)/0.28)] bg-[color:rgb(var(--color-warning-rgb)/0.1)] p-2.5">
          <div className="flex flex-row-reverse items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:rgb(var(--color-warning-rgb)/0.14)] text-[var(--color-warning)]">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black text-[var(--color-text)]">اكتب سبب رفض الطلب</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-secondary)]">{description}</p>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]">سبب الرفض</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={`${textareaClassName} min-h-20 rounded-xl text-xs sm:min-h-20`}
            placeholder="مثال: صورة التحويل غير واضحة أو رقم الحساب غير مطابق"
            autoFocus
          />
        </label>
      </div>
    </Modal>
  );
};

export default RejectionReasonModal;
