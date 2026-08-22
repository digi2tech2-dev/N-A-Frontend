import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button, { cn } from './Button';
import { useBodyScrollLock } from '../../utils/bodyScrollLock';

const sizeClassNames = {
  xxs: 'max-w-[20rem]',
  xs: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', className: modalClassName, placement = 'center' }) => {
  const backdropZ = modalClassName || 'z-[220]';
  const isCentered = placement === 'center';
  useBodyScrollLock(isOpen);

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn('fixed inset-0 bg-black/70 backdrop-blur-sm', backdropZ)}
          />
          <div className={cn(
            'pointer-events-none fixed inset-0 flex justify-center p-3 sm:p-4',
            isCentered ? 'items-center' : 'items-end sm:items-center',
            backdropZ
          )}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={cn(
                'premium-card-premium pointer-events-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[1.6rem] sm:max-h-[90vh] sm:rounded-[var(--radius-2xl)]',
                sizeClassNames[size] || sizeClassNames.md
              )}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[color:rgb(var(--color-border-rgb)/0.9)] px-4 py-4 sm:p-6">
                <h3 className="min-w-0 text-base font-semibold text-[var(--color-text)] sm:text-lg">
                  {title}
                </h3>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="overflow-y-auto px-4 py-4 sm:p-6">
                {children}
              </div>

              {footer && (
                <div className="border-t border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-elevated-rgb)/0.72)] px-4 py-4 sm:rounded-b-[var(--radius-2xl)] sm:p-6">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return modal;

  return createPortal(modal, document.body);
};

export default Modal;
