'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { profile, login } = useAuth();
  const router = useRouter();
  const [nextPath, setNextPath] = useState('/');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  useEffect(() => {
    const rawNext = new URLSearchParams(window.location.search).get('next');
    if (rawNext) setNextPath(rawNext);
  }, []);

  useEffect(() => {
    if (profile) {
      router.replace(nextPath);
    }
  }, [profile, router, nextPath]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(nextPath);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onForgot = async () => {
    setForgotMessage(null);
    try {
      const data = await apiRequest('/api/v1/dashboard/auth/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail },
      });
      setForgotMessage(data?.message || null);
    } catch (err: any) {
      setForgotMessage(err?.message || 'Ошибка отправки');
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1 className="page-title">Shoiron Dashboard</h1>
        <p className="muted">Вход в панель управления</p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            <span>Email</span>
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            <span>Password</span>
            <div className="row gap">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button type="button" className="btn btn-secondary" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error ? <div className="error">{error}</div> : null}

          <div className="row gap">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? '...' : 'Login'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setForgotOpen(true)}>
              Forgot password
            </button>
          </div>
        </form>
      </div>

      {forgotOpen ? (
        <div className="modal-backdrop" onClick={() => setForgotOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Forgot password</h2>
            <label>
              <span>Email</span>
              <input className="input" type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} />
            </label>
            {forgotMessage ? <p>{forgotMessage}</p> : null}
            <div className="row gap">
              <button type="button" className="btn" onClick={onForgot}>
                Send temporary password
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setForgotOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
