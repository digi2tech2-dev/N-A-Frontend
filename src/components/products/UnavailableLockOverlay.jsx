import React from 'react';
import { cn } from '../ui/Button';
import lockChainImage from '../../assets/قفل.PNG';

const sizeClasses = {
  xs: {
    panel: 'rounded-[0.9rem]',
    plaque: 'top-1 px-1.5 py-0.5 text-[8px] rounded-[0.45rem]',
    image: 'inset-0 h-full w-full scale-[1.55] object-cover object-[50%_68%]',
  },
  sm: {
    panel: 'rounded-[0.85rem]',
    plaque: 'top-2 px-3 py-1 text-[10px] rounded-[0.7rem]',
    image: 'inset-0 h-full w-full scale-[1.55] object-cover object-[50%_68%]',
  },
  md: {
    panel: 'rounded-[1rem]',
    plaque: 'top-2.5 px-4 py-1.5 text-xs sm:text-sm rounded-[0.8rem]',
    image: 'inset-0 h-full w-full scale-[1.55] object-cover object-[50%_68%]',
  },
  lg: {
    panel: 'rounded-[1.4rem]',
    plaque: 'top-3 px-5 py-2 text-sm sm:text-base rounded-[0.95rem]',
    image: 'inset-0 h-full w-full scale-[1.55] object-cover object-[50%_68%]',
  },
};

const UnavailableLockOverlay = ({ label = 'غير متوفر', size = 'md', className }) => {
  const styles = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={cn(
        'pointer-events-none absolute inset-0 z-30 block overflow-hidden border border-amber-200/45 bg-[radial-gradient(circle_at_50%_24%,rgb(255_255_255/0.88),transparent_34%),linear-gradient(180deg,rgb(244_253_255/0.72),rgb(255_248_226/0.78))] shadow-[inset_0_1px_0_rgb(255_255_255/0.88),inset_0_-18px_30px_rgb(124_58_237/0.08)] dark:border-violet-200/24 dark:bg-[radial-gradient(circle_at_50%_24%,rgb(255_255_255/0.16),transparent_34%),linear-gradient(180deg,rgb(124_58_237/0.28),rgb(244_114_208/0.22))] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),inset_0_-18px_30px_rgb(0_0_0/0.12)]',
        styles.panel,
        className
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          'absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap border border-red-200/35 bg-[linear-gradient(180deg,#d9271f_0%,#8f1410_58%,#4b0907_100%)] font-black text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.32),inset_0_-8px_14px_rgb(0_0_0/0.3),0_8px_18px_-10px_rgb(0_0_0/0.95)] [text-shadow:0_2px_2px_rgb(0_0_0/0.72)]',
          styles.plaque
        )}
      >
        {label}
      </span>

      <img
        src={lockChainImage}
        alt=""
        draggable="false"
        className={cn(
          'absolute z-50 max-w-none opacity-[0.92] drop-shadow-[0_16px_20px_rgb(15_23_42/0.26)] dark:opacity-[0.86] dark:drop-shadow-[0_16px_20px_rgb(0_0_0/0.42)]',
          styles.image
        )}
      />
    </span>
  );
};

export default UnavailableLockOverlay;
