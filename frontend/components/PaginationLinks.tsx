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
    <div className="mt-6 flex items-center justify-center gap-2">
      <Link
        href={buildUrl(Math.max(1, page - 1))}
        className={`btn-secondary ${page === 1 ? 'pointer-events-none opacity-45' : ''}`}
      >
        Предыдущая
      </Link>
      <span className="px-2 text-sm text-muted">
        Страница {page} из {totalPages}
      </span>
      <Link
        href={buildUrl(Math.min(totalPages, page + 1))}
        className={`btn-secondary ${page === totalPages ? 'pointer-events-none opacity-45' : ''}`}
      >
        Следующая
      </Link>
    </div>
  );
}
