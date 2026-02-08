export default function SupportPage() {
  return (
    <div className="grid gap-8">
      <section className="text-center">
        <div className="mb-4 text-5xl text-red-500">♥</div>
        <h1 className="text-4xl font-bold brand-gradient-text md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
          Поддержать проект
        </h1>
        <p className="mt-2 text-lg text-muted">Помогите нам сохранять культурное наследие.</p>
      </section>

      <section className="card p-8">
        <p className="text-lg leading-relaxed text-ink/90">
          Шоирон — некоммерческий проект, созданный для сохранения и популяризации персидско-таджикской поэзии.
          Ваша поддержка помогает развивать портал и добавлять новые произведения.
        </p>
      </section>

      <section className="grid gap-6">
        <div className="card border-2 border-link/25">
          <h2 className="mb-3 text-xl font-semibold text-link">Разовая поддержка</h2>
          <p className="mb-4 text-muted">Каждый вклад помогает проекту развиваться.</p>
          <button type="button" className="btn-primary w-full justify-center">
            Поддержать проект
          </button>
        </div>

        <div className="card border-2 border-accent/25">
          <h2 className="mb-3 text-xl font-semibold text-accent">Ежемесячная подписка</h2>
          <p className="mb-4 text-muted">Станьте постоянным спонсором портала.</p>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <button type="button" className="btn-secondary h-auto flex-col rounded-xl py-3">
              <span className="text-xs text-muted">от</span>
              <span className="text-lg font-bold">$5</span>
              <span className="text-xs text-muted">в месяц</span>
            </button>
            <button type="button" className="btn-secondary h-auto flex-col rounded-xl py-3">
              <span className="text-xs text-muted">от</span>
              <span className="text-lg font-bold">$10</span>
              <span className="text-xs text-muted">в месяц</span>
            </button>
            <button type="button" className="btn-secondary h-auto flex-col rounded-xl py-3">
              <span className="text-xs text-muted">от</span>
              <span className="text-lg font-bold">$25</span>
              <span className="text-xs text-muted">в месяц</span>
            </button>
          </div>
          <button type="button" className="btn-primary w-full justify-center">
            Стать спонсором
          </button>
        </div>

        <div className="card border-2 border-border">
          <h2 className="mb-3 text-xl font-semibold text-ink">Другие способы помочь</h2>
          <ul className="grid gap-2 text-ink/90">
            <li>• Расскажите о проекте друзьям и в соцсетях</li>
            <li>• Предложите новые стихотворения или исправления</li>
            <li>• Помогите с переводами или технической частью</li>
            <li>• Оставьте отзыв по улучшению портала</li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-gradient-to-r from-link/10 to-accent/10 p-8 text-center">
        <h3 className="mb-3 text-2xl font-bold text-ink">Спасибо за вашу поддержку</h3>
        <p className="mx-auto max-w-3xl text-ink/85">
          Каждый вклад, большой или маленький, помогает нам сохранять и развивать пространство поэзии.
        </p>
      </section>
    </div>
  );
}
