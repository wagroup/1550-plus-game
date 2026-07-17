import { useEffect, useState } from 'react';
import TeacherLayout from '../components/TeacherLayout';
import { Button, Card, Field, inputClass, ErrorBanner, ConfirmDialog } from '../components/ui';
import { api } from '../api';
import type { Question, QuestionSet } from '../types';

const emptyQuestion = (): Question => ({
  id: Math.random().toString(36).slice(2),
  text: '',
  type: 'open',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: '',
  points: null,
  image: null,
});

export default function QuestionSets() {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [editing, setEditing] = useState<QuestionSet | null>(null);
  const [deleting, setDeleting] = useState<QuestionSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => api<QuestionSet[]>('/api/question-sets').then(setSets).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);

  async function remove(set: QuestionSet) {
    await api(`/api/question-sets/${set.id}`, { method: 'DELETE' });
    setDeleting(null);
    refresh();
  }

  if (editing) {
    return (
      <SetEditor
        initial={editing}
        onDone={() => { setEditing(null); refresh(); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <TeacherLayout title="Question Sets">
      <ErrorBanner message={error} />
      <div className="mb-6">
        <Button
          className="text-lg px-6 py-3"
          onClick={() =>
            setEditing({
              id: '',
              teacherId: '',
              title: '',
              subject: '',
              description: '',
              questions: [emptyQuestion()],
              createdAt: 0,
              updatedAt: 0,
            })
          }
        >
          ➕ New Question Set
        </Button>
      </div>

      {sets.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">
          <p className="text-4xl mb-3">📝</p>
          <p className="font-semibold">No question sets yet</p>
          <p className="text-sm">Create one to use in your games.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sets.map((set) => (
            <Card key={set.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg">{set.title}</h3>
                  <p className="text-sm text-slate-500">
                    {set.subject ? `${set.subject} · ` : ''}{set.questions.length} question{set.questions.length !== 1 ? 's' : ''}
                  </p>
                  {set.description && <p className="text-sm text-slate-600 mt-2">{set.description}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" onClick={() => setEditing(set)}>Edit</Button>
                <Button variant="ghost" onClick={() => setDeleting(set)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete question set?"
        message={`"${deleting?.title}" and all its questions will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </TeacherLayout>
  );
}

function SetEditor({
  initial,
  onDone,
  onCancel,
}: {
  initial: QuestionSet;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isNew = !initial.id;
  const [title, setTitle] = useState(initial.title);
  const [subject, setSubject] = useState(initial.subject);
  const [description, setDescription] = useState(initial.description);
  const [questions, setQuestions] = useState<Question[]>(
    initial.questions.length ? initial.questions.map((q) => ({ ...q, options: q.options.length ? q.options : ['', '', '', ''] })) : [emptyQuestion()]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (index: number, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const move = (index: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      const j = index + dir;
      if (j < 0 || j >= next.length) return qs;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  async function save() {
    setError(null);
    if (!title.trim()) return setError('Please give the set a title.');
    const valid = questions.filter((q) => q.text.trim());
    if (!valid.length) return setError('Add at least one question with text.');
    const cleaned = valid.map((q) => ({
      ...q,
      options: q.type === 'multiple_choice' ? q.options.filter((o) => o.trim()) : q.type === 'true_false' ? ['True', 'False'] : [],
    }));
    setSaving(true);
    try {
      if (isNew) {
        await api('/api/question-sets', { method: 'POST', body: { title, subject, description, questions: cleaned } });
      } else {
        await api(`/api/question-sets/${initial.id}`, { method: 'PUT', body: { title, subject, description, questions: cleaned } });
      }
      onDone();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <TeacherLayout title={isNew ? 'New Question Set' : 'Edit Question Set'}>
      <div className="space-y-4 mb-6">
        <ErrorBanner message={error} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Title">
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Science Quiz — Chapter 4" />
          </Field>
          <Field label="Subject (optional)">
            <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Science" />
          </Field>
        </div>
        <Field label="Description (optional)">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Solar system basics" />
        </Field>
      </div>

      <div className="space-y-5">
        {questions.map((q, i) => (
          <Card key={q.id} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-500">Question {i + 1}</span>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</Button>
                <Button variant="ghost" onClick={() => move(i, 1)} disabled={i === questions.length - 1} title="Move down">↓</Button>
                <Button variant="ghost" onClick={() => setQuestions((qs) => [...qs.slice(0, i + 1), { ...q, id: Math.random().toString(36).slice(2) }, ...qs.slice(i + 1)])} title="Duplicate">⧉</Button>
                <Button variant="ghost" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} disabled={questions.length === 1} title="Delete">🗑</Button>
              </div>
            </div>
            <div className="space-y-4">
              <Field label="Question text">
                <textarea className={`${inputClass} min-h-20`} value={q.text}
                  onChange={(e) => update(i, { text: e.target.value })} placeholder="What is the closest star to Earth?" />
              </Field>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Type">
                  <select className={inputClass} value={q.type}
                    onChange={(e) => update(i, { type: e.target.value as Question['type'] })}>
                    <option value="open">Open-ended</option>
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="true_false">True / False</option>
                  </select>
                </Field>
                <Field label="Points (blank = game default)">
                  <input className={inputClass} type="number" min={1} value={q.points ?? ''}
                    onChange={(e) => update(i, { points: e.target.value ? +e.target.value : null })} placeholder="1" />
                </Field>
                <Field label="Correct answer">
                  {q.type === 'true_false' ? (
                    <select className={inputClass} value={q.correctAnswer}
                      onChange={(e) => update(i, { correctAnswer: e.target.value })}>
                      <option value="">Select…</option>
                      <option value="True">True</option>
                      <option value="False">False</option>
                    </select>
                  ) : (
                    <input className={inputClass} value={q.correctAnswer}
                      onChange={(e) => update(i, { correctAnswer: e.target.value })} placeholder="The Sun" />
                  )}
                </Field>
              </div>
              {q.type === 'multiple_choice' && (
                <Field label="Answer options">
                  <div className="grid md:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <input key={oi} className={inputClass} value={opt}
                        onChange={(e) => update(i, { options: q.options.map((o, oj) => (oj === oi ? e.target.value : o)) })}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                    ))}
                  </div>
                </Field>
              )}
              <Field label="Explanation (optional — shown after the answer is revealed)">
                <input className={inputClass} value={q.explanation}
                  onChange={(e) => update(i, { explanation: e.target.value })} placeholder="The Sun is a star about 150 million km away." />
              </Field>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-6 sticky bottom-4">
        <Button variant="secondary" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>➕ Add Question</Button>
        <div className="flex-1" />
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="px-8">{saving ? 'Saving…' : 'Save Question Set'}</Button>
      </div>
    </TeacherLayout>
  );
}
