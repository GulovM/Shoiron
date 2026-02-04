'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-sand/90 backdrop-blur">
      <div className="container-shell flex flex-wrap items-center justify-between gap-4 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Шоирон
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="text-ink hover:text-link">
            Главная
          </Link>
          <Link href="/authors" className="text-ink hover:text-link">
            Авторы
          </Link>
          <Link href="/about" className="text-ink hover:text-link">
            О проекте
          </Link>
          <Link href="/contacts" className="text-ink hover:text-link">
            Контакты
          </Link>
          <Link href="/support" className="text-accent hover:text-gold">
            Поддержать проект
          </Link>
        </nav>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) {
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="search"
            placeholder="Поиск стихов и авторов"
            className="w-52 rounded-full border border-border/60 bg-surface/80 px-3 py-1 text-sm text-ink outline-none placeholder:text-muted focus:border-link/70"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="submit"
            className="rounded-full border border-border/60 px-3 py-1 text-sm transition hover:border-border"
          >
            Найти
          </button>
          <ThemeToggle />
        </form>
      </div>
    </header>
  );
}
