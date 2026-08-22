import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

const EmptyOrdersState = ({
  title,
  description,
  actionLabel,
  actionTo,
}) => {
  return (
    <Card variant="elevated" className="p-6 sm:p-10">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] text-[var(--color-primary)]">
          <Package className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)]">
          {description}
        </p>
        {actionLabel && actionTo ? (
          <Link to={actionTo} className="mt-5">
            <Button>{actionLabel}</Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
};

export default EmptyOrdersState;

