'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Pagination } from '@/components/Pagination';
import { PermissionGate } from '@/components/PermissionGate';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/hooks';

export default function UsersPage() {
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

  const [roles, setRoles] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    role_id: '',
    email: '',
    password: '',
    password_confirm: '',
    is_active: true,
  });

  const canCreate = useMemo(() => hasPermission('employees', 'create'), [hasPermission]);

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
      const data = await apiRequest(`/api/v1/dashboard/employees?${query.toString()}`);
      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await apiRequest('/api/v1/dashboard/roles?status=active&trash=active&page_size=200');
      setRoles(data.results || []);
    } catch (_) {
      setRoles([]);
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
    loadRoles().catch(() => undefined);
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/v1/dashboard/employees', {
        method: 'POST',
        body: {
          ...form,
          role_id: Number(form.role_id),
        },
      });
      setCreateOpen(false);
      setForm({ full_name: '', role_id: '', email: '', password: '', password_confirm: '', is_active: true });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось создать сотрудника');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Users (Employees)</h1>
        <PermissionGate module="employees" action="create">
          <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
            Create user
          </button>
        </PermissionGate>
      </div>

      <section className="card">
        <div className="row wrap gap">
          <input className="input" placeholder="Search by FIO" value={search} onChange={(event) => setSearch(event.target.value)} />
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
                  <th>FIO</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="link-like" href={`/users/${item.id}`}>
                        {item.full_name}
                      </Link>
                    </td>
                    <td>{item.role?.name || '-'}</td>
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
            <h2>Create employee</h2>
            <form className="form-grid" onSubmit={onCreate}>
              <label>
                <span>FIO</span>
                <input className="input" value={form.full_name} onChange={(event) => setForm((state) => ({ ...state, full_name: event.target.value }))} required />
              </label>
              <label>
                <span>Role</span>
                <select value={form.role_id} onChange={(event) => setForm((state) => ({ ...state, role_id: event.target.value }))} required>
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
                <input className="input" type="email" value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} required />
              </label>
              <label>
                <span>Password</span>
                <input className="input" type="password" value={form.password} onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))} required />
              </label>
              <label>
                <span>Confirm password</span>
                <input
                  className="input"
                  type="password"
                  value={form.password_confirm}
                  onChange={(event) => setForm((state) => ({ ...state, password_confirm: event.target.value }))}
                  required
                />
              </label>
              <label className="row gap">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((state) => ({ ...state, is_active: event.target.checked }))}
                />
                <span>Активно</span>
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
