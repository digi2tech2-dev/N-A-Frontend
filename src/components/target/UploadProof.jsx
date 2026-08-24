import React, { useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, UploadCloud, X } from 'lucide-react';
import Button, { cn } from '../ui/Button';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const UploadProof = ({
  value,
  onChange,
  label = 'إثبات التحويل',
  title = 'اضغط لرفع صورة التحويل',
  hint = 'PNG أو JPG أو WEBP',
  badge = '',
  compact = false,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const preview = await readFileAsDataUrl(file);
    onChange({ file, fileName: file.name, preview });
  };

  return (
    <div>
      {label ? <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">{label}</p> : null}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          'relative overflow-hidden rounded-[1.25rem] border border-dashed border-cyan-300/35 bg-[linear-gradient(145deg,rgb(17_26_59/0.72),rgb(11_18_40/0.88))] p-3 text-center transition-all duration-200',
          isDragging && 'scale-[1.01] border-cyan-200/80 bg-cyan-300/[0.08]'
        )}
      >
        {value?.preview ? (
          <div className="grid items-center gap-4 sm:grid-cols-[8rem_1fr] sm:text-start">
            <img
              src={value.preview}
              alt="معاينة إثبات التحويل"
              className="h-28 w-full rounded-[1rem] border border-cyan-300/25 object-cover"
            />
            <div className="flex min-w-0 flex-col justify-center gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-bold text-cyan-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  تم رفع الصورة بنجاح
                </p>
                <p className="mt-1.5 truncate text-sm font-bold text-[var(--color-text)]">{value.fileName}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" className="h-9 rounded-xl px-3 text-xs" onClick={() => inputRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" />
                  تغيير الصورة
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-9 rounded-xl px-3 text-xs text-[var(--color-error)]" onClick={() => onChange(null)}>
                  <X className="h-4 w-4" />
                  حذف
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'group flex w-full flex-col items-center justify-center rounded-[1rem] px-3 transition hover:bg-cyan-300/[0.06]',
              compact ? 'py-3' : 'py-6 sm:py-7'
            )}
          >
            <span className={cn(
              'flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgb(34_211_238/0.18),rgb(124_58_237/0.24))] text-cyan-200 transition-transform group-hover:-translate-y-0.5',
              compact ? 'h-9 w-9' : 'h-12 w-12'
            )}>
              <UploadCloud className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
            </span>
            <span className={cn('font-bold text-[var(--color-text)]', compact ? 'mt-2 text-xs' : 'mt-3 text-sm')}>{title}</span>
            <span className={cn('text-[var(--color-text-secondary)]', compact ? 'mt-0.5 text-[10px]' : 'mt-1 text-xs')}>{hint}</span>
            {badge ? (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-100/75 font-black text-amber-700 dark:border-amber-300/30 dark:bg-amber-300/[0.08] dark:text-amber-200',
                compact ? 'mt-2 px-2.5 py-0.5 text-[10px]' : 'mt-3 px-3 py-1 text-xs'
              )}>
                <CheckCircle2 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                {badge}
              </span>
            ) : null}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
};

export default UploadProof;

