'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useCountdown, Confetti } from '@/components/ui';
import { Icon, IconLabel, TeamIcon, TeamIconLabel } from '@/components/icons';
import { useRoomPoll } from '@/lib/use-room';
import { sounds } from '@/components/sound';
import type { GameState, TeamId } from '@/lib/types';

export default function ProjectorPage() {
  const params = useParams<{ code: string }>();
  const roomCode = (params.code || '').toUpperCase();
  const { state, error } = useRoomPoll(roomCode, 'public');
  const prevPhase = useRef<string | null>(null);

  // Sound cues on phase transitions
  useEffect(() => {
    if (!state) return;
    const prev = prevPhase.current;
    prevPhase.current = state.phase;
    if (!state.settings.soundEnabled || prev === null || prev === state.phase) return;
    if (state.phase === 'buzzer_active') sounds.buzzerOpen();
    if (state.phase === 'team_buzzed') sounds.buzzed();
    if (state.phase === 'round_result') {
      state.round?.result === 'correct' ? sounds.correct() : sounds.incorrect();
    }
    if (state.phase === 'ended') sounds.gameEnd();
  }, [state]);

  if (error && !state) {
    return <div className="min-h-full bg-secondary text-white flex items-center justify-center text-3xl font-bold">{error}</div>;
  }
  if (!state) {
    return <div className="min-h-full bg-secondary text-white flex items-center justify-center text-3xl font-bold animate-pulse">Connecting…</div>;
  }

  return (
    <div className="min-h-full bg-secondary text-white flex flex-col overflow-hidden">
      {state.phase === 'lobby' && <ProjectorLobby state={state} />}
      {state.phase === 'ended' && <ProjectorFinal state={state} />}
      {state.phase !== 'lobby' && state.phase !== 'ended' && <ProjectorGame state={state} />}
    </div>
  );
}

