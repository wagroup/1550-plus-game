'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TeacherLayout from '@/components/TeacherLayout';
import { Button, Card } from '@/components/ui';
import { Icon } from '@/components/icons';
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
    <TeacherLayout title={`Welcome back, ${teacher?.name?.split(' ')[0] || 'Teacher'}`}>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} variant="light" className="p-5">
            <p className="font-ui text-sm font-medium text-text-secondary">{s.label}</p>
            <p className="font-display mt-1 text-3xl text-primary">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mb-10 flex flex-wrap gap-4">
        <Button showArrow={false} onClick={() => router.push('/create-game')}>
          Create New Game
        </Button>
        <Button variant="outline" showArrow={false} onClick={() => router.push('/question-sets')}>
          Manage Question Sets
        </Button>
      </div>

      {activeGames.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display mb-4 text-2xl text-text-body-dark">Active games</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeGames.map((g) => (
              <Card key={g.id} variant="light" className="flex items-center justify-between border-2 border-primary p-5">
                <div>
                  <p className="font-ui font-semibold text-text-body-dark">{g.title}</p>
                  <p className="font-ui text-sm text-text-secondary">
                    Room code: <span className="font-mono font-bold text-primary">{g.roomCode}</span>
                  </p>
                </div>
                <Button variant="login" showArrow={false} onClick={() => router.push(`/host/${g.roomCode}`)}>
                  Open Host
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display mb-4 text-2xl text-text-body-dark">Recent games</h2>
        {games.length === 0 ? (
          <Card variant="light" className="p-10 text-center text-text-secondary">
            <div className="mb-3 flex justify-center text-primary">
              <Icon name="target" size={40} />
            </div>
            <p className="font-ui font-semibold text-text-body-dark mb-1">No games yet</p>
            <p className="font-body text-sm">Create your first game to get your class buzzing.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {games.slice(0, 8).map((g) => {
              const report = reports.find((r) => r.id === g.id);
              return (
                <Card key={g.id} variant="light" className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-ui font-semibold text-text-body-dark">{g.title}</p>
                    <p className="font-ui text-sm text-text-secondary">
                      {new Date(g.createdAt).toLocaleString()} · {g.teams.A.name} vs {g.teams.B.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {g.live ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 font-ui text-xs font-bold text-correct">LIVE</span>
                    ) : (
                      <span className="rounded-full bg-primary/10 px-3 py-1 font-ui text-xs font-bold text-text-secondary">
                        {g.status === 'ended' ? 'ENDED' : 'CLOSED'}
                      </span>
                    )}
                    {report && (
                      <Link href={`/reports/${g.id}`} className="font-ui text-sm font-semibold text-primary hover:underline">
                        View report
                      </Link>
                    )}
                    {g.live && (
                      <Button variant="outline" showArrow={false} onClick={() => router.push(`/host/${g.roomCode}`)}>
                        Host
                      </Button>
                    )}
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
