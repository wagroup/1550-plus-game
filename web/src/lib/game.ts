import { uid } from './crypto';
import type { GameReport, GameState, Phase, TeamId } from './types';
import { PHASES } from './types';

export interface Participant {
  id: string;
  name: string;
  teamId: TeamId | null;
  sessionToken: string;
  connected: boolean;
  joinedAt: number;
  lastSeenAt?: number;
}

export interface LiveRoomData {
  id: string;
  roomCode: string;
  teacherId: string;
  title: string;
  settings: {
    readingSeconds: number;
    discussionSeconds: number;
    autoOpenBuzzer: boolean;
    pointsCorrect: number;
    penaltyWrong: number;
    secondChance: 'other_team' | 'reopen' | 'end';
    allowTeamSelect: boolean;
    allowLateJoin: boolean;
    soundEnabled: boolean;
  };
  questions: Array<{
    id: string;
    text: string;
    type: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    points: number | null;
    image: string | null;
  }>;
  questionSetTitle: string;
  teams: {
    A: { id: string; name: string; color: string; icon: string; score: number };
    B: { id: string; name: string; color: string; icon: string; score: number };
  };
  participants: Participant[];
  phase: Phase;
  phaseBeforePause: Phase | null;
  roomLocked: boolean;
  currentQuestionIndex: number;
  round: {
    questionIndex: number;
    buzz: {
      participantId: string | null;
      participantName: string | null;
      teamId: TeamId;
      at: number;
      responseMs: number | null;
      secondChance?: boolean;
    } | null;
    lockedTeams: TeamId[];
    buzzerOpenedAt: number | null;
    answerRevealed: boolean;
    result: 'correct' | 'incorrect' | 'skipped' | 'revealed' | null;
    resultTeamId: TeamId | null;
    attempts: { teamId: TeamId; participantName: string | null; result: string }[];
  } | null;
  rounds: Array<Record<string, unknown>>;
  scoreHistory: Array<{
    id: string;
    questionIndex: number;
    teamId: TeamId;
    teamName: string;
    change: number;
    reason: string;
    at: number;
  }>;
  eventLog: Array<{ id: string; at: number; message: string }>;
  readingEndsAt: number | null;
  discussionEndsAt: number | null;
  startedAt: number | null;
  endedAt: number | null;
  teacherConnected: boolean;
  teacherLastSeenAt: number | null;
}

function log(room: LiveRoomData, message: string) {
  room.eventLog.push({ id: uid(), at: Date.now(), message });
  if (room.eventLog.length > 200) room.eventLog.shift();
}

function teamMembers(room: LiveRoomData, teamId: TeamId) {
  return room.participants.filter((p) => p.teamId === teamId);
}

function freshRound(room: LiveRoomData): NonNullable<LiveRoomData['round']> {
  return {
    questionIndex: room.currentQuestionIndex,
    buzz: null,
    lockedTeams: [],
    buzzerOpenedAt: null,
    answerRevealed: false,
    result: null,
    resultTeamId: null,
    attempts: [],
  };
}

export function addParticipant(
  room: LiveRoomData,
  { name, teamId }: { name: string; teamId?: string | null }
) {
  if (room.roomLocked) return { error: 'This room is locked by the teacher.' };
  if (room.phase !== PHASES.LOBBY && !room.settings.allowLateJoin) {
    return { error: 'The game has already started.' };
  }
  const trimmed = (name || '').trim().slice(0, 24);
  if (!trimmed) return { error: 'Please enter a display name.' };
  if (room.participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
    return { error: 'That name is already used in this room.' };
  }
  if (room.participants.length >= 100) return { error: 'This room is full.' };

  const participant: Participant = {
    id: uid(),
    name: trimmed,
    teamId: room.settings.allowTeamSelect && (teamId === 'A' || teamId === 'B') ? teamId : null,
    sessionToken: uid(24),
    connected: true,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
  };
  room.participants.push(participant);
  log(room, `${participant.name} joined${participant.teamId ? ` (${room.teams[participant.teamId].name})` : ''}`);
  return { participant };
}

