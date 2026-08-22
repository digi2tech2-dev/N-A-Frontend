import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

const SaveChangesBar = ({
  isDirty,
  isSaving,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
  dirtyHint,
  cleanHint
}) => {
  return (
    <div className="sticky bottom-3 z-30 pt-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={isDirty ? 'dirty' : 'clean'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.92)] p-3 shadow-[var(--shadow-medium)] backdrop-blur-md"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              {isDirty ? (
                <CircleAlert className="h-4 w-4 text-amber-500 dark:text-amber-300" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
              )}
              {isDirty ? dirtyHint : cleanHint}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving || !isDirty}>
                {cancelLabel}
              </Button>
              <Button type="button" onClick={onSave} disabled={isSaving || !isDirty}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{saveLabel}</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SaveChangesBar;
