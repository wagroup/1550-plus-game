import { NextRequest } from 'next/server';
import { getBearerToken, getTeacherByToken, jsonError } from '@/lib/auth';
import { getRoomState } from '@/lib/rooms';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const role = (req.nextUrl.searchParams.get('role') || 'public') as 'teacher' | 'public';
  const sessionToken = req.nextUrl.searchParams.get('sessionToken') || undefined;

  if (role === 'teacher') {
    const token = getBearerToken(req);
    const teacher = await getTeacherByToken(token);
    if (!teacher) return jsonError('Not signed in', 401);
    const state = await getRoomState(code, 'teacher', { teacherHeartbeat: true });
    if (!state) return jsonError('Room not found.', 404);
    if (state.id) {
      // verify ownership via room load already done; double-check teacher id
      const { connectDB } = await import('@/lib/db');
      const { LiveRoom } = await import('@/lib/models');
      await connectDB();
      const room = await LiveRoom.findOne({ roomCode: code.toUpperCase() }).select('teacherId').lean();
      if (!room || room.teacherId !== teacher.id) return jsonError('Not authorized.', 403);
    }
    return Response.json({ state });
  }

  const state = await getRoomState(code, 'public', { sessionToken });
  if (!state) return jsonError('Room not found.', 404);
  return Response.json({ state });
}
