import crypto from 'crypto';
import { db } from './store.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no confusable chars

export function generateRoomCode(existingCodes) {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)];
    }
    if (!existingCodes.has(code)) return code;
  }
  throw new Error('Could not generate room code');
}

const uid = () => crypto.randomBytes(8).toString('hex');

export const PHASES = {
  LOBBY: 'lobby',
  QUESTION_IDLE: 'question_idle', // question visible, buzzer closed
  QUESTION_READING: 'question_reading', // reading countdown running
  BUZZER_ACTIVE: 'buzzer_active',
  TEAM_BUZZED: 'team_buzzed', // a team won the buzzer, discussion in progress
  ROUND_RESULT: 'round_result',
  PAUSED: 'paused',
  ENDED: 'ended',
};

/**
 * Live, server-authoritative state for one game room.
 * All transitions happen here; clients only send intents.
 */
export class GameRoom {
  constructor({ io, gameDef, questionSet, teacherId }) {
    this.io = io;
    this.id = gameDef.id;
    this.roomCode = gameDef.roomCode;
    this.teacherId = teacherId;
    this.title = gameDef.title;
    this.settings = gameDef.settings;
    this.questions = questionSet.questions;
    this.questionSetTitle = questionSet.title;

    this.teams = {
      A: { id: 'A', name: gameDef.teams.A.name, color: gameDef.teams.A.color, icon: gameDef.teams.A.icon, score: 0 },
      B: { id: 'B', name: gameDef.teams.B.name, color: gameDef.teams.B.color, icon: gameDef.teams.B.icon, score: 0 },
    };

    this.participants = new Map(); // participantId -> participant
    this.tokenIndex = new Map(); // sessionToken -> participantId

    this.phase = PHASES.LOBBY;
    this.phaseBeforePause = null;
    this.roomLocked = false;
    this.currentQuestionIndex = -1;
    this.round = null; // per-question live data
    this.rounds = []; // completed round records
    this.scoreHistory = [];
    this.eventLog = [];
    this.readingEndsAt = null;
    this.discussionEndsAt = null;
    this.startedAt = null;
    this.endedAt = null;
    this.readingTimer = null;
    this.teacherConnected = false;
  }

  // ---------- helpers ----------

  log(message) {
    this.eventLog.push({ id: uid(), at: Date.now(), message });
    if (this.eventLog.length > 200) this.eventLog.shift();
  }

  currentQuestion() {
    return this.questions[this.currentQuestionIndex] || null;
  }

  freshRound() {
    return {
      questionIndex: this.currentQuestionIndex,
      buzz: null, // { participantId, participantName, teamId, at, responseMs }
      lockedTeams: [],
      buzzerOpenedAt: null,
      answerRevealed: false,
      result: null, // 'correct' | 'incorrect' | 'skipped'
      resultTeamId: null,
      attempts: [], // { teamId, participantName, result }
    };
  }

  clearReadingTimer() {
    if (this.readingTimer) {
      clearTimeout(this.readingTimer);
      this.readingTimer = null;
    }
  }

  // ---------- participants ----------

  addParticipant({ name, teamId, socketId }) {
    if (this.roomLocked) return { error: 'This room is locked by the teacher.' };
    if (this.phase !== PHASES.LOBBY && !this.settings.allowLateJoin) {
      return { error: 'The game has already started.' };
    }
    const trimmed = (name || '').trim().slice(0, 24);
    if (!trimmed) return { error: 'Please enter a display name.' };
    const taken = [...this.participants.values()].some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (taken) return { error: 'That name is already used in this room.' };
    if (this.participants.size >= 100) return { error: 'This room is full.' };

    const participant = {
      id: uid(),
      name: trimmed,
      teamId: this.settings.allowTeamSelect && (teamId === 'A' || teamId === 'B') ? teamId : null,
      sessionToken: crypto.randomBytes(24).toString('hex'),
      connected: true,
      socketId,
      joinedAt: Date.now(),
    };
    this.participants.set(participant.id, participant);
    this.tokenIndex.set(participant.sessionToken, participant.id);
    this.log(`${participant.name} joined${participant.teamId ? ` (${this.teams[participant.teamId].name})` : ''}`);
    return { participant };
  }

