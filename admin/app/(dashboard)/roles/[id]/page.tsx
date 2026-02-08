'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { PermissionGate } from '@/components/PermissionGate';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useUnsavedChangesWarning } from '@/lib/hooks';

const MODULES = ['authors', 'poems', 'employees', 'roles'];

function emptyPermissionRow(module: string) {
  return { module, can_create: false, can_read: false, can_update: false, can_delete: false };
}

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const { hasPermission } = useAuth();

  const [data, setData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    is_active: true,
    permissions: MODULES.map((module) => emptyPermissionRow(module)),
    employee_ids: [] as number[],
  });

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((item) => item.full_name.toLowerCase().includes(query));
  }, [employees, employeeSearch]);

  const isDirty = useMemo(() => {
    if (!data) return false;
    const incomingPerms = (data.permissions || []).map((item: any) => JSON.stringify(item)).sort().join('|');
    const formPerms = form.permissions.map((item) => JSON.stringify(item)).sort().join('|');
    const incomingEmployees = (data.employees || []).map((item: any) => Number(item.id)).sort((a: number, b: number) => a - b).join(',');
    const formEmployees = [...form.employee_ids].sort((a, b) => a - b).join(',');
    return (
      form.name !== data.name ||
      form.is_active !== Boolean(data.is_active) ||
      incomingPerms !== formPerms ||
      incomingEmployees !== formEmployees
    );
  }, [data, form]);

  useUnsavedChangesWarning(editing && isDirty);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiRequest(`/api/v1/dashboard/roles/${id}`);
      setData(payload);
      setForm({
        name: payload.name || '',
        is_active: Boolean(payload.is_active),
        permissions:
          payload.permissions?.map((item: any) => ({
            module: item.module,
            can_create: Boolean(item.can_create),
            can_read: Boolean(item.can_read),
            can_update: Boolean(item.can_update),
            can_delete: Boolean(item.can_delete),
          })) || MODULES.map((module) => emptyPermissionRow(module)),
        employee_ids: (payload.employees || []).map((item: any) => Number(item.id)),
      });
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить роль');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const payload = await apiRequest('/api/v1/dashboard/employees?status=active&trash=active&page_size=200');
      setEmployees(payload.results || []);
    } catch (_) {
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (!id) return;
    load().catch(() => undefined);
    loadEmployees().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updatePermission = (module: string, key: 'can_create' | 'can_read' | 'can_update' | 'can_delete', value: boolean) => {
    setForm((state) => ({
      ...state,
      permissions: state.permissions.map((row) => (row.module === module ? { ...row, [key]: value } : row)),
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/api/v1/dashboard/roles/${id}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          is_active: form.is_active,
          permissions: form.permissions,
          employee_ids: form.employee_ids,
        },
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось сохранить роль');
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async () => {
    const ok = window.confirm(
      'Вы точно хотите удалить эту роль? Все прикрепленные сотрудники потеряют свои разрешения!'
    );
    if (!ok) return;
    await apiRequest(`/api/v1/dashboard/roles/${id}`, { method: 'DELETE' });
    await load();
  };

  const restore = async () => {
    await apiRequest(`/api/v1/dashboard/roles/${id}/restore`, { method: 'POST', body: {} });
    await load();
  };

  const hardDelete = async () => {
    const ok = window.confirm('Удалить роль навсегда?');
    if (!ok) return;
    await apiRequest(`/api/v1/dashboard/roles/${id}/hard-delete`, { method: 'DELETE' });
    router.replace('/roles');
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!data) return <div className="card">Not found</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Role Detail</h1>
        <div className="row gap">
          <Link href="/roles" className="btn btn-secondary">
            Back
          </Link>
          {!editing ? (
            <PermissionGate module="roles" action="update">
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
            </PermissionGate>
          ) : null}
          <PermissionGate module="roles" action="delete">
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
              <strong>Role name:</strong> {data.name}
            </div>
            <div>
              <strong>Created:</strong> {new Date(data.created_at).toLocaleString()}
            </div>
            <div>
              <strong>Активно:</strong> {data.is_active ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="grid">
            <h3>Permissions accordion</h3>
            {(data.permissions || []).map((item: any) => (
              <details key={item.module}>
                <summary>{item.module}</summary>
                <p className="muted">
                  C:{item.can_create ? '1' : '0'} R:{item.can_read ? '1' : '0'} U:{item.can_update ? '1' : '0'} D:
                  {item.can_delete ? '1' : '0'}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : (
        <section className="card">
          <form className="form-grid" onSubmit={save}>
            <label>
              <span>Role name</span>
              <input className="input" value={form.name} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} />
            </label>
            <label className="row gap">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((state) => ({ ...state, is_active: event.target.checked }))}
              />
              <span>Активно</span>
            </label>

            <div className="card">
              <h3>Permissions accordion</h3>
              {form.permissions.map((row) => (
                <details key={row.module}>
                  <summary>{row.module}</summary>
                  <div className="row wrap gap" style={{ paddingTop: 8 }}>
                    <label className="row gap">
                      <input
                        type="checkbox"
                        checked={row.can_create}
                        onChange={(event) => updatePermission(row.module, 'can_create', event.target.checked)}
                      />
                      <span>Create</span>
                    </label>
                    <label className="row gap">
                      <input
                        type="checkbox"
                        checked={row.can_read}
                        onChange={(event) => updatePermission(row.module, 'can_read', event.target.checked)}
                      />
                      <span>Read</span>
                    </label>
                    <label className="row gap">
                      <input
                        type="checkbox"
                        checked={row.can_update}
                        onChange={(event) => updatePermission(row.module, 'can_update', event.target.checked)}
                      />
                      <span>Update</span>
                    </label>
                    <label className="row gap">
                      <input
                        type="checkbox"
                        checked={row.can_delete}
                        onChange={(event) => updatePermission(row.module, 'can_delete', event.target.checked)}
                      />
                      <span>Delete</span>
                    </label>
                  </div>
                </details>
              ))}
            </div>

            <label>
              <span>Search employee</span>
              <input className="input" value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} />
            </label>

            <label>
              <span>Add employees</span>
              <select
                multiple
                value={form.employee_ids.map(String)}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions).map((option) => Number(option.value));
                  setForm((state) => ({ ...state, employee_ids: values }));
                }}
              >
                {filteredEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="row gap">
              <button type="submit" className="btn" disabled={saving || !hasPermission('roles', 'update')}>
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
        <h3>Attached employees</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>FIO</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.employees?.length ? (
                data.employees.map((employee: any) => (
                  <tr key={employee.id}>
                    <td>
                      <Link className="link-like" href={`/users/${employee.id}`}>
                        {employee.full_name}
                      </Link>
                    </td>
                    <td>{new Date(employee.created_at).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="muted">
                    No employees
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
