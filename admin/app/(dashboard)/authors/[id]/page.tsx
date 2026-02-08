'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

import { AvatarCropper } from '@/components/AvatarCropper';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { PermissionGate } from '@/components/PermissionGate';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useUnsavedChangesWarning } from '@/lib/hooks';

export default function AuthorDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [avatarCrop, setAvatarCrop] = useState<any>(null);
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  const [poemFormOpen, setPoemFormOpen] = useState(false);
  const [poemTitle, setPoemTitle] = useState('');
  const [poemText, setPoemText] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    birth_year: '',
    death_year: '',
    biography_md: '',
    is_published: true,
  });

  const isDirty = useMemo(() => {
    if (!data) return false;
    return (
      form.full_name !== (data.full_name || '') ||
      form.birth_year !== String(data.birth_year || '') ||
      form.death_year !== String(data.death_year || '') ||
      form.biography_md !== (data.biography_md || '') ||
      form.is_published !== Boolean(data.is_published) ||
      Boolean(photo)
    );
  }, [data, form, photo]);

  const bioHtml = useMemo(() => {
    return DOMPurify.sanitize(marked.parse(data?.biography_md || '', { async: false }) as string);
  }, [data?.biography_md]);

  useUnsavedChangesWarning(editing && isDirty);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiRequest(`/api/v1/dashboard/authors/${id}`);
      setData(payload);
      setForm({
        full_name: payload.full_name || '',
        birth_year: String(payload.birth_year || ''),
        death_year: String(payload.death_year || ''),
        biography_md: payload.biography_md || '',
        is_published: Boolean(payload.is_published),
      });
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить автора');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('full_name', form.full_name);
      formData.append('birth_year', form.birth_year);
      formData.append('death_year', form.death_year);
      formData.append('biography_md', form.biography_md);
      formData.append('is_published', String(form.is_published));
      if (photo) formData.append('photo', photo);
      if (avatarCrop) formData.append('avatar_crop', JSON.stringify(avatarCrop));
      await apiRequest(`/api/v1/dashboard/authors/${id}`, { method: 'PATCH', body: formData });
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async () => {
    if (!data) return;
    const poemsCount = data.poems?.length || 0;
    const ok = window.confirm(
      `Вы пытаетесь удалить автора, у которого есть связь с ${poemsCount} стихами? После удаления все данные отправятся в корзину.`
    );
    if (!ok) return;
    await apiRequest(`/api/v1/dashboard/authors/${id}`, { method: 'DELETE' });
    await load();
  };

  const restore = async () => {
    await apiRequest(`/api/v1/dashboard/authors/${id}/restore`, { method: 'POST', body: {} });
    await load();
  };

  const hardDelete = async () => {
    const ok = window.confirm('Удалить автора навсегда?');
    if (!ok) return;
    await apiRequest(`/api/v1/dashboard/authors/${id}/hard-delete`, { method: 'DELETE' });
    router.replace('/authors');
  };

  const addPoem = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest(`/api/v1/dashboard/authors/${id}/poems`, {
      method: 'POST',
      body: { title: poemTitle, text: poemText, is_published: true },
    });
    setPoemFormOpen(false);
    setPoemTitle('');
    setPoemText('');
    await load();
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!data) return <div className="card">Not found</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Author Detail</h1>
        <div className="row gap">
          <Link href="/authors" className="btn btn-secondary">
            Back
          </Link>
          {!editing ? (
            <PermissionGate module="authors" action="update">
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
            </PermissionGate>
          ) : null}
          <PermissionGate module="authors" action="delete">
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
              <strong>Created:</strong> {new Date(data.created_at).toLocaleString()}
            </div>
            {data.photo_url ? (
              <button type="button" className="btn btn-secondary" onClick={() => setShowFullPhoto(true)}>
                Open full photo
              </button>
            ) : null}
            <div>
              <strong>FIO:</strong> {data.full_name}
            </div>
            <div>
              <strong>Birth year:</strong> {data.birth_year || '-'}
            </div>
            <div>
              <strong>Death year:</strong> {data.death_year || '-'}
            </div>
            <div>
              <strong>Published:</strong> {data.is_published ? 'Yes' : 'No'}
            </div>
            <p className="muted">Подсказка: даже после публикации автора стихи видны на сайте только если опубликованы отдельно.</p>
          </div>

          <div>
            <span>Biography</span>
            <div className="card" style={{ marginTop: 8, maxHeight: 360, overflow: 'auto' }}>
              <div dangerouslySetInnerHTML={{ __html: bioHtml || '-' }} />
            </div>
          </div>
        </section>
      ) : (
        <section className="card">
          <form className="form-grid" onSubmit={save}>
            <label>
              <span>FIO</span>
              <input className="input" value={form.full_name} onChange={(event) => setForm((state) => ({ ...state, full_name: event.target.value }))} />
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
            <AvatarCropper
              onChange={(file, cropData) => {
                setPhoto(file);
                setAvatarCrop(cropData);
              }}
            />
            <MarkdownEditor
              value={form.biography_md}
              onChange={(value) => setForm((state) => ({ ...state, biography_md: value }))}
              draftKey={`draft-author-${id}-bio`}
            />
            <div className="row gap">
              <button type="submit" className="btn" disabled={saving || !hasPermission('authors', 'update')}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="page-header">
          <h2>Poems by this author</h2>
          <PermissionGate module="poems" action="create">
            <button type="button" className="btn" onClick={() => setPoemFormOpen((state) => !state)}>
              Добавить стих
            </button>
          </PermissionGate>
        </div>

        {poemFormOpen ? (
          <form className="form-grid" onSubmit={addPoem}>
            <label>
              <span>Title</span>
              <input className="input" value={poemTitle} onChange={(event) => setPoemTitle(event.target.value)} required />
            </label>
            <MarkdownEditor value={poemText} onChange={setPoemText} draftKey={`draft-author-${id}-poem`} />
            <div className="row gap">
              <button type="submit" className="btn">
                Save
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPoemFormOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Created</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.poems?.length ? (
                data.poems.map((poem: any) => (
                  <tr key={poem.id}>
                    <td>
                      <Link className="link-like" href={`/poems/${poem.id}`}>
                        {poem.title}
                      </Link>
                    </td>
                    <td>{new Date(poem.created_at).toLocaleString()}</td>
                    <td>{poem.deleted_at ? <span className="tag warn">In Trash</span> : poem.is_published ? 'Published' : 'Unpublished'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="muted">
                    No poems
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showFullPhoto && data.photo_url ? (
        <div className="modal-backdrop" onClick={() => setShowFullPhoto(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.photo_url} alt={data.full_name} style={{ width: '100%', borderRadius: 8 }} />
          </div>
        </div>
      ) : null}
    </>
  );
}
