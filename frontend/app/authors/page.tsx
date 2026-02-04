import type { Metadata } from 'next';

import { AuthorCard } from '../../components/AuthorCard';
import { AuthorsSearch } from '../../components/AuthorsSearch';
import { PaginationLinks } from '../../components/PaginationLinks';
import { apiFetch } from '../../lib/api-server';

export const metadata: Metadata = {
  title: 'Авторы — Шоирон',
  description: 'Каталог авторов и поиск по именам.',
};

export default async function AuthorsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const page = Number(searchParams.page || '1');
  const q = searchParams.q || '';
  const pageSize = 25;

  const [randomAuthors, popularAuthors, list] = await Promise.all([
    apiFetch('/api/v1/authors/random?limit=5', { revalidate: 60 }),
    apiFetch('/api/v1/authors?ordering=-popularity&page_size=5', { revalidate: 60 }),
    apiFetch(`/api/v1/authors?page=${page}&page_size=${pageSize}&q=${encodeURIComponent(q)}`, {
      revalidate: 60,
    }),
  ]);

  const totalPages = list.count ? Math.max(1, Math.ceil(list.count / pageSize)) : 1;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Авторы
        </h1>
        <AuthorsSearch />
      </section>

      <section className="grid gap-4">
        <h2 className="section-title">{q ? 'Результаты поиска' : 'Все авторы'}</h2>
        {list.results.length === 0 ? (
          <div className="text-sm text-muted">Ничего не найдено.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {list.results.map((author: any) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </div>
        )}
        <PaginationLinks basePath="/authors" page={page} totalPages={totalPages} query={{ q }} />
      </section>

      {!q && (
        <>
          <section className="grid gap-4">
            <h2 className="section-title">Случайные авторы</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {randomAuthors.map((author: any) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="section-title">Популярные авторы</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {popularAuthors.results.map((author: any) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
