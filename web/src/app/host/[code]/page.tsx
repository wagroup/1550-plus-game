'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import RequireAuth from '@/components/RequireAuth';
import { Button, Card, ConfirmDialog, ConnectionDot, ErrorBanner, useCountdown, CountdownRing, Confetti } from '@/components/ui';
import { useRoomPoll, teacherAction } from '@/lib/use-room';
import type { GameState, Member, TeamId } from '@/lib/types';

export default function HostPage() {
  return (
    <RequireAuth>
      <Host />
    </RequireAuth>
  );
}

function Host() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const roomCode = (params.code || '').toUpperCase();

  const { state, setState, error, setError, connected } = useRoomPoll(roomCode, 'teacher');

  const action = useCallback(
    (type: string, payload?: unknown) => {
      teacherAction(roomCode, type, payload)
        .then((r) => {
          if (r.state) setState(r.state);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Action failed'));
    },
    [roomCode, setState, setError]
  );

  if (error && !state) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6">
        <ErrorBanner message={error} />
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }
  if (!state) {
    return <div className="min-h-full flex items-center justify-center text-slate-500 font-semibold">Connecting to room…</div>;
  }

  if (state.phase === 'lobby') {
    return <HostLobby state={state} action={action} connected={connected} error={error} />;
  }
  if (state.phase === 'ended') {
    return <HostEnded state={state} />;
  }
  return <HostLive state={state} action={action} connected={connected} error={error} />;
}

// ---------------- Lobby ----------------

