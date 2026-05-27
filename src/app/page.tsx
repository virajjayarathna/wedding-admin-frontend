import { redirect } from 'next/navigation';

// Root redirects to admin login by default
export default function RootPage() {
  redirect('/login');
}
