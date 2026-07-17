import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Report } from '@/lib/models';
import { jsonError, requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  await connectDB();
  const report = await Report.findOne({ id, teacherId: auth.teacher!.id }).lean();
  if (!report) return jsonError('Report not found.', 404);
  return Response.json(report);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  await connectDB();
  const result = await Report.deleteOne({ id, teacherId: auth.teacher!.id });
  if (result.deletedCount === 0) return jsonError('Report not found.', 404);
  return Response.json({ ok: true });
}
