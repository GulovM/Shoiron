export default function AboutPage() {
  return (
    <div className="grid gap-8">
      <section className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold brand-gradient-text md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
          О проекте Шоирон
        </h1>
      </section>

      <section className="card mx-auto max-w-4xl p-8 md:p-10">
        <p className="text-lg leading-relaxed text-ink/90">
          <span className="font-semibold text-link">Шоирон</span> — цифровой портал, посвященный сохранению и
          популяризации классической и современной персидско-таджикской поэзии.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-ink/90">
          Наша миссия — сделать поэтическое наследие доступным для всех, кто интересуется литературой и культурой.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card border-2 hover:border-link/35">
          <h2 className="mb-2 text-xl font-semibold text-ink">Богатая коллекция</h2>
          <p className="text-muted">
            Сотни стихотворений классических и современных авторов, аккуратно собранных в едином каталоге.
          </p>
        </div>
        <div className="card border-2 hover:border-accent/35">
          <h2 className="mb-2 text-xl font-semibold text-ink">Известные авторы</h2>
          <p className="text-muted">
            От Рудаки и Хафиза до современных поэтов, с отдельными карточками и биографиями.
          </p>
        </div>
        <div className="card border-2 hover:border-link/35">
          <h2 className="mb-2 text-xl font-semibold text-ink">Интерактивность</h2>
          <p className="text-muted">
            Реакции на стихи, персональные рекомендации и быстрые переходы между произведениями.
          </p>
        </div>
        <div className="card border-2 hover:border-accent/35">
          <h2 className="mb-2 text-xl font-semibold text-ink">Доступность</h2>
          <p className="text-muted">
            Удобный поиск, адаптивный интерфейс и поддержка светлой и темной темы.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-gradient-to-r from-link/10 to-accent/10 p-8 text-center">
        <h3 className="mb-3 text-2xl font-bold text-ink">Наша цель</h3>
        <p className="mx-auto max-w-3xl text-ink/85">
          Сохранить культурное наследие и сделать поэзию живой частью цифрового пространства для новых поколений
          читателей.
        </p>
      </section>
    </div>
  );
}
