interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl border border-red-500/20 bg-red-500/5 ${className}`}
    >
      <p className="text-sm font-medium text-red-400">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-md">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
