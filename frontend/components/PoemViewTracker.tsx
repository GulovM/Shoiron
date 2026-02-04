'use client';

import { useEffect } from 'react';

import { getApiBase } from '../lib/api-client';

export function PoemViewTracker({ poemId }: { poemId: number }) {
  useEffect(() => {
    fetch(`${getApiBase()}/api/v1/poems/${poemId}/view`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
  }, [poemId]);

  return null;
}
