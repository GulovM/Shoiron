'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { AvatarCropper } from '@/components/AvatarCropper';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Pagination } from '@/components/Pagination';
import { PermissionGate } from '@/components/PermissionGate';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/hooks';

export default function AuthorsPage() {
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('alphabetic');
  const [published, setPublished] = useState('all');
  const [trash, setTrash] = useState('active');
  const debouncedSearch = useDebouncedValue(search);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    birth_year: '',
    death_year: '',
    biography_md: '',
    is_published: true,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [avatarCrop, setAvatarCrop] = useState<any>(null);

  const canCreate = useMemo(() => hasPermission('authors', 'create'), [hasPermission]);

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
      const data = await apiRequest(`/api/v1/dashboard/authors?${query.toString()}`);
      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить список авторов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sort, published, trash, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, published, trash]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('full_name', form.full_name);
      formData.append('birth_year', form.birth_year || '');
      formData.append('death_year', form.death_year || '');
      formData.append('biography_md', form.biography_md);
      formData.append('is_published', String(form.is_published));
      if (photo) formData.append('photo', photo);
      if (avatarCrop) formData.append('avatar_crop', JSON.stringify(avatarCrop));
      await apiRequest('/api/v1/dashboard/authors', { method: 'POST', body: formData });
      setCreateOpen(false);
      setForm({ full_name: '', birth_year: '', death_year: '', biography_md: '', is_published: true });
      setPhoto(null);
      setAvatarCrop(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось создать автора');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Authors</h1>
        <PermissionGate module="authors" action="create">
          <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
            Create author
          </button>
        </PermissionGate>
      </div>

      <section className="card">
        <div className="row wrap gap">
          <input
            className="input"
            placeholder="Search by FIO"
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
                  <th>Author full name</th>
                  <th>Poems</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="link-like" href={`/authors/${item.id}`}>
                        {item.full_name}
                      </Link>
                    </td>
                    <td>{item.poems_count}</td>
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
            <h2>Create author</h2>
            <form className="form-grid" onSubmit={onCreate}>
              <label>
                <span>FIO</span>
                <input className="input" value={form.full_name} onChange={(event) => setForm((state) => ({ ...state, full_name: event.target.value }))} required />
              </label>
              <div className="grid two">
                <label>
                  <span>Birth year</span>
                  <input className="input" value={form.birth_year} onChange={(event) => setForm((state) => ({ ...state, birth_year: event.target.value }))} />
                </label>
                <label>
                  <span>Death year</span>
                  <input className="input" value={form.death_year} onChange={(event) => setForm((state) => ({ ...state, death_year: event.target.value }))} />
                </label>
              </div>

              <label className="row gap">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(event) => setForm((state) => ({ ...state, is_published: event.target.checked }))}
                />
                <span>Опубликовано на сайте</span>
              </label>

              <div>
                <span>Avatar (with circle crop preview)</span>
                <AvatarCropper
                  onChange={(file, cropData) => {
                    setPhoto(file);
                    setAvatarCrop(cropData);
                  }}
                />
              </div>

              <div>
                <span>Biography</span>
                <MarkdownEditor
                  value={form.biography_md}
                  onChange={(value) => setForm((state) => ({ ...state, biography_md: value }))}
                  draftKey="draft-author-biography"
                />
              </div>

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
