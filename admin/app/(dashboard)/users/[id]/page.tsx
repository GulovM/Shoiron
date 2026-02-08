'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { PermissionGate } from '@/components/PermissionGate';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useUnsavedChangesWarning } from '@/lib/hooks';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const { profile, hasPermission } = useAuth();

  const [data, setData] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    role_id: '',
    email: '',
    is_active: true,
  });

  const isDirty = useMemo(() => {
    if (!data) return false;
    return (
      form.full_name !== data.full_name ||
      Number(form.role_id) !== Number(data.role?.id || 0) ||
      form.email !== data.email ||
      form.is_active !== Boolean(data.is_active)
    );
  }, [data, form]);

  useUnsavedChangesWarning(editing && isDirty);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiRequest(`/api/v1/dashboard/employees/${id}`);
      setData(payload);
      setForm({
        full_name: payload.full_name || '',
        role_id: String(payload.role?.id || ''),
        email: payload.email || '',
        is_active: Boolean(payload.is_active),
      });
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить сотрудника');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const payload = await apiRequest('/api/v1/dashboard/roles?status=active&trash=active&page_size=200');
      setRoles(payload.results || []);
    } catch (_) {
      setRoles([]);
    }
  };

  useEffect(() => {
    if (!id) return;
    load().catch(() => undefined);
    loadRoles().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/api/v1/dashboard/employees/${id}`, {
        method: 'PATCH',
        body: {
          full_name: form.full_name,
          role_id: Number(form.role_id),
          email: form.email,
          is_active: form.is_active,
        },
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось сохранить сотрудника');
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async () => {
    const ok = window.confirm('Вы точно хотите удалить этого сотрудника?');
    if (!ok) return;
    await apiRequest(`/api/v1/dashboard/employees/${id}`, { method: 'DELETE' });
    await load();
  };

  const restore = async () => {
    await apiRequest(`/api/v1/dashboard/employees/${id}/restore`, { method: 'POST', body: {} });
    await load();
  };

  const hardDelete = async () => {
    const ok = window.confirm('Удалить сотрудника навсегда?');
    if (!ok) return;
    await apiRequest(`/api/v1/dashboard/employees/${id}/hard-delete`, { method: 'DELETE' });
    router.replace('/users');
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest(`/api/v1/dashboard/employees/${id}/reset-password`, {
      method: 'POST',
      body: { new_password: password, confirm_password: passwordConfirm },
    });
    setShowResetPassword(false);
    setPassword('');
    setPasswordConfirm('');
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!data) return <div className="card">Not found</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">User Detail</h1>
        <div className="row gap">
          <Link href="/users" className="btn btn-secondary">
            Back
          </Link>
          {!editing ? (
            <PermissionGate module="employees" action="update">
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
            </PermissionGate>
          ) : null}
          <PermissionGate module="employees" action="delete">
            <button
              type="button"
              className="btn btn-danger"
              onClick={softDelete}
              disabled={Boolean(data.deleted_at) || profile?.id === data.id}
            >
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
              <strong>FIO:</strong> {data.full_name}
            </div>
            <div>
              <strong>Role:</strong> {data.role?.name || '-'}
            </div>
            <div>
              <strong>Created:</strong> {new Date(data.created_at).toLocaleString()}
            </div>
            <div>
              <strong>Email:</strong> {data.email}
            </div>
            <div>
              <strong>Активно:</strong> {data.is_active ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="grid">
            <h3>Reset password</h3>
            {!showResetPassword ? (
              <button type="button" className="btn" onClick={() => setShowResetPassword(true)}>
                Reset password
              </button>
            ) : (
              <form className="form-grid" onSubmit={resetPassword}>
                <label>
                  <span>New password</span>
                  <div className="row gap">
                    <input
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => setShowPassword((state) => !state)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>
                <label>
                  <span>Confirm password</span>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    required
                  />
                </label>
                <div className="row gap">
                  <button type="submit" className="btn">
                    Save
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResetPassword(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      ) : (
        <section className="card">
          <form className="form-grid" onSubmit={save}>
            <label>
              <span>FIO</span>
              <input className="input" value={form.full_name} onChange={(event) => setForm((state) => ({ ...state, full_name: event.target.value }))} />
            </label>
            <label>
              <span>Role</span>
              <select value={form.role_id} onChange={(event) => setForm((state) => ({ ...state, role_id: event.target.value }))}>
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Email</span>
              <input className="input" type="email" value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} />
            </label>
            <label className="row gap">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((state) => ({ ...state, is_active: event.target.checked }))}
                disabled={profile?.id === data.id}
              />
              <span>Активно</span>
            </label>
            <div className="row gap">
              <button type="submit" className="btn" disabled={saving || !hasPermission('employees', 'update')}>
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
