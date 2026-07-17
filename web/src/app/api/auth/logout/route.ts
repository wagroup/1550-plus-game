import { NextRequest } from 'next/server';
import { destroySession, requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  await destroySession(auth.token!);
  return Response.json({ ok: true });
}
