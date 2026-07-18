'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TeacherLayout from '@/components/TeacherLayout';
import { Button, Card, Field, inputClassLight, ErrorBanner } from '@/components/ui';
import { DEFAULT_TEAM_ICONS, TEAM_ICON_OPTIONS, TeamIcon } from '@/components/icons';
import { api } from '@/lib/client-api';
import type { GameSettings, QuestionSet } from '@/lib/types';

const TEAM_ICONS = TEAM_ICON_OPTIONS;
const TEAM_COLORS = ['#2A4DFF', '#F97316', '#16A34A', '#DC2626', '#9333EA', '#0891B2', '#DB2777', '#CA8A04'];

export default function CreateGamePage() {
  return (
    <RequireAuth>
      <CreateGame />
    </RequireAuth>
  );
}

function CreateGame() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [questionSetId, setQuestionSetId] = useState('');
  const [teamA, setTeamA] = useState({ name: 'Team Tigers', color: '#2A4DFF', icon: DEFAULT_TEAM_ICONS.A });
  const [teamB, setTeamB] = useState({ name: 'Team Eagles', color: '#F97316', icon: DEFAULT_TEAM_ICONS.B });
  const [settings, setSettings] = useState<GameSettings>({
    readingSeconds: 5,
    discussionSeconds: 15,
    autoOpenBuzzer: true,
    pointsCorrect: 1,
    penaltyWrong: 0,
    secondChance: 'other_team',
    allowTeamSelect: true,
    allowLateJoin: true,
    soundEnabled: true,
  });

  useEffect(() => {
    api<QuestionSet[]>('/api/question-sets').then((qs) => {
      setSets(qs);
      if (qs.length && !questionSetId) setQuestionSetId(qs[0].id);
    }).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load question sets.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSet = sets.find((s) => s.id === questionSetId);

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const data = await api<{ game: { roomCode: string } }>('/api/games', {
        method: 'POST',
        body: { title: title || selectedSet?.title, questionSetId, teams: { A: teamA, B: teamB }, settings },
      });
      router.push(`/host/${data.game.roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create game.');
      setCreating(false);
    }
  }

  const steps = ['Game & Questions', 'Teams', 'Rules'];

  return (
    <TeacherLayout title="Create New Game">
      <div className="flex gap-2 mb-8">
        {steps.map((label, i) => (
          <div key={label} className={`flex-1 text-center py-2 rounded-xl font-semibold text-sm ${
            step === i + 1 ? 'bg-primary text-white' : step > i + 1 ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-text-secondary'
          }`}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <ErrorBanner message={error} />

      {step === 1 && (
        <Card variant="light" className="p-6 space-y-5 max-w-2xl">
          <Field label="Game title" light>
            <input className={inputClassLight} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedSet ? selectedSet.title : 'Friday Science Showdown'} />
          </Field>
          <Field label="Question set" light>
            {sets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-primary/30 p-6 text-center text-text-secondary">
                <p className="mb-3">You don&apos;t have any question sets yet.</p>
                <Link href="/question-sets" className="text-primary font-semibold hover:underline">Create a question set first →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {sets.map((s) => (
                  <button key={s.id} type="button" onClick={() => setQuestionSetId(s.id)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors cursor-pointer ${
                      questionSetId === s.id ? 'border-primary bg-primary/5' : 'border-primary/15 hover:border-primary/40'
                    }`}>
                    <span className="font-ui font-semibold text-text-body-dark">{s.title}</span>
                    <span className="ml-2 font-ui text-sm text-text-secondary">{s.questions.length} questions{s.subject ? ` · ${s.subject}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </Field>
          <div className="flex justify-end">
            <Button showArrow={false} onClick={() => setStep(2)} disabled={!questionSetId} className="px-8">Continue</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          {([['A', teamA, setTeamA], ['B', teamB, setTeamB]] as const).map(([id, team, setTeam]) => (
            <Card key={id} variant="light" className="p-6 border-t-8" style={{ borderTopColor: team.color }}>
              <h3 className="font-display mb-4 text-xl text-primary">Team {id}</h3>
              <div className="space-y-4">
                <Field label="Team name" light>
                  <input className={inputClassLight} value={team.name} maxLength={30}
                    onChange={(e) => setTeam({ ...team, name: e.target.value })} />
                </Field>
                <Field label="Team icon" light>
                  <div className="flex flex-wrap gap-2">
                    {TEAM_ICONS.map((iconKey) => (
                      <button key={iconKey} type="button" onClick={() => setTeam({ ...team, icon: iconKey })}
                        className={`cursor-pointer rounded-lg p-2 ${team.icon === iconKey ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-primary/5'}`}>
                        <TeamIcon icon={iconKey} size={28} color={team.color} />
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Team color" light>
                  <div className="flex flex-wrap gap-2">
                    {TEAM_COLORS.map((color) => (
                      <button key={color} type="button" onClick={() => setTeam({ ...team, color })}
                        className={`w-9 h-9 rounded-full cursor-pointer ${team.color === color ? 'ring-4 ring-offset-2 ring-slate-400' : ''}`}
                        style={{ background: color }} aria-label={`Color ${color}`} />
                    ))}
                  </div>
                </Field>
              </div>
            </Card>
          ))}
          <div className="md:col-span-2 flex justify-between">
            <Button variant="outline" showArrow={false} onClick={() => setStep(1)}>Back</Button>
            <Button showArrow={false} onClick={() => setStep(3)} className="px-8"
              disabled={!teamA.name.trim() || !teamB.name.trim()}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card variant="light" className="p-6 space-y-5 max-w-2xl">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Question reading time (seconds)" light>
              <input className={inputClassLight} type="number" min={0} max={60} value={settings.readingSeconds}
                onChange={(e) => setSettings({ ...settings, readingSeconds: Math.max(0, +e.target.value) })} />
            </Field>
            <Field label="Team discussion time (seconds)" light>
              <input className={inputClassLight} type="number" min={0} max={120} value={settings.discussionSeconds}
                onChange={(e) => setSettings({ ...settings, discussionSeconds: Math.max(0, +e.target.value) })} />
            </Field>
            <Field label="Points for a correct answer" light>
              <input className={inputClassLight} type="number" min={1} max={10} value={settings.pointsCorrect}
                onChange={(e) => setSettings({ ...settings, pointsCorrect: Math.max(1, +e.target.value) })} />
            </Field>
            <Field label="Wrong-answer penalty (0 = none)" light>
              <input className={inputClassLight} type="number" min={0} max={10} value={settings.penaltyWrong}
                onChange={(e) => setSettings({ ...settings, penaltyWrong: Math.max(0, +e.target.value) })} />
            </Field>
          </div>
          <Field label="After a wrong answer" light>
            <select className={inputClassLight} value={settings.secondChance}
              onChange={(e) => setSettings({ ...settings, secondChance: e.target.value as GameSettings['secondChance'] })}>
              <option value="other_team">The other team automatically gets the turn</option>
              <option value="reopen">Reopen the buzzer for the other team only</option>
              <option value="end">End the question (reveal answer, move on)</option>
            </select>
          </Field>
          <div className="space-y-3">
            {([
              ['autoOpenBuzzer', 'Open the buzzer automatically after the reading countdown'],
              ['allowTeamSelect', 'Let students choose their own team when joining'],
              ['allowLateJoin', 'Allow students to join after the game has started'],
              ['soundEnabled', 'Enable sound effects'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="h-5 w-5 accent-primary" checked={settings[key]}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} />
                <span className="font-ui font-medium text-text-body-dark">{label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" showArrow={false} onClick={() => setStep(2)}>Back</Button>
            <Button showArrow={false} onClick={create} disabled={creating} className="px-8">
              {creating ? 'Creating room…' : 'Create Room'}
            </Button>
          </div>
        </Card>
      )}
    </TeacherLayout>
  );
}
