'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { SetupRegistrationForm } from '@/components/auth/SetupRegistrationForm';

type SignupState = 'loading' | 'open' | 'closed';

function SignupContent() {
  const [state, setState] = useState<SignupState>('loading');

  useEffect(() => {
    api
      .get('/setup/status')
      .then((res) => {
        setState(res.data.data.setupRequired ? 'open' : 'closed');
      })
      .catch(() => setState('closed'));
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (state === 'open') {
    return <SetupRegistrationForm />;
  }

  return (
    <div className="animate-fade-in">
      <div className="card p-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Sign up</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            New company registration is not available on this system. If your fleet already uses
            Haulyard, ask your company administrator to create an account for you.
          </p>
        </div>
        <Link href="/login" className="btn btn-primary w-full py-3 text-center block">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
