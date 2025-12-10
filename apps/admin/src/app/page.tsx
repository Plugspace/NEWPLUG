'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is master admin (plugspaceapp@gmail.com)
    // In production, this would check Firebase auth
    const email = localStorage.getItem('userEmail');
    if (email !== 'plugspaceapp@gmail.com') {
      router.push('/unauthorized');
    }
  }, [router]);

  return <AdminDashboard />;
}
