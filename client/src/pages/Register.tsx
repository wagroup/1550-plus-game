import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';
import { Logo, Button, Card, Field, inputClass, ErrorBanner } from '../components/ui';

export default function Register() {
  const navigate = useNavigate();
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
      const data = await api<{ token: string; teacher: any }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      setSession(data.token, data.teacher);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
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
          <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
