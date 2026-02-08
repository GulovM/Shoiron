'use client';

import { useState } from 'react';

import { getApiBase } from '../lib/api-client';

const TYPES = [
  { key: 'heart', label: '❤', activeClass: 'text-red-500 border-red-300 bg-red-50 dark:bg-red-950/30' },
  { key: 'fire', label: '🔥', activeClass: 'text-orange-500 border-orange-300 bg-orange-50 dark:bg-orange-950/30' },
  { key: 'like', label: '👍', activeClass: 'text-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950/30' },
  { key: 'sad', label: '🥀', activeClass: 'text-violet-500 border-violet-300 bg-violet-50 dark:bg-violet-950/30' },
  { key: 'star', label: '★', activeClass: 'text-yellow-500 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30' },
];

export type ReactionCounts = Record<string, number>;
export type ReactionFlags = Record<string, boolean>;

export function ReactionBar({
  poemId,
  initialCounts,
  initialFlags,
}: {
  poemId: number;
  initialCounts: ReactionCounts;
  initialFlags: ReactionFlags;
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [flags, setFlags] = useState(initialFlags);
  const [loading, setLoading] = useState<string | null>(null);

  const toggle = async (type: string) => {
    setLoading(type);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/reactions/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poem_id: poemId, type }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Toggle failed');
      const data = await res.json();
      setCounts(data.counts_by_type);
      setFlags(data.user_flags_by_type);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {TYPES.map((type) => {
        const active = flags[type.key];
        return (
          <button
            key={type.key}
            type="button"
            onClick={() => toggle(type.key)}
            disabled={loading === type.key}
            className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm transition ${
              active
                ? type.activeClass
                : 'border-border text-muted hover:border-link/40 hover:text-link'
            }`}
          >
            <span className="text-base emoji">{type.label}</span>
            <span className="font-medium">{counts[type.key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
