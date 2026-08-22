import React from 'react';
import BrandMark from './BrandMark';
import { cn } from '../ui/Button';

const HeaderBrand = ({ className, iconClassName, textClassName }) => (
  <span dir="ltr" className={cn('inline-flex items-center gap-1 rounded-[14px] sm:gap-1.5', className)}>
    <BrandMark
      size="xs"
      compact
      showCaption={false}
      className={cn('-mx-1.5 scale-[0.72] min-[380px]:scale-[0.78] sm:scale-[0.84]', iconClassName)}
    />
    <span className={cn('min-w-0 text-center leading-none', textClassName)}>
      <span className="kanz-brand-title block text-[0.98rem] leading-none text-transparent bg-clip-text bg-[linear-gradient(105deg,#21d4fd_0%,#087dff_34%,#f4fbff_52%,#a855f7_72%,#d946ef_100%)] min-[380px]:text-[1.1rem] sm:text-[1.5rem]">
        N&amp;A
      </span>
      <span className="brand-hub-caption mt-0.5 block text-[0.38rem] uppercase text-[#c026d3] sm:text-[0.5rem]">
        HUB
      </span>
    </span>
  </span>
);

export default HeaderBrand;
