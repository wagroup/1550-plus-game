import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ConnectionDot, useCountdown, Confetti } from '../components/ui';
import { getSocket, getStudentSession, clearStudentSession } from '../socket';
import { sounds, vibrate } from '../components/sound';
import type { GameState, TeamId } from '../types';

export default function Play() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const roomCode = (code || '').toUpperCase();
  const session = getStudentSession(roomCode);

  const [state, setState] = useState<GameState | null>(null);
  const [myTeamId, setMyTeamId] = useState<TeamId | null>(null);
  const [connected, setConnected] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [tooEarly, setTooEarly] = useState(false);
  const prevPhase = useRef<string | null>(null);
  const lastPress = useRef(0);

  useEffect(() => {
    if (!session) {
      navigate(`/join/${roomCode}`);
      return;
    }
    const socket = getSocket();
    const join = () => {
      socket.emit('student:join', { roomCode, sessionToken: session.sessionToken }, (res: any) => {
        if (res?.error) {
          clearStudentSession(roomCode);
          setFatal(res.error);
          return;
        }
        setConnected(true);
        setMyTeamId(res.participant.teamId);
        setState(res.state);
      });
    };
    join();
    socket.on('connect', join);
    socket.on('state', setState);
    socket.on('disconnect', () => setConnected(false));
    socket.on('kicked', () => {
      clearStudentSession(roomCode);
      setFatal('You were removed from the game by the teacher.');
    });
    return () => {
      socket.off('connect', join);
      socket.off('state', setState);
      socket.off('kicked');
    };
  }, [roomCode]);

  // Track my team assignment from live state (teacher may move me).
  useEffect(() => {
    if (!state || !session) return;
    for (const teamId of ['A', 'B'] as TeamId[]) {
      if (state.teams[teamId].members.some((m) => m.id === session.participantId)) {
        setMyTeamId(teamId);
        return;
      }
    }
    setMyTeamId(null);
  }, [state]);

  // Sound + vibration cues on phase changes.
  useEffect(() => {
    if (!state) return;
    const prev = prevPhase.current;
    prevPhase.current = state.phase;
    if (prev === null || prev === state.phase) return;
    const soundOn = state.settings.soundEnabled;
    if (state.phase === 'buzzer_active') {
      if (soundOn) sounds.buzzerOpen();
      vibrate(80);
    }
    if (state.phase === 'team_buzzed' && state.round?.buzz) {
      const mine = state.round.buzz.teamId === myTeamId;
      if (soundOn) sounds.buzzed();
      vibrate(mine ? [100, 60, 100] : 400);
    }
    if (state.phase === 'round_result' && soundOn) {
      state.round?.result === 'correct' ? sounds.correct() : sounds.incorrect();
    }
    if (state.phase === 'ended' && soundOn) sounds.gameEnd();
  }, [state, myTeamId]);

  const buzz = useCallback(() => {
    // Debounce accidental double taps.
    const now = Date.now();
    if (now - lastPress.current < 400) return;
    lastPress.current = now;
    getSocket().emit('student:buzz', (res: any) => {
      if (!res?.accepted && res?.reason === 'too_early') {
        setTooEarly(true);
        setTimeout(() => setTooEarly(false), 1200);
      }
    });
  }, []);

  // Keyboard shortcut (space / enter) for accessibility.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && state?.phase === 'buzzer_active') {
        e.preventDefault();
        buzz();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state?.phase, buzz]);

  if (fatal) {
    return (
      <div className="min-h-full bg-navy text-white flex flex-col items-center justify-center gap-5 p-6 text-center">
        <p className="text-xl font-bold">{fatal}</p>
        <Button onClick={() => navigate('/join')}>Join another game</Button>
      </div>
    );
  }
  if (!state || !session) {
    return <div className="min-h-full bg-navy text-white flex items-center justify-center text-xl font-bold animate-pulse">Connecting…</div>;
  }

  const myTeam = myTeamId ? state.teams[myTeamId] : null;
  const otherTeam = myTeamId ? state.teams[myTeamId === 'A' ? 'B' : 'A'] : null;

  return (
    <div className="min-h-full flex flex-col" style={{ background: myTeam ? `linear-gradient(180deg, ${myTeam.color}18, #0F172A 45%)` : '#0F172A' }}>
      {/* Header: identity + scores, always visible */}
      <header className="text-white px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold truncate">{session.name}</p>
          <ConnectionDot connected={connected} label={connected ? undefined : 'Reconnecting…'} />
        </div>
        <div className="flex items-center gap-3">
          {myTeam ? (
            <div className="flex-1 rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: myTeam.color }}>
              <span className="font-extrabold truncate">{myTeam.icon} {myTeam.name}</span>
              <span className="text-3xl font-black tabular-nums">{myTeam.score}</span>
            </div>
          ) : (
            <div className="flex-1 rounded-xl px-4 py-2.5 bg-white/10 font-bold text-slate-300">No team yet</div>
          )}
          {otherTeam && (
            <div className="rounded-xl px-4 py-2.5 bg-white/10 flex items-center gap-2 opacity-80">
              <span className="font-bold">{otherTeam.icon}</span>
              <span className="text-2xl font-black tabular-nums">{otherTeam.score}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col text-white px-4 pb-6 pt-4">
        {state.phase === 'lobby' && <StudentLobby state={state} myTeam={myTeam} />}
        {state.phase === 'ended' && <StudentFinal state={state} myTeamId={myTeamId} />}
        {state.phase === 'paused' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-6xl">⏸</p>
            <h2 className="text-3xl font-black">Game Paused</h2>
            <p className="text-slate-300 animate-pulse">Waiting for your teacher…</p>
          </div>
        )}
        {!state.teacherConnected && state.phase !== 'ended' && (
          <p className="text-center text-warning font-bold text-sm mb-2">Host reconnecting…</p>
        )}
        {['question_idle', 'question_reading', 'buzzer_active', 'team_buzzed', 'round_result'].includes(state.phase) && (
          <StudentGame state={state} myTeamId={myTeamId} buzz={buzz} tooEarly={tooEarly} />
        )}
      </main>
    </div>
  );
}

