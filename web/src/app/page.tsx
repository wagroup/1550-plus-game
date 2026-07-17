'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo, Button, Card, inputClass } from '@/components/ui';
import { getToken } from '@/lib/client-api';

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const signedIn = !!getToken();

  return (
    <div className="min-h-full bg-gradient-to-b from-white via-surface to-blue-50">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          {signedIn ? (
            <Button onClick={() => router.push('/dashboard')}>Dashboard</Button>
          ) : (
            <>
              <Link href="/login" className="font-semibold text-slate-600 hover:text-navy px-3 py-2">Teacher Login</Link>
              <Button onClick={() => router.push('/register')}>Create a Game</Button>
            </>
          )}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        <section className="grid md:grid-cols-2 gap-10 items-center py-14">
          <div>
            <p className="inline-block bg-blue-100 text-primary font-bold text-sm rounded-full px-4 py-1.5 mb-5">
              Team A vs Team B — the whole class plays
            </p>
            <h1 className="text-5xl font-extrabold leading-tight mb-5">
              Turn your classroom into a <span className="text-primary">game show</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              ClassBuzz is a real-time team quiz and buzzer game. A question appears on the
              projector, the buzzer opens, and the first team to buzz gets the chance to answer.
              Points belong to teams — never to individuals.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button className="text-lg px-6 py-3" onClick={() => router.push(signedIn ? '/create-game' : '/register')}>
                🎮 Create a Game
              </Button>
              <Button variant="secondary" className="text-lg px-6 py-3" onClick={() => router.push('/login')}>
                Teacher Login
              </Button>
            </div>
          </div>

          <Card className="p-8">
            <h2 className="text-xl font-bold mb-1">Student? Join a game</h2>
            <p className="text-slate-500 mb-5">Enter the room code your teacher shows on the screen.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) router.push(`/join/${code.trim().toUpperCase()}`);
              }}
              className="flex gap-3"
            >
              <input
                className={`${inputClass} text-center text-2xl font-extrabold tracking-[0.3em] uppercase`}
                placeholder="AB29KQ"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                aria-label="Room code"
              />
              <Button type="submit" className="shrink-0 text-lg">Join</Button>
            </form>
            <div className="mt-8 rounded-xl bg-navy text-white p-5">
              <p className="text-sm text-slate-300 mb-3 font-semibold uppercase tracking-wide">Live preview</p>
              <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1 rounded-lg bg-teamA/90 py-3">
                  <div className="text-2xl">🐯</div>
                  <div className="font-bold">The Tigers</div>
                  <div className="text-3xl font-extrabold">7</div>
                </div>
                <div className="text-xl font-black text-slate-400">VS</div>
                <div className="text-center flex-1 rounded-lg bg-teamB/90 py-3">
                  <div className="text-2xl">🦅</div>
                  <div className="font-bold">The Eagles</div>
                  <div className="text-3xl font-extrabold">6</div>
                </div>
              </div>
              <div className="mt-3 text-center bg-white/10 rounded-lg py-2 font-bold text-warning animate-pulse">
                🔔 BUZZ NOW!
              </div>
            </div>
          </Card>
        </section>

        <section className="py-12">
          <h2 className="text-3xl font-extrabold text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: '📝', title: '1. Create', text: 'Build a question set and create a game room in minutes.' },
              { icon: '📱', title: '2. Join', text: 'Students join with a room code or QR code and pick a team.' },
              { icon: '🔔', title: '3. Buzz', text: 'The first valid buzz wins the answer chance for the whole team.' },
              { icon: '🏆', title: '4. Win', text: 'Correct answers earn team points. Highest team score wins.' },
            ].map((step) => (
              <Card key={step.title} className="p-6 text-center">
                <div className="text-4xl mb-3">{step.icon}</div>
                <h3 className="font-bold text-lg mb-1.5">{step.title}</h3>
                <p className="text-slate-600 text-sm">{step.text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-12">
          <h2 className="text-3xl font-extrabold text-center mb-10">Built for teamwork</h2>
          <div className="grid md:grid-cols-3 gap-6 pb-16">
            {[
              { icon: '🤝', title: 'No individual scores', text: 'Every point belongs to the team. Students collaborate instead of competing with teammates.' },
              { icon: '⚡', title: 'Fair, server-decided buzzer', text: 'The server accepts the first valid press. No arguments about who buzzed first.' },
              { icon: '🖥️', title: 'Projector ready', text: 'A dedicated full-screen view with big text, team scores and buzzer status for the whole class.' },
            ].map((benefit) => (
              <Card key={benefit.title} className="p-6">
                <div className="text-3xl mb-3">{benefit.icon}</div>
                <h3 className="font-bold text-lg mb-1.5">{benefit.title}</h3>
                <p className="text-slate-600 text-sm">{benefit.text}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        ClassBuzz — real-time classroom team quiz &amp; buzzer
      </footer>
    </div>
  );
}
