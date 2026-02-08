'use client';

import { RequireAuth } from '@/components/RequireAuth';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="app-shell">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </RequireAuth>
  );
}
