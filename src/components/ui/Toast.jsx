import React, { createContext, useContext, useState } from 'react';
import { X, CheckCircle2, CircleX, AlertTriangle, Info } from 'lucide-react';
import { cn } from './Button';
import { useLanguage } from '../../context/LanguageContext';
import { getToastMessage } from '../../utils/errorMessages';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const { language } = useLanguage();

  const addToast = (message, type = 'info', options = {}) => {
    const id = Date.now();
    const readableMessage = getToastMessage(message, type, { ...options, language });
    setToasts((prev) => [...prev, { id, message: readableMessage, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[260] flex w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 flex-col items-center gap-2.5 sm:top-5">
        {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto relative flex w-fit min-w-[15rem] max-w-full items-center gap-3 overflow-hidden rounded-2xl border bg-[color:rgb(var(--color-card-rgb)/0.96)] px-3 py-2.5 pe-10 text-[var(--color-text)] shadow-[0_20px_55px_-28px_rgb(0_0_0/0.72),0_10px_35px_-25px_currentColor] backdrop-blur-2xl animate-[page-fade-in_0.22s_ease-out] sm:min-w-[18rem]',
                toast.type === 'success' &&
                  'border-emerald-400/35 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-emerald-400 before:via-teal-400 before:to-cyan-400',
                toast.type === 'error' &&
                  'border-rose-400/40 border-s-4 border-s-rose-500 bg-[linear-gradient(105deg,rgb(244_63_94/.12),rgb(var(--color-card-rgb)/.98))] shadow-[0_18px_45px_-24px_rgb(225_29_72/.8)]',
                toast.type === 'warning' &&
                  'border-amber-400/35 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-amber-400 before:to-orange-400',
                toast.type === 'info' &&
                  'border-violet-400/35 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-violet-500 before:to-fuchsia-500'
              )}
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                  toast.type === 'success' && 'bg-emerald-500/12 text-emerald-500',
                  toast.type === 'error' && 'rounded-lg border border-rose-400/25 bg-rose-500/12 text-rose-500 shadow-[3px_3px_0_rgb(225_29_72/.12)]',
                  toast.type === 'warning' && 'bg-amber-500/12 text-amber-500',
                  toast.type === 'info' && 'bg-violet-500/12 text-violet-500'
                )}
              >
                {toast.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                {toast.type === 'error' && <CircleX className="h-5 w-5" />}
                {toast.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
                {toast.type === 'info' && <Info className="h-5 w-5" />}
              </span>
              <span className="min-w-0 text-center text-xs font-black sm:text-sm">{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="إغلاق الإشعار"
                className="absolute end-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[var(--color-text-secondary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.1)] hover:text-[var(--color-text)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
      </div>
    </ToastContext.Provider>
  );
};