export function resumeParticipant(room: LiveRoomData, sessionToken: string) {
  const participant = room.participants.find((p) => p.sessionToken === sessionToken);
  if (!participant) return null;
  participant.connected = true;
  participant.lastSeenAt = Date.now();
  log(room, `${participant.name} reconnected`);
  return participant;
}

export function markParticipantSeen(room: LiveRoomData, sessionToken: string) {
  const participant = room.participants.find((p) => p.sessionToken === sessionToken);
  if (participant) {
    participant.connected = true;
    participant.lastSeenAt = Date.now();
  }
  return participant;
}

export function removeParticipant(room: LiveRoomData, participantId: string) {
  const index = room.participants.findIndex((p) => p.id === participantId);
  if (index < 0) return null;
  const [participant] = room.participants.splice(index, 1);
  log(room, `${participant.name} was removed by the teacher`);
  return participant;
}

export function assignTeam(room: LiveRoomData, participantId: string, teamId: TeamId | null) {
  const participant = room.participants.find((p) => p.id === participantId);
  if (!participant) return;
  if (teamId !== 'A' && teamId !== 'B' && teamId !== null) return;
  participant.teamId = teamId;
  if (teamId) log(room, `${participant.name} assigned to ${room.teams[teamId].name}`);
}

export function randomizeTeams(room: LiveRoomData) {
  const shuffled = [...room.participants].sort(() => Math.random() - 0.5);
  shuffled.forEach((p, i) => {
    p.teamId = i % 2 === 0 ? 'A' : 'B';
  });
  room.participants = shuffled;
  log(room, 'Teams randomized');
}

export function balanceTeams(room: LiveRoomData) {
  for (const p of room.participants.filter((x) => !x.teamId)) {
    const countA = room.participants.filter((x) => x.teamId === 'A').length;
    const countB = room.participants.filter((x) => x.teamId === 'B').length;
    p.teamId = countA <= countB ? 'A' : 'B';
  }
  log(room, 'Teams auto-balanced');
}

function canStart(room: LiveRoomData) {
  const a = teamMembers(room, 'A');
  const b = teamMembers(room, 'B');
  const unassignedConnected = room.participants.filter((p) => !p.teamId && p.connected);
  if (a.length === 0 || b.length === 0) return { ok: false as const, reason: 'Both teams need at least one member.' };
  if (unassignedConnected.length > 0) return { ok: false as const, reason: 'Every connected student must be assigned to a team.' };
  if (!room.questions.length) return { ok: false as const, reason: 'The question set has no questions.' };
  return { ok: true as const };
}

export function openBuzzer(room: LiveRoomData) {
  if (!room.round) return;
  room.phase = PHASES.BUZZER_ACTIVE;
  room.readingEndsAt = null;
  room.round.buzzerOpenedAt = Date.now();
  log(room, 'Buzzer opened');
}

/** Lazy timer: open buzzer when reading countdown expires (serverless-safe). */
export function tickTimers(room: LiveRoomData) {
  if (
    room.phase === PHASES.QUESTION_READING &&
    room.settings.autoOpenBuzzer &&
    room.readingEndsAt &&
    Date.now() >= room.readingEndsAt
  ) {
    openBuzzer(room);
    return true;
  }
  return false;
}

/** Mark stale participants disconnected (no heartbeat for 20s). */
export function prunePresence(room: LiveRoomData) {
  const cutoff = Date.now() - 20_000;
  let changed = false;
  for (const p of room.participants) {
    if (p.connected && (p.lastSeenAt || p.joinedAt) < cutoff) {
      p.connected = false;
      changed = true;
    }
  }
  if (room.teacherConnected && room.teacherLastSeenAt && room.teacherLastSeenAt < cutoff) {
    room.teacherConnected = false;
    changed = true;
  }
  return changed;
}

