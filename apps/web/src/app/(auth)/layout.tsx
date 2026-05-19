import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout min-h-screen flex relative overflow-hidden bg-[var(--bg-primary)]">
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/8 blur-3xl" />
      </div>

      {/* Left side — Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center relative p-12">
        <div className="max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 17h4V5H2v12h3" />
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                <circle cx="7.5" cy="17.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Fleet<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">OS</span>
              </h1>
              <p className="text-sm text-gray-500">Fleet Management System</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-200">
              Manage your fleet with confidence
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Complete logistics and fleet management platform built for US trucking companies. 
              Track compliance, manage loads, and automate settlements — all in one place.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4 pt-4">
              {[
                { icon: '🛡️', title: 'DOT/FMCSA Compliance', desc: 'Real-time alerts for expiring documents' },
                { icon: '📊', title: 'Weekly Settlements', desc: 'One-click PDF statement generation' },
                { icon: '🚛', title: 'Loads & Fleet', desc: 'Trucks, drivers, trailers, and load dispatch' },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-xl mt-0.5">{feature.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-200 text-sm">{feature.title}</h3>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
