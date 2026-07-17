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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  await connectDB();
  const set = await QuestionSet.findOne({ id, teacherId: auth.teacher!.id });
  if (!set) return jsonError('Question set not found.', 404);
  const { title, subject, description, questions } = await req.json();
  if (title !== undefined) set.title = title.trim() || set.title;
  if (subject !== undefined) set.subject = subject.trim();
  if (description !== undefined) set.description = description.trim();
  if (questions !== undefined) set.questions = sanitizeQuestions(questions);
  set.updatedAt = Date.now();
  await set.save();
  return Response.json(set.toObject());
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(_req);
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  await connectDB();
  const result = await QuestionSet.deleteOne({ id, teacherId: auth.teacher!.id });
  if (result.deletedCount === 0) return jsonError('Question set not found.', 404);
  return Response.json({ ok: true });
}
