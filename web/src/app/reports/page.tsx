'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import TeacherLayout from '@/components/TeacherLayout';
import { Card } from '@/components/ui';
import { Icon, TeamIconLabel } from '@/components/icons';
import { api } from '@/lib/client-api';
import type { GameReport } from '@/lib/types';

export default function ReportsPage() {
  return (
    <RequireAuth>
      <Reports />
    </RequireAuth>
  );
}

function Reports() {
  const [reports, setReports] = useState<GameReport[]>([]);

  useEffect(() => {
    api<GameReport[]>('/api/reports').then(setReports).catch(() => {});
  }, []);

  return (
    <TeacherLayout title="Game Reports">
      {reports.length === 0 ? (
        <Card variant="light" className="p-10 text-center text-text-secondary">
          <div className="mb-3 flex justify-center text-primary">
            <Icon name="chart" size={40} />
          </div>
          <p className="font-ui font-semibold text-text-body-dark">No completed games yet</p>
          <p className="font-body text-sm">Reports appear here after a game ends.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const winner = r.winner ? r.teams[r.winner] : null;
            return (
              <Link key={r.id} href={`/reports/${r.id}`} className="block">
                <Card variant="light" className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:border-primary">
                  <div>
                    <p className="font-ui text-lg font-semibold text-text-body-dark">{r.title}</p>
                    <p className="font-ui text-sm text-text-secondary">
                      {r.endedAt ? new Date(r.endedAt).toLocaleString() : '—'} · {r.totalQuestions} questions
                      {r.durationMs ? ` · ${Math.round(r.durationMs / 60000)} min` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <TeamIconLabel icon={r.teams.A.icon} size={18} color={r.teams.A.color}>
                      {r.teams.A.score}
                    </TeamIconLabel>
                    <span className="font-display text-sm text-text-secondary">VS</span>
                    <TeamIconLabel icon={r.teams.B.icon} size={18} color={r.teams.B.color}>
                      {r.teams.B.score}
                    </TeamIconLabel>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-ui text-sm font-bold text-text-body-dark">
                      {r.isTie ? (
                        <><Icon name="handshake" size={16} /> Tie</>
                      ) : (
                        <><Icon name="award" size={16} /> {winner?.name}</>
                      )}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </TeacherLayout>
  );
}
