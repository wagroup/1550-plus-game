import type { Teacher } from './types';

const TOKEN_KEY = 'classbuzz_token';
const TEACHER_KEY = 'classbuzz_teacher';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredTeacher(): Teacher | null {
  try {
    return JSON.parse(localStorage.getItem(TEACHER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(token: string, teacher: Teacher) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TEACHER_KEY, JSON.stringify(teacher));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TEACHER_KEY);
}

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}
