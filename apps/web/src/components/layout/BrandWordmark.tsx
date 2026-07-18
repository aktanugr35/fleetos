import { cn } from '@/lib/utils';

interface BrandWordmarkProps {
  className?: string;
  suffixClassName?: string;
}

export function BrandWordmark({ className, suffixClassName }: BrandWordmarkProps) {
  return (
    <span className={cn('font-bold tracking-tight', className)}>
      Haul
      <span
        className={cn(
          'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400',
          suffixClassName,
        )}
      >
        yard
      </span>
    </span>
  );
}
