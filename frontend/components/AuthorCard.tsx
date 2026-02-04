import Link from 'next/link';

import { withIdSlug } from '../lib/slug';

export type AuthorCardData = {
  id: number;
  full_name: string;
  birth_date?: string | null;
  death_date?: string | null;
  poems_count?: number;
  popularity?: number;
  photo_url?: string | null;
  slug?: string;
  url_slug?: string;
};

function formatDates(birth?: string | null, death?: string | null) {
  if (!birth && !death) return null;
  return `${birth || '—'} — ${death || '—'}`;
}

export function AuthorCard({ author }: { author: AuthorCardData }) {
  const slug = author.url_slug || withIdSlug(author.id, author.full_name, 'author');
  return (
    <Link href={`/authors/${slug}`} className="card flex items-center gap-4 transition hover:-translate-y-1">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border/60">
        {author.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.photo_url} alt={author.full_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gold/15 text-xs uppercase tracking-wide text-muted">
            SH
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          {author.full_name}
        </div>
        {formatDates(author.birth_date, author.death_date) && (
          <div className="text-xs opacity-60">{formatDates(author.birth_date, author.death_date)}</div>
        )}
        {typeof author.poems_count === 'number' && (
          <div className="text-xs opacity-70">Стихов: {author.poems_count}</div>
        )}
      </div>
    </Link>
  );
}
