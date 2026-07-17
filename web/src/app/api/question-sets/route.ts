import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { QuestionSet } from '@/lib/models';
import { jsonError, requireAuth } from '@/lib/auth';
import { uid } from '@/lib/crypto';

function sanitizeQuestions(questions: unknown) {
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((q) => q && typeof q.text === 'string' && q.text.trim())
    .map((q: Record<string, unknown>, i: number) => ({
      id: (q.id as string) || uid(),
      text: String(q.text).trim().slice(0, 500),
      type: ['open', 'multiple_choice', 'true_false'].includes(q.type as string)
        ? q.type
        : 'open',
      options: Array.isArray(q.options)
        ? q.options.slice(0, 6).map((o) => String(o).slice(0, 200))
        : [],
      correctAnswer: String(q.correctAnswer || '').slice(0, 500),
      explanation: String(q.explanation || '').slice(0, 1000),
      points: Number.isFinite(+(q.points as number)) && +(q.points as number) > 0
        ? Math.round(+(q.points as number))
        : null,
      image:
        typeof q.image === 'string' && q.image.startsWith('data:image') ? q.image : null,
      displayOrder: i,
    }));
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  await connectDB();
  const sets = await QuestionSet.find({ teacherId: auth.teacher!.id }).lean();
  return Response.json(sets);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { title, subject, description, questions } = await req.json();
    if (!title?.trim()) return jsonError('A title is required.', 400);
    await connectDB();
    const set = {
      id: uid(),
      teacherId: auth.teacher!.id,
      title: title.trim(),
      subject: (subject || '').trim(),
      description: (description || '').trim(),
      questions: sanitizeQuestions(questions),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await QuestionSet.create(set);
    return Response.json(set);
  } catch (e) {
    console.error(e);
    return jsonError('Failed to create question set.', 500);
  }
}
