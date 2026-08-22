import React, { useRef, useState } from 'react';
import { ImagePlus, UploadCloud, X } from 'lucide-react';
import Button, { cn } from '../ui/Button';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const UploadProof = ({ value, onChange, label = 'إثبات التحويل' }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const preview = await readFileAsDataUrl(file);
    onChange({ file, fileName: file.name, preview });
  };

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">{label}</p>
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
          'relative overflow-hidden rounded-[1.5rem] border border-dashed border-[color:rgb(var(--color-primary-rgb)/0.34)] bg-[color:rgb(var(--color-card-rgb)/0.86)] p-4 text-center shadow-[0_22px_70px_-44px_rgb(var(--color-primary-rgb)/0.42)] transition-all duration-300',
          isDragging && 'scale-[1.01] border-[color:rgb(var(--color-primary-rgb)/0.72)] bg-[color:rgb(var(--color-primary-rgb)/0.1)]'
        )}
      >
        {value?.preview ? (
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:text-start">
            <img
              src={value.preview}
              alt="Transfer proof preview"
              className="h-36 w-full rounded-[1.1rem] border border-[color:rgb(var(--color-primary-rgb)/0.2)] object-cover"
            />
            <div className="flex flex-col justify-center gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">{value.fileName}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">تم رفع الصورة وجاهزة للإرسال.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" />
                  تغيير الصورة
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
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
            className="flex w-full flex-col items-center justify-center rounded-[1.25rem] px-4 py-8 transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.07)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:rgb(var(--color-primary-rgb)/0.12)] text-[var(--color-primary)]">
              <UploadCloud className="h-7 w-7" />
            </span>
            <span className="mt-3 text-sm font-bold text-[var(--color-text)]">اسحب صورة التحويل هنا أو اضغط للرفع</span>
            <span className="mt-1 text-xs text-[var(--color-text-secondary)]">PNG, JPG, WEBP</span>
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
