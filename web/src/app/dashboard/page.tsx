'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TeacherLayout from '@/components/TeacherLayout';
import { Button, Card } from '@/components/ui';
import { api, getStoredTeacher } from '@/lib/client-api';
import type { GameDef, GameReport, QuestionSet } from '@/lib/types';

export default function DashboardPage() {
  return (
    <RequireAuth>
      <TeacherLayoutedDashboard />
    </RequireAuth>
  );
}

function TeacherLayoutedDashboard() {
  const router = useRouter();
  const teacher = getStoredTeacher();
  const [games, setGames] = useState<GameDef[]>([]);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [reports, setReports] = useState<GameReport[]>([]);

  useEffect(() => {
    api<GameDef[]>('/api/games').then(setGames).catch(() => {});
    api<QuestionSet[]>('/api/question-sets').then(setSets).catch(() => {});
    api<GameReport[]>('/api/reports').then(setReports).catch(() => {});
  }, []);

  const activeGames = games.filter((g) => g.live);
  const stats = [
    { label: 'Total games', value: games.length },
    { label: 'Question sets', value: sets.length },
    { label: 'Games completed', value: reports.length },
    {
      label: 'Avg duration',
      value: reports.length
        ? `${Math.round(reports.reduce((s, r) => s + (r.durationMs || 0), 0) / reports.length / 60000)} min`
        : '—',
    },
  ];

  return (
    <TeacherLayout title={`Welcome back, ${teacher?.name?.split(' ')[0] || 'Teacher'} 👋`}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm font-semibold text-slate-500">{s.label}</p>
            <p className="text-3xl font-extrabold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mb-10">
        <Button className="text-lg px-6 py-3" onClick={() => router.push('/create-game')}>🎮 Create New Game</Button>
        <Button variant="secondary" className="text-lg px-6 py-3" onClick={() => router.push('/question-sets')}>
          📝 Manage Question Sets
        </Button>
      </div>

      {activeGames.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Active games</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeGames.map((g) => (
              <Card key={g.id} className="p-5 flex items-center justify-between border-primary border-2">
                <div>
                  <p className="font-bold">{g.title}</p>
                  <p className="text-sm text-slate-500">
                    Room code: <span className="font-mono font-bold text-primary">{g.roomCode}</span>
                  </p>
                </div>
                <Button onClick={() => router.push(`/host/${g.roomCode}`)}>Open Host View</Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-4">Recent games</h2>
        {games.length === 0 ? (
          <Card className="p-10 text-center text-slate-500">
            <p className="text-4xl mb-3">🎯</p>
            <p className="font-semibold mb-1">No games yet</p>
            <p className="text-sm">Create your first game to get your class buzzing.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {games.slice(0, 8).map((g) => {
              const report = reports.find((r) => r.id === g.id);
              return (
                <Card key={g.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{g.title}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(g.createdAt).toLocaleString()} · {g.teams.A.name} vs {g.teams.B.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {g.live ? (
                      <span className="text-xs font-bold bg-green-100 text-correct rounded-full px-3 py-1">LIVE</span>
                    ) : (
                      <span className="text-xs font-bold bg-slate-100 text-slate-500 rounded-full px-3 py-1">
                        {g.status === 'ended' ? 'ENDED' : 'CLOSED'}
                      </span>
                    )}
                    {report && (
                      <Link href={`/reports/${g.id}`} className="text-primary font-semibold text-sm hover:underline">
                        View report
                      </Link>
                    )}
                    {g.live && <Button variant="secondary" onClick={() => router.push(`/host/${g.roomCode}`)}>Host</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </TeacherLayout>
  );
}
