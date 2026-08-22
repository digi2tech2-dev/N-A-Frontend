import React from 'react';
import { cn } from './Button'; // Reusing cn utility

const variants = {
  default: 'premium-card',
  elevated: 'premium-card-elevated',
  premium: 'premium-card-premium',
  flat:
    'rounded-[var(--radius-xl)] border border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-card-rgb)/0.94)] shadow-[var(--shadow-subtle)]',
};

const Card = ({ className, children, variant = 'default', ...props }) => {
  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
