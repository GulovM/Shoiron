import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const now = new Date().toISOString();

  return [
    { url: `${site}/`, lastModified: now },
    { url: `${site}/authors`, lastModified: now },
    { url: `${site}/about`, lastModified: now },
    { url: `${site}/contacts`, lastModified: now },
    { url: `${site}/support`, lastModified: now },
  ];
}
