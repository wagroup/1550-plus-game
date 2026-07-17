'use client';

import type { Teacher } from './types';

const TOKEN_KEY = 'classbuzz_token';
const TEACHER_KEY = 'classbuzz_teacher';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredTeacher(): Teacher | null {
  if (typeof window === 'undefined') return null;
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

export async function api<T = unknown>(
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
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function studentSessionKey(roomCode: string) {
  return `classbuzz_student_${roomCode.toUpperCase()}`;
}

export interface StoredStudentSession {
  sessionToken: string;
  name: string;
  participantId: string;
}

export function getStudentSession(roomCode: string): StoredStudentSession | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(studentSessionKey(roomCode)) || 'null');
  } catch {
    return null;
  }
}

export function saveStudentSession(roomCode: string, session: StoredStudentSession) {
  localStorage.setItem(studentSessionKey(roomCode), JSON.stringify(session));
}

export function clearStudentSession(roomCode: string) {
  localStorage.removeItem(studentSessionKey(roomCode));
}
