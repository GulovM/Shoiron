'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { href: '/', label: 'Главная' },
  { href: '/authors', label: 'Авторы' },
  { href: '/about', label: 'О проекте' },
  { href: '/contacts', label: 'Контакты' },
  { href: '/support', label: 'Поддержать проект' },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/85 backdrop-blur-md">
      <div className="container-shell py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-3xl font-bold leading-none brand-gradient-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Шоирон
          </Link>

          <form onSubmit={handleSubmit} className="relative ml-auto hidden flex-1 md:block md:max-w-md">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">⌕</span>
            <input
              type="search"
              placeholder="Поиск по авторам и стихам..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-shell pl-10"
            />
          </form>

          <nav className="hidden items-center gap-4 lg:flex">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm ${
                    isActive ? 'text-link font-semibold' : 'text-ink/80 hover:text-link'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="btn-secondary px-3 lg:hidden"
            aria-label="Открыть меню"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative mt-4 md:hidden">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">⌕</span>
          <input
            type="search"
            placeholder="Поиск..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-shell pl-10"
          />
        </form>

        {mobileMenuOpen && (
          <nav className="mt-4 grid gap-1 border-t border-border pt-3 lg:hidden">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-2 py-2 text-sm ${
                    isActive ? 'bg-link/10 text-link' : 'text-ink/80 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
