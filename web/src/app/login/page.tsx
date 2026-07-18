'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setSession } from '@/lib/client-api';
import { Button, Card, Field, inputClass, ErrorBanner, AuthShell } from '@/components/ui';
import type { Teacher } from '@/lib/types';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api<{ token: string; teacher: Teacher }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
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
    <AuthShell
      footer={
        <Link href="/join" className="mt-6 font-ui text-sm font-medium text-white/55 hover:text-white">
          I&apos;m a student — join a game instead
        </Link>
      }
    >
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display mb-1 text-3xl text-white">Teacher sign in</h1>
        <p className="mb-6 font-body text-sm text-white/60">Host games and manage your question sets.</p>
        <form onSubmit={submit} className="space-y-4">
          <ErrorBanner message={error} />
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
          <Field label="Password">
            <div className="relative">
              <input
                className={inputClass}
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer font-ui text-sm font-medium text-white/55"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <Button type="submit" variant="login" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
        <p className="mt-6 text-center font-body text-sm text-white/65">
          New to ClassBuzz?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}
