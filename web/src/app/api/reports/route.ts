import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Report } from '@/lib/models';
import { jsonError, requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  await connectDB();
  const reports = await Report.find({ teacherId: auth.teacher!.id })
    .sort({ endedAt: -1 })
    .lean();
  return Response.json(reports);
}
