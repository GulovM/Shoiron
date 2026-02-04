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
    <Link href={`/poems/${slug}`} className="card flex flex-col gap-3 transition hover:-translate-y-1">
      <div className="text-sm text-link">{poem.author.full_name}</div>
      <div className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        {poem.title}
      </div>
      {poem.preview && <pre className="whitespace-pre-line text-sm opacity-80">{poem.preview}</pre>}
      {typeof poem.views === 'number' && (
        <div className="text-xs opacity-60">Просмотров: {poem.views}</div>
      )}
    </Link>
  );
}
