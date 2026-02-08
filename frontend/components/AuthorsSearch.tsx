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
      className="relative w-full"
    >
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted">⌕</span>
      <input
        type="search"
        placeholder="Поиск автора по имени..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="input-shell h-14 pl-10 text-base"
      />
    </form>
  );
}
