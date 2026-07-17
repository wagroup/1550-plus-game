// End-to-end smoke test for the ClassBuzz server.
// Run with: node smoke-test.mjs   (server must be running on :3001)
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const BASE = 'http://localhost:3001';
let failures = 0;

function assert(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const emitAck = (socket, event, payload) =>
  new Promise((resolve) => (payload === undefined ? socket.emit(event, resolve) : socket.emit(event, payload, resolve)));

const email = `t${Date.now()}@school.edu`;

// 1. Register teacher
const reg = await api('/api/auth/register', { method: 'POST', body: { name: 'Ms. Test', email, password: 'secret123' } });
assert(reg.status === 200 && reg.data.token, 'teacher registration');
const token = reg.data.token;

// 2. Create question set
const qs = await api('/api/question-sets', {
  method: 'POST', token,
  body: {
    title: 'Space Quiz', subject: 'Science',
    questions: [
      { text: 'Closest star to Earth?', type: 'open', correctAnswer: 'The Sun', explanation: 'About 150M km away.' },
      { text: 'Mars is the 4th planet.', type: 'true_false', correctAnswer: 'True' },
      { text: 'Largest planet?', type: 'multiple_choice', options: ['Earth', 'Jupiter', 'Saturn'], correctAnswer: 'Jupiter' },
    ],
  },
});
assert(qs.status === 200 && qs.data.questions.length === 3, 'question set creation');

// 3. Create game
const game = await api('/api/games', {
  method: 'POST', token,
  body: {
    title: 'Test Game', questionSetId: qs.data.id,
    teams: { A: { name: 'Newton', color: '#2563EB', icon: '🧠' }, B: { name: 'Einstein', color: '#F97316', icon: '⚡' } },
    settings: { readingSeconds: 0, discussionSeconds: 10, autoOpenBuzzer: false, pointsCorrect: 1, penaltyWrong: 0, secondChance: 'other_team' },
  },
});
const roomCode = game.data.game?.roomCode;
assert(game.status === 200 && roomCode?.length === 6, `game creation (room ${roomCode})`);

// 4. Room validation
const roomCheck = await api(`/api/rooms/${roomCode}`);
assert(roomCheck.status === 200 && roomCheck.data.teams.A.name === 'Newton', 'student room validation');
const badRoom = await api('/api/rooms/XXXXXX');
assert(badRoom.status === 404, 'invalid room code rejected');

// 5. Sockets: teacher + 3 students
const teacherSock = io(BASE);
const s1 = io(BASE);
const s2 = io(BASE);
const s3 = io(BASE);

const tJoin = await emitAck(teacherSock, 'teacher:join', { token, roomCode });
assert(tJoin.ok, 'teacher socket join');

const j1 = await emitAck(s1, 'student:join', { roomCode, name: 'Alice', teamId: 'A' });
const j2 = await emitAck(s2, 'student:join', { roomCode, name: 'Bob', teamId: 'B' });
const j3 = await emitAck(s3, 'student:join', { roomCode, name: 'Cara', teamId: 'A' });
assert(j1.ok && j2.ok && j3.ok, 'three students joined');

const dupName = await emitAck(io(BASE), 'student:join', { roomCode, name: 'alice', teamId: 'B' });
assert(!!dupName.error, 'duplicate name rejected');

// 6. Buzz before start -> rejected
const early = await emitAck(s1, 'student:buzz');
assert(early.accepted === false, 'buzz before game start rejected');

// 7. Start game
const start = await emitAck(teacherSock, 'teacher:action', { type: 'start_game' });
assert(start.ok, 'game started');

// Latest public state helper
let lastState = null;
s1.on('state', (st) => (lastState = st));

// 8. Buzz while buzzer closed -> too early
const closed = await emitAck(s1, 'student:buzz');
assert(closed.accepted === false && closed.reason === 'too_early', 'buzz while closed rejected (too early)');

// 9. Open buzzer, race two students — only first accepted
await emitAck(teacherSock, 'teacher:action', { type: 'open_buzzer' });
const [r1, r2] = await Promise.all([emitAck(s1, 'student:buzz'), emitAck(s2, 'student:buzz')]);
const acceptedCount = [r1, r2].filter((r) => r.accepted).length;
assert(acceptedCount === 1, 'exactly one buzz accepted in a race');
const winnerTeam = r1.accepted ? 'A' : 'B';

// 10. Repeated press ignored
const again = await emitAck(s3, 'student:buzz');
assert(again.accepted === false, 'press after lock rejected');

// 11. Mark correct -> +1 to winning team
await emitAck(teacherSock, 'teacher:action', { type: 'mark_correct' });
await new Promise((r) => setTimeout(r, 200));
assert(lastState?.teams[winnerTeam].score === 1, `correct answer scored (+1 for team ${winnerTeam})`);
assert(lastState?.question?.correctAnswer === 'The Sun', 'answer revealed to students after marking');

// 12. Next question, incorrect answer -> second chance for other team
await emitAck(teacherSock, 'teacher:action', { type: 'next_question' });
await emitAck(teacherSock, 'teacher:action', { type: 'open_buzzer' });
const b2 = await emitAck(s1, 'student:buzz'); // Alice (team A) buzzes
assert(b2.accepted, 'second question buzz accepted');
await emitAck(teacherSock, 'teacher:action', { type: 'mark_incorrect' });
await new Promise((r) => setTimeout(r, 200));
assert(lastState?.round?.buzz?.teamId === 'B' && lastState?.phase === 'team_buzzed', 'second chance passed to other team');
await emitAck(teacherSock, 'teacher:action', { type: 'mark_correct' });
await new Promise((r) => setTimeout(r, 200));
assert(lastState?.teams.B.score >= 1, 'other team scored on second chance');

// 13. Manual score + undo
await emitAck(teacherSock, 'teacher:action', { type: 'adjust_score', payload: { teamId: 'A', change: 5, reason: 'test' } });
await emitAck(teacherSock, 'teacher:action', { type: 'undo_score' });
await new Promise((r) => setTimeout(r, 200));
assert(lastState?.teams.A.score === (winnerTeam === 'A' ? 1 : 0), 'manual score + undo works');

// 14. Reconnection with session token
s1.disconnect();
const s1b = io(BASE);
const rejoin = await emitAck(s1b, 'student:join', { roomCode, sessionToken: j1.participant.sessionToken });
assert(rejoin.ok && rejoin.participant.teamId === 'A' && rejoin.participant.name === 'Alice', 'student reconnection restores identity');

// 15. Skip last question and end game
await emitAck(teacherSock, 'teacher:action', { type: 'next_question' });
await emitAck(teacherSock, 'teacher:action', { type: 'skip_question' });
await emitAck(teacherSock, 'teacher:action', { type: 'end_game' });
await new Promise((r) => setTimeout(r, 300));

// 16. Report exists and is team-based
const reports = await api('/api/reports', { token });
const report = reports.data.find((r) => r.roomCode === roomCode);
assert(!!report, 'report persisted after game end');
assert(report && report.teams.A && report.teams.B && report.questionResults.length === 3, 'report contains team stats + 3 question results');
console.log(`\nFinal: ${report.teams.A.name} ${report.teams.A.score} — ${report.teams.B.score} ${report.teams.B.name} (winner: ${report.winner ?? 'tie'})`);

[teacherSock, s2, s3, s1b].forEach((s) => s.disconnect());
console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
