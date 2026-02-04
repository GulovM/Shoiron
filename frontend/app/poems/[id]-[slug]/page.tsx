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
    neighbors = await apiFetch(
      `/api/v1/poems/${id}/neighbors?author_id=${searchParams.authorId}`,
      { cache: 'no-store' }
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PoemViewTracker poemId={poem.id} />
      <div className="flex flex-col gap-2">
        <Link
          href={`/authors/${withIdSlug(poem.author.id, poem.author.full_name, 'author')}`}
          className="text-sm text-link"
        >
          {poem.author.full_name}
        </Link>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          {poem.title}
        </h1>
      </div>

      <article className="rounded-2xl border border-border/60 bg-surface/90 p-6 text-lg leading-relaxed shadow-soft">
        <pre className="whitespace-pre-wrap">{poem.text}</pre>
      </article>

      <div className="flex flex-col gap-3">
        <div className="text-sm uppercase tracking-wide text-gold">Реакции</div>
        <ReactionBar
          poemId={poem.id}
          initialCounts={poem.reactions.counts_by_type}
          initialFlags={poem.reactions.user_flags_by_type}
        />
      </div>

      {cameFromAuthor && neighbors ? (
        <div className="flex flex-wrap gap-3">
          {neighbors.prev && (
            <Link
              href={`/poems/${neighbors.prev.url_slug}?from=author&authorId=${searchParams.authorId}`}
              className="rounded-full border border-border/60 px-4 py-2 text-sm transition hover:border-border"
            >
              Ба шеъри гузашта
            </Link>
          )}
          {neighbors.next && (
            <Link
              href={`/poems/${neighbors.next.url_slug}?from=author&authorId=${searchParams.authorId}`}
              className="rounded-full border border-border/60 px-4 py-2 text-sm transition hover:border-border"
            >
              Ба шеъри навбатии муаллиф
            </Link>
          )}
        </div>
      ) : (
        <NextRandomButton label="К следующему рекомендуемому стиху" />
      )}
    </div>
  );
}
