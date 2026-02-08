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
    <div className="grid gap-8">
      <section>
        <h1 className="mb-3 text-4xl font-bold brand-gradient-text md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
          Каталог авторов
        </h1>
        <p className="text-muted">Исследуйте творчество классических и современных поэтов.</p>
      </section>

      <section className="card">
        <AuthorsSearch />
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="card">
            <h2 className="mb-5 text-2xl font-bold text-ink">
              {q ? `Результаты поиска (${list.count})` : 'Все авторы'}
            </h2>
            {list.results.length === 0 ? (
              <p className="py-10 text-center text-muted">Ничего не найдено.</p>
            ) : (
              <div className="grid gap-4">
                {list.results.map((author: any) => (
                  <AuthorCard key={author.id} author={author} />
                ))}
              </div>
            )}
            <PaginationLinks basePath="/authors" page={page} totalPages={totalPages} query={{ q }} />
          </div>
        </section>

        {!q && (
          <aside className="grid gap-6">
            <div className="card">
              <h3 className="mb-4 text-lg font-semibold text-accent">Случайные авторы</h3>
              <div className="grid gap-3">
                {randomAuthors.map((author: any) => (
                  <AuthorCard key={author.id} author={author} />
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="mb-4 text-lg font-semibold text-link">Популярные авторы</h3>
              <div className="grid gap-3">
                {popularAuthors.results.map((author: any) => (
                  <AuthorCard key={author.id} author={author} />
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
