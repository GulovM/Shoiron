import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { NextRandomButton } from '../../../components/NextRandomButton';
import { PoemViewTracker } from '../../../components/PoemViewTracker';
import { ReactionBar } from '../../../components/ReactionBar';
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
      title: 'Стих — Шоирон',
      description: 'Поэтическая страница портала Шоирон.',
    };
  }
  const poem = await apiFetch(`/api/v1/poems/${id}`, { cache: 'no-store' });
  const slug = withIdSlug(poem.id, poem.title, 'poem');
  return {
    title: `${poem.title} — ${poem.author.full_name}`,
    description: poem.text?.slice(0, 140),
    alternates: { canonical: `/poems/${slug}` },
  };
}

export default async function PoemPage({
  params,
  searchParams,
}: {
  params: Record<string, string | string[]>;
  searchParams: { from?: string; authorId?: string };
}) {
  const id = parseId(params);
  if (!id) {
    notFound();
  }
  const poem = await apiFetch(`/api/v1/poems/${id}`, { cache: 'no-store' });
  const cameFromAuthor = searchParams.from === 'author' && searchParams.authorId;

  let neighbors: { prev: any; next: any } | null = null;
  if (cameFromAuthor) {
    neighbors = await apiFetch(`/api/v1/poems/${id}/neighbors?author_id=${searchParams.authorId}`, {
      cache: 'no-store',
    });
  }

  return (
    <div className="grid gap-8">
      <PoemViewTracker poemId={poem.id} />

      <Link
        href={cameFromAuthor ? `/authors/${withIdSlug(poem.author.id, poem.author.full_name, 'author')}` : '/'}
        className="btn-secondary w-fit"
      >
        ← {cameFromAuthor ? 'К автору' : 'Назад'}
      </Link>

      <article className="card p-6 md:p-10">
        <Link
          href={`/authors/${withIdSlug(poem.author.id, poem.author.full_name, 'author')}`}
          className="mb-5 inline-flex w-fit items-center gap-3"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-link/25 bg-link/10 font-semibold text-link">
            {poem.author.full_name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <span className="block text-xs text-muted">Автор</span>
            <span className="font-semibold text-ink hover:text-link">{poem.author.full_name}</span>
          </span>
        </Link>

        <h1
          className="mb-6 text-4xl font-bold brand-gradient-text md:text-5xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {poem.title}
        </h1>

        <pre className="whitespace-pre-wrap text-lg italic leading-[1.9] text-ink/90">{poem.text}</pre>

        {typeof poem.views === 'number' && (
          <p className="mt-6 text-sm text-muted">{poem.views} просмотров</p>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-4 text-sm font-semibold text-ink">Реакции</p>
          <ReactionBar
            poemId={poem.id}
            initialCounts={poem.reactions.counts_by_type}
            initialFlags={poem.reactions.user_flags_by_type}
          />
        </div>
      </article>

      {cameFromAuthor && neighbors ? (
        <div className="grid gap-3 md:grid-cols-2">
          {neighbors.prev && (
            <Link
              href={`/poems/${neighbors.prev.url_slug}?from=author&authorId=${searchParams.authorId}`}
              className="btn-secondary justify-start rounded-xl py-4"
            >
              ← {neighbors.prev.title}
            </Link>
          )}
          {neighbors.next && (
            <Link
              href={`/poems/${neighbors.next.url_slug}?from=author&authorId=${searchParams.authorId}`}
              className="btn-secondary justify-end rounded-xl py-4"
            >
              {neighbors.next.title} →
            </Link>
          )}
        </div>
      ) : (
        <div>
          <NextRandomButton label="К следующему рекомендуемому стиху" />
        </div>
      )}
    </div>
  );
}
