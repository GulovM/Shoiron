import type { Metadata } from 'next';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import Link from 'next/link';
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
    ? DOMPurify.sanitize(marked.parse(author.biography_md, { async: false }) as string)
    : '';

  return (
    <div className="grid gap-8">
      <Link href="/authors" className="btn-secondary w-fit">
        ← К каталогу авторов
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="grid gap-6 lg:col-span-2">
          <div className="card p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-link/25">
                {author.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={author.photo_url} alt={author.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-link/10 text-link">SH</div>
                )}
              </div>

              <div>
                <h1
                  className="text-4xl font-bold brand-gradient-text md:text-5xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {author.full_name}
                </h1>
                <p className="mt-2 text-muted">
                  {author.birth_date || '—'} — {author.death_date || '—'}
                </p>
                <p className="text-muted">{author.poems_count} стихотворений</p>
              </div>
            </div>
          </div>

          {bioHtml && (
            <div className="card">
              <h2 className="mb-4 text-2xl font-bold text-ink">Биография</h2>
              <div className="poetry-prose" dangerouslySetInnerHTML={{ __html: bioHtml }} />
            </div>
          )}

          <div className="card">
            <h2 className="mb-4 text-2xl font-bold text-ink">Стихотворения</h2>
            <AuthorPoemsList authorId={author.id} initial={poemsPage} />
          </div>
        </section>

        <aside>
          <div className="card lg:sticky lg:top-24">
            <h3 className="mb-4 text-lg font-semibold text-link">Другие авторы</h3>
            <div className="grid gap-3">
              {randomAuthors.map((item: any) => (
                <AuthorCard key={item.id} author={item} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
