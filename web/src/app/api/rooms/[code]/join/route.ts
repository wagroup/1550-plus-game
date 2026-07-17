import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/auth';
import { runStudentJoin } from '@/lib/rooms';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await runStudentJoin(code, body);
  if ('error' in result && result.error) {
    return jsonError(result.error, result.status || 400);
  }
  return Response.json(result);
}
