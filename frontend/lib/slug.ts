export function slugify(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return normalized || fallback;
}

export function withIdSlug(id: number | string, value: string, fallback: string): string {
  return `${id}-${slugify(value, fallback)}`;
}
