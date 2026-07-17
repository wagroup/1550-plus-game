import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

export function Logo({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const textSize = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl';
  return (
    <Link to="/" className={`font-extrabold tracking-tight ${textSize} ${light ? 'text-white' : 'text-navy'}`}>
      Class<span className="text-primary">Buzz</span>
      <span className="ml-1 align-middle" role="img" aria-label="buzzer">🔔</span>
    </Link>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
}) {
  const styles: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-white text-navy border border-slate-300 hover:bg-slate-50',
    danger: 'bg-incorrect text-white hover:bg-red-700',
    success: 'bg-correct text-white hover:bg-green-700',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white';

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 text-incorrect px-4 py-3 text-sm font-medium animate-pop" role="alert">
      {message}
    </div>
  );
}

/** Countdown that syncs to a server-provided end timestamp. */
export function useCountdown(endsAt: number | null, serverNow?: number) {
  const offset = useMemo(
    () => (serverNow ? serverNow - Date.now() : 0),
    // Recompute offset whenever a new server timestamp arrives
    [serverNow]
  );
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

  return remaining; // ms remaining, or null
}

export function CountdownRing({ remainingMs, totalSeconds, color = '#2563EB' }: { remainingMs: number; totalSeconds: number; color?: string }) {
  const seconds = Math.ceil(remainingMs / 1000);
  const fraction = Math.min(1, remainingMs / (totalSeconds * 1000));
  const r = 44;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="110" height="110" className="-rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 200ms linear' }}
        />
      </svg>
      <span className="absolute text-3xl font-extrabold tabular-nums" style={{ color }}>{seconds}</span>
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

export function ConnectionDot({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <span
        className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-correct' : 'bg-incorrect'}`}
        aria-hidden
      />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4" role="dialog" aria-modal>
      <Card className="max-w-sm w-full p-6 animate-pop">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-slate-600 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </Card>
    </div>
  );
}
