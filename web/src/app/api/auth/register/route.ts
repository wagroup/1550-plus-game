import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Teacher } from '@/lib/models';
import { createSession, jsonError } from '@/lib/auth';
import { hashPassword, uid } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return jsonError('Name, email and a password of at least 6 characters are required.', 400);
    }
    await connectDB();
    const normalized = email.trim().toLowerCase();
    if (await Teacher.findOne({ email: normalized })) {
      return jsonError('An account with this email already exists.', 409);
    }
    const teacher = {
      id: uid(),
      name: name.trim(),
      email: normalized,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    };
    await Teacher.create(teacher);
    const token = await createSession(teacher.id);
    return Response.json({
      token,
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email },
    });
  } catch (e) {
    console.error(e);
    return jsonError('Registration failed.', 500);
  }
}
