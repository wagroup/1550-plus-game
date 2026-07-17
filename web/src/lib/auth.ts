import { NextRequest } from 'next/server';
import { connectDB } from './db';
import { Session, Teacher } from './models';
import { generateToken } from './crypto';

export async function createSession(teacherId: string) {
  await connectDB();
  const token = generateToken(32);
  await Session.create({ token, teacherId, createdAt: Date.now() });
  return token;
}

export async function destroySession(token: string) {
  await connectDB();
  await Session.deleteOne({ token });
}

export async function getTeacherByToken(token: string | null) {
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ token }).lean();
  if (!session) return null;
  const teacher = await Teacher.findOne({ id: session.teacherId }).lean();
  if (!teacher) return null;
  return { id: teacher.id, name: teacher.name, email: teacher.email, passwordHash: teacher.passwordHash };
}

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function requireAuth(req: NextRequest): Promise<
  | { teacher: { id: string; name: string; email: string }; token: string; error?: undefined }
  | { error: Response; teacher?: undefined; token?: undefined }
> {
  const token = getBearerToken(req);
  const teacher = await getTeacherByToken(token);
  if (!teacher || !token) {
    return { error: Response.json({ error: 'Not signed in' }, { status: 401 }) };
  }
  return { teacher: { id: teacher.id, name: teacher.name, email: teacher.email }, token };
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
