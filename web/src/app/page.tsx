'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon, TeamIcon } from '@/components/icons';
import type { IconName } from '@/components/icons';
import { Logo, Button, Card, inputClass, PageNavbar } from '@/components/ui';
import { getToken } from '@/lib/client-api';

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const signedIn = !!getToken();

  return (
    <div className="min-h-full bg-secondary">
      <div className="bg-glow">
        <PageNavbar sticky>
          <Logo />
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="font-ui text-base font-medium text-white/85 hover:text-white">
              How it works
            </Link>
            <Link href="#features" className="font-ui text-base font-medium text-white/85 hover:text-white">
              Features
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Button variant="login" onClick={() => router.push('/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Link href="/login" className="hidden px-3 py-2 font-ui text-base font-medium text-white/80 hover:text-white sm:inline">
                  Login
                </Link>
                <Button variant="login" onClick={() => router.push('/register')}>
                  Sign up
                </Button>
              </>
            )}
          </div>
        </PageNavbar>

        <main className="container-ds pb-20 pt-8 md:pt-16">
          <section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow mb-5 text-primary">Team A vs Team B — the whole class plays</p>
              <h1 className="font-display mb-6 text-[clamp(2.75rem,8vw,5rem)] leading-[0.95] tracking-wide text-white">
                Turn your classroom into a <span className="text-primary">game show</span>
              </h1>
              <p className="font-body mb-10 max-w-xl text-lg leading-relaxed text-white/75 md:text-xl">
                ClassBuzz is a real-time team quiz and buzzer game. A question appears on the projector,
                the buzzer opens, and the first team to buzz gets the chance to answer. Points belong to
                teams — never to individuals.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => router.push(signedIn ? '/create-game' : '/register')}>
                  Create a game room
                </Button>
                <Button variant="secondary" onClick={() => router.push('/login')}>
                  Teacher login
                </Button>
              </div>
            </div>

            <Card className="p-8">
              <h2 className="font-display mb-1 text-2xl text-white">Student? Join a game</h2>
              <p className="mb-5 font-body text-sm text-white/65">Enter the room code your teacher shows on the screen.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim()) router.push(`/join/${code.trim().toUpperCase()}`);
                }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  className={`${inputClass} text-center font-display text-2xl tracking-[0.3em] uppercase`}
                  placeholder="AB29KQ"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  aria-label="Room code"
                />
                <Button type="submit" variant="login" className="shrink-0 px-8">
                  Join
                </Button>
              </form>

              <div className="glass-panel mt-8 rounded-xl p-5">
                <p className="eyebrow mb-3 text-white/55">Live preview</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 rounded-xl bg-teamA/90 py-3 text-center">
                    <div className="mb-1 flex justify-center">
                      <TeamIcon icon="target" size={28} color="#fff" />
                    </div>
                    <div className="font-ui text-sm font-semibold">The Tigers</div>
                    <div className="font-display text-3xl">7</div>
                  </div>
                  <div className="font-display text-xl text-white/45">VS</div>
                  <div className="flex-1 rounded-xl bg-teamB/90 py-3 text-center">
                    <div className="mb-1 flex justify-center">
                      <TeamIcon icon="rocket" size={28} color="#fff" />
                    </div>
                    <div className="font-ui text-sm font-semibold">The Eagles</div>
                    <div className="font-display text-3xl">6</div>
                  </div>
                </div>
                <div className="mt-3 flex animate-pulse items-center justify-center gap-2 rounded-lg bg-white/10 py-2 text-center font-ui text-sm font-bold text-warning">
                  <Icon name="notification" size={18} />
                  BUZZ NOW!
                </div>
              </div>
            </Card>
          </section>

          <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: '2', label: 'Teams per game' },
              { value: '1st', label: 'Buzz wins the round' },
              { value: '0', label: 'Individual scores' },
              { value: '100%', label: 'Team collaboration' },
            ].map((stat) => (
              <Card key={stat.label} variant="dark" className="text-center">
                <p className="stat-card-value">{stat.value}</p>
                <p className="mt-2 font-body text-sm text-white/60">{stat.label}</p>
              </Card>
            ))}
          </section>
        </main>
      </div>

      <section id="how-it-works" className="section-light py-20">
        <div className="container-ds">
          <p className="eyebrow mb-3 text-primary">How it works</p>
          <h2 className="font-display mb-12 text-center text-[clamp(2rem,5vw,3rem)] text-text-body-dark md:text-left">
            Four steps to a buzzing classroom
          </h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {(
              [
                { step: '01', icon: 'note' as IconName, title: 'Create', text: 'Build a question set and create a game room in minutes.' },
                { step: '02', icon: 'phone' as IconName, title: 'Join', text: 'Students join with a room code or QR code and pick a team.' },
                { step: '03', icon: 'notification' as IconName, title: 'Buzz', text: 'The first valid buzz wins the answer chance for the whole team.' },
                { step: '04', icon: 'award' as IconName, title: 'Win', text: 'Correct answers earn team points. Highest team score wins.' },
              ] as const
            ).map((item) => (
              <Card key={item.title} variant="light" className="relative overflow-hidden">
                <span className="font-display absolute right-4 top-3 text-5xl text-primary/10">{item.step}</span>
                <div className="relative mb-4 text-primary">
                  <Icon name={item.icon} size={40} />
                </div>
                <h3 className="font-display relative mb-2 text-2xl text-primary">{item.title}</h3>
                <p className="font-body relative text-sm leading-relaxed text-text-secondary">{item.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-glow py-20">
        <div className="container-ds">
          <p className="eyebrow mb-3">Built for teamwork</p>
          <h2 className="font-display mb-12 text-[clamp(2rem,5vw,3rem)] text-white">Everything your class needs</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {(
              [
                { icon: 'handshake' as IconName, title: 'No individual scores', text: 'Every point belongs to the team. Students collaborate instead of competing with teammates.' },
                { icon: 'flash' as IconName, title: 'Fair, server-decided buzzer', text: 'The server accepts the first valid press. No arguments about who buzzed first.' },
                { icon: 'monitor' as IconName, title: 'Projector ready', text: 'A dedicated full-screen view with big text, team scores and buzzer status for the whole class.' },
              ] as const
            ).map((benefit) => (
              <Card key={benefit.title} className="p-6">
                <div className="mb-4 text-white">
                  <Icon name={benefit.icon} size={36} />
                </div>
                <h3 className="font-display mb-2 text-2xl text-white">{benefit.title}</h3>
                <p className="font-body text-sm leading-relaxed text-white/65">{benefit.text}</p>
              </Card>
            ))}
          </div>

          <Card variant="quote" className="mx-auto mt-16 max-w-3xl text-center">
            <p className="font-display text-[clamp(1.25rem,3vw,2rem)] leading-tight tracking-wide text-white">
              &ldquo;The whole class is engaged — teams strategize, buzz, and celebrate together.&rdquo;
            </p>
            <p className="eyebrow mt-4 text-white/55">Built for teachers who want energy, not chaos</p>
          </Card>
        </div>
      </section>

      <footer className="border-t border-white/8 py-10">
        <div className="container-ds flex flex-col items-center justify-between gap-6 md:flex-row">
          <Logo size="sm" />
          <p className="font-ui text-sm text-white/45">ClassBuzz — real-time classroom team quiz &amp; buzzer</p>
          <div className="flex gap-6">
            <Link href="/login" className="font-ui text-sm text-white/60 hover:text-white">
              Teacher login
            </Link>
            <Link href="/join" className="font-ui text-sm text-white/60 hover:text-white">
              Join a game
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
