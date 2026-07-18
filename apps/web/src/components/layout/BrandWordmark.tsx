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
        className={cn('text-transparent bg-clip-text', suffixClassName)}
        style={{ backgroundImage: 'linear-gradient(90deg, var(--brand-amber), #ff9d3d)' }}
      >
        yard
      </span>
    </span>
  );
}
