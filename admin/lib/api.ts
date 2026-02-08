const API_BASE = process.env.NEXT_PUBLIC_DASHBOARD_API_URL || 'http://localhost:8000';

let csrfTokenMemory = '';

export function getApiBase() {
  return API_BASE;
}

export function setCsrfToken(token?: string | null) {
  if (!token) return;
  csrfTokenMemory = token;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('dashboard_csrf_token', token);
  }
}

export function getCsrfToken() {
  if (csrfTokenMemory) return csrfTokenMemory;
  if (typeof window !== 'undefined') {
    csrfTokenMemory = window.localStorage.getItem('dashboard_csrf_token') || '';
  }
  return csrfTokenMemory;
}

type ApiOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};

export async function apiRequest(path: string, options: ApiOptions = {}) {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});

  const init: RequestInit = {
    method,
    credentials: 'include',
    headers,
  };

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      init.body = options.body;
    } else {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(options.body);
    }
  }

  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCsrfToken();
    if (csrf) {
      headers.set('X-CSRFToken', csrf);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, init);
  let payload: any = null;
  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.message || `Request failed: ${response.status}`) as Error & {
      status?: number;
      payload?: any;
    };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
