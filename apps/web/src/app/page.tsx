import { HomeActions } from '@/components/home/HomeActions';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 text-center space-y-8 px-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17h4V5H2v12h3" />
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Fleet<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">OS</span>
          </h1>
        </div>

        <p className="text-lg text-gray-400 max-w-md mx-auto">
          Comprehensive Logistics & Fleet Management System for US Trucking Industry
        </p>

        <div className="flex gap-8 justify-center text-center">
          <div className="card px-6 py-4">
            <div className="text-2xl font-bold text-blue-400">Multi-Tenant</div>
            <div className="text-xs text-gray-500 mt-1">Architecture</div>
          </div>
          <div className="card px-6 py-4">
            <div className="text-2xl font-bold text-purple-400">DOT/FMCSA</div>
            <div className="text-xs text-gray-500 mt-1">Compliance</div>
          </div>
          <div className="card px-6 py-4">
            <div className="text-2xl font-bold text-cyan-400">Weekly</div>
            <div className="text-xs text-gray-500 mt-1">Settlements</div>
          </div>
        </div>

        <HomeActions />

        <p className="text-xs text-gray-600 pt-8">
          FleetOS v1.0.0 — Built with Next.js, Express, Prisma, PostgreSQL
        </p>
      </div>
    </div>
  );
}