function advanceToQuestion(room: LiveRoomData, index: number) {
  if (index >= room.questions.length) {
    endGame(room);
    return;
  }
  room.currentQuestionIndex = index;
  room.round = freshRound(room);
  const readingSeconds = room.settings.readingSeconds;
  if (readingSeconds > 0) {
    room.phase = PHASES.QUESTION_READING;
    room.readingEndsAt = Date.now() + readingSeconds * 1000;
    log(room, `Question ${index + 1} displayed — reading time ${readingSeconds}s`);
  } else {
    room.phase = PHASES.QUESTION_IDLE;
    room.readingEndsAt = null;
    log(room, `Question ${index + 1} displayed`);
  }
  room.discussionEndsAt = null;
}

export function startGame(room: LiveRoomData) {
  const check = canStart(room);
  if (!check.ok) return { error: check.reason };
  room.startedAt = Date.now();
  log(room, 'Game started');
  advanceToQuestion(room, 0);
  return { ok: true as const };
}

export function lockBuzzer(room: LiveRoomData) {
  if (room.phase === PHASES.BUZZER_ACTIVE) {
    room.phase = PHASES.QUESTION_IDLE;
    log(room, 'Buzzer locked by teacher');
  }
}

/**
 * Atomic buzzer press against an in-memory room snapshot.
 * Caller must persist with an atomic MongoDB condition for multi-instance safety.
 */
export function pressBuzzer(room: LiveRoomData, participantId: string) {
  const participant = room.participants.find((p) => p.id === participantId);
  if (!participant || !participant.teamId) return { accepted: false as const, reason: 'not_in_team' };
  if (room.phase !== PHASES.BUZZER_ACTIVE) return { accepted: false as const, reason: 'too_early' };
  if (!room.round || room.round.buzz) return { accepted: false as const, reason: 'already_taken' };
  if (room.round.lockedTeams.includes(participant.teamId)) {
    return { accepted: false as const, reason: 'team_locked' };
  }

  const now = Date.now();
  room.round.buzz = {
    participantId: participant.id,
    participantName: participant.name,
    teamId: participant.teamId,
    at: now,
    responseMs: room.round.buzzerOpenedAt ? now - room.round.buzzerOpenedAt : null,
  };
  room.phase = PHASES.TEAM_BUZZED;
  const discussionSeconds = room.settings.discussionSeconds;
  room.discussionEndsAt = discussionSeconds > 0 ? now + discussionSeconds * 1000 : null;
  log(room, `${room.teams[participant.teamId].name} buzzed first (${participant.name})`);
  return { accepted: true as const, teamId: participant.teamId };
}

export function resetBuzzer(room: LiveRoomData) {
  if (!room.round) return;
  room.round.buzz = null;
  room.round.lockedTeams = [];
  room.discussionEndsAt = null;
  room.phase = PHASES.QUESTION_IDLE;
  log(room, 'Buzzer reset by teacher');
}

export function applyScore(room: LiveRoomData, teamId: TeamId, change: number, reason: string) {
  const team = room.teams[teamId];
  if (!team || !change) return;
  team.score += change;
  room.scoreHistory.push({
    id: uid(),
    questionIndex: room.currentQuestionIndex,
    teamId,
    teamName: team.name,
    change,
    reason,
    at: Date.now(),
  });
  log(room, `${team.name} ${change > 0 ? '+' : ''}${change} (${reason})`);
}

export function undoLastScore(room: LiveRoomData) {
  const last = room.scoreHistory.pop();
  if (!last) return;
  room.teams[last.teamId].score -= last.change;
  log(room, `Undo: ${last.teamName} ${last.change > 0 ? '+' : ''}${last.change} (${last.reason}) reverted`);
}

export function markCorrect(room: LiveRoomData) {
  if (!room.round?.buzz) return;
  const { teamId, participantName } = room.round.buzz;
  applyScore(room, teamId, room.settings.pointsCorrect, `Correct answer — Question ${room.currentQuestionIndex + 1}`);
  room.round.attempts.push({ teamId, participantName, result: 'correct' });
  room.round.result = 'correct';
  room.round.resultTeamId = teamId;
  room.round.answerRevealed = true;
  room.phase = PHASES.ROUND_RESULT;
  room.discussionEndsAt = null;
}

