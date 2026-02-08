export default function ContactsPage() {
  return (
    <div className="grid gap-8">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold brand-gradient-text md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
          Контакты
        </h1>
      </section>

      <section className="card mx-auto max-w-3xl p-8 text-center">
        <p className="text-lg text-ink/90">
          Мы всегда рады вашим отзывам, предложениям и пожеланиям. Свяжитесь с нами удобным способом.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <a href="mailto:contact@shoieron.tj" className="card group hover:-translate-y-1">
          <h2 className="text-lg font-semibold text-link">Email</h2>
          <p className="mt-2 text-muted">Напишите нам письмо</p>
          <p className="mt-2 font-medium text-ink group-hover:text-link">contact@shoieron.tj</p>
        </a>

        <a href="mailto:feedback@shoieron.tj" className="card group hover:-translate-y-1">
          <h2 className="text-lg font-semibold text-accent">Обратная связь</h2>
          <p className="mt-2 text-muted">Оставьте отзыв или предложение</p>
          <p className="mt-2 font-medium text-ink group-hover:text-accent">feedback@shoieron.tj</p>
        </a>

        <a
          href="https://twitter.com/shoiron"
          target="_blank"
          rel="noopener noreferrer"
          className="card group hover:-translate-y-1"
        >
          <h2 className="text-lg font-semibold text-link">Социальные сети</h2>
          <p className="mt-2 text-muted">Следите за проектом</p>
          <p className="mt-2 font-medium text-ink group-hover:text-link">@shoiron</p>
        </a>

        <a
          href="https://github.com/shoiron/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="card group hover:-translate-y-1"
        >
          <h2 className="text-lg font-semibold text-ink">GitHub</h2>
          <p className="mt-2 text-muted">Открытый исходный код</p>
          <p className="mt-2 font-medium text-ink group-hover:text-link">github.com/shoiron/portal</p>
        </a>
      </section>

      <section className="rounded-2xl border border-border bg-gradient-to-r from-link/10 to-accent/10 p-8 text-center">
        <h3 className="mb-3 text-xl font-bold text-ink">Сотрудничество</h3>
        <p className="text-ink/85">
          Если хотите помочь проекту материалами, переводами или идеями, пишите на{' '}
          <a href="mailto:partnership@shoieron.tj" className="font-semibold text-link hover:underline">
            partnership@shoieron.tj
          </a>
          .
        </p>
      </section>
    </div>
  );
}
