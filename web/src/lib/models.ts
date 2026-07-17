import mongoose, { Schema, models, model } from 'mongoose';

const TeacherSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Number, required: true },
  },
  { versionKey: false }
);

const SessionSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    teacherId: { type: String, required: true, index: true },
    createdAt: { type: Number, required: true },
  },
  { versionKey: false }
);

const QuestionSchema = new Schema(
  {
    id: String,
    text: String,
    type: { type: String, enum: ['open', 'multiple_choice', 'true_false'] },
    options: [String],
    correctAnswer: String,
    explanation: String,
    points: { type: Number, default: null },
    image: { type: String, default: null },
    displayOrder: Number,
  },
  { _id: false }
);

const QuestionSetSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    teacherId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    subject: { type: String, default: '' },
    description: { type: String, default: '' },
    questions: [QuestionSchema],
    createdAt: Number,
    updatedAt: Number,
  },
  { versionKey: false }
);

const GameSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    teacherId: { type: String, required: true, index: true },
    title: String,
    questionSetId: String,
    roomCode: { type: String, required: true, unique: true, index: true },
    status: { type: String, default: 'lobby' },
    teams: {
      A: { name: String, color: String, icon: String },
      B: { name: String, color: String, icon: String },
    },
    settings: Schema.Types.Mixed,
    createdAt: Number,
    endedAt: Number,
  },
  { versionKey: false }
);

const ReportSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    roomCode: String,
    teacherId: { type: String, required: true, index: true },
    title: String,
    questionSetTitle: String,
    startedAt: Number,
    endedAt: Number,
    durationMs: Number,
    totalQuestions: Number,
    winner: { type: String, default: null },
    isTie: Boolean,
    teams: Schema.Types.Mixed,
    questionResults: [Schema.Types.Mixed],
    scoreHistory: [Schema.Types.Mixed],
  },
  { versionKey: false }
);

const ParticipantSchema = new Schema(
  {
    id: String,
    name: String,
    teamId: { type: String, default: null },
    sessionToken: String,
    connected: { type: Boolean, default: true },
    joinedAt: Number,
    lastSeenAt: Number,
  },
  { _id: false }
);

const LiveRoomSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    roomCode: { type: String, required: true, unique: true, index: true },
    teacherId: { type: String, required: true, index: true },
    title: String,
    settings: Schema.Types.Mixed,
    questions: [QuestionSchema],
    questionSetTitle: String,
    teams: {
      A: { id: String, name: String, color: String, icon: String, score: { type: Number, default: 0 } },
      B: { id: String, name: String, color: String, icon: String, score: { type: Number, default: 0 } },
    },
    participants: [ParticipantSchema],
    phase: { type: String, default: 'lobby' },
    phaseBeforePause: { type: String, default: null },
    roomLocked: { type: Boolean, default: false },
    currentQuestionIndex: { type: Number, default: -1 },
    round: Schema.Types.Mixed,
    rounds: [Schema.Types.Mixed],
    scoreHistory: [Schema.Types.Mixed],
    eventLog: [Schema.Types.Mixed],
    readingEndsAt: { type: Number, default: null },
    discussionEndsAt: { type: Number, default: null },
    startedAt: { type: Number, default: null },
    endedAt: { type: Number, default: null },
    teacherConnected: { type: Boolean, default: false },
    teacherLastSeenAt: { type: Number, default: null },
  },
  { versionKey: false }
);

export const Teacher = models.Teacher || model('Teacher', TeacherSchema);
export const Session = models.Session || model('Session', SessionSchema);
export const QuestionSet = models.QuestionSet || model('QuestionSet', QuestionSetSchema);
export const Game = models.Game || model('Game', GameSchema);
export const Report = models.Report || model('Report', ReportSchema);
export const LiveRoom = models.LiveRoom || model('LiveRoom', LiveRoomSchema);

export type LiveRoomDoc = mongoose.InferSchemaType<typeof LiveRoomSchema> & {
  participants: Array<{
    id: string;
    name: string;
    teamId: string | null;
    sessionToken: string;
    connected: boolean;
    joinedAt: number;
    lastSeenAt?: number;
  }>;
};
