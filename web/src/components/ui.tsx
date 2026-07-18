'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from './icons';

function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="27" height="27" viewBox="0 0 27 27" fill="none" aria-hidden>
      <path
        d="M6 13.5H19M19 13.5L13.5 8M19 13.5L13.5 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 'md', light = true }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const textSize = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl';
  return (
    <Link
      href="/"
      className={`font-display tracking-wide ${textSize} ${light ? 'text-white' : 'text-text-body-dark'}`}
    >
      Class<span className="text-primary">Buzz</span>
      <Icon name="notification" size={size === 'lg' ? 36 : size === 'sm' ? 20 : 28} className="ml-1 inline-block align-middle text-primary" />
    </Link>
  );
}

export function Button({
  children,
  variant = 'primary',
  showArrow = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'login' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  showArrow?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

  if (variant === 'primary') {
    const withArrow = showArrow !== false;
    return (
      <button className={`btn-primary ${className}`} {...props}>
        <span className="relative z-10 flex items-center gap-3">
          {children}
          {withArrow && <ArrowIcon />}
        </span>
      </button>
    );
  }

  if (variant === 'login') {
    return (
      <button className={`btn-login ${className}`} {...props}>
        {children}
      </button>
    );
  }

  const styles: Record<string, string> = {
    secondary:
      'rounded-full border border-white/15 bg-white/5 px-5 py-2.5 font-ui text-sm font-medium text-white hover:bg-white/10',
    outline:
      'rounded-full border border-primary/30 bg-white px-5 py-2.5 font-ui text-sm font-medium text-text-body-dark hover:border-primary hover:bg-primary/5',
    danger: 'rounded-md bg-incorrect px-4 py-2.5 font-ui text-sm font-semibold text-white hover:brightness-110',
    success: 'rounded-md bg-correct px-4 py-2.5 font-ui text-sm font-semibold text-white hover:brightness-110',
    ghost: 'rounded-md bg-transparent px-4 py-2.5 font-ui text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white',
  };

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  variant = 'glass',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'dark' | 'light' | 'quote';
  style?: React.CSSProperties;
}) {
  const variants: Record<string, string> = {
    glass: 'glass-card rounded-2xl',
    dark: 'stat-card',
    light: 'feature-card rounded-2xl shadow-sm',
    quote: 'quote-block',
  };
  return (
    <div className={`${variants[variant]} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  light,
}: {
  label: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <label className="block">
      <span
        className={`mb-1.5 block text-sm font-medium ${light ? 'text-text-body-dark' : 'text-white/80'}`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass = 'input-ds';

export const inputClassLight = 'input-ds-light';

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="animate-pop rounded-xl border border-incorrect/40 bg-incorrect/15 px-4 py-3 text-sm font-medium text-red-200"
      role="alert"
    >
      {message}
    </div>
  );
}

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-glow min-h-full bg-secondary">
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
        <div className="mb-8">
          <Logo size="lg" />
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

export function PageNavbar({
  children,
  className = '',
  sticky = false,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <header className={`container-ds z-50 py-4 md:py-5 ${sticky ? 'sticky top-0' : ''} ${className}`}>
      <nav className="glass-navbar flex items-center justify-between gap-4 rounded-lg px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
        {children}
      </nav>
    </header>
  );
}

export function useCountdown(endsAt: number | null, serverNow?: number) {
  const offset = useMemo(() => (serverNow ? serverNow - Date.now() : 0), [serverNow]);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const left = Math.max(0, endsAt - (Date.now() + offset));
      setRemaining(left);
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [endsAt, offset]);

  return remaining;
}

export function CountdownRing({
  remainingMs,
  totalSeconds,
  color = '#2A4DFF',
}: {
  remainingMs: number;
  totalSeconds: number;
  color?: string;
}) {
  const seconds = Math.ceil(remainingMs / 1000);
  const fraction = Math.min(1, remainingMs / (totalSeconds * 1000));
  const r = 44;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="110" height="110" className="-rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 200ms linear' }}
        />
      </svg>
      <span className="absolute text-3xl font-display tabular-nums" style={{ color }}>
        {seconds}
      </span>
    </div>
  );
}

export function Confetti({ colors }: { colors: string[] }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.5 + Math.random() * 2,
        color: colors[i % colors.length],
      })),
    [colors]
  );
  return (
    <>
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}vw`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </>
  );
}

export function ConnectionDot({ connected, label, light }: { connected: boolean; label?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${light ? 'text-text-secondary' : 'text-white/55'}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-correct' : 'bg-incorrect'}`} aria-hidden />
      {label ?? (connected ? 'Connected' : 'Disconnected')}
    </span>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/80 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <Card className="w-full max-w-sm animate-pop p-6">
        <h3 className="font-display mb-2 text-2xl text-white">{title}</h3>
        <p className="mb-5 font-body text-sm text-white/70">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
