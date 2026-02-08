'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function DashboardHomePage() {
  const { profile, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiRequest('/api/v1/dashboard/home');
        setStats(data?.stats || null);
        setError(null);
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load().catch(() => undefined);
  }, []);

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    try {
      await apiRequest('/api/v1/dashboard/auth/change-password', {
        method: 'POST',
        body: { new_password: newPassword, confirm_password: confirmPassword },
      });
      setPasswordMessage('Пароль успешно изменен.');
      setNewPassword('');
      setConfirmPassword('');
      await refresh();
    } catch (err: any) {
      setPasswordMessage(err?.message || 'Ошибка обновления пароля');
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard Home</h1>
      </div>

      <section className="card grid two">
        <div>
          <h2>Profile</h2>
          <p>
            <strong>{profile?.full_name}</strong>
          </p>
          <p className="muted">{profile?.role?.name}</p>
          <p className="muted">{profile?.email}</p>
        </div>
        <form className="form-grid" onSubmit={onChangePassword}>
          <h3>Change password</h3>
          <label>
            <span>New password</span>
            <input className="input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </label>
          <label>
            <span>Confirm password</span>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn">
            Save
          </button>
          {passwordMessage ? <p className="muted">{passwordMessage}</p> : null}
        </form>
      </section>

      {loading ? <div className="card">Loading...</div> : null}
      {error ? <div className="card error">{error}</div> : null}

      {stats ? (
        <div className="grid three">
          <section className="card">
            <p className="muted">Total poems</p>
            <p className="kpi">{stats.total_poems}</p>
          </section>
          <section className="card">
            <p className="muted">Total authors</p>
            <p className="kpi">{stats.total_authors}</p>
          </section>
          <section className="card">
            <p className="muted">Visits {stats.month_label}</p>
            <p className="kpi">{stats.month_visits}</p>
          </section>
        </div>
      ) : null}

      {stats ? (
        <div className="grid two">
          <section className="card">
            <h3>Top 5 poems</h3>
            <div className="grid">
              {stats.top_poems?.length ? (
                stats.top_poems.map((item: any) => (
                  <Link className="link-like" key={item.poem_id} href={`/poems/${item.poem_id}`}>
                    {item.title} ({item.visits})
                  </Link>
                ))
              ) : (
                <p className="muted">Нет данных</p>
              )}
            </div>
          </section>

          <section className="card">
            <h3>Top 5 authors</h3>
            <div className="grid">
              {stats.top_authors?.length ? (
                stats.top_authors.map((item: any) => (
                  <Link className="link-like" key={item.author_id} href={`/authors/${item.author_id}`}>
                    {item.author_full_name} ({item.visits})
                  </Link>
                ))
              ) : (
                <p className="muted">Нет данных</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
