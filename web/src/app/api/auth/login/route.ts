import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Teacher } from '@/lib/models';
import { createSession, jsonError } from '@/lib/auth';
import { verifyPassword } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    await connectDB();
    const teacher = await Teacher.findOne({ email: (email || '').trim().toLowerCase() }).lean();
    if (!teacher || !verifyPassword(password || '', teacher.passwordHash)) {
      return jsonError('Invalid email or password.', 401);
    }
    const token = await createSession(teacher.id);
    return Response.json({
      token,
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email },
    });
  } catch (e) {
    console.error(e);
    return jsonError('Login failed.', 500);
  }
}
