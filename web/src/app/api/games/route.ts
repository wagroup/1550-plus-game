import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Game, LiveRoom, QuestionSet } from '@/lib/models';
import { jsonError, requireAuth } from '@/lib/auth';
import { generateRoomCode, uid } from '@/lib/crypto';
import { DEFAULT_SETTINGS, PHASES } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  await connectDB();
  const games = await Game.find({ teacherId: auth.teacher!.id }).sort({ createdAt: -1 }).lean();
  const liveCodes = new Set(
    (
      await LiveRoom.find({
        teacherId: auth.teacher!.id,
        phase: { $ne: PHASES.ENDED },
      })
        .select('roomCode')
        .lean()
    ).map((r) => r.roomCode)
  );
  return Response.json(games.map((g) => ({ ...g, live: liveCodes.has(g.roomCode) })));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { title, questionSetId, teams, settings } = await req.json();
    await connectDB();
    const questionSet = await QuestionSet.findOne({
      id: questionSetId,
      teacherId: auth.teacher!.id,
    }).lean();
    if (!questionSet) return jsonError('Please select a valid question set.', 400);
    if (!questionSet.questions?.length) {
      return jsonError('That question set has no questions.', 400);
    }

    const existing = await LiveRoom.find({}).select('roomCode').lean();
    const existingCodes = new Set(existing.map((r) => r.roomCode));
    const roomCode = generateRoomCode(existingCodes);

    const gameDef = {
      id: uid(),
      teacherId: auth.teacher!.id,
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

    await Game.create(gameDef);
    await LiveRoom.create({
      id: gameDef.id,
      roomCode,
      teacherId: auth.teacher!.id,
      title: gameDef.title,
      settings: gameDef.settings,
      questions: questionSet.questions,
      questionSetTitle: questionSet.title,
      teams: {
        A: { id: 'A', ...gameDef.teams.A, score: 0 },
        B: { id: 'B', ...gameDef.teams.B, score: 0 },
      },
      participants: [],
      phase: PHASES.LOBBY,
      phaseBeforePause: null,
      roomLocked: false,
      currentQuestionIndex: -1,
      round: null,
      rounds: [],
      scoreHistory: [],
      eventLog: [],
      readingEndsAt: null,
      discussionEndsAt: null,
      startedAt: null,
      endedAt: null,
      teacherConnected: false,
      teacherLastSeenAt: null,
    });

    return Response.json({ game: gameDef });
  } catch (e) {
    console.error(e);
    return jsonError('Failed to create game.', 500);
  }
}
