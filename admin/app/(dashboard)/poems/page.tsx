'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Pagination } from '@/components/Pagination';
import { PermissionGate } from '@/components/PermissionGate';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/hooks';

export default function PoemsPage() {
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [published, setPublished] = useState('all');
  const [trash, setTrash] = useState('active');
  const debouncedSearch = useDebouncedValue(search);

  const [authors, setAuthors] = useState<any[]>([]);
  const [authorSearch, setAuthorSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', text: '', author_id: '', is_published: true });

  const canCreate = useMemo(() => hasPermission('poems', 'create'), [hasPermission]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        q: debouncedSearch,
        sort,
        published,
        trash,
        page: String(page),
        page_size: String(pageSize),
      });
      const data = await apiRequest(`/api/v1/dashboard/poems?${query.toString()}`);
      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить список стихов');
    } finally {
      setLoading(false);
    }
  };

  const loadAuthors = async () => {
    try {
      const data = await apiRequest('/api/v1/dashboard/authors?page_size=200&trash=active&published=all&sort=alphabetic');
      setAuthors(data.results || []);
    } catch (_) {
      setAuthors([]);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sort, published, trash, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, published, trash]);

  useEffect(() => {
    loadAuthors().catch(() => undefined);
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/v1/dashboard/poems', {
        method: 'POST',
        body: {
          title: form.title,
          text: form.text,
          author_id: Number(form.author_id),
          is_published: form.is_published,
        },
      });
      setCreateOpen(false);
      setForm({ title: '', text: '', author_id: '', is_published: true });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось создать стих');
    } finally {
      setSaving(false);
    }
  };

  const filteredAuthors = useMemo(() => {
    const query = authorSearch.trim().toLowerCase();
    if (!query) return authors;
    return authors.filter((author) => String(author.full_name || '').toLowerCase().includes(query));
  }, [authors, authorSearch]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Poems</h1>
        <PermissionGate module="poems" action="create">
          <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
            Create poem
          </button>
        </PermissionGate>
      </div>

      <section className="card">
        <div className="row wrap gap">
          <input
            className="input"
            placeholder="Search by title or text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="alphabetic">Alphabetic</option>
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
          <select value={published} onChange={(event) => setPublished(event.target.value)}>
            <option value="all">All published states</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
          <select value={trash} onChange={(event) => setTrash(event.target.value)}>
            <option value="active">Active</option>
            <option value="trash">In Trash</option>
            <option value="all">All</option>
          </select>
        </div>
      </section>

      <section className="card">
        {loading ? <p>Loading...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && !error && items.length === 0 ? <p className="muted">Empty list</p> : null}
        {items.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Poem title</th>
                  <th>Author</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="link-like" href={`/poems/${item.id}`}>
                        {item.title}
                      </Link>
                    </td>
                    <td>
                      <Link className="link-like" href={`/authors/${item.author.id}`}>
                        {item.author.full_name}
                      </Link>
                    </td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                    <td>
                      {item.deleted_at ? (
                        <span className="tag warn">In Trash</span>
                      ) : item.is_published ? (
                        <span className="tag ok">Published</span>
                      ) : (
                        <span className="tag muted">Unpublished</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <Pagination page={page} pageSize={pageSize} total={count} onChange={setPage} />
      </section>

      {createOpen ? (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Create poem</h2>
            <form className="form-grid" onSubmit={onCreate}>
              <label>
                <span>Title</span>
                <input className="input" value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))} required />
              </label>
              <label>
                <span>Author</span>
                <input
                  className="input"
                  placeholder="Search author by FIO"
                  value={authorSearch}
                  onChange={(event) => setAuthorSearch(event.target.value)}
                />
                <select
                  value={form.author_id}
                  onChange={(event) => setForm((state) => ({ ...state, author_id: event.target.value }))}
                  required
                >
                  <option value="">Select author</option>
                  {filteredAuthors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="row gap">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(event) => setForm((state) => ({ ...state, is_published: event.target.checked }))}
                />
                <span>Опубликовано на сайте</span>
              </label>

              <MarkdownEditor value={form.text} onChange={(value) => setForm((state) => ({ ...state, text: value }))} draftKey="draft-poem-create" />

              <div className="row gap">
                <button type="submit" className="btn" disabled={!canCreate || saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
