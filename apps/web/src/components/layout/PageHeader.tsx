interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex w-full items-center gap-3 sm:w-auto [&_.btn]:w-full sm:[&_.btn]:w-auto">{actions}</div>}
    </div>
  );
}
