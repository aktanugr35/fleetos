'use client';

import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, error, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function FormInput({ error, className, ...props }: FormInputProps) {
  return (
    <input
      className={cn(
        'input',
        error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/15',
        className
      )}
      {...props}
    />
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
}

export function FormSelect({ options, placeholder, error, className, ...props }: FormSelectProps) {
  return (
    <select
      className={cn(
        'input',
        error && 'border-red-500/50 focus:border-red-500',
        className
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function FormTextarea({ error, className, ...props }: FormTextareaProps) {
  return (
    <textarea
      className={cn(
        'input min-h-[80px] resize-y',
        error && 'border-red-500/50 focus:border-red-500',
        className
      )}
      {...props}
    />
  );
}
