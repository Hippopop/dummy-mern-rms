'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export default function Home() {
  const { user, loading, can } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    // A chef has no dashboard access, so send them where they actually work.
    else router.replace(can('dashboard') ? '/dashboard' : '/kitchen');
  }, [loading, user, can, router]);

  return null;
}
