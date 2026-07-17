import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';
import { Logo, Button, Card, Field, inputClass, ErrorBanner } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
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
      const data = await api<{ token: string; teacher: any }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
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
        <h1 className="text-2xl font-extrabold mb-1">Teacher sign in</h1>
        <p className="text-slate-500 mb-6">Host games and manage your question sets.</p>
        <form onSubmit={submit} className="space-y-4">
          <ErrorBanner message={error} />
          <Field label="Email">
            <input className={inputClass} type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" autoComplete="email" />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input className={inputClass} type={showPassword ? 'text' : 'password'} required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium cursor-pointer">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <Button type="submit" className="w-full text-lg" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
        <p className="mt-6 text-center text-slate-600">
          New to ClassBuzz?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">Create an account</Link>
        </p>
      </Card>
      <Link to="/join" className="mt-6 text-slate-500 hover:text-navy font-medium">
        I'm a student — join a game instead
      </Link>
    </div>
  );
}