function StudentLobby({ state, myTeam }: { state: GameState; myTeam: GameState['teams']['A'] | null }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <p className="text-5xl animate-pop">🎉</p>
      <h2 className="text-2xl font-black">You're in!</h2>
      {myTeam ? (
        <>
          <div className="rounded-2xl px-8 py-5 animate-pop" style={{ background: myTeam.color }}>
            <p className="text-4xl mb-1">{myTeam.icon}</p>
            <p className="text-2xl font-extrabold">{myTeam.name}</p>
          </div>
          <div className="max-w-xs">
            <p className="text-sm text-slate-400 mb-2">Your teammates</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {myTeam.members.map((m) => (
                <span key={m.id} className={`rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ${!m.connected ? 'opacity-40' : ''}`}>
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="rounded-xl bg-white/10 px-5 py-3 font-semibold text-slate-200">
          Your teacher will assign you to a team.
        </p>
      )}
      <p className="text-slate-300 animate-pulse mt-2">Waiting for the teacher to start the game…</p>
    </div>
  );
}

function StudentGame({ state, myTeamId, buzz, tooEarly }: {
  state: GameState;
  myTeamId: TeamId | null;
  buzz: () => void;
  tooEarly: boolean;
}) {
  const readingLeft = useCountdown(state.readingEndsAt, state.serverNow);
  const discussionLeft = useCountdown(state.discussionEndsAt, state.serverNow);
  const phase = state.phase;
  const round = state.round;
  const buzzInfo = round?.buzz || null;
  const myTeam = myTeamId ? state.teams[myTeamId] : null;
  const myTeamLocked = !!(myTeamId && round?.lockedTeams.includes(myTeamId));
  const isMyTeamBuzz = buzzInfo?.teamId === myTeamId;

  // Buzzer button config by phase
  let label = 'Wait for the Question';
  let enabled = false;
  let bg = '#64748B';
  let sub: string | null = null;

  if (phase === 'question_reading') {
    label = 'Read the Question';
    sub = readingLeft !== null ? `Buzzer opens in ${Math.ceil(readingLeft / 1000)}…` : null;
  } else if (phase === 'question_idle') {
    label = 'Get Ready';
    sub = 'The teacher will open the buzzer';
    bg = '#F59E0B';
  } else if (phase === 'buzzer_active') {
    if (myTeamLocked) {
      label = 'Buzzer Locked';
      sub = 'The other team gets this chance';
    } else {
      label = 'BUZZ FOR YOUR TEAM';
      enabled = true;
      bg = myTeam?.color || '#2563EB';
      sub = round?.lockedTeams.length ? 'Second chance!' : null;
    }
  } else if (phase === 'team_buzzed') {
    bg = buzzInfo ? state.teams[buzzInfo.teamId].color : bg;
    label = 'Buzzer Locked';
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="text-center mb-3 min-h-14">
        {state.question ? (
          <p className="font-semibold text-slate-200 text-lg leading-snug line-clamp-3">
            <span className="text-slate-400 text-sm font-bold mr-2">Q{state.currentQuestionIndex + 1}</span>
            {state.question.text}
          </p>
        ) : (
          <p className="text-slate-400 font-semibold">Look at the main screen</p>
        )}
      </div>

      {phase === 'team_buzzed' && buzzInfo ? (
        <TeamBuzzedView state={state} myTeamId={myTeamId} discussionLeft={discussionLeft} />
      ) : phase === 'round_result' ? (
        <RoundResultView state={state} myTeamId={myTeamId} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {tooEarly && (
            <p className="rounded-full bg-incorrect px-5 py-2 font-black animate-shake">⚠️ Too Early!</p>
          )}
          {/* The big team buzzer — at least 40% of screen height */}
          <button
            onClick={buzz}
            disabled={!enabled}
            aria-label={label}
            className={`buzzer-btn w-full max-w-md rounded-full font-black text-white text-3xl px-6 disabled:opacity-70 cursor-pointer ${
              enabled ? 'animate-buzz-ready' : ''
            }`}
            style={{
              background: bg,
              height: 'min(58vh, 100vw - 3rem)',
              maxHeight: '460px',
              minHeight: '260px',
              boxShadow: enabled ? `0 12px 0 rgba(0,0,0,0.35)` : 'none',
            }}
          >
            {label}
          </button>
          {sub && <p className="text-slate-300 font-semibold">{sub}</p>}
          {isMyTeamBuzz === true && null}
        </div>
      )}
    </div>
  );
}

function TeamBuzzedView({ state, myTeamId, discussionLeft }: {
  state: GameState;
  myTeamId: TeamId | null;
  discussionLeft: number | null;
}) {
  const buzzInfo = state.round!.buzz!;
  const buzzTeam = state.teams[buzzInfo.teamId];
  const mine = buzzInfo.teamId === myTeamId;
  const iBuzzed = false; // teammate distinction handled below via participant name

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <div className="rounded-3xl px-8 py-6 animate-pop w-full max-w-md" style={{ background: buzzTeam.color }}>
        <p className="text-5xl mb-2">{buzzTeam.icon}</p>
        <p className="text-2xl font-black">
          {mine
            ? buzzInfo.secondChance ? 'Your Team Gets the Chance!' : 'Your Team Buzzed First!'
            : buzzInfo.secondChance ? 'The Other Team Gets the Chance' : 'The Other Team Buzzed First'}
        </p>
        {buzzInfo.participantName && (
          <p className="font-semibold opacity-90 mt-1">
            {mine ? `${buzzInfo.participantName} pressed the buzzer` : `${buzzTeam.name} is answering`}
          </p>
        )}
      </div>
      {mine ? (
        <>
          <p className="text-xl font-bold">🗣 Discuss with your team!</p>
          <p className="text-slate-300">Agree on one final answer and tell your teacher.</p>
        </>
      ) : (
        <p className="text-slate-300 font-semibold">Other team is answering — wait for the teacher…</p>
      )}
      {discussionLeft !== null && (
        <p className="text-6xl font-black tabular-nums" style={{ color: buzzTeam.color }}>
          {Math.ceil(discussionLeft / 1000)}
        </p>
      )}
    </div>
  );
}

function RoundResultView({ state, myTeamId }: { state: GameState; myTeamId: TeamId | null }) {
  const round = state.round!;
  const q = state.question;
  const resultTeam = round.resultTeamId ? state.teams[round.resultTeamId] : null;
  const correct = round.result === 'correct';
  const mine = round.resultTeamId === myTeamId;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      {correct && resultTeam ? (
        <div className="rounded-3xl px-8 py-6 bg-correct animate-pop w-full max-w-md">
          <p className="text-5xl mb-2">✅</p>
          <p className="text-2xl font-black">{mine ? 'Your team got it!' : `${resultTeam.name} got it!`}</p>
          <p className="font-semibold opacity-90">+{q?.points} point{(q?.points ?? 1) !== 1 ? 's' : ''} for {resultTeam.name}</p>
        </div>
      ) : round.result === 'skipped' ? (
        <div className="rounded-3xl px-8 py-6 bg-waiting animate-pop w-full max-w-md">
          <p className="text-5xl mb-2">⏭</p>
          <p className="text-2xl font-black">Question skipped</p>
        </div>
      ) : (
        <div className="rounded-3xl px-8 py-6 bg-incorrect animate-pop w-full max-w-md">
          <p className="text-5xl mb-2">❌</p>
          <p className="text-2xl font-black">No correct answer</p>
        </div>
      )}
      {round.answerRevealed && q?.correctAnswer && (
        <p className="text-lg font-bold">
          Answer: <span className="text-green-400">{q.correctAnswer}</span>
        </p>
      )}
      <p className="text-slate-300 animate-pulse">Next question coming up…</p>
    </div>
  );
}

