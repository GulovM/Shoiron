'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

import { MarkdownEditor } from '@/components/MarkdownEditor';
import { PermissionGate } from '@/components/PermissionGate';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useUnsavedChangesWarning } from '@/lib/hooks';

export default function PoemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const { hasPermission } = useAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [authors, setAuthors] = useState<any[]>([]);

  const [form, setForm] = useState({ title: '', text: '', author_id: '', is_published: true });

  const isDirty = useMemo(() => {
    if (!data) return false;
    return (
      form.title !== (data.title || '') ||
      form.text !== (data.text || '') ||
      Number(form.author_id) !== Number(data.author?.id || 0) ||
      form.is_published !== Boolean(data.is_published)
    );
  }, [data, form]);

  const poemHtml = useMemo(() => {
    return DOMPurify.sanitize(marked.parse(data?.text || '', { async: false }) as string);
  }, [data?.text]);

  useUnsavedChangesWarning(editing && isDirty);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiRequest(`/api/v1/dashboard/poems/${id}`);
      setData(payload);
      setForm({
        title: payload.title || '',
        text: payload.text || '',
        author_id: String(payload.author?.id || ''),
        is_published: Boolean(payload.is_published),
      });
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить стих');
    } finally {
      setLoading(false);
    }
  };

  const loadAuthors = async () => {
    try {
      const payload = await apiRequest('/api/v1/dashboard/authors?page_size=200&trash=active&sort=alphabetic');
      setAuthors(payload.results || []);
    } catch (_) {
      setAuthors([]);
    }
  };

  useEffect(() => {
    if (!id) return;
    load().catch(() => undefined);
    loadAuthors().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/api/v1/dashboard/poems/${id}`, {
        method: 'PATCH',
        body: {
          title: form.title,
          text: form.text,
          author_id: Number(form.author_id),
          is_published: form.is_published,
        },
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось сохранить стих');
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async () => {
    const ok = window.confirm('Вы точно хотите удалить этот стих? После удаления все данные отправятся в корзину.');
    if (!ok) return;
    await apiRequest(`/api/v1/dashboard/poems/${id}`, { method: 'DELETE' });
    await load();
  };

  const restore = async () => {
    await apiRequest(`/api/v1/dashboard/poems/${id}/restore`, { method: 'POST', body: {} });
    await load();
  };

  const hardDelete = async () => {
    const ok = window.confirm('Удалить стих навсегда?');
    if (!ok) return;
    await apiRequest(`/api/v1/dashboard/poems/${id}/hard-delete`, { method: 'DELETE' });
    router.replace('/poems');
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!data) return <div className="card">Not found</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Poem Detail</h1>
        <div className="row gap">
          <Link href="/poems" className="btn btn-secondary">
            Back
          </Link>
          {!editing ? (
            <PermissionGate module="poems" action="update">
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
            </PermissionGate>
          ) : null}
          <PermissionGate module="poems" action="delete">
            <button type="button" className="btn btn-danger" onClick={softDelete} disabled={Boolean(data.deleted_at)}>
              Delete
            </button>
          </PermissionGate>
        </div>
      </div>

      {data.deleted_at ? (
        <div className="card">
          <p className="tag warn">In Trash</p>
          <div className="row gap">
            <button type="button" className="btn" onClick={restore}>
              Restore
            </button>
            <button type="button" className="btn btn-danger" onClick={hardDelete}>
              Permanent delete
            </button>
          </div>
        </div>
      ) : null}

      {!editing ? (
        <section className="card grid two">
          <div className="grid">
            <div>
              <strong>Title:</strong> {data.title}
            </div>
            <div>
              <strong>Author:</strong>{' '}
              <Link className="link-like" href={`/authors/${data.author?.id}`}>
                {data.author?.full_name}
              </Link>
            </div>
            <div>
              <strong>Created:</strong> {new Date(data.created_at).toLocaleString()}
            </div>
            <div>
              <strong>Published:</strong> {data.is_published ? 'Yes' : 'No'}
            </div>
          </div>
          <div>
            <strong>Text</strong>
            <div className="card" style={{ marginTop: 8 }}>
              <div dangerouslySetInnerHTML={{ __html: poemHtml }} />
            </div>
          </div>
        </section>
      ) : (
        <section className="card">
          <form className="form-grid" onSubmit={save}>
            <label>
              <span>Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))} />
            </label>

            <label>
              <span>Author</span>
              <select
                value={form.author_id}
                onChange={(event) => setForm((state) => ({ ...state, author_id: event.target.value }))}
              >
                <option value="">Select author</option>
                {authors.map((author) => (
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

            <MarkdownEditor value={form.text} onChange={(value) => setForm((state) => ({ ...state, text: value }))} draftKey={`draft-poem-${id}`} />

            <div className="row gap">
              <button type="submit" className="btn" disabled={saving || !hasPermission('poems', 'update')}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