export function markIncorrect(room: LiveRoomData) {
  if (!room.round?.buzz) return;
  const { teamId, participantName } = room.round.buzz;
  if (room.settings.penaltyWrong > 0) {
    applyScore(room, teamId, -room.settings.penaltyWrong, `Wrong-answer penalty — Question ${room.currentQuestionIndex + 1}`);
  }
  room.round.attempts.push({ teamId, participantName, result: 'incorrect' });
  room.discussionEndsAt = null;

  const otherTeam: TeamId = teamId === 'A' ? 'B' : 'A';
  const rule = room.settings.secondChance;
  const otherAlreadyTried =
    room.round.lockedTeams.includes(otherTeam) || room.round.attempts.some((a) => a.teamId === otherTeam);

  if (rule !== 'end' && !otherAlreadyTried) {
    room.round.lockedTeams.push(teamId);
    if (rule === 'other_team') {
      const now = Date.now();
      room.round.buzz = {
        participantId: null,
        participantName: null,
        teamId: otherTeam,
        at: now,
        responseMs: null,
        secondChance: true,
      };
      room.phase = PHASES.TEAM_BUZZED;
      const discussionSeconds = room.settings.discussionSeconds;
      room.discussionEndsAt = discussionSeconds > 0 ? now + discussionSeconds * 1000 : null;
      log(room, `Second chance: ${room.teams[otherTeam].name} gets the turn`);
      return;
    }
    if (rule === 'reopen') {
      room.round.buzz = null;
      room.phase = PHASES.BUZZER_ACTIVE;
      room.round.buzzerOpenedAt = Date.now();
      log(room, `Buzzer reopened for ${room.teams[otherTeam].name}`);
      return;
    }
  }

  room.round.result = 'incorrect';
  room.round.resultTeamId = teamId;
  room.round.answerRevealed = true;
  room.phase = PHASES.ROUND_RESULT;
  log(room, 'Round ended — no correct answer');
}

export function giveOtherTeamChance(room: LiveRoomData) {
  if (!room.round?.buzz) return;
  const current = room.round.buzz.teamId;
  const other: TeamId = current === 'A' ? 'B' : 'A';
  if (!room.round.lockedTeams.includes(current)) room.round.lockedTeams.push(current);
  const now = Date.now();
  room.round.buzz = {
    participantId: null,
    participantName: null,
    teamId: other,
    at: now,
    responseMs: null,
    secondChance: true,
  };
  room.phase = PHASES.TEAM_BUZZED;
  const discussionSeconds = room.settings.discussionSeconds;
  room.discussionEndsAt = discussionSeconds > 0 ? now + discussionSeconds * 1000 : null;
  log(room, `Teacher gave the turn to ${room.teams[other].name}`);
}

export function revealAnswer(room: LiveRoomData) {
  if (!room.round) return;
  room.round.answerRevealed = true;
  if (room.phase !== PHASES.ROUND_RESULT) {
    room.round.result = room.round.result || 'revealed';
    room.phase = PHASES.ROUND_RESULT;
  }
  log(room, 'Correct answer revealed');
}

export function skipQuestion(room: LiveRoomData) {
  if (!room.round) return;
  room.round.result = 'skipped';
  room.round.answerRevealed = true;
  room.phase = PHASES.ROUND_RESULT;
  room.discussionEndsAt = null;
  log(room, `Question ${room.currentQuestionIndex + 1} skipped`);
}

export function restartQuestion(room: LiveRoomData) {
  room.round = freshRound(room);
  advanceToQuestion(room, room.currentQuestionIndex);
  log(room, `Question ${room.currentQuestionIndex + 1} restarted`);
}

export function nextQuestion(room: LiveRoomData) {
  if (room.round) {
    room.rounds.push({ ...room.round, completedAt: Date.now() });
  }
  advanceToQuestion(room, room.currentQuestionIndex + 1);
}

export function pauseGame(room: LiveRoomData) {
  if (room.phase === PHASES.PAUSED || room.phase === PHASES.ENDED) return;
  room.phaseBeforePause = room.phase;
  room.phase = PHASES.PAUSED;
  room.readingEndsAt = null;
  room.discussionEndsAt = null;
  log(room, 'Game paused');
}

