import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  return Response.json({ teacher: auth.teacher });
}
