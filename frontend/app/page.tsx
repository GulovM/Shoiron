import Link from 'next/link';

import { PoemCard } from '../components/PoemCard';
import { RandomPoemButton } from '../components/RandomPoemButton';
import { apiFetch } from '../lib/api-server';
import { withIdSlug } from '../lib/slug';

export default async function HomePage() {
  const data = await apiFetch('/api/v1/home', { revalidate: 60 });

  return (
    <div className="grid gap-12 pb-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-link/10 to-accent/10 px-4 py-16 text-center md:px-8 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h1
            className="mb-6 text-6xl font-bold md:text-7xl lg:text-8xl brand-gradient-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Шоирон
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-ink/85 md:text-2xl">
            {data.hero_text}
          </p>
          <RandomPoemButton />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 md:gap-8">
        <div className="card border-2 hover:border-link/40">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-link/15 text-2xl text-link">👤</div>
            <div>
              <p className="text-3xl font-bold text-link">{data.stats.authors_count}</p>
              <p className="text-muted">Авторов</p>
            </div>
          </div>
        </div>

        <div className="card border-2 hover:border-accent/40">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-accent/15 text-2xl text-accent">📚</div>
            <div>
              <p className="text-3xl font-bold text-accent">{data.stats.poems_count}</p>
              <p className="text-muted">Стихотворений</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="flex items-center gap-3">
          <span className="text-link">📈</span>
          <h2 className="section-title">Популярные стихотворения</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.top_poems.map((poem: any) => (
            <PoemCard key={poem.id} poem={poem} />
          ))}
        </div>
      </section>

      <section className="grid gap-6">
        <div className="flex items-center gap-3">
          <span className="text-accent">✦</span>
          <h2 className="section-title">Популярные авторы</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {data.top_authors.map((author: any) => (
            <Link
              key={author.id}
              href={`/authors/${author.url_slug || withIdSlug(author.id, author.full_name, 'author')}`}
              className="card group text-center hover:-translate-y-1"
            >
              <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-link/20">
                {author.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={author.photo_url} alt={author.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-link/10 font-semibold text-link">
                    {author.full_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-ink group-hover:text-link">{author.full_name}</h3>
              <p className="mt-1 text-sm text-muted">{author.poems_count} стихотворений</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
