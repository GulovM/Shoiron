'use client';

import { useRouter } from 'next/navigation';

import { getApiBase } from '../lib/api-client';

export function NextRandomButton({ label }: { label: string }) {
  const router = useRouter();

  const handleClick = async () => {
    const res = await fetch(`${getApiBase()}/api/v1/home/recommendation/next`, {
      credentials: 'include',
    });
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
      className="rounded-full border border-border/60 px-4 py-2 text-sm transition hover:border-border"
    >
      {label}
    </button>
  );
}
