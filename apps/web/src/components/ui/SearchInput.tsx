'use client';

import { cn } from '@/lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export function SearchInput({ wrapperClassName, className, type = 'text', ...props }: SearchInputProps) {
  return (
    <div className={cn('input-search-wrap', wrapperClassName)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="input-search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input type={type} className={cn('input input--with-leading-icon', className)} {...props} />
    </div>
  );
}
