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

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AuthorCard({ author }: { author: AuthorCardData }) {
  const slug = author.url_slug || withIdSlug(author.id, author.full_name, 'author');
  const dates = formatDates(author.birth_date, author.death_date);
  const initials = getInitials(author.full_name) || 'SH';

  return (
    <Link
      href={`/authors/${slug}`}
      className="card group flex items-center gap-4 p-4 hover:-translate-y-1"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-link/25">
        {author.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.photo_url} alt={author.full_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-link/10 text-sm font-semibold uppercase text-link">
            {initials}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className="truncate text-lg font-semibold text-ink group-hover:text-link"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {author.full_name}
        </h3>
        {dates && <p className="text-xs text-muted">{dates}</p>}
        {typeof author.poems_count === 'number' && (
          <p className="text-xs text-muted">{author.poems_count} стихотворений</p>
        )}
      </div>
    </Link>
  );
}
