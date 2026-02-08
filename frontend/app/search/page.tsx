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
    <div className="grid gap-8">
      <section>
        <div className="mb-2 inline-flex items-center gap-2 text-link">
          <span aria-hidden>⌕</span>
          <h1 className="text-4xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Результаты поиска
          </h1>
        </div>
        <p className="text-muted">
          По запросу: <span className="font-semibold text-ink">"{q || '—'}"</span>
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-5 text-2xl font-bold text-link">Авторы ({data.authors.results.length})</h2>
          {data.authors.results.length === 0 ? (
            <p className="py-8 text-center text-muted">Авторы не найдены.</p>
          ) : (
            <div className="grid gap-3">
              {data.authors.results.map((author: any) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
          )}
          <PaginationLinks basePath="/search" page={page} totalPages={authorsPages} query={{ q }} />
        </section>

        <section className="card">
          <h2 className="mb-5 text-2xl font-bold text-accent">Стихи ({data.poems.results.length})</h2>
          {data.poems.results.length === 0 ? (
            <p className="py-8 text-center text-muted">Стихи не найдены.</p>
          ) : (
            <div className="grid gap-3">
              {data.poems.results.map((poem: any) => (
                <PoemCard key={poem.id} poem={poem} />
              ))}
            </div>
          )}
          <PaginationLinks basePath="/search" page={page} totalPages={poemsPages} query={{ q }} />
        </section>
      </div>

      {data.authors.results.length === 0 && data.poems.results.length === 0 && (
        <section className="card py-12 text-center">
          <p className="text-xl font-semibold text-ink">Ничего не найдено</p>
          <p className="mt-2 text-muted">Попробуйте изменить поисковый запрос.</p>
        </section>
      )}
    </div>
  );
}
