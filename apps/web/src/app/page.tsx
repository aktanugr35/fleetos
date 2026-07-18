import Link from 'next/link';
import { BrandWordmark } from '@/components/layout/BrandWordmark';

const features = [
  {
    title: 'Loads & Dispatch',
    desc: 'Book, assign, and track every load from pickup to delivery in one board.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    title: 'Driver Settlements',
    desc: 'Automated weekly pay with deductions, credits, and one-click PDF statements.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Dispatcher Pay',
    desc: 'Commission statements calculated on booked load gross — accurate every week.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    title: 'Driver Onboarding',
    desc: 'Shareable DOT application links and document uploads, filed to each profile.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 11h-6" /><path d="M19 8v6" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="landing relative overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        {/* Top nav */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 17h4V5H2v12h3" />
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                <circle cx="7.5" cy="17.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <BrandWordmark className="text-2xl text-[var(--brand-cloud)]" />
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex lp-footer-link text-sm font-medium px-3 py-2">
              Sign In
            </Link>
            <Link href="/signup" className="lp-cta lp-cta-primary text-sm px-5 py-2.5">
              Get Started
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="pt-16 pb-14 sm:pt-24 sm:pb-20 max-w-3xl">
          <span className="lp-eyebrow">Trucking TMS</span>
          <h1 className="lp-headline text-5xl sm:text-6xl mt-6">
            Your fleet,
            <br />
            <span className="lp-accent">under control.</span>
          </h1>
          <p className="lp-body text-lg leading-relaxed mt-6 max-w-xl">
            Haulyard is a modern TMS built for US trucking companies — manage loads,
            driver settlements, dispatcher pay, and DOT onboarding from a single platform.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <Link href="/signup" className="lp-cta lp-cta-primary">
              Get Started
            </Link>
            <Link href="/login" className="lp-cta lp-cta-ghost">
              Sign In
            </Link>
          </div>
        </section>

        {/* Primary slogan */}
        <section className="lp-slogan-strip flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-6 mb-16">
          <p className="text-2xl sm:text-3xl font-bold">
            Built for the <span className="lp-accent">Road Ahead.</span>
          </p>
          <p className="lp-body text-sm">
            One platform for loads, drivers, dispatch, and finance.
          </p>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {features.map((f) => (
            <div key={f.title} className="lp-card">
              <div className="lp-card-icon mb-4">{f.icon}</div>
              <h3 className="font-semibold text-[var(--brand-cloud)] text-base">{f.title}</h3>
              <p className="lp-body text-sm mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Secondary slogans */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-20">
          <div className="lp-card">
            <p className="text-xl font-semibold">
              Move Smarter. <span className="lp-accent">Haul Harder.</span>
            </p>
            <p className="lp-body text-sm mt-1.5">
              Cut the spreadsheets and run every load, driver, and dollar in one place.
            </p>
          </div>
          <div className="lp-card">
            <p className="text-xl font-semibold">
              Your Fleet. <span style={{ color: 'var(--brand-teal)' }}>Your Yard.</span>
            </p>
            <p className="lp-body text-sm mt-1.5">
              Multi-tenant by design, with role-based access for every team member.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 py-8">
          <div className="flex items-center gap-2">
            <BrandWordmark className="text-lg text-[var(--brand-cloud)]" />
            <span className="lp-divider text-sm">·</span>
            <span className="lp-body text-sm">Trucking TMS</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="lp-footer-link text-sm">Sign In</Link>
            <Link href="/signup" className="lp-footer-link text-sm">Get Started</Link>
            <span className="lp-body text-xs">Haulyard v1.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
