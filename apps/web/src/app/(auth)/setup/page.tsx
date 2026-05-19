import { redirect } from 'next/navigation';

/** Legacy URL — registration lives at /signup */
export default function SetupPage() {
  redirect('/signup');
}
