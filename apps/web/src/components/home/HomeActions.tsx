'use client';

import Link from 'next/link';

export function HomeActions() {
  return (
    <div className="flex flex-wrap gap-4 justify-center pt-4">
      <Link href="/login" className="btn btn-primary text-base px-8 py-3">
        Sign In
      </Link>
      <Link href="/signup" className="btn btn-secondary text-base px-8 py-3">
        Sign Up
      </Link>
    </div>
  );
}
