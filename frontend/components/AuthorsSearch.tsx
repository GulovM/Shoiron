'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AuthorsSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams(params.toString());
        if (query.trim()) {
          next.set('q', query.trim());
        } else {
          next.delete('q');
        }
        next.set('page', '1');
        router.push(`/authors?${next.toString()}`);
      }}
      className="flex flex-wrap gap-2"
    >
      <input
        type="search"
        placeholder="Поиск по имени автора"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-64 rounded-full border border-border/60 bg-surface/80 px-3 py-1 text-sm text-ink outline-none placeholder:text-muted focus:border-link/70"
      />
      <button
        type="submit"
        className="rounded-full border border-border/60 px-3 py-1 text-sm transition hover:border-border"
      >
        Найти
      </button>
    </form>
  );
}
