import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo, Button } from './ui';
import { api, clearSession, getStoredTeacher } from '../api';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/question-sets', label: 'Question Sets', icon: '📝' },
  { to: '/create-game', label: 'New Game', icon: '🎮' },
  { to: '/reports', label: 'Reports', icon: '📊' },
];

export default function TeacherLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  const teacher = getStoredTeacher();

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* session may be gone */ }
    clearSession();
    navigate('/');
  }

  return (
    <div className="min-h-full flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-navy text-white p-5">
        <div className="mb-8"><Logo light /></div>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 font-semibold transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/10'
                }`
              }
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="pt-4 border-t border-white/10">
          <p className="text-sm text-slate-300 truncate mb-3">{teacher?.name}</p>
          <Button variant="ghost" className="w-full !text-slate-300 hover:!bg-white/10" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between bg-navy text-white px-4 py-3">
          <Logo light size="sm" />
          <div className="flex gap-2">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className="text-xl" title={item.label}>{item.icon}</Link>
            ))}
          </div>
        </header>
        <main className="p-6 md:p-10 max-w-6xl">
          <h1 className="text-3xl font-extrabold mb-6">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
