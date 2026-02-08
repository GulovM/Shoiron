'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/authors', label: 'Authors' },
  { href: '/poems', label: 'Poems' },
  { href: '/users', label: 'Users' },
  { href: '/roles', label: 'Roles' },
  { href: '/settings', label: 'Site Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Shoiron Dashboard</div>
      <nav className="sidebar-nav">
        {LINKS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} className={`sidebar-link ${active ? 'active' : ''}`} href={item.href}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div>{profile?.full_name}</div>
          <div className="sidebar-role">{profile?.role?.name}</div>
        </div>
        <button type="button" onClick={onLogout} className="btn btn-secondary w-full">
          Logout
        </button>
      </div>
    </aside>
  );
}
