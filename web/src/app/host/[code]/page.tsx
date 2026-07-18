'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import RequireAuth from '@/components/RequireAuth';
import { Button, Card, ConfirmDialog, ConnectionDot, ErrorBanner, useCountdown, CountdownRing, Confetti } from '@/components/ui';
import { Icon, IconLabel, TeamIcon, TeamIconLabel } from '@/components/icons';
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
    return <div className="min-h-full flex items-center justify-center text-text-secondary font-semibold">Connecting to room…</div>;
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
            <h1 className="text-2xl md:text-3xl">{state.title}</h1>
            <p className="text-text-secondary font-medium">Game lobby · {totalConnected} student{totalConnected !== 1 ? 's' : ''} connected</p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionDot connected={connected} light />
            <Link href="/dashboard" className="text-text-secondary font-semibold hover:text-primary">Dashboard</Link>
          </div>
        </div>

        <ErrorBanner message={error} />

        <div className="grid lg:grid-cols-3 gap-6 mt-4">
          <Card variant="light" className="p-6 text-center">
            <p className="font-bold text-text-secondary uppercase text-sm tracking-wide mb-2">Room code</p>
            <p className="font-display text-5xl tracking-[0.2em] text-primary mb-4">{state.roomCode}</p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <p className="text-sm text-text-secondary break-all mb-3">{joinUrl}</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="outline" showArrow={false} onClick={copyLink}>
                {copied ? <IconLabel icon="check">Copied</IconLabel> : <IconLabel icon="copy">Copy link</IconLabel>}
              </Button>
              <Button variant="outline" showArrow={false} onClick={() => window.open(`/projector/${state.roomCode}`, '_blank')}>
                <IconLabel icon="projector">Open projector</IconLabel>
              </Button>
            </div>
            <label className="flex items-center justify-center gap-2 mt-4 cursor-pointer text-sm font-medium text-text-body-dark">
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

            <Card variant="light" className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <h3 className="font-display text-lg">Unassigned students ({state.unassigned.length})</h3>
                <div className="flex gap-2">
                  <Button variant="outline" showArrow={false} onClick={() => action('randomize_teams')}>
                    <IconLabel icon="dice">Randomize all</IconLabel>
                  </Button>
                  <Button variant="outline" showArrow={false} onClick={() => action('balance_teams')}>
                    <IconLabel icon="balance">Auto-balance</IconLabel>
                  </Button>
                </div>
              </div>
              {state.unassigned.length === 0 ? (
                <p className="text-sm text-text-secondary">Everyone is on a team.</p>
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
                <p className="inline-flex items-center gap-2 text-sm font-medium text-warning">
                  <Icon name="alert" size={16} />
                  Both teams need at least one member and every connected student must be assigned.
                </p>
              )}
              <Button className="ml-auto" showArrow={false} disabled={!canStart} onClick={() => setConfirmStart(true)}>
                <IconLabel icon="play">Start Game</IconLabel>
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
          <TeamIcon icon={team.icon} size={24} color={team.color} />
          <h3 className="font-display" style={{ color: team.color }}>{team.name}</h3>
          <span className="ml-auto text-sm font-bold text-text-secondary">{team.members.length}</span>
        </div>
        {team.members.length === 0 ? (
          <p className="text-sm text-text-secondary py-3">Drag students here or use the buttons.</p>
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
        member.connected ? 'border-primary/20 text-text-body-dark' : 'border-primary/15 text-text-secondary'
      }`}
      title={member.connected ? 'Connected' : 'Disconnected'}
    >
      <span className={`w-2 h-2 rounded-full ${member.connected ? 'bg-correct' : 'bg-slate-300'}`} />
      {member.name}
      {currentTeam !== 'A' && (
        <button className="cursor-pointer hover:scale-110" title={`Move to ${state.teams.A.name}`}
          onClick={() => action('assign_team', { participantId: member.id, teamId: 'A' })}>
          <TeamIcon icon={state.teams.A.icon} size={16} color={state.teams.A.color} />
        </button>
      )}
      {currentTeam !== 'B' && (
        <button className="cursor-pointer hover:scale-110" title={`Move to ${state.teams.B.name}`}
          onClick={() => action('assign_team', { participantId: member.id, teamId: 'B' })}>
          <TeamIcon icon={state.teams.B.icon} size={16} color={state.teams.B.color} />
        </button>
      )}
      <button className="ml-0.5 cursor-pointer text-text-secondary hover:text-incorrect" title="Remove student"
        onClick={() => action('remove_student', { participantId: member.id })}>
        <Icon name="cancel" size={14} />
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

  const phaseLabel = (() => {
    switch (phase) {
      case 'question_idle':
        return <IconLabel icon="pause">Buzzer closed</IconLabel>;
      case 'question_reading':
        return <IconLabel icon="book">Students are reading the question</IconLabel>;
      case 'buzzer_active':
        return <IconLabel icon="notification">BUZZER OPEN — waiting for a press</IconLabel>;
      case 'team_buzzed':
        return (
          <IconLabel icon="question">
            {buzzTeam?.name ?? 'Team'} is answering
          </IconLabel>
        );
      case 'round_result':
        if (state.round?.result === 'correct') return <IconLabel icon="check">Correct!</IconLabel>;
        if (state.round?.result === 'skipped') return <IconLabel icon="skip">Skipped</IconLabel>;
        return <IconLabel icon="cancel">Round over</IconLabel>;
      case 'paused':
        return <IconLabel icon="pause">Game paused</IconLabel>;
      default:
        return phase;
    }
  })();

  return (
    <div className="min-h-full bg-surface p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl">{state.title}</h1>
            <span className="text-sm font-bold bg-primary/10 text-text-body-dark rounded-full px-3 py-1">
              Q {state.currentQuestionIndex + 1} / {state.totalQuestions}
            </span>
            <span className="text-sm font-mono font-bold text-primary">{state.roomCode}</span>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionDot connected={connected} light />
            <Button variant="outline" showArrow={false} onClick={() => window.open(`/projector/${state.roomCode}`, '_blank')}>
              <IconLabel icon="projector">Projector</IconLabel>
            </Button>
            {phase === 'paused'
              ? <Button variant="success" showArrow={false} onClick={() => action('resume_game')}><IconLabel icon="play">Resume</IconLabel></Button>
              : <Button variant="outline" showArrow={false} onClick={() => action('pause_game')}><IconLabel icon="pause">Pause</IconLabel></Button>}
            <Button variant="danger" onClick={() => setConfirmEnd(true)}>End Game</Button>
          </div>
        </div>

        <ErrorBanner message={error} />

        <div className="grid lg:grid-cols-3 gap-4 mt-2">
          {/* Left: question */}
          <Card variant="light" className="p-5 lg:col-span-1">
            <p className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">Current question</p>
            {q ? (
              <>
                <p className="text-lg font-bold mb-3">{q.text}</p>
                {q.options.length > 0 && (
                  <ul className="space-y-1.5 mb-3">
                    {q.options.map((opt, i) => (
                      <li key={i} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        q.correctAnswer === opt ? 'bg-green-50 text-correct border border-green-200' : 'bg-primary/5'
                      }`}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm">
                  <span className="font-bold text-correct">Answer: </span>{q.correctAnswer || '—'}
                  {q.explanation && <p className="text-text-body-dark mt-1">{q.explanation}</p>}
                </div>
                <p className="text-xs text-text-secondary mt-2">Worth {q.points} point{q.points !== 1 ? 's' : ''}</p>
              </>
            ) : <p className="text-text-secondary">No question.</p>}
          </Card>

          {/* Center: game state */}
          <Card variant="light" className="p-5 flex flex-col items-center justify-center text-center gap-3">
            <p className="font-display text-lg">{phaseLabel}</p>
            {phase === 'question_reading' && readingLeft !== null && (
              <CountdownRing remainingMs={readingLeft} totalSeconds={state.settings.readingSeconds} />
            )}
            {phase === 'team_buzzed' && (
              <>
                {discussionLeft !== null && (
                  <CountdownRing remainingMs={discussionLeft} totalSeconds={state.settings.discussionSeconds} color={buzzTeam?.color} />
                )}
                <div className="animate-pop rounded-xl px-5 py-3 font-bold text-white" style={{ background: buzzTeam?.color }}>
                  <TeamIconLabel icon={buzzTeam?.icon ?? 'star'} size={20} color="#fff">
                    {buzzTeam?.name}
                  </TeamIconLabel>
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
              {phase === 'question_idle' && <Button showArrow={false} onClick={() => action('open_buzzer')} className="px-6"><IconLabel icon="notification">Open Buzzer</IconLabel></Button>}
              {phase === 'question_reading' && <Button showArrow={false} onClick={() => action('open_buzzer')} className="px-6"><IconLabel icon="notification">Open Buzzer Now</IconLabel></Button>}
              {phase === 'buzzer_active' && <Button variant="outline" showArrow={false} onClick={() => action('lock_buzzer')}><IconLabel icon="lock">Lock Buzzer</IconLabel></Button>}
              {(phase === 'team_buzzed' || phase === 'buzzer_active') && (
                <Button variant="outline" showArrow={false} onClick={() => action('reset_buzzer')}><IconLabel icon="refresh">Reset Buzzer</IconLabel></Button>
              )}
            </div>
          </Card>

          {/* Right: decisions */}
          <Card variant="light" className="p-5 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Decisions</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="success" className="py-3" showArrow={false} disabled={phase !== 'team_buzzed'}
                onClick={() => action('mark_correct')}><IconLabel icon="check">Correct</IconLabel></Button>
              <Button variant="danger" className="py-3" showArrow={false} disabled={phase !== 'team_buzzed'}
                onClick={() => action('mark_incorrect')}><IconLabel icon="cancel">Incorrect</IconLabel></Button>
            </div>
            <Button variant="outline" showArrow={false} className="w-full" disabled={phase !== 'team_buzzed'}
              onClick={() => action('other_team_chance')}><IconLabel icon="exchange">Give Other Team a Chance</IconLabel></Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" showArrow={false} disabled={!q || state.round?.answerRevealed}
                onClick={() => action('reveal_answer')}><IconLabel icon="eye">Reveal Answer</IconLabel></Button>
              <Button variant="outline" showArrow={false} disabled={phase === 'round_result'}
                onClick={() => action('skip_question')}><IconLabel icon="skip">Skip</IconLabel></Button>
              <Button variant="outline" showArrow={false} onClick={() => action('restart_question')}><IconLabel icon="refresh">Restart Question</IconLabel></Button>
              <Button showArrow={false} className="font-bold" onClick={() => action('next_question')}>
                <IconLabel icon={state.currentQuestionIndex + 1 >= state.totalQuestions ? 'award' : 'arrow-right'}>
                  {state.currentQuestionIndex + 1 >= state.totalQuestions ? 'Finish Game' : 'Next Question'}
                </IconLabel>
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
                    <TeamIcon icon={team.icon} size={28} color={team.color} />
                    <div>
                      <p className="font-display" style={{ color: team.color }}>{team.name}</p>
                      <p className="text-xs text-text-secondary">{team.members.filter((m) => m.connected).length}/{team.members.length} online</p>
                    </div>
                  </div>
                  <p className="font-display text-5xl tabular-nums" style={{ color: team.color }}>{team.score}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" showArrow={false} className="flex-1 !py-1.5" onClick={() => action('adjust_score', { teamId, change: 1, reason: 'Manual +1' })}>+1</Button>
                  <Button variant="outline" showArrow={false} className="flex-1 !py-1.5" onClick={() => action('adjust_score', { teamId, change: -1, reason: 'Manual −1' })}>−1</Button>
                </div>
              </Card>
            );
          })}
          <Card variant="light" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Event history</p>
              <Button variant="ghost" className="!px-2 !py-1 text-sm" disabled={!state.scoreHistory.length} showArrow={false}
                onClick={() => action('undo_score')}><IconLabel icon="undo">Undo last score</IconLabel></Button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 text-sm">
              {[...state.eventLog].reverse().map((event) => (
                <p key={event.id} className="text-text-body-dark">
                  <span className="text-text-secondary tabular-nums mr-2">
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
    <div className="min-h-full bg-secondary text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <Confetti colors={colors} />
      <p className="text-white/70 font-bold uppercase tracking-widest mb-3">Final Result</p>
      {winner ? (
        <>
          <div className="mb-3 animate-pop">
            <TeamIcon icon={winner.icon} size={72} color={winner.color} />
          </div>
          <h1 className="font-display text-5xl mb-2 animate-pop" style={{ color: winner.color }}>{winner.name} wins!</h1>
        </>
      ) : (
        <h1 className="font-display mb-2 inline-flex animate-pop items-center gap-3 text-5xl text-warning">
          <Icon name="handshake" size={40} /> It&apos;s a tie!
        </h1>
      )}
      <div className="flex items-center gap-8 my-8">
        {(['A', 'B'] as TeamId[]).map((teamId) => {
          const team = state.teams[teamId];
          return (
            <div key={teamId} className="text-center rounded-2xl px-10 py-6" style={{ background: `${team.color}22`, border: `2px solid ${team.color}` }}>
              <div className="mb-2 flex justify-center">
                <TeamIcon icon={team.icon} size={40} color={team.color} />
              </div>
              <p className="font-bold text-lg" style={{ color: team.color }}>{team.name}</p>
              <p className="font-display text-6xl tabular-nums">{team.score}</p>
              {report && (
                <p className="mt-1 inline-flex items-center gap-3 text-sm text-white/70">
                  <span className="inline-flex items-center gap-1"><Icon name="check" size={14} /> {report.teams[teamId].correct} correct</span>
                  <span className="inline-flex items-center gap-1"><Icon name="cancel" size={14} /> {report.teams[teamId].incorrect} incorrect</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4">
        <Button showArrow={false} onClick={() => router.push(`/reports/${state.id}`)}>
          <IconLabel icon="chart">View Full Report</IconLabel>
        </Button>
        <Button variant="outline" showArrow={false} onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
      </div>
    </div>
  );
}