export function resumeGame(room: LiveRoomData) {
  if (room.phase !== PHASES.PAUSED) return;
  const prev = room.phaseBeforePause;
  if (prev === PHASES.TEAM_BUZZED && room.round?.buzz) {
    room.phase = PHASES.TEAM_BUZZED;
  } else if (prev === PHASES.ROUND_RESULT) {
    room.phase = PHASES.ROUND_RESULT;
  } else if (prev === PHASES.LOBBY) {
    room.phase = PHASES.LOBBY;
  } else {
    room.phase = PHASES.QUESTION_IDLE;
  }
  room.phaseBeforePause = null;
  log(room, 'Game resumed');
}

function buildTeamStats(room: LiveRoomData, teamId: TeamId) {
  const attempts = room.rounds.flatMap((r) => {
    const atts = (r.attempts as { teamId: TeamId; result: string }[]) || [];
    return atts.filter((a) => a.teamId === teamId);
  });
  const buzzWins = room.rounds.filter((r) => {
    const buzz = r.buzz as { teamId: TeamId; secondChance?: boolean } | null;
    return buzz?.teamId === teamId && !buzz.secondChance;
  });
  const responseTimes = room.rounds
    .map((r) => r.buzz as { teamId: TeamId; responseMs?: number } | null)
    .filter((b): b is { teamId: TeamId; responseMs: number } => !!b && b.teamId === teamId && typeof b.responseMs === 'number')
    .map((b) => b.responseMs);
  return {
    teamId,
    name: room.teams[teamId].name,
    color: room.teams[teamId].color,
    icon: room.teams[teamId].icon,
    score: room.teams[teamId].score,
    correct: attempts.filter((a) => a.result === 'correct').length,
    incorrect: attempts.filter((a) => a.result === 'incorrect').length,
    buzzerWins: buzzWins.length,
    avgResponseMs: responseTimes.length
      ? Math.round(responseTimes.reduce((s, x) => s + x, 0) / responseTimes.length)
      : null,
    members: teamMembers(room, teamId).map((p) => p.name),
  };
}

export function buildReport(room: LiveRoomData): GameReport {
  const a = buildTeamStats(room, 'A');
  const b = buildTeamStats(room, 'B');
  const winner = a.score > b.score ? 'A' : b.score > a.score ? 'B' : null;
  return {
    id: room.id,
    roomCode: room.roomCode,
    teacherId: room.teacherId,
    title: room.title,
    questionSetTitle: room.questionSetTitle,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    durationMs: room.startedAt && room.endedAt ? room.endedAt - room.startedAt : null,
    totalQuestions: room.questions.length,
    winner,
    isTie: winner === null,
    teams: { A: a, B: b },
    questionResults: room.rounds.map((r) => {
      const buzz = r.buzz as { teamId: TeamId; responseMs?: number } | null;
      return {
        questionIndex: r.questionIndex as number,
        questionText: room.questions[r.questionIndex as number]?.text || '',
        buzzTeamId: buzz?.teamId || null,
        buzzResponseMs: buzz?.responseMs ?? null,
        result: (r.result as string) || null,
        resultTeamId: (r.resultTeamId as TeamId) || null,
        attempts: (r.attempts as GameReport['questionResults'][0]['attempts']) || [],
      };
    }),
    scoreHistory: room.scoreHistory,
  };
}

export function endGame(room: LiveRoomData) {
  if (
    room.round &&
    room.round.questionIndex === room.currentQuestionIndex &&
    !room.rounds.some((r) => r.questionIndex === room.round!.questionIndex)
  ) {
    room.rounds.push({ ...room.round, completedAt: Date.now() });
  }
  room.phase = PHASES.ENDED;
  room.endedAt = Date.now();
  room.readingEndsAt = null;
  room.discussionEndsAt = null;
  log(room, 'Game ended');
}