  resumeParticipant(sessionToken, socketId) {
    const participantId = this.tokenIndex.get(sessionToken);
    if (!participantId) return null;
    const participant = this.participants.get(participantId);
    if (!participant) return null;
    participant.connected = true;
    participant.socketId = socketId;
    this.log(`${participant.name} reconnected`);
    return participant;
  }

  disconnectParticipant(participantId) {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.connected = false;
      participant.socketId = null;
      this.log(`${participant.name} disconnected`);
    }
  }

  removeParticipant(participantId) {
    const participant = this.participants.get(participantId);
    if (!participant) return null;
    this.tokenIndex.delete(participant.sessionToken);
    this.participants.delete(participantId);
    this.log(`${participant.name} was removed by the teacher`);
    return participant;
  }

  assignTeam(participantId, teamId) {
    const participant = this.participants.get(participantId);
    if (!participant) return;
    if (teamId !== 'A' && teamId !== 'B' && teamId !== null) return;
    participant.teamId = teamId;
    if (teamId) this.log(`${participant.name} assigned to ${this.teams[teamId].name}`);
  }

  randomizeTeams() {
    const all = [...this.participants.values()];
    const shuffled = all.sort(() => Math.random() - 0.5);
    shuffled.forEach((p, i) => { p.teamId = i % 2 === 0 ? 'A' : 'B'; });
    this.log('Teams randomized');
  }

  balanceTeams() {
    const unassigned = [...this.participants.values()].filter((p) => !p.teamId);
    for (const p of unassigned) {
      const countA = [...this.participants.values()].filter((x) => x.teamId === 'A').length;
      const countB = [...this.participants.values()].filter((x) => x.teamId === 'B').length;
      p.teamId = countA <= countB ? 'A' : 'B';
    }
    this.log('Teams auto-balanced');
  }

  teamMembers(teamId) {
    return [...this.participants.values()].filter((p) => p.teamId === teamId);
  }

  // ---------- game flow ----------

  canStart() {
    const a = this.teamMembers('A');
    const b = this.teamMembers('B');
    const unassignedConnected = [...this.participants.values()].filter((p) => !p.teamId && p.connected);
    if (a.length === 0 || b.length === 0) return { ok: false, reason: 'Both teams need at least one member.' };
    if (unassignedConnected.length > 0) return { ok: false, reason: 'Every connected student must be assigned to a team.' };
    if (!this.questions.length) return { ok: false, reason: 'The question set has no questions.' };
    return { ok: true };
  }

  startGame() {
    const check = this.canStart();
    if (!check.ok) return { error: check.reason };
    this.startedAt = Date.now();
    this.log('Game started');
    this.advanceToQuestion(0);
    return { ok: true };
  }

  advanceToQuestion(index) {
    this.clearReadingTimer();
    if (index >= this.questions.length) {
      this.endGame();
      return;
    }
    this.currentQuestionIndex = index;
    this.round = this.freshRound();
    const readingSeconds = this.settings.readingSeconds;
    if (readingSeconds > 0) {
      this.phase = PHASES.QUESTION_READING;
      this.readingEndsAt = Date.now() + readingSeconds * 1000;
      this.log(`Question ${index + 1} displayed — reading time ${readingSeconds}s`);
      if (this.settings.autoOpenBuzzer) {
        this.readingTimer = setTimeout(() => {
          if (this.phase === PHASES.QUESTION_READING) {
            this.openBuzzer();
            this.broadcast();
          }
        }, readingSeconds * 1000);
      }
    } else {
      this.phase = PHASES.QUESTION_IDLE;
      this.readingEndsAt = null;
      this.log(`Question ${index + 1} displayed`);
    }
    this.discussionEndsAt = null;
  }

  openBuzzer() {
    if (!this.round) return;
    this.clearReadingTimer();
    this.phase = PHASES.BUZZER_ACTIVE;
    this.readingEndsAt = null;
    this.round.buzzerOpenedAt = Date.now();
    this.log('Buzzer opened');
  }

  lockBuzzer() {
    if (this.phase === PHASES.BUZZER_ACTIVE) {
      this.phase = PHASES.QUESTION_IDLE;
      this.log('Buzzer locked by teacher');
    }
  }

  /**
   * Atomic buzzer press. Single-threaded Node guarantees the first request
   * to reach this function wins; everyone else is rejected.
   */
  pressBuzzer(participantId) {
    const participant = this.participants.get(participantId);
    if (!participant || !participant.teamId) return { accepted: false, reason: 'not_in_team' };
    if (this.phase !== PHASES.BUZZER_ACTIVE) return { accepted: false, reason: 'too_early' };
    if (!this.round || this.round.buzz) return { accepted: false, reason: 'already_taken' };
    if (this.round.lockedTeams.includes(participant.teamId)) {
      return { accepted: false, reason: 'team_locked' };
    }

    const now = Date.now();
    this.round.buzz = {
      participantId: participant.id,
      participantName: participant.name,
      teamId: participant.teamId,
      at: now,
      responseMs: this.round.buzzerOpenedAt ? now - this.round.buzzerOpenedAt : null,
    };
    this.phase = PHASES.TEAM_BUZZED;
    const discussionSeconds = this.settings.discussionSeconds;
    this.discussionEndsAt = discussionSeconds > 0 ? now + discussionSeconds * 1000 : null;
    this.log(`${this.teams[participant.teamId].name} buzzed first (${participant.name})`);
    return { accepted: true, teamId: participant.teamId };
  }

  resetBuzzer() {
    if (!this.round) return;
    this.round.buzz = null;
    this.round.lockedTeams = [];
    this.discussionEndsAt = null;
    this.phase = PHASES.QUESTION_IDLE;
    this.log('Buzzer reset by teacher');
  }

  applyScore(teamId, change, reason) {
    const team = this.teams[teamId];
    if (!team || !change) return;
    team.score += change;
    this.scoreHistory.push({
      id: uid(),
      questionIndex: this.currentQuestionIndex,
      teamId,
      teamName: team.name,
      change,
      reason,
      at: Date.now(),
    });
    this.log(`${team.name} ${change > 0 ? '+' : ''}${change} (${reason})`);
  }

  undoLastScore() {
    const last = this.scoreHistory.pop();
    if (!last) return;
    this.teams[last.teamId].score -= last.change;
    this.log(`Undo: ${last.teamName} ${last.change > 0 ? '+' : ''}${last.change} (${last.reason}) reverted`);
  }

  markCorrect() {
    if (!this.round?.buzz) return;
    const { teamId, participantName } = this.round.buzz;
    const points = this.settings.pointsCorrect;
    this.applyScore(teamId, points, `Correct answer — Question ${this.currentQuestionIndex + 1}`);
    this.round.attempts.push({ teamId, participantName, result: 'correct' });
    this.round.result = 'correct';
    this.round.resultTeamId = teamId;
    this.round.answerRevealed = true;
    this.phase = PHASES.ROUND_RESULT;
    this.discussionEndsAt = null;
  }

  markIncorrect() {
    if (!this.round?.buzz) return;
    const { teamId, participantName } = this.round.buzz;
    const penalty = this.settings.penaltyWrong;
    if (penalty > 0) {
      this.applyScore(teamId, -penalty, `Wrong-answer penalty — Question ${this.currentQuestionIndex + 1}`);
    }
    this.round.attempts.push({ teamId, participantName, result: 'incorrect' });
    this.discussionEndsAt = null;

    const otherTeam = teamId === 'A' ? 'B' : 'A';
    const rule = this.settings.secondChance;
    const otherAlreadyTried = this.round.lockedTeams.includes(otherTeam) ||
      this.round.attempts.some((a) => a.teamId === otherTeam);

    if (rule !== 'end' && !otherAlreadyTried) {
      this.round.lockedTeams.push(teamId);
      if (rule === 'other_team') {
        // Other team automatically receives the answer opportunity.
        const now = Date.now();
        this.round.buzz = {
          participantId: null,
          participantName: null,
          teamId: otherTeam,
          at: now,
          responseMs: null,
          secondChance: true,
        };
        this.phase = PHASES.TEAM_BUZZED;
        const discussionSeconds = this.settings.discussionSeconds;
        this.discussionEndsAt = discussionSeconds > 0 ? now + discussionSeconds * 1000 : null;
        this.log(`Second chance: ${this.teams[otherTeam].name} gets the turn`);
        return;
      }
      if (rule === 'reopen') {
        this.round.buzz = null;
        this.phase = PHASES.BUZZER_ACTIVE;
        this.round.buzzerOpenedAt = Date.now();
        this.log(`Buzzer reopened for ${this.teams[otherTeam].name}`);
        return;
      }
    }

    this.round.result = 'incorrect';
    this.round.resultTeamId = teamId;
    this.round.answerRevealed = true;
    this.phase = PHASES.ROUND_RESULT;
    this.log('Round ended — no correct answer');
  }

  giveOtherTeamChance() {
    if (!this.round?.buzz) return;
    const current = this.round.buzz.teamId;
    const other = current === 'A' ? 'B' : 'A';
    if (!this.round.lockedTeams.includes(current)) this.round.lockedTeams.push(current);
    const now = Date.now();
    this.round.buzz = {
      participantId: null,
      participantName: null,
      teamId: other,
      at: now,
      responseMs: null,
      secondChance: true,
    };
    this.phase = PHASES.TEAM_BUZZED;
    const discussionSeconds = this.settings.discussionSeconds;
    this.discussionEndsAt = discussionSeconds > 0 ? now + discussionSeconds * 1000 : null;
    this.log(`Teacher gave the turn to ${this.teams[other].name}`);
  }

  revealAnswer() {
    if (!this.round) return;
    this.round.answerRevealed = true;
    if (this.phase !== PHASES.ROUND_RESULT) {
      this.round.result = this.round.result || 'revealed';
      this.phase = PHASES.ROUND_RESULT;
    }
    this.log('Correct answer revealed');
  }

  skipQuestion() {
    if (!this.round) return;
    this.round.result = 'skipped';
    this.round.answerRevealed = true;
    this.phase = PHASES.ROUND_RESULT;
    this.discussionEndsAt = null;
    this.log(`Question ${this.currentQuestionIndex + 1} skipped`);
  }

  restartQuestion() {
    this.round = this.freshRound();
    this.advanceToQuestion(this.currentQuestionIndex);
    this.log(`Question ${this.currentQuestionIndex + 1} restarted`);
  }

  nextQuestion() {
    if (this.round) {
      this.rounds.push({ ...this.round, completedAt: Date.now() });
    }
    this.advanceToQuestion(this.currentQuestionIndex + 1);
  }

  pauseGame() {
    if (this.phase === PHASES.PAUSED || this.phase === PHASES.ENDED) return;
    this.clearReadingTimer();
    this.phaseBeforePause = this.phase;
    this.phase = PHASES.PAUSED;
    this.readingEndsAt = null;
    this.discussionEndsAt = null;
    this.log('Game paused');
  }

  resumeGame() {
    if (this.phase !== PHASES.PAUSED) return;
    // Resume to a safe state: if mid-buzz keep it, otherwise show question with buzzer closed.
    const prev = this.phaseBeforePause;
    if (prev === PHASES.TEAM_BUZZED && this.round?.buzz) {
      this.phase = PHASES.TEAM_BUZZED;
    } else if (prev === PHASES.ROUND_RESULT) {
      this.phase = PHASES.ROUND_RESULT;
    } else if (prev === PHASES.LOBBY) {
      this.phase = PHASES.LOBBY;
    } else {
      this.phase = PHASES.QUESTION_IDLE;
    }
    this.phaseBeforePause = null;
    this.log('Game resumed');
  }

  endGame() {
    this.clearReadingTimer();
    if (this.round && this.round.questionIndex === this.currentQuestionIndex &&
        !this.rounds.some((r) => r.questionIndex === this.round.questionIndex)) {
      this.rounds.push({ ...this.round, completedAt: Date.now() });
    }
    this.phase = PHASES.ENDED;
    this.endedAt = Date.now();
    this.readingEndsAt = null;
    this.discussionEndsAt = null;
    this.log('Game ended');
    this.persistReport();
  }

  // ---------- reporting ----------

  buildTeamStats(teamId) {
    const attempts = this.rounds.flatMap((r) => r.attempts.filter((a) => a.teamId === teamId));
    const buzzWins = this.rounds.filter((r) => r.buzz?.teamId === teamId && !r.buzz.secondChance);
    const responseTimes = this.rounds
      .filter((r) => r.buzz?.teamId === teamId && typeof r.buzz.responseMs === 'number')
      .map((r) => r.buzz.responseMs);
    return {
      teamId,
      name: this.teams[teamId].name,
      color: this.teams[teamId].color,
      icon: this.teams[teamId].icon,
      score: this.teams[teamId].score,
      correct: attempts.filter((a) => a.result === 'correct').length,
      incorrect: attempts.filter((a) => a.result === 'incorrect').length,
      buzzerWins: buzzWins.length,
      avgResponseMs: responseTimes.length
        ? Math.round(responseTimes.reduce((s, x) => s + x, 0) / responseTimes.length)
        : null,
      members: this.teamMembers(teamId).map((p) => p.name),
    };
  }

  buildReport() {
    const a = this.buildTeamStats('A');
    const b = this.buildTeamStats('B');
    const winner = a.score > b.score ? 'A' : b.score > a.score ? 'B' : null;
    return {
      id: this.id,
      roomCode: this.roomCode,
      teacherId: this.teacherId,
      title: this.title,
      questionSetTitle: this.questionSetTitle,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      durationMs: this.startedAt && this.endedAt ? this.endedAt - this.startedAt : null,
      totalQuestions: this.questions.length,
      winner,
      isTie: winner === null,
      teams: { A: a, B: b },
      questionResults: this.rounds.map((r) => ({
        questionIndex: r.questionIndex,
        questionText: this.questions[r.questionIndex]?.text || '',
        buzzTeamId: r.buzz?.teamId || null,
        buzzResponseMs: r.buzz?.responseMs ?? null,
        result: r.result,
        resultTeamId: r.resultTeamId,
        attempts: r.attempts,
      })),
      scoreHistory: this.scoreHistory,
    };
  }

  persistReport() {
    const report = this.buildReport();
    const existing = db.reports.findIndex((r) => r.id === report.id);
    if (existing >= 0) db.reports[existing] = report;
    else db.reports.push(report);
    db.saveReports();
    const gameDef = db.games.find((g) => g.id === this.id);
    if (gameDef) {
      gameDef.status = 'ended';
      gameDef.endedAt = this.endedAt;
      db.saveGames();
    }
  }

  // ---------- snapshots + broadcast ----------

  snapshot(role) {
    const question = this.currentQuestion();
    const revealAnswer = role === 'teacher' || this.round?.answerRevealed;
    return {
      id: this.id,
      roomCode: this.roomCode,
      title: this.title,
      phase: this.phase,
      roomLocked: this.roomLocked,
      settings: this.settings,
      teacherConnected: this.teacherConnected,
      serverNow: Date.now(),
      readingEndsAt: this.readingEndsAt,
      discussionEndsAt: this.discussionEndsAt,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      question: question
        ? {
            text: question.text,
            type: question.type,
            options: question.options || [],
            image: question.image || null,
            points: question.points ?? this.settings.pointsCorrect,
            correctAnswer: revealAnswer ? question.correctAnswer : null,
            explanation: revealAnswer ? question.explanation || null : null,
          }
        : null,
      teams: {
        A: { ...this.teams.A, members: this.teamMembers('A').map((p) => ({ id: p.id, name: p.name, connected: p.connected })) },
        B: { ...this.teams.B, members: this.teamMembers('B').map((p) => ({ id: p.id, name: p.name, connected: p.connected })) },
      },
      unassigned: [...this.participants.values()]
        .filter((p) => !p.teamId)
        .map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
      round: this.round
        ? {
            buzz: this.round.buzz,
            lockedTeams: this.round.lockedTeams,
            result: this.round.result,
            resultTeamId: this.round.resultTeamId,
            answerRevealed: this.round.answerRevealed,
            attempts: this.round.attempts,
          }
        : null,
      scoreHistory: role === 'teacher' ? this.scoreHistory.slice(-30) : [],
      eventLog: role === 'teacher' ? this.eventLog.slice(-30) : [],
      finalReport: this.phase === PHASES.ENDED ? this.buildReport() : null,
    };
  }

  broadcast() {
    this.io.to(`room:${this.roomCode}:teacher`).emit('state', this.snapshot('teacher'));
    this.io.to(`room:${this.roomCode}:public`).emit('state', this.snapshot('public'));
  }
}
