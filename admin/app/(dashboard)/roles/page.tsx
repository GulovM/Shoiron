'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Pagination } from '@/components/Pagination';
import { PermissionGate } from '@/components/PermissionGate';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/hooks';

const MODULES = ['authors', 'poems', 'employees', 'roles'];

function emptyPermissionRow(module: string) {
  return { module, can_create: false, can_read: false, can_update: false, can_delete: false };
}

export default function RolesPage() {
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('alphabetic');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trash, setTrash] = useState('active');
  const debouncedSearch = useDebouncedValue(search);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<any[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    is_active: true,
    permissions: MODULES.map((module) => emptyPermissionRow(module)),
    employee_ids: [] as number[],
  });

  const canCreate = useMemo(() => hasPermission('roles', 'create'), [hasPermission]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        q: debouncedSearch,
        sort,
        status: statusFilter,
        trash,
        page: String(page),
        page_size: String(pageSize),
      });
      const data = await apiRequest(`/api/v1/dashboard/roles?${query.toString()}`);
      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить роли');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await apiRequest('/api/v1/dashboard/employees?status=active&trash=active&page_size=200');
      setEmployees(data.results || []);
    } catch (_) {
      setEmployees([]);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sort, statusFilter, trash, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, statusFilter, trash]);

  useEffect(() => {
    loadEmployees().catch(() => undefined);
  }, []);

  const updatePermission = (module: string, key: 'can_create' | 'can_read' | 'can_update' | 'can_delete', value: boolean) => {
    setForm((state) => ({
      ...state,
      permissions: state.permissions.map((row) => (row.module === module ? { ...row, [key]: value } : row)),
    }));
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/v1/dashboard/roles', {
        method: 'POST',
        body: {
          name: form.name,
          is_active: form.is_active,
          permissions: form.permissions,
          employee_ids: form.employee_ids,
        },
      });
      setCreateOpen(false);
      setForm({ name: '', is_active: true, permissions: MODULES.map((module) => emptyPermissionRow(module)), employee_ids: [] });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось создать роль');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Roles</h1>
        <PermissionGate module="roles" action="create">
          <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
            Create role
          </button>
        </PermissionGate>
      </div>

      <section className="card">
        <div className="row wrap gap">
          <input className="input" placeholder="Search by role name" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="alphabetic">Alphabetic</option>
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All active states</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
                  <th>Role name</th>
                  <th>Employees</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="link-like" href={`/roles/${item.id}`}>
                        {item.name}
                      </Link>
                    </td>
                    <td>{item.employees_count}</td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                    <td>
                      {item.deleted_at ? (
                        <span className="tag warn">In Trash</span>
                      ) : item.is_active ? (
                        <span className="tag ok">Active</span>
                      ) : (
                        <span className="tag muted">Inactive</span>
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
            <h2>Create role</h2>
            <form className="form-grid" onSubmit={onCreate}>
              <label>
                <span>Role name</span>
                <input className="input" value={form.name} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} required />
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
                <h3>Permissions (accordion)</h3>
                <div className="grid">
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
              </div>

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
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </label>

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
