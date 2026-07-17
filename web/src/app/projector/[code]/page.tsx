'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useCountdown, Confetti } from '@/components/ui';
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
    return <div className="min-h-full bg-navy text-white flex items-center justify-center text-3xl font-bold">{error}</div>;
  }
  if (!state) {
    return <div className="min-h-full bg-navy text-white flex items-center justify-center text-3xl font-bold animate-pulse">Connecting…</div>;
  }

  return (
    <div className="min-h-full bg-navy text-white flex flex-col overflow-hidden">
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
            <span className="text-5xl">{team.icon}</span>
            <div>
              <p className="text-2xl font-extrabold leading-tight">{team.name}</p>
              <p className="text-6xl font-black tabular-nums leading-none">{team.score}</p>
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
      <h1 className="text-5xl font-black mb-2">{state.title}</h1>
      <p className="text-2xl text-slate-300 mb-8">Join the game now!</p>
      <div className="flex items-center gap-14">
        <div className="bg-white rounded-3xl p-6">
          <QRCodeSVG value={joinUrl} size={220} />
        </div>
        <div>
          <p className="text-2xl text-slate-300 font-bold mb-2">Room code</p>
          <p className="text-8xl font-black tracking-[0.25em] text-warning">{state.roomCode}</p>
          <p className="text-xl text-slate-400 mt-3">{typeof window !== 'undefined' ? window.location.host : ''}/join</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-10 mt-12 w-full max-w-4xl">
        {(['A', 'B'] as TeamId[]).map((teamId) => {
          const team = state.teams[teamId];
          return (
            <div key={teamId} className="rounded-2xl p-6" style={{ background: `${team.color}33`, border: `3px solid ${team.color}` }}>
              <p className="text-3xl font-extrabold mb-3">{team.icon} {team.name}</p>
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
      <p className="text-2xl text-slate-300 mt-10 animate-pulse">
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
        <p className="text-xl font-bold text-slate-400">{state.title}</p>
        <p className="text-xl font-bold text-slate-400">
          Question {state.currentQuestionIndex + 1} of {state.totalQuestions}
        </p>
      </div>

      <ScoreBar state={state} highlight={phase === 'team_buzzed' ? buzz?.teamId : null} />

      <div className="flex-1 flex flex-col items-center justify-center px-14 pb-10 text-center">
        {phase === 'paused' ? (
          <>
            <p className="text-7xl mb-6">⏸</p>
            <h2 className="text-6xl font-black mb-4">Game Paused</h2>
            <p className="text-2xl text-slate-300 animate-pulse">Waiting for the teacher…</p>
          </>
        ) : (
          <>
            <h2 className="text-5xl md:text-6xl font-black leading-tight mb-8 max-w-6xl">{q?.text}</h2>
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
                <p className="text-3xl text-slate-300 font-bold mb-2">Read the question…</p>
                <p className="text-8xl font-black text-warning tabular-nums">{Math.ceil(readingLeft / 1000)}</p>
              </div>
            )}
            {phase === 'question_idle' && (
              <p className="text-3xl font-bold text-waiting">🔒 Buzzer closed — get ready</p>
            )}
            {phase === 'buzzer_active' && (
              <div className="rounded-3xl bg-warning text-navy px-16 py-6 text-6xl font-black animate-pulse">
                🔔 BUZZ NOW!
              </div>
            )}
            {phase === 'team_buzzed' && buzzTeam && (
              <div className="text-center animate-pop">
                <div className="rounded-3xl px-16 py-6 text-5xl font-black mb-4" style={{ background: buzzTeam.color }}>
                  {buzzTeam.icon} {buzzTeam.name} Buzzed First!
                </div>
                <p className="text-3xl text-slate-300 font-bold">
                  Team discussion…{discussionLeft !== null && (
                    <span className="text-warning tabular-nums ml-3">{Math.ceil(discussionLeft / 1000)}s</span>
                  )}
                </p>
              </div>
            )}
            {phase === 'round_result' && (
              <div className="text-center animate-pop">
                {state.round?.result === 'correct' && buzzTeam ? (
                  <div className="rounded-3xl bg-correct px-16 py-6 text-5xl font-black mb-4">
                    ✅ Correct! +{q?.points} for {state.teams[state.round.resultTeamId!]?.name}
                  </div>
                ) : state.round?.result === 'skipped' ? (
                  <div className="rounded-3xl bg-waiting px-16 py-6 text-5xl font-black mb-4">⏭ Question skipped</div>
                ) : (
                  <div className="rounded-3xl bg-incorrect px-16 py-6 text-5xl font-black mb-4 animate-shake">❌ No correct answer</div>
                )}
                {state.round?.answerRevealed && q?.correctAnswer && (
                  <p className="text-4xl font-bold mt-4">
                    Answer: <span className="text-correct">{q.correctAnswer}</span>
                  </p>
                )}
                {state.round?.answerRevealed && q?.explanation && (
                  <p className="text-2xl text-slate-300 mt-3 max-w-4xl">{q.explanation}</p>
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
      <p className="text-3xl text-slate-300 font-bold uppercase tracking-widest mb-4">Final Result</p>
      {winner ? (
        <>
          <div className="text-9xl mb-4 animate-pop">{winner.icon}</div>
          <h1 className="text-8xl font-black animate-pop" style={{ color: winner.color }}>{winner.name} Wins!</h1>
        </>
      ) : (
        <h1 className="text-8xl font-black text-warning animate-pop">It&apos;s a Tie! 🤝</h1>
      )}
      <div className="flex items-center gap-16 mt-12">
        {(['A', 'B'] as TeamId[]).map((teamId) => {
          const team = state.teams[teamId];
          return (
            <div key={teamId} className="text-center rounded-3xl px-14 py-8"
              style={{ background: `${team.color}33`, border: `4px solid ${team.color}` }}>
              <div className="text-6xl mb-2">{team.icon}</div>
              <p className="text-3xl font-extrabold" style={{ color: team.color }}>{team.name}</p>
              <p className="text-8xl font-black tabular-nums">{team.score}</p>
              {report && (
                <p className="text-xl text-slate-300 mt-2">
                  ✓ {report.teams[teamId].correct} · ✗ {report.teams[teamId].incorrect}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
