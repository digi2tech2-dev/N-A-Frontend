import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, FileImage, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const UploadReceiptBox = ({ onFileUpload }) => {
  const { dir } = useLanguage();
  const { t } = useTranslation();
  const isRTL = dir === 'rtl';
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) return t('payments.upload.invalidType');
    if (file.size > MAX_FILE_SIZE) return t('payments.upload.invalidSize');
    return null;
  };

  const handleFileSelect = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    setUploadedFile(file);
    onFileUpload(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const [file] = event.dataTransfer.files;
    if (file) handleFileSelect(file);
  };

  const handleFileInputChange = (event) => {
    const [file] = event.target.files;
    if (file) handleFileSelect(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setError('');
    onFileUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const unit = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(unit));
    return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(2))} ${sizes[index]}`;
  };

  return (
    <div>
      {!uploadedFile ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="relative"
        >
          <div
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragOver(false);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer overflow-hidden rounded-xl border border-dashed p-3 text-center transition sm:p-3.5 ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-50/80 shadow-[0_18px_34px_-28px_rgba(16,185,129,0.55)] dark:border-emerald-500/60 dark:bg-emerald-950/24'
                : 'border-[color:rgb(var(--color-primary-rgb)/0.3)] bg-[color:rgb(var(--color-primary-rgb)/0.05)] hover:border-[color:rgb(var(--color-primary-rgb)/0.55)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.09)]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="flex items-center gap-3 text-start">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#c026d3)] transition-transform ${
                isDragOver ? 'scale-110' : ''
              }`}
              >
                <Upload className="h-4 w-4 text-white" />
              </div>

              <div className="min-w-0">
                <h3 className="text-xs font-black text-[var(--color-text)]">
                  {isDragOver ? t('payments.upload.dropHere') : t('payments.upload.uploadTitle')}
                </h3>
                <p className="mt-0.5 truncate text-[10px] text-[var(--color-text-secondary)]">
                  {isRTL ? 'اضغط لاختيار صورة واضحة للإيصال' : 'Choose a clear receipt image'}
                </p>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent dark:via-sky-500/35"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="rounded-[1.1rem] border border-emerald-200 bg-emerald-50/70 p-4 shadow-[0_14px_30px_-26px_rgba(16,185,129,0.5)] backdrop-blur-xl dark:border-emerald-900/70 dark:bg-emerald-950/20"
        >
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[0.9rem] border border-emerald-200 bg-white text-emerald-700 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.45)] dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-300">
              <FileImage className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate font-black text-slate-950 dark:text-white">{uploadedFile.name}</h4>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{formatFileSize(uploadedFile.size)}</p>
            </div>

            <button
              type="button"
              onClick={handleRemoveFile}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:bg-rose-950/55"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1rem] border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/70 dark:bg-rose-950/25"
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 dark:text-rose-300" />
            <p className="text-sm font-medium text-rose-700 dark:text-rose-200">{error}</p>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
};

export default UploadReceiptBox;
