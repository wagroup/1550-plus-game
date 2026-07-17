import express from 'express';
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { db } from './store.js';
import { hashPassword, verifyPassword, createSession, destroySession, getTeacherByToken, requireAuth } from './auth.js';
import { GameRoom, generateRoomCode, PHASES } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

/** Live rooms: roomCode -> GameRoom */
const liveRooms = new Map();

const uid = () => crypto.randomBytes(8).toString('hex');

// ---------------- Auth ----------------

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, email and a password of at least 6 characters are required.' });
  }
  const normalized = email.trim().toLowerCase();
  if (db.teachers.some((t) => t.email === normalized)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const teacher = {
    id: uid(),
    name: name.trim(),
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  db.teachers.push(teacher);
  db.saveTeachers();
  const token = createSession(teacher.id);
  res.json({ token, teacher: { id: teacher.id, name: teacher.name, email: teacher.email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const teacher = db.teachers.find((t) => t.email === (email || '').trim().toLowerCase());
  if (!teacher || !verifyPassword(password || '', teacher.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const token = createSession(teacher.id);
  res.json({ token, teacher: { id: teacher.id, name: teacher.name, email: teacher.email } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ teacher: { id: req.teacher.id, name: req.teacher.name, email: req.teacher.email } });
});

// ---------------- Question sets ----------------

app.get('/api/question-sets', requireAuth, (req, res) => {
  res.json(db.questionSets.filter((qs) => qs.teacherId === req.teacher.id));
});

app.post('/api/question-sets', requireAuth, (req, res) => {
  const { title, subject, description, questions } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'A title is required.' });
  const set = {
    id: uid(),
    teacherId: req.teacher.id,
    title: title.trim(),
    subject: (subject || '').trim(),
    description: (description || '').trim(),
    questions: sanitizeQuestions(questions),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.questionSets.push(set);
  db.saveQuestionSets();
  res.json(set);
});

app.put('/api/question-sets/:id', requireAuth, (req, res) => {
  const set = db.questionSets.find((qs) => qs.id === req.params.id && qs.teacherId === req.teacher.id);
  if (!set) return res.status(404).json({ error: 'Question set not found.' });
  const { title, subject, description, questions } = req.body || {};
  if (title !== undefined) set.title = title.trim() || set.title;
  if (subject !== undefined) set.subject = subject.trim();
  if (description !== undefined) set.description = description.trim();
  if (questions !== undefined) set.questions = sanitizeQuestions(questions);
  set.updatedAt = Date.now();
  db.saveQuestionSets();
  res.json(set);
});

app.delete('/api/question-sets/:id', requireAuth, (req, res) => {
  const index = db.questionSets.findIndex((qs) => qs.id === req.params.id && qs.teacherId === req.teacher.id);
  if (index < 0) return res.status(404).json({ error: 'Question set not found.' });
  db.questionSets.splice(index, 1);
  db.saveQuestionSets();
  res.json({ ok: true });
});

function sanitizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((q) => q && typeof q.text === 'string' && q.text.trim())
    .map((q, i) => ({
      id: q.id || uid(),
      text: q.text.trim().slice(0, 500),
      type: ['open', 'multiple_choice', 'true_false'].includes(q.type) ? q.type : 'open',
      options: Array.isArray(q.options) ? q.options.slice(0, 6).map((o) => String(o).slice(0, 200)) : [],
      correctAnswer: String(q.correctAnswer || '').slice(0, 500),
      explanation: String(q.explanation || '').slice(0, 1000),
      points: Number.isFinite(+q.points) && +q.points > 0 ? Math.round(+q.points) : null,
      image: typeof q.image === 'string' && q.image.startsWith('data:image') ? q.image : null,
      displayOrder: i,
    }));
}

// ---------------- Games ----------------

const DEFAULT_SETTINGS = {
  readingSeconds: 5,
  discussionSeconds: 15,
  autoOpenBuzzer: true,
  pointsCorrect: 1,
  penaltyWrong: 0,
  secondChance: 'other_team', // 'other_team' | 'reopen' | 'end'
  allowTeamSelect: true,
  allowLateJoin: true,
  soundEnabled: true,
};

app.post('/api/games', requireAuth, (req, res) => {
  const { title, questionSetId, teams, settings } = req.body || {};
  const questionSet = db.questionSets.find((qs) => qs.id === questionSetId && qs.teacherId === req.teacher.id);
  if (!questionSet) return res.status(400).json({ error: 'Please select a valid question set.' });
  if (!questionSet.questions.length) return res.status(400).json({ error: 'That question set has no questions.' });

  const existingCodes = new Set([...liveRooms.keys()]);
  const roomCode = generateRoomCode(existingCodes);

  const gameDef = {
    id: uid(),
    teacherId: req.teacher.id,
    title: (title || '').trim() || questionSet.title,
    questionSetId,
    roomCode,
    status: 'lobby',
    teams: {
      A: {
        name: (teams?.A?.name || 'Team A').trim().slice(0, 30) || 'Team A',
        color: teams?.A?.color || '#2563EB',
        icon: teams?.A?.icon || '🐯',
      },
      B: {
        name: (teams?.B?.name || 'Team B').trim().slice(0, 30) || 'Team B',
        color: teams?.B?.color || '#F97316',
        icon: teams?.B?.icon || '🦅',
      },
    },
    settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
    createdAt: Date.now(),
  };
  db.games.push(gameDef);
  db.saveGames();

  const room = new GameRoom({
    io,
    gameDef,
    questionSet: { title: questionSet.title, questions: questionSet.questions },
    teacherId: req.teacher.id,
  });
  liveRooms.set(roomCode, room);

  res.json({ game: gameDef });
});

app.get('/api/games', requireAuth, (req, res) => {
  const games = db.games
    .filter((g) => g.teacherId === req.teacher.id)
    .map((g) => ({ ...g, live: liveRooms.has(g.roomCode) && liveRooms.get(g.roomCode).phase !== PHASES.ENDED }))
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(games);
});

// Student-facing room validation (no auth).
app.get('/api/rooms/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const room = liveRooms.get(code);
  if (!room) return res.status(404).json({ error: 'Invalid room code. Please check with your teacher.' });
  if (room.phase === PHASES.ENDED) return res.status(410).json({ error: 'This game has already ended.' });
  if (room.roomLocked) return res.status(423).json({ error: 'This room is locked by the teacher.' });
  if (room.phase !== PHASES.LOBBY && !room.settings.allowLateJoin) {
    return res.status(409).json({ error: 'The game has already started.' });
  }
  res.json({
    roomCode: room.roomCode,
    title: room.title,
    allowTeamSelect: room.settings.allowTeamSelect,
    teams: {
      A: { name: room.teams.A.name, color: room.teams.A.color, icon: room.teams.A.icon },
      B: { name: room.teams.B.name, color: room.teams.B.color, icon: room.teams.B.icon },
    },
  });
});

// ---------------- Reports ----------------

app.get('/api/reports', requireAuth, (req, res) => {
  res.json(
    db.reports
      .filter((r) => r.teacherId === req.teacher.id)
      .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
  );
});

app.get('/api/reports/:id', requireAuth, (req, res) => {
  const report = db.reports.find((r) => r.id === req.params.id && r.teacherId === req.teacher.id);
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  res.json(report);
});

app.delete('/api/reports/:id', requireAuth, (req, res) => {
  const index = db.reports.findIndex((r) => r.id === req.params.id && r.teacherId === req.teacher.id);
  if (index < 0) return res.status(404).json({ error: 'Report not found.' });
  db.reports.splice(index, 1);
  db.saveReports();
  res.json({ ok: true });
});

// ---------------- Socket.IO ----------------

io.on('connection', (socket) => {
  let role = null; // 'teacher' | 'student' | 'projector'
  let roomCode = null;
  let participantId = null;

  const getRoom = () => (roomCode ? liveRooms.get(roomCode) : null);

  socket.on('teacher:join', ({ token, roomCode: code }, ack) => {
    const teacher = getTeacherByToken(token);
    const room = liveRooms.get((code || '').toUpperCase());
    if (!teacher || !room || room.teacherId !== teacher.id) {
      return ack?.({ error: 'Unable to join this room as the host.' });
    }
    role = 'teacher';
    roomCode = room.roomCode;
    socket.join(`room:${roomCode}:teacher`);
    room.teacherConnected = true;
    room.broadcast();
    ack?.({ ok: true, state: room.snapshot('teacher') });
  });

  socket.on('projector:join', ({ roomCode: code }, ack) => {
    const room = liveRooms.get((code || '').toUpperCase());
    if (!room) return ack?.({ error: 'Room not found.' });
    role = 'projector';
    roomCode = room.roomCode;
    socket.join(`room:${roomCode}:public`);
    ack?.({ ok: true, state: room.snapshot('public') });
  });

  socket.on('student:join', ({ roomCode: code, name, teamId, sessionToken }, ack) => {
    const room = liveRooms.get((code || '').toUpperCase());
    if (!room) return ack?.({ error: 'Invalid room code.' });
    if (room.phase === PHASES.ENDED) return ack?.({ error: 'This game has ended.' });

    // Reconnection path: restore existing participant by session token.
    if (sessionToken) {
      const existing = room.resumeParticipant(sessionToken, socket.id);
      if (existing) {
        role = 'student';
        roomCode = room.roomCode;
        participantId = existing.id;
        socket.join(`room:${roomCode}:public`);
        room.broadcast();
        return ack?.({
          ok: true,
          participant: { id: existing.id, name: existing.name, teamId: existing.teamId, sessionToken: existing.sessionToken },
          state: room.snapshot('public'),
        });
      }
    }

    const result = room.addParticipant({ name, teamId, socketId: socket.id });
    if (result.error) return ack?.({ error: result.error });
    role = 'student';
    roomCode = room.roomCode;
    participantId = result.participant.id;
    socket.join(`room:${roomCode}:public`);
    room.broadcast();
    ack?.({
      ok: true,
      participant: {
        id: result.participant.id,
        name: result.participant.name,
        teamId: result.participant.teamId,
        sessionToken: result.participant.sessionToken,
      },
      state: room.snapshot('public'),
    });
  });

  socket.on('student:buzz', (ack) => {
    const room = getRoom();
    if (!room || role !== 'student' || !participantId) return ack?.({ accepted: false, reason: 'invalid' });
    const result = room.pressBuzzer(participantId);
    if (result.accepted) room.broadcast();
    ack?.(result);
  });

  socket.on('teacher:action', ({ type, payload }, ack) => {
    const room = getRoom();
    if (!room || role !== 'teacher') return ack?.({ error: 'Not authorized.' });
    let error = null;

    switch (type) {
      case 'assign_team': room.assignTeam(payload?.participantId, payload?.teamId ?? null); break;
      case 'remove_student': {
        const removed = room.removeParticipant(payload?.participantId);
        if (removed?.socketId) io.to(removed.socketId).emit('kicked');
        break;
      }
      case 'randomize_teams': room.randomizeTeams(); break;
      case 'balance_teams': room.balanceTeams(); break;
      case 'lock_room': room.roomLocked = !!payload?.locked; room.log(room.roomLocked ? 'Room locked' : 'Room unlocked'); break;
      case 'start_game': {
        const result = room.startGame();
        if (result.error) error = result.error;
        break;
      }
      case 'open_buzzer': room.openBuzzer(); break;
      case 'lock_buzzer': room.lockBuzzer(); break;
      case 'reset_buzzer': room.resetBuzzer(); break;
      case 'mark_correct': room.markCorrect(); break;
      case 'mark_incorrect': room.markIncorrect(); break;
      case 'other_team_chance': room.giveOtherTeamChance(); break;
      case 'reveal_answer': room.revealAnswer(); break;
      case 'skip_question': room.skipQuestion(); break;
      case 'restart_question': room.restartQuestion(); break;
      case 'next_question': room.nextQuestion(); break;
      case 'adjust_score': {
        const { teamId, change, reason } = payload || {};
        if ((teamId === 'A' || teamId === 'B') && Number.isFinite(+change)) {
          room.applyScore(teamId, Math.round(+change), reason || 'Manual adjustment');
        }
        break;
      }
      case 'undo_score': room.undoLastScore(); break;
      case 'pause_game': room.pauseGame(); break;
      case 'resume_game': room.resumeGame(); break;
      case 'end_game': room.endGame(); break;
      default: error = 'Unknown action.';
    }

    room.broadcast();
    ack?.(error ? { error } : { ok: true });
  });

  socket.on('disconnect', () => {
    const room = getRoom();
    if (!room) return;
    if (role === 'student' && participantId) {
      room.disconnectParticipant(participantId);
      room.broadcast();
    }
    if (role === 'teacher') {
      // Only mark disconnected if no other teacher socket remains in the room.
      const teacherRoom = io.sockets.adapter.rooms.get(`room:${room.roomCode}:teacher`);
      if (!teacherRoom || teacherRoom.size === 0) {
        room.teacherConnected = false;
        room.broadcast();
      }
    }
  });
});

// ---------------- Static client (production build) ----------------

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`ClassBuzz server running on http://localhost:${PORT}`);
});
