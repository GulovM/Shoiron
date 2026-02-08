'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !profile) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [loading, profile, router, pathname]);

  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }
  if (!profile) {
    return <div className="loading-screen">Проверка сессии...</div>;
  }
  return <>{children}</>;
}
