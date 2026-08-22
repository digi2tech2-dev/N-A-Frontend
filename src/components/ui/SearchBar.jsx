import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from './Button';
import { Search } from 'lucide-react';
import { searchInputClassName } from './Input';

const SearchBar = ({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  iconClassName,
  forceIconRight = false,
  ...props
}) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const isIconOnRight = forceIconRight || isRTL;

  const handleChange = (e) => {
    if (typeof onChange !== 'function') return;
    onChange(e.target.value);
  };
  
  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <Search
          className={cn(
            'pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]',
            isIconOnRight ? 'right-4' : 'left-4',
            iconClassName
          )}
        />
        <input
          type="search"
          className={cn(
            searchInputClassName,
            inputClassName,
            isIconOnRight ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'
          )}
          placeholder={placeholder || ''}
          value={value}
          onChange={handleChange}
          id="search-input"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          {...props}
        />
      </div>
    </div>
  );
};

export default SearchBar;
