import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { useBodyScrollLock } from '../../utils/bodyScrollLock';

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading = false,
  children
}) => {
  useBodyScrollLock(open);

  const dialog = (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/68 px-4 backdrop-blur-[8px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-[23rem] overflow-hidden rounded-[1.25rem] border border-[color:rgb(var(--color-warning-rgb)/0.2)] bg-[color:rgb(var(--color-card-rgb)/0.98)] shadow-[0_26px_70px_-36px_rgb(0_0_0/0.76)]"
          >
            <div className="h-1 bg-[linear-gradient(90deg,rgb(var(--color-warning-rgb)/0.95),rgb(var(--color-primary-rgb)/0.58))]" />
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:rgb(var(--color-warning-rgb)/0.22)] bg-[color:rgb(var(--color-warning-rgb)/0.12)] text-[var(--color-warning)] shadow-[0_12px_28px_-20px_rgb(var(--color-warning-rgb)/0.8)]">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">تنبيه</p>
                  <h3 className="mt-1 text-sm font-black text-[var(--color-text)]">{title}</h3>
                  {description ? <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-secondary)]">{description}</p> : null}
                </div>
              </div>

              {children ? <div className="mb-3">{children}</div> : null}

              <div className="flex flex-row justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading} className="h-8 min-w-20 rounded-lg px-3 text-xs">
                  {cancelLabel}
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={onConfirm} disabled={isLoading} className="h-8 min-w-20 rounded-lg px-3 text-xs">
                  {isLoading ? '...' : confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return dialog;

  return createPortal(dialog, document.body);
};

export default ConfirmDialog;
