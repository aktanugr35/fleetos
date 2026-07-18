import Link from 'next/link';
import { BrandWordmark } from '@/components/layout/BrandWordmark';

const stats = [
  { value: 'Multi-Tenant', label: 'Built for growing carriers' },
  { value: 'DOT / FMCSA', label: 'Compliance-ready workflows' },
  { value: 'Weekly', label: 'Automated settlements' },
  { value: 'Role-Based', label: 'Access for every team' },
];

const features = [
  {
    title: 'Loads & Dispatch',
    desc: 'Book, assign, and track every load from pickup to delivery on a single operations board.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    title: 'Driver Settlements',
    desc: 'Automated weekly pay with deductions, credits, fuel and tolls — plus one-click PDF statements.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Dispatcher Pay',
    desc: 'Commission statements calculated on booked load gross — accurate and transparent every week.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    title: 'Driver Onboarding',
    desc: 'Shareable DOT application links and document uploads, filed automatically to each driver profile.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 11h-6" /><path d="M19 8v6" />
      </svg>
    ),
  },
  {
    title: 'Compliance & Documents',
    desc: 'Track expiring licenses, medical cards, and insurance with alerts before they lapse.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: 'Reports & Insights',
    desc: 'Revenue, lanes, and settlement summaries that turn day-to-day operations into clear numbers.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const steps = [
  {
    title: 'Set up your company',
    desc: 'Create your account, add trucks, trailers, drivers, and dispatchers in minutes.',
  },
  {
    title: 'Run your operation',
    desc: 'Book loads, assign drivers, and keep documents and compliance in one place.',
  },
  {
    title: 'Pay everyone accurately',
    desc: 'Generate driver settlements and dispatcher commissions with one-click statements.',
  },
];

function TruckLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17h4V5H2v12h3" />
      <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="landing relative overflow-hidden">
      {/* Navigation */}
      <div className="lp-nav">
        <div className="lp-container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <TruckLogo className="w-5 h-5 text-white" />
            </div>
            <BrandWordmark className="text-xl text-[var(--brand-cloud)]" />
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how" className="lp-nav-link">How it works</a>
            <a href="#why" className="lp-nav-link">Why Haulyard</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="lp-nav-link hidden sm:inline-flex px-2 py-1">Sign In</Link>
            <Link href="/signup" className="lp-cta lp-cta-primary text-sm px-4 py-2">Get Started</Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="lp-container relative z-10 pt-16 pb-14 sm:pt-24 sm:pb-20">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="lp-eyebrow">Trucking TMS · Built for US carriers</span>
            <h1 className="lp-headline text-[2.75rem] sm:text-6xl mt-6">
              Your fleet,
              <br />
              <span className="lp-accent">under control.</span>
            </h1>
            <p className="lp-body text-lg leading-relaxed mt-6 max-w-xl">
              Haulyard is a modern transportation management platform for US trucking
              companies. Manage loads, driver settlements, dispatcher pay, and DOT
              onboarding — from one connected system.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link href="/signup" className="lp-cta lp-cta-primary">Get Started</Link>
              <Link href="/login" className="lp-cta lp-cta-ghost">Sign In</Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 lp-muted text-sm">
              <span className="flex items-center gap-2">
                <span className="lp-teal-accent">✓</span> No spreadsheets
              </span>
              <span className="flex items-center gap-2">
                <span className="lp-teal-accent">✓</span> Multi-tenant &amp; role-based
              </span>
              <span className="flex items-center gap-2">
                <span className="lp-teal-accent">✓</span> DOT/FMCSA ready
              </span>
            </div>
          </div>

          {/* Product mockup */}
          <div className="relative">
            <div className="lp-mock">
              <div className="lp-mock-bar">
                <span className="lp-mock-dot" />
                <span className="lp-mock-dot" />
                <span className="lp-mock-dot" />
                <span className="ml-3 text-xs lp-muted">Haulyard · Dashboard</span>
              </div>
              <div className="lp-mock-body">
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  <div className="lp-mock-tile">
                    <div className="lp-mock-tile-top" style={{ background: 'var(--brand-teal)' }} />
                    <div className="text-[var(--brand-cloud)] font-bold text-sm">Active Loads</div>
                    <div className="lp-muted text-xs mt-0.5">24 in transit</div>
                  </div>
                  <div className="lp-mock-tile">
                    <div className="lp-mock-tile-top" style={{ background: 'var(--brand-amber)' }} />
                    <div className="text-[var(--brand-cloud)] font-bold text-sm">Settlements</div>
                    <div className="lp-muted text-xs mt-0.5">Weekly ready</div>
                  </div>
                  <div className="lp-mock-tile">
                    <div className="lp-mock-tile-top" style={{ background: 'var(--brand-teal)' }} />
                    <div className="text-[var(--brand-cloud)] font-bold text-sm">Drivers</div>
                    <div className="lp-muted text-xs mt-0.5">18 active</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="lp-mock-row">
                    <span className="text-xs text-[var(--brand-cloud)] font-medium">VT-2026-00142</span>
                    <span className="lp-chip lp-chip-teal">Delivered</span>
                  </div>
                  <div className="lp-mock-row">
                    <span className="text-xs text-[var(--brand-cloud)] font-medium">VT-2026-00143</span>
                    <span className="lp-chip lp-chip-amber">In Transit</span>
                  </div>
                  <div className="lp-mock-row">
                    <span className="text-xs text-[var(--brand-cloud)] font-medium">VT-2026-00144</span>
                    <span className="lp-chip lp-chip-teal">Booked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="lp-stat-strip mt-16">
          {stats.map((s) => (
            <div key={s.label} className="lp-stat">
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10">
        <div className="lp-container lp-section">
          <div className="max-w-2xl">
            <span className="lp-eyebrow">Everything in one platform</span>
            <h2 className="lp-h2 mt-5">Run loads, drivers, and finance without the busywork.</h2>
            <p className="lp-body text-lg mt-4">
              Replace scattered spreadsheets and disconnected tools with a single system
              built around how carriers actually operate.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {features.map((f) => (
              <div key={f.title} className="lp-card">
                <div className="lp-card-icon mb-4">{f.icon}</div>
                <h3 className="font-semibold text-[var(--brand-cloud)] text-lg">{f.title}</h3>
                <p className="lp-body text-sm mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10">
        <div className="lp-container lp-section pt-0">
          <div className="max-w-2xl">
            <span className="lp-eyebrow">How it works</span>
            <h2 className="lp-h2 mt-5">Up and running in three steps.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {steps.map((step, i) => (
              <div key={step.title} className="lp-card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="lp-step-num">{i + 1}</span>
                  <h3 className="font-semibold text-[var(--brand-cloud)] text-base">{step.title}</h3>
                </div>
                <p className="lp-body text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Haulyard — brand slogans */}
      <section id="why" className="relative z-10">
        <div className="lp-container lp-section pt-0">
          <div className="max-w-2xl">
            <span className="lp-eyebrow">Why Haulyard</span>
            <h2 className="lp-h2 mt-5">
              Built for the <span className="lp-accent">Road Ahead.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
            <div className="lp-card">
              <p className="text-xl font-bold">
                Move Smarter. <span className="lp-accent">Haul Harder.</span>
              </p>
              <p className="lp-body text-sm mt-2">
                Cut the manual work and run every load, driver, and dollar from one place —
                so your team spends time moving freight, not chasing paperwork.
              </p>
            </div>
            <div className="lp-card">
              <p className="text-xl font-bold">
                Your Fleet. <span className="lp-teal-accent">Your Yard.</span>
              </p>
              <p className="lp-body text-sm mt-2">
                Multi-tenant by design, with role-based access for admins, dispatchers,
                accounting, and drivers — everyone sees exactly what they need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative z-10">
        <div className="lp-container pb-20">
          <div className="lp-cta-band px-8 py-12 sm:px-14 sm:py-16 text-center">
            <h2 className="lp-h2">Ready to take control of your fleet?</h2>
            <p className="lp-body text-lg mt-4 max-w-xl mx-auto">
              Get started with Haulyard and run your loads, drivers, and settlements
              from one platform.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <Link href="/signup" className="lp-cta lp-cta-primary">Get Started</Link>
              <Link href="/login" className="lp-cta lp-cta-ghost">Sign In</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer relative z-10">
        <div className="lp-container py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <TruckLogo className="w-4 h-4 text-white" />
                </div>
                <BrandWordmark className="text-lg text-[var(--brand-cloud)]" />
              </div>
              <p className="lp-body text-sm mt-4 max-w-xs">
                A modern TMS for US trucking companies. Run your fleet from the yard.
              </p>
            </div>
            <div>
              <h4 className="lp-footer-head">Product</h4>
              <ul className="mt-4 space-y-3">
                <li><a href="#features" className="lp-footer-link">Features</a></li>
                <li><a href="#how" className="lp-footer-link">How it works</a></li>
                <li><a href="#why" className="lp-footer-link">Why Haulyard</a></li>
              </ul>
            </div>
            <div>
              <h4 className="lp-footer-head">Get started</h4>
              <ul className="mt-4 space-y-3">
                <li><Link href="/signup" className="lp-footer-link">Create account</Link></li>
                <li><Link href="/login" className="lp-footer-link">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="lp-footer-head">Platform</h4>
              <ul className="mt-4 space-y-3">
                <li><span className="lp-footer-link">Loads &amp; Dispatch</span></li>
                <li><span className="lp-footer-link">Settlements</span></li>
                <li><span className="lp-footer-link">Compliance</span></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 pt-6 border-t border-white/10">
            <p className="lp-muted text-sm">© {new Date().getFullYear()} Haulyard. All rights reserved.</p>
            <p className="lp-muted text-sm">Haulyard v1.0.0 · Trucking TMS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
