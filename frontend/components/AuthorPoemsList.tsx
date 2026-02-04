'use client';

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
    <div className="flex flex-col gap-4">
      <div className="grid gap-3">
        {data.results.map((poem) => (
          <a
            key={poem.id}
            href={`/poems/${withIdSlug(poem.id, poem.title, 'poem')}?from=author&authorId=${authorId}`}
            className="rounded-xl border border-border/60 px-4 py-3 text-sm transition hover:border-border"
          >
            <div className="font-semibold">{poem.title}</div>
            <div className="text-xs opacity-60">Просмотров: {poem.views}</div>
          </a>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-full border border-border/60 px-3 py-1 disabled:opacity-40"
          >
            Назад
          </button>
          <div>
            Страница {page} из {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-full border border-border/60 px-3 py-1 disabled:opacity-40"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}
