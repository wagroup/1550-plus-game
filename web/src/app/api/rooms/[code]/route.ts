import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { LiveRoom } from '@/lib/models';
import { jsonError } from '@/lib/auth';
import { PHASES } from '@/lib/types';
import { prunePresence, roomToPlain, tickTimers } from '@/lib/game';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  await connectDB();
  const doc = await LiveRoom.findOne({ roomCode: code.toUpperCase().trim() }).lean();
  if (!doc) return jsonError('Invalid room code. Please check with your teacher.', 404);

  const room = roomToPlain(doc as unknown as Record<string, unknown>);
  tickTimers(room);
  prunePresence(room);

  if (room.phase === PHASES.ENDED) {
    return jsonError('This game has already ended.', 410);
  }
  if (room.roomLocked) return jsonError('This room is locked by the teacher.', 423);
  if (room.phase !== PHASES.LOBBY && !room.settings.allowLateJoin) {
    return jsonError('The game has already started.', 409);
  }

  return Response.json({
    roomCode: room.roomCode,
    title: room.title,
    allowTeamSelect: room.settings.allowTeamSelect,
    teams: {
      A: { name: room.teams.A.name, color: room.teams.A.color, icon: room.teams.A.icon },
      B: { name: room.teams.B.name, color: room.teams.B.color, icon: room.teams.B.icon },
    },
  });
}