function HostLobby({ state, action, connected, error }: {
  state: GameState;
  action: (type: string, payload?: unknown) => void;
  connected: boolean;
  error: string | null;
}) {
  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${state.roomCode}`;
  const [copied, setCopied] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const totalConnected =
    state.teams.A.members.filter((m) => m.connected).length +
    state.teams.B.members.filter((m) => m.connected).length +
    state.unassigned.filter((m) => m.connected).length;

  const canStart =
    state.teams.A.members.length > 0 &&
    state.teams.B.members.length > 0 &&
    state.unassigned.filter((m) => m.connected).length === 0;

  function copyLink() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="min-h-full bg-surface p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{state.title}</h1>
            <p className="text-slate-500 font-medium">Game lobby · {totalConnected} student{totalConnected !== 1 ? 's' : ''} connected</p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionDot connected={connected} />
            <Link href="/dashboard" className="text-slate-500 font-semibold hover:text-navy">Dashboard</Link>
          </div>
        </div>

        <ErrorBanner message={error} />

        <div className="grid lg:grid-cols-3 gap-6 mt-4">
          <Card className="p-6 text-center">
            <p className="font-bold text-slate-500 uppercase text-sm tracking-wide mb-2">Room code</p>
            <p className="text-5xl font-black tracking-[0.2em] text-primary mb-4">{state.roomCode}</p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <p className="text-sm text-slate-500 break-all mb-3">{joinUrl}</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="secondary" onClick={copyLink}>{copied ? '✓ Copied' : 'Copy link'}</Button>
              <Button variant="secondary" onClick={() => window.open(`/projector/${state.roomCode}`, '_blank')}>
                🖥️ Open projector
              </Button>
            </div>
            <label className="flex items-center justify-center gap-2 mt-4 cursor-pointer text-sm font-medium text-slate-600">
              <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={state.roomLocked}
                onChange={(e) => action('lock_room', { locked: e.target.checked })} />
              Lock room (block new joins)
            </label>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {(['A', 'B'] as TeamId[]).map((teamId) => (
                <TeamPanel key={teamId} state={state} teamId={teamId} action={action} />
              ))}
            </div>

            <Card className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <h3 className="font-bold">Unassigned students ({state.unassigned.length})</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => action('randomize_teams')}>🎲 Randomize all</Button>
                  <Button variant="secondary" onClick={() => action('balance_teams')}>⚖️ Auto-balance</Button>
                </div>
              </div>
              {state.unassigned.length === 0 ? (
                <p className="text-sm text-slate-400">Everyone is on a team.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {state.unassigned.map((m) => (
                    <StudentChip key={m.id} member={m} action={action} state={state} />
                  ))}
                </div>
              )}
            </Card>

            <div className="flex items-center justify-between flex-wrap gap-3">
              {!canStart && (
                <p className="text-sm font-medium text-warning">
                  ⚠️ Both teams need at least one member and every connected student must be assigned.
                </p>
              )}
              <Button className="text-xl px-10 py-4 ml-auto" disabled={!canStart} onClick={() => setConfirmStart(true)}>
                ▶ Start Game
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmStart}
        title="Start the game?"
        message={`${state.teams.A.name}: ${state.teams.A.members.length} · ${state.teams.B.name}: ${state.teams.B.members.length}. Students can no longer change teams.`}
        confirmLabel="Start Game"
        onConfirm={() => action('start_game')}
        onCancel={() => setConfirmStart(false)}
      />
    </div>
  );
}

function TeamPanel({ state, teamId, action }: {
  state: GameState;
  teamId: TeamId;
  action: (type: string, payload?: unknown) => void;
}) {
  const team = state.teams[teamId];
  const [dragOver, setDragOver] = useState(false);
  return (
    <Card
      className={`p-4 border-t-8 transition-shadow ${dragOver ? 'ring-2 ring-primary' : ''}`}
      style={{ borderTopColor: team.color }}
    >
      <div
        className="min-h-full"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const id = e.dataTransfer.getData('text/participant');
          if (id) action('assign_team', { participantId: id, teamId });
        }}
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-4" style={{ borderColor: team.color }}>
          <span className="text-2xl">{team.icon}</span>
          <h3 className="font-extrabold" style={{ color: team.color }}>{team.name}</h3>
          <span className="ml-auto text-sm font-bold text-slate-400">{team.members.length}</span>
        </div>
        {team.members.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">Drag students here or use the buttons.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {team.members.map((m) => (
              <StudentChip key={m.id} member={m} action={action} state={state} currentTeam={teamId} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function StudentChip({ member, action, state, currentTeam }: {
  member: Member;
  action: (type: string, payload?: unknown) => void;
  state: GameState;
  currentTeam?: TeamId;
}) {
  return (
    <span
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/participant', member.id)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white cursor-grab active:cursor-grabbing ${
        member.connected ? 'border-slate-300 text-navy' : 'border-slate-200 text-slate-400'
      }`}
      title={member.connected ? 'Connected' : 'Disconnected'}
    >
      <span className={`w-2 h-2 rounded-full ${member.connected ? 'bg-correct' : 'bg-slate-300'}`} />
      {member.name}
      {currentTeam !== 'A' && (
        <button className="cursor-pointer hover:scale-110" title={`Move to ${state.teams.A.name}`}
          onClick={() => action('assign_team', { participantId: member.id, teamId: 'A' })}>
          {state.teams.A.icon}
        </button>
      )}
      {currentTeam !== 'B' && (
        <button className="cursor-pointer hover:scale-110" title={`Move to ${state.teams.B.name}`}
          onClick={() => action('assign_team', { participantId: member.id, teamId: 'B' })}>
          {state.teams.B.icon}
        </button>
      )}
      <button className="text-slate-400 hover:text-incorrect cursor-pointer ml-0.5" title="Remove student"
        onClick={() => action('remove_student', { participantId: member.id })}>
        ✕
      </button>
    </span>
  );
}

// ---------------- Live control panel ----------------