function ScoreBar({ state, highlight }: { state: GameState; highlight?: TeamId | null }) {
  return (
    <div className="flex items-stretch justify-between gap-6 px-10 py-5">
      {(['A', 'B'] as TeamId[]).map((teamId, i) => {
        const team = state.teams[teamId];
        const dimmed = highlight && highlight !== teamId;
        return (
          <div
            key={teamId}
            className={`flex items-center gap-4 rounded-2xl px-8 py-4 transition-all ${i === 1 ? 'flex-row-reverse text-right' : ''} ${
              dimmed ? 'opacity-30' : ''
            } ${highlight === teamId ? 'scale-105 ring-4 ring-white/60' : ''}`}
            style={{ background: team.color }}
          >
            <TeamIcon icon={team.icon} size={48} color="#fff" />
            <div>
              <p className="font-display text-2xl leading-tight">{team.name}</p>
              <p className="font-display text-6xl tabular-nums leading-none">{team.score}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectorLobby({ state }: { state: GameState }) {
  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${state.roomCode}`;
  const total = state.teams.A.members.length + state.teams.B.members.length + state.unassigned.length;
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <h1 className="font-display text-5xl mb-2">{state.title}</h1>
      <p className="text-2xl text-white/70 mb-8">Join the game now!</p>
      <div className="flex items-center gap-14">
        <div className="bg-white rounded-3xl p-6">
          <QRCodeSVG value={joinUrl} size={220} />
        </div>
        <div>
          <p className="text-2xl text-white/70 font-bold mb-2">Room code</p>
          <p className="font-display text-8xl tracking-[0.25em] text-warning">{state.roomCode}</p>
          <p className="text-xl text-white/55 mt-3">{typeof window !== 'undefined' ? window.location.host : ''}/join</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-10 mt-12 w-full max-w-4xl">
        {(['A', 'B'] as TeamId[]).map((teamId) => {
          const team = state.teams[teamId];
          return (
            <div key={teamId} className="rounded-2xl p-6" style={{ background: `${team.color}33`, border: `3px solid ${team.color}` }}>
              <TeamIconLabel icon={team.icon} size={28} color={team.color} className="font-display mb-3 text-3xl justify-center">
                {team.name}
              </TeamIconLabel>
              <div className="flex flex-wrap gap-2 justify-center min-h-10">
                {team.members.map((m) => (
                  <span key={m.id} className={`rounded-full px-4 py-1.5 text-lg font-bold bg-white/15 ${!m.connected ? 'opacity-40' : ''}`}>
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-2xl text-white/70 mt-10 animate-pulse">
        {total} student{total !== 1 ? 's' : ''} connected — starting soon…
      </p>
    </div>
  );
}

function ProjectorGame({ state }: { state: GameState }) {
  const readingLeft = useCountdown(state.readingEndsAt, state.serverNow);
  const discussionLeft = useCountdown(state.discussionEndsAt, state.serverNow);
  const buzz = state.round?.buzz || null;
  const buzzTeam = buzz ? state.teams[buzz.teamId] : null;
  const q = state.question;
  const phase = state.phase;

  return (
    <>
      <div className="flex items-center justify-between px-10 pt-6">
        <p className="text-xl font-bold text-white/55">{state.title}</p>
        <p className="text-xl font-bold text-white/55">
          Question {state.currentQuestionIndex + 1} of {state.totalQuestions}
        </p>
      </div>

      <ScoreBar state={state} highlight={phase === 'team_buzzed' ? buzz?.teamId : null} />

      <div className="flex-1 flex flex-col items-center justify-center px-14 pb-10 text-center">
        {phase === 'paused' ? (
          <>
            <Icon name="pause" size={80} className="mb-6 text-white/70" />
            <h2 className="font-display text-6xl mb-4">Game Paused</h2>
            <p className="text-2xl text-white/70 animate-pulse">Waiting for the teacher…</p>
          </>
        ) : (
          <>
            <h2 className="font-body mb-8 max-w-6xl text-5xl leading-tight normal-case tracking-normal md:text-6xl">{q?.text}</h2>
            {q && q.options.length > 0 && (
              <div className="grid grid-cols-2 gap-4 w-full max-w-4xl mb-8">
                {q.options.map((opt, i) => {
                  const revealed = state.round?.answerRevealed && q.correctAnswer === opt;
                  return (
                    <div key={i} className={`rounded-2xl px-6 py-4 text-3xl font-bold text-left ${
                      revealed ? 'bg-correct text-white' : 'bg-white/10'
                    }`}>
                      <span className="text-warning mr-3">{String.fromCharCode(65 + i)}</span>{opt}
                    </div>
                  );
                })}
              </div>
            )}

            {phase === 'question_reading' && readingLeft !== null && (
              <div className="text-center">
                <p className="text-3xl text-white/70 font-bold mb-2">Read the question…</p>
                <p className="font-display text-8xl text-warning tabular-nums">{Math.ceil(readingLeft / 1000)}</p>
              </div>
            )}
            {phase === 'question_idle' && (
              <p className="inline-flex items-center justify-center gap-3 text-3xl font-bold text-waiting">
                <Icon name="lock" size={32} /> Buzzer closed — get ready
              </p>
            )}
            {phase === 'buzzer_active' && (
              <div className="font-display inline-flex animate-pulse items-center justify-center gap-4 rounded-3xl bg-warning px-16 py-6 text-6xl text-secondary">
                <Icon name="notification" size={48} color="currentColor" />
                BUZZ NOW!
              </div>
            )}
            {phase === 'team_buzzed' && buzzTeam && (
              <div className="text-center animate-pop">
                <div className="font-display mb-4 inline-flex items-center justify-center gap-4 rounded-3xl px-16 py-6 text-5xl" style={{ background: buzzTeam.color }}>
                  <TeamIcon icon={buzzTeam.icon} size={40} color="#fff" />
                  {buzzTeam.name} Buzzed First!
                </div>
                <p className="text-3xl text-white/70 font-bold">
                  Team discussion…{discussionLeft !== null && (
                    <span className="text-warning tabular-nums ml-3">{Math.ceil(discussionLeft / 1000)}s</span>
                  )}
                </p>
              </div>
            )}
            {phase === 'round_result' && (
              <div className="text-center animate-pop">
                {state.round?.result === 'correct' && buzzTeam ? (
                  <div className="font-display mb-4 inline-flex items-center justify-center gap-4 rounded-3xl bg-correct px-16 py-6 text-5xl">
                    <Icon name="check" size={40} />
                    Correct! +{q?.points} for {state.teams[state.round.resultTeamId!]?.name}
                  </div>
                ) : state.round?.result === 'skipped' ? (
                  <div className="font-display mb-4 inline-flex items-center justify-center gap-4 rounded-3xl bg-waiting px-16 py-6 text-5xl">
                    <Icon name="skip" size={40} /> Question skipped
                  </div>
                ) : (
                  <div className="font-display mb-4 inline-flex animate-shake items-center justify-center gap-4 rounded-3xl bg-incorrect px-16 py-6 text-5xl">
                    <Icon name="cancel" size={40} /> No correct answer
                  </div>
                )}
                {state.round?.answerRevealed && q?.correctAnswer && (
                  <p className="text-4xl font-bold mt-4">
                    Answer: <span className="text-correct">{q.correctAnswer}</span>
                  </p>
                )}
                {state.round?.answerRevealed && q?.explanation && (
                  <p className="text-2xl text-white/70 mt-3 max-w-4xl">{q.explanation}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ProjectorFinal({ state }: { state: GameState }) {
  const report = state.finalReport;
  const winner = report?.winner ? state.teams[report.winner] : null;
  const colors = useMemo(() => (winner ? [winner.color, '#FFD700', '#ffffff'] : ['#2563EB', '#F97316', '#FFD700']), [winner]);
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 relative">
      <Confetti colors={colors} />
      <p className="text-3xl text-white/70 font-bold uppercase tracking-widest mb-4">Final Result</p>
      {winner ? (
        <>
          <div className="mb-4 animate-pop">
            <TeamIcon icon={winner.icon} size={96} color={winner.color} />
          </div>
          <h1 className="font-display text-8xl animate-pop" style={{ color: winner.color }}>{winner.name} Wins!</h1>
        </>
      ) : (
        <h1 className="font-display inline-flex animate-pop items-center gap-4 text-8xl text-warning">
          <Icon name="handshake" size={72} /> It&apos;s a Tie!
        </h1>
      )}
      <div className="flex items-center gap-16 mt-12">
        {(['A', 'B'] as TeamId[]).map((teamId) => {
          const team = state.teams[teamId];
          return (
            <div key={teamId} className="text-center rounded-3xl px-14 py-8"
              style={{ background: `${team.color}33`, border: `4px solid ${team.color}` }}>
              <div className="mb-2 flex justify-center">
                <TeamIcon icon={team.icon} size={56} color={team.color} />
              </div>
              <p className="font-display text-3xl" style={{ color: team.color }}>{team.name}</p>
              <p className="font-display text-8xl tabular-nums">{team.score}</p>
              {report && (
                <p className="mt-2 inline-flex items-center gap-4 text-xl text-white/70">
                  <span className="inline-flex items-center gap-1"><Icon name="check" size={18} /> {report.teams[teamId].correct}</span>
                  <span className="inline-flex items-center gap-1"><Icon name="cancel" size={18} /> {report.teams[teamId].incorrect}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
