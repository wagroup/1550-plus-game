'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TeacherLayout from '@/components/TeacherLayout';
import { Button, Card, ErrorBanner } from '@/components/ui';
import { api } from '@/lib/client-api';
import type { GameReport, TeamId } from '@/lib/types';

export default function ReportDetailPage() {
  return (
    <RequireAuth>
      <ReportDetail />
    </RequireAuth>
  );
}

function ReportDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [report, setReport] = useState<GameReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<GameReport>(`/api/reports/${id}`).then(setReport).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report.'));
  }, [id]);

  if (error) return <TeacherLayout title="Report"><ErrorBanner message={error} /></TeacherLayout>;
  if (!report) return <TeacherLayout title="Report"><p className="text-slate-500">Loading…</p></TeacherLayout>;

  const winner = report.winner ? report.teams[report.winner] : null;

  function exportCsv() {
    if (!report) return;
    const lines = [
      ['Question', 'Text', 'Buzzed First', 'Response (s)', 'Result', 'Winning Team'].join(','),
      ...report.questionResults.map((qr) =>
        [
          qr.questionIndex + 1,
          `"${qr.questionText.replace(/"/g, '""')}"`,
          qr.buzzTeamId ? report.teams[qr.buzzTeamId].name : '—',
          qr.buzzResponseMs != null ? (qr.buzzResponseMs / 1000).toFixed(2) : '—',
          qr.result || '—',
          qr.resultTeamId ? report.teams[qr.resultTeamId].name : '—',
        ].join(',')
      ),
      '',
      ['Team', 'Score', 'Correct', 'Incorrect', 'Buzzer Wins', 'Avg Response (s)'].join(','),
      ...(['A', 'B'] as TeamId[]).map((t) =>
        [
          report.teams[t].name,
          report.teams[t].score,
          report.teams[t].correct,
          report.teams[t].incorrect,
          report.teams[t].buzzerWins,
          report.teams[t].avgResponseMs != null ? (report.teams[t].avgResponseMs! / 1000).toFixed(2) : '—',
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `classbuzz-report-${report.roomCode}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <TeacherLayout title={report.title}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-slate-500 font-medium">
          {report.endedAt ? new Date(report.endedAt).toLocaleString() : ''} ·{' '}
          {report.durationMs ? `${Math.round(report.durationMs / 60000)} min · ` : ''}
          {report.totalQuestions} questions · Room {report.roomCode}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>⬇ Export CSV</Button>
          <Button variant="secondary" onClick={() => window.print()}>🖨 Print / PDF</Button>
        </div>
      </div>

      <Card className="p-6 mb-6 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-400 mb-2">Result</p>
        <p className="text-3xl font-black">
          {report.isTie ? '🤝 Tie game' : `🏆 ${winner?.name} wins!`}
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {(['A', 'B'] as TeamId[]).map((teamId) => {
          const team = report.teams[teamId];
          return (
            <Card key={teamId} className="p-5 border-t-8" style={{ borderTopColor: team.color }}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b-4" style={{ borderColor: team.color }}>
                <p className="font-extrabold text-lg" style={{ color: team.color }}>{team.icon} {team.name}</p>
                <p className="text-4xl font-black" style={{ color: team.color }}>{team.score}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate-500">Correct answers</dt><dd className="font-bold text-lg text-correct">{team.correct}</dd></div>
                <div><dt className="text-slate-500">Incorrect answers</dt><dd className="font-bold text-lg text-incorrect">{team.incorrect}</dd></div>
                <div><dt className="text-slate-500">Buzzer wins</dt><dd className="font-bold text-lg">{team.buzzerWins}</dd></div>
                <div><dt className="text-slate-500">Avg buzz time</dt>
                  <dd className="font-bold text-lg">{team.avgResponseMs != null ? `${(team.avgResponseMs / 1000).toFixed(2)}s` : '—'}</dd></div>
              </dl>
              <p className="text-sm text-slate-500 mt-3">
                <span className="font-semibold">Members:</span> {team.members.join(', ') || '—'}
              </p>
            </Card>
          );
        })}
      </div>

      <h2 className="text-xl font-bold mb-4">Question-by-question results</h2>
      <Card className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Buzzed first</th>
              <th className="px-4 py-3">Buzz time</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {report.questionResults.map((qr) => (
              <tr key={qr.questionIndex} className="border-b border-slate-100">
                <td className="px-4 py-3 font-bold">{qr.questionIndex + 1}</td>
                <td className="px-4 py-3 max-w-md">{qr.questionText}</td>
                <td className="px-4 py-3">
                  {qr.buzzTeamId ? (
                    <span className="font-bold" style={{ color: report.teams[qr.buzzTeamId].color }}>
                      {report.teams[qr.buzzTeamId].icon} {report.teams[qr.buzzTeamId].name}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {qr.buzzResponseMs != null ? `${(qr.buzzResponseMs / 1000).toFixed(2)}s` : '—'}
                </td>
                <td className="px-4 py-3">
                  {qr.result === 'correct' && <span className="font-bold text-correct">✓ Correct{qr.resultTeamId ? ` (${report.teams[qr.resultTeamId].name})` : ''}</span>}
                  {qr.result === 'incorrect' && <span className="font-bold text-incorrect">✗ Incorrect</span>}
                  {qr.result === 'skipped' && <span className="font-bold text-waiting">⏭ Skipped</span>}
                  {qr.result === 'revealed' && <span className="font-bold text-waiting">👁 Revealed</span>}
                  {!qr.result && '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <h2 className="text-xl font-bold mb-4">Score history</h2>
      <Card className="p-5">
        {report.scoreHistory.length === 0 ? (
          <p className="text-slate-500 text-sm">No score changes recorded.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {report.scoreHistory.map((event) => (
              <p key={event.id}>
                <span className="text-slate-400 tabular-nums mr-3">{new Date(event.at).toLocaleTimeString()}</span>
                <span className="font-bold" style={{ color: report.teams[event.teamId].color }}>{event.teamName}</span>
                <span className={`font-black mx-2 ${event.change > 0 ? 'text-correct' : 'text-incorrect'}`}>
                  {event.change > 0 ? '+' : ''}{event.change}
                </span>
                <span className="text-slate-600">{event.reason}</span>
              </p>
            ))}
          </div>
        )}
      </Card>
    </TeacherLayout>
  );
}
