export default function AboutPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        О проекте
      </h1>
      <p className="text-lg opacity-80">
        «Шоирон» — открытый портал, где собраны стихи классических и современных авторов. Мы
        сохраняем поэтическое наследие, делаем его доступным и удобным для поиска.
      </p>
      <p className="text-lg opacity-80">
        Проект развивается как общественная инициатива. Мы приветствуем новые материалы,
        предложения и идеи сотрудничества.
      </p>
    </div>
  );
}