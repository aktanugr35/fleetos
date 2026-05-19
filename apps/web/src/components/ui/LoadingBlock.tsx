interface LoadingBlockProps {
  rows?: number;
  className?: string;
}

export function LoadingBlock({ rows = 5, className = '' }: LoadingBlockProps) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-gray-800/60" />
      ))}
    </div>
  );
}

export function LoadingCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900/50 p-6 animate-pulse ${className}`}>
      <div className="h-4 w-24 bg-gray-800 rounded mb-4" />
      <div className="h-8 w-32 bg-gray-800 rounded" />
    </div>
  );
}
