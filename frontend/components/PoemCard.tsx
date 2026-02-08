import Link from 'next/link';

import { withIdSlug } from '../lib/slug';

export type PoemCardData = {
  id: number;
  title: string;
  preview?: string;
  views?: number;
  author: { id: number; full_name: string; slug?: string };
  url_slug?: string;
};

export function PoemCard({ poem }: { poem: PoemCardData }) {
  const slug = poem.url_slug || withIdSlug(poem.id, poem.title, 'poem');

  return (
    <Link href={`/poems/${slug}`} className="card group flex h-full flex-col gap-3 hover:-translate-y-1">
      <h3
        className="line-clamp-2 text-2xl font-bold text-ink group-hover:text-link"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {poem.title}
      </h3>
      <p className="text-sm text-muted">{poem.author.full_name}</p>

      {poem.preview && (
        <pre className="line-clamp-3 whitespace-pre-line text-sm italic leading-relaxed text-ink/85">
          {poem.preview}
        </pre>
      )}

      {typeof poem.views === 'number' && (
        <div className="mt-auto inline-flex items-center gap-2 text-sm text-muted">
          <span aria-hidden>◉</span>
          <span>{poem.views} просмотров</span>
        </div>
      )}
    </Link>
  );
}
