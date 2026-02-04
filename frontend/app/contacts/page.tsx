export default function ContactsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        Контакты
      </h1>
      <p className="text-lg opacity-80">
        Для вопросов и предложений пишите на почту:
        <span className="ml-2 font-semibold">contact@shoieron.tj</span>
      </p>
      <p className="text-lg opacity-80">
        Мы отвечаем на письма в течение 2-3 рабочих дней.
      </p>
    </div>
  );
}