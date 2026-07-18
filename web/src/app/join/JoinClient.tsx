'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, inputClass, ErrorBanner, AuthShell } from '@/components/ui';
import { TeamIcon } from '@/components/icons';
import { getStudentSession, saveStudentSession } from '@/lib/client-api';
import { studentJoin } from '@/lib/use-room';
import type { TeamId } from '@/lib/types';

interface RoomInfo {
  roomCode: string;
  title: string;
  allowTeamSelect: boolean;
  teams: Record<TeamId, { name: string; color: string; icon: string }>;
}

export default function JoinClient({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode?.toUpperCase() || '');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState<TeamId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkRoom(roomCode: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to join this room.');
      if (getStudentSession(roomCode)) {
        router.push(`/play/${roomCode}`);
        return;
      }
      setRoom(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to join this room.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialCode) checkRoom(initialCode.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function joinGame(e: React.FormEvent) {
    e.preventDefault();
    if (!room) return;
    setError(null);
    setLoading(true);
    try {
      const res = await studentJoin(room.roomCode, { name, teamId: room.allowTeamSelect ? teamId : null });
      saveStudentSession(room.roomCode, {
        sessionToken: res.participant.sessionToken,
        name: res.participant.name,
        participantId: res.participant.id,
      });
      router.push(`/play/${room.roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to join this room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      {!room ? (
        <Card className="w-full max-w-md p-8">
          <h1 className="font-display mb-1 text-3xl text-white">Join a game</h1>
          <p className="mb-6 font-body text-sm text-white/60">Enter the room code shown on the classroom screen.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) checkRoom(code.trim().toUpperCase());
            }}
            className="space-y-4"
          >
            <ErrorBanner message={error} />
            <input
              className={`${inputClass} py-4 text-center font-display text-3xl tracking-[0.35em] uppercase`}
              placeholder="AB29KQ"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoFocus
              aria-label="Room code"
            />
            <Button type="submit" variant="login" className="w-full py-3" disabled={loading || code.trim().length < 4}>
              {loading ? 'Checking…' : 'Join Game'}
            </Button>
          </form>
          <p className="mt-6 text-center font-body text-sm text-white/55">
            Are you a teacher?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </Card>
      ) : (
        <Card className="w-full max-w-md p-8">
          <p className="eyebrow mb-1 text-primary">Room {room.roomCode}</p>
          <h1 className="font-display mb-6 text-3xl text-white">{room.title}</h1>
          <form onSubmit={joinGame} className="space-y-5">
            <ErrorBanner message={error} />
            <Field label="Your display name">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                maxLength={24}
                required
                autoFocus
              />
            </Field>
            {room.allowTeamSelect ? (
              <Field label="Choose your team">
                <div className="grid grid-cols-2 gap-3">
                  {(['A', 'B'] as TeamId[]).map((id) => {
                    const team = room.teams[id];
                    const selected = teamId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTeamId(id)}
                        className={`cursor-pointer rounded-2xl border-4 p-4 text-center transition-all ${
                          selected ? 'scale-105' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ borderColor: team.color, background: selected ? `${team.color}22` : 'rgba(255,255,255,0.05)' }}
                      >
                        <div className="mb-1 flex justify-center">
                          <TeamIcon icon={team.icon} size={36} color={team.color} />
                        </div>
                        <div className="font-ui font-semibold" style={{ color: team.color }}>
                          {team.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>
            ) : (
              <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 font-body text-sm font-medium text-primary">
                Your teacher will assign you to a team.
              </p>
            )}
            <Button
              type="submit"
              variant="login"
              className="w-full py-3"
              disabled={loading || !name.trim() || (room.allowTeamSelect && !teamId)}
            >
              {loading ? 'Joining…' : room.allowTeamSelect && teamId ? `Join ${room.teams[teamId].name}` : 'Join Game'}
            </Button>
          </form>
        </Card>
      )}
    </AuthShell>
  );
}
