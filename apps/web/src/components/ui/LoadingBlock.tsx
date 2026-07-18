interface LoadingBlockProps {
  rows?: number;
  className?: string;
}

export function LoadingBlock({ rows = 5, className = '' }: LoadingBlockProps) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-[var(--bg-elevated)]" />
      ))}
    </div>
  );
}

export function LoadingCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 animate-pulse ${className}`}>
      <div className="h-4 w-24 bg-[var(--bg-elevated)] rounded mb-4" />
      <div className="h-8 w-32 bg-[var(--bg-elevated)] rounded" />
    </div>
  );
}
