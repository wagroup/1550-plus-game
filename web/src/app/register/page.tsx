'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setSession } from '@/lib/client-api';
import { Logo, Button, Card, Field, inputClass, ErrorBanner } from '@/components/ui';
import type { Teacher } from '@/lib/types';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api<{ token: string; teacher: Teacher }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      setSession(data.token, data.teacher);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-white to-blue-50">
      <div className="mb-8"><Logo size="lg" /></div>
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold mb-1">Create your teacher account</h1>
        <p className="text-slate-500 mb-6">Free for your classroom.</p>
        <form onSubmit={submit} className="space-y-4">
          <ErrorBanner message={error} />
          <Field label="Your name">
            <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ms. Rivera" autoComplete="name" />
          </Field>
          <Field label="Email">
            <input className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu" autoComplete="email" />
          </Field>
          <Field label="Password (at least 6 characters)">
            <input className={inputClass} type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Button type="submit" className="w-full text-lg" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-6 text-center text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