function StudentFinal({ state, myTeamId }: { state: GameState; myTeamId: TeamId | null }) {
  const report = state.finalReport;
  const winnerId = report?.winner ?? null;
  const winner = winnerId ? state.teams[winnerId] : null;
  const iWon = winnerId !== null && winnerId === myTeamId;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 relative">
      {iWon && winner && <Confetti colors={[winner.color, '#FFD700', '#ffffff']} />}
      <p className="text-slate-300 font-bold uppercase tracking-widest">Final Result</p>
      {winner ? (
        <>
          <p className="text-7xl animate-pop">{iWon ? '🏆' : winner.icon}</p>
          <h2 className="text-4xl font-black animate-pop" style={{ color: winner.color }}>
            {winner.name} Wins!
          </h2>
          <p className="text-xl font-bold">{iWon ? 'Congratulations, your team won! 🎉' : 'Good game — better luck next time!'}</p>
        </>
      ) : (
        <>
          <p className="text-7xl animate-pop">🤝</p>
          <h2 className="text-4xl font-black text-warning">It's a Tie!</h2>
        </>
      )}
      <div className="flex items-center gap-4 mt-2">
        {(['A', 'B'] as TeamId[]).map((teamId) => {
          const team = state.teams[teamId];
          return (
            <div key={teamId} className="rounded-2xl px-8 py-4" style={{ background: `${team.color}33`, border: `2px solid ${team.color}` }}>
              <p className="text-2xl">{team.icon}</p>
              <p className="font-bold" style={{ color: team.color }}>{team.name}</p>
              <p className="text-4xl font-black tabular-nums">{team.score}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
