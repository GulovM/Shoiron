'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getApiBase } from '../lib/api-client';
import { withIdSlug } from '../lib/slug';

export type AuthorPoemsPage = {
  count: number;
  page: number;
  page_size: number;
  results: Array<{ id: number; title: string; views: number }>;
};

export function AuthorPoemsList({ authorId, initial }: { authorId: number; initial: AuthorPoemsPage }) {
  const [page, setPage] = useState(initial.page);
  const [data, setData] = useState<AuthorPoemsPage>(initial);
  const totalPages = Math.ceil(data.count / data.page_size);

  useEffect(() => {
    if (page === data.page) return;
    const load = async () => {
      const res = await fetch(
        `${getApiBase()}/api/v1/authors/${authorId}/poems?page=${page}&page_size=${data.page_size}`,
        { credentials: 'include' }
      );
      if (!res.ok) return;
      const payload = await res.json();
      setData(payload);
    };
    load().catch(() => undefined);
  }, [authorId, page, data.page, data.page_size]);

  return (
    <div className="grid gap-4">
      {data.results.map((poem) => (
        <Link
          key={poem.id}
          href={`/poems/${withIdSlug(poem.id, poem.title, 'poem')}?from=author&authorId=${authorId}`}
          className="rounded-xl border border-border bg-surface p-4 transition hover:border-link/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-ink">{poem.title}</h3>
              <p className="text-sm text-muted">{poem.views} просмотров</p>
            </div>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </div>
        </Link>
      ))}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-45"
          >
            Предыдущая
          </button>
          <span className="text-muted">
            Страница {page} из {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary disabled:opacity-45"
          >
            Следующая
          </button>
        </div>
      )}
    </div>
  );
}
