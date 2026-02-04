import { describe, expect, it } from 'vitest';

import { slugify, withIdSlug } from './slug';

describe('slug helpers', () => {
  it('slugifies latin text', () => {
    expect(slugify('Hello World', 'poem')).toBe('hello-world');
  });

  it('falls back when empty', () => {
    expect(slugify('??????', 'author')).toBe('author');
  });

  it('builds id slug', () => {
    expect(withIdSlug(5, 'Title', 'poem')).toBe('5-title');
  });
});
