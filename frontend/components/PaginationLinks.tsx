import Link from 'next/link';

export function PaginationLinks({
  page,
  totalPages,
  basePath,
  query,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query: Record<string, string | undefined>;
}) {
  if (!Number.isFinite(totalPages) || totalPages <= 1) return null;

  const buildUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('page', String(nextPage));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href={buildUrl(Math.max(1, page - 1))}
        className={`rounded-full border border-border/60 px-3 py-1 ${page === 1 ? 'pointer-events-none opacity-40' : ''}`}
      >
        Назад
      </Link>
      <div>
        Страница {page} из {totalPages}
      </div>
      <Link
        href={buildUrl(Math.min(totalPages, page + 1))}
        className={`rounded-full border border-border/60 px-3 py-1 ${page === totalPages ? 'pointer-events-none opacity-40' : ''}`}
      >
        Далее
      </Link>
    </div>
  );
}
