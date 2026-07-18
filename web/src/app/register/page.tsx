'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setSession } from '@/lib/client-api';
import { Button, Card, Field, inputClass, ErrorBanner, AuthShell } from '@/components/ui';
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
    <AuthShell>
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display mb-1 text-3xl text-white">Create your teacher account</h1>
        <p className="mb-6 font-body text-sm text-white/60">Free for your classroom.</p>
        <form onSubmit={submit} className="space-y-4">
          <ErrorBanner message={error} />
          <Field label="Your name">
            <input
              className={inputClass}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ms. Rivera"
              autoComplete="name"
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              autoComplete="email"
            />
          </Field>
          <Field label="Password (at least 6 characters)">
            <input
              className={inputClass}
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          <Button type="submit" variant="login" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-6 text-center font-body text-sm text-white/65">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}
