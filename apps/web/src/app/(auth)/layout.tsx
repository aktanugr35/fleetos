import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BrandWordmark } from '@/components/layout/BrandWordmark';

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
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'color-mix(in srgb, var(--brand-amber) 10%, transparent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'color-mix(in srgb, var(--brand-teal) 10%, transparent)' }}
        />
      </div>

      {/* Left side — Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center relative p-12">
        <div className="max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--brand-midnight-2), var(--brand-teal))',
                boxShadow: '0 10px 24px -10px color-mix(in srgb, var(--brand-teal) 60%, transparent)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" style={{ color: 'var(--brand-amber)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 17h4V5H2v12h3" />
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                <circle cx="7.5" cy="17.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <div>
              <BrandWordmark className="text-3xl" />
              <p className="text-sm text-gray-500">Run your fleet from the yard</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-200">
              Built for the <span style={{ color: 'var(--brand-amber)' }}>Road Ahead.</span>
            </h2>
            <p className="text-gray-400 leading-relaxed">
              A modern TMS for US trucking companies. Manage loads, driver settlements,
              dispatcher pay, and DOT onboarding — all in one platform.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4 pt-4">
              {[
                {
                  title: 'DOT/FMCSA Compliance',
                  desc: 'Real-time alerts for expiring documents',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                },
                {
                  title: 'Weekly Settlements',
                  desc: 'One-click PDF statement generation',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  ),
                },
                {
                  title: 'Loads & Fleet',
                  desc: 'Trucks, drivers, trailers, and load dispatch',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                      <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                    </svg>
                  ),
                },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span
                    className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{
                      color: 'var(--brand-teal)',
                      background: 'color-mix(in srgb, var(--brand-teal) 16%, transparent)',
                    }}
                  >
                    {feature.icon}
                  </span>
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
