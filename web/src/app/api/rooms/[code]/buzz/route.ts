import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/auth';
import { runStudentBuzz } from '@/lib/rooms';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.sessionToken) return jsonError('Missing session token.', 400);
  const result = await runStudentBuzz(code, body.sessionToken);
  return Response.json(result);
}
