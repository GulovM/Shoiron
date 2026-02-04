import type { Metadata } from 'next';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { notFound } from 'next/navigation';

import { AuthorCard } from '../../../components/AuthorCard';
import { AuthorPoemsList } from '../../../components/AuthorPoemsList';
import { apiFetch } from '../../../lib/api-server';
import { withIdSlug } from '../../../lib/slug';

type ParamValue = string | string[] | undefined;

function getParamValue(params: Record<string, ParamValue>) {
  const value = params.id ?? params.slug ?? Object.values(params)[0];
  return Array.isArray(value) ? value[0] : value;
}

function parseId(params: Record<string, ParamValue>) {
  const raw = getParamValue(params);
  if (!raw) return null;
  const [idPart] = raw.split('-');
  const id = Number(idPart);
  return Number.isNaN(id) ? null : id;
}

export async function generateMetadata({
  params,
}: {
  params: Record<string, string | string[]>;
}): Promise<Metadata> {
  const id = parseId(params);
  if (!id) {
    return {
      title: 'Автор — Шоирон',
      description: 'Автор портала Шоирон.',
    };
  }
  const author = await apiFetch(`/api/v1/authors/${id}`, { revalidate: 60 });
  const slug = withIdSlug(author.id, author.full_name, 'author');
  return {
    title: `${author.full_name} — Шоирон`,
    description: author.biography_md?.slice(0, 140),
    alternates: { canonical: `/authors/${slug}` },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Record<string, string | string[]>;
}) {
  const id = parseId(params);
  if (!id) {
    notFound();
  }
  const author = await apiFetch(`/api/v1/authors/${id}`, { revalidate: 60 });
  const poemsPage = await apiFetch(`/api/v1/authors/${id}/poems?page=1&page_size=25`, {
    cache: 'no-store',
  });
  const randomAuthors = await apiFetch(`/api/v1/authors/random?limit=5&exclude=${id}`, {
    revalidate: 60,
  });

  const bioHtml = author.biography_md
    ? DOMPurify.sanitize(marked.parse(author.biography_md))
    : '';

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-6 rounded-3xl border border-border/60 bg-surface/90 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="h-28 w-28 overflow-hidden rounded-2xl border border-border/60">
            {author.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.photo_url} alt={author.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gold/15 text-xs uppercase tracking-wide text-muted">
                SH
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {author.full_name}
            </h1>
            <div className="text-sm opacity-70">
              {author.birth_date || '—'} — {author.death_date || '—'}
            </div>
            <div className="text-sm opacity-70">Стихов: {author.poems_count}</div>
          </div>
        </div>
        {bioHtml && (
          <div
            className="prose max-w-none text-sm leading-relaxed opacity-90 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: bioHtml }}
          />
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="section-title">Стихи автора</h2>
        <AuthorPoemsList authorId={author.id} initial={poemsPage} />
      </section>

      <section className="grid gap-4">
        <h2 className="section-title">Другие авторы</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {randomAuthors.map((item: any) => (
            <AuthorCard key={item.id} author={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
