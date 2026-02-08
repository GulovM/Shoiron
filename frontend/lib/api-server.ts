import { cookies } from 'next/headers';

type FetchOptions = RequestInit & { revalidate?: number | false };

export function getApiBase(): string {
  return process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

export async function apiFetch(path: string, options: FetchOptions = {}) {
  const base = getApiBase();
  const url = `${base}${path}`;

  const headers = new Headers(options.headers || {});
  const cookieStore = cookies();
  const cookie = cookieStore.toString();
  if (cookie) {
    headers.set('cookie', cookie);
  }

  const init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    ...options,
    headers,
  };

  if (options.revalidate !== undefined) {
    init.next = {
      ...(options.next || {}),
      revalidate: options.revalidate,
    };
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json();
}
