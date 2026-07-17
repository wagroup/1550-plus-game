import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Logo, Button, Card, Field, inputClass, ErrorBanner } from '../components/ui';
import { getSocket, getStudentSession, saveStudentSession } from '../socket';
import type { TeamId } from '../types';

interface RoomInfo {
  roomCode: string;
  title: string;
  allowTeamSelect: boolean;
  teams: Record<TeamId, { name: string; color: string; icon: string }>;
}

export default function Join() {
  const { code: urlCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState(urlCode?.toUpperCase() || '');
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
      // Returning student with a saved session skips registration entirely.
      if (getStudentSession(roomCode)) {
        navigate(`/play/${roomCode}`);
        return;
      }
      setRoom(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (urlCode) checkRoom(urlCode.toUpperCase());
  }, [urlCode]);

  function joinGame(e: React.FormEvent) {
    e.preventDefault();
    if (!room) return;
    setError(null);
    setLoading(true);
    const socket = getSocket();
    socket.emit(
      'student:join',
      { roomCode: room.roomCode, name, teamId: room.allowTeamSelect ? teamId : null },
      (res: any) => {
        setLoading(false);
        if (res?.error) return setError(res.error);
        saveStudentSession(room.roomCode, {
          sessionToken: res.participant.sessionToken,
          name: res.participant.name,
          participantId: res.participant.id,
        });
        navigate(`/play/${room.roomCode}`);
      }
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-white to-blue-50">
      <div className="mb-8"><Logo size="lg" /></div>

      {!room ? (
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-extrabold mb-1">Join a game</h1>
          <p className="text-slate-500 mb-6">Enter the room code shown on the classroom screen.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) checkRoom(code.trim().toUpperCase()); }} className="space-y-4">
            <ErrorBanner message={error} />
            <input
              className={`${inputClass} text-center text-3xl font-black tracking-[0.35em] uppercase py-4`}
              placeholder="AB29KQ"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoFocus
              aria-label="Room code"
            />
            <Button type="submit" className="w-full text-lg py-3" disabled={loading || code.trim().length < 4}>
              {loading ? 'Checking…' : 'Join Game'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Are you a teacher? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in here</Link>
          </p>
        </Card>
      ) : (
        <Card className="w-full max-w-md p-8">
          <p className="text-sm font-bold text-primary uppercase tracking-wide mb-1">Room {room.roomCode}</p>
          <h1 className="text-2xl font-extrabold mb-6">{room.title}</h1>
          <form onSubmit={joinGame} className="space-y-5">
            <ErrorBanner message={error} />
            <Field label="Your display name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Alex" maxLength={24} required autoFocus />
            </Field>
            {room.allowTeamSelect ? (
              <Field label="Choose your team">
                <div className="grid grid-cols-2 gap-3">
                  {(['A', 'B'] as TeamId[]).map((id) => {
                    const team = room.teams[id];
                    const selected = teamId === id;
                    return (
                      <button key={id} type="button" onClick={() => setTeamId(id)}
                        className={`rounded-2xl border-4 p-4 text-center transition-all cursor-pointer ${selected ? 'scale-105' : 'opacity-70 hover:opacity-100'}`}
                        style={{ borderColor: team.color, background: selected ? `${team.color}22` : 'white' }}>
                        <div className="text-4xl mb-1">{team.icon}</div>
                        <div className="font-extrabold" style={{ color: team.color }}>{team.name}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>
            ) : (
              <p className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm font-medium text-primary">
                Your teacher will assign you to a team.
              </p>
            )}
            <Button type="submit" className="w-full text-lg py-3"
              disabled={loading || !name.trim() || (room.allowTeamSelect && !teamId)}>
              {loading ? 'Joining…' : room.allowTeamSelect && teamId ? `Join ${room.teams[teamId].name}` : 'Join Game'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
