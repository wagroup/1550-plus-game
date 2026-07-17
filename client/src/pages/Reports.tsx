import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TeacherLayout from '../components/TeacherLayout';
import { Card } from '../components/ui';
import { api } from '../api';
import type { GameReport } from '../types';

export default function Reports() {
  const [reports, setReports] = useState<GameReport[]>([]);

  useEffect(() => {
    api<GameReport[]>('/api/reports').then(setReports).catch(() => {});
  }, []);

  return (
    <TeacherLayout title="Game Reports">
      {reports.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold">No completed games yet</p>
          <p className="text-sm">Reports appear here after a game ends.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const winner = r.winner ? r.teams[r.winner] : null;
            return (
              <Link key={r.id} to={`/reports/${r.id}`} className="block">
                <Card className="p-5 hover:border-primary transition-colors flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg">{r.title}</p>
                    <p className="text-sm text-slate-500">
                      {r.endedAt ? new Date(r.endedAt).toLocaleString() : '—'} · {r.totalQuestions} questions
                      {r.durationMs ? ` · ${Math.round(r.durationMs / 60000)} min` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold" style={{ color: r.teams.A.color }}>
                      {r.teams.A.icon} {r.teams.A.score}
                    </span>
                    <span className="text-slate-400 font-black text-sm">VS</span>
                    <span className="font-bold" style={{ color: r.teams.B.color }}>
                      {r.teams.B.icon} {r.teams.B.score}
                    </span>
                    <span className="text-sm font-bold bg-slate-100 rounded-full px-3 py-1">
                      {r.isTie ? '🤝 Tie' : `🏆 ${winner?.name}`}
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
