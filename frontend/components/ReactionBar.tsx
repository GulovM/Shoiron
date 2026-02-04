'use client';

import { useState } from 'react';

import { getApiBase } from '../lib/api-client';

const TYPES = [
  { key: 'heart', label: '?' },
  { key: 'fire', label: '??' },
  { key: 'like', label: '??' },
  { key: 'sad', label: '??' },
  { key: 'star', label: '?' },
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
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
              active
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border/60 text-muted hover:border-border'
            }`}
          >
            <span className="text-base emoji">{type.label}</span>
            <span>{counts[type.key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
