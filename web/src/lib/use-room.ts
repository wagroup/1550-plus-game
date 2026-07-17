'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from './client-api';
import type { GameState } from './types';

const POLL_MS = 700;

export function useRoomPoll(
  roomCode: string,
  role: 'teacher' | 'public',
  opts?: { sessionToken?: string | null; enabled?: boolean }
) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [kicked, setKicked] = useState(false);
  const prevParticipants = useRef<Set<string>>(new Set());
  const enabled = opts?.enabled !== false;

  const fetchState = useCallback(async () => {
    if (!roomCode || !enabled) return;
    try {
      const params = new URLSearchParams({ role });
      if (opts?.sessionToken) params.set('sessionToken', opts.sessionToken);
      const headers: Record<string, string> = {};
      if (role === 'teacher') {
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`/api/rooms/${roomCode}/state?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to load room');
        setConnected(false);
        return;
      }
      setState(data.state);
      setConnected(true);
      setError(null);

      // Detect kick: our participant vanished while we still have a session
      if (opts?.sessionToken && data.state) {
        const ids = new Set<string>([
          ...data.state.teams.A.members.map((m: { id: string }) => m.id),
          ...data.state.teams.B.members.map((m: { id: string }) => m.id),
          ...data.state.unassigned.map((m: { id: string }) => m.id),
        ]);
        // Store participant id check happens in Play via session
        prevParticipants.current = ids;
      }
    } catch {
      setConnected(false);
    }
  }, [roomCode, role, opts?.sessionToken, enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchState();
    const timer = setInterval(fetchState, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchState, enabled]);

  return { state, setState, error, setError, connected, kicked, setKicked, refresh: fetchState };
}

export async function teacherAction(roomCode: string, type: string, payload?: unknown) {
  const token = getToken();
  const res = await fetch(`/api/rooms/${roomCode}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ type, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Action failed');
  return data;
}

export async function studentBuzz(roomCode: string, sessionToken: string) {
  const res = await fetch(`/api/rooms/${roomCode}/buzz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  });
  return res.json();
}

export async function studentJoin(
  roomCode: string,
  body: { name?: string; teamId?: string | null; sessionToken?: string }
) {
  const res = await fetch(`/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Join failed');
  return data;
}
