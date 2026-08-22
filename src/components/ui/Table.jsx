import React from 'react';
import { cn } from './Button';

const Table = ({ className, children, ...props }) => {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-[1.1rem] border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.94),rgb(var(--color-elevated-rgb)/0.76))] shadow-[var(--shadow-subtle)] [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ className, children, ...props }) => (
  <thead className={cn('bg-[color:rgb(var(--color-surface-rgb)/0.58)] [&_tr]:border-b border-[color:rgb(var(--color-primary-rgb)/0.14)]', className)} {...props}>
    {children}
  </thead>
);

const TableBody = ({ className, children, ...props }) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>
    {children}
  </tbody>
);

const TableRow = ({ className, children, ...props }) => (
  <tr
    className={cn(
      'border-b border-[color:rgb(var(--color-border-rgb)/0.72)] transition-colors even:bg-[color:rgb(var(--color-surface-rgb)/0.18)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.07)] data-[state=selected]:bg-[color:rgb(var(--color-primary-rgb)/0.1)]',
      className
    )}
    {...props}
  >
    {children}
  </tr>
);

const TableHead = ({ className, children, ...props }) => (
  <th
    className={cn(
      'h-12 px-4 text-start align-middle text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary-soft)] [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  >
    {children}
  </th>
);

const TableCell = ({ className, children, ...props }) => (
  <td
    className={cn('p-4 text-start align-middle text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  >
    {children}
  </td>
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