export function snapshot(room: LiveRoomData, role: 'teacher' | 'public'): GameState {
  const question = room.questions[room.currentQuestionIndex] || null;
  const revealAnswer = role === 'teacher' || !!room.round?.answerRevealed;
  return {
    id: room.id,
    roomCode: room.roomCode,
    title: room.title,
    phase: room.phase,
    roomLocked: room.roomLocked,
    settings: room.settings,
    teacherConnected: room.teacherConnected,
    serverNow: Date.now(),
    readingEndsAt: room.readingEndsAt,
    discussionEndsAt: room.discussionEndsAt,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    question: question
      ? {
          text: question.text,
          type: question.type,
          options: question.options || [],
          image: question.image || null,
          points: question.points ?? room.settings.pointsCorrect,
          correctAnswer: revealAnswer ? question.correctAnswer : null,
          explanation: revealAnswer ? question.explanation || null : null,
        }
      : null,
    teams: {
      A: {
        id: 'A' as TeamId,
        name: room.teams.A.name,
        color: room.teams.A.color,
        icon: room.teams.A.icon,
        score: room.teams.A.score,
        members: teamMembers(room, 'A').map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
      },
      B: {
        id: 'B' as TeamId,
        name: room.teams.B.name,
        color: room.teams.B.color,
        icon: room.teams.B.icon,
        score: room.teams.B.score,
        members: teamMembers(room, 'B').map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
      },
    },
    unassigned: room.participants
      .filter((p) => !p.teamId)
      .map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
    round: room.round
      ? {
          buzz: room.round.buzz,
          lockedTeams: room.round.lockedTeams,
          result: room.round.result,
          resultTeamId: room.round.resultTeamId,
          answerRevealed: room.round.answerRevealed,
          attempts: room.round.attempts,
        }
      : null,
    scoreHistory: role === 'teacher' ? room.scoreHistory.slice(-30) : [],
    eventLog: role === 'teacher' ? room.eventLog.slice(-30) : [],
    finalReport: room.phase === PHASES.ENDED ? buildReport(room) : null,
  };
}

export function roomToPlain(doc: Record<string, unknown>): LiveRoomData {
  return JSON.parse(JSON.stringify(doc)) as LiveRoomData;
}

export function applyTeacherAction(
  room: LiveRoomData,
  type: string,
  payload?: Record<string, unknown>
): { error?: string; kickedParticipantId?: string } {
  switch (type) {
    case 'assign_team':
      assignTeam(room, payload?.participantId as string, (payload?.teamId as TeamId | null) ?? null);
      break;
    case 'remove_student': {
      const removed = removeParticipant(room, payload?.participantId as string);
      if (removed) return { kickedParticipantId: removed.id };
      break;
    }
    case 'randomize_teams':
      randomizeTeams(room);
      break;
    case 'balance_teams':
      balanceTeams(room);
      break;
    case 'lock_room':
      room.roomLocked = !!payload?.locked;
      log(room, room.roomLocked ? 'Room locked' : 'Room unlocked');
      break;
    case 'start_game': {
      const result = startGame(room);
      if (result.error) return { error: result.error };
      break;
    }
    case 'open_buzzer':
      openBuzzer(room);
      break;
    case 'lock_buzzer':
      lockBuzzer(room);
      break;
    case 'reset_buzzer':
      resetBuzzer(room);
      break;
    case 'mark_correct':
      markCorrect(room);
      break;
    case 'mark_incorrect':
      markIncorrect(room);
      break;
    case 'other_team_chance':
      giveOtherTeamChance(room);
      break;
    case 'reveal_answer':
      revealAnswer(room);
      break;
    case 'skip_question':
      skipQuestion(room);
      break;
    case 'restart_question':
      restartQuestion(room);
      break;
    case 'next_question':
      nextQuestion(room);
      break;
    case 'adjust_score': {
      const teamId = payload?.teamId as TeamId;
      const change = Number(payload?.change);
      if ((teamId === 'A' || teamId === 'B') && Number.isFinite(change)) {
        applyScore(room, teamId, Math.round(change), (payload?.reason as string) || 'Manual adjustment');
      }
      break;
    }
    case 'undo_score':
      undoLastScore(room);
      break;
    case 'pause_game':
      pauseGame(room);
      break;
    case 'resume_game':
      resumeGame(room);
      break;
    case 'end_game':
      endGame(room);
      break;
    default:
      return { error: 'Unknown action.' };
  }
  return {};
}