function HostLive({ state, action, connected, error }: {
  state: GameState;
  action: (type: string, payload?: unknown) => void;
  connected: boolean;
  error: string | null;
}) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const readingLeft = useCountdown(state.readingEndsAt, state.serverNow);
  const discussionLeft = useCountdown(state.discussionEndsAt, state.serverNow);
  const buzz = state.round?.buzz || null;
  const buzzTeam = buzz ? state.teams[buzz.teamId] : null;
  const phase = state.phase;
  const q = state.question;

  const phaseLabel: Record<string, string> = {
    question_idle: '⏸ Buzzer closed',
    question_reading: '📖 Students are reading the question',
    buzzer_active: '🔔 BUZZER OPEN — waiting for a press',
    team_buzzed: `🙋 ${buzzTeam?.name ?? ''} is answering`,
    round_result: state.round?.result === 'correct' ? '✅ Correct!' : state.round?.result === 'skipped' ? '⏭ Skipped' : '❌ Round over',
    paused: '⏸ Game paused',
  };

  return (
    <div className="min-h-full bg-surface p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold">{state.title}</h1>
            <span className="text-sm font-bold bg-slate-200 text-slate-600 rounded-full px-3 py-1">
              Q {state.currentQuestionIndex + 1} / {state.totalQuestions}
            </span>
            <span className="text-sm font-mono font-bold text-primary">{state.roomCode}</span>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionDot connected={connected} />
            <Button variant="secondary" onClick={() => window.open(`/projector/${state.roomCode}`, '_blank')}>🖥️ Projector</Button>
            {phase === 'paused'
              ? <Button variant="success" onClick={() => action('resume_game')}>▶ Resume</Button>
              : <Button variant="secondary" onClick={() => action('pause_game')}>⏸ Pause</Button>}
            <Button variant="danger" onClick={() => setConfirmEnd(true)}>End Game</Button>
          </div>
        </div>

        <ErrorBanner message={error} />

        <div className="grid lg:grid-cols-3 gap-4 mt-2">
          {/* Left: question */}
          <Card className="p-5 lg:col-span-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Current question</p>
            {q ? (
              <>
                <p className="text-lg font-bold mb-3">{q.text}</p>
                {q.options.length > 0 && (
                  <ul className="space-y-1.5 mb-3">
                    {q.options.map((opt, i) => (
                      <li key={i} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        q.correctAnswer === opt ? 'bg-green-50 text-correct border border-green-200' : 'bg-slate-50'
                      }`}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm">
                  <span className="font-bold text-correct">Answer: </span>{q.correctAnswer || '—'}
                  {q.explanation && <p className="text-slate-600 mt-1">{q.explanation}</p>}
                </div>
                <p className="text-xs text-slate-400 mt-2">Worth {q.points} point{q.points !== 1 ? 's' : ''}</p>
              </>
            ) : <p className="text-slate-400">No question.</p>}
          </Card>

          {/* Center: game state */}
          <Card className="p-5 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-lg font-extrabold">{phaseLabel[phase] ?? phase}</p>
            {phase === 'question_reading' && readingLeft !== null && (
              <CountdownRing remainingMs={readingLeft} totalSeconds={state.settings.readingSeconds} />
            )}
            {phase === 'team_buzzed' && (
              <>
                {discussionLeft !== null && (
                  <CountdownRing remainingMs={discussionLeft} totalSeconds={state.settings.discussionSeconds} color={buzzTeam?.color} />
                )}
                <div className="rounded-xl px-5 py-3 text-white font-bold animate-pop" style={{ background: buzzTeam?.color }}>
                  {buzzTeam?.icon} {buzzTeam?.name}
                  {buzz?.participantName && <p className="text-sm font-medium opacity-90">Buzzed by {buzz.participantName}
                    {buzz.responseMs != null && ` · ${(buzz.responseMs / 1000).toFixed(2)}s`}</p>}
                  {buzz?.secondChance && <p className="text-sm font-medium opacity-90">Second chance</p>}
                </div>
              </>
            )}
            {phase === 'round_result' && state.round?.answerRevealed && q?.correctAnswer && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-3">
                <p className="font-bold text-correct">Answer: {q.correctAnswer}</p>
              </div>
            )}
            <div className="flex gap-2 flex-wrap justify-center mt-1">
              {phase === 'question_idle' && <Button onClick={() => action('open_buzzer')} className="text-lg px-6">🔔 Open Buzzer</Button>}
              {phase === 'question_reading' && <Button onClick={() => action('open_buzzer')} className="text-lg px-6">🔔 Open Buzzer Now</Button>}
              {phase === 'buzzer_active' && <Button variant="secondary" onClick={() => action('lock_buzzer')}>🔒 Lock Buzzer</Button>}
              {(phase === 'team_buzzed' || phase === 'buzzer_active') && (
                <Button variant="secondary" onClick={() => action('reset_buzzer')}>↺ Reset Buzzer</Button>
              )}
            </div>
          </Card>

          {/* Right: decisions */}
          <Card className="p-5 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Decisions</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="success" className="text-lg py-3" disabled={phase !== 'team_buzzed'}
                onClick={() => action('mark_correct')}>✓ Correct</Button>
              <Button variant="danger" className="text-lg py-3" disabled={phase !== 'team_buzzed'}
                onClick={() => action('mark_incorrect')}>✗ Incorrect</Button>
            </div>
            <Button variant="secondary" className="w-full" disabled={phase !== 'team_buzzed'}
              onClick={() => action('other_team_chance')}>↔ Give Other Team a Chance</Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" disabled={!q || state.round?.answerRevealed}
                onClick={() => action('reveal_answer')}>👁 Reveal Answer</Button>
              <Button variant="secondary" disabled={phase === 'round_result'}
                onClick={() => action('skip_question')}>⏭ Skip</Button>
              <Button variant="secondary" onClick={() => action('restart_question')}>↺ Restart Question</Button>
              <Button className="font-bold" onClick={() => action('next_question')}>
                {state.currentQuestionIndex + 1 >= state.totalQuestions ? '🏁 Finish Game' : '→ Next Question'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Scores + history */}
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          {(['A', 'B'] as TeamId[]).map((teamId) => {
            const team = state.teams[teamId];
            return (
              <Card key={teamId} className="p-4 border-t-8" style={{ borderTopColor: team.color }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{team.icon}</span>
                    <div>
                      <p className="font-extrabold" style={{ color: team.color }}>{team.name}</p>
                      <p className="text-xs text-slate-400">{team.members.filter((m) => m.connected).length}/{team.members.length} online</p>
                    </div>
                  </div>
                  <p className="text-5xl font-black tabular-nums" style={{ color: team.color }}>{team.score}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" className="flex-1 !py-1.5" onClick={() => action('adjust_score', { teamId, change: 1, reason: 'Manual +1' })}>+1</Button>
                  <Button variant="secondary" className="flex-1 !py-1.5" onClick={() => action('adjust_score', { teamId, change: -1, reason: 'Manual −1' })}>−1</Button>
                </div>
              </Card>
            );
          })}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Event history</p>
              <Button variant="ghost" className="!py-1 !px-2 text-sm" disabled={!state.scoreHistory.length}
                onClick={() => action('undo_score')}>↩ Undo last score</Button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 text-sm">
              {[...state.eventLog].reverse().map((event) => (
                <p key={event.id} className="text-slate-600">
                  <span className="text-slate-400 tabular-nums mr-2">
                    {new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {event.message}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title="End the game?"
        message="The final result will be shown to everyone and the room will close."
        confirmLabel="End Game"
        danger
        onConfirm={() => { setConfirmEnd(false); action('end_game'); }}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  );
}

// ---------------- Ended ----------------

function HostEnded({ state }: { state: GameState }) {
  const router = useRouter();
  const report = state.finalReport;
  const winner = report?.winner ? state.teams[report.winner] : null;
  const colors = useMemo(() => (winner ? [winner.color, '#FFD700', '#ffffff'] : ['#2563EB', '#F97316', '#FFD700']), [winner]);

  return (
    <div className="min-h-full bg-navy text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <Confetti colors={colors} />
      <p className="text-slate-300 font-bold uppercase tracking-widest mb-3">Final Result</p>
      {winner ? (
        <>
          <div className="text-7xl mb-3 animate-pop">{winner.icon}</div>
          <h1 className="text-5xl font-black mb-2 animate-pop" style={{ color: winner.color }}>{winner.name} wins!</h1>
        </>
      ) : (
        <h1 className="text-5xl font-black mb-2 animate-pop text-warning">It&apos;s a tie!</h1>
      )}
      <div className="flex items-center gap-8 my-8">
        {(['A', 'B'] as TeamId[]).map((teamId) => {
          const team = state.teams[teamId];
          return (
            <div key={teamId} className="text-center rounded-2xl px-10 py-6" style={{ background: `${team.color}22`, border: `2px solid ${team.color}` }}>
              <div className="text-4xl">{team.icon}</div>
              <p className="font-bold text-lg" style={{ color: team.color }}>{team.name}</p>
              <p className="text-6xl font-black tabular-nums">{team.score}</p>
              {report && (
                <p className="text-sm text-slate-300 mt-1">
                  ✓ {report.teams[teamId].correct} correct · ✗ {report.teams[teamId].incorrect} incorrect
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4">
        <Button onClick={() => router.push(`/reports/${state.id}`)}>📊 View Full Report</Button>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
      </div>
    </div>
  );
}
