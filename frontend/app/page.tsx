import { AuthorCard } from '../components/AuthorCard';
import { PoemCard } from '../components/PoemCard';
import { RandomPoemButton } from '../components/RandomPoemButton';
import { apiFetch } from '../lib/api-server';

export default async function HomePage() {
  const data = await apiFetch('/api/v1/home', { revalidate: 60 });

  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-6 rounded-3xl border border-border/60 bg-gradient-to-br from-surface to-sand px-8 py-10 shadow-soft">
        <div className="text-sm uppercase tracking-[0.2em] text-gold">Шоирон</div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          {data.hero_text}
        </h1>
        <div>
          <RandomPoemButton />
        </div>
        <div className="flex gap-8 text-sm text-muted">
          <div>Авторы: {data.stats.authors_count}</div>
          <div>Стихи: {data.stats.poems_count}</div>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="section-title">Топ стихов</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.top_poems.map((poem: any) => (
            <PoemCard key={poem.id} poem={poem} />
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="section-title">Популярные авторы</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.top_authors.map((author: any) => (
            <AuthorCard key={author.id} author={author} />
          ))}
        </div>
      </section>
    </div>
  );
}
