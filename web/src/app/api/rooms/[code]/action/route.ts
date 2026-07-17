import { NextRequest } from 'next/server';
import { jsonError, requireAuth } from '@/lib/auth';
import { runTeacherAction } from '@/lib/rooms';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const type = body.type as string;
  if (!type) return jsonError('Action type is required.', 400);

  const result = await runTeacherAction(code, auth.teacher!.id, type, body.payload);
  if ('error' in result && result.error) {
    return jsonError(result.error, result.status || 400);
  }
  return Response.json(result);
}
