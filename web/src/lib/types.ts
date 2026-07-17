export type TeamId = 'A' | 'B';

export type Phase =
  | 'lobby'
  | 'question_idle'
  | 'question_reading'
  | 'buzzer_active'
  | 'team_buzzed'
  | 'round_result'
  | 'paused'
  | 'ended';

export interface Teacher {
  id: string;
  name: string;
  email: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'open' | 'multiple_choice' | 'true_false';
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number | null;
  image: string | null;
  displayOrder?: number;
}

export interface QuestionSet {
  id: string;
  teacherId: string;
  title: string;
  subject: string;
  description: string;
  questions: Question[];
  createdAt: number;
  updatedAt: number;
}

export interface GameSettings {
  readingSeconds: number;
  discussionSeconds: number;
  autoOpenBuzzer: boolean;
  pointsCorrect: number;
  penaltyWrong: number;
  secondChance: 'other_team' | 'reopen' | 'end';
  allowTeamSelect: boolean;
  allowLateJoin: boolean;
  soundEnabled: boolean;
}

export interface Member {
  id: string;
  name: string;
  connected: boolean;
}

export interface TeamState {
  id: TeamId;
  name: string;
  color: string;
  icon: string;
  score: number;
  members: Member[];
}

export interface Buzz {
  participantId: string | null;
  participantName: string | null;
  teamId: TeamId;
  at: number;
  responseMs: number | null;
  secondChance?: boolean;
}

export interface RoundState {
  buzz: Buzz | null;
  lockedTeams: TeamId[];
  result: 'correct' | 'incorrect' | 'skipped' | 'revealed' | null;
  resultTeamId: TeamId | null;
  answerRevealed: boolean;
  attempts: { teamId: TeamId; participantName: string | null; result: string }[];
}

export interface ScoreEvent {
  id: string;
  questionIndex: number;
  teamId: TeamId;
  teamName: string;
  change: number;
  reason: string;
  at: number;
}

export interface TeamStats {
  teamId: TeamId;
  name: string;
  color: string;
  icon: string;
  score: number;
  correct: number;
  incorrect: number;
  buzzerWins: number;
  avgResponseMs: number | null;
  members: string[];
}

export interface GameReport {
  id: string;
  roomCode: string;
  teacherId?: string;
  title: string;
  questionSetTitle: string;
  startedAt: number | null;
  endedAt: number | null;
  durationMs: number | null;
  totalQuestions: number;
  winner: TeamId | null;
  isTie: boolean;
  teams: { A: TeamStats; B: TeamStats };
  questionResults: {
    questionIndex: number;
    questionText: string;
    buzzTeamId: TeamId | null;
    buzzResponseMs: number | null;
    result: string | null;
    resultTeamId: TeamId | null;
    attempts: { teamId: TeamId; participantName: string | null; result: string }[];
  }[];
  scoreHistory: ScoreEvent[];
}

export interface GameState {
  id: string;
  roomCode: string;
  title: string;
  phase: Phase;
  roomLocked: boolean;
  settings: GameSettings;
  teacherConnected: boolean;
  serverNow: number;
  readingEndsAt: number | null;
  discussionEndsAt: number | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  question: {
    text: string;
    type: string;
    options: string[];
    image: string | null;
    points: number;
    correctAnswer: string | null;
    explanation: string | null;
  } | null;
  teams: { A: TeamState; B: TeamState };
  unassigned: Member[];
  round: RoundState | null;
  scoreHistory: ScoreEvent[];
  eventLog: { id: string; at: number; message: string }[];
  finalReport: GameReport | null;
}

export interface GameDef {
  id: string;
  title: string;
  roomCode: string;
  status: string;
  live?: boolean;
  createdAt: number;
  teams: { A: { name: string; color: string; icon: string }; B: { name: string; color: string; icon: string } };
  settings: GameSettings;
}

export const DEFAULT_SETTINGS: GameSettings = {
  readingSeconds: 5,
  discussionSeconds: 15,
  autoOpenBuzzer: true,
  pointsCorrect: 1,
  penaltyWrong: 0,
  secondChance: 'other_team',
  allowTeamSelect: true,
  allowLateJoin: true,
  soundEnabled: true,
};

export const PHASES = {
  LOBBY: 'lobby',
  QUESTION_IDLE: 'question_idle',
  QUESTION_READING: 'question_reading',
  BUZZER_ACTIVE: 'buzzer_active',
  TEAM_BUZZED: 'team_buzzed',
  ROUND_RESULT: 'round_result',
  PAUSED: 'paused',
  ENDED: 'ended',
} as const;
