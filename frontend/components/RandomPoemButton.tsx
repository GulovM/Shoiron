'use client';

import { useRouter } from 'next/navigation';

import { getApiBase } from '../lib/api-client';

export function RandomPoemButton() {
  const router = useRouter();

  const handleClick = async () => {
    const res = await fetch(`${getApiBase()}/api/v1/poems/random`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.url_slug) {
      router.push(`/poems/${data.url_slug}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-full bg-accent px-6 py-3 text-sm uppercase tracking-wide text-sand transition hover:bg-accent/90"
    >
      Гузариш ба хондан
    </button>
  );
}
