import { DashboardAuthGuard } from '@/components/auth/DashboardAuthGuard';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAuthGuard>
  );
}
