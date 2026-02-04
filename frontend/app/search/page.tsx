import type { Metadata } from 'next';

import { AuthorCard } from '../../components/AuthorCard';
import { PaginationLinks } from '../../components/PaginationLinks';
import { PoemCard } from '../../components/PoemCard';
import { apiFetch } from '../../lib/api-server';

export const metadata: Metadata = {
  title: 'Поиск — Шоирон',
  description: 'Поиск по авторам и стихам',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = searchParams.q || '';
  const page = Number(searchParams.page || '1');

  const data = await apiFetch(`/api/v1/search?q=${encodeURIComponent(q)}&page=${page}&page_size=25`, {
    cache: 'no-store',
  });

  const authorsPages = Math.ceil(data.authors.count / data.authors.page_size) || 1;
  const poemsPages = Math.ceil(data.poems.count / data.poems.page_size) || 1;

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-2">
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Результаты поиска
        </h1>
        <div className="text-sm opacity-70">Запрос: {q || '—'}</div>
      </section>

      <section className="grid gap-4">
        <h2 className="section-title">Авторы</h2>
        {data.authors.results.length === 0 ? (
          <div className="text-sm opacity-60">Ничего не найдено.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.authors.results.map((author: any) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </div>
        )}
        <PaginationLinks basePath="/search" page={page} totalPages={authorsPages} query={{ q }} />
      </section>

      <section className="grid gap-4">
        <h2 className="section-title">Стихи</h2>
        {data.poems.results.length === 0 ? (
          <div className="text-sm opacity-60">Ничего не найдено.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.poems.results.map((poem: any) => (
              <PoemCard key={poem.id} poem={poem} />
            ))}
          </div>
        )}
        <PaginationLinks basePath="/search" page={page} totalPages={poemsPages} query={{ q }} />
      </section>
    </div>
  );
}
