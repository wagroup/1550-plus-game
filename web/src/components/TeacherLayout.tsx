'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, type IconName } from './icons';
import { Logo, Button } from './ui';
import { api, clearSession, getStoredTeacher } from '@/lib/client-api';

const navItems: { to: string; label: string; icon: IconName }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/question-sets', label: 'Question Sets', icon: 'note' },
  { to: '/create-game', label: 'New Game', icon: 'game' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
];

export default function TeacherLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const teacher = getStoredTeacher();

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* session may be gone */
    }
    clearSession();
    router.push('/');
  }

  return (
    <div className="min-h-full flex bg-secondary">
      <aside className="glass-panel hidden w-64 shrink-0 flex-col border-r border-white/8 p-5 md:flex">
        <div className="mb-8">
          <Logo light />
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 font-ui text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-white/65 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 pt-4">
          <p className="mb-3 truncate font-ui text-sm text-white/55">{teacher?.name}</p>
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass-navbar flex items-center justify-between px-4 py-3 md:hidden">
          <Logo light size="sm" />
          <div className="flex gap-3">
            {navItems.map((item) => (
              <Link key={item.to} href={item.to} className="text-white/80 hover:text-white" title={item.label}>
                <Icon name={item.icon} size={22} />
              </Link>
            ))}
          </div>
        </header>
        <main className="section-light min-h-full p-6 md:p-10">
          <div className="mx-auto max-w-6xl">
            <h1 className="font-display mb-8 text-[clamp(1.75rem,4vw,2.5rem)] text-text-body-dark">{title}</h1>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
