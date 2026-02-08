'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { MarkdownEditor } from '@/components/MarkdownEditor';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useUnsavedChangesWarning } from '@/lib/hooks';

function toComparable(value: any) {
  return JSON.stringify(value);
}

export default function SiteSettingsPage() {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [initial, setInitial] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const canUpdate = hasPermission('roles', 'update');

  const isDirty = useMemo(() => {
    if (!initial || !form) return false;
    return toComparable(initial) !== toComparable(form) || Boolean(logoFile);
  }, [initial, form, logoFile]);

  useUnsavedChangesWarning(isDirty);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiRequest('/api/v1/dashboard/site-settings');
      const normalized = {
        seo_title: payload.seo_title || '',
        seo_description: payload.seo_description || '',
        contacts_phone: payload.contacts_phone || '',
        contacts_email: payload.contacts_email || '',
        contacts_address: payload.contacts_address || '',
        contacts_telegram: payload.contacts_telegram || '',
        about_markdown: payload.about_markdown || '',
        analytics_google_analytics_tag: payload.analytics_google_analytics_tag || '',
        analytics_google_search_console_tag: payload.analytics_google_search_console_tag || '',
        analytics_yandex_metrica_tag: payload.analytics_yandex_metrica_tag || '',
        analytics_yandex_webmaster_tag: payload.analytics_yandex_webmaster_tag || '',
        logo_url: payload.logo_url || '',
      };
      setInitial(normalized);
      setForm(normalized);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'logo_url') return;
        formData.append(key, String(value ?? ''));
      });
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      await apiRequest('/api/v1/dashboard/site-settings', { method: 'PATCH', body: formData });
      setLogoFile(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!form) return <div className="card">Not found</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Site Settings</h1>
      </div>

      <form className="grid" onSubmit={save}>
        <section className="card grid two">
          <div>
            <h3>Logo</h3>
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="Logo" style={{ maxWidth: 220, borderRadius: 10, border: '1px solid #ddd' }} />
            ) : (
              <p className="muted">No logo</p>
            )}
          </div>
          <div className="form-grid">
            <label>
              <span>Add new logo</span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
            </label>
            <label>
              <span>SEO title</span>
              <input className="input" value={form.seo_title} onChange={(event) => setForm((state: any) => ({ ...state, seo_title: event.target.value }))} />
            </label>
            <label>
              <span>SEO description</span>
              <textarea className="input" value={form.seo_description} onChange={(event) => setForm((state: any) => ({ ...state, seo_description: event.target.value }))} />
            </label>
          </div>
        </section>

        <section className="card grid two">
          <div className="form-grid">
            <h3>Contacts page block</h3>
            <label>
              <span>Phone</span>
              <input className="input" value={form.contacts_phone} onChange={(event) => setForm((state: any) => ({ ...state, contacts_phone: event.target.value }))} />
            </label>
            <label>
              <span>Email</span>
              <input className="input" value={form.contacts_email} onChange={(event) => setForm((state: any) => ({ ...state, contacts_email: event.target.value }))} />
            </label>
            <label>
              <span>Address</span>
              <input className="input" value={form.contacts_address} onChange={(event) => setForm((state: any) => ({ ...state, contacts_address: event.target.value }))} />
            </label>
            <label>
              <span>Telegram</span>
              <input className="input" value={form.contacts_telegram} onChange={(event) => setForm((state: any) => ({ ...state, contacts_telegram: event.target.value }))} />
            </label>
          </div>
          <div>
            <h3>About page block</h3>
            <MarkdownEditor
              value={form.about_markdown}
              onChange={(value) => setForm((state: any) => ({ ...state, about_markdown: value }))}
              draftKey="draft-site-about"
            />
          </div>
        </section>

        <section className="card form-grid">
          <h3>Analytics tags block</h3>
          <label>
            <span>Google Analytics Tag</span>
            <input
              className="input"
              value={form.analytics_google_analytics_tag}
              onChange={(event) => setForm((state: any) => ({ ...state, analytics_google_analytics_tag: event.target.value }))}
            />
          </label>
          <label>
            <span>Google Search Console Tag</span>
            <input
              className="input"
              value={form.analytics_google_search_console_tag}
              onChange={(event) => setForm((state: any) => ({ ...state, analytics_google_search_console_tag: event.target.value }))}
            />
          </label>
          <label>
            <span>Yandex Metrica Tag</span>
            <input
              className="input"
              value={form.analytics_yandex_metrica_tag}
              onChange={(event) => setForm((state: any) => ({ ...state, analytics_yandex_metrica_tag: event.target.value }))}
            />
          </label>
          <label>
            <span>Yandex WebMaster Tag</span>
            <input
              className="input"
              value={form.analytics_yandex_webmaster_tag}
              onChange={(event) => setForm((state: any) => ({ ...state, analytics_yandex_webmaster_tag: event.target.value }))}
            />
          </label>
        </section>

        <div className="row gap">
          <button type="submit" className="btn" disabled={!canUpdate || !isDirty || saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!isDirty}
            onClick={() => {
              setForm(initial);
              setLogoFile(null);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
