'use client';

// Tiny WebAudio sound effects — no audio files needed.
let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationMs: number, delayMs = 0, type: OscillatorType = 'sine', volume = 0.15) {
  const audio = audioCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(audio.destination);
  const start = audio.currentTime + delayMs / 1000;
  osc.start(start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  osc.stop(start + durationMs / 1000 + 0.05);
}

export const sounds = {
  buzzerOpen() {
    tone(660, 150, 0, 'square', 0.12);
    tone(880, 200, 130, 'square', 0.12);
  },
  buzzed() {
    tone(440, 350, 0, 'sawtooth', 0.18);
  },
  correct() {
    tone(523, 140, 0);
    tone(659, 140, 130);
    tone(784, 260, 260);
  },
  incorrect() {
    tone(330, 220, 0, 'sawtooth', 0.14);
    tone(220, 320, 180, 'sawtooth', 0.14);
  },
  join() {
    tone(587, 120, 0);
    tone(880, 140, 110);
  },
  gameEnd() {
    tone(523, 160, 0);
    tone(659, 160, 150);
    tone(784, 160, 300);
    tone(1047, 420, 450);
  },
};

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
